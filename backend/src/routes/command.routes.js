const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const commandService = require("../services/command.service");
const db = require("../models");

router.use(auth);

router.post("/:deviceId/send", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ message: "command required" });
    const device = await db.Device.findOne({ where: { id: req.params.deviceId, tenant_id: req.user.id } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    const log = await commandService.sendCommand(device.id, command, req.user.id);
    return res.json(log);
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.get("/:deviceId/logs", async (req, res) => {
  try {
    const logs = await db.CommandLog.findAll({ where: { device_id: req.params.deviceId }, order: [["createdAt","DESC"]], limit: 50 });
    return res.json(logs);
  } catch { return res.status(500).json({ message: "Failed to fetch logs" }); }
});

module.exports = router;
