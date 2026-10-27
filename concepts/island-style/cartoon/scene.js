// The beach start of Coconut Island on one phone screen (390 x 844): level 1's launch pad by the stilt hut, the road up
// over the creek to level 2 and the open level 3 (the lemur and "you are here"), then a clear fork above it toward the
// Temple and the Bog with a signpost on each branch. The creek rises from a spring under a rock outcrop in the
// right-hand jungle, drops over the berm as a little waterfall and runs out across the beach into the surf. Jungle in
// a few masses of mixed species, darker and cooler at the back. drawScene(c, 'day' | 'dusk').
(() => {
  const M = window.MAP, W = 390, H = 844;
  const COAST = M.spline([[-20, 744], [40, 735], [100, 739], [160, 749], [220, 757], [280, 752], [340, 741], [410, 730]], 12);
  const EDGE = M.spline([[-20, 600], [22, 593], [52, 601], [84, 607], [114, 597], [142, 590], [174, 599], [206, 611], [238, 605], [264, 590], [292, 576], [322, 568], [352, 561], [380, 549], [410, 541]], 14);
  const N = { 1: [186, 670], 2: [133, 521], 3: [172, 350] }, J = [250, 200];
  const ROADS = [
    { pts: M.spline([[186, 670], [181, 632], [176, 604], [165, 583], [144, 556], [133, 521]], 10), done: true },
    { pts: M.spline([[133, 521], [132, 482], [140, 448], [158, 400], [172, 350]], 10), done: true },
    { pts: M.spline([[172, 350], [202, 345], [228, 324], [244, 288], [250, 244], J], 10), done: false },
    { pts: M.spline([J, [205, 176], [150, 158], [80, 138], [10, 118], [-30, 106]], 10), done: false },
    { pts: M.spline([J, [268, 150], [280, 90], [286, 20], [290, -30]], 10), done: false },
  ];
  const SPRING = [334, 490];
  const yEdge = x => { for (let i = 1; i < EDGE.length; i++) if (EDGE[i][0] >= x) { const a = EDGE[i - 1], b = EDGE[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return EDGE[EDGE.length - 1][1]; };
  const yCoast = x => { for (let i = 1; i < COAST.length; i++) if (COAST[i][0] >= x) { const a = COAST[i - 1], b = COAST[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return COAST[COAST.length - 1][1]; };
  // the bluff's height along the shore: an even step, a touch taller where the creek has cut its fall, rising
  // toward the headland the hut stands under
  const BANK_H = x => 9 + 1.1 * Math.sin(x / 9.5 + 0.7) + 0.7 * Math.sin(x / 4.3) + 9 / (1 + Math.exp(-(x - 262) / 22)) + 1.5 * Math.exp(-(((x - 72) / 16) ** 2));   // one even bluff that rises toward the hut's headland on the right
  const FALL_X = 72, FALL_TOP = yEdge(FALL_X), FALL_H = BANK_H(FALL_X), FALL_W = 22;
  const POOL = [FALL_X, FALL_TOP + FALL_H + 5, 14, 6];
  const CREEK = M.spline([[318, 492], [288, 500], [258, 489], [226, 474], [186, 466], [150, 451], [120, 447], [96, 460], [81, 498], [75, 556], [73, 584], [FALL_X, FALL_TOP + 1]], 12);
  // the creek's fan across the beach: from the splash pool to a little past the waterline (the surf covers its end)
  const DAXIS = M.spline([[FALL_X, POOL[1] + 2], [71, 654], [73, 682], [76, 712], [78, yCoast(78) + 8]], 14);
  const MOUTH = 77, BULGE = x => 11 * Math.exp(-(((x - MOUTH) / 34) ** 2));   // the plume shoves the surf out round the mouth
  // where the road crosses the creek (the bridge) and the berm (the ramp)
  const rp1 = ROADS[1].pts; let BI = 0; { let bd = 1e9; rp1.forEach((p, i) => { const d = M.dist(CREEK, p[0], p[1]); if (d < bd) { bd = d; BI = i; } }); }
  const BRIDGE = rp1[BI];
  const RAMP_X = (() => { let best = 1e9, x = 0; for (const p of ROADS[0].pts) { const d = Math.abs(p[1] - yEdge(p[0])); if (d < best) { best = d; x = p[0]; } } return x; })();
  const HUT = [300, 677];
  // the jungle: [species, x, y, height (or scale), width, seed, depth tone (0 front .. 0.35 far back)]
  const TREES = [
    // left mass
    ['fan', 20, 214, 70, 0, 4], ['fig', 58, 272, 120, 104, 17, 0.36], ['tall', 50, 384, 138, 76, 12, -0.24], ['leaf', 12, 438, 84, 74, 13, 0.12],
    ['banana', 66, 452, 62, 0, 14], ['bush', 28, 472, 34, 0, 15], ['bush', 88, 442, 26, 0, 16],
    ['fern', 72, 388, 0.9, 0, 18], ['grass', 28, 396, 0.9, 0, 19], ['fern', 48, 484, 1, 0, 20], ['plant', 4, 492, 0.9, 0, 51], ['fern', 94, 420, 0.8, 0, 52], ['bush', 50, 324, 28, 0, 53], ['grass', 100, 470, 0.75, 0, 59],
    // top mass, between the two forks (the far back of the screen: darkest and coolest)
    ['leaf', 36, 70, 92, 84, 27, 0.2], ['fig', 126, 78, 116, 100, 28, 0.36], ['tall', 172, 134, 128, 66, 24, -0.26],
    ['bush', 128, 146, 30, 0, 25],
    ['fern', 66, 118, 0.85, 0, 54], ['grass', 150, 150, 0.7, 0, 55], ['bush', 30, 116, 30, 0, 57], ['banana', 92, 132, 52, 0, 58],
    // top right
    ['tall', 374, 120, 130, 76, 31, 0.3], ['leaf', 350, 174, 92, 82, 32, -0.2], ['bush', 372, 214, 30, 0, 33], ['fern', 342, 202, 0.85, 0, 35], ['grass', 330, 222, 0.75, 0, 37],
    // right mass over the spring
    ['broad', 384, 346, 96, 80, 46, 0.24], ['fig', 382, 414, 108, 92, 41, -0.12], ['tall', 414, 456, 128, 76, 42, 0], ['fan', 342, 448, 70, 0, 43], ['banana', 364, 478, 56, 0, 44], ['bush', 398, 492, 34, 0, 45],
    ['fern', 370, 508, 0.8, 0, 47], ['plant', 412, 472, 0.9, 0, 48], ['grass', 352, 430, 0.8, 0, 49], ['grass', 312, 512, 0.7, 0, 50],
  ];
  // sunlit patches and clover on the open lawn, so the big fields have quiet value steps (light, mid, dark clumps)
  const SUNNY = [[262, 376, 32, 13, 1], [244, 458, 22, 9, 2], [152, 206, 36, 12, 3], [214, 236, 20, 8, 4], [326, 284, 24, 10, 5], [98, 300, 22, 9, 6], [292, 520, 26, 9, 7], [52, 540, 20, 8, 8]];
  const CLOVER = [[258, 394, 1], [232, 368, 0.8], [206, 452, 0.9], [150, 200, 1], [192, 224, 0.85], [118, 236, 0.8], [276, 470, 0.8], [104, 308, 0.8], [306, 540, 0.85], [216, 300, 0.75]];
  const DAPPLE = [[86, 286, 34], [160, 176, 26], [96, 420, 26]];
  const TUFTS = [[300, 250], [112, 248], [222, 424], [205, 560], [330, 318], [95, 330], [250, 510], [210, 270], [300, 200]];
  // flowers, the saturated ones placed along the road to lead the eye up it
  const FLOWERS = [[318, 352, [236, 92, 116]], [238, 448, [255, 160, 70]], [100, 584, [255, 206, 80]], [262, 470, [236, 92, 116]], [252, 568, [255, 160, 70]],
    [154, 474, [244, 56, 92]], [204, 376, [255, 128, 36]], [236, 258, [244, 56, 92]], [100, 486, [255, 196, 40]], [286, 214, [255, 128, 36]]];
  const PEBBLES = [[280, 300, 2.4], [285, 304, 1.6], [200, 482, 2], [96, 352, 2.2], [262, 542, 2], [222, 302, 1.8]];
  // calm interest on the open lawn: darker masses of longer grass, a small rock outcrop with ferns and flowers
  const MASSES = [[272, 318, 34, 14, 1], [236, 426, 30, 11, 2], [312, 452, 22, 9, 3], [34, 546, 26, 12, 4], [26, 392, 22, 10, 5], [196, 270, 18, 8, 6]];
  const PATCHES = [[300, 150, 90], [120, 330, 110], [300, 470, 80], [210, 560, 70], [60, 120, 70]];
  const RIPPLES = [[122, 676, 13, 3], [228, 714, 15, 3], [140, 630, 10, 2], [356, 700, 12, 2], [196, 744, 12, 2], [120, 720, 9, 2]];
  // wave rows: long and close near the shore, shorter and sparser farther out
  const WAVES = [[24, 30, 13, 0.8], [35, 44, 10, 0.6], [49, 70, 7, 0.42], [66, 120, 5, 0.28], [86, 170, 3.6, 0.2]];   // busiest by the surf, calm deep water

  function drawScene(c, mode, img, t = 0, opt = {}) {
    const P = M.PAL[mode], prog = !!opt.prog;   // opt.prog: the later demo progress (levels 1-3 cleared, every road here lit, no pilot)
    c.lineCap = 'round'; c.lineJoin = 'round';
    const onGrass = (x, y) => y < yEdge(x) - 3;
    const nearRoad = (x, y, m) => ROADS.some(r => M.dist(r.pts, x, y) < m);
    // ---- the beach and the sea ----
    M.sand(c, P, EDGE, RIPPLES, W);
    c.save(); M.poly(c, [...COAST, [W + 20, H + 20], [-20, H + 20]]); c.closePath(); c.clip();
    M.sea(c, P, COAST, W, H + 10);
    M.reefShelf(c, P, COAST, 40, 56, 12);
    M.reef(c, P, 296, 806, 46, 12, 5);
    M.plume(c, P, MOUTH, yCoast(MOUTH) + 4, 58, 30, 4);
    M.waveRows(c, P, COAST, WAVES, 3);
    M.swells(c, P, COAST, [[89, 0.9], [98, 0.7]], 9);
    if (mode === 'dusk') {
      // the sunset sky mirrored in the sea: a pink-to-violet wash (the same light that turns the sand lavender),
      // warmest near the shore, then the low sun's glints
      c.save(); c.globalCompositeOperation = 'soft-light';
      const rf = c.createLinearGradient(0, 740, W * 0.4, H); rf.addColorStop(0, 'rgba(255,170,150,.55)'); rf.addColorStop(0.5, 'rgba(220,140,190,.4)'); rf.addColorStop(1, 'rgba(120,100,210,.35)');
      c.fillStyle = rf; c.fillRect(0, 720, W, H); c.restore();
      M.glints(c, P, 0, 772, W, 842, 30, 13);
    }
    c.restore();
    M.surfWet(c, P, COAST);
    M.delta(c, P, DAXIS, u => 21 + 52 * Math.pow(u, 1.7), [
      [0.42, 0.6, -0.07, 7.5, 0.02], [0.63, 0.8, 0.25, 6, 0.04], [0.74, 0.88, -0.3, 4.5, -0.03],
    ], [
      [[0.12, 0], [0.3, -0.04], [0.45, -0.2], [0.62, -0.22], [0.8, -0.18], [1, -0.16]],
      [[0.3, 0], [0.42, 0.17], [0.56, 0.16], [0.72, 0.1], [0.88, 0.08], [1, 0.06]],
      [[0.5, 0.17], [0.62, 0.3], [0.78, 0.42], [1, 0.42]],
    ], POOL, [yCoast(78) - 16, yCoast(78) + 6]);
    M.surfFoam(c, P, COAST, BULGE);
    M.deltaFoam(c, P, COAST, MOUTH, BULGE);
    M.seaRock(c, P, 316, 802, 8, 5, true); M.seaRock(c, P, 332, 810, 4.5, 6, false); M.seaRock(c, P, 362, 820, 10, 7, true);
    // beach finds, kept faint
    // the beach finds in a few groups: a well-trodden trail of prints from the hut's ladder to the pad, rocks and
    // shells round the beached canoe, driftwood and a shell washed up by the creek, a crab's track by the surf
    M.prints(c, P, M.spline([[284, 690], [262, 692], [242, 688], [226, 682]], 10), 4.4, false, 1, 1.9);
    M.prints(c, P, M.spline([[288, 694], [270, 700], [250, 698], [232, 690]], 10), 4.4, false, 5, 1.3);
    M.prints(c, P, M.spline([[236, 744], [252, 730], [246, 716], [262, 702]], 10), 3, true, 3);
    for (const [x, y, r, rot, k] of [[338, 726, 3.6, 0.3, 0], [350, 721, 1.6, -0.5, 1], [306, 727, 2.2, 0.8, 0], [358, 733, 4, 0.2, 1], [128, 732, 2.4, 1.2, 1], [214, 744, 1.6, 0.6, 0]]) M.shell(c, P, x, y, r, rot, k);
    M.driftwood(c, P, 132, 718, 26, 0.5, 4);
    M.canoe(c, P, 320, 710, 48, -0.1);
    M.rock(c, P, 352, 712, 8, 3, false); M.rock(c, P, 364, 718, 4, 31, false); M.pebble(c, P, 344, 718, 1.6); M.pebble(c, P, 370, 724, 1.2); M.pebble(c, P, 330, 730, 1.4);
    M.rock(c, P, 124, 702, 3.4, 33, false); M.pebble(c, P, 131, 705, 1.4);
    // ---- the lawn ----
    M.grass(c, P, EDGE, W, PATCHES);
    {   // value steps across the lawn: cool, darker ground pooled under each canopy, and a warmer, drier band toward
      // the beach, so the big fields are never one flat green
      c.save(); M.poly(c, [...EDGE, [W + 20, -20], [-20, -20]]); c.closePath(); c.clip();
      for (const [k, x, y, h, w] of TREES) if (['broad', 'fig', 'tall', 'leaf'].includes(k)) { M.softShadow(c, x + 6, y - 4, w * 0.85, w * 0.45, 0.3, 0, P.grass.edge); M.softShadow(c, x + 4, y - 2, w * 0.5, w * 0.24, 0.24, 0, P.grass.edge); }
      const warm = c.createLinearGradient(0, 470, 0, 605); warm.addColorStop(0, M.rgb(M.mix(P.grass.lit, P.sand.lit, 0.55), 0)); warm.addColorStop(1, M.rgb(M.mix(P.grass.lit, P.sand.lit, 0.55), 0.3));
      c.fillStyle = warm; c.fillRect(-20, 440, W + 40, 200);
      c.restore();
    }
    for (const [x, y, rx, ry, sd] of SUNNY) M.sunPatch(c, P, x, y, rx, ry, 400 + sd);
    // grass blades clustered along the road verges, the creek and round the tree bases, sparse in the open lawn so
    // it has calm areas
    const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
    const featD = (x, y) => Math.min(...ROADS.map(r => M.dist(r.pts, x, y)), M.dist(CREEK, x, y), ...TREES.filter(t => ['broad', 'fig', 'tall', 'leaf', 'banana', 'fan'].includes(t[0])).map(t => Math.hypot(t[1] - x, (t[2] - y) * 1.6)));
    M.grassMarks(c, P, -10, -10, W + 10, 600, 1300, 11, (x, y) => onGrass(x, y - 4) && !nearRoad(x, y, 10) && M.dist(CREEK, x, y) > 11 && Object.values(N).every(n => Math.hypot((n[0] - x) / 32, (n[1] - y) / 18) > 1) && hash(x, y) < (d => d < 20 ? 0.95 : d < 36 ? 0.5 : 0.14)(featD(x, y)));
    for (const [x, y, rx, ry, sd] of MASSES) M.grassMass(c, P, x, y, rx, ry, sd);
    M.bank(c, P, EDGE, [{ x: RAMP_X, hw: 8 }, { x: FALL_X, hw: FALL_W / 2 + 3 }], BANK_H);
    // creek width: wider downstream and at the bends (the creek does that itself), narrow where the bridge spans it
    // creek width: a trickle at the spring, growing downstream, swelling and narrowing as it goes (riffles and runs),
    // pinched where the bridge spans it, then a pool just above the fall
    M.creek(c, P, CREEK, (u, p) => (4.4 + 9 * Math.pow(u, 1.1)) * (1 + 0.14 * Math.sin(u * 23 + 0.6)) * (1 - 0.3 * Math.exp(-((p[0] - BRIDGE[0]) ** 2 + (p[1] - BRIDGE[1]) ** 2) / 260)) + 12 * Math.exp(-(((u - 0.93) / 0.05) ** 2)), [[0.3, 0.22], [0.6, -0.25]], p => Math.max(0, Math.min(1, (M.dist(ROADS[1].pts, p[0], p[1]) - 18) / 14)));
    M.waterfall(c, P, FALL_X, FALL_TOP, FALL_W, FALL_H);
    M.roads(c, P, ROADS.map(r => r.pts), onGrass, [J]);
    // on the beach the road is packed sand (clipped to below the bluff), and it comes down the bluff in log steps
    c.save(); M.poly(c, [...EDGE.map(p => [p[0], p[1] + 2]), [W + 20, H + 20], [-20, H + 20]]); c.closePath(); c.clip(); M.sandPath(c, P, ROADS[0].pts); c.restore();
    const STEP_T = yEdge(RAMP_X), STEP_B = STEP_T + BANK_H(RAMP_X);
    M.roadSteps(c, P, ROADS[0].pts, STEP_T, STEP_B, 4);
    const nearNode = (x, y) => Object.values(N).some(n => Math.hypot(n[0] - x, n[1] - y) < 26) || Math.hypot(BRIDGE[0] - x, BRIDGE[1] - y) < 22 || Math.hypot(J[0] - x, J[1] - y) < 9 || (Math.abs(x - RAMP_X) < 14 && y > STEP_T - 4 && y < STEP_B + 4);
    for (const r of ROADS) M.trail(c, P, r.pts, r.done || prog, nearNode);
    {   // the bridge: square across the creek (its axis along the creek's normal, leaning a little toward the road's
      // own heading), a little wider than the road, its ends seated on stone footings on both banks
      let ci = 0, bd = 1e9; CREEK.forEach((p, i) => { const d = Math.hypot(p[0] - BRIDGE[0], p[1] - BRIDGE[1]); if (d < bd) { bd = d; ci = i; } });
      const ca = CREEK[Math.max(0, ci - 3)], cb = CREEK[Math.min(CREEK.length - 1, ci + 3)], nAng = Math.atan2(cb[1] - ca[1], cb[0] - ca[0]) + Math.PI / 2;
      const a = rp1[Math.max(0, BI - 3)], b = rp1[Math.min(rp1.length - 1, BI + 3)], rAng = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let d = rAng - nAng; while (d > Math.PI / 2) d -= Math.PI; while (d < -Math.PI / 2) d += Math.PI;
      M.bridge(c, P, BRIDGE[0], BRIDGE[1], rAng, 36, 15);   // along the road, so the road runs straight onto both ends
    }
    for (const [x, y, r] of DAPPLE) M.dapple(c, P, x, y, r, (x * 3 + y) | 0);
    for (const [x, y] of TUFTS) M.tuftCluster(c, P, x, y, 1, (x * 7 + y) | 0);
    for (const [x, y, cl] of FLOWERS) M.flowerPatch(c, P, x, y, cl, (x + y) | 0);
    for (const [x, y, r] of PEBBLES) M.pebble(c, P, x, y, r);
    for (const [x, y, sc] of CLOVER) M.clover(c, P, x, y, sc * 1.6, (x * 13 + y) | 0);
    M.rock(c, P, 112, 446, 6, 9, true);
    // the level clearings (level 1's is the launch pad: the same flagstones, bigger), then the open level's light
    // laid over its stones and the grass round them
    M.clearing(c, P, N[1][0], N[1][1], 38, false);
    M.clearing(c, P, N[2][0], N[2][1], 28, false);
    M.clearing(c, P, N[3][0], N[3][1], 28, false);
    if (!prog) M.nodeGlow(c, N[3][0], N[3][1], t);
    M.springPool(c, P, SPRING[0], SPRING[1], 22);
    // ---- everything standing, back to front ----
    const stand = [];
    for (const [k, x, y, h, w, sd, k0 = 0] of TREES) stand.push({ y, f: () => {
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
    } });
    stand.push({ y: SPRING[1] - 6, f: () => M.springRocks(c, P, SPRING[0], SPRING[1], 22) });
    stand.push({ y: 704, f: () => M.palm(c, P, 32, 704, 70, -0.05, 2) });
    stand.push({ y: 624, f: () => M.palm(c, P, 222, 624, 70, -0.15, 11) });
    stand.push({ y: 600, f: () => M.palm(c, P, 420, 604, 92, -0.12, 8) });
    let hutInfo = null;
    stand.push({ y: HUT[1], f: () => { hutInfo = M.hut(c, P, HUT[0], HUT[1], t, 1.22); } });
    stand.push({ y: 674, f: () => M.torch(c, P, 136, 674) }, { y: 674, f: () => M.torch(c, P, 236, 674) });
    // one post in the crotch of the fork, both boards reaching out to the left over the grass between the roads so
    // neither covers a road: Temple's (top) square-ended with an up arrow (its road leaves north), Bog's an arrow
    // pointing west along the Bog road
    stand.push({ y: 186, f: () => M.signpost(c, P, 242, 186, [['Temple', 'up', 'tail'], ['Bog', Math.PI, 'tail']], 0.3) });
    // a quiet feature on the open lawn right of the road: a mossy boulder group with a bush and ferns
    for (const [x, y, r, sd] of [[298, 414, 12.5, 71], [316, 422, 8, 72], [282, 424, 6, 73], [327, 408, 5, 77]]) stand.push({ y, f: () => M.rock(c, P, x, y, r, sd, true) });
    stand.push({ y: 400, f: () => M.bush(c, P, 312, 400, 24, 78, 0.1) }, { y: 428, f: () => M.fern(c, P, 306, 428, 0.55, 74) }, { y: 426, f: () => M.flowerPatch(c, P, 272, 428, [236, 92, 116], 75) }, { y: 552, f: () => M.flowerPatch(c, P, 40, 552, [255, 206, 80], 76) });
    stand.push({ y: 588, f: () => M.plant(c, P, 112, 588, 0.8, 9) });
    // one readable landmark on the open lawn east of level 3: a mossy fallen log with a fern at its end
    stand.push({ y: 378, f: () => M.fallenLog(c, P, 286, 376, 38, -0.22, 4.6, 81) }, { y: 382, f: () => M.fern(c, P, 308, 382, 0.6, 82) });
    for (const [x, y, r, sd] of [[222, 516, 10, 61], [236, 522, 6.5, 62], [210, 524, 5, 63]]) stand.push({ y, f: () => M.rock(c, P, x, y, r, sd, true) });
    stand.push({ y: 530, f: () => M.tuftCluster(c, P, 228, 530, 0.9, 64) });
    stand.sort((a, b) => a.y - b.y).forEach(s => s.f());
    if (mode === 'dusk') duskGrade(c, P, hutInfo, prog); else { dayGrade(c); M.lightPool(c, 136, 676, 22, 8, [255, 196, 120], 0.3); M.lightPool(c, 236, 676, 22, 8, [255, 196, 120], 0.3); }   // by day too, a small warm pool round each torch
    // ---- the level tokens and the player ----
    // the hovering rocket's shadow on the ground, down and to the right of the coin (it flies higher than the coin,
    // so its shadow falls farther out), drawn before the tokens so the coin stands over it
    if (!prog && img && img.naturalWidth) { const sun = P.sun ?? M.SUN, L = 30 * (P.shLen ?? 0.3) / 0.3; const sx = N[3][0] + 20 + Math.cos(sun) * L * 0.2, sy = N[3][1] - 1 + Math.sin(sun) * L * 0.2; M.softShadow(c, sx, sy, 11, 3.6, P.shadowA * 1.6, sun * 0.4, P.shadowC); M.softShadow(c, sx, sy, 6, 2, P.shadowA * 1.2, sun * 0.4, P.shadowC); }
    M.node(c, P, N[1][0], N[1][1], '1', 3, false, t);
    M.node(c, P, N[2][0], N[2][1], '2', 3, false, t);
    M.node(c, P, N[3][0], N[3][1], '3', prog ? 3 : 0, !prog, t);
    const coinTop = N[3][1] - M.TOKEN_LIFT - M.TOKEN_R;
    let headY = coinTop - 40;
    if (!prog && img && img.naturalWidth) {
      // the pilot hovers just above the coin: a soft shadow on the coin's rim and a little thruster glow between them
      // it hovers a little higher than the coin, its thruster flame reaching down to the coin and lighting it, and
      // its shadow falls on the pad's stones down and to the right like everything else's
      const s = 62, x = N[3][0], bottom = coinTop - 12 + Math.sin(t * 2) * 1.2, sun = P.sun ?? M.SUN;
      M.softShadow(c, x + 2, coinTop + 3, 10, 2.6, 0.4, 0, P.shadowC);
      // and the thruster's warm light on the coin and the stones under it
      M.lightPool(c, x, coinTop + 2, 18, 7, [255, 196, 100], 0.75);
      M.glow(c, x - 2.4, bottom - 2, 14, [255, 180, 80], 0.35);
      M.thruster(c, x - 2.4, bottom - 9, 14.5, 7, t);   // the flame tip stops just above the coin's rim
      c.drawImage(img, x - s / 2, bottom - s, s, s);
      headY = bottom - s;
    }
    if (!prog) M.banner(c, N[3][0], headY - 15, 'YOU ARE HERE');   // a clear gap between the pill's pointer and the pilot's ears
    if (mode === 'dusk') for (const [x, y, a] of [[60, 520, 0.5], [300, 520, 0.45], [250, 110, 0.4], [118, 214, 0.45], [330, 270, 0.35], [24, 560, 0.4], [230, 420, 0.3], [110, 380, 0.35]]) M.firefly(c, x, y, a);
  }
  function dayGrade(c) {
    c.save(); c.globalCompositeOperation = 'soft-light';
    const g = c.createRadialGradient(40, 40, 10, 120, 200, 800); g.addColorStop(0, 'rgba(255,240,200,.3)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(10,30,40,0)'); v.addColorStop(1, 'rgba(10,30,40,.2)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  // dusk: one lighting model for grass, sand and sea: a warm orange-pink wash from the low sun at the top left, the
  // land cooling and darkening toward the top (far from the beach and its lamps) and toward the bottom-right corner,
  // a soft violet vignette; then warm pools of light on the ground round the torches, the hut and the open level
  function duskGrade(c, P, hut, prog) {
    c.save();
    c.globalCompositeOperation = 'soft-light';
    const s = c.createLinearGradient(0, 0, W * 0.75, H * 0.65); s.addColorStop(0, 'rgba(255,150,90,.5)'); s.addColorStop(0.5, 'rgba(255,130,120,.18)'); s.addColorStop(1, 'rgba(255,130,120,0)');
    c.fillStyle = s; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'multiply';
    const top = c.createLinearGradient(0, 0, 0, H * 0.6); top.addColorStop(0, 'rgba(84,104,156,.55)'); top.addColorStop(0.55, 'rgba(120,140,180,.22)'); top.addColorStop(1, 'rgba(160,170,200,0)');
    c.fillStyle = top; c.fillRect(0, 0, W, H);
    const m = c.createRadialGradient(W, H, 40, W, H, H * 0.6); m.addColorStop(0, 'rgba(130,120,200,.3)'); m.addColorStop(1, 'rgba(130,120,200,0)');
    c.fillStyle = m; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    const v = c.createRadialGradient(W * 0.45, H * 0.45, H * 0.3, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(30,20,60,0)'); v.addColorStop(1, 'rgba(30,20,60,.25)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    // the low sun from the left: a warm band over the near lawn and beach (warm grass at the near edge), and warmth
    // on everything's left (sun-facing) side
    c.globalCompositeOperation = 'soft-light';
    const near = c.createLinearGradient(0, 430, 0, 700); near.addColorStop(0, 'rgba(255,170,90,0)'); near.addColorStop(0.6, 'rgba(255,170,90,.38)'); near.addColorStop(1, 'rgba(255,160,110,.2)');
    c.fillStyle = near; c.fillRect(0, 0, W, H);
    const side = c.createLinearGradient(0, 0, W, 0); side.addColorStop(0, 'rgba(255,160,90,.32)'); side.addColorStop(0.6, 'rgba(255,160,90,0)');
    c.fillStyle = side; c.fillRect(0, 0, W, 740);
    c.restore();
    // warm light on the ground: round each torch, in front of the hut's door and under its lantern, and round the
    // open level (drawn after the grade so it stays warm), then the glow in the air round each flame
    M.lightPool(c, 136, 674, 48, 20, [255, 168, 92], 0.55); M.lightPool(c, 236, 674, 48, 20, [255, 168, 92], 0.55);
    if (hut) { M.lightPool(c, hut.door[0] + 4, HUT[1] + 4, 52, 17, [255, 170, 96], 0.38); M.lightPool(c, hut.lamp[0], hut.lamp[1] + 26, 26, 10, [255, 176, 100], 0.3); }
    if (!prog) M.lightPool(c, N[3][0], N[3][1], 66, 28, [255, 214, 140], 0.3);
    if (hut) { M.glow(c, hut.door[0], hut.door[1], 34, [255, 160, 60], 0.3); M.glow(c, hut.lamp[0], hut.lamp[1], 30, [255, 170, 70], 0.4); }
    M.glow(c, 136, 650, 32, [255, 150, 50], 0.3); M.glow(c, 236, 650, 32, [255, 150, 50], 0.3);
  }
  window.SCENE = { drawScene, W, H, N, HUT, TREES, ROADS, J };
})();
