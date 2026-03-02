const sessions = new Map(); // imei → socket
const socketMap = new WeakMap(); // socket → imei

exports.addSession = (imei, socket) => {
  sessions.set(imei, socket);
  socketMap.set(socket, imei);
};

exports.getSocketByImei = (imei) => sessions.get(imei) || null;

exports.getImeiBySocket = (socket) => socketMap.get(socket) || null;

exports.removeSession = (imei) => {
  const socket = sessions.get(imei);
  if (socket) socketMap.delete(socket);
  sessions.delete(imei);
};

exports.getOnlineCount = () => sessions.size;
exports.getOnlineImeis = () => [...sessions.keys()];
