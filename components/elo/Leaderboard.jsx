"use client";

import { Fragment, useMemo, useState } from "react";
import { colorFor, isCore, fmt, ord, sign, shortName } from "./format";
import { signatureGame, nemesis, playerHistoryAsOf } from "./insights";

const COLUMNS = [
  { key: "name", label: "player", numeric: false },
  { key: "elo", label: "elo (90% ci)", numeric: true },
  { key: "peak", label: "peak", numeric: true },
  { key: "plays", label: "plays", numeric: true },
  { key: "wins", label: "wins", numeric: true },
  { key: "winRate", label: "win rate", numeric: true },
  { key: "pae", label: "pae", numeric: true },
];

// the inline profile a leaderboard row expands into — one label/value
// line per field
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
  events,
  date,
}) {
  // numeric columns start descending, player name ascending
  const [sort, setSort] = useState({ key: "elo", dir: -1 });
  const [open, setOpen] = useState(null); // player name whose profile is open

  const history = useMemo(
    () => (open ? playerHistoryAsOf(events, open, date) : []),
    [events, open, date],
  );

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
    <>
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
              const expanded = open === p.name;
              return (
                <Fragment key={p.name}>
                  <tr
                    className={`elo-rowclick${expanded ? " elo-rowclick--open" : ""}`}
                    onClick={() =>
                      setOpen((prev) => (prev === p.name ? null : p.name))
                    }
                  >
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

      {open && history.length > 0 && (
        <>
          <p className="elo-sub">
            {open} — every rated play through {date}, newest first.
          </p>
          <div className="elo-tablewrap">
            <table className="elo-data">
              <thead>
                <tr>
                  <th>date</th>
                  <th style={{ textAlign: "left" }}>game</th>
                  <th>result</th>
                  <th>score</th>
                  <th>Δ elo</th>
                  <th>elo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p, i) => (
                  <tr key={`${p.date}-${i}`}>
                    <td>{p.date}</td>
                    <td style={{ textAlign: "left" }} title={p.game}>
                      {shortName(p.game)}
                    </td>
                    <td className={p.won ? "elo-pos" : "elo-neg"}>
                      {ord(p.rank)} of {p.seats}
                    </td>
                    <td>{p.score !== null ? p.score : "—"}</td>
                    <td className={p.delta >= 0 ? "elo-pos" : "elo-neg"}>
                      {sign(p.delta, 1)}
                    </td>
                    <td>{fmt(p.elo)}</td>
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
