// Concept 3, "Down the Shaft": a side-on cut-away of the ground, like an ant farm. The jungle surface on top,
// then chambers (levels) linked by dug tunnels (paths) through the earth's layers down to the magma core.
(() => {
  const W = 360, H = 2860, TAU = Math.PI * 2;
  const FONT = '"Arial Rounded MT Bold","Trebuchet MS",sans-serif';
  const by = LEVEL_BY;
  const POS = {
    1: [112, 222], 2: [240, 404], 3: [168, 556],
    4: [72, 706], 5: [128, 836], 6: [70, 968],
    7: [282, 724], 8: [258, 900],
    9: [180, 1122], 10: [192, 1302],
    11: [66, 1468], 12: [118, 1626], 13: [278, 1566],
    14: [180, 1800], 15: [180, 1980],
    16: [62, 2180], 17: [180, 2214], 18: [298, 2180],
    19: [180, 2390], 20: [180, 2580],
  };
  // region palettes: cavern interior top/bottom (calm mid values), rim light, and the rock around it
  const RG = {
    jungle: { a: [112, 152, 104], b: [50, 86, 60], rim: [210, 250, 130] },
    temple: { a: [140, 138, 104], b: [74, 74, 56], rim: [255, 214, 110] },
    bog: { a: [120, 136, 64], b: [52, 68, 30], rim: [205, 255, 90] },
    lair: { a: [76, 118, 74], b: [30, 56, 36], rim: [190, 255, 120] },
    grotto: { a: [82, 70, 132], b: [36, 30, 78], rim: [120, 255, 240] },
    lagoon: { a: [86, 156, 156], b: [28, 82, 98], rim: [140, 255, 230] },
    mine: { a: [146, 114, 72], b: [70, 52, 34], rim: [255, 196, 96] },
    caves: { a: [90, 94, 156], b: [40, 42, 92], rim: [160, 220, 255] },
    geode: { a: [122, 82, 156], b: [56, 34, 88], rim: [255, 160, 240] },
    crystal: { a: [146, 94, 176], b: [70, 40, 104], rim: [255, 168, 244] },
    frost: { a: [176, 206, 228], b: [92, 132, 172], rim: [235, 252, 255] },
    storm: { a: [92, 86, 164], b: [38, 34, 92], rim: [196, 166, 255] },
    magma: { a: [150, 70, 42], b: [66, 24, 16], rim: [255, 146, 54] },
    core: { a: [186, 82, 34], b: [84, 24, 12], rim: [255, 200, 80] },
  };
  // the caverns (dug chambers holding the levels)
  const CAV = [
    { k: 'jungle', x: 236, y: 396, rx: 66, ry: 42, s: 1, lv: [2] },
    { k: 'jungle', x: 172, y: 546, rx: 92, ry: 50, s: 2, lv: [3], fork: 1 },
    { k: 'temple', x: 98, y: 836, rx: 82, ry: 186, s: 3, lv: [4, 5, 6], shape: 'hall' },
    { k: 'bog', x: 270, y: 818, rx: 76, ry: 140, s: 4, lv: [7, 8] },
    { k: 'lair', x: 180, y: 1112, rx: 140, ry: 84, s: 5, lv: [9] },
    { k: 'grotto', x: 190, y: 1294, rx: 100, ry: 56, s: 6, lv: [10] },
    { k: 'lagoon', x: 100, y: 1550, rx: 88, ry: 132, s: 7, lv: [11, 12] },
    { k: 'mine', x: 278, y: 1556, rx: 50, ry: 150, s: 8, lv: [13], shape: 'shaft' },
    { k: 'caves', x: 180, y: 1792, rx: 108, ry: 60, s: 9, lv: [14] },
    { k: 'geode', x: 180, y: 1980, rx: 82, ry: 82, s: 10, lv: [15], round: 1 },
    { k: 'crystal', x: 62, y: 2172, rx: 56, ry: 60, s: 11, lv: [16] },
    { k: 'frost', x: 180, y: 2206, rx: 54, ry: 58, s: 12, lv: [17] },
    { k: 'storm', x: 298, y: 2172, rx: 56, ry: 60, s: 13, lv: [18] },
    { k: 'magma', x: 180, y: 2384, rx: 128, ry: 64, s: 14, lv: [19] },
    { k: 'core', x: 180, y: 2572, rx: 116, ry: 112, s: 15, lv: [20], round: 1 },
  ];
  for (const c of CAV) c.locked = c.lv.every(id => by[id].state === 'locked');
  const regOf = id => { const c = CAV.find(c => c.lv.includes(id)); return c ? c.k : 'jungle'; };
  // earth layers (top y of each band, rock colour top/bottom)
  const BANDS = [
    { y: 250, a: [104, 72, 44], b: [72, 48, 30], k: 'soil' },
    { y: 640, a: [80, 70, 50], b: [58, 50, 36], k: 'clay' },
    { y: 1020, a: [62, 48, 34], b: [44, 34, 26], k: 'loam' },
    { y: 1214, a: [60, 44, 64], b: [40, 30, 48], k: 'myc' },
    { y: 1376, a: [70, 62, 56], b: [50, 44, 42], k: 'rock' },
    { y: 1708, a: [48, 50, 80], b: [32, 34, 58], k: 'basalt' },
    { y: 2072, a: [54, 46, 80], b: [36, 30, 58], k: 'cold' },
    { y: 2292, a: [74, 36, 26], b: [38, 14, 10], k: 'hot' },
  ];
  const bandWave = (i, x) => i === 0 ? 0 : Math.sin(x * 0.03 + i * 1.7) * 7 + Math.sin(x * 0.011 + i) * 9;

  // ---------- small helpers ----------
  const rgb = K.rgb, lg = K.lg, rg = K.rg, lift = K.lift, mix = K.mix;
  const bz = (p, u) => { const v = 1 - u; return [0, 1].map(i => v * v * v * p[0][i] + 3 * v * v * u * p[1][i] + 3 * v * u * u * p[2][i] + u * u * u * p[3][i]); };
  const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  function text(ctx, s, x, y, size, fill, edge, align = 'center') {
    ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(2, size * 0.28); ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }
  function pill(ctx, x, y, w, h, top, bot, edge) {
    ctx.fillStyle = lg(ctx, 0, y - h / 2, 0, y + h / 2, [top, bot]);
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  function leaf(ctx, x, y, len, ang, col, wid = 0.36) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = lg(ctx, 0, -len * wid, 0, len * wid, [rgb(lift(col, 40)), rgb(col), rgb(lift(col, -40))]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -len * wid, len, 0); ctx.quadraticCurveTo(len * 0.45, len * wid, 0, 0); ctx.fill();
    ctx.strokeStyle = rgb(lift(col, -55), 0.8); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
    ctx.restore();
  }
  // blob outline of a cavern (flatter floor, as in a side-on dig)
  function cavPath(ctx, c, grow = 0) {
    ctx.beginPath();
    if (c.shape === 'hall') {   // a built stone hall: straight walls, stepped corners
      const x0 = c.x - c.rx - grow, x1 = c.x + c.rx + grow, y0 = c.y - c.ry - grow, y1 = c.y + c.ry + grow, s = 14;
      ctx.moveTo(x0 + s, y0); ctx.lineTo(x1 - s, y0); ctx.lineTo(x1 - s, y0 + s * 0.6); ctx.lineTo(x1, y0 + s * 0.6);
      ctx.lineTo(x1, y1 - s * 0.6); ctx.lineTo(x1 - s, y1 - s * 0.6); ctx.lineTo(x1 - s, y1); ctx.lineTo(x0 + s, y1);
      ctx.lineTo(x0 + s, y1 - s * 0.6); ctx.lineTo(x0, y1 - s * 0.6); ctx.lineTo(x0, y0 + s * 0.6); ctx.lineTo(x0 + s, y0 + s * 0.6); ctx.closePath();
      return;
    }
    if (c.shape === 'shaft') {
      const n = 30;
      for (let i = 0; i <= n; i++) { const y = c.y - c.ry + (2 * c.ry * i) / n; ctx.lineTo(c.x - c.rx - grow + Math.sin(i * 1.9 + c.s) * 3, y); }
      for (let i = n; i >= 0; i--) { const y = c.y - c.ry + (2 * c.ry * i) / n; ctx.lineTo(c.x + c.rx + grow + Math.sin(i * 2.3 + c.s) * 3, y); }
      ctx.closePath(); return;
    }
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, sn = Math.sin(a);
      const r = 1 + (c.round ? 0.025 : 0.06) * Math.sin(a * 3 + c.s) + 0.035 * Math.sin(a * 5 + c.s * 2) + 0.02 * Math.sin(a * 11 + c.s * 3);
      const fl = !c.round && sn > 0 ? 1 - 0.18 * sn * sn : 1;
      ctx.lineTo(c.x + Math.cos(a) * (c.rx + grow) * r, c.y + sn * (c.ry + grow) * r * fl);
    }
    ctx.closePath();
  }
  // the tunnels: cubic curves between level positions
  const CTRL = {
    '1-2': [[150, 236], [212, 252], [214, 340]],
    '3-4': [[120, 600], [72, 630], [72, 676]],
    '3-7': [[226, 590], [282, 640], [282, 690]],
  };
  const TUN = PATHS.map(([a, b], i) => {
    const p0 = POS[a], p3 = POS[b], key = a + '-' + b;
    let pts;
    if (CTRL[key]) pts = key === '1-2' ? [p0, CTRL[key][0], CTRL[key][1], p3] : [p0, CTRL[key][1], CTRL[key][2], p3];
    else { const dy = p3[1] - p0[1]; pts = [p0, [p0[0] + (p3[0] - p0[0]) * 0.1, p0[1] + dy * 0.5], [p3[0] - (p3[0] - p0[0]) * 0.1, p3[1] - dy * 0.5], p3]; }
    return { a, b, pts, lit: PATH_STATE[i] === 'lit', ra: regOf(a), rb: regOf(b) };
  });
  const DIRT = [118, 88, 62];
  const tunPath = (ctx, T) => { const p = T.pts; ctx.beginPath(); ctx.moveTo(...p[0]); ctx.bezierCurveTo(...p[1], ...p[2], ...p[3]); };
  const tunBox = T => { const xs = T.pts.map(p => p[1]); return [Math.min(...xs) - 30, Math.max(...xs) + 30]; };

  // ---------- the earth ----------
  function drawEarth(ctx, v, t) {
    const y0 = Math.max(240, v.y - 20), y1 = v.y + v.h + 20;
    for (let i = 0; i < BANDS.length; i++) {
      const B = BANDS[i], top = B.y, bot = i + 1 < BANDS.length ? BANDS[i + 1].y : H + 20;
      if (bot + 20 < y0 || top - 20 > y1) continue;
      ctx.fillStyle = lg(ctx, 0, top - 10, 0, bot + 10, [B.a, B.b]);
      ctx.beginPath(); ctx.moveTo(-2, top);
      for (let x = -2; x <= W + 6; x += 8) ctx.lineTo(x, top + bandWave(i, x));
      ctx.lineTo(W + 2, bot + 30); ctx.lineTo(-2, bot + 30); ctx.fill();
      // sediment stripes
      const r = K.rand(i * 31 + 7);
      for (let j = 0; j < 4; j++) {
        const sy = top + (bot - top) * (0.2 + j * 0.2 + r() * 0.08), ph = r() * 10, th = 6 + r() * 14;
        ctx.fillStyle = rgb(j % 2 ? lift(B.a, 10) : lift(B.b, -8), 0.35);
        ctx.beginPath(); ctx.moveTo(-2, sy);
        for (let x = -2; x <= W + 6; x += 10) ctx.lineTo(x, sy + Math.sin(x * 0.02 + ph) * 6 + Math.sin(x * 0.047 + ph * 2) * 3);
        for (let x = W + 6; x >= -2; x -= 10) ctx.lineTo(x, sy + th + Math.sin(x * 0.021 + ph + 1) * 5);
        ctx.fill();
      }
      // band seam: a lighter lip and a dark shadow under it
      if (i > 0) {
        ctx.lineWidth = 3; ctx.strokeStyle = rgb(lift(B.a, 26), 0.6); ctx.beginPath();
        for (let x = -2; x <= W + 6; x += 8) ctx.lineTo(x, top + bandWave(i, x) + 1); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = rgb(lift(BANDS[i - 1].b, -30), 0.7); ctx.beginPath();
        for (let x = -2; x <= W + 6; x += 8) ctx.lineTo(x, top + bandWave(i, x) - 1.5); ctx.stroke();
      }
      bandDetail(ctx, B, i, top, bot, y0, y1, t);
    }
  }
  function pebble(ctx, x, y, rx, ry, col, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = rg(ctx, -rx * 0.35, -ry * 0.4, Math.max(rx, ry) * 1.3, [rgb(lift(col, 40)), rgb(col), rgb(lift(col, -35))]);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(lift(col, -45), 0.8); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(0.8, ry * 0.25); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.62, ry * 0.55, 0, 3.6, 4.6); ctx.stroke();
    ctx.restore();
  }
  function bandDetail(ctx, B, i, top, bot, y0, y1, t) {
    const r = K.rand(i * 97 + 3), n = Math.round((bot - top) / 14);
    for (let j = 0; j < n; j++) {   // pebbles and stones scattered through every layer
      const x = r() * W, y = top + 10 + r() * (bot - top - 10), s = 1.5 + r() * r() * 7, rot = r() * 3;
      if (y < y0 - 10 || y > y1 + 10) continue;
      pebble(ctx, x, y, s * 1.3, s * 0.85, lift(B.a, 18 + r() * 20), rot);
    }
    const R = K.rand(i * 13 + 99);
    if (B.k === 'soil') {   // roots growing down from the surface, with root hairs
      for (let j = 0; j < 9; j++) {
        const x = 10 + j * 42 + R() * 20, len = 60 + R() * 150, sw = (R() - 0.5) * 50;
        if (top > y1) break;
        for (const [lw, c] of [[5.5, '#3a2414'], [3.5, '#7a5230'], [1.2, 'rgba(220,170,110,.45)']]) {
          ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.bezierCurveTo(x + sw * 0.3, top + len * 0.3, x - sw * 0.6, top + len * 0.6, x + sw, top + len); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(122,82,48,.8)'; ctx.lineWidth = 1;
        for (let q = 1; q < 5; q++) { const u = q / 5, px = x + sw * (u * u * 1.2 - 0.3 * u), py = top + len * u; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 8 * (q % 2 ? 1 : -1), py + 4, px + 12 * (q % 2 ? 1 : -1), py + 12); ctx.stroke(); }
      }
      // a buried fossil fish and a lost coconut
      if (y1 > 430 && y0 < 520) fossil(ctx, 60, 470, 0.9, B.a);
      if (y1 > 300 && y0 < 340) coconut(ctx, 318, 318, 8);
    }
    if (B.k === 'clay') {   // tumbled temple blocks on the left, green seepage on the right
      for (let j = 0; j < 7; j++) {
        const x = 4 + R() * 16, y = top + 30 + j * 52 + R() * 20;
        if (y < y0 - 30 || y > y1 + 30) continue;
        block(ctx, x - 2, y, 14 + R() * 10, 12 + R() * 6, [120, 116, 90], R() * 0.3);
      }
      for (let j = 0; j < 6; j++) {
        const x = 346 + R() * 10, y = top + 40 + j * 60;
        if (y < y0 - 30 || y > y1 + 30) continue;
        ctx.fillStyle = rgb([150, 210, 60], 0.18); ctx.beginPath(); ctx.ellipse(x, y, 14, 30, 0.2, 0, TAU); ctx.fill();
      }
      if (y1 > 960 && y0 < 1010) coin(ctx, 186, 980, 6, t);
    }
    if (B.k === 'loam') {   // thick roots of the giant flytrap snaking down to its lair
      for (const [x, d] of [[40, 1], [320, -1], [130, 1], [250, -1]]) {
        for (const [lw, c] of [[9, '#2c3a1a'], [6, '#4e6a2a'], [2, 'rgba(190,240,120,.35)']]) {
          ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, top - 30); ctx.bezierCurveTo(x + d * 30, top + 40, x - d * 20, top + 90, x + d * 40, top + 170); ctx.stroke();
        }
      }
      if (y1 > 1180 && y0 < 1210) { bone(ctx, 40, 1196, 0.8); bone(ctx, 318, 1188, 0.7, 0.6); }
    }
    if (B.k === 'myc') {   // glowing fungus threads through the dark earth
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 14; j++) {
        const x = R() * W, y = top + 12 + R() * (bot - top - 20), len = 20 + R() * 40, a = R() * TAU, col = j % 3 ? [90, 255, 230] : [255, 110, 220];
        const pul = 0.25 + 0.2 * Math.sin(t * 1.6 + j);
        ctx.strokeStyle = rgb(col, pul); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.3, x + Math.cos(a + 0.6) * len * 1.4, y + Math.sin(a + 0.6) * len * 0.4); ctx.stroke();
        ctx.fillStyle = rgb(col, pul * 1.6); ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (B.k === 'rock') {   // gold veins near the mine, wet seeps near the lagoon, coal
      ctx.save(); ctx.lineCap = 'round';
      for (let j = 0; j < 6; j++) {
        const x = 220 + R() * 100, y = top + 20 + R() * (bot - top - 40);
        if (y < y0 - 40 || y > y1 + 40) continue;
        ctx.strokeStyle = '#8a6418'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 8); ctx.lineTo(x + 20, y + 4); ctx.lineTo(x + 32, y + 14); ctx.stroke();
        ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.6; ctx.stroke();
        const tw = Math.max(0, Math.sin(t * 2 + j * 1.7)); if (tw > 0.7) K.glow(ctx, x + 14, y + 8, 7, [255, 230, 120], (tw - 0.7) * 2);
        pebble(ctx, x + 6, y + 18, 3.5, 2.6, [255, 196, 50], 0.4);
      }
      for (let j = 0; j < 7; j++) {
        const x = R() * 200, y = top + 10 + R() * (bot - top);
        if (y < y0 - 20 || y > y1 + 20) continue;
        pebble(ctx, x, y, 5, 3.5, [40, 38, 40], R());
      }
      ctx.restore();
    }
    if (B.k === 'basalt') {   // hexagonal basalt column faces
      ctx.save(); ctx.strokeStyle = 'rgba(150,170,255,.10)'; ctx.lineWidth = 1.2; ctx.beginPath();
      const hs = 16;
      for (let row = 0; row < (bot - top) / (hs * 1.5) + 1; row++) {
        const y = top + row * hs * 1.5 + 8; if (y < y0 - 30 || y > y1 + 30) continue;
        for (let col = 0; col < W / (hs * 1.73) + 1; col++) {
          const x = col * hs * 1.73 + (row % 2 ? hs * 0.86 : 0);
          ctx.moveTo(x + Math.cos(Math.PI / 6) * hs * 0.95, y + Math.sin(Math.PI / 6) * hs * 0.95); for (let q = 1; q <= 6; q++) { const a = q * Math.PI / 3 + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * hs * 0.95, y + Math.sin(a) * hs * 0.95); }
        }
      }
      ctx.stroke(); ctx.restore();
    }
    if (B.k === 'cold') {   // crystals and ice veins buried in the rock
      for (let j = 0; j < 12; j++) {
        const x = R() * W, y = top + 14 + R() * (bot - top - 20), s = 4 + R() * 6, col = x < 120 ? [220, 120, 240] : x < 240 ? [180, 230, 255] : [170, 150, 255];
        if (y < y0 - 20 || y > y1 + 20) continue;
        gem(ctx, x, y, s, col, R() - 0.5, t);
      }
    }
    if (B.k === 'hot') {   // glowing magma cracks, brighter toward the core
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let j = 0; j < 16; j++) {
        let x = R() * W, y = top + 20 + R() * (bot - top - 40);
        if (y < y0 - 60 || y > y1 + 60) { R(); R(); R(); continue; }
        const pts = [[x, y]]; for (let q = 0; q < 4; q++) { x += (R() - 0.5) * 30; y += 8 + R() * 14; pts.push([x, y]); }
        const heat = 0.5 + 0.5 * Math.sin(t * 1.4 + j), deep = K.clamp((pts[0][1] - top) / (bot - top), 0, 1);
        for (const [lw, c, a] of [[4.5, [255, 90, 30], 0.14], [2, [255, 140, 40], 0.55], [0.8, [255, 230, 140], 0.75]]) {
          ctx.strokeStyle = rgb(c, a * (0.55 + 0.45 * heat) * (0.6 + 0.4 * deep)); ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(p => ctx.lineTo(...p)); ctx.stroke();
        }
      }
      for (let j = 0; j < 8; j++) { const x = R() * W, y = top + R() * (bot - top); if (y > y0 - 20 && y < y1 + 20) pebble(ctx, x, y, 6, 4, [34, 26, 40], R()); }
      ctx.restore();
    }
  }
  function fossil(ctx, x, y, s, base) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const c = rgb(lift(base, 45), 0.8), d = rgb(lift(base, -25), 0.8);
    ctx.strokeStyle = d; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(18, 0); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.stroke();
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -9 + Math.abs(i)); ctx.quadraticCurveTo(i * 5 + 3, 0, i * 5, 9 - Math.abs(i)); ctx.stroke(); }
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(22, 0, 6, 5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-31, -7); ctx.lineTo(-29, 0); ctx.lineTo(-31, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d; ctx.beginPath(); ctx.arc(23, -1, 1.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function bone(ctx, x, y, s, rot = -0.3) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = lg(ctx, 0, -6, 0, 6, ['#f6ecd2', '#cdbb94', '#9a8862']);
    ctx.beginPath(); ctx.roundRect(-14, -3, 28, 6, 3); ctx.fill();
    for (const d of [-1, 1]) for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 14, e * 3.4, 4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function coconut(ctx, x, y, r) {
    ctx.fillStyle = rg(ctx, x - r * 0.4, y - r * 0.4, r * 1.4, ['#c58a52', '#7a4a22', '#3e2410']);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2e1a0a'; for (const [dx, dy] of [[-2.4, -1], [2.4, -1], [0, 2.4]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.3, 0, TAU); ctx.fill(); }
    K.sheen(ctx, x, y, r, 0.3);
  }
  function coin(ctx, x, y, r, t) {
    const sq = Math.abs(Math.cos(t * 2.2));
    ctx.fillStyle = lg(ctx, x - r, y - r, x + r, y + r, ['#fff3a0', '#f2b628', '#a66a10']);
    ctx.beginPath(); ctx.ellipse(x, y, r * (0.25 + 0.75 * sq), r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9a5a08'; ctx.lineWidth = 1; ctx.stroke();
  }
  function block(ctx, x, y, w, h, col, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = lg(ctx, 0, -h / 2, 0, h / 2, [rgb(lift(col, 30)), rgb(col), rgb(lift(col, -40))]);
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 2); ctx.fill();
    ctx.strokeStyle = rgb(lift(col, -55)); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,.25)'; ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, 1.6);
    ctx.restore();
  }
  function gem(ctx, x, y, s, col, rot, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = lg(ctx, -s, -s * 2, s, s, [rgb(lift(col, 60)), rgb(col), rgb(lift(col, -70))]);
    ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.lineTo(s * 0.8, -s * 0.6); ctx.lineTo(s * 0.6, s * 0.6); ctx.lineTo(-s * 0.6, s * 0.6); ctx.lineTo(-s * 0.8, -s * 0.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(lift(col, -60)); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.lineTo(-s * 0.8, -s * 0.6); ctx.lineTo(-s * 0.2, -s * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- the surface ----------
  function drawSurface(ctx, v, t) {
    if (v.y > 300) return;
    ctx.fillStyle = lg(ctx, 0, 0, 0, 260, [[0, '#7fb8b4'], [0.55, '#b6d6ae'], [1, '#e6e2a8']]); ctx.fillRect(0, 0, W, 262);
    K.glow(ctx, 70, 46, 120, [255, 246, 200], 0.35);   // sun haze from the top-left
    ctx.fillStyle = rg(ctx, 66, 44, 22, ['#fffbe6', '#fff2b0', 'rgba(255,230,140,0)']); ctx.beginPath(); ctx.arc(66, 44, 22, 0, TAU); ctx.fill();
    // drifting clouds
    for (let i = 0; i < 4; i++) {
      const x = ((i * 120 + t * (6 + i * 2)) % 520) - 80, y = 28 + i * 22 + (i % 2) * 8, s = 0.7 + (i % 3) * 0.25;
      ctx.fillStyle = 'rgba(255,255,250,.75)';
      ctx.beginPath(); for (const [dx, dy, r] of [[0, 0, 14], [16, -6, 16], [34, 0, 13], [18, 6, 13]]) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); } ctx.fill();
      ctx.fillStyle = 'rgba(190,210,200,.35)'; ctx.beginPath(); ctx.ellipse(x + 17 * s, y + 10 * s, 30 * s, 5 * s, 0, 0, TAU); ctx.fill();
    }
    // far hills and jungle layers
    const hills = [[[150, 196, 160], 150, 0.012, 22], [[110, 168, 120], 182, 0.02, 16], [[72, 132, 82], 208, 0.033, 12]];
    hills.forEach(([c, y, f, a], i) => {
      ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.moveTo(0, 262);
      for (let x = 0; x <= W; x += 6) ctx.lineTo(x, y + Math.sin(x * f + i * 2) * a + Math.sin(x * f * 3.1 + i) * a * 0.3 - (i === 0 ? Math.max(0, 40 - Math.abs(x - 270) * 0.5) : 0));
      ctx.lineTo(W, 262); ctx.fill();
      if (i === 1) for (let k = 0; k < 9; k++) { const x = k * 44 + 10, yy = y - 4 + Math.sin(x * f + i * 2) * a; ctx.fillStyle = rgb(lift(c, -14)); ctx.beginPath(); ctx.arc(x, yy, 12, 0, TAU); ctx.arc(x + 12, yy + 3, 10, 0, TAU); ctx.fill(); }
    });
    // smoking volcano far off on the right: the journey's end, glimpsed from the start
    ctx.fillStyle = 'rgba(120,150,130,.9)'; ctx.beginPath(); ctx.moveTo(220, 170); ctx.lineTo(262, 116); ctx.lineTo(280, 116); ctx.lineTo(326, 170); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,80,.5)'; ctx.beginPath(); ctx.ellipse(271, 117, 9, 2.5, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) { const u = ((t * 0.15 + i / 5) % 1); ctx.fillStyle = `rgba(230,230,220,${0.45 * (1 - u)})`; ctx.beginPath(); ctx.arc(271 + u * 26 + Math.sin(u * 6) * 4, 110 - u * 70, 5 + u * 12, 0, TAU); ctx.fill(); }
    // palm trees swaying
    palm(ctx, 30, 256, 1.05, t, 0); palm(ctx, 330, 256, 0.95, t, 1.3); palm(ctx, 282, 258, 0.7, t, 2.2);
    // the dig site: a wooden winch frame over the hole
    digSite(ctx, t);
    // the grass ground lip
    ctx.fillStyle = lg(ctx, 0, 236, 0, 262, ['#9bd85a', '#5aa034', '#3a7024']);
    ctx.beginPath(); ctx.moveTo(-2, 262);
    for (let x = -2; x <= W + 4; x += 6) { const hole = x > 180 && x < 228; ctx.lineTo(x, hole ? 262 : 246 + Math.sin(x * 0.05) * 2); }
    ctx.lineTo(W + 2, 262); ctx.fill();
    // grass blades and bushes
    for (let x = 0; x < W; x += 5) {
      if (x > 176 && x < 232) continue;
      const h = 6 + hash(x) * 8, sw = Math.sin(t * 1.6 + x * 0.1) * 2;
      ctx.strokeStyle = hash(x, 2) > 0.5 ? '#7cc444' : '#4f9a2c'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, 250); ctx.quadraticCurveTo(x + sw * 0.5, 250 - h * 0.5, x + sw + 1, 250 - h); ctx.stroke();
    }
    for (const [x, s] of [[78, 1], [150, 0.8], [252, 0.9], [350, 1.1]]) bush(ctx, x, 252, s, t);
    // flowers
    for (const [x, c] of [[60, '#ff6a8a'], [96, '#ffd04a'], [262, '#ff8a3a'], [312, '#ff6ad0']]) {
      ctx.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q * TAU / 5 + t * 0.3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 2.6, 241 + Math.sin(a) * 2.6, 2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(x, 241, 1.4, 0, TAU); ctx.fill();
    }
    // soil edge under the grass, roots hanging into the first band
    ctx.fillStyle = lg(ctx, 0, 254, 0, 272, ['#5a3a20', 'rgba(90,58,32,0)']); ctx.fillRect(0, 254, W, 18);
  }
  function palm(ctx, x, y, s, t, ph) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const sway = Math.sin(t * 0.9 + ph) * 4;
    // trunk (segmented, curved)
    for (let i = 0; i < 12; i++) {
      const u = i / 12, px = sway * u * u + Math.sin(u * 2 + ph) * 8 * u, py = -u * 120;
      ctx.fillStyle = lg(ctx, px - 6, 0, px + 6, 0, ['#c49a62', '#8a6236', '#5a3c20']);
      ctx.beginPath(); ctx.ellipse(px, py, 7 - u * 2, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(70,44,20,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py + 3, 6 - u * 2, 2, 0, 0, Math.PI); ctx.stroke();
    }
    const tx = sway + Math.sin(2 + ph) * 8, ty = -124;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.52 + Math.sin(t * 1.3 + ph + i) * 0.06, len = 52 - Math.abs(i - 3) * 4;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
      ctx.strokeStyle = '#3a6a1c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -10, len, 14); ctx.stroke();
      for (let q = 1; q < 9; q++) {
        const u = q / 9, px = len * u, py = -10 * Math.sin(u * Math.PI) * 1.2 + u * u * 22;
        leaf(ctx, px, py, 18 - q, 1.1 + u * 0.4, i % 2 ? [92, 172, 60] : [70, 148, 48], 0.22);
        leaf(ctx, px, py, 16 - q, -1.4 + u * 0.4, i % 2 ? [80, 160, 52] : [60, 134, 42], 0.22);
      }
      ctx.restore();
    }
    for (const [dx, dy] of [[-4, 4], [4, 5], [0, 8]]) coconut(ctx, tx + dx, ty + dy, 4.4);
    ctx.restore();
  }
  function bush(ctx, x, y, s, t) {
    for (let i = 0; i < 5; i++) leaf(ctx, x, y, 22 * s, -Math.PI / 2 + (i - 2) * 0.45 + Math.sin(t + i + x) * 0.05, i % 2 ? [86, 160, 56] : [64, 136, 44], 0.32);
  }
  function digSite(ctx, t) {
    const hx = 204;
    // the hole: a dark mouth going down
    ctx.fillStyle = rg(ctx, hx, 262, 30, ['#1a100a', '#2e1c10', 'rgba(46,28,16,0)']); ctx.beginPath(); ctx.ellipse(hx, 258, 30, 9, 0, 0, TAU); ctx.fill();
    // A-frame winch
    for (const d of [-1, 1]) {
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx + d * 30, 254); ctx.lineTo(hx + d * 4, 186); ctx.stroke();
      ctx.strokeStyle = '#a8784a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx + d * 30 - 1, 253); ctx.lineTo(hx + d * 4 - 1, 187); ctx.stroke();
    }
    ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx - 18, 220); ctx.lineTo(hx + 18, 220); ctx.stroke();
    // pulley wheel and rope with a swinging bucket
    const sw = Math.sin(t * 1.4) * 2;
    ctx.fillStyle = rg(ctx, hx - 2, 186, 8, ['#d8d0c0', '#8a8070', '#4a4438']); ctx.beginPath(); ctx.arc(hx, 188, 6, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(hx, 188); ctx.rotate(t * 2); ctx.strokeStyle = '#4a4438'; ctx.lineWidth = 1.2; for (let q = 0; q < 3; q++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5, 0); ctx.stroke(); } ctx.restore();
    ctx.strokeStyle = '#c8a878'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + 6, 188); ctx.lineTo(hx + 6 + sw, 236); ctx.stroke();
    ctx.fillStyle = lg(ctx, hx - 1 + sw, 236, hx + 13 + sw, 236, ['#9a6a3a', '#6a4424']); ctx.beginPath(); ctx.moveTo(hx + sw, 236); ctx.lineTo(hx + 12 + sw, 236); ctx.lineTo(hx + 10 + sw, 246); ctx.lineTo(hx + 2 + sw, 246); ctx.fill();
    // a little sign: "DIG"
    ctx.fillStyle = '#6a4424'; ctx.fillRect(hx + 38, 222, 3, 30);
    ctx.fillStyle = lg(ctx, 0, 214, 0, 230, ['#d8a868', '#9a6a3a']); ctx.beginPath(); ctx.roundRect(hx + 22, 214, 36, 15, 3); ctx.fill();
    ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 1; ctx.stroke();
    text(ctx, 'START', hx + 40, 222, 8, '#4a2a10');
    // a dirt pile beside the hole
    ctx.fillStyle = lg(ctx, 0, 236, 0, 256, ['#9a6a3a', '#6a4424']); ctx.beginPath(); ctx.moveTo(hx - 64, 254); ctx.quadraticCurveTo(hx - 50, 232, hx - 34, 254); ctx.fill();
  }

  // ---------- cavern scenery ----------
  function far(ctx, c, col, n, seed, shape = 'stal') {   // fogged silhouettes in the back of a cavern
    const r = K.rand(seed);
    ctx.fillStyle = rgb(col);
    for (let i = 0; i < n; i++) {
      const x = c.x - c.rx + r() * c.rx * 2, wdt = 8 + r() * 16, top = r() < 0.55, len = c.ry * (0.4 + r() * 0.7);
      const y0 = top ? c.y - c.ry - 4 : c.y + c.ry + 4, y1 = top ? y0 + len : y0 - len;
      ctx.beginPath(); ctx.moveTo(x - wdt, y0); ctx.quadraticCurveTo(x - wdt * 0.3, (y0 + y1) / 2, x, y1); ctx.quadraticCurveTo(x + wdt * 0.3, (y0 + y1) / 2, x + wdt, y0); ctx.fill();
    }
  }
  function stalactites(ctx, c, col, n, seed, len = 16) {
    const r = K.rand(seed);
    for (let i = 0; i < n; i++) {
      const x = c.x - c.rx * 0.9 + r() * c.rx * 1.8, wd = 3 + r() * 5, l = len * (0.5 + r());
      const y = c.y - c.ry * Math.sqrt(Math.max(0, 1 - ((x - c.x) / c.rx) ** 2)) - 2;
      ctx.fillStyle = lg(ctx, x - wd, 0, x + wd, 0, [rgb(lift(col, 30)), rgb(col), rgb(lift(col, -30))]);
      ctx.beginPath(); ctx.moveTo(x - wd, y); ctx.quadraticCurveTo(x - wd * 0.2, y + l * 0.6, x, y + l); ctx.quadraticCurveTo(x + wd * 0.2, y + l * 0.6, x + wd, y); ctx.fill();
    }
  }
  const SCENE = {
    jungle(ctx, c, t) {
      far(ctx, c, lift(RG.jungle.a, -18), 6, c.s * 7);
      // light shaft from the dig above
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lg(ctx, 0, c.y - c.ry, 0, c.y + c.ry, ['rgba(230,255,170,.22)', 'rgba(230,255,170,0)']);
      ctx.beginPath(); ctx.moveTo(c.x - 10, c.y - c.ry); ctx.lineTo(c.x + 26, c.y - c.ry); ctx.lineTo(c.x + 50, c.y + c.ry); ctx.lineTo(c.x - 20, c.y + c.ry); ctx.fill(); ctx.restore();
      // hanging roots and vines with leaves
      const r = K.rand(c.s * 11);
      for (let i = 0; i < 6; i++) {
        const x = c.x - c.rx * 0.8 + i * c.rx * 0.32 + r() * 8, len = 14 + r() * c.ry * 0.7, sw = Math.sin(t * 1.2 + i * 1.7) * 4;
        const y = c.y - c.ry * Math.sqrt(Math.max(0, 1 - ((x - c.x) / c.rx) ** 2)) - 4;
        ctx.strokeStyle = '#2f5a1e'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw, y + len * 0.5, x + sw * 1.4, y + len); ctx.stroke();
        ctx.strokeStyle = '#6aa83c'; ctx.lineWidth = 1; ctx.stroke();
        for (let q = 1; q <= 3; q++) leaf(ctx, x + sw * 1.4 * q / 3, y + len * q / 3.2, 8, q % 2 ? 0.6 : Math.PI - 0.6, [96, 170, 62]);
      }
      // ferns on the floor
      for (let i = 0; i < 5; i++) {
        const x = c.x - c.rx * 0.75 + i * c.rx * 0.38, y = c.y + c.ry * 0.8;
        for (let q = 0; q < 4; q++) leaf(ctx, x, y, 14 + q * 2, -Math.PI / 2 + (q - 1.5) * 0.5 + Math.sin(t + i) * 0.05, q % 2 ? [74, 140, 52] : [96, 166, 64], 0.3);
      }
      mushroomTiny(ctx, c.x + c.rx * 0.62, c.y + c.ry * 0.74, [255, 120, 80], t);
      mushroomTiny(ctx, c.x - c.rx * 0.5, c.y + c.ry * 0.78, [255, 210, 90], t + 1);
    },
    temple(ctx, c, t) {
      const x0 = c.x - c.rx, x1 = c.x + c.rx, y0 = c.y - c.ry, y1 = c.y + c.ry;
      // stone brick back wall
      const bw = 22, bh = 12;
      for (let row = 0; row * bh < c.ry * 2; row++) {
        const y = y0 + row * bh;
        for (let col = -1; col * bw < c.rx * 2 + bw; col++) {
          const x = x0 + col * bw + (row % 2 ? bw / 2 : 0), shade = hash(row, col) * 16 - 8;
          const base = lift([118, 114, 88], shade);
          ctx.fillStyle = rgb(base); ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
          ctx.fillStyle = 'rgba(30,24,14,.18)'; ctx.fillRect(x + 1, y + bh * 0.6, bw - 2, bh * 0.4 - 1);
          ctx.fillStyle = 'rgba(255,240,200,.12)'; ctx.fillRect(x + 1, y + 1, bw - 2, 1.4);
          if (hash(row, col + 9) > 0.86) { ctx.fillStyle = 'rgba(80,140,50,.5)'; ctx.beginPath(); ctx.ellipse(x + bw / 2, y + 2, bw * 0.4, 3, 0, 0, TAU); ctx.fill(); }
        }
      }
      ctx.fillStyle = lg(ctx, x0, 0, x1, 0, ['rgba(30,26,18,.45)', 'rgba(30,26,18,0)', 'rgba(30,26,18,.45)']); ctx.fillRect(x0, y0, c.rx * 2, c.ry * 2);
      // a gold frieze band near the top and a big carved idol face in the middle
      ctx.fillStyle = lg(ctx, 0, y0 + 16, 0, y0 + 26, ['#fff0a0', '#e0a628', '#8a5a10']); ctx.fillRect(x0, y0 + 16, c.rx * 2, 9);
      ctx.fillStyle = '#8a5a10'; for (let x = x0 + 6; x < x1; x += 12) { ctx.fillRect(x, y0 + 18, 5, 2); ctx.fillRect(x + 3, y0 + 21, 5, 2); }
      idol(ctx, c.x + 30, c.y - 70, 1, t);
      // columns
      for (const cx of [x0 + 14, x1 - 14]) {
        ctx.fillStyle = lg(ctx, cx - 8, 0, cx + 8, 0, ['#d8d0a8', '#a89c74', '#6a6248']); ctx.fillRect(cx - 7, y0 + 26, 14, c.ry * 2 - 26);
        ctx.strokeStyle = 'rgba(80,70,50,.5)'; ctx.lineWidth = 1; for (let k = -4; k <= 4; k += 4) { ctx.beginPath(); ctx.moveTo(cx + k, y0 + 26); ctx.lineTo(cx + k, y1); ctx.stroke(); }
        ctx.fillStyle = lg(ctx, 0, y0 + 26, 0, y0 + 34, ['#fff0a0', '#c88a20']); ctx.fillRect(cx - 9, y0 + 26, 18, 7);
      }
      // stone stairs zig-zagging down between the levels
      for (const [ax, ay, bx2, by2] of [[POS[4][0], POS[4][1] + 18, POS[5][0], POS[5][1] + 18], [POS[5][0], POS[5][1] + 18, POS[6][0], POS[6][1] + 18]]) {
        const n = 7;
        for (let i = 0; i <= n; i++) { const u = i / n; block(ctx, ax + (bx2 - ax) * u, ay + (by2 - ay) * u, 22, 9, [150, 142, 108]); }
      }
      // wall torches with flickering flames
      for (const [tx, ty] of [[x0 + 30, c.y - 20], [x1 - 30, c.y + 60], [x1 - 34, y0 + 60]]) torch(ctx, tx, ty, t);
      // treasure heap at the bottom
      for (let i = 0; i < 9; i++) coin(ctx, c.x + 10 + (i % 5) * 9 - 18, y1 - 10 - Math.floor(i / 5) * 6, 4.4, t + i * 0.4);
      // dart traps in the wall
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#3a3428'; ctx.beginPath(); ctx.arc(x1 - 8, c.y - 10 + i * 18, 2.4, 0, TAU); ctx.fill(); }
    },
    bog(ctx, c, t) {
      far(ctx, c, lift(RG.bog.a, -22), 5, 41);
      // dead swamp trees in the haze
      for (const [x, s] of [[c.x - 40, 1], [c.x + 44, 0.8]]) {
        ctx.strokeStyle = rgb(lift(RG.bog.a, -30)); ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, c.y + c.ry); ctx.lineTo(x + 4, c.y - 40 * s); ctx.lineTo(x - 14 * s, c.y - 70 * s); ctx.moveTo(x + 4, c.y - 30 * s); ctx.lineTo(x + 20 * s, c.y - 54 * s); ctx.stroke();
      }
      // hanging moss
      const r = K.rand(77);
      for (let i = 0; i < 8; i++) {
        const x = c.x - c.rx * 0.85 + i * c.rx * 0.24, len = 18 + r() * 40, sw = Math.sin(t * 0.9 + i) * 3;
        const y = c.y - c.ry * Math.sqrt(Math.max(0, 1 - ((x - c.x) / c.rx) ** 2)) - 2;
        ctx.fillStyle = lg(ctx, 0, y, 0, y + len, ['#6a8a2a', 'rgba(150,200,60,.7)']);
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x + sw, y + len * 0.7, x + sw * 1.3, y + len); ctx.quadraticCurveTo(x + 3 + sw, y + len * 0.5, x + 6, y); ctx.fill();
      }
      // toxic water filling the bottom
      const wy = c.y + c.ry * 0.38;
      ctx.fillStyle = lg(ctx, 0, wy, 0, c.y + c.ry, ['rgba(170,230,60,.85)', 'rgba(70,110,20,.95)']);
      ctx.beginPath(); ctx.moveTo(c.x - c.rx - 10, c.y + c.ry + 10);
      for (let x = c.x - c.rx - 10; x <= c.x + c.rx + 10; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.08 + t * 1.6) * 1.8);
      ctx.lineTo(c.x + c.rx + 10, c.y + c.ry + 10); ctx.fill();
      ctx.strokeStyle = 'rgba(230,255,150,.7)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let x = c.x - c.rx - 10; x <= c.x + c.rx + 10; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.08 + t * 1.6) * 1.8);
      ctx.stroke();
      // bubbles popping, lily pads, reeds, a snapper's eyes peeking out
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.5 + i / 7) % 1, x = c.x - c.rx * 0.7 + i * c.rx * 0.22, y = c.y + c.ry * 0.9 - ph * (c.y + c.ry * 0.9 - wy);
        ctx.strokeStyle = `rgba(220,255,140,${0.7 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 1.5 + ph * 2.5, 0, TAU); ctx.stroke();
      }
      for (const [x, s] of [[c.x - 50, 1], [c.x + 50, 0.8], [c.x + 10, 0.7]]) {
        ctx.fillStyle = lg(ctx, 0, wy - 3, 0, wy + 3, ['#9ad84a', '#4a8a22']); ctx.beginPath(); ctx.ellipse(x, wy + 1, 11 * s, 3.5 * s, 0, 0.3, TAU - 0.1); ctx.lineTo(x, wy + 1); ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const x = c.x + c.rx * 0.6 + (i % 3) * 5 - 6, h = 26 + (i * 7) % 14, sw = Math.sin(t * 1.3 + i) * 2;
        ctx.strokeStyle = '#4a7a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, wy + 6); ctx.quadraticCurveTo(x + sw, wy - h / 2, x + sw * 1.5, wy - h); ctx.stroke();
        if (i % 2) { ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.ellipse(x + sw * 1.5, wy - h, 2.2, 5, 0, 0, TAU); ctx.fill(); }
      }
      const blink = (t % 4) < 0.15 ? 0.2 : 1;
      ctx.save(); ctx.translate(c.x - 26, wy - 1); ctx.scale(1, blink);
      ctx.fillStyle = '#5a8a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, Math.PI, 0); ctx.fill();
      ctx.restore();
      K.eyes(ctx, c.x - 26, wy - 3, 4.2, 2.4 * blink + 0.01, '#ff5a3a', Math.sin(t * 0.7), 1);
    },
    lair(ctx, c, t) {
      far(ctx, c, lift(RG.lair.a, -20), 9, 51);
      // the flytrap's giant leaves fanning out behind its throne
      for (let i = 0; i < 7; i++) { const a = -Math.PI + 0.25 + i * 0.44 + Math.sin(t * 0.6 + i) * 0.03; leaf(ctx, c.x, c.y + 40, 96 - Math.abs(i - 3) * 10, a, i % 2 ? [60, 120, 50] : [44, 100, 40], 0.3); }
      // thorny vines crossing the ceiling
      for (const d of [-1, 1]) {
        ctx.strokeStyle = '#2e4a1a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c.x + d * c.rx, c.y - 30); ctx.quadraticCurveTo(c.x + d * 60, c.y - c.ry - 10, c.x + d * 10, c.y - c.ry + 20); ctx.stroke();
        ctx.strokeStyle = '#5a8a30'; ctx.lineWidth = 3; ctx.stroke();
        for (let q = 0; q < 6; q++) { const u = q / 6, px = (1 - u) * (1 - u) * (c.x + d * c.rx) + 2 * u * (1 - u) * (c.x + d * 60) + u * u * (c.x + d * 10), py = (1 - u) * (1 - u) * (c.y - 30) + 2 * u * (1 - u) * (c.y - c.ry - 10) + u * u * (c.y - c.ry + 20); ctx.fillStyle = '#c8d870'; ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px, py + 6); ctx.lineTo(px + 2, py); ctx.fill(); }
      }
      // bones on the floor and a skull
      bone(ctx, c.x - 92, c.y + c.ry * 0.72, 0.8, 0.2); bone(ctx, c.x + 94, c.y + c.ry * 0.7, 0.7, -0.4); bone(ctx, c.x + 70, c.y + c.ry * 0.78, 0.6, 0.9);
      skull(ctx, c.x - 66, c.y + c.ry * 0.68, 0.8);
      // glowing pollen pods hanging down
      for (let i = 0; i < 4; i++) {
        const x = c.x - 100 + i * 66, len = 18 + (i % 2) * 14, sw = Math.sin(t + i) * 3;
        const y = c.y - c.ry * Math.sqrt(Math.max(0, 1 - ((x - c.x) / c.rx) ** 2));
        ctx.strokeStyle = '#3a5a22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y + len); ctx.stroke();
        K.glow(ctx, x + sw, y + len + 4, 14, [220, 255, 120], 0.35 + 0.15 * Math.sin(t * 2 + i));
        ctx.fillStyle = rg(ctx, x + sw - 1, y + len + 3, 6, ['#f6ffb0', '#b8e050', '#6a9a22']); ctx.beginPath(); ctx.ellipse(x + sw, y + len + 4, 4, 5, 0, 0, TAU); ctx.fill();
      }
      // floor mound (the throne)
      ctx.fillStyle = lg(ctx, 0, c.y + 30, 0, c.y + c.ry, ['#4a6a2a', '#2a3e18']); ctx.beginPath(); ctx.ellipse(c.x, c.y + c.ry * 0.95, 80, 32, 0, Math.PI, 0); ctx.fill();
    },
    grotto(ctx, c, t) {
      far(ctx, c, lift(RG.grotto.a, -16), 7, 61);
      // giant glowing mushrooms
      const M = [[c.x - 70, 1.1, [90, 255, 230]], [c.x - 40, 0.7, [255, 110, 220]], [c.x + 54, 1.25, [255, 110, 220]], [c.x + 82, 0.75, [90, 255, 230]], [c.x + 20, 0.55, [90, 255, 230]], [c.x - 88, 0.5, [255, 110, 220]]];
      for (const [x, s, col] of M) shroom(ctx, x, c.y + c.ry * 0.86, s, col, t + x);
      // glowing dots on the walls
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const r = K.rand(66);
      for (let i = 0; i < 20; i++) { const a = r() * TAU, x = c.x + Math.cos(a) * c.rx * 0.92, y = c.y + Math.sin(a) * c.ry * 0.92, col = i % 2 ? [90, 255, 230] : [255, 110, 220]; ctx.fillStyle = rgb(col, 0.5 + 0.4 * Math.sin(t * 2 + i)); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    lagoon(ctx, c, t) {
      far(ctx, c, lift(RG.lagoon.a, -18), 7, 71);
      stalactites(ctx, c, [70, 110, 120], 9, 72, 22);
      // waterfall pouring from the tunnel above
      const wx = POS[11][0] + 26, wy0 = c.y - c.ry + 10, wsy = c.y - 4;
      ctx.fillStyle = lg(ctx, wx - 7, 0, wx + 7, 0, ['rgba(200,255,250,.4)', 'rgba(230,255,255,.8)', 'rgba(200,255,250,.4)']); ctx.fillRect(wx - 6, wy0, 12, wsy - wy0 + 10);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 60;
      for (const dx of [-3, 1, 4]) { ctx.beginPath(); ctx.moveTo(wx + dx, wy0); ctx.lineTo(wx + dx, wsy + 8); ctx.stroke(); }
      ctx.setLineDash([]);
      // the lake
      const sy = c.y + 4;
      ctx.fillStyle = lg(ctx, 0, sy, 0, c.y + c.ry, ['rgba(90,220,220,.8)', 'rgba(20,90,120,.95)']);
      ctx.beginPath(); ctx.moveTo(c.x - c.rx - 10, c.y + c.ry + 10);
      for (let x = c.x - c.rx - 10; x <= c.x + c.rx + 10; x += 5) ctx.lineTo(x, sy + Math.sin(x * 0.09 + t * 2) * 1.6 + Math.sin(x * 0.05 - t * 1.3) * 1.2);
      ctx.lineTo(c.x + c.rx + 10, c.y + c.ry + 10); ctx.fill();
      // caustic light ripples
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(180,255,250,.18)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) { const y = sy + 14 + i * 12, ph = t * 0.8 + i; ctx.beginPath(); for (let x = c.x - c.rx; x <= c.x + c.rx; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + ph) * 3); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(230,255,255,.85)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = c.x - c.rx - 10; x <= c.x + c.rx + 10; x += 5) ctx.lineTo(x, sy + Math.sin(x * 0.09 + t * 2) * 1.6 + Math.sin(x * 0.05 - t * 1.3) * 1.2);
      ctx.stroke();
      // splash ring at the waterfall foot
      for (let i = 0; i < 3; i++) { const u = (t * 0.8 + i / 3) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(wx, sy + 2, 6 + u * 16, 2 + u * 3, 0, 0, TAU); ctx.stroke(); }
      // seaweed and jellyfish under water
      for (let i = 0; i < 6; i++) {
        const x = c.x - c.rx * 0.8 + i * c.rx * 0.3, h = 30 + (i % 3) * 14, by2 = c.y + c.ry + 4;
        ctx.strokeStyle = i % 2 ? '#2a8a5a' : '#3aa86a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, by2);
        for (let q = 1; q <= 5; q++) ctx.lineTo(x + Math.sin(t * 1.5 + q + i) * 4, by2 - h * q / 5); ctx.stroke();
      }
      for (let i = 0; i < 3; i++) jelly(ctx, c.x - 40 + i * 42, c.y + 60 + Math.sin(t * 1.2 + i * 2) * 8 + i * 10, 0.8 - i * 0.1, t + i);
      // fish
      for (let i = 0; i < 2; i++) { const x = c.x - c.rx + ((t * 18 + i * 90) % (c.rx * 2)), y = c.y + 34 + i * 40; ctx.fillStyle = i ? '#ffb04a' : '#ff7a5a'; ctx.beginPath(); ctx.ellipse(x, y, 5, 2.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 9, y - 3); ctx.lineTo(x - 9, y + 3); ctx.fill(); }
    },
    mine(ctx, c, t) {
      const x0 = c.x - c.rx, x1 = c.x + c.rx, y0 = c.y - c.ry, y1 = c.y + c.ry;
      far(ctx, c, lift(RG.mine.a, -22), 4, 81);
      // timber frames all the way down the shaft
      for (let y = y0 + 20; y < y1; y += 46) {
        beam(ctx, x0 - 4, y, x1 + 4, y, 7);
        for (const x of [x0 + 6, x1 - 6]) beam(ctx, x, y, x, y + 46, 6);
        ctx.strokeStyle = 'rgba(70,44,20,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 6, y + 4); ctx.lineTo(x0 + 22, y + 4); ctx.lineTo(x0 + 6, y + 18); ctx.moveTo(x1 - 6, y + 4); ctx.lineTo(x1 - 22, y + 4); ctx.lineTo(x1 - 6, y + 18); ctx.stroke();
      }
      // a ladder
      const lx = x0 + 22;
      for (const dx of [0, 12]) beam(ctx, lx + dx, y0, lx + dx, y1, 3);
      for (let y = y0 + 6; y < y1; y += 10) { ctx.strokeStyle = '#8a6236'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + 12, y); ctx.stroke(); }
      // hanging lanterns
      for (let i = 0; i < 3; i++) lantern(ctx, x1 - 18, y0 + 50 + i * 100, t + i);
      // rails and a mine cart full of gold near the bottom
      const ry = y1 - 16;
      ctx.strokeStyle = '#5a5048'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke();
      for (let x = x0 + 4; x < x1; x += 10) { ctx.fillStyle = '#6a4424'; ctx.fillRect(x, ry, 6, 4); }
      cart(ctx, c.x + 4, ry - 2, t);
      // gold nuggets in the walls
      for (let i = 0; i < 5; i++) pebble(ctx, (i % 2 ? x1 - 4 : x0 + 4), y0 + 30 + i * 56, 4, 3, [255, 200, 60], i);
    },
    caves(ctx, c, t) {
      // basalt columns in the back
      for (let i = 0; i < 12; i++) {
        const x = c.x - c.rx + i * (c.rx * 2 / 11), h = 30 + hash(i, 3) * 60, top = c.y + c.ry - h;
        ctx.fillStyle = lg(ctx, x - 9, 0, x + 9, 0, [rgb(lift(RG.caves.a, -6)), rgb(lift(RG.caves.a, -26)), rgb(lift(RG.caves.a, -40))]);
        ctx.fillRect(x - 9, top, 18, h + 20);
        ctx.fillStyle = rgb(lift(RG.caves.a, 18)); ctx.beginPath(); ctx.ellipse(x, top, 9, 3.4, 0, 0, TAU); ctx.fill();
      }
      stalactites(ctx, c, [70, 74, 128], 12, 92, 24);
      // dripping water
      for (let i = 0; i < 4; i++) { const x = c.x - 70 + i * 46, u = (t * 0.7 + i * 0.27) % 1, y = c.y - c.ry * 0.7 + u * c.ry * 1.4; ctx.fillStyle = `rgba(190,230,255,${0.8 * (1 - u * 0.5)})`; ctx.beginPath(); ctx.ellipse(x, y, 1.4, 2.6, 0, 0, TAU); ctx.fill(); }
      // blue glow worms on the ceiling
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) { const x = c.x - c.rx * 0.8 + i * c.rx * 0.1, y = c.y - c.ry * 0.7 + Math.sin(i * 2.3) * 8; ctx.strokeStyle = `rgba(150,220,255,${0.3 + 0.2 * Math.sin(t * 2 + i)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6 + (i % 3) * 4); ctx.stroke(); ctx.fillStyle = 'rgba(180,240,255,.8)'; ctx.beginPath(); ctx.arc(x, y + 7 + (i % 3) * 4, 1.4, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    geode(ctx, c, t) {
      // a hollow geode: crystal points lining the whole inner wall
      ctx.fillStyle = rg(ctx, c.x, c.y, c.rx, ['rgba(255,190,255,.25)', 'rgba(140,80,180,0)']); ctx.beginPath(); ctx.arc(c.x, c.y, c.rx, 0, TAU); ctx.fill();
      const n = 34;
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < n; i++) {
        const a = (i + ring * 0.5) / n * TAU, len = (ring ? 12 : 20) + hash(i, ring) * 12, r0 = c.rx + 4 - ring * 4;
        const x = c.x + Math.cos(a) * r0, y = c.y + Math.sin(a) * r0, col = ring ? [255, 170, 240] : [190, 120, 240];
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + Math.PI);
        const w2 = 5 + hash(i + 3, ring) * 4;
        ctx.fillStyle = lg(ctx, -w2, 0, w2, 0, [rgb(lift(col, 50)), rgb(col), rgb(lift(col, -70))]);
        ctx.beginPath(); ctx.moveTo(-w2, 0); ctx.lineTo(-w2 * 0.6, -len * 0.8); ctx.lineTo(0, -len); ctx.lineTo(w2 * 0.6, -len * 0.8); ctx.lineTo(w2, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-w2 * 0.6, -len * 0.8); ctx.lineTo(0, -len); ctx.lineTo(-w2 * 0.1, -len * 0.3); ctx.fill();
        ctx.restore();
      }
      // a ring arena floor
      ctx.fillStyle = lg(ctx, 0, c.y + 40, 0, c.y + c.ry, ['#7a4aa0', '#3a2058']); ctx.beginPath(); ctx.ellipse(c.x, c.y + c.ry - 4, 70, 26, 0, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 6; i++) { const tw = Math.max(0, Math.sin(t * 2.4 + i * 1.3)); if (tw > 0.6) sparkle(ctx, c.x + Math.cos(i * 1.1) * 60, c.y + Math.sin(i * 1.7) * 60, 6 * tw, '#fff'); }
    },
    crystal(ctx, c, t) {
      far(ctx, c, lift(RG.crystal.a, -16), 5, 111);
      for (let i = 0; i < 6; i++) {
        const x = c.x - c.rx * 0.8 + i * c.rx * 0.32, s = 4 + hash(i, 4) * 5;
        gem(ctx, x, c.y + c.ry * 0.82, s, i % 2 ? [255, 160, 240] : [190, 120, 240], (i - 2.5) * 0.15, t);
        gem(ctx, x + 6, c.y - c.ry * 0.82, s * 0.8, [220, 140, 250], Math.PI + (i - 2.5) * 0.15, t);
      }
      const tw = 0.5 + 0.5 * Math.sin(t * 2); sparkle(ctx, c.x - 20, c.y - 20, 5 + tw * 3, '#fff');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,120,220,${0.25 + 0.2 * tw})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(c.x - c.rx, c.y - 12); ctx.lineTo(c.x + c.rx, c.y - 12); ctx.stroke(); ctx.restore();
    },
    frost(ctx, c, t) {
      far(ctx, c, lift(RG.frost.a, -16), 5, 121);
      stalactites(ctx, c, [210, 240, 255], 10, 122, 22);
      ctx.fillStyle = lg(ctx, 0, c.y + c.ry * 0.6, 0, c.y + c.ry, ['#ffffff', '#c8e0f0']);
      ctx.beginPath(); ctx.moveTo(c.x - c.rx - 4, c.y + c.ry + 4);
      for (let x = c.x - c.rx; x <= c.x + c.rx; x += 8) ctx.lineTo(x, c.y + c.ry * 0.7 + Math.sin(x * 0.07) * 4);
      ctx.lineTo(c.x + c.rx + 4, c.y + c.ry + 4); ctx.fill();
      // frozen breath swirls
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(c.x - 20 + i * 40, c.y - 18 + Math.sin(t + i) * 3, 8, t + i, t + i + 4); ctx.stroke(); }
    },
    storm(ctx, c, t) {
      far(ctx, c, lift(RG.storm.a, -14), 5, 131);
      // storm cloud wisps
      for (let i = 0; i < 4; i++) { const x = c.x - 50 + ((t * 8 + i * 30) % 100), y = c.y - c.ry * 0.5 + i * 6; ctx.fillStyle = 'rgba(200,190,255,.18)'; ctx.beginPath(); ctx.ellipse(x, y, 24, 7, 0, 0, TAU); ctx.fill(); }
      // lightning flicker
      const f = Math.max(0, Math.sin(t * 3.1) * Math.sin(t * 7.3));
      if (f > 0.4) {
        ctx.fillStyle = `rgba(220,200,255,${(f - 0.4) * 0.5})`; ctx.fillRect(c.x - c.rx, c.y - c.ry, c.rx * 2, c.ry * 2);
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); let x = c.x + 22, y = c.y - c.ry; ctx.moveTo(x, y);
        for (let q = 0; q < 6; q++) { x += (hash(q, Math.floor(t * 3)) - 0.5) * 18; y += c.ry * 0.25; ctx.lineTo(x, y); } ctx.stroke();
      }
      // floating rocks
      for (let i = 0; i < 3; i++) pebble(ctx, c.x - 34 + i * 34, c.y + c.ry * 0.5 + Math.sin(t * 1.4 + i) * 4, 9 - i, 5, [80, 74, 130], 0);
    },
    magma(ctx, c, t) {
      far(ctx, c, lift(RG.magma.a, -20), 8, 141);
      stalactites(ctx, c, [90, 40, 30], 10, 142, 20);
      lavaPool(ctx, c, c.y + c.ry * 0.5, t);
      // lava falls from the walls
      for (const x of [c.x - c.rx * 0.78, c.x + c.rx * 0.74]) lavaFall(ctx, x, c.y - c.ry * 0.6, c.y + c.ry * 0.5, t);
    },
    core(ctx, c, t) {
      // the molten heart: heat bloom, obsidian pillars and a churning lava lake
      const pul = 0.5 + 0.5 * Math.sin(t * 1.6);
      ctx.fillStyle = rg(ctx, c.x, c.y + 40, c.rx * 1.1, [`rgba(255,220,120,${0.35 + 0.15 * pul})`, 'rgba(255,120,40,.15)', 'rgba(120,30,10,0)']); ctx.fillRect(c.x - c.rx, c.y - c.ry, c.rx * 2, c.ry * 2);
      for (const d of [-1, 1]) for (const k of [0, 1]) {
        const x = c.x + d * (52 + k * 30), h = 120 - k * 40;
        ctx.fillStyle = lg(ctx, x - 9, 0, x + 9, 0, ['#5a3a4a', '#2a1a24', '#140a10']);
        ctx.beginPath(); ctx.moveTo(x - 9, c.y + 60); ctx.lineTo(x - 6, c.y + 60 - h); ctx.lineTo(x, c.y + 50 - h - 8); ctx.lineTo(x + 6, c.y + 60 - h); ctx.lineTo(x + 9, c.y + 60); ctx.fill();
        ctx.strokeStyle = 'rgba(255,140,60,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 6, c.y + 60 - h); ctx.lineTo(x - 9, c.y + 60); ctx.stroke();
      }
      stalactites(ctx, c, [90, 40, 34], 14, 151, 26);
      lavaPool(ctx, c, c.y + 56, t, 1);
      for (const x of [c.x - 96, c.x + 96]) lavaFall(ctx, x, c.y - 70, c.y + 56, t);
    },
  };
  function lavaPool(ctx, c, sy, t, big) {
    ctx.fillStyle = lg(ctx, 0, sy, 0, c.y + c.ry, ['#fff0a0', '#ffa030', '#e04a18', '#8a1a08']);
    ctx.beginPath(); ctx.moveTo(c.x - c.rx - 10, c.y + c.ry + 10);
    for (let x = c.x - c.rx - 10; x <= c.x + c.rx + 10; x += 5) ctx.lineTo(x, sy + Math.sin(x * 0.07 + t * 1.4) * 2 + Math.sin(x * 0.13 - t) * 1.2);
    ctx.lineTo(c.x + c.rx + 10, c.y + c.ry + 10); ctx.fill();
    K.glow(ctx, c.x, sy, c.rx, [255, 140, 40], 0.3);
    // crust plates and bubbles
    const r = K.rand(c.s * 5 + 1);
    for (let i = 0; i < (big ? 9 : 6); i++) {
      const x = c.x - c.rx * 0.8 + r() * c.rx * 1.6 + Math.sin(t * 0.3 + i) * 4, y = sy + 8 + r() * (c.y + c.ry - sy - 14);
      ctx.fillStyle = 'rgba(90,30,20,.55)'; ctx.beginPath(); ctx.ellipse(x, y, 8 + r() * 6, 2.5, 0, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.6 + i * 0.21) % 1, x = c.x - c.rx * 0.6 + i * c.rx * 0.3;
      ctx.fillStyle = `rgba(255,240,160,${0.9 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x, sy - ph * 6, 1.5 + ph * 3, 0, TAU); ctx.fill();
    }
  }
  function lavaFall(ctx, x, y0, y1, t) {
    ctx.fillStyle = lg(ctx, x - 6, 0, x + 6, 0, ['#e05a18', '#ffd060', '#e05a18']); ctx.fillRect(x - 5, y0, 10, y1 - y0);
    ctx.strokeStyle = 'rgba(255,250,200,.8)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 9]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(x - 1, y0); ctx.lineTo(x - 1, y1); ctx.stroke(); ctx.setLineDash([]);
    K.glow(ctx, x, y1, 18, [255, 160, 60], 0.45);
  }
  function mushroomTiny(ctx, x, y, col, t) {
    ctx.fillStyle = '#f2e6c8'; ctx.fillRect(x - 1.2, y - 6, 2.4, 6);
    ctx.fillStyle = rg(ctx, x - 2, y - 8, 7, [rgb(lift(col, 50)), rgb(col), rgb(lift(col, -60))]); ctx.beginPath(); ctx.ellipse(x, y - 6, 5, 3.4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 1.5, y - 7.4, 0.9, 0, TAU); ctx.fill();
  }
  function shroom(ctx, x, y, s, col, t) {
    const h = 44 * s, cw = 22 * s, sw = Math.sin(t * 0.8) * 2 * s;
    K.glow(ctx, x + sw, y - h, cw * 2.2, col, 0.32 + 0.1 * Math.sin(t * 1.7));
    ctx.fillStyle = lg(ctx, x - 4 * s, 0, x + 4 * s, 0, ['#f6f0e0', '#c8bcd8', '#8a7aa0']);
    ctx.beginPath(); ctx.moveTo(x - 4 * s, y); ctx.quadraticCurveTo(x - 2 * s + sw * 0.5, y - h * 0.5, x - 3 * s + sw, y - h); ctx.lineTo(x + 3 * s + sw, y - h); ctx.quadraticCurveTo(x + 2 * s + sw * 0.5, y - h * 0.5, x + 4 * s, y); ctx.fill();
    ctx.fillStyle = rg(ctx, x + sw - cw * 0.3, y - h - cw * 0.4, cw * 1.3, [rgb(lift(col, 70)), rgb(col), rgb(lift(col, -90))]);
    ctx.beginPath(); ctx.moveTo(x + sw - cw, y - h + 2); ctx.quadraticCurveTo(x + sw - cw, y - h - cw * 0.8, x + sw, y - h - cw * 0.8); ctx.quadraticCurveTo(x + sw + cw, y - h - cw * 0.8, x + sw + cw, y - h + 2); ctx.quadraticCurveTo(x + sw, y - h - 3, x + sw - cw, y - h + 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; for (const [dx, dy, r] of [[-0.45, -0.45, 0.13], [0.2, -0.6, 0.1], [0.5, -0.3, 0.08]]) { ctx.beginPath(); ctx.arc(x + sw + dx * cw, y - h + dy * cw, r * cw, 0, TAU); ctx.fill(); }
    // gills glow
    ctx.fillStyle = rgb(lift(col, 40), 0.6); ctx.beginPath(); ctx.ellipse(x + sw, y - h + 1, cw * 0.85, 2.4 * s, 0, 0, Math.PI); ctx.fill();
  }
  function jelly(ctx, x, y, s, t) {
    const p = Math.sin(t * 3) * 0.1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + p), s * (1 - p));
    K.glow(ctx, 0, 0, 18, [255, 140, 220], 0.25);
    ctx.fillStyle = rg(ctx, -3, -4, 12, ['rgba(255,220,250,.9)', 'rgba(255,130,220,.7)', 'rgba(200,80,180,.5)']);
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-10, -12, 0, -12); ctx.quadraticCurveTo(10, -12, 10, 0); ctx.quadraticCurveTo(0, 3, -10, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,230,.7)'; ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, 1); ctx.quadraticCurveTo(i * 4 + Math.sin(t * 2 + i) * 3, 8, i * 4, 14); ctx.stroke(); }
    ctx.restore();
  }
  function beam(ctx, x0, y0, x1, y1, w) {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = w + 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,.35)'; ctx.lineWidth = w * 0.25; ctx.beginPath(); const dx = y1 === y0 ? 0 : -w * 0.25, dy = y1 === y0 ? -w * 0.25 : 0; ctx.moveTo(x0 + dx, y0 + dy); ctx.lineTo(x1 + dx, y1 + dy); ctx.stroke();
  }
  function lantern(ctx, x, y, t) {
    const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 6); ctx.stroke();
    K.glow(ctx, x, y, 26 * fl, [255, 200, 90], 0.45);
    ctx.fillStyle = '#4a3420'; ctx.fillRect(x - 4, y - 7, 8, 2); ctx.fillRect(x - 4, y + 5, 8, 2);
    ctx.fillStyle = rg(ctx, x, y, 6, ['#fffbe0', '#ffd060', '#e08a20']); ctx.beginPath(); ctx.roundRect(x - 3.5, y - 5, 7, 10, 2); ctx.fill();
  }
  function torch(ctx, x, y, t) {
    const fl = Math.sin(t * 11 + x) * 0.15 + Math.sin(t * 7.3 + y) * 0.1;
    ctx.fillStyle = '#5a3e22'; ctx.fillRect(x - 2, y, 4, 12);
    ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 4, y - 1, 8, 3);
    K.glow(ctx, x, y - 6, 30, [255, 180, 70], 0.4 + fl * 0.3);
    ctx.fillStyle = lg(ctx, 0, y - 16, 0, y, ['rgba(255,250,200,.95)', 'rgba(255,160,50,.9)', 'rgba(255,80,30,.7)']);
    ctx.beginPath(); ctx.moveTo(x - 4, y - 1); ctx.quadraticCurveTo(x - 5, y - 8, x + fl * 6, y - 16 - fl * 4); ctx.quadraticCurveTo(x + 5, y - 8, x + 4, y - 1); ctx.fill();
  }
  function idol(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = lg(ctx, -22, -26, 22, 26, ['#fff0a0', '#e0a628', '#8a5a10']);
    ctx.beginPath(); ctx.roundRect(-20, -24, 40, 46, 8); ctx.fill();
    ctx.strokeStyle = '#7a4a08'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#7a4a08'; ctx.fillRect(-16, -18, 32, 4);
    for (const d of [-1, 1]) { ctx.fillStyle = '#5a3406'; ctx.beginPath(); ctx.roundRect(d * 9 - 6, -8, 12, 8, 2); ctx.fill(); const g = 0.5 + 0.5 * Math.sin(t * 2); ctx.fillStyle = `rgba(80,255,180,${0.6 + 0.4 * g})`; ctx.beginPath(); ctx.arc(d * 9, -4, 2.4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#5a3406'; ctx.beginPath(); ctx.roundRect(-10, 6, 20, 8, 2); ctx.fill();
    ctx.fillStyle = '#fff6d0'; for (let i = -3; i <= 2; i++) ctx.fillRect(i * 3 + 0.5, 6, 2, 3);
    K.sheen(ctx, -4, -6, 22, 0.35);
    ctx.restore();
  }
  function skull(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = rg(ctx, -2, -3, 9, ['#fff8e6', '#d8c8a4', '#9a8862']); ctx.beginPath(); ctx.arc(0, -2, 7, Math.PI, 0); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.fill();
    ctx.fillStyle = '#4a3a28'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 2.7, -1.5, 1.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function cart(ctx, x, y, t) {
    ctx.fillStyle = lg(ctx, 0, y - 16, 0, y, ['#8a8a96', '#4a4a56']); ctx.beginPath(); ctx.moveTo(x - 16, y - 16); ctx.lineTo(x + 16, y - 16); ctx.lineTo(x + 12, y - 2); ctx.lineTo(x - 12, y - 2); ctx.fill();
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 6; i++) pebble(ctx, x - 11 + i * 4.4, y - 17 - (i % 2) * 3, 3, 2.6, [255, 200, 60], 0);
    for (const d of [-1, 1]) { ctx.fillStyle = '#2e2e36'; ctx.beginPath(); ctx.arc(x + d * 8, y, 3.4, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a8a96'; ctx.beginPath(); ctx.arc(x + d * 8, y, 1.2, 0, TAU); ctx.fill(); }
    K.sheen(ctx, x, y - 10, 12, 0.25);
  }
  function sparkle(ctx, x, y, r, c) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    ctx.restore();
  }

  // ---------- caverns + tunnels ----------
  function drawCaves(ctx, v, t) {
    const vis = (y0, y1) => y1 > v.y - 40 && y0 < v.y + v.h + 40;
    const tv = TUN.filter(T => { const ys = T.pts.map(p => p[1]); return vis(Math.min(...ys), Math.max(...ys)); });
    const cv = CAV.filter(c => vis(c.y - c.ry - 20, c.y + c.ry + 20));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 1) rim light on the rock around every hollow
    for (const T of tv) {
      const a = RG[T.ra].rim, b = RG[T.rb].rim, p = T.pts, k = T.lit ? 1 : 0.55;
      const gr = (al) => lg(ctx, p[0][0], p[0][1], p[3][0], p[3][1], [rgb(mix(a, [255, 220, 170], 0.3), al), rgb(mix(b, [255, 220, 170], 0.3), al)]);
      tunPath(ctx, T); ctx.strokeStyle = gr(0.7 * k); ctx.lineWidth = 33; ctx.stroke();
      // a darker earth collar inside the rim, so the tube reads as dug
    }
    for (const c of cv) {
      const k = c.locked ? 0.55 : 1, rim = RG[c.k].rim;
      cavPath(ctx, c, 0); ctx.strokeStyle = rgb(rim, 0.16 * k); ctx.lineWidth = 13; ctx.stroke();
      ctx.strokeStyle = rgb(lift(rim, 20), 0.95 * k); ctx.lineWidth = 3.4; ctx.stroke();
    }
    // 2) tunnel interiors (tube shading: darker edges, lighter middle)
    for (const T of tv) {
      const A = RG[T.ra], B = RG[T.rb], p = T.pts, dk = T.lit ? 0 : -18;
      for (const [lw, m, f] of [[30, 1, -14], [24, 0.7, -4], [16, 0.45, 4], [7, 0.3, 12]]) {
        tunPath(ctx, T); ctx.strokeStyle = lg(ctx, p[0][0], p[0][1], p[3][0], p[3][1], [rgb(lift(mix(mix(A.a, A.b, m), DIRT, 0.5), f + dk)), rgb(lift(mix(mix(B.a, B.b, m), DIRT, 0.5), f + dk))]); ctx.lineWidth = lw; ctx.stroke();
      }
      // pebbles and props along the tunnel floor
      const r = K.rand(T.a * 31 + T.b);
      for (let i = 1; i < 6; i++) { const u = i / 6 + (r() - 0.5) * 0.08, [x, y] = bz(p, u); pebble(ctx, x + (r() - 0.5) * 16, y + (r() - 0.5) * 10, 2 + r() * 2, 1.5 + r(), lift(mix(A.b, B.b, u), 30), r()); }
    }
    // 3) cavern interiors
    for (const c of cv) {
      const P = RG[c.k];
      cavPath(ctx, c);
      ctx.fillStyle = lg(ctx, 0, c.y - c.ry, 0, c.y + c.ry, [P.a, P.b]); ctx.fill();
      ctx.save(); cavPath(ctx, c); ctx.clip();
      // fog and an inner shadow ring near the walls
      SCENE[c.k](ctx, c, t);
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(10,6,16,.3)'; cavPath(ctx, c, 2); ctx.stroke();
      if (c.locked) { ctx.fillStyle = 'rgba(14,10,24,.32)'; ctx.fillRect(c.x - c.rx - 10, c.y - c.ry - 10, c.rx * 2 + 20, c.ry * 2 + 20); }
      ctx.restore();
    }
    ctx.restore();
  }
  // trails along the tunnels: lit = a glowing golden path with marching sparkles, dark = faint dashes
  function drawTrails(ctx, v, t) {
    ctx.save(); ctx.lineCap = 'round';
    for (const T of TUN) {
      const ys = T.pts.map(p => p[1]); if (Math.max(...ys) < v.y - 30 || Math.min(...ys) > v.y + v.h + 30) continue;
      if (T.lit) {
        ctx.globalCompositeOperation = 'lighter';
        tunPath(ctx, T); ctx.strokeStyle = 'rgba(255,210,90,.22)'; ctx.lineWidth = 12; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        tunPath(ctx, T); ctx.strokeStyle = '#9a5a10'; ctx.lineWidth = 6.5; ctx.stroke();
        tunPath(ctx, T); ctx.strokeStyle = lg(ctx, 0, T.pts[0][1], 0, T.pts[3][1], ['#ffe27a', '#f2b628']); ctx.lineWidth = 4.2; ctx.stroke();
        tunPath(ctx, T); ctx.setLineDash([2, 12]); ctx.lineDashOffset = -t * 22; ctx.strokeStyle = 'rgba(255,255,230,.95)'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
        // little lanterns hung along dug tunnels
        for (const u of [0.33, 0.66]) {
          const [x, y] = bz(T.pts, u); const fl = 0.8 + 0.2 * Math.sin(t * 8 + x);
          K.glow(ctx, x + 12, y - 4, 14 * fl, [255, 200, 90], 0.4);
          ctx.fillStyle = rg(ctx, x + 12, y - 4, 4, ['#fffbe0', '#ffc040', '#c06a10']); ctx.beginPath(); ctx.arc(x + 12, y - 4, 2.6, 0, TAU); ctx.fill();
        }
      } else {
        tunPath(ctx, T); ctx.setLineDash([0.1, 9]); ctx.strokeStyle = 'rgba(20,14,26,.4)'; ctx.lineWidth = 5.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,215,.55)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // ---------- platforms the levels stand on ----------
  function platform(ctx, x, y, reg, t, wide = 1) {
    const w = 30 * wide, y2 = y + 17;
    K.shadow(ctx, x, y2 + 8, w * 0.9, 5, 0.35);
    const P = {
      jungle: [[120, 90, 54], 'wood'], temple: [[178, 168, 128], 'stone'], bog: [[110, 84, 50], 'log'], lair: [[80, 120, 50], 'moss'],
      grotto: [[220, 120, 200], 'cap'], lagoon: [[90, 120, 128], 'rock'], mine: [[150, 104, 60], 'wood'], caves: [[90, 96, 160], 'hex'],
      geode: [[150, 90, 190], 'stone'], crystal: [[190, 120, 230], 'rock'], frost: [[210, 236, 250], 'ice'], storm: [[110, 100, 180], 'rock'],
      magma: [[70, 44, 52], 'rock'], core: [[70, 44, 52], 'rock'], surface: [[150, 104, 60], 'wood'],
    }[reg] || [[120, 90, 54], 'rock'];
    const [col, kind] = P;
    // body
    ctx.fillStyle = lg(ctx, 0, y2 - 4, 0, y2 + 12, [rgb(lift(col, 10)), rgb(lift(col, -45))]);
    ctx.beginPath(); ctx.moveTo(x - w, y2); ctx.quadraticCurveTo(x - w * 0.7, y2 + 14, x, y2 + 15); ctx.quadraticCurveTo(x + w * 0.7, y2 + 14, x + w, y2); ctx.closePath(); ctx.fill();
    // top face
    ctx.fillStyle = rg(ctx, x - w * 0.3, y2 - 4, w * 1.2, [rgb(lift(col, 50)), rgb(lift(col, 10)), rgb(lift(col, -20))]);
    ctx.beginPath(); ctx.ellipse(x, y2, w, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(lift(col, -50), 0.9); ctx.lineWidth = 1; ctx.stroke();
    if (kind === 'wood' || kind === 'log') { ctx.strokeStyle = rgb(lift(col, -30), 0.7); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x, y2, w * i / 4, 6 * i / 4, 0, 0, TAU); ctx.stroke(); } }
    if (kind === 'stone') { ctx.strokeStyle = rgb(lift(col, -40), 0.6); ctx.beginPath(); ctx.moveTo(x - w * 0.4, y2 - 5); ctx.lineTo(x - w * 0.3, y2 + 5); ctx.moveTo(x + w * 0.35, y2 - 5); ctx.lineTo(x + w * 0.45, y2 + 5); ctx.stroke(); }
    if (kind === 'moss') { ctx.fillStyle = 'rgba(150,220,80,.6)'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(x + i * w * 0.28, y2 + 4 + Math.abs(i), 3, 0, TAU); ctx.fill(); } }
    if (kind === 'cap') { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const [dx, dy] of [[-0.5, -1], [0.1, 1], [0.55, -2]]) { ctx.beginPath(); ctx.arc(x + dx * w, y2 + dy, 2.2, 0, TAU); ctx.fill(); } K.glow(ctx, x, y2, w, [255, 110, 220], 0.2); }
    if (kind === 'ice') { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x - w * 0.3, y2 - 1, w * 0.4, 2, 0, 0, TAU); ctx.fill(); for (let i = -2; i <= 2; i++) { ctx.fillStyle = 'rgba(210,240,255,.9)'; ctx.beginPath(); ctx.moveTo(x + i * w * 0.35 - 3, y2 + 8); ctx.lineTo(x + i * w * 0.35, y2 + 18 - Math.abs(i) * 2); ctx.lineTo(x + i * w * 0.35 + 3, y2 + 8); ctx.fill(); } }
    if (kind === 'hex') { ctx.strokeStyle = rgb(lift(col, -40), 0.6); ctx.beginPath(); for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * w * 0.5, y2 + Math.sin(a) * 3); } ctx.closePath(); ctx.stroke(); }
    if (reg === 'magma' || reg === 'core') { ctx.strokeStyle = 'rgba(255,150,60,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - w * 0.6, y2 + 2); ctx.lineTo(x - w * 0.2, y2 + 9); ctx.lineTo(x + w * 0.3, y2 + 6); ctx.stroke(); }
  }

  // ---------- level nodes ----------
  const STATE_COL = {
    done: ['#fff3a0', '#f2b628', '#a66a10', '#7a4a08'],
    tried: ['#ffe2b8', '#f08a3a', '#9a4214', '#6a2a08'],
    open: ['#e2ff9a', '#72c83a', '#2e6a18', '#1e4a10'],
    locked: ['#a8a29a', '#6e6860', '#3e3a34', '#2a2622'],
  };
  function stars(ctx, l, x, y, r = 6) {
    const on = l.stars;
    for (let j = 0; j < 3; j++) { const sx = x + (j - 1) * (r * 2.1), sy = y - (j === 1 ? r * 0.55 : 0); K.star(ctx, sx, sy, j === 1 ? r * 1.15 : r, j < on); }
  }
  function padlock(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -4, 4.4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -4, 0, 7, ['#f6ead0', '#c4a868', '#8a6a30']); ctx.beginPath(); ctx.roundRect(-6.5, -4, 13, 10, 2.4); ctx.fill();
    ctx.strokeStyle = '#6a4a18'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#5a3a10'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill(); ctx.fillRect(-0.8, 0.5, 1.6, 3.2);
    ctx.restore();
  }
  function nameTag(ctx, s, x, y, state) {
    ctx.font = `8.5px ${FONT}`; const w = ctx.measureText(s).width + 12;
    pill(ctx, x, y, w, 13, state === 'locked' ? 'rgba(40,32,44,.72)' : 'rgba(58,34,18,.85)', state === 'locked' ? 'rgba(26,20,30,.72)' : 'rgba(34,18,8,.85)', state === 'locked' ? 'rgba(160,150,170,.3)' : 'rgba(255,214,140,.45)');
    text(ctx, s, x, y + 0.5, 8.5, state === 'locked' ? 'rgba(220,210,220,.7)' : '#fff1d6');
  }
  function node(ctx, l, t) {
    const [x, y] = POS[l.id], st = l.state, C = STATE_COL[st], R = 17, reg = l.id === 1 ? 'surface' : regOf(l.id);
    platform(ctx, x, y, reg, t);
    if (st === 'open' || st === 'tried') {   // inviting pulse
      const p = (t * 0.9) % 1;
      ctx.strokeStyle = st === 'open' ? `rgba(200,255,120,${0.7 * (1 - p)})` : `rgba(255,190,110,${0.6 * (1 - p)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, R + 3 + p * 14, 0, TAU); ctx.stroke();
      K.glow(ctx, x, y, R * 2.4, st === 'open' ? [190, 255, 120] : [255, 180, 90], 0.3 + 0.12 * Math.sin(t * 3));
    }
    if (st === 'done') K.glow(ctx, x, y, R * 1.9, [255, 210, 90], 0.18);
    // the medallion: a coloured ring with a cream face
    ctx.fillStyle = rgb([0, 0, 0], 0.3); ctx.beginPath(); ctx.ellipse(x, y + 3, R, R * 0.95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, x - R * 0.35, y - R * 0.4, R * 1.2, C.slice(0, 3)); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = C[3]; ctx.lineWidth = 1.2; ctx.stroke();
    const lock = st === 'locked';
    ctx.fillStyle = rg(ctx, x - 4, y - 5, R, lock ? ['#8a847c', '#5a564f'] : ['#fffaf0', '#f2dcae', '#c89a5e']); ctx.beginPath(); ctx.arc(x, y, R - 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = lock ? 'rgba(40,36,30,.6)' : rgb([150, 100, 50], 0.7); ctx.lineWidth = 1; ctx.stroke();
    text(ctx, String(l.id), x + 0.5, y + 2, 15, lock ? 'rgba(255,255,255,.12)' : 'rgba(255,255,240,.7)');
    text(ctx, String(l.id), x, y + 1, 15, lock ? '#cfc8bc' : '#6a3a12');
    K.sheen(ctx, x, y, R, 0.5);
    if (lock) padlock(ctx, x + R * 0.72, y + R * 0.62, 0.95);
    else stars(ctx, l, x, y - R - 7, 5.6);
    nameTag(ctx, l.name, x, y + R + 22, st);
  }
  // boss lairs: a framed portrait landmark, a BOSS banner and the level number on a plate
  function boss(ctx, l, t) {
    const [x, y] = POS[l.id], st = l.state, lock = st === 'locked', R = 25, reg = regOf(l.id);
    platform(ctx, x, y + 12, reg, t, 1.7);
    if (l.id === 9) flytrapJaws(ctx, x, y, R, t, 'back');
    if (l.id === 15) crystalCrown(ctx, x, y, R, t, lock);
    if (l.id === 20) dragonGate(ctx, x, y, R, t, lock);
    if (st === 'open') { K.glow(ctx, x, y, R * 3, [255, 200, 80], 0.32 + 0.12 * Math.sin(t * 3)); const p = (t * 0.8) % 1; ctx.strokeStyle = `rgba(255,220,120,${0.8 * (1 - p)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R + 5 + p * 18, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, y + 3, R + 3, 0, TAU); ctx.fill();
    const ring = lock ? STATE_COL.locked : ['#ffb0a0', '#e0402a', '#8a1a10', '#5a0a06'];
    ctx.fillStyle = rg(ctx, x - R * 0.35, y - R * 0.4, R * 1.4, ring.slice(0, 3)); ctx.beginPath(); ctx.arc(x, y, R + 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = ring[3]; ctx.lineWidth = 1.2; ctx.stroke();
    K.badge(ctx, 'boss-' + l.boss, x, y, R, lock ? '#8a847c' : '#ffcf3a');
    if (lock) { ctx.fillStyle = 'rgba(30,24,40,.5)'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }
    K.sheen(ctx, x, y, R + 2, 0.4);
    if (l.id === 9) flytrapJaws(ctx, x, y, R, t, 'front');
    // banner
    const by2 = y - R - 16;
    ctx.fillStyle = lock ? '#4a4450' : '#a8281a';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 22, by2 - 5); ctx.lineTo(x + d * 34, by2 - 5); ctx.lineTo(x + d * 29, by2 + 1); ctx.lineTo(x + d * 34, by2 + 7); ctx.lineTo(x + d * 22, by2 + 7); ctx.fill(); }
    pill(ctx, x, by2, 50, 15, lock ? '#7a7280' : '#ff5a3a', lock ? '#4e4856' : '#b8301a', lock ? '#3a3440' : '#7a1a0a');
    text(ctx, 'BOSS', x, by2 + 0.5, 10, '#fff1d6', lock ? 'rgba(40,30,40,.6)' : 'rgba(110,20,10,.8)');
    // number plate and name
    const ny = y + R + 12;
    ctx.fillStyle = rg(ctx, x - 3, ny - 3, 11, lock ? STATE_COL.locked.slice(0, 3) : STATE_COL.open.slice(0, 3)); ctx.beginPath(); ctx.arc(x, ny, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = lock ? '#2a2622' : '#1e4a10'; ctx.lineWidth = 1; ctx.stroke();
    text(ctx, String(l.id), x, ny + 1, 12, lock ? '#d8d0c4' : '#fff', lock ? 'rgba(30,26,22,.6)' : 'rgba(20,60,10,.8)');
    if (lock) padlock(ctx, x + 14, ny + 1, 0.85); else stars(ctx, l, x, y - R - 32, 5.6);
    nameTag(ctx, l.name, x, ny + 21, st);
  }
  function flytrapJaws(ctx, x, y, R, t, layer) {
    const open = 0.5 + 0.5 * Math.sin(t * 1.3), gap = R + 6 + open * 6;
    if (layer === 'back') {   // the stem and leaves behind the portrait
      ctx.strokeStyle = '#2e5a1a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.quadraticCurveTo(x + 6, y + 14, x, y); ctx.stroke();
      ctx.strokeStyle = '#5a9a30'; ctx.lineWidth = 4; ctx.stroke();
      return;
    }
    for (const d of [-1, 1]) {   // two toothy lobes clasping the portrait from above and below
      ctx.save(); ctx.translate(x, y); ctx.scale(1, d);
      ctx.fillStyle = lg(ctx, 0, -gap - 14, 0, -gap + 6, ['#9ae05a', '#4e9a2a', '#2a5a16']);
      ctx.beginPath(); ctx.moveTo(-R - 14, -R * 0.35); ctx.quadraticCurveTo(-R - 8, -gap - 16, 0, -gap - 14); ctx.quadraticCurveTo(R + 8, -gap - 16, R + 14, -R * 0.35);
      ctx.quadraticCurveTo(R + 2, -gap + 2, 0, -gap + 2); ctx.quadraticCurveTo(-R - 2, -gap + 2, -R - 14, -R * 0.35); ctx.fill();
      ctx.fillStyle = '#e04a5a'; ctx.beginPath(); ctx.moveTo(-R - 8, -R * 0.5); ctx.quadraticCurveTo(0, -gap - 4, R + 8, -R * 0.5); ctx.quadraticCurveTo(0, -gap + 2, -R - 8, -R * 0.5); ctx.fill();
      ctx.fillStyle = '#fffbe6';
      for (let i = -4; i <= 4; i++) { const tx = i * (R + 6) / 4.6, ty = -gap + 2 + Math.abs(i) * Math.abs(i) * 0.6; ctx.beginPath(); ctx.moveTo(tx - 2.4, ty); ctx.lineTo(tx, ty + 7); ctx.lineTo(tx + 2.4, ty); ctx.fill(); }
      ctx.strokeStyle = 'rgba(220,255,160,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-R, -gap - 6); ctx.quadraticCurveTo(-R * 0.4, -gap - 13, 0, -gap - 12); ctx.stroke();
      ctx.restore();
    }
  }
  function crystalCrown(ctx, x, y, R, t, lock) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.36, len = 16 + (i % 2 ? 0 : 10) - Math.abs(i - 4) * 1.5;
      ctx.save(); ctx.translate(x + Math.cos(a) * (R + 2), y + Math.sin(a) * (R + 2)); ctx.rotate(a + Math.PI / 2);
      const col = lock ? [150, 130, 170] : i % 2 ? [255, 170, 240] : [190, 120, 250];
      ctx.fillStyle = lg(ctx, -5, 0, 5, 0, [rgb(lift(col, 60)), rgb(col), rgb(lift(col, -80))]);
      ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(-4, -len * 0.8); ctx.lineTo(0, -len); ctx.lineTo(4, -len * 0.8); ctx.lineTo(5, 4); ctx.fill();
      ctx.restore();
    }
  }
  function dragonGate(ctx, x, y, R, t, lock) {
    // an obsidian arch with horns and glowing lava seams
    ctx.fillStyle = lg(ctx, x - 50, 0, x + 50, 0, ['#4a2e3a', '#24141c', '#140a10']);
    ctx.beginPath(); ctx.moveTo(x - 46, y + 28); ctx.lineTo(x - 42, y - 20); ctx.quadraticCurveTo(x, y - 62, x + 42, y - 20); ctx.lineTo(x + 46, y + 28); ctx.lineTo(x + 32, y + 28); ctx.lineTo(x + 30, y - 10); ctx.quadraticCurveTo(x, y - 44, x - 30, y - 10); ctx.lineTo(x - 32, y + 28); ctx.fill();
    for (const d of [-1, 1]) {
      ctx.fillStyle = lg(ctx, 0, y - 70, 0, y - 30, ['#f6e6c8', '#b89a78', '#6a5240']);
      ctx.beginPath(); ctx.moveTo(x + d * 30, y - 34); ctx.quadraticCurveTo(x + d * 56, y - 54, x + d * 52, y - 80); ctx.quadraticCurveTo(x + d * 46, y - 54, x + d * 22, y - 42); ctx.fill();
    }
    const g = 0.6 + 0.4 * Math.sin(t * 2);
    ctx.strokeStyle = lock ? `rgba(255,120,50,${0.35 * g})` : `rgba(255,150,60,${0.8 * g})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 38, y + 20); ctx.lineTo(x - 36, y - 16); ctx.quadraticCurveTo(x, y - 52, x + 36, y - 16); ctx.lineTo(x + 38, y + 20); ctx.stroke();
    K.glow(ctx, x, y, 60, [255, 120, 40], 0.18 * g);
  }

  // ---------- fork signposts ----------
  function signpost(ctx, x, y, arrows, t) {
    ctx.fillStyle = lg(ctx, x - 3, 0, x + 3, 0, ['#a8784a', '#6a4424']); ctx.fillRect(x - 2.5, y - 4, 5, 38);
    K.shadow(ctx, x, y + 34, 10, 3, 0.4);
    arrows.forEach(([label, dir, col], i) => {
      const yy = y + i * 15, w = 52, x0 = dir < 0 ? x - w + 8 : x - 8;
      ctx.save();
      ctx.fillStyle = lg(ctx, 0, yy - 6, 0, yy + 6, [rgb(lift(col, 40)), rgb(col), rgb(lift(col, -40))]);
      ctx.beginPath();
      if (dir < 0) { ctx.moveTo(x0 - 8, yy); ctx.lineTo(x0, yy - 6); ctx.lineTo(x0 + w, yy - 6); ctx.lineTo(x0 + w, yy + 6); ctx.lineTo(x0, yy + 6); }
      else if (dir > 0) { ctx.moveTo(x0, yy - 6); ctx.lineTo(x0 + w, yy - 6); ctx.lineTo(x0 + w + 8, yy); ctx.lineTo(x0 + w, yy + 6); ctx.lineTo(x0, yy + 6); }
      else { ctx.moveTo(x - w / 2, yy - 6); ctx.lineTo(x + w / 2, yy - 6); ctx.lineTo(x + w / 2, yy + 3); ctx.lineTo(x, yy + 9); ctx.lineTo(x - w / 2, yy + 3); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgb(lift(col, -70)); ctx.lineWidth = 1; ctx.stroke();
      text(ctx, label, dir < 0 ? x0 + w / 2 - 2 : dir > 0 ? x0 + w / 2 + 2 : x, yy + 0.5, 7.5, '#fff8e6', rgb(lift(col, -80), 0.9));
      ctx.restore();
    });
  }

  // ---------- the future: unexcavated rock, a drill and a dig-here sign ----------
  function drawFuture(ctx, v, t) {
    if (v.y + v.h < 2660) return;
    const x = 180, top = 2684;
    // dashed outline of the planned shaft and the next chambers, still solid rock
    ctx.save(); ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 8; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,214,150,.45)';
    ctx.beginPath(); ctx.moveTo(x - 15, top); ctx.lineTo(x - 15, 2760); ctx.moveTo(x + 15, top); ctx.lineTo(x + 15, 2760); ctx.stroke();
    for (const [cx, cy, rx] of [[70, 2800, 44], [180, 2808, 50], [290, 2800, 44]]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, 30, 0, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - 15, 2770); ctx.quadraticCurveTo(110, 2770, 100, 2780); ctx.moveTo(x + 15, 2770); ctx.quadraticCurveTo(250, 2770, 260, 2780); ctx.stroke();
    ctx.restore();
    for (const [cx, cy] of [[70, 2800], [180, 2808], [290, 2800]]) {
      ctx.fillStyle = 'rgba(30,14,10,.4)'; ctx.beginPath(); ctx.ellipse(cx, cy, 30, 20, 0, 0, TAU); ctx.fill();
      text(ctx, '?', cx, cy + 1, 22, 'rgba(255,214,150,.6)', 'rgba(40,16,10,.5)');
    }
    // the drill rig boring down from the core's floor (spinning bit, rumbling)
    const sh = Math.sin(t * 40) * 0.8, dy = 2700 + Math.sin(t * 1.2) * 2;
    ctx.save(); ctx.translate(x + sh, dy);
    // rubble spray
    for (let i = 0; i < 8; i++) { const u = (t * 1.6 + i / 8) % 1, a = -Math.PI / 2 + (i - 3.5) * 0.4; pebble(ctx, Math.cos(a) * 26 * u, 40 + Math.sin(a) * 26 * u - 10 * u, 2.4, 1.8, [120, 70, 50], i); }
    ctx.fillStyle = lg(ctx, -12, 0, 12, 0, ['#d8d8e0', '#8a8a98', '#4a4a56']);
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(12, 8); ctx.lineTo(0, 44); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(40,40,50,.6)'; ctx.lineWidth = 2.4; const off = (t * 30) % 10;
    for (let i = -2; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-14, 8 + i * 10 + off); ctx.lineTo(14, 14 + i * 10 + off); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = lg(ctx, -16, 0, 16, 0, ['#ffd860', '#f0a020', '#a85a08']); ctx.beginPath(); ctx.roundRect(-16, -14, 32, 22, 4); ctx.fill();
    ctx.strokeStyle = '#7a4006'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#2a2a30'; for (let i = -12; i < 16; i += 8) { ctx.beginPath(); ctx.moveTo(i, -14); ctx.lineTo(i + 4, -14); ctx.lineTo(i, 8); ctx.lineTo(i - 4, 8); ctx.fill(); }
    K.sheen(ctx, 0, -6, 16, 0.4);
    ctx.restore();
    // the sign at the side
    const sx = 288, sy = 2700;
    ctx.fillStyle = lg(ctx, sx - 3, 0, sx + 3, 0, ['#a8784a', '#5a3a1e']); ctx.fillRect(sx - 2.5, sy, 5, 40);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.06);
    ctx.fillStyle = lg(ctx, 0, -22, 0, 10, ['#e8c088', '#b88a52', '#7a5430']); ctx.beginPath(); ctx.roundRect(-46, -22, 92, 32, 4); ctx.fill();
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(90,58,30,.35)'; ctx.lineWidth = 1; for (const yy of [-12, -2]) { ctx.beginPath(); ctx.moveTo(-44, yy); ctx.lineTo(44, yy); ctx.stroke(); }
    text(ctx, 'DIG HERE!', 0, -12, 11, '#c8301a', 'rgba(255,240,210,.7)');
    text(ctx, 'More levels coming', 0, 2, 7.6, '#4a2a10');
    for (const d of [-1, 1]) { ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.arc(d * 40, -16, 1.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    // hazard tape stripes on the rock edge
    ctx.save(); ctx.translate(64, 2716); ctx.rotate(-0.12);
    ctx.fillStyle = '#ffd040'; ctx.fillRect(-40, -5, 80, 10);
    ctx.fillStyle = '#2a2420'; for (let i = -40; i < 40; i += 10) { ctx.beginPath(); ctx.moveTo(i, -5); ctx.lineTo(i + 5, -5); ctx.lineTo(i, 5); ctx.lineTo(i - 5, 5); ctx.fill(); }
    ctx.restore();
    // a pickaxe and a shovel stuck in the ground
    ctx.save(); ctx.translate(40, 2752); ctx.rotate(-0.4);
    ctx.fillStyle = '#8a6236'; ctx.fillRect(-1.6, -24, 3.2, 30);
    ctx.fillStyle = lg(ctx, -14, -26, 14, -20, ['#e0e0ea', '#8a8a98']); ctx.beginPath(); ctx.moveTo(-15, -20); ctx.quadraticCurveTo(0, -30, 15, -20); ctx.quadraticCurveTo(0, -25, -15, -20); ctx.fill();
    ctx.restore();
  }

  // ---------- the player, the advantage hints, ambient life ----------
  function drawPlayer(ctx, t) {
    const cur = LEVELS.find(l => l.current); if (!cur) return;
    const [x, y] = POS[cur.id], bob = Math.sin(t * 2.4) * 4;
    // "you are here": a bouncing gold arrow and a ground ring
    ctx.strokeStyle = `rgba(255,230,120,${0.6 + 0.3 * Math.sin(t * 4)})`; ctx.lineWidth = 2.5; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 14;
    ctx.beginPath(); ctx.ellipse(x, y + 32, 58, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // the rocket parked beside the lair, ready to go
    const rx = x - 74, ry = y - 4 + bob;
    K.rocket(ctx, rx, ry, 0.95, t);
    const ay = ry - 46 + Math.abs(Math.sin(t * 3)) * -6;
    pill(ctx, rx, ay - 10, 66, 16, '#fff6c8', '#ffcf3a', '#a66a10');
    text(ctx, 'YOU ARE HERE', rx, ay - 9.5, 8, '#7a3a08');
    ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.moveTo(rx - 6, ay - 2); ctx.lineTo(rx + 6, ay - 2); ctx.lineTo(rx, ay + 5); ctx.fill();
  }
  function advantage(ctx, t) {
    for (const l of LEVELS) {
      if (!(l.current || l.state === 'open' || l.state === 'tried')) continue;
      const [x, y] = POS[l.id], big = !!l.boss, bx = x + (big ? 38 : 22), byy = y - (big ? 26 : 16), s = 1 + 0.06 * Math.sin(t * 3 + l.id);
      K.glow(ctx, bx, byy, 18, [255, 214, 90], 0.35);
      K.badge(ctx, l.pilot, bx, byy, 11 * s, '#ffcf3a');
      // a little up-arrow chip = "this pilot has the edge here"
      ctx.fillStyle = rg(ctx, bx + 7, byy + 7, 6, ['#b8ff80', '#3aa020']); ctx.beginPath(); ctx.arc(bx + 8, byy + 8, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1e5a10'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx + 8, byy + 4.6); ctx.lineTo(bx + 11, byy + 8.4); ctx.lineTo(bx + 5, byy + 8.4); ctx.fill(); ctx.fillRect(bx + 7, byy + 8, 2, 3);
      sparkle(ctx, bx - 10 + Math.sin(t * 2) * 2, byy - 10, 3 + 2 * Math.abs(Math.sin(t * 3 + l.id)), '#fff6c0');
    }
  }
  const MOTES = [
    [0, 250, 'pollen', [255, 240, 150]], [260, 640, 'dust', [230, 200, 160]], [640, 1020, 'spore', [210, 255, 120]],
    [1020, 1214, 'spore', [200, 255, 120]], [1214, 1376, 'spore', [120, 255, 240]], [1376, 1708, 'bubble', [190, 255, 250]],
    [1708, 2072, 'dust', [190, 210, 255]], [2072, 2292, 'snow', [240, 250, 255]], [2292, 2700, 'ember', [255, 170, 70]],
  ];
  function ambient(ctx, v, t) {
    for (const [y0, y1, kind, c] of MOTES) {
      if (y1 < v.y || y0 > v.y + v.h) continue;
      ctx.save(); ctx.translate(0, y0); K.motes(ctx, W, y1 - y0, t, kind, c, Math.round((y1 - y0) / 22), y0 + 3); ctx.restore();
    }
  }

  // ---------- assemble ----------
  function draw(ctx, t, v) {
    ctx.fillStyle = '#2a1c14'; ctx.fillRect(v.x, v.y, v.w, v.h);
    drawEarth(ctx, v, t);
    drawSurface(ctx, v, t);
    drawCaves(ctx, v, t);
    drawTrails(ctx, v, t);
    // fork signposts (the choice: pick a tunnel)
    if (v.y < 640 && v.y + v.h > 520) signpost(ctx, 238, 548, [['TEMPLE', -1, [200, 160, 70]], ['BOG', 1, [120, 170, 40]]], t);
    if (v.y < 1360 && v.y + v.h > 1260) signpost(ctx, 112, 1290, [['LAGOON', -1, [40, 160, 170]], ['MINE', 1, [170, 110, 50]]], t);
    if (v.y < 2140 && v.y + v.h > 2030) signpost(ctx, 180, 2066, [['CRYSTAL', -1, [170, 90, 210]], ['FROST', 0, [90, 160, 210]], ['STORM', 1, [110, 90, 200]]], t);
    drawFuture(ctx, v, t);
    for (const l of LEVELS) {
      const y = POS[l.id][1]; if (y < v.y - 80 || y > v.y + v.h + 80) continue;
      (l.boss ? boss : node)(ctx, l, t);
    }
    if (v.y < 1220 && v.y + v.h > 1000) drawPlayer(ctx, t);
    advantage(ctx, t);
    ambient(ctx, v, t);
  }
  // camera: a slow eased tour from the surface, a pause on the player, down to the core and the dig site, then back up
  const KEYS = [[0, 0], [2, 0], [7.5, 760], [12, 760], [18.5, H - 720], [20.5, H - 720], [24, 0]];
  function camera(t) {
    const u = ((t % 24) + 24) % 24;
    for (let i = 0; i + 1 < KEYS.length; i++) {
      const [t0, y0] = KEYS[i], [t1, y1] = KEYS[i + 1];
      if (u <= t1) { const k = K.smooth(t0, t1, u); return { x: 0, y: y0 + (y1 - y0) * k }; }
    }
    return { x: 0, y: 0 };
  }
  PV.maps.strata = { W, H, camera, draw };
})();
