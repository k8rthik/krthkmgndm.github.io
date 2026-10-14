import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { compareEntries } from "../lib/devlogSchema.js";

describe("compareEntries", () => {
  test("newest date first", () => {
    const sorted = [
      { id: "a", date: "2026-07-01" },
      { id: "b", date: "2026-07-16" },
    ].toSorted(compareEntries);
    assert.deepEqual(sorted.map((e) => e.id), ["b", "a"]);
  });

  // ids are "<yyyymmdd>-<rand>", so same-day entries fall back to a stable,
  // descending id order — the server and the client editor must agree on it
  test("same-day entries break the tie by id, descending", () => {
    const sorted = [
      { id: "20260716-aaaa", date: "2026-07-16" },
      { id: "20260716-ffff", date: "2026-07-16" },
    ].toSorted(compareEntries);
    assert.deepEqual(sorted.map((e) => e.id), ["20260716-ffff", "20260716-aaaa"]);
  });
});
