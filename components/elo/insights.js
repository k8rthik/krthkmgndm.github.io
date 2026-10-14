// Derived "fun" views over the play-by-play history: the hall of fame
// and per-player extras. All respect the as-of date.
// explicit .js extensions so these pure modules load in raw Node for the
// test suite (Next's bundler accepts either form)
import { cutoffHours, winShare } from "./asOf.js";
import { fmt, sign, scoreOf } from "./format.js";
import { slope } from "./stats.js";

export const START_ELO = 1000;

// rating each seat carried INTO an event, reconstructed from the series
// (one point per play plus the [0, START_ELO] anchor — successive diffs
// equal the per-seat deltas, verified against the payload). The returned
// lookup assumes events are consumed in chronological order.
function preEloLookup(series) {
  const idx = {};
  return (name, h) => {
    const pts = series[name] ?? [];
    let i = idx[name] ?? 0;
    while (i < pts.length && pts[i][0] < h) i += 1;
    idx[name] = i;
    return i > 0 ? pts[i - 1][1] : START_ELO;
  };
}

// a game record only counts toward "most dominant" once someone has
// played it this many times — 100% over two plays isn't dominance
const DOMINANCE_MIN_PLAYS = 5;

// a win only counts toward "giant slayer" when the winner sat down rated
// this far below the table favorite. Counting wins (not deltas) keeps the
// record meaningful as ratings settle and per-game swings shrink.
const UNDERDOG_GAP = 100;

// "the student" guards: a score trend needs this many scored plays of one
// game to count, and this many qualifying games pooled — one lucky
// trajectory in a single game isn't a record
const STUDENT_MIN_PLAYS = 3;
const STUDENT_MIN_GAMES = 3;

