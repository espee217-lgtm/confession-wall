/* eslint-disable no-console */
/**
 * Add random comfort cards to already-inserted seed posts.
 *
 * Run from the server folder:
 *   node scripts/addSeedComfortCards.js --dry-run
 *   node scripts/addSeedComfortCards.js
 *
 * This script matches existing MongoDB confessions by message text from server/data/seedStarterPosts.js.
 * It does not create posts. It only updates comfortCards on matched seed posts.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Confession = require("../models/Confession");
const User = require("../models/User");
const seedPosts = require("../data/seedStarterPosts");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

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

function pickUserIds(users, count, random, excludedUserId) {
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

  // Every seed post gets at least one card so the section feels lived-in.
  // Keep it varied so the right-side comfort card panel does not look identical everywhere.
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

  // Budding / heavy / lonely / love: quieter, mixed support.
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

  return selectedTexts.map((text, cardIndex) => {
    const cardRandom = createSeededRandom(13000 + index * 191 + cardIndex * 23);
    const count = randomInt(cardRandom, minCount, maxCount);
    const sentBy = pickUserIds(users, count, cardRandom, postOwnerId);

    return {
      text,
      count: sentBy.length,
      sentBy,
    };
  }).filter((card) => card.count > 0);
}

async function main() {
  let matched = 0;
  let missing = 0;
  let totalCards = 0;
  let totalCardSends = 0;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in server/.env");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected.");

    const users = await User.find({}, "_id").limit(100).lean();
    if (!users.length) {
      throw new Error("No users found. Comfort cards need existing users for sentBy.");
    }

    console.log(`🫂 ${DRY_RUN ? "Dry-run checking" : "Adding"} comfort cards for ${seedPosts.length} seed posts...`);

    for (let index = 0; index < seedPosts.length; index += 1) {
      const seedPost = seedPosts[index];
      const normalizedSeedMessage = normalizeText(seedPost.message);

      const confession = await Confession.findOne({
        message: String(seedPost.message || "").trim(),
      }).select("+comfortCards.sentBy");

      if (!confession) {
        missing += 1;
        console.log(`⚠️ Missing post #${index + 1}: ${normalizedSeedMessage.slice(0, 90)}...`);
        continue;
      }

      const comfortCards = buildComfortCards(seedPost, users, index, confession.userId);

      matched += 1;
      totalCards += comfortCards.length;
      totalCardSends += comfortCards.reduce((sum, card) => sum + (card.count || 0), 0);

      if (!DRY_RUN) {
        confession.comfortCards = comfortCards;
        await confession.save();
      }
    }

    console.log("\n✅ Comfort card summary:");
    console.log(`- matched seed posts: ${matched}`);
    console.log(`- missing seed posts: ${missing}`);
    console.log(`- total comfort card types assigned: ${totalCards}`);
    console.log(`- total comfort card sends assigned: ${totalCardSends}`);

    if (DRY_RUN) {
      console.log("\n🧪 Dry run only. Nothing was written to MongoDB.");
    } else {
      console.log("\n🌱 Comfort cards updated in MongoDB.");
    }
  } catch (error) {
    console.error("\n❌ Add seed comfort cards failed.");
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
