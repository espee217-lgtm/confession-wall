import React, { useMemo, useState } from "react";
import { getNotoEmojiSrc } from "../utils/emojiAsset";

function EmojiIcon({ emoji, className = "", size = 22, title }) {
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => getNotoEmojiSrc(emoji), [emoji]);

  if (failed || !src) {
    return (
      <span className={`cw-noto-emoji-fallback ${className}`} aria-hidden="true">
        {emoji}
      </span>
    );
  }

  return (
    <img
      className={`cw-noto-emoji ${className}`}
      src={src}
      alt=""
      title={title || emoji}
      aria-hidden="true"
      draggable="false"
      loading="lazy"
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  );
}

export default EmojiIcon;
