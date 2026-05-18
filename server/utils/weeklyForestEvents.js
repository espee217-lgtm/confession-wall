const Confession = require("../models/Confession");
const User = require("../models/User");
const { awardSeeds } = require("./seedRewards");

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WEEKLY_EVENT_ANCHOR_UTC = Date.UTC(2026, 0, 5);
const USER_PUBLIC_SELECT =
  "username profilePicture isAdmin role equippedCosmetics temporaryCosmeticOverride";

const WEEKLY_EVENT_REWARD_SEEDS = 1000;
const WEEKLY_OVERRIDE_DURATION_DAYS = 7;
const MOST_WATERED_REWARD_TYPE = "most_watered_seeds";
const MOST_BURNED_OVERRIDE_TYPE = "most_burned_override";
const WEEKLY_OVERRIDE_FRAME_ID = "frame-ashen-horns";
const WEEKLY_OVERRIDE_POST_THEME_ID = "post-theme-cinder-throne";
const WEEKLY_AUTOMATION_INTERVAL_MS = 15 * 60 * 1000;
const WEEKLY_MAINTENANCE_THROTTLE_MS = 5 * 60 * 1000;
const FINALIZATION_MODE = "automatic_background_finalization";
const TRACKING_MODE = "confessions_created_in_current_week_only";

const EMPTY_TEMPORARY_OVERRIDE = {
  source: "",
  frameId: "",
  postThemeId: "",
  grantedAt: null,
  expiresAt: null,
  eventKey: "",
  weekKey: "",
};

let maintenancePromise = null;
let lastMaintenanceCompletedAtMs = 0;
let automationInterval = null;

const FOREST_EVENTS = [
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

const getUtcDayStartMs = (date = new Date()) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const getWeekDiff = (date = new Date()) =>
  Math.floor((getUtcDayStartMs(date) - WEEKLY_EVENT_ANCHOR_UTC) / WEEK_MS);

const toIsoDate = (date) => new Date(date).toISOString().slice(0, 10);

function buildEventPeriod(diffWeeks) {
  const index =
    ((diffWeeks % FOREST_EVENTS.length) + FOREST_EVENTS.length) %
    FOREST_EVENTS.length;
  const startsAtMs = WEEKLY_EVENT_ANCHOR_UTC + diffWeeks * WEEK_MS;
  const startsAt = new Date(startsAtMs);
  const endsAt = new Date(startsAtMs + WEEK_MS);
  const event = FOREST_EVENTS[index];

  return {
    ...event,
    cycleIndex: index,
    startsAt,
    endsAt,
    weekKey: `${event.id}:${toIsoDate(startsAt)}`,
  };
}

function getCurrentWeeklyEventContext(date = new Date()) {
  return buildEventPeriod(getWeekDiff(date));
}

function getUpcomingForestEvents(date = new Date(), count = 4) {
  const currentDiff = getWeekDiff(date);

  return Array.from({ length: count }, (_, offset) =>
    buildEventPeriod(currentDiff + offset)
  ).map((event) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    label: event.label,
    weekKey: event.weekKey,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  }));
}

function getCompletedWeeklyEventContexts(date = new Date()) {
  const currentDiff = getWeekDiff(date);

  if (currentDiff <= 0) {
    return [];
  }

  return Array.from({ length: currentDiff }, (_, diff) => buildEventPeriod(diff));
}

function pickLeader(confessions, reactionKey) {
  const ranked = confessions
    .slice()
    .sort((a, b) => {
      const aCount = Array.isArray(a?.[reactionKey]) ? a[reactionKey].length : 0;
      const bCount = Array.isArray(b?.[reactionKey]) ? b[reactionKey].length : 0;

      if (bCount !== aCount) return bCount - aCount;

      const aCreated = new Date(a?.createdAt || 0).getTime();
      const bCreated = new Date(b?.createdAt || 0).getTime();

      if (aCreated !== bCreated) return aCreated - bCreated;

      return String(a?._id || "").localeCompare(String(b?._id || ""));
    });

  const leader = ranked[0] || null;

  if (!leader) return null;

  const leaderCount = Array.isArray(leader?.[reactionKey])
    ? leader[reactionKey].length
    : 0;

  return leaderCount > 0 ? leader : null;
}

