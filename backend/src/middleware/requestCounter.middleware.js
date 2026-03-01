const { apiRequests } = require("../monitoring/metrics");

module.exports = (req, res, next) => {
  res.on("finish", () => {
    apiRequests.inc({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
  });
  next();
};
