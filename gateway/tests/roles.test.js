const test = require('node:test');
const assert = require('node:assert/strict');
const verificarRol = require('../middleware/roles');

test('oculta las rutas de notificaciones sin distinguir mayúsculas', () => {
  for (const path of [
    '/autoridades/notificaciones',
    '/autoridades/Notificaciones/email',
    '/AUTORIDADES/notificaciones/email',
  ]) {
    let status;
    let next = false;
    const res = {
      status(value) { status = value; return this; },
      json() { return this; },
    };

    verificarRol({ method: 'POST', path }, res, () => { next = true; });

    assert.equal(next, false, path);
    assert.equal(status, 404, path);
  }
});
