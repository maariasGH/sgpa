const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const EstadoAudiencia = require('./EstadoAudiencia');

const Audiencia = sequelize.define('Audiencia', {
  id_audiencia: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  cuij: {
    type:      DataTypes.STRING(20),
    allowNull: false,
  },
  caratula: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  tipo_audiencia: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  // Referencias lógicas a otros schemas (validadas vía HTTP)
  id_sala:          { type: DataTypes.INTEGER, allowNull: false },
  id_juez:          { type: DataTypes.INTEGER, allowNull: false },
  id_fiscal:        { type: DataTypes.INTEGER, allowNull: false },
  id_usuario_carga: { type: DataTypes.INTEGER, allowNull: false },
  defensor: {
    type:      DataTypes.STRING(200),
    allowNull: true,
  },
  fecha: {
    type:      DataTypes.DATEONLY,
    allowNull: false,
  },
  hora_inicio: {
    type:      DataTypes.TIME,
    allowNull: false,
  },
  hora_fin: {
    type:      DataTypes.TIME,
    allowNull: false,
  },
  id_estado: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: EstadoAudiencia, key: 'id_estado' },
  },
  motivo_cambio: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  // Los completa la DB (DEFAULT NOW() y trigger trg_audiencia_updated_at)
  created_at: { type: DataTypes.DATE },
  updated_at: { type: DataTypes.DATE },
}, {
  tableName:  'audiencia',
  schema:     'sgpa_audiencias',
  timestamps: false,
});

Audiencia.belongsTo(EstadoAudiencia, { foreignKey: 'id_estado', as: 'estado' });

module.exports = Audiencia;
