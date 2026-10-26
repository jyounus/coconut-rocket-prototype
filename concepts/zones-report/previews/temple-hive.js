// Sunken Temple (Swinging Axe, Dart Totem) and Honeycomb Hive (Bee Swarm, Honey Drip) previews.
(() => {
  const TAU = K.TAU, PI = Math.PI;
  const sm = K.smooth, clamp = K.clamp, lerp = K.lerp;
  const frac = x => x - Math.floor(x);

  // ================================================================ SUNKEN TEMPLE
  const STONE = ['#c3c6a6', '#878c71', '#4c5140'], STONE_EDGE = '#333828';
  const GOLD = ['#fff0b0', '#f0b83a', '#9a6214'], GOLD_EDGE = '#6a420c';

  function templeFar(ctx, w, h, t, layer, col) {
    const R = K.rand(layer ? 404 : 202);
    if (layer === 0) {
      // a stepped pyramid far below and a distant colonnade under a broken architrave
      let y = h + 4;
      for (let k = 0; k < 7; k++) { const ww = w * (1.05 - k * 0.13); ctx.fillRect(w * 0.52 - ww / 2, y - 15, ww, 15); y -= 15; }
      ctx.fillRect(w * 0.52 - 12, y - 18, 24, 18);
      for (let i = 0; i < 5; i++) {
        const cx = (i + 0.5) * w / 5 + (R() - 0.5) * 10, cw = 13 + R() * 6, top = h * (0.16 + R() * 0.12);
        ctx.fillRect(cx - cw / 2, top, cw, h * 0.62 - top);
        ctx.fillRect(cx - cw * 0.85, top - 6, cw * 1.7, 6);
      }
      ctx.fillRect(-4, h * 0.16 - 16, w * 0.62, 10);
      ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.16 - 16); ctx.lineTo(w * 0.7, h * 0.16 - 12); ctx.lineTo(w * 0.62, h * 0.16 - 6); ctx.fill();
    } else {
      // nearer: two big broken columns, a hanging vine curtain
      for (const [cx, top, cw] of [[w * 0.2, h * 0.5, 30], [w * 0.83, h * 0.36, 34]]) {
        ctx.beginPath(); ctx.moveTo(cx - cw / 2, h + 4); ctx.lineTo(cx - cw / 2, top + 8);
        ctx.lineTo(cx - cw * 0.2, top); ctx.lineTo(cx, top + 9); ctx.lineTo(cx + cw * 0.25, top - 4); ctx.lineTo(cx + cw / 2, top + 6); ctx.lineTo(cx + cw / 2, h + 4); ctx.fill();
        ctx.fillRect(cx - cw * 0.7, h * 0.86, cw * 1.4, 10);
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.07)';
        for (let f = -1; f <= 1; f++) ctx.fillRect(cx + f * cw * 0.28 - 2, top + 12, 4, h - top);
        ctx.restore();
      }
      ctx.save(); ctx.strokeStyle = K.rgb(col); ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const x = w * (0.12 + i * 0.13) + (R() - 0.5) * 12, len = h * (0.12 + R() * 0.22), sw = Math.sin(t * 0.8 + i) * 4;
        ctx.lineWidth = 2 + R() * 2; ctx.beginPath(); ctx.moveTo(x, -4); ctx.quadraticCurveTo(x + sw + 6, len * 0.5, x + sw, len); ctx.stroke();
        for (let k = 1; k < 5; k++) { const yy = len * k / 5; ctx.beginPath(); ctx.ellipse(x + sw * k / 5 + (k % 2 ? 4 : -4), yy, 4, 2, k % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
  }

  function glyph(ctx, kind, x, y, s) {
    ctx.beginPath();
    if (kind === 0) { // spiral
      for (let a = 0; a < 3.2 * PI; a += 0.35) { const r = 1 + a * 0.55 * s / 3; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    } else if (kind === 1) { // eye
      ctx.moveTo(x - 6 * s, y); ctx.quadraticCurveTo(x, y - 5 * s, x + 6 * s, y); ctx.quadraticCurveTo(x, y + 5 * s, x - 6 * s, y);
      ctx.moveTo(x + 1.6 * s, y); ctx.arc(x, y, 1.6 * s, 0, TAU);
    } else { // step fret
      ctx.moveTo(x - 7 * s, y + 4 * s); ctx.lineTo(x - 7 * s, y - 4 * s); ctx.lineTo(x, y - 4 * s); ctx.lineTo(x, y + 1 * s); ctx.lineTo(x - 3.5 * s, y + 1 * s);
      ctx.moveTo(x + 7 * s, y - 4 * s); ctx.lineTo(x + 7 * s, y + 4 * s); ctx.lineTo(x + 2.5 * s, y + 4 * s);
    }
  }
  function carve(ctx, kind, x, y, s, gold) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    glyph(ctx, kind, x + 0.6, y + 0.8, s); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.8; ctx.stroke();
    glyph(ctx, kind, x, y, s); ctx.strokeStyle = `rgba(245,196,84,${gold})`; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function templeWall(ctx, side, edge, w, h, t, scroll) {
    const bh = 19, bw = 30, off = ((scroll % bh) + bh) % bh, r0 = Math.floor(scroll / bh);
    const xa = side < 0 ? -bw : w * 0.66, xb = side < 0 ? w * 0.34 : w + bw;
    for (let ri = -1; ri * bh - off < h + bh; ri++) {
      const y = ri * bh - off, rowId = ri + r0, R = K.rand((rowId + 500) * 131 + (side < 0 ? 7 : 911));
      const sh = (rowId & 1) ? bw * 0.5 : 0, ey = edge(y + bh / 2);
      for (let bx = Math.floor((xa + sh) / bw) * bw - sh; bx < xb; bx += bw) {
        const v = (R() - 0.5) * 22, dx = Math.abs(bx + bw / 2 - ey), lit = clamp(1 - dx / 50, 0, 1);
        ctx.fillStyle = `rgba(${120 + v},${128 + v},${100 + v},${0.1 + 0.12 * lit})`;
        ctx.fillRect(bx + 1.2, y + 1.2, bw - 2.4, bh - 2.4);
        ctx.fillStyle = `rgba(230,220,170,${0.08 + 0.2 * lit})`; ctx.fillRect(bx + 1.2, y + 1.2, bw - 2.4, 1.2);
        ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(bx + 1.2, y + bh - 2.2, bw - 2.4, 1.2);
        const g = R();
        if (g < 0.2) carve(ctx, (rowId + (bx / bw | 0)) % 3 & 3, bx + bw / 2, y + bh / 2, 0.9, 0.35 + 0.5 * lit);
        else if (g < 0.32) { ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx + 6, y + 2); ctx.lineTo(bx + 11, y + 9); ctx.lineTo(bx + 9, y + bh - 3); ctx.stroke(); }
        if (R() < 0.35) { ctx.fillStyle = `rgba(104,148,62,${0.25 + 0.35 * lit})`; ctx.beginPath(); ctx.ellipse(bx + R() * bw, y + 2, 4 + R() * 5, 2.2, 0, 0, TAU); ctx.fill(); }
      }
    }
    // moss crusting the lit edge
    const R = K.rand(side < 0 ? 61 : 67);
    for (let y = -6; y < h + 10; y += 9) {
      const yy = y - (scroll % 9), r = 3 + R() * 4; if (R() < 0.45) continue;
      ctx.fillStyle = `rgba(${96 + R() * 40},${150 + R() * 40},60,.65)`;
      ctx.beginPath(); ctx.arc(edge(yy) + side * r * 0.5, yy, r, 0, TAU); ctx.fill();
    }
  }

  const TEMPLE = {
    bgTop: [118, 132, 104], bgBot: [52, 64, 50], far: [96, 110, 88], far2: [82, 96, 76],
    wall: [50, 52, 40], wallIn: [14, 15, 11], rim: [255, 208, 112], seed: 11, farShape: templeFar, wallDeco: templeWall,
  };

  // vine draped over a wall edge, swaying
  function vine(ctx, x, y, len, t, seed, dir) {
    const R = K.rand(seed), sw = Math.sin(t * 1.3 + seed) * 4;
    const cx = x + dir * 10 + sw * 0.5, ex = x + dir * 4 + sw;
    ctx.save(); ctx.lineCap = 'round';
    for (const [lw, c] of [[3.6, '#2f5a1c'], [2, '#6aa53e']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, y + len * 0.5, ex, y + len); ctx.stroke(); }
    for (let k = 1; k <= 6; k++) {
      const u = k / 6.4, mu = 1 - u, lx = mu * mu * x + 2 * mu * u * cx + u * u * ex, ly = mu * mu * y + 2 * mu * u * (y + len * 0.5) + u * u * (y + len);
      const a = (k % 2 ? 0.8 : PI - 0.8) + Math.sin(t * 2 + k) * 0.15, L = 6 + R() * 3;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
      ctx.fillStyle = K.lg(ctx, 0, -3, L, 3, ['#a6dc64', '#5c9a32']);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -L * 0.42, L, 0); ctx.quadraticCurveTo(L * 0.5, L * 0.42, 0, 0); ctx.fill();
      ctx.strokeStyle = '#3c6e22'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // torch in a bronze bracket on a wall (dir: +1 sticks out to the right)
  function torch(ctx, x, y, dir, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    K.glow(ctx, dir * 10, -14, 70, [255, 170, 70], 0.32 + 0.05 * Math.sin(t * 13));
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5a3a12'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(-dir * 3, 4); ctx.quadraticCurveTo(dir * 6, 6, dir * 10, -2); ctx.stroke();
    ctx.strokeStyle = '#d29a3e'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, dir * 4, -6, dir * 16, 2, GOLD); ctx.beginPath(); ctx.moveTo(dir * 3, -6); ctx.lineTo(dir * 17, -6); ctx.lineTo(dir * 13, 1); ctx.lineTo(dir * 7, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_EDGE; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,230,.6)'; ctx.fillRect(dir > 0 ? 5 : -15, -5.6, 10, 1.2);
    // flame
    const fx = dir * 10, fl = Math.sin(t * 11) * 1.5, fl2 = Math.sin(t * 17 + 1) * 1.2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [sc, c] of [[1, 'rgba(255,90,30,.75)'], [0.72, 'rgba(255,170,50,.85)'], [0.42, 'rgba(255,245,190,.95)']]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(fx - 7 * sc, -6); ctx.quadraticCurveTo(fx - 8 * sc, -14 * sc - 4, fx + fl * sc, -6 - 22 * sc + fl2);
      ctx.quadraticCurveTo(fx + 8 * sc, -14 * sc - 4, fx + 7 * sc, -6); ctx.closePath(); ctx.fill();
    }
    ctx.restore(); ctx.restore();
  }

  // the stone lintel the axe hangs from
  function lintel(ctx, xL, xR, y, s, t) {
    const hh = 24 * s;
    K.shadow(ctx, (xL + xR) / 2, y + hh + 6, (xR - xL) * 0.5, 8, 0.4);
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + hh, STONE); ctx.fillRect(xL, y, xR - xL, hh);
    ctx.fillStyle = 'rgba(255,255,220,.25)'; ctx.fillRect(xL, y, xR - xL, 1.6);
    ctx.fillStyle = K.lg(ctx, 0, y + hh * 0.36, 0, y + hh * 0.62, GOLD); ctx.fillRect(xL, y + hh * 0.36, xR - xL, hh * 0.24);
    ctx.fillStyle = 'rgba(255,250,210,.5)'; ctx.fillRect(xL, y + hh * 0.36, xR - xL, 1);
    ctx.fillStyle = GOLD_EDGE; ctx.fillRect(xL, y + hh * 0.6 - 0.8, xR - xL, 0.8);
    ctx.strokeStyle = STONE_EDGE; ctx.lineWidth = 1.2; ctx.strokeRect(xL, y, xR - xL, hh);
    const n = Math.round((xR - xL) / 44);
    for (let i = 1; i < n; i++) { const x = xL + (xR - xL) * i / n; ctx.fillStyle = 'rgba(30,34,24,.6)'; ctx.fillRect(x - 0.6, y, 1.2, hh); }
    for (let i = 0; i < n; i++) carve(ctx, i % 3, xL + (xR - xL) * (i + 0.5) / n, y + hh * 0.19, 0.55 * s, 0.7);
    for (let i = 0; i < n; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(xL + (xR - xL) * (i + 0.5) / n, y + hh * 0.48, 1.6 * s, 0, TAU); ctx.fill(); }
    // moss on top, dripping over
    const R = K.rand(9);
    ctx.fillStyle = '#6f9e3e';
    for (let x = xL; x < xR; x += 7) { const r = 2 + R() * 3.5; ctx.beginPath(); ctx.arc(x, y + 0.5, r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#a6d462';
    for (let x = xL + 3; x < xR; x += 11) { ctx.beginPath(); ctx.arc(x, y - 1, 1.6, 0, TAU); ctx.fill(); }
  }

  // ---- Swinging Axe: a crescent blade on a banded haft, pendulum from a pivot (px,py)
  const AXE_P = 3.2;
  const axeAng = (t, A) => A * Math.sin(t / AXE_P * TAU);
  // crescent blade geometry (local, haft along +y, blade centred at y = L)
  const BW = 50, BT = L => L - 22, BE = L => L + 64;
  function bladePath(ctx, L) {
    ctx.beginPath();
    ctx.moveTo(-BW, BT(L));
    ctx.quadraticCurveTo(0, BE(L), BW, BT(L));          // the cutting edge
    ctx.quadraticCurveTo(BW * 0.5, L + 6, 9, L - 2);     // the hollow back
    ctx.lineTo(7, L - 16); ctx.lineTo(-7, L - 16); ctx.lineTo(-9, L - 2);
    ctx.quadraticCurveTo(-BW * 0.5, L + 6, -BW, BT(L));
    ctx.closePath();
  }
  function drawAxe(ctx, px, py, s, t, A) {
    const L = 140, a = axeAng(t, A), va = Math.cos(t / AXE_P * TAU);   // va: swing speed (-1..1)
    const bx = px + Math.sin(-a) * (L + 14) * s, by = py + Math.cos(a) * (L + 14) * s;
    K.danger(ctx, bx, by, 66 * s, 0.34);
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
    const sp = Math.abs(va);
    // motion smear: earlier poses fading behind the blade while it's fast
    if (sp > 0.25) for (let k = 4; k >= 1; k--) {
      ctx.save(); ctx.rotate(axeAng(t - k * 0.03, A)); ctx.globalAlpha = 0.12 * sp * (1 - k / 5);
      bladePath(ctx, L); ctx.fillStyle = '#eef6f6'; ctx.fill(); ctx.restore();
    }
    // swoosh: an arc trailing the cutting edge
    if (sp > 0.3) {
      const dir = va > 0 ? 1 : -1, a0 = PI / 2 + a, a1 = a0 - dir * 0.5 * sp;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [r, lw, al] of [[L + 16, 8, 0.14], [L + 21, 2.5, 0.35]]) {
        ctx.strokeStyle = `rgba(255,244,214,${al * sp})`; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(0, 0, r, a0 - dir * 0.06, a1, dir > 0); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.rotate(a);
    // haft: dark wood with gold bands
    ctx.fillStyle = K.lg(ctx, -4, 0, 4, 0, ['#b07a3e', '#6e4520', '#3e2410']); ctx.fillRect(-3.8, 6, 7.6, L - 20);
    ctx.fillStyle = 'rgba(255,230,180,.35)'; ctx.fillRect(-2.6, 6, 1.4, L - 20);
    ctx.strokeStyle = '#3a210c'; ctx.lineWidth = 0.9; ctx.strokeRect(-3.8, 6, 7.6, L - 20);
    for (const yy of [28, 64, 100]) {
      ctx.fillStyle = K.lg(ctx, -5, 0, 5, 0, GOLD); ctx.fillRect(-5.4, yy, 10.8, 6);
      ctx.strokeStyle = GOLD_EDGE; ctx.lineWidth = 0.8; ctx.strokeRect(-5.4, yy, 10.8, 6);
      ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.fillRect(-4.6, yy + 0.8, 9, 1);
    }
    // blade: polished steel, darker toward the back, a honed bright edge
    bladePath(ctx, L);
    ctx.fillStyle = K.lg(ctx, -36, L - 18, 30, L + 44, ['#f6fafa', '#b4c0c4', '#6a7a82', '#46545c']); ctx.fill();
    ctx.save(); ctx.clip();
    // darker hollow-ground band along the back
    ctx.fillStyle = 'rgba(40,54,62,.32)';
    ctx.beginPath(); ctx.moveTo(-BW, BT(L)); ctx.quadraticCurveTo(-BW * 0.5, L + 6, -9, L - 2); ctx.lineTo(9, L - 2); ctx.quadraticCurveTo(BW * 0.5, L + 6, BW, BT(L));
    ctx.quadraticCurveTo(BW * 0.5, L + 20, 0, L + 16); ctx.quadraticCurveTo(-BW * 0.5, L + 20, -BW, BT(L)); ctx.fill();
    // honed edge bands
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-BW + 3, BT(L) + 4); ctx.quadraticCurveTo(0, BE(L) - 6, BW - 3, BT(L) + 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,86,94,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-BW + 5, BT(L) + 8); ctx.quadraticCurveTo(0, BE(L) - 12, BW - 5, BT(L) + 8); ctx.stroke();
    // a gleam sliding across as it swings
    const gx = -va * 34;
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, gx, L + 22, 18, ['rgba(255,255,255,.6)', 'rgba(255,255,255,0)']); ctx.fillRect(gx - 18, L + 4, 36, 36);
    ctx.restore();
    bladePath(ctx, L); ctx.strokeStyle = '#3a464c'; ctx.lineWidth = 1.3; ctx.stroke();
    // gold collar on the socket, with a sun glyph medallion
    ctx.fillStyle = K.lg(ctx, -10, L - 18, 10, L + 4, GOLD);
    ctx.beginPath(); ctx.moveTo(-8, L - 18); ctx.lineTo(8, L - 18); ctx.lineTo(11, L + 2); ctx.quadraticCurveTo(0, L + 8, -11, L + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_EDGE; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.fillRect(-7, L - 17, 6, 1.2);
    ctx.fillStyle = K.rg(ctx, -1.5, L + 7, 7, ['#fff4c0', '#f0b83a', '#9a6214']); ctx.beginPath(); ctx.arc(0, L + 9, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD_EDGE; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#b8261a'; ctx.beginPath(); ctx.arc(0, L + 9, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,210,.8)'; ctx.beginPath(); ctx.arc(-0.8, L + 8.2, 0.8, 0, TAU); ctx.fill();
    for (const rx of [-4, 4]) { ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(rx, L - 11, 1.3, 0, TAU); ctx.fill(); }
    ctx.restore();
    // pivot hub (unrotated)
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
    ctx.fillStyle = K.rg(ctx, -3, -3, 11, GOLD); ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD_EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#5a3a10'; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
    for (let k = 0; k < 6; k++) { const aa = k / 6 * TAU + 0.3; ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(Math.cos(aa) * 6.3, Math.sin(aa) * 6.3, 0.9, 0, TAU); ctx.fill(); }
    K.sheen(ctx, 0, 0, 9, 0.5);
    ctx.restore();
  }

  // ---- Dart Totem: a carved stone mask on the wall; eyes glow, then it spits a volley of darts across
  const DART_P = 3.0, DART_FIRE = 1.8, DART_GAP = 0.14, DART_SPEED = 430;
  function totemPhase(t) {
    const u = frac(t / DART_P) * DART_P;
    return { u, tell: sm(0.95, 1.75, u) * (1 - sm(2.15, 2.5, u)), fire: u >= DART_FIRE && u < DART_FIRE + 0.45 };
  }
  function dart(ctx, x, y, dir, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.globalAlpha = a;
    ctx.fillStyle = K.lg(ctx, -26, 0, 0, 0, ['rgba(255,230,180,0)', 'rgba(255,230,180,.35)']); ctx.fillRect(-34, -1.2, 22, 2.4);
    // fletching
    for (const d of [-1, 1]) { ctx.fillStyle = d < 0 ? '#ff6a4a' : '#d83a2e'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-18, d * 5.5, -21, d * 5); ctx.lineTo(-17, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a1e14'; ctx.lineWidth = 0.6; ctx.stroke(); }
    ctx.fillStyle = K.lg(ctx, 0, -1.5, 0, 1.5, ['#f0d4a0', '#b2864a']); ctx.fillRect(-18, -1.1, 14, 2.2);
    ctx.fillStyle = K.lg(ctx, -4, -3, 4, 3, GOLD); ctx.beginPath(); ctx.moveTo(-5, -2.6); ctx.lineTo(5, 0); ctx.lineTo(-5, 2.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_EDGE; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.restore();
  }
  // x,y: mask centre; dir: direction it spits (+1 → right)
  function drawTotem(ctx, x, y, dir, s, t, farX) {
    const P = totemPhase(t), shake = P.tell > 0.5 ? Math.sin(t * 70) * 0.8 * P.tell : 0;
    const lane = y + 15 * s, bore = x + dir * 34 * s;
    // aim: a faint red lane across the shaft while it charges
    if (P.tell > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.lg(ctx, bore, 0, farX, 0, [`rgba(255,70,60,${0.28 * P.tell})`, `rgba(255,70,60,${0.06 * P.tell})`]);
      ctx.fillRect(Math.min(bore, farX), lane - 7 * s, Math.abs(farX - bore), 14 * s);
      ctx.restore();
    }
    K.danger(ctx, x + dir * 22 * s, lane, 40 * s, 0.18 + 0.25 * P.tell);
    ctx.save(); ctx.translate(x + shake, y); ctx.scale(s, s);
    K.shadow(ctx, dir * 4, 34, 30, 7, 0.45);
    // ear spools
    for (const d of [-1, 1]) {
      ctx.fillStyle = K.rg(ctx, d * 27 - 2, -4, 10, STONE); ctx.beginPath(); ctx.arc(d * 27, -2, 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = STONE_EDGE; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = K.rg(ctx, d * 27 - 1, -3, 4.5, GOLD); ctx.beginPath(); ctx.arc(d * 27, -2, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a2c0a'; ctx.beginPath(); ctx.arc(d * 27, -2, 1.4, 0, TAU); ctx.fill();
    }
    // headdress crest
    for (let k = -1; k <= 1; k++) {
      const cx = k * 13, ch = k ? 12 : 17;
      ctx.fillStyle = K.lg(ctx, cx - 6, -48, cx + 6, -30, STONE);
      ctx.beginPath(); ctx.moveTo(cx - 6, -30); ctx.lineTo(cx - 5, -30 - ch); ctx.lineTo(cx, -34 - ch); ctx.lineTo(cx + 5, -30 - ch); ctx.lineTo(cx + 6, -30); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = STONE_EDGE; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = GOLD[1]; ctx.beginPath(); ctx.arc(cx, -32 - ch * 0.5, 1.8, 0, TAU); ctx.fill();
    }
    // head block
    const head = () => { ctx.beginPath(); ctx.moveTo(-22, -32); ctx.lineTo(22, -32); ctx.quadraticCurveTo(25, -32, 25, -28); ctx.lineTo(23, 26); ctx.quadraticCurveTo(22, 32, 16, 32); ctx.lineTo(-16, 32); ctx.quadraticCurveTo(-22, 32, -23, 26); ctx.lineTo(-25, -28); ctx.quadraticCurveTo(-25, -32, -22, -32); ctx.closePath(); };
    head(); ctx.fillStyle = K.lg(ctx, -22, -32, 18, 30, STONE); ctx.fill();
    ctx.save(); head(); ctx.clip();
    // gold brow band with notches
    ctx.fillStyle = K.lg(ctx, 0, -29, 0, -20, GOLD); ctx.fillRect(-26, -29, 52, 8);
    ctx.fillStyle = 'rgba(255,250,210,.6)'; ctx.fillRect(-26, -29, 52, 1);
    ctx.fillStyle = GOLD_EDGE; for (let k = -2; k <= 2; k++) ctx.fillRect(k * 10 - 1, -27.5, 2, 5);
    // brow ridge shadow, eyes
    ctx.fillStyle = 'rgba(30,34,24,.45)'; ctx.fillRect(-26, -21, 52, 3);
    const eg = 0.25 + 0.75 * P.tell;
    for (const d of [-1, 1]) {
      ctx.fillStyle = '#1c2016'; ctx.beginPath(); ctx.moveTo(d * 4, -16); ctx.lineTo(d * 18, -16); ctx.lineTo(d * 17, -6); ctx.lineTo(d * 5, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = K.rg(ctx, d * 11, -11, 7, [`rgba(255,${240 - 120 * P.tell},${160 - 120 * P.tell},${eg})`, `rgba(255,${120 - 70 * P.tell},40,${eg * 0.7})`, 'rgba(120,30,10,0)']);
      ctx.fillRect(d * 11 - 8, -18, 16, 14);
      ctx.fillStyle = `rgba(255,250,220,${0.4 + 0.6 * P.tell})`; ctx.beginPath(); ctx.ellipse(d * 11, -11, 3.2, 1.4 + 1.2 * P.tell, 0, 0, TAU); ctx.fill();
    }
    // nose
    ctx.fillStyle = K.lg(ctx, -6, -6, 6, 8, [STONE[0], STONE[2]]); ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.lineTo(7, 7); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,34,24,.5)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 3.5, 6, 1.6, 0, TAU); ctx.fill(); }
    // mouth: a snarling slot with teeth
    ctx.fillStyle = '#1a1d12'; ctx.beginPath(); ctx.moveTo(-15, 11); ctx.lineTo(15, 11); ctx.lineTo(12, 22); ctx.lineTo(-12, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.rg(ctx, 0, 16, 14, [`rgba(255,120,50,${0.15 + 0.5 * P.tell})`, 'rgba(255,60,30,0)']); ctx.fillRect(-15, 11, 30, 11);
    ctx.fillStyle = '#e8e2c4';
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 4 - 1.8, 11); ctx.lineTo(k * 4 + 1.8, 11); ctx.lineTo(k * 4, 14.5); ctx.fill(); }
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 4.4 - 1.8, 22); ctx.lineTo(k * 4.4 + 1.8, 22); ctx.lineTo(k * 4.4, 18.6); ctx.fill(); }
    // chin glyphs, cracks, moss
    carve(ctx, 2, 0, 27, 0.55, 0.8);
    ctx.strokeStyle = 'rgba(30,34,24,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-19, -18); ctx.lineTo(-15, -4); ctx.lineTo(-20, 6); ctx.moveTo(18, 14); ctx.lineTo(21, 24); ctx.stroke();
    ctx.fillStyle = 'rgba(110,158,62,.85)'; for (const [mx, my, mr] of [[-20, -32, 6], [-12, -33, 4], [19, -31, 5], [-23, 30, 5]]) { ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill(); }
    ctx.restore();
    head(); ctx.strokeStyle = STONE_EDGE; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,220,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-22, 24); ctx.lineTo(-23.6, -26); ctx.quadraticCurveTo(-23.6, -30.5, -20, -30.5); ctx.lineTo(10, -30.5); ctx.stroke();
    // blow-spout from the mouth, pointing across the shaft
    ctx.save(); ctx.scale(dir, 1);
    ctx.fillStyle = K.lg(ctx, 0, 9, 0, 22, STONE); ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(32, 11); ctx.lineTo(32, 20); ctx.lineTo(10, 21); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = STONE_EDGE; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, 10, 0, 21, GOLD); ctx.fillRect(22, 10.5, 4, 10);
    ctx.fillStyle = K.lg(ctx, 0, 9, 0, 22, [STONE[0], STONE[1]]); ctx.beginPath(); ctx.ellipse(33, 15.5, 3.4, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#15180f'; ctx.beginPath(); ctx.ellipse(33.6, 15.5, 1.8, 3.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // dust sifting off the crest during the tell
    if (P.tell > 0.05) {
      const R = K.rand(31);
      for (let i = 0; i < 8; i++) { const fx = (R() - 0.5) * 44, fy = -40 + frac(t * 1.6 + R()) * 60; ctx.fillStyle = `rgba(220,214,180,${0.6 * P.tell})`; ctx.beginPath(); ctx.arc(fx, fy, 0.6 + R(), 0, TAU); ctx.fill(); }
    }
    ctx.restore();
    // muzzle puff + the volley
    const R = K.rand(77);
    for (let i = 0; i < 3; i++) {
      const tl = P.u - DART_FIRE - i * DART_GAP; if (tl < 0) continue;
      const dy = (i - 1) * 6 * s, dist = Math.abs(farX - bore) - 8 * s, x0 = bore + dir * 4 * s;
      const trav = Math.min(dist, tl * DART_SPEED), xx = x0 + dir * trav, stuck = trav >= dist;
      const a = stuck ? 1 - sm(DART_P - 0.35, DART_P - 0.05, P.u) : 1;
      if (tl < 0.25) { const pa = 1 - tl / 0.25; ctx.fillStyle = `rgba(222,216,186,${0.55 * pa})`; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(bore + dir * (6 + k * 4) * s * (1 + tl * 4), lane + dy + (R() - 0.5) * 8 * s, (3 + k) * s * (0.6 + tl * 3), 0, TAU); ctx.fill(); } }
      if (!stuck) K.danger(ctx, xx, lane + dy, 14 * s, 0.22);
      dart(ctx, xx, lane + dy, dir, s * 1.2, a);
      if (stuck && P.u - DART_FIRE - i * DART_GAP - dist / DART_SPEED < 0.15) { ctx.fillStyle = 'rgba(210,200,170,.55)'; ctx.beginPath(); ctx.arc(farX - dir * 2, lane + dy, 4 * s, 0, TAU); ctx.fill(); }
    }
  }

  // ================================================================ HONEYCOMB HIVE
  const WAX = ['#ffe39a', '#e8a63a', '#9a5a14'], WAX_EDGE = '#6e3a08';
  const HONEY = ['#fff2b8', '#ffb420', '#c4600a'], HONEY_EDGE = '#8a3c04';
  const SQ3 = Math.sqrt(3);
  function hexAt(ctx, x, y, r) { ctx.moveTo(x, y - r); for (let k = 1; k < 6; k++) { const a = -PI / 2 + k * PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }

  function hiveFar(ctx, w, h, t, layer, col) {
    const R = K.rand(layer ? 91 : 57), slabs = layer ? [[0.18, 0.42, 50], [0.86, 0.3, 46]] : [[0.32, 0.55, 70], [0.6, 0.36, 60], [0.92, 0.6, 64], [0.05, 0.3, 50]];
    const shapes = [], boxes = [];
    for (const [fx, fl, sw] of slabs) {
      const x = fx * w, len = fl * h;
      const p = new Path2D(); p.moveTo(x - sw / 2, -4); p.lineTo(x - sw / 2 + 4, len * 0.7);
      p.quadraticCurveTo(x - sw * 0.3, len, x - sw * 0.05, len * 0.92); p.quadraticCurveTo(x + sw * 0.15, len * 1.08, x + sw * 0.32, len * 0.86);
      p.lineTo(x + sw / 2, -4); p.closePath(); shapes.push(p); boxes.push([x - sw / 2 + 4, 0, x + sw / 2, len * 0.72]);
      // a honey strand hanging off the tip
      const sl = 16 + R() * 30;
      p.rect(x + sw * 0.1 - 1.2, len * 0.95, 2.4, sl); p.moveTo(x + sw * 0.1 + 3, len * 0.95 + sl); p.arc(x + sw * 0.1, len * 0.95 + sl, 3, 0, TAU);
    }
    // mounds of comb from below
    const m = new Path2D();
    for (let x = -10; x <= w + 20; x += 22 + R() * 14) { const r = (layer ? 18 : 26) + R() * 22, cy = h + r * 0.35 - R() * 30; m.moveTo(x + r, cy); m.arc(x, cy, r, 0, TAU); }
    m.rect(-4, h - 20, w + 8, 24); shapes.push(m); boxes.push([0, h - 24, w, h + 10]);
    for (const p of shapes) ctx.fill(p);
    // faint comb texture: lighter cells inside each slab (tested against the slab's rough box; no clipping)
    ctx.save(); ctx.strokeStyle = K.rgb(K.lift(col, 16), 0.85); ctx.lineWidth = 1; ctx.beginPath();
    const r = layer ? 9 : 7;
    for (const [bx0, by0, bx1, by1] of boxes) {
      const r0 = Math.floor(by0 / (r * 1.5));
      for (let row = r0, y = r0 * r * 1.5; y < by1 - r; row++, y += r * 1.5) { const o = (row & 1) * r * SQ3 / 2; for (let x = Math.ceil((bx0 + r - o) / (r * SQ3)) * r * SQ3 + o; x < bx1 - r; x += r * SQ3) hexAt(ctx, x, y, r * 0.8); }
    }
    ctx.stroke(); ctx.restore();
  }

  function hiveWall(ctx, side, edge, w, h, t, scroll) {
    const r = 8.2, dx = r * SQ3, dy = r * 1.5, off = ((scroll % (dy * 2)) + dy * 2) % (dy * 2), r0 = Math.round((scroll - off) / dy);
    const xa = side < 0 ? -dx : w * 0.7, xb = side < 0 ? w * 0.3 : w + dx;
    const empty = new Path2D(), honey = new Path2D(), cap = new Path2D(), glints = new Path2D(), drops = new Path2D();
    for (let row = -2; row * dy - off < h + r * 2; row++) {
      const y = row * dy - off, id = row + r0, R = K.rand((id + 4000) * 977 + (side < 0 ? 3 : 1301)), x0 = (id & 1) * dx / 2;
      for (let x = Math.floor((xa - x0) / dx) * dx + x0; x < xb; x += dx) {
        const k = R(), target = k < 0.45 ? honey : k < 0.7 ? cap : empty;
        hexAt(target, x, y, r * 0.8);
        if (target === honey) { glints.moveTo(x - r * 0.25 + 1.6, y - r * 0.3); glints.arc(x - r * 0.25, y - r * 0.3, 1.6, 0, TAU); if (R() < 0.15) { drops.moveTo(x + 2.4, y + r * 0.7); drops.arc(x, y + r * 0.7, 2.4, 0, TAU); } }
      }
    }
    // wax walls between the cells
    ctx.fillStyle = 'rgba(180,110,34,.35)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a1e06'; ctx.fill(empty);
    ctx.fillStyle = K.lg(ctx, 0, 0, side < 0 ? w * 0.18 : w * 0.82, 0, side < 0 ? ['#7a3a06', '#ffa818'] : ['#ffa818', '#7a3a06']); ctx.fill(honey);
    ctx.fillStyle = side < 0 ? K.lg(ctx, 0, 0, w * 0.18, 0, ['#8a6a3a', '#f4dc9a']) : K.lg(ctx, w * 0.82, 0, w, 0, ['#f4dc9a', '#8a6a3a']); ctx.fill(cap);
    ctx.fillStyle = 'rgba(255,250,220,.75)'; ctx.fill(glints);
    ctx.fillStyle = '#ffb420'; ctx.fill(drops);
    // deep shadow away from the lit edge
    ctx.fillStyle = side < 0 ? K.lg(ctx, 0, 0, w * 0.14, 0, ['rgba(20,8,0,.75)', 'rgba(20,8,0,0)']) : K.lg(ctx, w * 0.86, 0, w, 0, ['rgba(20,8,0,0)', 'rgba(20,8,0,.75)']);
    ctx.fillRect(0, 0, w, h);
  }

  const HIVE = {
    bgTop: [146, 116, 76], bgBot: [74, 52, 30], far: [124, 98, 64], far2: [108, 84, 52],
    wall: [70, 40, 12], wallIn: [24, 12, 3], rim: [255, 196, 80], seed: 3, wobble: 1.1, farShape: hiveFar, wallDeco: hiveWall,
  };

  // honey oozing over a wall's lit edge (slow drips stretching and letting go)
  function honeyOoze(ctx, edge, side, h, t, seed) {
    const R = K.rand(seed);
    for (let i = 0; i < 5; i++) {
      const y = h * (0.08 + i * 0.2 + R() * 0.08), x = edge(y) + side * -1.5, ph = R(), u = frac(t / 3.6 + ph);
      const len = 6 + 22 * sm(0, 0.8, u), r = 2.6 + 1.6 * sm(0.4, 0.8, u);
      ctx.fillStyle = K.lg(ctx, x - 4, 0, x + 4, 0, [HONEY[1], HONEY[2]]);
      ctx.beginPath(); ctx.moveTo(x - side * 1, y - 8); ctx.quadraticCurveTo(x - side * 6, y, x - side * 2.4, y + len * 0.5);
      ctx.lineTo(x - side * 2.6, y + len); ctx.arc(x - side * 2.6, y + len, r, PI, 0, true); ctx.lineTo(x - side * 1.2, y + len * 0.5); ctx.quadraticCurveTo(x - side * 1, y, x - side * -2, y - 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,220,.7)'; ctx.beginPath(); ctx.arc(x - side * 2.6 - r * 0.35, y + len - r * 0.3, r * 0.3, 0, TAU); ctx.fill();
      if (u > 0.8) { const f = (u - 0.8) / 0.2, fy = y + len + f * f * 120; ctx.fillStyle = HONEY[1]; ctx.beginPath(); ctx.ellipse(x - side * 2.6, fy, 2.2, 3.4, 0, 0, TAU); ctx.fill(); }
    }
  }

  // ---- Bee Swarm
  function bee(ctx, x, y, s, t, ph, face, angry) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.rotate(Math.sin(t * 9 + ph) * 0.15);
    const fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 55 + ph * 7));
    // wings
    ctx.save(); ctx.globalAlpha = 0.7;
    for (const [wx, wa] of [[-1.5, -0.5], [1.5, 0.2]]) { ctx.save(); ctx.translate(wx, -3.5); ctx.rotate(wa); ctx.scale(1, fl); ctx.fillStyle = K.lg(ctx, 0, -7, 0, 0, ['rgba(255,255,255,.9)', 'rgba(200,236,255,.45)']); ctx.beginPath(); ctx.ellipse(0, -4.5, 3, 5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,230,.8)'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.restore(); }
    ctx.restore();
    // stinger
    ctx.fillStyle = '#5a2e06'; ctx.beginPath(); ctx.moveTo(-6.4, -0.8); ctx.lineTo(-9.4, 0.4); ctx.lineTo(-6.2, 1.4); ctx.fill();
    // body
    const body = () => { ctx.beginPath(); ctx.ellipse(0, 0.4, 7, 5.2, 0, 0, TAU); };
    body(); ctx.fillStyle = K.rg(ctx, -2, -2.6, 8, ['#fff4a8', '#ffc21e', '#c8700a']); ctx.fill();
    ctx.save(); body(); ctx.clip(); ctx.fillStyle = '#4a2606';
    ctx.beginPath(); ctx.ellipse(-1.8, 0.4, 1.4, 6, 0, 0, TAU); ctx.ellipse(-5.4, 0.4, 1.2, 6, 0, 0, TAU); ctx.fill(); ctx.restore();
    body(); ctx.strokeStyle = '#8a4a06'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,240,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-0.5, 0, 5, 3.4, 0, 3.6, 4.6); ctx.stroke();
    // antennae + eye
    ctx.strokeStyle = '#4a2606'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(4.5, -3.5); ctx.quadraticCurveTo(6, -7, 8, -7.4); ctx.moveTo(3.4, -4); ctx.quadraticCurveTo(4, -7.6, 5.4, -8.4); ctx.stroke();
    ctx.fillStyle = '#4a2606'; ctx.beginPath(); ctx.arc(8, -7.4, 0.9, 0, TAU); ctx.arc(5.4, -8.4, 0.9, 0, TAU); ctx.fill();
    K.eyes(ctx, 4.2, -0.6, 1.9, 1.9, '#7a3c0a', 0.8, angry);
    ctx.restore();
  }

  // hive pod hanging from (x,y) on a twig from the wall at wx
  function hivePod(ctx, x, y, wx, s, t, shake) {
    ctx.save(); ctx.lineCap = 'round';
    for (const [lw, c] of [[5 * s, '#4a2a0e'], [2.6 * s, '#8a5a28']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(wx, y - 6 * s); ctx.quadraticCurveTo((wx + x) / 2, y - 12 * s, x, y + 2 * s); ctx.stroke(); }
    ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 46) * 0.07 * shake);
    K.glow(ctx, 0, 34, 60, [255, 180, 60], 0.25 + 0.15 * shake);
    const pod = () => { ctx.beginPath(); ctx.moveTo(-4, 0); ctx.bezierCurveTo(-26, 8, -30, 40, -14, 56); ctx.quadraticCurveTo(0, 64, 14, 56); ctx.bezierCurveTo(30, 40, 26, 8, 4, 0); ctx.closePath(); };
    pod(); ctx.fillStyle = K.rg(ctx, -9, 16, 44, ['#ffe7a6', '#e2a446', '#9c5c1c']); ctx.fill();
    ctx.save(); pod(); ctx.clip();
    for (let k = 0; k < 6; k++) {
      const yy = 8 + k * 9, wv = 30;
      ctx.strokeStyle = 'rgba(120,64,14,.6)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, yy, wv, 5, 0, 0.15, PI - 0.15); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,190,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, yy - 2.4, wv, 5, 0, 0.3, PI - 0.3); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80,40,6,.35)'; ctx.beginPath(); ctx.ellipse(14, 34, 14, 30, 0, 0, TAU); ctx.fill();
    ctx.restore();
    pod(); ctx.strokeStyle = WAX_EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    K.sheen(ctx, -8, 22, 18, 0.45, 3.4, 4.5);
    // entrance + glow inside + honey lip
    ctx.fillStyle = K.rg(ctx, 0, 42, 9, ['#ffb030', '#6a2e04', '#3a1802']); ctx.beginPath(); ctx.ellipse(0, 42, 8, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = HONEY_EDGE; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = HONEY[1]; ctx.beginPath(); ctx.moveTo(-7, 45); ctx.quadraticCurveTo(0, 50, 7, 45); ctx.quadraticCurveTo(3, 50, 2, 53); ctx.arc(1, 53.5, 2, 0, PI); ctx.quadraticCurveTo(-1, 50, -7, 45); ctx.fill();
    // angry eyes in the dark doorway while it rouses
    if (shake > 0.2) K.eyes(ctx, 0, 41.5, 3.4, 2.4 * shake, '#ff6a20', 0, 1);
    ctx.restore();
  }

  const BEE_P = 4;
  // the swarm's centre from the pod (home) out to (tx,ty) and back
  function swarmState(t, hx, hy, tx, ty, side) {
    const u = frac(t / BEE_P) * BEE_P;
    const rouse = sm(0.7, 1.4, u) * (1 - sm(3.5, 3.95, u));
    const out = sm(1.4, 2.5, u), back = sm(2.7, 3.8, u);
    let cx, cy;
    if (u < 2.6) { const k = out; cx = lerp(hx, tx, k) + Math.sin(k * PI) * side * -10; cy = lerp(hy, ty, k) + Math.sin(k * PI) * 30; }
    else { const k = back; cx = lerp(tx, hx, k) + Math.sin(k * PI) * side * -40; cy = lerp(ty, hy, k) - Math.sin(k * PI) * 40; }
    const spread = 1 + 0.25 * sm(1.4, 2.0, u) * (1 - sm(2.6, 3.4, u));
    const vx = u < 2.6 ? Math.sign(tx - hx) : Math.sign(hx - tx);
    return { u, cx, cy, rouse, spread, face: (u > 1.3 && u < 3.9) ? vx : -side, attack: sm(1.3, 1.6, u) * (1 - sm(2.6, 3.0, u)) };
  }
  function drawSwarm(ctx, S, s, t, n) {
    const R = K.rand(55);
    K.glow(ctx, S.cx, S.cy, 50 * s, [255, 190, 60], 0.18 + 0.12 * S.rouse);
    K.danger(ctx, S.cx, S.cy, 44 * s, 0.18 + 0.2 * S.attack);
    const bees = [];
    for (let i = 0; i < n; i++) {
      const ph = R() * TAU, w1 = 2 + R() * 2.5, w2 = 2.5 + R() * 2.5, rx = (10 + R() * 22) * s, ry = (8 + R() * 16) * s;
      // at home most bees are inside: they peek out and buzz in a small loop; roused, they all pour out
      const outK = clamp(S.rouse * 1.4 - i / n * 0.6, 0, 1) * (1 - 0) + (i < 3 ? 1 : 0);
      const k = Math.min(1, outK), sp = S.spread * (0.35 + 0.65 * k);
      bees.push([S.cx + Math.cos(t * w1 + ph) * rx * sp, S.cy + Math.sin(t * w2 + ph * 1.3) * ry * sp, k, ph]);
    }
    // buzz trails
    ctx.save(); ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]);
    for (const [x, y, k, ph] of bees) if (k > 0.3) { ctx.beginPath(); ctx.arc(x - 4 * s, y + 2 * s, 7 * s, ph, ph + 1.4); ctx.stroke(); }
    ctx.restore();
    bees.sort((a, b) => a[1] - b[1]);
    for (const [x, y, k, ph] of bees) if (k > 0.02) bee(ctx, x, y, s * (0.6 + 0.4 * k) * 1.3, t, ph, S.face, S.attack > 0.3 ? 0.6 : 0);
  }

  // ---- Honey Drip
  const HONEY_P = 3.2;
  // one drip from (x, y0): a bead swells, stretches, lets go and falls to `stop`; u = seconds into its cycle
  function honeyDrip(ctx, x, y0, s, u, stop) {
    const grow = sm(0, 1.3, u), str = sm(1.15, 1.6, u), fallT = u - 1.6;
    const r = (3 + 5 * grow) * s;
    ctx.save();
    const fillDrop = (x0, y1, rr, gx) => { ctx.fillStyle = K.rg(ctx, x0 - rr * 0.4, y1 - rr * 0.4, rr * 1.6, HONEY); ctx.fill(); ctx.strokeStyle = HONEY_EDGE; ctx.lineWidth = 0.9; ctx.stroke(); };
    if (fallT < 0) {
      const by = y0 + (4 + 4 * grow + 14 * str) * s, nw = (3.5 - 1.8 * str) * s;
      ctx.beginPath(); ctx.moveTo(x - nw - 2 * s, y0); ctx.bezierCurveTo(x - nw, y0 + 4 * s, x - r, by - r * 1.2, x - r, by);
      ctx.arc(x, by, r, PI, 0, true); ctx.bezierCurveTo(x + r, by - r * 1.2, x + nw, y0 + 4 * s, x + nw + 2 * s, y0); ctx.closePath();
      fillDrop(x, by, r);
      ctx.fillStyle = 'rgba(255,255,235,.8)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, by - r * 0.35, r * 0.22, r * 0.32, -0.4, 0, TAU); ctx.fill();
      K.glow(ctx, x, by, r * 3, [255, 190, 60], 0.25 * grow);
    } else {
      const fy = y0 + 22 * s + 0.5 * 900 * fallT * fallT, v = 900 * fallT, stretch = 1 + Math.min(1.2, v / 500);
      if (fy < stop) {
        const rr = 7.5 * s;
        ctx.beginPath(); ctx.moveTo(x, fy - rr * 1.6 * stretch); ctx.bezierCurveTo(x + rr * 0.3, fy - rr * stretch, x + rr, fy - rr * 0.5, x + rr, fy);
        ctx.arc(x, fy, rr, 0, PI); ctx.bezierCurveTo(x - rr, fy - rr * 0.5, x - rr * 0.3, fy - rr * stretch, x, fy - rr * 1.6 * stretch); ctx.closePath();
        fillDrop(x, fy, rr);
        ctx.fillStyle = 'rgba(255,255,235,.8)'; ctx.beginPath(); ctx.ellipse(x - rr * 0.4, fy - rr * 0.2, rr * 0.2, rr * 0.36, -0.3, 0, TAU); ctx.fill();
        K.glow(ctx, x, fy, rr * 3, [255, 190, 60], 0.22);
      }
      // the thread it leaves behind, snapping back up
      const th = 1 - sm(0, 0.25, fallT);
      if (th > 0) { ctx.strokeStyle = `rgba(255,170,30,${th})`; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + (6 + 30 * th) * s); ctx.stroke(); }
      // a little bead regrowing
      ctx.fillStyle = HONEY[1]; ctx.beginPath(); ctx.arc(x, y0 + 3 * s, 3 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
    return u >= 1.6 ? y0 + 22 * s + 450 * (u - 1.6) ** 2 : null;
  }
  const hitTime = (y0, s, stop) => 1.6 + Math.sqrt(Math.max(0, stop - y0 - 22 * s) / 450);

  // a slab of comb overhead with a lumpy underside; returns nothing. drips hang from its bottom at xs
  function ceilComb(ctx, x0, x1, yb, t, xs) {
    const R = K.rand(23);
    const bot = []; for (let x = x0; x <= x1 + 1; x += 7) { let b = (R() - 0.5) * 7; for (const xd of xs) b += 10 * Math.exp(-(((x - xd) / 7) ** 2)); bot.push([x, yb + b]); }
    const p = new Path2D(); p.moveTo(x0, -4); p.lineTo(x0, bot[0][1]);
    for (let i = 1; i < bot.length; i++) { const [xa, ya] = bot[i - 1], [xb2, yb2] = bot[i]; p.quadraticCurveTo((xa + xb2) / 2, Math.max(ya, yb2) + 3, xb2, yb2); }
    p.quadraticCurveTo(x1 + 6, yb * 0.35, x1 - 4, -4); p.closePath();
    K.shadow(ctx, (x0 + x1) / 2, yb + 8, (x1 - x0) * 0.5, 10, 0.35);
    ctx.fillStyle = K.lg(ctx, 0, -4, 0, yb + 10, ['#7a4610', '#b07024', '#6a360a']); ctx.fill(p);
    ctx.save(); ctx.clip(p);
    const r = 9, honey = new Path2D(), cap = new Path2D(), dark = new Path2D(), gl = new Path2D();
    for (let row = 0, y = -2; y < yb + 14; row++, y += r * 1.5) for (let x = x0 - r + (row & 1) * r * SQ3 / 2; x < x1 + r; x += r * SQ3) {
      const k = R(), T = k < 0.55 ? honey : k < 0.82 ? cap : dark;
      T.moveTo(x, y - r * 0.78); for (let j = 1; j < 6; j++) { const a = -PI / 2 + j * PI / 3; T.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); } T.closePath();
      if (T === honey) { gl.moveTo(x - 1.6 + 1.8, y - 2.4); gl.arc(x - 1.6, y - 2.4, 1.8, 0, TAU); }
    }
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, yb + 10, ['#b86a14', '#d47a0e', '#f09a1c']); ctx.fill(honey);
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, yb + 10, ['#a07a44', '#d8bc7c']); ctx.fill(cap);
    ctx.fillStyle = '#4a2406'; ctx.fill(dark);
    ctx.fillStyle = 'rgba(255,255,235,.6)'; ctx.fill(gl);
    ctx.fillStyle = K.lg(ctx, 0, -4, 0, yb * 0.5, ['rgba(40,16,2,.55)', 'rgba(40,16,2,0)']); ctx.fillRect(x0, -4, x1 - x0, yb * 0.5 + 4);
    ctx.fillStyle = K.lg(ctx, 0, yb - 14, 0, yb + 12, ['rgba(80,36,4,0)', 'rgba(80,36,4,.55)']); ctx.fillRect(x0, yb - 14, x1 - x0, 30);
    ctx.restore();
    ctx.strokeStyle = WAX_EDGE; ctx.lineWidth = 1.2; ctx.stroke(p);
    // warm light glowing through the comb
    K.glow(ctx, (x0 + x1) / 2, yb * 0.7, (x1 - x0) * 0.45, [255, 170, 50], 0.07 + 0.03 * Math.sin(t * 2));
  }

  // a lump of comb bulging out of a wall (side -1 left), cells glowing with honey
  function combShelf(ctx, ex, y, side, t) {
    const R = K.rand(41), cx = ex - side * 14, rx = 34, ry = 20;
    const p = new Path2D(); p.ellipse(cx, y, rx, ry, 0, 0, TAU);
    K.shadow(ctx, cx - side * 6, y + ry + 4, rx * 0.9, 6, 0.4);
    K.glow(ctx, cx - side * 10, y, 50, [255, 170, 50], 0.18);
    ctx.fillStyle = K.rg(ctx, cx - 10, y - 10, rx * 1.3, ['#d8963a', '#9a5a18', '#5a3008']); ctx.fill(p);
    ctx.save(); ctx.clip(p);
    const r = 6.5, honey = new Path2D(), cap = new Path2D(), dark = new Path2D(), gl = new Path2D();
    for (let row = 0, yy = y - ry; yy < y + ry + r; row++, yy += r * 1.5) for (let x = cx - rx + (row & 1) * r * SQ3 / 2; x < cx + rx + r; x += r * SQ3) {
      const k = R(), T = k < 0.55 ? honey : k < 0.8 ? cap : dark; hexAt(T, x, yy, r * 0.78);
      if (T === honey) { gl.moveTo(x - 1.2 + 1.3, yy - 1.8); gl.arc(x - 1.2, yy - 1.8, 1.3, 0, TAU); }
    }
    ctx.fillStyle = K.lg(ctx, 0, y - ry, 0, y + ry, ['#f0a020', '#c86a0a']); ctx.fill(honey);
    ctx.fillStyle = K.lg(ctx, 0, y - ry, 0, y + ry, ['#e8d49a', '#a07a44']); ctx.fill(cap);
    ctx.fillStyle = '#4a2406'; ctx.fill(dark);
    ctx.fillStyle = 'rgba(255,255,235,.6)'; ctx.fill(gl);
    ctx.fillStyle = K.rg(ctx, cx - 12, y - 12, rx * 1.4, ['rgba(255,240,200,0)', 'rgba(255,240,200,0)', 'rgba(50,20,0,.6)']); ctx.fillRect(cx - rx, y - ry, rx * 2, ry * 2);
    ctx.restore();
    ctx.strokeStyle = WAX_EDGE; ctx.lineWidth = 1.2; ctx.stroke(p);
    K.sheen(ctx, cx - 4, y - 2, ry, 0.35, 3.5, 4.6);
    // honey running off its lip
    const u = frac(t / 2.8), dx = cx - side * 16, len = 8 + 14 * sm(0, 0.8, u);
    ctx.fillStyle = K.lg(ctx, dx - 3, 0, dx + 3, 0, [HONEY[1], HONEY[2]]);
    ctx.beginPath(); ctx.moveTo(dx - 5, y + ry * 0.75); ctx.quadraticCurveTo(dx - 2, y + ry, dx - 1.6, y + ry + len); ctx.arc(dx, y + ry + len, 2.6 + sm(0.5, 0.8, u), PI, 0, true); ctx.quadraticCurveTo(dx + 2, y + ry, dx + 5, y + ry * 0.7); ctx.fill();
    if (u > 0.8) { const f = (u - 0.8) / 0.2; ctx.fillStyle = HONEY[1]; ctx.beginPath(); ctx.ellipse(dx, y + ry + len + f * f * 90, 2.2, 3.2, 0, 0, TAU); ctx.fill(); }
  }

  // honey coat on the rocket after a hit (k: 0..1 how gooey)
  function honeyCoat(ctx, x, y, s, k, t) {
    if (k <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, k * 1.5) * 0.85;
    const d1 = 3 + 6 * k, d2 = 2 + 9 * k, d3 = 1 + 4 * k;
    ctx.fillStyle = K.lg(ctx, -8, -23, 6, 0, ['rgba(255,236,150,.95)', 'rgba(255,176,32,.9)', 'rgba(214,104,10,.9)']);
    ctx.beginPath(); ctx.moveTo(-9.5, -12); ctx.quadraticCurveTo(-9, -23, 0, -23); ctx.quadraticCurveTo(9, -23, 9.5, -12);
    // drips running down over the goggles and onto the pod
    ctx.lineTo(9, -6 + d3); ctx.arc(7.8, -6 + d3, 1.3, 0, PI); ctx.lineTo(6.5, -8);
    ctx.quadraticCurveTo(4, -6, 3.4, -4 + d2); ctx.arc(1.8, -4 + d2, 1.7, 0, PI); ctx.quadraticCurveTo(0, -6, -2.5, -8);
    ctx.lineTo(-4, -8 + d1); ctx.arc(-5.3, -8 + d1, 1.4, 0, PI); ctx.lineTo(-6.8, -9);
    ctx.quadraticCurveTo(-9.5, -9, -9.5, -12); ctx.fill();
    ctx.strokeStyle = 'rgba(138,60,4,.7)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,235,.9)'; ctx.beginPath(); ctx.ellipse(-4, -19, 2.2, 1.2, -0.4, 0, TAU); ctx.fill();
    // a sticky film over the dome of the pod
    ctx.fillStyle = 'rgba(255,170,30,.35)'; ctx.beginPath(); ctx.ellipse(0, -2, 11, 6, 0, PI, TAU); ctx.fill();
    ctx.restore();
  }

  function splashBits(ctx, x, y, s, dt) {
    if (dt < 0 || dt > 0.45) return;
    const R = K.rand(88);
    for (let i = 0; i < 7; i++) {
      const a = -PI / 2 + (R() - 0.5) * 2.6, v = (60 + R() * 70) * s;
      const px = x + Math.cos(a) * v * dt, py = y + Math.sin(a) * v * dt + 300 * dt * dt;
      ctx.fillStyle = `rgba(255,${170 + R() * 50 | 0},30,${1 - dt / 0.45})`; ctx.beginPath(); ctx.arc(px, py, (1.5 + R() * 1.6) * s, 0, TAU); ctx.fill();
    }
  }

  // ================================================================ REGISTRATIONS
  PV.obstacles.axe = (ctx, w, h, t) => {
    const E = K.shaft(ctx, w, h, t, TEMPLE);
    const yl = 22, xL = E.L(yl + 10) - 6, xR = E.R(yl + 10) + 6;
    torch(ctx, E.L(250) - 2, 250, 1, 0.8, t); torch(ctx, E.R(230) + 2, 230, -1, 0.8, t + 0.7);
    lintel(ctx, xL, xR, yl, 0.95, t);
    vine(ctx, xL + 18, yl + 22, 46, t, 4, 1); vine(ctx, xR - 26, yl + 22, 34, t, 9, -1);
    // the rocket hovers below, timing its pass
    K.rocket(ctx, w * 0.5, 282 + Math.sin(t * 2) * 3, 0.8, t);
    drawAxe(ctx, w / 2, yl + 13, 0.8, t, 0.68);
    K.motes(ctx, w, h, t, 'dust', [255, 232, 180], 30, 5);
  };

  PV.obstacles.dart = (ctx, w, h, t) => {
    const E = K.shaft(ctx, w, h, t, TEMPLE);
    const ty = 130, farX = E.R(ty + 15);
    torch(ctx, E.R(70) + 2, 70, -1, 0.8, t);
    vine(ctx, E.L(20) + 2, 0, 60, t, 3, 1);
    // the rocket holds below the lane while the volley passes
    const P = totemPhase(t);
    const ry = 250 - 8 * Math.sin(t * 2) * (1 - P.tell);
    K.rocket(ctx, w * 0.56, ry, 0.8, t);
    drawTotem(ctx, E.L(ty) + 14, ty, 1, 0.95, t, farX);
    vine(ctx, E.R(180) - 2, 160, 50, t, 12, -1);
    K.motes(ctx, w, h, t, 'dust', [255, 232, 180], 30, 5);
  };

  PV.sections.temple = (ctx, w, h, t) => {
    const E = K.shaft(ctx, w, h, t, TEMPLE);
    // set dressing: torches, vines, a ledge with a little gold idol
    torch(ctx, E.L(200) - 2, 200, 1, 0.75, t); torch(ctx, E.R(320) + 2, 320, -1, 0.75, t + 0.6); torch(ctx, E.R(118) + 2, 118, -1, 0.65, t + 1.3);
    // ledge on the right with an idol
    const lx = E.R(420), ly = 420;
    ctx.fillStyle = K.lg(ctx, 0, ly, 0, ly + 12, STONE); ctx.fillRect(lx - 38, ly, 40, 11); ctx.strokeStyle = STONE_EDGE; ctx.lineWidth = 1; ctx.strokeRect(lx - 38, ly, 40, 11);
    ctx.fillStyle = 'rgba(255,255,220,.3)'; ctx.fillRect(lx - 38, ly, 40, 1.2);
    K.glow(ctx, lx - 20, ly - 10, 26, [255, 210, 90], 0.4);
    ctx.fillStyle = K.lg(ctx, lx - 27, ly - 20, lx - 13, ly, GOLD); ctx.beginPath(); ctx.moveTo(lx - 27, ly); ctx.lineTo(lx - 25, ly - 12); ctx.arc(lx - 20, ly - 15, 6, PI * 0.9, PI * 0.1); ctx.lineTo(lx - 13, ly); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_EDGE; ctx.stroke();
    ctx.fillStyle = '#7a2a0a'; ctx.beginPath(); ctx.arc(lx - 22, ly - 15.5, 1.2, 0, TAU); ctx.arc(lx - 18, ly - 15.5, 1.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6f9e3e'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(lx - 36 + k * 7, ly + 1, 2.5 + (k % 2), 0, TAU); ctx.fill(); }
    // hazards
    const xL = E.L(36) - 10, xR = E.R(36) + 12;
    lintel(ctx, xL, xR, 26, 0.8, t);
    vine(ctx, xL + 16, 44, 40, t, 4, 1); vine(ctx, xR - 22, 44, 56, t, 7, -1);
    vine(ctx, E.L(300) + 1, 280, 58, t, 15, 1); vine(ctx, E.R(0), -4, 70, t, 21, -1);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    drawTotem(ctx, E.L(262) + 12, 262, 1, 0.78, t, E.R(274));
    drawAxe(ctx, w / 2, 36, 0.66, t, 0.62);
    K.motes(ctx, w, h, t, 'dust', [255, 232, 180], 34, 8);
    K.motes(ctx, w, h, t, 'pollen', [255, 214, 120], 6, 12);
  };

  PV.obstacles.bees = (ctx, w, h, t) => {
    const E = K.shaft(ctx, w, h, t, HIVE);
    honeyOoze(ctx, y => E.L(y), -1, h, t, 5);
    const hy = 70, hx = E.R(hy) - 40;
    const S = swarmState(t, hx, hy + 44, w * 0.4, 230, 1);
    const u = S.u, rx = w * 0.42 - 70 * sm(1.6, 2.1, u) * (1 - sm(3.0, 3.8, u)) + 0;
    K.rocket(ctx, rx + 24, 252 + Math.sin(t * 2.2) * 3, 0.8, t);
    hivePod(ctx, hx, hy, E.R(hy - 8) + 4, 0.95, t, S.rouse * (1 - S.attack * 0.6));
    drawSwarm(ctx, S, 1, t, 14);
    honeyOoze(ctx, y => E.R(y), 1, h, t, 9);
    K.motes(ctx, w, h, t, 'pollen', [255, 226, 120], 12, 4);
  };

  PV.obstacles.honey = (ctx, w, h, t) => {
    const E = K.shaft(ctx, w, h, t, HIVE);
    const yb = 54, xs = [w * 0.3, w * 0.5, w * 0.7];
    honeyOoze(ctx, y => E.L(y), -1, h, t, 15);
    honeyOoze(ctx, y => E.R(y), 1, h, t, 19);
    // the rocket in the centre lane takes a hit, gets coated and sags, then shakes it off
    const rx = w * 0.5, rest = 262, stop = rest - 22;
    const u = frac(t / HONEY_P) * HONEY_P, hit = hitTime(yb + 6, 1.25, stop), dt = u - hit;
    const goo = dt >= 0 ? 1 - sm(0.5, HONEY_P - hit - 0.05, dt) : 0;
    const ry = rest + 16 * (dt >= 0 ? sm(0, 0.18, dt) * goo : 0) + (dt >= 0 ? Math.sin(dt * 30) * 1.5 * goo : 0);
    K.rocket(ctx, rx, ry, 0.8, t);
    honeyCoat(ctx, rx, ry, 0.8, goo, t);
    if (dt >= 0) { // sticky strings dripping off the pod
      for (const [ox, ph] of [[-8, 0], [6, 0.4]]) { const v = frac(dt * 1.4 + ph), dy = v * v * 40; ctx.fillStyle = `rgba(255,170,30,${goo * (1 - v)})`; ctx.beginPath(); ctx.ellipse(rx + ox * 0.8, ry + 10 + dy, 1.8, 2.6, 0, 0, TAU); ctx.fill(); }
    }
    splashBits(ctx, rx, stop + 4, 1, dt);
    ceilComb(ctx, E.L(30) - 8, E.R(30) + 8, yb, t, xs);
    honeyDrip(ctx, xs[1], yb + 6, 1.25, u, stop);
    honeyDrip(ctx, xs[0], yb + 6, 1.05, frac((t + 1.1) / HONEY_P) * HONEY_P, h + 40);
    honeyDrip(ctx, xs[2], yb + 6, 1.05, frac((t + 2.2) / HONEY_P) * HONEY_P, h + 40);
    K.motes(ctx, w, h, t, 'pollen', [255, 226, 120], 12, 4);
  };

  PV.sections.hive = (ctx, w, h, t) => {
    const E = K.shaft(ctx, w, h, t, HIVE);
    honeyOoze(ctx, y => E.L(y), -1, h, t, 25);
    honeyOoze(ctx, y => E.R(y), 1, h, t, 29);
    // comb overhang from the left wall with drips
    const yb = 70, cx1 = w * 0.68, xs = [w * 0.24, w * 0.46];
    ceilComb(ctx, E.L(40) - 10, cx1, yb, t, xs);
    honeyDrip(ctx, xs[0], yb + 6, 1, frac(t / HONEY_P) * HONEY_P, h + 40);
    honeyDrip(ctx, xs[1], yb + 6, 1, frac((t + 1.6) / HONEY_P) * HONEY_P, h + 40);
    combShelf(ctx, E.L(330), 330, -1, t);
    const hy = 210, hx = E.R(hy) - 34;
    const S = swarmState(t, hx, hy + 36, w * 0.42, h * 0.66, 1);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    hivePod(ctx, hx, hy, E.R(hy - 8) + 4, 0.8, t, S.rouse * (1 - S.attack * 0.6));
    drawSwarm(ctx, S, 0.8, t, 12);
    K.motes(ctx, w, h, t, 'pollen', [255, 226, 120], 14, 6);
  };
})();
