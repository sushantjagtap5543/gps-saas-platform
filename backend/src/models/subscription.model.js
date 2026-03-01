const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('subscriptions', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    client_name: DataTypes.STRING,
    end_date: DataTypes.DATE,
    status: { type: DataTypes.STRING, defaultValue: 'ACTIVE' }
  });
};