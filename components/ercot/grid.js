// A stylised 8-bus reduction of ERCOT.
//
// Fleet totals are ERCOT's published installed capacity (see SOURCES in the page).
// Their split across the eight buses, the reactances, the line ratings and the
// GTC limits are the author's allocation: ERCOT does not publish an 8-bus
// equivalent of its 18,000-bus Network Operations Model.

export const SWCAP = 5000;        // system-wide offer cap / VOLL, $/MWh (PUCT 16 TAC 25.505)
export const LOW_CAP = -251;      // low system-wide offer cap, $/MWh

// Two buses per load zone, so a Load Zone price is a genuine load-weighted
// average of bus LMPs rather than a relabelled node.
export const BUSES = [
  { id: "PANH",   name: "Panhandle",        zone: "LZ_WEST",    x: 0.10, y: 0.05, loadShare: 0.030, resiShare: 0.22, repShare: 0.25, industrial: 0.45, windShape: "west" },
  { id: "WPERM",  name: "Far West / Permian", zone: "LZ_WEST",  x: 0.07, y: 0.45, loadShare: 0.115, resiShare: 0.12, repShare: 0.70, industrial: 0.80, windShape: "west" },
  { id: "NRURAL", name: "North rural",      zone: "LZ_NORTH",   x: 0.39, y: 0.09, loadShare: 0.070, resiShare: 0.35, repShare: 0.80, industrial: 0.35, windShape: "west" },
  { id: "NDFW",   name: "DFW metro",        zone: "LZ_NORTH",   x: 0.63, y: 0.35, loadShare: 0.265, resiShare: 0.42, repShare: 0.95, industrial: 0.20, windShape: "west" },
  { id: "HMETRO", name: "Houston metro",    zone: "LZ_HOUSTON", x: 0.88, y: 0.60, loadShare: 0.215, resiShare: 0.34, repShare: 0.95, industrial: 0.30, windShape: "coast" },
  { id: "HCOAST", name: "Upper coast",      zone: "LZ_HOUSTON", x: 0.90, y: 0.92, loadShare: 0.085, resiShare: 0.20, repShare: 0.90, industrial: 0.70, windShape: "coast" },
  { id: "SMETRO", name: "Austin / San Antonio", zone: "LZ_SOUTH", x: 0.43, y: 0.68, loadShare: 0.135, resiShare: 0.40, repShare: 0.45, industrial: 0.20, windShape: "coast" },
  { id: "SRGV",   name: "South coast & Valley", zone: "LZ_SOUTH", x: 0.34, y: 0.98, loadShare: 0.085, resiShare: 0.38, repShare: 0.55, industrial: 0.45, windShape: "coast" },
];

export const ZONES = ["LZ_WEST", "LZ_NORTH", "LZ_HOUSTON", "LZ_SOUTH"];

export const LINES = [
  { id: "PANH-WPERM",   from: "PANH",   to: "WPERM",  x: 0.050, limit: 2800 },
  { id: "PANH-NRURAL",  from: "PANH",   to: "NRURAL", x: 0.055, limit: 3400 },
  { id: "WPERM-NRURAL", from: "WPERM",  to: "NRURAL", x: 0.045, limit: 5200 },
  { id: "WPERM-SMETRO", from: "WPERM",  to: "SMETRO", x: 0.050, limit: 4800 },
  { id: "WPERM-SRGV",   from: "WPERM",  to: "SRGV",   x: 0.065, limit: 2400 },
  { id: "NRURAL-NDFW",  from: "NRURAL", to: "NDFW",   x: 0.025, limit: 8200 },
  { id: "NDFW-HMETRO",  from: "NDFW",   to: "HMETRO", x: 0.030, limit: 11000 },
  { id: "NDFW-SMETRO",  from: "NDFW",   to: "SMETRO", x: 0.040, limit: 8000 },
  { id: "SMETRO-SRGV",  from: "SMETRO", to: "SRGV",   x: 0.045, limit: 4200 },
  { id: "SMETRO-HCOAST",from: "SMETRO", to: "HCOAST", x: 0.040, limit: 6500 },
  { id: "HMETRO-HCOAST",from: "HMETRO", to: "HCOAST", x: 0.020, limit: 9000 },
];

// Generic Transmission Constraints: ERCOT limits the *sum* of flows across a set
// of monitored elements to a value below the sum of their individual ratings,
// because the binding limit is stability rather than thermal.
export const GTCS = [
  { id: "WESTEX", name: "West Texas export", limit: 7400,
    members: [["WPERM-NRURAL", 1], ["WPERM-SMETRO", 1], ["WPERM-SRGV", 1]] },
  { id: "PNHNDL", name: "Panhandle export", limit: 4100,
    members: [["PANH-NRURAL", 1], ["PANH-WPERM", 1]] },
];

