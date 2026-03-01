function isInsideCircle(lat, lng, centerLat, centerLng, radius) {
  const R = 6371000;
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLng = (lng - centerLng) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(centerLat * Math.PI/180) *
    Math.cos(lat * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return distance <= radius;
}

function isInsidePolygon(point, polygon) {
  let x = point.lat, y = point.lng;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].lat, yi = polygon[i].lng;
    let xj = polygon[j].lat, yj = polygon[j].lng;

    let intersect =
      ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = { isInsideCircle, isInsidePolygon };