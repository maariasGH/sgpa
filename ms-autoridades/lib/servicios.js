// Comunicación HTTP con otros microservicios (nunca se consulta otro schema directamente)

const MS_DISTRITOS_URL  = process.env.MS_DISTRITOS_URL  || 'http://localhost:3001';
const MS_AUDIENCIAS_URL = process.env.MS_AUDIENCIAS_URL || 'http://localhost:3005';
const ZONA_HORARIA      = process.env.APP_TIMEZONE      || 'America/Argentina/Buenos_Aires';

// Fecha de hoy (YYYY-MM-DD) en la zona horaria del Poder Judicial
const hoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());

// Devuelve true si el distrito existe y está activo
const verificarDistrito = async (id_distrito) => {
  const resp = await fetch(`${MS_DISTRITOS_URL}/distritos/${id_distrito}`);
  if (resp.status === 404) return false;
  if (!resp.ok) throw new Error(`ms-distritos respondió ${resp.status}`);
  const body = await resp.json();
  const distrito = body.data ?? body;
  return distrito.activo === true;
};

// Cantidad de audiencias activas (no CANCELADA/SUSPENDIDA) con fecha >= hoy
// en las que interviene la autoridad (como juez o como fiscal)
const contarAudienciasFuturas = async (id_autoridad) => {
  const params = new URLSearchParams({
    id_autoridad: String(id_autoridad),
    desde:        hoy(),
    activas:      'true',
    limit:        '1',
  });
  const resp = await fetch(`${MS_AUDIENCIAS_URL}/audiencias?${params}`);
  if (!resp.ok) throw new Error(`ms-audiencias respondió ${resp.status}`);
  const body = await resp.json();
  return body.total ?? 0;
};

module.exports = { verificarDistrito, contarAudienciasFuturas };
