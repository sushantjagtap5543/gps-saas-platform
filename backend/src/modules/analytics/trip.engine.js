exports.detectTrip = (prev, current) => {

  if (!prev) return null;

  const moving = current.speed > 5;

  if (moving && prev.speed <= 5) {
    return { event: "trip_start" };
  }

  if (!moving && prev.speed > 5) {
    return { event: "trip_end" };
  }

  return null;
};