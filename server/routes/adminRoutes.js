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
const { awardSeeds, debitSeeds } = require("../utils/seedRewards");
const {
  formatEquippedTitle,
  getAchievementTitles,
  getAchievementTitleById,
  hasUnlockedTitle,
  unlockTitleForUser,
} = require("../utils/achievementTitles");
const {
  ensureWeeklyEventMaintenance,
  getWeeklyEventStatus,
  finalizeCurrentWeeklyResults,
} = require("../utils/weeklyForestEvents");


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

const getReportDeleteAfterDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
};

const buildResolvedReportUpdate = (resolvedNote) => ({
  status: "resolved",
  resolvedNote: resolvedNote || "Reviewed by admin.",
  resolvedAt: new Date(),
  deleteAfter: getReportDeleteAfterDate(),
});

const rewardReporterIfNeeded = async (report, link = "/") => {
  if (!report || report.seedRewardedAt || !report.reportedBy) return null;

  const seedReward = await awardSeeds({
    userId: report.reportedBy,
    reason: "accepted_report",
    reasonLabel: "an accepted report",
    link,
  });

  if (seedReward?.awarded) {
    report.seedRewardedAt = new Date();
    await report.save();
  }

  return seedReward;
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

const truncatePreview = (value, max = 120) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
};

const isSeededItem = (item) =>
  Boolean(item?.isSeeded) || String(item?.seedLabel || "").trim().length > 0;
const LEGACY_SEEDED_EMAIL_SUFFIX = "@seed.confession-wall.local";

const toCount = (arr) => (Array.isArray(arr) ? arr.length : 0);

const writeSeededAdminLog = async ({
  req,
  type,
  message,
  confessionId = null,
  commentId = null,
  replyId = null,
  oldText = "",
  newText = "",
}) => {
  try {
    const targetType = replyId ? "reply" : commentId ? "comment" : confessionId ? "confession" : "";
    await AdminLog.create({
      type,
      message,
      username: `admin:${String(req.admin?.id || "").slice(-8) || "unknown"}`,
      email: "",
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userId: null,
      targetType,
      metadata: {
        adminId: req.admin?.id || null,
        confessionId: confessionId || null,
        commentId: commentId || null,
        replyId: replyId || null,
        oldTextPreview: truncatePreview(oldText),
        newTextPreview: truncatePreview(newText),
      },
    });
  } catch (err) {
    console.error("Seeded admin log write failed:", err.message);
  }
};

const writeAdminMainSiteDeleteLog = async ({
  req,
  type,
  message,
  confessionId = null,
  commentId = null,
  replyId = null,
  deletedText = "",
  authorId = null,
}) => {
  try {
    const admin = req.admin?.id
      ? await Admin.findById(req.admin.id).select("username email")
      : null;
    const targetId = replyId || commentId || confessionId || null;
    const targetType = replyId ? "reply" : commentId ? "comment" : confessionId ? "confession" : "";

    await AdminLog.create({
      type,
      message,
      userId: null,
      username: admin?.username || `admin:${String(req.admin?.id || "").slice(-8) || "unknown"}`,
      email: admin?.email || "",
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      targetId,
      targetType,
      metadata: {
        adminId: req.admin?.id || null,
        confessionId: confessionId ? String(confessionId) : null,
        commentId: commentId ? String(commentId) : null,
        replyId: replyId ? String(replyId) : null,
        authorId: authorId ? String(authorId) : null,
        deletedTextPreview: truncatePreview(deletedText, 120),
      },
    });
  } catch (err) {
    console.error("Admin main-site delete log error:", err.message);
  }
};

const normalizeSeededType = (value) => {
  const normalized = String(value || "all").trim().toLowerCase();
  if (["all", "post", "comment", "reply"].includes(normalized)) return normalized;
  return "all";
};

const hasLegacySeedEmail = (email) =>
  String(email || "").trim().toLowerCase().endsWith(LEGACY_SEEDED_EMAIL_SUFFIX);

const isSeededUser = (user) =>
  Boolean(user?.isSeededAccount) || hasLegacySeedEmail(user?.email);

const isSeededAuthor = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId).select("email isSeededAccount");
  return isSeededUser(user);
};

const isManageableSeededItem = async (item) => {
  if (!item) return false;
  if (isSeededItem(item)) return true;
  return isSeededAuthor(item.userId);
};

const createImpersonationToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "2h" });

