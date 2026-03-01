const router = require("express").Router();

router.get("/", async (req, res) => {
  const checks = { status: "OK", timestamp: new Date(), uptime: Math.floor(process.uptime()) + "s" };

  try {
    const { sequelize } = require("../models");
    await sequelize.query("SELECT 1");
    checks.postgres = "connected";
  } catch (err) {
    checks.postgres = "disconnected";
    checks.postgres_error = err.message;
    checks.status = "DEGRADED";
  }

  try {
    const redis = require("../config/redis");
    const pong  = await redis.ping();
    checks.redis = pong === "PONG" ? "connected" : "error";
  } catch (err) {
    checks.redis = "disconnected";
    checks.status = "DEGRADED";
  }

  // Always return 200 so nginx upstream doesn't fail — let Prometheus alert on DEGRADED
  res.status(200).json(checks);
});

module.exports = router;
