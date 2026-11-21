const RUTAS_PERMITIDAS = new Set([
  'POST /auth/cambiar-password',
  'POST /auth/logout',
  'POST /auth/refresh',
]);

const primerAcceso = (req, res, next) => {
  if (!req.usuario?.debe_cambiar_password) return next();

  const ruta = `${req.method} ${req.path.replace(/\/+$/, '') || '/'}`;
  if (RUTAS_PERMITIDAS.has(ruta)) return next();

  return res.status(403).json({
    error: 'Antes de continuar, tenés que cambiar tu contraseña temporal',
    code: 'CAMBIO_PASSWORD_REQUERIDO',
  });
};

module.exports = primerAcceso;
