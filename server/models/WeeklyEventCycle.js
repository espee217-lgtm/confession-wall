const mongoose = require("mongoose");

const cycleWinnerSchema = new mongoose.Schema(
  {
    confessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Confession",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    score: { type: Number, default: 0, min: 0 },
    reachedScoreAt: { type: Date, default: null },
    confessionCreatedAt: { type: Date, default: null },
    tiedCandidateCount: { type: Number, default: 0, min: 0 },
    grantedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    notificationSentAt: { type: Date, default: null },
    tieBreakNotificationSentAt: { type: Date, default: null },
  },
  { _id: false }
);

const weeklyEventCycleSchema = new mongoose.Schema(
  {
    weekKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    eventKey: {
      type: String,
      required: true,
      trim: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    rankingStartAt: { type: Date, required: true },
    rankingEndAt: { type: Date, required: true },
    payoutAt: { type: Date, required: true },
    rewardExpiresAt: { type: Date, required: true },
    lastEvaluatedAt: { type: Date, default: null },
    payoutProcessedAt: { type: Date, default: null },
    mostWatered: {
      type: cycleWinnerSchema,
      default: () => ({}),
    },
    mostBurned: {
      type: cycleWinnerSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

weeklyEventCycleSchema.index({ weekKey: 1 }, { unique: true });
weeklyEventCycleSchema.index({ rankingStartAt: 1, rankingEndAt: 1 });
weeklyEventCycleSchema.index({ payoutAt: 1, rewardExpiresAt: 1 });

module.exports = mongoose.model("WeeklyEventCycle", weeklyEventCycleSchema);