// Installed capacity, MW. Column totals are ERCOT's published fleet.
// wind 40,737 | solar 39,794 | nuclear 4,970 | coal 13,000 | CC 41,000 | CT 17,000 | BESS 14,000
export const CAPACITY = {
  PANH:   { wind: 9500,  solar: 2400,  nuclear: 0,    coal: 0,    cc: 400,   ct: 300,  bess: 600 },
  WPERM:  { wind: 16800, solar: 10600, nuclear: 0,    coal: 1200, cc: 4200,  ct: 2400, bess: 4600 },
  NRURAL: { wind: 5600,  solar: 5200,  nuclear: 0,    coal: 2400, cc: 3000,  ct: 1800, bess: 2000 },
  NDFW:   { wind: 900,   solar: 3400,  nuclear: 2400, coal: 3600, cc: 8600,  ct: 3600, bess: 1800 },
  HMETRO: { wind: 300,   solar: 1900,  nuclear: 0,    coal: 1400, cc: 11800, ct: 3400, bess: 1300 },
  HCOAST: { wind: 2900,  solar: 2300,  nuclear: 0,    coal: 700,  cc: 3600,  ct: 1500, bess: 900 },
  SMETRO: { wind: 2600,  solar: 7800,  nuclear: 0,    coal: 2900, cc: 6400,  ct: 2600, bess: 1900 },
  SRGV:   { wind: 2137,  solar: 6194,  nuclear: 2570, coal: 800,  cc: 3000,  ct: 1400, bess: 900 },
};

// Offer prices, $/MWh, at $3.50/MMBtu gas. Wind offers negative because the
// production tax credit is worth more than the revenue it forgoes.
export const OFFER = {
  wind: -8, solar: 0,
  coal: 26,
  cc_a: 28, cc_b: 34,      // efficient / older combined cycle
  ct_a: 44, ct_b: 58, ct_c: 105,   // peaking, in rising heat-rate order
};
export const CC_SPLIT = 0.62;              // share of the CC fleet in the efficient block
export const CT_SPLIT = [0.45, 0.35, 0.20]; // peaking fleet across its three blocks

// Aggregate ancillary-service demand curve. Under RTC+B (live 5 Dec 2025) SCED
// co-optimises energy and reserves against price-responsive ASDCs, and the old
// ORDC price adders (RTORPA/RTORDPA/RTOFFPA) no longer exist. Segments are
// listed cheapest-first: the cheapest is the first tranche left unprocured.
export const AS_REQ = 8000;              // MW, aggregate of Reg/RRS/ECRS/Non-Spin
// ERCOT caps how much reserve may come from duration-limited resources, because
// a battery that can hold its output for an hour is not a substitute for one
// that can hold it all evening. Without a cap the battery fleet blankets the
// whole requirement for free and scarcity pricing disappears entirely.
export const AS_STORAGE_CAP = 0.6;
export const ASDC = [
  { width: 4200, price: 6 },
  { width: 2200, price: 70 },
  { width: 1000, price: 500 },
  { width: 600,  price: SWCAP },
];

export const BUS_INDEX = Object.fromEntries(BUSES.map((b, i) => [b.id, i]));
export const LINE_INDEX = Object.fromEntries(LINES.map((l, i) => [l.id, i]));

/**
 * DC shift factors with a load-weighted distributed slack, matching ERCOT's use
 * of a distributed reference rather than a single swing bus. Returns an
 * nLine x nBus matrix: sf[l][b] is the fraction of a 1 MW injection at bus b
 * (withdrawn against the distributed reference) that flows on line l.
 */
export function shiftFactors() {
  const nb = BUSES.length;
  const nl = LINES.length;

  // Bus susceptance matrix, then invert with the last bus grounded.
  const B = Array.from({ length: nb }, () => new Float64Array(nb));
  for (const l of LINES) {
    const f = BUS_INDEX[l.from], t = BUS_INDEX[l.to], b = 1 / l.x;
    B[f][f] += b; B[t][t] += b; B[f][t] -= b; B[t][f] -= b;
  }
  const r = nb - 1;
  const M = Array.from({ length: r }, (_, i) => Float64Array.from(B[i].slice(0, r)));
  const Minv = invert(M);

  const sf = Array.from({ length: nl }, () => new Float64Array(nb));
  for (let li = 0; li < nl; li++) {
    const l = LINES[li];
    const f = BUS_INDEX[l.from], t = BUS_INDEX[l.to], b = 1 / l.x;
    for (let bus = 0; bus < nb; bus++) {
      if (bus === r) continue;               // grounded reference column stays 0
      const thF = f === r ? 0 : Minv[f][bus];
      const thT = t === r ? 0 : Minv[t][bus];
      sf[li][bus] = b * (thF - thT);
    }
  }

  // Shift to the distributed slack: sf_d[l][b] = sf[l][b] - sum_k w_k sf[l][k].
  const w = BUSES.map((b) => b.loadShare);
  for (let li = 0; li < nl; li++) {
    let ref = 0;
    for (let b = 0; b < nb; b++) ref += w[b] * sf[li][b];
    for (let b = 0; b < nb; b++) sf[li][b] -= ref;
  }
  return sf;
}

function invert(M) {
  const n = M.length;
  const A = M.map((row, i) => {
    const r = new Float64Array(2 * n);
    r.set(row, 0);
    r[n + i] = 1;
    return r;
  });
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c];
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const f = A[i][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) A[i][j] -= f * A[c][j];
    }
  }
  return A.map((r) => r.slice(n));
}

// GTC shift factors: the algebraic sum of the member lines' shift factors.
export function gtcShiftFactors(sf) {
  return GTCS.map((g) => {
    const row = new Float64Array(BUSES.length);
    for (const [lineId, sign] of g.members) {
      const li = LINE_INDEX[lineId];
      for (let b = 0; b < BUSES.length; b++) row[b] += sign * sf[li][b];
    }
    return row;
  });
}
