const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("gps_history", {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  device_id: { type: DataTypes.UUID, allowNull: false },
  latitude:  DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  speed:     DataTypes.FLOAT,
  heading:   DataTypes.FLOAT
}, { tableName: "gps_history", timestamps: true, indexes: [{ fields: ["device_id", "createdAt"] }] });
