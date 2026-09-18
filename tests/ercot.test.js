// Tests for the nodal-price model. Every expectation is either hand-computed
// or checked against an independent definition of the same quantity — never
// against a second run of the code under test.
//
// The strong one is "LMP == dCost/dLoad": the model computes prices from the
// LP's duals, and the test computes them by perturbing load and re-solving.
// Those are different routes to the same number.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { solveLP } from "../components/ercot/lp.js";
import {
  BUSES, LINES, GTCS, BUS_INDEX, CAPACITY, OFFER, CC_SPLIT, CT_SPLIT,
  shiftFactors, gtcShiftFactors,
} from "../components/ercot/grid.js";
import { buildUnits, makeLayout, solveHour } from "../components/ercot/sced.js";
import { arbitrage } from "../components/ercot/storage.js";
import { fleetWeights } from "../components/ercot/engine.js";

const NB = BUSES.length;
const NL = LINES.length;
const SF = shiftFactors();
const GSF = gtcShiftFactors(SF);
const UNITS = buildUnits(CAPACITY, OFFER, CC_SPLIT, CT_SPLIT);
const CTX = { layout: makeLayout(UNITS), sf: SF, gsf: GSF };

const close = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) < tol, `${msg ?? ""} ${a} != ${b} (tol ${tol})`);

const row = (n, pairs, sense, rhs) => {
  const coef = new Float64Array(n);
  for (const [j, v] of pairs) coef[j] = v;
  return { coef, sense, rhs };
};

// An hour built from scratch: every unit at the given capacity factor, load
// split by each bus's share of a total, no storage.
function hour({ totalLoad, windCF, solarCF }) {
  const avail = new Float64Array(UNITS.length);
  UNITS.forEach((u, i) => {
    avail[i] = u.mw * (u.fuel === "wind" ? windCF : u.fuel === "solar" ? solarCF : 1);
  });
  const load = new Float64Array(NB);
  const mustRun = new Float64Array(NB);
  for (let b = 0; b < NB; b++) {
    load[b] = BUSES[b].loadShare * totalLoad;
    mustRun[b] = CAPACITY[BUSES[b].id].nuclear * 0.95;
  }
  return {
    avail, load, mustRun,
    storNet: new Float64Array(NB),
    storHead: new Float64Array(NB),
  };
}

describe("simplex", () => {
  test("solves a hand-computed program and reports its shadow price", () => {
    // min -x-y subject to x+y<=4, x<=3, y<=3. Optimum -4; one more unit of
    // the first constraint is worth exactly 1.
    const r = solveLP(2, [-1, -1], [
      row(2, [[0, 1], [1, 1]], "<", 4),
      row(2, [[0, 1]], "<", 3),
      row(2, [[1, 1]], "<", 3),
    ]);
    close(r.obj, -4, 1e-9, "objective");
    close(r.y[0], -1, 1e-9, "shadow price");
  });

  test("handles equalities and a binding upper bound", () => {
    // min 2x+3y, x+y=10, x<=6 -> x=6, y=4, cost 24. Raising the requirement
    // by 1 costs 3 (the expensive unit); raising the cap by 1 saves 1.
    const r = solveLP(2, [2, 3], [
      row(2, [[0, 1], [1, 1]], "=", 10),
      row(2, [[0, 1]], "<", 6),
    ]);
    close(r.obj, 24, 1e-9);
    close(r.x[0], 6, 1e-9);
    close(r.y[0], 3, 1e-9, "requirement");
    close(r.y[1], -1, 1e-9, "cap");
  });

  test("reported duals match finite differences over random programs", () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let checked = 0;
    for (let trial = 0; trial < 120; trial++) {
      const n = 5;
      const cost = Array.from({ length: n }, () => rnd() * 10);
      const rows = [];
      for (let i = 0; i < 4; i++) {
        const coef = new Float64Array(n);
        for (let j = 0; j < n; j++) coef[j] = rnd() * 2 - 0.5;
        rows.push({ coef, sense: i === 0 ? "=" : ">", rhs: rnd() * 10 });
      }
      for (let j = 0; j < n; j++) rows.push(row(n, [[j, 1]], "<", 6));
      const base = solveLP(n, cost, rows);
      if (base.status !== "optimal") continue;
      for (let i = 0; i < 4; i++) {
        const bumped = rows.map((r, k) => (k === i ? { ...r, rhs: r.rhs + 1e-5 } : r));
        const up = solveLP(n, cost, bumped);
        if (up.status !== "optimal") continue;
        close((up.obj - base.obj) / 1e-5, base.y[i], 1e-3, `trial ${trial} row ${i}`);
        checked += 1;
      }
    }
    assert.ok(checked > 200, `only ${checked} duals checked`);
  });
});

