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
      enum: ["comment", "reaction", "report_resolved", "content_removed", "seed_credit", "seed_debit"],
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