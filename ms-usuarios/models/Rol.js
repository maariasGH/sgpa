const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rol = sequelize.define('Rol', {
  id_rol: {
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
  tableName:  'rol',
  schema:     'sgpa_usuarios',
  timestamps: false, // ROL no tiene created_at
});

module.exports = Rol;