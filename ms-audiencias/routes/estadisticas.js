const express = require('express');
const ExcelJS = require('exceljs');
const { fn, col } = require('sequelize');
const { Audiencia, EstadoAudiencia } = require('../models');
const v = require('../lib/validaciones');
const { rangoPredefinido } = require('../lib/fechas');
const { ErrorHttp, manejarError } = require('../lib/errores');
const { construirFiltros } = require('../lib/filtros');
const { cargarEstados } = require('../lib/estados');
const { obtenerSalas } = require('../lib/servicios');
const { enriquecer } = require('../lib/presentacion');

const router = express.Router();

// Resuelve el período y el distrito a consultar.
// Query: ?desde&hasta  ó  ?rango=hoy|semana|mes|anio (por defecto: mes actual), ?id_distrito
// El operador siempre queda limitado a su distrito.
const resolverParametros = (req) => {
  const rol = req.headers['x-usuario-rol'];
  if (rol !== 'ADMINISTRADOR' && rol !== 'OPERADOR') {
    throw new ErrorHttp(401, 'NO_AUTENTICADO', 'Usuario no identificado');
  }

  let { desde, hasta } = req.query;
  if (!desde || !hasta) {
    const rango = rangoPredefinido(req.query.rango);
    desde = desde || rango.desde;
    hasta = hasta || rango.hasta;
  }
  if (!v.esFechaValida(desde) || !v.esFechaValida(hasta)) {
    throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'desde / hasta deben tener formato YYYY-MM-DD');
  }
  if (desde > hasta) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'desde no puede ser posterior a hasta');

  const id_distrito = rol === 'OPERADOR'
    ? parseInt(req.headers['x-usuario-distrito']) || null
    : (req.query.id_distrito ? parseInt(req.query.id_distrito) : null);

  if (rol === 'OPERADOR' && !id_distrito) {
    throw new ErrorHttp(403, 'DISTRITO_AJENO', 'El operador no tiene distrito asignado');
  }

  return { desde, hasta, id_distrito };
};

const contarPor = (campo, where) =>
  Audiencia.findAll({
    attributes: [campo, [fn('COUNT', col('id_audiencia')), 'cantidad']],
    where,
    group: [campo],
    order: [[campo, 'ASC']],
    raw:   true,
  });

const calcularEstadisticas = async ({ desde, hasta, id_distrito }) => {
  const where = await construirFiltros({ desde, hasta, id_distrito });
  const [{ porId }, salas, total, porEstado, porTipo, porSala, porDia] = await Promise.all([
    cargarEstados(),
    obtenerSalas(id_distrito),
    Audiencia.count({ where }),
    contarPor('id_estado', where),
    contarPor('tipo_audiencia', where),
    contarPor('id_sala', where),
    contarPor('fecha', where),
  ]);

  const nombreSala = new Map(salas.map(s => [s.id_sala, s.nombre]));

  return {
    desde,
    hasta,
    id_distrito,
    total,
    por_estado: porEstado.map(r => ({ estado: porId[r.id_estado], cantidad: Number(r.cantidad) })),
    por_tipo:   porTipo.map(r => ({ tipo_audiencia: r.tipo_audiencia, cantidad: Number(r.cantidad) })),
    por_sala:   porSala.map(r => ({ id_sala: r.id_sala, sala: nombreSala.get(r.id_sala) ?? null, cantidad: Number(r.cantidad) })),
    por_dia:    porDia.map(r => ({ fecha: r.fecha, cantidad: Number(r.cantidad) })),
  };
};

// ── GET /audiencias/stats ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const params = resolverParametros(req);
    res.json({ data: await calcularEstadisticas(params) });
  } catch (err) {
    manejarError(res, 'calcular estadísticas', err);
  }
});

// ── GET /audiencias/stats/export ─────────────────────────────
// Descarga un .xlsx con el resumen y el listado de audiencias del período
router.get('/export', async (req, res) => {
  try {
    const params = resolverParametros(req);
    const stats  = await calcularEstadisticas(params);

    const where = await construirFiltros(params);
    const audiencias = await enriquecer(await Audiencia.findAll({
      where,
      include: [{ model: EstadoAudiencia, as: 'estado' }],
      order:   [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
    }));

    const libro = new ExcelJS.Workbook();
    libro.creator = 'SGPA';
    libro.created = new Date();

    // Hoja 1: resumen
    const resumen = libro.addWorksheet('Resumen');
    resumen.columns = [{ width: 32 }, { width: 14 }];
    resumen.addRow(['Estadísticas de audiencias']).font = { bold: true, size: 14 };
    resumen.addRow(['Período', `${stats.desde} a ${stats.hasta}`]);
    resumen.addRow(['Distrito', stats.id_distrito ?? 'Todos']);
    resumen.addRow(['Total de audiencias', stats.total]);

    const seccion = (titulo, filas) => {
      resumen.addRow([]);
      resumen.addRow([titulo, 'Cantidad']).font = { bold: true };
      filas.forEach(f => resumen.addRow(f));
    };
    seccion('Por estado',           stats.por_estado.map(r => [r.estado, r.cantidad]));
    seccion('Por tipo de audiencia', stats.por_tipo.map(r => [r.tipo_audiencia, r.cantidad]));
    seccion('Por sala',             stats.por_sala.map(r => [r.sala ?? `Sala ${r.id_sala}`, r.cantidad]));

    // Hoja 2: listado
    const hoja = libro.addWorksheet('Audiencias');
    hoja.columns = [
      { header: 'Fecha',       key: 'fecha',          width: 12 },
      { header: 'Inicio',      key: 'hora_inicio',    width: 8 },
      { header: 'Fin',         key: 'hora_fin',       width: 8 },
      { header: 'CUIJ',        key: 'cuij',           width: 16 },
      { header: 'Carátula',    key: 'caratula',       width: 40 },
      { header: 'Tipo',        key: 'tipo_audiencia', width: 20 },
      { header: 'Sala',        key: 'sala',           width: 20 },
      { header: 'Juez',        key: 'juez',           width: 26 },
      { header: 'Fiscal',      key: 'fiscal',         width: 26 },
      { header: 'Defensor',    key: 'defensor',       width: 26 },
      { header: 'Estado',      key: 'estado',         width: 14 },
      { header: 'Motivo',      key: 'motivo_cambio',  width: 30 },
    ];
    hoja.getRow(1).font = { bold: true };
    const nombre = (a) => (a ? `${a.apellido}, ${a.nombre}` : '');
    audiencias.forEach(a => hoja.addRow({
      ...a,
      hora_inicio: String(a.hora_inicio).slice(0, 5),
      hora_fin:    String(a.hora_fin).slice(0, 5),
      sala:        a.sala?.nombre ?? '',
      juez:        nombre(a.juez),
      fiscal:      nombre(a.fiscal),
    }));

    const archivo = `estadisticas_${stats.desde}_${stats.hasta}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
    res.send(Buffer.from(await libro.xlsx.writeBuffer()));
  } catch (err) {
    manejarError(res, 'exportar estadísticas', err);
  }
});

module.exports = router;
