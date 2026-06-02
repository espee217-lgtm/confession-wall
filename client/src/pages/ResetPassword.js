import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AppStyle.css";

const API_URL =
  process.env.REACT_APP_API_BASE
    ? `${process.env.REACT_APP_API_BASE}/api/auth`
    : window.location.hostname === "localhost"
    ? "http://localhost:5000/api/auth"
    : "https://confession-wall-hn63.onrender.com/api/auth";

function getPasswordError(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character.";
  return "";
}

function ResetDaisyBackdrop() {
  return (
    <div className="reset-auth-ambient" aria-hidden="true">
      <span className="reset-auth-firefly reset-auth-firefly--one" />
      <span className="reset-auth-firefly reset-auth-firefly--two" />
      <span className="reset-auth-firefly reset-auth-firefly--three" />
      <span className="reset-auth-firefly reset-auth-firefly--four" />
      <span className="reset-auth-firefly reset-auth-firefly--five" />
    </div>
  );
}

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: location.state?.email || "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.otp.length !== 6) {
      setError("Please enter the 6-digit reset code.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordError = getPasswordError(form.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: form.otp, newPassword: form.newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not reset password.");
        return;
      }

      setMessage(data.message || "Password reset successfully.");
      setTimeout(() => navigate("/login"), 1200);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = Boolean(message) && !error;

  return (
    <main className="reset-auth-page reset-daisy-page" aria-labelledby="reset-password-title">
      <ResetDaisyBackdrop />

      <section className="reset-auth-card reset-auth-card--reset">
        <div className="reset-auth-emblem" aria-hidden="true">
          <span>✿</span>
        </div>

        <div className="reset-auth-copy">
          <p className="reset-auth-eyebrow">{isSuccess ? "Password Updated" : "Check Your Email"}</p>
          <h1 id="reset-password-title">{isSuccess ? "Password Updated" : "Create New Password"}</h1>
          <p className="reset-auth-subtitle">
            {isSuccess
              ? "You can now log in with your new password."
              : "Enter the 6-digit code sent to your email, then choose a stronger password."}
          </p>
        </div>

        {error && <div className="reset-auth-alert reset-auth-alert--error">{error}</div>}
        {message && <div className="reset-auth-alert reset-auth-alert--success">{message}</div>}

        {!isSuccess && (
          <form className="reset-auth-form" onSubmit={handleSubmit}>
            <label className="reset-auth-field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="reset-auth-field reset-auth-code-field">
              <span>6-digit reset code</span>
              <input
                type="text"
                name="otp"
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </label>

            <label className="reset-auth-field">
              <span>New password</span>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="8+ chars with symbol"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="reset-auth-field">
              <span>Confirm new password</span>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new key"
                autoComplete="new-password"
                required
              />
            </label>

            <p className="reset-auth-helper">
              Password: 8+ chars, uppercase, lowercase, number, and special character.
            </p>

            <button className="reset-auth-primary-btn" type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {isSuccess ? (
          <Link className="reset-auth-primary-link" to="/login">Go to Login</Link>
        ) : (
          <p className="reset-auth-footer">
            Need another code? <Link to="/forgot-password">Send again</Link>
          </p>
        )}
      </section>
    </main>
  );
}
