const Redis  = require("ioredis");
const logger = require("../utils/logger");

const redisConfig = {
  host:               process.env.REDIS_HOST || "localhost",
  port:               parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy:      (times) => Math.min(times * 200, 5000),
  enableReadyCheck:   true,
  maxRetriesPerRequest: 3,
  lazyConnect:        false
};

const redis = new Redis(redisConfig);

redis.on("connect",      () => logger.info("[REDIS] Connected"));
redis.on("ready",        () => logger.info("[REDIS] Ready"));
redis.on("error",        (e) => logger.error("[REDIS] Error: " + e.message));
redis.on("reconnecting", () => logger.warn("[REDIS] Reconnecting..."));
redis.on("close",        () => logger.warn("[REDIS] Connection closed"));

module.exports = redis;
