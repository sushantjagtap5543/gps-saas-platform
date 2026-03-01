const db = require('../models');

async function processTrips() {

    const liveData = await db.GpsLive.findAll();

    for (let data of liveData) {
        await require('../services/trip.service')
            .processTrip(data.device_id, data);
    }
}

setInterval(processTrips, 15000);