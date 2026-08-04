"use client";

import { useMemo } from "react";
import { fmt } from "./format";

const W = 1000;
const H = 380;
const L = 46;
const R = 20;
const T = 14;
const B = 34;
const W_MIN = 0.5;
const W_MAX = 1.5;

const x = (c) => L + ((c - 1) / 4) * (W - L - R);
const y = (s) => T + (1 - s) * (H - T - B);
const radius = (g) => 5 + ((g.weightMultiplier - W_MIN) / (W_MAX - W_MIN)) * 15;

function shortName(name) {
  return name
    .replace(": Fourth Edition", " 4e")
    .replace(": Birmingham", "")
    .replace(": Party Edition", "");
}

// most-played games pick their label spot first; skip if nothing fits cleanly
function placeLabels(games, counts) {
  const boxes = games.map((g) => {
    const r = radius(g);
    return { x: x(g.bggWeight), y: y(g.skillIntensity), w: r * 2, h: r * 2, owner: g.name };
  });
  const placed = [];
  const toLabel = games
    .filter((g) => counts[g.name] >= 4 || g.weightMultiplier >= 1.3)
    .sort((a, b) => counts[b.name] - counts[a.name]);

  for (const g of toLabel) {
    const r = radius(g);
    const cx = x(g.bggWeight);
    const cy = y(g.skillIntensity);
    const label = shortName(g.name);
    const lw = label.length * 6.2;
    const clampX = (v) => Math.max(L + lw / 2 + 2, Math.min(W - R - lw / 2 - 2, v));
    const candidates = [
      { x: clampX(cx), y: cy - r - 10 },
      { x: clampX(cx), y: cy + r + 10 },
      { x: cx + r + 6 + lw / 2, y: cy },
      { x: cx - r - 6 - lw / 2, y: cy },
    ];
    const spot = candidates.find(
      (c) =>
        c.x - lw / 2 > L &&
        c.x + lw / 2 < W - R &&
        c.y > T &&
        c.y < H - B &&
        !boxes.some(
          (b) =>
            b.owner !== g.name &&
            Math.abs(c.x - b.x) < (lw + b.w) / 2 + 4 &&
            Math.abs(c.y - b.y) < (13 + b.h) / 2 + 2,
        ),
    );
    if (!spot) continue; // the tooltip carries it
    boxes.push({ x: spot.x, y: spot.y, w: lw, h: 13, owner: g.name });
    placed.push({ label, x: spot.x, y: spot.y });
  }
  return placed;
}

export default function GameScatter({ games, events, tooltip, highlight }) {
  const { played, counts, labels } = useMemo(() => {
    const tally = events.reduce(
      (acc, e) => ({ ...acc, [e.game]: (acc[e.game] || 0) + 1 }),
      {},
    );
    const active = games.filter((g) => tally[g.name]);
    return { played: active, counts: tally, labels: placeLabels(active, tally) };
  }, [games, events]);

  const showTip = (g) => (ev) =>
    tooltip.show(
      <>
        <div className="elo-tip__title">{g.name}</div>
        <div className="elo-tip__sub">
          {counts[g.name]} play{counts[g.name] > 1 ? "s" : ""} · elo multiplier ×
          {g.weightMultiplier.toFixed(2)}
        </div>
        <div>
          complexity {g.bggWeight.toFixed(2)} / 5 · skill {fmt(g.skillIntensity * 100)}%
        </div>
        <div className="elo-tip__sub">{g.skillNote.split("—")[1] || ""}</div>
      </>,
      ev.clientX,
      ev.clientY,
    );

  return (
    <div className="elo-chartwrap">
    <svg viewBox={`0 0 ${W} ${H}`} className="elo-chart">
      {[1, 2, 3, 4, 5].map((c) => (
        <g key={c}>
          <line x1={x(c)} x2={x(c)} y1={T} y2={H - B} className="elo-grid" />
          <text x={x(c)} y={H - 16} textAnchor="middle">
            {c}
          </text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 2} textAnchor="middle">
        complexity (bgg weight)
      </text>
      {[0, 0.25, 0.5, 0.75, 1].map((s) => (
        <g key={s}>
          <line x1={L} x2={W - R} y1={y(s)} y2={y(s)} className="elo-grid" />
          <text x={L - 8} y={y(s) + 4} textAnchor="end">
            {fmt(s * 100)}%
          </text>
        </g>
      ))}
      <text
        x={12}
        y={(T + H - B) / 2}
        transform={`rotate(-90 12 ${(T + H - B) / 2})`}
        textAnchor="middle"
      >
        skill intensity
      </text>

      {played.map((g) => {
        const lit = highlight?.has(g.name);
        return (
          <circle
            key={g.name}
            cx={x(g.bggWeight)}
            cy={y(g.skillIntensity)}
            r={radius(g)}
            style={
              lit
                ? { fill: "var(--elo-pos)", stroke: "var(--elo-pos)" }
                : { fill: "var(--elo-pos)" }
            }
            fillOpacity={lit ? 0.8 : highlight?.size ? 0.25 : 0.6}
            strokeWidth={lit ? 2 : undefined}
            className={lit ? undefined : "elo-dot"}
            onMouseMove={showTip(g)}
            onMouseLeave={tooltip.hide}
          />
        );
      })}
      {labels.map((lab) => (
        <text key={lab.label} x={lab.x} y={lab.y + 4} textAnchor="middle" className="elo-lbl">
          {lab.label}
        </text>
      ))}
    </svg>
    </div>
  );
}
