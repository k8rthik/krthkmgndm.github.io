// The market equilibrium: storage bids as a price taker, SCED prices the result,
// and the two are iterated to a fixed point.

import {
  BUSES, ZONES, LINES, GTCS, CAPACITY, OFFER, CC_SPLIT, CT_SPLIT,
  shiftFactors, gtcShiftFactors,
} from "./grid.js";
import { DAYS } from "./days.js";
import { buildUnits, makeLayout, solveHour } from "./sced.js";
import { arbitrage } from "./storage.js";

const NB = BUSES.length;
const NL = LINES.length;
const T = 24;

export const SF = shiftFactors();
export const GSF = gtcShiftFactors(SF);

const UNITS = buildUnits(CAPACITY, OFFER, CC_SPLIT, CT_SPLIT);
const LAYOUT = makeLayout(UNITS);

export const DEFAULTS = {
  day: "spring",
  homes: 0,
  kwhPerHome: 25,          // Base Power Gen 1: 11.4 kW / 25 kWh
  kwPerHome: 11.4,
  backupReserve: 0.20,     // share of usable energy held back for outages
  signal: "zonal",         // "zonal" = settled at the Load Zone price; "nodal" = at the bus LMP
  repOnly: true,           // deploy only where a retail electric provider may sell
  gridStorageHours: 2.0,
  roundTrip: 0.86,
  degCost: 4,              // $/MWh of throughput
};

/** Per-bus hourly load: the system shape, flattened at industrial buses. */
function busLoads(day) {
  const shape = DAYS[day].load;
  const peak = DAYS[day].peakLoad;
  const mean = shape.reduce((a, b) => a + b, 0) / T;
  const load = Array.from({ length: T }, () => new Float64Array(NB));
  for (let t = 0; t < T; t++) {
    let raw = 0;
    const tmp = new Float64Array(NB);
    for (let b = 0; b < NB; b++) {
      const ind = BUSES[b].industrial;
      tmp[b] = BUSES[b].loadShare * ((1 - ind) * shape[t] + ind * mean);
      raw += tmp[b];
    }
    const scale = (shape[t] / raw) * peak;
    for (let b = 0; b < NB; b++) load[t][b] = tmp[b] * scale;
  }
  return load;
}

/** Hourly availability of every dispatchable unit. */
function availability(day) {
  const d = DAYS[day];
  const avail = Array.from({ length: T }, () => new Float64Array(UNITS.length));
  for (let t = 0; t < T; t++) {
    for (let u = 0; u < UNITS.length; u++) {
      const un = UNITS[u];
      const bus = BUSES[un.bus];
      let f;
      if (un.fuel === "wind") f = bus.windShape === "west" ? d.windWest[t] : d.windCoast[t];
      else if (un.fuel === "solar") f = d.solar[t];
      else f = d.thermalDerate;
      avail[t][u] = un.mw * f;
    }
  }
  return avail;
}

// Fleet-wide nuclear availability. Nuclear is must-run at this factor on every
// day: it does not take the day's thermalDerate, which models ambient and fuel
// outages on the gas and coal fleet.
export const NUCLEAR_AVAILABILITY = 0.95;

/** Must-run injection at each bus, MW: its nuclear at fleet availability. */
export function mustRun() {
  const m = new Float64Array(NB);
  for (let b = 0; b < NB; b++) m[b] = CAPACITY[BUSES[b].id].nuclear * NUCLEAR_AVAILABILITY;
  return m;
}

// Fixed-point iteration. MAX_ITER caps the work per solve; the price-move test
// is not trusted until WARMUP_ITERS have passed, since the first averaged
// schedules can sit still by accident; PRICE_TOL is the largest change in any
// bus-hour LMP, $/MWh, that counts as settled. A warm start is already near the
// fixed point, so its step sequence starts WARM_STEP_OFFSET terms further in.
export const MAX_ITER = 22;
export const WARMUP_ITERS = 6;
export const PRICE_TOL = 1.5;
const WARM_STEP_OFFSET = 2;

/**
 * The marginal $/kW-day the siting table shows: valued at the price the fleet
 * is settled against, so it follows the "settled at" control.
 */
export function siteValues(run) {
  return run.opts.signal === "zonal" ? run.marginalZonal : run.marginal;
}

/** Share of the residential fleet that lands at each bus. */
export function fleetWeights(repOnly) {
  const w = BUSES.map((b) => b.loadShare * b.resiShare * (repOnly ? b.repShare : 1));
  const s = w.reduce((a, c) => a + c, 0);
  return w.map((v) => v / s);
}

