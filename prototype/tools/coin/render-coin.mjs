// Renders the coconut coin in 3D and writes its spin as a sprite sheet for the game.
//
// The coin is a real solid: a thick gold disc (a rounded cylinder, ray-marched) with a raised rim, a reeded edge and a
// coconut palm struck in relief on both faces (the relief is a height map, rasterised here from the same palm the game
// used to draw, and shades the faces through their normals). The field is polished like a proof coin and the relief
// frosted, so the palm reads at any angle. Lit by a warm studio: a big soft key at the upper left, a strip light at the
// right, a bright sky and a dark floor, all reflected in gold.
//
// It turns a full circle about its upright axis, seen from a little above, in FRAMES steps. Two coins: the plain one
// and the big one (a beaded rim). Output (prototype/art/):
//   coins.png       the sheet: COLS x ROWS cells of CELL px; the plain coin's frames first, then the big coin's
//   coin-icon.png   the plain coin front-on, small, for the HTML coin icons
//   coins.json      the layout, and how many world units a cell spans
//
//   node render-coin.mjs                      (then update the ?v= stamps on art/coins.png and art/coin-icon.png in
//                                             index.html to the files' new shasum, so no one plays a cached old coin)
//   PREVIEW=out.png node render-coin.mjs      (a few frames large, to look at the coin closely)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../art');
const FRAMES = 96, COLS = 16, CELL = 112, SPAN = 29;   // a cell spans SPAN world units (the coin is 26 across)
const ICON = 64;
const SS = 3;                                        // supersampling per axis
const TILT = 10 * Math.PI / 180;                     // seen this far from above

// ---------- the coin's shape (world units) ----------
const R = 13.0, T = 2.8, RB = 0.55, RIM = 2.2;       // radius, thickness, the rounding of its edges, rim width
const F = R - RIM;

// ---------- the face's height map: rim, field and the palm in relief ----------
const HM = 768;                                      // samples across the face
const px = u => (u + R) / (2 * R) * HM;              // world -> map