const buildSeededItem = ({
  type,
  confession,
  confessionText,
  text,
  author,
  wateredBy,
  burnedBy,
  createdAt,
  editedAt,
  isEdited,
  seedLabel,
  commentId = null,
  replyId = null,
}) => ({
  type,
  confessionId: String(confession?._id || ""),
  commentId: commentId ? String(commentId) : null,
  replyId: replyId ? String(replyId) : null,
  text: String(text || ""),
  authorUsername: author?.username || "anonymous",
  authorAvatar: author?.profilePicture || "",
  wateredCount: toCount(wateredBy),
  burnedCount: toCount(burnedBy),
  createdAt: createdAt || confession?.createdAt || null,
  editedAt: editedAt || null,
  isEdited: Boolean(isEdited || editedAt),
  seedLabel: String(seedLabel || ""),
  confessionPreview: truncatePreview(confessionText, 180),
  confessionUrl: `/confession/${String(confession?._id || "")}${commentId ? `#comment-${commentId}` : replyId ? `#reply-${replyId}` : ""}`,
});

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

// GET /api/admin/weekly-event/status
router.get("/weekly-event/status", adminProtect, async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const status = await getWeeklyEventStatus();
    res.json(status);
  } catch (err) {
    console.error("Admin weekly event status error:", err);
    res.status(500).json({ message: "Could not load weekly event status." });
  }
});

// POST /api/admin/weekly-event/finalize-current
router.post("/weekly-event/finalize-current", adminProtect, async (req, res) => {
  try {
    const status = await finalizeCurrentWeeklyResults();
    res.json({
      message:
        "Weekly event maintenance ran and any pending automated rewards were applied.",
      status,
    });
  } catch (err) {
    console.error("Finalize weekly event error:", err);
    res.status(500).json({
      message: "Could not finalize weekly event results right now.",
    });
  }
});

