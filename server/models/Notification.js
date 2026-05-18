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
        "reaction",
        "report_resolved",
        "content_removed",
        "seed_credit",
        "seed_debit",
        "admin_seed_gift",
        "weekly_event_effect",
        "weekly_event_effect_expired",
        "weekly_event_tie_break",
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

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
