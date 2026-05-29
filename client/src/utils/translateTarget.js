export const TRANSLATE_TARGET_STORAGE_KEY = "cwTranslateTargetLang";
export const TRANSLATE_REGION_STORAGE_KEY = "cwTranslateRegion";
export const TRANSLATE_TARGET_MANUAL_STORAGE_KEY = "cwTranslateTargetManual";
export const TRANSLATE_TARGET_CHANGE_EVENT = "cw:translate-target-change";

export const SUPPORTED_TRANSLATION_OPTIONS = [
  { regionLabel: "Global / English", lang: "en", label: "English" },
  { regionLabel: "India Region", lang: "hi", label: "Hindi" },
  { regionLabel: "Philippines Region", lang: "tl", label: "Filipino" },
  { regionLabel: "Latin Region", lang: "es", label: "Spanish" },
  { regionLabel: "Francophone Region", lang: "fr", label: "French" },
  { regionLabel: "Eastern Europe Region", lang: "ru", label: "Russian" },
  { regionLabel: "Central Europe Region", lang: "de", label: "German" },
  { regionLabel: "Lusophone Region", lang: "pt", label: "Portuguese" },
];

export const SUPPORTED_TRANSLATION_LANGS = SUPPORTED_TRANSLATION_OPTIONS.map(
  (option) => option.lang
);

const SUPPORTED_TRANSLATION_LANG_SET = new Set(SUPPORTED_TRANSLATION_LANGS);

const AUTO_REGION_BY_COUNTRY = {
  IN: "hi",
  PH: "tl",
  RU: "ru",
  DE: "de",
  AT: "de",
  CH: "de",
  BR: "pt",
  PT: "pt",
};

const LATIN_REGION_COUNTRIES = new Set(["ES", "MX", "AR", "CO", "CL", "PE"]);
const FRANCOPHONE_REGION_COUNTRIES = new Set(["FR", "CA"]);

const normalizeLang = (lang) => {
  const value = String(lang || "").trim();
  if (!value) return "";

  const lower = value.toLowerCase();
  if (lower === "fil" || lower.startsWith("fil-") || lower === "tagalog") return "tl";

  return lower.split("-")[0];
};

export const normalizeTranslateLang = (lang) => {
  const normalized = normalizeLang(lang);
  return SUPPORTED_TRANSLATION_LANG_SET.has(normalized) ? normalized : "";
};

export const getTranslationOptionByLang = (lang) => {
  const normalized = normalizeTranslateLang(lang);
  return (
    SUPPORTED_TRANSLATION_OPTIONS.find((option) => option.lang === normalized) ||
    SUPPORTED_TRANSLATION_OPTIONS[0]
  );
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

  const locales =
    Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

  return locales.filter(Boolean);
};

const hasSupportedLocaleLanguage = (parsedLocales, lang) =>
  parsedLocales.some((locale) => locale.language === lang);

const getAutoRegionalLang = (parsedLocales) => {
  const englishLocales = parsedLocales.filter((locale) => locale.language === "en");

  for (const locale of englishLocales) {
    if (LATIN_REGION_COUNTRIES.has(locale.region)) {
      if (hasSupportedLocaleLanguage(parsedLocales, "es")) return "es";
      continue;
    }

    if (FRANCOPHONE_REGION_COUNTRIES.has(locale.region)) {
      if (hasSupportedLocaleLanguage(parsedLocales, "fr")) return "fr";
      continue;
    }

    if (AUTO_REGION_BY_COUNTRY[locale.region]) {
      return AUTO_REGION_BY_COUNTRY[locale.region];
    }
  }

  return "";
};

const buildTarget = (lang, options = {}) => {
  const option = getTranslationOptionByLang(lang);

  return {
    lang: option.lang,
    label: option.label,
    regionLabel: option.regionLabel,
    shouldShowTranslate: option.lang !== "en" || Boolean(options.explicit),
    explicit: Boolean(options.explicit),
    manual: Boolean(options.manual),
  };
};

export function getSavedTranslateTarget() {
  try {
    return normalizeTranslateLang(localStorage.getItem(TRANSLATE_TARGET_STORAGE_KEY));
  } catch {
    return "";
  }
}

export function isManualTranslateTarget() {
  try {
    return localStorage.getItem(TRANSLATE_TARGET_MANUAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSavedTranslateTarget(lang) {
  const option = getTranslationOptionByLang(lang);

  try {
    localStorage.setItem(TRANSLATE_TARGET_STORAGE_KEY, option.lang);
    localStorage.setItem(TRANSLATE_REGION_STORAGE_KEY, option.regionLabel);
    localStorage.setItem(TRANSLATE_TARGET_MANUAL_STORAGE_KEY, "true");
  } catch {
    // localStorage can be unavailable; still notify the current page.
  }

  const target = buildTarget(option.lang, { explicit: true, manual: true });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TRANSLATE_TARGET_CHANGE_EVENT, {
        detail: target,
      })
    );
  }

  return target;
}

export function clearManualTranslateTarget() {
  try {
    localStorage.removeItem(TRANSLATE_TARGET_MANUAL_STORAGE_KEY);
    localStorage.removeItem(TRANSLATE_TARGET_STORAGE_KEY);
    localStorage.removeItem(TRANSLATE_REGION_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable; still notify the current page.
  }

  const target = getPreferredTranslateTarget();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TRANSLATE_TARGET_CHANGE_EVENT, {
        detail: target,
      })
    );
  }

  return target;
}

export function getPreferredTranslateTarget() {
  const storedLang = getSavedTranslateTarget();

  if (isManualTranslateTarget() && storedLang) {
    return buildTarget(storedLang, { explicit: true, manual: true });
  }

  const parsedLocales = getNavigatorLocales().map(parseLocale);
  const supportedNonEnglishLocale = parsedLocales.find(
    (locale) =>
      locale.language &&
      locale.language !== "en" &&
      SUPPORTED_TRANSLATION_LANG_SET.has(locale.language)
  );

  if (supportedNonEnglishLocale?.language) {
    return buildTarget(supportedNonEnglishLocale.language);
  }

  const regionalLang = getAutoRegionalLang(parsedLocales);
  if (regionalLang) {
    return buildTarget(regionalLang);
  }

  return buildTarget("en");
}
