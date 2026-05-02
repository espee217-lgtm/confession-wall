import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

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
import BuddingLand from "./pages/BuddingLand";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import { useAuth } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import "./AppStyle.css";

const HIDE_NAVBAR_ROUTES = ["/login", "/register", "/admin", "/admin/dashboard"];
const HIDE_FOOTER_ROUTES = ["/login", "/register", "/admin", "/admin/dashboard"];

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDE_NAVBAR_ROUTES.includes(location.pathname)) return null;

  const navLinkStyle = (path, activeColor) => ({
    fontSize: "13px",
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    textDecoration: "none",
    padding: "8px 22px",
    borderRadius: "2px",
    color: location.pathname === path ? "#f3ffe6" : "rgba(225,245,210,0.72)",
    background:
      location.pathname === path
        ? "rgba(14,42,17,0.7)"
        : "rgba(3,14,5,0.3)",
    borderBottom:
      location.pathname === path
        ? `2px solid ${activeColor}`
        : "2px solid rgba(140,200,120,0.18)",
    boxShadow:
      location.pathname === path
        ? `0 6px 18px rgba(0,0,0,0.35), 0 0 12px ${activeColor}`
        : "0 4px 12px rgba(0,0,0,0.22)",
    transition: "all 0.22s ease",
  });

  return (
    <header
      className="navbar"
      style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.62)), url('/forest.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderBottom: "1px solid rgba(150,255,180,0.16)",
        boxShadow: "0 12px 38px rgba(0,0,0,0.55)",
        overflow: "visible",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr 90px",
          alignItems: "center",
          maxWidth: "1320px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "visible",
            textDecoration: "none",
          }}
        >
          <img
            src="/confession-logo.png"
            alt="Confession Wall"
            style={{
              width: "390px",
              height: "160px",
              objectFit: "contain",
              objectPosition: "left center",
              cursor: "pointer",
              marginTop: "-18px",
              marginBottom: "-28px",
              filter:
                "brightness(3) contrast(1.35) saturate(1.2) drop-shadow(0 0 26px rgba(150,255,160,0.85))",
            }}
          />
        </Link>

        {user && (
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <span className="nav-firefly nav-firefly-1" />
            <span className="nav-firefly nav-firefly-2" />
            <span className="nav-firefly nav-firefly-3" />
            <span className="nav-firefly nav-firefly-4" />
            <span className="nav-firefly nav-firefly-5" />
            <span className="nav-firefly nav-firefly-6" />
            <span className="nav-firefly nav-firefly-7" />

            <Link
              to="/grove"
              style={navLinkStyle("/grove", "rgba(115,220,150,0.75)")}
            >
              Grove
            </Link>

            <Link
              to="/budding"
              style={navLinkStyle("/budding", "rgba(220,200,115,0.75)")}
            >
              Budding
            </Link>

            <Link
              to="/scorched"
              style={navLinkStyle("/scorched", "rgba(225,105,70,0.75)")}
            >
              Scorched
            </Link>
          </div>
        )}

        {user && (
          <div
            onClick={() => navigate("/settings")}
            style={{
              justifySelf: "end",
              cursor: "pointer",
              padding: "3px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(120,255,180,0.4), rgba(255,220,120,0.18))",
              boxShadow: "0 0 18px rgba(120,255,180,0.35)",
            }}
          >
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="profile"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(255,255,255,0.75)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {user.username[0].toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "22px",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url('/forest.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderTop: "1px solid rgba(120,255,180,0.15)",
        fontSize: "13px",
        fontFamily: "Georgia, serif",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ marginBottom: "6px", opacity: 0.7 }}>
        © Confession Wall
      </div>

      <div>
        <Link
          to="/guidelines"
          style={{ margin: "0 12px", color: "#9FE1CB", textDecoration: "none" }}
        >
          Guidelines
        </Link>

        <Link
          to="/terms"
          style={{ margin: "0 12px", color: "#9FE1CB", textDecoration: "none" }}
        >
          Terms
        </Link>

        <Link
          to="/privacy"
          style={{ margin: "0 12px", color: "#9FE1CB", textDecoration: "none" }}
        >
          Privacy
        </Link>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const hideFooter = HIDE_FOOTER_ROUTES.includes(location.pathname);

  return (
    <>
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
        <Route path="/budding" element={<BuddingLand />} />
        <Route path="/guidelines" element={<CommunityGuidelines />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>

      {!hideFooter && <Footer />}
    </>
  );
}

function App() {
  const [theme] = useState(() => {
    try {
      return localStorage.getItem("cw_theme") || "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    const root = document.documentElement;

    const apply = (t) => {
      if (t === "system") {
        const isDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", isDark);
      } else {
        root.classList.toggle("dark", t === "dark");
      }
    };

    apply(theme);

    const mq =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

    const handle = () => {
      if (theme === "system") apply("system");
    };

    if (mq && mq.addEventListener) mq.addEventListener("change", handle);

    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener("change", handle);
    };
  }, [theme]);

  return (
    <AdminAuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AdminAuthProvider>
  );
}

export default App;