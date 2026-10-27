// Coconut Island, beach start, in "soft gouache": calm daytime painting, few props each painted with care.
// Reusable painters: sea, sand, grass, canopy, creek, road, bridge, palm, rock, hut, pad, plinth, node, sign.
// Layout is in phone CSS px (390x844); the whole island (1640x2480) could be painted by the same functions.
(() => {
  const A = window.PAINT, { TAU, rand, fbm, vnoise, css, mix, deep, lite, jit, pick, clamp, smooth, spline, resample, normals, wobble, ribbon, ellipsePts, path, bbox, distTo, pixelFill, brush, strokes, blotches, dryEdge, softShadow, glow } = A;

  // ---------------- palette: gently desaturated, sits beside the game's muted greens, teal, gold ----------------
  const C = {
    seaDeep: [50, 98, 120], seaMid: [66, 128, 140], seaShallow: [122, 178, 170], seaPale: [168, 206, 192], foam: [238, 240, 228],
    sand: [222, 204, 164], sandLight: [238, 226, 192], sandDark: [192, 170, 130], wet: [172, 156, 124],
    grass: [112, 146, 94], grassLight: [152, 174, 110], grassDark: [76, 112, 80], grassWarm: [160, 166, 100],
    jDeep: [38, 66, 64], jMid: [56, 94, 76], jLight: [96, 132, 86], jRim: [190, 204, 128],
    earth: [212, 188, 146], earthLight: [234, 216, 178], earthDark: [150, 122, 90],
    water: [92, 146, 150], waterLight: [156, 198, 188],
    rock: [138, 132, 124], rockLight: [178, 170, 156], rockDark: [88, 88, 96], moss: [118, 140, 88],
    wood: [146, 102, 70], woodLight: [192, 148, 102], woodDark: [98, 68, 54],
    cane: [196, 170, 114], straw: [204, 170, 106], strawLight: [230, 202, 142], strawDark: [146, 112, 72],
    gold: [244, 190, 70], goldLight: [255, 236, 150], goldDark: [178, 112, 34], goldDeep: [128, 72, 26],
    haze: [200, 216, 212], warm: [255, 220, 150], ember: [255, 150, 60],
  };

  // ---------------- layout ----------------
  const COAST = spline([[-20, 744], [40, 754], [100, 750], [160, 740], [220, 742], [280, 754], [340, 746], [410, 730]], 10);
  const EDGE = spline([[-20, 610], [30, 620], [70, 642], [118, 656], [168, 654], [212, 646], [252, 634], [292, 616], [336, 600], [410, 584]], 10);
  const yOn = (line, x) => { for (let i = 1; i < line.length; i++) if (line[i][0] >= x) { const a = line[i - 1], b = line[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; } return line[line.length - 1][1]; };
  const N = { 1: [222, 610], 2: [150, 478], 3: [112, 330] };
  const bez = (p0, p1, p2, p3, n = 40) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([0, 1].map(j => u * u * u * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t * t * t * p3[j])); } return o; };
  const ROADS = [
    { line: bez(N[1], [196, 580], [168, 520], N[2]), done: true, seed: 3 },
    { line: bez(N[2], [178, 430], [100, 392], N[3]), done: true, seed: 4 },
    { line: bez(N[3], [80, 290], [44, 226], [-24, 180]), done: false, seed: 5 },
    { line: bez(N[3], [158, 296], [214, 190], [234, -24]), done: false, seed: 6 },
  ];
  const CREEK = spline([[410, 226], [352, 254], [300, 286], [248, 318], [196, 352], [154, 386], [124, 420], [102, 470], [86, 530], [72, 590], [60, 636], [50, 670], [58, 704], [50, 734], [54, 758]], 8);
  const creekW = (x, y) => y < 630 ? 9 + clamp((y - 230) / 400) * 6 : 15 + Math.pow(clamp((y - 630) / 125), 1.5) * 22;
  const JUNGLE_L = spline([[-30, -20], [62, -20], [70, 40], [52, 96], [40, 130], [60, 176], [48, 224], [30, 268], [26, 320], [38, 380], [46, 430], [32, 488], [18, 540], [-4, 572], [-30, 580]], 6, true);
  const JUNGLE_R = spline([[290, -20], [420, -20], [420, 560], [398, 540], [378, 500], [356, 440], [344, 380], [338, 322], [322, 262], [302, 210], [312, 150], [330, 96], [304, 40]], 6, true);
  const JUNGLE_T = spline([[112, -20], [206, -20], [204, 18], [184, 50], [150, 58], [120, 40]], 6, true);
  const HUT = [320, 662];

  const hazeAt = y => 0.58 * smooth(clamp((540 - y) / 540));
  const hz = (c, y, k = 1) => mix(c, C.haze, hazeAt(y) * k);

  // ---------------- sea ----------------
  function sea(ctx) {
    const poly = [...COAST, [410, 860], [-20, 860]];
    pixelFill(ctx, poly, (x, y) => {
      const d = y - yOn(COAST, x), t = clamp(d / 90), n = fbm(x / 40, y / 16, 31), m = fbm(x / 9, y / 5, 32);
      let c = t < 0.25 ? mix(C.seaPale, C.seaShallow, t / 0.25) : mix(C.seaShallow, mix(C.seaMid, C.seaDeep, (t - 0.25) / 0.75), smooth((t - 0.25) / 0.75));
      c = mix(c, C.seaDeep, (n - 0.5) * 0.5 + 0.08); return mix(c, C.seaPale, Math.max(0, m - 0.62) * 0.6);
    });
    // horizontal painted ripples
    strokes(ctx, poly, { density: 0.16, seed: 41, len: [8, 22], w: [1.2, 3.2], alpha: [0.18, 0.4], bend: 0.12, dry: 0.35,
      flow: (x, y, r) => Math.sin(x / 70) * 0.06 + (r() - 0.5) * 0.08,
      colorAt: (x, y, r) => { const d = clamp((y - yOn(COAST, x)) / 90); return r() < 0.5 ? mix(C.seaPale, C.seaMid, d) : deep(mix(C.seaShallow, C.seaDeep, d), 0.2); } });
    // sun glints
    strokes(ctx, poly, { count: 140, seed: 42, len: [3, 9], w: [0.6, 1.3], alpha: [0.35, 0.75], flow: () => 0, colorAt: (x, y, r) => y > yOn(COAST, x) + 26 ? C.foam : null, hairs: 3 });
    // waves: broken foam lines parallel to the shore
    [[10, 0.5, 2.0], [26, 0.34, 1.6], [48, 0.22, 1.3], [74, 0.14, 1.1]].forEach(([off, a, w], k) => {
      const line = wobble(COAST.map(p => [p[0], p[1] + off]), 2.4, 0.03, 50 + k, false), r = rand(60 + k);
      const pts = resample(line, 2.2), Nn = normals(pts, false);
      pts.forEach((p, i) => { if (fbm(p[0] / 30, k, 70 + k) < 0.42) return; brush(ctx, p[0], p[1] + (r() - 0.5) * 1.5, Math.atan2(-Nn[i][0], Nn[i][1]) + (r() - 0.5) * 0.2, 6 + r() * 6, w * (0.6 + r() * 0.6), C.foam, a, r, { dry: 0.5, bend: 0.1 }); });
      // the trough just shoreward of each wave is a touch darker
      const r2 = rand(80 + k);
      pts.forEach((p, i) => { if (i % 2) return; brush(ctx, p[0], p[1] - 3, (r2() - 0.5) * 0.15, 8, 2.2, deep(C.seaShallow, 0.18), a * 0.4, r2, { dry: 0.4 }); });
    });
  }

  // ---------------- sand ----------------
  function sand(ctx) {
    const poly = [...EDGE, ...COAST.slice().reverse()].map(p => [p[0], p[1]]);
    const P2 = [...EDGE, [410, 760], ...COAST.slice().reverse(), [-20, 620]];
    pixelFill(ctx, P2, (x, y) => {
      const n = fbm(x / 50, y / 30, 11), g = A.hash(Math.floor(x * 3), Math.floor(y * 3), 4), wet = clamp((y - (yOn(COAST, x) - 18)) / 18);
      let c = mix(C.sandDark, C.sandLight, smooth(n * 1.3 - 0.1)); c = mix(c, C.sand, 0.4);
      c = mix(c, C.wet, smooth(wet) * 0.85);
      const s = (g - 0.5) * 22; return [c[0] + s, c[1] + s, c[2] + s * 0.8];
    });
    // ripples: long thin strokes following the shoreline
    strokes(ctx, P2, { density: 0.06, seed: 12, len: [10, 26], w: [0.6, 1.4], alpha: [0.18, 0.4], bend: 0.3, dry: 0.4, hairs: 3,
      flow: (x) => Math.atan2(yOn(COAST, x + 4) - yOn(COAST, x - 4), 8) * 0.7,
      colorAt: (x, y, r) => r() < 0.55 ? C.sandLight : deep(C.sandDark, 0.12) });
    blotches(ctx, P2, 26, [C.sandLight, C.sandDark, C.warm], [14, 40], 0.12, 13);
    // wet sand sheen: soft reflective streaks just above the waterline
    strokes(ctx, P2, { count: 220, seed: 14, len: [6, 16], w: [0.8, 2], alpha: [0.25, 0.5], flow: () => 0.03,
      colorAt: (x, y, r) => { const d = yOn(COAST, x) - y; return d > 0 && d < 14 ? (r() < 0.6 ? lite(C.wet, 0.5, C.seaPale) : deep(C.wet, 0.15)) : null; } });
    // swash: the thin lacy edge of the last wave
    const sw = wobble(COAST.map(p => [p[0], p[1] - 1]), 1.6, 0.05, 15, false), r = rand(16);
    resample(sw, 1.6).forEach(p => brush(ctx, p[0], p[1], (r() - 0.5) * 0.3, 4 + r() * 5, 1 + r() * 1.4, C.foam, 0.75, r, { dry: 0.5 }));
    // a few shells / pebbles
    const r3 = rand(17);
    for (let i = 0; i < 14; i++) { const x = 20 + r3() * 360, y0 = yOn(EDGE, x) + 14, y1 = yOn(COAST, x) - 14; if (y1 <= y0) continue; const y = y0 + r3() * (y1 - y0); if (Math.abs(x - HUT[0]) < 56 && y < 712) continue; if (Math.abs(x - 50) < 26) continue;
      ctx.fillStyle = css(deep(C.sandDark, 0.25), 0.5); ctx.beginPath(); ctx.ellipse(x + 0.6, y + 0.6, 1.4, 0.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = css(pick([C.sandLight, [236, 214, 200], [214, 196, 176]], r3), 0.95); ctx.beginPath(); ctx.ellipse(x, y, 1.3, 0.85, r3(), 0, TAU); ctx.fill(); }
  }

  // ---------------- grass ----------------
  function grassColor(x, y) {
    const n1 = fbm(x / 70, y / 60, 1), n2 = fbm(x / 16, y / 13, 2), n3 = fbm(x / 140, y / 140, 3);
    let c = mix(C.grassDark, C.grass, smooth(clamp(n1 * 1.5 - 0.2)));
    c = mix(c, C.grassLight, clamp((n2 - 0.52) * 2.4) * 0.55);
    c = mix(c, C.grassWarm, clamp((n3 - 0.55) * 3) * 0.4);
    return hz(c, y, 0.35);
  }
  function grass(ctx) {
    const land = [[-20, -20], [410, -20], ...EDGE.slice().reverse()];
    const edgeLand = [[-20, -20], [410, -20], ...wobble(EDGE.slice().reverse(), 2, 0.12, 5, false)];
    pixelFill(ctx, edgeLand, grassColor);
    blotches(ctx, land, 30, [C.grassLight, C.grassDark, C.grassWarm, C.grassDark], [30, 90], 0.22, 21);
    // two broad cloud shadows drifting over the island (very soft)
    ctx.save(); path(ctx, land); ctx.clip(); ctx.filter = 'blur(14px)';
    [[300, 470, 70, 34], [60, 140, 80, 40]].forEach(([x, y, rx, ry]) => { ctx.fillStyle = css(A.SHADOW, 0.1); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.2, 0, TAU); ctx.fill(); });
    ctx.filter = 'none'; ctx.restore();
    // grass strokes: short, mostly upright, slightly fanned
    strokes(ctx, land, { density: 0.22, seed: 22, len: [3.5, 9], w: [1.4, 3], alpha: [0.25, 0.55], bend: 0.5, dry: 0.3,
      flow: (x, y, r) => -Math.PI / 2 + (fbm(x / 30, y / 30, 23) - 0.5) * 1.6 + (r() - 0.5) * 0.5,
      colorAt: (x, y, r) => { const b = grassColor(x, y), k = r(); return k < 0.4 ? lite(b, 0.14 + r() * 0.12, [226, 236, 170]) : k < 0.8 ? deep(b, 0.08 + r() * 0.14) : jit(b, 18, r); } });
    // fine light blades (sparse), brighter near the beach where the sun is strongest
    strokes(ctx, land, { density: 0.05, seed: 24, len: [2.5, 5], w: [0.5, 1], alpha: [0.35, 0.7], hairs: 2,
      flow: (x, y, r) => -Math.PI / 2 + (r() - 0.5) * 0.9, colorAt: (x, y) => hz(mix([206, 220, 150], C.grassLight, 0.3), y, 0.6) });
    // ragged grass edge spilling onto the sand
    dryEdge(ctx, EDGE, (x, y, r) => jit(r() < 0.5 ? C.grassDark : C.grass, 14, r), { closed: false, step: 1.3, spread: 4, len: [3, 6], w: [0.9, 2], alpha: 0.75, seed: 25, bias: 0.3 });
    // a bank shadow along the top of the sand
    ctx.save(); ctx.filter = 'blur(2px)'; ctx.strokeStyle = css(deep(C.sandDark, 0.4), 0.32); ctx.lineWidth = 3; path(ctx, EDGE.map(p => [p[0] + 1, p[1] + 3]), false); ctx.stroke(); ctx.restore();
    // a handful of tufts and very few muted flowers
    const r = rand(26);
    for (let i = 0; i < 26; i++) { const x = r() * 390, y = 80 + r() * 540; if (y > yOn(EDGE, x) - 8) continue; tuft(ctx, x, y, 0.8 + r() * 0.6, r); }
    for (let i = 0; i < 12; i++) { const x = 60 + r() * 300, y = 360 + r() * 260; if (y > yOn(EDGE, x) - 10) continue; const c = pick([[236, 176, 180], [240, 222, 150], [236, 232, 220]], r); for (let k = 0; k < 3; k++) { ctx.fillStyle = css(c, 0.85); ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 5, y + (r() - 0.5) * 3, 0.9, 0, TAU); ctx.fill(); } }
  }
  function tuft(ctx, x, y, s, r) {
    softShadow(ctx, x + 2 * s, y + 1, 6 * s, 2 * s, 0.22);
    const b = grassColor(x, y);
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k / 6 - 0.5) * 1.5 + (r() - 0.5) * 0.2, L = (5 + r() * 4) * s; brush(ctx, x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2, a, L, 1.3 * s, k % 2 ? deep(b, 0.2) : lite(b, 0.2, [220, 232, 160]), 0.75, r, { hairs: 3, dry: 0.2 }); }
  }

  // ---------------- jungle canopy masses (receding into haze at the top) ----------------
  function canopy(ctx, poly, seed, o = {}) {
    const r = rand(seed), [x0, y0, x1, y1] = bbox(poly);
    // soft cast shadow on the grass
    ctx.save(); ctx.filter = 'blur(7px)'; ctx.fillStyle = css(A.SHADOW, 0.32); path(ctx, poly.map(p => [p[0] + 7, p[1] + 9])); ctx.fill(); ctx.restore();
    pixelFill(ctx, poly, (x, y) => hz(mix(C.jDeep, C.jMid, fbm(x / 20, y / 20, seed) * 0.8), y, 0.8));
    // clumps, back to front
    const cl = [];
    for (let y = y0 - 10; y < y1 + 10; y += 13) for (let x = x0 - 10; x < x1 + 10; x += 15) {
      const cx = x + (r() - 0.5) * 12, cy = y + (r() - 0.5) * 10; if (!A.inside(poly, cx, cy)) continue; cl.push([cx, cy, 11 + r() * 9]);
    }
    cl.sort((a, b) => a[1] - b[1]);
    for (const [cx, cy, R] of cl) clump(ctx, cx, cy, R, r, o);
    // broad glazes across the mass so the clumps read as one painted shape, not a pattern
    blotches(ctx, poly.map(p => p), 10, [C.jDeep, C.jLight, A.SHADOW], [30, 70], 0.18, seed + 5);
    // a few palm fronds poking out of the edge
    (o.fronds || []).forEach(([fx, fy, ang, L]) => frond(ctx, fx, fy, ang, L, hz(C.jMid, fy, 0.8), hz(C.jLight, fy, 0.8), r));
  }
  function clump(ctx, cx, cy, R, r, o) {
    const shape = wobble(ellipsePts(cx, cy, R, R * 0.86, 40), R * 0.14, 0.25, (r() * 1e4) | 0);
    const mid = hz(mix(C.jMid, C.jDeep, r() * 0.4), cy, 0.85), lit = hz(mix(C.jLight, C.grassLight, r() * 0.3), cy, 0.85), dk = hz(deep(C.jDeep, 0.2), cy, 0.7);
    ctx.save(); ctx.filter = 'blur(2.5px)'; ctx.fillStyle = css(A.SHADOW, 0.25); path(ctx, shape.map(p => [p[0] + 3, p[1] + 4])); ctx.fill(); ctx.restore();
    ctx.fillStyle = css(mid); path(ctx, shape); ctx.fill();
    strokes(ctx, shape, { count: Math.round(R * R * 0.5), seed: (r() * 1e6) | 0, len: [3, 7], w: [1.2, 2.6], alpha: [0.35, 0.7], bend: 0.6, dry: 0.3,
      flow: (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + 0.4,
      colorAt: (x, y, rr) => { const t = ((x - cx) * -0.7 + (y - cy) * -0.7) / R; return t > 0.15 ? (rr() < 0.7 ? lit : mid) : t < -0.3 ? dk : (rr() < 0.5 ? mid : lit); } });
    // rim of light on the sun side, painted as fine dry strokes
    const rim = shape.filter(p => (p[0] - cx) * -0.7 + (p[1] - cy) * -0.7 > R * 0.45);
    if (rim.length > 3) dryEdge(ctx, rim, hz(C.jRim, cy, 0.6), { closed: false, step: 2.2, spread: 2.5, len: [2, 4.5], w: [0.5, 1.1], alpha: 0.55, seed: (r() * 1e4) | 0, bias: 0.8 });
  }
  function frond(ctx, x, y, ang, L, c1, c2, r) {
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, droop = t * t * L * 0.35; pts.push([x + Math.cos(ang) * t * L, y + Math.sin(ang) * t * L + droop]); }
    ctx.strokeStyle = css(deep(c1, 0.2), 0.9); ctx.lineWidth = 1; path(ctx, pts, false); ctx.stroke();
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length, p = pts[i], q = pts[i - 1], a = Math.atan2(p[1] - q[1], p[0] - q[0]), Ll = L * 0.32 * Math.sin(Math.PI * (0.15 + t * 0.85));
      for (const s of [-1, 1]) {
        const la = a + s * (0.9 + 0.35 * (1 - t)), tx = p[0] + Math.cos(la) * Ll, ty = p[1] + Math.sin(la) * Ll + Ll * 0.25, lw = Ll * 0.16, col = s < 0 ? c2 : c1;
        const nx = -Math.sin(la) * lw, ny = Math.cos(la) * lw, mx = (p[0] + tx) / 2, my = (p[1] + ty) / 2 - Ll * 0.06;
        ctx.fillStyle = css(jit(col, 10, r)); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty); ctx.quadraticCurveTo(mx - nx, my - ny, p[0], p[1]); ctx.fill();
        brush(ctx, mx - nx * 0.3, my - ny * 0.3, Math.atan2(ty - p[1], tx - p[0]), Ll * 0.8, lw * 0.9, s < 0 ? lite(col, 0.25, [230, 236, 170]) : deep(col, 0.15), 0.6, r, { hairs: 3, dry: 0.3, bend: 0.2 });
      }
    }
  }

  // ---------------- creek ----------------
  function creek(ctx) {
    const line = CREEK, Ws = line.map(p => creekW(p[0], p[1]));
    const up = line.filter(p => p[1] < 660), bankPoly = ribbon(up, u => Ws[Math.round(u * (up.length - 1))] + 7 - clamp((up[Math.round(u * (up.length - 1))][1] - 600) / 60) * 7);
    const waterPoly = wobble(ribbon(line, u => Ws[Math.round(u * (line.length - 1))]), 1.4, 0.12, 33);
    // muddy-sand bank
    pixelFill(ctx, bankPoly, (x, y) => hz(mix(C.earthDark, C.earth, fbm(x / 6, y / 6, 34)), y, 0.4));
    dryEdge(ctx, bankPoly, (x, y, r) => grassColor(x, y), { step: 1.5, spread: 3, len: [3, 6], w: [1, 2], alpha: 0.7, seed: 35 });
    // water
    pixelFill(ctx, waterPoly, (x, y) => {
      const [d, k] = distTo(line, x, y), w = Ws[k] / 2, e = clamp(d / w), n = fbm(x / 14, y / 30, 36);
      let c = mix(C.water, deep(C.water, 0.3), smooth(1 - e) * 0.2 + (n - 0.5) * 0.4);
      c = mix(c, C.waterLight, smooth(e) * 0.35);                         // shallow, lighter edges
      const m = clamp((y - 630) / 70);                                   // fanning out over the sand into the sea
      if (m > 0) { c = mix(c, mix(C.seaShallow, C.seaPale, 0.5), m * 0.75); return [...hz(c, y, 0.5), (1 - smooth(clamp((e - 0.25) / 0.75)) * m) * (1 - m * 0.25)]; }
      return hz(c, y, 0.5);
    });
    // flow strokes along the current
    const flowAt = (x, y) => { const [, k] = distTo(line, x, y), a = line[Math.max(0, k - 1)], b = line[Math.min(line.length - 1, k + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    strokes(ctx, waterPoly, { density: 0.4, seed: 37, len: [5, 12], w: [0.6, 1.6], alpha: [0.25, 0.6], hairs: 3, bend: 0.2, flow: (x, y, r) => flowAt(x, y) + (r() - 0.5) * 0.15,
      colorAt: (x, y, r) => y > 640 ? (r() < 0.5 ? null : lite(C.seaPale, 0.3)) : hz(r() < 0.55 ? lite(C.waterLight, 0.3, [230, 240, 230]) : deep(C.water, 0.25), y, 0.5) });
    // dark wet line where water meets the bank
    ctx.save(); path(ctx, waterPoly); ctx.clip(); ctx.strokeStyle = css(deep(C.water, 0.45), 0.4); ctx.lineWidth = 2.2; ctx.filter = 'blur(1px)'; path(ctx, waterPoly); ctx.stroke(); ctx.restore();
  }

  // ---------------- road ----------------
  function road(ctx, R) {
    const w = R.done ? 13 : 11, line = resample(R.line, 2), poly = wobble(ribbon(line, u => w * (u > 0.85 && !R.done ? 1 - (u - 0.85) * 1.5 : 1)), 0.9, 0.25, R.seed);
    // soft contact shadow under the path edge
    ctx.save(); ctx.filter = 'blur(2px)'; ctx.fillStyle = css(A.SHADOW, 0.22); path(ctx, poly.map(p => [p[0] + 1.2, p[1] + 2])); ctx.fill(); ctx.restore();
    pixelFill(ctx, poly, (x, y) => {
      const [d] = distTo(line, x, y), e = clamp(d / (w / 2)), n = fbm(x / 8, y / 8, R.seed + 40), g = A.hash(Math.floor(x * 3), Math.floor(y * 3), 9);
      let c = mix(C.earthLight, C.earth, smooth(e) * 0.8 + (n - 0.5) * 0.5); c = mix(c, C.earthDark, Math.pow(e, 4) * 0.45);
      const s = (g - 0.5) * 16; c = [c[0] + s, c[1] + s, c[2] + s]; return hz(c, y, R.done ? 0.3 : 0.6);
    });
    const tan = (x, y) => { const [, k] = distTo(line, x, y), a = line[Math.max(0, k - 1)], b = line[Math.min(line.length - 1, k + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    strokes(ctx, poly, { density: 0.35, seed: R.seed + 41, len: [4, 10], w: [1, 2.2], alpha: [0.2, 0.45], bend: 0.25, flow: (x, y, r) => tan(x, y) + (r() - 0.5) * 0.25,
      colorAt: (x, y, r) => hz(r() < 0.5 ? C.earthLight : deep(C.earth, 0.12), y, R.done ? 0.3 : 0.6) });
    // trodden twin ruts, faint
    for (const s of [-2.6, 2.6]) { const rr = rand(R.seed + 44 + s), N2 = normals(line, false); line.forEach((p, i) => { if (i % 2 || rr() < 0.3) return; brush(ctx, p[0] + N2[i][0] * s, p[1] + N2[i][1] * s, tan(p[0], p[1]), 4.5, 1.1, hz(deep(C.earth, 0.14), p[1], 0.5), 0.35, rr, { hairs: 3 }); }); }
    // grass nibbling the edges
    dryEdge(ctx, poly, (x, y, r) => jit(grassColor(x, y), 10, r), { step: 1.8, spread: 2.4, len: [2.5, 5], w: [0.8, 1.6], alpha: 0.65, seed: R.seed + 42, bias: 0.25 });
    // edge pebbles
    const r = rand(R.seed + 43), N2 = normals(line, false);
    line.forEach((p, i) => { if (r() > 0.18) return; const s = r() < 0.5 ? -1 : 1, q = [p[0] + N2[i][0] * s * (w / 2 + 0.5), p[1] + N2[i][1] * s * (w / 2 + 0.5)]; pebble(ctx, q[0], q[1], 1 + r() * 1.3, r, q[1]); });
    // completed road: a line of warm gold studs, softly glowing
    if (R.done) {
      const studs = resample(R.line, 10.5).slice(2, -2);
      studs.forEach(p => { glow(ctx, p[0], p[1], 4.5, C.gold, 0.35); ctx.fillStyle = css(C.goldDark); ctx.beginPath(); ctx.ellipse(p[0] + 0.25, p[1] + 0.4, 1.9, 1.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = css(C.gold); ctx.beginPath(); ctx.ellipse(p[0], p[1], 1.6, 1.25, 0, 0, TAU); ctx.fill(); ctx.fillStyle = css(C.goldLight, 0.95); ctx.beginPath(); ctx.arc(p[0] - 0.5, p[1] - 0.4, 0.55, 0, TAU); ctx.fill(); });
    }
  }
  function pebble(ctx, x, y, s, r, hy) {
    softShadow(ctx, x + s * 0.6, y + s * 0.6, s * 1.6, s, 0.3);
    const g = ctx.createRadialGradient(x - s * 0.4, y - s * 0.4, 0, x, y, s * 1.3); g.addColorStop(0, css(hz(C.rockLight, hy, 0.5))); g.addColorStop(1, css(hz(C.rock, hy, 0.5)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * 1.2, s * 0.85, r() * 3, 0, TAU); ctx.fill();
  }

  // ---------------- bridge over the creek ----------------
  function bridge(ctx) {
    const line = ROADS[1].line; let best = 0, bd = 1e9; line.forEach((p, i) => { const [d] = distTo(CREEK, p[0], p[1]); if (d < bd) { bd = d; best = i; } });
    const p = line[best], a = line[best - 1], b = line[best + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), r = rand(91);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
    const L = 40, W = 16;
    ctx.fillStyle = css(A.SHADOW, 0.35); ctx.filter = 'blur(2px)'; ctx.fillRect(-L / 2 + 2, -W / 2 + 4, L, W); ctx.filter = 'none';
    // planks across the walkway
    for (let x = -L / 2; x < L / 2; x += 3.3) {
      const c = mix(C.wood, C.woodLight, r() * 0.6), off = (r() - 0.5) * 0.8;
      ctx.fillStyle = css(deep(c, 0.3)); ctx.fillRect(x + 0.2, -W / 2 + off + 0.6, 3.0, W);
      ctx.fillStyle = css(c); ctx.fillRect(x, -W / 2 + off, 3.0, W - 0.4);
      const rr = rand((x * 13) | 0); for (let k = 0; k < 4; k++) { ctx.strokeStyle = css(k % 2 ? lite(c, 0.25) : deep(c, 0.2), 0.6); ctx.lineWidth = 0.35; ctx.beginPath(); const yy = -W / 2 + rr() * W; ctx.moveTo(x + 0.4 + rr() * 2, -W / 2 + off + 0.5); ctx.bezierCurveTo(x + 1, yy, x + 2.5, yy + 3, x + 0.6 + rr() * 2, W / 2 + off - 1); ctx.stroke(); }
      ctx.fillStyle = css(lite(c, 0.35), 0.7); ctx.fillRect(x, -W / 2 + off, 0.6, W - 0.4);
    }
    // side rails (logs) with rope posts
    for (const s of [-1, 1]) {
      const y = s * (W / 2 + 0.5), g = ctx.createLinearGradient(0, y - 1.6, 0, y + 1.6); g.addColorStop(0, css(C.woodLight)); g.addColorStop(1, css(C.woodDark));
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-L / 2 - 2, y - 1.6, L + 4, 3.2, 1.6); ctx.fill();
      for (const x of [-L / 2 - 1, 0, L / 2 + 1]) { ctx.fillStyle = css(C.woodDark); ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = css(C.woodLight); ctx.beginPath(); ctx.arc(x - 0.5, y - 0.6, 1.3, 0, TAU); ctx.fill(); ctx.strokeStyle = css(lite(C.straw, 0.2)); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x, y, 2.4, 0.5, 2.6); ctx.stroke(); }
      ctx.strokeStyle = css(lite(C.woodLight, 0.4), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-L / 2, y - 1); ctx.lineTo(L / 2, y - 1); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------- palm ----------------
  function palm(ctx, x, y, h, lean, seed, o = {}) {
    const r = rand(seed), top = [x + lean * h, y - h], mid = [x + lean * h * 0.15, y - h * 0.55];
    // ground shadow: trunk line + crown blot, falling down-right
    ctx.save(); ctx.filter = 'blur(3px)'; ctx.fillStyle = css(A.SHADOW, 0.28);
    ctx.beginPath(); ctx.ellipse(x + h * 0.55, y + h * 0.18, h * 0.42, h * 0.16, 0.25, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(A.SHADOW, 0.25); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + h * 0.4, y + h * 0.14); ctx.stroke(); ctx.restore();
    // trunk
    const tl = bez([x, y], [mid[0] - 3, mid[1] + h * 0.1], [mid[0], mid[1] - h * 0.1], top, 30);
    const poly = ribbon(tl, u => 6.2 - u * 2.6);
    pixelFill(ctx, poly, (px, py) => { const [d, k] = distTo(tl, px, py), sgn = Math.sign(px - tl[k][0]); const t = sgn * d / 3; return mix(mix(C.woodLight, C.wood, 0.3), deep(C.wood, 0.4), smooth(clamp(t * 0.5 + 0.45))); });
    tl.forEach((p, i) => { if (i % 2 || i > 28) return; const q = tl[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2, w = 6.2 - i / 30 * 2.6; brush(ctx, p[0], p[1], a, w * 1.05, 0.9, deep(C.wood, 0.3), 0.7, r, { hairs: 3, bend: 0.6, dry: 0.15 }); brush(ctx, p[0] - 1, p[1] - 0.8, a, w * 0.5, 0.6, lite(C.woodLight, 0.3), 0.6, r, { hairs: 2 }); });
    // coconuts
    [[-2.5, 2], [2.5, 2.4], [0, 4]].forEach(([dx, dy]) => { const cx = top[0] + dx, cy = top[1] + dy, g = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 3); g.addColorStop(0, css([150, 110, 64])); g.addColorStop(1, css([86, 60, 44])); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 2.8, 0, TAU); ctx.fill(); ctx.fillStyle = css([230, 200, 150], 0.7); ctx.beginPath(); ctx.arc(cx - 1, cy - 1.1, 0.7, 0, TAU); ctx.fill(); });
    // fronds: back ones darker, front/top ones lit
    const n = o.n || 8, L = h * 0.62, cols = [[88, 130, 78], [108, 148, 84], [128, 160, 90]];
    const order = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + r() * 0.3 - Math.PI / 2; order.push(a); }
    order.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of order) {
      const back = Math.sin(a) < -0.2, sunny = Math.cos(a) < 0.3 && Math.sin(a) < 0.5;
      const c1 = back ? deep(cols[0], 0.15) : cols[1], c2 = sunny ? lite(cols[2], 0.15, [220, 230, 160]) : cols[1];
      frond(ctx, top[0], top[1], a, L * (0.85 + r() * 0.3) * (Math.abs(Math.sin(a)) * -0.15 + 1), c1, c2, r);
    }
    // crown knot
    ctx.fillStyle = css(deep(cols[0], 0.25)); ctx.beginPath(); ctx.arc(top[0], top[1], 2.4, 0, TAU); ctx.fill();
  }

  // ---------------- rock ----------------
  function rock(ctx, x, y, w, h, seed, o = {}) {
    const r = rand(seed), out = wobble(ellipsePts(x, y - h * 0.45, w / 2, h / 2, 40).map(p => [p[0], Math.min(p[1], y)]), Math.min(w, h) * 0.09, 0.14, seed);
    softShadow(ctx, x + w * 0.22, y + 1, w * 0.68, h * 0.24, 0.4);
    pixelFill(ctx, out, (px, py) => {
      const lx = (px - x) / (w / 2), ly = (py - (y - h * 0.45)) / (h / 2), l = clamp(0.55 - lx * 0.35 - ly * 0.45), n = fbm(px / 3, py / 3, seed);
      let c = mix(deep(C.rockDark, 0.1), C.rockLight, smooth(l)); c = mix(c, C.rock, (n - 0.5) * 0.8 + 0.2); return o.wet && py > y - h * 0.25 ? deep(c, 0.18) : c;
    });
    // strata: slanted bands
    strokes(ctx, out, { count: Math.round(w * h * 0.08), seed: seed + 1, len: [w * 0.25, w * 0.5], w: [0.5, 1.2], alpha: [0.25, 0.5], hairs: 2, bend: 0.2, flow: () => -0.22,
      colorAt: (px, py, rr) => rr() < 0.5 ? deep(C.rock, 0.3) : lite(C.rockLight, 0.2) });
    // cracks
    ctx.strokeStyle = css(deep(C.rockDark, 0.3), 0.75); ctx.lineWidth = 0.5;
    for (let k = 0; k < 3; k++) { let px = x + (r() - 0.5) * w * 0.5, py = y - h * (0.3 + r() * 0.4); ctx.beginPath(); ctx.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (r() - 0.4) * w * 0.12; py += r() * h * 0.14; ctx.lineTo(px, py); } ctx.stroke(); }
    // lit top edge + moss
    const topEdge = out.filter(p => p[1] < y - h * 0.55 && p[0] < x + w * 0.2);
    if (topEdge.length > 2) dryEdge(ctx, topEdge, lite(C.rockLight, 0.35), { closed: false, step: 1.3, spread: 1.2, len: [2, 4], w: [0.5, 1], alpha: 0.7, seed: seed + 2, bias: 0.75 });
    if (o.moss) strokes(ctx, out, { count: 40, seed: seed + 3, len: [1.5, 3.5], w: [0.8, 1.6], alpha: [0.5, 0.85], mask: (px, py) => py < y - h * 0.72, colorAt: (px, py, rr) => rr() < 0.5 ? C.moss : lite(C.moss, 0.25) });
    if (o.foam) { const rr = rand(seed + 4); for (let k = 0; k < 60; k++) { const a = rr() * Math.PI, R = w * 0.55 + rr() * 4; brush(ctx, x + Math.cos(a) * R, y - 1 + Math.sin(a) * R * 0.3, a + Math.PI / 2, 3 + rr() * 3, 1, C.foam, 0.6, rr, { hairs: 3, dry: 0.5 }); } }
  }

  // ---------------- stilt hut ----------------
  function hut(ctx, X, Y) {
    const r = rand(77);
    // shadow on the sand (falls down-right)
    ctx.save(); ctx.filter = 'blur(4px)'; ctx.fillStyle = css(A.SHADOW, 0.3); ctx.beginPath(); ctx.ellipse(X + 18, Y + 44, 58, 13, 0.06, 0, TAU); ctx.fill(); ctx.restore();
    const deckY = Y, groundY = Y + 42;
    // stilts (back row dimmer)
    const pole = (px, top, bot, w, dim) => { const g = ctx.createLinearGradient(px - w / 2, 0, px + w / 2, 0); g.addColorStop(0, css(dim ? deep(C.woodLight, 0.3) : C.woodLight)); g.addColorStop(1, css(deep(C.wood, dim ? 0.5 : 0.3))); ctx.fillStyle = g; ctx.fillRect(px - w / 2, top, w, bot - top); for (let k = 0; k < 3; k++) brush(ctx, px - w / 2 + (k + 0.5) * w / 3, (top + bot) / 2, Math.PI / 2, bot - top, 0.5, k ? deep(C.wood, 0.3) : lite(C.woodLight, 0.3), 0.55, r, { hairs: 2, dry: 0.35, bend: 0.05 }); for (let yy = top + 4; yy < bot; yy += 7 + r() * 4) brush(ctx, px, yy, 0, w, 0.5, deep(C.wood, 0.35), 0.6, r, { hairs: 2 }); softShadow(ctx, px + 2, bot, w * 1.3, 1.6, 0.4); };
    [X - 30, X - 2, X + 28].forEach(px => pole(px + 6, deckY - 4, groundY - 6, 3, true));
    // cross braces under the deck
    ctx.strokeStyle = css(deep(C.wood, 0.25)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X - 38, deckY + 6); ctx.lineTo(X - 10, groundY - 4); ctx.moveTo(X - 10, deckY + 6); ctx.lineTo(X - 38, groundY - 4); ctx.moveTo(X + 12, deckY + 6); ctx.lineTo(X + 38, groundY - 4); ctx.moveTo(X + 38, deckY + 6); ctx.lineTo(X + 12, groundY - 4); ctx.stroke();
    [X - 40, X - 12, X + 12, X + 40].forEach(px => pole(px, deckY + 2, groundY, 3.8));
    // deck: planks seen from the front + top strip
    for (let px = X - 46; px < X + 46; px += 4) { const c = mix(C.wood, C.woodLight, r() * 0.5); ctx.fillStyle = css(deep(c, 0.12)); ctx.fillRect(px, deckY - 4, 4.2, 8); ctx.fillStyle = css(lite(c, 0.3), 0.8); ctx.fillRect(px, deckY - 4, 0.6, 8); brush(ctx, px + 2.1, deckY, Math.PI / 2, 7, 2.6, r() < 0.5 ? deep(c, 0.3) : lite(c, 0.2), 0.45, r, { hairs: 4, dry: 0.4, bend: 0.1 }); }
    ctx.fillStyle = css(deep(C.wood, 0.4)); ctx.fillRect(X - 46, deckY + 3, 92, 1.6);
    ctx.fillStyle = css(lite(C.woodLight, 0.15)); ctx.fillRect(X - 46, deckY - 6, 92, 2.4);
    // walls: bamboo canes
    const wx0 = X - 33, wx1 = X + 33, wy0 = Y - 44, wy1 = Y - 5;
    for (let px = wx0; px < wx1; px += 3.1) {
      const shadeK = clamp((px - wx0) / (wx1 - wx0)) * 0.3, c = deep(mix(C.cane, lite(C.cane, 0.2), r()), shadeK), g = ctx.createLinearGradient(px, 0, px + 3, 0);
      g.addColorStop(0, css(lite(c, 0.25))); g.addColorStop(0.5, css(c)); g.addColorStop(1, css(deep(c, 0.3)));
      ctx.fillStyle = g; ctx.fillRect(px, wy0, 3.1, wy1 - wy0);
      for (let yy = wy0 + 3 + r() * 6; yy < wy1; yy += 8 + r() * 4) { ctx.fillStyle = css(deep(c, 0.35), 0.9); ctx.fillRect(px, yy, 3.1, 0.8); ctx.fillStyle = css(lite(c, 0.4), 0.8); ctx.fillRect(px, yy + 0.8, 3.1, 0.5); }
    }
    // horizontal lashing rails
    [wy0 + 10, wy1 - 6].forEach(yy => { ctx.fillStyle = css(deep(C.wood, 0.1)); ctx.fillRect(wx0 - 2, yy, wx1 - wx0 + 4, 2.4); ctx.fillStyle = css(C.woodLight, 0.8); ctx.fillRect(wx0 - 2, yy, wx1 - wx0 + 4, 0.7); });
    // doorway with warm interior + hanging lamp glow
    const dx = X - 8, dy = wy0 + 10, dw = 16, dh = wy1 - dy;
    ctx.fillStyle = css([92, 58, 44]); ctx.beginPath(); ctx.moveTo(dx, wy1); ctx.lineTo(dx, dy + 6); ctx.quadraticCurveTo(dx + dw / 2, dy - 3, dx + dw, dy + 6); ctx.lineTo(dx + dw, wy1); ctx.fill();
    const ig = ctx.createRadialGradient(dx + dw / 2, dy + 12, 0, dx + dw / 2, dy + 12, 16); ig.addColorStop(0, css([255, 196, 110], 0.85)); ig.addColorStop(1, css([140, 72, 44], 0)); ctx.fillStyle = ig; ctx.fill();
    ctx.strokeStyle = css(C.woodLight); ctx.lineWidth = 1.4; ctx.stroke();
    // window with shutter
    ctx.fillStyle = css([110, 70, 48]); ctx.fillRect(X + 15, wy0 + 13, 11, 10); glow(ctx, X + 20.5, wy0 + 18, 9, [255, 190, 110], 0.6);
    ctx.strokeStyle = css(C.woodLight); ctx.lineWidth = 1; ctx.strokeRect(X + 15, wy0 + 13, 11, 10); ctx.beginPath(); ctx.moveTo(X + 20.5, wy0 + 13); ctx.lineTo(X + 20.5, wy0 + 23); ctx.stroke();
    // eave shadow on the wall
    const es = ctx.createLinearGradient(0, wy0, 0, wy0 + 12); es.addColorStop(0, css(A.SHADOW, 0.55)); es.addColorStop(1, css(A.SHADOW, 0)); ctx.fillStyle = es; ctx.fillRect(wx0, wy0, wx1 - wx0, 12);
    // thatched roof: big soft hip, layered fringe rows, painted with downward straw strokes
    const apex = [X + 1, Y - 92], eL = [X - 52, Y - 40], eR = [X + 54, Y - 40];
    const roof = [apex, [X + 12, Y - 90], [X + 34, Y - 64], eR, [X + 30, Y - 36], [X, Y - 34], [X - 30, Y - 36], eL, [X - 32, Y - 66], [X - 10, Y - 90]];
    const roofS = spline(roof, 6, true);
    ctx.save(); ctx.filter = 'blur(2px)'; ctx.fillStyle = css(A.SHADOW, 0.35); path(ctx, roofS.map(p => [p[0] + 2, p[1] + 4])); ctx.fill(); ctx.restore();
    pixelFill(ctx, roofS, (px, py) => { const t = (px - X) / 54, v = clamp((py - (Y - 92)) / 56), n = fbm(px / 4, py / 10, 78); let c = mix(C.strawLight, C.straw, v * 0.6 + (n - 0.5) * 0.6); return deep(c, clamp(t * 0.35 + 0.05)); });
    strokes(ctx, roofS, { density: 3.2, seed: 79, len: [6, 13], w: [0.6, 1.4], alpha: [0.35, 0.75], hairs: 3, bend: 0.25, dry: 0.25,
      flow: (px, py) => Math.atan2(py - apex[1] + 30, px - apex[0]) * 0.8 + Math.PI / 2 * 0.2 + 0,
      colorAt: (px, py, rr) => { const t = (px - X) / 54, k = rr(); const b = k < 0.35 ? C.strawLight : k < 0.75 ? C.straw : C.strawDark; return deep(lite(b, rr() * 0.15), clamp(t * 0.3)); } });
    // fringe rows: three tiers of drooping straw ends
    [[Y - 72, 0.55], [Y - 56, 0.8], [Y - 38, 1]].forEach(([fy, span]) => {
      const x0 = X - 52 * span, x1 = X + 54 * span;
      for (let px = x0; px < x1; px += 1.1) { const t = (px - X) / 54, c = deep(mix(C.strawDark, C.straw, r()), clamp(t * 0.3)), L = 3 + r() * 3.5, yy = fy + Math.abs(px - X) * 0.06 * (1 - span) + (r() - 0.5) * 1.2; brush(ctx, px, yy + L / 2, Math.PI / 2 + (r() - 0.5) * 0.25 + t * 0.2, L, 1, c, 0.85, r, { hairs: 2, dry: 0.2 }); }
      ctx.strokeStyle = css(deep(C.strawDark, 0.35), 0.45); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0, fy + 0.2); ctx.quadraticCurveTo(X, fy - 1.5, x1, fy + 0.2); ctx.stroke();
    });
    // sunlit straw highlights on the left face, ridge cap and binding
    strokes(ctx, roofS, { count: 120, seed: 80, len: [4, 8], w: [0.4, 0.8], alpha: [0.5, 0.9], hairs: 2, mask: (px) => px < X - 4, flow: (px, py) => Math.PI / 2 + (px - X) / 90, colorAt: () => [250, 232, 176] });
    ctx.fillStyle = css(C.strawDark); ctx.beginPath(); ctx.ellipse(apex[0], apex[1] + 2, 6, 3.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = css(C.strawLight); ctx.beginPath(); ctx.ellipse(apex[0] - 1.2, apex[1] + 1, 3.6, 1.8, 0, 0, TAU); ctx.fill();
    // small pennant on a pole (accent of colour)
    ctx.strokeStyle = css(C.woodDark); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(apex[0], apex[1]); ctx.lineTo(apex[0], apex[1] - 16); ctx.stroke();
    ctx.fillStyle = css([200, 92, 78]); ctx.beginPath(); ctx.moveTo(apex[0] + 0.5, apex[1] - 16); ctx.quadraticCurveTo(apex[0] + 7, apex[1] - 15, apex[0] + 12, apex[1] - 12); ctx.quadraticCurveTo(apex[0] + 6, apex[1] - 11.5, apex[0] + 0.5, apex[1] - 9.5); ctx.fill();
    ctx.fillStyle = css([236, 140, 116], 0.8); ctx.beginPath(); ctx.moveTo(apex[0] + 0.5, apex[1] - 16); ctx.quadraticCurveTo(apex[0] + 6, apex[1] - 15, apex[0] + 10, apex[1] - 12.6); ctx.lineTo(apex[0] + 0.5, apex[1] - 14); ctx.fill();
    // ladder down to the sand on the left
    const l0 = [X - 50, deckY + 2], l1 = [X - 62, groundY + 4];
    for (const s of [0, 7]) { ctx.strokeStyle = css(C.wood); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(l0[0] + s, l0[1]); ctx.lineTo(l1[0] + s, l1[1]); ctx.stroke(); ctx.strokeStyle = css(C.woodLight, 0.7); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(l0[0] + s - 0.5, l0[1]); ctx.lineTo(l1[0] + s - 0.5, l1[1]); ctx.stroke(); }
    for (let t = 0.12; t < 1; t += 0.19) { const ax = l0[0] + (l1[0] - l0[0]) * t, ay = l0[1] + (l1[1] - l0[1]) * t; ctx.strokeStyle = css(C.woodLight); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 7, ay); ctx.stroke(); }
    // rope coil + a resting canoe paddle on the deck
    ctx.strokeStyle = css(lite(C.straw, 0.1)); ctx.lineWidth = 0.9; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(X + 36, deckY - 8, 4.5 - k, 2.2 - k * 0.5, 0, 0, TAU); ctx.stroke(); }
  }

  // ---------------- launch pad (level 1) and stone plinths ----------------
  function stoneDisc(ctx, x, y, rx, ry, th, seed) {
    const r = rand(seed);
    softShadow(ctx, x + rx * 0.2, y + th + 2, rx * 1.15, ry * 0.8, 0.45);
    // side wall
    ctx.fillStyle = css(deep(C.rock, 0.25)); ctx.beginPath(); ctx.ellipse(x, y + th, rx, ry, 0, 0, Math.PI); ctx.lineTo(x - rx, y); ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); ctx.fill();
    for (let a = 0.15; a < Math.PI; a += 0.34 + r() * 0.12) { const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; ctx.strokeStyle = css(deep(C.rockDark, 0.3), 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + th); ctx.stroke(); }
    // top: fitted stones
    const top = ellipsePts(x, y, rx, ry, 60);
    pixelFill(ctx, top, (px, py) => { const n = fbm(px / 2.5, py / 2.5, seed), l = clamp(0.6 - (px - x) / rx * 0.25 - (py - y) / ry * 0.3); return mix(mix(C.rock, C.rockLight, l), deep(C.rock, 0.2), (n - 0.5) * 0.9); });
    ctx.save(); path(ctx, top); ctx.clip(); ctx.strokeStyle = css(deep(C.rockDark, 0.2), 0.55); ctx.lineWidth = 0.6;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x, y, rx * (0.35 + k * 0.28), ry * (0.35 + k * 0.28), 0, 0, TAU); ctx.stroke(); }
    for (let a = 0; a < TAU; a += 0.5 + r() * 0.2) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rx * 0.35, y + Math.sin(a) * ry * 0.35); ctx.lineTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry); ctx.stroke(); }
    ctx.restore();
    dryEdge(ctx, top.filter(p => p[1] < y), lite(C.rockLight, 0.3), { closed: false, step: 1.4, spread: 1, len: [2, 4], w: [0.5, 1], alpha: 0.6, seed: seed + 1, bias: 0.6 });
  }
  function launchPad(ctx, x, y) {
    const r = rand(55);
    stoneDisc(ctx, x, y, 30, 19, 6, 56);
    // scorched plank centre
    const inner = ellipsePts(x, y, 19, 12, 48);
    ctx.save(); path(ctx, inner); ctx.clip();
    for (let px = x - 20; px < x + 20; px += 3.4) { const c = mix(C.wood, C.woodLight, r() * 0.5); ctx.fillStyle = css(c); ctx.fillRect(px, y - 13, 3.2, 26); ctx.fillStyle = css(deep(c, 0.35)); ctx.fillRect(px + 3.0, y - 13, 0.5, 26); }
    const sc = ctx.createRadialGradient(x, y, 0, x, y, 17); sc.addColorStop(0, css([52, 40, 46], 0.75)); sc.addColorStop(0.6, css([70, 52, 50], 0.35)); sc.addColorStop(1, css([70, 52, 50], 0)); ctx.fillStyle = sc; ctx.fillRect(x - 20, y - 13, 40, 26);
    for (let k = 0; k < 28; k++) { const a = r() * TAU; brush(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 6, a, 7 + r() * 5, 1, [60, 46, 48], 0.35, r, { hairs: 3 }); }
    ctx.restore();
    // metal ring with rivets
    ctx.strokeStyle = css([150, 142, 136]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(x, y, 19.5, 12.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = css([214, 206, 190], 0.8); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x, y - 0.4, 19.5, 12.5, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
    for (let a = 0; a < TAU; a += TAU / 12) { ctx.fillStyle = css([226, 214, 196]); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 19.5, y + Math.sin(a) * 12.5, 0.7, 0, TAU); ctx.fill(); }
  }
  function torch(ctx, x, y) {
    const r = rand((x * 7) | 0);
    softShadow(ctx, x + 3, y + 1, 4, 1.6, 0.4);
    ctx.fillStyle = css(C.cane); ctx.fillRect(x - 1.2, y - 22, 2.4, 22); ctx.fillStyle = css(deep(C.cane, 0.3)); ctx.fillRect(x + 0.4, y - 22, 0.8, 22);
    for (let yy = y - 18; yy < y; yy += 6) { ctx.fillStyle = css(deep(C.cane, 0.4)); ctx.fillRect(x - 1.2, yy, 2.4, 0.7); }
    ctx.fillStyle = css(C.strawDark); ctx.beginPath(); ctx.moveTo(x - 3, y - 26); ctx.lineTo(x + 3, y - 26); ctx.lineTo(x + 1.6, y - 21); ctx.lineTo(x - 1.6, y - 21); ctx.fill();
    glow(ctx, x, y - 29, 16, C.ember, 0.35); glow(ctx, x, y - 29, 6, C.warm, 0.6);
    ctx.fillStyle = css([255, 170, 70]); ctx.beginPath(); ctx.moveTo(x - 2.6, y - 26); ctx.quadraticCurveTo(x - 3, y - 31, x + 0.4, y - 35); ctx.quadraticCurveTo(x + 3.4, y - 30, x + 2.6, y - 26); ctx.fill();
    ctx.fillStyle = css([255, 236, 170]); ctx.beginPath(); ctx.moveTo(x - 1.2, y - 26); ctx.quadraticCurveTo(x - 1.2, y - 29.5, x + 0.3, y - 31.5); ctx.quadraticCurveTo(x + 1.6, y - 29, x + 1.2, y - 26); ctx.fill();
  }

  // ---------------- node token (glossy gold, like the game's coins/UI) ----------------
  function star(ctx, x, y, R, fill, rim) {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.46 : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = rim; ctx.save(); ctx.translate(0, 0.6); ctx.fill(); ctx.restore(); ctx.fillStyle = fill; ctx.fill();
  }
  function node(ctx, n, x, y, o = {}) {
    const R = 16.5, cy = y - 7;
    if (o.open) { glow(ctx, x, cy, 46, [255, 226, 140], 0.5); ctx.strokeStyle = css([255, 240, 190], 0.75); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y + 1, 30, 19, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = css([255, 240, 190], 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y + 1, 36, 23, 0, 0, TAU); ctx.stroke(); }
    else glow(ctx, x, cy, 30, C.gold, 0.3);
    // coin edge (thickness) then face
    ctx.fillStyle = css(C.goldDeep); ctx.beginPath(); ctx.arc(x, cy + 2.6, R, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x - R * 0.4, cy - R * 0.5, R * 0.1, x, cy, R * 1.1); g.addColorStop(0, css(C.goldLight)); g.addColorStop(0.5, css(C.gold)); g.addColorStop(1, css(C.goldDark));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, R, 0, TAU); ctx.fill();
    // inner recessed face
    const g2 = ctx.createRadialGradient(x + R * 0.3, cy + R * 0.4, 0, x, cy, R * 0.8); g2.addColorStop(0, css(lite(C.gold, 0.15))); g2.addColorStop(1, css(mix(C.gold, C.goldDark, 0.55)));
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, cy, R * 0.74, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(C.goldLight, 0.85); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, cy, R * 0.74, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.strokeStyle = css(C.goldDeep, 0.5); ctx.beginPath(); ctx.arc(x, cy, R * 0.74, Math.PI + 0.2, -0.2); ctx.stroke();
    // reeded rim ticks
    for (let a = 0; a < TAU; a += TAU / 36) { ctx.strokeStyle = css(a > Math.PI ? C.goldLight : C.goldDark, 0.45); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); ctx.lineTo(x + Math.cos(a) * R * 0.98, cy + Math.sin(a) * R * 0.98); ctx.stroke(); }
    // number
    ctx.font = '400 19px "Lilita One", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = css(C.goldDeep); ctx.fillText(n, x, cy + 2.4); ctx.fillStyle = css([255, 250, 232]); ctx.fillText(n, x, cy + 1);
    // specular streak
    ctx.save(); ctx.beginPath(); ctx.arc(x, cy, R, 0, TAU); ctx.clip(); ctx.fillStyle = css([255, 255, 255], 0.35); ctx.beginPath(); ctx.ellipse(x - R * 0.35, cy - R * 0.55, R * 0.55, R * 0.2, -0.5, 0, TAU); ctx.fill(); ctx.restore();
    // stars
    const st = o.stars ?? 0;
    [[-12, 13, 4.8], [0, 16, 5.6], [12, 13, 4.8]].forEach(([dx, dy, s], i) => {
      const on = i < st; star(ctx, x + dx, cy + dy, s, on ? css(C.gold) : css([238, 226, 196], 0.85), on ? css(C.goldDeep) : css([120, 104, 90], 0.7));
      if (on) { ctx.fillStyle = css(C.goldLight, 0.9); ctx.beginPath(); ctx.arc(x + dx - s * 0.2, cy + dy - s * 0.25, s * 0.25, 0, TAU); ctx.fill(); }
    });
  }

  // ---------------- wooden direction sign ----------------
  function sign(ctx, x, y, text, dir) {
    const r = rand(text.length * 31);
    ctx.font = '400 11px "Lilita One", system-ui'; const tw = ctx.measureText(text).width, w = tw + 20, h = 15;
    softShadow(ctx, x + 4, y + 18, 8, 2.4, 0.4);
    ctx.fillStyle = css(C.wood); ctx.fillRect(x - 1.4, y, 2.8, 19); ctx.fillStyle = css(deep(C.wood, 0.35)); ctx.fillRect(x + 0.4, y, 1, 19);
    const bx = dir > 0 ? x - 6 : x - w + 6, by = y - h + 2;
    const pts = dir > 0 ? [[bx, by], [bx + w - 6, by], [bx + w, by + h / 2], [bx + w - 6, by + h], [bx, by + h]] : [[bx + 6, by], [bx + w, by], [bx + w, by + h], [bx + 6, by + h], [bx, by + h / 2]];
    ctx.save(); ctx.filter = 'blur(1.5px)'; ctx.fillStyle = css(A.SHADOW, 0.35); path(ctx, pts.map(p => [p[0] + 1.5, p[1] + 2])); ctx.fill(); ctx.restore();
    pixelFill(ctx, pts, (px, py) => { const n = vnoise(px * 0.3, py * 2.2, 5) * 0.6 + fbm(px / 6, py / 2, 6) * 0.4; return mix(C.woodDark, C.woodLight, n * 0.9 + 0.05 - (py - by) / h * 0.15); });
    ctx.strokeStyle = css(lite(C.woodLight, 0.3), 0.7); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(pts[0][0] + 1, by + 0.6); ctx.lineTo(bx + w - 7, by + 0.6); ctx.stroke();
    ctx.fillStyle = css([210, 200, 190]); [[bx + 3.5 + (dir < 0 ? 6 : 0), by + h / 2]].forEach(([nx, ny]) => { ctx.beginPath(); ctx.arc(nx, ny, 0.8, 0, TAU); ctx.fill(); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const tx = bx + w / 2 + (dir > 0 ? -2 : 2);
    ctx.fillStyle = css(deep(C.woodDark, 0.3)); ctx.fillText(text, tx, by + h / 2 + 1.6); ctx.fillStyle = css([252, 238, 206]); ctx.fillText(text, tx, by + h / 2 + 0.6);
  }

  // ---------------- "you are here" ----------------
  function hereMarker(ctx, x, y, img) {
    softShadow(ctx, x + 3, y + 30, 18, 5, 0.35);
    if (img && img.naturalWidth) { glow(ctx, x, y, 44, [255, 236, 190], 0.35); ctx.drawImage(img, x - 36, y - 36, 72, 72); }
    const ly = y - 46; ctx.font = '400 12.5px "Lilita One", system-ui'; const t = 'YOU ARE HERE', tw = ctx.measureText(t).width + 22;
    ctx.fillStyle = css(A.SHADOW, 0.35); ctx.beginPath(); ctx.roundRect(x - tw / 2 + 1, ly - 10 + 2.5, tw, 20, 10); ctx.fill();
    ctx.fillStyle = css(C.goldDeep); ctx.beginPath(); ctx.roundRect(x - tw / 2, ly - 10 + 1.6, tw, 20, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, ly + 10); ctx.lineTo(x, ly + 16); ctx.lineTo(x + 5, ly + 10); ctx.fill();
    const g = ctx.createLinearGradient(0, ly - 10, 0, ly + 10); g.addColorStop(0, css(C.goldLight)); g.addColorStop(1, css(C.gold));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - tw / 2, ly - 10, tw, 20, 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 4.5, ly + 9); ctx.lineTo(x, ly + 14.4); ctx.lineTo(x + 4.5, ly + 9); ctx.fill();
    ctx.fillStyle = css([255, 255, 255], 0.4); ctx.beginPath(); ctx.roundRect(x - tw / 2 + 5, ly - 8, tw - 10, 6, 3); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css([110, 60, 24]); ctx.fillText(t, x, ly + 1);
  }

  // ---------------- whole screen ----------------
  function drawScene(ctx, img) {
    const K = A.P.K;
    sea(ctx); sand(ctx); grass(ctx); creek(ctx);
    // rocks first (ground level), then the few hero props
    rock(ctx, 352, 798, 30, 20, 301, { wet: true, foam: true });
    rock(ctx, 16, 700, 26, 20, 302, { moss: false });
    rock(ctx, 104, 708, 13, 9, 303);
    rock(ctx, 196, 532, 14, 10, 304, { moss: true });
    rock(ctx, 282, 452, 18, 13, 305, { moss: true });
    canopy(ctx, JUNGLE_T, 401, {});
    canopy(ctx, JUNGLE_L, 402, { fronds: [[50, 132, 0.4, 26], [36, 410, 0.2, 24]] });
    canopy(ctx, JUNGLE_R, 403, { fronds: [[316, 160, 2.9, 26], [350, 400, 3.2, 24]] });
    palm(ctx, 30, 640, 58, 0.2, 501);
    palm(ctx, 74, 676, 50, 0.42, 502, { n: 7 });
    palm(ctx, 376, 600, 62, -0.3, 503);
    palm(ctx, 262, 596, 44, 0.12, 504, { n: 7 });
    hut(ctx, HUT[0], HUT[1]);
    // atmospheric haze toward the top of the screen
    const hg = ctx.createLinearGradient(0, 0, 0, 560); for (let i = 0; i <= 10; i++) { const y = i * 56; hg.addColorStop(i / 10, css(C.haze, hazeAt(y) * 0.55)); }
    ctx.fillStyle = hg; ctx.fillRect(0, 0, 390, 560);
    // roads, bridge, pad, plinths, torches, signs
    ROADS.forEach(R => road(ctx, R));
    bridge(ctx);
    launchPad(ctx, N[1][0], N[1][1]); torch(ctx, N[1][0] - 34, N[1][1] - 2); torch(ctx, N[1][0] + 34, N[1][1] - 2);
    stoneDisc(ctx, N[2][0], N[2][1], 22, 14, 4, 57); stoneDisc(ctx, N[3][0], N[3][1], 22, 14, 4, 58);
    sign(ctx, 268, 44, 'Temple', 1); sign(ctx, 46, 158, 'Bog', -1);
    // warm sun wash from the top-left, then the paper
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; const sg = ctx.createRadialGradient(40, 120, 0, 40, 120, 700); sg.addColorStop(0, css([255, 230, 170], 0.55)); sg.addColorStop(1, css([120, 140, 170], 0.25)); ctx.fillStyle = sg; ctx.fillRect(0, 0, 390, 844); ctx.restore();
    A.paperGrain(ctx, 1);
    // UI-level tokens on top, crisp
    node(ctx, 1, N[1][0], N[1][1], { stars: 3 }); node(ctx, 2, N[2][0], N[2][1], { stars: 3 }); node(ctx, 3, N[3][0], N[3][1], { stars: 0, open: true });
    hereMarker(ctx, N[3][0], N[3][1] - 54, img);
    A.paperGrain(ctx, 0.3);
  }

  window.SCENE = { drawScene, sea, sand, grass, canopy, creek, road, bridge, palm, rock, hut, launchPad, stoneDisc, torch, node, sign, hereMarker, C, N };
})();
