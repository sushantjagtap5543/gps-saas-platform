module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Tenant", {
    name: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM("active", "suspended"),
      defaultValue: "active"
    }
  });
};