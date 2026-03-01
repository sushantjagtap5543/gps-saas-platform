const { DataTypes } = require("sequelize");
module.exports = (sequelize) => sequelize.define("brandings", {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id:       { type: DataTypes.UUID, allowNull: false, unique: true },
  company_name:    DataTypes.STRING,
  logo_url:        DataTypes.STRING,
  primary_color:   DataTypes.STRING(7),
  secondary_color: DataTypes.STRING(7),
  domain:          DataTypes.STRING,
  support_email:   DataTypes.STRING
}, { tableName: "brandings", timestamps: true });
