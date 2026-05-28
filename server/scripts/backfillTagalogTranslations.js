const crypto = require("crypto");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const Confession = require("../models/Confession");
const TranslationCache = require("../models/TranslationCache");

const TARGET_LANG = "tl";
const DEFAULT_SOURCE_LANG = "auto";
const DEFAULT_DELAY_MS = 2500;
const TRANSLATE_TIMEOUT_MS = 20000;
const PROVIDER = "libretranslate";

const normalizeLang = (value) => {
  const lang = String(value || "").trim().toLowerCase();
  return lang === "fil" || lang.startsWith("fil-") || lang === "tagalog" ? "tl" : lang;
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeCacheId = (value) => String(value || "").trim();

const getSourceTextHash = (normalizedText) =>
  crypto.createHash("sha256").update(normalizedText).digest("hex");

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isDryRun = () => String(process.env.BACKFILL_TRANSLATE_DRY_RUN || "").toLowerCase() === "true";

const isRetryableTranslationError = (err) => {
  if (["TRANSLATION_TIMEOUT", "TRANSLATION_UNAVAILABLE"].includes(err?.code)) {
    return true;
  }

  if (["ETIMEDOUT", "ECONNRESET"].includes(err?.code)) {
    return true;
  }

  return [502, 503, 504].includes(Number(err?.providerStatus));
};

const withRetry = async (operation) => {
  const retryDelays = [1500, 3500];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      if (attempt >= retryDelays.length || !isRetryableTranslationError(err)) {
        throw err;
      }

      console.warn(
        `Retrying translation after ${retryDelays[attempt]}ms (${err.code || err.providerStatus || err.message})`
      );
      await wait(retryDelays[attempt]);
    }
  }
};

async function requestLibreTranslation({ text, targetLang, sourceLang }) {
  const libreTranslateUrl = String(process.env.LIBRETRANSLATE_URL || "").trim();

  if (!libreTranslateUrl) {
    const error = new Error("LIBRETRANSLATE_URL is not configured");
    error.code = "TRANSLATION_NOT_CONFIGURED";
    throw error;
  }

  if (typeof fetch !== "function") {
    const error = new Error("fetch is not available in this Node runtime");
    error.code = "TRANSLATION_NOT_CONFIGURED";
    throw error;
  }

  const payload = {
    q: text,
    source: sourceLang || DEFAULT_SOURCE_LANG,
    target: targetLang,
    format: "text",
  };
  const apiKey = String(process.env.LIBRETRANSLATE_API_KEY || "").trim();

  if (apiKey) {
    payload.api_key = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${libreTranslateUrl.replace(/\/+$/g, "")}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    const error = new Error(isTimeout ? "Translation timed out" : "Translation unavailable");
    error.code = isTimeout ? "TRANSLATION_TIMEOUT" : err?.code || "TRANSLATION_UNAVAILABLE";
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || "Translation provider error");
    error.code = "TRANSLATION_PROVIDER_ERROR";
    error.providerStatus = response.status;
    throw error;
  }

  return {
    translatedText: data.translatedText || text,
    detectedSourceLang: data?.detectedLanguage?.language || sourceLang || DEFAULT_SOURCE_LANG,
  };
}

async function translateText({ text, targetLang, sourceLang }) {
  let effectiveSourceLang = sourceLang || DEFAULT_SOURCE_LANG;

  try {
    return await withRetry(() =>
      requestLibreTranslation({ text, targetLang, sourceLang: effectiveSourceLang })
    );
  } catch (err) {
    if (effectiveSourceLang !== "auto" || Number(err?.providerStatus) !== 400) {
      throw err;
    }

    effectiveSourceLang = "en";
    return withRetry(() =>
      requestLibreTranslation({ text, targetLang, sourceLang: effectiveSourceLang })
    );
  }
}

const makeItem = ({
  targetType,
  targetId,
  commentId = "",
  replyId = "",
  text,
}) => {
  const normalizedSourceText = normalizeText(text);
  if (!normalizedSourceText) return null;

  const sourceLang = DEFAULT_SOURCE_LANG;
  const targetLang = TARGET_LANG;
  const sourceTextHash = getSourceTextHash(normalizedSourceText);
  const cacheKey = getCacheKey({
    targetType,
    targetId,
    commentId,
    replyId,
    sourceLang,
    targetLang,
    sourceTextHash,
  });

  return {
    cacheKey,
    targetType,
    targetId,
    commentId,
    replyId,
    sourceLang,
    targetLang,
    sourceTextHash,
    normalizedSourceText,
    text: String(text || "").trim(),
  };
};

