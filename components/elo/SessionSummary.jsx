"use client";

import { colorFor, isCore, fmt, sign } from "./format";

export default function SessionSummary({ sessions, corePlayers, date, onDateChange }) {
  const session = sessions.find((s) => s.date === date) ?? sessions[0];
  if (!session) return null;

  return (
    <>
      <p className="elo-selectrow">
        <select
          className="elo-select"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label="choose session date"
        >
          {sessions.map((s, i) => (
            <option key={s.date} value={s.date}>
              {s.date}
              {i === 0 ? " (latest)" : ""}
            </option>
          ))}
        </select>
      </p>
      <p className="elo-sub">{session.games.join(" · ")}</p>
      <div className="elo-tablewrap">
        <table className="elo-data">
          <thead>
            <tr>
              <th>player</th>
              <th>elo</th>
              <th>Δ</th>
              <th>pae</th>
            </tr>
          </thead>
          <tbody>
            {session.players.map((p) => (
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
                  <strong>{fmt(p.eloEnd)}</strong>
                </td>
                <td className={p.delta >= 0 ? "elo-pos" : "elo-neg"}>
                  {sign(p.delta, 1)}
                </td>
                <td className={p.pae >= 0 ? "elo-pos" : "elo-neg"}>{sign(p.pae, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
