const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("devices", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id:      { type: DataTypes.UUID, allowNull: false },
  imei:           { type: DataTypes.STRING(20), unique: true, allowNull: false },
  vehicle_number: { type: DataTypes.STRING, allowNull: false },
  model:          DataTypes.STRING,
  sim_number:     DataTypes.STRING,
  status:         { type: DataTypes.ENUM("online","offline","inactive"), defaultValue: "offline" },
  last_seen:      DataTypes.DATE
}, { tableName: "devices", timestamps: true, indexes: [{ fields: ["imei"] }, { fields: ["tenant_id"] }] });
