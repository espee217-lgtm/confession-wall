const fs = require("fs");
const path = require("path");

const homePath = path.join(process.cwd(), "client", "src", "pages", "Home.js");

if (!fs.existsSync(homePath)) {
  console.error("Could not find client/src/pages/Home.js. Run this from your project root.");
  process.exit(1);
}

let text = fs.readFileSync(homePath, "utf8");
let changed = false;

function replaceOnce(find, replace, label) {
  if (text.includes(replace)) return;
  if (!text.includes(find)) {
    console.warn(`Skipped ${label}: target text not found.`);
    return;
  }
  text = text.replace(find, replace);
  changed = true;
  console.log(`Patched ${label}`);
}

function insertAfter(find, insert, label) {
  if (text.includes(insert.trim().slice(0, 80))) return;
  if (!text.includes(find)) {
    console.warn(`Skipped ${label}: target text not found.`);
    return;
  }
  text = text.replace(find, find + insert);
  changed = true;
  console.log(`Patched ${label}`);
}

const emojiFeatureBlock = `
const POST_EMOJI_GROUPS = [
  {
    label: "mood",
    emojis: ["😭", "😂", "💀", "🥲", "😔", "🥹", "😳", "😤", "😩", "😌", "😎", "🤧", "😐", "😶", "😬", "🙄"],
  },
  {
    label: "love",
    emojis: ["❤️", "🫶", "💕", "💖", "💗", "💘", "💔", "🥰", "😘", "🤍", "🖤", "💚", "💛", "💜", "💙", "🩷"],
  },
  {
    label: "chaos",
    emojis: ["🔥", "✨", "👀", "🙏", "🙃", "🫠", "🤡", "😈", "😵‍💫", "🤭", "😮‍💨", "🫡", "💅", "🚩", "🫢", "😱"],
  },
  {
    label: "forest",
    emojis: ["🌱", "🌿", "🍃", "🌳", "🌸", "🌼", "🌙", "⭐", "🌧️", "🍂", "🪷", "🦋", "🌻", "🍀", "🌾", "🕊️"],
  },
  {
    label: "hands",
    emojis: ["👍", "👎", "👏", "🤝", "🙌", "🤌", "✌️", "🤞", "🫰", "☝️", "👋", "🫵", "🙏", "💪", "🫱", "🫲"],
  },
  {
    label: "faces",
    emojis: ["😀", "😁", "😅", "🤣", "🙂", "😉", "😍", "😋", "🤔", "🤫", "😴", "😇", "😏", "😒", "😢", "😡"],
  },
];

function PostEmojiPicker({ onEmoji, compact = false }) {
  return (
    <div
      data-ui="true"
      style={{
        position: "absolute",
        left: compact ? "50%" : 0,
        bottom: "48px",
        transform: compact ? "translateX(-50%)" : "none",
        width: compact ? "min(330px, calc(100vw - 30px))" : "min(360px, calc(100vw - 42px))",
        maxHeight: compact ? "min(300px, calc(100vh - 170px))" : "min(330px, calc(100vh - 190px))",
        overflowY: "auto",
        overscrollBehavior: "contain",
        padding: "12px 8px 12px 12px",
        borderRadius: "18px",
        border: "1px solid rgba(170, 255, 130, 0.18)",
        background: "rgba(5, 18, 8, 0.96)",
        boxShadow:
          "0 18px 60px rgba(0,0,0,0.45), 0 0 30px rgba(135, 255, 100, 0.10), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        zIndex: 9999,
      }}
    >
      {POST_EMOJI_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: "10px" }}>
          <div
            style={{
              marginBottom: "6px",
              fontSize: "9px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(215, 255, 185, 0.65)",
              fontWeight: 800,
            }}
          >
            {group.label}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "repeat(7, 1fr)" : "repeat(8, 1fr)",
              gap: "5px",
            }}
          >
            {group.emojis.map((emoji) => (
              <button
                key={group.label + "-" + emoji}
                type="button"
                onClick={() => onEmoji(emoji)}
                style={{
                  width: "30px",
                  height: "30px",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "11px",
                  border: "1px solid rgba(170, 255, 130, 0.14)",
                  background: "rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  fontSize: "17px",
                  lineHeight: 1,
                  transition: "transform 150ms ease, background 150ms ease, box-shadow 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.08)";
                  e.currentTarget.style.background = "rgba(165, 255, 105, 0.14)";
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(165, 255, 105, 0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

`;

if (!text.includes("const POST_EMOJI_GROUPS = [")) {
  insertAfter('const SCORCHED_URL = `${API_BASE}/api/confessions/realm/scorched`;\n', emojiFeatureBlock, "emoji constants and picker");
}

replaceOnce(
`function MobileHomePage({
  user,
  freshPosts,
  navigate,
  showCompose,
  setShowCompose,
  message,
  setMessage,
  image,
  setImage,
  imagePreview,
  setImagePreview,
  loading,
  handleImageChange,
  handleSubmit,
}) {`,
`function MobileHomePage({
  user,
  freshPosts,
  navigate,
  showCompose,
  setShowCompose,
  message,
  setMessage,
  image,
  setImage,
  imagePreview,
  setImagePreview,
  loading,
  handleImageChange,
  handleSubmit,
  showPostEmojiPicker,
  setShowPostEmojiPicker,
  insertPostEmoji,
  postInputRef,
}) {`,
"MobileHomePage props"
);

replaceOnce(
`            <textarea
              placeholder="write it here..."
              value={message}`,
`            <textarea
              ref={postInputRef}
              placeholder="write it here..."
              value={message}`,
"mobile textarea ref"
);

