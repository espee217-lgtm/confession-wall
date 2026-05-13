const express = require("express");
const router = express.Router();

const User = require("../models/User");
const { protect } = require("../middleware/auth");

const COSMETIC_TYPE_TO_EQUIP_FIELD = {
  badge: "badge",
  frame: "frame",
  title: "title",
  postTheme: "postTheme",
  reactionStyle: "reactionStyle",
  visualEffect: "visualEffect",
};

const SHOP_ITEMS = [
  {
    id: "badge-sprout-soul",
    type: "badge",
    name: "Sprout Soul",
    description: "A soft green badge for new forest wanderers.",
    price: 25,
    icon: "🌱",
    rarity: "Common",
    previewClass: "cw-cosmetic-preview-badge-sprout",
  },
  {
    id: "badge-moon-whisper",
    type: "badge",
    name: "Moon Whisper",
    description: "A calm moon badge for late-night confessors.",
    price: 45,
    icon: "🌙",
    rarity: "Rare",
    previewClass: "cw-cosmetic-preview-badge-moon",
  },
  {
    id: "badge-forest-crown",
    type: "badge",
    name: "Forest Crown",
    description: "A golden leaf crown for respected voices.",
    price: 75,
    icon: "👑",
    rarity: "Epic",
    previewClass: "cw-cosmetic-preview-badge-crown",
  },
  {
    id: "frame-vine-glow",
    type: "frame",
    name: "Vine Glow Frame",
    description: "A green vine aura around your profile icon.",
    price: 60,
    icon: "🍃",
    rarity: "Rare",
    previewClass: "cw-cosmetic-preview-frame-vine",
  },
  {
    id: "frame-golden-leaf",
    type: "frame",
    name: "Golden Leaf Frame",
    description: "A warm golden frame for a premium forest look.",
    price: 90,
    icon: "🍂",
    rarity: "Epic",
    previewClass: "cw-cosmetic-preview-frame-gold",
  },
  {
    id: "frame-ember-root",
    type: "frame",
    name: "Ember Root Frame",
    description: "A scorched red glow for bold souls.",
    price: 90,
    icon: "🔥",
    rarity: "Epic",
    previewClass: "cw-cosmetic-preview-frame-ember",
  },
  {
    id: "title-forest-wanderer",
    type: "title",
    name: "Forest Wanderer",
    description: "A gentle display title for quiet explorers.",
    price: 35,
    icon: "🌲",
    rarity: "Common",
    previewClass: "cw-cosmetic-preview-title-wanderer",
  },
  {
    id: "title-keeper-of-secrets",
    type: "title",
    name: "Keeper of Secrets",
    description: "A mysterious title for confession collectors.",
    price: 65,
    icon: "🗝️",
    rarity: "Rare",
    previewClass: "cw-cosmetic-preview-title-keeper",
  },
  {
    id: "title-grove-guardian",
    type: "title",
    name: "Grove Guardian",
    description: "A respected title for protectors of the wall.",
    price: 85,
    icon: "🛡️",
    rarity: "Epic",
    previewClass: "cw-cosmetic-preview-title-guardian",
  },
  {
    id: "post-theme-moonlit-grove",
    type: "postTheme",
    name: "Moonlit Grove Card",
    description: "A soft moonlit confession card theme.",
    price: 80,
    icon: "🌌",
    rarity: "Rare",
    previewClass: "cw-cosmetic-preview-post-moonlit",
  },
  {
    id: "post-theme-golden-leaves",
    type: "postTheme",
    name: "Golden Leaves Card",
    description: "A golden leaf confession card theme.",
    price: 95,
    icon: "✨",
    rarity: "Epic",
    previewClass: "cw-cosmetic-preview-post-golden",
  },
  {
    id: "post-theme-scorched-ember",
    type: "postTheme",
    name: "Scorched Ember Card",
    description: "A darker ember confession card theme.",
    price: 95,
    icon: "🪵",
    rarity: "Epic",
    previewClass: "cw-cosmetic-preview-post-ember",
  },
];

const getItemById = (itemId) => SHOP_ITEMS.find((item) => item.id === itemId);

const buildUserPayload = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  profilePicture: user.profilePicture,
  bio: user.bio,
  isAdmin: user.isAdmin,
  isSuspended: user.isSuspended,
  isBanned: user.isBanned,
  suspendReason: user.suspendReason,
  banReason: user.banReason,
  seeds: user.seeds || 0,
  ownedCosmetics: Array.isArray(user.ownedCosmetics) ? user.ownedCosmetics : [],
  equippedCosmetics: user.equippedCosmetics || {
    badge: "",
    frame: "",
    title: "",
    postTheme: "",
    reactionStyle: "",
    visualEffect: "",
  },
});

router.get("/", async (req, res) => {
  res.json({ items: SHOP_ITEMS });
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      seeds: user.seeds || 0,
      ownedCosmetics: user.ownedCosmetics || [],
      equippedCosmetics: user.equippedCosmetics || {},
    });
  } catch (err) {
    console.error("Get shop user error:", err.message);
    res.status(500).json({ message: "Could not load your shop data." });
  }
});

router.post("/buy/:itemId", protect, async (req, res) => {
  try {
    const item = getItemById(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Shop item not found." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyOwned = (user.ownedCosmetics || []).some(
      (owned) => owned.itemId === item.id
    );

    if (alreadyOwned) {
      return res.status(400).json({ message: "You already own this cosmetic." });
    }

    if ((user.seeds || 0) < item.price) {
      return res.status(400).json({
        message: `Not enough Seeds. You need ${item.price} Seeds for this item.`,
      });
    }

    user.seeds = Math.max((user.seeds || 0) - item.price, 0);

user.ownedCosmetics.push({
  itemId: item.id,
  purchasedAt: new Date(),
});

// Auto-equip the cosmetic immediately after purchase
const equipField = COSMETIC_TYPE_TO_EQUIP_FIELD[item.type];

if (equipField) {
  user.set(`equippedCosmetics.${equipField}`, item.id);
}

await user.save();

    res.json({
      message: `${item.name} unlocked!`,
      item,
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error("Buy cosmetic error:", err.message);
    res.status(500).json({ message: "Could not buy this cosmetic right now." });
  }
});

router.post("/equip/:itemId", protect, async (req, res) => {
  try {
    const item = getItemById(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Shop item not found." });
    }

    const equipField = COSMETIC_TYPE_TO_EQUIP_FIELD[item.type];

    if (!equipField) {
      return res.status(400).json({ message: "This cosmetic type cannot be equipped." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const ownsItem = (user.ownedCosmetics || []).some(
      (owned) => owned.itemId === item.id
    );

    if (!ownsItem) {
      return res.status(403).json({ message: "Buy this cosmetic before equipping it." });
    }

    user.set(`equippedCosmetics.${equipField}`, item.id);

    await user.save();

    res.json({
      message: `${item.name} equipped!`,
      item,
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error("Equip cosmetic error:", err.message);
    res.status(500).json({ message: "Could not equip this cosmetic right now." });
  }
});

router.post("/unequip/:type", protect, async (req, res) => {
  try {
    const equipField = COSMETIC_TYPE_TO_EQUIP_FIELD[req.params.type];

    if (!equipField) {
      return res.status(400).json({ message: "Invalid cosmetic type." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.set(`equippedCosmetics.${equipField}`, "");

    await user.save();

    res.json({
      message: "Cosmetic unequipped.",
      user: buildUserPayload(user),
    });
  } catch (err) {
    console.error("Unequip cosmetic error:", err.message);
    res.status(500).json({ message: "Could not unequip this cosmetic right now." });
  }
});

module.exports = router;