// hall-of-fame rows through the given date, regulars only
export function recordsAsOf(events, series, corePlayers, date) {
  const core = new Set(corePlayers);
  const preElo = preEloLookup(series);
  const streaks = {};
  const gameRecords = {};
  const slays = {};
  const winsByGame = {};
  const seconds = {};
  const gameScores = {};
  const scoreTraj = {};
  let winStreak = null;
  let lossStreak = null;

  for (const e of events) {
    if (e.date > date) continue;

    for (const s of e.seats) {
      const sc = scoreOf(s.score);
      if (sc === null) continue;
      (gameScores[e.game] ?? (gameScores[e.game] = [])).push(sc);
      if (core.has(s.name)) {
        const tk = `${s.name}|${e.game}`;
        (scoreTraj[tk] ?? (scoreTraj[tk] = [])).push(sc);
      }
    }

    const table = e.seats.map((s) => ({
      name: s.name,
      won: s.won,
      elo: preElo(s.name, e.h),
    }));
    const winners = table.filter((s) => s.won);
    if (winners.length === 1 && core.has(winners[0].name)) {
      const w = winners[0];
      const favorite = table.reduce((a, b) => (b.elo > a.elo ? b : a));
      if (favorite.elo - w.elo >= UNDERDOG_GAP)
        slays[w.name] = (slays[w.name] ?? 0) + 1;
    }

    for (const s of e.seats) {
      if (!core.has(s.name)) continue;

      if (s.won)
        (winsByGame[s.name] ?? (winsByGame[s.name] = new Set())).add(e.game);
      if (s.rank === 2) seconds[s.name] = (seconds[s.name] ?? 0) + 1;

      const st = streaks[s.name] ?? (streaks[s.name] = { win: 0, loss: 0 });
      if (s.won) {
        st.win += 1;
        st.loss = 0;
      } else {
        st.loss += 1;
        st.win = 0;
      }
      if (!winStreak || st.win > winStreak.len)
        winStreak = { name: s.name, len: st.win };
      if (!lossStreak || st.loss > lossStreak.len)
        lossStreak = { name: s.name, len: st.loss };

      const gk = `${s.name}|${e.game}`;
      const gr = gameRecords[gk] ?? (gameRecords[gk] = { plays: 0, wins: 0 });
      gr.plays += 1;
      if (s.won) gr.wins += 1;
    }

  }

  let versatile = null;
  for (const [n, games] of Object.entries(winsByGame)) {
    if (!versatile || games.size > versatile.count)
      versatile = { name: n, count: games.size };
  }

  // "the student": per game, fit a least-squares trend over a player's
  // chronological scores normalized by that game's average score, then
  // pool slopes across games weighted by plays. Measures learning —
  // whether replays score higher — independent of results or elo.
  const gameMean = {};
  for (const [g, arr] of Object.entries(gameScores))
    gameMean[g] = arr.reduce((t, x) => t + x, 0) / arr.length;

  const trends = {};
  for (const [k, ys] of Object.entries(scoreTraj)) {
    if (ys.length < STUDENT_MIN_PLAYS) continue;
    const sep = k.indexOf("|");
    const mu = gameMean[k.slice(sep + 1)];
    if (!mu || mu <= 0) continue;
    const n = ys.length;
    const name = k.slice(0, sep);
    const t = trends[name] ?? (trends[name] = { s: 0, w: 0, games: 0 });
    t.s += slope(ys.map((y) => y / mu)) * (n - 1);
    t.w += n - 1;
    t.games += 1;
  }
  let student = null;
  for (const [name, t] of Object.entries(trends)) {
    if (t.games < STUDENT_MIN_GAMES) continue;
    const trend = t.s / t.w;
    if (!student || trend > student.trend) student = { name, trend };
  }

  // the player with the highest win rate in any one game they've played
  // at least DOMINANCE_MIN_PLAYS times; ties go to the larger sample
  let dominant = null;
  for (const [k, gr] of Object.entries(gameRecords)) {
    if (gr.plays < DOMINANCE_MIN_PLAYS) continue;
    const rate = gr.wins / gr.plays;
    if (
      !dominant ||
      rate > dominant.rate ||
      (rate === dominant.rate && gr.plays > dominant.plays)
    ) {
      const sep = k.indexOf("|"); // game names are freeform, split once
      dominant = {
        name: k.slice(0, sep),
        rate,
        wins: gr.wins,
        plays: gr.plays,
      };
    }
  }

  const cutoff = cutoffHours(events, date);
  let peak = null;
  for (const n of corePlayers) {
    for (const [h, elo] of series[n] ?? []) {
      if (h > cutoff) break;
      if (h > 0 && (!peak || elo > peak.elo)) peak = { name: n, elo };
    }
  }

  const rows = [];
  if (peak)
    rows.push({
      label: "apex",
      holder: peak.name,
      value: fmt(peak.elo),
      detail: "highest peak elo",
    });
  if (winStreak && winStreak.len > 1)
    rows.push({
      label: "heater",
      holder: winStreak.name,
      value: `${winStreak.len} W`,
      detail: "longest win streak",
    });
  if (lossStreak && lossStreak.len > 1)
    rows.push({
      label: "cursed",
      holder: lossStreak.name,
      value: `${lossStreak.len} L`,
      detail: "longest losing streak",
    });
  if (dominant)
    rows.push({
      label: "kingpin",
      holder: dominant.name,
      value: `${dominant.wins}–${dominant.plays - dominant.wins}`,
      detail: "best win rate in one game",
    });
  if (versatile)
    rows.push({
      label: "polymath",
      holder: versatile.name,
      value: `${versatile.count}`,
      detail: "distinct games won",
    });

  if (student && student.trend > 0)
    rows.push({
      label: "studious",
      holder: student.name,
      value: `${sign(student.trend * 100)}%`,
      detail: "score gain per replay",
    });

  let sidekick = null;
  for (const [name, count] of Object.entries(seconds)) {
    if (!sidekick || count > sidekick.count) sidekick = { name, count };
  }
  if (sidekick)
    rows.push({
      label: "sidekick",
      holder: sidekick.name,
      value: `${sidekick.count}`,
      detail: "2nd-place finishes",
    });
  let slayer = null;
  for (const [name, count] of Object.entries(slays)) {
    if (!slayer || count > slayer.count) slayer = { name, count };
  }
  if (slayer)
    rows.push({
      label: "underdog",
      holder: slayer.name,
      value: `${slayer.count}`,
      detail: `won ${UNDERDOG_GAP}+ elo below favorite`,
    });
  return rows;
}

