import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseLocalDate, formatPostDate, formatRelative, toISODate, dottedDate } from "../lib/dates.js";

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

describe("formatRelative", () => {
  const now = new Date("2026-10-14T12:00:00Z").getTime();
  const ago = (ms) => new Date(now - ms).toISOString();
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  test("under a minute still reads as 1m, never 0m", () => {
    assert.equal(formatRelative(ago(10_000), now), "1m ago");
  });

  test("minutes up to the hour boundary", () => {
    assert.equal(formatRelative(ago(59 * MIN), now), "59m ago");
    assert.equal(formatRelative(ago(HOUR), now), "1h ago");
  });

  test("hours up to the day boundary", () => {
    assert.equal(formatRelative(ago(23 * HOUR + 59 * MIN), now), "23h ago");
    assert.equal(formatRelative(ago(DAY), now), "1d ago");
  });

  test("days floor rather than round", () => {
    assert.equal(formatRelative(ago(2 * DAY + 23 * HOUR), now), "2d ago");
  });

  test("a timestamp in the future clamps to 1m rather than going negative", () => {
    assert.equal(formatRelative(new Date(now + HOUR).toISOString(), now), "1m ago");
  });
});

describe("toISODate", () => {
  test("pads month and day from the local calendar", () => {
    assert.equal(toISODate(new Date(2026, 0, 5)), "2026-01-05");
    assert.equal(toISODate(new Date(2026, 11, 31)), "2026-12-31");
  });
});

describe("dottedDate", () => {
  test("2026-07-16 reads as 2026.07.16", () => {
    assert.equal(dottedDate("2026-07-16"), "2026.07.16");
  });

  test("non-strings pass through untouched", () => {
    assert.equal(dottedDate(undefined), undefined);
  });
});
