"use client";

import { useMemo, useRef, useState } from "react";
import { colorFor, isCore, fmt, sign } from "./format";
import { eventSpanAt } from "./series";

const W = 1000;
const H = 420;
const L = 46;
const R = 76;
const T = 12;
const B = 30;
const LABEL_GAP = 14;

function buildLayout(series, corePlayers) {
  const names = Object.keys(series).filter((n) => isCore(corePlayers, n));
  const allPts = names.flatMap((n) => series[n]);
  const xMax = Math.max(...allPts.map((p) => p[0]));
  const yMin = Math.floor((Math.min(...allPts.map((p) => p[1])) - 15) / 50) * 50;
  const yMax = Math.ceil((Math.max(...allPts.map((p) => p[1])) + 15) / 50) * 50;
  const x = (h) => L + (h / xMax) * (W - L - R);
  const y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);

  const lines = names.map((name) => {
    const pts = series[name];
    const d = pts
      .map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`)
      .join("");
    const last = pts[pts.length - 1];
    return { name, d, ex: x(last[0]), ey: y(last[1]) };
  });

  // de-overlap end labels top-to-bottom; nudged labels get a leader line
  const labels = [...lines]
    .sort((a, b) => a.ey - b.ey)
    .reduce((acc, line) => {
      const prev = acc[acc.length - 1];
      const ly = prev ? Math.max(line.ey, prev.ly + LABEL_GAP) : line.ey;
      return [...acc, { ...line, ly }];
    }, []);

  return { xMax, yMin, yMax, x, y, lines, labels };
}

export default function RatingChart({ series, events, corePlayers, tooltip, band }) {
  const svgRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const layout = useMemo(() => buildLayout(series, corePlayers), [series, corePlayers]);
  const { xMax, yMin, yMax, x, y, lines, labels } = layout;

  const yTicks = [];
  for (let v = yMin; v <= yMax; v += 50) yTicks.push(v);
  const xTicks = [];
  for (let h = 0; h <= xMax; h += 25) xTicks.push(h);

  const handleMove = (ev) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const hx = ((ev.clientX - rect.left) / rect.width) * W;
    const hours = ((hx - L) / (W - L - R)) * xMax;
    const span = eventSpanAt(events, hours);
    if (!span) return;
    const best = span.event;
    setHovered(span);
    tooltip.show(
      <>
        <div className="elo-tip__title">{best.game}</div>
        <div className="elo-tip__sub">
          {best.date} · {best.estimated ? "~" : ""}
          {fmt(span.end - span.start, 1)}h
        </div>
        <table>
          <tbody>
            {best.seats.map((s) => (
              <tr key={s.name}>
                <td>
                  {s.rank}. {s.name}
                  {s.score ? ` · ${s.score}` : ""}
                </td>
                <td className={s.delta >= 0 ? "elo-pos" : "elo-neg"}>
                  {sign(s.delta, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>,
      ev.clientX,
      ev.clientY,
      {
        left: rect.left + (x(span.start) / W) * rect.width,
        right: rect.left + (x(span.end) / W) * rect.width,
      },
    );
  };

  const handleLeave = () => {
    setHovered(null);
    tooltip.hide();
  };

  return (
    // on narrow screens the wrapper scrolls, opening at the right edge
    // (row-reverse) so the current standings show first
    <div className="elo-chartwrap elo-chartwrap--end">
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="elo-chart">
      {band && (
        <rect
          x={x(band.start)}
          y={T}
          width={Math.max(x(band.end) - x(band.start), 2)}
          height={H - T - B}
          style={{ fill: "var(--elo-pos)", stroke: "var(--elo-pos)" }}
          fillOpacity="0.08"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      )}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="elo-grid" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}
      {xTicks.map((h) => (
        <text key={h} x={x(h)} y={H - 8} textAnchor="middle">
          {h}
          {h === 0 ? "h" : ""}
        </text>
      ))}
      <line x1={L} x2={W - R} y1={y(1000)} y2={y(1000)} className="elo-baseline" />

      {lines.map((line) => (
        <g
          key={line.name}
          className="elo-fade"
          opacity={
            hovered && !hovered.event.seats.some((s) => s.name === line.name)
              ? 0.15
              : 1
          }
        >
          <path
            d={line.d}
            fill="none"
            style={{ stroke: colorFor(corePlayers, line.name) }}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={line.ex}
            cy={line.ey}
            r="4"
            style={{ fill: colorFor(corePlayers, line.name) }}
            className="elo-dot"
          />
        </g>
      ))}

      {labels.map((lab) => (
        <g key={lab.name}>
          {Math.abs(lab.ly - lab.ey) > 2 && (
            <line
              x1={lab.ex + 5}
              y1={lab.ey}
              x2={lab.ex + 12}
              y2={lab.ly}
              className="elo-baseline"
            />
          )}
          <text x={lab.ex + 14} y={lab.ly + 4} className="elo-lbl">
            {lab.name}
          </text>
        </g>
      ))}

      {hovered && (
        <rect
          x={x(hovered.start)}
          y={T}
          width={Math.max(x(hovered.end) - x(hovered.start), 2)}
          height={H - T - B}
          style={{ fill: "var(--fg)" }}
          fillOpacity="0.06"
        />
      )}
      <rect
        x={L}
        y={T}
        width={W - L - R}
        height={H - T - B}
        fill="transparent"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      />
    </svg>
    </div>
  );
}
