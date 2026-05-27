import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const REALM_SLIDER_ROUTES = [
  { key: "home", label: "Home", path: "/" },
  { key: "budding", label: "Budding", path: "/budding" },
  { key: "scorched", label: "Scorched", path: "/scorched" },
  { key: "trending", label: "Trending", path: "/trending" },
];

const isMobileViewport = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(max-width: 700px)").matches;

export default function MobileRealmSwipeNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartRef = useRef(null);
  const ignoreSwipeRef = useRef(false);
  const idleTimerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  const [arrowsVisible, setArrowsVisible] = useState(true);

  const isRealmSwipeBlocked = useCallback((target) => {
    if (typeof document === "undefined") return false;

    if (document.body.classList.contains("realm-swipe-disabled")) {
      return true;
    }

    if (document.querySelector("[data-no-realm-swipe-active='true']")) {
      return true;
    }

    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        [
          "[data-no-realm-swipe]",
          "[data-emoji-picker]",
          "[data-compose-modal]",
          ".mobile-compose-backdrop",
          ".mobile-compose-card",
          ".confession-composer-backdrop",
          ".confession-composer-shell",
          ".composer-emoji-anchor",
          ".composer-emoji-popover",
          ".cw-emoji-search-wrap",
          ".cw-emoji-category-tabs",
          ".composer-emoji-grid",
          "input",
          "textarea",
          "select",
        ].join(",")
      )
    );
  }, []);

  const currentIndex = useMemo(
    () => REALM_SLIDER_ROUTES.findIndex((route) => route.path === location.pathname),
    [location.pathname]
  );

  const isSliderRoute = currentIndex >= 0;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(max-width: 700px)");
    const syncMobile = () => setIsMobile(media.matches);

    syncMobile();
    media.addEventListener?.("change", syncMobile);

    return () => {
      media.removeEventListener?.("change", syncMobile);
    };
  }, []);

  const previousRoute = isSliderRoute
    ? REALM_SLIDER_ROUTES[(currentIndex - 1 + REALM_SLIDER_ROUTES.length) % REALM_SLIDER_ROUTES.length]
    : null;

  const nextRoute = isSliderRoute
    ? REALM_SLIDER_ROUTES[(currentIndex + 1) % REALM_SLIDER_ROUTES.length]
    : null;

  const goPrevious = useCallback(() => {
    if (!previousRoute) return;
    navigate(previousRoute.path);
  }, [navigate, previousRoute]);

  const goNext = useCallback(() => {
    if (!nextRoute) return;
    navigate(nextRoute.path);
  }, [navigate, nextRoute]);

  const showArrowsBriefly = useCallback(() => {
    setArrowsVisible(true);

    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(() => {
      setArrowsVisible(false);
    }, 3000);
  }, []);

  const handlePreviousClick = (event) => {
    event.preventDefault();
    event.currentTarget.blur();
    showArrowsBriefly();
    goPrevious();
  };

  const handleNextClick = (event) => {
    event.preventDefault();
    event.currentTarget.blur();
    showArrowsBriefly();
    goNext();
  };

  useEffect(() => {
    if (!isSliderRoute) return undefined;
    if (!isMobile) return undefined;

    showArrowsBriefly();

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [isMobile, isSliderRoute, location.pathname, showArrowsBriefly]);

  useEffect(() => {
    if (!isSliderRoute) return undefined;
    if (!isMobile) return undefined;

    const handleTouchStart = (event) => {
      if (isRealmSwipeBlocked(event.target)) {
        ignoreSwipeRef.current = true;
        touchStartRef.current = null;
        return;
      }

      ignoreSwipeRef.current = false;
      const touch = event.touches?.[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (event) => {
      if (ignoreSwipeRef.current || isRealmSwipeBlocked(event.target)) {
        ignoreSwipeRef.current = false;
        touchStartRef.current = null;
        return;
      }

      if (!touchStartRef.current) return;

      const touch = event.changedTouches?.[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(deltaX) <= 60) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;

      showArrowsBriefly();

      if (deltaX < 0) {
        goNext();
        return;
      }

      goPrevious();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goNext, goPrevious, isMobile, isRealmSwipeBlocked, isSliderRoute, showArrowsBriefly]);

  if (!isSliderRoute || !isMobile) return null;

  return (
    <div
      className={`mobile-realm-swipe-nav ${arrowsVisible ? "mobile-realm-swipe-nav--visible" : "mobile-realm-swipe-nav--hidden"}`}
      aria-label="Realm swipe navigation"
    >
      <button
        type="button"
        className="mobile-realm-swipe-arrow mobile-realm-swipe-arrow--left"
        aria-label={`Go to ${previousRoute?.label || "previous realm"}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handlePreviousClick}
      >
        <span className="mobile-realm-swipe-arrow-glyph" aria-hidden="true">
          &lt;
        </span>
      </button>
      <button
        type="button"
        className="mobile-realm-swipe-arrow mobile-realm-swipe-arrow--right"
        aria-label={`Go to ${nextRoute?.label || "next realm"}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleNextClick}
      >
        <span className="mobile-realm-swipe-arrow-glyph" aria-hidden="true">
          &gt;
        </span>
      </button>
    </div>
  );
}
