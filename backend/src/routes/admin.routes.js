const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const rbac = require("../middleware/rbac.middleware");
const db   = require("../models");

router.use(auth, rbac(["ADMIN"]));

router.get("/users", async (req, res) => {
  try {
    const users = await db.User.findAll({ attributes: { exclude: ["password"] }, include: [{ model: db.Subscription, include: [db.Plan] }] });
    return res.json(users);
  } catch { return res.status(500).json({ message: "Failed to fetch users" }); }
});

router.put("/users/:id/active", async (req, res) => {
  try {
    await db.User.update({ is_active: req.body.is_active }, { where: { id: req.params.id } });
    return res.json({ message: "Updated" });
  } catch { return res.status(500).json({ message: "Failed to update user" }); }
});

router.get("/stats", async (req, res) => {
  try {
    const [users, devices, activeSubs] = await Promise.all([
      db.User.count(),
      db.Device.count(),
      db.Subscription.count({ where: { status: "ACTIVE" } })
    ]);
    return res.json({ users, devices, activeSubs });
  } catch { return res.status(500).json({ message: "Failed to fetch stats" }); }
});

module.exports = router;
