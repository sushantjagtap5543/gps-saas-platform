const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("alert_events", {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  device_id: { type: DataTypes.UUID, allowNull: false },
  type:      { type: DataTypes.STRING, allowNull: false },
  severity:  { type: DataTypes.ENUM("INFO","WARNING","CRITICAL"), defaultValue: "INFO" },
  message:   DataTypes.TEXT,
  latitude:  DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  is_read:   { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: "alert_events", timestamps: true, indexes: [{ fields: ["device_id"] }] });
