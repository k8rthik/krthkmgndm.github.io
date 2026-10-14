import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decodeStore } from "../lib/devlogStore.js";

const b64 = (s) => Buffer.from(s, "utf-8").toString("base64");

describe("decodeStore", () => {
  test("decodes a base64 JSON array of entries", () => {
    const entries = [{ id: "20260101-ab12", date: "2026-01-01", text: "hi" }];
    assert.deepEqual(decodeStore(b64(JSON.stringify(entries))), entries);
  });

  test("an empty array is a valid (empty) store", () => {
    assert.deepEqual(decodeStore(b64("[]")), []);
  });

  // The old reader treated these as [], so the next "add" committed a file
  // holding only the new entry — silently wiping the log. They must throw.
  test("corrupt JSON throws instead of reading as empty", () => {
    assert.throws(() => decodeStore(b64("[{ broken")), /not valid JSON/);
  });

  test("valid JSON that is not an array throws", () => {
    assert.throws(() => decodeStore(b64('{"entries": []}')), /not an array/);
  });
});
