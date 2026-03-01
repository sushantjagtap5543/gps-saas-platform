const client = require("prom-client");

client.collectDefaultMetrics({ prefix: "gps_" });

const activeDevices = new client.Gauge({
  name: "gps_active_devices_total",
  help: "Number of currently online devices"
});

const tcpConnections = new client.Gauge({
  name: "gps_tcp_connections_total",
  help: "Number of active TCP device connections"
});

const apiRequests = new client.Counter({
  name: "gps_api_requests_total",
  help: "Total API requests",
  labelNames: ["method", "route", "status"]
});

const gpsPacketsProcessed = new client.Counter({
  name: "gps_packets_processed_total",
  help: "Total GPS packets processed"
});

module.exports = { client, activeDevices, tcpConnections, apiRequests, gpsPacketsProcessed };
