// CRC-16/IBM (used by GT06 GPS protocol)
// Pure JS implementation — no external dependency needed
function crc16(buffer) {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  const result = Buffer.alloc(2);
  result.writeUInt16LE(crc, 0);
  return result;
}

module.exports = crc16;
