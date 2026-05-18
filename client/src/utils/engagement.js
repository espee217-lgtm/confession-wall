export const CONFESSION_MOODS = [
  "Hopeful",
  "Heavy",
  "Angry",
  "Lonely",
  "Love",
  "Regret",
  "Funny",
  "Grateful",
  "Lost",
  "Healing",
];

export const COMFORT_CARD_OPTIONS = [
  "I hear you.",
  "You are not alone.",
  "This pain matters.",
  "Sending strength.",
  "You survived this.",
  "May your heart feel lighter.",
];

export const WHISPER_PROMPTS = [
  "What are you afraid to say out loud?",
  "What did you survive quietly?",
  "What do you wish someone understood?",
  "What are you still carrying?",
  "What would you say if nobody judged you?",
  "What memory still follows you?",
  "What truth feels too heavy today?",
  "What small hope are you protecting?",
];

export const FOREST_EVENTS = [
  {
    id: "moonlit-week",
    name: "Moonlit Week",
    description: "Confessions under the quiet moon feel a little lighter.",
    label: "moonlit",
    accent: "#cfd7ff",
    border: "rgba(188, 199, 255, 0.36)",
    background:
      "linear-gradient(135deg, rgba(16, 21, 44, 0.92), rgba(8, 14, 28, 0.88))",
  },
  {
    id: "rainy-grove",
    name: "Rainy Grove",
    description: "A soft rain falls over the Grove. Let something out.",
    label: "rain-kissed",
    accent: "#9ff2d0",
    border: "rgba(132, 232, 190, 0.34)",
    background:
      "linear-gradient(135deg, rgba(8, 34, 24, 0.92), rgba(6, 22, 18, 0.9))",
  },
  {
    id: "scorched-trial",
    name: "Scorched Trial",
    description: "For the confessions that burn but still need to be spoken.",
    label: "ember-marked",
    accent: "#ffb59f",
    border: "rgba(255, 144, 110, 0.34)",
    background:
      "linear-gradient(135deg, rgba(44, 16, 12, 0.92), rgba(26, 9, 8, 0.9))",
  },
];

const MOOD_TONES = {
  Hopeful: {
    color: "#d9ffe7",
    border: "rgba(158, 247, 195, 0.34)",
    background: "rgba(56, 126, 88, 0.18)",
  },
  Heavy: {
    color: "#e9defa",
    border: "rgba(166, 148, 214, 0.34)",
    background: "rgba(76, 62, 118, 0.18)",
  },
  Angry: {
    color: "#ffd8d1",
    border: "rgba(255, 134, 110, 0.34)",
    background: "rgba(122, 38, 28, 0.18)",
  },
  Lonely: {
    color: "#dbe4ff",
    border: "rgba(160, 182, 255, 0.34)",
    background: "rgba(58, 72, 126, 0.18)",
  },
  Love: {
    color: "#ffe0ea",
    border: "rgba(255, 154, 194, 0.34)",
    background: "rgba(128, 44, 82, 0.18)",
  },
  Regret: {
    color: "#ffe6d1",
    border: "rgba(231, 171, 120, 0.34)",
    background: "rgba(120, 78, 28, 0.18)",
  },
  Funny: {
    color: "#fff1bf",
    border: "rgba(255, 214, 103, 0.34)",
    background: "rgba(126, 102, 20, 0.18)",
  },
  Grateful: {
    color: "#e2ffcf",
    border: "rgba(173, 233, 122, 0.34)",
    background: "rgba(80, 124, 28, 0.18)",
  },
  Lost: {
    color: "#e8e2ff",
    border: "rgba(178, 160, 232, 0.34)",
    background: "rgba(74, 58, 116, 0.18)",
  },
  Healing: {
    color: "#d8fff7",
    border: "rgba(140, 240, 226, 0.34)",
    background: "rgba(34, 112, 98, 0.18)",
  },
};

export function getCurrentForestEvent(date = new Date()) {
  const anchorUtc = Date.UTC(2026, 0, 5);
  const currentUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const diffWeeks = Math.floor((currentUtc - anchorUtc) / (7 * 24 * 60 * 60 * 1000));
  const index =
    ((diffWeeks % FOREST_EVENTS.length) + FOREST_EVENTS.length) %
    FOREST_EVENTS.length;

  return FOREST_EVENTS[index];
}

export function getWeeklyForestWindow(date = new Date()) {
  const anchorUtc = Date.UTC(2026, 0, 5);
  const currentUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const diffWeeks = Math.floor((currentUtc - anchorUtc) / (7 * 24 * 60 * 60 * 1000));
  const startsAt = new Date(anchorUtc + diffWeeks * 7 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const event = getCurrentForestEvent(date);

  return {
    ...event,
    weekKey: `${event.id}:${startsAt.toISOString().slice(0, 10)}`,
    startsAt,
    endsAt,
  };
}

export function getActiveTemporaryCosmeticOverride(userLike, now = Date.now()) {
  const override = userLike?.temporaryCosmeticOverride;
  const expiresAt = override?.expiresAt ? new Date(override.expiresAt).getTime() : 0;

  if (!override?.source || !expiresAt || Number.isNaN(expiresAt) || expiresAt <= now) {
    return null;
  }

  return override;
}

export function getDisplayCosmetics(userLike, fallbackEquipped = null) {
  const baseEquipped = fallbackEquipped || userLike?.equippedCosmetics || {};
  const activeOverride = getActiveTemporaryCosmeticOverride(userLike);

  if (!activeOverride) {
    return baseEquipped;
  }

  return {
    ...baseEquipped,
    frame: activeOverride.frameId || baseEquipped.frame || "",
    postTheme: activeOverride.postThemeId || baseEquipped.postTheme || "",
  };
}

export function getMoodChipStyle(mood) {
  const tone = MOOD_TONES[mood];

  if (!tone) {
    return null;
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "999px",
    border: `1px solid ${tone.border}`,
    background: tone.background,
    color: tone.color,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.04em",
  };
}

export function getOwnedPostThemeIds(user) {
  const ownedIds = Array.isArray(user?.ownedCosmetics)
    ? user.ownedCosmetics
        .map((owned) => (typeof owned === "string" ? owned : owned?.itemId))
        .filter(Boolean)
    : [];

  return ownedIds.filter((id) => String(id).startsWith("post-theme-"));
}

export function getSavedConfessionIdSet(user) {
  return new Set(
    (Array.isArray(user?.savedConfessions) ? user.savedConfessions : []).map((id) =>
      String(id)
    )
  );
}

export function getConfessionThemeId(
  confession,
  fallbackEquipped = {},
  userLike = null
) {
  const activeOverride = getActiveTemporaryCosmeticOverride(userLike);

  if (activeOverride?.postThemeId) {
    return String(activeOverride.postThemeId).trim();
  }

  return (
    String(confession?.postTheme || "").trim() ||
    String(fallbackEquipped?.postTheme || "").trim() ||
    ""
  );
}

export function getComfortCardSummary(cards = []) {
  return cards
    .filter((card) => card?.text && Number(card?.count) > 0)
    .map((card) => ({
      text: card.text,
      count: Number(card.count) || 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getPollTotalVotes(poll) {
  if (!poll?.options || !Array.isArray(poll.options)) {
    return 0;
  }

  return poll.options.reduce((sum, option) => sum + (Number(option?.votes) || 0), 0);
}

export function getRealmKeyFromReactions(wateredBy = [], burnedBy = []) {
  const watered = wateredBy?.length || 0;
  const burned = burnedBy?.length || 0;

  if (watered === burned) return "budding";
  return watered > burned ? "grove" : "scorched";
}
