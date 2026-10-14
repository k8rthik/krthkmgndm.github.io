import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateMaze, renderMaze, move, isExit, DIR_FROM_KEY } from "../lib/maze.js";

// deterministic rng: a fixed cycle of values in [0, 1)
const cycle = (...vals) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

// count open passages, each counted once (via its s and e sides)
function passages(walls) {
  let n = 0;
  for (const row of walls) for (const cell of row) n += !cell.s + !cell.e;
  return n;
}

describe("generateMaze", () => {
  test("is a perfect maze: a spanning tree has exactly cells − 1 passages", () => {
    // 3x4 = 12 cells → a spanning tree has 11 edges
    const walls = generateMaze(3, 4, cycle(0.1, 0.7, 0.4, 0.9));
    assert.equal(passages(walls), 11);
  });

  test("walls agree from both sides", () => {
    const walls = generateMaze(4, 5, cycle(0.3, 0.8, 0.5));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        if (r < 3) assert.equal(walls[r][c].s, walls[r + 1][c].n);
        if (c < 4) assert.equal(walls[r][c].e, walls[r][c + 1].w);
      }
    }
  });

  test("the outer boundary stays closed", () => {
    const walls = generateMaze(3, 3, cycle(0.2, 0.6));
    for (let i = 0; i < 3; i++) {
      assert.ok(walls[0][i].n && walls[2][i].s && walls[i][0].w && walls[i][2].e);
    }
  });
});

describe("renderMaze", () => {
  // 1 row x 2 cols with the passage between them open:
  //   #####
  //   #@ >#
  //   #####
  const walls = [[
    { n: true, s: true, w: true, e: false },
    { n: true, s: true, w: false, e: true },
  ]];

  test("draws walls, the player and the exit marker", () => {
    assert.equal(renderMaze(walls, { r: 0, c: 0 }), "#####\n#@ >#\n#####");
  });

  test("the player standing on the exit hides the marker", () => {
    assert.equal(renderMaze(walls, { r: 0, c: 1 }), "#####\n#  @#\n#####");
  });
});

describe("move", () => {
  const walls = [[
    { n: true, s: true, w: true, e: false },
    { n: true, s: true, w: false, e: true },
  ]];

  test("steps through an open side", () => {
    assert.deepEqual(move(walls, { r: 0, c: 0 }, "e"), { r: 0, c: 1 });
  });

  test("a wall returns the same position object, so callers can tell nothing moved", () => {
    const p = { r: 0, c: 0 };
    assert.equal(move(walls, p, "n"), p);
  });
});

describe("isExit", () => {
  test("only the bottom-right cell is the exit", () => {
    const walls = generateMaze(2, 3, cycle(0.5));
    assert.equal(isExit(walls, { r: 1, c: 2 }), true);
    assert.equal(isExit(walls, { r: 1, c: 1 }), false);
  });
});

describe("DIR_FROM_KEY", () => {
  test("arrows, wasd (either case) and hjkl all map to the same four directions", () => {
    for (const [keys, dir] of [
      [["ArrowUp", "w", "W", "k"], "n"],
      [["ArrowDown", "s", "S", "j"], "s"],
      [["ArrowLeft", "a", "A", "h"], "w"],
      [["ArrowRight", "d", "D", "l"], "e"],
    ]) {
      for (const k of keys) assert.equal(DIR_FROM_KEY[k], dir, k);
    }
  });
});
