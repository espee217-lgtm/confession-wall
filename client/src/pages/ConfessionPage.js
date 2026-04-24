import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/confessions";

export default function ConfessionPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [confession, setConfession] = useState(null);
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentPreview, setCommentPreview] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/${id}`)
      .then((res) => res.json())
      .then((data) => setConfession(data))
      .catch((err) => console.error("Error fetching confession:", err));
  }, [id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setCommentImage(file);
    if (file) setCommentPreview(URL.createObjectURL(file));
    else setCommentPreview(null);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      setComment("");
      setCommentImage(null);
      setCommentPreview(null);
      const updated = await fetch(`${API_URL}/${id}`).then((res) => res.json());
      setConfession(updated);
    } catch (err) {
      console.error("Comment failed", err);
      alert("Could not add comment.");
    }
  };

  if (!confession) return <p className="center">Loading...</p>;

  return (
    <div className="container">
      <Link to="/" className="back-btn">← Back</Link>

      <div className="confession-card" style={{ marginTop: "12px" }}>
        {/* Post owner info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <Link to={confession.userId ? `/user/${confession.userId._id}` : "#"} style={{ textDecoration: "none", flexShrink: 0 }}>
            {confession.userId?.profilePicture ? (
              <img src={confession.userId.profilePicture} alt="avatar"
                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                👤
              </div>
            )}
          </Link>
          <Link to={confession.userId ? `/user/${confession.userId._id}` : "#"} style={{ textDecoration: "none", color: "inherit" }}>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              {confession.userId?.username || "Anonymous"}
            </span>
          </Link>
        </div>

        <h2 style={{ margin: 0 }}>{confession.message}</h2>
        {confession.image && (
          <img src={confession.image} alt="confession"
            style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", marginTop: "12px" }} />
        )}
        <div className="timestamp">Posted {new Date(confession.createdAt).toLocaleString()}</div>
      </div>

      <h3 style={{ marginTop: "18px" }}>Comments ■</h3>

      {confession.comments && confession.comments.length > 0 ? (
        confession.comments.map((c, i) => (
          <div key={i} className="comment" style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
            <Link to={c.userId ? `/user/${c.userId._id}` : "#"} style={{ textDecoration: "none", flexShrink: 0 }}>
              {c.userId?.profilePicture ? (
                <img src={c.userId.profilePicture} alt="avatar"
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                  👤
                </div>
              )}
            </Link>
            <div style={{ flex: 1 }}>
              <Link to={c.userId ? `/user/${c.userId._id}` : "#"} style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ fontWeight: 600, fontSize: "13px" }}>
                  {c.userId?.username || "Anonymous"}
                </span>
              </Link>
              {c.text && <p style={{ margin: "2px 0 6px", fontSize: "14px" }}>{c.text}</p>}
              {c.image && (
                <img src={c.image} alt="comment" style={{
                  maxWidth: "100%", maxHeight: "200px",
                  borderRadius: "8px", objectFit: "cover", display: "block"
                }} />
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="link-muted">No comments yet</p>
      )}

      {/* Comment form */}
      <form onSubmit={handleCommentSubmit} style={{ marginTop: "12px" }}>
        {/* Image preview */}
        {commentPreview && (
          <div style={{ marginBottom: "8px", position: "relative", display: "inline-block" }}>
            <img src={commentPreview} alt="preview" style={{ maxHeight: "120px", borderRadius: "8px" }} />
            <button type="button" onClick={() => { setCommentImage(null); setCommentPreview(null); }}
              style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", color: "white", width: "22px", height: "22px", cursor: "pointer", fontSize: "12px" }}>
              ✕
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="text"
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)" }}
          />
          {/* Attach image button */}
          <label className="attach-btn" style={{ cursor: "pointer", margin: 0 }}>
            📎
            <input type="file" accept="image/*,image/gif" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
          <button className="btn" type="submit" style={{ margin: 0 }}>Send</button>
        </div>
      </form>
    </div>
  );
}