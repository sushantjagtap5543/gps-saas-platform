const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("geofences", {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id:  { type: DataTypes.UUID, allowNull: false },
  name:       { type: DataTypes.STRING, allowNull: false },
  type:       { type: DataTypes.ENUM("circle","polygon"), allowNull: false },
  center_lat: DataTypes.FLOAT,
  center_lng: DataTypes.FLOAT,
  radius:     DataTypes.FLOAT,
  polygon:    DataTypes.JSONB,
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: "geofences", timestamps: true });
