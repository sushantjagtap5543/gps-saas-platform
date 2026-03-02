const db = require("../models");
const logger = require("../utils/logger");

/**
 * Rule-based AI driver scoring — no paid APIs
 * Score 0–100 (100 = perfect driver)
 */
exports.calculateScore = (tripData) => {
  const {
    harsh_brakes = 0,
    harsh_accel  = 0,
    overspeed_sec = 0,
    idle_sec      = 0,
    distance_km   = 0,
    duration_sec  = 0
  } = tripData;

  if (distance_km < 0.5 || duration_sec < 60) return null; // Too short to score

  let score = 100;

  // Speed score: deduct 2pt per overspeed minute
  const overspeedMin = overspeed_sec / 60;
  const speedDeduction = Math.min(30, overspeedMin * 2);
  const speed_score = Math.max(0, 100 - speedDeduction);

  // Brake score: deduct 5pt per harsh brake per 10km
  const brakeRate = harsh_brakes / Math.max(distance_km / 10, 1);
  const brake_score = Math.max(0, 100 - brakeRate * 5);

  // Acceleration score: deduct 4pt per harsh accel per 10km
  const accelRate = harsh_accel / Math.max(distance_km / 10, 1);
  const accel_score = Math.max(0, 100 - accelRate * 4);

  // Idle score: deduct if idle > 15% of trip time
  const idlePct = (idle_sec / duration_sec) * 100;
  const idle_score = Math.max(0, 100 - Math.max(0, idlePct - 15) * 2);

  // Weighted overall score
  score = Math.round(
    speed_score * 0.35 +
    brake_score * 0.30 +
    accel_score * 0.25 +
    idle_score  * 0.10
  );

  return { overall_score: score, speed_score: Math.round(speed_score), brake_score: Math.round(brake_score), accel_score: Math.round(accel_score), idle_score: Math.round(idle_score) };
};

exports.updateDailyScore = async (driverId, deviceId, date, tripData) => {
  try {
    const scores = exports.calculateScore(tripData);
    if (!scores) return null;
    const [record] = await db.DriverScore.upsert({
      driver_id:     driverId,
      device_id:     deviceId,
      date,
      ...scores,
      distance_km:   tripData.distance_km,
      driving_time:  tripData.duration_sec,
      harsh_brakes:  tripData.harsh_brakes,
      harsh_accels:  tripData.harsh_accel,
      overspeed_sec: tripData.overspeed_sec,
      idle_sec:      tripData.idle_sec,
      trips_count:   1
    });
    return record;
  } catch (err) {
    logger.error("[DRIVER_SCORE] " + err.message);
  }
};
