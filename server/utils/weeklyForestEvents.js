const Confession = require("../models/Confession");
const Notification = require("../models/Notification");
const User = require("../models/User");
const WeeklyEventCycle = require("../models/WeeklyEventCycle");
const { awardSeeds } = require("./seedRewards");

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const COMPETITION_DURATION_DAYS = 2;
const RESULT_DURATION_DAYS = 7;
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
const FINALIZATION_MODE = "automatic_wednesday_finalization";
const TRACKING_MODE =
  "confessions_created_during_monday_tuesday_window_with_reaction_milestones";

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

const toIsoDate = (date) => new Date(date).toISOString().slice(0, 10);

const getWeekDiff = (date = new Date()) =>
  Math.floor((getUtcDayStartMs(date) - WEEKLY_EVENT_ANCHOR_UTC) / WEEK_MS);

const getDateMs = (value) => new Date(value || 0).getTime();

const clampPositiveMs = (value) => Math.max(0, Number(value) || 0);

async function createNotification({ userId, type, message, link = "/" }) {
  try {
    if (!userId || !message) return null;

    return await Notification.create({
      userId,
      type,
      message,
      link,
    });
  } catch (err) {
    console.error("Weekly event notification error:", err.message);
    return null;
  }
}

function buildEventPeriod(diffWeeks) {
  const index =
    ((diffWeeks % FOREST_EVENTS.length) + FOREST_EVENTS.length) %
    FOREST_EVENTS.length;
  const rankingStartAtMs = WEEKLY_EVENT_ANCHOR_UTC + diffWeeks * WEEK_MS;
  const rankingEndAtMs =
    rankingStartAtMs + COMPETITION_DURATION_DAYS * DAY_MS;
  const payoutAtMs = rankingEndAtMs;
  const rewardExpiresAtMs = payoutAtMs + RESULT_DURATION_DAYS * DAY_MS;
  const event = FOREST_EVENTS[index];

  return {
    ...event,
    cycleIndex: index,
    diffWeeks,
    weekKey: `${event.id}:${toIsoDate(rankingStartAtMs)}`,
    rankingStartAt: new Date(rankingStartAtMs),
    rankingEndAt: new Date(rankingEndAtMs),
    payoutAt: new Date(payoutAtMs),
    rewardExpiresAt: new Date(rewardExpiresAtMs),
    startsAt: new Date(rankingStartAtMs),
    endsAt: new Date(rankingEndAtMs),
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
    startsAt: event.rankingStartAt,
    endsAt: event.rankingEndAt,
    rankingStartAt: event.rankingStartAt,
    rankingEndAt: event.rankingEndAt,
    payoutAt: event.payoutAt,
    rewardExpiresAt: event.rewardExpiresAt,
  }));
}

function getCompletedWeeklyEventContexts(date = new Date()) {
  const currentDiff = getWeekDiff(date);

  if (currentDiff < 0) {
    return [];
  }

  const contexts = [];

  for (let diff = 0; diff <= currentDiff; diff += 1) {
    const context = buildEventPeriod(diff);

    if (getDateMs(context.payoutAt) <= getDateMs(date)) {
      contexts.push(context);
    }
  }

  return contexts;
}

function getActiveResultsContext(date = new Date()) {
  const currentContext = getCurrentWeeklyEventContext(date);
  const nowMs = getDateMs(date);

  if (
    nowMs >= getDateMs(currentContext.payoutAt) &&
    nowMs < getDateMs(currentContext.rewardExpiresAt)
  ) {
    return currentContext;
  }

  if (currentContext.diffWeeks <= 0) {
    return null;
  }

  const previousContext = buildEventPeriod(currentContext.diffWeeks - 1);

  if (
    nowMs >= getDateMs(previousContext.payoutAt) &&
    nowMs < getDateMs(previousContext.rewardExpiresAt)
  ) {
    return previousContext;
  }

  return null;
}

function isCompetitionActive(context, date = new Date()) {
  const nowMs = getDateMs(date);

  return (
    nowMs >= getDateMs(context.rankingStartAt) &&
    nowMs < getDateMs(context.rankingEndAt)
  );
}

