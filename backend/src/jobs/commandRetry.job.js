const redis = require('../config/redis');
const commandService = require('../services/command.service');

async function retryWorker() {
    while (true) {
        const command = await redis.brpop("command_queue", 0);

        if (command) {
            await commandService.sendToDevice(command);
        }
    }
}

retryWorker();