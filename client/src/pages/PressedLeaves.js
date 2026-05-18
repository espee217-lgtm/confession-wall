import ForestEventBanner from "../components/ForestEventBanner";
import MobileBottomNav from "../components/MobileBottomNav";
import PostCard from "../components/PostCard";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRealmKeyFromReactions } from "../utils/engagement";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const API_URL = `${API_BASE}/api/auth/pressed-leaves`;

export default function PressedLeaves() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    const loadPressedLeaves = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load your Pressed Leaves.");
        }

        setConfessions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        window.cwToast?.(
          err.message || "Could not load your Pressed Leaves.",
          "error"
        ) || alert(err.message || "Could not load your Pressed Leaves.");
      } finally {
        setLoading(false);
      }
    };

    loadPressedLeaves();
  }, [navigate, token, user]);

  useEffect(() => {
    const savedIds = new Set(
      (Array.isArray(user?.savedConfessions) ? user.savedConfessions : []).map((id) =>
        String(id)
      )
    );

    setConfessions((prev) =>
      prev.filter((post) => savedIds.has(String(post._id)))
    );
  }, [user?.savedConfessions]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(130, 190, 120, 0.12), transparent 30%), linear-gradient(180deg, #041008 0%, #06180c 48%, #040c07 100%)",
        color: "#e8ffe7",
        fontFamily: "Georgia, serif",
        padding: "26px 16px 88px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Link
          to="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            color: "#a9d7a2",
            fontSize: "13px",
            letterSpacing: "0.05em",
            marginBottom: "16px",
          }}
        >
          ← back to settings
        </Link>

        <ForestEventBanner />

        <div
          style={{
            marginTop: "16px",
            marginBottom: "18px",
            padding: "18px 20px",
            borderRadius: "20px",
            border: "1px solid rgba(140, 220, 150, 0.18)",
            background:
              "linear-gradient(145deg, rgba(9, 30, 13, 0.94), rgba(3, 14, 7, 0.98))",
            boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(210,255,196,0.7)",
              marginBottom: "8px",
            }}
          >
            Private Collection
          </div>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "30px",
              color: "#f1ffe7",
            }}
          >
            Pressed Leaves
          </h1>

          <p
            style={{
              margin: 0,
              color: "rgba(222,255,218,0.72)",
              lineHeight: 1.6,
              fontSize: "14px",
            }}
          >
            Saved confessions stay here only for you. Nothing on this page is
            visible on your public profile.
          </p>
        </div>

        {loading ? (
          <div
            style={{
              padding: "28px 18px",
              borderRadius: "18px",
              border: "1px solid rgba(140, 220, 150, 0.16)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(220,255,218,0.7)",
              textAlign: "center",
            }}
          >
            Loading your saved leaves...
          </div>
        ) : confessions.length === 0 ? (
          <div
            style={{
              padding: "30px 22px",
              borderRadius: "18px",
              border: "1px solid rgba(140, 220, 150, 0.16)",
              background: "rgba(255,255,255,0.04)",
              textAlign: "center",
            }}
          >
            <strong style={{ display: "block", marginBottom: "8px", fontSize: "18px" }}>
              No leaves pressed yet.
            </strong>
            <p
              style={{
                margin: 0,
                color: "rgba(222,255,218,0.68)",
                lineHeight: 1.6,
              }}
            >
              Save a confession from the feed or detail page and it will appear
              here.
            </p>
          </div>
        ) : (
          confessions.map((post) => {
            const realm = getRealmKeyFromReactions(post.wateredBy, post.burnedBy);

            return (
              <PostCard
                key={post._id}
                post={post}
                realm={realm}
                onOpen={() => navigate(`/confession/${post._id}?realm=${realm}`)}
              />
            );
          })
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
