"use client";

import { useEffect, useRef, useState } from "react";
import { FRAMES } from "../lib/helixFrames";

const N = FRAMES.length;

export default function AsciiBioArt({ paused = false }) {
  const [idx, setIdx] = useState(0);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const visibleRef = useRef(true);
  const reducedRef = useRef(false);

  // pause when scrolled out / collapsed
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current =
          entry.isIntersecting && entry.intersectionRatio > 0.05;
      },
      { threshold: [0, 0.05, 0.5] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // reduced motion → freeze on one frame
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = mq.matches;
    const onChange = (e) => {
      reducedRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // playback loop
  useEffect(() => {
    if (reducedRef.current) return;
    let last = performance.now();
    const targetMs = 1000 / 9; // ~9fps — slow, contemplative rotation
    let acc = 0;

    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      if (paused || !visibleRef.current) return;
      acc += dt;
      if (acc < targetMs) return;
      acc = 0;
      setIdx((i) => (i + 1) % N);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused]);

  return (
    <div ref={containerRef} className="helix" aria-hidden="true">
      <pre className="helix__pre">{FRAMES[idx]}</pre>
    </div>
  );
}
