import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
const DEFAULT_PAYMENT_REGION = "IN";
const REGION_LABELS = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
};
const CURRENCY_LOCALE_MAP = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
};
const GUEST_SEED_PACKS = {
  "starter-bloom": {
    name: "Starter Bloom",
    baseSeeds: 100,
    description: "Small premium Seed boost for first unlocks.",
  },
  "grove-pack": {
    name: "Grove Pack",
    baseSeeds: 300,
    description: "Balanced Seed pack for cosmetics and profile style.",
  },
  "ancient-pack": {
    name: "Ancient Pack",
    baseSeeds: 800,
    description: "Premium bundle for bigger cosmetic unlocks.",
  },
  "mythic-grove-pack": {
    name: "Mythic Grove Pack",
    baseSeeds: 1800,
    description: "Best-value supporter pack for major unlocks.",
  },
};
const GUEST_REGION_PRICING = {
  IN: {
    currency: "INR",
    amounts: {
      "starter-bloom": 9900,
      "grove-pack": 19900,
      "ancient-pack": 49900,
      "mythic-grove-pack": 99900,
    },
  },
  US: {
    currency: "USD",
    amounts: {
      "starter-bloom": 299,
      "grove-pack": 599,
      "ancient-pack": 1299,
      "mythic-grove-pack": 2499,
    },
  },
  GB: {
    currency: "GBP",
    amounts: {
      "starter-bloom": 249,
      "grove-pack": 499,
      "ancient-pack": 1099,
      "mythic-grove-pack": 2199,
    },
  },
};

function normalizeClientRegion(region) {
  const value = String(region || "").trim().toUpperCase();

  if (value === "IN") return "IN";
  if (value === "US") return "US";
  if (value === "GB" || value === "UK") return "GB";

  return "";
}

function parseCloudflareTraceRegion(traceText) {
  const lines = String(traceText || "").split("\n");
  const locLine = lines.find((line) => line.startsWith("loc="));
  if (!locLine) return "";

  return normalizeClientRegion(locLine.replace("loc=", ""));
}

function getRegionFromBrowserHints() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const locale = navigator.language || "";
  const normalizedLocale = String(locale).replace("_", "-").toLowerCase();
  const localeRegionMatch = normalizedLocale.match(/-([a-z]{2})$/i);
  const localeRegion = normalizeClientRegion(localeRegionMatch?.[1] || "");

  if (timeZone.includes("Asia/Kolkata") || timeZone.includes("Asia/Calcutta")) {
    return "IN";
  }
  if (localeRegion === "IN") return "IN";

  if (normalizedLocale.includes("en-gb") || timeZone.includes("Europe/London")) {
    return "GB";
  }
  if (localeRegion === "GB") return "GB";

  if (normalizedLocale.includes("en-us") || timeZone.includes("America/")) {
    return "US";
  }
  if (localeRegion === "US") return "US";

  return "";
}

function formatCurrencyMinor(amountMinor, currency) {
  const numeric = Number(amountMinor);
  const safeAmountMinor = Number.isFinite(numeric) ? numeric : 0;
  const currencyCode = String(currency || "INR").toUpperCase();
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(safeAmountMinor / 100);
  } catch {
    return `${safeAmountMinor / 100} ${currencyCode}`;
  }
}

