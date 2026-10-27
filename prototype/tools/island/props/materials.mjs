// Prop materials. Each material may define
//   alpha(s) -> boolean      cut-out test (leaf shapes, thatch fringes), using s.u, s.v (and s.seed)
//   shade(s)                 sets the surface: s.ar, s.ag, s.ab (albedo, sRGB 0..1), s.spec (0..1), s.shin (exponent),
//                            s.trans (light through thin leaves 0..1), s.er, s.eg, s.eb (emissive, linear), and may
//                            perturb the normal s.nx, s.ny, s.nz (keep it unit length)
// Inputs on s: u, v (mesh uv), cr, cg, cb (vertex colour), ao (vertex AO), x, y, z (world), nx, ny, nz (normal),
// seed (per-triangle-group hash, stable). Region modules can add their own materials in their `materials` export.
import { noise2, noise3, fbm2, hash2, clamp, smooth, sat } from '../lib/noise.mjs';

const base = s => { s.ar = s.cr; s.ag = s.cg; s.ab = s.cb; s.spec = 0.04; s.shin = 20; s.trans = 0; s.er = s.eg = s.eb = 0; };
const bump = (s, k, f = 1) => {   // cheap 3D noise bump
  const e = 0.15, n0 = noise3(s.x * f, s.y * f, s.z * f);
  const gx = (noise3((s.x + e) * f, s.y * f, s.z * f) - n0) / e, gy = (noise3(s.x * f, (s.y + e) * f, s.z * f) - n0) / e, gz = (noise3(s.x * f, s.y * f, (s.z + e) * f) - n0) / e;
  s.nx -= gx * k; s.ny -= gy * k; s.nz -= gz * k; const l = Math.hypot(s.nx, s.ny, s.nz); s.nx /= l; s.ny /= l; s.nz /= l;
};

