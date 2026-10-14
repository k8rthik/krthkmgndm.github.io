// Diverging price shading for the network map and the decomposition table.
// Pure, raw-Node loadable; components map the returned tone to a CSS variable.

// |t| below this reads as "at lambda" and is left unshaded
export const SHADE_NEUTRAL = 0.06;
// opacity steps either side of lambda: up to .34, up to .70, then full
export const SHADE_STEPS = [0.34, 0.7];
export const SHADE_OPACITY = [0.3, 0.62, 1];
// $/MWh: a day with every bus within a few dollars of lambda should not
// stretch tiny differences across the whole ramp
export const SPREAD_FLOOR = 6;
// $/MWh: a congestion component smaller than half a cent is rounding noise
export const CONGESTION_EPS = 0.005;

/** The widest gap between any bus and lambda, never under SPREAD_FLOOR. */
export function priceSpread(lmp, lambda) {
  return Math.max(SPREAD_FLOOR, ...Array.from(lmp, (v) => Math.abs(v - lambda)));
}

/**
 * Three steps either side of lambda, so the map reads as a diverging scale
 * rather than a rainbow. Returns { tone: "neutral" | "lo" | "hi", op }.
 */
export function shade(v, lambda, spread) {
  const t = Math.max(-1, Math.min(1, (v - lambda) / spread));
  const a = Math.abs(t);
  if (a < SHADE_NEUTRAL) return { tone: "neutral", op: 1 };
  const step = SHADE_STEPS.findIndex((s) => a < s);
  const op = SHADE_OPACITY[step === -1 ? SHADE_STEPS.length : step];
  return { tone: t < 0 ? "lo" : "hi", op };
}

/** "lo" / "hi" for a congestion component that moves the price, else null. */
export function congestionTone(c) {
  if (c <= -CONGESTION_EPS) return "lo";
  if (c >= CONGESTION_EPS) return "hi";
  return null;
}
