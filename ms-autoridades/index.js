const app = require('./app');
const { sequelize } = require('./models');
const instalarCicloDeVida = require('../common/lifecycle');

const PORT = process.env.PORT || 3003;

// ── Arranque ─────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ms-autoridades corriendo en puerto ${PORT}`);
    console.log(`✅ Conectado a PostgreSQL — schema: sgpa_autoridades`);
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
    process.exit(1);
  }
});

instalarCicloDeVida(server, {
  nombre: 'ms-autoridades',
  cerrarRecursos: () => sequelize.close(),
});
