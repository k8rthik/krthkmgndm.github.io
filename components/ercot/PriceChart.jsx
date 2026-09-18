"use client";

import { useRef } from "react";
import { ZONES } from "./grid.js";
import { ZONE_LABEL, ZONE_VAR, usd, hhmm } from "./format.js";

const W = 1000;
const H = 320;
const L = 52;
const R = 78;
const T = 14;
const B = 28;
const LABEL_GAP = 13;

function niceTicks(lo, hi) {
  const raw = (hi - lo) / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

export default function PriceChart({ zp, lambda, ghost, hour, onHour }) {
  const ref = useRef(null);

  const lines = ZONES.map((z) => ({
    key: z,
    label: ZONE_LABEL[z],
    color: ZONE_VAR[z],
    values: Array.from(zp[z]),
  }));

  const all = [...lines.flatMap((s) => s.values), ...lambda];
  if (ghost) all.push(...ZONES.flatMap((z) => Array.from(ghost[z])));
  const pad = (Math.max(...all) - Math.min(...all)) * 0.12 || 1;
  const ticks = niceTicks(Math.min(...all) - pad, Math.max(...all) + pad);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const x = (i) => L + (i / 23) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = (vals) =>
    vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  // de-overlap the end labels, same approach as the rating chart
  const labels = [...lines, { key: "lambda", label: "λ", color: "var(--dim)", values: Array.from(lambda) }]
    .map((s) => ({ ...s, ey: y(s.values[23]) }))
    .sort((a, b) => a.ey - b.ey)
    .reduce((acc, s) => {
      const prev = acc[acc.length - 1];
      return [...acc, { ...s, ly: prev ? Math.max(s.ey, prev.ly + LABEL_GAP) : s.ey }];
    }, []);

  const pick = (ev) => {
    if (!ref.current || !onHour) return;
    const r = ref.current.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    onHour(Math.max(0, Math.min(23, Math.round(((px - L) / (W - L - R)) * 23))));
  };

  return (
    <svg
      ref={ref}
      className="elo-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Load Zone prices by hour"
      onPointerMove={pick}
      onPointerDown={pick}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className={t === 0 ? "elo-baseline" : "elo-grid"} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end">{usd(t)}</text>
        </g>
      ))}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
        <text key={h} x={x(h)} y={H - 9} textAnchor="middle">{String(h).padStart(2, "0")}</text>
      ))}

      {ghost &&
        ZONES.map((z) => (
          <path
            key={`g-${z}`}
            d={path(Array.from(ghost[z]))}
            fill="none"
            stroke={ZONE_VAR[z]}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.45"
          />
        ))}

      <path d={path(Array.from(lambda))} fill="none" stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="4 3" />
      {lines.map((s) => (
        <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" />
      ))}

      {hour !== null && hour !== undefined && (
        <g>
          <line className="elo-baseline" x1={x(hour)} x2={x(hour)} y1={T} y2={H - B} strokeDasharray="3 3" />
          {lines.map((s) => (
            <circle key={s.key} className="elo-dot" cx={x(hour)} cy={y(s.values[hour])} r="3.5" fill={s.color} />
          ))}
        </g>
      )}

      {labels.map((s) => (
        <text key={s.key} className="elo-lbl" x={W - R + 6} y={Math.min(s.ly + 4, H - B)} fill={s.color}>
          {s.label}
        </text>
      ))}

      <rect
        x={L}
        y={T}
        width={W - L - R}
        height={H - T - B}
        fill="transparent"
        style={{ cursor: "crosshair" }}
      />
      <title>{`Load Zone prices, hour ${hhmm(hour ?? 0)}`}</title>
    </svg>
  );
}
