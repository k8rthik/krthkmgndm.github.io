"use client";

import { useState } from "react";
import { colorFor, isCore, fmt, sign } from "./format";

const COLUMNS = [
  { key: "name", label: "player", numeric: false },
  { key: "elo", label: "elo (90% ci)", numeric: true },
  { key: "peak", label: "peak", numeric: true },
  { key: "plays", label: "plays", numeric: true },
  { key: "wins", label: "wins", numeric: true },
  { key: "winRate", label: "win rate", numeric: true },
  { key: "pae", label: "pae", numeric: true },
];

export default function Leaderboard({ stats, corePlayers }) {
  // numeric columns start descending, player name ascending
  const [sort, setSort] = useState({ key: "elo", dir: -1 });

  const toggleSort = (col) =>
    setSort((prev) =>
      prev.key === col.key
        ? { key: col.key, dir: -prev.dir }
        : { key: col.key, dir: col.numeric ? -1 : 1 },
    );

  const ordered = [...stats].sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return cmp * sort.dir;
  });

  return (
    <div className="elo-tablewrap">
      <table className="elo-data">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                aria-sort={
                  sort.key === col.key
                    ? sort.dir > 0
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  className="elo-sortbtn"
                  onClick={() => toggleSort(col)}
                >
                  {col.label}
                  {sort.key === col.key ? (sort.dir > 0 ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((p) => (
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
              <td>{fmt(p.peak)}</td>
              <td>{p.plays}</td>
              <td>{p.wins}</td>
              <td>{fmt(p.winRate * 100)}%</td>
              <td className={p.pae >= 0 ? "elo-pos" : "elo-neg"}>{sign(p.pae, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
