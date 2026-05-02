const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        message:
          user.banReason ||
          "Your account has been banned by admin.",
        statusType: "banned",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
        statusType: "token_expired",
      });
    }

    res.status(401).json({
      message: "Token invalid or expired",
      statusType: "token_invalid",
    });
  }
};

const blockSuspended = (req, res, next) => {
  if (req.user?.isSuspended) {
    return res.status(403).json({
      message:
        req.user.suspendReason ||
        "Your account is suspended. You can view the site, but you cannot post, comment, react, or report.",
      statusType: "suspended",
    });
  }

  next();
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
};

module.exports = { protect, blockSuspended, adminOnly };