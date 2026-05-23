import ReenaKundaliPage from "./pages/ReenaKundaliPage";
import ReenaApologyPage from "./pages/ReenaApologyPage";
import ReenaTriviaPage from "./pages/ReenaTriviaPage";
import { connectSocket, disconnectSocket } from "./socket";
import React, { useEffect, useRef, useState } from "react";
import SpecialLogsAdminPage from "./pages/SpecialLogsAdminPage";
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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import RefundCancellationPolicy from "./pages/RefundCancellationPolicy";
import ContactSupport from "./pages/ContactSupport";
import ModerationReportPolicy from "./pages/ModerationReportPolicy";
import PressedLeaves from "./pages/PressedLeaves";
import ToastContainer from "./components/Toast";
import SearchPage from "./pages/SearchPage";
import ActivityPage from "./pages/ActivityPage";
import TrendingPage from "./pages/TrendingPage";
import * as ShopModule from "./pages/Shop";
import BuySeeds from "./pages/BuySeeds";
import ChoicePage from "./pages/ChoicePage";
import ReenaPage from "./pages/ReenaPage";
import WeeklyEventsPage from "./pages/WeeklyEventsPage";

import { useAuth } from "./context/AuthContext";
import FramedAvatar from "./components/FramedAvatar";
import { AnimatedBadge } from "./components/CosmeticFx";
import { getDisplayCosmetics } from "./utils/engagement";
import { applySeo, defaultSeo } from "./utils/seo";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import "./AppStyle.css";

const HIDE_NAVBAR_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/admin", "/admin/dashboard", "/choose", "/reena"];
const HIDE_FOOTER_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/admin", "/admin/dashboard", "/choose", "/reena"];
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const ROUTE_SEO = {
  "/": {
    title: defaultSeo.title,
    description: defaultSeo.description,
  },
  "/trending": {
    title: "Trending Confessions - Confession Wall",
    description: "Browse the most active anonymous confessions on Confession Wall.",
  },
  "/grove": {
    title: "Grove Confessions - Confession Wall",
    description: "Read confessions rising through the Grove with more comfort than fire.",
  },
  "/budding": {
    title: "Budding Confessions - Confession Wall",
    description: "Explore fresh and balanced confessions in the Budding realm.",
  },
  "/scorched": {
    title: "Scorched Confessions - Confession Wall",
    description: "Explore intense confessions from the Scorched realm.",
  },
  "/search": {
    title: "Search Confessions - Confession Wall",
    description: "Search public anonymous confessions across Confession Wall.",
  },
  "/weekly-events": {
    title: "Weekly Events - Confession Wall",
    description: "Follow weekly Confession Wall community events and realm activity.",
  },
  "/guidelines": {
    title: "Community Guidelines - Confession Wall",
    description: "Read the community guidelines for posting and reacting on Confession Wall.",
  },
  "/community-guidelines": {
    title: "Community Guidelines - Confession Wall",
    description: "Read the community guidelines for posting and reacting on Confession Wall.",
  },
  "/terms": {
    title: "Terms - Confession Wall",
    description: "Read the Confession Wall terms of use.",
  },
  "/privacy": {
    title: "Privacy Policy - Confession Wall",
    description: "Read the Confession Wall privacy policy.",
  },
  "/refund-policy": {
    title: "Refund & Cancellation Policy - Confession Wall",
    description: "Read the Confession Wall refund and cancellation policy for Seeds and digital credits.",
  },
  "/contact-support": {
    title: "Contact & Support - Confession Wall",
    description: "Contact Confession Wall for support, payment issues, safety concerns, and moderation appeals.",
  },
  "/moderation-policy": {
    title: "Moderation & Report Policy - Confession Wall",
    description: "Read how Confession Wall reviews reports and handles moderation decisions.",
  },
};

const NOINDEX_PATHS = [
  "/admin",
  "/admin/dashboard",
  "/admin/special-logs",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/settings",
  "/activity",
  "/pressed-leaves",
  "/choose",
  "/reena",
];