// DELETE /api/admin/reports/cleanup-resolved
// Removes resolved reports whose 30-day cleanup date has passed.
router.delete("/reports/cleanup-resolved", adminProtect, async (req, res) => {
  try {
    const result = await Report.deleteMany({
      status: "resolved",
      deleteAfter: { $lte: new Date() },
    });

    res.json({
      message: `Cleaned ${result.deletedCount || 0} old resolved report(s).`,
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    console.error("Cleanup resolved reports error:", err);
    res.status(500).json({ message: "Could not cleanup resolved reports" });
  }
});

// DELETE /api/admin/reports/clear-resolved
// Removes all resolved report records (does not touch posts/comments).
router.delete("/reports/clear-resolved", adminProtect, async (req, res) => {
  try {
    const result = await Report.deleteMany({ status: "resolved" });

    res.json({
      message: `Cleared ${result.deletedCount || 0} resolved report(s).`,
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    console.error("Clear resolved reports error:", err);
    res.status(500).json({ message: "Could not clear resolved reports" });
  }
});

// DELETE /api/admin/reports/:id
// Deletes only the report record (does not touch posts/comments).
router.delete("/reports/:id", adminProtect, async (req, res) => {
  try {
    const deletedReport = await Report.findByIdAndDelete(req.params.id);

    if (!deletedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({
      message: "Report record deleted.",
      deletedId: deletedReport._id,
    });
  } catch (err) {
    console.error("Delete report record error:", err);
    res.status(500).json({ message: "Could not delete report record" });
  }
});

// DELETE /api/admin/logs/clear
// Clears AdminLog records only.
router.delete("/logs/clear", adminProtect, async (req, res) => {
  try {
    const result = await AdminLog.deleteMany({});

    res.json({
      message: `Cleared ${result.deletedCount || 0} admin log(s).`,
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    console.error("Clear admin logs error:", err);
    res.status(500).json({ message: "Could not clear admin logs" });
  }
});

// DELETE /api/admin/logs/:id
// Deletes one AdminLog record only.
router.delete("/logs/:id", adminProtect, async (req, res) => {
  try {
    const deletedLog = await AdminLog.findByIdAndDelete(req.params.id);

    if (!deletedLog) {
      return res.status(404).json({ message: "Admin log not found" });
    }

    res.json({
      message: "Admin log deleted.",
      deletedId: deletedLog._id,
    });
  } catch (err) {
    console.error("Delete admin log error:", err);
    res.status(500).json({ message: "Could not delete admin log" });
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

// GET /api/admin/seeded-accounts
router.get("/seeded-accounts", adminProtect, async (req, res) => {
  try {
    const seededUsers = await User.find({
      $or: [
        { isSeededAccount: true },
        { email: { $regex: /@seed\.confession-wall\.local$/i } },
      ],
    })
      .select("_id username email profilePicture createdAt seedLabel isSeededAccount seeds")
      .sort({ createdAt: -1 })
      .lean();

    const ids = seededUsers.map((user) => String(user._id));
    const statsByUserId = new Map();
    ids.forEach((id) => {
      statsByUserId.set(id, { posts: 0, comments: 0, replies: 0 });
    });

    if (ids.length > 0) {
      const confessions = await Confession.find({
        $or: [
          { userId: { $in: ids } },
          { "comments.userId": { $in: ids } },
          { "comments.replies.userId": { $in: ids } },
        ],
      })
        .select("userId comments.userId comments.replies.userId")
        .lean();

      for (const confession of confessions) {
        const postOwner = String(confession?.userId || "");
        if (statsByUserId.has(postOwner)) {
          statsByUserId.get(postOwner).posts += 1;
        }

        const comments = Array.isArray(confession?.comments) ? confession.comments : [];
        for (const comment of comments) {
          const commentOwner = String(comment?.userId || "");
          if (statsByUserId.has(commentOwner)) {
            statsByUserId.get(commentOwner).comments += 1;
          }
          const replies = Array.isArray(comment?.replies) ? comment.replies : [];
          for (const reply of replies) {
            const replyOwner = String(reply?.userId || "");
            if (statsByUserId.has(replyOwner)) {
              statsByUserId.get(replyOwner).replies += 1;
            }
          }
        }
      }
    }

    const items = seededUsers.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.profilePicture || "",
      profileImage: user.profilePicture || "",
      createdAt: user.createdAt,
      seedLabel: user.seedLabel || "",
      isSeededAccount: Boolean(user.isSeededAccount || hasLegacySeedEmail(user.email)),
      seeds: Number(user.seeds || 0),
      stats: statsByUserId.get(String(user._id)) || { posts: 0, comments: 0, replies: 0 },
    }));

    res.json(items);
  } catch (err) {
    console.error("Fetch seeded accounts error:", err);
    res.status(500).json({ message: "Could not fetch seeded accounts." });
  }
});

// POST /api/admin/seeded-accounts/:userId/impersonate
router.post("/seeded-accounts/:userId/impersonate", adminProtect, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId).select(
      "_id username email profilePicture isSeededAccount seedLabel isAdmin role isSuspended isBanned suspendReason banReason seeds"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "Seeded account not found." });
    }

    if (!isSeededUser(targetUser)) {
      return res.status(403).json({ message: "Only seeded accounts can be impersonated." });
    }

    if (!targetUser.isSeededAccount) {
      targetUser.isSeededAccount = true;
      targetUser.seedLabel = targetUser.seedLabel || "legacy-seed-account";
      await targetUser.save();
    }

    const token = createImpersonationToken(targetUser._id);
    const startedAt = new Date().toISOString();

    await AdminLog.create({
      type: "seeded_account_impersonation_start",
      message: `Admin started seeded-account impersonation for @${targetUser.username}.`,
      username: `admin:${String(req.admin?.id || "").slice(-8) || "unknown"}`,
      email: "",
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      metadata: {
        adminId: req.admin?.id || null,
        seededUserId: String(targetUser._id),
        seededUsername: targetUser.username,
        startedAt,
      },
    });

    res.json({
      token,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        profilePicture: targetUser.profilePicture || null,
        avatar: targetUser.profilePicture || "",
        profileImage: targetUser.profilePicture || "",
        isAdmin: Boolean(targetUser.isAdmin),
        role: targetUser.role || "user",
        isSuspended: Boolean(targetUser.isSuspended),
        isBanned: Boolean(targetUser.isBanned),
        suspendReason: targetUser.suspendReason || "",
        banReason: targetUser.banReason || "",
        seeds: Number(targetUser.seeds || 0),
        isSeededAccount: true,
        seedLabel: targetUser.seedLabel || "legacy-seed-account",
      },
      impersonation: {
        active: true,
        byAdmin: true,
        startedAt,
      },
    });
  } catch (err) {
    console.error("Seeded account impersonation error:", err);
    res.status(500).json({ message: "Could not impersonate seeded account." });
  }
});

// GET /api/admin/titles
router.get("/titles", adminProtect, async (req, res) => {
  try {
    res.json(
      getAchievementTitles().map((title) => ({
        id: title.id,
        name: title.name,
        description: title.description,
        requirementText: title.requirementText,
        supported: title.supported !== false,
      }))
    );
  } catch (err) {
    console.error("Fetch admin titles error:", err);
    res.status(500).json({ message: "Could not fetch titles." });
  }
});

// PATCH /api/admin/users/:userId/grant-title
router.patch("/users/:userId/grant-title", adminProtect, async (req, res) => {
  try {
    const titleId = String(req.body?.titleId || "").trim();
    const equip = Boolean(req.body?.equip);
    const title = getAchievementTitleById(titleId);

    if (!title) {
      return res.status(400).json({ message: "Unknown title achievement." });
    }

    const targetUser = await User.findById(req.params.userId).select("-password");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyUnlocked = hasUnlockedTitle(targetUser, title.id);
    const grantResult = await unlockTitleForUser(targetUser, title.id, {
      allowUnsupported: true,
      link: "/titles",
    });

    if (equip) {
      targetUser.set("equippedCosmetics.title", title.id);
      await targetUser.save();
    }

    const updatedUser = await User.findById(targetUser._id).select("-password");

    res.json({
      message: alreadyUnlocked
        ? `@${targetUser.username} already has ${title.name}.`
        : `Granted ${title.name} to @${targetUser.username}.`,
      title: {
        id: title.id,
        name: title.name,
        description: title.description,
      },
      alreadyUnlocked,
      granted: Boolean(grantResult.unlocked),
      equippedTitle: formatEquippedTitle(updatedUser || targetUser),
      user: updatedUser || targetUser,
    });
  } catch (err) {
    console.error("Grant title error:", err);
    res.status(500).json({ message: "Could not grant title right now." });
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

// GET /api/admin/seeded-content
router.get("/seeded-content", adminProtect, async (req, res) => {
  try {
    const type = normalizeSeededType(req.query.type);
    const queryText = String(req.query.q || "").trim().toLowerCase();
    const selectedUserId = String(req.query.userId || "").trim();
    const confessionIdFilter = String(req.query.confessionId || "").trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 200);

    const confessionQuery = {};
    if (confessionIdFilter) confessionQuery._id = confessionIdFilter;

    const seededUsers = await User.find({
      $or: [
        { isSeededAccount: true },
        { email: { $regex: /@seed\.confession-wall\.local$/i } },
      ],
    })
      .select("_id username email profilePicture isSeededAccount seedLabel")
      .lean();
    const seededUserMap = new Map(
      seededUsers.map((user) => [String(user._id), user])
    );
    const seededUserIdSet = new Set(seededUsers.map((user) => String(user._id)));

    const confessions = await Confession.find(confessionQuery)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture")
      .populate("comments.replies.userId", "username profilePicture")
      .sort({ createdAt: -1 });

    const seededItems = [];

    for (const confession of confessions) {
      const confessionText = String(confession?.message || "");

      const confessionAuthorId = String(confession?.userId?._id || confession?.userId || "");
      const confessionAuthorSeeded = seededUserIdSet.has(confessionAuthorId);
      if (type === "all" || type === "post") {
        const includePost =
          isSeededItem(confession) || confessionAuthorSeeded;
        if (includePost) {
          if (selectedUserId && confessionAuthorId !== selectedUserId) {
            // skip
          } else {
            const mappedAuthor = seededUserMap.get(confessionAuthorId);
          seededItems.push(
            buildSeededItem({
              type: "post",
              confession,
              confessionText,
              text: confession.message,
              author: mappedAuthor || confession.userId,
              wateredBy: confession.wateredBy,
              burnedBy: confession.burnedBy,
              createdAt: confession.createdAt,
              editedAt: confession.editedAt,
              isEdited: confession.isEdited,
              seedLabel: confession.seedLabel,
            })
          );
          }
        }
      }

      const comments = Array.isArray(confession.comments) ? confession.comments : [];
      for (const comment of comments) {
        const commentAuthorId = String(comment?.userId?._id || comment?.userId || "");
        const commentAuthorSeeded = seededUserIdSet.has(commentAuthorId);
        if ((type === "all" || type === "comment") && (isSeededItem(comment) || commentAuthorSeeded)) {
          if (selectedUserId && commentAuthorId !== selectedUserId) {
            // skip
          } else {
            const mappedAuthor = seededUserMap.get(commentAuthorId);
          seededItems.push(
            buildSeededItem({
              type: "comment",
              confession,
              confessionText,
              text: comment.text,
              author: mappedAuthor || comment.userId,
              wateredBy: comment.wateredBy,
              burnedBy: comment.burnedBy,
              createdAt: comment.createdAt,
              editedAt: comment.editedAt,
              isEdited: comment.isEdited,
              seedLabel: comment.seedLabel,
              commentId: comment._id,
            })
          );
          }
        }

        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        for (const reply of replies) {
          const replyAuthorId = String(reply?.userId?._id || reply?.userId || "");
          const replyAuthorSeeded = seededUserIdSet.has(replyAuthorId);
          if ((type === "all" || type === "reply") && (isSeededItem(reply) || replyAuthorSeeded)) {
            if (selectedUserId && replyAuthorId !== selectedUserId) {
              // skip
            } else {
              const mappedAuthor = seededUserMap.get(replyAuthorId);
            seededItems.push(
              buildSeededItem({
                type: "reply",
                confession,
                confessionText,
                text: reply.text,
                author: mappedAuthor || reply.userId,
                wateredBy: reply.wateredBy,
                burnedBy: reply.burnedBy,
                createdAt: reply.createdAt,
                editedAt: reply.editedAt,
                isEdited: reply.isEdited,
                seedLabel: reply.seedLabel,
                commentId: comment._id,
                replyId: reply._id,
              })
            );
            }
          }
        }
      }
    }

    const filtered = queryText
      ? seededItems.filter((item) =>
          [
            item.type,
            item.text,
            item.authorUsername,
            item.seedLabel,
            item.confessionPreview,
          ]
            .join(" ")
            .toLowerCase()
            .includes(queryText)
        )
      : seededItems;

    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    res.json({
      items,
      page,
      limit,
      total,
      hasMore: start + items.length < total,
    });
  } catch (err) {
    console.error("Fetch seeded content error:", err);
    res.status(500).json({ message: "Could not fetch seeded content." });
  }
});

// PATCH /api/admin/seeded-content/post/:confessionId
router.patch("/seeded-content/post/:confessionId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found." });
    }

    const force = Boolean(req.body?.force);
    if (!(force || (await isManageableSeededItem(confession)))) {
      return res.status(403).json({ message: "This post is not marked as seeded." });
    }

    const nextMessage = String(req.body?.message || "").trim();
    if (!nextMessage) {
      return res.status(400).json({ message: "Post text cannot be empty." });
    }

    const previousText = confession.message;
    confession.message = nextMessage;
    confession.isEdited = true;
    confession.editedAt = new Date();
    await confession.save();

    await writeSeededAdminLog({
      req,
      type: "seeded_post_edit",
      message: "Admin edited seeded post content.",
      confessionId: confession._id,
      oldText: previousText,
      newText: nextMessage,
    });

    res.json({
      message: "Seeded post updated.",
      confessionId: String(confession._id),
    });
  } catch (err) {
    console.error("Edit seeded post error:", err);
    res.status(500).json({ message: "Could not edit seeded post." });
  }
});

