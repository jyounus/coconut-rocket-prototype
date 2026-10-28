// Wild group: Dewdrop Meadow, Moonflower Garden, Harvest Cane Field, Whale's Belly, Midnight Trench.
// ===================================================================================================
// DEWDROP MEADOW: shrunk to bug size in a dawn meadow, climbing between giant grass blades. Sun Lens, Dew Web, Dandelion Puff.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const edgeOf = (side, w) => { const a = side < 0 ? 0.7 : 2.4; return y => { const d = 38 + Math.sin(y * 0.017 + a) * 8 + Math.sin(y * 0.05 + a) * 3; return side < 0 ? d : w - d; }; };

  // a shiny water drop: clear body tinted by what's behind, a bright caustic below, a hot highlight on top
  function drop(ctx, x, y, r, a = 1) {
    ctx.fillStyle = K.rg2(ctx, x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r, [[0, 'rgba(255,255,255,0.15)'], [0.7, 'rgba(200,240,255,0.25)'], [1, 'rgba(120,180,200,0.55)']]);
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,230,.75)'; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.5, r * 0.45, r * 0.22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,120,110,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, r - 0.4, 0.3, 2.6); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function dawn(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#ffe2c0', '#ffc8a8', '#f0b0a0', '#9cd0a8', '#5aa07a']); ctx.fillRect(0, 0, w, h);
    // the low gold sun, huge through the haze
    K.glow(ctx, w * 0.4, h * 0.36, 120, [255, 230, 160], 0.4);
    ctx.fillStyle = K.rg2(ctx, w * 0.4, h * 0.36, 4, w * 0.4, h * 0.36, 34, [[0, '#fffef0'], [0.8, '#fff0b8'], [1, '#ffe0a0', 0]]); ctx.beginPath(); ctx.arc(w * 0.4, h * 0.36, 34, 0, TAU); ctx.fill();
    // far blurry grass blades and clover in layers (soft, hazy)
    const blades = (n, seed, c, hgt, wd) => { const r = K.rand(seed); ctx.fillStyle = c; for (let i = 0; i < n; i++) { const x = r() * w, lean = (r() - 0.5) * 60 + Math.sin(t * 0.6 + i) * 3, top = h - hgt * (0.5 + r() * 0.5); ctx.beginPath(); ctx.moveTo(x - wd, h); ctx.quadraticCurveTo(x - wd * 0.3, (h + top) / 2, x + lean, top); ctx.quadraticCurveTo(x + wd * 0.3, (h + top) / 2, x + wd, h); ctx.fill(); } };
    blades(10, 3, 'rgba(110,180,110,.5)', h * 0.75, 7);
    // a clover leaf and a blurry bokeh of dew sparkles
    ctx.fillStyle = 'rgba(120,190,110,.5)'; for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - PI / 2; ctx.beginPath(); ctx.ellipse(w * 0.7 + Math.cos(a) * 14, h * 0.62 + Math.sin(a) * 14, 14, 11, a, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(120,190,110,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.7, h * 0.62); ctx.quadraticCurveTo(w * 0.72, h * 0.8, w * 0.68, h); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 16; k++) { const x = ((k * 71) % 100) / 100 * w, y = ((k * 37) % 100) / 100 * h, r = 6 + (k % 4) * 3, a = 0.07 + 0.05 * Math.sin(t * 1.5 + k); ctx.fillStyle = K.rg(ctx, x, y, r, [`rgba(255,250,220,${a})`, 'rgba(255,250,220,0)']); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.restore();
    blades(8, 9, 'rgba(70,150,80,.55)', h * 0.5, 9);
    // the twist: higher up the meadow is brighter and drier; a warm wash at the top
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h * 0.5, ['rgba(255,250,220,.2)', 'rgba(255,250,220,0)']); ctx.fillRect(0, 0, w, h * 0.5);
  }

  // a wall of overlapping giant grass blades: long glossy green ribbons with a midrib and dew beads
  function grass(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.18, step: 3,
      fill: () => K.lg(ctx, X(0), 0, X(54), 0, ['#2e5a2a', '#4a8a3a', '#6aa84a']),
      deco: () => {
        // blades crossing up the wall, each a slanted ribbon
        for (let k = 0; k < 9; k++) {
          const y0 = h + 40 - k * 70, x0 = X(-10 + (k % 3) * 8), x1 = X(70), y1 = y0 - 150, c = [[90, 160, 60], [120, 180, 70], [70, 140, 60]][k % 3];
          ctx.fillStyle = K.lg(ctx, x0, y0, x1, y1, [K.lift(c, -40), c, K.lift(c, 40)]);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(X(30), y0 - 70, x1, y1); ctx.lineTo(x1, y1 + 30); ctx.quadraticCurveTo(X(26), y0 - 40, x0, y0 + 40); ctx.closePath(); ctx.fill();
          K.pair(ctx, () => { ctx.moveTo(x0, y0 + 20); ctx.quadraticCurveTo(X(28), y0 - 55, x1, y1 + 15); }, rgb(K.lift(c, -60), 0.6), rgb(K.lift(c, 80), 0.6), 1.2, 1.2);
          ctx.strokeStyle = 'rgba(255,255,230,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 + 2); ctx.quadraticCurveTo(X(30), y0 - 68, x1, y1 + 2); ctx.stroke();
        }
        // dew beads on the blades; fewer higher up (the sun is drying them)
        const r = K.rand(side < 0 ? 21 : 43);
        for (let i = 0; i < 22; i++) { const y = r() * h, x = X(6 + r() * 40); if (r() > 0.25 + 0.75 * (y / h)) continue; drop(ctx, x, y, 2 + r() * 3.5); }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(24), 0, ['rgba(20,50,20,.45)', 'rgba(20,50,20,0)']); ctx.fillRect(side < 0 ? 0 : w - 24, 0, 24, h);
      },
      lip: ['#2e5a2a', '#8cc860', '#e8ffd0'], lipW: 2.2,
    });
    return ex;
  }

  // a ladybird walking along the lip, and a snail shell resting (set dressing)
  function critters(ctx, w, h, t, L, R) {
    const v = ph(t * 0.08, 1), y = lerp(470, 200, v), x = L(y) + 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-PI / 2 + 0.2);
    ctx.fillStyle = K.rg2(ctx, -2, -2, 1, 0, 0, 7, [[0, '#ff8a7a'], [0.6, '#e8302a'], [1, '#a0101a']]); ctx.beginPath(); ctx.ellipse(0, 0, 6, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.arc(5, 0, 2.8, 0, TAU); ctx.fill(); ctx.fillRect(-6, -0.3, 11, 0.6);
    for (const [dx, dy] of [[-2, -2.5], [1.5, 2.5], [-3, 2], [2, -2]]) { ctx.beginPath(); ctx.arc(dx, dy, 1, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-2, -2.5, 1.6, 0.8, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    const sx = R(452) - 6, sy = 452;
    ctx.fillStyle = K.rg2(ctx, sx - 3, sy - 4, 1, sx, sy, 10, [[0, '#ffe8c0'], [0.6, '#d8a060'], [1, '#8a5a30']]); ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,30,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let a = 0; a < 10; a += 0.3) { const r = 9 - a * 0.85; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.stroke();
  }

  // ---------- Sun Lens: a big dewdrop on a swaying blade focuses the sun into a dot that warms, then burns, tracking along ----------
  const SL = { y: 112, P: 4, o: 0.3 };
  function lens(ctx, w, h, t, R) {
    const u = ph(t, SL.P, SL.o), ex = R(SL.y + 30), warm = smooth(0.4, 1.2, u) * (1 - smooth(3.3, 3.8, u)), burn = smooth(1.3, 1.6, u) * (1 - smooth(2.9, 3.3, u));
    // the blade: arcing out of the right wall, its tip drooping with the drop's weight, swaying
    const sway = Math.sin(u / SL.P * TAU) * 0.5;
    const bx0 = ex + 6, by0 = SL.y + 40, tipX = ex - 96 + sway * 40, tipY = SL.y + 6 + Math.abs(sway) * 6;
    ctx.fillStyle = K.lg(ctx, bx0, by0, tipX, tipY, ['#3d7a3a', '#6aa84a', '#a8d870']);
    ctx.beginPath(); ctx.moveTo(bx0, by0 + 14); ctx.quadraticCurveTo(ex - 40, SL.y - 26, tipX, tipY); ctx.quadraticCurveTo(ex - 40, SL.y - 34, bx0, by0 - 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(240,255,200,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx0, by0 + 1); ctx.quadraticCurveTo(ex - 40, SL.y - 25, tipX, tipY); ctx.stroke();
    // the focused dot: on the shaft below, sliding along the path the sway draws
    const dx = tipX + 6 + sway * 30, dy = tipY + 84;
    // the cone of light from the drop to the dot (it narrows to the focus)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.lg(ctx, 0, tipY + 6, 0, dy, [`rgba(255,240,180,${0.05 + 0.2 * warm})`, `rgba(255,200,120,${0.1 + 0.4 * warm})`]);
    ctx.beginPath(); ctx.moveTo(tipX - 12, tipY + 8); ctx.lineTo(tipX + 12, tipY + 8); ctx.lineTo(dx + 2, dy); ctx.lineTo(dx - 2, dy); ctx.fill();
    ctx.restore();
    if (warm > 0.05) {
      const rr = 6 + burn * 5;
      if (burn > 0.1) K.danger(ctx, dx, dy, 34, 0.4 * burn);
      K.glow(ctx, dx, dy, 22 + burn * 14, [255, lerp(230, 140, burn), lerp(150, 80, burn)], 0.5 + 0.4 * warm);
      ctx.fillStyle = K.rg2(ctx, dx, dy, 0, dx, dy, rr, [[0, '#ffffff'], [0.5, burn > 0.3 ? '#ffd080' : '#fff4c0'], [1, burn > 0.3 ? 'rgba(255,90,60,0)' : 'rgba(255,220,120,0)']]); ctx.beginPath(); ctx.arc(dx, dy, rr, 0, TAU); ctx.fill();
      // its scorch trail and a wisp of smoke while burning
      if (burn > 0.1) for (let k = 0; k < 4; k++) { const v = ph(t * 1.4 + k / 4, 1); ctx.fillStyle = `rgba(150,130,120,${0.35 * burn * (1 - v)})`; ctx.beginPath(); ctx.arc(dx + Math.sin(t * 3 + k) * 4, dy - 6 - v * 24, 2 + v * 5, 0, TAU); ctx.fill(); }
    }
    // the great dewdrop clinging under the tip, wobbling
    const dr = 19 + Math.sin(t * 5) * 0.7;
    drop(ctx, tipX, tipY + dr * 0.85, dr);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, tipX + 2, tipY + dr + 4, 8, [`rgba(255,250,200,${0.4 + 0.4 * warm})`, 'rgba(255,250,200,0)']); ctx.beginPath(); ctx.arc(tipX + 2, tipY + dr + 4, 8, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ---------- Dew Web: a beaded spider web across part of the shaft; it sags with drops and springs you back down ----------
  const DW = { y: 270, P: 4, o: 1.6 };
  function web(ctx, w, h, t, L) {
    const u = ph(t, DW.P, DW.o), ex = L(DW.y), cx = ex + 66, cy = DW.y, R0 = 64;
    const sag = 4 + 6 * smooth(0.5, 2.0, u) * (1 - smooth(2.6, 3.0, u)), twang = bump(u, 2.6, 2.7, 2.9, 3.6) * Math.sin((u - 2.6) * 30);
    // anchor threads to the wall and to a grass stem; the spokes and spiral, beaded with drops
    const N = 9, pt = (a, r) => [cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 0.9 + sag * (r / R0) * (1 + Math.sin(a)) * 0.6 + twang * 6 * (r / R0)];
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const a = i / N * TAU + 0.15, [x, y] = pt(a, R0); ctx.moveTo(cx, cy + sag * 0.3); ctx.lineTo(x, y); }
    for (let ring = 1; ring <= 5; ring++) { for (let i = 0; i <= N; i++) { const a = i / N * TAU + 0.15, [x, y] = pt(a, R0 * ring / 5.4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }
    // anchor lines
    const [lx, ly] = pt(PI + 0.15, R0); ctx.moveTo(lx, ly); ctx.lineTo(ex - 4, ly - 6);
    const [ax, ay] = pt(-PI / 2 + 0.3, R0); ctx.moveTo(ax, ay); ctx.lineTo(ax + 12, ay - 40);
    const [bx, by] = pt(0.6, R0); ctx.moveTo(bx, by); ctx.lineTo(bx + 18, by + 44);
    ctx.strokeStyle = 'rgba(50,100,80,.35)'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1; ctx.stroke();
    // the push zone glow and the dew beads (bigger at the bottom where they gather)
    K.glow(ctx, cx, cy + 8, 70, [200, 240, 255], 0.2 + 0.25 * Math.abs(twang));
    for (let ring = 2; ring <= 5; ring++) for (let i = 0; i < N; i++) { if ((i + ring) % 2) continue; const a = i / N * TAU + 0.15 + 0.3, [x, y] = pt(a, R0 * ring / 5.4); drop(ctx, x, y + 2, 1.6 + Math.max(0, Math.sin(a)) * 2.4); }
    // the spider, keeping watch at the hub, with big shiny eyes
    const sx = cx, sy = cy + sag * 0.3;
    ctx.strokeStyle = '#4a3a3a'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) for (const d of [-1, 1]) { const a = -0.8 + k * 0.5; ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + d * Math.cos(a) * 7, sy + Math.sin(a) * 7 - 3, sx + d * Math.cos(a) * 10, sy + Math.sin(a) * 9 + 2); } ctx.stroke();
    ctx.fillStyle = K.rg2(ctx, sx - 2, sy - 2, 1, sx, sy, 6, [[0, '#ffd0a0'], [0.6, '#c8703a'], [1, '#7a3a20']]); ctx.beginPath(); ctx.ellipse(sx, sy + 2, 4.5, 5.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy - 4, 3.2, 0, TAU); ctx.fill();
    K.eyes(ctx, sx, sy - 4.5, 3, 1.5, '#5ac8ff', 0, 0);
  }

  // ---------- Dandelion Puff: a dandelion clock sheds a seed; catch the parachute and float up gently ----------
  const DP = { y: 404, P: 4, o: 2.5 };
  function dandelion(ctx, w, h, t, R) {
    const u = ph(t, DP.P, DP.o), ex = R(DP.y), cx = ex - 44, cy = DP.y, shiver = bump(u, 0.3, 0.4, 0.7, 0.8) * Math.sin(t * 40) * 1.5;
    // the stem from the wall
    ctx.strokeStyle = '#5aa04a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex + 4, cy + 70); ctx.quadraticCurveTo(ex - 30, cy + 50, cx + shiver, cy + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,255,190,.6)'; ctx.lineWidth = 1; ctx.stroke();
    // the clock: a sphere of seeds, each a stalk and a fluffy white star
    ctx.fillStyle = K.rg(ctx, cx, cy, 34, ['rgba(255,255,255,.45)', 'rgba(255,255,255,0)']); ctx.beginPath(); ctx.arc(cx + shiver, cy, 34, 0, TAU); ctx.fill();
    for (let i = 0; i < 40; i++) {
      const a = i * 2.4, z = Math.cos(i * 1.7), r = 24 * Math.sqrt(1 - z * z * 0.6), x = cx + shiver + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      ctx.strokeStyle = 'rgba(230,230,210,.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(cx + shiver, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); for (let k = 0; k < 6; k++) { const b = k * PI / 3 + a; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(b) * 4.4, y + Math.sin(b) * 4.4); } ctx.stroke();
    }
    ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(cx + shiver, cy, 3.5, 0, TAU); ctx.fill();
    // the seed parachute: lets go, drifts out over the shaft and up; a gentle helper glow
    const go = smooth(0.8, 3.8, u), sx = cx - go * 90 + Math.sin(go * 9) * 8, sy = cy - go * 170;
    if (u > 0.8) {
      K.glow(ctx, sx, sy, 28, [180, 255, 200], 0.35 * (1 - smooth(3.4, 3.8, u)));
      ctx.globalAlpha = 1 - smooth(3.5, 3.9, u);
      ctx.strokeStyle = 'rgba(240,240,220,.95)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 14); ctx.stroke();
      ctx.fillStyle = '#a8804a'; ctx.beginPath(); ctx.ellipse(sx, sy + 16, 1.4, 3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); for (let k = 0; k < 11; k++) { const b = PI + k * PI / 10; ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(b) * 11, sy + Math.sin(b) * 6 - 2); } ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  PV.sections['dewdrop'] = (ctx, w, h, t) => {
    dawn(ctx, w, h, t);
    const L = grass(ctx, -1, w, h, t), R = grass(ctx, 1, w, h, t);
    critters(ctx, w, h, t, L, R);
    for (const [x, y, o] of [[0.5, 66, 0], [0.62, 350, 1.4]]) K.coin(ctx, w * x, y, 0.62, t, o);
    dandelion(ctx, w, h, t, R);
    web(ctx, w, h, t, L);
    lens(ctx, w, h, t, R);
    K.rocket(ctx, w * 0.5, h * 0.9, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 250, 220], 14, 11);
  };
})();

// ===================================================================================================
// MOONFLOWER GARDEN: a night garden of trellis and vines that opens in moonlight. Moon Bloom, Sleepy Pollen, Creeping Tendril.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const MOON = [220, 236, 255], VIO = [180, 140, 255], MINT = [122, 240, 192];
  const edgeOf = (side, w) => { const a = side < 0 ? 1.1 : 3.3; return y => { const d = 40 + Math.sin(y * 0.024 + a) * 6 + Math.sin(y * 0.071 + a) * 3; return side < 0 ? d : w - d; }; };
  // moonlight: a cloud slides off the moon; the lit edge creeps down the shaft from the top, then the next cloud covers it again
  const MP = { P: 4, o: 0.0 };
  const moonEdge = (t, h) => { const u = ph(t, MP.P, MP.o); return lerp(-20, h + 20, smooth(0.2, 1.8, u)) * (1 - smooth(3.0, 3.6, u)) + (u > 3.0 ? 0 : 0); };
  const moonLit = t => { const u = ph(t, MP.P, MP.o); return smooth(0.0, 0.4, u) * (1 - smooth(2.9, 3.4, u)); };

  function sky(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#0a2228', '#123a3a', '#16463e', '#1a3a3a', '#0e2426']); ctx.fillRect(0, 0, w, h);
    const r = K.rand(17);
    for (let i = 0; i < 34; i++) { const x = r() * w, y = r() * h * 0.6, a = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.9)); ctx.fillStyle = `rgba(230,240,255,${a})`; ctx.fillRect(x, y, 1.1, 1.1); }
    // the moon, and the cloud passing over it
    const mx = w * 0.5, my = 56, lit = moonLit(t);
    K.glow(ctx, mx, my, 90, MOON, 0.15 + 0.35 * lit);
    ctx.fillStyle = K.rg2(ctx, mx - 6, my - 6, 2, mx, my, 22, [[0, '#ffffff'], [0.7, '#e8f0ff'], [1, '#b8c8e8']]); ctx.beginPath(); ctx.arc(mx, my, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,170,210,.4)'; ctx.beginPath(); ctx.arc(mx - 7, my + 4, 4, 0, TAU); ctx.arc(mx + 6, my - 6, 3, 0, TAU); ctx.arc(mx + 8, my + 8, 2, 0, TAU); ctx.fill();
    const u = ph(t, MP.P, MP.o), cx = u < 2.9 ? lerp(mx, mx + 120, smooth(0.0, 0.5, u)) : lerp(mx - 130, mx, smooth(2.9, 3.4, u));
    const cloud = (x, y, s, a) => { ctx.fillStyle = K.lg(ctx, 0, y - 14 * s, 0, y + 10 * s, [`rgba(80,110,130,${a})`, `rgba(40,70,80,${a})`]); ctx.beginPath(); ctx.arc(x - 18 * s, y, 11 * s, 0, TAU); ctx.arc(x, y - 6 * s, 15 * s, 0, TAU); ctx.arc(x + 18 * s, y, 12 * s, 0, TAU); ctx.rect(x - 28 * s, y, 56 * s, 9 * s); ctx.fill(); ctx.strokeStyle = `rgba(220,236,255,${0.5 * a})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y - 6 * s, 15 * s, 3.4, 5.6); ctx.stroke(); };
    cloud(cx, my + 4, 1.3, 0.95); cloud(w * 0.15 + Math.sin(t * 0.1) * 6, 120, 0.8, 0.5); cloud(w * 0.85, 160, 0.7, 0.45);
    // far trellis arches and hedge silhouettes
    ctx.strokeStyle = 'rgba(60,110,100,.45)'; ctx.lineWidth = 3; for (const [x, y, rr] of [[w * 0.3, h * 0.62, 40], [w * 0.72, h * 0.56, 34]]) { ctx.beginPath(); ctx.arc(x, y, rr, PI, 0); ctx.lineTo(x + rr, y + 80); ctx.moveTo(x - rr, y); ctx.lineTo(x - rr, y + 80); ctx.stroke(); }
    ctx.fillStyle = 'rgba(14,50,48,.8)'; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 10) ctx.lineTo(x, h * 0.74 - Math.abs(Math.sin(x * 0.05)) * 18); ctx.lineTo(w, h); ctx.fill();
    // far glowing buds dotted about
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 10; k++) { const x = ((k * 53) % 100) / 100 * w, y = h * (0.45 + ((k * 31) % 40) / 100), a = 0.25 + 0.2 * Math.sin(t * 1.4 + k); ctx.fillStyle = K.rg(ctx, x, y, 6, [rgb(k % 2 ? VIO : MINT, a), rgb(k % 2 ? VIO : MINT, 0)]); ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); } ctx.restore();
  }

  // walls: dense vine tangle over a wooden trellis, pale blossoms, glowing buds, a sleeping beetle
  function vines(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.35, step: 3,
      fill: () => K.lg(ctx, X(0), 0, X(54), 0, ['#061818', '#0e2e2c', '#1a4a40']),
      deco: () => {
        // trellis lattice
        ctx.strokeStyle = 'rgba(120,96,70,.6)'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let y = -60; y < h + 60; y += 26) { ctx.moveTo(X(-4), y); ctx.lineTo(X(60), y + 50); ctx.moveTo(X(-4), y + 50); ctx.lineTo(X(60), y); } ctx.stroke();
        ctx.strokeStyle = 'rgba(200,170,130,.25)'; ctx.lineWidth = 0.8; ctx.stroke();
        // leaves: heart-shaped, glossy dark green with a lit vein, in clumps
        const r = K.rand(side < 0 ? 5 : 55);
        for (let i = 0; i < 46; i++) {
          const y = r() * (h + 20) - 10, x = X(r() * 52), a = r() * TAU, s = 6 + r() * 5, c = [[40, 110, 90], [30, 90, 80], [60, 130, 100]][i % 3];
          ctx.save(); ctx.translate(x, y); ctx.rotate(a);
          ctx.fillStyle = K.lg(ctx, -s, -s, s, s, [K.lift(c, 40), c, K.lift(c, -30)]); ctx.beginPath(); ctx.moveTo(0, s); ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.7, -s * 1.2, 0, -s * 0.5); ctx.bezierCurveTo(s * 0.7, -s * 1.2, s * 1.4, 0, 0, s); ctx.fill();
          ctx.strokeStyle = 'rgba(180,255,220,.35)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(0, s * 0.8); ctx.stroke();
          ctx.restore();
        }
        // pale trumpet blossoms facing out, and glowing buds
        for (let i = 0; i < 6; i++) {
          const y = (i + 0.5) * h / 6 + (side < 0 ? 0 : 30), x = X(18 + r() * 18), rr = 7 + r() * 3;
          ctx.fillStyle = K.rg2(ctx, x, y, 1, x, y, rr, [[0, '#fff8d0'], [0.4, '#f0f6ff'], [1, '#a8b8d8']]); ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + i; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); ctx.lineTo(x + Math.cos(a + 0.63) * rr * 0.75, y + Math.sin(a + 0.63) * rr * 0.75); } ctx.fill();
          K.glow(ctx, x, y, 16, MOON, 0.18);
          const bx = X(10 + r() * 30), by = y + 30, a = 0.5 + 0.4 * Math.sin(t * 1.8 + i * 1.3);
          K.glow(ctx, bx, by, 9, i % 2 ? VIO : MINT, 0.6 * a);
          ctx.fillStyle = rgb(K.lift(i % 2 ? VIO : MINT, 40)); ctx.beginPath(); ctx.ellipse(bx, by, 2.4, 3.4, 0, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(26), 0, ['rgba(0,10,10,.6)', 'rgba(0,10,10,0)']); ctx.fillRect(side < 0 ? 0 : w - 26, 0, 26, h);
      },
      lip: ['#0a2a28', '#3a7a64', '#a8f0d0'], lipW: 2,
    });
    return ex;
  }

  // the creeping moonlight: a pale wash over the lit part of the shaft, with a soft edge travelling down (the bloom's tell)
  function moonlight(ctx, w, h, t) {
    const e = moonEdge(t, h), lit = moonLit(t);
    if (lit < 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, Math.max(10, e), ['rgba(180,210,255,.10)', 'rgba(180,210,255,.06)']); ctx.globalAlpha = lit; ctx.fillRect(0, 0, w, Math.max(0, e));
    ctx.fillStyle = K.lg(ctx, 0, e - 16, 0, e + 4, ['rgba(220,236,255,0)', 'rgba(220,236,255,.28)', 'rgba(220,236,255,0)']); ctx.fillRect(0, e - 16, w, 20);
    ctx.restore();
  }

  // ---------- Moon Bloom: a giant flower closed under cloud; when the moonlight edge reaches it, its thorny petals unfold across the shaft ----------
  const MB = { y: 150 };
  function bloom(ctx, w, h, t, R) {
    const ex = R(MB.y), cx = ex - 8, cy = MB.y, e = moonEdge(t, h), lit = moonLit(t);
    const open = smooth(cy - 30, cy + 10, e) * lit;
    // stem and sepals from the wall
    ctx.strokeStyle = '#2a6a50'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex + 10, cy + 40); ctx.quadraticCurveTo(ex - 6, cy + 24, cx, cy); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,255,200,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    if (open > 0.3) K.danger(ctx, cx - 60 * open, cy, 90 * open, 0.25 * open);
    K.glow(ctx, cx, cy, 30 + 70 * open, MOON, 0.15 + 0.3 * open);
    // the petals: long pale blades fanning out across the shaft (toward the left), each with thorns along the edge
    const N = 7;
    for (let i = 0; i < N; i++) {
      const base = PI + (i - (N - 1) / 2) * lerp(0.12, 0.42, open), L = lerp(26, 130, open) * (1 - Math.abs(i - 3) * 0.07), wd = lerp(6, 16, open);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(base);
      ctx.fillStyle = K.lg(ctx, 0, -wd, L, wd, ['#e8f0ff', '#f8fbff', '#c8b8f0']);
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(L * 0.5, -wd, L, 0); ctx.quadraticCurveTo(L * 0.5, wd, 0, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(160,140,230,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(L - 6, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, -wd * 0.5); ctx.quadraticCurveTo(L * 0.5, -wd * 0.85, L * 0.85, -2); ctx.stroke();
      // thorns
      if (open > 0.2) { ctx.fillStyle = '#9a6ad8'; for (let k = 1; k < 5; k++) { const x = L * k / 5, yy = wd * Math.sin(k / 5 * PI) * 0.62; ctx.beginPath(); ctx.moveTo(x - 2, -yy); ctx.lineTo(x + 2, -yy - 4 * open); ctx.lineTo(x + 2, -yy); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 2, yy); ctx.lineTo(x + 2, yy + 4 * open); ctx.lineTo(x + 2, yy); ctx.fill(); } }
      ctx.restore();
    }
    // the heart: a soft gold centre with stamens and big sleepy eyes that open with the bloom
    ctx.fillStyle = K.rg2(ctx, cx - 3, cy - 3, 1, cx, cy, 11, [[0, '#fffbe0'], [0.6, '#ffe48a'], [1, '#c8a040']]); ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fill();
    if (open > 0.3) K.eyes(ctx, cx - 1, cy - 1, 4, 2.2 * open, '#b48cff', -1, open);
    else { ctx.strokeStyle = '#8a6a30'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx - 3, cy - 1, 1.6, 0.2, PI - 0.2); ctx.arc(cx + 3, cy - 1, 1.6, 0.2, PI - 0.2); ctx.stroke(); }
  }

  // ---------- Sleepy Pollen: a bud nods and sighs out a glittering cloud; fly through it and your steering lags ----------
  const SP = { y: 282, P: 4, o: 1.3 };
  function pollen(ctx, w, h, t, L) {
    const u = ph(t, SP.P, SP.o), ex = L(SP.y), nod = bump(u, 0.2, 0.6, 0.8, 1.1), sigh = bump(u, 0.8, 1.4, 2.4, 3.6);
    const bx = ex + 34 + nod * 6, by = SP.y + nod * 10;
    // the nodding bud on a curling stem
    ctx.strokeStyle = '#2a6a50'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(ex - 4, SP.y + 30); ctx.quadraticCurveTo(ex + 30, SP.y + 30, bx - 6, by + 4); ctx.stroke();
    ctx.save(); ctx.translate(bx, by); ctx.rotate(0.3 + nod * 0.6);
    ctx.fillStyle = K.rg2(ctx, -3, -4, 1, 0, 0, 14, [[0, '#f0e0ff'], [0.5, '#b48cff'], [1, '#6a40b0']]); ctx.beginPath(); ctx.ellipse(4, 0, 13, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,140,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(4, -6, 16, -1); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(4, 6, 16, 1); ctx.stroke();
    ctx.fillStyle = '#2a6a50'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-4, -8, 2, -6); ctx.quadraticCurveTo(-2, 0, 2, 6); ctx.quadraticCurveTo(-4, 8, -9, 0); ctx.fill();
    // a drowsy face on the bud, yawning as it sighs
    ctx.strokeStyle = '#4a2a80'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(4, -2, 1.6, 0.2, PI - 0.2); ctx.arc(10, -2, 1.6, 0.2, PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#4a2a80'; ctx.beginPath(); ctx.ellipse(7, 3, 1.4 + sigh * 1.2, 1 + sigh * 2, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // the pollen cloud: violet glitter drifting out and slowly sinking, with soft glow
    if (sigh > 0.01) {
      const cx = bx + 20 + sigh * 50, cy = by + 6;
      K.glow(ctx, cx, cy, 30 + sigh * 40, VIO, 0.35 * sigh);
      for (let k = 0; k < 6; k++) { const a = k + t * 0.4, rr = 20 + sigh * 22, x = cx + Math.cos(a) * rr * 0.8, y = cy + Math.sin(a * 1.3) * rr * 0.5; ctx.fillStyle = K.rg2(ctx, x, y, 1, x, y, 16 + sigh * 8, [[0, VIO, 0.25 * sigh], [1, VIO, 0]]); ctx.beginPath(); ctx.arc(x, y, 16 + sigh * 8, 0, TAU); ctx.fill(); }
      for (let k = 0; k < 22; k++) { const a = k * 2.4 + t * 0.6, rr = (6 + (k % 6) * 8) * (0.4 + sigh * 0.6), x = cx + Math.cos(a) * rr * 1.2, y = cy + Math.sin(a) * rr * 0.6 + Math.sin(t * 2 + k) * 2; K.star4(ctx, x, y, 1.6 + (k % 3) * 0.6, k % 3 ? [230, 210, 255] : [255, 250, 200], 0.9 * sigh * (0.5 + 0.5 * Math.sin(t * 5 + k))); }
      // floating zzz
      ctx.fillStyle = `rgba(230,210,255,${0.8 * sigh})`; ctx.font = '700 9px system-ui'; ctx.fillText('z', cx + 10, cy - 20 - sigh * 6); ctx.font = '700 7px system-ui'; ctx.fillText('z', cx + 18, cy - 30 - sigh * 6);
    }
  }

  // ---------- Creeping Tendril: a vine tendril unfurls and slowly grows toward the rocket's warmth, then withers back ----------
  const CT = { y: 392, P: 4, o: 2.4 };
  function tendril(ctx, w, h, t, R, tx, ty) {
    const u = ph(t, CT.P, CT.o), ex = R(CT.y), grow = smooth(0.3, 2.4, u) * (1 - smooth(2.9, 3.8, u)), wither = smooth(2.9, 3.5, u);
    const x0 = ex + 4, y0 = CT.y, L = 30 + grow * 100, N = 14;
    // the path: from the wall, reaching toward the rocket, curling at the tip
    const ang = Math.atan2(ty - y0, tx - x0), pts = [];
    for (let k = 0; k <= N; k++) { const v = k / N, s = v * L, wave = Math.sin(v * 6 - t * 2) * 6 * v; pts.push([x0 + Math.cos(ang) * s - Math.sin(ang) * wave, y0 + Math.sin(ang) * s + Math.cos(ang) * wave]); }
    const [tx2, ty2] = pts[N];
    if (grow > 0.4) K.danger(ctx, tx2, ty2, 26, 0.35 * grow);
    const col = wither > 0.2 ? [120, 110, 70] : [70, 170, 110];
    for (let k = 1; k <= N; k++) { const lw = lerp(5, 1.4, k / N); ctx.strokeStyle = rgb(K.lift(col, -50)); ctx.lineWidth = lw + 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...pts[k - 1]); ctx.lineTo(...pts[k]); ctx.stroke(); ctx.strokeStyle = rgb(col); ctx.lineWidth = lw; ctx.stroke(); }
    ctx.strokeStyle = 'rgba(200,255,220,.45)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] - 1.5); for (let k = 1; k <= N; k++) ctx.lineTo(pts[k][0], pts[k][1] - 1.5); ctx.stroke(); ctx.lineCap = 'butt';
    // the curled tip, and little leaves and thorns along it
    ctx.strokeStyle = rgb(col); ctx.lineWidth = 1.4; ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) { const r = 7 - a * 0.7; ctx.lineTo(tx2 + Math.cos(a + t) * r, ty2 + Math.sin(a + t) * r); } ctx.stroke();
    for (let k = 3; k < N; k += 3) { const [x, y] = pts[k]; ctx.fillStyle = wither > 0.2 ? 'rgba(150,130,80,.9)' : '#5ac888'; ctx.beginPath(); ctx.ellipse(x + 4, y - 4, 5, 2.4, -0.7, 0, TAU); ctx.fill(); ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.moveTo(x - 1, y + 2); ctx.lineTo(x, y + 6); ctx.lineTo(x + 1.5, y + 2); ctx.fill(); }
    // warmth: a heat shimmer from the rocket the tendril is feeling for
    if (grow > 0.3) { ctx.strokeStyle = `rgba(255,190,140,${0.35 * grow})`; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 3; k++) { const rr = 18 + k * 8 + ph(t * 10, 8); ctx.moveTo(tx + rr, ty); ctx.arc(tx, ty, rr, 0, -PI * 0.9, true); } ctx.stroke(); }
  }

  PV.sections['moonflower'] = (ctx, w, h, t) => {
    sky(ctx, w, h, t);
    const L = vines(ctx, -1, w, h, t), R = vines(ctx, 1, w, h, t);
    moonlight(ctx, w, h, t);
    for (const [x, y, o] of [[0.36, 210, 0], [0.5, 340, 1.2]]) K.coin(ctx, w * x, y, 0.62, t, o);
    const rx = w * 0.42, ry = h * 0.9;
    tendril(ctx, w, h, t, R, rx, ry - 10);
    pollen(ctx, w, h, t, L);
    bloom(ctx, w, h, t, R);
    K.rocket(ctx, rx, ry, 0.75, t);
    K.motes(ctx, w, h, t, 'spore', [200, 230, 255], 16, 12);
  };
})();

// ===================================================================================================
// HARVEST CANE FIELD: up through towering sugar cane under a huge orange moon. Crow Murmuration, Dust Devil, Cane Wave.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const edgeOf = (side, w) => { const a = side < 0 ? 0.3 : 1.9; return y => { const d = 38 + Math.sin(y * 0.03 + a) * 5 + Math.sin(y * 0.11 + a) * 2; return side < 0 ? d : w - d; }; };

  function dusk(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#2a1a3a', '#5a2e5a', '#8a3e5a', '#d86a4a', '#ff8a3a']); ctx.fillRect(0, 0, w, h);
    // the harvest moon, huge and low, with faint craters
    const mx = w * 0.52, my = h * 0.5;
    K.glow(ctx, mx, my, 150, [255, 160, 80], 0.45);
    ctx.fillStyle = K.rg2(ctx, mx - 14, my - 16, 4, mx, my, 62, [[0, '#ffe8b0'], [0.6, '#ffb060'], [1, '#e87a3a']]); ctx.beginPath(); ctx.arc(mx, my, 60, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(200,100,50,.3)'; for (const [x, y, r] of [[-18, -10, 9], [14, 12, 12], [20, -22, 6], [-10, 26, 5]]) { ctx.beginPath(); ctx.arc(mx + x, my + y, r, 0, TAU); ctx.fill(); }
    // the far field: rows of cane silhouettes in layers, a barn with a lit window, and a windmill
    const cane = (y0, c, hh, seed) => { const r = K.rand(seed); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y0 - r() * hh - Math.sin(x * 0.1 + t * 0.8) * 2); ctx.lineTo(w, h); ctx.fill(); };
    ctx.fillStyle = 'rgba(60,30,50,.8)'; ctx.fillRect(w * 0.14, h * 0.62, 34, 26); ctx.beginPath(); ctx.moveTo(w * 0.14 - 4, h * 0.62); ctx.lineTo(w * 0.14 + 17, h * 0.62 - 16); ctx.lineTo(w * 0.14 + 38, h * 0.62); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,90,.9)'; ctx.fillRect(w * 0.14 + 13, h * 0.62 + 8, 8, 8);
    const wx = w * 0.82, wy = h * 0.58; ctx.strokeStyle = 'rgba(60,30,50,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx - 6, wy + 40); ctx.lineTo(wx, wy); ctx.lineTo(wx + 6, wy + 40); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = t * 0.8 + k * PI / 2; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 18, wy + Math.sin(a) * 18); } ctx.stroke();
    cane(h * 0.7, 'rgba(90,40,60,.85)', 14, 3);
    cane(h * 0.8, 'rgba(60,30,50,.92)', 18, 7);
    // pumpkin lanterns glowing in the far rows
    for (const [x, y] of [[0.3, 0.78], [0.66, 0.82]]) { K.glow(ctx, w * x, h * y, 16, [255, 160, 60], 0.6); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.ellipse(w * x, h * y, 6, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffe080'; ctx.fillRect(w * x - 3, h * y - 1, 2, 2); ctx.fillRect(w * x + 1, h * y - 1, 2, 2); }
  }

  // a wall of cane: tall jointed stalks (rings at each node), long leaves arching out, stakes and twine
  function caneWall(ctx, side, w, h, t, bend) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.3, step: 3,
      fill: () => K.lg(ctx, X(0), 0, X(52), 0, ['#2a1a2a', '#4a2e3a', '#6a4a3a']),
      deco: () => {
        for (let k = 0; k < 8; k++) {
          const d = 3 + k * 6.5, c = [[232, 196, 106], [200, 160, 80], [220, 180, 90], [170, 130, 70]][k % 4], node = 30 + (k % 3) * 6, off = k * 13;
          const x = X(d);
          ctx.fillStyle = K.lg(ctx, x - 3, 0, x + 3, 0, [K.lift(c, -60), c, K.lift(c, 40), K.lift(c, -40)]); ctx.fillRect(x - 3, -4, 6, h + 8);
          for (let y = -off % node; y < h; y += node) { ctx.fillStyle = rgb(K.lift(c, -80), 0.85); ctx.fillRect(x - 3.4, y, 6.8, 2.2); ctx.fillStyle = rgb(K.lift(c, 60), 0.7); ctx.fillRect(x - 3, y + 2.2, 6, 0.8); }
        }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(26), 0, ['rgba(20,8,20,.55)', 'rgba(20,8,20,0)']); ctx.fillRect(side < 0 ? 0 : w - 26, 0, 26, h);
      },
      lip: ['#3a2a2a', '#c8a050', '#ffe6a0'], lipW: 2,
    });
    // long cane leaves arching out over the edge (unclipped), swaying; on the left wall the gust wave bends them
    const r = K.rand(side < 0 ? 3 : 8);
    for (let i = 0; i < 12; i++) {
      const y = i * 42 + r() * 20, e = ex(y), L = 34 + r() * 20, sw = Math.sin(t * 1.4 + i) * 0.08 + (bend ? bend(y) : 0) * 0.9;
      const a0 = side < 0 ? -0.5 + sw : PI + 0.5 - sw;
      const x1 = e + Math.cos(a0) * L, y1 = y + Math.sin(a0) * L, x2 = x1 + Math.cos(a0 + side * -0.9) * L * 0.4, y2 = y1 + Math.sin(a0 + side * -0.9) * L * 0.4 + 6;
      ctx.fillStyle = K.lg(ctx, e, y, x2, y2, ['#7a8a3a', '#c8b860', '#e8d890']); ctx.beginPath(); ctx.moveTo(e, y - 2); ctx.quadraticCurveTo(x1, y1 - 3, x2, y2); ctx.quadraticCurveTo(x1, y1 + 3, e, y + 3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,180,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(e, y); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
    }
    return ex;
  }

  // ---------- Crow Murmuration: the flock wheels across the shaft as one shape, ribbon then ring; the hole is the way through ----------
  const CM = { y: 132, P: 4, o: 0.4 };
  function crows(ctx, w, h, t, L, R) {
    const u = ph(t, CM.P, CM.o), ring = smooth(0.9, 1.8, u) * (1 - smooth(2.9, 3.7, u)), cx = w / 2 + Math.sin(u / CM.P * TAU) * 20, cy = CM.y;
    const N = 40, gapAt = 0.62; // the ribbon has a hole near this fraction
    K.danger(ctx, cx, cy, 100, 0.15 + 0.1 * ring);
    for (let i = 0; i < N; i++) {
      const f = i / N, ff = f < gapAt - 0.06 ? f * 0.88 : f * 0.88 + 0.12; // leave a gap in the ribbon
      // ribbon: an S wave across the shaft; ring: a circle with an open middle
      const rx = lerp(L(cy) + 10, R(cy) - 10, ff), ry = cy + Math.sin(ff * TAU * 1.3 + t * 2) * 22;
      const a = f * TAU + t * 1.2, cxr = cx + Math.cos(a) * 64, cyr = cy + Math.sin(a) * 44;
      const jit = Math.sin(t * 7 + i * 3.3) * 2;
      const x = lerp(rx, cxr, ring) + jit, y = lerp(ry, cyr, ring) + Math.cos(t * 6 + i) * 2;
      // each crow: a plump dark body with glossy blue-violet sheen and flapping wings
      const flap = Math.sin(t * 14 + i * 1.7), s = 1.5 + (i % 4) * 0.15, dir = Math.cos(a + PI / 2) > 0 ? 1 : -1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s * (ring > 0.5 ? dir : 1), s);
      ctx.fillStyle = '#2a1a2e'; ctx.beginPath(); ctx.moveTo(-6, -flap * 4); ctx.quadraticCurveTo(-3, -1, 0, 0); ctx.quadraticCurveTo(3, -1, 6, -flap * 4); ctx.quadraticCurveTo(3, 2, 0, 2); ctx.quadraticCurveTo(-3, 2, -6, -flap * 4); ctx.fill();
      ctx.fillStyle = K.lg(ctx, -3, -2, 3, 2, ['#5a4a7a', '#2a1a2e']); ctx.beginPath(); ctx.ellipse(0, 0.5, 3.6, 2.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(3.4, 0); ctx.lineTo(5.4, 0.6); ctx.lineTo(3.4, 1.2); ctx.fill();
      ctx.fillStyle = '#ffd860'; ctx.fillRect(2.2, -0.6, 0.9, 0.9);
      ctx.restore();
    }
    // the hole: a faint ring of light showing the way through
    const hx = lerp(lerp(L(cy) + 10, R(cy) - 10, gapAt), cx, ring), hy = lerp(cy + Math.sin(gapAt * TAU * 1.3 + t * 2) * 22, cy, ring);
    ctx.strokeStyle = 'rgba(255,220,150,.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, lerp(14, 30, ring), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }

  // ---------- Dust Devil: a whirl of chaff spins up, wanders across the shaft shoving you sideways, then fades ----------
  const DD = { y: 300, P: 4, o: 1.6 };
  function devil(ctx, w, h, t, L, R) {
    const u = ph(t, DD.P, DD.o), spin = smooth(0.2, 1.0, u) * (1 - smooth(3.0, 3.8, u)), walk = smooth(0.9, 3.0, u);
    const bx = lerp(L(DD.y) + 30, R(DD.y) - 30, walk), by = DD.y + 40, H = 30 + 80 * spin;
    if (spin > 0.05) {
      // the funnel: stacked ellipses of dusty air, wider at the top, with streaks going round
      for (let k = 0; k < 9; k++) {
        const v = k / 8, y = by - v * H, rw = (6 + v * 34) * (0.5 + spin * 0.5), x = bx + Math.sin(t * 3 + v * 4) * 6 * v;
        ctx.fillStyle = `rgba(232,196,140,${0.22 * spin})`; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.28, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,230,180,${0.8 * spin})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.28, 0, t * 9 + k, t * 9 + k + 1.8); ctx.stroke();
      }
      // chaff and leaves whirling round it
      for (let k = 0; k < 16; k++) {
        const v = ((k * 37) % 16) / 16, y = by - v * H, a = t * 8 + k * 1.3, rw = (6 + v * 34) * (0.5 + spin * 0.5), x = bx + Math.sin(t * 3 + v * 4) * 6 * v + Math.cos(a) * rw, z = Math.sin(a);
        ctx.fillStyle = k % 3 ? `rgba(232,196,106,${0.9 * spin})` : `rgba(200,90,50,${0.9 * spin})`; ctx.save(); ctx.translate(x, y + z * rw * 0.28); ctx.rotate(a); ctx.fillRect(-3, -0.8, 6, 1.6); ctx.restore();
      }
      // shove arrows to show which way it pushes
      ctx.strokeStyle = `rgba(255,220,170,${0.6 * spin})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const d of [-1, 1]) { const x = bx + d * (38 + spin * 6), y = by - H * 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 12, y); ctx.moveTo(x + d * 8, y - 4); ctx.lineTo(x + d * 12, y); ctx.lineTo(x + d * 8, y + 4); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    // the tell: a scuff of dust and a few leaves starting to turn at its foot
    ctx.fillStyle = `rgba(232,196,140,${0.3 * (0.4 + spin)})`; ctx.beginPath(); ctx.ellipse(bx, by + 2, 14 + spin * 10, 3, 0, 0, TAU); ctx.fill();
  }

  // ---------- Cane Wave: a gust ripples up the left wall; the cane bends out into the shaft in a wave, then springs back ----------
  const CW = { P: 4, o: 2.8, y0: 470, y1: 340 };
  const wave = t => { const u = ph(t, CW.P, CW.o), front = lerp(CW.y0 + 40, CW.y1 - 60, smooth(0.6, 2.6, u)), on = smooth(0.4, 0.7, u) * (1 - smooth(2.9, 3.4, u)); return y => (y < CW.y1 - 30 || y > CW.y0 + 30) ? 0 : on * Math.exp(-Math.pow((y - front) / 34, 2)); };
  function caneWave(ctx, w, h, t, L) {
    const b = wave(t);
    // the stalks that bend: tall cane rooted on the wall leaning out into the shaft
    for (let i = 0; i < 9; i++) {
      const y = CW.y0 - i * 16, e = L(y), amt = b(y), lean = 0.06 + amt * 1.3, len = 60 + (i % 3) * 10;
      if (amt > 0.3) K.danger(ctx, e + Math.sin(lean) * len * 0.7, y - Math.cos(lean) * len * 0.5, 30, 0.25 * amt);
      const tipx = e + Math.sin(lean) * len, tipy = y - Math.cos(lean) * len;
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e - 6, y); ctx.quadraticCurveTo(e + Math.sin(lean) * len * 0.3, y - len * 0.5, tipx, tipy); ctx.stroke();
      ctx.strokeStyle = '#e8c46a'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,210,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e - 6, y - 1); ctx.quadraticCurveTo(e + Math.sin(lean) * len * 0.3 - 1, y - len * 0.5, tipx - 1, tipy); ctx.stroke();
      ctx.lineCap = 'butt';
      // a feathery plume at the top
      ctx.fillStyle = 'rgba(255,230,190,.85)'; for (let k = 0; k < 5; k++) { const a = -PI / 2 + lean + (k - 2) * 0.3; ctx.beginPath(); ctx.ellipse(tipx + Math.cos(a) * 6, tipy + Math.sin(a) * 6, 6, 1.6, a, 0, TAU); ctx.fill(); }
    }
    // the gust itself: streaks rolling up
    const u = ph(t, CW.P, CW.o), on = smooth(0.4, 0.7, u) * (1 - smooth(2.9, 3.4, u)), front = lerp(CW.y0 + 40, CW.y1 - 60, smooth(0.6, 2.6, u));
    if (on > 0.05) { ctx.strokeStyle = `rgba(255,236,200,${0.5 * on})`; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 4; k++) { const y = front + 20 - k * 10, x = L(y) + 6; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y - 10, x + 60 + k * 8, y - 4); } ctx.stroke(); }
  }

  // ---------- the twist: a scarecrow on a post turns its head to follow you; crows land where it looks ----------
  function scarecrow(ctx, w, h, t, R, rx, ry) {
    const y = 236, x = R(y) - 22, look = clamp((rx - x) / 80, -1, 1);
    ctx.fillStyle = K.lg(ctx, x - 3, 0, x + 3, 0, ['#4a2e1a', '#8a5a30', '#4a2e1a']); ctx.fillRect(x - 2.5, y - 10, 5, 70);
    ctx.fillRect(x - 24, y + 4, 48, 4);
    // coat with patches, straw tufts
    ctx.fillStyle = K.lg(ctx, x - 16, 0, x + 16, 0, ['#3a2a5a', '#6a4a8a', '#3a2a5a']); ctx.beginPath(); ctx.moveTo(x - 20, y + 2); ctx.lineTo(x + 20, y + 2); ctx.lineTo(x + 14, y + 34); ctx.lineTo(x - 14, y + 34); ctx.fill();
    ctx.fillStyle = '#d86a4a'; ctx.fillRect(x - 8, y + 14, 7, 7); ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 0.6; ctx.strokeRect(x - 8, y + 14, 7, 7);
    ctx.strokeStyle = '#e8c46a'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(x - 22, y + 4 + k); ctx.lineTo(x - 28, y + 2 + k * 3); ctx.moveTo(x + 22, y + 4 + k); ctx.lineTo(x + 28, y + 2 + k * 3); } ctx.stroke();
    // the sack head, turned toward the rocket, with stitched eyes that glint
    ctx.save(); ctx.translate(x, y - 12); ctx.scale(1 - Math.abs(look) * 0.12, 1);
    ctx.fillStyle = K.rg2(ctx, -3 + look * 3, -4, 1, 0, 0, 13, [[0, '#f8e0b0'], [0.7, '#d8b070'], [1, '#9a7040']]); ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    K.eyes(ctx, look * 4, -1, 4.5, 2.2, '#ff9a3a', look, 0.3);
    ctx.strokeStyle = '#6a3a1a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5 + look * 4, 5); for (let k = 0; k < 5; k++) ctx.lineTo(-5 + look * 4 + k * 2.5, 5 + (k % 2 ? 1.5 : 0)); ctx.stroke();
    // the hat
    ctx.fillStyle = K.lg(ctx, 0, -20, 0, -6, ['#6a4a3a', '#3a2a2a']); ctx.beginPath(); ctx.ellipse(0, -8, 16, 3.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-5, -20); ctx.lineTo(6, -22); ctx.lineTo(8, -8); ctx.fill();
    ctx.fillStyle = '#d86a4a'; ctx.fillRect(-8, -11, 16, 2.5);
    ctx.restore();
    // a crow perched on the arm, looking the same way
    const cx = x - 20, cy = y + 1;
    ctx.fillStyle = '#2a1a2e'; ctx.beginPath(); ctx.ellipse(cx, cy - 4, 5, 3.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(cx - 4, cy - 7, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 7.5); ctx.lineTo(cx - 9, cy - 7); ctx.lineTo(cx - 6, cy - 6); ctx.fill();
    ctx.fillStyle = '#ffd860'; ctx.fillRect(cx - 5, cy - 8, 1, 1);
  }

  PV.sections['canefield'] = (ctx, w, h, t) => {
    dusk(ctx, w, h, t);
    const b = wave(t);
    const L = caneWall(ctx, -1, w, h, t, b), R = caneWall(ctx, 1, w, h, t);
    for (const [x, y, o] of [[0.5, 216, 0], [0.62, 400, 1.2]]) K.coin(ctx, w * x, y, 0.62, t, o);
    const rx = w * 0.6, ry = h * 0.9;
    scarecrow(ctx, w, h, t, R, rx, ry);
    caneWave(ctx, w, h, t, L);
    devil(ctx, w, h, t, L, R);
    crows(ctx, w, h, t, L, R);
    K.rocket(ctx, rx, ry, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 200, 130], 14, 14);
  };
})();

