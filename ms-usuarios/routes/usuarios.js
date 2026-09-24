const express = require('express');
const bcrypt  = require('bcrypt');
const { Op }  = require('sequelize');
const { Usuario, Rol } = require('../models');

const router = express.Router();

const MS_DISTRITOS_URL = process.env.MS_DISTRITOS_URL || 'http://localhost:3001';
const BCRYPT_ROUNDS    = 12;
const EMAIL_REGEX      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN     = 8;

// Nunca se devuelve password_hash
const SIN_PASSWORD = { exclude: ['password_hash'] };
const INCLUDE_ROL  = [{ model: Rol, as: 'rol' }];

const serializar = (usuario) => {
  const { password_hash, ...resto } = usuario.toJSON();
  return { ...resto, rol: resto.rol?.nombre ?? resto.rol };
};

const errorInterno = (res, contexto, err) => {
  console.error(`Error al ${contexto}:`, err.message);
  return res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
};

const errorUnico = (res, err) => {
  const campo = err.errors?.[0]?.path || 'dato';
  return res.status(409).json({ error: `Ya existe un usuario con ese ${campo}`, code: 'DUPLICADO' });
};

// Devuelve true si el distrito existe y está activo
const verificarDistrito = async (id_distrito) => {
  const resp = await fetch(`${MS_DISTRITOS_URL}/distritos/${id_distrito}`);
  if (!resp.ok) return false;
  const body = await resp.json();
  return (body.data ?? body).activo === true;
};

// Valida campos de un operador. Con parcial=true solo valida los presentes.
const validarDatos = (datos, parcial = false) => {
  const requeridos = ['username', 'password', 'nombre', 'dni', 'email', 'id_distrito'];
  if (!parcial) {
    const faltantes = requeridos.filter(c => datos[c] === undefined || datos[c] === null || datos[c] === '');
    if (faltantes.length) return `Campos requeridos: ${faltantes.join(', ')}`;
  }
  if (datos.username !== undefined && !/^[a-zA-Z0-9._-]{3,100}$/.test(datos.username)) {
    return 'username debe tener entre 3 y 100 caracteres (letras, números, punto, guion)';
  }
  if (datos.password !== undefined && String(datos.password).length < PASSWORD_MIN) {
    return `password debe tener al menos ${PASSWORD_MIN} caracteres`;
  }
  if (datos.nombre !== undefined && !String(datos.nombre).trim()) return 'nombre no puede estar vacío';
  if (datos.dni !== undefined && !(Number.isInteger(Number(datos.dni)) && Number(datos.dni) > 0)) {
    return 'dni debe ser un número entero positivo';
  }
  if (datos.email !== undefined && !EMAIL_REGEX.test(datos.email)) return 'email inválido';
  if (datos.id_distrito !== undefined && !Number.isInteger(Number(datos.id_distrito))) {
    return 'id_distrito debe ser un número entero';
  }
  return null;
};

// Busca un usuario OPERADOR por id (los administradores no se gestionan desde aquí)
const buscarOperador = async (id, res) => {
  const usuario = await Usuario.findByPk(id, { attributes: SIN_PASSWORD, include: INCLUDE_ROL });
  if (!usuario) {
    res.status(404).json({ error: 'Usuario no encontrado', code: 'NO_ENCONTRADO' });
    return null;
  }
  if (usuario.rol.nombre !== 'OPERADOR') {
    res.status(403).json({ error: 'Solo se pueden gestionar usuarios operadores', code: 'SIN_PERMISO' });
    return null;
  }
  return usuario;
};

// ── Solo Administrador (también lo valida el gateway) ────────
router.use((req, res, next) => {
  if (req.headers['x-usuario-rol'] !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo el Administrador puede gestionar usuarios', code: 'SIN_PERMISO' });
  }
  next();
});

// ── GET /usuarios ────────────────────────────────────────────
// Consultar operadores (CU-11). Query: ?rol&id_distrito&estado=true|false&q&page&limit
router.get('/', async (req, res) => {
  const { rol, id_distrito, estado, q } = req.query;
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

  const where = {};
  if (id_distrito) where.id_distrito = parseInt(id_distrito);
  if (estado === 'true' || estado === 'false') where.estado = estado === 'true';
  if (q) {
    where[Op.or] = [
      { username: { [Op.iLike]: `%${q}%` } },
      { nombre:   { [Op.iLike]: `%${q}%` } },
      { email:    { [Op.iLike]: `%${q}%` } },
    ];
  }

  try {
    const { rows, count } = await Usuario.findAndCountAll({
      where,
      attributes: SIN_PASSWORD,
      include:    [{ model: Rol, as: 'rol', ...(rol && { where: { nombre: rol } }) }],
      order:      [['nombre', 'ASC']],
      limit,
      offset:     (page - 1) * limit,
    });
    res.json({ data: rows.map(serializar), total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    errorInterno(res, 'listar usuarios', err);
  }
});

// ── GET /usuarios/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, { attributes: SIN_PASSWORD, include: INCLUDE_ROL });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado', code: 'NO_ENCONTRADO' });
    res.json({ data: serializar(usuario) });
  } catch (err) {
    errorInterno(res, 'obtener usuario', err);
  }
});

