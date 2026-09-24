const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { Autoridad } = require('../models');
const { verificarDistrito, contarAudienciasFuturas } = require('../lib/servicios');
const { enviarCorreo } = require('../lib/mailer');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helpers ──────────────────────────────────────────────────
const usuarioDe = (req) => ({
  rol:      req.headers['x-usuario-rol'],
  distrito: parseInt(req.headers['x-usuario-distrito']) || null,
});

const esOperadorDeOtroDistrito = (req, id_distrito) => {
  const { rol, distrito } = usuarioDe(req);
  return rol === 'OPERADOR' && distrito !== id_distrito;
};

const errorInterno = (res, contexto, err) => {
  console.error(`Error al ${contexto}:`, err.message);
  return res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
};

// Valida los campos de una autoridad. Con parcial=true solo valida los presentes.
const validarDatos = (datos, parcial = false) => {
  const requeridos = ['nombre', 'apellido', 'dni', 'cargo', 'email', 'id_distrito'];
  if (!parcial) {
    const faltantes = requeridos.filter(c => datos[c] === undefined || datos[c] === null || datos[c] === '');
    if (faltantes.length) return `Campos requeridos: ${faltantes.join(', ')}`;
  }
  if (datos.nombre   !== undefined && !String(datos.nombre).trim())   return 'nombre no puede estar vacío';
  if (datos.apellido !== undefined && !String(datos.apellido).trim()) return 'apellido no puede estar vacío';
  if (datos.dni !== undefined && !(Number.isInteger(Number(datos.dni)) && Number(datos.dni) > 0)) {
    return 'dni debe ser un número entero positivo';
  }
  if (datos.cargo !== undefined && !Autoridad.CARGOS.includes(datos.cargo)) {
    return `cargo debe ser uno de: ${Autoridad.CARGOS.join(', ')}`;
  }
  if (datos.email !== undefined && !EMAIL_REGEX.test(datos.email)) return 'email inválido';
  if (datos.telefono && String(datos.telefono).length > 20) return 'telefono no puede superar 20 caracteres';
  if (datos.id_distrito !== undefined && !Number.isInteger(Number(datos.id_distrito))) {
    return 'id_distrito debe ser un número entero';
  }
  return null;
};

// ── GET /autoridades ─────────────────────────────────────────
// Consulta de autoridades (CU-07).
// Query: ?cargo&id_distrito&estado=true|false&q&ids=1,2,3&page&limit
router.get('/', async (req, res) => {
  const { cargo, id_distrito, estado, q, ids } = req.query;
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);

  const where = {};
  if (cargo)       where.cargo       = cargo;
  if (id_distrito) where.id_distrito = parseInt(id_distrito);
  if (estado === 'true' || estado === 'false') where.estado = estado === 'true';
  if (ids) {
    where.id_autoridad = { [Op.in]: String(ids).split(',').map(Number).filter(Number.isInteger) };
  }
  if (q) {
    where[Op.or] = [
      { nombre:   { [Op.iLike]: `%${q}%` } },
      { apellido: { [Op.iLike]: `%${q}%` } },
      Sequelize.where(Sequelize.cast(Sequelize.col('dni'), 'TEXT'), { [Op.like]: `%${q}%` }),
    ];
  }

  // El operador solo ve autoridades de su distrito
  const { rol, distrito } = usuarioDe(req);
  if (rol === 'OPERADOR') where.id_distrito = distrito;

  try {
    const { rows, count } = await Autoridad.findAndCountAll({
      where,
      order:  [['apellido', 'ASC'], ['nombre', 'ASC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    errorInterno(res, 'obtener autoridades', err);
  }
});

// ── GET /autoridades/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const autoridad = await Autoridad.findByPk(req.params.id);
    if (!autoridad) return res.status(404).json({ error: 'Autoridad no encontrada', code: 'NO_ENCONTRADO' });

    if (esOperadorDeOtroDistrito(req, autoridad.id_distrito)) {
      return res.status(403).json({ error: 'La autoridad pertenece a otro distrito', code: 'DISTRITO_AJENO' });
    }
    res.json({ data: autoridad });
  } catch (err) {
    errorInterno(res, 'obtener autoridad', err);
  }
});

