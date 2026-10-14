// Hand-computed tests for the shared numeric helpers.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { slope } from "../components/elo/stats.js";

describe("slope", () => {
  test("least-squares slope against index 0, 1, 2, …", () => {
    // a perfect line: 8, 10, 12 rises 2 per step
    assert.equal(slope([8, 10, 12]), 2);
    // ys 1, 3, 2, 6 with xs 0..3: x̄ 1.5, ȳ 3
    // cov = (-1.5)(-2) + (-0.5)(0) + (0.5)(-1) + (1.5)(3) = 3 + 0 - 0.5 + 4.5 = 7
    // var = 2.25 + 0.25 + 0.25 + 2.25 = 5 → slope 7/5 = 1.4
    assert.ok(Math.abs(slope([1, 3, 2, 6]) - 1.4) < 1e-12);
  });

  test("flat and falling series", () => {
    assert.equal(slope([5, 5, 5]), 0);
    assert.equal(slope([12, 10, 8]), -2);
  });

  test("fewer than two points has no slope", () => {
    assert.equal(slope([7]), null);
    assert.equal(slope([]), null);
  });
});
