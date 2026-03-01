function crc16(buffer) {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) { crc = (crc & 1) ? (crc >> 1) ^ 0x8408 : crc >> 1; }
  }
  crc = ~crc;
  return Buffer.from([crc & 0xff, (crc >> 8) & 0xff]);
}
module.exports = crc16;
