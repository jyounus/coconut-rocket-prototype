// The style sample: one phone screen (390x844) of Coconut Island's beach start: level 1's launch pad by the stilt
// hut, the road up to levels 2 and 3 over the creek, the fork leaving the top of the screen, the jungle edge, sand,
// surf and sea. Node layout follows the concept (maps/island.js: 1 at the beach, 2 up-left, 3 further up-left past the
// creek, then forks to the Temple and the Bog), squeezed to fit portrait. Two styles share every draw function:
//   A  "Concept, polished": the concept's bright, clean look at shipped quality.
//   B  "Storybook rich": deeper grading, denser layering, framing foreground leaves, haze, bigger hero props.
(() => {
  const A = window.ART, { rgb, mix, shade, lg, rg, blob, glow, rand, resample, bezPts, polyline, TAU } = A;
  const SW = 390, SH = 844;

  // ---------------- styles ----------------
  const BASE = {
    sea: [[44, 140, 186], [34, 120, 176], [28, 104, 164]],
    shallow: [[150, 236, 222], [86, 206, 210], [44, 150, 192]],
    sand: [[246, 222, 160], [242, 210, 146]],
    wetSand: [[226, 190, 128], [204, 166, 108]],
    grass: [[112, 182, 78], [104, 176, 72]],
    grassLight: [158, 212, 98], grassDark: [52, 116, 50],
    earth: [150, 106, 60], bank: [222, 196, 140],
    creek: [[46, 150, 176], [80, 190, 206], [130, 222, 226]],
    road: [222, 182, 116], roadDark: [196, 178, 140], stone: [176, 168, 156], rock: [160, 150, 140],
    trunk: [176, 126, 74], bark: [120, 82, 50], coconut: [140, 92, 44],
    palmLeaf: [[96, 172, 66], [84, 162, 70], [108, 178, 62]],
    treeLeaf: [[82, 160, 66], [66, 146, 72], [100, 170, 60], [58, 136, 86]],
    bushLeaf: [[92, 168, 68], [74, 154, 78]],
    plantLeaf: [[80, 166, 92], [96, 176, 76]],
    fern: [72, 158, 96],
    rim: [236, 255, 170], shadow: [24, 58, 34],
    flowers: [[255, 122, 168], [255, 216, 74], [255, 255, 255], [200, 144, 255]],
    blossom: [[255, 80, 110], [255, 150, 60], [255, 120, 190]],
    fruit: [[255, 150, 40], [255, 200, 60], [240, 90, 60]],
    wood: [170, 116, 64], cane: [214, 178, 106], straw: [236, 196, 108], rope: [214, 186, 130],
    crab: [240, 92, 58], canoe: [176, 104, 56], cloudShade: [196, 210, 236],
    lean: 0.06,
    density: 0.72, hero: 1, hutS: 1.3,
  };
  const STYLES = {
    A: { ...BASE, name: 'A' },
    B: {
      ...BASE, name: 'B',
      sea: [[30, 118, 176], [22, 96, 162], [16, 76, 140]],
      shallow: [[144, 240, 220], [64, 200, 208], [28, 128, 180]],
      sand: [[252, 222, 156], [246, 204, 134]],
      wetSand: [[224, 178, 112], [196, 150, 92]],
      grass: [[66, 140, 62], [96, 170, 68]],
      grassLight: [150, 210, 90], grassDark: [34, 96, 50],
      treeLeaf: [[70, 150, 62], [52, 130, 72], [92, 164, 56], [44, 120, 88], [110, 172, 60]],
      palmLeaf: [[86, 166, 62], [72, 152, 68], [104, 176, 60]],
      bushLeaf: [[82, 160, 64], [62, 142, 78], [100, 170, 66]],
      rim: [250, 255, 180], shadow: [18, 44, 40],
      density: 1.15, hero: 1.2, hutS: 1.5,
    },
  };

  // ---------------- layout (screen px) ----------------
  // the coast runs right-to-left (land on the +normal side, as ART.shallows expects)
  const COAST = resample([[440, 664], [390, 688], [345, 710], [300, 730], [250, 746], [190, 754], [130, 752], [70, 742], [20, 728], [-50, 712]], 3);
  const EDGE = resample([[-50, 590], [10, 600], [50, 615], [95, 634], [140, 648], [190, 655], [235, 652], [270, 642], [300, 628], [332, 610], [365, 592], [440, 566]], 3);
  const yAt = (line, x) => { let best = line[0]; for (const p of line) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1]; };
  const N = { 1: [230, 596], 2: [150, 470], 3: [70, 318] };
  const ROADS = [
    { pts: bezPts(N[1], [196, 588], [178, 512], N[2], 3), lit: true, seed: 3 },
    { pts: bezPts(N[2], [122, 436], [102, 362], N[3], 3), lit: true, seed: 4 },
    { pts: bezPts(N[3], [44, 268], [16, 212], [-30, 168], 3), lit: false, seed: 5 },
    { pts: bezPts(N[3], [128, 292], [196, 128], [236, -40], 3), lit: false, seed: 6 },
  ];
  const CREEK_ALL = resample([[336, -40], [296, 50], [262, 104], [214, 186], [184, 244], [146, 300], [136, 352], [108, 410], [104, 462], [80, 522], [66, 574], [48, 618], [44, 650], [50, 690], [42, 740], [36, 800]], 3);
  const CREEK = CREEK_ALL.filter(p => p[1] < 626), MOUTH = CREEK_ALL.filter(p => p[1] > 596 && p[1] < 770);
  const creekW = u => 9.5 + u * 6;
  const HUT = [318, 672];
  const PAD = [N[1][0], N[1][1] + 6];

  const dSeg = (pts, x, y) => { let d = 1e9; for (const p of pts) { const q = Math.hypot(p[0] - x, p[1] - y); if (q < d) d = q; } return d; };
  function crossing(a, b) { let best = null, bd = 1e9; for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j += 2) { const d = Math.hypot(a[i][0] - b[j][0], a[i][1] - b[j][1]); if (d < bd) { bd = d; best = i; } } return best; }

  // ---------------- scenery placement ----------------
  function placeProps(S) {
    const out = [], r = rand(S.name === 'A' ? 101 : 202);
    const add = (type, x, y, s, seed, o) => out.push({ type, x, y, s, seed: seed ?? ((r() * 1e6) | 0), o });
    const H = S.hero;
    // hero props
    add('hut', HUT[0], HUT[1], S.hutS, 9);
    add('torch', PAD[0] - 36, PAD[1] - 6, 1);
    add('torch', PAD[0] + 36, PAD[1] - 8, 1);
    // beach palms leaning out to sea along the grass edge, and a pair by the hut
    for (const [x, s, sd] of [[-6, 1.05, 11], [96, 1.0, 13], [168, 0.92, 14]]) add('palm', x, yAt(EDGE, x) + 8, s * H, sd);
    add('palm', 384, 598, 1.1 * H, 17); add('palm', 398, 716, 1.05 * H, 18);
    if (S.name === 'B') { add('palm', 120, 668, 0.9, 20); add('palm', -14, 520, 1.2, 21); }
    // a big hero tree in the jungle and mossy rocks
    add('tree', 300, 300, 1.35 * H, 31); add('tree', 228, 96, 1.25 * H, 32);
    add('rock', 214, 385, 1.0, 33, { moss: true }); add('rock', 30, 412, 0.9, 34, { moss: true });
    // fill the grass
    const ok = (x, y, rad, type) => {
      if (y > yAt(EDGE, x) - 6) return false;
      for (const R of ROADS) if (dSeg(R.pts, x, y) < 13 + rad * 0.5) return false;
      if (type === 'tree' || type === 'palm') { const sc = rad / (type === 'tree' ? 26 : 14), cy = y - (type === 'tree' ? 38 : 52) * sc, cr = (type === 'tree' ? 30 : 26) * sc; for (const R of ROADS) if (dSeg(R.pts, x, cy) < cr + 6) return false; for (const n of Object.values(N)) if (Math.hypot(n[0] - x, n[1] - cy) < cr + 24) return false; if (Math.hypot(N[3][0] - x, N[3][1] - 50 - cy) < cr + 30) return false; }
      if (dSeg(CREEK, x, y) < 12 + rad * 0.4) return false;
      for (const n of Object.values(N)) if (Math.hypot(n[0] - x, n[1] - y) < 34 + rad * 0.6) return false;
      if (Math.hypot(PAD[0] - x, PAD[1] - y) < 46) return false;
      if (Math.hypot(N[3][0] - x, N[3][1] - 40 - y) < 40) return false;   // the player above node 3
      for (const p of out) { const sz = p.type === 'tree' ? 26 : p.type === 'palm' ? 16 : p.type === 'hut' ? 50 : 12; if (Math.hypot(p.x - x, p.y - y) < (sz * p.s + rad) * 0.62) return false; }
      return true;
    };
    const n = Math.round(260 * S.density);
    for (let k = 0, made = 0; k < 9000 && made < n; k++) {
      const x = -24 + r() * 438, y = -30 + r() * 680, edgeD = yAt(EDGE, x) - y;
      const v = r(); let type, s;
      if (edgeD < 60) { type = v < 0.4 ? 'palm' : v < 0.75 ? 'bush' : 'plant'; }
      else type = v < 0.55 ? 'tree' : v < 0.65 ? 'palm' : v < 0.85 ? 'bush' : v < 0.95 ? 'plant' : 'fern';
      s = type === 'tree' ? 0.85 + r() * 0.35 : type === 'palm' ? 0.8 + r() * 0.3 : 0.8 + r() * 0.45;
      const rad = (type === 'tree' ? 26 : type === 'palm' ? 14 : 11) * s;
      if (!ok(x, y, rad, type)) continue;
      add(type, x, y, s); made++;
    }
    // road-side shrubs and flowers (smaller, closer to the road)
    for (const R of ROADS) for (let i = 4; i < R.pts.length - 4; i += 5) {
      if (r() < 0.45) continue;
      const nn = A.normalAt(R.pts, i), side = r() < 0.5 ? -1 : 1, d = side * (17 + r() * 6), x = R.pts[i][0] + nn[0] * d, y = R.pts[i][1] + nn[1] * d;
      if (y > yAt(EDGE, x) - 4 || dSeg(CREEK, x, y) < 14) continue;
      let close = false; for (const R2 of ROADS) if (dSeg(R2.pts, x, y) < 14) close = true; for (const nd of Object.values(N)) if (Math.hypot(nd[0] - x, nd[1] - y) < 30) close = true;
      if (Math.hypot(PAD[0] - x, PAD[1] - y) < 44) close = true;
      if (close) continue;
      add(r() < 0.6 ? 'bush' : 'fern', x, y, 0.55 + r() * 0.25);
    }
    // beach things that stand up (rocks by the creek mouth)
    add('rock', 70, 708, 0.8, 41, { wet: true }); add('rock', 6, 690, 1.1, 42, { wet: true }); add('rock', 84, 690, 0.55, 43);
    out.sort((p, q) => p.y - q.y);
    return out;
  }

  // ---------------- drawing ----------------
  function drawScene(ctx, S, opts = {}) {
    const B = { x0: -40, y0: -40, x1: SW + 40, y1: SH + 40 };
    const props = placeProps(S);
    // sea
    A.sea(ctx, B, S, S.name === 'A' ? 5 : 6);
    // sand (between the grass edge and the coast)
    const sandPath = c => { c.moveTo(EDGE[0][0], EDGE[0][1] - 10); for (const p of EDGE) c.lineTo(p[0], p[1] - 4); for (const p of COAST) c.lineTo(p[0], p[1]); c.closePath(); };
    A.sand(ctx, sandPath, { x0: -40, y0: 540, x1: SW + 40, y1: 790 }, COAST, S, 21);
    // sand storytelling: footprints from the hut to the water, shells, starfish, driftwood, the canoe, crabs
    footprints(ctx, [[318, 676], [296, 694], [268, 706], [240, 716], [214, 726]], S);
    ctx.save(); ctx.beginPath(); sandPath(ctx); ctx.clip(); mouth(ctx, S); ctx.restore();
    A.shallows(ctx, COAST, S, 74, 11);
    seaRock(ctx, 332, 800, 1.2, S);
    // things in the water
    A.turtle(ctx, 196, 808, 1.3, -0.5);
    for (const [x, y, s, a] of [[112, 790, 1, 0.3], [124, 796, 0.8, 0.4], [104, 800, 0.9, 0.2], [258, 828, 1.1, 2.9]]) A.fishShadow(ctx, x, y, s, a);
    // grass
    const grassPath = c => { c.moveTo(-50, -50); c.lineTo(SW + 50, -50); c.lineTo(EDGE[EDGE.length - 1][0], EDGE[EDGE.length - 1][1]); for (let i = EDGE.length - 1; i >= 0; i--) c.lineTo(EDGE[i][0], EDGE[i][1]); c.closePath(); };
    A.grass(ctx, grassPath, { x0: -40, y0: -40, x1: SW + 40, y1: 680 }, S, S.name === 'A' ? 31 : 32);
    A.turfEdge(ctx, EDGE, S, 41);
    // creek: grass part, then the fan across the beach into the sea
    A.creek(ctx, CREEK, S, creekW, 51);
    // beach decorations on the sand (flat ones, under the props)
    A.driftwood(ctx, 210, 690, 1, 0.2, S);
    A.canoe(ctx, 160, 708, 1.4, -0.12, S);
    for (const [x, y, s, a, k, c] of [[262, 676, 1, 0.4, 0, [255, 190, 170]], [124, 676, 0.9, -0.3, 1, [250, 226, 200]], [196, 732, 0.8, 1.1, 0, [255, 214, 160]], [282, 718, 0.9, 2.1, 1, [255, 200, 220]], [100, 722, 0.8, 0.2, 0, [240, 170, 140]]]) A.shell(ctx, x, y, s, a, c, k);
    A.starfish(ctx, 236, 734, 1.1, 0.3, [255, 128, 82]); A.starfish(ctx, 60, 676, 0.9, 1.2, [255, 170, 80]);
    // roads (unwalked first), bridges over the creek
    for (const R of [...ROADS].sort((a, b) => a.lit - b.lit)) A.road(ctx, R.pts, S, { lit: R.lit, seed: R.seed, w: 16 });
    for (const R of ROADS) {
      if (dSeg(CREEK, ...R.pts[crossing(R.pts, CREEK)]) > 8) continue;
      const i = crossing(R.pts, CREEK), p = R.pts[i], q = R.pts[Math.min(R.pts.length - 1, i + 2)], a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      A.bridge(ctx, p[0], p[1], a, 34, 16, S);
    }
    // launch pad under node 1
    A.launchPad(ctx, PAD[0], PAD[1], 34, S);
    // lily pads and a dragonfly-ish sparkle in the creek pool
    A.lily(ctx, 98, 470, 1.1, 0.5, true); A.lily(ctx, 54, 604, 1, 2, false); A.lily(ctx, 192, 236, 0.9, 1, false);
    // prop shadows first (so a shadow never darkens a prop in front), then the props by depth
    for (const p of props) shadowOf(ctx, p, S);
    if (S.name === 'B') { ctx.save(); ctx.globalAlpha = 0.6; for (const p of props) shadowOf(ctx, p, S); ctx.restore(); }
    for (const p of props) drawProp(ctx, p, S);
    // crabs on the sand (in front of the hut)
    A.crab(ctx, 270, 742, 1.15, 0.2, S); A.crab(ctx, 54, 724, 0.95, -0.4, S); A.crab(ctx, 360, 712, 0.9, 0.6, S);
    // nodes
    const font = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
    A.node(ctx, N[1][0], N[1][1], 19, '1', 'done', 3, S, font);
    A.node(ctx, N[2][0], N[2][1], 19, '2', 'done', 3, S, font);
    A.node(ctx, N[3][0], N[3][1], 19, '3', 'open', 0, S, font);
    // the player: the pilot's ride hovering over the next level
    player(ctx, N[3][0], N[3][1] - 52, S);
    // life above
    A.butterfly(ctx, 196, 548, 1.1, 0.4, [80, 200, 255], [40, 120, 220]);
    A.butterfly(ctx, 120, 380, 1, -0.3, [255, 170, 60], [230, 90, 40]);
    A.butterfly(ctx, 300, 470, 0.9, 0.8, [255, 120, 200], [200, 70, 160]);
    A.gull(ctx, 120, 774, 1.3, 0.3, -1.5, 22); A.gull(ctx, 250, 812, 1.1, -0.2, 1.5, 18); A.gull(ctx, 360, 520, 1.2, 0.6, -1, 34);
    if (S.name === 'B') storybookPass(ctx, S);
    else conceptPass(ctx, S);
  }

  function seaRock(ctx, x, y, s, S) {
    // foam ring, then two stacked rocks with wet highlights, and a gull resting
    ctx.save();
    for (const [rx, ry, a] of [[34, 13, 0.25], [26, 10, 0.5]]) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, rx * s, ry * s, 0, 0, TAU); ctx.stroke(); }
    
    ctx.restore();
    A.rock(ctx, x - 6 * s, y + 3, 1.4 * s, 61, S, { wet: true, moss: true, col: [150, 128, 104] });
    A.rock(ctx, x + 10 * s, y + 5, 0.9 * s, 62, S, { wet: true, col: [140, 118, 98] });
    const r = rand(9); ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 30; k++) { const a = r() * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 22 * s, y + 4 + Math.sin(a) * 6 * s, 0.6 + r() * 1.2, 0, TAU); ctx.fill(); }
  }
  // the creek fanning out across the beach: a wet-sand delta, braided shallow channels and sand bars
  function mouth(ctx, S) {
    const P = MOUTH, w = u => 17 + Math.pow(u, 1.3) * 70;
    ctx.save();
    A.ribbon(ctx, P, u => w(u) + 16); ctx.fillStyle = A.rgb(S.wetSand[0], 0.8); ctx.fill();
    A.ribbon(ctx, P, u => w(u) + 6); ctx.fillStyle = A.rgb(S.wetSand[1]); ctx.fill();
    A.ribbon(ctx, P, u => w(u)); ctx.fillStyle = lg(ctx, 0, P[0][1], 0, P[P.length - 1][1], [S.creek[1], S.shallow[0], S.shallow[1]]); ctx.fill();
    ctx.clip();
    const r = rand(71);
    for (const [x, y, rx, ry] of []) { blob(ctx, x + 2, y + 2, rx * 1.3, ry * 1.2, 0.3, [20, 90, 110]); ctx.fillStyle = lg(ctx, 0, y - ry, 0, y + ry, [S.sand[0], S.wetSand[0]]); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.15, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.9; ctx.stroke(); }
    ctx.lineCap = 'round';
    for (let k = 0; k < 40; k++) { const i = (r() * (P.length - 4)) | 0, d = (r() - 0.5) * w(i / P.length) * 0.8, seg = A.offsetLine(P.slice(i, i + 4), d); polyline(ctx, seg); ctx.strokeStyle = `rgba(255,255,255,${0.3 + r() * 0.4})`; ctx.lineWidth = 0.9; ctx.stroke(); }
    ctx.restore();
  }
  function footprints(ctx, pts, S) {
    const path = resample(pts, 7);
    for (let i = 1; i < path.length; i++) {
      const p = path[i], n = A.normalAt(path, i), side = i % 2 ? 1 : -1, a = Math.atan2(path[i][1] - path[i - 1][1], path[i][0] - path[i - 1][0]);
      ctx.save(); ctx.translate(p[0] + n[0] * side * 2.6, p[1] + n[1] * side * 2.6); ctx.rotate(a);
      ctx.fillStyle = 'rgba(180,130,70,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 1.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,226,.5)'; ctx.beginPath(); ctx.ellipse(-0.4, -0.6, 2, 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function shadowOf(ctx, p, S) {
    if (p.type === 'palm') A.palmShadow(ctx, p.x, p.y, p.s, p.seed, S);
    else if (p.type === 'tree') A.treeShadow(ctx, p.x, p.y, p.s, p.seed, S);
    else if (p.type === 'bush') A.bushShadow(ctx, p.x, p.y, p.s, p.seed, S);
    else if (p.type === 'plant' || p.type === 'fern') A.plantShadow(ctx, p.x, p.y, p.s * 0.8, p.seed, S);
    else if (p.type === 'rock') A.rockShadow(ctx, p.x, p.y, p.s, p.seed, S);
    else if (p.type === 'hut') A.hutShadow(ctx, p.x, p.y, p.s, S);
  }
  function drawProp(ctx, p, S) {
    switch (p.type) {
      case 'palm': return A.palm(ctx, p.x, p.y, p.s, p.seed, S);
      case 'tree': return A.tree(ctx, p.x, p.y, p.s, p.seed, S);
      case 'bush': return A.bush(ctx, p.x, p.y, p.s, p.seed, S);
      case 'plant': return A.plant(ctx, p.x, p.y, p.s, p.seed, S);
      case 'fern': return A.fern(ctx, p.x, p.y, p.s, p.seed, S);
      case 'rock': return A.rock(ctx, p.x, p.y, p.s, p.seed, S, p.o || {});
      case 'hut': return A.hut(ctx, p.x, p.y, p.s, p.seed, S);
      case 'torch': return A.torch(ctx, p.x, p.y, p.s, S);
    }
  }
  const IMG = new Image(); IMG.src = '../world-maps/pilots/lemur.png';
  function player(ctx, x, y, S) {
    blob(ctx, x + 4, y + 50, 16, 5, 0.35, [20, 40, 10]);
    glow(ctx, x, y + 14, 34, [255, 220, 120], 0.3);
    if (IMG.complete && IMG.naturalWidth) ctx.drawImage(IMG, x - 30, y - 30, 60, 60);
    // "you are here" chevron tag
    const ty = y - 38; ctx.font = '400 11px "Lilita One", sans-serif'; const w = ctx.measureText('YOU ARE HERE').width + 16;
    ctx.fillStyle = 'rgba(60,30,0,.35)'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 1, ty - 8 + 2, w, 16, 8); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, ty - 8, 0, ty + 8, ['#fff8d0', '#ffd84a', '#f0a818']); ctx.beginPath(); ctx.roundRect(x - w / 2, ty - 8, w, 16, 8); ctx.fill();
    ctx.strokeStyle = '#b8780c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 4, ty - 6.5, w - 8, 4, 2); ctx.fill();
    ctx.fillStyle = '#f0a818'; ctx.beginPath(); ctx.moveTo(x - 4, ty + 7.5); ctx.lineTo(x + 4, ty + 7.5); ctx.lineTo(x, ty + 12); ctx.fill();
    ctx.fillStyle = '#7a4208'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('YOU ARE HERE', x, ty + 1);
  }

  // A: a light finishing pass (soft sun warmth, very gentle vignette) so it still reads like the concept
  function conceptPass(ctx, S) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = rg(ctx, 40, 40, 700, [[0, 'rgba(255,236,180,.45)'], [1, 'rgba(255,236,180,0)']]); ctx.fillRect(0, 0, SW, SH);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rg(ctx, SW / 2, SH * 0.48, 560, [[0.55, 'rgba(255,255,255,0)'], [1, 'rgba(70,110,120,.35)']]); ctx.fillRect(0, 0, SW, SH);
    ctx.restore();
  }
  // B: clouds and their shadows, framing foreground foliage, haze up top, warm-light / cool-shadow grading
  function storybookPass(ctx, S) {
    ctx.save();
    // cloud shadows drifting over the land
    ctx.globalCompositeOperation = 'multiply';
    for (const [x, y, rx, ry] of [[320, 150, 110, 50], [30, 520, 80, 36]]) blob(ctx, x, y, rx, ry, 0.2, [40, 80, 110]);
    // sun rays from the top-left
    ctx.globalCompositeOperation = 'lighter';
    for (const [x0, w, a] of [[-60, 60, 0.05], [60, 36, 0.045], [150, 70, 0.04], [270, 44, 0.03]]) {
      ctx.fillStyle = lg(ctx, x0, 0, x0 + 300, SH, [[0, `rgba(255,236,170,${a})`], [1, 'rgba(255,236,170,0)']]);
      ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + w, -10); ctx.lineTo(x0 + w + 420, SH); ctx.lineTo(x0 + 420 - w * 0.2, SH); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // grading first (so the foreground frame stays deep): warm light top-left, richer contrast, cool corners
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = rg(ctx, 90, 120, 640, [[0, 'rgba(255,200,110,.42)'], [0.6, 'rgba(255,200,110,.12)'], [1, 'rgba(20,70,120,.4)']]); ctx.fillRect(0, 0, SW, SH);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rg(ctx, SW * 0.45, SH * 0.52, 560, [[0.45, 'rgba(255,255,255,0)'], [1, 'rgba(30,70,100,.55)']]); ctx.fillRect(0, 0, SW, SH);
    ctx.globalCompositeOperation = 'source-over';
    // haze at the very top: distance
    ctx.fillStyle = lg(ctx, 0, 0, 0, 120, [[0, 'rgba(226,244,236,.42)'], [1, 'rgba(226,244,236,0)']]); ctx.fillRect(0, 0, SW, 120);
    // clouds in the top corners
    A.cloud(ctx, 372, 14, 1.4, S, 0.97); A.cloud(ctx, 6, -10, 1.15, S, 0.92);
    // foreground foliage framing the edges: big canopy masses (deep, cool, rim-lit) with broad leaves over them
    const fgP = { ...S, rim: [200, 255, 170] };
    const mass = (pts, col) => { for (const [x, y, r] of pts) A.cluster(ctx, x, y, r, col, (x * 31 + y * 17) | 0, fgP); };
    const LY = 250;
    blob(ctx, 0, LY + 250, 60, 90, 0.35, [10, 30, 20]);
    mass([[-30, LY + 190, 28], [-18, LY + 232, 32], [-30, LY + 276, 28]], [44, 108, 60]);
    A.bigLeaf(ctx, -10, LY + 226, -0.3, 56, 17, [52, 124, 66], fgP, { bend: 0.2 });
    A.bigLeaf(ctx, -14, LY + 254, 0.2, 48, 15, [60, 134, 62], fgP, { bend: 0.1 });
    blob(ctx, SW, 470, 60, 90, 0.35, [10, 30, 20]);
    mass([[SW + 24, 410, 32], [SW + 12, 456, 30], [SW + 28, 500, 34]], [40, 104, 64]);
    A.bigLeaf(ctx, SW + 12, 440, Math.PI + 0.35, 60, 18, [58, 130, 64], fgP, { bend: -0.18 });
    A.bigLeaf(ctx, SW + 10, 480, Math.PI - 0.12, 50, 16, [48, 118, 70], fgP, { bend: -0.1 });
    for (let k = 0; k < 5; k++) A.frond(ctx, SW + 16, -20, Math.PI * (0.56 + k * 0.1), 78 - k * 6, 11, [58 + k * 6, 132, 64], 0.36, fgP, 300 + k, 0);
    for (let k = 0; k < 4; k++) A.frond(ctx, -22, SH - 200, -0.55 + k * 0.3, 62 - k * 5, 10, [56, 128 + k * 6, 66], 0.3, fgP, 400 + k, 0);
    ctx.restore();
  }

  window.SCENE = { drawScene, STYLES, SW, SH, N, IMG };
})();
