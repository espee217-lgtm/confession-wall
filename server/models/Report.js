const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["confession", "comment"],
      required: true,
    },

    confessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Confession",
      required: true,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Snapshot of reported comment/post text at report time
    // This stays visible in admin dashboard even if content is later deleted.
    commentText: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },

    resolvedNote: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);