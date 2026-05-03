const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },

    linkedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspendReason: {
      type: String,
      default: "",
      maxlength: 300,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    banReason: {
      type: String,
      default: "",
      maxlength: 300,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    seeds: {
      type: Number,
      default: 0,
      min: 0,
    },

    seedDailyStats: {
      dateKey: { type: String, default: "" },
      loginRewards: { type: Number, default: 0 },
      postRewards: { type: Number, default: 0 },
      commentRewards: { type: Number, default: 0 },
      reactionRewards: { type: Number, default: 0 },
      acceptedReportRewards: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ isBanned: 1, isSuspended: 1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ seeds: -1 });

module.exports = mongoose.model("User", userSchema);