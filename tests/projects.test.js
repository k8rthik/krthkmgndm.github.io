// Fixture tests for project link rendering,
// plus invariants on the real projects.json. Expectations are written out by
// hand from the fixtures, not derived by re-running the production code.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectLinks, isValidHref } from "../lib/projectLinks.js";

describe("isValidHref", () => {
  test("accepts site-relative paths and https urls", () => {
    assert.equal(isValidHref("/openbsl"), true);
    assert.equal(isValidHref("/post/bgelo"), true);
    assert.equal(isValidHref("https://github.com/k8rthik/openbsl"), true);
  });

  test("rejects placeholders, empties and anything that isn't a destination", () => {
    // "#" is exactly what dr.optimus carried as its code link
    for (const bad of ["#", "", "   ", undefined, null, 42, "//evil.test", "javascript:alert(1)", "http://x.test", "github.com/x"]) {
      assert.equal(isValidHref(bad), false, `expected ${JSON.stringify(bad)} to be rejected`);
    }
  });
});

describe("projectLinks", () => {
  test("a project with no links array has no links", () => {
    assert.deepEqual(projectLinks({ name: "x" }), []);
  });

  test("invalid entries inside an explicit array are dropped", () => {
    const p = {
      links: [
        { label: "demo", href: "#" },
        { label: "", href: "/x" },
        { label: "code", href: "https://x.test/c" },
        null,
      ],
    };
    assert.deepEqual(projectLinks(p), [{ label: "code", href: "https://x.test/c" }]);
  });
});

describe("projects.json", () => {
  const projects = JSON.parse(fs.readFileSync(new URL("../content/projects.json", import.meta.url), "utf-8"));

  test("every project carries an explicit links array of valid links", () => {
    // explicit arrays stop projectLinks from recreating a stale demo/code pair
    for (const p of projects) {
      assert.ok(Array.isArray(p.links), `${p.name} needs an explicit links array`);
      assert.equal(p.demo, undefined, `${p.name}: move demo into links`);
      assert.equal(p.code, undefined, `${p.name}: move code into links`);
      for (const l of p.links) {
        assert.ok(isValidHref(l.href), `${p.name}: invalid href ${JSON.stringify(l.href)}`);
        assert.ok(typeof l.label === "string" && l.label.trim(), `${p.name}: link without a label`);
      }
    }
  });

  test("no links to the /demos/ pages, which 404", () => {
    for (const p of projects) {
      for (const l of p.links) assert.ok(!l.href.includes("/demos/"), `${p.name}: ${l.href}`);
    }
  });
});
