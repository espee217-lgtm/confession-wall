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

const getRealm = (post) => {
  const watered = post.wateredBy?.length || 0;
  const burned = post.burnedBy?.length || 0;
  const total = watered + burned;

  if (total === 0) return "budding";
  if (burned / total > 0.5) return "scorched";
  return "grove";
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const controller = new AbortController();
    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (trimmedQuery) params.set("q", trimmedQuery);
        if (filter !== "all") params.set("type", filter);

        const res = await fetch(
          `${API_BASE}/api/confessions/search?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Could not search right now.");
          setResults([]);
          return;
        }

        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          setError("Could not connect to search.");
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(delay);
    };
  }, [trimmedQuery, filter]);

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
      <MobileBottomNav />
    </main>
  );
}
