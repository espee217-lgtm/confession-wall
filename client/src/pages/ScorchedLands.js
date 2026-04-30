import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";

const BASE_URL = process.env.REACT_APP_API_URL;

export default function ScorchedLands() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetPostId = new URLSearchParams(location.search).get("post");
  const [highlightedPost, setHighlightedPost] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetch(`${BASE_URL}/realm/scorched`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data);
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
        @keyframes scorchedBlink {
          0% {
            box-shadow: 0 0 0 rgba(255,120,80,0);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 38px rgba(255,120,80,0.85);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 rgba(255,120,80,0);
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
        <source src="/Burnt.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(180,50,20,0.18) 0%, transparent 70%)",
        }}
      />

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
              color: "#993C1D",
              letterSpacing: "0.04em",
              margin: "0 0 6px",
            }}
          >
            🔥 The Scorched Lands
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#D85A30",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Posts left to cinder by the crowd
          </p>

          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(216,90,48,0.4), transparent)",
              margin: "16px 0 0",
            }}
          />
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#D85A30",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
            }}
          >
            stoking the embers…
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#BA7517",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
              letterSpacing: "0.06em",
            }}
          >
            nothing burns here yet…
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p._id}
              post={p}
              realm="scorched"
              highlighted={highlightedPost === p._id}
              onOpen={() => navigate(`/confession/${p._id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}