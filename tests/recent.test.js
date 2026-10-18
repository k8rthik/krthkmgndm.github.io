// Fixture tests for the homepage's newest-projects list. Expectations are
// written out by hand from the fixtures below, not derived by re-running the
// production sort.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { latestProjects } from "../lib/recent.js";

const projects = [
  // ordered the way projects.json is: by prominence, not by date
  { name: "Undated Flagship", active: true },
  { name: "Middle", active: true, added: "2026-05-01" },
  { name: "Newest", active: true, added: "2026-09-18" },
  { name: "Archived", active: false, added: "2026-09-30" },
  { name: "Oldest", active: true, added: "2026-01-02" },
];

describe("latestProjects", () => {
  test("takes the three newest active projects by added date", () => {
    // active dated, newest first: Newest (09-18), Middle (05-01), Oldest (01-02)
    assert.deepEqual(latestProjects(projects).map((p) => p.name), ["Newest", "Middle", "Oldest"]);
  });

  test("an undated project sorts after every dated one", () => {
    // Undated Flagship is first in the file but only fills the fourth slot
    assert.deepEqual(latestProjects(projects, 4).map((p) => p.name), [
      "Newest", "Middle", "Oldest", "Undated Flagship",
    ]);
  });

  test("archived projects are left out even with the newest date", () => {
    assert.ok(!latestProjects(projects, 10).some((p) => p.name === "Archived"));
    assert.equal(latestProjects(projects, 10).length, 4);
  });

  test("a same-day tie keeps projects.json order", () => {
    const tied = [
      { name: "Beta", active: true, added: "2026-09-18" },
      { name: "Alpha", active: true, added: "2026-09-18" },
    ];
    assert.deepEqual(latestProjects(tied).map((p) => p.name), ["Beta", "Alpha"]);
  });

  test("empty and missing input give an empty list", () => {
    assert.deepEqual(latestProjects([]), []);
    assert.deepEqual(latestProjects(undefined), []);
  });
});
