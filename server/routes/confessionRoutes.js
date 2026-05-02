const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const express = require("express");
const router = express.Router();
const Confession = require("../models/Confession");
const rateLimit = require("express-rate-limit");
const { protect, blockSuspended } = require("../middleware/auth");

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

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "confessions",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
  },
});

const upload = multer({ storage });

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
      const newConfession = new Confession({
        userId: req.user._id,
        message: req.body.message,
        image: req.file ? req.file.path : null,
        comments: [],
      });

      const saved = await newConfession.save();

      const populated = await Confession.findById(saved._id).populate(
        "userId",
        "username profilePicture isAdmin role"
      );

      res.json(populated);
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

      confession.comments.push({
        text: req.body.text || "",
        image: req.file ? req.file.path : null,
        userId: req.user._id,
      });

      await confession.save();

      const updated = await Confession.findById(req.params.id)
        .populate("userId", "username profilePicture isAdmin role")
        .populate("comments.userId", "username profilePicture isAdmin role");

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// REACT to a confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post("/:id/react", protect, blockSuspended, async (req, res) => {
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

    if (alreadyVoted) {
      confession[addField].pull(userId);
    } else {
      confession[removeField].pull(userId);
      confession[addField].push(userId);
    }

    await confession.save();

    res.json({
      wateredBy: confession.wateredBy,
      burnedBy: confession.burnedBy,
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