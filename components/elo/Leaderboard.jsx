"use client";

import { colorFor, isCore, fmt, sign } from "./format";

export default function Leaderboard({ players, corePlayers }) {
  const ordered = [...players].sort((a, b) => b.elo - a.elo);

  return (
    <div className="elo-tablewrap">
      <table className="elo-data">
        <thead>
          <tr>
            <th>player</th>
            <th>elo (90% ci)</th>
            <th>peak</th>
            <th>plays</th>
            <th>wins</th>
            <th>win rate</th>
            <th>pae</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((p) => {
            const pax = p.performanceAboveExpectation;
            return (
              <tr key={p.name}>
                <td>
                  <span className="elo-pname">
                    <span
                      className="elo-swatch"
                      style={{
                        background: colorFor(corePlayers, p.name),
                        opacity: isCore(corePlayers, p.name) ? 1 : 0.5,
                      }}
                    />
                    {p.name}
                  </span>
                </td>
                <td>
                  <strong>{fmt(p.elo)}</strong>{" "}
                  <span className="elo-dim">±{fmt(p.ci90)}</span>
                </td>
                <td>{fmt(p.peakElo)}</td>
                <td>{p.plays}</td>
                <td>{p.wins}</td>
                <td>{fmt(p.winRate * 100)}%</td>
                <td className={pax >= 0 ? "elo-pos" : "elo-neg"}>{sign(pax, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
