// One hour of security-constrained economic dispatch, priced the way ERCOT
// prices it:  LMP_b = lambda - sum_k SF_bk * mu_k
//
// Storage dispatch enters as a fixed injection; the outer fixed point in
// engine.js is what decides it.

import { solveLP, LP_OPTIMAL } from "./lp.js";
import {
  BUSES, LINES, GTCS, BUS_INDEX, ASDC, AS_REQ, AS_STORAGE_CAP, SWCAP, LOW_CAP,
} from "./grid.js";

const NB = BUSES.length;
const NL = LINES.length;
const NG = GTCS.length;
const GAS_FUELS = new Set(["cc_a", "cc_b", "ct_a", "ct_b", "ct_c"]);

/**
 * Build the static variable layout. `units` are dispatchable generation blocks;
 * nuclear is carried as a must-run injection instead.
 */
export function buildUnits(capacity, offer, ccSplit, ctSplit) {
  const units = [];
  for (let b = 0; b < NB; b++) {
    const cap = capacity[BUSES[b].id];
    const add = (fuel, mw, cost) => {
      if (mw > 0.5) units.push({ bus: b, fuel, mw, cost });
    };
    add("wind", cap.wind, offer.wind);
    add("solar", cap.solar, offer.solar);
    add("coal", cap.coal, offer.coal);
    add("cc_a", cap.cc * ccSplit, offer.cc_a);
    add("cc_b", cap.cc * (1 - ccSplit), offer.cc_b);
    add("ct_a", cap.ct * ctSplit[0], offer.ct_a);
    add("ct_b", cap.ct * ctSplit[1], offer.ct_b);
    add("ct_c", cap.ct * ctSplit[2], offer.ct_c);
  }
  return units;
}

export function makeLayout(units) {
  const gasBus = [];
  for (let b = 0; b < NB; b++) {
    const gas = units.filter((u) => u.bus === b && GAS_FUELS.has(u.fuel));
    if (gas.length) gasBus.push(b);
  }
  const nU = units.length;
  const off = {
    g: 0,
    rGas: nU,
    rStor: nU + gasBus.length,
    shed: nU + gasBus.length + NB,
    seg: nU + gasBus.length + 2 * NB,
  };
  return { units, gasBus, off, nVar: off.seg + ASDC.length };
}

/**
 * @param {object} ctx  { layout, sf, gsf, thermalDerate }
 * @param {object} hour { avail: Float64Array(nUnits), load: Float64Array(NB),
 *                        mustRun: Float64Array(NB), storNet: Float64Array(NB),
 *                        storHead: Float64Array(NB) }
 */
