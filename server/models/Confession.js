const mongoose = require("mongoose");

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

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  text: { type: String, default: "" },
  image: { type: String, default: null },
  wateredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  burnedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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
    message: { type: String, required: true },
    image:   { type: String },
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
    comments: [commentSchema],
  },
  { timestamps: true }
);

confessionSchema.index({ userId: 1, createdAt: -1 });
confessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Confession", confessionSchema);
