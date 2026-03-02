const { Sequelize, DataTypes } = require("sequelize");
const logger = require("../utils/logger");

const sequelize = new Sequelize(
  process.env.DB_NAME     || "gps_tracking",
  process.env.DB_USER     || "postgres",
  process.env.DB_PASSWORD || "postgres",
  {
    host:    process.env.DB_HOST || "postgres",
    port:    parseInt(process.env.DB_PORT || "5432"),
    dialect: "postgres",
    logging: false,
    pool:    { max: 20, min: 2, acquire: 30000, idle: 10000 },
    define:  { timestamps: true, underscored: false }
  }
);

// ── MODELS ──────────────────────────────────────────────────

const User = sequelize.define("User", {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name:          { type: DataTypes.STRING(255), allowNull: false },
  email:         { type: DataTypes.STRING(255), unique: true, allowNull: false },
  phone:         { type: DataTypes.STRING(20) },
  password:      { type: DataTypes.STRING(255), allowNull: false },
  role:          { type: DataTypes.ENUM("SUPER_ADMIN","ADMIN","RESELLER","SUPPORT","TECHNICIAN","CLIENT","DRIVER"), defaultValue: "CLIENT" },
  reseller_id:   { type: DataTypes.UUID },
  parent_id:     { type: DataTypes.UUID },
  is_active:     { type: DataTypes.BOOLEAN, defaultValue: true },
  is_email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp_secret:    { type: DataTypes.STRING(255) },
  two_fa_enabled:{ type: DataTypes.BOOLEAN, defaultValue: false },
  fcm_token:     { type: DataTypes.STRING(500) },
  avatar_url:    { type: DataTypes.TEXT },
  address:       { type: DataTypes.TEXT },
  city:          { type: DataTypes.STRING(100) },
  state:         { type: DataTypes.STRING(100) },
  country:       { type: DataTypes.STRING(100), defaultValue: "India" },
  timezone:      { type: DataTypes.STRING(50), defaultValue: "Asia/Kolkata" },
  language:      { type: DataTypes.STRING(10), defaultValue: "en" },
  last_login:    { type: DataTypes.DATE },
  login_count:   { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: "users" });

const Reseller = sequelize.define("Reseller", {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:         { type: DataTypes.UUID, allowNull: false },
  company_name:    { type: DataTypes.STRING(255), allowNull: false },
  domain:          { type: DataTypes.STRING(255), unique: true },
  logo_url:        { type: DataTypes.TEXT },
  primary_color:   { type: DataTypes.STRING(7), defaultValue: "#2563EB" },
  secondary_color: { type: DataTypes.STRING(7), defaultValue: "#1E40AF" },
  app_name:        { type: DataTypes.STRING(100), defaultValue: "GPS Tracker" },
  support_email:   { type: DataTypes.STRING(255) },
  support_phone:   { type: DataTypes.STRING(20) },
  commission_pct:  { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  pricing_override:{ type: DataTypes.JSONB, defaultValue: {} },
  is_active:       { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: "resellers" });

const DeviceModel = sequelize.define("DeviceModel", {
  id:                  { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name:                { type: DataTypes.STRING(100), allowNull: false },
  brand:               { type: DataTypes.STRING(100) },
  protocol:            { type: DataTypes.ENUM("GT06","TELTONIKA","CONCOX","MEILIGAO","JIMI","TK103","H02"), allowNull: false },
  command_syntax:      { type: DataTypes.JSONB, defaultValue: {} },
  supported_commands:  { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  is_active:           { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: "device_models" });

const Device = sequelize.define("Device", {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenant_id:       { type: DataTypes.UUID, allowNull: false },
  reseller_id:     { type: DataTypes.UUID },
  imei:            { type: DataTypes.STRING(20), unique: true, allowNull: false },
  vehicle_number:  { type: DataTypes.STRING(20), allowNull: false },
  vehicle_type:    { type: DataTypes.ENUM("CAR","TRUCK","BIKE","BUS","TRACTOR","EXCAVATOR","BOAT","OTHER"), defaultValue: "CAR" },
  model_id:        { type: DataTypes.UUID },
  sim_id:          { type: DataTypes.UUID },
  driver_id:       { type: DataTypes.UUID },
  status:          { type: DataTypes.ENUM("ONLINE","OFFLINE","INACTIVE","SUSPENDED"), defaultValue: "OFFLINE" },
  ignition:        { type: DataTypes.BOOLEAN, defaultValue: false },
  fuel_level:      { type: DataTypes.REAL },
  odometer:        { type: DataTypes.REAL, defaultValue: 0 },
  install_date:    { type: DataTypes.DATEONLY },
  install_by:      { type: DataTypes.UUID },
  last_seen:       { type: DataTypes.DATE },
  last_lat:        { type: DataTypes.DOUBLE },
  last_lng:        { type: DataTypes.DOUBLE },
  qr_code:         { type: DataTypes.STRING(255) },
  activation_code: { type: DataTypes.STRING(50) },
  notes:           { type: DataTypes.TEXT }
}, { tableName: "devices" });

const GpsLive = sequelize.define("GpsLive", {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  device_id:       { type: DataTypes.UUID, unique: true, allowNull: false },
  latitude:        { type: DataTypes.DOUBLE, allowNull: false },
  longitude:       { type: DataTypes.DOUBLE, allowNull: false },
  altitude:        { type: DataTypes.REAL, defaultValue: 0 },
  speed:           { type: DataTypes.REAL, defaultValue: 0 },
  heading:         { type: DataTypes.REAL, defaultValue: 0 },
  accuracy:        { type: DataTypes.REAL },
  satellites:      { type: DataTypes.INTEGER, defaultValue: 0 },
  ignition:        { type: DataTypes.BOOLEAN, defaultValue: false },
  fuel_level:      { type: DataTypes.REAL },
  battery_voltage: { type: DataTypes.REAL },
  gsm_signal:      { type: DataTypes.INTEGER },
  io_status:       { type: DataTypes.JSONB, defaultValue: {} },
  raw_packet:      { type: DataTypes.TEXT }
}, { tableName: "gps_live" });

const GpsHistory = sequelize.define("GpsHistory", {
  id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  device_id: { type: DataTypes.UUID, allowNull: false },
  latitude:  { type: DataTypes.DOUBLE, allowNull: false },
  longitude: { type: DataTypes.DOUBLE, allowNull: false },
  speed:     { type: DataTypes.REAL, defaultValue: 0 },
  heading:   { type: DataTypes.REAL, defaultValue: 0 },
  ignition:  { type: DataTypes.BOOLEAN, defaultValue: false },
  fuel_level:{ type: DataTypes.REAL },
  io_status: { type: DataTypes.JSONB, defaultValue: {} }
}, { tableName: "gps_history", timestamps: true, updatedAt: false });

const Trip = sequelize.define("Trip", {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  device_id:     { type: DataTypes.UUID, allowNull: false },
  tenant_id:     { type: DataTypes.UUID, allowNull: false },
  driver_id:     { type: DataTypes.UUID },
  start_time:    { type: DataTypes.DATE, allowNull: false },
  end_time:      { type: DataTypes.DATE },
  start_lat:     { type: DataTypes.DOUBLE },
  start_lng:     { type: DataTypes.DOUBLE },
  end_lat:       { type: DataTypes.DOUBLE },
  end_lng:       { type: DataTypes.DOUBLE },
  start_address: { type: DataTypes.TEXT },
  end_address:   { type: DataTypes.TEXT },
  distance_km:   { type: DataTypes.REAL, defaultValue: 0 },
  duration_sec:  { type: DataTypes.INTEGER, defaultValue: 0 },
  max_speed:     { type: DataTypes.REAL, defaultValue: 0 },
  avg_speed:     { type: DataTypes.REAL, defaultValue: 0 },
  idle_time_sec: { type: DataTypes.INTEGER, defaultValue: 0 },
  fuel_consumed: { type: DataTypes.REAL },
  harsh_brakes:  { type: DataTypes.INTEGER, defaultValue: 0 },
  harsh_accel:   { type: DataTypes.INTEGER, defaultValue: 0 },
  overspeed_cnt: { type: DataTypes.INTEGER, defaultValue: 0 },
  driver_score:  { type: DataTypes.REAL, defaultValue: 100 },
  status:        { type: DataTypes.ENUM("ACTIVE","COMPLETED","CANCELLED"), defaultValue: "ACTIVE" }
}, { tableName: "trips" });

const AlertRule = sequelize.define("AlertRule", {
  id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenant_id:    { type: DataTypes.UUID, allowNull: false },
  device_id:    { type: DataTypes.UUID },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  type:         { type: DataTypes.STRING(50), allowNull: false },
  conditions:   { type: DataTypes.JSONB, defaultValue: {} },
  severity:     { type: DataTypes.ENUM("INFO","WARNING","CRITICAL"), defaultValue: "INFO" },
  channels:     { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: ["WEB"] },
  cooldown_min: { type: DataTypes.INTEGER, defaultValue: 15 },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: "alert_rules" });

const AlertEvent = sequelize.define("AlertEvent", {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  device_id:   { type: DataTypes.UUID, allowNull: false },
  tenant_id:   { type: DataTypes.UUID, allowNull: false },
  rule_id:     { type: DataTypes.UUID },
  type:        { type: DataTypes.STRING(50), allowNull: false },
  severity:    { type: DataTypes.ENUM("INFO","WARNING","CRITICAL"), defaultValue: "INFO" },
  title:       { type: DataTypes.STRING(255) },
  message:     { type: DataTypes.TEXT },
  latitude:    { type: DataTypes.DOUBLE },
  longitude:   { type: DataTypes.DOUBLE },
  speed:       { type: DataTypes.REAL },
  extra_data:  { type: DataTypes.JSONB, defaultValue: {} },
  is_read:     { type: DataTypes.BOOLEAN, defaultValue: false },
  is_resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
  resolved_by: { type: DataTypes.UUID },
  resolved_at: { type: DataTypes.DATE }
}, { tableName: "alert_events" });

const Geofence = sequelize.define("Geofence", {
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenant_id:  { type: DataTypes.UUID, allowNull: false },
  name:       { type: DataTypes.STRING(100), allowNull: false },
  description:{ type: DataTypes.TEXT },
  type:       { type: DataTypes.ENUM("CIRCLE","POLYGON"), allowNull: false },
  center_lat: { type: DataTypes.REAL },
  center_lng: { type: DataTypes.REAL },
  radius:     { type: DataTypes.REAL },
  polygon:    { type: DataTypes.JSONB },
  alert_on:   { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: ["ENTRY","EXIT"] },
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
  color:      { type: DataTypes.STRING(7), defaultValue: "#3B82F6" }
}, { tableName: "geofences" });

const DeviceCommandTemplate = sequelize.define("DeviceCommandTemplate", {
  id:                     { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  model_id:               { type: DataTypes.UUID },
  command_name:           { type: DataTypes.STRING(100), allowNull: false },
  command_code:           { type: DataTypes.STRING(50), allowNull: false },
  command_hex:            { type: DataTypes.TEXT },
  description:            { type: DataTypes.TEXT },
  requires_otp:           { type: DataTypes.BOOLEAN, defaultValue: false },
  min_speed:              { type: DataTypes.REAL, defaultValue: 0 },
  requires_ignition_off:  { type: DataTypes.BOOLEAN, defaultValue: false },
  cooldown_sec:           { type: DataTypes.INTEGER, defaultValue: 60 },
  is_dangerous:           { type: DataTypes.BOOLEAN, defaultValue: false },
  allowed_roles:          { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: ["ADMIN","SUPER_ADMIN"] }
}, { tableName: "device_command_templates" });

const CommandQueue = sequelize.define("CommandQueue", {
  id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  device_id:    { type: DataTypes.UUID, allowNull: false },
  template_id:  { type: DataTypes.UUID },
  issued_by:    { type: DataTypes.UUID, allowNull: false },
  command_text: { type: DataTypes.TEXT, allowNull: false },
  otp_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  status:       { type: DataTypes.ENUM("PENDING","SENT","ACK","SUCCESS","FAILED","TIMEOUT","CANCELLED"), defaultValue: "PENDING" },
  sent_at:      { type: DataTypes.DATE },
  ack_at:       { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  retry_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
  max_retries:  { type: DataTypes.INTEGER, defaultValue: 3 },
  error_msg:    { type: DataTypes.TEXT }
}, { tableName: "command_queue" });

const Plan = sequelize.define("Plan", {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name:            { type: DataTypes.STRING(100), allowNull: false },
  price_monthly:   { type: DataTypes.INTEGER, allowNull: false },
  price_yearly:    { type: DataTypes.INTEGER, allowNull: false },
  duration_days:   { type: DataTypes.INTEGER, defaultValue: 30 },
  max_devices:     { type: DataTypes.INTEGER, defaultValue: 10 },
  max_users:       { type: DataTypes.INTEGER, defaultValue: 5 },
  features:        { type: DataTypes.JSONB, defaultValue: {} },
  description:     { type: DataTypes.TEXT },
  is_active:       { type: DataTypes.BOOLEAN, defaultValue: true },
  is_public:       { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:      { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: "plans" });

const Subscription = sequelize.define("Subscription", {
  id:                  { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:             { type: DataTypes.UUID, allowNull: false },
  plan_id:             { type: DataTypes.UUID, allowNull: false },
  billing_cycle:       { type: DataTypes.ENUM("MONTHLY","YEARLY"), defaultValue: "MONTHLY" },
  start_date:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  end_date:            { type: DataTypes.DATE, allowNull: false },
  grace_end_date:      { type: DataTypes.DATE },
  status:              { type: DataTypes.ENUM("ACTIVE","GRACE","EXPIRED","CANCELLED","SUSPENDED"), defaultValue: "ACTIVE" },
  vehicle_count:       { type: DataTypes.INTEGER, defaultValue: 1 },
  amount_paid:         { type: DataTypes.INTEGER },
  currency:            { type: DataTypes.STRING(3), defaultValue: "INR" },
  gst_amount:          { type: DataTypes.INTEGER, defaultValue: 0 },
  razorpay_order_id:   { type: DataTypes.STRING(255) },
  razorpay_payment_id: { type: DataTypes.STRING(255) },
  notes:               { type: DataTypes.TEXT }
}, { tableName: "subscriptions" });

const Invoice = sequelize.define("Invoice", {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:         { type: DataTypes.UUID, allowNull: false },
  subscription_id: { type: DataTypes.UUID },
  invoice_number:  { type: DataTypes.STRING(50), unique: true },
  issue_date:      { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  due_date:        { type: DataTypes.DATEONLY, allowNull: false },
  subtotal:        { type: DataTypes.INTEGER, allowNull: false },
  gst_rate:        { type: DataTypes.DECIMAL(5,2), defaultValue: 18.00 },
  gst_amount:      { type: DataTypes.INTEGER, defaultValue: 0 },
  total:           { type: DataTypes.INTEGER, allowNull: false },
  status:          { type: DataTypes.ENUM("PENDING","PAID","OVERDUE","CANCELLED"), defaultValue: "PENDING" },
  paid_at:         { type: DataTypes.DATE },
  pdf_url:         { type: DataTypes.TEXT },
  line_items:      { type: DataTypes.JSONB, defaultValue: [] }
}, { tableName: "invoices" });

const AuditLog = sequelize.define("AuditLog", {
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:    { type: DataTypes.UUID },
  action:     { type: DataTypes.STRING(255), allowNull: false },
  entity:     { type: DataTypes.STRING(100) },
  entity_id:  { type: DataTypes.UUID },
  old_value:  { type: DataTypes.JSONB },
  new_value:  { type: DataTypes.JSONB },
  ip_address: { type: DataTypes.STRING(45) },
  user_agent: { type: DataTypes.TEXT },
  meta:       { type: DataTypes.JSONB }
}, { tableName: "audit_logs", updatedAt: false });

const DriverScore = sequelize.define("DriverScore", {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  driver_id:     { type: DataTypes.UUID, allowNull: false },
  device_id:     { type: DataTypes.UUID, allowNull: false },
  date:          { type: DataTypes.DATEONLY, allowNull: false },
  overall_score: { type: DataTypes.REAL, defaultValue: 100 },
  speed_score:   { type: DataTypes.REAL, defaultValue: 100 },
  brake_score:   { type: DataTypes.REAL, defaultValue: 100 },
  accel_score:   { type: DataTypes.REAL, defaultValue: 100 },
  idle_score:    { type: DataTypes.REAL, defaultValue: 100 },
  distance_km:   { type: DataTypes.REAL, defaultValue: 0 },
  driving_time:  { type: DataTypes.INTEGER, defaultValue: 0 },
  harsh_brakes:  { type: DataTypes.INTEGER, defaultValue: 0 },
  harsh_accels:  { type: DataTypes.INTEGER, defaultValue: 0 },
  overspeed_sec: { type: DataTypes.INTEGER, defaultValue: 0 },
  idle_sec:      { type: DataTypes.INTEGER, defaultValue: 0 },
  trips_count:   { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: "driver_scores" });

const Notification = sequelize.define("Notification", {
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:    { type: DataTypes.UUID, allowNull: false },
  title:      { type: DataTypes.STRING(255), allowNull: false },
  message:    { type: DataTypes.TEXT, allowNull: false },
  type:       { type: DataTypes.STRING(50), defaultValue: "INFO" },
  is_read:    { type: DataTypes.BOOLEAN, defaultValue: false },
  action_url: { type: DataTypes.TEXT }
}, { tableName: "notifications", updatedAt: false });

const SystemControl = sequelize.define("SystemControl", {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  key:         { type: DataTypes.STRING(100), unique: true, allowNull: false },
  value:       { type: DataTypes.TEXT, allowNull: false },
  description: { type: DataTypes.TEXT },
  updated_by:  { type: DataTypes.UUID }
}, { tableName: "system_controls" });

const Analytics = sequelize.define("Analytics", {
  id:                      { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenant_id:               { type: DataTypes.UUID, allowNull: false },
  device_id:               { type: DataTypes.UUID, allowNull: false },
  date:                    { type: DataTypes.DATEONLY, allowNull: false },
  trip_count:              { type: DataTypes.INTEGER, defaultValue: 0 },
  trip_distance:           { type: DataTypes.REAL, defaultValue: 0 },
  trip_duration:           { type: DataTypes.INTEGER, defaultValue: 0 },
  idle_time:               { type: DataTypes.INTEGER, defaultValue: 0 },
  max_speed:               { type: DataTypes.REAL, defaultValue: 0 },
  avg_speed:               { type: DataTypes.REAL, defaultValue: 0 },
  harsh_brake_count:       { type: DataTypes.INTEGER, defaultValue: 0 },
  harsh_acceleration_count:{ type: DataTypes.INTEGER, defaultValue: 0 },
  overspeed_count:         { type: DataTypes.INTEGER, defaultValue: 0 },
  fuel_consumed:           { type: DataTypes.REAL },
  driver_score:            { type: DataTypes.REAL, defaultValue: 100 }
}, { tableName: "analytics" });

const Branding = sequelize.define("Branding", {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenant_id:       { type: DataTypes.UUID, unique: true, allowNull: false },
  company_name:    { type: DataTypes.STRING(255) },
  logo_url:        { type: DataTypes.TEXT },
  primary_color:   { type: DataTypes.STRING(7), defaultValue: "#2563EB" },
  secondary_color: { type: DataTypes.STRING(7), defaultValue: "#1E40AF" },
  domain:          { type: DataTypes.STRING(255) },
  support_email:   { type: DataTypes.STRING(255) },
  support_phone:   { type: DataTypes.STRING(20) },
  footer_text:     { type: DataTypes.TEXT },
  custom_css:      { type: DataTypes.TEXT }
}, { tableName: "brandings" });

const SupportTicket = sequelize.define("SupportTicket", {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:     { type: DataTypes.UUID, allowNull: false },
  assigned_to: { type: DataTypes.UUID },
  subject:     { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category:    { type: DataTypes.STRING(50), defaultValue: "GENERAL" },
  priority:    { type: DataTypes.ENUM("LOW","MEDIUM","HIGH","CRITICAL"), defaultValue: "MEDIUM" },
  status:      { type: DataTypes.ENUM("OPEN","IN_PROGRESS","RESOLVED","CLOSED"), defaultValue: "OPEN" },
  attachments: { type: DataTypes.ARRAY(DataTypes.TEXT) }
}, { tableName: "support_tickets" });

const FuelData = sequelize.define("FuelData", {
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  device_id:  { type: DataTypes.UUID, allowNull: false },
  fuel_level: { type: DataTypes.REAL, allowNull: false },
  fuel_volume:{ type: DataTypes.REAL },
  event_type: { type: DataTypes.ENUM("NORMAL","FILL","THEFT","DRAIN"), defaultValue: "NORMAL" },
  latitude:   { type: DataTypes.DOUBLE },
  longitude:  { type: DataTypes.DOUBLE }
}, { tableName: "fuel_data", updatedAt: false });

// ── ASSOCIATIONS ─────────────────────────────────────────────

User.hasMany(Device, { foreignKey: "tenant_id", as: "devices" });
Device.belongsTo(User, { foreignKey: "tenant_id", as: "tenant" });

User.hasOne(Reseller, { foreignKey: "user_id", as: "reseller" });
Reseller.belongsTo(User, { foreignKey: "user_id" });

Device.hasOne(GpsLive, { foreignKey: "device_id", as: "liveData" });
GpsLive.belongsTo(Device, { foreignKey: "device_id" });

Device.hasMany(GpsHistory, { foreignKey: "device_id", as: "history" });
Device.hasMany(Trip, { foreignKey: "device_id", as: "trips" });
Device.hasMany(AlertEvent, { foreignKey: "device_id", as: "alertEvents" });
Device.hasMany(CommandQueue, { foreignKey: "device_id", as: "commands" });
Device.hasMany(FuelData, { foreignKey: "device_id", as: "fuelData" });
Device.belongsTo(DeviceModel, { foreignKey: "model_id", as: "model" });

User.hasMany(Subscription, { foreignKey: "user_id", as: "subscriptions" });
Subscription.belongsTo(User, { foreignKey: "user_id" });
Subscription.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });
Plan.hasMany(Subscription, { foreignKey: "plan_id" });

User.hasMany(Invoice, { foreignKey: "user_id", as: "invoices" });
User.hasMany(AuditLog, { foreignKey: "user_id", as: "auditLogs" });
User.hasMany(AlertEvent, { foreignKey: "tenant_id", as: "alerts" });
User.hasMany(SupportTicket, { foreignKey: "user_id", as: "tickets" });
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
User.hasMany(AlertRule, { foreignKey: "tenant_id", as: "alertRules" });
User.hasMany(Geofence, { foreignKey: "tenant_id", as: "geofences" });
User.hasOne(Branding, { foreignKey: "tenant_id", as: "branding" });

DeviceModel.hasMany(DeviceCommandTemplate, { foreignKey: "model_id", as: "commandTemplates" });
DeviceCommandTemplate.belongsTo(DeviceModel, { foreignKey: "model_id" });

async function connectDB() {
  try {
    await sequelize.authenticate();
    logger.info("[DB] PostgreSQL connected ✓");
  } catch (err) {
    logger.error("[DB] Connection failed: " + err.message);
    process.exit(1);
  }
}

module.exports = {
  sequelize, connectDB,
  User, Reseller, DeviceModel, Device, GpsLive, GpsHistory, Trip,
  AlertRule, AlertEvent, Geofence, DeviceCommandTemplate, CommandQueue,
  Plan, Subscription, Invoice, AuditLog, DriverScore, Notification,
  SystemControl, Analytics, Branding, SupportTicket, FuelData
};
