"use client";

import { fmtDuration, shortName } from "./format";

export default function GamesTable({ hIndex, rows }) {
  if (rows.length === 0) return null;
  return (
    <>
      <p>
        group h-index: <strong>{hIndex}</strong> —{" "}
        {hIndex === 1
          ? "1 game played at least once"
          : `${hIndex} games played at least ${hIndex} times each`}
        .
      </p>
      <div className="elo-tablewrap">
        <table className="elo-data">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>game</th>
              <th>plays</th>
              <th>time</th>
              <th>players</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.game}>
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
    </>
  );
}
