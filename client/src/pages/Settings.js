import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://confession-wall-hn63.onrender.com/api/auth";

function getSystemDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getPalette(theme) {
  const dark = theme === "dark" || (theme === "system" && getSystemDark());

  if (dark) {
    return {
      pageBg: "#061406",
      panelBg: "rgba(10, 28, 10, 0.94)",
      inputBg: "rgba(255,255,255,0.06)",
      text: "#d4f0c8",
      muted: "#8aab7a",
      accent: "#7ab868",
      button: "#4a8f35",
      border: "rgba(122,184,104,0.25)",
      shadow: "0 8px 40px rgba(0,0,0,0.45)",
    };
  }

  return {
    pageBg: "#eaf7df",
    panelBg: "rgba(247,255,239,0.94)",
    inputBg: "rgba(255,255,255,0.72)",
    text: "#17351c",
    muted: "#5f7f5c",
    accent: "#3f8f35",
    button: "#4a9a38",
    border: "rgba(74,143,53,0.28)",
    shadow: "0 8px 35px rgba(60,120,50,0.18)",
  };
}

function Msg({ text, type, palette }) {
  if (!text) return null;
  return (
    <p
      style={{
        padding: "8px 12px",
        borderRadius: "8px",
        background: type === "error" ? "rgba(220,53,69,0.15)" : "rgba(74,143,53,0.15)",
        color: type === "error" ? "#ff6666" : palette.accent,
        fontSize: "13px",
        marginBottom: "12px",
        fontFamily: "Georgia, serif",
      }}
    >
      {text}
    </p>
  );
}

function Section({ title, children, defaultOpen = false, palette }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: "1rem" }}>
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
          fontSize: "14px",
          color: palette.text,
          fontFamily: "Georgia, serif",
          letterSpacing: "0.05em",
        }}
      >
        {title}
        <span style={{ fontSize: "11px", opacity: 0.55 }}>{open ? "▲" : "▼"}</span>
      </button>

      <hr
        style={{
          border: "none",
          borderTop: `1px solid ${palette.border}`,
          margin: "0 0 12px",
        }}
      />

      {open && children}
    </div>
  );
}

