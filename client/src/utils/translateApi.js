const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const TRANSLATION_TIMEOUT_MS = 25000;

export async function requestTranslation({
  text,
  targetLang,
  sourceLang = "auto",
  context = "confession",
  targetType,
  targetId,
  commentId,
  replyId,
}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
  const body = {
    text,
    targetLang,
    sourceLang,
    context,
  };

  if (targetType) body.targetType = targetType;
  if (targetId) body.targetId = targetId;
  if (commentId) body.commentId = commentId;
  if (replyId) body.replyId = replyId;

  let response;

  try {
    response = await fetch(`${API_BASE}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Translation is taking too long. Please try again.");
    }

    throw err;
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Translation unavailable");
  }

  return data;
}
