const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");

const sequelize = new Sequelize(
  process.env.POSTGRES_DB       || "gpsdb",
  process.env.POSTGRES_USER     || "gpsuser",
  process.env.POSTGRES_PASSWORD || "",
  {
    host:    process.env.POSTGRES_HOST || "localhost",
    port:    parseInt(process.env.POSTGRES_PORT) || 5432,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development"
      ? (msg) => logger.debug(msg)
      : false,
    pool: {
      max:     10,
      min:     2,
      acquire: 60000,
      idle:    10000
    },
    dialectOptions: {
      connectTimeout: 10000
    }
  }
);

const User        = require("./user.model")(sequelize);
const Device      = require("./device.model")(sequelize);
const GpsLive     = require("./gpsLive.model")(sequelize);
const GpsHistory  = require("./gpsHistory.model")(sequelize);
const CommandLog  = require("./commandLog.model")(sequelize);
const AlertEvent  = require("./alertEvent.model")(sequelize);
const Subscription= require("./subscription.model")(sequelize);
const Plan        = require("./plan.model")(sequelize);
const AuditLog    = require("./audit.model")(sequelize);
const GeoFence    = require("../modules/geofence/geofence.model")(sequelize);
const Branding    = require("../modules/branding/branding.model")(sequelize);
const Analytics   = require("../modules/analytics/analytics.model")(sequelize);

// ── Associations ───────────────────────────────────────────────
User.hasMany(Device,        { foreignKey: "tenant_id", onDelete: "CASCADE" });
Device.belongsTo(User,      { foreignKey: "tenant_id", as: "owner" });

Device.hasOne(GpsLive,      { foreignKey: "device_id", onDelete: "CASCADE" });
GpsLive.belongsTo(Device,   { foreignKey: "device_id" });

Device.hasMany(GpsHistory,  { foreignKey: "device_id", onDelete: "CASCADE" });
Device.hasMany(CommandLog,  { foreignKey: "device_id", onDelete: "CASCADE" });
Device.hasMany(AlertEvent,  { foreignKey: "device_id", onDelete: "CASCADE" });

Plan.hasMany(Subscription,       { foreignKey: "plan_id" });
Subscription.belongsTo(Plan,     { foreignKey: "plan_id" });
User.hasMany(Subscription,       { foreignKey: "user_id" });
Subscription.belongsTo(User,     { foreignKey: "user_id" });

User.hasOne(Branding,            { foreignKey: "tenant_id" });
Branding.belongsTo(User,         { foreignKey: "tenant_id" });

User.hasMany(GeoFence,           { foreignKey: "tenant_id" });
GeoFence.belongsTo(User,         { foreignKey: "tenant_id" });

AlertEvent.belongsTo(Device,     { foreignKey: "device_id" });

module.exports = {
  sequelize, Sequelize,
  User, Device, GpsLive, GpsHistory,
  CommandLog, AlertEvent, Subscription,
  Plan, AuditLog, GeoFence, Branding, Analytics
};
