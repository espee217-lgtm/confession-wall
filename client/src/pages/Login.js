import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #007bff, #00bfff, #0056b3)",
      marginTop: "-80px",
      paddingTop: "80px",
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "20px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
      }}>
        <h2 style={{ margin: "0 0 1.5rem", textAlign: "center", color: "white" }}>Welcome Back</h2>

        {error && <p style={{ color: "#ffcccc", marginBottom: "1rem" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.3)", marginBottom: "12px", background: "rgba(255,255,255,0.15)", color: "white", boxSizing: "border-box" }}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.3)", marginBottom: "16px", background: "rgba(255,255,255,0.15)", color: "white", boxSizing: "border-box" }}
          />

          <button className="btn" type="submit" style={{ width: "100%", background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)", backdropFilter: "blur(4px)" }} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem", color: "rgba(255,255,255,0.8)" }}>
          Don't have an account? <Link to="/register" style={{ color: "white", fontWeight: 600 }}>Register</Link>
        </p>

        {/* 👇 Only this line was added */}
        <p style={{ textAlign: "center", marginTop: "0.5rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
          Admin? <Link to="/admin" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Login here</Link>
        </p>

      </div>
    </div>
  );
}