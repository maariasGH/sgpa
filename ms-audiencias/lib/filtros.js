const { Op } = require('sequelize');
const v = require('./validaciones');
const { ErrorHttp } = require('./errores');
const { obtenerSalas } = require('./servicios');
const { ESTADOS_INACTIVOS, idsDe } = require('./estados');

// Arma el where de Sequelize a partir de los filtros de la query del calendario
const construirFiltros = async (query) => {
  const where = {};

  if (query.fecha) {
    if (!v.esFechaValida(query.fecha)) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'fecha debe tener formato YYYY-MM-DD');
    where.fecha = query.fecha;
  } else if (query.desde || query.hasta) {
    if ((query.desde && !v.esFechaValida(query.desde)) || (query.hasta && !v.esFechaValida(query.hasta))) {
      throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'desde / hasta deben tener formato YYYY-MM-DD');
    }
    where.fecha = {};
    if (query.desde) where.fecha[Op.gte] = query.desde;
    if (query.hasta) where.fecha[Op.lte] = query.hasta;
  }

  const id_sala = query.id_sala ?? query.sala;
  if (id_sala)         where.id_sala   = parseInt(id_sala);
  if (query.id_juez)   where.id_juez   = parseInt(query.id_juez);
  if (query.id_fiscal) where.id_fiscal = parseInt(query.id_fiscal);
  if (query.id_autoridad) {
    const id = parseInt(query.id_autoridad);
    where[Op.or] = [{ id_juez: id }, { id_fiscal: id }];
  }
  if (query.tipo) where.tipo_audiencia = { [Op.iLike]: `%${query.tipo}%` };
  if (query.cuij) where.cuij = { [Op.like]: `%${v.normalizarCuij(query.cuij)}%` };

  if (query.estado) {
    const nombres = String(query.estado).toUpperCase().split(',');
    const ids = await idsDe(nombres);
    if (ids.length !== nombres.length) throw new ErrorHttp(400, 'DATOS_INVALIDOS', 'estado inválido');
    where.id_estado = { [Op.in]: ids };
  } else if (query.activas === 'true') {
    where.id_estado = { [Op.notIn]: await idsDe(ESTADOS_INACTIVOS) };
  }

  // Filtro por distrito: la audiencia no guarda el distrito, se resuelve vía sus salas
  if (query.id_distrito) {
    const salas = await obtenerSalas(query.id_distrito);
    const idsSalas = salas.map(s => s.id_sala);
    where.id_sala = where.id_sala
      ? (idsSalas.includes(where.id_sala) ? where.id_sala : -1)
      : { [Op.in]: idsSalas.length ? idsSalas : [-1] };
  }

  return where;
};

module.exports = { construirFiltros };
