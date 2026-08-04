"use client";

import { fmtDuration, shortName } from "./format";

function Half({ rows, offset }) {
  return (
    <div className="elo-tablewrap">
      <table className="elo-data">
        <thead>
          <tr>
            <th>nr</th>
            <th style={{ textAlign: "left" }}>game</th>
            <th>plays</th>
            <th>time</th>
            <th>players</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.game}>
              <td className="elo-dim">{offset + i + 1}</td>
              <td style={{ textAlign: "left" }} title={r.game}>
                {shortName(r.game)}
              </td>
              <td>{r.plays}</td>
              <td>{fmtDuration(r.hours)}</td>
              <td>{r.players}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GamesTable({ rows }) {
  if (rows.length === 0) return null;
  const split = Math.ceil(rows.length / 2);
  const right = rows.slice(split);
  return (
    <div className="elo-games-cols">
      <Half rows={rows.slice(0, split)} offset={0} />
      {right.length > 0 && <Half rows={right} offset={split} />}
    </div>
  );
}
