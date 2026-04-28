import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = "https://confession-wall-hn63.onrender.com";

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
        setPosts(allPosts.filter((p) => p.userId?._id === id));
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={loadingStyle}>tending the grove...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={pageStyle}>
        <p style={loadingStyle}>User not found.</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={forestOverlay} />

      <div style={containerStyle}>
        <Link to="/" style={backButtonStyle}>
          ← Return to Grove
        </Link>

        <div style={profileCardStyle}>
          <div style={avatarWrapStyle}>
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt="avatar"
                style={avatarStyle}
              />
            ) : (
              <div style={avatarFallbackStyle}>
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <h2 style={usernameStyle}>{profile.username}</h2>

          {profile.bio ? (
            <p style={bioStyle}>“{profile.bio}”</p>
          ) : (
            <p style={emptyBioStyle}>No whisper written yet</p>
          )}

          <p style={joinedStyle}>
            joined the forest on {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div style={sectionHeaderStyle}>
          <span>🌿 Forest Echoes</span>
          <span style={countStyle}>{posts.length} posts</span>
        </div>

        {posts.length === 0 ? (
          <div style={emptyPostsStyle}>no confessions have bloomed here yet...</div>
        ) : (
          posts.map((p) => (
            <Link
              to={`/confession/${p._id}`}
              key={p._id}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={postCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(9, 38, 20, 0.82)";
                  e.currentTarget.style.borderColor = "rgba(122, 255, 160, 0.35)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(5, 22, 12, 0.72)";
                  e.currentTarget.style.borderColor = "rgba(110, 190, 125, 0.16)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <p style={postTextStyle}>{p.message}</p>

                {p.image && (
                  <img
                    src={p.image}
                    alt=""
                    style={postImageStyle}
                  />
                )}

                <div style={postFooterStyle}>
                  <span>✦ confession</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 20%, rgba(32, 95, 45, 0.32), transparent 42%), linear-gradient(180deg, #020703 0%, #071409 45%, #020503 100%)",
  color: "rgba(235, 255, 225, 0.92)",
  padding: "2.2rem 1rem 4rem",
  fontFamily: "Georgia, serif",
};

const forestOverlay = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  background:
    "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.75)), url('/forest.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  opacity: 0.28,
  filter: "blur(1px)",
  zIndex: 0,
};

const containerStyle = {
  position: "relative",
  zIndex: 1,
  maxWidth: "760px",
  margin: "0 auto",
};

const backButtonStyle = {
  display: "inline-block",
  marginBottom: "1.5rem",
  background: "rgba(8, 32, 14, 0.72)",
  border: "1px solid rgba(130, 230, 145, 0.22)",
  borderRadius: "999px",
  padding: "8px 18px",
  color: "rgba(220, 255, 210, 0.88)",
  textDecoration: "none",
  fontSize: "0.9rem",
  letterSpacing: "0.05em",
  boxShadow: "0 0 22px rgba(58, 180, 80, 0.08)",
  backdropFilter: "blur(10px)",
};

const profileCardStyle = {
  background:
    "linear-gradient(180deg, rgba(11, 36, 18, 0.82), rgba(4, 16, 8, 0.9))",
  border: "1px solid rgba(130, 230, 145, 0.22)",
  borderRadius: "26px",
  padding: "2.4rem 2rem",
  marginBottom: "2rem",
  textAlign: "center",
  boxShadow:
    "0 0 55px rgba(54, 160, 80, 0.12), inset 0 1px 0 rgba(210,255,210,0.08)",
  backdropFilter: "blur(16px)",
};

const avatarWrapStyle = {
  width: "112px",
  height: "112px",
  borderRadius: "50%",
  margin: "0 auto 1rem",
  padding: "4px",
  background:
    "linear-gradient(135deg, rgba(170,255,160,0.8), rgba(35,120,60,0.2), rgba(255,238,150,0.55))",
  boxShadow: "0 0 35px rgba(105, 255, 140, 0.22)",
};

const avatarStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  display: "block",
  border: "2px solid rgba(4, 18, 8, 0.85)",
};

const avatarFallbackStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  background: "rgba(80, 160, 90, 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "2.6rem",
  color: "rgba(230,255,220,0.92)",
  border: "2px solid rgba(4, 18, 8, 0.85)",
};

const usernameStyle = {
  margin: "0.8rem 0 0.35rem",
  fontSize: "2rem",
  color: "rgba(245,255,235,0.96)",
  textShadow: "0 0 20px rgba(110,255,145,0.18)",
};

const bioStyle = {
  opacity: 0.8,
  fontStyle: "italic",
  margin: "0 0 0.6rem",
  color: "rgba(210, 240, 200, 0.78)",
};

const emptyBioStyle = {
  opacity: 0.42,
  fontSize: "0.9rem",
  margin: "0 0 0.6rem",
};

const joinedStyle = {
  opacity: 0.45,
  fontSize: "0.82rem",
  margin: 0,
  letterSpacing: "0.04em",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "0 0 1rem",
  color: "rgba(220,255,210,0.9)",
  fontSize: "1.15rem",
  fontWeight: 700,
  letterSpacing: "0.05em",
};

const countStyle = {
  fontSize: "0.8rem",
  opacity: 0.55,
  fontWeight: 400,
};

const postCardStyle = {
  background: "rgba(5, 22, 12, 0.72)",
  border: "1px solid rgba(110, 190, 125, 0.16)",
  borderRadius: "18px",
  padding: "1.05rem 1.25rem",
  marginBottom: "0.85rem",
  cursor: "pointer",
  transition: "all 0.22s ease",
  boxShadow: "0 8px 30px rgba(0,0,0,0.28)",
  backdropFilter: "blur(12px)",
};

const postTextStyle = {
  margin: "0 0 0.75rem",
  lineHeight: 1.7,
  color: "rgba(238,255,230,0.92)",
};

const postImageStyle = {
  width: "100%",
  maxHeight: "220px",
  objectFit: "cover",
  borderRadius: "12px",
  marginBottom: "0.75rem",
  border: "1px solid rgba(130,230,145,0.12)",
};

const postFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  borderTop: "1px solid rgba(130,230,145,0.10)",
  paddingTop: "0.7rem",
  color: "rgba(170,220,160,0.55)",
  fontSize: "0.78rem",
  letterSpacing: "0.05em",
};

const emptyPostsStyle = {
  background: "rgba(5, 22, 12, 0.62)",
  border: "1px solid rgba(110, 190, 125, 0.14)",
  borderRadius: "18px",
  padding: "1.4rem",
  textAlign: "center",
  color: "rgba(200,235,190,0.5)",
  fontStyle: "italic",
};

const loadingStyle = {
  position: "relative",
  zIndex: 1,
  textAlign: "center",
  marginTop: "4rem",
  color: "rgba(180, 255, 170, 0.75)",
  fontFamily: "Georgia, serif",
};