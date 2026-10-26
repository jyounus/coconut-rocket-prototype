// Concept 5, "World Pages": Super Mario Bros 3 style world screens. The adventure is split into compact pages
// that each fit one phone screen (World 1 Jungle 1-9, World 2 Depths 10-15, World 3 Core 16-20, World 4 coming
// soon), swiped sideways. Each page is a chunky board-game diorama: a raised board of square terrain tiles coloured
// by region, roads between numbered level panels, props standing on the free tiles, and a plank bridge carrying the
// road across the gap to the next page.
(() => {
  const TAU = K.TAU, PI = Math.PI, PW = 360, MH = 720;
  const T = 42, BX = 12, BY = 96, COLS = 8, ROWS = 13, BW = T * COLS, BH = T * ROWS;
  const FONT = '"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';
  const rgb = K.rgb, lift = K.lift, mix = K.mix, lg = K.lg, rg = K.rg;
  const frac = x => x - Math.floor(x);
  const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

  // ---------------------------------------------------------------- worlds
  const WORLDS = [
    { n: 1, name: 'JUNGLE', sub: 'Jungle · Temple · Bog', bg: [[104, 146, 108], [52, 88, 64]], far: [78, 116, 86], side: [112, 78, 44], hud: [[120, 186, 80], [58, 118, 44]], hudE: [36, 78, 28], ids: [1, 2, 3, 4, 5, 6, 7, 8, 9], mote: ['pollen', [235, 255, 150]],
      road: { lit: [236, 206, 140], litE: [150, 100, 54], dark: [150, 136, 104], darkE: [98, 82, 58] } },
    { n: 2, name: 'DEPTHS', sub: 'Grotto · Lagoon · Mine · Caves', bg: [[78, 104, 152], [32, 44, 90]], far: [62, 84, 132], side: [62, 64, 110], hud: [[90, 170, 210], [42, 92, 156]], hudE: [24, 52, 104], ids: [10, 11, 12, 13, 14, 15], mote: ['bubble', [170, 240, 255]],
      road: { lit: [214, 222, 232], litE: [96, 106, 142], dark: [128, 134, 156], darkE: [68, 72, 104] } },
    { n: 3, name: 'CORE', sub: 'Crystal · Frost · Storm · Magma', bg: [[124, 66, 60], [50, 22, 24]], far: [98, 50, 46], side: [84, 38, 30], hud: [[236, 112, 60], [160, 50, 30]], hudE: [100, 26, 16], ids: [16, 17, 18, 19, 20], mote: ['ember', [255, 170, 80]],
      road: { lit: [220, 190, 170], litE: [120, 70, 60], dark: [134, 108, 102], darkE: [74, 48, 46] } },
    { n: 4, name: 'WORLD 4', sub: 'Coming soon', bg: [[106, 102, 132], [46, 44, 66]], far: [88, 84, 112], side: [70, 66, 88], hud: [[150, 146, 172], [92, 88, 116]], hudE: [56, 52, 76], ids: [], mote: ['dust', [230, 226, 255]],
      road: { lit: [180, 176, 196], litE: [90, 86, 110], dark: [130, 126, 150], darkE: [80, 76, 100] } },
  ];

  // terrain tile colours (a, b alternate like a board; e is the tile's own darker edge)
  const REG = {
    jungle:  { a: [112, 178, 78], b: [100, 164, 70], e: [58, 108, 44] },
    temple:  { a: [206, 184, 128], b: [192, 170, 116], e: [128, 108, 66] },
    bog:     { a: [124, 132, 60], b: [112, 120, 54], e: [70, 76, 30] },
    grotto:  { a: [92, 74, 136], b: [82, 66, 124], e: [50, 38, 84] },
    lagoon:  { a: [52, 168, 182], b: [46, 156, 172], e: [24, 104, 126], water: true },
    mine:    { a: [164, 116, 70], b: [150, 104, 62], e: [98, 64, 36] },
    caves:   { a: [86, 88, 148], b: [76, 78, 136], e: [46, 46, 92] },
    crystal: { a: [166, 108, 186], b: [152, 96, 172], e: [98, 56, 122] },
    frost:   { a: [210, 232, 244], b: [194, 220, 236], e: [130, 162, 190] },
    storm:   { a: [84, 82, 136], b: [74, 72, 124], e: [42, 40, 82] },
    magma:   { a: [128, 62, 44], b: [114, 54, 38], e: [70, 28, 20] },
    future:  { a: [112, 108, 136], b: [102, 98, 126], e: [66, 62, 88] },
  };

  // ---------------------------------------------------------------- layout (content coords; page p starts at p*360)
  const O = p => p * PW;
  const POS = {
    1: [117, 621], 2: [243, 621], 3: [243, 495], 4: [117, 495], 5: [75, 390], 6: [117, 300], 7: [285, 411], 8: [285, 300], 9: [180, 210],
    10: [O(1) + 75, 165], 11: [O(1) + 201, 165], 12: [O(1) + 285, 300], 13: [O(1) + 75, 320], 14: [O(1) + 180, 430], 15: [O(1) + 180, 566],
    16: [O(2) + 75, 440], 17: [O(2) + 180, 440], 18: [O(2) + 285, 440], 19: [O(2) + 180, 322], 20: [O(2) + 180, 196],
  };
  const pageOf = id => Math.floor(POS[id][0] / PW);
  const L = (p, pts) => pts.map(([x, y]) => [O(p) + x, y]);
  const ROUTE = {
    '1-2': L(0, [[117, 621], [243, 621]]),
    '2-3': L(0, [[243, 621], [243, 495]]),
    '3-4': L(0, [[243, 495], [117, 495]]),
    '4-5': L(0, [[117, 495], [117, 445], [75, 445], [75, 390]]),
    '5-6': L(0, [[75, 390], [75, 345], [117, 345], [117, 300]]),
    '6-9': L(0, [[117, 300], [117, 210], [180, 210]]),
    '3-7': L(0, [[243, 495], [243, 453], [285, 453], [285, 411]]),
    '7-8': L(0, [[285, 411], [285, 300]]),
    '8-9': L(0, [[285, 300], [285, 210], [180, 210]]),
    '9-10': [[180, 210], [180, 165], [O(1) + 75, 165]],
    '10-11': L(1, [[75, 165], [201, 165]]),
    '11-12': L(1, [[201, 165], [285, 165], [285, 300]]),
    '12-14': L(1, [[285, 300], [285, 430], [180, 430]]),
    '10-13': L(1, [[75, 165], [75, 320]]),
    '13-14': L(1, [[75, 320], [75, 430], [180, 430]]),
    '14-15': L(1, [[180, 430], [180, 566]]),
    '15-16': [[O(1) + 180, 566], [O(2) + 75, 566], [O(2) + 75, 440]],
    '15-17': [[O(1) + 180, 566], [O(2) + 180, 566], [O(2) + 180, 440]],
    '15-18': [[O(1) + 180, 566], [O(2) + 285, 566], [O(2) + 285, 440]],
    '16-19': L(2, [[75, 440], [75, 322], [180, 322]]),
    '17-19': L(2, [[180, 440], [180, 322]]),
    '18-19': L(2, [[285, 440], [285, 322], [180, 322]]),
    '19-20': L(2, [[180, 322], [180, 196]]),
  };
  const FUT_ROUTE = [[O(2) + 180, 196], [O(3) + 180, 196], [O(3) + 180, 268]];
  const ROADS = PATHS.map(([a, b], i) => ({ a, b, pts: ROUTE[a + '-' + b], lit: PATH_STATE[i] === 'lit' }));
  const BOSS_R = 31;

  const segDist = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay, u = K.clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(px - ax - u * dx, py - ay - u * dy);
  };
  const roadDist = (x, y) => {
    let d = 1e9;
    for (const r of [...ROADS.map(r => r.pts), FUT_ROUTE]) for (let i = 0; i + 1 < r.length; i++) d = Math.min(d, segDist(x, y, r[i], r[i + 1]));
    return d;
  };

  // per page: tiles with region + a prop kind
  const KEEP_OUT = [  // landmark footprints [x0,y0,x1,y1] where no props stand
    [125, 128, 235, 262], [O(1) + 118, 500, O(1) + 242, 630], [O(2) + 104, 96, O(2) + 256, 252],
    [O(0) + 12, 590, O(0) + 64, 642],
    [O(0) + 190, 430, O(0) + 236, 486], [O(0) + 200, 236, O(0) + 262, 312], [O(1) + 96, 200, O(1) + 150, 240], [O(2) + 96, 590, O(2) + 160, 642],
  ];
  const PROPS = {
    jungle: ['palm', 'bush', 'flowers', 'fern', 'palm', 'bush'], temple: ['pillar', 'pyramid', 'idol', 'steps', 'pillar', 'fern'],
    bog: ['pool', 'deadtree', 'reeds', 'pool', 'reeds'], grotto: ['shroom', 'shroom', 'shroomTall'],
    lagoon: ['lily', 'rock', 'islet', 'jelly', 'lily'], mine: ['headframe', 'cart', 'lantern', 'nuggets', 'crates'],
    caves: ['basalt', 'stalag', 'cavepool', 'boulders'], crystal: ['amethyst', 'amethyst', 'geode'], frost: ['pine', 'icespike', 'pine', 'snowman'],
    storm: ['spire', 'cloud', 'boulders'], magma: ['lava', 'vrock', 'vent'], future: [],
  };
  const PAGES = WORLDS.map((w, p) => {
    const tiles = [], props = [], kinds = {};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = O(p) + BX + c * T + T / 2, y = BY + r * T + T / 2;
      let region = 'future';
      if (w.ids.length) {
        let best = 1e9;
        for (const id of w.ids) { const [nx, ny] = POS[id], d = Math.hypot(nx - x, (ny - y) * 1.15); if (d < best) { best = d; region = LEVEL_BY[id].region; } }
        if (p === 1 && y < 250 && x < O(1) + 150) region = 'grotto';
        if (p === 2 && y < 270) region = 'magma';
      }
      tiles.push({ x, y, c, r, region });
      if (region === 'future') continue;
      const nd = Math.min(...w.ids.map(id => Math.hypot(POS[id][0] - x, POS[id][1] - y) - (LEVEL_BY[id].boss ? 24 : 0)));
      const kept = KEEP_OUT.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
      const rd = roadDist(x, y);
      if (rd < 19 || nd < 34 || kept) continue;
      const h = hash(c * 31 + p * 7, r * 17 + 3);
      if (h < 0.3) continue;
      const list = PROPS[region], near = [kinds[(r - 1) * 9 + c], kinds[r * 9 + c - 1], kinds[(r - 1) * 9 + c - 1], kinds[(r - 1) * 9 + c + 1]];
      let kind = list[Math.floor(hash(c + 5 * p, r * 3 + 1) * list.length)];
      for (let j = 1; j < list.length && near.includes(kind); j++) kind = list[(list.indexOf(kind) + 1) % list.length];
      kinds[r * 9 + c] = kind;
      props.push({ x: x + (hash(c, r + p * 40) - 0.5) * 8, y: y + 8 + (hash(r, c + p * 40) - 0.5) * 6, kind, s: (0.9 + hash(c * 3, r * 7 + p) * 0.25) * (rd < 26 ? 0.72 : 1), seed: h, region });
    }
    return { w, p, tiles, props };
  });
  // hand-placed extras: start hut, fork signposts, page 4 gate
  PAGES[0].props.push({ x: 36, y: 630, kind: 'hut', s: 1, seed: 0.3 });
  PAGES[0].props.push({ x: 214, y: 470, kind: 'sign', s: 1, seed: 0, arrows: [['TEMPLE', -1, [206, 170, 90]], ['BOG', 1, [150, 170, 60]]] });
  PAGES[1].props.push({ x: O(1) + 124, y: 236, kind: 'sign', s: 1, seed: 0, arrows: [['LAGOON', 1, [60, 180, 196]], ['MINE', 0, [180, 124, 70]]] });
  PAGES[2].props.push({ x: O(2) + 128, y: 636, kind: 'sign', s: 1, seed: 0, arrows: [['CRYSTAL', -1, [190, 120, 210]], ['FROST', 0, [170, 210, 240]], ['STORM', 1, [120, 116, 200]]] });
  for (const P of PAGES) P.props.sort((a, b) => a.y - b.y);

  // ---------------------------------------------------------------- small drawing helpers
  const blob = (ctx, x, y, rx, ry, c, lx = -0.35, ly = -0.45) => {
    if (rx < 3.6) { // small: flat body, a darker underside and a lit dot (cheaper than a gradient)
      ctx.fillStyle = rgb(lift(c, -45)); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.ellipse(x - rx * 0.12, y - ry * 0.15, rx * 0.82, ry * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(lift(c, 70)); ctx.beginPath(); ctx.arc(x + rx * lx, y + ry * ly, rx * 0.32, 0, TAU); ctx.fill();
      return;
    }
    ctx.fillStyle = rg(ctx, x + rx * lx, y + ry * ly, Math.max(rx, ry) * 1.35, [lift(c, 60), c, lift(c, -60)]);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  };
  const sh = (ctx, x, y, rx, ry, a = 0.3) => { ctx.fillStyle = `rgba(12,6,20,${a * 0.75})`; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.8, ry * 0.75, 0, 0, TAU); ctx.fill(); };
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
  const routePath = (ctx, pts, r = 13) => {
    ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length - 1; i++) ctx.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r);
    ctx.lineTo(...pts[pts.length - 1]);
  };
  const text = (ctx, s, x, y, size, fill, edge, align = 'center', weight = '') => {
    ctx.font = `${weight}${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (edge) { ctx.fillStyle = edge; ctx.fillText(s, x, y + Math.max(1, size * 0.09)); }
    ctx.fillStyle = fill; ctx.fillText(s, x, y);
  };
  const leaf = (ctx, x, y, len, ang, c, wid = 0.3) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = lg(ctx, 0, -len * wid, 0, len * wid, [lift(c, 40), c, lift(c, -50)]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -len * wid, len, 0); ctx.quadraticCurveTo(len * 0.45, len * wid * 0.8, 0, 0); ctx.fill();
    ctx.strokeStyle = rgb(lift(c, -70), 0.8); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(1, 0); ctx.quadraticCurveTo(len * 0.5, -len * wid * 0.2, len * 0.95, 0); ctx.stroke();
    ctx.restore();
  };
  const padlock = (ctx, x, y, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = lg(ctx, -6, -12, 6, -2, ['#f4ecdc', '#9c927e']); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, -4, 4.6, PI, 0); ctx.lineTo(4.6, -1); ctx.moveTo(-4.6, -1); ctx.lineTo(-4.6, -4); ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -2, 0, 8, ['#ffe9a8', '#e0a83a', '#9a6418']); rrect(ctx, -6.5, -2, 13, 10, 2.5); ctx.fill();
    ctx.strokeStyle = '#8a5612'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#6a3e0c'; ctx.beginPath(); ctx.arc(0, 2, 1.6, 0, TAU); ctx.fill(); ctx.fillRect(-0.7, 2.5, 1.4, 3);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-5, -1, 3, 1.2);
    ctx.restore();
  };

  // ---------------------------------------------------------------- props (anchored at the base centre)
  const PROP = {
    palm(ctx, x, y, s, t, k) {
      sh(ctx, x + 4, y + 1, 13 * s, 4.5 * s, 0.32);
      const lean = (k - 0.5) * 14, top = [x + lean, y - 38 * s], sw = Math.sin(t * 1.3 + k * 9) * 0.07;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#5e3a1c'; ctx.lineWidth = 6.5 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - lean * 0.2, y - 20 * s, ...top); ctx.stroke();
      ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 4.4 * s; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,160,.5)'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(x - 1.2, y - 2); ctx.quadraticCurveTo(x - lean * 0.2 - 1.2, y - 20 * s, top[0] - 1.2, top[1]); ctx.stroke();
      for (let i = 1; i < 6; i++) { const u = i / 6, px = (1 - u) * (1 - u) * x + 2 * u * (1 - u) * (x - lean * 0.2) + u * u * top[0], py = y - 38 * s * u; ctx.strokeStyle = 'rgba(70,40,18,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 3 * s, py); ctx.lineTo(px + 3 * s, py + 1); ctx.stroke(); }
      const angs = [-2.75, -2.2, -1.6, -1.0, -0.4, 0.2, PI * 0.95];
      angs.forEach((a, i) => leaf(ctx, top[0], top[1], (19 + (i % 2) * 4) * s, a + sw * (i % 2 ? 1 : -1) + 0.35, i % 2 ? [74, 150, 52] : [98, 176, 64], 0.26));
      for (const [dx, dy] of [[-2.5, 3], [2.5, 3.5], [0, 5]]) blob(ctx, top[0] + dx * s, top[1] + dy * s, 2.8 * s, 2.8 * s, [124, 82, 40]);
    },
    bush(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 16 * s, 5 * s, 0.3);
      const c = k > 0.5 ? [86, 164, 66] : [70, 150, 70];
      for (const [dx, dy, r] of [[-9, -6, 8], [9, -6, 8], [0, -11, 10]]) blob(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.92, c);
      K.sheen(ctx, x, y - 11 * s, 10 * s, 0.35);
      if (k > 0.55) { // a pair of eyes peeking out, blinking
        const bl = frac(t * 0.23 + k * 3) < 0.04 ? 0.15 : 1;
        ctx.save(); ctx.translate(x, y - 8 * s); ctx.scale(1, bl); K.eyes(ctx, 0, 0, 3.6 * s, 2.6 * s, '#3a2a14', Math.sin(t * 0.6 + k * 5)); ctx.restore();
      } else for (let i = 0; i < 3; i++) blob(ctx, x + (i - 1) * 7 * s, y - (5 + (i % 2) * 7) * s, 1.8 * s, 1.8 * s, [232, 60, 70]);
    },
    flowers(ctx, x, y, s, t, k) {
      for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.4 + Math.sin(t + i) * 0.05; leaf(ctx, x, y, 12 * s, a, [80, 156, 58], 0.22); }
      for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * 8 * s, fy = y - (12 + (i % 2) * 5) * s + Math.sin(t * 1.5 + i + k * 4) * 0.8, c = i === 1 ? [255, 214, 70] : [255, 120, 160];
        for (let j = 0; j < 5; j++) blob(ctx, fx + Math.cos(j * TAU / 5) * 2.6 * s, fy + Math.sin(j * TAU / 5) * 2.6 * s, 2.3 * s, 2.3 * s, c);
        blob(ctx, fx, fy, 1.6 * s, 1.6 * s, [255, 240, 200]);
      }
    },
    fern(ctx, x, y, s, t, k) {
      sh(ctx, x + 2, y, 12 * s, 4 * s, 0.25);
      for (let i = 0; i < 7; i++) leaf(ctx, x, y, (16 + (i % 3) * 3) * s, -PI + 0.3 + i * 0.42 + Math.sin(t * 1.1 + i + k * 6) * 0.05, i % 2 ? [64, 136, 54] : [90, 166, 64], 0.2);
    },
    pillar(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 12 * s, 4 * s, 0.32);
      const h = (22 + k * 14) * s, w = 9 * s;
      ctx.fillStyle = lg(ctx, x - w, 0, x + w, 0, ['#efe2b8', '#c4ae7a', '#8a7448']); ctx.fillRect(x - w, y - h, w * 2, h);
      for (let i = -1; i <= 1; i++) { ctx.fillStyle = 'rgba(110,88,50,.35)'; ctx.fillRect(x + i * w * 0.55 - 0.6, y - h, 1.2, h); }
      ctx.fillStyle = lg(ctx, 0, y - 4 * s, 0, y, ['#d6c08c', '#8a7448']); ctx.fillRect(x - w - 2.5 * s, y - 4 * s, w * 2 + 5 * s, 4 * s);
      if (k > 0.45) { ctx.fillStyle = lg(ctx, 0, y - h - 5 * s, 0, y - h, ['#fff0c6', '#c4ae7a']); ctx.fillRect(x - w - 3 * s, y - h - 5 * s, w * 2 + 6 * s, 5 * s); }
      else { ctx.fillStyle = '#d8c492'; poly(ctx, [[x - w, y - h], [x - w * 0.2, y - h - 4 * s], [x + w * 0.4, y - h + 1], [x + w, y - h - 3 * s], [x + w, y - h + 2]]); ctx.fill(); }
      ctx.strokeStyle = '#5c9a3a'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(x - w, y - h * 0.9); ctx.quadraticCurveTo(x, y - h * 0.5, x + w * 0.4, y - h * 0.2); ctx.stroke();
      leaf(ctx, x + w * 0.4, y - h * 0.2, 6 * s, 0.6, [96, 170, 64], 0.35); leaf(ctx, x - w * 0.3, y - h * 0.62, 6 * s, 2.4, [96, 170, 64], 0.35);
    },
    pyramid(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 18 * s, 5 * s, 0.32);
      for (let i = 0; i < 3; i++) {
        const w = (17 - i * 5) * s, yy = y - i * 8 * s;
        ctx.fillStyle = lg(ctx, x - w, 0, x + w, 0, ['#f2e4b8', '#c8b07a', '#8e7646']); ctx.fillRect(x - w, yy - 8 * s, w * 2, 8 * s);
        ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.fillRect(x - w, yy - 8 * s, w * 2, 1.4);
        ctx.fillStyle = 'rgba(90,70,40,.4)'; ctx.fillRect(x - w, yy - 1.2, w * 2, 1.2);
      }
      ctx.fillStyle = lg(ctx, x - 4, y - 30 * s, x + 4, y - 24 * s, ['#fff6b0', '#ffc83a', '#c07a10']); poly(ctx, [[x - 5 * s, y - 24 * s], [x, y - 32 * s], [x + 5 * s, y - 24 * s]]); ctx.fill();
      const tw = Math.max(0, Math.sin(t * 2 + k * 7)); if (tw > 0.7) K.glow(ctx, x - 1, y - 29 * s, 9, [255, 230, 120], (tw - 0.7) * 2);
      ctx.fillStyle = '#5a4a2a'; rrect(ctx, x - 3 * s, y - 7 * s, 6 * s, 7 * s, 2); ctx.fill();
    },
    idol(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 12 * s, 4 * s, 0.32);
      ctx.fillStyle = lg(ctx, x - 8, 0, x + 8, 0, ['#d8c494', '#9a8456']); ctx.fillRect(x - 8 * s, y - 6 * s, 16 * s, 6 * s);
      ctx.fillStyle = lg(ctx, x - 9 * s, y - 28 * s, x + 9 * s, y - 6 * s, ['#fff2a8', '#f0b830', '#a86a10']); rrect(ctx, x - 8 * s, y - 28 * s, 16 * s, 22 * s, 5 * s); ctx.fill();
      ctx.strokeStyle = '#8a5410'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#7a4a0c'; ctx.fillRect(x - 5 * s, y - 13 * s, 10 * s, 2.5 * s);
      const gl = 0.6 + 0.4 * Math.sin(t * 3 + k * 5);
      for (const d of [-1, 1]) { ctx.fillStyle = rgb([60, 230, 140]); ctx.beginPath(); ctx.arc(x + d * 3.6 * s, y - 20 * s, 2.2 * s, 0, TAU); ctx.fill(); K.glow(ctx, x + d * 3.6 * s, y - 20 * s, 6 * s, [80, 255, 150], 0.4 * gl); }
      K.sheen(ctx, x - 2, y - 22 * s, 7 * s, 0.5);
    },
    pool(ctx, x, y, s, t, k) {
      const rx = 15 * s, ry = 7 * s, cy = y - 5;
      ctx.fillStyle = '#4a4e1e'; ctx.beginPath(); ctx.ellipse(x, cy + 1.5, rx + 2, ry + 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rg(ctx, x - 3, cy - 2, rx, ['#d8f060', '#90b828', '#4e6a14']); ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill();
      K.glow(ctx, x, cy, rx * 1.3, [190, 255, 80], 0.2);
      for (let i = 0; i < 3; i++) {
        const ph = frac(t * 0.6 + i / 3 + k), bx = x + (hash(i, k * 99) - 0.5) * rx * 1.2, by = cy + (hash(i + 3, k * 99) - 0.5) * ry;
        ctx.strokeStyle = `rgba(240,255,170,${0.8 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by - ph * 3, 1 + ph * 2.5, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,220,.45)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.4, cy - ry * 0.35, rx * 0.3, ry * 0.2, 0, 0, TAU); ctx.fill();
    },
    deadtree(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 11 * s, 4 * s, 0.3);
      ctx.lineCap = 'round';
      const br = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 2 * s, y - 16 * s, x + 2 * s, y - 28 * s); ctx.moveTo(x, y - 14 * s); ctx.quadraticCurveTo(x - 8 * s, y - 18 * s, x - 11 * s, y - 26 * s); ctx.moveTo(x + 1 * s, y - 20 * s); ctx.quadraticCurveTo(x + 8 * s, y - 22 * s, x + 11 * s, y - 31 * s); ctx.stroke(); };
      br(5, '#3e3426'); br(3.2, '#7a6a52');
      ctx.strokeStyle = 'rgba(200,230,120,.75)'; ctx.lineWidth = 1.2;
      for (const [hx, hy, l] of [[-9, -23, 9], [9, -27, 11], [1, -25, 7]]) { const sw = Math.sin(t * 1.2 + hx) * 1.5; ctx.beginPath(); ctx.moveTo(x + hx * s, y + hy * s); ctx.quadraticCurveTo(x + hx * s + sw, y + (hy + l / 2) * s, x + hx * s + sw * 1.5, y + (hy + l) * s); ctx.stroke(); }
    },
    reeds(ctx, x, y, s, t, k) {
      for (let i = 0; i < 5; i++) {
        const bx = x + (i - 2) * 4 * s, h = (18 + hash(i, k * 50) * 10) * s, sw = Math.sin(t * 1.4 + i + k * 6) * 2.5;
        ctx.strokeStyle = '#5e7a24'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - h * 0.6, bx + sw, y - h); ctx.stroke();
        if (i % 2 === 0) { ctx.fillStyle = lg(ctx, bx + sw - 2, 0, bx + sw + 2, 0, ['#b07a4a', '#6a3e1e']); rrect(ctx, bx + sw - 2, y - h - 1, 4, 8 * s, 2); ctx.fill(); }
      }
      leaf(ctx, x - 2, y, 12 * s, -2.4, [110, 140, 50], 0.18); leaf(ctx, x + 2, y, 12 * s, -0.7, [96, 128, 44], 0.18);
    },
    shroom(ctx, x, y, s, t, k) {
      const cols = [[60, 230, 230], [240, 90, 220], [130, 140, 255]];
      [[-7, 0.75, 1], [6, 1, 0], [0, 0.55, 2]].forEach(([dx, sc, ci], i) => {
        const c = cols[(ci + Math.floor(k * 3)) % 3], h = 16 * sc * s, r = 9 * sc * s, bx = x + dx * s, by = y + (i === 2 ? 3 : 0);
        ctx.fillStyle = lg(ctx, bx - 2, 0, bx + 2, 0, ['#f4eedc', '#bab09a']); rrect(ctx, bx - 2.4 * sc * s, by - h, 4.8 * sc * s, h, 2); ctx.fill();
        const pu = 0.5 + 0.5 * Math.sin(t * 2 + i * 2 + k * 7);
        K.glow(ctx, bx, by - h, r * 2.2, c, 0.25 + 0.2 * pu);
        ctx.fillStyle = rg(ctx, bx - r * 0.3, by - h - r * 0.5, r * 1.3, [lift(c, 80), c, lift(c, -80)]);
        ctx.beginPath(); ctx.ellipse(bx, by - h, r, r * 0.7, 0, PI, 0); ctx.quadraticCurveTo(bx, by - h + r * 0.25, bx - r, by - h); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(bx + (j - 1) * r * 0.45, by - h - r * (0.35 + (j % 2) * 0.2), r * 0.13, 0, TAU); ctx.fill(); }
      });
    },
    shroomTall(ctx, x, y, s, t, k) { PROP.shroom(ctx, x, y, s * 1.2, t, k + 0.4); },
    lily(ctx, x, y, s, t, k) {
      const bob = Math.sin(t * 1.4 + k * 8) * 0.8;
      for (const [dx, dy, r] of [[-6, 0, 7], [7, -4, 5.5]]) {
        ctx.fillStyle = rg(ctx, x + dx - 2, y + dy - 6 + bob, r * 1.3, ['#9ae070', '#4ea040', '#2a6a2a']);
        ctx.beginPath(); ctx.ellipse(x + dx * s, y + (dy - 6) * s + bob, r * s, r * 0.55 * s, 0, 0.3, TAU - 0.3); ctx.lineTo(x + dx * s, y + (dy - 6) * s + bob); ctx.fill();
      }
      for (let j = 0; j < 6; j++) blob(ctx, x - 6 * s + Math.cos(j * TAU / 6) * 2.6, y - 9 * s + bob + Math.sin(j * TAU / 6) * 1.4, 2.4, 1.8, [255, 150, 190]);
      blob(ctx, x - 6 * s, y - 9.5 * s + bob, 1.5, 1.2, [255, 230, 120]);
    },
    rock(ctx, x, y, s, t, k) {
      const ph = frac(t * 0.4 + k);
      ctx.strokeStyle = `rgba(230,255,255,${0.7 * (1 - ph)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y - 3, 13 * s + ph * 6, 5 * s + ph * 2, 0, 0, TAU); ctx.stroke();
      blob(ctx, x - 3 * s, y - 7 * s, 9 * s, 7 * s, [130, 136, 150]); blob(ctx, x + 6 * s, y - 4 * s, 6 * s, 4.5 * s, [112, 118, 134]);
      ctx.fillStyle = 'rgba(240,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 12 * s, 2.2 * s, 0, 0, PI); ctx.fill();
    },
    islet(ctx, x, y, s, t, k) {
      ctx.fillStyle = 'rgba(230,255,240,.55)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 15 * s, 5.5 * s, 0, 0, TAU); ctx.fill();
      blob(ctx, x, y - 3, 13 * s, 4.5 * s, [236, 214, 150]);
      PROP.palm(ctx, x - 2, y - 4, s * 0.75, t, k);
    },
    jelly(ctx, x, y, s, t, k) {
      const bob = Math.sin(t * 2 + k * 9) * 2.5, cy = y - 12 * s + bob;
      ctx.strokeStyle = 'rgba(255,170,230,.7)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { const tx = x + (i - 1.5) * 3 * s; ctx.beginPath(); ctx.moveTo(tx, cy); ctx.quadraticCurveTo(tx + Math.sin(t * 3 + i) * 2.5, cy + 6, tx, cy + 11 * s); ctx.stroke(); }
      ctx.fillStyle = rg(ctx, x - 2, cy - 4, 9 * s, ['rgba(255,230,250,.95)', 'rgba(255,120,210,.85)', 'rgba(180,60,170,.8)']);
      ctx.beginPath(); ctx.ellipse(x, cy, 7.5 * s, 6.5 * s, 0, PI, 0); ctx.quadraticCurveTo(x, cy + 3, x - 7.5 * s, cy); ctx.fill();
      K.glow(ctx, x, cy - 1, 12 * s, [255, 140, 230], 0.25);
      ctx.fillStyle = '#4a1040'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * 2.5 * s, cy - 2, 1, 0, TAU); ctx.fill(); }
    },
    headframe(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 15 * s, 4.5 * s, 0.32);
      ctx.fillStyle = '#2a1a10'; rrect(ctx, x - 8 * s, y - 12 * s, 16 * s, 12 * s, 2); ctx.fill();
      ctx.lineCap = 'round';
      for (const [w, c] of [[4.2, '#5a3a1c'], [2.6, '#b07c44']]) { ctx.strokeStyle = c; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(x - 11 * s, y); ctx.lineTo(x - 2 * s, y - 32 * s); ctx.lineTo(x + 2 * s, y - 32 * s); ctx.lineTo(x + 11 * s, y); ctx.moveTo(x - 8 * s, y - 12 * s); ctx.lineTo(x + 8 * s, y - 12 * s); ctx.stroke(); }
      const a = t * 2;
      ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y - 31 * s, 5 * s, 0, TAU); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x, y - 31 * s); ctx.lineTo(x + Math.cos(a + i * 2.1) * 5 * s, y - 31 * s + Math.sin(a + i * 2.1) * 5 * s); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,200,210,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 5 * s, y - 31 * s); ctx.lineTo(x + 5 * s, y - 12 * s); ctx.stroke();
      K.glow(ctx, x, y - 6 * s, 9 * s, [255, 190, 90], 0.25);
    },
    cart(ctx, x, y, s, t, k) {
      ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 17 * s, y - 1); ctx.lineTo(x + 17 * s, y - 1); ctx.moveTo(x - 17 * s, y + 2); ctx.lineTo(x + 17 * s, y + 2); ctx.stroke();
      ctx.fillStyle = '#6a4424'; for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 7 * s - 1.5, y - 2, 3, 6);
      ctx.fillStyle = lg(ctx, 0, y - 16 * s, 0, y - 4 * s, ['#b86a3a', '#7a3a1c']); poly(ctx, [[x - 12 * s, y - 15 * s], [x + 12 * s, y - 15 * s], [x + 9 * s, y - 5 * s], [x - 9 * s, y - 5 * s]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,150,.4)'; ctx.fillRect(x - 12 * s, y - 15 * s, 24 * s, 1.5);
      for (let i = 0; i < 5; i++) blob(ctx, x + (i - 2) * 4.2 * s, y - (16.5 + (i % 2) * 2) * s, 3.2 * s, 2.8 * s, [255, 200, 60]);
      if (frac(t * 0.5 + k) < 0.3) K.glow(ctx, x + 3, y - 18 * s, 8, [255, 240, 150], 0.5);
      for (const d of [-1, 1]) blob(ctx, x + d * 6 * s, y - 3.5 * s, 3 * s, 3 * s, [70, 70, 84]);
    },
    lantern(ctx, x, y, s, t, k) {
      sh(ctx, x + 2, y, 8 * s, 3 * s, 0.3);
      ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = 3.4 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 30 * s); ctx.lineTo(x + 8 * s, y - 30 * s); ctx.stroke();
      ctx.strokeStyle = '#a0723e'; ctx.lineWidth = 1.8 * s; ctx.stroke();
      const fl = 0.75 + 0.25 * Math.sin(t * 11 + k * 30) * Math.sin(t * 7.3);
      K.glow(ctx, x + 8 * s, y - 23 * s, 22 * s, [255, 180, 80], 0.45 * fl);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x + 5 * s, y - 28.5 * s, 6 * s, 2 * s);
      ctx.fillStyle = rg(ctx, x + 8 * s, y - 23 * s, 5 * s, ['#fffbd0', '#ffc850', '#d07018']); rrect(ctx, x + 5 * s, y - 27 * s, 6 * s, 8 * s, 2); ctx.fill();
    },
    nuggets(ctx, x, y, s, t, k) {
      blob(ctx, x, y - 4 * s, 13 * s, 6 * s, [120, 84, 52]);
      for (let i = 0; i < 6; i++) blob(ctx, x + (hash(i, 7) - 0.5) * 18 * s, y - (5 + hash(i, 9) * 6) * s, 2.8 * s, 2.4 * s, [255, 204, 60]);
      ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 6 * s); ctx.lineTo(x + 14 * s, y - 20 * s); ctx.stroke();
      ctx.fillStyle = '#9a9aa8'; poly(ctx, [[x + 9 * s, y - 21 * s], [x + 19 * s, y - 18 * s], [x + 14 * s, y - 22 * s]]); ctx.fill();
      const tw = Math.max(0, Math.sin(t * 2.5 + k * 9)); if (tw > 0.8) K.glow(ctx, x - 3, y - 9 * s, 8, [255, 240, 160], (tw - 0.8) * 3);
    },
    basalt(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 15 * s, 4 * s, 0.35);
      [[-7, 18], [7, 13], [0, 25]].forEach(([dx, h]) => {
        const bx = x + dx * s, hh = h * s * (0.8 + k * 0.4), w = 5.5 * s;
        ctx.fillStyle = lg(ctx, bx - w, 0, bx + w, 0, ['#8a8ec8', '#565a94', '#2e3060']); ctx.fillRect(bx - w, y - hh, w * 2, hh);
        ctx.fillStyle = '#b8c0ff'; poly(ctx, [[bx - w, y - hh], [bx - w * 0.5, y - hh - 3 * s], [bx + w * 0.5, y - hh - 3 * s], [bx + w, y - hh], [bx + w * 0.5, y - hh + 2 * s], [bx - w * 0.5, y - hh + 2 * s]]); ctx.fill();
        ctx.fillStyle = 'rgba(30,30,70,.35)'; ctx.fillRect(bx + w * 0.3, y - hh + 2, w * 0.7, hh - 2);
      });
    },
    stalag(ctx, x, y, s, t, k) {
      sh(ctx, x + 2, y, 11 * s, 3.5 * s, 0.35);
      ctx.fillStyle = lg(ctx, x - 8 * s, 0, x + 8 * s, 0, ['#9a9ed4', '#5a5e9a', '#30326a']); ctx.beginPath(); ctx.moveTo(x - 9 * s, y); ctx.quadraticCurveTo(x - 3 * s, y - 14 * s, x, y - 30 * s); ctx.quadraticCurveTo(x + 3 * s, y - 14 * s, x + 9 * s, y); ctx.fill();
      const pu = 0.5 + 0.5 * Math.sin(t * 1.8 + k * 6);
      K.glow(ctx, x + 6 * s, y - 6 * s, 12 * s, [120, 220, 255], 0.3 + 0.25 * pu);
      ctx.fillStyle = lg(ctx, x + 3 * s, y - 14 * s, x + 9 * s, y, ['#e8fcff', '#70d8ff', '#2a88c8']); poly(ctx, [[x + 3 * s, y], [x + 6 * s, y - 13 * s], [x + 9.5 * s, y - 1]]); ctx.fill();
    },
    amethyst(ctx, x, y, s, t, k) {
      sh(ctx, x + 2, y, 13 * s, 4 * s, 0.32);
      [[-8, 16, -0.35], [7, 14, 0.4], [0, 26, 0], [-3, 11, -0.1], [4, 9, 0.2]].forEach(([dx, h, a], i) => {
        ctx.save(); ctx.translate(x + dx * s, y); ctx.rotate(a); const w = (3 + h * 0.12) * s, hh = h * s;
        ctx.fillStyle = lg(ctx, -w, 0, w, 0, ['#ffd6ff', '#d070f0', '#7a2aa8']); poly(ctx, [[-w, 0], [-w, -hh * 0.75], [0, -hh], [w, -hh * 0.75], [w, 0]]); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)'; poly(ctx, [[-w, -hh * 0.75], [0, -hh], [0, 0], [-w, 0]]); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      });
      const tw = Math.max(0, Math.sin(t * 2.2 + k * 11)); if (tw > 0.75) { const sx = x + 1, sy = y - 24 * s; ctx.strokeStyle = `rgba(255,255,255,${(tw - 0.75) * 4})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 5, sy); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx, sy + 5); ctx.stroke(); }
      K.glow(ctx, x, y - 10 * s, 16 * s, [230, 120, 255], 0.18);
    },
    geode(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 14 * s, 4 * s, 0.32);
      blob(ctx, x, y - 10 * s, 13 * s, 11 * s, [120, 110, 130]);
      ctx.fillStyle = rg(ctx, x + 2, y - 10 * s, 9 * s, ['#fff0ff', '#e080ff', '#7a2a9a']); ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 10 * s, 8 * s, 7 * s, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.fillStyle = 'rgba(255,220,255,.7)'; poly(ctx, [[x + 2 * s + Math.cos(a) * 7 * s, y - 10 * s + Math.sin(a) * 6 * s], [x + 2 * s + Math.cos(a + 0.2) * 3 * s, y - 10 * s + Math.sin(a + 0.2) * 3 * s], [x + 2 * s + Math.cos(a - 0.2) * 3 * s, y - 10 * s + Math.sin(a - 0.2) * 3 * s]]); ctx.fill(); }
      K.glow(ctx, x + 2, y - 10 * s, 14 * s, [240, 140, 255], 0.25 + 0.15 * Math.sin(t * 2 + k * 5));
    },
    pine(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 11 * s, 3.5 * s, 0.3);
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(x - 2 * s, y - 6 * s, 4 * s, 6 * s);
      for (let i = 0; i < 3; i++) {
        const w = (12 - i * 3) * s, yb = y - (5 + i * 8) * s, yt = yb - 13 * s;
        ctx.fillStyle = lg(ctx, x - w, 0, x + w, 0, ['#5aa088', '#2e6a5a', '#1e4a40']); poly(ctx, [[x - w, yb], [x, yt], [x + w, yb]]); ctx.fill();
        ctx.fillStyle = lg(ctx, 0, yt, 0, yb, ['#ffffff', '#dceeff']); ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x - w * 0.62, yb - 4 * s); ctx.quadraticCurveTo(x - w * 0.3, yb - 1, x, yb - 4 * s); ctx.quadraticCurveTo(x + w * 0.3, yb - 1, x + w * 0.62, yb - 4 * s); ctx.closePath(); ctx.fill();
      }
    },
    icespike(ctx, x, y, s, t, k) {
      sh(ctx, x + 2, y, 13 * s, 4 * s, 0.25);
      [[-7, 15, -0.3], [6, 19, 0.25], [0, 27, 0]].forEach(([dx, h, a]) => {
        ctx.save(); ctx.translate(x + dx * s, y); ctx.rotate(a); const w = 5 * s;
        ctx.fillStyle = lg(ctx, -w, 0, w, 0, ['#ffffff', '#a8dcff', '#5a9ad0']); poly(ctx, [[-w, 0], [0, -h * s], [w, 0]]); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; poly(ctx, [[-w * 0.6, 0], [0, -h * s], [-w * 0.1, 0]]); ctx.fill();
        ctx.restore();
      });
      K.glow(ctx, x, y - 10, 14 * s, [180, 230, 255], 0.15);
    },
    snowman(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 11 * s, 3.5 * s, 0.25);
      blob(ctx, x, y - 7 * s, 9 * s, 8 * s, [236, 244, 255]); blob(ctx, x, y - 19 * s, 6.5 * s, 6 * s, [240, 248, 255]);
      ctx.fillStyle = '#2a2a3a'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * 2.2 * s, y - 20 * s, 0.9 * s, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ff8a2a'; poly(ctx, [[x, y - 18.5 * s], [x + 5 * s, y - 17.5 * s], [x, y - 17 * s]]); ctx.fill();
      ctx.fillStyle = '#d83a3a'; ctx.fillRect(x - 6 * s, y - 14.5 * s, 12 * s, 2.4 * s); ctx.fillRect(x + 2 * s, y - 14 * s, 2.4 * s, 6 * s);
    },
    spire(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 12 * s, 4 * s, 0.35);
      ctx.fillStyle = lg(ctx, x - 9 * s, 0, x + 9 * s, 0, ['#8a88c8', '#4a4888', '#24224e']); poly(ctx, [[x - 10 * s, y], [x - 4 * s, y - 20 * s], [x - 1 * s, y - 32 * s], [x + 3 * s, y - 22 * s], [x + 10 * s, y]]); ctx.fill();
      ctx.fillStyle = '#c0c4e0'; ctx.fillRect(x - 0.8, y - 42 * s, 1.6, 11 * s);
      blob(ctx, x, y - 42 * s, 2.4, 2.4, [200, 210, 255]);
      const zap = frac(t * 0.7 + k * 3) < 0.12;
      K.glow(ctx, x, y - 42 * s, zap ? 18 : 8, [140, 200, 255], zap ? 0.8 : 0.35);
      if (zap) { ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y - 42 * s); ctx.lineTo(x + 5, y - 36 * s); ctx.lineTo(x + 2, y - 32 * s); ctx.lineTo(x + 8, y - 26 * s); ctx.stroke(); }
    },
    cloud(ctx, x, y, s, t, k) {
      const dx = Math.sin(t * 0.5 + k * 7) * 3, cy = y - 30 * s;
      sh(ctx, x + dx, y, 14 * s, 4 * s, 0.25);
      ctx.strokeStyle = 'rgba(170,190,255,.45)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const ry = frac(t * 1.6 + i / 5); ctx.beginPath(); ctx.moveTo(x + dx + (i - 2) * 4, cy + 6 + ry * 18 * s); ctx.lineTo(x + dx + (i - 2) * 4 - 1.5, cy + 10 + ry * 18 * s); ctx.stroke(); }
      for (const [ox, oy, r] of [[-8, 1, 6.5], [7, 2, 6], [0, -3, 8.5]]) blob(ctx, x + dx + ox * s, cy + oy * s, r * s, r * s * 0.85, [96, 94, 150]);
      const fl = frac(t * 0.45 + k * 5) < 0.06;
      if (fl) { K.glow(ctx, x + dx, cy, 22, [190, 210, 255], 0.6); ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + dx, cy + 5); ctx.lineTo(x + dx - 4, cy + 13); ctx.lineTo(x + dx + 1, cy + 14); ctx.lineTo(x + dx - 3, y - 2); ctx.stroke(); }
    },
    lava(ctx, x, y, s, t, k) {
      const rx = 15 * s, ry = 7 * s, cy = y - 5;
      ctx.fillStyle = '#3a1810'; ctx.beginPath(); ctx.ellipse(x, cy + 1.5, rx + 2.5, ry + 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rg(ctx, x - 2, cy - 1, rx, ['#fff2a0', '#ffa030', '#d03a10']); ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill();
      K.glow(ctx, x, cy, rx * 1.8, [255, 120, 40], 0.3 + 0.1 * Math.sin(t * 2 + k * 6));
      ctx.strokeStyle = 'rgba(160,40,10,.6)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) { const o = Math.sin(t * 0.8 + i * 2 + k * 5) * 3; ctx.beginPath(); ctx.ellipse(x + o, cy, rx * (0.3 + i * 0.3), ry * (0.3 + i * 0.3), 0, 0.3, 2.6); ctx.stroke(); }
      const ph = frac(t * 0.7 + k); ctx.fillStyle = `rgba(255,220,120,${1 - ph})`; ctx.beginPath(); ctx.arc(x + 4, cy - ph * 10, 1.6 * (1 - ph) + 0.6, 0, TAU); ctx.fill();
    },
    vrock(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 14 * s, 4 * s, 0.4);
      ctx.fillStyle = lg(ctx, x - 12 * s, y - 20 * s, x + 12 * s, y, ['#7a4a40', '#4a2620', '#24100c']); poly(ctx, [[x - 13 * s, y], [x - 9 * s, y - 13 * s], [x - 2 * s, y - 20 * s], [x + 7 * s, y - 15 * s], [x + 13 * s, y]]); ctx.fill();
      const g = 0.6 + 0.4 * Math.sin(t * 2.4 + k * 8);
      ctx.strokeStyle = rgb([255, 150, 50], g); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 2); ctx.lineTo(x - 3 * s, y - 9 * s); ctx.lineTo(x + 1 * s, y - 12 * s); ctx.moveTo(x - 3 * s, y - 9 * s); ctx.lineTo(x + 5 * s, y - 6 * s); ctx.stroke();
      K.glow(ctx, x - 2, y - 8 * s, 12 * s, [255, 110, 40], 0.25 * g);
    },
    vent(ctx, x, y, s, t, k) {
      blob(ctx, x, y - 4 * s, 11 * s, 6 * s, [96, 56, 48]);
      ctx.fillStyle = rg(ctx, x, y - 5 * s, 5 * s, ['#fff0a0', '#ff8020', '#801a08']); ctx.beginPath(); ctx.ellipse(x, y - 5.5 * s, 5 * s, 2.4 * s, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) { const ph = frac(t * 0.35 + i / 3 + k); ctx.fillStyle = `rgba(90,70,74,${0.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + Math.sin(ph * 5 + i) * 4, y - 8 * s - ph * 30, 3 + ph * 7, 0, TAU); ctx.fill(); }
      K.glow(ctx, x, y - 6, 12, [255, 130, 40], 0.4);
    },
    steps(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 16 * s, 4.5 * s, 0.3);
      for (let i = 0; i < 4; i++) {
        const w = 15 * s, yy = y - i * 5 * s, xx = x - 4 * s + i * 2.5 * s, broken = i === 3;
        ctx.fillStyle = lg(ctx, 0, yy - 5 * s, 0, yy, ['#f2e2b4', '#b89c66']); ctx.fillRect(xx - w + i * 2 * s, yy - 5 * s, (w - i * 2 * s) * (broken ? 1.1 : 2), 5 * s);
        ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.fillRect(xx - w + i * 2 * s, yy - 5 * s, (w - i * 2 * s) * (broken ? 1.1 : 2), 1.2);
      }
      blob(ctx, x + 10 * s, y - 3 * s, 4 * s, 3 * s, [196, 176, 128]);
      ctx.strokeStyle = '#5c9a3a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 14 * s, y - 2); ctx.quadraticCurveTo(x - 6 * s, y - 14 * s, x + 2 * s, y - 18 * s); ctx.stroke();
      leaf(ctx, x + 2 * s, y - 18 * s, 6 * s, -0.4, [96, 170, 64], 0.35); leaf(ctx, x - 8 * s, y - 10 * s, 5 * s, 3.6, [96, 170, 64], 0.35);
    },
    cavepool(ctx, x, y, s, t, k) {
      const rx = 14 * s, ry = 6.5 * s, cy = y - 5;
      ctx.fillStyle = '#2a2c5a'; ctx.beginPath(); ctx.ellipse(x, cy + 1.5, rx + 2.5, ry + 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rg(ctx, x - 3, cy - 2, rx, ['#c8f4ff', '#40a8e0', '#1a3a8a']); ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill();
      K.glow(ctx, x, cy, rx * 1.6, [100, 200, 255], 0.22 + 0.1 * Math.sin(t * 1.7 + k * 5));
      const ph = frac(t * 0.5 + k); ctx.strokeStyle = `rgba(230,250,255,${0.8 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 3, cy, 2 + ph * 8, 1 + ph * 3.5, 0, 0, TAU); ctx.stroke();
      for (const d of [-1, 1]) { ctx.fillStyle = lg(ctx, x + d * 13 * s - 3, 0, x + d * 13 * s + 3, 0, ['#9aa0d8', '#3e4280']); poly(ctx, [[x + d * 15 * s - 3, cy + 3], [x + d * 14 * s, cy - 12 * s], [x + d * 15 * s + 3, cy + 3]]); ctx.fill(); }
    },
    boulders(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 15 * s, 4 * s, 0.35);
      const c = k > 0.5 ? [104, 106, 160] : [92, 90, 146];
      blob(ctx, x - 5 * s, y - 8 * s, 9 * s, 8 * s, c); blob(ctx, x + 7 * s, y - 5 * s, 6.5 * s, 5.5 * s, lift(c, -10)); blob(ctx, x + 1 * s, y - 2.5 * s, 4 * s, 3 * s, lift(c, 10));
      ctx.strokeStyle = rgb(lift(c, -50), 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 12 * s); ctx.lineTo(x - 4 * s, y - 8 * s); ctx.lineTo(x - 6 * s, y - 4 * s); ctx.stroke();
    },
    crates(ctx, x, y, s, t, k) {
      sh(ctx, x + 3, y, 15 * s, 4 * s, 0.32);
      for (const [dx, dy, w] of [[-7, 0, 12], [6, 0, 10], [-1, -11, 10]]) {
        const bx = x + dx * s - w * s / 2, by = y + dy * s - w * s;
        ctx.fillStyle = lg(ctx, bx, by, bx + w * s, by + w * s, ['#e0a860', '#a86e34', '#6e4220']); ctx.fillRect(bx, by, w * s, w * s);
        ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 1; ctx.strokeRect(bx + 1, by + 1, w * s - 2, w * s - 2);
        ctx.beginPath(); ctx.moveTo(bx + 1, by + 1); ctx.lineTo(bx + w * s - 1, by + w * s - 1); ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,180,.45)'; ctx.fillRect(bx + 1, by + 1, w * s - 2, 1.2);
      }
    },
    hut(ctx, x, y, s, t) {
      sh(ctx, x + 3, y, 18, 5, 0.35);
      ctx.fillStyle = lg(ctx, x - 13, 0, x + 13, 0, ['#e0b070', '#a8743a', '#6a4220']); ctx.fillRect(x - 12, y - 18, 24, 18);
      ctx.strokeStyle = 'rgba(90,56,24,.6)'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5, y - 18); ctx.lineTo(x + i * 5, y); ctx.stroke(); }
      ctx.fillStyle = '#3a2210'; rrect(ctx, x - 4, y - 11, 8, 11, 3); ctx.fill();
      ctx.fillStyle = lg(ctx, 0, y - 36, 0, y - 15, ['#c8e070', '#7aa838', '#466a20']); poly(ctx, [[x - 18, y - 15], [x, y - 36], [x + 18, y - 15]]); ctx.fill();
      ctx.strokeStyle = 'rgba(60,90,20,.7)'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + i * 5.5, y - 15); ctx.stroke(); }
      ctx.strokeStyle = '#7a5428'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x + 13, y - 44); ctx.stroke();
      const wv = Math.sin(t * 4) * 2; ctx.fillStyle = lg(ctx, x + 13, 0, x + 27, 0, ['#ff5a4a', '#d8302a']); ctx.beginPath(); ctx.moveTo(x + 13, y - 44); ctx.quadraticCurveTo(x + 20, y - 46 + wv, x + 27, y - 41 + wv); ctx.lineTo(x + 13, y - 36); ctx.fill();
      text(ctx, 'START', x, y + 8, 8, '#fff6dc', 'rgba(60,40,10,.8)');
    },
    sign(ctx, x, y, s, t, k, pr) {
      sh(ctx, x + 2, y, 8, 3, 0.35);
      ctx.fillStyle = lg(ctx, x - 2, 0, x + 2, 0, ['#c08a50', '#6a4422']); ctx.fillRect(x - 2, y - 40, 4, 40);
      pr.arrows.forEach(([label, dir, c], i) => {
        const yy = y - 36 + i * 11, w = 40, wob = Math.sin(t * 1.5 + i) * 0.03;
        ctx.save(); ctx.translate(x, yy); ctx.rotate(wob);
        const x0 = dir < 0 ? -w + 6 : dir > 0 ? -6 : -w / 2, tip = dir < 0 ? x0 - 6 : dir > 0 ? x0 + w + 6 : null;
        ctx.fillStyle = lg(ctx, 0, -5, 0, 5, [lift(c, 50), c, lift(c, -40)]);
        ctx.beginPath(); ctx.moveTo(x0, -5); ctx.lineTo(x0 + w, -5);
        if (dir > 0) ctx.lineTo(tip, 0); ctx.lineTo(x0 + w, 5); ctx.lineTo(x0, 5); if (dir < 0) ctx.lineTo(tip, 0); ctx.closePath(); ctx.fill();
        if (dir === 0) { ctx.beginPath(); ctx.moveTo(x0 + w / 2 - 5, -5); ctx.lineTo(x0 + w / 2, -10); ctx.lineTo(x0 + w / 2 + 5, -5); ctx.fill(); }
        ctx.strokeStyle = rgb(lift(c, -70)); ctx.lineWidth = 0.9; ctx.stroke();
        text(ctx, label, x0 + w / 2, 0.5, 7, '#fffaf0', rgb(lift(c, -90)));
        ctx.restore();
      });
    },
  };

  // ---------------------------------------------------------------- page background + board
  function drawBackdrop(ctx, P, t) {
    const { w, p } = P, x0 = O(p);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, PW, MH); ctx.clip();
    // one diagonal gradient: lit from the top-left
    ctx.fillStyle = lg(ctx, x0, 0, x0 + PW * 0.6, MH, [[0, lift(w.bg[0], 22)], [0.45, w.bg[0]], [1, w.bg[1]]]); ctx.fillRect(x0, 0, PW, MH);
    // far silhouettes per world, already fogged into the background
    const R = K.rand(p * 31 + 7);
    ctx.fillStyle = rgb(mix(w.far, w.bg[1], 0.25));
    if (p === 0) {
      for (let i = 0; i < 6; i++) { const x = x0 + R() * PW, cw = 10 + R() * 18; ctx.fillRect(x - cw / 2, 0, cw, MH); }
      for (let i = 0; i < 10; i++) { const x = x0 + R() * PW, y = R() * 140; ctx.beginPath(); ctx.ellipse(x, y, 30 + R() * 30, 18 + R() * 12, 0, 0, TAU); ctx.fill(); }
    } else if (p === 1) {
      for (let i = 0; i < 9; i++) { const x = x0 + R() * PW, cw = 10 + R() * 22, len = 60 + R() * 160, top = i % 2; ctx.beginPath(); const yb = top ? 0 : MH, ye = top ? len : MH - len; ctx.moveTo(x - cw, yb); ctx.quadraticCurveTo(x - cw * 0.3, (yb + ye) / 2, x, ye); ctx.quadraticCurveTo(x + cw * 0.3, (yb + ye) / 2, x + cw, yb); ctx.fill(); }
    } else if (p === 2) {
      for (let i = 0; i < 4; i++) { const x = x0 + 40 + i * 95 + R() * 20, hh = 120 + R() * 140; ctx.beginPath(); ctx.moveTo(x - 70, MH); ctx.lineTo(x - 12, MH - hh); ctx.lineTo(x + 12, MH - hh); ctx.lineTo(x + 70, MH); ctx.fill(); K.glow(ctx, x, MH - hh, 40, [255, 120, 50], 0.18); }
    } else {
      for (let i = 0; i < 7; i++) { const x = x0 + R() * PW, y = 120 + R() * 500; ctx.beginPath(); ctx.ellipse(x, y, 60 + R() * 40, 18 + R() * 10, 0, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  // each region's tiles get their own surface: temple slabs, glowing magma cracks, ice glints, spores...
  function texture(ctx, tl, c, tx, ty, t, p) {
    const h = hash(tl.c * 13 + p, tl.r * 7 + 1), h2 = hash(tl.r * 5 + p, tl.c * 11 + 2), reg = tl.region;
    const dark = rgb(lift(c, -28), 0.75), light = rgb(lift(c, 26), 0.7);
    ctx.lineWidth = 1;
    if (reg === 'temple') {
      ctx.fillStyle = dark; ctx.fillRect(tx + 3, ty + T / 2 - 0.6, T - 6, 1.2); ctx.fillRect(tx + 8 + h * 20, ty + 3, 1.2, T / 2 - 3); ctx.fillRect(tx + 6 + h2 * 24, ty + T / 2, 1.2, T / 2 - 3);
      ctx.fillStyle = light; ctx.fillRect(tx + 3, ty + T / 2 + 0.6, T - 6, 1);
    } else if (reg === 'magma') {
      const g = 0.45 + 0.35 * Math.sin(t * 2 + h * 9);
      ctx.strokeStyle = `rgba(255,${120 + h2 * 60},40,${g})`; ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(tx + 4 + h * 10, ty + 6); ctx.lineTo(tx + 14 + h2 * 8, ty + 18); ctx.lineTo(tx + 10 + h * 14, ty + 30); ctx.moveTo(tx + 14 + h2 * 8, ty + 18); ctx.lineTo(tx + 30, ty + 20 + h * 10); ctx.stroke();
      if (h > 0.82) K.glow(ctx, tx + 14 + h2 * 8, ty + 18, 12, [255, 110, 30], 0.2 * g);
    } else if (reg === 'frost') {
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(tx + 6, ty + 10 + h * 10); ctx.lineTo(tx + 16 + h2 * 10, ty + 18); ctx.lineTo(tx + 34, ty + 14 + h2 * 14); ctx.stroke();
      const tw = Math.max(0, Math.sin(t * 2.5 + h * 20)); if (tw > 0.8) { const sx = tx + 10 + h2 * 22, sy = ty + 10 + h * 22, a = (tw - 0.8) * 5; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4); ctx.stroke(); }
    } else if (reg === 'crystal') {
      ctx.fillStyle = 'rgba(255,220,255,.28)'; poly(ctx, [[tx + 6 + h * 14, ty + 8], [tx + 18 + h * 14, ty + 6 + h2 * 6], [tx + 12 + h * 14, ty + 20]]); ctx.fill();
      ctx.fillStyle = dark; poly(ctx, [[tx + 20 + h2 * 10, ty + 24], [tx + 32, ty + 30], [tx + 22 + h2 * 10, ty + 36]]); ctx.fill();
    } else if (reg === 'caves' || reg === 'storm') {
      ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(tx + 5, ty + 12 + h * 14); ctx.lineTo(tx + 15, ty + 16 + h * 10); ctx.lineTo(tx + 19 + h2 * 6, ty + 30); ctx.moveTo(tx + 15, ty + 16 + h * 10); ctx.lineTo(tx + 32, ty + 10 + h2 * 8); ctx.stroke();
      if (reg === 'caves' && h > 0.55) { ctx.fillStyle = 'rgba(150,220,255,.75)'; ctx.beginPath(); ctx.arc(tx + 28 - h2 * 10, ty + 28, 1.4, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(120,200,255,.18)'; ctx.beginPath(); ctx.arc(tx + 28 - h2 * 10, ty + 28, 4, 0, TAU); ctx.fill(); }
    } else if (reg === 'grotto') {
      for (let i = 0; i < 3; i++) { const sx = tx + 8 + hash(i, h * 99) * 26, sy = ty + 8 + hash(i + 7, h * 99) * 26, pu = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 2 + h * 9), col = i % 2 ? [120, 255, 240] : [255, 120, 240]; ctx.fillStyle = rgb(col, 0.18 * pu); ctx.beginPath(); ctx.arc(sx, sy, 3.6, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(col, 0.5 + 0.4 * pu); ctx.beginPath(); ctx.arc(sx, sy, 1.3, 0, TAU); ctx.fill(); }
    } else if (reg === 'bog') {
      if (h > 0.5) { ctx.fillStyle = rgb(lift(c, -34), 0.8); ctx.beginPath(); ctx.ellipse(tx + 12 + h2 * 16, ty + 26, 7, 3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,240,120,.35)'; ctx.beginPath(); ctx.ellipse(tx + 10 + h2 * 16, ty + 25, 3, 1, 0, 0, TAU); ctx.fill(); }
    } else if (reg === 'mine') {
      ctx.fillStyle = dark; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(tx + 6 + hash(i, h * 50) * 30, ty + 6 + hash(i + 3, h * 50) * 30, 1.8, 1.2, 0, 0, TAU); ctx.fill(); }
      if (h > 0.7) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(tx + 30 - h2 * 16, ty + 12, 1.5, 0, TAU); ctx.fill(); }
    }
  }

  function drawBoard(ctx, P, t) {
    const { w, p } = P, x0 = O(p) + BX;
    // drop shadow + raised side
    ctx.fillStyle = 'rgba(10,6,20,.32)'; rrect(ctx, x0 + 4, BY + 14, BW, BH + 4, 20); ctx.fill();
    ctx.fillStyle = rgb(w.side); rrect(ctx, x0, BY + 4, BW, BH - 30, 20); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, BY + BH - 10, 0, BY + BH + 12, [lift(w.side, 20), w.side, lift(w.side, -40)]); rrect(ctx, x0, BY + BH - 40, BW, 52, 20); ctx.fill();
    ctx.fillStyle = rgb(lift(w.side, 35), 0.6); ctx.fillRect(x0 + 16, BY + BH + 2, BW - 32, 1.2);
    ctx.save(); rrect(ctx, x0, BY, BW, BH, 18); ctx.clip();
    for (const tl of P.tiles) {
      // board lighting baked into each tile: brighter top-left, shaded bottom-right
      const R = REG[tl.region], tx = tl.x - T / 2, ty = tl.y - T / 2, lit = Math.round(12 - 26 * (tl.c / COLS * 0.45 + tl.r / ROWS * 0.55));
      const c = lift((tl.c + tl.r) % 2 ? R.b : R.a, lit);
      ctx.fillStyle = rgb(R.e); ctx.fillRect(tx, ty, T, T);
      if (R.water) {
        ctx.fillStyle = lg(ctx, tx, ty, tx + T, ty + T, [lift(c, 18), c, lift(c, -14)]); rrect(ctx, tx + 1.5, ty + 1.5, T - 3, T - 3, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(220,255,255,.45)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 2; i++) { const wy = ty + 12 + i * 16, ph = t * 1.6 + tl.c * 1.3 + tl.r * 0.7 + i * 2; ctx.beginPath(); ctx.moveTo(tx + 8 + Math.sin(ph) * 3, wy); ctx.quadraticCurveTo(tx + 14 + Math.sin(ph) * 3, wy - 3, tx + 20 + Math.sin(ph) * 3, wy); ctx.stroke(); }
      } else {
        ctx.fillStyle = rgb(c); rrect(ctx, tx + 1.5, ty + 1.5, T - 3, T - 3, 6); ctx.fill();
        ctx.fillStyle = rgb(lift(c, 30), 0.8); ctx.fillRect(tx + 5, ty + 2.2, T - 10, 1.6); ctx.fillRect(tx + 2.2, ty + 5, 1.6, T - 10);
        ctx.fillStyle = rgb(lift(c, -26), 0.7); ctx.fillRect(tx + 5, ty + T - 3.8, T - 10, 1.6);
        texture(ctx, tl, c, tx, ty, t, p);
        // a little ground detail per tile
        const h = hash(tl.c + p * 9, tl.r + 50);
        if (h < 0.5) {
          const dx = tx + 8 + h * 50 % 24, dy = ty + 10 + (h * 97 % 22);
          ctx.fillStyle = rgb(lift(c, h < 0.25 ? 26 : -24), 0.8);
          if (tl.region === 'jungle' || tl.region === 'bog') { for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(dx + j * 2.5, dy + 3); ctx.lineTo(dx + j * 2.5 + (j - 1) * 1.5, dy - 2); ctx.lineTo(dx + j * 2.5 + 1, dy + 3); ctx.fill(); } }
          else { ctx.beginPath(); ctx.ellipse(dx, dy, 2.6, 1.6, 0, 0, TAU); ctx.ellipse(dx + 6, dy + 4, 1.6, 1.1, 0, 0, TAU); ctx.fill(); }
        }
      }
    }
    ctx.restore();
    // board rim highlight
    ctx.strokeStyle = 'rgba(255,255,240,.28)'; ctx.lineWidth = 1.5; rrect(ctx, x0 + 0.75, BY + 0.75, BW - 1.5, BH - 1.5, 18); ctx.stroke();
  }

  // ---------------------------------------------------------------- roads & bridges
  function worldOfX(x) { return WORLDS[K.clamp(Math.floor(x / PW), 0, 3)]; }
  function drawRoad(ctx, pts, lit, t, future) {
    const W = worldOfX(pts[pts.length - 1][0]).road, fill = lit ? W.lit : W.dark, edge = lit ? W.litE : W.darkE;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.translate(0, 4); routePath(ctx, pts); ctx.strokeStyle = 'rgba(10,6,20,.28)'; ctx.lineWidth = 22; ctx.stroke(); ctx.translate(0, -4);
    if (future) ctx.setLineDash([10, 7]);
    routePath(ctx, pts); ctx.strokeStyle = rgb(edge); ctx.lineWidth = 20; ctx.stroke();
    routePath(ctx, pts); ctx.strokeStyle = rgb(fill); ctx.lineWidth = 15; ctx.stroke();
    ctx.translate(-1, -1.5); routePath(ctx, pts); ctx.strokeStyle = rgb(lift(fill, 30), 0.55); ctx.lineWidth = 4; ctx.stroke(); ctx.translate(1, 1.5);
    ctx.setLineDash([]);
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      routePath(ctx, pts); ctx.strokeStyle = 'rgba(255,220,120,.16)'; ctx.lineWidth = 26; ctx.stroke();
      ctx.setLineDash([3, 11]); ctx.lineDashOffset = -t * 22;
      routePath(ctx, pts); ctx.strokeStyle = 'rgba(255,236,150,.95)'; ctx.lineWidth = 4.5; ctx.stroke();
    } else {
      ctx.setLineDash([5, 9]); routePath(ctx, pts); ctx.strokeStyle = rgb(lift(fill, -40), future ? 0.35 : 0.55); ctx.lineWidth = 3.4; ctx.stroke();
    }
    ctx.restore();
  }
  // chevrons marching along the road towards the next page
  function exitArrows(ctx, x, y, t, dim) {
    for (let i = 0; i < 3; i++) {
      const ph = frac(t * 0.8 - i / 3), a = Math.sin(ph * PI) * (dim ? 0.5 : 0.95), cx = x - 14 + ph * 26;
      ctx.strokeStyle = dim ? `rgba(240,236,255,${a})` : `rgba(255,248,210,${a})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 3, y - 5); ctx.lineTo(cx + 2, y); ctx.lineTo(cx - 3, y + 5); ctx.stroke();
    }
  }
  function drawBridge(ctx, sx, y, t, broken) {
    const x0 = sx - 22, x1 = sx + 22;
    ctx.fillStyle = 'rgba(10,6,20,.3)'; ctx.fillRect(x0, y + 9, x1 - x0, 6);
    for (let i = 0; i < 9; i++) {
      const px = x0 + 1 + i * 5;
      if (broken && (i === 3 || i === 5 || i > 6)) {
        ctx.strokeStyle = 'rgba(230,226,255,.45)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, y - 9.5, 3.4, 19); ctx.setLineDash([]); continue;
      }
      const sag = Math.sin((i / 8) * PI) * 2;
      ctx.fillStyle = lg(ctx, px, 0, px + 4.4, 0, ['#d8a868', '#9a6a38']); rrect(ctx, px, y - 10 + sag, 4.4, 20, 1.2); ctx.fill();
      ctx.fillStyle = 'rgba(80,46,18,.5)'; ctx.fillRect(px + 3.4, y - 10 + sag, 1, 20);
    }
    for (const dy of [-12, 12]) {
      ctx.strokeStyle = broken ? 'rgba(200,170,120,.6)' : '#c8a06a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, y + dy - 5); ctx.quadraticCurveTo(sx, y + dy + 2, broken ? sx + 4 : x1, y + dy - (broken ? 1 : 5)); ctx.stroke();
      for (const px of broken ? [x0] : [x0, x1]) { ctx.fillStyle = lg(ctx, px - 2, 0, px + 2, 0, ['#b07a44', '#5e3a1a']); ctx.fillRect(px - 2, y + dy - 9, 4, 11); blob(ctx, px, y + dy - 9, 2.4, 1.6, [170, 120, 70]); }
    }
  }

  // ---------------------------------------------------------------- nodes
  const PANEL = {
    done:   { top: [[0, '#fff6c0'], [0.45, '#ffd14a'], [1, '#e2921a']], side: '#a8600e', num: '#7a3c06', glint: true },
    tried:  { top: [[0, '#fff0e0'], [0.45, '#ffb074'], [1, '#e86a36']], side: '#a43a1a', num: '#7a2408' },
    open:   { top: [[0, '#f4fdff'], [0.45, '#8ae4ff'], [1, '#3a9ad8']], side: '#20609a', num: '#103c6a' },
    locked: { top: [[0, '#c8c4d0'], [0.5, '#9a96a6'], [1, '#76727f']], side: '#4e4a5a', num: '#4a4656' },
  };
  function drawPanel(ctx, l, x, y, t) {
    let S = PANEL[l.state]; const hs = 17, depth = 6;
    if (l.state === 'locked') {
      const rc = REG[l.region].a, g = mix([150, 146, 162], rc, 0.68);
      S = { top: [[0, rgb(lift(g, 50))], [0.5, rgb(g)], [1, rgb(lift(g, -36))]], side: rgb(lift(g, -80)), num: rgb(lift(g, -95)) };
    }
    const bob = l.state === 'open' ? Math.sin(t * 3) * 1.5 : 0;
    K.shadow(ctx, x + 2, y + hs + 3, hs * 1.2, 5, 0.4);
    if (l.state === 'open' || l.state === 'tried') { const pu = 0.5 + 0.5 * Math.sin(t * 3.2 + l.id); K.glow(ctx, x, y, 34, l.state === 'open' ? [120, 220, 255] : [255, 160, 90], 0.25 + 0.2 * pu); }
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = S.side; rrect(ctx, x - hs, y - hs + depth, hs * 2, hs * 2, 8); ctx.fill();
    ctx.fillStyle = lg(ctx, x - hs, y - hs, x + hs * 0.6, y + hs, S.top); rrect(ctx, x - hs, y - hs, hs * 2, hs * 2, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; rrect(ctx, x - hs + 2.5, y - hs + 2.5, hs * 2 - 5, hs * 2 - 5, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rrect(ctx, x - hs + 4, y - hs + 3, hs * 2 - 8, 8, 4); ctx.fill();
    text(ctx, String(l.id), x, y + 1.5, l.id > 9 ? 17 : 19, S.num, 'rgba(255,255,255,.55)');
    if (S.glint) { const g = frac(t * 0.25 + l.id * 0.13); if (g < 0.15) { ctx.save(); rrect(ctx, x - hs, y - hs, hs * 2, hs * 2, 8); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.55)'; const gx = x - hs * 2 + g / 0.15 * hs * 4; poly(ctx, [[gx, y - hs], [gx + 7, y - hs], [gx - 3, y + hs], [gx - 10, y + hs]]); ctx.fill(); ctx.restore(); } }
    if (l.state === 'locked') { ctx.fillStyle = 'rgba(40,36,56,.25)'; rrect(ctx, x - hs, y - hs, hs * 2, hs * 2 + depth, 8); ctx.fill(); padlock(ctx, x + 12, y + 10, 0.85); }
    ctx.restore();
    if (l.state !== 'locked') stars(ctx, l, x, y + hs + depth + 7);
  }
  function stars(ctx, l, x, y) {
    ctx.fillStyle = 'rgba(30,18,30,.55)'; rrect(ctx, x - 21, y - 6.5, 42, 13, 6.5); ctx.fill();
    for (let j = 0; j < 3; j++) K.star(ctx, x + (j - 1) * 13, y - (j === 1 ? 1 : 0), 5.6, j < l.stars);
  }
  function advantage(ctx, l, x, y, t) {
    const by = y + Math.sin(t * 2.2 + l.id) * 1.2;
    K.glow(ctx, x, by, 18, [255, 210, 90], 0.3);
    K.badge(ctx, l.pilot, x, by, 11, '#ffcf3a');
    ctx.fillStyle = lg(ctx, 0, by + 6, 0, by + 16, ['#7ae05a', '#2e9a2a']); ctx.beginPath(); ctx.arc(x + 9, by + 8, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 6.5, by + 8); ctx.lineTo(x + 11.5, by + 8); ctx.moveTo(x + 9, by + 5.5); ctx.lineTo(x + 9, by + 10.5); ctx.stroke();
  }

  // ---------------------------------------------------------------- boss landmarks
  function flytrapHead(ctx, x, y, s, t, dir, ph) {
    const chomp = Math.max(0, Math.sin(t * 2.2 + ph)) * 0.25;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
    ctx.strokeStyle = '#2e6a20'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, 30); ctx.quadraticCurveTo(-8, 16, 0, 2); ctx.stroke();
    ctx.strokeStyle = '#6ab83e'; ctx.lineWidth = 2.6; ctx.stroke();
    leaf(ctx, 0, 22, 13, -2.6, [90, 170, 60], 0.3); leaf(ctx, 2, 18, 12, -0.3, [80, 160, 54], 0.3);
    for (const [sg, a] of [[-1, -0.35 - chomp], [1, 0.35 + chomp]]) {
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = rg(ctx, -2, sg * 4, 16, sg < 0 ? ['#b8f070', '#5aa83a', '#2e6a20'] : ['#a0e060', '#4a9a32', '#26601a']);
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(6, sg * 16, 18, sg * 3); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e83a4a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(7, sg * 8, 17, sg * 1.5); ctx.lineTo(17, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6e0'; for (let i = 0; i < 4; i++) { const tx = 4 + i * 3.6; poly(ctx, [[tx, sg * 1], [tx + 1.6, sg * -3], [tx + 3.2, sg * 1]]); ctx.fill(); }
      ctx.restore();
    }
    if (dir) { ctx.save(); ctx.rotate(-0.35 - chomp); K.eyes(ctx, 7, -9, 3, 2.3, '#ffcf3a', 0.5, 1); ctx.restore(); }
    ctx.restore();
  }
  function bossPlate(ctx, l, x, y, t, ringCol) {
    const open = l.state !== 'locked', r = BOSS_R;
    K.shadow(ctx, x + 3, y + r * 0.85, r * 1.3, r * 0.4, 0.45);
    if (open) { const pu = 0.5 + 0.5 * Math.sin(t * 3); K.glow(ctx, x, y, r * 2.2, [255, 210, 100], 0.3 + 0.25 * pu); }
    ctx.fillStyle = open ? '#9a5a10' : '#4a4658'; ctx.beginPath(); ctx.arc(x, y + 5, r, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, x - r * 0.4, y - r * 0.5, r * 1.4, open ? ['#fff4b0', '#f2b832', '#a8660e'] : ['#cfcad8', '#8a8698', '#55515f']); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    // studs round the rim
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; blob(ctx, x + Math.cos(a) * (r - 3.5), y + Math.sin(a) * (r - 3.5), 1.8, 1.8, open ? [255, 236, 170] : [200, 196, 210]); }
    K.badge(ctx, 'boss-' + l.boss, x, y, r - 7, ringCol);
    if (!open) { ctx.fillStyle = 'rgba(36,30,52,.5)'; ctx.beginPath(); ctx.arc(x, y, r - 7, 0, TAU); ctx.fill(); padlock(ctx, x + r * 0.62, y + r * 0.55, 1.05); }
    K.sheen(ctx, x, y, r, 0.4);
    // BOSS ribbon with the level number
    const ry = y - r - 4;
    ctx.fillStyle = open ? '#8a1a10' : '#3e3a4c';
    poly(ctx, [[x - 30, ry - 1], [x - 37, ry + 6], [x - 27, ry + 6]]); ctx.fill(); poly(ctx, [[x + 30, ry - 1], [x + 37, ry + 6], [x + 27, ry + 6]]); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, ry - 7, 0, ry + 6, open ? ['#ff6a4a', '#d0301e'] : ['#8a8698', '#5e5a6c']); rrect(ctx, x - 29, ry - 7, 58, 13, 4); ctx.fill();
    text(ctx, 'BOSS ' + l.id, x, ry - 0.5, 9.5, '#fff4dc', open ? '#7a1408' : '#3a3648');
    stars(ctx, l, x, y + r + 12);
  }
  function landmark9(ctx, l, x, y, t) {
    // Gobblebloom's lair: a vine arch over the boss plate, giant flytraps snapping on either side
    const R = 46;
    for (const d of [-1, 1]) { const px = x + d * R; K.shadow(ctx, px + 2, y + 20, 12, 4, 0.35); ctx.fillStyle = lg(ctx, px - 7, 0, px + 7, 0, ['#e2d2a0', '#a8946a', '#6e6040']); ctx.fillRect(px - 7, y - 30, 14, 50); ctx.fillStyle = lg(ctx, 0, y - 36, 0, y - 28, ['#f2e6c0', '#a8946a']); ctx.fillRect(px - 9, y - 36, 18, 7); ctx.fillStyle = 'rgba(80,70,40,.4)'; for (let i = 0; i < 4; i++) ctx.fillRect(px - 7, y - 22 + i * 11, 14, 1); }
    ctx.lineCap = 'round';
    for (const [w, c] of [[7, '#2a5a1c'], [4, '#5aa83a']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - R, y - 32); ctx.bezierCurveTo(x - R * 0.6, y - 72, x + R * 0.6, y - 72, x + R, y - 32); ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const u = i / 8, bx = (1 - u) ** 3 * (x - R) + 3 * u * (1 - u) ** 2 * (x - R * 0.6) + 3 * u * u * (1 - u) * (x + R * 0.6) + u ** 3 * (x + R), byy = (1 - u) ** 3 * (y - 32) + 3 * u * (1 - u) * (y - 72) + u ** 3 * (y - 32); leaf(ctx, bx, byy, 10 + (i % 3) * 2, (i % 2 ? -0.6 : -2.5) + Math.sin(t * 1.4 + i) * 0.1, i % 2 ? [90, 170, 60] : [120, 196, 72], 0.3); if (i % 3 === 1) blob(ctx, bx, byy - 3, 3.4, 3.4, [255, 90, 120]); }
    for (const d of [-1, 1]) { ctx.strokeStyle = '#3a7a24'; ctx.lineWidth = 2; ctx.beginPath(); const sw = Math.sin(t * 1.2 + d) * 2; ctx.moveTo(x + d * R * 0.5, y - 60); ctx.quadraticCurveTo(x + d * R * 0.55 + sw, y - 40, x + d * R * 0.5 + sw * 1.5, y - 24); ctx.stroke(); leaf(ctx, x + d * R * 0.5 + sw * 1.5, y - 24, 7, 1.6, [96, 176, 64], 0.35); }
    flytrapHead(ctx, x - 62, y + 2, 1.05, t, -1, 0); flytrapHead(ctx, x + 62, y + 2, 1.05, t, 1, 1.7);
  }
  function landmark15(ctx, l, x, y, t) {
    // the Geode King's crystal cave: a basalt mound with a glowing mouth and amethyst spires all round
    K.shadow(ctx, x + 4, y + 28, 70, 14, 0.4);
    ctx.fillStyle = lg(ctx, x - 60, y - 70, x + 60, y + 30, ['#8a8ec8', '#4e5290', '#262858']);
    ctx.beginPath(); ctx.moveTo(x - 62, y + 26); ctx.quadraticCurveTo(x - 70, y - 30, x - 30, y - 56); ctx.quadraticCurveTo(x, y - 72, x + 32, y - 56); ctx.quadraticCurveTo(x + 72, y - 30, x + 62, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(190,200,255,.35)'; ctx.beginPath(); ctx.moveTo(x - 52, y - 10); ctx.quadraticCurveTo(x - 56, y - 40, x - 26, y - 52); ctx.quadraticCurveTo(x - 46, y - 34, x - 46, y - 8); ctx.fill();
    ctx.fillStyle = rg(ctx, x, y - 4, 44, ['#ffe6ff', '#c060e8', '#401a6a']); ctx.beginPath(); ctx.ellipse(x, y - 2, 40, 40, 0, PI, 0); ctx.lineTo(x + 40, y + 20); ctx.lineTo(x - 40, y + 20); ctx.closePath(); ctx.fill();
    K.glow(ctx, x, y - 6, 60, [220, 120, 255], 0.25 + 0.1 * Math.sin(t * 2));
    [[-56, 10, 30, -0.5], [-44, -30, 26, -0.3], [-20, -60, 24, -0.1], [8, -66, 30, 0.1], [36, -44, 26, 0.35], [56, 0, 30, 0.5], [-66, 22, 18, -0.7], [68, 22, 18, 0.7]].forEach(([dx, dy, h, a], i) => {
      ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(a); const w = 5 + h * 0.12;
      ctx.fillStyle = lg(ctx, -w, 0, w, 0, i % 2 ? ['#ffd8ff', '#d070f0', '#6a2098'] : ['#f0f0ff', '#a0a8ff', '#4a4aa8']); poly(ctx, [[-w, 4], [-w, -h * 0.72], [0, -h], [w, -h * 0.72], [w, 4]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; poly(ctx, [[-w, 4], [-w, -h * 0.72], [0, -h], [0, 4]]); ctx.fill();
      ctx.restore();
    });
    const tw = frac(t * 0.6); K.glow(ctx, x + 8, y - 90 + tw * 4, 10, [255, 230, 255], 0.5 * Math.sin(tw * PI));
  }
  function landmark20(ctx, l, x, y, t) {
    // the Bellows Drake's volcano, smoking, lava running down, behind a dragon-skull arena
    const vy = y - 18;
    ctx.fillStyle = lg(ctx, x - 80, vy - 80, x + 80, vy + 30, ['#9a5a48', '#5a2a22', '#2a100c']);
    ctx.beginPath(); ctx.moveTo(x - 84, vy + 34); ctx.quadraticCurveTo(x - 50, vy - 20, x - 22, vy - 76); ctx.lineTo(x + 22, vy - 76); ctx.quadraticCurveTo(x + 50, vy - 20, x + 84, vy + 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,150,.18)'; ctx.beginPath(); ctx.moveTo(x - 70, vy + 30); ctx.quadraticCurveTo(x - 42, vy - 20, x - 22, vy - 74); ctx.lineTo(x - 12, vy - 74); ctx.quadraticCurveTo(x - 34, vy - 20, x - 52, vy + 30); ctx.fill();
    ctx.fillStyle = rg(ctx, x, vy - 76, 24, ['#fff6b0', '#ff9a2a', '#c02a0a']); ctx.beginPath(); ctx.ellipse(x, vy - 76, 22, 6, 0, 0, TAU); ctx.fill();
    K.glow(ctx, x, vy - 80, 50, [255, 120, 40], 0.4 + 0.15 * Math.sin(t * 3));
    for (const [dx, len, ph] of [[-12, 54, 0], [10, 40, 1.3], [2, 66, 2.1]]) {
      ctx.strokeStyle = lg(ctx, 0, vy - 74, 0, vy - 74 + len, ['#ffe080', '#ff7a20', 'rgba(200,40,10,.2)']); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + dx, vy - 74); ctx.quadraticCurveTo(x + dx * 2.2, vy - 74 + len * 0.5, x + dx * 2.6 + Math.sin(ph) * 4, vy - 74 + len); ctx.stroke();
      const g = frac(t * 0.5 + ph * 0.3); ctx.fillStyle = 'rgba(255,250,200,.9)'; ctx.beginPath(); ctx.arc(x + dx + (dx * 1.6) * g, vy - 74 + len * g, 1.8, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 6; i++) { const ph = frac(t * 0.16 + i / 6), sx = x + Math.sin(ph * 4 + i) * 10 + ph * 26; ctx.fillStyle = `rgba(${110 - ph * 30},${90 - ph * 30},${96 - ph * 20},${0.55 * (1 - ph)})`; ctx.beginPath(); ctx.arc(sx, vy - 86 - ph * 70, 8 + ph * 16, 0, TAU); ctx.fill(); }
    // skull horns flanking
    for (const d of [-1, 1]) {
      ctx.fillStyle = lg(ctx, x + d * 40, y - 40, x + d * 66, y + 20, ['#fff0d8', '#d0b08a', '#7a5a3a']);
      ctx.beginPath(); ctx.moveTo(x + d * 34, y + 24); ctx.quadraticCurveTo(x + d * 66, y + 10, x + d * 62, y - 34); ctx.quadraticCurveTo(x + d * 56, y - 6, x + d * 40, y + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,50,.6)'; ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + d * (38 + i * 5), y + 16 - i * 8); ctx.lineTo(x + d * (44 + i * 5), y + 12 - i * 9); ctx.stroke(); }
    }
  }
  const LANDMARK = { 9: landmark9, 15: landmark15, 20: landmark20 };

  // ---------------------------------------------------------------- page 4: coming soon
  function drawFuture(ctx, P, t) {
    const x0 = O(3);
    // ghost sockets where new level panels will go, dashed and fogged
    const ghosts = [[90, 420], [270, 420], [180, 540]];
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const pts of [[[180, 330], [180, 380], [90, 380], [90, 420]], [[180, 380], [270, 380], [270, 420]], [[90, 420], [90, 540], [180, 540]], [[270, 420], [270, 540], [180, 540]]]) {
      routePath(ctx, pts.map(([x, y]) => [x0 + x, y])); ctx.setLineDash([3, 9]); ctx.strokeStyle = 'rgba(230,226,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    ghosts.forEach(([gx, gy], i) => {
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(240,236,255,.5)'; ctx.lineWidth = 1.6; rrect(ctx, x0 + gx - 17, gy - 17, 34, 34, 8); ctx.stroke(); ctx.restore();
      ctx.fillStyle = 'rgba(240,236,255,.08)'; rrect(ctx, x0 + gx - 17, gy - 17, 34, 34, 8); ctx.fill();
      text(ctx, '?', x0 + gx, gy + 1 + Math.sin(t * 2 + i) * 1.5, 18, 'rgba(250,246,255,.7)');
    });
    // a scaffold crane building the next world
    const cx = x0 + 300, cy = 600;
    ctx.strokeStyle = '#d8a040'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 70); ctx.lineTo(cx - 60, cy - 70); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx, cy - 12); ctx.lineTo(cx + 8, cy); ctx.stroke();
    ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - 4, cy - i * 12); ctx.lineTo(cx + 4, cy - i * 12 - 12); ctx.stroke(); }
    const sw = Math.sin(t * 1.3) * 4, hx = cx - 48 + sw;
    ctx.strokeStyle = 'rgba(240,230,220,.7)'; ctx.beginPath(); ctx.moveTo(cx - 48, cy - 70); ctx.lineTo(hx, cy - 34); ctx.stroke();
    ctx.fillStyle = lg(ctx, hx - 10, cy - 34, hx + 10, cy - 18, ['#c8c4d8', '#7a768e']); rrect(ctx, hx - 10, cy - 34, 20, 18, 4); ctx.fill();
    text(ctx, '21', hx, cy - 25, 10, '#4a4660');
    // striped barrier
    ctx.save(); rrect(ctx, x0 + 40, 600, 70, 10, 3); ctx.clip(); for (let i = -2; i < 10; i++) { ctx.fillStyle = i % 2 ? '#f4c030' : '#3a3448'; poly(ctx, [[x0 + 40 + i * 10, 600], [x0 + 50 + i * 10, 600], [x0 + 40 + i * 10, 610], [x0 + 30 + i * 10, 610]]); ctx.fill(); } ctx.restore();
    for (const px of [48, 102]) { ctx.fillStyle = '#5a5470'; ctx.fillRect(x0 + px - 1.5, 610, 3, 14); }
    // the locked gate at the end of the road
    const gx = x0 + 180, gy = 300;
    K.shadow(ctx, gx + 3, gy + 26, 60, 10, 0.4);
    ctx.fillStyle = lg(ctx, gx - 56, gy - 70, gx + 56, gy + 24, ['#b4b0c8', '#7a7690', '#4a4660']);
    ctx.beginPath(); ctx.moveTo(gx - 56, gy + 24); ctx.lineTo(gx - 56, gy - 34); ctx.quadraticCurveTo(gx - 56, gy - 76, gx, gy - 78); ctx.quadraticCurveTo(gx + 56, gy - 76, gx + 56, gy - 34); ctx.lineTo(gx + 56, gy + 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,56,80,.45)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(gx - 56, gy + 14 - i * 14); ctx.lineTo(gx + 56, gy + 14 - i * 14); ctx.stroke(); }
    ctx.fillStyle = lg(ctx, gx - 34, 0, gx + 34, 0, ['#7a4e2a', '#a06a3a', '#6a4222']); ctx.beginPath(); ctx.moveTo(gx - 34, gy + 24); ctx.lineTo(gx - 34, gy - 26); ctx.quadraticCurveTo(gx, gy - 58, gx + 34, gy - 26); ctx.lineTo(gx + 34, gy + 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(50,28,12,.6)'; ctx.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(gx + i * 13, gy + 24); ctx.lineTo(gx + i * 13, gy - 40 + Math.abs(i) * 6); ctx.stroke(); }
    ctx.strokeStyle = '#4a4458'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gx - 34, gy - 6); ctx.lineTo(gx + 34, gy - 6); ctx.moveTo(gx - 34, gy + 12); ctx.lineTo(gx + 34, gy + 12); ctx.stroke();
    padlock(ctx, gx, gy + 2, 2.1 + Math.sin(t * 2) * 0.05);
    for (const d of [-1, 1]) { const fy = gy - 66 + 0, tx = gx + d * 50; K.glow(ctx, tx, fy - 6, 18, [255, 180, 80], 0.4 + 0.1 * Math.sin(t * 9 + d)); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(tx - 1.5, fy - 4, 3, 12); ctx.fillStyle = rg(ctx, tx, fy - 7, 5, ['#fff6b0', '#ff9a2a', 'rgba(220,60,10,0)']); ctx.beginPath(); ctx.ellipse(tx, fy - 7 + Math.sin(t * 12 + d) * 0.6, 3.4, 6, 0, 0, TAU); ctx.fill(); }
    // MORE LEVELS COMING banner
    const by = 470 + Math.sin(t * 1.2) * 2;
    ctx.fillStyle = 'rgba(10,6,20,.28)'; rrect(ctx, x0 + 46, by - 15, 268, 34, 10); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, by - 18, 0, by + 14, ['#fff4d6', '#e8d0a0']); rrect(ctx, x0 + 44, by - 18, 272, 32, 10); ctx.fill();
    ctx.fillStyle = '#c8a870'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x0 + 180 + d * 136, by - 2, 8, 17, 0, 0, TAU); ctx.fill(); }
    text(ctx, FUTURE.label.toUpperCase(), x0 + 180, by - 2, 15, '#6a4a7a', 'rgba(255,255,255,.7)');
    // drifting fog over the page
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, PW, MH); ctx.clip();
    for (let i = 0; i < 9; i++) { const fx = x0 + frac(hash(i, 3) + t * 0.012 * (1 + i % 3)) * 520 - 80, fy = 130 + hash(i, 5) * 520; ctx.fillStyle = rg(ctx, fx, fy, 90, ['rgba(220,216,240,.30)', 'rgba(220,216,240,0)']); ctx.beginPath(); ctx.ellipse(fx, fy, 90, 40, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- HUD
  function header(ctx, P, t) {
    const { w, p } = P, x0 = O(p) + 18, y0 = 18, ww = PW - 36, hh = 58;
    ctx.fillStyle = 'rgba(10,6,20,.3)'; rrect(ctx, x0 + 2, y0 + 6, ww, hh, 18); ctx.fill();
    ctx.fillStyle = rgb(w.hudE); rrect(ctx, x0, y0 + 3, ww, hh, 18); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, y0, 0, y0 + hh, [lift(w.hud[0], 20), w.hud[0], w.hud[1]]); rrect(ctx, x0, y0, ww, hh, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; rrect(ctx, x0 + 6, y0 + 4, ww - 12, hh * 0.4, 12); ctx.fill();
    // world number emblem
    const ex = x0 + 32, ey = y0 + hh / 2;
    ctx.fillStyle = rgb(lift(w.hudE, -10)); ctx.beginPath(); ctx.arc(ex, ey + 2.5, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, ex - 7, ey - 9, 28, ['#fff8d0', '#ffd24a', '#d8901a']); ctx.beginPath(); ctx.arc(ex, ey, 22, 0, TAU); ctx.fill();
    K.sheen(ctx, ex, ey, 22, 0.5);
    if (p === 3) padlock(ctx, ex, ey + 1, 1.5); else text(ctx, String(w.n), ex, ey + 2, 26, '#7a3c06', 'rgba(255,255,255,.6)');
    text(ctx, p === 3 ? 'WORLD 4' : 'WORLD ' + w.n, x0 + 64, y0 + 21, 13, 'rgba(255,255,255,.85)', rgb(w.hudE, 0.8), 'left');
    text(ctx, p === 3 ? '???' : w.name, x0 + 64, y0 + 40, 22, '#ffffff', rgb(w.hudE), 'left');
    // stars collected in this world
    const got = w.ids.reduce((a, id) => a + LEVEL_BY[id].stars, 0), max = w.ids.length * 3;
    const px = x0 + ww - 92, py = y0 + hh / 2 - 13;
    ctx.fillStyle = 'rgba(20,10,30,.35)'; rrect(ctx, px, py, 80, 26, 13); ctx.fill();
    if (p === 3) text(ctx, 'SOON', px + 40, py + 13.5, 13, '#fff4dc');
    else { K.star(ctx, px + 15, py + 13, 9, true); text(ctx, `${got}/${max}`, px + 50, py + 14, 14, '#fff4dc', 'rgba(0,0,0,.25)'); }
    text(ctx, w.sub, O(p) + PW / 2, y0 + hh + 12, 9.5, 'rgba(255,255,255,.75)', 'rgba(0,0,0,.25)');
  }
  function dots(ctx, cxp, y, active, frac01) {
    // four page dots; a gold pill slides between them as the page swipes
    ctx.fillStyle = 'rgba(15,8,25,.4)'; rrect(ctx, cxp - 52, y - 11, 104, 22, 11); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const dx = cxp + (i - 1.5) * 22;
      if (i === 3) { padlock(ctx, dx, y + 0.5, 0.62); continue; }
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(dx, y, 4, 0, TAU); ctx.fill();
    }
    const ax = cxp + (frac01 - 1.5) * 22;
    ctx.fillStyle = lg(ctx, 0, y - 6, 0, y + 6, ['#fff6b0', '#ffc834', '#e08a12']); rrect(ctx, ax - 9, y - 5.5, 18, 11, 5.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; rrect(ctx, ax - 6, y - 4, 12, 3, 1.5); ctx.fill();
  }
  function youAreHere(ctx, x, y, t) {
    const bob = Math.sin(t * 2.4) * 3;
    // a pulsing ring on the ground and the rocket hovering beside the boss plate
    for (let i = 0; i < 2; i++) { const ph = frac(t * 0.7 + i * 0.5); ctx.strokeStyle = `rgba(255,236,150,${0.7 * (1 - ph)})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(x, y + BOSS_R * 0.7, BOSS_R * (1 + ph * 0.9), BOSS_R * (0.36 + ph * 0.3), 0, 0, TAU); ctx.stroke(); }
    const rx = x + 50, ry = y + 50 + bob;
    K.shadow(ctx, rx + 2, y + 96, 12, 4, 0.35 - bob * 0.02);
    K.rocket(ctx, rx, ry, 0.82, t);
    // the tag
    const tx = rx, ty = ry - 34;
    ctx.fillStyle = 'rgba(10,6,20,.3)'; rrect(ctx, tx - 22, ty - 8, 44, 16, 8); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, ty - 10, 0, ty + 6, ['#ffffff', '#ffe9a0']); rrect(ctx, tx - 22, ty - 10, 44, 16, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 4, ty + 5); ctx.lineTo(tx, ty + 10); ctx.lineTo(tx + 4, ty + 5); ctx.fill();
    text(ctx, 'YOU', tx, ty - 1.5, 10, '#8a3a08');
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, t, view) {
    const vis = PAGES.filter(P => O(P.p) + PW > view.x + 0.5 && O(P.p) < view.x + view.w - 0.5);
    ctx.save(); ctx.lineJoin = 'round';
    for (const P of vis) { drawBackdrop(ctx, P, t); drawBoard(ctx, P, t); }
    // roads (dark first, lit on top) and the bridges over the gaps
    const inView = pts => { const xs = pts.map(q => q[0]); return Math.max(...xs) > view.x - 30 && Math.min(...xs) < view.x + view.w + 30; };
    for (const r of ROADS) if (!r.lit && inView(r.pts)) drawRoad(ctx, r.pts, false, t);
    if (inView(FUT_ROUTE)) drawRoad(ctx, FUT_ROUTE, false, t, true);
    for (const r of ROADS) if (r.lit && inView(r.pts)) drawRoad(ctx, r.pts, true, t);
    for (const [sx, y, br] of [[PW, 165], [PW * 2, 566], [PW * 3, 196, true]]) if (sx > view.x - 60 && sx < view.x + view.w + 60) { drawBridge(ctx, sx, y, t, br); exitArrows(ctx, sx - 40, y, t, br); }
    for (const P of vis) {
      if (P.p === 3) drawFuture(ctx, P, t);
      // boss landmarks behind everything standing on the page
      for (const id of P.w.ids) if (LANDMARK[id]) LANDMARK[id](ctx, LEVEL_BY[id], ...POS[id], t);
      for (const pr of P.props) PROP[pr.kind](ctx, pr.x, pr.y, pr.s, t, pr.seed, pr);
      for (const id of P.w.ids) {
        const l = LEVEL_BY[id], [x, y] = POS[id];
        if (l.boss) bossPlate(ctx, l, x, y, t, l.state === 'locked' ? '#a8a4b4' : '#ffe27a');
        else drawPanel(ctx, l, x, y, t);
      }
      for (const id of P.w.ids) {
        const l = LEVEL_BY[id], [x, y] = POS[id];
        if (l.state === 'open' || l.state === 'tried' || l.current) advantage(ctx, l, x + (l.boss ? -34 : 20), y - (l.boss ? 4 : 19), t);
        if (l.current) youAreHere(ctx, x, y, t);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(O(P.p), 0, PW, MH); ctx.clip();
      ctx.translate(O(P.p), 0); K.motes(ctx, PW, MH, t, P.w.mote[0], P.w.mote[1], 16, 11 + P.p); ctx.restore();
      header(ctx, P, t);
    }
    // page dots: fixed to the phone screen while touring, one set per page in the overview
    if (view.w <= 400) {
      const f = K.clamp(view.x / PW, 0, 3);
      dots(ctx, view.x + view.w / 2, 690, Math.round(f), f);
      // swipe chevrons at the screen edges
      const a = 0.35 + 0.25 * Math.sin(t * 3);
      for (const d of [-1, 1]) {
        if ((d < 0 && f < 0.05) || (d > 0 && f > 2.95)) continue;
        const ex = view.x + (d < 0 ? 10 : view.w - 10) + Math.sin(t * 3) * d * 1.5;
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - d * 4, 682); ctx.lineTo(ex + d * 2, 690); ctx.lineTo(ex - d * 4, 698); ctx.stroke();
      }
    } else for (const P of vis) dots(ctx, O(P.p) + PW / 2, 690, P.p, P.p);
    ctx.restore();
  }

  // camera: rest on World 1 (the player's page), then swipe through 2, 3 and the locked 4, and back
  const KEYS = [[0, 0], [6, 0], [6.9, 1], [11, 1], [11.9, 2], [16, 2], [16.9, 3], [19.6, 3], [21, 0]], LOOP = 21;
  function camera(t) {
    const u = ((t % LOOP) + LOOP) % LOOP;
    for (let i = 0; i + 1 < KEYS.length; i++) {
      const [t0, p0] = KEYS[i], [t1, p1] = KEYS[i + 1];
      if (u >= t0 && u <= t1) return { x: K.lerp(p0, p1, ease((u - t0) / (t1 - t0))) * PW, y: 0 };
    }
    return { x: 0, y: 0 };
  }

  PV.maps.pages = { W: PW * 4, H: MH, camera, draw };
})();
