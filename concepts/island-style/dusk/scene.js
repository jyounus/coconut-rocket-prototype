// The style sample screen (390x844 map px, drawn at S=3): Coconut Island's beach start at dusk. Level 1's launch pad
// by the stilt hut on the beach, the road up to 2, over the creek bridge to 3 (open, lemur + "you are here"), then the
// fork to the Temple and the Bog leaving the top. Pass order:
//   1 ground, painted per pixel from soft masks + noise (sea, surf, sand, grass, creek, road, cast shadows)
//   2 props and canopy masses (brush passes)
//   3 air: light shafts, haze, colour grade, vignette (per pixel)
//   4 light sources (torches, hut lamp, pad ring, lit road), fireflies and motes
//   5 UI-ish layer: node tokens, pilot, marker   6 fine film grain
(() => {
  const D = window.DUSK, { TAU, clamp, lerp, smooth, mix, rgb, rand, hash, vnoise, fbm, resample, ribbonPath, pathOf, PAL, ramp, glow, blob } = D;
  const SW = 390, SH = 844;

  // ---------------- layout ----------------
  const COAST = resample([[-30, 700], [30, 708], [80, 722], [140, 734], [200, 738], [260, 732], [320, 722], [370, 712], [420, 706]], 2);
  const EDGE = resample([[-30, 592], [20, 600], [60, 612], [100, 626], [140, 620], [170, 598], [200, 582], [240, 570], [280, 562], [320, 550], [360, 542], [420, 538]], 2);
  const N = { 1: [200, 652], 2: [150, 505], 3: [250, 340] }, F = [225, 190];
  const ROAD_DONE = resample([N[1], [190, 600], [166, 552], N[2], [160, 462], [182, 425], [205, 398], [228, 366], N[3]], 1.5);
  const ROAD_UP = resample([N[3], [246, 290], [236, 238], F], 1.5);
  const ROAD_L = resample([F, [180, 166], [130, 136], [100, 80], [80, -30]], 1.5);
  const ROAD_R = resample([F, [262, 168], [300, 128], [325, 60], [345, -30]], 1.5);
  const CREEK = resample([[430, 334], [370, 352], [320, 372], [262, 390], [205, 402], [150, 420], [104, 458], [78, 520], [62, 590], [46, 660], [30, 730], [16, 800]], 1.5);
  const creekW = u => 8 + 8 * u + 26 * smooth(0.78, 1, u);
  const CANOPIES = [
    { seed: 11, d: [[-10, 20, 40], [30, -8, 32], [45, 40, 30], [8, 82, 38], [-15, 122, 30], [40, 98, 24]] },
    { seed: 12, d: [[175, 18, 34], [230, 8, 36], [275, 28, 26], [200, 60, 34], [252, 68, 30], [190, 108, 26], [226, 118, 22], [160, 74, 22]] },
    { seed: 13, d: [[398, 20, 34], [386, -6, 28], [402, 80, 30], [382, 130, 24]] },
    { seed: 14, d: [[10, 190, 34], [55, 215, 30], [-5, 252, 36], [40, 272, 34], [72, 302, 26], [0, 322, 34], [45, 346, 32], [14, 396, 32], [60, 390, 24]] },
    { seed: 15, d: [[350, 180, 30], [392, 200, 34], [330, 226, 28], [376, 252, 36], [340, 282, 30], [396, 300, 30], [356, 328, 28], [322, 318, 20]] },
    { seed: 17, d: [[300, 424, 13], [314, 436, 10], [292, 438, 9]] },
    { seed: 18, d: [[98, 540, 11], [110, 548, 8]] },
    { seed: 16, d: [[372, 430, 30], [398, 462, 32], [350, 472, 24], [386, 506, 26]] },
  ];
  const HUT = [330, 652], HS = 1.15, PAD = N[1];
  const PALMS = [{ b: [100, 702], c: [124, 604], s: 1.05, seed: 3 }, { b: [374, 704], c: [394, 616], s: 1.1, seed: 4 }];
  const ROCKS = [[118, 750, 9, 6], [131, 756, 5, 3.6], [346, 744, 6, 4], [68, 566, 6, 4.2], [298, 548, 5, 3.4]];
  const CANOE = [262, 714, -0.1];

  // where the road crosses the creek
  function crossing() {
    let best = [1e9, 0, 0];
    ROAD_DONE.forEach((p, i) => CREEK.forEach(q => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best[0]) best = [d, i, q]; }));
    return best[1];
  }

  // ---------------- pass 1: ground ----------------
  function ground(ctx, W, H, S) {
    const M = (f, b) => D.makeMask(W, H, S, f, b);
    const land = c => { pathOf(c, [...COAST, [420, -40], [-30, -40]], true); c.fill(); };
    const grass = c => { pathOf(c, [...EDGE, [420, -40], [-30, -40]], true); c.fill(); };
    const creek = c => { ribbonPath(c, CREEK, creekW); c.fill(); };
    const road = c => { for (const [pts, w] of [[ROAD_DONE, 14], [ROAD_UP, 13], [ROAD_L, 12], [ROAD_R, 12]]) { ribbonPath(c, pts, u => w); c.fill(); } };
    const landB = M(land, 3), landF = M(land, 22), grassB = M(grass, 4), grassF = M(grass, 14);
    const creekB = M(creek, 1.5), creekF = M(creek, 6), roadB = M(road, 1.6), roadF = M(road, 7);
    const shadow = M(c => {
      c.fillStyle = '#fff';
      for (const cn of CANOPIES) D.canopyShadow(c, cn.d, 12, 16);
      c.beginPath(); c.ellipse(HUT[0] + 16, HUT[1] + 34, 52, 18, 0, 0, TAU); c.fill();                  // hut
      for (const p of PALMS) { c.beginPath(); c.ellipse(p.b[0] + 40, p.b[1] - 4, 26, 10, 0.1, 0, TAU); c.fill(); c.lineWidth = 5; c.beginPath(); c.moveTo(p.b[0], p.b[1]); c.lineTo(p.b[0] + 40, p.b[1] - 4); c.stroke(); }
      c.beginPath(); c.ellipse(CANOE[0] + 4, CANOE[1] + 5, 26, 6, CANOE[2], 0, TAU); c.fill();
    }, 7);
    const img = ctx.createImageData(W, H), px = img.data;
    const L = PAL;
    for (let y = 0; y < H; y++) {
      const cy = y / S;
      for (let x = 0; x < W; x++) {
        const cx = x / S, i = y * W + x, g1 = hash(x, y, 1), g2 = hash(x, y, 2);
        const tone = fbm(cx / 46, cy / 46, 1, 4), rag = fbm(cx / 6, cy / 6, 3, 3);
        // --- sea
        const depth = landF[i];
        const warp = fbm(cx / 60, cy / 60, 5, 3);
        const rn = vnoise(cx / 15 + warp * 4, cy / 2.6 + warp * 2, 7) * 0.7 + vnoise(cx / 5, cy / 1.4, 8) * 0.3;
        let c = ramp(L.sea, 0.12 + Math.pow(depth, 1.25) * 0.9 + (tone - 0.5) * 0.14);
        const crest = smooth(0.6, 0.8, rn), trough = smooth(0.38, 0.18, rn);
        c = mix(c, mix(L.sea[3], [170, 170, 150], 0.3), crest * 0.3); c = mix(c, L.sea[0], trough * 0.25);
        const warmG = crest * smooth(0.7, 0.95, vnoise(cx / 30, cy / 6, 9)) * (0.6 + 0.4 * depth);
        c = mix(c, [236, 176, 120], warmG * 0.45);
        // surf: a foam line on the beach edge and a broken breaker line further out
        const lb = landB[i];
        const fe = lb + (fbm(cx / 4, cy / 2.2, 10, 3) - 0.5) * 0.32;
        const foam1 = smooth(0.22, 0.42, fe) * (1 - smooth(0.46, 0.52, fe)) * (0.6 + 0.4 * smooth(0.3, 0.6, vnoise(cx / 3, cy / 1.5, 21)));
        const fo = landF[i] + (fbm(cx / 7, cy / 2, 12, 3) - 0.5) * 0.16;
        const foam2 = smooth(0.43, 0.47, fo) * (1 - smooth(0.49, 0.54, fo)) * smooth(0.35, 0.6, vnoise(cx / 18, cy / 9, 13));
        c = mix(c, L.foam, clamp(foam1 * 0.85 + foam2 * 0.55) * (0.75 + 0.25 * g1));
        // --- sand
        const wLand = smooth(0.48, 0.53, lb + (rag - 0.5) * 0.12);
        if (wLand > 0) {
          let sd = ramp(L.sand, 0.5 + (tone - 0.5) * 0.7);
          const rp = Math.sin((cx * 0.42 + cy * 0.9) * 0.62 + fbm(cx / 26, cy / 26, 9, 3) * 10);
          sd = mix(sd, rp > 0 ? L.sand[2] : L.sand[0], Math.pow(Math.abs(rp), 1.5) * 0.24 * (0.4 + tone));
          const wet = 1 - smooth(0.6, 0.86, lb + (rag - 0.5) * 0.1);
          sd = mix(sd, L.wetSand, wet * 0.8);
          sd = mix(sd, [200, 150, 110], wet * smooth(0.6, 0.9, vnoise(cx / 20, cy / 4, 14)) * 0.25); // wet sheen catches the dusk
          const gr = (g1 - 0.5) * 22 + (g2 > 0.992 ? -40 : 0) + (g2 < 0.006 ? 30 : 0);
          sd = [sd[0] + gr, sd[1] + gr * 0.9, sd[2] + gr * 0.8];
          c = mix(c, sd, wLand);
        }
        // --- grass
        const wGrass = smooth(0.46, 0.56, grassB[i] + (rag - 0.5) * 0.55 + (vnoise(cx / 2, cy / 2, 4) - 0.5) * 0.12);
        if (wGrass > 0) {
          const ang = 0.55 + (fbm(cx / 120, cy / 120, 13, 2) - 0.5) * 0.7, ca = Math.cos(ang), sa = Math.sin(ang);
          const u = cx * ca + cy * sa, v = -cx * sa + cy * ca;
          const st = vnoise(u * 0.22, v * 0.9, 15) * 0.6 + vnoise(u * 0.5, v * 2.1, 16) * 0.4;
          const clump = fbm(cx / 10, cy / 10, 17, 2);
          let gc = ramp(L.grass, clamp(0.38 + (tone - 0.5) * 1.1 + (st - 0.5) * 0.3 + (clump - 0.5) * 0.35));
          const dry = 1 - smooth(0.5, 0.85, grassF[i]);
          gc = mix(gc, [112, 104, 70], dry * 0.5);
          if (st > 0.74) gc = mix(gc, L.grass[3], (st - 0.74) * 0.8);
          const gr = (g1 - 0.5) * 12; gc = [gc[0] + gr, gc[1] + gr, gc[2] + gr * 0.8];
          c = mix(c, gc, wGrass);
        }
        // --- road (packed earth, worn lighter in the middle, pebbles, darker trampled edges)
        const rb = roadB[i], wRoad = smooth(0.42, 0.6, rb + (rag - 0.5) * 0.5);
        const rEdge = smooth(0.05, 0.4, roadF[i]) * (1 - wRoad);
        c = mix(c, mix(c, [34, 30, 24], 0.6), rEdge * 0.35);
        if (wRoad > 0) {
          const core = smooth(0.55, 0.9, roadF[i]);
          let rc = ramp(L.road, clamp(0.3 + core * 0.4 + (fbm(cx / 12, cy / 12, 18, 3) - 0.5) * 0.55));
          const pb = vnoise(cx / 1.3, cy / 1.3, 19), pbl = vnoise((cx - 0.35) / 1.3, (cy - 0.45) / 1.3, 19);
          if (pb > 0.74) rc = mix(rc, L.road[2], (pb - 0.74) * 2.6);
          else if (pbl > 0.74) rc = mix(rc, [70, 52, 38], (pbl - 0.74) * 2.2);
          const gr = (g2 - 0.5) * 20; rc = [rc[0] + gr, rc[1] + gr * 0.85, rc[2] + gr * 0.7];
          c = mix(c, rc, wRoad);
        }
        // --- creek (with a dark wet bank)
        const cb = creekB[i], bank = smooth(0.05, 0.45, creekF[i]) * (1 - smooth(0.45, 0.55, cb));
        c = mix(c, [44, 46, 38], bank * 0.55 * smooth(0.5, 0.6, lb));
        const wCreek = smooth(0.46, 0.56, cb + (rag - 0.5) * 0.25) * smooth(0.4, 0.55, lb);
        if (wCreek > 0) {
          const fl = vnoise(cx / 3 + cy / 9, cy / 3 - cx / 9, 20);
          let wc = ramp(L.creek, 0.25 + smooth(0.5, 1, creekF[i]) * 0.5 + (fl - 0.5) * 0.4);
          if (fl > 0.76) wc = mix(wc, [220, 190, 140], (fl - 0.76) * 2);
          c = mix(c, wc, wCreek);
        }
        // --- light: cast shadows (cool), warm sun from the upper left, more on open ground
        const sh = shadow[i] * smooth(0.45, 0.52, lb + 0.04);
        c = [c[0] * (1 - sh * 0.58), c[1] * (1 - sh * 0.5), c[2] * (1 - sh * 0.4)];
        const sun = clamp(1.05 - cx / 520 - cy / 1300) * (1 - sh * 0.9) * wLand;
        c = [c[0] + 34 * sun, c[1] + 16 * sun, c[2] - 2 * sun];
        const o = i * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // a sea stack with a painted foam ring round its foot
  function seaRock(ctx, x, y) {
    const R = rand(8);
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(214,214,188,${0.5 - k * 0.14})`; ctx.lineWidth = 1.2 - k * 0.3; ctx.setLineDash([3 + k * 2, 2 + k * 2]); ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 22 + k * 7, 9 + k * 3.5, 0, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    blob(ctx, x + 3, y + 4, 22, 8, 0.45, [6, 20, 28]);
    D.mossRock(ctx, x, y - 2, 16, 10, 81); D.mossRock(ctx, x + 14, y + 3, 7, 5, 82);
    for (let k = 0; k < 40; k++) { const a = R() * TAU; ctx.fillStyle = 'rgba(220,220,196,.6)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (17 + R() * 4), y + 4 + Math.sin(a) * (6 + R() * 2), 0.5 + R() * 0.7, 0, TAU); ctx.fill(); }
  }

  // ---------------- pass 2: props ----------------
  function props(ctx, S, pilot) {
    // grass brush pass: short translucent painter's strokes laid diagonally, tone from the ground under them
    const RB = rand(55);
    for (let k = 0; k < 9000; k++) {
      const x = RB() * SW, y = RB() * 600; const e = EDGE.reduce((b, p) => Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b); if (y > e[1] - 3) continue;
      const lit = clamp(1 - x / 520 - y / 1400), t = clamp(0.2 + 0.55 * fbm(x / 46, y / 46, 1, 3) + (RB() - 0.5) * 0.5 + lit * 0.15);
      const a = 0.55 + (RB() - 0.5) * 0.6 + Math.PI / 2, l = 2 + RB() * 4.5;
      ctx.strokeStyle = rgb(ramp(PAL.grass, t), 0.16 + RB() * 0.2); ctx.lineWidth = 0.9 + RB() * 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    // sea brush pass: short, slightly curved horizontal ripple strokes, lighter on crests, warm where they catch the dusk
    const RS = rand(66), coastY = x => COAST.reduce((b, p) => Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b)[1];
    for (let k = 0; k < 2600; k++) {
      const x = RS() * SW, y = RS() * 150 + 694, cy = coastY(x); if (y < cy + 6) continue;
      const far = clamp((y - cy) / 120), l = 3 + RS() * 7 + far * 4, warm = vnoise(x / 40, y / 10, 9) > 0.62 && RS() < 0.5;
      ctx.strokeStyle = warm ? `rgba(230,170,118,${0.12 + RS() * 0.18})` : RS() < 0.6 ? `rgba(120,170,160,${0.08 + RS() * 0.14})` : `rgba(8,26,36,${0.12 + RS() * 0.16})`;
      ctx.lineWidth = 0.5 + RS() * 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - l / 2, y); ctx.quadraticCurveTo(x, y - 0.8 - RS(), x + l / 2, y); ctx.stroke();
    }
    // ground brush strokes: a few grass tufts on the grass near the sand edge and road verges
    const R = rand(77);
    for (let k = 0; k < 900; k++) {
      const x = R() * SW, y = R() * 560;
      const e = EDGE.reduce((b, p) => Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b);
      if (y > e[1] - 4) continue;
      const nearRoad = [ROAD_DONE, ROAD_UP, ROAD_L, ROAD_R].some(r => r.some(p => Math.hypot(p[0] - x, p[1] - y) < 8.5));
      if (nearRoad) continue;
      const near = Math.min(...[ROAD_DONE, ROAD_UP, ROAD_L, ROAD_R].map(r => Math.min(...r.map(p => Math.hypot(p[0] - x, p[1] - y)))));
      if (near > 22 && e[1] - y > 30 && R() < 0.7) continue;
      const n = 3 + (R() * 4 | 0), lit = clamp(1 - x / 500 - y / 1500 + (R() - 0.5) * 0.3);
      for (let j = 0; j < n; j++) {
        const a = -Math.PI / 2 + (R() - 0.5) * 1.3, l = 2.5 + R() * 3.5;
        ctx.strokeStyle = rgb(ramp(PAL.grass, 0.35 + 0.6 * lit * R()), 0.75); ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
        if (lit > 0.6 && j === 0) { ctx.strokeStyle = rgb(PAL.rim, 0.35); ctx.lineWidth = 0.4; ctx.stroke(); }
      }
    }
    // road-side stones
    for (const pts of [ROAD_DONE, ROAD_UP, ROAD_L, ROAD_R]) for (let i = 6; i < pts.length - 4; i += 17) {
      const p = pts[i], n = D.normalAt(pts, i), side = (i / 17 | 0) % 2 ? 1 : -1, r = 1.6 + hash(i, pts.length, 5) * 1.4;
      if (hash(i, 3, 9) < 0.35) continue;
      const x = p[0] + n[0] * side * 8.6, y = p[1] + n[1] * side * 8.6;
      blob(ctx, x + 1, y + 1.2, r * 1.5, r, 0.5); D.stone(ctx, x, y, r * 1.3, r, i * 7 + pts.length);
    }
    // bridge over the creek
    const ci = crossing(), a = ROAD_DONE[ci - 13], b = ROAD_DONE[ci + 13];
    D.bridge(ctx, a, b, 17, 1, 41);
    // rocks, canoe
    for (const [x, y, rx, ry] of ROCKS) { blob(ctx, x + 2, y + 2, rx * 1.4, ry * 1.2, 0.45); D.stone(ctx, x, y, rx, ry, x * 7 + y); }
    D.canoe(ctx, CANOE[0], CANOE[1], 1, CANOE[2], 5);
    // a few hero props on the open grass, and a sea stack in the surf
    D.mossRock(ctx, 132, 252, 9, 6.5, 71); D.mossRock(ctx, 143, 259, 5.5, 4, 72);
    D.mossRock(ctx, 286, 498, 7, 5, 73);
    D.log(ctx, 186, 300, 26, 3.6, 0.35, 74);
    seaRock(ctx, 318, 800);
    // the launch pad
    D.launchPad(ctx, PAD[0], PAD[1] + 3, 1.25, 21);
    // palm on the left of the beach
    D.palm(ctx, PALMS[0].b[0], PALMS[0].b[1], PALMS[0].c[0], PALMS[0].c[1], PALMS[0].s, PALMS[0].seed);
    // canopy masses, back to front
    for (const cn of [...CANOPIES].sort((p, q) => Math.max(...p.d.map(d => d[1] + d[2])) - Math.max(...q.d.map(d => d[1] + d[2])))) D.canopy(ctx, cn.d, cn.seed);
    // hut, then the right palm framing it
    const h = D.hut(ctx, HUT[0], HUT[1], HS, 31);
    D.palm(ctx, PALMS[1].b[0], PALMS[1].b[1], PALMS[1].c[0], PALMS[1].c[1], PALMS[1].s, PALMS[1].seed);
    // signpost at the fork
    D.signpost(ctx, 226, 178, 1, [{ text: 'TEMPLE', dir: -1 }, { text: 'BOG', dir: 1 }], 61);
    return { hut: h, bridge: [a, b] };
  }

  // ---------------- pass 3: air (shafts, haze, grade, vignette) ----------------
  const BANDS = [[-300, 26, 0.9], [-200, 14, 0.6], [-95, 34, 1], [40, 18, 0.7], [150, 40, 0.85], [270, 16, 0.5]];
  function shaftAt(cx, cy) {
    const p = cx * 0.89 - cy * 0.46, t = cx * 0.46 + cy * 0.89;
    let s = 0; for (const [p0, w, k] of BANDS) { const d = (p - p0) / w; s += Math.exp(-d * d) * k; }
    return s * (0.55 + 0.45 * vnoise(p / 5, t / 160, 31)) * Math.exp(-t / 900);
  }
  function air(ctx, W, H, S) {
    const img = ctx.getImageData(0, 0, W, H), px = img.data;
    for (let y = 0; y < H; y++) {
      const cy = y / S;
      for (let x = 0; x < W; x++) {
        const cx = x / S, o = (y * W + x) * 4;
        let r = px[o], g = px[o + 1], b = px[o + 2];
        // grade: cool teal shadows, warm highlights, gently compressed
        const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
        r = r * 0.9 + 6 + 18 * lum * lum; g = g * 0.93 + 12 + 6 * lum * lum; b = b * 0.9 + 16 - 6 * lum;
        // haze: the far (top) part of the island sinks into a warm teal mist; a little everywhere
        const hz = 0.07 + 0.3 * smooth(300, -20, cy) * (0.7 + 0.3 * fbm(cx / 70, cy / 40, 41, 3));
        r = lerp(r, 96, hz); g = lerp(g, 118, hz); b = lerp(b, 108, hz);
        // dusk glow from the upper left
        const dl = Math.hypot(cx + 40, cy + 60), sg = Math.exp(-dl / 360) * 0.7;
        r += 70 * sg; g += 38 * sg; b += 10 * sg;
        // light shafts
        const sh = shaftAt(cx, cy) * 0.42;
        r += (255 - r) * sh; g += (206 - g) * sh * 0.9; b += (140 - b) * sh * 0.7;
        // vignette (deep teal, not black)
        const vx = (cx / SW - 0.5) * 2, vy = (cy / SH - 0.48) * 2, v = clamp((vx * vx * 0.8 + vy * vy * 0.7 - 0.25) * 0.55, 0, 0.55);
        r = lerp(r, 10, v); g = lerp(g, 24, v); b = lerp(b, 28, v);
        px[o] = r; px[o + 1] = g; px[o + 2] = b;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------------- pass 4: lights, fireflies, motes ----------------
  function lights(ctx, info) {
    // lit road: small glowing amber stones along the finished road (levels 1 to 3)
    for (let i = 10; i < ROAD_DONE.length - 12; i += 8) {
      const p = ROAD_DONE[i]; if (Math.hypot(p[0] - info.bridge[0][0], p[1] - info.bridge[0][1]) < 2 || (i > 0 && Math.abs(i - crossing()) < 14)) continue;
      glow(ctx, p[0], p[1], 7, [255, 170, 70], 0.28);
      ctx.fillStyle = D.rg(ctx, p[0], p[1], 1.9, [[0, [255, 246, 200]], [0.6, [255, 196, 90]], [1, [200, 110, 30]]], p[0] - 0.5, p[1] - 0.6);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, TAU); ctx.fill();
    }
    // the hut's lamp and door
    glow(ctx, info.hut.window[0], info.hut.window[1], 34, [255, 160, 70], 0.45); glow(ctx, info.hut.door[0], info.hut.door[1], 26, [255, 140, 60], 0.35);
    glow(ctx, info.hut.door[0] + 4, info.hut.door[1] + 46, 30, [255, 150, 70], 0.16); // spill onto the sand
    // torches: pad, bridge, fork
    const ci = crossing(), bA = ROAD_DONE[ci - 15], bB = ROAD_DONE[ci + 15];
    for (const [x, y, sd] of [[164, 662, 1], [238, 662, 2], [bA[0] - 12, bA[1] + 2, 3], [bB[0] + 12, bB[1] - 2, 4], [F[0] - 18, F[1] + 12, 5]]) D.torch(ctx, x, y, 1, sd);
    // pad's beacon
    glow(ctx, PAD[0], PAD[1], 58, [255, 150, 60], 0.22);
    // fireflies along the jungle edges and motes in the shafts
    const R = rand(909);
    for (let k = 0; k < 70; k++) {
      const cn = CANOPIES[(R() * CANOPIES.length) | 0], d = cn.d[(R() * cn.d.length) | 0], a = R() * TAU, rr = d[2] * (0.9 + R() * 0.6);
      const x = d[0] + Math.cos(a) * rr, y = d[1] + Math.sin(a) * rr; if (x < 4 || x > SW - 4 || y < 4) continue;
      const big = R() < 0.3;
      glow(ctx, x, y, big ? 9 : 5, [200, 255, 120], big ? 0.4 : 0.28);
      ctx.fillStyle = big ? 'rgba(250,255,200,.95)' : 'rgba(230,255,170,.8)'; ctx.beginPath(); ctx.arc(x, y, big ? 1.1 : 0.7, 0, TAU); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 900; k++) {
      const x = R() * SW, y = R() * SH, s = shaftAt(x, y); if (R() > s * 0.9) continue;
      ctx.fillStyle = `rgba(255,220,160,${0.25 + R() * 0.45})`; ctx.beginPath(); ctx.arc(x, y, 0.35 + R() * 0.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------- pass 5: nodes, pilot, marker ----------------
  function ui(ctx, pilot) {
    D.node(ctx, N[1][0], N[1][1] - 2, '1', { stars: 3 }, 1);
    D.node(ctx, N[2][0], N[2][1], '2', { stars: 3 }, 1);
    D.node(ctx, N[3][0], N[3][1], '3', { stars: 0, open: true }, 1);
    // the lemur pilot hovering over level 3 on its flame
    const [x, y] = N[3], w = 66;
    glow(ctx, x, y - 22, 34, [255, 190, 90], 0.35);
    if (pilot && pilot.width) ctx.drawImage(pilot, x - w / 2, y - 20 - w + 6, w, w);
    // "you are here": a dark plum pill like the game's banners, gold edge, cream text
    const t = 'YOU ARE HERE', py = y - 20 - w - 8;
    ctx.font = '9.5px "Lilita One", system-ui'; const tw = ctx.measureText(t).width + 16, ph = 16, x0 = x - tw / 2;
    blob(ctx, x + 1, py + 10, tw * 0.6, 8, 0.5);
    const pill = () => { ctx.beginPath(); ctx.roundRect(x0, py - ph / 2, tw, ph, ph / 2); };
    pill(); ctx.fillStyle = D.lg(ctx, 0, py - ph / 2, 0, py + ph / 2, [[0, [92, 52, 58]], [1, [44, 24, 34]]]); ctx.fill();
    ctx.lineWidth = 1.1; ctx.strokeStyle = D.lg(ctx, 0, py - ph / 2, 0, py + ph / 2, [[0, [255, 222, 140]], [1, [190, 120, 40]]]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, py + ph / 2 - 0.5); ctx.lineTo(x, py + ph / 2 + 4.5); ctx.lineTo(x + 4, py + ph / 2 - 0.5); ctx.closePath(); ctx.fillStyle = 'rgb(48,26,36)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(20,8,14,.7)'; ctx.fillText(t, x, py + 1.6);
    ctx.fillStyle = 'rgb(255,236,190)'; ctx.fillText(t, x, py + 0.8);
  }

  // ---------------- pass 6: grain ----------------
  function grain(ctx, W, H) {
    const img = ctx.getImageData(0, 0, W, H), px = img.data;
    for (let i = 0; i < W * H; i++) { const n = (hash(i % W, (i / W) | 0, 99) - 0.5) * 9, o = i * 4; px[o] += n; px[o + 1] += n; px[o + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }

  function drawScene(ctx, S, pilot) {
    const W = SW * S, H = SH * S;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ground(ctx, W, H, S);
    ctx.setTransform(S, 0, 0, S, 0, 0); const info = props(ctx, S, pilot);
    ctx.setTransform(1, 0, 0, 1, 0, 0); air(ctx, W, H, S);
    ctx.setTransform(S, 0, 0, S, 0, 0); lights(ctx, info); ui(ctx, pilot);
    ctx.setTransform(1, 0, 0, 1, 0, 0); grain(ctx, W, H);
  }
  window.DUSK_SCENE = { drawScene, SW, SH };
})();
