const sessionManager = require('../sessions/sessionManager');
const db = require('../../backend/models');

async function sendCommand(commandLog) {

    const socket = sessionManager.get(commandLog.device_id);

    if (!socket) {
        commandLog.status = 'FAILED';
        commandLog.error_message = 'Device offline';
        await commandLog.save();
        return;
    }

    socket.write(Buffer.from(commandLog.command_text));

    commandLog.status = 'SENT';
    commandLog.sent_at = new Date();
    await commandLog.save();
}

module.exports = { sendCommand };