// ===================================================================================================
// WHALE'S BELLY: up the throat of a giant friendly whale, lit by swallowed lanterns. Gulp Wave, Slosh, Krill Cloud.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const WARM = [255, 200, 120];
  // the gulp: a ring of squeezed throat travelling down the shaft
  const GW = { P: 4, o: 0.0 };
  const gulp = (t, h) => { const u = ph(t, GW.P, GW.o), on = smooth(0.5, 0.8, u) * (1 - smooth(3.2, 3.6, u)); return { front: lerp(-40, h + 40, smooth(0.7, 3.4, u)), on, tell: bump(u, 0.0, 0.3, 0.6, 0.8) }; };
  const edgeOf = (side, w, g) => { const a = side < 0 ? 0.5 : 2.2; return y => { const d = 38 + Math.sin(y * 0.026 + a) * 6 + Math.sin(y * 0.09 + a) * 2 + g.on * 34 * Math.exp(-Math.pow((y - g.front) / 30, 2)); return side < 0 ? d : w - d; }; };

  function throat(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#3a1028', '#7a2a4a', '#a83e58', '#7a2a4a', '#4a1630']); ctx.fillRect(0, 0, w, h);
    // the ribbed roof of the throat far away: soft arches receding upward
    for (let k = 0; k < 7; k++) {
      const y = 30 + k * k * 9, rw = 40 + k * 18, a = 0.18 + k * 0.04;
      ctx.strokeStyle = `rgba(255,150,160,${a})`; ctx.lineWidth = 3 + k; ctx.beginPath(); ctx.ellipse(w / 2, y + 80, rw, 26 + k * 6, 0, PI * 1.05, PI * 1.95); ctx.stroke();
      ctx.strokeStyle = `rgba(80,20,40,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(w / 2, y + 84 + k, rw, 26 + k * 6, 0, PI * 1.05, PI * 1.95); ctx.stroke();
    }
    // far up, the light of the blowhole / mouth: a pale blue glow
    K.glow(ctx, w / 2, 20, 90, [180, 220, 255], 0.35);
    // swallowed things floating behind: a rowing boat, barrels, a string of lanterns
    ctx.save(); ctx.globalAlpha = 0.6;
    const bx = w * 0.32, by = h * 0.58;
    ctx.fillStyle = K.lg(ctx, 0, by - 6, 0, by + 10, ['#a87a5a', '#5a3a2a']); ctx.beginPath(); ctx.moveTo(bx - 30, by - 4); ctx.quadraticCurveTo(bx, by + 18, bx + 30, by - 8); ctx.lineTo(bx + 26, by - 2); ctx.quadraticCurveTo(bx, by + 10, bx - 26, by + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, by + 2); ctx.lineTo(bx + 12, by - 30); ctx.stroke();
    for (const [x, y] of [[0.7, 0.66], [0.62, 0.72]]) { ctx.fillStyle = K.lg(ctx, w * x - 8, 0, w * x + 8, 0, ['#5a3a2a', '#b07a4a', '#5a3a2a']); ctx.beginPath(); ctx.ellipse(w * x, h * y, 8, 11, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a2a2a'; ctx.fillRect(w * x - 8, h * y - 3, 16, 1.5); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(80,40,30,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, h * 0.34); ctx.quadraticCurveTo(w / 2, h * 0.42, w, h * 0.32); ctx.stroke();
    for (let k = 1; k < 6; k++) { const v = k / 6, x = v * w, y = lerp(h * 0.34, h * 0.32, v) + Math.sin(v * PI) * h * 0.05, c = [[255, 200, 120], [255, 140, 120], [180, 230, 255]][k % 3]; K.glow(ctx, x, y + 8, 18, c, 0.55); ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.ellipse(x, y + 8, 4, 5, 0, 0, TAU); ctx.fill(); }
    // warm haze
    ctx.fillStyle = 'rgba(255,170,160,.06)'; ctx.fillRect(0, 0, w, h);
  }

  // soft rippled pink walls: horizontal ridges (pairs) that bulge with the gulp, wet highlights
  function flesh(ctx, side, w, h, t, g) {
    const ex = edgeOf(side, w, g), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.3, step: 3,
      fill: () => K.lg(ctx, X(0), 0, X(60), 0, ['#5a1a36', '#a83e58', '#d85a6a', '#ffb0a0']),
      deco: () => {
        for (let y = -10; y < h + 10; y += 15) {
          const e = ex(y);
          K.pair(ctx, () => { ctx.moveTo(X(-4), y); ctx.quadraticCurveTo(lerp(X(0), e, 0.6), y + 5, e, y + 2); }, 'rgba(90,20,50,.55)', 'rgba(255,200,190,.55)', 2.2, 2);
        }
        // veins
        ctx.strokeStyle = 'rgba(140,40,90,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 4; k++) { const y0 = k * 130 + 20; ctx.moveTo(X(4), y0); ctx.bezierCurveTo(X(20), y0 + 30, X(8), y0 + 60, X(18), y0 + 100); } ctx.stroke();
        // glistening wet spots
        const r = K.rand(side < 0 ? 4 : 44); for (let i = 0; i < 14; i++) { const y = r() * h, x = lerp(X(10), ex(y), 0.6 + r() * 0.3); ctx.fillStyle = 'rgba(255,240,240,.7)'; ctx.beginPath(); ctx.ellipse(x, y, 2 + r() * 2, 1, 0.3, 0, TAU); ctx.fill(); }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(24), 0, ['rgba(40,0,20,.5)', 'rgba(40,0,20,0)']); ctx.fillRect(side < 0 ? 0 : w - 24, 0, 24, h);
      },
      lip: ['#7a2a4a', '#ff8a90', '#ffe0d8'], lipW: 2.4,
    });
    // a drip of slime off the lip
    for (const y of side < 0 ? [190, 430] : [120, 360]) { const e = ex(y), v = ph(t * 0.5 + y, 1); ctx.fillStyle = 'rgba(255,210,200,.7)'; ctx.beginPath(); ctx.ellipse(e - side * 1, y + v * 14, 1.6, 2.6 + v * 2, 0, 0, TAU); ctx.fill(); }
    return ex;
  }

  // the gulp's tell (the throat flexes up top) and the push arrows on the ring
  function gulpFx(ctx, w, h, t, g, L, R) {
    if (g.tell > 0.05) { ctx.strokeStyle = `rgba(255,200,200,${0.6 * g.tell})`; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(w / 2, 20 + k * 10, 60 - k * 10, 6, 0, 0, PI); ctx.stroke(); } ctx.fillStyle = `rgba(255,230,230,${0.9 * g.tell})`; ctx.font = '800 10px system-ui'; ctx.fillText('gulp', w / 2 - 12, 52); }
    if (g.on > 0.1 && g.front > 0 && g.front < h) {
      const y = g.front, xa = L(y), xb = R(y);
      K.glow(ctx, w / 2, y, 60, [255, 140, 160], 0.25 * g.on);
      ctx.strokeStyle = `rgba(255,230,230,${0.8 * g.on})`; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (const x of [lerp(xa, xb, 0.3), lerp(xa, xb, 0.5), lerp(xa, xb, 0.7)]) { ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 8); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x, y + 8); ctx.lineTo(x + 5, y + 3); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
  }

  // ---------- Slosh: a pocket of water full of urchins on a fold; the whale rolls, the water tilts, then the urchins slosh across and back ----------
  const SL = { y: 250, P: 4, o: 1.2 };
  function slosh(ctx, w, h, t, L, R) {
    const u = ph(t, SL.P, SL.o), tilt = bump(u, 0.2, 0.7, 0.9, 1.1), out = bump(u, 1.0, 1.5, 2.2, 2.9), ex = L(SL.y + 20), y = SL.y;
    // the fold: a fleshy shelf from the left wall that cups the water
    // the water body: a blob in the cup that tilts, then surges out across the shaft
    const reach = ex + 60 + out * (R(y) - ex - 124), lean = tilt * 6 - out * 10;
    if (out > 0.2) K.danger(ctx, (ex + reach) / 2 + 10, y - 4, (reach - ex) * 0.6, 0.25 * out);
    ctx.fillStyle = K.lg(ctx, 0, y - 20, 0, y + 20, ['rgba(180,230,255,.75)', 'rgba(80,150,200,.75)', 'rgba(40,90,140,.8)']);
    ctx.beginPath(); ctx.moveTo(ex, y - 6 - lean);
    const top = x => y - 8 + Math.sin(x * 0.12 - t * 6) * 2.5 * (0.3 + out) - lean * (1 - (x - ex) / Math.max(1, reach - ex)) + out * 8 * Math.sin(((x - ex) / Math.max(1, reach - ex)) * PI) * -1;
    for (let x = ex; x <= reach; x += 5) ctx.lineTo(x, top(x));
    ctx.quadraticCurveTo(reach + 8, y + 2, reach - 4, y + 10);
    for (let x = reach - 4; x >= ex; x -= 8) ctx.lineTo(x, y + 6 + (x > ex + 60 ? 6 * out : 12) * Math.sin(clamp((x - ex) / 64, 0, 1) * PI * 0.9));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = ex + 3; x <= reach - 3; x += 5) { const yy = top(x) + 1.5; x === ex + 3 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
    // spray at the front of the surge
    if (out > 0.2) for (let k = 0; k < 6; k++) { const v = ph(t * 2 + k / 6, 1); ctx.fillStyle = `rgba(200,240,255,${0.8 * out * (1 - v)})`; ctx.beginPath(); ctx.arc(reach - 4 + v * 10, y - 6 - v * 16 + k * 2, 1.6, 0, TAU); ctx.fill(); }
    // the fold: a thick fleshy shelf from the left wall that cups the water (drawn over the water's bottom)
    ctx.fillStyle = K.lg(ctx, 0, y + 2, 0, y + 34, ['#ffc0b0', '#e06a78', '#8a2e50']); ctx.beginPath(); ctx.moveTo(ex - 8, y - 2); ctx.quadraticCurveTo(ex + 26, y + 26, ex + 62, y - 4); ctx.quadraticCurveTo(ex + 72, y - 8, ex + 70, y + 2); ctx.quadraticCurveTo(ex + 30, y + 46, ex - 8, y + 26); ctx.fill();
    K.pair(ctx, () => { ctx.moveTo(ex, y + 4); ctx.quadraticCurveTo(ex + 28, y + 28, ex + 64, y - 3); }, 'rgba(120,30,60,.5)', 'rgba(255,230,220,.85)', 1.2, 1.2);
    // the urchins riding the water: spiky purple balls with tiny worried eyes
    for (let i = 0; i < 4; i++) {
      const f = (i + 0.5) / 4, x = lerp(ex + 12, reach - 10, f) + lean * 0.5, yy = top(x) + 6;
      ctx.strokeStyle = '#4a1a5a'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < 12; k++) { const a = k * PI / 6 + t * (1 + out * 3); ctx.moveTo(x + Math.cos(a) * 4, yy + Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * 9, yy + Math.sin(a) * 9); } ctx.stroke();
      ctx.fillStyle = K.rg2(ctx, x - 2, yy - 2, 0.5, x, yy, 6, [[0, '#e8a0ff'], [0.6, '#8a3ab0'], [1, '#4a1a6a']]); ctx.beginPath(); ctx.arc(x, yy, 5.5, 0, TAU); ctx.fill();
      K.eyes(ctx, x, yy - 1, 3, 1.3, '#ffcf3a', 0, out);
    }
  }

  // ---------- Krill Cloud: a pink cloud of krill drifts through; fly in and your engine coughs ----------
  const KC = { y: 380, P: 4, o: 2.3 };
  function krill(ctx, w, h, t, L, R) {
    const u = ph(t, KC.P, KC.o), drift = u / KC.P, cx = lerp(L(KC.y) - 30, R(KC.y) + 30, drift), cy = KC.y + Math.sin(t * 1.2) * 8, dens = Math.sin(drift * PI);
    K.glow(ctx, cx, cy, 60, [255, 150, 170], 0.3 * dens);
    for (let i = 0; i < 60; i++) {
      const a = i * 2.39 + t * 0.7, rr = 50 * Math.sqrt(((i * 37) % 60) / 60), x = cx + Math.cos(a) * rr * 1.1 + Math.sin(t * 3 + i) * 2, y = cy + Math.sin(a) * rr * 0.55 + Math.cos(t * 2.6 + i) * 2;
      const dir = Math.sin(t * 2 + i) > 0 ? 1 : -1;
      ctx.strokeStyle = `rgba(255,${130 + (i % 3) * 30},${150 + (i % 2) * 30},${0.9 * dens})`; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 2.4 * dir, y); ctx.quadraticCurveTo(x, y - 1.6, x + 2.4 * dir, y + 0.4); ctx.stroke();
      if (i % 4 === 0) { ctx.fillStyle = `rgba(40,20,30,${0.9 * dens})`; ctx.fillRect(x + 2 * dir - 0.5, y - 0.7, 1, 1); }
    }
    ctx.lineCap = 'butt';
  }

  // the twist: the whale hiccups, blowing everything up the throat
  function hiccup(ctx, w, h, t) {
    const u = ph(t, 4, 0.2), hic = bump(u, 0, 0.08, 0.3, 0.7);
    if (hic < 0.02) return;
    ctx.strokeStyle = `rgba(255,240,240,${0.55 * hic})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let k = 0; k < 10; k++) { const x = w * (0.2 + (k * 0.61 % 0.6)), y = h * (0.15 + ((k * 0.37) % 0.8)) - hic * 30; ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.fillStyle = `rgba(255,240,240,${hic})`; ctx.font = '800 14px system-ui'; ctx.fillText('hic!', w * 0.42, h * 0.5 - hic * 20);
  }

  PV.sections['whale'] = (ctx, w, h, t) => {
    throat(ctx, w, h, t);
    const g = gulp(t, h);
    const L = flesh(ctx, -1, w, h, t, g), R = flesh(ctx, 1, w, h, t, g);
    for (const [x, y, o] of [[0.6, 190, 0], [0.42, 320, 1.3]]) K.coin(ctx, w * x, y, 0.62, t, o);
    krill(ctx, w, h, t, L, R);
    slosh(ctx, w, h, t, L, R);
    gulpFx(ctx, w, h, t, g, L, R);
    hiccup(ctx, w, h, t);
    const rx = w * 0.5, ry = h * 0.9;
    K.rocket(ctx, rx, ry, 0.75, t);
    K.motes(ctx, w, h, t, 'bubble', [255, 220, 230], 14, 15);
  };
})();

