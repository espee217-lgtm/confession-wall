require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const DRY_RUN = true;

const SEED_USERNAMES = [];
const SEED_EMAIL_SUFFIXES = ["@seed.confession-wall.local"];
const SEED_LABEL = "legacy-seed-account";

const buildQuery = () => {
  const clauses = [];

  if (Array.isArray(SEED_USERNAMES) && SEED_USERNAMES.length > 0) {
    const cleaned = SEED_USERNAMES.map((name) => String(name || "").trim()).filter(Boolean);
    if (cleaned.length > 0) {
      clauses.push({ username: { $in: cleaned } });
    }
  }

  if (Array.isArray(SEED_EMAIL_SUFFIXES) && SEED_EMAIL_SUFFIXES.length > 0) {
    const suffixClauses = SEED_EMAIL_SUFFIXES.map((suffix) =>
      String(suffix || "").trim().toLowerCase()
    )
      .filter(Boolean)
      .map((suffix) => {
        const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return { email: { $regex: `${escaped}$`, $options: "i" } };
      });

    clauses.push(...suffixClauses);
  }

  if (clauses.length === 0) {
    throw new Error(
      "No selectors configured. Add at least one username or an email domain pattern."
    );
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  const query = buildQuery();
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const matchedUsers = await User.find(query).select("_id username email isSeededAccount seedLabel").lean();

  console.log(`Matched accounts: ${matchedUsers.length}`);
  if (matchedUsers.length > 0) {
    console.log("Matched users:");
    matchedUsers.forEach((user) => {
      console.log(`- ${user.username} | ${user.email} | ${user._id}`);
    });
  }

  if (DRY_RUN) {
    console.log("DRY RUN: no users were changed.");
    return;
  }

  let updatedCount = 0;
  for (const user of matchedUsers) {
    const updates = { isSeededAccount: true };
    if (!String(user.seedLabel || "").trim()) {
      updates.seedLabel = SEED_LABEL;
    }
    const result = await User.updateOne({ _id: user._id }, { $set: updates });
    if ((result.modifiedCount || 0) > 0) {
      updatedCount += 1;
    }
  }

  console.log(`Updated accounts: ${updatedCount}`);
  console.log("Done.");
};

main()
  .catch((err) => {
    console.error("markSeededAccounts failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore close errors
    }
  });
