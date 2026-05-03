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

    resolvedAt: {
      type: Date,
      default: null,
    },

    // When this is set, MongoDB automatically deletes the resolved report.
    // Pending/unresolved reports keep this as null and are not auto-deleted.
    deleteAfter: {
      type: Date,
      default: null,
      expires: 0,
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedBy: 1, createdAt: -1 });
reportSchema.index({ confessionId: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, status: 1, createdAt: -1 });
reportSchema.index({ resolvedAt: 1 });

module.exports = mongoose.model("Report", reportSchema);