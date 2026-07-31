// Fixture-based tests for the hall-of-fame derivations. Every expected
// value here is hand-computed from the fixture — if a test needs the
// production code to derive its expectation, it tests nothing.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  recordsAsOf,
  signatureGame,
  nemesis,
  profileExtrasAsOf,
} from "../components/elo/insights.js";

// Build a payload from event definitions the way the real pipeline does:
// h = 1, 2, 3…, series = [0, 1000] anchor plus one post-play point per
// seat, derived by accumulating deltas (the invariant the derivations
// rely on — see tests/data-invariants.test.js for the real-data check).
function buildPayload(defs) {
  const elo = {};
  const series = {};
  const events = defs.map((d, i) => {
    const h = i + 1;
    for (const [name, , delta] of d.seats) {
      elo[name] = (elo[name] ?? 1000) + delta;
      (series[name] ?? (series[name] = [[0, 1000]])).push([h, elo[name]]);
    }
    return {
      h,
      date: d.date,
      game: d.game,
      seats: d.seats.map(([name, rank, delta, won, score]) => ({
        name,
        rank,
        delta,
        won: won ?? rank === 1,
        score: score ?? null,
      })),
    };
  });
  return { events, series };
}

const row = (rows, label) => rows.find((r) => r.label === label);

describe("recordsAsOf", () => {
  // Ann: W W W L W · Bob: L L L L L (three 2nds) · Cat: L L L W
  const { events, series } = buildPayload([
    { date: "2026-01-01", game: "G1", seats: [["Ann", 1, 80, true, "10"], ["Bob", 2, -30, false, "8"], ["Cat", 3, -50, false, "6"]] },
    { date: "2026-01-01", game: "G2", seats: [["Ann", 1, 40, true], ["Bob", 2, -20, false], ["Cat", 3, -20, false]] },
    { date: "2026-01-08", game: "G1", seats: [["Ann", 1, 30, true, "12"], ["Cat", 2, -10, false, "9"], ["Bob", 3, -20, false, "5"]] },
    { date: "2026-01-15", game: "G1", seats: [["Cat", 1, 70, true, "14"], ["Ann", 2, -40, false, "13"], ["Bob", 3, -30, false, "4"]] },
    { date: "2026-01-22", game: "G2", seats: [["Ann", 1, 25, true], ["Bob", 2, -25, false]] },
  ]);
  const core = ["Ann", "Bob", "Cat"];
  const rows = recordsAsOf(events, series, core, "2026-01-22");

  test("apex: highest rating ever reached, with its date", () => {
    // Ann's post-play ratings: 1080, 1120, 1150, 1110, 1135 — peak 1150 at h=3
    assert.deepEqual(row(rows, "apex"), {
      label: "apex", holder: "Ann", value: "1,150", detail: "2026-01-08",
    });
  });

  test("heater: longest win streak with start – end dates", () => {
    // Ann wins events 1–3, loses 4: streak of 3 spanning the first two dates
    assert.deepEqual(row(rows, "heater"), {
      label: "heater", holder: "Ann", value: "3 W", detail: "2026-01-01 – 2026-01-08",
    });
  });

  test("cursed: longest loss streak with start – end dates", () => {
    // Bob loses all five games
    assert.deepEqual(row(rows, "cursed"), {
      label: "cursed", holder: "Bob", value: "5 L", detail: "2026-01-01 – 2026-01-22",
    });
  });

  test("kingpin requires 5 plays of one game — absent below the floor", () => {
    // G1 has only 3 plays per player
    assert.equal(row(rows, "kingpin"), undefined);
  });

  test("polymath: distinct games won", () => {
    // Ann won G1 and G2; Cat only G1; Bob none
    assert.deepEqual(row(rows, "polymath"), {
      label: "polymath", holder: "Ann", value: "2", detail: "distinct games won",
    });
  });

  test("studious requires 3 games with 3 scored plays each — absent here", () => {
    assert.equal(row(rows, "studious"), undefined);
  });

  test("sidekick: most 2nd-place finishes", () => {
    // Bob finishes 2nd in events 1, 2, 5
    assert.deepEqual(row(rows, "sidekick"), {
      label: "sidekick", holder: "Bob", value: "3", detail: "2nd-place finishes",
    });
  });

  test("underdog: win from 100+ elo below the pre-game favorite", () => {
    // Event 4: Cat enters at 920, favorite Ann at 1150 — gap 230.
    // Event 5: Ann wins as the favorite — no credit.
    assert.deepEqual(row(rows, "underdog"), {
      label: "underdog", holder: "Cat", value: "1", detail: "won 100+ elo below favorite",
    });
  });

  test("the as-of date excludes later events entirely", () => {
    const early = recordsAsOf(events, series, core, "2026-01-08");
    assert.equal(row(early, "underdog"), undefined); // Cat's upset is later
    // Bob and Cat are tied at 3 straight losses here; ties go to whoever
    // reached the length first in seat order — Cat (rank 2 processes
    // before rank 3 in the final event)
    assert.deepEqual(row(early, "cursed"), {
      label: "cursed", holder: "Cat", value: "3 L", detail: "2026-01-01 – 2026-01-08",
    });
  });
});

