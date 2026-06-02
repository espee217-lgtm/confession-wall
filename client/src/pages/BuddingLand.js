import React, { useEffect, useRef, useState } from "react";
import MobileBottomNav from "../components/MobileBottomNav";
import { useNavigate, useLocation } from "react-router-dom";
import PostCard from "../components/PostCard";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000/api/confessions";
const PAGE_LIMIT = 10;

const normalizeFeedResponse = (data) => {
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

const getPostSortTime = (post = {}) => {
  const createdAtTime = post?.createdAt ? new Date(post.createdAt).getTime() : NaN;
  if (Number.isFinite(createdAtTime)) return createdAtTime;

  const id = String(post?._id || "");
  if (/^[a-f\d]{24}$/i.test(id)) {
    const objectIdSeconds = Number.parseInt(id.slice(0, 8), 16);
    if (Number.isFinite(objectIdSeconds)) {
      return objectIdSeconds * 1000;
    }
  }

  return 0;
};

const sortNewestFirst = (posts = []) =>
  [...posts].sort((a, b) => {
    const timeDiff = getPostSortTime(b) - getPostSortTime(a);
    if (timeDiff !== 0) return timeDiff;
    return String(b?._id || "").localeCompare(String(a?._id || ""));
  });

const isBuddingPost = (post) => {
  const watered = post?.wateredBy?.length || 0;
  const burned = post?.burnedBy?.length || 0;
  return watered === burned;
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

  return sortNewestFirst(merged);
};

export default function BuddingLand() {
  const navigate = useNavigate();
  const location = useLocation();

  const targetPostId = new URLSearchParams(location.search).get("post");
  const [highlightedPost, setHighlightedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const fetchedTargetPostRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialPage = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_URL}/realm/budding?page=1&limit=${PAGE_LIMIT}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Could not load budding posts.");
        }

        if (cancelled) return;

        const normalized = normalizeFeedResponse(data);
        const buddingOnly = normalized.items.filter(isBuddingPost);
        setPosts(sortNewestFirst(buddingOnly));
        setPage(normalized.page);
        setHasMore(normalized.hasMore);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setPosts([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInitialPage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchedTargetPostRef.current = null;
  }, [targetPostId]);

  useEffect(() => {
    if (!targetPostId || loading) return;
    if (posts.some((post) => String(post._id) === targetPostId)) return;
    if (fetchedTargetPostRef.current === targetPostId) return;

    fetchedTargetPostRef.current = targetPostId;
    let cancelled = false;

    const fetchTargetPost = async () => {
      try {
        const res = await fetch(`${API_URL}/${targetPostId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isBuddingPost(data)) return;
        if (cancelled) return;

        setPosts((prev) => {
          if (prev.some((post) => String(post._id) === String(data._id))) {
            return prev;
          }
          return appendUniquePosts(prev, [data]);
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchTargetPost();

    return () => {
      cancelled = true;
    };
  }, [targetPostId, loading, posts]);

  const handleLoadMore = async () => {
    if (loadingMore || loading || !hasMore) return;

    const nextPage = page + 1;
    try {
      setLoadingMore(true);
      const res = await fetch(
        `${API_URL}/realm/budding?page=${nextPage}&limit=${PAGE_LIMIT}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Could not load more budding posts.");
      }

      const normalized = normalizeFeedResponse(data);
      const buddingOnly = normalized.items.filter(isBuddingPost);
      setPosts((prev) => appendUniquePosts(prev, buddingOnly));
      setPage(normalized.page || nextPage);
      setHasMore(normalized.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!targetPostId || loading || posts.length === 0) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setHighlightedPost(targetPostId);

        setTimeout(() => {
          setHighlightedPost(null);
        }, 1800);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [targetPostId, loading, posts]);

  return (
    <div className="cw-realm-page cw-budding-page" style={{ position: "relative", minHeight: "100vh" }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.45,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/budding.mp4" type="video/mp4" />
      </video>

      <style>{`
        @keyframes buddingBlink {
          0% {
            box-shadow: 0 0 0 rgba(190,255,220,0);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 35px rgba(190,255,220,0.75);
            transform: scale(1.025);
            border-color: rgba(190,255,220,0.9);
          }
          100% {
            box-shadow: 0 0 0 rgba(190,255,220,0);
            transform: scale(1);
          }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 20%, rgba(120,255,180,0.12), transparent 60%)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "640px",
          margin: "0 auto",
          padding: "24px 16px 60px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#9be7c4",
              letterSpacing: "0.04em",
              margin: "0 0 6px",
            }}
          >
            🌱 The Budding Land
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#7fd8b0",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Where confessions await their fate
          </p>

          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(150,255,200,0.4), transparent)",
              margin: "16px 0 0",
            }}
          />
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#9be7c4",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
            }}
          >
            seeds are settling…
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#a8cbb5",
              fontSize: "13px",
              padding: "48px 0",
              fontStyle: "italic",
              letterSpacing: "0.06em",
            }}
          >
            nothing rests here yet…
          </div>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard
                key={p._id}
                post={p}
                realm="budding"
                highlighted={highlightedPost === p._id}
                onOpen={() => navigate(`/confession/${p._id}?realm=budding`)}
              />
            ))}

            {(hasMore || loadingMore) && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore || !hasMore}
                  style={{
                    border: "1px solid rgba(150,255,200,0.36)",
                    background: "rgba(7,30,20,0.75)",
                    color: "#9be7c4",
                    borderRadius: "999px",
                    fontSize: "12px",
                    padding: "7px 14px",
                    fontFamily: "Georgia, serif",
                    cursor: loadingMore || !hasMore ? "default" : "pointer",
                    opacity: loadingMore || !hasMore ? 0.65 : 1,
                  }}
                >
                  {loadingMore ? "loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}
