const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { protect } = require("../middleware/auth");

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "profiles", allowed_formats: ["jpg", "png", "jpeg", "webp"] },
});
const upload = multer({ storage });

// REGISTER
router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: "Email or username already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const profilePicture = req.file ? req.file.path : null;

    const user = await User.create({ username, email, password: hashed, profilePicture });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PROFILE
router.put("/profile", protect, upload.single("profilePicture"), async (req, res) => {
  try {
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.file) updates.profilePicture = req.file.path;

    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET current user
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});
// UPDATE BIO
router.put("/bio", protect, async (req, res) => {
  try {
    const { bio } = req.body;
    if (bio && bio.length > 200)
      return res.status(400).json({ message: "Bio must be 200 characters or less" });
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { bio: bio || "" },
      { new: true }
    ).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHANGE PASSWORD
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(400).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE ACCOUNT
router.delete("/account", protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password is required to delete account" });
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Incorrect password" });
    const Confession = require("../models/Confession");
    await Confession.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET POST COUNT
router.get("/post-count", protect, async (req, res) => {
  try {
    const Confession = require("../models/Confession");
    const count = await Confession.countDocuments({ userId: req.user._id });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/auth/user/:id — public profile
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -email");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;

