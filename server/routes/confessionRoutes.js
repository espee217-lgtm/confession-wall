const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const express = require("express");
const router = express.Router();
const Confession = require("../models/Confession");
const Notification = require("../models/Notification");
const rateLimit = require("express-rate-limit");
const { protect, blockSuspended } = require("../middleware/auth");
const { sanitizeText } = require("../middleware/sanitizeInput");
const { imageUploadOptions } = require("../middleware/uploadSecurity");
const { reactionLimiter } = require("../middleware/rateLimiter");
const { createAdminLog } = require("../utils/adminLogger");
const { scanSafetyText } = require("../utils/safetyTriage");
const { awardSeeds } = require("../utils/seedRewards");
const {
  applyCommentQuestProgress,
  applyConfessionQuestProgress,
  applyReactionQuestProgress,
} = require("../utils/dailyQuests");
const {
  USER_PUBLIC_SELECT,
  ensureWeeklyEventMaintenance,
  getCurrentWeeklyEventContext,
  getWeeklyEventStatus,
  isCompetitionActive,
  isConfessionEligibleForCompetition,
  syncConfessionWeeklyTracking,
} = require("../utils/weeklyForestEvents");

const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    message: "Too many posts. Please wait before posting again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many comments. Please wait before commenting again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createNotification = async ({ userId, type, message, link }) => {
  try {
    if (!userId) return;

    await Notification.create({
      userId,
      type,
      message,
      link,
    });
  } catch (err) {
    console.error("Create notification error:", err);
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "confessions",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
  },
});

const upload = multer({ storage, ...imageUploadOptions });

const CONFESSION_MOODS = [
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

const COMFORT_CARD_OPTIONS = [
  "I hear you.",
  "You are not alone.",
  "This pain matters.",
  "Sending strength.",
  "You survived this.",
  "May your heart feel lighter.",
];

const CONTENT_WARNING_CATEGORIES = [
  "Heavy / Sensitive",
  "Grief",
  "Self-reflection",
  "Relationship",
  "Vent",
  "Other",
];

const PRIVATE_ENGAGEMENT_SELECT = "+comfortCards.sentBy +poll.voterIds";
const PUBLIC_VISIBLE_FILTER = { isHidden: { $ne: true } };

const toPlainConfession = (confession) =>
  confession?.toObject ? confession.toObject() : confession;

const stripHiddenCommentsFromConfession = (confession) => {
  const plain = toPlainConfession(confession);

  if (!plain || !Array.isArray(plain.comments)) {
    return plain;
  }

  plain.comments = plain.comments.filter((comment) => !comment?.isHidden);
  return plain;
};

const stripHiddenCommentsFromList = (confessions = []) =>
  confessions.map(stripHiddenCommentsFromConfession);

const normalizeOwnedCosmeticIds = (user) =>
  new Set(
    (Array.isArray(user?.ownedCosmetics) ? user.ownedCosmetics : [])
      .map((owned) => (typeof owned === "string" ? owned : owned?.itemId))
      .filter(Boolean)
  );

const sanitizeShortText = (value, maxLength) =>
  sanitizeText(value, { maxLength, allowNewLines: false });

const parseBooleanField = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const parseContentWarningPayload = (body = {}) => {
  const enabled = parseBooleanField(body.contentWarningEnabled);

  if (!enabled) {
    return {
      contentWarning: {
        enabled: false,
        category: "",
        note: "",
        sensitive: false,
      },
    };
  }

  const category = sanitizeShortText(body.contentWarningCategory || "", 40);
  const note = sanitizeShortText(body.contentWarningNote || "", 120);
  const sensitive = parseBooleanField(body.contentWarningSensitive);

  if (!CONTENT_WARNING_CATEGORIES.includes(category)) {
    return { error: "Invalid content warning category." };
  }

  return {
    contentWarning: {
      enabled: true,
      category,
      note,
      sensitive,
    },
  };
};

const buildSelectedPostTheme = (user, requestedTheme) => {
  const value = String(requestedTheme || "").trim();

  if (!value) {
    return { value: "" };
  }

  if (!value.startsWith("post-theme-")) {
    return { error: "Invalid post theme selection." };
  }

  const ownedItemIds = normalizeOwnedCosmeticIds(user);
  const equippedPostTheme = String(user?.equippedCosmetics?.postTheme || "").trim();

  if (!ownedItemIds.has(value) && equippedPostTheme !== value) {
    return { error: "You can only use post themes from your owned cosmetics." };
  }

  return { value };
};

const parsePollPayload = (rawPoll) => {
  if (!rawPoll) {
    return { poll: null };
  }

  let source = rawPoll;

  if (typeof rawPoll === "string") {
    try {
      source = JSON.parse(rawPoll);
    } catch {
      return { error: "Poll data could not be read." };
    }
  }

  const question = sanitizeShortText(source?.question || "", 160);
  const options = Array.isArray(source?.options)
    ? source.options
        .map((option) => sanitizeShortText(option, 80))
        .filter(Boolean)
    : [];

  const hasAnyPollContent = Boolean(question) || options.length > 0;

  if (!hasAnyPollContent) {
    return { poll: null };
  }

  if (!question) {
    return { error: "Poll question is required when adding a poll." };
  }

  if (options.length < 2 || options.length > 4) {
    return { error: "Polls need between 2 and 4 options." };
  }

  return {
    poll: {
      question,
      options: options.map((text) => ({ text, votes: 0 })),
      voterIds: [],
    },
  };
};

const serializeComfortCards = (comfortCards = []) =>
  comfortCards.map((card) => ({
    text: card.text,
    count: card.count || 0,
  }));

const serializePoll = (poll) => {
  if (!poll?.question || !Array.isArray(poll.options)) {
    return null;
  }

  return {
    question: poll.question,
    options: poll.options.map((option) => ({
      text: option.text,
      votes: option.votes || 0,
    })),
  };
};

const PAGINATION_DEFAULT_LIMIT = 10;
const PAGINATION_MAX_LIMIT = 50;
const SEARCH_DEFAULT_LIMIT = 10;
const TRENDING_PERIOD_WINDOWS = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  all: null,
};