const humanizeMoodSlug = (slug) =>
  String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getSeoForPath = (pathname) => {
  if (ROUTE_SEO[pathname]) {
    return {
      ...ROUTE_SEO[pathname],
      robots: "index,follow",
    };
  }

  if (pathname.startsWith("/confession/")) {
    return {
      title: "Confession - Confession Wall",
      description: "Read an anonymous confession and join the Confession Wall community.",
      robots: "index,follow",
    };
  }

  if (pathname.startsWith("/user/")) {
    return {
      title: "Profile - Confession Wall",
      description: "View a public Confession Wall profile and their shared confessions.",
      robots: "index,follow",
    };
  }

  if (pathname.startsWith("/moods/")) {
    const mood = humanizeMoodSlug(pathname.replace("/moods/", ""));
    return {
      title: mood
        ? `${mood} Confessions - Confession Wall`
        : "Mood Confessions - Confession Wall",
      description: "Browse anonymous confessions by mood on Confession Wall.",
      robots: "index,follow",
    };
  }

  if (
    NOINDEX_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  ) {
    return {
      title: "Confession Wall",
      description: defaultSeo.description,
      robots: "noindex,nofollow",
    };
  }

  return {
    title: defaultSeo.title,
    description: defaultSeo.description,
    robots: "noindex,nofollow",
  };
};

function ShopRoute() {
  const Component = ShopModule.default || ShopModule.Shop;

  if (!Component || typeof Component !== "function") {
    console.error("Shop page import problem:", ShopModule);
    return (
      <main style={{ minHeight: "70vh", padding: "120px 24px", color: "#dfffd7" }}>
        Shop page failed to load. Check client/src/pages/Shop.js export.
      </main>
    );
  }

  return <Component />;
}

function ShopButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="nav-shop-btn"
      onClick={() => navigate("/shop")}
      title="Forest Shop"
      aria-label="Open Forest Shop"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
        <path d="M9 13h.01" />
        <path d="M15 13h.01" />
      </svg>
    </button>
  );
}


function SeedCounter() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id;

  useEffect(() => {
    if (!userId || !token || !refreshUser) return undefined;

    refreshUser();
    const interval = setInterval(refreshUser, 30000);

    return () => clearInterval(interval);
  }, [userId, token, refreshUser]);

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/buy-seeds")}
      title="Buy Seeds"
      aria-label="Buy Seeds"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 12px",
        borderRadius: "999px",
        background: "rgba(8,35,14,0.72)",
        border: "1px solid rgba(150,255,165,0.34)",
        color: "#dfffd7",
        fontWeight: 800,
        fontSize: "14px",
        boxShadow: "0 0 18px rgba(120,255,150,0.22)",
        whiteSpace: "nowrap",
        fontFamily: "Georgia, serif",
        cursor: "pointer",
        margin: 0,
      }}
    >
      <span>{"\uD83C\uDF31"}</span>
      <span>{user.seeds || 0}</span>
    </button>
  );
}

