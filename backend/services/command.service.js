const db = require('../models');
const redis = require('../config/redis');

exports.sendCommand = async (deviceId, command) => {

  const log = await db.CommandLog.create({
    device_id: deviceId,
    command_text: command
  });

  await redis.lpush('command_queue', JSON.stringify(log));
};