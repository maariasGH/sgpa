// CORS: el frontend (Vite, :5173) corre en otro origen que el gateway (:3000).
// Orígenes permitidos en CORS_ORIGIN, separados por coma.
// En desarrollo además se acepta cualquier origen de la red local (localhost, 192.168.x.x,
// 10.x.x.x, 172.16-31.x.x) para poder abrir el sistema desde un teléfono sin tener que
// escribir la IP de la PC, que el router puede cambiar.

const ORIGENES = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());
const ES_DESARROLLO = (process.env.NODE_ENV || 'development') === 'development';

const RED_LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

const esDeRedLocal = (origen) => {
  try {
    const { protocol, hostname } = new URL(origen);
    return (protocol === 'http:' || protocol === 'https:') && RED_LOCAL.test(hostname);
  } catch {
    return false;
  }
};

const permitido = (origen) => ORIGENES.includes(origen) || (ES_DESARROLLO && esDeRedLocal(origen));

const cors = (req, res, next) => {
  const origen = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origen && permitido(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  }
  // Preflight: responde sin pasar por auth ni proxy
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};

module.exports = cors;
