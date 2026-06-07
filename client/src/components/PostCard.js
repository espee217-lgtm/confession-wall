import DisplayTitlePill from "./DisplayTitlePill";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FramedAvatar from "./FramedAvatar";
import { AnimatedBadge, PostThemeFxLayers } from "./CosmeticFx";
import {
  getCosmeticAnimationClass,
  getPostThemeStyle,
} from "../utils/cosmetics";
import {
  getComfortCardSummary,
  getConfessionThemeId,
  getDisplayCosmetics,
  getMoodChipStyle,
  getPollTotalVotes,
  getSavedConfessionIdSet,
} from "../utils/engagement";
import {
  normalizeContentWarning,
  shouldBlurSensitiveContent,
} from "../utils/contentWarning";
import { getConfessionImages } from "../utils/confessionImages";
import TranslatableText from "./TranslatableText";
import CardActionMenu from "./CardActionMenu";
import ReactionCountButton from "./ReactionUserList";
import { copyConfessionLink, shareConfession } from "../utils/shareConfession";
import { getAdminToken, isAdminMainSiteMode } from "../utils/adminMode";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const REPORT_URL = `${API_BASE}/api/reports`;
const PRESSED_LEAVES_URL = `${API_BASE}/api/auth/pressed-leaves`;

function PostCardImagePreview({ images, blurred }) {
  if (!Array.isArray(images) || images.length === 0) return null;

  const extraCount = images.length - 1;

  return (
    <div className="post-card-image-preview" aria-label={`${images.length} attached image${images.length === 1 ? "" : "s"}`}>
      <img
        src={images[0]}
        alt="confession attachment preview"
        loading="lazy"
        decoding="async"
        className={blurred ? "is-blurred" : ""}
      />
      {extraCount > 0 && <span className="post-card-image-preview__count">+{extraCount}</span>}
    </div>
  );
}

