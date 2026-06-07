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
const SUPPORT_EMAIL = "confession.wall.origins@gmail.com";
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

function getFrontendRegionOverride() {
  try {
    const override = localStorage.getItem("cwRegionOverride");
    return String(override || "").trim().toUpperCase();
  } catch {
    return "";
  }
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
  const [isGcashModalOpen, setIsGcashModalOpen] = useState(false);
  const [gcashRequestPack, setGcashRequestPack] = useState(null);
  const [gcashCopyStatus, setGcashCopyStatus] = useState("");
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
  const countryCode = String(location.countryCode || "").toUpperCase();
  const currencyCode = String(location.currency || "").toUpperCase();
  const frontendRegionOverride = getFrontendRegionOverride();
  const isPhilippinesUser =
    countryCode === "PH" ||
    currencyCode === "PHP" ||
    frontendRegionOverride === "PH";
  const gcashSelectedPackPrice = gcashRequestPack
    ? formatCurrencyMinor(
        gcashRequestPack.amountMinor,
        gcashRequestPack.currency,
        gcashRequestPack.currencyExponent
      )
    : "";
  const gcashRequestDetails = [
    "GCash Seed purchase request",
    `Pack: ${gcashRequestPack?.name || "Not selected"}`,
    `Pack ID: ${gcashRequestPack?.id || "not-selected"}`,
    `Price shown: ${gcashSelectedPackPrice || "Not available"}`,
    `Base Seeds: ${gcashRequestPack?.baseSeeds || "Not available"}`,
    `Total Seeds preview: ${gcashRequestPack?.totalSeedsPreview || gcashRequestPack?.baseSeeds || "Not available"}`,
    "Country: Philippines (PH)",
    `Account email: ${user?.email || ""}`,
    `Username: ${user?.username || ""}`,
    "",
    "I understand Seeds should only be credited after official payment verification.",
  ].join("\n");
  const gcashMailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "GCash Seed purchase request"
  )}&body=${encodeURIComponent(gcashRequestDetails)}`;

  const openGcashRequestModal = (pack) => {
    if (!isLoggedIn) {
      setError("");
      setMessage("Log in or create an account to request GCash payment support.");
      return;
    }

    setError("");
    setMessage("");
    setGcashCopyStatus("");
    setGcashRequestPack(pack || null);
    setIsGcashModalOpen(true);
  };

  const closeGcashRequestModal = () => {
    setIsGcashModalOpen(false);
    setGcashRequestPack(null);
    setGcashCopyStatus("");
  };

  const copyGcashRequestDetails = async () => {
    try {
      await navigator.clipboard.writeText(gcashRequestDetails);
      setGcashCopyStatus("Request details copied.");
    } catch {
      setGcashCopyStatus("Could not copy automatically. You can email support from this modal.");
    }
  };

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

        {isPhilippinesUser && (
          <section className="ph-wallet-payment-card" aria-label="Philippines GCash wallet payment option">
            <div className="gcash-payment-card-head">
              <div>
                <p className="buy-seeds-kicker">Philippines Wallet Option</p>
                <h3>GCash Wallet</h3>
                <p>
                  Pay locally with GCash. Best for Philippines users who prefer
                  wallet payments over card checkout.
                </p>
              </div>
              <span className="gcash-payment-badge">Manual request</span>
            </div>

            <div className="gcash-safety-note">
              GCash support is request/manual-verification only for now. Seeds
              are not credited instantly and will only be added after official
              payment verification.
              {frontendRegionOverride === "PH" && (
                <span className="gcash-qa-note">
                  QA preview active from cwRegionOverride. This only displays
                  the GCash UI and is not used for payment verification.
                </span>
              )}
            </div>

            {seedPacks.length > 0 ? (
              <div className="gcash-pack-choice-list" aria-label="Choose a Seed pack for GCash request">
                {seedPacks.map((pack) => (
                  <button
                    key={`gcash-${pack.id}`}
                    type="button"
                    className="gcash-pack-choice-btn"
                    onClick={() => openGcashRequestModal(pack)}
                    disabled={Boolean(seedPackBusyId)}
                    aria-label={`Request GCash payment for ${pack.name}`}
                  >
                    <span>{pack.name}</span>
                    <strong>
                      {formatCurrencyMinor(
                        pack.amountMinor,
                        pack.currency,
                        pack.currencyExponent
                      )}
                    </strong>
                    <em>Request GCash Payment</em>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="gcash-request-standalone-btn"
                onClick={() => openGcashRequestModal(null)}
              >
                Request GCash Payment
              </button>
            )}

            <p className="gcash-card-footer">
              Other payment option: Pay with international card remains
              available through the regular checkout above.
            </p>
          </section>
        )}
      </section>

      <section className="buy-seeds-legal-links" aria-label="Payment and support links">
        <Link to="/refund-cancellation">Refund & Cancellation Policy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact-support">Contact Support</Link>
      </section>

      {isGcashModalOpen && (
        <div className="gcash-request-modal-backdrop" role="presentation" onClick={closeGcashRequestModal}>
          <section
            className="gcash-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gcash-request-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="gcash-request-modal-head">
              <div>
                <p className="buy-seeds-kicker">Manual Verification</p>
                <h2 id="gcash-request-title">Request GCash Payment</h2>
              </div>
              <button type="button" className="gcash-modal-close" onClick={closeGcashRequestModal} aria-label="Close GCash request modal">
                ×
              </button>
            </div>

            <div className="gcash-selected-pack">
              <span>Selected pack</span>
              <strong>{gcashRequestPack?.name || "Seed pack request"}</strong>
              {gcashRequestPack && (
                <p>
                  {gcashSelectedPackPrice} · {gcashRequestPack.baseSeeds} base Seeds
                  {gcashRequestPack.totalSeedsPreview
                    ? ` · ${gcashRequestPack.totalSeedsPreview} Seeds preview`
                    : ""}
                </p>
              )}
            </div>

            <p>
              GCash wallet payments are being prepared for Philippines users.
              For now, you can request GCash support and Confession Wall will
              use verified manual confirmation before any Seeds are credited.
            </p>

            <ul className="gcash-verification-list">
              <li>Seeds will only be credited after payment verification.</li>
              <li>Do not send payment unless official Confession Wall payment instructions are shown.</li>
              <li>Never send payment to random accounts claiming to be Confession Wall.</li>
              <li>This request does not create a payment order or add Seeds automatically.</li>
            </ul>

            <div className="gcash-request-actions">
              <a className="gcash-request-primary" href={gcashMailtoHref}>
                Email Support
              </a>
              <button type="button" onClick={copyGcashRequestDetails}>
                Copy request details
              </button>
              <Link to="/contact-support" onClick={closeGcashRequestModal}>
                Contact Support
              </Link>
            </div>

            {gcashCopyStatus && <p className="gcash-copy-status">{gcashCopyStatus}</p>}
          </section>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}

export default BuySeeds;
