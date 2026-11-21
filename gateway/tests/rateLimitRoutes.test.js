const assert = require('node:assert/strict');
const express = require('express');
const rateLimit = require('express-rate-limit');
const test = require('node:test');
const { esSubidaVideo, esUrlVideoAudiencia } = require('../middleware/rateLimitRoutes');

test('excluye las rutas de video del límite general por IP', async t => {
  const app = express();
  app.use('/api', rateLimit({
    windowMs: 60_000,
    limit: 1,
    skip: req => esSubidaVideo(req) || esUrlVideoAudiencia(req),
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.put('/api/audiencias/:id/video', (req, res) => res.sendStatus(200));
  app.get('/api/audiencias/:id/video-url', (req, res) => res.sendStatus(200));
  app.get('/api/audiencias/:id', (req, res) => res.sendStatus(200));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  for (let intento = 0; intento < 2; intento++) {
    assert.equal((await fetch(`${base}/audiencias/1/video`, { method: 'PUT' })).status, 200);
    assert.equal((await fetch(`${base}/audiencias/1/video-url`)).status, 200);
  }
  assert.equal((await fetch(`${base}/audiencias/1`)).status, 200);
  assert.equal((await fetch(`${base}/audiencias/2`)).status, 429);
});
