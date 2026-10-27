// Roads, node pads and stream profiles.
// computeProfiles() samples the terrain along every stream and road on the main thread (streams flow downhill,
// roads are smoothed, bridged over water, stepped into stairs on climbs, flattened into the node pads) and packs
// the result into shared arrays. makeProf() turns those arrays into the per-texel road / pad / stream functions the
// terrain pass calls.
import { noise2, fbm2, worley2, cellEdge, W, hex2, HX, clamp, lerp, smooth, sat } from './lib/noise.mjs';
import * as L from './layout.mjs';
import { M, RI, WT, COL, NO_WATER } from './terrain.mjs';

// road surface kinds
export const RK = { DIRT: 0, FLAG: 1, PLANK: 2, COBBLE: 3, RAIL: 4, HEX: 5, SNOW: 6, SLATE: 7, BASALT: 8, FUTURE: 9, SAND: 10 };
const KIND_OF_REGION = { jungle: RK.DIRT, beach: RK.SAND, headland: RK.DIRT, temple: RK.FLAG, bog: RK.DIRT, grotto: RK.COBBLE, lagoon: RK.DIRT, mine: RK.RAIL, caves: RK.HEX, crystal: RK.FLAG, frost: RK.SNOW, storm: RK.SLATE, magma: RK.BASALT, sea: RK.PLANK, islands: RK.DIRT };
const REGK = ['jungle', 'beach', 'temple', 'bog', 'grotto', 'lagoon', 'mine', 'caves', 'crystal', 'frost', 'storm', 'magma', 'sea', 'headland', 'islands'];
export const F_BRIDGE = 1, F_STAIRS = 2;

