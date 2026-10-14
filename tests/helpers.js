// Shared fixture builders for the /bgelo derivation tests. Not a test
// file itself (the runner only picks up *.test.js).

// Build a payload from event definitions the way the real pipeline does:
// h = 1, 2, 3…, series = [0, 1000] anchor plus one post-play point per
// seat, derived by accumulating deltas (the invariant the derivations
// rely on — see tests/data-invariants.test.js for the real-data check).
//
// Seat tuple: [name, rank, delta, won, score, extra]. won defaults to
// rank === 1, score to null; extra carries per-seat pass-throughs some
// derivations read (pae, sigma) and is merged into the seat.
export function buildPayload(defs) {
  const elo = {};
  const series = {};
  const events = defs.map((d, i) => {
    const h = i + 1;
    for (const [name, , delta] of d.seats) {
      elo[name] = (elo[name] ?? 1000) + delta;
      (series[name] ?? (series[name] = [[0, 1000]])).push([h, elo[name]]);
    }
    return {
      h,
      date: d.date,
      game: d.game,
      seats: d.seats.map(([name, rank, delta, won, score, extra]) => ({
        name,
        rank,
        delta,
        won: won ?? rank === 1,
        score: score ?? null,
        ...extra,
      })),
    };
  });
  return { events, series };
}
