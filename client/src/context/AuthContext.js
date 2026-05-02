import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext();

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function decodeJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeJsonParse(localStorage.getItem("cw_user"), null));
  const [token, setToken] = useState(() => localStorage.getItem("cw_token") || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("cw_refresh_token") || null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState(() => {
    const saved = Number(localStorage.getItem("cw_token_expires_at"));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  const logout = useCallback((reason = "") => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setTokenExpiresAt(null);
    localStorage.removeItem("cw_user");
    localStorage.removeItem("cw_token");
    localStorage.removeItem("cw_refresh_token");
    localStorage.removeItem("cw_token_expires_at");

    if (reason) {
      localStorage.setItem("cw_logout_reason", reason);
    }
  }, []);

  const login = useCallback((userData, tokenData, refreshTokenData = null, tokenExpiresAtData = null) => {
    const finalExpiresAt = tokenExpiresAtData || decodeJwtExpiry(tokenData);

    setUser(userData);
    setToken(tokenData);
    setRefreshToken(refreshTokenData);
    setTokenExpiresAt(finalExpiresAt);

    localStorage.setItem("cw_user", JSON.stringify(userData));
    localStorage.setItem("cw_token", tokenData);

    if (refreshTokenData) {
      localStorage.setItem("cw_refresh_token", refreshTokenData);
    } else {
      localStorage.removeItem("cw_refresh_token");
    }

    if (finalExpiresAt) {
      localStorage.setItem("cw_token_expires_at", String(finalExpiresAt));
    } else {
      localStorage.removeItem("cw_token_expires_at");
    }

    localStorage.removeItem("cw_logout_reason");
  }, []);

  const refreshSession = useCallback(async () => {
    if (!refreshToken) {
      logout("Your session expired. Please log in again.");
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        logout(data.message || "Your session expired. Please log in again.");
        return false;
      }

      login(data.user, data.token, data.refreshToken, data.tokenExpiresAt);
      return true;
    } catch (err) {
      logout("Your session expired. Please log in again.");
      return false;
    }
  }, [refreshToken, login, logout]);

  useEffect(() => {
    if (!token || !user) return undefined;

    const expiry = tokenExpiresAt || decodeJwtExpiry(token);

    if (!expiry) return undefined;

    const msUntilRefresh = expiry - Date.now() - 60 * 1000;

    if (msUntilRefresh <= 0) {
      refreshSession();
      return undefined;
    }

    const timer = setTimeout(() => {
      refreshSession();
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [token, tokenExpiresAt, user, refreshSession]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "cw_token" && !event.newValue) {
        logout();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      tokenExpiresAt,
      login,
      logout,
      refreshSession,
    }),
    [user, token, refreshToken, tokenExpiresAt, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}