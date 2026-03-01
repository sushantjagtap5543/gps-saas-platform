const db = require("../../models");
const { getIO } = require("../../socket/socket");

exports.createAlert = async (device, type, message, lat, lng) => {

  const alert = await db.Alert.create({
    tenant_id: device.tenant_id,
    device_id: device.id,
    type,
    message,
    latitude: lat,
    longitude: lng
  });

  const io = getIO();
  io.to(device.tenant_id.toString()).emit("alert", alert);

  return alert;
};