function serializeLeadConfession(confession) {
  if (!confession) return null;

  return {
    _id: confession._id,
    message: confession.message,
    image: confession.image || "",
    mood: confession.mood || "",
    postTheme: confession.postTheme || "",
    createdAt: confession.createdAt,
    wateredCount: Array.isArray(confession.wateredBy)
      ? confession.wateredBy.length
      : 0,
    burnedCount: Array.isArray(confession.burnedBy)
      ? confession.burnedBy.length
      : 0,
    userId: confession.userId
      ? {
          _id: confession.userId._id,
          username: confession.userId.username,
          profilePicture: confession.userId.profilePicture || null,
          isAdmin: confession.userId.isAdmin || false,
          role: confession.userId.role || "user",
          equippedCosmetics: confession.userId.equippedCosmetics || {},
          temporaryCosmeticOverride:
            confession.userId.temporaryCosmeticOverride || {},
        }
      : null,
  };
}

async function findWeeklyRewardRecord(weekKey, type) {
  const user = await User.findOne({
    weeklyRewards: { $elemMatch: { weekKey, type } },
  }).select("username profilePicture temporaryCosmeticOverride weeklyRewards");

  if (!user) {
    return null;
  }

  const entry = (user.weeklyRewards || []).find(
    (reward) => reward.weekKey === weekKey && reward.type === type
  );

  if (!entry) {
    return null;
  }

  return { user, entry };
}

function serializeRewardRecord(record) {
  if (!record) {
    return {
      granted: false,
      username: "",
      userId: null,
      confessionId: null,
      grantedAt: null,
      expiresAt: null,
    };
  }

  return {
    granted: true,
    username: record.user?.username || "",
    userId: record.user?._id || null,
    confessionId: record.entry?.confessionId || null,
    grantedAt: record.entry?.grantedAt || null,
    expiresAt: record.entry?.expiresAt || null,
  };
}

async function computeWeeklyLeaderboard(date = new Date()) {
  const context = getCurrentWeeklyEventContext(date);
  return computeWeeklyLeaderboardForContext(context);
}

async function computeWeeklyLeaderboardForContext(context) {
  const confessions = await Confession.find({
    createdAt: {
      $gte: context.startsAt,
      $lt: context.endsAt,
    },
  })
    .sort({ createdAt: 1 })
    .populate("userId", USER_PUBLIC_SELECT);

  return {
    context,
    confessions,
    mostWatered: pickLeader(confessions, "wateredBy"),
    mostBurned: pickLeader(confessions, "burnedBy"),
  };
}

async function clearExpiredTemporaryOverrides(date = new Date()) {
  const result = await User.updateMany(
    {
      "temporaryCosmeticOverride.expiresAt": {
        $ne: null,
        $lte: date,
      },
    },
    {
      $set: {
        temporaryCosmeticOverride: EMPTY_TEMPORARY_OVERRIDE,
      },
    }
  );

  return result?.modifiedCount || 0;
}

async function getWeeklyEventStatus(date = new Date()) {
  const { context, confessions, mostWatered, mostBurned } =
    await computeWeeklyLeaderboard(date);

  const [wateredReward, burnedReward] = await Promise.all([
    findWeeklyRewardRecord(context.weekKey, MOST_WATERED_REWARD_TYPE),
    findWeeklyRewardRecord(context.weekKey, MOST_BURNED_OVERRIDE_TYPE),
  ]);

  return {
    currentEvent: {
      id: context.id,
      name: context.name,
      description: context.description,
      label: context.label,
      accent: context.accent,
      border: context.border,
      background: context.background,
      weekKey: context.weekKey,
      startsAt: context.startsAt,
      endsAt: context.endsAt,
    },
    trackingMode: TRACKING_MODE,
    reactionTimingExact: false,
    finalizationMode: FINALIZATION_MODE,
    candidateCount: confessions.length,
    leaderboard: {
      mostWateredPost: serializeLeadConfession(mostWatered),
      mostBurnedPost: serializeLeadConfession(mostBurned),
    },
    rewards: {
      mostWateredSeeds: {
        amount: WEEKLY_EVENT_REWARD_SEEDS,
        ...serializeRewardRecord(wateredReward),
      },
      mostBurnedOverride: {
        frameId: WEEKLY_OVERRIDE_FRAME_ID,
        postThemeId: WEEKLY_OVERRIDE_POST_THEME_ID,
        durationDays: WEEKLY_OVERRIDE_DURATION_DAYS,
        applied: Boolean(burnedReward),
        ...serializeRewardRecord(burnedReward),
      },
    },
    upcomingEvents: getUpcomingForestEvents(date, 4),
  };
}

