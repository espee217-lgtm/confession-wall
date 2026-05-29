import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import usePageVisibility from "../hooks/usePageVisibility";
import "./ForestEventBanner.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const API_URL = `${API_BASE}/api/confessions/weekly-event`;
const EVENT_STATUS_CACHE_KEY = "cw-weekly-event-status-v1";
const EVENT_STATUS_CACHE_MS = 5 * 60 * 1000;
const EVENT_STRIP_IMAGE_WEBP = "/assets/fig-event-strip.webp";
const EVENT_STRIP_IMAGE_FALLBACK = "/assets/fig.png";

const FALLBACK_EVENT = {
  name: "Forest Event",
  phase: "active",
  countdownMs: 0,
  statusText: "Loading event...",
  label: "Weekly",
  border: "rgba(188, 255, 168, 0.28)",
  accent: "#d7f3b9",
  background:
    "linear-gradient(135deg, rgba(18, 42, 31, 0.76), rgba(5, 18, 12, 0.88))",
  description: "Weekly forest challenge loading.",
};

function readCachedStatus() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(EVENT_STATUS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.data?.currentEvent) return null;

    if (Date.now() - parsed.savedAt > EVENT_STATUS_CACHE_MS) {
      window.sessionStorage.removeItem(EVENT_STATUS_CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch (err) {
    return null;
  }
}

function writeCachedStatus(data) {
  if (typeof window === "undefined" || !data?.currentEvent) return;

  try {
    window.sessionStorage.setItem(
      EVENT_STATUS_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch (err) {
    // Ignore storage failures. The banner should still work normally.
  }
}

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

function getCompactStatus(event, isLoading = false) {
  if (!event) {
    return {
      timerText: "",
      badgeText: "",
    };
  }

  if (isLoading) {
    return {
      timerText: "Loading...",
      badgeText: "Event",
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
  const [status, setStatus] = useState(() => statusData || readCachedStatus());
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    const preload = new Image();
    preload.src = EVENT_STRIP_IMAGE_WEBP;
  }, []);

  useEffect(() => {
    if (statusData) {
      setStatus(statusData);
      writeCachedStatus(statusData);
      return undefined;
    }

    let alive = true;
    const controller = new AbortController();

    const loadStatus = async () => {
      try {
        const res = await fetch(API_URL, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !alive || !data?.currentEvent) {
          return;
        }

        writeCachedStatus(data);
        setStatus(data);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Forest event banner error:", err);
        }
      }
    };

    if (isPageVisible) {
      void loadStatus();
    }

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadStatus();
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [statusData, isPageVisible]);

  const isLoading = !status?.currentEvent;
  const event = status?.currentEvent || FALLBACK_EVENT;
  const isActive = event.phase === "active";

  if (compact) {
    const compactStatus = getCompactStatus(event, isLoading);

    return (
      <Link
        to="/weekly-events"
        className={`forest-event-strip${isLoading ? " forest-event-strip--loading" : ""}`}
        aria-label={`Open weekly event ${event.name}`}
        style={{
          "--event-strip-border": event.border,
          "--event-strip-accent": event.accent,
          "--event-strip-background": event.background,
        }}
      >
        <span className="forest-event-strip__art" aria-hidden="true">
          <img
            className="weekly-event-bg-image"
            src={EVENT_STRIP_IMAGE_WEBP}
            onError={(event) => {
              if (event.currentTarget.src.endsWith(EVENT_STRIP_IMAGE_FALLBACK)) return;
              event.currentTarget.src = EVENT_STRIP_IMAGE_FALLBACK;
            }}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
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