// the palm, as in the game's flat drawing: a leaning trunk, five fronds from the crown, three coconuts
const CROWN = [0.2, -3.0], FRONDS = [[-8.8, -1.0], [-6.6, -7.2], [0.2, -9.6], [6.8, -7.0], [9.0, -0.6]];
const NUTS = [[-1.6, -1.6, 1.9], [1.8, -1.4, 1.85], [0.1, 0.6, 1.8]];
const quad = (a, b, c, n = 20) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [s * s * a[0] + 2 * s * t * b[0] + t * t * c[0], s * s * a[1] + 2 * s * t * b[1] + t * t * c[1]]; });
function frondPoly([ex, ey]) {
  const [cx, cy] = CROWN, mx = (cx + ex) / 2, my = (cy + ey) / 2, L = Math.hypot(ex - cx, ey - cy), nx = (ey - cy) / L, ny = -(ex - cx) / L, w = L * 0.28 * (ny > 0 ? -1 : 1);
  return [...quad([cx, cy], [mx + nx * w, my + ny * w - 1.6], [ex, ey]), ...quad([ex, ey], [mx + nx * w * 0.15, my + ny * w * 0.15 + 0.6], [cx, cy]).slice(1)];
}
const trunkPoly = [...quad([0.6, 9.8], [3.0, 3.4], [-0.4, -2.4]), [1.0, -2.2], ...quad([1.0, -2.2], [5.0, 3.4], [3.4, 9.6])];
// fill polygons into a mask (scanlines, non-zero), at the map's resolution
function fill(mask, polys) {
  for (const poly of polys) {
    const P = poly.map(([x, y]) => [px(x), px(y)]);
    for (let j = 0; j < HM; j++) {
      const y = j + 0.5, xs = [];
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), a[1] < b[1] ? 1 : -1]); }
      xs.sort((p, q) => p[0] - q[0]);
      let w = 0;
      for (let k = 0; k < xs.length - 1; k++) { w += xs[k][1]; if (w) for (let i = Math.max(0, Math.ceil(xs[k][0] - 0.5)); i < Math.min(HM, xs[k + 1][0] - 0.5); i++) mask[j * HM + i] = 1; }
    }
  }
}
function blur(a, r) {   // three box passes each way (about a gaussian)
  const tmp = new Float32Array(a.length);
  for (let pass = 0; pass < 3; pass++) for (const [s0, s1] of [[1, HM], [HM, 1]]) {
    for (let line = 0; line < HM; line++) {
      let acc = 0; const base = line * s1, at = i => a[base + Math.min(HM - 1, Math.max(0, i)) * s0];
      for (let i = -r; i <= r; i++) acc += at(i);
      for (let i = 0; i < HM; i++) { tmp[base + i * s0] = acc / (2 * r + 1); acc += at(i + r + 1) - at(i - r); }
    }
    a.set(tmp);
  }
  return a;
}
const segDist = (x, y, P) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return d; };
function heightMap(big) {
  const N = HM * HM, frond = new Float32Array(N), trunk = new Float32Array(N), nut = new Float32Array(N);
  fill(frond, FRONDS.map(frondPoly)); fill(trunk, [trunkPoly]);
  fill(nut, NUTS.map(([x, y, r]) => Array.from({ length: 48 }, (_, i) => [x + Math.cos(i / 48 * 6.283) * r, y + Math.sin(i / 48 * 6.283) * r])));
  const bev = Math.round(0.28 / (2 * R) * HM);
  blur(frond, bev); blur(trunk, bev); blur(nut, bev);
  const ribs = FRONDS.map(([ex, ey]) => { const [cx, cy] = CROWN; return quad([cx, cy], [(cx + ex) / 2, (cy + ey) / 2 - 1.0], [ex * 0.92 + cx * 0.08, ey * 0.92 + cy * 0.08], 12); });
  const rings = [7.6, 5.2, 2.8, 0.6].map(y => { const x = 2.0 + (y - 3) * 0.05 + (y < 3 ? -0.6 : 0.2); return quad([x - 1.1, y - 0.3], [x, y + 0.4], [x + 1.2, y - 0.2], 8); });
  const H = new Float32Array(N), relief = new Float32Array(N);
  for (let j = 0; j < HM; j++) for (let i = 0; i < HM; i++) {
    const u = (i + 0.5) / HM * 2 * R - R, v = (j + 0.5) / HM * 2 * R - R, r = Math.hypot(u, v), k = j * HM + i;
    // the rim: a rounded bank rising from the field, its top at the face; the field sunk below it
    let h;
    if (r > F) { const q = (r - (F + RIM * 0.5)) / (RIM * 0.5); h = -0.05 - 0.3 * q * q; if (r < F + 0.35) h = Math.min(h, -0.7 + (r - F) / 0.35 * 0.4); }
    else h = -0.7;
    if (big) for (let b = 0; b < 18; b++) { const a = b / 18 * 6.283, d = Math.hypot(u - Math.cos(a) * (R - 1.15), v - Math.sin(a) * (R - 1.15)); if (d < 0.5) h = Math.max(h, 0.0 + 0.22 * Math.sqrt(1 - (d / 0.5) ** 2)); }
    // the palm: trunk with its rings cut in, fronds with a groove down each midrib, domed coconuts on top
    let e = 0;
    if (trunk[k] > 0.01) { let g = 0; for (const P of rings) g = Math.max(g, Math.max(0, 1 - segDist(u, v, P) / 0.22)); e = Math.max(e, trunk[k] * (0.36 - 0.12 * g)); }
    if (frond[k] > 0.01) { let g = 0; for (const P of ribs) g = Math.max(g, Math.max(0, 1 - segDist(u, v, P) / 0.2)); e = Math.max(e, frond[k] * (0.42 - 0.14 * g)); }
    if (nut[k] > 0.01) { let dome = 0; for (const [x, y, rr] of NUTS) { const d = Math.hypot(u - x, v - y) / rr; if (d < 1) dome = Math.max(dome, Math.sqrt(1 - d * d)); } e = Math.max(e, nut[k] * (0.4 + 0.3 * dome)); }
    H[k] = h + (r < F ? e : 0); relief[k] = r < F ? Math.min(1, e / 0.3) : 1;
  }
  // occlusion: how far a point sits below its neighbourhood
  const wide = blur(Float32Array.from(H), Math.round(0.9 / (2 * R) * HM)), ao = new Float32Array(N);
  for (let k = 0; k < N; k++) ao[k] = Math.max(0.45, Math.min(1, 1 - 1.3 * Math.max(0, wide[k] - H[k])));
  return { H, relief, ao };
}

