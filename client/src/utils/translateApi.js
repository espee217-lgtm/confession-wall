const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

export async function requestTranslation({
  text,
  targetLang,
  sourceLang = "auto",
  context = "confession",
}) {
  const response = await fetch(`${API_BASE}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      targetLang,
      sourceLang,
      context,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Translation unavailable");
  }

  return data;
}
