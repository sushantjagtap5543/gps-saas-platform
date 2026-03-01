const sessions = new Map();
const add       = (imei, socket) => { sessions.set(imei, socket); console.log("[SESSION] Added: " + imei + " total=" + sessions.size); };
const get       = (imei) => sessions.get(imei);
const remove    = (imei) => { sessions.delete(imei); console.log("[SESSION] Removed: " + imei + " total=" + sessions.size); };
const getAll    = () => [...sessions.keys()];
module.exports  = { add, addSession: add, get, getSession: get, remove, removeSession: remove, getAll };
