import React, { useEffect, useMemo, useState } from "react";
import MobileBottomNav from "../components/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import FramedAvatar from "../components/FramedAvatar";
import { PostThemeFxLayers } from "../components/CosmeticFx";
import {
  getCosmeticAnimationClass,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  CONFESSION_MOODS,
  getConfessionThemeId,
  getDisplayCosmetics,
} from "../utils/engagement";
import { getConfessionImages } from "../utils/confessionImages";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const PAGE_LIMIT = 10;

const TRENDING_ASSETS = {
  header: "/assets/trending/trending_header_strip.webp",
  podium: "/assets/trending/podium_base.webp",
  rank1: "/assets/trending/rank_1_crown.webp",
  rank2: "/assets/trending/rank_2_silver.webp",
  rank3: "/assets/trending/rank_3_bronze.webp",
  skinGrove: "/assets/trending/trending_skin_grove.webp",
  skinMoon: "/assets/trending/trending_skin_moon.webp",
  skinScorched: "/assets/trending/trending_skin_scorched.webp",
  divider: "/assets/trending/leaf_divider.webp",
};

const getMobileSkinAsset = (post, realm, rank) => {
  const themeId = String(getTrendingPostThemeId(post) || "").toLowerCase();
  if (realm === "scorched" || themeId.includes("scorch") || themeId.includes("cinder") || themeId.includes("ember")) {
    return TRENDING_ASSETS.skinScorched;
  }
  if (themeId.includes("moon") || themeId.includes("star") || rank === 2) {
    return TRENDING_ASSETS.skinMoon;
  }
  return TRENDING_ASSETS.skinGrove;
};

const getRankBadgeAsset = (rank) => {
  if (rank === 1) return TRENDING_ASSETS.rank1;
  if (rank === 2) return TRENDING_ASSETS.rank2;
  if (rank === 3) return TRENDING_ASSETS.rank3;
  return null;
};
const PERIODS = [
  { key: "day", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "all", label: "All Time" },
];
const MOOD_SHORTCUTS = ["Healing", "Funny", "Love"];

const moodToSlug = (mood) => mood.toLowerCase().replace(/\s+/g, "-");

const normalizeMoodSlug = (slug) => {
  const value = String(slug || "").trim().toLowerCase();
  if (!value) return null;
  return (
    CONFESSION_MOODS.find((mood) => mood.toLowerCase().replace(/\s+/g, "-") === value) ||
    null
  );
};

const normalizeTrendingResponse = (data) => ({
  items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
  page: Number(data?.page) > 0 ? Number(data.page) : 1,
  limit: Number(data?.limit) > 0 ? Number(data.limit) : PAGE_LIMIT,
  total: Number(data?.total) >= 0 ? Number(data.total) : 0,
  totalPages: Number(data?.totalPages) > 0 ? Number(data.totalPages) : 1,
  hasMore: Boolean(data?.hasMore),
});

const getRealm = (post) => {
  const watered = post?.wateredBy?.length || 0;
  const burned = post?.burnedBy?.length || 0;

  if (watered > burned) return "grove";
  if (burned > watered) return "scorched";
  return "budding";
};

const getPostStats = (post) => {
  const water = post?.wateredBy?.length || 0;
  const burn = post?.burnedBy?.length || 0;
  const echoes = Array.isArray(post?.comments)
    ? post.comments.filter((comment) => !comment?.isHidden).length
    : 0;
  const comfort = Array.isArray(post?.comfortCards)
    ? post.comfortCards.reduce((sum, card) => sum + (Number(card?.count) || 0), 0)
    : 0;
  const seedsGenerated = water + burn + echoes * 2 + comfort;
  const energy = water * 2 + echoes * 3 + comfort + burn;

  return { water, burn, echoes, comfort, seedsGenerated, energy };
};

const getRankTier = (rank) => {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "green";
};