// PATCH /api/admin/seeded-content/comment/:confessionId/:commentId
router.patch("/seeded-content/comment/:confessionId/:commentId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found." });
    }

    const comment = confession.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const force = Boolean(req.body?.force);
    if (!(force || (await isManageableSeededItem(comment)))) {
      return res.status(403).json({ message: "This comment is not marked as seeded." });
    }

    const nextText = String(req.body?.text || "").trim();
    if (!nextText) {
      return res.status(400).json({ message: "Comment text cannot be empty." });
    }

    const previousText = comment.text;
    comment.text = nextText;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await confession.save();

    await writeSeededAdminLog({
      req,
      type: "seeded_comment_edit",
      message: "Admin edited seeded comment content.",
      confessionId: confession._id,
      commentId: comment._id,
      oldText: previousText,
      newText: nextText,
    });

    res.json({
      message: "Seeded comment updated.",
      confessionId: String(confession._id),
      commentId: String(comment._id),
    });
  } catch (err) {
    console.error("Edit seeded comment error:", err);
    res.status(500).json({ message: "Could not edit seeded comment." });
  }
});

// PATCH /api/admin/seeded-content/reply/:confessionId/:commentId/:replyId
router.patch("/seeded-content/reply/:confessionId/:commentId/:replyId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found." });
    }

    const comment = confession.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    const force = Boolean(req.body?.force);
    if (!(force || (await isManageableSeededItem(reply)))) {
      return res.status(403).json({ message: "This reply is not marked as seeded." });
    }

    const nextText = String(req.body?.text || "").trim();
    if (!nextText) {
      return res.status(400).json({ message: "Reply text cannot be empty." });
    }

    const previousText = reply.text;
    reply.text = nextText;
    reply.isEdited = true;
    reply.editedAt = new Date();
    await confession.save();

    await writeSeededAdminLog({
      req,
      type: "seeded_reply_edit",
      message: "Admin edited seeded reply content.",
      confessionId: confession._id,
      commentId: comment._id,
      replyId: reply._id,
      oldText: previousText,
      newText: nextText,
    });

    res.json({
      message: "Seeded reply updated.",
      confessionId: String(confession._id),
      commentId: String(comment._id),
      replyId: String(reply._id),
    });
  } catch (err) {
    console.error("Edit seeded reply error:", err);
    res.status(500).json({ message: "Could not edit seeded reply." });
  }
});

