const crc16 = require("../../utils/crc16");

function validatePacket(buffer) {
  const receivedCrc = buffer.slice(buffer.length - 4, buffer.length - 2);
  const data = buffer.slice(2, buffer.length - 4);
  const calculatedCrc = crc16(data);

  return receivedCrc.equals(calculatedCrc);
}

function parsePacket(buffer) {
  const protocol = buffer[3];

  switch (protocol) {
    case 0x01:
      return { type: "login", imei: parseIMEI(buffer) };

    case 0x13:
      return { type: "heartbeat" };

    case 0x12:
      return parseLocation(buffer);

    case 0x16:
      return parseAlarm(buffer);

    default:
      return { type: "unknown" };
  }
}

function parseIMEI(buffer) {
  return buffer.slice(4, 12).toString("hex");
}

function parseLocation(buffer) {
  const latRaw = buffer.readUInt32BE(8);
  const lngRaw = buffer.readUInt32BE(12);

  const latitude = latRaw / 1800000;
  const longitude = lngRaw / 1800000;

  const speed = buffer[16];

  return {
    type: "location",
    latitude,
    longitude,
    speed
  };
}

function parseAlarm(buffer) {
  return { type: "alarm" };
}

module.exports = { validatePacket, parsePacket };