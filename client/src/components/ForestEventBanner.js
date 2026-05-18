import React, { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import "./ForestEventBanner.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const API_URL = `${API_BASE}/api/confessions/weekly-event`;

function formatCompactCountdown(ms) {
  const safeMs = Number(ms) || 0;

  if (safeMs <= 0) {
    return "Closed";
  }

  const totalMinutes = Math.max(1, Math.ceil(safeMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }

  return `${minutes}m left`;
}

function getCompactStatus(event) {
  if (!event) {
    return {
      timerText: "",
      badgeText: "",
    };
  }

  if (event.phase === "active") {
    return {
      timerText: formatCompactCountdown(event.countdownMs),
      badgeText: "Event live",
    };
  }

  const expiresAtMs = event.rewardExpiresAt
    ? new Date(event.rewardExpiresAt).getTime() - Date.now()
    : 0;

  return {
    timerText: expiresAtMs > 0 ? formatCompactCountdown(expiresAtMs) : "Closed",
    badgeText: "Results active",
  };
}

export default function ForestEventBanner({ compact = false, statusData = null }) {
  const [status, setStatus] = useState(statusData);
  const artId = useId().replace(/:/g, "");
  const branchFillId = `forest-event-branch-fill-${artId}`;
  const branchRimId = `forest-event-branch-rim-${artId}`;
  const barkSheenId = `forest-event-bark-sheen-${artId}`;
  const mossWashId = `forest-event-moss-wash-${artId}`;
  const vineStrokeId = `forest-event-vine-stroke-${artId}`;
  const vineGlowId = `forest-event-vine-glow-${artId}`;
  const moteGlowId = `forest-event-mote-glow-${artId}`;

  useEffect(() => {
    if (statusData) {
      setStatus(statusData);
      return undefined;
    }

    let alive = true;

    const loadStatus = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json().catch(() => null);

        if (!res.ok || !alive || !data?.currentEvent) {
          return;
        }

        setStatus(data);
      } catch (err) {
        console.error("Forest event banner error:", err);
      }
    };

    void loadStatus();

    const interval = window.setInterval(() => {
      void loadStatus();
    }, 60000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [statusData]);

  const event = status?.currentEvent;

  if (!event) {
    return null;
  }

  const isActive = event.phase === "active";

  if (compact) {
    const compactStatus = getCompactStatus(event);

    return (
      <Link
        to="/weekly-events"
        className="forest-event-strip"
        aria-label={`Open weekly event ${event.name}`}
        style={{
          "--event-strip-border": event.border,
          "--event-strip-accent": event.accent,
          "--event-strip-background": event.background,
        }}
      >
        <span className="forest-event-strip__art" aria-hidden="true">
          <svg
            className="forest-event-strip__svg"
            viewBox="0 0 360 92"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={branchFillId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#6b4a2f" />
                <stop offset="18%" stopColor="#4d321f" />
                <stop offset="58%" stopColor="#2b1b12" />
                <stop offset="100%" stopColor="#1a130d" />
              </linearGradient>
              <linearGradient
                id={branchRimId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#1d120c" />
                <stop offset="24%" stopColor="#7b5738" />
                <stop offset="56%" stopColor="#251811" />
                <stop offset="100%" stopColor="#100907" />
              </linearGradient>
              <linearGradient
                id={barkSheenId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(214, 182, 136, 0.0)" />
                <stop offset="16%" stopColor="rgba(214, 182, 136, 0.22)" />
                <stop offset="50%" stopColor="rgba(68, 49, 34, 0.08)" />
                <stop offset="82%" stopColor="rgba(196, 255, 182, 0.08)" />
                <stop offset="100%" stopColor="rgba(214, 182, 136, 0.0)" />
              </linearGradient>
              <linearGradient
                id={mossWashId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#2d5927" stopOpacity="0" />
                <stop offset="18%" stopColor="#6ea85f" stopOpacity="0.28" />
                <stop offset="58%" stopColor="#5e964f" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#1d3c1b" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id={vineStrokeId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#4f8e43" />
                <stop offset="42%" stopColor="#89d66d" />
                <stop offset="100%" stopColor="#4a7f41" />
              </linearGradient>
              <filter id={vineGlowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={moteGlowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              className="forest-event-strip__branch-shadow"
              d="M20 54
                 C26 23, 64 10, 111 15
                 C148 5, 206 7, 250 18
                 C295 10, 337 18, 355 36
                 C366 47, 367 67, 344 79
                 C322 90, 278 90, 232 86
                 C191 95, 133 96, 88 88
                 C51 85, 26 74, 14 62
                 C9 57, 11 49, 20 54 Z"
            />
            <path
              className="forest-event-strip__branch-shape"
              style={{ fill: `url(#${branchFillId})` }}
              d="M18 52
                 C26 24, 64 12, 111 16
                 C147 8, 205 10, 248 20
                 C292 13, 333 20, 349 36
                 C360 47, 359 64, 340 75
                 C322 85, 280 85, 234 82
                 C191 90, 134 92, 91 84
                 C54 81, 29 72, 15 60
                 C9 56, 10 48, 18 52 Z"
            />
            <path
              className="forest-event-strip__branch-rim"
              style={{ stroke: `url(#${branchRimId})` }}
              d="M18 52
                 C26 24, 64 12, 111 16
                 C147 8, 205 10, 248 20
                 C292 13, 333 20, 349 36
                 C360 47, 359 64, 340 75
                 C322 85, 280 85, 234 82
                 C191 90, 134 92, 91 84
                 C54 81, 29 72, 15 60
                 C9 56, 10 48, 18 52 Z"
            />
            <path
              className="forest-event-strip__branch-sheen"
              style={{ stroke: `url(#${barkSheenId})` }}
              d="M30 40
                 C76 27, 138 22, 220 26
                 C277 29, 319 35, 338 45"
            />
            <path
              className="forest-event-strip__branch-moss"
              style={{ stroke: `url(#${mossWashId})` }}
              d="M42 60
                 C76 47, 124 42, 182 44
                 C226 46, 271 51, 311 59"
            />
            <path
              className="forest-event-strip__branch-grain grain-a"
              d="M45 58 C79 46, 128 42, 177 46 C221 49, 257 55, 296 63"
            />
            <path
              className="forest-event-strip__branch-grain grain-b"
              d="M70 69 C114 63, 164 62, 213 66 C251 69, 282 71, 314 69"
            />
            <path
              className="forest-event-strip__branch-grain grain-c"
              d="M101 32 C140 26, 182 24, 226 27 C260 30, 290 36, 316 41"
            />
            <ellipse className="forest-event-strip__branch-knot knot-a" cx="112" cy="52" rx="12" ry="8.5" />
            <ellipse className="forest-event-strip__branch-knot knot-b" cx="262" cy="46" rx="9" ry="6.5" />
            <ellipse className="forest-event-strip__branch-knot knot-c" cx="315" cy="58" rx="7.5" ry="5.4" />
            <path
              className="forest-event-strip__vine vine-a"
              filter={`url(#${vineGlowId})`}
              style={{ stroke: `url(#${vineStrokeId})` }}
              d="M34 66
                 C43 48, 56 35, 73 30
                 C85 27, 99 29, 107 37
                 C114 45, 118 57, 127 60
                 C139 64, 149 52, 156 41
                 C164 29, 173 22, 185 21
                 C198 20, 209 30, 214 43
                 C219 55, 229 64, 243 61
                 C255 59, 263 48, 271 39
                 C282 27, 297 24, 313 32"
            />
            <path
              className="forest-event-strip__vine vine-b"
              filter={`url(#${vineGlowId})`}
              style={{ stroke: `url(#${vineStrokeId})` }}
              d="M53 28
                 C72 17, 92 16, 110 21
                 C128 26, 145 33, 166 31
                 C186 29, 199 17, 217 15
                 C237 13, 252 22, 266 31
                 C280 39, 292 45, 309 44"
            />
            <path
              className="forest-event-strip__vine vine-c"
              filter={`url(#${vineGlowId})`}
              style={{ stroke: `url(#${vineStrokeId})` }}
              d="M126 74
                 C138 69, 150 68, 160 72
                 C171 76, 183 80, 196 77
                 C207 74, 214 66, 221 58
                 C229 49, 237 44, 246 43
                 C255 42, 262 48, 266 57"
            />
            <path
              className="forest-event-strip__twig twig-left"
              d="M69 25 C60 16, 50 11, 39 11"
            />
            <path
              className="forest-event-strip__twig twig-right"
              d="M286 63 C301 66, 315 71, 328 80"
            />
            <path
              className="forest-event-strip__twig twig-top"
              d="M238 19 C244 10, 252 4, 263 3"
            />

            <g className="forest-event-strip__leaf-group leaf-group-a">
              <path
                className="forest-event-strip__leaf"
                d="M88 32 C98 24, 108 25, 111 35 C101 41, 92 40, 88 32 Z"
              />
              <path className="forest-event-strip__leaf-vein" d="M90 33 C98 34, 103 35, 109 34" />
            </g>
            <g className="forest-event-strip__leaf-group leaf-group-b">
              <path
                className="forest-event-strip__leaf"
                d="M206 20 C216 12, 227 13, 231 24 C221 30, 211 29, 206 20 Z"
              />
              <path className="forest-event-strip__leaf-vein" d="M208 21 C216 22, 222 23, 229 22" />
            </g>
            <g className="forest-event-strip__leaf-group leaf-group-c">
              <path
                className="forest-event-strip__leaf"
                d="M254 56 C264 49, 274 51, 278 61 C268 66, 259 65, 254 56 Z"
              />
              <path className="forest-event-strip__leaf-vein" d="M256 57 C263 58, 269 59, 276 58" />
            </g>
            <g className="forest-event-strip__leaf-group leaf-group-d">
              <path
                className="forest-event-strip__leaf"
                d="M146 70 C156 62, 166 64, 170 74 C160 79, 151 78, 146 70 Z"
              />
              <path className="forest-event-strip__leaf-vein" d="M148 71 C155 72, 161 73, 168 72" />
            </g>
            <g className="forest-event-strip__leaf-group leaf-group-e">
              <path
                className="forest-event-strip__leaf"
                d="M233 48 C243 40, 253 42, 257 53 C247 58, 238 57, 233 48 Z"
              />
              <path className="forest-event-strip__leaf-vein" d="M235 49 C242 50, 248 51, 255 50" />
            </g>
            <circle
              className="forest-event-strip__mote mote-a"
              filter={`url(#${moteGlowId})`}
              cx="78"
              cy="41"
              r="2.6"
            />
            <circle
              className="forest-event-strip__mote mote-b"
              filter={`url(#${moteGlowId})`}
              cx="228"
              cy="32"
              r="2.2"
            />
            <circle
              className="forest-event-strip__mote mote-c"
              filter={`url(#${moteGlowId})`}
              cx="286"
              cy="54"
              r="2.4"
            />
          </svg>
        </span>

        <span className="forest-event-strip__content">
          <span className="forest-event-strip__kicker">Weekly Forest Event</span>

          <span className="forest-event-strip__row">
            <strong className="forest-event-strip__title">{event.name}</strong>

            {compactStatus.badgeText && (
              <span className="forest-event-strip__badge">
                {compactStatus.badgeText}
              </span>
            )}
          </span>

          <span className="forest-event-strip__timer">
            {compactStatus.timerText || event.statusText}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div
      style={{
        borderRadius: compact ? "16px" : "18px",
        border: `1px solid ${event.border}`,
        background: event.background,
        boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        padding: compact ? "12px 14px" : "14px 16px",
        color: event.accent,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: compact ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.84,
              marginBottom: "4px",
            }}
          >
            Weekly Forest Event
          </div>
          <strong
            style={{
              display: "block",
              fontSize: compact ? "15px" : "16px",
              color: "#f4f8ff",
              marginBottom: "4px",
            }}
          >
            {event.name}
          </strong>
          <p
            style={{
              margin: 0,
              fontSize: compact ? "12px" : "13px",
              lineHeight: 1.55,
              color: "rgba(244, 248, 255, 0.84)",
            }}
          >
            {event.description}
          </p>
          {event.statusText && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: compact ? "11px" : "12px",
                lineHeight: 1.5,
                color: "rgba(244, 248, 255, 0.74)",
              }}
            >
              {event.statusText}
            </p>
          )}
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px 10px",
              borderRadius: "999px",
              border: `1px solid ${event.border}`,
              background: "rgba(255,255,255,0.08)",
              color: event.accent,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {event.label}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px 10px",
              borderRadius: "999px",
              border: `1px solid ${event.border}`,
              background: isActive
                ? "rgba(120,255,170,0.12)"
                : "rgba(255,255,255,0.06)",
              color: "#f4f8ff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {isActive ? "Event live" : "Results active"}
          </span>

          <Link
            to="/weekly-events"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px 10px",
              borderRadius: "999px",
              border: `1px solid ${event.border}`,
              background: "rgba(255,255,255,0.06)",
              color: "#f4f8ff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Weekly board
          </Link>
        </span>
      </div>
    </div>
  );
}
