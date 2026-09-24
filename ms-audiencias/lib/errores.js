const { ServicioNoDisponible } = require('./servicios');

// Error de negocio con status HTTP; se traduce a respuesta en manejarError()
class ErrorHttp extends Error {
  constructor(status, code, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.code   = code;
    this.extra  = extra;
  }
}

const manejarError = (res, contexto, err) => {
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ error: err.message, code: err.code, ...err.extra });
  }
  if (err instanceof ServicioNoDisponible) {
    console.error(`Servicio no disponible al ${contexto}:`, err.message);
    return res.status(503).json({ error: 'Un servicio necesario no está disponible, intentá más tarde', code: 'SERVICIO_NO_DISPONIBLE' });
  }
  if (err.name === 'SequelizeDatabaseError' && err.parent?.code === '23514') {
    // Violación de CHECK en la DB (horario / formato CUIJ)
    return res.status(400).json({ error: 'Los datos no cumplen las restricciones de la audiencia', code: 'DATOS_INVALIDOS' });
  }
  console.error(`Error al ${contexto}:`, err.message);
  return res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
};

module.exports = { ErrorHttp, manejarError };
