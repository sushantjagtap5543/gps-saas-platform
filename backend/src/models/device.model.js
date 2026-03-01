const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('devices', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    imei: { type: DataTypes.STRING, unique: true },
    vehicle_number: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: 'offline' },
    last_seen: DataTypes.DATE
  });
};