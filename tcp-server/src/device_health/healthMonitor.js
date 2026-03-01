const db = require('../../../backend/src/models');

setInterval(async () => {
  const threshold = new Date(Date.now() - 300000);

  const devices = await db.Device.findAll({
    where: { last_seen: { [require('sequelize').Op.lt]: threshold } }
  });

  for (let device of devices) {
    device.status = 'offline';
    await device.save();
  }
}, 60000);