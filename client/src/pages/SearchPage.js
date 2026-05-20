import React, { useEffect, useMemo, useState } from "react";
import MobileBottomNav from "../components/MobileBottomNav";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const FILTERS = [
  { key: "all", label: "All", icon: "\u2726" },
  { key: "grove", label: "Grove", icon: "\uD83C\uDF3F" },
  { key: "budding", label: "Budding", icon: "\uD83C\uDF31" },
  { key: "scorched", label: "Scorched", icon: "\uD83D\uDD25" },
];

const BACK_ARROW = "\u2190";
const SEARCH_ICON = "\uD83D\uDD0D";
const CLOSE_ICON = "\u00D7";
const LEFT_QUOTE = "\u201C";
const RIGHT_QUOTE = "\u201D";
const PAGE_LIMIT = 10;

const normalizeSearchResponse = (data) => {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      hasMore: false,
    };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: Number(data?.page) > 0 ? Number(data.page) : 1,
    hasMore: Boolean(data?.hasMore),
  };
};

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
  const watered = post.wateredBy?.length || 0;
  const burned = post.burnedBy?.length || 0;

  if (watered > burned) return "grove";
  if (burned > watered) return "scorched";
  return "budding";
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  const fetchResults = async ({ pageToLoad = 1, append = false, signal } = {}) => {
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
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (filter !== "all") params.set("type", filter);
      params.set("page", String(pageToLoad));
      params.set("limit", String(PAGE_LIMIT));

      const res = await fetch(`${API_BASE}/api/confessions/search?${params.toString()}`, {
        signal,
      });

      const data = await res.json();

      if (!res.ok) {
        if (!append) {
          setError(data.message || "Could not search right now.");
          setResults([]);
        }
        return;
      }

      const normalized = normalizeSearchResponse(data);
      setResults((prev) =>
        append ? appendUniquePosts(prev, normalized.items) : normalized.items
      );
      setPage(normalized.page || pageToLoad);
      setHasMore(normalized.hasMore);
      if (!append) {
        setError("");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
        if (!append) {
          setError("Could not connect to search.");
          setResults([]);
          setHasMore(false);
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
    const delay = setTimeout(async () => {
      await fetchResults({ pageToLoad: 1, append: false, signal: controller.signal });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(delay);
    };
  }, [trimmedQuery, filter]);

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    await fetchResults({ pageToLoad: page + 1, append: true });
  };

  return (
    <main className="search-page-shell">
      <section className="search-hero-card">
        <button type="button" className="search-back-btn" onClick={() => navigate(-1)}>
          {BACK_ARROW} back
        </button>

        <p className="search-kicker">{"\u2726"} find whispers</p>
        <h1>Search Confessions</h1>
        <p>Look through posts by text, username, or realm.</p>

        <div className="search-input-wrap">
          <span>{SEARCH_ICON}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search confessions..."
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              {CLOSE_ICON}
            </button>
          )}
        </div>

        <div className="search-filter-row">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={filter === item.key ? "active" : ""}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="search-results-head">
        <div>
          <strong>
            {loading
              ? "Searching..."
              : `${results.length} result${results.length === 1 ? "" : "s"}`}
          </strong>
          <span>
            {trimmedQuery
              ? `for ${LEFT_QUOTE}${trimmedQuery}${RIGHT_QUOTE}`
              : "showing recent confessions"}
          </span>
        </div>
      </section>

      {error && <div className="search-state-card error">{error}</div>}

      {!error && !loading && results.length === 0 && (
        <div className="search-state-card">
          <strong>No confessions found.</strong>
          <span>Try a different word or realm.</span>
        </div>
      )}

      <section className="search-results-list">
        {results.map((post) => {
          const realm = getRealm(post);
          return (
            <PostCard
              key={post._id}
              post={post}
              realm={realm}
              onOpen={() => navigate(`/confession/${post._id}`)}
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
            onClick={handleLoadMore}
            disabled={loading || loadingMore || !hasMore}
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "#efeaf6",
              borderRadius: "999px",
              fontSize: "12px",
              padding: "7px 14px",
              cursor: loading || loadingMore || !hasMore ? "default" : "pointer",
              opacity: loading || loadingMore || !hasMore ? 0.65 : 1,
            }}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </section>
      )}
      <MobileBottomNav />
    </main>
  );
}
