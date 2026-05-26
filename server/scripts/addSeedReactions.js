/* eslint-disable no-console */
/**
 * Add realistic wateredBy/burnedBy reactions to already-inserted seed posts.
 *
 * Run from server folder:
 *   node scripts/addSeedReactions.js --dry-run
 *   node scripts/addSeedReactions.js
 *
 * This script matches existing MongoDB confessions by message text from server/data/seedStarterPosts.js.
 * It does not create new posts. It only updates reactions on matched seed posts/comments.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Confession = require("../models/Confession");
const User = require("../models/User");
const seedPosts = require("../data/seedStarterPosts");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

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

  // Posts stay below 40 reactions per side.
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

  // Budding: mixed/new. Some equal to keep them neutral.
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

  // Comments never go above 25 on either reaction side.
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

function buildSeedMap() {
  const map = new Map();
  seedPosts.forEach((post, index) => {
    map.set(normalizeText(post.message), { post, index });
  });
  return map;
}

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in server/.env");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected.");

    const users = await User.find({}, "_id").limit(100).lean();
    if (users.length < 2) {
      throw new Error("Need at least 2 users to safely generate reactions without self-react overlap.");
    }

    const seedMap = buildSeedMap();
    const messages = [...seedMap.keys()];
    const existingPosts = await Confession.find({
      message: { $in: seedPosts.map((post) => String(post.message).trim()) },
    });

    console.log(`🌱 Found ${existingPosts.length} existing seed posts by message match.`);
    if (!existingPosts.length) {
      throw new Error("No matching seed posts found. Did you insert the seed content into this MongoDB database?");
    }

    let matched = 0;
    let updated = 0;
    let totalPostWater = 0;
    let totalPostBurn = 0;
    let totalCommentWater = 0;
    let totalCommentBurn = 0;
    const realmSummary = {};

    for (const doc of existingPosts) {
      const match = seedMap.get(normalizeText(doc.message));
      if (!match) continue;
      matched += 1;

      const { post, index } = match;
      const postCounts = getPostReactionCounts(post, index);
      const postReactions = splitReactionUsers(
        users,
        postCounts.watered,
        postCounts.burned,
        9000 + index * 43,
        doc.userId
      );

      doc.wateredBy = postReactions.wateredBy;
      doc.burnedBy = postReactions.burnedBy;

      totalPostWater += doc.wateredBy.length;
      totalPostBurn += doc.burnedBy.length;
      const realmKey = post.realm || "unknown";
      realmSummary[realmKey] = realmSummary[realmKey] || { posts: 0, watered: 0, burned: 0 };
      realmSummary[realmKey].posts += 1;
      realmSummary[realmKey].watered += doc.wateredBy.length;
      realmSummary[realmKey].burned += doc.burnedBy.length;

      const seedCommentByText = new Map(
        post.comments.map((comment, commentIndex) => [normalizeText(getCommentText(comment)), commentIndex])
      );

      doc.comments = doc.comments.map((comment) => {
        const commentIndex = seedCommentByText.get(normalizeText(comment.text));
        if (commentIndex === undefined) return comment;

        const counts = getCommentReactionCounts(post, index, commentIndex);
        const commentReactions = splitReactionUsers(
          users,
          counts.watered,
          counts.burned,
          12000 + index * 211 + commentIndex * 19,
          comment.userId
        );

        comment.wateredBy = commentReactions.wateredBy;
        comment.burnedBy = commentReactions.burnedBy;
        totalCommentWater += comment.wateredBy.length;
        totalCommentBurn += comment.burnedBy.length;
        return comment;
      });

      if (!DRY_RUN) {
        await doc.save();
      }
      updated += 1;
    }

    console.log("\nReaction summary:");
    console.log(`- matched seed posts: ${matched}`);
    console.log(`- ${DRY_RUN ? "would update" : "updated"} posts: ${updated}`);
    console.log(`- total post wateredBy: ${totalPostWater}`);
    console.log(`- total post burnedBy: ${totalPostBurn}`);
    console.log(`- total comment wateredBy: ${totalCommentWater}`);
    console.log(`- total comment burnedBy: ${totalCommentBurn}`);
    console.log("- realm summary:", realmSummary);

    if (DRY_RUN) {
      console.log("\n🧪 Dry run only. Nothing was written to MongoDB.");
    } else {
      console.log("\n✅ Seed reactions added to existing MongoDB posts.");
    }
  } catch (error) {
    console.error("\n❌ Adding seed reactions failed.");
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
