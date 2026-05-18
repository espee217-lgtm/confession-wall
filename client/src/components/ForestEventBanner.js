import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const API_URL = `${API_BASE}/api/confessions/weekly-event`;

export default function ForestEventBanner({ compact = false, statusData = null }) {
  const [status, setStatus] = useState(statusData);

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

    return () => {
      alive = false;
    };
  }, [statusData]);

  const event = status?.currentEvent;

  if (!event) {
    return null;
  }

  const isActive = event.phase === "active";

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
