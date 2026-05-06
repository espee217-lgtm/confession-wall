const express = require("express");
const SpecialActivity = require("../models/SpecialActivity");

const router = express.Router();

const allowedEmails = (process.env.SPECIAL_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAllowedEmail = (email = "") => {
  return allowedEmails.includes(String(email).trim().toLowerCase());
};

const sendAppEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_RELAY_URL) {
    throw new Error("EMAIL_RELAY_URL is missing from environment variables.");
  }

  if (!process.env.EMAIL_RELAY_SECRET) {
    throw new Error("EMAIL_RELAY_SECRET is missing from environment variables.");
  }

  const response = await fetch(process.env.EMAIL_RELAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      secret: process.env.EMAIL_RELAY_SECRET,
      to,
      subject,
      html,
      text: subject,
    }),
  });

  const rawText = await response.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Email relay returned non-JSON response: ${rawText}`);
  }

  if (!data.ok) {
    throw new Error(data.message || "Email relay failed.");
  }

  return data;
};

const giftEmailTemplate = ({ userEmail, userName }) => `
  <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0a1a0a; color: #d7ffcd; border-radius: 16px;">
    <h2 style="color: #ffe59a; letter-spacing: 0.08em;">Gift Box Opened 🎁</h2>

    <p style="font-size: 15px; line-height: 1.7;">
      Someone opened the final gift box on Reenaa’s special page.
    </p>

    <div style="padding: 18px; border-radius: 14px; background: rgba(255,255,255,0.06); margin: 20px 0;">
      <p style="margin: 0 0 10px;"><strong>User:</strong> ${userName || "Unknown"}</p>
      <p style="margin: 0 0 10px;"><strong>Email:</strong> ${userEmail || "Unknown"}</p>
      <p style="margin: 0 0 10px;"><strong>Gift:</strong> ₹2000</p>
      <p style="margin: 0;"><strong>Time:</strong> ${new Date().toLocaleString("en-IN")}</p>
    </div>

    <p style="font-size: 14px; line-height: 1.7; color: #ffe59a;">
      Action needed: send ₹2000 manually through UPI if you want to honor the gift.
    </p>
  </div>
`;

router.post("/claim", async (req, res) => {
  try {
    const { userEmail, userName } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required." });
    }

    if (!isAllowedEmail(userEmail)) {
      return res.status(403).json({ message: "This email is not allowed." });
    }

    const activity = await SpecialActivity.create({
      userEmail,
      userName,
      action: "opened_gift_box",
      page: "/reena-trivia",
      details: {
        giftAmount: 2000,
        currency: "INR",
        message: "Gift box opened after trivia.",
      },
    });

    await sendAppEmail({
      to: process.env.GIFT_NOTIFY_EMAIL || "espee217@gmail.com",
      subject: "🎁 Reenaa Gift Box Opened",
      html: giftEmailTemplate({ userEmail, userName }),
    });

    res.status(200).json({
      message: "Gift opened and notification sent.",
      activity,
    });
  } catch (err) {
    console.error("Gift claim error:", err);
    res.status(500).json({
      message: "Server error while opening gift.",
      error: err.message,
    });
  }
});

module.exports = router;