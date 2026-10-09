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

export function tableRows(boosters, { pricing, role = null, sort = null, ascending = false }) {
  const rows = boosters
    .filter((b) => !role || b.role === role)
    .map((b) => {
      const value = pricing === "bulk" ? b.evBulk : b.ev;
      return { ...b, value, ratio: ratioOf(value, b.price) };
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

export function milestoneGrid(milestones, roles) {
  const ages = new Map(milestones.map((m) => [m.milestone, m.age]));
  const columns = [...ages.keys()].sort((a, b) => ages.get(a) - ages.get(b));
  const rows = roles.map((role) => ({
    role,
    cells: columns.map((c) => milestones.find((m) => m.role === role && m.milestone === c) ?? null),
  }));
  return { columns, rows };
}

export function niceTicks(lo, hi, count = 4) {
  const raw = (hi - lo) / count || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const out = [];
  const end = Math.ceil(hi / step - 1e-9) * step;
  for (let v = Math.floor(lo / step + 1e-9) * step; v <= end + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

export const pct = (x, d = 0) => (x == null ? "–" : `${(x * 100).toFixed(d)}%`);
export const usd = (x, d = 2) =>
  x == null ? "–" : `${x < 0 ? "−" : ""}$${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
