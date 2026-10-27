// Reusable prop builders for region modules (all in world map units, z up). Each takes a MeshBuilder `m` and an
// options object; they return the builder. Use api.ground(x, y) for the base height.
//   palm(m, { x, y, z, h, lean: [dx, dy], seed, fronds, canopy })
//   bush(m, { x, y, z, r, seed, color })          leafy fan bush (broad leaves)
//   fern(m, { x, y, z, r, seed })                 low fern rosette (small fronds)
//   rock(m, { x, y, z, r, seed, color, flat })     boulder
//   tree(m, { x, y, z, h, r, seed, color })        broadleaf tree: trunk + lumpy foliage crown
import { V3 } from './mesh.mjs';
import { rand, noise3, fbm2 } from '../lib/noise.mjs';

const { norm, cross, sub, add, scl } = V3;
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// one frond (or leaf) along a drooping spine. keel: how far the halves fold down from the midrib (V shape).
export function frond(m, base, az, elev, len, width, o = {}) {
  const n = o.seg ?? 12, droop = o.droop ?? 0.55, twist = o.twist ?? 0;
  const d0 = [Math.cos(az) * Math.cos(elev), Math.sin(az) * Math.cos(elev), Math.sin(elev)];
  const pts = [], side = [], w = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const p = add(add(base, scl(d0, s * len)), [0, 0, -droop * s * s * len]);
    pts.push(p);
  }
  for (let i = 0; i <= n; i++) {
    const T = norm(sub(pts[Math.min(n, i + 1)], pts[Math.max(0, i - 1)]));
    let sd = norm(cross(T, [0, 0, 1])); if (!isFinite(sd[0])) sd = [1, 0, 0];
    // roll the blade a little around the spine (twist), so fronds do not all lie flat
    const up = norm(cross(sd, T)), r = twist * (i / n);
    sd = norm(add(scl(sd, Math.cos(r)), scl(up, Math.sin(r))));
    side.push(sd);
    const s = i / n; w.push(width * (o.taper === false ? 1 : 0.35 + 0.65 * Math.sin(Math.min(1, s * 1.15) * Math.PI) ** 0.5));
  }
  const keel = o.keel ?? 0.35;
  m.ribbon(pts, w, side, { cols: o.cols ?? 6, up: true, bend: (u, v) => -Math.abs(v) * keel * width * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.5), colFn: o.colFn, aoFn: o.aoFn });
  return pts[n];
}

