const test = require('node:test');
const assert = require('node:assert/strict');
const rutaSegura = require('../middleware/rutaSegura');

const ejecutar = (path) => {
  const resultado = { next: false, status: null, body: null };
  const res = {
    status(status) {
      resultado.status = status;
      return this;
    },
    json(body) {
      resultado.body = body;
      return this;
    },
  };
  rutaSegura({ path }, res, () => { resultado.next = true; });
  return resultado;
};

test('rechaza rutas con traversal, separadores ambiguos o bytes codificados', () => {
  for (const path of [
    '/autoridades/../logs',
    '/autoridades//notificaciones',
    '/autoridades%2fnotificaciones',
    '/audiencias/%5cvideo',
    '/audiencias/%00',
  ]) {
    const resultado = ejecutar(path);
    assert.equal(resultado.next, false, path);
    assert.equal(resultado.status, 400, path);
    assert.equal(resultado.body.code, 'RUTA_INVALIDA', path);
  }
});

test('permite rutas normales', () => {
  const resultado = ejecutar('/audiencias/12');
  assert.equal(resultado.next, true);
  assert.equal(resultado.status, null);
});
