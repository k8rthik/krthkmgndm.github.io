import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { num, signed, usd, pct } from "../lib/format.js";

describe("num", () => {
  test("fixed decimals with thousands separators", () => {
    assert.equal(num(1234.5), "1,235");
    assert.equal(num(1234.5, 1), "1,234.5");
    assert.equal(num(0.5, 2), "0.50");
  });
});

describe("signed", () => {
  test("a plus on zero and positives, the minus from the number itself", () => {
    assert.equal(signed(12), "+12");
    assert.equal(signed(0), "+0");
    assert.equal(signed(-3.25, 1), "-3.3"); // toLocaleString rounds half away from zero here
  });
});

describe("usd", () => {
  test("whole dollars by default, with separators — the scarcity cap reads $5,000", () => {
    assert.equal(usd(5000), "$5,000");
  });

  test("cents when asked, separators kept", () => {
    assert.equal(usd(1234.5, 2), "$1,234.50");
  });

  test("a true minus sign before the dollar sign", () => {
    assert.equal(usd(-8), "−$8");
    assert.equal(usd(-5.5, 2), "−$5.50");
  });

  test("null and undefined render as an en dash, not $NaN", () => {
    assert.equal(usd(null), "–");
    assert.equal(usd(undefined, 2), "–");
  });
});

describe("pct", () => {
  test("a ratio as a percent", () => {
    assert.equal(pct(0.564), "56%");
    assert.equal(pct(1.2346, 1), "123.5%"); // 123.46 → one decimal
  });

  test("null renders as an en dash", () => {
    assert.equal(pct(null), "–");
  });
});
