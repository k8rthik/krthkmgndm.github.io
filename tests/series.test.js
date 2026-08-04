// Fixture-based tests for the chart-series derivations. Every expected
// value is hand-computed from the fixture — if a test needs the
// production code to derive its expectation, it tests nothing.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { preGameSeries, eventSpanAt } from "../components/elo/series.js";

// Four pod games back-to-back on the playtime axis:
//   G1 spans 0–1, G2 spans 1–2, G3 spans 2–3, G4 spans 3–4.
const events = [
  { h: 1, game: "G1" },
  { h: 2, game: "G2" },
  { h: 3, game: "G3" },
  { h: 4, game: "G4" },
];

describe("preGameSeries", () => {
  // Payload series record the POST-game rating at each play's END time.
  // Ann plays G1 (+80 → 1080), G2 (+40 → 1120), skips G3, plays G4
  // (-10 → 1110). Bob's only play is G3 (-30 → 970).
  const payload = {
    Ann: [[0, 1000], [1, 1080], [2, 1120], [4, 1110]],
    Bob: [[0, 1000], [3, 970]],
  };

  test("each play sits at its game's start with the rating carried in", () => {
    const out = preGameSeries(payload, events);
    // Ann entered G1 (starts 0) at 1000 — coincides with the anchor —
    // G2 (starts 1) at 1080, G4 (starts 3) at 1120
    assert.deepEqual(out.Ann.slice(0, 3), [
      [0, 1000],
      [1, 1080],
      [3, 1120],
    ]);
  });

  test("closes at the last play's end with the career rating", () => {
    const out = preGameSeries(payload, events);
    // Ann's G4 ends at h=4 having landed her at 1110, so her G4 delta
    // renders across G4's own 3–4 span and the line ends at career elo
    assert.deepEqual(out.Ann[out.Ann.length - 1], [4, 1110]);
    assert.equal(out.Ann.length, 4);
  });

  test("idle players stay flat until their first game starts", () => {
    const out = preGameSeries(payload, events);
    // Bob sat at 1000 through G1–G2; his G3 starts at h=2, ends at h=3
    assert.deepEqual(out.Bob, [
      [0, 1000],
      [2, 1000],
      [3, 970],
    ]);
  });

  test("an anchor-only series passes through unchanged", () => {
    const out = preGameSeries({ New: [[0, 1000]] }, events);
    assert.deepEqual(out.New, [[0, 1000]]);
  });

  test("a series point matching no event fails fast", () => {
    assert.throws(
      () => preGameSeries({ Ghost: [[0, 1000], [9, 950]] }, events),
      /Ghost.*h=9/,
    );
  });

  test("never mutates the input series", () => {
    const snapshot = JSON.parse(JSON.stringify(payload));
    preGameSeries(payload, events);
    assert.deepEqual(payload, snapshot);
  });
});

describe("eventSpanAt", () => {
  test("returns the game whose span contains the cursor", () => {
    assert.deepEqual(eventSpanAt(events, 0.5), {
      event: events[0], start: 0, end: 1,
    });
    assert.deepEqual(eventSpanAt(events, 2.4), {
      event: events[2], start: 2, end: 3,
    });
  });

  test("the far-left edge belongs to the very first game", () => {
    assert.deepEqual(eventSpanAt(events, 0), {
      event: events[0], start: 0, end: 1,
    });
  });

  test("an exact game-end boundary belongs to that game", () => {
    assert.deepEqual(eventSpanAt(events, 2), {
      event: events[1], start: 1, end: 2,
    });
  });

  test("cursor past the last game clamps to the last game", () => {
    assert.deepEqual(eventSpanAt(events, 4.5), {
      event: events[3], start: 3, end: 4,
    });
  });

  test("returns null with no events", () => {
    assert.equal(eventSpanAt([], 1), null);
  });
});
