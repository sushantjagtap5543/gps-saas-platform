require("dotenv").config();
const Redis = require("ioredis");
const db    = require("../../models");
const logger = require("../../utils/logger");

const redis = new Redis({ host: process.env.REDIS_HOST || "localhost", retryStrategy: (t) => Math.min(t*200, 5000) });

async function getPrev(deviceId) {
  try { const d = await redis.get("prev_loc:" + deviceId); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
async function setPrev(deviceId, data) {
  try { await redis.set("prev_loc:" + deviceId, JSON.stringify(data), "EX", 3600); }
  catch {}
}

function calcDriverScore({ harsh_brake_count, harsh_acceleration_count, overspeed_count }) {
  return Math.max(100 - harsh_brake_count*2 - harsh_acceleration_count*2 - overspeed_count*3, 0);
}

async function start() {
  logger.info("[ANALYTICS WORKER] Started");
  while (true) {
    try {
      const result = await redis.blpop("gps_queue", 5);
      if (!result) continue;
      const payload = JSON.parse(result[1]);
      const { device_id, tenant_id, speed } = payload;
      if (!device_id) continue;
      const prev = await getPrev(device_id);
      const accel = prev ? payload.speed - prev.speed : 0;
      const harshBrake = accel < -25 ? 1 : 0;
      const harshAccel = accel > 25 ? 1 : 0;
      const overspeed = speed > 100 ? 1 : 0;
      const existing = await db.Analytics.findOne({ where: { device_id, tenant_id }, order: [["createdAt","DESC"]] });
      const hb = (existing?.harsh_brake_count || 0) + harshBrake;
      const ha = (existing?.harsh_acceleration_count || 0) + harshAccel;
      const os = (existing?.overspeed_count || 0) + overspeed;
      await db.Analytics.create({ tenant_id, device_id, harsh_brake_count: hb, harsh_acceleration_count: ha, overspeed_count: os, driver_score: calcDriverScore({ harsh_brake_count: hb, harsh_acceleration_count: ha, overspeed_count: os }) });
      await setPrev(device_id, payload);
    } catch (err) {
      if (!err.message.includes("Connection is closed")) logger.error("[ANALYTICS WORKER] " + err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
start();
