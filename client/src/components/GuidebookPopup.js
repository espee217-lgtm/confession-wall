import React, { useEffect, useMemo, useState } from "react";
import { GUIDEBOOK_SECTIONS, GUIDEBOOK_VERSION } from "../data/guidebookContent";
import "./GuidebookPopup.css";

export { GUIDEBOOK_VERSION };

export default function GuidebookPopup({ open, onClose }) {
  const [activeId, setActiveId] = useState(GUIDEBOOK_SECTIONS[0]?.id || "start");

  const activeSection = useMemo(
    () => GUIDEBOOK_SECTIONS.find((section) => section.id === activeId) || GUIDEBOOK_SECTIONS[0],
    [activeId]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.classList.add("cw-guidebook-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("cw-guidebook-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setActiveId(GUIDEBOOK_SECTIONS[0]?.id || "start");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="cw-guidebook-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="cw-guidebook"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cw-guidebook-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cw-guidebook-header">
          <div>
            <p className="cw-guidebook-kicker">Confession Wall</p>
            <h2 id="cw-guidebook-title">Guidebook & Notice Board</h2>
            <span className="cw-guidebook-version">Patch scroll v{GUIDEBOOK_VERSION}</span>
          </div>

          <button type="button" className="cw-guidebook-close" onClick={onClose} aria-label="Close guidebook">
            ×
          </button>
        </header>

        <div className="cw-guidebook-body">
          <nav className="cw-guidebook-tabs" aria-label="Guidebook pages">
            {GUIDEBOOK_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`cw-guidebook-tab${activeId === section.id ? " is-active" : ""}`}
                onClick={() => setActiveId(section.id)}
              >
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          <article className="cw-guidebook-page">
            <div className="cw-guidebook-copy">
              <p className="cw-guidebook-eyebrow">{activeSection.eyebrow}</p>
              <h3>{activeSection.title}</h3>
              <p className="cw-guidebook-summary">{activeSection.summary}</p>

              {activeSection.points?.length ? (
                <ul className="cw-guidebook-points">
                  {activeSection.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {activeSection.steps ? (
              <div className="cw-guidebook-step-list">
                {activeSection.steps.map((step) => (
                  <section className="cw-guidebook-step" key={`${activeSection.id}-${step.badge}-${step.title}`}>
                    <div className="cw-guidebook-step-copy">
                      <span className="cw-guidebook-step-badge">{step.badge}</span>
                      <h4>{step.title}</h4>
                      <p>{step.text}</p>

                      {step.notes?.length ? (
                        <ul className="cw-guidebook-step-notes">
                          {step.notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    {step.images?.length ? (
                      <div className={`cw-guidebook-step-media cw-guidebook-step-media--${step.images.length}`}>
                        {step.images.map((image) => (
                          <figure className="cw-guidebook-shot cw-guidebook-shot--step" key={image.src}>
                            <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
                          </figure>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <div className="cw-guidebook-media-grid">
                {(activeSection.images || []).map((image, index) => (
                  <figure
                    className={`cw-guidebook-shot${index === 0 ? " cw-guidebook-shot--primary" : ""}`}
                    key={image.src}
                  >
                    <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
                  </figure>
                ))}
              </div>
            )}
          </article>
        </div>

        <footer className="cw-guidebook-footer">
          <span>Tip: use the scroll button anytime to reopen this guide.</span>
          <button type="button" onClick={onClose}>
            Enter the forest
          </button>
        </footer>
      </section>
    </div>
  );
}
