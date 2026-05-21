const mongoose = require("mongoose");

const User = require("../models/User");
const { awardSeeds } = require("./seedRewards");
const { getTodayDateKey, getYesterdayDateKey } = require("./dayKey");

const QUEST_CONFIG = [
  {
    key: "login_today",
    title: "Daily visit",
    target: 1,
    rewardAmount: 5,
    rewardReason: "quest_login_today",
    rewardLabel: "today's daily visit quest",
    isComplete: (progress) => Boolean(progress?.loginVisited),
    getProgress: (progress) => (progress?.loginVisited ? 1 : 0),
  },
  {
    key: "create_1_confession",
    title: "Create 1 confession",
    target: 1,
    rewardAmount: 5,
    rewardReason: "quest_create_confession",
    rewardLabel: "today's confession quest",
    isComplete: (progress) => Number(progress?.confessionsCreated || 0) >= 1,
    getProgress: (progress) => Number(progress?.confessionsCreated || 0),
  },
  {
    key: "create_1_comment",
    title: "Create 1 comment",
    target: 1,
    rewardAmount: 3,
    rewardReason: "quest_create_comment",
    rewardLabel: "today's comment quest",
    isComplete: (progress) => Number(progress?.commentsCreated || 0) >= 1,
    getProgress: (progress) => Number(progress?.commentsCreated || 0),
  },
  {
    key: "react_3_times",
    title: "React to 3 distinct posts",
    target: 3,
    rewardAmount: 3,
    rewardReason: "quest_react_3_posts",
    rewardLabel: "today's reaction quest",
    isComplete: (progress) => getReactionCount(progress) >= 3,
    getProgress: (progress) => getReactionCount(progress),
  },
];

const COMPLETE_ALL_KEY = "complete_all_daily";
const COMPLETE_ALL_CONFIG = {
  key: COMPLETE_ALL_KEY,
  title: "Complete all daily quests",
  target: QUEST_CONFIG.length,
  rewardAmount: 10,
  rewardReason: "quest_complete_all_daily",
  rewardLabel: "completing all daily quests",
};

const defaultDailyStreak = () => ({
  current: 0,
  best: 0,
  lastVisitDateKey: "",
});

const defaultDailyQuestProgress = () => ({
  dateKey: getTodayDateKey(),
  loginVisited: false,
  confessionsCreated: 0,
  commentsCreated: 0,
  reactionPostIds: [],
  rewardedQuestKeys: [],
});

function getReactionCount(progress) {
  return Array.isArray(progress?.reactionPostIds) ? progress.reactionPostIds.length : 0;
}

function ensureDailyStreakState(user) {
  if (!user.dailyStreak) {
    user.dailyStreak = defaultDailyStreak();
    return;
  }

  user.dailyStreak.current = Number(user.dailyStreak.current || 0);
  user.dailyStreak.best = Number(user.dailyStreak.best || 0);
  user.dailyStreak.lastVisitDateKey = String(user.dailyStreak.lastVisitDateKey || "");
}

function ensureDailyQuestState(user) {
  const todayKey = getTodayDateKey();

  if (!user.dailyQuestProgress || user.dailyQuestProgress.dateKey !== todayKey) {
    user.dailyQuestProgress = defaultDailyQuestProgress();
    return;
  }

  user.dailyQuestProgress.dateKey = String(user.dailyQuestProgress.dateKey || todayKey);
  user.dailyQuestProgress.loginVisited = Boolean(user.dailyQuestProgress.loginVisited);
  user.dailyQuestProgress.confessionsCreated = Number(
    user.dailyQuestProgress.confessionsCreated || 0
  );
  user.dailyQuestProgress.commentsCreated = Number(
    user.dailyQuestProgress.commentsCreated || 0
  );
  user.dailyQuestProgress.reactionPostIds = Array.isArray(
    user.dailyQuestProgress.reactionPostIds
  )
    ? user.dailyQuestProgress.reactionPostIds
    : [];
  user.dailyQuestProgress.rewardedQuestKeys = Array.isArray(
    user.dailyQuestProgress.rewardedQuestKeys
  )
    ? user.dailyQuestProgress.rewardedQuestKeys.map((key) => String(key))
    : [];
}

function updateDailyStreak(user) {
  ensureDailyStreakState(user);

  const todayKey = getTodayDateKey();
  const yesterdayKey = getYesterdayDateKey();
  const lastVisitDateKey = String(user.dailyStreak.lastVisitDateKey || "");

  if (lastVisitDateKey === todayKey) {
    return false;
  }

  if (!lastVisitDateKey) {
    user.dailyStreak.current = 1;
  } else if (lastVisitDateKey === yesterdayKey) {
    user.dailyStreak.current = Number(user.dailyStreak.current || 0) + 1;
  } else {
    user.dailyStreak.current = 1;
  }

  user.dailyStreak.best = Math.max(
    Number(user.dailyStreak.best || 0),
    Number(user.dailyStreak.current || 0)
  );
  user.dailyStreak.lastVisitDateKey = todayKey;

  return true;
}

function markDailyVisit(user) {
  ensureDailyQuestState(user);

  if (user.dailyQuestProgress.loginVisited) {
    return false;
  }

  user.dailyQuestProgress.loginVisited = true;
  return true;
}

function markConfessionCreated(user) {
  ensureDailyQuestState(user);
  user.dailyQuestProgress.confessionsCreated =
    Number(user.dailyQuestProgress.confessionsCreated || 0) + 1;
}

