const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');

const router = express.Router();

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
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '5m' },
);

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validación básica de campos
  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' });
  }

  try {
    // Buscar el usuario incluyendo su rol
    const usuario = await Usuario.findOne({
      where: { username },
      include: [{ model: Rol, as: 'rol' }],
    });

    // Usuario no existe
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Usuario inactivo
    if (!usuario.estado) {
      return res.status(401).json({ error: 'La cuenta está deshabilitada' });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    return res.status(200).json({
      token: firmarToken(usuario),
      usuario: {
        id_usuario:  usuario.id_usuario,
        username:    usuario.username,
        nombre:      usuario.nombre,
        rol:         usuario.rol.nombre,
        id_distrito: usuario.id_distrito,
      },
    });

  } catch (err) {
    console.error('Error en login:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /auth/verificar  ← el gateway llama a este endpoint para validar el JWT
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