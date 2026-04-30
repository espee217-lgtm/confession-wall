import React from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const REPORT_URL = `${API_BASE}/api/reports`;

export default function PostCard({ post, realm, highlighted, onOpen }) {
  const { token } = useAuth();

  const isBudding = realm === "budding";
  const isGrove = realm === "grove";
  const isScorched = realm === "scorched";

  const reportPost = async (e) => {
    e.stopPropagation();

    if (!token) {
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
          confessionId: post._id,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Could not submit report");
        return;
      }

      alert("Report submitted.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong while reporting.");
    }
  };

  return (
    <div
      id={`post-${post._id}`}
      onClick={onOpen}
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
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        {(isGrove || isScorched) && (
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: isScorched ? "rgba(216,90,48,0.15)" : "rgba(29,158,117,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: isScorched ? "#D85A30" : "#0F6E56",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {post.userId?.username?.[0]?.toUpperCase() || "?"}
          </div>
        )}

        <span
          style={{
            fontSize: "12px",
            color: isScorched ? "#D85A30" : isGrove ? "#1D9E75" : "#9be7c4",
            fontWeight: 500,
          }}
        >
          @{post.userId?.username || "anonymous"}
        </span>

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
          color: isScorched ? "rgba(255,220,200,0.85)" : isGrove ? "#2c3e28" : "rgba(220,255,240,0.85)",
          lineHeight: 1.65,
          margin: "0 0 12px",
          display: "-webkit-box",
          WebkitLineClamp: isScorched ? 3 : "unset",
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {post.message}
      </p>

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
          🌱 {post.wateredBy?.length || 0}
        </span>

        <span style={{ fontSize: "11px", color: "#D85A30" }}>
          🔥 {post.burnedBy?.length || 0}
        </span>

        <button
          onClick={reportPost}
          style={{
            marginLeft: "auto",
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
  );
}