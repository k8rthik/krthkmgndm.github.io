"use client";

import { dateTickIndices, monthYear, ratioTone } from "./derive";
import { pct, usd } from "../../lib/format.js";
import { clampIndex, linePath, linear, niceTicks, plotArea, viewBoxX } from "../chart/scale.js";

const W = 1000;
const H = 280;
const AREA = plotArea({ width: W, height: H, left: 56, right: 70, top: 12, bottom: 28 });

// One set-booster's EV against its sealed price, week by week.
export default function SeriesChart({ points, color, tooltip, label }) {
  if (points.length < 2) {
    return <p className="subtitle">not enough weekly history yet to chart.</p>;
  }
  const yMax = Math.max(...points.flatMap((p) => [p.ev, p.price]));
  const ticks = niceTicks(0, yMax, 4);
  const top = ticks[ticks.length - 1];
  const x = linear([0, points.length - 1], [AREA.left, AREA.right]);
  const y = linear([0, top], [AREA.bottom, AREA.top]);
  const path = (key) => linePath(points.map((p, i) => [x(i), y(p[key])]));
  const dateTicks = dateTickIndices(points.length);
  const last = points[points.length - 1];

  const hover = (ev) => {
    const px = viewBoxX(ev.clientX, ev.currentTarget.getBoundingClientRect(), W);
    const p = points[clampIndex(x.invert(px), points.length)];
    tooltip.show(
      <>
        <div className="elo-tip__title">week of {p.week}</div>
        <table>
          <tbody>
            <tr><td>EV</td><td>{usd(p.ev, 2)}</td></tr>
            <tr><td>pack</td><td>{usd(p.price, 2)}</td></tr>
            <tr><td>EV ÷ price</td><td className={ratioTone(p.ratio)}>{pct(p.ratio)}</td></tr>
          </tbody>
        </table>
      </>,
      ev.clientX,
      ev.clientY,
    );
  };

  return (
    <svg className="elo-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: EV and pack price by week`}
      onPointerMove={hover} onPointerLeave={tooltip.hide}>
      {ticks.map((t) => (
        <g key={t}>
          <line className={t === 0 ? "elo-baseline" : "elo-grid"} x1={AREA.left} x2={AREA.right} y1={y(t)} y2={y(t)} />
          <text x={AREA.left - 8} y={y(t) + 4} textAnchor="end">{usd(t, top < 10 ? 2 : 0)}</text>
        </g>
      ))}
      {dateTicks.map((i) => (
        <text key={points[i].week} x={x(i)} y={H - 9} textAnchor="middle">{monthYear(points[i].week)}</text>
      ))}
      <path d={path("price")} fill="none" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="5 3" />
      <path d={path("ev")} fill="none" stroke={color} strokeWidth="2" />
      <text className="elo-lbl" x={AREA.right + 6} y={y(last.ev) + 4} fill={color}>EV</text>
      <text className="elo-lbl" x={AREA.right + 6} y={y(last.price) + (Math.abs(y(last.price) - y(last.ev)) < 13 ? 17 : 4)}>pack</text>
    </svg>
  );
}
