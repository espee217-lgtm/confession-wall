import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function MobileBottomNav({ onConfess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="mobile-home-bottom-nav" aria-label="Mobile navigation">
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

      <button
        type="button"
        onClick={() => {
          if (onConfess) onConfess();
          else navigate("/");
        }}
        className="confess"
      >
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
        className={isActive("/settings") ? "active" : ""}
      >
        👤
        <span>Profile</span>
      </button>
    </nav>
  );
}