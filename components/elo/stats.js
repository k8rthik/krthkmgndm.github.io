// Shared numeric helpers for the derivation layer.

// least-squares slope of ys against their index (0, 1, 2, …): the
// average change per step. null below two points, where no line fits.
export function slope(ys) {
  const n = ys.length;
  if (n < 2) return null;
  const xm = (n - 1) / 2;
  const ym = ys.reduce((t, y) => t + y, 0) / n;
  let cov = 0;
  let varx = 0;
  ys.forEach((y, i) => {
    cov += (i - xm) * (y - ym);
    varx += (i - xm) ** 2;
  });
  return cov / varx;
}
