const crypto = require("crypto");
const express = require("express");
const TranslationCache = require("../models/TranslationCache");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    route: "/api/translate/health",
    provider: process.env.TRANSLATION_PROVIDER || "none",
    primaryLibreTranslateConfigured: Boolean(process.env.LIBRETRANSLATE_PRIMARY_URL),
    fallbackLibreTranslateConfigured: Boolean(process.env.LIBRETRANSLATE_URL),
    libreTranslateConfigured: Boolean(
      process.env.LIBRETRANSLATE_PRIMARY_URL || process.env.LIBRETRANSLATE_URL
    ),
  });
});

const MAX_TEXT_LENGTH = 3000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const LIBRE_TRANSLATE_TIMEOUT_MS = 20000;
const SUPPORTED_TRANSLATION_LANGS = new Set(["en", "tl", "hi", "es", "fr", "ru", "de", "pt"]);
const SUPPORTED_SOURCE_LANGS = new Set(["auto", ...SUPPORTED_TRANSLATION_LANGS]);

const translationCache = new Map();
const rateLimitBuckets = new Map();

const normalizeLang = (value) => {
  const lang = String(value || "").trim().toLowerCase();
  if (lang === "fil" || lang.startsWith("fil-") || lang === "tagalog") return "tl";
  if (lang === "auto") return "auto";
  return lang.split("-")[0];
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeCacheId = (value) => String(value || "").trim();

const normalizeTargetType = (targetType, context) => {
  const value = String(targetType || context || "").trim().toLowerCase();

  if (value === "post") return "confession";
  if (["confession", "comment", "reply"].includes(value)) return value;

  return "unknown";
};

const getSourceTextHash = (normalizedText) =>
  crypto
    .createHash("sha256")
    .update(normalizedText)
    .digest("hex");

const getCacheKey = ({
  targetType,
  targetId,
  commentId,
  replyId,
  sourceLang,
  targetLang,
  sourceTextHash,
}) =>
  crypto
    .createHash("sha256")
    .update(
      [
        targetType,
        targetId || "",
        commentId || "",
        replyId || "",
        sourceLang,
        targetLang,
        sourceTextHash,
      ].join(":")
    )
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableTranslationError = (err) => {
  if (["TRANSLATION_TIMEOUT", "TRANSLATION_UNAVAILABLE"].includes(err?.code)) {
    return true;
  }

  return [502, 503, 504].includes(Number(err?.providerStatus));
};

const withTranslationRetry = async (operation) => {
  const retryDelays = [1200, 2500];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      if (attempt >= retryDelays.length || !isRetryableTranslationError(err)) {
        throw err;
      }

      await wait(retryDelays[attempt]);
    }
  }
};

const buildMemoryCacheEntry = (cacheDoc, fallbackSourceLang) => ({
  translatedText: cacheDoc.translatedText,
  detectedSourceLang: cacheDoc.sourceLang || fallbackSourceLang,
  provider: cacheDoc.provider || "libretranslate",
  timestamp: Date.now(),
  targetType: cacheDoc.targetType || "unknown",
});

const getLibreTranslateProviders = () => {
  const primaryUrl = String(process.env.LIBRETRANSLATE_PRIMARY_URL || "").trim();
  const fallbackUrl = String(process.env.LIBRETRANSLATE_URL || "").trim();
  const providers = [];

  if (primaryUrl) {
    providers.push({
      role: "primary",
      label: "Hugging Face LibreTranslate",
      url: primaryUrl,
    });
  }

  if (fallbackUrl && fallbackUrl !== primaryUrl) {
    providers.push({
      role: "fallback",
      label: "Render LibreTranslate",
      url: fallbackUrl,
    });
  }

  return providers;
};

