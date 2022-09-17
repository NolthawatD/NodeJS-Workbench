const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const User = sequelize.define('user', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  email: Sequelize.STRING,
  password: Sequelize.STRING,
  confirmPassword: Sequelize.STRING,
  resetToken: Sequelize.STRING,
  resetTokenExpiration: Sequelize.DATE,
});

module.exports = User;
