// Concept 2: Coconut Island. A Donkey Kong Country style overworld seen from above at an angle: one tropical island
// with the beach start in the south, jungle, temple ruins on the west coast, a toxic swamp, a glowing mushroom
// forest, a lagoon, a mine mountain, basalt caves, crystal caves on the north shore, a snowy peak, a storm cliff and
// the smoking volcano in the middle as the finale. Future levels: a pier, a closed gate and a dotted boat route out
// to fogged islands at sea.
(() => {
  const TAU = Math.PI * 2, W = 820, H = 1240;
  const { rgb, glow, shadow, sheen, rand, lift, mix } = K;
  // gradients memoised by their arguments: everything static asks for the same gradient every frame, so it is built once
  // (a pure cache: the picture never depends on earlier frames)
  const GC = new WeakMap();
  const memo = (kind, ctx, args) => {
    let m = GC.get(ctx); if (!m) GC.set(ctx, m = new Map());
    const key = kind + JSON.stringify(args);
    let g = m.get(key);
    if (!g) { if (m.size > 4000) m.clear(); g = kind === 'l' ? K.lg(ctx, ...args) : K.rg(ctx, ...args); m.set(key, g); }
    return g;
  };
  const lg = (ctx, ...a) => memo('l', ctx, a), rg = (ctx, ...a) => memo('r', ctx, a);
  const sm = (x) => x * x * (3 - 2 * x);

  // ---------------- layout ----------------
  const NP = {
    1: [398, 1118], 2: [290, 1062], 3: [196, 984],
    4: [92, 900], 5: [80, 792], 6: [118, 692],
    7: [298, 902], 8: [292, 792],
    9: [206, 640],
    10: [168, 528], 11: [86, 438], 12: [124, 322], 13: [300, 432],
    14: [262, 282], 15: [404, 196],
    16: [536, 128], 17: [602, 316], 18: [502, 392],
    19: [624, 540], 20: [420, 508],
  };
  // custom bezier controls for edges that wind around scenery
  const CTRL = {
    '16-19': [[756, 220], [762, 470]],
    '19-20': [[560, 470], [500, 470]],
    '3-4': [[150, 950], [110, 940]],
    '6-9': [[140, 640], [170, 630]],
    '9-10': [[220, 590], [180, 570]],
    '10-11': [[120, 500], [90, 480]],
    '11-12': [[60, 390], [90, 340]],
    '12-14': [[180, 290], [210, 270]],
    '13-14': [[310, 360], [280, 320]],
    '14-15': [[300, 220], [350, 200]],
  };
  const FUT = [[420, 508], [470, 620], [560, 740], [650, 768]];   // crater -> south-east flank -> pier
  const PIER = [650, 768];

  // island coastline (smooth closed), with a bay on the east side where the pier is
  const COAST = [[398, 1192], [270, 1172], [150, 1118], [70, 1030], [36, 900], [26, 770], [40, 640], [24, 500], [36, 360],
    [80, 230], [170, 130], [300, 70], [440, 58], [580, 70], [690, 140], [752, 260], [766, 400], [742, 540], [700, 650],
    [640, 700], [622, 790], [668, 880], [664, 990], [600, 1100], [500, 1170]];
  const CEN = [400, 640];
  const inset = (pts, d) => pts.map(([x, y]) => { const dx = CEN[0] - x, dy = CEN[1] - y, l = Math.hypot(dx, dy) || 1; return [x + dx / l * d, y + dy / l * d]; });
  const GRASS = inset(COAST, 26), SHALLOW1 = inset(COAST, -16), SHALLOW2 = inset(COAST, -36);
  function closed(ctx, pts) {
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.beginPath(); const m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    ctx.closePath();
  }
  function closedSub(ctx, pts) {   // adds another closed shape to the current path (for even-odd rings)
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    ctx.closePath();
  }
  function blobPts(cx, cy, rx, ry, seed, n = 12, j = 0.2) {
    const r = rand(seed), out = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 - j / 2 + r() * j; out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return out;
  }

  // edges as cubic beziers
  const bez = (p0, c1, c2, p1, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p1[1]]; };
  const EDGES = PATHS.map(([a, b], i) => {
    const p0 = NP[a], p1 = NP[b], key = a + '-' + b;
    let c1, c2;
    if (CTRL[key]) [c1, c2] = CTRL[key];
    else {
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], s = (i % 2 ? 1 : -1) * 0.16;
      c1 = [p0[0] + dx * 0.33 - dy * s, p0[1] + dy * 0.33 + dx * s]; c2 = [p0[0] + dx * 0.67 - dy * s, p0[1] + dy * 0.67 + dx * s];
    }
    const pts = []; for (let k = 0; k <= 24; k++) pts.push(bez(p0, c1, c2, p1, k / 24));
    return { a, b, p0, c1, c2, p1, pts, lit: PATH_STATE[i] === 'lit' };
  });
  const FUTPTS = (() => { const o = []; for (let k = 0; k <= 30; k++) o.push(bez(FUT[0], FUT[1], FUT[2], FUT[3], k / 30)); return o; })();

  // ---------------- regions ----------------
  const REG = {
    temple: { blob: blobPts(96, 800, 78, 150, 11, 12, 0.18), c: [170, 158, 118], e: [118, 104, 72] },
    bog: { blob: blobPts(306, 850, 92, 108, 12, 13, 0.25), c: [104, 112, 52], e: [70, 76, 30] },
    grotto: { blob: blobPts(170, 528, 112, 72, 13, 12, 0.22), c: [62, 74, 98], e: [40, 46, 72] },
    mine: { blob: blobPts(318, 418, 88, 74, 14, 11, 0.25), c: [150, 112, 74], e: [104, 72, 44] },
    caves: { blob: blobPts(262, 268, 96, 76, 15, 12, 0.25), c: [78, 82, 138], e: [50, 52, 98] },
    crystal: { blob: blobPts(540, 140, 104, 62, 16, 12, 0.22), c: [150, 104, 168], e: [102, 64, 124] },
    frost: { blob: blobPts(632, 286, 98, 92, 17, 12, 0.2), c: [214, 230, 240], e: [150, 180, 206] },
    storm: { blob: blobPts(486, 384, 74, 58, 18, 11, 0.25), c: [82, 80, 128], e: [52, 50, 92] },
    magma: { blob: blobPts(470, 560, 196, 128, 19, 14, 0.18), c: [128, 78, 58], e: [92, 48, 36] },
  };
  const RAISED = { temple: 6, mine: 9, caves: 9, crystal: 7, frost: 8, storm: 9, magma: 6 };
  const LAGOON = blobPts(98, 380, 70, 112, 21, 12, 0.2);

  // ---------------- scenery placement (constant, seeded) ----------------
  const nearPath = (x, y, d) => {
    for (const n of Object.values(NP)) if (Math.hypot(n[0] - x, n[1] - y) < d + 14) return true;
    for (const e of EDGES) for (const p of e.pts) if (Math.hypot(p[0] - x, p[1] - y) < d) return true;
    for (const p of FUTPTS) if (Math.hypot(p[0] - x, p[1] - y) < d) return true;
    return false;
  };
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const inRegion = (x, y) => { for (const [k, R] of Object.entries(REG)) if (inPoly(R.blob, x, y)) return k; if (inPoly(LAGOON, x, y)) return 'lagoon'; return null; };
  const SPR = [];
  const add = (type, x, y, s = 1, seed = 0) => SPR.push({ type, x, y, s, seed });
  // big landmarks
  add('volcano', 420, 640, 1, 1);
  add('mineMtn', 322, 372, 1, 2);
  add('peak', 622, 232, 1, 3);
  add('stormCliff', 520, 352, 1, 4);
  add('pyramid', 64, 724, 1, 5);
  add('hut', 492, 1128, 1, 6);
  add('waterfall', 92, 282, 0.9, 7);
  // scatter by region
  function scatter(region, type, n, seed, d = 22, sMin = 0.8, sMax = 1.2) {
    const r = rand(seed); let tries = 0, made = 0;
    const R = region === 'lagoon' ? LAGOON : REG[region].blob;
    const xs = R.map(p => p[0]), ys = R.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    while (made < n && tries++ < n * 40) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      if (!inPoly(R, x, y) || nearPath(x, y, d)) continue;
      if (SPR.some(s => Math.hypot(s.x - x, s.y - y) < (s.type === 'volcano' ? 150 : s.type === 'mineMtn' || s.type === 'peak' ? 64 : s.type === 'stormCliff' || s.type === 'pyramid' ? 42 : 14 * s.s + 6))) continue;
      add(type, x, y, sMin + r() * (sMax - sMin), (r() * 1e5) | 0); made++;
    }
  }
  scatter('temple', 'ruin', 7, 31, 22);
  scatter('temple', 'tree', 6, 32, 24, 0.8, 1.0);
  scatter('bog', 'deadTree', 6, 33, 22);
  scatter('bog', 'pool', 5, 34, 18);
  scatter('bog', 'reed', 10, 35, 14, 0.7, 1.1);
  scatter('grotto', 'shroom', 16, 36, 20, 0.7, 1.4);
  scatter('mine', 'rock', 6, 37, 18);
  scatter('mine', 'lantern', 4, 38, 16);
  scatter('caves', 'basalt', 10, 39, 20, 0.7, 1.2);
  scatter('crystal', 'crystal', 12, 40, 20, 0.7, 1.3);
  scatter('frost', 'pine', 12, 41, 20, 0.7, 1.1);
  scatter('storm', 'rockDark', 5, 42, 18);
  scatter('magma', 'lavaRock', 12, 43, 18, 0.7, 1.2);
  // jungle everywhere else on the island grass
  {
    const r = rand(77);
    for (let k = 0; k < 2600 && SPR.length < 420; k++) {
      const x = 40 + r() * 720, y = 60 + r() * 1130;
      if (!inPoly(GRASS, x, y) || inRegion(x, y) || nearPath(x, y, 24)) continue;
      if (inPoly(inset(GRASS, 6), x, y) === false) continue;
      if (SPR.some(s => Math.hypot(s.x - x, s.y - y) < (s.type === 'volcano' ? 160 : s.type === 'mineMtn' || s.type === 'peak' ? 70 : s.type === 'hut' ? 40 : s.type === 'waterfall' ? 50 : 20 * s.s + 4))) continue;
      const v = r(), nearSand = !inPoly(inset(GRASS, 30), x, y);
      add(nearSand ? (v < 0.75 ? 'palm' : 'bush') : v < 0.45 ? 'tree' : v < 0.7 ? 'palm' : v < 0.9 ? 'bush' : 'fern', x, y, 0.75 + r() * 0.45, (r() * 1e5) | 0);
    }
  }
  // beach palms and rocks on the sand
  {
    const r = rand(88);
    for (let i = 0; i < COAST.length; i++) {
      const a = COAST[i], b = GRASS[i], x = (a[0] * 0.45 + b[0] * 0.55), y = (a[1] * 0.45 + b[1] * 0.55);
      if (nearPath(x, y, 18) || inRegion(x, y) === 'frost' || inRegion(x, y) === 'crystal') continue;
      if (r() < 0.55) add('palm', x + (r() - 0.5) * 10, y, 0.85 + r() * 0.3, (r() * 1e5) | 0);
      else add('beachRock', x, y, 0.8 + r() * 0.4, (r() * 1e5) | 0);
    }
  }
  SPR.sort((p, q) => p.y - q.y);

  // ---------------- small drawing helpers ----------------
  const fsh = (ctx, x, y, rx, ry, a = 0.3) => { ctx.fillStyle = `rgba(20,40,20,${a * 0.75})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
  function leaf(ctx, x, y, len, ang, col, wid = 0.36) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = rgb(lift(col, -38)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * wid, len, 0); ctx.quadraticCurveTo(len * 0.5, len * wid, 0, 0); ctx.fill();
    ctx.fillStyle = rgb(lift(col, 22)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * wid, len, 0); ctx.quadraticCurveTo(len * 0.5, -len * wid * 0.1, 0, 0); ctx.fill();
    ctx.strokeStyle = rgb(lift(col, 75), 0.55); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(len * 0.12, -len * wid * 0.12); ctx.quadraticCurveTo(len * 0.5, -len * wid * 0.5, len * 0.8, -len * wid * 0.15); ctx.stroke();
    ctx.restore();
  }
  function stone(ctx, x, y, rx, ry, c, e) {
    ctx.fillStyle = rg(ctx, x - rx * 0.4, y - ry * 0.5, rx * 1.4, [lift(c, 50), c, e]);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(lift(e, -20), 0.8); ctx.lineWidth = 1; ctx.stroke();
  }
  function cone(ctx, x, y, w, h, cL, cR, e) {   // a lit-left mountain cone with its base at y
    ctx.fillStyle = lg(ctx, x - w, y, x + w, y, [cL, cR]);
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.4, y - h * 0.55, x, y - h); ctx.quadraticCurveTo(x + w * 0.45, y - h * 0.5, x + w, y); ctx.quadraticCurveTo(x, y + w * 0.18, x - w, y); ctx.fill();
    ctx.strokeStyle = e; ctx.lineWidth = 1.4; ctx.stroke();
  }
  function cloudPuff(ctx, x, y, s, top, bot, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = lg(ctx, 0, y - 14 * s, 0, y + 10 * s, [top, bot]);
    ctx.beginPath();
    for (const [dx, dy, r] of [[-18, 2, 11], [-6, -6, 14], [9, -4, 12], [20, 3, 9], [0, 4, 12]]) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
    ctx.fill(); ctx.restore();
  }

  // ---------------- sprites ----------------
  const DRAW = {
    palm(ctx, x, y, s, t, seed) {
      const r = rand(seed), lean = (r() - 0.5) * 0.6, h = 34 * s, sw = Math.sin(t * 1.2 + seed) * 1.5;
      fsh(ctx, x + 8 * s, y + 1, 14 * s, 4.5 * s, 0.3);
      const tx = x + lean * h + sw, ty = y - h;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * h * 0.2, y - h * 0.6, tx, ty); ctx.stroke();
      ctx.strokeStyle = '#a8763e'; ctx.lineWidth = 2.6 * s; ctx.stroke();
      ctx.strokeStyle = 'rgba(70,40,18,.55)'; ctx.lineWidth = 1; for (let k = 1; k < 6; k++) { const u = k / 6, px = x + (tx - x) * u * u * 0.9 + lean * 2, py = y - h * u; ctx.beginPath(); ctx.moveTo(px - 2.4 * s, py); ctx.lineTo(px + 2.4 * s, py + 1); ctx.stroke(); }
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.5 + (k > 3 ? 0.3 : -0.3) + Math.sin(t * 1.4 + seed + k) * 0.05;
        leaf(ctx, tx, ty, (17 + (k % 2) * 4) * s, a + Math.PI * (k < 3.5 ? 0 : 0) + (k < 3.5 ? -0.9 : 0.9) * 0.3 + (k - 3) * 0.25, k % 2 ? [74, 150, 60] : [96, 172, 70], 0.28);
      }
      leaf(ctx, tx, ty, 15 * s, Math.PI * 0.62, [58, 128, 50], 0.28); leaf(ctx, tx, ty, 15 * s, Math.PI * 0.38, [58, 128, 50], 0.28);
      ctx.fillStyle = rg(ctx, tx - 1, ty + 1, 4 * s, ['#c48a4a', '#6a3e1c']); for (const d of [-2.4, 2.4]) { ctx.beginPath(); ctx.arc(tx + d * s, ty + 2.5 * s, 2.4 * s, 0, TAU); ctx.fill(); }
    },
    tree(ctx, x, y, s, t, seed) {
      const r = rand(seed), hue = r();
      const c = hue < 0.33 ? [70, 138, 62] : hue < 0.66 ? [58, 122, 70] : [92, 148, 58];
      fsh(ctx, x + 6 * s, y + 2, 17 * s, 6 * s, 0.32);
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s);
      const puffs = [[-8, -16, 10], [8, -17, 10], [0, -25, 12], [-3, -12, 9], [6, -10, 8]];
      ctx.fillStyle = rgb(lift(c, -48)); ctx.beginPath(); for (const [dx, dy, rr] of puffs) { ctx.moveTo(x + dx * s + rr * s, y + dy * s + 1.5 * s); ctx.arc(x + dx * s, y + dy * s + 1.5 * s, rr * s, 0, TAU); } ctx.fill();
      ctx.fillStyle = rg(ctx, x - 7 * s, y - 28 * s, 30 * s, [lift(c, 60), c, lift(c, -30)]); ctx.beginPath(); for (const [dx, dy, rr] of puffs) { ctx.moveTo(x + dx * s + rr * s * 0.92, y + dy * s); ctx.arc(x + dx * s, y + dy * s, rr * s * 0.92, 0, TAU); } ctx.fill();
      ctx.fillStyle = 'rgba(230,255,190,.35)'; ctx.beginPath(); ctx.arc(x - 4 * s, y - 30 * s, 3.4 * s, 0, TAU); ctx.fill();
      if (r() < 0.35) { ctx.fillStyle = '#ff7a5a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 18 * s, y - (12 + r() * 14) * s, 1.6 * s, 0, TAU); ctx.fill(); } }
    },
    bush(ctx, x, y, s, t, seed) {
      fsh(ctx, x + 3, y + 1, 11 * s, 4 * s, 0.28);
      for (let k = 0; k < 5; k++) leaf(ctx, x, y - 1, 13 * s, -Math.PI / 2 + (k - 2) * 0.55 + Math.sin(t + seed + k) * 0.05, k % 2 ? [70, 140, 56] : [96, 166, 64], 0.34);
    },
    fern(ctx, x, y, s, t, seed) {
      fsh(ctx, x + 3, y + 1, 10 * s, 3.5 * s, 0.25);
      for (let k = 0; k < 6; k++) leaf(ctx, x, y, 15 * s, -Math.PI / 2 + (k - 2.5) * 0.48 + Math.sin(t * 1.3 + seed + k) * 0.06, [62, 150, 92], 0.2);
    },
    beachRock(ctx, x, y, s) { fsh(ctx, x + 2, y + 2, 8 * s, 3 * s, 0.25); stone(ctx, x, y - 2 * s, 7 * s, 5 * s, [170, 160, 150], [96, 88, 84]); },
    ruin(ctx, x, y, s, t, seed) {
      const r = rand(seed), h = (12 + r() * 14) * s, broken = r() < 0.5;
      fsh(ctx, x + 6, y + 1, 10 * s, 3.5 * s, 0.32);
      ctx.fillStyle = lg(ctx, x - 6 * s, 0, x + 6 * s, 0, ['#e2d4a8', '#a8946a', '#74643e']);
      ctx.beginPath(); ctx.rect(x - 5 * s, y - h, 10 * s, h); ctx.fill();
      ctx.strokeStyle = 'rgba(90,72,40,.7)'; ctx.lineWidth = 0.8; ctx.strokeRect(x - 5 * s, y - h, 10 * s, h);
      for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 5 * s, y - h * k / 3); ctx.lineTo(x + 5 * s, y - h * k / 3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(80,140,60,.7)'; ctx.beginPath(); ctx.ellipse(x - 3 * s, y - h * 0.35, 2.5 * s, 4 * s, 0.3, 0, TAU); ctx.fill();
      if (broken) { ctx.fillStyle = '#c9b88a'; ctx.beginPath(); ctx.moveTo(x - 5 * s, y - h); ctx.lineTo(x - 1 * s, y - h - 3 * s); ctx.lineTo(x + 2 * s, y - h + 1); ctx.lineTo(x + 5 * s, y - h - 2 * s); ctx.lineTo(x + 5 * s, y - h); ctx.fill(); }
      else {
        ctx.fillStyle = lg(ctx, x - 7 * s, 0, x + 7 * s, 0, ['#fff2a0', '#e8b030', '#9a6410']); ctx.fillRect(x - 7 * s, y - h - 3 * s, 14 * s, 3.5 * s);
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 6 * s, y - h - 2.6 * s, 6 * s, 0.9);
      }
    },
    pyramid(ctx, x, y, s, t) {
      shadow(ctx, x + 14, y + 4, 52, 14, 0.35);
      const steps = 5;
      for (let k = 0; k < steps; k++) {
        const w = 46 - k * 8, yy = y - k * 11, hh = 11;
        ctx.fillStyle = lg(ctx, x - w, 0, x + w, 0, ['#e8dab0', '#bba674', '#7c6a42']);
        ctx.fillRect(x - w, yy - hh, w * 2, hh);
        ctx.fillStyle = 'rgba(255,248,220,.45)'; ctx.fillRect(x - w, yy - hh, w * 2, 2);
        ctx.strokeStyle = 'rgba(96,78,44,.7)'; ctx.lineWidth = 0.8; ctx.strokeRect(x - w, yy - hh, w * 2, hh);
        for (let b = -w + 8; b < w; b += 9) { ctx.beginPath(); ctx.moveTo(x + b + (k % 2) * 4, yy - hh); ctx.lineTo(x + b + (k % 2) * 4, yy); ctx.stroke(); }
      }
      // stairs up the front
      ctx.fillStyle = lg(ctx, 0, y - 55, 0, y, ['#d8c896', '#a8945e']); ctx.beginPath(); ctx.moveTo(x - 6, y - 55); ctx.lineTo(x + 6, y - 55); ctx.lineTo(x + 10, y); ctx.lineTo(x - 10, y); ctx.fill();
      ctx.strokeStyle = 'rgba(110,90,50,.6)'; for (let k = 0; k < 9; k++) { const yy = y - k * 6; ctx.beginPath(); ctx.moveTo(x - 10 + k * 0.45, yy); ctx.lineTo(x + 10 - k * 0.45, yy); ctx.stroke(); }
      // golden shrine on top with an idol
      ctx.fillStyle = lg(ctx, x - 9, 0, x + 9, 0, ['#fff3a8', '#efb432', '#9c6410']); ctx.fillRect(x - 9, y - 70, 18, 14);
      ctx.fillStyle = '#5a3c10'; ctx.fillRect(x - 3.5, y - 66, 7, 10);
      ctx.fillStyle = lg(ctx, 0, y - 78, 0, y - 69, ['#fff6c0', '#e8a820']); ctx.beginPath(); ctx.moveTo(x - 12, y - 69); ctx.lineTo(x, y - 79); ctx.lineTo(x + 12, y - 69); ctx.fill();
      const tw = 0.5 + 0.5 * Math.sin(t * 2.2);
      glow(ctx, x, y - 72, 22, [255, 210, 90], 0.25 + 0.2 * tw);
      // vines draped over the steps
      ctx.strokeStyle = '#4c8a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 40, y - 22); ctx.quadraticCurveTo(x - 32, y - 8, x - 38, y); ctx.moveTo(x + 30, y - 33); ctx.quadraticCurveTo(x + 36, y - 18, x + 30, y - 8); ctx.stroke();
      for (const [lx, ly] of [[-38, -12], [-34, -4], [33, -24], [32, -14]]) leaf(ctx, x + lx, y + ly, 7, 0.6, [80, 150, 60]);
    },
    deadTree(ctx, x, y, s, t, seed) {
      fsh(ctx, x + 5, y + 1, 9 * s, 3 * s, 0.3);
      ctx.strokeStyle = '#4a3a24'; ctx.lineCap = 'round'; ctx.lineWidth = 3.6 * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 2 * s, y - 12 * s, x + 1 * s, y - 24 * s);
      ctx.moveTo(x, y - 12 * s); ctx.lineTo(x - 9 * s, y - 20 * s); ctx.moveTo(x + 0.5 * s, y - 18 * s); ctx.lineTo(x + 8 * s, y - 25 * s); ctx.stroke();
      ctx.strokeStyle = '#7a6440'; ctx.lineWidth = 1.4 * s; ctx.stroke();
      ctx.strokeStyle = 'rgba(150,180,90,.75)'; ctx.lineWidth = 1; const sw = Math.sin(t * 1.1 + seed) * 1.5;
      ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 19 * s); ctx.quadraticCurveTo(x - 8 * s + sw, y - 13 * s, x - 7 * s + sw, y - 9 * s); ctx.moveTo(x + 7 * s, y - 24 * s); ctx.quadraticCurveTo(x + 7 * s + sw, y - 18 * s, x + 8 * s + sw, y - 15 * s); ctx.stroke();
    },
    pool(ctx, x, y, s, t, seed) {
      ctx.fillStyle = rg(ctx, x - 3, y - 2, 13 * s, ['#e4ff6a', '#9ad41c', '#4c6a10']);
      ctx.beginPath(); ctx.ellipse(x, y, 13 * s, 6 * s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3e5212'; ctx.lineWidth = 1.2; ctx.stroke();
      glow(ctx, x, y, 18 * s, [190, 255, 60], 0.18);
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.6 + k / 3 + seed * 0.13) % 1, bx = x + (k - 1) * 5 * s, by = y - ph * 4;
        ctx.strokeStyle = `rgba(240,255,160,${0.8 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 1 + ph * 2.4, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - 5 * s, y - 2 * s, 3 * s, 1 * s, 0, 0, TAU); ctx.fill();
    },
    reed(ctx, x, y, s, t, seed) {
      const sw = Math.sin(t * 1.5 + seed) * 1.2;
      ctx.strokeStyle = '#6a7a2a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 2, y); ctx.quadraticCurveTo(x + k * 3, y - 7 * s, x + k * 3.5 + sw, y - 13 * s); ctx.stroke(); }
      ctx.fillStyle = '#6a4424'; ctx.beginPath(); ctx.ellipse(x + 0.5 + sw, y - 13 * s, 1.4, 3.2, 0, 0, TAU); ctx.fill();
    },
    shroom(ctx, x, y, s, t, seed) {
      const r = rand(seed), pink = r() < 0.45, C = pink ? [255, 110, 210] : [80, 230, 255], h = (10 + r() * 10) * s, w = (9 + r() * 5) * s;
      const pul = 0.6 + 0.4 * Math.sin(t * 2 + seed);
      glow(ctx, x, y - h, w * 2.6, C, 0.2 * pul);
      fsh(ctx, x + 3, y + 1, w * 0.8, w * 0.3, 0.3);
      ctx.fillStyle = lg(ctx, x - 3 * s, 0, x + 3 * s, 0, ['#f6f0e4', '#c6bca8']); ctx.beginPath(); ctx.moveTo(x - 2.4 * s, y); ctx.quadraticCurveTo(x - 1.4 * s, y - h * 0.6, x - 2 * s, y - h); ctx.lineTo(x + 2 * s, y - h); ctx.quadraticCurveTo(x + 1.4 * s, y - h * 0.6, x + 2.4 * s, y); ctx.fill();
      ctx.fillStyle = rg(ctx, x - w * 0.4, y - h - w * 0.4, w * 1.3, [rgb(lift(C, 80)), rgb(C), rgb(lift(C, -110))]);
      ctx.beginPath(); ctx.moveTo(x - w, y - h + 1); ctx.quadraticCurveTo(x - w, y - h - w * 0.9, x, y - h - w * 0.85); ctx.quadraticCurveTo(x + w, y - h - w * 0.9, x + w, y - h + 1); ctx.quadraticCurveTo(x, y - h + w * 0.25, x - w, y - h + 1); ctx.fill();
      ctx.strokeStyle = rgb(lift(C, -130), 0.8); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; for (const [dx, dy, rr] of [[-0.45, -0.45, 0.16], [0.2, -0.6, 0.12], [0.5, -0.3, 0.1]]) { ctx.beginPath(); ctx.arc(x + dx * w, y - h + dy * w, rr * w, 0, TAU); ctx.fill(); }
    },
    rock(ctx, x, y, s) { fsh(ctx, x + 4, y + 2, 11 * s, 4 * s, 0.3); stone(ctx, x, y - 4 * s, 10 * s, 7 * s, [170, 128, 86], [96, 64, 36]); stone(ctx, x + 6 * s, y - 1, 5 * s, 4 * s, [150, 110, 72], [90, 60, 34]); },
    lantern(ctx, x, y, s, t, seed) {
      ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 20); ctx.lineTo(x + 6, y - 20); ctx.stroke();
      const f = 0.75 + 0.25 * Math.sin(t * 7 + seed);
      glow(ctx, x + 6, y - 14, 18, [255, 190, 80], 0.4 * f);
      ctx.fillStyle = lg(ctx, 0, y - 18, 0, y - 10, ['#fff3b0', '#ffb030']); ctx.fillRect(x + 3.5, y - 18, 5, 7);
      ctx.strokeStyle = '#6a3c10'; ctx.lineWidth = 1; ctx.strokeRect(x + 3.5, y - 18, 5, 7);
    },
    basalt(ctx, x, y, s, t, seed) {
      const r = rand(seed);
      fsh(ctx, x + 5, y + 2, 13 * s, 4.5 * s, 0.35);
      for (let k = 0; k < 4; k++) {
        const cx = x + (k - 1.5) * 6 * s, h = (10 + r() * 16) * s, w = 3.2 * s, cy = y + (k % 2) * 2;
        ctx.fillStyle = lg(ctx, cx - w, 0, cx + w, 0, ['#8a90d8', '#4c5094', '#2c2e62']); ctx.fillRect(cx - w, cy - h, w * 2, h);
        ctx.fillStyle = rg(ctx, cx - 1, cy - h - 1, w * 1.4, ['#c8d2ff', '#7c84cc']); ctx.beginPath(); ctx.ellipse(cx, cy - h, w, w * 0.55, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(30,30,80,.7)'; ctx.lineWidth = 0.8; ctx.strokeRect(cx - w, cy - h, w * 2, h);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,210,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 6 * s); ctx.lineTo(x - 12 * s, y - 18 * s); ctx.stroke(); ctx.restore();
    },
    crystal(ctx, x, y, s, t, seed) {
      const r = rand(seed), pink = r() < 0.4, A = pink ? ['#fff0f8', '#ff74c4', '#a42a7c', '#5c1446'] : ['#ffe2fb', '#c06ae4', '#5e2896', '#3c1662'];
      const tw = Math.max(0, Math.sin(t * 1.7 + seed));
      glow(ctx, x, y - 10 * s, 26 * s, pink ? [255, 130, 210] : [220, 140, 255], 0.16 + tw * 0.12);
      fsh(ctx, x + 4, y + 1, 10 * s, 3.5 * s, 0.3);
      for (const [dx, h, a] of [[-5, 14, -0.35], [5, 12, 0.4], [0, 22, 0.05]]) {
        ctx.save(); ctx.translate(x + dx * s, y); ctx.rotate(a);
        const hh = h * s, w = 4.2 * s;
        ctx.fillStyle = lg(ctx, -w, 0, w, 0, [A[0], A[1], A[2]]);
        ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -hh * 0.75); ctx.lineTo(0, -hh); ctx.lineTo(w, -hh * 0.75); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = A[3]; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-w, -hh * 0.75); ctx.lineTo(0, -hh); ctx.lineTo(0, 0); ctx.lineTo(-w, 0); ctx.fill();
        ctx.restore();
      }
      if (tw > 0.85) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,255,.9)'; const sx = x + 1, sy = y - 20 * s, rr = 4 * (tw - 0.85) / 0.15; ctx.beginPath(); ctx.moveTo(sx, sy - rr); ctx.lineTo(sx + rr * 0.25, sy); ctx.lineTo(sx, sy + rr); ctx.lineTo(sx - rr * 0.25, sy); ctx.fill(); ctx.beginPath(); ctx.moveTo(sx - rr, sy); ctx.lineTo(sx, sy - rr * 0.25); ctx.lineTo(sx + rr, sy); ctx.lineTo(sx, sy + rr * 0.25); ctx.fill(); ctx.restore(); }
    },
    pine(ctx, x, y, s) {
      fsh(ctx, x + 5, y + 1, 9 * s, 3 * s, 0.25);
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(x - 1.5 * s, y - 5 * s, 3 * s, 5 * s);
      for (let k = 0; k < 3; k++) {
        const yy = y - 4 * s - k * 7 * s, w = (10 - k * 2.6) * s;
        ctx.fillStyle = lg(ctx, x - w, 0, x + w, 0, ['#4c9a86', '#2c6a62', '#1c4a48']);
        ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 11 * s); ctx.lineTo(x + w, yy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(250,253,255,.95)'; ctx.beginPath(); ctx.moveTo(x - w * 0.55, yy - 5 * s); ctx.lineTo(x, yy - 11 * s); ctx.lineTo(x + w * 0.4, yy - 5.5 * s); ctx.quadraticCurveTo(x, yy - 4 * s, x - w * 0.55, yy - 5 * s); ctx.fill();
      }
    },
    rockDark(ctx, x, y, s) { fsh(ctx, x + 4, y + 2, 10 * s, 4 * s, 0.35); stone(ctx, x, y - 4 * s, 9 * s, 7 * s, [104, 100, 156], [44, 42, 84]); },
    lavaRock(ctx, x, y, s, t, seed) {
      fsh(ctx, x + 4, y + 2, 10 * s, 4 * s, 0.35);
      stone(ctx, x, y - 4 * s, 9 * s, 6.5 * s, [92, 62, 56], [40, 22, 20]);
      const f = 0.6 + 0.4 * Math.sin(t * 3 + seed);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,140,40,${0.7 * f})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 5 * s, y - 5 * s); ctx.lineTo(x - 1 * s, y - 3 * s); ctx.lineTo(x + 2 * s, y - 7 * s); ctx.lineTo(x + 6 * s, y - 4 * s); ctx.stroke(); ctx.restore();
    },
    hut(ctx, x, y, s, t) {
      shadow(ctx, x + 10, y + 3, 30, 9, 0.35);
      // stilts + platform
      ctx.fillStyle = '#6a4424'; for (const dx of [-18, -6, 6, 18]) ctx.fillRect(x + dx - 1.5, y - 10, 3, 10);
      ctx.fillStyle = lg(ctx, 0, y - 14, 0, y - 9, ['#c49660', '#7a5228']); ctx.fillRect(x - 24, y - 14, 48, 5);
      // walls
      ctx.fillStyle = lg(ctx, x - 18, 0, x + 18, 0, ['#e2b878', '#a8763e', '#7a5226']); ctx.fillRect(x - 17, y - 32, 34, 18);
      ctx.strokeStyle = 'rgba(100,60,24,.6)'; ctx.lineWidth = 0.8; for (let k = -14; k <= 14; k += 4) { ctx.beginPath(); ctx.moveTo(x + k, y - 32); ctx.lineTo(x + k, y - 14); ctx.stroke(); }
      ctx.fillStyle = '#4a2c12'; ctx.fillRect(x - 4, y - 27, 8, 13);
      // thatch roof
      ctx.fillStyle = lg(ctx, x - 26, y - 50, x + 26, y - 30, ['#f6dc8a', '#d4a440', '#94681c']);
      ctx.beginPath(); ctx.moveTo(x - 26, y - 29); ctx.lineTo(x, y - 52); ctx.lineTo(x + 26, y - 29); ctx.quadraticCurveTo(x, y - 25, x - 26, y - 29); ctx.fill();
      ctx.strokeStyle = 'rgba(140,96,30,.7)'; ctx.lineWidth = 0.9; for (let k = -20; k <= 20; k += 5) { ctx.beginPath(); ctx.moveTo(x + k * 0.2, y - 49); ctx.lineTo(x + k, y - 29); ctx.stroke(); }
      // flag
      const fl = Math.sin(t * 4) * 2;
      ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y - 52); ctx.lineTo(x, y - 68); ctx.stroke();
      ctx.fillStyle = lg(ctx, x, 0, x + 16, 0, ['#ff5a3a', '#c02a1a']); ctx.beginPath(); ctx.moveTo(x, y - 68); ctx.quadraticCurveTo(x + 8, y - 68 + fl, x + 16, y - 64 + fl); ctx.quadraticCurveTo(x + 8, y - 60 - fl, x, y - 60); ctx.fill();
      // the launch pad: a ring of coconuts
      ctx.fillStyle = rg(ctx, x + 30, y - 4, 10, ['#d9a066', '#5a341a']); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 30 + k * 6, y - 2 - (k === 1 ? 3 : 0), 3.6, 0, TAU); ctx.fill(); }
    },
    waterfall(ctx, x, y, s, t) {
      // a cliff on the lagoon's north shore with a waterfall pouring into it
      ctx.fillStyle = lg(ctx, x - 40, 0, x + 40, 0, ['#9a8a6a', '#6a5a44', '#40362a']);
      ctx.beginPath(); ctx.moveTo(x - 44, y + 4); ctx.quadraticCurveTo(x - 40, y - 40, x - 10, y - 46); ctx.quadraticCurveTo(x + 30, y - 50, x + 44, y + 2); ctx.quadraticCurveTo(x, y + 12, x - 44, y + 4); ctx.fill();
      ctx.fillStyle = '#5a9a44'; ctx.beginPath(); ctx.moveTo(x - 40, y - 26); ctx.quadraticCurveTo(x - 30, y - 50, x, y - 48); ctx.quadraticCurveTo(x + 30, y - 52, x + 40, y - 18); ctx.quadraticCurveTo(x, y - 40, x - 40, y - 26); ctx.fill();
      ctx.fillStyle = lg(ctx, x - 8, 0, x + 8, 0, ['rgba(220,250,255,.95)', 'rgba(130,210,240,.9)', 'rgba(220,250,255,.95)']); ctx.fillRect(x - 8, y - 40, 16, 44);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { const off = (t * 40 + k * 11) % 44; ctx.beginPath(); ctx.moveTo(x - 6 + k * 4, y - 40 + off); ctx.lineTo(x - 6 + k * 4, y - 34 + off); ctx.stroke(); }
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + t * 2; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 10, y + 4 + Math.sin(a) * 3, 3, 0, TAU); ctx.fill(); }
    },
    mineMtn(ctx, x, y, s, t) {
      shadow(ctx, x + 14, y + 6, 74, 18, 0.35);
      cone(ctx, x - 30, y + 4, 52, 70, '#c09468', '#6a4628', '#5a3a1e');
      cone(ctx, x + 18, y + 8, 62, 96, '#d0a476', '#6e4a2a', '#5a3a1e');
      // strata lines
      ctx.strokeStyle = 'rgba(90,56,26,.45)'; ctx.lineWidth = 1.2;
      for (const [yy, w] of [[-30, 34], [-52, 22], [-14, 48]]) { ctx.beginPath(); ctx.moveTo(x + 18 - w, y + yy); ctx.quadraticCurveTo(x + 18, y + yy + 6, x + 18 + w, y + yy - 2); ctx.stroke(); }
      // rocky outcrops and glinting gold veins
      ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 1.4;
      for (const [vx, vy] of [[-22, -36], [36, -62], [52, -24], [-50, -6]]) { ctx.beginPath(); ctx.moveTo(x + vx, y + vy); ctx.lineTo(x + vx + 5, y + vy + 3); ctx.lineTo(x + vx + 9, y + vy + 1); ctx.stroke(); }
      for (let k = 0; k < 4; k++) { const tw = Math.max(0, Math.sin(t * 2.3 + k * 1.7)); if (tw < 0.7) continue; const [vx, vy] = [[-22, -36], [36, -62], [52, -24], [-50, -6]][k]; glow(ctx, x + vx + 5, y + vy + 2, 8, [255, 230, 120], (tw - 0.7) * 2); }
      // the mine entrance with timber frame
      const ex = x + 8, ey = y + 4;
      ctx.fillStyle = '#1a0e08'; ctx.beginPath(); ctx.moveTo(ex - 13, ey); ctx.lineTo(ex - 13, ey - 18); ctx.quadraticCurveTo(ex, ey - 28, ex + 13, ey - 18); ctx.lineTo(ex + 13, ey); ctx.fill();
      ctx.fillStyle = lg(ctx, 0, ey - 26, 0, ey, ['#c48a4a', '#6a4220']); ctx.fillRect(ex - 16, ey - 22, 4, 22); ctx.fillRect(ex + 12, ey - 22, 4, 22); ctx.fillRect(ex - 18, ey - 26, 36, 5);
      glow(ctx, ex, ey - 8, 18, [255, 170, 70], 0.25 + 0.1 * Math.sin(t * 5));
      // rails out of the mine + a cart of gold
      ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.lineTo(ex - 16, ey + 30); ctx.moveTo(ex + 5, ey); ctx.lineTo(ex - 4, ey + 30); ctx.stroke();
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 1.6; for (let k = 0; k < 5; k++) { const u = k / 5; ctx.beginPath(); ctx.moveTo(ex - 8 - u * 12, ey + 3 + u * 26); ctx.lineTo(ex + 8 - u * 12, ey + 3 + u * 26); ctx.stroke(); }
      const cx = ex - 16, cy = ey + 22;
      ctx.fillStyle = lg(ctx, cx - 9, 0, cx + 9, 0, ['#9a9aa8', '#5a5a66']); ctx.beginPath(); ctx.moveTo(cx - 9, cy - 8); ctx.lineTo(cx + 9, cy - 8); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx - 7, cy); ctx.fill();
      ctx.fillStyle = rg(ctx, cx - 2, cy - 11, 8, ['#fff6b0', '#f0b42a', '#9a6410']); ctx.beginPath(); ctx.ellipse(cx, cy - 8, 8, 4, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2a2a30'; for (const d of [-4, 4]) { ctx.beginPath(); ctx.arc(cx + d, cy + 1, 2, 0, TAU); ctx.fill(); }
      // snowless summit flag
      ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 18, y - 88); ctx.lineTo(x + 18, y - 104); ctx.stroke();
      ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.moveTo(x + 18, y - 104); ctx.lineTo(x + 30, y - 100 + Math.sin(t * 3) * 1.5); ctx.lineTo(x + 18, y - 96); ctx.fill();
    },
    peak(ctx, x, y, s, t) {
      shadow(ctx, x + 14, y + 6, 70, 16, 0.3);
      cone(ctx, x - 36, y + 6, 46, 72, '#b6c8dc', '#5a7090', '#4a6080');
      cone(ctx, x + 10, y + 8, 60, 118, '#c4d6ea', '#56708e', '#4a6080');
      // snow caps
      for (const [cx, by, w, h] of [[x + 10, y + 8, 60, 118], [x - 36, y + 6, 46, 72]]) {
        ctx.fillStyle = lg(ctx, cx - w, 0, cx + w, 0, ['#ffffff', '#e4f2ff', '#a8c4e2']);
        ctx.beginPath(); ctx.moveTo(cx, by - h);
        ctx.quadraticCurveTo(cx - w * 0.2, by - h * 0.75, cx - w * 0.42, by - h * 0.5);
        ctx.lineTo(cx - w * 0.25, by - h * 0.56); ctx.lineTo(cx - w * 0.12, by - h * 0.48); ctx.lineTo(cx + w * 0.05, by - h * 0.58); ctx.lineTo(cx + w * 0.2, by - h * 0.5); ctx.lineTo(cx + w * 0.38, by - h * 0.56);
        ctx.quadraticCurveTo(cx + w * 0.2, by - h * 0.78, cx, by - h); ctx.fill();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y - 106); ctx.quadraticCurveTo(x - 4, y - 90, x - 14, y - 70); ctx.stroke(); ctx.restore();
      // wind-blown snow off the summit
      for (let k = 0; k < 6; k++) { const ph = (t * 0.5 + k / 6) % 1; ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + 10 + ph * 50, y - 110 + Math.sin(ph * 6 + k) * 4 + ph * 10, 1.6 + ph * 2.5, 0, TAU); ctx.fill(); }
    },
    stormCliff(ctx, x, y, s, t) {
      shadow(ctx, x + 10, y + 5, 46, 12, 0.35);
      ctx.fillStyle = lg(ctx, x - 40, 0, x + 40, 0, ['#8a86c8', '#4a467e', '#2c2a58']);
      ctx.beginPath(); ctx.moveTo(x - 40, y + 4); ctx.lineTo(x - 34, y - 26); ctx.lineTo(x - 18, y - 40); ctx.lineTo(x - 4, y - 36); ctx.lineTo(x + 14, y - 50); ctx.lineTo(x + 30, y - 30); ctx.lineTo(x + 40, y + 2); ctx.quadraticCurveTo(x, y + 12, x - 40, y + 4); ctx.fill();
      ctx.strokeStyle = '#26244c'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,200,255,.45)'; ctx.beginPath(); ctx.moveTo(x - 34, y - 26); ctx.lineTo(x - 18, y - 40); ctx.lineTo(x - 4, y - 36); ctx.lineTo(x + 14, y - 50); ctx.stroke();
      // lightning rod tower
      ctx.strokeStyle = '#9a9aa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, y - 50); ctx.lineTo(x + 14, y - 72); ctx.stroke();
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x + 14, y - 73, 2.4, 0, TAU); ctx.fill();
      // the storm cloud and its lightning
      const cy = y - 78, drift = Math.sin(t * 0.4) * 6;
      const flash = (t * 0.7) % 1 < 0.06 || ((t * 0.7) % 1 > 0.1 && (t * 0.7) % 1 < 0.13);
      if (flash) {
        glow(ctx, x + 14, y - 74, 70, [200, 210, 255], 0.5);
        ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 2.4; ctx.lineJoin = 'miter';
        ctx.beginPath(); ctx.moveTo(x + 8 + drift, cy + 8); ctx.lineTo(x + 18, cy + 16); ctx.lineTo(x + 10, cy + 20); ctx.lineTo(x + 14, y - 73); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,190,255,.6)'; ctx.lineWidth = 5; ctx.stroke();
      }
      cloudPuff(ctx, x + 6 + drift, cy, 1.5, flash ? '#c8ccff' : '#7e7cb8', '#3a3870');
      cloudPuff(ctx, x - 22 + drift * 0.6, cy + 8, 1.0, '#6c6aa6', '#34326a');
      // rain streaks
      ctx.strokeStyle = 'rgba(180,190,255,.45)'; ctx.lineWidth = 1;
      for (let k = 0; k < 10; k++) { const rx = x - 30 + k * 7 + drift, ph = (t * 1.6 + k * 0.37) % 1; ctx.beginPath(); ctx.moveTo(rx - ph * 4, cy + 10 + ph * 50); ctx.lineTo(rx - ph * 4 - 2, cy + 18 + ph * 50); ctx.stroke(); }
    },
    volcano(ctx, x, y, s, t) {
      shadow(ctx, x + 18, y + 8, 150, 34, 0.35);
      const top = y - 124, cw = 44;
      // body
      ctx.fillStyle = lg(ctx, x - 140, 0, x + 140, 0, ['#a4664a', '#6e3a2a', '#3e1e18']);
      ctx.beginPath(); ctx.moveTo(x - 146, y); ctx.quadraticCurveTo(x - 80, y - 30, x - cw, top); ctx.lineTo(x + cw, top); ctx.quadraticCurveTo(x + 84, y - 30, x + 146, y); ctx.quadraticCurveTo(x, y + 34, x - 146, y); ctx.fill();
      ctx.strokeStyle = '#3a1a12'; ctx.lineWidth = 1.6; ctx.stroke();
      // ridges
      ctx.strokeStyle = 'rgba(60,24,16,.45)'; ctx.lineWidth = 2;
      for (const [x0, x1] of [[-30, -90], [-12, -40], [26, 70], [36, 120]]) { ctx.beginPath(); ctx.moveTo(x + x0, top + 8); ctx.quadraticCurveTo(x + (x0 + x1) * 0.5, y - 60, x + x1, y + 6); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,200,160,.25)'; ctx.beginPath(); ctx.moveTo(x - cw + 4, top + 4); ctx.quadraticCurveTo(x - 80, y - 40, x - 126, y - 6); ctx.stroke();
      // lava rivers
      const f = 0.75 + 0.25 * Math.sin(t * 2.4);
      for (const [pts, w] of [[[[x - 22, top + 6], [x - 40, y - 70], [x - 70, y - 30], [x - 64, y + 8]], 5], [[[x + 28, top + 6], [x + 50, y - 60], [x + 92, y - 40], [x + 118, y + 4]], 4.5]]) {
        ctx.save(); ctx.lineCap = 'round';
        const path = () => { ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); };
        path(); ctx.strokeStyle = '#5a1a0c'; ctx.lineWidth = w + 3; ctx.stroke();
        path(); ctx.strokeStyle = lg(ctx, 0, top, 0, y, ['#fff2a0', '#ff9a2a', '#e0401a']); ctx.lineWidth = w; ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; path(); ctx.strokeStyle = `rgba(255,140,40,${0.25 * f})`; ctx.lineWidth = w + 10; ctx.stroke();
        path(); ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = 'rgba(255,255,200,.8)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
      }
      // crater rim and lava lake
      ctx.fillStyle = lg(ctx, x - cw, 0, x + cw, 0, ['#8a4c36', '#4a2218']); ctx.beginPath(); ctx.ellipse(x, top, cw + 6, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rg(ctx, x, top + 2, cw, ['#fff6b0', '#ffb030', '#e04a18', '#7a1a0c']); ctx.beginPath(); ctx.ellipse(x, top + 1, cw - 2, 10, 0, 0, TAU); ctx.fill();
      glow(ctx, x, top, 90, [255, 120, 40], 0.3 * f);
      // smoke plume rising and drifting
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.16 + k / 6) % 1, px = x + Math.sin(ph * 4 + k) * 6 - ph * 26, py = top - 14 - ph * 84, r = 8 + ph * 16;
        const a = Math.sin(Math.PI * Math.min(1, ph * 1.3)) * 0.55;
        cloudPuff(ctx, px, py, r / 16, `rgba(214,196,190,${a})`, `rgba(130,104,104,${a})`);
      }
      // embers
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 14; k++) { const ph = (t * 0.5 + k * 0.137) % 1, ex = x + Math.sin(k * 7.3) * 30 * ph + Math.sin(t * 2 + k) * 4, ey = top - ph * 90; ctx.fillStyle = `rgba(255,${150 + 80 * (1 - ph)},60,${1 - ph})`; ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
  };
  const SPR_R = { volcano: 200, mineMtn: 120, peak: 140, stormCliff: 130, pyramid: 90, hut: 70, waterfall: 60 };

  // ---------------- ground ----------------
  function drawSea(ctx, t, v) {
    ctx.fillStyle = '#2a7ea8'; ctx.beginPath(); ctx.rect(v.x - 2, v.y - 2, v.w + 4, v.h + 4); closedSub(ctx, GRASS); ctx.fill('evenodd');
    // soft light patches
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) { const px = (k * 173) % W, py = (k * 311) % H; if (px + 160 < v.x || px - 160 > v.x + v.w || py + 160 < v.y || py - 160 > v.y + v.h) continue; ctx.fillStyle = rg(ctx, px, py, 160, ['rgba(120,220,240,.10)', 'rgba(120,220,240,0)']); ctx.fillRect(px - 160, py - 160, 320, 320); }
    ctx.restore();
    // little wave crests on a grid
    ctx.strokeStyle = 'rgba(220,250,255,.45)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    const r = rand(5);
    for (let gy = 0; gy < H; gy += 34) for (let gx = 0; gx < W; gx += 46) {
      const ox = r() * 30, oy = r() * 20, ph = r() * TAU;
      const x = gx + ox + Math.sin(t * 0.6 + ph) * 4, y = gy + oy;
      if (x < v.x - 20 || x > v.x + v.w + 20 || y < v.y - 20 || y > v.y + v.h + 20) continue;
      const a = 0.5 + 0.5 * Math.sin(t * 1.3 + ph);
      if (a < 0.25) continue;
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x, y - 3, x + 6, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawIsland(ctx, t) {
    // shallow water halo and animated foam
    ctx.save(); ctx.lineJoin = 'round';
    closed(ctx, SHALLOW2); closedSub(ctx, SHALLOW1); ctx.fillStyle = 'rgba(110,230,230,.3)'; ctx.fill('evenodd');
    closed(ctx, SHALLOW1); closedSub(ctx, GRASS); ctx.fillStyle = '#7ad6d0'; ctx.fill('evenodd'); closed(ctx, SHALLOW1);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.6; ctx.setLineDash([16, 20]); ctx.lineDashOffset = -t * 6; ctx.stroke(); ctx.setLineDash([]);
    closed(ctx, COAST); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3 + Math.sin(t * 1.6) * 1.2; ctx.stroke();
    // sand
    closed(ctx, COAST); closedSub(ctx, inset(GRASS, 4)); ctx.fillStyle = '#f2d494'; ctx.fill('evenodd'); closed(ctx, COAST);
    ctx.strokeStyle = '#c8955a'; ctx.lineWidth = 1.5; ctx.stroke();
    // wet sand edge
    ctx.strokeStyle = 'rgba(180,130,80,.35)'; ctx.lineWidth = 6; ctx.stroke();
    // grass with a darker coloured edge (no black)
    closed(ctx, GRASS); ctx.fillStyle = '#74b850'; ctx.fill();
    ctx.strokeStyle = '#3e7a30'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,240,140,.45)'; ctx.lineWidth = 1; ctx.save(); ctx.translate(-1.5, -1.5); ctx.stroke(); ctx.restore();
    ctx.restore();
    // grass variation: lighter meadows and darker shade, plus flowers
    for (const [x, y, rx, ry, c] of MEADOWS) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
    for (const [x, y, c] of FLOWERS) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(x, y, 0.6, 0, TAU); ctx.fill(); }
    drawCreek(ctx, t);
    // grass texture tufts (seeded, constant)
    ctx.strokeStyle = 'rgba(40,100,40,.28)'; ctx.lineWidth = 1;
    const r = rand(9);
    ctx.beginPath();
    for (let k = 0; k < 500; k++) { const x = 40 + r() * 720, y = 60 + r() * 1130; if (!GRASS_TEST(x, y)) continue; ctx.moveTo(x - 2, y); ctx.lineTo(x - 1, y - 3); ctx.moveTo(x + 1, y); ctx.lineTo(x + 2, y - 3); }
    ctx.stroke();
  }
  const MEADOWS = (() => { const r = rand(61), o = []; for (let k = 0; k < 400 && o.length < 60; k++) { const x = 60 + r() * 680, y = 80 + r() * 1090; if (!inPoly(inset(GRASS, 30), x, y) || inRegion(x, y)) continue; const lt = r() < 0.55; o.push([x, y, 26 + r() * 40, 12 + r() * 18, lt ? 'rgba(170,224,110,.28)' : 'rgba(40,100,40,.16)']); } return o; })();
  const FLOWERS = (() => { const r = rand(62), o = []; for (let k = 0; k < 900 && o.length < 120; k++) { const x = 40 + r() * 720, y = 60 + r() * 1130; if (!inPoly(GRASS, x, y) || inRegion(x, y) || nearPath(x, y, 10)) continue; o.push([x, y, ['#ff7aa8', '#ffd84a', '#ffffff', '#c890ff'][(r() * 4) | 0]]); } return o; })();
  // a creek from the swamp down to the south-west beach (crossed by bridges on 3-7 and 2-3)
  const CREEK = [[270, 930], [240, 975], [244, 1030], [214, 1080], [196, 1140], [176, 1168]];
  function drawCreek(ctx, t) {
    const path = () => { ctx.beginPath(); ctx.moveTo(...CREEK[0]); for (let i = 1; i < CREEK.length - 1; i++) { const m = [(CREEK[i][0] + CREEK[i + 1][0]) / 2, (CREEK[i][1] + CREEK[i + 1][1]) / 2]; ctx.quadraticCurveTo(...CREEK[i], ...m); } ctx.lineTo(...CREEK[CREEK.length - 1]); };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path(); ctx.strokeStyle = '#e8c88a'; ctx.lineWidth = 15; ctx.stroke();
    path(); ctx.strokeStyle = '#3a9ab0'; ctx.lineWidth = 10; ctx.stroke();
    path(); ctx.strokeStyle = '#6ad0d8'; ctx.lineWidth = 6; ctx.stroke();
    path(); ctx.setLineDash([4, 12]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }
  const GRASS_OK = (() => { const r = rand(9), o = []; for (let k = 0; k < 500; k++) { const x = 40 + r() * 720, y = 60 + r() * 1130; o.push(inPoly(GRASS, x, y) && !inRegion(x, y)); } return o; })();
  let gi = 0; const GRASS_TEST = () => GRASS_OK[gi++ % 500];

  function drawRegions(ctx, t) {
    for (const [k, R] of Object.entries(REG)) {
      const raised = RAISED[k] || 0;
      closed(ctx, R.blob); ctx.fillStyle = 'rgba(30,60,20,.25)'; ctx.save(); ctx.translate(3, raised + 4); ctx.fill(); ctx.restore();
      if (raised) {
        closed(ctx, R.blob); ctx.save(); ctx.translate(0, raised); ctx.fillStyle = rgb(lift(R.e, -12)); ctx.fill();
        ctx.strokeStyle = rgb(lift(R.e, -34)); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        // strata streaks on the cliff face
        ctx.save(); closed(ctx, R.blob); ctx.translate(0, raised * 0.5); ctx.strokeStyle = rgb(lift(R.e, 22), 0.5); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
      closed(ctx, R.blob);
      const xs = R.blob.map(p => p[0]), ys = R.blob.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, rr = Math.max(...xs) - cx;
      ctx.fillStyle = rg(ctx, cx - rr * 0.3, cy - rr * 0.3, rr * 1.4, [lift(R.c, 26), R.c, lift(R.c, -18)]); ctx.fill();
      ctx.strokeStyle = rgb(R.e, 0.9); ctx.lineWidth = 2; ctx.stroke();
    }
    // temple flagstones
    ctx.strokeStyle = 'rgba(110,94,60,.5)'; ctx.lineWidth = 1;
    { const r = rand(51); for (let k = 0; k < 40; k++) { const x = 40 + r() * 120, y = 660 + r() * 290; if (!inPoly(REG.temple.blob, x, y)) continue; ctx.strokeRect(x, y, 10 + r() * 6, 6 + r() * 4); } }
    // bog murk ripples
    ctx.fillStyle = 'rgba(70,86,30,.5)';
    { const r = rand(52); for (let k = 0; k < 14; k++) { const x = 230 + r() * 150, y = 750 + r() * 200; if (!inPoly(REG.bog.blob, x, y)) continue; ctx.beginPath(); ctx.ellipse(x, y, 10 + r() * 10, 4 + r() * 3, 0, 0, TAU); ctx.fill(); } }
    // grotto glow floor
    glow(ctx, 170, 528, 110, [120, 90, 220], 0.16 + 0.05 * Math.sin(t * 1.5));
    // frost: icy sheen and snow patches over the edge
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    { const r = rand(53); for (let k = 0; k < 10; k++) { const x = 550 + r() * 170, y = 210 + r() * 160; if (!inPoly(REG.frost.blob, x, y)) continue; ctx.beginPath(); ctx.ellipse(x, y, 8 + r() * 10, 3 + r() * 3, 0, 0, TAU); ctx.fill(); } }
    // magma: cracks glowing in the ground
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const f = 0.6 + 0.4 * Math.sin(t * 2);
    ctx.strokeStyle = `rgba(255,110,30,${0.45 * f})`; ctx.lineWidth = 1.6;
    { const r = rand(54); ctx.beginPath(); for (let k = 0; k < 26; k++) { let x = 300 + r() * 360, y = 450 + r() * 230; if (!inPoly(REG.magma.blob, x, y)) continue; ctx.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 18; y += (r() - 0.3) * 10; ctx.lineTo(x, y); } } ctx.stroke(); }
    ctx.restore();
    // lagoon
    closed(ctx, LAGOON); ctx.strokeStyle = '#f0d694'; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = '#c8a066'; ctx.lineWidth = 1.5; ctx.save(); ctx.translate(0, 6); ctx.stroke(); ctx.restore();
    closed(ctx, LAGOON); ctx.fillStyle = rg(ctx, 80, 350, 130, ['#8ef0e4', '#3cc4c8', '#1e8aa0']); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 5; ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); closed(ctx, LAGOON); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 9; k++) { const y = 280 + k * 22, x = 50 + ((k * 37) % 80) + Math.sin(t + k) * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 3, x + 16, y); ctx.stroke(); }
    // lily pads
    for (const [x, y] of [[60, 470], [140, 400], [70, 330], [150, 452]]) { ctx.fillStyle = lg(ctx, x - 6, y - 4, x + 6, y + 4, ['#9ade6a', '#3e8a3a']); ctx.beginPath(); ctx.ellipse(x, y, 7, 4, 0, 0.4, TAU); ctx.lineTo(x, y); ctx.fill(); ctx.fillStyle = '#ff8ac8'; ctx.beginPath(); ctx.arc(x + 2, y - 1, 1.6, 0, TAU); ctx.fill(); }
    // jellyfish drifting
    for (let k = 0; k < 3; k++) { const jx = 80 + k * 22 + Math.sin(t * 0.5 + k * 2) * 10, jy = 360 + k * 24 + Math.cos(t * 0.4 + k) * 6, p = 0.8 + 0.2 * Math.sin(t * 3 + k);
      glow(ctx, jx, jy, 10, [255, 150, 230], 0.3); ctx.fillStyle = 'rgba(255,170,230,.75)'; ctx.beginPath(); ctx.ellipse(jx, jy, 4 * p, 3, 0, Math.PI, 0); ctx.fill(); }
    ctx.restore();
    // a river from the peak down to the east coast? keep it simple: stream from the lagoon waterfall is the cliff sprite
  }

  // ---------------- paths ----------------
  function edgePath(ctx, e) { ctx.beginPath(); ctx.moveTo(...e.p0); ctx.bezierCurveTo(...e.c1, ...e.c2, ...e.p1); }
  function drawPaths(ctx, t) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // underlay: dirt road for every path (dark ones are rougher and paler)
    for (const e of EDGES) {
      edgePath(ctx, e); ctx.strokeStyle = 'rgba(30,40,20,.28)'; ctx.lineWidth = 15; ctx.save(); ctx.translate(1.5, 3); ctx.stroke(); ctx.restore();
      edgePath(ctx, e); ctx.strokeStyle = e.lit ? '#8a5c2c' : 'rgba(110,96,74,.85)'; ctx.lineWidth = 13; ctx.stroke();
      edgePath(ctx, e); ctx.strokeStyle = e.lit ? '#e8c27a' : 'rgba(170,154,124,.75)'; ctx.lineWidth = 8.5; ctx.stroke();
      if (e.lit) { edgePath(ctx, e); ctx.strokeStyle = 'rgba(255,246,200,.6)'; ctx.lineWidth = 2; ctx.save(); ctx.translate(-1, -1.5); ctx.stroke(); ctx.restore(); }
    }
    // overlays: lit = moving golden sparkle beads; dark = faded dashes
    for (const e of EDGES) {
      if (e.lit) {
        edgePath(ctx, e); ctx.setLineDash([0.1, 11]); ctx.lineDashOffset = -t * 16; ctx.strokeStyle = '#fff4b0'; ctx.lineWidth = 4; ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,210,80,.35)'; ctx.lineWidth = 8; ctx.stroke(); ctx.restore();
      } else {
        edgePath(ctx, e); ctx.setLineDash([5, 7]); ctx.lineDashOffset = 0; ctx.strokeStyle = 'rgba(96,82,62,.55)'; ctx.lineWidth = 2.4; ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // the future road down the volcano to the pier: unbuilt, faint dashes and survey stakes
    ctx.beginPath(); ctx.moveTo(...FUT[0]); ctx.bezierCurveTo(...FUT[1], ...FUT[2], ...FUT[3]);
    ctx.setLineDash([3, 9]); ctx.strokeStyle = 'rgba(255,240,210,.55)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
    for (let k = 3; k < FUTPTS.length - 1; k += 5) { const [x, y] = FUTPTS[k]; ctx.fillStyle = '#c49660'; ctx.fillRect(x - 1, y - 8, 2.2, 8); ctx.fillStyle = '#ff6a3a'; ctx.fillRect(x - 0.5, y - 8, 4, 2.4); }
    ctx.restore();
    // bridges and stairs where paths cross water / climb
    bridge(ctx, EDGES.find(e => e.a === 10 && e.b === 11), 0.62, t);
    bridge(ctx, EDGES.find(e => e.a === 11 && e.b === 12), 0.5, t);
    for (const [ea, eb] of [[3, 7], [2, 3]]) { const e = EDGES.find(q => q.a === ea && q.b === eb); bridge(ctx, e, creekCross(e), t); }
    stairs(ctx, EDGES.find(e => e.a === 19 && e.b === 20), 0.45, 0.92, '#8a5a40');
    stairs(ctx, EDGES.find(e => e.a === 14 && e.b === 15), 0.3, 0.75, '#7a7ec0');
    stairs(ctx, EDGES.find(e => e.a === 4 && e.b === 5), 0.25, 0.75, '#c8b688');
  }
  const CREEKPTS = (() => { const o = []; for (let i = 0; i + 1 < CREEK.length; i++) for (let k = 0; k < 10; k++) { const u = k / 10; o.push([CREEK[i][0] + (CREEK[i + 1][0] - CREEK[i][0]) * u, CREEK[i][1] + (CREEK[i + 1][1] - CREEK[i][1]) * u]); } return o; })();
  function creekCross(e) { let best = 0.5, bd = 1e9; for (let k = 0; k <= 100; k++) { const p = bez(e.p0, e.c1, e.c2, e.p1, k / 100); for (const c of CREEKPTS) { const d = Math.hypot(c[0] - p[0], c[1] - p[1]); if (d < bd) { bd = d; best = k / 100; } } } return best; }
  function at(e, u) { const p = bez(e.p0, e.c1, e.c2, e.p1, u), q = bez(e.p0, e.c1, e.c2, e.p1, Math.min(1, u + 0.01)), a = Math.atan2(q[1] - p[1], q[0] - p[0]); return [p[0], p[1], a]; }
  function bridge(ctx, e, u, t) {
    const [x, y, a] = at(e, u);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    shadow(ctx, 3, 6, 26, 9, 0.3);
    ctx.fillStyle = '#6a4424'; ctx.fillRect(-24, -9, 48, 18);
    for (let k = -22; k <= 18; k += 5) { ctx.fillStyle = lg(ctx, 0, -8, 0, 8, ['#e4b878', '#a8763e']); ctx.fillRect(k, -8, 4, 16); }
    ctx.strokeStyle = '#d8b880'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-24, -10); ctx.quadraticCurveTo(0, -6, 24, -10); ctx.moveTo(-24, 10); ctx.quadraticCurveTo(0, 14, 24, 10); ctx.stroke();
    ctx.fillStyle = '#5a3a1c'; for (const px of [-24, 24]) for (const py of [-10, 10]) { ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function stairs(ctx, e, u0, u1, col) {
    const c = typeof col === 'string' ? col : '#888';
    for (let u = u0; u <= u1; u += 0.07) {
      const [x, y, a] = at(e, u);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = 'rgba(40,20,10,.35)'; ctx.fillRect(-7, 1.2, 14, 2);
      ctx.fillStyle = c; ctx.fillRect(-7, -1.5, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-7, -1.5, 14, 1);
      ctx.restore();
    }
  }

  // ---------------- nodes ----------------
  const FONT = '900 13px "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';
  function plinth(ctx, x, y, r, top, side, rim) {
    shadow(ctx, x + 2, y + r * 0.55, r * 1.25, r * 0.5, 0.42);
    ctx.fillStyle = side; ctx.beginPath(); ctx.ellipse(x, y + 4, r, r * 0.86, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, x - r * 0.4, y - r * 0.5, r * 1.3, rim); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.86, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, x - r * 0.3, y - r * 0.4, r, top); ctx.beginPath(); ctx.ellipse(x, y, r * 0.74, r * 0.62, 0, 0, TAU); ctx.fill();
    sheen(ctx, x, y - 1, r * 0.95, 0.4);
  }
  function padlock(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -3, 4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -3, 0, 7, ['#fff0c8', '#c8a050', '#8a6420']); ctx.beginPath(); ctx.roundRect(-5.5, -3.5, 11, 9, 2); ctx.fill();
    ctx.strokeStyle = '#7a5418'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#5a3a10'; ctx.beginPath(); ctx.arc(0, 0.5, 1.4, 0, TAU); ctx.fill(); ctx.fillRect(-0.6, 0.5, 1.2, 3);
    ctx.restore();
  }
  function stars(ctx, x, y, n, r = 5.5) {
    for (let j = 0; j < 3; j++) K.star(ctx, x + (j - 1) * r * 2.3, y - (j === 1 ? 3 : 0), j === 1 ? r * 1.15 : r, j < n);
  }
  function numText(ctx, x, y, s, col, size = 13) {
    ctx.font = FONT.replace('13px', size + 'px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,250,230,.7)'; ctx.fillText(s, x + 0.6, y + 1.4);
    ctx.fillStyle = col; ctx.fillText(s, x, y + 0.5);
  }
  function ribbon(ctx, x, y, text, c1, c2, w) {
    ctx.font = '900 9px system-ui, sans-serif'; w = w || ctx.measureText(text).width + 16;
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, y + 1); ctx.lineTo(x - w / 2 + 2, y - 6); ctx.lineTo(x - w / 2 + 2, y + 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + w / 2 + 6, y + 1); ctx.lineTo(x + w / 2 - 2, y - 6); ctx.lineTo(x + w / 2 - 2, y + 8); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, y - 7, 0, y + 7, [lift(c1, 40), c1]); ctx.beginPath(); ctx.roundRect(x - w / 2, y - 7, w, 14, 4); ctx.fill();
    ctx.strokeStyle = rgb(lift(c1, -60)); ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff6e0'; ctx.fillText(text, x, y + 0.5);
  }
  // a snapping flytrap on a stalk rooted at (gx, gy); dir 1 = mouth faces right
  function flyHead(ctx, gx, gy, dir, open, t) {
    const hx = gx + dir * 2, hy = gy - 34 + Math.sin(t * 1.4 + dir) * 1.5;
    ctx.save(); ctx.lineCap = 'round';
    for (const d of [-1, 1]) leaf(ctx, gx, gy + 2, 16, Math.PI / 2 + d * 1.25 - Math.PI, [70, 150, 50], 0.4);
    ctx.beginPath(); ctx.moveTo(gx, gy + 2); ctx.quadraticCurveTo(gx - dir * 10, gy - 14, hx - dir * 4, hy + 4);
    ctx.strokeStyle = '#2c5a1c'; ctx.lineWidth = 5.5; ctx.stroke(); ctx.strokeStyle = '#7ac24a'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.translate(hx, hy); ctx.scale(dir * 1.3, 1.3); ctx.rotate(-0.15);
    for (const sg of [-1, 1]) {   // upper (-1) and lower (+1) lobes
      ctx.save(); ctx.rotate(sg * open);
      const a0 = sg < 0 ? Math.PI : 0, a1 = sg < 0 ? TAU : Math.PI;
      ctx.fillStyle = lg(ctx, 0, sg * 12, 0, 0, ['#2e6a1a', '#5aa834', '#a8e060']); ctx.beginPath(); ctx.ellipse(13, 0, 14, 10, 0, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#285a16'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = lg(ctx, 0, 0, 0, sg * 7, ['#ffb0b8', '#e83a52']); ctx.beginPath(); ctx.ellipse(13, 0, 11, 6.5, 0, a0, a1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff8e4'; for (let k = 0; k < 6; k++) { const tx = 3.5 + k * 4.2; ctx.beginPath(); ctx.moveTo(tx - 1.6, 0); ctx.lineTo(tx, -sg * 4.2); ctx.lineTo(tx + 1.6, 0); ctx.fill(); }
      if (sg < 0) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(10, -7.5, 5, 1.6, -0.1, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }
  function lair(ctx, l, x, y, t) {
    if (l.boss === 'flytrap') {
      // the Gobblebloom lair: a thorny hedge arch with two giant snapping flytraps guarding the node
      K.danger(ctx, x, y, 54, 0.2);
      // thorny vine arch behind
      ctx.save(); ctx.lineCap = 'round';
      const arch = () => { ctx.beginPath(); ctx.moveTo(x - 40, y + 6); ctx.bezierCurveTo(x - 46, y - 58, x + 46, y - 58, x + 40, y + 6); };
      arch(); ctx.strokeStyle = '#2c5a1c'; ctx.lineWidth = 8; ctx.stroke();
      arch(); ctx.strokeStyle = '#5a9a34'; ctx.lineWidth = 4; ctx.stroke();
      arch(); ctx.strokeStyle = 'rgba(200,250,140,.5)'; ctx.lineWidth = 1.2; ctx.save(); ctx.translate(-1, -1.5); ctx.stroke(); ctx.restore();
      for (let k = 1; k < 12; k++) {
        const u = k / 12, p = bez([x - 40, y + 6], [x - 46, y - 58], [x + 46, y - 58], [x + 40, y + 6], u);
        ctx.fillStyle = '#e8d8a0'; ctx.beginPath(); ctx.moveTo(p[0] - 2, p[1]); ctx.lineTo(p[0] + (k % 2 ? -1 : 1) * 2, p[1] - 6); ctx.lineTo(p[0] + 2, p[1]); ctx.fill();
        if (k % 3 === 0) leaf(ctx, p[0], p[1], 11, (k % 2 ? -2.2 : -0.9), [86, 160, 60], 0.36);
      }
      // a red bloom on the crown of the arch
      const bl = 1 + Math.sin(t * 2) * 0.06;
      for (let k = 0; k < 5; k++) { ctx.save(); ctx.translate(x, y - 44); ctx.rotate(k / 5 * TAU + t * 0.2); ctx.fillStyle = lg(ctx, 0, 0, 0, -9, ['#ff4a5a', '#ff9aa8']); ctx.beginPath(); ctx.ellipse(0, -5 * bl, 3.6, 6 * bl, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x, y - 44, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
      for (const dir of [-1, 1]) flyHead(ctx, x - dir * 44, y - 2, dir, 0.32 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.6 + (dir > 0 ? 0 : 1.6))), t);
    } else if (l.boss === 'golem') {
      // a stone gate studded with geodes
      ctx.save(); ctx.translate(x, y);
      shadow(ctx, 4, 8, 44, 12, 0.35);
      for (const d of [-1, 1]) {
        ctx.fillStyle = lg(ctx, d * 36 - 8, 0, d * 36 + 8, 0, ['#9aa0d8', '#585c9c', '#34366a']); ctx.beginPath(); ctx.roundRect(d * 34 - 8, -52, 16, 58, 3); ctx.fill();
        ctx.strokeStyle = '#2c2e5a'; ctx.lineWidth = 1; ctx.stroke();
        DRAW.crystal(ctx, d * 34, -52, 0.8, t, 3 + d);
      }
      ctx.fillStyle = lg(ctx, 0, -64, 0, -48, ['#a8aee2', '#4c508c']); ctx.beginPath(); ctx.moveTo(-46, -50); ctx.quadraticCurveTo(0, -74, 46, -50); ctx.lineTo(46, -44); ctx.quadraticCurveTo(0, -66, -46, -44); ctx.fill();
      ctx.strokeStyle = '#2c2e5a'; ctx.stroke();
      DRAW.crystal(ctx, 0, -62, 1.1, t, 9);
      ctx.restore();
    } else if (l.boss === 'dragon') {
      // a ring of black basalt fangs around the crater arena
      ctx.save(); ctx.translate(x, y);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + k / 8 * Math.PI, px = Math.cos(a) * 42, py = Math.sin(a) * 16 - 2, h = 18 + (k % 2) * 8;
        ctx.fillStyle = lg(ctx, px - 5, 0, px + 5, 0, ['#6a3a32', '#2a1412']); ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 0.5, py - h); ctx.lineTo(px + 5, py); ctx.fill();
        ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.arc(px + 0.5, py - h + 3, 1.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawNode(ctx, l, t) {
    const [x, y] = NP[l.id], boss = !!l.boss, r = boss ? 22 : 15;
    const S = l.state;
    if (boss) lair(ctx, l, x, y, t);
    if (S === 'open') {
      const p = (t * 0.9) % 1;
      ctx.strokeStyle = `rgba(255,236,140,${0.8 * (1 - p)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 3, r + 6 + p * 22, (r + 6 + p * 22) * 0.8, 0, 0, TAU); ctx.stroke();
      glow(ctx, x, y, r * 2.6, [255, 220, 100], 0.4 + 0.15 * Math.sin(t * 4));
    }
    const pal = S === 'done' ? { rim: ['#fff4a8', '#f2b628', '#9a5e0c'], side: '#7a4808', top: ['#fffaf0', '#f4dca8'] }
      : S === 'tried' ? { rim: ['#ffd6a0', '#e88a3a', '#94461a'], side: '#6a3010', top: ['#fffaf0', '#f0d8b0'] }
      : S === 'open' ? { rim: ['#e0ff9a', '#7ac83c', '#2e7018'], side: '#235a12', top: ['#ffffff', '#fff2c4'] }
      : { rim: ['#b8b4ac', '#7e7a72', '#4a4640'], side: '#3a3630', top: ['#9a958c', '#6e6a62'] };
    plinth(ctx, x, y, r, pal.top, pal.side, pal.rim);
    if (boss) {
      K.badge(ctx, 'boss-' + l.boss, x, y - 1, r * 0.78, S === 'locked' ? '#8a8478' : '#ff5a3a');
      if (S === 'locked') { ctx.fillStyle = 'rgba(30,26,34,.5)'; ctx.beginPath(); ctx.arc(x, y - 1, r * 0.78, 0, TAU); ctx.fill(); padlock(ctx, x + r * 0.62, y + r * 0.45, 1); }
      ribbon(ctx, x, y - r - (l.boss === 'flytrap' ? 40 : 14), 'BOSS ' + l.id, S === 'locked' ? [110, 102, 92] : [200, 50, 30], S === 'locked' ? '#4a443c' : '#7a1a10');
    } else {
      numText(ctx, x, y, String(l.id), S === 'locked' ? '#3c3832' : S === 'done' ? '#7a4210' : S === 'tried' ? '#7a3410' : '#2e6014', 13);
      if (S === 'locked') padlock(ctx, x + r * 0.78, y + r * 0.5, 0.85);
    }
    if (S !== 'locked') stars(ctx, x, y + r + 6, l.stars, boss ? 6 : 5);
  }

  // ---------------- player, pilot hint ----------------
  function drawPlayer(ctx, t) {
    const cur = LEVELS.find(l => l.current), [x, y] = NP[cur.id], b = Math.sin(t * 2.6) * 3.5;
    // pulsing "you are here" rings
    for (let k = 0; k < 2; k++) { const p = (t * 0.6 + k * 0.5) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - p)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 6, 26 + p * 30, (26 + p * 30) * 0.45, 0, 0, TAU); ctx.stroke(); }
    // the coconut rocket hovering above the boss node, ready to launch
    const rx = x + 54, ry = y - 26 + b;
    shadow(ctx, rx, y + 10, 12 - b * 0.6, 4, 0.35);
    K.rocket(ctx, rx, ry, 0.72, t);
    K.badge(ctx, 'lemur', rx, ry - 30, 10, '#ffffff');
    // "you are here" tag
    const tx = rx, ty = ry - 52;
    ctx.font = '900 9px system-ui, sans-serif'; const w = ctx.measureText('YOU ARE HERE').width + 14;
    ctx.fillStyle = 'rgba(40,24,10,.35)'; ctx.beginPath(); ctx.roundRect(tx - w / 2 + 1, ty - 7 + 2, w, 14, 7); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, ty - 7, 0, ty + 7, ['#fff6c8', '#ffcf3a']); ctx.beginPath(); ctx.roundRect(tx - w / 2, ty - 7, w, 14, 7); ctx.fill();
    ctx.strokeStyle = '#b07a10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#6a3c08'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('YOU ARE HERE', tx, ty + 0.5);
    ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.moveTo(tx - 4, ty + 7); ctx.lineTo(tx + 4, ty + 7); ctx.lineTo(tx, ty + 11); ctx.fill();
    // level name banner under the node
    nameplate(ctx, x, y + 52, cur.name);
  }
  function nameplate(ctx, x, y, text) {
    ctx.font = '900 11px system-ui, sans-serif'; const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = 'rgba(30,16,8,.35)'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 1, y - 9 + 2, w, 18, 6); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, y - 9, 0, y + 9, ['#d89a5a', '#8a5426']); ctx.beginPath(); ctx.roundRect(x - w / 2, y - 9, w, 18, 6); ctx.fill();
    ctx.strokeStyle = '#5a3212'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect(x - w / 2 + 4, y - 7, w - 8, 1.5);
    ctx.fillStyle = '#fff3d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5);
  }
  function drawHints(ctx, t) {
    for (const l of LEVELS) {
      if (!(l.current || l.state === 'open' || l.state === 'tried')) continue;
      const [x, y] = NP[l.id], r = l.boss ? 22 : 15, side = l.current ? -1 : 1, bx = x + side * (r + (l.current ? 6 : 8)), by = y + (l.current ? r * 0.7 : -r * 0.6) + Math.sin(t * 2 + l.id) * 1.2;
      ctx.strokeStyle = 'rgba(255,207,58,.8)'; ctx.lineWidth = 1.4; K.badge(ctx, l.pilot, bx, by, l.current ? 11 : 9, '#ffcf3a');
      // tiny "advantage" chevron
      ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.moveTo(bx + 6, by - 9); ctx.lineTo(bx + 10, by - 13); ctx.lineTo(bx + 14, by - 9); ctx.lineTo(bx + 12, by - 9); ctx.lineTo(bx + 10, by - 11); ctx.lineTo(bx + 8, by - 9); ctx.fill();
    }
  }

  // ---------------- the future: pier, gate, boat route, fogged islands ----------------
  const ROUTE = [[PIER[0] + 34, PIER[1] + 6], [740, 790], [770, 880], [748, 960], [716, 1040], [740, 1120]];
  function drawFutureSea(ctx, t) {
    // dotted boat route
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...ROUTE[0]);
    for (let i = 1; i < ROUTE.length - 1; i++) { const m = [(ROUTE[i][0] + ROUTE[i + 1][0]) / 2, (ROUTE[i][1] + ROUTE[i + 1][1]) / 2]; ctx.quadraticCurveTo(...ROUTE[i], ...m); }
    ctx.lineTo(...ROUTE[ROUTE.length - 1]);
    ctx.setLineDash([0.1, 10]); ctx.lineDashOffset = -t * 8; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // fogged islands
    for (const [x, y, s, q] of [[760, 905, 1, '21'], [728, 1110, 0.85, '?']]) {
      ctx.save();
      ctx.fillStyle = 'rgba(140,230,230,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 56 * s, 30 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.ellipse(x, y, 44 * s, 22 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7ab05a'; ctx.beginPath(); ctx.ellipse(x - 2, y - 3, 34 * s, 15 * s, 0, 0, TAU); ctx.fill();
      cone(ctx, x + 6, y, 22 * s, 34 * s, '#9a8a7a', '#5a4a44', '#4a3a34');
      DRAW.palm(ctx, x - 22 * s, y + 4, 0.8 * s, t, 3); DRAW.palm(ctx, x + 26 * s, y + 6, 0.7 * s, t, 8);
      // a locked node waiting there
      plinth(ctx, x - 6, y + 8, 12, ['#9a958c', '#6e6a62'], '#3a3630', ['#b8b4ac', '#7e7a72', '#4a4640']);
      numText(ctx, x - 6, y + 8, q, '#3c3832', 11);
      ctx.restore();
    }
    // fog banks drifting over them
    for (let k = 0; k < 7; k++) {
      const fx = 700 + ((k * 61 + t * 6) % 200) - 40, fy = 840 + k * 50 + Math.sin(t * 0.3 + k) * 6;
      ctx.fillStyle = rg(ctx, fx, fy, 70, ['rgba(236,246,250,.62)', 'rgba(236,246,250,.3)', 'rgba(236,246,250,0)']);
      ctx.beginPath(); ctx.ellipse(fx, fy, 90, 34, 0, 0, TAU); ctx.fill();
    }
    // a sign in the fog
    const sx = 742, sy = 1000;
    ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.roundRect(sx - 52, sy - 14 + 3, 104, 30, 8); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, sy - 14, 0, sy + 16, ['#fff3d8', '#f0d8a8']); ctx.beginPath(); ctx.roundRect(sx - 52, sy - 14, 104, 30, 8); ctx.fill();
    ctx.strokeStyle = '#b08a50'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.font = '900 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#6a3c10';
    ctx.fillText('MORE ISLANDS', sx, sy - 4); ctx.fillStyle = '#9a6a30'; ctx.font = '800 8px system-ui, sans-serif'; ctx.fillText('COMING SOON', sx, sy + 7);
  }
  function drawPier(ctx, t) {
    const [x, y] = PIER;
    shadow(ctx, x + 22, y + 8, 40, 8, 0.25);
    ctx.fillStyle = '#5a3a1c'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 4 + k * 12, y + 2, 3, 10);
    for (let k = 0; k < 9; k++) { ctx.fillStyle = lg(ctx, 0, y - 6, 0, y + 6, ['#e4b878', '#9a6a36']); ctx.fillRect(x + k * 5.6, y - 6, 4.6, 12); }
    // the boat, bobbing, waiting
    const b = Math.sin(t * 1.6) * 1.6, bx = x + 64, by = y + 12 + b;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(t * 1.3) * 0.05);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(0, 6, 22, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -2, 0, 8, ['#e88a3a', '#8a3a14']); ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.quadraticCurveTo(16, 8, 0, 8); ctx.quadraticCurveTo(-16, 8, -20, 0); ctx.fill();
    ctx.strokeStyle = '#6a2a10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -30, 14, 0, ['#ffffff', '#e8dcc8']); ctx.beginPath(); ctx.moveTo(1, -29); ctx.quadraticCurveTo(14, -16, 15, -3); ctx.lineTo(1, -3); ctx.fill();
    ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(8, -27); ctx.lineTo(0, -24); ctx.fill();
    ctx.restore();
    // closed gate at the head of the pier
    const gx = x - 4, gy = y;
    for (const d of [-1, 1]) { ctx.fillStyle = lg(ctx, gx - 2, 0, gx + 3, 0, ['#c49660', '#6a4220']); ctx.fillRect(gx - 2, gy + d * 12 - 22, 5, 26); }
    ctx.fillStyle = '#8a5a2c'; ctx.fillRect(gx - 1, gy - 12, 3, 22);
    ctx.strokeStyle = '#d8b070'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx + 0.5, gy - 30); ctx.lineTo(gx + 0.5, gy + 12); ctx.stroke();
    // chain + padlock across it
    ctx.strokeStyle = '#a8a8b4'; ctx.lineWidth = 1.4; ctx.setLineDash([2, 1.5]); ctx.beginPath(); ctx.moveTo(gx - 2, gy - 18); ctx.quadraticCurveTo(gx + 6, gy - 6, gx - 2, gy + 6); ctx.stroke(); ctx.setLineDash([]);
    padlock(ctx, gx + 3, gy - 4, 0.9);
  }

  // ---------------- clouds & ambience ----------------
  function drawAmbient(ctx, t, v) {
    // motes per region
    const M = [['spore', [150, 240, 255], 170, 528, 200, 140, 14], ['ember', [255, 150, 60], 470, 560, 260, 220, 18], ['snow', [255, 255, 255], 632, 280, 200, 180, 18],
      ['pollen', [230, 255, 140], 300, 1000, 380, 220, 16], ['bubble', [210, 255, 120], 306, 850, 160, 180, 8], ['spore', [230, 160, 255], 540, 140, 200, 110, 10]];
    for (const [kind, c, cx, cy, w, h, n] of M) {
      if (cx + w / 2 < v.x || cx - w / 2 > v.x + v.w || cy + h / 2 < v.y || cy - h / 2 > v.y + v.h) continue;
      ctx.save(); ctx.translate(cx - w / 2, cy - h / 2); K.motes(ctx, w, h, t, kind, c, n, cx | 0); ctx.restore();
    }
    // seagulls circling over the sea
    for (let k = 0; k < 3; k++) {
      const a = t * 0.35 + k * 2.1, gx = [120, 690, 420][k] + Math.cos(a) * 50, gy = [1180, 1080, 30][k] + Math.sin(a) * 20, fl = Math.sin(t * 6 + k) * 3;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx - 7, gy - fl); ctx.quadraticCurveTo(gx - 3, gy - 4, gx, gy); ctx.quadraticCurveTo(gx + 3, gy - 4, gx + 7, gy - fl); ctx.stroke();
    }
    // drifting cloud shadows and puffy clouds at the top layer
    for (const [x0, cy, k] of [[-10, 150, 0], [800, 420, 1], [-20, 620, 2], [10, 1010, 3], [810, 1180, 4], [600, 18, 5], [180, 20, 6]]) {
      const cx = x0 + Math.sin(t * 0.15 + k) * 16;
      if (cy < v.y - 80 || cy > v.y + v.h + 80 || cx < v.x - 100 || cx > v.x + v.w + 100) continue;
      shadow(ctx, cx + 30, cy + 60, 60, 20, 0.12);
      cloudPuff(ctx, cx, cy, 1.6 + (k % 3) * 0.3, 'rgba(255,255,255,.85)', 'rgba(220,234,246,.75)', 0.75);
    }
  }

  // ---------------- registration ----------------
  // camera tour (centre points), seconds; eased between, holds where a key repeats
  const TOUR = [[0, 420, 1060], [1.6, 420, 1060], [4.2, 200, 860], [6.4, 214, 660], [9.4, 214, 660], [11.6, 200, 420], [13.8, 440, 250],
    [16, 580, 400], [18, 450, 560], [20.6, 690, 900], [22.4, 690, 900], [24, 420, 1060]];
  const LOOP = 24;
  PV.maps.island = {
    W, H,
    camera(t) {
      const tt = ((t % LOOP) + LOOP) % LOOP;
      let i = 0; while (i < TOUR.length - 2 && TOUR[i + 1][0] <= tt) i++;
      const [t0, x0, y0] = TOUR[i], [t1, x1, y1] = TOUR[i + 1], u = sm(K.clamp((tt - t0) / (t1 - t0 || 1), 0, 1));
      const cx = x0 + (x1 - x0) * u, cy = y0 + (y1 - y0) * u;
      return { x: K.clamp(cx - 180, 0, W - 360), y: K.clamp(cy - 360, 0, H - 720) };
    },
    draw(ctx, t, view) {
      const v = view || { x: 0, y: 0, w: W, h: H };
      gi = 0;
      ctx.save(); ctx.lineJoin = 'round';
      drawSea(ctx, t, v);
      drawFutureSea(ctx, t);
      drawIsland(ctx, t);
      drawRegions(ctx, t);
      // scenery, y-sorted, culled to the view
      for (const s of SPR) {
        const rr = SPR_R[s.type] || 40;
        if (s.x + rr < v.x || s.x - rr > v.x + v.w || s.y + rr * 0.5 < v.y || s.y - rr * 1.2 > v.y + v.h) continue;
        DRAW[s.type](ctx, s.x, s.y, s.s, t, s.seed);
      }
      drawPier(ctx, t);
      drawPaths(ctx, t);
      for (const l of LEVELS) drawNode(ctx, l, t);
      drawHints(ctx, t);
      drawPlayer(ctx, t);
      drawAmbient(ctx, t, v);
      ctx.restore();
    },
  };
})();
