const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("analytics", {
  id:                       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id:                { type: DataTypes.UUID, allowNull: false },
  device_id:                { type: DataTypes.UUID, allowNull: false },
  trip_distance:            DataTypes.FLOAT,
  trip_duration:            DataTypes.FLOAT,
  idle_time:                DataTypes.FLOAT,
  harsh_brake_count:        { type: DataTypes.INTEGER, defaultValue: 0 },
  harsh_acceleration_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  overspeed_count:          { type: DataTypes.INTEGER, defaultValue: 0 },
  driver_score:             DataTypes.FLOAT,
  maintenance_score:        DataTypes.FLOAT
}, { tableName: "analytics", timestamps: true });
