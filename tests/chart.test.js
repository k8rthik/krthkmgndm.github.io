// Shared SVG chart helpers. Expectations are worked out by hand.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  plotArea, linear, linePath, viewBoxX, clampIndex, spreadLabels, niceTicks,
} from "../components/chart/scale.js";

describe("plotArea", () => {
  test("insets the viewBox by its margins", () => {
    // 1000 wide, 46 left / 76 right → x from 46 to 924; 420 tall, 12 top / 30 bottom → y 12..390
    assert.deepEqual(plotArea({ width: 1000, height: 420, left: 46, right: 76, top: 12, bottom: 30 }), {
      width: 1000, height: 420, left: 46, right: 924, top: 12, bottom: 390,
    });
  });
});

describe("linear", () => {
  test("maps the domain onto the range, inverted ranges included", () => {
    const y = linear([0, 100], [390, 12]); // value up = pixel up
    assert.equal(y(0), 390);
    assert.equal(y(100), 12);
    assert.equal(y(50), 201); // 390 + 0.5 · (12 − 390)
  });

  test("invert undoes the mapping", () => {
    const x = linear([0, 23], [52, 922]);
    assert.equal(x.invert(52), 0);
    assert.equal(x.invert(922), 23);
    assert.equal(x.invert(487), 11.5); // midpoint of the range
  });

  test("a zero-width domain maps to the middle of the range instead of NaN", () => {
    const x = linear([5, 5], [0, 100]);
    assert.equal(x(5), 50);
    assert.equal(x.invert(80), 5);
  });
});

describe("linePath", () => {
  test("moves to the first point and lines to the rest, one decimal", () => {
    assert.equal(linePath([[1, 2], [3.14159, 4], [5, 6.06]]), "M1.0,2.0L3.1,4.0L5.0,6.1");
  });

  test("no points is an empty path", () => {
    assert.equal(linePath([]), "");
  });
});

describe("viewBoxX", () => {
  test("converts a pointer position to viewBox units through the CSS scale", () => {
    // svg drawn 500px wide starting at x=100, viewBox 1000 wide: clientX 350 is 250px in = 500 units
    assert.equal(viewBoxX(350, { left: 100, width: 500 }, 1000), 500);
  });
});

describe("clampIndex", () => {
  test("rounds to the nearest index", () => {
    assert.equal(clampIndex(4.4, 24), 4);
    assert.equal(clampIndex(4.5, 24), 5);
  });

  test("clamps both ends", () => {
    assert.equal(clampIndex(-3, 24), 0);
    assert.equal(clampIndex(30, 24), 23);
  });
});

describe("spreadLabels", () => {
  test("sorts top to bottom and pushes crowded labels down by the gap", () => {
    // ey 100, 105, 200 with gap 14: 100 stays, 105 → 114, 200 is clear
    const out = spreadLabels([{ k: "c", ey: 200 }, { k: "a", ey: 100 }, { k: "b", ey: 105 }], 14);
    assert.deepEqual(out.map((l) => [l.k, l.ly]), [["a", 100], ["b", 114], ["c", 200]]);
  });

  test("a push cascades into the next label", () => {
    // 100 → 100, 101 → 114, 110 → 128 (pushed off the already-pushed label)
    const out = spreadLabels([{ ey: 100 }, { ey: 101 }, { ey: 110 }], 14);
    assert.deepEqual(out.map((l) => l.ly), [100, 114, 128]);
  });

  test("never mutates its input", () => {
    const input = [{ ey: 2 }, { ey: 1 }];
    spreadLabels(input, 14);
    assert.deepEqual(input, [{ ey: 2 }, { ey: 1 }]);
  });
});

describe("niceTicks", () => {
  test("covers the range with round steps", () => {
    // span 1.6 / 4 = 0.4 = 4 x 0.1 -> 3 <= 4 < 7 rounds to 5 x 0.1 = 0.5: 0, 0.5, 1, 1.5, 2
    assert.deepEqual(niceTicks(0, 1.6, 4), [0, 0.5, 1, 1.5, 2]);
    // span 45 / 4 = 11.25 = 1.125 x 10 -> under 1.5 rounds to 1 x 10: 0 .. 50 by 10
    assert.deepEqual(niceTicks(0, 45, 4), [0, 10, 20, 30, 40, 50]);
  });

  test("brackets a range that straddles zero, with an exact 0 tick", () => {
    // span 130 / 5 = 26 = 2.6 x 10 -> under 3 rounds to 2 x 10: -40 .. 100 by 20
    assert.deepEqual(niceTicks(-30, 100, 5), [-40, -20, 0, 20, 40, 60, 80, 100]);
  });

  test("a zero-width range still yields a tick", () => {
    assert.deepEqual(niceTicks(3, 3, 4), [3]);
  });
});
