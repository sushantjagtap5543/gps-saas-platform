const { addSession } = require("../../sessions/sessionManager");
const publishGPS     = require("../../services/gpsPublisher");

function handlePacket(socket, parsed, deviceImei) {
  switch (parsed.type) {
    case "login":
      addSession(parsed.imei, socket);
      sendAck(socket, 0x01);
      console.log("[GT06] Login: " + parsed.imei);
      break;
    case "heartbeat":
      sendAck(socket, 0x13);
      break;
    case "location":
      publishGPS({ ...parsed, imei: deviceImei, timestamp: parsed.timestamp || Date.now() });
      sendAck(socket, 0x12);
      break;
    case "alarm":
      publishGPS({ ...parsed, imei: deviceImei, timestamp: Date.now() });
      sendAck(socket, 0x16);
      break;
    default:
      console.warn("[GT06] Unknown packet type: " + parsed.type + " protocol=" + parsed.protocol);
  }
}

function sendAck(socket, protocolNumber) {
  if (!socket.destroyed) {
    socket.write(Buffer.from([0x78,0x78,0x05,protocolNumber,0x00,0x01,0xD9,0xDC,0x0D,0x0A]));
  }
}

module.exports = handlePacket;
