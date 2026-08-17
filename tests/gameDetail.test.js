// Fixture-based tests for the per-game stat-sheet derivations. Every
// expected value here is hand-computed from the fixture — if a test needs
// the production code to derive its expectation, it tests nothing.
//
// Input is the payload's events (rated plays — the only plays that carry
// ranks, scores, and winner flags). Known data quirks the derivation must
// tolerate (see tests/data-invariants.test.js): scores may be null
// (rank-only games), a play can have zero official winners (full tie) or
// several (BG Stats flags on a broken tie).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  gameDetailAsOf,
  TREND_MIN_SCORED_PLAYS,
  STREAK_MIN_LEN,
} from "../components/elo/gameDetail.js";

// Minimal event: the derivation reads date, game, and per-seat
// name/rank/score/won/role. won defaults to rank === 1; role (the BG
// Stats faction field, logged for some games only) defaults to null.
const ev = (date, game, seats) => ({
  date,
  game,
  seats: seats.map(([name, rank, score, won, role]) => ({
    name,
    rank,
    score: score ?? null,
    won: won ?? rank === 1,
    role: role ?? null,
  })),
});

describe("gameDetailAsOf", () => {
  // Four scored plays of G with per-play means 8, 9, 10, 11 (sums 24, 27,
  // 30, 33 over 3 seats). Ann wins p1, p2, p4; Cat wins p3. An unrelated
  // game X sits in the middle and must never leak in.
  const events = [
    ev("2026-01-01", "G", [["Ann", 1, 10], ["Bob", 2, 8], ["Cat", 3, 6]]),
    ev("2026-01-05", "X", [["Ann", 1, 99], ["Bob", 2, 98]]),
    ev("2026-01-08", "G", [["Ann", 1, 12], ["Cat", 2, 9], ["Bob", 3, 6]]),
    ev("2026-01-15", "G", [["Cat", 1, 14], ["Ann", 2, 10], ["Bob", 3, 6]]),
    ev("2026-01-22", "G", [["Ann", 1, 15], ["Bob", 2, 11], ["Cat", 3, 7]]),
  ];
  const d = gameDetailAsOf(events, "G", "2026-01-22");

  test("play counts and average score over every scored seat", () => {
    assert.equal(d.ratedPlays, 4);
    assert.equal(d.scoredPlays, 4);
    // all 12 scores sum to 24 + 27 + 30 + 33 = 114 → mean 9.5
    assert.equal(d.avgScore, 9.5);
  });

  test("score records: winning extremes and the best losing score", () => {
    // winning scores are 10, 12, 14, 15
    assert.deepEqual(d.highWin, { score: 15, name: "Ann", date: "2026-01-22" });
    assert.deepEqual(d.lowWin, { score: 10, name: "Ann", date: "2026-01-01" });
    // best score that still lost: Bob's 11 in p4
    assert.deepEqual(d.highLoss, { score: 11, name: "Bob", date: "2026-01-22" });
  });

  test("score trend: slope of per-play means over the grand play mean", () => {
    // play means 8, 9, 10, 11 climb exactly 1 per play; their mean is
    // 9.5, so the normalized slope is 1/9.5 per play
    assert.ok(Math.abs(d.trend - 1 / 9.5) < 1e-12);
  });

  test("streaks: longest run and the reigning winner's active run", () => {
    // Ann's results over her plays: W W L W — longest run 2 (p1–p2)
    assert.deepEqual(d.streak.longest, {
      name: "Ann",
      len: 2,
      start: "2026-01-01",
      end: "2026-01-08",
    });
    // last play's winner is Ann, one win into a new run
    assert.deepEqual(d.streak.current, [{ name: "Ann", len: 1 }]);
  });

  test("player rows: counts and score stats, best winners first", () => {
    // Ann 3W/4P avg (10+12+10+15)/4 = 11.75 · Cat 1W/4P avg 36/4 = 9 ·
    // Bob 0W/4P avg 31/4 = 7.75
    assert.deepEqual(d.playerRows, [
      { name: "Ann", plays: 4, wins: 3, avgScore: 11.75, bestScore: 15 },
      { name: "Cat", plays: 4, wins: 1, avgScore: 9, bestScore: 14 },
      { name: "Bob", plays: 4, wins: 0, avgScore: 7.75, bestScore: 11 },
    ]);
  });

  test("history: one row per play, newest first", () => {
    assert.equal(d.history.length, 4);
    assert.deepEqual(d.history[0], {
      date: "2026-01-22",
      winners: ["Ann"],
      winScore: 15,
      avgScore: 11,
      seats: 3,
    });
    assert.deepEqual(d.history[3], {
      date: "2026-01-01",
      winners: ["Ann"],
      winScore: 10,
      avgScore: 8,
      seats: 3,
    });
  });

  test("the as-of date excludes later plays entirely", () => {
    const cut = gameDetailAsOf(events, "G", "2026-01-15");
    assert.equal(cut.ratedPlays, 3);
    // winning scores through p3 are 10, 12, 14
    assert.deepEqual(cut.highWin, { score: 14, name: "Cat", date: "2026-01-15" });
    // 3 scored plays sits below the 4-play trend floor → no trend
    assert.equal(TREND_MIN_SCORED_PLAYS, 4);
    assert.equal(cut.trend, null);
    // p3's winner Cat is reigning with a 1-win run
    assert.deepEqual(cut.streak.current, [{ name: "Cat", len: 1 }]);
  });

  test("a game with no rated plays through the date is null", () => {
    assert.equal(gameDetailAsOf(events, "G", "2025-12-31"), null);
    assert.equal(gameDetailAsOf(events, "Nope", "2026-01-22"), null);
  });
});

