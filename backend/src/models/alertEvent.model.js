const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('alert_events', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    device_id: DataTypes.UUID,
    type: DataTypes.STRING,
    severity: DataTypes.STRING
  });
};