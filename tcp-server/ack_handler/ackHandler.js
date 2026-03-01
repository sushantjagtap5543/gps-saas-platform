const db = require('../../backend/models');

async function handleAck(deviceId, rawData) {

    const pendingCommand = await db.CommandLog.findOne({
        where: { device_id: deviceId, status: 'SENT' },
        order: [['created_at', 'DESC']]
    });

    if (!pendingCommand) return;

    pendingCommand.status = 'SUCCESS';
    pendingCommand.ack_received = true;
    pendingCommand.completed_at = new Date();
    pendingCommand.response_data = rawData.toString('hex');

    await pendingCommand.save();
}

module.exports = { handleAck };