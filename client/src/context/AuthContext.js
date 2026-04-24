import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("cw_user");
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(() => localStorage.getItem("cw_token") || null);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem("cw_user", JSON.stringify(userData));
    localStorage.setItem("cw_token", tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("cw_user");
    localStorage.removeItem("cw_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

