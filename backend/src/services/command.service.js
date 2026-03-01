async function executeLogicalCommand(deviceId, logicalName, userId) {

    const device = await Device.findByPk(deviceId);
    const commandMap = await DeviceCommandMap.findOne({
        where: { model_id: device.model_id, logical_name: logicalName }
    });

    if (!commandMap) throw new Error("Command not supported");

    const command = await CommandLog.create({
        device_id: deviceId,
        logical_name: logicalName,
        actual_command: commandMap.actual_command,
        status: "PENDING",
        created_by: userId
    });

    await redisQueue.push(command);

    return command;
}