import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AdminAuthContext = createContext();
const ADMIN_TOKEN_KEY = "adminToken";

export const getStoredAdminToken = () => {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const AdminAuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());

  const syncAdminToken = useCallback(() => {
    const storedToken = getStoredAdminToken();
    setAdminToken((currentToken) =>
      currentToken === storedToken ? currentToken : storedToken
    );
    return storedToken;
  }, []);

  const adminLogin = (token) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAdminToken(token);
  };

  const adminLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
  };

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === ADMIN_TOKEN_KEY) {
        syncAdminToken();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncAdminToken);
    window.addEventListener("pageshow", syncAdminToken);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncAdminToken);
      window.removeEventListener("pageshow", syncAdminToken);
    };
  }, [syncAdminToken]);

  return (
    <AdminAuthContext.Provider
      value={{ adminToken, adminLogin, adminLogout, syncAdminToken }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);

