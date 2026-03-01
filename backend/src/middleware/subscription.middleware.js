const db = require("../models");

module.exports = async (req, res, next) => {

  const sub = await db.Subscription.findOne({
    where: { client_name: req.user.id, status: "ACTIVE" }
  });

  if (!sub) return res.status(403).json({ message: "Subscription Required" });

  next();
};