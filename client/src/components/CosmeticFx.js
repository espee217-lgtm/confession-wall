import React from "react";
import {
  getCosmeticAnimationClass,
  getCosmeticIcon,
} from "../utils/cosmetics";

/** Particle / overlay layers for animated cosmetics (badge, frame, post theme). */
export function CosmeticFxLayers({ cosmeticId }) {
  if (!cosmeticId) return null;

  if (cosmeticId === "badge-petal-storm") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="cw-fx-petal" />
        ))}
      </div>
    );
  }

  if (cosmeticId === "badge-ember-core") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="cw-fx-ember"
            style={{ left: `${18 + i * 11}%`, animationDelay: `${i * 0.35}s` }}
          />
        ))}
      </div>
    );
  }

  if (cosmeticId === "badge-void-sigil") {
    return <div className="cw-cosmetic-fx-layer cw-fx-smoke" aria-hidden="true" />;
  }

  if (cosmeticId === "frame-thornfire") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        <svg className="cw-fx-vine-svg" viewBox="0 0 40 60" aria-hidden="true">
          <path d="M4 55 C4 35, 18 28, 22 12 C24 6, 20 4, 18 8" />
        </svg>
        <span className="cw-fx-ember-glow" />
      </div>
    );
  }

  if (cosmeticId === "frame-celestial") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="cw-fx-orbit-star"
            style={{ animationDelay: `${-i * 1.15}s` }}
          />
        ))}
      </div>
    );
  }

  if (cosmeticId === "post-theme-dewdrop-card") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {[10, 28, 52, 70, 88].map((left, i) => (
          <span
            key={i}
            className="cw-fx-dewdrop"
            style={{ left: `${left}%`, animationDelay: `${i * 0.55}s` }}
          />
        ))}
      </div>
    );
  }

  if (cosmeticId === "post-theme-scorched-parchment") {
    const spots = [8, 22, 38, 55, 72, 88, 45, 63];
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {spots.map((left, i) => (
          <span
            key={i}
            className="cw-fx-ember"
            style={{ left: `${left}%`, animationDelay: `${i * 0.38}s` }}
          />
        ))}
      </div>
    );
  }

  if (cosmeticId === "post-theme-starbound-card") {
    const stars = [
      [5, 12], [18, 28], [32, 15], [48, 42], [62, 18], [75, 35],
      [88, 22], [12, 58], [28, 72], [45, 65], [58, 78], [72, 55],
      [85, 68], [38, 48], [92, 40],
    ];
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {stars.map(([left, top], i) => (
          <span
            key={i}
            className="cw-fx-star"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${(i * 0.27) % 3.2}s`,
              animationDuration: `${2 + (i % 4) * 0.4}s`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

/** Full animated badge (icon + particles + CSS class). */
export function AnimatedBadge({ badgeId, size = "md", className = "" }) {
  if (!badgeId) return null;

  const icon = getCosmeticIcon(badgeId);
  if (!icon) return null;

  const animClass = getCosmeticAnimationClass(badgeId);
  const sizeClass =
    size === "sm" ? "cw-badge-sm" : size === "lg" ? "cw-badge-lg" : "cw-badge-md";

  return (
    <span
      className={[
        "cw-equipped-badge-inline",
        "cw-animated-badge",
        sizeClass,
        animClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="cw-cosmetic-stage">
        <CosmeticFxLayers cosmeticId={badgeId} />
        <span className="cw-cosmetic-icon">{icon}</span>
      </span>
    </span>
  );
}

/** Post theme overlays (particles + pseudo-effects via parent class). */
export function PostThemeFxLayers({ themeId }) {
  if (!themeId) return null;
  return <CosmeticFxLayers cosmeticId={themeId} />;
}
