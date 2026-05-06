import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logSpecialActivity } from "../utils/logSpecialActivity";
import "./ReenaTriviaPage.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const triviaQuestions = [
  {
    id: 1,
    type: "mcq",
    tag: "Falling Into Your Smile",
    question:
      "In Falling Into Your Smile, what is the main world the story revolves around?",
    options: ["Cooking", "E-sports", "Fashion", "Medicine"],
    answer: "E-sports",
  },
  {
    id: 2,
    type: "mcq",
    tag: "Falling Into Your Smile",
    question: "What makes the main couple’s bond cute in the story?",
    options: [
      "They are always serious",
      "They grow closer through teasing, teamwork, and care",
      "They never talk",
      "They are enemies forever",
    ],
    answer: "They grow closer through teasing, teamwork, and care",
  },
  {
    id: 3,
    type: "mcq",
    tag: "One Indian Girl",
    question: "Who is the main character of One Indian Girl?",
    options: ["Radhika", "Ananya", "Meera", "Aisha"],
    answer: "Radhika",
  },
  {
    id: 4,
    type: "mcq",
    tag: "One Indian Girl",
    question:
      "One Indian Girl mainly explores a woman balancing love, career, family expectations, and self-worth.",
    options: ["True", "False", "Only politics", "Only sports"],
    answer: "True",
  },
  {
    id: 5,
    type: "mcq",
    tag: "Mr. Queen",
    question: "In Mr. Queen, where does the modern chef’s soul end up?",
    options: [
      "In a queen’s body",
      "In a soldier’s body",
      "In a doctor’s body",
      "In a child’s body",
    ],
    answer: "In a queen’s body",
  },
  {
    id: 6,
    type: "mcq",
    tag: "Mr. Queen",
    question: "Mr. Queen is mostly known for mixing which two moods?",
    options: [
      "Comedy and historical drama",
      "Horror and science fiction",
      "Only tragedy",
      "Only documentary",
    ],
    answer: "Comedy and historical drama",
  },
  {
    id: 7,
    type: "mcq",
    tag: "Mr. Queen",
    question: "What makes Mr. Queen fun to watch?",
    options: [
      "The chaotic queen energy",
      "No funny scenes",
      "No palace drama",
      "Only exams",
    ],
    answer: "The chaotic queen energy",
  },
  {
    id: 8,
    type: "mcq",
    tag: "Choose one",
    question: "Choose one, Reenaa.",
    options: ["Bounty", "Daisy", "Chicken Dum Biryani", "Rajnikant"],
    answer: "Chicken Dum Biryani",
  },
  {
    id: 9,
    type: "text",
    tag: "Type your guess",
    question:
      "What do you think my favourite food to eat is out of everything, Reenaa?",
    placeholder: "Type your answer here...",
  },
  {
    id: 10,
    type: "text",
    tag: "Your choice",
    question: "Other than Tamil Nadu, which other state would you want to visit?",
    placeholder: "Type the state name here...",
  },
];

