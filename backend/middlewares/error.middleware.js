const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
};