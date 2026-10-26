// Concept 1: The Great Palm. The whole adventure is one colossal palm climbed from the jungle roots to a smouldering
// ember crown. Levels sit on knots, ledges and shelves on the trunk; the forks are real limbs that split off the trunk
// and grow back into it; the regions are stacked up the tree; future levels are new shoots growing up into the cloud.
(() => {
  const TAU = K.TAU, PI = Math.PI, W = 360, H = 2600;
  const lg = K.lg, rg = K.rg, rgb = K.rgb, mix = K.mix, lift = K.lift, sm = K.smooth, clamp = K.clamp, lerp = K.lerp;
  const FONT = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", system-ui, sans-serif';
  const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const fr = x => x - Math.floor(x);
  let V = { x: 0, y: 0, w: W, h: H };
  const vis = (y0, y1) => y1 >= V.y - 40 && y0 <= V.y + V.h + 40;

  // ------------------------------------------------------------------ layout
  const POS = {
    1: [116, 2482], 2: [240, 2392], 3: [178, 2284],
    4: [124, 2160], 5: [92, 2042], 6: [146, 1934],
    7: [288, 2168], 8: [300, 2006],
    9: [180, 1806],
    10: [180, 1664],
    11: [82, 1550], 12: [74, 1420], 13: [284, 1500],
    14: [180, 1318], 15: [180, 1176],
    16: [74, 1012], 17: [180, 990], 18: [286, 1012],
    19: [180, 850], 20: [180, 650],
  };
  const CTRL = {
    '3-7': [[236, 2280], [288, 2232]],
    '7-8': [[292, 2110], [302, 2060]],
    '8-9': [[300, 1900], [252, 1808]],
    '10-11': [[126, 1660], [82, 1616]],
    '10-13': [[236, 1660], [284, 1574]],
    '12-14': [[74, 1344], [128, 1318]],
    '13-14': [[284, 1404], [232, 1318]],
    '15-16': [[118, 1172], [74, 1082]],
    '15-18': [[242, 1172], [286, 1082]],
    '16-19': [[74, 922], [128, 852]],
    '18-19': [[286, 922], [232, 852]],
    '1-2': [[150, 2420], [210, 2410]],
    '2-3': [[250, 2340], [210, 2290]],
  };
  const curve = (a, b) => {
    const A = POS[a], B = POS[b], k = CTRL[a + '-' + b];
    if (k) return [A, k[0], k[1], B];
    const dy = A[1] - B[1];
    return [A, [A[0], A[1] - dy * 0.5], [B[0], B[1] + dy * 0.5], B];
  };
  const bez = (c, u) => { const v = 1 - u; return [0, 1].map(i => v * v * v * c[0][i] + 3 * v * v * u * c[1][i] + 3 * v * u * u * c[2][i] + u * u * u * c[3][i]); };
  const bezPath = (ctx, c) => { ctx.moveTo(c[0][0], c[0][1]); ctx.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]); };
  const cyBounds = c => [Math.min(c[0][1], c[3][1], c[1][1], c[2][1]), Math.max(c[0][1], c[3][1], c[1][1], c[2][1])];

  // which region is at height y (for tints, rims and motes)
  const RIM = {
    jungle: [200, 250, 130], temple: [255, 220, 140], bog: [200, 240, 80], grotto: [120, 250, 255], lagoon: [130, 240, 230],
    mine: [255, 200, 110], caves: [160, 200, 255], crystal: [240, 160, 255], frost: [210, 240, 255], storm: [170, 170, 255], magma: [255, 140, 60],
  };

  // ------------------------------------------------------------------ bark
  // palm-bark colour by height: warm brown at the roots, cooler grey-violet up high, charred near the ember crown
  const BARK = [[2600, [112, 78, 48]], [2100, [126, 90, 56]], [1500, [118, 88, 62]], [1250, [100, 86, 92]], [1000, [108, 104, 128]], [880, [84, 62, 62]], [700, [64, 40, 36]], [560, [56, 34, 30]]];
  const bark = y => {
    for (let i = 0; i < BARK.length - 1; i++) {
      const [ya, ca] = BARK[i], [yb, cb] = BARK[i + 1];
      if (y <= ya && y >= yb) return mix(ca, cb, (ya - y) / (ya - yb));
    }
    return y > 2600 ? BARK[0][1] : BARK[BARK.length - 1][1];
  };
  const TRUNK_TOP = 612;
  const cx = y => 180 + Math.sin(y * 0.0042 + 0.6) * 5;
  const hw = y => {
    if (y > 2430) { const u = (y - 2430) / 170; return 72 + u * u * 120; }
    return 32 + Math.max(0, y - TRUNK_TOP) / (2430 - TRUNK_TOP) * 40;
  };

  function sky(ctx) {
    const g = lg(ctx, 0, 0, 0, H, [
      [0, '#171433'], [0.05, '#2c2452'], [0.12, '#5b3c66'], [0.17, '#9a5652'], [0.22, '#8a4434'], [0.26, '#7a3a30'], [0.31, '#5e3a48'],
      [0.34, '#56598f'], [0.40, '#6a78ae'], [0.45, '#4c5292'], [0.52, '#3c5f86'], [0.6, '#3a6e6c'], [0.68, '#3f6f5c'],
      [0.78, '#467a52'], [0.88, '#3c7046'], [1, '#1d3d22'],
    ]);
    ctx.fillStyle = g; ctx.fillRect(V.x, V.y - 2, V.w, V.h + 4);
  }

  // soft cloud puff made of overlapping circles, lit from the top-left
  function cloud(ctx, x, y, s, top, bot, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    const puffs = [[-1.1, 0.25, 0.55], [-0.5, -0.15, 0.75], [0.25, -0.35, 0.85], [0.95, 0.05, 0.62], [0.2, 0.3, 0.7], [-0.4, 0.38, 0.6]];
    ctx.fillStyle = lg(ctx, 0, y - s, 0, y + s * 0.8, [top, bot]);
    ctx.beginPath(); for (const [px, py, pr] of puffs) { ctx.moveTo(x + px * s + pr * s, y + py * s); ctx.arc(x + px * s, y + py * s, pr * s, 0, TAU); } ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ background bands
  function farJungle(ctx, t) {
    if (!vis(1850, 2600)) return;
    // light shafts
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x0 = 30 + i * 90 + Math.sin(t * 0.25 + i) * 8;
      ctx.fillStyle = lg(ctx, 0, 1900, 0, 2560, ['rgba(230,255,170,0)', 'rgba(230,255,170,.07)', 'rgba(230,255,170,0)']);
      ctx.beginPath(); ctx.moveTo(x0, 1900); ctx.lineTo(x0 + 30, 1900); ctx.lineTo(x0 + 110, 2560); ctx.lineTo(x0 + 50, 2560); ctx.fill();
    }
    ctx.restore();
    // far trunks in two fogged layers
    for (const [layer, col] of [[0, 'rgba(40,82,50,.55)'], [1, 'rgba(26,60,34,.6)']]) {
      const R = K.rand(31 + layer * 9);
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const x = R() * W, w = 10 + R() * (layer ? 22 : 14), top = 1880 + R() * 120;
        if (Math.abs(x - 180) < 60) continue;
        ctx.beginPath(); ctx.moveTo(x - w / 2, 2600);
        for (let y = 2600; y >= top; y -= 40) ctx.lineTo(x - w / 2 + Math.sin(y * 0.01 + i) * 4, y);
        for (let y = top; y <= 2600; y += 40) ctx.lineTo(x + w / 2 + Math.sin(y * 0.01 + i) * 4, y);
        ctx.fill();
        // a little fogged palm crown on top
        for (let f = 0; f < 6; f++) {
          const a = -PI / 2 + (f - 2.5) * 0.55, L = 26 + R() * 14;
          ctx.beginPath(); ctx.moveTo(x, top);
          ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.6, top + Math.sin(a) * L * 0.6 - 6, x + Math.cos(a) * L, top + Math.sin(a) * L * 0.4 + 10);
          ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5, top + Math.sin(a) * L * 0.4 + 2, x, top + 4); ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(70,122,82,.12)'; ctx.fillRect(0, 1880, W, 720);
    }
  }

  function farMiddle(ctx, t) {
    if (!vis(1250, 1950)) return;
    // distant sister palms in the teal haze
    ctx.fillStyle = 'rgba(52,104,104,.45)';
    for (const [x, top, w] of [[22, 1520, 16], [338, 1430, 18], [300, 1820, 12]]) {
      ctx.beginPath(); ctx.moveTo(x - w / 2, 1960); ctx.quadraticCurveTo(x - w / 2 + 6, (top + 1960) / 2, x - 3, top); ctx.lineTo(x + 3, top); ctx.quadraticCurveTo(x + w / 2 + 6, (top + 1960) / 2, x + w / 2, 1960); ctx.fill();
      for (let f = 0; f < 7; f++) {
        const a = -PI / 2 + (f - 3) * 0.5, L = 34;
        ctx.beginPath(); ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.7, top + Math.sin(a) * L * 0.7 - 6, x + Math.cos(a) * L * 1.1, top + Math.sin(a) * L * 0.3 + 14);
        ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5, top + Math.sin(a) * L * 0.3 + 2, x, top + 4); ctx.fill();
      }
    }
    // mist bands drifting
    for (let i = 0; i < 5; i++) {
      const y = 1300 + i * 130, x = fr(hash(i, 4) + t * 0.006 * (i % 2 ? 1 : -1)) * (W + 240) - 120;
      cloud(ctx, x, y, 36 + hash(i, 5) * 20, 'rgba(150,210,200,.22)', 'rgba(90,150,150,.05)');
    }
  }

  function farHigh(ctx, t) {
    if (!vis(860, 1320)) return;
    // far snowy peaks poking through a cloud sea far below
    ctx.fillStyle = lg(ctx, 0, 1140, 0, 1320, ['rgba(130,140,200,.6)', 'rgba(110,130,180,.35)', 'rgba(70,110,140,0)']);
    ctx.beginPath(); ctx.moveTo(-10, 1300);
    const pk = [[30, 1180], [70, 1240], [110, 1150], [160, 1250], [250, 1240], [300, 1140], [340, 1210], [370, 1170]];
    for (const [x, y] of pk) ctx.lineTo(x, y);
    ctx.lineTo(370, 1320); ctx.lineTo(-10, 1320); ctx.fill();
    ctx.fillStyle = 'rgba(230,236,255,.55)';
    for (const [x, y] of [[30, 1180], [110, 1150], [300, 1140]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 13, y + 22); ctx.lineTo(x - 4, y + 18); ctx.lineTo(x + 2, y + 25); ctx.lineTo(x + 13, y + 20); ctx.fill(); }
    for (let i = 0; i < 7; i++) {
      const y = 1240 + (i % 3) * 22, x = fr(hash(i, 8) + t * 0.008) * (W + 200) - 100;
      cloud(ctx, x, y, 40 + hash(i, 9) * 18, 'rgba(220,226,255,.55)', 'rgba(140,150,210,.3)');
    }
    for (let i = 0; i < 4; i++) {
      const y = 900 + i * 90, x = fr(hash(i, 18) - t * 0.005) * (W + 200) - 100;
      cloud(ctx, x, y, 26 + hash(i, 19) * 14, 'rgba(230,236,255,.18)', 'rgba(160,170,220,.04)');
    }
  }

  function farTop(ctx, t) {
    if (!vis(0, 900)) return;
    // stars over the cloud sea
    for (let i = 0; i < 60; i++) {
      const x = hash(i, 1) * W, y = hash(i, 2) * 330, tw = 0.45 + 0.55 * Math.sin(t * (1 + hash(i, 3) * 2) + i);
      ctx.fillStyle = `rgba(255,246,220,${0.25 + 0.6 * tw * hash(i, 4)})`;
      ctx.beginPath(); ctx.arc(x, y, 0.6 + hash(i, 5) * 1.1, 0, TAU); ctx.fill();
    }
    // a big soft moon
    K.glow(ctx, 62, 84, 70, [255, 220, 200], 0.18);
    ctx.fillStyle = rg(ctx, 54, 76, 26, ['#fff6e8', '#f2d6c4', '#d8a8a0']); ctx.beginPath(); ctx.arc(62, 84, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,140,140,.35)';
    for (const [dx, dy, r] of [[-6, -4, 4], [7, 5, 3], [2, -10, 2.4], [-8, 9, 2]]) { ctx.beginPath(); ctx.arc(62 + dx, 84 + dy, r, 0, TAU); ctx.fill(); }
    // drifting smoke columns rising off the smouldering crown (the ember glow itself is in the sky gradient)
    for (let i = 0; i < 6; i++) {
      const ph = fr(t * 0.03 + i / 6), y = 600 - ph * 380, x = 180 + Math.sin(i * 2.1) * 70 + Math.sin(t * 0.4 + i) * 10 + ph * (i % 2 ? 40 : -40);
      cloud(ctx, x, y, 18 + ph * 30, `rgba(120,80,90,${0.32 * Math.sin(PI * ph)})`, `rgba(60,30,40,${0.15 * Math.sin(PI * ph)})`);
    }
  }

  // the cloud bank that hides the future levels (drawn in front of the future shoots)
  function cloudBank(ctx, t) {
    if (!vis(150, 520)) return;
    for (let i = 0; i < 12; i++) {
      const row = i % 3, y = 330 + row * 58 + hash(i, 7) * 20, s = 46 + hash(i, 6) * 24;
      const x = fr(hash(i, 3) + t * (0.006 + row * 0.003) * (row === 1 ? -1 : 1)) * (W + 220) - 110;
      cloud(ctx, x, y, s, row === 2 ? '#e8b4a8' : '#f2d2c8', row === 2 ? '#9a6474' : '#b88896', row === 2 ? 0.95 : 0.8);
    }
    // low warm underlight from the crown
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg(ctx, 0, 380, 0, 640, ['rgba(255,140,80,0)', 'rgba(255,130,70,.14)', 'rgba(255,130,70,0)']); ctx.fillRect(0, 380, W, 260);
    ctx.restore();
  }

  // ------------------------------------------------------------------ limbs (forks)
  // a limb is a tube along a path curve: dark own-colour edge, body, lit stripe toward the top-left, palm rings
  function limb(ctx, c, wa, wb, mid = 0) {
    const n = 26, pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = bez(c, u), q = bez(c, Math.min(1, u + 0.01)), r = bez(c, Math.max(0, u - 0.01));
      let dx = q[0] - r[0], dy = q[1] - r[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      let nx = -dy, ny = dx; if (nx + ny > 0) { nx = -nx; ny = -ny; }   // normal pointing toward the light (up-left)
      const w = lerp(wa, wb, u) + mid * Math.sin(PI * u);
      pts.push([p[0], p[1], nx, ny, w]);
    }
    const ribbon = (off, half) => {
      ctx.beginPath();
      for (const [x, y, nx, ny, w] of pts) ctx.lineTo(x + nx * (off + half) * w, y + ny * (off + half) * w);
      for (let i = pts.length - 1; i >= 0; i--) { const [x, y, nx, ny, w] = pts[i]; ctx.lineTo(x + nx * (off - half) * w, y + ny * (off - half) * w); }
      ctx.closePath();
    };
    const b = bark((c[0][1] + c[3][1]) / 2);
    ctx.save();
    // drop shadow on the sky
    ctx.translate(4, 6); ribbon(0, 0.5); ctx.fillStyle = 'rgba(10,14,20,.22)'; ctx.fill(); ctx.translate(-4, -6);
    ribbon(0, 0.5); ctx.fillStyle = rgb(b.map(v => v * 0.42)); ctx.fill();
    ribbon(0.03, 0.42); ctx.fillStyle = rgb(b); ctx.fill();
    ribbon(0.16, 0.2); ctx.fillStyle = rgb(lift(b, 30), 0.75); ctx.fill();
    ribbon(0.3, 0.05); ctx.fillStyle = rgb(lift(b, 70), 0.5); ctx.fill();
    // soft palm rings across the limb (a dark groove with a lit lip), not a ladder
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y, nx, ny, w] = pts[i], j = hash(i, x);
      ctx.strokeStyle = rgb(b.map(v => v * 0.5), 0.28 + j * 0.12); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x + nx * w * 0.4, y + ny * w * 0.4); ctx.quadraticCurveTo(x - ny * 4, y + nx * 4, x - nx * w * 0.42, y - ny * w * 0.42); ctx.stroke();
      ctx.strokeStyle = rgb(lift(b, 45), 0.18); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + nx * w * 0.36 + ny * 2, y + ny * w * 0.36 - nx * 2); ctx.quadraticCurveTo(x - ny * 2 + nx * w * 0.1, y + nx * 2 + ny * w * 0.1, x - nx * w * 0.1 + ny * 2, y - ny * w * 0.1 - nx * 2); ctx.stroke();
    }
    // the dark shaded underside
    ribbon(-0.36, 0.1); ctx.fillStyle = rgb(b.map(v => v * 0.3), 0.45); ctx.fill();
    // moss tufts and a few sprouting leaves along the limb
    const R = K.rand(Math.round(c[0][0] * 7 + c[3][1]));
    for (let k = 0; k < 3; k++) {
      const i = 4 + Math.floor(R() * (pts.length - 8)), [x, y, nx, ny, w] = pts[i], hy = y + ny * w * 0.42, hx = x + nx * w * 0.42;
      if (c[0][1] < 1000) continue;
      ctx.fillStyle = 'rgba(80,140,50,.9)'; ctx.beginPath(); ctx.ellipse(hx, hy, 7, 3.5, Math.atan2(ny, nx) + PI / 2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,210,90,.85)'; ctx.beginPath(); ctx.ellipse(hx + nx, hy + ny - 0.5, 4.5, 2, Math.atan2(ny, nx) + PI / 2, 0, TAU); ctx.fill();
      if (R() > 0.4) leaf(ctx, hx, hy, 11, Math.atan2(ny, nx) + (R() - 0.5), [90, 166, 60]);
    }
    ctx.restore();
  }

  const LIMBS = [
    ['3-7', 40, 32], ['7-8', 32, 32, 4], ['8-9', 32, 38],
    ['10-11', 38, 32], ['11-12', 32, 28], ['12-14', 28, 36],
    ['10-13', 38, 32], ['13-14', 32, 36],
    ['15-16', 34, 26], ['16-19', 26, 32], ['15-18', 34, 26], ['18-19', 26, 32],
  ];
  function limbs(ctx) {
    for (const [k, wa, wb, mid] of LIMBS) {
      const [a, b] = k.split('-').map(Number), c = curve(a, b), [y0, y1] = cyBounds(c);
      if (vis(y0 - 30, y1 + 30)) limb(ctx, c, wa, wb, mid || 0);
    }
  }

  // ------------------------------------------------------------------ trunk
  function trunk(ctx, t) {
    const yA = Math.max(TRUNK_TOP, V.y - 40), yB = Math.min(H + 10, V.y + V.h + 40);
    if (yA >= yB) return;
    // body in short segments, each with its own across-the-trunk gradient (lit left, dark right)
    for (let s0 = Math.floor(yA / 120) * 120; s0 < yB; s0 += 120) {
      const s1 = s0 + 122, ym = s0 + 60, c0 = cx(ym), w0 = hw(ym), b = bark(ym);
      ctx.beginPath();
      for (let y = Math.max(s0, TRUNK_TOP); y <= s1; y += 6) ctx.lineTo(cx(y) - hw(y), y);
      for (let y = s1; y >= Math.max(s0, TRUNK_TOP); y -= 6) ctx.lineTo(cx(y) + hw(y), y);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, c0 - w0, 0, c0 + w0, 0, [[0, rgb(lift(b, 26))], [0.18, rgb(lift(b, 12))], [0.5, rgb(b)], [0.82, rgb(b.map(v => v * 0.62))], [1, rgb(b.map(v => v * 0.4))]]);
      ctx.fill();
    }
    // palm rings with overlapping leaf-base scales between them
    for (let y = Math.floor(yA / 17) * 17; y < yB; y += 17) {
      if (y < TRUNK_TOP + 4) continue;
      const c0 = cx(y), w0 = hw(y), b = bark(y), j = hash(y, 3);
      if (w0 > 120) continue;
      ctx.strokeStyle = rgb(b.map(v => v * 0.45), 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(c0 - w0 + 1, y); ctx.quadraticCurveTo(c0, y + 7 + j * 2, c0 + w0 - 1, y); ctx.stroke();
      ctx.strokeStyle = rgb(lift(b, 46), 0.35); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(c0 - w0 + 3, y - 2.5); ctx.quadraticCurveTo(c0 - w0 * 0.3, y + 2.5, c0 + w0 * 0.2, y + 2.6); ctx.stroke();
      // scales: little downward arcs, staggered per row
      const n = Math.max(3, Math.round(w0 / 11)), off = (Math.round(y / 17) % 2) * 0.5;
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5 + off) / (n + 0.5), ang = (u - 0.5) * PI, sx = c0 + Math.sin(ang) * w0 * 0.92, sy = y + 4 + Math.cos(ang) * 6;
        const sw = Math.cos(ang) * 6 + 1.5;
        ctx.strokeStyle = rgb(b.map(v => v * 0.55), 0.45 * Math.cos(ang) + 0.1); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx - sw, sy); ctx.quadraticCurveTo(sx, sy + 7, sx + sw, sy); ctx.stroke();
      }
    }
    // coloured rim light down the lit (left) edge, tinted by the region's light
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    for (const [lw, a] of [[6, 0.06], [2, 0.2]]) {
      ctx.lineWidth = lw;
      for (let s0 = Math.floor(yA / 100) * 100; s0 < yB; s0 += 100) {
        const r = rimAt(s0 + 50);
        ctx.strokeStyle = rgb(r, a); ctx.beginPath();
        for (let y = Math.max(s0, TRUNK_TOP); y <= s0 + 102; y += 6) { if (hw(y) > 120) break; ctx.lineTo(cx(y) - hw(y) + 1.5, y); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // character on the trunk: knots, a knothole with a peeking critter, moss on the lit side, a vine spiralling round
  function trunkDecor(ctx, t) {
    // a vine wound round the lower trunk: only the front half of each turn shows
    if (vis(1900, 2460)) {
      ctx.save(); ctx.lineCap = 'round';
      let prev = null;
      for (let y = 2460; y >= 1900; y -= 5) {
        const ph = y / 70, front = Math.cos(ph) > -0.05, x = cx(y) + Math.sin(ph) * (hw(y) - 3), p = [x, y, front];
        if (prev && prev[2] && front) {
          for (const [w, c] of [[4.6, '#2c5a1e'], [2.6, '#5a9a34'], [0.9, 'rgba(200,255,140,.5)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke(); }
        }
        if (front && Math.round(y) % 35 === 0) leaf(ctx, x, y, 10, (Math.sin(ph) > 0 ? -0.4 : PI + 0.4) + Math.sin(t * 1.2 + y) * 0.1, [96, 170, 60]);
        prev = p;
      }
      ctx.restore();
    }
    // knots
    for (const [x, y, r] of [[218, 2210, 9], [214, 1990, 7], [205, 1080, 6], [228, 2440, 11]]) {
      if (!vis(y - 20, y + 20)) continue;
      const b = bark(y);
      ctx.fillStyle = rgb(lift(b, 30)); ctx.beginPath(); ctx.ellipse(x - 1, y - 1, r * 1.4, r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rg(ctx, x + 1, y + 1, r, [rgb(b.map(v => v * 0.35)), rgb(b.map(v => v * 0.6))]); ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(b.map(v => v * 0.5), 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 1.3, 0, 0.3, PI - 0.3); ctx.stroke();
    }
    // a knothole between the lagoon and mine limbs where a little critter peeks out and blinks
    if (vis(1440, 1520)) {
      const x = 186, y = 1478, b = bark(y);
      ctx.fillStyle = rgb(lift(b, 34)); ctx.beginPath(); ctx.ellipse(x - 1, y - 2, 15, 19, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(b.map(v => v * 0.55)); ctx.beginPath(); ctx.ellipse(x, y, 13, 17, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rg(ctx, x, y + 4, 16, ['#1a100a', '#2e1c10']); ctx.beginPath(); ctx.ellipse(x + 1, y + 1, 10, 14, 0, 0, TAU); ctx.fill();
      const blink = fr(t * 0.3 + 0.4) > 0.94 ? 0.15 : 1, look = Math.sin(t * 0.7) * 1.5;
      for (const d of [-1, 1]) {
        ctx.fillStyle = '#ffe48a'; ctx.beginPath(); ctx.ellipse(x + 1 + d * 4.2, y, 3, 3.4 * blink, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a1408'; ctx.beginPath(); ctx.ellipse(x + 1 + d * 4.2 + look, y + 0.4, 1.4, 2.2 * blink, 0, 0, TAU); ctx.fill();
      }
      K.glow(ctx, x + 1, y, 14, [255, 220, 120], 0.12);
    }
    // moss pads on the lit side through the lower and middle trunk
    for (let i = 0; i < 12; i++) {
      const y = 1250 + i * 100 + hash(i, 1) * 40; if (!vis(y - 10, y + 10) || y > 2420) continue;
      const x = cx(y) - hw(y) + 6 + hash(i, 2) * 8;
      ctx.fillStyle = 'rgba(70,128,46,.85)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 10, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(140,200,84,.8)'; ctx.beginPath(); ctx.ellipse(x - 1.5, y - 2, 4, 6, 0.2, 0, TAU); ctx.fill();
    }
  }
  const rimAt = y => y > 2250 ? RIM.jungle : y > 1880 ? RIM.temple : y > 1590 ? RIM.grotto : y > 1250 ? RIM.caves : y > 1100 ? RIM.crystal : y > 900 ? RIM.frost : RIM.magma;

  // ------------------------------------------------------------------ leaves
  function leaf(ctx, x, y, len, ang, c, wid = 0.36) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = lg(ctx, 0, -len * wid, 0, len * wid, [rgb(lift(c, 40)), rgb(c), rgb(c.map(v => v * 0.55))]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.4, -len * wid, len, 0); ctx.quadraticCurveTo(len * 0.4, len * wid, 0, 0); ctx.fill();
    ctx.strokeStyle = rgb(c.map(v => v * 0.5), 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,230,.25)'; ctx.beginPath(); ctx.moveTo(len * 0.15, -len * wid * 0.35); ctx.quadraticCurveTo(len * 0.45, -len * wid * 0.7, len * 0.75, -len * wid * 0.35); ctx.stroke();
    ctx.restore();
  }
  // a palm frond: a long arching leaf with a notched (leaflet) edge, lit upper half, darker lower half,
  // leaflet cuts and a rib; the colour runs from base to tip (the crown's tips smoulder: ember = glowing edge)
  function frond(ctx, x, y, ang, len, droop, base, tip, t, ember = 0, wid = 0.2) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len + droop;
    const mx = x + Math.cos(ang) * len * 0.5, my = y + Math.sin(ang) * len * 0.5 - len * 0.22;
    const N = 16, S = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, v = 1 - u;
      const px = v * v * x + 2 * v * u * mx + u * u * ex, py = v * v * y + 2 * v * u * my + u * u * ey;
      const dx = 2 * v * (mx - x) + 2 * u * (ex - mx), dy = 2 * v * (my - y) + 2 * u * (ey - my), L = Math.hypot(dx, dy) || 1;
      S.push([px, py, -dy / L, dx / L, dx / L, dy / L]);
    }
    const g = lg(ctx, x, y, ex, ey, [rgb(base), rgb(mix(base, tip, 0.45)), rgb(tip)]);
    const gD = lg(ctx, x, y, ex, ey, [rgb(base.map(v => v * 0.62)), rgb(mix(base, tip, 0.45).map(v => v * 0.62)), rgb(tip.map(v => v * 0.62))]);
    for (const s of [-1, 1]) {
      // is this side the upper (lit) one?
      const mid = S[N >> 1], up = mid[3] * s < 0;
      const edge = [];
      for (let i = 1; i <= N; i++) {
        const [px, py, nx, ny, tx, ty] = S[i], u = i / N;
        const w = len * wid * Math.pow(Math.sin(PI * Math.min(1, u * 0.95 + 0.04)), 0.7) * (1 - u * 0.35);
        const out = i % 2 === 1, ww = out ? w : w * 0.68, back = out ? len / N * 1.1 : 0;
        const sway = Math.sin(t * 1.4 + i * 0.5 + x * 0.05) * 0.6;
        edge.push([px + nx * s * ww + tx * back, py + ny * s * ww + ty * back + (out ? sway : 0), out]);
      }
      ctx.beginPath(); ctx.moveTo(x, y);
      for (const [px, py] of S) ctx.lineTo(px, py);
      for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(edge[i][0], edge[i][1]);
      ctx.closePath();
      ctx.fillStyle = up ? g : gD; ctx.fill();
      // leaflet cuts from the rib to each inner notch
      ctx.strokeStyle = rgb(mix(base, tip, 0.5).map(v => v * 0.45), up ? 0.45 : 0.35); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < edge.length; i += 2) { const sp = S[i + 1]; ctx.moveTo(sp[0], sp[1]); ctx.lineTo(edge[i][0], edge[i][1]); }
      ctx.stroke();
      if (up) {   // a lit sheen band along the upper half
        ctx.strokeStyle = rgb(lift(mix(base, tip, 0.3), 70), 0.35); ctx.lineWidth = 1.4; ctx.beginPath();
        for (let i = 2; i < N - 4; i++) { const [px, py, nx, ny] = S[i], w = len * wid * 0.35 * Math.sin(PI * i / N); i === 2 ? ctx.moveTo(px + nx * s * w, py + ny * s * w) : ctx.lineTo(px + nx * s * w, py + ny * s * w); }
        ctx.stroke();
      }
      if (ember) {   // smouldering edge toward the tip
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        const fl = 0.7 + 0.3 * Math.sin(t * 4 + x + s);
        ctx.strokeStyle = `rgba(255,120,40,${0.55 * ember * fl})`; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = Math.floor(edge.length * 0.55); i < edge.length; i++) i === Math.floor(edge.length * 0.55) ? ctx.moveTo(edge[i][0], edge[i][1]) : ctx.lineTo(edge[i][0], edge[i][1]);
        ctx.lineTo(ex, ey); ctx.stroke();
        ctx.restore();
      }
    }
    // the rib
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(mix(base, tip, 0.5).map(v => v * 0.55)); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.strokeStyle = rgb(lift(mix(base, tip, 0.35), 60), 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.quadraticCurveTo(mx, my - 1, ex, ey - 1); ctx.stroke();
    if (ember) for (let k = 0; k < 2; k++) {   // a couple of embers flickering at the tip
      const fl = Math.max(0, Math.sin(t * 3 + k * 2.4 + x * 0.1 + ang * 5));
      if (fl > 0.2) K.glow(ctx, ex - Math.cos(ang) * k * 10, ey - k * 4, 7, [255, 150, 50], 0.6 * fl * ember);
    }
  }

  // ------------------------------------------------------------------ regions
  function jungleBase(ctx, t) {
    if (!vis(2250, 2600)) return;
    // big canopy fronds at the sides, swaying
    frond(ctx, -20, 2330, -0.2, 120, 50, [60, 128, 56], [120, 180, 70], t);
    frond(ctx, 380, 2250, PI + 0.25, 110, 46, [56, 120, 52], [110, 172, 64], t);
    frond(ctx, -14, 2440, 0.1, 90, 40, [44, 104, 46], [96, 160, 60], t);
    // roots: thick buttresses spilling down to the jungle floor
    const roots = [[[150, 2470], [110, 2520], [60, 2540], [-10, 2560]], [[160, 2500], [130, 2560], [90, 2590], [60, 2620]],
      [[208, 2470], [250, 2520], [310, 2530], [372, 2556]], [[200, 2500], [230, 2560], [270, 2600], [300, 2620]]];
    for (const r of roots) limb(ctx, r, 34, 12);
    // floor: a mossy mound with ferns, flowers and a few mushrooms
    ctx.fillStyle = lg(ctx, 0, 2560, 0, 2600, ['#3d7a34', '#244c22']);
    ctx.beginPath(); ctx.moveTo(-5, 2600); ctx.lineTo(-5, 2572); ctx.quadraticCurveTo(90, 2552, 180, 2576); ctx.quadraticCurveTo(280, 2596, 365, 2566); ctx.lineTo(365, 2600); ctx.fill();
    ctx.strokeStyle = 'rgba(170,230,110,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5, 2572); ctx.quadraticCurveTo(90, 2552, 180, 2576); ctx.quadraticCurveTo(280, 2596, 365, 2566); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const x = 14 + i * 42 + hash(i, 1) * 10, y = 2580 + hash(i, 2) * 8, sw = Math.sin(t * 1.4 + i) * 0.08;
      for (let k = 0; k < 5; k++) leaf(ctx, x, y, 16 + hash(i, k) * 8, -PI / 2 + (k - 2) * 0.45 + sw, [70, 150, 60], 0.22);
    }
    for (const [x, y, c] of [[54, 2560, '#ff7aa0'], [300, 2566, '#ffb84a'], [262, 2582, '#ff7aa0']]) {
      ctx.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + t * 0.2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 3, 2, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
    }
    for (const [x, y, s] of [[96, 2532, 1], [272, 2548, 0.8], [36, 2556, 0.7]]) mushroom(ctx, x, y, 8 * s, [230, 90, 70], [255, 240, 220]);
    // hanging vines from the bog limb
    for (let i = 0; i < 3; i++) {
      const x = 236 + i * 16, y0 = 2272 - i * 14, len = 70 + i * 20, sw = Math.sin(t * 1.1 + i) * 5;
      ctx.strokeStyle = '#2f5a20'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + sw, y0 + len / 2, x + sw * 1.6, y0 + len); ctx.stroke();
      for (let j = 1; j <= 4; j++) { const u = j / 4.5; leaf(ctx, x + sw * 1.6 * u * u, y0 + len * u, 9, j % 2 ? 0.4 : PI - 0.4, [90, 166, 60]); }
    }
  }

  function mushroom(ctx, x, y, r, cap, spot, glowC) {
    if (glowC) K.glow(ctx, x, y - r * 0.4, r * 3, glowC, 0.35);
    ctx.fillStyle = lg(ctx, x - r * 0.3, 0, x + r * 0.3, 0, ['#fff4e4', '#d8c6b0']); ctx.beginPath(); ctx.roundRect(x - r * 0.28, y - r * 0.6, r * 0.56, r * 0.9, r * 0.2); ctx.fill();
    ctx.fillStyle = rg(ctx, x - r * 0.35, y - r, r * 1.4, [rgb(lift(cap, 50)), rgb(cap), rgb(cap.map(v => v * 0.55))]);
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.45); ctx.quadraticCurveTo(x - r, y - r * 1.25, x, y - r * 1.25); ctx.quadraticCurveTo(x + r, y - r * 1.25, x + r, y - r * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(spot, 0.9);
    for (const [dx, dy, s] of [[-0.45, -0.75, 0.16], [0.15, -1.0, 0.13], [0.5, -0.65, 0.12]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, s * r, 0, TAU); ctx.fill(); }
  }

  // stone blocks of the temple carved into the trunk's left side
  const STONE = ['#c9cca8', '#8d9274', '#555a44'], GOLD = ['#fff0b0', '#f0b83a', '#9a6214'];
  function temple(ctx, t) {
    if (!vis(1880, 2240)) return;
    // stepped outline: wider at the bottom, tucked into the trunk
    const steps = [[2232, 70], [2190, 56], [2110, 44], [2070, 40], [1990, 52], [1950, 62], [1890, 84]];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(196, 2232);
    for (const [y, x] of steps) { ctx.lineTo(x, y); ctx.lineTo(x, y - 40); }
    ctx.lineTo(196, 1850); ctx.closePath();
    ctx.fillStyle = 'rgba(10,20,10,.25)'; ctx.save(); ctx.translate(-4, 5); ctx.fill(); ctx.restore();
    ctx.fillStyle = lg(ctx, 40, 0, 200, 0, [STONE[0], STONE[1], STONE[2]]); ctx.fill();
    ctx.clip();
    // block rows (mortar lines are a darker stone, not black)
    for (let y = 1852; y < 2236; y += 16) {
      const row = Math.round(y / 16);
      ctx.fillStyle = 'rgba(60,66,46,.55)'; ctx.fillRect(30, y, 170, 1.6);
      ctx.fillStyle = 'rgba(255,255,230,.18)'; ctx.fillRect(30, y + 1.6, 170, 1.2);
      for (let x = 30 + (row % 2) * 14; x < 200; x += 28) { ctx.fillStyle = 'rgba(60,66,46,.45)'; ctx.fillRect(x, y, 1.6, 16); }
      for (let x = 30 + (row % 2) * 14; x < 200; x += 28) if (hash(x, row) > 0.8) { ctx.fillStyle = 'rgba(80,110,60,.35)'; ctx.fillRect(x + 2, y + 2, 24, 12); }
    }
    // a carved idol face with gold eyes in the middle of the wall
    const fx = 160, fy = 2084;
    ctx.fillStyle = lg(ctx, fx - 22, 0, fx + 22, 0, ['#b9bd98', '#7b8064']);
    ctx.beginPath(); ctx.roundRect(fx - 22, fy - 30, 44, 56, 8); ctx.fill();
    ctx.fillStyle = 'rgba(60,66,46,.6)'; ctx.fillRect(fx - 16, fy - 6, 12, 4); ctx.fillRect(fx + 4, fy - 6, 12, 4);
    for (const d of [-1, 1]) {
      const gl = 0.6 + 0.4 * Math.sin(t * 2 + d);
      ctx.fillStyle = rg(ctx, fx + d * 10, fy + 4, 6, [GOLD[0], GOLD[1], GOLD[2]]); ctx.beginPath(); ctx.arc(fx + d * 10, fy + 4, 5, 0, TAU); ctx.fill();
      K.glow(ctx, fx + d * 10, fy + 4, 12, [255, 210, 90], 0.25 * gl);
    }
    ctx.fillStyle = 'rgba(60,66,46,.7)'; ctx.beginPath(); ctx.roundRect(fx - 12, fy + 14, 24, 6, 3); ctx.fill();
    for (let k = -1; k <= 1; k++) { ctx.fillStyle = '#e8ead0'; ctx.fillRect(fx + k * 7 - 2, fy + 14, 4, 4); }
    ctx.fillStyle = lg(ctx, 0, fy - 40, 0, fy - 28, GOLD); ctx.beginPath(); ctx.moveTo(fx - 26, fy - 28); ctx.lineTo(fx - 18, fy - 42); ctx.lineTo(fx - 6, fy - 34); ctx.lineTo(fx, fy - 46); ctx.lineTo(fx + 6, fy - 34); ctx.lineTo(fx + 18, fy - 42); ctx.lineTo(fx + 26, fy - 28); ctx.fill();
    // glyph band
    ctx.fillStyle = 'rgba(70,74,52,.5)';
    for (let i = 0; i < 6; i++) { const gx = 60 + i * 20; ctx.fillRect(gx, 2226 - 6, 10, 2); ctx.fillRect(gx + 4, 2226 - 10, 2, 8); }
    // shade where the stone sinks into the trunk
    ctx.fillStyle = lg(ctx, 150, 0, 200, 0, ['rgba(40,30,20,0)', 'rgba(40,30,20,.55)']); ctx.fillRect(150, 1850, 50, 390);
    ctx.restore();
    // moss caps on the step tops and vines draped over
    for (const [y, x] of steps) {
      ctx.fillStyle = lg(ctx, 0, y - 44, 0, y - 36, ['#8fd35a', '#3f7a2a']);
      ctx.beginPath(); ctx.moveTo(x - 2, y - 40); for (let k = 0; k <= 8; k++) ctx.lineTo(x + k * 6, y - 40 + (k % 2 ? 4 : 1)); ctx.lineTo(x + 48, y - 42); ctx.lineTo(x - 2, y - 43); ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = 70 + i * 28, y0 = 1900 + i * 70, len = 46 + hash(i, 2) * 30, sw = Math.sin(t + i) * 3;
      ctx.strokeStyle = '#3c6a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + sw, y0 + len / 2, x + sw, y0 + len); ctx.stroke();
      for (let j = 1; j <= 3; j++) leaf(ctx, x + sw * j / 3, y0 + len * j / 3.4, 8, j % 2 ? 0.5 : PI - 0.5, [96, 170, 60]);
    }
    // torches with flickering flames on the outer steps
    for (const [x, y] of [[52, 2104], [70, 1974]]) torch(ctx, x, y, t);
  }
  function torch(ctx, x, y, t) {
    ctx.fillStyle = lg(ctx, x - 3, 0, x + 3, 0, ['#9a6a3a', '#4a2e16']); ctx.fillRect(x - 2.5, y, 5, 18);
    ctx.fillStyle = lg(ctx, 0, y - 3, 0, y + 3, GOLD); ctx.beginPath(); ctx.roundRect(x - 5, y - 2, 10, 5, 2); ctx.fill();
    flame(ctx, x, y - 2, 1, t);
  }
  function flame(ctx, x, y, s, t) {
    const f = 1 + Math.sin(t * 13 + x) * 0.12 + Math.sin(t * 7.3 + y) * 0.08;
    K.glow(ctx, x, y - 6 * s, 22 * s, [255, 170, 60], 0.35);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg(ctx, 0, y - 16 * s * f, 0, y, ['rgba(255,240,170,.0)', 'rgba(255,210,90,.9)', 'rgba(255,110,30,.9)']);
    ctx.beginPath(); ctx.moveTo(x - 5 * s, y); ctx.quadraticCurveTo(x - 6 * s, y - 8 * s, x + Math.sin(t * 9 + x) * 2, y - 16 * s * f); ctx.quadraticCurveTo(x + 6 * s, y - 8 * s, x + 5 * s, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,220,.9)'; ctx.beginPath(); ctx.ellipse(x, y - 3 * s, 2 * s, 4 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function bog(ctx, t) {
    if (!vis(1960, 2220)) return;
    // the limb swells into a hollow around a toxic pool
    const hx = 324, hy = 2088;
    ctx.fillStyle = rgb(bark(2088).map(v => v * 0.42)); ctx.beginPath(); ctx.ellipse(hx - 6, hy, 40, 74, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, hx - 46, 0, hx + 34, 0, [rgb(lift(bark(2088), 22)), rgb(bark(2088)), rgb(bark(2088).map(v => v * 0.6))]); ctx.beginPath(); ctx.ellipse(hx - 6, hy, 37, 71, 0, 0, TAU); ctx.fill();
    for (let k = -3; k <= 3; k++) { ctx.strokeStyle = rgb(bark(2088).map(v => v * 0.5), 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(hx - 6, hy + k * 19, 36 * Math.cos(k / 4.3), 5, 0, 0.1, PI - 0.1); ctx.stroke(); }
    // the hollow's dark interior
    ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy, 22, 54, 0, 0, TAU);
    ctx.fillStyle = rg(ctx, hx - 4, hy + 10, 60, ['#2c3a18', '#141c0a']); ctx.fill(); ctx.clip();
    // goo: olive to lime, with a wobbling surface
    const sy = hy + 14;
    ctx.fillStyle = lg(ctx, 0, sy, 0, hy + 54, ['#b8e040', '#6e8a1e', '#3a4c10']);
    ctx.beginPath(); ctx.moveTo(hx - 30, hy + 60);
    for (let x = hx - 30; x <= hx + 30; x += 4) ctx.lineTo(x, sy + Math.sin(x * 0.3 + t * 3) * 1.6);
    ctx.lineTo(hx + 30, hy + 60); ctx.fill();
    ctx.strokeStyle = 'rgba(230,255,140,.7)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let x = hx - 30; x <= hx + 30; x += 4) ctx.lineTo(x, sy + Math.sin(x * 0.3 + t * 3) * 1.6); ctx.stroke();
    // a snapper's eyes peeking from the goo
    const blink = fr(t * 0.25) > 0.95 ? 0.2 : 1;
    for (const d of [-1, 1]) {
      ctx.fillStyle = '#5c7a1c'; ctx.beginPath(); ctx.arc(hx + 2 + d * 6, sy + 2, 5, PI, 0); ctx.fill();
      ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(hx + 2 + d * 6, sy, 3.2, 3.2 * blink, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(hx + 3 + d * 6, sy, 1.2, 2 * blink, 0, 0, TAU); ctx.fill();
    }
    // cattails inside
    for (const [x, h] of [[hx - 14, 40], [hx + 15, 32], [hx - 8, 30]]) {
      const sw = Math.sin(t * 1.3 + x) * 2;
      ctx.strokeStyle = '#4e6a1c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, sy + 4); ctx.quadraticCurveTo(x, sy - h / 2, x + sw, sy - h); ctx.stroke();
      ctx.fillStyle = lg(ctx, x - 2, 0, x + 3, 0, ['#a4703a', '#5a3616']); ctx.beginPath(); ctx.roundRect(x + sw - 2.5, sy - h - 2, 5, 12, 2.5); ctx.fill();
    }
    // toxic glow and gas bubbles
    K.glow(ctx, hx, sy, 40, [190, 255, 70], 0.28);
    for (let i = 0; i < 6; i++) {
      const ph = fr(t * 0.35 + i / 6), bx = hx - 14 + hash(i, 3) * 28 + Math.sin(t * 2 + i) * 2, by = sy - ph * 46;
      ctx.strokeStyle = `rgba(210,255,120,${0.7 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 1.5 + ph * 2.5, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // rim light on the hollow edge
    ctx.strokeStyle = 'rgba(210,250,120,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(hx, hy, 22, 54, 0, PI * 0.6, PI * 1.6); ctx.stroke();
    // moss beards hanging off the swollen limb, toadstools on it
    for (let i = 0; i < 5; i++) {
      const x = hx - 30 + i * 13, y = hy + 60 + hash(i, 1) * 8, len = 14 + hash(i, 2) * 16, sw = Math.sin(t * 1.2 + i) * 2;
      ctx.fillStyle = 'rgba(120,150,50,.85)';
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x - 2 + sw, y + len * 0.6, x + sw, y + len); ctx.quadraticCurveTo(x + 2 + sw, y + len * 0.6, x + 4, y); ctx.fill();
    }
    mushroom(ctx, 346, 2032, 7, [170, 200, 40], [240, 255, 170], [190, 255, 80]);
    mushroom(ctx, 340, 2144, 6, [170, 200, 40], [240, 255, 170], [190, 255, 80]);
  }

  function grotto(ctx, t) {
    if (!vis(1580, 1780)) return;
    // glowing shelf fungi on the bark, cyan and magenta
    const shelves = [[124, 1720, 30, [80, 230, 255]], [118, 1626, 22, [255, 90, 210]], [238, 1724, 26, [255, 90, 210]], [246, 1630, 24, [80, 230, 255]], [144, 1594, 14, [120, 255, 230]], [222, 1596, 12, [255, 140, 240]]];
    for (const [x, y, r, c] of shelves) {
      const pulse = 0.75 + 0.25 * Math.sin(t * 2 + x);
      K.glow(ctx, x, y, r * 2.4, c, 0.3 * pulse);
      const left = x < 180;
      ctx.save(); ctx.translate(x, y); if (!left) ctx.scale(-1, 1);
      ctx.fillStyle = rgb(c.map(v => v * 0.35)); ctx.beginPath(); ctx.ellipse(-r * 0.05, 2, r * 1.04, r * 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lg(ctx, -r, -r * 0.4, r * 0.5, r * 0.3, [rgb(lift(c, 70)), rgb(c), rgb(c.map(v => v * 0.6))]);
      ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.quadraticCurveTo(r * 0.5, -r * 0.5, -r * 0.3, -r * 0.42); ctx.quadraticCurveTo(-r * 1.05, -r * 0.3, -r, 0.5); ctx.quadraticCurveTo(-r * 0.3, r * 0.3, r * 0.7, 0); ctx.fill();
      // gills under the cap
      ctx.strokeStyle = rgb(c.map(v => v * 0.5), 0.6); ctx.lineWidth = 0.9;
      for (let k = 0; k < 6; k++) { const gx = -r * 0.9 + k * r * 0.28; ctx.beginPath(); ctx.moveTo(gx, 2); ctx.lineTo(gx + r * 0.2, r * 0.18); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.6)'; for (const [dx, dy, s] of [[-0.5, -0.2, 0.08], [-0.1, -0.3, 0.06], [0.3, -0.18, 0.05]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, s * r + 0.6, 0, TAU); ctx.fill(); }
      K.sheen(ctx, -r * 0.2, 0, r * 0.7, 0.4 * pulse, 3.6, 4.6);
      ctx.restore();
    }
    // little glowing button mushrooms
    for (const [x, y, c] of [[150, 1742, [80, 230, 255]], [214, 1748, [255, 90, 210]], [136, 1686, [255, 140, 240]], [226, 1690, [80, 230, 255]]]) mushroom(ctx, x, y, 5, c, [255, 255, 255], c);
  }

  function lagoon(ctx, t) {
    if (!vis(1360, 1840)) return;
    // the limb cups a basin of teal water at node 11; a waterfall spills off its outer lip
    const bx = 78, by = 1566;
    // waterfall
    const wfTop = by - 2, wfBot = 1840;
    ctx.fillStyle = lg(ctx, 18, 0, 46, 0, ['rgba(120,230,230,.55)', 'rgba(200,255,250,.8)', 'rgba(90,200,210,.5)']);
    ctx.beginPath(); ctx.moveTo(30, wfTop); ctx.quadraticCurveTo(18, wfTop + 30, 20, wfBot); ctx.lineTo(44, wfBot); ctx.quadraticCurveTo(40, wfTop + 30, 46, wfTop); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(30, wfTop); ctx.quadraticCurveTo(18, wfTop + 30, 20, wfBot); ctx.lineTo(44, wfBot); ctx.quadraticCurveTo(40, wfTop + 30, 46, wfTop); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) { const x = 22 + i * 3, y = wfTop + fr(t * 0.9 + hash(i, 1)) * (wfBot - wfTop); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 0.5, y + 22); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = lg(ctx, 0, wfBot - 80, 0, wfBot, ['rgba(160,240,240,0)', 'rgba(60,110,110,0)']); ctx.fillRect(16, wfBot - 80, 34, 80);
    for (let i = 0; i < 5; i++) { const ph = fr(t * 0.6 + i / 5); cloud(ctx, 32 + Math.sin(i * 2) * 8, wfBot - 30 - ph * 30, 8 + ph * 8, `rgba(220,255,255,${0.35 * (1 - ph)})`, `rgba(160,230,230,${0.15 * (1 - ph)})`); }
    // basin bowl
    const b = bark(by);
    ctx.fillStyle = rgb(b.map(v => v * 0.42)); ctx.beginPath(); ctx.ellipse(bx, by + 4, 50, 24, 0, 0, PI); ctx.lineTo(bx - 50, by); ctx.fill();
    ctx.fillStyle = lg(ctx, bx - 50, 0, bx + 50, 0, [rgb(lift(b, 26)), rgb(b), rgb(b.map(v => v * 0.6))]); ctx.beginPath(); ctx.ellipse(bx, by + 3, 47, 21, 0, 0, PI); ctx.fill();
    ctx.strokeStyle = rgb(b.map(v => v * 0.5), 0.6); ctx.lineWidth = 1.5; for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.ellipse(bx, by + 3 + k * 6, 47 - k * 6, 21 - k * 6, 0, 0.3, PI - 0.3); ctx.stroke(); }
    // water surface with ripples and highlights
    ctx.fillStyle = rg(ctx, bx - 14, by - 4, 56, ['#9ff4ec', '#3cc4c4', '#1c7c8a']); ctx.beginPath(); ctx.ellipse(bx, by, 47, 11, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(bx, by, 47, 11, 0, 0, TAU); ctx.clip();
    for (let k = 0; k < 3; k++) { const ph = fr(t * 0.4 + k / 3); ctx.strokeStyle = `rgba(230,255,255,${0.5 * (1 - ph)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(bx + 14, by + 1, 6 + ph * 30, 1.5 + ph * 7, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(220,255,250,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(bx, by, 47, 11, 0, PI * 1.05, PI * 1.6); ctx.stroke();
    // lilypads and a pink lotus
    for (const [x, y, r] of [[bx + 30, by + 2, 6], [bx - 32, by - 1, 5]]) {
      ctx.fillStyle = lg(ctx, 0, y - r, 0, y + r, ['#9ad85a', '#3e8a2e']); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0.3, TAU); ctx.lineTo(x, y); ctx.fill();
    }
    ctx.fillStyle = '#ff9ac8'; for (let k = 0; k < 5; k++) { const a = -PI / 2 + (k - 2) * 0.5; ctx.beginPath(); ctx.ellipse(bx + 30 + Math.cos(a) * 3, by - 2 + Math.sin(a) * 3, 2.2, 4, a + PI / 2, 0, TAU); ctx.fill(); }
    // floating water orbs with jellies drifting round node 12
    for (let i = 0; i < 3; i++) {
      const jx = [34, 118, 108][i], jy = [1440, 1460, 1384][i] + Math.sin(t * 1.3 + i * 2) * 5, r = [12, 10, 9][i];
      ctx.fillStyle = rg(ctx, jx - r * 0.3, jy - r * 0.3, r * 1.2, ['rgba(200,255,250,.35)', 'rgba(90,210,220,.22)', 'rgba(60,160,190,.35)']);
      ctx.beginPath(); ctx.arc(jx, jy, r, 0, TAU); ctx.fill();
      K.sheen(ctx, jx, jy, r, 0.6);
      const pj = Math.sin(t * 3 + i) * 0.12;
      ctx.fillStyle = rg(ctx, jx - 2, jy - 3, r * 0.6, ['#ffd4f0', '#ff7ac8', '#c43a9a']);
      ctx.beginPath(); ctx.ellipse(jx, jy - 1, r * 0.48 * (1 + pj), r * 0.38 * (1 - pj), 0, PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,210,.8)'; ctx.lineWidth = 1;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(jx + k * 3, jy - 1); ctx.quadraticCurveTo(jx + k * 3 + Math.sin(t * 4 + k) * 2, jy + 3, jx + k * 3, jy + r * 0.6); ctx.stroke(); }
    }
  }

  function mine(ctx, t) {
    if (!vis(1400, 1680)) return;
    // a tunnel dug into a swelling of the right limb, framed with timber
    const mx = 318, my = 1556, b = bark(1556);
    ctx.fillStyle = rgb(b.map(v => v * 0.42)); ctx.beginPath(); ctx.ellipse(mx, my, 36, 44, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, mx - 36, 0, mx + 36, 0, [rgb(lift(b, 22)), rgb(b), rgb(b.map(v => v * 0.6))]); ctx.beginPath(); ctx.ellipse(mx, my, 33, 41, 0, 0, TAU); ctx.fill();
    // tunnel mouth
    ctx.fillStyle = rg(ctx, mx, my + 6, 26, ['#1a0e06', '#2e1a0c', '#4a2c14']); ctx.beginPath(); ctx.moveTo(mx - 15, my + 22); ctx.lineTo(mx - 15, my - 6); ctx.quadraticCurveTo(mx, my - 22, mx + 15, my - 6); ctx.lineTo(mx + 15, my + 22); ctx.fill();
    // gold glints deep in the tunnel
    for (let i = 0; i < 4; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); ctx.fillStyle = `rgba(255,220,100,${0.5 * tw})`; ctx.beginPath(); ctx.arc(mx - 8 + i * 5, my + 2 + (i % 2) * 6, 1.2, 0, TAU); ctx.fill(); }
    // timbers
    const wood = ['#d8a060', '#9a6232', '#5a3618'];
    for (const d of [-1, 1]) { ctx.fillStyle = lg(ctx, mx + d * 17 - 3, 0, mx + d * 17 + 3, 0, wood); ctx.fillRect(mx + d * 17 - 3, my - 10, 6, 34); }
    ctx.fillStyle = lg(ctx, 0, my - 16, 0, my - 9, wood); ctx.beginPath(); ctx.roundRect(mx - 23, my - 16, 46, 7, 2); ctx.fill();
    ctx.fillStyle = 'rgba(60,30,10,.6)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(mx + d * 17, my - 12.5, 1.3, 0, TAU); ctx.fill(); }
    // rails out of the tunnel and along the limb
    ctx.strokeStyle = '#8a8a96'; ctx.lineWidth = 1.6;
    for (const o of [-4, 4]) { ctx.beginPath(); ctx.moveTo(mx + o * 0.6, my + 22); ctx.quadraticCurveTo(mx - 10 + o, my + 36, 290 + o, 1520); ctx.stroke(); }
    // a mine cart of gold beside the track
    const kx = 330, ky = 1608;
    ctx.fillStyle = lg(ctx, 0, ky - 12, 0, ky, ['#8a8ea8', '#4a4c60']); ctx.beginPath(); ctx.moveTo(kx - 14, ky - 12); ctx.lineTo(kx + 14, ky - 12); ctx.lineTo(kx + 11, ky); ctx.lineTo(kx - 11, ky); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = rg(ctx, kx - 9 + i * 4.5 - 1, ky - 14, 4, GOLD); ctx.beginPath(); ctx.arc(kx - 9 + i * 4.5, ky - 13 - (i % 2) * 2, 3.2, 0, TAU); ctx.fill(); }
    K.sheen(ctx, kx - 3, ky - 14, 6, 0.5);
    for (const d of [-1, 1]) { ctx.fillStyle = '#3a3c48'; ctx.beginPath(); ctx.arc(kx + d * 7, ky + 1, 3, 0, TAU); ctx.fill(); ctx.fillStyle = '#9a9cae'; ctx.beginPath(); ctx.arc(kx + d * 7, ky + 1, 1.2, 0, TAU); ctx.fill(); }
    // a string of lanterns swinging under the limb
    ctx.strokeStyle = 'rgba(60,40,20,.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(214, 1640); ctx.quadraticCurveTo(250, 1636, 270, 1574); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const u = (i + 1) / 4, px = lerp(214, 270, u), py = lerp(1640, 1574, u * u) + 4, sw = Math.sin(t * 1.6 + i) * 0.15;
      lantern(ctx, px, py, sw, t + i);
    }
    lantern(ctx, mx + 24, my - 22, Math.sin(t * 1.4) * 0.1, t);
  }
  function lantern(ctx, x, y, sw, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.strokeStyle = 'rgba(60,40,20,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 5); ctx.stroke();
    const fl = 0.8 + 0.2 * Math.sin(t * 9);
    K.glow(ctx, 0, 11, 22, [255, 190, 90], 0.45 * fl);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-4, 4, 8, 2.5); ctx.fillRect(-4, 15, 8, 2.5);
    ctx.fillStyle = rg(ctx, -1, 9, 7, ['#fffbe0', '#ffd060', '#e08a20']); ctx.beginPath(); ctx.roundRect(-3.5, 6, 7, 9.5, 2.5); ctx.fill();
    ctx.restore();
  }

  function caves(ctx, t) {
    if (!vis(1250, 1400)) return;
    // a big hollow inside the trunk lined with blue-violet basalt columns
    const x = 180, y = 1326;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, 50, 46, 0, 0, TAU);
    ctx.fillStyle = rgb(bark(y).map(v => v * 0.35)); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 1, 46, 42, 0, 0, TAU);
    ctx.fillStyle = rg(ctx, x, y - 10, 60, ['#3a3e78', '#1e2048', '#0e0f26']); ctx.fill(); ctx.clip();
    // back wall columns
    for (let i = 0; i < 9; i++) {
      const cxx = x - 44 + i * 11, top = y - 30 + hash(i, 1) * 30;
      ctx.fillStyle = lg(ctx, cxx - 5, 0, cxx + 5, 0, ['#4c5296', '#2e3270', '#1c1e4a']); ctx.fillRect(cxx - 5, top, 10, 80);
      ctx.fillStyle = 'rgba(160,200,255,.35)'; ctx.beginPath(); ctx.moveTo(cxx - 5, top); ctx.lineTo(cxx, top - 3); ctx.lineTo(cxx + 5, top); ctx.lineTo(cxx, top + 3); ctx.fill();
    }
    // front columns rising to the node, hexagonal tops lit cyan
    for (const [cxx, top, w] of [[x - 30, y + 24, 14], [x + 30, y + 22, 13], [x - 14, y + 30, 12], [x + 15, y + 30, 12]]) {
      ctx.fillStyle = lg(ctx, cxx - w / 2, 0, cxx + w / 2, 0, ['#7a84d0', '#4a52a0', '#262a66']); ctx.fillRect(cxx - w / 2, top, w, 60);
      ctx.fillStyle = lg(ctx, 0, top - 4, 0, top + 4, ['#cfe4ff', '#8aa8f0']); ctx.beginPath();
      ctx.moveTo(cxx - w / 2, top); ctx.lineTo(cxx - w / 4, top - 3.5); ctx.lineTo(cxx + w / 4, top - 3.5); ctx.lineTo(cxx + w / 2, top); ctx.lineTo(cxx + w / 4, top + 3.5); ctx.lineTo(cxx - w / 4, top + 3.5); ctx.fill();
    }
    // stalactites from the hollow's roof and a cold glow
    ctx.fillStyle = '#2a2e66';
    for (let i = 0; i < 6; i++) { const sx = x - 32 + i * 13, len = 8 + hash(i, 4) * 12; ctx.beginPath(); ctx.moveTo(sx - 4, y - 46); ctx.lineTo(sx, y - 46 + len + 10); ctx.lineTo(sx + 4, y - 46); ctx.fill(); }
    K.glow(ctx, x, y + 10, 50, [120, 170, 255], 0.3);
    ctx.restore();
    ctx.strokeStyle = 'rgba(170,210,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + 1, 46, 42, 0, PI * 0.7, PI * 1.55); ctx.stroke();
  }

  function geode(ctx, t) {
    if (!vis(1110, 1250)) return;
    // the Geode King's lair: a geode cracked open in the trunk, lined with quartz and amethyst
    const x = 180, y = 1176;
    // radiating cracks in the bark
    ctx.strokeStyle = 'rgba(30,20,30,.5)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + 0.3; let px = x + Math.cos(a) * 42, py = y + Math.sin(a) * 36;
      ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 3; k++) { px += Math.cos(a + (hash(i, k) - 0.5)) * 9; py += Math.sin(a + (hash(i, k) - 0.5)) * 9; ctx.lineTo(px, py); } ctx.stroke();
    }
    const jag = (r, ry, seed) => { ctx.beginPath(); for (let i = 0; i <= 22; i++) { const a = i / 22 * TAU, rr = 1 + (hash(i % 22, seed) - 0.5) * 0.14; ctx.lineTo(x + Math.cos(a) * r * rr, y + Math.sin(a) * ry * rr); } ctx.closePath(); };
    jag(48, 42, 1); ctx.fillStyle = lg(ctx, x - 48, y - 42, x + 48, y + 42, ['#9c98b0', '#5e5a74', '#34304a']); ctx.fill();
    jag(42, 36, 2); ctx.fillStyle = lg(ctx, x - 40, y - 36, x + 40, y + 36, ['#ffffff', '#e2d6f2', '#a898c8']); ctx.fill();
    jag(36, 30, 3); ctx.fillStyle = rg(ctx, x, y, 40, ['#3a1450', '#5a2478', '#8a44b0']); ctx.fill();
    // amethyst points pointing inward
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU, r0x = 36, r0y = 30, L = 8 + hash(i, 6) * 7;
      const bx = x + Math.cos(a) * r0x, by = y + Math.sin(a) * r0y, tx = x + Math.cos(a) * (r0x - L), ty = y + Math.sin(a) * (r0y - L);
      const nx = -Math.sin(a) * 4, ny = Math.cos(a) * 4;
      ctx.fillStyle = lg(ctx, bx, by, tx, ty, ['#7a2ea8', '#c070f0', '#f4d0ff']);
      ctx.beginPath(); ctx.moveTo(bx + nx, by + ny); ctx.lineTo(tx, ty); ctx.lineTo(bx - nx, by - ny); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,255,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx + nx * 0.3, by + ny * 0.3); ctx.lineTo(tx, ty); ctx.stroke();
    }
    K.glow(ctx, x, y, 60, [200, 120, 255], 0.22 + 0.06 * Math.sin(t * 2));
  }

  function crystal(ctx, t) {
    if (!vis(900, 1150)) return;
    // amethyst clusters growing along the left limb
    const clusters = [[34, 1076, 1], [112, 1110, 0.8], [40, 948, 0.9], [106, 958, 0.7], [62, 1052, 0.6]];
    for (const [x, y, s] of clusters) crystalCluster(ctx, x, y, s, t);
  }
  function crystalCluster(ctx, x, y, s, t) {
    K.glow(ctx, x, y - 8 * s, 30 * s, [230, 140, 255], 0.25);
    const shards = [[-8, 18, -0.4], [0, 26, 0], [8, 16, 0.45], [-3, 12, -0.15], [5, 11, 0.25]];
    for (const [dx, h, a] of shards) {
      ctx.save(); ctx.translate(x + dx * s, y); ctx.rotate(a); const w = 4.5 * s, hh = h * s;
      ctx.fillStyle = lg(ctx, -w, 0, w, 0, ['#ffd6ff', '#d07aee', '#7a34a8']);
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -hh); ctx.lineTo(0, -hh - w * 1.4); ctx.lineTo(w, -hh); ctx.lineTo(w, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,255,.55)'; ctx.beginPath(); ctx.moveTo(-w * 0.6, -1); ctx.lineTo(-w * 0.6, -hh); ctx.lineTo(0, -hh - w * 1.1); ctx.lineTo(-w * 0.1, -hh + 2); ctx.lineTo(-w * 0.1, -1); ctx.fill();
      ctx.restore();
    }
    const tw = Math.max(0, Math.sin(t * 2.4 + x));
    if (tw > 0.6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${(tw - 0.6) * 2})`; const sx = x + 2 * s, sy = y - 24 * s; ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 1.2, sy - 1.2); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx + 1.2, sy + 1.2); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 1.2, sy + 1.2); ctx.lineTo(sx - 6, sy); ctx.lineTo(sx - 1.2, sy - 1.2); ctx.fill(); ctx.restore(); }
  }

  function frost(ctx, t) {
    if (!vis(900, 1110)) return;
    // snow caps and icicles on the trunk between 15 and 19
    for (const y of [1080, 1032, 948]) {
      const c0 = cx(y), w0 = hw(y) + 3;
      ctx.fillStyle = lg(ctx, 0, y - 6, 0, y + 6, ['#ffffff', '#dceaff', '#9ab8e0']);
      ctx.beginPath(); ctx.moveTo(c0 - w0, y + 2); ctx.quadraticCurveTo(c0 - w0 * 0.5, y - 7, c0, y - 4); ctx.quadraticCurveTo(c0 + w0 * 0.5, y - 7, c0 + w0, y + 2); ctx.quadraticCurveTo(c0, y + 9, c0 - w0, y + 2); ctx.fill();
      for (let k = 0; k < 7; k++) {
        const ix = c0 - w0 * 0.85 + k * w0 * 0.28, il = 5 + hash(k, y) * 12;
        ctx.fillStyle = lg(ctx, ix - 2, 0, ix + 2, 0, ['#f4fbff', '#a8d4f4']);
        ctx.beginPath(); ctx.moveTo(ix - 2.4, y + 3 + Math.sin(k) * 1.5); ctx.lineTo(ix, y + 5 + il); ctx.lineTo(ix + 2.4, y + 3 + Math.sin(k) * 1.5); ctx.fill();
      }
    }
    // frost crystals sparkling on the bark
    for (let i = 0; i < 6; i++) {
      const x = 150 + hash(i, 1) * 60, y = 950 + hash(i, 2) * 140, tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.strokeStyle = `rgba(230,246,255,${0.4 + 0.5 * tw})`; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) { const a = k * PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 3, y - Math.sin(a) * 3); ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); ctx.stroke(); }
    }
  }

  function storm(ctx, t) {
    if (!vis(860, 1140)) return;
    // a brooding storm cloud wrapped round the right limb, lightning forking down to a rod on node 18's ledge
    const strike = fr(t / 2.6), on = strike < 0.12;
    const flash = on ? 1 - strike / 0.12 : 0;
    if (flash) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(170,170,255,${0.18 * flash})`; ctx.fillRect(220, 880, 140, 260); ctx.restore(); }
    for (let i = 0; i < 6; i++) {
      const x = 270 + (i % 3) * 30 + Math.sin(t * 0.4 + i) * 5, y = 920 + Math.floor(i / 3) * 18 + hash(i, 2) * 6;
      cloud(ctx, x, y, 20 + hash(i, 3) * 8, flash ? '#9a9ae8' : '#6a6ab4', '#2c2a62', 0.95);
    }
    if (on) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const R = K.rand(Math.floor(t / 2.6) + 5);
      let x = 300, y = 940; const pts = [[x, y]];
      while (y < 1000) { x += (R() - 0.5) * 16; y += 8 + R() * 6; pts.push([x, y]); }
      pts.push([304, 1004]);
      for (const [lw, a] of [[6, 0.25], [2.2, 0.9]]) {
        ctx.strokeStyle = `rgba(220,220,255,${a * flash})`; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
      }
      ctx.restore();
    }
    // rain streaks under the cloud
    ctx.strokeStyle = 'rgba(190,200,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const x = 250 + hash(i, 4) * 100, y = 950 + fr(t * 1.4 + hash(i, 5)) * 110; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9); ctx.stroke(); }
  }

  function magmaTrunk(ctx, t) {
    if (!vis(700, 940)) return;
    // the bark chars as it nears the crown: soot, then a web of glowing cracks that pulse like breathing coals
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.2);
    ctx.save();
    ctx.beginPath(); for (let y = 640; y <= 960; y += 8) ctx.lineTo(cx(y) - hw(y), y); for (let y = 960; y >= 640; y -= 8) ctx.lineTo(cx(y) + hw(y), y); ctx.closePath(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, 960, 0, 820, ['rgba(20,10,10,0)', 'rgba(20,10,10,.45)']); ctx.fillRect(100, 640, 160, 320);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const R = K.rand(77);
    for (let k = 0; k < 5; k++) {
      let x = 150 + k * 15 + R() * 6, y = 950 - R() * 50; const pts = [[x, y]];
      for (let s2 = 0; s2 < 7; s2++) { x += (R() - 0.5) * 7; y -= 14 + R() * 16; pts.push([x, y]); }
      const near = (px, py) => Math.hypot(px - 180, (py - 850) * 1.3) < 34;
      for (const [lw, c] of [[8, `rgba(255,80,20,${0.22 * pulse})`], [3, `rgba(255,150,50,${0.85 * pulse})`], [0.9, 'rgba(255,236,170,.85)']]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
        let pen = false, last = null;
        for (const p of pts) {
          if (near(p[0], p[1])) { pen = false; last = null; continue; }
          if (!pen) ctx.moveTo(p[0], p[1]); else ctx.quadraticCurveTo(last[0], last[1], (last[0] + p[0]) / 2, (last[1] + p[1]) / 2);
          pen = true; last = p;
        }
        ctx.stroke();
      }
    }
    for (let y = 646; y < 950; y += 17) {
      const j = hash(y, 9); if (j < 0.45 || Math.abs(y - 850) < 30) continue;
      const c0 = cx(y), w0 = hw(y), x0 = c0 - w0 * (0.2 + j * 0.6), x1 = x0 + w0 * (0.4 + j * 0.3);
      for (const [lw, c] of [[4, `rgba(255,90,30,${0.2 * pulse})`], [1.6, `rgba(255,170,70,${0.8 * pulse})`]]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y + 4); ctx.quadraticCurveTo((x0 + x1) / 2, y + 8, x1, y + 5); ctx.stroke();
      }
    }
    ctx.restore();
    K.glow(ctx, 180, 850, 70, [255, 110, 40], 0.18 * pulse);
    // lava drips off the node ledge
    for (let i = 0; i < 3; i++) {
      const ph = fr(t * 0.5 + i / 3), x = 162 + i * 18, y = 872 + ph * 50;
      ctx.fillStyle = `rgba(255,${140 + (1 - ph) * 80 | 0},50,${1 - ph})`; ctx.beginPath(); ctx.ellipse(x, y, 2, 3, 0, 0, TAU); ctx.fill();
    }
  }

  function crown(ctx, t) {
    if (!vis(420, 780)) return;
    // smouldering palm crown: big drooping fronds, green at the rib burning to orange tips with ember edges
    const top = 632;
    const back = [[-2.55, 120, 40], [-0.59, 120, 40], [-2.95, 150, 95], [-0.19, 150, 95], [-2.15, 100, 10], [-0.99, 100, 10]];
    for (const [a, len, dr] of back) frond(ctx, 180, top, a + Math.sin(t * 0.7 + a) * 0.03, len, dr, [58, 96, 44], [178, 82, 36], t, 0.8, 0.24);
    // coconuts glowing like embers in the crown
    for (const [x, y] of [[150, top + 6], [210, top + 6], [136, top + 18], [224, top + 18]]) {
      ctx.fillStyle = rg(ctx, x - 3, y - 3, 10, ['#9a5a34', '#4a2614', '#2a140a']); ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
      const fl = 0.6 + 0.4 * Math.sin(t * 3 + x);
      ctx.strokeStyle = `rgba(255,150,50,${0.8 * fl})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x, y + 1); ctx.lineTo(x + 3, y - 3); ctx.stroke();
      K.sheen(ctx, x, y, 8, 0.25);
    }
    const front = [[PI - 0.12, 135, 70], [0.12, 135, 70], [PI - 0.55, 105, 55], [0.55, 105, 55]];
    for (const [a, len, dr] of front) frond(ctx, 180, top + 8, a + Math.sin(t * 0.8 + a) * 0.03, len, dr, [74, 118, 50], [205, 98, 40], t, 1, 0.24);
  }

  // ------------------------------------------------------------------ the future: the tree keeps growing into the cloud
  const GHOST = { 21: [180, 352], 22: [104, 218], 23: [262, 196] };
  function futureGhost(ctx, t) {
    if (!vis(80, 520)) return;
    // the palm's next stretch, only a misty silhouette above the cloud sea: a trunk that forks into two new limbs
    const limbG = (pts, w0, w1) => {
      ctx.beginPath();
      const n = 20, L = [], Rr = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, p = bez(pts, u), q = bez(pts, Math.min(1, u + 0.02)), r = bez(pts, Math.max(0, u - 0.02));
        let dx = q[0] - r[0], dy = q[1] - r[1]; const Ln = Math.hypot(dx, dy) || 1; dx /= Ln; dy /= Ln;
        const w = lerp(w0, w1, u) / 2; L.push([p[0] - dy * w, p[1] + dx * w]); Rr.push([p[0] + dy * w, p[1] - dx * w]);
      }
      L.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath();
    };
    const limbsG = [[[[180, 470], [180, 430], [178, 400], [180, 352]], 36, 30], [[[180, 352], [140, 320], [104, 280], [104, 218]], 28, 18], [[[180, 352], [226, 316], [262, 260], [262, 196]], 28, 18],
      [[[104, 218], [100, 170], [116, 130], [120, 90]], 18, 8], [[[262, 196], [266, 150], [250, 110], [244, 70]], 18, 8]];
    for (const [pts, w0, w1] of limbsG) {
      limbG(pts, w0, w1); ctx.fillStyle = lg(ctx, 60, 0, 300, 0, ['rgba(214,196,240,.30)', 'rgba(170,150,210,.22)']); ctx.fill();
      ctx.strokeStyle = 'rgba(235,225,255,.28)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
    // little ghost fronds budding at the limb tips
    ctx.fillStyle = 'rgba(214,196,240,.22)';
    for (const [x, y] of [[120, 92], [244, 72]]) for (let f = 0; f < 5; f++) {
      const a = -PI / 2 + (f - 2) * 0.6, L = 26;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.6 - 4, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.4 + 8); ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.4, x, y + 3); ctx.fill();
    }
    // dashed trail and the '?' nodes waiting on it
    ctx.save(); ctx.lineCap = 'round';
    ctx.setLineDash([3, 8]); ctx.lineDashOffset = -t * 8; ctx.strokeStyle = 'rgba(255,244,230,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(180, 470); ctx.lineTo(180, 352); bezPath(ctx, [[180, 352], [140, 320], [104, 280], [104, 218]]); ctx.stroke();
    ctx.beginPath(); bezPath(ctx, [[180, 352], [226, 316], [262, 260], [262, 196]]); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    for (const [n, [x, y]] of Object.entries(GHOST)) {
      const p = 0.5 + 0.5 * Math.sin(t * 1.5 + +n);
      ctx.fillStyle = 'rgba(70,50,100,.35)'; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,244,236,${0.45 + 0.25 * p})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = t * 4; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `900 16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,248,240,.8)'; ctx.fillText('?', x, y + 1);
      ctx.font = `900 9px ${FONT}`; ctx.fillStyle = 'rgba(255,248,240,.6)'; ctx.fillText(n, x, y + 28);
    }
    // wisps of mist drifting across the ghost tree
    for (let i = 0; i < 5; i++) {
      const y = 140 + i * 70, x = fr(hash(i, 21) + t * 0.012 * (i % 2 ? 1 : -1)) * (W + 200) - 100;
      cloud(ctx, x, y, 24 + hash(i, 22) * 14, 'rgba(240,220,240,.28)', 'rgba(190,160,200,.06)');
    }
  }
  // the real, green shoot pushing up out of the crown into the cloud, with the sign hung on a side twig
  function futureShoot(ctx, t) {
    if (!vis(380, 640)) return;
    const sw = Math.sin(t * 0.8) * 2;
    ctx.save(); ctx.lineCap = 'round';
    for (const [lw, c] of [[13, '#2f6a2a'], [9, '#5aa83c'], [3, 'rgba(220,255,170,.6)']]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(180, 620); ctx.bezierCurveTo(184, 560, 174 + sw, 490, 180 + sw, 420); ctx.stroke();
    }
    // the side twig the sign hangs from, and a bud
    for (const [lw, c] of [[5, '#2f6a2a'], [3, '#5aa83c']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(180 + sw, 478); ctx.quadraticCurveTo(220, 470, 250, 448); ctx.stroke(); }
    ctx.fillStyle = lg(ctx, 240, 466, 262, 480, ['#b8f070', '#4a9a34']); ctx.beginPath(); ctx.ellipse(254, 446, 8, 5, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, 150, 520, 170, 530, ['#b8f070', '#4a9a34']); ctx.beginPath(); ctx.ellipse(170, 540, 9, 5, 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function futureSign(ctx, t) {
    if (!vis(420, 540)) return;
    // a wooden sign hung off the shoot's twig on two ropes, swaying
    const sw = Math.sin(t * 1.1) * 0.05, x = 232, y = 460;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.strokeStyle = 'rgba(80,50,30,.9)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-34, 18); ctx.lineTo(0, 0); ctx.lineTo(34, 18); ctx.stroke();
    ctx.fillStyle = 'rgba(30,10,10,.25)'; ctx.beginPath(); ctx.roundRect(-54, 20, 108, 34, 7); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, 16, 0, 50, ['#e8b878', '#b07a42', '#7a4e26']); ctx.beginPath(); ctx.roundRect(-54, 16, 108, 34, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(100,60,28,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-50, 33); ctx.lineTo(50, 33); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect(-50, 18, 100, 2);
    for (const d of [-1, 1]) { ctx.fillStyle = '#5a3416'; ctx.beginPath(); ctx.arc(d * 46, 24, 1.6, 0, TAU); ctx.fill(); }
    ctx.font = `900 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,240,210,.5)'; ctx.fillText('MORE LEVELS', 0, 26); ctx.fillText('COMING', 0, 41);
    ctx.fillStyle = '#5a2e12'; ctx.fillText('MORE LEVELS', 0, 25); ctx.fillText('COMING', 0, 40);
    ctx.restore();
  }

  // ------------------------------------------------------------------ paths
  function paths(ctx, t) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const list = PATHS.map((p, i) => [p, PATH_STATE[i], curve(p[0], p[1])]).filter(([, , c]) => { const [y0, y1] = cyBounds(c); return vis(y0, y1); });
    // dark paths first: faded and dashed
    for (const [, st, c] of list) {
      if (st !== 'dark') continue;
      ctx.beginPath(); bezPath(ctx, c); ctx.strokeStyle = 'rgba(20,14,24,.35)'; ctx.lineWidth = 10; ctx.stroke();
      ctx.setLineDash([4, 8]); ctx.strokeStyle = 'rgba(236,224,206,.55)'; ctx.lineWidth = 3.2; ctx.stroke(); ctx.setLineDash([]);
    }
    // lit paths: a raised golden trail with a travelling sparkle
    for (const [, st, c] of list) {
      if (st !== 'lit') continue;
      ctx.beginPath(); bezPath(ctx, c);
      ctx.save(); ctx.translate(0, 3); ctx.strokeStyle = 'rgba(20,10,10,.3)'; ctx.lineWidth = 15; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#8a5418'; ctx.lineWidth = 13; ctx.stroke();
      ctx.strokeStyle = '#e8a83a'; ctx.lineWidth = 9.5; ctx.stroke();
      ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = 5; ctx.stroke();
      ctx.setLineDash([2, 12]); ctx.lineDashOffset = -t * 16; ctx.strokeStyle = 'rgba(255,255,230,.9)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      // a soft glow
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,80,.12)'; ctx.lineWidth = 24; ctx.stroke(); ctx.restore();
    }
    // a glint travelling along each lit path
    for (const [, st, c] of list) {
      if (st !== 'lit') continue;
      const u = fr(t * 0.35 + c[0][0] * 0.01), p = bez(c, u);
      K.glow(ctx, p[0], p[1], 12, [255, 240, 170], 0.6);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ nodes
  const LEDGE = {
    jungle: { c: [150, 104, 60], top: [120, 190, 70] },
    temple: { c: [160, 164, 128], top: [240, 184, 58] },
    bog: { c: [110, 120, 50], top: [160, 200, 60] },
    grotto: { c: [70, 200, 230], top: [255, 120, 220] },
    lagoon: { c: [70, 160, 70], top: [150, 220, 90] },
    mine: { c: [170, 110, 56], top: [255, 200, 90] },
    caves: { c: [90, 100, 180], top: [180, 210, 255] },
    crystal: { c: [170, 90, 210], top: [255, 200, 255] },
    frost: { c: [170, 200, 230], top: [255, 255, 255] },
    storm: { c: [90, 90, 150], top: [190, 190, 255] },
    magma: { c: [60, 40, 40], top: [255, 120, 40] },
  };
  // a region-made ledge under each node: plank shelf, stone slab, lily pad, mushroom cap, ice disc...
  function ledge(ctx, l, x, y, t) {
    const L = LEDGE[l.region], r = 25, yy = y + 12, c = L.c;
    K.shadow(ctx, x + 3, yy + 10, r * 1.1, 6, 0.3);
    if (l.region === 'grotto') {   // a big glowing mushroom cap as the platform
      K.glow(ctx, x, yy, 50, [120, 240, 255], 0.3);
      ctx.fillStyle = lg(ctx, x - 8, 0, x + 8, 0, ['#e8f8ff', '#9ac0d0']); ctx.fillRect(x - 7, yy, 14, 30);
    }
    if (l.region === 'jungle') {   // wooden brackets under a plank platform
      ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 14, yy + 2); ctx.lineTo(x - 4, yy + 18); ctx.moveTo(x + 14, yy + 2); ctx.lineTo(x + 4, yy + 18); ctx.stroke();
    }
    if (l.region === 'frost' || l.region === 'magma' || l.region === 'caves' || l.region === 'temple') {   // a rock/ice slab's thickness
      ctx.fillStyle = rgb(c.map(v => v * 0.55)); ctx.beginPath(); ctx.ellipse(x, yy + 5, r, 8, 0, 0, PI); ctx.lineTo(x - r, yy); ctx.fill();
    }
    ctx.fillStyle = lg(ctx, x - r, yy - 8, x + r * 0.6, yy + 8, [rgb(lift(c, 50)), rgb(c), rgb(c.map(v => v * 0.6))]);
    ctx.beginPath(); ctx.ellipse(x, yy, r, 8.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(c.map(v => v * 0.5), 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, yy, r, 8.5, 0, 0.1, PI - 0.1); ctx.stroke();
    ctx.strokeStyle = rgb(lift(L.top, 30), 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, yy, r - 1, 7.5, 0, PI * 1.05, PI * 1.7); ctx.stroke();
    // region accents on the ledge
    if (l.region === 'jungle' || l.region === 'lagoon' || l.region === 'bog') {
      for (const d of [-1, 1]) leaf(ctx, x + d * (r - 4), yy + 2, 13, d < 0 ? PI - 0.2 + Math.sin(t + x) * 0.08 : 0.2 - Math.sin(t + x) * 0.08, l.region === 'bog' ? [130, 160, 50] : [90, 170, 60]);
    } else if (l.region === 'temple') {
      ctx.fillStyle = lg(ctx, 0, yy - 3, 0, yy + 3, GOLD); for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * (r - 5), yy + 1, 2.4, 0, TAU); ctx.fill(); }
    } else if (l.region === 'mine') {
      ctx.strokeStyle = 'rgba(90,50,20,.6)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 9, yy - 7); ctx.lineTo(x + k * 9, yy + 7); ctx.stroke(); }
    } else if (l.region === 'frost') {
      for (let k = 0; k < 6; k++) { const ix = x - r + 6 + k * 8, il = 5 + hash(k, 2) * 7; ctx.fillStyle = 'rgba(220,240,255,.9)'; ctx.beginPath(); ctx.moveTo(ix - 2, yy + 7); ctx.lineTo(ix, yy + 9 + il); ctx.lineTo(ix + 2, yy + 7); ctx.fill(); }
    } else if (l.region === 'crystal') {
      crystalCluster(ctx, x - r + 2, yy + 2, 0.45, t); crystalCluster(ctx, x + r - 2, yy + 2, 0.4, t + 1);
    } else if (l.region === 'storm') {
      // lightning rod
      ctx.strokeStyle = '#c0c4d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r - 4, yy); ctx.lineTo(x + r + 2, yy - 30); ctx.stroke();
      ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(x + r + 2, yy - 31, 2.4, 0, TAU); ctx.fill();
    } else if (l.region === 'magma') {
      ctx.strokeStyle = `rgba(255,150,50,${0.6 + 0.3 * Math.sin(t * 3)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 14, yy + 2); ctx.lineTo(x - 4, yy - 2); ctx.lineTo(x + 6, yy + 3); ctx.lineTo(x + 16, yy - 1); ctx.stroke();
    } else if (l.region === 'grotto') {
      ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const [dx, dy] of [[-12, -2], [10, 1], [-2, 3]]) { ctx.beginPath(); ctx.arc(x + dx, yy + dy, 2, 0, TAU); ctx.fill(); }
    }
  }

  function padlock(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#c8c0b4'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -4, 4.6, PI, 0); ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -4, 0, 8, ['#f6e8c4', '#c4a464', '#8a6a34']); ctx.beginPath(); ctx.roundRect(-6.5, -4, 13, 10.5, 2.5); ctx.fill();
    ctx.fillStyle = '#6a4e24'; ctx.beginPath(); ctx.arc(0, 0.5, 1.7, 0, TAU); ctx.fill(); ctx.fillRect(-0.8, 0.5, 1.6, 3.4);
    ctx.restore();
  }

  function stars(ctx, x, y, n, r = 6.5) {
    for (let j = 0; j < 3; j++) K.star(ctx, x + (j - 1) * (r * 2.1), y - (j === 1 ? 3 : 0), j === 1 ? r * 1.15 : r, j < n);
  }

  // the round level token: gold rim when cleared, warm bronze when tried, green and glowing when open, grey when locked
  function token(ctx, l, x, y, t, R = 17) {
    const st = l.state;
    const rim = st === 'done' ? ['#fff3a0', '#f2b628', '#a66a10'] : st === 'tried' ? ['#ffe0b0', '#e09040', '#8a4a18'] : st === 'open' ? ['#d8ff90', '#6cc23a', '#2a6a18'] : ['#a8a2b0', '#6e6878', '#3e3a48'];
    if (st === 'open') {
      const p = 0.5 + 0.5 * Math.sin(t * 4);
      K.glow(ctx, x, y, R * 2.6, [255, 230, 120], 0.35 + 0.25 * p);
      for (let k = 0; k < 2; k++) { const ph = fr(t * 0.7 + k / 2); ctx.strokeStyle = `rgba(255,240,150,${0.7 * (1 - ph)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R + 2 + ph * 18, 0, TAU); ctx.stroke(); }
    }
    ctx.fillStyle = rg(ctx, x - R * 0.35, y - R * 0.4, R * 1.2, rim); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(st === 'locked' ? [50, 46, 60] : st === 'open' ? [30, 80, 20] : [130, 70, 10], 0.6); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, R - 0.5, 0.2, PI - 0.2); ctx.stroke();
    const face = st === 'locked' ? ['#6c6676', '#3e3a48'] : ['#fff6dc', '#dcb478'];
    ctx.fillStyle = rg(ctx, x - R * 0.3, y - R * 0.35, R, face); ctx.beginPath(); ctx.arc(x, y, R - 4, 0, TAU); ctx.fill();
    K.sheen(ctx, x, y, R, st === 'locked' ? 0.2 : 0.5);
    ctx.font = `900 ${R > 18 ? 17 : 15}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (st === 'locked') { ctx.fillStyle = 'rgba(210,200,220,.55)'; ctx.fillText(String(l.id), x, y + 1); }
    else { ctx.fillStyle = 'rgba(255,255,240,.7)'; ctx.fillText(String(l.id), x + 0.5, y + 2); ctx.fillStyle = '#6a3a12'; ctx.fillText(String(l.id), x, y + 1); }
    if (st === 'locked') padlock(ctx, x + R * 0.72, y + R * 0.62, 0.85);
  }

  // pilot advantage hint: the suited pilot's portrait on the node's shoulder with a gold ring and a little up-arrow
  function advantage(ctx, l, x, y, t, r = 10) {
    const b = Math.sin(t * 2.2 + x) * 1.2;
    K.badge(ctx, l.pilot, x, y + b, r, '#ffcf3a');
    ctx.fillStyle = lg(ctx, 0, y + b + r - 8, 0, y + b + r + 2, ['#b8ff7a', '#3a9a24']);
    ctx.beginPath(); ctx.arc(x + r * 0.8, y + b + r * 0.7, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + r * 0.8, y + b + r * 0.7 - 3); ctx.lineTo(x + r * 0.8 + 2.6, y + b + r * 0.7 + 0.6); ctx.lineTo(x + r * 0.8 - 2.6, y + b + r * 0.7 + 0.6); ctx.fill();
    ctx.fillRect(x + r * 0.8 - 0.9, y + b + r * 0.7, 1.8, 2.4);
  }

  function bossBanner(ctx, x, y, open) {
    ctx.font = `900 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = open ? lg(ctx, 0, y - 7, 0, y + 7, ['#ff6a4a', '#b8301a']) : lg(ctx, 0, y - 7, 0, y + 7, ['#7a7280', '#4a4450']);
    ctx.beginPath(); ctx.moveTo(x - 26, y - 7); ctx.lineTo(x + 26, y - 7); ctx.lineTo(x + 22, y); ctx.lineTo(x + 26, y + 7); ctx.lineTo(x - 26, y + 7); ctx.lineTo(x - 22, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - 22, y - 6, 44, 2);
    ctx.fillStyle = '#fff1d6'; ctx.fillText('BOSS', x, y + 0.5);
  }

  // dim a locked boss portrait without filters: a translucent dusk-violet wash
  function dimDisc(ctx, x, y, r) { ctx.fillStyle = 'rgba(40,30,56,.3)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  // the flytrap's lair round node 9: a giant flytrap growing out of the trunk, its toothy jaws gaping round the boss
  function lairFlytrap(ctx, l, x, y, t) {
    const open = l.state !== 'locked', R = 26, breathe = Math.sin(t * 1.6) * 0.05;
    // the stem curling out of the bark
    ctx.save(); ctx.lineCap = 'round';
    for (const [w, c] of [[14, '#2e6a1c'], [10, '#5aa02a'], [3, 'rgba(210,255,150,.5)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x + 4, y + 22); ctx.bezierCurveTo(x + 30, y + 40, x + 10, y + 60, x + 34, y + 76); ctx.stroke(); }
    ctx.restore();
    // big leaves fanning out at its base
    for (const [a, len] of [[PI + 0.25, 58], [-0.25, 58], [PI - 0.35, 44], [0.35, 44]]) leaf(ctx, x, y + 22, len, a + Math.sin(t * 0.9 + a) * 0.05, [66, 148, 48], 0.32);
    // the two jaws, hinged under the portrait
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(x, y + 24); ctx.rotate(d * (0.08 + breathe));
      // spiky cilia round the outer rim
      ctx.fillStyle = '#e8f8c0';
      for (let k = 0; k < 9; k++) {
        const u = 0.08 + k / 9 * 0.9, a = -PI / 2 + d * (PI / 2) * Math.cos(u * PI * 0.92);
        const px = d * 58 * Math.sin(u * PI * 0.95), py = -8 - u * 64, ox = d * Math.cos(u * PI * 0.5) * 11, oy = -Math.sin(u * PI * 0.55) * 9 - 2;
        ctx.beginPath(); ctx.moveTo(px - 2.4 * Math.sign(oy || 1), py - 2); ctx.lineTo(px + ox, py + oy); ctx.lineTo(px + 2.4, py + 2); ctx.fill();
      }
      ctx.fillStyle = lg(ctx, d * 10, -70, d * 50, 0, ['#d4f47a', '#5aa02a', '#2a6018']);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(d * 70, -4, d * 66, -66, d * 8, -76); ctx.bezierCurveTo(d * 36, -54, d * 34, -12, 0, 0); ctx.fill();
      ctx.fillStyle = lg(ctx, d * 10, -66, d * 40, 0, ['#ffa0a8', '#e0405a', '#a01c34']);
      ctx.beginPath(); ctx.moveTo(d * 3, -4); ctx.bezierCurveTo(d * 58, -8, d * 56, -60, d * 10, -70); ctx.bezierCurveTo(d * 32, -50, d * 28, -14, d * 3, -4); ctx.fill();
      ctx.fillStyle = 'rgba(150,20,40,.7)'; for (const [sx, sy, r] of [[30, -24, 3], [38, -40, 2.6], [26, -52, 2.2], [20, -12, 2]]) { ctx.beginPath(); ctx.arc(d * sx, sy, r, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(d * 12, -66); ctx.bezierCurveTo(d * 50, -56, d * 56, -20, d * 30, -8); ctx.stroke();
      ctx.restore();
    }
    if (open) K.glow(ctx, x, y, R * 2.4, [255, 220, 110], 0.3 + 0.15 * Math.sin(t * 4));
    K.badge(ctx, 'boss-' + l.boss, x, y, R, open ? '#ffcf3a' : '#8a8494');
    if (!open) { dimDisc(ctx, x, y, R - 1); padlock(ctx, x, y + 4, 1.3); }
    numberChip(ctx, l, x, y + R + 2);
    bossBanner(ctx, x, y - R - 12, open);
  }
  function numberChip(ctx, l, x, y) {
    ctx.font = `900 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const locked = l.state === 'locked';
    ctx.fillStyle = locked ? lg(ctx, 0, y - 8, 0, y + 8, ['#8a8494', '#4e4858']) : lg(ctx, 0, y - 8, 0, y + 8, ['#fff3a0', '#f2b628', '#a66a10']);
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = locked ? 'rgba(230,220,240,.8)' : '#6a3a12'; ctx.fillText(String(l.id), x, y + 0.5);
  }

  function lairGeode(ctx, l, x, y, t) {
    const R = 22, open = l.state !== 'locked';
    K.badge(ctx, 'boss-' + l.boss, x, y, R, open ? '#ffcf3a' : '#b48ad8');
    if (!open) { dimDisc(ctx, x, y, R - 1); padlock(ctx, x, y + 3, 1.2); }
    numberChip(ctx, l, x, y + R + 4);
    bossBanner(ctx, x, y - 44, open);
  }

  function lairDrake(ctx, l, x, y, t) {
    const R = 26, open = l.state !== 'locked';
    // the drake's perch: dark wings spread behind the arena, edged with ember light
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(x, y - 6); ctx.scale(d, 1);
      const flap = Math.sin(t * 1.2) * 0.05; ctx.rotate(-flap);
      ctx.fillStyle = lg(ctx, 0, -40, 70, 10, ['#5a2a2a', '#341618']);
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(30, -46, 76, -40); ctx.lineTo(66, -22); ctx.lineTo(70, -10); ctx.lineTo(56, -6); ctx.lineTo(58, 6); ctx.lineTo(40, 2); ctx.quadraticCurveTo(26, 10, 10, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,150,60,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(30, -46, 76, -40); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,50,40,.8)'; ctx.lineWidth = 1.2; for (const [ex, ey] of [[66, -22], [56, -6], [40, 2]]) { ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(ex, ey); ctx.stroke(); }
      ctx.restore();
    }
    // obsidian arena ring with lava seams
    const ay = y + 22;
    ctx.fillStyle = '#1e1214'; ctx.beginPath(); ctx.ellipse(x, ay + 6, 56, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, x - 56, ay - 14, x + 40, ay + 14, ['#6a4a50', '#3a2428', '#1e1214']); ctx.beginPath(); ctx.ellipse(x, ay, 56, 15, 0, 0, TAU); ctx.fill();
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.5);
    ctx.strokeStyle = `rgba(255,140,50,${0.8 * pulse})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, ay, 44, 10, 0, 0, TAU); ctx.stroke();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 44, ay + Math.sin(a) * 10); ctx.lineTo(x + Math.cos(a) * 54, ay + Math.sin(a) * 13.5); ctx.stroke(); }
    // braziers either side
    for (const d of [-1, 1]) {
      const bx = x + d * 50, by = ay - 6;
      ctx.fillStyle = lg(ctx, bx - 6, 0, bx + 6, 0, ['#8a6a6a', '#3a2626']); ctx.beginPath(); ctx.moveTo(bx - 7, by - 6); ctx.lineTo(bx + 7, by - 6); ctx.lineTo(bx + 3, by + 6); ctx.lineTo(bx - 3, by + 6); ctx.fill();
      flame(ctx, bx, by - 6, 1.2, t + d);
    }
    if (open) K.glow(ctx, x, y, R * 2.4, [255, 200, 100], 0.35);
    K.glow(ctx, x, y, R * 1.8, [255, 100, 40], 0.25 * pulse);
    K.badge(ctx, 'boss-' + l.boss, x, y, R, open ? '#ffcf3a' : '#c07050');
    if (!open) { dimDisc(ctx, x, y, R - 1); padlock(ctx, x, y + 4, 1.3); }
    numberChip(ctx, l, x, y + R + 2);
    bossBanner(ctx, x, y - R - 10, open);
  }

  // "you are here": the rocket bobbing beside the current node with a ribbon over it
  function player(ctx, l, x, y, t) {
    const bob = Math.sin(t * 2.4) * 3.5;
    K.shadow(ctx, x - 66, y + 30, 14, 4, 0.35 - bob * 0.02);
    K.rocket(ctx, x - 66, y - 2 + bob, 0.78, t);
    // ribbon with the level name
    const rx = x - 66, ry = y - 58 + Math.sin(t * 2) * 1.5;
    ctx.font = `900 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = 'YOU ARE HERE', w = 98;
    ctx.fillStyle = 'rgba(30,10,10,.3)'; ctx.beginPath(); ctx.roundRect(rx - w / 2 + 2, ry - 9 + 3, w, 19, 9); ctx.fill();
    for (const d of [-1, 1]) { ctx.fillStyle = '#a8701a'; ctx.beginPath(); ctx.moveTo(rx + d * (w / 2 - 6), ry - 6); ctx.lineTo(rx + d * (w / 2 + 10), ry - 3); ctx.lineTo(rx + d * (w / 2 + 5), ry + 4); ctx.lineTo(rx + d * (w / 2 + 10), ry + 11); ctx.lineTo(rx + d * (w / 2 - 6), ry + 9); ctx.fill(); }
    ctx.fillStyle = lg(ctx, 0, ry - 9, 0, ry + 10, ['#fff3a0', '#f2b628', '#c47e14']); ctx.beginPath(); ctx.roundRect(rx - w / 2, ry - 9, w, 19, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(rx - w / 2 + 8, ry - 7, w - 16, 2);
    ctx.fillStyle = '#6a3a12'; ctx.fillText(label, rx, ry + 1);
    // little bouncing arrow under the ribbon
    const ay = ry + 14 + Math.abs(Math.sin(t * 3)) * 3;
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(rx - 5, ay); ctx.lineTo(rx + 5, ay); ctx.lineTo(rx, ay + 6); ctx.fill();
    // the level name on a little plank below
    const ny = y + 68;
    ctx.font = `900 10px ${FONT}`; const nm = l.name, nw = ctx.measureText(nm).width + 20;
    ctx.fillStyle = 'rgba(20,10,10,.3)'; ctx.beginPath(); ctx.roundRect(x - nw / 2 + 2, ny - 8 + 3, nw, 16, 6); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, ny - 8, 0, ny + 8, ['#e8b878', '#9a6232']); ctx.beginPath(); ctx.roundRect(x - nw / 2, ny - 8, nw, 16, 6); ctx.fill();
    ctx.fillStyle = '#fff1d6'; ctx.fillText(nm, x, ny + 0.5);
  }

  function nodes(ctx, t) {
    for (const l of LEVELS) {
      const [x, y] = POS[l.id];
      if (!vis(y - 70, y + 70)) continue;
      if (l.boss) {
        if (l.id === 9) lairFlytrap(ctx, l, x, y, t);
        else if (l.id === 15) lairGeode(ctx, l, x, y, t);
        else lairDrake(ctx, l, x, y, t);
      } else {
        ledge(ctx, l, x, y, t);
        token(ctx, l, x, y, t);
        if (l.state !== 'locked') stars(ctx, x, y - 24, l.stars);
      }
      if (l.boss && l.state !== 'locked') stars(ctx, x, y + 47, l.stars, 5.5);
    }
    // advantage badges: current node and any open or retryable node
    for (const l of LEVELS) {
      if (!(l.current || l.state === 'open' || l.state === 'tried')) continue;
      const [x, y] = POS[l.id]; if (!vis(y - 60, y + 60)) continue;
      if (l.boss) advantage(ctx, l, x + 32, y - 20, t, 11); else advantage(ctx, l, x + 19, y - 15, t, 9);
    }
    const cur = LEVELS.find(l => l.current);
    if (cur) { const [x, y] = POS[cur.id]; if (vis(y - 90, y + 70)) player(ctx, cur, x, y, t); }
  }

  // ------------------------------------------------------------------ ambient life
  function ambient(ctx, t) {
    const bands = [[2250, 2600, 'pollen', [230, 255, 150], 22, 1], [1880, 2250, 'pollen', [255, 230, 150], 14, 2], [1580, 1780, 'spore', [140, 250, 255], 18, 3],
      [1380, 1600, 'bubble', [180, 255, 250], 10, 4], [1240, 1400, 'spore', [150, 190, 255], 10, 5], [900, 1110, 'snow', [240, 248, 255], 26, 6], [700, 920, 'ember', [255, 160, 70], 26, 7], [450, 720, 'ember', [255, 150, 60], 22, 8]];
    for (const [y0, y1, kind, c, n, seed] of bands) {
      if (!vis(y0, y1)) continue;
      ctx.save(); ctx.translate(0, y0); K.motes(ctx, W, y1 - y0, t, kind, c, n, seed); ctx.restore();
    }
    // fireflies in the jungle and drifting leaves
    if (vis(1900, 2600)) {
      for (let i = 0; i < 4; i++) {
        const ph = fr(t * 0.07 + i / 4), x = 30 + fr(hash(i, 2) + ph * 0.6) * 300, y = 1950 + ph * 600, rot = t * 2 + i;
        leaf(ctx, x + Math.sin(t * 1.5 + i) * 14, y, 10, rot, [120, 180, 70]);
      }
    }
  }

  // ------------------------------------------------------------------ register
  PV.maps.palm = {
    W, H,
    camera(t) {
      const T = 22, u = fr(t / T) * T, bot = H - 720, mid = POS[9][1] - 420;
      const e = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      let y;
      if (u < 1.5) y = bot;
      else if (u < 5) y = lerp(bot, mid, e(1.5, 5, u));
      else if (u < 9) y = mid;
      else if (u < 15.5) y = lerp(mid, 60, e(9, 15.5, u));
      else if (u < 17.5) y = 60;
      else y = lerp(60, bot, e(17.5, 22, u));
      return { x: 0, y };
    },
    draw(ctx, t, view) {
      V = view;
      sky(ctx);
      farTop(ctx, t); farHigh(ctx, t); farMiddle(ctx, t); farJungle(ctx, t);
      futureGhost(ctx, t);
      cloudBank(ctx, t);
      futureShoot(ctx, t);
      futureSign(ctx, t);
      crown(ctx, t);
      limbs(ctx);
      trunk(ctx, t);
      trunkDecor(ctx, t);
      jungleBase(ctx, t); temple(ctx, t); bog(ctx, t); grotto(ctx, t); lagoon(ctx, t); mine(ctx, t);
      caves(ctx, t); geode(ctx, t); crystal(ctx, t); frost(ctx, t); storm(ctx, t); magmaTrunk(ctx, t);
      paths(ctx, t);
      nodes(ctx, t);
      ambient(ctx, t);
    },
  };
})();
