import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://confession-wall-hn63.onrender.com/api/confessions";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px 60px",
    fontFamily: "Georgia, serif",
  },
  inner: {
    maxWidth: "640px",
    margin: "0 auto",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "#3b6e2a",
    fontSize: "13px",
    letterSpacing: "0.05em",
    textDecoration: "none",
    marginBottom: "20px",
    opacity: 0.8,
  },
  confessionCard: {
    background: "white",
    borderRadius: "18px",
    border: "1px solid rgba(100,180,80,0.2)",
    padding: "24px",
    marginBottom: "28px",
    boxShadow: "0 2px 20px rgba(80,150,60,0.08)",
  },
  avatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(100,180,80,0.3)",
  },
  avatarPlaceholder: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #c8e6b8, #a8d498)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    border: "2px solid rgba(100,180,80,0.3)",
  },
  username: {
    fontWeight: 600,
    fontSize: "14px",
    color: "#2d5a1f",
    textDecoration: "none",
  },
  message: {
    fontSize: "16px",
    color: "#2c3e28",
    lineHeight: 1.7,
    margin: "0 0 12px",
  },
  timestamp: {
    fontSize: "11px",
    color: "#8aab7a",
    letterSpacing: "0.06em",
    marginTop: "12px",
  },
  sectionTitle: {
    fontSize: "12px",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#5a8a48",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  commentCard: {
    background: "white",
    borderRadius: "14px",
    border: "1px solid rgba(100,180,80,0.15)",
    padding: "14px 18px",
    marginBottom: "10px",
    boxShadow: "0 1px 8px rgba(80,150,60,0.05)",
  },
  commentUsername: {
    fontWeight: 600,
    fontSize: "13px",
    color: "#2d5a1f",
    textDecoration: "none",
  },
  commentText: {
    fontSize: "14px",
    color: "#3c4e38",
    lineHeight: 1.65,
    margin: "5px 0 0",
  },
  noComments: {
    textAlign: "center",
    color: "#9ab88a",
    fontSize: "13px",
    padding: "24px 0",
    letterSpacing: "0.06em",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "20px",
    background: "white",
    borderRadius: "50px",
    border: "1px solid rgba(100,180,80,0.25)",
    padding: "6px 6px 6px 18px",
    boxShadow: "0 2px 12px rgba(80,150,60,0.08)",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "#2c3e28",
    background: "transparent",
    fontFamily: "Georgia, serif",
  },
  attachBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px",
    borderRadius: "50%",
    color: "#7ab868",
  },
  sendBtn: {
    background: "#4a8f35",
    border: "none",
    borderRadius: "50px",
    padding: "8px 20px",
    color: "white",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
};

function Avatar({ src, size = 38 }) {
  if (src) return <img src={src} alt="avatar" style={{ ...styles.avatar, width: size, height: size }} />;
  return <div style={{ ...styles.avatarPlaceholder, width: size, height: size }}>🌿</div>;
}

export default function ConfessionPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [confession, setConfession] = useState(null);
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentPreview, setCommentPreview] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/${id}`)
      .then(r => r.json())
      .then(setConfession)
      .catch(err => console.error(err));
  }, [id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setCommentImage(file);
    setCommentPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() && !commentImage) return;
    try {
      const formData = new FormData();
      formData.append("text", comment);
      if (commentImage) formData.append("image", commentImage);
      await fetch(`${API_URL}/${id}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setComment(""); setCommentImage(null); setCommentPreview(null);
      const updated = await fetch(`${API_URL}/${id}`).then(r => r.json());
      setConfession(updated);
    } catch (err) {
      alert("Could not add comment.");
    }
  };

  if (!confession) return (
    <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#7ab868", fontSize: "13px", letterSpacing: "0.1em" }}>loading…</span>
    </div>
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>

      {/* Background video */}
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
          opacity: 0.4,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/forest3.mp4" type="video/mp4" />
      </video>

      {/* Content */}
      <div style={{ ...styles.page, position: "relative", zIndex: 1, background: "transparent" }}>
        <div style={styles.inner}>

          <Link to="/" style={styles.backBtn}>← back</Link>

          <div style={styles.confessionCard}>
            <div style={styles.avatarRow}>
              <Link to={confession.userId ? `/user/${confession.userId._id}` : "#"}>
                <Avatar src={confession.userId?.profilePicture} />
              </Link>
              <Link to={confession.userId ? `/user/${confession.userId._id}` : "#"} style={styles.username}>
                @{confession.userId?.username || "anonymous"}
              </Link>
            </div>
            <p style={styles.message}>{confession.message}</p>
            {confession.image && (
              <img src={confession.image} alt="confession"
                style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "12px", marginTop: "8px" }} />
            )}
            <div style={styles.timestamp}>
              🌱 {new Date(confession.createdAt).toLocaleString()}
            </div>
          </div>

          <div style={styles.sectionTitle}>
            <span>✦</span>
            <span>{confession.comments?.length || 0} comments</span>
          </div>

          {confession.comments?.length > 0 ? confession.comments.map((c, i) => (
            <div key={i} style={styles.commentCard}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Link to={c.userId ? `/user/${c.userId._id}` : "#"} style={{ marginRight: "10px" }}>
                  <Avatar src={c.userId?.profilePicture} size={30} />
                </Link>
                <Link to={c.userId ? `/user/${c.userId._id}` : "#"} style={styles.commentUsername}>
                  @{c.userId?.username || "anonymous"}
                </Link>
              </div>
              {c.text && <p style={styles.commentText}>{c.text}</p>}
              {c.image && (
                <img src={c.image} alt="comment"
                  style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "10px", marginTop: "8px" }} />
              )}
            </div>
          )) : (
            <div style={styles.noComments}>no confessions yet · be the first 🌿</div>
          )}

          <form onSubmit={handleCommentSubmit}>
            {commentPreview && (
              <div style={{ marginBottom: "10px", position: "relative", display: "inline-block" }}>
                <img src={commentPreview} alt="preview" style={{ maxHeight: "100px", borderRadius: "10px" }} />
                <button type="button" onClick={() => { setCommentImage(null); setCommentPreview(null); }}
                  style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", color: "white", width: "20px", height: "20px", cursor: "pointer", fontSize: "11px" }}>
                  ✕
                </button>
              </div>
            )}
            <div style={styles.inputRow}>
              <input
                type="text"
                placeholder="leave a confession…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={styles.input}
              />
              <label style={styles.attachBtn}>
                📎
                <input type="file" accept="image/*,image/gif" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
              <button type="submit" style={styles.sendBtn}>bloom →</button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}