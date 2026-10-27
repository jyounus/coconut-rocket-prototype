// Coconut Island, screen 2 (390 x 844), the section of the map directly above the beach start: the fork. The Temple
// road comes up from screen 1's top edge on the right and climbs through the old overgrown temple (levels 4 Sunken
// Steps, 5 Dart Hall and 6 Idol's Climb): stone steps up two terrace walls, an archway, toppled blocks and columns,
// a great carved head. The Bog road comes back in from the left edge low down and crosses the murky pools of the bog
// on a boardwalk (levels 7 Murk Mire and 8 Snapjaw Swamp). Both meet at the first boss, level 9 Gobblebloom, in a
// lair walled by a ring of thorn hedge with giant flytraps guarding it; the road goes on off the top edge toward
// level 10. Drawn in its own coordinates (y 0 at its top); screen 1's map coordinates are these minus OFF, so the
// jungle and the roads run on across the seam. drawScene(c, 'day' | 'dusk', img, t, boss)
(() => {
  const M = window.MAP, S1 = window.SCENE, W = 390, H = 844, OFF = 844;
  const N = { 4: [300, 718], 5: [258, 566], 6: [306, 384], 7: [80, 694], 8: [98, 470], 9: [196, 214] };
  const STATE = { 4: [3], 5: [3], 6: [3], 7: [2], 8: [0, 'locked'], 9: [0, 'open'] };
  // screen 1's Temple road (index 4 there; kept at index 4 in the list below so its drawn detail matches), shifted up
  const T0 = S1.ROADS[4].pts.map(p => [p[0], p[1] + OFF]);
  const ROADS = [
    { pts: M.spline([[-40, 792], [-6, 776], [30, 750], [56, 722], N[7]], 10), done: true },                                   // the Bog road back in from the left
    { pts: M.spline([N[7], [86, 664], [92, 632], [94, 592], [97, 548], [100, 512], N[8]], 10), done: false },                     // 7 -> 8 over the boardwalk
    { pts: M.spline([N[8], [104, 432], [116, 384], [134, 334], [154, 288], [174, 250], N[9]], 10), done: false },                 // 8 -> 9
    { pts: M.spline([N[9], [224, 186], [244, 152], [258, 104], [266, 50], [270, 0], [272, -40]], 10), done: false },              // 9 -> 10, off the top
    { pts: T0, done: true },
    { pts: M.spline([T0[T0.length - 1], [293, 790], [298, 758], N[4]], 10), done: true },                                         // on to level 4
    { pts: M.spline([N[4], [294, 688], [287, 660], [281, 634], [272, 604], N[5]], 10), done: true },                              // 4 -> 5 up the first steps
    { pts: M.spline([N[5], [262, 536], [272, 506], [287, 478], [296, 452], [302, 422], N[6]], 10), done: true },                  // 5 -> 6 through the arch and up the second steps
    { pts: M.spline([N[6], [298, 350], [276, 312], [246, 280], [220, 252], N[9]], 10), done: true },                              // 6 -> 9
  ];
  const TEMPLE_TRAIL = [...T0, ...ROADS[5].pts.slice(1)];
  // the two terrace walls of the temple (their top edges) and their heights
  const E1 = M.spline([[212, 642], [250, 639], [300, 635], [350, 632], [412, 629]], 16), E1H = x => 15 + 1.2 * Math.sin(x / 13);
  const E2 = M.spline([[234, 458], [270, 455], [320, 451], [370, 448], [412, 446]], 16), E2H = x => 17 + 1 * Math.sin(x / 11 + 1);
  const xOn = (pts, y) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return null; };
  const yOn = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return pts[pts.length - 1][1]; };
  const S1X = (() => { let best = 1e9, x = 0; for (const p of ROADS[6].pts) { const d = Math.abs(p[1] - yOn(E1, p[0])); if (d < best) { best = d; x = p[0]; } } return x; })();
  const S2X = (() => { let best = 1e9, x = 0; for (const p of ROADS[7].pts) { const d = Math.abs(p[1] - yOn(E2, p[0])); if (d < best) { best = d; x = p[0]; } } return x; })();
  const ARCH = [267, 524];
  // the bog's pools (outline control points)
  const POOLS = [
    { c: [[-30, 556], [10, 546], [56, 550], [104, 548], [142, 562], [154, 590], [136, 614], [96, 626], [50, 628], [10, 620], [-30, 606]], seed: 11 },
    { c: [[-30, 380], [8, 366], [46, 370], [70, 388], [62, 412], [28, 424], [-30, 420]], seed: 12 },
    { c: [[122, 704], [148, 694], [176, 700], [182, 718], [162, 730], [132, 728]], seed: 13 },
  ];
  // the boss lair: a horseshoe of thorn hedge round the back of level 9, open to the south where both roads come in,
  // with a gap on its north-east side where the road leaves for level 10
  const LAIR = [196, 204, 96, 54];
  const arc = (a0, a1) => { const out = []; for (let k = 0; k <= 30; k++) { const a = (a0 + (a1 - a0) * k / 30) * Math.PI / 180; out.push([LAIR[0] + Math.cos(a) * LAIR[2], LAIR[1] + Math.sin(a) * LAIR[3]]); } return out; };
  const HEDGES = [arc(148, 286), arc(316, 392)];
  // the jungle: [species, x, y, height (or scale), width, seed, depth tone]
  const TREES = [
    // the far top-left, behind the bog
    ['fig', 34, 150, 128, 108, 201, 0.3], ['tall', 108, 96, 138, 70, 202, 0.24], ['leaf', 16, 300, 88, 78, 203, 0.14], ['bush', 70, 318, 28, 0, 204, 0.1], ['fern', 92, 176, 0.85, 0, 205],
    ['broad', 156, 56, 100, 90, 206, 0.3], ['banana', 60, 214, 56, 0, 207], ['bush', 130, 150, 30, 0, 208, 0.18], ['grass', 104, 250, 0.75, 0, 209],
    // the top right, beyond the temple
    ['tall', 334, 112, 140, 76, 211, 0.26], ['leaf', 384, 196, 96, 84, 212, 0.18], ['fig', 396, 316, 116, 96, 213, 0.12], ['bush', 312, 172, 30, 0, 214, 0.15], ['fern', 360, 250, 0.85, 0, 215], ['banana', 296, 70, 54, 0, 216],
    // the middle mass between the two branches
    ['broad', 182, 432, 98, 84, 221, 0.1], ['bush', 196, 548, 30, 0, 222, 0.05], ['plant', 214, 556, 0.85, 0, 234], ['leaf', 180, 664, 90, 80, 223, 0.04], ['tall', 226, 704, 136, 72, 224, -0.1],
    ['bush', 150, 470, 30, 0, 225, 0.05], ['fern', 212, 470, 0.85, 0, 227], ['bush', 236, 610, 28, 0, 228], ['fern', 184, 704, 0.9, 0, 229], ['grass', 132, 610, 0.8, 0, 230],
    ['bush', 216, 770, 32, 0, 231], ['fan', 160, 792, 62, 0, 232], ['fern', 240, 760, 0.8, 0, 233],
    // the right edge by the temple
    ['broad', 400, 548, 96, 82, 241, 0.1], ['leaf', 392, 790, 90, 80, 242, 0], ['bush', 372, 672, 30, 0, 243], ['fern', 380, 590, 0.85, 0, 244], ['banana', 360, 806, 56, 0, 245],
    ['grass', 244, 420, 0.75, 0, 246], ['bush', 244, 336, 28, 0, 247, 0.1], ['fern', 330, 300, 0.8, 0, 248],
  ];
  const MANGROVES = [[8, 598, 82, 56, 251], [22, 396, 70, 46, 253]];
  const REEDS = [[146, 572, 0.85, 10], [60, 624, 0.85, 1], [118, 622, 0.75, 2], [140, 566, 0.8, 3], [-4, 560, 0.8, 4], [66, 420, 0.7, 5], [52, 372, 0.6, 6], [176, 726, 0.7, 7], [126, 700, 0.6, 8], [78, 552, 0.7, 9]];
  const LILIES = [[34, 586, 6, 0.6, 1, true], [46, 598, 4.2, 2.4, 2], [128, 590, 5, 4, 3], [118, 604, 3.6, 1.2, 4], [64, 604, 3.4, 5.2, 5], [36, 404, 5, 1.8, 6, true], [14, 396, 3.6, 3, 7], [152, 716, 4, 0.4, 8], [60, 568, 3, 2, 9]];
  const BUBBLES = [[22, 612, 1, 1], [126, 576, 0.8, 2], [48, 394, 0.8, 3]];
  const SUNNY = [[262, 420, 26, 10, 1], [300, 600, 24, 9, 2], [196, 290, 30, 10, 3], [330, 760, 22, 8, 4], [250, 330, 22, 8, 5]];
  const MASSES = [[330, 404, 22, 9, 1], [236, 716, 22, 10, 2], [120, 520, 22, 9, 3], [300, 280, 20, 8, 4], [56, 740, 22, 10, 5]];
  const TUFTS = [[244, 470], [336, 584], [234, 376], [140, 420], [40, 470], [136, 260], [330, 690], [250, 790], [118, 760]];
  const FLOWERS = [[246, 600, [236, 92, 116]], [330, 360, [255, 160, 70]], [120, 470, [255, 206, 80]], [224, 270, [236, 92, 116]], [352, 720, [255, 128, 36]], [34, 718, [244, 56, 92]], [270, 380, [255, 196, 40]]];

  function drawTree(c, P, [k, x, y, h, w, sd, k0 = 0]) {
    if (k === 'broad') M.broadTree(c, P, x, y, h, w, sd, k0);
    else if (k === 'fig') M.figTree(c, P, x, y, h, w, sd, k0);
    else if (k === 'tall') M.tallTree(c, P, x, y, h, w, sd, k0);
    else if (k === 'leaf') M.leafTree(c, P, x, y, h, w, sd, k0);
    else if (k === 'fan') M.fanPalm(c, P, x, y, h, sd);
    else if (k === 'banana') M.banana(c, P, x, y, h, sd);
    else if (k === 'fern') M.fern(c, P, x, y, h, sd);
    else if (k === 'plant') M.plant(c, P, x, y, h, sd);
    else if (k === 'grass') M.tallGrass(c, P, x, y, h, sd);
    else M.bush(c, P, x, y, h, sd, k0);
  }

  function drawScene(c, mode, img, t = 0, boss = null) {
    const P = M.PAL[mode], G = P.grass;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const dRoad = (x, y) => Math.min(...ROADS.map(r => M.dist(r.pts, x, y)));
    const nearNode = (x, y, k = 1) => Object.values(N).some(n => Math.hypot((n[0] - x) / (32 * k), (n[1] - y) / (17 * k)) < 1);
    const inPool = (x, y, m = 0) => POOLS.some(p => { const pts = p.pts; if (!pts) return false; let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside || (m > 0 && M.dist(pts, x, y) < m); });
    for (const p of POOLS) if (!p.pts) p.pts = M.closedSpline(p.c, 10);
    // ---- the ground: the lawn's gradient runs on from screen 1 (drawn in its coordinates) ----
    c.save(); c.translate(0, OFF);
    c.fillStyle = M.LG(c, 0, 0, 120, 620, [M.mix(G.mid, G.shade, 0.75), M.mix(G.mid, G.shade, 0.25), M.mix(G.mid, G.lit, 0.65)]); c.fillRect(-20, -OFF - 20, W + 40, OFF + 20);
    c.restore();
    {   // quiet value steps: the bog side greyer and cooler, the temple terraces warmer and drier, lighter clearings
      const blob = (x, y, r, cl, a, sy = 0.7) => { c.save(); c.translate(x, y); c.scale(1, sy); const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, M.rgb(cl, a)); g.addColorStop(0.6, M.rgb(cl, a * 0.6)); g.addColorStop(1, M.rgb(cl, 0)); c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.restore(); };
      blob(60, 560, 170, M.mix(G.shade, P.bog.mid, 0.5), 0.55); blob(40, 410, 110, M.mix(G.shade, P.bog.mid, 0.45), 0.45); blob(130, 712, 70, M.mix(G.shade, P.bog.mid, 0.45), 0.35);
      blob(300, 540, 120, M.mix(G.patch, P.stone.lit, 0.4), 0.2); blob(310, 380, 90, M.mix(G.patch, P.stone.lit, 0.4), 0.18);
      blob(196, 230, 120, M.mix(G.shade, P.leaf.deep, 0.4), 0.3, 0.6);   // the lair: a darker, overgrown hollow
      for (const [x, y, r] of [[300, 600, 70], [230, 330, 80], [310, 760, 60]]) blob(x, y, r, G.patch, 0.3);
      for (const [k, x, y, h, w] of TREES) if (['broad', 'fig', 'tall', 'leaf'].includes(k)) { M.softShadow(c, x + 6, y - 4, w * 0.85, w * 0.45, 0.3, 0, G.edge); M.softShadow(c, x + 4, y - 2, w * 0.5, w * 0.24, 0.24, 0, G.edge); }
    }
    for (const [x, y, rx, ry, sd] of SUNNY) M.sunPatch(c, P, x, y, rx, ry, 500 + sd);
    const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
    M.grassMarks(c, P, -10, -10, W + 10, H - 6, 1300, 21, (x, y) => dRoad(x, y) > 10 && !nearNode(x, y) && !inPool(x, y, 8) && hash(x, y) < (dRoad(x, y) < 22 ? 0.85 : 0.22));
    for (const [x, y, rx, ry, sd] of MASSES) M.grassMass(c, P, x, y, rx, ry, 600 + sd);
    // ---- roads, the temple's paving, its terraces and steps ----
    M.roads(c, P, ROADS.map(r => r.pts), () => true, []);
    const onTerrace = (x, y) => (y < yOn(E1, x) - 3 && x > 226) || (y < yOn(E2, x) - 3 && x > 240);
    const skipPave = (x, y) => nearNode(x, y, 1.05) || !onTerrace(x, y) || y < 345 || Math.hypot(x - ARCH[0], y - ARCH[1]) < 9 || Math.abs(y - yOn(E2, x) - 8) < 14 || Math.abs(y - yOn(E1, x) - 7) < 13;
    M.paving(c, P, ROADS[6].pts, 31, skipPave); M.paving(c, P, ROADS[7].pts, 32, skipPave); M.paving(c, P, ROADS[8].pts, 33, skipPave);
    M.stoneTerrace(c, P, E2, [{ x: S2X, hw: 12 }], E2H, 7, [true, false]);
    M.stoneSteps(c, P, ROADS[7].pts, yOn(E2, S2X), yOn(E2, S2X) + E2H(S2X), 4);
    M.stoneTerrace(c, P, E1, [{ x: S1X, hw: 12 }], E1H, 5, [true, false]);
    M.stoneSteps(c, P, ROADS[6].pts, yOn(E1, S1X), yOn(E1, S1X) + E1H(S1X), 4);
    // ---- the bog: pools over the roads, then the boardwalk ----
    for (const p of POOLS) M.bogPool(c, P, p.c, p.seed);
    const bw = ROADS[1].pts.filter(p => p[1] < 648 && p[1] > 530);
    M.boardwalk(c, P, bw, 16, 41, (x, y) => inPool(x, y) ? 1 : 0);
    for (const [x, y, r, rot, sd, fl] of LILIES) M.lilyPad(c, P, x, y, r, rot, 700 + sd, !!fl);
    for (const [x, y, s, sd] of BUBBLES) M.bubbles(c, P, x, y, s, 800 + sd);
    // ---- the trail along the roads (gold where walked, worn dashes ahead) ----
    const skip = (x, y) => nearNode(x, y, 0.95) || inPool(x, y, 4) || Math.abs(x - S1X) < 13 && Math.abs(y - yOn(E1, S1X) - 8) < 13 || Math.abs(x - S2X) < 13 && Math.abs(y - yOn(E2, S2X) - 9) < 14;
    M.trail(c, P, TEMPLE_TRAIL, true, skip);
    for (const k of [0, 1, 2, 3, 6, 7, 8]) M.trail(c, P, ROADS[k].pts, ROADS[k].done, skip);
    // ---- the level clearings, the open level's light ----
    for (const k of [4, 5, 6, 7, 8]) M.clearing(c, P, N[k][0], N[k][1], 28, false);
    M.clearing(c, P, N[9][0], N[9][1], 34, false);
    M.nodeGlow(c, N[9][0], N[9][1], t);
    for (const [x, y] of TUFTS) M.tuftCluster(c, P, x, y, 1, (x * 7 + y) | 0);
    for (const [x, y, cl] of FLOWERS) M.flowerPatch(c, P, x, y, cl, (x + y) | 0);
    // ---- everything standing, back to front ----
    const stand = [];
    for (const tr of TREES) stand.push({ y: tr[2], f: () => drawTree(c, P, tr) });
    for (const tr of S1.TREES) if (tr[2] - (tr[3] > 5 ? tr[3] : 40) < 30) stand.push({ y: tr[2] + OFF, f: () => drawTree(c, P, [tr[0], tr[1], tr[2] + OFF, ...tr.slice(3)]) });
    for (const [x, y, h, w, sd] of MANGROVES) stand.push({ y, f: () => M.mangrove(c, P, x, y, h, w, sd, inPool(x, y)) });
    for (const [x, y, s, sd] of REEDS) stand.push({ y, f: () => M.reeds(c, P, x, y, s, 900 + sd, inPool(x, y)) });
    // the temple's ruins
    stand.push({ y: ARCH[1], f: () => M.archway(c, P, ARCH[0], ARCH[1], 22, 32, 61) });
    stand.push({ y: 424, f: () => M.idolHead(c, P, 356, 424, 1.1, 62, { glow: mode === 'dusk' }) });
    stand.push({ y: 700, f: () => M.idolHead(c, P, 358, 700, 0.72, 63, { vine: false }) });
    for (const x of [S2X - 21, S2X + 21]) stand.push({ y: yOn(E2, x) + E2H(x) + 9, f: () => M.brazier(c, P, x, yOn(E2, x) + E2H(x) + 9, 0.85, t) });
    stand.push({ y: 754, f: () => M.pillar(c, P, 340, 754, 22, 4.6, 64, { vine: true }) });
    stand.push({ y: 610, f: () => M.pillar(c, P, 340, 610, 28, 4.8, 65) });
    stand.push({ y: 404, f: () => M.pillar(c, P, 258, 404, 18, 4.4, 66) });
    stand.push({ y: 658, f: () => M.ruinBlock(c, P, 216, 658, 9, 21, 5, 72, { sk: 2.4, dd: 3, moss: true }) });   // the terraces' corner piers
    stand.push({ y: 476, f: () => M.ruinBlock(c, P, 238, 476, 9, 23, 5, 73, { sk: 2.4, dd: 3, glyph: 1 }) });
    for (const [x, y, r, sd] of [[214, 318, 9, 81], [228, 324, 6, 82], [202, 326, 4.5, 83]]) stand.push({ y, f: () => M.rock(c, P, x, y, r, sd, true) });
    stand.push({ y: 330, f: () => M.fern(c, P, 224, 330, 0.55, 84) });
    stand.push({ y: 762, f: () => M.drum(c, P, 244, 762, 4.4, 9, -0.25, 67) });
    stand.push({ y: 596, f: () => M.ruinBlock(c, P, 322, 596, 13, 8, 6, 68, { glyph: 0, moss: true, rot: 0.08 }) });
    stand.push({ y: 690, f: () => M.ruinBlock(c, P, 254, 690, 11, 7, 6, 69, { moss: true, rot: -0.12, chip: true }) });
    stand.push({ y: 432, f: () => M.ruinBlock(c, P, 252, 432, 10, 7, 5, 70, { glyph: 2, rot: -0.06 }) });
    stand.push({ y: 344, f: () => M.ruinBlock(c, P, 334, 344, 12, 7, 6, 71, { band: true, moss: true, rot: 0.05 }) });
    // the boss lair: two flytraps behind the hedge, the hedge in short runs (so things sort with it), two big flytraps
    // guarding the open front
    stand.push({ y: 150, f: () => M.flytrap(c, P, 132, 168, 0.95, 1, 0.55, 3) });
    stand.push({ y: 164, f: () => M.flytrap(c, P, 268, 172, 0.9, -1, 0.65, 4) });
    for (const hp of HEDGES) for (let i = 0; i < hp.length - 1; i += 6) { const seg = hp.slice(i, Math.min(hp.length, i + 7)); stand.push({ y: Math.max(...seg.map(p => p[1])), f: () => M.thornHedge(c, P, seg, 20, 300 + i + (hp === HEDGES[0] ? 0 : 50)) }); }
    stand.push({ y: 252, f: () => M.flytrap(c, P, 120, 252, 1.25, 1, 0.8, 1) });
    stand.push({ y: 254, f: () => M.flytrap(c, P, 274, 254, 1.25, -1, 0.75, 2) });
    stand.sort((a, b) => a.y - b.y).forEach(s => s.f());
    if (mode === 'dusk') duskGrade(c, P); else dayGrade(c);
    // ---- the level tokens and the player ----
    for (const k of [4, 5, 6, 7, 8]) { const [st, s] = STATE[k]; M.node(c, P, N[k][0], N[k][1], String(k), st, false, t, { locked: s === 'locked' }); }
    const [x9, y9] = N[9];
    if (img && img.naturalWidth) { const sun = P.sun ?? M.SUN, L = 30 * (P.shLen ?? 0.3) / 0.3; const sx = x9 + 20 + Math.cos(sun) * L * 0.2, sy = y9 - 1 + Math.sin(sun) * L * 0.2; M.softShadow(c, sx, sy, 11, 3.6, P.shadowA * 1.6, sun * 0.4, P.shadowC); M.softShadow(c, sx, sy, 6, 2, P.shadowA * 1.2, sun * 0.4, P.shadowC); }
    M.node(c, P, x9, y9, '9', 0, true, t, { r: 21, img: boss });
    const coinTop = y9 - M.TOKEN_LIFT - 4 - 21;
    let headY = coinTop - 40;
    if (img && img.naturalWidth) {
      const s = 62, bottom = coinTop - 12 + Math.sin(t * 2) * 1.2;
      M.softShadow(c, x9 + 2, coinTop + 3, 10, 2.6, 0.4, 0, P.shadowC);
      M.lightPool(c, x9, coinTop + 2, 18, 7, [255, 196, 100], 0.75);
      M.glow(c, x9 - 2.4, bottom - 2, 14, [255, 180, 80], 0.35);
      M.thruster(c, x9 - 2.4, bottom - 9, 14.5, 7, t);
      c.drawImage(img, x9 - s / 2, bottom - s, s, s);
      headY = bottom - s;
    }
    M.banner(c, x9, headY - 15, 'YOU ARE HERE');
    if (mode === 'dusk') for (const [x, y, a] of [[40, 520, 0.5], [150, 640, 0.45], [70, 340, 0.4], [330, 520, 0.35], [230, 420, 0.4], [20, 680, 0.45], [120, 560, 0.35], [300, 250, 0.3], [180, 760, 0.35]]) M.firefly(c, x, y, a);
  }
  // the day grade, laid in screen 1's coordinates so it runs on across the seam (its vignette mirrors screen 1's)
  function dayGrade(c) {
    c.save(); c.globalCompositeOperation = 'soft-light'; c.translate(0, OFF);
    const g = c.createRadialGradient(40, 40, 10, 120, 200, 800); g.addColorStop(0, 'rgba(255,240,200,.3)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.fillRect(-10, -OFF - 10, W + 20, OFF + 10); c.restore();
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(10,30,40,0)'); v.addColorStop(1, 'rgba(10,30,40,.2)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  // dusk: screen 1's lighting model carried on (the land keeps cooling away from the beach), then the warm lights of
  // this screen: the braziers, the idol's eyes, the lair's nectar glow and the open level
  function duskGrade(c, P) {
    c.save(); c.translate(0, OFF);
    const R = [-10, -OFF - 10, W + 20, OFF + 10];
    c.globalCompositeOperation = 'soft-light';
    const s = c.createLinearGradient(0, 0, W * 0.75, H * 0.65); s.addColorStop(0, 'rgba(255,150,90,.5)'); s.addColorStop(0.5, 'rgba(255,130,120,.18)'); s.addColorStop(1, 'rgba(255,130,120,0)');
    c.fillStyle = s; c.fillRect(...R);
    c.globalCompositeOperation = 'multiply';
    const top = c.createLinearGradient(0, 0, 0, H * 0.6); top.addColorStop(0, 'rgba(84,104,156,.55)'); top.addColorStop(0.55, 'rgba(120,140,180,.22)'); top.addColorStop(1, 'rgba(160,170,200,0)');
    c.fillStyle = top; c.fillRect(...R);
    c.globalCompositeOperation = 'soft-light';
    const side = c.createLinearGradient(0, 0, W, 0); side.addColorStop(0, 'rgba(255,160,90,.32)'); side.addColorStop(0.6, 'rgba(255,160,90,0)');
    c.fillStyle = side; c.fillRect(...R);
    c.restore();
    c.save();
    const v = c.createRadialGradient(W * 0.45, H * 0.55, H * 0.3, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(30,20,60,0)'); v.addColorStop(1, 'rgba(30,20,60,.25)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    c.restore();
    for (const x of [S2X - 21, S2X + 21]) { const y = yOn(E2, x) + E2H(x) + 9; M.lightPool(c, x, y + 2, 40, 16, [255, 168, 92], 0.5); M.glow(c, x, y - 24, 30, [255, 150, 50], 0.28); }
    M.lightPool(c, N[9][0], N[9][1], 70, 30, [255, 214, 140], 0.3);
    for (const [x, y] of [[148, 220], [246, 222], [150, 140], [252, 146]]) M.glow(c, x, y, 26, [255, 120, 110], 0.12);
  }
  window.SCENE2 = { drawScene, W, H, N, OFF };
})();
