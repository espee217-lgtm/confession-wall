import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AppStyle.css";

const API_URL =
  process.env.REACT_APP_API_BASE
    ? `${process.env.REACT_APP_API_BASE}/api/auth`
    : window.location.hostname === "localhost"
    ? "http://localhost:5000/api/auth"
    : "https://confession-wall-hn63.onrender.com/api/auth";

const BG_IMAGES = [
  "https://i.pinimg.com/736x/3b/de/be/3bdebe37f3e3e6109bf3ee87ed79abcc.jpg",
  "https://i.pinimg.com/1200x/46/a8/c6/46a8c6b7486d303c54b3adfaf73bc09f.jpg",
  "https://i.pinimg.com/736x/5f/63/b1/5f63b12b594b07fc6c64aa55c1600347.jpg",
];

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.25)",
  marginBottom: "12px",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentBg((prev) => (prev + 1) % BG_IMAGES.length);
        setFade(true);
      }, 800);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not send reset code.");
        return;
      }

      setMessage(data.message || "Reset code sent.");
      setTimeout(() => navigate("/reset-password", { state: { email } }), 800);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG_IMAGES[currentBg]})`, backgroundSize: "cover", backgroundPosition: "center", transition: "opacity 0.8s ease", opacity: fade ? 1 : 0, zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1 }} />

      <div style={{ position: "relative", zIndex: 2, background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: "24px", padding: "2.5rem", width: "100%", maxWidth: "400px", margin: "0 1rem", boxShadow: "0 8px 40px rgba(0,0,0,0.3)", color: "white" }}>
        <h2 style={{ textAlign: "center", fontFamily: "Georgia, serif", marginTop: 0 }}>Reset Password</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.72)", fontSize: "14px", lineHeight: 1.6 }}>
          Enter your account email. We&apos;ll send a 6-digit reset code.
        </p>

        {error && <div style={{ background: "rgba(220,53,69,0.2)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: "10px", padding: "10px 14px", color: "#ffaaaa", fontSize: "14px", marginBottom: "1rem" }}>{error}</div>}
        {message && <div style={{ background: "rgba(70,180,90,0.2)", border: "1px solid rgba(100,255,140,0.35)", borderRadius: "10px", padding: "10px 14px", color: "#bfffc1", fontSize: "14px", marginBottom: "1rem" }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required style={inputStyle} />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.22)", color: "white", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.2rem", color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
          Remembered it? <Link to="/login" style={{ color: "white", fontWeight: "600", textDecoration: "none" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}