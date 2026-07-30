// Derived "fun" views over the play-by-play history: the hall of fame
// and per-player extras. All respect the as-of date.
import { cutoffHours } from "./asOf";
import { fmt, sign } from "./format";

const START_ELO = 1000;

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

// BG Stats exports scores as strings ("22", "" when unscored)
const scoreOf = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(+v)) return +v;
  return null;
};

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

      const st =
        streaks[s.name] ??
        (streaks[s.name] = { win: 0, loss: 0, winStart: null, lossStart: null });
      if (s.won) {
        st.win += 1;
        st.loss = 0;
        if (st.win === 1) st.winStart = e.date;
      } else {
        st.loss += 1;
        st.win = 0;
        if (st.loss === 1) st.lossStart = e.date;
      }
      if (!winStreak || st.win > winStreak.len)
        winStreak = { name: s.name, len: st.win, start: st.winStart, end: e.date };
      if (!lossStreak || st.loss > lossStreak.len)
        lossStreak = {
          name: s.name,
          len: st.loss,
          start: st.lossStart,
          end: e.date,
        };

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
    const norm = ys.map((y) => y / mu);
    const n = norm.length;
    const xm = (n - 1) / 2;
    const ym = norm.reduce((t, y) => t + y, 0) / n;
    let cov = 0;
    let varx = 0;
    norm.forEach((y, i) => {
      cov += (i - xm) * (y - ym);
      varx += (i - xm) ** 2;
    });
    const name = k.slice(0, sep);
    const t = trends[name] ?? (trends[name] = { s: 0, w: 0, games: 0 });
    t.s += (cov / varx) * (n - 1);
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
        game: k.slice(sep + 1),
        rate,
        wins: gr.wins,
        plays: gr.plays,
      };
    }
  }

  const cutoff = cutoffHours(events, date);
  const hToDate = new Map(events.map((e) => [e.h, e.date]));
  let peak = null;
  for (const n of corePlayers) {
    for (const [h, elo] of series[n] ?? []) {
      if (h > cutoff) break;
      if (h > 0 && (!peak || elo > peak.elo)) peak = { name: n, elo, h };
    }
  }

  const rows = [];
  if (peak)
    rows.push({
      label: "apex",
      holder: peak.name,
      value: fmt(peak.elo),
      detail: hToDate.get(peak.h) ?? "",
    });
  if (winStreak && winStreak.len > 1)
    rows.push({
      label: "heater",
      holder: winStreak.name,
      value: `${winStreak.len} W`,
      detail: `${winStreak.start} – ${winStreak.end}`,
    });
  if (lossStreak && lossStreak.len > 1)
    rows.push({
      label: "cursed",
      holder: lossStreak.name,
      value: `${lossStreak.len} L`,
      detail: `${lossStreak.start} – ${lossStreak.end}`,
    });
  if (dominant)
    rows.push({
      label: "kingpin",
      holder: dominant.name,
      value: `${dominant.wins}–${dominant.plays - dominant.wins}`,
      detail: dominant.game,
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
      value: `${sign(student.trend * 100, 1)}%`,
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

// signature game: best career delta among games they've played at least
// twice (falling back to any game), from the full affinity map
export function signatureGame(perGame) {
  const entries = Object.entries(perGame ?? {});
  const seasoned = entries.filter(([, c]) => c.plays >= 2);
  const pool = seasoned.length > 0 ? seasoned : entries;
  if (pool.length === 0) return null;
  const [game, cell] = pool.reduce((a, b) => (b[1].delta > a[1].delta ? b : a));
  return { game, delta: cell.delta };
}

// nemesis: worst win share among opponents faced at least 3 times
// (falling back to anyone faced at all), ties broken by more meetings
export function nemesis(h2h) {
  const entries = Object.entries(h2h ?? {})
    .map(([opp, r]) => ({ opp, ...r, games: r.w + r.l + r.t }))
    .filter((r) => r.games > 0);
  if (entries.length === 0) return null;
  const seasoned = entries.filter((r) => r.games >= 3);
  const pool = seasoned.length > 0 ? seasoned : entries;
  return pool.reduce((a, b) => {
    const sa = (a.w + 0.5 * a.t) / a.games;
    const sb = (b.w + 0.5 * b.t) / b.games;
    if (sb !== sa) return sb < sa ? b : a;
    return b.games > a.games ? b : a;
  });
}

// per-player extras the inline profiles need beyond the leaderboard stats:
// recent form and their single best night
export function profileExtrasAsOf(events, corePlayers, date, formLen = 5) {
  const core = new Set(corePlayers);
  const results = {};
  const nights = {};

  for (const e of events) {
    if (e.date > date) continue;
    for (const s of e.seats) {
      if (!core.has(s.name)) continue;
      (results[s.name] ?? (results[s.name] = [])).push(s.won);
      const byNight = nights[s.name] ?? (nights[s.name] = {});
      byNight[e.date] = (byNight[e.date] ?? 0) + s.delta;
    }
  }

  const extras = {};
  for (const n of corePlayers) {
    if (!results[n]) continue;
    let bestNight = null;
    for (const [night, delta] of Object.entries(nights[n])) {
      if (!bestNight || delta > bestNight.delta)
        bestNight = { date: night, delta };
    }
    extras[n] = { form: results[n].slice(-formLen), bestNight };
  }
  return extras;
}
