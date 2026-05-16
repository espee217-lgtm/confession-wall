import DisplayTitlePill from "../components/DisplayTitlePill";
import MobileBottomNav from "../components/MobileBottomNav";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FramedAvatar from "../components/FramedAvatar";
import {
  getBadgeLabel,
  getCosmeticMeta,
  getPostThemeStyle,
} from "../utils/cosmetics";

const API_URL = process.env.REACT_APP_API_BASE
  ? `${process.env.REACT_APP_API_BASE}/api/auth`
  : window.location.hostname === "localhost"
  ? "http://localhost:5000/api/auth"
  : "https://confession-wall-hn63.onrender.com/api/auth";

const SHOP_API_URL = process.env.REACT_APP_API_BASE
  ? `${process.env.REACT_APP_API_BASE}/api/shop`
  : window.location.hostname === "localhost"
  ? "http://localhost:5000/api/shop"
  : "https://confession-wall-hn63.onrender.com/api/shop";

function getPasswordError(password) {
  if (!password || password.length < 8)
    return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password))
    return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password))
    return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include at least one special character.";
  return "";
}

function getSystemDark() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function getPalette(theme) {
  const dark = theme === "dark" || (theme === "system" && getSystemDark());

  if (dark) {
    return {
      pageBg:
        "radial-gradient(circle at 20% 10%, rgba(92,255,118,0.13), transparent 30%), radial-gradient(circle at 85% 18%, rgba(180,255,120,0.07), transparent 28%), linear-gradient(180deg, #020703 0%, #061306 50%, #020503 100%)",
      panelBg:
        "linear-gradient(145deg, rgba(9, 30, 13, 0.92), rgba(3, 15, 7, 0.96))",
      inputBg: "rgba(255,255,255,0.055)",
      text: "#d4f0c8",
      muted: "#8aab7a",
      accent: "#7ab868",
      button: "#4a8f35",
      border: "rgba(122,184,104,0.25)",
      shadow: "0 24px 80px rgba(0,0,0,0.48)",
    };
  }

  return {
    pageBg:
      "radial-gradient(circle at 20% 10%, rgba(92,180,80,0.18), transparent 30%), linear-gradient(180deg, #eef9e6 0%, #dcefd2 100%)",
    panelBg:
      "linear-gradient(145deg, rgba(247,255,239,0.95), rgba(232,248,222,0.94))",
    inputBg: "rgba(255,255,255,0.72)",
    text: "#17351c",
    muted: "#5f7f5c",
    accent: "#3f8f35",
    button: "#4a9a38",
    border: "rgba(74,143,53,0.28)",
    shadow: "0 18px 55px rgba(60,120,50,0.18)",
  };
}

