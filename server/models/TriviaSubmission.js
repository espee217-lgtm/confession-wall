const mongoose = require("mongoose");

const triviaAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: Number,
      default: 0,
    },
    question: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["mcq", "text", ""],
      default: "",
    },
    selectedAnswer: {
      type: String,
      default: "",
    },
    correctAnswer: {
      type: String,
      default: "",
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
  },
  { _id: false }
);

const triviaSubmissionSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMcq: {
      type: Number,
      default: 8,
    },
    answers: {
      type: [triviaAnswerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TriviaSubmission", triviaSubmissionSchema);