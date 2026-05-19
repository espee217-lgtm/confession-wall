import React, { useEffect, useMemo, useState } from "react";
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

const getDisplayType = (type) => (type === "visualEffect" ? "frame" : type);

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
          <span>🌱 12</span>
          <span>🔥 3</span>
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
}) {
  if (!item) return null;

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
          ×
        </button>

        <div className="shop-preview-modal-topline">
          <span className={`shop-rarity ${item.rarity?.toLowerCase() || "common"}`}>
            {item.rarity || "Common"}
          </span>
          <span className="shop-item-type">
            {TYPE_LABELS[getDisplayType(item.type)] || item.type}
          </span>
        </div>

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
            <div className="shop-preview-modal-price">🌱 {item.price}</div>

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
                  disabled={busy || !canAfford}
                  title={!canAfford ? "Not enough Seeds" : "Buy cosmetic"}
                >
                  {busy ? "Buying..." : canAfford ? "Buy" : "Need Seeds"}
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

  const [items, setItems] = useState([]);
  const [activeType, setActiveType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedPreviewCosmetic, setSelectedPreviewCosmetic] = useState(null);

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
    if (!user || !token) {
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
  }, [user, token, navigate, refreshUser]);

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
        disabled={busy || Boolean(busyItemId) || !canAfford}
        title={!canAfford ? "Not enough Seeds" : "Buy cosmetic"}
      >
        {busy ? "Buying..." : canAfford ? "Buy" : "Need Seeds"}
      </button>
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
          <strong>ðŸŒ± {localSeeds || 0}</strong>
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
        <section className="shop-grid">
          {filteredItems.map((item) => (
            <article className="shop-item-card" key={item.id}>
              <div className="shop-item-topline">
                <span
                  className={`shop-rarity ${item.rarity?.toLowerCase() || "common"}`}
                >
                  {item.rarity || "Common"}
                </span>

                <span className="shop-item-type">
                  {TYPE_LABELS[getDisplayType(item.type)] || item.type}
                </span>
              </div>

              <button
                type="button"
                className="shop-preview-trigger"
                onClick={() => openCosmeticPreview(item)}
                aria-label={`Preview ${item.name}`}
              >
                <ShopPreview
                  item={item}
                  mode="card"
                  isAnimating={false}
                  previewUser={previewUser}
                  equipped={equipped}
                />
              </button>

              <div className="shop-item-body">
                <h3>
                  <span>{item.icon}</span>
                  {item.name}
                </h3>

                <p>{item.description}</p>
              </div>

              <div className="shop-item-footer">
                <div className="shop-price">ðŸŒ± {item.price}</div>
                {renderItemAction(item)}
              </div>
            </article>
          ))}
        </section>
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
        />
      )}

      <MobileBottomNav />
    </main>
  );
}

export { Shop };
export default Shop;