function Msg({ text, type, palette }) {
  if (!text) return null;

  return (
    <p
      style={{
        padding: "8px 12px",
        borderRadius: "10px",
        background:
          type === "error"
            ? "rgba(220,53,69,0.15)"
            : "rgba(74,143,53,0.15)",
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
          padding: "11px 0",
          cursor: "pointer",
          fontWeight: 800,
          fontSize: "14px",
          color: palette.text,
          fontFamily: "Georgia, serif",
          letterSpacing: "0.06em",
        }}
      >
        {title}
        <span style={{ fontSize: "11px", opacity: 0.55 }}>
          {open ? "▲" : "▼"}
        </span>
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

function EquippedRow({ label, item, palette }) {
  return (
    <div
      style={{
        padding: "10px",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.045)",
        border: `1px solid ${palette.border}`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>{item?.icon || "✦"}</span>
      <div>
        <div
          style={{
            fontSize: "10px",
            color: palette.muted,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {label}
        </div>
        <strong style={{ color: palette.text, fontSize: "12px" }}>
          {item?.name || "None equipped"}
        </strong>
      </div>
    </div>
  );
}

function normalizeOwnedCosmetics(ownedCosmetics) {
  if (!Array.isArray(ownedCosmetics)) return [];

  return ownedCosmetics.map((owned) => {
    if (typeof owned === "string") {
      return { itemId: owned };
    }

    return owned;
  });
}

function InventoryCard({
  item,
  isEquipped,
  busy,
  palette,
  onEquip,
  onUnequip,
}) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "16px",
        border: `1px solid ${isEquipped ? palette.accent : palette.border}`,
        background: isEquipped
          ? "rgba(100, 190, 80, 0.14)"
          : "rgba(255,255,255,0.04)",
        boxShadow: isEquipped
          ? "0 0 18px rgba(120,255,140,0.12)"
          : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${palette.border}`,
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          {item.icon || "✦"}
        </div>

        <div style={{ minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              color: palette.text,
              fontSize: "13px",
              lineHeight: 1.25,
            }}
          >
            {item.name}
          </strong>

          <p
            style={{
              margin: "3px 0 0",
              color: palette.muted,
              fontSize: "10px",
              lineHeight: 1.35,
            }}
          >
            {item.description}
          </p>
        </div>
      </div>

      {isEquipped ? (
        <button
          type="button"
          onClick={() => onUnequip(item.type)}
          disabled={busy}
          style={{
            width: "100%",
            borderRadius: "999px",
            border: `1px solid ${palette.border}`,
            background: "rgba(255,255,255,0.06)",
            color: palette.muted,
            padding: "7px 10px",
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: "12px",
          }}
        >
          {busy ? "removing..." : "equipped · unequip"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onEquip(item)}
          disabled={busy}
          style={{
            width: "100%",
            borderRadius: "999px",
            border: `1px solid ${palette.border}`,
            background: "rgba(90,190,80,0.18)",
            color: palette.text,
            padding: "7px 10px",
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: "12px",
          }}
        >
          {busy ? "equipping..." : "equip"}
        </button>
      )}
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
    borderRadius: "12px",
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
    borderRadius: "12px",
    border: "none",
    background: palette.button,
    color: "white",
    fontSize: "14px",
    fontFamily: "Georgia, serif",
    cursor: "pointer",
    fontWeight: 700,
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

  const [shopItems, setShopItems] = useState([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [cosmeticBusy, setCosmeticBusy] = useState("");
  const [cosmeticMsg, setCosmeticMsg] = useState({ text: "", type: "" });

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
    setUsername(user?.username || "");
    setPreview(user?.profilePicture || null);
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
    if (!user || !token) return;

    const loadShopItems = async () => {
      try {
        setShopLoading(true);

        const res = await fetch(SHOP_API_URL);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load cosmetics.");
        }

        setShopItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        console.error("Settings inventory load error:", err);
      } finally {
        setShopLoading(false);
      }
    };

    loadShopItems();
  }, [user, token]);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      root.classList.toggle("dark", getSystemDark());
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  if (!user) return null;

  const equipped = user?.equippedCosmetics || {};
  const badge = getBadgeLabel(equipped.badge);

  const badgeItem = getCosmeticMeta(equipped.badge);
  const frameItem = getCosmeticMeta(equipped.frame);
  const titleItem = getCosmeticMeta(equipped.title);
  const postThemeItem = getCosmeticMeta(equipped.postTheme);
  const previewThemeStyle = getPostThemeStyle(equipped.postTheme, "budding");

  const ownedCosmeticIds = new Set(
    normalizeOwnedCosmetics(user?.ownedCosmetics).map((owned) => owned.itemId)
  );

  const ownedInventoryItems = shopItems.filter((item) =>
    ownedCosmeticIds.has(item.id)
  );

  const ownedInventoryByType = {
    badge: ownedInventoryItems.filter((item) => item.type === "badge"),
    frame: ownedInventoryItems.filter((item) => item.type === "frame"),
    title: ownedInventoryItems.filter((item) => item.type === "title"),
    postTheme: ownedInventoryItems.filter((item) => item.type === "postTheme"),
  };

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

    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const syncUser = (updatedUser) => {
    if (!updatedUser) return;

    localStorage.setItem("cw_user", JSON.stringify(updatedUser));

    login(
      updatedUser,
      token,
      localStorage.getItem("cw_refresh_token"),
      localStorage.getItem("cw_token_expires_at")
    );
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: "", type: "" });
    setProfileLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);

      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

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

      const updatedUser = {
        ...user,
        username: data.username,
        profilePicture: data.profilePicture,
      };

      syncUser(updatedUser);

      setProfileMsg({ text: "Profile updated!", type: "success" });
    } catch {
      setProfileMsg({ text: "Something went wrong.", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSeedVisibilityToggle = async () => {
    try {
      const nextValue = !user?.showSeedsOnProfile;

      const res = await fetch(`${API_URL}/show-seeds`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ showSeedsOnProfile: nextValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(
          data.message || "Could not update seed visibility.",
          "error"
        ) || alert(data.message || "Could not update seed visibility.");
        return;
      }

      syncUser(data.user);

      window.cwToast?.(
        data.message || "Seed visibility updated.",
        "success"
      ) || alert(data.message || "Seed visibility updated.");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Something went wrong.", "error") ||
        alert("Something went wrong.");
    }
  };

  const handleSettingsEquip = async (item) => {
    if (!token || cosmeticBusy) return;

    setCosmeticMsg({ text: "", type: "" });
    setCosmeticBusy(item.id);

    try {
      const res = await fetch(`${SHOP_API_URL}/equip/${item.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setCosmeticMsg({
          text: data.message || "Could not equip cosmetic.",
          type: "error",
        });
        return;
      }

      syncUser(data.user);

      setCosmeticMsg({
        text: data.message || `${item.name} equipped.`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setCosmeticMsg({
        text: "Something went wrong while equipping.",
        type: "error",
      });
    } finally {
      setCosmeticBusy("");
    }
  };

  const handleSettingsUnequip = async (type) => {
    if (!token || cosmeticBusy) return;

    setCosmeticMsg({ text: "", type: "" });
    setCosmeticBusy(type);

    try {
      const res = await fetch(`${SHOP_API_URL}/unequip/${type}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setCosmeticMsg({
          text: data.message || "Could not unequip cosmetic.",
          type: "error",
        });
        return;
      }

      syncUser(data.user);

      setCosmeticMsg({
        text: data.message || "Cosmetic unequipped.",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setCosmeticMsg({
        text: "Something went wrong while unequipping.",
        type: "error",
      });
    } finally {
      setCosmeticBusy("");
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

      syncUser(updatedUser);

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

    const passwordError = getPasswordError(newPassword);

    if (passwordError) {
      setPasswordMsg({ text: passwordError, type: "error" });
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
        setDeleteMsg({
          text: data.message || "Deletion failed",
          type: "error",
        });
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
      className="cw-settings-page"
      style={{
        minHeight: "100vh",
        background: palette.pageBg,
        padding: "36px 16px 70px",
        fontFamily: "Georgia, serif",
        transition: "background 0.3s ease",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: "-120px",
          left: "10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(120,255,150,0.1)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "520px", margin: "0 auto", position: "relative" }}>
        <div
          style={{
            background: palette.panelBg,
            border: `1px solid ${palette.border}`,
            borderRadius: "28px",
            padding: "30px 24px",
            backdropFilter: "blur(18px)",
            boxShadow: palette.shadow,
            transition: "all 0.3s ease",
          }}
        >
          <h2
            style={{
              margin: "0 0 4px",
              textAlign: "center",
              color: palette.text,
              fontSize: "22px",
              letterSpacing: "0.12em",
            }}
          >
            settings
          </h2>

          <p
            style={{
              textAlign: "center",
              margin: "0 0 24px",
              color: palette.muted,
              fontSize: "12px",
              letterSpacing: "0.08em",
            }}
          >
            tune your forest presence
          </p>

          <Section title="theme" defaultOpen={true} palette={palette}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {["light", "system", "dark"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTheme(t)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: "10px",
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
                    fontWeight: 700,
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
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(140,255,150,0.12), transparent 45%), rgba(255,255,255,0.035)",
                  border: `1px solid ${palette.border}`,
                  borderRadius: "22px",
                  padding: "20px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <FramedAvatar
                  src={preview || user?.profilePicture}
                  username={username || user?.username}
                  frameId={equipped.frame}
                  size={92}
                  placeholder={(username || user?.username || "U")
                    ?.charAt(0)
                    ?.toUpperCase()}
                />

                <h3
                  style={{
                    margin: "12px 0 2px",
                    color: palette.text,
                    fontSize: "1.2rem",
                  }}
                >
                  {username || user?.username}{" "}
                  {badge && <span>{badge.icon}</span>}
                </h3>

                <div
                  style={{
                    margin: "6px 0 12px",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <DisplayTitlePill titleId={equipped.title} size="big" />
                </div>

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

              <button
                type="button"
                onClick={() => navigate(`/user/${user._id}`)}
                style={{
                  ...btnGreen,
                  marginTop: "8px",
                  background: "rgba(120, 180, 90, 0.18)",
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                }}
              >
                view public profile
              </button>
            </form>
          </Section>

          <Section title="equipped cosmetics" defaultOpen={true} palette={palette}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <EquippedRow label="Badge" item={badgeItem} palette={palette} />
              <EquippedRow label="Frame" item={frameItem} palette={palette} />
              <EquippedRow label="Title" item={titleItem} palette={palette} />
              <EquippedRow
                label="Post Theme"
                item={postThemeItem}
                palette={palette}
              />
            </div>

            <div
              style={{
                ...previewCardStyle,
                ...previewThemeStyle,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <FramedAvatar
                  src={preview || user?.profilePicture}
                  username={username || user?.username}
                  frameId={equipped.frame}
                  size={38}
                  placeholder={(username || user?.username || "U")
                    ?.charAt(0)
                    ?.toUpperCase()}
                />

                <div>
                  <strong style={{ color: "#dfffe5", fontSize: "12px" }}>
                    @{username || user?.username} {badge?.icon || ""}
                  </strong>

                  <div style={{ marginTop: "4px" }}>
                    <DisplayTitlePill titleId={equipped.title} />
                  </div>
                </div>
              </div>

              <p style={{ margin: "14px 0 0", color: "rgba(240,255,235,0.9)" }}>
                this is how your confession card aura feels.
              </p>
            </div>

            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                borderRadius: "14px",
                border: `1px solid ${palette.border}`,
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ color: palette.text, fontSize: "13px" }}>
                  Show Seeds on profile
                </strong>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: palette.muted,
                    fontSize: "11px",
                    lineHeight: 1.4,
                  }}
                >
                  Let other users see your seed balance on your public profile.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSeedVisibilityToggle}
                style={{
                  borderRadius: "999px",
                  padding: "7px 12px",
                  border: `1px solid ${palette.border}`,
                  background: user?.showSeedsOnProfile
                    ? "rgba(90,190,80,0.28)"
                    : "rgba(255,255,255,0.06)",
                  color: user?.showSeedsOnProfile ? "#baffaa" : palette.muted,
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {user?.showSeedsOnProfile ? "ON" : "OFF"}
              </button>
            </div>
          </Section>

          <Section title="cosmetic inventory" palette={palette}>
            <Msg {...cosmeticMsg} palette={palette} />

            {shopLoading ? (
              <p
                style={{
                  color: palette.muted,
                  fontSize: "12px",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                loading your forest inventory...
              </p>
            ) : ownedInventoryItems.length === 0 ? (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "14px",
                  border: `1px solid ${palette.border}`,
                  background: "rgba(255,255,255,0.04)",
                  color: palette.muted,
                  fontSize: "12px",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                You do not own any cosmetics yet. Visit the Forest Shop to unlock
                badges, frames, titles, and post themes.
              </div>
            ) : (
              <>
                {[
                  ["badge", "Profile Badges"],
                  ["frame", "Profile Frames"],
                  ["title", "Display Titles"],
                  ["postTheme", "Post Themes"],
                ].map(([type, label]) => {
                  const list = ownedInventoryByType[type];

                  if (!list || list.length === 0) return null;

                  return (
                    <div key={type} style={{ marginBottom: "16px" }}>
                      <h4
                        style={{
                          margin: "0 0 8px",
                          color: palette.text,
                          fontSize: "12px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </h4>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {list.map((item) => {
                          const isEquipped = equipped[item.type] === item.id;
                          const busy =
                            cosmeticBusy === item.id ||
                            cosmeticBusy === item.type;

                          return (
                            <InventoryCard
                              key={item.id}
                              item={item}
                              isEquipped={isEquipped}
                              busy={busy}
                              palette={palette}
                              onEquip={handleSettingsEquip}
                              onUnequip={handleSettingsUnequip}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
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
                placeholder="new password"
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

              <button
                type="submit"
                style={btnGreen}
                disabled={passwordLoading}
              >
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
                borderRadius: "14px",
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
                    fontWeight: 700,
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
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 700,
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
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 700,
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
                  borderRadius: "14px",
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
                      borderRadius: "10px",
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
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontFamily: "Georgia, serif",
                      fontWeight: 700,
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
      <MobileBottomNav />
    </div>
  );
}

const previewCardStyle = {
  borderRadius: "16px",
  padding: "14px",
  background:
    "linear-gradient(135deg, rgba(6, 28, 13, 0.82), rgba(3, 15, 7, 0.9))",
  border: "1px solid rgba(110, 190, 125, 0.16)",
  boxShadow: "0 12px 35px rgba(0,0,0,0.24)",
};
