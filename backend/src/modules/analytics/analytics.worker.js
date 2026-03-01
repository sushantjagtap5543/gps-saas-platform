const redis = require("../../config/redis");
const db = require("../../models");
const tripEngine = require("./trip.engine");
const driverEngine = require("./driverScore.engine");

let previousLocation = {};

async function start() {

  while (true) {

    const data = await redis.brpop("gps_queue", 0);
    const payload = JSON.parse(data[1]);

    const prev = previousLocation[payload.device_id];

    const harshEvent = driverEngine.detectHarsh(prev, payload);

    previousLocation[payload.device_id] = payload;

    // Save simplified analytics snapshot
    await db.Analytics.create({
      tenant_id: payload.tenant_id,
      device_id: payload.device_id,
      driver_score: 90
    });
  }
}

start();