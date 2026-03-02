const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("users", {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:      { type: DataTypes.STRING, allowNull: false },
  email:     { type: DataTypes.STRING, unique: true, allowNull: false, validate: { isEmail: true } },
  password:  { type: DataTypes.STRING, allowNull: false },
  role:      { type: DataTypes.ENUM("ADMIN","CLIENT","SUBUSER"), defaultValue: "CLIENT" },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  fcm_token: { type: DataTypes.STRING }
}, { tableName: "users", timestamps: true });