function isResultsActive(context, date = new Date()) {
  const nowMs = getDateMs(date);

  return (
    nowMs >= getDateMs(context.payoutAt) &&
    nowMs < getDateMs(context.rewardExpiresAt)
  );
}

function isConfessionEligibleForCompetition(confession, context) {
  const createdAtMs = getDateMs(confession?.createdAt);

  return (
    createdAtMs >= getDateMs(context.rankingStartAt) &&
    createdAtMs < getDateMs(context.rankingEndAt)
  );
}

function getWeeklyTrackingEntry(confession, weekKey) {
  return Array.isArray(confession?.weeklyEventTracking)
    ? confession.weeklyEventTracking.find((entry) => entry.weekKey === weekKey) ||
        null
    : null;
}

function ensureWeeklyTrackingEntry(confession, context) {
  if (!Array.isArray(confession.weeklyEventTracking)) {
    confession.weeklyEventTracking = [];
  }

  let entry = getWeeklyTrackingEntry(confession, context.weekKey);

  if (entry) {
    return entry;
  }

  confession.weeklyEventTracking.push({
    weekKey: context.weekKey,
    eventKey: context.id,
    rankingStartAt: context.rankingStartAt,
    rankingEndAt: context.rankingEndAt,
    wateredCount: 0,
    burnedCount: 0,
    wateredMilestones: [],
    burnedMilestones: [],
    lastSyncedAt: null,
  });

  entry =
    confession.weeklyEventTracking[confession.weeklyEventTracking.length - 1];

  return entry;
}

function getMilestoneReachedAt(milestones = [], score) {
  if (!score || !Array.isArray(milestones)) {
    return null;
  }

  const match = milestones.find((milestone) => Number(milestone.score) === score);

  return match?.reachedAt || null;
}

function addMissingMilestones(milestones, fromScore, toScore, reachedAt) {
  let changed = false;
  const existingScores = new Set(
    (Array.isArray(milestones) ? milestones : []).map((item) => Number(item.score))
  );

  for (let score = Math.max(1, fromScore); score <= toScore; score += 1) {
    if (existingScores.has(score)) {
      continue;
    }

    milestones.push({ score, reachedAt });
    existingScores.add(score);
    changed = true;
  }

  return changed;
}

function syncReactionMilestones({
  entry,
  field,
  nextCount,
  observedAt,
  backfillAt,
}) {
  const countKey = `${field}Count`;
  const milestonesKey = `${field}Milestones`;
  const previousCount = Number(entry?.[countKey] || 0);
  const nextValue = Math.max(0, Number(nextCount) || 0);
  const milestones = Array.isArray(entry?.[milestonesKey])
    ? entry[milestonesKey]
    : [];

  if (!Array.isArray(entry[milestonesKey])) {
    entry[milestonesKey] = milestones;
  }

  let changed = previousCount !== nextValue;

  if (nextValue > previousCount) {
    changed =
      addMissingMilestones(milestones, previousCount + 1, nextValue, observedAt) ||
      changed;
  } else if (nextValue > 0 && milestones.length === 0 && backfillAt) {
    changed =
      addMissingMilestones(milestones, 1, nextValue, backfillAt) || changed;
  }

  entry[countKey] = nextValue;

  return changed;
}

function syncConfessionWeeklyTracking(
  confession,
  context,
  { observedAt = new Date(), allowBackfill = false } = {}
) {
  if (!confession || !context || !isConfessionEligibleForCompetition(confession, context)) {
    return false;
  }

  const entry = ensureWeeklyTrackingEntry(confession, context);
  const waterCount = Array.isArray(confession.wateredBy)
    ? confession.wateredBy.length
    : 0;
  const burnCount = Array.isArray(confession.burnedBy)
    ? confession.burnedBy.length
    : 0;
  const fallbackReachedAt =
    allowBackfill && getDateMs(confession?.updatedAt || confession?.createdAt)
      ? new Date(confession.updatedAt || confession.createdAt)
      : null;

  let changed = false;

  changed =
    syncReactionMilestones({
      entry,
      field: "watered",
      nextCount: waterCount,
      observedAt,
      backfillAt: fallbackReachedAt,
    }) || changed;

  changed =
    syncReactionMilestones({
      entry,
      field: "burned",
      nextCount: burnCount,
      observedAt,
      backfillAt: fallbackReachedAt,
    }) || changed;

  if (
    !entry.lastSyncedAt ||
    getDateMs(entry.lastSyncedAt) !== getDateMs(observedAt)
  ) {
    entry.lastSyncedAt = observedAt;
    changed = true;
  }

  return changed;
}

