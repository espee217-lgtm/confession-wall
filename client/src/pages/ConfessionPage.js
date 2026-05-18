import DisplayTitlePill from "../components/DisplayTitlePill";
import ForestEventBanner from "../components/ForestEventBanner";
import FramedAvatar from "../components/FramedAvatar";
import { AnimatedBadge, PostThemeFxLayers } from "../components/CosmeticFx";
import MobileBottomNav from "../components/MobileBottomNav";
import {
  getCosmeticAnimationClass,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  COMFORT_CARD_OPTIONS,
  getComfortCardSummary,
  getConfessionThemeId,
  getDisplayCosmetics,
  getMoodChipStyle,
  getPollTotalVotes,
  getSavedConfessionIdSet,
} from "../utils/engagement";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.REACT_APP_API_URL;
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const REPORT_URL = `${API_BASE}/api/reports`;
const PRESSED_LEAVES_URL = `${API_BASE}/api/auth/pressed-leaves`;

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
    display: "block",
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
  },
};
const COMMENT_EMOJI_GROUPS = [
  {
    label: "mood",
    emojis: ["😭", "😂", "💀", "🥲", "😔", "🥹", "😳", "😤", "😩", "😌", "😎", "🤧"],
  },
  {
    label: "love",
    emojis: ["❤️", "🫶", "💕", "💖", "💗", "💘", "💔", "🥰", "😘", "🤍", "🖤", "💚"],
  },
  {
    label: "chaos",
    emojis: ["🔥", "✨", "👀", "🙏", "🙃", "🫠", "🤡", "😈", "😵‍💫", "🤭", "😮‍💨", "🫡"],
  },
  {
    label: "forest",
    emojis: ["🌱", "🌿", "🍃", "🌳", "🌸", "🌼", "🌙", "⭐", "🌧️", "🍂", "🪷", "🦋"],
  },
  {
    label: "hands",
    emojis: ["👍", "👎", "👏", "🤝", "🙌", "🤌", "✌️", "🤞", "🫰", "☝️", "👋", "🫵"],
  },
];
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
  const targetCommentId = searchParams.get("comment");
  const { token, user, refreshUser, updateUser } = useAuth();

  const [confession, setConfession] = useState(null);
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentPreview, setCommentPreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTrayPosition, setEmojiTrayPosition] = useState({ left: 14, bottom: 118 });
  const emojiPickerRef = useRef(null);
  const emojiTrayRef = useRef(null);
  const commentInputRef = useRef(null);

  const COMMENT_MOBILE_BREAKPOINT = 720;
  const [isPhoneLayout, setIsPhoneLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= COMMENT_MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const syncPhoneLayout = () => {
      setIsPhoneLayout(window.innerWidth <= COMMENT_MOBILE_BREAKPOINT);
    };

    syncPhoneLayout();
    window.addEventListener("resize", syncPhoneLayout);

    return () => {
      window.removeEventListener("resize", syncPhoneLayout);
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/${id}`)
      .then((r) => r.json())
      .then(setConfession)
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    if (!targetCommentId || !confession) return;

    const el = document.getElementById(`comment-${targetCommentId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    }
  }, [targetCommentId, confession]);
  useEffect(() => {
  if (!showEmojiPicker) return;

  const closeEmojiPickerOnOutsideClick = (e) => {
    const clickedPickerButton =
      emojiPickerRef.current && emojiPickerRef.current.contains(e.target);
    const clickedEmojiTray =
      emojiTrayRef.current && emojiTrayRef.current.contains(e.target);

    if (clickedPickerButton || clickedEmojiTray) return;

    setShowEmojiPicker(false);
  };

  document.addEventListener("mousedown", closeEmojiPickerOnOutsideClick);
  document.addEventListener("touchstart", closeEmojiPickerOnOutsideClick);

  return () => {
    document.removeEventListener("mousedown", closeEmojiPickerOnOutsideClick);
    document.removeEventListener("touchstart", closeEmojiPickerOnOutsideClick);
  };
}, [showEmojiPicker]);

  const watered = confession?.wateredBy?.length || 0;
  const burned = confession?.burnedBy?.length || 0;

  const realmFromUrl = searchParams.get("realm");
  const from = searchParams.get("from");

  const inferredRealm =
    burned > watered ? "scorched" : watered === burned ? "budding" : "grove";

  const realm = realmFromUrl || inferredRealm;
  const theme = realmThemes[realm] || realmThemes.grove;
  const authorEquipped = getDisplayCosmetics(confession?.userId);
  const confessionThemeId = getConfessionThemeId(
    confession,
    authorEquipped,
    confession?.userId
  );
  const authorPostThemeStyle = getPostThemeStyle(confessionThemeId, realm);
  const authorPostThemeClass = getCosmeticAnimationClass(confessionThemeId);
  const viewerEquipped = getDisplayCosmetics(user);
  const viewerPostThemeStyle = getPostThemeStyle(viewerEquipped.postTheme, realm);
  const viewerHasPostTheme = Boolean(viewerEquipped.postTheme);
  const moodStyle = getMoodChipStyle(confession?.mood);
  const comfortCards = getComfortCardSummary(confession?.comfortCards);
  const pollVotes = getPollTotalVotes(confession?.poll);
  const isSaved = getSavedConfessionIdSet(user).has(String(confession?._id || ""));

