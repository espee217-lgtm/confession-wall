export const SPECIAL_ALLOWED_EMAILS = [
  "mcr9496@gmail.com",
  "theexperttunic464@gmail.com",
  "espee217@gmail.com",
  "noiorexd@gmail.com",
];

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isSpecialEmail(email) {
  return SPECIAL_ALLOWED_EMAILS.includes(normalizeEmail(email));
}