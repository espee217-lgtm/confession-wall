import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SplitBouquetHero.css";

const ASSET_BASE = "/assets/split-bouquet/";
// Set this back to true later if you want the bouquet debugger visible again.
const BOUQUET_DEBUG = false;
const DEBUG_AXIS_VALUES = Array.from({ length: 11 }, (_, index) => index * 10);
const BOUQUET_LAYOUT_STORAGE_KEY = "confessionWallBouquetLayout";

// Permanent default bouquet layout.
// If you want to fine-tune again later, set BOUQUET_DEBUG = true and use the
// same localStorage-backed debugger workflow to export a new final JSON.
const DEFAULT_BOUQUET_LAYOUT = {
  container: {
    left: "50%",
    bottom: "-6%",
    width: "clamp(390px, 36vw, 650px)",
    height: "clamp(580px, 55vw, 880px)",
  },
  shadow: {
    left: "50%",
    bottom: "1%",
    width: "48%",
    height: "13%",
    zIndex: 1
  },
  stems: {
    left: "47%",
    bottom: "14%",
    width: "59%",
    height: "72%",
    zIndex: 3
  },
  hand: {
    left: "45%",
    bottom: "-1%",
    width: "25%",
    zIndex: 6
  },
  healthyBackLeft: {
    left: "30%",
    top: "36%",
    width: "14%",
    zIndex: 5
  },
  healthyMidLeft: {
    left: "14%",
    top: "37%",
    width: "21%",
    zIndex: 7
  },
  healthyFrontLeft: {
    left: "11%",
    top: "48%",
    width: "18%",
    zIndex: 8
  },
  scorchedBackRight: {
    right: "27%",
    top: "42%",
    width: "14%",
    zIndex: 5
  },
  scorchedMidRight: {
    right: "32%",
    top: "34%",
    width: "17%",
    zIndex: 7
  },
  scorchedFrontRight: {
    right: "18%",
    top: "51%",
    width: "22%",
    zIndex: 8
  }
};

const GROVE_FLOWERS = [
  {
    key: "grove-01",
    layoutKey: "healthyFrontLeft",
    debugLabel: "healthy-front-left",
    realm: "Grove",
    asset: "healthy-front-left-cropped.webp",
    className: "split-flower-button split-flower-button--grove split-flower-button--grove-01",
    previewLeft: "10%",
    rot: "-8deg",
  },
  {
    key: "grove-02",
    layoutKey: "healthyMidLeft",
    debugLabel: "healthy-mid-left",
    realm: "Grove",
    asset: "healthy-mid-left-cropped.webp",
    className: "split-flower-button split-flower-button--grove split-flower-button--grove-02",
    previewLeft: "16%",
    rot: "-3deg",
  },
  {
    key: "grove-03",
    layoutKey: "healthyBackLeft",
    debugLabel: "healthy-back-left",
    realm: "Grove",
    asset: "healthy-back-left-cropped.webp",
    className: "split-flower-button split-flower-button--grove split-flower-button--grove-03",
    previewLeft: "6%",
    rot: "-11deg",
  },
];

const SCORCHED_FLOWERS = [
  {
    key: "scorched-01",
    layoutKey: "scorchedFrontRight",
    debugLabel: "scorched-front-right",
    realm: "Scorched",
    asset: "scorched-front-right-cropped.webp",
    className:
      "split-flower-button split-flower-button--scorched split-flower-button--scorched-01",
    previewLeft: "54%",
    rot: "8deg",
  },
  {
    key: "scorched-02",
    layoutKey: "scorchedMidRight",
    debugLabel: "scorched-mid-right",
    realm: "Scorched",
    asset: "scorched-mid-right-cropped.webp",
    className:
      "split-flower-button split-flower-button--scorched split-flower-button--scorched-02",
    previewLeft: "50%",
    rot: "3deg",
  },
  {
    key: "scorched-03",
    layoutKey: "scorchedBackRight",
    debugLabel: "scorched-back-right",
    realm: "Scorched",
    asset: "scorched-back-right-cropped.webp",
    className:
      "split-flower-button split-flower-button--scorched split-flower-button--scorched-03",
    previewLeft: "60%",
    rot: "11deg",
  },
];

