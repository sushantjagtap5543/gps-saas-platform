const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("plans", {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:          { type: DataTypes.STRING, allowNull: false },
  price:         { type: DataTypes.INTEGER, allowNull: false },
  duration_days: { type: DataTypes.INTEGER, allowNull: false },
  max_devices:   { type: DataTypes.INTEGER, defaultValue: 10 },
  description:   DataTypes.TEXT
}, { tableName: "plans", timestamps: true });
