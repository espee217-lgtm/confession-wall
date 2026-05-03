const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["user_login", "user_register", "post_create", "comment_create"],
      index: true,
    },

    message: {
      type: String,
      required: true,
      maxlength: 300,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    username: {
      type: String,
      default: "",
      maxlength: 80,
    },

    email: {
      type: String,
      default: "",
      maxlength: 160,
    },

    ipAddress: {
      type: String,
      default: "",
      maxlength: 80,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["user", "confession", "comment", ""],
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Admin logs will be automatically deleted after 30 days
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "30d",
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },
  }
);

adminLogSchema.index({ type: 1, createdAt: -1 });
adminLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("AdminLog", adminLogSchema);