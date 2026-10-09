"use client";

import { niceTicks, usd, pct } from "./derive";

const W = 1000;
const H = 280;
const L = 56;
const R = 70;
const T = 12;
const B = 28;

const monthYear = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

// One set-booster's EV against its sealed price, week by week.
export default function SeriesChart({ points, color, tooltip, label }) {
  if (points.length < 2) {
    return <p className="subtitle">not enough weekly history yet to chart.</p>;
  }
  const yMax = Math.max(...points.flatMap((p) => [p.ev, p.price]));
  const ticks = niceTicks(0, yMax, 4);
  const top = ticks[ticks.length - 1];
  const x = (i) => L + (i / (points.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const path = (key) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
  const every = Math.ceil(points.length / 8);
  const last = points[points.length - 1];

  const hover = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const i = Math.round(((((ev.clientX - r.left) / r.width) * W - L) / (W - L - R)) * (points.length - 1));
    const p = points[Math.max(0, Math.min(points.length - 1, i))];
    tooltip.show(
      <>
        <div className="elo-tip__title">week of {p.week}</div>
        <table>
          <tbody>
            <tr><td>EV</td><td>{usd(p.ev)}</td></tr>
            <tr><td>pack</td><td>{usd(p.price)}</td></tr>
            <tr><td>EV ÷ price</td><td className={p.ratio >= 1 ? "elo-pos" : "elo-neg"}>{pct(p.ratio)}</td></tr>
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
          <line className={t === 0 ? "elo-baseline" : "elo-grid"} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end">{usd(t, top < 10 ? 2 : 0)}</text>
        </g>
      ))}
      {points.map((p, i) => (i % every === 0 ? <text key={p.week} x={x(i)} y={H - 9} textAnchor="middle">{monthYear(p.week)}</text> : null))}
      <path d={path("price")} fill="none" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="5 3" />
      <path d={path("ev")} fill="none" stroke={color} strokeWidth="2" />
      <text className="elo-lbl" x={W - R + 6} y={y(last.ev) + 4} fill={color}>EV</text>
      <text className="elo-lbl" x={W - R + 6} y={y(last.price) + (Math.abs(y(last.price) - y(last.ev)) < 13 ? 17 : 4)}>pack</text>
    </svg>
  );
}
