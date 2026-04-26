import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(100,180,80,0.2)",
  marginBottom: "12px",
  background: "rgba(255,255,255,0.06)",
  color: "#d4f0c8",
  boxSizing: "border-box",
  fontSize: "14px",
  fontFamily: "Georgia, serif",
  outline: "none",
};

const btnGreen = {
  width: "100%",
  padding: "11px",
  borderRadius: "10px",
  border: "none",
  background: "#4a8f35",
  color: "white",
  fontSize: "14px",
  fontFamily: "Georgia, serif",
  cursor: "pointer",
  fontWeight: 600,
  letterSpacing: "0.04em",
  marginBottom: "4px",
};

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
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
          fontSize: "14px",
          color: "#d4f0c8",
          fontFamily: "Georgia, serif",
          letterSpacing: "0.05em",
        }}
      >
        {title}
        <span style={{ fontSize: "11px", opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
      </button>
      <hr style={{ border: "none", borderTop: "1px solid rgba(100,180,80,0.2)", margin: "0 0 12px" }} />
      {open && children}
    </div>
  );
}

function Msg({ text, type }) {
  if (!text) return null;
  return (
    <p style={{
      padding: "8px 12px",
      borderRadius: "8px",
      background: type === "error" ? "rgba(220,53,69,0.15)" : "rgba(74,143,53,0.15)",
      color: type === "error" ? "#ff8888" : "#7ab868",
      fontSize: "13px",
      marginBottom: "12px",
      fontFamily: "Georgia, serif",
    }}>
      {text}
    </p>
  );
}