describe("shift factors", () => {
  test("reproduce a directly solved DC power flow", () => {
    // Independent check: solve B*theta = P with bus 0 grounded, then compare
    // each line's (theta_from - theta_to)/x against sum_b SF[l][b]*P[b].
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const P = new Float64Array(NB);
    for (let b = 0; b < NB; b++) P[b] = rnd() * 2000 - 1000;
    const mean = P.reduce((a, c) => a + c, 0) / NB;
    for (let b = 0; b < NB; b++) P[b] -= mean;

    const B = Array.from({ length: NB }, () => new Float64Array(NB));
    for (const l of LINES) {
      const f = BUS_INDEX[l.from];
      const t = BUS_INDEX[l.to];
      const y = 1 / l.x;
      B[f][f] += y; B[t][t] += y; B[f][t] -= y; B[t][f] -= y;
    }
    const n = NB - 1;
    const M = Array.from({ length: n }, (_, i) => {
      const r = new Float64Array(n + 1);
      for (let j = 0; j < n; j++) r[j] = B[i + 1][j + 1];
      r[n] = P[i + 1];
      return r;
    });
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c];
      for (let j = 0; j <= n; j++) M[c][j] /= d;
      for (let i = 0; i < n; i++) {
        if (i === c) continue;
        const f = M[i][c];
        for (let j = 0; j <= n; j++) M[i][j] -= f * M[c][j];
      }
    }
    const theta = new Float64Array(NB);
    for (let i = 0; i < n; i++) theta[i + 1] = M[i][n];

    for (let l = 0; l < NL; l++) {
      const direct = (theta[BUS_INDEX[LINES[l].from]] - theta[BUS_INDEX[LINES[l].to]]) / LINES[l].x;
      let viaSF = 0;
      for (let b = 0; b < NB; b++) viaSF += SF[l][b] * P[b];
      close(direct, viaSF, 1e-6, LINES[l].id);
    }
  });

  test("a load-shaped injection moves nothing, since the slack is distributed", () => {
    for (let l = 0; l < NL; l++) {
      let z = 0;
      for (let b = 0; b < NB; b++) z += BUSES[b].loadShare * SF[l][b];
      close(z, 0, 1e-9, LINES[l].id);
    }
  });
});

describe("dispatch pricing", () => {
  // An hour with plenty of thermal headroom and little renewable output: the
  // network is nowhere near a limit, so location cannot matter.
  test("with nothing binding, every bus prices at lambda", () => {
    const r = solveHour(CTX, hour({ totalLoad: 84000, windCF: 0.2, solarCF: 0.1 }));
    assert.ok(r.ok);
    assert.equal(r.mu.filter((m) => m > 0.01).length, 0, "no line should bind");
    assert.equal(r.muG.filter((m) => m > 0.01).length, 0, "no GTC should bind");
    for (let b = 0; b < NB; b++) close(r.lmp[b], r.lambda, 1e-6, BUSES[b].id);
  });

  // The heart of it. The model prices buses from the LP's duals; this derives
  // the same prices from the definition of an LMP and requires they agree.
  for (const sc of [
    { totalLoad: 45000, windCF: 0.75, solarCF: 0.9, note: "surplus, exports constrained" },
    { totalLoad: 60000, windCF: 0.60, solarCF: 0.8, note: "shoulder, mixed congestion" },
    { totalLoad: 75000, windCF: 0.35, solarCF: 0.5, note: "tight, thermal on the margin" },
    { totalLoad: 87000, windCF: 0.15, solarCF: 0.05, note: "scarcity" },
  ]) {
    test(`LMP equals d(cost)/d(load) at every bus — ${sc.note}`, () => {
      const base = solveHour(CTX, hour(sc));
      assert.ok(base.ok);
      for (let b = 0; b < NB; b++) {
        const bumped = hour(sc);
        bumped.load[b] += 0.5;
        const up = solveHour(CTX, bumped);
        assert.ok(up.ok);
        close((up.cost - base.cost) / 0.5, base.lmp[b], 0.05, `${BUSES[b].id}`);
      }
    });
  }

  test("the solution is physically feasible", () => {
    const r = solveHour(CTX, hour({ totalLoad: 78000, windCF: 0.7, solarCF: 0.7 }));
    close(r.netInj.reduce((a, c) => a + c, 0), 0, 1e-6, "injections net to zero");
    for (let l = 0; l < NL; l++) {
      assert.ok(Math.abs(r.flow[l]) <= LINES[l].limit + 1e-4, `${LINES[l].id} over its rating`);
    }
    for (let g = 0; g < GTCS.length; g++) {
      assert.ok(r.gtcFlow[g] <= GTCS[g].limit + 1e-4, `${GTCS[g].id} over its limit`);
    }
  });

  test("congestion is the whole of the gap between a bus and lambda", () => {
    const r = solveHour(CTX, hour({ totalLoad: 45000, windCF: 0.75, solarCF: 0.9 }));
    assert.ok(r.muG.some((m) => m > 0.01), "fixture should congest");
    for (let b = 0; b < NB; b++) close(r.lmp[b] - r.lambda, r.congestion[b], 1e-6, BUSES[b].id);
  });
});

