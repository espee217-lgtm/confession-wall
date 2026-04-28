import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

const BG_IMAGES = [
  "https://i.pinimg.com/736x/3b/de/be/3bdebe37f3e3e6109bf3ee87ed79abcc.jpg",
  "https://i.pinimg.com/1200x/46/a8/c6/46a8c6b7486d303c54b3adfaf73bc09f.jpg",
  "https://variety.com/wp-content/uploads/2022/05/One-Indian-Girl-res.jpg?w=1000&h=563&crop=1",
  "https://i.pinimg.com/736x/5f/63/b1/5f63b12b594b07fc6c64aa55c1600347.jpg",
];

const WORD1 = ["C","o","n","f","e","s","s","i","o","n"];
const WORD2 = ["W","a","l","l"];

const REDS1 = ["#7a1515","#7a1515","#8b1a1a","#6b1111","#9c2020","#7a1515","#8b1a1a","#6b1111","#9c2020","#7a1515"];
const REDS2 = ["#9c2020","#8b1a1a","#7a1515","#6b1111"];

const WAVE1 = [4, 4, 0, -4, -8, -10, -8, -4, 0, 4];
const WAVE2 = [8, 4, 0, 4];

const cardBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "7px",
  fontFamily: "Georgia, serif",
  fontSize: "17px",
  fontWeight: "700",
  color: "#f5c0c0",
  boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
  flexShrink: 0,
  transition: "transform 0.2s ease",
};

function LetterCard({ letter, bg, waveY }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardBase,
        background: bg,
        transform: `translateY(${hovered ? waveY - 6 : waveY}px) scale(${hovered ? 1.12 : 1})`,
      }}
    >
      {letter}
    </span>
  );
}

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [fade, setFade] = useState(true);

  // OTP state
  const [step, setStep] = useState(1); // 1 = form, 2 = otp
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    setProfilePicture(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to send OTP"); setLoading(false); return; }
      setStep(2);
      startResendTimer();
    } catch (err) {
      setError("Could not send OTP. Check your connection.");
    }
    setLoading(false);
  };

  // Step 2: Verify OTP + Create Account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("otp", otp);
      if (profilePicture) formData.append("profilePicture", profilePicture);

      const res = await fetch(`${API_URL}/register`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Registration failed"); setLoading(false); return; }
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      setOtp("");
      startResendTimer();
    } catch { setError("Could not resend OTP."); }
    setLoading(false);
  };

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

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Background slideshow */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${BG_IMAGES[currentBg]})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "opacity 0.8s ease",
        opacity: fade ? 1 : 0,
        zIndex: 0,
      }} />

      {/* Dark overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.45)",
        zIndex: 1,
      }} />

      {/* Dot indicators */}
      <div style={{
        position: "absolute",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
        zIndex: 3,
      }}>
        {BG_IMAGES.map((_, i) => (
          <div key={i} onClick={() => setCurrentBg(i)} style={{
            width: i === currentBg ? "24px" : "8px",
            height: "8px",
            borderRadius: "4px",
            background: i === currentBg ? "white" : "rgba(255,255,255,0.4)",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      {/* Glassmorphism card */}
      <div style={{
        position: "relative",
        zIndex: 2,
        background: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        borderRadius: "24px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "400px",
        margin: "0 1rem",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>

        {/* Logo / Title — always visible */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            gap: "4px", flexWrap: "nowrap", paddingBottom: "6px",
          }}>
            {WORD1.map((letter, i) => (
              <LetterCard key={i} letter={letter} bg={REDS1[i]} waveY={WAVE1[i]} />
            ))}
          </div>
          <div style={{
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            gap: "4px", flexWrap: "nowrap", paddingBottom: "14px",
          }}>
            {WORD2.map((letter, i) => (
              <LetterCard key={i} letter={letter} bg={REDS2[i]} waveY={WAVE2[i]} />
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", marginTop: "2px" }}>
            {step === 1 ? "Create your account" : "Verify your email"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(220,53,69,0.2)",
            border: "1px solid rgba(220,53,69,0.4)",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#ffaaaa",
            fontSize: "14px",
            marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        {/* ── STEP 1: Original registration form ── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.2rem" }}>
              {preview ? (
                <img src={preview} alt="preview" style={{
                  width: "80px", height: "80px", borderRadius: "50%",
                  objectFit: "cover", marginBottom: "10px",
                  border: "2px solid rgba(255,255,255,0.4)",
                }} />
              ) : (
                <div style={{
                  width: "80px", height: "80px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)", marginBottom: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2rem", border: "2px dashed rgba(255,255,255,0.3)",
                }}>👤</div>
              )}
              <label style={{
                cursor: "pointer", padding: "6px 16px", borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)",
                fontSize: "13px", background: "rgba(255,255,255,0.1)",
              }}>
                Upload Photo
                <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
              </label>
            </div>

            <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} required style={inputStyle} />
            <input type="email" name="email" placeholder="Email address" value={form.email} onChange={handleChange} required style={inputStyle} />
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required style={{ ...inputStyle, marginBottom: "20px" }} />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px", borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.22)",
                color: "white", fontSize: "15px", fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                backdropFilter: "blur(8px)", transition: "all 0.2s ease", letterSpacing: "0.3px",
              }}
            >
              {loading ? "Sending OTP…" : "Send OTP →"}
            </button>

            <p style={{ textAlign: "center", marginTop: "1.2rem", color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "white", fontWeight: "600", textDecoration: "none" }}>Login</Link>
            </p>
          </form>
        )}

        {/* ── STEP 2: OTP screen (same card, same styling) ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndRegister}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", textAlign: "center", marginBottom: "4px" }}>
              A 6-digit code was sent to
            </p>
            <p style={{ color: "white", fontWeight: "600", fontSize: "14px", textAlign: "center", marginBottom: "20px" }}>
              {form.email}
            </p>

            <input
              type="text"
              placeholder="· · · · · ·"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
              style={{ ...inputStyle, fontSize: "28px", textAlign: "center", letterSpacing: "0.5em", fontWeight: "700", marginBottom: "20px" }}
            />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{
                width: "100%", padding: "13px", borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: otp.length === 6 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                color: otp.length === 6 ? "white" : "rgba(255,255,255,0.35)",
                fontSize: "15px", fontWeight: "600",
                cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
                backdropFilter: "blur(8px)", transition: "all 0.2s ease", letterSpacing: "0.3px",
              }}
            >
              {loading ? "Verifying…" : "Create Account"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px" }}>
              <button type="button" onClick={() => { setStep(1); setOtp(""); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: "13px", cursor: "pointer", padding: 0 }}>
                ← Change details
              </button>
              <button type="button" onClick={handleResend} disabled={resendTimer > 0}
                style={{ background: "none", border: "none", color: resendTimer > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)", fontSize: "13px", cursor: resendTimer > 0 ? "default" : "pointer", padding: 0 }}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