const hasPaginationQuery = (query = {}) =>
  Object.prototype.hasOwnProperty.call(query, "page") ||
  Object.prototype.hasOwnProperty.call(query, "limit");

const parsePagination = (query = {}, defaultLimit = PAGINATION_DEFAULT_LIMIT) => {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const requestedLimit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : defaultLimit;
  const limit = Math.max(1, Math.min(PAGINATION_MAX_LIMIT, requestedLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPaginatedResponse = ({ items, page, limit, total }) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasMore: page * limit < total,
});

const SAFETY_FLAGS_MAX = 50;

const arraySizeExpr = (field) => ({ $size: { $ifNull: [`$${field}`, []] } });

const REALM_QUERY = {
  grove: {
    $expr: {
      $gt: [arraySizeExpr("wateredBy"), arraySizeExpr("burnedBy")],
    },
  },
  thriving: {
    $expr: {
      $gt: [arraySizeExpr("wateredBy"), arraySizeExpr("burnedBy")],
    },
  },
  scorched: {
    $expr: {
      $gt: [arraySizeExpr("burnedBy"), arraySizeExpr("wateredBy")],
    },
  },
  budding: {
    $expr: {
      $eq: [arraySizeExpr("wateredBy"), arraySizeExpr("burnedBy")],
    },
  },
};

const getRealmQuery = (realm) => REALM_QUERY[realm] || null;

const getRealmType = (post) => {
  const watered = post?.wateredBy?.length || 0;
  const burned = post?.burnedBy?.length || 0;

  if (watered > burned) return "grove";
  if (burned > watered) return "scorched";
  return "budding";
};

const normalizeMoodFilter = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase().replace(/\s+/g, "-");
  return (
    CONFESSION_MOODS.find((mood) => mood.toLowerCase().replace(/\s+/g, "-") === normalized) ||
    null
  );
};

const parseTrendingPeriod = (value) => {
  const period = String(value || "week").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TRENDING_PERIOD_WINDOWS, period)
    ? period
    : "week";
};

const getTrendingMatch = ({ period, mood }) => {
  const match = { ...PUBLIC_VISIBLE_FILTER };
  const windowMs = TRENDING_PERIOD_WINDOWS[period];

  if (windowMs) {
    match.createdAt = { $gte: new Date(Date.now() - windowMs) };
  }

  if (mood) {
    match.mood = mood;
  }

  return match;
};

