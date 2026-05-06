const express = require("express");
const TriviaSubmission = require("../models/TriviaSubmission");

const router = express.Router();

router.post("/submit", async (req, res) => {
  try {
    const { userEmail, userName, score, totalMcq, answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        message: "Answers are required.",
      });
    }

    const safeAnswers = answers.map((item) => ({
      questionId: Number(item.questionId) || 0,
      question: String(item.question || ""),
      type: String(item.type || ""),
      selectedAnswer: String(item.selectedAnswer || ""),
      correctAnswer: String(item.correctAnswer || ""),
      isCorrect:
        typeof item.isCorrect === "boolean" ? item.isCorrect : null,
    }));

    const submission = await TriviaSubmission.create({
      userEmail: userEmail || "",
      userName: userName || "",
      score: Number(score) || 0,
      totalMcq: Number(totalMcq) || 8,
      answers: safeAnswers,
    });

    res.status(201).json({
      message: "Trivia submitted successfully.",
      submission,
    });
  } catch (err) {
    console.error("Trivia submit error:", err);
    res.status(500).json({
      message: "Server error while saving trivia.",
      error: err.message,
    });
  }
});

router.get("/submissions", async (req, res) => {
  try {
    const submissions = await TriviaSubmission.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(submissions);
  } catch (err) {
    console.error("Trivia fetch error:", err);
    res.status(500).json({
      message: "Server error while fetching trivia.",
      error: err.message,
    });
  }
});

module.exports = router;