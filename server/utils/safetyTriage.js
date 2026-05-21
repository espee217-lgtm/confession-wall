const SEVERITY_ORDER = {
  low: 1,
  medium: 2,
  high: 3,
};

const CATEGORY_RULES = {
  self_harm: [
    { term: "hurt myself", mode: "phrase", severity: "medium" },
    { term: "hurting myself", mode: "phrase", severity: "medium" },
    { term: "harm myself", mode: "phrase", severity: "medium" },
    { term: "end myself", mode: "phrase", severity: "high" },
    { term: "kill myself", mode: "phrase", severity: "high" },
    { term: "take my own life", mode: "phrase", severity: "high" },
    { term: "end my life", mode: "phrase", severity: "high" },
    { term: "want to die", mode: "phrase", severity: "high" },
    { term: "suicide", mode: "word", severity: "high" },
    { term: "self harm", mode: "phrase", severity: "high" },
    { term: "cut myself", mode: "phrase", severity: "high" },
    { term: "overdose", mode: "word", severity: "medium" },
  ],
  threat_violence: [
    { term: "murder", mode: "word", severity: "high" },
    { term: "bomb threat", mode: "phrase", severity: "high" },
    { term: "shoot up", mode: "phrase", severity: "high" },
    { term: "kill them", mode: "phrase", severity: "high" },
    { term: "stab them", mode: "phrase", severity: "high" },
    { term: "attack them", mode: "phrase", severity: "medium" },
    { term: "beat them up", mode: "phrase", severity: "medium" },
  ],
  harassment_hate: [
    { term: "kill yourself", mode: "phrase", severity: "medium" },
    { term: "go kill yourself", mode: "phrase", severity: "medium" },
    { term: "kys", mode: "word", severity: "medium" },
    { term: "harass", mode: "word", severity: "medium" },
    { term: "doxx", mode: "word", severity: "medium" },
  ],
  doxxing_pii: [
    { term: "social security number", mode: "phrase", severity: "high" },
    { term: "ssn", mode: "word", severity: "high" },
    { term: "credit card number", mode: "phrase", severity: "high" },
    { term: "phone number is", mode: "phrase", severity: "medium" },
    { term: "address is", mode: "phrase", severity: "medium" },
    { term: "leak their address", mode: "phrase", severity: "high" },
  ],
  minor_sexual_content: [
    { term: "child porn", mode: "phrase", severity: "high" },
    { term: "nude minor", mode: "phrase", severity: "high" },
    { term: "underage sex", mode: "phrase", severity: "high" },
    { term: "teen nudes", mode: "phrase", severity: "high" },
    { term: "sexual content with minors", mode: "phrase", severity: "high" },
  ],
  extreme_abuse: [
    { term: "rape", mode: "word", severity: "high" },
    { term: "sexual assault", mode: "phrase", severity: "high" },
    { term: "child abuse", mode: "phrase", severity: "high" },
    { term: "human trafficking", mode: "phrase", severity: "high" },
    { term: "torture", mode: "word", severity: "high" },
    { term: "genocide", mode: "word", severity: "high" },
  ],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasWordMatch = (text, term) => {
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  return pattern.test(text);
};

function scanSafetyText(text, options = {}) {
  if (typeof text !== "string") return [];

  const normalized = text.trim().toLowerCase();
  if (!normalized) return [];

  const source = options.source === "comment" ? "comment" : "post";
  const commentId = source === "comment" ? options.commentId || null : null;
  const createdAt = options.createdAt ? new Date(options.createdAt) : new Date();

  const flags = [];

  Object.entries(CATEGORY_RULES).forEach(([category, rules]) => {
    const matchedTerms = new Set();
    let severity = "low";

    rules.forEach((rule) => {
      const matched =
        rule.mode === "word"
          ? hasWordMatch(normalized, rule.term)
          : normalized.includes(rule.term.toLowerCase());

      if (!matched) return;

      matchedTerms.add(rule.term);

      if (SEVERITY_ORDER[rule.severity] > SEVERITY_ORDER[severity]) {
        severity = rule.severity;
      }
    });

    if (matchedTerms.size === 0) return;

    if (category === "minor_sexual_content") {
      severity = "high";
    }

    flags.push({
      category,
      matchedTerms: Array.from(matchedTerms),
      severity,
      source,
      commentId,
      createdAt,
    });
  });

  return flags;
}

module.exports = {
  scanSafetyText,
};
