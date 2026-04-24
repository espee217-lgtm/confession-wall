import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        body: formData,
      });
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
        <h2 style={{ margin: "0 0 1.5rem", textAlign: "center", color: "white" }}>Create Account</h2>

        {error && <p style={{ color: "#ffcccc", marginBottom: "1rem" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1rem" }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px" }} />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>👤</div>
            )}
            <label className="attach-btn" style={{ marginTop: 0 }}>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
            </label>
          </div>

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.3)", marginBottom: "12px", background: "rgba(255,255,255,0.15)", color: "white", boxSizing: "border-box" }}
          />
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
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem", color: "rgba(255,255,255,0.8)" }}>
          Already have an account? <Link to="/login" style={{ color: "white", fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