const DEBUG_SPRITES = [
  { key: "shadow", label: "shadow" },
  { key: "stems", label: "stems" },
  { key: "hand", label: "hand" },
  { key: "healthyBackLeft", label: "healthy-back-left" },
  { key: "healthyMidLeft", label: "healthy-mid-left" },
  { key: "healthyFrontLeft", label: "healthy-front-left" },
  { key: "scorchedBackRight", label: "scorched-back-right" },
  { key: "scorchedMidRight", label: "scorched-mid-right" },
  { key: "scorchedFrontRight", label: "scorched-front-right" },
];

function cloneLayout(layout) {
  return JSON.parse(JSON.stringify(layout));
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredLayout() {
  if (!BOUQUET_DEBUG) return cloneLayout(DEFAULT_BOUQUET_LAYOUT);
  if (!canUseStorage()) return cloneLayout(DEFAULT_BOUQUET_LAYOUT);

  const saved = window.localStorage.getItem(BOUQUET_LAYOUT_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return cloneLayout(DEFAULT_BOUQUET_LAYOUT);
    }
  }

  return cloneLayout(DEFAULT_BOUQUET_LAYOUT);
}

function persistLayout(nextLayout) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(BOUQUET_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout, null, 2));
}

function clampPreview(message) {
  if (!message) return "";
  return message.length > 90 ? `${message.slice(0, 90)}...` : message;
}

function normalizeFlowerSlots(slots, posts) {
  return slots.map((slot, index) => ({
    ...slot,
    post: posts[index] || null,
  }));
}

function parsePercent(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  return match ? Number(match[1]) : null;
}

function formatPercent(value) {
  if (typeof value === "number") return `${value}%`;
  return value;
}

