"use client";

import { useEffect, useRef } from "react";

const N = 32;
const PERIOD_MS = 7000;

function readInk() {
  if (typeof window === "undefined") return "#1a1a1a";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--ink")
    .trim();
  return raw || "#1a1a1a";
}

export default function Folduzz({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = null;
    let start = performance.now();

    // Random seed: each bead has a random offset and target angle along an
    // alpha-helix-ish curve. We lerp from seed → target over the period.
    const seed = [];
    for (let i = 0; i < N; i++) {
      seed.push({
        rx: (Math.random() - 0.5) * 1.6,
        ry: (Math.random() - 0.5) * 1.0,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const resize = () => {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 96;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t) => {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 96;
      ctx.clearRect(0, 0, w, h);

      const elapsed = ((t - start) % PERIOD_MS) / PERIOD_MS;
      // Three-phase loop: unfold → fold → hold → repeat
      const u =
        elapsed < 0.4
          ? elapsed / 0.4 // 0 → 1 unfolding
          : elapsed < 0.55
          ? 1 - (elapsed - 0.4) / 0.15 // 1 → 0 folding
          : elapsed < 0.85
          ? 0 // folded
          : (elapsed - 0.85) / 0.15; // 0 → 1 next unfold

      const cx = w / 2;
      const cy = h / 2;
      const span = w * 0.78;
      const xStep = span / (N - 1);
      const ink = readInk();

      const pts = new Array(N);
      for (let i = 0; i < N; i++) {
        const tAlong = i / (N - 1);
        // Folded target: alpha helix — small radius spiral along x
        const folded = {
          x: cx - span / 2 + i * xStep,
          y: cy + Math.cos(i * 0.95 + seed[i].phase * 0.2) * 8,
        };
        // Unfolded: random coil-ish offsets
        const coil = {
          x: cx - span / 2 + i * xStep + seed[i].rx * 14,
          y: cy + seed[i].ry * 28,
        };
        pts[i] = {
          x: folded.x * (1 - u) + coil.x * u,
          y: folded.y * (1 - u) + coil.y * u,
        };
      }

      // Backbone strokes
      ctx.strokeStyle = ink;
      ctx.lineCap = "round";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // Beads
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < N; i++) {
        const r = 1.9 + (i % 3 === 0 ? 0.6 : 0);
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t) => {
      draw(t);
      if (active && !reduced) raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      start = performance.now() - PERIOD_MS * 0.5;
      draw(performance.now());
    } else if (active) {
      raf = requestAnimationFrame(loop);
    } else {
      draw(performance.now());
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active]);

  return (
    <div className="project-demo">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
