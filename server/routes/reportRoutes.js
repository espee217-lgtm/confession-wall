const rateLimit = require("express-rate-limit");
const express = require("express");
const router = express.Router();

const Report = require("../models/Report");
const Confession = require("../models/Confession");
const Notification = require("../models/Notification");
const { protect, blockSuspended } = require("../middleware/auth");
const { adminProtect } = require("./adminRoutes");
const { sanitizeText } = require("../middleware/sanitizeInput");


const createNotification = async ({ userId, type, message, link }) => {
  try {
    if (!userId) return;

    await Notification.create({
      userId,
      type,
      message,
      link,
    });
  } catch (err) {
    console.error("Create notification error:", err);
  }
};

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
router.post("/", protect, blockSuspended, reportLimiter, async (req, res) => {
  try {
    const { targetType, confessionId, commentId } = req.body;
    const reason = sanitizeText(req.body.reason, { maxLength: 500, allowNewLines: true });

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

    let commentText = "";

    if (targetType === "comment") {
      if (!commentId) {
        return res.status(400).json({ message: "Comment id required" });
      }

      const reportedComment = confession.comments.id(commentId);

      if (!reportedComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      commentText =
        reportedComment.text?.trim() ||
        (reportedComment.image ? "[Image comment]" : "[Empty comment]");
    }

    const report = await Report.create({
      targetType,
      confessionId,
      commentId: targetType === "comment" ? commentId : null,
      commentText,
      reportedBy: req.user._id,
      reason,
    });

    res.json({ message: "Report submitted", report });
  } catch (err) {
    console.error("Create report error:", err);
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
    console.error("Fetch reports error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: mark report resolved
router.put("/:id/resolve", adminProtect, async (req, res) => {
  try {
    const note = sanitizeText(req.body?.note, { maxLength: 500, allowNewLines: true });

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: "resolved",
        resolvedNote: note,
      },
      { new: true }
    );

    if (!report) return res.status(404).json({ message: "Report not found" });

    await createNotification({
      userId: report.reportedBy,
      type: "report_resolved",
      message: note
        ? `Admin reviewed your report: ${note}`
        : "Admin reviewed and resolved your report.",
      link: report.confessionId ? `/confession/${report.confessionId}` : "/",
    });

    res.json({ message: "Report resolved", report });
  } catch (err) {
    console.error("Resolve report error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;