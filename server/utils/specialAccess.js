const DEFAULT_SPECIAL_EMAILS = [
  "mcr9496@gmail.com",
  "theexperttunic464@gmail.com",
  "espee217@gmail.com",
  "noiorexd@gmail.com",
];

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getSpecialAllowedEmails = () => {
  const raw = process.env.SPECIAL_ALLOWED_EMAILS;

  const emails = raw
    ? raw.split(",").map(normalizeEmail).filter(Boolean)
    : DEFAULT_SPECIAL_EMAILS;

  return [...new Set(emails)];
};

const isSpecialEmail = (email) => getSpecialAllowedEmails().includes(normalizeEmail(email));

module.exports = { getSpecialAllowedEmails, isSpecialEmail, normalizeEmail };
