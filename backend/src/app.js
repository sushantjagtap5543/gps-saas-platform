const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

app.use(mongoSanitize());
app.use(xss());

require("./security/helmet")(app);
app.use(require("./middleware/requestCounter.middleware"));
app.use(require("./middleware/requestCounter.middleware"));
app.use("/api/billing", require("./routes/billing.routes"));
app.use('/health', require('./routes/health.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/devices', require('./routes/device.routes'));
app.use(require("./security/rateLimit")); 
app.use("/api/branding", require("./modules/branding/branding.routes"));



module.exports = app;
