const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TIPOS_ACCION = ['ALTA', 'MODIFICACION', 'BAJA', 'LOGIN', 'LOGOUT'];

const LogAuditoria = sequelize.define('LogAuditoria', {
  id_log: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  id_usuario: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },
  tipo_accion: {
    type:      DataTypes.ENUM(...TIPOS_ACCION),
    allowNull: false,
  },
  entidad: {
    type:      DataTypes.STRING(50),
    allowNull: false,
  },
  id_entidad: {
    type:      DataTypes.INTEGER,
    allowNull: true,
  },
  detalle: {
    type:      DataTypes.JSONB,
    allowNull: true,
  },
  request: {
    type:      DataTypes.JSONB,
    allowNull: true,
  },
  fecha_hora: {
    type:      DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  ip_origen: {
    type:      DataTypes.STRING(45),
    allowNull: false,
  },
}, {
  tableName:  'log_auditoria',
  schema:     'sgpa_auditoria',
  timestamps: false,
});

LogAuditoria.TIPOS_ACCION = TIPOS_ACCION;

module.exports = LogAuditoria;
