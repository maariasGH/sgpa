const sequelize = require('../config/database');
const Rol     = require('./Rol');
const Usuario = require('./Usuario');
 
module.exports = { sequelize, Rol, Usuario };