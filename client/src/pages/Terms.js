import { Link } from "react-router-dom";

const pageStyle = {
  minHeight: "100vh",
  padding: "90px 18px",
  background: "#020806",
  color: "#eaffdf",
  fontFamily: "Georgia, serif",
  position: "relative",
  overflowX: "hidden",
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

export default function Terms() {
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

      {/* Krishna left */}
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
          opacity: 0.42,
          pointerEvents: "none",
          transform: "translateX(17%) translateY(6%) scale(1.43)",
          filter: "drop-shadow(0 0 18px rgba(120,255,180,0.28))",
          zIndex: 1,
        }}
      />

      {/* Demon right */}
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
          opacity: 0.42,
          pointerEvents: "none",
          transform: "translateX(-17%) translateY(6%) scale(1.43)",
          filter: "drop-shadow(0 0 18px rgba(255,80,60,0.25))",
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

        <h1 style={h1Style}>Terms of Use</h1>

        <p style={{ ...pStyle, fontSize: "17px" }}>
          By using Confession Wall, you agree to use the platform responsibly
          and respect the safety of other users.
        </p>

        <div style={sectionStyle}>
          <h3 style={h3Style}>User Content</h3>
          <p style={pStyle}>
            You are responsible for the posts, comments, images, and reactions
            you submit. Do not upload illegal, harmful, abusive, or misleading
            content.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Moderation Rights</h3>
          <p style={pStyle}>
            We may remove posts, comments, reports, or accounts that violate our
            rules or harm the community experience.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Account Access</h3>
          <p style={pStyle}>
            Admins may restrict, suspend, ban, or delete abusive accounts if
            required for safety, moderation, or platform stability.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Anonymous but Moderated</h3>
          <p style={pStyle}>
            Confession Wall may hide your identity from other users, but it is
            not an unmoderated or consequence-free space. For safety and abuse
            prevention, activity may be reviewed internally with account,
            timestamp, report, and security information.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Security and Abuse Prevention</h3>
          <p style={pStyle}>
            Important activity such as logins, account creation, posts, and
            comments may be logged for security, moderation, and legal
            compliance. Do not use the platform to harass, threaten, impersonate,
            expose private information, or harm others.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Contact</h3>
          <p style={pStyle}>
            For moderation concerns, safety issues, or account-related questions,
            contact the site administrator through the official contact email
            provided by the site owner.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>No Guarantee</h3>
          <p style={pStyle}>
            Confession Wall is provided as-is. Features, access, moderation
            rules, and availability may change over time.
          </p>
        </div>
      </div>
    </div>
  );
}