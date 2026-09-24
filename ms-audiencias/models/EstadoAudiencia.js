const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EstadoAudiencia = sequelize.define('EstadoAudiencia', {
  id_estado: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  nombre: {
    type:      DataTypes.STRING(30),
    allowNull: false,
    unique:    true,
  },
}, {
  tableName:  'estado_audiencia',
  schema:     'sgpa_audiencias',
  timestamps: false,
});

module.exports = EstadoAudiencia;
