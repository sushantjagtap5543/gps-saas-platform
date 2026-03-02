const { createLogger, format, transports } = require("winston");
module.exports = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)),
  transports: [new transports.Console()]
});
