const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  "BHD", "IQD", "JOD", "KWD", "OMR", "TND",
]);

const SUPPORTED_RAZORPAY_CURRENCIES = new Set([
  "AED", "ALL", "AMD", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT",
  "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP",
  "BZD", "CAD", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK",
  "DJF", "DKK", "DOP", "DZD", "EGP", "ETB", "EUR", "FJD", "GBP", "GHS",
  "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF",
  "IDR", "ILS", "INR", "IQD", "ISK", "JMD", "JOD", "JPY", "KES", "KGS",
  "KHR", "KMF", "KRW", "KWD", "KYD", "KZT", "LAK", "LKR", "LRD", "LSL",
  "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MUR", "MVR", "MWK",
  "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR",
  "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB",
  "RWF", "SAR", "SCR", "SEK", "SGD", "SLL", "SOS", "SSP", "SVC", "SZL",
  "THB", "TND", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU",
  "UZS", "VND", "VUV", "XAF", "XCD", "XOF", "XPF", "YER", "ZAR", "ZMW",
]);

function normalizeCurrency(currency) {
  return String(currency || "").trim().toUpperCase();
}

function isRazorpayCurrencySupported(currency) {
  return SUPPORTED_RAZORPAY_CURRENCIES.has(normalizeCurrency(currency));
}

function getCurrencyExponent(currency) {
  const code = normalizeCurrency(currency);
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

function toRazorpayAmount(displayAmount, currency) {
  const numeric = Number(displayAmount);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  const exponent = getCurrencyExponent(currency);
  return Math.round(numeric * Math.pow(10, exponent));
}

function fromRazorpayAmount(amountMinor, currency) {
  const numeric = Number(amountMinor);
  if (!Number.isFinite(numeric)) return 0;

  const exponent = getCurrencyExponent(currency);
  return numeric / Math.pow(10, exponent);
}

module.exports = {
  SUPPORTED_RAZORPAY_CURRENCIES,
  getCurrencyExponent,
  isRazorpayCurrencySupported,
  normalizeCurrency,
  toRazorpayAmount,
  fromRazorpayAmount,
};
