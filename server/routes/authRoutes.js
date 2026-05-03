const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const OTP = require("../models/OTP");
const PasswordReset = require("../models/PasswordReset");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { protect } = require("../middleware/auth");
const { loginLimiter, emailOtpLimiter, resetPasswordLimiter } = require("../middleware/rateLimiter");
const { sanitizeText, sanitizeEmail } = require("../middleware/sanitizeInput");
const { imageUploadOptions } = require("../middleware/uploadSecurity");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profiles",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage, ...imageUploadOptions });

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

const normalizeEmail = sanitizeEmail;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

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
    tokenExpiresAt: decoded?.exp
      ? decoded.exp * 1000
      : Date.now() + 2 * 60 * 60 * 1000,
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

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE APPS SCRIPT EMAIL RELAY
// Render free blocks SMTP ports, so backend calls Apps Script over HTTPS.
// Apps Script sends the email using your Gmail account.
// Required env:
// EMAIL_RELAY_URL=https://script.google.com/macros/s/xxxx/exec
// EMAIL_RELAY_SECRET=your_same_secret_from_apps_script
// ─────────────────────────────────────────────────────────────────────────────

const sendAppEmail = async ({ to, subject, html, text }) => {
  const relayUrl = process.env.EMAIL_RELAY_URL;
  const relaySecret = process.env.EMAIL_RELAY_SECRET;

  if (!relayUrl) {
    throw new Error("EMAIL_RELAY_URL is missing from environment variables.");
  }

  if (!relaySecret) {
    throw new Error("EMAIL_RELAY_SECRET is missing from environment variables.");
  }

  if (!to || !subject || !html) {
    throw new Error("Email requires to, subject, and html.");
  }

  if (typeof fetch !== "function") {
    throw new Error(
      "Global fetch is not available. Use Node.js 18+ on Render/local server."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(relayUrl, {
      method: "POST",
      headers: {
        // Apps Script is more reliable with text/plain than application/json.
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        secret: relaySecret,
        to,
        subject,
        html,
        text: text || subject,
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Email relay returned non-JSON response: ${rawText}`);
    }

    if (!data.ok) {
      throw new Error(data.message || "Email relay failed.");
    }

    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Email relay request timed out.");
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const baseEmailTemplate = ({ title, message, otp, footer }) => `
  <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a1a0a; color: #d7ffcd; border-radius: 16px;">
    <h2 style="color: #7ada5a; letter-spacing: 0.1em; margin-top: 0;">
      Confession Wall
    </h2>

    <h3 style="color: #d7ffcd; margin-bottom: 12px;">
      ${title}
    </h3>

    <p style="font-size: 15px; line-height: 1.7;">
      ${message}
    </p>

    <div style="font-size: 36px; font-weight: bold; letter-spacing: 0.3em; color: #a0f080; margin: 24px 0; text-align: center;">
      ${otp}
    </div>

    <p style="font-size: 13px; color: #6a9a5a; line-height: 1.6;">
      ${footer}
    </p>
  </div>
`;

const otpEmailTemplate = (otp) =>
  baseEmailTemplate({
    title: "Verify your email",
    message: "Your one-time verification code is:",
    otp,
    footer:
      "This code expires in <strong>10 minutes</strong>. Do not share it with anyone.",
  });

const resetEmailTemplate = (otp) =>
  baseEmailTemplate({
    title: "Reset your password",
    message: "Use this code to reset your password:",
    otp,
    footer:
      "This code expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.",
  });

// ─────────────────────────────────────────────────────────────────────────────
// SEND OTP - STEP 1 OF REGISTRATION
// POST /api/auth/send-otp
// ─────────────────────────────────────────────────────────────────────────────

router.post("/send-otp", emailOtpLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = generateOTP();

    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await sendAppEmail({
      to: email,
      subject: "Your Confession Wall OTP",
      html: otpEmailTemplate(otp),
      text: `Your Confession Wall OTP is ${otp}. It expires in 10 minutes.`,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err.message);
    res.status(500).json({
      message: "Could not send OTP right now.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER - VERIFY OTP + CREATE ACCOUNT
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const username = sanitizeText(req.body.username, { maxLength: 40, allowNewLines: false });
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const otp = String(req.body.otp || "").trim();

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const passwordError = validatePasswordStrength(password);

    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "OTP not found. Please request a new one." });
    }

    const ageMs = Date.now() - new Date(otpRecord.createdAt).getTime();

    if (ageMs > OTP_EXPIRY_MS) {
      await OTP.deleteOne({ email });
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    await OTP.deleteOne({ email });

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email or username already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const profilePicture = req.file ? req.file.path : null;

    const user = await User.create({
      username,
      email,
      password: hashed,
      profilePicture,
    });

    const tokens = createAuthTokens(user);

    res.json({
      ...tokens,
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Could not create account right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        message: user.banReason || "Your account has been banned by admin.",
        statusType: "banned",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const tokens = createAuthTokens(user);

    res.json({
      ...tokens,
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Could not log in right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH ACCESS TOKEN
// POST /api/auth/refresh-token
// ─────────────────────────────────────────────────────────────────────────────

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

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD - SEND RESET OTP
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

router.post("/forgot-password", emailOtpLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Generic response keeps registered emails private.
    if (!user) {
      return res.json({
        message: "If this email exists, a reset code has been sent.",
      });
    }

    const otp = generateOTP();

    await PasswordReset.findOneAndUpdate(
      { email },
      { otp, attempts: 0, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await sendAppEmail({
      to: email,
      subject: "Reset your Confession Wall password",
      html: resetEmailTemplate(otp),
      text: `Your Confession Wall password reset code is ${otp}. It expires in 10 minutes.`,
    });

    res.json({
      message: "If this email exists, a reset code has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ message: "Could not send reset code right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD WITH OTP
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const { newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required." });
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const resetRecord = await PasswordReset.findOne({ email });

    if (!resetRecord) {
      return res
        .status(400)
        .json({ message: "Reset code expired. Please request a new one." });
    }

    const ageMs = Date.now() - new Date(resetRecord.createdAt).getTime();

    if (ageMs > OTP_EXPIRY_MS) {
      await PasswordReset.deleteOne({ email });
      return res
        .status(400)
        .json({ message: "Reset code expired. Please request a new one." });
    }

    if (resetRecord.attempts >= MAX_RESET_ATTEMPTS) {
      await PasswordReset.deleteOne({ email });
      return res
        .status(429)
        .json({ message: "Too many wrong attempts. Please request a new code." });
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

    res.json({
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ message: "Could not reset password right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────

router.put("/profile", protect, upload.single("profilePicture"), async (req, res) => {
  try {
    const updates = {};

    if (req.body.username) {
      updates.username = sanitizeText(req.body.username, { maxLength: 40, allowNewLines: false });
    }

    if (req.file) {
      updates.profilePicture = req.file.path;
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    }).select("-password");

    res.json(updated);
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ message: "Could not update profile right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT USER
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE BIO
// PUT /api/auth/bio
// ─────────────────────────────────────────────────────────────────────────────

router.put("/bio", protect, async (req, res) => {
  try {
    const { bio } = req.body;
    const cleanBio = sanitizeText(bio, { maxLength: 200, allowNewLines: true });

    if (cleanBio.length > 200) {
      return res
        .status(400)
        .json({ message: "Bio must be 200 characters or less" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { bio: cleanBio },
      { new: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    console.error("Update bio error:", err.message);
    res.status(500).json({ message: "Could not update bio right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// PUT /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────

router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both fields are required" });
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    res.status(500).json({ message: "Could not change password right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ACCOUNT
// DELETE /api/auth/account
// ─────────────────────────────────────────────────────────────────────────────

router.delete("/account", protect, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ message: "Password is required to delete account" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const Confession = require("../models/Confession");

    await Confession.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err.message);
    res.status(500).json({ message: "Could not delete account right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET POST COUNT
// GET /api/auth/post-count
// ─────────────────────────────────────────────────────────────────────────────

router.get("/post-count", protect, async (req, res) => {
  try {
    const Confession = require("../models/Confession");
    const count = await Confession.countDocuments({ userId: req.user._id });

    res.json({ count });
  } catch (err) {
    console.error("Post count error:", err.message);
    res.status(500).json({ message: "Could not get post count right now." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET PUBLIC USER PROFILE
// GET /api/auth/user/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Public user profile error:", err.message);
    res.status(500).json({ message: "Could not load user profile right now." });
  }
});

module.exports = router;