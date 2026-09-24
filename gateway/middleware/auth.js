const fetch = require('node-fetch');

const MS_USUARIOS_URL = process.env.MS_USUARIOS_URL || 'http://localhost:3004';

// Rutas que NO requieren autenticación (paths relativos a /api).
// Se comparan con regex exactas: con startsWith, GET /audiencias/stats quedaba público.
const RUTAS_PUBLICAS = [
  { method: 'POST', path: /^\/auth\/login\/?$/ },
  { method: 'GET',  path: /^\/audiencias\/?$/ },          // vista pública del calendario
  { method: 'GET',  path: /^\/audiencias\/tv\/?$/ },      // vista televisor
  { method: 'GET',  path: /^\/audiencias\/\d+\/?$/ },     // detalle de una audiencia
  { method: 'GET',  path: /^\/distritos(\/\d+)?\/?$/ },   // desplegables
];

const esRutaPublica = (method, path) => {
  return RUTAS_PUBLICAS.some(ruta =>
    ruta.method === method && ruta.path.test(path)
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

  // ── Debug token (solo en desarrollo) ─────────────────────────
  // Seteá DEBUG_TOKEN en el .env para saltear la verificación real
  // Ejemplo: DEBUG_TOKEN=debug123
  const DEBUG_TOKEN = process.env.DEBUG_TOKEN;
  if (DEBUG_TOKEN && token === DEBUG_TOKEN) {
    req.usuario = {
      id_usuario:  0,
      username:    'debug',
      rol:         'ADMINISTRADOR',  // debug siempre es admin
      id_distrito: null,
    };
    console.warn('⚠️  Usando DEBUG_TOKEN — no usar en producción');
    return next();
  }

  // ── Debug token de Operador (solo en desarrollo) ─────────────────────────
  const DEBUG_TOKEN_OP = process.env.DEBUG_TOKEN_OP;
  if (DEBUG_TOKEN_OP && token === DEBUG_TOKEN_OP) {
    req.usuario = {
      id_usuario:  0,
      username:    'debug_op',
      rol:         'OPERADOR',  // debug_op siempre es operador
      id_distrito: 2,           // 1 = Santa Fe, 2 = Rosario
    };
    console.warn('⚠️  Usando DEBUG_TOKEN_OP — no usar en producción');
    return next();
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