const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const HASH_USUARIO_INEXISTENTE = bcrypt.hashSync('sgpa-usuario-inexistente', BCRYPT_ROUNDS);

const extraerToken = (req) => {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
};

const firmarToken = (usuario) => jwt.sign(
  {
    id_usuario:  usuario.id_usuario,
    username:    usuario.username,
    rol:         usuario.rol.nombre,      // 'ADMINISTRADOR' o 'OPERADOR'
    id_distrito: usuario.id_distrito,     // null si es admin
    debe_cambiar_password: usuario.debe_cambiar_password === true,
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '5m' },
);

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({
      error: 'username y password son requeridos y deben ser texto',
      code: 'DATOS_INVALIDOS',
    });
  }

  try {
    // Buscar el usuario incluyendo su rol
    const usuario = await Usuario.findOne({
      where: { username },
      include: [{ model: Rol, as: 'rol' }],
    });

    const passwordValida = await bcrypt.compare(
      password,
      usuario?.password_hash ?? HASH_USUARIO_INEXISTENTE
    );
    if (!usuario || !usuario.estado || !passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas', code: 'CREDENCIALES_INVALIDAS' });
    }

    return res.status(200).json({
      token: firmarToken(usuario),
      usuario: {
        id_usuario:  usuario.id_usuario,
        username:    usuario.username,
        nombre:      usuario.nombre,
        rol:         usuario.rol.nombre,
        id_distrito: usuario.id_distrito,
        debe_cambiar_password: usuario.debe_cambiar_password === true,
      },
    });

  } catch (err) {
    console.error('Error en login:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /auth/cambiar-password — completa el primer acceso del operador.
router.post('/cambiar-password', async (req, res) => {
  const nuevaPassword = req.body?.password;
  if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 8) {
    return res.status(400).json({
      error: 'La nueva contraseña debe tener al menos 8 caracteres',
      code: 'DATOS_INVALIDOS',
    });
  }

  const token = extraerToken(req);
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  if (!Number.isSafeInteger(decoded.id_usuario)) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  try {
    const usuario = await Usuario.findByPk(decoded.id_usuario, {
      include: [{ model: Rol, as: 'rol' }],
    });
    if (!usuario || !usuario.estado) {
      return res.status(401).json({ error: 'La cuenta está deshabilitada' });
    }
    if (!usuario.debe_cambiar_password) {
      return res.status(409).json({
        error: 'La cuenta no requiere un cambio inicial de contraseña',
        code: 'CAMBIO_NO_REQUERIDO',
      });
    }
    if (await bcrypt.compare(nuevaPassword, usuario.password_hash)) {
      return res.status(400).json({
        error: 'La nueva contraseña debe ser diferente de la contraseña temporal',
        code: 'PASSWORD_REPETIDA',
      });
    }

    usuario.password_hash = await bcrypt.hash(nuevaPassword, BCRYPT_ROUNDS);
    usuario.debe_cambiar_password = false;
    await usuario.save();

    return res.json({
      token: firmarToken(usuario),
      usuario: {
        id_usuario: usuario.id_usuario,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol.nombre,
        id_distrito: usuario.id_distrito,
        debe_cambiar_password: false,
      },
    });
  } catch (err) {
    console.error('Error al cambiar contraseña inicial:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /auth/verificar  ← verificación interna; el gateway valida localmente los JWT
router.get(['/verificar', '/verify'], (req, res) => {
  const token = extraerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ valido: true, usuario: decoded });
  } catch (err) {
    return res.status(401).json({ valido: false, error: 'Token inválido o expirado' });
  }
});

// POST /auth/refresh  ← el frontend lo llama antes de que expire el token (5 min)
// Emite un token nuevo si el actual sigue siendo válido y el usuario sigue activo.
router.post('/refresh', async (req, res) => {
  const token = extraerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  try {
    const usuario = await Usuario.findByPk(decoded.id_usuario, {
      include: [{ model: Rol, as: 'rol' }],
    });
    if (!usuario || !usuario.estado) {
      return res.status(401).json({ error: 'La cuenta está deshabilitada' });
    }
    if (decoded.debe_cambiar_password === true && !usuario.debe_cambiar_password) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    return res.status(200).json({ token: firmarToken(usuario) });
  } catch (err) {
    console.error('Error en refresh:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /auth/logout  ← el JWT es stateless: el cliente descarta el token.
// El gateway registra el LOGOUT en auditoría al recibir esta respuesta.
router.post('/logout', (req, res) => {
  return res.status(200).json({ message: 'Sesión cerrada' });
});

module.exports = router;