// DELETE /api/admin/seeded-content/post/:confessionId
router.delete("/seeded-content/post/:confessionId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found." });
    }

    const force = Boolean(req.body?.force);
    if (!(force || (await isManageableSeededItem(confession)))) {
      return res.status(403).json({ message: "This post is not marked as seeded." });
    }

    const oldText = confession.message;
    await Confession.findByIdAndDelete(confession._id);

    await writeSeededAdminLog({
      req,
      type: "seeded_post_delete",
      message: "Admin deleted seeded post content.",
      confessionId: confession._id,
      oldText,
    });

    res.json({
      message: "Seeded post deleted.",
      deleted: { confessionId: String(confession._id) },
    });
  } catch (err) {
    console.error("Delete seeded post error:", err);
    res.status(500).json({ message: "Could not delete seeded post." });
  }
});

// DELETE /api/admin/seeded-content/comment/:confessionId/:commentId
router.delete("/seeded-content/comment/:confessionId/:commentId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found." });
    }

    const comment = confession.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const force = Boolean(req.body?.force);
    if (!(force || (await isManageableSeededItem(comment)))) {
      return res.status(403).json({ message: "This comment is not marked as seeded." });
    }

    const oldText = comment.text;
    comment.deleteOne();
    await confession.save();

    await writeSeededAdminLog({
      req,
      type: "seeded_comment_delete",
      message: "Admin deleted seeded comment content.",
      confessionId: confession._id,
      commentId: req.params.commentId,
      oldText,
    });

    res.json({
      message: "Seeded comment deleted.",
      deleted: {
        confessionId: String(confession._id),
        commentId: String(req.params.commentId),
      },
    });
  } catch (err) {
    console.error("Delete seeded comment error:", err);
    res.status(500).json({ message: "Could not delete seeded comment." });
  }
});

