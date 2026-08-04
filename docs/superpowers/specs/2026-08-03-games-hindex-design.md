# Group h-index + games leaderboard

Date: 2026-08-03 · Status: approved

## Goal

Add a game-centric section to the `/bgelo` dashboard: the group's h-index
(the largest n such that n distinct games have been played at least n
times each) plus a leaderboard of the most-played games with play count,
actual play time, and distinct player count.

## Derivation layer

New file `components/elo/games.js` — pure, raw-Node loadable, tested,
following the `asOf.js` / `insights.js` pattern.

`gamesAsOf(events, date)` → `{ hIndex, rows }`

- Filter events to `date ≤ selected` (the session picker drives every
  section).
- Per-event duration: events are chronological and `h` is cumulative pod
  hours, so an event's duration is `e.h − previous e.h` (first event:
  `e.h`). An as-of prefix preserves the diffs exactly; the full-history
  diffs sum to `meta.totalHours`.
- Per game accumulate: `plays` (count), `hours` (sum of durations),
  `players` (size of a Set of seat names).
- `hIndex`: sort play counts descending; h = number of indices i (1-based)
  with count ≥ i.
- Rows sorted by plays desc, hours desc, then name. Capped at
  `GAMES_TABLE_CAP = 20`, extended through ties: any game past row 20
  with the same play count as row 20 stays in.
- Counts and durations only — no delta-magnitude stats (site rule 1);
  the cap is a named constant (rule 2's spirit).

## Component

New `components/elo/GamesTable.jsx` — dumb renderer, no logic beyond
formatting.

- Headline above the table: `group h-index: 6 — 6 games played at least
  6 times`.
- Table inside `.elo-tablewrap` (page never scrolls horizontally):
  columns **game / plays / time / players**. Time shown as hours
  ("29.3h"), sub-hour values as minutes ("51m"); formatter lives in
  `format.js` if not already there.
- Wired into `EloDashboard.jsx` after the "game weight" section:
  `<h2>games</h2>`, sub-line "through {date}", memoized `gamesAsOf`.
- Theme colors via existing CSS variables only.

## Testing

New `tests/games.test.js`, fixture-based, hand-computed expectations,
written before the implementation:

- h-index boundaries: [3,3,2] → 2; [1] → 1; empty → 0; [4,4,4,4] → 4;
  [4,4,4,3] → 3.
- As-of date excludes later events (h-index and rows both shrink).
- Duration math hand-computed from fixture `h` values, including the
  first event.
- Distinct players deduped across plays of the same game.
- Tie extension: rows past the cap sharing row-20's play count stay;
  a strictly smaller count is cut.
- `tests/data-invariants.test.js` unchanged — no export-contract change.
