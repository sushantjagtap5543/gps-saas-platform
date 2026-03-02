const crc16 = require("../../utils/crc16");

function validatePacket(buffer) {
  if (buffer.length < 10) return false;
  if (buffer[0] !== 0x78 || buffer[1] !== 0x78) return false;
  const data = buffer.slice(2, buffer.length - 4);
  const received = buffer.slice(buffer.length - 4, buffer.length - 2);
  return received.equals(crc16(data));
}

function parsePacket(buffer) {
  const protocol = buffer[3];
  switch (protocol) {
    case 0x01: return { type: "login", imei: parseIMEI(buffer) };
    case 0x13: return { type: "heartbeat" };
    case 0x12: return parseLocation(buffer);
    case 0x16: return parseAlarm(buffer);
    default:   return { type: "unknown", protocol };
  }
}

function parseIMEI(buffer) {
  let imei = "";
  for (let i = 4; i < 12; i++) {
    imei += ((buffer[i] >> 4) & 0xF).toString() + (buffer[i] & 0xF).toString();
  }
  return imei.slice(0, 15);
}

function parseLocation(buffer) {
  const year    = buffer[4] + 2000;
  const month   = buffer[5];
  const day     = buffer[6];
  const hour    = buffer[7];
  const min     = buffer[8];
  const sec     = buffer[9];
  const latRaw  = buffer.readUInt32BE(11);
  const lngRaw  = buffer.readUInt32BE(15);
  const speed   = buffer[19];
  const flags   = buffer.readUInt16BE(20);
  const southLat = (flags >> 2) & 1;
  const westLng  = (flags >> 3) & 1;
  const latitude  = (southLat ? -1 : 1) * latRaw / 1800000.0;
  const longitude = (westLng  ? -1 : 1) * lngRaw / 1800000.0;
  return { type: "location", latitude, longitude, speed, timestamp: new Date(year, month-1, day, hour, min, sec).toISOString() };
}

function parseAlarm(buffer) {
  const alarmType = buffer[9];
  const types = { 0x01:"sos", 0x02:"power_cut", 0x03:"vibration", 0x09:"low_battery" };
  return { type: "alarm", alarm_type: types[alarmType] || "unknown_alarm" };
}

module.exports = { validatePacket, parsePacket };
