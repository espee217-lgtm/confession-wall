import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.REACT_APP_API_URL;
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const REPORT_URL = `${API_BASE}/api/reports`;

const realmThemes = {
  grove: {
    pageTint: "rgba(5, 18, 8, 0.18)",
    cardBg: "rgba(255, 255, 255, 0.93)",
    cardBorder: "1px solid rgba(120, 220, 150, 0.25)",
    cardShadow: "0 18px 60px rgba(20, 80, 35, 0.22)",
    text: "#243820",
    muted: "#7a9e68",
    username: "#2d5a1f",
    accent: "#4a8f35",
    section: "#5a8a48",
    inputBg: "rgba(255,255,255,0.93)",
    inputText: "#2c3e28",
    reactionBorder: "rgba(100,180,80,0.12)",
    reportColor: "#c85a5a",
    reportBg: "rgba(255,80,80,0.08)",
    reportBorder: "1px solid rgba(255,80,80,0.25)",
  },

  budding: {
    pageTint: "rgba(4, 20, 10, 0.35)",
    cardBg: "rgba(10, 38, 22, 0.88)",
    cardBorder: "1px solid rgba(120, 255, 180, 0.23)",
    cardShadow:
      "0 18px 65px rgba(0,0,0,0.45), inset 0 1px 0 rgba(190,255,210,0.08)",
    text: "#dfffe5",
    muted: "rgba(190,255,210,0.65)",
    username: "#9fffc1",
    accent: "#43a55e",
    section: "#9fffc1",
    inputBg: "rgba(10, 38, 22, 0.9)",
    inputText: "#dfffe5",
    reactionBorder: "rgba(120,255,180,0.14)",
    reportColor: "#ffb3a6",
    reportBg: "rgba(255,100,80,0.08)",
    reportBorder: "1px solid rgba(255,120,90,0.32)",
  },

  scorched: {
    pageTint: "rgba(30, 6, 3, 0.4)",
    cardBg: "rgba(42, 10, 7, 0.9)",
    cardBorder: "1px solid rgba(255, 110, 80, 0.28)",
    cardShadow:
      "0 18px 65px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,160,120,0.08)",
    text: "#ffe1d6",
    muted: "rgba(255,200,180,0.62)",
    username: "#ffad91",
    accent: "#d85a30",
    section: "#ff9d78",
    inputBg: "rgba(42, 10, 7, 0.92)",
    inputText: "#ffe1d6",
    reactionBorder: "rgba(255,120,80,0.16)",
    reportColor: "#ff9b89",
    reportBg: "rgba(255,90,70,0.1)",
    reportBorder: "1px solid rgba(255,120,90,0.35)",
  },
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px 60px",
    fontFamily: "Georgia, serif",
  },
  inner: {
    maxWidth: "640px",
    margin: "0 auto",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    letterSpacing: "0.05em",
    textDecoration: "none",
    marginBottom: "20px",
    opacity: 0.85,
  },
  avatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(100,180,80,0.3)",
  },
  avatarPlaceholder: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #c8e6b8, #a8d498)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    border: "2px solid rgba(100,180,80,0.3)",
  },
};

function Avatar({ src, size = 38 }) {
  if (src) {
    return (
      <img
        src={src}
        alt="avatar"
        style={{ ...styles.avatar, width: size, height: size }}
      />
    );
  }

  return (
    <div style={{ ...styles.avatarPlaceholder, width: size, height: size }}>
      🌿
    </div>
  );
}

function realmStatus(wateredBy = [], burnedBy = []) {
  const total = wateredBy.length + burnedBy.length;

  if (total === 0) return { label: "🌱 be the first", color: "#8aab7a" };

  const r = wateredBy.length / total;

  if (r >= 0.85) return { label: "🌳 flourishing", color: "#1D9E75" };
  if (r >= 0.65) return { label: "🌿 thriving", color: "#3b8a5a" };
  if (r >= 0.5) return { label: "🌱 sprouting", color: "#7aab5a" };
  if (r >= 0.3) return { label: "🍂 wilting", color: "#BA7517" };
  if (r >= 0.15) return { label: "🔥 scorched", color: "#D85A30" };

  return { label: "💀 charred", color: "#712B13" };
}