function NotificationBell() {
  const { user, token } = useAuth();
  useEffect(() => {
  if (token) {
    const socket = connectSocket(token);

    const activePing = setInterval(() => {
      socket?.emit("user:active");
    }, 30000);

    return () => {
      clearInterval(activePing);
    };
  }

  disconnectSocket();
}, [token]);
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
    <div
      ref={bellRef}
      style={{ position: "relative", justifySelf: "end", zIndex: 4600 }}
    >
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
            zIndex: 4700,
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

  const displayCosmetics = getDisplayCosmetics(user);
  const isNavActive = (path) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/trending") {
      return location.pathname === "/trending" || location.pathname.startsWith("/moods/");
    }
    return location.pathname === path;
  };

  const navLinkStyle = (path, activeColor) => ({
    fontSize: "13px",
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    textDecoration: "none",
    padding: "8px 22px",
    borderRadius: "2px",
    color: isNavActive(path) ? "#f3ffe6" : "rgba(225,245,210,0.72)",
    background:
      isNavActive(path)
        ? "rgba(14,42,17,0.7)"
        : "rgba(3,14,5,0.3)",
    borderBottom:
      isNavActive(path)
        ? `2px solid ${activeColor}`
        : "2px solid rgba(140,200,120,0.18)",
    boxShadow:
      isNavActive(path)
        ? `0 6px 18px rgba(0,0,0,0.35), 0 0 12px ${activeColor}`
        : "0 4px 12px rgba(0,0,0,0.22)",
    transition: "all 0.22s ease",
  });

  const authLinkStyle = (primary = false) => ({
    fontSize: "12px",
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    textDecoration: "none",
    padding: "8px 13px",
    borderRadius: "999px",
    color: primary ? "#f6ffe8" : "rgba(225,245,210,0.78)",
    background: primary ? "rgba(87,142,48,0.34)" : "rgba(3,14,5,0.26)",
    border: primary
      ? "1px solid rgba(190,255,140,0.34)"
      : "1px solid rgba(140,200,120,0.18)",
    boxShadow: "0 5px 16px rgba(0,0,0,0.24)",
  });

  return (
    <header
      className="navbar"
      style={{
        position: "relative",
        zIndex: 4500,
        height: "64px",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.62)), url('/forest.webp')",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            justifySelf: "start",
            minWidth: 0,
          }}
        >
          <ShopButton />
          {user && <SeedCounter />}

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
              src="/confession-logo.webp"
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
        </div>

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
              to="/trending"
              style={navLinkStyle("/trending", "rgba(180,240,120,0.75)")}
            >
              Trending
            </Link>

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

        <div
            className="nav-actions"
            style={{
              justifySelf: "end",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              className="desktop-search-box"
              onClick={() => navigate("/search")}
              title="Search confessions"
            >
              <span className="desktop-search-icon">🔍</span>
              <span>Search confessions</span>
            </button>

            {user ? (
              <>
                <div
                  onClick={() => navigate("/settings")}
                  className="nav-profile-wrap"
                  title={displayCosmetics?.title ? `Equipped title: ${displayCosmetics.title}` : "Settings"}
                >
                  <FramedAvatar
                    src={user.profilePicture}
                    username={user.username}
                    frameId={displayCosmetics?.frame}
                    effectId={displayCosmetics?.visualEffect}
                    size={42}
                    context="nav"
                    placeholder={user.username?.[0]?.toUpperCase?.() || "U"}
                  />

                  {displayCosmetics?.badge && (
                    <AnimatedBadge
                      badgeId={displayCosmetics.badge}
                      size="sm"
                      className="nav-profile-badge-wrap"
                    />
                  )}
                </div>
                <NotificationBell />
              </>
            ) : (
              <>
                <Link to="/login" style={authLinkStyle(false)}>
                  Login
                </Link>
                <Link to="/register" style={authLinkStyle(true)}>
                  Register
                </Link>
              </>
            )}
          </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <div
      className="site-footer"
      style={{
        position: "relative",
        zIndex: 30,
        textAlign: "center",
        padding: "22px",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url('/forest.webp')",
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px 18px",
        }}
      >
        <Link
          to="/terms"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Terms
        </Link>

        <Link
          to="/privacy"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Privacy
        </Link>

        <Link
          to="/refund-policy"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Refund/Cancellation
        </Link>

        <Link
          to="/contact-support"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Contact
        </Link>

        <Link
          to="/community-guidelines"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Community Guidelines
        </Link>

        <Link
          to="/moderation-policy"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Moderation Policy
        </Link>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const hideFooter = HIDE_FOOTER_ROUTES.includes(location.pathname);

  useEffect(() => {
    applySeo({
      ...getSeoForPath(location.pathname),
      pathname: location.pathname,
    });
  }, [location.pathname]);

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/confession/:id" element={<ConfessionPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/user/:id" element={<UserProfile />} />
        <Route path="/grove" element={<ThrivingGrove />} />
        <Route path="/scorched" element={<ScorchedLands />} />
        <Route path="/budding" element={<BuddingLand />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/moods/:moodSlug" element={<TrendingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/shop" element={<ShopRoute />} />
        <Route path="/buy-seeds" element={<BuySeeds />} />
        <Route path="/choose" element={<ChoicePage />} />
        <Route path="/reena" element={<ReenaPage />} />
        <Route path="/guidelines" element={<CommunityGuidelines />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund-policy" element={<RefundCancellationPolicy />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/moderation-policy" element={<ModerationReportPolicy />} />
        <Route path="/pressed-leaves" element={<PressedLeaves />} />
        <Route path="/weekly-events" element={<WeeklyEventsPage />} />
        <Route path="/reena-kundali" element={<ReenaKundaliPage />} />
        <Route path="/reena-trivia" element={<ReenaTriviaPage />} />
        <Route path="/reena-apology" element={<ReenaApologyPage />} />
        <Route path="/admin/special-logs" element={<SpecialLogsAdminPage />} />
      </Routes>

      {!hideFooter && <Footer />}
      <ToastContainer />
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
