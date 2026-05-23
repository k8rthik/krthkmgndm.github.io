"use client";

import { useEffect, useRef } from "react";

const CELL = 8;
const TICK_MS = 200;
const SEED_DENSITY = 0.08;
const MAX_AGE = 30;
const MAX_OPACITY = 0.18;
const FADE_PX = 90;
const SEED_RADIUS = 5;

function readInk() {
  if (typeof window === "undefined") return "#1a1a1a";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--ink")
    .trim();
  return raw || "#1a1a1a";
}

function readColumn() {
  if (typeof window === "undefined") return null;
  const main = document.querySelector("main.page");
  if (!main) return null;
  const r = main.getBoundingClientRect();
  return { left: r.left, right: r.right };
}

function dailyRng() {
  const d = new Date();
  let h = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export default function MarginLife() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let raf = null;
    let running = true;
    let lastTick = 0;

    let cols = 0;
    let rows = 0;
    let viewW = 0;
    let viewH = 0;
    let grid = new Uint8Array(0);
    let next = new Uint8Array(0);
    let age = new Uint16Array(0);
    let col = null;
    let ink = "#1a1a1a";

    const inColumn = (cx) => col != null && cx >= col.left && cx <= col.right;

    // Hard-edge neighbors: off-grid counts as dead. No toroidal wrap.
    const countNeighbors = (g, x, y) => {
      let n = 0;
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(cols - 1, x + 1);
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(rows - 1, y + 1);
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          if (nx === x && ny === y) continue;
          n += g[ny * cols + nx];
        }
      }
      return n;
    };

    const setup = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      viewW = w;
      viewH = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      const size = cols * rows;
      grid = new Uint8Array(size);
      next = new Uint8Array(size);
      age = new Uint16Array(size);
      col = readColumn();
      ink = readInk();

      const rng = dailyRng();
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cx = x * CELL + CELL / 2;
          if (inColumn(cx)) continue;
          if (rng() < SEED_DENSITY) {
            grid[y * cols + x] = 1;
            age[y * cols + x] = 1;
          }
        }
      }
    };

    const step = () => {
      col = readColumn() || col;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const cx = x * CELL + CELL / 2;
          if (inColumn(cx)) {
            next[i] = 0;
            continue;
          }
          const n = countNeighbors(grid, x, y);
          const alive = grid[i];
          let alive2;
          if (alive) {
            alive2 = age[i] > MAX_AGE ? 0 : n === 2 || n === 3 ? 1 : 0;
          } else {
            alive2 = n === 3 ? 1 : 0;
          }
          next[i] = alive2;
        }
      }
      for (let i = 0; i < next.length; i++) {
        if (next[i]) age[i] = grid[i] ? age[i] + 1 : 1;
        else age[i] = 0;
      }
      const tmp = grid;
      grid = next;
      next = tmp;
    };

    const draw = () => {
      ctx.clearRect(0, 0, viewW, viewH);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (!grid[y * cols + x]) continue;
          const cx = x * CELL + CELL / 2;
          if (inColumn(cx)) continue;
          const cy = y * CELL + CELL / 2;
          const dCol = col
            ? cx < col.left
              ? col.left - cx
              : cx - col.right
            : Infinity;
          const d = Math.min(cx, viewW - cx, cy, viewH - cy, dCol);
          if (d <= 0) continue;
          const fade = smoothstep(0, FADE_PX, d);
          const alpha = MAX_OPACITY * fade;
          if (alpha < 0.005) continue;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = ink;
          ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t) => {
      if (!running) return;
      if (t - lastTick >= TICK_MS) {
        step();
        draw();
        lastTick = t;
      }
      raf = requestAnimationFrame(loop);
    };

    const handleClick = (e) => {
      const { clientX: px, clientY: py } = e;
      if (!col || inColumn(px)) return;
      const cx = Math.floor(px / CELL);
      const cy = Math.floor(py / CELL);
      for (let dy = -SEED_RADIUS; dy <= SEED_RADIUS; dy++) {
        for (let dx = -SEED_RADIUS; dx <= SEED_RADIUS; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const cellX = nx * CELL + CELL / 2;
          if (inColumn(cellX)) continue;
          if (Math.hypot(dx, dy) <= SEED_RADIUS && Math.random() < 0.55) {
            grid[ny * cols + nx] = 1;
            age[ny * cols + nx] = 1;
          }
        }
      }
      draw();
    };

    const handleResize = () => setup();

    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        lastTick = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    setup();
    raf = requestAnimationFrame(loop);
    window.addEventListener("click", handleClick);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="margin-life" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
