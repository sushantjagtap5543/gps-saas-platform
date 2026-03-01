const { addSession } = require("../../deviceSessionManager");
const publishGPS = require("../../services/gpsPublisher");

function handlePacket(socket, parsed) {

  switch (parsed.type) {

    case "login":
      addSession(parsed.imei, socket);
      sendAck(socket, 0x01);
      break;

    case "heartbeat":
      sendAck(socket, 0x13);
      break;

    case "location":
      publishGPS(parsed);
      sendAck(socket, 0x12);
      break;

    case "alarm":
      publishGPS(parsed);
      sendAck(socket, 0x16);
      break;
  }
}

function sendAck(socket, protocolNumber) {
  const response = Buffer.from([
    0x78, 0x78,
    0x05,
    protocolNumber,
    0x00, 0x01,
    0xD9, 0xDC,
    0x0D, 0x0A
  ]);

  socket.write(response);
}

module.exports = handlePacket;