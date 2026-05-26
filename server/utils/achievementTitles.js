const mongoose = require("mongoose");

const Confession = require("../models/Confession");
const Notification = require("../models/Notification");
const User = require("../models/User");

const ACHIEVEMENT_TITLES = [
  {
    id: "first_bloom",
    name: "First Bloom",
    description: "Created your first confession.",
    requirementText: "Create your first confession.",
    progressKey: "confessionsCreated",
    target: 1,
  },
  {
    id: "kind_soul",
    name: "Kind Soul",
    description: "Posted 25 comments.",
    requirementText: "Write 25 comments.",
    progressKey: "commentsCreated",
    target: 25,
  },
  {
    id: "grove_guardian",
    name: "Grove Guardian",
    description: "Received 100 water reactions on your confessions.",
    requirementText: "Receive 100 waters on your confessions.",
    progressKey: "watersReceived",
    target: 100,
  },
  {
    id: "scorched_survivor",
    name: "Scorched Survivor",
    description: "Received 50 burn reactions on your confessions.",
    requirementText: "Receive 50 burns on your confessions.",
    progressKey: "burnsReceived",
    target: 50,
  },
  {
    id: "steady_spirit",
    name: "Steady Spirit",
    description: "Kept a 30-day daily visit streak.",
    requirementText: "Reach a 30-day daily visit streak.",
    progressKey: "bestDailyStreak",
    target: 30,
  },
  {
    id: "ancient_listener",
    name: "Ancient Listener",
    description: "Kept a 100-day daily visit streak.",
    requirementText: "Reach a 100-day daily visit streak.",
    progressKey: "bestDailyStreak",
    target: 100,
  },
  {
    id: "comfort_giver",
    name: "Comfort Giver",
    description: "Received 50 comfort cards on your confessions.",
    requirementText: "Receive 50 comfort cards on your confessions.",
    progressKey: "comfortsReceived",
    target: 50,
  },
  {
    id: "the_handsome_one",
    name: "The Handsome One",
    description: "For someone who keeps perfecting their look.",
    requirementText: "Change your profile 10 times.",
    progressKey: "profileChangeCount",
    target: 10,
  },
  {
    id: "truth_keeper",
    name: "Truth Keeper",
    description: "Have 10 valid reports accepted by moderators.",
    requirementText: "Have 10 reports accepted or resolved by moderators.",
    progressKey: "acceptedReports",
    target: 10,
    supported: false,
    lockedReason: "Lifetime accepted-report tracking is not available yet.",
  },
];

const TITLE_DEFINITION_MAP = new Map(
  ACHIEVEMENT_TITLES.map((title) => [title.id, title])
);

function getAchievementTitles() {
  return ACHIEVEMENT_TITLES.map((title) => ({ ...title }));
}

function getAchievementTitleById(titleId) {
  return TITLE_DEFINITION_MAP.get(String(titleId || "").trim()) || null;
}

function normalizeUnlockedTitles(user) {
  return Array.isArray(user?.achievementTitles) ? user.achievementTitles : [];
}

function hasUnlockedTitle(user, titleId) {
  const normalizedTitleId = String(titleId || "").trim();
  if (!normalizedTitleId) return false;

  return normalizeUnlockedTitles(user).some((title) => {
    if (typeof title === "string") return title === normalizedTitleId;
    return String(title?.id || "") === normalizedTitleId;
  });
}

async function createTitleNotification({ userId, title, link = "/titles" }) {
  try {
    if (!userId || !title?.name) return;

    const earnedTitleName = /^the\s/i.test(title.name)
      ? title.name
      : `the ${title.name}`;

    await Notification.create({
      userId,
      type: "title_unlocked",
      message: `Title unlocked: ${title.name}. You earned ${earnedTitleName} display title.`,
      link,
    });
  } catch (err) {
    console.error("Title notification error:", err.message);
  }
}

