import { AnimatedBadge } from "../components/CosmeticFx";
import DisplayTitlePill from "../components/DisplayTitlePill";
import ForestEventBanner from "../components/ForestEventBanner";
import FramedAvatar from "../components/FramedAvatar";
import MobileBottomNav from "../components/MobileBottomNav";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPostThemeStyle } from "../utils/cosmetics";
import {
  getConfessionThemeId,
  getDisplayCosmetics,
} from "../utils/engagement";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const API_URL = `${API_BASE}/api/confessions/weekly-event`;

function formatRange(start, end) {
  if (!start || !end) return "";

  const startDate = new Date(start);
  const endDate = new Date(end);
  const inclusiveEnd = new Date(endDate.getTime() - 1000);

  return `${startDate.toLocaleDateString()} - ${inclusiveEnd.toLocaleDateString()}`;
}

function LeaderCard({ post, label, tone }) {
  if (!post) {
    return (
      <div style={{ ...leaderCardStyle, ...emptyLeaderStyle }}>
        <strong style={{ fontSize: "16px" }}>{label}</strong>
        <p style={{ margin: "8px 0 0", color: "rgba(235,255,225,0.66)" }}>
          No qualifying confession yet for this spot.
        </p>
      </div>
    );
  }

  const displayCosmetics = getDisplayCosmetics(post.userId);
  const themeId = getConfessionThemeId(post, displayCosmetics, post.userId);
  const themeStyle = getPostThemeStyle(themeId, tone === "burned" ? "scorched" : "grove");

  return (
    <Link
      to={`/confession/${post._id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <article
        style={{
          ...leaderCardStyle,
          ...themeStyle,
          borderColor:
            tone === "burned"
              ? "rgba(232, 104, 86, 0.34)"
              : "rgba(138, 226, 160, 0.26)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <FramedAvatar
            src={post.userId?.profilePicture}
            username={post.userId?.username || "?"}
            frameId={displayCosmetics.frame}
            effectId={displayCosmetics.visualEffect}
            size={46}
            placeholder={post.userId?.username?.[0]?.toUpperCase() || "?"}
          />

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <strong style={{ color: "#f0ffea", fontSize: "15px" }}>
                @{post.userId?.username || "anonymous"}{" "}
                <AnimatedBadge badgeId={displayCosmetics.badge} size="sm" />
              </strong>
              <DisplayTitlePill titleId={displayCosmetics.title} />
            </div>

            <div style={{ color: "rgba(220,255,212,0.64)", fontSize: "12px" }}>
              {label}
            </div>
          </div>
        </div>

        <p
          style={{
            margin: "0 0 12px",
            color: "#efffe8",
            lineHeight: 1.65,
          }}
        >
          {post.message}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            color: "rgba(220,255,212,0.72)",
            fontSize: "12px",
          }}
        >
          <span>🌱 {post.wateredCount || 0}</span>
          <span>🔥 {post.burnedCount || 0}</span>
          <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}</span>
        </div>
      </article>
    </Link>
  );
}

export default function WeeklyEventsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load weekly event status.");
        }

        if (!alive) return;
        setStatus(data);
      } catch (err) {
        console.error(err);
        if (alive) {
          window.cwToast?.(err.message || "Could not load weekly event status.", "error") ||
            alert(err.message || "Could not load weekly event status.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadStatus();

    return () => {
      alive = false;
    };
  }, []);

  const currentEvent = status?.currentEvent;

  return (
    <div style={pageStyle}>
      <div style={pageGlowTop} />
      <div style={pageGlowBottom} />

      <div style={pageInnerStyle}>
        <Link to="/" style={backLinkStyle}>
          ← return to the forest
        </Link>

        <ForestEventBanner />

        <section style={sectionCardStyle}>
          <div style={sectionKickerStyle}>current cycle</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "30px", color: "#f3ffe7" }}>
            Weekly Forest Ledger
          </h1>
          <p style={sectionBodyStyle}>
            Each weekly event tracks the leading confession created during that
            week. Seeds and the temporary Scorched aesthetic are finalized
            automatically shortly after the week closes.
          </p>

          {currentEvent && (
            <div style={metaRowStyle}>
              <span style={metaPillStyle}>{currentEvent.name}</span>
              <span style={metaPillStyle}>{formatRange(currentEvent.startsAt, currentEvent.endsAt)}</span>
              <span style={metaPillStyle}>
                {status?.candidateCount || 0} confession
                {status?.candidateCount === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionKickerStyle}>weekly leaderboard</div>
          {loading ? (
            <p style={sectionBodyStyle}>Loading the current weekly leaders...</p>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              <LeaderCard
                label="Most Watered Post of the Week"
                post={status?.leaderboard?.mostWateredPost}
                tone="watered"
              />
              <LeaderCard
                label="Most Burned Post of the Week"
                post={status?.leaderboard?.mostBurnedPost}
                tone="burned"
              />
            </div>
          )}
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionKickerStyle}>weekly rewards</div>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={rewardCardStyle}>
              <strong style={{ color: "#f3ffe7" }}>Most Watered</strong>
              <p style={sectionBodyStyle}>
                The winner receives 1000 Seeds once for the week through the
                automatic weekly payout.
              </p>
              <div style={rewardStatusStyle}>
                {status?.rewards?.mostWateredSeeds?.granted
                  ? `Granted to @${status.rewards.mostWateredSeeds.username}`
                  : "Waiting for week close"}
              </div>
            </div>

            <div style={rewardCardStyle}>
              <strong style={{ color: "#f3ffe7" }}>Most Burned</strong>
              <p style={sectionBodyStyle}>
                The winner receives a temporary ash-black Scorched takeover for
                7 days. It overrides visible frame and confession card styling
                only while active.
              </p>
              <div style={rewardStatusStyle}>
                {status?.rewards?.mostBurnedOverride?.granted
                  ? `Applied to @${status.rewards.mostBurnedOverride.username}`
                  : "Waiting for week close"}
              </div>
            </div>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionKickerStyle}>upcoming monthly cycle</div>
          <div style={{ display: "grid", gap: "10px" }}>
            {(status?.upcomingEvents || []).map((event, index) => (
              <div key={event.weekKey} style={cycleRowStyle}>
                <div>
                  <strong style={{ color: "#f3ffe7" }}>
                    Week {index + 1}: {event.name}
                  </strong>
                  <p style={{ ...sectionBodyStyle, margin: "4px 0 0" }}>
                    {event.description}
                  </p>
                </div>

                <span style={metaPillStyle}>
                  {formatRange(event.startsAt, event.endsAt)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionKickerStyle}>tracking note</div>
          <p style={sectionBodyStyle}>
            Exact per-reaction weekly timing is not stored yet. The leaderboard
            uses confessions created during the current weekly event period and
            compares their current Water and Burn totals.
          </p>
        </section>
      </div>

      <MobileBottomNav />
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  position: "relative",
  padding: "24px 16px 88px",
  background:
    "radial-gradient(circle at 16% 12%, rgba(112, 196, 116, 0.14), transparent 28%), radial-gradient(circle at 85% 18%, rgba(255, 132, 110, 0.1), transparent 24%), linear-gradient(180deg, #040d06 0%, #06150a 46%, #030906 100%)",
  color: "#e8ffe7",
  fontFamily: "Georgia, serif",
};

const pageGlowTop = {
  position: "fixed",
  top: "-140px",
  left: "10%",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "rgba(116, 232, 134, 0.08)",
  filter: "blur(72px)",
  pointerEvents: "none",
};

const pageGlowBottom = {
  position: "fixed",
  right: "8%",
  bottom: "-160px",
  width: "380px",
  height: "380px",
  borderRadius: "50%",
  background: "rgba(188, 74, 54, 0.1)",
  filter: "blur(86px)",
  pointerEvents: "none",
};

const pageInnerStyle = {
  position: "relative",
  zIndex: 1,
  maxWidth: "840px",
  margin: "0 auto",
};

const backLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "16px",
  color: "#b6e0b5",
  textDecoration: "none",
  fontSize: "13px",
  letterSpacing: "0.05em",
};

const sectionCardStyle = {
  marginTop: "16px",
  padding: "18px 20px",
  borderRadius: "22px",
  border: "1px solid rgba(138, 220, 152, 0.16)",
  background:
    "linear-gradient(145deg, rgba(8, 30, 13, 0.92), rgba(4, 15, 8, 0.96))",
  boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
};

const sectionKickerStyle = {
  margin: "0 0 8px",
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(190,255,184,0.62)",
};

const sectionBodyStyle = {
  margin: 0,
  color: "rgba(225,255,220,0.74)",
  lineHeight: 1.6,
  fontSize: "14px",
};

const metaRowStyle = {
  marginTop: "14px",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const metaPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(180, 255, 184, 0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(236,255,232,0.82)",
  fontSize: "11px",
};

const leaderCardStyle = {
  borderRadius: "18px",
  padding: "16px",
  border: "1px solid rgba(150, 220, 164, 0.18)",
  background:
    "linear-gradient(145deg, rgba(9, 30, 13, 0.94), rgba(3, 14, 7, 0.98))",
  boxShadow: "0 14px 38px rgba(0,0,0,0.22)",
};

const emptyLeaderStyle = {
  background: "rgba(255,255,255,0.04)",
};

const rewardCardStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(180,255,184,0.12)",
  background: "rgba(255,255,255,0.04)",
};

const rewardStatusStyle = {
  marginTop: "8px",
  color: "#dfffe3",
  fontSize: "12px",
  fontWeight: 700,
};

const cycleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(180,255,184,0.1)",
  background: "rgba(255,255,255,0.04)",
};
