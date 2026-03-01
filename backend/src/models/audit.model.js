const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('audit_logs', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: DataTypes.UUID,
    action: DataTypes.STRING,
    ip_address: DataTypes.STRING
  });
};