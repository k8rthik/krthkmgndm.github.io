"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { colorFor, fmt } from "./format";
import { cutoffHours } from "./asOf";

const DURATION_MS = 15000;
const ROW_H = 22;
const SCRUB_MAX = 1000;

export default function EloRace({ series, events, corePlayers, date }) {
  const [t, setT] = useState(0); // 0..1 through the race
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  const cutoff = useMemo(() => cutoffHours(events, date), [events, date]);

  // reduced motion → open on the final standings instead of a blank race
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
    }
  }, []);

  // a date change rescales the playtime axis; restart rather than land
  // somewhere arbitrary mid-race
  useEffect(() => {
    setPlaying(false);
    setT((prev) => (prev >= 1 ? 1 : 0));
  }, [cutoff]);

  useEffect(() => {
    if (!playing) return undefined;
    lastRef.current = performance.now();
    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = now - lastRef.current;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt / DURATION_MS;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // rating scale fixed across the whole race so bars don't rescale mid-run
  const bounds = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const n of corePlayers) {
      for (const [h, elo] of series[n] ?? []) {
        if (h > cutoff) break;
        lo = Math.min(lo, elo);
        hi = Math.max(hi, elo);
      }
    }
    return { lo: lo - 20, hi: hi + 20 };
  }, [series, corePlayers, cutoff]);

  const T = t * cutoff;

  const standings = corePlayers
    .map((name) => {
      const pts = series[name] ?? [];
      let elo = null;
      for (const [h, v] of pts) {
        if (h > T) break;
        elo = v; // includes the [0, 1000] anchor: everyone starts on the line
      }
      return elo === null ? null : { name, elo };
    })
    .filter(Boolean)
    .sort((a, b) => b.elo - a.elo)
    .map((s, rank) => ({ ...s, rank }));

  const dateAt = useMemo(() => {
    let seen = null;
    const marks = events.map((e) => [e.h, e.date]);
    return (playtime) => {
      seen = null;
      for (const [h, d] of marks) {
        if (h > playtime) break;
        seen = d;
      }
      return seen;
    };
  }, [events]);

  const toggle = () => {
    if (!playing && t >= 1) setT(0);
    setPlaying((p) => !p);
  };

  return (
    <>
      <p className="elo-race__controls">
        <button type="button" className="elo-sortbtn" onClick={toggle}>
          {playing ? "[pause]" : t >= 1 ? "[replay]" : "[play]"}
        </button>
        <input
          type="range"
          min={0}
          max={SCRUB_MAX}
          value={Math.round(t * SCRUB_MAX)}
          aria-label="race position"
          onChange={(ev) => {
            setPlaying(false);
            setT(Number(ev.target.value) / SCRUB_MAX);
          }}
        />
        <span className="elo-dim">{dateAt(T) ?? "the beginning"}</span>
      </p>
      <div
        className="elo-race"
        style={{ height: standings.length * ROW_H }}
        aria-hidden="true"
      >
        {standings.map((s) => (
          <div
            key={s.name}
            className="elo-race__row"
            style={{ transform: `translateY(${s.rank * ROW_H}px)` }}
          >
            <span className="elo-race__name">{s.name}</span>
            <span className="elo-race__track">
              <span
                className="elo-race__bar"
                style={{
                  width: `${Math.max(
                    1,
                    ((s.elo - bounds.lo) / (bounds.hi - bounds.lo)) * 100,
                  )}%`,
                  background: colorFor(corePlayers, s.name),
                }}
              />
            </span>
            <span className="elo-race__val">{fmt(s.elo)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
