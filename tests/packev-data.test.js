// Invariants on the real data/packev.json, the export contract with the
// pack-ev repo (`pack-ev site-export`). When this fails after a sync, suspect
// the contract changed: fix the exporter or extend an assertion with a dated
// comment; never loosen one just to go green.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "packev.json"), "utf8"));
const ROLES = ["Play / Draft", "Set", "Collector"];

test("meta describes the payload", () => {
  const { meta } = data;
  for (const k of ["generated", "bulkFloor", "historyStart", "sets", "minSeries", "seriesStepWeeks"]) {
    assert.ok(k in meta, `meta.${k}`);
  }
  assert.equal(meta.sets, new Set(data.boosters.map((b) => b.set)).size);
  assert.ok(meta.minSeries >= 5, "small-sample floor must not drop below 5 set-boosters");
  assert.deepEqual(data.roles, ROLES);
});

test("every booster row is well formed", () => {
  for (const b of data.boosters) {
    const id = `${b.set}/${b.booster}`;
    assert.ok(ROLES.includes(b.role), `${id} role`);
    assert.ok(b.ev > 0 && b.evBulk >= 0 && b.evBulk <= b.ev + 1e-9, `${id} ev`);
    assert.ok(b.price === null || b.price > 0, `${id} price`);
    assert.ok(b.weeksAbove >= 0 && b.weeksAbove <= b.weeks, `${id} weeks`);
    for (const row of b.series) assert.equal(row.length, 4, `${id} series row`);
    const weeks = b.series.map((r) => r[0]);
    assert.deepEqual(weeks, [...weeks].sort(), `${id} series chronological`);
    assert.equal(new Set(weeks).size, weeks.length, `${id} series has duplicate weeks`);
  }
});

test("cross-set aging respects the sample floor and is ordered", () => {
  for (const pricing of ["market", "bulk"]) {
    for (const role of ROLES) {
      const rows = data.cross[pricing].aging[role];
      assert.ok(rows.length > 0, `${pricing}/${role} has aging points`);
      rows.forEach(([age, p25, median, p75, share, n], i) => {
        assert.ok(n >= data.meta.minSeries, `${pricing}/${role} age ${age} n=${n}`);
        assert.ok(p25 <= median && median <= p75, `${pricing}/${role} age ${age} quartiles`);
        assert.ok(share >= 0 && share <= 1);
        if (i > 0) assert.ok(age > rows[i - 1][0], "ages increase");
      });
    }
    for (const m of data.cross[pricing].milestones) {
      assert.ok(m.n >= data.meta.minSeries && m.shareAbove >= 0 && m.shareAbove <= 1);
    }
  }
});
