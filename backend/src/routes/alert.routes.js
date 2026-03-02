const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const db     = require("../models");
const { Op } = require("sequelize");

router.use(authenticate);

// Alert events
router.get("/events", async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, is_read, device_id } = req.query;
    const where = { tenant_id: req.user.id };
    if (severity)  where.severity = severity;
    if (is_read !== undefined) where.is_read = is_read === "true";
    if (device_id) where.device_id = device_id;
    const { count, rows } = await db.AlertEvent.findAndCountAll({
      where,
      include: [{ model: db.Device, as: "alertEvents" ? undefined : undefined, attributes: ["id","vehicle_number","imei"] }],
      order: [["createdAt","DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    return res.json({ total: count, alerts: rows });
  } catch (err) { return res.status(500).json({ message: "Failed: " + err.message }); }
});

router.put("/events/:id/read", async (req, res) => {
  try {
    const alert = await db.AlertEvent.findOne({ where: { id: req.params.id, tenant_id: req.user.id } });
    if (!alert) return res.status(404).json({ message: "Not found" });
    await alert.update({ is_read: true });
    return res.json({ message: "Marked as read" });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

router.put("/events/read-all", async (req, res) => {
  try {
    await db.AlertEvent.update({ is_read: true }, { where: { tenant_id: req.user.id, is_read: false } });
    return res.json({ message: "All marked as read" });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

router.get("/unread-count", async (req, res) => {
  try {
    const count = await db.AlertEvent.count({ where: { tenant_id: req.user.id, is_read: false } });
    return res.json({ count });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

// Alert rules
router.get("/rules", async (req, res) => {
  const rules = await db.AlertRule.findAll({ where: { tenant_id: req.user.id }, order: [["createdAt","DESC"]] });
  return res.json(rules);
});

router.post("/rules", async (req, res) => {
  try {
    const { name, type, conditions, severity, channels, cooldown_min, device_id } = req.body;
    if (!name || !type) return res.status(400).json({ message: "Name and type required" });
    const rule = await db.AlertRule.create({ tenant_id: req.user.id, name, type, conditions, severity, channels, cooldown_min, device_id });
    return res.status(201).json(rule);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.put("/rules/:id", async (req, res) => {
  try {
    const rule = await db.AlertRule.findOne({ where: { id: req.params.id, tenant_id: req.user.id } });
    if (!rule) return res.status(404).json({ message: "Not found" });
    await rule.update(req.body);
    return res.json(rule);
  } catch { return res.status(500).json({ message: "Failed" }); }
});

router.delete("/rules/:id", async (req, res) => {
  try {
    const rule = await db.AlertRule.findOne({ where: { id: req.params.id, tenant_id: req.user.id } });
    if (!rule) return res.status(404).json({ message: "Not found" });
    await rule.destroy();
    return res.json({ message: "Rule deleted" });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

module.exports = router;
