const db    = require("../models");
const redis = require("../config/redis");

exports.sendCommand = async (deviceId, commandText, userId) => {
  const device = await db.Device.findByPk(deviceId);
  if (!device) throw new Error("Device not found");
  const command = await db.CommandLog.create({ device_id: deviceId, command_text: commandText, status: "PENDING" });
  await redis.lpush("command_queue", JSON.stringify({ command_id: command.id, device_id: deviceId, imei: device.imei, command_text: commandText }));
  return command;
};
