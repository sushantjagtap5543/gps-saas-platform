const db = require("../models");

module.exports = async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") return next();

    const sub = await db.Subscription.findOne({
      where: { user_id: req.user.id, status: "ACTIVE" }
    });

    if (!sub) {
      return res.status(403).json({
        message: "Active subscription required",
        code:    "SUBSCRIPTION_REQUIRED"
      });
    }

    if (new Date(sub.end_date) < new Date()) {
      await sub.update({ status: "EXPIRED" });
      return res.status(403).json({
        message: "Subscription expired",
        code:    "SUBSCRIPTION_EXPIRED"
      });
    }

    req.subscription = sub;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Subscription check failed" });
  }
};
