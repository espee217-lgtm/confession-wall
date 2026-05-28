const COUNTRY_TO_LANGUAGE = {
  PH: { lang: "tl", label: "Filipino" },
  IN: { lang: "hi", label: "Hindi" },
  ID: { lang: "id", label: "Indonesian" },
  MY: { lang: "ms", label: "Malay" },
  BD: { lang: "bn", label: "Bengali" },
  PK: { lang: "ur", label: "Urdu" },
  NP: { lang: "ne", label: "Nepali" },
  LK: { lang: "si", label: "Sinhala" },
  TH: { lang: "th", label: "Thai" },
  VN: { lang: "vi", label: "Vietnamese" },
  JP: { lang: "ja", label: "Japanese" },
  KR: { lang: "ko", label: "Korean" },
  CN: { lang: "zh-CN", label: "Chinese" },
  TW: { lang: "zh-TW", label: "Chinese" },
  SA: { lang: "ar", label: "Arabic" },
  AE: { lang: "ar", label: "Arabic" },
  ES: { lang: "es", label: "Spanish" },
  MX: { lang: "es", label: "Spanish" },
  AR: { lang: "es", label: "Spanish" },
  CO: { lang: "es", label: "Spanish" },
  CL: { lang: "es", label: "Spanish" },
  PE: { lang: "es", label: "Spanish" },
  BR: { lang: "pt", label: "Portuguese" },
  FR: { lang: "fr", label: "French" },
  DE: { lang: "de", label: "German" },
  IT: { lang: "it", label: "Italian" },
  RU: { lang: "ru", label: "Russian" },
};

const LANGUAGE_LABELS = {
  ar: "Arabic",
  bn: "Bengali",
  de: "German",
  en: "English",
  es: "Spanish",
  fil: "Filipino",
  fr: "French",
  hi: "Hindi",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  ms: "Malay",
  ne: "Nepali",
  pt: "Portuguese",
  ru: "Russian",
  si: "Sinhala",
  ta: "Tamil",
  te: "Telugu",
  th: "Thai",
  tl: "Filipino",
  ur: "Urdu",
  vi: "Vietnamese",
  "zh-CN": "Chinese",
  "zh-TW": "Chinese",
};

const normalizeLang = (lang) => {
  const value = String(lang || "").trim();
  if (!value) return "";

  const lower = value.toLowerCase();
  if (lower === "fil" || lower.startsWith("fil-") || lower === "tagalog") return "tl";
  if (lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hant") return "zh-TW";

  return lower.split("-")[0];
};

const getLanguageLabel = (lang) => {
  const normalized = normalizeLang(lang);
  return LANGUAGE_LABELS[lang] || LANGUAGE_LABELS[normalized] || normalized.toUpperCase();
};

const parseLocale = (locale) => {
  const raw = String(locale || "").trim();
  if (!raw) return { language: "", region: "" };

  try {
    if (typeof Intl !== "undefined" && Intl.Locale) {
      const parsed = new Intl.Locale(raw);
      return {
        language: normalizeLang(parsed.language),
        region: String(parsed.region || "").toUpperCase(),
      };
    }
  } catch {
    // Fall through to simple parsing for older browsers or unusual locale tags.
  }

  const parts = raw.replace("_", "-").split("-");
  return {
    language: normalizeLang(parts[0]),
    region: String(parts[1] || "").toUpperCase(),
  };
};

const getNavigatorLocales = () => {
  if (typeof navigator === "undefined") return [];

  const locales = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  return locales.filter(Boolean);
};

export function getPreferredTranslateTarget() {
  try {
    const stored = localStorage.getItem("cwTranslateTargetLang");
    const storedLang = normalizeLang(stored);

    if (storedLang) {
      return {
        lang: storedLang,
        label: getLanguageLabel(storedLang),
        shouldShowTranslate: storedLang !== "en",
      };
    }
  } catch {
    // localStorage can be unavailable; browser locale detection still works.
  }

  const parsedLocales = getNavigatorLocales().map(parseLocale);
  const nonEnglishLocale = parsedLocales.find((locale) => locale.language && locale.language !== "en");

  if (nonEnglishLocale?.language) {
    return {
      lang: nonEnglishLocale.language,
      label: getLanguageLabel(nonEnglishLocale.language),
      shouldShowTranslate: nonEnglishLocale.language !== "en",
    };
  }

  const englishRegionalLocale = parsedLocales.find(
    (locale) => locale.language === "en" && COUNTRY_TO_LANGUAGE[locale.region]
  );
  const mappedTarget = englishRegionalLocale
    ? COUNTRY_TO_LANGUAGE[englishRegionalLocale.region]
    : null;

  if (mappedTarget) {
    return {
      lang: mappedTarget.lang,
      label: mappedTarget.label,
      shouldShowTranslate: mappedTarget.lang !== "en",
    };
  }

  return {
    lang: "en",
    label: "English",
    shouldShowTranslate: false,
  };
}