const getVisiblePageNumbers = (currentPage, totalPages) => {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), safeTotal);
  const pages = new Set([1, safeTotal, safeCurrent]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = safeCurrent + offset;
    if (page >= 1 && page <= safeTotal) pages.add(page);
  }

  if (safeCurrent <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (safeCurrent >= safeTotal - 2) {
    pages.add(safeTotal - 1);
    pages.add(safeTotal - 2);
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= safeTotal)
    .sort((a, b) => a - b);

  return sorted.reduce((acc, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) acc.push("ellipsis");
    acc.push(page);
    return acc;
  }, []);
};


const getPostAuthorUsername = (post) =>
  post?.userId?.username || post?.username || post?.author?.username || "anonymous";

const getPostMoodLabel = (post, realm) =>
  post?.mood || post?.tag || post?.category || (realm === "grove" ? "Grove" : realm === "scorched" ? "Scorched" : "Budding");

const getPostMessage = (post) =>
  post?.message || post?.text || post?.content || post?.confession || "Untitled whisper";

const formatTrendingDate = (value) => {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getComfortChipLabel = (card) => {
  if (!card) return "comfort";
  if (typeof card === "string") return card;
  return card.label || card.text || card.message || card.title || card.name || card.type || "comfort";
};

const getTrendingPostThemeId = (post) => {
  const equipped = getDisplayCosmetics(post?.userId);
  return getConfessionThemeId(post, equipped, post?.userId);
};

const normalizeThemeClass = (themeId) =>
  String(themeId || "")
    .replace(/^post-theme-/, "")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();

function TrendingThemeStage({ themeId, realm }) {
  if (!themeId) return null;

  const themeClass = getCosmeticAnimationClass(themeId);
  const themeStyle = getPostThemeStyle(themeId, realm);

  return (
    <span
      className={[
        "trending-theme-stage",
        themeClass,
        `trending-theme-stage--${normalizeThemeClass(themeId)}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={themeStyle}
      data-theme={themeId}
      aria-hidden="true"
    >
      <PostThemeFxLayers themeId={themeId} />
    </span>
  );
}


function TrendingImagePreview({ images }) {
  if (!Array.isArray(images) || images.length === 0) return null;

  const extraCount = images.length - 1;

  return (
    <span className="trending-image-preview" aria-label={`${images.length} attached image${images.length === 1 ? "" : "s"}`}>
      <img src={images[0]} alt="confession attachment preview" loading="lazy" decoding="async" />
      {extraCount > 0 && <span className="trending-image-preview__count">+{extraCount}</span>}
    </span>
  );
}

function TrendingPostPreview({ post, realm, stats, onOpen }) {
  const username = getPostAuthorUsername(post);
  const moodLabel = getPostMoodLabel(post, realm);
  const message = getPostMessage(post);
  const comfortCards = Array.isArray(post?.comfortCards) ? post.comfortCards.slice(0, 4) : [];
  const confessionImages = getConfessionImages(post);

  const themeId = getTrendingPostThemeId(post);

  return (
    <button
      type="button"
      className={[
        "trending-clean-main",
        themeId ? "trending-clean-main--with-theme" : "",
        confessionImages.length ? "trending-clean-main--with-image" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onOpen}
    >
      <TrendingThemeStage themeId={themeId} realm={realm} />
      <div className="trending-clean-copy">
        <TrendingImagePreview images={confessionImages} />
        <div className="trending-clean-topline">
          <span className="trending-clean-author">@{username}</span>
          <span className={`trending-clean-mood trending-clean-mood--${realm}`}>
            {moodLabel}
          </span>
          <span className="trending-clean-realm">{realm}</span>
        </div>

        <p className="trending-clean-message">{message}</p>

        {comfortCards.length > 0 && (
          <div className="trending-clean-comforts" aria-label="Comfort cards">
            {comfortCards.map((card, index) => (
              <span key={`${getComfortChipLabel(card)}-${index}`}>
                {getComfortChipLabel(card)}
                {Number(card?.count) > 0 ? <em>{card.count}</em> : null}
              </span>
            ))}
          </div>
        )}

        <div className="trending-clean-footer">
          <span>🌱 {stats.water} water</span>
          <span>🔥 {stats.burn} burn</span>
          <span>💬 {stats.echoes} echoes</span>
          <span>{formatTrendingDate(post?.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

function TrendingRankBadge({ rank }) {
  const displayRank = String(rank).padStart(2, "0");
  const tier = getRankTier(rank);
  const rankLabel = rank === 1 ? "top" : rank === 2 ? "rise" : rank === 3 ? "bloom" : "rank";

  return (
    <div className={`trending-rank-badge trending-rank-badge--${tier}`} aria-label={`Rank ${rank}`}>
      {getRankBadgeAsset(rank) ? (
        <img
          src={getRankBadgeAsset(rank)}
          alt=""
          className="trending-rank-wreath-img trending-rank-wreath-img--asset"
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <img
          src="/assets/wreath.png"
          alt=""
          className="trending-rank-wreath-img"
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      )}
      <span>{displayRank}</span>
      <em>{rankLabel}</em>
    </div>
  );
}

function TrendingAuthorBadge({ post, rank }) {
  const username = post?.userId?.username || "anonymous";
  const equipped = getDisplayCosmetics(post?.userId);
  const frameId =
    equipped.frame ||
    post?.userId?.equippedFrame ||
    post?.userId?.frame ||
    "";
  const tier = getRankTier(rank);

  return (
    <div className={`trending-clean-author-badge trending-clean-author-badge--${tier}`}>
      <span className="trending-clean-author-crown">{rank <= 3 ? "✦" : ""}</span>
      <FramedAvatar
        src={post?.userId?.profilePicture}
        username={username}
        frameId={frameId}
        effectId={equipped.visualEffect}
        size={58}
        context="post"
        placeholder={username?.[0]?.toUpperCase() || "?"}
      />
      <strong>@{username}</strong>
      <small>{rank === 1 ? "Crowned Echo" : "Trending Spirit"}</small>
    </div>
  );
}

function MobilePodiumSlot({ post, rank, page, onOpen }) {
  if (!post) return <div className={`trending-mobile-podium-slot trending-mobile-podium-slot--${rank} is-empty`} />;

  const realm = getRealm(post);
  const username = getPostAuthorUsername(post);
  const stats = getPostStats(post);
  const equipped = getDisplayCosmetics(post?.userId);
  const frameId = equipped.frame || post?.userId?.equippedFrame || post?.userId?.frame || "";
  const globalRank = (page - 1) * PAGE_LIMIT + rank;

  return (
    <button
      type="button"
      className={`trending-mobile-podium-slot trending-mobile-podium-slot--${rank} trending-mobile-podium-slot--${getRankTier(rank)}`}
      onClick={onOpen}
      aria-label={`Open rank ${globalRank} confession by ${username}`}
    >
      <span className="trending-mobile-podium-badge" aria-hidden="true">
        <img src={getRankBadgeAsset(rank)} alt="" loading="lazy" decoding="async" />
        <strong>{String(globalRank).padStart(2, "0")}</strong>
      </span>
      <FramedAvatar
        src={post?.userId?.profilePicture}
        username={username}
        frameId={frameId}
        effectId={equipped.visualEffect}
        size={rank === 1 ? 58 : 48}
        context="post"
        placeholder={username?.[0]?.toUpperCase() || "?"}
      />
      <span className="trending-mobile-podium-name">@{username}</span>
      <span className="trending-mobile-podium-score">
        🌱 {stats.water} · 💬 {stats.echoes}
      </span>
    </button>
  );
}

function MobileTrendingPodium({ posts, page, navigate }) {
  const topThree = posts.slice(0, 3);
  if (!topThree.length) return null;

  const openPost = (post) => {
    const realm = getRealm(post);
    navigate(`/confession/${post._id}?realm=${realm}`);
  };

  return (
    <section className="trending-mobile-podium" aria-label="Top three trending confessions">
      <div className="trending-mobile-podium-head">
        <span>Top 3 whispers</span>
        <strong>{page === 1 ? "Crowned by the grove" : `Page ${page} leaders`}</strong>
      </div>
      <div className="trending-mobile-podium-stage">
        <img
          src={TRENDING_ASSETS.podium}
          alt=""
          className="trending-mobile-podium-base"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <MobilePodiumSlot post={topThree[1]} rank={2} page={page} onOpen={() => topThree[1] && openPost(topThree[1])} />
        <MobilePodiumSlot post={topThree[0]} rank={1} page={page} onOpen={() => topThree[0] && openPost(topThree[0])} />
        <MobilePodiumSlot post={topThree[2]} rank={3} page={page} onOpen={() => topThree[2] && openPost(topThree[2])} />
      </div>
    </section>
  );
}

function TrendingPagination({ page, totalPages, loading, onChangePage }) {
  const visiblePages = getVisiblePageNumbers(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <nav className="trending-pagination" aria-label="Trending pagination">
      <button
        type="button"
        onClick={() => onChangePage(page - 1)}
        disabled={loading || page <= 1}
      >
        Prev
      </button>

      {visiblePages.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="trending-pagination-ellipsis">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? "active" : ""}
            onClick={() => onChangePage(item)}
            disabled={loading || item === page}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChangePage(page + 1)}
        disabled={loading || page >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}

export default function TrendingPage() {
  const navigate = useNavigate();
  const { moodSlug } = useParams();
  const mood = useMemo(() => normalizeMoodSlug(moodSlug), [moodSlug]);
  const invalidMood = Boolean(moodSlug && !mood);

  const [period, setPeriod] = useState("week");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  const activePeriodLabel = PERIODS.find((item) => item.key === period)?.label || "This Week";

  const pageStats = useMemo(
    () =>
      posts.reduce(
        (summary, post) => {
          const stats = getPostStats(post);
          summary.water += stats.water;
          summary.burn += stats.burn;
          summary.echoes += stats.echoes;
          summary.seedsGenerated += stats.seedsGenerated;
          summary.energy += stats.energy;
          return summary;
        },
        { water: 0, burn: 0, echoes: 0, seedsGenerated: 0, energy: 0 }
      ),
    [posts]
  );

  const topPost = posts[0] || null;

  const fetchTrending = async ({ pageToLoad = 1, signal } = {}) => {
    if (invalidMood) {
      setPosts([]);
      setTotal(0);
      setTotalPages(1);
      setError("That mood page does not exist.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(pageToLoad));
      params.set("limit", String(PAGE_LIMIT));
      params.set("period", period);
      if (mood) params.set("mood", mood);

      const res = await fetch(`${API_BASE}/api/confessions/trending?${params.toString()}`, {
        signal,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Could not load trending confessions.");
      }

      const normalized = normalizeTrendingResponse(data);
      setPosts(normalized.items);
      setPage(normalized.page || pageToLoad);
      setTotal(normalized.total);
      setTotalPages(Math.max(1, normalized.totalPages));
      setError("");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Trending load error:", err);
        setPosts([]);
        setTotal(0);
        setTotalPages(1);
        setError(err.message || "Could not load trending confessions.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTrending({ pageToLoad: 1, signal: controller.signal });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, moodSlug]);

  const handlePeriodChange = (nextPeriod) => {
    if (nextPeriod === period) return;
    setPage(1);
    setPeriod(nextPeriod);
  };

  const handlePageChange = (nextPage) => {
    const safePage = Math.min(Math.max(1, nextPage), totalPages || 1);
    if (safePage === page || loading) return;
    fetchTrending({ pageToLoad: safePage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="search-page-shell trending-page-shell">
      <button type="button" className="trending-floating-back-btn" onClick={() => navigate(-1)}>
        back
      </button>

      <section className="search-hero-card trending-hero-card trending-leaderboard-hero" style={{ "--trending-header-art": `url(${TRENDING_ASSETS.header})` }}>
        <p className="search-kicker">{"\u2726"} public discovery</p>
        <h1>{mood ? `${mood} Confessions` : "Trending Confessions"}</h1>
        <p>
          {mood
            ? `Popular ${mood.toLowerCase()} posts ranked by community activity.`
            : "The whispers the wall cannot stop watering, burning, and echoing."}
        </p>

        <div className="search-filter-row trending-period-row" aria-label="Trending period">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handlePeriodChange(item.key)}
              className={period === item.key ? "active" : ""}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!mood && (
          <div className="trending-mood-row" aria-label="Mood shortcuts">
            {MOOD_SHORTCUTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => navigate(`/moods/${moodToSlug(item)}`)}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="search-results-head trending-results-head">
        <div>
          <strong>
            {loading
              ? "Finding trending posts..."
              : `${total || posts.length} ranked confession${(total || posts.length) === 1 ? "" : "s"}`}
          </strong>
          <span>
            {mood ? `${mood} mood, ` : ""}
            {activePeriodLabel} · Page {page} of {totalPages || 1}
          </span>
        </div>
      </section>

      {!error && posts.length > 0 && (
        <MobileTrendingPodium posts={posts} page={page} navigate={navigate} />
      )}

      {error && <div className="search-state-card error">{error}</div>}

      {!error && !loading && posts.length === 0 && (
        <div className="search-state-card">
          <strong>No trending posts yet.</strong>
          <span>Community activity will bring posts here.</span>
        </div>
      )}

      {!error && posts.length > 0 && (
        <section className="trending-leaderboard-layout">
          <div className="trending-ranked-list">
            {posts.map((post, index) => {
              const rank = (page - 1) * PAGE_LIMIT + index + 1;
              const realm = getRealm(post);
              const stats = getPostStats(post);
              return (
                <article
                  key={post._id}
                  className={[
                    "trending-clean-card",
                    `trending-clean-card--${getRankTier(rank)}`,
                    `trending-clean-card--${realm}`,
                    rank <= 3 ? "trending-clean-card--mobile-podium-source" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                style={{ "--trending-mobile-card-skin": `url(${getMobileSkinAsset(post, realm, rank)})` }}
                >
                  <div className="trending-clean-rank-column">
                    <TrendingRankBadge rank={rank} />
                  </div>

                  <span
                    className="trending-node-connector trending-node-connector--rank-main"
                    aria-hidden="true"
                  />

                  <TrendingPostPreview
                    post={post}
                    realm={realm}
                    stats={stats}
                    onOpen={() => navigate(`/confession/${post._id}?realm=${realm}`)}
                  />

                  <span
                    className="trending-node-connector trending-node-connector--main-side"
                    aria-hidden="true"
                  />

                  <aside className="trending-clean-side" aria-label="Trending post summary">
                    <TrendingAuthorBadge post={post} rank={rank} />
                    <div className="trending-clean-stat-grid">
                      <span>
                        <strong>{stats.water}</strong>
                        <em>water</em>
                      </span>
                      <span>
                        <strong>{stats.burn}</strong>
                        <em>burn</em>
                      </span>
                      <span>
                        <strong>{stats.echoes}</strong>
                        <em>echoes</em>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="trending-clean-open-btn"
                      onClick={() => navigate(`/confession/${post._id}?realm=${realm}`)}
                    >
                      Open whisper
                    </button>
                  </aside>
                </article>
              );
            })}

            <TrendingPagination
              page={page}
              totalPages={totalPages}
              loading={loading}
              onChangePage={handlePageChange}
            />
          </div>

          <aside className="trending-insights-panel">
            <div className="trending-insight-card featured">
              <span>Trending window</span>
              <strong>{activePeriodLabel}</strong>
              <small>{mood ? `${mood} mood only` : "All moods combined"}</small>
            </div>

            <div className="trending-insight-card">
              <span>Total confessions</span>
              <strong>{total}</strong>
              <small>ranked in this filter</small>
            </div>

            <div className="trending-insight-card seeds-generated">
              <span>Total seeds generated</span>
              <strong>{pageStats.seedsGenerated}</strong>
              <small>visible ranked activity on this page</small>
            </div>

            <div className="trending-insight-card">
              <span>Visible echoes</span>
              <strong>{pageStats.echoes}</strong>
              <small>comments on this page</small>
            </div>

            <div className="trending-insight-card compact">
              <span>Page energy</span>
              <strong>{pageStats.energy}</strong>
              <small>water, echoes, comfort, and burn</small>
            </div>

            {topPost && (
              <div className="trending-top-spirit">
                <span>Top Spirit</span>
                <TrendingAuthorBadge post={topPost} rank={(page - 1) * PAGE_LIMIT + 1} />
              </div>
            )}
          </aside>
        </section>
      )}

      <MobileBottomNav />
    </main>
  );
}
