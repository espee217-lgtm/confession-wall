const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const express = require("express");
const router = express.Router();
const Confession = require("../models/Confession");
const Notification = require("../models/Notification");
const rateLimit = require("express-rate-limit");
const { protect, blockSuspended } = require("../middleware/auth");
const { sanitizeText } = require("../middleware/sanitizeInput");
const { imageUploadOptions } = require("../middleware/uploadSecurity");
const { reactionLimiter } = require("../middleware/rateLimiter");
const { createAdminLog } = require("../utils/adminLogger");
const { awardSeeds } = require("../utils/seedRewards");

const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    message: "Too many posts. Please wait before posting again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many comments. Please wait before commenting again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "confessions",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
  },
});

const upload = multer({ storage, ...imageUploadOptions });

// GET all confessions
router.get("/", async (req, res) => {
  try {
    const confessions = await Confession.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username profilePicture isAdmin role");

    res.json(confessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET thriving confessions
router.get("/realm/thriving", async (req, res) => {
  try {
    const confessions = await Confession.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username profilePicture isAdmin role");

    const thriving = confessions.filter((p) => {
      const total = p.wateredBy.length + p.burnedBy.length;
      if (total === 0) return true;
      return p.wateredBy.length / total >= 0.5;
    });

    res.json(thriving);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET scorched confessions
router.get("/realm/scorched", async (req, res) => {
  try {
    const confessions = await Confession.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username profilePicture isAdmin role");

    const scorched = confessions.filter((p) => {
      const total = p.wateredBy.length + p.burnedBy.length;
      if (total === 0) return false;
      return p.burnedBy.length / total > 0.5;
    });

    res.json(scorched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// SEARCH confessions
// Query params:
// q = text/username search
// type = all | grove | budding | scorched
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all").trim().toLowerCase();

    const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query = q
      ? {
          $or: [
            { message: { $regex: safeRegex, $options: "i" } },
            { "comments.text": { $regex: safeRegex, $options: "i" } },
          ],
        }
      : {};

    let confessions = await Confession.find(query)
      .sort({ createdAt: -1 })
      .limit(80)
      .populate("userId", "username profilePicture isAdmin role");

    // Also allow searching by username after population.
    if (q) {
      const lower = q.toLowerCase();
      const usernameMatches = await Confession.find()
        .sort({ createdAt: -1 })
        .limit(120)
        .populate("userId", "username profilePicture isAdmin role");

      const byUsername = usernameMatches.filter((post) =>
        String(post.userId?.username || "").toLowerCase().includes(lower)
      );

      const map = new Map();
      [...confessions, ...byUsername].forEach((post) => map.set(String(post._id), post));
      confessions = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const getRealm = (post) => {
      const watered = post.wateredBy?.length || 0;
      const burned = post.burnedBy?.length || 0;
      const total = watered + burned;

      if (total === 0) return "budding";
      if (burned / total > 0.5) return "scorched";
      return "grove";
    };

    if (["grove", "budding", "scorched"].includes(type)) {
      confessions = confessions.filter((post) => getRealm(post) === type);
    }

    res.json(confessions.slice(0, 60));
  } catch (err) {
    console.error("Search confessions error:", err);
    res.status(500).json({ message: "Could not search confessions right now." });
  }
});

// GET single confession by ID
router.get("/:id", async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id)
      .populate("userId", "username profilePicture isAdmin role")
      .populate("comments.userId", "username profilePicture isAdmin role");

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    res.json(confession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post(
  "/",
  protect,
  blockSuspended,
  postLimiter,
  upload.single("image"),
  async (req, res) => {
    try {
      const message = sanitizeText(req.body.message, { maxLength: 2000, allowNewLines: true });

      if (!message && !req.file) {
        return res.status(400).json({ message: "Post text or image is required." });
      }

      const newConfession = new Confession({
        userId: req.user._id,
        message,
        image: req.file ? req.file.path : null,
        comments: [],
      });

      const saved = await newConfession.save();

      const populated = await Confession.findById(saved._id).populate(
        "userId",
        "username profilePicture isAdmin role"
      );

      await createAdminLog({
        req,
        type: "post_create",
        message: `@${req.user.username || "Someone"} created a new post.`,
        user: req.user,
        targetId: saved._id,
        targetType: "confession",
        metadata: { hasImage: Boolean(req.file) },
      });

      const seedReward = await awardSeeds({
        userId: req.user._id,
        reason: "post_create",
        reasonLabel: "creating a post",
        link: `/confession/${saved._id}`,
      });

      const responsePost = populated?.toObject ? populated.toObject() : populated;
      responsePost.seedReward = seedReward;

      res.json(responsePost);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE a confession
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Confession.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Confession not found" });
    }

    res.json({ message: "Confession deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a comment to a confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post(
  "/:id/comments",
  protect,
  blockSuspended,
  commentLimiter,
  upload.single("image"),
  async (req, res) => {
    try {
      const confession = await Confession.findById(req.params.id);

      if (!confession) {
        return res.status(404).json({ message: "Confession not found" });
      }

      const text = sanitizeText(req.body.text, { maxLength: 1000, allowNewLines: true });

      if (!text && !req.file) {
        return res.status(400).json({ message: "Comment text or image is required." });
      }

      confession.comments.push({
        text,
        image: req.file ? req.file.path : null,
        userId: req.user._id,
      });

      const newComment = confession.comments[confession.comments.length - 1];

      await confession.save();

      const postOwnerId = confession.userId;
      const commenterId = req.user._id;

      if (postOwnerId && !postOwnerId.equals(commenterId)) {
        await createNotification({
          userId: postOwnerId,
          type: "comment",
          message: `${req.user.username || "Someone"} commented on your post.`,
          link: `/confession/${confession._id}`,
        });
      }

      await createAdminLog({
        req,
        type: "comment_create",
        message: `@${req.user.username || "Someone"} commented on a post.`,
        user: req.user,
        targetId: newComment?._id || confession._id,
        targetType: "comment",
        metadata: {
          confessionId: String(confession._id),
          hasImage: Boolean(req.file),
        },
      });

      const seedReward = await awardSeeds({
        userId: req.user._id,
        reason: "comment_create",
        reasonLabel: "creating a comment",
        link: `/confession/${confession._id}`,
      });

      const updated = await Confession.findById(req.params.id)
        .populate("userId", "username profilePicture isAdmin role")
        .populate("comments.userId", "username profilePicture isAdmin role");

      const responsePost = updated?.toObject ? updated.toObject() : updated;
      responsePost.seedReward = seedReward;

      res.json(responsePost);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// REACT to a confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post("/:id/react", protect, blockSuspended, reactionLimiter, async (req, res) => {
  try {
    const { type } = req.body;

    if (!["water", "burn"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const confession = await Confession.findById(req.params.id);

    if (!confession) {
      return res.status(404).json({ error: "Not found" });
    }

    const userId = req.user._id;
    const addField = type === "water" ? "wateredBy" : "burnedBy";
    const removeField = type === "water" ? "burnedBy" : "wateredBy";

    const alreadyVoted = confession[addField].some((id) => id.equals(userId));
    const hadAnyReactionBefore =
      confession.wateredBy.some((id) => id.equals(userId)) ||
      confession.burnedBy.some((id) => id.equals(userId));

    if (alreadyVoted) {
      confession[addField].pull(userId);
    } else {
      confession[removeField].pull(userId);
      confession[addField].push(userId);
    }

    let seedReward = null;

    if (!alreadyVoted && confession.userId && !confession.userId.equals(userId)) {
      await createNotification({
        userId: confession.userId,
        type: "reaction",
        message:
          type === "water"
            ? `${req.user.username || "Someone"} watered your post.`
            : `${req.user.username || "Someone"} burned your post.`,
        link: `/confession/${confession._id}`,
      });

      const alreadyRewardedForThisReactor = confession.seedReactionRewardedBy?.some((id) =>
        id.equals(userId)
      );

      if (!hadAnyReactionBefore && !alreadyRewardedForThisReactor) {
        seedReward = await awardSeeds({
          userId: confession.userId,
          reason: "post_reaction_received",
          reasonLabel: "someone reacting to your post",
          link: `/confession/${confession._id}`,
        });

        confession.seedReactionRewardedBy.push(userId);
      }
    }

    await confession.save();

    res.json({
      wateredBy: confession.wateredBy,
      burnedBy: confession.burnedBy,
      seedReward,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REACT to a comment
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post(
  "/:id/comments/:commentIndex/react",
  protect,
  blockSuspended,
  reactionLimiter,
  async (req, res) => {
    try {
      const { type } = req.body;

      if (!["water", "burn"].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      const confession = await Confession.findById(req.params.id);

      if (!confession) {
        return res.status(404).json({ error: "Not found" });
      }

      const comment = confession.comments[req.params.commentIndex];

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const userId = req.user._id;
      const addField = type === "water" ? "wateredBy" : "burnedBy";
      const removeField = type === "water" ? "burnedBy" : "wateredBy";

      const alreadyVoted = comment[addField].some((id) => id.equals(userId));

      if (alreadyVoted) {
        comment[addField].pull(userId);
      } else {
        comment[removeField].pull(userId);
        comment[addField].push(userId);
      }

      await confession.save();

      if (!alreadyVoted && comment.userId && !comment.userId.equals(userId)) {
        await createNotification({
          userId: comment.userId,
          type: "reaction",
          message:
            type === "water"
              ? `${req.user.username || "Someone"} watered your comment.`
              : `${req.user.username || "Someone"} burned your comment.`,
          link: `/confession/${confession._id}`,
        });
      }

      res.json({
        wateredBy: comment.wateredBy,
        burnedBy: comment.burnedBy,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;