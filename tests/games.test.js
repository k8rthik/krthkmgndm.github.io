// Fixture-based tests for the games-table derivations. Every expected
// value here is hand-computed from the fixture — if a test needs the
// production code to derive its expectation, it tests nothing.
//
// The input is the payload's playLog: EVERY logged play, rated or not —
// unrated plays count toward plays/time/players by design (BG Stats
// semantics), only the rating math ignores them.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  gamesAsOf,
  hIndexOf,
  GAMES_TABLE_CAP,
} from "../components/elo/games.js";
import { fmtDuration } from "../components/elo/format.js";

// Minimal playLog entry: the derivation reads date, game, hours, players.
const play = (date, game, hours, players) => ({ date, game, hours, players });

describe("hIndexOf", () => {
  test("largest n with n counts ≥ n, at the exact boundary", () => {
    // sorted desc 3,3,2: position 1→3≥1, 2→3≥2, 3→2<3 — h is 2
    assert.equal(hIndexOf([3, 3, 2]), 2);
    // four games at exactly 4 plays: position 4→4≥4 — h is 4
    assert.equal(hIndexOf([4, 4, 4, 4]), 4);
    // drop one to 3 and position 4 fails: 3<4 — h falls to 3
    assert.equal(hIndexOf([4, 4, 4, 3]), 3);
  });

  test("degenerate cases: one play is h=1, nothing is h=0", () => {
    assert.equal(hIndexOf([1]), 1);
    assert.equal(hIndexOf([]), 0);
  });

  test("order-independent — unsorted input gives the same answer", () => {
    assert.equal(hIndexOf([2, 3, 3]), 2);
  });
});

describe("gamesAsOf", () => {
  const log = [
    play("2026-01-01", "G1", 2.5, ["Ann", "Bob"]),
    play("2026-01-01", "G2", 0.5, ["Ann", "Cat"]),
    play("2026-01-08", "G1", 2.5, ["Bob", "Cat"]),
    play("2026-01-15", "G3", 0.5, ["Ann", "Bob"]),
  ];

  test("plays, hours, and distinct players per game", () => {
    const { rows } = gamesAsOf(log, "2026-01-15");
    // G1: 2 plays, 2.5 + 2.5 = 5h, players Ann/Bob/Cat deduped to 3
    assert.deepEqual(rows[0], { game: "G1", plays: 2, hours: 5.0, players: 3 });
    // one-play games tie on plays and hours; falls to name order
    assert.deepEqual(rows[1], { game: "G2", plays: 1, hours: 0.5, players: 2 });
    assert.deepEqual(rows[2], { game: "G3", plays: 1, hours: 0.5, players: 2 });
  });

  test("h-index counts distinct games played at least n times", () => {
    // through 01-08: G1×2, G2×1 → sorted 2,1: pos 1→2≥1, pos 2→1<2 — h=1
    assert.equal(gamesAsOf(log, "2026-01-08").hIndex, 1);
  });

  test("the as-of date excludes later plays entirely", () => {
    const { rows, hIndex } = gamesAsOf(log, "2026-01-01");
    // only the first two plays: G1 once (2.5h), G2 once (0.5h)
    assert.deepEqual(rows, [
      { game: "G1", plays: 1, hours: 2.5, players: 2 },
      { game: "G2", plays: 1, hours: 0.5, players: 2 },
    ]);
    assert.equal(hIndex, 1);
  });

  test("no plays through the date → empty rows, h-index 0", () => {
    assert.deepEqual(gamesAsOf(log, "2025-12-31"), { hIndex: 0, rows: [] });
  });

  test("unrated plays still count — the log carries them, nothing filters", () => {
    // an unrated play (rated: false) of G2 makes it 2 plays / 1.5h
    const withUnrated = [
      ...log,
      { ...play("2026-01-15", "G2", 1.0, ["Ann", "Dee"]), rated: false },
    ];
    const g2 = gamesAsOf(withUnrated, "2026-01-15").rows.find(
      (r) => r.game === "G2",
    );
    assert.deepEqual(g2, { game: "G2", plays: 2, hours: 1.5, players: 3 });
  });

  test("ties on plays sort by hours, longest first", () => {
    const rows = gamesAsOf(
      [
        play("2026-01-01", "Short", 1, ["Ann", "Bob"]),
        play("2026-01-01", "Long", 2, ["Ann", "Bob"]),
      ],
      "2026-01-01",
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.game),
      ["Long", "Short"],
    );
  });
});

describe("gamesAsOf cap", () => {
  // Fixture generator: `spec` maps play counts to how many games get that
  // count. Each play is 1h, one seat, same date — only counts matter here.
  function logFor(spec) {
    const log = [];
    let g = 0;
    for (const [plays, nGames] of spec) {
      for (let i = 0; i < nGames; i++) {
        g += 1;
        const name = `G${String(g).padStart(2, "0")}`;
        for (let p = 0; p < plays; p++) {
          log.push(play("2026-01-01", name, 1, ["Ann"]));
        }
      }
    }
    return log;
  }

  test("cap is 20", () => {
    assert.equal(GAMES_TABLE_CAP, 20);
  });

  test("games tied with row 20's play count stay in", () => {
    // 19 games ×3 plays, then G20/G21/G22 ×2, G23 ×1: row 20 has 2 plays,
    // rows 21–22 tie it and survive; the 1-play game is cut → 22 rows
    const log = logFor([
      [3, 19],
      [2, 3],
      [1, 1],
    ]);
    const { rows } = gamesAsOf(log, "2026-01-01");
    assert.equal(rows.length, 22);
    assert.equal(rows[21].plays, 2);
    assert.ok(!rows.some((r) => r.game === "G23"));
  });

  test("a strictly smaller count past the cap is cut", () => {
    // 19 games ×3, G20 ×2, G21–G23 ×1: row 20 has 2 plays, row 21 would
    // have 1 < 2 → exactly 20 rows
    const log = logFor([
      [3, 19],
      [2, 1],
      [1, 3],
    ]);
    assert.equal(gamesAsOf(log, "2026-01-01").rows.length, 20);
  });
});

describe("fmtDuration", () => {
  test("hour-scale durations show one decimal", () => {
    assert.equal(fmtDuration(29.34), "29.3h");
    assert.equal(fmtDuration(1), "1.0h");
  });

  test("sub-hour durations show whole minutes", () => {
    // 0.85h × 60 = 51 minutes
    assert.equal(fmtDuration(0.85), "51m");
  });
});
