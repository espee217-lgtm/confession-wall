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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Login failed");
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
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
      }}>

        {/* Logo/Title */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            fontSize: "28px",
            fontWeight: "700",
            color: "white",
            letterSpacing: "-0.5px",
            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            <img
              src="/logo.png"
              alt="C"
              style={{
                height: "52px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
              }}
            />
            onfession Wall
          </div>
          <p style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "14px",
            marginTop: "6px",
          }}>
            Welcome back
          </p>
        </div>

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

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
            style={{
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
            }}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.25)",
              marginBottom: "20px",
              background: "rgba(255,255,255,0.12)",
              color: "white",
              fontSize: "15px",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.22)",
              color: "white",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease",
              letterSpacing: "0.3px",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.2rem", color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "white", fontWeight: "600", textDecoration: "none" }}>
            Register
          </Link>
        </p>

        <p style={{ textAlign: "center", marginTop: "0.5rem", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
          Admin?{" "}
          <Link to="/admin" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}