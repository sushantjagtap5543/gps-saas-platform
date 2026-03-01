const db = require('../models');

exports.processTrip = async (deviceId, data) => {

  const activeTrip = await db.sequelize.models.trips?.findOne({
    where: { device_id: deviceId, is_completed: false }
  });

  if (!activeTrip && data.speed > 5) {
    await db.sequelize.models.trips?.create({
      device_id: deviceId,
      start_time: new Date(),
      start_latitude: data.latitude,
      start_longitude: data.longitude,
      is_completed: false
    });
  }

  if (activeTrip && data.speed === 0) {
    activeTrip.is_completed = true;
    activeTrip.end_time = new Date();
    await activeTrip.save();
  }
};