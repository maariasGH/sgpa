const sequelize       = require('../config/database');
const EstadoAudiencia = require('./EstadoAudiencia');
const Audiencia       = require('./Audiencia');

module.exports = { sequelize, EstadoAudiencia, Audiencia };
