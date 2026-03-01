module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Branding", {
    tenant_id: DataTypes.INTEGER,
    company_name: DataTypes.STRING,
    logo_url: DataTypes.STRING,
    primary_color: DataTypes.STRING,
    secondary_color: DataTypes.STRING,
    domain: DataTypes.STRING,
    support_email: DataTypes.STRING
  });
};