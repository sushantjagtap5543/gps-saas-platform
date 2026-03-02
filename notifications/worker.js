require("dotenv").config();
const Redis  = require("ioredis");
const { init, sendPush } = require("./push/firebase");

init();

const redis = new Redis({ host: process.env.REDIS_HOST || "localhost", retryStrategy: (t) => Math.min(t*200, 5000) });

console.log("[NOTIFICATIONS] Worker started");

async function processAlerts() {
  while (true) {
    try {
      const result = await redis.blpop("alert_queue", 5);
      if (!result) continue;
      const alert = JSON.parse(result[1]);
      if (alert.fcm_token && alert.message) {
        await sendPush(alert.fcm_token, "GPS Alert: " + alert.type, alert.message);
        console.log("[NOTIFY] Sent push for:", alert.type);
      }
    } catch (err) {
      if (!err.message.includes("Connection is closed")) console.error("[NOTIFY]", err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

processAlerts();
process.on("SIGTERM", () => { redis.disconnect(); process.exit(0); });
