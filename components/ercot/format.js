// Formatting helpers for the nodal-price model. Pure, raw-Node loadable.

export const ZONE_LABEL = {
  LZ_WEST: "West",
  LZ_NORTH: "North",
  LZ_HOUSTON: "Houston",
  LZ_SOUTH: "South",
};

// zones reuse the categorical ramp in globals.css; the order is fixed so a
// zone keeps its color no matter what else is on screen
export const ZONE_VAR = {
  LZ_WEST: "var(--erc-z1)",
  LZ_NORTH: "var(--erc-z2)",
  LZ_HOUSTON: "var(--erc-z3)",
  LZ_SOUTH: "var(--erc-z4)",
};

export function usd(v, d = 0) {
  const n = Math.abs(v).toFixed(d);
  return `${v < 0 ? "−" : ""}$${n}`;
}

export function hhmm(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

// 0 · 25k · 1.2M — the slider spans four orders of magnitude
export function homesLabel(h) {
  if (h === 0) return "0";
  if (h >= 1e6) return `${(h / 1e6).toFixed(h < 1e7 ? 2 : 1)}M`;
  if (h >= 1e3) return `${Math.round(h / 1e3)}k`;
  return String(h);
}

// The slider is logarithmic: position 0 means no fleet at all, then
// 10,000 homes up to the cap.
const FLOOR = 10000;

export function homesFromSlider(v, max) {
  if (v <= 0) return 0;
  return Math.round(FLOOR * Math.pow(max / FLOOR, (v - 1) / 999));
}

export function sliderFromHomes(h, max) {
  if (h <= 0) return 0;
  return Math.round(1 + (999 * Math.log(h / FLOOR)) / Math.log(max / FLOOR));
}
