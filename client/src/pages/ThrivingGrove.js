import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BASE_URL = process.env.REACT_APP_API_URL;

function realmStatus(wateredBy = [], burnedBy = []) {
  const total = wateredBy.length + burnedBy.length;
  if (total === 0) return { label: "🌱 new", color: "#8aab7a" };
  const r = wateredBy.length / total;
  if (r >= 0.85) return { label: "🌳 flourishing", color: "#1D9E75" };
  if (r >= 0.65) return { label: "🌿 thriving", color: "#3b8a5a" };
  return { label: "🌱 sprouting", color: "#7aab5a" };
}

export default function ThrivingGrove() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetPostId = new URLSearchParams(location.search).get("post");
  const [highlightedPost, setHighlightedPost] = useState(null);

  // 🔹 Fetch posts
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetch(`${BASE_URL}/realm/thriving`)
      .then((r) => r.json())
      .then((data) => {
  const groveOnly = data.filter((p) => {
    const watered = p.wateredBy?.length || 0;
    const burned = p.burnedBy?.length || 0;

    return watered > burned;
  });

  setPosts(groveOnly);
  setLoading(false);
})
      .catch(console.error);
  }, [user, navigate]);

  // 🔹 Scroll + highlight effect
  useEffect(() => {
    if (!targetPostId || loading || posts.length === 0) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setHighlightedPost(targetPostId);

        setTimeout(() => {
          setHighlightedPost(null);
        }, 1800);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [targetPostId, loading, posts]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      
      {/* 🌿 Animation */}
      <style>{`
        @keyframes groveBlink {
          0% {
            box-shadow: 0 0 0 rgba(160,255,200,0);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 35px rgba(160,255,200,0.8);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 rgba(160,255,200,0);
            transform: scale(1);
          }
        }
      `}</style>

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
          opacity: 0.45,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/forest3.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "640px",
          margin: "0 auto",
          padding: "24px 16px 60px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#0F6E56",
              letterSpacing: "0.04em",
              margin: "0 0 6px",
            }}
          >
            🌳 The Thriving Grove
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#7aab5a",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Posts nourished by the community
          </p>

          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(29,158,117,0.4), transparent)",
              margin: "16px 0 0",
            }}
          />
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#7aab5a",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
            }}
          >
            tending the grove…
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#9ab88a",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
              letterSpacing: "0.06em",
            }}
          >
            the grove awaits its first bloom…
          </div>
        ) : (
          posts.map((p) => {
            const status = realmStatus(p.wateredBy, p.burnedBy);
            const total =
              (p.wateredBy?.length || 0) +
              (p.burnedBy?.length || 0);
            const ratio = total === 0 ? 0 : p.wateredBy.length / total;

            return (
              <div
                id={`post-${p._id}`}
                key={p._id}
                onClick={() => navigate(`/confession/${p._id}`)}
                style={{
                  background: "rgba(255,255,255,0.88)",
                  borderRadius: "16px",
                  border: "0.5px solid rgba(29,158,117,0.25)",
                  padding: "18px 20px",
                  marginBottom: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 20px rgba(29,158,117,0.08)",

                  // 🔥 Highlight animation
                  animation:
                    highlightedPost === p._id
                      ? "groveBlink 0.45s ease-in-out 4"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "rgba(29,158,117,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#0F6E56",
                      fontWeight: 500,
                    }}
                  >
                    {p.userId?.username?.[0]?.toUpperCase() || "?"}
                  </div>

                  <span
                    style={{
                      fontSize: "12px",
                      color: "#1D9E75",
                      fontWeight: 500,
                    }}
                  >
                    @{p.userId?.username || "anonymous"}
                  </span>

                  <span
                    style={{
                      fontSize: "10px",
                      color: status.color,
                      marginLeft: "auto",
                      fontStyle: "italic",
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "14px",
                    color: "#2c3e28",
                    lineHeight: 1.65,
                    margin: "0 0 12px",
                  }}
                >
                  {p.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}