const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const OTP = require("../models/OTP");
const PasswordReset = require("../models/PasswordReset");
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
  tls: {
    rejectUnauthorized: false,
  },
});

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const buildUserPayload = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  profilePicture: user.profilePicture,
  bio: user.bio,
  isAdmin: user.isAdmin,
  isSuspended: user.isSuspended,
  isBanned: user.isBanned,
  suspendReason: user.suspendReason,
  banReason: user.banReason,
});

const createAuthTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "2h" }
  );

  const refreshToken = jwt.sign(
    { id: user._id, type: "refresh" },
    getRefreshSecret(),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  const decoded = jwt.decode(accessToken);

  return {
    token: accessToken,
    refreshToken,
    tokenExpiresAt: decoded?.exp ? decoded.exp * 1000 : Date.now() + 2 * 60 * 60 * 1000,
  };
};

const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }

  return null;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

// ── SEND OTP (step 1 of registration) ────────────────────────────────────────
router.post("/send-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
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
    const username = String(req.body.username || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const otp = String(req.body.otp || "").trim();

    if (!username) return res.status(400).json({ message: "Username is required" });
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const passwordError = validatePasswordStrength(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

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

    const tokens = createAuthTokens(user);
    res.json({
      ...tokens,
      user: buildUserPayload(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

        if (user.isBanned) {
      return res.status(403).json({
        message:
          user.banReason ||
          "Your account has been banned by admin.",
        statusType: "banned",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const tokens = createAuthTokens(user);
    res.json({
      ...tokens,
      user: buildUserPayload(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── REFRESH ACCESS TOKEN ─────────────────────────────────────────────────────
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, getRefreshSecret());

    if (decoded.type && decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.isBanned) {
      return res.status(403).json({
        message: user.banReason || "Your account has been banned by admin.",
        statusType: "banned",
      });
    }

    const tokens = createAuthTokens(user);

    res.json({
      ...tokens,
      user: buildUserPayload(user),
    });
  } catch (err) {
    return res.status(401).json({
      message: "Refresh session expired. Please log in again.",
      statusType: "refresh_expired",
    });
  }
});

// ── FORGOT PASSWORD: SEND RESET OTP ──────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    // Generic response keeps user emails private.
    if (!user) {
      return res.json({ message: "If this email exists, a reset code has been sent." });
    }

    const otp = generateOTP();

    await PasswordReset.findOneAndUpdate(
      { email },
      { otp, attempts: 0, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await transporter.sendMail({
      from: `"Confession Wall" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your Confession Wall password",
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a1a0a; color: #d7ffcd; border-radius: 16px;">
          <h2 style="color: #7ada5a; letter-spacing: 0.1em;">Confession Wall</h2>
          <p style="font-size: 15px; line-height: 1.7;">Use this code to reset your password:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 0.3em; color: #a0f080; margin: 24px 0; text-align: center;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #6a9a5a;">This code expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "If this email exists, a reset code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Could not send reset code right now." });
  }
});

// ── RESET PASSWORD WITH OTP ──────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const { newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required." });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const resetRecord = await PasswordReset.findOne({ email });

    if (!resetRecord) {
      return res.status(400).json({ message: "Reset code expired. Please request a new one." });
    }

    const ageMs = Date.now() - new Date(resetRecord.createdAt).getTime();
    if (ageMs > 10 * 60 * 1000) {
      await PasswordReset.deleteOne({ email });
      return res.status(400).json({ message: "Reset code expired. Please request a new one." });
    }

    if (resetRecord.attempts >= 5) {
      await PasswordReset.deleteOne({ email });
      return res.status(429).json({ message: "Too many wrong attempts. Please request a new code." });
    }

    if (resetRecord.otp !== otp) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      return res.status(400).json({ message: "Invalid reset code." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      await PasswordReset.deleteOne({ email });
      return res.status(400).json({ message: "Account not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await PasswordReset.deleteOne({ email });

    res.json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Could not reset password right now." });
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
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) return res.status(400).json({ message: passwordError });
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