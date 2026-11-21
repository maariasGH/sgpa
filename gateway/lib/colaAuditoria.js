const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { MS } = require('../servicios');
const { llamar } = require('./llamadas');

const ARCHIVO_POR_DEFECTO = path.join(__dirname, '..', 'data', 'auditoria-pendiente.jsonl');
const INTERVALO_REINTENTO_MS = 30_000;

const enviarLog = async (log) => {
  const respuesta = await llamar('auditoria', `${MS.auditoria}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': process.env.INTERNAL_API_KEY,
    },
    body: JSON.stringify(log),
  }, 3000);
  const detalle = await respuesta.text();
  if (!respuesta.ok) throw new Error(`ms-auditoria respondió ${respuesta.status}: ${detalle}`);
};

const crearColaAuditoria = ({
  archivo = process.env.AUDIT_QUEUE_FILE || ARCHIVO_POR_DEFECTO,
  enviar = enviarLog,
  intervaloMs = INTERVALO_REINTENTO_MS,
} = {}) => {
  let pendientes = [];
  let inicializacion;
  let escritura = Promise.resolve();
  let vaciado = null;
  let temporizador;
  let sucia = false;
  let falloReportado = false;

  const cargar = () => {
    if (!inicializacion) {
      inicializacion = (async () => {
        let contenido;
        try {
          contenido = await fs.readFile(archivo, 'utf8');
        } catch (err) {
          if (err.code === 'ENOENT') return;
          throw err;
        }
        pendientes = contenido.split(/\r?\n/).filter(Boolean).map((linea) => {
          const item = JSON.parse(linea);
          if (!item.id || !item.log || typeof item.log !== 'object') {
            throw new Error(`Entrada inválida en la cola de auditoría: ${archivo}`);
          }
          return item;
        });
      })();
    }
    return inicializacion;
  };

  const persistir = () => {
    const escribir = async () => {
      try {
        await fs.mkdir(path.dirname(archivo), { recursive: true });
        const temporal = `${archivo}.${process.pid}.${randomUUID()}.tmp`;
        const contenido = pendientes.map(item => JSON.stringify(item)).join('\n');
        await fs.writeFile(temporal, contenido ? `${contenido}\n` : '', { mode: 0o600 });
        await fs.rename(temporal, archivo);
        sucia = false;
      } catch (err) {
        sucia = true;
        throw err;
      }
    };
    const siguiente = escritura.then(escribir, escribir);
    escritura = siguiente.catch(() => {});
    return siguiente;
  };

  const vaciar = () => {
    if (vaciado) return vaciado;
    vaciado = (async () => {
      await cargar();
      while (pendientes.length) {
        if (sucia) await persistir();
        try {
          await enviar(pendientes[0].log);
        } catch (err) {
          if (!falloReportado) {
            console.error('No se pudo entregar auditoría; queda persistida para reintento:', err.message);
            falloReportado = true;
          }
          break;
        }

        pendientes.shift();
        sucia = true;
        await persistir();
        falloReportado = false;
      }
    })().finally(() => { vaciado = null; });
    return vaciado;
  };

  const registrarSeguro = async (log) => {
    await cargar();
    pendientes.push({ id: randomUUID(), log });
    sucia = true;
    await persistir();
    vaciar().catch(err => console.error('Error procesando cola de auditoría:', err.message));
  };

  const iniciar = async () => {
    await cargar();
    if (!temporizador) {
      temporizador = setInterval(() => {
        vaciar().catch(err => console.error('Error procesando cola de auditoría:', err.message));
      }, intervaloMs);
      temporizador.unref();
    }
    await vaciar();
  };

  const cerrar = async () => {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
    if (vaciado) await vaciado;
    await escritura;
  };

  return { registrarSeguro, iniciar, cerrar };
};

const colaAuditoria = crearColaAuditoria();

module.exports = {
  ...colaAuditoria,
  crearColaAuditoria,
};
