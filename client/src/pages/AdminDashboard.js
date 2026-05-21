import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket } from "../socket";
import { getStoredAdminToken, useAdminAuth } from "../context/AdminAuthContext";
import { useAuth } from "../context/AuthContext";
import "./AdminDashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API_URL = `${API_BASE}/api/admin`;
const REPORT_URL = `${API_BASE}/api/reports`;

const reportTypeLabel = {
  confession: "Post",
  comment: "Comment",
};

const safeText = (value) => String(value || "").trim();

const formatDateTime = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
};

const SAFETY_SEVERITY_SCORE = {
  low: 1,
  medium: 2,
  high: 3,
};

const getSafetyFlags = (confession) =>
  Array.isArray(confession?.safetyFlags) ? confession.safetyFlags : [];

const getHighestSafetySeverity = (confession) => {
  const flags = getSafetyFlags(confession);
  if (flags.length === 0) return null;

  let highest = "low";
  flags.forEach((flag) => {
    const severity = flag?.severity;
    if (
      severity &&
      SAFETY_SEVERITY_SCORE[severity] > SAFETY_SEVERITY_SCORE[highest]
    ) {
      highest = severity;
    }
  });

  return highest;
};

const getSafetySourceCounts = (confession) => {
  const flags = getSafetyFlags(confession);
  const counts = { post: 0, comment: 0 };

  flags.forEach((flag) => {
    if (flag?.source === "comment") {
      counts.comment += 1;
      return;
    }
    counts.post += 1;
  });

  return counts;
};

const getSafetySeverityBadgeStyle = (severity) => {
  if (severity === "high") {
    return {
      color: "#ffd8d6",
      border: "1px solid rgba(220,70,70,0.55)",
      background: "rgba(220,70,70,0.16)",
    };
  }

  if (severity === "medium") {
    return {
      color: "#ffe3bf",
      border: "1px solid rgba(216,150,70,0.55)",
      background: "rgba(216,150,70,0.16)",
    };
  }

  return {
    color: "#d5dde6",
    border: "1px solid rgba(135,150,170,0.5)",
    background: "rgba(120,135,155,0.14)",
  };
};

