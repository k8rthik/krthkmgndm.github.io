// Invariants over the real data/elo.json payload. These are the
// assumptions the dashboard's derivations silently rely on — run this
// after every `python3 -m bgelo.site_sync` refresh (CI does). If a
// bgelo export change breaks one of these, this file fails instead of
// the site quietly rendering wrong numbers.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { affinityAsOf } from "../components/elo/asOf.js";

const data = JSON.parse(readFileSync(new URL("../data/elo.json", import.meta.url)));
const { events, series, players, corePlayers, playLog } = data;

describe("payload shape", () => {
  test("required keys are present and non-empty", () => {
    // playLog added 2026-08-03: every logged play (rated or not) for the
    // games table — the two BG-Stats-ignored plays and anonymous seats
    // count toward plays/time/players there, unlike events
    for (const key of ["meta", "corePlayers", "players", "series", "events", "sessions", "games", "headToHead", "playLog"]) {
      assert.ok(key in data, `missing key: ${key}`);
    }
    assert.ok(events.length > 0);
    assert.ok(players.length > 0);
  });

  test("every core player exists in players and series", () => {
    const names = new Set(players.map((p) => p.name));
    for (const n of corePlayers) {
      assert.ok(names.has(n), `core player ${n} missing from players`);
      assert.ok(Array.isArray(series[n]), `core player ${n} missing from series`);
    }
  });
});

describe("event stream", () => {
  test("events are chronological in both playtime and date", () => {
    for (let i = 1; i < events.length; i++) {
      assert.ok(events[i].h > events[i - 1].h, `h not increasing at event ${i}`);
      assert.ok(events[i].date >= events[i - 1].date, `date regressed at event ${i}`);
    }
  });

  test("seat scores are numeric or null — never strings", () => {
    // guards the viz.py fix: score must be the evaluated number,
    // not the raw BG Stats string
    for (const e of events) {
      for (const s of e.seats) {
        assert.ok(
          s.score === null || typeof s.score === "number",
          `${e.date} ${e.game}: ${s.name} has non-numeric score ${JSON.stringify(s.score)}`,
        );
      }
    }
  });

  test("seat roles are non-empty strings or null, and some exist", () => {
    // Contract extended 2026-08-17: seats carry the BG Stats "role"
    // (faction/side) when the play logged one — the stat sheet's faction
    // performance derives from it. The pipeline normalizes "" to null.
    let seen = 0;
    for (const e of events) {
      for (const s of e.seats) {
        assert.ok(
          s.role === null || (typeof s.role === "string" && s.role.length > 0),
          `${e.date} ${e.game}: ${s.name} has bad role ${JSON.stringify(s.role)}`,
        );
        if (s.role !== null) seen += 1;
      }
    }
    // the pod logs factions for Scythe, TI4, TOKC, Terra Mystica, …
    assert.ok(seen > 0, "no seat anywhere carries a role — export contract regressed?");
  });

  test("every event has ranks starting at 1 and boolean won flags", () => {
    // `won` is the official BG Stats winner flag, `rank` is the engine's
    // normalized finishing order — and they can disagree. Real cases:
    // - no winner at all: a full tie leaves every seat rank 1, won false
    //   (Chronology 2026-07-07)
    // - multiple winners off rank 1: BG Stats flagged all four tied
    //   players as winners while the engine's tie-break ranked them
    //   (Twilight Imperium 2025-08-13)
    // Derivations must tolerate both; underdog's single-winner guard
    // (winners.length === 1) exists exactly for this.
    for (const e of events) {
      assert.ok(e.seats.length >= 1);
      assert.equal(Math.min(...e.seats.map((s) => s.rank)), 1, `${e.date} ${e.game}: no rank-1 seat`);
      for (const s of e.seats) {
        assert.equal(typeof s.won, "boolean", `${e.date} ${e.game}: ${s.name} won flag not boolean`);
      }
    }
  });
});

describe("play log", () => {
  // Contract added 2026-08-03: the games table derives entirely from
  // playLog, so its shape and its relationship to events are pinned here.
  test("one entry per processed play, chronological, with the fields gamesAsOf reads", () => {
    assert.equal(playLog.length, data.meta.playsProcessed);
    for (let i = 0; i < playLog.length; i++) {
      const p = playLog[i];
      assert.match(p.date, /^\d{4}-\d{2}-\d{2}$/, `playLog[${i}]: bad date`);
      if (i > 0) assert.ok(p.date >= playLog[i - 1].date, `playLog date regressed at ${i}`);
      assert.ok(typeof p.hours === "number" && p.hours > 0, `playLog[${i}]: bad hours`);
      assert.ok(typeof p.game === "string" && p.game.length > 0, `playLog[${i}]: bad game`);
      assert.ok(Array.isArray(p.players) && p.players.length > 0, `playLog[${i}]: bad players`);
      assert.equal(typeof p.rated, "boolean", `playLog[${i}]: bad rated flag`);
    }
  });

  test("rated entries mirror events one-for-one; every event seat is a participant", () => {
    const rated = playLog.filter((p) => p.rated);
    assert.equal(rated.length, events.length);
    rated.forEach((p, i) => {
      assert.equal(p.game, events[i].game, `playLog/events game mismatch at rated play ${i}`);
      assert.equal(p.date, events[i].date, `playLog/events date mismatch at rated play ${i}`);
      const names = new Set(p.players);
      for (const s of events[i].seats) {
        assert.ok(names.has(s.name), `${p.date} ${p.game}: seat ${s.name} missing from playLog players`);
      }
    });
  });
});

describe("series ↔ deltas reconciliation", () => {
  // The pre-game rating reconstruction (insights.js preEloLookup)
  // depends on: series = [0, 1000] anchor + one point per play whose
  // successive diffs equal the per-seat deltas.
  test("each player's series is the 1000-anchor plus cumulative deltas", () => {
    for (const name of Object.keys(series)) {
      const plays = events.flatMap((e) => {
        const s = e.seats.find((x) => x.name === name);
        return s ? [{ h: e.h, delta: s.delta }] : [];
      });
      const pts = series[name];
      assert.equal(pts.length, plays.length + 1, `${name}: series/plays length mismatch`);
      let elo = pts[0][1];
      plays.forEach((p, i) => {
        elo += p.delta;
        assert.ok(Math.abs(pts[i + 1][1] - elo) < 0.11, `${name}: series diverges from deltas at play ${i}`);
        assert.equal(pts[i + 1][0], p.h, `${name}: series h misaligned at play ${i}`);
      });
    }
  });

  test("per-game deltas reconcile with bgelo's career perGame totals", () => {
    const latest = events[events.length - 1].date;
    const { perGame } = affinityAsOf(events, corePlayers, latest, Infinity);
    for (const p of players) {
      if (!corePlayers.includes(p.name)) continue;
      for (const [game, career] of Object.entries(p.perGame ?? {})) {
        const cell = perGame[p.name][game];
        assert.ok(cell, `${p.name} at ${game}: in perGame but not derivable from events`);
        assert.equal(cell.plays, career.plays, `${p.name} at ${game}: plays mismatch`);
        assert.equal(cell.wins, career.wins, `${p.name} at ${game}: wins mismatch`);
        assert.ok(
          Math.abs(cell.delta - career.eloDelta) < 0.5,
          `${p.name} at ${game}: delta ${cell.delta} vs career ${career.eloDelta}`,
        );
      }
    }
  });
});
