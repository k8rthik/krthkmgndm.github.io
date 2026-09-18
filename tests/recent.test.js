// Fixture tests for the "recently:" line. Expectations are written out by
// hand from the fixtures below, not derived by re-running the production sort.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { recentItems } from "../lib/recent.js";

const projects = [
  // ordered the way projects.json is: by prominence, not by date
  { name: "Old Flagship", active: true, demo: "https://x.test/flagship" },
  { name: "Dated Middle", active: true, added: "2026-05-01", links: [{ label: "model", href: "/middle" }] },
  { name: "Dated Newest", active: true, added: "2026-09-18", links: [{ label: "model", href: "/newest" }] },
  { name: "Archived", active: false, added: "2026-09-30", links: [{ label: "model", href: "/archived" }] },
];

const posts = [
  { title: "Newest Post", slug: "newest-post", date: "2026-08-03", active: 1 },
  { title: "Older Post", slug: "older-post", date: "2026-02-14", active: 1 },
  { title: "Hidden Post", slug: "hidden", date: "2026-09-25", active: 0 },
];

describe("recentItems", () => {
  test("takes the two newest across both lists", () => {
    // dated candidates, newest first: Dated Newest (09-18), Newest Post
    // (08-03), Dated Middle (05-01), Older Post (02-14)
    const out = recentItems(projects, posts);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map((i) => i.label), ["Dated Newest", "Newest Post"]);
    assert.deepEqual(out.map((i) => i.href), ["/newest", "/post/newest-post"]);
    assert.deepEqual(out.map((i) => i.kind), ["project", "post"]);
  });

  test("an undated project never appears, however high it sits in the list", () => {
    // Old Flagship is first in projects.json and still must not show up:
    // its position records prominence, which says nothing about when it landed
    const out = recentItems(projects, posts, 4);
    assert.ok(!out.some((i) => i.label === "Old Flagship"));
    assert.deepEqual(out.map((i) => i.label), [
      "Dated Newest", "Newest Post", "Dated Middle", "Older Post",
    ]);
  });

  test("archived projects and inactive posts are left out", () => {
    // both carry the newest dates in the fixture and both are excluded
    const out = recentItems(projects, posts, 10);
    assert.ok(!out.some((i) => i.label === "Archived"));
    assert.ok(!out.some((i) => i.label === "Hidden Post"));
    assert.equal(out.length, 4);
  });

  test("the limit is respected and defaults to two", () => {
    assert.equal(recentItems(projects, posts).length, 2);
    assert.equal(recentItems(projects, posts, 1).length, 1);
    assert.deepEqual(recentItems(projects, posts, 1).map((i) => i.label), ["Dated Newest"]);
  });

  test("a same-day tie breaks by label, so the order never wobbles", () => {
    const tied = [
      { name: "Beta", active: true, added: "2026-09-18", links: [{ label: "model", href: "/b" }] },
      { name: "Alpha", active: true, added: "2026-09-18", links: [{ label: "model", href: "/a" }] },
    ];
    assert.deepEqual(recentItems(tied, [], 2).map((i) => i.label), ["Alpha", "Beta"]);
  });

  test("prefers an on-site link, then a demo", () => {
    const mixed = [
      {
        name: "Both", active: true, added: "2026-09-18",
        links: [{ label: "code", href: "https://gh.test/x" }, { label: "stats", href: "/stats" }],
      },
      { name: "Demo only", active: true, added: "2026-09-17", demo: "https://d.test", code: "https://c.test" },
    ];
    assert.deepEqual(recentItems(mixed, [], 2).map((i) => i.href), ["/stats", "https://d.test"]);
  });

  test("a project with no usable link is skipped rather than rendered dead", () => {
    const broken = [{ name: "No links", active: true, added: "2026-09-19" }];
    assert.deepEqual(recentItems(broken, posts, 1).map((i) => i.label), ["Newest Post"]);
  });

  test("empty inputs give an empty line rather than throwing", () => {
    assert.deepEqual(recentItems([], []), []);
    assert.deepEqual(recentItems(undefined, undefined), []);
  });
});
