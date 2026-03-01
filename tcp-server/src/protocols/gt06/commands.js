const { getSession } = require("../../deviceSessionManager");

function sendCommand(imei, commandText) {
  const socket = getSession(imei);
  if (!socket) return false;

  const cmdBuffer = Buffer.from(commandText);
  socket.write(cmdBuffer);

  return true;
}

module.exports = { sendCommand };