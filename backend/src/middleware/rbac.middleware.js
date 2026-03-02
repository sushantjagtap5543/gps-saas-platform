const logger = require("../utils/logger");

exports.authorize = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!roles.includes(req.user.role)) {
    logger.warn(`[RBAC] Denied: ${req.user.role} tried ${req.method} ${req.path}`);
    return res.status(403).json({ message: "Insufficient permissions for this action" });
  }
  next();
};
