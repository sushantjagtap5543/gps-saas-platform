-- ============================================================
-- GPS TRACKING SAAS - COMPLETE PRODUCTION DATABASE SCHEMA
-- Version 2.0 | Multi-tenant | White-label | Enterprise-grade
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- CORE AUTH & ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password      VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'CLIENT'
                CHECK (role IN ('SUPER_ADMIN','ADMIN','RESELLER','SUPPORT','TECHNICIAN','CLIENT','DRIVER')),
  reseller_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  otp_secret    VARCHAR(255),
  two_fa_enabled BOOLEAN DEFAULT false,
  fcm_token     VARCHAR(500),
  avatar_url    TEXT,
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100) DEFAULT 'India',
  timezone      VARCHAR(50) DEFAULT 'Asia/Kolkata',
  language      VARCHAR(10) DEFAULT 'en',
  last_login    TIMESTAMPTZ,
  login_count   INTEGER DEFAULT 0,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role     VARCHAR(20) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  actions  TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status     VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS','FAILED','BLOCKED')),
  reason     TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESELLER / WHITE-LABEL
-- ============================================================

CREATE TABLE IF NOT EXISTS resellers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name    VARCHAR(255) NOT NULL,
  domain          VARCHAR(255) UNIQUE,
  logo_url        TEXT,
  favicon_url     TEXT,
  primary_color   VARCHAR(7) DEFAULT '#2563EB',
  secondary_color VARCHAR(7) DEFAULT '#1E40AF',
  app_name        VARCHAR(100) DEFAULT 'GPS Tracker',
  support_email   VARCHAR(255),
  support_phone   VARCHAR(20),
  whatsapp        VARCHAR(20),
  address         TEXT,
  gst_number      VARCHAR(20),
  commission_pct  DECIMAL(5,2) DEFAULT 0,
  pricing_override JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEVICES & SIMs
-- ============================================================