export default function ReenaTriviaPage() {
  const { user } = useAuth();

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);
  const [giftLoading, setGiftLoading] = useState(false);

  const userName = user?.username || user?.name || "";

  const mcqQuestions = triviaQuestions.filter(
    (question) => question.type === "mcq"
  );

  const answeredCount = triviaQuestions.filter((question) => {
    const value = answers[question.id];

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return Boolean(value);
  }).length;

  const score = mcqQuestions.reduce((total, question) => {
    return answers[question.id] === question.answer ? total + 1 : total;
  }, 0);

  const canSubmit = answeredCount === triviaQuestions.length;

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    logSpecialActivity({
      userEmail: user.email,
      userName,
      action: "entered_trivia_page",
      page: "/reena-trivia",
    });
  }, [user?.email, userName]);

  const handleAnswer = (id, value) => {
    if (submitted) return;

    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const submitTriviaToBackend = async () => {
    if (!canSubmit || saving || saved) return;

    try {
      setSaving(true);

      const preparedAnswers = triviaQuestions.map((question) => {
        const selectedAnswer = answers[question.id] || "";
        const isMcq = question.type === "mcq";

        return {
          questionId: question.id,
          question: question.question,
          type: question.type,
          selectedAnswer,
          correctAnswer: isMcq ? question.answer : "",
          isCorrect: isMcq ? selectedAnswer === question.answer : null,
        };
      });

      const res = await fetch(`${API_BASE}/api/trivia/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.email || "",
          userName,
          score,
          totalMcq: mcqQuestions.length,
          answers: preparedAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Could not save trivia answers.");
        return;
      }

      setSaved(true);
      setSubmitted(true);

      logSpecialActivity({
        userEmail: user?.email,
        userName,
        action: "submitted_trivia",
        page: "/reena-trivia",
        details: {
          score,
          totalMcq: mcqQuestions.length,
          typedAnswer9: answers[9] || "",
          typedAnswer10: answers[10] || "",
          selectedAnswers: preparedAnswers.map((item) => ({
            questionId: item.questionId,
            selectedAnswer: item.selectedAnswer,
            isCorrect: item.isCorrect,
          })),
        },
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving trivia answers.");
    } finally {
      setSaving(false);
    }
  };

  const openGiftBox = async () => {
    if (giftOpened || giftLoading) return;

    try {
      setGiftLoading(true);

      const res = await fetch(`${API_BASE}/api/gift/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.email || "",
          userName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Could not open gift right now.");
        return;
      }

      setGiftOpened(true);

      logSpecialActivity({
        userEmail: user?.email,
        userName,
        action: "opened_gift_box",
        page: "/reena-trivia",
        details: {
          giftAmount: 2000,
          currency: "INR",
        },
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong while opening the gift.");
    } finally {
      setGiftLoading(false);
    }
  };

  return (
    <main className="trivia-page">
      <Link to="/reena-kundali" className="trivia-back-btn">
        ← Back to Kundali Map
      </Link>

      <section className="trivia-hero">
        <p className="trivia-kicker">Phase 04</p>
        <h1>Reenaa Trivia Chamber</h1>
        <p>
          Ten tiny questions. Some from stories, some from shows, and some only
          your heart can answer.
        </p>

        <div className="trivia-progress">
          {answeredCount} / {triviaQuestions.length} answered
        </div>

        <div className="trivia-scroll-hint">
          <span>Scroll to begin</span>
          <b>↓</b>
        </div>
      </section>

      {triviaQuestions.map((item) => (
        <section className="trivia-question-slide" key={item.id}>
          <div className="trivia-question-card">
            <span className="trivia-number">
              {String(item.id).padStart(2, "0")}
            </span>

            <p className="trivia-kicker">{item.tag}</p>
            <h2>{item.question}</h2>

            {item.type === "mcq" ? (
              <div className="trivia-options">
                {item.options.map((option) => {
                  const selected = answers[item.id] === option;

                  return (
                    <button
                      type="button"
                      key={option}
                      className={`trivia-option ${selected ? "selected" : ""}`}
                      onClick={() => handleAnswer(item.id, option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="trivia-text-answer"
                value={answers[item.id] || ""}
                onChange={(event) => handleAnswer(item.id, event.target.value)}
                placeholder={item.placeholder}
                rows={5}
              />
            )}

            <div className="trivia-mini-note">
              {answers[item.id]
                ? "Answer saved ✨"
                : "Choose or type your answer."}
            </div>
          </div>

          <div className="trivia-scroll-hint small">
            <span>Next question</span>
            <b>↓</b>
          </div>
        </section>
      ))}

      <section className="trivia-result-section">
        <div className="trivia-result-card">
          <p className="trivia-kicker">Final reveal</p>
          <h2>Trivia Complete</h2>

          {!submitted ? (
            <>
              <p>
                You answered {answeredCount} out of {triviaQuestions.length}.
                Submit when all ten are done.
              </p>

              <button
                type="button"
                className="trivia-submit-btn"
                disabled={!canSubmit || saving}
                onClick={submitTriviaToBackend}
              >
                {saving ? "Saving..." : "Reveal Result"}
              </button>
            </>
          ) : (
            <>
              <div className="trivia-score">
                {score} / {mcqQuestions.length}
              </div>

              <p>
                The typed answers are the real cute part. Your quiz is complete,
                Reenaa — and yes, this chamber was made only for you.
              </p>

              {saved && (
                <p className="trivia-mini-note">Your answers were saved ✨</p>
              )}

              <div className="typed-answer-box">
                <h3>Your typed answers</h3>
                <p>
                  <strong>Favourite food guess:</strong>{" "}
                  {answers[9] || "Not answered"}
                </p>
                <p>
                  <strong>State you want to visit:</strong>{" "}
                  {answers[10] || "Not answered"}
                </p>
              </div>

              <div className={`gift-box-section ${giftOpened ? "opened" : ""}`}>
                <button
                  type="button"
                  className="gift-box-button"
                  onClick={openGiftBox}
                  disabled={giftOpened || giftLoading}
                >
                  <svg
                    viewBox="0 0 220 220"
                    className="gift-svg"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="giftGold"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#fff3b0" />
                        <stop offset="45%" stopColor="#f7c948" />
                        <stop offset="100%" stopColor="#b87918" />
                      </linearGradient>

                      <linearGradient
                        id="giftGreen"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#2f8f46" />
                        <stop offset="100%" stopColor="#0b3d1c" />
                      </linearGradient>
                    </defs>

                    <circle cx="110" cy="110" r="96" className="gift-glow" />

                    <path
                      className="gift-lid"
                      d="M54 78 H166 Q176 78 176 88 V108 H44 V88 Q44 78 54 78 Z"
                      fill="url(#giftGreen)"
                    />

                    <path
                      d="M48 108 H172 V172 Q172 184 160 184 H60 Q48 184 48 172 Z"
                      fill="url(#giftGreen)"
                    />

                    <rect
                      x="96"
                      y="78"
                      width="28"
                      height="106"
                      fill="url(#giftGold)"
                    />
                    <rect
                      x="44"
                      y="96"
                      width="132"
                      height="22"
                      fill="url(#giftGold)"
                    />

                    <path
                      d="M106 76 C76 42, 54 56, 77 78 C88 88, 101 84, 106 76 Z"
                      fill="url(#giftGold)"
                    />
                    <path
                      d="M114 76 C144 42, 166 56, 143 78 C132 88, 119 84, 114 76 Z"
                      fill="url(#giftGold)"
                    />

                    {giftOpened && (
  <text x="110" y="152" textAnchor="middle" className="gift-text">
    ₹2000
  </text>
)}
                  </svg>

                  <span>
                    {giftLoading
                      ? "Opening..."
                      : giftOpened
                      ? "Gift Opened"
                      : "Tap the Gift"}
                  </span>
                </button>

                {giftOpened && (
                  <div className="gift-message">
                    <h3>Nice — ₹2000 INR gift unlocked 🎁</h3>
                    <p>
                      Thanks for playing through my little page. This was meant
                      specially for you, Reenaa.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="post-gift-actions">
  <Link to="/" className="trivia-return-btn">
    Return to Main Site
  </Link>

  <Link to="/reena-apology" className="trivia-return-btn apology-link-btn">
    Apology Section — My Personal Message
  </Link>
</div>
        </div>
      </section>
    </main>
  );
}