describe("gameDetailAsOf data quirks", () => {
  test("rank-only games: score stats absent, results still counted", () => {
    const events = [
      ev("2026-01-01", "G", [["Ann", 1], ["Bob", 2]]),
      ev("2026-01-08", "G", [["Ann", 1], ["Bob", 2]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-08");
    assert.equal(d.ratedPlays, 2);
    assert.equal(d.scoredPlays, 0);
    assert.equal(d.avgScore, null);
    assert.equal(d.highWin, null);
    assert.equal(d.lowWin, null);
    assert.equal(d.highLoss, null);
    assert.equal(d.trend, null);
    // wins and streaks come from the won flag alone
    assert.deepEqual(d.streak.longest, {
      name: "Ann",
      len: 2,
      start: "2026-01-01",
      end: "2026-01-08",
    });
    assert.deepEqual(d.playerRows[0], {
      name: "Ann",
      plays: 2,
      wins: 2,
      avgScore: null,
      bestScore: null,
    });
    assert.deepEqual(d.history[0], {
      date: "2026-01-08",
      winners: ["Ann"],
      winScore: null,
      avgScore: null,
      seats: 2,
    });
  });

  test("a one-win run stays below the streak floor", () => {
    const events = [
      ev("2026-01-01", "G", [["Ann", 1], ["Bob", 2]]),
      ev("2026-01-08", "G", [["Bob", 1], ["Ann", 2]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-08");
    assert.equal(STREAK_MIN_LEN, 2);
    // nobody ever won twice running — no longest-streak row
    assert.equal(d.streak.longest, null);
    assert.deepEqual(d.streak.current, [{ name: "Bob", len: 1 }]);
  });

  test("streaks span only the plays a player sat in", () => {
    // Ann wins p1, skips p2, wins p3: her run is 2 across her own plays
    const events = [
      ev("2026-01-01", "G", [["Ann", 1, 5], ["Bob", 2, 3]]),
      ev("2026-01-08", "G", [["Bob", 1, 6], ["Cat", 2, 2]]),
      ev("2026-01-15", "G", [["Ann", 1, 7], ["Bob", 2, 4]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-15");
    assert.deepEqual(d.streak.longest, {
      name: "Ann",
      len: 2,
      start: "2026-01-01",
      end: "2026-01-15",
    });
  });

  test("full tie (zero winners): no losers, no reigning winner", () => {
    const events = [
      ev("2026-01-01", "G", [["Ann", 1, 9, true], ["Bob", 2, 7, false]]),
      // everyone tied — nobody won, so nobody "lost" with their score
      ev("2026-01-08", "G", [["Ann", 1, 20, false], ["Bob", 1, 20, false]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-08");
    // the tie's 20s must not become the "best losing score"
    assert.deepEqual(d.highLoss, { score: 7, name: "Bob", date: "2026-01-01" });
    assert.deepEqual(d.streak.current, []);
    assert.deepEqual(d.history[0].winners, []);
    assert.equal(d.history[0].winScore, null);
  });

  test("multiple winners: both runs extend, both reign", () => {
    const events = [
      ev("2026-01-01", "G", [["Ann", 1, 9, true], ["Bob", 1, 9, true], ["Cat", 3, 4, false]]),
      ev("2026-01-08", "G", [["Ann", 1, 8, true], ["Bob", 1, 6, true], ["Cat", 3, 5, false]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-08");
    assert.deepEqual(d.streak.current, [
      { name: "Ann", len: 2 },
      { name: "Bob", len: 2 },
    ]);
    // the shared first-place 9s are winning scores, not losing ones
    assert.deepEqual(d.highWin, { score: 9, name: "Ann", date: "2026-01-01" });
    assert.deepEqual(d.highLoss, { score: 5, name: "Cat", date: "2026-01-08" });
    // a play's winScore is the best score among its winners
    assert.equal(d.history[0].winScore, 8);
  });

  test("equal wins rank by the larger sample — regulars above drop-ins", () => {
    // Ann and Dee both have 1 win, but Ann's came over 3 plays (the tied
    // third play has no winners); winless Bob (3 plays) sits above
    // winless Cat (1 play) the same way
    const events = [
      ev("2026-01-01", "G", [["Ann", 1], ["Bob", 2], ["Cat", 3]]),
      ev("2026-01-08", "G", [["Dee", 1], ["Ann", 2], ["Bob", 3]]),
      ev("2026-01-15", "G", [["Ann", 1, null, false], ["Bob", 1, null, false]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-15");
    assert.deepEqual(
      d.playerRows.map((r) => r.name),
      ["Ann", "Dee", "Bob", "Cat"],
    );
  });

  test("faction records aggregate roles; roleless seats don't count", () => {
    // Saxony: Ann's win + Cat's loss = 1W/2P · Rusviet: Bob's two losses
    // then Bob's win = 1W/3P · Ann's roleless p2 seat counts for no faction
    const events = [
      ev("2026-01-01", "G", [["Ann", 1, 9, true, "Saxony"], ["Bob", 2, 7, false, "Rusviet"]]),
      ev("2026-01-08", "G", [["Cat", 1, 8], ["Bob", 2, 6, false, "Rusviet"], ["Ann", 3, 5]]),
      ev("2026-01-15", "G", [["Bob", 1, 9, true, "Rusviet"], ["Cat", 2, 4, false, "Saxony"]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-15");
    // same tiebreak as playerRows: equal wins rank by the larger sample
    assert.deepEqual(d.factionRows, [
      { role: "Rusviet", plays: 3, wins: 1 },
      { role: "Saxony", plays: 2, wins: 1 },
    ]);
    // every play had at least one roled seat (p2's came from Bob alone)
    assert.equal(d.rolePlays, 3);
  });

  test("a game with no roles logged has no faction rows", () => {
    const events = [ev("2026-01-01", "G", [["Ann", 1, 9], ["Bob", 2, 7]])];
    const d = gameDetailAsOf(events, "G", "2026-01-01");
    assert.deepEqual(d.factionRows, []);
    assert.equal(d.rolePlays, 0);
  });

  test("string scores (BG Stats export quirk) coerce like numbers", () => {
    const events = [
      ev("2026-01-01", "G", [["Ann", 1, "22"], ["Bob", 2, ""], ["Cat", 3, 4]]),
    ];
    const d = gameDetailAsOf(events, "G", "2026-01-01");
    // "" is unscored, so the mean is (22 + 4) / 2 = 13
    assert.equal(d.avgScore, 13);
    assert.deepEqual(d.highWin, { score: 22, name: "Ann", date: "2026-01-01" });
    assert.equal(d.playerRows.find((r) => r.name === "Bob").avgScore, null);
  });
});
