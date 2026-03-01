const Redis = require("ioredis");
const logger = require("../utils/logger");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
});

redis.on("connect",  () => logger.info("[REDIS] Connected"));
redis.on("error",    (e) => logger.error("[REDIS] Error: " + e.message));
redis.on("reconnecting", () => logger.warn("[REDIS] Reconnecting..."));

module.exports = redis;
