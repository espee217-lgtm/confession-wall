import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const FILTERS = [
  { key: "all", label: "All", icon: "✦" },
  { key: "grove", label: "Grove", icon: "🌿" },
  { key: "budding", label: "Budding", icon: "🌱" },
  { key: "scorched", label: "Scorched", icon: "🔥" },
];

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

        const res = await fetch(`${API_BASE}/api/confessions/search?${params.toString()}`, {
          signal: controller.signal,
        });

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
          ← back
        </button>

        <p className="search-kicker">✦ find whispers</p>
        <h1>Search Confessions</h1>
        <p>Look through posts by text, username, or realm.</p>

        <div className="search-input-wrap">
          <span>🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search confessions..."
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              ✕
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
          <strong>{loading ? "Searching..." : `${results.length} result${results.length === 1 ? "" : "s"}`}</strong>
          <span>{trimmedQuery ? `for “${trimmedQuery}”` : "showing recent confessions"}</span>
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
    </main>
  );
}