// Geometry helpers: smooth curves, resampling, polygon rasterising and exact Euclidean distance transforms
// (Felzenszwalb & Huttenlocher) with nearest-site indices, all on plain typed arrays.

// Chaikin corner cutting (closed or open); keeps the end points of open curves
export function chaikin(pts, iters = 3, closed = true) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const o = [], n = p.length;
    if (!closed) o.push(p[0]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = p[i], b = p[(i + 1) % n];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) o.push(p[n - 1]);
    p = o;
  }
  return p;
}

// centripetal Catmull-Rom through the points (open), `per` samples per segment
export function catmull(pts, per = 16) {
  const o = [], n = pts.length;
  const P = i => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? [2 * P(0)[0] - P(1)[0], 2 * P(0)[1] - P(1)[1]] : P(i - 1), p1 = P(i), p2 = P(i + 1);
    const p3 = i + 2 >= n ? [2 * P(n - 1)[0] - P(n - 2)[0], 2 * P(n - 1)[1] - P(n - 2)[1]] : P(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  o.push(pts[n - 1].slice());
  return o;
}

// cubic bezier sampled
export function bezier(p0, c1, c2, p1, n = 48) {
  const o = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, v = 1 - u;
    o.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p1[1]]);
  }
  return o;
}

export const polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

// resample a polyline at an even spacing (keeps both ends); extra coordinates beyond x,y are interpolated too
export function resample(pts, step) {
  const L = polyLen(pts), n = Math.max(1, Math.round(L / step)), o = [];
  let seg = 0, acc = 0;
  for (let k = 0; k <= n; k++) {
    const target = (k / n) * L;
    while (seg < pts.length - 2 && acc + Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]) < target) { acc += Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]); seg++; }
    const a = pts[seg], b = pts[seg + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(1, Math.max(0, (target - acc) / l));
    o.push(a.map((v, d) => v + (b[d] - v) * t));
  }
  return o;
}

export function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}

// rasterise a polygon (world units) into a grid mask; texel (i,j) centre is world ((i+.5)/s, (j+.5)/s)
export function fillPoly(mask, gw, gh, s, pts, value = 1) {
  const n = pts.length;
  for (let j = 0; j < gh; j++) {
    const y = (j + 0.5) / s, xs = [];
    for (let i = 0, k = n - 1; i < n; k = i++) {
      const yi = pts[i][1], yk = pts[k][1];
      if ((yi > y) !== (yk > y)) xs.push(pts[i][0] + (y - yi) / (yk - yi) * (pts[k][0] - pts[i][0]));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const i0 = Math.max(0, Math.ceil(xs[q] * s - 0.5)), i1 = Math.min(gw - 1, Math.floor(xs[q + 1] * s - 0.5));
      for (let i = i0; i <= i1; i++) mask[j * gw + i] = value;
    }
  }
}

// stamp a polyline's sample points into a site grid: sites[t] = index+1 of the sample (0 = none)
export function stampLine(sites, gw, gh, s, pts, base = 0) {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) * s, n = Math.max(1, Math.ceil(l * 2));
    for (let q = 0; q <= n; q++) {
      const t = q / n, x = (a[0] + (b[0] - a[0]) * t) * s - 0.5, y = (a[1] + (b[1] - a[1]) * t) * s - 0.5;
      const i = Math.round(x), j = Math.round(y);
      if (i >= 0 && j >= 0 && i < gw && j < gh) sites[j * gw + i] = base + k + 1;
    }
  }
}

// 1-D squared distance transform with argmin (Felzenszwalb)
function dt1(f, n, d, idx, v, z, src) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    if (f[q] === Infinity) continue;
    if (f[v[k]] === Infinity) { v[k] = q; continue; }
    let s;
    while (true) { s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= z[k] && k > 0) k--; else break; }
    if (s <= z[k]) { v[k] = q; z[k + 1] = Infinity; continue; }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  if (f[v[0]] === Infinity && k === 0) { for (let q = 0; q < n; q++) { d[q] = Infinity; idx[q] = -1; } return; }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const dq = q - v[k]; d[q] = dq * dq + f[v[k]]; idx[q] = src[v[k]]; }
}