// a game only becomes someone's signature once they've played it this
// many times — 2-for-2 isn't a signature
export const SIGNATURE_MIN_PLAYS = 3;

// signature game: best win rate among games played at least
// SIGNATURE_MIN_PLAYS times and won at least once (a 0-for-5 is no one's
// signature), from one player's affinity cells; equal
// rates go to the larger sample, then alphabetically. Wins are the
// official won flags, as in kingpin — a full tie credits nobody, a
// broken tie flagged for several credits each. Not the career elo
// delta: early high-sigma swings would crown the first sessions
// forever (CLAUDE.md rule 1). null when nothing clears the floor.
export function signatureGame(perGame) {
  let best = null;
  for (const [game, c] of Object.entries(perGame ?? {})) {
    if (c.plays < SIGNATURE_MIN_PLAYS || c.wins === 0) continue;
    const rate = c.wins / c.plays;
    if (
      !best ||
      rate > best.rate ||
      (rate === best.rate &&
        (c.plays > best.plays ||
          (c.plays === best.plays && game.localeCompare(best.game) < 0)))
    )
      best = { game, wins: c.wins, plays: c.plays, rate };
  }
  return best;
}

// a bad record only makes someone a nemesis after this many meetings
export const NEMESIS_MIN_MEETINGS = 3;

// nemesis: worst win share among opponents faced at least
// NEMESIS_MIN_MEETINGS times, ties broken by more meetings. null when
// nobody clears the floor — one 0-1 loss isn't a nemesis (rule 2).
export function nemesis(h2h) {
  const pool = Object.entries(h2h ?? {})
    .map(([opp, r]) => ({ opp, ...r, games: r.w + r.l + r.t }))
    .filter((r) => r.games >= NEMESIS_MIN_MEETINGS);
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => {
    const sa = winShare(a);
    const sb = winShare(b);
    if (sb !== sa) return sb < sa ? b : a;
    return b.games > a.games ? b : a;
  });
}

// one player's rated plays through the given date, newest first, each
// carrying the elo they left the table with (START_ELO plus cumulative
// deltas — tests/data-invariants.test.js verifies deltas reconcile with
// the series, so no series lookup is needed)
export function playerHistoryAsOf(events, name, date) {
  const rows = [];
  let elo = START_ELO;
  for (const e of events) {
    if (e.date > date) continue;
    const s = e.seats.find((x) => x.name === name);
    if (!s) continue;
    elo += s.delta;
    rows.push({
      date: e.date,
      game: e.game,
      rank: s.rank,
      seats: e.seats.length,
      won: s.won,
      score: scoreOf(s.score),
      delta: s.delta,
      elo,
    });
  }
  return rows.reverse();
}

// recent form shows this many latest results
export const FORM_LEN = 5;

// per-player extras the inline profiles need beyond the leaderboard
// stats: recent form
export function profileExtrasAsOf(events, players, date, formLen = FORM_LEN) {
  const core = new Set(players);
  const results = {};

  for (const e of events) {
    if (e.date > date) continue;
    for (const s of e.seats) {
      if (!core.has(s.name)) continue;
      (results[s.name] ?? (results[s.name] = [])).push(s.won);
    }
  }

  const extras = {};
  for (const n of players) {
    if (!results[n]) continue;
    extras[n] = { form: results[n].slice(-formLen) };
  }
  return extras;
}
