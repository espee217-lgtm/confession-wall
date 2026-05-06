const express = require("express");
const SpecialActivity = require("../models/SpecialActivity");

const router = express.Router();

const allowedEmails = (process.env.SPECIAL_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAllowedEmail = (email = "") => {
  return allowedEmails.includes(String(email).trim().toLowerCase());
};

const requireAdminLogSecret = (req, res, next) => {
  const providedSecret = req.headers["x-admin-log-secret"];
  const actualSecret = process.env.ADMIN_LOG_SECRET;

  if (!actualSecret) {
    return res.status(500).json({
      message: "ADMIN_LOG_SECRET is not configured on the server.",
    });
  }

  if (!providedSecret || providedSecret !== actualSecret) {
    return res.status(401).json({
      message: "Not allowed to view special activity logs.",
    });
  }

  next();
};

router.post("/log", async (req, res) => {
  try {
    const { userEmail, userName, action, page, details } = req.body;

    if (!userEmail || !action) {
      return res.status(400).json({
        message: "userEmail and action are required.",
      });
    }

    if (!isAllowedEmail(userEmail)) {
      return res.status(403).json({
        message: "This email is not allowed for special activity logging.",
      });
    }

    const activity = await SpecialActivity.create({
      userEmail,
      userName,
      action,
      page,
      details: details || {},
    });

    res.status(201).json({
      message: "Activity logged.",
      activity,
    });
  } catch (err) {
    console.error("Special activity log error:", err);
    res.status(500).json({
      message: "Server error while logging activity.",
    });
  }
});

router.get("/logs", requireAdminLogSecret, async (req, res) => {
  try {
    const logs = await SpecialActivity.find()
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    console.error("Special activity fetch error:", err);
    res.status(500).json({
      message: "Server error while fetching activity logs.",
    });
  }
});

module.exports = router;