const buildPublicQuery = (realm) => {
  const realmQuery = getRealmQuery(realm);
  return realmQuery ? { ...PUBLIC_VISIBLE_FILTER, ...realmQuery } : { ...PUBLIC_VISIBLE_FILTER };
};

// GET all confessions
router.get("/", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const shouldPaginate = hasPaginationQuery(req.query);

    if (!shouldPaginate) {
      const confessions = await Confession.find(PUBLIC_VISIBLE_FILTER)
        .sort({ createdAt: -1 })
        .populate("userId", USER_PUBLIC_SELECT);

      return res.json(stripHiddenCommentsFromList(confessions));
    }

    const { page, limit, skip } = parsePagination(req.query, PAGINATION_DEFAULT_LIMIT);
    const total = await Confession.countDocuments(PUBLIC_VISIBLE_FILTER);
    const confessions = await Confession.find(PUBLIC_VISIBLE_FILTER)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", USER_PUBLIC_SELECT);

    const items = stripHiddenCommentsFromList(confessions);
    res.json(buildPaginatedResponse({ items, page, limit, total }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET thriving confessions
router.get("/realm/thriving", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const query = buildPublicQuery("thriving");
    const shouldPaginate = hasPaginationQuery(req.query);

    if (!shouldPaginate) {
      const confessions = await Confession.find(query)
        .sort({ createdAt: -1 })
        .populate("userId", USER_PUBLIC_SELECT);

      return res.json(stripHiddenCommentsFromList(confessions));
    }

    const { page, limit, skip } = parsePagination(req.query, PAGINATION_DEFAULT_LIMIT);
    const total = await Confession.countDocuments(query);
    const confessions = await Confession.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", USER_PUBLIC_SELECT);

    const items = stripHiddenCommentsFromList(confessions);
    res.json(buildPaginatedResponse({ items, page, limit, total }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET scorched confessions
router.get("/realm/scorched", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const query = buildPublicQuery("scorched");
    const shouldPaginate = hasPaginationQuery(req.query);

    if (!shouldPaginate) {
      const confessions = await Confession.find(query)
        .sort({ createdAt: -1 })
        .populate("userId", USER_PUBLIC_SELECT);

      return res.json(stripHiddenCommentsFromList(confessions));
    }

    const { page, limit, skip } = parsePagination(req.query, PAGINATION_DEFAULT_LIMIT);
    const total = await Confession.countDocuments(query);
    const confessions = await Confession.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", USER_PUBLIC_SELECT);

    const items = stripHiddenCommentsFromList(confessions);
    res.json(buildPaginatedResponse({ items, page, limit, total }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET budding confessions
router.get("/realm/budding", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const query = buildPublicQuery("budding");
    const shouldPaginate = hasPaginationQuery(req.query);

    if (!shouldPaginate) {
      const confessions = await Confession.find(query)
        .sort({ createdAt: -1 })
        .populate("userId", USER_PUBLIC_SELECT);

      return res.json(stripHiddenCommentsFromList(confessions));
    }

    const { page, limit, skip } = parsePagination(req.query, PAGINATION_DEFAULT_LIMIT);
    const total = await Confession.countDocuments(query);
    const confessions = await Confession.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", USER_PUBLIC_SELECT);

    const items = stripHiddenCommentsFromList(confessions);
    res.json(buildPaginatedResponse({ items, page, limit, total }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// SEARCH confessions
// Query params:
// q = text/username search
// type = all | grove | budding | scorched
router.get("/search", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all").trim().toLowerCase();
    const shouldPaginate = hasPaginationQuery(req.query);
    const realm = ["grove", "budding", "scorched"].includes(type) ? type : null;
    const baseQuery = buildPublicQuery(realm);

    const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const textQuery = q
      ? {
          ...baseQuery,
          $or: [
            { message: { $regex: safeRegex, $options: "i" } },
            { "comments.text": { $regex: safeRegex, $options: "i" } },
          ],
        }
      : { ...baseQuery };

    if (shouldPaginate && !q) {
      const { page, limit, skip } = parsePagination(req.query, SEARCH_DEFAULT_LIMIT);
      const total = await Confession.countDocuments(baseQuery);
      const confessions = await Confession.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", USER_PUBLIC_SELECT);

      const items = stripHiddenCommentsFromList(confessions);
      return res.json(buildPaginatedResponse({ items, page, limit, total }));
    }

    const textLimit = shouldPaginate ? 0 : 80;
    const usernameLimit = shouldPaginate ? 0 : 120;
    const textMatchQuery = Confession.find(textQuery).sort({ createdAt: -1 });

    if (textLimit > 0) {
      textMatchQuery.limit(textLimit);
    }

    let confessions = await textMatchQuery.populate("userId", USER_PUBLIC_SELECT);

    // Also allow searching by username after population.
    if (q) {
      const lower = q.toLowerCase();
      const usernameQuery = Confession.find(baseQuery).sort({ createdAt: -1 });

      if (usernameLimit > 0) {
        usernameQuery.limit(usernameLimit);
      }

      const usernameMatches = await usernameQuery.populate("userId", USER_PUBLIC_SELECT);
      const byUsername = usernameMatches.filter((post) =>
        String(post.userId?.username || "").toLowerCase().includes(lower)
      );

      const map = new Map();
      [...confessions, ...byUsername].forEach((post) => map.set(String(post._id), post));
      confessions = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (realm) {
      confessions = confessions.filter((post) => getRealmType(post) === realm);
    }

    if (!shouldPaginate) {
      return res.json(stripHiddenCommentsFromList(confessions.slice(0, 60)));
    }

    const { page, limit, skip } = parsePagination(req.query, SEARCH_DEFAULT_LIMIT);
    const total = confessions.length;
    const pageItems = confessions.slice(skip, skip + limit);
    const items = stripHiddenCommentsFromList(pageItems);
    res.json(buildPaginatedResponse({ items, page, limit, total }));
  } catch (err) {
    console.error("Search confessions error:", err);
    res.status(500).json({ message: "Could not search confessions right now." });
  }
});

// GET trending public confessions
router.get("/trending", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();

    const { page, limit, skip } = parsePagination(req.query, PAGINATION_DEFAULT_LIMIT);
    const period = parseTrendingPeriod(req.query.period);
    const mood = normalizeMoodFilter(req.query.mood);

    if (req.query.mood && !mood) {
      return res.status(400).json({ message: "Invalid mood filter." });
    }

    const match = getTrendingMatch({ period, mood });
    const total = await Confession.countDocuments(match);
    const visibleCommentsExpr = {
      $filter: {
        input: { $ifNull: ["$comments", []] },
        as: "comment",
        cond: { $ne: ["$$comment.isHidden", true] },
      },
    };
    const comfortCardTotalExpr = {
      $sum: {
        $map: {
          input: { $ifNull: ["$comfortCards", []] },
          as: "card",
          in: { $ifNull: ["$$card.count", 0] },
        },
      },
    };

    const confessions = await Confession.aggregate([
      { $match: match },
      {
        $addFields: {
          visibleComments: visibleCommentsExpr,
          wateredCount: arraySizeExpr("wateredBy"),
          burnedCount: arraySizeExpr("burnedBy"),
          comfortCardCount: comfortCardTotalExpr,
        },
      },
      {
        $addFields: {
          visibleCommentCount: { $size: "$visibleComments" },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: ["$wateredCount", 2] },
              { $multiply: ["$visibleCommentCount", 3] },
              "$comfortCardCount",
              "$burnedCount",
            ],
          },
        },
      },
      { $sort: { trendingScore: -1, createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          "comfortCards.sentBy": 0,
          "poll.voterIds": 0,
          seedReactionRewardedBy: 0,
          visibleComments: 0,
          wateredCount: 0,
          burnedCount: 0,
          comfortCardCount: 0,
          visibleCommentCount: 0,
          trendingScore: 0,
        },
      },
    ]);

    const populated = await Confession.populate(confessions, {
      path: "userId",
      select: USER_PUBLIC_SELECT,
    });
    const items = stripHiddenCommentsFromList(populated);

    res.json(buildPaginatedResponse({ items, page, limit, total }));
  } catch (err) {
    console.error("Trending confessions error:", err);
    res.status(500).json({ message: "Could not load trending confessions right now." });
  }
});

// GET current weekly event status and leaderboard
router.get("/weekly-event", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const status = await getWeeklyEventStatus(new Date(), {
      includeHidden: false,
    });
    res.json(status);
  } catch (err) {
    console.error("Weekly event status error:", err.message);
    res.status(500).json({
      message: "Could not load the weekly event right now.",
    });
  }
});

// GET single confession by ID
router.get("/:id", async (req, res) => {
  try {
    await ensureWeeklyEventMaintenance();
    const confession = await Confession.findOne({
      _id: req.params.id,
      isHidden: { $ne: true },
    })
      .populate("userId", USER_PUBLIC_SELECT)
      .populate("comments.userId", USER_PUBLIC_SELECT);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    res.json(stripHiddenCommentsFromConfession(confession));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post(
  "/",
  protect,
  blockSuspended,
  postLimiter,
  upload.single("image"),
  async (req, res) => {
    try {
      const message = sanitizeText(req.body.message, { maxLength: 2000, allowNewLines: true });
      const mood = sanitizeShortText(req.body.mood || "", 20);
      const moodValue = mood || undefined;
      const { value: postTheme = "", error: postThemeError } = buildSelectedPostTheme(
        req.user,
        req.body.postTheme || req.body.postThemeId
      );
      const { poll, error: pollError } = parsePollPayload(req.body.poll);
      const { contentWarning, error: contentWarningError } = parseContentWarningPayload(
        req.body
      );

      if (!message && !req.file) {
        return res.status(400).json({ message: "Post text or image is required." });
      }

      if (moodValue && !CONFESSION_MOODS.includes(moodValue)) {
        return res.status(400).json({ message: "Invalid mood selection." });
      }

      if (postThemeError) {
        return res.status(400).json({ message: postThemeError });
      }

      if (pollError) {
        return res.status(400).json({ message: pollError });
      }

      if (contentWarningError) {
        return res.status(400).json({ message: contentWarningError });
      }

      const newConfession = new Confession({
        userId: req.user._id,
        message,
        image: req.file ? req.file.path : null,
        mood: moodValue,
        postTheme,
        contentWarning,
        poll: poll || undefined,
        comfortCards: [],
        comments: [],
        safetyFlags: scanSafetyText(message, { source: "post" }),
      });

      const currentWeeklyEvent = getCurrentWeeklyEventContext(new Date());

      if (
        isCompetitionActive(currentWeeklyEvent) &&
        isConfessionEligibleForCompetition(newConfession, currentWeeklyEvent)
      ) {
        syncConfessionWeeklyTracking(newConfession, currentWeeklyEvent, {
          observedAt: new Date(),
        });
      }

      const saved = await newConfession.save();

      const populated = await Confession.findById(saved._id).populate(
        "userId",
        USER_PUBLIC_SELECT
      );

      await createAdminLog({
        req,
        type: "post_create",
        message: `@${req.user.username || "Someone"} created a new post.`,
        user: req.user,
        targetId: saved._id,
        targetType: "confession",
        metadata: {
          hasImage: Boolean(req.file),
          mood: moodValue || "",
          postTheme,
          hasPoll: Boolean(poll),
        },
      });

      const seedReward = await awardSeeds({
        userId: req.user._id,
        reason: "post_create",
        reasonLabel: "creating a post",
        link: `/confession/${saved._id}`,
      });

      await applyConfessionQuestProgress(req.user._id, `/confession/${saved._id}`);

      const responsePost = populated?.toObject ? populated.toObject() : populated;
      responsePost.seedReward = seedReward;

      res.json(responsePost);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// SEND an anonymous comfort card to a confession
router.post(
  "/:id/comfort-cards",
  protect,
  blockSuspended,
  reactionLimiter,
  async (req, res) => {
    try {
      const text = sanitizeShortText(req.body.text || "", 60);

      if (!COMFORT_CARD_OPTIONS.includes(text)) {
        return res.status(400).json({ message: "Invalid comfort card." });
      }

      const confession = await Confession.findById(req.params.id).select(
        PRIVATE_ENGAGEMENT_SELECT
      );

      if (!confession) {
        return res.status(404).json({ message: "Confession not found." });
      }

      const userId = req.user._id;
      let comfortCard = confession.comfortCards.find((card) => card.text === text);

      if (!comfortCard) {
        confession.comfortCards.push({
          text,
          count: 0,
          sentBy: [],
        });
        comfortCard = confession.comfortCards[confession.comfortCards.length - 1];
      }

      const alreadySent = comfortCard.sentBy?.some((id) => id.equals(userId));

      if (alreadySent) {
        return res.status(400).json({
          message: "You already sent that comfort card to this confession.",
        });
      }

      comfortCard.sentBy.push(userId);
      comfortCard.count += 1;

      await confession.save();

      if (confession.userId && !confession.userId.equals(userId)) {
        await createNotification({
          userId: confession.userId,
          type: "comment",
          message: `${req.user.username || "Someone"} sent a comfort card to your confession.`,
          link: `/confession/${confession._id}`,
        });
      }

      res.json({
        comfortCards: serializeComfortCards(confession.comfortCards),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// VOTE on an anonymous poll
router.post(
  "/:id/poll-vote",
  protect,
  blockSuspended,
  reactionLimiter,
  async (req, res) => {
    try {
      const optionIndex = Number(req.body.optionIndex);
      const confession = await Confession.findById(req.params.id).select(
        PRIVATE_ENGAGEMENT_SELECT
      );

      if (!confession) {
        return res.status(404).json({ message: "Confession not found." });
      }

      if (!confession.poll?.question || !Array.isArray(confession.poll.options)) {
        return res.status(400).json({ message: "This confession does not have a poll." });
      }

      if (
        !Number.isInteger(optionIndex) ||
        optionIndex < 0 ||
        optionIndex >= confession.poll.options.length
      ) {
        return res.status(400).json({ message: "Invalid poll option." });
      }

      const alreadyVoted = confession.poll.voterIds?.some((id) => id.equals(req.user._id));

      if (alreadyVoted) {
        return res.status(400).json({ message: "You have already voted on this poll." });
      }

      confession.poll.options[optionIndex].votes += 1;
      confession.poll.voterIds.push(req.user._id);

      await confession.save();

      res.json({
        poll: serializePoll(confession.poll),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE a confession
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Confession.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Confession not found" });
    }

    res.json({ message: "Confession deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a comment to a confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post(
  "/:id/comments",
  protect,
  blockSuspended,
  commentLimiter,
  upload.single("image"),
  async (req, res) => {
    try {
      const confession = await Confession.findById(req.params.id);

      if (!confession) {
        return res.status(404).json({ message: "Confession not found" });
      }

      const text = sanitizeText(req.body.text, { maxLength: 1000, allowNewLines: true });

      if (!text && !req.file) {
        return res.status(400).json({ message: "Comment text or image is required." });
      }

      confession.comments.push({
        text,
        image: req.file ? req.file.path : null,
        userId: req.user._id,
      });

      const newComment = confession.comments[confession.comments.length - 1];

      const commentSafetyFlags = scanSafetyText(text, {
        source: "comment",
        commentId: newComment?._id || null,
      });

      if (commentSafetyFlags.length > 0) {
        const existingSafetyFlags = Array.isArray(confession.safetyFlags)
          ? confession.safetyFlags
          : [];

        confession.safetyFlags = [...existingSafetyFlags, ...commentSafetyFlags]
          .sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0))
          .slice(-SAFETY_FLAGS_MAX);
      }

      await confession.save();

      const postOwnerId = confession.userId;
      const commenterId = req.user._id;

      if (postOwnerId && !postOwnerId.equals(commenterId)) {
        await createNotification({
          userId: postOwnerId,
          type: "comment",
          message: `${req.user.username || "Someone"} commented on your post.`,
          link: `/confession/${confession._id}`,
        });
      }

      await createAdminLog({
        req,
        type: "comment_create",
        message: `@${req.user.username || "Someone"} commented on a post.`,
        user: req.user,
        targetId: newComment?._id || confession._id,
        targetType: "comment",
        metadata: {
          confessionId: String(confession._id),
          hasImage: Boolean(req.file),
        },
      });

      const seedReward = await awardSeeds({
        userId: req.user._id,
        reason: "comment_create",
        reasonLabel: "creating a comment",
        link: `/confession/${confession._id}`,
      });

      await applyCommentQuestProgress(req.user._id, `/confession/${confession._id}`);

      const updated = await Confession.findById(req.params.id)
        .populate("userId", USER_PUBLIC_SELECT)
        .populate("comments.userId", USER_PUBLIC_SELECT);

      const responsePost = stripHiddenCommentsFromConfession(updated);
      responsePost.seedReward = seedReward;

      res.json(responsePost);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// REACT to a confession
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post("/:id/react", protect, blockSuspended, reactionLimiter, async (req, res) => {
  try {
    const { type } = req.body;

    if (!["water", "burn"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const confession = await Confession.findById(req.params.id);

    if (!confession) {
      return res.status(404).json({ error: "Not found" });
    }

    const userId = req.user._id;
    const addField = type === "water" ? "wateredBy" : "burnedBy";
    const removeField = type === "water" ? "burnedBy" : "wateredBy";

    const alreadyVoted = confession[addField].some((id) => id.equals(userId));
    const hadAnyReactionBefore =
      confession.wateredBy.some((id) => id.equals(userId)) ||
      confession.burnedBy.some((id) => id.equals(userId));

    if (alreadyVoted) {
      confession[addField].pull(userId);
    } else {
      confession[removeField].pull(userId);
      confession[addField].push(userId);
    }

    let seedReward = null;
    const currentWeeklyEvent = getCurrentWeeklyEventContext(new Date());

    if (!alreadyVoted && confession.userId && !confession.userId.equals(userId)) {
      await createNotification({
        userId: confession.userId,
        type: "reaction",
        message:
          type === "water"
            ? `${req.user.username || "Someone"} watered your post.`
            : `${req.user.username || "Someone"} burned your post.`,
        link: `/confession/${confession._id}`,
      });

      const alreadyRewardedForThisReactor = confession.seedReactionRewardedBy?.some((id) =>
        id.equals(userId)
      );

      if (!hadAnyReactionBefore && !alreadyRewardedForThisReactor) {
        seedReward = await awardSeeds({
          userId: confession.userId,
          reason: "post_reaction_received",
          reasonLabel: "someone reacting to your post",
          link: `/confession/${confession._id}`,
        });

        confession.seedReactionRewardedBy.push(userId);
      }
    }

    if (
      isCompetitionActive(currentWeeklyEvent) &&
      isConfessionEligibleForCompetition(confession, currentWeeklyEvent)
    ) {
      syncConfessionWeeklyTracking(confession, currentWeeklyEvent, {
        observedAt: new Date(),
      });
    }

    await confession.save();

    if (!alreadyVoted) {
      await applyReactionQuestProgress(userId, confession._id, `/confession/${confession._id}`);
    }

    res.json({
      wateredBy: confession.wateredBy,
      burnedBy: confession.burnedBy,
      seedReward,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REACT to a comment
// Banned users are blocked by protect.
// Suspended users are blocked by blockSuspended.
router.post(
  "/:id/comments/:commentIndex/react",
  protect,
  blockSuspended,
  reactionLimiter,
  async (req, res) => {
    try {
      const { type } = req.body;

      if (!["water", "burn"].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      const confession = await Confession.findById(req.params.id);

      if (!confession) {
        return res.status(404).json({ error: "Not found" });
      }

      const comment = confession.comments[req.params.commentIndex];

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const userId = req.user._id;
      const addField = type === "water" ? "wateredBy" : "burnedBy";
      const removeField = type === "water" ? "burnedBy" : "wateredBy";

      const alreadyVoted = comment[addField].some((id) => id.equals(userId));

      if (alreadyVoted) {
        comment[addField].pull(userId);
      } else {
        comment[removeField].pull(userId);
        comment[addField].push(userId);
      }

      await confession.save();

      if (!alreadyVoted && comment.userId && !comment.userId.equals(userId)) {
        await createNotification({
          userId: comment.userId,
          type: "reaction",
          message:
            type === "water"
              ? `${req.user.username || "Someone"} watered your comment.`
              : `${req.user.username || "Someone"} burned your comment.`,
          link: `/confession/${confession._id}`,
        });
      }

      res.json({
        wateredBy: comment.wateredBy,
        burnedBy: comment.burnedBy,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
