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
  rankResult,
  winShare,
  pairLogAsOf,
  sortStats,
  affinityAsOf,
  AFFINITY_MAX_GAMES,
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

describe("rankResult", () => {
  test("lower rank wins; equal ranks tie", () => {
    assert.equal(rankResult({ rank: 1 }, { rank: 2 }), "won");
    assert.equal(rankResult({ rank: 3 }, { rank: 2 }), "lost");
    assert.equal(rankResult({ rank: 1 }, { rank: 1 }), "tie");
  });
});

describe("winShare", () => {
  test("ties count half", () => {
    // (2 + 0.5 × 1) / 4 = 0.625
    assert.equal(winShare({ w: 2, l: 1, t: 1 }), 0.625);
    assert.equal(winShare({ w: 0, l: 3, t: 0 }), 0);
    assert.equal(winShare({ w: 0, l: 0, t: 2 }), 0.5);
  });

  test("no meetings has no share", () => {
    assert.equal(winShare({ w: 0, l: 0, t: 0 }), null);
  });
});

describe("pairLogAsOf", () => {
  // same three plays as the head-to-head fixture above
  const { events } = buildPayload([
    { date: "2026-01-01", game: "G1", seats: [["A", 1, 10], ["B", 2, 0], ["C", 3, -5], ["X", 4, -5]] },
    { date: "2026-01-01", game: "G2", seats: [["A", 1, 0, false], ["B", 1, 0, false], ["C", 1, 0, false]] },
    { date: "2026-01-08", game: "G3", seats: [["C", 1, 8], ["A", 2, -8]] },
  ]);

  test("every shared play, newest first, from the row player's side", () => {
    const log = pairLogAsOf(events, "A", "C", "2026-01-08");
    // h3 C beat A → lost; h2 full tie → tie; h1 A 1st vs C 3rd → won
    assert.deepEqual(
      log.map((p) => [p.date, p.game, p.result, p.a.name, p.b.name]),
      [
        ["2026-01-08", "G3", "lost", "A", "C"],
        ["2026-01-01", "G2", "tie", "A", "C"],
        ["2026-01-01", "G1", "won", "A", "C"],
      ],
    );
    // the full seats ride along for rank/score/delta rendering
    assert.equal(log[0].a.delta, -8);
    assert.equal(log[0].b.rank, 1);
  });

  test("the as-of date drops later plays; plays missing either player are skipped", () => {
    assert.deepEqual(
      pairLogAsOf(events, "C", "A", "2026-01-01").map((p) => [p.game, p.result]),
      [["G2", "tie"], ["G1", "lost"]],
    );
    // X only sat in h1
    assert.deepEqual(pairLogAsOf(events, "A", "X", "2026-01-08").map((p) => p.game), ["G1"]);
    assert.deepEqual(pairLogAsOf(events, "A", "Zed", "2026-01-08"), []);
  });
});

describe("sortStats", () => {
  const stats = [
    { name: "Cat", elo: 1000, plays: 4 },
    { name: "Ann", elo: 1100, plays: 4 },
    { name: "Bob", elo: 1000, plays: 6 },
  ];

  test("numeric descending; equal values fall back to name ascending", () => {
    // elo desc: Ann 1100, then Bob/Cat tied at 1000 → Bob before Cat
    assert.deepEqual(sortStats(stats, "elo", -1).map((s) => s.name), ["Ann", "Bob", "Cat"]);
    // plays asc: Ann/Cat tied at 4 → Ann, Cat; then Bob 6
    assert.deepEqual(sortStats(stats, "plays", 1).map((s) => s.name), ["Ann", "Cat", "Bob"]);
  });

  test("string keys sort alphabetically in either direction", () => {
    assert.deepEqual(sortStats(stats, "name", 1).map((s) => s.name), ["Ann", "Bob", "Cat"]);
    assert.deepEqual(sortStats(stats, "name", -1).map((s) => s.name), ["Cat", "Bob", "Ann"]);
  });

  test("returns a new array, leaving the input order alone", () => {
    const out = sortStats(stats, "elo", -1);
    assert.notEqual(out, stats);
    assert.deepEqual(stats.map((s) => s.name), ["Cat", "Ann", "Bob"]);
  });
});

describe("affinityAsOf: column cap", () => {
  // one play each of G1..G11 by Ann, plus a second play of G11 so it
  // ranks first; the rest tie at one play and keep first-seen order
  const games = Array.from({ length: 11 }, (_, i) => `G${i + 1}`);
  const { events } = buildPayload(
    [...games, "G11"].map((game) => ({
      date: "2026-01-01", game, seats: [["Ann", 1, 1], ["Bob", 2, -1]],
    })),
  );

  test("the cap is ten columns", () => {
    assert.equal(AFFINITY_MAX_GAMES, 10);
  });

  test("eleven games played → exactly the cap shown, least-played dropped", () => {
    const { games: shown } = affinityAsOf(events, ["Ann"], "2026-01-01");
    // G11 (2 plays) first, then G1..G9 — G10 is the 11th and falls off
    assert.deepEqual(shown, ["G11", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9"]);
  });

  test("exactly ten games played → all ten shown", () => {
    const { games: shown } = affinityAsOf(events.slice(0, 10), ["Ann"], "2026-01-01");
    assert.equal(shown.length, 10);
  });
});
