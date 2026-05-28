import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DailyQuestDropdown from "./DailyQuestDropdown";
import FramedAvatar from "./FramedAvatar";
import { AnimatedBadge } from "./CosmeticFx";
import { getDisplayCosmetics } from "../utils/engagement";

const GUIDEBOOK_ICON = "\uD83D\uDCDC";
const EVENT_ICON = "\u2726";
const ACTIVITY_ICON = "\uD83D\uDD14";
const LOGIN_ICON = "\uD83C\uDF19";
const CONFESS_LOGO_SRC = "/assets/eye_circle_transparent_48.png";
const MOBILE_BREAKPOINT = 768;
const MOBILE_NAV_HIDE_BOTTOM_THRESHOLD = 120;

function GuestActionPrompt({ onClose, onLogin, onRegister }) {
  return (
    <div
      data-ui="true"
      className="mobile-guest-auth-prompt"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="mobile-guest-auth-card">
        <p>guest grove</p>
        <h2>Join the forest first</h2>
        <span>Log in or create an account to confess, react, and receive activity updates.</span>
        <div>
          <button type="button" onClick={onLogin}>Login</button>
          <button type="button" onClick={onRegister}>Register</button>
          <button type="button" className="is-muted" onClick={onClose}>Maybe Later</button>
        </div>
      </section>
    </div>
  );
}