export default function Settings() {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("cw_theme") || "system";
    } catch {
      return "system";
    }
  });

  const palette = getPalette(theme);

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: `1px solid ${palette.border}`,
    marginBottom: "12px",
    background: palette.inputBg,
    color: palette.text,
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
    background: palette.button,
    color: "white",
    fontSize: "14px",
    fontFamily: "Georgia, serif",
    cursor: "pointer",
    fontWeight: 600,
    letterSpacing: "0.04em",
    marginBottom: "4px",
  };

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

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    setBio(user?.bio || "");
  }, [user]);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/post-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPostCount(d.count))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.classList.toggle("dark", getSystemDark());
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  if (!user) return null;

  const handleTheme = (t) => {
    setTheme(t);
    localStorage.setItem("cw_theme", t);

    const root = document.documentElement;
    if (t === "system") {
      root.classList.toggle("dark", getSystemDark());
    } else {
      root.classList.toggle("dark", t === "dark");
    }

    window.dispatchEvent(new Event("themechange"));
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

      if (!res.ok) {
        setProfileMsg({ text: data.message || "Update failed", type: "error" });
        return;
      }

      login({ ...user, username: data.username, profilePicture: data.profilePicture }, token);
      setProfileMsg({ text: "Profile updated!", type: "success" });
    } catch {
      setProfileMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBioSubmit = async (e) => {
    e.preventDefault();
    setBioMsg({ text: "", type: "" });

    if (bio.length > 200) {
      setBioMsg({ text: "Bio must be 200 characters or less.", type: "error" });
      return;
    }

    setBioLoading(true);

    try {
      const res = await fetch(`${API_URL}/bio`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBioMsg({ text: data.message || "Update failed", type: "error" });
        return;
      }

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

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "Passwords do not match.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ text: "Min 6 characters.", type: "error" });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordMsg({ text: data.message || "Failed", type: "error" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ text: "Password changed!", type: "success" });
    } catch {
      setPasswordMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteMsg({ text: "Enter your password to confirm.", type: "error" });
      return;
    }

    setDeleteLoading(true);

    try {
      const res = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteMsg({ text: data.message || "Deletion failed", type: "error" });
        return;
      }

      logout();
      navigate("/login");
    } catch {
      setDeleteMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.pageBg,
        padding: "32px 16px 60px",
        fontFamily: "Georgia, serif",
        transition: "background 0.3s ease",
      }}
    >
      <div style={{ maxWidth: "460px", margin: "0 auto" }}>
        <div
          style={{
            background: palette.panelBg,
            border: `1px solid ${palette.border}`,
            borderRadius: "20px",
            padding: "28px 24px",
            backdropFilter: "blur(16px)",
            boxShadow: palette.shadow,
            transition: "all 0.3s ease",
          }}
        >
          <h2
            style={{
              margin: "0 0 24px",
              textAlign: "center",
              color: palette.text,
              fontSize: "20px",
              letterSpacing: "0.1em",
            }}
          >
            settings
          </h2>

          <Section title="theme" defaultOpen={true} palette={palette}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {["light", "system", "dark"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTheme(t)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border:
                      theme === t
                        ? `2px solid ${palette.accent}`
                        : `1px solid ${palette.border}`,
                    background:
                      theme === t ? "rgba(74,143,53,0.22)" : "transparent",
                    color: theme === t ? palette.accent : palette.muted,
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="profile" defaultOpen={true} palette={palette}>
            <Msg {...profileMsg} palette={palette} />
            <form onSubmit={handleProfileSubmit}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="profile"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginBottom: "10px",
                      border: `3px solid ${palette.button}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: "rgba(74,143,53,0.18)",
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2rem",
                      border: `2px solid ${palette.border}`,
                    }}
                  >
                    🌿
                  </div>
                )}

                <label
                  style={{
                    color: palette.accent,
                    fontSize: "12px",
                    cursor: "pointer",
                    border: `1px solid ${palette.border}`,
                    borderRadius: "20px",
                    padding: "6px 16px",
                    letterSpacing: "0.06em",
                  }}
                >
                  change photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <p
                style={{
                  textAlign: "center",
                  fontSize: "12px",
                  color: palette.muted,
                  marginBottom: "14px",
                  letterSpacing: "0.06em",
                }}
              >
                {postCount === null ? "..." : postCount} confession
                {postCount !== 1 ? "s" : ""} posted
              </p>

              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={inputStyle}
              />

              <button type="submit" style={btnGreen} disabled={profileLoading}>
                {profileLoading ? "saving..." : "save profile"}
              </button>
            </form>
          </Section>

          <Section title="bio" palette={palette}>
            <Msg {...bioMsg} palette={palette} />
            <form onSubmit={handleBioSubmit}>
              <textarea
                placeholder="write a short bio..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
              />

              <p
                style={{
                  fontSize: "11px",
                  color: bio.length > 180 ? "#ff6666" : palette.muted,
                  textAlign: "right",
                  margin: "-8px 0 12px",
                }}
              >
                {bio.length}/200
              </p>

              <button type="submit" style={btnGreen} disabled={bioLoading}>
                {bioLoading ? "saving..." : "save bio"}
              </button>
            </form>
          </Section>

          <Section title="change password" palette={palette}>
            <Msg {...passwordMsg} palette={palette} />
            <form onSubmit={handlePasswordSubmit}>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={inputStyle}
              />

              <input
                type={showPasswords ? "text" : "password"}
                placeholder="new password (min 6)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={inputStyle}
              />

              <input
                type={showPasswords ? "text" : "password"}
                placeholder="confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: palette.muted,
                  marginBottom: "14px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={() => setShowPasswords((s) => !s)}
                />
                show passwords
              </label>

              <button type="submit" style={btnGreen} disabled={passwordLoading}>
                {passwordLoading ? "updating..." : "change password"}
              </button>
            </form>
          </Section>

          <Section title="contact us" palette={palette}>
            <p
              style={{
                fontSize: "13px",
                color: palette.muted,
                marginBottom: "14px",
                lineHeight: 1.6,
              }}
            >
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
                background: palette.inputBg,
                border: `1px solid ${palette.border}`,
                textDecoration: "none",
              }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png"
                alt="Instagram"
                style={{ width: "28px", height: "28px", borderRadius: "8px" }}
              />

              <div>
                <p
                  style={{
                    margin: 0,
                    color: palette.text,
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  @sumeet_7790
                </p>

                <p
                  style={{
                    margin: 0,
                    color: palette.muted,
                    fontSize: "11px",
                    letterSpacing: "0.05em",
                  }}
                >
                  instagram · tap to visit
                </p>
              </div>
            </a>
          </Section>

          <Section title="danger zone" palette={palette}>
            <Msg {...deleteMsg} palette={palette} />

            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              style={{
                width: "100%",
                marginBottom: "10px",
                background: "transparent",
                color: "#e05555",
                border: "2px solid #e05555",
                padding: "10px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "Georgia, serif",
                fontSize: "14px",
              }}
            >
              logout
            </button>

            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: "#e05555",
                  border: "2px solid #e05555",
                  padding: "10px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "Georgia, serif",
                  fontSize: "14px",
                }}
              >
                delete my account
              </button>
            ) : (
              <div
                style={{
                  background: "rgba(220,53,69,0.08)",
                  border: "1px solid #e05555",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#e05555",
                    marginBottom: "10px",
                    lineHeight: 1.5,
                  }}
                >
                  this will permanently delete your account and all confessions.
                  cannot be undone.
                </p>

                <input
                  type="password"
                  placeholder="enter password to confirm"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  style={{ ...inputStyle, borderColor: "#e05555" }}
                />

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirm(false);
                      setDeletePassword("");
                      setDeleteMsg({ text: "", type: "" });
                    }}
                    style={{
                      flex: 1,
                      background: "transparent",
                      color: palette.muted,
                      border: `1px solid ${palette.border}`,
                      padding: "10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    style={{
                      flex: 1,
                      background: "#e05555",
                      color: "white",
                      border: "none",
                      padding: "10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                      fontWeight: 600,
                    }}
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