export function palm(m, o) {
  const r = rand(o.seed ?? 1), h = o.h ?? 38, sc = h / 38, z0 = o.z ?? 0;
  const lean = o.lean ?? [(r() - 0.5) * 0.5, (r() - 0.5) * 0.5];
  const base = [o.x, o.y, z0 - 0.6];
  if (o.canopy) m.canopy(true);
  m.seed((o.seed ?? 1) * 7919);
  // trunk: curved, ringed, flared at the foot
  const N = 18, pts = [];
  const bow = 0.35 + r() * 0.35;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    pts.push([base[0] + lean[0] * h * Math.pow(t, 1.6) * bow * 2, base[1] + lean[1] * h * Math.pow(t, 1.6) * bow * 2, base[2] + t * h]);
  }
  const top = pts[N - 1];
  const tc = o.trunkColor ?? [0.56 + r() * 0.06, 0.46 + r() * 0.05, 0.36];
  m.mat('palmTrunk').col(tc);
  let L = 0; const Ls = [0]; for (let i = 1; i < N; i++) { L += Math.hypot(...sub(pts[i], pts[i - 1])); Ls.push(L); }
  m.tube(pts, (t, a) => {
    const len = t * L, ring = ((len / 1.25) % 1 + 1) % 1;
    return sc * ((1.9 - 0.6 * t) + 1.1 * Math.max(0, 1 - t * 12) ** 2) * (1 + 0.08 * Math.sin(ring * Math.PI * 2 - 1.2));
  }, { seg: 12, vByLength: true, aoFn: t => 0.55 + 0.45 * Math.min(1, t * 6) * (1 - Math.max(0, t - 0.85) * 3) });
  // crown boss
  m.mat('bark').col(0.45, 0.36, 0.22).ao(0.6);
  m.sphere(top[0], top[1], top[2] + 0.4 * sc, 1.9 * sc, 1.9 * sc, 1.4 * sc, { seg: 10, rings: 6 });
  // coconuts
  m.mat('coconut');
  const nc = 3 + Math.floor(r() * 4);
  for (let k = 0; k < nc; k++) {
    const a = k / nc * Math.PI * 2 + r(), rr = 1.6 * sc, cz = top[2] - 1.0 * sc - r() * 0.8 * sc;
    const ripe = r() < 0.5;
    m.col(ripe ? [0.50, 0.34, 0.18] : [0.46, 0.52, 0.20]).ao(0.55);
    m.sphere(top[0] + Math.cos(a) * rr, top[1] + Math.sin(a) * rr, cz, 1.25 * sc, 1.25 * sc, 1.4 * sc, { seg: 9, rings: 6 });
  }
  // fronds: young ones up, mature ones arching out, a couple of old ones hanging
  const nf = o.fronds ?? (15 + Math.floor(r() * 5));
  const green = o.leafColor ?? [0.20 + r() * 0.06, 0.46 + r() * 0.08, 0.13];
  m.mat('frond');
  for (let k = 0; k < nf; k++) {
    const az = k / nf * Math.PI * 2 + r() * 0.5, kind = r();
    const young = kind < 0.2, old = kind > 0.9;
    const elev = young ? 0.75 + r() * 0.35 : old ? -0.5 - r() * 0.4 : 0.15 + r() * 0.35;
    const len = (young ? 15 : 24 + r() * 7) * sc, wid = (young ? 3.4 : 5.0 + r() * 0.8) * sc;
    const col = old ? [0.62, 0.48, 0.26] : young ? [green[0] + 0.12, green[1] + 0.1, green[2] + 0.02] : green.map((c, i) => c * (0.85 + r() * 0.25));
    m.seed((o.seed ?? 1) * 131 + k);
    frond(m, [top[0], top[1], top[2] + 0.6 * sc], az, elev, len, wid, {
      droop: young ? 0.15 : old ? 0.2 : 0.55 + r() * 0.25, keel: 0.45, twist: (r() - 0.5) * 0.6, seg: 12,
      colFn: (u, v) => [col[0] * (0.82 + u * 0.25), col[1] * (0.85 + u * 0.2), col[2] * (0.9 + u * 0.1)],
      aoFn: (u, v) => 0.42 + 0.58 * Math.min(1, u * 1.8) * (young ? 1 : 0.9 + 0.1 * Math.abs(v)),
    });
  }
  if (o.canopy) m.canopy(false);
  return m;
}

export function bush(m, o) {
  const r = rand(o.seed ?? 3), R = o.r ?? 6, z0 = o.z ?? 0, n = o.leaves ?? Math.round(14 + R * 1.6);
  const c = o.color ?? [0.26, 0.5, 0.2];
  m.mat('leaf').seed((o.seed ?? 3) * 977);
  for (let k = 0; k < n; k++) {
    const az = r() * Math.PI * 2, elev = 0.25 + r() * 0.9, len = R * (0.7 + r() * 0.45), wid = len * (0.22 + r() * 0.1);
    const col = c.map(v => v * (0.8 + r() * 0.35));
    frond(m, [o.x + (r() - 0.5) * R * 0.3, o.y + (r() - 0.5) * R * 0.3, z0 + r() * R * 0.15], az, elev, len, wid, {
      droop: 0.5 + r() * 0.5, keel: 0.15, seg: 6, cols: 2, taper: false,
      colFn: (u) => [col[0] * (0.8 + u * 0.3), col[1] * (0.8 + u * 0.3), col[2]], aoFn: u => 0.5 + 0.5 * u,
    });
  }
  return m;
}

