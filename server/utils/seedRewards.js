const User = require("../models/User");
const Notification = require("../models/Notification");

const TODAY_KEY_OPTIONS = { timeZone: "Asia/Kolkata" };

const REWARD_LIMITS = {
  daily_login: { statKey: "loginRewards", maxDaily: 1, amount: 10 },
  post_create: { statKey: "postRewards", maxDaily: 5, amount: 5 },
  comment_create: { statKey: "commentRewards", maxDaily: 10, amount: 2 },
  post_reaction_received: { statKey: "reactionRewards", maxDaily: 20, amount: 1 },
  accepted_report: { statKey: "acceptedReportRewards", maxDaily: 5, amount: 15 },
};

const getTodayKey = () => new Date().toLocaleDateString("en-CA", TODAY_KEY_OPTIONS);

const defaultDailyStats = () => ({
  dateKey: getTodayKey(),
  loginRewards: 0,
  postRewards: 0,
  commentRewards: 0,
  reactionRewards: 0,
  acceptedReportRewards: 0,
});

const resetDailyStatsIfNeeded = (user) => {
  const todayKey = getTodayKey();

  if (!user.seedDailyStats || user.seedDailyStats.dateKey !== todayKey) {
    user.seedDailyStats = defaultDailyStats();
  }
};

const createSeedNotification = async ({ userId, type, message, link = "/" }) => {
  try {
    if (!userId || !message) return;

    await Notification.create({
      userId,
      type,
      message,
      link,
    });
  } catch (err) {
    console.error("Seed notification error:", err.message);
  }
};

const buildCreditMessage = (amount, reasonLabel, totalSeeds) =>
  `🌱 +${amount} Seeds credited for ${reasonLabel}. You now have ${totalSeeds} Seeds.`;

const buildDebitMessage = (amount, reasonLabel, totalSeeds) =>
  `🔥 -${amount} Seeds debited for ${reasonLabel}. You now have ${totalSeeds} Seeds.`;

const awardSeeds = async ({
  userId,
  reason,
  amount,
  reasonLabel,
  link = "/",
  notify = true,
}) => {
  if (!userId || !reason) {
    return { awarded: false, amount: 0, seeds: null, message: "Missing seed reward data." };
  }

  const config = REWARD_LIMITS[reason] || null;
  const finalAmount = Number.isFinite(Number(amount))
    ? Number(amount)
    : Number(config?.amount || 0);

  if (!finalAmount) {
    return { awarded: false, amount: 0, seeds: null, message: "Seed amount is zero." };
  }

  const user = await User.findById(userId);

  if (!user) {
    return { awarded: false, amount: 0, seeds: null, message: "User not found." };
  }

  user.seeds = Math.max(0, Number(user.seeds || 0));

  if (finalAmount > 0) {
    resetDailyStatsIfNeeded(user);

    if (config?.statKey && Number.isFinite(Number(config.maxDaily))) {
      const currentCount = Number(user.seedDailyStats?.[config.statKey] || 0);

      if (currentCount >= config.maxDaily) {
        return {
          awarded: false,
          amount: 0,
          seeds: user.seeds,
          message: "Daily seed reward limit reached.",
        };
      }

      user.seedDailyStats[config.statKey] = currentCount + 1;
    }

    user.seeds += finalAmount;
    await user.save();

    const message = buildCreditMessage(finalAmount, reasonLabel || reason.replaceAll("_", " "), user.seeds);

    if (notify) {
      await createSeedNotification({
        userId: user._id,
        type: "seed_credit",
        message,
        link,
      });
    }

    return { awarded: true, amount: finalAmount, seeds: user.seeds, message };
  }

  const debitAmount = Math.min(Math.abs(finalAmount), user.seeds);

  if (debitAmount <= 0) {
    return {
      awarded: false,
      amount: 0,
      seeds: user.seeds,
      message: "No Seeds available to debit.",
    };
  }

  user.seeds = Math.max(0, user.seeds - debitAmount);
  await user.save();

  const message = buildDebitMessage(debitAmount, reasonLabel || reason.replaceAll("_", " "), user.seeds);

  if (notify) {
    await createSeedNotification({
      userId: user._id,
      type: "seed_debit",
      message,
      link,
    });
  }

  return { awarded: true, amount: -debitAmount, seeds: user.seeds, message };
};

const debitSeeds = async (options) => awardSeeds(options);

module.exports = {
  REWARD_LIMITS,
  awardSeeds,
  debitSeeds,
};