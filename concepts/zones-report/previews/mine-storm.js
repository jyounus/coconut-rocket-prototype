// Old Gold Mine (Minecart Dash, TNT Barrel) and Thunder Rift (Tesla Pylons, Ball Lightning) previews.
(() => {
  const { TAU, clamp, lerp, smooth, rgb } = K;
  const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  // ---------- palettes ----------
  const MINE = {
    bgTop: [104, 82, 62], bgBot: [46, 33, 25], far: [92, 72, 55], far2: [80, 62, 47],
    wall: [46, 36, 28], wallIn: [15, 11, 8], rim: [255, 184, 92], seed: 3,
  };
  const STORM = {
    bgTop: [70, 66, 126], bgBot: [26, 24, 62], far: [58, 55, 110], far2: [48, 45, 96],
    wall: [36, 34, 56], wallIn: [11, 10, 21], rim: [196, 176, 255], seed: 9,
  };
  // wood and iron shades (light, mid, dark, edge)
  const WOOD = [[204, 150, 92], [140, 92, 50], [84, 52, 26], '#4a2410'];
  const IRON = [[168, 160, 166], [96, 90, 98], [52, 48, 56], '#2c2830'];

  // ---------- shared bits ----------
  // a timber plank (horizontal when w > h) with grain and nails, lit from the top-left
  function plank(ctx, x, y, w, h, seed = 1, nails = true) {
    const horiz = w >= h, r = K.rand(seed);
    ctx.fillStyle = horiz ? K.lg(ctx, 0, y, 0, y + h, [WOOD[0], WOOD[1], WOOD[2]]) : K.lg(ctx, x, 0, x + w, 0, [WOOD[0], WOOD[1], WOOD[2]]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rgb(WOOD[2], 0.55); ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      if (horiz) { const gy = y + h * (0.25 + i * 0.25) + (r() - 0.5); ctx.moveTo(x + r() * 6, gy); ctx.bezierCurveTo(x + w * 0.3, gy + (r() - 0.5) * 2, x + w * 0.6, gy + (r() - 0.5) * 2, x + w - r() * 6, gy); }
      else { const gx = x + w * (0.25 + i * 0.25) + (r() - 0.5); ctx.moveTo(gx, y + r() * 6); ctx.bezierCurveTo(gx + (r() - 0.5) * 2, y + h * 0.3, gx + (r() - 0.5) * 2, y + h * 0.6, gx, y + h - r() * 6); }
    }
    ctx.stroke();
    ctx.strokeStyle = WOOD[3]; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = rgb(WOOD[0], 0.6); ctx.beginPath();
    if (horiz) { ctx.moveTo(x + 1, y + 1.2); ctx.lineTo(x + w - 1, y + 1.2); } else { ctx.moveTo(x + 1.2, y + 1); ctx.lineTo(x + 1.2, y + h - 1); }
    ctx.stroke();
    if (nails) {
      const pts = horiz ? [[x + 3.5, y + h / 2], [x + w - 3.5, y + h / 2]] : [[x + w / 2, y + 3.5], [x + w / 2, y + h - 3.5]];
      for (const [nx, ny] of pts) { ctx.fillStyle = rgb(IRON[2]); ctx.beginPath(); ctx.arc(nx, ny, 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(IRON[0]); ctx.beginPath(); ctx.arc(nx - 0.4, ny - 0.4, 0.5, 0, TAU); ctx.fill(); }
    }
  }

  // jagged lightning polyline between two points
  function boltPts(seed, x0, y0, x1, y1, n, amp) {
    const r = K.rand(seed), pts = [[x0, y0]], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) { const u = i / n, o = (r() - 0.5) * 2 * amp * Math.sin(Math.PI * u); pts.push([x0 + dx * u + nx * o, y0 + dy * u + ny * o]); }
    pts.push([x1, y1]); return pts;
  }
  function path(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
  // an electric strand: violet halo, lavender body, white core (additive)
  function zap(ctx, pts, a = 1, wd = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [lw, c, al] of [[9 * wd, [130, 90, 255], 0.22], [4 * wd, [170, 160, 255], 0.55], [1.7 * wd, [255, 255, 255], 0.95]]) {
      ctx.strokeStyle = rgb(c, al * a); ctx.lineWidth = lw; path(ctx, pts); ctx.stroke();
    }
    ctx.restore();
  }

  // a hanging mine lantern on a little iron bracket; col = flame colour, k = brightness 0..1
  function lantern(ctx, wx, x, y, s, col, k) {
    ctx.save(); ctx.lineCap = 'round';
    // bracket from the wall
    ctx.strokeStyle = rgb(IRON[2]); ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(wx, y - 12 * s); ctx.lineTo(x, y - 12 * s); ctx.lineTo(x, y - 9 * s); ctx.stroke();
    ctx.strokeStyle = rgb(IRON[0], 0.6); ctx.lineWidth = 0.8 * s; ctx.beginPath(); ctx.moveTo(wx, y - 12.7 * s); ctx.lineTo(x, y - 12.7 * s); ctx.stroke();
    K.glow(ctx, x, y, 34 * s * (0.6 + k * 0.6), col, 0.55 * k);
    // cap and base
    ctx.fillStyle = K.lg(ctx, x - 5 * s, 0, x + 5 * s, 0, [IRON[0], IRON[1], IRON[2]]);
    ctx.beginPath(); ctx.moveTo(x - 4.5 * s, y - 6 * s); ctx.lineTo(x, y - 9.5 * s); ctx.lineTo(x + 4.5 * s, y - 6 * s); ctx.fill();
    ctx.fillRect(x - 4.5 * s, y + 5 * s, 9 * s, 2.2 * s);
    // glass
    ctx.fillStyle = K.rg(ctx, x - 1 * s, y - 1 * s, 6 * s, [[0, '#fffbe8'], [0.35, rgb(K.lift(col, 30))], [1, rgb(K.lift(col, -70))]]);
    ctx.beginPath(); ctx.roundRect(x - 3.8 * s, y - 6 * s, 7.6 * s, 11 * s, 2 * s); ctx.fill();
    // cage bars
    ctx.strokeStyle = rgb(IRON[2]); ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(x, y - 6 * s); ctx.lineTo(x, y + 5 * s); ctx.moveTo(x - 3.8 * s, y - 0.5 * s); ctx.lineTo(x + 3.8 * s, y - 0.5 * s); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.8 * s; ctx.beginPath(); ctx.moveTo(x - 2.6 * s, y - 4.5 * s); ctx.lineTo(x - 2.6 * s, y - 1.5 * s); ctx.stroke();
    ctx.restore();
  }

  // ---------- Old Gold Mine scene ----------
  function mineFar(ctx, w, h, t, layer, col) {
    const c = rgb(col); ctx.strokeStyle = c; ctx.lineCap = 'butt';
    if (layer === 0) {
      // headframe trestles and a winding wheel
      for (const [fx, fw] of [[w * 0.26, 26], [w * 0.74, 32]]) {
        ctx.fillRect(fx - fw / 2 - 3, 0, 6, h); ctx.fillRect(fx + fw / 2 - 3, 0, 6, h);
        ctx.lineWidth = 2.5; ctx.beginPath();
        for (let y = 20; y < h; y += 56) { ctx.moveTo(fx - fw / 2, y); ctx.lineTo(fx + fw / 2, y + 56); ctx.moveTo(fx + fw / 2, y); ctx.lineTo(fx - fw / 2, y + 56); }
        ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); for (let y = 20; y < h; y += 56) { ctx.moveTo(fx - fw / 2, y); ctx.lineTo(fx + fw / 2, y); } ctx.stroke();
      }
      const wx = w * 0.74, wy = h * 0.12, wr = Math.min(34, w * 0.11), a = t * 0.6;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a + i * TAU / 6) * wr, wy + Math.sin(a + i * TAU / 6) * wr); } ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx + wr, wy); ctx.lineTo(wx + wr, h); ctx.stroke();
    } else {
      // rock teeth from the top, ore heaps at the bottom, a ladder and a hanging bucket
      const r = K.rand(41);
      for (let i = 0; i < 6; i++) {
        const x = r() * w, cw = 14 + r() * 26, top = i % 2 === 0, len = h * (0.12 + r() * 0.22), y0 = top ? -5 : h + 5, y1 = top ? len : h - len;
        ctx.beginPath(); ctx.moveTo(x - cw, y0); ctx.lineTo(x - cw * 0.4, (y0 + y1) / 2 + 6); ctx.lineTo(x, y1); ctx.lineTo(x + cw * 0.5, (y0 + y1) / 2 - 4); ctx.lineTo(x + cw, y0); ctx.fill();
      }
      const lx = w * 0.4; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, h); ctx.moveTo(lx + 14, 0); ctx.lineTo(lx + 14, h); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); for (let y = 6; y < h; y += 13) { ctx.moveTo(lx, y); ctx.lineTo(lx + 14, y); } ctx.stroke();
      const bx = w * 0.62 + Math.sin(t * 0.8) * 3, by = h * 0.36;
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(w * 0.62, 0); ctx.lineTo(bx, by - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 8, by - 6); ctx.lineTo(bx + 8, by - 6); ctx.lineTo(bx + 6, by + 7); ctx.lineTo(bx - 6, by + 7); ctx.fill();
      // distant lantern dots
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [px, py, ph] of [[w * 0.18, h * 0.3, 0], [w * 0.55, h * 0.58, 2], [w * 0.83, h * 0.42, 4]]) {
        const k = 0.8 + 0.2 * Math.sin(t * 7 + ph) * Math.sin(t * 3.1 + ph);
        ctx.fillStyle = K.rg(ctx, px, py, 16, ['rgba(255,190,90,' + 0.35 * k + ')', 'rgba(255,150,60,0)']); ctx.beginPath(); ctx.arc(px, py, 16, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,150,' + 0.8 * k + ')'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  function mineWall(ctx, side, edge, w, h, t) {
    const r = K.rand(side < 0 ? 101 : 202), ins = Math.round(w * 0.1);
    const X = d => side < 0 ? d : w - d; // d = distance from the outer screen edge
    // rock lumps
    for (let i = 0; i < 18; i++) {
      const y = r() * h, x = X(r() * ins * 1.1), rad = 4 + r() * 8, n = 6, a0 = r() * TAU;
      ctx.beginPath();
      for (let k = 0; k < n; k++) { const a = a0 + k * TAU / n, rr = rad * (0.75 + r() * 0.35); k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
      ctx.closePath(); ctx.fillStyle = i % 3 ? 'rgba(64,50,38,.7)' : 'rgba(30,22,16,.6)'; ctx.fill();
      ctx.strokeStyle = 'rgba(120,96,70,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, rad * 0.7, 3.4, 4.6); ctx.stroke();
    }
    // gold veins with twinkling glints
    for (let i = 0; i < 3; i++) {
      let y = r() * h, x = X(1 + r() * 6); const pts = [[x, y]];
      for (let k = 0; k < 5; k++) { x += side < 0 ? 2 + r() * 4 : -(2 + r() * 4); y += 3 + (r() - 0.3) * 9; pts.push([x, y]); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(90,62,22,.8)'; ctx.lineWidth = 2.6; path(ctx, pts); ctx.stroke();
      ctx.strokeStyle = 'rgba(214,166,70,.75)'; ctx.lineWidth = 0.9; path(ctx, pts); ctx.stroke();
      for (const [px, py] of pts.filter((_, k) => k % 2)) { ctx.fillStyle = K.rg(ctx, px - 0.6, py - 0.6, 2.4, ['#fff2c0', '#d8a438', '#7a4e12']); ctx.beginPath(); ctx.ellipse(px, py, 2, 1.5, 0.5, 0, TAU); ctx.fill(); }
      const g = pts[2 + i % 3], tw = Math.max(0, Math.sin(t * 2.4 + i * 2.1));
      if (tw > 0.2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,240,180,' + tw * 0.9 + ')'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(g[0] - 4 * tw, g[1]); ctx.lineTo(g[0] + 4 * tw, g[1]); ctx.moveTo(g[0], g[1] - 4 * tw); ctx.lineTo(g[0], g[1] + 4 * tw); ctx.stroke(); ctx.restore();
      }
    }
    // timber shoring: a vertical post just behind the rim and cap beams running into the rock
    const px = side < 0 ? ins - 15 : w - ins + 7;
    for (let y = 92 + (side > 0 ? 60 : 0); y < h + 40; y += 150) plank(ctx, side < 0 ? -4 : w - ins - 4, y, ins + 8, 8, y + side);
    plank(ctx, px, -4, 8, h + 8, side + 7, false);
    ctx.fillStyle = rgb(IRON[2]); for (let y = 30; y < h; y += 60) { ctx.beginPath(); ctx.arc(px + 4, y, 1.3, 0, TAU); ctx.fill(); }
  }
  MINE.farShape = mineFar; MINE.wallDeco = mineWall;

  // ---------- Thunder Rift scene ----------
  const flashAt = t => { const p = ((t % 4) + 4) % 4; return Math.max(Math.exp(-(((p - 2.7) / 0.05) ** 2)), 0.75 * Math.exp(-(((p - 2.9) / 0.06) ** 2)), p > 2.7 && p < 3.4 ? 0.25 * (1 - (p - 2.7) / 0.7) : 0); };
  function stormFar(ctx, w, h, t, layer, col) {
    const r = K.rand(layer ? 61 : 23);
    if (layer === 0) {
      // jagged cliffs and floating rift islands
      ctx.beginPath(); ctx.moveTo(-5, h); let x = -5;
      while (x < w + 10) { x += 14 + r() * 26; ctx.lineTo(x, h * (0.62 + r() * 0.25)); }
      ctx.lineTo(w + 5, h); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.18 + i * 0.32) + r() * 20, cy = h * (0.18 + r() * 0.3) + Math.sin(t * 0.7 + i) * 3, cw = 18 + r() * 16;
        ctx.beginPath(); ctx.moveTo(cx - cw, cy); ctx.lineTo(cx - cw * 0.6, cy - 6); ctx.lineTo(cx + cw * 0.5, cy - 7); ctx.lineTo(cx + cw, cy); ctx.lineTo(cx + cw * 0.2, cy + cw * 1.1); ctx.lineTo(cx - cw * 0.3, cy + cw * 0.6); ctx.fill();
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const x = r() * w, cw = 10 + r() * 22, top = i % 2 === 0, len = h * (0.15 + r() * 0.25), y0 = top ? -5 : h + 5, y1 = top ? len : h - len;
        ctx.beginPath(); ctx.moveTo(x - cw, y0); ctx.lineTo(x - cw * 0.3, lerp(y0, y1, 0.55)); ctx.lineTo(x - cw * 0.5, lerp(y0, y1, 0.7)); ctx.lineTo(x, y1); ctx.lineTo(x + cw * 0.6, lerp(y0, y1, 0.4)); ctx.lineTo(x + cw, y0); ctx.fill();
      }
      // the sky bolt during a flash
      const f = flashAt(t);
      if (f > 0.05) {
        const seed = Math.floor(t / 4) * 7 + 3, bx = w * (0.3 + K.rand(seed)() * 0.4);
        const pts = boltPts(seed, bx, -5, bx + (K.rand(seed + 1)() - 0.5) * 60, h * 0.7, 12, 26);
        zap(ctx, pts, f * 0.85, 0.8);
        const fk = boltPts(seed + 5, pts[5][0], pts[5][1], pts[5][0] + 40, pts[5][1] + 70, 6, 12); zap(ctx, fk, f * 0.7, 0.7);
      }
    }
  }
  let stormFlash = 0;
  function stormWall(ctx, side, edge, w, h, t) {
    const r = K.rand(side < 0 ? 303 : 404), ins = Math.round(w * 0.1), X = d => side < 0 ? d : w - d;
    // slate strata: slanted slabs and facets
    ctx.lineWidth = 1.2;
    for (let y = -40; y < h + 40; y += 13 + r() * 6) {
      ctx.strokeStyle = r() < 0.5 ? 'rgba(78,74,110,.55)' : 'rgba(8,7,16,.6)';
      ctx.beginPath(); ctx.moveTo(X(-2), y); ctx.lineTo(X(ins + 12), y + side * 14); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const y = r() * h, d = r() * ins, sz = 5 + r() * 8;
      ctx.fillStyle = K.lg(ctx, X(d), y - sz, X(d + sz), y + sz, ['rgba(96,92,132,.55)', 'rgba(40,38,62,.2)']);
      ctx.beginPath(); ctx.moveTo(X(d), y - sz); ctx.lineTo(X(d + sz), y - sz * 0.2); ctx.lineTo(X(d + sz * 0.4), y + sz); ctx.closePath(); ctx.fill();
    }
    // glowing electric veins that pulse outward
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const y0 = (i + 0.3 + r() * 0.5) * h / 4, pts = [[X(-2), y0]];
      for (let k = 1; k <= 5; k++) pts.push([X(k * (ins + 6) / 5), y0 + (r() - 0.5) * 22 + k * (r() - 0.3) * 4]);
      const br = pts[2 + (i % 2)], brEnd = [br[0] + side * -1 * 6, br[1] + (i % 2 ? 14 : -14)];
      const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(t * 3 - i * 1.7)) + stormFlash;
      ctx.strokeStyle = rgb([90, 66, 180], 0.6 + 0.3 * Math.min(1, pulse)); ctx.lineWidth = 3.4; path(ctx, pts); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgb([220, 210, 255], 0.75 * pulse); ctx.lineWidth = 1.2; path(ctx, pts); ctx.stroke();
      path(ctx, [br, brEnd]); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  STORM.farShape = stormFar; STORM.wallDeco = stormWall;

  // ================= MINECART DASH =================
  // rail at height y between the walls (S = shaft), cycle 3.6 s: idle, lantern flashes, cart dashes across
  const CART_P = 3.6;
  function cartPhase(t) { const p = ((t % CART_P) + CART_P) % CART_P; return { p, tell: p > 1.3 && p < 2.2, dash: p >= 2.2 && p < 3.1, u: clamp((p - 2.2) / 0.9, 0, 1) }; }

  function tunnel(ctx, ex, side, y, s) {
    // a dark adit in the wall where the rail runs in, with a timber lintel
    const x0 = side < 0 ? ex - 24 * s : ex - 3 * s, x1 = side < 0 ? ex + 3 * s : ex + 24 * s;
    ctx.fillStyle = K.rg(ctx, (x0 + x1) / 2, y - 18 * s, 30 * s, ['#050302', '#0c0806', 'rgba(26,18,12,.9)']);
    ctx.beginPath(); ctx.roundRect(x0, y - 46 * s, x1 - x0, 50 * s, [10 * s, 10 * s, 2, 2]); ctx.fill();
    plank(ctx, side < 0 ? ex - 26 * s : ex - 8 * s, y - 52 * s, 34 * s, 8 * s, 9 + side);
    plank(ctx, side < 0 ? ex - 4 * s : ex - 3 * s, y + 3 * s, 7 * s, 22 * s, 5 + side, false);
  }
  function rail(ctx, x0, x1, y, s) {
    // slim trestle stringer, sleepers seen end-on, steel rail on top
    plank(ctx, x0, y + 5 * s, x1 - x0, 5 * s, 77, false);
    for (let x = x0 + 6 * s; x < x1 - 4 * s; x += 15 * s) { ctx.fillStyle = K.lg(ctx, 0, y + 2.5 * s, 0, y + 6 * s, [WOOD[1], WOOD[2]]); ctx.fillRect(x, y + 2.5 * s, 7 * s, 3 * s); }
    ctx.fillStyle = K.lg(ctx, 0, y - 0.5 * s, 0, y + 3 * s, ['#e6e2e8', '#8a8592', '#46424e']); ctx.fillRect(x0, y - 0.5 * s, x1 - x0, 3.2 * s);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x0, y - 0.5 * s, x1 - x0, 0.7 * s);
  }
  function minecart(ctx, x, y, s, t, moving) {
    const jy = moving ? Math.sin(t * 70) * 0.9 * s : 0, ry = y + jy;
    K.danger(ctx, x, ry - 22 * s, 48 * s, 0.38);
    // motion streaks and wheel sparks
    if (moving) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,240,220,.28)'; ctx.lineWidth = 1.4 * s; ctx.lineCap = 'round'; ctx.beginPath();
      for (const [dy, l] of [[-30, 26], [-22, 40], [-14, 30]]) { ctx.moveTo(x - 34 * s, ry + dy * s); ctx.lineTo(x - (34 + l) * s, ry + dy * s); }
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const r = K.rand(Math.floor(t * 30) + 11);
      for (let i = 0; i < 10; i++) {
        const wx = x + (i % 2 ? -15 : 15) * s, a = Math.PI + 0.2 + r() * 0.9, l = (5 + r() * 12) * s, d = r() * 6 * s;
        const sx0 = wx - 6 * s + Math.cos(a) * d, sy0 = y + Math.sin(a) * d * 0.4;
        ctx.strokeStyle = `rgba(255,${180 + r() * 60 | 0},90,${0.5 + r() * 0.5})`; ctx.lineWidth = 1.1 * s;
        ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 + Math.cos(a) * l, sy0 - Math.abs(Math.sin(a)) * l * 0.8); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save(); ctx.translate(x, ry); ctx.scale(s, s);
    // ore heap
    const r = K.rand(19);
    for (let i = 0; i < 8; i++) {
      const ox = -22 + i * 6.2 + (r() - 0.5) * 3, oy = -41 - Math.sin((i + 0.5) / 8 * Math.PI) * 9 + r() * 2, orr = 4.5 + r() * 3;
      ctx.fillStyle = K.rg(ctx, ox - 1.5, oy - 1.5, orr * 1.4, ['#a69a8e', '#6a5e54', '#3a322c']); ctx.beginPath(); ctx.arc(ox, oy, orr, 0, TAU); ctx.fill();
    }
    for (const [gx, gy, gr] of [[-13, -46, 3.6], [3, -51, 4.2], [16, -44, 3.2], [-4, -44, 2.8], [10, -49, 2.4], [-20, -42, 2.4]]) {
      ctx.fillStyle = K.rg(ctx, gx - 1, gy - 1.2, gr * 1.5, ['#fff6c4', '#f2c03e', '#9a6410']); ctx.beginPath(); ctx.ellipse(gx, gy, gr * 1.15, gr, 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a4a0a'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    const tw = Math.max(0, Math.sin(t * 5));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,250,200,${tw})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4 - 5 * tw, -50); ctx.lineTo(4 + 5 * tw, -50); ctx.moveTo(4, -50 - 5 * tw); ctx.lineTo(4, -50 + 5 * tw); ctx.stroke(); ctx.restore();
    // tub
    ctx.beginPath(); ctx.moveTo(-30, -37); ctx.lineTo(30, -37); ctx.lineTo(24, -9); ctx.lineTo(-24, -9); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, -30, -37, 26, -6, ['#e08a5c', '#a9482c', '#6a2616']); ctx.fill();
    ctx.strokeStyle = '#4a1a10'; ctx.lineWidth = 1.3; ctx.stroke();
    // rust blotches
    ctx.fillStyle = 'rgba(90,34,18,.35)';
    for (const [bx, by, br] of [[-14, -18, 4], [10, -26, 3], [17, -15, 3.5], [-4, -30, 2.4]]) { ctx.beginPath(); ctx.ellipse(bx, by, br * 1.4, br, 0.3, 0, TAU); ctx.fill(); }
    // iron straps and rivets
    const strap = (y0, x0, x1, hgt) => { ctx.fillStyle = K.lg(ctx, 0, y0, 0, y0 + hgt, [IRON[0], IRON[1], IRON[2]]); ctx.fillRect(x0, y0, x1 - x0, hgt); ctx.strokeStyle = IRON[3]; ctx.lineWidth = 0.7; ctx.strokeRect(x0, y0, x1 - x0, hgt); };
    strap(-40, -32, 32, 4.5); strap(-24, -27.4, 27.4, 3.4);
    for (const d of [-1, 1]) { ctx.save(); ctx.translate(d * 21.5, -23); ctx.rotate(d * -0.2); ctx.fillStyle = K.lg(ctx, -2, 0, 2, 0, [IRON[0], IRON[2]]); ctx.fillRect(-2, -15, 4, 28); ctx.restore(); }
    for (let i = -3; i <= 3; i++) { const rx = i * 8.5; ctx.fillStyle = '#3a3238'; ctx.beginPath(); ctx.arc(rx, -37.7, 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8e2ea'; ctx.beginPath(); ctx.arc(rx - 0.4, -38.1, 0.45, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,220,190,.45)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-26, -33); ctx.lineTo(-22, -13); ctx.stroke();
    // wheels
    const ang = moving ? x / (6.5 * s) : 0;
    for (const wx of [-15, 15]) {
      ctx.fillStyle = K.rg(ctx, wx - 2, -9, 8, ['#9a94a0', '#4c4652', '#24202a']); ctx.beginPath(); ctx.arc(wx, -6.5, 6.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1e1a22'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = '#2a262e'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let k = 0; k < 4; k++) { const a = ang + k * Math.PI / 2; ctx.moveTo(wx, -6.5); ctx.lineTo(wx + Math.cos(a) * 5, -6.5 + Math.sin(a) * 5); }
      ctx.stroke();
      ctx.fillStyle = '#c8c2cc'; ctx.beginPath(); ctx.arc(wx, -6.5, 1.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(wx, -6.5, 5.2, 3.6, 4.8); ctx.stroke();
    }
    ctx.restore();
  }
  // the whole hazard: tunnels, rail, signal lanterns, cart (clipped so it rolls out of the adits)
  function drawMinecart(ctx, S, y, s, t, w) {
    const { tell, dash, u, p } = cartPhase(t), L = S.L(y), R = S.R(y);
    tunnel(ctx, L, -1, y, s); tunnel(ctx, R, 1, y, s);
    // warning band glow across the rail while it flashes
    if (tell || dash) {
      const a = dash ? 0.2 : 0.14 * (Math.sin(p * 40) > 0 ? 1 : 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.lg(ctx, 0, y - 46 * s, 0, y + 6 * s, ['rgba(255,60,50,0)', `rgba(255,60,50,${a})`, 'rgba(255,60,50,0)']); ctx.fillRect(L, y - 46 * s, R - L, 52 * s); ctx.restore();
    }
    rail(ctx, L - 22 * s, R + 22 * s, y, s);
    for (const [x0, d] of [[L - 24 * s, 1], [R + 24 * s, -1]]) { ctx.fillStyle = K.lg(ctx, x0, 0, x0 + d * 20 * s, 0, ['rgba(8,5,4,.95)', 'rgba(8,5,4,0)']); ctx.fillRect(Math.min(x0, x0 + d * 20 * s), y - 2 * s, 20 * s, 13 * s); }
    const flashOn = tell ? Math.sin(p * 38) > 0 : dash;
    const col = flashOn ? [255, 72, 52] : [255, 188, 92], k = flashOn ? 1 : 0.55 + 0.08 * Math.sin(t * 13);
    lantern(ctx, L - 6 * s, L + 9 * s, y - 64 * s, s, col, k);
    lantern(ctx, R + 6 * s, R - 9 * s, y - 64 * s, s, col, k);
    if (dash) {
      const cx = lerp(L - 40 * s, R + 40 * s, u);
      ctx.save(); ctx.beginPath(); ctx.rect(L - 21 * s, 0, R - L + 42 * s, y + 4 * s); ctx.clip();
      minecart(ctx, cx, y, s, t, true); ctx.restore();
    }
  }
  PV.obstacles.minecart = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, MINE);
    drawMinecart(ctx, S, 150, 0.8 * 1.15, t, w);
    const { p } = cartPhase(t);
    const ry = p < 0.7 ? lerp(370, 262, ease(p / 0.7)) : p < 3.05 ? 262 + Math.sin(p * 3) * 2 : lerp(262, -50, ease((p - 3.05) / 0.55));
    K.rocket(ctx, w * 0.5, ry, 0.8, t);
    K.motes(ctx, w, h, t, 'dust', [255, 220, 170], 22, 5);
  };

  // ================= TNT BARREL =================
  const TNT_P = 3.8;
  function tntPhase(t) { const p = ((t % TNT_P) + TNT_P) % TNT_P; return { p, fuse: 1 - 0.85 * ease(p / 2.1) - 0.15 * clamp((p - 2.1) / 0.5, 0, 1), tell: p >= 2.1 && p < 2.6, blast: p >= 2.6 && p < 3.15, e: clamp((p - 2.6) / 0.55, 0, 1), smoke: clamp((p - 2.75) / 1.05, 0, 1), back: clamp((p - 3.35) / 0.45, 0, 1) }; }
  const fuseCurve = (u, H) => { // cubic bezier from the lid up
    const P = [[0, -H], [5, -H - 9], [-6, -H - 14], [3, -H - 22]], m = 1 - u;
    return [m * m * m * P[0][0] + 3 * m * m * u * P[1][0] + 3 * m * u * u * P[2][0] + u * u * u * P[3][0], m * m * m * P[0][1] + 3 * m * m * u * P[1][1] + 3 * m * u * u * P[2][1] + u * u * u * P[3][1]];
  };
  function barrel(ctx, x, y, s, t, fuse, shake, hot, alpha) {
    const W = 30, H = 38;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + shake, y); ctx.scale(s, s);
    K.shadow(ctx, 0, 0, 18, 3, 0.4);
    // body
    const body = () => { ctx.beginPath(); ctx.moveTo(-W * 0.43, -H); ctx.quadraticCurveTo(-W * 0.56, -H / 2, -W * 0.43, 0); ctx.lineTo(W * 0.43, 0); ctx.quadraticCurveTo(W * 0.56, -H / 2, W * 0.43, -H); ctx.closePath(); };
    body(); ctx.fillStyle = K.lg(ctx, -W / 2, 0, W / 2, 0, [[0, '#9a2a1e'], [0.28, '#f06a4a'], [0.55, '#cc3a2a'], [1, '#6e1812']]); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.strokeStyle = 'rgba(80,14,10,.4)'; ctx.lineWidth = 0.9;
    for (const f of [-0.6, -0.2, 0.2, 0.6]) { ctx.beginPath(); ctx.moveTo(f * W * 0.43, -H); ctx.quadraticCurveTo(f * W * 0.56, -H / 2, f * W * 0.43, 0); ctx.stroke(); }
    // hoops
    for (const hy of [-H + 3, -5.5]) { ctx.fillStyle = K.lg(ctx, 0, hy - 2, 0, hy + 2.6, [IRON[0], IRON[1], IRON[2]]); ctx.fillRect(-W, hy - 2, W * 2, 4.4); }
    // heat flash before it blows
    if (hot > 0) { ctx.fillStyle = `rgba(255,240,200,${hot})`; ctx.fillRect(-W, -H, W * 2, H); }
    ctx.restore();
    body(); ctx.strokeStyle = '#5a1410'; ctx.lineWidth = 1.2; ctx.stroke();
    for (const hy of [-H + 3, -5.5]) for (const rx of [-9, 0, 9]) { ctx.fillStyle = '#2c2830'; ctx.beginPath(); ctx.arc(rx, hy + 0.2, 0.9, 0, TAU); ctx.fill(); }
    // label
    ctx.fillStyle = K.lg(ctx, 0, -25, 0, -13, ['#fff3d6', '#e8cf9e']); ctx.beginPath(); ctx.roundRect(-11, -25.5, 22, 12, 2); ctx.fill();
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#8e1a12'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TNT', 0, -19.2);
    // lid
    ctx.fillStyle = K.lg(ctx, -12, -H - 2, 12, -H + 2, ['#b0503a', '#6a1c14']); ctx.beginPath(); ctx.ellipse(0, -H, W * 0.43, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,200,.5)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -H + 7); ctx.quadraticCurveTo(-12.6, -H / 2, -10.5, -9); ctx.stroke();
    // fuse
    if (fuse > 0.01) {
      const pts = []; for (let i = 0; i <= 14; i++) pts.push(fuseCurve(i / 14 * fuse, H));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#6a4a26'; ctx.lineWidth = 2.6; path(ctx, pts); ctx.stroke();
      ctx.strokeStyle = '#d8b880'; ctx.lineWidth = 1.3; path(ctx, pts); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,60,30,.7)'; ctx.lineWidth = 1.3; ctx.setLineDash([1.2, 1.6]); path(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
      // the burning spark
      const [fx, fy] = pts[pts.length - 1], fl = 0.85 + 0.15 * Math.sin(t * 50);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.rg(ctx, fx, fy, 13 * fl, ['rgba(255,240,180,.9)', 'rgba(255,150,40,.45)', 'rgba(255,80,20,0)']); ctx.beginPath(); ctx.arc(fx, fy, 13 * fl, 0, TAU); ctx.fill();
      const r = K.rand(Math.floor(t * 24) + 3);
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 8; i++) { const a = r() * TAU, l = 3 + r() * 6; ctx.strokeStyle = `rgba(255,${200 + r() * 55 | 0},120,.9)`; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.5); ctx.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, TAU); ctx.fill();
      ctx.restore();
      // a thread of smoke
      ctx.strokeStyle = 'rgba(200,190,180,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, fy - 2); ctx.bezierCurveTo(fx + 4, fy - 8, fx - 4 + Math.sin(t * 3) * 2, fy - 13, fx + 2, fy - 20); ctx.stroke();
    }
    ctx.restore();
  }
  function explosion(ctx, bx, by, s, e, smoke, R) {
    // smoke clouds (behind the fire) rise and fade
    if (smoke > 0 && smoke < 1) {
      const r = K.rand(91);
      for (let i = 0; i < 7; i++) {
        const a = r() * TAU, d = R * (0.2 + r() * 0.35) * (0.5 + smoke), pr = (14 + r() * 10) * s * (0.7 + smoke * 0.9);
        const px = bx + Math.cos(a) * d, py = by + Math.sin(a) * d * 0.7 - smoke * 34 * s, al = 0.8 * (1 - smoke) * Math.min(1, smoke * 5);
        ctx.fillStyle = K.rg(ctx, px - pr * 0.3, py - pr * 0.3, pr, [`rgba(132,116,104,${al})`, `rgba(70,56,50,${al * 0.85})`, 'rgba(50,40,36,0)']);
        ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      }
    }
    if (e <= 0 || e >= 1) return;
    const k = 1 - e, eo = 1 - (1 - e) ** 3;
    K.danger(ctx, bx, by, R * 1.1, 0.55 * k);
    K.glow(ctx, bx, by, R * (0.9 + e * 0.6), [255, 200, 120], 0.9 * k);
    // star burst behind the fireball
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,210,110,${0.7 * k})`; ctx.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + 0.2, rr = (i % 2 ? 0.35 : 0.95 + 0.15 * Math.sin(i * 7)) * R * eo; i ? ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr) : ctx.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
    ctx.fill(); ctx.restore();
    // fireball blobs
    const r = K.rand(57);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + r() * 0.5, d = R * 0.42 * eo * (0.6 + r() * 0.5), br = (17 + r() * 11) * s * (0.6 + eo * 0.9) * (1 - 0.45 * e);
      const px = bx + Math.cos(a) * d, py = by + Math.sin(a) * d - e * 10 * s;
      ctx.fillStyle = K.rg(ctx, px - br * 0.25, py - br * 0.3, br, [[0, `rgba(255,250,210,${k})`], [0.35, `rgba(255,190,70,${k})`], [0.75, `rgba(230,80,30,${0.9 * k})`], [1, 'rgba(140,40,20,0)']]);
      ctx.beginPath(); ctx.arc(px, py, br, 0, TAU); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, bx, by, 26 * s * (1 + e), [`rgba(255,255,230,${k})`, 'rgba(255,200,100,0)']); ctx.beginPath(); ctx.arc(bx, by, 26 * s * (1 + e), 0, TAU); ctx.fill();
    // shockwave ring at the blast radius
    ctx.strokeStyle = `rgba(255,230,180,${0.85 * k})`; ctx.lineWidth = (5 * k + 1) * s; ctx.beginPath(); ctx.arc(bx, by, R * eo, 0, TAU); ctx.stroke();
    ctx.restore();
    // debris: staves, hoop bits, rocks
    const d2 = K.rand(33);
    for (let i = 0; i < 10; i++) {
      const a = d2() * TAU, sp = R * (0.7 + d2() * 0.6), px = bx + Math.cos(a) * sp * eo, py = by + Math.sin(a) * sp * eo + 40 * s * e * e, rot = e * (d2() - 0.5) * 14;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.globalAlpha = Math.min(1, k * 2);
      if (i % 3 === 0) { ctx.fillStyle = '#4c4652'; ctx.fillRect(-4 * s, -1 * s, 8 * s, 2 * s); }
      else if (i % 3 === 1) { ctx.fillStyle = K.lg(ctx, -4 * s, 0, 4 * s, 0, ['#f06a4a', '#8e2418']); ctx.fillRect(-2 * s, -5 * s, 4 * s, 10 * s); }
      else { ctx.fillStyle = '#6a5e54'; ctx.beginPath(); ctx.arc(0, 0, 2.2 * s, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  // the hazard on a plank ledge on the given wall; returns the barrel centre and blast radius
  function drawTNT(ctx, S, side, y, s, t) {
    const T = tntPhase(t), ex = side > 0 ? S.R(y) : S.L(y), d = -side;
    const bx = ex + d * 27 * s, R = 80 * s, cy = y - 19 * s;
    // ledge: plank shelf and a diagonal brace
    ctx.save(); ctx.translate(ex, y); ctx.lineCap = 'round';
    ctx.strokeStyle = WOOD[3]; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(-d * 4 * s, 26 * s); ctx.lineTo(d * 36 * s, 4 * s); ctx.stroke();
    ctx.strokeStyle = rgb(WOOD[1]); ctx.lineWidth = 4.4 * s; ctx.stroke();
    ctx.strokeStyle = rgb(WOOD[0], 0.7); ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(-d * 4 * s, 24.6 * s); ctx.lineTo(d * 35 * s, 2.6 * s); ctx.stroke();
    ctx.restore();
    plank(ctx, side > 0 ? ex - 56 * s : ex - 6 * s, y, 62 * s, 7 * s, 31);
    // scorch on the ledge while smoke clears
    if (T.p > 2.6) { ctx.fillStyle = `rgba(20,12,8,${0.5 * (1 - T.back)})`; ctx.beginPath(); ctx.ellipse(bx, y + 1, 20 * s, 3 * s, 0, 0, TAU); ctx.fill(); }
    // tell: blast radius
    if (T.p > 1.4 && T.p < 2.62) {
      const a = T.tell ? 0.55 + 0.4 * Math.sin(T.p * 40) : 0.25 * smooth(1.4, 2.1, T.p);
      K.danger(ctx, bx, cy, R, (T.tell ? 0.22 : 0.1));
      ctx.save(); ctx.setLineDash([6 * s, 5 * s]); ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = `rgba(255,90,70,${a})`; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(bx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
    } else if (!T.blast && T.back === 0 && T.p < 2.6) K.danger(ctx, bx, cy, 30 * s, 0.25);
    if (T.p < 2.6) {
      const shake = T.tell ? Math.sin(t * 90) * 1.6 * s * (0.4 + (T.p - 2.1) * 1.2) : 0;
      const sw = T.tell ? 1 + (T.p - 2.1) * 0.12 : 1;
      ctx.save(); ctx.translate(bx, y); ctx.scale(sw, sw); ctx.translate(-bx, -y);
      barrel(ctx, bx, y, s, t, T.fuse, shake, T.tell && Math.sin(T.p * 46) > 0.3 ? 0.35 : 0, 1);
      ctx.restore();
    } else if (T.back > 0) { K.danger(ctx, bx, cy, 30 * s, 0.25 * T.back); barrel(ctx, bx, y - (1 - T.back) * 8 * s, s, t, 1, 0, 0, T.back); }
    explosion(ctx, bx, cy, s, T.e, T.smoke, R);
    return { bx, cy, R };
  }
  PV.obstacles.tnt = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, MINE);
    lantern(ctx, S.L(70) - 4, S.L(70) + 10, 70, 1, [255, 188, 92], 0.6 + 0.08 * Math.sin(t * 11));
    const T = tntPhase(t);
    // the rocket creeps up the far side; the fuse races as it nears, it holds off the blast, then climbs past
    const ry = T.p < 2.1 ? lerp(370, 248, ease(T.p / 2.1)) : T.p < 3.2 ? 248 + (T.blast ? Math.sin(t * 60) * 1.5 : 0) : lerp(248, -50, ease((T.p - 3.2) / 0.6));
    const rx = T.p < 3.2 ? w * 0.3 : lerp(w * 0.3, w * 0.36, (T.p - 3.2) / 0.6);
    drawTNT(ctx, S, 1, 158, 1, t);
    K.rocket(ctx, rx, ry, 0.8, t);
    K.motes(ctx, w, h, t, 'dust', [255, 220, 170], 22, 8);
  };

  // ================= TESLA PYLONS =================
  const TES_P = 3.4;
  function tesPhase(t) { const p = ((t % TES_P) + TES_P) % TES_P; return { p, c: clamp((p - 1.0) / 1.0, 0, 1), arc: p >= 2.0 && p < 2.8, fade: p >= 2.8 ? 1 - (p - 2.8) / 0.25 : 0 }; }
  function pylon(ctx, ex, side, y, s, t, c, on) {
    // drawn pointing right (into the shaft from the left wall), mirrored for the right wall
    ctx.save(); ctx.translate(ex, y); ctx.scale(-side * s, s);
    // slate boss it's bolted into
    ctx.fillStyle = K.lg(ctx, -14, -20, 6, 20, ['#5c5880', '#34324e', '#1c1a2c']);
    ctx.beginPath(); ctx.moveTo(-16, -24); ctx.lineTo(-2, -19); ctx.lineTo(5, -8); ctx.lineTo(5, 9); ctx.lineTo(-1, 20); ctx.lineTo(-16, 25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,184,255,.55)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-16, -24); ctx.lineTo(-2, -19); ctx.lineTo(5, -8); ctx.stroke();
    // wall plate
    ctx.fillStyle = K.lg(ctx, -8, -16, 4, 16, [IRON[0], IRON[1], IRON[2]]); ctx.beginPath(); ctx.roundRect(-8, -15, 11, 30, 2); ctx.fill();
    ctx.strokeStyle = IRON[3]; ctx.lineWidth = 1; ctx.stroke();
    for (const ry of [-10, 10]) { ctx.fillStyle = '#2c2830'; ctx.beginPath(); ctx.arc(-2.5, ry, 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#ddd6e4'; ctx.beginPath(); ctx.arc(-3, ry - 0.5, 0.6, 0, TAU); ctx.fill(); }
    // porcelain insulator discs
    ctx.fillStyle = rgb(IRON[1]); ctx.fillRect(2, -2.5, 14, 5);
    for (const ix of [5, 9.5, 14]) {
      ctx.fillStyle = K.lg(ctx, ix - 2, -9, ix + 2, 9, ['#ffffff', '#c9d8ee', '#7a8ab0']); ctx.beginPath(); ctx.ellipse(ix, 0, 2.2, 8.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5a6a90'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    // copper coil
    const c0 = 18, c1 = 40, n = 8;
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 6, ['#5a2c14', '#8a4a22', '#3a1a0c']); ctx.fillRect(c0, -5, c1 - c0, 10);
    for (let i = 0; i < n; i++) {
      const cx = c0 + 1.5 + i * (c1 - c0 - 3) / (n - 1), lit = c > 0 && (i + 1) / n <= c + 0.05;
      ctx.fillStyle = K.lg(ctx, cx - 2, -7, cx + 2, 7, ['#ffd2a0', '#e08844', '#9a4a1e', '#5a2a10']);
      ctx.beginPath(); ctx.ellipse(cx, 0, 1.9, 7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5a2a10'; ctx.lineWidth = 0.6; ctx.stroke();
      if (lit || on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,120,255,${on ? 0.4 : 0.2 + 0.2 * Math.sin(t * 30 + i)})`; ctx.beginPath(); ctx.ellipse(cx, 0, 2.2, 7.4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    ctx.strokeStyle = 'rgba(255,240,220,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c0, -4.3); ctx.lineTo(c1, -4.3); ctx.stroke();
    // brass ball terminal
    const tx = 47;
    ctx.fillStyle = rgb(IRON[1]); ctx.fillRect(c1, -1.8, 4, 3.6);
    ctx.fillStyle = K.rg(ctx, tx - 2.5, -2.5, 9, ['#fff4d0', '#e2b45a', '#9a6a22', '#5a3a10']); ctx.beginPath(); ctx.arc(tx, 0, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a4210'; ctx.lineWidth = 0.9; ctx.stroke();
    K.sheen(ctx, tx, 0, 6.5, 0.6);
    ctx.restore();
    return ex - side * 47 * s;
  }
  function drawTesla(ctx, S, y, s, t) {
    const T = tesPhase(t), L = S.L(y), R = S.R(y), jit = T.c > 0.6 && !T.arc ? Math.sin(t * 90) * 0.8 * s : 0;
    const tl = pylon(ctx, L, -1, y + jit, s, t, T.c, T.arc), tr = pylon(ctx, R, 1, y - jit, s, t, T.c, T.arc);
    const glowA = T.arc ? 0.9 : T.fade > 0 ? 0.5 * T.fade : 0.15 + 0.6 * T.c;
    for (const tx of [tl, tr]) { K.danger(ctx, tx, y, (16 + 14 * T.c) * s, 0.25); K.glow(ctx, tx, y, (14 + 26 * T.c + (T.arc ? 20 : 0)) * s, [170, 150, 255], glowA); }
    const f = Math.floor(t * 22);
    // charging: crawling sparks on the coils and wisps reaching for each other
    if (T.c > 0 && !T.arc && T.fade <= 0) {
      for (const [tx, d] of [[tl, 1], [tr, -1]]) {
        for (let k = 0; k < 2; k++) {
          const r = K.rand(f * 3 + k + (d > 0 ? 0 : 50)); if (r() > 0.3 + T.c) continue;
          zap(ctx, boltPts(f * 7 + k * 13 + d, tx, y, tx - d * (8 + r() * 18) * s, y + (r() - 0.5) * 14 * s, 4, 4 * s), 0.7 * T.c, 0.5);
        }
        if (T.c > 0.3) { const reach = (tr - tl) * 0.38 * (T.c - 0.3) / 0.7; zap(ctx, boltPts(f * 5 + (d > 0 ? 1 : 2), tx, y, tx + d * reach, y + Math.sin(f) * 8 * s, 5, 7 * s), 0.6 * T.c, 0.6); }
      }
    }
    // the arc
    if (T.arc || T.fade > 0) {
      const a = T.arc ? 0.85 + 0.15 * Math.sin(t * 60) : T.fade;
      K.danger(ctx, (tl + tr) / 2, y, (tr - tl) * 0.55, 0.3 * a);
      K.glow(ctx, (tl + tr) / 2, y, (tr - tl) * 0.6, [150, 120, 255], 0.35 * a);
      for (let k = 0; k < 3; k++) zap(ctx, boltPts(f * 11 + k * 29, tl, y, tr, y, 12, (14 - k * 3) * s), a * (k ? 0.6 : 1), k ? 0.6 : 1.2);
      const r = K.rand(f * 17 + 5);
      for (let k = 0; k < 3; k++) { const ux = lerp(tl, tr, 0.2 + r() * 0.6), uy = y + (r() - 0.5) * 16 * s; zap(ctx, boltPts(f + k * 41, ux, uy, ux + (r() - 0.5) * 30 * s, uy + (r() < 0.5 ? -1 : 1) * (14 + r() * 14) * s, 4, 5 * s), a * 0.6, 0.45); }
    }
  }
  PV.obstacles.tesla = (ctx, w, h, t) => {
    stormFlash = 0;
    const S = K.shaft(ctx, w, h, t, STORM);
    drawTesla(ctx, S, 148, 1.3, t);
    const { p } = tesPhase(t);
    const ry = p < 0.7 ? lerp(370, 255, ease(p / 0.7)) : p < 2.85 ? 255 + Math.sin(p * 3) * 2 : lerp(255, -50, ease((p - 2.85) / 0.55));
    K.rocket(ctx, w * 0.5, ry, 0.8, t);
    K.motes(ctx, w, h, t, 'spark', [210, 200, 255], 18, 4);
  };

  // ================= BALL LIGHTNING =================
  const BALL_P = 4;
  function ballSim(p, x0, y0, target, speed) {
    // deterministic slow homing: integrate from spawn to p in fixed steps (no state kept between frames)
    let x = x0, y = y0, vx = speed * 0.6, vy = speed * 0.3; const dt = 1 / 30, trail = [];
    const end = Math.min(p, 3.7);
    for (let tt = 0.35; tt < end; tt += dt) {
      const step = Math.min(dt, end - tt), [tx, ty] = target(tt), dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
      const sp = speed * (tt > 3.1 ? 0.4 : 1);
      vx += (dx / d * sp - vx) * step * 1.6; vy += (dy / d * sp - vy) * step * 1.6;
      x += vx * step + Math.sin(tt * 5) * 0.25; y += vy * step + Math.cos(tt * 4) * 0.25;
      trail.push([x, y]); if (trail.length > 12) trail.shift();
    }
    return { x, y, trail };
  }
  function orb(ctx, x, y, s, t, k, look, trail) {
    // k: life 0..1 (scale/brightness), flickers when dying
    if (k <= 0.01) return;
    const r = 17 * s * k, f = Math.floor(t * 20);
    // trail of afterglow
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    trail.forEach(([tx, ty], i) => { const a = (i + 1) / trail.length; ctx.fillStyle = K.rg(ctx, tx, ty, r * (0.5 + a * 0.6), [`rgba(160,140,255,${0.45 * a * k})`, 'rgba(120,90,255,0)']); ctx.beginPath(); ctx.arc(tx, ty, r * (0.5 + a * 0.6), 0, TAU); ctx.fill(); });
    ctx.restore();
    K.danger(ctx, x, y, r * 2.6, 0.32 * k);
    K.glow(ctx, x, y, r * 3.4, [150, 120, 255], 0.5 * k);
    // crackling tendrils
    const rr = K.rand(f * 13 + 1);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + rr() * 0.8 + t * 1.5, l = r * (1.5 + rr() * 0.9);
      zap(ctx, boltPts(f * 9 + i, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a) * l, y + Math.sin(a) * l, 4, r * 0.25), 0.8 * k, 0.45);
    }
    // plasma body
    ctx.fillStyle = K.rg(ctx, x - r * 0.35, y - r * 0.4, r * 1.25, [[0, '#ffffff'], [0.25, '#dff4ff'], [0.6, '#9a8cff'], [1, '#5530c8']]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(70,40,170,.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    // swirling filaments inside
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,255,255,${0.5 * k})`; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = t * (2 + i) + i * 2; ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.35, a, 0.3, 2.4); ctx.stroke(); }
    ctx.restore();
    K.eyes(ctx, x, y + r * 0.12, r * 0.38, r * 0.3, '#ff5ad0', look, 0);
    // mischievous brows (inner ends low)
    ctx.strokeStyle = '#3a1c8a'; ctx.lineWidth = r * 0.11; ctx.lineCap = 'round';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * r * 0.68, y - r * 0.32); ctx.lineTo(x + d * r * 0.16, y - r * 0.16); ctx.stroke(); }
    K.sheen(ctx, x, y, r, 0.55);
    // orbiting sparks
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(230,225,255,.95)';
    for (let i = 0; i < 4; i++) { const a = t * 4 + i * TAU / 4, d = r * 1.45; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 1.3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // draws the orb chasing target(p); returns nothing. spawn = [x,y] near a wall vein
  function drawBall(ctx, s, t, spawn, target, speed) {
    const p = ((t % BALL_P) + BALL_P) % BALL_P;
    if (p < 0.35) { // spawn: sparks gather at the vein
      const g = p / 0.35, f = Math.floor(t * 22);
      K.glow(ctx, spawn[0], spawn[1], 30 * s * g, [170, 150, 255], 0.7 * g);
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + f, d = 24 * s * (1 - g); zap(ctx, boltPts(f + i * 7, spawn[0] + Math.cos(a) * d, spawn[1] + Math.sin(a) * d, spawn[0], spawn[1], 3, 4 * s), g, 0.5); }
      orb(ctx, spawn[0], spawn[1], s, t, g * 0.6, 0, []);
      return;
    }
    const B = ballSim(p, spawn[0], spawn[1], target, speed), [tx, ty] = target(p);
    let k = 1;
    if (p > 2.6) k = 1 - 0.25 * (p - 2.6) / 0.5;                       // shrinking as its charge runs out
    if (p > 3.1) k = 0.75 * (1 - (p - 3.1) / 0.6) * (Math.sin(p * 70) > -0.2 ? 1 : 0.4); // fizzling
    const look = clamp((tx - B.x) / 60, -1, 1);
    orb(ctx, B.x, B.y, s, t, k, look, B.trail);
    if (p > 3.1) { // pop: sparks scatter
      const e = clamp((p - 3.1) / 0.75, 0, 1), r = K.rand(7);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) { const a = r() * TAU, d = (10 + r() * 30) * s * e, l = 4 * s * (1 - e); ctx.strokeStyle = `rgba(210,200,255,${1 - e})`; ctx.beginPath(); ctx.moveTo(B.x + Math.cos(a) * d, B.y + Math.sin(a) * d); ctx.lineTo(B.x + Math.cos(a) * (d + l), B.y + Math.sin(a) * (d + l)); ctx.stroke(); }
      ctx.restore();
    }
  }
  PV.obstacles.balllightning = (ctx, w, h, t) => {
    stormFlash = 0;
    const S = K.shaft(ctx, w, h, t, STORM);
    // rocket weaves side to side; the orb leaves a wall vein and slowly homes in, then fizzles out
    const rocketAt = tt => [w * 0.5 + w * 0.2 * Math.sin(tt * TAU / BALL_P - 0.3), 242 + Math.sin(tt * TAU / BALL_P * 2) * 10];
    const [rx, ry] = rocketAt(((t % BALL_P) + BALL_P) % BALL_P);
    drawBall(ctx, 1, t, [S.L(78) + 16, 78], rocketAt, 50);
    K.rocket(ctx, rx, ry, 0.8, t);
    K.motes(ctx, w, h, t, 'spark', [210, 200, 255], 18, 6);
  };

  // ================= SECTIONS =================
  PV.sections.mine = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, MINE);
    // set dressing: wall lanterns and a small plank ledge with a pickaxe
    for (const [side, y, ph] of [[-1, 400, 0], [1, 236, 2], [-1, 40, 4]]) {
      const ex = side < 0 ? S.L(y) : S.R(y);
      lantern(ctx, ex + side * 4, ex - side * 10, y, 1, [255, 188, 92], 0.62 + 0.08 * Math.sin(t * 11 + ph) * Math.sin(t * 4.3 + ph));
    }
    {
      const y = 418, ex = S.R(y); plank(ctx, ex - 34, y, 40, 6, 3);
      ctx.save(); ctx.translate(ex - 18, y); ctx.rotate(-0.5);
      ctx.fillStyle = K.lg(ctx, -1.5, 0, 1.5, 0, [WOOD[0], WOOD[2]]); ctx.fillRect(-1.3, -20, 2.6, 20);
      ctx.fillStyle = K.lg(ctx, 0, -24, 0, -18, [IRON[0], IRON[2]]); ctx.beginPath(); ctx.moveTo(-11, -18); ctx.quadraticCurveTo(0, -26, 11, -18); ctx.quadraticCurveTo(0, -22, -11, -18); ctx.fill();
      ctx.restore();
    }
    drawMinecart(ctx, S, 132, 0.8, t, w);
    drawTNT(ctx, S, -1, 268, 0.8, t + 1.7);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 220, 170], 30, 2);
  };

  PV.sections.storm = (ctx, w, h, t) => {
    const f = flashAt(t); stormFlash = f * 1.5;
    const S = K.shaft(ctx, w, h, t, STORM);
    // set dressing: a lightning rod on a slate ledge and floating charged shards
    {
      const y = 262, ex = S.R(y);
      ctx.fillStyle = K.lg(ctx, ex - 30, y, ex, y + 10, ['#5a567c', '#26243a']); ctx.beginPath(); ctx.moveTo(ex + 4, y); ctx.lineTo(ex - 30, y + 2); ctx.lineTo(ex - 22, y + 9); ctx.lineTo(ex + 4, y + 14); ctx.fill();
      ctx.strokeStyle = 'rgba(200,180,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex - 30, y + 2); ctx.lineTo(ex + 4, y); ctx.stroke();
      const rx = ex - 16; ctx.fillStyle = K.lg(ctx, rx - 1.5, 0, rx + 1.5, 0, ['#ffd2a0', '#9a4a1e']); ctx.fillRect(rx - 1.2, y - 30, 2.4, 31);
      ctx.fillStyle = K.rg(ctx, rx - 1, y - 32, 4, ['#fff4d0', '#c08a3a']); ctx.beginPath(); ctx.arc(rx, y - 31, 2.6, 0, TAU); ctx.fill();
      const ff = Math.floor(t * 18); if (K.rand(ff)() < 0.35 + f) zap(ctx, boltPts(ff, rx, y - 32, rx + (K.rand(ff + 1)() - 0.5) * 16, y - 44, 4, 3), 0.8, 0.45);
      K.glow(ctx, rx, y - 31, 14 + 20 * f, [170, 150, 255], 0.4 + f * 0.5);
    }
    for (const [x, y, ph] of [[w * 0.3, 70, 0], [w * 0.7, 228, 2]]) {
      const yy = y + Math.sin(t * 1.3 + ph) * 4;
      ctx.fillStyle = K.lg(ctx, x - 7, yy - 8, x + 7, yy + 8, ['#6e6a98', '#2e2c48']); ctx.beginPath(); ctx.moveTo(x - 7, yy - 2); ctx.lineTo(x - 1, yy - 9); ctx.lineTo(x + 7, yy - 3); ctx.lineTo(x + 2, yy + 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(210,200,255,.9)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - 4, yy - 3); ctx.lineTo(x, yy); ctx.lineTo(x - 1, yy + 4); ctx.stroke();
      K.glow(ctx, x, yy, 16, [160, 140, 255], 0.25 + 0.15 * Math.sin(t * 5 + ph));
    }
    drawTesla(ctx, S, 140, 1.0, t + 1.1);
    const rp = [w * 0.5, h * 0.78];
    drawBall(ctx, 0.8, t + 1.3, [S.L(250) + 12, 250], () => rp, 34);
    K.rocket(ctx, rp[0], rp[1], 0.75, t);
    K.motes(ctx, w, h, t, 'spark', [210, 200, 255], 22, 3);
    // the lightning flash lights everything
    if (f > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,140,230,${0.32 * f})`; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    stormFlash = 0;
  };
})();
