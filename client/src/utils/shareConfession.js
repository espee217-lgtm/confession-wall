const DEFAULT_SHARE_TITLE = "Anonymous Confession on Confession Wall";

const normalizeMessage = (message = "") =>
  String(message || "")
    .replace(/\s+/g, " ")
    .trim();

const fallbackCopyWithTextarea = (text) => {
  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

const copyTextToClipboard = async (text) => {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopyWithTextarea(text);
    }
  }

  return fallbackCopyWithTextarea(text);
};

export const getConfessionUrl = (confessionId) => {
  const safeId = String(confessionId || "").trim();
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  return safeId ? `${origin}/confession/${safeId}` : `${origin}/confession`;
};

export const getConfessionExcerpt = (message, maxLength = 120) => {
  const normalized = normalizeMessage(message);
  if (!normalized) return "";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

export const buildConfessionShareText = (confession) => {
  const url = getConfessionUrl(confession?._id);
  const excerpt = getConfessionExcerpt(confession?.message, 120);

  if (!excerpt) {
    return `Anonymous confession on Confession Wall.

Would you water this or burn it?

Read or post anonymously:
${url}`;
  }

  return `Anonymous confession:

"${excerpt}"

Would you water this or burn it?

Read or post anonymously on Confession Wall:
${url}`;
};

export const copyConfessionLink = async (confessionId) => {
  const url = getConfessionUrl(confessionId);
  const copied = await copyTextToClipboard(url);

  return {
    ok: copied,
    url,
  };
};

export const shareConfession = async (confession) => {
  const url = getConfessionUrl(confession?._id);
  const text = buildConfessionShareText(confession);

  if (typeof navigator === "undefined" || !navigator.share) {
    const copied = await copyTextToClipboard(url);
    return {
      ok: copied,
      method: "copy-fallback",
      url,
    };
  }

  try {
    await navigator.share({
      title: DEFAULT_SHARE_TITLE,
      text,
      url,
    });

    return {
      ok: true,
      method: "native-share",
      url,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        ok: false,
        cancelled: true,
        method: "native-share",
        url,
      };
    }

    const copied = await copyTextToClipboard(url);
    return {
      ok: copied,
      method: copied ? "copy-fallback" : "failed",
      url,
      error,
    };
  }
};