async function finalizeWeeklyEventPeriod(
  context,
  { appliedAt = new Date() } = {}
) {
  const { mostWatered, mostBurned } = await computeWeeklyLeaderboardForContext(
    context
  );
  const finalizedAt = new Date(appliedAt);
  const expiresAt = new Date(
    context.endsAt.getTime() + WEEKLY_OVERRIDE_DURATION_DAYS * DAY_MS
  );

  const outcome = {
    weekKey: context.weekKey,
    eventKey: context.id,
    mostWateredSeeds: {
      candidateConfessionId: mostWatered?._id || null,
      candidateUserId: mostWatered?.userId?._id || null,
      granted: false,
      skippedReason: "",
    },
    mostBurnedOverride: {
      candidateConfessionId: mostBurned?._id || null,
      candidateUserId: mostBurned?.userId?._id || null,
      applied: false,
      skippedReason: "",
      expiresAt: null,
    },
  };

  const existingWateredReward = await findWeeklyRewardRecord(
    context.weekKey,
    MOST_WATERED_REWARD_TYPE
  );

  if (!mostWatered?.userId?._id) {
    outcome.mostWateredSeeds.skippedReason = "No watered leader for this week yet.";
  } else if (existingWateredReward) {
    outcome.mostWateredSeeds.skippedReason =
      "Most watered Seeds reward was already granted for this week.";
  } else {
    const seedReward = await awardSeeds({
      userId: mostWatered.userId._id,
      reason: "weekly_event_most_watered",
      amount: WEEKLY_EVENT_REWARD_SEEDS,
      reasonLabel: `${context.name} most watered post`,
      link: `/confession/${mostWatered._id}`,
    });

    if (seedReward?.awarded) {
      const winner = await User.findById(mostWatered.userId._id);

      if (winner) {
        winner.weeklyRewards.push({
          weekKey: context.weekKey,
          eventKey: context.id,
          type: MOST_WATERED_REWARD_TYPE,
          confessionId: mostWatered._id,
          grantedAt: finalizedAt,
        });
        await winner.save();
        outcome.mostWateredSeeds.granted = true;
      } else {
        outcome.mostWateredSeeds.skippedReason =
          "Watered winner could not be found when saving reward metadata.";
      }
    } else {
      outcome.mostWateredSeeds.skippedReason =
        seedReward?.message || "Could not grant the weekly Seed reward.";
    }
  }

  const existingBurnedOverride = await findWeeklyRewardRecord(
    context.weekKey,
    MOST_BURNED_OVERRIDE_TYPE
  );

  if (!mostBurned?.userId?._id) {
    outcome.mostBurnedOverride.skippedReason =
      "No burned leader for this week yet.";
  } else if (existingBurnedOverride) {
    outcome.mostBurnedOverride.skippedReason =
      "Most burned override was already applied for this week.";
    outcome.mostBurnedOverride.expiresAt =
      existingBurnedOverride.entry?.expiresAt || null;
  } else {
    const winner = await User.findById(mostBurned.userId._id);

    if (!winner) {
      outcome.mostBurnedOverride.skippedReason =
        "Burned winner could not be found.";
    } else {
      if (expiresAt > finalizedAt) {
        winner.temporaryCosmeticOverride = {
          source: "weekly_most_burned",
          frameId: WEEKLY_OVERRIDE_FRAME_ID,
          postThemeId: WEEKLY_OVERRIDE_POST_THEME_ID,
          grantedAt: finalizedAt,
          expiresAt,
          eventKey: context.id,
          weekKey: context.weekKey,
        };
      }

      winner.weeklyRewards.push({
        weekKey: context.weekKey,
        eventKey: context.id,
        type: MOST_BURNED_OVERRIDE_TYPE,
        confessionId: mostBurned._id,
        grantedAt: finalizedAt,
        expiresAt,
      });

      await winner.save();
      outcome.mostBurnedOverride.applied = expiresAt > finalizedAt;
      outcome.mostBurnedOverride.expiresAt = expiresAt;

      if (expiresAt <= finalizedAt) {
        outcome.mostBurnedOverride.skippedReason =
          "The weekly override window already expired before maintenance ran.";
      }
    }
  }

  return outcome;
}

