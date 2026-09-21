const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');

const router = express.Router();

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

    // Generar JWT
    const payload = {
      id_usuario:  usuario.id_usuario,
      username:    usuario.username,
      rol:         usuario.rol.nombre,      // 'ADMINISTRADOR' o 'OPERADOR'
      id_distrito: usuario.id_distrito,     // null si es admin
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '5m',
    });

    return res.status(200).json({
      token,
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
router.get('/verificar', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

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

module.exports = router;