// Euclidean distance (in texels) from every texel to the nearest texel where isSite(t) is true.
// Returns { dist: Float32Array, near: Int32Array (nearest site texel index) }.
export function edt(gw, gh, isSite) {
  const N = gw * gh, g = new Float32Array(N), gi = new Int32Array(N), m = Math.max(gw, gh);
  const f = new Float64Array(m), d = new Float64Array(m), idx = new Int32Array(m), src = new Int32Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  // columns
  for (let i = 0; i < gw; i++) {
    for (let j = 0; j < gh; j++) { const t = j * gw + i; f[j] = isSite(t) ? 0 : Infinity; src[j] = t; }
    dt1(f, gh, d, idx, v, z, src);
    for (let j = 0; j < gh; j++) { g[j * gw + i] = d[j]; gi[j * gw + i] = idx[j]; }
  }
  // rows
  const dist = new Float32Array(N), near = new Int32Array(N);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) { f[i] = g[j * gw + i]; src[i] = gi[j * gw + i]; }
    dt1(f, gw, d, idx, v, z, src);
    for (let i = 0; i < gw; i++) { dist[j * gw + i] = Math.sqrt(d[i]); near[j * gw + i] = idx[i]; }
  }
  return { dist, near };
}

// signed distance (texels) of a mask: positive inside, negative outside, ~0 on the boundary
export function sdfMask(mask, gw, gh) {
  const inD = edt(gw, gh, t => !mask[t]).dist, outD = edt(gw, gh, t => !!mask[t]).dist, o = new Float32Array(gw * gh);
  for (let t = 0; t < o.length; t++) o[t] = mask[t] ? inD[t] - 0.5 : -(outD[t] - 0.5);
  return o;
}

// separable box blur (in place into out), radius r texels, run twice ≈ tent, three times ≈ gaussian
export function boxBlur(src, gw, gh, r, passes = 2) {
  let a = Float32Array.from(src), b = new Float32Array(a.length);
  const tmp = new Float64Array(Math.max(gw, gh) + 1);
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < gh; j++) {   // horizontal
      const o = j * gw; tmp[0] = 0; for (let i = 0; i < gw; i++) tmp[i + 1] = tmp[i] + a[o + i];
      for (let i = 0; i < gw; i++) { const i0 = Math.max(0, i - r), i1 = Math.min(gw - 1, i + r); b[o + i] = (tmp[i1 + 1] - tmp[i0]) / (i1 - i0 + 1); }
    }
    for (let i = 0; i < gw; i++) {   // vertical
      tmp[0] = 0; for (let j = 0; j < gh; j++) tmp[j + 1] = tmp[j] + b[j * gw + i];
      for (let j = 0; j < gh; j++) { const j0 = Math.max(0, j - r), j1 = Math.min(gh - 1, j + r); a[j * gw + i] = (tmp[j1 + 1] - tmp[j0]) / (j1 - j0 + 1); }
    }
  }
  return a;
}

// bilinear sample of a float grid at texel-space coordinates (u,v) where texel centres are at integers
export function bilin(g, gw, gh, u, v) {
  if (u < 0) u = 0; else if (u > gw - 1) u = gw - 1;
  if (v < 0) v = 0; else if (v > gh - 1) v = gh - 1;
  const i = Math.min(gw - 2, u | 0), j = Math.min(gh - 2, v | 0), fu = u - i, fv = v - j, t = j * gw + i;
  const a = g[t] + (g[t + 1] - g[t]) * fu, b = g[t + gw] + (g[t + gw + 1] - g[t + gw]) * fu;
  return a + (b - a) * fv;
}
