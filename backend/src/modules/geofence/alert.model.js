module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Alert", {
    tenant_id: DataTypes.INTEGER,
    device_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    message: DataTypes.STRING,
    latitude: DataTypes.FLOAT,
    longitude: DataTypes.FLOAT
  });
};