// 📎 COMMENT IMAGE PIN PLACEMENT CONTROLS
// Change only these 4 values later.
// X controls left/right: negative = left, positive = right.
// Y controls up/down: negative = up, positive = down.
const COMMENT_IMAGE_PIN_DESKTOP_X = 0;
const COMMENT_IMAGE_PIN_DESKTOP_Y = 4;

const COMMENT_IMAGE_PIN_PHONE_X = -18;
const COMMENT_IMAGE_PIN_PHONE_Y = 4;

const activeCommentPinPosition = isPhoneLayout
  ? {
      x: COMMENT_IMAGE_PIN_PHONE_X,
      y: COMMENT_IMAGE_PIN_PHONE_Y,
    }
  : {
      x: COMMENT_IMAGE_PIN_DESKTOP_X,
      y: COMMENT_IMAGE_PIN_DESKTOP_Y,
    };

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
    ...authorPostThemeStyle,
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
  position: "relative",
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
    ...viewerPostThemeStyle,
  };
  const insertEmoji = (emoji) => {
  const input = commentInputRef.current;

  if (!input) {
    setComment((prev) => `${prev}${emoji}`);
    return;
  }

  const start = input.selectionStart ?? comment.length;
  const end = input.selectionEnd ?? comment.length;

  setComment((prev) => {
    const before = prev.slice(0, start);
    const after = prev.slice(end);
    return `${before}${emoji}${after}`;
  });

  window.setTimeout(() => {
    input.focus();
    const nextPosition = start + emoji.length;
    input.setSelectionRange(nextPosition, nextPosition);
  }, 0);
};
  const toggleEmojiPicker = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const phone = window.innerWidth <= COMMENT_MOBILE_BREAKPOINT;
    const trayWidth = phone
      ? Math.min(310, window.innerWidth - 28)
      : Math.min(360, window.innerWidth - 36);

    const desktopLeft = Math.min(
      Math.max(rect.right - trayWidth, 14),
      window.innerWidth - trayWidth - 14
    );

    setEmojiTrayPosition({
      left: phone ? window.innerWidth / 2 : desktopLeft,
      bottom: phone ? 118 : Math.max(window.innerHeight - rect.top + 12, 72),
    });

    setShowEmojiPicker((open) => !open);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setCommentImage(file);
    setCommentPreview(file ? URL.createObjectURL(file) : null);
  };

  const reportComment = async (commentId) => {
    if (!token) {
      window.cwToast?.("You must be logged in to report.", "warning") ||
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
        window.cwToast?.(
          data.message || data.error || "Could not submit report.",
          "error"
        ) || alert(data.message || data.error || "Could not submit report.");
        return;
      }

      window.cwToast?.("Comment reported.", "success") ||
        alert("Comment reported.");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Something went wrong while reporting.", "error") ||
        alert("Something went wrong while reporting.");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim() && !commentImage) return;

    if (!token) {
      window.cwToast?.("You must be logged in to comment.", "warning") ||
        alert("You must be logged in to comment.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("text", comment);

      if (commentImage) formData.append("image", commentImage);

      const commentRes = await fetch(`${API_URL}/${id}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const commentData = await commentRes.json().catch(() => ({}));

      if (!commentRes.ok) {
        window.cwToast?.(
          commentData.message || commentData.error || "Could not add comment.",
          "error"
        ) ||
          alert(
            commentData.message || commentData.error || "Could not add comment."
          );
        return;
      }

      if (commentData.seedReward?.awarded) {
        window.cwToast?.(commentData.seedReward.message, "success");
        refreshUser?.();
      }

      setComment("");
      setCommentImage(null);
      setCommentPreview(null);

      const updated = await fetch(`${API_URL}/${id}`).then((r) => r.json());
      setConfession(updated);
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not add comment.", "error") ||
        alert("Could not add comment.");
    }
  };

  const togglePressedLeaf = async () => {
    if (!token) {
      window.cwToast?.("You must be logged in to save confessions.", "warning") ||
        alert("You must be logged in to save confessions.");
      return;
    }

    try {
      const res = await fetch(`${PRESSED_LEAVES_URL}/${id}`, {
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

  const sendComfortCard = async (text) => {
    if (!token) {
      window.cwToast?.("You must be logged in to send comfort cards.", "warning") ||
        alert("You must be logged in to send comfort cards.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${id}/comfort-cards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(
          data.message || "Could not send that comfort card.",
          "error"
        ) || alert(data.message || "Could not send that comfort card.");
        return;
      }

      setConfession((prev) => ({
        ...prev,
        comfortCards: data.comfortCards || [],
      }));
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not send that comfort card.", "error") ||
        alert("Could not send that comfort card.");
    }
  };

  const votePoll = async (optionIndex) => {
    if (!token) {
      window.cwToast?.("You must be logged in to vote on polls.", "warning") ||
        alert("You must be logged in to vote on polls.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${id}/poll-vote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIndex }),
      });

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(data.message || "Could not record your vote.", "error") ||
          alert(data.message || "Could not record your vote.");
        return;
      }

      setConfession((prev) => ({
        ...prev,
        poll: data.poll,
      }));
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not record your vote.", "error") ||
        alert("Could not record your vote.");
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
    <div className="cw-confession-page" style={{ position: "relative", minHeight: "100vh" }}>
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
              from === "admin"
                ? "/admin/dashboard"
                : realm === "budding"
                ? "/budding"
                : realm === "scorched"
                ? "/scorched"
                : "/grove"
            }
            style={{ ...styles.backBtn, color: theme.accent }}
          >
            ← back
          </Link>

          <div style={{ marginBottom: "16px" }}>
            <ForestEventBanner />
          </div>

          <div
            style={cardStyle}
            className={authorPostThemeClass || undefined}
          >
            <PostThemeFxLayers themeId={confessionThemeId} />
            <div style={styles.avatarRow}>
              <Link
                to={confession.userId ? `/user/${confession.userId._id}` : "#"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
              >
                <FramedAvatar
                  src={confession.userId?.profilePicture}
                  username={confession.userId?.username || "?"}
                  frameId={authorEquipped.frame}
                  effectId={authorEquipped.visualEffect}
                  size={38}
                  placeholder="🌿"
                />
              </Link>

              <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  <Link
    to={confession.userId ? `/user/${confession.userId._id}` : "#"}
    style={{
      fontWeight: 600,
      fontSize: "14px",
      color: theme.username,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    }}
  >
    @{confession.userId?.username || "anonymous"}{" "}
    <AnimatedBadge badgeId={authorEquipped.badge} size="sm" />
  </Link>

  <DisplayTitlePill titleId={authorEquipped.title} />
  {moodStyle && <span style={moodStyle}>{confession.mood}</span>}
</div>
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

            {confession.poll?.question &&
              Array.isArray(confession.poll.options) && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    borderRadius: "16px",
                    border: "1px solid rgba(180, 210, 255, 0.18)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: theme.section,
                      marginBottom: "8px",
                    }}
                  >
                    Anonymous Poll
                  </div>

                  <p
                    style={{
                      margin: "0 0 10px",
                      color: theme.text,
                      fontSize: "14px",
                      lineHeight: 1.55,
                    }}
                  >
                    {confession.poll.question}
                  </p>

                  <div style={{ display: "grid", gap: "7px" }}>
                    {confession.poll.options.map((option, index) => (
                      <button
                        key={`${option.text}-${index}`}
                        type="button"
                        onClick={() => votePoll(index)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "9px 12px",
                          borderRadius: "12px",
                          border: `1px solid ${theme.reactionBorder}`,
                          background: "rgba(255,255,255,0.05)",
                          color: theme.text,
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
                      color: theme.muted,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {pollVotes} vote{pollVotes !== 1 ? "s" : ""}
                  </div>
                </div>
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

            <div
              style={{
                marginTop: "10px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={togglePressedLeaf}
                style={{
                  borderRadius: "999px",
                  border: `1px solid ${
                    isSaved
                      ? "rgba(240, 210, 135, 0.4)"
                      : "rgba(220, 192, 120, 0.22)"
                  }`,
                  background: isSaved
                    ? "rgba(220, 192, 120, 0.16)"
                    : "rgba(220, 192, 120, 0.08)",
                  color: isSaved ? "#ffe6a7" : "#e7d59a",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  fontSize: "11px",
                }}
              >
                {isSaved ? "🍂 saved to Pressed Leaves" : "🍂 save to Pressed Leaves"}
              </button>
            </div>

            <ReactionBar
              wateredBy={confession.wateredBy || []}
              burnedBy={confession.burnedBy || []}
              userId={user?._id}
              theme={theme}
              onReact={async (type) => {
                if (!token) {
                  window.cwToast?.("You must be logged in to react.", "warning") ||
                    alert("You must be logged in to react.");
                  return;
                }

                const res = await fetch(`${API_URL}/${id}/react`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ type }),
                });

                const data = await res.json();

                if (!res.ok) {
                  window.cwToast?.(
                    data.message || data.error || "Could not react.",
                    "error"
                  ) || alert(data.message || data.error || "Could not react.");
                  return;
                }

                if (data.seedReward?.awarded) {
                  refreshUser?.();
                }

                setConfession((prev) => ({
                  ...prev,
                  wateredBy: data.wateredBy,
                  burnedBy: data.burnedBy,
                }));
              }}
            />

            <div
              style={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: `1px solid ${theme.reactionBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: theme.section,
                  marginBottom: "9px",
                }}
              >
                Comfort Cards
              </div>

              {comfortCards.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "7px",
                    marginBottom: "10px",
                  }}
                >
                  {comfortCards.map((card) => (
                    <span
                      key={card.text}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        border: `1px solid ${theme.reactionBorder}`,
                        background: "rgba(255,255,255,0.05)",
                        color: theme.text,
                        fontSize: "11px",
                      }}
                    >
                      <span>{card.text}</span>
                      <strong>{card.count}</strong>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {COMFORT_CARD_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => sendComfortCard(option)}
                    style={{
                      padding: "7px 11px",
                      borderRadius: "999px",
                      border: `1px solid ${theme.reactionBorder}`,
                      background: "rgba(255,255,255,0.04)",
                      color: theme.text,
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                      fontSize: "11px",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
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
            confession.comments.map((c, i) => {
  const isTargetComment =
    targetCommentId && c._id?.toString() === targetCommentId;

  const commentEquipped = getDisplayCosmetics(c.userId);
  const commentThemeId = getConfessionThemeId(c, commentEquipped, c.userId);
  const commentPostThemeStyle = getPostThemeStyle(commentThemeId, realm);
  const commentPostThemeClass = getCosmeticAnimationClass(commentThemeId);
  const commentHasTheme = Boolean(commentThemeId);

  const commentTextColor = commentHasTheme
    ? "rgba(240,255,235,0.94)"
    : theme.text;

  return (
                <div
                  key={c._id || i}
                  id={`comment-${c._id}`}
                  className={commentPostThemeClass || undefined}
                  style={{
  ...commentCardStyle,
  ...commentPostThemeStyle,
  color: commentTextColor,
  transform: isTargetComment ? "scale(1.035)" : "scale(1)",
                    border: isTargetComment
                      ? "1px solid rgba(255,230,120,0.75)"
                      : commentCardStyle.border,
                    boxShadow: isTargetComment
                      ? "0 0 35px rgba(255,230,120,0.55)"
                      : commentCardStyle.boxShadow,
                    transition: "all 0.35s ease",
                  }}
                >
                  <PostThemeFxLayers themeId={commentThemeId} />
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Link
                      to={c.userId ? `/user/${c.userId._id}` : "#"}
                      style={{
                        marginRight: "10px",
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                      }}
                    >
                      <FramedAvatar
                        src={c.userId?.profilePicture}
                        username={c.userId?.username || "?"}
                        size={30}
                        frameId={commentEquipped.frame}
                        effectId={commentEquipped.visualEffect}
                        placeholder="🌿"
                      />
                    </Link>

                    <Link
                      to={c.userId ? `/user/${c.userId._id}` : "#"}
                      style={{
                        fontWeight: 600,
                        fontSize: "13px",
                        color: theme.username,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      @{c.userId?.username || "anonymous"}
                      <AnimatedBadge badgeId={commentEquipped.badge} size="sm" />
                    </Link>
                    <DisplayTitlePill titleId={commentEquipped.title} />
                  </div>

                  {c.text && (
                    <p
                      style={{
                        fontSize: "14px",
                        color: commentTextColor,
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
                      if (!token) {
                        window.cwToast?.(
                          "You must be logged in to react.",
                          "warning"
                        ) || alert("You must be logged in to react.");
                        return;
                      }

                      const res = await fetch(
                        `${API_URL}/${id}/comments/${i}/react`,
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ type }),
                        }
                      );

                      const data = await res.json();

                      if (!res.ok) {
                        window.cwToast?.(
                          data.message || data.error || "Could not react.",
                          "error"
                        ) ||
                          alert(
                            data.message || data.error || "Could not react."
                          );
                        return;
                      }

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
              );
            })
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

            <div className="comment-input-row" style={inputRowStyle}>
              <input
                ref={commentInputRef}
                type="text"
                placeholder="leave a confession…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  color: viewerHasPostTheme
                    ? "rgba(240,255,235,0.95)"
                    : theme.inputText,
                  background: "transparent",
                  fontFamily: "Georgia, serif",
                }}
              />

              <div ref={emojiPickerRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={toggleEmojiPicker}
                  style={{
                    background: showEmojiPicker
                      ? "rgba(120,255,180,0.16)"
                      : "transparent",
                    border: showEmojiPicker
                      ? "1px solid rgba(120,255,180,0.28)"
                      : "1px solid transparent",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "4px 8px",
                    borderRadius: "50%",
                    color: theme.accent,
                    lineHeight: 1,
                  }}
                  title="Add emoji"
                >
                  😊
                </button>

                {showEmojiPicker && (() => {
                  const trayEl = (
                  <div
                    ref={emojiTrayRef}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    style={{
                      // Always portal to body so desktop is not clipped by the rounded input row
                      // and mobile stays above the bottom nav.
                      position: "fixed",
                      left: isPhoneLayout ? "50%" : `${emojiTrayPosition.left}px`,
                      right: "auto",
                      bottom: `${emojiTrayPosition.bottom}px`,
                      transform: isPhoneLayout ? "translateX(-50%)" : "none",

                      width: isPhoneLayout
                        ? "min(310px, calc(100vw - 28px))"
                        : "min(360px, calc(100vw - 36px))",
                      maxWidth: isPhoneLayout ? "calc(100vw - 28px)" : "360px",
                      maxHeight: isPhoneLayout
                        ? "230px"
                        : "min(330px, calc(100vh - 190px))",

                      overflowY: "auto",
                      overflowX: "hidden",
                      overscrollBehavior: "contain",
                      padding: "12px",
                      paddingRight: "8px",
                      borderRadius: "18px",
                      border: `1px solid ${theme.reactionBorder}`,
                      background:
                        realm === "grove"
                          ? "rgba(255,255,255,0.96)"
                          : "rgba(6, 22, 13, 0.96)",
                      boxShadow:
                        "0 18px 60px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)",
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                      zIndex: 999999,
                    }}
                  >
                    {COMMENT_EMOJI_GROUPS.map((group) => (
                      <div key={group.label} style={{ marginBottom: "9px" }}>
                        <div
                          style={{
                            marginBottom: "6px",
                            fontSize: "9px",
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: theme.muted,
                            fontWeight: 700,
                          }}
                        >
                          {group.label}
                        </div>

                       <div
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: isPhoneLayout ? "7px" : "8px",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    margin: "0 auto",
  }}
>
                          {group.emojis.map((emoji) => (
                            <button
                              key={`${group.label}-${emoji}`}
                              type="button"
                              onClick={() => {
                                insertEmoji(emoji);

                                if (isPhoneLayout) {
                                  setShowEmojiPicker(false);
                                }
                              }}
                              style={{
                                width: isPhoneLayout ? "34px" : "32px",
                                height: isPhoneLayout ? "34px" : "32px",
                                transform: "translateY(0) scale(1)",
                                display: "grid",
                                placeItems: "center",
                                borderRadius: "12px",
                                border: `1px solid ${theme.reactionBorder}`,
                                background:
                                  realm === "grove"
                                    ? "rgba(245,255,240,0.78)"
                                    : "rgba(255,255,255,0.06)",
                                cursor: "pointer",
                                fontSize: isPhoneLayout ? "18px" : "17px",
                                lineHeight: 1,
                                transition:
                                  "transform 0.15s ease, background 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
  e.currentTarget.style.transform = "translateY(-2px) scale(1.08)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = "translateY(0) scale(1)";
}}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  );

                  return ReactDOM.createPortal(trayEl, document.body);
                })()}
              </div>

              <label
                className="comment-image-pin"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "4px 8px",
                  borderRadius: "50%",
                  color: theme.accent,

                  // Uses the separate desktop/phone controls above.
                  position: "relative",
                  left: `${activeCommentPinPosition.x}px`,
                  top: `${activeCommentPinPosition.y}px`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: isPhoneLayout ? "translateX(-6px)" : "translateX(-10px)",
                  flexShrink: 0,
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
                  background: viewerHasPostTheme
                    ? "rgba(110, 170, 255, 0.28)"
                    : theme.accent,
                  border: viewerHasPostTheme
                    ? "1px solid rgba(150, 200, 255, 0.45)"
                    : "none",
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
      <MobileBottomNav />
    </div>
  );
}
