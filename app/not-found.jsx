"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DIR_FROM_KEY, generateMaze, isExit, move, renderMaze } from "../lib/maze";

// maze size in cells; the rendered grid is (2·ROWS+1) × (2·COLS+1) characters
const ROWS = 8;
const COLS = 13;
const START = { r: 0, c: 0 };

export default function NotFound() {
  const router = useRouter();
  const [walls, setWalls] = useState(() => generateMaze(ROWS, COLS));
  const [player, setPlayer] = useState(START);
  const [steps, setSteps] = useState(0);
  const containerRef = useRef(null);

  const atExit = isExit(walls, player);
  const rendered = useMemo(() => renderMaze(walls, player), [walls, player]);

  const reset = useCallback(() => {
    setWalls(generateMaze(ROWS, COLS));
    setPlayer(START);
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

    // bumping into a wall isn't a step
    const next = move(walls, player, dir);
    if (next === player) return;
    setPlayer(next);
    setSteps((n) => n + 1);
  };

  return (
    <main className="page maze-page">
      <h1>404</h1>
      <p>looks like you took a wrong turn</p>

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
            you made it in {steps} steps. <a href="/">[go home ↵]</a>
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
            · <a href="/">give up</a>
          </>
        )}
      </p>
    </main>
  );
}
