import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DisplayTitlePill from "../components/DisplayTitlePill";
import MobileBottomNav from "../components/MobileBottomNav";
import { useAuth } from "../context/AuthContext";
import "./TitleAchievements.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

function clampProgress(title) {
  const progress = Number(title?.progress || 0);
  const target = Number(title?.target || 0);

  if (!Number.isFinite(progress) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (progress / target) * 100));
}

function formatProgress(title) {
  if (title?.supported === false || title?.progress === null || title?.progress === undefined) {
    return "Future tracking";
  }

  return `${Math.min(Number(title.progress || 0), Number(title.target || 0))} / ${title.target}`;
}

export default function TitleAchievements() {
  const navigate = useNavigate();
  const { user, token, updateUser, refreshUser } = useAuth();
  const [titleState, setTitleState] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [busyTitleId, setBusyTitleId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const equippedTitleId = titleState?.equippedTitle?.id || user?.equippedCosmetics?.title || "";
  const unlockedCount = useMemo(
    () => (titleState?.allTitles || []).filter((title) => title.unlocked).length,
    [titleState]
  );

  const syncEquippedTitle = async (titleId) => {
    updateUser?.((currentUser) => ({
      equippedCosmetics: {
        ...(currentUser?.equippedCosmetics || {}),
        title: titleId || "",
      },
    }));

    try {
      await refreshUser?.();
    } catch (err) {
      console.warn("Could not refresh user after title equip:", err);
    }
  };

  const loadTitles = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/titles/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not load title achievements.");
      }

      setTitleState(data);
    } catch (err) {
      setError(err.message || "Could not load title achievements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const equipTitle = async (titleId) => {
    if (!token || busyTitleId) return;

    try {
      setBusyTitleId(titleId || "none");
      setMessage("");
      setError("");

      const res = await fetch(`${API_BASE}/api/titles/equip`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ titleId: titleId || null }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not equip title.");
      }

      setTitleState((prev) => ({
        ...(prev || {}),
        equippedTitle: data.equippedTitle || null,
      }));
      await syncEquippedTitle(data.equippedTitle?.id || "");
      setMessage(data.equippedTitle ? `${data.equippedTitle.name} equipped.` : "Title unequipped.");
    } catch (err) {
      setError(err.message || "Could not equip title.");
    } finally {
      setBusyTitleId("");
    }
  };

  return (
    <main className="title-achievements-page">
      <section className="title-achievements-hero">
        <button type="button" className="title-achievements-back" onClick={() => navigate(-1)}>
          Back
        </button>

        <div className="title-achievements-hero-copy">
          <p className="title-achievements-kicker">Daily Quests / Achievements</p>
          <h1>Title Achievements</h1>
          <p>
            Display titles are now earned through activity around the grove, then equipped
            as your visible title on profiles, posts, and comments.
          </p>
        </div>

        <div className="title-achievements-equipped">
          <span>Equipped title</span>
          {equippedTitleId ? (
            <>
              <DisplayTitlePill titleId={equippedTitleId} size="big" />
              <button
                type="button"
                onClick={() => equipTitle(null)}
                disabled={busyTitleId === "none"}
              >
                {busyTitleId === "none" ? "Removing..." : "Unequip"}
              </button>
            </>
          ) : (
            <strong>None equipped</strong>
          )}
        </div>
      </section>

      {!token ? (
        <section className="title-achievements-empty">
          <h2>Log in to unlock titles</h2>
          <p>Your progress is tracked on your account once you join the grove.</p>
          <div>
            <button type="button" onClick={() => navigate("/login")}>Login</button>
            <button type="button" onClick={() => navigate("/register")}>Register</button>
          </div>
        </section>
      ) : (
        <>
          <section className="title-achievements-summary">
            <div>
              <span>Unlocked</span>
              <strong>{unlockedCount}</strong>
            </div>
            <div>
              <span>Total titles</span>
              <strong>{titleState?.allTitles?.length || 0}</strong>
            </div>
            <div>
              <span>Selection</span>
              <strong>{equippedTitleId ? "Active" : "Open"}</strong>
            </div>
          </section>

          {(message || error) && (
            <div className={`title-achievements-alert ${error ? "is-error" : ""}`}>
              {error || message}
            </div>
          )}

          {loading ? (
            <div className="title-achievements-empty">Loading title achievements...</div>
          ) : (
            <section className="title-achievements-grid">
              {(titleState?.allTitles || []).map((title) => {
                const equipped = equippedTitleId === title.id;
                const progressWidth = clampProgress(title);

                return (
                  <article
                    className={`title-achievement-card ${
                      title.unlocked ? "is-unlocked" : "is-locked"
                    }`}
                    key={title.id}
                  >
                    <div className="title-achievement-card-top">
                      <div>
                        <p>{title.unlocked ? "Unlocked" : "Locked"}</p>
                        <h2>{title.name}</h2>
                      </div>
                      <span className="title-achievement-status">
                        {title.unlocked ? "Open" : "Seal"}
                      </span>
                    </div>

                    <p className="title-achievement-description">{title.description}</p>
                    <p className="title-achievement-requirement">{title.requirementText}</p>

                    <div className="title-achievement-progress">
                      <div>
                        <span>Progress</span>
                        <strong>{formatProgress(title)}</strong>
                      </div>
                      <div className="title-achievement-meter" aria-hidden="true">
                        <span style={{ width: `${progressWidth}%` }} />
                      </div>
                    </div>

                    {title.lockedReason && !title.unlocked && (
                      <p className="title-achievement-note">{title.lockedReason}</p>
                    )}

                    <div className="title-achievement-actions">
                      {title.unlocked ? (
                        equipped ? (
                          <button type="button" className="is-equipped" disabled>
                            Equipped
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => equipTitle(title.id)}
                            disabled={Boolean(busyTitleId)}
                          >
                            {busyTitleId === title.id ? "Equipping..." : "Equip"}
                          </button>
                        )
                      ) : (
                        <button type="button" disabled>
                          Locked
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      <MobileBottomNav />
    </main>
  );
}
