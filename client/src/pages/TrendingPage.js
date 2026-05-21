import React, { useEffect, useMemo, useState } from "react";
import MobileBottomNav from "../components/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { CONFESSION_MOODS } from "../utils/engagement";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const PAGE_LIMIT = 10;
const BACK_ARROW = "\u2190";
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
  hasMore: Boolean(data?.hasMore),
});

const appendUniquePosts = (current, incoming) => {
  const seen = new Set(current.map((post) => String(post?._id)));
  const merged = [...current];

  incoming.forEach((post) => {
    const id = String(post?._id || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(post);
  });

  return merged;
};

const getRealm = (post) => {
  const watered = post?.wateredBy?.length || 0;
  const burned = post?.burnedBy?.length || 0;

  if (watered > burned) return "grove";
  if (burned > watered) return "scorched";
  return "budding";
};

export default function TrendingPage() {
  const navigate = useNavigate();
  const { moodSlug } = useParams();
  const mood = useMemo(() => normalizeMoodSlug(moodSlug), [moodSlug]);
  const invalidMood = Boolean(moodSlug && !mood);

  const [period, setPeriod] = useState("week");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const fetchTrending = async ({ pageToLoad = 1, append = false, signal } = {}) => {
    if (invalidMood) {
      setPosts([]);
      setHasMore(false);
      setError("That mood page does not exist.");
      return;
    }

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
        setPage(1);
        setHasMore(false);
      }

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
      setPosts((prev) =>
        append ? appendUniquePosts(prev, normalized.items) : normalized.items
      );
      setPage(normalized.page || pageToLoad);
      setHasMore(normalized.hasMore);
      if (!append) setError("");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Trending load error:", err);
        if (!append) {
          setPosts([]);
          setHasMore(false);
          setError(err.message || "Could not load trending confessions.");
        } else {
          window.cwToast?.("Could not load more trending posts.", "error");
        }
      }
    } finally {
      if (!signal?.aborted) {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTrending({ pageToLoad: 1, append: false, signal: controller.signal });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, moodSlug]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchTrending({ pageToLoad: page + 1, append: true });
  };

  return (
    <main className="search-page-shell trending-page-shell">
      <section className="search-hero-card trending-hero-card">
        <button type="button" className="search-back-btn" onClick={() => navigate(-1)}>
          {BACK_ARROW} back
        </button>

        <p className="search-kicker">{"\u2726"} public discovery</p>
        <h1>{mood ? `${mood} Confessions` : "Trending Confessions"}</h1>
        <p>
          {mood
            ? `Popular ${mood.toLowerCase()} posts ranked by community activity.`
            : "Browse the most active posts across the wall."}
        </p>

        <div className="search-filter-row trending-period-row" aria-label="Trending period">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
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

      <section className="search-results-head">
        <div>
          <strong>
            {loading
              ? "Finding trending posts..."
              : `${posts.length} trending post${posts.length === 1 ? "" : "s"}`}
          </strong>
          <span>
            {mood ? `${mood} mood, ` : ""}
            {PERIODS.find((item) => item.key === period)?.label || "This Week"}
          </span>
        </div>
      </section>

      {error && <div className="search-state-card error">{error}</div>}

      {!error && !loading && posts.length === 0 && (
        <div className="search-state-card">
          <strong>No trending posts yet.</strong>
          <span>Community activity will bring posts here.</span>
        </div>
      )}

      <section className="search-results-list">
        {posts.map((post) => {
          const realm = getRealm(post);
          return (
            <PostCard
              key={post._id}
              post={post}
              realm={realm}
              onOpen={() => navigate(`/confession/${post._id}?realm=${realm}`)}
            />
          );
        })}
      </section>

      {(hasMore || loadingMore) && (
        <section
          className="search-results-head"
          style={{ justifyContent: "center", marginTop: "8px" }}
        >
          <button
            type="button"
            className="trending-load-more"
            onClick={handleLoadMore}
            disabled={loading || loadingMore || !hasMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </section>
      )}

      <MobileBottomNav />
    </main>
  );
}
