const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("command_logs", {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  device_id:    { type: DataTypes.UUID, allowNull: false },
  command_text: DataTypes.TEXT,
  status:       { type: DataTypes.ENUM("PENDING","SENT","ACKNOWLEDGED","FAILED"), defaultValue: "PENDING" },
  sent_at:      DataTypes.DATE,
  completed_at: DataTypes.DATE
}, { tableName: "command_logs", timestamps: true });
