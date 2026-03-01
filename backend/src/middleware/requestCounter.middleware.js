const { apiRequests } = require("../monitoring/metrics");

module.exports = (req, res, next) => {
  apiRequests.inc();
  next();
};