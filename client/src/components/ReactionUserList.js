import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import DisplayTitlePill from "./DisplayTitlePill";
import FramedAvatar from "./FramedAvatar";
import { getDisplayCosmetics } from "../utils/engagement";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function ReactionUserModal({
  confessionId,
  targetType,
  targetId,
  reaction,
  onClose,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isWater = reaction === "water";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      targetType,
      targetId,
      reaction,
    });

    const loadReactionUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `${API_BASE}/api/confessions/${confessionId}/reactions?${params.toString()}`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Could not load reactions.");
        }

        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setUsers([]);
        setError(err?.message || "Could not load reactions.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadReactionUsers();
    return () => controller.abort();
  }, [confessionId, reaction, targetId, targetType]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="cw-reaction-users-overlay"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <section
        className="cw-reaction-users-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cw-reaction-users-title"
      >
        <header className="cw-reaction-users-header">
          <div>
            <span className="cw-reaction-users-kicker">
              {isWater ? "Growing support" : "Heated reactions"}
            </span>
            <h2 id="cw-reaction-users-title">
              {isWater ? "Watered by" : "Burned by"}
            </h2>
          </div>
          <button
            type="button"
            className="cw-reaction-users-close"
            onClick={onClose}
            aria-label="Close reaction list"
          >
            ×
          </button>
        </header>

        <div className="cw-reaction-users-list">
          {loading ? (
            <div className="cw-reaction-users-state">Loading reactions...</div>
          ) : error ? (
            <div className="cw-reaction-users-state is-error">{error}</div>
          ) : users.length === 0 ? (
            <div className="cw-reaction-users-state">
              {isWater
                ? "No one has watered this yet."
                : "No one has burned this yet."}
            </div>
          ) : (
            users.map((reactionUser) => {
              const equipped = getDisplayCosmetics(reactionUser);

              return (
                <Link
                  key={reactionUser._id}
                  to={`/user/${reactionUser._id}`}
                  className="cw-reaction-user-row"
                  onClick={onClose}
                >
                  <FramedAvatar
                    src={reactionUser.profilePicture}
                    username={reactionUser.username || "?"}
                    size={42}
                    frameId={equipped.frame}
                    effectId={equipped.visualEffect}
                    placeholder="🌿"
                  />
                  <span className="cw-reaction-user-copy">
                    <strong>@{reactionUser.username || "anonymous"}</strong>
                    <DisplayTitlePill titleId={equipped.title} />
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

export default function ReactionCountButton({
  confessionId,
  targetType,
  targetId,
  reaction,
  count,
  children,
  className = "",
  style,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const label = reaction === "water" ? "watered" : "burned";

  return (
    <>
      <button
        type="button"
        className={`cw-reaction-count-trigger ${className}`.trim()}
        style={style}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
        aria-label={`See who ${label} this ${targetType}`}
      >
        {children ?? count}
      </button>

      {isOpen && (
        <ReactionUserModal
          confessionId={confessionId}
          targetType={targetType}
          targetId={targetId}
          reaction={reaction}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
