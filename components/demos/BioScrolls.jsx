"use client";

import { useEffect, useRef } from "react";

const WORDS = [
  "BRCA1",
  "interacts",
  "with",
  "PARP",
  "in",
  "DSB",
  "repair",
];
const ROWS = 5;
const COLS = WORDS.length;
const PERIOD_MS = 2200;

function readInk() {
  if (typeof window === "undefined") return "#1a1a1a";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--ink")
    .trim();
  return raw || "#1a1a1a";
}

function readLink() {
  if (typeof window === "undefined") return "#1a3a8f";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--link")
    .trim();
  return raw || "#1a3a8f";
}

export default function BioScrolls({ active }) {
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

    const resize = () => {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 96;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Attention weights: rows × cols, where each row is one attention head's
    // focus on each word. Animated so focus migrates over time.
    const focusFor = (row, col, t) => {
      const phase = t / PERIOD_MS;
      const center =
        (Math.sin(phase * Math.PI * 2 + row * 1.3) * 0.5 + 0.5) *
        (COLS - 1);
      const d = Math.abs(col - center);
      // Gaussian-ish falloff
      const sigma = 1.2 + row * 0.15;
      return Math.exp(-(d * d) / (2 * sigma * sigma));
    };

    const draw = (t) => {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 96;
      ctx.clearRect(0, 0, w, h);
      const ink = readInk();
      const link = readLink();

      const padX = 8;
      const wordBandH = 16;
      const heatH = h - wordBandH - 6;
      const cellW = (w - padX * 2) / COLS;
      const cellH = heatH / ROWS;

      const elapsed = t - start;

      // Heatmap
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const v = focusFor(r, c, elapsed);
          const x = padX + c * cellW;
          const y = r * cellH;
          ctx.fillStyle = link;
          ctx.globalAlpha = 0.05 + v * 0.5;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }
      }
      ctx.globalAlpha = 1;

      // Word band
      ctx.font = '11px var(--mono, ui-monospace, monospace)';
      ctx.textBaseline = "middle";
      ctx.fillStyle = ink;
      for (let c = 0; c < COLS; c++) {
        // Strongest focus across all heads for this word — drives brightness
        let max = 0;
        for (let r = 0; r < ROWS; r++) {
          max = Math.max(max, focusFor(r, c, elapsed));
        }
        const x = padX + c * cellW + cellW / 2;
        const y = heatH + 6 + wordBandH / 2;
        ctx.globalAlpha = 0.4 + max * 0.6;
        const w2 = ctx.measureText(WORDS[c]).width;
        ctx.fillText(WORDS[c], x - w2 / 2, y);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t) => {
      draw(t);
      if (active && !reduced) raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
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
