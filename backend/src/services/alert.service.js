async function evaluateOverspeed(deviceId, speed) {
    const rule = await AlertRule.findOne({
        where: { type: "OVERSPEED", is_active: true }
    });

    if (speed > rule.threshold) {
        await AlertEvent.create({
            device_id: deviceId,
            type: "OVERSPEED",
            severity: "WARNING"
        });
    }
}