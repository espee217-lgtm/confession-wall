const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

export const logSpecialActivity = async ({
  userEmail,
  userName,
  action,
  page,
  details = {},
}) => {
  try {
    if (!userEmail || !action) return;

    await fetch(`${API_BASE}/api/special-activity/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userEmail,
        userName,
        action,
        page,
        details,
      }),
    });
  } catch (err) {
    console.error("Special activity log failed:", err);
  }
};