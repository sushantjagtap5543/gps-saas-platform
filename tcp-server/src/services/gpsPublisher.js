require("dotenv").config();
const Redis = require("ioredis");

const redis = new Redis({ host: process.env.REDIS_HOST || "localhost", retryStrategy: (t) => Math.min(t*200, 5000) });
redis.on("error", (e) => console.error("[GPS PUBLISHER] Redis error:", e.message));

module.exports = async function publishGPS(data) {
  try {
    await redis.lpush("gps_queue", JSON.stringify({
      imei: data.imei, latitude: data.latitude, longitude: data.longitude,
      speed: data.speed, heading: data.heading, timestamp: data.timestamp || Date.now()
    }));
  } catch (err) { console.error("[GPS PUBLISHER] Failed:", err.message); }
};