async function translateWithLibreTranslate({ text, targetLang, sourceLang }) {
  const providers = getLibreTranslateProviders();

  if (providers.length === 0) {
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

  const requestTranslation = async (provider, payload) => {
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIBRE_TRANSLATE_TIMEOUT_MS);
    const translateUrl = `${provider.url.replace(/\/+$/g, "")}/translate`;

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
      error.providerStatus = response.status;
      throw error;
    }

    if (typeof data?.translatedText !== "string" || !data.translatedText.trim()) {
      const error = new Error("Translation unavailable");
      error.status = 503;
      error.code = "TRANSLATION_PROVIDER_ERROR";
      error.providerStatus = response.status;
      throw error;
    }

    return data;
  };

  const translateWithProvider = async (provider) => {
    let effectiveSourceLang = sourceLang || "auto";
    let data;

    try {
      data = await withTranslationRetry(() =>
        requestTranslation(provider, buildPayload(effectiveSourceLang))
      );
    } catch (err) {
      if (effectiveSourceLang !== "auto" || Number(err?.providerStatus) !== 400) {
        throw err;
      }

      effectiveSourceLang = "en";
      data = await withTranslationRetry(() =>
        requestTranslation(provider, buildPayload(effectiveSourceLang))
      );
    }

    return {
      translatedText: data.translatedText,
      detectedSourceLang: data?.detectedLanguage?.language || effectiveSourceLang,
      providerRole: provider.role,
    };
  };

  let lastError = null;

  for (const provider of providers) {
    try {
      return await translateWithProvider(provider);
    } catch (err) {
      lastError = err;

      if (provider.role === "primary" && providers.some((item) => item.role === "fallback")) {
        console.warn("Primary LibreTranslate failed, trying fallback:", err.message);
      } else {
        console.warn(`${provider.label} failed:`, err.message);
      }
    }
  }

  throw lastError || Object.assign(new Error("Translation unavailable"), { status: 503 });
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
  const targetType = normalizeTargetType(req.body?.targetType, context);
  const targetId = normalizeCacheId(req.body?.targetId);
  const commentId = normalizeCacheId(req.body?.commentId);
  const replyId = normalizeCacheId(req.body?.replyId);

  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  if (!targetLang) {
    return res.status(400).json({ message: "Target language is required" });
  }

  if (!SUPPORTED_TRANSLATION_LANGS.has(targetLang)) {
    return res.status(400).json({ message: "Unsupported target language" });
  }

  if (!SUPPORTED_SOURCE_LANGS.has(sourceLang)) {
    return res.status(400).json({ message: "Unsupported source language" });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({
      message: `Text is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`,
    });
  }

  const normalizedSourceText = normalizeText(text);
  const sourceTextHash = getSourceTextHash(normalizedSourceText);

  if (sourceLang !== "auto" && sameLanguage(sourceLang, targetLang)) {
    return res.json({
      translatedText: text,
      targetLang,
      detectedSourceLang: sourceLang,
      provider: "local",
      cached: false,
      cacheSource: "local",
    });
  }

  const cacheKey = getCacheKey({
    targetType,
    targetId,
    commentId,
    replyId,
    sourceLang,
    targetLang,
    sourceTextHash,
  });
  const cached = translationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp <= CACHE_TTL_MS) {
    return res.json({
      translatedText: cached.translatedText,
      targetLang,
      detectedSourceLang: cached.detectedSourceLang,
      provider: cached.provider,
      cached: true,
      cacheSource: "memory",
    });
  }

  try {
    const mongoCached = await TranslationCache.findOne({ cacheKey }).lean();

    if (mongoCached?.translatedText) {
      translationCache.set(cacheKey, buildMemoryCacheEntry(mongoCached, sourceLang));

      TranslationCache.updateOne(
        { cacheKey },
        { $set: { lastUsedAt: new Date() } }
      ).catch((err) => {
        console.warn("Translation cache lastUsedAt update failed:", err.message);
      });

      return res.json({
        translatedText: mongoCached.translatedText,
        targetLang,
        detectedSourceLang: mongoCached.sourceLang || sourceLang,
        provider: mongoCached.provider || "libretranslate",
        cached: true,
        cacheSource: "mongo",
        targetType,
        hasCommentId: Boolean(commentId),
      });
    }

    let textFallbackCached = await TranslationCache.findOne({
      sourceTextHash,
      sourceLang,
      targetLang,
      provider: "libretranslate",
    }).lean();

    if (!textFallbackCached) {
      textFallbackCached = await TranslationCache.findOne({
        sourceTextHash,
        sourceLang,
        targetLang,
      })
        .sort({ lastUsedAt: -1, updatedAt: -1 })
        .lean();
    }

    if (textFallbackCached?.translatedText) {
      const provider = textFallbackCached.provider || "libretranslate";
      const detectedSourceLang = textFallbackCached.sourceLang || sourceLang;

      translationCache.set(cacheKey, {
        translatedText: textFallbackCached.translatedText,
        detectedSourceLang,
        provider,
        timestamp: Date.now(),
        targetType,
      });

      TranslationCache.updateOne(
        { cacheKey: textFallbackCached.cacheKey },
        { $set: { lastUsedAt: new Date() } }
      ).catch((err) => {
        console.warn("Translation fallback cache lastUsedAt update failed:", err.message);
      });

      TranslationCache.findOneAndUpdate(
        { cacheKey },
        {
          $set: {
            cacheKey,
            targetType,
            targetId,
            commentId,
            replyId,
            sourceLang,
            targetLang,
            sourceTextHash,
            normalizedSourceText,
            translatedText: textFallbackCached.translatedText,
            provider,
            lastUsedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch((err) => {
        console.warn("Translation fallback cache repair failed:", err.message);
      });

      return res.json({
        translatedText: textFallbackCached.translatedText,
        targetLang,
        detectedSourceLang,
        provider,
        cached: true,
        cacheSource: "mongo-text-fallback",
        targetType,
        hasCommentId: Boolean(commentId),
      });
    }
  } catch (err) {
    console.warn("Translation cache lookup failed:", err.message);
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
      targetType,
    });

    try {
      await TranslationCache.findOneAndUpdate(
        { cacheKey },
        {
          $set: {
            cacheKey,
            targetType,
            targetId,
            commentId,
            replyId,
            sourceLang,
            targetLang,
            sourceTextHash,
            normalizedSourceText,
            translatedText,
            provider,
            lastUsedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.warn("Translation cache save failed:", err.message);
    }

    return res.json({
      translatedText,
      targetLang,
      detectedSourceLang: result.detectedSourceLang,
      provider,
      cached: false,
      cacheSource: "fresh",
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
