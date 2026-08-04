// Game-centric derivations for the games table: the group h-index and
// per-game play/time/player totals through the selected date.
// Input is the payload's playLog — EVERY logged play, rated or not, with
// its own hours and full participant list (anonymous players included).
// Unrated plays count toward plays/time/players by design; only the
// rating math (events/series) ignores them.

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

export function gamesAsOf(playLog, date) {
  const acc = {};
  for (const p of playLog) {
    if (p.date > date) continue;
    const g =
      acc[p.game] ?? (acc[p.game] = { plays: 0, hours: 0, players: new Set() });
    g.plays += 1;
    g.hours += p.hours;
    for (const name of p.players) g.players.add(name);
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
