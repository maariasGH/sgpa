const express = require('express');
const { sequelize } = require('./models');
const logsRoutes = require('./routes/logs');

const app = express();

app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────
app.use('/logs', logsRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ms-auditoria', schema: 'sgpa_auditoria' });
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
