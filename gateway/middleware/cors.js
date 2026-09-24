// CORS: el frontend (Vite, :5173) corre en otro origen que el gateway (:3000).
// Orígenes permitidos en CORS_ORIGIN, separados por coma.

const ORIGENES = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

const cors = (req, res, next) => {
  const origen = req.headers.origin;
  if (origen && ORIGENES.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  }
  // Preflight: responde sin pasar por auth ni proxy
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};

module.exports = cors;
