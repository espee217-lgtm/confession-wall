import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_ICON = "\uD83C\uDFE0";
const SHOP_ICON = "\uD83D\uDED2";
const CONFESS_ICON = "\uD83C\uDF3F";
const ACTIVITY_ICON = "\uD83D\uDD14";
const PROFILE_ICON = "\uD83D\uDC64";

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
        {HOME_ICON}
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/shop")}
        className={isActive("/shop") ? "active" : ""}
      >
        {SHOP_ICON}
        <span>Shop</span>
      </button>

      <button type="button" onClick={goConfess} className="confess">
        {CONFESS_ICON}
        <span>Confess</span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/activity")}
        className={isActive("/activity") ? "active" : ""}
      >
        {ACTIVITY_ICON}
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
        {PROFILE_ICON}
        <span>Profile</span>
      </button>
    </nav>
  );
}
