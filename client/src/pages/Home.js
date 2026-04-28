import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DaisyScene from "../DaisyScene";

const API_URL = "https://confession-wall-hn63.onrender.com/api/confessions";
const SCORCHED_URL = "https://confession-wall-hn63.onrender.com/api/confessions/realm/scorched";

// ── Slanted confession feed panel (LEFT / Grove) ──────────────────────────────
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
          background: active ? "rgba(10,35,12,0.85)" : "rgba(8,22,9,0.45)",
          border: `1px solid ${active ? "rgba(120,200,90,0.45)" : "rgba(80,130,70,0.18)"}`,
          backdropFilter: "blur(10px)",
          borderRadius: "4px",
          width: "52px",
          height: "28px",
          cursor: active ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s",
          color: active ? "rgba(160,240,130,0.9)" : "rgba(100,150,90,0.25)",
          fontSize: "14px",
          lineHeight: 1,
        }}
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </div>
  );

  return (
    <div style={{
      position: "absolute",
      left: 0,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 50,
      width: "320px",
      pointerEvents: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "6px", marginBottom: "30px" }}>
        <ArrowBtn direction="up" active={canUp} onClick={() => canUp && setOffset(o => Math.max(0, o - 1))} />
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
        <ArrowBtn direction="down" active={canDown} onClick={() => canDown && setOffset(o => Math.min(total - VISIBLE, o + 1))} />
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
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${cardWidth}px`,
        marginLeft: `-${cardWidth - peekOut}px`,
        transform: `skewY(${skewDeg}deg)`,
        transformOrigin: "left center",
        background: hovered ? "rgba(12,40,14,0.92)" : "rgba(7,22,8,0.82)",
        border: `1px solid ${hovered ? "rgba(130,220,100,0.45)" : "rgba(80,150,70,0.22)"}`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: "3px",
        padding: "11px 15px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        boxShadow: hovered
          ? "0 6px 28px rgba(50,150,50,0.18), inset 0 1px 0 rgba(160,255,130,0.10)"
          : "0 3px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(160,255,130,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(130,220,90,0.5), transparent)",
        opacity: hovered ? 1 : 0.35,
        transition: "opacity 0.22s",
      }} />

      <p style={{
        margin: "0 0 4px", fontSize: "8px", letterSpacing: "0.20em",
        textTransform: "uppercase", color: "rgba(130,215,100,0.65)",
        fontFamily: "Georgia, serif", textAlign: "right",
      }}>
        @{conf.userId?.username || "anon"}
      </p>

      <p style={{
        margin: 0, fontSize: "11.5px", color: "rgba(215,255,205,0.85)",
        fontFamily: "Georgia, serif", lineHeight: 1.5, textAlign: "right",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {conf.message}
      </p>

      <span style={{
        position: "absolute", bottom: "7px", right: "11px", fontSize: "8px",
        color: "rgba(130,215,90,0.40)", fontFamily: "Georgia, serif",
        letterSpacing: "0.12em", opacity: hovered ? 1 : 0, transition: "opacity 0.2s",
      }}>read →</span>
    </div>
  );
}

// ── Slanted scorched feed panel (RIGHT / red theme) ───────────────────────────
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
          background: active ? "rgba(50,10,8,0.85)" : "rgba(30,8,6,0.45)",
          border: `1px solid ${active ? "rgba(220,80,50,0.45)" : "rgba(150,50,30,0.18)"}`,
          backdropFilter: "blur(10px)",
          borderRadius: "4px",
          width: "52px",
          height: "28px",
          cursor: active ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s",
          color: active ? "rgba(255,160,100,0.9)" : "rgba(180,80,60,0.25)",
          fontSize: "14px",
          lineHeight: 1,
        }}
      >
        {direction === "up" ? "▲" : "▼"}
      </button>
    </div>
  );

  return (
    <div style={{
      position: "absolute",
      right: 0,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 50,
      width: "320px",
      pointerEvents: "auto",
    }}>
      {/* Up arrow — aligned to left edge of top card */}
      <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: "6px", marginBottom: "30px" }}>
        <ArrowBtn direction="up" active={canUp} onClick={() => canUp && setOffset(o => Math.max(0, o - 1))} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {visible.map((conf, i) => (
          <ScorchedCard key={conf._id || i} conf={conf} index={i} onClick={() => onCardClick(conf._id)} />
        ))}
        {Array.from({ length: VISIBLE - visible.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: "66px" }} />
        ))}
      </div>

      {/* Down arrow — aligned to left edge of bottom card */}
      <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: "6px", marginTop: "8px" }}>
        <ArrowBtn direction="down" active={canDown} onClick={() => canDown && setOffset(o => Math.min(total - VISIBLE, o + 1))} />
      </div>
    </div>
  );
}

function ScorchedCard({ conf, index, onClick }) {
  const [hovered, setHovered] = useState(false);
  const skewDeg = 5; // mirror of left side
  const peekOut = 200 + index * 22;
  const cardWidth = 280 - index * 10;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${cardWidth}px`,
        marginRight: `-${cardWidth - peekOut}px`, // bleed right off screen
        marginLeft: "auto",
        transform: `skewY(${skewDeg}deg)`,
        transformOrigin: "right center",
        background: hovered ? "rgba(50,12,8,0.92)" : "rgba(30,7,5,0.82)",
        border: `1px solid ${hovered ? "rgba(220,90,50,0.45)" : "rgba(160,60,40,0.22)"}`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: "3px",
        padding: "11px 15px",
        cursor: "pointer",
        transition: "all 0.22s ease",
        boxShadow: hovered
          ? "0 6px 28px rgba(200,60,30,0.22), inset 0 1px 0 rgba(255,130,80,0.10)"
          : "0 3px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,130,80,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* shimmer top edge */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(220,90,50,0.5), transparent)",
        opacity: hovered ? 1 : 0.35,
        transition: "opacity 0.22s",
      }} />

      <p style={{
        margin: "0 0 4px", fontSize: "8px", letterSpacing: "0.20em",
        textTransform: "uppercase", color: "rgba(220,120,80,0.65)",
        fontFamily: "Georgia, serif", textAlign: "left",
      }}>
        @{conf.userId?.username || "anon"}
      </p>

      <p style={{
        margin: 0, fontSize: "11.5px", color: "rgba(255,210,190,0.85)",
        fontFamily: "Georgia, serif", lineHeight: 1.5, textAlign: "left",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {conf.message}
      </p>

      <span style={{
        position: "absolute", bottom: "7px", left: "11px", fontSize: "8px",
        color: "rgba(220,100,60,0.40)", fontFamily: "Georgia, serif",
        letterSpacing: "0.12em", opacity: hovered ? 1 : 0, transition: "opacity 0.2s",
      }}>← read</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [confessions, setConfessions] = useState([]);
  const [scorchedPosts, setScorchedPosts] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showFeed, setShowFeed] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    // Fetch grove confessions
    fetch(API_URL)
      .then(r => r.json())
      .then(d => setConfessions(Array.isArray(d) ? d : []))
      .catch(err => console.error(err));

    // Fetch scorched posts
    fetch(SCORCHED_URL)
      .then(r => r.json())
      .then(d => setScorchedPosts(Array.isArray(d) ? d : []))
      .catch(err => console.error(err));
  }, [user, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("message", message);
      if (image) formData.append("image", image);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const newConfession = await res.json();
      const confessionWithUser = {
        ...newConfession,
        userId: { _id: user._id, username: user.username, profilePicture: user.profilePicture },
      };
      setConfessions([confessionWithUser, ...confessions]);
      setMessage(""); setImage(null); setImagePreview(null); setShowCompose(false);
    } catch (err) {
      console.error(err);
      alert("Could not post — is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", background: "#050f04" }}>
      {/* Background video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={muted}
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.6,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/green.mp4" type="video/mp4" />
      </video>

      <button
        onClick={() => setMuted(m => !m)}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          zIndex: 100,
          background: "rgba(10,30,12,0.7)",
          border: "1px solid rgba(120,200,90,0.3)",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          cursor: "pointer",
          color: "rgba(200,255,180,0.8)",
          fontSize: "16px",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0,
        }}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* 3D Daisy Scene */}
      <DaisyScene
        confessions={confessions}
        user={user}
        onPostClick={(id) => navigate(`/confession/${id}`)}
        onCompose={() => setShowCompose(true)}
        onProfile={() => navigate("/settings")}
      />

      {/* Grove feed — left side (green) */}
      {confessions.length > 0 && (
        <ConfessionFeed
          confessions={confessions}
          onCardClick={(id) => navigate(`/confession/${id}`)}
        />
      )}

      {/* Scorched feed — right side (red) */}
      {scorchedPosts.length > 0 && (
        <ScorchedFeed
          confessions={scorchedPosts}
          onCardClick={(id) => navigate(`/confession/${id}`)}
        />
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompose(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(3,10,2,0.80)",
            backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            background: "rgba(8,22,6,0.97)",
            border: "1px solid rgba(255,238,136,0.2)",
            borderRadius: "24px",
            padding: "32px 28px",
            width: "min(440px, 92vw)",
            position: "relative",
            boxShadow: "0 0 60px rgba(255,238,136,0.08), 0 24px 80px rgba(0,0,0,0.8)",
            fontFamily: "Georgia, serif",
          }}>
            <button
              onClick={() => setShowCompose(false)}
              style={{ position: "absolute", top: "16px", right: "18px", background: "none", border: "none", color: "rgba(255,255,220,0.4)", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
            >✕</button>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "rgba(255,238,136,0.9)", fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                ✦ plant a confession
              </p>
              <p style={{ color: "rgba(255,255,220,0.35)", fontSize: "11px", margin: "6px 0 0", letterSpacing: "0.05em" }}>
                anonymous · it blooms with the others
              </p>
            </div>

            <textarea
              placeholder="what do you need to confess?"
              value={message}
              onChange={e => setMessage(e.target.value)}
              autoFocus
              style={{
                width: "100%", height: "120px",
                background: "rgba(255,255,220,0.04)",
                border: "1px solid rgba(255,255,220,0.15)",
                borderRadius: "14px", padding: "14px",
                color: "rgba(255,255,220,0.92)", fontSize: "14px",
                resize: "none", outline: "none",
                fontFamily: "Georgia, serif", lineHeight: 1.7,
                boxSizing: "border-box",
              }}
            />

            {imagePreview && (
              <div style={{ marginTop: "12px", position: "relative", display: "inline-block", overflow: "visible" }}>
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{
                    maxHeight: "160px",
                    maxWidth: "100%",
                    borderRadius: "12px",
                    opacity: 0.9,
                    display: "block",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    cursor: "zoom-in",
                    position: "relative",
                    zIndex: 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "scale(2.2)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.7)";
                    e.currentTarget.style.zIndex = "10";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.zIndex = "1";
                  }}
                />
                <button
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  style={{ position: "absolute", top: "-6px", right: "-6px", background: "rgba(255,80,80,0.8)", border: "none", borderRadius: "50%", width: "18px", height: "18px", color: "#fff", cursor: "pointer", fontSize: "10px", lineHeight: 1, zIndex: 11 }}
                >✕</button>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <label style={{ color: "rgba(255,255,220,0.5)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.08em", border: "1px solid rgba(255,255,220,0.15)", borderRadius: "20px", padding: "7px 16px", transition: "all 0.2s" }}>
                ⌘ attach image
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
              <button
                onClick={handleSubmit}
                disabled={loading || !message.trim()}
                style={{
                  background: message.trim() ? "rgba(255,238,136,0.12)" : "rgba(255,255,220,0.04)",
                  border: `1px solid ${message.trim() ? "rgba(255,238,136,0.5)" : "rgba(255,255,220,0.1)"}`,
                  borderRadius: "20px", padding: "8px 24px",
                  color: message.trim() ? "rgba(255,238,136,0.9)" : "rgba(255,255,220,0.3)",
                  fontSize: "13px", cursor: message.trim() ? "pointer" : "default",
                  fontFamily: "Georgia, serif", letterSpacing: "0.08em", transition: "all 0.2s",
                }}
              >
                {loading ? "planting…" : "bloom →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}