const db = require("../../models");
const { isInsideCircle, isInsidePolygon } = require("./geo.utils");
const alertService = require("./alert.service");

exports.processLocation = async (device, lat, lng, speed) => {

  const fences = await db.GeoFence.findAll({
    where: { tenant_id: device.tenant_id }
  });

  for (const fence of fences) {

    let inside = false;

    if (fence.type === "circle") {
      inside = isInsideCircle(
        lat,
        lng,
        fence.center_lat,
        fence.center_lng,
        fence.radius
      );
    }

    if (fence.type === "polygon") {
      inside = isInsidePolygon(
        { lat, lng },
        fence.polygon
      );
    }

    if (inside) {
      await alertService.createAlert(
        device,
        "geofence_entry",
        `Device entered ${fence.name}`,
        lat,
        lng
      );
    }
  }

  if (speed > 100) {
    await alertService.createAlert(
      device,
      "overspeed",
      "Overspeed detected",
      lat,
      lng
    );
  }
};