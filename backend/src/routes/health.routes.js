const router  = require("express").Router();
const { sequelize } = require("../models");
const redis   = require("../config/redis");

router.get("/", async (req, res) => {
  const checks = { status: "OK", timestamp: new Date(), uptime: process.uptime() };
  try { await sequelize.authenticate(); checks.postgres = "connected"; }
  catch { checks.postgres = "disconnected"; checks.status = "DEGRADED"; }
  try { await redis.ping(); checks.redis = "connected"; }
  catch { checks.redis = "disconnected"; checks.status = "DEGRADED"; }
  res.status(checks.status === "OK" ? 200 : 503).json(checks);
});

module.exports = router;
