import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileBottomNav from "../components/MobileBottomNav";
import { useAuth } from "../context/AuthContext";
import "./BuySeeds.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const SEED_ICON = "\uD83C\uDF31";
const PAYMENT_UNAVAILABLE_MESSAGE =
  "Payments are not available yet. Please try again later.";
const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function formatCurrencyMinor(amountMinor, currency, exponent = 2) {
  const numeric = Number(amountMinor);
  const safeAmountMinor = Number.isFinite(numeric) ? numeric : 0;
  const currencyCode = String(currency || "INR").toUpperCase();
  const safeExponent = Number.isFinite(Number(exponent)) ? Number(exponent) : 2;
  const amount = safeAmountMinor / Math.pow(10, safeExponent);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: safeExponent,
      minimumFractionDigits: safeExponent === 0 ? 0 : 0,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function ensureRazorpayCheckoutScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (window.__cwRazorpayScriptPromise) return window.__cwRazorpayScriptPromise;

  window.__cwRazorpayScriptPromise = new Promise((resolve) => {
    const resolveWith = (isReady) => {
      const ready = Boolean(isReady && window.Razorpay);
      if (!ready) {
        window.__cwRazorpayScriptPromise = null;
      }
      resolve(ready);
    };

    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`
    );

    if (existingScript) {
      if (window.Razorpay) {
        resolveWith(true);
        return;
      }

      existingScript.addEventListener("load", () => resolveWith(true), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolveWith(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolveWith(true);
    script.onerror = () => resolveWith(false);
    document.body.appendChild(script);
  });

  return window.__cwRazorpayScriptPromise;
}

function BuySeeds() {
  const navigate = useNavigate();
  const { user, token, refreshUser, updateUser } = useAuth();

  const [seedPacks, setSeedPacks] = useState([]);
  const [seedPackLoading, setSeedPackLoading] = useState(false);
  const [seedPackBusyId, setSeedPackBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localSeeds, setLocalSeeds] = useState(user?.seeds || 0);
  const [paymentMeta, setPaymentMeta] = useState({
    location: {
      countryCode: "",
      countryName: "Detecting...",
      currency: "",
      paymentsSupported: false,
      source: "loading",
      unavailableReason: "",
    },
    paymentsSupported: false,
    unavailableReason: "",
    successfulSeedPurchaseCount: 0,
    nextPurchaseNumber: 1,
    bonusPercentForNextPurchase: 0,
  });

  const isLoggedIn = Boolean(user?._id && token);

  useEffect(() => {
    setLocalSeeds(user?.seeds || 0);
  }, [user]);

  const loadSeedPacks = useCallback(async () => {
    try {
      setSeedPackLoading(true);
      setError("");

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/api/payments/seed-packs`, {
        headers,
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Could not load Seed packs right now.");
      }

      setSeedPacks(Array.isArray(data.packs) ? data.packs : []);
      setPaymentMeta({
        location: data.location || {},
        paymentsSupported: Boolean(data.paymentsSupported),
        unavailableReason: data.unavailableReason || "",
        successfulSeedPurchaseCount: Number(data.successfulSeedPurchaseCount || 0),
        nextPurchaseNumber: Number(data.nextPurchaseNumber || 1),
        bonusPercentForNextPurchase: Number(data.bonusPercentForNextPurchase || 0),
      });
    } catch (err) {
      setSeedPacks([]);
      setPaymentMeta((prev) => ({
        ...prev,
        paymentsSupported: false,
        unavailableReason: err.message || "Could not load Seed packs right now.",
      }));
      setError(err.message || "Could not load Seed packs right now.");
    } finally {
      setSeedPackLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSeedPacks();
  }, [loadSeedPacks]);

  const verifySeedPackPayment = useCallback(
    async (payload) => {
      try {
        const res = await fetch(`${API_BASE}/api/payments/seed-packs/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await readJsonSafe(res);

        if (res.status === 503) {
          throw new Error(PAYMENT_UNAVAILABLE_MESSAGE);
        }

        if (!res.ok) {
          throw new Error(data.message || "Could not verify payment right now.");
        }

        if (data.user && typeof data.user.seeds === "number") {
          setLocalSeeds(data.user.seeds);
          updateUser?.((prevUser) => {
            if (!prevUser) return prevUser;

            return {
              ...prevUser,
              seeds: data.user.seeds,
              successfulSeedPurchaseCount:
                data.user.successfulSeedPurchaseCount ??
                prevUser.successfulSeedPurchaseCount,
            };
          });
        }

        try {
          await refreshUser?.();
        } catch (refreshErr) {
          console.warn("Could not refresh user after payment verify:", refreshErr);
        }

        await loadSeedPacks();

        setMessage(
          data.alreadyCredited
            ? "Payment already processed. Your Seeds are up to date."
            : "Payment successful. Seeds were added to your account."
        );
      } catch (err) {
        setError(err.message || "Could not verify payment right now.");
      } finally {
        setSeedPackBusyId("");
      }
    },
    [token, refreshUser, loadSeedPacks, updateUser]
  );

  const handleSeedPackBuy = async (pack) => {
    if (!pack?.id || seedPackBusyId) return;

    if (!isLoggedIn) {
      setError("");
      setMessage("Log in or create an account to buy Seed packs.");
      return;
    }

    if (!paymentMeta.paymentsSupported) {
      setMessage("");
      setError(paymentMeta.unavailableReason || "Seed purchases are not available in your country yet.");
      return;
    }

    setMessage("");
    setError("");
    setSeedPackBusyId(pack.id);

    try {
      const orderRes = await fetch(`${API_BASE}/api/payments/seed-packs/order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packId: pack.id }),
      });
      const orderData = await readJsonSafe(orderRes);

      if (orderRes.status === 503) {
        throw new Error(PAYMENT_UNAVAILABLE_MESSAGE);
      }

      if (!orderRes.ok) {
        throw new Error(orderData.message || "Could not create payment order right now.");
      }

      const scriptReady = await ensureRazorpayCheckoutScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error(
          "Payment checkout could not load. Please check your connection and try again."
        );
      }

      const checkoutOptions = {
        key: orderData.keyId,
        order_id: orderData.razorpayOrderId,
        amount: orderData.amountMinor,
        currency: orderData.currency,
        name: "Confession Wall",
        description: `${orderData.pack?.name || pack.name} Seed Pack`,
        modal: {
          ondismiss: () => {
            setSeedPackBusyId("");
            setMessage("Payment cancelled. No Seeds were added.");
          },
        },
        handler: (paymentResponse) => {
          verifySeedPackPayment({
            purchaseId: orderData.purchaseId,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          });
        },
        prefill: {
          name: user?.username || "",
          email: user?.email || "",
        },
        notes: {
          packId: pack.id,
          country: orderData.location?.countryCode || paymentMeta.location?.countryCode || "",
          currency: orderData.currency,
        },
        theme: {
          color: "#5fbf52",
        },
      };

      const razorpay = new window.Razorpay(checkoutOptions);
      razorpay.on("payment.failed", (event) => {
        const description = event?.error?.description;
        setSeedPackBusyId("");
        setError(description || "Payment failed. Please try again.");
      });
      razorpay.open();
    } catch (err) {
      setSeedPackBusyId("");
      setError(err.message || "Could not start checkout right now.");
    }
  };

  const bonusLabel = useMemo(() => {
    if (paymentMeta.bonusPercentForNextPurchase > 0) {
      return `${paymentMeta.bonusPercentForNextPurchase}% bonus on next purchase`;
    }
    return "No bonus for next purchase";
  }, [paymentMeta.bonusPercentForNextPurchase]);

  const location = paymentMeta.location || {};
  const regionStatusLabel = seedPackLoading
    ? "Detecting payment location..."
    : location.countryName && location.currency
      ? `${location.countryName} · ${location.currency}`
      : "Payment location unavailable";
  const showAutoDetectedNote = Boolean(location.source && location.source !== "default");
  const disabledPaymentMessage = paymentMeta.unavailableReason ||
    "Seed purchases are not available in your country yet.";

  return (
    <main className="buy-seeds-page">
      <section className="buy-seeds-hero">
        <div>
          <p className="buy-seeds-kicker">Premium Top-Up</p>
          <h1>Buy Seeds</h1>
          <p>Top up your Seeds and unlock cosmetics faster.</p>
        </div>

        <div className="buy-seeds-balance" title="Current Seeds">
          <span>{isLoggedIn ? "Available Seeds" : "Guest Preview"}</span>
          <strong>{isLoggedIn ? `${SEED_ICON} ${localSeeds || 0}` : "Login to buy"}</strong>
        </div>
      </section>

      {(message || error) && (
        <div className={error ? "buy-seeds-alert error" : "buy-seeds-alert"}>
          {error || message}
        </div>
      )}

      <div className="buy-seeds-region-status" aria-live="polite">
        <span className="buy-seeds-region-pill">{regionStatusLabel}</span>
        {paymentMeta.paymentsSupported ? (
          <span className="buy-seeds-region-note">
            Prices are decided securely by the server.
          </span>
        ) : (
          <span className="buy-seeds-region-note warning">{disabledPaymentMessage}</span>
        )}
        {showAutoDetectedNote && (
          <span className="buy-seeds-region-note">Country detected automatically</span>
        )}
      </div>

      {!isLoggedIn && (
        <section className="buy-seeds-auth-card">
          <h2>Browsing Seed packs as guest.</h2>
          <p>Your account is required before any secure payment order can be created.</p>
          <div className="buy-seeds-auth-actions">
            <button type="button" onClick={() => navigate("/login")}>
              Login
            </button>
            <button type="button" onClick={() => navigate("/register")}>
              Register
            </button>
          </div>
        </section>
      )}

      <section className="buy-seeds-panel" aria-label="Paid Seed Packs">
        <div className="buy-seeds-header">
          <div>
            <p className="buy-seeds-kicker">Paid Seed Packs</p>
            <h2>Choose your pack</h2>
            <p>
              {isLoggedIn
                ? "Bonus previews are based on your next eligible purchase."
                : "Preview current Seed pack pricing. Log in to buy and see account-specific bonuses."}
            </p>
          </div>
        </div>

        <div className="buy-seeds-meta">
          {isLoggedIn ? (
            <>
              <span>Successful purchases: {paymentMeta.successfulSeedPurchaseCount}</span>
              <span>Next purchase number: {paymentMeta.nextPurchaseNumber}</span>
              <span>{bonusLabel}</span>
            </>
          ) : (
            <span>Login required before checkout opens.</span>
          )}
        </div>

        {seedPackLoading ? (
          <div className="buy-seeds-loading">Loading Seed packs...</div>
        ) : seedPacks.length === 0 ? (
          <div className="buy-seeds-empty">
            {paymentMeta.paymentsSupported
              ? "Seed packs are unavailable right now."
              : disabledPaymentMessage}
          </div>
        ) : (
          <div className="buy-seeds-grid">
            {seedPacks.map((pack) => {
              const hasBonus = Number(pack.bonusPercentPreview || 0) > 0;
              const isBusy = seedPackBusyId === pack.id;

              return (
                <article className="buy-seeds-card" key={pack.id}>
                  <div className="buy-seeds-card-top">
                    <h3>{pack.name}</h3>
                    <div className="buy-seeds-price">
                      {formatCurrencyMinor(
                        pack.amountMinor,
                        pack.currency,
                        pack.currencyExponent
                      )}
                    </div>
                  </div>

                  <p className="buy-seeds-description">{pack.description}</p>

                  <div className="buy-seeds-breakdown">
                    <p>{pack.baseSeeds} Seeds</p>
                    {hasBonus ? (
                      <>
                        <p>{pack.bonusPercentPreview}% purchase bonus</p>
                        <p>Next purchase bonus: +{pack.bonusSeedsPreview}</p>
                        <p>You receive: {pack.totalSeedsPreview} Seeds</p>
                      </>
                    ) : (
                      <p>You receive: {pack.baseSeeds} Seeds</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="buy-seeds-buy-btn"
                    onClick={() => handleSeedPackBuy(pack)}
                    disabled={Boolean(seedPackBusyId) || !paymentMeta.paymentsSupported}
                  >
                    {isBusy ? "Opening..." : isLoggedIn ? "Buy" : "Log in to buy"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="buy-seeds-legal-links" aria-label="Payment and support links">
        <Link to="/refund-cancellation">Refund & Cancellation Policy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact-support">Contact Support</Link>
      </section>

      <MobileBottomNav />
    </main>
  );
}

export default BuySeeds;
