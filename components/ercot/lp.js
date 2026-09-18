// Dense two-phase primal simplex for small LPs.
//
// explicit .js extensions throughout components/ercot so these pure modules
// load in raw Node for the test suite (Next's bundler accepts either form)
//
// Solves:  min c'x   s.t.  rows(A x  {<=,>=,=}  b),  x >= 0
// Upper bounds are passed as ordinary rows by the caller.
//
// Returns { status, obj, x, y } where y[i] = d(obj)/d(b[i]) for row i
// (the row's shadow price, signed so that obj' = obj + y.db for a small db).

const EPS = 1e-9;

export const LP_OPTIMAL = "optimal";
export const LP_INFEASIBLE = "infeasible";
export const LP_UNBOUNDED = "unbounded";

/**
 * @param {number} nVar number of structural variables
 * @param {Float64Array|number[]} cost objective coefficients, length nVar
 * @param {{coef: Float64Array, sense: '<'|'>'|'=', rhs: number}[]} rows
 */
export function solveLP(nVar, cost, rows) {
  const m = rows.length;

  // Normalise every row to a non-negative right-hand side, recording the flip so
  // the dual can be un-flipped at the end.
  const flipped = new Uint8Array(m);
  const sense = new Array(m);
  const rhs = new Float64Array(m);
  const A = new Array(m);
  for (let i = 0; i < m; i++) {
    let { coef, sense: s, rhs: b } = rows[i];
    if (b < 0) {
      const neg = new Float64Array(coef.length);
      for (let j = 0; j < coef.length; j++) neg[j] = -coef[j];
      coef = neg;
      b = -b;
      s = s === "<" ? ">" : s === ">" ? "<" : "=";
      flipped[i] = 1;
    }
    A[i] = coef;
    sense[i] = s;
    rhs[i] = b;
  }

  // Column layout: [structural | slack/surplus | artificial]
  const slackOf = new Int32Array(m).fill(-1);
  const artOf = new Int32Array(m).fill(-1);
  let nCol = nVar;
  for (let i = 0; i < m; i++) {
    if (sense[i] !== "=") slackOf[i] = nCol++;
  }
  const artStart = nCol;
  for (let i = 0; i < m; i++) {
    // '<' rows get a feasible basis from their slack; '>' and '=' need an artificial.
    if (sense[i] !== "<") artOf[i] = nCol++;
  }
  const nArt = nCol - artStart;

  // Tableau: (m + 1) rows x (nCol + 1) cols. Row m is the objective row, holding
  // z_j - c_j; the last column holds the current objective value.
  const W = nCol + 1;
  const T = new Float64Array((m + 1) * W);
  for (let i = 0; i < m; i++) {
    const off = i * W;
    const coef = A[i];
    for (let j = 0; j < coef.length; j++) T[off + j] = coef[j];
    if (slackOf[i] >= 0) T[off + slackOf[i]] = sense[i] === "<" ? 1 : -1;
    if (artOf[i] >= 0) T[off + artOf[i]] = 1;
    T[off + nCol] = rhs[i];
  }

  const basis = new Int32Array(m);
  for (let i = 0; i < m; i++) basis[i] = artOf[i] >= 0 ? artOf[i] : slackOf[i];

  const phaseCost = new Float64Array(nCol);
  const realCost = new Float64Array(nCol);
  for (let j = 0; j < nVar; j++) realCost[j] = cost[j];

  // ---- Phase 1: drive the artificials to zero -------------------------------
  if (nArt > 0) {
    for (let j = artStart; j < nCol; j++) phaseCost[j] = 1;
    buildObjectiveRow(T, m, W, nCol, basis, phaseCost);
    const r1 = pivotToOptimality(T, m, W, nCol, basis, phaseCost, artStart, nCol);
    if (r1 !== LP_OPTIMAL) return { status: r1, obj: NaN, x: null, y: null };
    if (T[m * W + nCol] > 1e-6) {
      return { status: LP_INFEASIBLE, obj: NaN, x: null, y: null };
    }
    // Drive any artificial still basic (at zero) out of the basis where possible.
    for (let i = 0; i < m; i++) {
      if (basis[i] < artStart) continue;
      let pick = -1;
      for (let j = 0; j < artStart; j++) {
        if (Math.abs(T[i * W + j]) > 1e-7) { pick = j; break; }
      }
      if (pick >= 0) pivot(T, m, W, nCol, basis, i, pick);
    }
  }

  // ---- Phase 2: the real objective, artificials frozen out of the basis ------
  buildObjectiveRow(T, m, W, nCol, basis, realCost);
  const r2 = pivotToOptimality(T, m, W, nCol, basis, realCost, 0, artStart);
  if (r2 !== LP_OPTIMAL) return { status: r2, obj: NaN, x: null, y: null };

  const x = new Float64Array(nVar);
  for (let i = 0; i < m; i++) {
    if (basis[i] < nVar) x[basis[i]] = T[i * W + nCol];
  }

  // y_i = z_j - c_j of row i's slack (or artificial) column. For a '>' row the
  // surplus carries a -1, which negates the reading; a flipped row negates again.
  const y = new Float64Array(m);
  const obj0 = m * W;
  for (let i = 0; i < m; i++) {
    let v;
    if (sense[i] === "<") v = T[obj0 + slackOf[i]];
    else if (sense[i] === ">") v = -T[obj0 + slackOf[i]];
    else v = T[obj0 + artOf[i]];
    y[i] = flipped[i] ? -v : v;
  }

  let obj = 0;
  for (let j = 0; j < nVar; j++) obj += cost[j] * x[j];
  return { status: LP_OPTIMAL, obj, x, y };
}

