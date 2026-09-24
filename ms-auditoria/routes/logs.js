const express = require('express');
const { Op }  = require('sequelize');
const { LogAuditoria } = require('../models');

const router = express.Router();

// Offset horario de Argentina (sin horario de verano) para interpretar ?desde / ?hasta
const OFFSET_AR = '-03:00';
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ── POST /logs ───────────────────────────────────────────────
// Registra una acción. Solo lo llama el API Gateway (el gateway bloquea
// este endpoint para los clientes). La tabla es de solo inserción.
router.post('/', async (req, res) => {
  const { id_usuario, tipo_accion, entidad, id_entidad, detalle, request, ip_origen } = req.body;

  if (!Number.isInteger(id_usuario)) {
    return res.status(400).json({ error: 'id_usuario es requerido y debe ser entero', code: 'DATOS_INVALIDOS' });
  }
  if (!LogAuditoria.TIPOS_ACCION.includes(tipo_accion)) {
    return res.status(400).json({
      error: `tipo_accion debe ser uno de: ${LogAuditoria.TIPOS_ACCION.join(', ')}`,
      code:  'DATOS_INVALIDOS',
    });
  }
  if (!entidad || typeof entidad !== 'string') {
    return res.status(400).json({ error: 'entidad es requerida', code: 'DATOS_INVALIDOS' });
  }

  try {
    const log = await LogAuditoria.create({
      id_usuario,
      tipo_accion,
      entidad:    entidad.toUpperCase().slice(0, 50),
      id_entidad: Number.isInteger(id_entidad) ? id_entidad : null,
      detalle:    detalle ?? null,
      request:    request ?? null,
      ip_origen:  (ip_origen || 'desconocida').slice(0, 45),
    });
    res.status(201).json({ data: log, message: 'Acción registrada' });
  } catch (err) {
    console.error('Error al registrar log:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
  }
});

// ── GET /logs ────────────────────────────────────────────────
// Consulta del log (CU-12). Solo Administrador.
// Query: ?usuario&tipo_accion&entidad&id_entidad&desde&hasta&page&limit
router.get('/', async (req, res) => {
  if (req.headers['x-usuario-rol'] !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo el Administrador puede consultar la auditoría', code: 'SIN_PERMISO' });
  }

  const { usuario, tipo_accion, entidad, id_entidad, desde, hasta } = req.query;
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

  const where = {};
  if (usuario)     where.id_usuario  = parseInt(usuario);
  if (id_entidad)  where.id_entidad  = parseInt(id_entidad);
  if (entidad)     where.entidad     = entidad.toUpperCase();
  if (tipo_accion) {
    if (!LogAuditoria.TIPOS_ACCION.includes(tipo_accion)) {
      return res.status(400).json({ error: 'tipo_accion inválido', code: 'DATOS_INVALIDOS' });
    }
    where.tipo_accion = tipo_accion;
  }
  if ((desde && !FECHA_REGEX.test(desde)) || (hasta && !FECHA_REGEX.test(hasta))) {
    return res.status(400).json({ error: 'desde / hasta deben tener formato YYYY-MM-DD', code: 'DATOS_INVALIDOS' });
  }
  if (desde || hasta) {
    where.fecha_hora = {};
    if (desde) where.fecha_hora[Op.gte] = new Date(`${desde}T00:00:00${OFFSET_AR}`);
    if (hasta) where.fecha_hora[Op.lte] = new Date(`${hasta}T23:59:59.999${OFFSET_AR}`);
  }

  try {
    const { rows, count } = await LogAuditoria.findAndCountAll({
      where,
      order:  [['fecha_hora', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    console.error('Error al consultar logs:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
  }
});

// ── GET /logs/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  if (req.headers['x-usuario-rol'] !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo el Administrador puede consultar la auditoría', code: 'SIN_PERMISO' });
  }

  try {
    const log = await LogAuditoria.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Registro no encontrado', code: 'NO_ENCONTRADO' });
    res.json({ data: log });
  } catch (err) {
    console.error('Error al obtener log:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
  }
});

module.exports = router;
