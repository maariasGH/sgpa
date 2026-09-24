const fetch = require('node-fetch');
const { headersUsuario } = require('./middleware/audit');

// Reenvía el request al microservicio de req.servicio (resuelto en index.js).
// Conserva el query string (aplicando req.queryOverrides del control de distrito)
// y soporta respuestas JSON y binarias (ej: exportación Excel).
const proxy = async (req, res) => {
  const { base } = req.servicio;

  try {
    const params = new URLSearchParams(req.originalUrl.split('?')[1] || '');
    for (const [clave, valor] of Object.entries(req.queryOverrides || {})) {
      params.set(clave, String(valor));
    }
    const query = params.toString();
    const url   = `${base}${req.path}${query ? `?${query}` : ''}`;

    const options = {
      method:  req.method,
      headers: {
        'Content-Type': 'application/json',
        // /auth/refresh y /auth/logout necesitan el token original
        ...(req.headers.authorization && { authorization: req.headers.authorization }),
        // Pasa los datos del usuario autenticado al microservicio
        ...(req.usuario && headersUsuario(req.usuario)),
      },
    };

    // Adjunta el body si hay uno (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body ?? {});
    }

    const respuesta = await fetch(url, options);
    const tipo = respuesta.headers.get('content-type') || '';

    if (tipo.includes('application/json')) {
      return res.status(respuesta.status).json(await respuesta.json());
    }

    // Respuesta no JSON (archivo): se reenvía tal cual
    res.status(respuesta.status);
    for (const header of ['content-type', 'content-disposition']) {
      const valor = respuesta.headers.get(header);
      if (valor) res.setHeader(header, valor);
    }
    return res.send(await respuesta.buffer());

  } catch (err) {
    console.error(`Error en proxy hacia ${base}:`, err.message);
    return res.status(503).json({ error: 'Microservicio no disponible', code: 'SERVICIO_NO_DISPONIBLE' });
  }
};

module.exports = proxy;