// DELETE /api/admin/seeded-content/reply/:confessionId/:commentId/:replyId
router.delete("/seeded-content/reply/:confessionId/:commentId/:replyId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);
    if (!confession) {
      return res.status(404).json({ message: "Confession not found." });
    }

    const comment = confession.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    const force = Boolean(req.body?.force);
    if (!(force || (await isManageableSeededItem(reply)))) {
      return res.status(403).json({ message: "This reply is not marked as seeded." });
    }

    const oldText = reply.text;
    reply.deleteOne();
    await confession.save();

    await writeSeededAdminLog({
      req,
      type: "seeded_reply_delete",
      message: "Admin deleted seeded reply content.",
      confessionId: confession._id,
      commentId: comment._id,
      replyId: req.params.replyId,
      oldText,
    });

    res.json({
      message: "Seeded reply deleted.",
      deleted: {
        confessionId: String(confession._id),
        commentId: String(comment._id),
        replyId: String(req.params.replyId),
      },
    });
  } catch (err) {
    console.error("Delete seeded reply error:", err);
    res.status(500).json({ message: "Could not delete seeded reply." });
  }
});

// PATCH /api/admin/confessions/:id/hide
router.patch("/confessions/:id/hide", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    confession.isHidden = true;
    confession.hiddenReason = reason || "";
    confession.hiddenBy = req.admin?.id || null;
    confession.hiddenAt = new Date();

    await confession.save();

    const updatedConfession = await Confession.findById(confession._id).populate(
      "userId",
      "username profilePicture isAdmin role"
    );

    res.json(updatedConfession);
  } catch (err) {
    console.error("Hide confession error:", err);
    res.status(500).json({ message: "Could not hide confession" });
  }
});

