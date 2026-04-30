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
  }, [tab, adminToken]);

  const deleteConfession = async (id) => {
    if (!window.confirm("Delete this confession?")) return;

    await fetch(`${API_URL}/confessions/${id}`, {
      method: "DELETE",
      headers,
    });

    setConfessions((prev) => prev.filter((c) => c._id !== id));
    setReports((prev) => prev.filter((r) => r.confessionId?._id !== id));
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
    await fetch(`${REPORT_URL}/${id}/resolve`, {
      method: "PUT",
      headers,
    });

    setReports((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status: "resolved" } : r))
    );
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
            {reports.length === 0 ? (
              <p style={{ opacity: 0.5 }}>No reports found.</p>
            ) : (
              reports.map((r) => (
                <div key={r._id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                       <div
    style={{
      display: "inline-block",
      marginBottom: "8px",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 700,
      background:
        r.targetType === "comment"
          ? "rgba(120,180,255,0.15)"
          : "rgba(255,200,80,0.15)",
      color: r.targetType === "comment" ? "#9cc7ff" : "#ffd27a",
      border:
        r.targetType === "comment"
          ? "1px solid rgba(120,180,255,0.35)"
          : "1px solid rgba(255,200,80,0.35)",
    }}
  >
    {r.targetType === "comment" ? "Comment Report" : "Post Report"}
  </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.55, marginBottom: "0.4rem" }}>
                        Status:{" "}
                        <strong
                          style={{
                            color: r.status === "resolved" ? "#7CFF9B" : "#ffcc66",
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

                      <small style={{ opacity: 0.5 }}>
                        Reported by @{r.reportedBy?.username || "unknown"} ·{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </small>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {r.confessionId?._id && (
                        <>
                          <button
                            onClick={() =>
                              navigate(`/confession/${r.confessionId._id}`)
                            }
                            style={btnStyle}
                          >
                            Open
                          </button>

                          <button
                            onClick={() => deleteConfession(r.confessionId._id)}
                            style={deleteBtnStyle}
                          >
                            Delete Post
                          </button>
                        </>
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
                    <button onClick={() => deleteConfession(c._id)} style={deleteBtnStyle}>
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
                    {u.email} · Joined {new Date(u.createdAt).toLocaleDateString()}
                  </div>

                  <div style={{ marginTop: "0.8rem" }}>
                    <button onClick={() => deleteUser(u._id)} style={deleteBtnStyle}>
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