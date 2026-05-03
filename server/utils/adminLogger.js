const AdminLog = require("../models/AdminLog");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.headers["x-real-ip"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    ""
  );
};

const createAdminLog = async ({ req, type, message, user, targetId = null, targetType = "", metadata = {} }) => {
  try {
    await AdminLog.create({
      type,
      message,
      userId: user?._id || null,
      username: user?.username || "",
      email: user?.email || "",
      ipAddress: req ? getClientIp(req) : "",
      targetId,
      targetType,
      metadata,
    });
  } catch (err) {
    // Logs should never break login/post/comment flows.
    console.error("Admin log create error:", err.message);
  }
};

module.exports = {
  createAdminLog,
  getClientIp,
};