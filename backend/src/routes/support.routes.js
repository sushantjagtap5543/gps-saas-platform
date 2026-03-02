const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const db     = require("../models");
const { Op } = require("sequelize");

router.use(authenticate);

router.get("/tickets", async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const isAdmin = ["ADMIN","SUPER_ADMIN"].includes(req.user.role);
    const where = isAdmin ? {} : { user_id: req.user.id };
    if (status) where.status = status;
    const { count, rows } = await db.SupportTicket.findAndCountAll({
      where,
      include: [{ model: db.User, as: undefined, foreignKey: "user_id", attributes: ["id","name","email"] }],
      order: [["createdAt","DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page)-1)*parseInt(limit)
    });
    return res.json({ total: count, tickets: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.post("/tickets", async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    if (!subject || !description) return res.status(400).json({ message: "Subject and description required" });
    const ticket = await db.SupportTicket.create({ user_id: req.user.id, subject, description, category, priority });
    return res.status(201).json(ticket);
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.put("/tickets/:id/status", async (req, res) => {
  try {
    const isAdmin = ["ADMIN","SUPER_ADMIN","SUPPORT"].includes(req.user.role);
    const where = isAdmin ? { id: req.params.id } : { id: req.params.id, user_id: req.user.id };
    const ticket = await db.SupportTicket.findOne({ where });
    if (!ticket) return res.status(404).json({ message: "Not found" });
    await ticket.update({ status: req.body.status, assigned_to: req.body.assigned_to });
    return res.json(ticket);
  } catch { return res.status(500).json({ message: "Failed" }); }
});

module.exports = router;
