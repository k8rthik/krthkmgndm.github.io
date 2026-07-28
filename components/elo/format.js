// Shared helpers for the /bgelo dashboard.
// Colors are CSS custom properties so light/dark theming needs no re-render;
// slot order is pinned to corePlayers so a player's color never changes.

const SLOT_VARS = [
  "--elo-s1",
  "--elo-s2",
  "--elo-s3",
  "--elo-s4",
  "--elo-s5",
  "--elo-s6",
];

export const SLOT_COUNT = SLOT_VARS.length;

export function isCore(corePlayers, name) {
  const i = corePlayers.indexOf(name);
  return i >= 0 && i < SLOT_VARS.length;
}

export function colorFor(corePlayers, name) {
  const i = corePlayers.indexOf(name);
  return i >= 0 && i < SLOT_VARS.length ? `var(${SLOT_VARS[i]})` : "var(--dim)";
}

export const fmt = (x, d = 0) =>
  x.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });

export const sign = (x, d = 0) => (x >= 0 ? "+" : "") + fmt(x, d);
