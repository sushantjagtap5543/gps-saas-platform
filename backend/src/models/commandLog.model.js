const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('command_logs', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    device_id: DataTypes.UUID,
    command_text: DataTypes.TEXT,
    status: { type: DataTypes.STRING, defaultValue: 'PENDING' },
    sent_at: DataTypes.DATE,
    completed_at: DataTypes.DATE
  });
};