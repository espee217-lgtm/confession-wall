import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSpecialEmail } from "../utils/specialAccess";
import "./ReenaPage.css";
import { logSpecialActivity } from "../utils/logSpecialActivity";
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");
const UPSC_EXAM_DATE = new Date("2026-05-23T00:00:00+05:30");

const getDaysUntilUPSC = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const examDay = new Date(
    UPSC_EXAM_DATE.getFullYear(),
    UPSC_EXAM_DATE.getMonth(),
    UPSC_EXAM_DATE.getDate()
  );

  const diff = examDay - today;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
   const examFortuneCards = [
  {
    name: "The Crown",
    emoji: "👑",
    message: (days) =>
      `Yes, Reenaa. With ${days} days left, this card says success favors discipline. You do not need panic now — you need calm revision, fixed hours, and belief in the work you have already done.`,
  },
  {
    name: "The Star",
    emoji: "⭐",
    message: (days) =>
      `Yes. The Star says these ${days} days can still change everything. Your preparation has more strength than your fear. Keep revising, keep testing yourself, and do not let doubt waste your time.`,
  },
  {
    name: "The Bloom",
    emoji: "🌸",
    message: (days) =>
      `Yes, Reenaa. The Bloom says your effort is quietly becoming result. In these last ${days} days, small daily improvements will matter more than overthinking the whole exam.`,
  },
  {
    name: "The Sun",
    emoji: "☀️",
    message: (days) =>
      `Yes. The Sun is a bright card. It says your UPSC path has positive energy, but these ${days} days must be used with focus, sleep, revision, and confidence.`,
  },
  {
    name: "The Lotus",
    emoji: "🪷",
    message: (days) =>
      `Yes, Reenaa. Like a lotus, you can rise even under pressure. These ${days} days are not for fear — they are for cleaning weak topics and trusting your stronger ones.`,
  },
  {
    name: "The Flame",
    emoji: "🔥",
    message: (days) =>
      `Yes. The Flame says your determination is still alive. Use these ${days} days like a final disciplined push. Do not burn out — burn through the hesitation.`,
  },
  {
    name: "The Moon",
    emoji: "🌙",
    message: (days) =>
      `Yes, but the Moon warns you not to let anxiety look bigger than reality. With ${days} days left, revise calmly, avoid panic scrolling, and protect your peace.`,
  },
  {
    name: "The River",
    emoji: "🌊",
    message: (days) =>
      `Yes. The River says your preparation may feel slow, but it has been moving. These final ${days} days should flow with routine: revise, practice, rest, repeat.`,
  },
  {
    name: "The Shield",
    emoji: "🛡️",
    message: (days) =>
      `Yes, Reenaa. The Shield says your consistency will protect you. In these ${days} days, avoid random new pressure and strengthen what you already know.`,
  },
  {
    name: "The Pearl",
    emoji: "🤍",
    message: (days) =>
      `Yes. The Pearl says quiet strength wins. With ${days} days left, you do not have to prove anything to fear. Just show up every day and keep polishing your preparation.`,
  },
  {
    name: "The Mountain",
    emoji: "⛰️",
    message: (days) =>
      `Yes, Reenaa. UPSC is a mountain, but this card says you can climb the last stretch. These ${days} days are for one step at a time, not for doubting the whole journey.`,
  },
  {
    name: "The Blessing",
    emoji: "✨",
    message: (days) =>
      `Yes. This card carries a soft blessing. Your exam energy looks positive, but the next ${days} days need honesty, focus, and a steady heart.`,
  },
];
export default function ReenaPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(null);
  const [examQuestion] = useState("Will I clear my UPSC exam?");
  const [selectedExamCard, setSelectedExamCard] = useState(null);
  const daysLeft = getDaysUntilUPSC();

  useEffect(() => {
    if (!user || !token) return;

    let cancelled = false;

    const verifyAccess = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/special/reena`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) setAllowed(res.ok);
      } catch (err) {
        if (!cancelled) setAllowed(isSpecialEmail(user.email));
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  if (!user || !token) return <Navigate to="/login" replace />;

  if (allowed === false) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="reena-page">
      <div className="reena-bg" />
      <div className="reena-overlay" />

      <button
        type="button"
        className="reena-back"
        onClick={() => navigate("/choose")}
      >
        ← Back to paths
      </button>

      <section className="beauty-panel beauty-opening">
        <span className="beauty-number">01</span>

        <div className="beauty-content">
          <p className="beauty-kicker">Before the card</p>
          <h1>Reenaa, do you want to know what your beauty is?</h1>
          <p>
            Not just the kind people notice in a photo but the kind hidden in
            balance, softness, expression, and the little details that make a
            face unforgettable.
          </p>
        </div>

        <div className="scroll-cue">
          <span>Scroll gently</span>
          <div className="arrow-down">↓</div>
        </div>
      </section>

      <section className="beauty-panel beauty-meaning">
        <span className="beauty-number">01</span>

        <div className="beauty-content narrow">
          <p className="beauty-kicker">What beauty means</p>
          <h2>Beauty is not one thing.</h2>
          <p>
            It is symmetry, but not only symmetry. It is the calm shape of the
            eyes, the softness of the smile, the way the face carries warmth,
            and how naturally every feature sits together.
          </p>
          <p>
            Some beauty is loud. Yours feels gentle, the kind that looks better
            the longer someone notices it.
          </p>
        </div>

        <div className="scroll-cue">
          <span>Keep going</span>
          <div className="arrow-down">↓</div>
        </div>
      </section>

      <section className="beauty-panel beauty-math">
        <span className="beauty-number">01</span>

        <div className="beauty-content narrow">
          <p className="beauty-kicker">Golden Ratio & Fibonacci</p>
          <h2>Some beauty follows mathematics.</h2>
          <p>
            The Golden Ratio, 1.618, appears in nature, art, architecture, and
            classical design. In faces, it is often used to study proportion:
            face length to width, eye spacing, lip balance, and feature flow.
          </p>
          <p>
            Fibonacci patterns describe rhythm, how one feature leads into the
            next. In your face, the eyes become the first focus, then the smile,
            then the soft overall harmony.
          </p>
        </div>

        <div className="scroll-cue">
          <span>There is more</span>
          <div className="arrow-down">↓</div>
        </div>
      </section>

      <section className="beauty-panel beauty-reena">
        <span className="beauty-number">01</span>

        <div className="beauty-content narrow">
          <p className="beauty-kicker">About you</p>
          <h2>Your strongest feature is harmony.</h2>
          <p>
            Your eyes have a naturally balanced placement, giving your face a
            soft and expressive center. Your smile adds warmth without looking
            forced, and your face shape has a gentle oval balance.
          </p>
          <p>
            The beauty is not just in one feature. It is in how everything works
            together eyes, smile, face shape, softness, and expression.
          </p>
        </div>

        <div className="scroll-cue">
          <span>Reveal the card</span>
          <div className="arrow-down">↓</div>
        </div>
      </section>

      <section className="beauty-panel beauty-reveal">
        <div className="beauty-reveal-text">
          <span className="beauty-number">01</span>
          <p className="beauty-kicker">Final reveal</p>
          <h2>Golden Ratio Beauty Card</h2>
          <p>
            This card is a golden-ratio inspired appreciation of your facial
            harmony not to judge beauty, but to celebrate what already feels
            obvious.
          </p>
          <p>
            Some faces look beautiful because of proportion. Yours becomes
            memorable because proportion, softness, and presence meet together.
          </p>
        </div>

        <div className="beauty-card-frame">
          <img
            src="/reena/GRC.png"
            alt="Reena Golden Ratio Beauty Card"
            draggable="false"
          />
        </div>
      </section>
      <section className="beauty-panel beauty-note-slide note-eyes">
  <span className="beauty-number">01</span>

  <div className="beauty-content narrow">
    <p className="beauty-kicker">Beyond the numbers</p>
    <h2>Your eyes</h2>
    <p>
      Your eyes have a soft, clear focus. They naturally become the center of
      your face.. expressive, calm, and quietly memorable.
    </p>
    <p>
      They are the kind of feature that makes a face feel alive, not just
      beautiful in a still photo.
    </p>
  </div>

  <div className="scroll-cue">
    <span>Next detail</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="beauty-panel beauty-note-slide note-smile">
  <span className="beauty-number">01</span>

  <div className="beauty-content narrow">
    <p className="beauty-kicker">A softer detail</p>
    <h2>Your smile</h2>
    <p>
      Your smile does not feel forced. It adds warmth to your face and makes
      your features look softer, brighter, and more alive.
    </p>
    <p>
      It is gentle, natural, and quietly charming.. the kind of smile that
      changes the whole expression.
    </p>
  </div>

  <div className="scroll-cue">
    <span>Keep going</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="beauty-panel beauty-note-slide note-harmony">
  <span className="beauty-number">01</span>

  <div className="beauty-content narrow">
    <p className="beauty-kicker">Facial harmony</p>
    <h2>The balance is rare.</h2>
    <p>
      What stands out is not one single feature, but how naturally everything
      fits together.. eyes, lips, face shape, and expression.
    </p>
    <p>
      That kind of harmony is what makes a face feel complete instead of simply
      pretty.
    </p>
  </div>

  <div className="scroll-cue">
    <span>One more</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="beauty-panel beauty-note-slide note-aura">
  <span className="beauty-number">01</span>

  <div className="beauty-content narrow">
    <p className="beauty-kicker">The rare part</p>
    <h2>Your aura stays.</h2>
    <p>
      Some faces are pretty at first glance. Yours has the rarer kind of beauty
    ..the kind that stays in the mind because it feels gentle, personal, and real.
    </p>
    <p>
      The card can measure proportion. But this part cannot be measured..it is
      simply felt.
    </p>
  </div>

  <div className="scroll-cue">
    <span>Beauty section complete</span>
    <div className="arrow-down">↓</div>
  </div>
</section>
<section className="fortune-story fortune-question-slide">
  <div className="fortune-story-card">
    <span className="beauty-number">02</span>
    <p className="beauty-kicker">Secret garden reading</p>
    <h2>The Question</h2>
    <p>
      Reenaa, the garden has only one question waiting for you.
    </p>
    <div className="big-question">
      Will I clear my UPSC exam?
      <small className="days-left-line">
  {daysLeft} days left for the exam.
</small>
    </div>
  </div>

  <div className="scroll-cue">
    <span>Scroll to continue</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="fortune-story fortune-rule-slide">
  <div className="fortune-story-card">
    <span className="beauty-number">02</span>
    <p className="beauty-kicker">The rule</p>
    <h2>One card only.</h2>
    <p>
      There are hidden cards in the garden. You may choose only one.
      Once your card opens, the rest will lock forever.
    </p>
  </div>

  <div className="scroll-cue">
    <span>Keep going</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="fortune-story fortune-warning-slide">
  <div className="fortune-story-card warning-card">
    <span className="beauty-number">02</span>
    <p className="beauty-kicker">The warning</p>
    <h2>Only 4 say yes.</h2>
    <p>
      Out of 12 possible fate cards, only 4 carry a clear yes for your UPSC exam.
    </p>
    <p>
      So choose carefully, Reenaa. This is where luck and intuition meet.
    </p>
  </div>

  <div className="scroll-cue">
    <span>The cards are near</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="fortune-story fortune-ready-slide">
  <div className="fortune-story-card ready-card">
    <span className="beauty-number">02</span>
    <p className="beauty-kicker">Choose your fate</p>
    <h2>Take a breath.</h2>
    <p>
      Do not overthink it. Let one card call you first.
    </p>
    <p>
      When you are ready, scroll down and choose your answer.
    </p>
  </div>

  <div className="scroll-cue">
    <span>Reveal the cards</span>
    <div className="arrow-down">↓</div>
  </div>
</section>

<section className="fortune-page">
  <div className="fortune-inner">
    <div className="fortune-intro">
      <span className="beauty-number">02</span>
      <p className="beauty-kicker">Final choice</p>
      <h2>Pick one card</h2>
      <p>
        One tap only, Reenaa. Once the card opens, the garden will not allow another pull.
      </p>
    </div>

    <div className="exam-card-grid twelve-cards">
      {examFortuneCards.map((card) => (
        <button
          type="button"
          key={card.name}
          className={`exam-fortune-card ${
            selectedExamCard?.name === card.name ? "selected" : ""
          } ${selectedExamCard ? "locked" : ""}`}
          onClick={() => {
            if (selectedExamCard) return;
            setSelectedExamCard(card);
          }}
          disabled={Boolean(selectedExamCard)}
        >
          <div className="card-front">
            <span className="card-symbol">✦</span>
            <strong>Choose</strong>
            <small>Reveal your fate</small>
          </div>

          <div className="card-back">
            <span className="card-emoji">{card.emoji}</span>
            <strong>{card.name}</strong>
          </div>
        </button>
      ))}
    </div>

    {selectedExamCard && (
      <div className="exam-result success-result">
        <p className="beauty-kicker">Your card has spoken</p>
        <h3>
          {selectedExamCard.emoji} {selectedExamCard.name}
        </h3>
        <p>
          <strong>Question:</strong> Will I clear my UPSC exam?
          <small className="days-left-line">
  {daysLeft} days left for the exam.
</small>
        </p>
        <p>{selectedExamCard.message(daysLeft)}</p>
        <p className="one-choice-note">
          The card has been chosen. The garden does not allow a second pull.
        </p>
      </div>
    )}

    <div className="next-phase-box">
  <p className="beauty-kicker">Phase 03 unlocked</p>
  <h3>Kundali × Market Map</h3>
  <p>
    The cards have spoken. Now step into the next chamber — where her kundali
    meets sectors, timing, patience, and market energy.
  </p>

  <Link to="/reena-kundali" className="next-phase-btn">
    Open Kundali Market Map →
  </Link>
</div>
  </div>
</section>
    </main>
  );
}