const express = require('express');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');

const app  = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ms-usuarios', schema: 'sgpa_usuarios' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ms-usuarios corriendo en puerto ${PORT}`);
    console.log(`✅ Conectado a PostgreSQL — schema: sgpa_usuarios`);
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
    process.exit(1);
  }
});