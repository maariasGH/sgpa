const express = require('express');
const { sequelize } = require('./models');
const audienciasRoutes   = require('./routes/audiencias');
const estadisticasRoutes = require('./routes/estadisticas');

const app = express();

app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────
// /stats va antes que /audiencias para que no lo capture GET /audiencias/:id
app.use('/audiencias/stats', estadisticasRoutes);
app.use('/audiencias', audienciasRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ms-audiencias', schema: 'sgpa_audiencias' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── Errores no controlados (ej: JSON mal formado) ────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 400 ? 'JSON inválido en el cuerpo de la petición' : 'Error interno del servidor',
    code:  status === 400 ? 'DATOS_INVALIDOS' : 'ERROR_INTERNO',
  });
});

module.exports = app;