describe("recordsAsOf: underdog gap boundary", () => {
  const play = (gap) =>
    buildPayload([
      { date: "2026-01-01", game: "G", seats: [["A", 1, gap / 2, true], ["B", 2, -gap / 2, false]] },
      { date: "2026-01-08", game: "G", seats: [["B", 1, 20, true], ["A", 2, -20, false]] },
    ]);

  test("a gap of exactly 100 counts", () => {
    const { events, series } = play(100); // pre-game: A 1050, B 950
    const rows = recordsAsOf(events, series, ["A", "B"], "2026-01-08");
    assert.deepEqual(row(rows, "underdog"), {
      label: "underdog", holder: "B", value: "1", detail: "won 100+ elo below favorite",
    });
  });

  test("a gap of 99 does not", () => {
    const { events, series } = play(99);
    const rows = recordsAsOf(events, series, ["A", "B"], "2026-01-08");
    assert.equal(row(rows, "underdog"), undefined);
  });
});

describe("recordsAsOf: studious", () => {
  // Stu replays three games, three scored plays each, scores 8 → 10 → 12.
  // Each game's mean is 10, so normalized scores run 0.8, 1.0, 1.2 —
  // a slope of 0.2 per play in every game. Pooled: +20%.
  // Sessions interleave the games so event dates stay chronological.
  const dates = ["2026-01-01", "2026-01-08", "2026-01-15"];
  const sessions = (scoresByPlay) =>
    dates.flatMap((date, i) =>
      [["G1", scoresByPlay[i][0]], ["G2", scoresByPlay[i][1]], ["G3", scoresByPlay[i][2]]].map(
        ([game, score]) => ({
          date, game,
          seats: [["Stu", 1, 10, true, score], ["Oz", 2, -10, false]],
        }),
      ),
    );

  test("pools hand-computable trends across games", () => {
    const { events, series } = buildPayload(
      // string and numeric scores both work — the pipeline shipped both
      sessions([["8", 8, "8"], ["10", 10, "10"], ["12", 12, "12"]]),
    );
    const rows = recordsAsOf(events, series, ["Stu", "Oz"], "2026-01-15");
    assert.deepEqual(row(rows, "studious"), {
      label: "studious", holder: "Stu", value: "+20%", detail: "score gain per replay",
    });
  });

  test("a declining trend never takes the row", () => {
    const { events, series } = buildPayload(
      sessions([[12, 12, 12], [10, 10, 10], [8, 8, 8]]),
    );
    const rows = recordsAsOf(events, series, ["Stu", "Oz"], "2026-01-15");
    assert.equal(row(rows, "studious"), undefined);
  });
});

describe("signatureGame", () => {
  test("prefers games with 2+ plays even at a lower delta", () => {
    const sig = signatureGame({
      OneOff: { plays: 1, wins: 1, delta: 50 },
      Regular: { plays: 3, wins: 2, delta: 30 },
    });
    assert.deepEqual(sig, { game: "Regular", delta: 30 });
  });

  test("falls back to single plays when nothing is seasoned", () => {
    const sig = signatureGame({
      A: { plays: 1, wins: 0, delta: -5 },
      B: { plays: 1, wins: 1, delta: 12 },
    });
    assert.deepEqual(sig, { game: "B", delta: 12 });
  });

  test("returns null with no games", () => {
    assert.equal(signatureGame({}), null);
    assert.equal(signatureGame(undefined), null);
  });
});

describe("nemesis", () => {
  test("lowest win share among opponents faced 3+ times", () => {
    const nem = nemesis({
      X: { w: 1, l: 2, t: 0 }, // 3 meetings, share 1/3
      Y: { w: 0, l: 1, t: 0 }, // 1 meeting — under the floor
    });
    assert.equal(nem.opp, "X");
  });

  test("falls back to anyone faced when nobody clears the floor", () => {
    const nem = nemesis({
      X: { w: 1, l: 1, t: 0 },
      Y: { w: 0, l: 1, t: 0 },
    });
    assert.equal(nem.opp, "Y"); // share 0 beats share 0.5
  });

  test("equal shares break toward more meetings", () => {
    const nem = nemesis({
      X: { w: 2, l: 2, t: 0 }, // share 0.5, 4 meetings
      Y: { w: 3, l: 3, t: 0 }, // share 0.5, 6 meetings
    });
    assert.equal(nem.opp, "Y");
  });

  test("returns null with no opponents", () => {
    assert.equal(nemesis({}), null);
    assert.equal(nemesis(undefined), null);
  });
});

describe("profileExtrasAsOf", () => {
  const { events } = buildPayload(
    ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06"].map(
      (date, i) => ({
        date, game: "G",
        seats: [["Ann", i === 3 ? 2 : 1, 5, i !== 3], ["Bob", i === 3 ? 1 : 2, -5, i === 3]],
      }),
    ),
  );

  test("form is the last five results, oldest first", () => {
    const extras = profileExtrasAsOf(events, ["Ann", "Bob"], "2026-01-06");
    // Ann: W W W L W W → last five: W W L W W
    assert.deepEqual(extras.Ann.form, [true, true, false, true, true]);
  });

  test("respects the as-of date", () => {
    const extras = profileExtrasAsOf(events, ["Ann", "Bob"], "2026-01-02");
    assert.deepEqual(extras.Ann.form, [true, true]);
  });
});
