const crypto = require("crypto");
const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    route: "/api/translate/health",
    provider: process.env.TRANSLATION_PROVIDER || "none",
    libreTranslateConfigured: Boolean(process.env.LIBRETRANSLATE_URL)
  });
});

const MAX_TEXT_LENGTH = 3000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const LIBRE_TRANSLATE_TIMEOUT_MS = 20000;

const translationCache = new Map();
const rateLimitBuckets = new Map();

const normalizeLang = (value) => {
  const lang = String(value || "").trim().toLowerCase();
  return lang === "fil" || lang.startsWith("fil-") || lang === "tagalog" ? "tl" : lang;
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const getCacheKey = ({ text, targetLang, sourceLang }) =>
  crypto
    .createHash("sha256")
    .update(`${targetLang}:${sourceLang}:${normalizeText(text)}`)
    .digest("hex");

const getClientIp = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "unknown";

const pruneExpiredEntries = () => {
  const now = Date.now();

  for (const [key, value] of translationCache.entries()) {
    if (!value?.timestamp || now - value.timestamp > CACHE_TTL_MS) {
      translationCache.delete(key);
    }
  }

  for (const [key, value] of rateLimitBuckets.entries()) {
    if (!value?.windowStartedAt || now - value.windowStartedAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitBuckets.delete(key);
    }
  }
};

const isRateLimited = (req) => {
  const now = Date.now();
  const ip = getClientIp(req);
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || now - bucket.windowStartedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(ip, { count: 1, windowStartedAt: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
};

const sameLanguage = (detectedSourceLang, targetLang) => {
  const source = normalizeLang(detectedSourceLang).split("-")[0];
  const target = normalizeLang(targetLang).split("-")[0];

  return Boolean(source && target && source === target);
};

async function translateWithLibreTranslate({ text, targetLang, sourceLang }) {
  const libreTranslateUrl = String(process.env.LIBRETRANSLATE_URL || "").trim();

  if (!libreTranslateUrl) {
    const error = new Error("Translation service is not configured");
    error.status = 503;
    throw error;
  }

  if (typeof fetch !== "function") {
    const error = new Error("Translation fetch is not available in this Node runtime");
    error.status = 503;
    throw error;
  }

  const apiKey = String(process.env.LIBRETRANSLATE_API_KEY || "").trim();
  const translateUrl = `${libreTranslateUrl.replace(/\/+$/g, "")}/translate`;
  const buildPayload = (effectiveSourceLang) => {
    const payload = {
      q: text,
      source: effectiveSourceLang || "auto",
      target: targetLang,
      format: "text",
    };

    if (apiKey) {
      payload.api_key = apiKey;
    }

    return payload;
  };

  const requestTranslation = async (payload) => {
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIBRE_TRANSLATE_TIMEOUT_MS);

    try {
      response = await fetch(translateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      const isTimeout = err?.name === "AbortError";
      const error = new Error(
        isTimeout
          ? "Translation service is warming up. Please try again in a few seconds."
          : "Translation unavailable"
      );
      error.status = 503;
      error.code = isTimeout ? "TRANSLATION_TIMEOUT" : "TRANSLATION_UNAVAILABLE";
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || "Translation unavailable");
      error.status = 503;
      error.code = "TRANSLATION_PROVIDER_ERROR";
      throw error;
    }

    return data;
  };

  let effectiveSourceLang = sourceLang || "auto";
  let data;

  try {
    data = await requestTranslation(buildPayload(effectiveSourceLang));
  } catch (err) {
    if (effectiveSourceLang !== "auto" || err.code === "TRANSLATION_TIMEOUT") {
      throw err;
    }

    effectiveSourceLang = "en";
    data = await requestTranslation(buildPayload(effectiveSourceLang));
  }

  return {
    translatedText: data.translatedText || text,
    detectedSourceLang: data?.detectedLanguage?.language || effectiveSourceLang,
  };
}

router.post("/", async (req, res) => {
  pruneExpiredEntries();

  if (isRateLimited(req)) {
    return res.status(429).json({ message: "Too many translation requests" });
  }

  const text = String(req.body?.text || "").trim();
  const targetLang = normalizeLang(req.body?.targetLang);
  const sourceLang = normalizeLang(req.body?.sourceLang || "auto") || "auto";
  const context = String(req.body?.context || "confession").trim();

  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  if (!targetLang) {
    return res.status(400).json({ message: "Target language is required" });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({
      message: `Text is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`,
    });
  }

  if (sourceLang !== "auto" && sameLanguage(sourceLang, targetLang)) {
    return res.json({
      translatedText: text,
      targetLang,
      detectedSourceLang: sourceLang,
      provider: "local",
      cached: false,
    });
  }

  const cacheKey = getCacheKey({ text, targetLang, sourceLang });
  const cached = translationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp <= CACHE_TTL_MS) {
    return res.json({
      translatedText: cached.translatedText,
      targetLang,
      detectedSourceLang: cached.detectedSourceLang,
      provider: cached.provider,
      cached: true,
    });
  }

  try {
    const provider = normalizeLang(process.env.TRANSLATION_PROVIDER || "libretranslate");

    if (provider !== "libretranslate") {
      return res
        .status(503)
        .json({ message: "Translation service is not configured" });
    }

    const result = await translateWithLibreTranslate({ text, targetLang, sourceLang });
    const translatedText = sameLanguage(result.detectedSourceLang, targetLang)
      ? text
      : result.translatedText;

    translationCache.set(cacheKey, {
      translatedText,
      detectedSourceLang: result.detectedSourceLang,
      provider,
      timestamp: Date.now(),
      context,
    });

    return res.json({
      translatedText,
      targetLang,
      detectedSourceLang: result.detectedSourceLang,
      provider,
      cached: false,
    });
  } catch (err) {
    console.warn("Translation provider failed:", err.message);
    const message =
      err.message === "Translation service is not configured"
        ? "Translation service is not configured"
        : err.code === "TRANSLATION_TIMEOUT"
        ? "Translation service is warming up. Please try again in a few seconds."
        : err.code === "TRANSLATION_PROVIDER_ERROR"
        ? err.message || "Translation unavailable"
        : "Translation unavailable";

    return res.status(err.status || 502).json({
      message,
      code: err.code || "TRANSLATION_PROVIDER_ERROR",
    });
  }
});

module.exports = router;
