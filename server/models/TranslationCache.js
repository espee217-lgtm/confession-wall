const mongoose = require("mongoose");

const translationCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
    },
    targetType: {
      type: String,
      enum: ["confession", "comment", "reply", "unknown"],
      default: "unknown",
      index: true,
    },
    targetId: {
      type: String,
      default: "",
      index: true,
    },
    commentId: {
      type: String,
      default: "",
      index: true,
    },
    replyId: {
      type: String,
      default: "",
      index: true,
    },
    sourceLang: {
      type: String,
      default: "auto",
    },
    targetLang: {
      type: String,
      required: true,
      index: true,
    },
    sourceTextHash: {
      type: String,
      required: true,
      index: true,
    },
    normalizedSourceText: {
      type: String,
      default: "",
    },
    translatedText: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "libretranslate",
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

translationCacheSchema.index({ targetType: 1, targetId: 1, targetLang: 1 });
translationCacheSchema.index({ targetLang: 1, sourceTextHash: 1 });

module.exports = mongoose.model("TranslationCache", translationCacheSchema);
