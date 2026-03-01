require("dotenv").config();
const Redis = require("ioredis");
const db = require("../../models");
const geofenceService = require("./geofence.service");
const { emitLocationUpdate } = require("../../socket/socket");
const logger = require("../../utils/logger");
const { gpsPacketsProcessed } = require("../../monitoring/metrics");

const redis = new Redis({ host: process.env.REDIS_HOST || "localhost", retryStrategy: (t) => Math.min(t*200, 5000) });

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
      await db.GpsLive.upsert({ device_id: device.id, latitude, longitude, speed: speed||0, heading: heading||0 }, { conflictFields: ["device_id"] });
      await db.GpsHistory.create({ device_id: device.id, latitude, longitude, speed: speed||0, heading: heading||0 });
      await device.update({ status: "online", last_seen: new Date() });
      await geofenceService.processLocation(device, latitude, longitude, speed||0);
      emitLocationUpdate(device.id, { device_id: device.id, imei, latitude, longitude, speed, heading, timestamp });
      gpsPacketsProcessed.inc();
    } catch (err) {
      if (!err.message.includes("Connection is closed")) logger.error("[GPS WORKER] " + err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
processGPS();
process.on("SIGTERM", () => { redis.disconnect(); process.exit(0); });
