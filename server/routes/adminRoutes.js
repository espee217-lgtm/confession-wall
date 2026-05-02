const Report = require("../models/Report");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Confession = require("../models/Confession");

// Middleware: protect admin routes
const adminProtect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Admin login failed" });
  }
});

// GET /api/admin/users
router.get("/users", adminProtect, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Could not fetch users" });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", adminProtect, async (req, res) => {
  try {
    await Confession.deleteMany({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User and their confessions deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Could not delete user" });
  }
});

// GET /api/admin/confessions
router.get("/confessions", adminProtect, async (req, res) => {
  try {
    const confessions = await Confession.find()
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 });

    res.json(confessions);
  } catch (err) {
    console.error("Fetch confessions error:", err);
    res.status(500).json({ message: "Could not fetch confessions" });
  }
});

// DELETE /api/admin/confessions/:id
router.delete("/confessions/:id", adminProtect, async (req, res) => {
  try {
    await Confession.findByIdAndDelete(req.params.id);

    res.json({ message: "Confession deleted" });
  } catch (err) {
    console.error("Delete confession error:", err);
    res.status(500).json({ message: "Could not delete confession" });
  }
});

// DELETE /api/admin/confessions/:confessionId/comments/:commentId
router.delete(
  "/confessions/:confessionId/comments/:commentId",
  adminProtect,
  async (req, res) => {
    try {
      const { confessionId, commentId } = req.params;

      const confession = await Confession.findById(confessionId);

      if (!confession) {
        return res.status(404).json({ message: "Confession not found" });
      }

      const beforeCount = confession.comments.length;

      confession.comments = confession.comments.filter(
        (comment) => comment._id.toString() !== commentId
      );

      if (confession.comments.length === beforeCount) {
        return res.status(404).json({ message: "Comment not found" });
      }

      await confession.save();

      res.json({ message: "Comment deleted" });
    } catch (err) {
      console.error("Delete comment error:", err);
      res.status(500).json({ message: "Could not delete comment" });
    }
  }
);
// DELETE /api/admin/reports/:reportId/comment
// Deletes only the reported comment and auto-resolves the report.
router.delete("/reports/:reportId/comment", adminProtect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.targetType !== "comment") {
      return res.status(400).json({ message: "This is not a comment report" });
    }

    if (!report.confessionId || !report.commentId) {
      return res.status(400).json({ message: "Missing confession/comment id" });
    }

    const confession = await Confession.findById(report.confessionId);

    if (!confession) {
      report.status = "resolved";
      report.resolvedNote = "Parent post was already deleted.";
      await report.save();

      return res.json({
        message: "Parent post already deleted. Report resolved.",
        report,
      });
    }

    const beforeCount = confession.comments.length;

    confession.comments = confession.comments.filter(
      (comment) => comment._id.toString() !== report.commentId.toString()
    );

    const commentWasDeleted = confession.comments.length !== beforeCount;

    if (commentWasDeleted) {
      await confession.save();
    }

    report.status = "resolved";
    report.resolvedNote = commentWasDeleted
      ? "Reported comment was deleted by admin."
      : "Reported comment was already missing.";
    await report.save();

    res.json({
      message: commentWasDeleted
        ? "Comment deleted and report resolved."
        : "Comment already missing. Report resolved.",
      report,
    });
  } catch (err) {
    console.error("Delete reported comment error:", err);
    res.status(500).json({ message: "Could not delete reported comment" });
  }
});
module.exports = { router, adminProtect };