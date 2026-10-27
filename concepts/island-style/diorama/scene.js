// The beach start of Coconut Island as a carved diorama: three raised slabs (sand over the sea, a grass tier, a higher
// grass tier at the top) with carved earth faces, a creek cut into them that tumbles over each lip, the road climbing
// carved plank steps from the launch pad (1) to 2, over the bridge, up to 3 and on to the Temple/Bog fork.
// Layout follows the concept (maps/island.js), squeezed to one 390x844 phone screen.
(() => {
  const D = window.DIO, { cr, wobble } = D;
  const W = 390, H = 844;

  // a slab outline: off-screen top corners + the visible lower edge (right to left), wobbled so it reads hand-cut
  function slabPoly(topY, edge, seed, amp = 2.2) {
    const e = wobble(cr(edge, false, 12), amp, 0.035, seed);
    return [[e[e.length - 1][0], topY], [W + 30, topY], ...e];
  }
  const SAND_EDGE = [[420, 712], [340, 722], [280, 736], [220, 744], [160, 740], [100, 750], [40, 756], [-30, 746]];
  const T1_EDGE = [[420, 516], [350, 522], [318, 536], [298, 556], [282, 578], [258, 592], [228, 597], [180, 600], [140, 609], [96, 621], [44, 631], [-30, 642]];
  const T2_EDGE = [[420, 232], [330, 244], [282, 252], [248, 264], [214, 284], [184, 310], [150, 330], [110, 341], [60, 344], [20, 352], [-30, 348]];
  const T3_EDGE = [[420, 76], [370, 70], [334, 64], [300, 52], [266, 38], [232, 15], [208, -6], [196, -40]];
  const SAND = slabPoly(470, SAND_EDGE, 3, 1.4), T1 = slabPoly(230, T1_EDGE, 5), T2 = slabPoly(-30, T2_EDGE, 8), T3 = slabPoly(-40, T3_EDGE, 12, 1.8);
  const D_SAND = 10, D_T1 = 36, D_T2 = 30, D_T3 = 26;

  const N = { 1: [205, 684], 2: [230, 490], 3: [102, 292] };
  const ROAD_MAIN = cr([N[1], [202, 660], [198, 638], [194, 618], [192, 600], [196, 580], [206, 554], [221, 522], N[2], [222, 456], [200, 425], [170, 397], [146, 380], [129, 374], [123, 360], [121, 341], [114, 318], N[3]], false, 8);
  const ROAD_UP = cr([N[3], [108, 256], [122, 216], [134, 186]], false, 8);
  const ROAD_BOG = cr([[134, 186], [114, 156], [86, 108], [62, 48], [50, -24]], false, 8);
  const ROAD_TEMPLE = cr([[134, 186], [164, 152], [200, 100], [224, 40], [231, 14], [238, -24]], false, 8);
  const CREEK = wobble(cr([[378, -24], [352, 30], [336, 64], [322, 110], [300, 160], [274, 222], [259, 262], [240, 302], [205, 350], [170, 397], [130, 430], [98, 470], [78, 520], [64, 575], [57, 631]], false, 8), 2.2, 0.05, 4);
  const STREAM = cr([[57, 668], [60, 684], [54, 700], [47, 716], [50, 734], [46, 760]], false, 8);

  const IMG = new Image(); IMG.src = '../../world-maps/pilots/lemur.png';

  function drawScene(ctx) {
    D.setup(W, H, 3);
    // sea
    D.sea(ctx, [0, 600, W, H], 21);
    // surf on the sea, then the sand slab standing in it, wet sand along its seaward lip, the creek's run-off
    D.surf(ctx, SAND.slice(2).reverse(), 41, D_SAND);
    D.slab(ctx, SAND, { depth: D_SAND, kind: 'sand', seed: 31, bbox: [-30, 460, W + 30, 766], shadow: true });
    clipped(ctx, SAND, () => D.blurred(ctx, 4, g => { g.strokeStyle = D.css(D.PAL.wetSand, 0.4); g.lineWidth = 12; g.beginPath(); D.trace(g, SAND.slice(2), false, 0, -3); g.stroke(); }));
    clipped(ctx, SAND, () => D.stream(ctx, STREAM, 7, 15, 43));
    // beach dressing: a canoe, a few shells
    D.canoe(ctx, 140, 722, -0.12, 51);
    shells(ctx);
    // grass tier 1 + the creek cut into it, spilling over its lip onto the sand
    D.slab(ctx, T1, { depth: D_T1, kind: 'grass', seed: 61, bbox: [-30, 226, W + 30, 646] });
    D.creekBed(ctx, CREEK, 11, 71);
    const c1 = CREEK[CREEK.length - 1]; D.cascade(ctx, c1[0], c1[1], 12, D_T1, 73);
    // grass tier 2 (higher, a touch cooler), creek again, its own little falls
    D.slab(ctx, T2, { depth: D_T2, kind: 'grass', seed: 81, bbox: [-30, -30, W + 30, 356], tint: 0.14 });
    clipped(ctx, T2, () => D.creekBed(ctx, CREEK, 11, 91));
    const c2 = lip(T2, CREEK); D.cascade(ctx, c2.x, c2.y, 12, D_T2, 93);
    // tier 3, a raised shoulder in the top right corner
    D.slab(ctx, T3, { depth: D_T3, kind: 'grass', seed: 85, bbox: [180, -40, W + 30, 80], tint: 0.28 });
    clipped(ctx, T3, () => D.creekBed(ctx, CREEK, 11, 95));
    const c3 = lip(T3, CREEK); D.cascade(ctx, c3.x, c3.y, 12, D_T3, 97);
    // roads: completed (gold studs) to 3, plain beyond
    const Lm = D.lengths(ROAD_MAIN);
    D.road(ctx, ROAD_MAIN, { seed: 101, done: [8, Lm[Lm.length - 1] - 12] });
    D.road(ctx, ROAD_UP, { seed: 103 });
    D.road(ctx, ROAD_BOG, { seed: 105, dim: true });
    D.road(ctx, ROAD_TEMPLE, { seed: 107, dim: true });
    for (const [poly, road, dep, sd] of [[T1, ROAD_MAIN, D_T1, 111], [T2, ROAD_MAIN, D_T2, 113], [T3, ROAD_TEMPLE, D_T3, 117]]) {
      const l = lip(poly, road); D.steps(ctx, l.x, l.y, dep, 15, l.ang, sd);
    }
    D.bridge(ctx, 170, 397, -0.83, 30, 15, 115);

    // props, painted back to front
    const props = [
      [400, () => D.canopy(ctx, 380, 404, 50, 74, 11, { lobes: 16 })],
      [130, () => D.canopy(ctx, 380, 150, 44, 70, 13, { lobes: 14, cool: 0.25 })],
      [470, () => D.canopy(ctx, 4, 474, 40, 64, 15, { lobes: 13 })],
      [200, () => D.canopy(ctx, 2, 200, 42, 78, 17, { lobes: 14, cool: 0.2 })],
      [10, () => D.canopy(ctx, 330, 10, 50, 34, 19, { lobes: 12, cool: 0.35 })],
      [24, () => D.canopy(ctx, 150, 26, 26, 30, 21, { lobes: 9, cool: 0.35 })],
      [512, () => D.palm(ctx, 292, 512, 54, 0.12, 201, { s: 1.1 })],
      [652, () => D.palm(ctx, 256, 652, 66, -0.34, 203, { s: 1.25 })],
      [612, () => D.palm(ctx, 380, 612, 74, -0.16, 205, { s: 1.3 })],
      [714, () => D.palm(ctx, 18, 714, 62, 0.3, 207, { s: 1.2 })],
      [706, () => D.hut(ctx, 324, 706, 1.32, 301)],
      [802, () => D.rock(ctx, 340, 800, 11, 401, { wet: true })],
      [724, () => D.rock(ctx, 96, 712, 7, 403)],
      [216, () => D.rock(ctx, 182, 214, 9, 405)],
      [432, () => D.rock(ctx, 258, 432, 5.5, 407)],
      [520, () => D.fern(ctx, 258, 520, 1.1, 501)],
      [424, () => D.fern(ctx, 206, 438, 0.9, 503)],
      [592, () => D.fern(ctx, 160, 592, 0.9, 505)],
      [306, () => D.fern(ctx, 150, 300, 0.85, 507)],
      [688, () => D.torch(ctx, 175, 688, 1)],
      [688, () => D.torch(ctx, 236, 688, 2)],
      [196, () => D.signpost(ctx, 148, 198, [{ text: 'TEMPLE', dir: 1, tilt: -0.22 }, { text: 'BOG', dir: -1, tilt: 0.18 }])],
    ];
    props.sort((a, b) => a[0] - b[0]).forEach(p => p[1]());

    // level 1's launch pad, then the tokens
    D.launchPad(ctx, N[1][0], N[1][1], 23, 601);
    D.node(ctx, N[1][0], N[1][1] - 1, '1', 'done', { stars: 3, pedestal: false });
    D.node(ctx, N[2][0], N[2][1], '2', 'done', { stars: 3 });
    D.node(ctx, N[3][0], N[3][1], '3', 'open', { stars: 0, r: 15 });
    player(ctx, N[3][0], N[3][1]);

    D.atmosphere(ctx, W, H, 777);
    D.grain(ctx);
  }

  // where a polyline (running downhill) leaves a slab's top: the point on the lip + the angle for carved steps
  const PIP = document.createElement('canvas').getContext('2d');
  function lip(poly, P) {
    const path = new Path2D(); D.trace(path, poly, true);
    for (let i = 1; i < P.length; i++) {
      const a = PIP.isPointInPath(path, P[i - 1][0], P[i - 1][1]), b = PIP.isPointInPath(path, P[i][0], P[i][1]);
      if (a !== b) { const [hi, lo] = a ? [P[i - 1], P[i]] : [P[i], P[i - 1]]; const dx = lo[0] - hi[0], dy = lo[1] - hi[1]; return { x: (hi[0] + lo[0]) / 2, y: (hi[1] + lo[1]) / 2, ang: -Math.atan2(dx, dy) }; }
    }
    return { x: 0, y: 0, ang: 0 };
  }
  function clipped(ctx, poly, f) { ctx.save(); const p = new Path2D(); D.trace(p, poly, true); ctx.clip(p); f(); ctx.restore(); }

  function shells(ctx) {
    const r = D.rng(61);
    for (const [x, y] of [[214, 728], [92, 735], [262, 712], [190, 700]]) {
      ctx.fillStyle = 'rgba(40,30,20,.3)'; ctx.beginPath(); ctx.ellipse(x + 0.6, y + 0.8, 1.8, 0.9, 0, 0, D.TAU); ctx.fill();
      ctx.fillStyle = D.css(D.mix([236, 214, 190], [214, 160, 140], r())); ctx.beginPath(); ctx.ellipse(x, y, 1.6, 1.1, r() * 3, 0, D.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,110,80,.6)'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(x - 1, y); ctx.lineTo(x + 1, y); ctx.stroke();
    }
  }

  function player(ctx, x, y) {
    const cy = y - 15 * 0.55;
    // the lemur on its rocket, standing on the open token
    const S = 58;
    D.blurred(ctx, 2, g => { g.fillStyle = 'rgba(20,14,8,.35)'; g.beginPath(); g.ellipse(x + 3, cy - 9, 12, 4, 0, 0, D.TAU); g.fill(); });
    if (IMG.complete && IMG.naturalWidth) ctx.drawImage(IMG, x - S / 2, cy - 14 - S * 0.86, S, S);
    // "you are here": a carved wooden plaque with gold trim and the game's cream lettering
    const by = cy - 14 - S * 0.86 - 6, bw = 78, bh = 15;
    ctx.save();
    D.blurred(ctx, 1.5, g => { g.fillStyle = 'rgba(16,10,4,.5)'; g.beginPath(); g.roundRect(x - bw / 2 + 1, by - bh / 2 + 2, bw, bh, 7.5); g.fill(); });
    const gold = ctx.createLinearGradient(0, by - bh / 2, 0, by + bh / 2); gold.addColorStop(0, '#ffe7a0'); gold.addColorStop(0.5, '#e8a83a'); gold.addColorStop(1, '#9a5a18');
    ctx.fillStyle = gold; ctx.beginPath(); ctx.roundRect(x - bw / 2, by - bh / 2, bw, bh, 7.5); ctx.fill();
    const wood = ctx.createLinearGradient(0, by - bh / 2, 0, by + bh / 2); wood.addColorStop(0, '#8a5634'); wood.addColorStop(1, '#4e2e18');
    ctx.fillStyle = wood; ctx.beginPath(); ctx.roundRect(x - bw / 2 + 1.4, by - bh / 2 + 1.4, bw - 2.8, bh - 2.8, 6.2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,8,.45)'; ctx.lineWidth = 0.3; for (let k = -4; k <= 4; k += 2.2) { ctx.beginPath(); ctx.moveTo(x - bw / 2 + 5, by + k); ctx.bezierCurveTo(x - 10, by + k - 0.8, x + 10, by + k + 0.8, x + bw / 2 - 5, by + k); ctx.stroke(); }
    // pointer
    ctx.fillStyle = '#9a5a18'; ctx.beginPath(); ctx.moveTo(x - 4, by + bh / 2 - 0.5); ctx.lineTo(x, by + bh / 2 + 4); ctx.lineTo(x + 4, by + bh / 2 - 0.5); ctx.fill();
    ctx.font = '9.5px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(20,10,4,.7)'; ctx.fillText('YOU ARE HERE', x, by + 1.2);
    ctx.fillStyle = '#fff1cf'; ctx.fillText('YOU ARE HERE', x, by + 0.3);
    ctx.strokeStyle = 'rgba(255,255,230,.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x - bw / 2 + 7, by - bh / 2 + 0.8); ctx.lineTo(x + bw / 2 - 7, by - bh / 2 + 0.8); ctx.stroke();
    ctx.restore();
  }

  window.SCENE = { drawScene, IMG, N, W, H };
})();
