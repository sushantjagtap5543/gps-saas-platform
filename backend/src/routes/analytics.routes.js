const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const db   = require("../models");

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const data = await db.Analytics.findAll({ where: { tenant_id: req.user.id }, order: [["createdAt","DESC"]], limit: 100 });
    return res.json(data);
  } catch { return res.status(500).json({ message: "Failed to fetch analytics" }); }
});

module.exports = router;
