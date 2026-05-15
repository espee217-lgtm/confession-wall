import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { isSpecialEmail } from "../utils/specialAccess";
import "./AuthFlowerPortal.css";

const AUTH_API_URL = process.env.REACT_APP_API_BASE
  ? `${process.env.REACT_APP_API_BASE}/api/auth`
  : window.location.hostname === "localhost"
  ? "http://localhost:5000/api/auth"
  : "https://confession-wall-hn63.onrender.com/api/auth";

const ADMIN_API_URL = process.env.REACT_APP_API_BASE
  ? `${process.env.REACT_APP_API_BASE}/api/admin`
  : window.location.hostname === "localhost"
  ? "http://localhost:5000/api/admin"
  : "https://confession-wall-hn63.onrender.com/api/admin";

const PANELS = [
  {
    key: "login",
    path: "/login",
    title: "Enter",
    label: "Login",
    kicker: "Petal I · The entrance",
    glyph: "✦",
    angle: 0,
  },
  {
    key: "register",
    path: "/register",
    title: "Bloom",
    label: "Register",
    kicker: "Petal II · The first seed",
    glyph: "✿",
    angle: 120,
  },
  {
    key: "admin",
    path: "/admin",
    title: "Guard",
    label: "Admin",
    kicker: "Petal III · Keeper access",
    glyph: "🛡",
    angle: 240,
  },
];

function getPasswordError(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character.";
  return "";
}

function BrandSeal() {
  return (
    <div className="auth-brand-seal" aria-label="Confession Wall">
      <span>C</span>
      <div>
        <strong>Confession Wall</strong>
        <small>Speak anonymously. Feel lighter.</small>
      </div>
    </div>
  );
}

function ErrorMessage({ children }) {
  if (!children) return null;
  return <div className="auth-error-message">{children}</div>;
}

