const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('gps_live', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    device_id: DataTypes.UUID,
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,
    speed: DataTypes.FLOAT,
    heading: DataTypes.FLOAT
  });
};