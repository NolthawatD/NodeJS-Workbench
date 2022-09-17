const Sequelize = require('sequelize');

const sequelize = new Sequelize('node-s15-authentication', 'root', '123456', {
  dialect: 'mysql',
  host: 'localhost',
});

module.exports = sequelize;