export default function PostCard({ post, realm, highlighted, onOpen }) {
  const { token, user, updateUser } = useAuth();
  const [localPost, setLocalPost] = useState(post);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSensitiveRevealed, setIsSensitiveRevealed] = useState(false);

  useEffect(() => {
    setLocalPost(post);
    setIsSensitiveRevealed(false);
    setIsDeleted(false);
    setIsEditingPost(false);
    setEditMessage(String(post?.message || ""));
  }, [post]);

  const isBudding = realm === "budding";
  const isGrove = realm === "grove";
  const isScorched = realm === "scorched";

  const username = localPost.userId?.username || "anonymous";
  const profilePicture = localPost.userId?.profilePicture;

  const equipped = getDisplayCosmetics(localPost.userId);
  const frameId =
    equipped.frame ||
    localPost.userId?.equippedFrame ||
    localPost.userId?.frame ||
    "";

  const postThemeId = getConfessionThemeId(localPost, equipped, localPost.userId);
  const postThemeStyle = getPostThemeStyle(postThemeId, realm);
  const postThemeClass = getCosmeticAnimationClass(postThemeId);
  const hasCustomPostTheme = Boolean(postThemeId);
  const moodStyle = getMoodChipStyle(localPost.mood);
  const comfortCards = getComfortCardSummary(localPost.comfortCards);
  const savedConfessionIds = useMemo(() => getSavedConfessionIdSet(user), [user]);
  const isSaved = savedConfessionIds.has(String(localPost._id));
  const viewerId = String(user?._id || "");
  const userWatered = Boolean(
    viewerId &&
      localPost.wateredBy?.some(
        (reactionUserId) => String(reactionUserId?._id || reactionUserId || "") === viewerId
      )
  );
  const userBurned = Boolean(
    viewerId &&
      localPost.burnedBy?.some(
        (reactionUserId) => String(reactionUserId?._id || reactionUserId || "") === viewerId
      )
  );
  const pollTotalVotes = getPollTotalVotes(localPost.poll);
  const contentWarning = normalizeContentWarning(localPost.contentWarning);
  const hasContentWarning = contentWarning.enabled;
  const hideSensitiveContent =
    shouldBlurSensitiveContent(contentWarning) && !isSensitiveRevealed;
  const confessionImages = getConfessionImages(localPost);
  const isOwner =
    Boolean(user?._id) &&
    String(localPost?.userId?._id || localPost?.userId || "") === String(user?._id || "");
  const adminMainSiteMode = isAdminMainSiteMode();
  const canDelete = isOwner || adminMainSiteMode;

  const readableTextColor =
    isScorched || isBudding || hasCustomPostTheme
      ? "rgba(234, 255, 238, 0.94)"
      : "#2c3e28";
  const readableMutedColor =
    isScorched || isBudding || hasCustomPostTheme
      ? "rgba(190, 245, 210, 0.76)"
      : "rgba(44, 62, 40, 0.82)";
  const chipTextColor =
    isScorched || isBudding || hasCustomPostTheme
      ? "rgba(226, 255, 235, 0.92)"
      : "#32573f";
  const softTextShadow = hasCustomPostTheme
    ? "0 1px 3px rgba(0, 0, 0, 0.72)"
    : "none";

  const reportPost = async (e) => {
    e?.stopPropagation?.();

    if (!token) {
      window.cwToast?.("You must be logged in to report.", "warning") ||
        alert("You must be logged in to report.");
      return;
    }

    const reason = window.prompt("Why are you reporting this post?");
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: "confession",
          confessionId: localPost._id,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          const duplicateMessage =
            data.message || "You already reported this confession.";
          window.cwToast?.(duplicateMessage, "warning") || alert(duplicateMessage);
          return;
        }

        window.cwToast?.(
          data.message || data.error || "Could not submit report",
          "error"
        ) || alert(data.message || data.error || "Could not submit report");
        return;
      }

      window.cwToast?.("Report submitted.", "success") ||
        alert("Report submitted.");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Something went wrong while reporting.", "error") ||
        alert("Something went wrong while reporting.");
    }
  };

  const togglePressedLeaf = async (e) => {
    e?.stopPropagation?.();

    if (!token) {
      window.cwToast?.("You must be logged in to save confessions.", "warning") ||
        alert("You must be logged in to save confessions.");
      return;
    }

    try {
      const res = await fetch(`${PRESSED_LEAVES_URL}/${localPost._id}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(
          data.message || "Could not update your Pressed Leaves.",
          "error"
        ) || alert(data.message || "Could not update your Pressed Leaves.");
        return;
      }

      updateUser?.({
        savedConfessions: Array.isArray(data.savedConfessions)
          ? data.savedConfessions
          : [],
      });

      window.cwToast?.(data.message || "Pressed Leaves updated.", "success");
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not update your Pressed Leaves.", "error") ||
        alert("Could not update your Pressed Leaves.");
    }
  };

  const votePoll = async (e, optionIndex) => {
    e.stopPropagation();

    if (!token) {
      window.cwToast?.("You must be logged in to vote on polls.", "warning") ||
        alert("You must be logged in to vote on polls.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/confessions/${localPost._id}/poll-vote`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ optionIndex }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        window.cwToast?.(data.message || "Could not record your vote.", "error") ||
          alert(data.message || "Could not record your vote.");
        return;
      }

      setLocalPost((prev) => ({
        ...prev,
        poll: data.poll,
      }));
    } catch (err) {
      console.error(err);
      window.cwToast?.("Could not record your vote.", "error") ||
        alert("Could not record your vote.");
    }
  };

  const handleCopyLink = async () => {
    const result = await copyConfessionLink(localPost?._id);
    if (result.ok) {
      window.cwToast?.("Confession link copied.", "success") || alert("Confession link copied.");
      return;
    }
    window.cwToast?.("Could not copy link.", "warning") || alert("Could not copy link.");
  };

  const handleShare = async () => {
    const result = await shareConfession(localPost);
    if (result.cancelled) return;
    if (result.ok) {
      window.cwToast?.(
        result.method === "native-share" ? "Share ready." : "Confession link copied.",
        "success"
      );
      return;
    }
    window.cwToast?.("Could not share automatically.", "warning") || alert("Could not share automatically.");
  };

  const handleDelete = async () => {
    if (!canDelete || !token || !localPost?._id) return;
    const isAdminDelete = adminMainSiteMode;
    const shouldDelete = window.confirm(
      isAdminDelete
        ? "Admin delete this confession? This cannot be undone."
        : "Delete this confession? This cannot be undone."
    );
    if (!shouldDelete) return;
    try {
      const deleteUrl = isAdminDelete
        ? `${API_BASE}/api/admin/main-site/confessions/${localPost._id}`
        : `${API_BASE}/api/confessions/${localPost._id}`;
      const deleteToken = isAdminDelete ? getAdminToken() : token;

      if (isAdminDelete && !deleteToken) {
        window.cwToast?.("Admin token missing.", "error") || alert("Admin token missing.");
        return;
      }

      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${deleteToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.cwToast?.(data.message || "Could not delete confession.", "error") ||
          alert(data.message || "Could not delete confession.");
        return;
      }
      window.cwToast?.("Confession deleted.", "success") || alert("Confession deleted.");
      setIsDeleted(true);
    } catch (error) {
      window.cwToast?.("Could not delete confession.", "error") || alert("Could not delete confession.");
    }
  };

  const startEditPost = () => {
    setEditMessage(String(localPost?.message || ""));
    setIsEditingPost(true);
  };

  const cancelEditPost = () => {
    setIsEditingPost(false);
    setEditMessage(String(localPost?.message || ""));
  };

  const saveEditPost = async () => {
    const nextMessage = String(editMessage || "").trim();
    if (!nextMessage || !token || !localPost?._id) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch(`${API_BASE}/api/confessions/${localPost._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: nextMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.cwToast?.(data.message || "Could not update confession.", "error") ||
          alert(data.message || "Could not update confession.");
        return;
      }
      setLocalPost((prev) => ({
        ...prev,
        ...data,
        message: data?.message ?? nextMessage,
        isEdited: true,
        editedAt: data?.editedAt || new Date().toISOString(),
      }));
      setIsEditingPost(false);
      window.cwToast?.("Confession updated.", "success");
    } catch (error) {
      window.cwToast?.("Could not update confession.", "error") || alert("Could not update confession.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isDeleted) return null;

  return (
    <div
      id={`post-${localPost._id}`}
      onClick={onOpen}
      className={["cw-feed-post-card", postThemeClass].filter(Boolean).join(" ")}
      style={{
        background: isScorched
          ? "rgba(20,8,4,0.82)"
          : isGrove
          ? "rgba(255,255,255,0.88)"
          : "rgba(10,30,20,0.75)",
        borderRadius: "16px",
        border: isScorched
          ? "0.5px solid rgba(216,90,48,0.25)"
          : isGrove
          ? "0.5px solid rgba(29,158,117,0.25)"
          : "1px solid rgba(120,255,180,0.2)",
        padding: "18px 20px",
        marginBottom: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        backdropFilter: isBudding ? "blur(10px)" : "none",
        boxShadow: isScorched
          ? "0 2px 20px rgba(216,90,48,0.08)"
          : isGrove
          ? "0 2px 20px rgba(29,158,117,0.08)"
          : "0 2px 20px rgba(120,255,180,0.08)",
        animation: highlighted
          ? isScorched
            ? "scorchedBlink 0.45s ease-in-out 4"
            : isGrove
            ? "groveBlink 0.45s ease-in-out 4"
            : "buddingBlink 0.45s ease-in-out 4"
          : "none",
        ...postThemeStyle,
      }}
    >
      <div className="cw-post-menu-anchor">
        <CardActionMenu
          itemType="post"
          canEdit={isOwner}
          onEdit={startEditPost}
          canDelete={canDelete}
          onDelete={handleDelete}
          onReport={reportPost}
          onCopyLink={handleCopyLink}
          onShare={handleShare}
          onTogglePressedLeaves={togglePressedLeaf}
          isPressedLeaf={isSaved}
          showPressedLeaves
        />
      </div>
      <PostThemeFxLayers themeId={postThemeId} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          marginBottom: "10px",
        }}
      >
        <FramedAvatar
          src={profilePicture}
          username={username}
          frameId={frameId}
          effectId={equipped.visualEffect}
          size={42}
          placeholder={username?.[0]?.toUpperCase() || "?"}
          animationMode="hover"
        />

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: "12px",
              color: isScorched ? "#D85A30" : isGrove ? "#1D9E75" : "#9be7c4",
              fontWeight: 700,
            }}
          >
            @{username} <AnimatedBadge badgeId={equipped.badge} size="sm" />
          </span>

          <DisplayTitlePill titleId={equipped.title} />

          {moodStyle && (
            <span style={{ ...moodStyle, marginTop: "6px", width: "fit-content" }}>
              {localPost.mood}
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: "10px",
            color: hasCustomPostTheme
              ? "rgba(180, 255, 205, 0.86)"
              : isScorched
              ? "#D85A30"
              : isGrove
              ? "#3b8a5a"
              : "#7fd8b0",
            marginLeft: "auto",
            fontStyle: "italic",
            textShadow: softTextShadow,
          }}
        >
          {isScorched ? "🔥 scorched" : isGrove ? "🌿 thriving" : "⚖️ balanced"}
        </span>
      </div>

      {hasContentWarning && (
        <div
          style={{
            marginBottom: "10px",
            display: "grid",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "fit-content",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 9px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              fontSize: "10px",
              color: chipTextColor,
              letterSpacing: "0.03em",
              textShadow: softTextShadow,
            }}
          >
            Content warning{contentWarning.category ? `: ${contentWarning.category}` : ""}
          </span>

          {contentWarning.note && (
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                color: readableMutedColor,
                lineHeight: 1.5,
                textShadow: softTextShadow,
              }}
            >
              {contentWarning.note}
            </p>
          )}
        </div>
      )}

      <div style={{ position: "relative", marginBottom: "12px" }}>
        {isEditingPost ? (
          <div className="cw-inline-edit" onClick={(e) => e.stopPropagation()}>
            <textarea
              className="cw-inline-edit-input"
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              rows={4}
              maxLength={5000}
            />
            <div className="cw-inline-edit-actions">
              <button
                type="button"
                className="cw-inline-edit-save"
                onClick={saveEditPost}
                disabled={isSavingEdit || !String(editMessage || "").trim()}
              >
                {isSavingEdit ? "Saving..." : "Save"}
              </button>
              <button type="button" className="cw-inline-edit-cancel" onClick={cancelEditPost} disabled={isSavingEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <TranslatableText
            text={localPost.message}
            context="confession"
            targetType="confession"
            targetId={localPost._id || localPost.id}
            compact
            textStyle={{
              fontSize: "14px",
              color: readableTextColor,
              lineHeight: 1.65,
              textShadow: softTextShadow,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: isScorched ? 3 : "unset",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              filter: hideSensitiveContent ? "blur(7px)" : "none",
              userSelect: hideSensitiveContent ? "none" : "text",
              transition: "filter 0.18s ease",
            }}
          />
        )}
        {(localPost?.isEdited || localPost?.editedAt) && (
          <span className="cw-edited-mark" title={localPost?.editedAt ? `Edited ${new Date(localPost.editedAt).toLocaleString()}` : "edited"}>
            edited
          </span>
        )}

        {hideSensitiveContent && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.12)",
              borderRadius: "12px",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSensitiveRevealed(true);
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.14)",
                color: "#f4fff2",
                borderRadius: "999px",
                padding: "6px 12px",
                fontSize: "11px",
                fontFamily: "Georgia, serif",
                cursor: "pointer",
              }}
            >
              Show confession
            </button>
          </div>
        )}
      </div>

      <PostCardImagePreview images={confessionImages} blurred={hideSensitiveContent} />

      {localPost.poll?.question && Array.isArray(localPost.poll.options) && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginBottom: "12px",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(180, 210, 255, 0.18)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: isScorched ? "#ffb29f" : isGrove ? "#3d8165" : "#9fd8c0",
              marginBottom: "6px",
            }}
          >
            Anonymous Poll
          </div>

          <p
            style={{
              margin: "0 0 10px",
              fontSize: "13px",
              color: readableTextColor,
              textShadow: softTextShadow,
            }}
          >
            {localPost.poll.question}
          </p>

          <div style={{ display: "grid", gap: "6px" }}>
            {localPost.poll.options.map((option, index) => (
              <button
                key={`${option.text}-${index}`}
                type="button"
                onClick={(e) => votePoll(e, index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  borderRadius: "12px",
                  border: "1px solid rgba(190, 220, 255, 0.16)",
                  background: "rgba(255,255,255,0.05)",
                  color: isScorched ? "#ffe3d9" : isGrove ? "#28402b" : "#ecfff2",
                  padding: "7px 10px",
                  cursor: "pointer",
                  fontFamily: "Georgia, serif",
                  fontSize: "12px",
                }}
              >
                <span>{option.text}</span>
                <strong>{option.votes || 0}</strong>
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "10px",
              color: isScorched ? "#ffb29f" : isGrove ? "#4a8468" : "#bcebd2",
              letterSpacing: "0.05em",
            }}
          >
            {pollTotalVotes} vote{pollTotalVotes !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {comfortCards.length > 0 && (
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            flexWrap: "wrap",
            gap: "7px",
          }}
        >
          {comfortCards.slice(0, 3).map((card) => (
            <span
              key={card.text}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 9px",
                borderRadius: "999px",
                background: hasCustomPostTheme
                  ? "rgba(7, 24, 16, 0.56)"
                  : "rgba(255,255,255,0.08)",
                border: hasCustomPostTheme
                  ? "1px solid rgba(190,255,210,0.32)"
                  : "1px solid rgba(200,255,220,0.22)",
                color: chipTextColor,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.01em",
                textShadow: softTextShadow,
              }}
            >
              <span>{card.text}</span>
              <strong>{card.count}</strong>
            </span>
          ))}
        </div>
      )}

      <div
        className="cw-reaction-cluster cw-post-card-reaction-cluster"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: isScorched
            ? "1px solid rgba(216,90,48,0.15)"
            : isGrove
            ? "1px solid rgba(29,158,117,0.15)"
            : "1px solid rgba(120,255,180,0.12)",
        }}
      >
        <ReactionCountButton
          confessionId={localPost._id}
          targetType="confession"
          targetId={localPost._id}
          reaction="water"
          count={localPost.wateredBy?.length || 0}
          className={`cw-reaction-pill cw-post-card-reaction-pill cw-water-pill${
            userWatered ? " is-active" : ""
          }`}
          style={{ color: hasCustomPostTheme ? "#a9ffc8" : "#3b8a5a", textShadow: softTextShadow }}
        >
          <span className="cw-post-card-reaction-icon" aria-hidden="true">🌱</span>
          <span className="cw-post-card-reaction-value">{localPost.wateredBy?.length || 0}</span>
        </ReactionCountButton>

        <ReactionCountButton
          confessionId={localPost._id}
          targetType="confession"
          targetId={localPost._id}
          reaction="burn"
          count={localPost.burnedBy?.length || 0}
          className={`cw-reaction-pill cw-post-card-reaction-pill cw-burn-pill${
            userBurned ? " is-active" : ""
          }`}
          style={{ color: hasCustomPostTheme ? "#ffb39b" : "#D85A30", textShadow: softTextShadow }}
        >
          <span className="cw-post-card-reaction-icon" aria-hidden="true">🔥</span>
          <span className="cw-post-card-reaction-value">{localPost.burnedBy?.length || 0}</span>
        </ReactionCountButton>

      </div>
    </div>
  );
}
