const sessions = new Map();

exports.add = (deviceId, socket) => sessions.set(deviceId, socket);
exports.get = (deviceId) => sessions.get(deviceId);
exports.remove = (deviceId) => sessions.delete(deviceId);