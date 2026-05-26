const { getCountryCurrency } = require("./countryCurrency");
const {
  getCurrencyExponent,
  isRazorpayCurrencySupported,
  normalizeCurrency,
  toRazorpayAmount,
} = require("./razorpayCurrencies");

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

const USD_BASE_MAJOR_PRICES = {
  "starter-bloom": 2.99,
  "grove-pack": 5.99,
  "ancient-pack": 12.99,
  "mythic-grove-pack": 24.99,
};

const CURRENCY_RATE_FROM_USD = {
  AED: 3.67, ALL: 90, AMD: 390, ARS: 1000, AUD: 1.53, AWG: 1.8, AZN: 1.7,
  BAM: 1.8, BBD: 2, BDT: 122, BGN: 1.8, BHD: 0.377, BIF: 2850, BMD: 1,
  BND: 1.35, BOB: 6.9, BRL: 5.4, BSD: 1, BTN: 83, BWP: 13.7, BZD: 2,
  CAD: 1.37, CHF: 0.9, CLP: 920, CNY: 7.25, COP: 4000, CRC: 505, CUP: 24,
  CVE: 100, CZK: 23, DJF: 178, DKK: 6.8, DOP: 59, DZD: 134, EGP: 50,
  ETB: 130, EUR: 0.92, FJD: 2.25, GBP: 0.79, GHS: 15, GIP: 0.79,
  GMD: 70, GNF: 8600, GTQ: 7.8, GYD: 209, HKD: 7.8, HNL: 25, HRK: 6.9,
  HTG: 132, HUF: 360, IDR: 16000, ILS: 3.7, INR: 83, IQD: 1310, ISK: 138,
  JMD: 156, JOD: 0.71, JPY: 157, KES: 130, KGS: 87, KHR: 4100, KMF: 450,
  KRW: 1380, KWD: 0.31, KYD: 0.83, KZT: 500, LAK: 22000, LKR: 300,
  LRD: 190, LSL: 18, MAD: 10, MDL: 18, MGA: 4500, MKD: 56, MMK: 2100,
  MNT: 3400, MOP: 8, MUR: 46, MVR: 15.4, MWK: 1730, MXN: 18, MYR: 4.7,
  MZN: 64, NAD: 18, NGN: 1500, NIO: 37, NOK: 10.8, NPR: 133, NZD: 1.65,
  OMR: 0.385, PEN: 3.7, PGK: 3.9, PHP: 58, PKR: 278, PLN: 4, PYG: 7500,
  QAR: 3.64, RON: 4.6, RSD: 107, RUB: 90, RWF: 1300, SAR: 3.75, SCR: 13.5,
  SEK: 10.5, SGD: 1.35, SLL: 23000, SOS: 570, SSP: 2000, SVC: 8.75,
  SZL: 18, THB: 36, TND: 3.1, TRY: 32, TTD: 6.8, TWD: 32, TZS: 2600,
  UAH: 40, UGX: 3800, USD: 1, UYU: 39, UZS: 12600, VND: 25000, VUV: 120,
  XAF: 600, XCD: 2.7, XOF: 600, XPF: 110, YER: 250, ZAR: 18, ZMW: 25,
};

const EXPLICIT_MAJOR_PRICING = {
  INR: {
    "starter-bloom": 99,
    "grove-pack": 199,
    "ancient-pack": 499,
    "mythic-grove-pack": 999,
  },
  USD: {
    "starter-bloom": 2.99,
    "grove-pack": 5.99,
    "ancient-pack": 12.99,
    "mythic-grove-pack": 24.99,
  },
  GBP: {
    "starter-bloom": 2.49,
    "grove-pack": 4.99,
    "ancient-pack": 10.99,
    "mythic-grove-pack": 21.99,
  },
};

function normalizeRegion(input) {
  const value = String(input || "").trim().toUpperCase();
  if (value === "UK") return "GB";
  if (/^[A-Z]{2}$/.test(value)) return value;
  return "IN";
}

function getPsychologicalEnding(currency) {
  const code = normalizeCurrency(currency);
  const exponent = getCurrencyExponent(code);

  if (exponent === 0) return 9;
  if (exponent === 3) return 0.009;
  return 0.99;
}

function roundGeneratedMajorPrice(value, currency) {
  const code = normalizeCurrency(currency);
  const exponent = getCurrencyExponent(code);

  if (exponent === 0) {
    if (value < 100) return Math.max(100, Math.round(value / 10) * 10 - 1);
    if (value < 1000) return Math.round(value / 50) * 50 - 1;
    return Math.round(value / 100) * 100 - 1;
  }

  if (exponent === 3) {
    return Math.max(0.1, Number((Math.round(value * 2) / 2 - 0.001).toFixed(3)));
  }

  if (value < 10) return Math.max(0.99, Number((Math.ceil(value) - 0.01).toFixed(2)));
  if (value < 100) return Number((Math.round(value / 5) * 5 - 0.01).toFixed(2));
  return Number((Math.round(value / 10) * 10 - getPsychologicalEnding(code)).toFixed(2));
}

function getMajorPrice(currency, packId) {
  const code = normalizeCurrency(currency);

  if (EXPLICIT_MAJOR_PRICING[code]?.[packId]) {
    return EXPLICIT_MAJOR_PRICING[code][packId];
  }

  const rate = CURRENCY_RATE_FROM_USD[code];
  const usdPrice = USD_BASE_MAJOR_PRICES[packId];
  if (!rate || !usdPrice) return 0;

  return roundGeneratedMajorPrice(usdPrice * rate, code);
}

function buildPack(countryCode, packId) {
  const region = normalizeRegion(countryCode);
  const currency = getCountryCurrency(region);

  if (!PACK_NAMES[packId] || !currency || !isRazorpayCurrencySupported(currency)) {
    return null;
  }

  const majorPrice = getMajorPrice(currency, packId);
  const amountMinor = toRazorpayAmount(majorPrice, currency);

  if (!amountMinor || amountMinor < 100) return null;

  return {
    id: packId,
    name: PACK_NAMES[packId],
    baseSeeds: BASE_SEEDS[packId],
    amountMinor,
    amountDisplay: majorPrice,
    currency,
    currencyExponent: getCurrencyExponent(currency),
    region,
    description: PACK_DESCRIPTIONS[packId],
  };
}

function isCountryPaymentSupported(countryCode) {
  const region = normalizeRegion(countryCode);
  const currency = getCountryCurrency(region);
  return Boolean(currency && isRazorpayCurrencySupported(currency));
}

function getUnsupportedPaymentReason(countryCode) {
  const region = normalizeRegion(countryCode);
  const currency = getCountryCurrency(region);

  if (!currency) {
    return "Seed purchases are not available in your country yet.";
  }

  return `${currency} payments are not enabled for Confession Wall yet.`;
}

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
  getUnsupportedPaymentReason,
  isCountryPaymentSupported,
  normalizeRegion,
};
