import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const API_URL = "https://confession-wall-hn63.onrender.com/api/admin";

export default function AdminDashboard() {
  const { adminToken, adminLogout } = useAdminAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("confessions");
  const [confessions, setConfessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedConfession, setSelectedConfession] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);

  // eslint-disable-next-line
  useEffect(() => {
    if (!adminToken) return navigate("/admin");
  }, [adminToken]);

  const headers = { Authorization: `Bearer ${adminToken}` };

  const fetchConfessions = async () => {
    const res = await fetch(`${API_URL}/confessions`, { headers });
    setConfessions(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/users`, { headers });
    setUsers(await res.json());
  };

  // eslint-disable-next-line
  useEffect(() => {
    if (tab === "confessions") fetchConfessions();
    else fetchUsers();
  }, [tab]);

  const deleteConfession = async (id) => {
    if (!window.confirm("Delete this confession?")) return;
    await fetch(`${API_URL}/confessions/${id}`, { method: "DELETE", headers });
    setConfessions(prev => prev.filter(c => c._id !== id));
    setSelectedConfession(null);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete user and ALL their confessions?")) return;
    await fetch(`${API_URL}/users/${id}`, { method: "DELETE", headers });
    setUsers(prev => prev.filter(u => u._id !== id));
    setSelectedUser(null);
  };

  const openUser = async (user) => {
    setSelectedUser(user);
    // filter confessions by this user from already fetched list
    const res = await fetch(`${API_URL}/confessions`, { headers });
    const all = await res.json();
    setUserPosts(all.filter(c => c.userId?._id === user._id));
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "14px",
    padding: "1rem 1.2rem",
    marginBottom: "0.75rem",
    cursor: "pointer",
    transition: "background 0.2s",
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

  // ── CONFESSION DETAIL MODAL ──
  if (selectedConfession) {
    const c = selectedConfession;
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a, #1a1a2e)", color: "white", padding: "2rem" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <button onClick={() => setSelectedConfession(null)} style={{ ...btnStyle, marginBottom: "1.5rem" }}>
            ← Back
          </button>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "18px", padding: "2rem" }}>
            {/* User info */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.2rem" }}>
              {c.userId?.profilePicture ? (
                <img src={c.userId.profilePicture} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem" }}>
                  {c.userId?.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div>
                <strong>{c.userId?.username || "Anonymous"}</strong>
                <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>{new Date(c.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Message */}
            <p style={{ fontSize: "1.1rem", lineHeight: 1.7, marginBottom: "1.2rem" }}>{c.message}</p>

            {/* Image */}
            {c.image && (
              <img src={c.image} alt="confession" style={{ width: "100%", borderRadius: "12px", marginBottom: "1.2rem", objectFit: "cover", maxHeight: "400px" }} />
            )}

            <button onClick={() => deleteConfession(c._id)} style={deleteBtnStyle}>
              🗑️ Delete Confession
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── USER DETAIL MODAL ──
  if (selectedUser) {
    const u = selectedUser;
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a, #1a1a2e)", color: "white", padding: "2rem" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <button onClick={() => setSelectedUser(null)} style={{ ...btnStyle, marginBottom: "1.5rem" }}>
            ← Back
          </button>

          {/* User profile card */}
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "18px", padding: "2rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              {u.profilePicture ? (
                <img src={u.profilePicture} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.5rem" }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0 }}>{u.username}</h2>
                <div style={{ opacity: 0.5, fontSize: "0.85rem" }}>{u.email}</div>
                <div style={{ opacity: 0.5, fontSize: "0.8rem" }}>Joined {new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            {u.bio && <p style={{ opacity: 0.7, fontStyle: "italic", margin: "0.5rem 0 1rem" }}>"{u.bio}"</p>}
            <button onClick={() => deleteUser(u._id)} style={deleteBtnStyle}>
              🗑️ Delete User & All Posts
            </button>
          </div>

          {/* User's posts */}
          <h3 style={{ marginBottom: "1rem", opacity: 0.8 }}>Posts ({userPosts.length})</h3>
          {userPosts.length === 0 && <p style={{ opacity: 0.5 }}>No posts yet.</p>}
          {userPosts.map(c => (
            <div key={c._id} style={{ ...cardStyle, cursor: "default" }}>
              <p style={{ margin: "0 0 0.5rem" }}>{c.message}</p>
              {c.image && <img src={c.image} alt="" style={{ width: "100%", borderRadius: "10px", marginBottom: "0.5rem", maxHeight: "250px", objectFit: "cover" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <small style={{ opacity: 0.5 }}>{new Date(c.createdAt).toLocaleString()}</small>
                <button onClick={() => deleteConfession(c._id)} style={deleteBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ──
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a, #1a1a2e)", color: "white", padding: "2rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>🛡️ Admin Dashboard</h1>
          <button onClick={() => { adminLogout(); navigate("/admin"); }} style={deleteBtnStyle}>
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <button onClick={() => setTab("confessions")} style={{
            ...btnStyle,
            background: tab === "confessions" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
            borderColor: tab === "confessions" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
          }}>
            💬 Confessions ({confessions.length})
          </button>
          <button onClick={() => setTab("users")} style={{
            ...btnStyle,
            background: tab === "users" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
            borderColor: tab === "users" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
          }}>
            👥 Users ({users.length})
          </button>
        </div>

        {/* Confessions list */}
        {tab === "confessions" && (
          <div>
            {confessions.length === 0 && <p style={{ opacity: 0.5 }}>No confessions found.</p>}
            {confessions.map(c => (
              <div key={c._id} style={cardStyle} onClick={() => setSelectedConfession(c)}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, marginRight: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                      {c.userId?.profilePicture ? (
                        <img src={c.userId.profilePicture} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                          {c.userId?.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{c.userId?.username || "Anonymous"}</span>
                      <span style={{ fontSize: "0.75rem", opacity: 0.4 }}>· {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "500px" }}>
                      {c.message}
                    </p>
                    {c.image && <span style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "0.3rem", display: "block" }}>📎 Has image</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteConfession(c._id); }} style={deleteBtnStyle}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users list */}
        {tab === "users" && (
          <div>
            {users.length === 0 && <p style={{ opacity: 0.5 }}>No users found.</p>}
            {users.map(u => (
              <div key={u._id} style={cardStyle} onClick={() => openUser(u)}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)" }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem" }}>
                        {u.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <strong style={{ fontSize: "1rem" }}>{u.username}</strong>
                      <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>{u.email} · Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                      {u.bio && <div style={{ fontSize: "0.8rem", opacity: 0.6, fontStyle: "italic" }}>"{u.bio}"</div>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteUser(u._id); }} style={deleteBtnStyle}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

