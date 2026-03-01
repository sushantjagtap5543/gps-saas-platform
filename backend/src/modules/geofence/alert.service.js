const db = require("../../models");
const { emitAlert } = require("../../socket/socket");
const logger = require("../../utils/logger");

exports.createAlert = async (device, type, message, lat, lng, severity = "INFO") => {
  try {
    const alert = await db.AlertEvent.create({ device_id: device.id, type, message, severity, latitude: lat, longitude: lng });
    emitAlert(device.tenant_id, { id: alert.id, device_id: device.id, type, message, severity, latitude: lat, longitude: lng, timestamp: new Date() });
    return alert;
  } catch (err) { logger.error("[ALERT SERVICE] " + err.message); }
};
