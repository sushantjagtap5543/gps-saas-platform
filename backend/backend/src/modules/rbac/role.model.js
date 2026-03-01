module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Role", {
    name: {
      type: DataTypes.STRING,
      unique: true
    }
  });
};