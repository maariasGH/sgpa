const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const VIDEO_URL_TTL_SECONDS = 15 * 60;

// Rutas que NO requieren autenticación (paths relativos a /api).
// Se comparan con regex exactas: con startsWith, GET /audiencias/stats quedaba público.
const RUTAS_PUBLICAS = [
  { method: 'POST', path: /^\/auth\/login\/?$/ },
  { method: 'GET',  path: /^\/audiencias\/?$/ },          // vista pública del calendario
  { method: 'GET',  path: /^\/audiencias\/tv\/?$/ },      // vista televisor
  { method: 'GET',  path: /^\/audiencias\/\d+\/?$/ },     // detalle de una audiencia
  { method: 'GET',  path: /^\/audiencias\/\d+\/video-url\/?$/ }, // el MS valida si puede emitirse públicamente
  { method: 'GET',  path: /^\/distritos(\/\d+)?\/?$/ },   // desplegables
  { method: 'GET',  path: /^\/salas(\/\d+)?\/?$/ },       // filtro por sala del calendario
];

const esRutaPublica = (method, path) => {
  return RUTAS_PUBLICAS.some(ruta =>
    ruta.method === method && ruta.path.test(path)
  );
};

const esVideoFirmado = (req) => {
  const coincidencia = /^\/audiencias\/(\d+)\/video\/?$/i.exec(req.path);
  const { exp, sig } = req.query;
  const alcance = req.query.scope ?? 'private';
  const key = process.env.INTERNAL_API_KEY;
  if (!coincidencia || !key || typeof exp !== 'string' || !/^\d+$/.test(exp)
    || !['private', 'public'].includes(alcance)
    || typeof sig !== 'string' || !/^[a-f\d]{64}$/i.test(sig)) {
    return false;
  }

  const expiracion = Number(exp);
  const ahora = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiracion) || expiracion <= ahora || expiracion > ahora + VIDEO_URL_TTL_SECONDS) {
    return false;
  }

  const esperado = crypto.createHmac('sha256', key)
    .update(alcance === 'public' ? `public:${coincidencia[1]}:${exp}` : `${coincidencia[1]}:${exp}`)
    .digest();
  const recibido = Buffer.from(sig, 'hex');
  return recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
};

// Los debug tokens saltean la verificación real del JWT, así que solo se aceptan
// con NODE_ENV=development y si son largos (no adivinables). En cualquier otro
// entorno se ignoran aunque estén definidos en el .env.
const LARGO_MINIMO_DEBUG = 32;
const DEBUG_HABILITADO = process.env.NODE_ENV === 'development';

const debugToken = (nombreVariable) => {
  const valor = process.env[nombreVariable];
  if (!DEBUG_HABILITADO || !valor) return null;
  if (valor.length < LARGO_MINIMO_DEBUG) {
    console.warn(`⚠️  ${nombreVariable} ignorado: debe tener al menos ${LARGO_MINIMO_DEBUG} caracteres`);
    return null;
  }
  return valor;
};

const DEBUG_TOKEN    = debugToken('DEBUG_TOKEN');
const DEBUG_TOKEN_OP = debugToken('DEBUG_TOKEN_OP');

// Devuelve el usuario del token, o null si el token no es válido.
const identificar = (token) => {
  // ── Debug token de Administrador (solo en desarrollo) ────────
  if (DEBUG_TOKEN && token === DEBUG_TOKEN) {
    console.warn('⚠️  Usando DEBUG_TOKEN — no usar en producción');
    return {
      id_usuario:  0,
      username:    'debug',
      rol:         'ADMINISTRADOR',  // debug siempre es admin
      id_distrito: null,
      debe_cambiar_password: false,
    };
  }

  // ── Debug token de Operador (solo en desarrollo) ─────────────
  if (DEBUG_TOKEN_OP && token === DEBUG_TOKEN_OP) {
    console.warn('⚠️  Usando DEBUG_TOKEN_OP — no usar en producción');
    return {
      id_usuario:  0,
      username:    'debug_op',
      rol:         'OPERADOR',  // debug_op siempre es operador
      id_distrito: 2,           // 1 = Santa Fe, 2 = Rosario
      debe_cambiar_password: false,
    };
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(datos.id_usuario)
      || typeof datos.username !== 'string'
      || !['ADMINISTRADOR', 'OPERADOR'].includes(datos.rol)
      || (datos.rol === 'OPERADOR' && !Number.isSafeInteger(datos.id_distrito))) {
      return null;
    }
    return {
      id_usuario: datos.id_usuario,
      username: datos.username,
      rol: datos.rol,
      id_distrito: datos.id_distrito,
      debe_cambiar_password: datos.debe_cambiar_password === true,
    };
  } catch {
    return null;
  }
};

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (req.method === 'GET' && esVideoFirmado(req)) return next();

  // Ruta pública: pasa siempre. Si además viene un token válido se identifica
  // al usuario, para que el control por distrito siga aplicando al operador.
  if (esRutaPublica(req.method, req.path)) {
    if (token) {
      try {
        req.usuario = identificar(token) || undefined;
      } catch (err) {
        console.error('Error identificando usuario:', err.message);
      }
    }
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const usuario = identificar(token);
    if (!usuario) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Adjunta los datos del usuario al request para que los microservicios los usen
    req.usuario = usuario;
    next();

  } catch (err) {
    console.error('Error identificando usuario:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = verificarToken;