export function simulate(optsIn) {
  const o = { ...DEFAULTS, ...optsIn };
  const load = busLoads(o.day);
  const avail = availability(o.day);
  const must = mustRun();
  const ctx = { layout: LAYOUT, sf: SF, gsf: GSF };

  // --- storage entities -------------------------------------------------------
  const weights = fleetWeights(o.repOnly);
  const entities = [];
  for (let b = 0; b < NB; b++) {
    const gp = CAPACITY[BUSES[b].id].bess;
    entities.push({ bus: b, cls: "grid", power: gp, energy: gp * o.gridStorageHours });
    const homes = o.homes * weights[b];
    entities.push({
      bus: b, cls: "resi", homes,
      power: (homes * o.kwPerHome) / 1000,
      energy: (homes * o.kwhPerHome * (1 - o.backupReserve)) / 1000,
    });
  }

  const ch = entities.map(() => new Float64Array(T));
  const dis = entities.map(() => new Float64Array(T));
  const soc = entities.map((e) => new Float64Array(T).fill(e.energy / 2));
  if (optsIn && optsIn.warmStart) {
    const w = optsIn.warmStart;
    for (let e = 0; e < entities.length && e < w.ch.length; e++) {
      const scale = w.power[e] > 0 ? entities[e].power / w.power[e] : 0;
      if (!isFinite(scale) || scale <= 0) continue;
      for (let t = 0; t < T; t++) {
        ch[e][t] = w.ch[e][t] * scale;
        dis[e][t] = w.dis[e][t] * scale;
        soc[e][t] = w.soc[e][t] * scale;
      }
    }
  }

  let hours = null;
  let iters = 0;
  let converged = false;

  const runSCED = () => {
    const out = [];
    for (let t = 0; t < T; t++) {
      const storNet = new Float64Array(NB);
      const storHead = new Float64Array(NB);
      for (let e = 0; e < entities.length; e++) {
        const en = entities[e];
        storNet[en.bus] += dis[e][t] - ch[e][t];
        // A battery can offer reserve by stopping a charge as well as by
        // discharging further, so headroom runs to twice its rating - but only
        // as far as the charge in the cell can actually sustain it.
        const head = Math.min(2 * en.power, en.power - (dis[e][t] - ch[e][t]));
        storHead[en.bus] += Math.max(0, Math.min(head, soc[e][t]));
      }
      const r = solveHour(ctx, {
        avail: avail[t], load: load[t], mustRun: must, storNet, storHead,
      });
      if (!r.ok) return null;
      out.push(r);
    }
    return out;
  };

  const zonePrices = (h) => {
    const zp = {};
    for (const z of ZONES) {
      const zb = BUSES.map((b, i) => [b, i]).filter(([b]) => b.zone === z);
      zp[z] = new Float64Array(T);
      for (let t = 0; t < T; t++) {
        let num = 0, den = 0;
        for (const [, i] of zb) { num += h[t].lmp[i] * load[t][i]; den += load[t][i]; }
        zp[z][t] = num / den;
      }
    }
    return zp;
  };

  // Method of successive averages. Best-responding to the current price with a
  // fixed step makes the whole fleet swing in unison and the iteration never
  // settles; the 1/(k+1) step is Frank-Wolfe on the underlying welfare problem
  // and does converge. `gap` is the relative distance between the fleet's
  // current schedule and its best response - the convergence measure reported
  // on the page.
  const maxIter = o.maxIter ?? MAX_ITER;
  let gap = Infinity;
  const prevLmp = new Float64Array(T * NB).fill(NaN);
  for (let it = 0; it < maxIter; it++) {
    hours = runSCED();
    if (!hours) break;
    iters = it + 1;
    const zp = zonePrices(hours);
    const alpha = 1 / (it + 1 + (optsIn && optsIn.warmStart ? WARM_STEP_OFFSET : 0));

    for (let e = 0; e < entities.length; e++) {
      const en = entities[e];
      if (en.power <= 0 || en.energy <= 0) continue;
      const nodal = en.cls === "grid" || o.signal === "nodal";
      const price = new Float64Array(T);
      for (let t = 0; t < T; t++) price[t] = nodal ? hours[t].lmp[en.bus] : zp[BUSES[en.bus].zone][t];
      const best = arbitrage(price, en.power, en.energy, o.roundTrip, o.degCost);

      // Average the schedules, then net charge against discharge. Blending the
      // two legs separately leaves an hour both charging and discharging, which
      // burns round-trip losses for nothing and is not a schedule anyone would
      // run; netting keeps every iterate physically meaningful.
      const eff = Math.sqrt(o.roundTrip);
      let level = soc[e][0] + alpha * (best.soc[0] - soc[e][0]);
      for (let t = 0; t < T; t++) {
        const c = ch[e][t] + alpha * (best.ch[t] - ch[e][t]);
        const d = dis[e][t] + alpha * (best.dis[t] - dis[e][t]);
        const net = d - c;
        dis[e][t] = Math.max(0, net);
        ch[e][t] = Math.max(0, -net);
        soc[e][t] = level;
        level = Math.min(en.energy, Math.max(0, level + eff * ch[e][t] - dis[e][t] / eff));
      }
    }

    // Convergence is judged on the prices, since those are what everything
    // downstream is read off.
    let move = 0;
    for (let t = 0; t < T; t++) {
      for (let b = 0; b < NB; b++) move = Math.max(move, Math.abs(hours[t].lmp[b] - prevLmp[t * NB + b]));
      for (let b = 0; b < NB; b++) prevLmp[t * NB + b] = hours[t].lmp[b];
    }
    gap = move;
    if (it > WARMUP_ITERS && move < PRICE_TOL) { converged = true; break; }
  }
  hours = runSCED();
  if (!hours) return null;

  return pack(o, entities, ch, dis, soc, hours, load, avail, zonePrices(hours), { iters, converged, priceMove: gap });
}

