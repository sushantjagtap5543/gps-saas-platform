const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { authorize }    = require("../middleware/rbac.middleware");
const cmdSvc           = require("../services/command.service");
const db               = require("../models");
const { Op }           = require("sequelize");

router.use(authenticate);

router.post("/send", authorize(["ADMIN","SUPER_ADMIN","TECHNICIAN"]), async (req, res) => {
  try {
    const { deviceId, commandName, otpVerified } = req.body;
    if (!deviceId || !commandName) return res.status(400).json({ message: "deviceId and commandName required" });
    const cmd = await cmdSvc.sendCommand({ deviceId, commandName, issuedBy: req.user.id, otpVerified });
    return res.status(201).json({ message: "Command queued", command: cmd });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.get("/device/:deviceId", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { count, rows } = await db.CommandQueue.findAndCountAll({
      where: { device_id: req.params.deviceId },
      order: [["createdAt","DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    return res.json({ total: count, commands: rows });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

router.delete("/:id/cancel", authorize(["ADMIN","SUPER_ADMIN"]), async (req, res) => {
  try {
    const cmd = await db.CommandQueue.findByPk(req.params.id);
    if (!cmd || cmd.status !== "PENDING") return res.status(400).json({ message: "Command cannot be cancelled" });
    await cmd.update({ status: "CANCELLED" });
    return res.json({ message: "Command cancelled" });
  } catch { return res.status(500).json({ message: "Failed" }); }
});

module.exports = router;
