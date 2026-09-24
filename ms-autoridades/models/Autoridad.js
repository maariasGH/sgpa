const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CARGOS = ['JUEZ', 'FISCAL'];

const Autoridad = sequelize.define('Autoridad', {
  id_autoridad: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  nombre: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  apellido: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  dni: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  cargo: {
    type:      DataTypes.ENUM(...CARGOS),
    allowNull: false,
  },
  email: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  telefono: {
    type:      DataTypes.STRING(20),
    allowNull: true,
  },
  id_distrito: {
    type:      DataTypes.INTEGER,
    allowNull: false, // referencia lógica a sgpa_distritos.DISTRITO
  },
  estado: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true, // false = baja lógica
  },
}, {
  tableName:  'autoridad',
  schema:     'sgpa_autoridades',
  timestamps: false,
});

Autoridad.CARGOS = CARGOS;

module.exports = Autoridad;
