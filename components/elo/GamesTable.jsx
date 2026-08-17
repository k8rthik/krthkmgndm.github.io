"use client";

import { useMemo, useState } from "react";
import { fmtDuration, shortName } from "./format";
import { gameDetailAsOf } from "./gameDetail";
import GameDetail from "./GameDetail";

function Half({ rows, offset, selected, onSelect }) {
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
            <tr
              key={r.game}
              className={`elo-rowclick${
                selected === r.game ? " elo-rowclick--open" : ""
              }`}
              onClick={() => onSelect(r.game)}
            >
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

export default function GamesTable({ rows, events, date }) {
  const [selected, setSelected] = useState(null); // game whose sheet is open
  const toggle = (g) => setSelected((prev) => (prev === g ? null : g));
  const detail = useMemo(
    () => (selected ? gameDetailAsOf(events, selected, date) : null),
    [events, selected, date],
  );

  if (rows.length === 0) return null;
  const split = Math.ceil(rows.length / 2);
  const right = rows.slice(split);
  return (
    <>
      <div className="elo-games-cols">
        <Half rows={rows.slice(0, split)} offset={0} selected={selected} onSelect={toggle} />
        {right.length > 0 && (
          <Half rows={right} offset={split} selected={selected} onSelect={toggle} />
        )}
      </div>
      {/* narrow screens: the same rows as one table, no doubled header —
          CSS shows exactly one of the two layouts */}
      <div className="elo-games-one">
        <Half rows={rows} offset={0} selected={selected} onSelect={toggle} />
      </div>
      {selected && <GameDetail game={selected} detail={detail} date={date} />}
    </>
  );
}
