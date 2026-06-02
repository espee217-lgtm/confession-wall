const mongoose = require("mongoose");

const CONTENT_WARNING_CATEGORIES = [
  "Heavy / Sensitive",
  "Grief",
  "Self-reflection",
  "Relationship",
  "Vent",
  "Other",
];

const comfortCardSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    count: { type: Number, default: 0, min: 0 },
    sentBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        select: false,
      },
    ],
  },
  { _id: false }
);

const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    votes: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: {
      type: [pollOptionSchema],
      default: [],
      validate: {
        validator(options) {
          return Array.isArray(options) && options.length >= 2 && options.length <= 4;
        },
        message: "Polls must include between 2 and 4 options.",
      },
    },
    voterIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        select: false,
      },
    ],
  },
  { _id: false }
);

const contentWarningSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ["", ...CONTENT_WARNING_CATEGORIES],
      default: "",
    },
    note: { type: String, default: "" },
    sensitive: { type: Boolean, default: false },
  },
  { _id: false }
);

const weeklyScoreMilestoneSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true, min: 1 },
    reachedAt: { type: Date, required: true },
  },
  { _id: false }
);

const weeklyEventTrackingSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, trim: true },
    eventKey: { type: String, required: true, trim: true },
    rankingStartAt: { type: Date, required: true },
    rankingEndAt: { type: Date, required: true },
    wateredCount: { type: Number, default: 0, min: 0 },
    burnedCount: { type: Number, default: 0, min: 0 },
    wateredMilestones: {
      type: [weeklyScoreMilestoneSchema],
      default: [],
    },
    burnedMilestones: {
      type: [weeklyScoreMilestoneSchema],
      default: [],
    },
    lastSyncedAt: { type: Date, default: null },
  },
  { _id: false }
);

const safetyFlagSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        "self_harm",
        "threat_violence",
        "harassment_hate",
        "doxxing_pii",
        "minor_sexual_content",
        "extreme_abuse",
      ],
      required: true,
    },
    matchedTerms: {
      type: [String],
      default: [],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    source: {
      type: String,
      enum: ["post", "comment"],
      required: true,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const commentReplySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  isSeeded: { type: Boolean, default: false },
  seededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  seedLabel: { type: String, default: "" },
  text: { type: String, required: true, trim: true },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  isSeeded: { type: Boolean, default: false },
  seededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  seedLabel: { type: String, default: "" },
  text: { type: String, default: "" },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  image: { type: String, default: null },
  wateredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  burnedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: {
    type: [commentReplySchema],
    default: [],
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
  hiddenReason: {
    type: String,
    default: "",
  },
  hiddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null,
  },
  hiddenAt: {
    type: Date,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

commentSchema.index({ userId: 1, createdAt: -1 });

const confessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isSeeded: { type: Boolean, default: false },
    seededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    seedLabel: { type: String, default: "" },
    message: { type: String, required: true },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    image: { type: String, default: null },
    images: [{ type: String }],
    mood: {
      type: String,
      enum: [
        "Hopeful",
        "Heavy",
        "Angry",
        "Lonely",
        "Love",
        "Regret",
        "Funny",
        "Grateful",
        "Lost",
        "Healing",
      ],
      default: undefined,
    },
    postTheme: { type: String, default: "" },
    contentWarning: {
      type: contentWarningSchema,
      default: () => ({
        enabled: false,
        category: "",
        note: "",
        sensitive: false,
      }),
    },
    wateredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    burnedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    seedReactionRewardedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comfortCards: {
      type: [comfortCardSchema],
      default: [],
    },
    poll: {
      type: pollSchema,
      default: undefined,
    },
    weeklyEventTracking: {
      type: [weeklyEventTrackingSchema],
      default: [],
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    hiddenReason: {
      type: String,
      default: "",
    },
    hiddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    hiddenAt: {
      type: Date,
      default: null,
    },
    comments: [commentSchema],
    safetyFlags: {
      type: [safetyFlagSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const SAFETY_FLAGS_MAX = 50;

confessionSchema.pre("save", function trimSafetyFlags(next) {
  if (!Array.isArray(this.safetyFlags) || this.safetyFlags.length <= SAFETY_FLAGS_MAX) {
    return next();
  }

  this.safetyFlags = this.safetyFlags
    .slice()
    .sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0))
    .slice(-SAFETY_FLAGS_MAX);

  next();
});

confessionSchema.index({ userId: 1, createdAt: -1 });
confessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Confession", confessionSchema);