function collectItems(confessions) {
  const items = [];

  for (const confession of confessions) {
    const targetId = normalizeCacheId(confession._id);
    const confessionItem = makeItem({
      targetType: "confession",
      targetId,
      text: confession.message,
    });

    if (confessionItem) items.push(confessionItem);

    const comments = Array.isArray(confession.comments) ? confession.comments : [];
    for (const comment of comments) {
      const commentId = normalizeCacheId(comment._id);
      const commentItem = makeItem({
        targetType: "comment",
        targetId,
        commentId,
        text: comment.text,
      });

      if (commentItem) items.push(commentItem);

      const replies = Array.isArray(comment.replies) ? comment.replies : [];
      for (const reply of replies) {
        const replyItem = makeItem({
          targetType: "reply",
          targetId,
          commentId,
          replyId: normalizeCacheId(reply._id),
          text: reply.text,
        });

        if (replyItem) items.push(replyItem);
      }
    }
  }

  return items;
}

async function processItem(item, index, total, options) {
  const labelParts = [
    `${item.targetType}`,
    `target=${item.targetId || "none"}`,
    item.commentId ? `comment=${item.commentId}` : "",
    item.replyId ? `reply=${item.replyId}` : "",
  ].filter(Boolean);
  const label = labelParts.join(" ");

  console.log(`[${index}/${total}] ${label}`);

  const existing = await TranslationCache.findOne({ cacheKey: item.cacheKey }).select("_id").lean();

  if (existing) {
    return "cached";
  }

  if (options.dryRun) {
    return "dryRun";
  }

  const result = await translateText({
    text: item.text,
    targetLang: item.targetLang,
    sourceLang: item.sourceLang,
  });

  await TranslationCache.findOneAndUpdate(
    { cacheKey: item.cacheKey },
    {
      $set: {
        cacheKey: item.cacheKey,
        targetType: item.targetType,
        targetId: item.targetId,
        commentId: item.commentId,
        replyId: item.replyId,
        sourceLang: item.sourceLang,
        targetLang: item.targetLang,
        sourceTextHash: item.sourceTextHash,
        normalizedSourceText: item.normalizedSourceText,
        translatedText: result.translatedText || item.text,
        provider: PROVIDER,
        lastUsedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return "translated";
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  const delayMs = parsePositiveInt(process.env.BACKFILL_TRANSLATE_DELAY_MS, DEFAULT_DELAY_MS);
  const freshLimit = process.env.BACKFILL_TRANSLATE_LIMIT
    ? parsePositiveInt(process.env.BACKFILL_TRANSLATE_LIMIT, 0)
    : 0;
  const dryRun = isDryRun();

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
  console.log(
    `Backfill options: targetLang=${TARGET_LANG}, sourceLang=${DEFAULT_SOURCE_LANG}, dryRun=${dryRun}, delayMs=${delayMs}, freshLimit=${freshLimit || "none"}`
  );

  const confessions = await Confession.find({})
    .select("message comments.text comments.replies.text")
    .lean();
  const items = collectItems(confessions);

  console.log(`Total confessions scanned: ${confessions.length}`);
  console.log(`Total translation items discovered: ${items.length}`);

  let cached = 0;
  let dryRunMissing = 0;
  let translated = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += 1) {
    if (freshLimit && translated >= freshLimit) {
      console.log(`Fresh translation limit reached: ${freshLimit}`);
      break;
    }

    const item = items[i];

    try {
      const result = await processItem(item, i + 1, items.length, { dryRun });

      if (result === "cached") {
        cached += 1;
        continue;
      }

      if (result === "dryRun") {
        dryRunMissing += 1;
        continue;
      }

      translated += 1;

      if (delayMs > 0 && (!freshLimit || translated < freshLimit)) {
        await wait(delayMs);
      }
    } catch (err) {
      failed += 1;
      console.warn(
        `Failed ${item.targetType} target=${item.targetId || "none"} comment=${item.commentId || "none"} reply=${item.replyId || "none"}: ${err.message}`
      );
    }
  }

  console.log("Backfill complete");
  console.log(`Cached/skipped: ${cached}`);
  console.log(`Dry-run missing: ${dryRunMissing}`);
  console.log(`Fresh translated: ${translated}`);
  console.log(`Failed: ${failed}`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
    console.log("MongoDB connection closed");
  });