function getTrackedCounts(confession, context, useRawFallback = true) {
  const entry = getWeeklyTrackingEntry(confession, context.weekKey);

  if (entry) {
    return {
      entry,
      wateredCount: Number(entry.wateredCount || 0),
      burnedCount: Number(entry.burnedCount || 0),
      fallbackUsed: false,
    };
  }

  return {
    entry: null,
    wateredCount: useRawFallback
      ? Array.isArray(confession?.wateredBy)
        ? confession.wateredBy.length
        : 0
      : 0,
    burnedCount: useRawFallback
      ? Array.isArray(confession?.burnedBy)
        ? confession.burnedBy.length
        : 0
      : 0,
    fallbackUsed: Boolean(useRawFallback),
  };
}

function buildLeaderCandidate(confession, context, mode, useRawFallback = true) {
  const { entry, wateredCount, burnedCount, fallbackUsed } = getTrackedCounts(
    confession,
    context,
    useRawFallback
  );
  const score = mode === "watered" ? wateredCount : burnedCount;

  if (score <= 0) {
    return null;
  }

  const reachedAt =
    getMilestoneReachedAt(
      mode === "watered" ? entry?.wateredMilestones : entry?.burnedMilestones,
      score
    ) ||
    (fallbackUsed ? confession.updatedAt || confession.createdAt : null) ||
    entry?.lastSyncedAt ||
    confession.createdAt ||
    null;

  return {
    confession,
    wateredCount,
    burnedCount,
    score,
    reachedAt,
    tiedCandidateCount: 1,
  };
}

function compareLeaderCandidates(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  const reachedDiff = getDateMs(a.reachedAt) - getDateMs(b.reachedAt);

  if (reachedDiff !== 0) {
    return reachedDiff;
  }

  const createdDiff = getDateMs(a.confession?.createdAt) - getDateMs(b.confession?.createdAt);

  if (createdDiff !== 0) {
    return createdDiff;
  }

  return String(a.confession?._id || "").localeCompare(
    String(b.confession?._id || "")
  );
}

function pickLeader(confessions, context, mode, useRawFallback = true) {
  const candidates = confessions
    .map((confession) =>
      buildLeaderCandidate(confession, context, mode, useRawFallback)
    )
    .filter(Boolean)
    .sort(compareLeaderCandidates);

  const leader = candidates[0] || null;

  if (!leader) {
    return null;
  }

  const tiedCandidateCount = candidates.filter(
    (candidate) => candidate.score === leader.score
  ).length;

  leader.tiedCandidateCount = tiedCandidateCount;
  return leader;
}

