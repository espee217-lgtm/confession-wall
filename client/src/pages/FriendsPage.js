import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatedBadge } from "../components/CosmeticFx";
import DisplayTitlePill from "../components/DisplayTitlePill";
import FramedAvatar from "../components/FramedAvatar";
import { useAuth } from "../context/AuthContext";
import { getDisplayCosmetics } from "../utils/engagement";
import "./FriendsPage.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const tabs = [
  { key: "friends", label: "Friends" },
  { key: "requests", label: "Requests" },
  { key: "find", label: "Find People" },
];

function getActionLabel(friendship) {
  if (!friendship || friendship.status === "none") return "Add Friend";
  if (friendship.status === "self") return "You";
  if (friendship.status === "accepted") return "Friends";
  if (friendship.status === "pending" && friendship.direction === "incoming") return "Accept";
  if (friendship.status === "pending") return "Request Sent";
  return "Add Friend";
}

function EmptyState({ title, text }) {
  return (
    <div className="cw-friends-empty">
      <span aria-hidden="true">❧</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function FriendIdentity({ user }) {
  const cosmetics = getDisplayCosmetics(user || {});

  return (
    <div className="cw-friend-identity">
      <FramedAvatar
        src={user?.profilePicture}
        username={user?.username}
        frameId={cosmetics?.frame}
        effectId={cosmetics?.visualEffect}
        size={52}
        context="friends"
        placeholder={user?.username?.[0]?.toUpperCase?.() || "U"}
      />
      <div className="cw-friend-copy">
        <Link to={`/user/${user?._id}`} className="cw-friend-name">
          {user?.username || "Unknown user"}
          <AnimatedBadge badgeId={cosmetics?.badge} size="sm" />
        </Link>
        <DisplayTitlePill titleId={cosmetics?.title} size="small" />
      </div>
    </div>
  );
}

function FriendCard({ item, actionLabel, onPrimary, onSecondary, secondaryLabel, busy }) {
  const user = item?.user || item;

  return (
    <article className="cw-friend-card">
      <FriendIdentity user={user} />
      <div className="cw-friend-actions">
        {onPrimary && (
          <button
            type="button"
            className="cw-friend-action cw-friend-action--primary"
            onClick={onPrimary}
            disabled={busy || actionLabel === "Friends" || actionLabel === "Request Sent" || actionLabel === "You"}
          >
            {busy ? "Working..." : actionLabel}
          </button>
        )}
        {onSecondary && secondaryLabel && (
          <button
            type="button"
            className="cw-friend-action cw-friend-action--ghost"
            onClick={onSecondary}
            disabled={busy}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </article>
  );
}

export default function FriendsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token]
  );

  const request = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers || {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong.");
      }
      return data;
    },
    [authHeaders]
  );

  const loadFriends = useCallback(async () => {
    if (!token) return;

    try {
      setError("");
      const [friendsData, requestsData] = await Promise.all([
        request("/api/friends"),
        request("/api/friends/requests"),
      ]);

      setFriends(Array.isArray(friendsData) ? friendsData : []);
      setIncoming(Array.isArray(requestsData?.incoming) ? requestsData.incoming : []);
      setOutgoing(Array.isArray(requestsData?.outgoing) ? requestsData.outgoing : []);
    } catch (err) {
      console.error("Load friends error:", err);
      setError(err.message || "Could not load friends.");
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      return;
    }

    loadFriends();
  }, [loadFriends, token, user]);

  useEffect(() => {
    if (!token || activeTab !== "find") return undefined;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let alive = true;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await request(`/api/friends/search?q=${encodeURIComponent(trimmed)}`);
        if (alive) setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Friend search error:", err);
        if (alive) window.cwToast?.(err.message || "Could not search users.", "error");
      } finally {
        if (alive) setSearching(false);
      }
    }, 260);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activeTab, query, request, token]);

  const refreshSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    try {
      const data = await request(`/api/friends/search?q=${encodeURIComponent(trimmed)}`);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Refresh friend search error:", err);
    }
  }, [query, request]);

  const runAction = async (key, action, successMessage) => {
    try {
      setBusyId(key);
      await action();
      await loadFriends();
      await refreshSearch();
      if (successMessage) window.cwToast?.(successMessage, "success");
    } catch (err) {
      console.error("Friend action error:", err);
      window.cwToast?.(err.message || "Could not update friend request.", "error");
    } finally {
      setBusyId("");
    }
  };

  const sendRequest = (targetId) =>
    runAction(
      `request-${targetId}`,
      () => request(`/api/friends/request/${targetId}`, { method: "POST" }),
      "Friend request sent."
    );

  const acceptRequest = (friendshipId) =>
    runAction(
      `accept-${friendshipId}`,
      () => request(`/api/friends/accept/${friendshipId}`, { method: "POST" }),
      "Friend request accepted."
    );

  const declineRequest = (friendshipId) =>
    runAction(
      `decline-${friendshipId}`,
      () => request(`/api/friends/decline/${friendshipId}`, { method: "POST" }),
      "Friend request declined."
    );

  const removeFriendship = (friendshipId, message) =>
    runAction(
      `remove-${friendshipId}`,
      () => request(`/api/friends/${friendshipId}`, { method: "DELETE" }),
      message
    );

  if (!user || !token) {
    return (
      <main className="cw-friends-page">
        <section className="cw-friends-shell cw-friends-auth-card">
          <span className="cw-friends-orb" aria-hidden="true">👥</span>
          <h1>Friends</h1>
          <p>Log in to grow your friend list and prepare for future chess invites.</p>
          <button type="button" onClick={() => navigate("/login")} className="cw-friends-main-btn">
            Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="cw-friends-page">
      <section className="cw-friends-shell">
        <div className="cw-friends-hero">
          <div>
            <p className="cw-friends-kicker">forest companions</p>
            <h1>Friends</h1>
            <p>
              Search users, manage requests, and build the friend base for future chess matches.
            </p>
          </div>
          <span className="cw-friends-hero-icon" aria-hidden="true">👥</span>
        </div>

        <div className="cw-friends-tabs" role="tablist" aria-label="Friends sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "is-active" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === "requests" && incoming.length > 0 ? <span>{incoming.length}</span> : null}
            </button>
          ))}
        </div>

        {error && <div className="cw-friends-error">{error}</div>}

        {loading ? (
          <div className="cw-friends-loading">growing the friend grove...</div>
        ) : activeTab === "friends" ? (
          <div className="cw-friends-list">
            {friends.length === 0 ? (
              <EmptyState
                title="No friends yet"
                text="Open Find People or visit a public profile to send your first request."
              />
            ) : (
              friends.map((item) => (
                <FriendCard
                  key={item.friendshipId}
                  item={item}
                  actionLabel="Friends"
                  busy={busyId === `remove-${item.friendshipId}`}
                  onSecondary={() => removeFriendship(item.friendshipId, "Friend removed.")}
                  secondaryLabel="Remove"
                />
              ))
            )}
          </div>
        ) : activeTab === "requests" ? (
          <div className="cw-friends-list">
            <h2 className="cw-friends-section-title">Incoming requests</h2>
            {incoming.length === 0 ? (
              <EmptyState title="No incoming requests" text="New friend requests will appear here." />
            ) : (
              incoming.map((item) => (
                <FriendCard
                  key={item.friendshipId}
                  item={item}
                  actionLabel="Accept"
                  busy={busyId.includes(item.friendshipId)}
                  onPrimary={() => acceptRequest(item.friendshipId)}
                  onSecondary={() => declineRequest(item.friendshipId)}
                  secondaryLabel="Decline"
                />
              ))
            )}

            <h2 className="cw-friends-section-title cw-friends-section-title--spaced">
              Sent requests
            </h2>
            {outgoing.length === 0 ? (
              <EmptyState title="No sent requests" text="Requests you send will wait here until accepted." />
            ) : (
              outgoing.map((item) => (
                <FriendCard
                  key={item.friendshipId}
                  item={item}
                  actionLabel="Request Sent"
                  busy={busyId === `remove-${item.friendshipId}`}
                  onSecondary={() => removeFriendship(item.friendshipId, "Friend request cancelled.")}
                  secondaryLabel="Cancel"
                />
              ))
            )}
          </div>
        ) : (
          <div className="cw-friends-find">
            <label className="cw-friends-search-label" htmlFor="friend-search">
              Find people by username
            </label>
            <input
              id="friend-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type at least 2 letters..."
              className="cw-friends-search"
            />

            {searching ? <div className="cw-friends-loading">searching the forest...</div> : null}

            <div className="cw-friends-list">
              {query.trim().length < 2 ? (
                <EmptyState title="Search users" text="Type a username to find people and send requests." />
              ) : results.length === 0 && !searching ? (
                <EmptyState title="No users found" text="Try another username or spelling." />
              ) : (
                results.map((foundUser) => {
                  const friendship = foundUser.friendship || { status: "none" };
                  const label = getActionLabel(friendship);
                  const canAccept = friendship.status === "pending" && friendship.direction === "incoming";
                  const canSend = !friendship.status || friendship.status === "none" || friendship.status === "declined" || friendship.status === "cancelled";

                  return (
                    <FriendCard
                      key={foundUser._id}
                      item={foundUser}
                      actionLabel={label}
                      busy={busyId.includes(foundUser._id) || busyId.includes(friendship.friendshipId)}
                      onPrimary={
                        canAccept
                          ? () => acceptRequest(friendship.friendshipId)
                          : canSend
                          ? () => sendRequest(foundUser._id)
                          : null
                      }
                      onSecondary={
                        friendship.status === "pending" && friendship.direction === "outgoing"
                          ? () => removeFriendship(friendship.friendshipId, "Friend request cancelled.")
                          : friendship.status === "accepted"
                          ? () => removeFriendship(friendship.friendshipId, "Friend removed.")
                          : null
                      }
                      secondaryLabel={
                        friendship.status === "pending" && friendship.direction === "outgoing"
                          ? "Cancel"
                          : friendship.status === "accepted"
                          ? "Remove"
                          : ""
                      }
                    />
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
