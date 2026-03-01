const db = require('../models');
const { Op } = require('sequelize');

setInterval(async () => {

  const threshold = new Date(Date.now() - 300000);

  const offline = await db.Device.findAll({
    where: { last_seen: { [Op.lt]: threshold } }
  });

  for (let device of offline) {
    device.status = 'offline';
    await device.save();
  }

}, 60000);