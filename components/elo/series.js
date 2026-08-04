// Chart-series derivations. The payload's series record the POST-game
// rating at each play's END time ([0, 1000] anchor + cumulative points),
// which made the line at a play already include that play's swing — and
// a swing drawn between end-times spans the NEXT game's duration. The
// chart instead plots the rating a player carried INTO each play, at the
// play's START time, so each game's swing renders across that game's own
// span; a terminal point at the last play's end keeps the endpoint dot
// and label at the career rating.

// game start times keyed by end time — events are back-to-back on the
// playtime axis, so each game starts where the previous one ended
function startTimes(events) {
  const startOf = new Map();
  let prev = 0;
  for (const e of events) {
    startOf.set(e.h, prev);
    prev = e.h;
  }
  return startOf;
}

export function preGameSeries(series, events) {
  const startOf = startTimes(events);
  const out = {};
  for (const [name, pts] of Object.entries(series)) {
    if (pts.length < 2) {
      out[name] = pts.map((p) => [...p]);
      continue;
    }
    const entered = pts.map((p, i) => {
      if (i === 0) return [...p];
      const start = startOf.get(p[0]);
      if (start === undefined) {
        // the export contract (tests/data-invariants.test.js) aligns
        // every series point with an event — a miss means a broken sync
        throw new Error(`series point for ${name} at h=${p[0]} matches no event`);
      }
      return [start, pts[i - 1][1]];
    });
    const closed = [...entered, [...pts[pts.length - 1]]];
    // a first play in the pod's first game duplicates the anchor exactly
    out[name] = closed.filter(
      (p, i) => i === 0 || p[0] !== closed[i - 1][0] || p[1] !== closed[i - 1][1],
    );
  }
  return out;
}

// the game whose (start, end] span on the playtime axis contains the
// given cursor position; cursor past the last game clamps to it
export function eventSpanAt(events, hours) {
  if (!events || events.length === 0) return null;
  let start = 0;
  for (const e of events) {
    if (e.h >= hours) return { event: e, start, end: e.h };
    start = e.h;
  }
  const last = events[events.length - 1];
  const prev = events.length > 1 ? events[events.length - 2].h : 0;
  return { event: last, start: prev, end: last.h };
}
