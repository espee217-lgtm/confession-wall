import React, { useEffect, useId, useMemo, useState } from "react";
import MobileBottomNav from "../components/MobileBottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Shop.css";
import { getCosmeticAnimationClass } from "../utils/cosmetics";
import { AnimatedBadge, CosmeticFxLayers } from "../components/CosmeticFx";
import FramedAvatar from "../components/FramedAvatar";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const TYPE_LABELS = {
  badge: "Profile Badge",
  frame: "Profile Frame",
  title: "Display Title",
  postTheme: "Post Theme",
  reactionStyle: "Reaction Style",
  visualEffect: "Profile Frame",
};

const TYPE_ORDER = ["all", "badge", "frame", "title", "postTheme"];
const SEED_ICON = "\uD83C\uDF31";
const FIRE_ICON = "\uD83D\uDD25";
// Keep this list synced with server/utils/seedRewards.js and weeklyForestEvents constants.
const SEED_EARNING_RULES = [
  {
    id: "daily-login",
    type: "daily_login",
    action: "Daily login",
    reward: "+10 Seeds",
    limit: "1 time per day",
    notes: ["Resets on IST day boundary."],
  },
  {
    id: "create-post",
    type: "create_confession",
    action: "Create confession",
    reward: "+5 Seeds",
    limit: "5 rewarded posts per day",
    notes: [],
  },
  {
    id: "create-comment",
    type: "create_comment",
    action: "Create comment",
    reward: "+2 Seeds",
    limit: "10 rewarded comments per day",
    notes: [],
  },
  {
    id: "receive-reaction",
    type: "receive_reaction",
    action: "Receive reaction on your post",
    reward: "+1 Seed",
    limit: "20 rewarded reactions per day",
    notes: [
      "Reward goes to the post owner, not the person reacting.",
      "The same reactor cannot repeatedly farm reward on the same post.",
    ],
  },
  {
    id: "accepted-report",
    type: "accepted_report",
    action: "Accepted report",
    reward: "+15 Seeds",
    limit: "5 rewarded accepted reports per day",
    notes: ["Only when admin accepts/resolves/removes valid reported content."],
  },
  {
    id: "weekly-winner",
    type: "weekly_winner",
    action: "Weekly event winner (most watered)",
    reward: "+1000 Seeds",
    limit: "Weekly event payout",
    notes: ["Paid by the weekly event system."],
  },
];

const getDisplayType = (type) => (type === "visualEffect" ? "frame" : type);
const hasAnimatedPreview = (item) => Boolean(getCosmeticAnimationClass(item?.id));

function getRarityClass(rarity) {
  return String(rarity || "common")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function isLimitedDrop(item) {
  return Boolean(item?.isLimited || item?.availableFrom || item?.availableUntil);
}

function getAvailabilityStatus(item) {
  return item?.availabilityStatus || "available";
}

function getUnavailableActionLabel(item) {
  return getAvailabilityStatus(item) === "upcoming" ? "Soon" : "Ended";
}

function formatDropCountdown(item, now) {
  if (!isLimitedDrop(item)) return "";

  const status = getAvailabilityStatus(item);

  if (status === "expired") {
    return "Ended";
  }

  const targetValue = status === "upcoming" ? item.availableFrom : item.availableUntil;

  if (!targetValue) {
    return status === "upcoming" ? "Coming soon" : "Limited";
  }

  const targetTime = new Date(targetValue).getTime();

  if (!Number.isFinite(targetTime)) {
    return status === "upcoming" ? "Coming soon" : "Limited";
  }

  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const diffMinutes = Math.ceil((targetTime - currentTime) / 60000);
  const prefix = status === "upcoming" ? "Starts" : "Ends";

  if (diffMinutes <= 0) {
    return status === "upcoming" ? "Opening soon" : "Ending soon";
  }

  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = diffMinutes % 60;

  if (days > 0) {
    return `${prefix} in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${prefix} in ${hours}h ${minutes}m`;
  }

  return `${prefix} in ${minutes}m`;
}

function getDropBadges(item, now) {
  const badges = [];

  if (item?.featured) {
    badges.push({
      key: "featured",
      label: "Featured",
      className: "shop-drop-chip shop-drop-chip--featured",
    });
  }

  if (item?.dropLabel) {
    badges.push({
      key: "drop-label",
      label: item.dropLabel,
      className: "shop-drop-chip shop-drop-chip--limited",
    });
  } else if (isLimitedDrop(item)) {
    badges.push({
      key: "limited",
      label: "Limited Time",
      className: "shop-drop-chip shop-drop-chip--limited",
    });
  }

  const countdown = formatDropCountdown(item, now);

  if (countdown) {
    badges.push({
      key: "countdown",
      label: countdown,
      className: `shop-drop-chip shop-drop-chip--countdown shop-drop-chip--${getAvailabilityStatus(item)}`,
    });
  }

  return badges;
}

function sortDropItems(a, b) {
  return (a.featuredRank || 999) - (b.featuredRank || 999) || a.name.localeCompare(b.name);
}

function formatPreviewHandle(username) {
  if (!username) return "@Anonymous";
  return username.startsWith("@") ? username : `@${username}`;
}


function ShopIconSvg() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M9 13h.01" />
      <path d="M15 13h.01" />
    </svg>
  );
}

