import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AppStyle.css";

const API_URL =
  process.env.REACT_APP_API_BASE
    ? `${process.env.REACT_APP_API_BASE}/api/auth`
    : window.location.hostname === "localhost"
    ? "http://localhost:5000/api/auth"
    : "https://confession-wall-hn63.onrender.com/api/auth";

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not send reset code.");
        return;
      }

      setMessage(data.message || "Reset code sent.");
      setTimeout(() => navigate("/reset-password", { state: { email } }), 800);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-auth-page reset-daisy-page" aria-labelledby="forgot-password-title">
      <ResetDaisyBackdrop />

      <section className="reset-auth-card reset-auth-card--forgot">
        <div className="reset-auth-emblem" aria-hidden="true">
          <span>✿</span>
        </div>

        <div className="reset-auth-copy">
          <p className="reset-auth-eyebrow">Account Recovery</p>
          <h1 id="forgot-password-title">Reset Password</h1>
          <p className="reset-auth-subtitle">
            Enter your account email. We&apos;ll send a 6-digit reset code.
          </p>
        </div>

        {error && <div className="reset-auth-alert reset-auth-alert--error">{error}</div>}
        {message && <div className="reset-auth-alert reset-auth-alert--success">{message}</div>}

        <form className="reset-auth-form" onSubmit={handleSubmit}>
          <label className="reset-auth-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <button className="reset-auth-primary-btn" type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Send Reset Code"}
          </button>
        </form>

        <p className="reset-auth-footer">
          Remembered it? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
