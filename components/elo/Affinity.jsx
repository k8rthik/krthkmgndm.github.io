"use client";

import { colorFor, sign, shortName } from "./format";

// tint strength tracks |delta| against the biggest swing on the board;
// near-zero cells stay close to the page background so the extremes pop
const tintFor = (delta, maxAbs) => {
  const alpha = Math.round(10 + 45 * (Math.abs(delta) / maxAbs));
  const hue = delta >= 0 ? "var(--elo-pos)" : "var(--elo-neg)";
  return `color-mix(in srgb, ${hue} ${alpha}%, var(--bg))`;
};

export default function Affinity({ affinity, corePlayers, tooltip }) {
  const { perGame, games, maxAbs } = affinity;
  const names = corePlayers.filter(
    (n) => Object.keys(perGame[n] ?? {}).length > 0,
  );

  return (
    <div className="elo-tablewrap">
      <table className="elo-aff">
        <thead>
          <tr>
            <th />
            {games.map((g) => (
              <th key={g} className="elo-aff__colh" title={g}>
                {shortName(g)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((n) => (
            <tr key={n}>
              <th className="elo-aff__rowh">
                <span className="elo-pname">
                  <span
                    className="elo-swatch"
                    style={{ background: colorFor(corePlayers, n) }}
                  />
                  {n}
                </span>
              </th>
              {games.map((g) => {
                const cell = perGame[n][g];
                if (!cell)
                  return (
                    <td key={g} className="elo-dim">
                      ·
                    </td>
                  );
                return (
                  <td
                    key={g}
                    style={{ background: tintFor(cell.delta, maxAbs) }}
                    onMouseMove={(ev) =>
                      tooltip.show(
                        <div>
                          {n} at {g}: {cell.wins}W–{cell.plays - cell.wins}L
                        </div>,
                        ev.clientX,
                        ev.clientY,
                      )
                    }
                    onMouseLeave={tooltip.hide}
                  >
                    {sign(cell.delta)}
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
