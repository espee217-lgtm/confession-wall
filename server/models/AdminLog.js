const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "user_login",
        "user_register",
        "post_create",
        "comment_create",
        "seeded_post_edit",
        "seeded_comment_edit",
        "seeded_reply_edit",
        "seeded_post_delete",
        "seeded_comment_delete",
        "seeded_reply_delete",
        "seeded_account_impersonation_start",
        "admin_main_delete_confession",
        "admin_main_delete_comment",
        "admin_main_delete_reply",
      ],
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
      enum: ["user", "confession", "comment", "reply", ""],
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
