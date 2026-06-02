import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import ForestEventBanner from "../components/ForestEventBanner";
import DailyQuestDropdown from "../components/DailyQuestDropdown";
import MobileBottomNav from "../components/MobileBottomNav";
import EmojiIcon from "../components/EmojiIcon";
import SplitBouquetHero from "../components/SplitBouquetHero";
import TranslatableText from "../components/TranslatableText";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FramedAvatar from "../components/FramedAvatar";
import { AnimatedBadge, PostThemeFxLayers } from "../components/CosmeticFx";
import {
  getCosmeticAnimationClass,
  getCosmeticMeta,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  CONFESSION_MOODS,
  WHISPER_PROMPTS,
  getConfessionThemeId,
  getDisplayCosmetics,
  getMoodChipStyle,
  getOwnedPostThemeIds,
} from "../utils/engagement";
import { CONTENT_WARNING_CATEGORIES } from "../utils/contentWarning";
import { POST_EMOJI_GROUPS } from "../data/emojiGroups";
import { filterEmojiGroups, getEmojiCategoryLabels } from "../utils/filterEmojiGroups";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com";

const API_URL = `${API_BASE}/api/confessions`;
const SCORCHED_URL = `${API_BASE}/api/confessions/realm/scorched`;
const MOBILE_HOME_PAGE_LIMIT = 20;
const MOBILE_EMOJI_SEARCH_LIMIT = 120;
const MAX_CONFESSION_IMAGES = 6;
const LOGIN_PROMPT_MESSAGE =
  "Log in or create an account to confess, react, and receive activity updates.";

function GuestLoginPrompt({ onClose, onLogin, onRegister }) {
  return (
    <div
      data-ui="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 7000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
        background: "rgba(3,10,2,0.68)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <section
        style={{
          width: "min(360px, 92vw)",
          borderRadius: "22px",
          border: "1px solid rgba(176,255,120,0.28)",
          background:
            "linear-gradient(180deg, rgba(10,35,14,0.96), rgba(4,16,7,0.98))",
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
          color: "rgba(238,255,220,0.94)",
          fontFamily: "Georgia, serif",
          padding: "22px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "rgba(210,255,165,0.82)",
            fontSize: "12px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          guest grove
        </p>
        <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>Join the forest first</h2>
        <p style={{ margin: "0 0 18px", lineHeight: 1.55, color: "rgba(230,255,220,0.72)" }}>
          Log in or create an account to confess, react, and receive activity updates.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onLogin}
            style={{
              border: "1px solid rgba(178,255,135,0.42)",
              background: "rgba(126,255,87,0.16)",
              color: "#efffce",
              borderRadius: "999px",
              padding: "9px 16px",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              fontWeight: 800,
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={onRegister}
            style={{
              border: "1px solid rgba(210,255,190,0.24)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(238,255,220,0.9)",
              borderRadius: "999px",
              padding: "9px 16px",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              fontWeight: 800,
            }}
          >
            Register
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "rgba(238,255,220,0.66)",
              padding: "9px 8px",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Maybe Later
          </button>
        </div>
      </section>
    </div>
  );
}

function normalizeConfessionResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      hasMore: false,
    };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: Number(data?.page || 1),
    hasMore: Boolean(data?.hasMore),
  };
}

