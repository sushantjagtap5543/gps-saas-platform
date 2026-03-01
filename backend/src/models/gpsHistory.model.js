const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('gps_history', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    device_id: DataTypes.UUID,
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,
    speed: DataTypes.FLOAT,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });
};