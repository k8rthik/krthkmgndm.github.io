// Fixture tests for project link rendering and the selected-work split,
// plus invariants on the real projects.json. Expectations are written out by
// hand from the fixtures, not derived by re-running the production code.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectLinks, isValidHref } from "../lib/projectLinks.js";
import { selectedWork, archiveProjects } from "../lib/selectedWork.js";

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
  test("an explicit links array wins over demo/code fields", () => {
    const p = { demo: "https://x.test/d", code: "https://x.test/c", links: [{ label: "model", href: "/m" }] };
    assert.deepEqual(projectLinks(p), [{ label: "model", href: "/m" }]);
  });

  test("an explicit empty array means no links, not the default pair", () => {
    const p = { demo: "https://x.test/d", code: "https://x.test/c", links: [] };
    assert.deepEqual(projectLinks(p), []);
  });

  test("the default demo/code pair only keeps members that are valid", () => {
    // demo valid, code is the "#" placeholder → one link survives
    assert.deepEqual(projectLinks({ demo: "https://x.test/d", code: "#" }), [
      { label: "demo", href: "https://x.test/d" },
    ]);
    // neither field present → nothing, rather than two undefined hrefs
    assert.deepEqual(projectLinks({}), []);
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

const fixture = [
  { name: "Archive A", active: true, links: [] },
  { name: "Second", active: true, featured: 2, teaser: "t2", links: [{ label: "demo", href: "https://x.test/2" }] },
  { name: "First", active: true, featured: 1, teaser: "t1", links: [{ label: "demo", href: "/1" }] },
  { name: "Inactive Featured", active: false, featured: 3, teaser: "t3", links: [{ label: "demo", href: "/3" }] },
  { name: "No Teaser", active: true, featured: 4, links: [{ label: "demo", href: "/4" }] },
  { name: "No Proof", active: true, featured: 5, teaser: "t5", links: [{ label: "code", href: "#" }] },
];

describe("selectedWork", () => {
  test("orders by featured rank, not file order", () => {
    assert.deepEqual(selectedWork(fixture).map((p) => p.name), ["First", "Second"]);
  });

  test("a featured project needs to be active, have a teaser and have a valid link", () => {
    // Inactive Featured, No Teaser and No Proof are all ranked but must be absent
    const names = selectedWork(fixture).map((p) => p.name);
    assert.ok(!names.includes("Inactive Featured"));
    assert.ok(!names.includes("No Teaser"));
    assert.ok(!names.includes("No Proof"));
  });

  test("empty and missing input give an empty list", () => {
    assert.deepEqual(selectedWork([]), []);
    assert.deepEqual(selectedWork(undefined), []);
  });
});

describe("archiveProjects", () => {
  test("keeps active projects that are not shown as selected work, in file order", () => {
    // First and Second are selected; Inactive Featured is inactive;
    // No Teaser and No Proof failed selection, so they fall back to the archive
    assert.deepEqual(archiveProjects(fixture).map((p) => p.name), ["Archive A", "No Teaser", "No Proof"]);
  });
});

describe("projects.json", () => {
  const projects = JSON.parse(fs.readFileSync(new URL("../projects.json", import.meta.url), "utf-8"));

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

  test("selected work leads with openbsl and has two or three entries", () => {
    const selected = selectedWork(projects);
    assert.equal(selected[0]?.name, "openbsl");
    assert.ok(selected.length >= 2 && selected.length <= 3, `got ${selected.length}`);
  });

  test("featured ranks are unique", () => {
    const ranks = projects.filter((p) => p.featured != null).map((p) => p.featured);
    assert.equal(new Set(ranks).size, ranks.length);
  });
});
