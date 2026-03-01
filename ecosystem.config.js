module.exports = {
  apps: [
    {
      name: "backend",
      script: "./backend/src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "tcp-server",
      script: "./tcp-server/src/server.js"
    },
    {
      name: "notification-worker",
      script: "./notifications/worker.js"
    }
  ]
};