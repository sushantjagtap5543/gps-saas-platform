const db           = require("../../models");
const alertService = require("./alert.service");
const logger       = require("../../utils/logger");

function isInsideCircle(lat, lng, cLat, cLng, radius) {
  const R    = 6371000;
  const dLat = (lat - cLat) * Math.PI / 180;
  const dLng = (lng - cLng) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(cLat * Math.PI / 180) *
               Math.cos(lat  * Math.PI / 180) *
               Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= radius;
}

function isInsidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    if (((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

exports.processLocation = async (device, lat, lng, speed) => {
  try {
    const fences = await db.GeoFence.findAll({
      where: { tenant_id: device.tenant_id, is_active: true }
    });

    for (const fence of fences) {
      const inside = fence.type === "circle"
        ? isInsideCircle(lat, lng, fence.center_lat, fence.center_lng, fence.radius)
        : isInsidePolygon(lat, lng, fence.polygon || []);

      if (inside) {
        await alertService.createAlert(
          device, "geofence_entry",
          `Device entered geofence: ${fence.name}`,
          lat, lng, "INFO"
        );
      }
    }

    const limit = parseInt(process.env.OVERSPEED_LIMIT) || 100;
    if (speed > limit) {
      await alertService.createAlert(
        device, "overspeed",
        `Overspeed: ${speed} km/h (limit ${limit})`,
        lat, lng, "WARNING"
      );
    }
  } catch (err) {
    logger.error("[GEOFENCE] " + err.message);
  }
};
