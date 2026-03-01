const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST });

async function publishLiveUpdate(device, location) {

  await redis.publish('gps_live_updates', JSON.stringify({
    device_id: device.id,
    owner_id: device.owner_id,
    latitude: location.lat,
    longitude: location.lng,
    speed: location.speed,
    timestamp: new Date()
  }));
}