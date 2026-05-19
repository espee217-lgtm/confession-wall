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


function ShopPreview({ item }) {
  const previewClass = item.previewClass || "";
  const animClass = getCosmeticAnimationClass(item.id) || "";

  if (item.type === "frame") {
    const containerClass = previewClass.startsWith("cw-cosmetic-preview-frame-")
      ? previewClass
      : "";

    return (
      <div className={`shop-preview-frame ${containerClass}`.trim()}>
        <FramedAvatar
          username="Anonymous"
          frameId={item.id}
          size={62}
          context="shop"
          className={`shop-preview-avatar ${animClass}`.trim()}
          placeholder="A"
        />
      </div>
    );
  }

  if (item.type === "visualEffect") {
    return (
      <div className="shop-preview-frame shop-preview-visual-effect">
        <FramedAvatar
          username="Anonymous"
          effectId={item.id}
          size={62}
          context="shop"
          className={`shop-preview-avatar ${animClass}`.trim()}
          placeholder="A"
        />
      </div>
    );
  }

  if (item.type === "postTheme") {
    const postClass = previewClass || animClass;

    return (
      <div className={`shop-preview-post ${postClass}`.trim()}>
        <CosmeticFxLayers cosmeticId={item.id} />
        <div className="shop-preview-post-line wide" />
        <div className="shop-preview-post-line" />
        <div className="shop-preview-post-actions">
          <span>🌱 12</span>
          <span>🔥 3</span>
        </div>
      </div>
    );
  }

  if (item.type === "title") {
    return (
      <div className="shop-preview-title">
        <span className="shop-preview-name">Anonymous</span>
        <span className={`shop-preview-title-text ${previewClass || animClass}`.trim()}>
          {item.name}
        </span>
      </div>
    );
  }

  return (
    <div className={`shop-preview-badge ${[previewClass, animClass].filter(Boolean).join(" ")}`.trim()}>
      <AnimatedBadge badgeId={item.id} size="lg" />
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
  }, [user?._id, token, navigate, refreshUser]);

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
          <strong>🌱 {localSeeds || 0}</strong>
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
          {filteredItems.map((item) => {
            const owned = ownedSet.has(item.id);
            const isEquipped =
              item.type === "visualEffect"
                ? equipped.visualEffect === item.id
                : equipped[item.type] === item.id;
            const canAfford = (localSeeds || 0) >= item.price;
            const busy = busyItemId === item.id;

            return (
              <article className="shop-item-card" key={item.id}>
                <div className="shop-item-topline">
                  <span
                    className={`shop-rarity ${
                      item.rarity?.toLowerCase() || "common"
                    }`}
                  >
                    {item.rarity || "Common"}
                  </span>

                  <span className="shop-item-type">
                    {TYPE_LABELS[getDisplayType(item.type)] || item.type}
                  </span>
                </div>

                <ShopPreview item={item} />

                <div className="shop-item-body">
                  <h3>
                    <span>{item.icon}</span>
                    {item.name}
                  </h3>

                  <p>{item.description}</p>
                </div>

                <div className="shop-item-footer">
                  <div className="shop-price">🌱 {item.price}</div>

                  {isEquipped ? (
                    <button
                      type="button"
                      className="shop-equipped-btn"
                      disabled
                    >
                      Equipped
                    </button>
                  ) : owned ? (
                    <button
                      type="button"
                      className="shop-equip-btn"
                      onClick={() => handleEquip(item)}
                      disabled={busy || Boolean(busyItemId)}
                    >
                      {busy ? "Equipping..." : "Equip"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="shop-buy-btn"
                      onClick={() => handleBuy(item)}
                      disabled={busy || Boolean(busyItemId) || !canAfford}
                      title={!canAfford ? "Not enough Seeds" : "Buy cosmetic"}
                    >
                      {busy ? "Buying..." : canAfford ? "Buy" : "Need Seeds"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
      <MobileBottomNav />
    </main>
  );
}

export { Shop };
export default Shop;