export default function Settings() {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("cw_theme") || "system"; } catch { return "system"; }
  });
  const [username, setUsername] = useState(user?.username || "");
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(user?.profilePicture || null);
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [bioMsg, setBioMsg] = useState({ text: "", type: "" });
  const [bioLoading, setBioLoading] = useState(false);
  const [postCount, setPostCount] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ text: "", type: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { if (!user) navigate("/login"); }, [user]);
  useEffect(() => { setBio(user?.bio || ""); }, [user]);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/post-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPostCount(d.count)).catch(() => {});
  }, [token]);

  if (!user) return null;

  const handleTheme = (t) => {
    setTheme(t);
    localStorage.setItem("cw_theme", t);
    const root = document.documentElement;
    if (t === "system") root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    else root.classList.toggle("dark", t === "dark");
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
      setProfileMsg({ text: "Profile updated!", type: "success" });
    } catch { setProfileMsg({ text: "Something went wrong.", type: "error" }); }
    finally { setProfileLoading(false); }
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
    } catch { setBioMsg({ text: "Something went wrong.", type: "error" }); }
    finally { setBioLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: "", type: "" });
    if (newPassword !== confirmPassword) return setPasswordMsg({ text: "Passwords do not match.", type: "error" });
    if (newPassword.length < 6) return setPasswordMsg({ text: "Min 6 characters.", type: "error" });
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setPasswordMsg({ text: data.message || "Failed", type: "error" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordMsg({ text: "Password changed!", type: "success" });
    } catch { setPasswordMsg({ text: "Something went wrong.", type: "error" }); }
    finally { setPasswordLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return setDeleteMsg({ text: "Enter your password to confirm.", type: "error" });
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) return setDeleteMsg({ text: data.message || "Deletion failed", type: "error" });
      logout(); navigate("/login");
    } catch { setDeleteMsg({ text: "Something went wrong.", type: "error" }); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1a2e1a", padding: "32px 16px 60px", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto" }}>
        <div style={{
          background: "rgba(20,40,20,0.92)",
          border: "1px solid rgba(100,180,80,0.2)",
          borderRadius: "20px",
          padding: "28px 24px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          <h2 style={{ margin: "0 0 24px", textAlign: "center", color: "#d4f0c8", fontSize: "20px", letterSpacing: "0.1em" }}>
            settings
          </h2>

          <Section title="theme" defaultOpen={true}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {["light", "system", "dark"].map(t => (
                <button key={t} type="button" onClick={() => handleTheme(t)} style={{
                  flex: 1, padding: "8px", borderRadius: "8px",
                  border: theme === t ? "2px solid #7ab868" : "1px solid rgba(100,180,80,0.2)",
                  background: theme === t ? "rgba(74,143,53,0.25)" : "transparent",
                  color: theme === t ? "#7ab868" : "#8aab7a",
                  cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif",
                }}>
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="profile" defaultOpen={true}>
            <Msg {...profileMsg} />
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "16px" }}>
                {preview ? (
                  <img src={preview} alt="profile" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px", border: "3px solid #4a8f35" }} />
                ) : (
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(74,143,53,0.2)", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", border: "2px solid rgba(100,180,80,0.2)" }}>
                    🌿
                  </div>
                )}
                <label style={{ color: "#7ab868", fontSize: "12px", cursor: "pointer", border: "1px solid rgba(100,180,80,0.2)", borderRadius: "20px", padding: "6px 16px", letterSpacing: "0.06em" }}>
                  change photo
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                </label>
              </div>
              <p style={{ textAlign: "center", fontSize: "12px", color: "#8aab7a", marginBottom: "14px", letterSpacing: "0.06em" }}>
                {postCount === null ? "..." : postCount} confession{postCount !== 1 ? "s" : ""} posted
              </p>
              <input type="text" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} required style={inputStyle} />
              <button type="submit" style={btnGreen} disabled={profileLoading}>
                {profileLoading ? "saving..." : "save profile"}
              </button>
            </form>
          </Section>

          <Section title="bio">
            <Msg {...bioMsg} />
            <form onSubmit={handleBioSubmit}>
              <textarea
                placeholder="write a short bio..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
              />
              <p style={{ fontSize: "11px", color: bio.length > 180 ? "#ff8888" : "#8aab7a", textAlign: "right", margin: "-8px 0 12px" }}>
                {bio.length}/200
              </p>
              <button type="submit" style={btnGreen} disabled={bioLoading}>
                {bioLoading ? "saving..." : "save bio"}
              </button>
            </form>
          </Section>

          <Section title="change password">
            <Msg {...passwordMsg} />
            <form onSubmit={handlePasswordSubmit}>
              <input type={showPasswords ? "text" : "password"} placeholder="current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={inputStyle} />
              <input type={showPasswords ? "text" : "password"} placeholder="new password (min 6)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={inputStyle} />
              <input type={showPasswords ? "text" : "password"} placeholder="confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#8aab7a", marginBottom: "14px", cursor: "pointer" }}>
                <input type="checkbox" checked={showPasswords} onChange={() => setShowPasswords(s => !s)} />
                show passwords
              </label>
              <button type="submit" style={btnGreen} disabled={passwordLoading}>
                {passwordLoading ? "updating..." : "change password"}
              </button>
            </form>
          </Section>

          <Section title="contact us">
            <p style={{ fontSize: "13px", color: "#8aab7a", marginBottom: "14px", lineHeight: 1.6 }}>
              have feedback or want to say hi? contact us at:
            </p>
            <a
              href="https://www.instagram.com/sumeet_7790"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(100,180,80,0.2)",
                textDecoration: "none",
              }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png"
                alt="Instagram"
                style={{ width: "28px", height: "28px", borderRadius: "8px" }}
              />
              <div>
                <p style={{ margin: 0, color: "#d4f0c8", fontSize: "14px", fontWeight: 600 }}>@sumeet_7790</p>
                <p style={{ margin: 0, color: "#8aab7a", fontSize: "11px", letterSpacing: "0.05em" }}>instagram · tap to visit</p>
              </div>
            </a>
          </Section>

          <Section title="danger zone">
            <Msg {...deleteMsg} />
            <button
              type="button"
              onClick={() => { logout(); navigate("/login"); }}
              style={{ width: "100%", marginBottom: "10px", background: "transparent", color: "#e05555", border: "2px solid #e05555", padding: "10px", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontFamily: "Georgia, serif", fontSize: "14px" }}
            >
              logout
            </button>
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                style={{ width: "100%", background: "transparent", color: "#e05555", border: "2px solid #e05555", padding: "10px", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontFamily: "Georgia, serif", fontSize: "14px" }}
              >
                delete my account
              </button>
            ) : (
              <div style={{ background: "rgba(220,53,69,0.08)", border: "1px solid #e05555", borderRadius: "10px", padding: "16px" }}>
                <p style={{ fontSize: "13px", color: "#e05555", marginBottom: "10px", lineHeight: 1.5 }}>
                  this will permanently delete your account and all confessions. cannot be undone.
                </p>
                <input type="password" placeholder="enter password to confirm" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} style={{ ...inputStyle, borderColor: "#e05555" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteMsg({ text: "", type: "" }); }}
                    style={{ flex: 1, background: "transparent", color: "#8aab7a", border: "1px solid rgba(100,180,80,0.2)", padding: "10px", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    style={{ flex: 1, background: "#e05555", color: "white", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}
                  >
                    {deleteLoading ? "deleting..." : "yes, delete"}
                  </button>
                </div>
              </div>
            )}
          </Section>

        </div>
      </div>
    </div>
  );
}