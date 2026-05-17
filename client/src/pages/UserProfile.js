import { AnimatedBadge } from "../components/CosmeticFx";
import DisplayTitlePill from "../components/DisplayTitlePill";
import MobileBottomNav from "../components/MobileBottomNav";
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FramedAvatar from "../components/FramedAvatar";
import {
  getDisplayTitle,
  getCosmeticMeta,
  getPostThemeStyle,
} from "../utils/cosmetics";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

function CosmeticChip({ item, fallback }) {
  return (
    <div style={cosmeticChipStyle}>
      <span style={{ fontSize: "1.05rem" }}>{item?.icon || "✦"}</span>
      <div style={{ minWidth: 0 }}>
        <div style={cosmeticChipLabelStyle}>{fallback}</div>
        <strong style={cosmeticChipValueStyle}>{item?.name || "None"}</strong>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);

        const [userRes, postsRes] = await Promise.all([
          fetch(`${API_BASE}/api/auth/user/${id}`),
          fetch(`${API_BASE}/api/confessions`),
        ]);

        const userData = await userRes.json();
        const allPosts = await postsRes.json();

        if (!alive) return;

        setProfile(userData);
        setPosts(
          Array.isArray(allPosts)
            ? allPosts.filter((p) => p.userId?._id === id)
            : []
        );
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={ambientLeafStyle}>✦</div>
        <p style={loadingStyle}>tending the grove...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={pageStyle}>
        <div style={ambientLeafStyle}>✦</div>
        <p style={loadingStyle}>User not found.</p>
      </div>
    );
  }

  const equipped = profile.equippedCosmetics || {};
  const displayTitle = getDisplayTitle(equipped.title);

  const frameItem = getCosmeticMeta(equipped.frame);
  const titleItem = getCosmeticMeta(equipped.title);
  const postThemeItem = getCosmeticMeta(equipped.postTheme);
  const badgeItem = getCosmeticMeta(equipped.badge);

  return (
    <div className="cw-user-profile-page" style={pageStyle}>
      <div style={forestGlowTopStyle} />
      <div style={forestGlowBottomStyle} />
      <div style={ambientLeafStyle}>✦</div>
      <div style={ambientLeafTwoStyle}>❧</div>

      <div style={containerStyle}>
        <Link to="/" style={backButtonStyle}>
          ← Return to Grove
        </Link>

        <section style={profileCardStyle}>
          <div style={profileCardAuraStyle} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <FramedAvatar
              src={profile.profilePicture}
              username={profile.username}
              frameId={equipped.frame}
              size={124}
              placeholder={profile.username?.[0]?.toUpperCase() || "?"}
            />

            <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "1rem",
  }}
>
  <h2 style={{ ...usernameStyle, margin: 0 }}>
    {profile.username}{" "}
    <AnimatedBadge badgeId={equipped.badge} size="lg" />
  </h2>

  <DisplayTitlePill titleId={equipped.title} size="big" />
