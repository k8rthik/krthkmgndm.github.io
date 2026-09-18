// The market equilibrium: storage bids as a price taker, SCED prices the result,
// and the two are iterated to a fixed point.

import {
  BUSES, ZONES, LINES, GTCS, CAPACITY, OFFER, CC_SPLIT, CT_SPLIT,
  shiftFactors, gtcShiftFactors, AS_REQ,
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
export const UNIT_LIST = UNITS;

export const DEFAULTS = {
  day: "summer",
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

function mustRun(day) {
  const m = new Float64Array(NB);
  for (let b = 0; b < NB; b++) m[b] = CAPACITY[BUSES[b].id].nuclear * 0.95;
  // Winter derates nuclear alongside everything else only mildly; keep it firm.
  return m;
}

/** Share of the residential fleet that lands at each bus. */
export function fleetWeights(repOnly) {
  const w = BUSES.map((b) => b.loadShare * b.resiShare * (repOnly ? b.repShare : 1));
  const s = w.reduce((a, c) => a + c, 0);
  return w.map((v) => v / s);
}

export function zoneOf(b) { return BUSES[b].zone; }

export function simulate(optsIn) {
  const o = { ...DEFAULTS, ...optsIn };
  const load = busLoads(o.day);
  const avail = availability(o.day);
  const must = mustRun(o.day);
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
  const maxIter = o.maxIter ?? 22;
  let gap = Infinity;
  let foregoneUSD = 0, attainableUSD = 0;
  const prevLmp = new Float64Array(T * NB).fill(NaN);
  for (let it = 0; it < maxIter; it++) {
    hours = runSCED();
    if (!hours) break;
    iters = it + 1;
    const zp = zonePrices(hours);
    const alpha = 1 / (it + 1 + (optsIn && optsIn.warmStart ? 2 : 0));

    let foregone = 0, attainable = 0;
    for (let e = 0; e < entities.length; e++) {
      const en = entities[e];
      if (en.power <= 0 || en.energy <= 0) continue;
      const nodal = en.cls === "grid" || o.signal === "nodal";
      const price = new Float64Array(T);
      for (let t = 0; t < T; t++) price[t] = nodal ? hours[t].lmp[en.bus] : zp[BUSES[en.bus].zone][t];
      const best = arbitrage(price, en.power, en.energy, o.roundTrip, o.degCost);

      // Frank-Wolfe gap: how much profit the current schedule leaves on the
      // table against the best response to the very prices it produced.
      let held = 0;
      for (let t = 0; t < T; t++) {
        held += price[t] * (dis[e][t] - ch[e][t]) - o.degCost * (dis[e][t] + ch[e][t]);
      }
      foregone += Math.max(0, best.value - held);
      attainable += best.value;

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
    foregoneUSD = foregone;
    attainableUSD = attainable;

    // Convergence is judged on the prices, since those are what everything
    // downstream is read off. The dollar gap is kept as a diagnostic.
    let move = 0;
    for (let t = 0; t < T; t++) {
      for (let b = 0; b < NB; b++) move = Math.max(move, Math.abs(hours[t].lmp[b] - prevLmp[t * NB + b]));
      for (let b = 0; b < NB; b++) prevLmp[t * NB + b] = hours[t].lmp[b];
    }
    gap = move;
    if (it > 6 && move < 1.5) { converged = true; break; }
  }
  hours = runSCED();
  if (!hours) return null;

  return pack(o, entities, ch, dis, soc, hours, load, avail, zonePrices(hours), { iters, converged, priceMove: gap, foregoneUSD, attainableUSD });
}

function pack(o, entities, ch, dis, soc, hours, load, avail, zp, meta) {
  const lmp = Array.from({ length: NB }, (_, b) => Float64Array.from(hours.map((h) => h.lmp[b])));
  const cong = Array.from({ length: NB }, (_, b) => Float64Array.from(hours.map((h) => h.congestion[b])));
  const lambda = Float64Array.from(hours.map((h) => h.lambda));
  const reservePrice = Float64Array.from(hours.map((h) => h.reservePrice));
  const curtail = Float64Array.from(hours.map((h) => h.curtailed));
  const shed = Float64Array.from(hours.map((h) => h.shed.reduce((a, c) => a + c, 0)));

  const sysLoad = Float64Array.from(load.map((l) => l.reduce((a, c) => a + c, 0)));
  const fleetNet = new Float64Array(T);
  const gridNet = new Float64Array(T);
  for (let e = 0; e < entities.length; e++) {
    const arr = entities[e].cls === "resi" ? fleetNet : gridNet;
    for (let t = 0; t < T; t++) arr[t] += dis[e][t] - ch[e][t];
  }

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
  let fleetRevenue = 0, fleetPower = 0, fleetThroughput = 0;
  for (let e = 0; e < entities.length; e++) {
    const en = entities[e];
    if (en.cls !== "resi" || en.power <= 0) continue;
    fleetPower += en.power;
    const nodal = o.signal === "nodal";
    for (let t = 0; t < T; t++) {
      const p = nodal ? hours[t].lmp[en.bus] : zp[BUSES[en.bus].zone][t];
      fleetRevenue += p * (dis[e][t] - ch[e][t]) - o.degCost * (dis[e][t] + ch[e][t]);
      fleetThroughput += dis[e][t];
    }
  }

  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const loadWeighted = () => {
    let num = 0, den = 0;
    for (let t = 0; t < T; t++) for (let b = 0; b < NB; b++) { num += hours[t].lmp[b] * load[t][b]; den += load[t][b]; }
    return num / den;
  };

  let peakHour = 0;
  for (let t = 1; t < T; t++) if (sysLoad[t] > sysLoad[peakHour]) peakHour = t;

  const allP = [];
  for (let t = 0; t < T; t++) for (let b = 0; b < NB; b++) allP.push(hours[t].lmp[b]);

  return {
    opts: o, meta,
    lmp, cong, lambda, reservePrice, curtail, shed, zp, binding,
    sysLoad, fleetNet, gridNet,
    flows: hours.map((h) => h.flow),
    gtcFlows: hours.map((h) => h.gtcFlow),
    marginal, marginalZonal,
    entities: entities.map((e, i) => ({ ...e, ch: ch[i], dis: dis[i], soc: soc[i] })),
    warmStart: { ch, dis, soc, power: entities.map((e) => e.power) },
    stats: {
      avgLoadWeighted: loadWeighted(),
      peakPrice: Math.max(...allP),
      avgLambda: mean(Array.from(lambda)),
      hoursAbove100: hours.filter((h) => Math.max(...h.lmp) > 100).length,
      negativeBusHours: allP.filter((p) => p < 0).length,
      curtailGWh: curtail.reduce((a, c) => a + c, 0) / 1000,
      shedGWh: shed.reduce((a, c) => a + c, 0) / 1000,
      avgReserve: mean(Array.from(reservePrice)),
      fleetPowerGW: fleetPower / 1000,
      fleetEnergyGWh: entities.filter((e) => e.cls === "resi").reduce((a, c) => a + c.energy, 0) / 1000,
      fleetRevPerKWday: fleetPower > 0 ? fleetRevenue / (fleetPower * 1000) : 0,
      fleetThroughputGWh: fleetThroughput / 1000,
      peakSysLoad: Math.max(...sysLoad) / 1000,
      peakHour,
      // What storage is actually delivering in the system's peak hour. (Peak
      // *net* load is a poor statistic here: when a run of hours share the same
      // price the schedule is indifferent between them, so the averaged
      // iterate spreads charging across all of them.)
      peakHourStorageGW: (fleetNet[peakHour] + gridNet[peakHour]) / 1000,
      peakHourFleetGW: fleetNet[peakHour] / 1000,
    },
  };
}

/** A build-out path: the same day solved at a ladder of fleet sizes. */
export function sweep(optsIn, homeLadder) {
  return homeLadder.map((homes) => {
    const r = simulate({ ...optsIn, homes });
    return {
      homes,
      marginal: Array.from(r.marginal),
      marginalZonal: Array.from(r.marginalZonal),
      stats: r.stats,
      zp: Object.fromEntries(ZONES.map((z) => [z, Array.from(r.zp[z])])),
    };
  });
}

export { ZONES, BUSES, LINES, GTCS };