export const MATERIALS = {
  default: { shade: base },
  paint: { shade(s) { base(s); const n = noise3(s.x * 0.8, s.y * 0.8, s.z * 0.8) * 0.04; s.ar += n; s.ag += n; s.ab += n; s.spec = 0.12; s.shin = 30; } },
  glow: { shade(s) { base(s); s.er = s.cr * 2.2; s.eg = s.cg * 2.2; s.eb = s.cb * 2.2; } },
  metal: { shade(s) { base(s); s.spec = 0.7; s.shin = 50; } },
  stone: { shade(s) { base(s); const n = noise3(s.x * 0.5, s.y * 0.5, s.z * 0.5) * 0.5 + noise3(s.x * 1.7, s.y * 1.7, s.z * 1.7) * 0.25; const k = 0.88 + n * 0.25; s.ar *= k; s.ag *= k; s.ab *= k; bump(s, 0.25, 0.9); } },
  cloth: { shade(s) { base(s); const w = (Math.sin(s.u * 90) * Math.sin(s.v * 90)) * 0.04; s.ar += w; s.ag += w; s.ab += w; } },
  rope: { shade(s) { base(s); const t = Math.sin((s.u * 6 + s.v * 40) * Math.PI) * 0.5 + 0.5; const k = 0.75 + t * 0.35; s.ar *= k; s.ag *= k; s.ab *= k; } },
  coconut: { shade(s) { base(s); const f = noise3(s.x * 3, s.y * 3, s.z * 3) * 0.5 + 0.5; const k = 0.75 + f * 0.35; s.ar *= k; s.ag *= k; s.ab *= k; s.spec = 0.15; s.shin = 18; bump(s, 0.35, 2.5); } },
  // planks / beams: grain along u, board seams every 1/boards of v (set boards via vertex colour channel? no: fixed)
  wood: {
    shade(s) {
      base(s);
      const grain = noise2(s.u * 1.2 + s.seed * 3.1, s.v * 14) * 0.5 + noise2(s.u * 4, s.v * 40) * 0.25;
      const board = Math.floor(s.v * 2.2 + s.seed), seam = Math.abs(((s.v * 2.2 + s.seed) % 1 + 1) % 1 - 0.5) > 0.46;
      const tone = 0.86 + hash2(board, Math.floor(s.u / 6), 7) * 0.22 + grain * 0.12;
      s.ar *= tone; s.ag *= tone; s.ab *= tone; if (seam) { s.ar *= 0.55; s.ag *= 0.55; s.ab *= 0.55; }
      s.spec = 0.05;
    },
  },
  bamboo: {
    shade(s) {
      base(s);
      const node = Math.abs(((s.v * 3) % 1 + 1) % 1 - 0.5) > 0.45;
      const k = 0.9 + noise2(s.u * 20, s.v * 3) * 0.08 + (node ? -0.25 : 0);
      s.ar *= k; s.ag *= k; s.ab *= k; s.spec = 0.25; s.shin = 30;
    },
  },
  bark: {
    shade(s) {
      base(s);
      const st = noise2(s.u * 9 + s.seed, s.v * 1.2) * 0.5 + noise2(s.u * 23, s.v * 3) * 0.3, k = 0.8 + st * 0.3;
      s.ar *= k; s.ag *= k; s.ab *= k; bump(s, 0.2, 1.4);
    },
  },
  // palm trunk: tube built with vByLength, rings every ~1.25 units, fibrous between them
  palmTrunk: {
    shade(s) {
      base(s);
      const r = ((s.v / 1.25) % 1 + 1) % 1, ring = smooth(0.0, 0.18, r) * smooth(1.0, 0.82, r);
      const fib = noise2(s.u * 40 + s.seed, s.v * 2) * 0.5 + 0.5;
      const k = 0.62 + ring * 0.42 + fib * 0.1;
      s.ar *= k; s.ag *= k; s.ab *= k;
      const g = (1 - ring) * 0.8; s.nz += g * 0.0;
      s.spec = 0.05;
    },
  },
  // a palm frond half: ribbon u along the spine 0..1, v across -1..1 (|v| = distance from the midrib)
  frond: {
    alpha(s) {
      const u = s.u, av = Math.abs(s.v);
      if (u < 0.06) return av < 0.12;                    // bare petiole near the crown
      const wmax = Math.sin(Math.min(1, (u - 0.04) / 0.96) * Math.PI) * 0.92 + 0.08 * (1 - u);
      if (av > wmax) return false;
      const N = 26 + (s.seed % 6);                         // leaflets: slanted slots with gaps
      const f = ((u * N - av * 1.4 + s.seed * 0.13) % 1 + 1) % 1;
      const gap = 0.16 + av * 0.32 + (u > 0.85 ? 0.2 : 0);
      if (f < gap) return av < 0.07;                       // keep the midrib
      // ragged leaflet tips
      return av < wmax * (0.9 + 0.1 * Math.sin(u * 300 + s.seed));
    },
    shade(s) {
      base(s);
      const u = s.u, av = Math.abs(s.v);
      const tip = smooth(0.55, 1.0, u), mid = av < 0.06;
      const k = 0.82 + noise2(u * 40, av * 6 + s.seed) * 0.12 + av * 0.15;
      s.ar *= k; s.ag *= k; s.ab *= k;
      s.ar += tip * 0.08; s.ag += tip * 0.06;             // tips lighter, yellower
      if (mid) { s.ar = s.ar * 0.6 + 0.35; s.ag = s.ag * 0.6 + 0.36; s.ab = s.ab * 0.6 + 0.12; }
      s.trans = 0.6; s.spec = 0.18; s.shin = 26;
    },
  },
  // broad leaf (bananas, monstera, bushes): u along, v across; elliptic outline with a midrib and veins
  leaf: {
    alpha(s) { const u = s.u, av = Math.abs(s.v); const w = Math.sin(Math.min(1, u) * Math.PI) ** 0.7; return av < w; },
    shade(s) {
      base(s);
      const av = Math.abs(s.v), vein = Math.abs(((s.u * 9 - av * 3) % 1 + 1) % 1 - 0.5) > 0.44;
      const k = 0.85 + noise2(s.u * 9 + s.seed, s.v * 4) * 0.12 + (vein ? 0.06 : 0) + av * 0.08;
      s.ar *= k; s.ag *= k; s.ab *= k;
      if (av < 0.05) { s.ar = s.ar * 0.6 + 0.3; s.ag = s.ag * 0.6 + 0.34; s.ab = s.ab * 0.6 + 0.1; }
      s.trans = 0.5; s.spec = 0.3; s.shin = 40;
    },
  },
  // thatch: straw streaks running down v, layered rows, a ragged fringe at the bottom (v < 0.04)
  thatch: {
    alpha(s) { if (s.v > 0.05) return true; return ((noise2(s.u * 140, 3) * 0.5 + 0.5) * 0.05) < s.v + 0.008; },
    shade(s) {
      base(s);
      const streak = noise2(s.u * 220 + s.seed, s.v * 5) * 0.5 + noise2(s.u * 600, s.v * 9) * 0.3;
      const row = ((s.v * 7) % 1 + 1) % 1, lip = smooth(0.75, 1, row);
      const k = 0.78 + streak * 0.22 - lip * 0.22 + (row < 0.15 ? 0.1 : 0);
      s.ar *= k; s.ag *= k; s.ab *= k; s.spec = 0.03;
      const l = 1; s.nz += (row - 0.5) * 0.25 * l; const n = Math.hypot(s.nx, s.ny, s.nz); s.nx /= n; s.ny /= n; s.nz /= n;
    },
  },
  // foliage blobs (bush / tree crowns built as displaced spheres)
  foliage: {
    shade(s) {
      base(s);
      const n = noise3(s.x * 0.9, s.y * 0.9, s.z * 0.9) * 0.5 + noise3(s.x * 2.3, s.y * 2.3, s.z * 2.3) * 0.35;
      const k = 0.78 + n * 0.35; s.ar *= k; s.ag *= k; s.ab *= k;
      bump(s, 0.9, 1.1); s.trans = 0.3; s.spec = 0.08; s.shin = 14;
    },
  },
};
