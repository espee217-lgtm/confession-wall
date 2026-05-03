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

export default function Privacy() {
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

        <h1 style={h1Style}>Privacy Policy</h1>

        <p style={{ ...pStyle, fontSize: "17px" }}>
          We collect only the information needed to run Confession Wall, protect
          users, and moderate harmful behavior.
        </p>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Information We Store</h3>
          <p style={pStyle}>
            We may store username, email, hashed password, profile picture,
            bio, posts, comments, reactions, images, reports, timestamps, login
            activity, security logs, IP address information, and moderation
            history.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Anonymous Posts</h3>
          <p style={pStyle}>
            Posts may appear anonymous publicly, but the system may still store
            internal records that connect posts, comments, reports, timestamps,
            login activity, and technical security information to an account for
            moderation, abuse prevention, and safety.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Reports and Moderation</h3>
          <p style={pStyle}>
            Reports are visible to admins. They may include the reported post or
            comment, the reporter, the reason, report status, moderation notes,
            and relevant timestamps. Resolved reports may be kept for a limited
            time before cleanup.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Security Logs</h3>
          <p style={pStyle}>
            For safety, admin review, and abuse prevention, important events
            such as account login, account creation, post creation, and comment
            creation may be logged with timestamps and IP address information.
            Admin logs are automatically cleaned after 30 days.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Contact</h3>
          <p style={pStyle}>
            For moderation concerns, safety issues, privacy questions, or
            account-related requests, contact the site administrator through the
            official contact email provided by the site owner.
          </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={h3Style}>Data Removal</h3>
          <p style={pStyle}>
            Users may remove content where supported. Admins may also remove
            harmful content or accounts when needed.
          </p>
        </div>
      </div>
    </div>
  );
}