export default function MobileBottomNav({ onConfess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [hideMobileBottomNav, setHideMobileBottomNav] = useState(false);
  const previousScrollYRef = useRef(0);
  const frameRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const shouldHideOnRoute = location.pathname === "/settings";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateHiddenState = () => {
      frameRef.current = null;

      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (!isMobile || shouldHideOnRoute) {
        previousScrollYRef.current =
          window.scrollY || document.documentElement.scrollTop || 0;
        setHideMobileBottomNav(false);
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const pageHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const distanceFromBottom = pageHeight - (scrollTop + viewportHeight);
      const isScrollingUp = scrollTop < previousScrollYRef.current;

      if (isScrollingUp) {
        setHideMobileBottomNav(false);
      } else {
        setHideMobileBottomNav(
          distanceFromBottom <= MOBILE_NAV_HIDE_BOTTOM_THRESHOLD
        );
      }

      previousScrollYRef.current = scrollTop;
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(updateHiddenState);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [shouldHideOnRoute, location.pathname]);

  if (shouldHideOnRoute) {
    return null;
  }

  const goConfess = () => {
    if (onConfess) {
      onConfess();
      return;
    }

    navigate("/?compose=true");
  };

  const openGuidebook = () => {
    window.dispatchEvent(
      new CustomEvent("cw:open-guidebook", {
        detail: { mode: "manual", source: "mobile-bottom-nav" },
      })
    );
  };

  const openNotifications = () => {
    if (!user) {
      setGuestPromptOpen(true);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("cw:open-notifications", {
        detail: { source: "mobile-bottom-nav" },
      })
    );
  };

  const displayCosmetics = getDisplayCosmetics(user);
  const footerAwareClass = hideMobileBottomNav
    ? " mobile-bottom-nav--hidden-at-footer"
    : "";

  if (!user) {
    return (
      <>
        <nav
          className={`mobile-home-bottom-nav mobile-home-bottom-nav--auth mobile-home-bottom-nav--public${footerAwareClass}`}
          aria-label="Mobile public navigation"
        >
          <button
            type="button"
            onClick={openGuidebook}
            className="mobile-bottom-nav-item mobile-bottom-guidebook-btn"
            title="Open Guidebook"
            aria-label="Open Guidebook"
          >
            {GUIDEBOOK_ICON}
            <span>Guide</span>
          </button>
          <span className="mobile-bottom-nav-divider" aria-hidden="true" />

          <button
            type="button"
            onClick={() => navigate("/weekly-events")}
            className={`mobile-bottom-nav-item ${isActive("/weekly-events") ? "active" : ""}`}
          >
            {EVENT_ICON}
            <span>Event</span>
          </button>
          <span className="mobile-bottom-nav-divider mobile-bottom-nav-divider--near-confess" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setGuestPromptOpen(true)}
            className="mobile-bottom-nav-item mobile-bottom-nav-confess confess"
          >
            <img src={CONFESS_LOGO_SRC} alt="" className="mobile-bottom-confess-logo" aria-hidden="true" />
            <span>Confess</span>
          </button>
          <span className="mobile-bottom-nav-divider mobile-bottom-nav-divider--near-confess" aria-hidden="true" />

          <button
            type="button"
            onClick={openNotifications}
            className="mobile-bottom-nav-item mobile-bottom-notification-btn"
            title="Open activity"
            aria-label="Open activity"
          >
            {ACTIVITY_ICON}
            <span>Activity</span>
          </button>
          <span className="mobile-bottom-nav-divider" aria-hidden="true" />

          <button
            type="button"
            onClick={() => navigate("/login")}
            className={`mobile-bottom-nav-item ${isActive("/login") ? "active" : ""}`}
            title="Login"
            aria-label="Login"
          >
            {LOGIN_ICON}
            <span>Login</span>
          </button>
        </nav>

        {guestPromptOpen && (
          <GuestActionPrompt
            onClose={() => setGuestPromptOpen(false)}
            onLogin={() => {
              setGuestPromptOpen(false);
              navigate("/login");
            }}
            onRegister={() => {
              setGuestPromptOpen(false);
              navigate("/register");
            }}
          />
        )}
      </>
    );
  }

  return (
    <nav className={`mobile-home-bottom-nav mobile-home-bottom-nav--auth${footerAwareClass}`} aria-label="Mobile bottom navigation">
      <button
          type="button"
          onClick={openGuidebook}
          className="mobile-bottom-nav-item mobile-bottom-guidebook-btn"
          title="Open Guidebook"
          aria-label="Open Guidebook"
        >
          {GUIDEBOOK_ICON}
          <span>Guide</span>
        </button>
      <span className="mobile-bottom-nav-divider" aria-hidden="true" />

      <div className="mobile-bottom-nav-item mobile-bottom-quest-slot">
        <DailyQuestDropdown variant="bottom" />
        <span className="mobile-bottom-quest-label">Daily</span>
      </div>
      <span className="mobile-bottom-nav-divider mobile-bottom-nav-divider--near-confess" aria-hidden="true" />

      <button type="button" onClick={goConfess} className="mobile-bottom-nav-item mobile-bottom-nav-confess confess">
        <img src={CONFESS_LOGO_SRC} alt="" className="mobile-bottom-confess-logo" aria-hidden="true" />
        <span>Confess</span>
      </button>
      <span className="mobile-bottom-nav-divider mobile-bottom-nav-divider--near-confess" aria-hidden="true" />

      <button
        type="button"
        onClick={openNotifications}
        className="mobile-bottom-nav-item mobile-bottom-notification-btn"
        title="Open notifications"
        aria-label="Open notifications"
      >
        {ACTIVITY_ICON}
        <span>Activity</span>
      </button>
      <span className="mobile-bottom-nav-divider" aria-hidden="true" />

      <button
        type="button"
        onClick={() => navigate("/settings")}
        className={
          isActive("/settings") || location.pathname.startsWith("/profile/")
            ? "mobile-bottom-nav-item active mobile-bottom-profile-btn"
            : "mobile-bottom-nav-item mobile-bottom-profile-btn"
        }
        title="Open profile"
        aria-label="Open profile"
      >
        <span className="mobile-bottom-profile-avatar-wrap" aria-hidden="true">
          <FramedAvatar
            src={user.profilePicture}
            username={user.username}
            frameId={displayCosmetics?.frame}
            effectId={displayCosmetics?.visualEffect}
            size={30}
            context="nav"
            placeholder={user.username?.[0]?.toUpperCase?.() || "U"}
            animationMode="hover"
          />
          {displayCosmetics?.badge && (
            <AnimatedBadge
              badgeId={displayCosmetics.badge}
              size="sm"
              className="mobile-bottom-profile-badge"
            />
          )}
        </span>
        <span>Profile</span>
      </button>
    </nav>
  );
}
