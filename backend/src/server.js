const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket/socket');

const server = http.createServer(app);

initSocket(server);

server.listen(process.env.API_PORT || 3000, () => {
  console.log("Backend + WebSocket running");
});