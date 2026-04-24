import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/confessions";

export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confessions, setConfessions] = useState([]);

  // eslint-disable-next-line
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setConfessions(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching confessions:", err));
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
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
      setPreview(null);
    } catch (err) {
      console.error("Failed to post:", err);
      alert("Could not post — is the backend running?");
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfessions(confessions.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Unable to delete. Check console.");
    }
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Write your confession..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {preview && (
          <div style={{ margin: "8px 0" }}>
            <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label className="attach-btn">
            📎 Attach image
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
          <button className="btn" type="submit">Post</button>
        </div>
      </form>

      <div className="confession-list">
        {confessions.length === 0 ? (
          <p className="center link-muted">No confessions yet ■</p>
        ) : (
          confessions.map((conf) => (
            <div className="confession-card" key={conf._id}>

              {/* User info row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                {conf.userId?.profilePicture ? (
                  <img
                    src={conf.userId.profilePicture}
                    alt="avatar"
                    style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                    👤
                  </div>
                )}
                <span style={{ fontWeight: 600, fontSize: "14px" }}>
                  {conf.userId?.username || "Anonymous"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Link to={`/confession/${conf._id}`} className="confession-text">
                  {conf.message}
                </Link>
                {/* 👇 Only show delete button on your own posts */}
                {user && conf.userId?._id === user._id && (
                  <button className="delete-btn" style={{ marginLeft: "12px", flexShrink: 0 }} onClick={() => handleDelete(conf._id)}>
                    Delete
                  </button>
                )}
              </div>

              {conf.image && (
                <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
                  <img src={conf.image} alt="confession" style={{ maxHeight: "200px", borderRadius: "8px", objectFit: "cover" }} />
                </div>
              )}

              <div className="timestamp">Posted {timeAgo(conf.createdAt)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

