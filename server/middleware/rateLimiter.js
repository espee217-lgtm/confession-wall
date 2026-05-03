const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const getRequestKey = (req, prefix) => {
  const ip = ipKeyGenerator(req.ip);

  const email =
    req.body && req.body.email
      ? String(req.body.email).trim().toLowerCase()
      : "";

  const userId = req.user && req.user._id ? String(req.user._id) : "";

  return [prefix, ip, email, userId].filter(Boolean).join(":");
};

const makeLimiter = ({ windowMs, max, message, prefix }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getRequestKey(req, prefix),
    message: {
      message,
    },
  });

// Login protection
const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: "login",
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});

// Registration OTP / email OTP protection
const otpLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  prefix: "otp",
  message: "Too many OTP requests. Please wait 15 minutes and try again.",
});

// Forgot password OTP protection
const forgotPasswordLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  prefix: "forgot-password",
  message: "Too many reset code requests. Please wait 15 minutes and try again.",
});

// Reset password form attempts
const resetPasswordLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  prefix: "reset-password",
  message: "Too many reset attempts. Please wait 15 minutes and try again.",
});

// Reactions: water/burn/etc.
const reactionLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: "reaction",
  message: "You are reacting too fast. Please slow down.",
});

// Fallback post limiter.
// If your route already has its own limiter, this keeps compatibility.
const postLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  prefix: "post",
  message: "Too many posts. Please wait a bit.",
});

// Fallback comment limiter.
// If your route already has its own limiter, this keeps compatibility.
const commentLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  prefix: "comment",
  message: "Too many comments. Please wait a bit.",
});

// Fallback report limiter.
// If your route already has its own limiter, this keeps compatibility.
const reportLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: "report",
  message: "Too many reports. Please wait before reporting again.",
});

// Compatibility aliases.
// These prevent crashes if different route files import older names.
const sendOtpLimiter = otpLimiter;
const emailOtpLimiter = otpLimiter;
const registerLimiter = otpLimiter;
const authLimiter = loginLimiter;
const forgotLimiter = forgotPasswordLimiter;
const forgotPasswordOtpLimiter = forgotPasswordLimiter;
const passwordResetLimiter = resetPasswordLimiter;
const resetLimiter = resetPasswordLimiter;
const resetOtpLimiter = resetPasswordLimiter;
const confessionLimiter = postLimiter;
const createPostLimiter = postLimiter;
const createConfessionLimiter = postLimiter;
const addCommentLimiter = commentLimiter;
const createCommentLimiter = commentLimiter;
const createReportLimiter = reportLimiter;

module.exports = {
  makeLimiter,

  loginLimiter,
  authLimiter,

  otpLimiter,
  sendOtpLimiter,
  emailOtpLimiter,
  registerLimiter,

  forgotPasswordLimiter,
  forgotLimiter,
  forgotPasswordOtpLimiter,

  resetPasswordLimiter,
  passwordResetLimiter,
  resetLimiter,
  resetOtpLimiter,

  reactionLimiter,

  postLimiter,
  confessionLimiter,
  createPostLimiter,
  createConfessionLimiter,

  commentLimiter,
  addCommentLimiter,
  createCommentLimiter,

  reportLimiter,
  createReportLimiter,
};