import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readJsonFile } from "../lib/readJson.js";

let dir;
const write = (name, text) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, text);
  return p;
};

before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "readjson-")); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("readJsonFile", () => {
  test("returns the parsed payload when every check passes", () => {
    const p = write("ok.json", '{"meta": {}, "rows": [1]}');
    assert.deepEqual(readJsonFile(p, { requiredKeys: ["meta", "rows"], nonEmpty: ["rows"] }), {
      meta: {},
      rows: [1],
    });
  });

  test("a missing file names the file and carries the regeneration hint", () => {
    assert.throws(
      () => readJsonFile(path.join(dir, "nope.json"), { hint: "run the exporter" }),
      (err) => err.message.includes("nope.json") && err.message.includes("run the exporter"),
    );
  });

  test("invalid JSON names the file instead of a bare SyntaxError", () => {
    const p = write("bad.json", "{ nope");
    assert.throws(() => readJsonFile(p), /bad\.json is not valid JSON/);
  });

  test("lists every missing required key", () => {
    const p = write("keys.json", '{"meta": {}}');
    assert.throws(
      () => readJsonFile(p, { requiredKeys: ["meta", "rows", "cols"] }),
      /keys\.json is missing keys: rows, cols/,
    );
  });

  test("an empty or non-array nonEmpty key fails", () => {
    const empty = write("empty.json", '{"rows": []}');
    assert.throws(() => readJsonFile(empty, { nonEmpty: ["rows"] }), /empty\.json has no rows/);
    const notArray = write("obj.json", '{"rows": {}}');
    assert.throws(() => readJsonFile(notArray, { nonEmpty: ["rows"] }), /obj\.json has no rows/);
  });
});
