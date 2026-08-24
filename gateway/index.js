const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// URLs de los microservicios (vienen del docker-compose)
const MS = {
  distritos:   process.env.MS_DISTRITOS_URL   || 'http://localhost:3001',
  salas:       process.env.MS_SALAS_URL       || 'http://localhost:3002',
  autoridades: process.env.MS_AUTORIDADES_URL || 'http://localhost:3003',
  usuarios:    process.env.MS_USUARIOS_URL    || 'http://localhost:3004',
  audiencias:  process.env.MS_AUDIENCIAS_URL  || 'http://localhost:3005',
  auditoria:   process.env.MS_AUDITORIA_URL   || 'http://localhost:3006',
};

// ── Health check del gateway ──────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', puerto: PORT });
});

// ── Health check de todos los microservicios ──────────────────
app.get('/health/all', async (req, res) => {
  const resultados = {};

  for (const [nombre, url] of Object.entries(MS)) {
    try {
      const resp = await fetch(`${url}/health`);
      const data = await resp.json();
      resultados[nombre] = data;
    } catch (err) {
      resultados[nombre] = { status: 'error', message: err.message };
    }
  }

  res.json(resultados);
});

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Gateway corriendo en puerto ${PORT}`);
  console.log(`   Microservicios configurados:`);
  for (const [nombre, url] of Object.entries(MS)) {
    console.log(`   · ${nombre.padEnd(12)} → ${url}`);
  }
});
