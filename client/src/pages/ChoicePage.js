import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logSpecialActivity } from "../utils/logSpecialActivity";
import "./ChoicePage.css";

const fireflies = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + Math.random() * 84}%`,
  top: `${10 + Math.random() * 78}%`,
  delay: `${Math.random() * 5}s`,
  duration: `${5 + Math.random() * 6}s`,
  size: `${3 + Math.random() * 4}px`,
}));

const ChoicePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userName = user?.username || user?.name || "";

  useEffect(() => {
    if (!user?.email) return;

    logSpecialActivity({
      userEmail: user.email,
      userName,
      action: "opened_choice_page",
      page: "/choose",
    });
  }, [user?.email, userName]);

  const handleMainSiteEnter = () => {
    if (user?.email) {
      logSpecialActivity({
        userEmail: user.email,
        userName,
        action: "clicked_main_site",
        page: "/choose",
      });
    }

    navigate("/");
  };

  const handleSpecialSectionEnter = () => {
    if (user?.email) {
      logSpecialActivity({
        userEmail: user.email,
        userName,
        action: "clicked_special_section",
        page: "/choose",
      });
    }

    navigate("/reena");
  };

  return (
    <div className="choice-page">
      <video className="choice-bg-video" autoPlay muted loop playsInline>
        <source src="/reena-choice/choicesbg.mp4" type="video/mp4" />
      </video>

      <div className="choice-vignette" />

      <div className="private-badge">
        <span className="badge-lock">🔒</span>
        <span>Private Path Unlocked</span>
      </div>

      <div className="firefly-layer">
        {fireflies.map((fly) => (
          <span
            key={fly.id}
            className="firefly"
            style={{
              left: fly.left,
              top: fly.top,
              animationDelay: fly.delay,
              animationDuration: fly.duration,
              width: fly.size,
              height: fly.size,
            }}
          />
        ))}
      </div>

      <div className="fairy-fly" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="fairy-svg">
          <defs>
            <radialGradient id="fairyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7b8" stopOpacity="1" />
              <stop offset="50%" stopColor="#ffd77a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffd77a" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="wingGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbe0" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#b9fff0" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          <circle cx="60" cy="58" r="42" fill="url(#fairyGlow)" />

          <path
            className="fairy-wing left-wing"
            d="M54 54 C25 25, 8 48, 36 68 C19 82, 37 101, 55 67"
            fill="url(#wingGlow)"
          />
          <path
            className="fairy-wing right-wing"
            d="M66 54 C95 25, 112 48, 84 68 C101 82, 83 101, 65 67"
            fill="url(#wingGlow)"
          />

          <circle cx="60" cy="44" r="7" fill="#fff4c7" />
          <path
            d="M58 52 C54 62, 55 75, 60 86 C65 75, 66 62, 62 52 Z"
            fill="#fff0a8"
          />

          <path
            d="M55 39 C57 32, 64 32, 66 39"
            stroke="#f6c35b"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="78" cy="35" r="3" fill="#fff7b8" />
          <circle cx="42" cy="76" r="2" fill="#fff7b8" />
        </svg>
      </div>

      <img
        className="stone-img main-stone"
        src="/reena-choice/MainSiteStone.png"
        alt="Main Site"
        role="button"
        tabIndex={0}
        onClick={handleMainSiteEnter}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleMainSiteEnter();
        }}
        draggable="false"
      />

      <img
        className="stone-img special-stone"
        src="/reena-choice/SpecialSectionStone.png"
        alt="Special Section for Reenaa"
        role="button"
        tabIndex={0}
        onClick={handleSpecialSectionEnter}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSpecialSectionEnter();
        }}
        draggable="false"
      />
    </div>
  );
};

export default ChoicePage;