import React from "react";
import racerVisorFrameSprite from "../assets/cosmetics/racer-visor-frame-sprite.png";
import lightningVioletFrameSprite from "../assets/cosmetics/lightning-violet-avatar-frame-sfx.png";
import venomFrameSprite from "../assets/avatarFrames/venom-screen-record-spritesheet.png";
import stormHoodieFrameSprite from "../assets/avatarFrames/storm-hoodie-greenkey-spritesheet.png";
import {
  getCosmeticAnimationClass,
  getCosmeticIcon,
} from "../utils/cosmetics";

const BASIC_BADGE_CLASSES = {
  "badge-sprout-soul": "cw-cosmetic-badge-sprout-soul",
  "badge-moon-whisper": "cw-cosmetic-badge-moon-whisper",
  "badge-forest-crown": "cw-cosmetic-badge-forest-crown",
};

function getBadgeAnimationClass(badgeId) {
  return getCosmeticAnimationClass(badgeId) || BASIC_BADGE_CLASSES[badgeId] || "";
}

export function BadgeFace({ badgeId, icon }) {
  if (badgeId === "badge-sprout-soul") {
    return (
      <span className="cw-badge-face cw-badge-face--sprout" aria-hidden="true">
        <span className="cw-badge-sprout-glow" />
        <span className="cw-badge-sprout-soil" />
        <span className="cw-badge-sprout-stem" />
        <span className="cw-badge-sprout-leaf leaf-left" />
        <span className="cw-badge-sprout-leaf leaf-right" />
        <span className="cw-badge-sprout-dew dew-a" />
        <span className="cw-badge-sprout-dew dew-b" />
      </span>
    );
  }

  if (badgeId === "badge-moon-whisper") {
    return (
      <span className="cw-badge-face cw-badge-face--moon" aria-hidden="true">
        <span className="cw-badge-moon-halo" />
        <span className="cw-badge-moon-disc" />
        <span className="cw-badge-moon-cutout" />
        <span className="cw-badge-moon-star star-a" />
        <span className="cw-badge-moon-star star-b" />
        <span className="cw-badge-moon-star star-c" />
        <span className="cw-badge-moon-mist" />
      </span>
    );
  }

  if (badgeId === "badge-forest-crown") {
    return (
      <span className="cw-badge-face cw-badge-face--crown" aria-hidden="true">
        <span className="cw-badge-crown-shine" />
        <svg className="cw-badge-crown-svg" viewBox="0 0 100 100" aria-hidden="true">
          <path
            className="cw-badge-crown-shape"
            d="M18 68 L24 40 L40 55 L50 28 L60 55 L76 40 L82 68 Z"
          />
          <path
            className="cw-badge-crown-band"
            d="M24 68 H76 C75 76, 69 82, 60 82 H40 C31 82, 25 76, 24 68 Z"
          />
          <path
            className="cw-badge-crown-vein vein-left"
            d="M36 64 L40 52"
          />
          <path
            className="cw-badge-crown-vein vein-center"
            d="M50 62 L50 42"
          />
          <path
            className="cw-badge-crown-vein vein-right"
            d="M64 64 L60 52"
          />
        </svg>
        <span className="cw-badge-crown-jewel" />
        <span className="cw-badge-crown-spark spark-a" />
        <span className="cw-badge-crown-spark spark-b" />
      </span>
    );
  }

  return icon;
}

