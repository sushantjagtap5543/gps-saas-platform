exports.calculateDriverScore = (data) => {

  let score = 100;

  score -= data.harsh_brake_count * 2;
  score -= data.harsh_acceleration_count * 2;
  score -= data.overspeed_count * 3;

  return Math.max(score, 0);
};

exports.detectHarsh = (prev, current) => {

  if (!prev) return null;

  const accel = current.speed - prev.speed;

  if (accel > 25) return "harsh_acceleration";
  if (accel < -25) return "harsh_brake";

  return null;
};