async function unlockTitleForUser(user, titleId, options = {}) {
  const title = getAchievementTitleById(titleId);

  if (!user || !title || (title.supported === false && !options.allowUnsupported)) {
    return { unlocked: false, title: null };
  }

  if (!Array.isArray(user.achievementTitles)) {
    user.achievementTitles = [];
  }

  if (hasUnlockedTitle(user, title.id)) {
    return { unlocked: false, title };
  }

  const unlockedAt = new Date();
  user.achievementTitles.push({
    id: title.id,
    name: title.name,
    description: title.description,
    unlockedAt,
  });

  if (options.save !== false) {
    await user.save();
  }

  if (options.notify !== false) {
    await createTitleNotification({
      userId: user._id,
      title,
      link: options.link,
    });
  }

  return {
    unlocked: true,
    title: {
      id: title.id,
      name: title.name,
      description: title.description,
      unlockedAt,
    },
  };
}

function toObjectId(userId) {
  const normalized = String(userId || "");

  if (!mongoose.Types.ObjectId.isValid(normalized)) {
    return null;
  }

  return new mongoose.Types.ObjectId(normalized);
}

async function calculateRootCommentCount(userObjectId) {
  const result = await Confession.aggregate([
    { $unwind: "$comments" },
    {
      $match: {
        "comments.userId": userObjectId,
        "comments.isHidden": { $ne: true },
      },
    },
    { $count: "count" },
  ]);

  return Number(result?.[0]?.count || 0);
}

async function calculateReplyCommentCount(userObjectId) {
  const result = await Confession.aggregate([
    { $unwind: "$comments" },
    { $unwind: "$comments.replies" },
    {
      $match: {
        "comments.isHidden": { $ne: true },
        "comments.replies.userId": userObjectId,
        "comments.replies.isHidden": { $ne: true },
      },
    },
    { $count: "count" },
  ]);

  return Number(result?.[0]?.count || 0);
}

async function calculateCommentCount(userObjectId) {
  const [rootComments, replyComments] = await Promise.all([
    calculateRootCommentCount(userObjectId),
    calculateReplyCommentCount(userObjectId),
  ]);

  return rootComments + replyComments;
}

