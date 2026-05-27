const mongoose = require("mongoose");

const chessMoveSchema = new mongoose.Schema(
  {
    from: { type: String, default: "" },
    to: { type: String, default: "" },
    san: { type: String, default: "" },
    promotion: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    fen: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chessGameSchema = new mongoose.Schema(
  {
    white: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    black: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    challenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    challenged: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: [
        "invited",
        "pending",
        "waiting",
        "active",
        "completed",
        "declined",
        "cancelled",
        "abandoned",
      ],
      default: "invited",
      index: true,
    },

    mode: {
      type: String,
      enum: ["friend", "random"],
      default: "friend",
    },

    fen: {
      type: String,
      default: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    },

    pgn: {
      type: String,
      default: "",
    },

    moves: [chessMoveSchema],

    turn: {
      type: String,
      enum: ["w", "b"],
      default: "w",
    },

    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    result: {
      type: String,
      default: "",
    },

    resultReason: {
      type: String,
      default: "",
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

chessGameSchema.index({ players: 1, status: 1, updatedAt: -1 });
chessGameSchema.index({ challenger: 1, challenged: 1, status: 1 });

module.exports = mongoose.model("ChessGame", chessGameSchema);
