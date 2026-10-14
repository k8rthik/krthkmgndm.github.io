// Dense linear algebra for the small matrices in the network model.
// Pure, raw-Node loadable.

/**
 * Inverse of a square, non-singular matrix by Gauss-Jordan elimination with
 * partial pivoting. Rows may be arrays or typed arrays; the input is not
 * modified. Returns an array of Float64Array rows.
 */
export function invert(M) {
  const n = M.length;
  const A = M.map((row, i) => {
    const r = new Float64Array(2 * n);
    r.set(row, 0);
    r[n + i] = 1;
    return r;
  });
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c];
    if (d === 0) throw new Error("invert: matrix is singular");
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const f = A[i][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) A[i][j] -= f * A[c][j];
    }
  }
  return A.map((r) => r.slice(n));
}