describe("storage arbitrage", () => {
  const twoBlock = Float64Array.from([...Array(12).fill(0), ...Array(12).fill(100)]);

  test("a flat price is never worth cycling", () => {
    close(arbitrage(Float64Array.from(Array(24).fill(40)), 10, 40, 1.0, 0).value, 0, 1e-9);
  });

  test("lossless: fill in the cheap block, sell the lot in the dear one", () => {
    // 10 MW / 40 MWh. Open the day empty, charge 40 MWh over four hours at $0,
    // sell all 40 MWh at $100 = $4,000. (Opening half full would cap it at
    // 20 MWh — the cyclic constraint is on the level, not the throughput.)
    close(arbitrage(twoBlock, 10, 40, 1.0, 0).value, 4000, 1e-6);
  });

  test("lossy: round trip and degradation come off the top", () => {
    // 86% round trip -> one-way efficiency sqrt(0.86) = 0.927362.
    // Draw 40/0.927362 = 43.1331 MWh at $0 to put 40 MWh in the cell.
    // Deliver 40*0.927362 = 37.0945 MWh at $100      = $3,709.45
    // less $4/MWh on (43.1331 + 37.0945) = 80.2276   =   $320.91
    //                                                  ----------
    //                                                  $3,388.54
    close(arbitrage(twoBlock, 10, 40, 0.86, 4).value, 3388.54, 0.02);
  });

  test("a spread narrower than the round trip is left alone", () => {
    // $5 of spread cannot cover 0.927 x 45 - 1.078 x 40 losses plus $4/MWh
    // each way, so the optimal schedule is to do nothing.
    const narrow = Float64Array.from([...Array(12).fill(40), ...Array(12).fill(45)]);
    close(arbitrage(narrow, 10, 40, 0.86, 4).value, 0, 1e-9);
  });

  test("power and energy limits both bite", () => {
    // 2 MW / 40 MWh over a 12-hour dear block can only deliver 24 MWh, so the
    // energy cap never binds: 24 MWh at $100, lossless, is $2,400.
    close(arbitrage(twoBlock, 2, 40, 1.0, 0).value, 2400, 1e-6);
  });
});

describe("fleet siting", () => {
  test("homes land in proportion to residential load", () => {
    // weight = loadShare x resiShare, normalised. DFW: .265 x .42 = .1113
    // over a total of .3326 -> .334636
    const w = fleetWeights(false);
    close(w.reduce((a, c) => a + c, 0), 1, 1e-12, "weights sum to one");
    close(w[BUS_INDEX.NDFW], 0.334636, 1e-6, "DFW");
    close(w[BUS_INDEX.SMETRO], 0.162357, 1e-6, "Austin/San Antonio");
  });

  test("restricting to competitive territory shifts the fleet off the municipals", () => {
    // Austin Energy and CPS are municipal, so SMETRO carries a .45 REP share
    // and its weight roughly halves; DFW, at .95, gains.
    const w = fleetWeights(true);
    close(w.reduce((a, c) => a + c, 0), 1, 1e-12, "weights sum to one");
    close(w[BUS_INDEX.SMETRO], 0.092236, 1e-6, "Austin/San Antonio");
    close(w[BUS_INDEX.NDFW], 0.40134, 1e-6, "DFW");
    close(w[BUS_INDEX.PANH], 0.006263, 1e-6, "Panhandle");
    assert.ok(w[BUS_INDEX.SMETRO] < fleetWeights(false)[BUS_INDEX.SMETRO]);
  });
});
