const fetch = require('node-fetch');

const MS_USUARIOS_URL = process.env.MS_USUARIOS_URL || 'http://localhost:3004';

// Rutas que NO requieren autenticación
const RUTAS_PUBLICAS = [
  { method: 'POST', path: '/auth/login' },
  { method: 'GET',  path: '/health' },
  { method: 'GET',  path: '/health/all' },
  { method: 'GET',  path: '/audiencias' },      // vista pública del calendario
  { method: 'GET',  path: '/audiencias/tv' },   // vista televisor
];

const esRutaPublica = (method, path) => {
  return RUTAS_PUBLICAS.some(ruta =>
    ruta.method === method && path.startsWith(ruta.path)
  );
};

const verificarToken = async (req, res, next) => {
  // Si es ruta pública, pasa directo
  if (esRutaPublica(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    // Le pregunta al ms-usuarios si el token es válido
    const resp = await fetch(`${MS_USUARIOS_URL}/auth/verificar`, {
      headers: { authorization: `Bearer ${token}` },
    });

    const data = await resp.json();

    if (!data.valido) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Adjunta los datos del usuario al request para que los microservicios los usen
    req.usuario = data.usuario;
    next();

  } catch (err) {
    console.error('Error verificando token:', err.message);
    return res.status(503).json({ error: 'Servicio de autenticación no disponible' });
  }
};

module.exports = verificarToken;