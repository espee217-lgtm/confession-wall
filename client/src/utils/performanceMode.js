const PERFORMANCE_MODE_KEY = "cw_performance_mode";
const VALID_MODES = new Set(["auto", "full", "lite"]);

function sanitizeMode(mode) {
  if (typeof mode !== "string") return "auto";
  const normalized = mode.trim().toLowerCase();
  return VALID_MODES.has(normalized) ? normalized : "auto";
}

export function getSavedPerformanceMode() {
  if (typeof window === "undefined") return "auto";

  try {
    return sanitizeMode(window.localStorage.getItem(PERFORMANCE_MODE_KEY));
  } catch {
    return "auto";
  }
}

export function setSavedPerformanceMode(mode) {
  if (typeof window === "undefined") return;

  const normalized = sanitizeMode(mode);

  try {
    window.localStorage.setItem(PERFORMANCE_MODE_KEY, normalized);
  } catch {
    // Ignore storage errors; mode still applies in-memory.
  }
}

export function detectPerformanceMode() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "full";
  }

  const nav = navigator;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const weakMemory =
    typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 4;
  const weakCpu =
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency > 0 &&
    nav.hardwareConcurrency <= 4;
  const saveData = Boolean(connection && connection.saveData);
  const slowConnection =
    typeof connection?.effectiveType === "string" &&
    ["slow-2g", "2g", "3g"].includes(connection.effectiveType);

  if (weakMemory || weakCpu || saveData || slowConnection || reducedMotion) {
    return "lite";
  }

  return "full";
}

export function resolvePerformanceMode(mode) {
  const normalized = sanitizeMode(mode);
  return normalized === "auto" ? detectPerformanceMode() : normalized;
}

export function applyPerformanceMode(mode) {
  if (typeof document === "undefined") {
    return resolvePerformanceMode(mode);
  }

  const root = document.documentElement;
  const resolvedMode = resolvePerformanceMode(mode);
  root.dataset.performanceMode = resolvedMode;
  root.classList.toggle("cw-lite-mode", resolvedMode === "lite");

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cw:performance-mode-change", {
        detail: {
          savedMode: sanitizeMode(mode),
          resolvedMode,
        },
      })
    );
  }

  return resolvedMode;
}

