const Redis = require("ioredis");
const redis = new Redis({ host: process.env.REDIS_HOST });

module.exports = async function publishGPS(data) {
  await redis.lpush("gps_queue", JSON.stringify(data));
};