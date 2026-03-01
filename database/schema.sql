-- GPS SaaS Complete Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('ADMIN','CLIENT','SUBUSER')),
  is_active BOOLEAN DEFAULT true,
  fcm_token VARCHAR(500),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  max_devices INTEGER DEFAULT 10,
  description TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  imei VARCHAR(20) UNIQUE NOT NULL,
  vehicle_number VARCHAR(20) NOT NULL,
  model VARCHAR(100),
  sim_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online','offline','inactive')),
  last_seen TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_live (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID UNIQUE NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  altitude REAL,
  satellites INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_history (
  id UUID DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed REAL,
  heading REAL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create 6 months of partitions
DO $$ DECLARE m RECORD;
BEGIN
  FOR m IN SELECT generate_series('2025-01-01'::date, '2026-06-01'::date, '1 month'::interval) AS month LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS gps_history_%s PARTITION OF gps_history FOR VALUES FROM (%L) TO (%L)',
      to_char(m.month, 'YYYY_MM'), m.month, m.month + interval '1 month');
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS command_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command_text TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'INFO',
  message TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_read BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('circle','polygon')),
  center_lat REAL, center_lng REAL, radius REAL,
  polygon JSONB,
  is_active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brandings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255), logo_url TEXT,
  primary_color VARCHAR(7), secondary_color VARCHAR(7),
  domain VARCHAR(255), support_email VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL, device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  trip_distance REAL, trip_duration REAL, idle_time REAL,
  harsh_brake_count INTEGER DEFAULT 0, harsh_acceleration_count INTEGER DEFAULT 0,
  overspeed_count INTEGER DEFAULT 0, driver_score REAL, maintenance_score REAL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255), ip_address VARCHAR(45), meta JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_devices_imei     ON devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_tenant   ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_user_status  ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_device     ON alert_events(device_id);
CREATE INDEX IF NOT EXISTS idx_analytics_device ON analytics(device_id, "createdAt" DESC);

-- Seed Plans
INSERT INTO plans (name, price, duration_days, max_devices, description) VALUES
  ('Basic',      49900,  30, 5,   'Up to 5 vehicles'),
  ('Standard',   99900,  30, 20,  'Up to 20 vehicles'),
  ('Enterprise', 249900, 30, 100, 'Unlimited vehicles')
ON CONFLICT DO NOTHING;

-- Seed Admin User (password: Admin@123 - CHANGE AFTER FIRST LOGIN)
INSERT INTO users (name, email, password, role) VALUES
  ('System Admin', 'admin@yourdomain.com',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN')
ON CONFLICT DO NOTHING;
