const sessions = new Map(); // deviceId -> socket
const socketToDevice = new Map(); // socket -> deviceId

function add(deviceId, socket) {
    sessions.set(deviceId, socket);
    socketToDevice.set(socket, deviceId);
}

function get(deviceId) {
    return sessions.get(deviceId);
}

function remove(socket) {
    const deviceId = socketToDevice.get(socket);
    if (deviceId) {
        sessions.delete(deviceId);
        socketToDevice.delete(socket);
    }
}

function getDeviceId(socket) {
    return socketToDevice.get(socket);
}

module.exports = { add, get, remove, getDeviceId };