require("dotenv").config();
const mongoose = require("mongoose");
const Confession = require("../models/Confession");

/**
 * One-time manual marker for old planted content on a single confession.
 * Run from server folder:
 * node scripts/markSeededContentForConfession.js
 */
const CONFESSION_ID = "PUT_CONFESSION_ID_HERE";
const SEED_OWNER_LABEL = "manual-seed";
const MARK_COMMENTS = true;
const MARK_REPLIES = true;

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }
  if (!CONFESSION_ID || CONFESSION_ID === "PUT_CONFESSION_ID_HERE") {
    throw new Error("Set CONFESSION_ID in the script before running.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const confession = await Confession.findById(CONFESSION_ID);
  if (!confession) {
    throw new Error(`Confession not found: ${CONFESSION_ID}`);
  }

  let markedComments = 0;
  let markedReplies = 0;

  const comments = Array.isArray(confession.comments) ? confession.comments : [];
  for (const comment of comments) {
    if (MARK_COMMENTS) {
      const shouldMarkComment = !comment.isSeeded || !String(comment.seedLabel || "").trim();
      if (shouldMarkComment) {
        comment.isSeeded = true;
        comment.seedLabel = SEED_OWNER_LABEL;
        markedComments += 1;
      }
    }

    if (MARK_REPLIES) {
      const replies = Array.isArray(comment.replies) ? comment.replies : [];
      for (const reply of replies) {
        const shouldMarkReply = !reply.isSeeded || !String(reply.seedLabel || "").trim();
        if (shouldMarkReply) {
          reply.isSeeded = true;
          reply.seedLabel = SEED_OWNER_LABEL;
          markedReplies += 1;
        }
      }
    }
  }

  await confession.save();
  console.log(`Marked comments: ${markedComments}`);
  console.log(`Marked replies: ${markedReplies}`);
  console.log("Done.");
};

main()
  .catch((err) => {
    console.error("Seed marker script failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore close errors
    }
  });
