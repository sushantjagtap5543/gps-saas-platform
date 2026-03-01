require("./jobs/subscription.job");
require("./jobs/health.job");
require("./modules/geofence/gps.worker");
require("./modules/analytics/analytics.worker");

require("./utils/logger").info("[STARTUP] All workers and jobs initialised");
