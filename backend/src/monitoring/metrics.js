const client = require("prom-client");

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const activeDevices = new client.Gauge({
  name: "gps_active_devices",
  help: "Number of active devices"
});

const tcpConnections = new client.Gauge({
  name: "gps_tcp_connections",
  help: "Number of active TCP connections"
});

const apiRequests = new client.Counter({
  name: "gps_api_requests_total",
  help: "Total API requests"
});

module.exports = {
  client,
  activeDevices,
  tcpConnections,
  apiRequests
};