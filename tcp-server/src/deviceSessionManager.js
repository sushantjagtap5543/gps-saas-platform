const sessions = new Map();

function addSession(imei, socket) {
  sessions.set(imei, socket);
}

function removeSession(imei) {
  sessions.delete(imei);
}

function getSession(imei) {
  return sessions.get(imei);
}

module.exports = { addSession, removeSession, getSession };