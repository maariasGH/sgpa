const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const test = require('node:test');
const proxy = require('../proxy');

test('reenvía por streaming cargas multipart grandes al microservicio', async t => {
  process.env.INTERNAL_API_KEY = 'test-internal-key-with-at-least-32-characters';

  const upstream = http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(206, {
        'content-type': 'video/mp4',
        'content-range': 'bytes 0-7/8',
        'content-length': 8,
      });
      return res.end(Buffer.from('0000ftyp'));
    }

    let bytes = 0;
    req.on('data', chunk => { bytes += chunk.length; });
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ bytes }));
    });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => upstream.close(resolve)));

  const app = express();
  app.put('/audiencias/:id/video', (req, res) => {
    req.servicio = { base: `http://127.0.0.1:${upstream.address().port}` };
    req.usuario = { id_usuario: 1, rol: 'ADMINISTRADOR', id_distrito: 1 };
    proxy(req, res);
  });
  app.get('/audiencias/:id/video', (req, res) => {
    req.servicio = { base: `http://127.0.0.1:${upstream.address().port}` };
    req.usuario = { id_usuario: 1, rol: 'ADMINISTRADOR', id_distrito: 1 };
    proxy(req, res);
  });
  const gateway = app.listen(0, '127.0.0.1');
  await new Promise(resolve => gateway.once('listening', resolve));
  t.after(() => new Promise(resolve => gateway.close(resolve)));

  const body = Buffer.alloc(10 * 1024 * 1024);
  const response = await new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port: gateway.address().port,
      path: '/audiencias/1/video',
      method: 'PUT',
      headers: {
        'content-type': 'multipart/form-data; boundary=probe',
        'content-length': body.length,
      },
    }, incoming => {
      let data = '';
      incoming.setEncoding('utf8');
      incoming.on('data', chunk => { data += chunk; });
      incoming.on('end', () => resolve({ status: incoming.statusCode, data }));
    });
    request.setTimeout(30_000, () => request.destroy(new Error('La carga de prueba agotó el tiempo')));
    request.on('error', reject);
    request.end(body);
  });

  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.data).bytes, body.length);

  const video = await fetch(`http://127.0.0.1:${gateway.address().port}/audiencias/1/video`, {
    headers: { range: 'bytes=0-7' },
  });
  assert.equal(video.status, 206);
  assert.equal(video.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal((await video.arrayBuffer()).byteLength, 8);
});

test('responde 503 con Retry-After cuando el circuito del microservicio está abierto', async t => {
  const upstream = http.createServer(req => req.socket.destroy());
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => upstream.close(resolve)));

  const app = express();
  app.get('/probe', (req, res) => {
    req.servicio = { base: `http://127.0.0.1:${upstream.address().port}`, recurso: 'probe' };
    proxy(req, res);
  });
  const gateway = app.listen(0, '127.0.0.1');
  await new Promise(resolve => gateway.once('listening', resolve));
  t.after(() => new Promise(resolve => gateway.close(resolve)));

  const url = `http://127.0.0.1:${gateway.address().port}/probe`;
  for (let intento = 0; intento < 5; intento += 1) {
    assert.equal((await fetch(url)).status, 503);
  }

  const respuesta = await fetch(url);
  assert.equal(respuesta.status, 503);
  assert.equal(respuesta.headers.get('retry-after'), '10');
  assert.equal((await respuesta.json()).code, 'CIRCUITO_ABIERTO');
});
