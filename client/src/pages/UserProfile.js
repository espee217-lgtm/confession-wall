import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = "http://localhost:5000";

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          fetch(`${API_URL}/api/auth/user/${id}`),
          fetch(`${API_URL}/api/confessions`),
        ]);
        const userData = await userRes.json();
        const allPosts = await postsRes.json();
        setProfile(userData);
        setPosts(allPosts.filter(p => p.userId?._id === id));
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>;
  if (!profile) return <p style={{ textAlign: "center", marginTop: "2rem" }}>User not found.</p>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #0f0f1a)",
      color: "var(--text, white)",
      padding: "2rem 1rem",
    }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* Back button */}
        <Link to="/" style={{
          display: "inline-block",
          marginBottom: "1.5rem",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "8px",
          padding: "6px 16px",
          color: "inherit",
          textDecoration: "none",
          fontSize: "0.9rem",
        }}>← Back</Link>

        {/* Profile card */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "18px",
          padding: "2rem",
          marginBottom: "2rem",
          textAlign: "center",
        }}>
          {/* Avatar */}
          {profile.profilePicture ? (
            <img src={profile.profilePicture} alt="avatar" style={{
              width: "90px", height: "90px", borderRadius: "50%",
              objectFit: "cover", border: "3px solid rgba(255,255,255,0.3)",
              marginBottom: "1rem",
            }} />
          ) : (
            <div style={{
              width: "90px", height: "90px", borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.5rem", margin: "0 auto 1rem",
            }}>
              {profile.username?.[0]?.toUpperCase()}
            </div>
          )}

          <h2 style={{ margin: "0 0 0.3rem" }}>{profile.username}</h2>

          {profile.bio ? (
            <p style={{ opacity: 0.6, fontStyle: "italic", margin: "0 0 0.5rem" }}>"{profile.bio}"</p>
          ) : (
            <p style={{ opacity: 0.35, fontSize: "0.85rem", margin: "0 0 0.5rem" }}>No bio yet</p>
          )}

          <p style={{ opacity: 0.4, fontSize: "0.8rem", margin: 0 }}>
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Posts */}
        <h3 style={{ marginBottom: "1rem", opacity: 0.8 }}>Posts ({posts.length})</h3>

        {posts.length === 0 ? (
          <p style={{ opacity: 0.4 }}>No posts yet.</p>
        ) : (
          posts.map(p => (
            <Link to={`/confession/${p._id}`} key={p._id} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
                padding: "1rem 1.2rem",
                marginBottom: "0.75rem",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.11)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              >
                <p style={{ margin: "0 0 0.5rem", lineHeight: 1.6 }}>{p.message}</p>
                {p.image && (
                  <img src={p.image} alt="" style={{
                    width: "100%", maxHeight: "200px", objectFit: "cover",
                    borderRadius: "10px", marginBottom: "0.5rem",
                  }} />
                )}
                <small style={{ opacity: 0.4 }}>{new Date(p.createdAt).toLocaleDateString()}</small>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
