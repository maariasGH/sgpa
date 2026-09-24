const express = require('express');
const { Op }  = require('sequelize');
const { sequelize, Audiencia, EstadoAudiencia } = require('../models');
const v = require('../lib/validaciones');
const { hoy } = require('../lib/fechas');
const { enriquecer } = require('../lib/presentacion');
const { ErrorHttp, manejarError } = require('../lib/errores');
const { construirFiltros } = require('../lib/filtros');
const { obtenerSala, obtenerAutoridad, notificarAutoridades } = require('../lib/servicios');
const {
  ESTADOS_INACTIVOS,
  ESTADOS_FINALES,
  ESTADOS_CON_MOTIVO,
  cargarEstados,
  idEstado,
  idsDe,
} = require('../lib/estados');

const router = express.Router();

const INCLUDE_ESTADO = [{ model: EstadoAudiencia, as: 'estado' }];

// ── Helpers ──────────────────────────────────────────────────

const usuarioDe = (req) => ({
  id:       req.headers['x-usuario-id'] !== undefined ? parseInt(req.headers['x-usuario-id']) : null,
  rol:      req.headers['x-usuario-rol'],
  distrito: parseInt(req.headers['x-usuario-distrito']) || null,
});

const exigirAutenticado = (req) => {
  const { id, rol } = usuarioDe(req);
  if (!rol || !Number.isInteger(id)) {
    throw new ErrorHttp(401, 'NO_AUTENTICADO', 'Usuario no identificado');
  }
};

// El operador solo gestiona audiencias de salas de su distrito
const exigirDistrito = (req, sala) => {
  const { rol, distrito } = usuarioDe(req);
  if (rol === 'OPERADOR' && sala.id_distrito !== distrito) {
    throw new ErrorHttp(403, 'DISTRITO_AJENO', 'La sala pertenece a otro distrito');
  }
};

const buscarAudiencia = async (id, transaction) => {
  if (!v.esIdValido(id)) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'id inválido');
  const audiencia = await Audiencia.findByPk(id, { include: INCLUDE_ESTADO, transaction });
  if (!audiencia) throw new ErrorHttp(404, 'NO_ENCONTRADO', 'Audiencia no encontrada');
  return audiencia;
};

// Valida y normaliza los campos de una audiencia (completa, ya mezclada con los cambios)
const validarCampos = (datos) => {
  const requeridos = ['cuij', 'caratula', 'tipo_audiencia', 'id_sala', 'id_juez', 'id_fiscal', 'fecha', 'hora_inicio', 'hora_fin'];
  const faltantes = requeridos.filter(c => datos[c] === undefined || datos[c] === null || datos[c] === '');
  if (faltantes.length) throw new ErrorHttp(400, 'DATOS_INVALIDOS', `Campos requeridos: ${faltantes.join(', ')}`);

  const cuij = v.normalizarCuij(datos.cuij);
  if (!v.esCuijValido(cuij)) throw new ErrorHttp(400, 'CUIJ_INVALIDO', 'El CUIJ debe tener formato XX-XXXXXXXX-X');

  if (!String(datos.caratula).trim())       throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'caratula no puede estar vacía');
  if (!String(datos.tipo_audiencia).trim()) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'tipo_audiencia no puede estar vacío');
  if (String(datos.tipo_audiencia).length > 100) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'tipo_audiencia no puede superar 100 caracteres');
  if (datos.defensor && String(datos.defensor).length > 200) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'defensor no puede superar 200 caracteres');

  for (const campo of ['id_sala', 'id_juez', 'id_fiscal']) {
    if (!v.esIdValido(datos[campo])) throw new ErrorHttp(400, 'DATOS_INVALIDOS', `${campo} debe ser un entero positivo`);
  }
  if (!v.esFechaValida(datos.fecha)) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'fecha debe tener formato YYYY-MM-DD');

  const errorHorario = v.validarHorario(datos.hora_inicio, datos.hora_fin);
  if (errorHorario) throw new ErrorHttp(400, 'HORARIO_INVALIDO', errorHorario);

  return {
    cuij,
    caratula:       String(datos.caratula).trim(),
    tipo_audiencia: String(datos.tipo_audiencia).trim(),
    id_sala:        Number(datos.id_sala),
    id_juez:        Number(datos.id_juez),
    id_fiscal:      Number(datos.id_fiscal),
    defensor:       datos.defensor ? String(datos.defensor).trim() : null,
    fecha:          datos.fecha,
    hora_inicio:    v.normalizarHora(datos.hora_inicio),
    hora_fin:       v.normalizarHora(datos.hora_fin),
  };
};

