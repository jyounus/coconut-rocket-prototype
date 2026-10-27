// The core ground: a pure per-texel function that gives the terrain height (map units), water level, albedo,
// emissive light and material class at any world point. Region plug-ins run after it (their `ground` hook), then
// roads and node pads are cut in last so every node stays reachable. Nothing here depends on neighbouring texels,
// so it runs in parallel and can be evaluated anywhere (road profiles sample it on the main thread).
import { noise2, noise3, fbm2, fbm3, ridge2, warp2, worley2, cellEdge, W, hex2, HX, hash2, ihash2, clamp, lerp, smooth, sat } from './lib/noise.mjs';
import * as L from './layout.mjs';

// material classes (how the renderer lights a texel)
export const M = { GROUND: 0, SAND: 1, GRASS: 2, FOLIAGE: 3, ROCK: 4, SNOW: 5, CRYSTAL: 6, WOOD: 7, METAL: 8, LAVA: 9, MUD: 10, STONE: 11 };
// region ids (which rock the renderer textures cliffs with, and map.json debugging)
export const REG = ['jungle', 'beach', 'temple', 'bog', 'grotto', 'lagoon', 'mine', 'caves', 'crystal', 'frost', 'storm', 'magma', 'sea', 'headland', 'islands'];
export const RI = Object.fromEntries(REG.map((k, i) => [k, i]));
// water types
export const WT = { NONE: 0, SEA: 1, LAGOON: 2, STREAM: 3, BOG: 4 };
export const NO_WATER = -1e4;

const c3 = (r, g, b) => [r / 255, g / 255, b / 255];
export const COL = {
  sandDry: c3(234, 208, 150), sandWarm: c3(218, 182, 124), sandWet: c3(164, 132, 90), sandPale: c3(246, 230, 186), shell: c3(255, 244, 228),
  grassA: c3(100, 164, 52), grassB: c3(66, 132, 44), grassC: c3(40, 98, 38), grassY: c3(146, 164, 58), grassBlue: c3(60, 128, 84),
  leafDark: c3(20, 60, 32), leafMid: c3(40, 100, 40), leafLight: c3(96, 152, 52), leafYellow: c3(140, 164, 56), bloomPink: c3(232, 110, 150), bloomOrange: c3(240, 150, 60),
  dirt: c3(150, 108, 68), dirtDark: c3(108, 74, 46), dirtLight: c3(190, 148, 98),
  sandstone: c3(214, 190, 140), sandstoneDark: c3(160, 136, 94), moss: c3(96, 140, 60),
  mud: c3(86, 80, 50), mudDark: c3(58, 52, 34), algae: c3(126, 156, 46), bogGrass: c3(110, 124, 56),
  grottoMoss: c3(40, 84, 80), grottoPurple: c3(74, 58, 104), grottoDark: c3(26, 40, 52),
  ochre: c3(196, 138, 72), ochreDark: c3(150, 98, 56), ochreLight: c3(224, 176, 110), mineRock: c3(156, 112, 76),
  basalt: c3(66, 70, 90), basaltTop: c3(96, 100, 124), basaltDark: c3(40, 42, 58),
  violet: c3(132, 98, 156), violetDark: c3(86, 62, 112), lavender: c3(176, 150, 196), crystalPink: c3(250, 150, 230),
  snow: c3(246, 250, 255), snowShade: c3(214, 228, 246), ice: c3(176, 216, 240), peakRock: c3(124, 118, 114),
  slate: c3(84, 86, 106), slateDark: c3(54, 56, 72), slateLight: c3(120, 124, 146),
  ash: c3(92, 82, 78), crust: c3(58, 42, 38), crustDark: c3(36, 26, 24), lava: c3(255, 112, 30),
  reefSand: c3(226, 210, 166), coralPink: c3(196, 120, 118), coralViolet: c3(146, 102, 150), coralOrange: c3(206, 136, 80), seagrass: c3(66, 122, 80), deep: c3(36, 72, 96),
};

