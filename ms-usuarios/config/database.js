const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect:  'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'sgpa',
  schema:   process.env.DB_SCHEMA   || 'sgpa_usuarios',
  logging:  false, // cambiar a console.log para ver las queries en desarrollo
});

module.exports = sequelize;