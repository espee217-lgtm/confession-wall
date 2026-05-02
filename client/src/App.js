import React, { useEffect, useRef, useState } from "react";
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
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");


function NotificationBell() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

  const fetchUnreadCount = async () => {
    if (!user || !token) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: authHeaders,
      });

      if (!res.ok) return;

      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error("Fetch unread notifications error:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!user || !token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: authHeaders,
      });

      if (!res.ok) return;

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.read).length : 0);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      await fetchNotifications();
    }
  };

  const markOneAsRead = async (notification) => {
    if (!notification?.read) {
      try {
        await fetch(`${API_BASE}/api/notifications/${notification._id}/read`, {
          method: "PATCH",
          headers: authHeaders,
        });

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, read: true } : item
          )
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      } catch (err) {
        console.error("Mark notification read error:", err);
      }
    }

    setOpen(false);
    navigate(notification.link || "/");
  };

  const markAllAsRead = async (event) => {
    event.stopPropagation();

    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders,
      });

      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all notifications read error:", err);
    }
  };

  const formatNotificationTime = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user || !token) return null;

  return (
    <div ref={bellRef} style={{ position: "relative", justifySelf: "end" }}>
      <button
        type="button"
        onClick={openDropdown}
        title="Notifications"
        style={{
          position: "relative",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          border: "1px solid rgba(190,255,190,0.38)",
          background:
            "radial-gradient(circle at top, rgba(215,255,166,0.35), rgba(12,45,20,0.92))",
          color: "#f4ffe8",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          boxShadow: "0 0 18px rgba(120,255,180,0.28)",
          margin: 0,
          padding: 0,
        }}
      >
        🔔

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-7px",
              minWidth: "18px",
              height: "18px",
              padding: "0 5px",
              borderRadius: "999px",
              background: "#ff3b3b",
              color: "white",
              fontSize: "11px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(10,28,12,0.95)",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "52px",
            right: 0,
            width: "340px",
            maxHeight: "430px",
            overflowY: "auto",
            background:
              "linear-gradient(180deg, rgba(9,30,13,0.98), rgba(3,14,6,0.98))",
            border: "1px solid rgba(145,220,145,0.28)",
            borderRadius: "16px",
            boxShadow: "0 18px 50px rgba(0,0,0,0.65)",
            zIndex: 5000,
            color: "#efffde",
            textAlign: "left",
            padding: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "8px 8px 12px",
              borderBottom: "1px solid rgba(150,220,150,0.18)",
              marginBottom: "6px",
            }}
          >
            <strong style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Notifications
            </strong>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  margin: 0,
                  padding: "6px 8px",
                  borderRadius: "10px",
                  border: "1px solid rgba(170,255,170,0.28)",
                  background: "rgba(130,255,150,0.12)",
                  color: "#caffc5",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "18px", color: "rgba(235,255,225,0.7)" }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "18px", color: "rgba(235,255,225,0.7)" }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                type="button"
                key={notification._id}
                onClick={() => markOneAsRead(notification)}
                style={{
                  width: "100%",
                  margin: "0 0 7px",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: notification.read
                    ? "1px solid rgba(160,210,160,0.12)"
                    : "1px solid rgba(140,255,150,0.35)",
                  background: notification.read
                    ? "rgba(255,255,255,0.045)"
                    : "rgba(100,255,135,0.13)",
                  color: "#efffde",
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: notification.read
                    ? "none"
                    : "0 0 16px rgba(110,255,140,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  {!notification.read && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#7dff8a",
                        marginTop: "6px",
                        flex: "0 0 auto",
                        boxShadow: "0 0 10px rgba(125,255,138,0.9)",
                      }}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", lineHeight: 1.35 }}>
                      {notification.message}
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "11px",
                        color: "rgba(230,255,220,0.55)",
                      }}
                    >
                      {formatNotificationTime(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
          gridTemplateColumns: "1fr auto 1fr",
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
    justifySelf: "start",
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
            style={{
              justifySelf: "end",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              onClick={() => navigate("/settings")}
              style={{
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
          <NotificationBell />
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