// ---------- rendering ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
// the coin's local frame: its faces are z = ±T/2, y up (screen y runs down, so local y is flipped when drawing)
function sdf(p) {
  const qx = Math.hypot(p[0], p[1]) - (R - RB), qz = Math.abs(p[2]) - (T / 2 - RB);
  return Math.min(Math.max(qx, qz), 0) + Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) - RB;
}
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// The studio the gold reflects (camera space: x right, y up, z towards the viewer). Metal is only what it reflects, so the
// room has real contrast: a near-black floor, a bright horizon line, a dim sky, two sharp softboxes (a big one up at
// the left, a smaller one low in front), a hot strip light at the right and a dark flag at the left.
const ang = d => [Math.atan2(d[0], d[2]), Math.asin(Math.max(-1, Math.min(1, d[1])))];   // azimuth (0 = towards us), elevation
const box = (az, el, a0, a1, e0, e1, soft) => smoothstep(a0 - soft, a0, az) * (1 - smoothstep(a1, a1 + soft, az)) * smoothstep(e0 - soft, e0, el) * (1 - smoothstep(e1, e1 + soft, el));
function env(d) {
  const [az, el] = ang(d);
  const floor = 0.03 + 0.06 * smoothstep(-1.2, -0.05, el), sky = 0.22 + 0.16 * smoothstep(0.1, 1.2, el);
  let L = el < 0 ? floor : sky;
  L += Math.exp(-(((el - 0.04) / 0.06) ** 2)) * 0.7;                                            // the horizon line
  L += box(az, el, -1.25, -0.35, 0.45, 1.05, 0.06) * 3.2;                                     // the big key softbox
  L += box(az, el, -0.45, 0.5, 0.08, 0.5, 0.08) * 1.0;                                       // the front softbox
  L += box(az, el, 0.95, 1.1, -0.35, 0.8, 0.03) * 2.6;                                         // the strip light
  L *= 1 - 0.7 * box(az, el, -2.2, -1.5, -0.2, 0.9, 0.12);                                   // a black flag
  return [L * 1.0, L * 0.9, L * 0.74];   // (the lights a touch warm)
}
// gold's reflectance (linear; a little richer than measured, as gold reads in photographs, where its own
// reflections in its relief deepen it): every colour it shows is the room, tinted
const GOLD = [1.0, 0.6, 0.14];
// a fixed spread of directions for blurred (frosted) reflections
const SPREAD = Array.from({ length: 16 }, (_, i) => { const z = 1 - (i + 0.5) / 16, r = Math.sqrt(1 - z * z), a = i * 2.39996; return [Math.cos(a) * r, Math.sin(a) * r, z]; });
// pure metal: no diffuse at all. A mirror where polished; where frosted, the reflection blurred over a cone
// (rough = its width). Fresnel lifts it towards white at grazing angles.
function shadeMetal(n, v, rough, ao) {
  const dn = dot(n, v), rv = norm([2 * dn * n[0] - v[0], 2 * dn * n[1] - v[1], 2 * dn * n[2] - v[2]]);
  let e = [0, 0, 0];
  if (rough < 0.02) e = env(rv);
  else {
    const tx = norm(Math.abs(rv[1]) < 0.9 ? [rv[2], 0, -rv[0]] : [1, 0, 0]), ty = [rv[1] * tx[2] - rv[2] * tx[1], rv[2] * tx[0] - rv[0] * tx[2], rv[0] * tx[1] - rv[1] * tx[0]];
    let w = 0;
    for (const [sx, sy, sz] of SPREAD) {
      const dd = norm([rv[0] * sz + (tx[0] * sx + ty[0] * sy) * rough, rv[1] * sz + (tx[1] * sx + ty[1] * sy) * rough, rv[2] * sz + (tx[2] * sx + ty[2] * sy) * rough]);
      if (dot(dd, n) <= 0) continue;
      const c = env(dd); e = [e[0] + c[0], e[1] + c[1], e[2] + c[2]]; w++;
    }
    e = e.map(x => x / (w || 1));
  }
  const fr = Math.pow(1 - Math.max(0, dn), 5);
  return GOLD.map((g, i) => (g + (1 - g) * fr) * e[i] * ao);
}
// film-like: highlights burn towards white, shadows stay rich (ACES fit), then to sRGB
// The cel look: flat bands of the game's own coin golds instead of reflections, so the
// spinning 3D coin reads as drawn art. Darker golds stand in for any outline (never black).
const PAL = [[100, 58, 8], [136, 80, 12], [176, 108, 20], [234, 170, 40], [255, 222, 96], [255, 250, 214]].map(c => c.map(x => x / 255));
const LIGHT = norm([-0.5, 0.6, 0.65]), HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
function shadeToon(n, v, kind, ao) {
  const d = dot(n, LIGHT);
  let lv = d < 0 ? 1 : d < 0.35 ? 2 : d < 0.88 ? 3 : 4;
  if (kind === 'relief' || kind === 'rim') lv = Math.min(lv + 1, 4); else if (kind === 'field') lv = Math.min(lv, 3);   // the palm always a step above its field
  if (ao < 0.78) lv--;
  if (dot(n, HALF) > 0.985) lv = 5;
  if (dot(n, v) < 0.28) lv -= 2;   // the turned-away bevel: a dark-gold contour
  return PAL[Math.max(0, Math.min(5, lv))];
}
const tone = x => { const y = x * 0.75, m = (y * (2.51 * y + 0.03)) / (y * (2.43 * y + 0.59) + 0.14); return Math.pow(Math.max(0, Math.min(1, m)), 1 / 2.2); };

