exports.calculateMaintenanceScore = (deviceStats) => {

  let score = 100;

  if (deviceStats.total_distance > 100000) score -= 20;
  if (deviceStats.engine_hours > 2000) score -= 20;

  return Math.max(score, 0);
};