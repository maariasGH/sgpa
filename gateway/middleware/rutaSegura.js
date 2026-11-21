const RARO = /(\.\.|\/\.(\/|$)|\/\/|\\|%2e|%2f|%5c|%00)/i;

module.exports = (req, res, next) => {
  if (RARO.test(req.path)) {
    return res.status(400).json({ error: 'Ruta inválida', code: 'RUTA_INVALIDA' });
  }
  next();
};