// Verifica sala, juez y fiscal contra sus microservicios.
// `nuevos` indica qué referencias cambiaron: solo a esas se les exige estar activas
// (una autoridad INACTIVA no puede asignarse a audiencias nuevas).
const validarAsignaciones = async (req, datos, nuevos) => {
  const sala = await obtenerSala(datos.id_sala);
  if (!sala) throw new ErrorHttp(400, 'SALA_INVALIDA', 'La sala indicada no existe');
  if (nuevos.sala && !sala.activa) throw new ErrorHttp(400, 'SALA_INVALIDA', 'La sala indicada está inactiva');
  exigirDistrito(req, sala);

  const [juez, fiscal] = await Promise.all([obtenerAutoridad(datos.id_juez), obtenerAutoridad(datos.id_fiscal)]);

  const verificar = (autoridad, cargo, campo, esNuevo) => {
    if (!autoridad) throw new ErrorHttp(400, 'AUTORIDAD_INVALIDA', `${campo}: la autoridad no existe`);
    if (autoridad.cargo !== cargo) throw new ErrorHttp(400, 'AUTORIDAD_INVALIDA', `${campo}: la autoridad no tiene cargo ${cargo}`);
    if (esNuevo && !autoridad.estado) throw new ErrorHttp(400, 'AUTORIDAD_INACTIVA', `${campo}: la autoridad está inactiva`);
    if (autoridad.id_distrito !== sala.id_distrito) {
      throw new ErrorHttp(400, 'AUTORIDAD_INVALIDA', `${campo}: la autoridad pertenece a otro distrito que la sala`);
    }
  };
  verificar(juez,   'JUEZ',   'id_juez',   nuevos.juez);
  verificar(fiscal, 'FISCAL', 'id_fiscal', nuevos.fiscal);

  return { sala, juez, fiscal };
};

// Busca audiencias activas del mismo día cuyo intervalo se solape con el de `datos`
// y que compartan sala, juez o fiscal. Debe llamarse dentro de la transacción con lock.
const buscarSuperposiciones = async (datos, excluirId, transaction) => {
  const inactivos = await idsDe(ESTADOS_INACTIVOS);
  const where = {
    fecha:       datos.fecha,
    id_estado:   { [Op.notIn]: inactivos },
    hora_inicio: { [Op.lt]: datos.hora_fin },
    hora_fin:    { [Op.gt]: datos.hora_inicio },
    [Op.or]: [
      { id_sala:   datos.id_sala },
      { id_juez:   datos.id_juez },
      { id_fiscal: datos.id_fiscal },
    ],
  };
  if (excluirId) where.id_audiencia = { [Op.ne]: excluirId };

  const choques = await Audiencia.findAll({ where, transaction });
  return choques.flatMap(a => {
    const recursos = [];
    if (a.id_sala   === datos.id_sala)   recursos.push('SALA');
    if (a.id_juez   === datos.id_juez)   recursos.push('JUEZ');
    if (a.id_fiscal === datos.id_fiscal) recursos.push('FISCAL');
    return recursos.map(recurso => ({
      recurso,
      id_audiencia: a.id_audiencia,
      cuij:         a.cuij,
      hora_inicio:  a.hora_inicio,
      hora_fin:     a.hora_fin,
    }));
  });
};

const errorSuperposicion = (conflictos) => {
  const recursos = [...new Set(conflictos.map(c => c.recurso.toLowerCase()))].join(', ');
  return new ErrorHttp(409, 'SUPERPOSICION', `Superposición horaria con otra audiencia (${recursos})`, { conflictos });
};

// Serializa las altas/modificaciones del mismo día para que dos requests
// simultáneos no pasen ambos la validación de superposición
const bloquearFecha = (fecha, transaction) =>
  sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:clave))', {
    replacements: { clave: `sgpa_audiencias:${fecha}` },
    transaction,
  });

