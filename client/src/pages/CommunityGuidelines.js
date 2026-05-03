import { Link } from "react-router-dom";

const pageStyle = {
  minHeight: "100vh",
  padding: "90px 18px",
  background: "#020806",
  color: "#eaffdf",
  fontFamily: "Georgia, serif",
  position: "relative",
  overflow: "hidden",
};

const cardStyle = {
  maxWidth: "820px",
  margin: "0 auto",
  padding: "38px 42px",
  borderRadius: "26px",
  background: "rgba(4, 22, 10, 0.56)",
  border: "1px solid rgba(160, 255, 180, 0.18)",
  boxShadow:
    "0 20px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const sectionStyle = {
  marginTop: "24px",
  padding: "18px 20px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(160,255,180,0.11)",
};

const h1Style = {
  margin: "0 0 12px",
  fontSize: "38px",
  letterSpacing: "0.04em",
  color: "#f1ffe8",
  textShadow: "0 0 18px rgba(150,255,160,0.35)",
};

const h3Style = {
  margin: "0 0 10px",
  fontSize: "20px",
  color: "#bfffc8",
  letterSpacing: "0.04em",
};

const pStyle = {
  margin: 0,
  fontSize: "16px",
  lineHeight: 1.75,
  color: "rgba(235,255,225,0.86)",
};

export default function CommunityGuidelines() {
  return (
  <div style={pageStyle}>
    <span className="page-firefly page-firefly-1" />
<span className="page-firefly page-firefly-2" />
<span className="page-firefly page-firefly-3" />
<span className="page-firefly page-firefly-4" />
<span className="page-firefly page-firefly-5" />
<span className="page-firefly page-firefly-6" />
    {/* Dark atmosphere overlay */}
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at center, rgba(20,60,35,0.18), rgba(0,0,0,0.92))",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />

    {/* Krishna - same Home.js proportion */}
    <img
      src="/krishna.png"
      alt=""
      style={{
        position: "fixed",
        left: 0,
        bottom: 0,
        maxHeight: "130%",
        maxWidth: "45vw",
        objectFit: "contain",
        opacity: 0.52,
        pointerEvents: "none",
        transform: "translateX(17%) translateY(6%) scale(1.43)",
        filter:
          "drop-shadow(0 0 18px rgba(120,255,180,0.28))",
        zIndex: 1,
      }}
    />

    {/* Demon - same Home.js proportion */}
    <img
      src="/Demon.png"
      alt=""
      style={{
        position: "fixed",
        right: 0,
        bottom: 0,
        maxHeight: "130%",
        maxWidth: "45vw",
        objectFit: "contain",
        opacity: 0.52,
        pointerEvents: "none",
        transform: "translateX(-17%) translateY(6%) scale(1.43)",
        filter:
          "drop-shadow(0 0 18px rgba(255,80,60,0.25))",
        zIndex: 1,
      }}
    />

    {/* Reading card */}
    <div style={{ ...cardStyle, position: "relative", zIndex: 2 }}>
        <Link
          to="/"
          style={{
            color: "#9FE1CB",
            textDecoration: "none",
            fontSize: "13px",
            letterSpacing: "0.08em",
          }}
        >
          ← back to wall
        </Link>

        <h1 style={h1Style}>Community Guidelines</h1>

        <p style={{ ...pStyle, fontSize: "17px" }}>
          Confession Wall is a space for honest expression, anonymous thoughts,
          and emotional release — but it must remain safe, respectful, and
          moderated.
        </p>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Allowed</h3>
          <p style={pStyle}>
            Personal thoughts, anonymous confessions, emotional experiences,
            respectful discussions, light humor, and supportive replies.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Not Allowed</h3>
          <p style={pStyle}>
            Harassment, hate speech, threats, sexual exploitation, doxxing,
            spam, impersonation, targeted abuse, or content encouraging harm.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Moderation</h3>
          <p style={pStyle}>
            Posts and comments can be reported. Admins may review, resolve,
            remove, or restrict content and accounts when needed to protect the
            community. Some safety actions may use internal account, timestamp,
            report, and security information.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Remember</h3>
          <p style={pStyle}>
            Anonymous does not mean consequence-free. Use the platform
            responsibly and do not use anonymity to harm others. Public posts may
            look anonymous, but the platform is still moderated for safety.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Need Help?</h3>
          <p style={pStyle}>
            If you see dangerous, abusive, targeted, or privacy-invasive content,
            report it from the post or comment menu so an admin can review it.
          </p>
        </div>
      </div>
    </div>
  );
}