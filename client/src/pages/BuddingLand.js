import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://confession-wall-hn63.onrender.com/api/confessions";

export default function BuddingLand() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const targetPostId = new URLSearchParams(location.search).get("post");
  const [highlightedPost, setHighlightedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        const budding = data.filter((c) => {
          const watered = c.wateredBy?.length || 0;
          const burned = c.burnedBy?.length || 0;
          return watered === burned;
        });

        setPosts(budding);
        setLoading(false);
      })
      .catch(console.error);
  }, [user, navigate]);
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
      <style>{`
      @keyframes buddingBlink {
        0% {
          box-shadow: 0 0 0 rgba(190,255,220,0);
          transform: scale(1);
        }
        50% {
          box-shadow: 0 0 35px rgba(190,255,220,0.75);
          transform: scale(1.025);
          border-color: rgba(190,255,220,0.9);
        }
        100% {
          box-shadow: 0 0 0 rgba(190,255,220,0);
          transform: scale(1);
        }
      }
    `}</style>   

      {/* 🌿 VIDEO BACKGROUND */}
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
          opacity: 0.5,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/budding.mp4" type="video/mp4" />
      </video>

      {/* 🌱 SOFT GREEN OVERLAY */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 20%, rgba(120,255,180,0.12), transparent 60%)",
        }}
      />

      {/* 🌿 CONTENT */}
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
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#9be7c4",
              letterSpacing: "0.04em",
              margin: "0 0 6px",
            }}
          >
            🌱 The Budding Land
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#7fd8b0",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Where confessions await their fate
          </p>

          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(150,255,200,0.4), transparent)",
              margin: "16px 0 0",
            }}
          />
        </div>

        {/* CONTENT */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#9be7c4",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
            }}
          >
            seeds are settling…
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#a8cbb5",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
              letterSpacing: "0.06em",
            }}
          >
            nothing rests here yet…
          </div>
        ) : (
          posts.map((p) => (
            <div
           id={`post-${p._id}`}
           key={p._id}
           onClick={() => navigate(`/confession/${p._id}`)}
              style={{
                background: "rgba(10,30,20,0.75)",
                borderRadius: "16px",
                border: "1px solid rgba(120,255,180,0.2)",
                padding: "18px 20px",
                marginBottom: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 20px rgba(120,255,180,0.08)",
                animation:
                highlightedPost === p._id
                ? "buddingBlink 0.45s ease-in-out 4"
                : "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor =
                  "rgba(120,255,180,0.5)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor =
                  "rgba(120,255,180,0.2)")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#9be7c4",
                    fontWeight: 500,
                  }}
                >
                  @{p.userId?.username || "anon"}
                </span>

                <span
                  style={{
                    fontSize: "10px",
                    color: "#7fd8b0",
                    marginLeft: "auto",
                    fontStyle: "italic",
                  }}
                >
                  ⚖️ balanced
                </span>
              </div>

              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(220,255,240,0.85)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {p.message}
              </p>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "11px",
                  color: "#7fd8b0",
                }}
              >
                🌱 {p.wateredBy?.length || 0} &nbsp;&nbsp;
                🔥 {p.burnedBy?.length || 0}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}