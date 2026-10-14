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
  playerHistoryAsOf,
  NEMESIS_MIN_MEETINGS,
  FORM_LEN,
  START_ELO,
  SIGNATURE_MIN_PLAYS,
} from "../components/elo/insights.js";
import { affinityAsOf } from "../components/elo/asOf.js";
import { buildPayload } from "./helpers.js";

const row = (rows, label) => rows.find((r) => r.label === label);

describe("recordsAsOf", () => {
  // Ann: W W W L W · Bob: L L L L L (three 2nds) · Cat: L L L W
  const { events, series } = buildPayload([
    { date: "2026-01-01", game: "G1", seats: [["Ann", 1, 80, true, 10], ["Bob", 2, -30, false, 8], ["Cat", 3, -50, false, 6]] },
    { date: "2026-01-01", game: "G2", seats: [["Ann", 1, 40, true], ["Bob", 2, -20, false], ["Cat", 3, -20, false]] },
    { date: "2026-01-08", game: "G1", seats: [["Ann", 1, 30, true, 12], ["Cat", 2, -10, false, 9], ["Bob", 3, -20, false, 5]] },
    { date: "2026-01-15", game: "G1", seats: [["Cat", 1, 70, true, 14], ["Ann", 2, -40, false, 13], ["Bob", 3, -30, false, 4]] },
    { date: "2026-01-22", game: "G2", seats: [["Ann", 1, 25, true], ["Bob", 2, -25, false]] },
  ]);
  const core = ["Ann", "Bob", "Cat"];
  const rows = recordsAsOf(events, series, core, "2026-01-22");

  test("apex: highest rating ever reached", () => {
    // Ann's post-play ratings: 1080, 1120, 1150, 1110, 1135 — peak 1150
    assert.deepEqual(row(rows, "apex"), {
      label: "apex", holder: "Ann", value: "1,150", detail: "highest peak elo",
    });
  });

  test("heater: longest win streak", () => {
    // Ann wins events 1–3, loses 4: streak of 3
    assert.deepEqual(row(rows, "heater"), {
      label: "heater", holder: "Ann", value: "3 W", detail: "longest win streak",
    });
  });

  test("cursed: longest loss streak", () => {
    // Bob loses all five games
    assert.deepEqual(row(rows, "cursed"), {
      label: "cursed", holder: "Bob", value: "5 L", detail: "longest losing streak",
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
      label: "cursed", holder: "Cat", value: "3 L", detail: "longest losing streak",
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
      sessions([[8, 8, 8], [10, 10, 10], [12, 12, 12]]),
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
  // cells as affinityAsOf builds them: plays, wins (official won flags),
  // and the career elo delta — which must NOT drive the pick (rule 1)
  const cell = (plays, wins, delta = 0) => ({ plays, wins, delta });

  test("the floor is 3 plays: exactly 3 qualifies, 2 does not", () => {
    assert.equal(SIGNATURE_MIN_PLAYS, 3);
    // Two is 2-for-2 (100%) but under the floor; Three is 1-for-3
    assert.deepEqual(
      signatureGame({ Two: cell(2, 2), Three: cell(3, 1) }),
      { game: "Three", wins: 1, plays: 3, rate: 1 / 3 },
    );
  });

  test("ranks by win rate, ignoring the elo delta", () => {
    // Swingy: 1-for-4 (25%) with a huge early delta · Steady: 3-for-4 (75%)
    assert.deepEqual(
      signatureGame({ Swingy: cell(4, 1, 500), Steady: cell(4, 3, -10) }),
      { game: "Steady", wins: 3, plays: 4, rate: 0.75 },
    );
  });

  test("equal rates break toward more plays, then by name", () => {
    // A 2-for-3 and B 4-for-6 are both 2/3 — B has the larger sample
    assert.equal(signatureGame({ A: cell(3, 2), B: cell(6, 4) }).game, "B");
    // same rate and plays: alphabetical, whatever the key order
    assert.equal(signatureGame({ Zeta: cell(4, 2), Alpha: cell(4, 2) }).game, "Alpha");
  });

  test("a winless game is never a signature, however often it was played", () => {
    // Grind: 0-for-5 clears the play floor but has no win to its name
    assert.equal(signatureGame({ Grind: cell(5, 0) }), null);
    // with a 1-for-3 alongside it, the 1-for-3 is the signature
    assert.equal(signatureGame({ Grind: cell(5, 0), Once: cell(3, 1) }).game, "Once");
  });

  test("absent (null) when no game reaches the floor — no fallback", () => {
    assert.equal(signatureGame({ A: cell(2, 2), B: cell(1, 1) }), null);
    assert.equal(signatureGame({}), null);
    assert.equal(signatureGame(undefined), null);
  });

  test("wins follow the official won flag through ties and shared wins", () => {
    // G three times: Ann wins outright; a full tie (nobody flagged);
    // a broken tie where BG Stats flags both Ann and Bob. Ann: 2 of 3.
    const { events } = buildPayload([
      { date: "2026-01-01", game: "G", seats: [["Ann", 1, 5], ["Bob", 2, -5]] },
      { date: "2026-01-08", game: "G", seats: [["Ann", 1, 0, false], ["Bob", 1, 0, false]] },
      { date: "2026-01-15", game: "G", seats: [["Ann", 1, 0, true], ["Bob", 2, 0, true]] },
    ]);
    const { perGame } = affinityAsOf(events, ["Ann", "Bob"], "2026-01-15");
    assert.deepEqual(signatureGame(perGame.Ann), { game: "G", wins: 2, plays: 3, rate: 2 / 3 });
    // Bob: only the shared win — 1 of 3
    assert.deepEqual(signatureGame(perGame.Bob), { game: "G", wins: 1, plays: 3, rate: 1 / 3 });
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

  test("absent (null) when nobody clears the floor — losing 0-1 once isn't a nemesis", () => {
    // X: 2 meetings, Y: 1 — both under 3, so no row rather than a fallback
    assert.equal(nemesis({ X: { w: 1, l: 1, t: 0 }, Y: { w: 0, l: 1, t: 0 } }), null);
  });

  test("exactly NEMESIS_MIN_MEETINGS meetings qualifies, ties included", () => {
    // 0 wins, 2 losses, 1 tie = 3 meetings, share (0 + 0.5) / 3 = 1/6
    assert.equal(nemesis({ X: { w: 0, l: 2, t: 1 } }).opp, "X");
  });

  test("equal shares break toward more meetings", () => {
    const nem = nemesis({
      X: { w: 2, l: 2, t: 0 }, // share 0.5, 4 meetings
      Y: { w: 3, l: 3, t: 0 }, // share 0.5, 6 meetings
    });
    assert.equal(nem.opp, "Y");
  });

  test("the meetings floor is 3, inclusive", () => {
    assert.equal(NEMESIS_MIN_MEETINGS, 3);
    // X: exactly 3 meetings, share 1/3 — clears the floor and is chosen
    // over Y's worse share (0) from only 2 meetings
    assert.equal(nemesis({ X: { w: 1, l: 2, t: 0 }, Y: { w: 0, l: 2, t: 0 } }).opp, "X");
  });

  test("ties count half toward win share", () => {
    // X: (1 + 0.5 × 2) / 4 = 0.5 · Y: 1/3 — Y is the nemesis
    assert.equal(nemesis({ X: { w: 1, l: 1, t: 2 }, Y: { w: 1, l: 2, t: 0 } }).opp, "Y");
  });

  test("returns null with no opponents", () => {
    assert.equal(nemesis({}), null);
    assert.equal(nemesis(undefined), null);
  });
});

test("START_ELO is the series anchor", () => {
  assert.equal(START_ELO, 1000);
});

describe("playerHistoryAsOf", () => {
  const { events } = buildPayload([
    { date: "2026-01-01", game: "G1", seats: [["Ann", 1, 80, true, 10], ["Bob", 2, -30, false], ["Cat", 3, -50, false]] },
    { date: "2026-01-01", game: "G2", seats: [["Ann", 1, 40, true], ["Bob", 2, -20, false]] },
    { date: "2026-01-08", game: "G1", seats: [["Cat", 1, 70, true], ["Ann", 2, -40, false, 13]] },
    { date: "2026-01-15", game: "G3", seats: [["Bob", 1, 25, true], ["Cat", 2, -25, false]] },
  ]);

  test("newest first, with running elo from cumulative deltas", () => {
    // Ann: 1000 +80 → 1080, +40 → 1120, -40 → 1080; an unscored seat
    // stays null
    assert.deepEqual(playerHistoryAsOf(events, "Ann", "2026-01-15"), [
      { date: "2026-01-08", game: "G1", rank: 2, seats: 2, won: false, score: 13, delta: -40, elo: 1080 },
      { date: "2026-01-01", game: "G2", rank: 1, seats: 2, won: true, score: null, delta: 40, elo: 1120 },
      { date: "2026-01-01", game: "G1", rank: 1, seats: 3, won: true, score: 10, delta: 80, elo: 1080 },
    ]);
  });

  test("skips events the player didn't sit in", () => {
    // Bob missed the 01-08 game; his elo runs 970 → 950 → 975
    assert.deepEqual(
      playerHistoryAsOf(events, "Bob", "2026-01-15").map((p) => [p.date, p.elo]),
      [["2026-01-15", 975], ["2026-01-01", 950], ["2026-01-01", 970]],
    );
  });

  test("the as-of date excludes later events", () => {
    assert.deepEqual(
      playerHistoryAsOf(events, "Cat", "2026-01-08").map((p) => p.date),
      ["2026-01-08", "2026-01-01"],
    );
  });

  test("a player with no plays yields an empty history", () => {
    assert.deepEqual(playerHistoryAsOf(events, "Zoe", "2026-01-15"), []);
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

  test("form length is 5: exactly five results show all five", () => {
    assert.equal(FORM_LEN, 5);
    const extras = profileExtrasAsOf(events, ["Ann", "Bob"], "2026-01-05");
    // Ann's first five: W W W L W
    assert.deepEqual(extras.Ann.form, [true, true, true, false, true]);
  });

  test("respects the as-of date", () => {
    const extras = profileExtrasAsOf(events, ["Ann", "Bob"], "2026-01-02");
    assert.deepEqual(extras.Ann.form, [true, true]);
  });
});
