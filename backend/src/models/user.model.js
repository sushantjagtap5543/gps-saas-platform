const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('users', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: {
      type: DataTypes.ENUM('ADMIN', 'CLIENT', 'SUBUSER'),
      defaultValue: 'CLIENT'
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  });
};