// PATCH /api/admin/confessions/:id/unhide
router.patch("/confessions/:id/unhide", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    confession.isHidden = false;
    confession.hiddenReason = "";
    confession.hiddenBy = null;
    confession.hiddenAt = null;

    await confession.save();

    const updatedConfession = await Confession.findById(confession._id).populate(
      "userId",
      "username profilePicture isAdmin role"
    );

    res.json(updatedConfession);
  } catch (err) {
    console.error("Unhide confession error:", err);
    res.status(500).json({ message: "Could not unhide confession" });
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

    const pendingReports = await Report.find({
      confessionId: req.params.id,
      status: { $ne: "resolved" },
    });

    await Confession.findByIdAndDelete(req.params.id);

    for (const report of pendingReports) {
      Object.assign(report, buildResolvedReportUpdate("Post deleted by admin."));
      await report.save();
      await rewardReporterIfNeeded(report, "/");
    }

    await debitSeeds({
      userId: ownerId,
      reason: "post_removed",
      amount: -20,
      reasonLabel: "a post removed for rules violation",
      link: "/",
    });

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

// PATCH /api/admin/confessions/:confessionId/comments/:commentId/hide
// PATCH /api/admin/confessions/:confessionId/comments/:commentId/unhide
router.patch(
  "/confessions/:confessionId/comments/:commentId/hide",
  adminProtect,
  async (req, res) => {
    try {
      const { confessionId, commentId } = req.params;
      const confession = await Confession.findById(confessionId);

      if (!confession) {
        return res.status(404).json({ message: "Confession not found" });
      }

      const comment = confession.comments.id(commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

      comment.isHidden = true;
      comment.hiddenReason = reason || "";
      comment.hiddenBy = req.admin?.id || null;
      comment.hiddenAt = new Date();

      await confession.save();

      res.json({ message: "Comment hidden", confession });
    } catch (err) {
      console.error("Hide comment error:", err);
      res.status(500).json({ message: "Could not hide comment" });
    }
  }
);

router.patch(
  "/confessions/:confessionId/comments/:commentId/unhide",
  adminProtect,
  async (req, res) => {
    try {
      const { confessionId, commentId } = req.params;
      const confession = await Confession.findById(confessionId);

      if (!confession) {
        return res.status(404).json({ message: "Confession not found" });
      }

      const comment = confession.comments.id(commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      comment.isHidden = false;
      comment.hiddenReason = "";
      comment.hiddenBy = null;
      comment.hiddenAt = null;

      await confession.save();

      res.json({ message: "Comment unhidden", confession });
    } catch (err) {
      console.error("Unhide comment error:", err);
      res.status(500).json({ message: "Could not unhide comment" });
    }
  }
);

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

// DELETE /api/admin/main-site/confessions/:confessionId
router.delete("/main-site/confessions/:confessionId", adminProtect, async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.confessionId);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    const ownerId = confession.userId;
    const pendingReports = await Report.find({
      confessionId: req.params.confessionId,
      status: { $ne: "resolved" },
    });
    const deletedText = confession.message || "";

    await Confession.findByIdAndDelete(req.params.confessionId);

    for (const report of pendingReports) {
      Object.assign(report, buildResolvedReportUpdate("Post deleted by admin."));
      await report.save();
      await rewardReporterIfNeeded(report, "/");
    }

    if (ownerId) {
      await debitSeeds({
        userId: ownerId,
        reason: "post_removed",
        amount: -20,
        reasonLabel: "a post removed for rules violation",
        link: "/",
      });

      await createNotification({
        userId: ownerId,
        type: "content_removed",
        message: "Your post was removed by an admin.",
        link: "/",
      });
    }

    await writeAdminMainSiteDeleteLog({
      req,
      type: "admin_main_delete_confession",
      message: "Admin deleted a confession from the main site.",
      confessionId: req.params.confessionId,
      deletedText,
      authorId: ownerId,
    });

    res.json({
      message: "Confession deleted",
      deleted: { confessionId: String(req.params.confessionId) },
    });
  } catch (err) {
    console.error("Main-site delete confession error:", err);
    res.status(500).json({ message: "Could not delete confession" });
  }
});

