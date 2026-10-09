// Tests for the /packev derivations. Expected values are worked out by hand
// in the comments, never by re-running the code under test.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ROLE_VAR,
  agingPoints,
  boosterKey,
  milestoneGrid,
  niceTicks,
  seriesPoints,
  tableRows,
} from "../components/packev/derive.js";

const BOOSTERS = [
  // ratio 6/4 = 1.5
  { set: "aaa", setName: "Alpha", release: "2026-01-01", booster: "Play Booster", role: "Play / Draft",
    price: 4, ev: 6, evBulk: 3, weeks: 10, weeksAbove: 7,
    series: [["2026-01-05", 5, 2, 4], ["2026-02-02", 6, 3, 4]] },
  // ratio 20/40 = 0.5
  { set: "aaa", setName: "Alpha", release: "2026-01-01", booster: "Collector Booster", role: "Collector",
    price: 40, ev: 20, evBulk: 19, weeks: 10, weeksAbove: 0,
    series: [["2026-01-05", 30, 29, 30]] },
  // no pack price: ratio is null
  { set: "bbb", setName: "Beta", release: "2025-01-01", booster: "Set Booster", role: "Set",
    price: null, ev: 9, evBulk: 7, weeks: 0, weeksAbove: 0, series: [] },
]; // prettier-ignore

describe("tableRows", () => {
  test("adds the EV / price ratio for the chosen pricing", () => {
    const rows = tableRows(BOOSTERS, { pricing: "market" });
    assert.deepEqual(rows.map((r) => r.ratio), [1.5, 0.5, null]);
    // bulk: 3/4 = 0.75, 19/40 = 0.475
    const bulk = tableRows(BOOSTERS, { pricing: "bulk" });
    assert.deepEqual(bulk.map((r) => r.value), [3, 19, 7]);
    assert.deepEqual(bulk.map((r) => r.ratio), [0.75, 0.475, null]);
  });

  test("filters by role and keeps release order", () => {
    const rows = tableRows(BOOSTERS, { pricing: "market", role: "Collector" });
    assert.deepEqual(rows.map((r) => boosterKey(r)), ["aaa/Collector Booster"]);
  });

  test("sorts by ratio with missing ratios last", () => {
    const rows = tableRows(BOOSTERS, { pricing: "market", sort: "ratio" });
    assert.deepEqual(rows.map((r) => r.ratio), [1.5, 0.5, null]);
    const asc = tableRows(BOOSTERS, { pricing: "market", sort: "ratio", ascending: true });
    assert.deepEqual(asc.map((r) => r.ratio), [0.5, 1.5, null]);
  });
});

describe("seriesPoints", () => {
  test("picks market or bulk EV and pairs it with the pack price", () => {
    // market: 5/4 = 1.25, 6/4 = 1.5 ; bulk: 2/4 = 0.5, 3/4 = 0.75
    assert.deepEqual(seriesPoints(BOOSTERS[0], "market"), [
      { week: "2026-01-05", ev: 5, price: 4, ratio: 1.25 },
      { week: "2026-02-02", ev: 6, price: 4, ratio: 1.5 },
    ]);
    assert.deepEqual(seriesPoints(BOOSTERS[0], "bulk").map((p) => p.ratio), [0.5, 0.75]);
  });

  test("skips weeks without a price", () => {
    const b = { series: [["2026-01-05", 5, 2, null], ["2026-01-12", 5, 2, 5]] };
    assert.deepEqual(seriesPoints(b, "market").map((p) => p.week), ["2026-01-12"]);
  });
});

describe("agingPoints", () => {
  const cross = {
    market: { aging: { Collector: [[0, 0.8, 1.0, 1.2, 0.5, 40], [2, 0.7, 0.9, 1.1, 0.4, 4]] } },
  };

  test("drops ages backed by fewer series than the floor", () => {
    // n = 4 at age 2 is under a floor of 5, so only age 0 survives
    assert.deepEqual(agingPoints(cross, "market", "Collector", 5), [
      { age: 0, p25: 0.8, median: 1.0, p75: 1.2, shareAbove: 0.5, n: 40 },
    ]);
    assert.equal(agingPoints(cross, "market", "Collector", 4).length, 2);
  });

  test("missing role or pricing gives no points", () => {
    assert.deepEqual(agingPoints(cross, "bulk", "Collector", 5), []);
    assert.deepEqual(agingPoints(cross, "market", "Set", 5), []);
  });
});

describe("milestoneGrid", () => {
  const ms = [
    { milestone: "1 year", age: 52, role: "Set", n: 15, shareAbove: 0.8, medianRatio: 1.1 },
    { milestone: "launch", age: 0, role: "Set", n: 15, shareAbove: 0.9, medianRatio: 1.3 },
    { milestone: "launch", age: 0, role: "Collector", n: 40, shareAbove: 0.5, medianRatio: 1.0 },
  ];

  test("orders columns by age and leaves absent cells null", () => {
    const grid = milestoneGrid(ms, ["Set", "Collector"]);
    assert.deepEqual(grid.columns, ["launch", "1 year"]);
    assert.equal(grid.rows[0].cells[1].shareAbove, 0.8);
    // Collector has no 1-year milestone (below the sample floor upstream)
    assert.equal(grid.rows[1].cells[1], null);
  });
});

describe("niceTicks", () => {
  test("covers the range with round steps", () => {
    // span 1.6 / 4 = 0.4 = 4 x 0.1 -> 3 <= 4 < 7 rounds to 5 x 0.1 = 0.5: 0, 0.5, 1, 1.5, 2
    assert.deepEqual(niceTicks(0, 1.6, 4), [0, 0.5, 1, 1.5, 2]);
    // span 45 / 4 = 11.25 = 1.125 x 10 -> under 1.5 rounds to 1 x 10: 0 .. 50 by 10
    assert.deepEqual(niceTicks(0, 45, 4), [0, 10, 20, 30, 40, 50]);
  });
});

test("every role has a colour variable", () => {
  for (const r of ["Play / Draft", "Set", "Collector"]) assert.match(ROLE_VAR[r], /^var\(--pev-/);
});

test("formatters", async () => {
  const { pct, usd } = await import("../components/packev/derive.js");
  assert.equal(pct(0.564), "56%");
  assert.equal(pct(1.0234, 1), "102.3%");
  assert.equal(pct(null), "–");
  assert.equal(usd(1234.5), "$1,234.50");
  assert.equal(usd(-3, 0), "−$3");
});
