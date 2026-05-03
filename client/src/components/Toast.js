import React, { useEffect, useState } from "react";

const TYPE_STYLES = {
  success: {
    border: "rgba(120,255,160,0.55)",
    glow: "rgba(110,255,150,0.22)",
    icon: "✅",
  },
  error: {
    border: "rgba(255,120,120,0.55)",
    glow: "rgba(255,80,80,0.22)",
    icon: "⚠️",
  },
  warning: {
    border: "rgba(255,210,110,0.55)",
    glow: "rgba(255,190,80,0.22)",
    icon: "⏳",
  },
  info: {
    border: "rgba(140,210,255,0.55)",
    glow: "rgba(100,180,255,0.18)",
    icon: "ℹ️",
  },
};

export function showToast(message, type = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cw-toast", {
      detail: { message, type },
    })
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    window.cwToast = showToast;

    const handleToast = (event) => {
      const detail = event.detail || {};
      const id = `${Date.now()}-${Math.random()}`;
      const message = String(detail.message || "Something happened.");
      const type = detail.type || "info";

      setToasts((prev) => [...prev, { id, message, type }].slice(-4));

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3800);
    };

    window.addEventListener("cw-toast", handleToast);

    return () => {
      window.removeEventListener("cw-toast", handleToast);
      if (window.cwToast === showToast) delete window.cwToast;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "84px",
        right: "18px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "min(360px, calc(100vw - 28px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const styles = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              padding: "13px 14px",
              borderRadius: "16px",
              color: "#f3ffe9",
              background:
                "linear-gradient(145deg, rgba(7,28,10,0.97), rgba(2,12,5,0.98))",
              border: `1px solid ${styles.border}`,
              boxShadow: `0 16px 44px rgba(0,0,0,0.48), 0 0 22px ${styles.glow}`,
              backdropFilter: "blur(10px)",
              fontFamily: "Georgia, serif",
              lineHeight: 1.35,
            }}
          >
            <span style={{ flex: "0 0 auto" }}>{styles.icon}</span>
            <span style={{ fontSize: "14px" }}>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}