function serializeLeadConfession(leader) {
  if (!leader?.confession) {
    return null;
  }

  const confession = leader.confession;

  return {
    _id: confession._id,
    message: confession.message,
    image: confession.image || "",
    mood: confession.mood || "",
    postTheme: confession.postTheme || "",
    createdAt: confession.createdAt,
    wateredCount: leader.wateredCount || 0,
    burnedCount: leader.burnedCount || 0,
    winningScore: leader.score || 0,
    reachedWinningScoreAt: leader.reachedAt || null,
    tiedCandidateCount: leader.tiedCandidateCount || 0,
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

async function computeWeeklyLeaderboardForContext(
  context,
  { useRawFallback = true } = {}
) {
  const confessions = await Confession.find({
    createdAt: {
      $gte: context.rankingStartAt,
      $lt: context.rankingEndAt,
    },
  })
    .sort({ createdAt: 1 })
    .populate("userId", USER_PUBLIC_SELECT);

  return {
    context,
    confessions,
    candidateCount: confessions.length,
    mostWatered: pickLeader(confessions, context, "watered", useRawFallback),
    mostBurned: pickLeader(confessions, context, "burned", useRawFallback),
  };
}

async function getOrCreateCycleRecord(context) {
  return WeeklyEventCycle.findOneAndUpdate(
    { weekKey: context.weekKey },
    {
      $setOnInsert: {
        weekKey: context.weekKey,
        eventKey: context.id,
        eventName: context.name,
        rankingStartAt: context.rankingStartAt,
        rankingEndAt: context.rankingEndAt,
        payoutAt: context.payoutAt,
        rewardExpiresAt: context.rewardExpiresAt,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

function updateCycleWinnerRecord(cycle, field, leader, extra = {}) {
  cycle[field] = {
    ...(cycle[field]?.toObject ? cycle[field].toObject() : cycle[field] || {}),
    confessionId: leader?.confession?._id || null,
    userId: leader?.confession?.userId?._id || null,
    score: leader?.score || 0,
    reachedScoreAt: leader?.reachedAt || null,
    confessionCreatedAt: leader?.confession?.createdAt || null,
    tiedCandidateCount: leader?.tiedCandidateCount || 0,
    ...extra,
  };
}

async function findExistingUserReward(weekKey, type) {
  const user = await User.findOne({
    weeklyRewards: { $elemMatch: { weekKey, type } },
  });

  if (!user) {
    return null;
  }

  const reward = (user.weeklyRewards || []).find(
    (entry) => entry.weekKey === weekKey && entry.type === type
  );

  if (!reward) {
    return null;
  }

  return { user, reward };
}

function buildPendingRewardState({ amount = 0, durationDays = 0 } = {}) {
  return {
    amount,
    durationDays,
    granted: false,
    applied: false,
    username: "",
    userId: null,
    confessionId: null,
    grantedAt: null,
    expiresAt: null,
    score: 0,
    reachedScoreAt: null,
    tiedCandidateCount: 0,
  };
}

function serializeCycleRewardState({
  cycle,
  field,
  leader,
  amount = 0,
  durationDays = 0,
}) {
  const winner = cycle?.[field] || null;
  const granted = Boolean(winner?.grantedAt);

  return {
    amount,
    durationDays,
    granted,
    applied: granted,
    username: leader?.confession?.userId?.username || "",
    userId: leader?.confession?.userId?._id || winner?.userId || null,
    confessionId: leader?.confession?._id || winner?.confessionId || null,
    grantedAt: winner?.grantedAt || null,
    expiresAt: winner?.expiresAt || null,
    score: leader?.score || Number(winner?.score || 0),
    reachedScoreAt: winner?.reachedScoreAt || leader?.reachedAt || null,
    tiedCandidateCount:
      winner?.tiedCandidateCount || leader?.tiedCandidateCount || 0,
  };
}

async function clearExpiredTemporaryOverrides(date = new Date()) {
  const expiredUsers = await User.find({
    "temporaryCosmeticOverride.source": "weekly_most_burned",
    "temporaryCosmeticOverride.expiresAt": {
      $ne: null,
      $lte: date,
    },
  });

  let clearedCount = 0;

  for (const user of expiredUsers) {
    const override = user.temporaryCosmeticOverride || {};
    const expiryText = override.expiresAt
      ? new Date(override.expiresAt).toLocaleString()
      : "now";

    await createNotification({
      userId: user._id,
      type: "weekly_event_effect_expired",
      message: `Your weekly event scorched style has faded. Your normal cosmetics are visible again after ${expiryText}.`,
      link: `/user/${user._id}`,
    });

    user.weeklyRewards = (user.weeklyRewards || []).map((reward) => {
      if (
        reward.weekKey === override.weekKey &&
        reward.type === MOST_BURNED_OVERRIDE_TYPE &&
        !reward.expiryNotificationSentAt
      ) {
        return {
          ...reward.toObject?.(),
          expiryNotificationSentAt: new Date(date),
        };
      }

      return reward;
    });

    user.temporaryCosmeticOverride = { ...EMPTY_TEMPORARY_OVERRIDE };
    await user.save();
    clearedCount += 1;
  }

  return clearedCount;
}

function formatCountdownParts(ms) {
  const safeMs = clampPositiveMs(ms);
  const totalHours = Math.floor(safeMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days >= 2) {
    return `${days} days left`;
  }

  if (days === 1) {
    return hours > 0 ? `1 day ${hours}h left` : "1 day left";
  }

  const minutes = Math.floor((safeMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${Math.max(1, minutes)}m left`;
}

function serializeCurrentEventStatus(context, date = new Date()) {
  const active = isCompetitionActive(context, date);
  const nowMs = getDateMs(date);
  const countdownTargetAt = active
    ? context.rankingEndAt
    : context.rewardExpiresAt;
  const countdownMs = clampPositiveMs(getDateMs(countdownTargetAt) - nowMs);
  const nextCompetitionStartsAt = buildEventPeriod(context.diffWeeks + 1).rankingStartAt;

  return {
    id: context.id,
    name: context.name,
    description: context.description,
    label: context.label,
    accent: context.accent,
    border: context.border,
    background: context.background,
    weekKey: context.weekKey,
    startsAt: context.rankingStartAt,
    endsAt: context.rankingEndAt,
    rankingStartAt: context.rankingStartAt,
    rankingEndAt: context.rankingEndAt,
    payoutAt: context.payoutAt,
    rewardExpiresAt: context.rewardExpiresAt,
    nextCompetitionStartsAt,
    phase: active ? "active" : "results_active",
    statusText: active
      ? `Competition closes in ${formatCountdownParts(countdownMs)}`
      : "Results and temporary rewards are active until next Wednesday.",
    countdownMs,
    countdownTargetAt,
  };
}

async function getWeeklyEventStatus(date = new Date()) {
  const currentContext = getCurrentWeeklyEventContext(date);
  const activeResultsContext = getActiveResultsContext(date);
  const [currentBoard, currentCycle] = await Promise.all([
    computeWeeklyLeaderboardForContext(currentContext, { useRawFallback: true }),
    getOrCreateCycleRecord(currentContext),
  ]);

  let activeResultsBoard = null;
  let activeResultsCycle = null;

  if (activeResultsContext) {
    [activeResultsBoard, activeResultsCycle] = await Promise.all([
      activeResultsContext.weekKey === currentContext.weekKey
        ? Promise.resolve(currentBoard)
        : computeWeeklyLeaderboardForContext(activeResultsContext, {
            useRawFallback: true,
          }),
      getOrCreateCycleRecord(activeResultsContext),
    ]);
  }

  const currentEvent = serializeCurrentEventStatus(currentContext, date);
  const displayBoard =
    currentEvent.phase === "active" ? currentBoard : activeResultsBoard || currentBoard;
  const rewards = activeResultsCycle
    ? {
        mostWateredSeeds: serializeCycleRewardState({
          cycle: activeResultsCycle,
          field: "mostWatered",
          leader: activeResultsBoard?.mostWatered,
          amount: WEEKLY_EVENT_REWARD_SEEDS,
        }),
        mostBurnedOverride: serializeCycleRewardState({
          cycle: activeResultsCycle,
          field: "mostBurned",
          leader: activeResultsBoard?.mostBurned,
          durationDays: WEEKLY_OVERRIDE_DURATION_DAYS,
        }),
      }
    : {
        mostWateredSeeds: buildPendingRewardState({
          amount: WEEKLY_EVENT_REWARD_SEEDS,
        }),
        mostBurnedOverride: buildPendingRewardState({
          durationDays: WEEKLY_OVERRIDE_DURATION_DAYS,
        }),
      };

  return {
    currentEvent,
    trackingMode: TRACKING_MODE,
    reactionTimingExact: true,
    finalizationMode: FINALIZATION_MODE,
    candidateCount: currentBoard.candidateCount,
    leaderboard: {
      mostWateredPost: serializeLeadConfession(displayBoard?.mostWatered),
      mostBurnedPost: serializeLeadConfession(displayBoard?.mostBurned),
    },
    competitionLeaderboard: {
      weekKey: currentContext.weekKey,
      candidateCount: currentBoard.candidateCount,
      mostWateredPost: serializeLeadConfession(currentBoard.mostWatered),
      mostBurnedPost: serializeLeadConfession(currentBoard.mostBurned),
    },
    activeResults: activeResultsContext
      ? {
          weekKey: activeResultsContext.weekKey,
          eventKey: activeResultsContext.id,
          name: activeResultsContext.name,
          rankingStartAt: activeResultsContext.rankingStartAt,
          rankingEndAt: activeResultsContext.rankingEndAt,
          payoutAt: activeResultsContext.payoutAt,
          rewardExpiresAt: activeResultsContext.rewardExpiresAt,
          mostWateredPost: serializeLeadConfession(activeResultsBoard?.mostWatered),
          mostBurnedPost: serializeLeadConfession(activeResultsBoard?.mostBurned),
          rewards,
        }
      : null,
    rewards,
    upcomingEvents: getUpcomingForestEvents(date, 4),
  };
}

async function primeActiveCompetitionTracking(context, date = new Date()) {
  if (!isCompetitionActive(context, date)) {
    return 0;
  }

  const confessions = await Confession.find({
    createdAt: {
      $gte: context.rankingStartAt,
      $lt: context.rankingEndAt,
    },
  });

  let updatedCount = 0;

  for (const confession of confessions) {
    if (
      syncConfessionWeeklyTracking(confession, context, {
        observedAt: new Date(date),
        allowBackfill: true,
      })
    ) {
      await confession.save();
      updatedCount += 1;
    }
  }

  return updatedCount;
}

async function finalizeWeeklyEventPeriod(
  context,
  { appliedAt = new Date() } = {}
) {
  const finalizedAt = new Date(appliedAt);
  const cycle = await getOrCreateCycleRecord(context);

  if (cycle.payoutProcessedAt) {
    return {
      weekKey: context.weekKey,
      eventKey: context.id,
      alreadyProcessed: true,
    };
  }

  const { mostWatered, mostBurned } = await computeWeeklyLeaderboardForContext(
    context,
    { useRawFallback: true }
  );

  const outcome = {
    weekKey: context.weekKey,
    eventKey: context.id,
    mostWateredSeeds: {
      candidateConfessionId: mostWatered?.confession?._id || null,
      candidateUserId: mostWatered?.confession?.userId?._id || null,
      granted: false,
      skippedReason: "",
    },
    mostBurnedOverride: {
      candidateConfessionId: mostBurned?.confession?._id || null,
      candidateUserId: mostBurned?.confession?.userId?._id || null,
      applied: false,
      skippedReason: "",
      expiresAt: null,
    },
  };

  updateCycleWinnerRecord(cycle, "mostWatered", mostWatered);
  updateCycleWinnerRecord(cycle, "mostBurned", mostBurned, {
    expiresAt: context.rewardExpiresAt,
  });
  cycle.lastEvaluatedAt = finalizedAt;

  if (!mostWatered?.confession?.userId?._id) {
    outcome.mostWateredSeeds.skippedReason =
      "No watered winner when the Wednesday payout closed.";
  } else {
    const existingReward = await findExistingUserReward(
      context.weekKey,
      MOST_WATERED_REWARD_TYPE
    );

    if (existingReward) {
      cycle.mostWatered.grantedAt =
        existingReward.reward.grantedAt || cycle.mostWatered.grantedAt || finalizedAt;
      cycle.mostWatered.notificationSentAt =
        existingReward.reward.notificationSentAt ||
        cycle.mostWatered.notificationSentAt ||
        finalizedAt;
      outcome.mostWateredSeeds.granted = true;
    } else {
      const seedReward = await awardSeeds({
        userId: mostWatered.confession.userId._id,
        reason: "weekly_event_most_watered",
        amount: WEEKLY_EVENT_REWARD_SEEDS,
        reasonLabel: `winning the ${context.name} weekly event with the most watered confession`,
        link: `/confession/${mostWatered.confession._id}`,
      });

      if (seedReward?.awarded) {
        const winner = await User.findById(mostWatered.confession.userId._id);

        if (winner) {
          winner.weeklyRewards.push({
            weekKey: context.weekKey,
            eventKey: context.id,
            type: MOST_WATERED_REWARD_TYPE,
            confessionId: mostWatered.confession._id,
            grantedAt: finalizedAt,
            score: mostWatered.score || 0,
            reachedScoreAt: mostWatered.reachedAt || null,
            notificationSentAt: finalizedAt,
          });
          await winner.save();
        }

        cycle.mostWatered.grantedAt = finalizedAt;
        cycle.mostWatered.notificationSentAt = finalizedAt;
        outcome.mostWateredSeeds.granted = true;
      } else {
        outcome.mostWateredSeeds.skippedReason =
          seedReward?.message || "Could not grant the weekly Seeds payout.";
      }
    }
  }

  if (!mostBurned?.confession?.userId?._id) {
    outcome.mostBurnedOverride.skippedReason =
      "No burned winner when the Wednesday payout closed.";
  } else {
    const existingReward = await findExistingUserReward(
      context.weekKey,
      MOST_BURNED_OVERRIDE_TYPE
    );

    if (existingReward) {
      cycle.mostBurned.grantedAt =
        existingReward.reward.grantedAt || cycle.mostBurned.grantedAt || finalizedAt;
      cycle.mostBurned.expiresAt =
        existingReward.reward.expiresAt || cycle.mostBurned.expiresAt || context.rewardExpiresAt;
      cycle.mostBurned.notificationSentAt =
        existingReward.reward.notificationSentAt ||
        cycle.mostBurned.notificationSentAt ||
        finalizedAt;
      outcome.mostBurnedOverride.applied = true;
      outcome.mostBurnedOverride.expiresAt = cycle.mostBurned.expiresAt;
    } else {
      const winner = await User.findById(mostBurned.confession.userId._id);

      if (!winner) {
        outcome.mostBurnedOverride.skippedReason =
          "Burned winner user could not be found.";
      } else {
        winner.temporaryCosmeticOverride = {
          source: "weekly_most_burned",
          frameId: WEEKLY_OVERRIDE_FRAME_ID,
          postThemeId: WEEKLY_OVERRIDE_POST_THEME_ID,
          grantedAt: finalizedAt,
          expiresAt: context.rewardExpiresAt,
          eventKey: context.id,
          weekKey: context.weekKey,
        };

        winner.weeklyRewards.push({
          weekKey: context.weekKey,
          eventKey: context.id,
          type: MOST_BURNED_OVERRIDE_TYPE,
          confessionId: mostBurned.confession._id,
          grantedAt: finalizedAt,
          expiresAt: context.rewardExpiresAt,
          score: mostBurned.score || 0,
          reachedScoreAt: mostBurned.reachedAt || null,
          notificationSentAt: finalizedAt,
        });

        await winner.save();

        await createNotification({
          userId: winner._id,
          type: "weekly_event_effect",
          message: `Your confession led the weekly event burn ranking. A temporary scorched style now overrides your visible frame and confession card until ${new Date(
            context.rewardExpiresAt
          ).toLocaleString()}.`,
          link: `/user/${winner._id}`,
        });

        cycle.mostBurned.grantedAt = finalizedAt;
        cycle.mostBurned.expiresAt = context.rewardExpiresAt;
        cycle.mostBurned.notificationSentAt = finalizedAt;
        outcome.mostBurnedOverride.applied = true;
        outcome.mostBurnedOverride.expiresAt = context.rewardExpiresAt;
      }
    }
  }

  cycle.payoutProcessedAt = finalizedAt;
  await cycle.save();

  return outcome;
}

async function runWeeklyEventMaintenance({ date = new Date() } = {}) {
  const maintenanceAt = new Date(date);
  const currentContext = getCurrentWeeklyEventContext(maintenanceAt);
  const completedContexts = getCompletedWeeklyEventContexts(maintenanceAt);
  const clearedExpiredOverrides = await clearExpiredTemporaryOverrides(
    maintenanceAt
  );
  const primedCurrentCompetition = await primeActiveCompetitionTracking(
    currentContext,
    maintenanceAt
  );
  const finalizedWeeks = [];

  for (const context of completedContexts) {
    const cycle = await getOrCreateCycleRecord(context);

    if (cycle.payoutProcessedAt) {
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
    primedCurrentCompetition,
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
        primedCurrentCompetition: 0,
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
  getActiveResultsContext,
  isCompetitionActive,
  isResultsActive,
  isConfessionEligibleForCompetition,
  syncConfessionWeeklyTracking,
  getWeeklyEventStatus,
  ensureWeeklyEventMaintenance,
  runWeeklyEventMaintenance,
  startWeeklyEventAutomation,
  finalizeCurrentWeeklyResults,
};
