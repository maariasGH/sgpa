// Comunicación HTTP con otros microservicios (nunca se consulta otro schema directamente)

const MS_SALAS_URL       = process.env.MS_SALAS_URL       || 'http://localhost:3002';
const MS_AUTORIDADES_URL = process.env.MS_AUTORIDADES_URL || 'http://localhost:3003';

class ServicioNoDisponible extends Error {}

const getJson = async (url) => {
  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    throw new ServicioNoDisponible(`${url}: ${err.message}`);
  }
  if (resp.status === 404) return null;
  if (!resp.ok) throw new ServicioNoDisponible(`${url} respondió ${resp.status}`);
  const body = await resp.json();
  // ms-salas / ms-distritos devuelven el objeto directo; el resto usa { data }
  return body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
};

const obtenerSala = (id_sala) => getJson(`${MS_SALAS_URL}/salas/${id_sala}`);

// Todas las salas, o las de un distrito
const obtenerSalas = async (id_distrito) => {
  const query = id_distrito ? `?id_distrito=${encodeURIComponent(id_distrito)}` : '';
  return (await getJson(`${MS_SALAS_URL}/salas${query}`)) || [];
};

const obtenerAutoridad = (id_autoridad) => getJson(`${MS_AUTORIDADES_URL}/autoridades/${id_autoridad}`);

const obtenerAutoridades = async (ids) => {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return [];
  return (await getJson(`${MS_AUTORIDADES_URL}/autoridades?ids=${unicos.join(',')}&limit=1000`)) || [];
};

// Fire-and-forget: pide a ms-autoridades que envíe un email a cada autoridad
const notificarAutoridades = (ids, asunto, mensaje) => {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return;
  fetch(`${MS_AUTORIDADES_URL}/autoridades/notificaciones`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ids: unicos, asunto, mensaje }),
  }).catch(err => console.error('Error enviando notificaciones:', err.message));
};

module.exports = {
  ServicioNoDisponible,
  obtenerSala,
  obtenerSalas,
  obtenerAutoridad,
  obtenerAutoridades,
  notificarAutoridades,
};
