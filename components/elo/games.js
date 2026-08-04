// Game-centric derivations for the games table: the group h-index and
// per-game play/time/player totals through the selected date.
// Events are chronological and h is cumulative pod hours, so an event's
// duration is the gap from the previous event's h (first event: h itself),
// and an as-of prefix preserves every gap exactly.

// top-N by play count; ties with the last row's count stay in so the
// cutoff never splits a group of equally-played games
export const GAMES_TABLE_CAP = 20;

// largest n such that n games have been played at least n times each
export function hIndexOf(counts) {
  const sorted = [...counts].sort((a, b) => b - a);
  let h = 0;
  while (h < sorted.length && sorted[h] >= h + 1) h += 1;
  return h;
}

export function gamesAsOf(events, date) {
  const acc = {};
  let prevH = 0;
  for (const e of events) {
    if (e.date > date) break;
    const g =
      acc[e.game] ?? (acc[e.game] = { plays: 0, hours: 0, players: new Set() });
    g.plays += 1;
    g.hours += e.h - prevH;
    for (const s of e.seats) g.players.add(s.name);
    prevH = e.h;
  }

  const rows = Object.entries(acc)
    .map(([game, g]) => ({
      game,
      plays: g.plays,
      hours: g.hours,
      players: g.players.size,
    }))
    .sort(
      (a, b) =>
        b.plays - a.plays || b.hours - a.hours || a.game.localeCompare(b.game),
    );

  const hIndex = hIndexOf(rows.map((r) => r.plays));

  if (rows.length <= GAMES_TABLE_CAP) return { hIndex, rows };
  const floor = rows[GAMES_TABLE_CAP - 1].plays;
  return { hIndex, rows: rows.filter((r, i) => i < GAMES_TABLE_CAP || r.plays === floor) };
}
