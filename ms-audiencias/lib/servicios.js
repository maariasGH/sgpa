// Comunicación HTTP con otros microservicios (nunca se consulta otro schema directamente)

const { fetchT } = require('./http');

const MS_SALAS_URL       = process.env.MS_SALAS_URL       || 'http://localhost:3002';
const MS_AUTORIDADES_URL = process.env.MS_AUTORIDADES_URL || 'http://localhost:3003';
const headersInternos    = { 'x-internal-key': process.env.INTERNAL_API_KEY };
const headersSistema     = { ...headersInternos, 'x-usuario-rol': 'SISTEMA' };
const CACHE_MS = 60_000;
const CACHE_MAX_ENTRADAS = 256;
const cache = new Map();
const solicitudes = new Map();

class ServicioNoDisponible extends Error {}

const getJson = async (url, headers = headersInternos) => {
  try {
    const resp = await fetchT(url, { headers });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new ServicioNoDisponible(`${url} respondió ${resp.status}`);
    const body = await resp.json();
    // ms-salas / ms-distritos devuelven el objeto directo; el resto usa { data }
    return body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
  } catch (err) {
    if (err instanceof ServicioNoDisponible) throw err;
    throw new ServicioNoDisponible(`${url}: ${err.message}`);
  }
};

const obtenerSala = (id_sala) => getJson(`${MS_SALAS_URL}/salas/${id_sala}`);

// Todas las salas, o las de un distrito
const obtenerSalas = async (id_distrito) => {
  const query = id_distrito ? `?id_distrito=${encodeURIComponent(id_distrito)}` : '';
  return (await getJson(`${MS_SALAS_URL}/salas${query}`)) || [];
};

const obtenerAutoridad = (id_autoridad) =>
  getJson(`${MS_AUTORIDADES_URL}/autoridades/${id_autoridad}`, headersSistema);

const obtenerAutoridades = async (ids) => {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return [];
  return (await getJson(
    `${MS_AUTORIDADES_URL}/autoridades?ids=${unicos.join(',')}&limit=1000`,
    headersSistema
  )) || [];
};

const cachear = (clave, cargar) => {
  const guardado = cache.get(clave);
  if (guardado && guardado.vence > Date.now()) return Promise.resolve(guardado.valor);
  if (solicitudes.has(clave)) return solicitudes.get(clave);

  const solicitud = (async () => {
    try {
      const valor = await cargar();
      if (!cache.has(clave) && cache.size >= CACHE_MAX_ENTRADAS) {
        cache.delete(cache.keys().next().value);
      }
      cache.set(clave, { valor, vence: Date.now() + CACHE_MS });
      return valor;
    } catch (err) {
      if (guardado) return guardado.valor;
      throw err;
    } finally {
      solicitudes.delete(clave);
    }
  })();
  solicitudes.set(clave, solicitud);
  return solicitud;
};

const obtenerSalasCacheadas = () => cachear('salas:todos', async () =>
  (await obtenerSalas()).map(({ id_sala, nombre, tipo, id_distrito }) => ({
    id_sala,
    nombre,
    tipo,
    id_distrito,
  }))
);

const obtenerAutoridadesCacheadas = (ids) => {
  const unicos = [...new Set(ids)].filter(Boolean).sort((a, b) => a - b);
  if (!unicos.length) return Promise.resolve([]);
  return cachear(`autoridades:${unicos.join(',')}`, async () =>
    (await obtenerAutoridades(unicos)).map(({ id_autoridad, nombre, apellido, cargo }) => ({
      id_autoridad,
      nombre,
      apellido,
      cargo,
    }))
  );
};

// Fire-and-forget: pide a ms-autoridades que envíe un email a cada autoridad
const notificarAutoridades = (ids, asunto, mensaje) => {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return;
  fetchT(`${MS_AUTORIDADES_URL}/autoridades/notificaciones`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headersInternos },
    body:    JSON.stringify({ ids: unicos, asunto, mensaje }),
  }).catch(err => console.error('Error enviando notificaciones:', err.message));
};

module.exports = {
  ServicioNoDisponible,
  obtenerSala,
  obtenerSalas,
  obtenerAutoridad,
  obtenerAutoridades,
  obtenerSalasCacheadas,
  obtenerAutoridadesCacheadas,
  notificarAutoridades,
};