function markCommentCreated(user) {
  ensureDailyQuestState(user);
  user.dailyQuestProgress.commentsCreated =
    Number(user.dailyQuestProgress.commentsCreated || 0) + 1;
}

function markReactionMade(user, confessionId) {
  ensureDailyQuestState(user);

  if (!confessionId) return false;

  const normalizedId =
    confessionId instanceof mongoose.Types.ObjectId
      ? confessionId.toString()
      : String(confessionId);

  const alreadyTracked = user.dailyQuestProgress.reactionPostIds.some(
    (value) => String(value) === normalizedId
  );

  if (alreadyTracked) {
    return false;
  }

  user.dailyQuestProgress.reactionPostIds.push(confessionId);
  return true;
}

function getDailyQuestSummary(user) {
  ensureDailyStreakState(user);
  ensureDailyQuestState(user);

  const progress = user.dailyQuestProgress || defaultDailyQuestProgress();
  const rewardedQuestKeys = Array.isArray(progress.rewardedQuestKeys)
    ? progress.rewardedQuestKeys.map((key) => String(key))
    : [];

  const quests = QUEST_CONFIG.map((quest) => {
    const rawProgress = Number(quest.getProgress(progress) || 0);
    const normalizedProgress = Math.min(quest.target, rawProgress);

    return {
      key: quest.key,
      title: quest.title,
      rewardAmount: quest.rewardAmount,
      progress: normalizedProgress,
      target: quest.target,
      completed: quest.isComplete(progress),
      rewarded: rewardedQuestKeys.includes(quest.key),
    };
  });

  const completedCount = quests.filter((quest) => quest.completed).length;
  const allCompleted = completedCount === QUEST_CONFIG.length;

  return {
    dateKey: progress.dateKey || getTodayDateKey(),
    completedCount,
    totalCount: QUEST_CONFIG.length,
    allCompleted,
    quests,
    completeAll: {
      key: COMPLETE_ALL_CONFIG.key,
      title: COMPLETE_ALL_CONFIG.title,
      rewardAmount: COMPLETE_ALL_CONFIG.rewardAmount,
      completed: allCompleted,
      rewarded: rewardedQuestKeys.includes(COMPLETE_ALL_KEY),
    },
  };
}

function getPendingQuestRewards(user) {
  const summary = getDailyQuestSummary(user);
  const pending = [];

  for (const quest of summary.quests) {
    if (!quest.completed || quest.rewarded) continue;

    const config = QUEST_CONFIG.find((item) => item.key === quest.key);

    if (config) {
      pending.push({
        key: config.key,
        rewardReason: config.rewardReason,
        rewardLabel: config.rewardLabel,
      });
    }
  }

  if (summary.completeAll.completed && !summary.completeAll.rewarded) {
    pending.push({
      key: COMPLETE_ALL_CONFIG.key,
      rewardReason: COMPLETE_ALL_CONFIG.rewardReason,
      rewardLabel: COMPLETE_ALL_CONFIG.rewardLabel,
    });
  }

  return pending;
}

async function awardPendingQuestRewards(userId, pendingRewards, link = "/") {
  const questRewards = [];

  for (const quest of pendingRewards) {
    const reward = await awardSeeds({
      userId,
      reason: quest.rewardReason,
      reasonLabel: quest.rewardLabel,
      link,
    });

    if (!reward?.awarded) {
      continue;
    }

    await User.updateOne(
      { _id: userId },
      { $addToSet: { "dailyQuestProgress.rewardedQuestKeys": quest.key } }
    );

    questRewards.push({
      key: quest.key,
      reward,
    });
  }

  return questRewards;
}

async function processDailyQuestUpdate({ userId, link = "/", mutate }) {
  if (!userId) return null;

  const user = await User.findById(userId);

  if (!user) return null;

  ensureDailyStreakState(user);
  ensureDailyQuestState(user);

  if (typeof mutate === "function") {
    mutate(user);
  }

  const pendingRewards = getPendingQuestRewards(user);

  if (user.isModified()) {
    await user.save();
  }

  const questRewards = await awardPendingQuestRewards(user._id, pendingRewards, link);
  const freshUser = questRewards.length > 0 ? await User.findById(user._id) : user;

  return {
    user: freshUser,
    dailyQuestSummary: getDailyQuestSummary(freshUser),
    questRewards,
  };
}

async function applyDailyVisit(userId, link = "/") {
  return processDailyQuestUpdate({
    userId,
    link,
    mutate: (user) => {
      updateDailyStreak(user);
      markDailyVisit(user);
    },
  });
}

async function applyConfessionQuestProgress(userId, link = "/") {
  return processDailyQuestUpdate({
    userId,
    link,
    mutate: (user) => {
      markConfessionCreated(user);
    },
  });
}

async function applyCommentQuestProgress(userId, link = "/") {
  return processDailyQuestUpdate({
    userId,
    link,
    mutate: (user) => {
      markCommentCreated(user);
    },
  });
}

async function applyReactionQuestProgress(userId, confessionId, link = "/") {
  return processDailyQuestUpdate({
    userId,
    link,
    mutate: (user) => {
      markReactionMade(user, confessionId);
    },
  });
}

module.exports = {
  QUEST_CONFIG,
  COMPLETE_ALL_CONFIG,
  defaultDailyStreak,
  defaultDailyQuestProgress,
  ensureDailyQuestState,
  markDailyVisit,
  markConfessionCreated,
  markCommentCreated,
  markReactionMade,
  getDailyQuestSummary,
  updateDailyStreak,
  applyDailyVisit,
  applyConfessionQuestProgress,
  applyCommentQuestProgress,
  applyReactionQuestProgress,
};
