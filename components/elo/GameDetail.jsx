"use client";

import { fmt, sign, shortName } from "./format";

// scores are usually whole; show one decimal only when averaging made one
const fmtScore = (x) => fmt(x, Number.isInteger(x) ? 0 : 1);

function ScoreRec({ rec }) {
  return (
    <span>
      {fmtScore(rec.score)}{" "}
      <span className="elo-dim">
        · {rec.name} · {rec.date}
      </span>
    </span>
  );
}

// the stat sheet a games-table row expands into — pure renderer over
// gameDetailAsOf's output
export default function GameDetail({ game, detail, date }) {
  if (!detail)
    return (
      <p className="elo-sub">
        no rated plays of {shortName(game)} through {date} — the stat sheet
        needs ranked results.
      </p>
    );

  const { longest, current } = detail.streak;
  return (
    <>
      <p className="elo-sub">
        {shortName(game)} — {detail.ratedPlays} rated{" "}
        {detail.ratedPlays === 1 ? "play" : "plays"} through {date}
        {detail.scoredPlays === 0 ? " (rank-only, no scores logged)" : ""}.
      </p>

      <div className="elo-profile__grid elo-gamedetail">
        {detail.avgScore !== null && (
          <>
            <span className="elo-profile__k">avg score</span>
            <span>{fmtScore(detail.avgScore)}</span>
          </>
        )}
        {detail.trend !== null && (
          <>
            <span className="elo-profile__k">score trend</span>
            <span className={detail.trend >= 0 ? "elo-pos" : "elo-neg"}>
              {sign(detail.trend * 100, 1)}% per play
            </span>
          </>
        )}
        {detail.highWin && (
          <>
            <span className="elo-profile__k">best winning score</span>
            <ScoreRec rec={detail.highWin} />
          </>
        )}
        {detail.lowWin && detail.lowWin.score !== detail.highWin.score && (
          <>
            <span className="elo-profile__k">lowest winning score</span>
            <ScoreRec rec={detail.lowWin} />
          </>
        )}
        {detail.highLoss && (
          <>
            <span className="elo-profile__k">best losing score</span>
            <ScoreRec rec={detail.highLoss} />
          </>
        )}
        {longest && (
          <>
            <span className="elo-profile__k">longest streak</span>
            <span>
              {longest.name} — {longest.len} straight{" "}
              <span className="elo-dim">
                ({longest.start} – {longest.end})
              </span>
            </span>
          </>
        )}
        {current.length > 0 && (
          <>
            <span className="elo-profile__k">reigning winner</span>
            <span>
              {current.map((c, i) => (
                <span key={c.name}>
                  {i > 0 ? ", " : ""}
                  {c.name}
                  {c.len > 1 && (
                    <span className="elo-dim"> · {c.len} straight</span>
                  )}
                </span>
              ))}
            </span>
          </>
        )}
      </div>

      {detail.factionRows.length > 0 && (
        <>
          <p className="elo-sub">
            faction performance — factions logged on {detail.rolePlays} of{" "}
            {detail.ratedPlays} plays.
          </p>
          <div className="elo-tablewrap">
            <table className="elo-data">
              <thead>
                <tr>
                  <th>faction</th>
                  <th>plays</th>
                  <th>wins</th>
                  <th>win rate</th>
                </tr>
              </thead>
              <tbody>
                {detail.factionRows.map((f) => (
                  <tr key={f.role}>
                    <td>{f.role}</td>
                    <td>{f.plays}</td>
                    <td>{f.wins}</td>
                    <td>{fmt((f.wins / f.plays) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="elo-tablewrap">
        <table className="elo-data">
          <thead>
            <tr>
              <th>player</th>
              <th>plays</th>
              <th>wins</th>
              <th>win rate</th>
              <th>avg score</th>
              <th>best</th>
            </tr>
          </thead>
          <tbody>
            {detail.playerRows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.plays}</td>
                <td>{r.wins}</td>
                <td>{fmt((r.wins / r.plays) * 100)}%</td>
                <td>{r.avgScore !== null ? fmtScore(r.avgScore) : "—"}</td>
                <td>{r.bestScore !== null ? fmtScore(r.bestScore) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="elo-sub">play log, newest first.</p>
      <div className="elo-tablewrap">
        <table className="elo-data">
          <thead>
            <tr>
              <th>date</th>
              <th>winner</th>
              <th>win score</th>
              <th>table avg</th>
              <th>players</th>
            </tr>
          </thead>
          <tbody>
            {detail.history.map((p, i) => (
              <tr key={`${p.date}-${i}`}>
                <td>{p.date}</td>
                <td>
                  {p.winners.length > 0 ? (
                    p.winners.join(", ")
                  ) : (
                    <span className="elo-dim">tie</span>
                  )}
                </td>
                <td>{p.winScore !== null ? fmtScore(p.winScore) : "—"}</td>
                <td>{p.avgScore !== null ? fmtScore(p.avgScore) : "—"}</td>
                <td>{p.seats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
