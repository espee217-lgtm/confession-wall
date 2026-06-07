const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "comment",
        "root_reply",
        "mention",
        "reaction",
        "report_resolved",
        "content_removed",
        "seed_credit",
        "seed_debit",
        "admin_seed_gift",
        "weekly_event_effect",
        "weekly_event_effect_expired",
        "weekly_event_tie_break",
        "title_unlocked",
        "friend_request",
        "friend_accept",
        "chess_invite",
        "chess_accept",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    link: {
      type: String,
      default: "/",
      trim: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    confessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Confession",
      default: null,
    },

    targetType: {
      type: String,
      enum: ["confession", "comment", "reply"],
      default: null,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    replyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    action: {
      type: String,
      enum: ["water", "burn"],
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
