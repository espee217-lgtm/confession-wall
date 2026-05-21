const PACK_DESCRIPTIONS = {
  "starter-bloom": "Small premium Seed boost for first unlocks.",
  "grove-pack": "Balanced Seed pack for cosmetics and profile style.",
  "ancient-pack": "Premium bundle for bigger cosmetic unlocks.",
  "mythic-grove-pack": "Best-value supporter pack for major unlocks.",
};

const PACK_NAMES = {
  "starter-bloom": "Starter Bloom",
  "grove-pack": "Grove Pack",
  "ancient-pack": "Ancient Pack",
  "mythic-grove-pack": "Mythic Grove Pack",
};

const BASE_SEEDS = {
  "starter-bloom": 100,
  "grove-pack": 300,
  "ancient-pack": 800,
  "mythic-grove-pack": 1800,
};

const REGION_PRICING = {
  IN: {
    currency: "INR",
    amounts: {
      "starter-bloom": 9900,
      "grove-pack": 19900,
      "ancient-pack": 49900,
      "mythic-grove-pack": 99900,
    },
  },
  US: {
    currency: "USD",
    amounts: {
      "starter-bloom": 299,
      "grove-pack": 599,
      "ancient-pack": 1299,
      "mythic-grove-pack": 2499,
    },
  },
  GB: {
    currency: "GBP",
    amounts: {
      "starter-bloom": 249,
      "grove-pack": 499,
      "ancient-pack": 1099,
      "mythic-grove-pack": 2199,
    },
  },
};

const normalizeRegion = (input) => {
  const value = String(input || "").trim().toUpperCase();

  if (value === "US") return "US";
  if (value === "GB" || value === "UK") return "GB";

  return "IN";
};

const buildPack = (region, packId) => {
  const normalizedRegion = normalizeRegion(region);
  const pricing = REGION_PRICING[normalizedRegion] || REGION_PRICING.IN;
  const amountMinor = pricing.amounts[packId];

  if (!amountMinor) return null;

  return {
    id: packId,
    name: PACK_NAMES[packId],
    baseSeeds: BASE_SEEDS[packId],
    amountMinor,
    currency: pricing.currency,
    region: normalizedRegion,
    description: PACK_DESCRIPTIONS[packId],
  };
};

const getSeedPacksForRegion = (region) =>
  Object.keys(PACK_NAMES)
    .map((packId) => buildPack(region, packId))
    .filter(Boolean);

const getSeedPack = (region, packId) => {
  if (!PACK_NAMES[packId]) return null;
  return buildPack(region, packId);
};

const getBonusForPurchaseNumber = (purchaseNumber) => {
  const number = Number(purchaseNumber);

  if (number === 1) return 100;
  if (number === 2) return 70;
  if (number === 3) return 50;
  if (number === 4) return 30;

  return 0;
};

const calculateSeedCredit = (baseSeeds, purchaseNumber) => {
  const normalizedBaseSeeds = Math.max(0, Math.floor(Number(baseSeeds) || 0));
  const purchaseNumberForBonus = Math.max(1, Math.floor(Number(purchaseNumber) || 1));
  const bonusPercent = getBonusForPurchaseNumber(purchaseNumberForBonus);
  const bonusSeeds = Math.floor((normalizedBaseSeeds * bonusPercent) / 100);

  return {
    baseSeeds: normalizedBaseSeeds,
    bonusPercent,
    bonusSeeds,
    totalSeedsCredited: normalizedBaseSeeds + bonusSeeds,
    purchaseNumberForBonus,
  };
};

module.exports = {
  calculateSeedCredit,
  getBonusForPurchaseNumber,
  getSeedPack,
  getSeedPacksForRegion,
  normalizeRegion,
};
