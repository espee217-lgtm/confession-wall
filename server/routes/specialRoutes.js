const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  isSpecialEmail,
  getSpecialAllowedEmails,
  normalizeEmail,
} = require("../utils/specialAccess");

const router = express.Router();

const getUserFromToken = async (req) => {
  const authHeader = req.headers.authorization || "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.id || decoded.userId || decoded._id;

  if (!userId) return null;

  return User.findById(userId).select("-password");
};

router.get("/reena", async (req, res) => {
  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return res.status(401).json({
        allowed: false,
        message: "Login required.",
      });
    }

    const normalizedUserEmail = normalizeEmail(user.email);
    const allowedEmails = getSpecialAllowedEmails();
    const allowed = isSpecialEmail(normalizedUserEmail);

    console.log("SPECIAL ACCESS CHECK:", {
      userEmail: user.email,
      normalizedUserEmail,
      allowed,
      allowedEmails,
    });

    if (!allowed) {
      return res.status(403).json({
        allowed: false,
        message: "This section is not unlocked for this email.",
        debugEmail: normalizedUserEmail,
      });
    }

    res.json({
      allowed: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Special reena access error:", err);
    res.status(401).json({
      allowed: false,
      message: "Invalid or expired login.",
    });
  }
});

router.post("/check", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    const email = normalizeEmail(user?.email || req.body.email || "");
    const allowed = isSpecialEmail(email);

    console.log("SPECIAL CHECK:", {
      email,
      allowed,
      allowedEmails: getSpecialAllowedEmails(),
    });

    res.json({
      allowed,
      email,
    });
  } catch (err) {
    console.error("Special check error:", err);
    res.status(500).json({
      allowed: false,
      message: "Could not check special access.",
    });
  }
});
router.get("/debug-emails", (req, res) => {
  res.json({
    env: process.env.SPECIAL_ALLOWED_EMAILS,
    allowedEmails: getSpecialAllowedEmails(),
  });
});
module.exports = router;