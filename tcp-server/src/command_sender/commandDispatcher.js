const sessions = require('../sessions/sessionManager');

exports.sendCommand = async (command) => {
  const socket = sessions.get(command.device_id);

  if (!socket) return;

  socket.write(Buffer.from(command.command_text));
};