export function solveHour(ctx, hour) {
  const { layout, sf, gsf } = ctx;
  const { units, gasBus, off, nVar } = layout;
  const { avail, load, mustRun, storNet, storHead } = hour;
  const nU = units.length;

  const cost = new Float64Array(nVar);
  for (let u = 0; u < nU; u++) cost[off.g + u] = units[u].cost;
  for (let b = 0; b < NB; b++) cost[off.shed + b] = SWCAP;
  for (let s = 0; s < ASDC.length; s++) cost[off.seg + s] = ASDC[s].price;

  // const_b is everything injected at b that SCED is not choosing this hour.
  const konst = new Float64Array(NB);
  for (let b = 0; b < NB; b++) konst[b] = mustRun[b] + storNet[b] - load[b];

  const rows = [];
  const rowIx = {};

  // --- energy balance --------------------------------------------------------
  {
    const coef = new Float64Array(nVar);
    for (let u = 0; u < nU; u++) coef[off.g + u] = 1;
    for (let b = 0; b < NB; b++) coef[off.shed + b] = 1;
    let rhs = 0;
    for (let b = 0; b < NB; b++) rhs -= konst[b];
    rowIx.energy = rows.length;
    rows.push({ coef, sense: "=", rhs });
  }

  // --- line limits, both directions -----------------------------------------
  rowIx.linePos = rows.length;
  for (let l = 0; l < NL; l++) {
    let K = 0;
    for (let b = 0; b < NB; b++) K += sf[l][b] * konst[b];
    const cp = new Float64Array(nVar);
    const cn = new Float64Array(nVar);
    for (let u = 0; u < nU; u++) { cp[off.g + u] = sf[l][units[u].bus]; cn[off.g + u] = -sf[l][units[u].bus]; }
    for (let b = 0; b < NB; b++) { cp[off.shed + b] = sf[l][b]; cn[off.shed + b] = -sf[l][b]; }
    rows.push({ coef: cp, sense: "<", rhs: LINES[l].limit - K });
    rows.push({ coef: cn, sense: "<", rhs: LINES[l].limit + K });
  }

  // --- generic transmission constraints -------------------------------------
  rowIx.gtc = rows.length;
  for (let g = 0; g < NG; g++) {
    let K = 0;
    for (let b = 0; b < NB; b++) K += gsf[g][b] * konst[b];
    const coef = new Float64Array(nVar);
    for (let u = 0; u < nU; u++) coef[off.g + u] = gsf[g][units[u].bus];
    for (let b = 0; b < NB; b++) coef[off.shed + b] = gsf[g][b];
    rows.push({ coef, sense: "<", rhs: GTCS[g].limit - K });
  }

  // --- reserve balance against the ASDC -------------------------------------
  {
    const coef = new Float64Array(nVar);
    for (let k = 0; k < gasBus.length; k++) coef[off.rGas + k] = 1;
    for (let b = 0; b < NB; b++) coef[off.rStor + b] = 1;
    for (let s = 0; s < ASDC.length; s++) coef[off.seg + s] = 1;
    rowIx.reserve = rows.length;
    rows.push({ coef, sense: "=", rhs: AS_REQ });
  }

  // --- duration-limited resources may carry only part of the requirement ----
  {
    const coef = new Float64Array(nVar);
    for (let b = 0; b < NB; b++) coef[off.rStor + b] = 1;
    rowIx.storShare = rows.length;
    rows.push({ coef, sense: "<", rhs: AS_STORAGE_CAP * AS_REQ });
  }

  // --- gas headroom: energy plus reserve cannot exceed installed gas ---------
  rowIx.gasHead = rows.length;
  for (let k = 0; k < gasBus.length; k++) {
    const b = gasBus[k];
    const coef = new Float64Array(nVar);
    let capMW = 0;
    for (let u = 0; u < nU; u++) {
      if (units[u].bus === b && GAS_FUELS.has(units[u].fuel)) {
        coef[off.g + u] = 1;
        capMW += avail[u];
      }
    }
    coef[off.rGas + k] = 1;
    rows.push({ coef, sense: "<", rhs: capMW });
  }

  // --- simple upper bounds, carried as rows ---------------------------------
  const bound = (j, ub) => {
    const coef = new Float64Array(nVar);
    coef[j] = 1;
    rows.push({ coef, sense: "<", rhs: Math.max(0, ub) });
  };
  rowIx.gBound = rows.length;
  for (let u = 0; u < nU; u++) bound(off.g + u, avail[u]);
  rowIx.rStorBound = rows.length;
  for (let b = 0; b < NB; b++) bound(off.rStor + b, storHead[b]);
  rowIx.shedBound = rows.length;
  for (let b = 0; b < NB; b++) bound(off.shed + b, load[b]);
  rowIx.segBound = rows.length;
  for (let s = 0; s < ASDC.length; s++) bound(off.seg + s, ASDC[s].width);

  const res = solveLP(nVar, cost, rows);
  if (res.status !== LP_OPTIMAL) {
    return { ok: false, status: res.status };
  }
  const { x, y } = res;

  // --- prices ----------------------------------------------------------------
  const lambda = y[rowIx.energy];
  const mu = new Float64Array(NL);
  for (let l = 0; l < NL; l++) {
    mu[l] = -(y[rowIx.linePos + 2 * l] - y[rowIx.linePos + 2 * l + 1]);
  }
  const muG = new Float64Array(NG);
  for (let g = 0; g < NG; g++) muG[g] = -y[rowIx.gtc + g];

  const lmp = new Float64Array(NB);
  const congestion = new Float64Array(NB);
  for (let b = 0; b < NB; b++) {
    let c = 0;
    for (let l = 0; l < NL; l++) c -= sf[l][b] * mu[l];
    for (let g = 0; g < NG; g++) c -= gsf[g][b] * muG[g];
    congestion[b] = c;
    lmp[b] = clamp(lambda + c + y[rowIx.shedBound + b], LOW_CAP, SWCAP);
  }
  const reservePrice = y[rowIx.reserve];

  // --- physical results ------------------------------------------------------
  const gen = new Float64Array(nU);
  for (let u = 0; u < nU; u++) gen[u] = x[off.g + u];
  const shed = new Float64Array(NB);
  for (let b = 0; b < NB; b++) shed[b] = x[off.shed + b];

  const netInj = new Float64Array(NB);
  for (let u = 0; u < nU; u++) netInj[units[u].bus] += gen[u];
  for (let b = 0; b < NB; b++) netInj[b] += shed[b] + konst[b];

  const flow = new Float64Array(NL);
  for (let l = 0; l < NL; l++) {
    let f = 0;
    for (let b = 0; b < NB; b++) f += sf[l][b] * netInj[b];
    flow[l] = f;
  }
  const gtcFlow = new Float64Array(NG);
  for (let g = 0; g < NG; g++) {
    let f = 0;
    for (let b = 0; b < NB; b++) f += gsf[g][b] * netInj[b];
    gtcFlow[g] = f;
  }

  let reserveProcured = 0;
  for (let k = 0; k < gasBus.length; k++) reserveProcured += x[off.rGas + k];
  for (let b = 0; b < NB; b++) reserveProcured += x[off.rStor + b];

  let curtailed = 0;
  for (let u = 0; u < nU; u++) {
    if (units[u].fuel === "wind" || units[u].fuel === "solar") curtailed += avail[u] - gen[u];
  }

  return {
    ok: true, lambda, lmp, congestion, mu, muG, flow, gtcFlow,
    gen, shed, netInj, reservePrice, reserveProcured, curtailed, cost: res.obj,
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
