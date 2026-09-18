"use client";

import { BUSES } from "./grid.js";
import { ZONE_LABEL, homesLabel } from "./format.js";

const SW = 130;
const SH = 26;

// value of the next marginal MW at each bus, plus how that value has moved
// over the whole build-out path. All eight sparklines share one vertical
// scale, so the panels compare.
function Spark({ xs, ys, yMax, xMax, markX }) {
  const px = (v) => (Math.log10(1 + v) / Math.log10(1 + xMax)) * (SW - 2);
  const py = (v) => SH - 3 - (v / yMax) * (SH - 6);
  const d = ys.map((v, i) => `${i ? "L" : "M"}${(1 + px(xs[i])).toFixed(1)},${py(v).toFixed(1)}`).join("");
  return (
    <svg className="erc-spark" viewBox={`0 0 ${SW} ${SH}`} aria-hidden="true">
      <line className="elo-grid" x1="0" y1={SH - 3} x2={SW} y2={SH - 3} />
      <path d={d} fill="none" stroke="var(--fg)" strokeWidth="1.5" />
      <line className="elo-grid" x1={1 + px(markX)} y1="2" x2={1 + px(markX)} y2={SH - 3} strokeDasharray="2 2" />
    </svg>
  );
}

export default function Siting({ marginal, ladder, homes, maxHomes }) {
  const rows = BUSES.map((b, i) => ({ bus: b, value: marginal[i], i }))
    .sort((a, b) => b.value - a.value);
  const xs = ladder ? ladder.map((r) => r.homes) : null;
  const yMax = ladder ? Math.max(...ladder.flatMap((r) => r.marginal), 1e-9) : 1;

  return (
    <div className="elo-tablewrap">
      <table className="elo-data">
        <thead>
          <tr>
            <th>bus</th>
            <th>zone</th>
            <th>$/kW-day</th>
            <th>0 &rarr; {homesLabel(maxHomes)} homes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ bus, value, i }) => (
            <tr key={bus.id}>
              <td>{bus.id}</td>
              <td>{ZONE_LABEL[bus.zone]}</td>
              <td>{value.toFixed(3)}</td>
              <td>
                {ladder ? (
                  <Spark
                    xs={xs}
                    ys={ladder.map((r) => r.marginal[i])}
                    yMax={yMax}
                    xMax={maxHomes}
                    markX={homes}
                  />
                ) : (
                  <span className="elo-dim">tracing&hellip;</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
