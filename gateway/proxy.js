const { Readable } = require('node:stream');
const { headersUsuario } = require('./middleware/audit');
const { MS } = require('./servicios');
const { llamar } = require('./lib/llamadas');

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
        'x-internal-key': process.env.INTERNAL_API_KEY,
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

    const esVideoEnStream = /^\/audiencias\/\d+\/video\/?$/i.test(req.path)
      && (req.method === 'GET' || esMultipart);
    const timeoutMs = esVideoEnStream ? 60 * 60 * 1000 : 5000;
    const nombreServicio = Object.entries(MS).find(([, destino]) => destino === base)?.[0]
      || req.servicio.recurso;
    const opcionesFetch = esMultipart ? { ...options, duplex: 'half' } : options;
    const respuesta = await llamar(
      nombreServicio,
      url,
      opcionesFetch,
      timeoutMs,
      esMultipart ? globalThis.fetch : undefined,
    );
    const tipo = respuesta.headers.get('content-type') || '';

    if (tipo.includes('application/json')) {
      return res.status(respuesta.status).json(await respuesta.json());
    }

    // Respuesta no JSON (archivo): se reenvía como stream, sin cargarla en memoria
    res.status(respuesta.status);
    if (req.method === 'GET' && /^\/audiencias\/\d+\/video\/?$/i.test(req.path)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
    for (const header of HEADERS_ARCHIVO) {
      const valor = respuesta.headers.get(header);
      if (valor) res.setHeader(header, valor);
    }
    const cuerpoRespuesta = typeof respuesta.body.pipe === 'function'
      ? respuesta.body
      : Readable.fromWeb(respuesta.body);
    cuerpoRespuesta.on('error', err => {
      console.error(`Error transmitiendo respuesta de ${base}:`, err.message);
      if (res.headersSent) return res.destroy(err);
      for (const header of HEADERS_ARCHIVO) res.removeHeader(header);
      res.status(503).json({ error: 'Microservicio no disponible', code: 'SERVICIO_NO_DISPONIBLE' });
    });
    // Si el cliente corta (ej: adelanta el video) se corta también la descarga del microservicio
    res.on('close', () => cuerpoRespuesta.destroy());
    cuerpoRespuesta.pipe(res);

  } catch (err) {
    console.error(`Error en proxy hacia ${base}:`, err.message);
    if (res.headersSent) return res.end();
    if (err.code === 'EOPENBREAKER') {
      res.setHeader('Retry-After', '10');
      return res.status(503).json({
        error: 'El servicio está recuperándose; intentá nuevamente en unos segundos',
        code: 'CIRCUITO_ABIERTO',
      });
    }
    return res.status(503).json({ error: 'Microservicio no disponible', code: 'SERVICIO_NO_DISPONIBLE' });
  }
};

module.exports = proxy;
