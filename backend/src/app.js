require("dotenv").config();
const express       = require("express");
const cors          = require("cors");
const helmet        = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss           = require("xss-clean");
const rateLimit     = require("express-rate-limit");
const morgan        = require("morgan");
const logger        = require("./utils/logger");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());

const limiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 });
app.use(limiter);
app.use(morgan("combined", { stream: { write: (m) => logger.info(m.trim()) } }));
app.use(require("./middleware/requestCounter.middleware"));

app.use("/health",        require("./routes/health.routes"));
app.use("/metrics",       require("./routes/metrics.routes"));
app.use("/api/auth",      authLimiter, require("./routes/auth.routes"));
app.use("/api/devices",   require("./routes/device.routes"));
app.use("/api/billing",   require("./routes/billing.routes"));
app.use("/api/geofences", require("./modules/geofence/geofence.routes"));
app.use("/api/branding",  require("./modules/branding/branding.routes"));
app.use("/api/alerts",    require("./routes/alert.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
app.use("/api/commands",  require("./routes/command.routes"));
app.use("/api/admin",     require("./routes/admin.routes"));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

module.exports = app;
