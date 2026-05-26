/* eslint-disable no-console */
/**
 * Seed Confession Wall starter content into MongoDB.
 *
 * Run from the server folder:
 *   node scripts/seedStarterContent.js --dry-run
 *   node scripts/seedStarterContent.js
 *
 * Optional safer modes:
 *   node scripts/seedStarterContent.js --replace-seed
 *   node scripts/seedStarterContent.js --allow-short-comments
 *
 * Required env:
 *   MONGO_URI=your_mongodb_connection_string
 *
 * Optional env:
 *   SEED_USER_ID=existing_user_object_id_to_use_for_all_posts
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Confession = require("../models/Confession");
const User = require("../models/User");
const seedPosts = require("../data/seedStarterPosts");

const EXPECTED_TOTAL_CONFESSIONS = 97;
const EXPECTED_MOOD_COUNTS = {
  Hopeful: 20,
  Heavy: 20,
  Angry: 20,
  Lonely: 20,
  Love: 17,
};

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const REPLACE_SEED = args.has("--replace-seed");
const ALLOW_SHORT_COMMENTS = args.has("--allow-short-comments");

const COMFORT_CARD_OPTIONS = [
  "I hear you.",
  "You are not alone.",
  "This pain matters.",
  "Sending strength.",
  "You survived this.",
  "May your heart feel lighter.",
];

function normalizeText(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCommentText(comment) {
  if (typeof comment === "string") return comment;
  return comment?.text;
}

function getPostLocation(index, post) {
  const mood = post?.mood || "unknown mood";
  const realm = post?.realm || "unknown realm";
  return `post #${index + 1} (${mood}/${realm})`;
}

function throwDuplicateError(type, duplicateText, firstLocation, secondLocation) {
  throw new Error(
    `[Seed validation failed] Duplicate ${type}: "${duplicateText}"\n` +
      `First location: ${firstLocation}\n` +
      `Second location: ${secondLocation}`
  );
}

function assertUniqueSeedContent(confessions) {
  const confessionTextMap = new Map();
  const commentTextMap = new Map();

  confessions.forEach((post, postIndex) => {
    const postLocation = getPostLocation(postIndex, post);
    const normalizedMessage = normalizeText(post?.message);
    const rawMessage = String(post?.message ?? "").trim();

    if (confessionTextMap.has(normalizedMessage)) {
      throwDuplicateError(
        "confession message",
        rawMessage,
        confessionTextMap.get(normalizedMessage),
        `${postLocation}.message`
      );
    }
    confessionTextMap.set(normalizedMessage, `${postLocation}.message`);

    const perPostCommentMap = new Map();
    const comments = Array.isArray(post?.comments) ? post.comments : [];

    comments.forEach((comment, commentIndex) => {
      const rawCommentText = String(getCommentText(comment) ?? "").trim();
      const normalizedCommentText = normalizeText(rawCommentText);
      const commentLocation = `${postLocation}.comments[${commentIndex}]`;

      if (perPostCommentMap.has(normalizedCommentText)) {
        throwDuplicateError(
          "comment inside same post",
          rawCommentText,
          perPostCommentMap.get(normalizedCommentText),
          commentLocation
        );
      }
      perPostCommentMap.set(normalizedCommentText, commentLocation);

      if (commentTextMap.has(normalizedCommentText)) {
        throwDuplicateError(
          "comment text globally",
          rawCommentText,
          commentTextMap.get(normalizedCommentText),
          commentLocation
        );
      }
      commentTextMap.set(normalizedCommentText, commentLocation);
    });
  });

  for (const [normalizedMessage, messageLocation] of confessionTextMap.entries()) {
    if (commentTextMap.has(normalizedMessage)) {
      throwDuplicateError(
        "confession/comment text collision",
        normalizedMessage,
        messageLocation,
        commentTextMap.get(normalizedMessage)
      );
    }
  }
}

function looksLikePushbackOrChallenge(comment) {
  const role = normalizeText(comment?.role);
  const text = normalizeText(getCommentText(comment));

  return (
    role.includes("pushback") ||
    role.includes("challenge") ||
    role.includes("challenging") ||
    role.includes("accountability") ||
    role.includes("blunt") ||
    role.includes("disagreer") ||
    role.includes("sharp") ||
    /\b(but|however|still|wrong|unfair|accountability|boundary|scoreboard|you also|your part|not okay|missing context|too far|you kept|you waited|you chose)\b/.test(text)
  );
}

function buildSeedSummary(confessions) {
  const moodCounts = {};
  const realmCounts = {};
  let totalComments = 0;
  const uniqueMessages = new Set();
  const uniqueComments = new Set();

  confessions.forEach((post) => {
    moodCounts[post?.mood || "unknown"] = (moodCounts[post?.mood || "unknown"] || 0) + 1;
    realmCounts[post?.realm || "unknown"] = (realmCounts[post?.realm || "unknown"] || 0) + 1;
    uniqueMessages.add(normalizeText(post?.message));

    const comments = Array.isArray(post?.comments) ? post.comments : [];
    totalComments += comments.length;
    comments.forEach((comment) => uniqueComments.add(normalizeText(getCommentText(comment))));
  });

  return {
    totalConfessions: confessions.length,
    uniqueConfessionTexts: uniqueMessages.size,
    totalComments,
    uniqueCommentTexts: uniqueComments.size,
    countByMood: moodCounts,
    countByRealmCategory: realmCounts,
  };
}

function assertQuality(confessions) {
  if (!Array.isArray(confessions)) {
    throw new Error("[Seed validation failed] Seed content must be an array.");
  }

  if (confessions.length !== EXPECTED_TOTAL_CONFESSIONS) {
    throw new Error(
      `[Seed validation failed] Expected ${EXPECTED_TOTAL_CONFESSIONS} confessions, found ${confessions.length}.`
    );
  }

  const moodCounts = {};

  confessions.forEach((post, postIndex) => {
    const postLocation = getPostLocation(postIndex, post);
    const message = String(post?.message ?? "").trim();

    if (!message) {
      throw new Error(`[Seed validation failed] Empty confession message at ${postLocation}.message`);
    }

    const mood = post?.mood || "unknown";
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;

    if (!Array.isArray(post?.comments)) {
      throw new Error(`[Seed validation failed] Missing comments array at ${postLocation}.comments`);
    }

    if (post.comments.length < 5 || post.comments.length > 9) {
      throw new Error(
        `[Seed validation failed] ${postLocation} has ${post.comments.length} comments. Expected 5–9.`
      );
    }

    post.comments.forEach((comment, commentIndex) => {
      const commentText = String(getCommentText(comment) ?? "").trim();
      const commentLocation = `${postLocation}.comments[${commentIndex}]`;

      if (!commentText) {
        throw new Error(`[Seed validation failed] Empty comment at ${commentLocation}`);
      }

      if (!ALLOW_SHORT_COMMENTS && commentText.length < 12) {
        throw new Error(
          `[Seed validation failed] Short comment at ${commentLocation}: "${commentText}"\n` +
            `Length: ${commentText.length}. Use --allow-short-comments only if intentional.`
        );
      }
    });

    if (normalizeText(post?.realm) === "scorched" || mood === "Angry") {
      const challengeCount = post.comments.filter(looksLikePushbackOrChallenge).length;
      if (post.comments.length >= 5 && challengeCount < 2) {
        throw new Error(
          `[Seed validation failed] ${postLocation} needs at least two pushback/challenging comments. Found ${challengeCount}.`
        );
      }
    }
  });

  for (const [mood, expectedCount] of Object.entries(EXPECTED_MOOD_COUNTS)) {
    const actualCount = moodCounts[mood] || 0;
    if (actualCount !== expectedCount) {
      throw new Error(
        `[Seed validation failed] Mood count mismatch for ${mood}. Expected ${expectedCount}, found ${actualCount}.`
      );
    }
  }
}

function validateSeedDatasetBeforeDb(confessions) {
  console.log("\n🔎 Validating seed dataset before MongoDB connection...");
  assertUniqueSeedContent(confessions);
  assertQuality(confessions);

  const summary = buildSeedSummary(confessions);
  console.log("\n✅ Seed validation passed.");
  console.log("Seed summary:");
  console.log(`- total confessions: ${summary.totalConfessions}`);
  console.log(`- unique confession texts: ${summary.uniqueConfessionTexts}`);
  console.log(`- total comments: ${summary.totalComments}`);
  console.log(`- unique comment texts: ${summary.uniqueCommentTexts}`);
  console.log("- count by mood:", summary.countByMood);
  console.log("- count by realm/category:", summary.countByRealmCategory);
  console.log("");
}

function pickUserId(users, index) {
  if (!users.length) return undefined;
  return users[index % users.length]._id;
}


function createSeededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return function nextRandom() {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffleCopy(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickReactionUserIds(users, count, random, excludedUserId) {
  const excluded = excludedUserId ? String(excludedUserId) : null;
  const pool = users
    .map((user) => user._id)
    .filter((userId) => String(userId) !== excluded);

  if (!pool.length || count <= 0) return [];
  return shuffleCopy(pool, random).slice(0, Math.min(count, pool.length));
}

function splitReactionUsers(users, waterCount, burnCount, seed, excludedUserId) {
  const random = createSeededRandom(seed);
  const excluded = excludedUserId ? String(excludedUserId) : null;
  const pool = users
    .map((user) => user._id)
    .filter((userId) => String(userId) !== excluded);
  const shuffled = shuffleCopy(pool, random);

  const wateredBy = shuffled.slice(0, Math.min(waterCount, shuffled.length));
  const remaining = shuffled.slice(wateredBy.length);
  const burnedBy = remaining.slice(0, Math.min(burnCount, remaining.length));

  return { wateredBy, burnedBy };
}

function getPostReactionCounts(post, index) {
  const random = createSeededRandom(1000 + index * 97);
  const realm = normalizeText(post?.realm);
  const mood = normalizeText(post?.mood);

  if (realm === "scorched" || mood === "angry") {
    const watered = randomInt(random, 2, 14);
    const burned = randomInt(random, Math.min(18, watered + 5), 39);
    return { watered, burned };
  }

  if (realm === "grove") {
    const burned = randomInt(random, 0, 8);
    const watered = randomInt(random, Math.max(9, burned + 4), 39);
    return { watered, burned };
  }

  // Budding should feel mixed/new. Some are exactly equal so they stay neutral.
  if (index % 3 === 0) {
    const equal = randomInt(random, 0, 14);
    return { watered: equal, burned: equal };
  }
  if (index % 3 === 1) {
    const watered = randomInt(random, 0, 18);
    const burned = randomInt(random, 0, Math.min(18, watered + 2));
    return { watered, burned };
  }
  const burned = randomInt(random, 0, 18);
  const watered = randomInt(random, 0, Math.min(18, burned + 2));
  return { watered, burned };
}

function getCommentReactionCounts(post, postIndex, commentIndex) {
  const random = createSeededRandom(5000 + postIndex * 131 + commentIndex * 17);
  const realm = normalizeText(post?.realm);
  const mood = normalizeText(post?.mood);

  // Comment reactions are intentionally smaller: never above 25.
  if (realm === "scorched" || mood === "angry") {
    if (commentIndex % 3 === 0) {
      const watered = randomInt(random, 0, 8);
      const burned = randomInt(random, watered + 1, 25);
      return { watered, burned };
    }
    return { watered: randomInt(random, 0, 18), burned: randomInt(random, 0, 18) };
  }

  if (realm === "grove") {
    const burned = randomInt(random, 0, 5);
    const watered = randomInt(random, burned, 25);
    return { watered, burned };
  }

  if (commentIndex % 4 === 0) {
    const equal = randomInt(random, 0, 10);
    return { watered: equal, burned: equal };
  }
  return { watered: randomInt(random, 0, 16), burned: randomInt(random, 0, 16) };
}

function buildReactionArrays(post, users, postIndex, postUserId) {
  const postCounts = getPostReactionCounts(post, postIndex);
  const postReactions = splitReactionUsers(
    users,
    postCounts.watered,
    postCounts.burned,
    9000 + postIndex * 43,
    postUserId
  );

  const commentReactions = post.comments.map((comment, commentIndex) => {
    const counts = getCommentReactionCounts(post, postIndex, commentIndex);
    return splitReactionUsers(
      users,
      counts.watered,
      counts.burned,
      12000 + postIndex * 211 + commentIndex * 19,
      comment.userId
    );
  });

  return { postReactions, commentReactions };
}


function pickComfortUserIds(users, count, random, excludedUserId) {
  const excluded = excludedUserId ? String(excludedUserId) : null;
  const pool = users
    .map((user) => user._id)
    .filter((userId) => String(userId) !== excluded);

  if (!pool.length || count <= 0) return [];

  return shuffleCopy(pool, random).slice(0, Math.min(count, pool.length));
}

function getComfortCardShape(post, index) {
  const random = createSeededRandom(9000 + index * 149);
  const realm = normalizeText(post?.realm);
  const mood = normalizeText(post?.mood);

  if (realm === "scorched" || mood === "angry") {
    return {
      cardTypes: randomInt(random, 1, 3),
      minCount: 1,
      maxCount: 5,
    };
  }

  if (realm === "grove" || mood === "hopeful") {
    return {
      cardTypes: randomInt(random, 2, 5),
      minCount: 1,
      maxCount: 8,
    };
  }

  return {
    cardTypes: randomInt(random, 1, 4),
    minCount: 1,
    maxCount: 6,
  };
}

function buildComfortCards(post, users, index, postOwnerId) {
  const random = createSeededRandom(11000 + index * 173);
  const { cardTypes, minCount, maxCount } = getComfortCardShape(post, index);
  const selectedTexts = shuffleCopy(COMFORT_CARD_OPTIONS, random).slice(0, cardTypes);

  return selectedTexts
    .map((text, cardIndex) => {
      const cardRandom = createSeededRandom(13000 + index * 191 + cardIndex * 23);
      const count = randomInt(cardRandom, minCount, maxCount);
      const sentBy = pickComfortUserIds(users, count, cardRandom, postOwnerId);

      return {
        text,
        count: sentBy.length,
        sentBy,
      };
    })
    .filter((card) => card.count > 0);
}

function toMongoConfessionDoc(post, users, index) {
  const userId = process.env.SEED_USER_ID || pickUserId(users, index);
  const baseComments = post.comments.map((comment, commentIndex) => ({
    userId: process.env.SEED_USER_ID || pickUserId(users, index + commentIndex + 1),
    text: String(getCommentText(comment)).trim(),
    image: comment.image || "",
    wateredBy: [],
    burnedBy: [],
    createdAt: new Date(),
  }));

  const postForReactions = { ...post, comments: baseComments };
  const { postReactions, commentReactions } = buildReactionArrays(postForReactions, users, index, userId);

  return {
    userId,
    message: String(post.message).trim(),
    image: post.image || "",
    wateredBy: postReactions.wateredBy,
    burnedBy: postReactions.burnedBy,
    comfortCards: buildComfortCards(post, users, index, userId),
    comments: baseComments.map((comment, commentIndex) => ({
      ...comment,
      wateredBy: commentReactions[commentIndex].wateredBy,
      burnedBy: commentReactions[commentIndex].burnedBy,
    })),

    // These metadata fields will be kept only if your Mongoose schema allows them.
    // If your Confession schema is strict and does not define them, Mongoose will ignore them safely.
    mood: post.mood,
    realm: post.realm,
    narratorFlaw: post.narratorFlaw,
    ordinaryDetailUsed: post.ordinaryDetailUsed,
    isSeedContent: true,
  };
}

async function main() {
  try {
    // IMPORTANT: Validation happens BEFORE MongoDB connection/write.
    validateSeedDatasetBeforeDb(seedPosts);

    if (DRY_RUN) {
      console.log("🧪 Dry run only. MongoDB was not connected and nothing was inserted.");
      return;
    }

    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in server/.env");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected.");

    const users = await User.find({}, "_id").limit(100).lean();
    if (!users.length && !process.env.SEED_USER_ID) {
      throw new Error(
        "No users found. Create at least one user first, or set SEED_USER_ID in server/.env."
      );
    }

    if (REPLACE_SEED) {
      console.log("🧹 Removing previous seed content first...");
      await Confession.deleteMany({ isSeedContent: true });
    }

    const docs = seedPosts.map((post, index) => toMongoConfessionDoc(post, users, index));

    console.log(`🌱 Inserting ${docs.length} seed confessions...`);
    const result = await Confession.insertMany(docs, { ordered: true });
    console.log(`✅ Inserted ${result.length} seed confessions.`);
  } catch (error) {
    console.error("\n❌ Seed starter content failed.");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("🔌 MongoDB disconnected.");
    }
  }
}

main();
