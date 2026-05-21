export const CONTENT_WARNING_CATEGORIES = [
  "Heavy / Sensitive",
  "Grief",
  "Self-reflection",
  "Relationship",
  "Vent",
  "Other",
];

export const DEFAULT_CONTENT_WARNING = {
  enabled: false,
  category: "",
  note: "",
  sensitive: false,
};

export function normalizeContentWarning(value) {
  const enabled = Boolean(value?.enabled);
  const category =
    typeof value?.category === "string" ? value.category.trim() : "";
  const note = typeof value?.note === "string" ? value.note.trim() : "";
  const sensitive = Boolean(value?.sensitive);

  return {
    enabled,
    category,
    note,
    sensitive,
  };
}

export function shouldBlurSensitiveContent(value) {
  const warning = normalizeContentWarning(value);
  return warning.enabled && warning.sensitive;
}
