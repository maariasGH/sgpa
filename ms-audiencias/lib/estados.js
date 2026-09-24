const { EstadoAudiencia } = require('../models');

// Estados que NO participan en la validación de superposición ni en la vista TV
const ESTADOS_INACTIVOS = ['CANCELADA', 'SUSPENDIDA'];
// Estados desde los que ya no se puede modificar la audiencia
const ESTADOS_FINALES   = ['REALIZADA', 'CANCELADA', 'SUSPENDIDA'];
// Estados que requieren motivo_cambio
const ESTADOS_CON_MOTIVO = ['CANCELADA', 'SUSPENDIDA'];

// El catálogo ESTADO_AUDIENCIA es fijo (seed), se cachea al primer uso
let cache = null;

const cargarEstados = async () => {
  if (!cache) {
    const filas = await EstadoAudiencia.findAll();
    cache = {
      porNombre: Object.fromEntries(filas.map(e => [e.nombre, e.id_estado])),
      porId:     Object.fromEntries(filas.map(e => [e.id_estado, e.nombre])),
    };
  }
  return cache;
};

const idEstado = async (nombre) => (await cargarEstados()).porNombre[nombre];

const idsDe = async (nombres) => {
  const { porNombre } = await cargarEstados();
  return nombres.map(n => porNombre[n]).filter(Boolean);
};

module.exports = {
  ESTADOS_INACTIVOS,
  ESTADOS_FINALES,
  ESTADOS_CON_MOTIVO,
  cargarEstados,
  idEstado,
  idsDe,
};