async function runWeeklyEventMaintenance({ date = new Date() } = {}) {
  const maintenanceAt = new Date(date);
  const completedContexts = getCompletedWeeklyEventContexts(maintenanceAt);
  const finalizedWeeks = [];
  const clearedExpiredOverrides = await clearExpiredTemporaryOverrides(
    maintenanceAt
  );

  for (const context of completedContexts) {
    const [wateredReward, burnedReward] = await Promise.all([
      findWeeklyRewardRecord(context.weekKey, MOST_WATERED_REWARD_TYPE),
      findWeeklyRewardRecord(context.weekKey, MOST_BURNED_OVERRIDE_TYPE),
    ]);

    if (wateredReward && burnedReward) {
      continue;
    }

    const finalizeResults = await finalizeWeeklyEventPeriod(context, {
      appliedAt: maintenanceAt,
    });

    finalizedWeeks.push({
      weekKey: context.weekKey,
      eventKey: context.id,
      finalizeResults,
    });
  }

  return {
    ranAt: maintenanceAt,
    clearedExpiredOverrides,
    finalizedWeeks,
  };
}

async function ensureWeeklyEventMaintenance({
  force = false,
  date = new Date(),
} = {}) {
  const nowMs = Date.now();

  if (maintenancePromise) {
    return maintenancePromise;
  }

  if (
    !force &&
    lastMaintenanceCompletedAtMs &&
    nowMs - lastMaintenanceCompletedAtMs < WEEKLY_MAINTENANCE_THROTTLE_MS
  ) {
    return null;
  }

  maintenancePromise = (async () => {
    try {
      const result = await runWeeklyEventMaintenance({ date });
      lastMaintenanceCompletedAtMs = Date.now();
      return result;
    } finally {
      maintenancePromise = null;
    }
  })();

  return maintenancePromise;
}

function startWeeklyEventAutomation({
  intervalMs = WEEKLY_AUTOMATION_INTERVAL_MS,
} = {}) {
  if (automationInterval) {
    return automationInterval;
  }

  const runMaintenance = async () => {
    try {
      await ensureWeeklyEventMaintenance({ force: true });
    } catch (err) {
      console.error("Weekly event maintenance error:", err.message);
    }
  };

  void runMaintenance();

  automationInterval = setInterval(() => {
    void runMaintenance();
  }, intervalMs);

  if (typeof automationInterval.unref === "function") {
    automationInterval.unref();
  }

  return automationInterval;
}

async function finalizeCurrentWeeklyResults(date = new Date()) {
  const maintenance = await ensureWeeklyEventMaintenance({
    force: true,
    date,
  });

  return {
    ...(await getWeeklyEventStatus(date)),
    maintenance:
      maintenance || {
        ranAt: new Date(date),
        clearedExpiredOverrides: 0,
        finalizedWeeks: [],
      },
  };
}

module.exports = {
  FOREST_EVENTS,
  TRACKING_MODE,
  FINALIZATION_MODE,
  WEEKLY_EVENT_REWARD_SEEDS,
  WEEKLY_OVERRIDE_DURATION_DAYS,
  WEEKLY_OVERRIDE_FRAME_ID,
  WEEKLY_OVERRIDE_POST_THEME_ID,
  USER_PUBLIC_SELECT,
  getCurrentWeeklyEventContext,
  getUpcomingForestEvents,
  getWeeklyEventStatus,
  ensureWeeklyEventMaintenance,
  runWeeklyEventMaintenance,
  startWeeklyEventAutomation,
  finalizeCurrentWeeklyResults,
};
