exports.detectDeviation = (plannedRoute, currentLocation) => {

  if (!plannedRoute) return false;

  // Basic proximity check
  const threshold = 500; // meters

  const distance = Math.sqrt(
    Math.pow(plannedRoute.lat - currentLocation.lat, 2) +
    Math.pow(plannedRoute.lng - currentLocation.lng, 2)
  );

  return distance > threshold;
};