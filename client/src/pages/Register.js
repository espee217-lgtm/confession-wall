import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

const BG_IMAGES = [
  "https://res.cloudinary.com/dudgqif7u/image/upload/v1777024160/Screenshot_2026-04-24_150840_zyvafb.png",
  "https://i.pinimg.com/1200x/73/7f/a9/737fa9dd823b643ae15989d3a94dd271.jpg",
  "https://variety.com/wp-content/uploads/2022/05/One-Indian-Girl-res.jpg?w=1000&h=563&crop=1",
  "https://i.pinimg.com/736x/5f/63/b1/5f63b12b594b07fc6c64aa55c1600347.jpg",
];

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (profilePicture) formData.append("profilePicture", profilePicture);
      const res = await fetch(`${API_URL}/register`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Registration failed");
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
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
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${BG_IMAGES[currentBg]})`,
        backgroundSize: "cover", backgroundPosition: "center",
        transition: "opacity 0.8s ease", opacity: fade ? 1 : 0, zIndex: 0,
      }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1 }} />

      <div style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 3 }}>
        {BG_IMAGES.map((_, i) => (
          <div key={i} onClick={() => setCurrentBg(i)} style={{
            width: i === currentBg ? "24px" : "8px", height: "8px", borderRadius: "4px",
            background: i === currentBg ? "white" : "rgba(255,255,255,0.4)",
            cursor: "pointer", transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      <div style={{
        position: "relative", zIndex: 2,
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "24px", padding: "2.5rem",
        width: "100%", maxWidth: "400px", margin: "0 1rem",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "white", letterSpacing: "-0.5px", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            Confession Wall
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", marginTop: "6px" }}>Create your account</p>
        </div>

        {error && (
          <div style={{ background: "rgba(220,53,69,0.2)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: "10px", padding: "10px 14px", color: "#ffaaaa", fontSize: "14px", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.2rem" }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px", border: "2px solid rgba(255,255,255,0.4)" }} />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", border: "2px dashed rgba(255,255,255,0.3)" }}>👤</div>
            )}
            <label style={{ cursor: "pointer", padding: "6px 16px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)", fontSize: "13px", background: "rgba(255,255,255,0.1)" }}>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
            </label>
          </div>

          <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} required style={inputStyle} />
          <input type="email" name="email" placeholder="Email address" value={form.email} onChange={handleChange} required style={inputStyle} />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required style={{ ...inputStyle, marginBottom: "20px" }} />

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.22)", color: "white",
            fontSize: "15px", fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            backdropFilter: "blur(8px)", transition: "all 0.2s ease",
          }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.2rem", color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "white", fontWeight: "600", textDecoration: "none" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}