export function computeProfiles(T, A) {
  const t0 = Date.now(), lines = A.lines, p = {};
  const off = [], n = lines.reduce((s, l) => (off.push(s), s + l.pts.length), 0);
  const Z = new Float32Array(new SharedArrayBuffer(n * 4)), FL = new Uint8Array(new SharedArrayBuffer(n)), MK = new Uint8Array(new SharedArrayBuffer(n)), RG = new Uint8Array(new SharedArrayBuffer(n));
  const surfZ = (x, y, stage) => { T.surface(x, y, p, stage); return Math.max(p.h, p.wl); };
  const smoothArr = (a, s, win) => { const o = Float64Array.from(a); for (let k = 0; k < a.length; k++) { let sum = 0, w = 0; for (let q = k - 1; q >= 0 && s[k] - s[q] < win; q--) { const ww = 1 - (s[k] - s[q]) / win; sum += a[q] * ww; w += ww; } for (let q = k; q < a.length && s[q] - s[k] < win; q++) { const ww = 1 - (s[q] - s[k]) / win; sum += a[q] * ww; w += ww; } o[k] = sum / w; } return o; };
  const PADZ = new Float32Array(new SharedArrayBuffer(L.NODES.length * 4)), PADR = new Uint8Array(new SharedArrayBuffer(L.NODES.length));
  const pads = () => L.NODES.forEach((nd, i) => {
    let s = 0, c = 0;
    for (let k = 0; k < 13; k++) { const a = k / 12 * Math.PI * 2, r = k === 12 ? 0 : 18; s += surfZ(nd.x + Math.cos(a) * r, nd.y + Math.sin(a) * r, 2); c++; }
    T.surface(nd.x, nd.y, p, 2); PADR[i] = p.reg;
    PADZ[i] = s / c + 1.2;
  });
  const D = { Z, FL, MK, RG, PADZ, PADR, off: Int32Array.from(off) };
  // streams first, then hand the terrain a profile so roads see the carved stream beds
  const order = lines.map((l, i) => i).sort((a, b) => (lines[a].road === undefined ? 0 : 1) - (lines[b].road === undefined ? 0 : 1));
  let profSet = false;
  order.forEach(li => {
    const ln = lines[li];
    if (ln.road !== undefined && !profSet) { T.setProf(makeProf(D, A)); profSet = true; pads(); }
    const P = ln.pts, o = off[li];
    if (ln.road === undefined) {
      // streams: base terrain (no carving), smoothed, then forced downhill
      let z = P.map(([x, y]) => surfZ(x, y, 0));
      z = smoothArr(z, ln.s, 14);
      for (let k = 1; k < z.length; k++) z[k] = Math.min(z[k], z[k - 1]);
      if (ln.name === 'creek') { const k0 = z.length - 1; for (let k = 0; k < z.length; k++) z[k] = Math.max(z[k] - 0.6, ln.s[k] > ln.len - 60 ? 0.05 + (ln.len - ln.s[k]) / 60 * 0.4 : -1e9); z[k0] = 0.05; }
      for (let k = 0; k < z.length; k++) Z[o + k] = z[k];
      return;
    }
    // roads: terrain across the road (stage 2: streams and plug-ins applied), detect water under it
    const raw = [], wet = [];
    for (let k = 0; k < P.length; k++) {
      const [x, y] = P[k], k2 = Math.min(P.length - 1, k + 1), k1 = Math.max(0, k - 1), tx = P[k2][0] - P[k1][0], ty = P[k2][1] - P[k1][1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      let zs = 0, ww = 0, wmax = NO_WATER, under = 0, regs = {};
      for (const [q, w] of [[0, 0.4], [-0.7, 0.15], [0.7, 0.15], [-1, 0.15], [1, 0.15]]) {
        T.surface(x + nx * q * L.ROAD_HW, y + ny * q * L.ROAD_HW, p, 2);
        zs += Math.max(p.h, p.wl) * w; ww += w; regs[p.reg] = (regs[p.reg] || 0) + w;
        if (p.wl > p.h + 0.3) { under += w; wmax = Math.max(wmax, p.wl); }
      }
      raw.push(zs / ww); wet.push(under > 0.25 ? wmax : NO_WATER);
      RG[o + k] = +Object.entries(regs).sort((a, b) => b[1] - a[1])[0][0];
    }
    // spread the bridge a little past the water on both sides
    const isB = wet.map(w => w > NO_WATER);
    const bridge = isB.map((_, k) => { for (let q = 0; q < P.length; q++) if (isB[q] && Math.abs(ln.s[q] - ln.s[k]) < 7) return true; return false; });
    let wl = wet.slice(); for (let k = 0; k < P.length; k++) if (bridge[k] && wl[k] === NO_WATER) { let best = NO_WATER, bd = 1e9; for (let q = 0; q < P.length; q++) if (isB[q] && Math.abs(ln.s[q] - ln.s[k]) < bd) { bd = Math.abs(ln.s[q] - ln.s[k]); best = wet[q]; } wl[k] = best; }
    let z = raw.map((v, k) => bridge[k] ? Math.max(v, wl[k] + 2.4) : v);
    // pad ends
    const ia = L.NODES.findIndex(nd => nd.id === ln.a), ib = ln.future ? -1 : L.NODES.findIndex(nd => nd.id === ln.b);
    const za = PADZ[ia], zb = ib >= 0 ? PADZ[ib] : null;
    for (let it = 0; it < 3; it++) {
      z = Array.from(smoothArr(z, ln.s, 16));
      for (let k = 0; k < z.length; k++) {
        const s = ln.s[k], e = ln.len - s;
        if (s < 40) z[k] = lerp(za, z[k], smooth(L.PAD_R - 6, 44, s));
        if (zb !== null && e < 40) z[k] = lerp(zb, z[k], smooth(L.PAD_R - 6, 44, e));
        if (bridge[k]) z[k] = Math.max(z[k], wl[k] + 2.4);
      }
    }
    for (let k = 0; k < z.length; k++) {
      Z[o + k] = z[k];
      const k2 = Math.min(z.length - 1, k + 3), k1 = Math.max(0, k - 3), slope = Math.abs(z[k2] - z[k1]) / Math.max(1e-3, ln.s[k2] - ln.s[k1]);
      FL[o + k] = (bridge[k] ? F_BRIDGE : 0) | (slope > 0.3 && !bridge[k] ? F_STAIRS : 0);
      const rk = REGK[RG[o + k]];
      MK[o + k] = ln.future ? RK.FUTURE : bridge[k] ? RK.PLANK : (KIND_OF_REGION[rk] ?? RK.DIRT);
    }
    // stairs runs shorter than 8 units read as noise: drop them
    let k = 0;
    while (k < z.length) { if (FL[o + k] & F_STAIRS) { let e = k; while (e < z.length && (FL[o + e] & F_STAIRS)) e++; if (ln.s[Math.min(z.length - 1, e)] - ln.s[k] < 8) for (let q = k; q < e; q++) FL[o + q] &= ~F_STAIRS; k = e; } else k++; }
  });
  T.setProf(makeProf(D, A));
  console.log(`profiles: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return D;
}

export function makeProf(D, A) {
  const lines = A.lines, off = D.off;
  const zAt = (li, s) => {
    const ln = lines[li], o = off[li], S = ln.s;
    let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] > s) hi = m; else lo = m; }
    const t = clamp((s - S[lo]) / ((S[hi] - S[lo]) || 1)); return D.Z[o + lo] + (D.Z[o + hi] - D.Z[o + lo]) * t;
  };
  const T1 = [0, 0, 0];
  const set = (p, c) => { p.r = c[0]; p.g = c[1]; p.b = c[2]; };
  const mix = (p, c, t) => { p.r += (c[0] - p.r) * t; p.g += (c[1] - p.g) * t; p.b += (c[2] - p.b) * t; };
  const mul = (p, k) => { p.r *= k; p.g *= k; p.b *= k; };
  const mixC = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
  const c3 = (r, g, b) => [r / 255, g / 255, b / 255];
  const PLANK = c3(196, 146, 92), PLANK_D = c3(130, 88, 50), PLANK_L = c3(226, 184, 124);
  const STONE = { [RK.FLAG]: [c3(220, 198, 150), c3(170, 144, 100)], [RK.COBBLE]: [c3(96, 110, 120), c3(60, 70, 84)], [RK.HEX]: [c3(112, 116, 140), c3(70, 74, 94)], [RK.SLATE]: [c3(122, 126, 148), c3(80, 82, 102)], [RK.BASALT]: [c3(88, 74, 70), c3(52, 42, 40)] };
  const regStone = { temple: RK.FLAG, crystal: RK.FLAG, grotto: RK.COBBLE, caves: RK.HEX, storm: RK.SLATE, magma: RK.BASALT };

  // the surface of a road kind at road-local coordinates (s along, t across in units, u = |t|/half)
  function surfaceKind(kind, x, y, s, t, half, p, reg) {
    const u = Math.abs(t) / half;
    switch (kind) {
      case RK.DIRT: case RK.SAND: case RK.FUTURE: case RK.RAIL: case RK.SNOW: {
        const n = fbm2(x * 0.08, y * 0.08, 3), g = noise2(x * 1.6, y * 1.6);
        if (kind === RK.SNOW) { mixC(c3(232, 240, 250), c3(196, 210, 228), sat(0.5 + n), T1); }
        else if (kind === RK.RAIL) mixC(COL.ochreDark, COL.ochre, sat(0.5 + n), T1);
        else if (kind === RK.SAND) mixC(COL.sandWarm, COL.dirtLight, sat(0.5 + n), T1);
        else mixC(COL.dirt, COL.dirtLight, sat(0.45 + n * 1.2), T1);
        set(p, T1); mul(p, 0.92 + g * 0.06);
        // ruts (cart tracks) and a raised crown
        const rut = Math.exp(-((u - 0.42) ** 2) / 0.008);
        p.h += (1 - u * u) * 0.6 - rut * 0.7 + g * 0.18;
        mul(p, 1 - rut * 0.16 + (1 - u) * 0.04);
        // grass tufts creeping in from the edges and along the crown
        const tuft = noise2(x * 0.45, y * 0.45) + (u - 0.75) * 2.2 + (Math.abs(u) < 0.12 ? 0.55 : 0);
        if (kind !== RK.SNOW && kind !== RK.RAIL && tuft > 0.55) { mixC(COL.grassB, COL.grassC, sat(noise2(x, y) + 0.5), T1); mix(p, T1, sat((tuft - 0.55) * 3)); p.h += sat((tuft - 0.55) * 3) * 0.5; }
        // pebbles
        worley2(x / 1.3, y / 1.3, 1, 131);
        if (W.f1 < 0.28 && (W.id & 255) < 90) { const q = 1 - W.f1 / 0.28; mixC(c3(200, 186, 160), c3(140, 126, 110), (W.id >>> 8 & 255) / 255, T1); mix(p, T1, q * 0.8); p.h += q * 0.35; }
        if (kind === RK.SNOW) { p.mat = M.SNOW; worley2(s / 3.2, t / 2.2 + 50, 0.4, 132); if (W.f1 < 0.22) { p.h -= 0.35; mul(p, 0.93); } }
        else p.mat = M.GROUND;
        if (kind === RK.RAIL) {
          // sleepers across, two steel rails along
          const sl = ((s / 4.2) % 1 + 1) % 1, onSl = sl < 0.42 && u < 0.62;
          if (onSl) { set(p, PLANK_D); mul(p, 0.85 + noise2(s * 3, t * 0.5) * 0.15); p.h += 0.5; p.mat = M.WOOD; }
          for (const rx of [-0.32, 0.32]) { const dr = Math.abs(u * Math.sign(t) - rx) * half; if (dr < 0.9) { set(p, c3(150, 150, 160)); if (dr < 0.4) set(p, c3(214, 214, 222)); p.h += 0.9; p.mat = M.METAL; p.gloss = 0.7; } }
        }
        if (kind === RK.FUTURE) {
          // unbuilt: dashed patches of pale gravel, the rest left as it is
          const dash = ((s / 26) % 1 + 1) % 1;
          return dash < 0.55 ? 1 : 0;
        }
        return 1;
      }
      case RK.PLANK: {
        // boards across the road with gaps, nails, weathering
        const bw = 2.6, q = s / bw, b = Math.floor(q), f = q - b, gap = f < 0.09 || f > 0.95;
        const tone = ((b * 2654435761) >>> 0) / 4294967296;
        mixC(PLANK_D, PLANK_L, 0.3 + tone * 0.6, T1); set(p, T1);
        const grain = noise2(t * 0.25 + b * 7.1, s * 3.2) * 0.5 + noise2(t * 1.6 + b, s * 9) * 0.25; mul(p, 0.9 + grain * 0.2);
        p.h += gap ? -0.6 : 0.1 + tone * 0.15;
        if (gap) mul(p, 0.4);
        if (u > 0.8 && u < 0.88 && Math.abs(f - 0.5) < 0.12) { set(p, c3(90, 80, 70)); }
        // rope rail / log edge beams along both sides
        if (u > 0.9) { set(p, PLANK_D); mul(p, 0.8 + noise2(s * 0.8, t) * 0.1); p.h += 0.8; }
        p.mat = M.WOOD;
        return 1;
      }
      case RK.FLAG: case RK.COBBLE: case RK.SLATE: case RK.BASALT: {
        const pal = STONE[kind], tint = reg === 'crystal' ? c3(196, 170, 220) : null;
        const sc = kind === RK.COBBLE ? 2.2 : 4.2;
        worley2(s / sc, t / (sc * 0.8), kind === RK.COBBLE ? 0.8 : 0.6, 141 + kind);
        const ed = Math.abs(cellEdge(s / sc, t / (sc * 0.8))) * sc, sid = (W.id & 255) / 255;
        const top = smooth(0.15, 0.6, ed);
        mixC(pal[0], pal[1], sid * 0.55 + noise2(x * 0.4, y * 0.4) * 0.15, T1); if (tint) mixC(T1, tint, 0.55, T1); set(p, T1);
        mul(p, 0.62 + top * 0.4);
        p.h += top * 0.9 + sid * 0.25 - (1 - top) * 0.3;
        if (ed < 0.3 && noise2(x * 0.15, y * 0.15) > -0.1) mix(p, reg === 'magma' ? COL.lava : reg === 'grotto' ? c3(70, 160, 150) : COL.moss, 0.5);
        if (reg === 'magma' && ed < 0.16) { p.er += 0.22; p.eg += 0.05; }
        if (reg === 'grotto' && ed < 0.2 && sid > 0.75) { p.er += 0.02; p.eg += 0.14; p.eb += 0.18; }
        // kerb stones
        if (u > 0.86) { mixC(pal[1], pal[0], 0.3, T1); set(p, T1); mul(p, 0.9); p.h += 0.6; }
        p.mat = M.STONE;
        return 1;
      }
      case RK.HEX: {
        hex2(x / 3.2, y / 3.2);
        const top = smooth(0.0, 0.12, HX.edge), sid = (HX.id & 255) / 255;
        mixC(STONE[RK.HEX][0], STONE[RK.HEX][1], sid * 0.6, T1); set(p, T1); mul(p, 0.6 + top * 0.45);
        p.h += top * 0.8 + sid * 0.3; p.mat = M.STONE;
        return 1;
      }
    }
    return 1;
  }

  // stairs: stepped height with stone treads
  function stairs(li, s, z, half, t, p, regKey) {
    const ln = lines[li], step = 2.0;
    const zq = Math.round(z / step) * step, zn = z / step - Math.round(z / step);   // -0.5..0.5 within a step
    // short bevelled riser near each step edge
    const r = smooth(0.38, 0.5, Math.abs(zn));
    const zz = zq + Math.sign(zn) * r * step * 0.5;
    const kind = regStone[regKey] ?? RK.FLAG;
    const pal = STONE[kind];
    mixC(pal[0], pal[1], 0.25 + noise2(s * 0.7, t * 0.3) * 0.2, T1); set(p, T1);
    if (r > 0.02) mul(p, 0.75);
    const u = Math.abs(t) / half;
    if (u > 0.82) { mixC(pal[1], pal[0], 0.2, T1); set(p, T1); return zz + 0.9; }   // side walls
    p.mat = M.STONE;
    return zz;
  }

  // per-texel road (R: nearest road point from fieldAccess.nearest)
  function road(R, half, p) {
    const li = R.line, ln = lines[li], o = off[li], S = ln.s;
    let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] > R.s) hi = m; else lo = m; }
    const k = R.s - S[lo] < S[hi] - R.s ? lo : hi;
    const z = zAt(li, R.s), fl = D.FL[o + k], kind = D.MK[o + k], regKey = REGK[D.RG[o + k]];
    const x = p.x, y = p.y, d = R.d, t = R.side;
    const isBridge = fl & F_BRIDGE, isStairs = fl & F_STAIRS;
    if (kind === RK.FUTURE) {
      // the unbuilt road: a faint cleared line, dashed gravel, no flattening beyond a gentle cut
      const inner = smooth(half * 0.7 + 1, half * 0.7 - 1, d);
      if (inner <= 0) return;
      // paint only (keeps the ground shape): pale gravel dashes with flattened canopy
      const keep = { r: p.r, g: p.g, b: p.b, h: p.h, m: p.mat };
      const on = surfaceKind(RK.FUTURE, x, y, R.s, t, half * 0.7, p, regKey);
      const w = inner * (on ? 0.8 : 0.0);
      p.r = lerp(keep.r, p.r, w); p.g = lerp(keep.g, p.g, w); p.b = lerp(keep.b, p.b, w);
      p.h = keep.h + (p.h - keep.h) * w * 0.3; if (w < 0.5) p.mat = keep.m;
      return;
    }
    if (isBridge) {
      // a plank deck on posts, hard edged (the water stays visible right beside it)
      if (d > half + 1.0) return;
      const deck = z;
      surfaceKind(RK.PLANK, x, y, R.s, t, half, p, regKey);
      const post = ((R.s / 9) % 1 + 1) % 1;
      if (Math.abs(Math.abs(t) - half) < 1.5 && post < 0.17) { p.h = deck + 4.5; set(p, PLANK_D); mul(p, 0.9 + noise2(R.s, 3) * 0.1); }
      else p.h = deck + (Math.abs(t) > half * 0.9 ? 0.8 : 0.1);
      p.mat = M.WOOD; p.road = 1;
      return;
    }
    // embankment / cut shoulders, then the road bed
    // the shoulder widens with the height of the cut / fill so steep ground gets slopes, not walls
    const dz = Math.abs(p.h - z), wsh = 12 + Math.min(38, dz * 1.15);
    if (d > half + wsh) return;
    const sh = smooth(half + wsh, half + 1, d);
    if (sh > 0) p.h = lerp(p.h, z - 0.25, sh * sh * (3 - 2 * sh) * 0.97);
    if (p.wl > p.h - 0.2 && d < half + 6) p.wl = NO_WATER;
    const inner = smooth(half + 0.8, half - 0.8, d + noise2(x * 0.2, y * 0.2) * (kind === RK.DIRT || kind === RK.SAND ? 1.6 : 0.3));
    if (inner <= 0) {
      // verge: darker trodden grass, a few stones
      const v = smooth(half + 6, half, d);
      if (v > 0 && p.mat !== M.SNOW) { mul(p, 1 - v * 0.12); }
      return;
    }
    const keep = [p.r, p.g, p.b], km = p.mat, h0 = p.h;
    p.h = isStairs ? stairs(li, R.s, z, half, t, p, regKey) : z;
    if (!isStairs) surfaceKind(kind, x, y, R.s, t, half, p, regKey);
    if (inner < 1) { p.r = lerp(keep[0], p.r, inner); p.g = lerp(keep[1], p.g, inner); p.b = lerp(keep[2], p.b, inner); p.h = lerp(h0, p.h, inner); if (inner < 0.5) p.mat = km; }
    p.road = 1;
  }

  // node pads: a flat raised disc with a ring of stones (per region style), blended into the ground
  const PAD_STYLE = {
    jungle: [c3(214, 200, 168), c3(150, 136, 110)], beach: [c3(236, 220, 186), c3(176, 156, 120)], temple: [c3(230, 206, 150), c3(170, 140, 90)],
    bog: null, lagoon: null, headland: [c3(200, 190, 170), c3(130, 120, 104)], grotto: [c3(110, 126, 150), c3(64, 74, 96)], mine: [c3(206, 160, 100), c3(140, 98, 60)],
    caves: [c3(120, 124, 150), c3(70, 74, 96)], crystal: [c3(206, 182, 230), c3(140, 110, 170)], frost: [c3(226, 238, 250), c3(150, 176, 204)],
    storm: [c3(130, 134, 156), c3(80, 82, 104)], magma: [c3(96, 80, 76), c3(54, 42, 40)], sea: null, islands: null,
  };
  function pad(n, d, dx, dy, R, p) {
    const i = L.NODES.indexOf(n), z = D.PADZ[i], regKey = REGK[D.PADR[i]], style = PAD_STYLE[regKey];
    const dz = Math.abs(p.h - z), wsh = 13 + Math.min(40, dz * 1.15);
    if (d > R + wsh) return;
    const sh = smooth(R + wsh, R + 1, d);
    p.h = lerp(p.h, z - 0.6, sh * sh * (3 - 2 * sh));
    if (p.wl > p.h - 0.2 && d < R + 8) p.wl = NO_WATER;
    if (d > R + 0.6) return;
    const inner = smooth(R + 0.6, R - 0.6, d), keep = [p.r, p.g, p.b], h0 = p.h;
    const a = Math.atan2(dy, dx), u = d / R;
    if (!style) {
      // wooden platform (bog, lagoon): concentric boards
      const ring = d / 2.6, b = Math.floor(ring), f = ring - b, seg = Math.floor((a / (Math.PI * 2) + 0.5) * (6 + b * 3));
      const tone = (((b * 7 + seg * 13) * 2654435761) >>> 0) / 4294967296;
      mixC(PLANK_D, PLANK_L, 0.3 + tone * 0.6, T1); set(p, T1); mul(p, 0.9 + noise2(d * 2, a * 9) * 0.1);
      p.h = z + (f < 0.1 ? -0.4 : 0.15); if (f < 0.1) mul(p, 0.5);
      if (u > 0.9) { set(p, PLANK_D); p.h = z + 0.9; }
      p.mat = M.WOOD;
    } else {
      // stone slabs in rings, a raised rim, an inlaid ring for bosses
      const rings = n.boss ? 4 : 3, ring = Math.min(rings - 1, Math.floor(u * rings)), nseg = 5 + ring * 6;
      const sa = (a / (Math.PI * 2) + 0.5) * nseg + ring * 0.37, seg = Math.floor(sa), fs = sa - seg, fr = u * rings - ring;
      const tone = (((ring * 31 + seg * 17 + n.id * 5) * 2654435761) >>> 0) / 4294967296;
      const joint = Math.min(fs, 1 - fs) * (2 * Math.PI * d / nseg) < 0.45 || (fr < 0.06 && ring > 0) ;
      mixC(style[0], style[1], 0.15 + tone * 0.5, T1); set(p, T1);
      mul(p, 0.92 + noise2(dx * 0.5, dy * 0.5) * 0.08);
      p.h = z + 0.2 + (u < 0.86 ? 0 : 0.8 * smooth(0.86, 0.9, u));
      if (joint) { mul(p, 0.62); p.h -= 0.3; if (regKey === 'jungle' || regKey === 'temple' || regKey === 'headland') mix(p, COL.moss, 0.35); }
      if (n.boss && Math.abs(u - 0.74) < 0.035) { set(p, c3(236, 186, 80)); p.mat = M.METAL; p.gloss = 0.8; p.h = z + 0.35; }
      if (regKey === 'magma' && joint) { p.er += 0.45; p.eg += 0.1; }
      if (regKey === 'grotto' && joint) { p.er += 0.03; p.eg += 0.2; p.eb += 0.26; }
      p.mat = p.mat === M.METAL ? M.METAL : M.STONE;
      if (u > 0.9) { mixC(style[1], style[0], 0.3, T1); set(p, T1); mul(p, 0.85 + noise2(a * 30, 1) * 0.1); }
    }
    if (inner < 1) { p.r = lerp(keep[0], p.r, inner); p.g = lerp(keep[1], p.g, inner); p.b = lerp(keep[2], p.b, inner); p.h = lerp(h0, p.h, inner); }
    p.road = 2;
  }

  return { waterZ: zAt, road, pad, zAt, D };
}
