// PM2 config (alternative to Docker for single-server deploy)
module.exports = {
  apps: [
    { name: "backend", script: "./backend/src/server.js", instances: "max", exec_mode: "cluster", env: { NODE_ENV: "production" } },
    { name: "tcp-server", script: "./tcp-server/src/server.js", instances: 1 },
    { name: "notifications", script: "./notifications/worker.js", instances: 1 }
  ]
};
