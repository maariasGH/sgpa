const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Distrito = sequelize.define('Distrito', {
  id_distrito: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  nombre: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  activo: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
}, {
  tableName:  'distrito',
  schema:     'sgpa_distritos',
  timestamps: false,
});

module.exports = Distrito;