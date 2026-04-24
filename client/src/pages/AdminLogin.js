import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Login failed");
      adminLogin(data.token);
      navigate("/admin/dashboard");
    } catch {
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
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🛡️</div>
          <h2 style={{ margin: 0, color: "white" }}>Admin Login</h2>
          <p style={{ margin: "0.4rem 0 0", color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            Restricted access only
          </p>
        </div>

        {error && (
          <p style={{ color: "#ffcccc", marginBottom: "1rem", textAlign: "center" }}>{error}</p>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.3)",
              marginBottom: "12px",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              boxSizing: "border-box",
              outline: "none",
              fontSize: "1rem",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.3)",
              marginBottom: "16px",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              boxSizing: "border-box",
              outline: "none",
              fontSize: "1rem",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.4)",
              backdropFilter: "blur(4px)",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.2rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
          Not an admin?{" "}
          <a href="/login" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, textDecoration: "none" }}>
            Go back
          </a>
        </p>
      </div>
    </div>
  );
}