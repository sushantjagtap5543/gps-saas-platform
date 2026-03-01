const net = require('net');
const { handlePacket } = require('./protocols/gt06');
const sessionManager = require('./sessions/sessionManager');

const PORT = 5001;

const server = net.createServer(socket => {
    console.log("Device connected:", socket.remoteAddress);

    socket.on('data', async (data) => {
        await handlePacket(socket, data);
    });

    socket.on('close', () => {
        sessionManager.remove(socket);
        console.log("Device disconnected");
    });

    socket.on('error', (err) => {
        console.error("Socket error:", err);
    });
});

server.listen(PORT, () => {
    console.log(`TCP Server running on port ${PORT}`);
});