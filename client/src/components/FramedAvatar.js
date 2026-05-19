import React from "react";
import { CosmeticFxLayers } from "./CosmeticFx";
import { getCosmeticAnimationClass } from "../utils/cosmetics";

function normalizeFrameId(frameId) {
  if (!frameId) return "";

  const value = String(frameId).trim();

  const aliases = {
    "vine-glow-frame": "frame-vine-glow",
    vine_glow_frame: "frame-vine-glow",
    vineGlowFrame: "frame-vine-glow",
    "frame-vine-glow": "frame-vine-glow",

    "golden-leaf-frame": "frame-golden-leaf",
    golden_leaf_frame: "frame-golden-leaf",
    goldenLeafFrame: "frame-golden-leaf",
    "frame-golden-leaf": "frame-golden-leaf",

    "ember-root-frame": "frame-ember-root",
    ember_root_frame: "frame-ember-root",
    emberRootFrame: "frame-ember-root",
    "frame-ember-root": "frame-ember-root",
    "frame-moonveil": "frame-moonveil",
    frame_moonveil: "frame-moonveil",
    "frame-thornfire": "frame-thornfire",
    frame_thornfire: "frame-thornfire",
    "frame-celestial": "frame-celestial",
    frame_celestial: "frame-celestial",
    "frame-victory-visor": "frame-victory-visor",
    frame_victory_visor: "frame-victory-visor",
    "frame-visor-lift-racer": "frame-victory-visor",
    frame_visor_lift_racer: "frame-victory-visor",
    visor_lift_racer_frame: "frame-victory-visor",
  };

  return aliases[value] || value;
}

function getFrameStyle(frameId) {
  const normalized = normalizeFrameId(frameId);

  if (normalized === "frame-vine-glow") {
    return {
      padding: "4px",
      background:
        "linear-gradient(135deg, rgba(130,255,150,1), rgba(30,180,65,0.8))",
      boxShadow:
        "0 0 10px rgba(130,255,150,1), 0 0 22px rgba(130,255,150,0.8), 0 0 38px rgba(70,255,110,0.45)",
    };
  }

  if (normalized === "frame-golden-leaf") {
    return {
      padding: "4px",
      background:
        "linear-gradient(135deg, rgba(255,235,125,1), rgba(180,120,20,0.85))",
      boxShadow:
        "0 0 10px rgba(255,225,90,1), 0 0 22px rgba(255,215,90,0.75), 0 0 38px rgba(255,190,40,0.45)",
    };
  }

  if (normalized === "frame-ember-root") {
    return {
      padding: "4px",
      background:
        "linear-gradient(135deg, rgba(255,120,75,1), rgba(135,25,12,0.85))",
      boxShadow:
        "0 0 10px rgba(255,95,55,1), 0 0 22px rgba(255,85,45,0.75), 0 0 38px rgba(255,55,25,0.45)",
    };
  }

  return {
    padding: "0px",
    background: "transparent",
    boxShadow: "none",
  };
}

export default function FramedAvatar({
  src,
  username = "User",
  frameId = "",
  effectId = "",
  size = 42,
  placeholder,
  context = "auto",
  className = "",
}) {
  const normalized = normalizeFrameId(frameId);
  const isLightningFrameEffect =
    effectId === "visual-effect-cursed-violet-aura";
  const activeEffectId =
    isLightningFrameEffect && normalized ? "" : effectId;
  const isLightningOnlyFrame =
    !normalized && activeEffectId === "visual-effect-cursed-violet-aura";
  const hasFrame = Boolean(normalized || activeEffectId === "visual-effect-cursed-violet-aura");
  const isAnimatedSpriteFrame =
    normalized === "frame-victory-visor" ||
    normalized === "frame-storm-eye-rogue";
  const resolvedContext =
    context && context !== "auto"
      ? context
      : size >= 80
      ? "profile"
      : size >= 56
      ? "shop"
      : size <= 32
      ? "comment"
      : "post";
  const shouldRenderAnimatedFrame = isAnimatedSpriteFrame;
  const frameAnimClass = getCosmeticAnimationClass(normalized);
  const effectAnimClass = getCosmeticAnimationClass(activeEffectId);
  const wrapperClassName =
    [
      `cw-framed-avatar--${resolvedContext}`,
      className,
      frameAnimClass,
      effectAnimClass,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const frameStyle = frameAnimClass
    ? {
        padding: "4px",
        background: "transparent",
        boxShadow: "none",
      }
    : getFrameStyle(normalized);

  const fallback = placeholder || username?.[0]?.toUpperCase?.() || "🌿";

  const frameFx =
    normalized === "frame-thornfire" ? (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        <svg className="cw-fx-vine-svg" viewBox="0 0 40 60" aria-hidden="true">
          <path d="M4 55 C4 35, 18 28, 22 12 C24 6, 20 4, 18 8" />
        </svg>
        <span className="cw-fx-ember-glow" />
      </div>
    ) : normalized === "frame-celestial" ? (
      <div className="cw-cosmetic-fx-layer" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="cw-fx-orbit-star"
            style={{ animationDelay: `${-i * 1.15}s` }}
          />
        ))}
      </div>
    ) : isAnimatedSpriteFrame && shouldRenderAnimatedFrame ? (
      <CosmeticFxLayers cosmeticId={normalized} />
    ) : null;

  return (
    <div
      title={normalized || ""}
      className={["cw-framed-avatar", wrapperClassName].filter(Boolean).join(" ")}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "visible",
        position: "relative",
        zIndex: 3,
        boxSizing: "border-box",
        ...frameStyle,
      }}
    >
      <CosmeticFxLayers cosmeticId={activeEffectId} />
      {frameFx}
      {src ? (
        <img
          src={src}
          alt={username}
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
            boxSizing: "border-box",
            border: isLightningOnlyFrame
              ? "1.5px solid rgba(168, 134, 255, 0.24)"
              : hasFrame
              ? "2px solid rgba(3, 16, 7, 0.95)"
              : "2px solid rgba(100,180,80,0.35)",
          }}
        />
      ) : (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            background: "linear-gradient(135deg, #d9f5c8, #9ed58d)",
            border: isLightningOnlyFrame
              ? "1.5px solid rgba(168, 134, 255, 0.24)"
              : hasFrame
              ? "2px solid rgba(3, 16, 7, 0.95)"
              : "2px solid rgba(100,180,80,0.35)",
            color: "#123816",
            fontWeight: 800,
            fontSize: Math.max(12, size * 0.36),
            fontFamily: "Georgia, serif",
          }}
        >
          {fallback}
        </div>
      )}
    </div>
  );
}
