// Shared SVG chart plumbing for the dashboards: plot geometry, scales, line
// paths, pointer mapping and end-label spacing. Pure, raw-Node loadable.
// Each chart still owns its own look; this is only the arithmetic.

// The drawable rectangle inside a viewBox, as pixel bounds.
export function plotArea({ width, height, left, right, top, bottom }) {
  return { width, height, left, right: width - right, top, bottom: height - bottom };
}

// Linear map from a domain [d0, d1] onto a range [r0, r1] (pass the range
// reversed for a y axis). `.invert` maps back. A zero-width domain maps to
// the middle of the range rather than dividing by zero.
export function linear([d0, d1], [r0, r1]) {
  const span = d1 - d0;
  const scale = (v) => (span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0));
  scale.invert = (p) => (span === 0 ? d0 : d0 + ((p - r0) / (r1 - r0)) * span);
  return scale;
}

// "M x,y L x,y ..." through already-scaled [x, y] points
export function linePath(points) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
}

// a pointer's clientX in viewBox units, for an svg drawn at any CSS size
export function viewBoxX(clientX, rect, viewBoxWidth) {
  return ((clientX - rect.left) / rect.width) * viewBoxWidth;
}

// nearest whole index into a series of length n
export function clampIndex(i, n) {
  return Math.max(0, Math.min(n - 1, Math.round(i)));
}

// Line-end labels, sorted top to bottom, each pushed at least `gap` below
// the one above. Adds `ly` (label y) beside the line's own end `ey`.
export function spreadLabels(items, gap) {
  return items
    .toSorted((a, b) => a.ey - b.ey)
    .reduce((acc, item) => {
      const prev = acc[acc.length - 1];
      const ly = prev ? Math.max(item.ey, prev.ly + gap) : item.ey;
      return [...acc, { ...item, ly }];
    }, []);
}

// Round tick values covering [lo, hi] in about `count` steps of 1, 2 or 5
// times a power of ten. The ends are widened out to a whole step.
export function niceTicks(lo, hi, count = 4) {
  const raw = (hi - lo) / count || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const out = [];
  const end = Math.ceil(hi / step - 1e-9) * step;
  for (let v = Math.floor(lo / step + 1e-9) * step; v <= end + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(10)) || 0); // `|| 0` turns -0 into 0
  }
  return out;
}
