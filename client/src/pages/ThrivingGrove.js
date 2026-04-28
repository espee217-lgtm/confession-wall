import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BASE_URL = process.env.REACT_APP_API_URL;

function realmStatus(wateredBy = [], burnedBy = []) {
  const total = wateredBy.length + burnedBy.length;
  if (total === 0) return { label: "🌱 new", color: "#8aab7a" };
  const r = wateredBy.length / total;
  if (r >= 0.85) return { label: "🌳 flourishing", color: "#1D9E75" };
  if (r >= 0.65) return { label: "🌿 thriving",    color: "#3b8a5a" };
  return               { label: "🌱 sprouting",    color: "#7aab5a" };
}

export default function ThrivingGrove() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetch(`${BASE_URL}/realm/thriving`)
      .then(r => r.json())
      .then(data => { setPosts(data); setLoading(false); })
      .catch(console.error);
  }, [user, navigate]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <video autoPlay loop muted playsInline
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.45, zIndex: 0, pointerEvents: "none" }}>
        <source src="/forest3.mp4" type="video/mp4" />
      </video>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "640px",
        margin: "0 auto", padding: "24px 16px 60px", fontFamily: "Georgia, serif" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 500, color: "#0F6E56",
            letterSpacing: "0.04em", margin: "0 0 6px" }}>
            🌳 The Thriving Grove
          </h1>
          <p style={{ fontSize: "13px", color: "#7aab5a", fontStyle: "italic", margin: 0 }}>
            Posts nourished by the community
          </p>
          <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(29,158,117,0.4), transparent)", margin: "16px 0 0" }} />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#7aab5a", fontSize: "13px",
            padding: "48px 0", fontStyle: "italic" }}>tending the grove…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9ab88a", fontSize: "13px",
            padding: "48px 0", fontStyle: "italic", letterSpacing: "0.06em" }}>
            the grove awaits its first bloom…
          </div>
        ) : posts.map(p => {
          const status = realmStatus(p.wateredBy, p.burnedBy);
          const total = (p.wateredBy?.length || 0) + (p.burnedBy?.length || 0);
          const ratio = total === 0 ? 0 : p.wateredBy.length / total;
          return (
            <div key={p._id} onClick={() => navigate(`/confession/${p._id}`)}
              style={{
                background: "rgba(255,255,255,0.88)",
                borderRadius: "16px",
                border: "0.5px solid rgba(29,158,117,0.25)",
                padding: "18px 20px",
                marginBottom: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 20px rgba(29,158,117,0.08)",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(29,158,117,0.5)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(29,158,117,0.25)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%",
                  background: "rgba(29,158,117,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: "12px",
                  color: "#0F6E56", fontWeight: 500, flexShrink: 0 }}>
                  {p.userId?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <span style={{ fontSize: "12px", color: "#1D9E75", fontWeight: 500 }}>
                  @{p.userId?.username || "anonymous"}
                </span>
                <span style={{ fontSize: "10px", color: status.color, marginLeft: "auto",
                  fontStyle: "italic" }}>{status.label}</span>
              </div>

              <p style={{ fontSize: "14px", color: "#2c3e28", lineHeight: 1.65,
                margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.message}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "8px",
                paddingTop: "10px", borderTop: "1px solid rgba(29,158,117,0.1)" }}>
                <span style={{ fontSize: "11px", color: "#3b8a5a" }}>
                  🌱 {p.wateredBy?.length || 0}
                </span>
                <span style={{ fontSize: "11px", color: "#993C1D" }}>
                  🔥 {p.burnedBy?.length || 0}
                </span>
                <div style={{ flex: 1, height: "3px", borderRadius: "2px",
                  background: "rgba(29,158,117,0.12)", overflow: "hidden", maxWidth: "60px" }}>
                  <div style={{ height: "100%", borderRadius: "2px",
                    width: `${Math.round(ratio * 100)}%`, background: "#1D9E75",
                    transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontSize: "10px", color: "#9ab88a", marginLeft: "auto",
                  fontStyle: "italic" }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}