function pack(o, entities, ch, dis, soc, hours, load, avail, zp, meta) {
  const lmp = Array.from({ length: NB }, (_, b) => Float64Array.from(hours.map((h) => h.lmp[b])));
  const cong = Array.from({ length: NB }, (_, b) => Float64Array.from(hours.map((h) => h.congestion[b])));
  const lambda = Float64Array.from(hours.map((h) => h.lambda));
  const curtail = Float64Array.from(hours.map((h) => h.curtailed));
  const shed = Float64Array.from(hours.map((h) => h.shed.reduce((a, c) => a + c, 0)));

  // Binding constraints, hour by hour.
  const binding = hours.map((h) => {
    const list = [];
    for (let l = 0; l < NL; l++) if (h.mu[l] > 0.01) list.push({ kind: "line", id: LINES[l].id, mu: h.mu[l], flow: h.flow[l], limit: LINES[l].limit });
    for (let g = 0; g < GTCS.length; g++) if (h.muG[g] > 0.01) list.push({ kind: "gtc", id: GTCS[g].id, mu: h.muG[g], flow: h.gtcFlow[g], limit: GTCS[g].limit });
    return list.sort((a, b) => b.mu - a.mu);
  });

  // Marginal value of the next increment of storage, per bus, at the settled
  // prices. A marginal unit does not move price, so this is its arbitrage value.
  const hoursPerMW = o.kwhPerHome / o.kwPerHome;
  const usable = hoursPerMW * (1 - o.backupReserve);
  const marginal = new Float64Array(NB);
  const marginalZonal = new Float64Array(NB);
  for (let b = 0; b < NB; b++) {
    const pn = Float64Array.from(hours.map((h) => h.lmp[b]));
    marginal[b] = arbitrage(pn, 1, usable, o.roundTrip, o.degCost).value / 1000;   // $/kW-day
    const pz = zp[BUSES[b].zone];
    marginalZonal[b] = arbitrage(pz, 1, usable, o.roundTrip, o.degCost).value / 1000;
  }

  // Realised fleet economics at the price it is actually settled against.
  let fleetRevenue = 0, fleetPower = 0;
  for (let e = 0; e < entities.length; e++) {
    const en = entities[e];
    if (en.cls !== "resi" || en.power <= 0) continue;
    fleetPower += en.power;
    const nodal = o.signal === "nodal";
    for (let t = 0; t < T; t++) {
      const p = nodal ? hours[t].lmp[en.bus] : zp[BUSES[en.bus].zone][t];
      fleetRevenue += p * (dis[e][t] - ch[e][t]) - o.degCost * (dis[e][t] + ch[e][t]);
    }
  }

  const loadWeighted = () => {
    let num = 0, den = 0;
    for (let t = 0; t < T; t++) for (let b = 0; b < NB; b++) { num += hours[t].lmp[b] * load[t][b]; den += load[t][b]; }
    return num / den;
  };

  const allP = [];
  for (let t = 0; t < T; t++) for (let b = 0; b < NB; b++) allP.push(hours[t].lmp[b]);

  return {
    opts: o, meta,
    lmp, cong, lambda, curtail, shed, zp, binding,
    flows: hours.map((h) => h.flow),
    marginal, marginalZonal,
    warmStart: { ch, dis, soc, power: entities.map((e) => e.power) },
    stats: {
      avgLoadWeighted: loadWeighted(),
      peakPrice: Math.max(...allP),
      curtailGWh: curtail.reduce((a, c) => a + c, 0) / 1000,
      shedGWh: shed.reduce((a, c) => a + c, 0) / 1000,
      fleetPowerGW: fleetPower / 1000,
      fleetEnergyGWh: entities.filter((e) => e.cls === "resi").reduce((a, c) => a + c.energy, 0) / 1000,
      fleetRevPerKWday: fleetPower > 0 ? fleetRevenue / (fleetPower * 1000) : 0,
    },
  };
}

export { ZONES, BUSES, LINES, GTCS };
