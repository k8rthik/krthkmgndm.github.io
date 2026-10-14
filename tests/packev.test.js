// Tests for the /packev derivations. Expected values are worked out by hand
// in the comments, never by re-running the code under test.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  AGING_Y_FLOOR,
  DEFAULT_MIN_WEEKS,
  MAX_DATE_LABELS,
  MAX_YEAR_TICKS,
  ROLE_VAR,
  WEEKS_PER_YEAR,
  agingPoints,
  agingScale,
  boosterKey,
  boosterShortName,
  boosterSummary,
  boosterTitle,
  dateTickIndices,
  defaultBooster,
  milestoneGrid,
  monthYear,
  packevSummary,
  ratioTone,
  releaseYear,
  seriesPoints,
  tableRows,
  weeksAboveLabel,
  yearLabel,
  yearTicks,
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

test("every role has a colour variable", () => {
  for (const r of ["Play / Draft", "Set", "Collector"]) assert.match(ROLE_VAR[r], /^var\(--pev-/);
});

describe("agingScale", () => {
  test("y never drops under the 150% floor; x runs to the oldest age", () => {
    // p75s 1.2 and 1.1 are both under 1.5, so the floor holds
    const pts = [{ age: 0, p75: 1.2 }, { age: 104, p75: 1.1 }];
    assert.deepEqual(agingScale({ Set: pts, Collector: [] }), { yMax: 1.5, xMax: 104 });
  });

  test("a p75 above the floor sets the scale", () => {
    const scale = agingScale({ Set: [{ age: 10, p75: 2.1 }], Collector: [{ age: 300, p75: 0.9 }] });
    assert.deepEqual(scale, { yMax: 2.1, xMax: 300 });
  });

  test("no points at all still gives a finite one-year scale", () => {
    assert.equal(AGING_Y_FLOOR, 1.5);
    assert.deepEqual(agingScale({ Set: [], Collector: [] }), { yMax: 1.5, xMax: WEEKS_PER_YEAR });
    assert.deepEqual(agingScale({}), { yMax: 1.5, xMax: WEEKS_PER_YEAR });
  });
});

describe("defaultBooster", () => {
  const withWeeks = (set, n) => ({ set, booster: "Play Booster", series: Array(n).fill(["2026-01-05", 1, 1, 1]) });

  test("opens on the first booster with at least twelve weeks of history", () => {
    assert.equal(DEFAULT_MIN_WEEKS, 12);
    // 11 weeks is one short; 12 is exactly enough
    const list = [withWeeks("a", 11), withWeeks("b", 12), withWeeks("c", 40)];
    assert.equal(defaultBooster(list).set, "b");
  });

  test("falls back to the first booster when none qualifies", () => {
    assert.equal(defaultBooster([withWeeks("a", 3), withWeeks("b", 11)]).set, "a");
  });
});

describe("boosterSummary", () => {
  test("values one booster at the chosen pricing", () => {
    // market 6/4 = 1.5; bulk 3/4 = 0.75; no price -> no ratio
    assert.deepEqual(boosterSummary(BOOSTERS[0], "market"), { price: 4, value: 6, ratio: 1.5 });
    assert.deepEqual(boosterSummary(BOOSTERS[0], "bulk"), { price: 4, value: 3, ratio: 0.75 });
    assert.deepEqual(boosterSummary(BOOSTERS[2], "market"), { price: null, value: 9, ratio: null });
  });
});

describe("ratioTone", () => {
  test("break-even counts as winning; no ratio gets no tone", () => {
    assert.equal(ratioTone(1), "elo-pos");
    assert.equal(ratioTone(1.5), "elo-pos");
    assert.equal(ratioTone(0.999), "elo-neg");
    assert.equal(ratioTone(null), "");
  });
});

describe("labels", () => {
  test("booster names, release years and weeks above price", () => {
    assert.equal(boosterTitle(BOOSTERS[0]), "Alpha, play booster");
    assert.equal(boosterShortName("Collector Booster"), "collector");
    assert.equal(boosterShortName("Play Booster"), "play");
    assert.equal(releaseYear("2023-02-03"), "2023");
    assert.equal(weeksAboveLabel({ weeks: 10, weeksAbove: 7 }), "7/10");
    assert.equal(weeksAboveLabel({ weeks: 0, weeksAbove: 0 }), "–");
  });

  test("dates read as month and two-digit year in UTC", () => {
    // 1 Jan at midnight UTC would slip to Dec in a western time zone
    assert.equal(monthYear("2026-01-01"), "Jan 26");
    assert.equal(monthYear("2021-06-14"), "Jun 21");
  });
});

describe("yearTicks", () => {
  test("one tick a year inside the x range, capped at five", () => {
    assert.equal(MAX_YEAR_TICKS, 5);
    assert.deepEqual(yearTicks(51), [0]); // under a year
    assert.deepEqual(yearTicks(52), [0, 1]); // exactly a year
    assert.deepEqual(yearTicks(160), [0, 1, 2, 3]); // 156 <= 160 < 208
    assert.deepEqual(yearTicks(1000), [0, 1, 2, 3, 4, 5]);
  });

  test("labels launch, then years", () => {
    assert.equal(yearLabel(0), "launch");
    assert.equal(yearLabel(3), "3y");
  });
});

describe("dateTickIndices", () => {
  test("at most eight labels, evenly strided", () => {
    assert.equal(MAX_DATE_LABELS, 8);
    // 8 points: stride ceil(8/8) = 1, every point labelled
    assert.deepEqual(dateTickIndices(8), [0, 1, 2, 3, 4, 5, 6, 7]);
    // 9 points: stride ceil(9/8) = 2 -> 0, 2, 4, 6, 8
    assert.deepEqual(dateTickIndices(9), [0, 2, 4, 6, 8]);
    // 16 points: stride 2 -> eight labels
    assert.equal(dateTickIndices(16).length, 8);
    assert.deepEqual(dateTickIndices(0), []);
  });
});

describe("packevSummary", () => {
  test("describes the payload from its meta", () => {
    assert.deepEqual(packevSummary({ sets: 39, historyStart: "2021-06-14" }), {
      sets: 39,
      sinceYear: "2021",
      description:
        "Expected value of Magic: The Gathering booster packs against their sealed price, for 39 sets since 2021.",
    });
  });

  test("one set reads singular", () => {
    assert.match(packevSummary({ sets: 1, historyStart: "2024-01-01" }).description, /for 1 set since 2024\./);
  });
});
