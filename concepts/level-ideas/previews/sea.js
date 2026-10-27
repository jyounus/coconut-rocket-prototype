// Sea group: Shipwreck Hold, Cursed Treasure Vault, Cascade Falls, Gull Cliffs.
// Each scene is a 270x480 animated concept preview drawn with the shared kit (K) in the game's glossy cartoon style.
(() => {
  const { TAU, lerp, smooth, clamp, rgb, lift, mix } = K;
  const mod = (a, n) => ((a % n) + n) % n;
  const seg = (u, a, b) => clamp((u - a) / (b - a), 0, 1);          // 0..1 progress through [a, b]
  const ease = x => x * x * (3 - 2 * x);
  const bump = (u, a, b, c, d) => smooth(a, b, u) * (1 - smooth(c, d, u)); // rises a..b, holds, falls c..d

  // ---------------------------------------------------------------- shared helpers
  function ell(ctx, x, y, rx, ry, fill, rot = 0) { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); ctx.fill(); }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }
  // a smooth closed blob through points (quadratic midpoints)
  function blob(ctx, pts) {
    const n = pts.length, m = i => [(pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2];
    ctx.beginPath(); ctx.moveTo(...m(n - 1));
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], ...m(i));
    ctx.closePath();
  }
  // a lumpy round outline (seeded): boulders, heaps, foam
  function lumpPts(x, y, rx, ry, seed, n = 9, amp = 0.14, rot = 0) {
    const r = K.rand(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rot, k = 1 + (r() - 0.5) * 2 * amp;
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  // a glossy ball lit from the top left
  function ball(ctx, x, y, r, cols, edge, sheenA = 0.5) {
    ctx.fillStyle = K.rg(ctx, x - r * 0.38, y - r * 0.42, r * 1.45, cols);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
    K.sheen(ctx, x, y, r, sheenA);
  }
  // turtle walk for tentacles/tongues: from (x,y) heading a, length L, curvature k0 -> k1 with a travelling wave
  function walk(x, y, a, L, k0, k1, wave = 0, ph = 0, n = 22) {
    const pts = [[x, y, a]], ds = L / n;
    for (let i = 1; i <= n; i++) {
      const u = i / n; a += (k0 + (k1 - k0) * u * u * u + wave * Math.sin(ph - u * 5) * u) * ds;
      x += Math.cos(a) * ds; y += Math.sin(a) * ds; pts.push([x, y, a]);
    }
    return pts;
  }
  // outline of a tapered tube along pts; returns side arrays and a path builder
  function tube(pts, w0, w1) {
    const n = pts.length - 1, L = [], R = [], N = [];
    pts.forEach(([x, y, a], i) => { const w = (w0 + (w1 - w0) * i / n) / 2, nx = -Math.sin(a), ny = Math.cos(a); L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w]); N.push([nx, ny, w]); });
    const path = ctx => {
      const [ex, ey, ea] = pts[n];
      ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.arc(ex, ey, Math.max(0.3, w1 / 2), ea + Math.PI / 2, ea - Math.PI / 2, true);
      for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath();
    };
    return { L, R, N, path, n };
  }
  // an extra coloured rim light along a wall edge that varies with height (stops: [offset, [r,g,b], alpha])
  function rimTint(ctx, edge, h, stops, lw = 3) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([o, c, a]) => g.addColorStop(o, rgb(c, a)));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let y = -2; y <= h + 2; y += 6) y < 0 ? ctx.moveTo(edge(y), y) : ctx.lineTo(edge(y), y);
    ctx.stroke(); ctx.restore();
  }
  // a wall drawn by hand: side -1 left / 1 right, inner edge edge(y). fill = fillStyle, deco() runs clipped to it,
  // rim = [[offset, [r,g,b]], ...] so the rim light changes colour down the height. Returns the path builder.
  function ownWall(ctx, w, h, side, edge, fill, deco, rim, step = 2, halo = 1) {
    const outer = side < 0 ? -2 : w + 2;
    const path = () => { ctx.beginPath(); ctx.moveTo(outer, -2); for (let y = -2; y <= h + 2; y += step) ctx.lineTo(edge(y), y); ctx.lineTo(outer, h + 2); ctx.closePath(); };
    const line = () => { ctx.beginPath(); for (let y = -2; y <= h + 2; y += step) y < 0 ? ctx.moveTo(edge(y), y) : ctx.lineTo(edge(y), y); };
    path(); ctx.fillStyle = fill; ctx.fill();
    if (deco) { ctx.save(); path(); ctx.clip(); deco(); ctx.restore(); }
    const g = ctx.createLinearGradient(0, 0, 0, h); rim.forEach(([o, c]) => g.addColorStop(o, rgb(c)));
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = g; ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.09 * halo; ctx.lineWidth = 9; line(); ctx.stroke();
    ctx.globalAlpha = 0.24 * halo; ctx.lineWidth = 3.5; line(); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; line(); ctx.stroke();
    ctx.restore();
    return path;
  }
  // a 4-point twinkle star (additive)
  function twinkle(ctx, x, y, s, a, c = [255, 250, 220]) {
    if (a <= 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgb(c, a);
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    ctx.fillStyle = K.rg(ctx, x, y, s * 1.2, [rgb(c, a * 0.5), rgb(c, 0)]); ctx.beginPath(); ctx.arc(x, y, s * 1.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // a soft puff of smoke / dust / mist
  function puff(ctx, x, y, r, c, a, seed = 1) {
    if (a <= 0.01) return;
    const rr = K.rand(seed);
    for (let i = 0; i < 4; i++) {
      const px = x + (rr() - 0.5) * r * 0.9, py = y + (rr() - 0.5) * r * 0.6, pr = r * (0.45 + rr() * 0.35);
      ctx.fillStyle = K.rg(ctx, px - pr * 0.3, py - pr * 0.35, pr * 1.1, [rgb(lift(c, 25), a), rgb(c, a * 0.8), rgb(lift(c, -30), 0)]);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    }
  }

  // ---------------------------------------------------------------- the game's coconut coin
  const COIN = { lit: '#fffad6', hi: '#ffde60', mid: '#eaaa28', lo: '#b06c14', edge: 'rgba(136,80,12,.9)', deep: 'rgba(100,58,8,.5)' };
  const FRONDS = [[-8.8, -1.0], [-6.6, -7.2], [0.2, -9.6], [6.8, -7.0], [9.0, -0.6]];
  function cTrunk(c) { c.beginPath(); c.moveTo(0.6, 9.8); c.quadraticCurveTo(3.0, 3.4, -0.4, -2.4); c.lineTo(1.0, -2.2); c.quadraticCurveTo(5.0, 3.4, 3.4, 9.6); c.closePath(); }
  function cFronds(c) {
    const cx = 0.2, cy = -3.0; c.beginPath();
    for (const [ex, ey] of FRONDS) {
      const mx = (cx + ex) / 2, my = (cy + ey) / 2, L = Math.hypot(ex - cx, ey - cy), nx = (ey - cy) / L, ny = -(ex - cx) / L, w = L * 0.28 * (ny > 0 ? -1 : 1);
      c.moveTo(cx, cy); c.quadraticCurveTo(mx + nx * w, my + ny * w - 1.6, ex, ey); c.quadraticCurveTo(mx + nx * w * 0.15, my + ny * w * 0.15 + 0.6, cx, cy); c.closePath();
    }
  }
  function cNuts(c) { c.beginPath(); for (const [x, y, r] of [[-1.6, -1.6, 1.9], [1.8, -1.4, 1.85], [0.1, 0.6, 1.8]]) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } }
  function emboss(c, path, fill) {
    c.save(); c.translate(0.55, 0.6); path(c); c.fillStyle = COIN.deep; c.fill(); c.restore();
    c.save(); c.translate(-0.45, -0.5); path(c); c.fillStyle = 'rgba(255,250,214,.75)'; c.fill(); c.restore();
    path(c); c.fillStyle = fill; c.fill();
  }
  function coin(ctx, x, y, t, ph = 0, r = 6.5, halo = true) {
    const cs = Math.cos(t * 2.4 + ph), sx = Math.max(0.14, Math.abs(cs)), by = Math.sin(t * 2 + ph) * 1.5;
    y += by;
    if (halo) K.glow(ctx, x, y, r * 2.6, [255, 205, 90], 0.32);
    ctx.save(); ctx.translate(x, y);
    if (sx < 0.97) { ctx.fillStyle = '#9a5c0e'; ctx.beginPath(); ctx.ellipse((cs > 0 ? 1 : -1) * r * 0.16 * (1 - sx), 0, r * sx + r * 0.12 * (1 - sx), r, 0, 0, TAU); ctx.fill(); }
    ctx.scale(sx, 1);
    const s = r / 13;
    ctx.scale(s, s);
    ctx.fillStyle = K.rg(ctx, -4.5, -5, 14, [[0, COIN.lit], [0.35, COIN.hi], [0.75, COIN.mid], [1, COIN.lo]]);
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
    ctx.strokeStyle = COIN.edge; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, 12.6, 0, TAU); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, 3, 3.5, 13, [[0, COIN.hi], [0.55, COIN.mid], [1, COIN.lo]]);
    ctx.beginPath(); ctx.arc(0, 0, 10.8, 0, TAU); ctx.fill();
    if (sx > 0.4) {
      emboss(ctx, cTrunk, COIN.hi);
      emboss(ctx, cFronds, K.rg(ctx, -2, -7, 10, [COIN.lit, COIN.hi, COIN.mid]));
      emboss(ctx, cNuts, COIN.hi);
    }
    ctx.fillStyle = 'rgba(255,255,248,.95)'; ctx.beginPath(); ctx.ellipse(-7.4, -8.0, 2, 0.8, -0.8, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // a brass ship's lantern hanging from (x, y) by its ring; swing angle a
  function lantern(ctx, x, y, a, t, s = 1, ph = 0) {
    const fl = 0.85 + 0.15 * Math.sin(t * 13 + ph) * Math.sin(t * 7.3 + ph * 2);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    K.glow(ctx, 0, 14, 46, [255, 178, 70], 0.34 * fl);
    K.glow(ctx, 0, 14, 16, [255, 230, 150], 0.5 * fl);
    // ring and cap
    ctx.strokeStyle = '#7a4e1a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, 0, 2.6, 3.4, 5); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, -6, 0, 6, 0, ['#ffe7a0', '#d9952e', '#7a4a14']);
    ctx.beginPath(); ctx.moveTo(-2, 2.5); ctx.lineTo(2, 2.5); ctx.lineTo(6.5, 7.5); ctx.lineTo(-6.5, 7.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6a3e10'; ctx.lineWidth = 0.8; ctx.stroke();
    // glass with the flame
    ctx.fillStyle = K.rg(ctx, 0, 15, 9, ['rgba(255,252,220,.98)', 'rgba(255,200,90,.9)', 'rgba(220,120,40,.85)']);
    ctx.beginPath(); ctx.moveTo(-5.5, 7.5); ctx.quadraticCurveTo(-7.2, 14, -5.5, 20.5); ctx.lineTo(5.5, 20.5); ctx.quadraticCurveTo(7.2, 14, 5.5, 7.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.moveTo(0, 10 - fl * 1.5); ctx.quadraticCurveTo(2.2, 14, 0, 17); ctx.quadraticCurveTo(-2.2, 14, 0, 10 - fl * 1.5); ctx.fill();
    // brass bars
    ctx.strokeStyle = '#a8681e'; ctx.lineWidth = 1.1;
    for (const bx of [-3.6, 0, 3.6]) { ctx.beginPath(); ctx.moveTo(bx * 1.15, 7.8); ctx.quadraticCurveTo(bx * 1.45, 14, bx * 1.15, 20.2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-4.6, 9.5); ctx.quadraticCurveTo(-5.6, 13, -4.8, 16); ctx.stroke();
    // base
    ctx.fillStyle = K.lg(ctx, -7, 0, 7, 0, ['#ffe2a0', '#c9852a', '#6e4012']);
    ctx.beginPath(); ctx.moveTo(-7, 20); ctx.lineTo(7, 20); ctx.lineTo(5.5, 24); ctx.lineTo(-5.5, 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5e3410'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  }

  // ================================================================= SHIPWRECK HOLD
  const SHIP = {
    bgTop: [54, 86, 82], bgBot: [22, 38, 40], far: [52, 72, 64], far2: [70, 62, 46],
    wall: [78, 52, 32], wallIn: [24, 15, 10], rim: [242, 181, 74], seed: 3, wobble: 0.2,
  };
  const SEA = [127, 214, 194];
  SHIP.farShape = (ctx, w, h, t, layer, col) => {
    if (layer === 0) {
      // the far side of the hull: vertical planks and the great curved frames (ribs) of the ship
      ctx.fillStyle = rgb(lift(col, -6)); ctx.fillRect(0, 0, w, h);
      for (let x = 4; x < w; x += 14) {
        ctx.strokeStyle = rgb(lift(col, -22), 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        ctx.strokeStyle = rgb(lift(col, 10), 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 1.3, 0); ctx.lineTo(x + 1.3, h); ctx.stroke();
      }
      const r = K.rand(17);
      for (let i = 0; i < 26; i++) { const x = Math.floor(r() * 19) * 14 + 4, y = r() * h; ctx.strokeStyle = rgb(lift(col, -20), 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); }
      // split planks: green sea light leaking in through the seams, in shafts slanting down
      for (const [x, y, len] of [[60, 92, 34], [186, 214, 46], [102, 338, 30], [228, 40, 26]]) {
        const fl = 0.75 + 0.25 * Math.sin(t * 1.7 + x);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = K.lg(ctx, x, y, x + 60, y + 200, [rgb(SEA, 0.16 * fl), rgb(SEA, 0)]);
        ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 3, y + len); ctx.lineTo(x + 90, y + len + 190); ctx.lineTo(x + 40, y + 200); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = rgb(lift(SEA, 20), 0.85);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2.5, y + len * 0.3); ctx.lineTo(x + 1, y + len * 0.55); ctx.lineTo(x + 3, y + len); ctx.lineTo(x + 0.5, y + len * 0.7); ctx.lineTo(x - 1.5, y + len * 0.4); ctx.closePath(); ctx.fill();
        K.glow(ctx, x + 1, y + len / 2, 16, SEA, 0.25 * fl);
      }
      for (const y of [30, 150, 270, 390]) {
        const sag = 16, th = 15;
        ctx.beginPath(); ctx.moveTo(-5, y); ctx.quadraticCurveTo(w / 2, y + sag * 2, w + 5, y); ctx.lineTo(w + 5, y + th); ctx.quadraticCurveTo(w / 2, y + th + sag * 2, -5, y + th); ctx.closePath();
        ctx.fillStyle = K.lg(ctx, 0, y, 0, y + th + sag, [rgb(lift(col, 22)), rgb(lift(col, 2)), rgb(lift(col, -18))]); ctx.fill();
        ctx.strokeStyle = rgb(lift(col, 40), 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, y + 0.5); ctx.quadraticCurveTo(w / 2, y + sag * 2 + 0.5, w + 5, y + 0.5); ctx.stroke();
        for (let k = 1; k < 8; k++) { const bx = k / 8 * w, by = y + th / 2 + sag * 2 * 4 * (k / 8) * (1 - k / 8) / 2 * 2 * 0.5 + sag * (1 - Math.pow(2 * k / 8 - 1, 2)) ; ell(ctx, bx, by - sag * 0.0, 1.3, 1.3, rgb(lift(col, -30))); }
      }
    } else {
      // nearer: a heavy deck beam with knees across the top, cargo stacked at the foot, a slung net
      const dk = rgb(col), lt = rgb(lift(col, 26)), rimc = rgb([242, 181, 74], 0.35);
      ctx.fillStyle = K.lg(ctx, 0, 6, 0, 26, [lt, dk]); ctx.fillRect(-4, 6, w + 8, 18);
      ctx.strokeStyle = rimc; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 6.5); ctx.lineTo(w, 6.5); ctx.stroke();
      for (const x of [70, 200]) { ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(x - 4, 24); ctx.lineTo(x + 4, 24); ctx.lineTo(x + 4, 40); ctx.quadraticCurveTo(x + 4, 28, x + 18, 24); ctx.closePath(); ctx.fill(); }
      // the broken mainmast standing up the hold behind everything, iron-banded, with a yard and torn sail rags
      ctx.save(); ctx.translate(w * 0.7, 0); ctx.rotate(0.05);
      ctx.fillStyle = K.lg(ctx, -9, 0, 9, 0, [dk, lt, dk]); ctx.fillRect(-9, -10, 18, h + 20);
      ctx.fillStyle = rgb(lift(col, -14));
      for (let y = 40; y < h; y += 70) { ctx.fillRect(-10, y, 20, 4); }
      ctx.strokeStyle = rimc; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8.5, -10); ctx.lineTo(-8.5, h + 10); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(w * 0.7 + 12, 128); ctx.rotate(-0.22);
      ctx.fillStyle = K.lg(ctx, 0, -4, 0, 4, [lt, dk]); ctx.fillRect(-120, -3.5, 170, 7);
      // tattered sail hanging off the yard
      ctx.fillStyle = rgb(lift(col, 40), 0.55);
      ctx.beginPath(); ctx.moveTo(-100, 3); ctx.lineTo(20, 3); ctx.quadraticCurveTo(18 + Math.sin(t) * 2, 40, 6, 64); ctx.lineTo(-6, 48); ctx.lineTo(-20, 70); ctx.lineTo(-38, 44); ctx.lineTo(-58, 58); ctx.quadraticCurveTo(-80, 30, -100, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(lift(col, 60), 0.35); ctx.lineWidth = 0.8;
      for (const fx of [-70, -40, -10]) { ctx.beginPath(); ctx.moveTo(fx, 5); ctx.quadraticCurveTo(fx + 3, 25, fx - 2, 44); ctx.stroke(); }
      ctx.restore();
      // rigging: shrouds slanting down from the masthead
      ctx.strokeStyle = rgb(lift(col, 18), 0.7); ctx.lineWidth = 0.9;
      for (const [x1, y1] of [[w * 0.2, h * 0.62], [w * 0.32, h * 0.66], [w * 0.98, h * 0.5]]) { ctx.beginPath(); ctx.moveTo(w * 0.7 + 3, 60); ctx.quadraticCurveTo((w * 0.7 + x1) / 2, (60 + y1) / 2 + 20, x1, y1); ctx.stroke(); }
      // cargo: barrels and crates in a heap
      const cargo = [[52, 455, 'b', 15], [82, 462, 'c', 18], [112, 450, 'b', 14], [192, 458, 'c', 20], [222, 452, 'b', 15], [206, 428, 'b', 12], [66, 428, 'c', 13]];
      for (const [x, y, k, s] of cargo) {
        if (k === 'b') {
          ctx.fillStyle = K.lg(ctx, x - s, 0, x + s, 0, [dk, lt, dk]);
          ctx.beginPath(); ctx.moveTo(x - s * 0.8, y - s * 1.1); ctx.quadraticCurveTo(x - s * 1.05, y, x - s * 0.8, y + s * 1.1); ctx.lineTo(x + s * 0.8, y + s * 1.1); ctx.quadraticCurveTo(x + s * 1.05, y, x + s * 0.8, y - s * 1.1); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rgb(lift(col, -18), 0.9); ctx.lineWidth = 1.6;
          for (const hy of [-0.75, 0.75]) { ctx.beginPath(); ctx.moveTo(x - s * 0.92, y + hy * s); ctx.lineTo(x + s * 0.92, y + hy * s); ctx.stroke(); }
          ctx.strokeStyle = rimc; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - s * 1.1, s * 0.8, 2, 0, Math.PI, TAU); ctx.stroke();
        } else {
          ctx.fillStyle = K.lg(ctx, 0, y - s, 0, y + s, [lt, dk]); ctx.fillRect(x - s, y - s, s * 2, s * 2);
          ctx.strokeStyle = rgb(lift(col, -16), 0.9); ctx.lineWidth = 1.2; ctx.strokeRect(x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4);
          ctx.beginPath(); ctx.moveTo(x - s + 2, y - s + 2); ctx.lineTo(x + s - 2, y + s - 2); ctx.stroke();
          ctx.strokeStyle = rimc; ctx.beginPath(); ctx.moveTo(x - s, y - s + 0.5); ctx.lineTo(x + s, y - s + 0.5); ctx.stroke();
        }
      }
      // a cargo net slung from the beam with a bulging sack
      ctx.strokeStyle = rgb(lift(col, 14), 0.8); ctx.lineWidth = 0.9;
      for (let k = 0; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(150 + k * 6, 24); ctx.quadraticCurveTo(146 + k * 7, 70, 160 + k * 4, 96); ctx.stroke(); }
      ctx.fillStyle = K.rg(ctx, 166, 82, 18, [lt, dk]); ctx.beginPath(); ctx.ellipse(170, 84, 14, 16, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(148, 40 + k * 12); ctx.quadraticCurveTo(170, 46 + k * 12, 186, 38 + k * 12); ctx.stroke(); }
    }
  };
  // the hull walls: thick planking broken off in stepped, splintered runs. Returns { seg, edge }
  function hullEdge(seed, side, w, h) {
    const r = K.rand(seed), seg = []; let y = -30;
    while (y < h + 40) { const L = 44 + r() * 66; seg.push({ y0: y, y1: y + L, d: 31 + r() * 14, j: r() }); y += L; }
    const f = yy => {
      let s2 = seg[seg.length - 1]; for (const q of seg) if (yy < q.y1) { s2 = q; break; }
      const v = s2.y1 - yy; let d = s2.d;
      if (v < 18) { const tri = Math.abs(mod(v + s2.j * 6, 6.5) - 3.25) / 3.25; d += (1 - v / 18) * tri * 11 * (0.6 + s2.j * 0.6); }
      return d;
    };
    return { seg, edge: yy => side < 0 ? f(yy) : w - f(yy) };
  }
  function hullWall(ctx, H, side, w, h, t, rim) {
    const W = SHIP.wall, X = k => side < 0 ? k : w - k;
    ownWall(ctx, w, h, side, H.edge, K.lg(ctx, X(0), 0, X(48), 0, ['#120a06', '#3a2616', '#64442a']), () => {
      const r = K.rand(side < 0 ? 61 : 67);
      // planks running up the hull, 7 px each: alternating tone, a dark seam and a lit ridge
      for (let k = 0; k < 7; k++) {
        const x0 = X(k * 7), x1 = X(k * 7 + 7);
        ctx.fillStyle = rgb(lift(W, (k % 2 ? -10 : 4) - (6 - k) * 5), 0.55); ctx.fillRect(Math.min(x0, x1), 0, 7, h);
        ctx.fillStyle = 'rgba(18,10,6,.85)'; ctx.fillRect(x0 - (side < 0 ? 0 : 1.2), 0, 1.2, h);
        ctx.fillStyle = rgb(lift(W, 36), 0.3); ctx.fillRect(x0 + (side < 0 ? 1.2 : -2), 0, 0.8, h);
        for (let j = 0; j < 3; j++) {
          const y = r() * h, xa = Math.min(x0, x1);
          ctx.fillStyle = 'rgba(18,10,6,.85)'; ctx.fillRect(xa, y, 7, 1.1); ctx.fillStyle = rgb(lift(W, 36), 0.35); ctx.fillRect(xa, y + 1.1, 7, 0.7);
          ell(ctx, xa + 3.5, y - 4, 0.9, 0.9, 'rgba(230,200,150,.55)'); ell(ctx, xa + 3.5, y + 5, 0.9, 0.9, 'rgba(230,200,150,.55)');
        }
        ctx.strokeStyle = rgb(lift(W, 20), 0.22); ctx.lineWidth = 0.7;
        for (let j = 0; j < 6; j++) { const y = r() * h, x = (x0 + x1) / 2 + (r() - 0.5) * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 2, y + 8, x - 2, y + 16, x, y + 24 + r() * 12); ctx.stroke(); }
      }
      // weed-green water stains low down, a tar streak or two
      for (let j = 0; j < 4; j++) { const y = h * 0.35 + r() * h * 0.6; ctx.fillStyle = K.rg(ctx, X(30), y, 26, ['rgba(80,140,90,.22)', 'rgba(80,140,90,0)']); ctx.fillRect(X(60), y - 26, side < 0 ? 60 : -60, 52); }
      // the planking's thickness showing along the broken edge: raw end grain, lit
      ctx.lineJoin = 'round';
      for (const [lw, c] of [[10, '#6e4a2c'], [4, '#b07c4a']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); for (let y = -2; y <= h + 2; y += 2) y < 0 ? ctx.moveTo(H.edge(y), y) : ctx.lineTo(H.edge(y), y); ctx.stroke(); }
      // splinter grain in the teeth
      ctx.strokeStyle = 'rgba(60,36,18,.7)'; ctx.lineWidth = 0.7;
      for (const q of H.seg) for (let k = 0; k < 3; k++) { const y = q.y1 - 3 - k * 5, x = H.edge(y); ctx.beginPath(); ctx.moveTo(x + side * 1, y); ctx.lineTo(x + side * 4, y - 6); ctx.stroke(); }
    }, rim);
  }
  // a frame timber (rib) jutting out of the hull into the shaft; returns its tip
  function rib(ctx, H, side, y, jut, t) {
    const ex = H.edge(y), x0 = side < 0 ? -4 : ctx.canvas.width, tip = ex - side * jut, th = 13;
    const xa = Math.min(x0, tip), wd = Math.abs(tip - x0);
    ctx.fillStyle = K.lg(ctx, 0, y - th / 2, 0, y + th / 2, ['#c08a54', '#86582e', '#3e2410']); ctx.beginPath(); ctx.roundRect(xa, y - th / 2, wd, th, 2); ctx.fill();
    ctx.strokeStyle = '#2e1a0a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xa + 2, y - th / 2 + 1); ctx.lineTo(xa + wd - 2, y - th / 2 + 1); ctx.stroke();
    for (const [o, c, lw] of [[0, 'rgba(50,28,12,.75)', 1], [1, 'rgba(255,214,160,.3)', 0.7]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(xa + 6, y + 1 + o); ctx.bezierCurveTo(xa + wd * 0.4, y - 1 + o, xa + wd * 0.6, y + 3 + o, xa + wd - 6, y + 1 + o); ctx.stroke(); }
    // end grain at the tip
    ctx.fillStyle = K.rg(ctx, tip - 1, y - 2, 8, ['#f0c890', '#b88050', '#7a4e26']); ctx.beginPath(); ctx.ellipse(tip, y, 3, th / 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(110,64,30,.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(tip, y, 1.6, th / 4, 0, 0, TAU); ctx.stroke();
    // iron bolts and barnacles on the underside
    for (const bx of [0.3, 0.62]) { const px = lerp(x0, tip, bx); ell(ctx, px, y, 2.1, 2.1, '#30323e'); ell(ctx, px - 0.6, y - 0.6, 0.8, 0.8, 'rgba(220,224,240,.8)'); }
    for (let k = 0; k < 3; k++) { const px = lerp(ex, tip, 0.2 + k * 0.25); ell(ctx, px, y + th / 2 + 0.5, 1.6, 1.2, '#d8d0b0'); ell(ctx, px, y + th / 2 + 0.6, 0.5, 0.4, '#3c3426'); }
    return { x: tip + side * 4, y };
  }
  // a cluster of big barnacles and a mussel or two, crusted on the wall edge
  function barnacles(ctx, x, y, side, seed) {
    const r = K.rand(seed);
    for (let k = 0; k < 4; k++) { const mx = x + side * (2 + r() * 8), my = y + (r() - 0.5) * 18, a = r() * 6; ctx.save(); ctx.translate(mx, my); ctx.rotate(a); ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#6a7aa8', '#2e3460', '#14183a']); ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,210,255,.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(0, -0.4, 4, 1.6, 0, 3.4, 5.6); ctx.stroke(); ctx.restore(); }
    for (let k = 0; k < 8; k++) {
      const bx = x + (r() - 0.5) * 14 - side * r() * 4, by = y + (r() - 0.5) * 22, s2 = 1.8 + r() * 2.2;
      ctx.fillStyle = K.lg(ctx, bx - s2, by - s2, bx + s2, by + s2, ['#fffbe8', '#d8ceb0', '#8a8068']);
      ctx.beginPath(); ctx.moveTo(bx - s2 * 1.2, by + s2); ctx.lineTo(bx - s2 * 0.5, by - s2 * 0.8); ctx.lineTo(bx + s2 * 0.5, by - s2 * 0.8); ctx.lineTo(bx + s2 * 1.2, by + s2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a705a'; ctx.lineWidth = 0.6; ctx.stroke();
      ell(ctx, bx, by - s2 * 0.6, s2 * 0.45, s2 * 0.22, '#3c3426');
    }
  }

  // a brass porthole with sea behind it (deco or the kraken's)
  function porthole(ctx, x, y, R, t, bulge = 0, crack = 0, broken = 0) {
    const b = 1 + bulge * (0.06 + 0.04 * Math.sin(t * 40));
    ctx.save(); ctx.translate(x, y); ctx.scale(b, b);
    // timber frame around
    ctx.fillStyle = K.rg(ctx, -3, -3, R + 6, ['#7a5434', '#4a301c']); ctx.beginPath(); ctx.arc(0, 0, R + 4.5, 0, TAU); ctx.fill();
    // glass / opening
    if (!broken) {
      ctx.fillStyle = K.lg(ctx, 0, -R, 0, R, ['#5fc6b2', '#1f6a6a', '#0d3a44']); ctx.beginPath(); ctx.arc(0, 0, R - 2.5, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R - 2.5, 0, TAU); ctx.clip();
      // light rays in the sea outside, a bubble rising, a little fish passing
      ctx.fillStyle = 'rgba(200,255,240,.18)'; ctx.beginPath(); ctx.moveTo(-R, -R); ctx.lineTo(-R * 0.3, -R); ctx.lineTo(R * 0.4, R); ctx.lineTo(-R * 0.2, R); ctx.fill();
      const by = R - mod(t * 14, R * 2.4); ell(ctx, R * 0.25, by, 1.5, 1.5, 'rgba(220,255,250,.6)');
      ctx.restore();
    } else {
      ctx.fillStyle = K.rg(ctx, 0, 0, R, ['#0a1a20', '#06262a']); ctx.beginPath(); ctx.arc(0, 0, R - 2.5, 0, TAU); ctx.fill();
    }
    // brass ring with bolts
    ctx.lineWidth = 4.2; ctx.strokeStyle = K.lg(ctx, -R, -R, R, R, ['#fff0b0', '#e0a640', '#8a5214']); ctx.beginPath(); ctx.arc(0, 0, R - 0.5, 0, TAU); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.strokeStyle = '#6e3e0e'; ctx.beginPath(); ctx.arc(0, 0, R + 1.6, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R - 2.6, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.2, jx = bulge * Math.sin(t * 50 + i) * 0.6;
      ell(ctx, Math.cos(a) * (R - 0.5) + jx, Math.sin(a) * (R - 0.5), 1.1, 1.1, '#8a5214'); ell(ctx, Math.cos(a) * (R - 0.5) - 0.3 + jx, Math.sin(a) * (R - 0.5) - 0.3, 0.5, 0.5, '#fff6d0');
    }
    if (!broken) {
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, R - 5, 3.6, 4.5); ctx.stroke();
      if (crack > 0) {
        ctx.strokeStyle = `rgba(230,255,250,${0.85 * crack})`; ctx.lineWidth = 0.9;
        const n = Math.ceil(crack * 6);
        for (let i = 0; i < n; i++) { const a = i * 1.1 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); ctx.lineTo(Math.cos(a + 0.2) * R * 0.5, Math.sin(a + 0.2) * R * 0.5); ctx.lineTo(Math.cos(a - 0.1) * (R - 3), Math.sin(a - 0.1) * (R - 3)); ctx.stroke(); }
      }
    }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,240,190,.9)'; ctx.beginPath(); ctx.arc(0, 0, R + 0.6, 3.5, 4.9); ctx.stroke();
    ctx.restore();
  }

  // ---- Cannon Broadside: a rack of four ports on the left wall; one stays shut (the gap)
  function bronzeCannon(ctx, x, y, recoil, shiver) {
    ctx.save(); ctx.translate(x - recoil, y + shiver); ctx.lineJoin = 'round';
    const prof = [[-12, 8.2], [-3, 7.8], [9, 6.8], [24, 5.8], [27, 7.4], [35, 7.4], [36, 6.6]];
    const body = () => { ctx.beginPath(); ctx.moveTo(prof[0][0], -prof[0][1]); prof.forEach(([px, r]) => ctx.lineTo(px, -r)); for (let i = prof.length - 1; i >= 0; i--) ctx.lineTo(prof[i][0], prof[i][1]); ctx.closePath(); };
    body(); ctx.fillStyle = K.lg(ctx, 0, -8, 0, 8, [[0, '#fff2c0'], [0.18, '#f0be62'], [0.5, '#b8742e'], [0.8, '#7a4618'], [1, '#4a2a10']]); ctx.fill();
    ctx.strokeStyle = '#5e3212'; ctx.lineWidth = 1; ctx.stroke();
    // verdigris blooms (sea-green patina), clipped to the barrel
    ctx.save(); body(); ctx.clip();
    for (const [px, py, pr] of [[14, 3.5, 3], [-6, 4.5, 2.6], [30, -2, 2]]) ell(ctx, px, py, pr * 1.4, pr, 'rgba(110,200,170,.4)');
    ctx.restore();
    // reinforcing rings, each a raised band with a lit lip and a dark shadow
    for (const [bx, r] of [[-3, 8.4], [9, 7.4], [24.5, 6.4], [33, 7.9]]) {
      ctx.fillStyle = K.lg(ctx, 0, -r, 0, r, ['#fff6d0', '#e0a050', '#8a5020', '#4a2a10']); ctx.fillRect(bx - 1.6, -r, 3.2, r * 2);
      ctx.fillStyle = 'rgba(60,30,10,.5)'; ctx.fillRect(bx + 1.6, -r + 1, 1, r * 2 - 2);
      ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.fillRect(bx - 1.6, -r, 0.8, r * 2);
    }
    // dolphins (lifting handles) on top
    ctx.strokeStyle = '#6a3a14'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(14, -6.8, 3.2, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#f0c070'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(14, -6.8, 3.2, Math.PI, -0.4); ctx.stroke();
    // gloss down the top
    ctx.strokeStyle = 'rgba(255,255,240,.75)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-9, -5.6); ctx.lineTo(22, -4.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,240,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(28, -5.4); ctx.lineTo(34, -5.4); ctx.stroke();
    // the bore
    ell(ctx, 36, 0, 2.4, 6.4, '#8a5020'); ell(ctx, 36.5, 0, 1.7, 4.6, '#1a0e08'); ell(ctx, 35.4, -3.6, 0.8, 1.4, 'rgba(255,240,200,.7)');
    ctx.restore();
  }
  // a ring bolt and a coil of breeching rope
  function rope(ctx, pts, lw = 2.6) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pth = () => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); ctx.lineTo(...pts[pts.length - 1]); };
    pth(); ctx.strokeStyle = '#5a3e1a'; ctx.lineWidth = lw + 1.2; ctx.stroke();
    pth(); ctx.strokeStyle = '#d8b878'; ctx.lineWidth = lw; ctx.stroke();
    pth(); ctx.strokeStyle = 'rgba(120,84,40,.8)'; ctx.lineWidth = lw * 0.8; ctx.setLineDash([1.2, 2.2]); ctx.stroke(); ctx.setLineDash([]);
    pth(); ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = 0.6; ctx.stroke();
  }
  function ringBolt(ctx, x, y) { ctx.strokeStyle = '#2a2c36'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#9aa0b4'; ctx.lineWidth = 1; ctx.stroke(); ell(ctx, x, y - 2.6, 1.4, 1.4, '#30323e'); }
  function cannons(ctx, sh, t, w) {
    const u0 = mod(t, 4), ys = [46, 86, 126, 166], gap = 2;
    for (let i = 0; i < 4; i++) {
      const y = ys[i], ex = sh.L(y) + 4, u = u0 - i * 0.06;
      // the gun port: a heavy timber frame (bevelled, bolted) round an opening painted red inside
      const fx = ex - 24, fw = 27, fh = 32;
      ctx.fillStyle = K.lg(ctx, 0, y - fh / 2, 0, y + fh / 2, ['#c8945c', '#8a5c32', '#4e3018']); ctx.beginPath(); ctx.roundRect(fx, y - fh / 2, fw, fh, 2.5); ctx.fill();
      ctx.strokeStyle = '#2e1a0a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,224,170,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx + 1.5, y - fh / 2 + 1); ctx.lineTo(fx + fw - 1.5, y - fh / 2 + 1); ctx.stroke();
      for (const [bx, by] of [[fx + 3, y - fh / 2 + 3], [fx + fw - 3, y - fh / 2 + 3], [fx + 3, y + fh / 2 - 3], [fx + fw - 3, y + fh / 2 - 3]]) { ell(ctx, bx, by, 1.3, 1.3, '#30323e'); ell(ctx, bx - 0.4, by - 0.4, 0.5, 0.5, '#d0d4e4'); }
      ctx.fillStyle = K.rg(ctx, ex - 9, y, 16, ['#1a0806', '#3e100c', '#7a2418']); ctx.fillRect(fx + 4, y - fh / 2 + 4, fw - 8, fh - 8);
      if (i === gap) {
        // the shut lid: planks, two iron straps, a ring handle — the dark gap in the broadside
        ctx.fillStyle = K.lg(ctx, 0, y - 12, 0, y + 12, ['#9a6c40', '#6a4424', '#46280f']); ctx.fillRect(fx + 3, y - fh / 2 + 3, fw - 6, fh - 6);
        ctx.strokeStyle = '#2e1a0a'; ctx.lineWidth = 0.9; for (const yy of [y - 4, y + 4]) { ctx.beginPath(); ctx.moveTo(fx + 3, yy); ctx.lineTo(fx + fw - 3, yy); ctx.stroke(); }
        for (const yy of [y - 9, y + 7]) { ctx.fillStyle = K.lg(ctx, 0, yy, 0, yy + 3, ['#a0a6ba', '#40444e']); ctx.fillRect(fx + 3, yy, fw - 6, 3); }
        ctx.strokeStyle = '#30323e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(fx + fw / 2, y + 1, 3, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = '#c03a2c'; ctx.lineWidth = 1.4; ctx.strokeRect(fx + 3, y - fh / 2 + 3, fw - 6, fh - 6);
        continue;
      }
      const tell = bump(u, 1.3, 1.5, 2.3, 2.42), fire = u >= 2.4 && u < 3.4;
      const rec = fire ? (u < 2.47 ? seg(u, 2.4, 2.47) * 7 : 7 * (1 - ease(seg(u, 2.47, 3.3)))) : 0;
      const shiv = tell * Math.sin(t * 70 + i) * 0.6;
      // the carriage: a stepped wooden cheek with a truck wheel, under the barrel in the port
      ctx.save(); ctx.translate(-rec * 0.8, 0);
      ctx.fillStyle = K.lg(ctx, 0, y + 4, 0, y + 14, ['#a87444', '#5e3a1c']);
      ctx.beginPath(); ctx.moveTo(fx + 4, y + 5); ctx.lineTo(ex - 2, y + 5); ctx.lineTo(ex - 2, y + 9); ctx.lineTo(ex + 3, y + 9); ctx.lineTo(ex + 3, y + 13); ctx.lineTo(fx + 4, y + 13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2e1a0a'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,.5)'; ctx.beginPath(); ctx.moveTo(fx + 4, y + 5.6); ctx.lineTo(ex - 2, y + 5.6); ctx.stroke();
      ball(ctx, ex - 2, y + 13, 3.6, ['#c08a54', '#7a4e26', '#3e2410'], '#2e1a0a', 0.4); ell(ctx, ex - 2, y + 13, 1, 1, '#30323e');
      ctx.restore();
      if (u > 2.4 && u < 2.9) K.danger(ctx, ex + 28, y, 30, 0.28);
      bronzeCannon(ctx, ex - 4, y - 1, rec, shiv);
      // breeching rope from ring bolts either side of the port, round the breech
      ringBolt(ctx, fx + 2, y - fh / 2 - 2); ringBolt(ctx, fx + 2, y + fh / 2 + 2);
      rope(ctx, [[fx + 2, y - fh / 2], [fx + 9 - rec * 0.6, y - 2], [fx + 2, y + fh / 2]], 2.2);
      // the lid propped open above, red inner face, hauled up by a rope
      ctx.save(); ctx.translate(fx + fw - 1, y - fh / 2); ctx.rotate(-0.7);
      ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#e0563e', '#9a2c1e']); ctx.fillRect(0, -3.2, 22, 4.2);
      ctx.fillStyle = K.lg(ctx, 0, -5, 0, -3, ['#8a5c32', '#4e3018']); ctx.fillRect(0, -5.2, 22, 2);
      ctx.fillStyle = '#40444e'; ctx.fillRect(3, -5.4, 2.2, 6.6); ctx.fillRect(15, -5.4, 2.2, 6.6);
      ctx.restore();
      rope(ctx, [[fx + fw + 15, y - fh / 2 - 15], [fx + fw - 4, y - fh / 2 - 17], [fx - 2, y - fh / 2 - 12]], 1.2);
      // fuse spark and smoke curling up through the tell
      if (tell > 0.02) {
        const sx = ex - 9 - rec, sy = y - 9;
        twinkle(ctx, sx, sy, 3.5 + 2.5 * Math.abs(Math.sin(t * 31 + i)), tell, [255, 210, 110]);
        for (let k = 0; k < 3; k++) {
          const q = mod(t * 0.9 + k / 3 + i * 0.2, 1);
          ell(ctx, sx + Math.sin(q * 6 + k) * 3 + q * 4, sy - q * 22, 2.4 + q * 4.5, 2.4 + q * 4.5, `rgba(200,206,190,${tell * (1 - q) * 0.5})`);
        }
      }
      // fire: muzzle flash, smoke billow, the ball across the shaft, splinters where it hits
      if (u >= 2.4 && u < 3.8) {
        const q = seg(u, 2.4, 3.8), mx = ex + 34;
        if (u < 2.6) {
          const f = 1 - seg(u, 2.4, 2.6);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = K.rg(ctx, mx + 8, y, 20, ['rgba(255,255,220,' + f + ')', 'rgba(255,170,60,' + f * 0.8 + ')', 'rgba(255,90,30,0)']);
          ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, rr = k % 2 ? 8 : 22; ctx.lineTo(mx + 10 + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 0.8); } ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        puff(ctx, mx + 8 + q * 24, y - q * 14, 9 + q * 16, [196, 200, 186], 0.6 * (1 - q), 30 + i);
        const bq = seg(u, 2.4, 2.78), bx = lerp(mx + 6, sh.R(y) - 6, bq);
        if (bq < 1) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = K.lg(ctx, bx - 60, 0, bx, 0, ['rgba(255,150,60,0)', 'rgba(255,190,110,.55)', 'rgba(255,240,200,.8)']);
          ctx.beginPath(); ctx.moveTo(bx - 60, y); ctx.lineTo(bx, y - 6.5); ctx.lineTo(bx, y + 6.5); ctx.closePath(); ctx.fill();
          ctx.restore();
          puff(ctx, bx - 30, y, 7, [200, 204, 190], 0.25, 50 + i);
          K.danger(ctx, bx, y, 22, 0.45);
          ball(ctx, bx, y, 7, ['#c8d0e0', '#5a6278', '#1e2230'], '#2a2e3e', 0.6);
        } else {
          const s2 = seg(u, 2.78, 3.2), rx = sh.R(y) - 2, rr = K.rand(70 + i);
          puff(ctx, rx - 4 - s2 * 6, y, 7 + s2 * 9, [170, 140, 100], 0.5 * (1 - s2), 40 + i);
          ctx.fillStyle = '#c8945a';
          for (let k = 0; k < 6; k++) { const a = Math.PI * (0.6 + rr() * 0.8), d = s2 * (12 + rr() * 16); if (s2 < 1) { ctx.save(); ctx.translate(rx + Math.cos(a) * d, y + Math.sin(a) * d + s2 * s2 * 10); ctx.rotate(k + s2 * 6); ctx.fillRect(-1.6, -0.6, 3.2, 1.2); ctx.restore(); } }
        }
      }
    }
  }

  // ---- Swinging Anchor: a big iron anchor on a chain from a broken spar's pulley block
  function anchorShape(ctx, t) {
    const IRON = [[0, '#c9d0dc'], [0.35, '#7c8698'], [1, '#2e3444']], ED = '#262b3a';
    // stock (crossbar) with ball ends
    ctx.fillStyle = K.lg(ctx, 0, 6, 0, 12, IRON); ctx.beginPath(); ctx.roundRect(-19, 7, 38, 4.6, 2.3); ctx.fill(); ctx.strokeStyle = ED; ctx.lineWidth = 0.9; ctx.stroke();
    for (const d of [-1, 1]) ball(ctx, d * 20, 9.3, 3.2, ['#d6dce6', '#727c90', '#2e3444'], ED, 0.4);
    // arms curving up from the crown, with spade flukes
    ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      ctx.strokeStyle = ED; ctx.lineWidth = 7.4; ctx.beginPath(); ctx.moveTo(0, 50); ctx.quadraticCurveTo(d * 18, 52, d * 23, 36); ctx.stroke();
      ctx.strokeStyle = K.lg(ctx, 0, 34, 0, 56, ['#a8b0c0', '#566074']); ctx.lineWidth = 5.4; ctx.stroke();
      ctx.strokeStyle = 'rgba(240,245,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(d * 4, 49); ctx.quadraticCurveTo(d * 16, 49.5, d * 20.5, 38); ctx.stroke();
      ctx.save(); ctx.translate(d * 23, 35); ctx.rotate(d * 0.55);
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(d * 7, -3, d * 5.5, 4); ctx.lineTo(0, 2); ctx.lineTo(-d * 5.5, 4); ctx.quadraticCurveTo(-d * 7, -3, 0, -9); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, 0, -9, 0, 5, IRON); ctx.fill(); ctx.strokeStyle = ED; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = 'rgba(240,245,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-d * 1, -7); ctx.quadraticCurveTo(-d * 4.5, -3, -d * 4.5, 2); ctx.stroke();
      ctx.restore();
    }
    // the shank
    ctx.beginPath(); ctx.moveTo(-3.6, 3); ctx.lineTo(3.6, 3); ctx.lineTo(4.4, 50); ctx.quadraticCurveTo(0, 55, -4.4, 50); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, -4, 0, 4, 0, [[0, '#d8dee8'], [0.4, '#8590a4'], [1, '#2e3444']]); ctx.fill(); ctx.strokeStyle = ED; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-2.4, 46); ctx.stroke();
    // crown boss
    ball(ctx, 0, 50, 5, ['#c9d0dc', '#6c768a', '#262b3a'], ED, 0.45);
    // rust blooms and barnacles
    for (const [rx, ry, rr] of [[1.5, 24, 2.4], [-14, 47, 2], [12, 10, 2.2], [-1, 40, 1.6]]) ell(ctx, rx, ry, rr, rr * 0.8, 'rgba(200,100,40,.55)');
    for (const [bx, by] of [[3, 53], [-3, 54.5], [6, 50]]) { ell(ctx, bx, by, 1.6, 1.3, '#d8d0b0'); ell(ctx, bx, by, 0.5, 0.45, '#3c3426'); }
    // ring at the top
    ctx.strokeStyle = ED; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -1, 4.6, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#8c96a8'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, -1, 4.6, 3.6, 5); ctx.stroke();
    // a strand of kelp snagged on the stock
    ctx.strokeStyle = '#5a9a4a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-12, 10); ctx.quadraticCurveTo(-14 + Math.sin(t * 3) * 2, 20, -11, 30); ctx.stroke();
    ctx.strokeStyle = '#9ad070'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function anchorSwing(ctx, sh, t, w) {
    const sy = 168, x0 = sh.R(sy) + 4, tip = w * 0.57;
    // the broken yard arm jutting from the right wall
    ctx.save();
    ctx.fillStyle = K.lg(ctx, 0, sy - 6, 0, sy + 6, ['#c08a54', '#86582e', '#46280f']);
    ctx.beginPath(); ctx.moveTo(x0, sy - 6); ctx.lineTo(tip + 4, sy - 5); ctx.lineTo(tip - 2, sy - 1); ctx.lineTo(tip + 3, sy + 2); ctx.lineTo(tip - 1, sy + 5); ctx.lineTo(x0, sy + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3e240e'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, sy - 5); ctx.lineTo(tip + 3, sy - 4.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,34,14,.6)'; ctx.lineWidth = 0.7;
    for (const [a, b, yy] of [[x0 - 4, tip + 30, sy - 1], [x0 - 30, tip + 12, sy + 2.5]]) { ctx.beginPath(); ctx.moveTo(a, yy); ctx.lineTo(b, yy + 0.3); ctx.stroke(); }
    // rope lashing where it meets the wall
    for (let k = 0; k < 5; k++) { ctx.strokeStyle = k % 2 ? '#e6cf98' : '#b89a5e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0 - 6 - k * 2.4, sy - 6.5); ctx.lineTo(x0 - 3 - k * 2.4, sy + 6.5); ctx.stroke(); }
    ctx.restore();
    // a lantern hanging off the spar
    lantern(ctx, tip + 34, sy + 6, Math.sin(t * 1.6) * 0.12, t, 0.9, 2);
    // the pulley block
    const px = tip + 6, py = sy + 18;
    ctx.strokeStyle = '#d9c08a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, sy + 3); ctx.lineTo(px, sy + 10); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, px - 6, 0, px + 6, 0, ['#c99a62', '#7a4e26', '#4a2c12']); ctx.beginPath(); ctx.roundRect(px - 5.5, sy + 9, 11, 13, 4); ctx.fill();
    ctx.strokeStyle = '#3e240e'; ctx.lineWidth = 0.9; ctx.stroke();
    ell(ctx, px, sy + 15.5, 3, 3, '#3a3a44'); ell(ctx, px - 0.8, sy + 14.7, 1, 1, '#d0d4e0');
    // the swing
    const th = 0.62 * Math.sin(t * TAU / 3.2), L = 70;
    const ax = px + Math.sin(th) * L, ay = py + Math.cos(th) * L;
    const sp = Math.abs(Math.cos(t * TAU / 3.2));
    // motion arcs behind the flukes as it whips through the middle
    if (sp > 0.5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const dir = Math.cos(t * TAU / 3.2) > 0 ? 1 : -1;
      for (const [rr, a] of [[L + 52, 0.22], [L + 40, 0.14]]) {
        ctx.strokeStyle = `rgba(220,240,255,${a * (sp - 0.5) * 2})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, rr, Math.PI / 2 - th, Math.PI / 2 - th + dir * 0.45, dir < 0); ctx.stroke();
      }
      ctx.restore();
    }
    // the chain
    const n = 10;
    for (let k = 0; k < n; k++) {
      const q = (k + 0.5) / n, lx = lerp(px, ax, q), ly = lerp(py, ay, q);
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(Math.PI / 2 - th);
      if (k % 2) { ctx.strokeStyle = '#262b3a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-3.6, 0); ctx.lineTo(3.6, 0); ctx.stroke(); ctx.strokeStyle = '#a0a8b8'; ctx.lineWidth = 1.4; ctx.stroke(); }
      else { ctx.strokeStyle = '#262b3a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 2.6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#9aa2b4'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 2.6, 0, 3.5, 5); ctx.stroke(); }
      ctx.restore();
    }
    // creak at the block near each end of the swing
    const endv = smooth(0.85, 1, Math.abs(Math.sin(t * TAU / 3.2)));
    if (endv > 0.05) { ctx.strokeStyle = `rgba(255,230,180,${endv * 0.7})`; ctx.lineWidth = 1; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(px, sy + 15, 9, d > 0 ? -0.5 : Math.PI - 0.5, d > 0 ? 0.3 : Math.PI + 0.3); ctx.stroke(); } }
    // the anchor
    const cx = px + Math.sin(th) * (L + 30), cy = py + Math.cos(th) * (L + 30);
    K.danger(ctx, cx, cy + 8, 40, 0.3);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(-th); anchorShape(ctx, t); ctx.restore();
  }

  // ---- Kraken Arm: a porthole bulges and drips, a tentacle bursts through, sweeps, slithers back
  const KR = { top: ['#ff8eb0', '#d63a72', '#8a1c56'], under: ['#ffe8ef', '#ffaac4'], edge: '#5e1440' };
  function tentacle(ctx, pts, w0, w1) {
    const T = tube(pts, w0, w1), { L, R, N, n } = T;
    const my = pts[n >> 1][1]; T.path(ctx); ctx.fillStyle = K.lg(ctx, 0, my - 16, 0, my + 14, KR.top); ctx.fill();
    ctx.save(); T.path(ctx); ctx.clip();
    // pale sucker side (the lower edge)
    ctx.beginPath(); R.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    for (let i = n; i >= 0; i--) { const [x, y] = pts[i], [nx, ny, wd] = N[i]; ctx.lineTo(x - nx * wd * 0.25, y - ny * wd * 0.25); }
    ctx.closePath(); ctx.fillStyle = K.lg(ctx, 0, my - 6, 0, my + 14, KR.under); ctx.fill();
    // occlusion where the sucker strip meets the skin, and a deep shadow along the top skin's far side
    ctx.strokeStyle = 'rgba(110,20,70,.45)'; ctx.lineWidth = 1.4; ctx.beginPath();
    pts.forEach(([x, y], i) => { const [nx, ny, wd] = N[i]; const px = x - nx * wd * 0.25, py = y - ny * wd * 0.25; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,10,60,.35)'; ctx.lineWidth = 3; ctx.beginPath();
    L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    // spots on the top side, a gloss line
    for (let i = 2; i < n - 2; i += 3) { const [x, y] = pts[i], [nx, ny, wd] = N[i]; ell(ctx, x + nx * wd * 0.45, y + ny * wd * 0.45, wd * 0.22, wd * 0.16, 'rgba(120,20,70,.45)'); }
    ctx.strokeStyle = 'rgba(255,240,250,.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 1; i < n * 0.85; i++) { const [x, y] = pts[i], [nx, ny, wd] = N[i]; const px = x + nx * wd * 0.6, py = y + ny * wd * 0.6; i > 1 ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    ctx.restore();
    // suckers peeking past the lower edge
    for (let i = 2; i < n; i += 2) {
      const [x, y] = pts[i], [nx, ny, wd] = N[i], r = Math.max(0.6, wd * 0.34), sx = x - nx * wd * 0.92, sy = y - ny * wd * 0.92;
      ell(ctx, sx, sy, r, r, '#ffe6ee'); ctx.strokeStyle = 'rgba(176,60,110,.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
      ell(ctx, sx, sy, r * 0.45, r * 0.45, 'rgba(210,90,140,.75)');
    }
    T.path(ctx); ctx.strokeStyle = KR.edge; ctx.lineWidth = 1; ctx.stroke();
  }
  function kraken(ctx, sh, t) {
    const u = mod(t - 0.7, 4), y = 350, x = sh.R(y) + 3, R = 13;
    const tell = bump(u, 0.9, 1.2, 1.85, 1.95), out = u >= 1.9 && u < 3.75;
    const ext = u < 1.9 ? 0 : u < 2.25 ? ease(seg(u, 1.9, 2.25)) : u < 3.05 ? 1 : 1 - ease(seg(u, 3.05, 3.65));
    const reform = seg(u, 3.75, 4);
    // the eye pressed to the glass through the tell
    porthole(ctx, x, y, R, t, tell, seg(u, 1.4, 1.9), out ? 1 : 0);
    if (!out && tell > 0.1) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R - 3, 0, TAU); ctx.clip();
      ell(ctx, x, y + 2, 11, 9, K.rg(ctx, x - 2, y - 2, 12, ['#ff9ab8', '#c23c6e']));
      ell(ctx, x - 1, y + 1, 6.5 * tell, 5.5 * tell, '#fff4d0');
      ell(ctx, x - 2, y + 1.5, 4 * tell, 4 * tell, '#ffcf3a');
      ell(ctx, x - 2.4, y + 1.5, 1.2, 3.4 * tell, '#1a0d14');
      ell(ctx, x - 3.6, y - 0.6, 1, 1, '#fff');
      ctx.strokeStyle = 'rgba(120,20,60,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - 6 + 2 * tell); ctx.lineTo(x + 3, y - 3); ctx.stroke();
      ctx.restore();
      // drips running from the bulging ring
      for (let k = 0; k < 3; k++) {
        const q = mod(t * 1.4 + k / 3, 1), dx = x - 8 + k * 6;
        ell(ctx, dx, y + R + 2 + q * q * 26, 1.4, 2, `rgba(170,240,225,${0.8 * (1 - q) * tell})`);
      }
    }
    if (reform > 0) { ctx.save(); ctx.globalAlpha = reform; porthole(ctx, x, y, R, t); ctx.restore(); }
    // burst: glass shards flying
    if (u >= 1.9 && u < 2.5) {
      const q = seg(u, 1.9, 2.5), r = K.rand(81);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.55 + r() * 0.9), d = 6 + q * (30 + r() * 30), sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d + q * q * 30;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(q * 8 + k); ctx.fillStyle = `rgba(190,255,240,${0.85 * (1 - q)})`;
        ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(2, 1.5); ctx.lineTo(-1.8, 2); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      puff(ctx, x - 10 - q * 14, y, 8 + q * 10, [160, 230, 215], 0.5 * (1 - q), 91);
    }
    if (ext > 0.01) {
      const sw = u < 2.25 ? -0.32 : u < 3.05 ? lerp(-0.32, 0.38, ease(seg(u, 2.25, 3.05))) : 0.38;
      const len = 122 * ext, pts = walk(x, y, Math.PI + sw, len, 0.002, -0.075, 0.014, t * 6, 24);
      const tip = pts[pts.length - 1];
      K.danger(ctx, (x + tip[0]) / 2, (y + tip[1]) / 2, 50, 0.3);
      tentacle(ctx, pts, 21, 3.4);
    }
    // the rim of the porthole over the root
    if (out) { ctx.strokeStyle = K.lg(ctx, x - R, y - R, x + R, y + R, ['#fff0b0', '#e0a640', '#8a5214']); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R - 0.5, 1.9, 4.4); ctx.stroke(); }
  }

  // a broken deck jutting from the left wall with a crate and a loose barrel that rolls as the hold lists
  function looseBarrel(ctx, sh, t, roll) {
    const y = 300, ex = sh.L(y), len = 44;
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 9, ['#b0804c', '#6a4424', '#3a2210']);
    ctx.beginPath(); ctx.moveTo(ex - 6, y); ctx.lineTo(ex + len, y); ctx.lineTo(ex + len - 3, y + 3); ctx.lineTo(ex + len + 1, y + 5); ctx.lineTo(ex + len - 5, y + 8); ctx.lineTo(ex - 6, y + 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,150,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex - 4, y + 0.5); ctx.lineTo(ex + len, y + 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,22,10,.7)'; ctx.beginPath(); ctx.moveTo(ex - 4, y + 4.5); ctx.lineTo(ex + len - 4, y + 4.5); ctx.stroke();
    ell(ctx, ex + 10, y + 2.2, 0.9, 0.9, '#d8dce4'); ell(ctx, ex + 30, y + 6.5, 0.9, 0.9, '#d8dce4');
    // a knee bracket under it
    ctx.fillStyle = '#4a2e16'; ctx.beginPath(); ctx.moveTo(ex - 4, y + 9); ctx.lineTo(ex + 14, y + 9); ctx.quadraticCurveTo(ex + 2, y + 12, ex - 4, y + 26); ctx.closePath(); ctx.fill();
    // crate at the wall end
    const cx = ex + 1, cs = 9;
    ctx.fillStyle = K.lg(ctx, 0, y - cs * 2, 0, y, ['#d6a868', '#94643a']); ctx.fillRect(cx - 4, y - cs * 2, cs * 2, cs * 2);
    ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 0.9; ctx.strokeRect(cx - 4, y - cs * 2, cs * 2, cs * 2);
    ctx.strokeStyle = 'rgba(90,58,28,.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 3, y - 1); ctx.lineTo(cx + cs * 2 - 5, y - cs * 2 + 1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,190,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 4, y - cs * 2 + 0.5); ctx.lineTo(cx + cs * 2 - 4, y - cs * 2 + 0.5); ctx.stroke();
    // the barrel, end-on, rolling
    const br = 8.5, bx = lerp(ex + 24, ex + len - br - 1, roll), ang = (bx - ex) / br;
    K.shadow(ctx, bx, y + 1, 9, 2.5, 0.4);
    ctx.save(); ctx.translate(bx, y - br); ctx.rotate(ang);
    ctx.fillStyle = K.rg(ctx, -3, -3, br + 2, ['#e0b070', '#a06a34', '#5e3a18']); ctx.beginPath(); ctx.arc(0, 0, br, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, br - 2, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(80,46,18,.8)'; ctx.lineWidth = 0.8;
    for (const lx of [-3.6, 0, 3.6]) { ctx.beginPath(); ctx.moveTo(lx, -br); ctx.lineTo(lx, br); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#4a4e5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, br - 1, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,226,240,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, br - 1, 3.5, 5); ctx.stroke();
    ell(ctx, 2, 3, 1.4, 1.4, '#3a2210');
    ctx.restore();
  }

  PV.sections['shipwreck'] = (ctx, w, h, t) => {
    // the twist: every few seconds the wreck lists, then rights itself
    const lu = mod(t, 4), list = 0.032 * (smooth(0.4, 1.0, lu) - smooth(2.2, 3.0, lu)) - 0.012 * (smooth(2.6, 3.2, lu) - smooth(3.4, 4.0, lu));
    const roll = clamp(smooth(0.6, 1.5, lu) - smooth(2.4, 3.4, lu), 0, 1);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(list); ctx.scale(1.07, 1.07); ctx.translate(-w / 2, -h / 2);
    K.shaft(ctx, w, h, t, SHIP, { inset: -70 });
    const HL = hullEdge(14, -1, w, h), HR = hullEdge(29, 1, w, h), sh = { L: HL.edge, R: HR.edge };
    hullWall(ctx, HL, -1, w, h, t, [[0, [255, 196, 96]], [0.3, [255, 186, 90]], [0.5, [140, 214, 190]], [0.75, [255, 190, 90]], [1, [140, 214, 190]]]);
    hullWall(ctx, HR, 1, w, h, t, [[0, [255, 196, 96]], [0.4, [140, 214, 190]], [0.6, [255, 190, 90]], [1, [140, 214, 190]]]);
    // ribs jutting in, lanterns hanging from two of them; barnacle clusters and kelp
    const ribs = [[HL, -1, 208, 16, 1], [HL, -1, 404, 14, 1], [HR, 1, 100, 13, 0], [HR, 1, 262, 16, 1], [HR, 1, 404, 12, 0]];
    barnacles(ctx, HL.edge(352), 352, -1, 5); barnacles(ctx, HR.edge(300), 300, 1, 6); barnacles(ctx, HL.edge(460), 460, -1, 7);
    // a fishing net hung from two pegs on the right wall, sagging in diamonds, cork floats along its hem, a starfish caught in it
    {
      const nx0 = sh.R(14) + 2, top = 12, cols = 6, rows = 4, NW = 34;
      const node = (c, r) => { const u = c / cols, sag = Math.sin(u * Math.PI) * (6 + r * 3); return [nx0 - u * NW + (r % 2) * 2.6, top + r * 8 + sag + Math.sin(t * 1.2 + c) * 0.6 * r]; };
      ctx.save(); ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(40,26,14,.5)';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(232,212,160,.85)' : 'rgba(40,26,14,.55)'; ctx.lineWidth = pass ? 0.8 : 1.6;
        for (let r = 0; r <= rows; r++) { ctx.beginPath(); for (let c = 0; c <= cols; c++) { const [x, y] = node(c, r); c ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
        for (let c = 0; c <= cols; c++) { ctx.beginPath(); for (let r = 0; r <= rows; r++) { const [x, y] = node(c + (r % 2 ? 0.5 : 0), r); r ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      }
      ctx.restore();
      for (const c of [0, cols]) { const [x, y] = node(c, 0); ball(ctx, x, y, 1.8, ['#e0e2ea', '#6a6e7c', '#2e3040'], '#2e3040', 0.5); }
      for (let c = 1; c < cols; c += 2) { const [x, y] = node(c, rows); ctx.save(); ctx.translate(x, y + 2); ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#ffd08a', '#e07a34', '#8a3e12']); ctx.beginPath(); ctx.roundRect(-3.6, -2.4, 7.2, 4.8, 2.4); ctx.fill(); ctx.strokeStyle = '#7a3410'; ctx.lineWidth = 0.6; ctx.stroke(); ctx.fillStyle = 'rgba(255,240,210,.7)'; ctx.fillRect(-2.4, -1.8, 4, 0.9); ctx.restore(); }
      const [sx, sy] = node(2.6, 2);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(0.3); ctx.fillStyle = K.rg(ctx, -1.5, -1.5, 7, ['#ffc8a0', '#f0704e', '#b8402c']);
      ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? 2.4 : 6; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#a03424'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,220,.8)'; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - Math.PI / 2; ell(ctx, Math.cos(a) * 3, Math.sin(a) * 3, 0.5, 0.5, 'rgba(255,240,220,.85)'); }
      ctx.restore();
    }
    // deco portholes and wall lanterns (they hang true while the hull lists)
    porthole(ctx, sh.L(250) - 12, 250, 11, t + 1.3);
    porthole(ctx, sh.R(456) + 12, 456, 11, t + 2.1);
    porthole(ctx, sh.R(212) + 13, 212, 9, t + 0.4);
    ribs.forEach(([H, side, y, jut, lamp], k) => {
      const p = rib(ctx, H, side, y, jut, t);
      if (lamp) { ctx.strokeStyle = '#2e2e36'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x - side * 4, y + 6); ctx.quadraticCurveTo(p.x - side * 6, y + 10, p.x - side * 3, y + 11); ctx.stroke(); lantern(ctx, p.x - side * 3, y + 11, -list * 1.2 + Math.sin(t * 2 + k) * 0.06, t, 0.9, k); }
    });
    // seaweed draped over the wall edges
    for (const [side, y, n] of [[-1, 340, 3], [1, 120, 2], [1, 412, 3], [-1, 6, 2]]) {
      const ex = side < 0 ? sh.L(y) : sh.R(y);
      for (let k = 0; k < n; k++) {
        const x = ex - side * (k * 3 - 2), l = 18 + k * 7, sw = Math.sin(t * 1.4 + k + y) * 2;
        ctx.lineCap = 'round'; ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - side * 4, y + l * 0.5, x + sw, y + l); ctx.stroke();
        ctx.strokeStyle = '#7fc46a'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    cannons(ctx, sh, t, w);
    looseBarrel(ctx, sh, t, roll);
    anchorSwing(ctx, sh, t, w);
    kraken(ctx, sh, t);
    // creak lines along the planks as the hold lurches
    const creak = Math.abs(list) / 0.032;
    if (creak > 0.3) for (const [x, y] of [[sh.L(130) - 6, 130], [sh.R(320) + 6, 320], [sh.L(440) - 6, 440]]) {
      ctx.strokeStyle = `rgba(255,226,170,${(creak - 0.3) * 0.8})`; ctx.lineWidth = 1;
      for (const d of [0, 4]) { ctx.beginPath(); ctx.moveTo(x - 4, y + d); ctx.quadraticCurveTo(x, y + d - 3, x + 4, y + d); ctx.stroke(); }
    }
    for (const [x, y, ph] of [[92, 214, 0], [100, 236, 0.6], [196, 404, 1.2], [180, 424, 1.8]]) coin(ctx, x, y, t, ph);
    K.motes(ctx, w, h, t, 'dust', [255, 214, 140], 26, 5);
    K.motes(ctx, w, h, t, 'drip', SEA, 6, 9);
    ctx.restore();
    // the rocket stays upright; it leans away from the kraken's sweep
    const ku = mod(t - 0.7, 4), dodge = bump(ku, 1.9, 2.4, 3.0, 3.5);
    K.rocket(ctx, w * 0.5 - 38 * dodge, h * 0.8 + 6 * dodge, 0.75, t);
    // a warm vignette
    ctx.fillStyle = K.rg(ctx, w / 2, h * 0.45, h * 0.62, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(10,20,20,.35)']); ctx.fillRect(0, 0, w, h);
  };

  // ================================================================= CURSED TREASURE VAULT
  const VAULT = {
    bgTop: [84, 56, 78], bgBot: [34, 22, 42], far: [98, 70, 82], far2: [116, 84, 72],
    wall: [58, 40, 60], wallIn: [16, 9, 20], rim: [255, 206, 96], seed: 9, wobble: 0.9,
  };
  const CURSE = [93, 255, 158], GOLDG = [255, 214, 100];
  const GOLD = { lit: '#fff6c0', hi: '#ffd860', mid: '#e0a028', lo: '#9a5a10', deep: '#5e3008' };
  // a green curse flame (additive), flickering; s = height
  function curseFlame(ctx, x, y, s, t, ph = 0, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    K.glow(ctx, x, y - s * 0.3, s * 1.6, CURSE, 0.3 * a);
    for (let k = 0; k < 3; k++) {
      const f = 1 - k * 0.28, sw = Math.sin(t * 9 + ph + k * 2) * s * 0.12, hh = s * f * (0.9 + 0.15 * Math.sin(t * 13 + ph + k));
      ctx.fillStyle = K.lg(ctx, 0, y, 0, y - hh, [rgb(k ? [220, 255, 230] : CURSE, 0.75 * a), rgb(CURSE, 0.5 * a), rgb([60, 200, 120], 0)]);
      ctx.beginPath(); ctx.moveTo(x - s * 0.32 * f, y); ctx.quadraticCurveTo(x - s * 0.4 * f, y - hh * 0.5, x + sw, y - hh);
      ctx.quadraticCurveTo(x + s * 0.4 * f, y - hh * 0.5, x + s * 0.32 * f, y); ctx.quadraticCurveTo(x, y + s * 0.12, x - s * 0.32 * f, y); ctx.fill();
    }
    ctx.restore();
  }
  // a faceted gem; kind: colour triple
  const GEMS = { ruby: ['#ffd0d8', '#ff3a5a', '#8a0a2a'], sapph: ['#d8ecff', '#3a7aff', '#14206a'], emer: ['#d8ffe8', '#2ad07a', '#0a5a34'], amet: ['#f0d8ff', '#b44aff', '#4a1478'] };
  function gem(ctx, x, y, r, kind, t = 0, ph = 0) {
    const C = GEMS[kind];
    ctx.save(); ctx.translate(x, y);
    const oct = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; oct.push([Math.cos(a) * r, Math.sin(a) * r * 0.86]); }
    ctx.fillStyle = K.rg(ctx, -r * 0.4, -r * 0.45, r * 1.5, C); poly(ctx, oct); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C[2]; ctx.lineWidth = 0.8; ctx.stroke();
    // facets: a table in the middle, lines out to the corners
    const tb = oct.map(([px, py]) => [px * 0.5, py * 0.5]);
    ctx.fillStyle = K.lg(ctx, -r * 0.5, -r * 0.5, r * 0.5, r * 0.5, [C[0], C[1]]); poly(ctx, tb); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(tb[i][0], tb[i][1]); ctx.lineTo(oct[i][0], oct[i][1]); ctx.stroke(); }
    ell(ctx, -r * 0.3, -r * 0.32, r * 0.22, r * 0.12, 'rgba(255,255,255,.9)', -0.6);
    ctx.restore();
    twinkle(ctx, x - r * 0.35, y - r * 0.4, r * 0.9, Math.max(0, Math.sin(t * 2.2 + ph)) ** 6 * 0.9);
  }
  // a heap of gold coins sitting on a ledge top: base from x0 to x1 at y, peak height hg
  function heap(ctx, x0, x1, y, hg, seed, t, jig = 0) {
    const r = K.rand(seed), mx = (x0 + x1) / 2, wd = x1 - x0;
    const shape = () => {
      ctx.beginPath(); ctx.moveTo(x0, y);
      ctx.bezierCurveTo(x0 + wd * 0.15, y - hg * 0.55, mx - wd * 0.28, y - hg + jig, mx, y - hg + jig);
      ctx.bezierCurveTo(mx + wd * 0.28, y - hg - jig, x1 - wd * 0.15, y - hg * 0.55, x1, y); ctx.closePath();
    };
    shape(); ctx.fillStyle = K.rg(ctx, mx - wd * 0.15, y - hg * 0.8, Math.max(wd, hg) * 0.9, [GOLD.hi, GOLD.mid, GOLD.lo]); ctx.fill();
    ctx.save(); shape(); ctx.clip();
    // coins packed on the surface: rows of little tilted discs, each lit on its upper lip
    const rows = Math.max(2, Math.round(hg / 3.4));
    for (let row = 0; row < rows; row++) {
      const yy = y - row * 3.4 - 1, n = Math.ceil(wd / 5);
      for (let i = 0; i < n; i++) {
        const xx = x0 + (i + (row % 2) * 0.5) * 5 + (r() - 0.5) * 2, rx = 2.6 + r() * 0.6, ry = 1.1 + r() * 0.5, rot = (r() - 0.5) * 0.6;
        ell(ctx, xx, yy + 0.5, rx, ry, GOLD.lo, rot); ell(ctx, xx, yy, rx, ry, r() < 0.3 ? GOLD.hi : GOLD.mid, rot);
        ctx.strokeStyle = 'rgba(255,248,200,.8)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(xx, yy, rx * 0.8, ry * 0.7, rot, 3.6, 5.6); ctx.stroke();
      }
    }
    ctx.restore();
    shape(); ctx.strokeStyle = 'rgba(120,64,10,.7)'; ctx.lineWidth = 0.8; ctx.stroke();
    // a lit crest and a few coins standing on edge
    ctx.strokeStyle = 'rgba(255,250,210,.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(x0 + wd * 0.18, y - hg * 0.55); ctx.bezierCurveTo(mx - wd * 0.2, y - hg + jig, mx - wd * 0.1, y - hg + jig, mx + wd * 0.05, y - hg + jig * 0.5); ctx.stroke();
    for (let k = 0; k < 3; k++) { const q = 0.25 + r() * 0.5, cx = lerp(x0, x1, q), cy = y - hg * Math.sin(q * Math.PI) * 0.92 + jig; ell(ctx, cx, cy - 2, 1.4, 3, GOLD.mid, 0.3); ell(ctx, cx - 0.4, cy - 2.2, 0.6, 2.2, GOLD.lit, 0.3); }
    for (let k = 0; k < 3; k++) { const q = 0.15 + r() * 0.7, cx = lerp(x0, x1, q), cy = y - hg * Math.sin(q * Math.PI) * 0.8; twinkle(ctx, cx, cy, 3, Math.max(0, Math.sin(t * 1.8 + k * 2.1 + seed)) ** 8 * 0.9); }
  }
  // a rock ledge on a vault wall; returns ex (wall edge) and tip x
  function vLedge(ctx, sh, side, y, len, th = 9) {
    const ex = side < 0 ? sh.L(y) : sh.R(y), d = -side, tip = ex + d * len;
    ctx.beginPath(); ctx.moveTo(ex - d * 8, y - 2); ctx.lineTo(tip - d * 5, y - 1.5); ctx.quadraticCurveTo(tip + d * 2, y, tip - d * 2, y + 5);
    ctx.quadraticCurveTo(ex + d * len * 0.5, y + th, ex + d * 3, y + th * 2.2); ctx.lineTo(ex - d * 8, y + th * 2.4); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 2, 0, y + th * 2.2, [rgb(lift(VAULT.wall, 34)), rgb(lift(VAULT.wall, 4)), rgb(VAULT.wallIn)]); ctx.fill();
    ctx.strokeStyle = rgb(lift(VAULT.wallIn, 6)); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = rgb(VAULT.wallIn, 0.8); ctx.beginPath(); ctx.moveTo(ex, y + 5); ctx.quadraticCurveTo(ex + d * len * 0.4, y + 6.5, tip - d * 7, y + 3.5); ctx.stroke();
    ctx.strokeStyle = rgb(lift(VAULT.rim, 10), 0.75); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex - d * 4, y - 1.8); ctx.lineTo(tip - d * 5, y - 1.5); ctx.quadraticCurveTo(tip + d * 2, y, tip - d * 2, y + 5); ctx.stroke();
    return { ex, tip, d };
  }
  VAULT.farShape = (ctx, w, h, t, layer, col) => {
    const r = K.rand(layer * 13 + 5);
    if (layer === 0) {
      // the cave roof: stalactites dripping down
      for (let i = 0; i < 9; i++) {
        const x = r() * w, cw = 10 + r() * 22, len = 30 + r() * 90;
        ctx.fillStyle = rgb(lift(col, -10)); ctx.beginPath(); ctx.moveTo(x - cw, -5); ctx.quadraticCurveTo(x - cw * 0.3, len * 0.5, x, len); ctx.quadraticCurveTo(x + cw * 0.3, len * 0.5, x + cw, -5); ctx.fill();
      }
      // far dunes of gold filling the cave: banded with rows of coin glints and dark crevices
      const gc = [128, 88, 58];
      for (const [cx, cy, rw, hh, sd] of [[30, h * 0.66, 150, 130, 1], [226, h * 0.58, 140, 180, 2], [130, h * 0.78, 190, 110, 3]]) {
        const top = cy - hh * 0.5;
        const dune = () => { ctx.beginPath(); ctx.moveTo(cx - rw, h + 5); ctx.quadraticCurveTo(cx - rw * 0.4, cy - hh * 0.4, cx, top); ctx.quadraticCurveTo(cx + rw * 0.4, cy - hh * 0.4, cx + rw, h + 5); ctx.closePath(); };
        dune(); ctx.fillStyle = K.lg(ctx, 0, top, 0, h, [rgb(lift(gc, 30)), rgb(gc), rgb(lift(gc, -46))]); ctx.fill();
        ctx.save(); dune(); ctx.clip();
        const rr = K.rand(sd * 19);
        for (let i = 0; i < 70; i++) { const x = cx - rw + rr() * rw * 2, y = top + rr() * (h - top); ell(ctx, x, y, 2.2, 0.9, rgb(lift(gc, 46), 0.55)); }
        ctx.strokeStyle = rgb(lift(gc, -40), 0.5); ctx.lineWidth = 1.2;
        for (let k = 0; k < 4; k++) { const y = top + 24 + k * 30; ctx.beginPath(); ctx.moveTo(cx - rw, y + 30); ctx.quadraticCurveTo(cx - rw * 0.2 + k * 9, y - 4, cx + rw * 0.4, y + 22); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = rgb(lift(gc, 70), 0.55); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - rw * 0.5, cy - hh * 0.2); ctx.quadraticCurveTo(cx - rw * 0.25, cy - hh * 0.48, cx, top); ctx.stroke();
      }
      // a giant chest far off on the hoard, lid thrown back, gold light welling out of it
      {
        const X = 140, Y = h * 0.52, dk = rgb(lift(col, -14)), md = rgb(lift(col, 0)), lt = rgb(lift(col, 22)), gb = rgb([220, 170, 96]);
        K.glow(ctx, X, Y - 26, 70, [255, 200, 110], 0.22);
        // lid tipped back behind the box
        ctx.save(); ctx.translate(X, Y - 22); ctx.rotate(-0.18);
        ctx.fillStyle = K.lg(ctx, 0, -30, 0, 0, [lt, dk]); ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-30, -26); ctx.quadraticCurveTo(0, -36, 30, -26); ctx.lineTo(34, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = gb; ctx.globalAlpha = 0.5; ctx.fillRect(-24, -30, 5, 30); ctx.fillRect(19, -30, 5, 30); ctx.globalAlpha = 1;
        ctx.restore();
        // the overflowing gold
        ctx.fillStyle = K.lg(ctx, 0, Y - 40, 0, Y - 18, [rgb([255, 226, 140]), rgb([214, 160, 80])]);
        ctx.beginPath(); ctx.moveTo(X - 36, Y - 20); ctx.quadraticCurveTo(X - 22, Y - 44, X - 2, Y - 38); ctx.quadraticCurveTo(X + 20, Y - 46, X + 36, Y - 20); ctx.closePath(); ctx.fill();
        // spill down the front
        ctx.beginPath(); ctx.moveTo(X + 8, Y - 22); ctx.quadraticCurveTo(X + 16, Y - 4, X + 30, Y + 6); ctx.lineTo(X + 44, Y + 8); ctx.quadraticCurveTo(X + 28, Y - 6, X + 22, Y - 22); ctx.closePath(); ctx.fill();
        // the box: planks, gold bands, a lock plate
        ctx.fillStyle = K.lg(ctx, 0, Y - 22, 0, Y + 8, [md, dk]); ctx.beginPath(); ctx.roundRect(X - 36, Y - 22, 72, 30, 3); ctx.fill();
        ctx.strokeStyle = rgb(lift(col, -26), 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X - 36, Y - 7); ctx.lineTo(X + 36, Y - 7); ctx.stroke();
        ctx.fillStyle = gb; ctx.globalAlpha = 0.65; ctx.fillRect(X - 25, Y - 22, 6, 30); ctx.fillRect(X + 19, Y - 22, 6, 30); ctx.fillRect(X - 5, Y - 22, 10, 12); ctx.globalAlpha = 1;
        ctx.strokeStyle = rgb([255, 220, 150], 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X - 36, Y - 21.5); ctx.lineTo(X + 36, Y - 21.5); ctx.stroke();
        for (let k = 0; k < 5; k++) twinkle(ctx, X - 24 + k * 12, Y - 34 - (k % 2) * 6, 3, Math.max(0, Math.sin(t * 2 + k * 1.9)) ** 6 * 0.8);
      }
      for (let i = 0; i < 18; i++) { const x = r() * w, y = h * 0.45 + r() * h * 0.55; twinkle(ctx, x, y, 2.6, Math.max(0, Math.sin(t * 1.6 + i * 1.7)) ** 10 * 0.75, [255, 230, 160]); }
    } else {
      // nearer: the hoard's own skyline — mounds, a ship's wheel, crossed swords, a great goblet, a cursed brazier
      const gc = [150, 102, 56];
      ctx.fillStyle = K.lg(ctx, 0, h * 0.78, 0, h, [rgb(lift(gc, 28)), rgb(lift(gc, -20))]);
      ctx.beginPath(); ctx.moveTo(-5, h + 5); ctx.lineTo(-5, h * 0.88);
      ctx.quadraticCurveTo(50, h * 0.8, 96, h * 0.86); ctx.quadraticCurveTo(150, h * 0.76, 200, h * 0.84); ctx.quadraticCurveTo(240, h * 0.8, w + 5, h * 0.86); ctx.lineTo(w + 5, h + 5); ctx.fill();
      for (let i = 0; i < 90; i++) { const x = r() * w, y = h * 0.82 + r() * h * 0.18; ell(ctx, x, y + 0.6, 2.6, 1.1, rgb(lift(gc, -30), 0.7)); ell(ctx, x, y, 2.6, 1.1, rgb(lift(gc, r() < 0.3 ? 60 : 30), 0.8)); }
      // ship's wheel
      ctx.save(); ctx.translate(70, h * 0.8); ctx.rotate(0.2); ctx.strokeStyle = rgb(lift(col, -4)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke(); ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21); ctx.stroke(); }
      ctx.restore();
      // crossed swords stuck in the gold
      ctx.strokeStyle = rgb(lift(col, 30)); ctx.lineWidth = 2.2;
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(150 + d * 14, h * 0.8); ctx.lineTo(150 - d * 12, h * 0.68); ctx.stroke(); ctx.fillStyle = rgb(lift(col, 10)); ctx.fillRect(150 - d * 12 - 4, h * 0.68 - 2, 8, 2.5); }
      // great goblet
      ctx.fillStyle = rgb(lift(col, 8));
      ctx.beginPath(); ctx.moveTo(214, h * 0.74); ctx.quadraticCurveTo(214, h * 0.79, 222, h * 0.795); ctx.lineTo(220, h * 0.82); ctx.lineTo(214, h * 0.83); ctx.lineTo(236, h * 0.83); ctx.lineTo(230, h * 0.82); ctx.lineTo(228, h * 0.795); ctx.quadraticCurveTo(236, h * 0.79, 236, h * 0.74); ctx.closePath(); ctx.fill();
    }
  };
  VAULT.wallDeco = (ctx, side, edge, w, h, t) => {
    const r = K.rand(side < 0 ? 71 : 79), W = VAULT.wall;
    // rock strata: angular cracks drawn as line pairs
    for (let i = 0; i < 16; i++) {
      const y = r() * h, x = edge(y) + side * (5 + r() * 20), len = 8 + r() * 14;
      ctx.strokeStyle = rgb(VAULT.wallIn, 0.85); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * len * 0.5, y + len * 0.4); ctx.lineTo(x + side * len, y + len * 0.2); ctx.stroke();
      ctx.strokeStyle = rgb(lift(W, 34), 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x + side * len * 0.5, y + len * 0.4 - 1); ctx.lineTo(x + side * len, y + len * 0.2 - 1); ctx.stroke();
    }
    // banks of coins pressed into the rock: dense veins of gold all along the edge
    for (let i = 0; i < 190; i++) {
      const band = Math.floor(r() * 7), y = (band + 0.15 + r() * 0.7) * h / 7 + (side > 0 ? 30 : 0), x = edge(y) + side * (1 + r() * r() * 22), rx = 2.6 + r() * 1.2, rot = (r() - 0.5) * 0.5;
      ell(ctx, x + 0.3, y + 0.8, rx, rx * 0.62, GOLD.deep, rot); ell(ctx, x, y, rx, rx * 0.62, r() < 0.4 ? GOLD.hi : GOLD.mid, rot);
      ell(ctx, x + 0.3, y + 0.3, rx * 0.62, rx * 0.36, r() < 0.5 ? GOLD.mid : GOLD.lo, rot);
      ctx.strokeStyle = 'rgba(255,248,200,.85)'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.85, rx * 0.5, rot, 3.5, 5.7); ctx.stroke();
    }
    // gems set deeper in the rock
    const kinds = ['ruby', 'sapph', 'emer', 'amet'];
    for (let i = 0; i < 6; i++) { const y = r() * h, x = edge(y) + side * (8 + r() * 12); gem(ctx, x, y, 2.6 + r() * 1.4, kinds[i % 4], t, i * 1.3 + side); }
  };

  // ---- walls of packed gold
  function goldEdge(seed, side, w, h) {
    const r = K.rand(seed), B = [];
    for (let y = -20; y < h + 30; y += 26 + r() * 30) B.push([y, 4 + r() * 12, 9 + r() * 14]);
    const f = yy => { let d = 31; for (const [yc, A, sg] of B) d += A * Math.exp(-(((yy - yc) / sg) ** 2)); return Math.min(50, d + Math.sin(yy * 0.42) * 1.2 + Math.sin(yy * 0.17 + seed) * 1.5); };
    return yy => side < 0 ? f(yy) : w - f(yy);
  }
  function goldWall(ctx, edge, side, w, h, t, rim) {
    const X = k => side < 0 ? k : w - k;
    ownWall(ctx, w, h, side, edge, K.lg(ctx, X(0), 0, X(50), 0, ['#3e1e0c', '#8a5418', '#d49a34']), () => {
      const r = K.rand(side < 0 ? 171 : 179);
      // banks of coins, row on row: each lies tilted with its rim showing (shadow, face, lit lip) — batched per row
      for (let y = -4, row = 0; y < h + 6; y += 3.4, row++) {
        const xs = []; for (let k = 0; k < 11; k++) xs.push([X(k * 5.2 + (row % 2) * 2.6 + (r() - 0.5) * 1.6), (r() - 0.5) * 0.5, r()]);
        ctx.fillStyle = GOLD.deep; ctx.beginPath(); for (const [x, a] of xs) { ctx.moveTo(x + 3, y + 1); ctx.ellipse(x, y + 1, 3, 1.6, a, 0, TAU); } ctx.fill();
        for (const [lo, hi, c] of [[0, 0.55, GOLD.mid], [0.55, 0.85, GOLD.hi], [0.85, 1, GOLD.lo]]) { ctx.fillStyle = c; ctx.beginPath(); for (const [x, a, q] of xs) if (q >= lo && q < hi) { ctx.moveTo(x + 3, y); ctx.ellipse(x, y, 3, 1.6, a, 0, TAU); } ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,248,200,.8)'; ctx.lineWidth = 0.55; ctx.beginPath(); for (const [x, a] of xs) { ctx.moveTo(x - 2.3, y - 0.4); ctx.ellipse(x, y, 2.5, 1.2, a, 3.4, 5.9); } ctx.stroke();
      }
      // depth: the bank darkens back into the cave wall, with dark rock showing through in places
      ctx.fillStyle = K.lg(ctx, X(0), 0, X(34), 0, ['rgba(36,14,30,.85)', 'rgba(36,14,30,.4)', 'rgba(36,14,30,0)']); ctx.fillRect(Math.min(X(0), X(40)), 0, 40, h);
      // gems set in among the coins
      const kinds = ['ruby', 'sapph', 'emer', 'amet'];
      for (let i = 0; i < 7; i++) { const y = r() * h, x = edge(y) + side * (5 + r() * 14); gem(ctx, x, y, 2.6 + r() * 1.6, kinds[i % 4], t, i * 1.3 + side); }
      for (let i = 0; i < 6; i++) { const y = r() * h, x = edge(y) + side * (2 + r() * 10); twinkle(ctx, x, y, 3, Math.max(0, Math.sin(t * 1.7 + i * 2.3 + side)) ** 8 * 0.9); }
    }, rim);
  }
  // a leaning stack of coins with its milled edges showing
  function coinStack(ctx, x, y, n, lean = 0) {
    const rx = 5.2, th = 2.1;
    for (let i = 0; i < n; i++) {
      const cx = x + lean * i * 0.6 + Math.sin(i * 2.7) * 0.5, cy = y - i * th;
      ctx.fillStyle = K.lg(ctx, cx - rx, 0, cx + rx, 0, ['#fff2b0', '#f0b838', '#b8721a', '#7a4410']); ctx.fillRect(cx - rx, cy - th, rx * 2, th);
      ctx.fillStyle = 'rgba(90,46,8,.6)'; ctx.fillRect(cx - rx, cy - 0.5, rx * 2, 0.5);
      ell(ctx, cx, cy, rx, 1.6, '#c07a1a', 0); ell(ctx, cx, cy - 0.2, rx, 1.6, 'rgba(0,0,0,0)', 0);
    }
    const tx = x + lean * (n - 1) * 0.6, ty = y - n * th;
    ell(ctx, tx, ty, rx, 2, K.lg(ctx, tx - rx, ty - 2, tx + rx, ty + 2, [GOLD.lit, GOLD.hi, GOLD.mid]));
    ctx.strokeStyle = GOLD.lo; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(tx, ty, rx * 0.7, 1.3, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,240,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(tx, ty, rx, 2, 0, 3.4, 5.4); ctx.stroke();
  }
  function gemCluster(ctx, x, y, t, seed) {
    const r = K.rand(seed), kinds = ['ruby', 'sapph', 'emer', 'amet'];
    K.glow(ctx, x, y, 22, [255, 160, 200], 0.2);
    for (let k = 0; k < 5; k++) gem(ctx, x + (r() - 0.5) * 14, y + (r() - 0.5) * 12, 3.4 + r() * 2.4, kinds[(k + seed) % 4], t, k * 1.7 + seed);
  }
  // coins dribbling over a ledge's lip
  function spill(ctx, x, y, t, n = 5, seed = 1) {
    const r = K.rand(seed);
    for (let k = 0; k < n; k++) {
      const q = mod(t * 0.35 + k / n, 1), cy = y + q * q * 26, cx = x + (r() - 0.5) * 6, f = Math.cos(t * 6 + k * 2);
      ctx.globalAlpha = 1 - q; ell(ctx, cx, cy, 2.6, 2.6 * Math.max(0.25, Math.abs(f)), f > 0 ? GOLD.hi : GOLD.mid); ctx.globalAlpha = 1;
    }
    for (let k = 0; k < 3; k++) ell(ctx, x + (k - 1) * 3.5, y + 1 + k % 2, 2.8, 1.4, k % 2 ? GOLD.hi : GOLD.mid, 0.3);
  }

  // ---- the chest: a real one or a mimic. x,y = bottom centre, face = 1 opens toward +x. open 0..1 (lid angle), tell 0..1
  function chest(ctx, x, y, face, open, tell, t, mimic, tongue = 0, sc = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(face * sc, sc); ctx.lineJoin = 'round';
    const W2 = 17, BH = 17, LH = 10, hingeX = -W2, hingeY = -BH;
    const WOOD = mimic ? ['#c0603c', '#8a3424', '#4e1a12'] : ['#c88a4a', '#8e5428', '#4e2a12'];
    K.shadow(ctx, 0, 1, W2 + 6, 3, 0.5);
    // mouth interior (behind the lid)
    const ang = -open * (mimic ? 1.15 : 1.9);
    if (open > 0.01) {
      ctx.fillStyle = mimic ? K.rg(ctx, 0, -BH, 22, ['#a01838', '#5a0820', '#2a0410']) : K.rg(ctx, 0, -BH, 22, ['#ffe9a0', '#d89a30', '#6a3a10']);
      ctx.beginPath(); ctx.moveTo(-W2, -BH); ctx.lineTo(W2, -BH);
      const lx = hingeX + Math.cos(ang) * W2 * 2, ly = hingeY + Math.sin(ang) * W2 * 2;
      ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill();
    }
    // the body
    ctx.fillStyle = K.lg(ctx, 0, -BH, 0, 0, WOOD); ctx.beginPath(); ctx.roundRect(-W2, -BH, W2 * 2, BH, 2); ctx.fill();
    ctx.strokeStyle = mimic ? '#3e120c' : '#3e200c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,12,6,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-W2, -BH * 0.5); ctx.lineTo(W2, -BH * 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,180,.3)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-W2, -BH * 0.5 + 1); ctx.lineTo(W2, -BH * 0.5 + 1); ctx.stroke();
    for (const bx of [-11, 11]) {
      ctx.fillStyle = K.lg(ctx, bx - 2, 0, bx + 2, 0, [GOLD.lit, GOLD.mid, GOLD.lo]); ctx.fillRect(bx - 2, -BH, 4, BH);
      ell(ctx, bx, -BH * 0.3, 0.8, 0.8, GOLD.lit); ell(ctx, bx, -BH * 0.75, 0.8, 0.8, GOLD.lit);
    }
    // lock plate with keyhole
    ctx.fillStyle = K.lg(ctx, 0, -BH, 0, -BH + 9, [GOLD.lit, GOLD.mid, GOLD.lo]); ctx.beginPath(); ctx.roundRect(-3.5, -BH - 1, 7, 9, 1.5); ctx.fill();
    ctx.strokeStyle = GOLD.deep; ctx.lineWidth = 0.6; ctx.stroke();
    ell(ctx, 0, -BH + 3, 1.2, 1.2, '#2a1006'); ctx.fillStyle = '#2a1006'; ctx.fillRect(-0.6, -BH + 3, 1.2, 3);
    // mimic teeth on the lower rim (peek through even when shut)
    if (mimic) {
      const tn = 6;
      for (let i = 0; i < tn; i++) {
        const tx = -W2 + 3 + i * (W2 * 2 - 6) / (tn - 1), th = 3.2 + (i % 2) * 1.2;
        ctx.fillStyle = K.lg(ctx, 0, -BH - th, 0, -BH, ['#fffaf0', '#e8d8b8']);
        ctx.beginPath(); ctx.moveTo(tx - 1.8, -BH + 0.5); ctx.lineTo(tx, -BH - th); ctx.lineTo(tx + 1.8, -BH + 0.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(150,120,90,.7)'; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
    // the eyes in the dark mouth (mimic)
    if (mimic && open > 0.04) { K.eyes(ctx, -3, -BH - 7 * Math.min(1, open * 2), 5.2, 3.2 * Math.min(1, open * 3), '#ff4a3a', 0.8, 1); }
    // the tongue lashing out
    if (mimic && tongue > 0.01) {
      const len = 108 / sc * tongue, pts = walk(4, -BH - 4, 0.12 + Math.sin(t * 9) * 0.1, len, 0.0015, -0.03, 0.06, t * 16, 22), T = tube(pts, 11, 6);
      K.danger(ctx, 4 + len * 0.6, -BH, 34, 0.3);
      T.path(ctx); ctx.fillStyle = K.lg(ctx, 0, -BH - 10, 0, -BH + 6, ['#ffa8c8', '#e8407a', '#9a1a4a']); ctx.fill();
      ctx.strokeStyle = 'rgba(140,20,60,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); pts.forEach(([px, py], i) => i < T.n - 1 && (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,235,245,.75)'; ctx.lineWidth = 1; ctx.beginPath(); T.L.forEach((p2, i) => i > 1 && i < T.n - 2 && (i > 2 ? ctx.lineTo(p2[0], p2[1] + 1.2) : ctx.moveTo(p2[0], p2[1] + 1.2))); ctx.stroke();
      for (let i = 3; i < T.n - 1; i += 2) { const [px, py] = pts[i], [nx, ny, wd] = T.N[i]; ell(ctx, px + nx * wd * 0.35, py + ny * wd * 0.35, 0.7, 0.7, 'rgba(255,200,220,.85)'); }
      T.path(ctx); ctx.strokeStyle = '#7a1238'; ctx.lineWidth = 0.9; ctx.stroke();
      { const [ex2, ey2] = pts[T.n]; ball(ctx, ex2, ey2, 4.2, ['#ffc0d8', '#ec4a84', '#9a1a4a'], '#7a1238', 0.6); }
    }
    // the lid, hinged at the back corner
    ctx.save(); ctx.translate(hingeX, hingeY); ctx.rotate(ang);
    const lid = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -LH * 0.4); ctx.quadraticCurveTo(0, -LH, W2 * 0.4, -LH); ctx.lineTo(W2 * 1.6, -LH); ctx.quadraticCurveTo(W2 * 2, -LH, W2 * 2, -LH * 0.4); ctx.lineTo(W2 * 2, 0); ctx.closePath(); };
    lid(); ctx.fillStyle = K.lg(ctx, 0, -LH, 0, 0, [lift2(WOOD[0]), WOOD[1], WOOD[2]]); ctx.fill();
    ctx.strokeStyle = mimic ? '#3e120c' : '#3e200c'; ctx.lineWidth = 1; ctx.stroke();
    for (const bx of [W2 - 11, W2 + 11]) { ctx.fillStyle = K.lg(ctx, bx - 2, 0, bx + 2, 0, [GOLD.lit, GOLD.mid, GOLD.lo]); ctx.fillRect(bx - 2, -LH + 0.5, 4, LH - 0.5); }
    ctx.strokeStyle = 'rgba(255,240,210,.55)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(2, -LH * 0.5); ctx.quadraticCurveTo(2, -LH + 1.5, W2 * 0.5, -LH + 1.5); ctx.lineTo(W2 * 1.5, -LH + 1.5); ctx.stroke();
    if (mimic) {
      // upper teeth hanging from the lid's rim, and drool strands through the tell
      const tn = 6;
      for (let i = 0; i < tn; i++) {
        const tx = 3 + i * (W2 * 2 - 6) / (tn - 1), th = 3.4 + ((i + 1) % 2) * 1.4;
        ctx.fillStyle = K.lg(ctx, 0, 0, 0, th, ['#e8d8b8', '#fffaf0']);
        ctx.beginPath(); ctx.moveTo(tx - 1.8, -0.5); ctx.lineTo(tx, th); ctx.lineTo(tx + 1.8, -0.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(150,120,90,.7)'; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
    ctx.restore();
    // drool dripping from the lip
    if (mimic && tell > 0.02) {
      for (const [dx, ph] of [[8, 0], [-6, 0.45]]) {
        const q = mod(t * 0.9 + ph, 1), len = 3 + q * 12;
        ctx.strokeStyle = `rgba(200,255,220,${0.75 * tell})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(dx, -BH + 1); ctx.quadraticCurveTo(dx + 0.5, -BH + len * 0.6, dx, -BH + len); ctx.stroke();
        ell(ctx, dx, -BH + len + 1.3, 1.5 * tell, 1.9 * tell, `rgba(210,255,225,${0.8 * tell})`);
        ell(ctx, dx - 0.4, -BH + len + 0.8, 0.5, 0.5, 'rgba(255,255,255,.9)');
      }
    }
    ctx.restore();
  }
  function lift2(hex) { return hex === '#c0603c' ? '#e88a5e' : '#ecb070'; }

  // ---- Cursed Skull: ivory cartoon skull in a battered tricorn, trailing green fire
  function skull(ctx, x, y, s, t, chatter, flare, face) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.lineJoin = 'round';
    // fire licking up behind it
    curseFlame(ctx, -4, -6, 16, t, 0.3, 0.9); curseFlame(ctx, 5, -8, 12, t, 1.7, 0.8);
    // jaw (chattering)
    const jy = 7 + chatter * 2.2;
    ctx.fillStyle = K.lg(ctx, 0, jy - 2, 0, jy + 7, ['#fff4dc', '#d8c29a', '#9a8460']);
    ctx.beginPath(); ctx.moveTo(-8, jy - 1); ctx.quadraticCurveTo(-8.5, jy + 6.5, 0, jy + 7); ctx.quadraticCurveTo(8.5, jy + 6.5, 8, jy - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a6444'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(122,100,68,.8)'; ctx.lineWidth = 0.7; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 2.6, jy - 0.5); ctx.lineTo(k * 2.6, jy + 2.5); ctx.stroke(); }
    // cranium
    const cr = () => { ctx.beginPath(); ctx.moveTo(-9, 8); ctx.bezierCurveTo(-15, 4, -14, -13, 0, -13); ctx.bezierCurveTo(14, -13, 15, 4, 9, 8); ctx.quadraticCurveTo(0, 10.5, -9, 8); ctx.closePath(); };
    cr(); ctx.fillStyle = K.rg(ctx, -4, -7, 20, ['#fffaf0', '#efe0c0', '#b8a07a']); ctx.fill();
    ctx.save(); cr(); ctx.clip();
    // green underglow, a crack (line pair), cheek shading
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, 0, 10, 14, [rgb(CURSE, 0.45), rgb(CURSE, 0)]); ctx.fillRect(-15, -2, 30, 14); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(120,96,60,.8)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(4, -8); ctx.lineTo(7, -5); ctx.lineTo(5, -2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(6.8, -12); ctx.lineTo(4.8, -8); ctx.lineTo(7.8, -5); ctx.stroke();
    ctx.restore();
    cr(); ctx.strokeStyle = '#8a7250'; ctx.lineWidth = 1; ctx.stroke();
    K.sheen(ctx, -1, -4, 12, 0.55, 3.4, 4.6);
    // sockets with green glow and the cartoon eyes
    for (const d of [-1, 1]) { ell(ctx, d * 5, -1.5, 4.6, 4.2, '#2a1a20', d * 0.15); }
    K.glow(ctx, 0, -1.5, 14, CURSE, 0.35 + flare * 0.4);
    K.eyes(ctx, 0.3, -1.4, 5, 3.1, flare > 0.3 ? '#b8ff5a' : '#5dff9e', 0.5, 0.6 + flare * 0.4);
    // nose
    ctx.fillStyle = '#3a2228'; ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(-1.6, 5.6); ctx.lineTo(1.6, 5.6); ctx.closePath(); ctx.fill();
    // upper teeth
    for (let k = -2; k <= 2; k++) { ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect(k * 2.6 - 1.2, 6.2, 2.4, 2.6, 0.6); ctx.fill(); ctx.strokeStyle = 'rgba(122,100,68,.7)'; ctx.lineWidth = 0.5; ctx.stroke(); }
    // tricorn hat, worn at a jaunty angle
    ctx.save(); ctx.translate(-1, -11); ctx.rotate(-0.18);
    ctx.fillStyle = K.lg(ctx, 0, -9, 0, 3, ['#7a3a5a', '#4a1a36', '#2a0c1e']);
    ctx.beginPath(); ctx.moveTo(-17, 1); ctx.quadraticCurveTo(-12, -2, -8, -8); ctx.quadraticCurveTo(0, -12, 8, -8); ctx.quadraticCurveTo(12, -2, 17, 1); ctx.quadraticCurveTo(0, -3, -17, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-17, 1); ctx.quadraticCurveTo(0, -3, 17, 1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -7.5); ctx.quadraticCurveTo(0, -11, 7, -8); ctx.stroke();
    ell(ctx, 0, -5, 2, 2, '#ffd860'); ell(ctx, -0.5, -5.5, 0.7, 0.7, '#fff8d0');
    ctx.restore();
    ctx.restore();
  }

  PV.sections['vault'] = (ctx, w, h, t) => {
    K.shaft(ctx, w, h, t, VAULT, { inset: -70 });
    const sh = { L: goldEdge(11, -1, w, h), R: goldEdge(23, 1, w, h) };
    goldWall(ctx, sh.L, -1, w, h, t, [[0, [255, 220, 120]], [0.42, [140, 255, 180]], [0.56, [255, 220, 120]], [0.8, [140, 255, 180]], [1, [255, 220, 120]]]);
    goldWall(ctx, sh.R, 1, w, h, t, [[0, [255, 220, 120]], [0.55, [255, 220, 120]], [0.68, [140, 255, 180]], [1, [255, 220, 120]]]);
    // things set into the banks, varied down the height
    gemCluster(ctx, sh.L(46) + 6, 46, t, 1); gemCluster(ctx, sh.R(352) - 6, 352, t, 2);
    for (const [side, y, ns] of [[-1, 196, [7, 11, 5]], [1, 150, [9, 6]], [-1, 470, [12, 8, 10]], [1, 446, [6, 10]]]) ns.forEach((n, k) => { const ex = side < 0 ? sh.L(y) : sh.R(y); coinStack(ctx, ex - side * (k * 9 - 4), y + (k % 2) * 3, n, -side * 0.4 * (k - 1)); });
    { const y = 340, ex = sh.L(y); chest(ctx, ex + 4, y, 1, 0.35, 0, t, false, 0, 0.85); heap(ctx, ex - 8, ex + 18, y - 13, 6, 331, t); spill(ctx, ex + 16, y + 1, t, 4, 3); }
    // small treasure ledges with heaps, a goblet, a crown, a pearl string, a curse-fire brazier
    { const L = vLedge(ctx, sh, -1, 140, 26); heap(ctx, L.ex - 4, L.tip - 2, 138, 9, 301, t); spill(ctx, L.tip - 2, 141, t, 4, 5);
      // goblet on the heap
      const gx = L.ex + 14, gy = 130;
      ctx.fillStyle = K.lg(ctx, gx - 5, 0, gx + 5, 0, [GOLD.lit, GOLD.hi, GOLD.lo]);
      ctx.beginPath(); ctx.moveTo(gx - 5, gy - 12); ctx.quadraticCurveTo(gx - 5, gy - 4, gx - 1, gy - 3); ctx.lineTo(gx - 1, gy + 1); ctx.lineTo(gx - 4, gy + 3); ctx.lineTo(gx + 4, gy + 3); ctx.lineTo(gx + 1, gy + 1); ctx.lineTo(gx + 1, gy - 3); ctx.quadraticCurveTo(gx + 5, gy - 4, gx + 5, gy - 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = GOLD.deep; ctx.lineWidth = 0.7; ctx.stroke(); ell(ctx, gx, gy - 12, 5, 1.4, '#7a1a2a'); gem(ctx, gx, gy - 7, 1.6, 'emer', t, 2); }
    { const L = vLedge(ctx, sh, 1, 226, 24); heap(ctx, L.tip + 2, L.ex + 4, 224, 8, 302, t); spill(ctx, L.tip + 3, 227, t, 4, 6);
      // a crown tipped on the heap
      ctx.save(); ctx.translate(L.ex - 12, 214); ctx.rotate(0.25);
      ctx.fillStyle = K.lg(ctx, 0, -7, 0, 3, [GOLD.lit, GOLD.hi, GOLD.lo]);
      ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-7, -4); ctx.lineTo(-4, -1); ctx.lineTo(0, -7); ctx.lineTo(4, -1); ctx.lineTo(7, -4); ctx.lineTo(7, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = GOLD.deep; ctx.lineWidth = 0.7; ctx.stroke(); gem(ctx, 0, 0.5, 1.6, 'ruby', t, 4);
      for (const px of [-7, 0, 7]) ell(ctx, px, px ? -4.5 : -7.5, 1, 1, '#fff8ee'); ctx.restore(); }
    { const L = vLedge(ctx, sh, -1, 418, 28); heap(ctx, L.ex - 4, L.tip - 2, 416, 10, 303, t); spill(ctx, L.tip - 2, 419, t, 4, 7);
      // brazier of curse fire
      const bx = L.ex + 16, by = 406;
      ctx.fillStyle = K.lg(ctx, bx - 6, 0, bx + 6, 0, ['#9aa2b8', '#4a5068', '#22263a']); ctx.beginPath(); ctx.moveTo(bx - 7, by - 5); ctx.lineTo(bx + 7, by - 5); ctx.lineTo(bx + 4, by + 2); ctx.lineTo(bx - 4, by + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1e2232'; ctx.lineWidth = 0.8; ctx.stroke(); curseFlame(ctx, bx, by - 5, 14, t, 0.4); }
    // pearl string draped over the right wall
    { const y0 = 384, ex = sh.R(y0); ctx.save();
      for (let k = 0; k < 9; k++) { const q = k / 8, px = ex + 2 - q * 18, py = y0 + Math.sin(q * Math.PI) * 12; ball(ctx, px, py, 1.7, ['#ffffff', '#efe6f0', '#b8a8c0'], 'rgba(140,120,150,.7)', 0.7); }
      ctx.restore(); }

    // ---- Coin Avalanche: a heap on a high ledge trembles, sheds coins, then pours down in a column
    {
      const u = mod(t + 0.3, 4), y = 78, L = vLedge(ctx, sh, 1, y, 86, 12);
      const tell = bump(u, 0.9, 1.1, 1.85, 1.95), pouring = u >= 1.9 && u < 3.1;
      const fill = u < 1.9 ? 1 : u < 3.1 ? 1 - 0.65 * seg(u, 1.9, 3.1) : 0.35 + 0.65 * ease(seg(u, 3.3, 4));
      const jig = tell * Math.sin(t * 60) * 1.2;
      const lipX = L.tip + 12;
      // the column of coins (behind the heap's front)
      const g = 1500;
      const pourA = bump(u, 1.9, 2.1, 3.1, 3.6);
      for (const dy of [90, 200, 320]) K.danger(ctx, lipX, y + dy, 46, 0.26 * pourA);
      if (pouring || u < 3.8) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (u > 1.95 && u < 3.5) {
          const head = Math.min(h, y + 0.5 * g * (u - 1.9) ** 2), tail = u < 3.1 ? y : y + 0.5 * g * (u - 3.1) ** 2;
          ctx.fillStyle = K.lg(ctx, lipX - 26, 0, lipX + 26, 0, ['rgba(255,200,80,0)', 'rgba(255,214,110,.32)', 'rgba(255,240,170,.42)', 'rgba(255,214,110,.32)', 'rgba(255,200,80,0)']);
          ctx.beginPath(); ctx.moveTo(lipX - 12, tail); ctx.lineTo(lipX + 12, tail); ctx.lineTo(lipX + 12 + (head - y) * 0.06, head); ctx.lineTo(lipX - 12 - (head - y) * 0.06, head); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        for (let i = 0; i < 140; i++) {
          const s0 = 1.9 + i * 0.0086, r = K.rand(500 + i), dt = u - s0;
          if (dt < 0 || s0 > 3.1) continue;
          const cy = y + 2 + 0.5 * g * dt * dt * (0.85 + r() * 0.3), cx = lipX + (r() - 0.5) * 20 + dt * (r() - 0.5) * 70;
          if (cy > h + 8) continue;
          const rx = 2.8 + r() * 2, flip = Math.cos(t * (10 + r() * 10) + i * 1.7), ry = rx * Math.max(0.18, Math.abs(flip)), a = i * 0.5 + t * 3;
          ell(ctx, cx + 0.5, cy + 0.6, rx, ry, GOLD.deep, a); ell(ctx, cx, cy, rx, ry, flip > 0 ? GOLD.hi : GOLD.mid, a);
          if (Math.abs(flip) > 0.5) { ell(ctx, cx, cy, rx * 0.6, ry * 0.6, flip > 0 ? GOLD.mid : GOLD.lo, a); ell(ctx, cx - rx * 0.3, cy - ry * 0.35, rx * 0.3, ry * 0.18, GOLD.lit, a); }
          if (i % 9 === 0) twinkle(ctx, cx, cy, 4, 0.8);
        }
        // a burst of coins kicked up off the lip as it lets go
        if (u > 1.9 && u < 2.5) { const q = seg(u, 1.9, 2.5), rr = K.rand(9); for (let k = 0; k < 10; k++) { const vx = (rr() - 0.5) * 70, vy = -40 - rr() * 50; ell(ctx, lipX + vx * q, y - 6 + vy * q + 300 * q * q, 2.6, 2.6 * Math.abs(Math.cos(t * 12 + k)) + 0.4, GOLD.hi); } }
      }
      // a few coins tipping off the lip through the tell
      if (tell > 0.05) for (let k = 0; k < 3; k++) {
        const q = mod(u * 1.6 + k / 3, 1), cy = y + q * q * 90, cx = lipX - 4 + k * 4;
        ell(ctx, cx, cy, 2.8, 2.8 * Math.abs(Math.cos(t * 12 + k)) + 0.4, GOLD.hi);
      }
      heap(ctx, L.tip - 4, L.ex + 6, y - 1, 34 * fill, 311, t, jig);
      // a chest buried in the top of the heap, a sword hilt sticking out
      ctx.save(); ctx.translate(L.ex - 18, y - 29 * fill + jig); ctx.rotate(-0.15);
      ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -16); ctx.stroke();
      ctx.fillStyle = GOLD.hi; ctx.fillRect(-14, -18, 9, 2.4); ell(ctx, -11.5, -21, 1.6, 1.6, '#ff3a5a');
      ctx.restore();
      if (u > 3.3) for (let k = 0; k < 4; k++) twinkle(ctx, lerp(L.tip, L.ex, 0.2 + k * 0.2), y - 20 * fill + Math.sin(k * 3) * 4, 3, Math.sin((u - 3.3) / 0.7 * Math.PI) * 0.9, CURSE);
      // tremble lines
      if (tell > 0.1) { ctx.strokeStyle = `rgba(255,230,160,${tell * 0.7})`; ctx.lineWidth = 1; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(L.tip - 8 + d * 2, y - 26 - 4); ctx.lineTo(L.tip - 8 + d * 5, y - 26 - 10); ctx.stroke(); } }
    }

    // ---- Mimic Chest on the left ledge, a real chest on the right one
    {
      const u = mod(t - 0.4, 4), y = 252, L = vLedge(ctx, sh, -1, y, 54, 11);
      const tell = bump(u, 1.1, 1.35, 2.0, 2.1);
      const open = u < 1.1 ? 0.02 * Math.max(0, Math.sin(t * 3)) : u < 2.0 ? 0.18 * tell : u < 2.2 ? lerp(0.18, 1, ease(seg(u, 2.0, 2.2))) : u < 3.2 ? 1 : 1 - ease(seg(u, 3.2, 3.6));
      const tongue = u < 2.08 ? 0 : u < 2.35 ? ease(seg(u, 2.08, 2.35)) : u < 2.9 ? 1 : 1 - ease(seg(u, 2.9, 3.25));
      K.danger(ctx, L.ex + 24, y - 10, 34, 0.15 + 0.25 * tell);
      chest(ctx, L.ex + 26, y - 1.5, 1, open, Math.max(tell, open > 0.3 ? 1 : 0), t, true, tongue, 1.3);
    }
    {
      const y = 300, L = vLedge(ctx, sh, 1, y, 48, 11), cx = L.ex - 24;
      K.glow(ctx, cx, y - 20, 34, [255, 210, 100], 0.35);
      chest(ctx, cx, y - 1.5, -1, 0.5, 0, t, false, 0, 1.15);
      heap(ctx, cx - 17, cx + 17, y - 19, 11, 321, t);
      // pearls and a gem spilling over the front
      for (let k = 0; k < 6; k++) ball(ctx, cx - 10 + k * 3.4, y - 16 + Math.sin(k / 5 * Math.PI) * 6, 1.4, ['#ffffff', '#efe6f0', '#b8a8c0'], 'rgba(140,120,150,.7)', 0.7);
      gem(ctx, cx + 4, y - 26, 2.8, 'sapph', t, 3); gem(ctx, cx - 6, y - 24, 2.4, 'ruby', t, 5);
      for (let k = 0; k < 3; k++) twinkle(ctx, cx - 10 + k * 10, y - 28 - k * 3, 3.4, Math.max(0, Math.sin(t * 2 + k * 2)) ** 6);
    }

    // ---- Cursed Skull circling a floating ruby
    {
      const u = mod(t, 4), cx = 104, cy = 340, R = 34, om = TAU / 2.6, a0 = 1.18;
      const bob = Math.sin(t * 2) * 2;
      // the trigger ring
      const ringFlash = bump(u, 2.6, 2.75, 2.95, 3.1);
      ctx.save(); ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 12; ctx.strokeStyle = rgb(CURSE, 0.28 + 0.5 * ringFlash); ctx.lineWidth = 1.2 + ringFlash;
      ctx.beginPath(); ctx.ellipse(cx, cy + bob, R, R * 0.9, 0, 0, TAU); ctx.stroke(); ctx.restore();
      // the ruby
      K.glow(ctx, cx, cy + bob, 26, [255, 80, 110], 0.4);
      ctx.save(); ctx.translate(cx, cy + bob);
      ctx.fillStyle = K.lg(ctx, -9, -9, 9, 9, ['#ffd0dc', '#ff3a62', '#8a0a2e']);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, -4); ctx.lineTo(0, 12); ctx.lineTo(-9, -4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6a0622'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,230,.75)'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(4, -4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.moveTo(-4, -4); ctx.lineTo(0, 12); ctx.lineTo(4, -4); ctx.stroke();
      ell(ctx, -3.6, -6, 1.6, 0.8, '#fff', -0.6);
      ctx.restore();
      twinkle(ctx, cx - 3, cy - 7 + bob, 5, 0.5 + 0.5 * Math.sin(t * 3));
      // where the skull is
      const ang = a0 + om * Math.min(u, 2.6);
      const base = (a) => [cx + Math.cos(a) * R, cy + bob + Math.sin(a) * R * 0.9];
      let [sx, sy] = base(ang);
      const lunge = u < 3.0 ? 0 : u < 3.3 ? ease(seg(u, 3.0, 3.3)) : 1 - ease(seg(u, 3.3, 4.0));
      const dx = Math.cos(a0), dy = Math.sin(a0);
      sx += dx * lunge * 30; sy += dy * lunge * 30;
      // green fire trail behind it along the ring
      if (u < 2.6) for (let k = 7; k >= 1; k--) {
        const [px, py] = base(ang - k * 0.16);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = K.rg(ctx, px, py, 11 - k, [rgb(CURSE, 0.5 * (1 - k / 8)), rgb(CURSE, 0)]); ctx.beginPath(); ctx.arc(px, py, 11 - k, 0, TAU); ctx.fill();
        ctx.restore();
      }
      if (lunge > 0.05) for (let k = 1; k <= 4; k++) { const px = sx - dx * k * 7 * lunge, py = sy - dy * k * 7 * lunge; K.glow(ctx, px, py, 10 - k, CURSE, 0.4 * lunge); }
      K.danger(ctx, sx, sy, 26, 0.3 + 0.2 * ringFlash);
      const chatter = u > 2.55 && u < 3.3 ? Math.abs(Math.sin(t * 40)) : 0.15 * Math.abs(Math.sin(t * 4));
      const face = u < 2.6 ? (Math.cos(ang + Math.PI / 2) > 0 ? 1 : -1) : (dx > 0 ? 1 : -1);
      skull(ctx, sx, sy, 1.05, t, chatter, Math.max(ringFlash, lunge), face);
    }
    for (const [x, y, ph] of [[150, 150, 0], [160, 172, 0.7], [170, 194, 1.4], [196, 410, 2]]) coin(ctx, x, y, t, ph);
    K.motes(ctx, w, h, t, 'dust', [255, 230, 150], 22, 4);
    K.motes(ctx, w, h, t, 'spore', CURSE, 7, 8);
    const su = mod(t, 4), dodge = bump(su, 2.9, 3.2, 3.4, 3.8);
    K.rocket(ctx, w * 0.5 + 24 * dodge, h * 0.8, 0.75, t);
    ctx.fillStyle = K.rg(ctx, w / 2, h * 0.45, h * 0.62, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(20,6,24,.35)']); ctx.fillRect(0, 0, w, h);
  };

  // ================================================================= CASCADE FALLS (outdoors, daylight)
  const MOSS = ['#c8f080', '#7cc35a', '#3e8a3a'], ORCHID = ['#ffe0ec', '#ff8fb1', '#d8487a'];
  // stacked mossy boulder-slabs make the cliff walls (own walls, no cave look). Returns edge(y).
  function slabs(seed, side, w, h, inset) {
    const r = K.rand(seed), out = []; let y = -24;
    while (y < h + 30) { const big = r() < 0.22, hh = big ? 50 + r() * 26 : 16 + r() * r() * 46; out.push({ y0: y, y1: y + hh, x: inset + (r() - 0.45) * 18 + (big ? 12 : 0), ph: r() * 9, big }); y += hh - 3; }
    const edge = yy => { const b = out.find(o => yy >= o.y0 && yy < o.y1) || out[out.length - 1]; return side < 0 ? b.x : w - b.x; };
    return { blocks: out, edge };
  }
  function cliffWall(ctx, S, side, w, h, cols, t) {
    const { blocks } = S;
    // dark backing rock behind the slabs
    ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? 40 : w - 40, 0, [cols.deep, cols.dark]);
    ctx.fillRect(side < 0 ? 0 : w - 44, 0, 44, h);
    // overhanging boulders cast a soft shadow down the stones under them
    blocks.forEach(b => { if (!b.big) return; const xi = side < 0 ? b.x : w - b.x; ctx.fillStyle = K.rg(ctx, xi + side * 8, b.y1 + 8, 30, ['rgba(6,24,24,.55)', 'rgba(6,24,24,0)']); ctx.fillRect(xi + side * 40, b.y1 - 20, -side * 70, 56); });
    const order = blocks.map((b, i) => [b, i]).sort((a, c) => (a[0].big ? 1 : 0) - (c[0].big ? 1 : 0));
    order.forEach(([b, bi]) => {
      const xi = side < 0 ? b.x : w - b.x, cy = (b.y0 + b.y1) / 2, ry = (b.y1 - b.y0) / 2 + 4, rx = (b.big ? 34 : 18 + ry * 0.5) + (b.ph % 1) * 6, bx = xi + side * rx * 0.94;
      const pts = lumpPts(bx, cy, rx, ry, 900 + bi * 7 + (side > 0 ? 300 : 0), 10, 0.1);
      blob(ctx, pts);
      ctx.fillStyle = K.rg(ctx, xi + side * 4 - 6, cy - ry * 0.55, rx * 1.6, [cols.lit, cols.mid, cols.dark]); ctx.fill();
      ctx.strokeStyle = cols.edge; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.save(); blob(ctx, pts); ctx.clip();
      // a crack as a line pair, wet streaks, a bounce of light on the inner face
      const cx = xi + side * (7 + (b.ph % 1) * 8);
      ctx.strokeStyle = cols.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - ry * 0.6); ctx.lineTo(cx - side * 3, cy); ctx.lineTo(cx + side * 2, cy + ry * 0.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cx + 1, cy - ry * 0.6); ctx.lineTo(cx - side * 3 + 1, cy); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,255,250,.16)'; ctx.lineWidth = 1.3; for (const dx of [5, 11]) { ctx.beginPath(); ctx.moveTo(xi + side * dx, cy - ry * 0.3); ctx.lineTo(xi + side * dx, cy + ry * 0.6); ctx.stroke(); }
      // moss cap over the top of the boulder
      ctx.fillStyle = K.lg(ctx, 0, cy - ry, 0, cy - ry * 0.35, [MOSS[0], MOSS[1], MOSS[2]]);
      ctx.beginPath(); ctx.moveTo(bx - rx * 1.2, cy - ry * 1.2);
      ctx.lineTo(bx + rx * 1.2, cy - ry * 1.2); ctx.lineTo(bx + rx * 1.2, cy - ry * 0.55);
      for (let k = 8; k >= 0; k--) { const x = bx - rx * 1.2 + k * rx * 0.3; ctx.lineTo(x, cy - ry * (0.5 + 0.12 * Math.sin(k * 2.3 + b.ph)) + (k % 2) * 3); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
      blob(ctx, pts); ctx.save(); ctx.clip();
      ctx.strokeStyle = cols.rim; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(bx, cy, rx - 1, ry - 1, 0, side < 0 ? -0.9 : Math.PI - 0.1, side < 0 ? 0.6 : Math.PI + 1.0); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,255,180,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(bx, cy, rx - 1.5, ry - 1.5, 0, -2.3, -0.8); ctx.stroke();
      ctx.restore();
      // moss strands dripping over the inner side
      for (let k = 0; k < 3; k++) {
        const dx = xi - side * (k * 2.2 - 3), y0 = cy - ry * 0.45, l = 6 + ((b.ph * 3 + k * 7) % 10);
        ctx.strokeStyle = k % 2 ? MOSS[1] : MOSS[2]; ctx.lineWidth = 1.8 - k * 0.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(dx, y0); ctx.quadraticCurveTo(dx - side * 1.5, y0 + l * 0.6, dx + Math.sin(t * 1.5 + k + b.ph), y0 + l); ctx.stroke();
      }
    });
  }
  // a fern clump at (x, y) arching toward dir (+1 right, -1 left)
  function fern(ctx, x, y, dir, s, t, ph = 0) {
    for (let f = 0; f < 4; f++) {
      const a0 = -1.9 + f * 0.42, sway = Math.sin(t * 1.3 + ph + f) * 0.05, L = s * (0.75 + 0.25 * Math.sin(f * 2.1 + 1));
      const pts = walk(x, y, dir > 0 ? a0 + 1.1 + sway : Math.PI - a0 - 1.1 - sway, L, 0, dir * 0.06, 0, 0, 10);
      ctx.strokeStyle = '#2e6a2a'; ctx.lineWidth = 1.2; poly(ctx, pts); ctx.stroke();
      for (let i = 1; i < pts.length - 1; i++) {
        const [px, py, a] = pts[i], ll = (1 - i / pts.length) * s * 0.28 + 1.5;
        for (const sd of [-1, 1]) {
          const la = a + sd * 1.1;
          ctx.fillStyle = sd > 0 ? '#5aa844' : '#8ad064';
          ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + Math.cos(la - sd * 0.4) * ll * 0.6, py + Math.sin(la - sd * 0.4) * ll * 0.6, px + Math.cos(la) * ll, py + Math.sin(la) * ll);
          ctx.quadraticCurveTo(px + Math.cos(la + sd * 0.5) * ll * 0.5, py + Math.sin(la + sd * 0.5) * ll * 0.5, px, py); ctx.fill();
        }
      }
    }
  }
  function orchid(ctx, x, y, s, t, ph = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.2 + ph) * 0.1); ctx.scale(s, s);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * TAU - Math.PI / 2;
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, -6, [ORCHID[2], ORCHID[1], ORCHID[0]]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-3, -3, 0, -6); ctx.quadraticCurveTo(3, -3, 0, 0); ctx.fill(); ctx.restore();
    }
    ell(ctx, 0, 0.5, 1.8, 1.6, '#ffd84a'); ell(ctx, -0.5, 0, 0.6, 0.6, '#fff8d0');
    ctx.restore();
  }
  // a little side fall spilling off a slab corner
  function sideFall(ctx, x, y, len, t, wd = 3) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(220,250,255,.75)'; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y + len * 0.3, x + 1.5, y + len); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 110;
    ctx.beginPath(); ctx.moveTo(x - 0.5, y); ctx.quadraticCurveTo(x + 0.5, y + len * 0.3, x + 1, y + len); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    for (let k = 0; k < 3; k++) { const q = mod(t * 2 + k / 3, 1); ell(ctx, x + 1.5 + (k - 1) * q * 6, y + len - q * 4, 1.6 * (1 - q) + 0.4, 1.4 * (1 - q) + 0.4, 'rgba(255,255,255,.8)'); }
    puff(ctx, x + 1.5, y + len, 6, [235, 252, 255], 0.35, 7);
  }
  function rainbow(ctx, cx, cy, r, a) {
    ctx.save();
    const C = [[255, 90, 90], [255, 170, 70], [255, 240, 90], [110, 230, 110], [90, 170, 255], [170, 110, 255]];
    C.forEach((c, i) => { ctx.strokeStyle = rgb(c, a); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(cx, cy, r - i * 3, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
    ctx.restore();
  }
  // a log: length L, centred, rotated a; bark, furrows, a knot, a branch stub, moss, ringed cut ends
  function log(ctx, x, y, a, L, t) {
    const R = 7.5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(-L / 2, -R, L, R * 2, 4);
    ctx.fillStyle = K.lg(ctx, 0, -R, 0, R, [[0, '#d8a066'], [0.3, '#a8693a'], [0.75, '#6e3e1c'], [1, '#4a2610']]); ctx.fill();
    ctx.strokeStyle = '#3e200c'; ctx.lineWidth = 1; ctx.stroke();
    // bark furrows as line pairs
    for (const [fy, x0, x1] of [[-3.5, -L / 2 + 6, L / 2 - 14], [0.5, -L / 2 + 12, L / 2 - 6], [4, -L / 2 + 4, L / 2 - 20]]) {
      ctx.strokeStyle = 'rgba(60,28,10,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, fy); ctx.bezierCurveTo(x0 + 10, fy - 1, x1 - 10, fy + 1, x1, fy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,214,160,.35)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x0, fy - 1); ctx.bezierCurveTo(x0 + 10, fy - 2, x1 - 10, fy, x1, fy - 1); ctx.stroke();
    }
    // knot
    ell(ctx, 4, 1, 3, 2.2, '#5a3014'); ell(ctx, 4, 1, 1.6, 1.1, '#2e1608'); ctx.strokeStyle = 'rgba(255,214,160,.4)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(4, 1, 3, 2.2, 0, 3.4, 5.4); ctx.stroke();
    // branch stub with a leaf
    ctx.fillStyle = K.lg(ctx, -8, -R - 6, -4, -R, ['#c08a54', '#6e3e1c']); ctx.beginPath(); ctx.moveTo(-10, -R + 1); ctx.lineTo(-12, -R - 6); ctx.lineTo(-7, -R - 7); ctx.lineTo(-5, -R + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3e200c'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#7cc35a'; ctx.beginPath(); ctx.moveTo(-7, -R - 7); ctx.quadraticCurveTo(-2, -R - 14, 3, -R - 10); ctx.quadraticCurveTo(-2, -R - 8, -7, -R - 7); ctx.fill();
    // moss on top
    for (let k = 0; k < 4; k++) { ctx.fillStyle = K.rg(ctx, L / 2 - 16 + k * 3, -R, 4, MOSS); ctx.beginPath(); ctx.arc(L / 2 - 18 + k * 3.4, -R + 1, 2.6, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,240,210,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-L / 2 + 5, -R + 1.8); ctx.lineTo(L / 2 - 22, -R + 1.8); ctx.stroke();
    // cut end with rings
    ctx.fillStyle = K.rg(ctx, L / 2 - 1, -1, R + 1, ['#ffe2b0', '#e0b070', '#a8703c']); ctx.beginPath(); ctx.ellipse(L / 2, 0, 3.4, R, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6e3e1c'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(150,90,40,.7)'; ctx.lineWidth = 0.5; for (const k of [0.35, 0.65]) { ctx.beginPath(); ctx.ellipse(L / 2, 0, 3.4 * k, R * k, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  // a flying fish facing +x (dir flips), wings spread by `wing`
  function flyfish(ctx, x, y, a, s, wing, t, ph) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.lineJoin = 'round';
    // tail fork, wagging
    ctx.save(); ctx.translate(-10, 0); ctx.rotate(Math.sin(t * 30 + ph) * 0.25);
    ctx.fillStyle = K.lg(ctx, 0, -7, 0, 7, ['#9ad0ff', '#3a6ad0', '#9ad0ff']); ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(-4, -3, -9, -8); ctx.quadraticCurveTo(-6, 0, -9, 8); ctx.quadraticCurveTo(-4, 3, 2, 0); ctx.fill();
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
    // far wing
    const wingShape = (sd, k) => { ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(-2, sd * 10 * k, -10, sd * 13 * k); ctx.quadraticCurveTo(-6, sd * 5 * k, -4, sd * 1); ctx.closePath(); };
    wingShape(-1, wing * 0.8); ctx.fillStyle = 'rgba(255,143,177,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,60,110,.6)'; ctx.lineWidth = 0.7; ctx.stroke();
    // body: blue back, silver belly
    const body = () => { ctx.beginPath(); ctx.moveTo(12, 0.5); ctx.bezierCurveTo(10, -5.5, -4, -6, -11, -1.5); ctx.lineTo(-11, 1.5); ctx.bezierCurveTo(-4, 5.5, 9, 5, 12, 0.5); ctx.closePath(); };
    body(); ctx.fillStyle = K.lg(ctx, 0, -6, 0, 5, [[0, '#6ab0ff'], [0.4, '#2e62c8'], [0.55, '#d8ecff'], [1, '#ffffff']]); ctx.fill();
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, -3); ctx.quadraticCurveTo(0, -5, -7, -2.6); ctx.stroke();
    // near wing with ribs
    wingShape(1, wing); ctx.fillStyle = K.lg(ctx, 0, 0, -8, 12, ['rgba(255,220,235,.95)', 'rgba(255,143,177,.85)']); ctx.fill(); ctx.strokeStyle = '#c83a72'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,60,110,.6)'; ctx.lineWidth = 0.5; for (const k of [0.4, 0.7, 1]) { ctx.beginPath(); ctx.moveTo(2, 0.5); ctx.lineTo(-10 * k, 12 * wing * k + 1); ctx.stroke(); }
    // eye and mouth
    ell(ctx, 7, -1.2, 2.6, 2.7, '#ffffff'); ell(ctx, 7.6, -1, 1.6, 1.7, '#1a0d14'); ell(ctx, 7, -1.8, 0.6, 0.6, '#fff');
    ctx.strokeStyle = 'rgba(30,20,60,.9)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5, -4.2); ctx.lineTo(9.4, -3.2); ctx.stroke();
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(12, 0.8); ctx.lineTo(10, 1.4); ctx.stroke();
    ctx.restore();
  }
  // a rock basin with a pool on a slab's inner face (side), top at y; returns the pool centre
  function basin(ctx, edge, side, y, len, t, churn) {
    const ex = edge(y), d = -side, tip = ex + d * len;
    ctx.beginPath(); ctx.moveTo(ex - d * 4, y - 3); ctx.lineTo(tip, y - 3); ctx.quadraticCurveTo(tip + d * 3, y + 2, tip - d * 2, y + 7); ctx.quadraticCurveTo(ex + d * len * 0.5, y + 14, ex - d * 4, y + 18); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 3, 0, y + 16, ['#8ab8a8', '#4a7a72', '#25484a']); ctx.fill();
    ctx.strokeStyle = '#1e3a3a'; ctx.lineWidth = 1; ctx.stroke();
    for (let k = 0; k < 4; k++) { ctx.fillStyle = K.rg(ctx, tip - d * (4 + k * 6), y - 4, 4, MOSS); ctx.beginPath(); ctx.arc(tip - d * (3 + k * 6), y - 3, 3, 0, TAU); ctx.fill(); }
    const cx = (ex + tip) / 2 - d * 1, rx = len * 0.38;
    ell(ctx, cx, y - 2.6, rx + 1.5, 3.2, '#1e4a4a');
    ell(ctx, cx, y - 2.8, rx, 2.4, K.lg(ctx, 0, y - 5, 0, y, ['#c8fbff', '#4ac0d0']));
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8;
    for (let k = 0; k < 2 + churn * 3; k++) { const q = mod(t * (0.9 + churn * 2) + k / (2 + churn * 3), 1); ctx.globalAlpha = (1 - q) * (0.5 + churn * 0.5); ctx.beginPath(); ctx.ellipse(cx + Math.sin(k * 2.3) * rx * 0.3, y - 2.8, 1.5 + q * rx * 0.7, 0.6 + q * 1.8, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    return { cx, y: y - 3, tip, ex };
  }

  const CAS = { lit: '#7ab4a4', mid: '#3e766c', dark: '#1e4644', deep: '#0c2424', edge: '#102e2e', rim: 'rgba(255,248,200,.9)' };
  const CASL = Object.assign({}, CAS, { lit: '#6aa49a', rim: 'rgba(190,250,255,.75)' });
  PV.sections['cascade'] = (ctx, w, h, t) => {
    // sky above a deep green gorge; the great fall pours from a notch far off at the top
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [[0, '#54bce8'], [0.25, '#9ee0f0'], [0.5, '#7cc4bc'], [1, '#4c968e']]); ctx.fillRect(0, 0, w, h);
    K.glow(ctx, 40, 10, 110, [255, 252, 220], 0.45);
    // distant clouds
    for (const [x, y, s2] of [[60, 26, 1], [200, 14, 0.8]]) { for (let k = 0; k < 4; k++) puff(ctx, x + k * 14 * s2, y + Math.sin(k * 2) * 3, 12 * s2, [255, 255, 255], 0.7, 300 + k + x); }
    // the gorge: far cliff walls closing in, layered teal-green, with jungle along their rims
    const layers = [[[104, 170, 160], 0.55, 11], [[74, 136, 128], 0.75, 23]];
    for (const [c, k, sd] of layers) {
      const rr = K.rand(sd), notchL = 62 - k * 26, notchR = 104 + k * 26, top = 50 + k * 40;
      ctx.fillStyle = K.lg(ctx, 0, top, 0, h, [rgb(lift(c, 12)), rgb(c), rgb(lift(c, -22))]);
      for (const [x0, x1, nx] of [[-10, notchL, notchL], [notchR, w + 10, notchR]]) {
        ctx.beginPath(); ctx.moveTo(x0, h + 5); ctx.lineTo(x0, top - 20 * k);
        for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, top - 20 * k + Math.abs(x - nx) * -0.08 + rr() * 8);
        const dn = nx === notchL ? 1 : -1; ctx.lineTo(nx, top + 30); ctx.bezierCurveTo(nx + dn * 10, top + 140, nx - dn * 6, h * 0.7, nx + dn * 14, h + 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgb(lift(c, 30), 0.6); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(nx, top + 30); ctx.bezierCurveTo(nx + dn * 10, top + 140, nx - dn * 6, h * 0.7, nx + dn * 14, h + 5); ctx.stroke();
        // jungle canopy along the rim
        for (let x = x0 + 4; x < x1; x += 11) { ctx.fillStyle = rgb(lift(c, -18 - rr() * 10)); ctx.beginPath(); ctx.arc(x, top - 20 * k + 2 + rr() * 6, 7 + rr() * 6, 0, TAU); ctx.fill(); }
        // strata
        ctx.strokeStyle = rgb(lift(c, 22), 0.5); ctx.lineWidth = 1;
        for (let j = 0; j < 7; j++) { const y = top + 30 + j * 55 + rr() * 10; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y + 6); ctx.stroke(); }
        // hanging vines
        ctx.strokeStyle = rgb(lift(c, -26), 0.8); ctx.lineWidth = 1.2;
        for (let j = 0; j < 4; j++) { const x = lerp(x0, x1, 0.15 + j * 0.22), l = 30 + rr() * 50, y0 = top - 20 * k + 6; ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + 3, y0 + l * 0.5, x + Math.sin(t + j) * 2, y0 + l); ctx.stroke(); }
      }
      // the great fall in the notch, then haze
      if (k < 0.6) {
        ctx.fillStyle = K.lg(ctx, notchL, 0, notchR, 0, ['rgba(210,245,250,.7)', 'rgba(255,255,255,.92)', 'rgba(210,245,250,.7)']);
        ctx.beginPath(); ctx.moveTo(notchL + 12, top + 10); ctx.lineTo(notchR - 12, top + 10); ctx.lineTo(notchR + 2, h); ctx.lineTo(notchL - 2, h); ctx.closePath(); ctx.fill();
        for (let j = 0; j < 3; j++) puff(ctx, (notchL + notchR) / 2 + (j - 1) * 10, top + 14, 9, [255, 255, 255], 0.6, 400 + j);
        ctx.save(); ctx.strokeStyle = 'rgba(150,215,225,.6)'; ctx.lineWidth = 1.2; ctx.setLineDash([12, 18]);
        for (let j = 0; j < 4; j++) { const x = notchL + 16 + j * 4; ctx.lineDashOffset = -t * (60 + (j % 3) * 10) - j * 9; ctx.beginPath(); ctx.moveTo(x, top + 10); ctx.lineTo(x + (x - 83) * 0.5, h); ctx.stroke(); }
        ctx.restore();
      }
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(190,240,240,.18)', 'rgba(190,240,240,.05)', 'rgba(220,250,250,.3)']); ctx.fillRect(0, 0, w, h);
    }
    // mist banks low down with a rainbow over them
    for (let k = 0; k < 6; k++) puff(ctx, 30 + k * 45, h * 0.9 + Math.sin(t * 0.5 + k) * 4, 30, [240, 255, 255], 0.4, 200 + k);
    rainbow(ctx, w * 0.5, h * 1.12, 210, 0.22);
    // sunbeams slanting from the top left
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, wd, a] of [[10, 26, 0.12], [64, 16, 0.09], [116, 30, 0.07]]) { ctx.fillStyle = K.lg(ctx, x, 0, x + 160, h, [rgb([255, 250, 210], a), rgb([255, 250, 210], 0)]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + wd, 0); ctx.lineTo(x + wd + 180, h); ctx.lineTo(x + 180, h); ctx.closePath(); ctx.fill(); }
    ctx.restore();

    // the walls: mossy slabs
    const inset = 33, SL = slabs(31, -1, w, h, inset), SR = slabs(47, 1, w, h, inset);
    cliffWall(ctx, SL, -1, w, h, CASL, t); cliffWall(ctx, SR, 1, w, h, CAS, t);
    const L = SL.edge, R = SR.edge;
    // side falls, ferns, orchids
    const top = (S, y) => { const b = S.blocks.find(o => y >= o.y0 && y < o.y1); return (b.y0 + b.y1) / 2 - ((b.y1 - b.y0) / 2 + 4) * 0.5; };
    sideFall(ctx, R(118) - 2, top(SR, 118) + 6, 44, t);
    sideFall(ctx, L(400) + 2, top(SL, 400) + 6, 56, t + 0.4, 2.6);
    for (const [side, y, ph] of [[-1, 96, 0], [1, 236, 1], [-1, 240, 2], [1, 420, 3], [-1, 460, 4]]) {
      const ex = side < 0 ? L(y) : R(y);
      fern(ctx, ex + side * 3, top(side < 0 ? SL : SR, y) + 2, -side, 20, t, ph);
    }
    for (const [side, y, ph] of [[-1, 130, 0], [1, 70, 1], [1, 340, 2], [-1, 350, 3]]) {
      const ex = side < 0 ? L(y) : R(y);
      ctx.strokeStyle = '#3e8a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex + side * 2, y); ctx.quadraticCurveTo(ex - side * 6, y - 4, ex - side * 9, y - 9); ctx.stroke();
      orchid(ctx, ex - side * 9, y - 10, 1.1, t, ph); orchid(ctx, ex - side * 3, y - 14, 0.85, t, ph + 1);
    }
    // roots snaking down over the stones, and vines with leaves hanging off the overhangs
    for (const [S, side] of [[SL, -1], [SR, 1]]) S.blocks.forEach((b, i) => {
      const xi = side < 0 ? b.x : w - b.x, cy = (b.y0 + b.y1) / 2;
      if (i % 4 === 1) {
        for (let k = 0; k < 2; k++) {
          const x0 = xi + side * (10 - k * 6), y0 = cy - (b.y1 - b.y0) * 0.35, l = 26 + k * 12;
          const P = [[x0, y0], [x0 - side * 5, y0 + l * 0.3], [x0 + side * 1, y0 + l * 0.6], [x0 - side * 4, y0 + l]];
          for (const [lw, c] of [[3.2 - k, '#4a2e16'], [1.8 - k * 0.5, '#9a6a3a']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...P[0]); ctx.bezierCurveTo(...P[1], ...P[2], ...P[3]); ctx.stroke(); }
          ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(P[2][0], P[2][1]); ctx.lineTo(P[2][0] - side * 6, P[2][1] + 5); ctx.stroke();
        }
      }
      if (b.big) {
        for (let k = 0; k < 3; k++) {
          const x0 = xi - side * (k * 4 - 2), y0 = b.y1 - 6 - k * 3, l = 34 + k * 16, sw = Math.sin(t * 1.1 + i + k) * 4;
          const pts = []; for (let j = 0; j <= 10; j++) { const q = j / 10; pts.push([x0 - side * q * 5 + sw * q * q, y0 + q * l]); }
          ctx.strokeStyle = '#2e6a2a'; ctx.lineWidth = 1.3; poly(ctx, pts); ctx.stroke();
          for (let j = 2; j <= 10; j += 2) { const [px, py] = pts[j], d = j % 4 ? 1 : -1; ctx.save(); ctx.translate(px, py); ctx.rotate(d * 0.7 + sw * 0.03); ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#a8e070', '#4e9a3e']); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 5, -4, d * 7, 0); ctx.quadraticCurveTo(d * 5, 3, 0, 0); ctx.fill(); ctx.restore(); }
        }
      }
    });

    // ---- Downpour Chute: the main fall, surging on a cycle
    const cu = mod(t, 4), cx = 150, lipY = 34;
    const swell = bump(cu, 1.2, 1.7, 2.0, 2.2), front = cu >= 2.0 ? (cu - 2.0) * 520 : -1, surgeF = 1 - smooth(2.9, 3.9, cu);
    const hw = y => { const base = 30 + (y - lipY) * 0.02; const behind = front > 0 && y < lipY + front ? 0.28 * surgeF : 0; const nose = front > 0 ? Math.exp(-((y - lipY - front) ** 2) / 300) * 0.25 * surgeF : 0; return base * (1 + swell * 0.08 + behind + nose); };
    // the shelf it pours from
    {
      const x0 = 96, y = lipY;
      ctx.beginPath(); ctx.moveTo(w + 5, -5); ctx.lineTo(x0 + 6, -5); ctx.quadraticCurveTo(x0 - 4, y - 14, x0, y); ctx.lineTo(w + 5, y + 4); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, 0, -5, 0, y + 4, ['#2e5a58', '#5e9488', '#a8d0c4']); ctx.fill(); ctx.strokeStyle = '#1e4040'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,215,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(w, y + 4); ctx.stroke();
      // strata and cracks as line pairs, wet drips under the lip
      for (const [yy, xa, xb] of [[8, x0 + 20, w], [18, x0 + 8, w - 20], [26, x0 + 30, w]]) {
        ctx.strokeStyle = 'rgba(16,46,46,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xa, yy); ctx.bezierCurveTo(xa + 30, yy - 2, xb - 40, yy + 3, xb, yy + 1); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,240,230,.3)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(xa, yy - 1.2); ctx.bezierCurveTo(xa + 30, yy - 3.2, xb - 40, yy + 1.8, xb, yy - 0.2); ctx.stroke();
      }
      for (const dx of [104, 196, 214, 232]) { const q = mod(t * 0.8 + dx * 0.13, 1); ell(ctx, dx, y + 4 + q * q * 20, 1.2, 1.6, `rgba(220,250,255,${0.8 * (1 - q)})`); }
      fern(ctx, 222, 0, -1, 18, t, 5); orchid(ctx, 206, 8, 1, t, 2);
      for (let k = 0; k < 9; k++) { const mx = x0 + 4 + k * 8; if (mx > cx - 34 && mx < cx + 34) continue; ctx.fillStyle = K.rg(ctx, mx - 1, y - 2, 5, MOSS); ctx.beginPath(); ctx.arc(mx, y + 1 + k * 0.4, 3.6, 0, TAU); ctx.fill(); }
    }
    {
      const top = lipY - 2, yy = []; for (let y = top; y <= h + 6; y += 7) yy.push(y);
      const edgeX = (y, sd, k = 1, ph = 0) => cx + sd * (hw(y) * k + Math.sin(y * 0.09 - t * 14 + sd + ph) * 2 + Math.sin(y * 0.23 - t * 21 + ph) * 1.2);
      const sheet = (c0, c1, ph) => { ctx.beginPath(); yy.forEach((y, i) => { const x = cx + hw(y) * c0 + Math.sin(y * 0.07 - t * 9 + ph) * 2.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); for (let i = yy.length - 1; i >= 0; i--) { const y = yy[i]; ctx.lineTo(cx + hw(y) * c1 + Math.sin(y * 0.08 - t * 11 + ph + 2) * 2.5, y); } ctx.closePath(); };
      const body = () => { ctx.beginPath(); yy.forEach((y, i) => i ? ctx.lineTo(edgeX(y, -1), y) : ctx.moveTo(edgeX(y, -1), y)); for (let i = yy.length - 1; i >= 0; i--) ctx.lineTo(edgeX(yy[i], 1), yy[i]); ctx.closePath(); };
      // depth: a deep teal body, darker at the sides
      body(); ctx.fillStyle = K.lg(ctx, cx - 40, 0, cx + 40, 0, [[0, 'rgba(18,96,128,.92)'], [0.25, 'rgba(46,150,184,.85)'], [0.5, 'rgba(80,184,210,.8)'], [0.75, 'rgba(46,150,184,.85)'], [1, 'rgba(18,96,128,.92)']]); ctx.fill();
      ctx.save(); body(); ctx.clip();
      // translucent sheets sliding over each other
      for (const [c0, c1, ph, a] of [[-0.95, -0.2, 0, 0.55], [-0.45, 0.42, 1.7, 0.6], [0.15, 0.95, 3.1, 0.5]]) {
        sheet(c0, c1, ph); ctx.fillStyle = K.lg(ctx, cx + hw(200) * c0, 0, cx + hw(200) * c1, 0, [`rgba(150,225,240,${a * 0.6})`, `rgba(235,252,255,${a})`, `rgba(150,225,240,${a * 0.6})`]); ctx.fill();
      }
      // streaks of varied speed and weight
      ctx.lineCap = 'round';
      for (let k = 0; k < 18; k++) {
        const fx = ((k * 7) % 18 / 17 - 0.5) * 1.75, sp = 170 + ((k * 53) % 7) * 42, white = k % 3 !== 1;
        ctx.strokeStyle = white ? `rgba(255,255,255,${0.55 + (k % 4) * 0.1})` : 'rgba(30,120,160,.45)'; ctx.lineWidth = white ? 0.9 + (k % 4) * 0.5 : 1.2;
        ctx.setLineDash([8 + (k % 5) * 7, 10 + (k % 3) * 9]); ctx.lineDashOffset = -t * sp - k * 17;
        ctx.beginPath(); yy.forEach((y, i) => { const x = cx + fx * hw(y) * 0.92 + Math.sin(y * 0.05 + k) * 1.2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      }
      ctx.setLineDash([]);
      // a glossy highlight down the left of centre
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); yy.forEach((y, i) => { const x = cx - hw(y) * 0.35 + Math.sin(y * 0.04 - t * 2) * 1.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      // foam ridges bowing downward as the water rushes (how the push reads)
      for (let k = 0; k < 6; k++) {
        const y = lipY + mod(t * 210 + k * 76, h + 40) - 10, hwy = hw(y), a = 0.55 * (1 - (y - lipY) / (h * 1.4));
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(cx - hwy * 0.9, y - 6); ctx.quadraticCurveTo(cx, y + 8, cx + hwy * 0.9, y - 6); ctx.stroke();
        for (let j = 0; j < 4; j++) { const q = (j + 0.5) / 4, px = cx + (q - 0.5) * hwy * 1.6, py = y - 6 + 14 * q * (1 - q) * 2 * 1; ell(ctx, px, py, 2.6, 1.6, `rgba(255,255,255,${a * 0.9})`); }
      }
      // the surge front: a bulging white wall of foam racing down
      if (front > 0 && surgeF > 0.05) { const fy = lipY + front; ctx.fillStyle = K.lg(ctx, 0, fy - 36, 0, fy + 8, ['rgba(255,255,255,0)', `rgba(255,255,255,${0.85 * surgeF})`, 'rgba(255,255,255,0)']); ctx.fillRect(0, fy - 36, w, 44); }
      ctx.restore();
      // foamy edges: lumps of white riding down both sides
      for (const sd of [-1, 1]) {
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3.5; ctx.beginPath(); yy.forEach((y, i) => { const x = edgeX(y, sd) - sd * 1.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath();
        for (let k = 0; k < 11; k++) { const y = lipY + mod(k * 43 + t * (150 + (k % 3) * 40) + sd * 13, h), x = edgeX(y, sd) - sd * 2, n = 2 + (k % 3); for (let j = 0; j < n; j++) { const rr = 1.6 + ((k + j) % 3) * 0.9, ox = -sd * j * 1.8 + (j % 2) * sd * 1.5, oy = j * 2.6 - 3; ctx.moveTo(x + ox + rr, y + oy); ctx.arc(x + ox, y + oy, rr, 0, 6.283); } }
        ctx.fill();
      }
      // the glossy lip rolling over the edge, dark under-lip, foam bursting where it breaks
      {
        const lw2 = hw(lipY) + 4;
        ctx.fillStyle = K.lg(ctx, 0, lipY - 10, 0, lipY + 10, ['#9ae0ee', '#3ea8c8', '#1a7898']);
        ctx.beginPath(); ctx.moveTo(cx - lw2, lipY + 8); ctx.quadraticCurveTo(cx - lw2, lipY - 8, cx, lipY - 9); ctx.quadraticCurveTo(cx + lw2, lipY - 8, cx + lw2, lipY + 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - lw2 * 0.8, lipY - 2); ctx.quadraticCurveTo(cx - lw2 * 0.5, lipY - 7.5, cx + lw2 * 0.1, lipY - 7.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + lw2 * 0.3, lipY - 7); ctx.quadraticCurveTo(cx + lw2 * 0.7, lipY - 6, cx + lw2 * 0.85, lipY - 1); ctx.stroke();
        for (let k = 0; k < 8; k++) { const fx = cx - lw2 + 4 + k * (lw2 * 2 - 8) / 7, fr = 4 + Math.sin(t * 9 + k) * 1.2 + swell * 2.5; ball(ctx, fx, lipY + 8 + (k % 2) * 2, fr, ['#ffffff', '#ecfbff', '#a8dcea'], 'rgba(120,200,225,.2)', 0.3); }
      }
      // spray and mist where it strikes: side spray up the column, a big cloud at the foot
      for (let k = 0; k < 6; k++) { const y = 80 + k * 70, q = mod(t * 0.6 + k * 0.3, 1); for (const sd of [-1, 1]) puff(ctx, edgeX(y, sd) + sd * (5 + q * 8), y - q * 12, 8 + q * 6, [250, 255, 255], 0.36 * (1 - q * 0.6), 220 + k); }
      for (let k = 0; k < 4; k++) { const q = mod(t * 0.5 + k * 0.25, 1); puff(ctx, cx + (k - 1.5) * 18, h - 6 - q * 26, 18 + q * 12, [250, 255, 255], 0.55 * (1 - q), 260 + k); }
      if (front > 0 && surgeF > 0.05) for (const sd of [-1, 1]) puff(ctx, edgeX(lipY + front, sd) + sd * 10, lipY + front - 8, 14, [255, 255, 255], 0.6 * surgeF, 280);
    }

    // ---- Tumbling Log: teeters on the shelf, tips, falls, bounces off the boulder, tumbles away
    {
      const u = mod(t + 1.2, 4), Lg = 46;
      const b = SL.blocks.find(o => 170 >= o.y0 && 170 < o.y1);
      // the boulder outcrop it bounces off
      const ox = L(170) + 18, oy = 176;
      blob(ctx, lumpPts(ox, oy, 22, 15, 77, 9, 0.12)); ctx.fillStyle = K.rg(ctx, ox - 8, oy - 8, 28, [CAS.lit, CAS.mid, CAS.dark]); ctx.fill(); ctx.strokeStyle = CAS.edge; ctx.lineWidth = 1; ctx.stroke();
      for (let k = 0; k < 5; k++) { ctx.fillStyle = K.rg(ctx, ox - 14 + k * 7, oy - 14, 5, MOSS); ctx.beginPath(); ctx.arc(ox - 14 + k * 7, oy - 12 + Math.abs(k - 2) * 1.5, 4, 0, TAU); ctx.fill(); }
      K.sheen(ctx, ox, oy, 18, 0.3);
      let x, y, a;
      const x0 = 110, y0 = lipY - 7;
      if (u < 1.5) { const rock = u < 1.0 ? Math.sin(t * 5) * 0.06 : Math.sin(t * 22) * 0.12 + seg(u, 1.0, 1.5) * 0.3; x = x0; y = y0; a = -0.05 + rock; }
      else if (u < 2.0) { const q = u - 1.5; x = x0 - q * 64; y = y0 + 500 * q * q; a = 0.25 + q * 5; }
      else { const q = u - 2.0; x = x0 - 32 + q * 80; y = y0 + 125 - 170 * q + 500 * q * q; a = 2.75 - q * 9; }
      if (u > 3.6) { x = x0; y = lerp(y0 - 30, y0, ease(seg(u, 3.6, 4))); a = -0.05; }
      const showLog = !(u > 3.15 && u < 3.6);
      if (u > 1.98 && u < 2.4) { const q = seg(u, 1.98, 2.4); puff(ctx, ox + 10, oy - 14, 8 + q * 10, [210, 230, 200], 0.55 * (1 - q), 61); const rr = K.rand(9); for (let k = 0; k < 5; k++) ell(ctx, ox + (rr() - 0.3) * 30 * q, oy - 16 - q * 16 * rr() + q * q * 30, 1.6, 1.2, '#6e3e1c'); }
      if (showLog && y < h + 30) {
        if (u > 1.5) K.danger(ctx, x, y, 36, 0.3);
        if (u > 1.5 && u < 3.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; for (const d of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(x + d, y - 14); ctx.lineTo(x + d, y - 34); ctx.stroke(); } ctx.restore(); }
        log(ctx, x, y, a, Lg, t);
        if (u > 1.0 && u < 1.5) for (let k = 0; k < 3; k++) { const q = mod(t * 3 + k / 3, 1); ell(ctx, x - 20 + k * 6, y + 8 + q * 20, 1.4, 1.8, `rgba(255,255,255,${0.8 * (1 - q)})`); }
      }
    }

    // ---- Flying Fish: a school leaps from the right-hand pool in an arc to the left-hand pool
    {
      const u = mod(t + 0.4, 4);
      const P0 = basin(ctx, R, 1, 292, 34, t, bump(u, 1.3, 1.6, 2.0, 2.3));
      const P1 = basin(ctx, L, -1, 312, 34, t, bump(u, 2.7, 2.9, 3.4, 3.8));
      // fins circling in the pool through the tell
      const tell = bump(u, 1.2, 1.5, 1.95, 2.05);
      if (tell > 0.05) for (let k = 0; k < 3; k++) { const a2 = t * 5 + k * 2.1, fx = P0.cx + Math.cos(a2) * 8, fy = P0.y + Math.sin(a2) * 1.2; ctx.fillStyle = `rgba(60,110,210,${tell})`; ctx.beginPath(); ctx.moveTo(fx - 2.5, fy); ctx.lineTo(fx, fy - 5); ctx.lineTo(fx + 1.5, fy); ctx.closePath(); ctx.fill(); }
      for (let i = 0; i < 4; i++) {
        const q = (u - 2.0 - i * 0.12) / 0.8;
        if (q < 0 || q > 1) continue;
        const sx = lerp(P0.cx, P1.cx, q), sy = lerp(P0.y, P1.y, q) - Math.sin(q * Math.PI) * (80 + i * 8) + i * 2;
        const vx = P1.cx - P0.cx, vy = (P1.y - P0.y) - Math.cos(q * Math.PI) * Math.PI * (80 + i * 8);
        const a = Math.atan2(vy, vx);
        K.danger(ctx, sx, sy, 18, 0.25);
        // facing left: mirror by flipping the angle
        ctx.save(); ctx.translate(sx, sy); ctx.scale(-1, 1); flyfish(ctx, 0, 0, Math.PI - a, 1.35, 0.8 + 0.2 * Math.sin(t * 20 + i), t, i); ctx.restore();
        // droplets trailing
        for (let k = 1; k <= 3; k++) { const qq = q - k * 0.03; if (qq < 0) continue; const tx = lerp(P0.cx, P1.cx, qq), ty = lerp(P0.y, P1.y, qq) - Math.sin(qq * Math.PI) * (80 + i * 8) + i * 2; ell(ctx, tx, ty + 3, 1.1, 1.4, 'rgba(255,255,255,.75)'); }
      }
      // splashes: leaving and landing
      for (const [P, u0] of [[P0, 2.0], [P1, 2.8]]) { const q = seg(u, u0, u0 + 0.6); if (q > 0 && q < 1) { for (let k = 0; k < 6; k++) { const ang = Math.PI * (1.15 + k * 0.14), d = q * 14; ell(ctx, P.cx + Math.cos(ang) * d, P.y + Math.sin(ang) * d * 1.4 + q * q * 16, 1.6, 2, `rgba(255,255,255,${0.9 * (1 - q)})`); } } }
    }

    for (const [x, y, ph] of [[70, 214, 0], [72, 238, 0.6], [74, 262, 1.2], [210, 380, 1.8]]) coin(ctx, x, y, t, ph);
    K.motes(ctx, w, h, t, 'snow', [235, 252, 255], 14, 12);
    // the rocket keeps to the dry left lane
    K.rocket(ctx, 70 + Math.sin(t * 1.3) * 5, h * 0.8, 0.75, t);
  };

  // ================================================================= GULL CLIFFS (outdoors, sunset)
  const CH = { top: '#f6dcc4', lit: '#e2c6c4', mid: '#a894b4', dark: '#6e5e8e', deep: '#3e3460', edge: '#54467a', rim: [255, 196, 140] };
  // chalk strata: blocky layers stacked up the wall, each with a lit top shelf. Returns { blocks, edge }
  function strata(seed, side, w, h, inset) {
    const r = K.rand(seed), out = []; let y = -10;
    while (y < h + 30) { const hh = 18 + r() * 20; out.push({ y0: y, y1: y + hh, x: inset + (r() - 0.45) * 22, j: r() * 10 }); y += hh; }
    return { blocks: out, edge: yy => { const b = out.find(o => yy >= o.y0 && yy < o.y1) || out[out.length - 1]; return side < 0 ? b.x : w - b.x; } };
  }
  function chalkWall(ctx, S, side, w, h, t, gust) {
    ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? 44 : w - 44, 0, [CH.deep, CH.dark]); ctx.fillRect(side < 0 ? 0 : w - 44, 0, 44, h);
    S.blocks.forEach((b, bi) => {
      const xi = side < 0 ? b.x : w - b.x, xo = side < 0 ? -4 : w + 4, d = -side, hh = b.y1 - b.y0, r = K.rand(700 + bi + (side > 0 ? 100 : 0));
      // the block: flat top, a slightly jagged inner face, rounded lower corner
      const P = [[xo, b.y0], [xi - d * 3, b.y0], [xi, b.y0 + 3]];
      for (let k = 1; k < 4; k++) P.push([xi + d * (r() - 0.5) * 3, b.y0 + hh * k / 4]);
      P.push([xi - d * 2, b.y1], [xo, b.y1]);
      poly(ctx, P); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, xi, 0, xi + side * 30, 0, [CH.mid, CH.dark]); ctx.fill();
      ctx.strokeStyle = CH.edge; ctx.lineWidth = 1; ctx.stroke();
      // a band of lighter chalk mid-block and a flint row (dark nodules with a lit lip)
      ctx.save(); poly(ctx, P); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(240,220,230,.12)'; ctx.fillRect(Math.min(xi, xo), b.y0 + hh * 0.35, 60, hh * 0.25);
      if (bi % 3 === 0) for (let k = 0; k < 2; k++) { const fx = xi + side * (10 + k * 11 + r() * 4), fy = b.y0 + hh * (0.55 + r() * 0.2); ell(ctx, fx, fy, 2.6, 1.5, '#4e447e', r() - 0.5); ell(ctx, fx - 0.6, fy - 0.5, 1.3, 0.5, 'rgba(210,200,250,.55)'); }
      // vertical crack, drawn as a line pair
      const cx = xi + side * (8 + b.j);
      ctx.strokeStyle = CH.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, b.y0 + 2); ctx.lineTo(cx - side * 2, b.y0 + hh * 0.5); ctx.lineTo(cx + side, b.y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,220,.25)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cx + 1, b.y0 + 2); ctx.lineTo(cx - side * 2 + 1, b.y0 + hh * 0.5); ctx.stroke();
      ctx.restore();
      // the inner face catches the sunset
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgb(CH.rim, 0.32); ctx.lineWidth = 4; poly(ctx, P.slice(1, 7)); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = rgb(lift(CH.rim, 30), 0.9); ctx.lineWidth = 1.3; poly(ctx, P.slice(1, 7)); ctx.stroke();
      // lit top shelf
      ctx.fillStyle = K.lg(ctx, 0, b.y0 - 1, 0, b.y0 + 3, [CH.top, CH.lit]); ctx.fillRect(Math.min(xi - d * 3, xo), b.y0 - 0.5, Math.abs(xi - d * 3 - xo), 2.6);
      // grass tufts on some shelves, leaning in the gust
      if (bi % 3 !== 1) {
        const n = 6, gx = xi + side * 4;
        for (let k = 0; k < n; k++) {
          const bx2 = gx + side * k * 2.4, l = 6 + ((k * 7 + bi) % 5), lean = (k - n / 2) * 0.12 + gust * 0.6 + Math.sin(t * 2 + k + bi) * 0.08;
          ctx.strokeStyle = k % 2 ? '#8ab05a' : '#5e8a44'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx2, b.y0); ctx.quadraticCurveTo(bx2 + lean * l * 0.4, b.y0 - l * 0.6, bx2 + lean * l, b.y0 - l); ctx.stroke();
          if (k % 2 === 0) { ctx.strokeStyle = 'rgba(255,220,150,.75)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx2 + lean * l * 0.5, b.y0 - l * 0.55); ctx.lineTo(bx2 + lean * l, b.y0 - l); ctx.stroke(); }
        }
      }
    });
  }
  // a nest on a shelf: twig bowl, speckled eggs, maybe a chick
  function nest(ctx, x, y, t, chick) {
    ctx.save(); ctx.translate(x, y);
    if (chick) {
      const bob = Math.sin(t * 3) * 0.8;
      ball(ctx, 0, -6 + bob, 5, ['#ffffff', '#e4dcef', '#a898c0'], '#8a7aa8', 0.5);
      ctx.fillStyle = '#ffc040'; ctx.beginPath(); ctx.moveTo(3.5, -6 + bob); ctx.lineTo(7.5, -5 + bob); ctx.lineTo(3.5, -4 + bob); ctx.closePath(); ctx.fill();
      ell(ctx, 1.6, -7.4 + bob, 1.6, 1.7, '#fff'); ell(ctx, 2, -7.2 + bob, 1, 1.1, '#1a0d14'); ell(ctx, 1.6, -7.8 + bob, 0.4, 0.4, '#fff');
      ctx.strokeStyle = '#d8d0e8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-1, -11 + bob); ctx.quadraticCurveTo(0, -13 + bob, 1, -11 + bob); ctx.stroke();
    } else {
      for (const [ex, c] of [[-3, '#e0f0f4'], [2.5, '#d8e8ee']]) { ell(ctx, ex, -3.5, 2.6, 3.4, K.rg(ctx, ex - 1, -5, 4, ['#ffffff', c, '#9ab4c0'])); ell(ctx, ex + 0.6, -3, 0.5, 0.5, '#5a6a8a'); ell(ctx, ex - 0.8, -2, 0.4, 0.4, '#5a6a8a'); }
    }
    ctx.fillStyle = K.lg(ctx, 0, -4, 0, 2, ['#c89a5a', '#7a5228']); ctx.beginPath(); ctx.ellipse(0, -0.5, 8, 3.6, 0, 0, Math.PI); ctx.lineTo(-8, -2); ctx.quadraticCurveTo(0, 0, 8, -2); ctx.fill();
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 0.6; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-8 + k * 2.6, -1.5); ctx.lineTo(-5 + k * 2.6, 1.6); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,220,160,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-8, -1.8); ctx.quadraticCurveTo(0, 0.4, 8, -1.8); ctx.stroke();
    ctx.restore();
  }
  // the gull. mode: 0 glide/flap, 1 shriek, 2 dive (wings folded). face 1 = facing right
  function gull(ctx, x, y, s, t, mode, face, rot = 0, flap = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * face, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const WG = ['#eef0f8', '#b8c0d8', '#8890b0'], TIP = '#3e4270', ED = '#6a6e98';
    const wing = (near) => {
      const up = mode === 2 ? 0 : flap, k = near ? 1 : 0.8;
      ctx.save(); ctx.translate(near ? -1 : 2, -3);
      if (mode === 2) { ctx.rotate(near ? 0.25 : 0.1); ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(-8, -4, -24, 2); ctx.quadraticCurveTo(-10, 4, 2, 3); ctx.closePath(); }
      else { const ty = -20 * up * k + 6 * (1 - up), tx = -10 * k; ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(2, ty * 0.6 - 2, tx + 2, ty); ctx.quadraticCurveTo(tx - 4, ty + 4, tx - 6, ty + 6); ctx.quadraticCurveTo(-6, ty * 0.3 + 2, -6, 2); ctx.closePath(); }
      ctx.fillStyle = K.lg(ctx, 0, -20, 0, 6, near ? WG : ['#c8cce0', '#9098b8', '#6a7298']); ctx.fill(); ctx.strokeStyle = ED; ctx.lineWidth = 0.9; ctx.stroke();
      // dark tips with white spots
      ctx.save(); ctx.clip();
      if (mode === 2) { ctx.fillStyle = TIP; ctx.fillRect(-26, -6, 9, 12); ell(ctx, -21, 0.5, 1, 0.9, '#fff'); }
      else { const ty = -20 * up * k + 6 * (1 - up), tx = -10 * k; ctx.fillStyle = TIP; ctx.beginPath(); ctx.arc(tx - 2, ty + 2, 7, 0, TAU); ctx.fill(); ell(ctx, tx - 1, ty + 1, 1, 1, '#fff'); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(3, -0.5); ctx.quadraticCurveTo(0, -4, -4, mode === 2 ? -2 : -20 * up * k * 0.5); ctx.stroke();
      ctx.restore();
    };
    wing(false);
    // tail
    ctx.fillStyle = K.lg(ctx, 0, -3, 0, 4, ['#ffffff', '#c8c4dc']); ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-17, -4); ctx.lineTo(-17, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ED; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = TIP; ctx.fillRect(-17, -4, 2.5, 7);
    // body and head
    ctx.fillStyle = K.rg(ctx, 0, -5, 15, ['#ffffff', '#f0eef8', '#b8b0d0']); ctx.beginPath(); ctx.ellipse(-1, 0, 11, 6.6, -0.05, 0, TAU); ctx.fill(); ctx.strokeStyle = ED; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.beginPath(); ctx.arc(9, -4.5, 6, 0, TAU); ctx.fillStyle = K.rg(ctx, 7.5, -7, 8, ['#ffffff', '#f2f0fa', '#c0b8d8']); ctx.fill(); ctx.stroke();
    // warm sunset rim along the belly
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,170,110,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(-1, 0, 10, 5.8, -0.05, 0.3, 2.6); ctx.stroke(); ctx.restore();
    // beak (opens to shriek)
    const op = mode === 1 ? 1 : 0;
    ctx.fillStyle = K.lg(ctx, 14, -6, 14, 0, ['#ffe070', '#f2a020']);
    ctx.beginPath(); ctx.moveTo(13.5, -6); ctx.lineTo(21, -4.6); ctx.quadraticCurveTo(22.5, -3.6, 21, -2.6); ctx.lineTo(14, -3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b06a10'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.save(); ctx.translate(14, -3); ctx.rotate(op * 0.5);
    ctx.fillStyle = '#f2b030'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6.5, 0.4); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ell(ctx, 4.8, 0.9, 0.9, 0.7, '#e83a2a');
    ctx.restore();
    if (op) { ctx.fillStyle = '#a01838'; ctx.beginPath(); ctx.moveTo(14.2, -3); ctx.lineTo(19, -2.7); ctx.lineTo(16, 0.3); ctx.closePath(); ctx.fill(); }
    // the big cartoon eye, angry
    ell(ctx, 10.5, -6, 2.9, 3.1, K.rg(ctx, 10, -7, 4, ['#ffffff', '#ece2d8']));
    ell(ctx, 11.3, -5.8, 1.9, 2, mode ? '#ff9a30' : '#ffcf3a'); ell(ctx, 11.6, -5.7, 1, 1.1, '#1a0d14'); ell(ctx, 10.8, -6.6, 0.5, 0.5, '#fff');
    ctx.strokeStyle = 'rgba(60,40,70,.9)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(7.5, -9.6 + (mode ? 0.6 : 0)); ctx.lineTo(13.5, -8.2 - (mode ? 0 : 0.6)); ctx.stroke();
    // tucked orange feet
    if (mode !== 2) { ctx.strokeStyle = '#f08a30'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-6, 8); ctx.moveTo(0, 6); ctx.lineTo(-3, 8.5); ctx.stroke(); }
    wing(true);
    ctx.restore();
  }
  // chalk sea-cliff profile: angled faces, flat-topped ledges with receding undersides, notches cut back in
  function cliffProfile(seed, side, w, h) {
    const r = K.rand(seed), P = [], ledges = []; let y = -24, d = 36;
    while (y < h + 40) {
      const k = r();
      if (k < 0.3) {
        const jut = 10 + r() * 13, L = 12 + r() * 14;
        P.push([y, d], [y + 2.5, d + jut], [y + 2.5 + L * 0.3, d + jut - 1.5], [y + 2.5 + L, d + jut * 0.25]);
        ledges.push({ y: y + 1.2, d0: d, d1: d + jut }); y += 2.5 + L; d = clamp(d + jut * 0.25 - 2 + r() * 4, 29, 46);
      } else if (k < 0.42) { P.push([y, d], [y + 8, d - 7 - r() * 4], [y + 18, d - 3]); y += 18; d = clamp(d - 2 + r() * 6, 29, 46); }
      else { const L = 18 + r() * 26; P.push([y, d]); y += L; d = clamp(d + (r() - 0.5) * 16, 29, 48); }
    }
    P.push([y, d]);
    const f = yy => { let i = 0; while (i < P.length - 2 && P[i + 1][0] <= yy) i++; const [y0, d0] = P[i], [y1, d1] = P[i + 1]; return lerp(d0, d1, clamp((yy - y0) / Math.max(0.01, y1 - y0), 0, 1)) + Math.sin(yy * 0.9 + seed) * 0.5 + Math.sin(yy * 0.33) * 0.9; };
    return { ledges, edge: yy => side < 0 ? f(yy) : w - f(yy) };
  }
  function thrift(ctx, x, y, t, ph, s = 1) {
    for (let k = 0; k < 3; k++) {
      const sx = x + (k - 1) * 3 * s, l = (6 + k * 2) * s, sw = Math.sin(t * 2 + ph + k) * 0.8, tx = sx + sw + (k - 1) * 1.5, ty = y - l;
      ctx.strokeStyle = '#5e8a44'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx, y); ctx.quadraticCurveTo(sx, y - l * 0.5, tx, ty); ctx.stroke();
      ball(ctx, tx, ty, 2.4 * s, ['#ffe0ec', '#ff7aa8', '#b83a6e'], '#a03060', 0.4);
      ell(ctx, tx - 0.6, ty - 0.8, 0.5, 0.5, 'rgba(255,255,255,.8)');
    }
  }
  function grass(ctx, x, y, dir, n, t, gust, ph, len = 7) {
    for (let k = 0; k < n; k++) {
      const bx = x + dir * k * 2.2, l = len + ((k * 7 + ph) % 5), lean = (k - n / 2) * 0.12 + gust * 0.7 + Math.sin(t * 2 + k + ph) * 0.08;
      ctx.strokeStyle = k % 2 ? '#9ac060' : '#5e8a44'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + lean * l * 0.4, y - l * 0.6, bx + lean * l, y - l); ctx.stroke();
      if (k % 2 === 0) { ctx.strokeStyle = 'rgba(255,214,140,.8)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx + lean * l * 0.5, y - l * 0.55); ctx.lineTo(bx + lean * l, y - l); ctx.stroke(); }
    }
  }
  function chalkCliff(ctx, C, side, w, h, t, gust, rim) {
    const X = k => side < 0 ? k : w - k, edge = C.edge;
    ownWall(ctx, w, h, side, edge, K.lg(ctx, X(0), 0, X(52), 0, [[0, '#6e5c92'], [0.35, '#a894bc'], [0.72, '#ecdcd0'], [1, '#fff2e0']]), () => {
      const r = K.rand(side < 0 ? 271 : 277);
      // strata: soft bands with a furrow-and-ridge line pair, waving slightly
      for (let y = 8 + r() * 10; y < h; y += 18 + r() * 14) {
        ctx.fillStyle = 'rgba(120,100,160,.09)'; ctx.fillRect(Math.min(X(0), X(60)), y, 60, 6 + r() * 5);
        for (const [o, c, lw] of [[0, 'rgba(110,90,150,.5)', 1], [1.1, 'rgba(255,250,240,.45)', 0.8]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(X(0), y + o); ctx.bezierCurveTo(X(18), y + o - 2, X(34), y + o + 2, X(56), y + o - 1); ctx.stroke(); }
      }
      // shadow under each ledge, a grey drip-stain below it
      for (const L of C.ledges) {
        const ey = L.y + 3; ctx.fillStyle = K.lg(ctx, 0, ey, 0, ey + 20, ['rgba(70,54,110,.55)', 'rgba(70,54,110,0)']); ctx.fillRect(Math.min(X(0), X(60)), ey, 60, 20);
        ctx.fillStyle = K.lg(ctx, 0, ey, 0, ey + 34, ['rgba(110,100,130,.22)', 'rgba(110,100,130,0)']); ctx.fillRect(edge(ey) + side * 6, ey, side < 0 ? 5 : -5, 34);
      }
      // two flint bands of dark glossy nodules
      for (let b = 0; b < 2; b++) {
        const y0 = 100 + b * 210 + r() * 40;
        for (let k = 0; k < 3; k++) { const fx = X(4 + k * 12 + r() * 8), fy = y0 + (r() - 0.5) * 8, fr = 2 + r() * 2.5; blob(ctx, lumpPts(fx, fy, fr * 1.4, fr, 900 + b * 9 + k, 7, 0.3)); ctx.fillStyle = K.lg(ctx, 0, fy - fr, 0, fy + fr, ['#8a82b8', '#4a4278']); ctx.fill(); ell(ctx, fx - fr * 0.4, fy - fr * 0.4, fr * 0.5, fr * 0.2, 'rgba(230,230,255,.6)'); }
      }
      // cracks running in from the face, as line pairs
      for (let k = 0; k < 7; k++) {
        const y = 20 + r() * (h - 40), x = edge(y) + side * 2, l = 10 + r() * 16;
        const pts = [[x, y], [x + side * l * 0.3, y + l * 0.35], [x + side * l * 0.5, y + l * 0.55], [x + side * l * 0.9, y + l]];
        ctx.strokeStyle = 'rgba(84,66,124,.8)'; ctx.lineWidth = 1.1; poly(ctx, pts); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,248,236,.6)'; ctx.lineWidth = 0.7; poly(ctx, pts.map(([px, py]) => [px - side * 0.9, py - 0.6])); ctx.stroke();
      }
      // erosion pockets
      for (let k = 0; k < 2; k++) { const y = 70 + k * 220 + r() * 60, x = X(14 + r() * 8); ell(ctx, x, y, 5, 3.6, K.rg(ctx, x - 1, y - 1, 6, ['#3e3062', '#6e5c92'])); ctx.strokeStyle = 'rgba(255,240,226,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.6, 0, 0.3, 2.8); ctx.stroke(); }
    }, rim, 2, 0.25);
    // ledge tops: a sunlit cream shelf with grass and sea-pink thrift
    C.ledges.forEach((L, i) => {
      const x0 = X(L.d0 - 4), x1 = X(L.d1);
      ctx.fillStyle = K.lg(ctx, 0, L.y - 2, 0, L.y + 2, ['#fff8ec', '#f4dcc4']); ctx.beginPath(); ctx.moveTo(x0, L.y - 1.5); ctx.lineTo(x1, L.y + 0.5); ctx.lineTo(x1, L.y + 2.2); ctx.lineTo(x0, L.y + 1.5); ctx.closePath(); ctx.fill();
      if (i % 3 !== 2) grass(ctx, X(L.d1 - 2), L.y + 1, side, 7, t, gust, i * 3, 6 + (i % 2) * 3);
      if (i % 3 === 1) thrift(ctx, X(L.d1 - 12), L.y + 1, t, i);
    });
  }
  // a chunky faceted chalk rock with a flint inclusion; lit facets from the top left, sunset rim below
  function chalkBoulder(ctx, x, y, r, a, seed) {
    const rr = K.rand(seed), n = 7, pts = [];
    for (let i = 0; i < n; i++) { const an = i / n * TAU + rr() * 0.5, k = 0.8 + rr() * 0.3; pts.push([Math.cos(an) * r * k, Math.sin(an) * r * k * 0.92]); }
    const top = pts.map(([px, py]) => [px * 0.42 - r * 0.2, py * 0.42 - r * 0.24]);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineJoin = 'round';
    const Ld = -2.3 - a;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n], q0 = top[i], q1 = top[(i + 1) % n];
      const na = Math.atan2((p0[1] + p1[1]) / 2, (p0[0] + p1[0]) / 2), b = 0.5 + 0.5 * Math.cos(na - Ld);
      ctx.fillStyle = rgb(mix([92, 76, 134], [250, 236, 222], b)); poly(ctx, [p0, p1, q1, q0]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = b > 0.5 ? 'rgba(255,250,240,.55)' : 'rgba(70,56,110,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(...q0); ctx.lineTo(...p0); ctx.stroke();
    }
    ctx.fillStyle = K.lg(ctx, -r * 0.5, -r * 0.6, r * 0.2, r * 0.1, ['#fffaf2', '#f0e0d4']); poly(ctx, top); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.8; ctx.stroke();
    // flint inclusion: dark glossy lump on a side facet
    const fi = 2 + (seed % 3), fp = pts[fi], fq = pts[(fi + 1) % n], fx = (fp[0] + fq[0]) * 0.36, fy = (fp[1] + fq[1]) * 0.36;
    blob(ctx, lumpPts(fx, fy, r * 0.22, r * 0.16, seed * 3, 7, 0.2)); ctx.fillStyle = K.lg(ctx, fx, fy - r * 0.16, fx, fy + r * 0.16, ['#7a74b4', '#2a2452']); ctx.fill();
    ell(ctx, fx - r * 0.06, fy - r * 0.06, r * 0.08, r * 0.035, 'rgba(230,230,255,.85)', -0.5);
    poly(ctx, pts); ctx.closePath(); ctx.strokeStyle = '#4a3c76'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.restore();
    // warm sunset rim along the lower edge
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,170,110,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0.2, 1.9); ctx.stroke(); ctx.restore();
  }

  PV.sections['cliffs'] = (ctx, w, h, t) => {
    const hz = h * 0.745;
    // sunset sky
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, hz, [[0, '#5e6aa6'], [0.32, '#a886b4'], [0.62, '#f2a07a'], [0.9, '#ffc88a'], [1, '#ffe0a0']]); ctx.fillRect(0, 0, w, hz + 1);
    // sun, half sunk
    const sx = w * 0.44;
    K.glow(ctx, sx, hz, 120, [255, 190, 120], 0.45); K.glow(ctx, sx, hz, 44, [255, 240, 200], 0.6);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hz); ctx.clip();
    ctx.fillStyle = K.rg(ctx, sx - 4, hz - 6, 24, ['#fffbe8', '#ffe2a0', '#ffb070']); ctx.beginPath(); ctx.arc(sx, hz + 4, 20, 0, TAU); ctx.fill();
    ctx.restore();
    // long sunset clouds, lavender with peach-gold undersides
    for (const [cx, cy, len, ph] of [[60, 70, 120, 0], [190, 120, 140, 1], [80, 200, 110, 2], [210, 262, 90, 3], [120, 34, 90, 4]]) {
      const x = cx + Math.sin(t * 0.15 + ph) * 4;
      ctx.fillStyle = K.lg(ctx, 0, cy - 9, 0, cy + 6, ['rgba(150,130,190,.75)', 'rgba(220,150,170,.8)', 'rgba(255,200,150,.9)']);
      ctx.beginPath(); ctx.moveTo(x - len / 2, cy + 4);
      for (let k = 0; k <= 6; k++) { const q = k / 6; ctx.quadraticCurveTo(x - len / 2 + (q - 1 / 12) * len, cy - 6 - Math.sin(q * Math.PI) * 6 - (k % 2) * 3, x - len / 2 + q * len, cy + (k % 2 ? -2 : 0) - Math.sin(q * Math.PI) * 4); }
      ctx.quadraticCurveTo(x + len / 2 + 6, cy + 5, x + len / 2 - 10, cy + 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,180,.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - len / 2 + 8, cy + 4.6); ctx.lineTo(x + len / 2 - 12, cy + 4.6); ctx.stroke();
    }
    // far gulls gliding across
    ctx.strokeStyle = 'rgba(90,80,130,.65)'; ctx.lineWidth = 1.1;
    for (let k = 0; k < 5; k++) { const bx = mod(k * 61 + t * (8 + k * 2), w + 40) - 20, by = 150 + k * 37 + Math.sin(t + k) * 4, f = Math.sin(t * 5 + k) * 2; ctx.beginPath(); ctx.moveTo(bx - 4, by - 1 - f); ctx.quadraticCurveTo(bx - 2, by - 2, bx, by); ctx.quadraticCurveTo(bx + 2, by - 2, bx + 4, by - 1 - f); ctx.stroke(); }
    // distant headland with the lighthouse, sea stacks to the right
    ctx.fillStyle = K.lg(ctx, 0, hz - 50, 0, hz, ['#8a76a8', '#6e5e8e']);
    ctx.beginPath(); ctx.moveTo(w + 5, hz + 1); ctx.lineTo(w + 5, hz - 34); ctx.quadraticCurveTo(w - 30, hz - 48, w - 62, hz - 40); ctx.quadraticCurveTo(w - 100, hz - 30, w - 122, hz + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,150,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w - 100, hz - 30); ctx.quadraticCurveTo(w - 80, hz - 40, w - 62, hz - 40); ctx.stroke();
    for (const [x, wd, ht] of [[54, 12, 46], [76, 8, 28]]) { ctx.fillStyle = K.lg(ctx, x - wd, 0, x + wd, 0, ['#9a86b4', '#6e5e8e']); ctx.beginPath(); ctx.moveTo(x - wd, hz + 1); ctx.lineTo(x - wd * 0.7, hz - ht); ctx.quadraticCurveTo(x, hz - ht - 5, x + wd * 0.7, hz - ht); ctx.lineTo(x + wd, hz + 1); ctx.closePath(); ctx.fill(); }
    {
      const lx = w - 66, ly = hz - 40;
      // the beam sweeping round
      const ba = t * 1.6, bv = Math.cos(ba);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const len = 110 * Math.abs(bv), dir = bv > 0 ? 1 : -1;
      ctx.fillStyle = K.lg(ctx, lx, 0, lx + dir * len, 0, ['rgba(255,245,200,.5)', 'rgba(255,245,200,0)']);
      ctx.beginPath(); ctx.moveTo(lx, ly - 25); ctx.lineTo(lx + dir * len, ly - 25 - 14); ctx.lineTo(lx + dir * len, ly - 25 + 10); ctx.closePath(); ctx.fill();
      K.glow(ctx, lx, ly - 25, 14, [255, 240, 190], 0.6);
      ctx.restore();
      ctx.fillStyle = K.lg(ctx, lx - 4, 0, lx + 4, 0, ['#ffffff', '#e8dccb', '#b8a8c8']); ctx.beginPath(); ctx.moveTo(lx - 4, ly); ctx.lineTo(lx - 2.8, ly - 21); ctx.lineTo(lx + 2.8, ly - 21); ctx.lineTo(lx + 4, ly); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d84a4a'; for (const yy of [ly - 6, ly - 15]) ctx.fillRect(lx - 3.8 + (ly - yy) * 0.05, yy - 2.5, 7.6 - (ly - yy) * 0.1, 3);
      ctx.fillStyle = '#ffe8a0'; ctx.fillRect(lx - 2.4, ly - 27, 4.8, 5); ctx.fillStyle = '#5a4a78'; ctx.beginPath(); ctx.moveTo(lx - 3.4, ly - 27); ctx.lineTo(lx, ly - 31); ctx.lineTo(lx + 3.4, ly - 27); ctx.closePath(); ctx.fill();
    }
    // the sea far below: deep blue, glitter path under the sun, faint swell lines
    ctx.fillStyle = K.lg(ctx, 0, hz, 0, h, ['#4a8eb8', '#3d6f9e', '#2e4a7a']); ctx.fillRect(0, hz, w, h - hz);
    ctx.strokeStyle = 'rgba(160,200,230,.35)'; ctx.lineWidth = 1; for (let k = 0; k < 8; k++) { const y = hz + 6 + k * k * 2.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 1); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rg = K.rand(5);
    for (let k = 0; k < 30; k++) { const yy = hz + 3 + rg() * (h - hz) * 0.8, spread = 6 + (yy - hz) * 0.4, xx = sx + (rg() - 0.5) * spread * 2, a = 0.3 + 0.5 * Math.max(0, Math.sin(t * 3 + k * 1.7)); ctx.fillStyle = `rgba(255,220,160,${a})`; ctx.fillRect(xx - 3, yy, 6 + (yy - hz) * 0.06, 1.2); }
    ctx.restore();
    ell(ctx, sx, hz + 1, 40, 2, 'rgba(255,230,170,.6)');
    // warm haze over the distance
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(255,200,170,0)', 'rgba(255,200,160,.12)', 'rgba(255,190,150,.06)']); ctx.fillRect(0, 0, w, h);

    // wind gust (the twist)
    const gu = mod(t, 4), gust = bump(gu, 0.3, 0.7, 1.4, 2.0);
    // walls
    const SL = cliffProfile(91, -1, w, h), SR = cliffProfile(98, 1, w, h), L = SL.edge, R = SR.edge;
    chalkCliff(ctx, SL, -1, w, h, t, gust, [[0, [246, 168, 112]], [0.4, [236, 140, 130]], [0.7, [246, 170, 104]], [1, [236, 146, 128]]]);
    chalkCliff(ctx, SR, 1, w, h, t, gust, [[0, [240, 156, 116]], [0.5, [248, 178, 108]], [1, [236, 140, 126]]]);
    const near = (C, y) => C.ledges.reduce((a, b) => Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a);
    // rope ladder hanging down the left cliff
    {
      const x0 = L(4) + 2, y1 = 132, sway = gust * 8 + Math.sin(t * 1.2) * 1.5;
      const rope = (dx) => { ctx.beginPath(); ctx.moveTo(x0 + dx, -2); ctx.quadraticCurveTo(x0 + dx + sway * 0.4, y1 * 0.5, x0 + dx + sway, y1); };
      const at = (dx, q) => [x0 + dx + sway * (q * q * 0.6 + q * 0.4) , q * y1];
      for (let k = 1; k < 9; k++) { const q = k / 9, [ax, ay] = at(-1, q), [bx, by] = at(13, q); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by + 0.5); ctx.stroke(); ctx.strokeStyle = '#c8945a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.strokeStyle = 'rgba(255,220,170,.8)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(ax, ay - 0.6); ctx.lineTo(bx, by - 0.1); ctx.stroke(); }
      for (const dx of [-1, 13]) { rope(dx); ctx.strokeStyle = '#6a4a22'; ctx.lineWidth = 2; ctx.stroke(); rope(dx); ctx.strokeStyle = '#e6cf98'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
    }
    // nests on shelves
    { const Lg = near(SR, 250); nest(ctx, w - Lg.d1 + 9, Lg.y + 1, t, true); }
    { const Lg = near(SL, 214); nest(ctx, Lg.d1 - 9, Lg.y + 1, t, false); }

    // ---- Rockslide: a cracked overhang sheds pebbles, then drops boulders
    {
      const u = mod(t + 0.6, 4), y = 150, ex = R(y), len = 64, tip = ex - len;
      const tell = bump(u, 0.9, 1.2, 1.9, 2.0), fallen = u >= 2.0 && u < 3.4, reform = seg(u, 3.4, 4.0);
      const shake = tell * Math.sin(t * 55) * 0.8;
      // the overhang
      ctx.save(); ctx.translate(shake, 0);
      const OH = [[ex + 6, y - 14], [ex - 10, y - 16], [tip + 8, y - 8], [tip, y - 2], [tip + 3, y + 6], [tip + 16, y + 9], [tip + 40, y + 11], [ex - 6, y + 16], [ex + 6, y + 18]];
      poly(ctx, OH); ctx.closePath(); ctx.fillStyle = K.lg(ctx, 0, y - 16, 0, y + 18, [CH.lit, CH.mid, CH.dark]); ctx.fill(); ctx.strokeStyle = CH.edge; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = K.lg(ctx, 0, y - 17, 0, y - 12, [CH.top, CH.lit]); ctx.beginPath(); ctx.moveTo(ex + 6, y - 14.5); ctx.lineTo(ex - 10, y - 16.5); ctx.lineTo(tip + 8, y - 8.5); ctx.lineTo(tip + 11, y - 6); ctx.lineTo(ex - 8, y - 12.5); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 6; k++) { const gx = ex - 12 - k * 5, gy = y - 16 + k * 1.6, l = 5 + (k % 3) * 2, lean = gust * 0.6 + (k - 3) * 0.1; ctx.strokeStyle = k % 2 ? '#8ab05a' : '#5e8a44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + lean * 2, gy - l * 0.6, gx + lean * l, gy - l); ctx.stroke(); }
      // the crack, widening through the tell
      const cw = 0.8 + tell * 1.8 + (fallen ? 1 : 0);
      ctx.strokeStyle = CH.deep; ctx.lineWidth = cw; ctx.beginPath(); ctx.moveTo(ex - 14, y - 15); ctx.lineTo(ex - 20, y - 4); ctx.lineTo(ex - 16, y + 3); ctx.lineTo(ex - 22, y + 14); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,210,.4)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(ex - 13, y - 15); ctx.lineTo(ex - 19, y - 4); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgb(CH.rim, 0.4); ctx.lineWidth = 3; poly(ctx, OH.slice(1, 7)); ctx.stroke(); ctx.restore();
      ctx.restore();
      // the boulders: tucked under the lip, then dropping and tumbling
      const B = [[tip + 13, y + 16, 11, 0], [tip + 33, y + 20, 14, 0.12], [tip + 53, y + 16, 10, 0.06]];
      B.forEach(([bx, by, br, dl], i) => {
        let x = bx + shake, yy = by, a = 0, alpha = 1;
        if (fallen) { const q = Math.max(0, u - 2.0 - dl); yy = by + 0.5 * 900 * q * q; x = bx + q * (i - 1) * 22; a = q * (i % 2 ? 6 : -5); }
        else if (u >= 3.4) { alpha = reform; }
        if (yy > h + 20) return;
        if (fallen) K.danger(ctx, x, yy, br * 2.4, 0.35);
        ctx.save(); ctx.globalAlpha = alpha; chalkBoulder(ctx, x, yy, br, a, 41 + i); ctx.restore();
      });
      // pebbles and dust through the tell, a dust burst as it lets go
      if (tell > 0.05) for (let k = 0; k < 5; k++) { const q = mod(t * 1.8 + k / 5, 1), px = tip + 10 + k * 8; ell(ctx, px, y + 18 + q * q * 70, 1.5, 1.2, `rgba(232,214,220,${tell * (1 - q * 0.5)})`); }
      if (u > 1.95 && u < 2.8) { const q = seg(u, 1.95, 2.8); puff(ctx, tip + 28, y + 16 + q * 10, 14 + q * 16, [236, 220, 226], 0.55 * (1 - q), 88); }
    }

    // ---- Blowhole: gurgles, then blasts sea spray across the shaft (a push)
    {
      const u = mod(t - 0.2, 4), y = 304, ex = L(y);
      const tell = bump(u, 0.9, 1.2, 1.9, 2.0), blast = u < 1.95 ? 0 : u < 2.15 ? ease(seg(u, 1.95, 2.15)) : u < 2.9 ? 1 : 1 - ease(seg(u, 2.9, 3.4));
      const mx = ex + 2, my = y;
      // the hole: wet dark rim stain, deep throat
      ell(ctx, mx - 2, my + 2, 14, 13, 'rgba(40,30,70,.5)');
      ctx.fillStyle = K.rg(ctx, mx - 6, my, 14, ['#0e1a34', '#1e3a5e', '#3a4a7a']); ctx.beginPath(); ctx.ellipse(mx - 3, my, 8, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = CH.edge; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = rgb(lift(CH.rim, 30), 0.85); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(mx - 3, my, 8.5, 10.5, 0, -1.2, 1.0); ctx.stroke();
      // water sloshing inside, barnacles and kelp at the lip
      const slosh = Math.sin(t * 4) * 2 + tell * Math.sin(t * 20) * 2;
      ctx.save(); ctx.beginPath(); ctx.ellipse(mx - 3, my, 8, 10, 0, 0, TAU); ctx.clip(); ctx.fillStyle = K.lg(ctx, 0, my + 2, 0, my + 10, ['#6ac0e0', '#2a6a9a']); ctx.fillRect(mx - 12, my + 3 + slosh - tell * 5, 20, 12); ctx.restore();
      for (const [bx, by] of [[mx + 5, my - 8], [mx + 6, my + 7], [mx + 3, my + 10]]) { ell(ctx, bx, by, 1.8, 1.4, '#e0d8c8'); ell(ctx, bx, by, 0.6, 0.5, '#3c3426'); }
      ctx.strokeStyle = '#4a8a5a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx + 4, my + 9); ctx.quadraticCurveTo(mx + 6, my + 16, mx + 3 + Math.sin(t * 2) * 1.5, my + 22); ctx.stroke(); ctx.strokeStyle = '#8ad08a'; ctx.lineWidth = 0.7; ctx.stroke();
      // gurgle: foam bubbles burbling at the mouth, droplets spurting
      if (tell > 0.05) for (let k = 0; k < 6; k++) { const q = mod(t * 2.2 + k / 6, 1), bx = mx + 4 + q * 10 * (k % 3) * 0.6, by = my - 4 + (k % 3) * 4 - q * 6; ball(ctx, bx, by, (1.2 + (k % 2)) * tell * (1 - q * 0.5) + 0.3, ['#ffffff', '#e0f6ff', '#9ac8e0'], 'rgba(90,150,190,.6)', 0.4); }
      if (blast > 0.02) {
        const len = 172 * blast, x0 = mx + 4;
        const hw = (q, ph) => 7 + q * 22 + Math.sin(q * 11 - t * 20 + ph) * 2.4 + Math.sin(q * 23 - t * 31 + ph) * 1.2;
        const jet = (k, ph) => { ctx.beginPath(); ctx.moveTo(x0, my - hw(0, ph) * k); for (let i = 1; i <= 14; i++) { const q = i / 14; ctx.lineTo(x0 + q * len, my - hw(q, ph) * k); } for (let i = 14; i >= 0; i--) { const q = i / 14; ctx.lineTo(x0 + q * len, my + hw(q, ph + 2) * k); } ctx.closePath(); };
        K.glow(ctx, x0 + len * 0.5, my, len * 0.6, [200, 250, 255], 0.25 * blast);
        jet(1.2, 0); ctx.fillStyle = 'rgba(70,180,200,.5)'; ctx.fill();
        jet(0.95, 1); ctx.fillStyle = K.lg(ctx, 0, my - 26, 0, my + 26, ['rgba(150,225,235,.85)', 'rgba(235,252,255,.95)', 'rgba(130,210,225,.85)']); ctx.fill();
        jet(0.42, 2); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
        // streaks racing along it
        ctx.save(); jet(0.95, 1); ctx.clip(); ctx.lineCap = 'round';
        for (let k = 0; k < 7; k++) { const yy = my + (k - 3) * 4.6; ctx.strokeStyle = k % 2 ? 'rgba(60,160,190,.5)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = k % 2 ? 1.2 : 1.8; ctx.setLineDash([14 + k * 3, 10]); ctx.lineDashOffset = -t * (280 + k * 30); ctx.beginPath(); ctx.moveTo(x0, yy * 0.4 + my * 0.6); ctx.lineTo(x0 + len, yy + (yy - my) * 1.2); ctx.stroke(); }
        ctx.setLineDash([]); ctx.restore();
        // foam blobs tumbling along and a frothy head
        for (let k = 0; k < 14; k++) { const q = mod(t * 2.2 + k / 14, 1), x = x0 + q * len, yy = my + Math.sin(k * 2.3) * q * 16, r2 = 2.5 + q * 6; ball(ctx, x, yy, r2, ['rgba(255,255,255,.98)', 'rgba(232,250,255,.92)', 'rgba(150,215,232,.7)'], 'rgba(120,200,225,.15)', 0.3); }
        for (let k = 0; k < 6; k++) { const a2 = (k / 5 - 0.5) * 2.2, x = x0 + len + Math.cos(a2) * 6, yy = my + Math.sin(a2) * 18; ball(ctx, x, yy, 6 + Math.sin(t * 9 + k) * 1.5, ['#ffffff', '#eefaff', '#b4e0ee'], 'rgba(120,200,225,.15)', 0.3); }
        // droplets flung off in arcs
        const rr = K.rand(12); for (let k = 0; k < 24; k++) { const a2 = (rr() - 0.5) * 2, sp = 30 + rr() * 60, q = mod(t * 1.8 + k * 0.041, 1), dx = Math.cos(a2) * sp * q + q * 30, dy = Math.sin(a2) * sp * q + 90 * q * q; ell(ctx, x0 + len * (0.4 + rr() * 0.6) + dx, my + dy, 1.4, 1.8, `rgba(235,250,255,${0.9 * blast * (1 - q)})`); }
        // burst ring at the mouth
        { const q = seg(u, 1.95, 2.4); if (q < 1) { ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - q)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x0 + 4, my, 6 + q * 10, 10 + q * 16, 0, -1.4, 1.4); ctx.stroke(); } }
        puff(ctx, x0 + len + 6, my, 18 * blast, [245, 252, 255], 0.55 * blast, 33);
      }
      if (u > 2.9 && u < 4) { const q = seg(u, 2.9, 4); puff(ctx, mx + 40 + q * 30, my - q * 16, 18 + q * 12, [240, 250, 255], 0.35 * (1 - q), 34); }
    }

    // ---- Dive-bomb Gull: circles high, shrieks, folds and dives at the rocket, swoops back up
    const gU = mod(t + 0.9, 4), RX = w * 0.5, RY = h * 0.8;
    const drift = gust * 12 - bump(gU, 2.6, 2.8, 3.0, 3.3) * 26;
    {
      const cx = w * 0.5, cy = 70, rx = 46, ry = 14, a0 = -Math.PI / 2 + 0.3, H = [cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry];
      let x, y, rot = 0, mode = 0, face = 1, flap = 0.5 + 0.5 * Math.sin(t * 7);
      if (gU < 2.0) { const a = a0 + gU / 2.0 * TAU; x = cx + Math.cos(a) * rx; y = cy + Math.sin(a) * ry; face = -Math.sin(a) > 0 ? 1 : -1; flap = Math.sin(a) > 0 ? 0.5 + 0.5 * Math.sin(t * 9) : 0.75; }
      else if (gU < 2.6) { x = H[0] + Math.sin(t * 30) * 0.8; y = H[1] - 4 * seg(gU, 2.0, 2.3); mode = 1; flap = 0.9 + 0.1 * Math.sin(t * 18); face = -1; }
      else if (gU < 3.05) { const q = ease(seg(gU, 2.6, 3.05)); const tx = RX + 10, ty = RY - 20; x = lerp(H[0], tx, q); y = lerp(H[1], ty, q * q); mode = 2; face = 1; rot = Math.atan2(ty - H[1], tx - H[0]); }
      else { const q = ease(seg(gU, 3.05, 4.0)); const P0 = [RX + 10, RY - 20], P1 = [w * 0.85, h * 0.45], P2 = H; x = (1 - q) * (1 - q) * P0[0] + 2 * (1 - q) * q * P1[0] + q * q * P2[0]; y = (1 - q) * (1 - q) * P0[1] + 2 * (1 - q) * q * P1[1] + q * q * P2[1]; face = -1; flap = 0.5 + 0.5 * Math.sin(t * 12); rot = q < 0.5 ? 0.5 * (1 - q * 2) : 0; }
      if (mode === 1) {
        // shriek rings
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 3; j++) { const q = mod(t * 2.6 + j / 3, 1); ctx.strokeStyle = `rgba(255,80,80,${(1 - q) * 0.8})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x - 20, y - 4, 6 + q * 16, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke(); }
        ctx.restore();
      }
      if (mode === 2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.4; for (const d of [-8, 0, 8]) { const bx = x - Math.cos(rot) * 18 - Math.sin(rot) * d, by = y - Math.sin(rot) * 18 + Math.cos(rot) * d; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(rot) * 26, by - Math.sin(rot) * 26); ctx.stroke(); } ctx.restore(); }
      K.danger(ctx, x, y, 28, mode ? 0.38 : 0.22);
      gull(ctx, x, y, 1.15, t, mode, face, face < 0 && mode === 2 ? rot + Math.PI : rot * face, flap);
    }
    // wind streaks across the shaft
    if (gust > 0.02) {
      ctx.save(); ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const y = 60 + k * 66, q = mod(t * 0.9 + k * 0.17, 1), x = -40 + q * (w + 80), l = 40 + (k % 3) * 14;
        ctx.strokeStyle = `rgba(255,248,240,${0.55 * gust})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - l, y); ctx.quadraticCurveTo(x - l * 0.4, y - 4, x, y - 1); if (k % 2) { ctx.arc(x, y - 5, 4, Math.PI / 2, -Math.PI * 0.6, true); } ctx.stroke();
      }
      ctx.restore();
    }
    for (const [x, y, ph] of [[104, 212, 0], [118, 232, 0.6], [132, 252, 1.2], [200, 420, 1.8]]) coin(ctx, x + gust * 2, y, t, ph);
    // a couple of feathers drifting
    for (let k = 0; k < 3; k++) { const fx = mod(40 + k * 90 + t * (12 + gust * 30), w), fy = mod(k * 150 + t * 14, h), a = Math.sin(t * 1.5 + k) * 0.6; ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); ell(ctx, 0, 0, 4, 1.4, 'rgba(255,255,255,.85)'); ctx.strokeStyle = 'rgba(160,150,190,.8)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.restore(); }
    K.motes(ctx, w, h, t, 'dust', [255, 230, 200], 14, 21);
    K.rocket(ctx, RX + drift, RY, 0.75, t);
  };

})();
