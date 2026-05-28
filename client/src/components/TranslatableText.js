import React, { useEffect, useMemo, useState } from "react";
import { requestTranslation } from "../utils/translateApi";
import { getPreferredTranslateTarget } from "../utils/translateTarget";

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
  const target = useMemo(() => getPreferredTranslateTarget(), []);
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanText = String(text || "").trim();

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
  const showTranslate = target.shouldShowTranslate;

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
