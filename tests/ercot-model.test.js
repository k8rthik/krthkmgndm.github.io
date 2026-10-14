// Tests for the small pure pieces around the nodal-price model: the slider
// mapping, the map shading, the matrix inverse and must-run nuclear. Expectations are worked by hand in
// the comments.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  SLIDER_MAX, homesFromSlider, sliderFromHomes,
} from "../components/ercot/format.js";
import {
  SHADE_NEUTRAL, SPREAD_FLOOR, CONGESTION_EPS, shade, priceSpread, congestionTone,
} from "../components/ercot/shade.js";
import { invert } from "../components/ercot/linalg.js";
import {
  DEFAULTS, NUCLEAR_AVAILABILITY, mustRun,
} from "../components/ercot/engine.js";
import { BUS_INDEX } from "../components/ercot/grid.js";
import { DAYS } from "../components/ercot/days.js";

const close = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) < tol, `${msg ?? ""} ${a} != ${b} (tol ${tol})`);

describe("homes slider", () => {
  const MAX = 1e6; // 100x the 10,000-home floor, so the powers come out clean

  test("the ends map to nothing, the floor and the cap", () => {
    assert.equal(homesFromSlider(0, MAX), 0);
    assert.equal(homesFromSlider(1, MAX), 10000);
    assert.equal(homesFromSlider(SLIDER_MAX, MAX), MAX);
    assert.equal(sliderFromHomes(0, MAX), 0);
    assert.equal(sliderFromHomes(10000, MAX), 1);
    assert.equal(sliderFromHomes(MAX, MAX), SLIDER_MAX);
  });

  test("positions between are log-spaced", () => {
    // Positions 1..1000 span 999 steps. Position 334 is a third of the way:
    // 10,000 x 100^(1/3) = 10,000 x 4.6415888 = 46,415.9 -> 46,416.
    // Position 667 is two thirds: 10,000 x 21.544347 = 215,443.
    assert.equal(homesFromSlider(334, MAX), 46416);
    assert.equal(homesFromSlider(667, MAX), 215443);
  });

  test("every slider position survives a round trip through homes", () => {
    for (const max of [MAX, 8e6]) {
      for (let v = 0; v <= SLIDER_MAX; v++) {
        assert.equal(sliderFromHomes(homesFromSlider(v, max), max), v, `position ${v}, cap ${max}`);
      }
    }
  });
});

describe("network map shading", () => {
  // spread 100 around lambda 20, so t = (v - 20) / 100 lands exactly on the
  // thresholds with integer prices.
  const at = (v) => shade(v, 20, 100);

  test("within the neutral band a bus is unshaded", () => {
    assert.equal(SHADE_NEUTRAL, 0.06);
    assert.deepEqual(at(20), { tone: "neutral", op: 1 });
    assert.deepEqual(at(25), { tone: "neutral", op: 1 });   // t = .05
    assert.deepEqual(at(15), { tone: "neutral", op: 1 });   // t = -.05
  });

  test("steps up at .06, .34 and .70 either side of lambda", () => {
    assert.deepEqual(at(26), { tone: "hi", op: 0.3 });      // t = .06, first step
    assert.deepEqual(at(53), { tone: "hi", op: 0.3 });      // t = .33
    assert.deepEqual(at(54), { tone: "hi", op: 0.62 });     // t = .34
    assert.deepEqual(at(89), { tone: "hi", op: 0.62 });     // t = .69
    assert.deepEqual(at(90), { tone: "hi", op: 1 });        // t = .70
    assert.deepEqual(at(-50), { tone: "lo", op: 1 });       // t = -.70
    assert.deepEqual(at(14), { tone: "lo", op: 0.3 });      // t = -.06
  });

  test("prices beyond the spread clamp to the darkest step", () => {
    assert.deepEqual(at(5000), { tone: "hi", op: 1 });
    assert.deepEqual(at(-251), { tone: "lo", op: 1 });
  });

  test("the spread is the widest gap to lambda, floored", () => {
    assert.equal(SPREAD_FLOOR, 6);
    // gaps 0, 1, 5 are all under the floor of 6
    assert.equal(priceSpread([20, 21, 25], 20), 6);
    // gaps 10 and 12 -> 12
    assert.equal(priceSpread([10, 32], 20), 12);
  });
});

describe("congestion tone", () => {
  test("components inside half a cent read as none", () => {
    assert.equal(CONGESTION_EPS, 0.005);
    assert.equal(congestionTone(0), null);
    assert.equal(congestionTone(0.004), null);
    assert.equal(congestionTone(-0.004), null);
  });

  test("at and past the threshold the sign picks the tone", () => {
    assert.equal(congestionTone(0.005), "hi");
    assert.equal(congestionTone(-0.005), "lo");
    assert.equal(congestionTone(-12.5), "lo");
  });
});

describe("matrix inverse", () => {
  test("2x2 by the adjugate", () => {
    // [[4,7],[2,6]]: det = 24 - 14 = 10, inverse = [[6,-7],[-2,4]] / 10
    const inv = invert([Float64Array.from([4, 7]), Float64Array.from([2, 6])]);
    const want = [[0.6, -0.7], [-0.2, 0.4]];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) close(inv[i][j], want[i][j], 1e-12, `${i},${j}`);
  });

  test("3x3 that needs a row swap, and leaves its input alone", () => {
    // A swaps the first two coordinates and doubles the third. A zero on the
    // leading diagonal forces a pivot; the inverse swaps back and halves.
    const A = [Float64Array.from([0, 1, 0]), Float64Array.from([1, 0, 0]), Float64Array.from([0, 0, 2])];
    const inv = invert(A);
    const want = [[0, 1, 0], [1, 0, 0], [0, 0, 0.5]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(inv[i][j], want[i][j], 1e-12, `${i},${j}`);
    assert.deepEqual(Array.from(A[0]), [0, 1, 0], "input mutated");
  });
});

describe("must-run nuclear", () => {
  test("every bus runs its nuclear at the fleet availability, whatever the day", () => {
    assert.equal(NUCLEAR_AVAILABILITY, 0.95);
    const m = mustRun();
    // NDFW 2,400 MW x .95 = 2,280; SRGV 2,570 x .95 = 2,441.5; no nuclear elsewhere
    close(m[BUS_INDEX.NDFW], 2280, 1e-9, "NDFW");
    close(m[BUS_INDEX.SRGV], 2441.5, 1e-9, "SRGV");
    assert.equal(m[BUS_INDEX.PANH], 0);
  });
});

describe("defaults", () => {
  test("the model opens on a day that exists", () => {
    assert.ok(DAYS[DEFAULTS.day], DEFAULTS.day);
  });
});
