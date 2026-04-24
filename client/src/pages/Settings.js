import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../AppStyle.css";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

// ── small helper ──────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          padding: "10px 0",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "15px",
          color: "var(--text)",
          marginTop: 0,
        }}
      >
        {title}
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      <hr style={{ border: "none", borderTop: "1px solid var(--muted)", margin: "0 0 12px" }} />
      {open && children}
    </div>
  );
}

// ── feedback helper ───────────────────────────────────────────────────────────
function Msg({ text, type }) {
  if (!text) return null;
  return (
    <p style={{
      padding: "8px 12px",
      borderRadius: "8px",
      background: type === "error" ? "rgba(220,53,69,0.12)" : "rgba(99,102,241,0.12)",
      color: type === "error" ? "var(--danger)" : "var(--primary)",
      fontSize: "14px",
      marginBottom: "12px",
    }}>
      {text}
    </p>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();

  // ── theme ──
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("cw_theme") || "system"; } catch { return "system"; }
  });

  // ── profile ──
  const [username, setUsername] = useState(user?.username || "");
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(user?.profilePicture || null);
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  // ── bio ──
  const [bio, setBio] = useState(user?.bio || "");
  const [bioMsg, setBioMsg] = useState({ text: "", type: "" });
  const [bioLoading, setBioLoading] = useState(false);

  // ── post count ──
  const [postCount, setPostCount] = useState(null);

  // ── password ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── delete account ──
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ text: "", type: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── effects ──
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);

  useEffect(() => {
    setBio(user?.bio || "");
  }, [user]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/post-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPostCount(data.count))
      .catch(() => {});
  }, [token]);

  if (!user) return null;

  // ── handlers ─────────────────────────────────────────────────────────────

  const handleTheme = (t) => {
    setTheme(t);
    localStorage.setItem("cw_theme", t);
    const root = document.documentElement;
    if (t === "system") {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      root.classList.toggle("dark", t === "dark");
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    setProfilePicture(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: "", type: "" });
    setProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", username);
      if (profilePicture) formData.append("profilePicture", profilePicture);
      const res = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) return setProfileMsg({ text: data.message || "Update failed", type: "error" });
      login({ ...user, username: data.username, profilePicture: data.profilePicture }, token);
      setProfileMsg({ text: "Profile updated successfully!", type: "success" });
    } catch {
      setProfileMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBioSubmit = async (e) => {
    e.preventDefault();
    setBioMsg({ text: "", type: "" });
    if (bio.length > 200) return setBioMsg({ text: "Bio must be 200 characters or less.", type: "error" });
    setBioLoading(true);
    try {
      const res = await fetch(`${API_URL}/bio`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const data = await res.json();
      if (!res.ok) return setBioMsg({ text: data.message || "Update failed", type: "error" });
      const updatedUser = { ...user, bio };
      localStorage.setItem("cw_user", JSON.stringify(updatedUser));
      login(updatedUser, token);
      setBioMsg({ text: "Bio updated!", type: "success" });
    } catch {
      setBioMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setBioLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: "", type: "" });
    if (newPassword !== confirmPassword)
      return setPasswordMsg({ text: "New passwords do not match.", type: "error" });
    if (newPassword.length < 6)
      return setPasswordMsg({ text: "New password must be at least 6 characters.", type: "error" });
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setPasswordMsg({ text: data.message || "Failed to change password", type: "error" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordMsg({ text: "Password changed successfully!", type: "success" });
    } catch {
      setPasswordMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return setDeleteMsg({ text: "Please enter your password to confirm.", type: "error" });
    setDeleteLoading(true);
    setDeleteMsg({ text: "", type: "" });
    try {
      const res = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) return setDeleteMsg({ text: data.message || "Deletion failed", type: "error" });
      logout();
      navigate("/login");
    } catch {
      setDeleteMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="container" style={{ maxWidth: "440px", marginTop: "3rem", paddingBottom: "4rem" }}>
      <div className="confession-card">
        <h2 style={{ margin: "0 0 1.5rem", textAlign: "center" }}>Settings</h2>

        {/* ── THEME ── */}
        <Section title="🎨 Theme" defaultOpen={true}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "0.5rem" }}>
            {["light", "system", "dark"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTheme(t)}
                style={{
                  flex: 1, padding: "8px", borderRadius: "8px", marginTop: 0,
                  border: theme === t ? "2px solid var(--primary)" : "1px solid #ccc",
                  background: theme === t ? "var(--primary)" : "transparent",
                  color: theme === t ? "white" : "var(--text)",
                  cursor: "pointer", fontWeight: 600, fontSize: "13px",
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </Section>

        {/* ── PROFILE ── */}
        <Section title="👤 Profile" defaultOpen={true}>
          <Msg {...profileMsg} />
          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1rem" }}>
              {preview ? (
                <img src={preview} alt="profile" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px" }} />
              ) : (
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--muted)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>👤</div>
              )}
              <label className="attach-btn" style={{ marginTop: 0 }}>
                Change Photo
                <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
              </label>
            </div>

            <p style={{ textAlign: "center", fontSize: "14px", color: "var(--muted)", marginBottom: "12px" }}>
              📝 {postCount === null ? "..." : postCount} confession{postCount !== 1 ? "s" : ""} posted
            </p>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={inputStyle}
            />
            <button className="btn" type="submit" style={{ width: "100%" }} disabled={profileLoading}>
              {profileLoading ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </Section>

        {/* ── BIO ── */}
        <Section title="📝 Bio">
          <Msg {...bioMsg} />
          <form onSubmit={handleBioSubmit}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <textarea
                placeholder="Write a short bio about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "80px",
                  marginBottom: "4px",
                  fontFamily: "inherit",
                }}
              />
              <p style={{ fontSize: "12px", color: bio.length > 180 ? "var(--danger)" : "var(--muted)", textAlign: "right", margin: 0 }}>
                {bio.length}/200
              </p>
            </div>
            <button className="btn" type="submit" style={{ width: "100%" }} disabled={bioLoading}>
              {bioLoading ? "Saving..." : "Save Bio"}
            </button>
          </form>
        </Section>

        {/* ── CHANGE PASSWORD ── */}
        <Section title="🔒 Change Password">
          <Msg {...passwordMsg} />
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--muted)", marginBottom: "16px", cursor: "pointer" }}>
              <input type="checkbox" checked={showPasswords} onChange={() => setShowPasswords((s) => !s)} />
              Show passwords
            </label>
            <button className="btn" type="submit" style={{ width: "100%" }} disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </Section>

        {/* ── DANGER ZONE ── */}
        <Section title="⚠️ Danger Zone">
          <Msg {...deleteMsg} />

          <button
            type="button"
            onClick={() => { logout(); navigate("/login"); }}
            style={{ width: "100%", marginTop: 0, marginBottom: "10px", background: "transparent", color: "var(--danger)", border: "2px solid var(--danger)", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
          >
            🚪 Logout
          </button>

          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              style={{ width: "100%", marginTop: 0, background: "transparent", color: "var(--danger)", border: "2px solid var(--danger)", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
            >
              🗑️ Delete My Account
            </button>
          ) : (
            <div style={{ background: "rgba(220,53,69,0.08)", border: "1px solid var(--danger)", borderRadius: "10px", padding: "16px" }}>
              <p style={{ fontSize: "14px", color: "var(--danger)", fontWeight: 600, marginBottom: "10px" }}>
                ⚠️ This will permanently delete your account and all your confessions. This cannot be undone.
              </p>
              <input
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={{ ...inputStyle, borderColor: "var(--danger)" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteMsg({ text: "", type: "" }); }}
                  style={{ flex: 1, marginTop: 0, background: "transparent", color: "var(--text)", border: "1px solid #ccc", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  style={{ flex: 1, marginTop: 0, background: "var(--danger)", color: "white", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                >
                  {deleteLoading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}

// ── shared input style ────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginBottom: "12px",
  background: "var(--card)",
  color: "var(--text)",
  boxSizing: "border-box",
  fontSize: "14px",
};
