const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
 
const Sala = sequelize.define('Sala', {
  id_sala: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  nombre: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  tipo: {
    type:      DataTypes.ENUM('PENAL', 'CIVIL', 'GESELL', 'MULTIPROPOSITO'),
    allowNull: false,
  },
  id_distrito: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  activa: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
}, {
  tableName:  'sala',
  schema:     'sgpa_salas',
  timestamps: false,
});
 
module.exports = Sala;