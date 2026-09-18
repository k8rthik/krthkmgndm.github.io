// Price-taking storage arbitrage over a 24-hour price series, by dynamic
// programming on a discretised state of charge.
//
// A price taker is the right model here: neither a grid battery nor an
// aggregator sees its own effect on price when it bids, which is exactly why
// the fleet's build-out cannibalises its own margin.

// The state of charge must return to where it started, but *where* it starts is
// itself a choice: a battery facing one cheap block and one expensive block
// wants to open the day empty, not half full. Trying a few opening levels
// recovers that without paying for a start-level sweep.
const STARTS = [0, 0.25, 0.5, 0.75, 1];

// The discretisation is chosen so that one hour at full power is an exact whole
// number of levels. Pick the grid independently of the power limit and the two
// disagree: a 2 MW / 40 MWh unit on a 33-level grid can only move 1.25 MWh an
// hour, and the model quietly under-dispatches it by a third.
const TARGET_LEVELS = 33;
const MAX_LEVELS = 81;

function grid(power, energy) {
  const perHour = Math.max(1, Math.round((TARGET_LEVELS * power) / energy));
  let levels = Math.round((energy * perHour) / power) + 1;
  if (levels > MAX_LEVELS) {
    // Very long duration: fall back to a fixed grid and accept that a full
    // hour at rated power is no longer a whole number of levels.
    return { levels: MAX_LEVELS, step: energy / (MAX_LEVELS - 1), band: Math.max(1, Math.floor((power * (MAX_LEVELS - 1)) / energy)) };
  }
  if (levels < 2) levels = 2;
  return { levels, step: energy / (levels - 1), band: perHour };
}

/**
 * @param {Float64Array} price  $/MWh by hour
 * @param {number} power  MW (charge and discharge limit)
 * @param {number} energy MWh of usable capacity
 * @param {number} rt     round-trip efficiency
 * @param {number} deg    degradation cost, $/MWh of throughput
 * @returns {{value:number, ch:Float64Array, dis:Float64Array}}
 */
export function arbitrage(price, power, energy, rt, deg) {
  const T = price.length;
  const ch = new Float64Array(T);
  const dis = new Float64Array(T);
  if (power <= 0 || energy <= 0) return { value: 0, ch, dis };

  const eff = Math.sqrt(rt);
  const { levels: LEVELS, step, band } = grid(power, energy);

  // profit of moving from level i to level j during hour t, or -Infinity
  const move = (t, i, j) => {
    const d = (j - i) * step;
    if (d === 0) return 0;
    if (d > 0) {
      const draw = d / eff;                  // grid energy drawn to add d to the SOC
      if (draw > power + 1e-9) return -Infinity;
      return -(price[t] + deg) * draw;
    }
    const inject = -d * eff;                 // grid energy delivered
    if (inject > power + 1e-9) return -Infinity;
    return (price[t] - deg) * inject;
  };

  const V = Array.from({ length: T + 1 }, () => new Float64Array(LEVELS));
  const choice = Array.from({ length: T }, () => new Int16Array(LEVELS));
  let bestValue = 0, bestStart = -1, bestChoice = null;

  for (const frac of STARTS) {
    const start = Math.round(frac * (LEVELS - 1));
    V[T].fill(-Infinity);
    V[T][start] = 0;
    for (let t = T - 1; t >= 0; t--) {
      const vn = V[t + 1], vc = V[t], ct = choice[t];
      for (let i = 0; i < LEVELS; i++) {
        let best = -Infinity, bestJ = -1;
        const lo = Math.max(0, i - band), hi = Math.min(LEVELS - 1, i + band);
        for (let j = lo; j <= hi; j++) {
          const nxt = vn[j];
          if (nxt === -Infinity) continue;
          const m = move(t, i, j);
          if (m === -Infinity) continue;
          const v = m + nxt;
          if (v > best) { best = v; bestJ = j; }
        }
        vc[i] = best;
        ct[i] = bestJ;
      }
    }
    if (V[0][start] > bestValue + 1e-9) {
      bestValue = V[0][start];
      bestStart = start;
      bestChoice = choice.map((c) => Int16Array.from(c));
    }
  }

  const soc = new Float64Array(T);
  if (bestStart < 0) return { value: 0, ch, dis, soc };   // never worth cycling

  let i = bestStart;
  for (let t = 0; t < T; t++) {
    soc[t] = i * step;
    const j = bestChoice[t][i];
    if (j < 0) break;
    const d = (j - i) * step;
    if (d > 0) ch[t] = d / eff;
    else if (d < 0) dis[t] = -d * eff;
    i = j;
  }
  return { value: bestValue, ch, dis, soc };
}

/** State of charge trajectory implied by a charge/discharge schedule. */
export function socPath(ch, dis, energy, rt) {
  const eff = Math.sqrt(rt);
  const soc = new Float64Array(ch.length + 1);
  soc[0] = energy / 2;
  for (let t = 0; t < ch.length; t++) {
    soc[t + 1] = soc[t] + eff * ch[t] - dis[t] / eff;
  }
  return soc;
}
