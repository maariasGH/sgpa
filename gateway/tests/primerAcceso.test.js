const test = require('node:test');
const assert = require('node:assert/strict');
const primerAcceso = require('../middleware/primerAcceso');

const crearRequest = (method, path) => ({
  method,
  path,
  usuario: { debe_cambiar_password: true },
});

test('bloquea operaciones hasta completar el cambio inicial', () => {
  const req = crearRequest('GET', '/audiencias');
  let status;
  let body;
  const res = {
    status(code) { status = code; return this; },
    json(value) { body = value; return this; },
  };

  primerAcceso(req, res, () => assert.fail('No debe continuar'));

  assert.equal(status, 403);
  assert.equal(body.code, 'CAMBIO_PASSWORD_REQUERIDO');
});

test('permite cambiar la contraseña, refrescar el token o cerrar sesión', () => {
  for (const [method, path] of [
    ['POST', '/auth/cambiar-password'],
    ['POST', '/auth/refresh'],
    ['POST', '/auth/logout'],
  ]) {
    let continuo = false;
    primerAcceso(crearRequest(method, path), {}, () => { continuo = true; });
    assert.equal(continuo, true, `${method} ${path} debe permitirse`);
  }
});

test('no afecta a usuarios que ya cambiaron su contraseña', () => {
  let continuo = false;
  primerAcceso({
    method: 'GET',
    path: '/audiencias',
    usuario: { debe_cambiar_password: false },
  }, {}, () => { continuo = true; });
  assert.equal(continuo, true);
});
