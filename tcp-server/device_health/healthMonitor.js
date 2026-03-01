const db = require('../../backend/models');

async function checkOfflineDevices() {

    const threshold = new Date(Date.now() - 5 * 60 * 1000);

    const devices = await db.Device.findAll({
        where: {
            last_seen: { [Op.lt]: threshold },
            status: 'online'
        }
    });

    for (let device of devices) {
        device.status = 'offline';
        await device.save();

        await db.AlertEvent.create({
            device_id: device.id,
            type: 'DEVICE_OFFLINE',
            severity: 'CRITICAL'
        });
    }
}

setInterval(checkOfflineDevices, 60000);