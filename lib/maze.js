// The 404 page's maze: generation, ASCII rendering and movement. Pure; the
// randomness comes in as a parameter so tests can pin it.

const OPP = { n: "s", s: "n", e: "w", w: "e" };

const STEP = {
  n: (p) => ({ r: p.r - 1, c: p.c }),
  s: (p) => ({ r: p.r + 1, c: p.c }),
  e: (p) => ({ r: p.r, c: p.c + 1 }),
  w: (p) => ({ r: p.r, c: p.c - 1 }),
};

export const DIR_FROM_KEY = {
  ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e",
  w: "n", s: "s", a: "w", d: "e",
  W: "n", S: "s", A: "w", D: "e",
  k: "n", j: "s", h: "w", l: "e",
};

// Recursive-backtracker maze from the top-left cell. Returns walls[r][c] =
// { n, s, e, w }, true where a wall stands. The grid is built locally, so
// carving it in place mutates nothing the caller holds.
export function generateMaze(rows, cols, rng = Math.random) {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const walls = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ n: true, s: true, e: true, w: true })),
  );
  const stack = [[0, 0]];
  visited[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = [];
    if (r > 0 && !visited[r - 1][c]) opts.push(["n", r - 1, c]);
    if (r < rows - 1 && !visited[r + 1][c]) opts.push(["s", r + 1, c]);
    if (c < cols - 1 && !visited[r][c + 1]) opts.push(["e", r, c + 1]);
    if (c > 0 && !visited[r][c - 1]) opts.push(["w", r, c - 1]);
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [dir, nr, nc] = opts[Math.floor(rng() * opts.length)];
    walls[r][c][dir] = false;
    walls[nr][nc][OPP[dir]] = false;
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return walls;
}

// the exit is the bottom-right cell
export function isExit(walls, p) {
  return p.r === walls.length - 1 && p.c === walls[0].length - 1;
}

// "#" walls, "@" the player, ">" the exit (hidden once the player is on it)
export function renderMaze(walls, player) {
  const rows = walls.length;
  const cols = walls[0].length;
  const grid = Array.from({ length: 2 * rows + 1 }, () => Array(2 * cols + 1).fill("#"));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[2 * r + 1][2 * c + 1] = " ";
      if (!walls[r][c].n) grid[2 * r][2 * c + 1] = " ";
      if (!walls[r][c].s) grid[2 * r + 2][2 * c + 1] = " ";
      if (!walls[r][c].e) grid[2 * r + 1][2 * c + 2] = " ";
      if (!walls[r][c].w) grid[2 * r + 1][2 * c] = " ";
    }
  }
  if (!isExit(walls, player)) grid[2 * rows - 1][2 * cols - 1] = ">";
  grid[2 * player.r + 1][2 * player.c + 1] = "@";
  return grid.map((row) => row.join("")).join("\n");
}

// the next position, or the same object when a wall blocks the way
export function move(walls, p, dir) {
  return walls[p.r][p.c][dir] ? p : STEP[dir](p);
}
