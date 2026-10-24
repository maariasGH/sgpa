const fetch = require('node-fetch');
const { headersUsuario } = require('./middleware/audit');

// Headers de la respuesta de un archivo que se reenvían al cliente.
// content-range / accept-ranges permiten adelantar un video sin descargarlo entero.
const HEADERS_ARCHIVO = [
  'content-type', 'content-disposition', 'content-length', 'content-range',
  'accept-ranges', 'last-modified', 'etag', 'cache-control',
];

// Reenvía el request al microservicio de req.servicio (resuelto en index.js).
// Conserva el query string (aplicando req.queryOverrides del control de distrito)
// y soporta respuestas JSON y binarias (ej: exportación Excel, video).
const proxy = async (req, res) => {
  const { base } = req.servicio;

  try {
    const params = new URLSearchParams(req.originalUrl.split('?')[1] || '');
    for (const [clave, valor] of Object.entries(req.queryOverrides || {})) {
      params.set(clave, String(valor));
    }
    const query = params.toString();
    const url   = `${base}${req.path}${query ? `?${query}` : ''}`;

    // Subida de archivos: el body no lo parsea express.json, se reenvía como stream
    const esMultipart = req.is('multipart/form-data');

    const options = {
      method:  req.method,
      headers: {
        'Content-Type': esMultipart ? req.headers['content-type'] : 'application/json',
        ...(esMultipart && req.headers['content-length'] && { 'Content-Length': req.headers['content-length'] }),
        // Pedidos parciales del reproductor de video
        ...(req.headers.range && { range: req.headers.range }),
        // /auth/refresh y /auth/logout necesitan el token original
        ...(req.headers.authorization && { authorization: req.headers.authorization }),
        // Pasa los datos del usuario autenticado al microservicio
        ...(req.usuario && headersUsuario(req.usuario)),
      },
    };

    // Adjunta el body si hay uno (POST, PUT, PATCH)
    if (esMultipart) {
      options.body = req;
    } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body ?? {});
    }

    const respuesta = await fetch(url, options);
    const tipo = respuesta.headers.get('content-type') || '';

    if (tipo.includes('application/json')) {
      return res.status(respuesta.status).json(await respuesta.json());
    }

    // Respuesta no JSON (archivo): se reenvía como stream, sin cargarla en memoria
    res.status(respuesta.status);
    for (const header of HEADERS_ARCHIVO) {
      const valor = respuesta.headers.get(header);
      if (valor) res.setHeader(header, valor);
    }
    // Si el cliente corta (ej: adelanta el video) se corta también la descarga del microservicio
    res.on('close', () => respuesta.body.destroy());
    respuesta.body.pipe(res);

  } catch (err) {
    console.error(`Error en proxy hacia ${base}:`, err.message);
    if (res.headersSent) return res.end();
    return res.status(503).json({ error: 'Microservicio no disponible', code: 'SERVICIO_NO_DISPONIBLE' });
  }
};

module.exports = proxy;