// ── POST /usuarios ───────────────────────────────────────────
// Crear usuario operador (CU-09).
// Body: { username, password, nombre, dni, email, id_distrito }
router.post('/', async (req, res) => {
  const error = validarDatos(req.body);
  if (error) return res.status(400).json({ error, code: 'DATOS_INVALIDOS' });

  const { username, password, nombre, dni, email } = req.body;
  const id_distrito = parseInt(req.body.id_distrito);

  try {
    if (!(await verificarDistrito(id_distrito))) {
      return res.status(400).json({ error: 'El distrito indicado no existe o está inactivo', code: 'DISTRITO_INVALIDO' });
    }

    const rolOperador = await Rol.findOne({ where: { nombre: 'OPERADOR' } });
    const nuevo = await Usuario.create({
      username,
      password_hash: await bcrypt.hash(String(password), BCRYPT_ROUNDS),
      nombre:        String(nombre).trim(),
      dni:           parseInt(dni),
      email:         email.trim(),
      id_rol:        rolOperador.id_rol,
      id_distrito,
    });

    const creado = await Usuario.findByPk(nuevo.id_usuario, { attributes: SIN_PASSWORD, include: INCLUDE_ROL });
    res.status(201).json({ data: serializar(creado), message: 'Operador creado' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return errorUnico(res, err);
    errorInterno(res, 'crear usuario', err);
  }
});

// ── PUT /usuarios/:id ────────────────────────────────────────
// Modificar operador (CU-10). Si viene password, se reemplaza.
router.put('/:id', async (req, res) => {
  const campos = ['username', 'password', 'nombre', 'dni', 'email', 'id_distrito'];
  const cambios = {};
  for (const c of campos) if (req.body[c] !== undefined && req.body[c] !== '') cambios[c] = req.body[c];

  const error = validarDatos(cambios, true);
  if (error) return res.status(400).json({ error, code: 'DATOS_INVALIDOS' });

  try {
    const usuario = await buscarOperador(req.params.id, res);
    if (!usuario) return;

    if (cambios.id_distrito !== undefined) {
      cambios.id_distrito = parseInt(cambios.id_distrito);
      if (cambios.id_distrito !== usuario.id_distrito && !(await verificarDistrito(cambios.id_distrito))) {
        return res.status(400).json({ error: 'El distrito indicado no existe o está inactivo', code: 'DISTRITO_INVALIDO' });
      }
    }
    if (cambios.password !== undefined) {
      cambios.password_hash = await bcrypt.hash(String(cambios.password), BCRYPT_ROUNDS);
      delete cambios.password;
    }
    if (cambios.dni !== undefined) cambios.dni = parseInt(cambios.dni);

    await usuario.update(cambios);
    res.json({ data: serializar(usuario), message: 'Operador actualizado' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return errorUnico(res, err);
    errorInterno(res, 'actualizar usuario', err);
  }
});

// ── PATCH /usuarios/:id/baja ─────────────────────────────────
// Baja lógica: el operador ya no puede iniciar sesión
router.patch('/:id/baja', async (req, res) => {
  try {
    const usuario = await buscarOperador(req.params.id, res);
    if (!usuario) return;
    if (!usuario.estado) return res.status(409).json({ error: 'El usuario ya está inactivo', code: 'ESTADO_INVALIDO' });

    await usuario.update({ estado: false });
    res.json({ data: serializar(usuario), message: 'Operador dado de baja' });
  } catch (err) {
    errorInterno(res, 'dar de baja usuario', err);
  }
});

// ── PATCH /usuarios/:id/alta ─────────────────────────────────
router.patch('/:id/alta', async (req, res) => {
  try {
    const usuario = await buscarOperador(req.params.id, res);
    if (!usuario) return;
    if (usuario.estado) return res.status(409).json({ error: 'El usuario ya está activo', code: 'ESTADO_INVALIDO' });

    await usuario.update({ estado: true });
    res.json({ data: serializar(usuario), message: 'Operador reactivado' });
  } catch (err) {
    errorInterno(res, 'reactivar usuario', err);
  }
});

module.exports = router;
