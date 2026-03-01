const db = require("../models");

module.exports = async (req, action) => {

  await db.AuditLog.create({
    user_id: req.user.id,
    action,
    ip: req.ip,
    user_agent: req.headers["user-agent"]
  });
};