import DisplayTitlePill from "../components/DisplayTitlePill";
import ForestEventBanner from "../components/ForestEventBanner";
import FramedAvatar from "../components/FramedAvatar";
import { AnimatedBadge, PostThemeFxLayers } from "../components/CosmeticFx";
import MobileBottomNav from "../components/MobileBottomNav";
import EmojiIcon from "../components/EmojiIcon";
import {
  getCosmeticAnimationClass,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  COMFORT_CARD_OPTIONS,
  getConfessionThemeId,
  getDisplayCosmetics,
  getMoodChipStyle,
  getPollTotalVotes,
  getSavedConfessionIdSet,
} from "../utils/engagement";
import {
  normalizeContentWarning,
  shouldBlurSensitiveContent,
} from "../utils/contentWarning";
import { getConfessionImages } from "../utils/confessionImages";
import {
  copyConfessionLink,
  getConfessionExcerpt,
  shareConfession,
} from "../utils/shareConfession";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useParams, useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { COMMENT_EMOJI_GROUPS } from "../data/emojiGroups";
import { filterEmojiGroups, getEmojiCategoryLabels } from "../utils/filterEmojiGroups";

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
        aria-label={`${isWater ? "Water" : "Burn"} confession`}
        className={[
          "confession-detail-reaction-btn",
          isWater ? "is-water" : "is-burn",
          active ? "is-active" : "",
          small ? "confession-detail-reaction-btn--small" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          "--reaction-active-border": activeColor,
          "--reaction-idle-border": idleColor,
          "--reaction-active-text": activeText,
          "--reaction-idle-text": idleText,
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

function RelatedConfessionCard({ post, theme }) {
  if (!post?._id) return null;

  const moodStyle = getMoodChipStyle(post.mood);
  const excerpt = getConfessionExcerpt(post.message, 150);
  const username = post.userId?.username || "anonymous";
  const wateredCount = post.wateredBy?.length || 0;
  const burnedCount = post.burnedBy?.length || 0;
  const commentCount = post.comments?.length || 0;

  return (
    <Link
      to={`/confession/${post._id}`}
      aria-label={`Read related confession by ${username}`}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <article
        style={{
          borderRadius: "14px",
          border: theme.cardBorder,
          background: "rgba(255,255,255,0.06)",
          padding: "12px 13px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          transition: "transform 0.16s ease, box-shadow 0.16s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: theme.username,
              fontWeight: 700,
            }}
          >
            @{username}
          </span>
          {moodStyle && (
            <span style={{ ...moodStyle, fontSize: "9px" }}>{post.mood}</span>
          )}
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: 1.5,
            color: theme.text,
          }}
        >
          {excerpt || "Anonymous confession."}
        </p>

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "10px",
            fontSize: "10px",
            color: theme.muted,
            letterSpacing: "0.02em",
          }}
        >
          <span>water {wateredCount}</span>
          <span>burn {burnedCount}</span>
          <span>comments {commentCount}</span>
        </div>
      </article>
    </Link>
  );
}

function normalizeComfortCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function getReceivedComfortCards(rawCards) {
  const cardsByText = new Map();
  const optionOrder = new Map(
    COMFORT_CARD_OPTIONS.map((option, index) => [option, index])
  );

  const addCard = (label, count) => {
    const text = String(label || "").trim();
    const safeCount = normalizeComfortCount(count);

    if (!text || safeCount <= 0) return;

    cardsByText.set(text, {
      text,
      count: (cardsByText.get(text)?.count || 0) + safeCount,
    });
  };

  if (Array.isArray(rawCards)) {
    rawCards.forEach((card) => {
      if (typeof card === "string") {
        addCard(card, 1);
        return;
      }

      if (!card || typeof card !== "object") return;

      addCard(
        card.text || card.label || card.message || card.type || card.key,
        card.count ?? card.total ?? card.value ?? card.users?.length
      );
    });
  } else if (rawCards && typeof rawCards === "object") {
    Object.entries(rawCards).forEach(([key, value]) => {
      if (typeof value === "number" || typeof value === "string") {
        addCard(key, value);
        return;
      }

      if (Array.isArray(value)) {
        addCard(key, value.length);
        return;
      }

      if (!value || typeof value !== "object") return;

      addCard(
        value.text || value.label || value.message || key,
        value.count ?? value.total ?? value.value ?? value.users?.length
      );
    });
  }

  return Array.from(cardsByText.values()).sort((a, b) => {
    const countDiff = b.count - a.count;
    if (countDiff !== 0) return countDiff;

    const orderA = optionOrder.has(a.text)
      ? optionOrder.get(a.text)
      : Number.MAX_SAFE_INTEGER;
    const orderB = optionOrder.has(b.text)
      ? optionOrder.get(b.text)
      : Number.MAX_SAFE_INTEGER;

    return orderA - orderB || a.text.localeCompare(b.text);
  });
}

function ComfortSideStack({ cards = [], side = "right" }) {
  if (!cards.length) return null;

  const isLeft = side === "left";

  return (
    <aside
      className={`comfort-side-stack comfort-side-stack--${side}`}
      aria-label={`${isLeft ? "Left" : "Right"} comfort received`}
    >
      {cards.map((card, index) => (
        <div
          key={`${card.text}-${side}`}
          className={`comfort-side-note comfort-side-note--${side}`}
          aria-label={`${card.text}, sent ${card.count} ${
            card.count === 1 ? "time" : "times"
          }`}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {isLeft ? (
            <>
              <span className="comfort-side-note__count">{card.count}</span>
              <span className="comfort-side-note__text">{card.text}</span>
              <span className="comfort-side-note__connector" aria-hidden="true" />
            </>
          ) : (
            <>
              <span className="comfort-side-note__connector" aria-hidden="true" />
              <span className="comfort-side-note__text">{card.text}</span>
              <span className="comfort-side-note__count">{card.count}</span>
            </>
          )}
        </div>
      ))}
    </aside>
  );
}

