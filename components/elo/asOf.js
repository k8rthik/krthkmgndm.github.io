// As-of-date views derived from the payload's play-by-play history.
// Dates are YYYY-MM-DD strings, so string comparison is chronological.
// Events are chronological, so "last seen" fields can just overwrite.

const EPS = 1e-6;

// inactivity widening, mirroring bgelo/params.py: sigma^2 grows per idle
// calendar day, capped at the never-played prior
const AGE_VAR_PER_DAY = 10.0;
const SIGMA_PRIOR = 180.0;
const CI_Z = 1.645; // 90%

const utcDay = (iso) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

function widenedSigma(sigma, lastPlayDate, asOfDate) {
  const idleDays = Math.max(0, utcDay(asOfDate) - utcDay(lastPlayDate));
  return Math.min(SIGMA_PRIOR, Math.sqrt(sigma * sigma + AGE_VAR_PER_DAY * idleDays));
}

export function cutoffHours(events, date) {
  let end = 0;
  for (const e of events) if (e.date <= date && e.h > end) end = e.h;
  return end;
}

// the selected session's span on the playtime axis: from the last play
// before that date to the last play of that date
export function sessionBand(events, date) {
  let start = 0;
  let end = 0;
  for (const e of events) {
    if (e.date < date && e.h > start) start = e.h;
    if (e.date === date && e.h > end) end = e.h;
  }
  return end > 0 ? { start, end } : null;
}

// leaderboard rows as of the end of the given date; players with no rated
// plays yet are omitted. wins/pae/sigma come straight from per-seat
// pass-throughs, so the latest date matches bgelo's official career totals.
export function statsAsOf(data, date) {
  const { events, series, players } = data;
  const cutoff = cutoffHours(events, date) + EPS;

  const acc = {};
  for (const e of events) {
    if (e.date > date) continue;
    for (const s of e.seats) {
      const a = acc[s.name] ?? (acc[s.name] = { plays: 0, wins: 0, pae: 0, sigma: null });
      a.plays += 1;
      a.wins += s.won ? 1 : 0;
      a.pae += s.pae;
      a.sigma = s.sigma;
      a.lastDate = e.date;
    }
  }

  return players
    .filter((p) => acc[p.name])
    .map((p) => {
      const a = acc[p.name];
      const pts = (series[p.name] ?? []).filter((pt) => pt[0] <= cutoff);
      const elo = pts.length > 0 ? pts[pts.length - 1][1] : p.elo;
      const peak = pts.reduce((m, pt) => Math.max(m, pt[1]), elo);
      return {
        name: p.name,
        elo,
        ci90: a.sigma !== null ? CI_Z * widenedSigma(a.sigma, a.lastDate, date) : p.ci90,
        peak,
        plays: a.plays,
        wins: a.wins,
        winRate: a.wins / a.plays,
        pae: a.pae,
      };
    });
}

// elo won or lost per player per game through the given date, plus the
// games worth showing (most-played among the given players) and the
// largest swing for scaling cell tints — mirrors bgelo's affinity card,
// which this reconciles with exactly at the latest date (seat deltas sum
// to the career perGame totals)
// the affinity card's column budget: the most-played games among the
// given players
export const AFFINITY_MAX_GAMES = 10;

export function affinityAsOf(events, players, date, maxGames = AFFINITY_MAX_GAMES) {
  const core = new Set(players);
  const perGame = {};
  for (const n of players) perGame[n] = {};
  const playCounts = {};

  for (const e of events) {
    if (e.date > date) continue;
    for (const s of e.seats) {
      if (!core.has(s.name)) continue;
      const cell =
        perGame[s.name][e.game] ??
        (perGame[s.name][e.game] = { plays: 0, wins: 0, delta: 0 });
      cell.plays += 1;
      cell.wins += s.won ? 1 : 0;
      cell.delta += s.delta;
      playCounts[e.game] = (playCounts[e.game] ?? 0) + 1;
    }
  }

  const games = Object.entries(playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxGames)
    .map(([g]) => g);

  let maxAbs = 1;
  for (const n of players) {
    for (const g of games) {
      const cell = perGame[n][g];
      if (cell) maxAbs = Math.max(maxAbs, Math.abs(cell.delta));
    }
  }

  return { perGame, games, maxAbs };
}

// one seat's result against another at the same table, by finishing
// order (the engine's normalized rank — not the BG Stats won flag)
export function rankResult(a, b) {
  if (a.rank < b.rank) return "won";
  if (a.rank > b.rank) return "lost";
  return "tie";
}

// share of meetings won, ties counting half; null with no meetings
export function winShare({ w, l, t }) {
  const games = w + l + t;
  return games > 0 ? (w + 0.5 * t) / games : null;
}

// pairwise records among the given players through the given date — the
// same finishing-order aggregation bgelo uses for the career matrix
export function headToHeadAsOf(events, players, date) {
  const core = new Set(players);
  const records = {};
  for (const a of players) {
    records[a] = {};
    for (const b of players) {
      if (b !== a) records[a][b] = { w: 0, l: 0, t: 0 };
    }
  }
  for (const e of events) {
    if (e.date > date) continue;
    const seats = e.seats.filter((s) => core.has(s.name));
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const a = seats[i];
        const b = seats[j];
        const result = rankResult(a, b);
        const ab = records[a.name][b.name];
        const ba = records[b.name][a.name];
        if (result === "won") {
          ab.w += 1;
          ba.l += 1;
        } else if (result === "lost") {
          ab.l += 1;
          ba.w += 1;
        } else {
          ab.t += 1;
          ba.t += 1;
        }
      }
    }
  }
  return records;
}

// every rated play (through the given date) where both players sat,
// newest first, scored from the row player's perspective
export function pairLogAsOf(events, row, col, date) {
  const log = [];
  for (const e of events) {
    if (e.date > date) continue;
    const a = e.seats.find((s) => s.name === row);
    const b = e.seats.find((s) => s.name === col);
    if (!a || !b) continue;
    log.push({ date: e.date, game: e.game, a, b, result: rankResult(a, b) });
  }
  return log.reverse();
}

// leaderboard order: by one column (dir 1 ascending, -1 descending),
// equal values falling back to player name so the order is stable
export function sortStats(stats, key, dir) {
  return [...stats].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return cmp * dir || a.name.localeCompare(b.name);
  });
}
