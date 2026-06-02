import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CardActionMenu({
  itemType = "post",
  canEdit = false,
  onEdit,
  canDelete = false,
  onDelete,
  onReport,
  onCopyLink,
  onShare,
  onTogglePressedLeaves,
  isPressedLeaf = false,
  showPressedLeaves = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 200 });
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const recalcPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 210;
    const pad = 12;
    const left = Math.max(pad, Math.min(rect.right - width, window.innerWidth - width - pad));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 12);
    setMenuPos({ top, left, minWidth: width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recalcPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (
        !wrapRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleViewport = () => recalcPosition();

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    window.addEventListener("resize", handleViewport);
    window.addEventListener("scroll", handleViewport, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("resize", handleViewport);
      window.removeEventListener("scroll", handleViewport, true);
    };
  }, [open]);

  const runAction = (event, fn) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    if (typeof fn === "function") fn();
  };

  return (
    <div
      ref={wrapRef}
      className={["cw-card-menu-wrap", open ? "is-open" : "", className].filter(Boolean).join(" ")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="cw-card-menu-btn"
        aria-label={`Open ${itemType} actions menu`}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <span className="cw-card-menu-dots">{"\u22EE"}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="cw-card-menu"
            role="menu"
            style={{
              position: "fixed",
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              minWidth: `${menuPos.minWidth}px`,
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {canEdit && typeof onEdit === "function" && (
              <button type="button" className="cw-card-menu-item" onClick={(event) => runAction(event, onEdit)}>
                Edit
              </button>
            )}
            <button type="button" className="cw-card-menu-item" onClick={(event) => runAction(event, onShare)}>
              Share
            </button>
            <button type="button" className="cw-card-menu-item" onClick={(event) => runAction(event, onCopyLink)}>
              Copy link
            </button>
            {showPressedLeaves && (
              <button
                type="button"
                className="cw-card-menu-item"
                onClick={(event) => runAction(event, onTogglePressedLeaves)}
              >
                {isPressedLeaf ? "Remove from Pressed Leaves" : "Save to Pressed Leaves"}
              </button>
            )}
            <button type="button" className="cw-card-menu-item warning" onClick={(event) => runAction(event, onReport)}>
              Report
            </button>
            {canDelete && (
              <button type="button" className="cw-card-menu-item danger" onClick={(event) => runAction(event, onDelete)}>
                Delete
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
