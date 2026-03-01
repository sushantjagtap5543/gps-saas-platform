const turf = require('@turf/turf');
const db = require('../models');

exports.checkGeofence = async (device, lat, lng) => {

  const fences = await db.sequelize.models.geofences?.findAll({
    where: { vehicle_id: device.id }
  });

  for (let fence of fences) {

    const point = turf.point([lng, lat]);
    const polygon = turf.polygon([fence.coordinates]);

    if (turf.booleanPointInPolygon(point, polygon)) {
      await db.AlertEvent.create({
        device_id: device.id,
        type: "GEOFENCE_ENTER",
        severity: "INFO"
      });
    }
  }
};