export function makeTerrain(F, A, plugins = [], prof = null) {
  // ---------- small helpers on the record ----------
  const set = (p, c) => { p.r = c[0]; p.g = c[1]; p.b = c[2]; };
  const mix = (p, c, t) => { p.r += (c[0] - p.r) * t; p.g += (c[1] - p.g) * t; p.b += (c[2] - p.b) * t; };
  const mul = (p, k) => { p.r *= k; p.g *= k; p.b *= k; };
  const mixC = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
  const T1 = [0, 0, 0], T2 = [0, 0, 0];

  // noisy region edges: e > 0 inside (units)
  // noisy, domain-warped region edges: e > 0 inside (units)
  const edge = (k, x, y, amp = 10, f = 0.02) => {
    const s = 31.7 * k.length, wx = fbm2(x * 0.007 + s, y * 0.007, 3) * 46 + noise2(x * 0.019 + s, y * 0.019) * 12, wy = fbm2(x * 0.007 - s, y * 0.007 + 5, 3) * 46 + noise2(x * 0.019 - s, y * 0.019 + 3) * 12;
    return A.blob(k, x + wx, y + wy) + fbm2(x * f + s, y * f - 7.3, 4) * amp;
  };
  // plateau height varies around a region (so cliffs are not one even ring)
  const vary = (x, y, s) => 0.78 + 0.44 * (fbm2(x * 0.009 + s, y * 0.009 - s, 3) * 0.5 + 0.5);
  // a scree apron of boulders just outside a raised region's cliff
  function apron(x, y, p, e, cA, cB) {
    if (e < -18 || e > 0) return;
    worley2(x / 3.4, y / 3.4, 0.9, 151);
    const k = W.id & 255, r = 0.25 + ((W.id >>> 8) & 255) / 255 * 0.3, dens = smooth(-18, -2, e) * 110;
    if (k < dens && W.f1 < r) {
      const q = 1 - W.f1 / r; p.h += q * 2.6 * (0.6 + ((W.id >>> 16) & 255) / 400);
      mixC(cA, cB, ((W.id >>> 4) & 255) / 255, T1); set(p, T1); mul(p, 0.8 + q * 0.3); p.mat = M.ROCK;
    }
  }
  const coastE = (x, y) => {
    let c = A.coast(x, y) + fbm2(x * 0.011, y * 0.011, 4) * 18 + noise2(x * 0.06, y * 0.06) * 3;
    for (const is of L.FUTURE.islands) { const d = Math.hypot(x - is.x, (y - is.y) * 1.25); c = Math.max(c, is.r - d + fbm2(x * 0.03 + is.seed, y * 0.03, 3) * 14); }
    return c;
  };

  // ---------- the jungle canopy carpet: tree crowns as height bumps ----------
  function canopy(x, y, dens, p) {
    // crowns: each Worley cell holds a tree made of 4 overlapping sub-domes (lumpy silhouettes)
    let hgt = 0, top = 0, col = 0;
    for (const [sc, hBase, hVar, seed, ox] of [[18, 12, 9, 5, 0], [10, 7, 5, 6, 40]]) {
      const gx = x / sc + ox, gy = y / sc, xi = Math.floor(gx), yi = Math.floor(gy);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const id = ihash2(xi + i, yi + j, seed);
        if (((id >>> 20) & 15) / 15 >= dens * (sc < 12 ? 1.15 : 1)) continue;
        const cx = xi + i + 0.5 + (((id & 1023) / 1023) - 0.5) * 0.7, cy = yi + j + 0.5 + ((((id >>> 10) & 1023) / 1023) - 0.5) * 0.7;
        const th = hBase + (((id >>> 4) & 255) / 255) * hVar, rr = 0.36 + (((id >>> 12) & 255) / 255) * 0.16;
        for (let k = 0; k < 4; k++) {
          const a = k * 1.9 + (id & 7), off = k === 0 ? 0 : rr * 0.55, r = k === 0 ? rr : rr * 0.72;
          const dx = gx - (cx + Math.cos(a) * off), dy = gy - (cy + Math.sin(a) * off), q = (dx * dx + dy * dy) / (r * r);
          if (q < 1) { const hh = th * (k === 0 ? 1 : 0.86) * Math.sqrt(1 - q); if (hh > hgt) { hgt = hh; top = 1 - Math.sqrt(q); col = id; } }
        }
      }
    }
    if (hgt <= 0) return 0;
    // leaf clusters: small puffs all over the crown surface
    worley2(x / 2.3, y / 2.3, 0.9, 7); const puff = 1 - sat(W.f1 / 0.75);
    const fine = noise2(x * 1.4, y * 1.4) * 0.5 + noise2(x * 3.1 + 7, y * 3.1) * 0.3;
    hgt += puff * 1.5 + fine * 0.45;
    p.h += hgt;
    const hv = ((col >>> 4) & 255) / 255, bloom = ((col >>> 13) & 255) / 255;
    mixC(COL.leafDark, COL.leafMid, 0.3 + top * 0.5 + puff * 0.25, T1);
    if (hv < 0.28) mixC(T1, COL.leafYellow, 0.3, T1); else if (hv > 0.82) mixC(T1, COL.grassBlue, 0.4, T1); else if (hv > 0.6) mixC(T1, COL.leafDark, 0.25, T1);
    mixC(T1, COL.leafLight, sat(top * puff * 0.55 + fine * 0.1), T1);
    set(p, T1);
    if (bloom > 0.92) { if (puff > 0.45) mix(p, bloom > 0.96 ? COL.bloomPink : COL.bloomOrange, sat((puff - 0.45) * 3) * sat(top * 2)); }
    p.mat = M.FOLIAGE;
    return hgt;
  }

  // ---------- grass with clumps, blades, flowers ----------
  function grass(x, y, p, lush = 1) {
    const n1 = fbm2(x * 0.011, y * 0.011, 4), n2 = fbm2(x * 0.05 + 3, y * 0.05, 3), blade = noise2(x * 1.9, y * 1.1) * 0.6 + noise2(x * 3.3 + 3, y * 3.7) * 0.4;
    worley2(x / 2.4, y / 2.4, 0.95, 9);
    const clump = 1 - sat(W.f1 / 0.72), cid = (W.id & 255) / 255, gap = sat((W.f1 - 0.45) * 3);
    mixC(COL.grassB, COL.grassA, sat(0.45 + n1 * 1.3), T1);
    mixC(T1, COL.grassY, sat(n2 * 1.4 - 0.15) * 0.45, T1);
    mixC(T1, COL.grassC, sat(-n1 * 1.6 - 0.1) * 0.85 * lush, T1);
    set(p, T1);
    mul(p, 0.8 + clump * 0.26 + blade * 0.07 + (cid - 0.5) * 0.12 - gap * 0.14);
    p.h += clump * 1.15 + blade * 0.22;
    // tiny flowers
    worley2(x / 2.1 + 9, y / 2.1, 1, 33);
    if (W.f1 < 0.13 && (W.id & 1023) < 18) { const k = (W.id >>> 10) & 3; set(p, [c3(255, 110, 160), c3(255, 214, 64), c3(255, 252, 240), c3(186, 130, 255)][k]); p.h += 0.35; }
    p.mat = M.GRASS;
  }

  // ---------- sand with ripples, shells, wet edge ----------
  function sand(x, y, p, wet) {
    const wv = fbm2(x * 0.025, y * 0.025, 3);
    const rip = Math.sin((x * 0.55 + y * 1.05) + wv * 7 + noise2(x * 0.1, y * 0.1) * 1.5), r2 = rip * 0.5 + 0.5;
    const grain = noise2(x * 2.3, y * 2.3) * 0.5 + noise2(x * 4.7, y * 4.3) * 0.5;
    const n = fbm2(x * 0.018, y * 0.018, 3);
    mixC(COL.sandDry, COL.sandWarm, sat(0.45 + n * 1.2), T1); mixC(T1, COL.sandPale, sat(-n * 1.5) * 0.45, T1);
    set(p, T1); mul(p, 0.9 + r2 * 0.1 + grain * 0.05);
    p.h += r2 * 0.4 + grain * 0.08;
    if (wet > 0) { mix(p, COL.sandWet, wet * 0.9); p.gloss = Math.max(p.gloss, wet * 0.6); p.h -= wet * 0.25 * r2; }
    // pebbles, shells and bits of driftwood / seaweed along the tide line
    worley2(x / 2.4, y / 2.4, 1, 41);
    if (W.f1 < 0.12 && (W.id & 255) < 14 && wet < 0.6) { set(p, (W.id >>> 8) & 1 ? COL.shell : c3(196, 176, 150)); p.h += 0.3; }
    p.mat = M.SAND;
  }

  // ---------- rock ground (generic) ----------
  function rockGround(x, y, p, cA, cB, cD, scale = 1) {
    const sc = scale, n = fbm2(x * 0.035 / sc, y * 0.035 / sc, 5), r = ridge2(x * 0.06 / sc + 3, y * 0.06 / sc, 4);
    const g = noise2(x * 0.9, y * 0.9) * 0.5 + noise2(x * 2.2, y * 2.2) * 0.3;
    worley2(x / (12 * sc), y / (12 * sc), 0.9, 12);
    const ed = Math.abs(cellEdge(x / (12 * sc), y / (12 * sc))) * 12 * sc, pid = (W.id & 255) / 255;
    const crack = smooth(0.8, 0.0, ed) * (noise2(x * 0.15, y * 0.15) > -0.2 ? 1 : 0);
    mixC(cA, cB, sat(0.5 + n * 1.5), T1); set(p, T1);
    mul(p, 0.8 + r * 0.32 + g * 0.06 + (pid - 0.5) * 0.1);
    mix(p, cD, crack * 0.65);
    p.h += r * 1.8 * sc + n * 1.4 * sc - crack * 0.7 + g * 0.15;
    p.mat = M.ROCK;
  }

  // ---------- the base: everything except plug-ins and roads ----------
  function base(x, y, p) {
    p.x = x; p.y = y; p.h = 0; p.noTree = false; p.wl = NO_WATER; p.wt = 0; p.er = p.eg = p.eb = 0; p.gloss = 0; p.mat = M.GROUND; p.reg = 0; p.road = 0;
    const c = coastE(x, y);
    p.coast = c;
    // ---- sea ----
    if (c < 0) {
      const sh = -c;
      p.h = -(sh * 0.035 + 5 * smooth(20, 130, sh) + 22 * smooth(90, 330, sh)) + fbm2(x * 0.02, y * 0.02, 3) * 1.4 * smooth(0, 40, sh);
      const reef = sat((fbm2(x * 0.018 + 5, y * 0.018, 4) + 0.05) * 3) * smooth(10, 40, sh) * (1 - smooth(110, 170, sh));
      mixC(COL.reefSand, COL.deep, smooth(60, 260, sh), T1); set(p, T1);
      const rip = Math.sin(x * 0.35 + y * 0.6 + fbm2(x * 0.04, y * 0.04) * 5) * 0.5 + 0.5; mul(p, 0.94 + rip * 0.08);
      if (reef > 0) {
        worley2(x / 9, y / 9, 1, 19); const head = sat(1 - W.f1 / 0.7) * (0.6 + 0.4 * noise2(x * 0.3, y * 0.3)), k = (W.id & 255) / 255;
        const cc = k < 0.33 ? COL.coralPink : k < 0.66 ? COL.coralViolet : k < 0.85 ? COL.coralOrange : COL.seagrass;
        mix(p, cc, head * reef * 0.6); p.h += head * reef * 2.4 + noise2(x * 0.7, y * 0.7) * 0.4 * reef;
      }
      const grassy = sat(fbm2(x * 0.03 - 9, y * 0.03, 3) * 3 - 0.6) * smooth(20, 60, sh) * (1 - smooth(140, 200, sh));
      if (grassy > 0) mix(p, COL.seagrass, grassy * 0.7);
      p.wl = 0; p.wt = WT.SEA; p.reg = RI.sea; p.mat = M.SAND;
      return p;
    }
    // ---- land ----
    const nearIsl = x > 1340 && y > 1680, beachW = nearIsl ? 13 + fbm2(x * 0.03, y * 0.03, 2) * 5 : 44 + fbm2(x * 0.008, y * 0.008, 3) * 22;
    const gw = smooth(beachW - 6, beachW + 22, c);      // grass weight
    const hills = fbm2(x * 0.0055, y * 0.0055, 4) * 7 + fbm2(x * 0.02 + 4, y * 0.02, 3) * 1.6;
    p.h = 0.02 + c * 0.03 + 2.4 * smooth(0, beachW, c) + gw * (Math.max(-2, hills) + 7 * smooth(beachW, beachW + 300, c));
    p.reg = gw > 0.5 ? RI.jungle : RI.beach;
    // ground material: sand -> grass
    if (gw < 1) { sand(x, y, p, 1 - smooth(2, 14, c + noise2(x * 0.05, y * 0.05) * 3)); const tide = Math.exp(-((c - 17 - noise2(x * 0.03, y * 0.03) * 4) ** 2) / 3); if (tide > 0.2 && noise2(x * 0.4, y * 0.4) > 0.1) { mix(p, c3(120, 100, 70), tide * 0.5); p.h += tide * 0.3; } }
    if (gw > 0) {
      const sr = p.r, sg = p.g, sb = p.b, shh = p.h, smat = p.mat;
      grass(x, y, p);
      // ragged grass edge with sandy patches
      const t = sat(gw + (noise2(x * 0.15, y * 0.15) * 0.35));
      if (t < 1) { p.r = sr + (p.r - sr) * t; p.g = sg + (p.g - sg) * t; p.b = sb + (p.b - sb) * t; if (t < 0.5) p.mat = smat; }
    }
    // ---- regions ----
    regions(x, y, p, c);
    // ---- jungle canopy on the lowland (the ground under it is kept so modules can clear it: G.clear) ----
    // nearest region (by its noisy edge): inside -> overgrowth creeping in from the edges; outside -> the jungle
    // around it takes on the region's colour (scorched near the volcano, snow-dusted near the frost, ...)
    let bk = null, be = -1e9;
    if (c > 30) for (const k in EPAR) { const q = EPAR[k], bb = q[2]; if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue; const e = edge(k, x, y, q[0], q[1]); if (e > be) { be = e; bk = k; } }
    p.h0 = p.h; p.r0 = p.r; p.g0 = p.g; p.b0 = p.b; p.mat0 = p.mat;
    if (p.reg === RI.jungle || p.reg === RI.headland || p.reg === RI.islands) {
      const dens = forestDensity(x, y, c);
      if (dens > 0) canopy(x, y, dens, p);
    } else if (bk && OG[bk] && p.reg === RI[bk] && !(p.wl > p.h) && p.mat !== M.CRYSTAL && !p.noTree) {
      const dens = overgrowth(x, y, bk, be);
      if (dens > 0 && canopy(x, y, dens, p) > 0) { const tc = OGT[bk]; if (tc) mix(p, tc[0], tc[1]); }
    }
    if (bk && be > -70 && be < 6 && (p.reg === RI.jungle || p.reg === RI.beach) && ECO[bk]) {
      const [col, k] = ECO[bk], t = smooth(-70, 0, be + fbm2(x * 0.03 + 5, y * 0.03, 3) * 18) * k * (p.mat === M.FOLIAGE ? 0.55 : 1);
      if (t > 0) mix(p, col, t);
    } else if (p.reg === RI.frost && p.mat !== M.CRYSTAL) {
      const dens = pineDensity(x, y);
      if (dens > 0) pines(x, y, dens, p);
    }
    return p;
  }

  // per-region heights and materials, blended over their noisy edges
  function regions(x, y, p, c) {
    const lowH = p.h;
    // --- lagoon + islet + headland (north-west) ---
    if (x < 440 && y > 360 && y < 1050) {
      const el = edge('lagoon', x, y, 8, 0.03), ei = A.blob('islet', x, y) + fbm2(x * 0.06, y * 0.06, 3) * 5, eh = edge('headland', x, y, 12, 0.025);
      if (eh > -24) {   // headland: a raised rocky bluff with jungle on top; the waterfall drops off its south cliff
        const rise = 30 * vary(x, y, 3) * smooth(-3, 8, eh) + 8 * smooth(10, 70, eh) + fbm2(x * 0.05, y * 0.05, 3) * 3 * smooth(0, 20, eh);
        p.h = Math.max(p.h, lowH + rise);
        if (eh > 4) p.reg = RI.headland;
        else if (eh > -2) { rockGround(x, y, p, COL.mineRock, COL.sandstoneDark, COL.dirtDark); p.reg = RI.headland; }
        apron(x, y, p, eh, COL.mineRock, COL.sandstoneDark);
      }
      if (el > -16) {
        const rim = 1 - smooth(-16, -2, el);
        if (el < 4) { sand(x, y, p, smooth(-8, 2, el)); p.h = lerp(p.h, 3.9 + (-el) * 0.12, rim); p.reg = RI.lagoon; }
        if (el > -2) {
          const depth = 0.5 + 8.5 * smooth(-2, 80, el) + fbm2(x * 0.04, y * 0.04, 3) * 1.2;
          p.h = 3.5 - depth; p.wl = 3.5; p.wt = WT.LAGOON; p.reg = RI.lagoon;
          sand(x, y, p, 1); mix(p, COL.reefSand, 0.35);
          const weed = sat(fbm2(x * 0.05 + 3, y * 0.05, 3) * 3 - 0.3) * smooth(6, 30, el);
          if (weed > 0) mix(p, COL.seagrass, weed * 0.7);
          worley2(x / 6, y / 6, 1, 61);
          if (W.f1 < 0.42 && (W.id & 255) < 36 && el > 8) { mixC(COL.peakRock, COL.moss, 0.3, T1); mix(p, T1, 0.7); p.h += 1.6 * (1 - W.f1 / 0.42); }
        }
      }
      if (ei > -10) {  // node 11's islet
        const isl = smooth(-6, 4, ei);
        if (isl > 0) {
          p.h = lerp(p.h, 4.4 + smooth(2, 24, ei) * 2, isl);
          if (ei > 0) { p.wl = NO_WATER; p.wt = 0; }
          sand(x, y, p, 1 - smooth(-1, 5, ei)); if (ei > 10) grass(x, y, p); p.reg = RI.lagoon;
        }
      }
    }
    // --- temple: two sandstone terraces with masonry retaining walls, overgrown ---
    if (x < 440 && y > 1220 && y < 1980) {
      const e = edge('temple', x, y, 9, 0.02);
      if (e > -18) {
        const v = vary(x, y, 11), t1 = smooth(-1.5, 2.0, e), e2 = e - 40 - fbm2(x * 0.03, y * 0.03, 2) * 10, t2 = smooth(-1.5, 2.0, e2);
        p.h = lowH + 8 * v * t1 + 7 * t2;
        apron(x, y, p, e, COL.sandstone, COL.sandstoneDark);
        if (e > -2) {
          p.reg = RI.temple;
          const grassy = sat(fbm2(x * 0.03, y * 0.03, 4) * 2.6 + (e2 > 0 ? -0.12 : 0.55) + smooth(30, 0, e) * 0.4);
          const keepR = p.r, keepG = p.g, keepB = p.b, keepM = p.mat;
          // big paving slabs in running bond
          const row = Math.floor(y / 5.2), bx = (x + (row & 1) * 3.4) / 6.8, fb = bx - Math.floor(bx), fy = y / 5.2 - row;
          const joint = Math.min(fb, 1 - fb) * 6.8 < 0.45 || Math.min(fy, 1 - fy) * 5.2 < 0.45;
          const sid = hash2(Math.floor(bx), row, 3), crack = Math.abs(noise2(x * 0.35, y * 0.35)) < 0.03;
          mixC(COL.sandstone, COL.sandstoneDark, sid * 0.55 + noise2(x * 0.25, y * 0.25) * 0.12, T1); set(p, T1);
          if (sid > 0.62) mix(p, c3(206, 158, 106), (sid - 0.62) * 1.6);
          mix(p, c3(150, 150, 96), sat(fbm2(x * 0.05 + 2, y * 0.05, 3) * 2) * 0.35);   // lichen and grime
          if (joint || crack) { mix(p, COL.moss, 0.55); mul(p, 0.7); }
          p.h += joint ? -0.2 : 0.6 + sid * 0.35 + (sid > 0.93 ? -0.8 : 0); p.mat = M.STONE;
          const g = smooth(0.45, 0.75, grassy);
          if (g > 0) { p.r = lerp(p.r, keepR, g); p.g = lerp(p.g, keepG, g); p.b = lerp(p.b, keepB, g); if (g > 0.5) { p.mat = keepM; p.h += 0.3; } }
          templeRuins(x, y, p, e);
        }
      }
    }
    // --- bog: sunken mud with murky pools and reeds ---
    if (x > 360 && x < 880 && y > 1420 && y < 1980) {
      const e = edge('bog', x, y, 14, 0.025);
      if (e > -24) {
        const w = smooth(-24, 12, e), floor = lowH - 3.4 * w;
        p.h = floor + fbm2(x * 0.04, y * 0.04, 3) * 1.1 * w;
        if (e > -10) {
          p.reg = RI.bog;
          const n = fbm2(x * 0.02 + 11, y * 0.02, 4), wetM = smooth(-10, 22, e);
          mixC(COL.bogGrass, COL.mud, sat(0.4 - n * 1.5) * wetM, T1); set(p, T1);
          const g = noise2(x * 1.1, y * 1.1); mul(p, 0.88 + g * 0.1);
          worley2(x / 4.5, y / 4.5, 0.9, 81);
          const tus = (W.id & 255) < 120 && W.f1 < 0.42 ? 1 - W.f1 / 0.42 : 0;   // reed tussocks
          if (tus > 0) { mixC(COL.bogGrass, COL.grassY, ((W.id >>> 8) & 255) / 400 + tus * 0.2, T1); set(p, T1); mul(p, 0.75 + tus * 0.35 + noise2(x * 2.2, y * 2.2) * 0.08); p.h += Math.sqrt(tus) * 2.6; p.mat = M.GRASS; }
          else { p.mat = M.MUD; p.gloss = 0.1 * wetM; }
          const pool = n + fbm2(x * 0.06, y * 0.06, 2) * 0.25 - 0.04;
          if (pool > 0 && e > 4) {
            p.wl = floor + 0.4; p.wt = WT.BOG; p.h = Math.min(p.h, floor + 0.4 - 2.4 * smooth(0, 0.15, pool));
            set(p, COL.mudDark);
          }
        }
      }
    }
    // --- grotto: a sunken mossy hollow ringed by dark rock, glowing specks ---
    if (x > 90 && x < 640 && y > 880 && y < 1260) {
      const e = edge('grotto', x, y, 12, 0.025);
      if (e > -22) {
        const rimN = fbm2(x * 0.05, y * 0.05, 3);
        const rim = 8 * Math.exp(-((e - 3) * (e - 3)) / 70) * (0.5 + rimN);
        p.h = lowH - 5 * smooth(-4, 24, e) + Math.max(0, rim) * 1.3;
        if (e > -3) {
          p.reg = RI.grotto;
          const n = fbm2(x * 0.03, y * 0.03, 4), m = noise2(x * 0.35, y * 0.35);
          mixC(COL.grottoMoss, COL.grottoPurple, smooth(-0.1, 0.35, n), T1); mixC(T1, COL.grottoDark, sat(-m * 0.6) * 0.5, T1); set(p, T1);
          worley2(x / 2.6, y / 2.6, 0.9, 91); const cl = 1 - sat(W.f1 / 0.62);
          mul(p, 0.82 + cl * 0.22); p.h += cl * 1.0; p.mat = M.GRASS;
          worley2(x / 3.4 + 5, y / 3.4, 1, 92);
          if (W.f1 < 0.09 && (W.id & 255) < 40) { const k = (W.id >>> 8) & 1, s = sat(1 - W.f1 / 0.12); const e2 = k ? [0.25, 0.85, 1.3] : [1.1, 0.35, 1.2]; p.er += e2[0] * s; p.eg += e2[1] * s; p.eb += e2[2] * s; mix(p, k ? COL.ice : COL.crystalPink, s); }
          if (e < 9 && rim > 2.5) rockGround(x, y, p, COL.grottoDark, COL.basalt, COL.grottoDark);
        }
      }
    }
    // --- mine: an ochre plateau and the mine mountain ---
    if (x > 400 && x < 900 && y > 580 && y < 1030) {
      const e = edge('mine', x, y, 12, 0.022);
      if (e > -20) {
        const rise = 20 * vary(x, y, 21) * smooth(-2, 6, e) + fbm2(x * 0.03, y * 0.03, 3) * 2.5 * smooth(0, 20, e);
        p.h = Math.max(p.h, lowH + rise);
        apron(x, y, p, e, COL.mineRock, COL.ochreDark);
        if (e > -2) {
          p.reg = RI.mine;
          const n = fbm2(x * 0.03, y * 0.03, 4), g = noise2(x * 0.9, y * 0.9);
          mixC(COL.ochre, COL.ochreLight, sat(0.5 + n * 1.5), T1); mixC(T1, COL.ochreDark, sat(-n * 2) * 0.6, T1); set(p, T1); mul(p, 0.9 + g * 0.1);
          worley2(x / 3, y / 3, 1, 101);
          if (W.f1 < 0.36 && (W.id & 255) < 56) { const s = 1 - W.f1 / 0.36; mixC(COL.mineRock, COL.ochreDark, (W.id >>> 8 & 255) / 255, T1); mix(p, T1, sat(s * 2)); p.h += s * 1.6; }
          p.mat = M.GROUND;
          // sparse dry grass tufts
          if (noise2(x * 0.06, y * 0.06) > 0.35) { worley2(x / 1.8, y / 1.8, 1, 103); if (W.f1 < 0.3) { mixC(COL.grassY, COL.ochreLight, 0.4, T1); set(p, T1); p.h += 0.4; } }
          worley2(x / 1.7 + 3, y / 1.7, 1, 102);
          if (W.f1 < 0.08 && (W.id & 255) < 14) { set(p, c3(255, 214, 90)); p.mat = M.METAL; p.gloss = 0.9; }
        }
      }
      mountain(x, y, p, lowH + 20, L.MINE_MTN, 1.1, RI.mine, COL.ochreDark, COL.mineRock, COL.dirtDark, 0.016, false);
    }
    // --- basalt caves: hexagonal columns stepping down at the edges ---
    if (x > 280 && x < 820 && y > 340 && y < 750) {
      const e = edge('caves', x, y, 10, 0.02);
      if (e > -22) {
        hex2(x / 7.5, y / 7.5);
        const hid = HX.id, edgeH = HX.edge, cx = HX.cx * 7.5, cy = HX.cy * 7.5;
        const ec = edge('caves', cx, cy, 10, 0.02);
        const step = clamp(ec / 30, 0, 1), jitter = ((hid & 255) / 255 - 0.5) * 6;
        const colH = 28 * vary(cx, cy, 31) * Math.pow(step, 0.55) + jitter * step + (ec > -6 ? 3 : 0);
        const bevel = smooth(0, 0.16, edgeH);
        const ch = ec > -6 ? lowH + Math.max(0, colH) - (1 - bevel) * 1.6 : lowH;
        if (ch > p.h || e > -2) p.h = Math.max(lowH, ch);
        if (ec <= -6) apron(x, y, p, e, COL.basalt, COL.basaltDark);
        if (ec > -6) {
          p.reg = RI.caves;
          mixC(COL.basaltTop, COL.basalt, (hid >>> 8 & 255) / 255 * 0.7, T1); set(p, T1);
          mul(p, 0.8 + bevel * 0.25 + noise2(x * 0.7, y * 0.7) * 0.05);
          if (edgeH < 0.06) mix(p, COL.basaltDark, 0.7);
          if (edgeH < 0.14 && noise2(x * 0.1, y * 0.1) > 0.05) mix(p, COL.moss, 0.4);
          if (fbm2(x * 0.02, y * 0.02, 3) > 0.28 && bevel > 0.5) { mix(p, COL.moss, 0.55); }
          p.mat = M.ROCK;
        }
      }
    }
    // --- amethyst geode: violet rock and crystal shards ---
    if (x > 820 && x < 1360 && y > 120 && y < 470) {
      const e = edge('crystal', x, y, 12, 0.022);
      if (e > -20) {
        const rise = 18 * vary(x, y, 41) * smooth(-2, 5, e) + 5 * smooth(10, 70, e) + ridge2(x * 0.02, y * 0.02, 3) * 4 * smooth(0, 30, e);
        p.h = Math.max(p.h, lowH + rise);
        apron(x, y, p, e, COL.violet, COL.violetDark);
        if (e > -2) {
          p.reg = RI.crystal;
          rockGround(x, y, p, COL.violet, COL.lavender, COL.violetDark, 0.8);
          const n = fbm2(x * 0.04, y * 0.04, 3); mix(p, COL.lavender, sat(n) * 0.4);
          
          worley2(x / 14, y / 14, 0.9, 111);
          const k = W.id & 255, r = 0.14 + ((W.id >>> 8) & 255) / 255 * 0.14;
          if (k < 60 && W.f1 < r && e > 10) {
            const q = 1 - W.f1 / r, facet = Math.floor((Math.atan2(y / 14 - W.py, x / 14 - W.px) / (Math.PI / 3)) + 6) % 6;
            p.h += q * (5 + (k / 70) * 10);
            mixC(COL.violet, COL.crystalPink, q * (0.7 + facet * 0.06), T1); set(p, T1); p.mat = M.CRYSTAL; p.gloss = 0.9;
            const g = q * q * 0.6; p.er += 0.9 * g; p.eg += 0.3 * g; p.eb += 1.0 * g;
          }
        }
      }
    }
    // --- frost: a snowy plateau and the peak ---
    if (x > 1020 && x < 1540 && y > 260 && y < 840) {
      const e = edge('frost', x, y, 12, 0.02);
      if (e > -20) {
        const rise = 20 * vary(x, y, 51) * smooth(-2, 6, e) + fbm2(x * 0.03, y * 0.03, 3) * 3 * smooth(0, 20, e);
        p.h = Math.max(p.h, lowH + rise);
        apron(x, y, p, e, COL.peakRock, COL.snowShade);
      }
      if (e > -2) {
        p.reg = RI.frost;
        const n = fbm2(x * 0.03, y * 0.03, 4), g = noise2(x * 1.4, y * 1.4);
        const sas = Math.sin(x * 0.3 + y * 0.12 + n * 4) * 0.5 + 0.5, drift = fbm2(x * 0.018 + 3, y * 0.018, 4);
        mixC(COL.snow, COL.snowShade, sat(0.3 - n) * 0.5, T1); set(p, T1); mul(p, 0.97 + g * 0.03);
        p.h += sas * 0.45 + n * 1.4 + drift * 4;
        // exposed rocks poking through
        worley2(x / 7, y / 7, 0.9, 181);
        if ((W.id & 255) < 30 && W.f1 < 0.3) { const q = 1 - W.f1 / 0.3; p.h += q * 3; if (q > 0.35) { mixC(COL.peakRock, COL.snowShade, 0.25, T1); set(p, T1); p.mat = M.ROCK; } }
        p.mat = M.SNOW;
        const ice = fbm2(x * 0.02 + 40, y * 0.02, 3);
        if (ice > 0.34) { set(p, COL.ice); p.mat = M.CRYSTAL; p.gloss = 0.85; }
      }
      mountain(x, y, p, lowH + 20, L.FROST_PEAK, 1.15, RI.frost, COL.peakRock, COL.slateLight, COL.slateDark, 0.013, true);
    }
    // --- thunder cliff: a dark slate mesa ---
    if (x > 800 && x < 1200 && y > 600 && y < 940) {
      const e = edge('storm', x, y, 16, 0.03);
      const md = Math.hypot(x - L.STORM_MESA.x, (y - L.STORM_MESA.y) * 1.2) + fbm2(x * 0.05, y * 0.05, 3) * 18;
      let rise = 0;
      if (e > -22) rise = 24 * vary(x, y, 61) * smooth(-2, 4, e) + ridge2(x * 0.03, y * 0.03, 3) * 4 * smooth(0, 20, e);
      if (md < L.STORM_MESA.r + 10) rise = Math.max(rise, 24 + (L.STORM_MESA.h - 24) * smooth(L.STORM_MESA.r + 4, L.STORM_MESA.r - 6, md) + ridge2(x * 0.06, y * 0.06, 3) * 6);
      if (rise > 0) p.h = Math.max(p.h, lowH + rise);
      apron(x, y, p, e, COL.slate, COL.slateDark);
      if (e > -2 || md < L.STORM_MESA.r) {
        p.reg = RI.storm;
        rockGround(x, y, p, COL.slate, COL.slateLight, COL.slateDark, 1.1);
        const pud = fbm2(x * 0.04 + 2, y * 0.04, 3);
        p.gloss = Math.max(p.gloss, 0.35);
        if (pud > 0.3) { mix(p, COL.slateDark, 0.6); p.gloss = 0.9; p.h -= (pud - 0.3) * 3; }
        if (fbm2(x * 0.03 - 4, y * 0.03, 3) > 0.25) { grass(x, y, p, 1); mix(p, COL.slate, 0.45); }
      }
    }
    // --- mount bellows: the volcano, basalt crust, lava ---
    if (x > 500 && x < 1280 && y > 880 && y < 1480) volcano(x, y, p, lowH);
    // --- future islands: fogged, jungle-topped, a small rocky peak ---
    for (const is of L.FUTURE.islands) {
      const d = Math.hypot(x - is.x, (y - is.y) * 1.25);
      if (d < is.r * 0.8) { const env = Math.pow(1 - d / (is.r * 0.8), 1.4), pk = env * 34 * (0.7 + 0.5 * ridge2(x * 0.05 + is.seed, y * 0.05, 3)); p.h += pk; if (pk > 16) rockGround(x, y, p, COL.peakRock, COL.mineRock, COL.dirtDark); p.reg = RI.islands; }
    }
  }

  // the sunken temple's ruins: a stepped pyramid with a shrine, flooded courtyard pools, broken pillars
  const PYR = { x: 272, y: 1702, half: 46, tiers: 5, step: 6.5 }, POOLS = [{ x: 296, y: 1546, w: 30, h: 19 }, { x: 302, y: 1826, w: 26, h: 17 }];
  function templeRuins(x, y, p, e) {
    const top = p.h;
    const dx = x - PYR.x, dy = y - PYR.y, dm = Math.max(Math.abs(dx), Math.abs(dy));
    if (dm < PYR.half) {
      const tier = Math.min(PYR.tiers, Math.floor((PYR.half - dm) / (PYR.half / (PYR.tiers + 0.6))) + 1);
      let h = tier * PYR.step;
      const stair = Math.abs(dx) < 7 && dy > 0;
      if (stair) { const t = (PYR.half - dy) / PYR.half; h = Math.max(h, Math.floor(t * PYR.tiers * PYR.step / 1.6) * 1.6); }
      const fb = ((x + (Math.floor(y / 3) & 1) * 2) / 4) % 1, fy = (y / 3) % 1, jt = Math.min(fb, 1 - fb) < 0.08 || Math.min(fy, 1 - fy) < 0.1;
      const sid = hash2(Math.floor(x / 4), Math.floor(y / 3), 7);
      mixC(COL.sandstone, c3(198, 150, 98), sid * 0.6, T1); set(p, T1); if (jt) mul(p, 0.78);
      if (stair) { mul(p, 0.92 + (Math.floor(h / 1.6) & 1) * 0.08); }
      // the shrine on top: a roofed block with a dark doorway facing south
      if (dm < 11) { h = PYR.tiers * PYR.step + 9 + (dm < 8 ? 2 : 0); mixC(c3(196, 170, 120), c3(170, 120, 80), dm < 8 ? 0.5 : 0, T1); set(p, T1); if (Math.abs(dx) < 3.5 && dy > 6) { set(p, c3(40, 30, 24)); h -= 7; } }
      // moss on the steps
      if (fbm2(x * 0.06, y * 0.06, 3) > 0.15) mix(p, COL.moss, 0.5);
      p.h = top + h; p.mat = M.ROCK; p.noTree = true;
      return;
    }
    for (const pl of POOLS) {
      const qx = Math.abs(x - pl.x) - pl.w / 2, qy = Math.abs(y - pl.y) - pl.h / 2, sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 3;
      if (sd < 3) {
        p.noTree = true;
        if (sd > 0) { mixC(COL.sandstone, c3(236, 222, 186), 0.5, T1); set(p, T1); p.h = top + 0.8; p.mat = M.STONE; continue; }   // kerb
        p.h = top - 4 + smooth(0, -2, sd) * 0 ; p.wl = top - 0.6; p.wt = WT.LAGOON;
        const row = Math.floor(y / 4), fb = ((x + (row & 1) * 2) / 4) % 1; mixC(COL.sandstone, COL.moss, 0.35 + (Math.min(fb, 1 - fb) < 0.08 ? 0.3 : 0), T1); set(p, T1); p.mat = M.STONE;
      }
    }
    // broken pillars standing in rows on the terraces
    if (e > 10) {
      worley2(x / 15, y / 15, 0.7, 13);
      if ((W.id & 255) < 60 && W.f1 < 0.11) {
        const cx = W.px * 15, cy = W.py * 15;
        if (A.nearest('road', cx, cy).d > L.ROAD_HW + 10 && Math.max(Math.abs(cx - PYR.x), Math.abs(cy - PYR.y)) > PYR.half + 6 && !POOLS.some(pl => Math.abs(cx - pl.x) < pl.w && Math.abs(cy - pl.y) < pl.h)) {
          let near = false; for (const n of L.NODES) if (Math.hypot(cx - n.x, cy - n.y) < 60) near = true;
          if (!near) { const hh = 4 + ((W.id >>> 8) & 255) / 255 * 9; p.h = top + hh; mixC(COL.sandstone, c3(196, 150, 100), ((W.id >>> 16) & 255) / 255, T1); set(p, T1); mul(p, 0.9 + (1 - W.f1 / 0.11) * 0.15); p.mat = M.ROCK; p.noTree = true; }
        }
      }
    }
  }

  // a mountain: a sharp cone with radial arêtes and gullies, eroded detail, strata, optional snow cap
  function mountain(x, y, p, baseH, MT, ys, reg, cA, cB, cD, rf, snow) {
    const dx = x - MT.x, dy = (y - MT.y) * ys, md = Math.hypot(dx, dy), rr = md / MT.r;
    if (rr >= 1.2) return;
    const a = Math.atan2(dy, dx), wob = fbm2(Math.cos(a) * 1.5 + 4, Math.sin(a) * 1.5, 3) * 0.2;
    const env = Math.max(0, 1 - rr * (1 + wob));
    // a concave massif with a sharp summit, carved by ridged noise into spurs and valleys
    const ar = ridge2(x * rf + 9.1, y * rf - 3.3, 5), det = ridge2(x * rf * 2.6 + 5, y * rf * 2.6, 4);
    let mh = MT.h * (Math.pow(env, 2.1) * 0.78 + Math.pow(env, 1.1) * 0.34 * (ar - 0.35) + env * 0.08 * det) - 3 * (1 - env);
    if (mh <= 0) return;
    const nh = baseH * smooth(1.2, 0.95, rr) + mh;
    if (nh <= p.h) return;
    p.h = nh;
    if (rr < 1.02) {
      p.reg = reg;
      rockGround(x, y, p, cA, cB, cD, 1.3);
      const st = Math.sin(p.h * 0.45 + det * 3) * 0.5 + 0.5; mix(p, cB, st * 0.22);
      if (snow) {
        const sl = sat((mh / MT.h - 0.1 + fbm2(x * 0.04, y * 0.04, 3) * 0.16 + (ar - 0.5) * 0.3) * 3.2);
        if (sl > 0.02) { mixC(COL.snow, COL.snowShade, 0.25 - ar * 0.25, T1); mix(p, T1, sl); if (sl > 0.5) { p.mat = M.SNOW; p.h += sl * 1.2; } }
      }
    }
  }

  // the volcano: concave cone, gullies, a crater with a lava lake, lava rivers, ember cracks
  function volcano(x, y, p, lowH) {
    const e = edge('magma', x, y, 14, 0.02);
    const V = L.VOLCANO, dx = x - V.x, dy = (y - V.y) * 1.06, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const dn = d * (1 + 0.07 * noise2(Math.cos(a) * 2 + 5, Math.sin(a) * 2) + 0.035 * noise2(Math.cos(a) * 7, Math.sin(a) * 7));
    let vh = 0, u = 1;
    if (dn < V.r) {
      u = (dn - V.crater) / (V.r - V.crater);
      if (u > 0) vh = V.h * Math.pow(1 - u, 1.55);
      else vh = V.floor + (V.h - V.floor) * smooth(V.crater * 0.8, V.crater, dn) + fbm2(x * 0.06, y * 0.06, 3) * 1.5 * (1 - smooth(V.crater * 0.7, V.crater * 0.8, dn));
      const gul = ridge2(a * 7, dn * 0.014, 3) - 0.45, mid = Math.sin(clamp(u, 0, 1) * Math.PI) * (1 - clamp(u, 0, 1) * 0.4);
      vh += gul * 12 * mid;
      vh += Math.exp(-((dn - V.crater) ** 2) / 50) * 4;
    }
    const plain = e > -16 ? 3 * smooth(-4, 22, e) : 0;
    if (vh + plain > 0) p.h = Math.max(p.h, lowH + plain + vh);
    if (!(e > -3 || dn < V.r * 0.92)) { if (e > -16) apron(x, y, p, e, COL.crust, COL.ash); return; }
    const lx0 = x, ly0 = y;
    p.reg = RI.magma;
    const n = fbm2(x * 0.025, y * 0.025, 4), hgt = clamp(vh / V.h);
    rockGround(x, y, p, COL.crust, COL.ash, COL.crustDark, 1.0);
    // ash: lighter streaks down the slope, darker fresh rock near the top
    const streak = noise2(a * 30, dn * 0.02) * 0.5 + 0.5;
    mix(p, COL.ash, sat(n + 0.25) * 0.45 + streak * 0.2 * (1 - hgt));
    mixC(COL.crustDark, c3(120, 60, 40), 0.25, T1); mix(p, T1, hgt * hgt * 0.5);
    // ember cracks: only on the upper slopes, thin and sparse
    const cr = Math.abs(warp2(x * 0.026, y * 0.026, 1.2, 3));
    const crack = sat(1 - cr / 0.009) * smooth(V.r * 0.62, V.r * 0.22, dn) * sat(noise2(x * 0.02, y * 0.02) * 2 + 0.3);
    if (crack > 0) { mix(p, COL.lava, crack * 0.6); const g = crack * crack * 0.8; p.er += 1.4 * g; p.eg += 0.3 * g; p.eb += 0.03 * g; p.h -= crack * 0.6; }
    // crater floor: dark rubble; the lava lake against the north wall
    if (dn < V.crater * 0.8) { mixC(COL.crustDark, COL.ash, 0.25, T1); mix(p, T1, 0.5); }
    const lk = V.lake, dl = Math.hypot(x - lk.x, (y - lk.y) * 1.1) + fbm2(x * 0.08, y * 0.08, 2) * 4;
    if (dl < lk.r + 6) {
      const t = smooth(lk.r + 2, lk.r - 3, dl), sw = fbm2(x * 0.08, y * 0.08, 3);
      p.h = lerp(p.h, lowH + V.floor - 2.5, t);
      const wx = x + fbm2(x * 0.05, y * 0.05, 3) * 6, wy = y + fbm2(x * 0.05 + 7, y * 0.05, 3) * 6;
      worley2(wx / 6, wy / 6, 1, 171); const ce = Math.abs(cellEdge(wx / 6, wy / 6)), cov = ((W.id & 255) / 255) < 0.62 ? 1 : 0;
      const plate = smooth(0.04, 0.16 + noise2(x * 0.3, y * 0.3) * 0.06, ce) * cov;
      const crust = sat(plate * 0.9 + sw * 0.35 + smooth(lk.r - 6, lk.r, dl) * 0.3);
      mixC(COL.lava, COL.crustDark, crust * 0.92, T1); mix(p, T1, t); p.h += plate * 0.6 * t;
      const g = t * (1 - crust * 0.92) * 1.0; p.er += 1.1 * g; p.eg += 0.24 * g; p.eb += 0.025 * g; if (t > 0.5) p.mat = M.LAVA;
      const rim = Math.exp(-((dl - lk.r) ** 2) / 6) * 0.5; p.er += rim * 0.6; p.eg += rim * 0.12;
    }
    // lava rivers down the flanks
    for (const fl of LAVA) {
      const q = nearSeg(fl, x, y), wdt = 2.6 + q.t * 4.5;
      if (q.d < wdt + 6) {
        const s = smooth(wdt + 3, wdt * 0.4, q.d);
        p.h -= s * 1.6;
        worley2(q.s / 5, q.d / 2.5 + 30, 1, 173); const plt = (W.id & 255) < 110 ? smooth(0.05, 0.2, Math.abs(cellEdge(q.s / 5, q.d / 2.5 + 30))) : 0;
        const flow = fbm2(q.s * 0.12, q.d * 0.3 + q.s * 0.03, 3), crust = sat(q.t * 0.7 - 0.15 + flow * 0.8 + plt * (0.4 + q.t * 0.6) + smooth(wdt * 0.35, wdt, q.d) * 0.6) * 0.94;
        mixC(COL.lava, COL.crustDark, crust, T1); mix(p, T1, s);
        const g = s * (1 - crust) * 0.9; p.er += 1.1 * g; p.eg += 0.22 * g; p.eb += 0.02 * g;
        if (s > 0.5) p.mat = M.LAVA;
      }
    }
  }

  // snow-dusted pines (frost plateau): cones with branch tiers
  function pines(x, y, dens, p) {
    const sc = 12.5, gx = x / sc, gy = y / sc, xi = Math.floor(gx), yi = Math.floor(gy);
    let hgt = 0, rel = 0, best = 0, side = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const id = ihash2(xi + i, yi + j, 191);
      if (((id >>> 20) & 15) / 15 >= dens) continue;
      const cx = xi + i + 0.5 + (((id & 1023) / 1023) - 0.5) * 0.6, cy = yi + j + 0.5 + ((((id >>> 10) & 1023) / 1023) - 0.5) * 0.6;
      const r = 0.4 + ((id >>> 4) & 63) / 63 * 0.16, th = 17 + ((id >>> 12) & 255) / 255 * 11;
      const dx = gx - cx, dy = gy - cy, d = Math.hypot(dx, dy) / r;
      if (d >= 1) continue;
      const tier = 1 - 0.2 * (((d * 3.6) % 1));   // branch tiers
      const hh = th * (1 - d) * tier;
      if (hh > hgt) { hgt = hh; rel = 1 - d; best = id; side = (dx * -0.6 + dy * -0.4) / (Math.hypot(dx, dy) + 1e-3); }
    }
    if (hgt <= 0) return;
    p.h += hgt + noise2(x * 1.6, y * 1.6) * 0.4;
    mixC(c3(24, 62, 50), c3(46, 96, 70), sat(rel * 0.8 + ((best >>> 8) & 255) / 600), T1); set(p, T1);
    const snowy = sat((side * 0.5 + 0.35) + noise2(x * 0.9, y * 0.9) * 0.5 + (((rel * 3.2) % 1) > 0.75 ? 0.4 : 0) - 0.25);
    if (snowy > 0.3) mix(p, COL.snow, sat((snowy - 0.3) * 1.6) * 0.85);
    p.mat = M.FOLIAGE;
  }
  function pineDensity(x, y) {
    let d = smooth(8, 30, edge('frost', x, y, 12, 0.02));
    if (d <= 0) return 0;
    d *= smooth(-0.05, 0.25, fbm2(x * 0.012 + 9, y * 0.012, 3));
    const md = Math.hypot(x - L.FROST_PEAK.x, (y - L.FROST_PEAK.y) * 1.15); d *= smooth(L.FROST_PEAK.r * 0.95, L.FROST_PEAK.r * 1.15, md);
    if (d <= 0) return 0;
    const rd = A.nearest('road', x, y).d; d *= smooth(L.ROAD_HW + 8, L.ROAD_HW + 22, rd);
    for (const n of L.NODES) { const nd = Math.hypot(x - n.x, y - n.y); if (nd < 100) d *= smooth(46, 76, nd); }
    return d;
  }

  // region edges: the same noise parameters the region code uses, plus a bounding box (to skip far regions)
  const EPAR = {
    temple: [9, 0.02, [0, 1150, 520, 2060]], bog: [14, 0.025, [300, 1360, 940, 2040]], grotto: [12, 0.025, [40, 820, 700, 1320]],
    mine: [12, 0.022, [340, 520, 960, 1090]], caves: [10, 0.02, [220, 280, 880, 810]], crystal: [12, 0.022, [760, 60, 1420, 530]],
    frost: [12, 0.02, [960, 200, 1600, 900]], storm: [16, 0.03, [740, 540, 1260, 1000]], magma: [14, 0.02, [440, 820, 1340, 1540]],
  };
  // how much jungle overgrows each region from its edge (0..1), and a tint for those crowns
  const OG = { temple: 0.95, bog: 0.8, grotto: 0.62, mine: 0.42, caves: 0.5, crystal: 0.32, storm: 0.5, magma: 0.55 };
  const OGT = { bog: [c3(70, 86, 40), 0.35], grotto: [c3(30, 84, 86), 0.3], crystal: [c3(96, 80, 130), 0.2], storm: [c3(34, 60, 66), 0.3], magma: [c3(70, 70, 36), 0.35] };
  const ECO = { magma: [c3(84, 76, 58), 0.5], frost: [c3(222, 232, 240), 0.32], bog: [c3(116, 120, 52), 0.42], crystal: [c3(168, 140, 196), 0.24],
    mine: [c3(188, 146, 84), 0.32], temple: [c3(196, 178, 128), 0.18], grotto: [c3(44, 96, 96), 0.32], storm: [c3(80, 86, 104), 0.3] };
  function overgrowth(x, y, k, e) {
    let d;
    if (k === 'magma') {   // the volcano's lower slopes stay wooded, thinning upward
      const V = L.VOLCANO, dn = Math.hypot(x - V.x, (y - V.y) * 1.06);
      d = smooth(V.r * 0.66, V.r * 0.96, dn + fbm2(x * 0.02, y * 0.02, 3) * 40) * 0.9;
      for (const fl of LAVA) { const q = nearSeg(fl, x, y); if (q.d < 34) d *= smooth(14, 34, q.d); }
    } else {
      d = smooth(46, 2, e + fbm2(x * 0.02 + 3, y * 0.02, 3) * 30);
      if (k === 'temple' || k === 'bog') d = Math.max(d, sat(fbm2(x * 0.011 + 7, y * 0.011, 3) * 3.2 - 0.35));
      if (k === 'mine') d *= smooth(L.MINE_MTN.r * 0.85, L.MINE_MTN.r * 1.15, Math.hypot(x - L.MINE_MTN.x, (y - L.MINE_MTN.y) * 1.1));
      if (k === 'storm') d *= smooth(L.STORM_MESA.r, L.STORM_MESA.r + 30, Math.hypot(x - L.STORM_MESA.x, (y - L.STORM_MESA.y) * 1.2));
    }
    d *= OG[k];
    if (d <= 0) return 0;
    d *= smooth(-0.3, 0.1, fbm2(x * 0.009 - 3, y * 0.009, 3));
    const rd = A.nearest('road', x, y).d; d *= smooth(L.ROAD_HW + 10, L.ROAD_HW + 26, rd + noise2(x * 0.08, y * 0.08) * 6);
    for (const n of L.NODES) { const nd = Math.hypot(x - n.x, y - n.y); if (nd < 120) d *= smooth(50, 90, nd); }
    return d;
  }

  // how dense the canopy is: none on the beach, around roads, pads and region edges
  function forestDensity(x, y, c) {
    if (x > 1340 && y > 1680) return smooth(16, 34, c) * smooth(-0.4, 0.1, fbm2(x * 0.02, y * 0.02, 2)) * 1.05;
    let d = smooth(70, 120, c);
    if (d <= 0) return 0;
    const rd = A.nearest('road', x, y).d;
    d *= smooth(L.ROAD_HW + 12, L.ROAD_HW + 30, rd + noise2(x * 0.08, y * 0.08) * 6);
    for (const n of L.NODES) { const nd = Math.hypot(x - n.x, y - n.y); if (nd < 120) d *= smooth(50, 90, nd); }
    for (const k of ['temple', 'bog', 'grotto', 'mine', 'caves', 'crystal', 'frost', 'storm', 'magma', 'lagoon']) { const e = edge(k, x, y, k === 'storm' ? 16 : 12, 0.022); if (e > -40) d *= smooth(k === 'magma' ? 0 : 6, k === 'magma' ? -16 : -6, e); }
    const wd = A.nearest('water', x, y).d; d *= smooth(10, 22, wd);
    d *= smooth(-0.35, 0.05, fbm2(x * 0.006 + 3, y * 0.006, 3));   // natural clearings
    return d * 1.05;
  }

  // lava flow lines (world units)
  const LAVA = [
    [[796, 1240], [782, 1266], [770, 1290], [748, 1316], [736, 1340], [712, 1362], [690, 1374]],
    [[774, 1172], [748, 1170], [722, 1182], [700, 1200], [672, 1206], [648, 1220], [628, 1222]],
  ].map(pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, s, len: s[s.length - 1] }; });
  const NQ = { d: 0, s: 0, t: 0 };
  function nearSeg(fl, x, y) {
    NQ.d = 1e9;
    const P = fl.pts;
    for (let k = 0; k < P.length - 1; k++) {
      const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, l2 = dx * dx + dy * dy;
      let t = ((x - ax) * dx + (y - ay) * dy) / l2; t = clamp(t);
      const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
      if (d < NQ.d) { NQ.d = d; NQ.s = fl.s[k] + t * Math.sqrt(l2); }
    }
    NQ.t = NQ.s / fl.len;
    // meander the edges
    NQ.d += noise2(NQ.s * 0.06, 3) * 3.2 + noise2(NQ.s * 0.2, 9) * 1.2;
    return NQ;
  }

  // ---------- streams: carve the bed, water follows the smoothed profile ----------
  function streams(x, y, p) {
    const R = A.nearest('water', x, y);
    if (R.line < 0 || R.d > 30) return;
    const ln = A.lines[R.line], isFalls = ln.name === 'falls', u = R.s / ln.len;
    const half = isFalls ? 5 + u * 2 : 6 + u * 7 + noise2(R.s * 0.05, 1) * 1.5;
    if (R.d > half + 12) return;
    const zw = prof ? prof.waterZ(R.line, R.s) : p.h;
    const bank = smooth(half + 10, half, R.d), inside = smooth(half, half - 2.5, R.d);
    // banks slope down to the water; bed below it
    const bed = zw - 0.6 - 2.2 * (1 - (R.d / half) ** 2);
    p.h = lerp(p.h, Math.min(p.h, zw + 0.5), bank);
    if (R.d < half) {
      p.h = Math.min(p.h, bed); p.wl = zw; p.wt = WT.STREAM;
      // pebbly bed
      worley2(x / 1.6, y / 1.6, 1, 121); const peb = 1 - sat(W.f1 / 0.55);
      mixC(COL.sandWarm, COL.peakRock, (W.id & 255) / 255 * 0.6, T1); set(p, T1); mul(p, 0.85 + peb * 0.3); p.h += peb * 0.4; p.mat = M.SAND;
    } else if (bank > 0) {
      // muddy, mossy banks with wet pebbles
      const t = bank * 0.8;
      mixC(COL.sandWet, COL.moss, sat(noise2(x * 0.2, y * 0.2) + 0.3), T1); mix(p, T1, t); if (t > 0.4) { p.mat = M.MUD; p.gloss = Math.max(p.gloss, t * 0.4); }
    }
  }

  // ---------- roads and node pads (run last) ----------
  const RP = { d: 0 };
  function roads(x, y, p) {
    if (!prof) return;
    // node pads
    for (const n of L.NODES) {
      const dx = x - n.x, dy = y - n.y, d = Math.hypot(dx, dy), R = n.boss ? L.BOSS_PAD_R : L.PAD_R;
      if (d < R + 56) prof.pad(n, d, dx, dy, R, p);
    }
    const R = A.nearest('road', x, y);
    if (R.line < 0) return;
    const half = L.ROAD_HW + noise2(R.s * 0.07, R.line) * 1.2;
    if (R.d > half + 52) return;
    prof.road(R, half, p);
  }

  // ---------- the whole surface ----------
  const PL = plugins.filter(m => m.ground);
  function surface(x, y, p, stage = 3) {
    base(x, y, p);
    if (stage >= 1) streams(x, y, p);
    if (stage >= 2) for (const m of PL) { const b = m.bounds; if (!b || (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])) m.ground(p, G); }
    if (stage >= 3) roads(x, y, p);
    return p;
  }
  // restore the ground under the canopy / pines with weight t (0..1)
  // the ground height (before canopy / plug-ins / roads) at any point: deterministic, for modules that need a level
  const tmpP = {}, baseAt = (x, y) => { base(x, y, tmpP); return tmpP.h0 ?? tmpP.h; };
  const clear = (p, t) => { if (t <= 0 || p.h0 === undefined) return; p.h = lerp(p.h, p.h0, t); p.r = lerp(p.r, p.r0, t); p.g = lerp(p.g, p.g0, t); p.b = lerp(p.b, p.b0, t); if (t > 0.5) p.mat = p.mat0; };
  const G = { A, L, M, RI, WT, COL, NO_WATER, set, mix, mul, mixC, clear, baseAt, grass, sand, rockGround, canopy, coastE, edge, vary, apron, noise2, fbm2, ridge2, worley2, W, cellEdge, smooth, clamp, lerp, sat, hash2, ihash2 };
  return { surface, G, forestDensity, LAVA, base, setProf: q => { prof = q; } };
}
