CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX idx_gps_history_device_id ON gps_history(device_id);
CREATE INDEX idx_device_imei ON devices(imei);
CREATE INDEX idx_command_device_id ON command_logs(device_id);

CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_device_owner ON devices(owner_id);
CREATE INDEX idx_alert_device ON alert_events(device_id);