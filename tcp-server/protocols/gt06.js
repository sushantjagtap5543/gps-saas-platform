function handlePacket(socket, data) {
  console.log("Received:", data.toString('hex'));
  socket.write(Buffer.from([0x78,0x78,0x05,0x01,0x00,0x01,0xD9,0xDC,0x0D,0x0A]));
}
module.exports = { handlePacket };