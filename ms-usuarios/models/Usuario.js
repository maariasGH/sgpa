const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Rol = require('./Rol');

const Usuario = sequelize.define('Usuario', {
  id_usuario: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  username: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    unique:    true,
  },
  password_hash: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  nombre: {
    type:      DataTypes.STRING(200),
    allowNull: false,
  },
  dni: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    unique:    true,
  },
  email: {
    type:      DataTypes.STRING(200),
    allowNull: false,
    unique:    true,
  },
  id_rol: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Rol,
      key:   'id_rol',
    },
  },
  id_distrito: {
    type:      DataTypes.INTEGER,
    allowNull: true, // NULL si es Administrador
  },
  estado: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
  created_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName:   'usuario',
  schema:      'sgpa_usuarios',
  timestamps:  false, // manejamos created_at manualmente
  underscored: true,
});

// Asociación: un usuario pertenece a un rol
Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });

module.exports = Usuario;