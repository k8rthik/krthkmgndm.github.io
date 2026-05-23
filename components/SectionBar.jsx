"use client";

export default function SectionBar({
  label,
  open,
  onClick,
  variant,
  count,
  controls,
}) {
  return (
    <button
      type="button"
      className={`bar bar--${variant}`}
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
    >
      <span className="bar__label">{label}</span>
      <span className="bar__caret" aria-hidden="true">⌄</span>
    </button>
  );
}
