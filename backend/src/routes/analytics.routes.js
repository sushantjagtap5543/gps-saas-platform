const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const db     = require("../models");
const { Op } = require("sequelize");

router.use(authenticate);

router.get("/fleet-summary", async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000);
    const analytics = await db.Analytics.findAll({
      where: {
        tenant_id: req.user.id,
        date: { [Op.gte]: since }
      },
      order: [["date","ASC"]]
    });
    const totals = analytics.reduce((acc, a) => ({
      distance: acc.distance + (a.trip_distance || 0),
      trips:    acc.trips    + (a.trip_count || 0),
      idle:     acc.idle     + (a.idle_time || 0),
      fuel:     acc.fuel     + (a.fuel_consumed || 0),
      harshBrakes: acc.harshBrakes + (a.harsh_brake_count || 0),
      harshAccel:  acc.harshAccel  + (a.harsh_acceleration_count || 0)
    }), { distance: 0, trips: 0, idle: 0, fuel: 0, harshBrakes: 0, harshAccel: 0 });

    return res.json({ period_days: days, totals, daily: analytics });
  } catch (err) { return res.status(500).json({ message: "Failed: " + err.message }); }
});

router.get("/driver-scores", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000);
    const scores = await db.DriverScore.findAll({
      where: { date: { [Op.gte]: since } },
      include: [{ model: db.User, as: undefined, foreignKey: "driver_id", attributes: ["id","name"] }],
      order: [["date","DESC"]],
      limit: 100
    });
    return res.json(scores);
  } catch (err) { return res.status(500).json({ message: "Failed" }); }
});

router.get("/trips", async (req, res) => {
  try {
    const { from, to, device_id, page = 1, limit = 20 } = req.query;
    const where = { tenant_id: req.user.id };
    if (device_id) where.device_id = device_id;
    if (from) where.start_time = { [Op.gte]: new Date(from) };
    if (to)   where.start_time = { ...(where.start_time || {}), [Op.lte]: new Date(to) };
    const { count, rows } = await db.Trip.findAndCountAll({
      where,
      order: [["start_time","DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    return res.json({ total: count, trips: rows });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

module.exports = router;
