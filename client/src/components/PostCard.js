import DisplayTitlePill from "./DisplayTitlePill";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FramedAvatar from "./FramedAvatar";
import { AnimatedBadge, PostThemeFxLayers } from "./CosmeticFx";
import {
  getCosmeticAnimationClass,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  getComfortCardSummary,
  getConfessionThemeId,
  getDisplayCosmetics,
  getMoodChipStyle,
  getPollTotalVotes,
  getSavedConfessionIdSet,
} from "../utils/engagement";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const REPORT_URL = `${API_BASE}/api/reports`;
const PRESSED_LEAVES_URL = `${API_BASE}/api/auth/pressed-leaves`;

export default function PostCard({ post, realm, highlighted, onOpen }) {
  const { token, user, updateUser } = useAuth();
  const [localPost, setLocalPost] = useState(post);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const isBudding = realm === "budding";
  const isGrove = realm === "grove";
  const isScorched = realm === "scorched";

  const username = localPost.userId?.username || "anonymous";
  const profilePicture = localPost.userId?.profilePicture;

  const equipped = getDisplayCosmetics(localPost.userId);
  const frameId =
    equipped.frame ||
    localPost.userId?.equippedFrame ||
    localPost.userId?.frame ||
    "";

  const postThemeId = getConfessionThemeId(localPost, equipped, localPost.userId);
  const postThemeStyle = getPostThemeStyle(postThemeId, realm);
  const postThemeClass = getCosmeticAnimationClass(postThemeId);
  const moodStyle = getMoodChipStyle(localPost.mood);
  const comfortCards = getComfortCardSummary(localPost.comfortCards);
  const savedConfessionIds = useMemo(() => getSavedConfessionIdSet(user), [user]);
  const isSaved = savedConfessionIds.has(String(localPost._id));
  const pollTotalVotes = getPollTotalVotes(localPost.poll);

  const reportPost = async (e) => {
    e.stopPropagation();

    if (!token) {
      window.cwToast?.("You must be logged in to report.", "warning") ||
        alert("You must be logged in to report.");
      return;
    }

    const reason = window.prompt("Why are you reporting this post?");
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: "confession",
          confessionId: localPost._id,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(
          data.message || data.error || "Could not submit report",
          "error"
        ) || alert(data.message || data.error || "Could not submit report");
        return;
      }

      window.cwToast?.("Report submitted.", "success") ||
        alert("Report submitted.");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Something went wrong while reporting.", "error") ||
        alert("Something went wrong while reporting.");
    }
  };

  const togglePressedLeaf = async (e) => {
    e.stopPropagation();

    if (!token) {
      window.cwToast?.("You must be logged in to save confessions.", "warning") ||
        alert("You must be logged in to save confessions.");
      return;
    }

    try {
      const res = await fetch(`${PRESSED_LEAVES_URL}/${localPost._id}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(
          data.message || "Could not update your Pressed Leaves.",
          "error"
        ) || alert(data.message || "Could not update your Pressed Leaves.");
        return;
      }

      updateUser?.({
        savedConfessions: Array.isArray(data.savedConfessions)
          ? data.savedConfessions
          : [],
      });

      window.cwToast?.(data.message || "Pressed Leaves updated.", "success");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not update your Pressed Leaves.", "error") ||
        alert("Could not update your Pressed Leaves.");
    }
  };

  const votePoll = async (e, optionIndex) => {
    e.stopPropagation();

    if (!token) {
      window.cwToast?.("You must be logged in to vote on polls.", "warning") ||
        alert("You must be logged in to vote on polls.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/confessions/${localPost._id}/poll-vote`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ optionIndex }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(data.message || "Could not record your vote.", "error") ||
          alert(data.message || "Could not record your vote.");
        return;
      }

      setLocalPost((prev) => ({
        ...prev,
        poll: data.poll,
      }));
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not record your vote.", "error") ||
        alert("Could not record your vote.");
    }
  };

  return (
    <div
      id={`post-${localPost._id}`}
      onClick={onOpen}
      className={postThemeClass || undefined}
      style={{
        background: isScorched
          ? "rgba(20,8,4,0.82)"
          : isGrove
          ? "rgba(255,255,255,0.88)"
          : "rgba(10,30,20,0.75)",
        borderRadius: "16px",
        border: isScorched
          ? "0.5px solid rgba(216,90,48,0.25)"
          : isGrove
          ? "0.5px solid rgba(29,158,117,0.25)"
          : "1px solid rgba(120,255,180,0.2)",
        padding: "18px 20px",
        marginBottom: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        backdropFilter: isBudding ? "blur(10px)" : "none",
        boxShadow: isScorched
          ? "0 2px 20px rgba(216,90,48,0.08)"
          : isGrove
          ? "0 2px 20px rgba(29,158,117,0.08)"
          : "0 2px 20px rgba(120,255,180,0.08)",
        animation: highlighted
          ? isScorched
            ? "scorchedBlink 0.45s ease-in-out 4"
            : isGrove
            ? "groveBlink 0.45s ease-in-out 4"
            : "buddingBlink 0.45s ease-in-out 4"
          : "none",
        ...postThemeStyle,
      }}
    >
      <PostThemeFxLayers themeId={postThemeId} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          marginBottom: "10px",
        }}
      >
        <FramedAvatar
          src={profilePicture}
          username={username}
          frameId={frameId}
          effectId={equipped.visualEffect}
          size={42}
          placeholder={username?.[0]?.toUpperCase() || "?"}
        />

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: "12px",
              color: isScorched ? "#D85A30" : isGrove ? "#1D9E75" : "#9be7c4",
              fontWeight: 700,
            }}
          >
            @{username} <AnimatedBadge badgeId={equipped.badge} size="sm" />
          </span>

          <DisplayTitlePill titleId={equipped.title} />

          {moodStyle && (
            <span style={{ ...moodStyle, marginTop: "6px", width: "fit-content" }}>
              {localPost.mood}
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: "10px",
            color: isScorched ? "#D85A30" : isGrove ? "#3b8a5a" : "#7fd8b0",
            marginLeft: "auto",
            fontStyle: "italic",
          }}
        >
          {isScorched ? "🔥 scorched" : isGrove ? "🌿 thriving" : "⚖️ balanced"}
        </span>
      </div>

      <p
        style={{
          fontSize: "14px",
          color: isScorched
            ? "rgba(255,220,200,0.88)"
            : isGrove
            ? "#2c3e28"
            : "rgba(220,255,240,0.9)",
          lineHeight: 1.65,
          margin: "0 0 12px",
          display: "-webkit-box",
          WebkitLineClamp: isScorched ? 3 : "unset",
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {localPost.message}
      </p>

      {localPost.poll?.question && Array.isArray(localPost.poll.options) && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginBottom: "12px",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(180, 210, 255, 0.18)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: isScorched ? "#ffb29f" : isGrove ? "#3d8165" : "#9fd8c0",
              marginBottom: "6px",
            }}
          >
            Anonymous Poll
          </div>

          <p
            style={{
              margin: "0 0 10px",
              fontSize: "13px",
              color: isScorched ? "#ffe4db" : isGrove ? "#29402d" : "#e8fff1",
            }}
          >
            {localPost.poll.question}
          </p>

          <div style={{ display: "grid", gap: "6px" }}>
            {localPost.poll.options.map((option, index) => (
              <button
                key={`${option.text}-${index}`}
                type="button"
                onClick={(e) => votePoll(e, index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  borderRadius: "12px",
                  border: "1px solid rgba(190, 220, 255, 0.16)",
                  background: "rgba(255,255,255,0.05)",
                  color: isScorched ? "#ffe3d9" : isGrove ? "#28402b" : "#ecfff2",
                  padding: "7px 10px",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  fontSize: "12px",
                }}
              >
                <span>{option.text}</span>
                <strong>{option.votes || 0}</strong>
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "10px",
              color: isScorched ? "#ffb29f" : isGrove ? "#4a8468" : "#bcebd2",
              letterSpacing: "0.05em",
            }}
          >
            {pollTotalVotes} vote{pollTotalVotes !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {comfortCards.length > 0 && (
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            flexWrap: "wrap",
            gap: "7px",
          }}
        >
          {comfortCards.slice(0, 3).map((card) => (
            <span
              key={card.text}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 9px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(200,255,220,0.14)",
                color: isScorched ? "#ffd2c5" : isGrove ? "#32573f" : "#dfffe7",
                fontSize: "10px",
              }}
            >
              <span>{card.text}</span>
              <strong>{card.count}</strong>
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: isScorched
            ? "1px solid rgba(216,90,48,0.15)"
            : isGrove
            ? "1px solid rgba(29,158,117,0.15)"
            : "1px solid rgba(120,255,180,0.12)",
        }}
      >
        <span style={{ fontSize: "11px", color: "#3b8a5a" }}>
          🌱 {localPost.wateredBy?.length || 0}
        </span>

        <span style={{ fontSize: "11px", color: "#D85A30" }}>
          🔥 {localPost.burnedBy?.length || 0}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={togglePressedLeaf}
            style={{
              background: isSaved
                ? "rgba(220, 192, 120, 0.16)"
                : "rgba(220, 192, 120, 0.08)",
              border: `1px solid ${
                isSaved ? "rgba(240, 210, 135, 0.4)" : "rgba(220, 192, 120, 0.22)"
              }`,
              color: isSaved ? "#ffe6a7" : "#e7d59a",
              borderRadius: "12px",
              padding: "5px 11px",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            {isSaved ? "🍂 saved" : "🍂 press leaf"}
          </button>

          <button
            type="button"
            onClick={reportPost}
            style={{
              background: "rgba(255,80,80,0.12)",
              border: "1px solid rgba(255,80,80,0.35)",
              color: "#ff8a8a",
              borderRadius: "12px",
              padding: "5px 11px",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Report
          </button>
        </div>
      </div>
    </div>
  );
}
