module.exports = (sequelize, DataTypes) => {
  return sequelize.define("GeoFence", {
    tenant_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    type: {
      type: DataTypes.ENUM("circle", "polygon")
    },
    center_lat: DataTypes.FLOAT,
    center_lng: DataTypes.FLOAT,
    radius: DataTypes.FLOAT,
    polygon: DataTypes.JSON
  });
};