export default function AdminDashboard() {
  const { adminToken, adminLogout, syncAdminToken } = useAdminAuth();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [tab, setTab] = useState("reports");

  const [confessions, setConfessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);

  const [weeklyEventStatus, setWeeklyEventStatus] = useState(null);
  const [weeklyBusy, setWeeklyBusy] = useState(false);

  const [reportSearch, setReportSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("pending");

  const [confessionSearch, setConfessionSearch] = useState("");
  const [confessionVisibilityFilter, setConfessionVisibilityFilter] = useState("all");

  const [userSearch, setUserSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");

  const effectiveAdminToken = adminToken || getStoredAdminToken();
  const headers = { Authorization: `Bearer ${effectiveAdminToken}` };

  useEffect(() => {
    if (!adminToken) {
      syncAdminToken?.();
    }
  }, [adminToken, syncAdminToken]);

  useEffect(() => {
    if (!effectiveAdminToken) {
      navigate("/admin", { replace: true });
    }
  }, [effectiveAdminToken, navigate]);

  useEffect(() => {
    if (!effectiveAdminToken) return;

    const socket = connectSocket(effectiveAdminToken, "admin");
    if (!socket) return;

    const handleOnlineUsers = (incomingUsers) => {
      setOnlineUsers(Array.isArray(incomingUsers) ? incomingUsers : []);
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
  }, [effectiveAdminToken]);

  const fetchConfessions = async () => {
    const res = await fetch(`${API_URL}/confessions`, { headers });
    const data = await res.json().catch(() => []);
    setConfessions(Array.isArray(data) ? data : []);
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/users`, { headers });
    const data = await res.json().catch(() => []);
    setUsers(Array.isArray(data) ? data : []);
  };

  const fetchReports = async () => {
    const res = await fetch(REPORT_URL, { headers });
    const data = await res.json().catch(() => []);
    setReports(Array.isArray(data) ? data : []);
  };

  const fetchLogs = async () => {
    const res = await fetch(`${API_URL}/logs?limit=100`, { headers });
    const data = await res.json().catch(() => []);
    setLogs(Array.isArray(data) ? data : []);
  };

  const fetchWeeklyEventStatus = async () => {
    const res = await fetch(`${API_URL}/weekly-event/status`, { headers });
    const data = await res.json().catch(() => ({}));

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
    if (!effectiveAdminToken) return;

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
  }, [effectiveAdminToken]);

  const finalizeWeeklyEvent = async () => {
    if (
      !window.confirm(
        "Run weekly event maintenance now and apply any pending automated rewards?"
      )
    ) {
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
      ) || alert("Something went wrong while finalizing the weekly event.");
    } finally {
      setWeeklyBusy(false);
    }
  };

  const pendingReports = useMemo(
    () => reports.filter((report) => report.status !== "resolved"),
    [reports]
  );
  const resolvedReports = useMemo(
    () => reports.filter((report) => report.status === "resolved"),
    [reports]
  );
  const hiddenConfessionCount = useMemo(
    () => confessions.filter((confession) => confession?.isHidden).length,
    [confessions]
  );

  const onlineUsernameSet = useMemo(
    () =>
      new Set(
        onlineUsers
          .map((user) => safeText(user?.username).toLowerCase())
          .filter(Boolean)
      ),
    [onlineUsers]
  );

  const updateConfessionInAdminState = (updatedConfession) => {
    if (!updatedConfession?._id) return;

    setConfessions((prev) =>
      prev.map((confession) =>
        confession._id === updatedConfession._id ? updatedConfession : confession
      )
    );

    setReports((prev) =>
      prev.map((report) =>
        report.confessionId?._id === updatedConfession._id
          ? { ...report, confessionId: updatedConfession }
          : report
      )
    );
  };

  const getReportedComment = (report) => {
    if (report?.targetType !== "comment" || !report?.commentId) return null;

    const comments = Array.isArray(report?.confessionId?.comments)
      ? report.confessionId.comments
      : [];

    return (
      comments.find(
        (comment) => String(comment?._id) === String(report.commentId)
      ) || null
    );
  };

  const deleteConfession = async (id) => {
    if (!window.confirm("Delete this confession?")) return;

    await fetch(`${API_URL}/confessions/${id}`, {
      method: "DELETE",
      headers,
    });

    setConfessions((prev) =>
      prev.filter((confession) => confession._id !== id)
    );
    setReports((prev) =>
      prev.map((report) =>
        report.confessionId?._id === id
          ? {
              ...report,
              status: "resolved",
              resolvedNote: "Post deleted by admin.",
              resolvedAt: new Date().toISOString(),
            }
          : report
      )
    );
  };

  const hideConfession = async (id) => {
    const reason = window.prompt(
      "Reason for hiding this confession (optional):",
      ""
    );
    if (reason === null) return;

    const res = await fetch(`${API_URL}/confessions/${id}/hide`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not hide confession.", "error") ||
        alert(data.message || "Could not hide confession.");
      return;
    }

    updateConfessionInAdminState(data);
  };

  const unhideConfession = async (id) => {
    const res = await fetch(`${API_URL}/confessions/${id}/unhide`, {
      method: "PATCH",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unhide confession.", "error") ||
        alert(data.message || "Could not unhide confession.");
      return;
    }

    updateConfessionInAdminState(data);
  };

  const hideReportedPost = async (report) => {
    const confessionId = report?.confessionId?._id;
    if (!confessionId) return;

    const reason = window.prompt(
      "Reason for hiding this post (optional):",
      ""
    );
    if (reason === null) return;

    const res = await fetch(`${API_URL}/confessions/${confessionId}/hide`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not hide post.", "error") ||
        alert(data.message || "Could not hide post.");
      return;
    }

    updateConfessionInAdminState(data);
  };

  const unhideReportedPost = async (report) => {
    const confessionId = report?.confessionId?._id;
    if (!confessionId) return;

    const res = await fetch(`${API_URL}/confessions/${confessionId}/unhide`, {
      method: "PATCH",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unhide post.", "error") ||
        alert(data.message || "Could not unhide post.");
      return;
    }

    updateConfessionInAdminState(data);
  };

  const hideReportedComment = async (report) => {
    const confessionId = report?.confessionId?._id;
    if (!confessionId || !report?.commentId) return;

    const reason = window.prompt(
      "Reason for hiding this comment (optional):",
      ""
    );
    if (reason === null) return;

    const res = await fetch(
      `${API_URL}/confessions/${confessionId}/comments/${report.commentId}/hide`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      }
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not hide comment.", "error") ||
        alert(data.message || "Could not hide comment.");
      return;
    }

    updateConfessionInAdminState(data.confession);
  };

  const unhideReportedComment = async (report) => {
    const confessionId = report?.confessionId?._id;
    if (!confessionId || !report?.commentId) return;

    const res = await fetch(
      `${API_URL}/confessions/${confessionId}/comments/${report.commentId}/unhide`,
      {
        method: "PATCH",
        headers,
      }
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unhide comment.", "error") ||
        alert(data.message || "Could not unhide comment.");
      return;
    }

    updateConfessionInAdminState(data.confession);
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
      window.cwToast?.(data.message || "Could not delete comment.", "error") ||
        alert(data.message || "Could not delete comment.");
      return;
    }

    setReports((prev) =>
      prev.map((report) =>
        report._id === reportId
          ? {
              ...report,
              status: "resolved",
              resolvedNote:
                data.report?.resolvedNote ||
                "Reported comment was deleted by admin.",
              resolvedAt: data.report?.resolvedAt || new Date().toISOString(),
              deleteAfter: data.report?.deleteAfter || report.deleteAfter,
            }
          : report
      )
    );

    window.cwToast?.(
      data.message || "Comment deleted and report resolved.",
      "success"
    ) || alert(data.message || "Comment deleted and report resolved.");
  };

  const updateUserInState = (updatedUser) => {
    setUsers((prev) =>
      prev.map((user) => (user._id === updatedUser._id ? updatedUser : user))
    );
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete user and ALL their confessions?")) return;

    await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers,
    });
    setUsers((prev) => prev.filter((user) => user._id !== id));
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
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not suspend user.", "error") ||
        alert(data.message || "Could not suspend user.");
      return;
    }

    updateUserInState(data.user);
  };

  const unsuspendUser = async (id) => {
    const res = await fetch(`${API_URL}/users/${id}/unsuspend`, {
      method: "PATCH",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unsuspend user.", "error") ||
        alert(data.message || "Could not unsuspend user.");
      return;
    }

    updateUserInState(data.user);
  };

  const banUser = async (id) => {
    const reason = window.prompt("Reason for banning this user:", "Banned by admin.");
    if (reason === null) return;

    if (
      !window.confirm(
        "Ban this user? They will not be able to log in or use protected actions."
      )
    ) {
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
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not ban user.", "error") ||
        alert(data.message || "Could not ban user.");
      return;
    }

    updateUserInState(data.user);
  };

  const unbanUser = async (id) => {
    const res = await fetch(`${API_URL}/users/${id}/unban`, {
      method: "PATCH",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not unban user.", "error") ||
        alert(data.message || "Could not unban user.");
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
      window.cwToast?.(data.message || "Could not resolve report.", "error") ||
        alert(data.message || "Could not resolve report.");
      return;
    }

    setReports((prev) =>
      prev.map((report) =>
        report._id === id
          ? {
              ...report,
              status: "resolved",
              resolvedNote: data.report?.resolvedNote || note || "",
              resolvedAt: data.report?.resolvedAt || new Date().toISOString(),
              deleteAfter: data.report?.deleteAfter || report.deleteAfter,
            }
          : report
      )
    );
  };

  const cleanupResolvedReports = async () => {
    if (
      !window.confirm(
        "Delete resolved reports whose 30-day cleanup period has passed?"
      )
    ) {
      return;
    }

    const res = await fetch(`${API_URL}/reports/cleanup-resolved`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(
        data.message || "Could not cleanup resolved reports.",
        "error"
      ) || alert(data.message || "Could not cleanup resolved reports.");
      return;
    }

    await fetchReports();
    window.cwToast?.(data.message || "Old resolved reports cleaned.", "success") ||
      alert(data.message || "Old resolved reports cleaned.");
  };

  const deleteResolvedReportRecord = async (reportId) => {
    if (
      !window.confirm(
        "Delete this resolved report record only? This will not delete the post or comment."
      )
    ) {
      return;
    }

    const res = await fetch(`${API_URL}/reports/${reportId}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not delete report record.", "error") ||
        alert(data.message || "Could not delete report record.");
      return;
    }

    setReports((prev) => prev.filter((report) => report._id !== reportId));
    window.cwToast?.(data.message || "Report record deleted.", "success") ||
      alert(data.message || "Report record deleted.");
  };

  const clearResolvedReportRecords = async () => {
    if (
      !window.confirm(
        "Clear all resolved report records? This will not delete posts or comments."
      )
    ) {
      return;
    }

    const res = await fetch(`${API_URL}/reports/clear-resolved`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not clear resolved reports.", "error") ||
        alert(data.message || "Could not clear resolved reports.");
      return;
    }

    setReports((prev) => prev.filter((report) => report.status !== "resolved"));
    window.cwToast?.(data.message || "Resolved report records cleared.", "success") ||
      alert(data.message || "Resolved report records cleared.");
  };

  const deleteAdminLogRecord = async (logId) => {
    if (!window.confirm("Delete this admin log entry?")) {
      return;
    }

    const res = await fetch(`${API_URL}/logs/${logId}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not delete admin log.", "error") ||
        alert(data.message || "Could not delete admin log.");
      return;
    }

    setLogs((prev) => prev.filter((log) => log._id !== logId));
    window.cwToast?.(data.message || "Admin log deleted.", "success") ||
      alert(data.message || "Admin log deleted.");
  };

  const clearAdminLogs = async () => {
    if (!window.confirm("Clear all admin logs? This cannot be undone.")) {
      return;
    }

    const res = await fetch(`${API_URL}/logs/clear`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      window.cwToast?.(data.message || "Could not clear admin logs.", "error") ||
        alert(data.message || "Could not clear admin logs.");
      return;
    }

    setLogs([]);
    window.cwToast?.(data.message || "Admin logs cleared.", "success") ||
      alert(data.message || "Admin logs cleared.");
  };

  const openReportedItem = (report) => {
    const confessionId = report.confessionId?._id;

    if (!confessionId) {
      window.cwToast?.("This post no longer exists.", "warning") ||
        alert("This post no longer exists.");
      return;
    }

    if (report.targetType === "comment" && report.commentId) {
      navigate(`/confession/${confessionId}?from=admin&comment=${report.commentId}`, {
        state: { fromAdmin: true, returnTo: "/admin/dashboard" },
      });
      return;
    }

    navigate(`/confession/${confessionId}?from=admin`, {
      state: { fromAdmin: true, returnTo: "/admin/dashboard" },
    });
  };

  const enterMainSiteAsAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/enter-site`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        window.cwToast?.(
          data.message || "Could not enter main site as admin.",
          "error"
        ) || alert(data.message || "Could not enter main site as admin.");
        return;
      }

      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Something went wrong while entering main site.", "error") ||
        alert("Something went wrong while entering main site.");
    }
  };

  const filteredReports = useMemo(() => {
    const query = safeText(reportSearch).toLowerCase();

    return reports
      .filter((report) => {
        if (reportTypeFilter !== "all" && report.targetType !== reportTypeFilter) {
          return false;
        }

        if (reportStatusFilter === "pending" && report.status === "resolved") {
          return false;
        }

        if (reportStatusFilter === "resolved" && report.status !== "resolved") {
          return false;
        }

        if (!query) return true;

        const haystack = [
          report.reportedBy?.username,
          report.reason,
          report.commentText,
          report.confessionId?.message,
          report.targetType,
          report.status,
          report.resolvedNote,
        ]
          .map((part) => safeText(part).toLowerCase())
          .join(" ");

        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reportSearch, reportStatusFilter, reportTypeFilter, reports]);

  const filteredConfessions = useMemo(() => {
    const query = safeText(confessionSearch).toLowerCase();

    return confessions.filter((confession) => {
      const hasSafetyFlags = getSafetyFlags(confession).length > 0;

      if (
        confessionVisibilityFilter === "visible" &&
        confession.isHidden
      ) {
        return false;
      }

      if (
        confessionVisibilityFilter === "hidden" &&
        !confession.isHidden
      ) {
        return false;
      }

      if (
        confessionVisibilityFilter === "safety" &&
        !hasSafetyFlags
      ) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        confession.message,
        confession.userId?.username,
      ]
        .map((part) => safeText(part).toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [confessionSearch, confessionVisibilityFilter, confessions]);

  const filteredUsers = useMemo(() => {
    const query = safeText(userSearch).toLowerCase();

    return users.filter((user) => {
      if (!query) return true;
      const haystack = [
        user.username,
        user.email,
        user.role,
        user.suspendReason,
        user.banReason,
      ]
        .map((part) => safeText(part).toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [userSearch, users]);

  const filteredLogs = useMemo(() => {
    const query = safeText(logSearch).toLowerCase();

    return logs.filter((log) => {
      if (!query) return true;
      const haystack = [
        log.message,
        log.type,
        log.username,
        log.userId?.username,
        log.email,
        log.ipAddress,
      ]
        .map((part) => safeText(part).toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [logSearch, logs]);

  const reportStatusPillCounts = {
    all: reports.length,
    pending: pendingReports.length,
    resolved: resolvedReports.length,
  };

  return (
    <div className="adminDash-root">
      <div className="adminDash-shell">
        <header className="adminDash-header">
          <div>
            <h1 className="adminDash-title">Admin Dashboard</h1>
            <p className="adminDash-subtitle">
              Moderation, user management, and system oversight
            </p>
          </div>

          <div className="adminDash-headerActions">
            <button
              type="button"
              className="adminDash-btn adminDash-btnSecondary"
              onClick={enterMainSiteAsAdmin}
            >
              Enter Main Site
            </button>
            <button
              type="button"
              className="adminDash-btn adminDash-btnDanger"
              onClick={() => {
                adminLogout();
                navigate("/admin");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="adminDash-statsGrid">
          <article className="adminDash-statCard">
            <p className="adminDash-statLabel">Pending Reports</p>
            <p className="adminDash-statValue">{pendingReports.length}</p>
          </article>
          <article className="adminDash-statCard">
            <p className="adminDash-statLabel">Resolved Reports</p>
            <p className="adminDash-statValue">{resolvedReports.length}</p>
          </article>
          <article className="adminDash-statCard">
            <p className="adminDash-statLabel">Total Confessions</p>
            <p className="adminDash-statValue">{confessions.length}</p>
          </article>
          <article className="adminDash-statCard">
            <p className="adminDash-statLabel">Total Users</p>
            <p className="adminDash-statValue">{users.length}</p>
          </article>
          <article className="adminDash-statCard">
            <p className="adminDash-statLabel">Online Sessions</p>
            <p className="adminDash-statValue">{onlineUsers.length}</p>
          </article>
          <article className="adminDash-statCard">
            <p className="adminDash-statLabel">Hidden Posts</p>
            <p className="adminDash-statValue">{hiddenConfessionCount}</p>
          </article>
        </section>

        <section className="adminDash-surface adminDash-section">
          <div className="adminDash-sectionHeader">
            <h2>Weekly Event Status</h2>
            <div className="adminDash-actionRow">
              <button
                type="button"
                className="adminDash-btn adminDash-btnGhost"
                onClick={refreshWeeklyEventStatus}
              >
                Refresh
              </button>
              <button
                type="button"
                className="adminDash-btn adminDash-btnAccent"
                onClick={finalizeWeeklyEvent}
                disabled={weeklyBusy}
              >
                {weeklyBusy ? "Running..." : "Run Weekly Check"}
              </button>
            </div>
          </div>

          {weeklyEventStatus ? (
            <div className="adminDash-weeklyGrid">
              <article className="adminDash-weeklyCard">
                <p className="adminDash-kicker">Current Event</p>
                <h3>{weeklyEventStatus.currentEvent?.name || "Current event"}</h3>
                <p>{weeklyEventStatus.currentEvent?.description || "No description."}</p>
                <p className="adminDash-muted">
                  {weeklyEventStatus.currentEvent?.statusText || "Status unavailable"}
                </p>
              </article>

              <article className="adminDash-weeklyCard">
                <p className="adminDash-kicker">Most Watered</p>
                <h3>
                  {weeklyEventStatus.leaderboard?.mostWateredPost?.userId?.username
                    ? `@${weeklyEventStatus.leaderboard.mostWateredPost.userId.username}`
                    : "No leader yet"}
                </h3>
                <p>
                  {weeklyEventStatus.leaderboard?.mostWateredPost?.wateredCount || 0} water
                </p>
                <p className="adminDash-muted">
                  {weeklyEventStatus.rewards?.mostWateredSeeds?.granted
                    ? `Seeds payout granted (${weeklyEventStatus.rewards.mostWateredSeeds.amount || 1000})`
                    : "Seeds payout pending"}
                </p>
              </article>

              <article className="adminDash-weeklyCard">
                <p className="adminDash-kicker">Most Burned</p>
                <h3>
                  {weeklyEventStatus.leaderboard?.mostBurnedPost?.userId?.username
                    ? `@${weeklyEventStatus.leaderboard.mostBurnedPost.userId.username}`
                    : "No leader yet"}
                </h3>
                <p>
                  {weeklyEventStatus.leaderboard?.mostBurnedPost?.burnedCount || 0} burn
                </p>
                <p className="adminDash-muted">
                  {weeklyEventStatus.rewards?.mostBurnedReboundBoost?.granted
                    ? "Rebound boost granted"
                    : "Rebound boost pending"}
                </p>
              </article>
            </div>
          ) : (
            <p className="adminDash-muted">Weekly status is loading.</p>
          )}
        </section>

        <section className="adminDash-surface adminDash-section">
          <div className="adminDash-sectionHeader">
            <h2>Online Sessions</h2>
            <span className="adminDash-countPill">{onlineUsers.length} active</span>
          </div>

          {onlineUsers.length === 0 ? (
            <p className="adminDash-emptyText">No users online right now.</p>
          ) : (
            <div className="adminDash-onlineList">
              {onlineUsers.map((user) => (
                <article key={user.socketId} className="adminDash-onlineCard">
                  <div className="adminDash-onlineIdentity">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt=""
                        className="adminDash-avatar"
                      />
                    ) : (
                      <div className="adminDash-avatar adminDash-avatarFallback">
                        {safeText(user.username).charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className="adminDash-onlineName">@{user.username}</p>
                      <p className="adminDash-mutedSmall">
                        {user.isAdmin ? "Admin" : "User"} • Active{" "}
                        {user.lastActiveAt
                          ? new Date(user.lastActiveAt).toLocaleTimeString()
                          : "now"}
                      </p>
                    </div>
                  </div>
                  <span className="adminDash-statusBadge adminDash-statusOnline">
                    ONLINE
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="adminDash-tabRow">
          <button
            type="button"
            className={`adminDash-tab ${tab === "reports" ? "is-active" : ""}`}
            onClick={() => setTab("reports")}
          >
            Reports
          </button>
          <button
            type="button"
            className={`adminDash-tab ${tab === "confessions" ? "is-active" : ""}`}
            onClick={() => setTab("confessions")}
          >
            Confessions
          </button>
          <button
            type="button"
            className={`adminDash-tab ${tab === "users" ? "is-active" : ""}`}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            type="button"
            className={`adminDash-tab ${tab === "logs" ? "is-active" : ""}`}
            onClick={() => setTab("logs")}
          >
            Logs
          </button>
          <button
            type="button"
            className="adminDash-tab adminDash-tabSpecial"
            onClick={() => navigate("/admin/special-logs")}
          >
            Special Section Logs
          </button>
        </section>

        {tab === "reports" && (
          <section className="adminDash-surface adminDash-section">
            <div className="adminDash-sectionHeader">
              <h2>Reports</h2>
              <span className="adminDash-countPill">{filteredReports.length} shown</span>
            </div>

            <div className="adminDash-toolbar">
              <input
                className="adminDash-input"
                value={reportSearch}
                onChange={(event) => setReportSearch(event.target.value)}
                placeholder="Search by reporter, reason, post text, comment text..."
              />
            </div>

            <div className="adminDash-chipRow">
              <button
                type="button"
                className={`adminDash-chip ${reportTypeFilter === "all" ? "is-active" : ""}`}
                onClick={() => setReportTypeFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  reportTypeFilter === "confession" ? "is-active" : ""
                }`}
                onClick={() => setReportTypeFilter("confession")}
              >
                Post Reports
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  reportTypeFilter === "comment" ? "is-active" : ""
                }`}
                onClick={() => setReportTypeFilter("comment")}
              >
                Comment Reports
              </button>
            </div>

            <div className="adminDash-chipRow">
              <button
                type="button"
                className={`adminDash-chip ${reportStatusFilter === "all" ? "is-active" : ""}`}
                onClick={() => setReportStatusFilter("all")}
              >
                All ({reportStatusPillCounts.all})
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  reportStatusFilter === "pending" ? "is-active" : ""
                }`}
                onClick={() => setReportStatusFilter("pending")}
              >
                Pending ({reportStatusPillCounts.pending})
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  reportStatusFilter === "resolved" ? "is-active" : ""
                }`}
                onClick={() => setReportStatusFilter("resolved")}
              >
                Resolved ({reportStatusPillCounts.resolved})
              </button>

              {reportStatusFilter === "resolved" && (
                <button
                  type="button"
                  className="adminDash-btn adminDash-btnDanger"
                  onClick={clearResolvedReportRecords}
                >
                  Clear Resolved Reports
                </button>
              )}

              {reportStatusFilter === "resolved" && (
                <button
                  type="button"
                  className="adminDash-btn adminDash-btnGhost"
                  onClick={cleanupResolvedReports}
                >
                  Cleanup 30d+
                </button>
              )}
            </div>

            {filteredReports.length === 0 ? (
              <p className="adminDash-emptyText">No reports match the current filters.</p>
            ) : (
              <div className="adminDash-cardList">
                {filteredReports.map((report) => {
                  const isCommentReport = report.targetType === "comment";
                  const confessionId = report.confessionId?._id;
                  const reportedComment = getReportedComment(report);
                  const isTargetHidden = isCommentReport
                    ? Boolean(reportedComment?.isHidden)
                    : Boolean(report.confessionId?.isHidden);

                  return (
                    <article key={report._id} className="adminDash-itemCard">
                      <div className="adminDash-itemTop">
                        <div className="adminDash-chipRow">
                          <span className="adminDash-statusBadge adminDash-statusInfo">
                            {reportTypeLabel[report.targetType] || "Report"}
                          </span>
                          <span
                            className={`adminDash-statusBadge ${
                              report.status === "resolved"
                                ? "adminDash-statusSuccess"
                                : "adminDash-statusWarn"
                            }`}
                          >
                            {report.status}
                          </span>
                          {isTargetHidden && (
                            <span className="adminDash-statusBadge adminDash-statusHidden">
                              Hidden
                            </span>
                          )}
                        </div>

                        <div className="adminDash-actionRow">
                          {confessionId && (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnGhost"
                              onClick={() => openReportedItem(report)}
                            >
                              Open
                            </button>
                          )}

                          {confessionId && !isCommentReport && (
                            report.confessionId?.isHidden ? (
                              <button
                                type="button"
                                className="adminDash-btn adminDash-btnSuccess"
                                onClick={() => unhideReportedPost(report)}
                              >
                                Unhide Post
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="adminDash-btn adminDash-btnWarn"
                                onClick={() => hideReportedPost(report)}
                              >
                                Hide Post
                              </button>
                            )
                          )}

                          {confessionId && isCommentReport && reportedComment && (
                            reportedComment.isHidden ? (
                              <button
                                type="button"
                                className="adminDash-btn adminDash-btnSuccess"
                                onClick={() => unhideReportedComment(report)}
                              >
                                Unhide Comment
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="adminDash-btn adminDash-btnWarn"
                                onClick={() => hideReportedComment(report)}
                              >
                                Hide Comment
                              </button>
                            )
                          )}

                          {confessionId && !isCommentReport && report.status !== "resolved" && (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnDanger"
                              onClick={() => deleteConfession(confessionId)}
                            >
                              Delete Post
                            </button>
                          )}

                          {confessionId && isCommentReport && report.status !== "resolved" && (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnDanger"
                              onClick={() => deleteReportedComment(report._id)}
                            >
                              Delete Comment
                            </button>
                          )}

                          {report.status !== "resolved" && (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnAccent"
                              onClick={() => resolveReport(report._id)}
                            >
                              Resolve
                            </button>
                          )}

                          {report.status === "resolved" && (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnDanger"
                              onClick={() => deleteResolvedReportRecord(report._id)}
                            >
                              Delete Report
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="adminDash-itemBodyText">
                        <strong>Reason:</strong> {report.reason}
                      </p>
                      <p className="adminDash-itemBodyText">
                        <strong>Post:</strong> {report.confessionId?.message || "Post deleted"}
                      </p>
                      {isCommentReport && (
                        <p className="adminDash-itemBodyText">
                          <strong>Comment:</strong>{" "}
                          {report.commentText || "Comment text unavailable"}
                        </p>
                      )}
                      {report.resolvedNote && (
                        <p className="adminDash-itemBodyText">
                          <strong>Resolve note:</strong> {report.resolvedNote}
                        </p>
                      )}

                      <div className="adminDash-itemMeta">
                        <span>
                          Reported by @{report.reportedBy?.username || "unknown"}
                        </span>
                        <span>{formatDateTime(report.createdAt)}</span>
                        {report.deleteAfter && report.status === "resolved" && (
                          <span>Auto cleanup: {formatDateOnly(report.deleteAfter)}</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "confessions" && (
          <section className="adminDash-surface adminDash-section">
            <div className="adminDash-sectionHeader">
              <h2>Confessions</h2>
              <span className="adminDash-countPill">{filteredConfessions.length} shown</span>
            </div>

            <div className="adminDash-toolbar">
              <input
                className="adminDash-input"
                value={confessionSearch}
                onChange={(event) => setConfessionSearch(event.target.value)}
                placeholder="Search by post text or username..."
              />
            </div>

            <div className="adminDash-chipRow">
              <button
                type="button"
                className={`adminDash-chip ${
                  confessionVisibilityFilter === "all" ? "is-active" : ""
                }`}
                onClick={() => setConfessionVisibilityFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  confessionVisibilityFilter === "visible" ? "is-active" : ""
                }`}
                onClick={() => setConfessionVisibilityFilter("visible")}
              >
                Visible
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  confessionVisibilityFilter === "hidden" ? "is-active" : ""
                }`}
                onClick={() => setConfessionVisibilityFilter("hidden")}
              >
                Hidden
              </button>
              <button
                type="button"
                className={`adminDash-chip ${
                  confessionVisibilityFilter === "safety" ? "is-active" : ""
                }`}
                onClick={() => setConfessionVisibilityFilter("safety")}
              >
                Safety Flagged
              </button>
            </div>

            {filteredConfessions.length === 0 ? (
              <p className="adminDash-emptyText">
                No confessions match the current filters.
              </p>
            ) : (
              <div className="adminDash-cardList">
                {filteredConfessions.map((confession) => {
                  const safetyFlags = getSafetyFlags(confession);
                  const hasSafetyFlags = safetyFlags.length > 0;
                  const highestSeverity = getHighestSafetySeverity(confession);
                  const safetySources = getSafetySourceCounts(confession);

                  return (
                  <article key={confession._id} className="adminDash-itemCard">
                    <div className="adminDash-itemTop">
                      <div className="adminDash-chipRow">
                        {confession.isHidden ? (
                          <span className="adminDash-statusBadge adminDash-statusHidden">
                            Hidden
                          </span>
                        ) : (
                          <span className="adminDash-statusBadge adminDash-statusInfo">
                            Visible
                          </span>
                        )}
                        {hasSafetyFlags && (
                          <span
                            className="adminDash-statusBadge"
                            style={getSafetySeverityBadgeStyle(highestSeverity)}
                          >
                            Safety {String(highestSeverity || "low").toUpperCase()} - {safetyFlags.length}
                          </span>
                        )}
                      </div>

                      <div className="adminDash-actionRow">
                        {confession.isHidden ? (
                          <button
                            type="button"
                            className="adminDash-btn adminDash-btnSuccess"
                            onClick={() => unhideConfession(confession._id)}
                          >
                            Unhide
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adminDash-btn adminDash-btnWarn"
                            onClick={() => hideConfession(confession._id)}
                          >
                            Hide
                          </button>
                        )}

                        <button
                          type="button"
                          className="adminDash-btn adminDash-btnDanger"
                          onClick={() => deleteConfession(confession._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="adminDash-itemBodyText">{confession.message}</p>
                    {hasSafetyFlags && (
                      <details style={{ marginBottom: "10px" }}>
                        <summary
                          style={{
                            cursor: "pointer",
                            fontSize: "12px",
                            color: "rgba(220,230,245,0.88)",
                            marginBottom: "8px",
                          }}
                        >
                          Safety details - post {safetySources.post} - comment {safetySources.comment}
                        </summary>

                        <div style={{ display: "grid", gap: "6px" }}>
                          {safetyFlags
                            .slice()
                            .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
                            .map((flag, index) => (
                              <div
                                key={`${confession._id}-safety-${index}`}
                                style={{
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  background: "rgba(255,255,255,0.03)",
                                }}
                              >
                                <div className="adminDash-chipRow" style={{ marginBottom: "4px" }}>
                                  <span className="adminDash-statusBadge adminDash-statusInfo">
                                    {flag.category}
                                  </span>
                                  <span
                                    className="adminDash-statusBadge"
                                    style={getSafetySeverityBadgeStyle(flag.severity)}
                                  >
                                    {String(flag.severity || "low").toUpperCase()}
                                  </span>
                                  <span className="adminDash-statusBadge adminDash-statusHidden">
                                    {flag.source === "comment" ? "Comment" : "Post"}
                                  </span>
                                </div>
                                <p className="adminDash-itemBodyText" style={{ marginBottom: "4px" }}>
                                  <strong>Matched:</strong>{" "}
                                  {Array.isArray(flag.matchedTerms) && flag.matchedTerms.length > 0
                                    ? flag.matchedTerms.join(", ")
                                    : "N/A"}
                                </p>
                                <p className="adminDash-itemBodyText" style={{ marginBottom: 0 }}>
                                  <strong>Flagged:</strong> {formatDateTime(flag.createdAt)}
                                </p>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}
                    <div className="adminDash-itemMeta">
                      <span>@{confession.userId?.username || "Anonymous"}</span>
                      <span>{formatDateTime(confession.createdAt)}</span>
                    </div>
                  </article>
                );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "users" && (
          <section className="adminDash-surface adminDash-section">
            <div className="adminDash-sectionHeader">
              <h2>Users</h2>
              <span className="adminDash-countPill">{filteredUsers.length} shown</span>
            </div>

            <div className="adminDash-toolbar">
              <input
                className="adminDash-input"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by username, email, role, ban/suspension reason..."
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="adminDash-emptyText">No users match the current search.</p>
            ) : (
              <div className="adminDash-cardList">
                {filteredUsers.map((user) => {
                  const isOnline = onlineUsernameSet.has(
                    safeText(user.username).toLowerCase()
                  );

                  return (
                    <article key={user._id} className="adminDash-itemCard">
                      <div className="adminDash-itemTop">
                        <div>
                          <h3 className="adminDash-userName">@{user.username}</h3>
                          <p className="adminDash-mutedSmall">🌱 Seeds: {user.seeds || 0}</p>
                          {user.email && (
                            <p className="adminDash-mutedSmall">{user.email}</p>
                          )}
                        </div>

                        <div className="adminDash-actionRow">
                          {user.isSuspended ? (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnSuccess"
                              onClick={() => unsuspendUser(user._id)}
                            >
                              Unsuspend
                            </button>
                          ) : (
                            !user.isBanned && (
                              <button
                                type="button"
                                className="adminDash-btn adminDash-btnWarn"
                                onClick={() => suspendUser(user._id)}
                              >
                                Suspend
                              </button>
                            )
                          )}

                          {user.isBanned ? (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnSuccess"
                              onClick={() => unbanUser(user._id)}
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adminDash-btn adminDash-btnDanger"
                              onClick={() => banUser(user._id)}
                            >
                              Ban
                            </button>
                          )}

                          <button
                            type="button"
                            className="adminDash-btn adminDash-btnAccent"
                            onClick={() => giveSeedsToUser(user._id, user.username)}
                          >
                            Give Seeds
                          </button>

                          <button
                            type="button"
                            className="adminDash-btn adminDash-btnDanger"
                            onClick={() => deleteUser(user._id)}
                          >
                            Delete User
                          </button>
                        </div>
                      </div>

                      <div className="adminDash-chipRow">
                        {(user.isAdmin || user.role === "admin") && (
                          <span className="adminDash-statusBadge adminDash-statusInfo">
                            Admin
                          </span>
                        )}
                        {isOnline && (
                          <span className="adminDash-statusBadge adminDash-statusOnline">
                            Online
                          </span>
                        )}
                        {user.isSuspended && !user.isBanned && (
                          <span className="adminDash-statusBadge adminDash-statusWarn">
                            Suspended
                          </span>
                        )}
                        {user.isBanned && (
                          <span className="adminDash-statusBadge adminDash-statusDanger">
                            Banned
                          </span>
                        )}
                        {!user.isSuspended && !user.isBanned && (
                          <span className="adminDash-statusBadge adminDash-statusSuccess">
                            Active
                          </span>
                        )}
                      </div>

                      {user.suspendReason && (
                        <p className="adminDash-itemBodyText">
                          <strong>Suspend reason:</strong> {user.suspendReason}
                        </p>
                      )}
                      {user.banReason && (
                        <p className="adminDash-itemBodyText">
                          <strong>Ban reason:</strong> {user.banReason}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "logs" && (
          <section className="adminDash-surface adminDash-section">
            <div className="adminDash-sectionHeader">
              <h2>Logs</h2>
              <span className="adminDash-countPill">{filteredLogs.length} shown</span>
              <button
                type="button"
                className="adminDash-btn adminDash-btnDanger"
                onClick={clearAdminLogs}
              >
                Clear Admin Logs
              </button>
            </div>

            <div className="adminDash-toolbar">
              <input
                className="adminDash-input"
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="Search logs by type, message, username, email, or IP..."
              />
            </div>

            {filteredLogs.length === 0 ? (
              <p className="adminDash-emptyText">No logs match the current search.</p>
            ) : (
              <div className="adminDash-cardList">
                {filteredLogs.map((log) => (
                  <article key={log._id} className="adminDash-itemCard">
                    <div className="adminDash-itemTop">
                      <div>
                        <p className="adminDash-itemBodyText">
                          <strong>{log.message}</strong>
                        </p>
                        <div className="adminDash-itemMeta">
                          <span>Type: {log.type}</span>
                          <span>{formatDateTime(log.createdAt)}</span>
                        </div>
                        <div className="adminDash-itemMeta">
                          <span>
                            User: @{log.username || log.userId?.username || "unknown"}
                          </span>
                          {log.email ? <span>{log.email}</span> : null}
                          <span>IP: {log.ipAddress || "Not available"}</span>
                        </div>
                      </div>

                      <div className="adminDash-actionRow">
                        <span className="adminDash-statusBadge adminDash-statusInfo">
                          {(log.type || "log").replaceAll("_", " ")}
                        </span>
                        <button
                          type="button"
                          className="adminDash-btn adminDash-btnDanger"
                          onClick={() => deleteAdminLogRecord(log._id)}
                        >
                          Delete Log
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
