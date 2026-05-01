const rateLimit = require("express-rate-limit");
const express = require("express");
const router = express.Router();

const Report = require("../models/Report");
const Confession = require("../models/Confession");
const { protect } = require("../middleware/auth");
const { adminProtect } = require("./adminRoutes");


const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many reports. Please wait before reporting again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// USER: report confession/comment
router.post("/", protect, reportLimiter, async (req, res) => {
  try {
    const { targetType, confessionId, commentId, reason } = req.body;

    if (!targetType || !confessionId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["confession", "comment"].includes(targetType)) {
      return res.status(400).json({ message: "Invalid report type" });
    }

    const confession = await Confession.findById(confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    if (targetType === "comment") {
      const commentExists = confession.comments.some(
        (c) => c._id.toString() === commentId
      );

      if (!commentExists) {
        return res.status(404).json({ message: "Comment not found" });
      }
    }

    const report = await Report.create({
      targetType,
      confessionId,
      commentId: targetType === "comment" ? commentId : null,
      reportedBy: req.user._id,
      reason,
    });

    res.json({ message: "Report submitted", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: get all reports
router.get("/", adminProtect, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reportedBy", "username email profilePicture")
      .populate({
        path: "confessionId",
        populate: {
          path: "userId",
          select: "username profilePicture email",
        },
      })
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: mark report resolved
router.put("/:id/resolve", adminProtect, async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "resolved" },
      { new: true }
    );

    if (!report) return res.status(404).json({ message: "Report not found" });

    res.json({ message: "Report resolved", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;