const describir = (a, sala) =>
  `CUIJ ${a.cuij} — "${a.caratula}"\n` +
  `Tipo: ${a.tipo_audiencia}\n` +
  `Fecha: ${a.fecha} de ${String(a.hora_inicio).slice(0, 5)} a ${String(a.hora_fin).slice(0, 5)}\n` +
  `Sala: ${sala?.nombre ?? a.id_sala}`;

// ── GET /audiencias ──────────────────────────────────────────
// Calendario público (CU-01).
// Query: ?fecha | ?desde&hasta, sala|id_sala, id_distrito, tipo, estado (ej: EN_HORARIO,DEMORADA),
//        activas=true, id_juez, id_fiscal, id_autoridad, cuij, page, limit
router.get('/', async (req, res) => {
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 500);

  try {
    const where = await construirFiltros(req.query);
    const { rows, count } = await Audiencia.findAndCountAll({
      where,
      include: INCLUDE_ESTADO,
      order:   [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
      limit,
      offset:  (page - 1) * limit,
    });
    res.json({ data: await enriquecer(rows), total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    manejarError(res, 'listar audiencias', err);
  }
});

// ── GET /audiencias/tv ───────────────────────────────────────
// Vista TV: audiencias de HOY activas (sin CANCELADA/SUSPENDIDA). Query: ?id_distrito
// El refresco (60 s) y la paginación (6 por página cada 15 s) los hace el frontend.
router.get('/tv', async (req, res) => {
  try {
    const fecha = hoy();
    const where = await construirFiltros({ fecha, activas: 'true', id_distrito: req.query.id_distrito });
    const audiencias = await Audiencia.findAll({
      where,
      include: INCLUDE_ESTADO,
      order:   [['hora_inicio', 'ASC']],
    });
    res.json({ data: await enriquecer(audiencias), fecha, total: audiencias.length });
  } catch (err) {
    manejarError(res, 'obtener vista TV', err);
  }
});

// ── GET /audiencias/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const audiencia = await buscarAudiencia(req.params.id);
    const [data] = await enriquecer([audiencia]);
    res.json({ data });
  } catch (err) {
    manejarError(res, 'obtener audiencia', err);
  }
});

// ── POST /audiencias ─────────────────────────────────────────
// Programar audiencia (CU-02). Valida superposición antes de insertar.
router.post('/', async (req, res) => {
  try {
    exigirAutenticado(req);
    const datos = validarCampos(req.body);
    const { sala } = await validarAsignaciones(req, datos, { sala: true, juez: true, fiscal: true });
    const enHorario = await idEstado('EN_HORARIO');

    const creada = await sequelize.transaction(async (transaction) => {
      await bloquearFecha(datos.fecha, transaction);
      const conflictos = await buscarSuperposiciones(datos, null, transaction);
      if (conflictos.length) throw errorSuperposicion(conflictos);

      return Audiencia.create({
        ...datos,
        id_estado:        enHorario,
        id_usuario_carga: usuarioDe(req).id,
      }, { transaction });
    });

    notificarAutoridades(
      [datos.id_juez, datos.id_fiscal],
      `SGPA — Nueva audiencia asignada (${datos.cuij})`,
      `Se le asignó la siguiente audiencia:\n\n${describir(datos, sala)}`,
    );

    const [data] = await enriquecer([await buscarAudiencia(creada.id_audiencia)]);
    res.status(201).json({ data, message: 'Audiencia programada' });
  } catch (err) {
    manejarError(res, 'crear audiencia', err);
  }
});

