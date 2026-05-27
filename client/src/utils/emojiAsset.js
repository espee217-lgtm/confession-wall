const NOTO_BASE_PATH = "/emoji/noto/svg";

const VARIATION_SELECTOR_16 = 0xfe0f;

export function emojiToNotoCodepoint(emoji) {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0))
    .filter((codePoint) => codePoint && codePoint !== VARIATION_SELECTOR_16)
    .map((codePoint) => codePoint.toString(16).toLowerCase())
    .join("_");
}

export function getNotoEmojiSrc(emoji) {
  const codepoint = emojiToNotoCodepoint(emoji);
  return codepoint ? `${NOTO_BASE_PATH}/emoji_u${codepoint}.svg` : "";
}