function renderCell(hm, theta, size, span, tilt = TILT) {
  const out = new Uint8ClampedArray(size * size * 4), V = [0, 0, 1];
  const toLocal = p => rotY(rotX(p, tilt), -theta), toCam = n => rotX(rotY(n, theta), -tilt);
  const sample = (A, u, v) => {   // bilinear
    const x = Math.max(0, Math.min(HM - 1.001, px(u) - 0.5)), y = Math.max(0, Math.min(HM - 1.001, px(v) - 0.5)), i = x | 0, j = y | 0, fx = x - i, fy = y - j, k = j * HM + i;
    return A[k] * (1 - fx) * (1 - fy) + A[k + 1] * fx * (1 - fy) + A[k + HM] * (1 - fx) * fy + A[k + HM + 1] * fx * fy;
  };
  const dHdu = 2 * R / HM;
  for (let py = 0; py < size; py++) for (let pxl = 0; pxl < size; pxl++) {
    let cr = 0, cg = 0, cb = 0, ca = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const X = ((pxl + (sx + 0.5) / SS) / size - 0.5) * span, Y = -((py + (sy + 0.5) / SS) / size - 0.5) * span;
      if (X * X + Y * Y > (R + 1) ** 2) continue;
      // march along the view ray (orthographic, towards -z in camera space)
      const o = toLocal([X, Y, 20]), d = toLocal([0, 0, -1]);
      let t = 0, hit = false, p;
      for (let it = 0; it < 96 && t < 40; it++) { p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]; const s = sdf(p); if (s < 0.002) { hit = true; break; } t += s; }
      if (!hit) continue;
      const rr = Math.hypot(p[0], p[1]);
      let n, rough, ao = 1, kind = 'side';
      if (Math.abs(p[2]) > T / 2 - 0.02 && rr < R - RB) {
        // a face: its relief from the height map (the back face read mirrored, so the palm faces the same way)
        const front = p[2] > 0, u = front ? p[0] : -p[0], v = -p[1];
        const hx = (sample(hm.H, u + dHdu, v) - sample(hm.H, u - dHdu, v)) / (2 * dHdu), hy = (sample(hm.H, u, v + dHdu) - sample(hm.H, u, v - dHdu)) / (2 * dHdu);
        const nu = -hx, nv = -hy;   // in (u, v) face coords, v down
        n = norm([front ? nu : -nu, -nv, front ? 1 : -1]);
        const rel = sample(hm.relief, u, v); rough = Math.hypot(u, v) < F ? 0.01 + 0.32 * rel : 0.05;
        kind = Math.hypot(u, v) >= F ? 'rim' : rel > 0.5 ? 'relief' : 'field';
        ao = sample(hm.ao, u, v);
      } else {
        // the edge and its rounding: the shape's own normal, the side reeded
        const e = 0.001, g = [sdf([p[0] + e, p[1], p[2]]) - sdf([p[0] - e, p[1], p[2]]), sdf([p[0], p[1] + e, p[2]]) - sdf([p[0], p[1] - e, p[2]]), sdf([p[0], p[1], p[2] + e]) - sdf([p[0], p[1], p[2] - e])];
        n = norm(g);
        const side = Math.abs(p[2]) < T / 2 - RB, phi = Math.atan2(p[1], p[0]);
        if (side) { const w = Math.sin(phi * 96) * 0.32; n = norm([n[0] - Math.sin(phi) * w, n[1] + Math.cos(phi) * w, n[2]]); ao = 0.82 + 0.18 * Math.abs(Math.cos(phi * 96)); }
        rough = side ? 0.12 : 0.04; kind = side ? 'side' : 'bevel';
      }
      const c = shadeToon(norm(toCam(n)), V, kind, ao);
      cr += c[0]; cg += c[1]; cb += c[2]; ca += 1;
    }
    const n2 = SS * SS, k = (py * size + pxl) * 4;
    if (ca) { out[k] = cr / ca * 255; out[k + 1] = cg / ca * 255; out[k + 2] = cb / ca * 255; out[k + 3] = ca / n2 * 255; }
  }
  return out;
}

