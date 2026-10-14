// Fixture-based tests for the as-of-date views. Every expected value
// here is hand-computed from the fixture — if a test needs the
// production code to derive its expectation, it tests nothing.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  statsAsOf,
  headToHeadAsOf,
  sessionBand,
  cutoffHours,
} from "../components/elo/asOf.js";
import { buildPayload } from "./helpers.js";

// ci90 = 1.645 × sigma is a float product — compare to a tolerance
const near = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: ${actual} vs ${expected}`);

describe("statsAsOf", () => {
  // h1 2026-01-01  Ann 1st +20 (pae  .5,  σ100) · Bob 2nd -20 (pae -.5,  σ40)
  // h2 2026-01-01  Bob 1st +10 (pae  .25, σ20)  · Ann 2nd -10 (pae -.25, σ90)
  // h3 2026-02-20  Ann 1st +15 (pae  .5,  σ80)  · Cat 2nd -15 (pae -.5,  σ170)
  // Dan is on the roster but never plays.
  const { events, series } = buildPayload([
    { date: "2026-01-01", game: "G", seats: [["Ann", 1, 20, true, null, { pae: 0.5, sigma: 100 }], ["Bob", 2, -20, false, null, { pae: -0.5, sigma: 40 }]] },
    { date: "2026-01-01", game: "G", seats: [["Bob", 1, 10, true, null, { pae: 0.25, sigma: 20 }], ["Ann", 2, -10, false, null, { pae: -0.25, sigma: 90 }]] },
    { date: "2026-02-20", game: "G", seats: [["Ann", 1, 15, true, null, { pae: 0.5, sigma: 80 }], ["Cat", 2, -15, false, null, { pae: -0.5, sigma: 170 }]] },
  ]);
  const players = ["Ann", "Bob", "Cat", "Dan"].map((name) => ({ name, elo: 0, ci90: 0 }));
  const data = { events, series, players };

  test("end of the first night: rating, peak, record, pae, ci", () => {
    const rows = statsAsOf(data, "2026-01-01");
    // Cat (first play 02-20) and Dan (never) have no rated plays yet
    assert.deepEqual(rows.map((r) => r.name), ["Ann", "Bob"]);
    const [ann, bob] = rows;
    // Ann's series 1000 → 1020 → 1010: elo 1010, peak 1020; 1 win of 2;
    // pae .5 - .25 = .25; last σ 90, zero idle days → ci 1.645 × 90
    const { ci90, ...rest } = ann;
    assert.deepEqual(rest, {
      name: "Ann", elo: 1010, peak: 1020, plays: 2, wins: 1, winRate: 0.5, pae: 0.25,
    });
    near(ci90, 148.05, "Ann ci90");
    // Bob 1000 → 980 → 990: the 1000 anchor is still his peak
    assert.equal(bob.elo, 990);
    assert.equal(bob.peak, 1000);
    assert.equal(bob.pae, -0.25);
    near(bob.ci90, 1.645 * 20, "Bob ci90");
  });

  test("idle days widen sigma: σ² grows 10 per calendar day", () => {
    const bob = statsAsOf(data, "2026-02-20").find((r) => r.name === "Bob");
    // Bob last played 01-01 at σ20; 01-01 → 02-20 is 30 + 20 = 50 days
    // √(20² + 10 × 50) = √900 = 30 → ci 1.645 × 30 = 49.35
    near(bob.ci90, 49.35, "Bob widened ci90");
    // and his rating is untouched by a session he missed
    assert.equal(bob.elo, 990);
  });

  test("a player who played that day gets no widening", () => {
    const ann = statsAsOf(data, "2026-02-20").find((r) => r.name === "Ann");
    // σ80 on 02-20 → 1.645 × 80 = 131.6; series → 1025, the new peak
    near(ann.ci90, 131.6, "Ann ci90");
    assert.equal(ann.elo, 1025);
    assert.equal(ann.peak, 1025);
    assert.equal(ann.plays, 3);
    assert.equal(ann.wins, 2);
  });

  test("widening is capped at the never-played prior (σ 180)", () => {
    const cat = statsAsOf(data, "2027-02-20").find((r) => r.name === "Cat");
    // 365 idle days: √(170² + 3650) = √32550 ≈ 180.4 → capped to 180
    // → ci 1.645 × 180 = 296.1
    near(cat.ci90, 296.1, "Cat capped ci90");
  });

  test("the as-of date excludes later plays", () => {
    const rows = statsAsOf(data, "2026-02-19");
    assert.equal(rows.find((r) => r.name === "Cat"), undefined);
    assert.equal(rows.find((r) => r.name === "Ann").plays, 2);
  });
});

describe("headToHeadAsOf", () => {
  // h1 01-01  A 1st, B 2nd, C 3rd, X (not a regular) 4th
  // h2 01-01  full tie: everyone rank 1, nobody flagged as winner
  // h3 01-08  C 1st, A 2nd
  const { events } = buildPayload([
    { date: "2026-01-01", game: "G", seats: [["A", 1, 10], ["B", 2, 0], ["C", 3, -5], ["X", 4, -5]] },
    { date: "2026-01-01", game: "G", seats: [["A", 1, 0, false], ["B", 1, 0, false], ["C", 1, 0, false]] },
    { date: "2026-01-08", game: "G", seats: [["C", 1, 8], ["A", 2, -8]] },
  ]);
  const core = ["A", "B", "C"];

  test("a full tie is a tie for every pair, mirrored", () => {
    const r = headToHeadAsOf(events, core, "2026-01-01");
    // h1 gives A>B, A>C, B>C; h2 adds a tie to every pair
    assert.deepEqual(r, {
      A: { B: { w: 1, l: 0, t: 1 }, C: { w: 1, l: 0, t: 1 } },
      B: { A: { w: 0, l: 1, t: 1 }, C: { w: 1, l: 0, t: 1 } },
      C: { A: { w: 0, l: 1, t: 1 }, B: { w: 0, l: 1, t: 1 } },
    });
  });

  test("later dates add later meetings; outsiders never appear", () => {
    const r = headToHeadAsOf(events, core, "2026-01-08");
    // h3: C beats A → A vs C now 1–1–1 both ways
    assert.deepEqual(r.A.C, { w: 1, l: 1, t: 1 });
    assert.deepEqual(r.C.A, { w: 1, l: 1, t: 1 });
    assert.deepEqual(r.A.B, { w: 1, l: 0, t: 1 }); // B sat out h3
    assert.equal(r.X, undefined);
    assert.equal(r.A.X, undefined);
  });
});

describe("cutoffHours / sessionBand", () => {
  // h1, h2 on 01-01; h3 on 01-08
  const { events } = buildPayload([
    { date: "2026-01-01", game: "G", seats: [["A", 1, 5], ["B", 2, -5]] },
    { date: "2026-01-01", game: "G", seats: [["B", 1, 5], ["A", 2, -5]] },
    { date: "2026-01-08", game: "G", seats: [["A", 1, 5], ["B", 2, -5]] },
  ]);

  test("cutoffHours is the last play's h on or before the date", () => {
    assert.equal(cutoffHours(events, "2025-12-31"), 0); // before any play
    assert.equal(cutoffHours(events, "2026-01-01"), 2);
    assert.equal(cutoffHours(events, "2026-01-05"), 2); // no play that day
    assert.equal(cutoffHours(events, "2026-01-08"), 3);
  });

  test("sessionBand spans from the previous session's end to this one's", () => {
    assert.deepEqual(sessionBand(events, "2026-01-01"), { start: 0, end: 2 });
    assert.deepEqual(sessionBand(events, "2026-01-08"), { start: 2, end: 3 });
  });

  test("a date with no play has no band", () => {
    assert.equal(sessionBand(events, "2026-01-05"), null);
    assert.equal(sessionBand(events, "2025-12-31"), null);
  });
});
