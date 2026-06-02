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

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="cw-friends-empty friends-empty-state">
      <span aria-hidden="true">❧</span>
      <strong>{title}</strong>
      <p>{text}</p>
      {actionLabel && onAction ? (
        <button type="button" className="friend-btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function FriendIdentity({ user, avatarSize = 66 }) {
  const cosmetics = getDisplayCosmetics(user || {});

  return (
    <div className="cw-friend-identity friend-card-main">
      <div className="cw-friend-avatar-wrap friend-avatar-wrap">
        <FramedAvatar
          src={user?.profilePicture}
          username={user?.username}
          frameId={cosmetics?.frame}
          effectId={cosmetics?.visualEffect}
          size={avatarSize}
          context="friends"
          animationMode="hover"
          placeholder={user?.username?.[0]?.toUpperCase?.() || "U"}
        />
      </div>
      <div className="cw-friend-copy friend-info">
        <div className="cw-friend-name-row friend-name-row">
          <Link to={`/user/${user?._id}`} className="cw-friend-name friend-username">
            {user?.username || "Unknown user"}
          </Link>
          <AnimatedBadge badgeId={cosmetics?.badge} size="sm" />
        </div>
        <DisplayTitlePill titleId={cosmetics?.title} size="small" />
      </div>
    </div>
  );
}

function FriendCard({
  item,
  actionLabel,
  onPrimary,
  onSecondary,
  secondaryLabel,
  busy,
  presence,
  metaLabel = "Forest companion",
  primaryTone = "primary",
  secondaryTone = "secondary",
}) {
  const user = item?.user || item;
  const presenceMeta = getPresenceMeta(presence);
  const displayActionLabel = actionLabel?.startsWith("Challenge") ? "Challenge" : actionLabel;
  const disabledPrimary =
    busy ||
    displayActionLabel === "Friends" ||
    displayActionLabel === "Request Sent" ||
    displayActionLabel === "You";

  return (
    <article className="cw-friend-card friend-card">
      <div className="cw-friend-main">
        <FriendIdentity user={user} />
        <div className="cw-friend-card-meta">
          <span className={`cw-friend-presence friend-status ${presenceMeta.className}`}>
            <i aria-hidden="true" />
            {presenceMeta.label}
          </span>
          <span className="cw-friend-meta-note">{metaLabel}</span>
        </div>
      </div>
      <div className="cw-friend-actions friend-actions">
        {onPrimary && (
          <button
            type="button"
            className={`cw-friend-action friend-btn-${primaryTone}`}
            onClick={onPrimary}
            disabled={disabledPrimary}
          >
            {busy ? "Working..." : displayActionLabel}
          </button>
        )}
        {onSecondary && secondaryLabel && (
          <button
            type="button"
            className={`cw-friend-action friend-btn-${secondaryTone}`}
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

  const onlineCount = useMemo(
    () =>
      friends.filter((item) => {
        const userId = item?.user?._id;
        return userId && presenceById[userId]?.status === "online";
      }).length,
    [friends, presenceById]
  );

  const tabCounts = useMemo(
    () => ({
      friends: friends.length,
      requests: incoming.length + outgoing.length,
      find: results.length,
    }),
    [friends.length, incoming.length, outgoing.length, results.length]
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
      <main className="cw-friends-page friends-page">
        <section className="cw-friends-shell friends-shell cw-friends-auth-card">
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
    <main className="cw-friends-page friends-page">
      <section className="cw-friends-shell friends-shell">
        <div className="cw-friends-hero friends-hero">
          <div className="cw-friends-hero-copy friends-hero-copy">
            <p className="cw-friends-kicker">FOREST COMPANIONS</p>
            <h1>Friends</h1>
            <p>
              Search users, manage requests, and challenge accepted friends to chess.
            </p>
            <div className="cw-friends-stats friends-stats" aria-label="Friend statistics">
              <span className="cw-friends-stat-chip friends-stat-chip">
                <strong>{friends.length}</strong>
                Friends
              </span>
              <span className="cw-friends-stat-chip friends-stat-chip">
                <strong>{incoming.length}</strong>
                Incoming
              </span>
              <span className="cw-friends-stat-chip friends-stat-chip">
                <strong>{onlineCount}</strong>
                Online
              </span>
            </div>
          </div>
          <span className="cw-friends-hero-icon" aria-hidden="true">👥</span>
        </div>

        <div className="cw-friends-tabs friends-tabs" role="tablist" aria-label="Friends sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`cw-friends-tab friends-tab ${activeTab === tab.key ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 ? <span>{tabCounts[tab.key]}</span> : null}
            </button>
          ))}
        </div>

        {error && <div className="cw-friends-error">{error}</div>}

        <section className="cw-friends-panel friends-panel">
          {loading ? (
          <div className="cw-friends-loading">Preparing the companion grove...</div>
        ) : activeTab === "friends" ? (
          <div className="cw-friends-list cw-friends-grid friends-grid">
            {friends.length === 0 ? (
              <EmptyState
                title="No forest companions yet"
                text="Find people to add friends, then challenge them to chess."
                actionLabel="Find People"
                onAction={() => setActiveTab("find")}
              />
            ) : (
              friends.map((item) => (
                <FriendCard
                  key={item.friendshipId}
                  item={item}
                  actionLabel="Challenge ♟️"
                  busy={busyId === `remove-${item.friendshipId}` || busyId === `chess-${item?.user?._id}`}
                  onPrimary={item?.user?._id ? () => challengeFriend(item.user._id) : null}
                  onSecondary={() => removeFriendship(item.friendshipId, "Friend removed.")}
                  secondaryLabel="Remove"
                  metaLabel="Accepted companion"
                  secondaryTone="danger"
                  presence={presenceById[item?.user?._id]}
                />
              ))
            )}
          </div>
        ) : activeTab === "requests" ? (
          <div className="cw-friends-request-stack">
            <h2 className="cw-friends-section-title">Incoming requests</h2>
            {incoming.length === 0 ? (
              <EmptyState title="No pending requests" text="Friend requests will appear here." />
            ) : (
              <div className="cw-friends-list cw-friends-grid friends-grid">
                {incoming.map((item) => (
                <FriendCard
                  key={item.friendshipId}
                  item={item}
                  actionLabel="Accept"
                  busy={busyId.includes(item.friendshipId)}
                  onPrimary={() => acceptRequest(item.friendshipId)}
                  onSecondary={() => declineRequest(item.friendshipId)}
                  secondaryLabel="Decline"
                  metaLabel="Incoming request"
                  secondaryTone="danger"
                  presence={presenceById[item?.user?._id]}
                />
                ))}
              </div>
            )}

            <h2 className="cw-friends-section-title cw-friends-section-title--spaced">
              Sent requests
            </h2>
            {outgoing.length === 0 ? (
              <EmptyState title="No sent requests" text="Requests you send will wait here until accepted." />
            ) : (
              <div className="cw-friends-list cw-friends-grid friends-grid">
                {outgoing.map((item) => (
                <FriendCard
                  key={item.friendshipId}
                  item={item}
                  actionLabel="Request Sent"
                  busy={busyId === `remove-${item.friendshipId}`}
                  onSecondary={() => removeFriendship(item.friendshipId, "Friend request cancelled.")}
                  secondaryLabel="Cancel"
                  metaLabel="Awaiting answer"
                  presence={presenceById[item?.user?._id]}
                />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="cw-friends-find">
            <label className="cw-friends-search-label" htmlFor="friend-search">
              Find people by username
            </label>
            <div className="cw-friends-search-row friends-search-row">
              <input
                id="friend-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by username..."
                className="cw-friends-search friends-search-input"
                aria-label="Search by username"
              />
              {query ? (
                <button
                  type="button"
                  className="cw-friends-clear-search"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                  }}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {searching ? <div className="cw-friends-loading">Searching the forest...</div> : null}

            <div className="cw-friends-list cw-friends-grid friends-grid">
              {query.trim().length < 2 ? (
                <EmptyState title="Search for companions" text="Type a username to discover people." />
              ) : results.length === 0 && !searching ? (
                <EmptyState title="No companions found" text="Try another name." />
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
                      metaLabel={
                        friendship.status === "accepted"
                          ? "Accepted companion"
                          : friendship.status === "pending"
                          ? "Request pending"
                          : "Discoverable user"
                      }
                      secondaryTone={friendship.status === "accepted" ? "danger" : "secondary"}
                      presence={presenceById[foundUser._id]}
                    />
                  );
                })
              )}
            </div>
          </div>
          )}
        </section>
      </section>
    </main>
  );
}
