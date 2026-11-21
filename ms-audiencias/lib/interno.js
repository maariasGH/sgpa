const crypto = require('crypto');
const KEY = process.env.INTERNAL_API_KEY;
if (!KEY || KEY.length < 32) { console.error('INTERNAL_API_KEY ausente o corta'); process.exit(1); }

const igual = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
module.exports = (req, res, next) => {
  if (req.path === '/health') return next();
  const k = req.headers['x-internal-key'];
  if (typeof k !== 'string' || !igual(k, KEY)) {
    return res.status(401).json({ error: 'No autorizado', code: 'NO_AUTORIZADO' });
  }
  next();
};