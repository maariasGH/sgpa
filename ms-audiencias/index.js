const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3005;

// ── Arranque ─────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ms-audiencias corriendo en puerto ${PORT}`);
    console.log(`✅ Conectado a PostgreSQL — schema: sgpa_audiencias`);
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
    process.exit(1);
  }
});

// La subida de una grabación (video MP4) puede tardar más que el límite por defecto de Node (5 min)
server.requestTimeout = 60 * 60 * 1000;
