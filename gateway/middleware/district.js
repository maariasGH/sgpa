// Control de acceso por distrito para el OPERADOR.
// - Rechaza escrituras cuyo body indique otro distrito.
// - Fuerza ?id_distrito=<el suyo> en los listados que filtra por distrito.
// - Si el alta no trae id_distrito, completa el suyo.
// Los microservicios además validan la pertenencia de los registros existentes
// (una sala/autoridad/audiencia puntual) con el header x-usuario-distrito.

const ESCRITURA = ['POST', 'PUT', 'PATCH'];

// Listados cuyo filtro de distrito se fuerza para el operador
const LISTADOS_POR_DISTRITO = [
  /^\/salas\/?$/,
  /^\/autoridades\/?$/,
  /^\/audiencias\/stats(\/export)?\/?$/,
];

// Altas donde se completa el distrito si no viene en el body
const ALTAS_CON_DISTRITO = [/^\/salas\/?$/, /^\/autoridades\/?$/];

const verificarDistrito = (req, res, next) => {
  if (!req.usuario || req.usuario.rol !== 'OPERADOR') return next();

  const propio = parseInt(req.usuario.id_distrito);
  if (!propio) {
    return res.status(403).json({ error: 'El operador no tiene un distrito asignado', code: 'SIN_DISTRITO' });
  }

  if (ESCRITURA.includes(req.method)) {
    const indicado = req.body?.id_distrito;
    if (indicado !== undefined && indicado !== null && parseInt(indicado) !== propio) {
      return res.status(403).json({ error: 'No podés operar sobre otro distrito', code: 'DISTRITO_AJENO' });
    }
    if (req.method === 'POST' && ALTAS_CON_DISTRITO.some(r => r.test(req.path))) {
      req.body = { ...(req.body || {}), id_distrito: propio };
    }
  }

  if (req.method === 'GET' && LISTADOS_POR_DISTRITO.some(r => r.test(req.path))) {
    req.queryOverrides = { ...(req.queryOverrides || {}), id_distrito: propio };
  }

  next();
};

module.exports = verificarDistrito;
