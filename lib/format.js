// Number formatting shared by every dashboard. Pure, raw-Node loadable.
// Feature-specific labels (zone names, homes, player names) stay with their
// feature; this is only how a number is written.

const MISSING = "–";

// 1,234.5 — fixed decimals, en-US separators
export function num(x, d = 0) {
  return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// +12 / -3 — an explicit plus for zero and up
export function signed(x, d = 0) {
  return (x >= 0 ? "+" : "") + num(x, d);
}

// $5,000 / −$8.50 — a true minus sign ahead of the dollar sign
export function usd(x, d = 0) {
  if (x == null) return MISSING;
  return `${x < 0 ? "−" : ""}$${num(Math.abs(x), d)}`;
}

// 0.564 → 56%
export function pct(x, d = 0) {
  if (x == null) return MISSING;
  return `${(x * 100).toFixed(d)}%`;
}
