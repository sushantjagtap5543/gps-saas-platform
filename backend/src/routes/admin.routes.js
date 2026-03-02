const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize }    = require("../middleware/rbac.middleware");
const db               = require("../models");
const { Op }           = require("sequelize");
const logger           = require("../utils/logger");

const isAdmin = [authenticate, authorize(["ADMIN","SUPER_ADMIN","RESELLER"])];

// ── DASHBOARD STATS ────────────────────────────────────────
router.get("/stats", isAdmin, async (req, res) => {
  try {
    const filter = req.user.role === "SUPER_ADMIN" ? {} : { reseller_id: req.user.id };
    const userFilter = req.user.role === "SUPER_ADMIN" ? {} : { reseller_id: req.user.id };

    const [totalDevices, onlineDevices, totalClients, alertsToday,
           expiringSoon, activeSubs] = await Promise.all([
      db.Device.count({ where: filter }),
      db.Device.count({ where: { ...filter, status: "ONLINE" } }),
      db.User.count({ where: { ...userFilter, role: "CLIENT" } }),
      db.AlertEvent.count({
        where: {
          createdAt: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) }
        }
      }),
      db.Subscription.count({
        where: {
          status: "ACTIVE",
          end_date: { [Op.lte]: new Date(Date.now() + 7 * 86400000) }
        }
      }),
      db.Subscription.count({ where: { status: "ACTIVE" } })
    ]);

    return res.json({
      totalDevices, onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      totalClients, alertsToday, expiringSoon, activeSubs
    });
  } catch (err) {
    logger.error("[ADMIN] stats: " + err.message);
    return res.status(500).json({ message: "Failed to load stats" });
  }
});

// ── USER MANAGEMENT ────────────────────────────────────────
router.get("/users", isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const where = req.user.role === "SUPER_ADMIN" ? {} : { reseller_id: req.user.id };
    if (role) where.role = role;
    if (search) where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ["password","otp_secret"] },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["createdAt","DESC"]]
    });
    return res.json({ total: count, page: parseInt(page), users: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed" });
  }
});

router.get("/users/:id", isAdmin, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id, {
      attributes: { exclude: ["password","otp_secret"] },
      include: [
        { model: db.Subscription, as: "subscriptions", include: [{ model: db.Plan, as: "plan" }] },
        { model: db.Device, as: "devices" }
      ]
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch { return res.status(500).json({ message: "Failed" }); }
});

router.put("/users/:id/toggle", isAdmin, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });
    await user.update({ is_active: !user.is_active });
    return res.json({ message: `User ${user.is_active ? "activated" : "suspended"}` });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

// ── DEVICE MANAGEMENT ─────────────────────────────────────
router.get("/devices", isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const where = req.user.role === "SUPER_ADMIN" ? {} : { reseller_id: req.user.id };
    if (status) where.status = status;
    if (search) where[Op.or] = [
      { imei: { [Op.iLike]: `%${search}%` } },
      { vehicle_number: { [Op.iLike]: `%${search}%` } }
    ];
    const { count, rows } = await db.Device.findAndCountAll({
      where,
      include: [
        { model: db.GpsLive, as: "liveData" },
        { model: db.User, as: "tenant", attributes: ["id","name","email"] }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["createdAt","DESC"]]
    });
    return res.json({ total: count, page: parseInt(page), devices: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed" });
  }
});

// ── SUBSCRIPTIONS MANAGEMENT ───────────────────────────────
router.get("/subscriptions", isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = status ? { status } : {};
    const { count, rows } = await db.Subscription.findAndCountAll({
      where,
      include: [
        { model: db.User, attributes: ["id","name","email"] },
        { model: db.Plan, as: "plan" }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["createdAt","DESC"]]
    });
    return res.json({ total: count, page: parseInt(page), subscriptions: rows });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

router.post("/subscriptions/:id/extend", [authenticate, authorize(["ADMIN","SUPER_ADMIN"])], async (req, res) => {
  try {
    const { days } = req.body;
    const sub = await db.Subscription.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ message: "Not found" });
    const newEnd = new Date(sub.end_date);
    newEnd.setDate(newEnd.getDate() + parseInt(days));
    await sub.update({ end_date: newEnd, status: "ACTIVE" });
    return res.json({ message: `Extended by ${days} days`, end_date: newEnd });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

// ── PLANS ─────────────────────────────────────────────────
router.get("/plans",     isAdmin, async (req, res) => {
  const plans = await db.Plan.findAll({ order: [["sort_order","ASC"]] });
  return res.json(plans);
});

router.post("/plans",    [authenticate, authorize(["SUPER_ADMIN"])], async (req, res) => {
  try {
    const plan = await db.Plan.create(req.body);
    return res.status(201).json(plan);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.put("/plans/:id", [authenticate, authorize(["SUPER_ADMIN"])], async (req, res) => {
  try {
    const plan = await db.Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: "Not found" });
    await plan.update(req.body);
    return res.json(plan);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// ── AUDIT LOGS ─────────────────────────────────────────────
router.get("/audit", isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { count, rows } = await db.AuditLog.findAndCountAll({
      include: [{ model: db.User, attributes: ["id","name","email"] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["createdAt","DESC"]]
    });
    return res.json({ total: count, logs: rows });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

// ── SYSTEM CONTROLS ────────────────────────────────────────
router.get("/system-controls", [authenticate, authorize(["SUPER_ADMIN"])], async (req, res) => {
  const controls = await db.SystemControl.findAll();
  return res.json(controls);
});

router.put("/system-controls/:key", [authenticate, authorize(["SUPER_ADMIN"])], async (req, res) => {
  try {
    const { value } = req.body;
    const [ctrl] = await db.SystemControl.upsert({ key: req.params.key, value, updated_by: req.user.id });
    return res.json(ctrl);
  } catch { return res.status(500).json({ message: "Failed" }); }
});

module.exports = router;
