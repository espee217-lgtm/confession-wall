import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DaisyScene from "../DaisyScene";

const API_URL = "https://confession-wall-hn63.onrender.com/api/confessions";

export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [confessions, setConfessions] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetch(API_URL)
      .then(r => r.json())
      .then(d => setConfessions(Array.isArray(d) ? d : []))
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
      setMessage("");
      setImage(null);
      setImagePreview(null);
      setShowCompose(false);
    } catch (err) {
      console.error(err);
      alert("Could not post — is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", background: "#050f04" }}>

      {/* 3D Daisy Scene */}
      <DaisyScene
        confessions={confessions}
        user={user}
        onPostClick={(id) => navigate(`/confession/${id}`)}
        onCompose={() => setShowCompose(true)}
        onProfile={() => navigate("/settings")}
      />

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
            {/* Close */}
            <button
              onClick={() => setShowCompose(false)}
              style={{
                position: "absolute", top: "16px", right: "18px",
                background: "none", border: "none",
                color: "rgba(255,255,220,0.4)", fontSize: "20px",
                cursor: "pointer", lineHeight: 1,
              }}
            >✕</button>

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "rgba(255,238,136,0.9)", fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                ✦ plant a confession
              </p>
              <p style={{ color: "rgba(255,255,220,0.35)", fontSize: "11px", margin: "6px 0 0", letterSpacing: "0.05em" }}>
                anonymous · it blooms with the others
              </p>
            </div>

            {/* Textarea */}
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
                fontFamily: "Georgia, serif",
                lineHeight: 1.7,
                boxSizing: "border-box",
              }}
            />

            {/* Image preview */}
            {imagePreview && (
              <div style={{ marginTop: "10px", position: "relative", display: "inline-block" }}>
                <img src={imagePreview} alt="preview" style={{ maxHeight: "80px", borderRadius: "10px", opacity: 0.8 }} />
                <button
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  style={{
                    position: "absolute", top: "-6px", right: "-6px",
                    background: "rgba(255,80,80,0.8)", border: "none",
                    borderRadius: "50%", width: "18px", height: "18px",
                    color: "#fff", cursor: "pointer", fontSize: "10px", lineHeight: 1,
                  }}
                >✕</button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <label style={{
                color: "rgba(255,255,220,0.5)", fontSize: "12px",
                cursor: "pointer", letterSpacing: "0.08em",
                border: "1px solid rgba(255,255,220,0.15)",
                borderRadius: "20px", padding: "7px 16px",
                transition: "all 0.2s",
              }}>
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
                  fontFamily: "Georgia, serif", letterSpacing: "0.08em",
                  transition: "all 0.2s",
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
