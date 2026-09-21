const express = require('express');
const { sequelize } = require('./models');
const distritosRoutes = require('./routes/distritos');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────────
app.use('/distritos', distritosRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ms-distritos', schema: 'sgpa_distritos' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ms-distritos corriendo en puerto ${PORT}`);
    console.log(`✅ Conectado a PostgreSQL — schema: sgpa_distritos`);
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
    process.exit(1);
  }
});