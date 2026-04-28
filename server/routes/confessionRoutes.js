const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const express = require("express");
const router = express.Router();
const Confession = require("../models/Confession");
const { protect } = require("../middleware/auth");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
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
      .populate("userId", "username profilePicture");
    res.json(confessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single confession by ID
router.get("/:id", async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture");
    if (!confession)
      return res.status(404).json({ message: "Confession not found" });
    res.json(confession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new confession
router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const newConfession = new Confession({
      userId: req.user._id,
      message: req.body.message,
      image: req.file ? req.file.path : null,
      comments: [],
    });
    const saved = await newConfession.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a confession
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Confession.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Confession not found" });
    res.json({ message: "Confession deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a comment to a confession (with optional image)
router.post("/:id/comments", protect, upload.single("image"), async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession)
      return res.status(404).json({ message: "Confession not found" });

    confession.comments.push({
      text: req.body.text || "",
      image: req.file ? req.file.path : null,
      userId: req.user._id,
    });
    await confession.save();

    const updated = await Confession.findById(req.params.id)
      .populate("userId", "username profilePicture")
      .populate("comments.userId", "username profilePicture");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REACT to a confession (water / burn)
router.post("/:id/react", protect, async (req, res) => {
  try {
    const { type } = req.body;
    if (!["water", "burn"].includes(type)) return res.status(400).json({ error: "Invalid type" });

    const confession = await Confession.findById(req.params.id);
    if (!confession) return res.status(404).json({ error: "Not found" });

    const userId = req.user._id;
    const addField    = type === "water" ? "wateredBy" : "burnedBy";
    const removeField = type === "water" ? "burnedBy"  : "wateredBy";

    const alreadyVoted = confession[addField].some(id => id.equals(userId));
    if (alreadyVoted) {
      confession[addField].pull(userId);
    } else {
      confession[removeField].pull(userId);
      confession[addField].push(userId);
    }

    await confession.save();
    res.json({ wateredBy: confession.wateredBy, burnedBy: confession.burnedBy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REACT to a comment (water / burn)
router.post("/:id/comments/:commentIndex/react", protect, async (req, res) => {
  try {
    const { type } = req.body;
    if (!["water", "burn"].includes(type)) return res.status(400).json({ error: "Invalid type" });

    const confession = await Confession.findById(req.params.id);
    if (!confession) return res.status(404).json({ error: "Not found" });

    const comment = confession.comments[req.params.commentIndex];
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const userId = req.user._id;
    const addField    = type === "water" ? "wateredBy" : "burnedBy";
    const removeField = type === "water" ? "burnedBy"  : "wateredBy";

    const alreadyVoted = comment[addField].some(id => id.equals(userId));
    if (alreadyVoted) {
      comment[addField].pull(userId);
    } else {
      comment[removeField].pull(userId);
      comment[addField].push(userId);
    }

    await confession.save();
    res.json({ wateredBy: comment.wateredBy, burnedBy: comment.burnedBy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;