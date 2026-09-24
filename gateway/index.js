const express = require('express');
const fetch   = require('node-fetch');
const cors              = require('./middleware/cors');
const verificarToken    = require('./middleware/auth');
const verificarRol      = require('./middleware/roles');
const verificarDistrito = require('./middleware/district');
const auditar           = require('./middleware/audit');
const proxy             = require('./proxy');
const { MS, servicioPara } = require('./servicios');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS (el frontend corre en otro origen) ──────────────────
app.use(cors);

app.use(express.json());

// ── Health checks ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', puerto: PORT });
});

app.get('/health/all', async (req, res) => {
  const resultados = {};
  for (const [nombre, url] of Object.entries(MS)) {
    try {
      const resp = await fetch(`${url}/health`);
      resultados[nombre] = await resp.json();
    } catch (err) {
      resultados[nombre] = { status: 'error', message: err.message };
    }
  }
  res.json(resultados);
});

// ── API: /api/<recurso>/... ──────────────────────────────────
// Orden: resolver microservicio → JWT → rol → distrito → auditoría → proxy
const api = express.Router();

api.use((req, res, next) => {
  req.servicio = servicioPara(req.path);
  if (!req.servicio) return res.status(404).json({ error: 'Ruta no encontrada', code: 'NO_ENCONTRADO' });
  next();
});
api.use(verificarToken);
api.use(verificarRol);
api.use(verificarDistrito);
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
app.listen(PORT, () => {
  console.log(`✅ Gateway corriendo en puerto ${PORT} (API en /api)`);
  console.log(`   Microservicios configurados:`);
  for (const [nombre, url] of Object.entries(MS)) {
    console.log(`   · ${nombre.padEnd(12)} → ${url}`);
  }
});
