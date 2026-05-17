import React from "react";
import {
  getCosmeticAnimationClass,
  getDisplayTitle,
  getCosmeticIcon,
} from "../utils/cosmetics";

export default function DisplayTitlePill({ titleId, size = "small" }) {
  const title = getDisplayTitle(titleId);

  if (!title) return null;

  const icon = getCosmeticIcon(titleId) || "✦";
  const isBig = size === "big";
  const animClass = getCosmeticAnimationClass(titleId);

  return (
    <span
      className={animClass || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isBig ? "7px" : "5px",
        padding: isBig ? "6px 12px" : "3px 8px",
        borderRadius: "999px",
        background:
          "linear-gradient(135deg, rgba(210,255,190,0.16), rgba(80,180,100,0.08))",
        border: "1px solid rgba(180,255,170,0.34)",
        boxShadow:
          "0 0 12px rgba(120,255,140,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "rgba(232,255,220,0.95)",
        fontSize: isBig ? "0.9rem" : "10px",
        fontWeight: 800,
        letterSpacing: "0.04em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        textShadow: "0 0 10px rgba(120,255,140,0.22)",
      }}
    >
      <span>{icon}</span>
      <span>{title}</span>
    </span>
  );
}