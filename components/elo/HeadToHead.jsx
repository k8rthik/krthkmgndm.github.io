"use client";

import { fmt } from "./format";

export default function HeadToHead({ headToHead, corePlayers, tooltip }) {
  const names = corePlayers.filter((n) => headToHead[n]);

  const cellTone = (share) =>
    share >= 0.5
      ? `color-mix(in srgb, var(--elo-pos) ${Math.round((share - 0.5) * 90)}%, var(--bg))`
      : `color-mix(in srgb, var(--elo-neg) ${Math.round((0.5 - share) * 90)}%, var(--bg))`;

  return (
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
                const r = headToHead[row][col];
                const games = r.w + r.l + r.t;
                if (!games)
                  return (
                    <td key={col} className="elo-dim">
                      —
                    </td>
                  );
                const share = (r.w + 0.5 * r.t) / games;
                return (
                  <td
                    key={col}
                    style={{ background: cellTone(share) }}
                    onMouseMove={(ev) =>
                      tooltip.show(
                        <div>
                          {row} vs {col}: {r.w}–{r.l}
                          {r.t ? ` (${r.t} ties)` : ""} · {fmt(share * 100)}% win share
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
  );
}
