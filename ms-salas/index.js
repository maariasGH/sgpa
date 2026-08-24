const express = require('express');
const { Sequelize } = require('sequelize');

const app = express();
app.use(express.json());

// ── Configuración desde variables de entorno ─────────────────
const PORT    = process.env.PORT    || 3002;
const SCHEMA  = process.env.DB_SCHEMA || 'sgpa_salas';

const sequelize = new Sequelize({
  dialect:  'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5434,
  username: process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'sgpa',
  schema:   SCHEMA,
  logging:  false,
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', service: 'ms-salas', schema: SCHEMA });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── Arranque ─────────────────────────────────────────────────
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ms-salas corriendo en puerto ${PORT}`);
    console.log(`✅ Conectado a PostgreSQL — schema: ${SCHEMA}`);
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
  }
});