function LoginForm({ scrollToPanel }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(localStorage.getItem("cw_logout_reason") || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem("cw_logout_reason");
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${AUTH_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      login(data.user, data.token, data.refreshToken, data.tokenExpiresAt);
      navigate(isSpecialEmail(data.user?.email) ? "/choose" : "/");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-shell auth-form-login">
      <div className="auth-petal-kicker">Petal I · The entrance</div>
      <h1>Enter the Wall</h1>
      <p className="auth-petal-subtitle">Return to your hidden grove and continue where your confessions left off.</p>

      <ErrorMessage>{error}</ErrorMessage>

      <form onSubmit={handleSubmit} className="auth-form-stack">
        <label className="auth-field">
          <span>Email address</span>
          <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input type="password" name="password" placeholder="Your secret key" value={form.password} onChange={handleChange} required />
        </label>

        <div className="auth-link-row auth-link-row-right">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button className="auth-primary-btn" type="submit" disabled={loading}>
          {loading ? "Opening gate..." : "Enter the grove →"}
        </button>
      </form>

      <div className="auth-bottom-actions">
        <button type="button" onClick={() => scrollToPanel("register")}>New here? Bloom account</button>
        <button type="button" onClick={() => scrollToPanel("admin")} className="auth-admin-ghost">Keeper gate</button>
      </div>
    </div>
  );
}

function RegisterForm({ scrollToPanel }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const resendInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (resendInterval.current) clearInterval(resendInterval.current);
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    setProfilePicture(file || null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const startResendTimer = () => {
    if (resendInterval.current) clearInterval(resendInterval.current);
    setResendTimer(60);
    resendInterval.current = setInterval(() => {
      setResendTimer((time) => {
        if (time <= 1) {
          clearInterval(resendInterval.current);
          resendInterval.current = null;
          return 0;
        }
        return time - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = getPasswordError(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to send OTP");
        return;
      }
      setStep(2);
      startResendTimer();
    } catch (err) {
      setError("Could not send OTP. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("otp", otp);
      if (profilePicture) formData.append("profilePicture", profilePicture);

      const res = await fetch(`${AUTH_API_URL}/register`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      login(data.user, data.token, data.refreshToken, data.tokenExpiresAt);
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not resend OTP.");
        return;
      }
      setOtp("");
      startResendTimer();
    } catch (err) {
      setError("Could not resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-shell auth-form-register">
      <div className="auth-petal-kicker">Petal II · The first seed</div>
      <h1>{step === 1 ? "Bloom an Account" : "Verify the Bloom"}</h1>
      <p className="auth-petal-subtitle">
        {step === 1
          ? "Create your anonymous identity, earn Seeds, and unlock your first forest cosmetics."
          : "Enter the OTP sent to your email so your account can take root."}
      </p>

      <ErrorMessage>{error}</ErrorMessage>

      {step === 1 && (
        <form onSubmit={handleSendOtp} className="auth-form-stack">
          <div className="auth-avatar-upload">
            <div className="auth-avatar-preview">
              {preview ? <img src={preview} alt="profile preview" /> : <span>🌱</span>}
            </div>
            <label>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleImage} />
            </label>
          </div>

          <label className="auth-field">
            <span>Username</span>
            <input type="text" name="username" placeholder="forestname" value={form.username} onChange={handleChange} required />
          </label>

          <label className="auth-field">
            <span>Email address</span>
            <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input type="password" name="password" placeholder="8+ chars with symbol" value={form.password} onChange={handleChange} required />
          </label>

          <p className="auth-password-note">Use 8+ characters with uppercase, lowercase, number, and special character.</p>

          <button className="auth-primary-btn" type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP →"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyAndRegister} className="auth-form-stack">
          <div className="auth-otp-note">
            <span>Code sent to</span>
            <strong>{form.email}</strong>
          </div>

          <label className="auth-field auth-otp-field">
            <span>6-digit OTP</span>
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </label>

          <button className="auth-primary-btn" type="submit" disabled={loading || otp.length !== 6}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <div className="auth-link-row">
            <button type="button" onClick={() => { setStep(1); setOtp(""); setError(""); }}>← Change details</button>
            <button type="button" onClick={handleResend} disabled={resendTimer > 0}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}

      <div className="auth-bottom-actions">
        <button type="button" onClick={() => scrollToPanel("login")}>Already rooted? Login</button>
        <button type="button" onClick={() => scrollToPanel("admin")} className="auth-admin-ghost">Keeper gate</button>
      </div>
    </div>
  );
}

function AdminForm({ scrollToPanel }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }
      adminLogin(data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-shell auth-form-admin">
      <div className="auth-petal-kicker">Petal III · Keeper access</div>
      <h1>Keeper Gate</h1>
      <p className="auth-petal-subtitle">A guarded portal for moderation, reports, logs, and wall safety.</p>

      <ErrorMessage>{error}</ErrorMessage>

      <form onSubmit={handleSubmit} className="auth-form-stack">
        <label className="auth-field">
          <span>Admin username</span>
          <input type="text" placeholder="keeper name" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input type="password" placeholder="restricted key" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button className="auth-primary-btn auth-admin-btn" type="submit" disabled={loading}>
          {loading ? "Checking gate..." : "Enter admin dashboard"}
        </button>
      </form>

      <div className="auth-bottom-actions">
        <button type="button" onClick={() => scrollToPanel("login")}>Back to user login</button>
        <button type="button" onClick={() => scrollToPanel("register")}>Create user account</button>
      </div>
    </div>
  );
}

function PetalContent({ panelKey, scrollToPanel }) {
  if (panelKey === "login") return <LoginForm scrollToPanel={scrollToPanel} />;
  if (panelKey === "register") return <RegisterForm scrollToPanel={scrollToPanel} />;
  return <AdminForm scrollToPanel={scrollToPanel} />;
}

export default function AuthFlowerPortal({ initialPanel = "login" }) {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(initialPanel);
  const wheelLock = useRef(false);
  const wheelDelta = useRef(0);
  const wheelResetTimer = useRef(null);
  const touchStart = useRef(null);

  const panelSet = useMemo(() => new Set(PANELS.map((panel) => panel.key)), []);
  const activeIndex = Math.max(0, PANELS.findIndex((panel) => panel.key === activePanel));
  const activeMeta = PANELS[activeIndex] || PANELS[0];
  const wheelRotation = -activeMeta.angle;

  const scrollToPanel = (panelKey, shouldNavigate = true) => {
    if (!panelSet.has(panelKey)) return;
    setActivePanel(panelKey);
    const panel = PANELS.find((item) => item.key === panelKey);
    if (shouldNavigate && panel?.path && window.location.pathname !== panel.path) {
      navigate(panel.path, { replace: true });
    }
  };

  const movePanel = (direction) => {
    const nextIndex = (activeIndex + direction + PANELS.length) % PANELS.length;
    scrollToPanel(PANELS[nextIndex].key);
  };

  useEffect(() => {
    scrollToPanel(initialPanel, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPanel]);

  useEffect(() => {
    return () => {
      if (wheelResetTimer.current) window.clearTimeout(wheelResetTimer.current);
    };
  }, []);

  const handleWheel = (event) => {
    event.preventDefault();

    if (wheelLock.current) return;

    wheelDelta.current += event.deltaY;

    if (wheelResetTimer.current) {
      window.clearTimeout(wheelResetTimer.current);
    }

    wheelResetTimer.current = window.setTimeout(() => {
      wheelDelta.current = 0;
    }, 160);

    if (Math.abs(wheelDelta.current) < 86) return;

    const direction = wheelDelta.current > 0 ? 1 : -1;
    wheelDelta.current = 0;
    wheelLock.current = true;
    movePanel(direction);

    window.setTimeout(() => {
      wheelLock.current = false;
    }, 720);
  };

  const handleKeyDown = (event) => {
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      movePanel(1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      movePanel(-1);
    }
  };

  const handleTouchStart = (event) => {
    touchStart.current = event.touches?.[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStart.current == null) return;
    const endY = event.changedTouches?.[0]?.clientY ?? touchStart.current;
    const diff = touchStart.current - endY;
    touchStart.current = null;
    if (Math.abs(diff) > 55) movePanel(diff > 0 ? 1 : -1);
  };

  return (
    <main
      className="auth-flower-page auth-flower-wheel-page"
      data-active={activePanel}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={-1}
    >
      <div className="auth-forest-bg" />
      <div className="auth-mist auth-mist-one" />
      <div className="auth-mist auth-mist-two" />
      <div className="auth-fireflies" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, index) => <span key={index} />)}
      </div>

      <BrandSeal />

      <nav className="auth-petal-nav" aria-label="Authentication petals">
        {PANELS.map((panel) => (
          <button
            key={panel.key}
            type="button"
            className={activePanel === panel.key ? "is-active" : ""}
            onClick={() => scrollToPanel(panel.key)}
          >
            <span>{panel.glyph}</span>
            {panel.label}
          </button>
        ))}
      </nav>

      <section className="auth-daisy-orbit" aria-label="Daisy authentication portal">
        <div className="auth-daisy-glow" />
        <div className="auth-daisy-wheel" style={{ transform: `rotate(${wheelRotation}deg)` }}>
          {Array.from({ length: 18 }).map((_, index) => {
            const angle = index * 20;
            return (
              <div
                key={`decor-${index}`}
                className="auth-decor-petal"
                style={{ transform: `rotate(${angle}deg) translateX(var(--decor-radius))` }}
              />
            );
          })}

          {PANELS.map((panel) => {
            const isActive = activePanel === panel.key;
            return (
              <article
                key={panel.key}
                className={`auth-form-petal auth-form-petal-${panel.key} ${isActive ? "is-active" : ""}`}
                style={{ transform: `rotate(${panel.angle}deg) translateX(var(--form-radius))` }}
                aria-hidden={!isActive}
              >
                <div className="auth-petal-upright" style={{ transform: `rotate(${-panel.angle - wheelRotation}deg)` }}>
                  <div className="auth-inactive-petal-label">
                    <span>{panel.glyph}</span>
                    <strong>{panel.title}</strong>
                    <small>{panel.label}</small>
                  </div>
                  <PetalContent panelKey={panel.key} scrollToPanel={scrollToPanel} />
                </div>
              </article>
            );
          })}

          <div className="auth-daisy-center">
            <div className="auth-daisy-center-inner">
              <span>{activeMeta.glyph}</span>
              <strong>{activeMeta.title}</strong>
              <small>{activeMeta.label} petal</small>
            </div>
          </div>
        </div>
      </section>

      <div className="auth-scroll-hint">
        <span>Scroll</span>
        <strong>rotate the daisy</strong>
      </div>
    </main>
  );
}
