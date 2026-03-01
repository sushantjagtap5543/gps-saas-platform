const db = require("../../models");
const Redis = require("ioredis");
const logger = require("../../utils/logger");

// Use Redis pub/sub to relay alerts to socket.io in main process
// (alert.service is called from forked GPS worker — io is null there)
const publisher = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (t) => Math.min(t * 200, 5000)
});

exports.createAlert = async (device, type, message, lat, lng, severity = "INFO") => {
  try {
    const alert = await db.AlertEvent.create({
      device_id: device.id, type, message, severity, latitude: lat, longitude: lng
    });

    const alertData = {
      id: alert.id, device_id: device.id, type, message, severity,
      latitude: lat, longitude: lng, timestamp: new Date()
    };

    // Publish alert event so socket.io main process can relay to client
    await publisher.publish("socket:alert", JSON.stringify({
      userId: device.tenant_id,
      data: alertData
    }));

    // Also push to notification queue (for FCM push)
    try {
      const user = await db.User.findByPk(device.tenant_id, { attributes: ["fcm_token"] });
      if (user?.fcm_token) {
        await publisher.lpush("alert_queue", JSON.stringify({
          fcm_token: user.fcm_token, type, message
        }));
      }
    } catch (e) {
      logger.warn("[ALERT SERVICE] Could not push FCM notification: " + e.message);
    }

    return alert;
  } catch (err) {
    logger.error("[ALERT SERVICE] " + err.message);
  }
};
