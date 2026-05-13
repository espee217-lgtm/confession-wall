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
};

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

  return {};
}