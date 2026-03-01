exports.success = (res, data, code = 200) => res.status(code).json({ success: true, data });
exports.error   = (res, message, code = 500) => res.status(code).json({ success: false, message });
