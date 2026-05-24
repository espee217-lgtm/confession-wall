import React, { useEffect, useState } from "react";
import MobileBottomNav from "../components/MobileBottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const BELL_ICON = "\uD83D\uDD14";
const BACK_ARROW = "\u2190";

export default function ActivityPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchNotifications = async () => {
    if (!user || !token) return;

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: authHeaders,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not load activity.");
        return;
      }

      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Activity error:", err);
      setError("Could not connect to activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
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
      } catch (err) {
        console.error("Mark notification read error:", err);
      }
    }

    navigate(notification.link || "/");
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders,
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      window.cwToast?.("All notifications marked as read.", "success");
    } catch (err) {
      console.error("Mark all notifications read error:", err);
      window.cwToast?.("Could not mark notifications right now.", "error");
    }
  };

  const clearNotificationInbox = async () => {
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not clear notification inbox");
      }

      setNotifications([]);
      window.cwToast?.("Notification inbox cleared.", "success");
    } catch (err) {
      console.error("Clear notification inbox error:", err);
      window.cwToast?.("Could not clear notifications right now.", "error");
    }
  };

  const formatTime = (dateValue) => {
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
      return { icon: "🌿", label: "Golden echo", hint: "Open root" };
    }

    if (notification?.type === "mention") {
      return { icon: "@", label: "Mention", hint: "Open echo" };
    }

    if (notification?.type === "comment") {
      return { icon: "💬", label: "Comment", hint: "Open" };
    }

    if (notification?.type === "reaction") {
      return { icon: "💧", label: "Reaction", hint: "Open" };
    }

    return { icon: "🔔", label: "Notification", hint: "Open" };
  };

  if (!user || !token) {
    return (
      <main className="activity-page-shell">
        <section className="activity-hero-card">
          <p className="activity-kicker">{BELL_ICON} activity</p>
          <h1>Log in to see notifications</h1>
          <p>Your comments, reactions, and report updates will appear here.</p>
          <button type="button" onClick={() => navigate("/login")}>Login</button>
        </section>
      </main>
    );
  }

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <main className="activity-page-shell">
      <section className="activity-hero-card">
        <button type="button" className="activity-back-btn" onClick={() => navigate(-1)}>
          {BACK_ARROW} back
        </button>
        <p className="activity-kicker">{BELL_ICON} activity</p>
        <h1>Notifications</h1>
        <p>
          {unread > 0
            ? `${unread} unread update${unread === 1 ? "" : "s"}`
            : "You are all caught up."}
        </p>

        {notifications.length > 0 && (
          <div className="activity-notification-actions">
            <button type="button" className="activity-read-all" onClick={markAllAsRead}>
              Mark all read
            </button>
            <button type="button" className="activity-clear-inbox" onClick={clearNotificationInbox}>
              Clear inbox
            </button>
          </div>
        )}
      </section>

      {loading && <div className="activity-state-card">Loading activity...</div>}
      {error && <div className="activity-state-card error">{error}</div>}

      {!loading && !error && notifications.length === 0 && (
        <div className="activity-state-card">
          <strong>No notifications yet.</strong>
          <span>Comments, reactions, and admin updates will show here.</span>
        </div>
      )}

      <section className="activity-list">
        {notifications.map((notification) => {
          const meta = getNotificationMeta(notification);

          return (
            <button
              key={notification._id}
              type="button"
              onClick={() => markOneAsRead(notification)}
              className={`activity-item ${notification.read ? "read" : "unread"} ${
                notification.type === "root_reply" || notification.type === "mention" ? "root-reply" : ""
              }`}
            >
              {!notification.read && <span className="activity-dot" />}
              <span className="activity-item-icon" aria-hidden="true">
                {meta.icon}
              </span>
              <div>
                <strong className="activity-item-label">{meta.label}</strong>
                <p>{notification.message}</p>
                <span>
                  {formatTime(notification.createdAt)} · {meta.hint} →
                </span>
              </div>
            </button>
          );
        })}
      </section>
      <MobileBottomNav />
    </main>
  );
}
