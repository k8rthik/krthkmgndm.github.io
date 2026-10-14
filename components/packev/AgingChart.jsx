"use client";

import { BREAK_EVEN, WEEKS_PER_YEAR, yearLabel, yearTicks } from "./derive";
import { pct } from "../../lib/format.js";
import { linePath, linear, niceTicks, plotArea, viewBoxX } from "../chart/scale.js";

const W = 420;
const H = 220;
const AREA = plotArea({ width: W, height: H, left: 44, right: 10, top: 10, bottom: 24 });

// Median EV / pack price by weeks since release, with the middle 50% of
// set-boosters as a band. One panel per booster role, shared y scale.
export default function AgingChart({ points, color, yMax, xMax, tooltip, label }) {
  const x = linear([0, xMax], [AREA.left, AREA.right]);
  const y = linear([0, yMax], [AREA.bottom, AREA.top]);
  const ticks = niceTicks(0, yMax, 4).filter((t) => t <= yMax + 1e-9);
  const years = yearTicks(xMax);

  const line = linePath(points.map((p) => [x(p.age), y(p.median)]));
  // the p75 edge left to right, then back along p25, closed
  const band =
    linePath([
      ...points.map((p) => [x(p.age), y(p.p75)]),
      ...points.toReversed().map((p) => [x(p.age), y(p.p25)]),
    ]) + "Z";

  const hover = (ev) => {
    const age = x.invert(viewBoxX(ev.clientX, ev.currentTarget.getBoundingClientRect(), W));
    const p = points.reduce((a, b) => (Math.abs(b.age - age) < Math.abs(a.age - age) ? b : a));
    tooltip.show(
      <>
        <div className="elo-tip__title">{label}, week {p.age}</div>
        <div>median {pct(p.median)} of pack price</div>
        <div className="elo-tip__sub">middle 50%: {pct(p.p25)}–{pct(p.p75)}</div>
        <div className="elo-tip__sub">{pct(p.shareAbove)} of {p.n} above price</div>
      </>,
      ev.clientX,
      ev.clientY,
    );
  };

  return (
    <svg className="elo-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: EV as a share of pack price by weeks since release`}
      onPointerMove={points.length ? hover : undefined} onPointerLeave={tooltip.hide}>
      {ticks.map((t) => (
        <g key={t}>
          <line className={t === BREAK_EVEN ? "elo-baseline" : "elo-grid"} x1={AREA.left} x2={AREA.right} y1={y(t)} y2={y(t)} />
          <text x={AREA.left - 6} y={y(t) + 4} textAnchor="end">{pct(t)}</text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr} x={x(yr * WEEKS_PER_YEAR)} y={H - 7} textAnchor={yr ? "middle" : "start"}>{yearLabel(yr)}</text>
      ))}
      <path d={band} fill={color} opacity="0.15" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
