// Coconut Beach (the start): the hut, the coconut launch pad and hero palms.
// This is the worked example of a region module (see ../README.md):
//   ground(p, g)  per-texel hook: clears the jungle for the hut, paints the launch pad and a sandy footpath
//   props(api)    lit 3D props: hut on stilts with a thatched roof, launch ramp + coconut rocket, palms, torches...
//   materials     extra prop materials (here: the flame of the tiki torches)
//   anchors       live-effect anchors are added from props() with api.anchor()

const NODE1 = [806, 2262];
const HUT = { x: 968, y: 2226 };
const PAD = { x: 672, y: 2296, r: 30 };
const DIR = (() => { const a = Math.atan2(-0.78, 0.62); return [Math.cos(a), Math.sin(a)]; })();   // launch toward the island

// sandy footpath from node 1 to the hut porch
const TRAIL = [[838, 2266], [880, 2272], [918, 2272], [950, 2268]];
const distSeg = (x, y, P) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return d; };

export default {
  key: 'beach',
  order: 10,
  bounds: [540, 2140, 1160, 2450],          // world map units: where ground() runs; also the default preview window
  preview: [560, 2080, 1120, 2450],

  ground(p, g) {
    const { x, y } = p;
    // hut clearing: no canopy, trodden sandy grass
    const dh = Math.hypot(x - HUT.x, (y - HUT.y) * 1.15);
    if (dh < 80) {
      const t = g.smooth(80, 52, dh + g.noise2(x * 0.08, y * 0.08) * 8);
      g.clear(p, t);
      if (dh < 56) { const s = g.smooth(56, 36, dh + g.noise2(x * 0.1, y * 0.1) * 6); const keep = [p.r, p.g, p.b]; g.sand(x, y, p, 0); p.r = g.lerp(keep[0], p.r, s * 0.85); p.g = g.lerp(keep[1], p.g, s * 0.85); p.b = g.lerp(keep[2], p.b, s * 0.85); }
    }
    // footpath
    const dt = distSeg(x, y, TRAIL);
    if (dt < 14) { g.clear(p, g.smooth(14, 8, dt)); const s = g.smooth(5.5, 3.5, dt + g.noise2(x * 0.3, y * 0.3) * 1.2); if (s > 0) { g.mix(p, g.COL.sandWarm, s * 0.75); p.h -= s * 0.2; } }
    // launch pad: a raised stone disc with painted target rings and chevrons
    const dp = Math.hypot(x - PAD.x, y - PAD.y);
    if (dp < PAD.r + 16) {
      g.clear(p, g.smooth(PAD.r + 16, PAD.r + 4, dp));
      const z0 = this._padZ ?? (this._padZ = g.baseAt(PAD.x, PAD.y));
      const sh = g.smooth(PAD.r + 10, PAD.r, dp);
      p.h = g.lerp(p.h, z0 + 0.4, sh);
      if (dp < PAD.r) {
        const u = dp / PAD.r, a = Math.atan2(y - PAD.y, x - PAD.x);
        p.h = z0 + 1.8 + (u > 0.9 ? 0.6 : 0);
        // slabs
        const seg = Math.floor((a / (Math.PI * 2) + 0.5) * 16), ring = Math.floor(u * 5);
        const tone = (((seg * 7 + ring * 13) * 2654435761) >>> 0) / 4294967296;
        g.set(p, [0.84 - tone * 0.1, 0.8 - tone * 0.1, 0.74 - tone * 0.1]); p.mat = g.M.STONE;
        const joint = Math.abs(((a / (Math.PI * 2) + 0.5) * 16) % 1 - 0.5) > 0.47 || Math.abs((u * 5) % 1 - 0.5) > 0.46;
        // target rings
        const R = dp;
        const red = [0.85, 0.2, 0.14], cream = [0.98, 0.93, 0.8];
        if (R < 6.5) g.set(p, red); else if (R < 10.5) g.set(p, cream); else if (R < 15) g.set(p, red); else if (R < 19) g.set(p, cream);
        // chevrons pointing the launch direction
        const lx = (x - PAD.x) * DIR[0] + (y - PAD.y) * DIR[1], ly = -(x - PAD.x) * DIR[1] + (y - PAD.y) * DIR[0];
        if (lx > 20 && lx < 27 && Math.abs(ly) < (27 - lx) * 1.1) g.set(p, [1.0, 0.78, 0.2]);
        if (joint) { g.mul(p, 0.72); p.h -= 0.2; }
        g.mul(p, 0.94 + g.noise2(x * 0.6, y * 0.6) * 0.06);
        if (u > 0.9) { g.set(p, [0.62, 0.58, 0.52]); g.mul(p, 0.9 + tone * 0.15); }
      }
    }
  },

  props(api) {
    const { lib } = api, R = api.rand(77);
    const ground = (x, y) => api.ground(x, y);

    // ---------- the hut on stilts ----------
    if (api.inCrop(HUT.x, HUT.y)) {
      const m = api.mesh(), z = ground(HUT.x, HUT.y), fl = z + 7, W = 40, D = 30, cx = HUT.x, cy = HUT.y, WH = 17;
      // stilts and floor
      m.mat('bark').col(0.42, 0.3, 0.2).ao(0.7);
      for (const sx of [-1, 0, 1]) for (const sy of [-1, 1]) m.tube([[cx + sx * (W / 2 + 1), cy + sy * (D / 2 + 1), z - 1], [cx + sx * (W / 2 + 1), cy + sy * (D / 2 + 1), fl]], 1.4, { seg: 8 });
      m.mat('wood').col(0.62, 0.46, 0.3).ao(0.9).seed(201);
      m.box(cx, cy + 4, fl, W + 7, D + 14, 1.8);                     // floor with a porch to the south
      m.mat('wood').col(0.55, 0.4, 0.26).seed(202);
      for (let k = 0; k < 4; k++) m.box(cx - 5, cy + D / 2 + 12 + k * 3, fl - 1.6 - k * 1.7, 12, 3.2, 1.2);   // steps down
      // bamboo walls, a doorway on the south side
      m.mat('bamboo').ao(0.85);
      const pole = (x, y, h) => { m.col(0.78 + R() * 0.06, 0.66 + R() * 0.05, 0.38).seed(Math.floor(R() * 1e6)); m.tube([[x, y, fl], [x, y, fl + h]], 1.15, { seg: 7, vScale: 4 }); };
      for (let t = 0; t <= W; t += 2.2) { pole(cx - W / 2 + t, cy - D / 2, WH); const dx = cx - W / 2 + t; if (Math.abs(dx - (cx - 5)) > 5) pole(dx, cy + D / 2, WH); }
      for (let t = 2.2; t < D; t += 2.2) { pole(cx - W / 2, cy - D / 2 + t, WH); pole(cx + W / 2, cy - D / 2 + t, WH); }
      m.mat('default').col(0.12, 0.08, 0.06).ao(0.3);
      m.box(cx - 5, cy + D / 2 - 1.6, fl + 6.6, 10, 1, 13);           // dark doorway interior
      m.mat('wood').col(0.5, 0.36, 0.22).seed(203);
      m.box(cx, cy + D / 2 + 0.4, fl + WH - 0.4, W + 3, 1.8, 1.8);       // lintel beam
      m.box(cx + 10, cy + D / 2 + 0.5, fl + 9.5, 7, 0.8, 5.6);          // window shutter
      m.mat('default').col(0.16, 0.11, 0.08).ao(0.4); m.box(cx + 10, cy + D / 2 - 0.2, fl + 9.5, 5.6, 0.8, 4.4);
      // thatched roof: a square pyramid (lathe with 4 sides), stretched to the footprint
      const roof0 = fl + WH - 0.8, RR = (W / 2 + 8) * Math.SQRT2;
      m.mat('thatch').col(0.86, 0.7, 0.42).ao(1).seed(204);
      const mk = m.mark();
      m.lathe(cx, cy, roof0, [[RR, 0], [RR * 0.8, 5], [RR * 0.55, 10.5], [RR * 0.3, 16], [RR * 0.08, 20.5], [0, 21.5]], { seg: 4, rot: Math.PI / 4, aoFn: t => 0.8 + 0.2 * t });
      m.transform(mk, ([x, y, zz]) => [x, cy + (y - cy) * ((D / 2 + 8) / (W / 2 + 8)), zz]);
      // ridge cap and a little finial
      m.mat('bark').col(0.36, 0.26, 0.16).ao(0.9);
      m.lathe(cx, cy, roof0 + 20, [[3.2, 0], [2.4, 2], [0.9, 3.6], [0.4, 6.4]], { seg: 8 });
      // a hammock-ish rolled net and fishing floats on the porch
      m.mat('rope').col(0.82, 0.72, 0.5); m.tube([[cx + 7, cy + D / 2 + 4, fl + 1.8], [cx + 15, cy + D / 2 + 6, fl + 2.2]], 1.4, { seg: 6 });
      m.mat('paint').col(0.95, 0.4, 0.2); m.sphere(cx + 16, cy + D / 2 + 3, fl + 2.3, 1.4, 1.4, 1.4, { seg: 8, rings: 5 });
      m.col(0.98, 0.9, 0.7); m.sphere(cx + 13, cy + D / 2 + 8.5, fl + 2.2, 1.2, 1.2, 1.2, { seg: 8, rings: 5 });
      api.add(m);
      api.aoBlob(cx, cy + 3, 40, 0.5);
      // tiki torches either side of the steps
      const tm = api.mesh();
      for (const s of [-1, 1]) {
        const tx = cx - 5 + s * 12, ty = cy + D / 2 + 22, tz = ground(tx, ty);
        tm.mat('bamboo').col(0.7, 0.56, 0.32).seed(210 + s); tm.tube([[tx, ty, tz - 0.5], [tx, ty, tz + 14]], 0.8, { seg: 7, vScale: 2 });
        tm.mat('bark').col(0.3, 0.2, 0.12); tm.lathe(tx, ty, tz + 13.5, [[0.9, 0], [2, 1.4], [1.7, 3.2]], { seg: 8 });
        tm.mat('flame').col(1.0, 0.62, 0.18); tm.lathe(tx, ty, tz + 16.4, [[1.4, 0], [1.3, 1.6], [0.6, 3.8], [0, 5.2]], { seg: 8 });
        api.anchor('torch', tx, ty, tz + 19, 8);
      }
      api.add(tm);
    }

    // ---------- the coconut launch pad: ramp on trestles, a coconut rocket, coconuts, a flag ----------
    if (api.inCrop(PAD.x, PAD.y)) {
      const m = api.mesh(), z = ground(PAD.x, PAD.y) + 0.2;
      const SC = 1.4, perp = [-DIR[1], DIR[0]], at = (t, off, h) => [PAD.x + DIR[0] * t * SC + perp[0] * off * SC, PAD.y + DIR[1] * t * SC + perp[1] * off * SC, z + h * SC];
      const rampH = t => 3 + (t + 6) * 0.48;
      // rails
      m.mat('wood').col(0.6, 0.42, 0.24).seed(301);
      for (const off of [-2.6, 2.6]) m.tube([at(-6, off, rampH(-6)), at(22, off, rampH(22))], 1.0, { seg: 4 });
      // sleepers across the rails
      m.mat('wood').col(0.5, 0.34, 0.2).seed(302);
      for (let t = -5; t <= 21; t += 2.6) m.tube([at(t, -3.6, rampH(t) - 0.6), at(t, 3.6, rampH(t) - 0.6)], 0.6, { seg: 4 });
      // trestles
      m.mat('bark').col(0.42, 0.3, 0.2).ao(0.8);
      for (const t of [0, 9, 18]) { for (const off of [-3, 3]) m.tube([at(t, off * 1.25, 0), at(t, off, rampH(t) - 0.8)], 0.7, { seg: 6 }); m.tube([at(t, -3.4, rampH(t) * 0.45), at(t, 3.4, rampH(t) * 0.45)], 0.5, { seg: 5 }); }
      // the coconut rocket sitting on the rails
      const rp = at(2, 0, rampH(2) + 3.1);
      m.mat('coconut').col(0.5, 0.34, 0.18).seed(303);
      m.sphere(rp[0], rp[1], rp[2], 5, 5, 4.6, { seg: 20, rings: 14 });
      m.mat('paint').col(0.98, 0.86, 0.3);
      m.tube([[rp[0] - DIR[0] * 1.2, rp[1] - DIR[1] * 1.2, rp[2]], [rp[0] + DIR[0] * 1.2, rp[1] + DIR[1] * 1.2, rp[2]]], 5.15, { seg: 20 });   // a painted band
      m.col(0.88, 0.22, 0.14);
      for (const k of [0, 1, 2]) { const a = k / 3 * Math.PI * 2, fo = [perp[0] * Math.cos(a), perp[1] * Math.cos(a)], fz = Math.sin(a); m.tube([[rp[0] - DIR[0] * 3 + fo[0] * 4, rp[1] - DIR[1] * 3 + fo[1] * 4, rp[2] + fz * 4], [rp[0] - DIR[0] * 7.5 + fo[0] * 7, rp[1] - DIR[1] * 7.5 + fo[1] * 7, rp[2] + fz * 7]], 0.8, { seg: 4 }); }
      m.mat('metal').col(0.55, 0.55, 0.6);
      m.tube([[rp[0] - DIR[0] * 4.4, rp[1] - DIR[1] * 4.4, rp[2] - 0.5], [rp[0] - DIR[0] * 7, rp[1] - DIR[1] * 7, rp[2] - 1.2]], t => 2.2 + t * 0.8, { seg: 12 });
      // coconut pile and a crate
      m.mat('coconut');
      const pile = [PAD.x - 36, PAD.y + 8];
      let k = 0;
      for (const [lv, n, rr] of [[0, 7, 2.6], [1, 4, 1.5], [2, 1, 0]]) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + lv; m.col(k++ % 3 ? [0.5, 0.34, 0.18] : [0.44, 0.5, 0.2]).seed(400 + k); m.sphere(pile[0] + Math.cos(a) * rr * 1.3, pile[1] + Math.sin(a) * rr * 1.3, ground(...pile) + 1.9 + lv * 2.9, 2, 2, 2.1, { seg: 9, rings: 6 }); }
      m.mat('wood').col(0.66, 0.5, 0.3).seed(305);
      const cr = [PAD.x - 30, PAD.y - 18]; m.box(cr[0], cr[1], ground(...cr) + 3.2, 8.5, 8.5, 6.4, { rotZ: 0.4 });
      m.mat('coconut').col(0.5, 0.34, 0.18); for (let i = 0; i < 4; i++) m.sphere(cr[0] + (i % 2 - 0.5) * 3.2, cr[1] + ((i >> 1) - 0.5) * 3.2, ground(...cr) + 7, 1.8, 1.8, 1.8, { seg: 8, rings: 5 });
      // flag pole with a red pennant
      const fp = [PAD.x + 30, PAD.y + 20], fz = ground(...fp);
      m.mat('bark').col(0.5, 0.38, 0.26); m.tube([[fp[0], fp[1], fz - 0.5], [fp[0], fp[1], fz + 30]], t => 0.6 - t * 0.2, { seg: 7 });
      m.mat('cloth').col(0.9, 0.18, 0.14);
      const fl = [], sd = [], fw = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; fl.push([fp[0] + t * 11, fp[1] + Math.sin(t * 5) * 1.2, fz + 27 - t * 1.5]); sd.push([0, 0, 1]); fw.push(2.6 * (1 - t * 0.7)); }
      m.ribbon(fl, fw, sd, { cols: 2, up: false });
      api.add(m);
      api.aoBlob(PAD.x, PAD.y, PAD.r + 6, 0.25);
      api.anchor('sparkle', PAD.x, PAD.y, z + 6, 18, { note: 'launch pad' });
      api.anchor('flag', fp[0] + 6, fp[1], fz + 27, 8);
    }

    // ---------- hero palms along the beach (some leaning over the sand toward the sea) ----------
    const pm = api.mesh();
    const palms = [[598, 2318, 1, [0.1, 0.35]], [646, 2350, 2, [-0.2, 0.3]], [742, 2356, 3, [0.25, 0.3]], [870, 2344, 4, [0.0, 0.4]], [930, 2334, 5, [0.3, 0.2]],
      [1012, 2316, 6, [0.15, 0.35]], [1066, 2288, 7, [0.4, 0.1]], [1010, 2196, 8, [0.2, -0.1]], [906, 2196, 9, [-0.25, -0.1]], [560, 2262, 10, [-0.3, 0.2]], [1104, 2236, 11, [0.3, 0.1]]];
    for (const [x, y, seed, lean] of palms) {
      if (!api.inCrop(x, y)) continue;
      lib.palm(pm, { x, y, z: ground(x, y), h: 42 + (seed % 4) * 4, seed: seed + 20, lean });
      api.aoBlob(x, y, 11, 0.4);
    }
    api.add(pm);

    // ---------- bushes, ferns and rocks around the hut and the edges of the beach ----------
    const bm = api.mesh();
    const greens = [[0.24, 0.48, 0.18], [0.3, 0.52, 0.2], [0.2, 0.42, 0.22]];
    for (const [x, y, r, s] of [[934, 2214, 7, 1], [994, 2212, 6, 2], [1008, 2262, 6, 3], [920, 2262, 5, 4], [700, 2262, 6, 5], [644, 2270, 7, 6], [1060, 2250, 7, 7], [760, 2300, 5, 8]]) {
      if (!api.inCrop(x, y) || api.road(x, y) < 22) continue;
      lib.bush(bm, { x, y, z: ground(x, y), r, seed: s + 40, color: greens[s % 3] });
    }
    for (const [x, y, r, s] of [[948, 2200, 5, 1], [980, 2276, 4, 2], [622, 2244, 5, 3], [726, 2276, 4, 4]]) { if (api.inCrop(x, y)) lib.fern(bm, { x, y, z: ground(x, y), r, seed: s + 60 }); }
    for (const [x, y, r, s] of [[1124, 2306, 5, 1], [1132, 2296, 3.2, 2], [566, 2346, 4.5, 3], [578, 2354, 2.6, 4], [1090, 2352, 3.4, 5]]) { if (api.inCrop(x, y)) lib.rock(bm, { x, y, z: ground(x, y), r, seed: s + 80, color: [0.6, 0.56, 0.5] }); }
    api.add(bm);

    // ---------- a canoe pulled up on the sand ----------
    if (api.inCrop(1080, 2338)) {
      const cm = api.mesh(), cx = 1080, cy = 2338, a = -0.5, z = ground(cx, cy);
      cm.mat('wood').col(0.6, 0.38, 0.22).seed(501);
      const mk = cm.mark();
      cm.lathe(0, 0, 0, [[0.01, -1.6], [1.8, -1.2], [2.6, -0.2], [2.8, 0.6], [2.4, 0.9]], { seg: 14 });
      cm.transform(mk, ([x, y, zz]) => { const u = x * 4.2; const w = y * (1 - (u / 13) ** 2 * 0.0); return [cx + Math.cos(a) * u - Math.sin(a) * w, cy + Math.sin(a) * u + Math.cos(a) * w, z + 1.5 + zz + (u / 12) ** 2 * 1.5]; });
      cm.mat('wood').col(0.75, 0.6, 0.4); cm.tube([[cx - 7, cy + 7, z + 1.2], [cx + 6, cy + 2.6, z + 2.2]], 0.35, { seg: 5 });
      api.add(cm);
      api.aoBlob(cx, cy, 10, 0.35);
    }

    // live-effect anchors for the runtime
    api.anchor('birds', 760, 2200, 60, 140, { note: 'gulls over the beach' });
    api.anchor('water', 820, 2410, 0, 120, { note: 'surf' });
  },

  materials: {
    flame: { shade(s) { s.ar = s.cr; s.ag = s.cg; s.ab = s.cb; s.spec = 0; s.shin = 1; s.trans = 0; s.er = 2.2; s.eg = 1.0; s.eb = 0.25; } },
  },
};