// ── PUT /audiencias/:id ──────────────────────────────────────
// Modificar audiencia (CU-03). Valida superposición excluyendo el propio registro.
// El estado se cambia con PATCH /:id/estado.
router.put('/:id', async (req, res) => {
  const editables = ['cuij', 'caratula', 'tipo_audiencia', 'id_sala', 'id_juez', 'id_fiscal', 'defensor', 'fecha', 'hora_inicio', 'hora_fin'];

  try {
    exigirAutenticado(req);
    const actual = await buscarAudiencia(req.params.id);

    if (ESTADOS_FINALES.includes(actual.estado.nombre)) {
      throw new ErrorHttp(409, 'ESTADO_INVALIDO', `No se puede modificar una audiencia ${actual.estado.nombre}`);
    }

    // El operador debe ser del distrito de la sala ACTUAL de la audiencia
    const salaActual = await obtenerSala(actual.id_sala);
    if (salaActual) exigirDistrito(req, salaActual);

    const mezcla = { ...actual.toJSON() };
    for (const c of editables) if (req.body[c] !== undefined) mezcla[c] = req.body[c];
    const datos = validarCampos(mezcla);

    const { sala } = await validarAsignaciones(req, datos, {
      sala:   datos.id_sala   !== actual.id_sala,
      juez:   datos.id_juez   !== actual.id_juez,
      fiscal: datos.id_fiscal !== actual.id_fiscal,
    });

    const autoridadesAnteriores = [actual.id_juez, actual.id_fiscal];

    await sequelize.transaction(async (transaction) => {
      await bloquearFecha(datos.fecha, transaction);
      const conflictos = await buscarSuperposiciones(datos, actual.id_audiencia, transaction);
      if (conflictos.length) throw errorSuperposicion(conflictos);
      await actual.update(datos, { transaction });
    });

    notificarAutoridades(
      [datos.id_juez, datos.id_fiscal, ...autoridadesAnteriores],
      `SGPA — Audiencia modificada (${datos.cuij})`,
      `Se modificó una audiencia en la que interviene o intervenía. Datos actuales:\n\n${describir(datos, sala)}`,
    );

    const [data] = await enriquecer([await buscarAudiencia(actual.id_audiencia)]);
    res.json({ data, message: 'Audiencia modificada' });
  } catch (err) {
    manejarError(res, 'modificar audiencia', err);
  }
});

// ── PATCH /audiencias/:id/estado ─────────────────────────────
// Cambio de estado (CU-04). Body: { estado, motivo }
// CANCELADA / SUSPENDIDA requieren motivo y liberan sala, juez y fiscal
// (esos estados no participan de la validación de superposición).
router.patch('/:id/estado', async (req, res) => {
  const nuevoEstado = String(req.body.estado || '').toUpperCase();
  const motivo      = req.body.motivo ? String(req.body.motivo).trim() : '';

  try {
    exigirAutenticado(req);
    const { porNombre } = await cargarEstados();
    if (!porNombre[nuevoEstado]) {
      throw new ErrorHttp(400, 'DATOS_INVALIDOS', `estado debe ser uno de: ${Object.keys(porNombre).join(', ')}`);
    }
    if (ESTADOS_CON_MOTIVO.includes(nuevoEstado) && !motivo) {
      throw new ErrorHttp(400, 'MOTIVO_REQUERIDO', `El motivo es obligatorio para ${nuevoEstado}`);
    }

    const audiencia = await buscarAudiencia(req.params.id);
    const estadoActual = audiencia.estado.nombre;

    const sala = await obtenerSala(audiencia.id_sala);
    if (sala) exigirDistrito(req, sala);

    if (ESTADOS_FINALES.includes(estadoActual)) {
      throw new ErrorHttp(409, 'ESTADO_INVALIDO', `La audiencia ya está ${estadoActual} y no puede cambiar de estado`);
    }
    if (estadoActual === nuevoEstado) {
      throw new ErrorHttp(409, 'ESTADO_INVALIDO', `La audiencia ya está ${estadoActual}`);
    }

    await audiencia.update({
      id_estado:     porNombre[nuevoEstado],
      motivo_cambio: motivo || audiencia.motivo_cambio,
    });

    if (ESTADOS_CON_MOTIVO.includes(nuevoEstado)) {
      notificarAutoridades(
        [audiencia.id_juez, audiencia.id_fiscal],
        `SGPA — Audiencia ${nuevoEstado} (${audiencia.cuij})`,
        `La siguiente audiencia fue ${nuevoEstado.toLowerCase()}.\nMotivo: ${motivo}\n\n${describir(audiencia, sala)}`,
      );
    }

    const [data] = await enriquecer([await buscarAudiencia(audiencia.id_audiencia)]);
    res.json({ data, message: `Audiencia ${nuevoEstado}` });
  } catch (err) {
    manejarError(res, 'cambiar estado de audiencia', err);
  }
});

module.exports = router;
