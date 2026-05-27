import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatedBadge } from "../components/CosmeticFx";
import DisplayTitlePill from "../components/DisplayTitlePill";
import FramedAvatar from "../components/FramedAvatar";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../socket";
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


function getPresenceMeta(presence) {
  if (!presence || presence.status === "offline") {
    return { label: "Offline", className: "is-offline" };
  }

  if (presence.status === "online") {
    return { label: "Online now", className: "is-online" };
  }

  return { label: "Recently active", className: "is-recent" };
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

function FriendCard({ item, actionLabel, onPrimary, onSecondary, secondaryLabel, busy, presence }) {
  const user = item?.user || item;
  const presenceMeta = getPresenceMeta(presence);

  return (
    <article className="cw-friend-card">
      <div className="cw-friend-main">
        <FriendIdentity user={user} />
        <span className={`cw-friend-presence ${presenceMeta.className}`}>
          <i aria-hidden="true" />
          {presenceMeta.label}
        </span>
      </div>
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
  const [presenceById, setPresenceById] = useState({});
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

  const visibleUserIds = useMemo(() => {
    const ids = [
      ...friends.map((item) => item?.user?._id),
      ...incoming.map((item) => item?.user?._id),
      ...outgoing.map((item) => item?.user?._id),
      ...results.map((item) => item?._id),
    ].filter(Boolean);

    return Array.from(new Set(ids.map(String)));
  }, [friends, incoming, outgoing, results]);

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

  const loadPresence = useCallback(
    async (ids = visibleUserIds) => {
      if (!token || !Array.isArray(ids) || ids.length === 0) return;

      try {
        const data = await request(`/api/friends/presence?ids=${encodeURIComponent(ids.join(","))}`);
        setPresenceById((prev) => ({ ...prev, ...(data || {}) }));
      } catch (err) {
        console.error("Friend presence error:", err);
      }
    },
    [request, token, visibleUserIds]
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
    if (!token || visibleUserIds.length === 0) return undefined;

    loadPresence(visibleUserIds);

    const timer = setInterval(() => {
      loadPresence(visibleUserIds);
    }, 30000);

    return () => clearInterval(timer);
  }, [loadPresence, token, visibleUserIds]);

  useEffect(() => {
    if (!token || visibleUserIds.length === 0) return undefined;

    let socket = getSocket();
    let cancelled = false;
    let attached = false;
    const trackedIds = new Set(visibleUserIds.map(String));

    const handlePresenceChanged = (presence) => {
      const userId = String(presence?.userId || "");
      if (!userId || !trackedIds.has(userId)) return;

      setPresenceById((prev) => ({ ...prev, [userId]: presence }));
    };

    const attach = () => {
      if (cancelled || attached) return;
      socket = getSocket();

      if (!socket) return;

      attached = true;
      socket.on("presence:changed", handlePresenceChanged);
      socket.emit("friends:presence:request", visibleUserIds, (presence) => {
        if (!cancelled && presence) {
          setPresenceById((prev) => ({ ...prev, ...presence }));
        }
      });
    };

    attach();
    const retry = setTimeout(attach, 700);

    return () => {
      cancelled = true;
      clearTimeout(retry);
      if (socket) socket.off("presence:changed", handlePresenceChanged);
    };
  }, [token, visibleUserIds]);

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

  const challengeFriend = async (friendId) => {
    try {
      setBusyId(`chess-${friendId}`);
      const data = await request(`/api/chess/challenge/${friendId}`, { method: "POST" });
      window.cwToast?.("Chess challenge sent.", "success");
      navigate(`/chess/${data.game?._id || ""}`);
    } catch (err) {
      console.error("Chess challenge error:", err);
      window.cwToast?.(err.message || "Could not send chess challenge.", "error");
    } finally {
      setBusyId("");
    }
  };

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
              Search users, manage requests, and challenge accepted friends to chess.
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
                  actionLabel="Challenge ♟️"
                  busy={busyId === `remove-${item.friendshipId}` || busyId === `chess-${item?.user?._id}`}
                  onPrimary={() => challengeFriend(item?.user?._id)}
                  onSecondary={() => removeFriendship(item.friendshipId, "Friend removed.")}
                  secondaryLabel="Remove"
                  presence={presenceById[item?.user?._id]}
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
                  presence={presenceById[item?.user?._id]}
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
                  presence={presenceById[item?.user?._id]}
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
                      presence={presenceById[foundUser._id]}
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
