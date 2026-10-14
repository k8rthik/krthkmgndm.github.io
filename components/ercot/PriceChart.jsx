"use client";

import { useRef } from "react";
import { ZONES } from "./grid.js";
import { ZONE_LABEL, ZONE_VAR, hhmm } from "./format.js";
import { usd } from "../../lib/format.js";
import { clampIndex, linePath, linear, niceTicks, plotArea, spreadLabels, viewBoxX } from "../chart/scale.js";

const W = 1000;
const H = 320;
const LABEL_GAP = 13;
const AREA = plotArea({ width: W, height: H, left: 52, right: 78, top: 14, bottom: 28 });

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
  const ticks = niceTicks(Math.min(...all) - pad, Math.max(...all) + pad, 5);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const last = lambda.length - 1; // final hour index of the day
  const x = linear([0, last], [AREA.left, AREA.right]);
  const y = linear([lo, hi], [AREA.bottom, AREA.top]);
  const path = (vals) => linePath(vals.map((v, i) => [x(i), y(v)]));

  // de-overlap the end labels, same approach as the rating chart
  const labels = spreadLabels(
    [...lines, { key: "lambda", label: "λ", color: "var(--dim)", values: Array.from(lambda) }]
      .map((s) => ({ ...s, ey: y(s.values[last]) })),
    LABEL_GAP,
  );

  const pick = (ev) => {
    if (!ref.current || !onHour) return;
    const px = viewBoxX(ev.clientX, ref.current.getBoundingClientRect(), W);
    onHour(clampIndex(x.invert(px), last + 1));
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
          <line className={t === 0 ? "elo-baseline" : "elo-grid"} x1={AREA.left} x2={AREA.right} y1={y(t)} y2={y(t)} />
          <text x={AREA.left - 8} y={y(t) + 4} textAnchor="end">{usd(t)}</text>
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
          <line className="elo-baseline" x1={x(hour)} x2={x(hour)} y1={AREA.top} y2={AREA.bottom} strokeDasharray="3 3" />
          {lines.map((s) => (
            <circle key={s.key} className="elo-dot" cx={x(hour)} cy={y(s.values[hour])} r="3.5" fill={s.color} />
          ))}
        </g>
      )}

      {labels.map((s) => (
        <text key={s.key} className="elo-lbl" x={AREA.right + 6} y={Math.min(s.ly + 4, AREA.bottom)} fill={s.color}>
          {s.label}
        </text>
      ))}

      <rect
        x={AREA.left}
        y={AREA.top}
        width={AREA.right - AREA.left}
        height={AREA.bottom - AREA.top}
        fill="transparent"
        style={{ cursor: "crosshair" }}
      />
      <title>{`Load Zone prices, hour ${hhmm(hour ?? 0)}`}</title>
    </svg>
  );
}