function HomeBackgroundVideo() {
  return (
    <>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          width: "100vw",
          height: "100vh",
          minWidth: "100vw",
          minHeight: "100vh",
          objectFit: "cover",
          objectPosition: "center center",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/daisy-bg.mp4" type="video/mp4" />
      </video>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.35)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function EmojiPickerButton({ open, setOpen, onPick, compact = false }) {
  const anchorRef = useRef(null);
  const [emojiQueryInput, setEmojiQueryInput] = useState("");
  const [debouncedEmojiQuery, setDebouncedEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("popular");
  const pickerId = compact ? "mobile-confession-emoji-picker" : "desktop-confession-emoji-picker";
  const emojiCategoryLabels = useMemo(
    () => getEmojiCategoryLabels(POST_EMOJI_GROUPS),
    []
  );
  const effectiveEmojiQuery = compact ? debouncedEmojiQuery : emojiQueryInput;
  const visibleEmojiGroups = useMemo(
    () => filterEmojiGroups(POST_EMOJI_GROUPS, effectiveEmojiQuery, emojiCategory),
    [effectiveEmojiQuery, emojiCategory]
  );
  const renderedEmojiGroups = useMemo(() => {
    if (!compact || !effectiveEmojiQuery.trim()) {
      return visibleEmojiGroups;
    }

    return visibleEmojiGroups.map((group) => ({
      ...group,
      emojis: group.emojis.slice(0, MOBILE_EMOJI_SEARCH_LIMIT),
    }));
  }, [compact, effectiveEmojiQuery, visibleEmojiGroups]);
  const isSearchTrimmed =
    compact &&
    effectiveEmojiQuery.trim() &&
    visibleEmojiGroups.some((group) => group.emojis.length > MOBILE_EMOJI_SEARCH_LIMIT);

  useEffect(() => {
    if (!compact) {
      setDebouncedEmojiQuery(emojiQueryInput);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDebouncedEmojiQuery(emojiQueryInput.trim().toLowerCase());
    }, 200);

    return () => window.clearTimeout(timer);
  }, [compact, emojiQueryInput]);

  useEffect(() => {
    if (!open) {
      setEmojiQueryInput("");
      setDebouncedEmojiQuery("");
      setEmojiCategory("popular");
      return;
    }

    const closeOnOutsidePress = (event) => {
      if (anchorRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, setOpen]);

  const handlePick = (emoji) => {
    onPick(emoji);

    // Phone: choose one emoji, then close tray.
    // Desktop: keep tray open for faster multi-emoji posting.
    if (compact) {
      setOpen(false);
    }
  };

  return (
    <div
      ref={anchorRef}
      data-ui="true"
      data-no-realm-swipe
      className={`composer-emoji-anchor ${compact ? "composer-emoji-anchor--compact" : "composer-emoji-anchor--desktop"}`}
    >
      <button
        type="button"
        className={`composer-emoji-trigger ${open ? "is-open" : ""}`}
        aria-label="Choose confession emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? pickerId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Add emoji"
      >
        <span
          style={{
            display: "block",
            transform: compact ? "translateX(0)" : "translateX(0px)",
            lineHeight: 1,
          }}
        >
          😊
        </span>
      </button>

      {open && (
        <div
          id={pickerId}
          data-ui="true"
          data-no-realm-swipe
          data-emoji-picker
          role="dialog"
          aria-label="Choose emoji"
          className={`composer-emoji-popover ${compact ? "composer-emoji-popover--compact" : "composer-emoji-popover--desktop"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
              paddingBottom: "7px",
              borderBottom: "1px solid rgba(170,255,130,0.12)",
            }}
          >
            <strong
              style={{
                color: "rgba(235,255,200,0.9)",
                fontSize: compact ? "9px" : "11px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily: "Georgia, serif",
              }}
            >
              🌿 choose
            </strong>

            <button
              type="button"
              className="composer-emoji-popover-close"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
          </div>

          <div className="cw-emoji-search-wrap" data-no-realm-swipe>
            <span aria-hidden="true" className="cw-emoji-search-icon">⌕</span>
            <input
              type="search"
              value={emojiQueryInput}
              onChange={(event) => setEmojiQueryInput(event.target.value)}
              placeholder="search emojis..."
              className="cw-emoji-search-input"
              aria-label="Search emojis"
            />
          </div>

          <div
            className="cw-emoji-category-tabs"
            data-no-realm-swipe
            data-horizontal-scroll
            role="tablist"
            aria-label="Emoji categories"
          >
            {emojiCategoryLabels.map((label) => (
              <button
                key={label}
                type="button"
                className={`cw-emoji-category-tab ${emojiCategory === label ? "is-active" : ""}`}
                onClick={() => {
                  setEmojiCategory(label);
                  setEmojiQueryInput("");
                  setDebouncedEmojiQuery("");
                }}
                title={label}
              >
                {label}
              </button>
            ))}
          </div>

          {effectiveEmojiQuery.trim() ? (
            <div className="cw-emoji-result-note">Showing fastest matching results. Type more to narrow.</div>
          ) : null}
          {isSearchTrimmed ? (
            <div className="cw-emoji-result-note">
              Showing first {MOBILE_EMOJI_SEARCH_LIMIT} results. Type more to narrow.
            </div>
          ) : null}

          {renderedEmojiGroups.length === 0 ? (
            <div className="cw-emoji-search-empty">no matching emojis</div>
          ) : renderedEmojiGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: compact ? "9px" : "12px" }}>
              <div
                className="composer-emoji-grid"
                data-no-realm-swipe
                style={{
                  marginBottom: "6px",
                  fontSize: "8.5px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(215,255,185,0.58)",
                  fontWeight: 800,
                  fontFamily: "Georgia, serif",
                }}
              >
                {group.label}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: compact
                    ? "repeat(5, 34px)"
                    : "repeat(8, 36px)",
                  gap: compact ? "7px" : "8px",
                  justifyContent: "center",
                  justifyItems: "center",
                }}
              >
                {group.emojis.map((emoji) => (
                  <button
                    key={`${group.label}-${emoji}`}
                    type="button"
                    onClick={() => handlePick(emoji)}
                    style={{
                      width: compact ? "34px" : "36px",
                      height: compact ? "34px" : "36px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: compact ? "12px" : "13px",
                      border: "1px solid rgba(170,255,130,0.16)",
                      background: "rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      fontSize: compact ? "17px" : "18px",
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    <EmojiIcon emoji={emoji} className="cw-noto-emoji--picker" size={compact ? 22 : 23} />
                    <span className="cw-emoji-button-text-fallback" aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfessionFeed({ confessions, onCardClick }) {
  const [offset, setOffset] = useState(0);
  const VISIBLE = 4;
  const total = confessions.length;
  const canUp = offset > 0;
  const canDown = offset + VISIBLE < total;
  const visible = confessions.slice(offset, offset + VISIBLE);

  const ArrowBtn = ({ direction, active, onClick }) => (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "6px 0" }}>
      <button
        onClick={onClick}
        style={{
          background: active
            ? "linear-gradient(180deg, rgba(12,22,14,0.24), rgba(8,14,10,0.14))"
            : "linear-gradient(180deg, rgba(10,18,12,0.16), rgba(7,12,9,0.1))",
          border: `1px solid ${active ? "rgba(170,230,160,0.28)" : "rgba(190,235,190,0.14)"}`,
          backdropFilter: "blur(10px)",
          borderRadius: "4px",
          width: "52px",
          height: "28px",
          cursor: active ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s",
          color: active ? "rgba(220,245,212,0.82)" : "rgba(220,245,212,0.32)",
          fontSize: "14px",
          lineHeight: 1,
          boxShadow: active
            ? "0 3px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(240,255,230,0.04)"
            : "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(240,255,230,0.02)",
        }}
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </div>
  );

  return (
    <div
      data-spirit-blocker="true"
      className="spirit-click-blocker home-side-feed home-side-feed--grove"
      style={{
        position: "absolute",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        width: "320px",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "6px", marginBottom: "30px" }}>
        <ArrowBtn direction="up" active={canUp} onClick={() => canUp && setOffset((o) => Math.max(0, o - 1))} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {visible.map((conf, i) => (
          <ConfessionCard key={conf._id || i} conf={conf} index={i} onClick={() => onCardClick(conf._id)} />
        ))}
        {Array.from({ length: VISIBLE - visible.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: "66px" }} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "6px", marginTop: "8px" }}>
        <ArrowBtn direction="down" active={canDown} onClick={() => canDown && setOffset((o) => Math.min(total - VISIBLE, o + 1))} />
      </div>
    </div>
  );
}

function ConfessionCard({ conf, index, onClick }) {
  const [hovered, setHovered] = useState(false);
  const skewDeg = -5;
  const peekOut = 200 + index * 22;
  const cardWidth = 280 - index * 10;

  return (
    <div
      data-spirit-blocker="true"
      className={`home-side-card home-side-card--grove${hovered ? " is-hovered" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${cardWidth}px`,
        marginLeft: `-${cardWidth - peekOut}px`,
        transform: `skewY(${skewDeg}deg)`,
        transformOrigin: "left center",
        background: hovered
          ? "linear-gradient(180deg, rgba(12, 46, 18, 0.96), rgba(4, 18, 8, 0.94))"
          : "linear-gradient(180deg, rgba(10, 38, 16, 0.94), rgba(3, 14, 7, 0.92))",
        border: "1px solid transparent",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: "3px",
        padding: "11px 15px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        boxShadow: hovered
          ? "0 6px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 3px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.02)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span className="home-side-firefly home-side-firefly--grove home-side-firefly--a" />
      <span className="home-side-firefly home-side-firefly--grove home-side-firefly--b" />
      <span className="home-side-firefly home-side-firefly--grove home-side-firefly--c" />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(130,220,90,0.5), transparent)",
          opacity: hovered ? 1 : 0.35,
          transition: "opacity 0.22s",
        }}
      />

      <p
        style={{
          margin: "0 0 4px",
          fontSize: "8px",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "rgba(130,215,100,0.65)",
          fontFamily: "Georgia, serif",
          textAlign: "right",
        }}
      >
        @{conf.userId?.username || "anon"}
      </p>

      <TranslatableText
        text={conf.message}
        context="confession"
        targetType="confession"
        targetId={conf._id || conf.id}
        compact
        className="home-side-card-translation home-side-card-translation--grove"
        textStyle={{
          margin: 0,
          fontSize: "11.5px",
          color: "rgba(215,255,205,0.85)",
          fontFamily: "Georgia, serif",
          lineHeight: 1.5,
          textAlign: "right",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      />
    </div>
  );
}

function ScorchedFeed({ confessions, onCardClick }) {
  const [offset, setOffset] = useState(0);
  const VISIBLE = 4;
  const total = confessions.length;
  const canUp = offset > 0;
  const canDown = offset + VISIBLE < total;
  const visible = confessions.slice(offset, offset + VISIBLE);

  const ArrowBtn = ({ direction, active, onClick }) => (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "6px 0" }}>
      <button
        onClick={onClick}
        style={{
          background: active
            ? "linear-gradient(180deg, rgba(22,14,12,0.24), rgba(14,10,9,0.14))"
            : "linear-gradient(180deg, rgba(18,11,10,0.16), rgba(12,8,7,0.1))",
          border: `1px solid ${active ? "rgba(236,188,168,0.28)" : "rgba(238,205,190,0.14)"}`,
          backdropFilter: "blur(10px)",
          borderRadius: "4px",
          width: "52px",
          height: "28px",
          cursor: active ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s",
          color: active ? "rgba(255,232,220,0.82)" : "rgba(255,232,220,0.32)",
          fontSize: "14px",
          lineHeight: 1,
          boxShadow: active
            ? "0 3px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,240,230,0.04)"
            : "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,240,230,0.02)",
        }}
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </div>
  );

  return (
    <div
      data-spirit-blocker="true"
      className="spirit-click-blocker home-side-feed home-side-feed--scorched"
      style={{
        position: "absolute",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        width: "320px",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: "6px", marginBottom: "30px" }}>
        <ArrowBtn direction="up" active={canUp} onClick={() => canUp && setOffset((o) => Math.max(0, o - 1))} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {visible.map((conf, i) => (
          <ScorchedCard key={conf._id || i} conf={conf} index={i} onClick={() => onCardClick(conf._id)} />
        ))}
        {Array.from({ length: VISIBLE - visible.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: "66px" }} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: "6px", marginTop: "8px" }}>
        <ArrowBtn direction="down" active={canDown} onClick={() => canDown && setOffset((o) => Math.min(total - VISIBLE, o + 1))} />
      </div>
    </div>
  );
}

function ScorchedCard({ conf, index, onClick }) {
  const [hovered, setHovered] = useState(false);
  const skewDeg = 5;
  const peekOut = 200 + index * 22;
  const cardWidth = 280 - index * 10;

  return (
    <div
      data-spirit-blocker="true"
      className={`home-side-card home-side-card--scorched${hovered ? " is-hovered" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${cardWidth}px`,
        marginRight: `-${cardWidth - peekOut}px`,
        marginLeft: "auto",
        transform: `skewY(${skewDeg}deg)`,
        transformOrigin: "right center",
        background: hovered
          ? "linear-gradient(180deg, rgba(56, 18, 16, 0.96), rgba(20, 7, 7, 0.94))"
          : "linear-gradient(180deg, rgba(46, 15, 14, 0.94), rgba(16, 6, 6, 0.92))",
        border: "1px solid transparent",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: "3px",
        padding: "11px 15px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        boxShadow: hovered
          ? "0 6px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 3px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.02)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span className="home-side-ember home-side-ember--a" />
      <span className="home-side-ember home-side-ember--b" />
      <span className="home-side-ember home-side-ember--c" />
      <p
        style={{
          margin: "0 0 4px",
          fontSize: "8px",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "rgba(220,120,80,0.65)",
          fontFamily: "Georgia, serif",
          textAlign: "left",
        }}
      >
        @{conf.userId?.username || "anon"}
      </p>

      <TranslatableText
        text={conf.message}
        context="confession"
        targetType="confession"
        targetId={conf._id || conf.id}
        compact
        className="home-side-card-translation home-side-card-translation--scorched"
        textStyle={{
          margin: 0,
          fontSize: "11.5px",
          color: "rgba(255,210,190,0.85)",
          fontFamily: "Georgia, serif",
          lineHeight: 1.5,
          textAlign: "left",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      />
    </div>
  );
}

function timeAgo(dateValue) {
  if (!dateValue) return "just now";
  const date = new Date(dateValue);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getAvailablePostThemes(user) {
  const themeIds = new Set(getOwnedPostThemeIds(user));
  const equippedTheme = String(user?.equippedCosmetics?.postTheme || "").trim();

  if (equippedTheme.startsWith("post-theme-")) {
    themeIds.add(equippedTheme);
  }

  return Array.from(themeIds)
    .map((id) => ({
      id,
      meta: getCosmeticMeta(id),
    }))
    .filter((item) => item.meta);
}

function getNextWhisperPrompt(currentPrompt) {
  if (WHISPER_PROMPTS.length <= 1) {
    return WHISPER_PROMPTS[0] || "";
  }

  let nextPrompt = currentPrompt;

  while (nextPrompt === currentPrompt) {
    nextPrompt =
      WHISPER_PROMPTS[Math.floor(Math.random() * WHISPER_PROMPTS.length)];
  }

  return nextPrompt;
}

function buildPollPayload(question, options) {
  const trimmedQuestion = question.trim();
  const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);
  const hasPollContent = Boolean(trimmedQuestion) || trimmedOptions.length > 0;

  if (!hasPollContent) {
    return { poll: null };
  }

  if (!trimmedQuestion) {
    return { error: "Add a poll question or remove the poll." };
  }

  if (trimmedOptions.length < 2 || trimmedOptions.length > 4) {
    return { error: "Polls need between 2 and 4 filled options." };
  }

  return {
    poll: {
      question: trimmedQuestion,
      options: trimmedOptions,
    },
  };
}

function ComposeEnhancements({
  compact = false,
  section = "all",
  selectedMood,
  setSelectedMood,
  contentWarningEnabled,
  setContentWarningEnabled,
  contentWarningCategory,
  setContentWarningCategory,
  contentWarningNote,
  setContentWarningNote,
  contentWarningSensitive,
  setContentWarningSensitive,
  availablePostThemes,
  selectedPostTheme,
  setSelectedPostTheme,
  whisperPrompt,
  onGeneratePrompt,
  onUsePrompt,
  showPollComposer,
  setShowPollComposer,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  onOpenConfession,
}) {
  const showPrompt = section === "all" || section === "prompt";
  const showSettings = section === "all" || section === "settings";
  const sectionTitleStyle = {
    fontSize: compact ? "10px" : "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(226,255,200,0.74)",
    marginBottom: compact ? "8px" : "9px",
  };

  const chipStyle = (active) => ({
    borderRadius: "999px",
    border: `1px solid ${
      active ? "rgba(190,255,130,0.45)" : "rgba(255,255,220,0.12)"
    }`,
    background: active
      ? "rgba(170,255,100,0.16)"
      : "rgba(255,255,220,0.05)",
    color: active ? "rgba(236,255,198,0.94)" : "rgba(255,255,220,0.68)",
    padding: compact ? "6px 10px" : "7px 12px",
    cursor: "pointer",
    fontSize: compact ? "11px" : "12px",
    fontFamily: "Georgia, serif",
  });

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,220,0.14)",
    background: "rgba(255,255,220,0.04)",
    color: "rgba(255,255,220,0.9)",
    padding: compact ? "9px 11px" : "10px 12px",
    fontSize: compact ? "12px" : "13px",
    fontFamily: "Georgia, serif",
    outline: "none",
  };

  const themeSelectStyle = {
    ...inputStyle,
    colorScheme: "dark",
  };

  const themeOptionStyle = {
    backgroundColor: "#0b1d0c",
    color: "#f3f8d9",
  };

  return (
    <div
      className={`confession-composer-options confession-composer-options--${section}`}
      style={{
        marginTop: compact ? "14px" : "16px",
        display: "grid",
        gap: compact ? "13px" : "15px",
      }}
    >
      {showPrompt && (
        <div
          className="confession-composer-prompt-card"
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(170,255,130,0.14)",
            background: "rgba(255,255,255,0.035)",
            padding: compact ? "11px" : "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={sectionTitleStyle}>Whisper Prompt</div>
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,220,0.46)",
                  fontSize: compact ? "11px" : "12px",
                }}
              >
                Need a spark without losing your draft.
              </p>
            </div>

            <button
              type="button"
              onClick={onGeneratePrompt}
              style={chipStyle(Boolean(whisperPrompt))}
            >
              {whisperPrompt ? "Another whisper" : "Need a spark?"}
            </button>
          </div>

          {whisperPrompt && (
            <div
              style={{
                marginTop: "10px",
                padding: compact ? "10px 11px" : "11px 12px",
                borderRadius: "14px",
                border: "1px solid rgba(170,255,130,0.12)",
                background: "rgba(9,28,10,0.52)",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: "rgba(240,255,220,0.88)",
                  fontSize: compact ? "12px" : "13px",
                  lineHeight: 1.55,
                }}
              >
                {whisperPrompt}
              </p>

              <button
                type="button"
                onClick={onUsePrompt}
                style={chipStyle(false)}
              >
                Use as opening line
              </button>
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <>
      <div>
        <div style={sectionTitleStyle}>Mood</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setSelectedMood("")}
            style={chipStyle(!selectedMood)}
          >
            No mood
          </button>

          {CONFESSION_MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setSelectedMood((prev) => (prev === mood ? "" : mood))}
              style={chipStyle(selectedMood === mood)}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <div style={sectionTitleStyle}>Content Warning</div>
          <button
            type="button"
            onClick={() => {
              setContentWarningEnabled((prev) => {
                const next = !prev;
                if (!next) {
                  setContentWarningCategory("");
                  setContentWarningNote("");
                  setContentWarningSensitive(false);
                }
                return next;
              });
            }}
            style={chipStyle(contentWarningEnabled)}
          >
            {contentWarningEnabled ? "Added" : "Add content warning"}
          </button>
        </div>

        {contentWarningEnabled && (
          <div style={{ display: "grid", gap: "8px" }}>
            <select
              value={contentWarningCategory}
              onChange={(e) => setContentWarningCategory(e.target.value)}
              style={themeSelectStyle}
            >
              <option value="" style={themeOptionStyle}>
                Select warning category
              </option>
              {CONTENT_WARNING_CATEGORIES.map((category) => (
                <option key={category} value={category} style={themeOptionStyle}>
                  {category}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={contentWarningNote}
              onChange={(e) => setContentWarningNote(e.target.value.slice(0, 120))}
              placeholder="Optional note (max 120 characters)"
              style={inputStyle}
            />

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "rgba(255,255,220,0.78)",
                fontSize: compact ? "11px" : "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={contentWarningSensitive}
                onChange={(e) => setContentWarningSensitive(e.target.checked)}
              />
              Blur this confession until revealed
            </label>
          </div>
        )}
      </div>

      <div>
        <div style={sectionTitleStyle}>Confession Card Theme</div>

        {availablePostThemes.length > 0 ? (
          <select
            value={selectedPostTheme}
            onChange={(e) => setSelectedPostTheme(e.target.value)}
            style={themeSelectStyle}
          >
            <option value="" style={themeOptionStyle}>
              Forest Default
            </option>
            {availablePostThemes.map((theme) => (
              <option key={theme.id} value={theme.id} style={themeOptionStyle}>
                {theme.meta.icon ? `${theme.meta.icon} ` : ""}
                {theme.meta.name}
              </option>
            ))}
          </select>
        ) : (
          <div
            style={{
              ...inputStyle,
              color: "rgba(255,255,220,0.48)",
            }}
          >
            You do not own any confession card themes yet.
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <div>
            <div style={sectionTitleStyle}>Anonymous Poll</div>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,220,0.46)",
                fontSize: compact ? "11px" : "12px",
              }}
            >
              Optional. Add 2 to 4 answers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showPollComposer) {
                setShowPollComposer(false);
                setPollQuestion("");
                setPollOptions(["", "", "", ""]);
                return;
              }

              setShowPollComposer(true);
            }}
            style={chipStyle(showPollComposer)}
          >
            {showPollComposer ? "Hide poll" : "Add poll"}
          </button>
        </div>

        {showPollComposer && (
          <div style={{ display: "grid", gap: "8px" }}>
            <input
              type="text"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Should I forgive them?"
              style={inputStyle}
            />

            {pollOptions.map((option, index) => (
              <input
                key={`poll-option-${index}`}
                type="text"
                value={option}
                onChange={(e) =>
                  setPollOptions((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? e.target.value : item
                    )
                  )
                }
                placeholder={`Option ${index + 1}${index < 2 ? " *" : ""}`}
                style={inputStyle}
              />
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function MobileHomePage({
  user,
  freshPosts,
  currentPage,
  hasMorePosts,
  loadingMorePosts,
  onPageChange,
  navigate,
  showCompose,
  setShowCompose,
  message,
  setMessage,
  imagePreview,
  removeSelectedImage,
  loading,
  handleImageChange,
  handleSubmit,
  showPostEmojiPicker,
  setShowPostEmojiPicker,
  postInputRef,
  insertPostEmoji,
  selectedMood,
  setSelectedMood,
  contentWarningEnabled,
  setContentWarningEnabled,
  contentWarningCategory,
  setContentWarningCategory,
  contentWarningNote,
  setContentWarningNote,
  contentWarningSensitive,
  setContentWarningSensitive,
  availablePostThemes,
  selectedPostTheme,
  setSelectedPostTheme,
  whisperPrompt,
  onGeneratePrompt,
  onUsePrompt,
  showPollComposer,
  setShowPollComposer,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  onOpenConfession,
}) {
  const visiblePosts = freshPosts;
  const selectedImagePreviews = Array.isArray(imagePreview)
    ? imagePreview
    : imagePreview
    ? [imagePreview]
    : [];

  const MobileCard = ({ conf }) => {
    const waterCount = conf.wateredBy?.length || 0;
    const burnCount = conf.burnedBy?.length || 0;
    const username = conf.userId?.username || "anon";
    const equipped = getDisplayCosmetics(conf.userId);
    const frameId =
      equipped.frame ||
      conf.userId?.equippedFrame ||
      conf.userId?.frame ||
      "";
    const postThemeId = getConfessionThemeId(conf, equipped, conf.userId);
    const postThemeClass = getCosmeticAnimationClass(postThemeId);
    const postThemeStyle = getPostThemeStyle(postThemeId, "budding");
    const moodStyle = getMoodChipStyle(conf.mood);
    const openCard = () => navigate(`/confession/${conf._id}`);
    const handleCardKeyDown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard();
      }
    };

    return (
      <article
        role="button"
        tabIndex={0}
        onClick={openCard}
        onKeyDown={handleCardKeyDown}
        className={["mobile-home-card", postThemeClass].filter(Boolean).join(" ")}
        style={postThemeStyle}
      >
        <PostThemeFxLayers themeId={postThemeId} />

        <div className="mobile-home-card-top">
          <FramedAvatar
            src={conf.userId?.profilePicture}
            username={username}
            frameId={frameId}
            effectId={equipped.visualEffect}
            size={40}
            context="post"
            className="mobile-home-avatar-wrap"
            placeholder={username[0]?.toUpperCase() || "A"}
          />

          <div className="mobile-home-card-meta">
            <span className="mobile-home-card-user">
              <strong>@{username}</strong>
              <AnimatedBadge badgeId={equipped.badge} size="sm" />
            </span>
            <span className="mobile-home-card-time">
              {timeAgo(conf.createdAt)} · 🌱 budding
            </span>
            {moodStyle && (
              <span className="mobile-home-card-mood" style={moodStyle}>
                {conf.mood}
              </span>
            )}
          </div>

          <span className="mobile-home-card-menu">⋮</span>
        </div>

        <TranslatableText
          text={conf.message}
          context="confession"
          targetType="confession"
          targetId={conf._id || conf.id}
          compact
          textClassName="mobile-home-card-message"
          className="mobile-home-card-translation"
        />

        <div className="mobile-home-card-actions">
          <span>🌱 {waterCount}</span>
          <span>🔥 {burnCount}</span>
          <span className="mobile-home-report">Report</span>
        </div>
      </article>
    );
  };

  return (
    <main className="mobile-home-shell" style={{ position: "relative" }}>
      <HomeBackgroundVideo />

      <div className="mobile-home-top-tools" data-ui="true">
        <DailyQuestDropdown variant="navbar" />
      </div>

      <section className="mobile-home-event-strip">
        <ForestEventBanner compact />
      </section>

      <section className="mobile-home-hero-wrap">
        <img
          src="/assets/mobile/mobile-hero-banner.png"
          alt="Confession Wall anonymous confession community"
          className="mobile-home-hero-img"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </section>

      <section className="mobile-home-seo-intro" aria-label="About Confession Wall">
        <h1>Share Anonymous Confessions in a No-Judgment Community</h1>
        <p>
          Confession Wall is a place to share anonymous confessions, vent real feelings,
          and read honest stories from real people. Post a secret, react to confessions,
          explore trending stories, or wander through Grove, Budding, and Scorched realms.
        </p>
        <div className="mobile-home-seo-links" aria-label="Explore Confession Wall">
          <button type="button" onClick={() => navigate("/trending")}>Trending</button>
          <button type="button" onClick={() => navigate("/grove")}>Grove</button>
          <button type="button" onClick={() => navigate("/budding")}>Budding</button>
          <button type="button" onClick={() => navigate("/scorched")}>Scorched</button>
          <button type="button" onClick={() => navigate("/guidelines")}>Guidelines</button>
        </div>
      </section>

      <section className="mobile-home-feed-head">
        <div>
          <p>🌿 Budding Confessions</p>
          <span>Fresh thoughts from the community</span>
        </div>
        <button type="button" onClick={() => navigate("/budding")}>View all ›</button>
      </section>

      <section className="mobile-home-feed">
        {visiblePosts.length === 0 ? (
          <div className="mobile-home-empty">
            <strong>No budding confessions yet.</strong>
            <span>Plant the first one and let it bloom.</span>
          </div>
        ) : (
          visiblePosts.map((conf) => <MobileCard key={conf._id} conf={conf} />)
        )}
      </section>

      <nav className="mobile-home-pagination" aria-label="Budding confession pages">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={loadingMorePosts || currentPage <= 1}
        >
          Previous
        </button>
        <span>{loadingMorePosts ? "Loading..." : `Page ${currentPage}`}</span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={loadingMorePosts || !hasMorePosts}
        >
          Next
        </button>
      </nav>

      <MobileBottomNav onConfess={onOpenConfession} />

      {showCompose && (
        <div
          data-ui="true"
          data-no-realm-swipe
          data-compose-modal
          data-no-realm-swipe-active="true"
          className="mobile-compose-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setShowPostEmojiPicker(false);
              setShowCompose(false);
            }
          }}
        >
          <div className="mobile-compose-card" data-no-realm-swipe data-compose-modal>
            <button
              type="button"
              className="mobile-compose-close"
              onClick={() => {
                setShowPostEmojiPicker(false);
                setShowCompose(false);
              }}
              aria-label="Close compose"
            >
              {"\u00D7"}
            </button>
            <p className="mobile-compose-kicker">{"\u2726"} plant a confession</p>



            <h2>What do you need to confess?</h2>
            <textarea
  ref={postInputRef}
  placeholder="write it here..."
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  autoFocus
/>

            <ComposeEnhancements
              compact
              selectedMood={selectedMood}
              setSelectedMood={setSelectedMood}
              contentWarningEnabled={contentWarningEnabled}
              setContentWarningEnabled={setContentWarningEnabled}
              contentWarningCategory={contentWarningCategory}
              setContentWarningCategory={setContentWarningCategory}
              contentWarningNote={contentWarningNote}
              setContentWarningNote={setContentWarningNote}
              contentWarningSensitive={contentWarningSensitive}
              setContentWarningSensitive={setContentWarningSensitive}
              availablePostThemes={availablePostThemes}
              selectedPostTheme={selectedPostTheme}
              setSelectedPostTheme={setSelectedPostTheme}
              whisperPrompt={whisperPrompt}
              onGeneratePrompt={onGeneratePrompt}
              onUsePrompt={onUsePrompt}
              showPollComposer={showPollComposer}
              setShowPollComposer={setShowPollComposer}
              pollQuestion={pollQuestion}
              setPollQuestion={setPollQuestion}
              pollOptions={pollOptions}
              setPollOptions={setPollOptions}
            />

            {selectedImagePreviews.length > 0 && (
              <div className="mobile-compose-preview mobile-compose-preview--multi">
                <div className="mobile-compose-preview-strip">
                  {selectedImagePreviews.map((src, index) => (
                    <div className="mobile-compose-preview-item" key={`${src}-${index}`}>
                      <img src={src} alt={`Selected confession attachment ${index + 1}`} decoding="async" />
                      <button
                        type="button"
                        aria-label={`Remove attached image ${index + 1}`}
                        onClick={() => removeSelectedImage(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mobile-compose-actions" style={{ overflow: "visible" }}>
  <EmojiPickerButton
    open={showPostEmojiPicker}
    setOpen={setShowPostEmojiPicker}
    onPick={insertPostEmoji}
    compact
  />

  <label>
    ⌘ image
                <input type="file" accept="image/*" multiple onChange={handleImageChange} />
              </label>
              <button type="button" onClick={handleSubmit} disabled={loading || !message.trim()}>
                {loading ? "planting…" : "bloom →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const SPIRIT_ALPHA_THRESHOLD = 20;

function buildSpiritAlphaMask(img) {
  if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  return {
    width: canvas.width,
    height: canvas.height,
    data,
  };
}

function isOpaqueMaskPixel(mask, img, clientX, clientY) {
  if (!mask || !img) return false;

  const rect = img.getBoundingClientRect();
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return false;
  }

  if (!rect.width || !rect.height) return false;

  const x = Math.floor(((clientX - rect.left) / rect.width) * mask.width);
  const y = Math.floor(((clientY - rect.top) / rect.height) * mask.height);

  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;

  const alphaIndex = (y * mask.width + x) * 4 + 3;
  return mask.data[alphaIndex] > SPIRIT_ALPHA_THRESHOLD;
}

function shouldBlockSpiritInteraction(target) {
  if (typeof document === "undefined") return false;
  if (document.body.classList.contains("cw-guidebook-open")) return true;
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      [
        ".cw-guidebook-backdrop",
        ".cw-guidebook",
        ".cw-guidebook-launcher",
        ".confession-composer-backdrop",
        ".mobile-compose-backdrop",
        ".mobile-compose-card",
        ".cw-settings-modal-backdrop",
        ".cw-settings-modal-panel",
        "[data-spirit-blocker=\"true\"]",
        ".spirit-click-blocker",
        ".home-side-card",
        ".home-desktop-guidebook-button",
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "[data-ui=\"true\"]",
      ].join(",")
    )
  );
}

function SpiritNavigation({ onLeftClick, onRightClick }) {
  const [leftHover, setLeftHover] = useState(false);
  const [rightHover, setRightHover] = useState(false);

  const leftImgRef = useRef(null);
  const rightImgRef = useRef(null);
  const leftMaskRef = useRef(null);
  const rightMaskRef = useRef(null);
  const rafMoveRef = useRef(0);
  const lastPointerRef = useRef({ x: 0, y: 0, target: null });

  useEffect(() => {
    const leftImg = leftImgRef.current;
    const rightImg = rightImgRef.current;
    if (!leftImg || !rightImg) return undefined;

    const updateLeftMask = () => {
      leftMaskRef.current = buildSpiritAlphaMask(leftImg);
    };
    const updateRightMask = () => {
      rightMaskRef.current = buildSpiritAlphaMask(rightImg);
    };

    if (leftImg.complete) updateLeftMask();
    if (rightImg.complete) updateRightMask();

    leftImg.addEventListener("load", updateLeftMask);
    rightImg.addEventListener("load", updateRightMask);

    return () => {
      leftImg.removeEventListener("load", updateLeftMask);
      rightImg.removeEventListener("load", updateRightMask);
    };
  }, []);

  useEffect(() => {
    const flushHoverMove = () => {
      rafMoveRef.current = 0;
      const { x, y, target } = lastPointerRef.current;

      if (shouldBlockSpiritInteraction(target)) {
        setLeftHover(false);
        setRightHover(false);
        return;
      }

      setLeftHover(
        isOpaqueMaskPixel(leftMaskRef.current, leftImgRef.current, x, y)
      );
      setRightHover(
        isOpaqueMaskPixel(rightMaskRef.current, rightImgRef.current, x, y)
      );
    };

    const handleSpiritClick = (e) => {
      if (shouldBlockSpiritInteraction(e.target)) return;

      if (
        isOpaqueMaskPixel(
          leftMaskRef.current,
          leftImgRef.current,
          e.clientX,
          e.clientY
        )
      ) {
        // Keep spirit-layer clicks from also hitting underlying page handlers.
        e.stopPropagation();
        onLeftClick();
        return;
      }

      if (
        isOpaqueMaskPixel(
          rightMaskRef.current,
          rightImgRef.current,
          e.clientX,
          e.clientY
        )
      ) {
        e.stopPropagation();
        onRightClick();
      }
    };

    const handleMouseMove = (e) => {
      lastPointerRef.current = {
        x: e.clientX,
        y: e.clientY,
        target: e.target,
      };

      if (!rafMoveRef.current) {
        rafMoveRef.current = window.requestAnimationFrame(flushHoverMove);
      }
    };

    // Use click (capture) instead of pointerdown so we don't suppress
    // the normal click behavior on the rest of the page.
    window.addEventListener("click", handleSpiritClick, true);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      if (rafMoveRef.current) {
        window.cancelAnimationFrame(rafMoveRef.current);
        rafMoveRef.current = 0;
      }
      window.removeEventListener("click", handleSpiritClick, true);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [onLeftClick, onRightClick]);

  return (
    <>
      {/* LEFT — KRISHNA */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "80px",
          height: "calc(100vh - 80px)",
          width: "30vw",
          zIndex: 29,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          pointerEvents: "none",
        }}
      >
        <img
          ref={leftImgRef}
          src="/krishna.webp"
          alt="Enter Grove"
          decoding="async"
          onMouseEnter={() => setLeftHover(true)}
          onMouseLeave={() => setLeftHover(false)}
          style={{
            maxHeight: "130%",
            maxWidth: "45vw",
            objectFit: "contain",
            opacity: 0.95,
            pointerEvents: "none",
            transform: leftHover
              ? "translateX(20%) translateY(8%) scale(1.48)"
              : "translateX(17%) translateY(6%) scale(1.43)",
            filter: leftHover
              ? "drop-shadow(0 0 25px rgba(120,255,180,0.7))"
              : "drop-shadow(0 0 10px rgba(120,255,180,0.25))",
            transition: "all 0.3s ease",
          }}
        />
      </div>

      {/* RIGHT — DEMON */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "80px",
          height: "calc(100vh - 80px)",
          width: "30vw",
          zIndex: 29,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <img
          ref={rightImgRef}
          src="/Demon.webp"
          alt="Enter Scorched Lands"
          decoding="async"
          onMouseEnter={() => setRightHover(true)}
          onMouseLeave={() => setRightHover(false)}
          style={{
            maxHeight: "130%",
            maxWidth: "45vw",
            objectFit: "contain",
            opacity: 0.95,
            pointerEvents: "none",
            transform: rightHover
              ? "translateX(-20%) translateY(8%) scale(1.48)"
              : "translateX(-17%) translateY(6%) scale(1.43)",
            filter: rightHover
              ? "drop-shadow(0 0 25px rgba(255,80,60,0.7))"
              : "drop-shadow(0 0 10px rgba(255,80,60,0.25))",
            transition: "all 0.3s ease",
          }}
        />
      </div>
    </>
  );
}
export default function Home() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [confessions, setConfessions] = useState([]);
  const grovePosts = confessions.filter(
  (c) => (c.wateredBy?.length || 0) > (c.burnedBy?.length || 0)
);

const scorchedPosts = confessions.filter(
  (c) => (c.burnedBy?.length || 0) > (c.wateredBy?.length || 0)
);
const NEW_WINDOW = 1000 * 60 * 60 * 24 * 7; // 7 days
const CW_GUIDEBOOK_VERSION = "1.0.0";

const freshPosts = confessions
  .filter((c) => {
    const created = new Date(c.createdAt).getTime();
    const watered = c.wateredBy?.length || 0;
    const burned = c.burnedBy?.length || 0;

    return Date.now() - created < NEW_WINDOW && watered === burned;
  })
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const [showCompose, setShowCompose] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
const [tutorialStep, setTutorialStep] = useState(0);
  const [message, setMessage] = useState("");
const [showPostEmojiPicker, setShowPostEmojiPicker] = useState(false);
const postInputRef = useRef(null);
const [image, setImage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);
  const [selectedMood, setSelectedMood] = useState("");
  const [contentWarningEnabled, setContentWarningEnabled] = useState(false);
  const [contentWarningCategory, setContentWarningCategory] = useState("");
  const [contentWarningNote, setContentWarningNote] = useState("");
  const [contentWarningSensitive, setContentWarningSensitive] = useState(false);
  const [selectedPostTheme, setSelectedPostTheme] = useState("");
  const [whisperPrompt, setWhisperPrompt] = useState("");
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 720);
  const [mobileFeedPage, setMobileFeedPage] = useState(1);
  const [mobileFeedHasMore, setMobileFeedHasMore] = useState(false);
  const [mobileFeedLoadingMore, setMobileFeedLoadingMore] = useState(false);
  const availablePostThemes = useMemo(() => getAvailablePostThemes(user), [user]);
  const isLoggedIn = Boolean(user?._id && token);
  const selectedImageFiles = Array.isArray(image) ? image : image ? [image] : [];
  const selectedImagePreviews = Array.isArray(imagePreview)
    ? imagePreview
    : imagePreview
    ? [imagePreview]
    : [];

  const promptLogin = useCallback(() => {
    setShowLoginPrompt(true);
    window.cwToast?.(LOGIN_PROMPT_MESSAGE, "warning");
  }, []);

  useEffect(() => {
    const updateMode = () => setIsMobile(window.innerWidth <= 720);
    updateMode();
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, []);

  useEffect(() => {
    document.body.classList.add("mobile-home-page");
    return () => {
      document.body.classList.remove("mobile-home-page");
    };
  }, []);

  useEffect(() => {
    if (!showCompose) return undefined;

    document.body.classList.add("realm-swipe-disabled");

    return () => {
      document.body.classList.remove("realm-swipe-disabled");
    };
  }, [showCompose]);

const openGuidebookAfterTutorial = useCallback((mode = "auto") => {
  if (typeof window === "undefined" || window.innerWidth < 920) return;

  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("cw:open-guidebook", {
        detail: { mode },
      })
    );
  }, mode === "auto" ? 450 : 150);
}, []);

const openDesktopGuidebook = useCallback((event) => {
  event?.stopPropagation();

  window.dispatchEvent(
    new CustomEvent("cw:open-guidebook", {
      detail: { mode: "manual", source: "desktop-home" },
    })
  );
}, []);

useEffect(() => {
  const seenTutorial = localStorage.getItem("seenHomeTutorial");

  if (!seenTutorial) {
    setShowTutorial(true);
    return;
  }

  try {
    if (localStorage.getItem("cwGuidebookSeenVersion") !== CW_GUIDEBOOK_VERSION) {
      openGuidebookAfterTutorial("auto");
    }
  } catch {
    openGuidebookAfterTutorial("auto");
  }
}, [openGuidebookAfterTutorial]);

useEffect(() => {
  const params = new URLSearchParams(location.search);

  if (params.get("compose") === "true") {
    if (isLoggedIn) {
      setShowCompose(true);
    } else {
      promptLogin();
    }
    navigate("/", { replace: true });
  }
}, [isLoggedIn, location.search, navigate, promptLogin]);
  useEffect(() => {
    let ignore = false;

    const loadConfessions = async () => {
      try {
        const url = isMobile
          ? `${API_URL}?page=1&limit=${MOBILE_HOME_PAGE_LIMIT}`
          : API_URL;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || data?.error || "Could not load confessions.");
        }

        const normalized = normalizeConfessionResponse(data);

        if (ignore) return;

        setConfessions(normalized.items);
        setMobileFeedPage(normalized.page || 1);
        setMobileFeedHasMore(isMobile ? normalized.hasMore : false);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setMobileFeedHasMore(false);
        }
      }
    };

    loadConfessions();

    return () => {
      ignore = true;
    };
  }, [isMobile]);

  useEffect(() => {
    const equippedTheme = String(user?.equippedCosmetics?.postTheme || "").trim();

    if (!availablePostThemes.length) {
      if (selectedPostTheme) {
        setSelectedPostTheme("");
      }
      return;
    }

    const currentThemeIsAvailable = availablePostThemes.some(
      (theme) => theme.id === selectedPostTheme
    );

    if (currentThemeIsAvailable) {
      return;
    }

    const nextTheme = availablePostThemes.some((theme) => theme.id === equippedTheme)
      ? equippedTheme
      : "";

    setSelectedPostTheme(nextTheme);
  }, [availablePostThemes, selectedPostTheme, user?.equippedCosmetics?.postTheme]);

  const insertPostEmoji = (emoji) => {
  const input = postInputRef.current;

  if (!input) {
    setMessage((prev) => `${prev}${emoji}`);
    return;
  }

  const start = input.selectionStart ?? message.length;
  const end = input.selectionEnd ?? message.length;

  setMessage((prev) => {
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
  const handleGeneratePrompt = () => {
    setWhisperPrompt((current) => getNextWhisperPrompt(current));
  };

  const handleUsePrompt = () => {
    if (!whisperPrompt) return;

    setMessage((prev) => {
      if (!prev.trim()) return whisperPrompt;
      if (prev.includes(whisperPrompt)) return prev;
      return `${whisperPrompt}\n\n${prev}`;
    });

    window.setTimeout(() => {
      postInputRef.current?.focus();
    }, 0);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_CONFESSION_IMAGES);

    setImage(files);
    setImagePreview(files.map((file) => URL.createObjectURL(file)));

    if ((e.target.files?.length || 0) > MAX_CONFESSION_IMAGES) {
      window.cwToast?.(`You can attach up to ${MAX_CONFESSION_IMAGES} images.`, "warning");
    }

    e.target.value = "";
  };

  const removeSelectedImage = (indexToRemove) => {
    setImage((prev) => {
      const files = Array.isArray(prev) ? prev : prev ? [prev] : [];
      return files.filter((_, index) => index !== indexToRemove);
    });
    setImagePreview((prev) => {
      const previews = Array.isArray(prev) ? prev : prev ? [prev] : [];
      return previews.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleOpenConfession = () => {
    if (!isLoggedIn) {
      promptLogin();
      return;
    }

    setShowPostEmojiPicker(false);
    setShowCompose((prev) => !prev);
  };

  const handleMobilePageChange = async (targetPage) => {
    const nextPage = Math.max(1, Number(targetPage || 1));
    if (
      mobileFeedLoadingMore ||
      nextPage === mobileFeedPage ||
      (nextPage > mobileFeedPage && !mobileFeedHasMore)
    ) {
      return;
    }

    setMobileFeedLoadingMore(true);

    try {
      const res = await fetch(
        `${API_URL}?page=${nextPage}&limit=${MOBILE_HOME_PAGE_LIMIT}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Could not load more confessions.");
      }

      const normalized = normalizeConfessionResponse(data);

      setConfessions(normalized.items);
      setMobileFeedPage(normalized.page || nextPage);
      setMobileFeedHasMore(normalized.hasMore);
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not load confessions.", "error");
    } finally {
      setMobileFeedLoadingMore(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;

    if (!isLoggedIn) {
      promptLogin();
      return;
    }

    const { poll, error: pollError } = buildPollPayload(
      pollQuestion,
      pollOptions
    );

    if (pollError) {
      window.cwToast?.(pollError, "warning") || alert(pollError);
      return;
    }

    if (contentWarningEnabled && !contentWarningCategory) {
      window.cwToast?.("Please choose a content warning category.", "warning") ||
        alert("Please choose a content warning category.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", message);
      selectedImageFiles.forEach((file) => {
        formData.append("images", file);
      });
      if (selectedMood) formData.append("mood", selectedMood);
      if (selectedPostTheme) formData.append("postTheme", selectedPostTheme);
      if (poll) formData.append("poll", JSON.stringify(poll));
      formData.append("contentWarningEnabled", String(contentWarningEnabled));
      formData.append("contentWarningCategory", contentWarningCategory);
      formData.append("contentWarningNote", contentWarningNote);
      formData.append("contentWarningSensitive", String(contentWarningSensitive));

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const newConfession = await res.json();

      if (!res.ok) {
        window.cwToast?.(newConfession.message || newConfession.error || "Could not post.", "error") || alert(newConfession.message || newConfession.error || "Could not post.");
        setLoading(false);
        return;
      }

      if (newConfession.seedReward?.awarded) {
        window.cwToast?.(newConfession.seedReward.message, "success");
        refreshUser?.();
      }

      const confessionWithUser = {
        ...newConfession,
        userId:
          newConfession.userId && typeof newConfession.userId === "object"
            ? newConfession.userId
            : {
                _id: user._id,
                username: user.username,
                profilePicture: user.profilePicture,
                equippedCosmetics: user.equippedCosmetics || {},
              },
      };
      const newConfessionId =
        newConfession?._id ||
        newConfession?.confession?._id ||
        newConfession?.data?._id ||
        confessionWithUser?._id;

      setConfessions((prev) => [confessionWithUser, ...prev]);
      setMessage("");
      setImage([]);
      setImagePreview([]);
      setSelectedMood("");
      setContentWarningEnabled(false);
      setContentWarningCategory("");
      setContentWarningNote("");
      setContentWarningSensitive(false);
      setWhisperPrompt("");
      setShowPollComposer(false);
      setPollQuestion("");
      setPollOptions(["", "", "", ""]);
      setSelectedPostTheme(
        availablePostThemes.some(
          (theme) => theme.id === user?.equippedCosmetics?.postTheme
        )
          ? user.equippedCosmetics.postTheme
          : ""
      );
      setShowCompose(false);
      setShowPostEmojiPicker(false);
      navigate(newConfessionId ? `/budding?post=${newConfessionId}` : "/budding");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not post — is the backend running?", "error") || alert("Could not post — is the backend running?");
    }

    setLoading(false);
  };

  if (isMobile) {
    return (
      <>
        <MobileHomePage
          user={user}
          freshPosts={freshPosts}
          currentPage={mobileFeedPage}
          hasMorePosts={mobileFeedHasMore}
          loadingMorePosts={mobileFeedLoadingMore}
          onPageChange={handleMobilePageChange}
          navigate={navigate}
          showCompose={showCompose}
          setShowCompose={setShowCompose}
  message={message}
  setMessage={setMessage}
  imagePreview={imagePreview}
  removeSelectedImage={removeSelectedImage}
  loading={loading}
  handleImageChange={handleImageChange}
  handleSubmit={handleSubmit}
  showPostEmojiPicker={showPostEmojiPicker}
  setShowPostEmojiPicker={setShowPostEmojiPicker}
  postInputRef={postInputRef}
  insertPostEmoji={insertPostEmoji}
  selectedMood={selectedMood}
  setSelectedMood={setSelectedMood}
  contentWarningEnabled={contentWarningEnabled}
  setContentWarningEnabled={setContentWarningEnabled}
  contentWarningCategory={contentWarningCategory}
  setContentWarningCategory={setContentWarningCategory}
  contentWarningNote={contentWarningNote}
  setContentWarningNote={setContentWarningNote}
  contentWarningSensitive={contentWarningSensitive}
  setContentWarningSensitive={setContentWarningSensitive}
  availablePostThemes={availablePostThemes}
  selectedPostTheme={selectedPostTheme}
  setSelectedPostTheme={setSelectedPostTheme}
  whisperPrompt={whisperPrompt}
  onGeneratePrompt={handleGeneratePrompt}
  onUsePrompt={handleUsePrompt}
  showPollComposer={showPollComposer}
  setShowPollComposer={setShowPollComposer}
  pollQuestion={pollQuestion}
  setPollQuestion={setPollQuestion}
  pollOptions={pollOptions}
  setPollOptions={setPollOptions}
  onOpenConfession={handleOpenConfession}
/>
        {showLoginPrompt && (
          <GuestLoginPrompt
            onClose={() => setShowLoginPrompt(false)}
            onLogin={() => navigate("/login")}
            onRegister={() => navigate("/register")}
          />
        )}
      </>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", background: "transparent" }}>
      <HomeBackgroundVideo />
      <SplitBouquetHero
        posts={confessions}
        onHandClick={handleOpenConfession}
      />
<div
  data-ui="true"
  className="home-top-action-rail"
>
  <div className="home-confess-button-lift">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      handleOpenConfession();
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px) scale(1.035)";
      e.currentTarget.style.boxShadow =
        "0 0 28px rgba(173,255,109,0.34), 0 14px 36px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,220,0.18)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0) scale(1)";
      e.currentTarget.style.boxShadow =
        "0 0 18px rgba(126,255,87,0.16), 0 10px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,220,0.10)";
    }}
    style={{
      position: "relative",
      minWidth: "250px",
      height: "38px",
      padding: "0 34px",
      borderRadius: "0 0 20px 20px",
      border: "1px solid rgba(176,255,120,0.26)",
      borderTop: "none",
      background:
        "linear-gradient(180deg, rgba(12,44,16,0.94), rgba(5,20,8,0.90))",
      color: "rgba(236,255,198,0.94)",
      cursor: "pointer",
      fontFamily: "Georgia, serif",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      fontWeight: 900,
      boxShadow:
        "0 0 18px rgba(126,255,87,0.16), 0 10px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,220,0.10)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      transition: "transform 0.22s ease, box-shadow 0.22s ease",
      overflow: "hidden",
    }}
  >
    <span
      style={{
        position: "absolute",
        left: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: "17px",
        opacity: 0.9,
      }}
    >
      🌿
    </span>

    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        fontSize: "13px",
        lineHeight: 1,
      }}
    >
      <span style={{ opacity: 0.78 }}>✦</span>
      Confess
      <span style={{ opacity: 0.78 }}>✦</span>
    </span>

    <span
      style={{
        display: "block",
        marginTop: "4px",
        fontSize: "8px",
        letterSpacing: "0.14em",
        textTransform: "lowercase",
        fontWeight: 600,
        color: "rgba(205,255,165,0.56)",
      }}
    >
      plant a secret
    </span>

    <span
      style={{
        position: "absolute",
        right: "14px",
        top: "50%",
        transform: "translateY(-50%) scaleX(-1)",
        fontSize: "17px",
        opacity: 0.9,
      }}
    >
      🌿
    </span>

    <span
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "1px",
        background:
          "linear-gradient(90deg, transparent, rgba(210,255,145,0.65), transparent)",
      }}
    />
  </button>
  </div>

  <DailyQuestDropdown variant="home" />
</div>

      <div
        data-ui="true"
        style={{
          position: "absolute",
          top: "4px",
          left: "12px",
          width: "min(270px, calc(100vw - 64px))",
          zIndex: 90,
          pointerEvents: "none",
          transform: "scaleX(1.16) scaleY(0.9)",
          transformOrigin: "top left",
        }}
      >
        <ForestEventBanner compact />
      </div>

      <SpiritNavigation
        onLeftClick={() => navigate("/grove")}
        onRightClick={() => navigate("/scorched")}
      />

      <button
        type="button"
        data-ui="true"
        data-spirit-blocker="true"
        className="home-desktop-guidebook-button"
        onClick={openDesktopGuidebook}
        aria-label="Open the Confession Wall Guidebook"
        title="Open Guidebook"
      >
        <span className="home-desktop-guidebook-icon" aria-hidden="true">📜</span>
        <span>Guidebook</span>
      </button>

      {confessions.length > 0 && (
        <ConfessionFeed
          confessions={grovePosts}
          onCardClick={(id) => navigate(`/grove?post=${id}`)}
        />
      )}

      {scorchedPosts.length > 0 && (
        <ScorchedFeed
          confessions={scorchedPosts}
          onCardClick={(id) => navigate(`/scorched?post=${id}`)}
        />
      )}

      {showCompose && (
  <div
    data-ui="true"   // ✅ ADD THIS LINE
    data-no-realm-swipe
    data-compose-modal
    data-no-realm-swipe-active="true"
    className="confession-composer-backdrop"
    onClick={(e) => {
           e.stopPropagation();  
            if (e.target === e.currentTarget) {
              setShowPostEmojiPicker(false);
              setShowCompose(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(3,10,2,0.80)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="confession-composer-shell"
            data-no-realm-swipe
            data-compose-modal
            style={{
              background: "rgba(8,22,6,0.97)",
              border: "1px solid rgba(255,238,136,0.2)",
              borderRadius: "24px",
              padding: "22px 20px",
              width: "min(400px, 92vw)",
              maxHeight: "84vh",
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
              boxShadow: "0 0 60px rgba(255,238,136,0.08), 0 24px 80px rgba(0,0,0,0.8)",
              fontFamily: "Georgia, serif",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(200,255,150,0.28) transparent",
            }}
          >
            <button
              type="button"
              className="confession-composer-close"
              aria-label="Close confession composer"
  onClick={(e) => {
    e.stopPropagation();   // ✅ IMPORTANT
    setShowPostEmojiPicker(false);
    setShowCompose(false);
  }}
              style={{
                position: "absolute",
                top: "16px",
                right: "18px",
                width: "40px",
                height: "40px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,220,0.055)",
                border: "1px solid rgba(255,255,220,0.12)",
                borderRadius: "999px",
                color: "rgba(255,255,220,0.58)",
                fontSize: "24px",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
              }}
            >
              &times;
            </button>

            <div className="confession-composer-header" style={{ marginBottom: "20px" }}>
              <p style={{ color: "rgba(255,238,136,0.9)", fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                ✦ plant a confession
              </p>
              <p style={{ color: "rgba(255,255,220,0.35)", fontSize: "11px", margin: "6px 0 0", letterSpacing: "0.05em" }}>
                anonymous · it blooms with the others
              </p>
            </div>

            <div className="confession-composer-body">
              <div className="confession-composer-left">
                <div className={`confession-composer-writing-row ${selectedImagePreviews.length > 0 ? "has-image" : "no-image"}`}>
                  <div className="confession-composer-textarea-wrap">
            <textarea
  className="confession-composer-textarea"
  ref={postInputRef}
  placeholder="what do you need to confess?"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  autoFocus
              style={{
                width: "100%",
                height: "102px",
                background: "rgba(255,255,220,0.04)",
                border: "1px solid rgba(255,255,220,0.15)",
                borderRadius: "14px",
                padding: "14px",
                color: "rgba(255,255,220,0.92)",
                fontSize: "14px",
                resize: "none",
                outline: "none",
                fontFamily: "Georgia, serif",
                lineHeight: 1.7,
                boxSizing: "border-box",
              }}
            />
                  </div>

            {selectedImagePreviews.length > 0 && (
              <div className="confession-composer-preview confession-composer-preview--desktop">
                <div className="confession-composer-preview-strip">
                  {selectedImagePreviews.map((src, index) => (
                    <div className="confession-composer-preview-item" key={`${src}-${index}`}>
                      <img
  src={src}
  alt={`Selected confession attachment ${index + 1}`}
  decoding="async"
/>
                      <button
                        type="button"
                        className="confession-composer-preview-remove"
                        aria-label={`Remove attached image ${index + 1}`}
                        onClick={() => removeSelectedImage(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                {selectedImagePreviews.length > 1 && (
                  <div className="confession-composer-preview-count">
                    {selectedImagePreviews.length} images
                  </div>
                )}
              </div>
            )}
                </div>

            <ComposeEnhancements
              section="prompt"
              selectedMood={selectedMood}
              setSelectedMood={setSelectedMood}
              contentWarningEnabled={contentWarningEnabled}
              setContentWarningEnabled={setContentWarningEnabled}
              contentWarningCategory={contentWarningCategory}
              setContentWarningCategory={setContentWarningCategory}
              contentWarningNote={contentWarningNote}
              setContentWarningNote={setContentWarningNote}
              contentWarningSensitive={contentWarningSensitive}
              setContentWarningSensitive={setContentWarningSensitive}
              availablePostThemes={availablePostThemes}
              selectedPostTheme={selectedPostTheme}
              setSelectedPostTheme={setSelectedPostTheme}
              whisperPrompt={whisperPrompt}
              onGeneratePrompt={handleGeneratePrompt}
              onUsePrompt={handleUsePrompt}
              showPollComposer={showPollComposer}
              setShowPollComposer={setShowPollComposer}
              pollQuestion={pollQuestion}
              setPollQuestion={setPollQuestion}
              pollOptions={pollOptions}
              setPollOptions={setPollOptions}
            />

            {selectedImagePreviews.length > 0 && (
              <div className="confession-composer-preview confession-composer-preview--stacked">
                <div className="confession-composer-preview-strip">
                  {selectedImagePreviews.map((src, index) => (
                    <div className="confession-composer-preview-item" key={`${src}-${index}`}>
                      <img
  src={src}
  alt={`Selected confession attachment ${index + 1}`}
  decoding="async"
/>
                      <button
                        type="button"
                        className="confession-composer-preview-remove"
                        aria-label={`Remove attached image ${index + 1}`}
                        onClick={() => removeSelectedImage(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

              </div>

              <div className="confession-composer-right">
                <ComposeEnhancements
                  section="settings"
                  selectedMood={selectedMood}
                  setSelectedMood={setSelectedMood}
                  contentWarningEnabled={contentWarningEnabled}
                  setContentWarningEnabled={setContentWarningEnabled}
                  contentWarningCategory={contentWarningCategory}
                  setContentWarningCategory={setContentWarningCategory}
                  contentWarningNote={contentWarningNote}
                  setContentWarningNote={setContentWarningNote}
                  contentWarningSensitive={contentWarningSensitive}
                  setContentWarningSensitive={setContentWarningSensitive}
                  availablePostThemes={availablePostThemes}
                  selectedPostTheme={selectedPostTheme}
                  setSelectedPostTheme={setSelectedPostTheme}
                  whisperPrompt={whisperPrompt}
                  onGeneratePrompt={handleGeneratePrompt}
                  onUsePrompt={handleUsePrompt}
                  showPollComposer={showPollComposer}
                  setShowPollComposer={setShowPollComposer}
                  pollQuestion={pollQuestion}
                  setPollQuestion={setPollQuestion}
                  pollOptions={pollOptions}
                  setPollOptions={setPollOptions}
                />
              </div>
            </div>

            <div
  className="confession-composer-actions"
  style={{
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "14px",
    marginTop: "16px",
  }}
>
  <div
  className="confession-composer-tools"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "10px",
    flex: 1,
  }}
>
    <EmojiPickerButton
      open={showPostEmojiPicker}
      setOpen={setShowPostEmojiPicker}
      onPick={insertPostEmoji}
    />

    <label
      style={{
        color: "rgba(255,255,220,0.5)",
        fontSize: "12px",
        cursor: "pointer",
        letterSpacing: "0.08em",
        border: "1px solid rgba(255,255,220,0.15)",
        borderRadius: "20px",
        padding: "7px 16px",
      }}
    >
      ⌘ attach image
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        style={{ display: "none" }}
      />
    </label>
  </div>

  <div className="confession-composer-submit-group">
  <button
    type="button"
    className="confession-composer-cancel"
    onClick={() => {
      setShowPostEmojiPicker(false);
      setShowCompose(false);
    }}
  >
    Cancel
  </button>

  <button
    type="button"
    className="confession-composer-submit"
    onClick={handleSubmit}
    disabled={loading || !message.trim()}
    style={{
      background: message.trim()
        ? "rgba(255,238,136,0.12)"
        : "rgba(255,255,220,0.04)",
      border: `1px solid ${
        message.trim()
          ? "rgba(255,238,136,0.5)"
          : "rgba(255,255,220,0.1)"
      }`,
      borderRadius: "20px",
      padding: "8px 24px",
      color: message.trim()
        ? "rgba(255,238,136,0.9)"
        : "rgba(255,255,220,0.3)",
      fontSize: "13px",
      cursor: message.trim() ? "pointer" : "default",
      fontFamily: "Georgia, serif",
      letterSpacing: "0.08em",
      flexShrink: 0,
    }}
  >
    {loading ? "planting…" : "bloom →"}
  </button>
</div>
          </div>
        </div>
        </div>
      )}
    {showTutorial && (
  <div
    data-ui="true"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background:
  tutorialStep === 0
    ? "radial-gradient(circle at 50% 45%, transparent 0px, transparent 150px, rgba(0,0,0,0.85) 230px)"
    : tutorialStep === 1
    ? "radial-gradient(circle at 12% 50%, transparent 0px, transparent 140px, rgba(0,0,0,0.85) 220px)"
    : tutorialStep === 2
    ? "radial-gradient(circle at 88% 50%, transparent 0px, transparent 140px, rgba(0,0,0,0.85) 220px)"
    : "radial-gradient(circle at 50% 95%, transparent 0px, transparent 140px, rgba(0,0,0,0.85) 220px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      flexDirection: "column",
      paddingBottom: "90px",
      color: "white",
      fontFamily: "Georgia, serif",
    }}
  >
    {/* TEXT */}
    <p style={{ fontSize: "18px", marginBottom: "20px" }}>
      {tutorialStep === 0 && "🌼 These are new budding confessions. Click to explore."}
      {tutorialStep === 1 && "🌿 Water confessions → Grove."}
      {tutorialStep === 2 && "🔥 Burn confessions → Scorched."}
      {tutorialStep === 3 && "✋ Plant your own confession here."}
    </p>

    {/* BUTTONS */}
<div style={{ display: "flex", gap: "10px" }}>
  <button
    onClick={() => {
      if (tutorialStep < 3) {
        setTutorialStep((s) => s + 1);
      } else {
        localStorage.setItem("seenHomeTutorial", "true");
        setShowTutorial(false);
        openGuidebookAfterTutorial("auto");
      }
    }}
    style={{
      padding: "10px 18px",
      borderRadius: "20px",
      border: "1px solid rgba(120,255,180,0.4)",
      background: "linear-gradient(135deg, #0f3d2e, #145c3a)",
      color: "#d6ffe8",
      fontFamily: "Georgia, serif",
      cursor: "pointer",
      boxShadow: "0 0 12px rgba(120,255,180,0.25)",
      transition: "all 0.25s ease",
    }}
    onMouseEnter={(e) => {
      e.target.style.boxShadow = "0 0 18px rgba(120,255,180,0.6)";
      e.target.style.transform = "scale(1.05)";
    }}
    onMouseLeave={(e) => {
      e.target.style.boxShadow = "0 0 12px rgba(120,255,180,0.25)";
      e.target.style.transform = "scale(1)";
    }}
  >
    {tutorialStep < 3 ? "Continue" : "Enter"}
  </button>

  <button
    onClick={() => {
      localStorage.setItem("seenHomeTutorial", "true");
      setShowTutorial(false);
      openGuidebookAfterTutorial("auto");
    }}
    style={{
      padding: "10px 18px",
      borderRadius: "20px",
      border: "1px solid rgba(255,255,220,0.15)",
      background: "rgba(255,255,220,0.05)",
      color: "rgba(255,255,220,0.6)",
      fontFamily: "Georgia, serif",
      cursor: "pointer",
      transition: "all 0.25s ease",
    }}
    onMouseEnter={(e) => {
      e.target.style.background = "rgba(255,255,220,0.12)";
    }}
    onMouseLeave={(e) => {
      e.target.style.background = "rgba(255,255,220,0.05)";
    }}
  >
    Skip
  </button>
</div>
  </div>
)}
    {showLoginPrompt && (
      <GuestLoginPrompt
        onClose={() => setShowLoginPrompt(false)}
        onLogin={() => navigate("/login")}
        onRegister={() => navigate("/register")}
      />
    )}
</div>
  );
}