</div>

            {profile.bio ? (
              <p style={bioStyle}>“{profile.bio}”</p>
            ) : (
              <p style={emptyBioStyle}>No whisper written yet</p>
            )}

            <p style={joinedStyle}>
              joined the forest on{" "}
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : "unknown"}
            </p>
            {profile.showSeedsOnProfile && typeof profile.seeds === "number" && (
  <div
    style={{
      margin: "12px auto 0",
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      padding: "7px 14px",
      borderRadius: "999px",
      background: "rgba(120,255,130,0.10)",
      border: "1px solid rgba(150,255,150,0.25)",
      color: "rgba(225,255,215,0.95)",
      fontWeight: 800,
      boxShadow: "0 0 18px rgba(120,255,130,0.12)",
    }}
  >
    🌱 {profile.seeds} Seeds
  </div>
)}
          </div>
        </section>

        <section style={equippedPanelStyle}>
          <div style={sectionTitleRowStyle}>
            <div>
              <p style={smallKickerStyle}>active aura</p>
              <h3 style={panelTitleStyle}>Equipped Cosmetics</h3>
            </div>
          </div>

          <div style={cosmeticGridStyle}>
            <CosmeticChip item={badgeItem} fallback="Badge" />
            <CosmeticChip item={frameItem} fallback="Frame" />
            <CosmeticChip item={titleItem} fallback="Title" />
            <CosmeticChip item={postThemeItem} fallback="Post Theme" />
          </div>
        </section>

        <div style={sectionHeaderStyle}>
          <span>🌿 Forest Echoes</span>
          <span style={countStyle}>
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {posts.length === 0 ? (
          <div style={emptyPostsStyle}>
            no confessions have bloomed here yet...
          </div>
        ) : (
          posts.map((p) => {
            const themeStyle = getPostThemeStyle(equipped.postTheme, "grove");

            return (
              <Link
                to={`/confession/${p._id}`}
                key={p._id}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  style={{
                    ...postCardStyle,
                    ...themeStyle,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.filter = "brightness(1.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.filter = "brightness(1)";
                  }}
                >
                  <p style={postTextStyle}>{p.message}</p>

                  {p.image && <img src={p.image} alt="" style={postImageStyle} />}

                  <div style={postFooterStyle}>
                    <span>✦ confession</span>
                    <span>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </article>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  position: "relative",
  overflowX: "hidden",
  background:
    "radial-gradient(circle at 18% 12%, rgba(90, 180, 95, 0.2), transparent 32%), radial-gradient(circle at 85% 18%, rgba(185, 255, 150, 0.09), transparent 28%), linear-gradient(180deg, #020703 0%, #061306 45%, #020503 100%)",
  color: "rgba(235, 255, 225, 0.92)",
  padding: "2.2rem 1rem 4rem",
  fontFamily: "Georgia, serif",
};

const forestGlowTopStyle = {
  position: "fixed",
  top: "-160px",
  left: "8%",
  width: "360px",
  height: "360px",
  borderRadius: "50%",
  background: "rgba(92, 255, 118, 0.11)",
  filter: "blur(70px)",
  pointerEvents: "none",
};

const forestGlowBottomStyle = {
  position: "fixed",
  bottom: "-180px",
  right: "6%",
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(170, 255, 120, 0.08)",
  filter: "blur(80px)",
  pointerEvents: "none",
};

const ambientLeafStyle = {
  position: "fixed",
  top: "18%",
  left: "11%",
  color: "rgba(160,255,170,0.18)",
  fontSize: "4rem",
  transform: "rotate(-18deg)",
  pointerEvents: "none",
};

const ambientLeafTwoStyle = {
  position: "fixed",
  bottom: "14%",
  right: "14%",
  color: "rgba(210,255,170,0.12)",
  fontSize: "5rem",
  transform: "rotate(20deg)",
  pointerEvents: "none",
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
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(13, 42, 20, 0.86), rgba(3, 15, 7, 0.94))",
  border: "1px solid rgba(130, 230, 145, 0.22)",
  borderRadius: "30px",
  padding: "2.6rem 2rem",
  marginBottom: "1.2rem",
  textAlign: "center",
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.36), inset 0 1px 0 rgba(210,255,210,0.08)",
  backdropFilter: "blur(18px)",
};

const profileCardAuraStyle = {
  position: "absolute",
  inset: "-40%",
  background:
    "radial-gradient(circle at 50% 10%, rgba(130,255,160,0.14), transparent 35%), radial-gradient(circle at 12% 80%, rgba(255,230,120,0.08), transparent 30%)",
  pointerEvents: "none",
};

const usernameStyle = {
  margin: "1rem 0 0.25rem",
  fontSize: "2rem",
  color: "rgba(245,255,235,0.96)",
  textShadow: "0 0 20px rgba(110,255,145,0.18)",
};

const badgeInlineStyle = {
  fontSize: "1.4rem",
  verticalAlign: "middle",
};

const displayTitleStyle = {
  margin: "0 0 0.6rem",
  color: "rgba(214,255,190,0.78)",
  fontSize: "1rem",
  fontStyle: "italic",
  letterSpacing: "0.04em",
};

const bioStyle = {
  opacity: 0.82,
  fontStyle: "italic",
  margin: "0 0 0.65rem",
  color: "rgba(210, 240, 200, 0.78)",
};

const emptyBioStyle = {
  opacity: 0.42,
  fontSize: "0.9rem",
  margin: "0 0 0.65rem",
};

const joinedStyle = {
  opacity: 0.45,
  fontSize: "0.82rem",
  margin: 0,
  letterSpacing: "0.04em",
};

const equippedPanelStyle = {
  background:
    "linear-gradient(145deg, rgba(7, 28, 13, 0.86), rgba(3, 13, 6, 0.92))",
  border: "1px solid rgba(130, 230, 145, 0.18)",
  borderRadius: "22px",
  padding: "1.1rem",
  marginBottom: "2rem",
  boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
  backdropFilter: "blur(14px)",
};

const sectionTitleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.9rem",
};

const smallKickerStyle = {
  margin: 0,
  color: "rgba(150,230,150,0.55)",
  fontSize: "0.68rem",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
};

const panelTitleStyle = {
  margin: "0.15rem 0 0",
  fontSize: "1.05rem",
  color: "rgba(235,255,225,0.92)",
};

const cosmeticGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const cosmeticChipStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(180,255,180,0.1)",
};

const cosmeticChipLabelStyle = {
  color: "rgba(180,230,170,0.52)",
  fontSize: "0.68rem",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const cosmeticChipValueStyle = {
  display: "block",
  marginTop: "2px",
  color: "rgba(238,255,230,0.9)",
  fontSize: "0.82rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
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
  background:
    "linear-gradient(135deg, rgba(6, 28, 13, 0.82), rgba(3, 15, 7, 0.9))",
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