async function calculateOwnedConfessionEngagement(userObjectId) {
  const result = await Confession.aggregate([
    { $match: { userId: userObjectId } },
    {
      $project: {
        watersReceived: { $size: { $ifNull: ["$wateredBy", []] } },
        burnsReceived: { $size: { $ifNull: ["$burnedBy", []] } },
        comfortsReceived: {
          $sum: {
            $map: {
              input: { $ifNull: ["$comfortCards", []] },
              as: "card",
              in: { $ifNull: ["$$card.count", 0] },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        watersReceived: { $sum: "$watersReceived" },
        burnsReceived: { $sum: "$burnsReceived" },
        comfortsReceived: { $sum: "$comfortsReceived" },
      },
    },
  ]);

  return {
    watersReceived: Number(result?.[0]?.watersReceived || 0),
    burnsReceived: Number(result?.[0]?.burnsReceived || 0),
    comfortsReceived: Number(result?.[0]?.comfortsReceived || 0),
  };
}

async function calculateUserTitleProgress(userId) {
  const userObjectId = toObjectId(userId);

  if (!userObjectId) {
    return {};
  }

  const [user, confessionsCreated, commentsCreated, engagement] = await Promise.all([
    User.findById(userObjectId).select(
      "dailyStreak achievementTitles equippedCosmetics profileChangeCount"
    ),
    Confession.countDocuments({ userId: userObjectId }),
    calculateCommentCount(userObjectId),
    calculateOwnedConfessionEngagement(userObjectId),
  ]);

  const rawProgress = {
    confessionsCreated: Number(confessionsCreated || 0),
    commentsCreated: Number(commentsCreated || 0),
    watersReceived: Number(engagement.watersReceived || 0),
    burnsReceived: Number(engagement.burnsReceived || 0),
    comfortsReceived: Number(engagement.comfortsReceived || 0),
    bestDailyStreak: Number(user?.dailyStreak?.best || 0),
    profileChangeCount: Number(user?.profileChangeCount || 0),
    acceptedReports: null,
  };

  return ACHIEVEMENT_TITLES.reduce((result, title) => {
    const progressValue = rawProgress[title.progressKey];

    result[title.id] = {
      progress: title.supported === false ? null : Number(progressValue || 0),
      target: title.target,
      supported: title.supported !== false,
      lockedReason: title.lockedReason || "",
    };

    return result;
  }, {});
}

function shouldUnlockTitle(title, progress) {
  if (!title || title.supported === false || !progress?.supported) return false;

  return Number(progress.progress || 0) >= Number(title.target || 0);
}

function formatEquippedTitle(user) {
  const titleId = String(user?.equippedCosmetics?.title || "").trim();
  if (!titleId) return null;

  const title = getAchievementTitleById(titleId);

  return {
    id: titleId,
    name: title?.name || "",
  };
}

function formatUnlockedTitles(user) {
  return normalizeUnlockedTitles(user).map((title) => {
    const titleId = String(title?.id || title || "");
    const definition = getAchievementTitleById(titleId);

    return {
      id: titleId,
      name: title?.name || definition?.name || "",
      description: title?.description || definition?.description || "",
      unlockedAt: title?.unlockedAt || null,
    };
  });
}

function buildTitlePayload(user, progressByTitleId) {
  const unlockedById = new Map(
    normalizeUnlockedTitles(user).map((title) => [
      String(title?.id || title || ""),
      title,
    ])
  );

  return {
    equippedTitle: formatEquippedTitle(user),
    unlockedTitles: formatUnlockedTitles(user).filter((title) => title.id),
    allTitles: ACHIEVEMENT_TITLES.map((title) => {
      const unlockedRecord = unlockedById.get(title.id);
      const progress = progressByTitleId?.[title.id] || {
        progress: null,
        target: title.target,
        supported: title.supported !== false,
        lockedReason: title.lockedReason || "",
      };

      return {
        id: title.id,
        name: title.name,
        description: title.description,
        requirementText: title.requirementText,
        unlocked: Boolean(unlockedRecord),
        unlockedAt: unlockedRecord?.unlockedAt || null,
        progress: progress.progress,
        target: progress.target,
        supported: progress.supported,
        lockedReason: progress.lockedReason || "",
      };
    }),
  };
}

async function refreshAchievementTitlesForUser(userId, options = {}) {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return null;

  const [user, progressByTitleId] = await Promise.all([
    User.findById(userObjectId),
    calculateUserTitleProgress(userObjectId),
  ]);

  if (!user) return null;

  const unlockedTitles = [];

  for (const title of ACHIEVEMENT_TITLES) {
    const progress = progressByTitleId[title.id];

    if (!shouldUnlockTitle(title, progress)) continue;

    const result = await unlockTitleForUser(user, title.id, {
      save: false,
      notify: false,
    });

    if (result.unlocked) {
      unlockedTitles.push(result.title);
    }
  }

  if (unlockedTitles.length > 0) {
    await user.save();

    if (options.notify !== false) {
      for (const unlockedTitle of unlockedTitles) {
        await createTitleNotification({
          userId: user._id,
          title: unlockedTitle,
          link: options.link,
        });
      }
    }
  }

  return {
    user,
    progressByTitleId,
    unlockedTitles,
    payload: buildTitlePayload(user, progressByTitleId),
  };
}

module.exports = {
  ACHIEVEMENT_TITLES,
  getAchievementTitles,
  getAchievementTitleById,
  hasUnlockedTitle,
  unlockTitleForUser,
  calculateUserTitleProgress,
  refreshAchievementTitlesForUser,
  formatEquippedTitle,
  buildTitlePayload,
};
