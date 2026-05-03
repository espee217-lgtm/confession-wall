const sanitizeText = (value, options = {}) => {
  const { maxLength = 2000, allowNewLines = true } = options;

  let text = String(value || "");

  // Remove invisible control characters except normal whitespace/newlines.
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // Remove script/style blocks entirely.
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  // Strip all HTML tags so users cannot inject markup into posts/comments/reports.
  text = text.replace(/<[^>]*>/g, "");

  // Trim each line and collapse huge whitespace.
  if (allowNewLines) {
    text = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{4,}/g, "\n\n\n");
  } else {
    text = text.replace(/\s+/g, " ").trim();
  }

  text = text.trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim();
  }

  return text;
};

const sanitizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase()
    .replace(/[\u0000-\u001F\u007F\s]/g, "");

module.exports = {
  sanitizeText,
  sanitizeEmail,
};