const mongoose = require("mongoose");

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

const confessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    message: { type: String, required: true },
    image:   { type: String },
    wateredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    burnedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Confession", confessionSchema);