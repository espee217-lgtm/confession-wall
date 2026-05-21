import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TRENDING_ICON = "\uD83D\uDCC8";
const GROVE_ICON = "\uD83C\uDF3F";
const BUDDING_ICON = "\uD83C\uDF31";
const SCORCHED_ICON = "\uD83D\uDD25";
const SHOP_ICON = "\uD83D\uDED2";
const CONFESS_ICON = "\uD83C\uDF3F";
const ACTIVITY_ICON = "\uD83D\uDD14";
const PROFILE_ICON = "\uD83D\uDC64";

export default function MobileBottomNav({ onConfess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;
  const isTrendingActive = () =>
    location.pathname === "/trending" || location.pathname.startsWith("/moods/");

  const goConfess = () => {
    if (onConfess) {
      onConfess();
      return;
    }

    navigate("/?compose=true");
  };

  if (!user) {
    return (
      <nav className="mobile-home-bottom-nav" aria-label="Mobile public navigation">
        <button
          type="button"
          onClick={() => navigate("/trending")}
          className={isTrendingActive() ? "active" : ""}
        >
          {TRENDING_ICON}
          <span>Trending</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/grove")}
          className={isActive("/grove") ? "active" : ""}
        >
          {GROVE_ICON}
          <span>Grove</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/budding")}
          className={isActive("/budding") ? "active" : ""}
        >
          {BUDDING_ICON}
          <span>Budding</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/scorched")}
          className={isActive("/scorched") ? "active" : ""}
        >
          {SCORCHED_ICON}
          <span>Scorched</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="mobile-home-bottom-nav mobile-home-bottom-nav--auth" aria-label="Mobile bottom navigation">
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