function buildGuestSeedPackPreviews(region) {
  const normalizedRegion = normalizeClientRegion(region) || DEFAULT_PAYMENT_REGION;
  const pricing = GUEST_REGION_PRICING[normalizedRegion] || GUEST_REGION_PRICING.IN;

  return Object.entries(GUEST_SEED_PACKS)
    .map(([id, pack]) => {
      const amountMinor = pricing.amounts[id];
      if (!amountMinor) return null;

      return {
        id,
        ...pack,
        amountMinor,
        currency: pricing.currency,
        region: normalizedRegion,
        bonusPercentPreview: 0,
        bonusSeedsPreview: 0,
        totalSeedsPreview: pack.baseSeeds,
      };
    })
    .filter(Boolean);
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

  const [paymentRegion, setPaymentRegion] = useState(DEFAULT_PAYMENT_REGION);
  const [isRegionDetecting, setIsRegionDetecting] = useState(true);
  const [regionDetectionSource, setRegionDetectionSource] = useState("loading");
  const [hasRegionForFetch, setHasRegionForFetch] = useState(false);
  const [seedPacks, setSeedPacks] = useState([]);
  const [seedPackLoading, setSeedPackLoading] = useState(false);
  const [seedPackBusyId, setSeedPackBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localSeeds, setLocalSeeds] = useState(user?.seeds || 0);
  const [seedPackMeta, setSeedPackMeta] = useState({
    successfulSeedPurchaseCount: 0,
    nextPurchaseNumber: 1,
    bonusPercentForNextPurchase: 0,
  });

  const isLoggedIn = Boolean(user?._id && token);

  useEffect(() => {
    setLocalSeeds(user?.seeds || 0);
  }, [user]);

  useEffect(() => {
    let isActive = true;

    const detectRegion = async () => {
      const hintRegion = getRegionFromBrowserHints();
      const initialRegion = hintRegion || DEFAULT_PAYMENT_REGION;

      if (!isActive) return;

      setPaymentRegion(initialRegion);
      setRegionDetectionSource(hintRegion ? "hint" : "default");
      setHasRegionForFetch(true);

      try {
        const traceResponse = await fetch("/cdn-cgi/trace", {
          method: "GET",
          cache: "no-store",
        });

        if (!isActive) return;

        if (traceResponse.ok) {
          const traceText = await traceResponse.text();
          const traceRegion = parseCloudflareTraceRegion(traceText);

          if (traceRegion) {
            setPaymentRegion((prev) => (prev === traceRegion ? prev : traceRegion));
            setRegionDetectionSource("trace");
          }
        }
      } catch {
        // In local development this endpoint is usually unavailable.
      } finally {
        if (isActive) {
          setIsRegionDetecting(false);
        }
      }
    };

    detectRegion();

    return () => {
      isActive = false;
    };
  }, []);

  const loadSeedPacks = useCallback(
    async (region) => {
      if (!token) {
        setSeedPackLoading(false);
        setSeedPacks(buildGuestSeedPackPreviews(region));
        setSeedPackMeta({
          successfulSeedPurchaseCount: 0,
          nextPurchaseNumber: 1,
          bonusPercentForNextPurchase: 0,
        });
        return;
      }

      try {
        setSeedPackLoading(true);

        const res = await fetch(
          `${API_BASE}/api/payments/seed-packs?region=${encodeURIComponent(region)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await readJsonSafe(res);

        if (!res.ok) {
          throw new Error(data.message || "Could not load Seed packs right now.");
        }

        setSeedPacks(Array.isArray(data.packs) ? data.packs : []);
        setSeedPackMeta({
          successfulSeedPurchaseCount: Number(data.successfulSeedPurchaseCount || 0),
          nextPurchaseNumber: Number(data.nextPurchaseNumber || 1),
          bonusPercentForNextPurchase: Number(data.bonusPercentForNextPurchase || 0),
        });
      } catch (err) {
        setSeedPacks([]);
        setError(err.message || "Could not load Seed packs right now.");
      } finally {
        setSeedPackLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!hasRegionForFetch) return;
    loadSeedPacks(paymentRegion);
  }, [paymentRegion, loadSeedPacks, hasRegionForFetch]);

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

        await loadSeedPacks(paymentRegion);

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
    [token, refreshUser, loadSeedPacks, paymentRegion, updateUser]
  );

  const handleSeedPackBuy = async (pack) => {
    if (!pack?.id || seedPackBusyId) return;

    if (!isLoggedIn) {
      setError("");
      setMessage("Log in or create an account to buy Seed packs.");
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
        // TODO: Region sent by client is only a UX hint; enforce strict geo rules server-side.
        body: JSON.stringify({ packId: pack.id, region: paymentRegion }),
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
          region: paymentRegion,
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
    if (seedPackMeta.bonusPercentForNextPurchase > 0) {
      return `${seedPackMeta.bonusPercentForNextPurchase}% bonus on next purchase`;
    }
    return "No bonus for next purchase";
  }, [seedPackMeta.bonusPercentForNextPurchase]);

  const regionLabel = REGION_LABELS[paymentRegion] || REGION_LABELS[DEFAULT_PAYMENT_REGION];
  const regionStatusLabel = isRegionDetecting
    ? "Detecting your region..."
    : regionDetectionSource === "default"
      ? "Showing default prices"
      : `Prices shown for ${regionLabel}`;
  const showAutoDetectedNote =
    !isRegionDetecting && regionDetectionSource !== "default";

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
        {showAutoDetectedNote && (
          <span className="buy-seeds-region-note">Region detected automatically</span>
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
              <span>Successful purchases: {seedPackMeta.successfulSeedPurchaseCount}</span>
              <span>Next purchase number: {seedPackMeta.nextPurchaseNumber}</span>
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
            Seed packs are unavailable for this region right now.
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
                      {formatCurrencyMinor(pack.amountMinor, pack.currency)}
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
                    disabled={Boolean(seedPackBusyId)}
                  >
                    {isBusy ? "Opening..." : isLoggedIn ? "Buy" : "Log in to buy"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <MobileBottomNav />
    </main>
  );
}

export default BuySeeds;
