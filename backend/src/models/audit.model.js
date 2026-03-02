const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("audit_logs", {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    DataTypes.UUID,
  action:     DataTypes.STRING,
  ip_address: DataTypes.STRING,
  meta:       DataTypes.JSONB
}, { tableName: "audit_logs", timestamps: true });
