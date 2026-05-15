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
  { key: "login", path: "/login", title: "Enter", label: "Login", glyph: "✦" },
  { key: "register", path: "/register", title: "Bloom", label: "Register", glyph: "✿" },
  { key: "admin", path: "/admin", title: "Guard", label: "Admin", glyph: "🛡" },
];

function getPasswordError(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character.";
  return "";
}

function DaisyIllustration({ activePanel }) {
  const activeIndex = Math.max(0, PANELS.findIndex((panel) => panel.key === activePanel));

  return (
    <div className="auth-flower-art" aria-hidden="true" data-active={activePanel}>
      <div className="auth-flower-halo" />
      <svg className="auth-flower-svg" viewBox="0 0 820 820" role="img">
        <defs>
          <radialGradient id="petalFill" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#fff8b9" />
            <stop offset="48%" stopColor="#f2db74" />
            <stop offset="100%" stopColor="#6a7f22" />
          </radialGradient>
          <radialGradient id="activePetalFill" cx="45%" cy="36%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#dcffc2" />
            <stop offset="100%" stopColor="#4eb248" />
          </radialGradient>
          <radialGradient id="adminPetalFill" cx="45%" cy="36%" r="75%">
            <stop offset="0%" stopColor="#d9f7ff" />
            <stop offset="48%" stopColor="#5c9fb1" />
            <stop offset="100%" stopColor="#0d3540" />
          </radialGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="auth-flower-petals" style={{ transform: `rotate(${-activeIndex * 34}deg)`, transformOrigin: "410px 410px" }}>
          {Array.from({ length: 11 }).map((_, index) => {
            const isAuthPetal = index === 0 || index === 1 || index === 2;
            const isActive = index === activeIndex;
            const fill = index === 2 ? "url(#adminPetalFill)" : isActive ? "url(#activePetalFill)" : "url(#petalFill)";
            return (
              <ellipse
                key={index}
                className={`auth-flower-petal ${isAuthPetal ? "auth-flower-auth-petal" : ""} ${isActive ? "is-active" : ""}`}
                cx="410"
                cy="168"
                rx={index === 2 ? "88" : "96"}
                ry="176"
                fill={fill}
                opacity={isAuthPetal ? 0.95 : 0.62}
                filter={isActive ? "url(#softGlow)" : "none"}
                transform={`rotate(${index * 34} 410 410)`}
              />
            );
          })}
        </g>

        <circle cx="410" cy="410" r="138" fill="#2b2207" opacity="0.9" />
        <circle cx="410" cy="410" r="112" fill="#d4a62c" opacity="0.96" />
        <circle cx="410" cy="410" r="78" fill="#8c5d12" opacity="0.55" />
        <g opacity="0.7">
          {Array.from({ length: 32 }).map((_, index) => {
            const angle = (Math.PI * 2 * index) / 32;
            const radius = index % 2 ? 58 : 82;
            return (
              <circle
                key={index}
                cx={410 + Math.cos(angle) * radius}
                cy={410 + Math.sin(angle) * radius}
                r={index % 2 ? 5 : 4}
                fill="#3b2809"
              />
            );
          })}
        </g>
      </svg>
      <div className="auth-flower-label">
        <span>{PANELS[activeIndex]?.glyph}</span>
        <strong>{PANELS[activeIndex]?.title}</strong>
        <small>{PANELS[activeIndex]?.label} petal</small>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="auth-brand-mark">
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

function LoginPetal({ scrollToPanel }) {
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
    <section className="auth-scroll-section" data-panel="login">
      <div className="auth-petal-card auth-login-card">
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
          <button type="button" onClick={() => scrollToPanel("register")}>New here? Bloom an account</button>
          <button type="button" onClick={() => scrollToPanel("admin")} className="auth-admin-ghost">Keeper gate</button>
        </div>
      </div>
    </section>
  );
}

function RegisterPetal({ scrollToPanel }) {
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
    <section className="auth-scroll-section" data-panel="register">
      <div className="auth-petal-card auth-register-card">
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
    </section>
  );
}

function AdminPetal({ scrollToPanel }) {
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
    <section className="auth-scroll-section" data-panel="admin">
      <div className="auth-petal-card auth-admin-card">
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
    </section>
  );
}

export default function AuthFlowerPortal({ initialPanel = "login" }) {
  const scrollerRef = useRef(null);
  const sectionRefs = useRef({});
  const [activePanel, setActivePanel] = useState(initialPanel);

  const panelSet = useMemo(() => new Set(PANELS.map((panel) => panel.key)), []);

  const scrollToPanel = (panelKey) => {
    if (!panelSet.has(panelKey)) return;
    setActivePanel(panelKey);
    sectionRefs.current[panelKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollToPanel(initialPanel), 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPanel]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const panel = visible?.target?.dataset?.panel;
        if (panel) setActivePanel(panel);
      },
      { root, threshold: [0.45, 0.65, 0.85] }
    );

    Object.values(sectionRefs.current).forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="auth-flower-page">
      <div className="auth-forest-bg" />
      <div className="auth-mist auth-mist-one" />
      <div className="auth-mist auth-mist-two" />
      <div className="auth-fireflies" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => <span key={index} />)}
      </div>

      <BrandMark />
      <DaisyIllustration activePanel={activePanel} />

      <nav className="auth-petal-nav" aria-label="Authentication petal navigation">
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

      <div className="auth-scroll-hint">Scroll the daisy petals</div>

      <div className="auth-scroll-stage" ref={scrollerRef}>
        <div ref={(node) => { sectionRefs.current.login = node; }}>
          <LoginPetal scrollToPanel={scrollToPanel} />
        </div>
        <div ref={(node) => { sectionRefs.current.register = node; }}>
          <RegisterPetal scrollToPanel={scrollToPanel} />
        </div>
        <div ref={(node) => { sectionRefs.current.admin = node; }}>
          <AdminPetal scrollToPanel={scrollToPanel} />
        </div>
      </div>
    </main>
  );
}
