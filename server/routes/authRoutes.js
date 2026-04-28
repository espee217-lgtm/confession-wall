const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const OTP = require("../models/OTP");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { protect } = require("../middleware/auth");

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "profiles", allowed_formats: ["jpg", "png", "jpeg", "webp"] },
});
const upload = multer({ storage });

// ── Nodemailer transporter ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── SEND OTP (step 1 of registration) ────────────────────────────────────────
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Check if email already registered
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    // Generate OTP and save (upsert so resend works)
    const otp = generateOTP();
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send email
    await transporter.sendMail({
      from: `"Confession Wall" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Confession Wall OTP",
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a1a0a; color: #d7ffcd; border-radius: 16px;">
          <h2 style="color: #7ada5a; letter-spacing: 0.1em;">Confession Wall</h2>
          <p style="font-size: 15px; line-height: 1.7;">Your one-time verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 0.3em; color: #a0f080; margin: 24px 0; text-align: center;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #6a9a5a;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY OTP + CREATE ACCOUNT (step 2 of registration) ─────────────────────
router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!otp) return res.status(400).json({ message: "OTP is required" });

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) return res.status(400).json({ message: "OTP not found. Please request a new one." });

    // Check expiry (10 minutes)
    const ageMs = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (ageMs > 10 * 60 * 1000) {
      await OTP.deleteOne({ email });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Check OTP match
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    // OTP valid — delete it
    await OTP.deleteOne({ email });

    // Check for duplicate username/email
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: "Email or username already taken" });

    // Create user
    const hashed = await bcrypt.hash(password, 10);
    const profilePicture = req.file ? req.file.path : null;
    const user = await User.create({ username, email, password: hashed, profilePicture });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
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

// ── GET CURRENT USER ──────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

// ── UPDATE BIO ────────────────────────────────────────────────────────────────
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

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
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

// ── DELETE ACCOUNT ────────────────────────────────────────────────────────────
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

// ── GET POST COUNT ────────────────────────────────────────────────────────────
router.get("/post-count", protect, async (req, res) => {
  try {
    const Confession = require("../models/Confession");
    const count = await Confession.countDocuments({ userId: req.user._id });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET PUBLIC USER PROFILE ───────────────────────────────────────────────────
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
