// server/scripts/tuneSinglePostEngagement.js
// Adds stronger comfort-card and comment reaction counts to one already-inserted confession.
// Usage:
//   node scripts/tuneSinglePostEngagement.js --id=6a15845bdc7590568f967d81 --dry-run
//   node scripts/tuneSinglePostEngagement.js --id=6a15845bdc7590568f967d81

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Confession = require("../models/Confession");
const User = require("../models/User");

const COMFORT_CARD_OPTIONS = [
  "I hear you.",
  "You are not alone.",
  "This pain matters.",
  "Sending strength.",
  "You survived this.",
  "May your heart feel lighter.",
];

const getArg = (name) => {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
};

const DRY_RUN = process.argv.includes("--dry-run");
const CONFESSION_ID = getArg("id") || process.argv[2];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sampleUsers = (userIds, count, exclude = []) => {
  const excludeSet = new Set(exclude.map((id) => String(id)));
  const pool = userIds.filter((id) => !excludeSet.has(String(id)));
  return shuffle(pool).slice(0, Math.min(count, pool.length));
};

const buildComfortCards = (userIds) => {
  // At least 20 total comfort-card reacts, usually 20-24.
  const targetTotal = randInt(20, 24);
  const selectedCards = shuffle(COMFORT_CARD_OPTIONS).slice(0, randInt(4, 6));

  const counts = selectedCards.map(() => 1);
  let remaining = targetTotal - counts.length;

  while (remaining > 0) {
    counts[randInt(0, counts.length - 1)] += 1;
    remaining -= 1;
  }

  return selectedCards.map((text, index) => {
    const sentBy = sampleUsers(userIds, counts[index]);
    return {
      text,
      count: sentBy.length,
      sentBy,
    };
  }).filter((card) => card.count > 0);
};

const tuneCommentReactions = (comments, userIds) => {
  return comments.map((comment) => {
    const likeTarget = randInt(8, 12); // around 10 likes
    const dislikeTarget = randInt(3, 7); // requested 3-7 dislikes

    const wateredBy = sampleUsers(userIds, likeTarget);
    const burnedBy = sampleUsers(userIds, dislikeTarget, wateredBy);

    comment.wateredBy = wateredBy;
    comment.burnedBy = burnedBy;
    return comment;
  });
};

const totalComfortCards = (comfortCards = []) =>
  comfortCards.reduce((sum, card) => sum + Number(card.count || 0), 0);

async function main() {
  if (!CONFESSION_ID || !mongoose.Types.ObjectId.isValid(CONFESSION_ID)) {
    throw new Error(
      "Missing or invalid confession id. Use: node scripts/tuneSinglePostEngagement.js --id=YOUR_CONFESSION_ID"
    );
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  console.log(`🎯 Target confession: ${CONFESSION_ID}`);
  console.log(DRY_RUN ? "🧪 Dry run mode: no database changes will be saved." : "✍️ Real update mode.");

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB.");

  const users = await User.find({}).select("_id username").lean();
  const userIds = users.map((user) => user._id);

  if (userIds.length < 20) {
    console.warn(
      `⚠️ Only ${userIds.length} users found. Script will still work, but reaction counts may be lower than requested.`
    );
  }

  const confession = await Confession.findById(CONFESSION_ID).select(
    "+comfortCards.sentBy comments wateredBy burnedBy message mood"
  );

  if (!confession) {
    throw new Error(`Confession not found for id: ${CONFESSION_ID}`);
  }

  const beforeComfortTotal = totalComfortCards(confession.comfortCards);
  const beforeCommentSummary = confession.comments.map((comment, index) => ({
    index,
    likes: comment.wateredBy?.length || 0,
    dislikes: comment.burnedBy?.length || 0,
  }));

  const nextComfortCards = buildComfortCards(userIds);
  confession.comfortCards = nextComfortCards;
  tuneCommentReactions(confession.comments, userIds);

  const afterComfortTotal = totalComfortCards(confession.comfortCards);
  const afterCommentSummary = confession.comments.map((comment, index) => ({
    index,
    likes: comment.wateredBy?.length || 0,
    dislikes: comment.burnedBy?.length || 0,
  }));

  console.log("\nPost preview:");
  console.log(`Mood: ${confession.mood || "unknown"}`);
  console.log(`Message: ${String(confession.message || "").slice(0, 120)}${String(confession.message || "").length > 120 ? "..." : ""}`);

  console.log("\nComfort cards:");
  console.log(`Before total: ${beforeComfortTotal}`);
  console.log(`After total:  ${afterComfortTotal}`);
  confession.comfortCards.forEach((card) => {
    console.log(`- ${card.text}: ${card.count}`);
  });

  console.log("\nComment reactions:");
  afterCommentSummary.forEach((after, index) => {
    const before = beforeCommentSummary[index] || { likes: 0, dislikes: 0 };
    console.log(
      `comments[${after.index}] likes ${before.likes} -> ${after.likes}, dislikes ${before.dislikes} -> ${after.dislikes}`
    );
  });

  if (!DRY_RUN) {
    await confession.save();
    console.log("\n✅ Saved comfort cards + comment reactions for this one confession.");
  } else {
    console.log("\n🧪 Dry run complete. Nothing was saved.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\n❌ Failed to tune single post engagement.");
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
