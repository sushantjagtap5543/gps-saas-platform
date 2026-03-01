module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Plan", {
    name: DataTypes.STRING,
    price: DataTypes.FLOAT,
    device_limit: DataTypes.INTEGER,
    duration_days: DataTypes.INTEGER,
    active: { type: DataTypes.BOOLEAN, defaultValue: true }
  });
};