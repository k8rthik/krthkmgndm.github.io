"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const COLS = 13;
const ROWS = 8;
const OPP = { n: "s", s: "n", e: "w", w: "e" };

function generateMaze() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const walls = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ n: true, s: true, e: true, w: true })),
  );
  const stack = [[0, 0]];
  visited[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = [];
    if (r > 0 && !visited[r - 1][c]) opts.push(["n", r - 1, c]);
    if (r < ROWS - 1 && !visited[r + 1][c]) opts.push(["s", r + 1, c]);
    if (c < COLS - 1 && !visited[r][c + 1]) opts.push(["e", r, c + 1]);
    if (c > 0 && !visited[r][c - 1]) opts.push(["w", r, c - 1]);
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [dir, nr, nc] = opts[Math.floor(Math.random() * opts.length)];
    walls[r][c][dir] = false;
    walls[nr][nc][OPP[dir]] = false;
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return walls;
}

function renderMaze(walls, player, atExit) {
  const H = 2 * ROWS + 1;
  const W = 2 * COLS + 1;
  const grid = Array.from({ length: H }, () => Array(W).fill("#"));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[2 * r + 1][2 * c + 1] = " ";
      if (!walls[r][c].n) grid[2 * r][2 * c + 1] = " ";
      if (!walls[r][c].s) grid[2 * r + 2][2 * c + 1] = " ";
      if (!walls[r][c].e) grid[2 * r + 1][2 * c + 2] = " ";
      if (!walls[r][c].w) grid[2 * r + 1][2 * c] = " ";
    }
  }
  if (!atExit) grid[2 * (ROWS - 1) + 1][2 * (COLS - 1) + 1] = ">";
  grid[2 * player.r + 1][2 * player.c + 1] = "@";
  return grid.map((row) => row.join("")).join("\n");
}

const DIR_FROM_KEY = {
  ArrowUp: "n",
  ArrowDown: "s",
  ArrowLeft: "w",
  ArrowRight: "e",
  w: "n",
  s: "s",
  a: "w",
  d: "e",
  W: "n",
  S: "s",
  A: "w",
  D: "e",
  k: "n",
  j: "s",
  h: "w",
  l: "e",
};

const STEP = {
  n: (p) => ({ r: p.r - 1, c: p.c }),
  s: (p) => ({ r: p.r + 1, c: p.c }),
  e: (p) => ({ r: p.r, c: p.c + 1 }),
  w: (p) => ({ r: p.r, c: p.c - 1 }),
};

export default function NotFound() {
  const router = useRouter();
  const [walls, setWalls] = useState(() => generateMaze());
  const [player, setPlayer] = useState({ r: 0, c: 0 });
  const [steps, setSteps] = useState(0);
  const containerRef = useRef(null);

  const atExit = player.r === ROWS - 1 && player.c === COLS - 1;
  const rendered = useMemo(
    () => renderMaze(walls, player, atExit),
    [walls, player, atExit],
  );

  const reset = useCallback(() => {
    setWalls(generateMaze());
    setPlayer({ r: 0, c: 0 });
    setSteps(0);
  }, []);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKey = (e) => {
    const key = e.key;

    if (key === "Enter" && atExit) {
      e.preventDefault();
      router.push("/");
      return;
    }
    if (key === "r" || key === "R") {
      e.preventDefault();
      reset();
      return;
    }

    const dir = DIR_FROM_KEY[key];
    if (!dir) return;
    e.preventDefault();

    setPlayer((p) => {
      if (walls[p.r][p.c][dir]) return p;
      return STEP[dir](p);
    });
    setSteps((n) => n + 1);
  };

  return (
    <main className="page maze-page">
      <h1>404</h1>
      <p>
        you took a wrong turn. <span className="serif">@</span> is you,{" "}
        <span className="serif">&gt;</span> is the door home.
      </p>

      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKey}
        className="maze"
        role="application"
        aria-label="maze escape — use arrow keys or wasd to move, enter at the exit to go home"
      >
        <pre className="maze__grid" aria-hidden="true">
          {rendered}
        </pre>
      </div>

      <p className="maze__status">
        {atExit ? (
          <>
            you made it in {steps} steps.{" "}
            <a href="/">[ go home ↵ ]</a>
          </>
        ) : (
          <>
            steps: {steps} · arrows / wasd / hjkl ·{" "}
            <button
              type="button"
              className="maze__link"
              onClick={() => {
                reset();
                containerRef.current?.focus();
              }}
            >
              r: new maze
            </button>{" "}
            ·{" "}
            <a href="/">give up</a>
          </>
        )}
      </p>
    </main>
  );
}
