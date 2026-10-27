// Deterministic procedural noise for the island bake: hashes, value / gradient noise (2D, 3D), fbm, ridged noise,
// Worley (cellular) noise and a seeded PRNG. Everything is pure and allocation-free on the hot path, so every worker
// thread produces bit-identical results.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;

// seeded PRNG (mulberry32): rand(seed)() -> [0,1)
export function rand(seed) {
  let a = (seed | 0) ^ 0x9e3779b9;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// integer hashes -> uint32 / [0,1)
export function ihash2(i, j, s = 0) {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ Math.imul(s | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return (h ^ (h >>> 15)) >>> 0;
}
export const hash2 = (i, j, s = 0) => ihash2(i, j, s) / 4294967296;
export function ihash3(i, j, k) {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ Math.imul(k | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return (h ^ (h >>> 15)) >>> 0;
}

// permutation table + gradients for Perlin noise
const PERM = new Uint16Array(1024);
{ const r = rand(1337), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 1024; i++) PERM[i] = p[i & 255]; }
const GX = new Float32Array(256), GY = new Float32Array(256);
for (let i = 0; i < 256; i++) { const a = (i / 256) * TAU + 0.37; GX[i] = Math.cos(a); GY[i] = Math.sin(a); }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

// 2D gradient (Perlin) noise, roughly [-1, 1]
export function noise2(x, y) {
  const xf = Math.floor(x), yf = Math.floor(y), X = xf & 255, Y = yf & 255, fx = x - xf, fy = y - yf;
  const a = PERM[X] + Y, b = PERM[X + 1] + Y;
  const g00 = PERM[a], g10 = PERM[b], g01 = PERM[a + 1], g11 = PERM[b + 1];
  const n00 = GX[g00] * fx + GY[g00] * fy, n10 = GX[g10] * (fx - 1) + GY[g10] * fy;
  const n01 = GX[g01] * fx + GY[g01] * (fy - 1), n11 = GX[g11] * (fx - 1) + GY[g11] * (fy - 1);
  const u = fade(fx), v = fade(fy), nx0 = n00 + u * (n10 - n00), nx1 = n01 + u * (n11 - n01);
  return (nx0 + v * (nx1 - nx0)) * 1.42;
}

// 3D value noise, [-1, 1]
export function noise3(x, y, z) {
  const xf = Math.floor(x), yf = Math.floor(y), zf = Math.floor(z), fx = x - xf, fy = y - yf, fz = z - zf;
  const X = xf & 255, Y = yf & 255, Z = zf & 255;
  const u = fade(fx), v = fade(fy), w = fade(fz);
  const A = PERM[X] + Y, B = PERM[X + 1] + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;
  const c = i => PERM[i] / 127.5 - 1;
  const x00 = c(AA) + u * (c(BA) - c(AA)), x10 = c(AB) + u * (c(BB) - c(AB));
  const x01 = c(AA + 1) + u * (c(BA + 1) - c(AA + 1)), x11 = c(AB + 1) + u * (c(BB + 1) - c(AB + 1));
  const y0 = x00 + v * (x10 - x00), y1 = x01 + v * (x11 - x01);
  return y0 + w * (y1 - y0);
}

// fractal sums
export function fbm2(x, y, oct = 5, lac = 2.03, gain = 0.5) {
  let s = 0, a = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x, y); n += a; a *= gain; const t = x; x = x * lac + y * 0.31 + 17.1; y = y * lac - t * 0.31 + 3.7; }
  return s / n;
}
export function fbm3(x, y, z, oct = 4, lac = 2.07, gain = 0.5) {
  let s = 0, a = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x, y, z); n += a; a *= gain; x = x * lac + 5.3; y = y * lac + 1.7; z = z * lac + 9.1; }
  return s / n;
}
// ridged multifractal, [0, 1], sharp crests
export function ridge2(x, y, oct = 5, lac = 2.1, gain = 0.55) {
  let s = 0, a = 1, n = 0, w = 1;
  for (let i = 0; i < oct; i++) {
    let r = 1 - Math.abs(noise2(x, y)); r *= r; r *= w; w = clamp(r * 1.6);
    s += a * r; n += a; a *= gain; const t = x; x = x * lac + y * 0.27 + 11.3; y = y * lac - t * 0.27 + 7.9;
  }
  return s / n;
}
// domain-warped fbm (organic, flowing shapes)
export function warp2(x, y, amt = 1, oct = 4) {
  const qx = fbm2(x + 1.7, y + 9.2, 3), qy = fbm2(x + 8.3, y + 2.8, 3);
  return fbm2(x + amt * qx, y + amt * qy, oct);
}

// Worley / cellular noise. Results are written into W (no allocation): f1, f2 distances, id (cell hash, uint32),
// px, py (the nearest feature point) and qx, qy (the second nearest). jitter 0..1.
export const W = { f1: 0, f2: 0, id: 0, px: 0, py: 0, qx: 0, qy: 0, cx: 0, cy: 0 };
export function worley2(x, y, jitter = 0.9, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 1e9, f2 = 1e9, id = 0, px = 0, py = 0, qx = 0, qy = 0, cx = 0, cy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const h = ihash2(xi + i, yi + j, seed), fx = xi + i + 0.5 + jitter * (((h & 0xffff) / 65535) - 0.5), fy = yi + j + 0.5 + jitter * (((h >>> 16) / 65535) - 0.5);
    const dx = fx - x, dy = fy - y, d = dx * dx + dy * dy;
    if (d < f1) { f2 = f1; qx = px; qy = py; f1 = d; id = h; px = fx; py = fy; cx = xi + i; cy = yi + j; } else if (d < f2) { f2 = d; qx = fx; qy = fy; }
  }
  W.f1 = Math.sqrt(f1); W.f2 = Math.sqrt(f2); W.id = id; W.px = px; W.py = py; W.qx = qx; W.qy = qy; W.cx = cx; W.cy = cy;
  return W;
}
// distance to the Voronoi cell edge (exact-ish: projection onto the bisector of the two nearest points)
export function cellEdge(x, y) {
  const mx = (W.px + W.qx) * 0.5, my = (W.py + W.qy) * 0.5, dx = W.qx - W.px, dy = W.qy - W.py, l = Math.hypot(dx, dy) || 1;
  return ((mx - x) * dx + (my - y) * dy) / l;
}
// hexagonal cells (for basalt columns): returns distance to the hex edge (0 at edge) and a cell id in HX
export const HX = { edge: 0, id: 0, cx: 0, cy: 0 };
export function hex2(x, y) {
  const s3 = Math.sqrt(3);
  // axial coordinates
  const q = (s3 / 3 * x - y / 3), r = (2 / 3) * y;
  let rx = Math.round(q), ry = Math.round(r), rz = Math.round(-q - r);
  const dx = Math.abs(rx - q), dy = Math.abs(ry - r), dz = Math.abs(rz + q + r);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz;
  const cx = s3 * (rx + ry / 2), cy = 1.5 * ry, ox = x - cx, oy = y - cy;
  // hex (pointy top) distance from centre in hex norm: max over 3 axes
  const a = Math.abs(ox), b = Math.abs(ox / 2 + oy * s3 / 2), c = Math.abs(ox / 2 - oy * s3 / 2);
  const m = Math.max(a, b, c);
  HX.id = ihash2(rx, ry, 77); HX.cx = cx; HX.cy = cy;
  HX.edge = s3 / 2 - m;   // 0 on the edge, the apothem (0.866) at the centre
  return HX;
}
