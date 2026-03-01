5️⃣ Device Limit Middleware
📂 subscription.middleware.js
const db = require("../../models");

module.exports = async (req, res, next) => {
  const subscription = await db.Subscription.findOne({
    where: { user_id: req.user.id, status: "active" }
  });

  if (!subscription) {
    return res.status(403).json({ error: "No active subscription" });
  }

  const deviceCount = await db.Device.count({
    where: { owner_id: req.user.id }
  });

  const plan = await db.Plan.findByPk(subscription.plan_id);

  if (deviceCount >= plan.device_limit) {
    return res.status(403).json({ error: "Device limit exceeded" });
  }

  next();
};