const DAY_KEY_OPTIONS = { timeZone: "Asia/Kolkata" };

const getDateKey = (date = new Date()) =>
  date.toLocaleDateString("en-CA", DAY_KEY_OPTIONS);

const getTodayDateKey = () => getDateKey(new Date());

const getYesterdayDateKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
};

module.exports = {
  getDateKey,
  getTodayDateKey,
  getYesterdayDateKey,
};
