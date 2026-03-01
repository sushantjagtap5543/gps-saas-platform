const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const Device = require('./device.model')(sequelize);
const GpsLive = require('./gpsLive.model')(sequelize);
const GpsHistory = require('./gpsHistory.model')(sequelize);
const CommandLog = require('./commandLog.model')(sequelize);
const AlertEvent = require('./alertEvent.model')(sequelize);
const Subscription = require('./subscription.model')(sequelize');

Device.hasOne(GpsLive, { foreignKey: 'device_id' });
GpsLive.belongsTo(Device);

Device.hasMany(GpsHistory, { foreignKey: 'device_id' });
Device.hasMany(CommandLog, { foreignKey: 'device_id' });
Device.hasMany(AlertEvent, { foreignKey: 'device_id' });

sequelize.sync();

module.exports = {
  sequelize,
  Device,
  GpsLive,
  GpsHistory,
  CommandLog,
  AlertEvent,
  Subscription
};