function ComfortReceivedInline({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <div className="comfort-received-mobile" aria-label="Comfort received">
      <div className="comfort-received-mobile__title">Comfort received</div>
      <div className="comfort-received-mobile__grid">
        {cards.map((card) => (
          <div
            key={`mobile-${card.text}`}
            className="comfort-side-note comfort-side-note--mobile"
            aria-label={`${card.text}, sent ${card.count} ${
              card.count === 1 ? "time" : "times"
            }`}
          >
            <span className="comfort-side-note__text">{card.text}</span>
            <span className="comfort-side-note__count">{card.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function MentionInput({
  value,
  onChange,
  inputRef,
  token,
  placeholder,
  disabled,
  inputStyle,
  inputClassName = "",
  wrapperClassName = "",
}) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caretPosition, setCaretPosition] = useState(0);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [mentionLoadError, setMentionLoadError] = useState("");
  const blurTimerRef = useRef(null);

  const syncMentionQuery = (nextValue, nextCaret) => {
    const beforeCaret = String(nextValue || "").slice(0, nextCaret || 0);
    const match = beforeCaret.match(/(^|[\s([{])@([a-zA-Z0-9_.-]{0,40})$/);

    setCaretPosition(nextCaret || 0);

    if (!match || match[2].length < 2) {
      setMentionQuery("");
      setSuggestions([]);
      setIsSearchingMentions(false);
      setMentionLoadError("");
      setIsOpen(false);
      setActiveIndex(0);
      return;
    }

    setMentionQuery(match[2]);
    setMentionLoadError("");
    setIsOpen(true);
  };

  useEffect(() => {
    if (!token || mentionQuery.length < 2) {
      setIsSearchingMentions(false);
      setMentionLoadError("");
      return undefined;
    }

    const controller = new AbortController();
    setIsSearchingMentions(true);
    setMentionLoadError("");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/auth/mention-suggestions?q=${encodeURIComponent(mentionQuery)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );

        if (!res.ok) throw new Error("Could not load mention suggestions.");

        const data = await res.json().catch(() => []);
        const nextSuggestions = Array.isArray(data) ? data.slice(0, 5) : [];
        setSuggestions(nextSuggestions);
        setActiveIndex(0);
        setIsOpen(true);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setSuggestions([]);
        setMentionLoadError("could not load mentions");
        setIsOpen(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingMentions(false);
        }
      }
    }, 160);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setIsSearchingMentions(false);
    };
  }, [mentionQuery, token]);

  const insertMention = (suggestion) => {
    if (!suggestion?.username) return;

    const input = inputRef?.current;
    const currentCaret = input?.selectionStart ?? caretPosition ?? String(value || "").length;
    const beforeCaret = String(value || "").slice(0, currentCaret);
    const match = beforeCaret.match(/(^|[\s([{])@([a-zA-Z0-9_.-]{0,40})$/);

    if (!match) return;

    const mentionStart = currentCaret - match[2].length - 1;
    const inserted = `@${suggestion.username} `;
    const nextValue = `${String(value || "").slice(0, mentionStart)}${inserted}${String(value || "").slice(currentCaret)}`;
    const nextCaret = mentionStart + inserted.length;

    onChange(nextValue);
    setMentionQuery("");
    setSuggestions([]);
    setIsSearchingMentions(false);
    setMentionLoadError("");
    setIsOpen(false);
    setActiveIndex(0);

    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleChange = (e) => {
    const nextValue = e.target.value;
    const nextCaret = e.target.selectionStart;
    onChange(nextValue);
    syncMentionQuery(nextValue, nextCaret);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(suggestions[activeIndex] || suggestions[0]);
    }
  };

  const handlePointerDownSuggestion = (e, suggestion) => {
    e.preventDefault();
    insertMention(suggestion);
  };

  return (
    <div className={`mention-input-shell ${wrapperClassName}`.trim()}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          syncMentionQuery(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => {
          syncMentionQuery(e.target.value, e.target.selectionStart);
        }}
        onFocus={(e) => {
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          syncMentionQuery(e.target.value, e.target.selectionStart);
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => setIsOpen(false), 140);
        }}
        disabled={disabled}
        className={inputClassName}
        style={inputStyle}
        autoComplete="off"
        spellCheck="true"
      />

      {isOpen && mentionQuery.length >= 2 && (
        <div
          className="mention-suggestions mention-suggestions--above"
          role="listbox"
          aria-label="Mention suggestions"
        >
          {isSearchingMentions ? (
            <div className="mention-suggestions__state">searching golden roots…</div>
          ) : mentionLoadError ? (
            <div className="mention-suggestions__state mention-suggestions__state--error">
              {mentionLoadError}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="mention-suggestions__state">no matching users</div>
          ) : (
            suggestions.map((suggestion, index) => {
              const active = index === activeIndex;
              const equipped = suggestion.equippedCosmetics || {};

              return (
                <button
                  key={suggestion._id || suggestion.username}
                  type="button"
                  className={`mention-suggestion${active ? " mention-suggestion--active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => handlePointerDownSuggestion(e, suggestion)}
                  role="option"
                  aria-selected={active}
                >
                  <FramedAvatar
                    src={suggestion.profilePicture}
                    username={suggestion.username || "?"}
                    size={26}
                    frameId={equipped.frame}
                    effectId={equipped.visualEffect}
                    placeholder="🌿"
                  />
                  <span className="mention-suggestion__name">@{suggestion.username}</span>
                  {(suggestion.isAdmin || suggestion.role === "admin" || suggestion.role === "moderator") && (
                    <span className="mention-suggestion__role">{suggestion.role || "admin"}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function ConfessionPage() {
  const { id, commentId: routeCommentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const targetCommentId = searchParams.get("comment");
  const selectedCommentId = routeCommentId || targetCommentId || "";
  const isCommentFocusPage = Boolean(routeCommentId);
  const { token, user, refreshUser, updateUser } = useAuth();

  const [confession, setConfession] = useState(null);
  const [confessionLoading, setConfessionLoading] = useState(true);
  const [confessionError, setConfessionError] = useState("");
  const [relatedConfessions, setRelatedConfessions] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [copyFallbackUrl, setCopyFallbackUrl] = useState("");
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentPreview, setCommentPreview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replyInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("popular");
  const [isSensitiveRevealed, setIsSensitiveRevealed] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [lightboxScale, setLightboxScale] = useState(1);
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
    const controller = new AbortController();
    setConfession(null);
    setConfessionLoading(true);
    setConfessionError("");
    setCopyFallbackUrl("");

    const loadConfession = async () => {
      try {
        const res = await fetch(`${API_URL}/${id}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Could not load confession.");
        }

        setConfession(data);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
        setConfession(null);
        setConfessionError(err?.message || "Could not load confession.");
      } finally {
        setConfessionLoading(false);
      }
    };

    loadConfession();

    return () => {
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadRelated = async () => {
      setRelatedLoading(true);
      setRelatedConfessions([]);

      try {
        const res = await fetch(`${API_URL}/${id}/related`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          if (!cancelled) {
            setRelatedConfessions([]);
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const related = Array.isArray(data.related)
          ? data.related.filter(
              (post) => String(post?._id || "") !== String(id)
            )
          : [];

        setRelatedConfessions(related);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Related confessions fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setRelatedLoading(false);
        }
      }
    };

    loadRelated();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    setIsSensitiveRevealed(false);
  }, [id, confession?._id]);

  useEffect(() => {
    if (!lightboxImage) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setLightboxImage("");
        setLightboxScale(1);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxImage]);

  useEffect(() => {
    if (!selectedCommentId || !confession) return;

    const el = document.getElementById(`comment-${selectedCommentId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    }
  }, [selectedCommentId, confession]);
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

  useEffect(() => {
    if (!showEmojiPicker) {
      setEmojiQuery("");
      setEmojiCategory("popular");
    }
  }, [showEmojiPicker]);

  const emojiCategoryLabels = useMemo(
    () => getEmojiCategoryLabels(COMMENT_EMOJI_GROUPS),
    []
  );

  const visibleCommentEmojiGroups = useMemo(
    () => filterEmojiGroups(COMMENT_EMOJI_GROUPS, emojiQuery, emojiCategory),
    [emojiQuery, emojiCategory]
  );

  const watered = confession?.wateredBy?.length || 0;
  const burned = confession?.burnedBy?.length || 0;

  const realmFromUrl = searchParams.get("realm");
  const from = searchParams.get("from");
  const isAdminReturn =
    from === "admin" || Boolean(location.state?.fromAdmin);
  const adminReturnTo = location.state?.returnTo || "/admin/dashboard";

  const inferredRealm =
    burned > watered ? "scorched" : watered === burned ? "budding" : "grove";

  const realm = realmFromUrl || inferredRealm;
  const theme = realmThemes[realm] || realmThemes.grove;
  let bgVideo = "/forest3.mp4";

  if (realm === "scorched") bgVideo = "/Burnt.mp4";
  if (realm === "budding") bgVideo = "/budding.mp4";

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
  const receivedComfortCards = getReceivedComfortCards(confession?.comfortCards);
  const rightComfortCards = receivedComfortCards.slice(0, 3);
  const leftComfortCards = receivedComfortCards.slice(3, 6);
  const pollVotes = getPollTotalVotes(confession?.poll);
  const isSaved = getSavedConfessionIdSet(user).has(String(confession?._id || ""));
  const contentWarning = normalizeContentWarning(confession?.contentWarning);
  const hasContentWarning = contentWarning.enabled;
  const hideSensitiveContent =
    shouldBlurSensitiveContent(contentWarning) && !isSensitiveRevealed;
  const confessionImages = getConfessionImages(confession);

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

  const cardStyle = {
    background: theme.cardBg,
    borderRadius: isPhoneLayout ? "16px" : "18px",
    border: theme.cardBorder,
    padding: isPhoneLayout ? "18px 16px" : "24px",
    marginBottom: isPhoneLayout ? "20px" : "28px",
    boxShadow: isPhoneLayout
      ? "0 14px 44px rgba(0,0,0,0.34)"
      : theme.cardShadow,
    color: theme.text,
    backdropFilter: isPhoneLayout ? "blur(12px)" : "blur(16px)",
    WebkitBackdropFilter: isPhoneLayout ? "blur(12px)" : "blur(16px)",
    ...authorPostThemeStyle,
  };

  const commentCardStyle = {
    background: theme.cardBg,
    borderRadius: isPhoneLayout ? "12px" : "14px",
    border: theme.cardBorder,
    padding: isPhoneLayout ? "12px 14px" : "14px 18px",
    marginBottom: isPhoneLayout ? "8px" : "10px",
    boxShadow: isPhoneLayout
      ? "0 12px 36px rgba(0,0,0,0.3)"
      : theme.cardShadow,
    color: theme.text,
    backdropFilter: isPhoneLayout ? "blur(10px)" : "blur(14px)",
    WebkitBackdropFilter: isPhoneLayout ? "blur(10px)" : "blur(14px)",
  };

  const inputRowStyle = {
    position: "relative",
    display: "flex",
    gap: isPhoneLayout ? "10px" : "8px",
    alignItems: isPhoneLayout ? "stretch" : "center",
    flexWrap: isPhoneLayout ? "wrap" : "nowrap",
    marginTop: isPhoneLayout ? "16px" : "20px",
    background: theme.inputBg,
    borderRadius: isPhoneLayout ? "22px" : "50px",
    border: theme.cardBorder,
    padding: isPhoneLayout ? "10px" : "6px 6px 6px 18px",
    boxShadow: isPhoneLayout
      ? "0 14px 36px rgba(0,0,0,0.26)"
      : theme.cardShadow,
    backdropFilter: isPhoneLayout ? "blur(10px)" : "blur(14px)",
    WebkitBackdropFilter: isPhoneLayout ? "blur(10px)" : "blur(14px)",
    ...viewerPostThemeStyle,
  };
  const comments = Array.isArray(confession?.comments) ? confession.comments : [];
  const selectedComment = selectedCommentId
    ? comments.find((c) => String(c?._id || "") === String(selectedCommentId))
    : null;
  const selectedCommentIndex = selectedComment
    ? comments.findIndex((c) => String(c?._id || "") === String(selectedComment?._id || ""))
    : -1;
  const selectedReplies = Array.isArray(selectedComment?.replies)
    ? selectedComment.replies
    : [];
  const nextConfession =
    relatedConfessions.find(
      (post) => String(post?._id || "") !== String(confession?._id || "")
    ) || null;
  const actionButtonStyle = {
    "--confession-action-border": theme.reactionBorder,
    "--confession-action-text": "rgba(232, 255, 196, 0.96)",
    "--confession-action-section": "#dfffb4",
  };

  const clampScale = (value) => Math.max(0.4, Math.min(6, value));
  const openImageLightbox = (src) => {
    if (!src) return;
    setLightboxImage(src);
    setLightboxScale(1);
  };
  const closeImageLightbox = () => {
    setLightboxImage("");
    setLightboxScale(1);
  };
  const handleLightboxWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.16 : -0.16;
    setLightboxScale((prev) => clampScale(prev + delta));
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

  const handleCopyConfessionLink = async () => {
    if (!confession?._id) return;

    const result = await copyConfessionLink(confession._id);
    if (result.ok) {
      setCopyFallbackUrl("");
      window.cwToast?.("Confession link copied.", "success") ||
        alert("Confession link copied.");
      return;
    }

    setCopyFallbackUrl(result.url || "");
    window.cwToast?.("Copy failed. You can copy the link below.", "warning") ||
      alert("Copy failed. You can copy the link below.");
  };

  const handleShareConfession = async () => {
    if (!confession?._id) return;

    const result = await shareConfession(confession);

    if (result.cancelled) {
      return;
    }

    if (result.method === "native-share" && result.ok) {
      window.cwToast?.("Share ready.", "success");
      return;
    }

    if (result.ok) {
      setCopyFallbackUrl("");
      window.cwToast?.("Confession link copied.", "success") ||
        alert("Confession link copied.");
      return;
    }

    setCopyFallbackUrl(result.url || "");
    window.cwToast?.("Could not share automatically. Copy link below.", "warning") ||
      alert("Could not share automatically. Copy link below.");
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
        if (res.status === 409) {
          const duplicateMessage =
            data.message || "You already reported this comment.";
          window.cwToast?.(duplicateMessage, "warning") || alert(duplicateMessage);
          return;
        }

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

  const openCommentRoot = (commentId) => {
    if (!commentId) return;
    navigate(`/confession/${id}/comment/${commentId}`);
  };

  const focusReplyInput = () => {
    setTimeout(() => {
      replyInputRef.current?.focus();
      replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();

    if (!selectedComment?._id || !replyText.trim() || replySubmitting) return;

    if (!token) {
      window.cwToast?.("You must be logged in to reply.", "warning") ||
        alert("You must be logged in to reply.");
      return;
    }

    if (selectedReplies.length >= 500) {
      window.cwToast?.("This root already has the maximum 500 replies.", "warning") ||
        alert("This root already has the maximum 500 replies.");
      return;
    }

    try {
      setReplySubmitting(true);
      const res = await fetch(`${API_URL}/${id}/comments/${selectedComment._id}/replies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: replyText }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        window.cwToast?.(
          data.message || data.error || "Could not add reply.",
          "error"
        ) || alert(data.message || data.error || "Could not add reply.");
        return;
      }

      setConfession(data);
      setReplyText("");
      window.cwToast?.("Echo reply added.", "success");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not add reply.", "error") ||
        alert("Could not add reply.");
    } finally {
      setReplySubmitting(false);
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
      window.cwToast?.(
        "Log in to send comfort - you can still browse freely.",
        "warning"
      ) || alert("Log in to send comfort - you can still browse freely.");
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

  if (confessionLoading) {
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
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            borderRadius: "14px",
            border: "1px solid rgba(140,200,120,0.26)",
            background: "rgba(9,20,10,0.82)",
            color: "rgba(228,255,221,0.9)",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: "14px" }}>
            {confessionError || "Confession not found."}
          </p>
          <Link
            to="/trending"
            style={{
              color: "#b7ff9f",
              fontSize: "13px",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Browse trending confessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-confession-page" style={{ position: "relative", minHeight: "100vh" }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.45,
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
          background: theme.pageTint,
          zIndex: 0,
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
          <button
            type="button"
            onClick={() => {
              if (isAdminReturn) {
                navigate(adminReturnTo, { replace: true });
                return;
              }

              const fallbackRoute =
                realm === "budding"
                  ? "/budding"
                  : realm === "scorched"
                  ? "/scorched"
                  : "/grove";

              navigate(fallbackRoute);
            }}
            style={{
              ...styles.backBtn,
              color: theme.accent,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← back
          </button>

          <div style={{ marginBottom: "16px", maxWidth: "360px" }}>
            <ForestEventBanner compact />
          </div>

          <div className="confession-detail-shell">
            <ComfortSideStack side="left" cards={leftComfortCards} />

            <div
              style={cardStyle}
              className={["confession-detail-card", authorPostThemeClass]
                .filter(Boolean)
                .join(" ")}
            >
            <PostThemeFxLayers themeId={confessionThemeId} />
            <div
              style={{
                ...styles.avatarRow,
                gap: isPhoneLayout ? "8px" : "10px",
                alignItems: isPhoneLayout ? "flex-start" : "center",
                marginBottom: isPhoneLayout ? "12px" : "14px",
              }}
            >
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
                  alignItems: isPhoneLayout ? "flex-start" : "center",
                  gap: isPhoneLayout ? "6px" : "8px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to={confession.userId ? `/user/${confession.userId._id}` : "#"}
                  style={{
                    fontWeight: 600,
                    fontSize: isPhoneLayout ? "13px" : "14px",
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

            {hasContentWarning && (
              <div
                style={{
                  marginBottom: "12px",
                  display: "grid",
                  gap: "7px",
                }}
              >
                <span
                  style={{
                    width: "fit-content",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: "rgba(255,255,255,0.07)",
                    color: theme.text,
                    fontSize: "11px",
                    letterSpacing: "0.03em",
                  }}
                >
                  Content warning
                  {contentWarning.category ? `: ${contentWarning.category}` : ""}
                </span>

                {contentWarning.note && (
                  <p
                    style={{
                      margin: 0,
                      color: theme.muted,
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    {contentWarning.note}
                  </p>
                )}

                {hideSensitiveContent && (
                  <button
                    type="button"
                    onClick={() => setIsSensitiveRevealed(true)}
                    style={{
                      width: "fit-content",
                      border: "1px solid rgba(255,255,255,0.32)",
                      background: "rgba(255,255,255,0.12)",
                      color: theme.text,
                      borderRadius: "999px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    Tap to reveal
                  </button>
                )}
              </div>
            )}

            <div style={{ position: "relative", marginBottom: "12px" }}>
              <p
                style={{
                  fontSize: isPhoneLayout ? "15px" : "16px",
                  color: theme.text,
                  lineHeight: isPhoneLayout ? 1.62 : 1.7,
                  margin: 0,
                  filter: hideSensitiveContent ? "blur(8px)" : "none",
                  userSelect: hideSensitiveContent ? "none" : "text",
                  transition: "filter 0.18s ease",
                }}
              >
                {confession.message}
              </p>

              {hideSensitiveContent && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "12px",
                    background: "rgba(0,0,0,0.1)",
                  }}
                />
              )}
            </div>

            {confessionImages.length > 0 && (
              <div className="confession-image-scroller" style={{ marginTop: "8px" }}>
                <div className="confession-image-scroller__track">
                  {confessionImages.map((src, index) => (
                    <button
                      type="button"
                      key={`${src}-${index}`}
                      className="confession-image-scroller__item"
                      onClick={() => openImageLightbox(src)}
                    >
                      <img
                        src={src}
                        alt={`confession attachment ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        style={{
                          filter: hideSensitiveContent ? "blur(12px)" : "none",
                          transition: "filter 0.18s ease",
                        }}
                      />
                    </button>
                  ))}
                </div>
                {confessionImages.length > 1 && (
                  <div className="confession-image-scroller__count">
                    {confessionImages.length} images
                  </div>
                )}
                {hideSensitiveContent && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.12)",
                    }}
                  />
                )}
              </div>
            )}

            {confession.poll?.question &&
              Array.isArray(confession.poll.options) && (
                <div
                  style={{
                    marginTop: isPhoneLayout ? "12px" : "14px",
                    padding: isPhoneLayout ? "12px" : "14px",
                    borderRadius: isPhoneLayout ? "14px" : "16px",
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
                      fontSize: isPhoneLayout ? "13px" : "14px",
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
                          padding: isPhoneLayout ? "8px 10px" : "9px 12px",
                          borderRadius: isPhoneLayout ? "10px" : "12px",
                          border: `1px solid ${theme.reactionBorder}`,
                          background: "rgba(255,255,255,0.05)",
                          color: theme.text,
                          cursor: "pointer",
                          fontFamily: "Georgia, serif",
                          fontSize: isPhoneLayout ? "11px" : "12px",
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
                marginTop: "12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={handleShareConfession}
                aria-label="Share confession"
                className="confession-detail-action-btn"
                style={actionButtonStyle}
              >
                Share
              </button>
              <button
                type="button"
                onClick={handleCopyConfessionLink}
                aria-label="Copy confession link"
                className="confession-detail-action-btn"
                style={actionButtonStyle}
              >
                Copy Link
              </button>
              {nextConfession?._id && (
                <button
                  type="button"
                  onClick={() => navigate(`/confession/${nextConfession._id}`)}
                  aria-label="Read another confession"
                  className="confession-detail-action-btn"
                  style={actionButtonStyle}
                >
                  Next Confession
                </button>
              )}
            </div>

            {copyFallbackUrl && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  border: `1px solid ${theme.reactionBorder}`,
                  background: "rgba(255,255,255,0.04)",
                  color: theme.text,
                  fontSize: "11px",
                  wordBreak: "break-all",
                }}
              >
                {copyFallbackUrl}
              </div>
            )}

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
                className={`confession-detail-action-btn confession-detail-action-btn--save${
                  isSaved ? " is-active" : ""
                }`}
                style={actionButtonStyle}
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

              <ComfortReceivedInline cards={receivedComfortCards} />

              <div className="comfort-card-action-grid">
                {COMFORT_CARD_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => sendComfortCard(option)}
                    className="comfort-card-action-btn"
                    style={actionButtonStyle}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            </div>

            <ComfortSideStack side="right" cards={rightComfortCards} />
          </div>

          <div
            className="echo-roots-heading"
            style={{
              color: theme.section,
              marginBottom: isPhoneLayout ? "12px" : "14px",
            }}
          >
            <span>✦</span>
            <span>{comments.length || 0} echo roots</span>
          </div>

          {isCommentFocusPage && selectedComment ? (
            <section
              className="echo-focus-section"
              style={{
                "--echo-tree-card-bg": theme.cardBg,
                "--echo-tree-card-border": isPhoneLayout
                  ? theme.cardBorder
                  : "1px solid rgba(216, 192, 119, 0.42)",
                "--echo-tree-text": theme.text,
                "--echo-tree-muted": theme.muted,
                "--echo-tree-section": theme.section,
              }}
            >
              <button
                type="button"
                onClick={() => navigate(`/confession/${id}`)}
                className="echo-root-action-btn echo-root-action-btn--primary echo-focus-back-btn"
              >
                ← Back to echo roots
              </button>

              {(() => {
                const c = selectedComment;
                const i = selectedCommentIndex;
                const commentEquipped = getDisplayCosmetics(c.userId);
                const commentThemeId = getConfessionThemeId(c, commentEquipped, c.userId);
                const commentPostThemeStyle = getPostThemeStyle(commentThemeId, realm);
                const commentPostThemeClass = getCosmeticAnimationClass(commentThemeId);
                const commentTextColor = commentThemeId
                  ? "rgba(240,255,235,0.94)"
                  : theme.text;

                return (
                  <article
                    id={`comment-${c._id}`}
                    className={`cw-confession-comment-card echo-root-card echo-focus-root-card${
                      commentPostThemeClass ? ` ${commentPostThemeClass}` : ""
                    }`}
                    style={{
                      ...commentCardStyle,
                      ...commentPostThemeStyle,
                      color: commentTextColor,
                      border: commentPostThemeStyle.border || commentCardStyle.border,
                      boxShadow: commentPostThemeStyle.boxShadow || commentCardStyle.boxShadow,
                    }}
                  >
                    <PostThemeFxLayers themeId={commentThemeId} />

                    <div className="echo-root-card-topline">
                      <span className="echo-root-type-pill">🌿 Open Echo Root</span>
                      <span className="echo-root-position">#{i + 1}</span>
                    </div>

                    <div className="echo-author-line">
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
                          size={34}
                          frameId={commentEquipped.frame}
                          effectId={commentEquipped.visualEffect}
                          placeholder="🌿"
                        />
                      </Link>

                      <Link
                        to={c.userId ? `/user/${c.userId._id}` : "#"}
                        style={{
                          fontWeight: 700,
                          fontSize: isPhoneLayout ? "12px" : "13px",
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
                          fontSize: isPhoneLayout ? "14px" : "15px",
                          color: commentTextColor,
                          lineHeight: isPhoneLayout ? 1.6 : 1.72,
                          margin: "10px 0 0",
                        }}
                      >
                        {c.text}
                      </p>
                    )}

                    {c.image && (
                      <img
                        src={c.image}
                        alt="comment"
                        loading="lazy"
                        decoding="async"
                        onClick={() => openImageLightbox(c.image)}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "240px",
                          borderRadius: "10px",
                          marginTop: "10px",
                          cursor: "zoom-in",
                        }}
                      />
                    )}

                    <div className="echo-root-actions-row">
                      <button
                        type="button"
                        onClick={focusReplyInput}
                        className="echo-root-action-btn echo-root-action-btn--primary"
                      >
                        Echo back
                      </button>
                      <button
                        type="button"
                        onClick={() => reportComment(c._id)}
                        className="echo-root-action-btn echo-root-action-btn--report"
                        style={{
                          "--echo-report-bg": theme.reportBg,
                          "--echo-report-border": theme.reportBorder,
                          "--echo-report-color": theme.reportColor,
                        }}
                      >
                        Report
                      </button>
                    </div>
                  </article>
                );
              })()}

              <div className="echo-replies-thread" style={{ color: theme.text }}>
                <div className="echo-replies-thread-title">
                  <span>golden echoes below this root</span>
                  <strong>{selectedReplies.length}/500</strong>
                </div>

                {selectedReplies.length > 0 ? (
                  <div className="echo-reply-list">
                    {selectedReplies.map((reply, replyIndex) => {
                      const replyEquipped = getDisplayCosmetics(reply.userId);
                      return (
                        <div key={reply._id || replyIndex} className="echo-reply-row">
                          <span className="echo-reply-string" aria-hidden="true" />
                          <div className="echo-reply-bubble">
                            <div className="echo-reply-meta">
                              <Link
                                to={reply.userId ? `/user/${reply.userId._id}` : "#"}
                                className="echo-reply-author"
                              >
                                <FramedAvatar
                                  src={reply.userId?.profilePicture}
                                  username={reply.userId?.username || "?"}
                                  size={24}
                                  frameId={replyEquipped.frame}
                                  effectId={replyEquipped.visualEffect}
                                  placeholder="🌿"
                                />
                                @{reply.userId?.username || "anonymous"}
                              </Link>
                              <span>#{replyIndex + 1}</span>
                            </div>
                            <p>{reply.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="echo-root-empty-state echo-reply-empty" style={{ color: theme.muted }}>
                    no replies yet · echo back first 🌿
                  </div>
                )}

                <form onSubmit={handleReplySubmit} className="echo-reply-form">
                  <MentionInput
                    inputRef={replyInputRef}
                    token={token}
                    value={replyText}
                    onChange={setReplyText}
                    placeholder="write an echo back…"
                    disabled={replySubmitting || selectedReplies.length >= 500}
                    wrapperClassName="mention-input-shell--reply"
                  />
                  <button
                    type="submit"
                    disabled={replySubmitting || !replyText.trim() || selectedReplies.length >= 500}
                  >
                    {replySubmitting ? "posting…" : "reply"}
                  </button>
                </form>
              </div>
            </section>
          ) : comments.length > 0 ? (
            <section
              className="echo-root-tree-section"
              style={{
                "--echo-tree-card-bg": theme.cardBg,
                "--echo-tree-card-border": isPhoneLayout
                  ? theme.cardBorder
                  : "1px solid rgba(216, 192, 119, 0.34)",
                "--echo-tree-text": theme.text,
                "--echo-tree-muted": theme.muted,
                "--echo-tree-section": theme.section,
              }}
            >
              <div className="echo-root-trunk" aria-hidden="true" />

              <div className="echo-root-grid">
                {comments.map((c, i) => {
                  const isTargetComment = selectedCommentId && c._id?.toString() === selectedCommentId;
                  const replies = Array.isArray(c.replies) ? c.replies : [];
                  const previewReplies = replies.slice(0, 2);
                  const hiddenReplyCount = Math.max(0, replies.length - previewReplies.length);

                  const commentEquipped = getDisplayCosmetics(c.userId);
                  const commentThemeId = getConfessionThemeId(c, commentEquipped, c.userId);
                  const commentPostThemeStyle = getPostThemeStyle(commentThemeId, realm);
                  const commentPostThemeClass = getCosmeticAnimationClass(commentThemeId);
                  const commentHasTheme = Boolean(commentThemeId);

                  const commentTextColor = commentHasTheme
                    ? "rgba(240,255,235,0.94)"
                    : theme.text;

                  return (
                    <article
                      key={c._id || i}
                      className={`echo-root-slot echo-root-slot--${i % 6}${
                        isTargetComment ? " is-target" : ""
                      }`}
                    >
                      <span className="echo-root-drop-line" aria-hidden="true" />

                      <div
                        id={`comment-${c._id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openCommentRoot(c._id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openCommentRoot(c._id);
                          }
                        }}
                        className={`cw-confession-comment-card echo-root-card echo-root-card--clickable${
                          commentPostThemeClass ? ` ${commentPostThemeClass}` : ""
                        }`}
                        style={{
                          ...commentCardStyle,
                          ...commentPostThemeStyle,
                          marginBottom: 0,
                          color: commentTextColor,
                          transform: isTargetComment ? "scale(1.035)" : "scale(1)",
                          border: isTargetComment
                            ? "1px solid rgba(255,230,120,0.75)"
                            : commentPostThemeStyle.border || commentCardStyle.border,
                          boxShadow: isTargetComment
                            ? "0 0 35px rgba(255,230,120,0.55)"
                            : commentPostThemeStyle.boxShadow || commentCardStyle.boxShadow,
                          transition: "all 0.35s ease",
                        }}
                      >
                        <PostThemeFxLayers themeId={commentThemeId} />

                        <div className="echo-root-card-topline">
                          <span className="echo-root-type-pill">🌿 Echo Root</span>
                          <span className="echo-root-position">#{i + 1}</span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: isPhoneLayout ? "flex-start" : "center",
                            flexWrap: "wrap",
                            gap: isPhoneLayout ? "6px" : "0",
                          }}
                        >
                          <Link
                            to={c.userId ? `/user/${c.userId._id}` : "#"}
                            onClick={(event) => event.stopPropagation()}
                            style={{
                              marginRight: isPhoneLayout ? "6px" : "10px",
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
                            onClick={(event) => event.stopPropagation()}
                            style={{
                              fontWeight: 600,
                              fontSize: isPhoneLayout ? "12px" : "13px",
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
                              fontSize: isPhoneLayout ? "13px" : "14px",
                              color: commentTextColor,
                              lineHeight: isPhoneLayout ? 1.58 : 1.65,
                              margin: isPhoneLayout ? "6px 0 0" : "5px 0 0",
                            }}
                          >
                            {c.text}
                          </p>
                        )}

                        {c.image && (
                          <img
                            src={c.image}
                            alt="comment"
                            loading="lazy"
                            decoding="async"
                            onClick={(event) => {
                              event.stopPropagation();
                              openImageLightbox(c.image);
                            }}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "200px",
                              borderRadius: "10px",
                              marginTop: "8px",
                              cursor: "zoom-in",
                            }}
                          />
                        )}

                        {previewReplies.length > 0 && (
                          <div className="echo-root-reply-preview">
                            {previewReplies.map((reply, replyIndex) => (
                              <div key={reply._id || replyIndex} className="echo-root-reply-preview-row">
                                <span>@{reply.userId?.username || "anon"}</span>
                                <p>{reply.text}</p>
                              </div>
                            ))}
                            {hiddenReplyCount > 0 && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openCommentRoot(c._id);
                                }}
                              >
                                show {hiddenReplyCount} more {hiddenReplyCount === 1 ? "reply" : "replies"}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="echo-root-actions-row">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCommentRoot(c._id);
                              focusReplyInput();
                            }}
                            className="echo-root-action-btn echo-root-action-btn--primary"
                          >
                            Echo back {replies.length ? `(${replies.length})` : ""}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              reportComment(c._id);
                            }}
                            className="echo-root-action-btn echo-root-action-btn--report"
                            style={{
                              "--echo-report-bg": theme.reportBg,
                              "--echo-report-border": theme.reportBorder,
                              "--echo-report-color": theme.reportColor,
                            }}
                          >
                            Report
                          </button>
                        </div>

                        <div onClick={(event) => event.stopPropagation()}>
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
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <div
              className="echo-root-empty-state"
              style={{
                color: theme.muted,
              }}
            >
              no echoes yet · be the first root 🌿
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
                  decoding="async"
                  style={{
                    maxHeight: isPhoneLayout ? "84px" : "100px",
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
              <MentionInput
                inputRef={commentInputRef}
                token={token}
                placeholder="leave an echo…"
                value={comment}
                onChange={setComment}
                wrapperClassName="mention-input-shell--comment"
                inputStyle={{
                  flex: isPhoneLayout ? "1 1 100%" : 1,
                  width: isPhoneLayout ? "100%" : "auto",
                  minHeight: isPhoneLayout ? "42px" : undefined,
                  border: "none",
                  outline: "none",
                  fontSize: isPhoneLayout ? "15px" : "14px",
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
                    <div className="cw-emoji-search-wrap cw-emoji-search-wrap--comment">
                      <span aria-hidden="true" className="cw-emoji-search-icon">⌕</span>
                      <input
                        type="search"
                        value={emojiQuery}
                        onChange={(event) => setEmojiQuery(event.target.value)}
                        placeholder="search emojis..."
                        className="cw-emoji-search-input"
                        aria-label="Search emojis"
                      />
                    </div>

                    <div className="cw-emoji-category-tabs cw-emoji-category-tabs--comment" role="tablist" aria-label="Emoji categories">
                      {emojiCategoryLabels.map((label) => (
                        <button
                          key={label}
                          type="button"
                          className={`cw-emoji-category-tab ${emojiCategory === label ? "is-active" : ""}`}
                          onClick={() => {
                            setEmojiCategory(label);
                            setEmojiQuery("");
                          }}
                          title={label}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {emojiQuery.trim() ? (
                      <div className="cw-emoji-result-note">Showing fastest matching results. Type more to narrow.</div>
                    ) : null}

                    {visibleCommentEmojiGroups.length === 0 ? (
                      <div className="cw-emoji-search-empty">no matching emojis</div>
                    ) : visibleCommentEmojiGroups.map((group) => (
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
                              <EmojiIcon emoji={emoji} className="cw-noto-emoji--picker" size={isPhoneLayout ? 22 : 21} />
                              <span className="cw-emoji-button-text-fallback" aria-hidden="true">{emoji}</span>
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
                  padding: isPhoneLayout ? "8px 16px" : "8px 20px",
                  color: realm === "scorched" ? "#1d0704" : "white",
                  fontSize: isPhoneLayout ? "12px" : "13px",
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

          {(relatedLoading || relatedConfessions.length > 0) && (
            <section
              aria-label="Related confessions"
              style={{
                marginTop: "24px",
                marginBottom: isPhoneLayout ? "12px" : "18px",
                padding: isPhoneLayout ? "14px" : "16px",
                borderRadius: "16px",
                border: theme.cardBorder,
                background: "rgba(255,255,255,0.05)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.24)",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: isPhoneLayout ? "14px" : "15px",
                    color: theme.section,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Related confessions
                </h2>

                {nextConfession?._id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/confession/${nextConfession._id}`)}
                    aria-label="Next confession"
                    className="confession-detail-action-btn"
                    style={actionButtonStyle}
                  >
                    Read another
                  </button>
                )}
              </div>

              {relatedLoading ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: theme.muted,
                  }}
                >
                  loading related confessions...
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    gridTemplateColumns: isPhoneLayout
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {relatedConfessions.slice(0, 6).map((post) => (
                    <RelatedConfessionCard
                      key={post._id}
                      post={post}
                      theme={theme}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {lightboxImage && (
        <div
          onClick={closeImageLightbox}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000000,
            background: "rgba(3, 7, 12, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closeImageLightbox();
            }}
            style={{
              position: "fixed",
              top: "16px",
              right: "18px",
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.92)",
              fontSize: "18px",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            onWheel={handleLightboxWheel}
            style={{
              maxWidth: "92vw",
              maxHeight: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: "12px",
              cursor: "zoom-in",
            }}
          >
            <img
              src={lightboxImage}
              alt="Expanded"
              decoding="async"
              style={{
                maxWidth: "92vw",
                maxHeight: "90vh",
                transform: `scale(${lightboxScale})`,
                transformOrigin: "center center",
                transition: "transform 0.06s linear",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      )}
      <MobileBottomNav />
    </div>
  );
}