// ---------- PNG ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function png(w, h, rgba) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- the jobs: one cell each, shared out over worker threads ----------
const thetaOf = f => f / FRAMES * 2 * Math.PI;
const PREVIEW = process.env.PREVIEW;   // a path: render a few frames large there instead (to look at the coin closely)
if (isMainThread && PREVIEW) {
  const fr = [0, 9, 39, 42], P = 320, out = new Uint8ClampedArray(P * fr.length * P * 4), hm = heightMap(false);
  fr.forEach((f, i) => { const c = renderCell(hm, thetaOf(f), P, SPAN); for (let y = 0; y < P; y++) out.set(c.subarray(y * P * 4, (y + 1) * P * 4), (y * P * fr.length + i * P) * 4); });
  writeFileSync(PREVIEW, png(P * fr.length, P, out)); process.exit(0);
}
if (isMainThread) {
  const jobs = [];
  for (const big of [false, true]) for (let f = 0; f < FRAMES; f++) jobs.push({ big, f, size: CELL, span: SPAN, theta: thetaOf(f) });
  jobs.push({ big: false, f: -1, size: ICON, span: 2 * R + 0.6, theta: 0 });
  const rows = Math.ceil(FRAMES / COLS) * 2, W = COLS * CELL, Hh = rows * CELL, sheet = new Uint8ClampedArray(W * Hh * 4);
  let icon = null, next = 0, done = 0;
  const nW = Math.min(cpus().length - 2, jobs.length), t0 = Date.now();
  await new Promise(res => {
    for (let w = 0; w < nW; w++) {
      const wk = new Worker(fileURLToPath(import.meta.url), { workerData: null });
      const feed = () => { if (next < jobs.length) wk.postMessage(jobs[next++]); else wk.terminate(); };
      wk.on('message', ({ job, px: data }) => {
        if (job.f < 0) icon = data;
        else { const idx = (job.big ? FRAMES : 0) + job.f, cx = (idx % COLS) * CELL, cy = Math.floor(idx / COLS) * CELL; for (let y = 0; y < CELL; y++) sheet.set(data.subarray(y * CELL * 4, (y + 1) * CELL * 4), ((cy + y) * W + cx) * 4); }
        if (++done === jobs.length) res(); feed();
      });
      feed();
    }
  });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'coins.png'), png(W, Hh, sheet));
  writeFileSync(join(OUT, 'coin-icon.png'), png(ICON, ICON, icon));
  writeFileSync(join(OUT, 'coins.json'), JSON.stringify({ frames: FRAMES, cols: COLS, cell: CELL, span: SPAN, big: FRAMES }, null, 1));
  console.log(`${jobs.length} cells in ${((Date.now() - t0) / 1000).toFixed(1)} s -> art/coins.png ${W}x${Hh}, art/coin-icon.png`);
} else {
  const maps = {};
  parentPort.on('message', job => {
    const hm = maps[job.big] || (maps[job.big] = heightMap(job.big));
    parentPort.postMessage({ job, px: renderCell(hm, job.theta, job.size, job.span, job.tilt ?? TILT) });
  });
}
