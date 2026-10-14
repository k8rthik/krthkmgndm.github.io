// Pure derivations for the /packev dashboard. data/packev.json is generated
// by the pack-ev repo (`pack-ev site-export`); everything the components draw
// comes from these functions, which are raw-Node loadable and fully tested.

// Booster roles are a fixed categorical set; colours alias the elo palette
// in globals.css so both themes come free.
export const ROLE_VAR = {
  "Play / Draft": "var(--pev-main)",
  Set: "var(--pev-set)",
  Collector: "var(--pev-coll)",
};

export const boosterKey = (b) => `${b.set}/${b.booster}`;

// series rows are [week, ev, evBulk, price]
const EV_COLUMN = { market: 1, bulk: 2 };

const ratioOf = (value, price) => (price > 0 && value != null ? value / price : null);

// EV / price at or above this means opening beats keeping it sealed
export const BREAK_EVEN = 1;
// the aging panels' y axis always reaches 150% of the pack price, so a
// quiet role's panel doesn't zoom in on noise
export const AGING_Y_FLOOR = 1.5;
export const WEEKS_PER_YEAR = 52;
export const MAX_YEAR_TICKS = 5;
// the booster the page opens on needs enough history to draw a real line
export const DEFAULT_MIN_WEEKS = 12;
export const MAX_DATE_LABELS = 8;

/** { price, value, ratio } for one booster at the chosen pricing. */
export function boosterSummary(b, pricing) {
  const value = pricing === "bulk" ? b.evBulk : b.ev;
  return { price: b.price, value, ratio: ratioOf(value, b.price) };
}

export function tableRows(boosters, { pricing, role = null, sort = null, ascending = false }) {
  const rows = boosters
    .filter((b) => !role || b.role === role)
    .map((b) => {
      const { value, ratio } = boosterSummary(b, pricing);
      return { ...b, value, ratio };
    });
  if (!sort) return rows;
  const dir = ascending ? 1 : -1;
  // missing values sort last in either direction
  return [...rows].sort((a, b) => {
    if (a[sort] == null) return b[sort] == null ? 0 : 1;
    if (b[sort] == null) return -1;
    return dir * (a[sort] - b[sort]);
  });
}

export function seriesPoints(booster, pricing) {
  const col = EV_COLUMN[pricing];
  return booster.series
    .filter((r) => r[3] > 0 && r[col] != null)
    .map((r) => ({ week: r[0], ev: r[col], price: r[3], ratio: r[col] / r[3] }));
}

// Small-sample guard: an age bucket backed by fewer than `minSeries`
// set-boosters is not shown (pack-ev applies the same floor upstream).
export function agingPoints(cross, pricing, role, minSeries) {
  const rows = cross?.[pricing]?.aging?.[role] ?? [];
  return rows
    .filter((r) => r[5] >= minSeries)
    .map(([age, p25, median, p75, shareAbove, n]) => ({ age, p25, median, p75, shareAbove, n }));
}

/**
 * Shared scale for the aging panels: y to the highest p75 (never under
 * AGING_Y_FLOOR), x to the oldest age shown. With no points at all, x falls
 * back to one year rather than Math.max() of nothing (-Infinity).
 */
export function agingScale(agingByRole) {
  const all = Object.values(agingByRole).flat();
  return {
    yMax: Math.max(AGING_Y_FLOOR, ...all.map((p) => p.p75)),
    xMax: all.length ? Math.max(...all.map((p) => p.age)) : WEEKS_PER_YEAR,
  };
}

/** The booster the page opens on: the first with enough weekly history. */
export function defaultBooster(boosters) {
  return boosters.find((b) => b.series.length >= DEFAULT_MIN_WEEKS) ?? boosters[0];
}

/** CSS class for an EV / price ratio: winning, losing, or nothing to say. */
export function ratioTone(ratio) {
  if (ratio == null) return "";
  return ratio >= BREAK_EVEN ? "elo-pos" : "elo-neg";
}

export const boosterTitle = (b) => `${b.setName}, ${b.booster.toLowerCase()}`;
export const boosterShortName = (name) => name.replace(" Booster", "").toLowerCase();
export const releaseYear = (iso) => iso.slice(0, 4);
export const weeksAboveLabel = (b) => (b.weeks ? `${b.weeksAbove}/${b.weeks}` : "–");

export const monthYear = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

/** Whole years since launch that fit on an x axis running to xMax weeks. */
export function yearTicks(xMax) {
  return Array.from({ length: MAX_YEAR_TICKS + 1 }, (_, yr) => yr).filter((yr) => yr * WEEKS_PER_YEAR <= xMax);
}

export const yearLabel = (yr) => (yr ? `${yr}y` : "launch");

/** Indices of the points that get a date label: at most MAX_DATE_LABELS, evenly strided. */
export function dateTickIndices(n) {
  const every = Math.ceil(n / MAX_DATE_LABELS);
  return Array.from({ length: n }, (_, i) => i).filter((i) => i % every === 0);
}

/** Headline facts about the payload, for the page's metadata and subtitle. */
export function packevSummary(meta) {
  const sinceYear = releaseYear(meta.historyStart);
  const sets = `${meta.sets} ${meta.sets === 1 ? "set" : "sets"}`;
  return {
    sets: meta.sets,
    sinceYear,
    description: `Expected value of Magic: The Gathering booster packs against their sealed price, for ${sets} since ${sinceYear}.`,
  };
}

export function milestoneGrid(milestones, roles) {
  const ages = new Map(milestones.map((m) => [m.milestone, m.age]));
  const columns = [...ages.keys()].sort((a, b) => ages.get(a) - ages.get(b));
  const rows = roles.map((role) => ({
    role,
    cells: columns.map((c) => milestones.find((m) => m.role === role && m.milestone === c) ?? null),
  }));
  return { columns, rows };
}

