const router = require("express").Router();

router.get("/", async (req, res) => {
  const result = {
    status:    "OK",
    timestamp: new Date(),
    uptime:    Math.floor(process.uptime()) + "s",
    memory:    process.memoryUsage().rss
  };

  // PostgreSQL check
  try {
    const { sequelize } = require("../models");
    await sequelize.query("SELECT 1");
    result.postgres = "connected";
  } catch (err) {
    result.postgres       = "disconnected";
    result.postgres_error = err.message;
    result.status         = "DEGRADED";
  }

  // Redis check
  try {
    const redis = require("../config/redis");
    const pong  = await redis.ping();
    result.redis = pong === "PONG" ? "connected" : "error";
  } catch (err) {
    result.redis  = "disconnected";
    result.status = "DEGRADED";
  }

  // Always 200 — nginx/load balancer determines health from the status field
  res.status(200).json(result);
});

module.exports = router;
