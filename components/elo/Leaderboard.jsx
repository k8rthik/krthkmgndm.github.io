"use client";

import { Fragment, useState } from "react";
import { colorFor, isCore, fmt, sign, shortName } from "./format";
import { signatureGame, nemesis } from "./insights";

const COLUMNS = [
  { key: "name", label: "player", numeric: false },
  { key: "elo", label: "elo (90% ci)", numeric: true },
  { key: "peak", label: "peak", numeric: true },
  { key: "plays", label: "plays", numeric: true },
  { key: "wins", label: "wins", numeric: true },
  { key: "winRate", label: "win rate", numeric: true },
  { key: "pae", label: "pae", numeric: true },
];

// the inline profile a regular's leaderboard row expands into — one
// label/value line per field
function ProfileRow({ player, affinity, h2h, extra }) {
  const sig = signatureGame(affinity.perGame[player]);
  const nem = nemesis(h2h[player]);
  return (
    <tr className="elo-profile">
      <td colSpan={COLUMNS.length} style={{ textAlign: "left" }}>
        <div className="elo-profile__grid">
          {extra && (
            <>
              <span className="elo-profile__k">form</span>
              <span>
                {extra.form.map((won, i) => (
                  <span key={i} className={won ? "elo-pos" : "elo-neg"}>
                    {won ? "W" : "L"}
                    {i < extra.form.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            </>
          )}
          {sig && (
            <>
              <span className="elo-profile__k">best game</span>
              <span>
                <span title={sig.game}>{shortName(sig.game)}</span>{" "}
                <span className={sig.delta >= 0 ? "elo-pos" : "elo-neg"}>
                  {sign(sig.delta)}
                </span>
              </span>
            </>
          )}
          {nem && (
            <>
              <span className="elo-profile__k">nemesis</span>
              <span>
                {nem.opp}{" "}
                <span className="elo-dim">
                  ({nem.w}–{nem.l})
                </span>
              </span>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Leaderboard({
  stats,
  corePlayers,
  affinity,
  h2h,
  extras,
}) {
  // numeric columns start descending, player name ascending
  const [sort, setSort] = useState({ key: "elo", dir: -1 });
  const [open, setOpen] = useState(null); // player name whose profile is open

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
      <table className="elo-data elo-lb">
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
          {ordered.map((p) => {
            const expandable = isCore(corePlayers, p.name);
            const expanded = open === p.name;
            return (
              <Fragment key={p.name}>
                <tr
                  className={
                    expandable
                      ? `elo-rowclick${expanded ? " elo-rowclick--open" : ""}`
                      : undefined
                  }
                  onClick={
                    expandable
                      ? () => setOpen((prev) => (prev === p.name ? null : p.name))
                      : undefined
                  }
                >
                  <td>
                    <span className="elo-pname">
                      <span
                        className="elo-swatch"
                        style={{
                          background: colorFor(corePlayers, p.name),
                          opacity: expandable ? 1 : 0.5,
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
                  <td className={p.pae >= 0 ? "elo-pos" : "elo-neg"}>
                    {sign(p.pae, 2)}
                  </td>
                </tr>
                {expanded && (
                  <ProfileRow
                    player={p.name}
                    affinity={affinity}
                    h2h={h2h}
                    extra={extras[p.name]}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
