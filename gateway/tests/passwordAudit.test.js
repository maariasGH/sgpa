const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizar } = require('../middleware/audit');

test('no guarda la contraseña temporal ni el token en auditoría', () => {
  const datos = sanitizar({
    password: 'clave-temporal',
    token: 'jwt-de-prueba',
    password_hash: 'hash',
    usuario: { username: 'operador', password: 'clave-temporal' },
  });

  assert.deepEqual(datos, { usuario: { username: 'operador' } });
});
