const geofenceService = require("../modules/geofence/geofence.service");

await geofenceService.processLocation(
  device,
  payload.latitude,
  payload.longitude,
  payload.speed
);