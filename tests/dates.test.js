import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseLocalDate, formatPostDate } from "../lib/dates.js";

describe("parseLocalDate", () => {
  test("a date-only string is that local calendar day, not UTC midnight", () => {
    const d = parseLocalDate("2026-07-10");
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2026, 6, 10]);
  });
});

describe("formatPostDate", () => {
  test("short month, day, year in a fixed locale", () => {
    assert.equal(formatPostDate("2026-08-03"), "Aug 3, 2026");
  });

  test("the first of the month stays on the first in every timezone", () => {
    assert.equal(formatPostDate("2026-01-01"), "Jan 1, 2026");
  });
});
