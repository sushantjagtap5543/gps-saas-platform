module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Analytics", {
    tenant_id: DataTypes.INTEGER,
    device_id: DataTypes.INTEGER,
    trip_distance: DataTypes.FLOAT,
    trip_duration: DataTypes.FLOAT,
    idle_time: DataTypes.FLOAT,
    harsh_brake_count: DataTypes.INTEGER,
    harsh_acceleration_count: DataTypes.INTEGER,
    driver_score: DataTypes.FLOAT,
    maintenance_score: DataTypes.FLOAT
  });
};