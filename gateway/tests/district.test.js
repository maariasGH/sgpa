const test = require('node:test');
const assert = require('node:assert/strict');
const verificarDistrito = require('../middleware/district');

const ejecutar = (req) => {
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
  verificarDistrito(req, res, () => { resultado.next = true; });
  return resultado;
};

test('fuerza el distrito propio en listas de audiencias aunque pidan otro', () => {
  for (const path of ['/audiencias', '/audiencias/tv']) {
    const req = {
      method: 'GET',
      path,
      queryOverrides: { id_distrito: '2' },
      usuario: { rol: 'OPERADOR', id_distrito: 1 },
    };

    const resultado = ejecutar(req);

    assert.equal(resultado.next, true);
    assert.equal(req.queryOverrides.id_distrito, 1);
  }
});

test('rechaza operadores sin distrito asignado', () => {
  const resultado = ejecutar({
    method: 'GET',
    path: '/audiencias',
    usuario: { rol: 'OPERADOR', id_distrito: null },
  });

  assert.equal(resultado.next, false);
  assert.equal(resultado.status, 403);
  assert.equal(resultado.body.code, 'SIN_DISTRITO');
});

test('mantiene público el calendario para solicitudes anónimas', () => {
  const req = { method: 'GET', path: '/audiencias' };

  const resultado = ejecutar(req);

  assert.equal(resultado.next, true);
  assert.equal(req.queryOverrides, undefined);
});
