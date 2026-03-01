require("dotenv").config();
const Redis = require("ioredis");
const db = require("../../models");
const geofenceService = require("./geofence.service");
const logger = require("../../utils/logger");
const { gpsPacketsProcessed } = require("../../monitoring/metrics");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (t) => Math.min(t * 200, 5000)
});

// Separate publisher connection (best practice: don't reuse subscriber connection)
const publisher = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (t) => Math.min(t * 200, 5000)
});

async function processGPS() {
  logger.info("[GPS WORKER] Started");
  while (true) {
    try {
      const result = await redis.blpop("gps_queue", 5);
      if (!result) continue;

      const payload = JSON.parse(result[1]);
      const { imei, latitude, longitude, speed, heading, timestamp } = payload;
      if (!imei || latitude == null || longitude == null) continue;

      const device = await db.Device.findOne({ where: { imei } });
      if (!device) { logger.warn("[GPS WORKER] Unknown IMEI: " + imei); continue; }

      // Upsert live location
      await db.GpsLive.upsert(
        { device_id: device.id, latitude, longitude, speed: speed || 0, heading: heading || 0 },
        { conflictFields: ["device_id"] }
      );

      // Store history
      await db.GpsHistory.create({ device_id: device.id, latitude, longitude, speed: speed || 0, heading: heading || 0 });

      // Update device status
      await device.update({ status: "online", last_seen: new Date() });

      // Check geofences and overspeed (will publish alerts via Redis)
      await geofenceService.processLocation(device, latitude, longitude, speed || 0);

      // Relay location update to socket.io via Redis pub/sub (child process safe)
      const locationEvent = {
        deviceId: device.id,
        data: { device_id: device.id, imei, latitude, longitude, speed, heading, timestamp }
      };
      await publisher.publish("socket:location", JSON.stringify(locationEvent));

      // Push analytics data to its own queue so analytics worker gets every packet
      const analyticsPayload = {
        device_id: device.id,
        tenant_id: device.tenant_id,
        imei,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        timestamp
      };
      await publisher.lpush("gps_analytics_queue", JSON.stringify(analyticsPayload));

      gpsPacketsProcessed.inc();
    } catch (err) {
      if (!err.message.includes("Connection is closed")) {
        logger.error("[GPS WORKER] " + err.message);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

processGPS();

process.on("SIGTERM", () => {
  redis.disconnect();
  publisher.disconnect();
  process.exit(0);
});
