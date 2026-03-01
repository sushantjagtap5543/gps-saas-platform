const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define("plans", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: DataTypes.STRING,
    price: DataTypes.INTEGER, // in paise
    duration_days: DataTypes.INTEGER
  });
};