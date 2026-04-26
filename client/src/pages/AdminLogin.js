import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const BG_IMAGES = [
  "https://i.postimg.cc/RVLGkGGH/Lord-Krishna.jpg",  
  "https://i.pinimg.com/736x/3b/de/be/3bdebe37f3e3e6109bf3ee87ed79abcc.jpg",
  "https://i.pinimg.com/1200x/46/a8/c6/46a8c6b7486d303c54b3adfaf73bc09f.jpg",
  "https://variety.com/wp-content/uploads/2022/05/One-Indian-Girl-res.jpg?w=1000&h=563&crop=1",
  "https://i.pinimg.com/736x/5f/63/b1/5f63b12b594b07fc6c64aa55c1600347.jpg",
];

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [fade, setFade] = useState(true);
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();

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
    setLoading(true);
    try {
      const res = await fetch("https://confession-wall-hn63.onrender.com/api/admin/login", {
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
        transition: "opacity 0.8s ease", opacity: fade ? 1 : 0,
      }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1 }} />

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
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "24px", padding: "2.5rem",
        width: "100%", maxWidth: "400px", margin: "0 1rem",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🛡️</div>
          <div style={{ fontSize: "26px", fontWeight: "700", color: "white", letterSpacing: "-0.5px", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            Admin Login
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "6px" }}>
            Restricted access only
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(220,53,69,0.2)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: "10px", padding: "10px 14px", color: "#ffaaaa", fontSize: "14px", marginBottom: "1rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: "20px" }} />

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.22)", color: "white",
            fontSize: "15px", fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            backdropFilter: "blur(8px)", transition: "all 0.2s ease",
          }}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.2rem", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
          Not an admin?{" "}
          <a href="/login" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontWeight: "600" }}>Go back</a>
        </p>
      </div>
    </div>
  );
}
