import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function MobileBottomNav({ onConfess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const goConfess = () => {
    if (onConfess) {
      onConfess();
      return;
    }

    navigate("/?compose=true");
  };

  return (
    <nav className="mobile-home-bottom-nav" aria-label="Mobile bottom navigation">
      <button
        type="button"
        onClick={() => navigate("/")}
        className={isActive("/") ? "active" : ""}
      >
        🏠
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/shop")}
        className={isActive("/shop") ? "active" : ""}
      >
        🛍️
        <span>Shop</span>
      </button>

      <button type="button" onClick={goConfess} className="confess">
        🌿
        <span>Confess</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/activity")}
        className={isActive("/activity") ? "active" : ""}
      >
        🔔
        <span>Activity</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/settings")}
        className={
          isActive("/settings") || location.pathname.startsWith("/profile/")
            ? "active"
            : ""
        }
      >
        👤
        <span>Profile</span>
      </button>
    </nav>
  );
}
