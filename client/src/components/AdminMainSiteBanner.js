import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminMainSiteMode } from "../utils/adminMode";

export default function AdminMainSiteBanner() {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const goToDashboard = () => {
    navigate("/admin/dashboard");
  };

  const exitAdminMode = () => {
    clearAdminMainSiteMode();
    navigate("/", { replace: true });
  };

  return (
    <div className="admin-main-site-banner" data-spirit-blocker="true">
      <span className="admin-main-site-banner__text">
        Admin mode: you can moderate posts, comments, and replies.
      </span>
      <div className="admin-main-site-banner__actions">
        <button type="button" className="admin-main-site-btn" onClick={goToDashboard}>
          Return to Admin Dashboard
        </button>
        <button type="button" className="admin-main-site-btn" onClick={exitAdminMode}>
          Exit Admin Mode
        </button>
      </div>
    </div>
  );
}