export function fern(m, o) {
  const r = rand(o.seed ?? 4), R = o.r ?? 5, z0 = o.z ?? 0, n = o.fronds ?? 9;
  const c = o.color ?? [0.3, 0.56, 0.24];
  m.mat('frond');
  for (let k = 0; k < n; k++) {
    m.seed((o.seed ?? 4) * 31 + k);
    frond(m, [o.x, o.y, z0 + 0.3], k / n * Math.PI * 2 + r() * 0.4, 0.5 + r() * 0.4, R * (0.8 + r() * 0.4), R * 0.2, {
      droop: 0.9, keel: 0.3, seg: 8, colFn: u => [c[0] * (0.85 + u * 0.2), c[1] * (0.85 + u * 0.2), c[2]], aoFn: u => 0.55 + 0.45 * u,
    });
  }
  return m;
}

export function rock(m, o) {
  const r = rand(o.seed ?? 5), R = o.r ?? 4, z0 = o.z ?? 0, s = o.seed ?? 5;
  m.mat('stone').col(o.color ?? [0.55, 0.52, 0.48]).seed(s);
  const flat = o.flat ?? 0.6;
  m.sphere(o.x, o.y, z0 + R * flat * 0.35, R, R * (0.8 + r() * 0.3), R * flat, {
    seg: 16, rings: 10,
    disp: (nx, ny, nz) => 1 + noise3(nx * 1.6 + s, ny * 1.6, nz * 1.6) * 0.28 + noise3(nx * 4 + s, ny * 4, nz * 4) * 0.08 - Math.max(0, -nz) * 0.4,
    aoFn: (nx, ny, nz) => 0.55 + 0.45 * Math.max(0, nz * 0.5 + 0.5),
  });
  return m;
}

export function tree(m, o) {
  const r = rand(o.seed ?? 6), H = o.h ?? 30, R = o.r ?? 12, z0 = o.z ?? 0, s = o.seed ?? 6;
  const c = o.color ?? [0.26, 0.48, 0.2];
  m.mat('bark').col(0.42, 0.32, 0.22).seed(s);
  const lean = [(r() - 0.5) * 3, (r() - 0.5) * 3];
  const trunk = [[o.x, o.y, z0 - 0.5], [o.x + lean[0] * 0.4, o.y + lean[1] * 0.4, z0 + H * 0.35], [o.x + lean[0], o.y + lean[1], z0 + H * 0.65]];
  m.tube(trunk, t => (1.4 - t * 0.6) * (H / 30) + Math.max(0, 1 - t * 8) * 0.8, { seg: 10, aoFn: t => 0.5 + t * 0.4 });
  m.mat('foliage');
  const top = trunk[2], nb = 5 + Math.floor(r() * 3);
  for (let k = 0; k < nb; k++) {
    const a = k / nb * Math.PI * 2 + r(), d = k === 0 ? 0 : R * (0.35 + r() * 0.25), rr = k === 0 ? R * 0.75 : R * (0.45 + r() * 0.2);
    const cz = top[2] + (k === 0 ? R * 0.35 : r() * R * 0.3);
    const cc = c.map(v => v * (0.85 + r() * 0.3));
    m.seed(s * 17 + k);
    m.sphere(top[0] + Math.cos(a) * d, top[1] + Math.sin(a) * d, cz, rr, rr, rr * 0.8, {
      seg: 18, rings: 12,
      disp: (nx, ny, nz) => 1 + noise3(nx * 2.2 + k * 3 + s, ny * 2.2, nz * 2.2) * 0.22 + noise3(nx * 6 + s, ny * 6, nz * 6) * 0.06,
      colFn: (nx, ny, nz) => [cc[0] * (0.8 + nz * 0.25), cc[1] * (0.82 + nz * 0.2), cc[2]], aoFn: (nx, ny, nz) => 0.45 + 0.55 * Math.max(0, nz * 0.6 + 0.4),
    });
  }
  return m;
}
