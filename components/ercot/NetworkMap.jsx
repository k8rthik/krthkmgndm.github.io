"use client";

import { BUSES, LINES, GTCS, BUS_INDEX } from "./grid.js";
import { usd } from "./format.js";

const W = 1000;
const H = 620;
const PX = 90;
const PY = 46;

const x = (b) => PX + b.x * (W - 2 * PX);
const y = (b) => PY + b.y * (H - 2 * PY);

// three steps either side of lambda, so the map reads as a diverging scale
// rather than a rainbow
function shade(v, lambda, spread) {
  const t = Math.max(-1, Math.min(1, (v - lambda) / spread));
  if (Math.abs(t) < 0.06) return { fill: "var(--code-bg)", op: 1 };
  const op = Math.abs(t) < 0.34 ? 0.3 : Math.abs(t) < 0.7 ? 0.62 : 1;
  return { fill: t < 0 ? "var(--erc-lo)" : "var(--erc-hi)", op };
}

export default function NetworkMap({ lmp, lambda, flow, binding }) {
  const bindLine = new Map(binding.filter((b) => b.kind === "line").map((b) => [b.id, b]));
  const bindGtc = new Map(binding.filter((b) => b.kind === "gtc").map((b) => [b.id, b]));
  const spread = Math.max(6, ...lmp.map((v) => Math.abs(v - lambda)));

  return (
    <svg className="elo-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Eight-bus network, priced">
      {GTCS.map((g) => {
        const pts = new Set();
        for (const [id] of g.members) {
          const l = LINES.find((z) => z.id === id);
          pts.add(l.from);
          pts.add(l.to);
        }
        const xs = [...pts].map((p) => x(BUSES[BUS_INDEX[p]]));
        const ys = [...pts].map((p) => y(BUSES[BUS_INDEX[p]]));
        const on = bindGtc.get(g.id);
        const x0 = Math.min(...xs) - 34;
        const y0 = Math.min(...ys) - 34;
        // the envelopes overlap, so they carry no on-map text: the binding
        // list under the chart names each one and its shadow price
        return (
          <g key={g.id}>
            <rect
              x={x0}
              y={y0}
              width={Math.max(...xs) - Math.min(...xs) + 68}
              height={Math.max(...ys) - Math.min(...ys) + 68}
              fill="none"
              stroke={on ? "var(--erc-hi)" : "var(--rule)"}
              strokeWidth={on ? 2 : 1}
              strokeDasharray="6 5"
            >
              <title>{on ? `${g.id} binding, \u03bc ${usd(on.mu)}/MW` : `${g.id}, not binding`}</title>
            </rect>
          </g>
        );
      })}

      {LINES.map((l, i) => {
        const a = BUSES[BUS_INDEX[l.from]];
        const b = BUSES[BUS_INDEX[l.to]];
        const load = Math.min(1, Math.abs(flow[i]) / l.limit);
        const bind = bindLine.get(l.id);
        return (
          <g key={l.id}>
            <line
              x1={x(a)}
              y1={y(a)}
              x2={x(b)}
              y2={y(b)}
              stroke={bind ? "var(--erc-hi)" : "var(--fg)"}
              strokeWidth={1 + load * 5}
              strokeOpacity={bind ? 1 : 0.18 + load * 0.42}
              strokeLinecap="round"
            />
            {bind && (
              <text
                className="erc-bind"
                x={(x(a) + x(b)) / 2}
                y={(y(a) + y(b)) / 2 - 5}
                textAnchor="middle"
              >
                {`μ ${usd(bind.mu)}`}
              </text>
            )}
          </g>
        );
      })}

      {BUSES.map((b, i) => {
        const s = shade(lmp[i], lambda, spread);
        return (
          <g key={b.id}>
            <circle cx={x(b)} cy={y(b)} r="26" fill={s.fill} fillOpacity={s.op} stroke="var(--fg)" strokeWidth="1" />
            <text className="elo-lbl" x={x(b)} y={y(b) + 4} textAnchor="middle">
              {Math.round(lmp[i])}
            </text>
            <text x={x(b)} y={y(b) + 42} textAnchor="middle">{b.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
