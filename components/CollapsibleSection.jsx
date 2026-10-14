"use client";

import { useState } from "react";

// A homepage bar that expands its panel. Starts closed.
export default function CollapsibleSection({ id, label, variant, children }) {
  const [open, setOpen] = useState(false);
  const panelId = `panel-${id}`;

  return (
    <>
      <button
        type="button"
        className={`bar bar--${variant}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="bar__label">{label}</span>
        <span className="bar__caret" aria-hidden="true">⌄</span>
      </button>
      <div
        id={panelId}
        className="panel"
        role="region"
        aria-label={label}
        aria-hidden={!open}
      >
        {children}
      </div>
    </>
  );
}
