const { getCountryName, normalizeCountry } = require("./countryCurrency");

const HEADER_CANDIDATES = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-appengine-country",
  "cloudfront-viewer-country",
  "x-geo-country",
];

function isLocalDevelopment(req) {
  const host = String(req.get("host") || "").toLowerCase();
  return (
    process.env.NODE_ENV !== "production" ||
    host.includes("localhost") ||
    host.includes("127.0.0.1")
  );
}

function detectPaymentCountry(req) {
  const allowTestHeader =
    isLocalDevelopment(req) || process.env.ALLOW_PAYMENT_GEO_TEST_HEADERS === "true";

  if (allowTestHeader) {
    const testCountry = normalizeCountry(req.get("x-cw-test-country"));
    if (testCountry) {
      return {
        countryCode: testCountry,
        countryName: getCountryName(testCountry),
        source: "test-header",
      };
    }
  }

  for (const headerName of HEADER_CANDIDATES) {
    const value = normalizeCountry(req.get(headerName));
    if (value && value !== "XX") {
      return {
        countryCode: value,
        countryName: getCountryName(value),
        source: headerName,
      };
    }
  }

  return {
    countryCode: "IN",
    countryName: "India",
    source: "default",
  };
}

module.exports = { detectPaymentCountry };
