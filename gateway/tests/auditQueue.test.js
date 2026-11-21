const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { crearColaAuditoria } = require('../lib/colaAuditoria');

test('persiste los logs fallidos y los reenvía después de reiniciar la cola', async t => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'sgpa-auditoria-'));
  const archivo = path.join(directorio, 'pendientes.jsonl');
  t.after(() => fs.rm(directorio, { recursive: true, force: true }));

  let disponible = false;
  const log = { tipo_accion: 'MODIFICACION', entidad: 'AUDIENCIA' };
  const primeraCola = crearColaAuditoria({
    archivo,
    intervaloMs: 60_000,
    enviar: async () => {
      if (!disponible) throw new Error('servicio caído');
    },
  });
  await primeraCola.iniciar();
  await primeraCola.registrarSeguro(log);
  await primeraCola.cerrar();

  const guardado = await fs.readFile(archivo, 'utf8');
  assert.deepEqual(JSON.parse(guardado).log, log);

  disponible = true;
  const enviados = [];
  const segundaCola = crearColaAuditoria({
    archivo,
    intervaloMs: 60_000,
    enviar: async registro => enviados.push(registro),
  });
  await segundaCola.iniciar();
  await segundaCola.cerrar();

  assert.deepEqual(enviados, [log]);
  assert.equal((await fs.readFile(archivo, 'utf8')), '');
});