// ── POST /autoridades ────────────────────────────────────────
// Registrar autoridad (CU-05). Operador (su distrito) o Admin.
router.post('/', async (req, res) => {
  const datos = { ...req.body };

  // Si el operador no indica distrito se usa el suyo
  const { rol, distrito } = usuarioDe(req);
  if (rol === 'OPERADOR' && (datos.id_distrito === undefined || datos.id_distrito === null)) {
    datos.id_distrito = distrito;
  }

  const error = validarDatos(datos);
  if (error) return res.status(400).json({ error, code: 'DATOS_INVALIDOS' });

  const id_distrito = parseInt(datos.id_distrito);
  if (esOperadorDeOtroDistrito(req, id_distrito)) {
    return res.status(403).json({ error: 'Solo podés registrar autoridades en tu propio distrito', code: 'DISTRITO_AJENO' });
  }

  try {
    if (!(await verificarDistrito(id_distrito))) {
      return res.status(400).json({ error: 'El distrito indicado no existe o está inactivo', code: 'DISTRITO_INVALIDO' });
    }
  } catch (err) {
    console.error('Error consultando ms-distritos:', err.message);
    return res.status(503).json({ error: 'No se pudo validar el distrito', code: 'SERVICIO_NO_DISPONIBLE' });
  }

  try {
    const nueva = await Autoridad.create({
      nombre:      datos.nombre.trim(),
      apellido:    datos.apellido.trim(),
      dni:         parseInt(datos.dni),
      cargo:       datos.cargo,
      email:       datos.email.trim(),
      telefono:    datos.telefono || null,
      id_distrito,
    });
    res.status(201).json({ data: nueva, message: 'Autoridad registrada' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe una autoridad con ese DNI en el distrito', code: 'DNI_DUPLICADO' });
    }
    errorInterno(res, 'crear autoridad', err);
  }
});

// ── PUT /autoridades/:id ─────────────────────────────────────
// Modificar autoridad (CU-06). El estado se cambia con /baja y /alta.
router.put('/:id', async (req, res) => {
  const campos = ['nombre', 'apellido', 'dni', 'cargo', 'email', 'telefono', 'id_distrito'];
  const cambios = {};
  for (const c of campos) if (req.body[c] !== undefined) cambios[c] = req.body[c];

  const error = validarDatos(cambios, true);
  if (error) return res.status(400).json({ error, code: 'DATOS_INVALIDOS' });

  try {
    const autoridad = await Autoridad.findByPk(req.params.id);
    if (!autoridad) return res.status(404).json({ error: 'Autoridad no encontrada', code: 'NO_ENCONTRADO' });

    if (esOperadorDeOtroDistrito(req, autoridad.id_distrito)) {
      return res.status(403).json({ error: 'Solo podés modificar autoridades de tu propio distrito', code: 'DISTRITO_AJENO' });
    }

    if (cambios.id_distrito !== undefined) {
      cambios.id_distrito = parseInt(cambios.id_distrito);
      if (cambios.id_distrito !== autoridad.id_distrito) {
        if (usuarioDe(req).rol !== 'ADMINISTRADOR') {
          return res.status(403).json({ error: 'Solo el Administrador puede cambiar el distrito de una autoridad', code: 'SIN_PERMISO' });
        }
        if (!(await verificarDistrito(cambios.id_distrito))) {
          return res.status(400).json({ error: 'El distrito indicado no existe o está inactivo', code: 'DISTRITO_INVALIDO' });
        }
      }
    }

    // Cambiar el cargo o el distrito dejaría inconsistentes sus audiencias futuras
    const cambiaCargo    = cambios.cargo       !== undefined && cambios.cargo       !== autoridad.cargo;
    const cambiaDistrito = cambios.id_distrito !== undefined && cambios.id_distrito !== autoridad.id_distrito;
    if (cambiaCargo || cambiaDistrito) {
      const futuras = await contarAudienciasFuturas(autoridad.id_autoridad);
      if (futuras > 0) {
        return res.status(409).json({
          error: `No se puede cambiar cargo o distrito: la autoridad tiene ${futuras} audiencia(s) futura(s) activa(s)`,
          code:  'AUDIENCIAS_FUTURAS',
        });
      }
    }

    if (cambios.dni !== undefined) cambios.dni = parseInt(cambios.dni);
    await autoridad.update(cambios);
    res.json({ data: autoridad, message: 'Autoridad actualizada' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe una autoridad con ese DNI en el distrito', code: 'DNI_DUPLICADO' });
    }
    errorInterno(res, 'actualizar autoridad', err);
  }
});

// ── PATCH /autoridades/:id/baja ──────────────────────────────
// Baja lógica. No se permite si tiene audiencias activas futuras.
router.patch('/:id/baja', async (req, res) => {
  try {
    const autoridad = await Autoridad.findByPk(req.params.id);
    if (!autoridad) return res.status(404).json({ error: 'Autoridad no encontrada', code: 'NO_ENCONTRADO' });

    if (esOperadorDeOtroDistrito(req, autoridad.id_distrito)) {
      return res.status(403).json({ error: 'Solo podés dar de baja autoridades de tu propio distrito', code: 'DISTRITO_AJENO' });
    }
    if (!autoridad.estado) {
      return res.status(409).json({ error: 'La autoridad ya está inactiva', code: 'ESTADO_INVALIDO' });
    }

    let futuras;
    try {
      futuras = await contarAudienciasFuturas(autoridad.id_autoridad);
    } catch (err) {
      console.error('Error consultando ms-audiencias:', err.message);
      return res.status(503).json({ error: 'No se pudieron verificar las audiencias de la autoridad', code: 'SERVICIO_NO_DISPONIBLE' });
    }
    if (futuras > 0) {
      return res.status(409).json({
        error: `La autoridad tiene ${futuras} audiencia(s) futura(s) activa(s). Reasignalas o cancelalas antes de darla de baja`,
        code:  'AUDIENCIAS_FUTURAS',
      });
    }

    await autoridad.update({ estado: false });
    res.json({ data: autoridad, message: 'Autoridad dada de baja' });
  } catch (err) {
    errorInterno(res, 'dar de baja autoridad', err);
  }
});

// ── PATCH /autoridades/:id/alta ──────────────────────────────
router.patch('/:id/alta', async (req, res) => {
  try {
    const autoridad = await Autoridad.findByPk(req.params.id);
    if (!autoridad) return res.status(404).json({ error: 'Autoridad no encontrada', code: 'NO_ENCONTRADO' });

    if (esOperadorDeOtroDistrito(req, autoridad.id_distrito)) {
      return res.status(403).json({ error: 'Solo podés reactivar autoridades de tu propio distrito', code: 'DISTRITO_AJENO' });
    }
    if (autoridad.estado) {
      return res.status(409).json({ error: 'La autoridad ya está activa', code: 'ESTADO_INVALIDO' });
    }

    await autoridad.update({ estado: true });
    res.json({ data: autoridad, message: 'Autoridad reactivada' });
  } catch (err) {
    errorInterno(res, 'reactivar autoridad', err);
  }
});

// ── POST /autoridades/notificaciones ─────────────────────────
// USO INTERNO (ms-audiencias). El gateway no expone este endpoint.
// Body: { ids: [id_autoridad, ...], asunto, mensaje }
router.post('/notificaciones', async (req, res) => {
  const { ids, asunto, mensaje } = req.body;
  if (!Array.isArray(ids) || !ids.length || !asunto || !mensaje) {
    return res.status(400).json({ error: 'ids (array), asunto y mensaje son requeridos', code: 'DATOS_INVALIDOS' });
  }

  // Responde enseguida; el envío sigue en segundo plano
  res.status(202).json({ message: 'Notificaciones en proceso' });

  try {
    const autoridades = await Autoridad.findAll({ where: { id_autoridad: { [Op.in]: ids } } });
    for (const a of autoridades) {
      enviarCorreo({
        to:      a.email,
        subject: asunto,
        text:    `Estimado/a ${a.nombre} ${a.apellido}:\n\n${mensaje}\n\n— SGPA, Poder Judicial de Santa Fe`,
      }).catch(err => console.error(`Error enviando email a ${a.email}:`, err.message));
    }
  } catch (err) {
    console.error('Error procesando notificaciones:', err.message);
  }
});

module.exports = router;
