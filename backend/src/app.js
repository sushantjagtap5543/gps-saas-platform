require("dotenv").config();
const express        = require("express");
const cors           = require("cors");
const helmet         = require("helmet");
const mongoSanitize  = require("express-mongo-sanitize");
const rateLimit      = require("express-rate-limit");
const morgan         = require("morgan");
const logger         = require("./utils/logger");

const app = express();

// ── Security headers ───────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({
  origin:      corsOrigin,
  credentials: true,
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// ── Raw body for Razorpay webhook (MUST come before json()) ───
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── NoSQL injection protection ────────────────────────────────
app.use(mongoSanitize());

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            300,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { message: "Too many requests, please slow down." }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      30,
  message:  { message: "Too many login attempts." }
});

app.use(limiter);

// ── HTTP request logging ──────────────────────────────────────
app.use(morgan("combined", {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// ── Prometheus request counter ────────────────────────────────
app.use(require("./middleware/requestCounter.middleware"));

// ── Health & metrics (no auth) ────────────────────────────────
app.use("/health",  require("./routes/health.routes"));
app.use("/metrics", require("./routes/metrics.routes"));

// ── API routes ─────────────────────────────────────────────────
app.use("/api/auth",      authLimiter, require("./routes/auth.routes"));
app.use("/api/devices",               require("./routes/device.routes"));
app.use("/api/billing",               require("./routes/billing.routes"));
app.use("/api/geofences",             require("./modules/geofence/geofence.routes"));
app.use("/api/branding",              require("./modules/branding/branding.routes"));
app.use("/api/alerts",                require("./routes/alert.routes"));
app.use("/api/analytics",             require("./routes/analytics.routes"));
app.use("/api/commands",              require("./routes/command.routes"));
app.use("/api/support",              require("./routes/support.routes"));
app.use("/api/admin",                 require("./routes/admin.routes"));

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ message: "Route not found" })
);

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error("[ERROR] " + err.message + " — " + req.method + " " + req.path);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;