// DELETE /api/admin/main-site/confessions/:confessionId/comments/:commentId
router.delete(
  "/main-site/confessions/:confessionId/comments/:commentId",
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
      const deletedText = commentToDelete.text || "";

      confession.comments = confession.comments.filter(
        (comment) => comment._id.toString() !== commentId
      );

      await confession.save();

      if (commentOwnerId) {
        await createNotification({
          userId: commentOwnerId,
          type: "content_removed",
          message: "Your comment was removed by an admin.",
          link: `/confession/${confessionId}`,
        });
      }

      const updatedConfession = await Confession.findById(confessionId)
        .populate("userId", "username profilePicture isAdmin role")
        .populate("comments.userId", "username profilePicture isAdmin role")
        .populate("comments.replies.userId", "username profilePicture isAdmin role");

      await writeAdminMainSiteDeleteLog({
        req,
        type: "admin_main_delete_comment",
        message: "Admin deleted a comment from the main site.",
        confessionId,
        commentId,
        deletedText,
        authorId: commentOwnerId,
      });

      res.json({
        message: "Comment deleted",
        confession: updatedConfession,
        deleted: {
          confessionId: String(confessionId),
          commentId: String(commentId),
        },
      });
    } catch (err) {
      console.error("Main-site delete comment error:", err);
      res.status(500).json({ message: "Could not delete comment" });
    }
  }
);

// DELETE /api/admin/main-site/confessions/:confessionId/comments/:commentId/replies/:replyId
router.delete(
  "/main-site/confessions/:confessionId/comments/:commentId/replies/:replyId",
  adminProtect,
  async (req, res) => {
    try {
      const { confessionId, commentId, replyId } = req.params;
      const confession = await Confession.findById(confessionId);

      if (!confession) {
        return res.status(404).json({ message: "Confession not found" });
      }

      const comment = confession.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const replyToDelete = comment.replies.id(replyId);
      if (!replyToDelete) {
        return res.status(404).json({ message: "Reply not found" });
      }

      const replyOwnerId = replyToDelete.userId;
      const deletedText = replyToDelete.text || "";

      replyToDelete.deleteOne();
      await confession.save();

      if (replyOwnerId) {
        await createNotification({
          userId: replyOwnerId,
          type: "content_removed",
          message: "Your reply was removed by an admin.",
          link: `/confession/${confessionId}`,
        });
      }

      const updatedConfession = await Confession.findById(confessionId)
        .populate("userId", "username profilePicture isAdmin role")
        .populate("comments.userId", "username profilePicture isAdmin role")
        .populate("comments.replies.userId", "username profilePicture isAdmin role");

      await writeAdminMainSiteDeleteLog({
        req,
        type: "admin_main_delete_reply",
        message: "Admin deleted a reply from the main site.",
        confessionId,
        commentId,
        replyId,
        deletedText,
        authorId: replyOwnerId,
      });

      res.json({
        message: "Reply deleted",
        confession: updatedConfession,
        deleted: {
          confessionId: String(confessionId),
          commentId: String(commentId),
          replyId: String(replyId),
        },
      });
    } catch (err) {
      console.error("Main-site delete reply error:", err);
      res.status(500).json({ message: "Could not delete reply" });
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
      Object.assign(
        report,
        buildResolvedReportUpdate("Parent post was already deleted.")
      );
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

    Object.assign(
      report,
      buildResolvedReportUpdate(
        commentWasDeleted
          ? "Reported comment was deleted by admin."
          : "Reported comment was already missing."
      )
    );
    await report.save();

    if (commentWasDeleted) {
      await rewardReporterIfNeeded(
        report,
        report.confessionId ? `/confession/${report.confessionId}` : "/"
      );
    }

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
        seeds: publicUser.seeds || 0,
      },
    });
  } catch (err) {
    console.error("Enter site as admin error:", err);
    res.status(500).json({ message: "Could not enter main site as admin" });
  }
});
// POST /api/admin/users/:id/give-seeds
router.post("/users/:id/give-seeds", adminProtect, async (req, res) => {
  try {
    const { amount, message } = req.body;

    const seedAmount = Number(amount);

    if (!Number.isFinite(seedAmount) || seedAmount <= 0) {
      return res.status(400).json({
        message: "Seed amount must be a positive number.",
      });
    }

    if (seedAmount > 10000) {
      return res.status(400).json({
        message: "Seed amount is too high. Max allowed is 10000.",
      });
    }

    const targetUser = await User.findById(req.params.id).select("-password");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    targetUser.seeds = (targetUser.seeds || 0) + seedAmount;
    await targetUser.save();

    const defaultMessage = `An admin gifted you ${seedAmount} Seeds 🌱`;

    await createNotification({
      userId: targetUser._id,
      type: "admin_seed_gift",
      message: message?.trim() || defaultMessage,
      link: "/shop",
    });

    res.json({
      message: `Gave ${seedAmount} Seeds to @${targetUser.username}.`,
      user: targetUser,
    });
  } catch (err) {
    console.error("Give seeds error:", err);
    res.status(500).json({
      message: "Could not give seeds right now.",
    });
  }
});
module.exports = { router, adminProtect };
