const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("gps_live", {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  device_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  latitude:  DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  speed:     DataTypes.FLOAT,
  heading:   DataTypes.FLOAT,
  altitude:  DataTypes.FLOAT,
  satellites:DataTypes.INTEGER
}, { tableName: "gps_live", timestamps: true });
