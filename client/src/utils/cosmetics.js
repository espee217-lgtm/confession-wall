export const COSMETIC_META = {
  "badge-sprout-soul": {
    icon: "🌱",
    name: "Sprout Soul",
    type: "badge",
  },
  "badge-moon-whisper": {
    icon: "🌙",
    name: "Moon Whisper",
    type: "badge",
  },
  "badge-forest-crown": {
    icon: "👑",
    name: "Forest Crown",
    type: "badge",
  },

  "frame-vine-glow": {
    icon: "🍃",
    name: "Vine Glow Frame",
    type: "frame",
  },
  "frame-golden-leaf": {
    icon: "🍂",
    name: "Golden Leaf Frame",
    type: "frame",
  },
  "frame-ember-root": {
    icon: "🔥",
    name: "Ember Root Frame",
    type: "frame",
  },

  "title-forest-wanderer": {
    icon: "🌲",
    name: "Forest Wanderer",
    type: "title",
  },
  "title-keeper-of-secrets": {
    icon: "🗝️",
    name: "Keeper of Secrets",
    type: "title",
  },
  "title-grove-guardian": {
    icon: "🛡️",
    name: "Grove Guardian",
    type: "title",
  },

  "post-theme-moonlit-grove": {
    icon: "🌌",
    name: "Moonlit Grove Card",
    type: "postTheme",
  },
  "post-theme-golden-leaves": {
    icon: "✨",
    name: "Golden Leaves Card",
    type: "postTheme",
  },
  "post-theme-scorched-ember": {
    icon: "🪵",
    name: "Scorched Ember Card",
    type: "postTheme",
  },

  "badge-petal-storm": {
    icon: "🌸",
    name: "Petal Storm",
    type: "badge",
    animationClass: "cw-cosmetic-badge-petal-storm",
  },
  "badge-ember-core": {
    icon: "🔥",
    name: "Ember Core",
    type: "badge",
    animationClass: "cw-cosmetic-badge-ember-core",
  },
  "badge-void-sigil": {
    icon: "⚫",
    name: "Void Sigil",
    type: "badge",
    animationClass: "cw-cosmetic-badge-void-sigil",
  },
  "frame-moonveil": {
    icon: "🌙",
    name: "Moonveil Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-moonveil",
  },
  "frame-thornfire": {
    icon: "🥀",
    name: "Thornfire Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-thornfire",
  },
  "frame-celestial": {
    icon: "✨",
    name: "Celestial Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-celestial",
  },
  "title-whisper-grove": {
    icon: "🌿",
    name: "Whisper of the Grove",
    type: "title",
    animationClass: "cw-cosmetic-title-whisper-grove",
  },
  "title-ashen-voice": {
    icon: "💨",
    name: "Ashen Voice",
    type: "title",
    animationClass: "cw-cosmetic-title-ashen-voice",
  },
  "title-eternal-bloom": {
    icon: "🌺",
    name: "Eternal Bloom",
    type: "title",
    animationClass: "cw-cosmetic-title-eternal-bloom",
  },
  "post-theme-dewdrop-card": {
    icon: "💧",
    name: "Dewdrop Card",
    type: "postTheme",
    animationClass: "cw-cosmetic-post-dewdrop",
  },
  "post-theme-scorched-parchment": {
    icon: "📜",
    name: "Scorched Parchment Card",
    type: "postTheme",
    animationClass: "cw-cosmetic-post-scorched-parchment",
  },
  "post-theme-starbound-card": {
    icon: "🌠",
    name: "Starbound Card",
    type: "postTheme",
    animationClass: "cw-cosmetic-post-starbound",
  },
  "frame-storm-eye-rogue": {
    icon: "\u26A1",
    name: "Storm-Eye Rogue Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-storm-eye-rogue",
  },
  "frame-victory-visor": {
    icon: "\uD83C\uDFC1",
    name: "Visor Lift Racer Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-visor-lift-racer",
  },
  "frame-visor-lift-racer": {
    icon: "\uD83C\uDFC1",
    name: "Visor Lift Racer Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-visor-lift-racer",
  },
  "post-theme-moonlit-vengeance": {
    icon: "\uD83C\uDF19",
    name: "Moonlit Vengeance Card",
    type: "postTheme",
    animationClass: "cw-cosmetic-post-moonlit-vengeance",
  },
  "post-theme-spinning-apex-wheel": {
    icon: "\uD83D\uDEDE",
    name: "Spinning Apex Wheel Card",
    type: "postTheme",
    animationClass: "cw-cosmetic-post-spinning-apex-wheel",
  },
  "visual-effect-cursed-violet-aura": {
    icon: "\uD83D\uDD2E",
    name: "Lightning Violet Aura",
    type: "visualEffect",
    animationClass: "cw-cosmetic-visual-effect-cursed-violet-aura",
  },
  "badge-lone-raven": {
    icon: "\uD83D\uDC26\u200D\u2B1B",
    name: "Lone Raven Badge",
    type: "badge",
    animationClass: "cw-cosmetic-badge-lone-raven",
  },
  "badge-redline-rim": {
    icon: "\u25C9",
    name: "Redline Rim Badge",
    type: "badge",
    animationClass: "cw-cosmetic-badge-redline-rim",
  },
  "frame-ashen-horns": {
    icon: "\uD83D\uDD25",
    name: "Ashen Horns Frame",
    type: "frame",
    animationClass: "cw-cosmetic-frame-ashen-horns",
  },
  "post-theme-cinder-throne": {
    icon: "\uD83D\uDD25",
    name: "Cinder Throne Card",
    type: "postTheme",
    animationClass: "cw-cosmetic-post-cinder-throne",
  },
};

