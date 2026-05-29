import { connectSocket, disconnectSocket } from "./socket";
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { GUIDEBOOK_VERSION } from "./data/guidebookContent";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin from "./pages/AdminLogin";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundCancellationPolicy from "./pages/RefundCancellationPolicy";
import ModerationReportPolicy from "./pages/ModerationReportPolicy";
import ContactSupport from "./pages/ContactSupport";
import PressedLeaves from "./pages/PressedLeaves";
import ToastContainer from "./components/Toast";
import MobileRealmSwipeNav from "./components/MobileRealmSwipeNav";

import { useAuth } from "./context/AuthContext";
import FramedAvatar from "./components/FramedAvatar";
import { AnimatedBadge } from "./components/CosmeticFx";
import usePageVisibility from "./hooks/usePageVisibility";
import { getDisplayCosmetics } from "./utils/engagement";
import { applySeo, defaultSeo } from "./utils/seo";
import { AdminAuthProvider } from "./context/AdminAuthContext";

const GuidebookPopup = lazy(() => import("./components/GuidebookPopup"));
const ConfessionPage = lazy(() => import("./pages/ConfessionPage"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const ThrivingGrove = lazy(() => import("./pages/ThrivingGrove"));
const ScorchedLands = lazy(() => import("./pages/ScorchedLands"));
const BuddingLand = lazy(() => import("./pages/BuddingLand"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const ChessPage = lazy(() => import("./pages/ChessPage"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const ShopPage = lazy(() => import("./pages/Shop"));
const TitleAchievements = lazy(() => import("./pages/TitleAchievements"));
const BuySeeds = lazy(() => import("./pages/BuySeeds"));
const ChoicePage = lazy(() => import("./pages/ChoicePage"));
const ReenaPage = lazy(() => import("./pages/ReenaPage"));
const WeeklyEventsPage = lazy(() => import("./pages/WeeklyEventsPage"));
const ReenaKundaliPage = lazy(() => import("./pages/ReenaKundaliPage"));
const ReenaApologyPage = lazy(() => import("./pages/ReenaApologyPage"));
const ReenaTriviaPage = lazy(() => import("./pages/ReenaTriviaPage"));
const SpecialLogsAdminPage = lazy(() => import("./pages/SpecialLogsAdminPage"));

const HIDE_NAVBAR_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/admin", "/admin/dashboard", "/choose", "/reena"];
const HIDE_FOOTER_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/admin", "/admin/dashboard", "/choose", "/reena"];
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const ROUTE_SEO = {
  "/": {
    title: "Confession Wall - Share Anonymous Confessions & Real Feelings",
    description:
      "Confession Wall is an anonymous confession community where you can share secrets, vent real feelings, read anonymous stories, and react without judgment.",
  },
  "/trending": {
    title: "Trending Anonymous Confessions - Confession Wall",
    description:
      "Read trending anonymous confessions from real people. Explore secrets, emotions, stories, and honest thoughts shared by the Confession Wall community.",
  },
  "/grove": {
    title: "Grove Confessions - Positive Anonymous Stories",
    description:
      "Explore Grove confessions: anonymous stories, hopeful thoughts, comforting reactions, and real feelings rising through the Confession Wall community.",
  },
  "/budding": {
    title: "New Anonymous Confessions - Budding Land",
    description:
      "Read fresh anonymous confessions in Budding Land. Discover new secrets, thoughts, and stories shared by the Confession Wall community.",
  },
  "/scorched": {
    title: "Scorched Confessions - Dark Anonymous Venting",
    description:
      "Read intense anonymous confessions, difficult emotions, painful stories, and raw venting from the Scorched realm of Confession Wall.",
  },
  "/search": {
    title: "Search Anonymous Confessions - Confession Wall",
    description:
      "Search anonymous confessions, real stories, secret thoughts, moods, and community posts across Confession Wall.",
  },
  "/shop": {
    title: "Confession Wall Shop - Seeds, Badges, Frames & Themes",
    description:
      "Explore the Confession Wall shop for Seeds, profile badges, avatar frames, post themes, and cosmetic digital items for your anonymous confession profile.",
  },
  "/buy-seeds": {
    title: "Buy Seeds - Confession Wall Digital Credits",
    description:
      "Buy Seeds on Confession Wall to unlock profile cosmetics, avatar frames, badges, post themes, and other digital items for your anonymous confession experience.",
  },
  "/weekly-events": {
    title: "Weekly Forest Events - Confession Wall",
    description:
      "Explore weekly Confession Wall events, community activities, realm challenges, and limited-time forest experiences.",
  },
  "/guidelines": {
    title: "Community Guidelines - Confession Wall",
    description:
      "Read Confession Wall community guidelines for anonymous confessions, respectful replies, reporting, moderation, and safe participation.",
  },
  "/terms": {
    title: "Terms of Use - Confession Wall",
    description:
      "Read the Confession Wall terms of use for anonymous posting, user accounts, Seeds, digital items, moderation, and platform rules.",
  },
  "/privacy": {
    title: "Privacy Policy - Confession Wall",
    description:
      "Read how Confession Wall handles account data, anonymous confessions, uploads, payments through Razorpay, cookies, and support requests.",
  },
  "/refund-cancellation": {
    title: "Refund & Cancellation Policy - Confession Wall",
    description:
      "Read the Confession Wall refund and cancellation policy for Seeds, digital credits, payment issues, failed transactions, and duplicate payments.",
  },
  "/moderation-report-policy": {
    title: "Moderation & Report Policy - Confession Wall",
    description:
      "Learn how Confession Wall handles reports, moderation decisions, unsafe content, appeals, and community safety.",
  },
  "/contact-support": {
    title: "Contact Support - Confession Wall",
    description:
      "Contact Confession Wall support for account help, payment issues, reports, privacy questions, moderation appeals, and business queries.",
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
  "/friends",
  "/chess",
  "/titles",
  "/pressed-leaves",
  "/choose",
  "/reena",
  "/reena-kundali",
  "/reena-trivia",
  "/reena-apology",
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
      robots: "noindex,follow",
    };
  }

  if (pathname.startsWith("/user/")) {
    return {
      title: "Profile - Confession Wall",
      description: "View a public Confession Wall profile and their shared confessions.",
      robots: "noindex,follow",
    };
  }

  if (pathname.startsWith("/moods/")) {
    const mood = humanizeMoodSlug(pathname.replace("/moods/", ""));
    return {
      title: mood
        ? `${mood} Confessions - Confession Wall`
        : "Mood Confessions - Confession Wall",
      description: "Browse anonymous confessions by mood on Confession Wall.",
      robots: "noindex,follow",
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
  return <ShopPage />;
}

function RouteLoadingFallback() {
  return (
    <main
      style={{
        minHeight: "62vh",
        display: "grid",
        placeItems: "center",
        padding: "72px 20px",
      }}
    >
      <div
        style={{
          borderRadius: "14px",
          padding: "12px 16px",
          background: "rgba(4, 24, 10, 0.66)",
          border: "1px solid rgba(168, 228, 140, 0.22)",
          color: "rgba(236, 255, 221, 0.9)",
          fontFamily: "Georgia, serif",
          letterSpacing: "0.04em",
          fontSize: "0.9rem",
        }}
      >
        Loading...
      </div>
    </main>
  );
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



function SeedCounter()


 {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id;
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    if (!userId || !token || !refreshUser) return undefined;

    if (isPageVisible) {
      refreshUser();
    }

    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshUser();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUser();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, token, refreshUser, isPageVisible]);

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
  const isPageVisible = usePageVisibility();
  useEffect(() => {
  if (token) {
    const socket = connectSocket(token);

    const activePing = setInterval(() => {
      if (!document.hidden) {
        socket?.emit("user:active");
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        socket?.emit("user:active");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(activePing);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

  useEffect(() => {
    const bodyClass = "cw-notifications-open";

    if (open) {
      document.body.classList.add(bodyClass);
    } else {
      document.body.classList.remove(bodyClass);
    }

    return () => {
      document.body.classList.remove(bodyClass);
    };
  }, [open]);

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
    if (isPageVisible) {
      fetchUnreadCount();
    }

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    }, 25000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, token, isPageVisible]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target?.closest?.(".mobile-bottom-notification-btn")) {
        return;
      }

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

  useEffect(() => {
    const handleMobileNotificationOpen = () => {
      if (!user || !token) return;

      setOpen((wasOpen) => {
        const nextOpen = !wasOpen;

        if (nextOpen) {
          window.setTimeout(() => {
            fetchNotifications();
          }, 0);
        }

        return nextOpen;
      });
    };

    window.addEventListener("cw:open-notifications", handleMobileNotificationOpen);
    return () =>
      window.removeEventListener("cw:open-notifications", handleMobileNotificationOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, token]);

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

  const clearNotificationInbox = async (event) => {
    event.stopPropagation();

    if (!notifications.length) return;

    const confirmed = window.confirm(
      "Clear all notifications from your inbox? This permanently deletes them from MongoDB for your account only."
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/clear`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error("Could not clear notification inbox");
      }

      setNotifications([]);
      setUnreadCount(0);
      window.cwToast?.("Notification inbox cleared.", "success");
    } catch (err) {
      console.error("Clear notification inbox error:", err);
      window.cwToast?.("Could not clear notifications right now.", "error");
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

  const getNotificationMeta = (notification) => {
    if (notification?.type === "root_reply") {
      return {
        icon: "🌿",
        label: "Golden echo",
        hint: "Open root",
      };
    }

    if (notification?.type === "mention") {
      return {
        icon: "@",
        label: "Mention",
        hint: "Open echo",
      };
    }

    if (notification?.type === "comment") {
      return {
        icon: "💬",
        label: "Comment",
        hint: "Open",
      };
    }

    if (notification?.type === "reaction") {
      return {
        icon: "💧",
        label: "Reaction",
        hint: "Open",
      };
    }

    if (notification?.type === "friend_request") {
      return {
        icon: "👥",
        label: "Friend request",
        hint: "Open friends",
      };
    }

    if (notification?.type === "friend_accept") {
      return {
        icon: "🌿",
        label: "Friend accepted",
        hint: "Open friends",
      };
    }

    if (notification?.type === "chess_invite") {
      return {
        icon: "♟️",
        label: "Chess invite",
        hint: "Open chess",
      };
    }

    if (notification?.type === "chess_accept") {
      return {
        icon: "♞",
        label: "Chess accepted",
        hint: "Open board",
      };
    }

    return {
      icon: "🔔",
      label: "Notification",
      hint: "Open",
    };
  };

  if (!user || !token) return null;

  return (
    <div
      ref={bellRef}
      className="cw-notification-bell-wrap"
      style={{ position: "relative", justifySelf: "end", zIndex: 4600 }}
    >
      <button
        type="button"
        className="cw-notification-bell-btn"
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
          className="cw-notification-dropdown"
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
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

                <button
                  type="button"
                  onClick={clearNotificationInbox}
                  style={{
                    margin: 0,
                    padding: "6px 8px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,190,120,0.32)",
                    background: "rgba(255,115,75,0.11)",
                    color: "#ffd6a8",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Clear inbox
                </button>
              </div>
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
            notifications.map((notification) => {
              const meta = getNotificationMeta(notification);

              return (
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
                      : (notification.type === "root_reply" || notification.type === "mention")
                      ? "1px solid rgba(235,205,95,0.46)"
                      : "1px solid rgba(140,255,150,0.35)",
                    background: notification.read
                      ? "rgba(255,255,255,0.045)"
                      : (notification.type === "root_reply" || notification.type === "mention")
                      ? "linear-gradient(135deg, rgba(126,255,135,0.13), rgba(230,190,70,0.12))"
                      : "rgba(100,255,135,0.13)",
                    color: "#efffde",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: notification.read
                      ? "none"
                      : (notification.type === "root_reply" || notification.type === "mention")
                      ? "0 0 18px rgba(230,205,90,0.15)"
                      : "0 0 16px rgba(110,255,140,0.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "9px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        marginTop: "1px",
                        border: notification.read
                          ? "1px solid rgba(210,255,190,0.13)"
                          : "1px solid rgba(245,225,120,0.35)",
                        background: notification.read
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(8,30,10,0.55)",
                        boxShadow:
                          !notification.read && (notification.type === "root_reply" || notification.type === "mention")
                            ? "0 0 12px rgba(230,205,90,0.2)"
                            : "none",
                        fontSize: "13px",
                      }}
                    >
                      {meta.icon}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            color:
                              (notification.type === "root_reply" || notification.type === "mention")
                                ? "#f4d779"
                                : "rgba(200,255,190,0.7)",
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            fontFamily: "'Cinzel', Georgia, serif",
                          }}
                        >
                          {meta.label}
                        </span>

                        {!notification.read && (
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: "#7dff8a",
                              flex: "0 0 auto",
                              boxShadow: "0 0 10px rgba(125,255,138,0.9)",
                            }}
                          />
                        )}
                      </div>

                      <div style={{ fontSize: "13px", lineHeight: 1.35 }}>
                        {notification.message}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          marginTop: "6px",
                          fontSize: "11px",
                          color: "rgba(230,255,220,0.55)",
                        }}
                      >
                        <span>{formatNotificationTime(notification.createdAt)}</span>
                        <span style={{ color: "rgba(244,215,121,0.72)" }}>
                          {meta.hint} →
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function FriendsMobileIcon() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="nav-friends-mobile-btn"
      onClick={() => navigate("/friends")}
      title="Friends"
      aria-label="Open friends"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M8.8 11.1a3.35 3.35 0 1 1 0-6.7 3.35 3.35 0 0 1 0 6.7Zm7.1-.6a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5ZM3.4 19.2c0-3.15 2.42-5.45 5.4-5.45s5.4 2.3 5.4 5.45c0 .5-.4.9-.9.9h-9c-.5 0-.9-.4-.9-.9Zm10.85.9c.22-.26.35-.6.35-.98 0-1.92-.68-3.56-1.82-4.74.82-.48 1.8-.75 2.86-.75 2.78 0 4.96 2.02 4.96 4.78 0 .94-.76 1.69-1.69 1.69h-4.66Z"
          fill="currentColor"
        />
      </svg>
    </button>
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
      className={`navbar ${user ? "navbar--auth" : "navbar--guest"}`}
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
            className="navbar-brand"
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
            className={`nav-actions ${user ? "nav-actions--auth" : "nav-actions--guest"}`}
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
                <FriendsMobileIcon />
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
                <Link className="navbar-login-btn" to="/login" style={authLinkStyle(false)}>
                  Login
                </Link>
                <Link className="navbar-register-btn" to="/register" style={authLinkStyle(true)}>
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
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px 18px",
        }}
      >
        <Link
          to="/guidelines"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Guidelines
        </Link>

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
          to="/refund-cancellation"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Refunds
        </Link>

        <Link
          to="/moderation-report-policy"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Moderation
        </Link>

        <Link
          to="/contact-support"
          style={{ color: "#9FE1CB", textDecoration: "none" }}
        >
          Contact
        </Link>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const hideFooter = HIDE_FOOTER_ROUTES.includes(location.pathname);
  const [guidebookOpen, setGuidebookOpen] = useState(false);

  useEffect(() => {
    const handleOpenGuidebook = (event) => {
      const mode = event?.detail?.mode || "manual";

      if (mode === "auto") {
        try {
          if (localStorage.getItem("cwGuidebookSeenVersion") === GUIDEBOOK_VERSION) {
            return;
          }
        } catch {
          // localStorage can fail in private modes; still allow the guidebook to open.
        }
      }

      setGuidebookOpen(true);
    };

    window.addEventListener("cw:open-guidebook", handleOpenGuidebook);
    return () => window.removeEventListener("cw:open-guidebook", handleOpenGuidebook);
  }, []);

  const closeGuidebook = () => {
    try {
      localStorage.setItem("cwGuidebookSeenVersion", GUIDEBOOK_VERSION);
    } catch {
      // Ignore localStorage failures; closing the popup should still work.
    }

    setGuidebookOpen(false);
  };

  useEffect(() => {
    applySeo({
      ...getSeoForPath(location.pathname),
      pathname: location.pathname,
    });
  }, [location.pathname]);

  return (
    <div className="cw-app-shell">
      <Navbar />

      <div className="cw-route-shell">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/confession/:id" element={<ConfessionPage />} />
            <Route path="/confession/:id/comment/:commentId" element={<ConfessionPage />} />
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
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/chess" element={<ChessPage />} />
            <Route path="/chess/:gameId" element={<ChessPage />} />
            <Route path="/shop" element={<ShopRoute />} />
            <Route path="/titles" element={<TitleAchievements />} />
            <Route path="/buy-seeds" element={<BuySeeds />} />
            <Route path="/choose" element={<ChoicePage />} />
            <Route path="/reena" element={<ReenaPage />} />
            <Route path="/guidelines" element={<CommunityGuidelines />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund-cancellation" element={<RefundCancellationPolicy />} />
            <Route path="/moderation-report-policy" element={<ModerationReportPolicy />} />
            <Route path="/contact-support" element={<ContactSupport />} />
            <Route path="/pressed-leaves" element={<PressedLeaves />} />
            <Route path="/weekly-events" element={<WeeklyEventsPage />} />
            <Route path="/reena-kundali" element={<ReenaKundaliPage />} />
            <Route path="/reena-trivia" element={<ReenaTriviaPage />} />
            <Route path="/reena-apology" element={<ReenaApologyPage />} />
            <Route path="/admin/special-logs" element={<SpecialLogsAdminPage />} />
          </Routes>
        </Suspense>
      </div>

      <MobileRealmSwipeNav />

      {!hideFooter && <Footer />}

      {guidebookOpen ? (
        <Suspense fallback={null}>
          <GuidebookPopup open={guidebookOpen} onClose={closeGuidebook} />
        </Suspense>
      ) : null}
      <ToastContainer />
    </div>
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
  const isPageVisible = usePageVisibility();

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

  useEffect(() => {
    document.documentElement.dataset.tabHidden = isPageVisible ? "false" : "true";
  }, [isPageVisible]);

  return (
    <AdminAuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AdminAuthProvider>
  );
}

export default App;