replaceOnce(
`            <div className="mobile-compose-actions">
              <label>
                ⌘ image`,
`            <div className="mobile-compose-actions" style={{ position: "relative" }}>
              <div style={{ position: "relative", display: "inline-flex" }}>
                <button
                  type="button"
                  onClick={() => setShowPostEmojiPicker((open) => !open)}
                  style={{
                    border: "1px solid rgba(170,255,130,0.18)",
                    borderRadius: "999px",
                    background: showPostEmojiPicker ? "rgba(145,255,94,0.13)" : "rgba(255,255,255,0.05)",
                    color: "#dfffbd",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "7px 12px",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  😊
                </button>
                {showPostEmojiPicker && <PostEmojiPicker onEmoji={insertPostEmoji} compact />}
              </div>

              <label>
                ⌘ image`,
"mobile emoji button"
);

replaceOnce(
`  const [imagePreview, setImagePreview] = useState(null);
  const [muted, setMuted] = useState(true);`,
`  const [imagePreview, setImagePreview] = useState(null);
  const [showPostEmojiPicker, setShowPostEmojiPicker] = useState(false);
  const postInputRef = useRef(null);
  const [muted, setMuted] = useState(true);`,
"Home emoji state"
);

if (!text.includes("const insertPostEmoji = (emoji) => {")) {
  insertAfter(
`}, [muted]);

`,
`  const insertPostEmoji = (emoji) => {
    const input = postInputRef.current;

    if (!input) {
      setMessage((prev) => \`\${prev}\${emoji}\`);
      return;
    }

    const start = input.selectionStart ?? message.length;
    const end = input.selectionEnd ?? message.length;

    setMessage((prev) => {
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      return \`\${before}\${emoji}\${after}\`;
    });

    window.setTimeout(() => {
      input.focus();
      const nextPosition = start + emoji.length;
      input.setSelectionRange(nextPosition, nextPosition);
    }, 0);
  };

`,
"insertPostEmoji handler"
  );
}

replaceOnce(
`      setImagePreview(null);
      setShowCompose(false);`,
`      setImagePreview(null);
      setShowPostEmojiPicker(false);
      setShowCompose(false);`,
"close emoji picker after submit"
);

replaceOnce(
`        handleImageChange={handleImageChange}
        handleSubmit={handleSubmit}
      />`,
`        handleImageChange={handleImageChange}
        handleSubmit={handleSubmit}
        showPostEmojiPicker={showPostEmojiPicker}
        setShowPostEmojiPicker={setShowPostEmojiPicker}
        insertPostEmoji={insertPostEmoji}
        postInputRef={postInputRef}
      />`,
"MobileHomePage emoji props"
);

replaceOnce(
`</div>

      <SpiritNavigation`,
`</div>

      <button
        data-ui="true"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowCompose(true);
        }}
        title="Plant a confession"
        style={{
          position: "fixed",
          left: "50%",
          top: "42%",
          transform: "translate(-50%, -50%)",
          zIndex: 360,
          width: "54px",
          height: "54px",
          borderRadius: "999px",
          border: "1px solid rgba(230, 255, 165, 0.42)",
          background:
            "radial-gradient(circle at 35% 28%, rgba(255,255,220,0.95), transparent 18%), linear-gradient(135deg, rgba(218,255,123,0.96), rgba(85,190,49,0.72))",
          color: "#102404",
          fontSize: "34px",
          fontWeight: 900,
          lineHeight: 1,
          cursor: "pointer",
          boxShadow:
            "0 0 22px rgba(195,255,100,0.45), 0 0 55px rgba(120,255,80,0.22), 0 16px 42px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.65)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)";
          e.currentTarget.style.boxShadow =
            "0 0 28px rgba(230,255,140,0.62), 0 0 70px rgba(120,255,80,0.30), 0 18px 46px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.72)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translate(-50%, -50%)";
          e.currentTarget.style.boxShadow =
            "0 0 22px rgba(195,255,100,0.45), 0 0 55px rgba(120,255,80,0.22), 0 16px 42px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.65)";
        }}
      >
        +
      </button>

      <SpiritNavigation`,
"desktop floating plus"
);

replaceOnce(
`            <textarea
              placeholder="what do you need to confess?"
              value={message}`,
`            <textarea
              ref={postInputRef}
              placeholder="what do you need to confess?"
              value={message}`,
"desktop textarea ref"
);

replaceOnce(
`            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <label
                style={{
                  color: "rgba(255,255,220,0.5)",`,
`            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", gap: "10px", position: "relative" }}>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowPostEmojiPicker((open) => !open)}
                  style={{
                    width: "38px",
                    height: "38px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "999px",
                    border: showPostEmojiPicker
                      ? "1px solid rgba(185, 255, 135, 0.34)"
                      : "1px solid rgba(185, 255, 135, 0.18)",
                    background: showPostEmojiPicker
                      ? "rgba(145, 255, 94, 0.13)"
                      : "rgba(8, 24, 10, 0.38)",
                    color: "#dfffbd",
                    cursor: "pointer",
                    fontSize: "17px",
                    boxShadow: showPostEmojiPicker
                      ? "0 0 22px rgba(150, 255, 100, 0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
                      : "0 0 18px rgba(150, 255, 100, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                  title="Add emoji"
                >
                  😊
                </button>

                {showPostEmojiPicker && <PostEmojiPicker onEmoji={insertPostEmoji} />}
              </div>

              <label
                style={{
                  color: "rgba(255,255,220,0.5)",`,
"desktop emoji button"
);

fs.writeFileSync(homePath, text, "utf8");
console.log(changed ? "Home.js patch applied." : "No changes needed; Home.js already looked patched.");
