const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Notification = require("../models/Notification");
const SeedPurchase = require("../models/SeedPurchase");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { getCountryCurrency } = require("../utils/countryCurrency");
const { detectPaymentCountry } = require("../utils/paymentGeo");
const {
  calculateSeedCredit,
  getBonusForPurchaseNumber,
  getSeedPack,
  getSeedPacksForRegion,
  getUnsupportedPaymentReason,
  isCountryPaymentSupported,
} = require("../utils/seedPacks");

const router = express.Router();

const paymentUnavailableMessage =
  "Payments are not available yet. Please try again later.";

const hasRazorpayConfig = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpayClient = () => {
  if (!hasRazorpayConfig()) return null;

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const getSuccessfulPurchaseCount = (user) =>
  Math.max(0, Math.floor(Number(user?.successfulSeedPurchaseCount || 0)));

const attachOptionalUser = async (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || !process.env.JWT_SECRET) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    req.user = user || null;
    return req.user;
  } catch {
    return null;
  }
};

const getPaymentLocation = (req) => {
  const detected = detectPaymentCountry(req);
  const currency = getCountryCurrency(detected.countryCode);
  const paymentsSupported = isCountryPaymentSupported(detected.countryCode);

  return {
    ...detected,
    currency: currency || "",
    paymentsSupported,
    unavailableReason: paymentsSupported
      ? ""
      : getUnsupportedPaymentReason(detected.countryCode),
  };
};

const buildPackPreview = (pack, purchaseNumber) => {
  const credit = calculateSeedCredit(pack.baseSeeds, purchaseNumber);

  return {
    ...pack,
    bonusSeedsPreview: credit.bonusSeeds,
    totalSeedsPreview: credit.totalSeedsCredited,
    bonusPercentPreview: credit.bonusPercent,
  };
};

const buildPurchasePayload = (purchase) => ({
  id: purchase._id,
  packId: purchase.packId,
  packName: purchase.packName,
  region: purchase.region,
  currency: purchase.currency,
  amountMinor: purchase.amountMinor,
  baseSeeds: purchase.baseSeeds,
  bonusPercent: purchase.bonusPercent,
  bonusSeeds: purchase.bonusSeeds,
  totalSeedsCredited: purchase.totalSeedsCredited,
  purchaseNumberForBonus: purchase.purchaseNumberForBonus,
  razorpayOrderId: purchase.razorpayOrderId,
  razorpayPaymentId: purchase.razorpayPaymentId || "",
  status: purchase.status,
  creditedAt: purchase.creditedAt,
});

