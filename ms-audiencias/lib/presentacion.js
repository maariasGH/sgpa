const { obtenerSalas, obtenerAutoridades } = require('./servicios');

// Datos públicos de una autoridad (sin DNI, email ni teléfono)
const resumenAutoridad = (a) => a && {
  id_autoridad: a.id_autoridad,
  nombre:       a.nombre,
  apellido:     a.apellido,
  cargo:        a.cargo,
};

const resumenSala = (s) => s && {
  id_sala:     s.id_sala,
  nombre:      s.nombre,
  tipo:        s.tipo,
  id_distrito: s.id_distrito,
};

// Agrega nombre de estado, sala, juez y fiscal a cada audiencia.
// Si algún microservicio no responde, esos campos quedan en null (no rompe el calendario).
const enriquecer = async (audiencias) => {
  const lista = audiencias.map(a => (typeof a.toJSON === 'function' ? a.toJSON() : a));
  if (!lista.length) return [];

  const [salas, autoridades] = await Promise.all([
    obtenerSalas().catch(err => {
      console.error('No se pudieron obtener salas:', err.message);
      return [];
    }),
    obtenerAutoridades(lista.flatMap(a => [a.id_juez, a.id_fiscal])).catch(err => {
      console.error('No se pudieron obtener autoridades:', err.message);
      return [];
    }),
  ]);

  const salaPorId      = new Map(salas.map(s => [s.id_sala, s]));
  const autoridadPorId = new Map(autoridades.map(a => [a.id_autoridad, a]));

  return lista.map(a => ({
    ...a,
    estado: a.estado?.nombre ?? a.estado ?? null,
    sala:   resumenSala(salaPorId.get(a.id_sala))              ?? null,
    juez:   resumenAutoridad(autoridadPorId.get(a.id_juez))    ?? null,
    fiscal: resumenAutoridad(autoridadPorId.get(a.id_fiscal))  ?? null,
  }));
};

module.exports = { enriquecer };