function ReactionBar({
  wateredBy = [],
  burnedBy = [],
  onReact,
  userId,
  theme,
  small = false,
}) {
  const userWatered =
    userId && wateredBy.some((id) => (id?._id || id)?.toString() === userId);

  const userBurned =
    userId && burnedBy.some((id) => (id?._id || id)?.toString() === userId);

  const status = realmStatus(wateredBy, burnedBy);
  const total = wateredBy.length + burnedBy.length;
  const ratio = total === 0 ? 0 : wateredBy.length / total;

  const btn = (type) => {
    const isWater = type === "water";
    const active = isWater ? userWatered : userBurned;
    const activeColor = isWater
      ? "rgba(29,158,117,0.7)"
      : "rgba(216,90,48,0.7)";
    const idleColor = isWater
      ? "rgba(29,158,117,0.25)"
      : "rgba(216,90,48,0.25)";
    const activeText = isWater ? "#9fffc1" : "#ffb099";
    const idleText = isWater ? "#78c68a" : "#d8795b";

    return (
      <button
        type="button"
        onClick={() => onReact(type)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: small ? "4px" : "6px",
          padding: small ? "3px 10px" : "5px 14px",
          borderRadius: "20px",
          border: `0.5px solid ${active ? activeColor : idleColor}`,
          background: active
            ? isWater
              ? "rgba(29,158,117,0.14)"
              : "rgba(216,90,48,0.14)"
            : "transparent",
          cursor: "pointer",
          fontFamily: "Georgia, serif",
          fontSize: small ? "11px" : "12px",
          color: active ? activeText : idleText,
          transition: "all 0.2s ease",
        }}
      >
        {isWater ? "🌱" : "🔥"}{" "}
        <span>{isWater ? wateredBy.length : burnedBy.length}</span>
      </button>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: small ? "8px" : "14px",
        paddingTop: small ? "8px" : "12px",
        borderTop: `1px solid ${theme.reactionBorder}`,
      }}
    >
      {btn("water")}
      {btn("burn")}

      {total > 0 && (
        <div
          style={{
            flex: 1,
            height: "3px",
            borderRadius: "2px",
            background: "rgba(100,180,80,0.12)",
            overflow: "hidden",
            maxWidth: "60px",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "2px",
              width: `${Math.round(ratio * 100)}%`,
              background:
                ratio >= 0.65
                  ? "#1D9E75"
                  : ratio >= 0.45
                  ? "#639922"
                  : ratio >= 0.3
                  ? "#BA7517"
                  : "#D85A30",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}

      <span
        style={{
          fontSize: "10px",
          color: status.color,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          letterSpacing: "0.03em",
        }}
      >
        {status.label}
      </span>
    </div>
  );
}

export default function ConfessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();

  const [confession, setConfession] = useState(null);
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentPreview, setCommentPreview] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/${id}`)
      .then((r) => r.json())
      .then(setConfession)
      .catch((err) => console.error(err));
  }, [id]);

  const watered = confession?.wateredBy?.length || 0;
  const burned = confession?.burnedBy?.length || 0;

  const realmFromUrl = searchParams.get("realm");

  const inferredRealm =
    burned > watered ? "scorched" : watered === burned ? "budding" : "grove";

  const realm = realmFromUrl || inferredRealm;
  const theme = realmThemes[realm] || realmThemes.grove;

  let bgVideo = "/forest3.mp4";

  if (realm === "scorched") {
    bgVideo = "/Burnt.mp4";
  } else if (realm === "budding") {
    bgVideo = "/budding.mp4";
  }

  const cardStyle = {
    background: theme.cardBg,
    borderRadius: "18px",
    border: theme.cardBorder,
    padding: "24px",
    marginBottom: "28px",
    boxShadow: theme.cardShadow,
    color: theme.text,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };

  const commentCardStyle = {
    background: theme.cardBg,
    borderRadius: "14px",
    border: theme.cardBorder,
    padding: "14px 18px",
    marginBottom: "10px",
    boxShadow: theme.cardShadow,
    color: theme.text,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };

  const inputRowStyle = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "20px",
    background: theme.inputBg,
    borderRadius: "50px",
    border: theme.cardBorder,
    padding: "6px 6px 6px 18px",
    boxShadow: theme.cardShadow,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setCommentImage(file);
    setCommentPreview(file ? URL.createObjectURL(file) : null);
  };

  const reportComment = async (commentId) => {
    if (!token) {
      alert("You must be logged in to report.");
      return;
    }

    const reason = window.prompt("Why are you reporting this comment?");
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType: "comment",
          confessionId: id,
          commentId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Could not submit report.");
        return;
      }

      alert("Comment reported.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong while reporting.");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim() && !commentImage) return;

    try {
      const formData = new FormData();
      formData.append("text", comment);

      if (commentImage) formData.append("image", commentImage);

      await fetch(`${API_URL}/${id}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setComment("");
      setCommentImage(null);
      setCommentPreview(null);

      const updated = await fetch(`${API_URL}/${id}`).then((r) => r.json());
      setConfession(updated);
    } catch (err) {
      console.error(err);
      alert("Could not add comment.");
    }
  };

  if (!confession) {
    return (
      <div
        style={{
          ...styles.page,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050f04",
        }}
      >
        <span
          style={{
            color: "#7ab868",
            fontSize: "13px",
            letterSpacing: "0.1em",
          }}
        >
          loading…
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.46,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src={bgVideo} type="video/mp4" />
      </video>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: theme.pageTint,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          ...styles.page,
          position: "relative",
          zIndex: 1,
          background: "transparent",
        }}
      >
        <div style={styles.inner}>
          <Link
            to={
              realm === "budding"
                ? "/budding"
                : realm === "scorched"
                ? "/scorched"
                : "/grove"
            }
            style={{ ...styles.backBtn, color: theme.accent }}
          >
            ← back
          </Link>

          <div style={cardStyle}>
            <div style={styles.avatarRow}>
              <Link to={confession.userId ? `/user/${confession.userId._id}` : "#"}>
                <Avatar src={confession.userId?.profilePicture} />
              </Link>

              <Link
                to={confession.userId ? `/user/${confession.userId._id}` : "#"}
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: theme.username,
                  textDecoration: "none",
                }}
              >
                @{confession.userId?.username || "anonymous"}
              </Link>
            </div>

            <p
              style={{
                fontSize: "16px",
                color: theme.text,
                lineHeight: 1.7,
                margin: "0 0 12px",
              }}
            >
              {confession.message}
            </p>

            {confession.image && (
              <img
                src={confession.image}
                alt="confession"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  borderRadius: "12px",
                  marginTop: "8px",
                }}
              />
            )}

            <div
              style={{
                fontSize: "11px",
                color: theme.muted,
                letterSpacing: "0.06em",
                marginTop: "12px",
              }}
            >
              🌱 {new Date(confession.createdAt).toLocaleString()}
            </div>

            <ReactionBar
              wateredBy={confession.wateredBy || []}
              burnedBy={confession.burnedBy || []}
              userId={user?._id}
              theme={theme}
              onReact={async (type) => {
                const res = await fetch(`${API_URL}/${id}/react`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ type }),
                });

                const data = await res.json();

                setConfession((prev) => ({
                  ...prev,
                  wateredBy: data.wateredBy,
                  burnedBy: data.burnedBy,
                }));
              }}
            />
          </div>

          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: theme.section,
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✦</span>
            <span>{confession.comments?.length || 0} comments</span>
          </div>

          {confession.comments?.length > 0 ? (
            confession.comments.map((c, i) => (
              <div key={c._id || i} style={commentCardStyle}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Link
                    to={c.userId ? `/user/${c.userId._id}` : "#"}
                    style={{ marginRight: "10px" }}
                  >
                    <Avatar src={c.userId?.profilePicture} size={30} />
                  </Link>

                  <Link
                    to={c.userId ? `/user/${c.userId._id}` : "#"}
                    style={{
                      fontWeight: 600,
                      fontSize: "13px",
                      color: theme.username,
                      textDecoration: "none",
                    }}
                  >
                    @{c.userId?.username || "anonymous"}
                  </Link>
                </div>

                {c.text && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: theme.text,
                      lineHeight: 1.65,
                      margin: "5px 0 0",
                    }}
                  >
                    {c.text}
                  </p>
                )}

                {c.image && (
                  <img
                    src={c.image}
                    alt="comment"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "10px",
                      marginTop: "8px",
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => reportComment(c._id)}
                  style={{
                    marginTop: "10px",
                    background: theme.reportBg,
                    border: theme.reportBorder,
                    color: theme.reportColor,
                    borderRadius: "12px",
                    padding: "5px 11px",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Report
                </button>

                <ReactionBar
                  wateredBy={c.wateredBy || []}
                  burnedBy={c.burnedBy || []}
                  userId={user?._id}
                  theme={theme}
                  small
                  onReact={async (type) => {
                    const res = await fetch(`${API_URL}/${id}/comments/${i}/react`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ type }),
                    });

                    const data = await res.json();

                    setConfession((prev) => {
                      const updated = [...prev.comments];
                      updated[i] = {
                        ...updated[i],
                        wateredBy: data.wateredBy,
                        burnedBy: data.burnedBy,
                      };
                      return { ...prev, comments: updated };
                    });
                  }}
                />
              </div>
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                color: theme.muted,
                fontSize: "13px",
                padding: "24px 0",
                letterSpacing: "0.06em",
              }}
            >
              no confessions yet · be the first 🌿
            </div>
          )}

          <form onSubmit={handleCommentSubmit}>
            {commentPreview && (
              <div
                style={{
                  marginBottom: "10px",
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <img
                  src={commentPreview}
                  alt="preview"
                  style={{
                    maxHeight: "100px",
                    borderRadius: "10px",
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setCommentImage(null);
                    setCommentPreview(null);
                  }}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "rgba(0,0,0,0.5)",
                    border: "none",
                    borderRadius: "50%",
                    color: "white",
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={inputRowStyle}>
              <input
                type="text"
                placeholder="leave a confession…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  color: theme.inputText,
                  background: "transparent",
                  fontFamily: "Georgia, serif",
                }}
              />

              <label
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "4px 8px",
                  borderRadius: "50%",
                  color: theme.accent,
                }}
              >
                📎
                <input
                  type="file"
                  accept="image/*,image/gif"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>

              <button
                type="submit"
                style={{
                  background: theme.accent,
                  border: "none",
                  borderRadius: "50px",
                  padding: "8px 20px",
                  color: realm === "scorched" ? "#1d0704" : "white",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                  fontWeight: 700,
                }}
              >
                bloom →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}