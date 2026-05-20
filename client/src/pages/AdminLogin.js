import { Navigate } from "react-router-dom";
import { getStoredAdminToken, useAdminAuth } from "../context/AdminAuthContext";
import AuthFlowerPortal from "./AuthFlowerPortal";

export default function AdminLogin() {
  const { adminToken } = useAdminAuth();
  const storedAdminToken = getStoredAdminToken();

  if (adminToken || storedAdminToken) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AuthFlowerPortal initialPanel="admin" />;
}
