"use client";

import { useState } from "react";
import { ord } from "./format";
import { pairLogAsOf, winShare } from "./asOf";
import { num, signed } from "../../lib/format.js";

// tint strength (in % of the hue) per unit of win share away from even:
// a 100% or 0% share mixes in 45% of the hue
const TINT_PER_SHARE = 90;

export default function HeadToHead({ records, corePlayers, tooltip, events, date }) {
  const names = corePlayers.filter((n) => records[n]);
  const [pair, setPair] = useState(null); // {row, col}

  const cellTone = (share) =>
    share >= 0.5
      ? `color-mix(in srgb, var(--elo-pos) ${Math.round((share - 0.5) * TINT_PER_SHARE)}%, var(--bg))`
      : `color-mix(in srgb, var(--elo-neg) ${Math.round((0.5 - share) * TINT_PER_SHARE)}%, var(--bg))`;

  const togglePair = (row, col) =>
    setPair((prev) => (prev?.row === row && prev?.col === col ? null : { row, col }));

  const log = pair ? pairLogAsOf(events, pair.row, pair.col, date) : [];

  return (
    <>
      <div className="elo-tablewrap">
        <table className="elo-h2h">
          <thead>
            <tr>
              <th />
              {names.map((n) => (
                <th key={n} title={n}>
                  {n.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((row) => (
              <tr key={row}>
                <th className="elo-h2h__rowh">{row}</th>
                {names.map((col) => {
                  if (row === col)
                    return (
                      <td key={col} className="elo-dim">
                        ·
                      </td>
                    );
                  const r = records[row][col];
                  const share = winShare(r);
                  if (share === null)
                    return (
                      <td key={col} className="elo-dim">
                        —
                      </td>
                    );
                  const selected = pair?.row === row && pair?.col === col;
                  return (
                    <td
                      key={col}
                      className="elo-h2h__cell"
                      style={{
                        background: cellTone(share),
                        ...(selected
                          ? { outline: "2px solid var(--fg)", outlineOffset: "-2px" }
                          : {}),
                      }}
                      onClick={() => togglePair(row, col)}
                      onMouseMove={(ev) =>
                        tooltip.show(
                          <div>
                            {row} vs {col}: {r.w}–{r.l}
                            {r.t ? ` (${r.t} ties)` : ""} · {num(share * 100)}% win
                            share
                          </div>,
                          ev.clientX,
                          ev.clientY,
                        )
                      }
                      onMouseLeave={tooltip.hide}
                    >
                      {r.w}–{r.l}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pair && (
        <>
          <p className="elo-sub">
            {pair.row} vs {pair.col} — every rated play through {date}, newest
            first.
          </p>
          <div className="elo-tablewrap">
            <table className="elo-data">
              <thead>
                <tr>
                  <th>date</th>
                  <th>game</th>
                  <th>result</th>
                  <th>{pair.row}</th>
                  <th>{pair.col}</th>
                </tr>
              </thead>
              <tbody>
                {log.map((p, i) => (
                  <tr key={`${p.date}-${i}`}>
                    <td>{p.date}</td>
                    <td style={{ textAlign: "left" }}>{p.game}</td>
                    <td
                      className={
                        p.result === "won"
                          ? "elo-pos"
                          : p.result === "lost"
                            ? "elo-neg"
                            : "elo-dim"
                      }
                    >
                      {p.result}
                    </td>
                    <td>
                      {ord(p.a.rank)}
                      {p.a.score != null ? ` · ${p.a.score}` : ""}{" "}
                      <span className={p.a.delta >= 0 ? "elo-pos" : "elo-neg"}>
                        {signed(p.a.delta, 1)}
                      </span>
                    </td>
                    <td>
                      {ord(p.b.rank)}
                      {p.b.score != null ? ` · ${p.b.score}` : ""}{" "}
                      <span className={p.b.delta >= 0 ? "elo-pos" : "elo-neg"}>
                        {signed(p.b.delta, 1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