/** Shared CSS animation class for shop previews and equipped cosmetics */
export function getCosmeticAnimationClass(cosmeticId) {
  if (!cosmeticId) return "";
  return getCosmeticMeta(cosmeticId)?.animationClass || "";
}

export function getCosmeticMeta(id) {
  if (!id) return null;
  return COSMETIC_META[id] || null;
}

export function getCosmeticName(id) {
  return getCosmeticMeta(id)?.name || "";
}

export function getCosmeticIcon(id) {
  return getCosmeticMeta(id)?.icon || "";
}

export function getDisplayTitle(titleId) {
  const item = getCosmeticMeta(titleId);
  if (!item || item.type !== "title") return "";
  return item.name;
}

export function getBadgeLabel(badgeId) {
  const item = getCosmeticMeta(badgeId);
  if (!item || item.type !== "badge") return null;
  return item;
}

export function getPostThemeStyle(postThemeId, realm = "budding") {
  if (postThemeId === "post-theme-moonlit-grove") {
    return {
      background:
        "linear-gradient(135deg, rgba(18, 36, 72, 0.92), rgba(7, 18, 40, 0.88))",
      border: "1px solid rgba(145, 190, 255, 0.45)",
      boxShadow:
        "0 0 22px rgba(100, 165, 255, 0.24), inset 0 1px 0 rgba(210,230,255,0.08)",
    };
  }

  if (postThemeId === "post-theme-golden-leaves") {
    return {
      background:
        "linear-gradient(135deg, rgba(52, 37, 10, 0.92), rgba(18, 28, 8, 0.9))",
      border: "1px solid rgba(255, 218, 105, 0.46)",
      boxShadow:
        "0 0 24px rgba(255, 205, 75, 0.25), inset 0 1px 0 rgba(255,245,190,0.1)",
    };
  }

  if (postThemeId === "post-theme-scorched-ember") {
    return {
      background:
        "linear-gradient(135deg, rgba(50, 12, 8, 0.94), rgba(16, 6, 4, 0.92))",
      border: "1px solid rgba(255, 106, 72, 0.48)",
      boxShadow:
        "0 0 24px rgba(255, 82, 45, 0.25), inset 0 1px 0 rgba(255,170,120,0.08)",
    };
  }

  if (postThemeId === "post-theme-dewdrop-card") {
    return {
      background:
        "linear-gradient(135deg, rgba(18, 42, 28, 0.92), rgba(8, 24, 16, 0.9))",
      border: "1px solid rgba(140, 220, 165, 0.42)",
      boxShadow:
        "0 0 20px rgba(120, 210, 150, 0.2), inset 0 1px 0 rgba(220,255,235,0.08)",
      position: "relative",
      overflow: "hidden",
    };
  }

  if (postThemeId === "post-theme-scorched-parchment") {
    return {
      background:
        "linear-gradient(135deg, rgba(58, 18, 12, 0.95), rgba(22, 8, 6, 0.93))",
      border: "1px solid rgba(180, 70, 45, 0.5)",
      boxShadow:
        "0 0 22px rgba(200, 60, 30, 0.22), inset 0 1px 0 rgba(255,150,100,0.06)",
      position: "relative",
      overflow: "hidden",
    };
  }

  if (postThemeId === "post-theme-starbound-card") {
    return {
      background:
        "linear-gradient(135deg, rgba(6, 8, 22, 0.97), rgba(2, 4, 12, 0.96))",
      border: "1px solid rgba(100, 90, 200, 0.48)",
      boxShadow:
        "0 0 26px rgba(70, 60, 180, 0.28), inset 0 1px 0 rgba(180,190,255,0.06)",
      position: "relative",
      overflow: "hidden",
    };
  }

  if (postThemeId === "post-theme-moonlit-vengeance") {
    return {
      background:
        "linear-gradient(145deg, rgba(4, 6, 18, 0.97), rgba(9, 8, 24, 0.96))",
      border: "1px solid rgba(196, 200, 215, 0.48)",
      boxShadow:
        "0 0 28px rgba(104, 86, 188, 0.2), inset 0 1px 0 rgba(230,235,255,0.06)",
      position: "relative",
      overflow: "hidden",
    };
  }

  if (postThemeId === "post-theme-spinning-apex-wheel") {
    return {
      background:
        "linear-gradient(148deg, rgba(7, 14, 28, 0.88), rgba(8, 16, 30, 0.78), rgba(4, 8, 16, 0.9))",
      border: "1px solid rgba(164, 198, 255, 0.2)",
      boxShadow:
        "0 14px 34px rgba(0, 0, 0, 0.28), 0 0 30px rgba(44, 104, 220, 0.1), inset 0 1px 0 rgba(228, 240, 255, 0.18), inset 0 -24px 40px rgba(2, 6, 14, 0.34)",
      position: "relative",
      overflow: "hidden",
      isolation: "isolate",
    };
  }

  if (postThemeId === "post-theme-cinder-throne") {
    return {
      background:
        "linear-gradient(145deg, rgba(14, 6, 7, 0.97), rgba(32, 10, 10, 0.95))",
      border: "1px solid rgba(214, 84, 66, 0.52)",
      boxShadow:
        "0 0 30px rgba(174, 56, 42, 0.24), inset 0 1px 0 rgba(255, 150, 120, 0.06)",
      position: "relative",
      overflow: "hidden",
    };
  }

  return {};
}
