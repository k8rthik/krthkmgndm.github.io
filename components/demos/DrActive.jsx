"use client";

import { useEffect, useRef } from "react";

// A small fake "ligand": atoms in 3D + bonds between indices.
const ATOMS = [
  { x: 0, y: 0, z: 0, kind: "c" },
  { x: 1, y: 0, z: 0, kind: "c" },
  { x: 1.5, y: 0.866, z: 0, kind: "c" },
  { x: 1, y: 1.732, z: 0, kind: "n" },
  { x: 0, y: 1.732, z: 0, kind: "c" },
  { x: -0.5, y: 0.866, z: 0, kind: "c" },
  { x: 2.5, y: 0.866, z: 0, kind: "o" },
  { x: -1.5, y: 0.866, z: 0, kind: "o" },
  { x: 0.5, y: -0.866, z: 0.6, kind: "c" },
  { x: 1.5, y: 2.598, z: -0.4, kind: "c" },
];
const BONDS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [2, 6],
  [5, 7],
  [0, 8],
  [3, 9],
];
const COLORS = { c: "#1a1a1a", n: "#1a3a8f", o: "#9a2a2a" };

function readInk() {
  if (typeof window === "undefined") return "#1a1a1a";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--ink")
    .trim();
  return raw || "#1a1a1a";
}

export default function DrActive({ active }) {
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

    const project = (atom, ang, w, h, scale) => {
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const x3 = atom.x * cosA + atom.z * sinA;
      const z3 = -atom.x * sinA + atom.z * cosA;
      const y3 = atom.y;
      return {
        x: w / 2 + x3 * scale,
        y: h / 2 + (y3 - 0.866) * scale,
        z: z3,
      };
    };

    const draw = (t) => {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 96;
      ctx.clearRect(0, 0, w, h);
      const elapsed = (t - start) / 1000;
      const ang = elapsed * 0.55;
      const ink = readInk();
      const scale = Math.min(w, h * 2) * 0.16;

      const proj = ATOMS.map((a) => project(a, ang, w, h, scale));

      // Bonds first
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (const [i, j] of BONDS) {
        const a = proj[i];
        const b = proj[j];
        const avgZ = (a.z + b.z) / 2;
        ctx.globalAlpha = 0.4 + (avgZ + 1.5) * 0.18;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Atoms (back-to-front)
      const order = proj
        .map((p, i) => ({ p, i }))
        .sort((u, v) => u.p.z - v.p.z);
      for (const { p, i } of order) {
        const kind = ATOMS[i].kind;
        const r = (kind === "c" ? 3.2 : 3.8) + (p.z + 1.5) * 0.6;
        ctx.fillStyle = COLORS[kind] || ink;
        ctx.globalAlpha = 0.7 + (p.z + 1.5) * 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
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
