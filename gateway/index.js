const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors              = require('./middleware/cors');
const verificarToken    = require('./middleware/auth');
const primerAcceso      = require('./middleware/primerAcceso');
const verificarRol      = require('./middleware/roles');
const verificarDistrito = require('./middleware/district');
const rutaSegura        = require('./middleware/rutaSegura');
const auditar           = require('./middleware/audit');
const proxy             = require('./proxy');
const { esSubidaVideo, esUrlVideoAudiencia } = require('./middleware/rateLimitRoutes');
const { MS, servicioPara } = require('./servicios');
const { fetchT } = require('./lib/http');
const colaAuditoria = require('./lib/colaAuditoria');
const instalarCicloDeVida = require('../common/lifecycle');

const app  = express();
const PORT = process.env.PORT || 3000;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

app.disable('x-powered-by');

if (!INTERNAL_API_KEY || INTERNAL_API_KEY.length < 32) {
  console.error('INTERNAL_API_KEY ausente o corta');
  process.exit(1);
}

// ── CORS (el frontend corre en otro origen) ──────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors);

app.use('/api', rateLimit({
  windowMs: 60_000,
  limit: 1200,
  // Videos tienen límites por usuario, no comparten la cuota general por IP.
  skip: req => esSubidaVideo(req) || esUrlVideoAudiencia(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Demasiadas solicitudes, intentá nuevamente más tarde',
    code: 'LIMITE_DE_SOLICITUDES',
  }),
}));

const limiteSubidasVideo = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: req => String(req.usuario.id_usuario),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Se alcanzó el límite de subidas de video, intentá nuevamente más tarde',
    code: 'LIMITE_DE_SUBIDAS',
  }),
});

const limiteUrlVideo = rateLimit({
  windowMs: 60_000,
  limit: 300,
  keyGenerator: req => String(req.usuario.id_usuario),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Se alcanzó el límite de solicitudes de video, intentá nuevamente en un minuto',
    code: 'LIMITE_URL_VIDEO',
  }),
});

const limiteUrlVideoPublica = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Se alcanzó el límite de solicitudes públicas de video, intentá nuevamente en un minuto',
    code: 'LIMITE_URL_VIDEO_PUBLICA',
  }),
});

app.post('/api/auth/login', rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Demasiados intentos de inicio de sesión, intentá nuevamente más tarde',
    code: 'LIMITE_DE_LOGIN',
  }),
}));

app.use(express.json());

// ── Health checks ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', puerto: PORT });
});

app.get('/health/all', async (req, res) => {
  const servicios = await Promise.all(Object.entries(MS).map(async ([nombre, url]) => {
    try {
      const resp = await fetchT(`${url}/health`, {
        headers: { 'x-internal-key': INTERNAL_API_KEY },
      }, 3000);
      if (!resp.ok) return [nombre, { status: 'error', http_status: resp.status }];
      return [nombre, await resp.json()];
    } catch (err) {
      return [nombre, { status: 'error', message: err.message }];
    }
  }));
  res.json(Object.fromEntries(servicios));
});

// ── API: /api/<recurso>/... ──────────────────────────────────
// Orden: ruta segura → servicio → JWT → rol/distrito → límites específicos → auditoría → proxy
const api = express.Router();

api.use(rutaSegura);
api.use((req, res, next) => {
  req.servicio = servicioPara(req.path);
  if (!req.servicio) return res.status(404).json({ error: 'Ruta no encontrada', code: 'NO_ENCONTRADO' });
  next();
});
api.use(verificarToken);
api.use(primerAcceso);
api.use(verificarRol);
api.use(verificarDistrito);
api.use((req, res, next) => {
  if (esSubidaVideo(req)) return limiteSubidasVideo(req, res, next);
  if (esUrlVideoAudiencia(req)) {
    return req.usuario
      ? limiteUrlVideo(req, res, next)
      : limiteUrlVideoPublica(req, res, next);
  }
  next();
});
api.use(auditar);
api.use(proxy);

app.use('/api', api);

// ── 404 y errores (ej: JSON mal formado) ─────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', code: 'NO_ENCONTRADO' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('Error no controlado:', err.message);
  res.status(status).json({
    error: status === 400 ? 'JSON inválido en el cuerpo de la petición' : 'Error interno del servidor',
    code:  status === 400 ? 'DATOS_INVALIDOS' : 'ERROR_INTERNO',
  });
});

// ── Arranque ─────────────────────────────────────────────────
const iniciarServidor = async () => {
  await colaAuditoria.iniciar();
  const server = app.listen(PORT, () => {
    console.log(`✅ Gateway corriendo en puerto ${PORT} (API en /api)`);
    console.log('   Microservicios configurados:');
    for (const [nombre, url] of Object.entries(MS)) {
      console.log(`   · ${nombre.padEnd(12)} → ${url}`);
    }
  });

  // Las subidas de grabaciones pueden tardar más que el límite por defecto de Node.
  server.requestTimeout = 60 * 60 * 1000;
  instalarCicloDeVida(server, {
    nombre: 'gateway',
    cerrarRecursos: () => colaAuditoria.cerrar(),
    tiempoCierreMs: 30_000,
  });
};

iniciarServidor().catch(err => {
  console.error('No se pudo iniciar el gateway:', err.stack || err);
  process.exit(1);
});
