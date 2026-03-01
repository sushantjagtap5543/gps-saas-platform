exports.success = (res, data) => {
  res.json({ success: true, data });
};

exports.error = (res, message) => {
  res.status(400).json({ success: false, message });
};