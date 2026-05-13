import React from "react";

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
  size = 42,
  placeholder,
}) {
  const normalized = normalizeFrameId(frameId);
  const hasFrame = Boolean(normalized);
  const frameStyle = getFrameStyle(normalized);

  const fallback = placeholder || username?.[0]?.toUpperCase?.() || "🌿";

  return (
    <div
      title={normalized || ""}
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
      {src ? (
        <img
          src={src}
          alt={username}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
            boxSizing: "border-box",
            border: hasFrame
              ? "2px solid rgba(3, 16, 7, 0.95)"
              : "2px solid rgba(100,180,80,0.35)",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            background: "linear-gradient(135deg, #d9f5c8, #9ed58d)",
            border: hasFrame
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