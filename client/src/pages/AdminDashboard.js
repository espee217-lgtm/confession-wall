import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const API_URL = `${API_BASE}/api/admin`;
const REPORT_URL = `${API_BASE}/api/reports`;

export default function AdminDashboard() {
  const { adminToken, adminLogout } = useAdminAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("reports");
  const [reportView, setReportView] = useState("pending");
  const [confessions, setConfessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);

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

  useEffect(() => {
    if (!adminToken) return;

    if (tab === "reports") fetchReports();
    if (tab === "confessions") fetchConfessions();
    if (tab === "users") fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, adminToken]);

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
          ? { ...r, status: "resolved", resolvedNote: "Post deleted by admin." }
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
      alert(data.message || "Could not delete comment.");
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
            }
          : r
      )
    );

    alert(data.message || "Comment deleted and report resolved.");
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete user and ALL their confessions?")) return;

    await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers,
    });

    setUsers((prev) => prev.filter((u) => u._id !== id));
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

    setReports((prev) =>
      prev.map((r) =>
        r._id === id
          ? {
              ...r,
              status: "resolved",
              resolvedNote: data.report?.resolvedNote || note || "",
            }
          : r
      )
    );
  };

  const openReportedItem = (report) => {
    const confessionId = report.confessionId?._id;

    if (!confessionId) {
      alert("This post no longer exists.");
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

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <button onClick={() => setTab("reports")} style={btnStyle}>
            Reports ({reports.length})
          </button>

          <button onClick={() => setTab("confessions")} style={btnStyle}>
            Confessions ({confessions.length})
          </button>

          <button onClick={() => setTab("users")} style={btnStyle}>
            Users ({users.length})
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
                  <strong>{u.username}</strong>

                  <div style={{ opacity: 0.5, fontSize: "0.85rem" }}>
                    {u.email} · Joined{" "}
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>

                  <div style={{ marginTop: "0.8rem" }}>
                    <button
                      onClick={() => deleteUser(u._id)}
                      style={deleteBtnStyle}
                    >
                      Delete User
                    </button>
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