/** Particle / overlay layers for animated cosmetics (badge, frame, post theme, profile effect). */
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

  if (cosmeticId === "frame-storm-eye-rogue") {
    return (
      <div
        className="cw-cosmetic-fx-layer cw-venom-frame-sprite-shell"
        aria-hidden="true"
        style={{ "--cw-venom-sprite-image": `url(${venomFrameSprite})` }}
      >
        <span className="cw-venom-frame-fallback-glow" />
        <span className="cw-venom-frame-sprite" />
      </div>
    );
  }

  if (cosmeticId === "frame-storm-hoodie") {
    return (
      <div
        className="cw-cosmetic-fx-layer cw-storm-hoodie-frame-sprite-shell"
        aria-hidden="true"
        style={{ "--cw-storm-hoodie-sprite-image": `url(${stormHoodieFrameSprite})` }}
      >
        <span className="cw-storm-hoodie-frame-sprite" />
      </div>
    );
  }

  if (
    cosmeticId === "frame-victory-visor" ||
    cosmeticId === "frame-visor-lift-racer"
  ) {
    return (
      <div
        className="cw-cosmetic-fx-layer cw-visor-lift-sprite-shell"
        aria-hidden="true"
        style={{ "--cw-visor-sprite-image": `url(${racerVisorFrameSprite})` }}
      >
        <span className="cw-visor-lift-sprite" />
      </div>
    );
  }

  if (cosmeticId === "frame-ashen-horns") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        <span className="cw-fx-ashen-horn horn-left" />
        <span className="cw-fx-ashen-horn horn-right" />
        <span className="cw-fx-ashen-ember-ring" />
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

  if (cosmeticId === "post-theme-moonlit-vengeance") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        <span className="cw-fx-crescent-moon" />
        <span className="cw-fx-moon-fog fog-a" />
        <span className="cw-fx-moon-fog fog-b" />
      </div>
    );
  }

  if (cosmeticId === "post-theme-spinning-apex-wheel") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        <span className="cw-fx-apex-carbon-sheen" />
        <span className="cw-fx-apex-drift-cloud cloud-a" />
        <span className="cw-fx-apex-drift-cloud cloud-b" />
        <span className="cw-fx-apex-drift-cloud cloud-c" />
        <span className="cw-fx-apex-motion-streak streak-a" />
        <span className="cw-fx-apex-motion-streak streak-b" />
        <span className="cw-fx-apex-motion-streak streak-c" />
        <span className="cw-fx-apex-formula-glow" />
        <span className="cw-fx-apex-wheel-glow" />
        <svg className="cw-fx-apex-formula" viewBox="0 0 340 160" aria-hidden="true">
          <path className="cw-fx-apex-formula-wing rear-wing" d="M22 72 H50 V112 H22 Z" />
          <path className="cw-fx-apex-formula-wing rear-top" d="M16 60 H54 V68 H16 Z" />
          <path
            className="cw-fx-apex-formula-body"
            d="M46 100 H104 L126 82 L152 74 L194 66 L234 52 H274 L292 58 L304 70 L312 82 L290 82 L280 70 H248 L214 78 L180 92 L154 108 H86 L72 120 H46 Z"
          />
          <path
            className="cw-fx-apex-formula-cockpit"
            d="M170 72 C178 58, 196 50, 218 50 C228 50, 237 52, 244 57 L228 68 L190 72 Z"
          />
          <path
            className="cw-fx-apex-formula-nose"
            d="M232 58 H284 L306 72 L292 82 H240 L222 74 Z"
          />
          <path className="cw-fx-apex-formula-wing front-wing" d="M286 86 H336 V94 H286 Z" />
          <path className="cw-fx-apex-formula-wing front-blade" d="M296 76 H336 V82 H296 Z" />
          <path className="cw-fx-apex-formula-accent" d="M112 96 C144 90, 182 84, 248 80" />
          <g className="cw-fx-apex-wheel-group formula-rear-wheel">
            <circle className="cw-fx-apex-wheel-tire" cx="90" cy="108" r="28" />
            <g className="cw-fx-apex-wheel-spinner">
              <circle className="cw-fx-apex-wheel-rim" cx="90" cy="108" r="18" />
              <circle className="cw-fx-apex-wheel-hub" cx="90" cy="108" r="4" />
              <path
                className="cw-fx-apex-wheel-spokes"
                d="M90 90 L90 126 M72 108 L108 108 M77 95 L103 121 M103 95 L77 121"
              />
            </g>
          </g>
          <g className="cw-fx-apex-wheel-group formula-front-wheel">
            <circle className="cw-fx-apex-wheel-tire" cx="252" cy="108" r="28" />
            <g className="cw-fx-apex-wheel-spinner">
              <circle className="cw-fx-apex-wheel-rim" cx="252" cy="108" r="18" />
              <circle className="cw-fx-apex-wheel-hub" cx="252" cy="108" r="4" />
              <path
                className="cw-fx-apex-wheel-spokes"
                d="M252 90 L252 126 M234 108 L270 108 M239 95 L265 121 M265 95 L239 121"
              />
            </g>
          </g>
        </svg>
        <svg className="cw-fx-apex-hypercar" viewBox="0 0 330 170" aria-hidden="true">
          <path
            className="cw-fx-apex-car-body"
            d="M18 106 C38 102, 58 88, 82 71 C106 54, 136 44, 188 42 C221 41, 250 49, 278 67 L304 73 C315 76, 322 84, 325 94 L329 106 L304 106 C300 89, 285 77, 266 77 C247 77, 232 89, 228 106 L119 106 C115 89, 100 77, 81 77 C62 77, 46 89, 43 106 Z"
          />
          <path
            className="cw-fx-apex-car-lower"
            d="M56 105 H231 C235 88 249 79 266 79 C283 79 297 88 302 105 H314 C313 96 309 88 302 83 L279 79 L257 71 H140 C122 71 103 78 88 89 L72 100 Z"
          />
          <path
            className="cw-fx-apex-car-window"
            d="M131 68 C151 50, 176 44, 205 43 C226 43, 245 48, 262 58 L271 69 Z"
          />
          <path
            className="cw-fx-apex-car-window"
            d="M108 73 C120 61, 136 54, 154 50 L144 73 Z"
          />
          <path
            className="cw-fx-apex-car-accent"
            d="M107 92 C146 84, 203 79, 266 81"
          />
          <path
            className="cw-fx-apex-car-accent car-secondary"
            d="M139 70 C172 67, 214 67, 257 73"
          />
          <path className="cw-fx-apex-tail" d="M307 78 C314 80, 319 85, 321 92 L307 92 Z" />
          <g className="cw-fx-apex-wheel-group rear-wheel">
            <circle className="cw-fx-apex-wheel-tire" cx="82" cy="106" r="28" />
            <g className="cw-fx-apex-wheel-spinner">
              <circle className="cw-fx-apex-wheel-rim" cx="82" cy="106" r="18" />
              <circle className="cw-fx-apex-wheel-hub" cx="82" cy="106" r="4" />
              <path
                className="cw-fx-apex-wheel-spokes"
                d="M82 88 L82 124 M64 106 L100 106 M69 93 L95 119 M95 93 L69 119"
              />
            </g>
          </g>
          <g className="cw-fx-apex-wheel-group front-wheel">
            <circle className="cw-fx-apex-wheel-tire" cx="266" cy="106" r="28" />
            <g className="cw-fx-apex-wheel-spinner">
              <circle className="cw-fx-apex-wheel-rim" cx="266" cy="106" r="18" />
              <circle className="cw-fx-apex-wheel-hub" cx="266" cy="106" r="4" />
              <path
                className="cw-fx-apex-wheel-spokes"
                d="M266 88 L266 124 M248 106 L284 106 M253 93 L279 119 M279 93 L253 119"
              />
            </g>
          </g>
        </svg>
        <span className="cw-fx-apex-racing-stripe" />
      </div>
    );
  }

  if (cosmeticId === "post-theme-cinder-throne") {
    return (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        <span className="cw-fx-cinder-smoke smoke-a" />
        <span className="cw-fx-cinder-smoke smoke-b" />
        <span className="cw-fx-cinder-glow" />
      </div>
    );
  }

  if (cosmeticId === "visual-effect-cursed-violet-aura") {
    return (
      <div
        className="cw-cosmetic-fx-layer cw-lightning-violet-sprite-shell"
        aria-hidden="true"
        style={{
          "--cw-lightning-violet-sprite-image": `url(${lightningVioletFrameSprite})`,
        }}
      >
        <span className="cw-lightning-violet-fallback-ring" />
        <span className="cw-lightning-violet-sprite" />
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

  const animClass = getBadgeAnimationClass(badgeId);
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
        <span className="cw-cosmetic-icon">
          <BadgeFace badgeId={badgeId} icon={icon} />
        </span>
      </span>
    </span>
  );
}

/** Post theme overlays (particles + pseudo-effects via parent class). */
export function PostThemeFxLayers({ themeId }) {
  if (!themeId) return null;
  return <CosmeticFxLayers cosmeticId={themeId} />;
}