const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
  keySecret,
}) => {
  if (!orderId || !paymentId || !signature || !keySecret) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(String(signature), "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};


const verifyRazorpayWebhookSignature = ({ rawBody, signature, webhookSecret }) => {
  if (!rawBody || !signature || !webhookSecret) return false;

  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(String(rawBody));

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(bodyBuffer)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(String(signature), "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

const parseWebhookBody = (rawBody) => {
  const rawText = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : String(rawBody || "");

  return JSON.parse(rawText);
};

const getPaymentEntityFromWebhook = (payload) =>
  payload?.payload?.payment?.entity || null;

const isSupportedPaymentSuccessEvent = (eventName) =>
  ["payment.captured", "order.paid"].includes(eventName);

const acknowledgeWebhook = (res, extra = {}) =>
  res.status(200).json({ received: true, ...extra });

const buildSeedPurchaseMessage = (packName, credit) => {
  if (credit.bonusSeeds > 0) {
    return `Your ${packName} purchase added ${credit.baseSeeds} Seeds + ${credit.bonusSeeds} bonus Seeds.`;
  }

  return `Your ${packName} purchase added ${credit.baseSeeds} Seeds.`;
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isTransientTransactionError = (err) =>
  typeof err?.hasErrorLabel === "function" &&
  err.hasErrorLabel("TransientTransactionError");

const markPurchaseFailed = async (purchase, failureReason) => {
  if (!purchase || purchase.status === "credited") return purchase;

  purchase.status = "failed";
  purchase.failureReason = failureReason;
  await purchase.save();

  return purchase;
};

const creditVerifiedPurchase = async ({
  purchaseId,
  userId,
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      let result = null;

      await session.withTransaction(async () => {
        const purchase = await SeedPurchase.findById(purchaseId).session(session);

        if (!purchase) {
          throw createHttpError(404, "Seed purchase not found.");
        }

        if (String(purchase.userId) !== String(userId)) {
          throw createHttpError(403, "This purchase does not belong to your account.");
        }

        if (purchase.razorpayOrderId !== razorpayOrderId) {
          throw createHttpError(400, "Payment order does not match this purchase.");
        }

        if (purchase.status === "credited") {
          const user = await User.findById(userId)
            .select("seeds successfulSeedPurchaseCount")
            .session(session);

          result = {
            alreadyCredited: true,
            purchase,
            user,
          };
          return;
        }

        if (!["created", "paid"].includes(purchase.status)) {
          throw createHttpError(400, "This Seed purchase cannot be credited.");
        }

        const duplicatePayment = await SeedPurchase.findOne({
          _id: { $ne: purchase._id },
          razorpayPaymentId,
          status: "credited",
        }).session(session);

        if (duplicatePayment) {
          throw createHttpError(409, "This Razorpay payment has already been credited.");
        }

        const user = await User.findById(userId).session(session);

        if (!user) {
          throw createHttpError(404, "User not found.");
        }

        const purchaseNumberForBonus =
          getSuccessfulPurchaseCount(user) + 1;
        const credit = calculateSeedCredit(
          purchase.baseSeeds,
          purchaseNumberForBonus
        );

        purchase.bonusPercent = credit.bonusPercent;
        purchase.bonusSeeds = credit.bonusSeeds;
        purchase.totalSeedsCredited = credit.totalSeedsCredited;
        purchase.purchaseNumberForBonus = credit.purchaseNumberForBonus;
        purchase.razorpayPaymentId = razorpayPaymentId;
        purchase.status = "credited";
        purchase.failureReason = "";
        purchase.creditedAt = new Date();

        user.seeds = Math.max(0, Number(user.seeds || 0)) + credit.totalSeedsCredited;
        user.successfulSeedPurchaseCount = purchaseNumberForBonus;

        await purchase.save({ session });
        await user.save({ session });

        await Notification.create(
          [
            {
              userId: user._id,
              type: "seed_credit",
              message: buildSeedPurchaseMessage(purchase.packName, credit),
              link: "/shop",
            },
          ],
          { session }
        );

        result = {
          alreadyCredited: false,
          purchase,
          user,
          credit,
        };
      });

      return result;
    } catch (err) {
      lastError = err;

      if (!isTransientTransactionError(err)) {
        throw err;
      }
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
};


router.post("/", async (req, res) => {
  if (!req.originalUrl.includes("/api/payments/webhook")) {
    return res.status(404).json({ message: "API route not found" });
  }

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured.");
      return res.status(503).json({ message: "Webhook is not configured." });
    }

    const webhookSignature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    const signatureValid = verifyRazorpayWebhookSignature({
      rawBody,
      signature: webhookSignature,
      webhookSecret,
    });

    if (!signatureValid) {
      console.error("Razorpay webhook rejected: invalid signature.");
      return res.status(400).json({ message: "Invalid webhook signature." });
    }

    const payload = parseWebhookBody(rawBody);
    const eventName = payload?.event;

    if (!isSupportedPaymentSuccessEvent(eventName)) {
      return acknowledgeWebhook(res, { ignored: true, event: eventName || "unknown" });
    }

    const payment = getPaymentEntityFromWebhook(payload);

    if (!payment?.order_id || !payment?.id) {
      console.warn("Razorpay webhook ignored: missing payment/order identifiers.");
      return acknowledgeWebhook(res, { ignored: true, reason: "missing_payment_identifiers" });
    }

    const purchase = await SeedPurchase.findOne({
      razorpayOrderId: payment.order_id,
    });

    if (!purchase) {
      console.warn("Razorpay webhook ignored: no SeedPurchase found for order", payment.order_id);
      return acknowledgeWebhook(res, { ignored: true, reason: "purchase_not_found" });
    }

    if (
      Number(payment.amount) !== Number(purchase.amountMinor) ||
      String(payment.currency || "").toUpperCase() !== String(purchase.currency || "").toUpperCase()
    ) {
      await markPurchaseFailed(
        purchase,
        "Razorpay webhook amount/currency did not match the Seed purchase."
      );

      console.error("Razorpay webhook rejected: amount/currency mismatch", {
        orderId: payment.order_id,
        paymentAmount: payment.amount,
        paymentCurrency: payment.currency,
        purchaseAmount: purchase.amountMinor,
        purchaseCurrency: purchase.currency,
      });

      return res.status(400).json({ message: "Payment amount/currency mismatch." });
    }

    const result = await creditVerifiedPurchase({
      purchaseId: purchase._id,
      userId: purchase.userId,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
    });

    return acknowledgeWebhook(res, {
      event: eventName,
      credited: !result.alreadyCredited,
      alreadyCredited: Boolean(result.alreadyCredited),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return acknowledgeWebhook(res, { alreadyProcessed: true });
    }

    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: "Invalid webhook JSON." });
    }

    console.error("Razorpay webhook error:", err.message);
    return res.status(500).json({ message: "Could not process webhook." });
  }
});

router.get("/seed-packs", async (req, res) => {
  try {
    await attachOptionalUser(req);

    const location = getPaymentLocation(req);
    const successfulSeedPurchaseCount = getSuccessfulPurchaseCount(req.user);
    const nextPurchaseNumber = successfulSeedPurchaseCount + 1;
    const bonusPercentForNextPurchase =
      getBonusForPurchaseNumber(nextPurchaseNumber);
    const packs = location.paymentsSupported
      ? getSeedPacksForRegion(location.countryCode).map((pack) =>
          buildPackPreview(pack, nextPurchaseNumber)
        )
      : [];

    res.json({
      location,
      region: location.countryCode,
      currency: location.currency,
      paymentsSupported: location.paymentsSupported,
      unavailableReason: location.unavailableReason,
      keyId: process.env.RAZORPAY_KEY_ID || "",
      successfulSeedPurchaseCount,
      nextPurchaseNumber,
      bonusPercentForNextPurchase,
      packs,
    });
  } catch (err) {
    console.error("Seed pack list error:", err.message);
    res.status(500).json({ message: "Could not load Seed packs right now." });
  }
});

router.post("/seed-packs/order", protect, async (req, res) => {
  try {
    if (!hasRazorpayConfig()) {
      return res.status(503).json({ message: paymentUnavailableMessage });
    }

    const location = getPaymentLocation(req);

    if (!location.paymentsSupported) {
      return res.status(403).json({
        message: location.unavailableReason || "Seed purchases are not available in your country yet.",
        location,
      });
    }

    const pack = getSeedPack(location.countryCode, req.body?.packId);

    if (!pack || pack.amountMinor < 100) {
      return res.status(400).json({ message: "Invalid Seed pack." });
    }

    const razorpay = getRazorpayClient();
    const receipt = `seed_${Date.now()}_${String(req.user._id).slice(-6)}`;
    const order = await razorpay.orders.create({
      amount: pack.amountMinor,
      currency: pack.currency,
      receipt,
      notes: {
        userId: String(req.user._id),
        packId: pack.id,
        country: pack.region,
        currency: pack.currency,
      },
    });

    const purchase = await SeedPurchase.create({
      userId: req.user._id,
      packId: pack.id,
      packName: pack.name,
      region: pack.region,
      currency: pack.currency,
      amountMinor: pack.amountMinor,
      baseSeeds: pack.baseSeeds,
      status: "created",
      razorpayOrderId: order.id,
    });

    const freshUser = await User.findById(req.user._id).select(
      "successfulSeedPurchaseCount"
    );
    const nextPurchaseNumber = getSuccessfulPurchaseCount(freshUser || req.user) + 1;
    const bonusPreview = calculateSeedCredit(pack.baseSeeds, nextPurchaseNumber);

    res.json({
      purchaseId: purchase._id,
      razorpayOrderId: purchase.razorpayOrderId,
      amountMinor: purchase.amountMinor,
      currency: purchase.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      pack,
      location,
      bonusPreview,
    });
  } catch (err) {
    const razorpayStatus = err?.statusCode || err?.error?.status_code;
    const razorpayDescription = err?.error?.description;

    if (razorpayStatus === 401) {
      return res.status(401).json({ message: "Razorpay credentials were rejected." });
    }

    console.error("Seed pack order error:", razorpayDescription || err.message);
    res.status(500).json({ message: "Could not create payment order right now." });
  }
});

router.post("/seed-packs/verify", protect, async (req, res) => {
  try {
    if (!hasRazorpayConfig()) {
      return res.status(503).json({ message: paymentUnavailableMessage });
    }

    const {
      purchaseId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};

    if (
      !purchaseId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return res.status(400).json({ message: "Missing payment verification data." });
    }

    const purchase = await SeedPurchase.findById(purchaseId);

    if (!purchase) {
      return res.status(404).json({ message: "Seed purchase not found." });
    }

    if (String(purchase.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "This purchase does not belong to your account." });
    }

    if (purchase.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ message: "Payment order does not match this purchase." });
    }

    if (purchase.status === "credited") {
      const user = await User.findById(req.user._id).select(
        "seeds successfulSeedPurchaseCount"
      );

      return res.json({
        message: "Seed purchase was already credited.",
        alreadyCredited: true,
        purchase: buildPurchasePayload(purchase),
        user: {
          seeds: user?.seeds || 0,
          successfulSeedPurchaseCount: getSuccessfulPurchaseCount(user),
        },
      });
    }

    const signatureValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    });

    if (!signatureValid) {
      await markPurchaseFailed(purchase, "Invalid Razorpay payment signature.");
      return res.status(400).json({ message: "Invalid payment signature." });
    }

    const duplicatePayment = await SeedPurchase.findOne({
      _id: { $ne: purchase._id },
      razorpayPaymentId,
      status: "credited",
    });

    if (duplicatePayment) {
      await markPurchaseFailed(
        purchase,
        "Razorpay payment was already credited to another purchase."
      );
      return res.status(409).json({
        message: "This Razorpay payment has already been credited.",
      });
    }

    const result = await creditVerifiedPurchase({
      purchaseId: purchase._id,
      userId: req.user._id,
      razorpayOrderId,
      razorpayPaymentId,
    });

    res.json({
      message: result.alreadyCredited
        ? "Seed purchase was already credited."
        : "Seed purchase credited.",
      alreadyCredited: Boolean(result.alreadyCredited),
      purchase: buildPurchasePayload(result.purchase),
      user: {
        seeds: result.user?.seeds || 0,
        successfulSeedPurchaseCount: getSuccessfulPurchaseCount(result.user),
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "This Razorpay payment has already been processed.",
      });
    }

    if (err?.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error("Seed pack verification error:", err.message);
    res.status(500).json({ message: "Could not verify payment right now." });
  }
});

module.exports = router;
