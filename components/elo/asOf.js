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

// pairwise records among the regulars through the given date — the same
// finishing-order aggregation bgelo uses for the career matrix
export function headToHeadAsOf(events, corePlayers, date) {
  const core = new Set(corePlayers);
  const records = {};
  for (const a of corePlayers) {
    records[a] = {};
    for (const b of corePlayers) {
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
        if (a.rank < b.rank) {
          records[a.name][b.name].w += 1;
          records[b.name][a.name].l += 1;
        } else if (a.rank > b.rank) {
          records[a.name][b.name].l += 1;
          records[b.name][a.name].w += 1;
        } else {
          records[a.name][b.name].t += 1;
          records[b.name][a.name].t += 1;
        }
      }
    }
  }
  return records;
}
