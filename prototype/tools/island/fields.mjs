// Global distance fields for the layout, built once on the main thread with exact EDTs and kept in shared memory
// so every worker can read them: signed distance to the coast and to each region blob, and nearest-segment
// lookups for the roads and streams (exact point-to-segment distance and arc length along the line).
import { fillPoly, sdfMask, edt, stampLine, bilin, polyLen } from './lib/geom.mjs';
import * as L from './layout.mjs';

export const S = 1.5;                       // grid texels per map unit (= output image px per map unit)
export const GW = Math.round(L.SIZE[0] * S), GH = Math.round(L.SIZE[1] * S);
export const HS = 0.75, HW = Math.round(L.SIZE[0] * HS), HH = Math.round(L.SIZE[1] * HS);   // half-res grid for soft fields

export const BLOBS = { ...Object.fromEntries(L.REGIONS.filter(r => r.blob).map(r => [r.key, r.blob])), lagoon: L.LAGOON, headland: L.HEADLAND, islet: L.ISLET11 };

// polylines with nearest-segment lookup: creek, falls, and all roads (the future road last)
export function lineTables() {
  const lines = [];
  const add = (name, pts, extra = {}) => { const s = [0]; for (let k = 1; k < pts.length; k++) s.push(s[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); lines.push({ name, pts, s, len: s[s.length - 1], ...extra }); };
  add('creek', L.CREEK); add('falls', L.FALLS);
  L.PATHS.forEach((p, i) => add('road' + i, p.pts, { road: i, a: p.a, b: p.b }));
  add('future', L.FUTURE.road, { road: L.PATHS.length, future: true });
  return lines;
}

// build everything; returns a plain object of SharedArrayBuffers (transferable to workers by reference)
export function buildFields() {
  const t0 = Date.now(), out = {};
  const shared = (Ctor, n) => new Ctor(new SharedArrayBuffer(n * Ctor.BYTES_PER_ELEMENT));
  // coast (full res, signed, units)
  { const m = new Uint8Array(GW * GH); fillPoly(m, GW, GH, S, L.COAST); const d = sdfMask(m, GW, GH), f = shared(Float32Array, GW * GH); for (let t = 0; t < d.length; t++) f[t] = d[t] / S; out.coast = f; }
  // blobs (half res, signed, units)
  for (const [k, pts] of Object.entries(BLOBS)) { const m = new Uint8Array(HW * HH); fillPoly(m, HW, HH, HS, pts); const d = sdfMask(m, HW, HH), f = shared(Float32Array, HW * HH); for (let t = 0; t < d.length; t++) f[t] = d[t] / HS; out['b_' + k] = f; }
  // lines: one nearest-segment index grid per group (creek, falls, roads)
  const lines = lineTables();
  const group = (names, key) => {
    const sites = new Int32Array(GW * GH), lineOf = [];
    let base = 0;
    for (const ln of lines.filter(l => names(l))) { stampLine(sites, GW, GH, S, ln.pts, base); for (let k = 0; k < ln.pts.length; k++) lineOf.push([lines.indexOf(ln), k]); base += ln.pts.length; }
    const { near } = edt(GW, GH, t => sites[t] > 0), g = shared(Int32Array, GW * GH);
    for (let t = 0; t < g.length; t++) g[t] = near[t] >= 0 ? sites[near[t]] - 1 : -1;
    const map = shared(Int32Array, lineOf.length * 2); lineOf.forEach(([l, k], i) => { map[i * 2] = l; map[i * 2 + 1] = k; });
    out['n_' + key] = g; out['m_' + key] = map;
  };
  group(l => l.name === 'creek' || l.name === 'falls', 'water');
  group(l => l.road !== undefined, 'road');
  console.log(`fields: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return out;
}

// accessors over the (shared) field buffers; used on the main thread and in workers
export function fieldAccess(F) {
  const lines = lineTables();
  const coast = (x, y) => bilin(F.coast, GW, GH, x * S - 0.5, y * S - 0.5);
  const blob = (k, x, y) => bilin(F['b_' + k], HW, HH, x * HS - 0.5, y * HS - 0.5);
  // nearest point on a line group: writes into R {d, s, line, k, tx, ty, px, py, side}
  const R = { d: 1e9, s: 0, line: -1, k: 0, tx: 1, ty: 0, px: 0, py: 0, side: 0 };
  const nearest = (key, x, y) => {
    const i = Math.max(0, Math.min(GW - 1, Math.floor(x * S))), j = Math.max(0, Math.min(GH - 1, Math.floor(y * S)));
    const gi = F['n_' + key][j * GW + i]; R.d = 1e9; R.line = -1;
    if (gi < 0) return R;
    const li = F['m_' + key][gi * 2], k0 = F['m_' + key][gi * 2 + 1], ln = lines[li], P = ln.pts;
    for (let k = Math.max(0, k0 - 2); k <= Math.min(P.length - 2, k0 + 2); k++) {
      const ax = P[k][0], ay = P[k][1], bx = P[k + 1][0], by = P[k + 1][1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      let t = ((x - ax) * dx + (y - ay) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (d < R.d) { const l = Math.sqrt(l2); R.d = d; R.s = ln.s[k] + t * l; R.line = li; R.k = k; R.tx = dx / l; R.ty = dy / l; R.px = px; R.py = py; R.side = (x - px) * (-R.ty) + (y - py) * R.tx; }
    }
    return R;
  };
  return { coast, blob, nearest, lines, R };
}
