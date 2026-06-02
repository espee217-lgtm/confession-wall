/* eslint-disable no-console */
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Confession = require("../models/Confession");

const DRY_RUN = false;
const TARGET_CONFESSION_ID = "6a15845bdc7590568f967d81";
const TARGET_TEXT =
  "I needed this today. I have been pretending abandonment did not affect me, but it did.";

const normalizeText = (value) => String(value || "").trim();

const previewText = (value, max = 120) => {
  const text = normalizeText(value).replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const countEntries = (value) => (Array.isArray(value) ? value.length : 0);

const printMatch = ({ confession, comment }) => {
  console.log("Match found:");
  console.log(`- confession _id: ${confession._id}`);
  console.log(`- confession message preview: ${previewText(confession.message)}`);
  console.log(`- comment _id: ${comment._id}`);
  console.log(`- comment text: ${comment.text}`);
  console.log(`- comment author userId: ${comment.userId || ""}`);
  console.log(`- wateredBy count: ${countEntries(comment.wateredBy)}`);
  console.log(`- burnedBy count: ${countEntries(comment.burnedBy)}`);
  console.log(`- replies count: ${countEntries(comment.replies)}`);
};

async function main() {
  let foundMatches = [];

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI in server/.env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected.");
    console.log(`Target text: ${TARGET_TEXT}`);
    console.log(`Mode: ${DRY_RUN ? "DRY_RUN" : "LIVE"}`);

    const confession = await Confession.findById(TARGET_CONFESSION_ID).select("_id message comments").lean();
    if (confession) {
      const comments = Array.isArray(confession.comments) ? confession.comments : [];

      for (const comment of comments) {
        const exactMatch = String(comment?.text || "") === TARGET_TEXT;
        const trimmedMatch = normalizeText(comment?.text) === normalizeText(TARGET_TEXT);

        if (!exactMatch && !trimmedMatch) continue;

        foundMatches.push({ confession, comment });
      }
    }

    if (foundMatches.length === 0) {
      console.log("No matching comment found");
      return;
    }

    foundMatches.forEach(printMatch);

    if (foundMatches.length > 1) {
      console.warn("Multiple matches found. Refine the target before deleting.");
      return;
    }

    const [{ confession: matchedConfession, comment: matchedComment }] = foundMatches;

    if (DRY_RUN) {
      console.log("DRY_RUN enabled. No changes were saved.");
      return;
    }

    const liveConfession = await Confession.findById(matchedConfession._id);
    if (!liveConfession) {
      console.log("No matching comment found");
      return;
    }

    const exactTarget = normalizeText(TARGET_TEXT);
    const beforeCount = Array.isArray(liveConfession.comments) ? liveConfession.comments.length : 0;
    const nextComments = (liveConfession.comments || []).filter((entry) => {
      const text = normalizeText(entry?.text);
      return text !== exactTarget;
    });

    if (nextComments.length === beforeCount) {
      console.log("No matching comment found");
      return;
    }

    liveConfession.comments = nextComments;

    await liveConfession.save();
    console.log(
      `Deleted comment by exact text from confession ${matchedConfession._id}`
    );
  } catch (error) {
    console.error("Delete seeded comment script failed:", error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

main();
