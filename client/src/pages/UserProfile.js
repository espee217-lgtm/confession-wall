import { AnimatedBadge } from "../components/CosmeticFx";
import DisplayTitlePill from "../components/DisplayTitlePill";
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FramedAvatar from "../components/FramedAvatar";
import {
  getCosmeticMeta,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  getConfessionThemeId,
  getDisplayCosmetics,
  getMoodChipStyle,
  getPollTotalVotes,
} from "../utils/engagement";
import {
  normalizeContentWarning,
  shouldBlurSensitiveContent,
} from "../utils/contentWarning";
import { getConfessionImages } from "../utils/confessionImages";

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
    </div>
  );
}

function FriendActionIcon({ variant = "add" }) {
  const isAccepted = variant === "accepted";
  const isCancel = variant === "cancel";
  const isAccept = variant === "accept";

  return (
    <span style={friendIconWrapStyle} aria-hidden="true">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.8 11.1C10.62 11.1 12.1 9.62 12.1 7.8C12.1 5.98 10.62 4.5 8.8 4.5C6.98 4.5 5.5 5.98 5.5 7.8C5.5 9.62 6.98 11.1 8.8 11.1Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.55 10.65C15.98 10.48 17.08 9.26 17.08 7.78C17.08 6.42 16.15 5.28 14.9 4.96"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.72"
        />
        <path
          d="M3.9 18.75C4.55 15.92 6.38 14.45 8.8 14.45C11.22 14.45 13.05 15.92 13.7 18.75"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.7 14.85C16.3 15.25 17.4 16.55 17.85 18.75"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.72"
        />
        <circle cx="17.8" cy="16.2" r="4" fill="rgba(6, 18, 10, 0.96)" />
        <circle
          cx="17.8"
          cy="16.2"
          r="3.45"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity="0.92"
        />
        {isAccepted ? (
          <path
            d="M16.15 16.25L17.35 17.45L19.65 14.95"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : isCancel ? (
          <path
            d="M16.35 16.2H19.25"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        ) : (
          <>
            <path
              d="M17.8 14.72V17.68"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M16.32 16.2H19.28"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
      {isAccept && <span style={friendIconPingStyle} />}
    </span>
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealedSensitiveByPost, setRevealedSensitiveByPost] = useState({});
  const [friendship, setFriendship] = useState({ status: "none", direction: "none" });
  const [friendBusy, setFriendBusy] = useState(false);

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

  useEffect(() => {
    setRevealedSensitiveByPost({});
  }, [id]);
  useEffect(() => {
    let alive = true;

    const fetchFriendshipStatus = async () => {
      if (!token || !user?._id || !id || user._id === id) {
        setFriendship({ status: user?._id === id ? "self" : "none", direction: "none" });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/friends/status/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        if (alive) setFriendship(data || { status: "none", direction: "none" });
      } catch (err) {
        console.error("Failed to load friendship status", err);
      }
    };

    fetchFriendshipStatus();

    return () => {
      alive = false;
    };
  }, [id, token, user?._id]);

  const refreshFriendshipStatus = async () => {
    if (!token || !user?._id || !id || user._id === id) return;

    try {
      const res = await fetch(`${API_BASE}/api/friends/status/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      setFriendship(data || { status: "none", direction: "none" });
    } catch (err) {
      console.error("Failed to refresh friendship status", err);
    }
  };

  const runFriendAction = async (path, method, successMessage) => {
    if (!token) {
      window.cwToast?.("Please log in to use friends.", "error");
      return;
    }

    try {
      setFriendBusy(true);
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Friend action failed.");

      await refreshFriendshipStatus();
      window.cwToast?.(successMessage, "success");
    } catch (err) {
      console.error("Friend action failed", err);
      window.cwToast?.(err.message || "Could not update friend request.", "error");
    } finally {
      setFriendBusy(false);
    }
  };

  const handleFriendAction = () => {
    if (!profile?._id) return;

    if (!token) {
      window.cwToast?.("Please log in to send friend requests.", "error");
      return;
    }

    if (friendship.status === "pending" && friendship.direction === "incoming") {
      runFriendAction(`/api/friends/accept/${friendship.friendshipId}`, "POST", "Friend request accepted.");
      return;
    }

    if (friendship.status === "accepted") {
      runFriendAction(`/api/friends/${friendship.friendshipId}`, "DELETE", "Friend removed.");
      return;
    }

    if (friendship.status === "pending" && friendship.direction === "outgoing") {
      runFriendAction(`/api/friends/${friendship.friendshipId}`, "DELETE", "Friend request cancelled.");
      return;
    }

    runFriendAction(`/api/friends/request/${profile._id}`, "POST", "Friend request sent.");
  };

  const getFriendButtonLabel = () => {
    if (friendBusy) return "Working...";
    if (!token) return "Login to Add Friend";
    if (friendship.status === "pending" && friendship.direction === "incoming") return "Accept Request";
    if (friendship.status === "pending") return "Cancel Request";
    if (friendship.status === "accepted") return "Remove Friend";
    return "Add Friend";
  };

  const getFriendIconVariant = () => {
    if (friendship.status === "pending" && friendship.direction === "incoming") return "accept";
    if (friendship.status === "pending" && friendship.direction === "outgoing") return "cancel";
    if (friendship.status === "accepted") return "accepted";
    return "add";
  };


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

  const equipped = getDisplayCosmetics(profile);

  const frameItem = getCosmeticMeta(equipped.frame || equipped.visualEffect);
  const titleItem = getCosmeticMeta(equipped.title);
  const postThemeItem = getCosmeticMeta(equipped.postTheme);
  const badgeItem = getCosmeticMeta(equipped.badge);

  return (
    <div className="cw-user-profile-page" style={pageStyle}>
      <div style={forestGlowTopStyle} />
      <div style={forestGlowBottomStyle} />
      <div style={ambientLeafStyle}>✦</div>
      <div style={ambientLeafTwoStyle}>❧</div>

      <div className="cw-user-profile-shell" style={containerStyle}>
        <Link to="/" style={backButtonStyle}>
          ← Return to Grove
        </Link>

        <section className="cw-user-profile-hero" style={profileCardStyle}>
          <div style={profileCardAuraStyle} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <FramedAvatar
              src={profile.profilePicture}
              username={profile.username}
              frameId={equipped.frame}
              effectId={equipped.visualEffect}
              size={142}
              className="cw-public-profile-hero-avatar"
              placeholder={profile.username?.[0]?.toUpperCase() || "?"}
            />

            <div
              className="cw-user-profile-name-row"
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
    className="cw-user-profile-seed-pill"
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
            {user?._id !== profile._id && (
              <button
                type="button"
                onClick={handleFriendAction}
                disabled={friendBusy}
                style={friendButtonStyle}
              >
                <FriendActionIcon variant={getFriendIconVariant()} />
                <span>{getFriendButtonLabel()}</span>
              </button>
            )}
          </div>
        </section>

        <section className="cw-user-profile-cosmetics" style={equippedPanelStyle}>
          <div style={sectionTitleRowStyle}>
            <div>
              <p style={smallKickerStyle}>active aura</p>
              <h3 style={panelTitleStyle}>Equipped Cosmetics</h3>
            </div>
          </div>

          <div className="cw-user-profile-cosmetic-grid" style={cosmeticGridStyle}>
            <CosmeticChip item={badgeItem} fallback="Badge" />
            <CosmeticChip item={frameItem} fallback="Frame" />
            <CosmeticChip item={titleItem} fallback="Title" />
            <CosmeticChip item={postThemeItem} fallback="Post Theme" />
          </div>
        </section>

        <div className="cw-user-profile-posts-header" style={sectionHeaderStyle}>
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
            const themeStyle = getPostThemeStyle(
              getConfessionThemeId(p, equipped, p.userId || profile),
              "grove"
            );
            const moodStyle = getMoodChipStyle(p.mood);
            const pollVotes = getPollTotalVotes(p.poll);
            const contentWarning = normalizeContentWarning(p.contentWarning);
            const hasContentWarning = contentWarning.enabled;
            const isSensitiveRevealed = Boolean(
              revealedSensitiveByPost[String(p._id)]
            );
            const hideSensitiveContent =
              shouldBlurSensitiveContent(contentWarning) && !isSensitiveRevealed;
            const postImages = getConfessionImages(p);

            return (
              <Link
                to={`/confession/${p._id}`}
                key={p._id}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  className="cw-user-profile-post-card"
                  style={{
                    ...postCardStyle,
                    ...themeStyle,
                    position: "relative",
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "10px",
                    }}
                  >
                    {moodStyle ? (
                      <span style={moodStyle}>{p.mood}</span>
                    ) : (
                      <span style={postMetaPillStyle}>Whisper</span>
                    )}

                    {p.poll?.question ? (
                      <span style={postMetaPillStyle}>
                        Poll · {pollVotes} vote{pollVotes !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>

                  {hasContentWarning && (
                    <div
                      style={{
                        marginBottom: "10px",
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "fit-content",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 9px",
                          borderRadius: "999px",
                          border: "1px solid rgba(180,255,180,0.24)",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(224,255,216,0.84)",
                          fontSize: "11px",
                        }}
                      >
                        Content warning
                        {contentWarning.category
                          ? `: ${contentWarning.category}`
                          : ""}
                      </span>

                      {contentWarning.note && (
                        <p
                          style={{
                            margin: 0,
                            color: "rgba(224,255,216,0.75)",
                            fontSize: "11px",
                            lineHeight: 1.5,
                          }}
                        >
                          {contentWarning.note}
                        </p>
                      )}

                      {hideSensitiveContent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRevealedSensitiveByPost((prev) => ({
                              ...prev,
                              [String(p._id)]: true,
                            }));
                          }}
                          style={{
                            width: "fit-content",
                            border: "1px solid rgba(180,255,180,0.36)",
                            background: "rgba(255,255,255,0.1)",
                            color: "rgba(235,255,225,0.92)",
                            borderRadius: "999px",
                            padding: "6px 12px",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontFamily: "Georgia, serif",
                          }}
                        >
                          Show confession
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                    <p
                      style={{
                        ...postTextStyle,
                        margin: 0,
                        filter: hideSensitiveContent ? "blur(8px)" : "none",
                        userSelect: hideSensitiveContent ? "none" : "text",
                        transition: "filter 0.18s ease",
                      }}
                    >
                      {p.message}
                    </p>
                    {hideSensitiveContent && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.12)",
                        }}
                      />
                    )}
                  </div>

                  {postImages.length > 0 && (
                    <div
                      className="confession-image-scroller confession-image-scroller--profile"
                      style={{ marginBottom: "0.75rem" }}
                    >
                      <div className="confession-image-scroller__track">
                        {postImages.map((src, index) => (
                          <div
                            className="confession-image-scroller__item"
                            key={`${src}-${index}`}
                          >
                            <img
                              src={src}
                              alt={`confession attachment ${index + 1}`}
                              loading="lazy"
                              decoding="async"
                              style={{
                                ...postImageStyle,
                                marginBottom: 0,
                                filter: hideSensitiveContent ? "blur(12px)" : "none",
                                transition: "filter 0.18s ease",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      {postImages.length > 1 && (
                        <div className="confession-image-scroller__count">
                          {postImages.length} images
                        </div>
                      )}
                      {hideSensitiveContent && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "12px",
                            background: "rgba(0,0,0,0.12)",
                          }}
                        />
                      )}
                    </div>
                  )}

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

const friendButtonStyle = {
  margin: "14px auto 0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  minHeight: "38px",
  padding: "6px 13px 6px 8px",
  borderRadius: "999px",
  border: "1px solid rgba(232, 214, 150, 0.34)",
  background: "rgba(255, 244, 190, 0.035)",
  color: "rgba(247, 238, 190, 0.96)",
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: "11.5px",
  fontWeight: 800,
  letterSpacing: "0.085em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 10px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)",
};

const friendIconWrapStyle = {
  position: "relative",
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  color: "rgba(245, 226, 145, 0.98)",
  background: "radial-gradient(circle at 35% 25%, rgba(255,242,168,0.20), rgba(255,242,168,0.04) 48%, rgba(0,0,0,0.10))",
  boxShadow: "0 0 14px rgba(245, 211, 97, 0.18)",
  flexShrink: 0,
};

const friendIconPingStyle = {
  position: "absolute",
  right: "2px",
  top: "2px",
  width: "6px",
  height: "6px",
  borderRadius: "999px",
  background: "rgba(255, 219, 92, 0.95)",
  boxShadow: "0 0 10px rgba(255, 219, 92, 0.8)",
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

const postMetaPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(168, 232, 160, 0.22)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(224,255,216,0.82)",
  fontSize: "11px",
  letterSpacing: "0.04em",
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
