require("dotenv").config();
const http   = require("http");
const app    = require("./app");
const { initSocket } = require("./socket/socket");
const { sequelize }  = require("./models");
const logger = require("./utils/logger");
require("./startup");

const PORT   = parseInt(process.env.API_PORT) || 3000;
const server = http.createServer(app);
initSocket(server);

async function start() {
  try {
    await sequelize.authenticate();
    logger.info("[DB] PostgreSQL connected");
    server.listen(PORT, () => logger.info("[SERVER] Running on port " + PORT));
  } catch (err) {
    logger.error("[FATAL] " + err.message);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  server.close(async () => { await sequelize.close(); process.exit(0); });
});
process.on("unhandledRejection", (r) => logger.error("[UNHANDLED] " + r));

start();
