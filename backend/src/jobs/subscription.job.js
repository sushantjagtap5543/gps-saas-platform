const db = require('../models');
const { Op } = require('sequelize');

setInterval(async () => {

  const expired = await db.Subscription.findAll({
    where: {
      end_date: { [Op.lt]: new Date() },
      status: 'ACTIVE'
    }
  });

  for (let sub of expired) {
    sub.status = 'EXPIRED';
    await sub.save();
  }

}, 86400000);