function bumpPercent(value, delta) {
  const parsed = parsePercent(value);
  if (parsed == null) return value;
  const next = Math.round((parsed + delta) * 100) / 100;
  const normalized = Number.isInteger(next)
    ? String(next)
    : next.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${normalized}%`;
}

function buildContainerStyle(config) {
  return {
    "--bouquet-left": config.left,
    "--bouquet-bottom": config.bottom,
    "--bouquet-width": config.width,
    "--bouquet-height": config.height,
  };
}

function buildBoxStyle(config) {
  return {
    "--coord-left": config.left || "auto",
    "--coord-right": config.right || "auto",
    "--coord-top": config.top || "auto",
    "--coord-bottom": config.bottom || "auto",
    "--coord-width": config.width || "auto",
    "--coord-height": config.height || "auto",
    zIndex: config.zIndex,
  };
}

function getDebugLines(config) {
  return ["left", "right", "top", "bottom", "width", "height"]
    .filter((key) => config[key] != null)
    .map((key) => `${key}: ${formatPercent(config[key])}`);
}

function nudgeLayoutValue(previousLayout, spriteKey, property, delta) {
  const currentSprite = previousLayout[spriteKey];
  if (!currentSprite || currentSprite[property] == null) return previousLayout;

  return {
    ...previousLayout,
    [spriteKey]: {
      ...currentSprite,
      [property]: bumpPercent(currentSprite[property], delta),
    },
  };
}

export default function SplitBouquetHero({ posts = [], onHandClick }) {
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const [bouquetLayout, setBouquetLayout] = useState(() => readStoredLayout());
  const [hoveredFlower, setHoveredFlower] = useState(null);
  const [selectedSprite, setSelectedSprite] = useState("hand");
  const [debugPointer, setDebugPointer] = useState({
    xPercent: 0,
    yPercent: 0,
    xPixels: 0,
    yPixels: 0,
  });

  const spriteLabelMap = useMemo(
    () => Object.fromEntries(DEBUG_SPRITES.map((sprite) => [sprite.key, sprite.label])),
    []
  );

  const { groveFlowers, scorchedFlowers } = useMemo(() => {
    const grovePosts = posts
      .filter((post) => (post?.wateredBy?.length || 0) > (post?.burnedBy?.length || 0))
      .slice(0, 3);

    const scorchedPosts = posts
      .filter((post) => (post?.burnedBy?.length || 0) > (post?.wateredBy?.length || 0))
      .slice(0, 3);

    return {
      groveFlowers: normalizeFlowerSlots(GROVE_FLOWERS, grovePosts),
      scorchedFlowers: normalizeFlowerSlots(SCORCHED_FLOWERS, scorchedPosts),
    };
  }, [posts]);

  const updateBouquetLayout = (updater) => {
    setBouquetLayout((previousLayout) => {
      const nextLayout =
        typeof updater === "function" ? updater(previousLayout) : cloneLayout(updater);
      persistLayout(nextLayout);
      return nextLayout;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__BOUQUET_LAYOUT__ = bouquetLayout;
  }, [bouquetLayout]);

  useEffect(() => {
    if (!canUseStorage()) return;
    if (!BOUQUET_DEBUG) {
      persistLayout(DEFAULT_BOUQUET_LAYOUT);
    }
  }, []);

  useEffect(() => {
    if (!BOUQUET_DEBUG || !selectedSprite) return undefined;

    const handleKeyDown = (event) => {
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT" ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      const currentSprite = bouquetLayout[selectedSprite];
      if (!currentSprite) return;

      const step = event.altKey ? 0.25 : event.shiftKey ? 0.5 : 1;
      let property = null;
      let delta = 0;

      switch (event.key) {
        case "ArrowLeft":
          if (currentSprite.left != null) {
            property = "left";
            delta = -step;
          } else if (currentSprite.right != null) {
            property = "right";
            delta = step;
          }
          break;
        case "ArrowRight":
          if (currentSprite.left != null) {
            property = "left";
            delta = step;
          } else if (currentSprite.right != null) {
            property = "right";
            delta = -step;
          }
          break;
        case "ArrowUp":
          if (currentSprite.top != null) {
            property = "top";
            delta = -step;
          } else if (currentSprite.bottom != null) {
            property = "bottom";
            delta = step;
          }
          break;
        case "ArrowDown":
          if (currentSprite.top != null) {
            property = "top";
            delta = step;
          } else if (currentSprite.bottom != null) {
            property = "bottom";
            delta = -step;
          }
          break;
        case "+":
          property = "width";
          delta = 1;
          break;
        case "=":
          if (!event.shiftKey) return;
          property = "width";
          delta = 1;
          break;
        case "-":
        case "_":
          property = "width";
          delta = -1;
          break;
        default:
          return;
      }

      if (!property || currentSprite[property] == null) return;

      event.preventDefault();
      updateBouquetLayout((previousLayout) =>
        nudgeLayoutValue(previousLayout, selectedSprite, property, delta)
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bouquetLayout, selectedSprite]);

  const handleDebugPointerMove = (event) => {
    if (!BOUQUET_DEBUG || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const xPixels = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const yPixels = Math.max(0, Math.min(rect.height, event.clientY - rect.top));

    setDebugPointer({
      xPercent: (xPixels / rect.width) * 100,
      yPercent: (yPixels / rect.height) * 100,
      xPixels: Math.round(xPixels),
      yPixels: Math.round(yPixels),
    });
  };

  const handleSpriteSelect = (spriteKey) => {
    if (!BOUQUET_DEBUG) return;
    setSelectedSprite(spriteKey);
  };

  const handleSaveCurrentLayout = () => {
    persistLayout(bouquetLayout);
  };

  const copyLayoutJson = async () => {
    const layoutJson = JSON.stringify(bouquetLayout, null, 2);
    console.log("FINAL_BOUQUET_LAYOUT", bouquetLayout);

    try {
      await navigator.clipboard.writeText(layoutJson);
    } catch {
      console.log(layoutJson);
    }
  };

  const handleResetToDefaultLayout = () => {
    const nextLayout = cloneLayout(DEFAULT_BOUQUET_LAYOUT);
    if (canUseStorage()) {
      window.localStorage.removeItem(BOUQUET_LAYOUT_STORAGE_KEY);
    }
    setBouquetLayout(nextLayout);
    setSelectedSprite("hand");
  };

  const handleLockCurrentLayout = async () => {
    persistLayout(bouquetLayout);
    await copyLayoutJson();
    if (typeof window !== "undefined") {
      window.alert(
        "Layout saved locally and copied. Paste this JSON into DEFAULT_BOUQUET_LAYOUT before finalizing."
      );
    }
  };

  const renderDebugTag = (spriteKey) => {
    if (!BOUQUET_DEBUG) return null;

    const spriteConfig = bouquetLayout[spriteKey];
    const spriteLabel = spriteLabelMap[spriteKey] || spriteKey;
    const isSelected = selectedSprite === spriteKey;

    return (
      <span
        className={`bouquet-debug-tag${isSelected ? " is-selected" : ""}`}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleSpriteSelect(spriteKey);
        }}
      >
        <span className="bouquet-debug-tag-name">{spriteLabel}</span>
        {getDebugLines(spriteConfig).map((line) => (
          <span key={`${spriteKey}-${line}`} className="bouquet-debug-tag-line">
            {line}
          </span>
        ))}
      </span>
    );
  };

  const renderFlower = (flower) => {
    const isActive = Boolean(flower.post?._id);
    const isHovered = hoveredFlower?.key === flower.key;
    const waterCount = flower.post?.wateredBy?.length || 0;
    const burnCount = flower.post?.burnedBy?.length || 0;
    const flowerLayout = bouquetLayout[flower.layoutKey];

    return (
      <button
        key={flower.key}
        type="button"
        className={[
          flower.className,
          isActive ? "is-active" : "is-disabled",
          isHovered ? "is-hovered" : "",
          BOUQUET_DEBUG ? " bouquet-debug-box" : "",
          selectedSprite === flower.layoutKey ? " is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseDownCapture={() => handleSpriteSelect(flower.layoutKey)}
        onMouseEnter={() => isActive && setHoveredFlower(flower)}
        onMouseLeave={() =>
          setHoveredFlower((current) => (current?.key === flower.key ? null : current))
        }
        onFocus={() => isActive && setHoveredFlower(flower)}
        onBlur={() =>
          setHoveredFlower((current) => (current?.key === flower.key ? null : current))
        }
        onClick={(event) => {
          if (BOUQUET_DEBUG) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (!isActive) return;
          if (flower.realm === "Grove") {
            navigate(`/grove?post=${flower.post._id}`);
            return;
          }
          navigate(`/scorched?post=${flower.post._id}`);
        }}
        aria-disabled={!isActive}
        tabIndex={isActive ? 0 : -1}
        aria-label={
          isActive
            ? `Open ${flower.realm} confession`
            : `No ${flower.realm} confession available yet`
        }
        style={{
          ...buildBoxStyle(flowerLayout),
          "--rot": flower.rot,
        }}
      >
        <img
          className="split-flower-img"
          src={`${ASSET_BASE}${flower.asset}`}
          alt=""
          draggable="false"
          decoding="async"
        />
        {BOUQUET_DEBUG && renderDebugTag(flower.layoutKey)}
        {isActive && (
          <span className="split-flower-sr-only">
            {flower.realm} {clampPreview(flower.post?.message || "")} {waterCount} waters{" "}
            {burnCount} burns
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="home-bouquet split-bouquet-wrap"
      style={buildContainerStyle(bouquetLayout.container)}
      aria-hidden="false"
    >
      <div className="split-bouquet-shell">
        <div
          ref={stageRef}
          className={`split-bouquet-stage${BOUQUET_DEBUG ? " bouquet-debug-stage" : ""}`}
          onMouseMove={handleDebugPointerMove}
        >
          {BOUQUET_DEBUG && (
            <>
              <div className="bouquet-debug-grid" aria-hidden="true">
                {DEBUG_AXIS_VALUES.map((value) => (
                  <span
                    key={`x-${value}`}
                    className="bouquet-debug-axis bouquet-debug-axis--x"
                    style={{ left: `${value}%` }}
                  >
                    {value}%
                  </span>
                ))}
                {DEBUG_AXIS_VALUES.map((value) => (
                  <span
                    key={`y-${value}`}
                    className="bouquet-debug-axis bouquet-debug-axis--y"
                    style={{ top: `${value}%` }}
                  >
                    {value}%
                  </span>
                ))}
              </div>
              <div className="bouquet-debug-panel" aria-hidden="true">
                <span className="bouquet-debug-panel-title">
                  selected: {spriteLabelMap[selectedSprite] || "none"}
                </span>
                <span>
                  x: {debugPointer.xPercent.toFixed(2)}% ({debugPointer.xPixels}px)
                </span>
                <span>
                  y: {debugPointer.yPercent.toFixed(2)}% ({debugPointer.yPixels}px)
                </span>
                <span>arrows: 1% | Shift: 0.5% | Alt: 0.25%</span>
                <span>+ / - adjust width by 1%</span>
                <button
                  type="button"
                  className="bouquet-debug-copy"
                  onClick={handleSaveCurrentLayout}
                >
                  Save current layout
                </button>
                <button
                  type="button"
                  className="bouquet-debug-copy"
                  onClick={copyLayoutJson}
                >
                  Copy Layout JSON
                </button>
                <button
                  type="button"
                  className="bouquet-debug-save"
                  onClick={handleResetToDefaultLayout}
                >
                  Reset to default layout
                </button>
                <button
                  type="button"
                  className="bouquet-debug-save"
                  onClick={handleLockCurrentLayout}
                >
                  Lock Current Layout
                </button>
              </div>
            </>
          )}

          <div
            className={`split-bouquet-shadow${BOUQUET_DEBUG ? " bouquet-debug-box" : ""}${
              selectedSprite === "shadow" ? " is-selected" : ""
            }`}
            style={buildBoxStyle(bouquetLayout.shadow)}
            onMouseDownCapture={() => handleSpriteSelect("shadow")}
            aria-hidden="true"
          >
            {BOUQUET_DEBUG && renderDebugTag("shadow")}
          </div>

          <div
            className={`split-bouquet-stems${BOUQUET_DEBUG ? " bouquet-debug-box" : ""}${
              selectedSprite === "stems" ? " is-selected" : ""
            }`}
            style={buildBoxStyle(bouquetLayout.stems)}
            onMouseDownCapture={() => handleSpriteSelect("stems")}
            aria-hidden="true"
          >
            <img
              className="split-bouquet-stems-img"
              src={`${ASSET_BASE}bouquet-stems-cropped.webp`}
              alt=""
              draggable="false"
              decoding="async"
            />
            {BOUQUET_DEBUG && renderDebugTag("stems")}
          </div>

          {groveFlowers.map(renderFlower)}
          {scorchedFlowers.map(renderFlower)}

          <button
            type="button"
            className={`split-bouquet-hand-button${BOUQUET_DEBUG ? " bouquet-debug-box" : ""}${
              selectedSprite === "hand" ? " is-selected" : ""
            }`}
            style={buildBoxStyle(bouquetLayout.hand)}
            onMouseDownCapture={() => handleSpriteSelect("hand")}
            onClick={(event) => {
              if (BOUQUET_DEBUG) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onHandClick?.(event);
            }}
            onMouseEnter={() => setHoveredFlower(null)}
            aria-label="Open confession window"
          >
            <img
              className="split-bouquet-hand-img"
              src={`${ASSET_BASE}bouquet-hand-cropped.webp`}
              alt=""
              draggable="false"
              decoding="async"
            />
            {BOUQUET_DEBUG && renderDebugTag("hand")}
          </button>

          {hoveredFlower?.post && (
            <div
              className={`split-bouquet-preview split-bouquet-preview--${hoveredFlower.realm.toLowerCase()}`}
              style={{ left: hoveredFlower.previewLeft }}
            >
              <span className="split-bouquet-preview-realm">{hoveredFlower.realm}</span>
              <p className="split-bouquet-preview-text">
                {clampPreview(hoveredFlower.post.message || "")}
              </p>
              <div className="split-bouquet-preview-stats">
                <span>water {hoveredFlower.post.wateredBy?.length || 0}</span>
                <span>burn {hoveredFlower.post.burnedBy?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
