import { useEffect, useState } from "react";
import { connectSocket } from "../socket";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useAuth } from "../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const API_URL = `${API_BASE}/api/admin`;
const REPORT_URL = `${API_BASE}/api/reports`;

export default function AdminDashboard() {
  const { adminToken, adminLogout } = useAdminAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!adminToken) return;

    const socket = connectSocket(adminToken, "admin");

    if (!socket) return;

    const handleOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    socket.emit("admin:request_online_users");
    socket.on("online_users:update", handleOnlineUsers);

    const activePing = setInterval(() => {
      socket.emit("user:active");
    }, 30000);

    return () => {
      clearInterval(activePing);
      socket.off("online_users:update", handleOnlineUsers);
    };
  }, [adminToken]);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("reports");
  const [reportView, setReportView] = useState("pending");
  const [confessions, setConfessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [weeklyEventStatus, setWeeklyEventStatus] = useState(null);
  const [weeklyBusy, setWeeklyBusy] = useState(false);

  const headers = { Authorization: `Bearer ${adminToken}` };

  useEffect(() => {
    if (!adminToken) navigate("/admin");
  }, [adminToken, navigate]);

  const fetchConfessions = async () => {
    const res = await fetch(`${API_URL}/confessions`, { headers });
    setConfessions(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/users`, { headers });
    setUsers(await res.json());
  };

  const fetchReports = async () => {
    const res = await fetch(REPORT_URL, { headers });
    setReports(await res.json());
  };

  const fetchLogs = async () => {
    const res = await fetch(`${API_URL}/logs?limit=100`, { headers });
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
  };

  const fetchWeeklyEventStatus = async () => {
    const res = await fetch(`${API_URL}/weekly-event/status`, { headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Could not load weekly event status.");
    }

    setWeeklyEventStatus(data);
  };

  const refreshWeeklyEventStatus = async () => {
    try {
      await fetchWeeklyEventStatus();
    } catch (err) {
      console.error(err);
      window.cwToast?.(
        err.message || "Could not refresh weekly event status.",
        "error"
      ) || alert(err.message || "Could not refresh weekly event status.");
    }
  };

 useEffect(() => {
  if (!adminToken) return;

  const loadAdminData = async () => {
    await Promise.allSettled([
      fetchReports(),
      fetchConfessions(),
      fetchUsers(),
      fetchLogs(),
      fetchWeeklyEventStatus(),
    ]);
  };

  loadAdminData();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [adminToken]);

  const finalizeWeeklyEvent = async () => {
    if (!window.confirm("Run weekly event maintenance now and apply any pending automated rewards?")) {
      return;
    }

    try {
      setWeeklyBusy(true);
      const res = await fetch(`${API_URL}/weekly-event/finalize-current`, {
        method: "POST",
        headers,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        window.cwToast?.(
          data.message || "Could not finalize the weekly event.",
          "error"
        ) || alert(data.message || "Could not finalize the weekly event.");
        return;
      }

      setWeeklyEventStatus(data.status || null);
      await fetchUsers();
      window.cwToast?.(
        data.message || "Weekly event maintenance completed.",
        "success"
      ) || alert(data.message || "Weekly event maintenance completed.");
    } catch (err) {
      console.error(err);
      window.cwToast?.(
        "Something went wrong while finalizing the weekly event.",
        "error"
      ) ||
        alert("Something went wrong while finalizing the weekly event.");
    } finally {
      setWeeklyBusy(false);
    }
  };

  const pendingReports = reports.filter((r) => r.status !== "resolved");
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  const visibleReports =
    reportView === "pending" ? pendingReports : resolvedReports;

  const deleteConfession = async (id) => {
    if (!window.confirm("Delete this confession?")) return;

    await fetch(`${API_URL}/confessions/${id}`, {
      method: "DELETE",
      headers,
    });

    setConfessions((prev) => prev.filter((c) => c._id !== id));
    setReports((prev) =>
      prev.map((r) =>
        r.confessionId?._id === id
          ? {
              ...r,
              status: "resolved",
              resolvedNote: "Post deleted by admin.",
              resolvedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const deleteReportedComment = async (reportId) => {
    if (!window.confirm("Delete this reported comment and resolve the report?")) {
      return;
    }

    const res = await fetch(`${API_URL}/reports/${reportId}/comment`, {
      method: "DELETE",
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not delete comment.", "error") || alert(data.message || "Could not delete comment.");
      return;
    }

    setReports((prev) =>
      prev.map((r) =>
        r._id === reportId
          ? {
              ...r,
              status: "resolved",
              resolvedNote:
                data.report?.resolvedNote ||
                "Reported comment was deleted by admin.",
              resolvedAt: data.report?.resolvedAt || new Date().toISOString(),
              deleteAfter: data.report?.deleteAfter || r.deleteAfter,
            }
          : r
      )
    );

    window.cwToast?.(data.message || "Comment deleted and report resolved.", "success") || alert(data.message || "Comment deleted and report resolved.");
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete user and ALL their confessions?")) return;

    await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers,
    });

    setUsers((prev) => prev.filter((u) => u._id !== id));
  };
    const giveSeedsToUser = async (id, username) => {
  const rawAmount = window.prompt(
    `How many Seeds do you want to give to @${username}?`,
    "100"
  );

  if (rawAmount === null) return;

  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    window.cwToast?.("Enter a valid positive seed amount.", "error") ||
      alert("Enter a valid positive seed amount.");
    return;
  }

  const customMessage = window.prompt(
    "Notification message for the user:",
    `An admin gifted you ${amount} Seeds 🌱`
  );

  if (customMessage === null) return;

  try {
    const res = await fetch(`${API_URL}/users/${id}/give-seeds`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        message: customMessage || `An admin gifted you ${amount} Seeds 🌱`,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not give seeds.", "error") ||
        alert(data.message || "Could not give seeds.");
      return;
    }

    updateUserInState(data.user);

    window.cwToast?.(data.message || "Seeds given.", "success") ||
      alert(data.message || "Seeds given.");
  } catch (err) {
    console.error(err);
    window.cwToast?.("Something went wrong while giving seeds.", "error") ||
      alert("Something went wrong while giving seeds.");
  }
};
    const updateUserInState = (updatedUser) => {
    setUsers((prev) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );
  };

  const suspendUser = async (id) => {
    const reason = window.prompt(
      "Reason for suspending this user:",
      "Suspended by admin."
    );

    if (reason === null) return;

    const res = await fetch(`${API_URL}/users/${id}/suspend`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not suspend user.", "error") || alert(data.message || "Could not suspend user.");
      return;
    }

    updateUserInState(data.user);
  };

  const unsuspendUser = async (id) => {
    const res = await fetch(`${API_URL}/users/${id}/unsuspend`, {
      method: "PATCH",
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unsuspend user.", "error") || alert(data.message || "Could not unsuspend user.");
      return;
    }

    updateUserInState(data.user);
  };

  const banUser = async (id) => {
    const reason = window.prompt(
      "Reason for banning this user:",
      "Banned by admin."
    );

    if (reason === null) return;

    if (!window.confirm("Ban this user? They will not be able to log in or use protected actions.")) {
      return;
    }

    const res = await fetch(`${API_URL}/users/${id}/ban`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not ban user.", "error") || alert(data.message || "Could not ban user.");
      return;
    }

    updateUserInState(data.user);
  };

  const unbanUser = async (id) => {
    const res = await fetch(`${API_URL}/users/${id}/unban`, {
      method: "PATCH",
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unban user.", "error") || alert(data.message || "Could not unban user.");
      return;
    }

    updateUserInState(data.user);
  };
  const resolveReport = async (id) => {
    const note = window.prompt(
      "Optional resolve note for this report:",
      "Reviewed by admin."
    );

    const res = await fetch(`${REPORT_URL}/${id}/resolve`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: note || "" }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not resolve report.", "error") || alert(data.message || "Could not resolve report.");
      return;
    }

    setReports((prev) =>
      prev.map((r) =>
        r._id === id
          ? {
              ...r,
              status: "resolved",
              resolvedNote: data.report?.resolvedNote || note || "",
              resolvedAt: data.report?.resolvedAt || new Date().toISOString(),
              deleteAfter: data.report?.deleteAfter || r.deleteAfter,
            }
          : r
      )
    );
  };

  const cleanupResolvedReports = async () => {
    if (!window.confirm("Delete resolved reports whose 30-day cleanup period has passed?")) {
      return;
    }

    const res = await fetch(`${API_URL}/reports/cleanup-resolved`, {
      method: "DELETE",
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not cleanup resolved reports.", "error") || alert(data.message || "Could not cleanup resolved reports.");
      return;
    }

    await fetchReports();
    window.cwToast?.(data.message || "Old resolved reports cleaned.", "success") || alert(data.message || "Old resolved reports cleaned.");
  };

  const openReportedItem = (report) => {
    const confessionId = report.confessionId?._id;

    if (!confessionId) {
      window.cwToast?.("This post no longer exists.", "warning") || alert("This post no longer exists.");
      return;
    }

    if (report.targetType === "comment" && report.commentId) {
      navigate(
        `/confession/${confessionId}?from=admin&comment=${report.commentId}`
      );
      return;
    }

    navigate(`/confession/${confessionId}?from=admin`);
  };

  const enterMainSiteAsAdmin = async () => {
  try {
    const res = await fetch(`${API_URL}/enter-site`, {
      method: "POST",
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not enter main site as admin.", "error") || alert(data.message || "Could not enter main site as admin.");
      return;
    }

    login(data.user, data.token);
    navigate("/");
  } catch (err) {
    console.error(err);
    window.cwToast?.("Something went wrong while entering main site.", "error") || alert("Something went wrong while entering main site.");
  }
};
  const cardStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "14px",
    padding: "1rem 1.2rem",
    marginBottom: "0.75rem",
  };

  const btnStyle = {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "8px",
    color: "white",
    padding: "8px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  };

  const deleteBtnStyle = {
    background: "rgba(255,60,60,0.15)",
    border: "1px solid rgba(255,80,80,0.4)",
    borderRadius: "8px",
    color: "#ff6b6b",
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
  };

  const suspendBtnStyle = {
  background: "rgba(255,200,80,0.13)",
  border: "1px solid rgba(255,200,80,0.45)",
  borderRadius: "8px",
  color: "#ffd27a",
  padding: "6px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.85rem",
};

const banBtnStyle = {
  background: "rgba(255,60,60,0.18)",
  border: "1px solid rgba(255,80,80,0.55)",
  borderRadius: "8px",
  color: "#ff7777",
  padding: "6px 14px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.85rem",
};

const safeBtnStyle = {
  background: "rgba(100,255,150,0.13)",
  border: "1px solid rgba(100,255,150,0.45)",
  borderRadius: "8px",
  color: "#9cffb2",
  padding: "6px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.85rem",
};

  const commentDeleteBtnStyle = {
    background: "rgba(120,180,255,0.13)",
    border: "1px solid rgba(120,180,255,0.45)",
    borderRadius: "8px",
    color: "#9cc7ff",
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
  };

  const pillStyle = (active) => ({
    ...btnStyle,
    background: active ? "rgba(120,255,170,0.16)" : "rgba(255,255,255,0.08)",
    color: active ? "#9cffb2" : "white",
    borderColor: active
      ? "rgba(120,255,170,0.35)"
      : "rgba(255,255,255,0.18)",
  });

  return (
    <div
      className="cw-admin-dashboard"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0f1a, #1a1a2e)",
        color: "white",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "950px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Admin Dashboard</h1>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  <button
    onClick={enterMainSiteAsAdmin}
    style={{
      ...btnStyle,
      color: "#9cffb2",
      borderColor: "rgba(100,255,150,0.45)",
    }}
  >
    Enter Main Site
  </button>

  <button
    onClick={() => {
      adminLogout();
      navigate("/admin");
    }}
    style={deleteBtnStyle}
  >
    Logout
  </button>
</div>
        </div>
        {weeklyEventStatus && (
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    opacity: 0.68,
                    marginBottom: "8px",
                  }}
                >
                  Weekly Event Status
                </div>

                <h2 style={{ margin: "0 0 6px", fontSize: "1.22rem" }}>
                  {weeklyEventStatus.currentEvent?.name || "Current weekly event"}
                </h2>

                <p style={{ margin: 0, opacity: 0.76, lineHeight: 1.6 }}>
                  {weeklyEventStatus.currentEvent?.description}
                </p>

                <p style={{ margin: "8px 0 0", opacity: 0.66, lineHeight: 1.55 }}>
                  {weeklyEventStatus.currentEvent?.statusText}
                </p>

                <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span style={pillStyle(true)}>
                    {weeklyEventStatus.currentEvent?.rankingStartAt
                      ? new Date(weeklyEventStatus.currentEvent.rankingStartAt).toLocaleDateString()
                      : "?"}
                    {" "}to{" "}
                    {weeklyEventStatus.currentEvent?.rankingEndAt
                      ? new Date(
                          new Date(weeklyEventStatus.currentEvent.rankingEndAt).getTime() - 1000
                        ).toLocaleDateString()
                      : "?"}
                  </span>
                  <span style={pillStyle(false)}>
                    {weeklyEventStatus.currentEvent?.phase === "active"
                      ? "Competition: Monday to Tuesday"
                      : "Competition: closed, results active"}
                  </span>
                  <span style={pillStyle(false)}>
                    Rewards: Wednesday automatic payout
                  </span>
                </div>

                <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      background: "rgba(120,255,170,0.08)",
                      border: "1px solid rgba(120,255,170,0.18)",
                    }}
                  >
                    <strong style={{ color: "#b8ffd0" }}>Most Watered candidate</strong>
                    <div style={{ marginTop: "6px", opacity: 0.86 }}>
                      {weeklyEventStatus.competitionLeaderboard?.mostWateredPost
                        ? `@${weeklyEventStatus.leaderboard.mostWateredPost.userId?.username || "anonymous"} · ${weeklyEventStatus.leaderboard.mostWateredPost.wateredCount || 0} Water`
                        : "No current watered leader"}
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "0.84rem", opacity: 0.64 }}>
                      {weeklyEventStatus.rewards?.mostWateredSeeds?.granted
                        ? `1000 Seeds granted to @${weeklyEventStatus.rewards.mostWateredSeeds.username} on ${new Date(weeklyEventStatus.rewards.mostWateredSeeds.grantedAt).toLocaleString()}`
                        : weeklyEventStatus.currentEvent?.phase === "active"
                        ? "1000 Seeds not paid until Wednesday close"
                        : "1000 Seeds not granted yet"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      background: "rgba(255,120,90,0.08)",
                      border: "1px solid rgba(255,120,90,0.18)",
                    }}
                  >
                    <strong style={{ color: "#ffb39f" }}>Most Burned candidate</strong>
                    <div style={{ marginTop: "6px", opacity: 0.86 }}>
                      {weeklyEventStatus.competitionLeaderboard?.mostBurnedPost
                        ? `@${weeklyEventStatus.leaderboard.mostBurnedPost.userId?.username || "anonymous"} · ${weeklyEventStatus.leaderboard.mostBurnedPost.burnedCount || 0} Burn`
                        : "No current burned leader"}
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "0.84rem", opacity: 0.64 }}>
                      {weeklyEventStatus.rewards?.mostBurnedOverride?.applied
                        ? `Override active for @${weeklyEventStatus.rewards.mostBurnedOverride.username} until ${new Date(weeklyEventStatus.rewards.mostBurnedOverride.expiresAt).toLocaleString()}`
                        : weeklyEventStatus.currentEvent?.phase === "active"
                        ? "Temporary override not applied until Wednesday close"
                        : "Temporary override not applied yet"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  onClick={refreshWeeklyEventStatus}
                  style={btnStyle}
                >
                  Refresh weekly status
                </button>

                <button
                  type="button"
                  onClick={finalizeWeeklyEvent}
                  disabled={weeklyBusy}
                  style={{
                    ...safeBtnStyle,
                    minWidth: "220px",
                    opacity: weeklyBusy ? 0.72 : 1,
                  }}
                >
                  {weeklyBusy ? "Running..." : "Run weekly check now"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={cardStyle}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "0.8rem",
    }}
  >
    <div>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Currently Online</h2>
      <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: "0.85rem" }}>
        {onlineUsers.length} active session{onlineUsers.length === 1 ? "" : "s"}
      </p>
    </div>
  </div>

  {onlineUsers.length === 0 ? (
    <p style={{ opacity: 0.55, margin: 0 }}>No users online right now.</p>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {onlineUsers.map((user) => (
        <div
          key={user.socketId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt=""
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(120,255,170,0.16)",
                border: "1px solid rgba(120,255,170,0.35)",
                color: "#9cffb2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              {user.username?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <strong>@{user.username}</strong>
            <div style={{ opacity: 0.6, fontSize: "0.82rem", marginTop: "3px" }}>
              {user.isAdmin ? "Admin" : "User"} · Active{" "}
              {user.lastActiveAt
                ? new Date(user.lastActiveAt).toLocaleTimeString()
                : "now"}
            </div>
          </div>

          <span
            style={{
              marginLeft: "auto",
              padding: "4px 9px",
              borderRadius: "999px",
              background: "rgba(80,255,120,0.14)",
              border: "1px solid rgba(80,255,120,0.35)",
              color: "#8cff9c",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            ONLINE
          </span>
        </div>
      ))}
    </div>
  )}
</div>
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
  <button onClick={() => setTab("reports")} style={btnStyle}>
    Reports ({reports.length})
  </button>

  <button onClick={() => setTab("confessions")} style={btnStyle}>
    Confessions ({confessions.length})
  </button>

  <button onClick={() => setTab("users")} style={btnStyle}>
    Users ({users.length})
  </button>

  <button onClick={() => setTab("logs")} style={btnStyle}>
    Logs ({logs.length})
  </button>

  <button
    onClick={() => navigate("/admin/special-logs")}
    style={{
      ...btnStyle,
      color: "#ffe59a",
      borderColor: "rgba(255, 229, 154, 0.45)",
      background: "rgba(255, 229, 154, 0.1)",
    }}
  >
    Special Section Logs
  </button>
</div>

        {tab === "reports" && (
          <div>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <button
                onClick={() => setReportView("pending")}
                style={pillStyle(reportView === "pending")}
              >
                Pending ({pendingReports.length})
              </button>

              <button
                onClick={() => setReportView("resolved")}
                style={pillStyle(reportView === "resolved")}
              >
                Resolved ({resolvedReports.length})
              </button>

              {reportView === "resolved" && (
                <button
                  onClick={cleanupResolvedReports}
                  style={{
                    ...btnStyle,
                    marginLeft: "auto",
                    color: "#ffd27a",
                    borderColor: "rgba(255,200,80,0.4)",
                  }}
                >
                  Cleanup 30d+
                </button>
              )}
            </div>

            {visibleReports.length === 0 ? (
              <p style={{ opacity: 0.5 }}>
                No {reportView === "pending" ? "pending" : "resolved"} reports
                found.
              </p>
            ) : (
              visibleReports.map((r) => {
                const isCommentReport = r.targetType === "comment";
                const confessionId = r.confessionId?._id;

                return (
                  <div key={r._id} style={cardStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "inline-block",
                            marginBottom: "8px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isCommentReport
                              ? "rgba(120,180,255,0.15)"
                              : "rgba(255,200,80,0.15)",
                            color: isCommentReport ? "#9cc7ff" : "#ffd27a",
                            border: isCommentReport
                              ? "1px solid rgba(120,180,255,0.35)"
                              : "1px solid rgba(255,200,80,0.35)",
                          }}
                        >
                          {isCommentReport ? "Comment Report" : "Post Report"}
                        </div>

                        <div
                          style={{
                            fontSize: "0.8rem",
                            opacity: 0.65,
                            marginBottom: "0.4rem",
                          }}
                        >
                          Status:{" "}
                          <strong
                            style={{
                              color:
                                r.status === "resolved" ? "#7CFF9B" : "#ffcc66",
                            }}
                          >
                            {r.status}
                          </strong>
                        </div>

                        <p style={{ margin: "0 0 0.6rem", color: "#ffb3b3" }}>
                          Reason: {r.reason}
                        </p>

                        <p style={{ margin: "0 0 0.6rem", opacity: 0.85 }}>
                          Post: {r.confessionId?.message || "Post deleted"}
                        </p>

                        {isCommentReport && (
                          <p
                            style={{
                              margin: "0 0 0.6rem",
                              color: "#9cc7ff",
                              opacity: 0.95,
                            }}
                          >
                            Comment:{" "}
                            {r.commentText || "Comment text unavailable"}
                          </p>
                        )}

                        {r.resolvedNote && (
                          <p
                            style={{
                              margin: "0 0 0.6rem",
                              color: "#9cffb2",
                              opacity: 0.85,
                            }}
                          >
                            Resolve note: {r.resolvedNote}
                          </p>
                        )}

                        <small style={{ opacity: 0.5 }}>
                          Reported by @{r.reportedBy?.username || "unknown"} ·{" "}
                          {new Date(r.createdAt).toLocaleString()}
                        </small>

                        {r.status === "resolved" && r.deleteAfter && (
                          <div style={{ opacity: 0.55, fontSize: "0.78rem", marginTop: "6px" }}>
                            Auto-cleanup after {new Date(r.deleteAfter).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {confessionId && (
                          <button
                            onClick={() => openReportedItem(r)}
                            style={btnStyle}
                          >
                            Open
                          </button>
                        )}

                        {confessionId &&
                          !isCommentReport &&
                          r.status !== "resolved" && (
                            <button
                              onClick={() => deleteConfession(confessionId)}
                              style={deleteBtnStyle}
                            >
                              Delete Post
                            </button>
                          )}

                        {confessionId &&
                          isCommentReport &&
                          r.status !== "resolved" && (
                            <button
                              onClick={() => deleteReportedComment(r._id)}
                              style={commentDeleteBtnStyle}
                            >
                              Delete Comment
                            </button>
                          )}

                        {r.status !== "resolved" && (
                          <button
                            onClick={() => resolveReport(r._id)}
                            style={{
                              ...btnStyle,
                              color: "#9cffb2",
                              borderColor: "rgba(100,255,150,0.4)",
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}



        {tab === "logs" && (
          <div>
            {logs.length === 0 ? (
              <p style={{ opacity: 0.5 }}>No logs found yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log._id} style={cardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{log.message}</strong>

                      <div style={{ opacity: 0.65, fontSize: "0.85rem", marginTop: "6px" }}>
                        Type: {log.type} · {new Date(log.createdAt).toLocaleString()}
                      </div>

                      <div style={{ opacity: 0.65, fontSize: "0.85rem", marginTop: "6px" }}>
                        User: @{log.username || log.userId?.username || "unknown"}
                        {log.email ? ` · ${log.email}` : ""}
                      </div>

                      <div style={{ opacity: 0.65, fontSize: "0.85rem", marginTop: "6px" }}>
                        IP: {log.ipAddress || "Not available"}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: "999px",
                        background: "rgba(120,255,170,0.13)",
                        border: "1px solid rgba(120,255,170,0.32)",
                        color: "#9cffb2",
                        fontSize: "11px",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.type?.replaceAll("_", " ") || "log"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "confessions" && (
          <div>
            {confessions.length === 0 ? (
              <p style={{ opacity: 0.5 }}>No confessions found.</p>
            ) : (
              confessions.map((c) => (
                <div key={c._id} style={cardStyle}>
                  <p style={{ marginTop: 0 }}>{c.message}</p>

                  <small style={{ opacity: 0.5 }}>
                    @{c.userId?.username || "Anonymous"} ·{" "}
                    {new Date(c.createdAt).toLocaleString()}
                  </small>

                  <div style={{ marginTop: "0.8rem" }}>
                    <button
                      onClick={() => deleteConfession(c._id)}
                      style={deleteBtnStyle}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            {users.length === 0 ? (
              <p style={{ opacity: 0.5 }}>No users found.</p>
            ) : (
              users.map((u) => (
  <div key={u._id} style={cardStyle}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      <div>
        <strong>{u.username}</strong>

        <div
  style={{
    marginTop: "6px",
    color: "#9cffb2",
    fontSize: "0.85rem",
    fontWeight: 700,
  }}
>
  🌱 Seeds: {u.seeds || 0}
</div>

        <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {u.isBanned && (
            <span
              style={{
                padding: "4px 9px",
                borderRadius: "999px",
                background: "rgba(255,60,60,0.14)",
                border: "1px solid rgba(255,80,80,0.35)",
                color: "#ff7777",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              BANNED
            </span>
          )}

          {u.isSuspended && !u.isBanned && (
            <span
              style={{
                padding: "4px 9px",
                borderRadius: "999px",
                background: "rgba(255,200,80,0.14)",
                border: "1px solid rgba(255,200,80,0.35)",
                color: "#ffd27a",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              SUSPENDED
            </span>
          )}

          {!u.isBanned && !u.isSuspended && (
            <span
              style={{
                padding: "4px 9px",
                borderRadius: "999px",
                background: "rgba(100,255,150,0.12)",
                border: "1px solid rgba(100,255,150,0.3)",
                color: "#9cffb2",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              ACTIVE
            </span>
          )}
        </div>

        {u.suspendReason && (
          <div style={{ marginTop: "8px", color: "#ffd27a", fontSize: "0.85rem" }}>
            Suspend reason: {u.suspendReason}
          </div>
        )}

        {u.banReason && (
          <div style={{ marginTop: "8px", color: "#ff7777", fontSize: "0.85rem" }}>
            Ban reason: {u.banReason}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {u.isSuspended ? (
          <button onClick={() => unsuspendUser(u._id)} style={safeBtnStyle}>
            Unsuspend
          </button>
        ) : (
          !u.isBanned && (
            <button onClick={() => suspendUser(u._id)} style={suspendBtnStyle}>
              Suspend
            </button>
          )
        )}

        {u.isBanned ? (
          <button onClick={() => unbanUser(u._id)} style={safeBtnStyle}>
            Unban
          </button>
        ) : (
          <button onClick={() => banUser(u._id)} style={banBtnStyle}>
            Ban
          </button>
        )}
        <button
  onClick={() => giveSeedsToUser(u._id, u.username)}
  style={{
    ...safeBtnStyle,
    color: "#b8ff9c",
    borderColor: "rgba(180,255,120,0.5)",
    background: "rgba(120,255,80,0.14)",
  }}
>
  🌱 Give Seeds
</button>
        <button onClick={() => deleteUser(u._id)} style={deleteBtnStyle}>
          Delete User
        </button>
      </div>
    </div>
  </div>
))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
