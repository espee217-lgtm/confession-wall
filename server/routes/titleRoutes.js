const express = require("express");

const User = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  formatEquippedTitle,
  getAchievementTitleById,
  hasUnlockedTitle,
  refreshAchievementTitlesForUser,
} = require("../utils/achievementTitles");

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  try {
    const titleState = await refreshAchievementTitlesForUser(req.user._id);

    if (!titleState) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(titleState.payload);
  } catch (err) {
    console.error("Get achievement titles error:", err.message);
    res.status(500).json({ message: "Could not load title achievements." });
  }
});

router.patch("/equip", protect, async (req, res) => {
  try {
    const rawTitleId = req.body?.titleId;
    const titleId =
      rawTitleId === null || rawTitleId === undefined ? "" : String(rawTitleId).trim();

    const refreshed = await refreshAchievementTitlesForUser(req.user._id);
    const user = refreshed?.user || (await User.findById(req.user._id));

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!titleId) {
      user.set("equippedCosmetics.title", "");
      await user.save();
      return res.json({ equippedTitle: null });
    }

    const title = getAchievementTitleById(titleId);

    if (!title) {
      return res.status(400).json({ message: "Unknown title achievement." });
    }

    if (!hasUnlockedTitle(user, title.id)) {
      return res.status(403).json({ message: "Unlock this title before equipping it." });
    }

    user.set("equippedCosmetics.title", title.id);
    await user.save();

    res.json({
      equippedTitle: formatEquippedTitle(user),
    });
  } catch (err) {
    console.error("Equip achievement title error:", err.message);
    res.status(500).json({ message: "Could not equip title." });
  }
});

module.exports = router;
