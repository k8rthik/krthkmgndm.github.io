"use client";

import { niceTicks, pct } from "./derive";

const W = 420;
const H = 220;
const L = 44;
const R = 10;
const T = 10;
const B = 24;

// Median EV / pack price by weeks since release, with the middle 50% of
// set-boosters as a band. One panel per booster role, shared y scale.
export default function AgingChart({ points, color, yMax, xMax, tooltip, label }) {
  const x = (age) => L + (age / xMax) * (W - L - R);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = niceTicks(0, yMax, 4).filter((t) => t <= yMax + 1e-9);
  const years = [0, 1, 2, 3, 4, 5].filter((yr) => yr * 52 <= xMax);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.age).toFixed(1)},${y(p.median).toFixed(1)}`).join("");
  const band =
    points.map((p, i) => `${i ? "L" : "M"}${x(p.age).toFixed(1)},${y(p.p75).toFixed(1)}`).join("") +
    [...points].reverse().map((p) => `L${x(p.age).toFixed(1)},${y(p.p25).toFixed(1)}`).join("") +
    "Z";

  const hover = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const age = (((ev.clientX - r.left) / r.width) * W - L) / (W - L - R) * xMax;
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
          <line className={t === 1 ? "elo-baseline" : "elo-grid"} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 6} y={y(t) + 4} textAnchor="end">{pct(t)}</text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr} x={x(yr * 52)} y={H - 7} textAnchor={yr ? "middle" : "start"}>{yr ? `${yr}y` : "launch"}</text>
      ))}
      <path d={band} fill={color} opacity="0.15" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