CREATE TABLE IF NOT EXISTS device_models (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  brand        VARCHAR(100),
  protocol     VARCHAR(50) NOT NULL CHECK (protocol IN ('GT06','TELTONIKA','CONCOX','MEILIGAO','JIMI','TK103','H02')),
  command_syntax JSONB DEFAULT '{}',
  supported_commands TEXT[] DEFAULT '{}',
  data_fields  TEXT[] DEFAULT '{}',
  notes        TEXT,
  is_active    BOOLEAN DEFAULT true,
  "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim_cards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number       VARCHAR(20) UNIQUE NOT NULL,
  operator     VARCHAR(50),
  iccid        VARCHAR(30),
  data_plan    VARCHAR(50),
  status       VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ASSIGNED','SUSPENDED','EXPIRED')),
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  notes        TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reseller_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  imei           VARCHAR(20) UNIQUE NOT NULL,
  vehicle_number VARCHAR(20) NOT NULL,
  vehicle_type   VARCHAR(50) DEFAULT 'CAR' CHECK (vehicle_type IN ('CAR','TRUCK','BIKE','BUS','TRACTOR','EXCAVATOR','BOAT','OTHER')),
  model_id       UUID REFERENCES device_models(id) ON DELETE SET NULL,
  sim_id         UUID REFERENCES sim_cards(id) ON DELETE SET NULL,
  driver_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  status         VARCHAR(20) DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE','OFFLINE','INACTIVE','SUSPENDED')),
  ignition       BOOLEAN DEFAULT false,
  fuel_level     REAL,
  odometer       REAL DEFAULT 0,
  install_photo  TEXT,
  install_date   DATE,
  install_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  last_seen      TIMESTAMPTZ,
  last_lat       DOUBLE PRECISION,
  last_lng       DOUBLE PRECISION,
  qr_code        VARCHAR(255),
  activation_code VARCHAR(50),
  notes          TEXT,
  "createdAt"    TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GPS TRACKING DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS gps_live (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id  UUID UNIQUE NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  altitude   REAL DEFAULT 0,
  speed      REAL DEFAULT 0,
  heading    REAL DEFAULT 0,
  accuracy   REAL,
  satellites INTEGER DEFAULT 0,
  ignition   BOOLEAN DEFAULT false,
  fuel_level REAL,
  battery_voltage REAL,
  gsm_signal INTEGER,
  io_status  JSONB DEFAULT '{}',
  raw_packet TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_history (
  id         UUID DEFAULT uuid_generate_v4(),
  device_id  UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  altitude   REAL DEFAULT 0,
  speed      REAL DEFAULT 0,
  heading    REAL DEFAULT 0,
  ignition   BOOLEAN DEFAULT false,
  fuel_level REAL,
  io_status  JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

DO $$ DECLARE m RECORD;
BEGIN
  FOR m IN SELECT generate_series('2025-01-01'::date, '2030-12-01'::date, '1 month'::interval) AS month LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS gps_history_%s PARTITION OF gps_history FOR VALUES FROM (%L) TO (%L)',
      to_char(m.month, 'YYYY_MM'), m.month, m.month + interval '1 month'
    );
  END LOOP;
END $$;

-- ============================================================
-- TRIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ,
  start_lat      DOUBLE PRECISION,
  start_lng      DOUBLE PRECISION,
  end_lat        DOUBLE PRECISION,
  end_lng        DOUBLE PRECISION,
  start_address  TEXT,
  end_address    TEXT,
  distance_km    REAL DEFAULT 0,
  duration_sec   INTEGER DEFAULT 0,
  max_speed      REAL DEFAULT 0,
  avg_speed      REAL DEFAULT 0,
  idle_time_sec  INTEGER DEFAULT 0,
  fuel_consumed  REAL,
  harsh_brakes   INTEGER DEFAULT 0,
  harsh_accel    INTEGER DEFAULT 0,
  overspeed_cnt  INTEGER DEFAULT 0,
  driver_score   REAL DEFAULT 100,
  status         VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
  "createdAt"    TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUEL & CAN BUS
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_data (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  fuel_level  REAL NOT NULL,
  fuel_volume REAL,
  event_type  VARCHAR(30) DEFAULT 'NORMAL' CHECK (event_type IN ('NORMAL','FILL','THEFT','DRAIN')),
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS can_bus_data (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  rpm            INTEGER,
  engine_load    REAL,
  coolant_temp   REAL,
  throttle_pos   REAL,
  fuel_pressure  REAL,
  odometer_can   REAL,
  dtc_codes      TEXT[],
  raw_data       JSONB,
  "createdAt"    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMAND ENGINE
-- ============================================================

CREATE TABLE IF NOT EXISTS device_command_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id      UUID REFERENCES device_models(id) ON DELETE CASCADE,
  command_name  VARCHAR(100) NOT NULL,
  command_code  VARCHAR(50) NOT NULL,
  command_hex   TEXT,
  description   TEXT,
  requires_otp  BOOLEAN DEFAULT false,
  min_speed     REAL DEFAULT 0,
  requires_ignition_off BOOLEAN DEFAULT false,
  cooldown_sec  INTEGER DEFAULT 60,
  is_dangerous  BOOLEAN DEFAULT false,
  allowed_roles TEXT[] DEFAULT '{"ADMIN","SUPER_ADMIN"}',
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS command_queue (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  template_id   UUID REFERENCES device_command_templates(id) ON DELETE SET NULL,
  issued_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  command_text  TEXT NOT NULL,
  otp_verified  BOOLEAN DEFAULT false,
  status        VARCHAR(20) DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','SENT','ACK','SUCCESS','FAILED','TIMEOUT','CANCELLED')),
  sent_at       TIMESTAMPTZ,
  ack_at        TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  retry_count   INTEGER DEFAULT 0,
  max_retries   INTEGER DEFAULT 3,
  error_msg     TEXT,
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERTS & NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id    UUID REFERENCES devices(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  type         VARCHAR(50) NOT NULL,
  conditions   JSONB NOT NULL DEFAULT '{}',
  severity     VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  channels     TEXT[] DEFAULT '{"WEB"}',
  cooldown_min INTEGER DEFAULT 15,
  time_from    TIME,
  time_to      TIME,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  is_active    BOOLEAN DEFAULT true,
  "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id     UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  type        VARCHAR(50) NOT NULL,
  severity    VARCHAR(20) DEFAULT 'INFO',
  title       VARCHAR(255),
  message     TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  speed       REAL,
  extra_data  JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GEOFENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS geofences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('CIRCLE','POLYGON')),
  center_lat  REAL,
  center_lng  REAL,
  radius      REAL,
  polygon     JSONB,
  alert_on    TEXT[] DEFAULT '{"ENTRY","EXIT"}',
  is_active   BOOLEAN DEFAULT true,
  color       VARCHAR(7) DEFAULT '#3B82F6',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofence_devices (
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  PRIMARY KEY (geofence_id, device_id)
);

-- ============================================================
-- DRIVER SCORING
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  overall_score   REAL DEFAULT 100,
  speed_score     REAL DEFAULT 100,
  brake_score     REAL DEFAULT 100,
  accel_score     REAL DEFAULT 100,
  idle_score      REAL DEFAULT 100,
  distance_km     REAL DEFAULT 0,
  driving_time    INTEGER DEFAULT 0,
  harsh_brakes    INTEGER DEFAULT 0,
  harsh_accels    INTEGER DEFAULT 0,
  overspeed_sec   INTEGER DEFAULT 0,
  idle_sec        INTEGER DEFAULT 0,
  trips_count     INTEGER DEFAULT 0,
  "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, device_id, date)
);

-- ============================================================
-- BILLING & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  price_monthly    INTEGER NOT NULL,
  price_yearly     INTEGER NOT NULL,
  duration_days    INTEGER NOT NULL DEFAULT 30,
  max_devices      INTEGER DEFAULT 10,
  max_users        INTEGER DEFAULT 5,
  features         JSONB DEFAULT '{}',
  description      TEXT,
  is_active        BOOLEAN DEFAULT true,
  is_public        BOOLEAN DEFAULT true,
  sort_order       INTEGER DEFAULT 0,
  "createdAt"      TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES plans(id),
  billing_cycle        VARCHAR(10) DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY','YEARLY')),
  start_date           TIMESTAMPTZ DEFAULT NOW(),
  end_date             TIMESTAMPTZ NOT NULL,
  grace_end_date       TIMESTAMPTZ,
  status               VARCHAR(20) DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE','GRACE','EXPIRED','CANCELLED','SUSPENDED')),
  vehicle_count        INTEGER DEFAULT 1,
  amount_paid          INTEGER,
  currency             VARCHAR(3) DEFAULT 'INR',
  gst_amount           INTEGER DEFAULT 0,
  razorpay_order_id    VARCHAR(255),
  razorpay_payment_id  VARCHAR(255),
  razorpay_signature   VARCHAR(500),
  notes                TEXT,
  renewed_from         UUID REFERENCES subscriptions(id),
  "createdAt"          TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  subtotal        INTEGER NOT NULL,
  gst_rate        DECIMAL(5,2) DEFAULT 18.00,
  gst_amount      INTEGER DEFAULT 0,
  total           INTEGER NOT NULL,
  status          VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELLED')),
  paid_at         TIMESTAMPTZ,
  pdf_url         TEXT,
  line_items      JSONB DEFAULT '[]',
  "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  subject      VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  category     VARCHAR(50) DEFAULT 'GENERAL',
  priority     VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status       VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  attachments  TEXT[],
  "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM & AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  action     VARCHAR(255) NOT NULL,
  entity     VARCHAR(100),
  entity_id  UUID,
  old_value  JSONB,
  new_value  JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  meta       JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_controls (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) DEFAULT 'INFO',
  is_read     BOOLEAN DEFAULT false,
  action_url  TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS (per device per day)
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id             UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  trip_count            INTEGER DEFAULT 0,
  trip_distance         REAL DEFAULT 0,
  trip_duration         INTEGER DEFAULT 0,
  idle_time             INTEGER DEFAULT 0,
  max_speed             REAL DEFAULT 0,
  avg_speed             REAL DEFAULT 0,
  harsh_brake_count     INTEGER DEFAULT 0,
  harsh_acceleration_count INTEGER DEFAULT 0,
  overspeed_count       INTEGER DEFAULT 0,
  fuel_consumed         REAL,
  driver_score          REAL DEFAULT 100,
  "createdAt"           TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, date)
);

CREATE TABLE IF NOT EXISTS brandings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name    VARCHAR(255),
  logo_url        TEXT,
  favicon_url     TEXT,
  primary_color   VARCHAR(7) DEFAULT '#2563EB',
  secondary_color VARCHAR(7) DEFAULT '#1E40AF',
  domain          VARCHAR(255),
  support_email   VARCHAR(255),
  support_phone   VARCHAR(20),
  footer_text     TEXT,
  custom_css      TEXT,
  "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_reseller    ON users(reseller_id);
CREATE INDEX IF NOT EXISTS idx_devices_imei      ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_tenant    ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_status    ON devices(status);
CREATE INDEX IF NOT EXISTS idx_gps_live_device   ON gps_live(device_id);
CREATE INDEX IF NOT EXISTS idx_gps_hist_device   ON gps_history(device_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_trips_device      ON trips(device_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_trips_tenant      ON trips(tenant_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_dev  ON alert_events(device_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_ten  ON alert_events(tenant_id, is_read, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_cmd_queue_device  ON command_queue(device_id, status);
CREATE INDEX IF NOT EXISTS idx_sub_user_status   ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_device  ON analytics(device_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user        ON audit_logs(user_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_device       ON fuel_data(device_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_driver_scores     ON driver_scores(driver_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user     ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_login_logs        ON login_logs(user_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user        ON notifications(user_id, is_read);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO device_models (name, brand, protocol, supported_commands) VALUES
  ('GT06N', 'Concox', 'GT06', ARRAY['IGNITION_OFF','IGNITION_ON','REBOOT','FACTORY_RESET']),
  ('GT06E', 'Concox', 'GT06', ARRAY['IGNITION_OFF','IGNITION_ON','REBOOT']),
  ('FMB920', 'Teltonika', 'TELTONIKA', ARRAY['IGNITION_OFF','IGNITION_ON','REBOOT','SET_APN']),
  ('FMB125', 'Teltonika', 'TELTONIKA', ARRAY['IGNITION_OFF','IGNITION_ON','REBOOT','SET_APN','FUEL_READ']),
  ('TK103B', 'GPS-Tracker', 'TK103', ARRAY['IGNITION_OFF','IGNITION_ON','REBOOT'])
ON CONFLICT DO NOTHING;

INSERT INTO plans (name, price_monthly, price_yearly, duration_days, max_devices, max_users, features, description, sort_order) VALUES
  ('Basic',      49900,  499900, 30,  5,   3,  '{"reports":true,"alerts":true,"geofences":false,"driver_score":false}', 'Up to 5 vehicles, basic tracking', 1),
  ('Standard',   99900,  999900, 30,  25,  10, '{"reports":true,"alerts":true,"geofences":true,"driver_score":true}',  'Up to 25 vehicles, full features', 2),
  ('Enterprise', 249900, 2499900,30,  200, 50, '{"reports":true,"alerts":true,"geofences":true,"driver_score":true,"white_label":true,"api_access":true}', 'Unlimited, white-label ready', 3)
ON CONFLICT DO NOTHING;

INSERT INTO system_controls (key, value, description) VALUES
  ('IGNITION_COMMANDS_ENABLED', 'true', 'Master switch for ignition cut commands'),
  ('MAINTENANCE_MODE', 'false', 'Put system in read-only maintenance mode'),
  ('GRACE_PERIOD_DAYS', '7', 'Grace period days after subscription expiry'),
  ('MAX_SPEED_THRESHOLD', '120', 'Overspeed alert threshold km/h'),
  ('ALERT_COOLDOWN_DEFAULT', '15', 'Default alert cooldown minutes')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, password, role) VALUES
  ('Super Admin', 'superadmin@gps.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJobKChq5HfJl65mQX6.I9wm', 'SUPER_ADMIN'),
  ('System Admin', 'admin@gps.local',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJobKChq5HfJl65mQX6.I9wm', 'ADMIN')
ON CONFLICT DO NOTHING;
-- Default password: Admin@123  (CHANGE AFTER FIRST LOGIN)

