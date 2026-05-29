import React, { useEffect, useState } from "react";
import { requestTranslation } from "../utils/translateApi";
import {
  getPreferredTranslateTarget,
  TRANSLATE_TARGET_CHANGE_EVENT,
} from "../utils/translateTarget";

const ENGLISH_SIGNAL_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "for",
  "from",
  "have",
  "he",
  "her",
  "his",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "they",
  "this",
  "to",
  "was",
  "we",
  "with",
  "you",
]);

const NON_ENGLISH_SIGNAL_RE =
  /\b(hola|gracias|porque|bonjour|merci|salut|je|suis|und|ich|nicht|danke|hallo|privet|spasibo|namaste|nahi|hai|ako|hindi|salamat|kumusta|obrigado|voce|nao)\b/i;

const NON_ENGLISH_SCRIPT_RE = /[\u00c0-\u024f\u0400-\u04ff\u0900-\u097f]/;

const shouldOfferEnglishTranslation = (text) => {
  const value = String(text || "").trim();
  if (!value) return false;
  if (NON_ENGLISH_SCRIPT_RE.test(value) || NON_ENGLISH_SIGNAL_RE.test(value)) return true;

  const words = value.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length < 3) return true;

  const englishHits = words.filter((word) => ENGLISH_SIGNAL_WORDS.has(word)).length;
  return englishHits / words.length < 0.28;
};

export default function TranslatableText({
  text,
  context = "confession",
  as = "p",
  wrapperAs = "div",
  className = "",
  textClassName = "",
  buttonClassName = "",
  textStyle,
  wrapperStyle,
  compact = false,
  targetType,
  targetId,
  commentId,
  replyId,
}) {
  const [target, setTarget] = useState(() => getPreferredTranslateTarget());
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanText = String(text || "").trim();

  useEffect(() => {
    const syncTarget = (event) => {
      if (event?.detail?.lang) {
        setTarget(event.detail);
      } else {
        setTarget(getPreferredTranslateTarget());
      }
    };

    window.addEventListener(TRANSLATE_TARGET_CHANGE_EVENT, syncTarget);
    window.addEventListener("storage", syncTarget);

    return () => {
      window.removeEventListener(TRANSLATE_TARGET_CHANGE_EVENT, syncTarget);
      window.removeEventListener("storage", syncTarget);
    };
  }, []);

  useEffect(() => {
    setTranslatedText("");
    setIsTranslated(false);
    setLoading(false);
    setError("");
  }, [cleanText, target.lang]);

  if (!cleanText) return null;

  const TextTag = as;
  const WrapperTag = wrapperAs;
  const displayText = isTranslated && translatedText ? translatedText : text;
  const showTranslate =
    target.lang === "en"
      ? target.shouldShowTranslate && shouldOfferEnglishTranslation(cleanText)
      : target.shouldShowTranslate;

  const handleTranslateClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (loading) return;

    if (isTranslated) {
      setIsTranslated(false);
      setError("");
      return;
    }

    if (translatedText) {
      setIsTranslated(true);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await requestTranslation({
        text: cleanText,
        targetLang: target.lang,
        sourceLang: "auto",
        context,
        targetType,
        targetId,
        commentId,
        replyId,
      });

      setTranslatedText(data.translatedText || cleanText);
      setIsTranslated(true);
    } catch (err) {
      setError(err?.message || "Translation unavailable");
      setIsTranslated(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WrapperTag
      className={["cw-translatable-text", compact ? "cw-translatable-text--compact" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={wrapperStyle}
    >
      <TextTag
        className={["cw-translated-text", textClassName].filter(Boolean).join(" ")}
        style={textStyle}
      >
        {displayText}
      </TextTag>

      {showTranslate && (
        <button
          type="button"
          className={[
            "cw-translate-btn",
            loading ? "is-loading" : "",
            buttonClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleTranslateClick}
          disabled={loading}
          aria-label={
            isTranslated
              ? "Show original text"
              : `Translate to ${target.label}`
          }
        >
          {loading
            ? "Translating..."
            : isTranslated
            ? "Show original"
            : compact
            ? "Translate"
            : `Translate to ${target.label}`}
        </button>
      )}

      {error && <span className="cw-translate-error">{error}</span>}
    </WrapperTag>
  );
}
