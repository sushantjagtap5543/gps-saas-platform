const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const db   = require("../models");

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const deviceIds = (await db.Device.findAll({ where: { tenant_id: req.user.id }, attributes: ["id"] })).map(d => d.id);
    const alerts = await db.AlertEvent.findAll({
      where: { device_id: deviceIds },
      order: [["createdAt","DESC"]], limit: 100,
      include: [{ model: db.Device, attributes: ["vehicle_number","imei"] }]
    });
    return res.json(alerts);
  } catch { return res.status(500).json({ message: "Failed to fetch alerts" }); }
});

router.put("/:id/read", async (req, res) => {
  try {
    await db.AlertEvent.update({ is_read: true }, { where: { id: req.params.id } });
    return res.json({ message: "Marked as read" });
  } catch { return res.status(500).json({ message: "Failed to update alert" }); }
});

module.exports = router;
