// Per-game stat sheet for the games table: score records, the score
// trend, win streaks, and per-player and per-faction records at one
// game, all through the selected date. Input is the payload's events — rated plays are the
// only plays that carry ranks, scores, and winner flags, so unrated
// plays (counted in the games table proper) never appear here.
//
// Known data quirks (enforced in tests/data-invariants.test.js) that
// everything below tolerates: scores may be null (rank-only games), a
// play can have zero official winners (full tie) or several (BG Stats
// flags on a broken tie).
import { scoreOf } from "./format.js";

// a score trend needs this many scored plays — three points fit anything
export const TREND_MIN_SCORED_PLAYS = 4;

// a "longest streak" needs at least back-to-back wins to be worth a line
export const STREAK_MIN_LEN = 2;

export function gameDetailAsOf(events, game, date) {
  const plays = events.filter((e) => e.game === game && e.date <= date);
  if (plays.length === 0) return null;

  let scoreSum = 0;
  let scoreN = 0;
  let highWin = null;
  let lowWin = null;
  let highLoss = null;
  const playMeans = [];
  const perPlayer = {};
  const perRole = {}; // faction/side records, for games that log them
  const runs = {}; // per player: their active win run across plays they sat in
  let longest = null; // ties keep the first run to reach the length
  const history = [];

  let rolePlays = 0; // plays where at least one seat logged a faction
  for (const e of plays) {
    const winners = e.seats.filter((s) => s.won);
    if (e.seats.some((s) => s.role)) rolePlays += 1;
    let playSum = 0;
    let playN = 0;
    let winScore = null;

    for (const s of e.seats) {
      const p =
        perPlayer[s.name] ??
        (perPlayer[s.name] = { plays: 0, wins: 0, sum: 0, n: 0, best: null });
      p.plays += 1;

      if (s.role) {
        const f = perRole[s.role] ?? (perRole[s.role] = { plays: 0, wins: 0 });
        f.plays += 1;
        if (s.won) f.wins += 1;
      }

      const run = runs[s.name] ?? (runs[s.name] = { len: 0, start: null });
      if (s.won) {
        p.wins += 1;
        run.len += 1;
        if (run.len === 1) run.start = e.date;
        if (!longest || run.len > longest.len)
          longest = { name: s.name, len: run.len, start: run.start, end: e.date };
      } else {
        run.len = 0;
      }

      const sc = scoreOf(s.score);
      if (sc === null) continue;
      scoreSum += sc;
      scoreN += 1;
      playSum += sc;
      playN += 1;
      p.sum += sc;
      p.n += 1;
      if (p.best === null || sc > p.best) p.best = sc;

      const rec = { score: sc, name: s.name, date: e.date };
      if (s.won) {
        if (!highWin || sc > highWin.score) highWin = rec;
        if (!lowWin || sc < lowWin.score) lowWin = rec;
        if (winScore === null || sc > winScore) winScore = sc;
      } else if (winners.length > 0) {
        // a full tie has no losers — only true runners-up count here
        if (!highLoss || sc > highLoss.score) highLoss = rec;
      }
    }

    if (playN > 0) playMeans.push(playSum / playN);
    history.push({
      date: e.date,
      winners: winners.map((s) => s.name),
      winScore,
      avgScore: playN > 0 ? playSum / playN : null,
      seats: e.seats.length,
    });
  }

  // score trend: least-squares slope of per-play mean scores, normalized
  // by their grand mean so it reads as "fraction of a typical play's
  // score gained per play" — pod-level learning, independent of results
  let trend = null;
  if (playMeans.length >= TREND_MIN_SCORED_PLAYS) {
    const mu = playMeans.reduce((t, m) => t + m, 0) / playMeans.length;
    if (mu > 0) {
      const xm = (playMeans.length - 1) / 2;
      let cov = 0;
      let varx = 0;
      playMeans.forEach((m, i) => {
        cov += (i - xm) * (m / mu - 1); // normalized ys average exactly 1
        varx += (i - xm) ** 2;
      });
      trend = cov / varx;
    }
  }

  // the reigning winner(s): whoever won the latest play, with their
  // active run; a full tie leaves the throne empty
  const current = history[history.length - 1].winners.map((name) => ({
    name,
    len: runs[name].len,
  }));

  const playerRows = Object.entries(perPlayer)
    .map(([name, p]) => ({
      name,
      plays: p.plays,
      wins: p.wins,
      avgScore: p.n > 0 ? p.sum / p.n : null,
      bestScore: p.best,
    }))
    // most wins first; equal wins go to the larger sample so regulars
    // outrank one-off guests (the kingpin tiebreak, applied to ordering)
    .sort(
      (a, b) =>
        b.wins - a.wins || b.plays - a.plays || a.name.localeCompare(b.name),
    );

  const factionRows = Object.entries(perRole)
    .map(([role, f]) => ({ role, plays: f.plays, wins: f.wins }))
    .sort(
      (a, b) =>
        b.wins - a.wins || b.plays - a.plays || a.role.localeCompare(b.role),
    );

  return {
    ratedPlays: plays.length,
    scoredPlays: playMeans.length,
    avgScore: scoreN > 0 ? scoreSum / scoreN : null,
    highWin,
    lowWin,
    highLoss,
    trend,
    streak: {
      longest: longest && longest.len >= STREAK_MIN_LEN ? longest : null,
      current,
    },
    playerRows,
    factionRows,
    rolePlays,
    history: history.reverse(),
  };
}
