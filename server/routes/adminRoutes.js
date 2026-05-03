const Report = require("../models/Report");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Confession = require("../models/Confession");
const Notification = require("../models/Notification");
const AdminLog = require("../models/AdminLog");


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


// GET /api/admin/logs
router.get("/logs", adminProtect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const logs = await AdminLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "username email profilePicture isAdmin role");

    res.json(logs);
  } catch (err) {
    console.error("Fetch admin logs error:", err);
    res.status(500).json({ message: "Could not fetch logs" });
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
      .populate("userId", "username profilePicture isAdmin role")
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
    const confession = await Confession.findById(req.params.id);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    const ownerId = confession.userId;

    await Confession.findByIdAndDelete(req.params.id);

    await createNotification({
      userId: ownerId,
      type: "content_removed",
      message: "Your post was removed by an admin.",
      link: "/",
    });

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

      const commentToDelete = confession.comments.id(commentId);

      if (!commentToDelete) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const commentOwnerId = commentToDelete.userId;

      confession.comments = confession.comments.filter(
        (comment) => comment._id.toString() !== commentId
      );

      await confession.save();

      await createNotification({
        userId: commentOwnerId,
        type: "content_removed",
        message: "Your comment was removed by an admin.",
        link: `/confession/${confessionId}`,
      });

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

      await createNotification({
        userId: report.reportedBy,
        type: "report_resolved",
        message: "Admin reviewed your report. The parent post was already deleted.",
        link: "/",
      });

      return res.json({
        message: "Parent post already deleted. Report resolved.",
        report,
      });
    }

    const commentToDelete = confession.comments.id(report.commentId);
    const commentOwnerId = commentToDelete?.userId || null;
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

    await createNotification({
      userId: report.reportedBy,
      type: "report_resolved",
      message: commentWasDeleted
        ? "Admin reviewed your report and removed the reported comment."
        : "Admin reviewed your report. The reported comment was already missing.",
      link: report.confessionId ? `/confession/${report.confessionId}` : "/",
    });

    if (commentWasDeleted) {
      await createNotification({
        userId: commentOwnerId,
        type: "content_removed",
        message: "Your comment was removed by an admin after a report review.",
        link: report.confessionId ? `/confession/${report.confessionId}` : "/",
      });
    }

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
// PATCH /api/admin/users/:id/suspend
router.patch("/users/:id/suspend", adminProtect, async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isSuspended: true,
        suspendReason: reason || "Suspended by admin.",
        suspendedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User suspended", user });
  } catch (err) {
    console.error("Suspend user error:", err);
    res.status(500).json({ message: "Could not suspend user" });
  }
});

// PATCH /api/admin/users/:id/unsuspend
router.patch("/users/:id/unsuspend", adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isSuspended: false,
        suspendReason: "",
        suspendedAt: null,
      },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User unsuspended", user });
  } catch (err) {
    console.error("Unsuspend user error:", err);
    res.status(500).json({ message: "Could not unsuspend user" });
  }
});

// PATCH /api/admin/users/:id/ban
router.patch("/users/:id/ban", adminProtect, async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isBanned: true,
        banReason: reason || "Banned by admin.",
        bannedAt: new Date(),
        isSuspended: false,
        suspendReason: "",
        suspendedAt: null,
      },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User banned", user });
  } catch (err) {
    console.error("Ban user error:", err);
    res.status(500).json({ message: "Could not ban user" });
  }
});

// PATCH /api/admin/users/:id/unban
router.patch("/users/:id/unban", adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isBanned: false,
        banReason: "",
        bannedAt: null,
      },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User unbanned", user });
  } catch (err) {
    console.error("Unban user error:", err);
    res.status(500).json({ message: "Could not unban user" });
  }
});

// POST /api/admin/enter-site
// Admin dashboard -> enter main website as a public admin user
router.post("/enter-site", adminProtect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    let publicUser = await User.findOne({ linkedAdminId: admin._id });

    if (!publicUser) {
      const safeUsername = `Admin_${admin.username}`.replace(/\s+/g, "_");
      const fallbackUsername = `Admin_${admin._id.toString().slice(-6)}`;

      const usernameTaken = await User.findOne({ username: safeUsername });

      const hashedPassword = await bcrypt.hash(
        `${admin._id}-${Date.now()}-${Math.random()}`,
        10
      );

      publicUser = await User.create({
        username: usernameTaken ? fallbackUsername : safeUsername,
        email: `admin_${admin._id}@confessionwall.local`,
        password: hashedPassword,
        isAdmin: true,
        role: "admin",
        linkedAdminId: admin._id,
        bio: "Official Confession Wall administrator.",
      });
    } else {
      let changed = false;

      if (!publicUser.isAdmin) {
        publicUser.isAdmin = true;
        changed = true;
      }

      if (publicUser.role !== "admin") {
        publicUser.role = "admin";
        changed = true;
      }

      if (publicUser.isBanned) {
        publicUser.isBanned = false;
        publicUser.banReason = "";
        publicUser.bannedAt = null;
        changed = true;
      }

      if (publicUser.isSuspended) {
        publicUser.isSuspended = false;
        publicUser.suspendReason = "";
        publicUser.suspendedAt = null;
        changed = true;
      }

      if (changed) await publicUser.save();
    }

    const token = jwt.sign(
      { id: publicUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Entered main site as admin",
      token,
      user: {
        _id: publicUser._id,
        username: publicUser.username,
        email: publicUser.email,
        profilePicture: publicUser.profilePicture,
        isAdmin: publicUser.isAdmin,
        role: publicUser.role,
        isSuspended: publicUser.isSuspended,
        isBanned: publicUser.isBanned,
        suspendReason: publicUser.suspendReason,
        banReason: publicUser.banReason,
      },
    });
  } catch (err) {
    console.error("Enter site as admin error:", err);
    res.status(500).json({ message: "Could not enter main site as admin" });
  }
});
module.exports = { router, adminProtect };