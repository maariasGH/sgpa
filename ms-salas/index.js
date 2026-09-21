const express = require('express');
const { sequelize } = require('./models');
const salasRoutes = require('./routes/salas');
 
const app  = express();
const PORT = process.env.PORT || 3002;
 
app.use(express.json());
 
// ── Rutas ─────────────────────────────────────────────────────
app.use('/salas', salasRoutes);
 
// ── Health check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ms-salas', schema: 'sgpa_salas' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});
 
// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ms-salas corriendo en puerto ${PORT}`);
    console.log(`✅ Conectado a PostgreSQL — schema: sgpa_salas`);
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
    process.exit(1);
  }
});