function buildObjectiveRow(T, m, W, nCol, basis, c) {
  const off = m * W;
  T.fill(0, off, off + W);
  for (let i = 0; i < m; i++) {
    const cb = c[basis[i]];
    if (cb === 0) continue;
    const ri = i * W;
    for (let j = 0; j <= nCol; j++) T[off + j] += cb * T[ri + j];
  }
  for (let j = 0; j < nCol; j++) T[off + j] -= c[j];
}

// Simplex loop restricted to columns [lo, hi). Dantzig's rule, with a switch to
// Bland's rule once progress stalls so degenerate vertices cannot cycle.
function pivotToOptimality(T, m, W, nCol, basis, c, lo, hi) {
  const obj0 = m * W;
  let stalls = 0;
  let lastObj = Infinity;
  for (let iter = 0; iter < 20000; iter++) {
    let enter = -1;
    const bland = stalls > 30;
    let best = EPS;
    for (let j = lo === 0 ? 0 : lo; j < hi; j++) {
      if (T[obj0 + j] > best) {
        enter = j;
        if (bland) break;
        best = T[obj0 + j];
      }
    }
    if (lo !== 0) {
      // Phase 1 may also price the structural columns below `lo`.
      for (let j = 0; j < lo; j++) {
        if (T[obj0 + j] > best) {
          enter = j;
          if (bland) break;
          best = T[obj0 + j];
        }
      }
    }
    if (enter < 0) return LP_OPTIMAL;

    let leave = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i * W + enter];
      if (a <= EPS) continue;
      const ratio = T[i * W + nCol] / a;
      if (ratio < bestRatio - 1e-12 || (Math.abs(ratio - bestRatio) <= 1e-12 && leave >= 0 && basis[i] < basis[leave])) {
        bestRatio = ratio;
        leave = i;
      }
    }
    if (leave < 0) return LP_UNBOUNDED;

    pivot(T, m, W, nCol, basis, leave, enter);

    const cur = T[obj0 + nCol];
    if (cur > lastObj - 1e-10) stalls++; else stalls = 0;
    lastObj = cur;
  }
  return LP_OPTIMAL;
}

function pivot(T, m, W, nCol, basis, pr, pc) {
  const off = pr * W;
  const p = T[off + pc];
  const inv = 1 / p;
  for (let j = 0; j <= nCol; j++) T[off + j] *= inv;
  T[off + pc] = 1;
  for (let i = 0; i <= m; i++) {
    if (i === pr) continue;
    const ri = i * W;
    const f = T[ri + pc];
    if (f === 0) continue;
    for (let j = 0; j <= nCol; j++) T[ri + j] -= f * T[off + j];
    T[ri + pc] = 0;
  }
  basis[pr] = pc;
}
