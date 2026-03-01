const net = require("net");
const { validatePacket, parsePacket } = require("./protocols/gt06/parser");
const handlePacket = require("./protocols/gt06/handlers");

const server = net.createServer((socket) => {

  socket.on("data", (data) => {

    if (!validatePacket(data)) return;

    const parsed = parsePacket(data);
    handlePacket(socket, parsed);
  });

  socket.on("close", () => {
    console.log("Device disconnected");
  });

});

server.listen(5000, () => {
  console.log("GT06 TCP Server Running on 5000");
});