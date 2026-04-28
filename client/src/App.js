import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ConfessionPage from "./pages/ConfessionPage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import UserProfile from "./pages/UserProfile";
import ThrivingGrove from "./pages/ThrivingGrove";
import ScorchedLands from "./pages/ScorchedLands";
import { useAuth } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import "./AppStyle.css";

const HIDE_NAVBAR_ROUTES = ["/login", "/register", "/admin"];

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDE_NAVBAR_ROUTES.includes(location.pathname)) return null;

  return (
    <header className="navbar" style={{
      backgroundImage: "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('/forest.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
        <Link to="/" style={{ fontWeight: 800, letterSpacing: 1, color: "white", textDecoration: "none" }}>
          Confession Wall
        </Link>

        {/* Grove / Scorched nav links */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link to="/grove" style={{
              fontSize: "12px", fontFamily: "Georgia, serif",
              letterSpacing: "0.06em", textDecoration: "none",
              padding: "5px 14px", borderRadius: "20px",
              border: `0.5px solid ${location.pathname === "/grove" ? "rgba(29,158,117,0.7)" : "rgba(255,255,255,0.2)"}`,
              background: location.pathname === "/grove" ? "rgba(29,158,117,0.2)" : "transparent",
              color: location.pathname === "/grove" ? "#9FE1CB" : "rgba(255,255,255,0.6)",
              transition: "all 0.2s ease",
            }}>🌿 Grove</Link>

            <Link to="/scorched" style={{
              fontSize: "12px", fontFamily: "Georgia, serif",
              letterSpacing: "0.06em", textDecoration: "none",
              padding: "5px 14px", borderRadius: "20px",
              border: `0.5px solid ${location.pathname === "/scorched" ? "rgba(216,90,48,0.7)" : "rgba(255,255,255,0.2)"}`,
              background: location.pathname === "/scorched" ? "rgba(216,90,48,0.2)" : "transparent",
              color: location.pathname === "/scorched" ? "#F5C4B3" : "rgba(255,255,255,0.6)",
              transition: "all 0.2s ease",
            }}>🔥 Scorched</Link>
          </div>
        )}

        {user && (
          <div onClick={() => navigate("/settings")} style={{ cursor: "pointer" }}>
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="profile" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid white" }} />
            ) : (
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white" }}>
                {user.username[0].toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function App() {
  const [theme] = useState(() => {
    try { return localStorage.getItem("cw_theme") || "system"; }
    catch { return "system"; }
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = (t) => {
      if (t === "system") {
        const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", isDark);
      } else {
        root.classList.toggle("dark", t === "dark");
      }
    };
    apply(theme);
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => { if (theme === "system") apply("system"); };
    if (mq && mq.addEventListener) mq.addEventListener("change", handle);
    return () => { if (mq && mq.removeEventListener) mq.removeEventListener("change", handle); };
  }, [theme]);

  return (
    <AdminAuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/confession/:id" element={<ConfessionPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/grove" element={<ThrivingGrove />} />
          <Route path="/scorched" element={<ScorchedLands />} />
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
}

export default App;