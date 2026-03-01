const redis = require('../config/redis');
const dispatcher = require('../../../tcp-server/src/command_sender/commandDispatcher');

async function start() {
  while (true) {
    const data = await redis.brpop('command_queue', 0);
    if (data) {
      const command = JSON.parse(data[1]);
      await dispatcher.sendCommand(command);
    }
  }
}
start();