function EarnIcon({ type }) {
  const uid = useId();
  const sunId = `${uid}-earn-sun-gradient`;
  const docId = `${uid}-earn-doc-gradient`;
  const chatId = `${uid}-earn-chat-gradient`;
  const sproutId = `${uid}-earn-sprout-gradient`;
  const shieldId = `${uid}-earn-shield-gradient`;
  const trophyId = `${uid}-earn-trophy-gradient`;

  switch (type) {
    case "daily_login":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={sunId} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff3b0" />
              <stop offset="46%" stopColor="#ffd96a" />
              <stop offset="100%" stopColor="#9af56f" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="10" fill={`url(#${sunId})`} stroke="#f7ffd8" strokeWidth="1.5" />
          <path d="M24 5.5v5.5M24 37v5.5M8.5 24H14M34 24h5.5M13 13l3.9 3.9M31.1 30.1l3.9 3.9M35 13l-3.9 3.9M16.9 30.1 13 34" stroke="#f7ffd8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "create_confession":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={docId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f9ffd8" />
              <stop offset="55%" stopColor="#dff7b8" />
              <stop offset="100%" stopColor="#94d879" />
            </linearGradient>
          </defs>
          <path d="M15 7h13l7 7v27H15z" fill={`url(#${docId})`} stroke="#f7ffd8" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M28 7v8h8" stroke="#f7ffd8" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M19 21h10M19 27h7" stroke="#24411f" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M31.5 23.5l-5.5 5.5-1.5 4 4-1.5 5.5-5.5-2.5-2.5Z" fill="#ffd86a" stroke="#fff7cc" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case "create_comment":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={chatId} x1="8" y1="10" x2="40" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f8ffd7" />
              <stop offset="100%" stopColor="#8cdf76" />
            </linearGradient>
          </defs>
          <path d="M10 13.5h28a5.5 5.5 0 0 1 5.5 5.5v9A5.5 5.5 0 0 1 38 33.5H24l-8.5 7v-7H10A5.5 5.5 0 0 1 4.5 28v-9A5.5 5.5 0 0 1 10 13.5Z" fill={`url(#${chatId})`} stroke="#f7ffd8" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M15 21h18M15 26h12" stroke="#24411f" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "receive_reaction":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={sproutId} x1="10" y1="35" x2="36" y2="10" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8fdc79" />
              <stop offset="52%" stopColor="#bdf5a7" />
              <stop offset="100%" stopColor="#f7ffcc" />
            </linearGradient>
          </defs>
          <path d="M24 35c0-8 0-13 0-19" stroke="#f7ffd8" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 22c-5 0-8.5-3.8-8.5-8.5 4.8 0 8.5 3.5 8.5 8.5Z" fill={`url(#${sproutId})`} stroke="#f7ffd8" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M24 20c5 0 8.5-3.8 8.5-8.5-4.8 0-8.5 3.5-8.5 8.5Z" fill={`url(#${sproutId})`} stroke="#f7ffd8" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M17.5 34.5h13" stroke="#ffd86a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "accepted_report":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={shieldId} x1="9" y1="8" x2="38" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f9ffd8" />
              <stop offset="52%" stopColor="#d0f1a9" />
              <stop offset="100%" stopColor="#7bc86b" />
            </linearGradient>
          </defs>
          <path d="M24 7 36 11v10c0 8.5-5.5 15.2-12 19-6.5-3.8-12-10.5-12-19V11Z" fill={`url(#${shieldId})`} stroke="#f7ffd8" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m18.5 24 4 4.2 7-7.2" stroke="#24411f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "weekly_winner":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={trophyId} x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff1b6" />
              <stop offset="45%" stopColor="#ffd46a" />
              <stop offset="100%" stopColor="#9eec73" />
            </linearGradient>
          </defs>
          <path d="M16 10h16v5c0 6-4 10-8 12-4-2-8-6-8-12v-5Z" fill={`url(#${trophyId})`} stroke="#fff7cc" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M15 12H10c0 6 3 9 8 10" stroke="#f7ffd8" strokeWidth="2" strokeLinecap="round" />
          <path d="M33 12h5c0 6-3 9-8 10" stroke="#f7ffd8" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 27v6" stroke="#fff7cc" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 36h12" stroke="#f7ffd8" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 39h8" stroke="#ffd86a" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function ShopPreview({
  item,
  mode = "card",
  isAnimating = false,
  previewUser,
  equipped,
}) {
  const previewClass = item.previewClass || "";
  const animClass = getCosmeticAnimationClass(item.id) || "";
  const isModal = mode === "modal";
  const shellClassName = ["shop-preview-shell", `shop-preview-shell--${mode}`]
    .filter(Boolean)
    .join(" ");
  const handle = formatPreviewHandle(previewUser?.username);
  const avatarSrc = previewUser?.profilePicture || "";
  const currentFrameId = equipped?.frame || "";
  const currentEffectId = equipped?.visualEffect || "";
  const currentBadgeId = equipped?.badge || "";

  if (item.type === "frame") {
    const containerClass = previewClass.startsWith("cw-cosmetic-preview-frame-")
      ? previewClass
      : "";

    return (
      <div
        className={[shellClassName, "shop-preview-frame", containerClass]
          .filter(Boolean)
          .join(" ")}
        data-animating={isAnimating ? "true" : "false"}
      >
        <div className="shop-preview-profile-sample">
          <FramedAvatar
            username={previewUser?.username || "Anonymous"}
            src={avatarSrc}
            frameId={item.id}
            effectId=""
            size={isModal ? 118 : 62}
            context={isModal ? "profile" : "shop"}
            className={["shop-preview-avatar", animClass].filter(Boolean).join(" ")}
            placeholder="A"
          />
          {isModal && (
            <div className="shop-preview-profile-meta">
              <strong>{handle}</strong>
              <span>Profile frame preview</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (item.type === "visualEffect") {
    return (
      <div
        className={[shellClassName, "shop-preview-frame", "shop-preview-visual-effect"].join(" ")}
        data-animating={isAnimating ? "true" : "false"}
      >
        <div className="shop-preview-profile-sample">
          <FramedAvatar
            username={previewUser?.username || "Anonymous"}
            src={avatarSrc}
            frameId=""
            effectId={item.id}
            size={isModal ? 118 : 62}
            context={isModal ? "profile" : "shop"}
            className={["shop-preview-avatar", animClass].filter(Boolean).join(" ")}
            placeholder="A"
          />
          {isModal && (
            <div className="shop-preview-profile-meta">
              <strong>{handle}</strong>
              <span>Avatar aura preview</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (item.type === "postTheme") {
    const postClass = previewClass || animClass;

    return (
      <div
        className={[
          shellClassName,
          "shop-preview-post",
          postClass,
          isModal ? "shop-preview-post--modal" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-animating={isAnimating ? "true" : "false"}
      >
        {isModal && (
          <div className="shop-preview-post-header">
            <FramedAvatar
              username={previewUser?.username || "Anonymous"}
              src={avatarSrc}
              frameId={currentFrameId}
              effectId={currentEffectId}
              size={40}
              context="post"
              className="shop-preview-post-avatar"
              placeholder="A"
            />
            <div className="shop-preview-post-meta">
              <div className="shop-preview-post-name-row">
                <strong>{handle}</strong>
                {currentBadgeId ? <AnimatedBadge badgeId={currentBadgeId} size="sm" /> : null}
              </div>
              <span>This is how your confession will look.</span>
            </div>
          </div>
        )}
        <CosmeticFxLayers cosmeticId={item.id} />
        <div className="shop-preview-post-line wide" />
        <div className="shop-preview-post-line" />
        {isModal && (
          <p className="shop-preview-post-copy">
            The forest keeps your words anonymous, but the card theme changes the
            feeling around them.
          </p>
        )}
        <div className="shop-preview-post-actions">
          <span>{SEED_ICON} 12</span>
          <span>{FIRE_ICON} 3</span>
        </div>
      </div>
    );
  }

  if (item.type === "title") {
    return (
      <div
        className={[shellClassName, "shop-preview-title"].join(" ")}
        data-animating={isAnimating ? "true" : "false"}
      >
        <span className="shop-preview-name">{handle}</span>
        <span
          className={`shop-preview-title-text ${previewClass || animClass}`.trim()}
        >
          {item.name}
        </span>
        {isModal && (
          <p className="shop-preview-title-copy">
            Display titles sit beside your profile wherever titles already
            appear.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={[
        shellClassName,
        "shop-preview-badge",
        previewClass,
        animClass,
      ]
        .filter(Boolean)
        .join(" ")}
      data-animating={isAnimating ? "true" : "false"}
    >
      {isModal ? (
        <div className="shop-preview-profile-sample shop-preview-profile-sample--badge">
          <FramedAvatar
            username={previewUser?.username || "Anonymous"}
            src={avatarSrc}
            frameId={currentFrameId}
            effectId={currentEffectId}
            size={78}
            context="profile"
            className="shop-preview-avatar"
            placeholder="A"
          />
          <div className="shop-preview-profile-meta">
            <div className="shop-preview-name-row">
              <strong>{handle}</strong>
              <AnimatedBadge badgeId={item.id} size="lg" />
            </div>
            <span>Badge preview</span>
          </div>
        </div>
      ) : (
        <AnimatedBadge badgeId={item.id} size="lg" />
      )}
    </div>
  );
}

function CosmeticPreviewModal({
  item,
  onClose,
  previewUser,
  equipped,
  owned,
  isEquipped,
  busy,
  canAfford,
  onBuy,
  onEquip,
  now,
}) {
  if (!item) return null;

  const availabilityStatus = getAvailabilityStatus(item);
  const unavailableForPurchase = !owned && availabilityStatus !== "available";
  const dropBadges = getDropBadges(item, now);

  return (
    <div className="shop-preview-modal-backdrop" onClick={onClose}>
      <div
        className="shop-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-preview-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="shop-preview-close"
          aria-label="Close cosmetic preview"
          onClick={onClose}
        >
          {"\u00D7"}
        </button>

        <div className="shop-preview-modal-topline">
          <span className={`shop-rarity ${getRarityClass(item.rarity)}`}>
            {item.rarity || "Common"}
          </span>
          <span className="shop-item-type">
            {TYPE_LABELS[getDisplayType(item.type)] || item.type}
          </span>
        </div>

        {dropBadges.length > 0 && (
          <div className="shop-drop-badges shop-drop-badges--modal">
            {dropBadges.map((badge) => (
              <span className={badge.className} key={badge.key}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <div className="shop-preview-modal-content">
          <div className="shop-preview-modal-stage">
            <ShopPreview
              item={item}
              mode="modal"
              isAnimating
              previewUser={previewUser}
              equipped={equipped}
            />
          </div>

          <div className="shop-preview-modal-copy">
            <h2 id="shop-preview-modal-title">
              <span>{item.icon}</span>
              {item.name}
            </h2>
            <p>{item.description}</p>
            <div className="shop-preview-modal-price">{SEED_ICON} {item.price}</div>

            <div className="shop-preview-modal-actions">
              {isEquipped ? (
                <button type="button" className="shop-equipped-btn" disabled>
                  Equipped
                </button>
              ) : owned ? (
                <button
                  type="button"
                  className="shop-equip-btn"
                  onClick={() => onEquip(item)}
                  disabled={busy}
                >
                  {busy ? "Equipping..." : "Equip"}
                </button>
              ) : (
                <button
                  type="button"
                  className="shop-buy-btn"
                  onClick={() => onBuy(item)}
                  disabled={busy || !canAfford || unavailableForPurchase}
                  title={
                    unavailableForPurchase
                      ? "This limited drop is not available to buy."
                      : !canAfford
                        ? "Not enough Seeds"
                        : "Buy cosmetic"
                  }
                >
                  {busy
                    ? "Buying..."
                    : unavailableForPurchase
                      ? getUnavailableActionLabel(item)
                      : canAfford
                        ? "Buy"
                        : "Need Seeds"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeOwnedCosmetics(ownedCosmetics) {
  if (!Array.isArray(ownedCosmetics)) return [];

  return ownedCosmetics.map((owned) => {
    if (typeof owned === "string") {
      return { itemId: owned };
    }

    return owned;
  });
}

function Shop() {
  const navigate = useNavigate();
  const { user, token, updateUser, refreshUser } = useAuth();
  const userId = user?._id || "";

  const [items, setItems] = useState([]);
  const [activeType, setActiveType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedPreviewCosmetic, setSelectedPreviewCosmetic] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const speedOverlayUrl = `${process.env.PUBLIC_URL}/assets/speed.png`;
  const blowOverlayUrl = `${process.env.PUBLIC_URL}/assets/blow.png`;

  const [localEquipped, setLocalEquipped] = useState(
    user?.equippedCosmetics || {}
  );

  const [localOwned, setLocalOwned] = useState(
    normalizeOwnedCosmetics(user?.ownedCosmetics)
  );

  const [localSeeds, setLocalSeeds] = useState(user?.seeds || 0);

  useEffect(() => {
    setLocalEquipped(user?.equippedCosmetics || {});
    setLocalOwned(normalizeOwnedCosmetics(user?.ownedCosmetics));
    setLocalSeeds(user?.seeds || 0);
  }, [user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const equipped = localEquipped;
  const previewUser = user || {};
  const isPreviewOpen = Boolean(selectedPreviewCosmetic);

  const ownedSet = useMemo(() => {
    return new Set(localOwned.map((item) => item.itemId));
  }, [localOwned]);

  const filteredItems = useMemo(() => {
    if (activeType === "all") return items;
    return items.filter((item) => getDisplayType(item.type) === activeType);
  }, [items, activeType]);

  const animatedItems = useMemo(() => {
    return filteredItems.filter((item) => hasAnimatedPreview(item));
  }, [filteredItems]);

  const staticItems = useMemo(() => {
    return filteredItems.filter((item) => !hasAnimatedPreview(item));
  }, [filteredItems]);

  const limitedDropItems = useMemo(() => {
    return filteredItems
      .filter((item) => isLimitedDrop(item))
      .slice()
      .sort(sortDropItems);
  }, [filteredItems]);

  const featuredDropItems = useMemo(() => {
    return filteredItems
      .filter((item) => item.featured && !isLimitedDrop(item))
      .slice()
      .sort(sortDropItems);
  }, [filteredItems]);

  const typeCounts = useMemo(() => {
    const counts = { all: items.length };

    items.forEach((item) => {
      const displayType = getDisplayType(item.type);
      counts[displayType] = (counts[displayType] || 0) + 1;
    });

    return counts;
  }, [items]);

  const syncUserState = async (newUser) => {
    if (!newUser) return;

    updateUser?.(newUser);

    setLocalEquipped(newUser.equippedCosmetics || {});
    setLocalOwned(normalizeOwnedCosmetics(newUser.ownedCosmetics));
    setLocalSeeds(newUser.seeds || 0);

    try {
      await refreshUser?.();
    } catch (err) {
      console.warn("Could not refresh user after shop action:", err);
    }
  };

  useEffect(() => {
    if (!userId || !token) {
      navigate("/login");
      return;
    }

    const loadShop = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/shop`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load shop.");
        }

        setItems(Array.isArray(data.items) ? data.items : []);

        if (data.serverNow) {
          const serverNow = new Date(data.serverNow);
          if (!Number.isNaN(serverNow.getTime())) {
            setNow(serverNow);
          }
        }

        try {
          await refreshUser?.();
        } catch (err) {
          console.warn("Could not refresh user while loading shop:", err);
        }
      } catch (err) {
        setError(err.message || "Could not load shop.");
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [userId, token, navigate, refreshUser]);

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedPreviewCosmetic(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  const openCosmeticPreview = (item) => {
    setSelectedPreviewCosmetic(item);
  };

  const closeCosmeticPreview = () => {
    setSelectedPreviewCosmetic(null);
  };

  const handleBuy = async (item) => {
    if (!token || busyItemId) return;

    setMessage("");
    setError("");
    setBusyItemId(item.id);

    try {
      const res = await fetch(`${API_BASE}/api/shop/buy/${item.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not buy this cosmetic.");
      }

      await syncUserState(data.user);

      setMessage(data.message || `${item.name} unlocked!`);
    } catch (err) {
      setError(err.message || "Could not buy this cosmetic.");
    } finally {
      setBusyItemId("");
    }
  };

  const handleEquip = async (item) => {
    if (!token || busyItemId) return;

    setMessage("");
    setError("");
    setBusyItemId(item.id);

    try {
      const res = await fetch(`${API_BASE}/api/shop/equip/${item.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not equip this cosmetic.");
      }

      await syncUserState(data.user);

      setMessage(data.message || `${item.name} equipped!`);
    } catch (err) {
      setError(err.message || "Could not equip this cosmetic.");
    } finally {
      setBusyItemId("");
    }
  };

  const handleUnequip = async (type) => {
    if (!token || busyItemId) return;

    setMessage("");
    setError("");
    setBusyItemId(type);

    try {
      const res = await fetch(`${API_BASE}/api/shop/unequip/${type}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not unequip this cosmetic.");
      }

      await syncUserState(data.user);

      setMessage(data.message || "Cosmetic unequipped.");
    } catch (err) {
      setError(err.message || "Could not unequip this cosmetic.");
    } finally {
      setBusyItemId("");
    }
  };

  const renderItemAction = (item) => {
    const owned = ownedSet.has(item.id);
    const isEquipped =
      item.type === "visualEffect"
        ? equipped.visualEffect === item.id
        : equipped[item.type] === item.id;
    const canAfford = (localSeeds || 0) >= item.price;
    const busy = busyItemId === item.id;
    const availabilityStatus = getAvailabilityStatus(item);
    const unavailableForPurchase = !owned && availabilityStatus !== "available";

    if (isEquipped) {
      return (
        <button type="button" className="shop-equipped-btn" disabled>
          Equipped
        </button>
      );
    }

    if (owned) {
      return (
        <button
          type="button"
          className="shop-equip-btn"
          onClick={(event) => {
            event.stopPropagation();
            handleEquip(item);
          }}
          disabled={busy || Boolean(busyItemId)}
        >
          {busy ? "Equipping..." : "Equip"}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="shop-buy-btn"
        onClick={(event) => {
          event.stopPropagation();
          handleBuy(item);
        }}
        disabled={busy || Boolean(busyItemId) || !canAfford || unavailableForPurchase}
        title={
          unavailableForPurchase
            ? "This limited drop is not available to buy."
            : !canAfford
              ? "Not enough Seeds"
              : "Buy cosmetic"
        }
      >
        {busy
          ? "Buying..."
          : unavailableForPurchase
            ? getUnavailableActionLabel(item)
            : canAfford
              ? "Buy"
              : "Need Seeds"}
      </button>
    );
  };

  const renderItemCard = (item) => {
    const dropBadges = getDropBadges(item, now);
    const unavailableForPurchase =
      !ownedSet.has(item.id) && getAvailabilityStatus(item) !== "available";

    return (
      <article
        className={[
          "shop-item-card",
          unavailableForPurchase ? "shop-item-card--unavailable" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        key={item.id}
        role="button"
        tabIndex={0}
        aria-label={`Preview ${item.name}`}
        onClick={() => openCosmeticPreview(item)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openCosmeticPreview(item);
          }
        }}
      >
        <div className="shop-item-topline">
          <span className={`shop-rarity ${getRarityClass(item.rarity)}`}>
            {item.rarity || "Common"}
          </span>

          <span className="shop-item-type">
            {TYPE_LABELS[getDisplayType(item.type)] || item.type}
          </span>
        </div>

        {dropBadges.length > 0 && (
          <div className="shop-drop-badges">
            {dropBadges.map((badge) => (
              <span className={badge.className} key={badge.key}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <ShopPreview
          item={item}
          mode="card"
          isAnimating={false}
          previewUser={previewUser}
          equipped={equipped}
        />

        <div className="shop-item-body">
          <h3>
            <span>{item.icon}</span>
            {item.name}
          </h3>

          <p>{item.description}</p>
        </div>

        <div className="shop-item-footer">
          <div className="shop-price">{SEED_ICON} {item.price}</div>
          {renderItemAction(item)}
        </div>
      </article>
    );
  };

  if (!user || !token) return null;

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <div className="shop-hero-icon">
          <ShopIconSvg />
        </div>

        <div>
          <p className="shop-kicker">Confession Wall Cosmetics</p>
          <h1>Forest Shop</h1>
          <p className="shop-subtitle">
            Spend Seeds on profile badges, frames, display titles, post
            themes, and avatar auras. Phase 1 keeps everything cosmetic
            only, so nobody gets unfair power.
          </p>
        </div>

        <div className="shop-seeds-panel">
          <span>Available Seeds</span>
          <strong>{SEED_ICON} {localSeeds || 0}</strong>
        </div>
      </section>

      <section className="shop-buyseeds-cta" aria-label="Buy Seed packs">
        <div>
          <p className="shop-kicker">Need more Seeds?</p>
          <h2>Buy Seed Packs</h2>
          <p>Top up with regional Seed Packs and bonus rewards.</p>
        </div>
        <button
          type="button"
          className="shop-buyseeds-cta-btn"
          onClick={() => navigate("/buy-seeds")}
        >
          Buy Seeds
        </button>
      </section>
      
      <section
        className="shop-earn-panel"
        aria-label="How to Earn Seeds"
        style={{
          "--speed-overlay-url": `url(${speedOverlayUrl})`,
          "--blow-overlay-url": `url(${blowOverlayUrl})`,
        }}
      >
        <div className="shop-earn-head">
          <div>
            <p className="shop-kicker">Seeds Economy</p>
            <h2>How to Earn Seeds</h2>
            <p>Complete actions around the wall and earn Seeds daily.</p>
          </div>
        </div>

        <div className="shop-earn-grid">
          {SEED_EARNING_RULES.map((rule) => (
            <article
              className="shop-earn-item"
              key={rule.id}
            >
              <div className="shop-earn-item-top">
                <div className="shop-earn-icon" aria-hidden="true">
                  <EarnIcon type={rule.type} />
                </div>
                <div>
                  <strong>{rule.action}</strong>
                  <span>{rule.limit}</span>
                </div>
              </div>

              <div className="shop-earn-reward">{rule.reward}</div>

              {rule.notes.length > 0 && (
                <ul className="shop-earn-notes">
                  {rule.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        <div className="shop-earn-footer">
          <span>Daily caps help prevent farming.</span>
          <span>Shop purchases spend Seeds.</span>
          <span>Notifications report when Seeds are gained/lost.</span>
        </div>
      </section>

      <section className="shop-equipped-panel">
        <div>
          <h2>Equipped right now</h2>
          <p>
            Your active cosmetics. Frames, titles, badges, and post themes
            now display across your profile and posts.
          </p>
        </div>

        <div className="shop-equipped-grid">
          {["badge", "frame", "title", "postTheme"].map((type) => {
            const activeId =
              type === "frame"
                ? equipped.frame || equipped.visualEffect
                : equipped[type];
            const activeItem = items.find((item) => item.id === activeId);
            const unequipType =
              type === "frame" && !equipped.frame && equipped.visualEffect
                ? "visualEffect"
                : type;

            return (
              <div className="shop-equipped-card" key={type}>
                <span>{TYPE_LABELS[type]}</span>

                <strong>
                  {activeItem ? `${activeItem.icon} ${activeItem.name}` : "None"}
                </strong>

                {activeItem && (
                  <button
                    type="button"
                    onClick={() => handleUnequip(unequipType)}
                    disabled={busyItemId === unequipType}
                  >
                    {busyItemId === unequipType ? "Removing..." : "Unequip"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {(message || error) && (
        <div className={error ? "shop-alert error" : "shop-alert"}>
          {error || message}
        </div>
      )}

      <div className="shop-tabs">
        {TYPE_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            className={activeType === type ? "active" : ""}
            onClick={() => setActiveType(type)}
          >
            {type === "all" ? "All" : TYPE_LABELS[type]}
            <span>{typeCounts[type] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="shop-loading">Loading forest cosmetics...</div>
      ) : (
        <>
          {featuredDropItems.length > 0 && (
            <section className="shop-cosmetic-section shop-drop-section">
              <div className="shop-section-header">
                <h2>Featured Drops</h2>
                <p>Premium cosmetics highlighted for this shop rotation.</p>
              </div>
              <div className="shop-grid shop-grid--drops">
                {featuredDropItems.map(renderItemCard)}
              </div>
            </section>
          )}

          {limitedDropItems.length > 0 && (
            <section className="shop-cosmetic-section shop-drop-section shop-drop-section--limited">
              <div className="shop-section-header">
                <h2>Limited Time</h2>
                <p>Seasonal drops keep their equip access after purchase, but buying closes when the timer ends.</p>
              </div>
              <div className="shop-grid shop-grid--drops">
                {limitedDropItems.map(renderItemCard)}
              </div>
            </section>
          )}

          {animatedItems.length > 0 && (
            <section className="shop-cosmetic-section">
              <div className="shop-section-header">
                <h2>Animated Cosmetics</h2>
                <p>Live frames, badges, and card themes that wake up when you hover them.</p>
              </div>
              <div className="shop-grid shop-grid--animated">
                {animatedItems.map(renderItemCard)}
              </div>
            </section>
          )}

          {staticItems.length > 0 && (
            <section className="shop-cosmetic-section">
              {animatedItems.length > 0 ? (
                <div className="shop-section-header">
                  <h2>Static Cosmetics</h2>
                  <p>Clean profile upgrades that stay still until you equip them.</p>
                </div>
              ) : null}
              <div className="shop-grid">
                {staticItems.map(renderItemCard)}
              </div>
            </section>
          )}
        </>
      )}

      {selectedPreviewCosmetic && (
        <CosmeticPreviewModal
          item={selectedPreviewCosmetic}
          onClose={closeCosmeticPreview}
          previewUser={previewUser}
          equipped={equipped}
          owned={ownedSet.has(selectedPreviewCosmetic.id)}
          isEquipped={
            selectedPreviewCosmetic.type === "visualEffect"
              ? equipped.visualEffect === selectedPreviewCosmetic.id
              : equipped[selectedPreviewCosmetic.type] ===
                selectedPreviewCosmetic.id
          }
          busy={busyItemId === selectedPreviewCosmetic.id}
          canAfford={(localSeeds || 0) >= selectedPreviewCosmetic.price}
          onBuy={handleBuy}
          onEquip={handleEquip}
          now={now}
        />
      )}

      <MobileBottomNav />
    </main>
  );
}

export { Shop };
export default Shop;