// ===================================================================================================
// MIDNIGHT TRENCH: a black ocean trench where only glowing things can be seen. Angler Lure, Blinker School, Siphon Chain.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const CY = [58, 240, 255], MG = [255, 79, 216], LURE = [255, 236, 150];
  const edgeOf = (side, w) => { const a = side < 0 ? 0.9 : 2.6; return y => { const d = 40 + Math.sin(y * 0.02 + a) * 8 + Math.abs(Math.sin(y * 0.07 + a)) * 5; return side < 0 ? d : w - d; }; };

  function deep(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#0e2148', '#0b1a3a', '#081430', '#050c20']); ctx.fillRect(0, 0, w, h);
    // the faintest light from far above
    K.ray(ctx, w * 0.45, -20, 0.08, 0.18, 260, [90, 140, 220], 0.07);
    // far silhouettes: a distant ridge with a vent glow, a whale-fall ribcage, drifting far jellies
    ctx.fillStyle = 'rgba(20,34,70,.9)'; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.74 - Math.abs(Math.sin(x * 0.03)) * 30 - Math.sin(x * 0.11) * 4); ctx.lineTo(w, h); ctx.fill();
    K.glow(ctx, w * 0.7, h * 0.7, 40, [255, 120, 80], 0.15);
    ctx.strokeStyle = 'rgba(60,80,130,.5)'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(w * 0.3, h * 0.78, 14 + k * 6, PI * 1.1, PI * 1.9); ctx.stroke(); }
    for (let k = 0; k < 4; k++) { const x = w * (0.2 + k * 0.2) + Math.sin(t * 0.3 + k) * 8, y = h * (0.3 + (k % 2) * 0.25) - ph(t * 6 + k * 40, 60); const c = k % 2 ? CY : MG; K.glow(ctx, x, y, 10, c, 0.25); ctx.fillStyle = rgb(c, 0.4); ctx.beginPath(); ctx.arc(x, y, 3, PI, 0); ctx.fill(); }
  }

  // volcanic trench walls: dark pillow-lava lumps, glowing lichen dots, tube worms with red plumes, glass sponges
  function trench(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.4, step: 3,
      fill: () => K.lg(ctx, X(0), 0, X(56), 0, ['#04070f', '#0c1428', '#1a2a4a']),
      deco: () => {
        const r = K.rand(side < 0 ? 7 : 70);
        // pillow lava lumps, lit faintly from the shaft side
        for (let i = 0; i < 30; i++) {
          const y = r() * (h + 30) - 15, x = X(r() * 50), rr = 9 + r() * 10;
          ctx.fillStyle = K.rg2(ctx, x + side * -rr * 0.4, y - rr * 0.3, 1, x, y, rr, [[0, '#2e4470'], [0.6, '#14203c'], [1, '#080e1e']]); ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.8, r(), 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(100,140,200,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, rr - 2, rr * 0.8 - 2, 0, PI * 1.1 + (side > 0 ? 0 : 0.4), PI * 1.6 + (side > 0 ? 0 : 0.4)); ctx.stroke();
        }
        // glowing lichen: tiny cyan and magenta speckles that breathe
        for (let i = 0; i < 40; i++) { const y = r() * h, x = X(6 + r() * 44), c = i % 3 ? CY : MG, a = 0.35 + 0.35 * Math.sin(t * 1.5 + i); ctx.fillStyle = rgb(c, a); ctx.beginPath(); ctx.arc(x, y, 0.9 + r(), 0, TAU); ctx.fill(); }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(26), 0, ['rgba(0,0,6,.6)', 'rgba(0,0,6,0)']); ctx.fillRect(side < 0 ? 0 : w - 26, 0, 26, h);
      },
      lip: ['#04070f', '#2a3e6a', '#7aa8e0'], lipW: 1.8,
    });
    // tube worms on the lip: white tubes with red feathery plumes that pulse; and a glass sponge
    const ys = side < 0 ? [96, 340] : [210, 460];
    for (const y0 of ys) for (let k = 0; k < 4; k++) {
      const y = y0 + k * 7, e = ex(y), L = 12 + k * 3, x1 = e - side * L, sw = Math.sin(t * 1.3 + k + y0) * 2;
      ctx.strokeStyle = '#d8d8e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e + side * 2, y); ctx.lineTo(x1, y - 4 + sw * 0.3); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,120,150,.6)'; ctx.lineWidth = 1; ctx.stroke();
      const pl = 3 + Math.sin(t * 2.2 + k) * 0.8; ctx.fillStyle = K.rg2(ctx, x1, y - 4, 0.5, x1, y - 4, pl + 2, [[0, '#ffb0a0'], [1, '#e0303a']]); ctx.beginPath(); ctx.arc(x1 - side * 2, y - 4 + sw * 0.3, pl, 0, TAU); ctx.fill();
    }
    const sy = side < 0 ? 450 : 72, sx = ex(sy) - side * 8;
    K.glow(ctx, sx, sy - 10, 20, CY, 0.25);
    ctx.strokeStyle = 'rgba(180,240,255,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx - 4, sy - 26); ctx.lineTo(sx + 4, sy - 26); ctx.lineTo(sx + 6, sy); for (let k = 0; k < 5; k++) { ctx.moveTo(sx - 6 + k * 0.4, sy - k * 5); ctx.lineTo(sx + 6 - k * 0.4, sy - k * 5); } ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 4, sy - 26); ctx.moveTo(sx + 5, sy); ctx.lineTo(sx - 4, sy - 26); ctx.stroke();
    return ex;
  }

  // ---------- Angler Lure: a glowing lure like a coin dangles in the dark; grab it while the angler sleeps; when it flickers, the jaws snap ----------
  const AL = { y: 134, P: 4, o: 0.4 };
  function angler(ctx, w, h, t, R) {
    const u = ph(t, AL.P, AL.o), ex = R(AL.y), flick = bump(u, 1.8, 1.9, 2.3, 2.4), snap = bump(u, 2.4, 2.55, 2.9, 3.3), wake = Math.max(flick, snap);
    const fx = ex - 18, fy = AL.y + 20;
    // the angler: a dark lumpy fish, barely seen — rim-lit by its own lure; jaws full of glassy teeth
    const jaw = snap * 0.9;
    ctx.save(); ctx.translate(fx, fy);
    ctx.fillStyle = K.rg2(ctx, -26, -10, 2, -10, 0, 40, [[0, '#2a3a5a'], [0.6, '#141c34'], [1, '#080c18']]);
    ctx.beginPath(); ctx.moveTo(24, -6); ctx.quadraticCurveTo(10, -32, -24, -20); ctx.quadraticCurveTo(-46, -10, -48, -2 - jaw * 10); ctx.lineTo(-20, 2); ctx.lineTo(-48, 6 + jaw * 14); ctx.quadraticCurveTo(-30, 30, 0, 24); ctx.quadraticCurveTo(22, 18, 24, -6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,150,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-24, -20); ctx.quadraticCurveTo(-46, -10, -48, -2 - jaw * 10); ctx.stroke();
    // teeth
    ctx.fillStyle = 'rgba(220,240,255,.85)'; for (let k = 0; k < 6; k++) { const x = -46 + k * 5; ctx.beginPath(); ctx.moveTo(x, -2 - jaw * 10 * (1 - k / 7)); ctx.lineTo(x + 1.5, 4 - jaw * 6 * (1 - k / 7)); ctx.lineTo(x + 3, -2 - jaw * 10 * (1 - k / 7)); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, 6 + jaw * 14 * (1 - k / 7)); ctx.lineTo(x + 1.5, 0 + jaw * 9 * (1 - k / 7)); ctx.lineTo(x + 3, 6 + jaw * 14 * (1 - k / 7)); ctx.fill(); }
    // its eye: a sleepy slit, then a big glowing eye when it wakes
    if (wake < 0.2) { ctx.strokeStyle = 'rgba(160,200,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-18, -10, 3, 0.3, PI - 0.3); ctx.stroke(); }
    else { K.glow(ctx, -18, -11, 12, [255, 230, 120], 0.6 * wake); K.eyes(ctx, -18, -11, 0, 4 * wake, '#ffe060', -1, snap); }
    ctx.restore();
    // the illicium (fishing rod) arcing out over the shaft and the lure
    const lx = fx - 70 + Math.sin(t * 1.3) * 6, ly = fy - 6 + Math.sin(t * 2) * 4, on = flick > 0 ? (Math.sin(t * 40) > 0 ? 1 : 0.15) : 1;
    ctx.strokeStyle = 'rgba(120,150,200,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(fx - 18, fy - 24); ctx.quadraticCurveTo(fx - 50, fy - 70, lx, ly - 8); ctx.stroke();
    K.glow(ctx, lx, ly, 44, LURE, 0.5 * on);
    if (snap > 0.3) K.danger(ctx, lx + 10, ly + 4, 46, 0.4 * snap);
    // the lure looks just like a coin: a glowing gold disc with a dimple
    ctx.globalAlpha = 0.4 + 0.6 * on;
    ctx.fillStyle = K.rg2(ctx, lx - 3, ly - 3, 1, lx, ly, 9, [[0, '#fffbe0'], [0.5, '#ffe080'], [1, '#d8a020']]); ctx.beginPath(); ctx.arc(lx, ly, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,10,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(lx - 3, ly - 3.5, 2, 1, -0.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // little real coins orbiting the lure (the reward for the brave)
    for (let k = 0; k < 3; k++) { const a = t * 1.5 + k * TAU / 3; K.coin(ctx, lx + Math.cos(a) * 22, ly + Math.sin(a) * 12, 0.38, t, k); }
  }

  // ---------- Blinker School: lantern fish cross the shaft, visible only when they blink: dark, a pulse (the tell), then a flash ----------
  const BL = { y: 280, P: 4, o: 1.5 };
  function blinkers(ctx, w, h, t, L, R) {
    const u = ph(t, BL.P, BL.o), pulse = bump(u, 0.6, 0.75, 0.85, 1.0) + bump(u, 2.6, 2.75, 2.85, 3.0), flash = bump(u, 1.1, 1.2, 1.6, 2.0) + bump(u, 3.1, 3.2, 3.5, 3.9);
    const vis = clamp(pulse * 0.35 + flash, 0, 1), xa = L(BL.y), xb = R(BL.y), drift = t * 22;
    for (let i = 0; i < 9; i++) {
      const row = i % 3, x = xa + (((i * 41 + drift * (row === 1 ? -1 : 1)) % (xb - xa + 40)) + (xb - xa + 40)) % (xb - xa + 40) - 20, y = BL.y - 24 + row * 24 + Math.sin(t * 2 + i) * 3, dir = row === 1 ? -1 : 1;
      // in the dark, only a faint ghost outline; when it flashes, the whole fish lights up
      if (vis > 0.05) K.glow(ctx, x, y, 16 + flash * 10, CY, 0.55 * vis);
      if (flash > 0.3) K.danger(ctx, x, y, 20, 0.2 * flash);
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.globalAlpha = 0.08 + 0.92 * vis;
      ctx.fillStyle = K.lg(ctx, 0, -5, 0, 5, ['#bff8ff', '#3af0ff', '#1a6a9a']); ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(4, -6, -6, -3); ctx.lineTo(-11, -6); ctx.lineTo(-9, 0); ctx.lineTo(-11, 6); ctx.lineTo(-6, 3); ctx.quadraticCurveTo(4, 6, 10, 0); ctx.fill();
      // photophores along the belly
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(6 - k * 3.5, 2.6, 0.9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#04070f'; ctx.beginPath(); ctx.arc(6, -1.2, 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(6.6, -1.8, 0.8, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // ---------- Siphon Chain: a long chain of glowing jelly bells bunches into a coil, then stretches out like a spring ----------
  const SC = { y: 362, P: 4, o: 2.8 };
  function siphon(ctx, w, h, t, L, R) {
    const u = ph(t, SC.P, SC.o), stretch = smooth(0.4, 1.6, u) * (1 - smooth(2.4, 3.6, u)), xa = L(SC.y), xb = R(SC.y);
    const cx = lerp(xa + 60, xb - 60, 0.5 + 0.3 * Math.sin(t * 0.5)), N = 13, span = lerp(30, (xb - xa) * 0.6, stretch);
    const pts = [];
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1), a = f * TAU * lerp(2.4, 0.6, stretch) + t * 0.8;
      // coiled: a tight helix; stretched: a long gentle wave across the shaft
      const x = cx - span / 2 + f * span + Math.cos(a) * lerp(16, 4, stretch), y = SC.y + Math.sin(a) * lerp(16, 10, stretch);
      pts.push([x, y]);
    }
    // the stem through the bells
    ctx.strokeStyle = 'rgba(255,140,230,.6)'; ctx.lineWidth = 1.4; K.smoothPath(ctx, pts, false); ctx.stroke();
    K.danger(ctx, cx, SC.y, span * 0.55 + 20, 0.2);
    pts.forEach(([x, y], i) => {
      const s = 1 + 0.15 * Math.sin(t * 4 + i * 0.6), c = i % 4 === 0 ? CY : MG;
      K.glow(ctx, x, y, 14 * s, c, 0.45);
      ctx.fillStyle = K.rg2(ctx, x - 1.5, y - 2, 0.5, x, y, 7 * s, [[0, '#ffffff'], [0.5, rgb(K.lift(c, 50), 0.85)], [1, rgb(c, 0.35)]]); ctx.beginPath(); ctx.arc(x, y, 6 * s, PI * 1.05, PI * 1.95); ctx.quadraticCurveTo(x + 6 * s, y + 3, x, y + 2.5); ctx.quadraticCurveTo(x - 6 * s, y + 3, x - 6 * s * Math.cos(0.05 * PI), y - 6 * s * Math.sin(0.05 * PI)); ctx.fill();
      ctx.strokeStyle = rgb(K.lift(c, 60), 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(x + k * 3, y + 2); ctx.quadraticCurveTo(x + k * 3 + Math.sin(t * 5 + i + k) * 2, y + 6, x + k * 3, y + 10); } ctx.stroke();
    });
  }

  PV.sections['abyss'] = (ctx, w, h, t) => {
    deep(ctx, w, h, t);
    const L = trench(ctx, -1, w, h, t), R = trench(ctx, 1, w, h, t);
    // the twist: darkness — a vignette over the trench except the circle your flame lights; only glowing things show through
    const rx = w * 0.42, ry = h * 0.9;
    ctx.fillStyle = K.rg2(ctx, rx, ry - 6, 40, rx, ry - 6, 220, [[0, 'rgba(2,4,12,0)'], [0.5, 'rgba(2,4,12,.35)'], [1, 'rgba(2,4,12,.55)']]); ctx.fillRect(0, 0, w, h);
    siphon(ctx, w, h, t, L, R);
    blinkers(ctx, w, h, t, L, R);
    angler(ctx, w, h, t, R);
    K.glow(ctx, rx, ry, 48, [255, 200, 140], 0.35);
    K.rocket(ctx, rx, ry, 0.75, t);
    K.motes(ctx, w, h, t, 'snow', [200, 220, 255], 26, 16);
  };
})();

