import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const DAILY_QUEST_DISPLAY_RULES = [
  { key: "login_today", title: "Daily visit", reward: "+5", target: 1 },
  { key: "create_1_confession", title: "Create 1 confession", reward: "+5", target: 1 },
  { key: "create_1_comment", title: "Create 1 comment", reward: "+3", target: 1 },
  { key: "react_3_times", title: "React to 3 posts", reward: "+3", target: 3 },
];

function QuestSparkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 4.5h8.5a3 3 0 0 1 3 3V16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3Z" />
      <path d="M8 9h7.5M8 12.5h5.5M16.25 4.75v4" />
      <path d="m18.75 2.75.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
    </svg>
  );
}

function getDailyQuestDropdownState(user) {
  const streak = {
    current: Number(user?.dailyStreak?.current || 0),
    best: Number(user?.dailyStreak?.best || 0),
  };

  const summaryQuests = Array.isArray(user?.dailyQuestSummary?.quests)
    ? user.dailyQuestSummary.quests
    : [];
  const questSummaryByKey = new Map(summaryQuests.map((quest) => [quest.key, quest]));
  const rawProgress = user?.dailyQuestProgress || {};
  const rawRewarded = new Set(
    Array.isArray(rawProgress.rewardedQuestKeys) ? rawProgress.rewardedQuestKeys : []
  );

  const quests = DAILY_QUEST_DISPLAY_RULES.map((rule) => {
    const summaryQuest = questSummaryByKey.get(rule.key);
    const fallbackProgress =
      rule.key === "login_today"
        ? rawProgress.loginVisited
          ? 1
          : 0
        : rule.key === "create_1_confession"
        ? Number(rawProgress.confessionsCreated || 0)
        : rule.key === "create_1_comment"
        ? Number(rawProgress.commentsCreated || 0)
        : Array.isArray(rawProgress.reactionPostIds)
        ? rawProgress.reactionPostIds.length
        : 0;

    const progress = Math.min(
      rule.target,
      Number(summaryQuest?.progress ?? fallbackProgress ?? 0)
    );
    const completed =
      summaryQuest?.completed !== undefined
        ? Boolean(summaryQuest.completed)
        : progress >= rule.target;
    const rewarded =
      summaryQuest?.rewarded !== undefined
        ? Boolean(summaryQuest.rewarded)
        : rawRewarded.has(rule.key);

    return {
      ...rule,
      progress,
      completed,
      rewarded,
    };
  });

  const completedCount = quests.filter((quest) => quest.completed).length;
  const totalCount = quests.length;
  const allCompleted = quests.every((quest) => quest.completed);
  const completeAll = {
    reward: "+10",
    completed:
      user?.dailyQuestSummary?.completeAll?.completed !== undefined
        ? Boolean(user.dailyQuestSummary.completeAll.completed)
        : allCompleted,
    rewarded:
      user?.dailyQuestSummary?.completeAll?.rewarded !== undefined
        ? Boolean(user.dailyQuestSummary.completeAll.rewarded)
        : rawRewarded.has("complete_all_daily"),
  };

  return {
    streak,
    quests,
    completedCount,
    totalCount,
    allCompleted,
    completeAll,
    hasQuestData: Boolean(user?.dailyQuestSummary || user?.dailyQuestProgress),
  };
}

export default function DailyQuestDropdown({ variant = "navbar" }) {
  const { user } = useAuth();
  const questRef = useRef(null);
  const [open, setOpen] = useState(false);
  const questState = useMemo(() => getDailyQuestDropdownState(user), [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (questRef.current && !questRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const wrapClassName = `quest-drop-wrap quest-drop-wrap--${variant}`;
  const buttonClassName = `quest-drop-button quest-drop-button--${variant}${
    questState.allCompleted ? " is-done" : ""
  }`;
  const panelClassName = `quest-drop-panel quest-drop-panel--${variant}`;

  return (
    <div ref={questRef} className={wrapClassName}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((value) => !value)}
        title="Daily Quests"
        aria-label="Open daily quests"
        aria-expanded={open}
      >
        {variant === "home" ? (
          <>
            <span className="quest-drop-home-side" aria-hidden="true">
              🌿
            </span>
            <span className="quest-drop-home-copy">
              <span className="quest-drop-home-title">
                <span>✦</span>
                Daily Quests
                <span>✦</span>
              </span>
              <span className="quest-drop-home-subtitle">track today's streak</span>
            </span>
            <span
              className="quest-drop-home-side quest-drop-home-side--right"
              aria-hidden="true"
            >
              🌿
            </span>
          </>
        ) : (
          <>
            <span className="quest-drop-button-icon">
              <QuestSparkIcon />
            </span>
            <span className="quest-drop-button-text">Daily Quests</span>
          </>
        )}
      </button>

      {open && (
        <div className={panelClassName}>
          <div className="quest-drop-head">
            <div>
              <strong>Daily Quests</strong>
              <span>
                {questState.hasQuestData
                  ? "Tracked from your current daily progress."
                  : "Daily quests load after login."}
              </span>
            </div>
            <div className="quest-drop-summary-pill">
              {questState.completedCount}/{questState.totalCount}
            </div>
          </div>

          <div className="quest-drop-streak-grid">
            <div className="quest-drop-streak-card">
              <span>Current streak</span>
              <strong>{questState.streak.current} days</strong>
            </div>
            <div className="quest-drop-streak-card">
              <span>Best</span>
              <strong>{questState.streak.best} days</strong>
            </div>
          </div>

          <div className="quest-drop-list">
            {questState.quests.map((quest) => {
              const progressWidth = `${Math.min(
                100,
                (Math.min(quest.progress, quest.target) / quest.target) * 100
              )}%`;

              return (
                <div className="quest-drop-row" key={quest.key}>
                  <div className="quest-drop-row-head">
                    <div>
                      <strong>{quest.title}</strong>
                      <span>
                        {Math.min(quest.progress, quest.target)}/{quest.target}
                      </span>
                    </div>
                    <div className="quest-drop-row-side">
                      <span className="quest-drop-reward">{quest.reward}</span>
                      <span
                        className={`quest-drop-check ${
                          quest.completed ? "is-complete" : ""
                        }`}
                        aria-hidden="true"
                      >
                        {quest.completed ? "✓" : "○"}
                      </span>
                    </div>
                  </div>

                  <div className="quest-drop-meter" aria-hidden="true">
                    <span
                      className="quest-drop-meter-fill"
                      style={{ width: progressWidth }}
                    />
                  </div>

                  <div className="quest-drop-meta">
                    <span className={quest.completed ? "is-complete" : ""}>
                      {quest.completed ? "Completed" : "Incomplete"}
                    </span>
                    <span>{quest.rewarded ? "Rewarded" : "Auto-awards"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quest-drop-bonus">
            <div>
              <strong>Complete all daily quests</strong>
              <span>{questState.completeAll.reward} bonus</span>
            </div>
            <div className="quest-drop-bonus-status">
              <span className={questState.completeAll.completed ? "is-complete" : ""}>
                {questState.completeAll.completed ? "Completed" : "In progress"}
              </span>
              <small>
                {questState.completeAll.rewarded
                  ? "Rewarded"
                  : questState.completeAll.completed
                  ? "Auto-awarded"
                  : `${questState.completedCount}/${questState.totalCount} finished`}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
