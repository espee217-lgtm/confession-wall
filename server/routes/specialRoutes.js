const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { isSpecialEmail } = require("../utils/specialAccess");

const requireSpecialAccess = (req, res, next) => {
  if (!isSpecialEmail(req.user?.email)) {
    return res.status(403).json({
      allowed: false,
      message: "This private section is not available for this account.",
    });
  }

  next();
};

router.get("/access", protect, (req, res) => {
  res.json({
    allowed: isSpecialEmail(req.user?.email),
    email: req.user.email,
  });
});

router.get("/reena", protect, requireSpecialAccess, (req, res) => {
  res.json({
    allowed: true,
    page: "reena",
    message: "Special section unlocked.",
  });
});

module.exports = router;
