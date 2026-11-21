const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.INTERNAL_API_KEY = 'test-internal-key-with-at-least-32-characters';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
const verificarToken = require('../middleware/auth');

const crearRequest = (id, exp, sig, scope) => ({
  method: 'GET',
  path: `/audiencias/${id}/video`,
  query: { exp: String(exp), sig, ...(scope && { scope }) },
  headers: {},
});

const firmar = (id, exp, scope = 'private') => crypto.createHmac('sha256', process.env.INTERNAL_API_KEY)
  .update(scope === 'public' ? `public:${id}:${exp}` : `${id}:${exp}`)
  .digest('hex');

test('acepta video con firma vigente sin exponer la ruta como pública', async () => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const req = crearRequest(42, exp, firmar(42, exp));
  let continuo = false;

  await verificarToken(req, {}, () => { continuo = true; });

  assert.equal(continuo, true);
});

test('rechaza video sin token cuando la firma no corresponde', async () => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const req = crearRequest(42, exp, firmar(43, exp));
  let status;
  let body;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  await verificarToken(req, res, () => assert.fail('No debe continuar'));

  assert.equal(status, 401);
  assert.equal(body.error, 'Token no proporcionado');
});

test('acepta una URL de video firmada para reproducción pública', async () => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const req = crearRequest(42, exp, firmar(42, exp, 'public'), 'public');
  let continuo = false;

  await verificarToken(req, {}, () => { continuo = true; });

  assert.equal(continuo, true);
});

test('permite solicitar la URL pública; el microservicio valida la visibilidad', async () => {
  const req = {
    method: 'GET',
    path: '/audiencias/42/video-url',
    query: {},
    headers: {},
  };
  let continuo = false;

  await verificarToken(req, {}, () => { continuo = true; });

  assert.equal(continuo, true);
});

test('verifica el JWT localmente aunque ms-usuarios no esté disponible', async () => {
  const usuario = {
    id_usuario: 7,
    username: 'operador',
    rol: 'OPERADOR',
    id_distrito: 2,
  };
  const token = jwt.sign(usuario, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1m',
  });
  const req = {
    method: 'GET',
    path: '/usuarios',
    query: {},
    headers: { authorization: `Bearer ${token}` },
  };
  let continuo = false;

  await verificarToken(req, {}, () => { continuo = true; });

  assert.equal(continuo, true);
  assert.deepEqual(req.usuario, { ...usuario, debe_cambiar_password: false });
});

test('rechaza tokens firmados con un algoritmo no permitido', async () => {
  const token = jwt.sign({
    id_usuario: 7,
    username: 'operador',
    rol: 'OPERADOR',
    id_distrito: 2,
  }, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '1m' });
  const req = {
    method: 'GET',
    path: '/usuarios',
    query: {},
    headers: { authorization: `Bearer ${token}` },
  };
  let status;
  const res = {
    status(code) { status = code; return this; },
    json() { return this; },
  };

  await verificarToken(req, res, () => assert.fail('No debe continuar'));

  assert.equal(status, 401);
});
