// Shore group: Sandcastle Keep, Conch Spiral, Coral Kingdom, Flamingo Salt Flats, Stilt Village.
// ===================================================================================================
// SANDCASTLE KEEP: a giant child's castle of wet sand at midday. Crumble Bridge, Bucket Drop, Kite Tail.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump, ease } = K;
  const SAND = { lit: [255, 238, 190], hi: [248, 214, 140], mid: [226, 172, 92], lo: [178, 120, 56], deep: [120, 74, 34] };
  const WET = { hi: [214, 160, 92], mid: [170, 112, 56], lo: [120, 74, 36], deep: [84, 50, 24] };
  const SEG = 62;                                          // the height of one bucket-moulded tower course

  // stepped tower edge: each course is a little frustum (wider at its foot), courses offset in and out
  const edgeOf = (side, w) => {
    const base = side < 0 ? 30 : w - 30;
    return y => {
      const k = Math.floor((y + (side < 0 ? 18 : 47)) / SEG), v = ((y + (side < 0 ? 18 : 47)) / SEG) - k;
      const r = K.rand(k * 7 + (side < 0 ? 3 : 11))(), jut = (r - 0.5) * 12;
      const prof = v < 0.12 ? 4 * (v / 0.12) : 4 + 7 * ((v - 0.12) / 0.88);   // the rim then the flare to the foot
      return base - side * (jut + prof);
    };
  };

  function sky(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#4fc3ee', '#8fdcf5', '#d6f2f4', '#f8ecd0']); ctx.fillRect(0, 0, w, h);
    // the sun high up to the left: a soft white bloom
    K.glow(ctx, w * 0.22, -10, 170, [255, 252, 225], 0.55);
    // fair-weather clouds, flat-bottomed, drifting
    const cl = (x, y, s, a) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = K.lg(ctx, 0, -18, 0, 8, [`rgba(255,255,255,${a})`, `rgba(226,244,250,${a * 0.9})`]);
      ctx.beginPath(); ctx.arc(-16, 0, 10, PI, 0); ctx.arc(-2, -6, 13, PI, 0); ctx.arc(13, -1, 9, PI, 0); ctx.arc(24, 2, 6, PI, 0); ctx.lineTo(30, 6); ctx.lineTo(-26, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(160,206,226,${a * 0.6})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-24, 6); ctx.lineTo(28, 6); ctx.stroke();
      ctx.restore();
    };
    cl(((t * 5) % (w + 120)) - 60, 70, 1.3, 0.75); cl(((t * 3 + 170) % (w + 120)) - 60, 150, 0.9, 0.6); cl(((t * 4 + 90) % (w + 120)) - 60, 250, 0.7, 0.45);
    // distant gulls
    ctx.strokeStyle = 'rgba(90,130,160,.6)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (const [gx, gy, gp] of [[0.62, 110, 0], [0.7, 122, 1.4], [0.35, 196, 2.2]]) {
      const x = w * gx + Math.sin(t * 0.4 + gp) * 14, y = gy + Math.sin(t * 0.7 + gp) * 4, f = Math.sin(t * 6 + gp) * 2;
      ctx.beginPath(); ctx.moveTo(x - 5, y - f); ctx.quadraticCurveTo(x - 2, y - 2, x, y); ctx.quadraticCurveTo(x + 2, y - 2, x + 5, y - f); ctx.stroke();
    }
  }

  // the far keep: pale sand towers in the haze, arched windows, paper flags on lolly sticks
  function farKeep(ctx, w, h, t) {
    const tower = (x, top, tw, col, flag) => {
      const c = rgb(col);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - tw / 2, h + 10); ctx.lineTo(x - tw / 2 + 3, top); ctx.lineTo(x + tw / 2 - 3, top); ctx.lineTo(x + tw / 2, h + 10); ctx.fill();
      // crenels
      for (let k = 0; k < 4; k++) { const cx = x - tw / 2 + 3 + k * (tw - 6) / 3.5; ctx.fillRect(cx, top - 7, (tw - 6) / 7, 8); }
      // bucket rings, faint
      ctx.strokeStyle = rgb(K.lift(col, -14), 0.5); ctx.lineWidth = 1; ctx.beginPath();
      for (let y = top + 18; y < h; y += 26) { ctx.moveTo(x - tw / 2 + 2, y); ctx.lineTo(x + tw / 2 - 2, y); }
      ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(col, 16), 0.6); ctx.beginPath();
      for (let y = top + 19.5; y < h; y += 26) { ctx.moveTo(x - tw / 2 + 2, y); ctx.lineTo(x + tw / 2 - 2, y); }
      ctx.stroke();
      // an arched window
      ctx.fillStyle = rgb(K.lift(col, -26)); ctx.beginPath(); ctx.moveTo(x - 5, top + 46); ctx.lineTo(x - 5, top + 36); ctx.arc(x, top + 36, 5, PI, 0); ctx.lineTo(x + 5, top + 46); ctx.fill();
      if (flag) {
        ctx.strokeStyle = rgb(K.lift(col, -30)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, top - 7); ctx.lineTo(x, top - 32); ctx.stroke();
        const fl = Math.sin(t * 5 + x) * 2;
        ctx.fillStyle = flag; ctx.beginPath(); ctx.moveTo(x, top - 32); ctx.quadraticCurveTo(x + 8, top - 30 + fl, x + 15, top - 27 + fl); ctx.lineTo(x, top - 22); ctx.fill();
      }
    };
    tower(w * 0.2, 200, 40, [236, 220, 196], 'rgba(255,140,120,.7)');
    tower(w * 0.78, 150, 46, [234, 216, 192], 'rgba(110,190,230,.7)');
    tower(w * 0.5, 120, 30, [240, 226, 204], 'rgba(255,200,90,.75)');
    // a curtain wall between them with crenels
    ctx.fillStyle = rgb([230, 210, 182]); ctx.fillRect(0, 300, w, h);
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 292, 9, 9);
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(214,242,244,.3)', 'rgba(248,236,208,.16)']); ctx.fillRect(0, 0, w, h);
    // nearer: two shaded towers, warmer, with a shell-studded gate
    ctx.fillStyle = rgb([224, 190, 140]);
    ctx.beginPath(); ctx.moveTo(w * 0.36 - 30, h + 4); ctx.lineTo(w * 0.36 - 26, 330); ctx.lineTo(w * 0.36 + 26, 330); ctx.lineTo(w * 0.36 + 30, h + 4); ctx.fill();
    for (let k = 0; k < 4; k++) ctx.fillRect(w * 0.36 - 26 + k * 15, 322, 8, 9);
    ctx.fillStyle = rgb([206, 168, 116]); ctx.beginPath(); ctx.moveTo(w * 0.36 - 10, h + 4); ctx.lineTo(w * 0.36 - 10, 400); ctx.arc(w * 0.36, 400, 10, PI, 0); ctx.lineTo(w * 0.36 + 10, h + 4); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(214,242,244,.16)', 'rgba(248,236,208,.08)']); ctx.fillRect(0, 0, w, h);
    // the courtyard below lies in the walls' shade; a seaweed banner hangs off the far wall
    ctx.fillStyle = K.lg(ctx, 0, 290, 0, h, ['rgba(170,110,60,0)', 'rgba(170,110,60,.22)', 'rgba(140,86,44,.34)']); ctx.fillRect(0, 290, w, h);
    for (const [bx, by, bl] of [[w * 0.62, 300, 70], [w * 0.8, 300, 52]]) {
      ctx.fillStyle = K.lg(ctx, bx - 6, 0, bx + 6, 0, ['#5e8a52', '#86b46a', '#4e7444']);
      ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); for (let k = 0; k <= 6; k++) ctx.lineTo(bx + 6 + Math.sin(k * 1.3 + t * 1.5) * 2 - k * 0.3, by + k * bl / 6); ctx.lineTo(bx, by + bl + 6); for (let k = 6; k >= 0; k--) ctx.lineTo(bx - 6 + Math.sin(k * 1.3 + t * 1.5) * 2 + k * 0.3, by + k * bl / 6); ctx.fill();
      ctx.strokeStyle = 'rgba(40,70,40,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx, by + 2); ctx.lineTo(bx + Math.sin(t * 1.5) * 2, by + bl); ctx.stroke();
    }
    // windows in the curtain wall, a row of dark arches
    ctx.fillStyle = 'rgba(150,104,62,.45)';
    for (let x = 18; x < w; x += 46) { ctx.beginPath(); ctx.moveTo(x - 5, 360); ctx.lineTo(x - 5, 349); ctx.arc(x, 349, 5, PI, 0); ctx.lineTo(x + 5, 360); ctx.fill(); }
  }

  // a scallop shell (fan with ribs) and a little spiral shell, pressed into the sand
  function scallop(ctx, x, y, s, rot, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = K.rg2(ctx, -2, -6, 1, 0, -2, 10, [[0, K.lift(col, 50)], [0.6, col], [1, K.lift(col, -50)]]);
    ctx.beginPath(); ctx.moveTo(0, 4); for (let k = 0; k <= 6; k++) { const a = PI + 0.25 + k * (PI - 0.5) / 6; ctx.quadraticCurveTo(Math.cos(a - 0.12) * 11, Math.sin(a - 0.12) * 11 - 1, Math.cos(a) * 9.5, Math.sin(a) * 9.5); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(col, -70), 0.8); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = PI + 0.5 + k * (PI - 1) / 5; ctx.moveTo(0, 3); ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = PI + 0.56 + k * (PI - 1) / 5; ctx.moveTo(-0.5, 2); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); } ctx.stroke();
    ctx.fillStyle = rgb(K.lift(col, -20)); ctx.fillRect(-2.5, 2.5, 5, 2.5);
    ctx.restore();
  }
  function spiralShell(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = K.rg2(ctx, -2, -2, 0.5, 0, 0, 7, [[0, '#fff4ea'], [0.5, '#f2b8a0'], [1, '#b8644e']]);
    ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a4434'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(-4, -3 + k * 3); ctx.quadraticCurveTo(0, -1 + k * 3, 4, -4 + k * 3); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-1, -2, 2.6, 3.4, 4.6); ctx.stroke();
    ctx.restore();
  }
  function seaGlass(ctx, x, y, s, c) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = K.rg2(ctx, -1.5, -1.5, 0.3, 0, 0, 5, [[0, K.lift(c, 90)], [0.5, c, 0.85], [1, K.lift(c, -40), 0.9]]);
    ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(-1, -4); ctx.lineTo(4, -2.5); ctx.lineTo(3.5, 2.5); ctx.lineTo(-2, 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-1.5, -1.6, 1.4, 0.6, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // the near walls: stacked bucket courses, each with a rounded rim, mould rings, a wet foot, dribble drips and inlays
  function sandWall(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d, lit = side > 0;   // the right wall's face is sunlit
    K.wall(ctx, side, w, h, ex, {
      ao: 0.16,
      fill: () => K.lg(ctx, X(0), 0, X(40), 0, lit ? [SAND.lo, SAND.mid, SAND.hi] : [SAND.deep, SAND.lo, SAND.mid]),
      deco: () => {
        for (let k = -1; k < 9; k++) {
          const y0 = k * SEG - (side < 0 ? 18 : 47), y1 = y0 + SEG, xe = ex(y1 - 1), xt = ex(y0 + SEG * 0.12);
          // wet, darker foot of each course
          ctx.fillStyle = K.lg(ctx, 0, y1 - 18, 0, y1, [rgb(WET.mid, 0), rgb(WET.mid, 0.55)]);
          ctx.fillRect(Math.min(X(0), xe) - 2, y1 - 18, Math.abs(xe - X(0)) + 4, 18);
          // mould rings: a dark furrow with a lit ridge under it, following the course's flare
          for (const v of [0.34, 0.58, 0.8]) {
            const y = y0 + SEG * v, xx = ex(y);
            K.pair(ctx, () => { ctx.moveTo(X(0), y); ctx.lineTo(xx - side * 1.5, y); }, rgb(SAND.deep, 0.45), rgb(SAND.lit, lit ? 0.7 : 0.45), 1.2, -1.2);
          }
          // the rim: the overhanging top of the course with a lit top edge
          ctx.fillStyle = K.lg(ctx, 0, y0, 0, y0 + 8, [SAND.lit, SAND.hi, SAND.lo]);
          ctx.beginPath(); ctx.moveTo(X(0), y0 - 1); ctx.lineTo(xt + side * 2, y0 - 1); ctx.quadraticCurveTo(xt - side * 3, y0 + 3, xt + side * 1, y0 + 8); ctx.lineTo(X(0), y0 + 8); ctx.fill();
          ctx.strokeStyle = rgb(SAND.deep, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), y0 + 8.5); ctx.lineTo(xt + side * 1, y0 + 8.5); ctx.stroke();
          // drips of dribbled wet sand hanging off the rim
          const r = K.rand(k * 13 + (side < 0 ? 5 : 9));
          for (let d = 0; d < 3; d++) {
            const dx = 4 + r() * 22, len = 6 + r() * 12, x = X(dx) ;
            if (Math.abs(x - X(0)) > Math.abs(xt - X(0)) - 3) continue;
            ctx.fillStyle = K.lg(ctx, x - 3, 0, x + 3, 0, [WET.lo, WET.hi, WET.mid]);
            ctx.beginPath(); ctx.moveTo(x - 2.6, y0 + 7); ctx.quadraticCurveTo(x - 2.4, y0 + 7 + len * 0.7, x, y0 + 8 + len); ctx.quadraticCurveTo(x + 2.4, y0 + 7 + len * 0.7, x + 2.6, y0 + 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,240,210,.55)'; ctx.beginPath(); ctx.arc(x - 0.8, y0 + 8 + len * 0.6, 0.8, 0, TAU); ctx.fill();
          }
          // inlays: shells and sea glass
          const sy = y0 + SEG * (0.42 + r() * 0.3), sx = X(8 + r() * 16);
          if (r() < 0.6) scallop(ctx, sx, sy, 0.8 + r() * 0.3, (r() - 0.5) * 0.8, r() < 0.5 ? [250, 190, 170] : [246, 226, 200]);
          else spiralShell(ctx, sx, sy, 0.9, r() * 2);
          seaGlass(ctx, X(6 + r() * 20), y0 + SEG * (0.2 + r() * 0.15) + 12, 0.9, r() < 0.5 ? [90, 200, 170] : [110, 170, 230]);
          // a few sand grains (sparse, drawn as tiny lit/dark pairs)
          for (let g = 0; g < 7; g++) { const gx = X(3 + r() * 26), gy = y0 + 10 + r() * (SEG - 14); ctx.fillStyle = rgb(SAND.deep, 0.35); ctx.fillRect(gx, gy, 1.2, 1.2); ctx.fillStyle = rgb(SAND.lit, 0.5); ctx.fillRect(gx - 0.6, gy - 0.8, 1, 0.8); }
        }
        // sunlit wash on the right wall / soft shade on the left
        ctx.fillStyle = side > 0 ? K.lg(ctx, w - 40, 0, w, 0, ['rgba(255,250,220,.18)', 'rgba(255,250,220,0)']) : K.lg(ctx, 0, 0, 40, 0, ['rgba(60,30,10,.25)', 'rgba(60,30,10,0)']);
        ctx.fillRect(side < 0 ? 0 : w - 44, 0, 44, h);
      },
      lip: lit ? [rgb(SAND.deep), rgb(SAND.hi), rgb(SAND.lit)] : [rgb(SAND.deep), rgb(SAND.mid), rgb(SAND.lit, 0.9)], lipW: 4,
    });
    return ex;
  }

  // ---------- Crumble Bridge ----------
  const BR = { y: 286, P: 4, o: 0.3 };
  function bridge(ctx, w, h, t, L, R) {
    const u = ph(t, BR.P, BR.o), dry = smooth(1.0, 1.9, u) * (1 - smooth(3.3, 3.6, u)), crack = smooth(1.5, 2.0, u) * (1 - smooth(3.3, 3.5, u));
    const x0 = L(BR.y) - 6, x1 = R(BR.y) + 6, N = 9, sw = (x1 - x0) / N, th = 15;
    const reform = u > 3.2 ? smooth(3.25, 3.85, u) : 1;           // the stub regrows from both walls
    const lethal = u < 2.15 || u > 3.7;
    if (lethal) K.danger(ctx, (x0 + x1) / 2, BR.y + 6, 120, 0.12 * (1 - dry * 0.5));
    // the spray that re-wets it: a plume of white foam climbing the left wall from the tide
    const sp = bump(u, 2.95, 3.25, 3.45, 3.85);
    if (sp > 0) {
      const top = lerp(h, BR.y - 10, smooth(2.95, 3.3, u));
      ctx.save(); ctx.globalAlpha = sp;
      // one foam column hugging the wall: a lumpy tapered sheet, white core, sea-blue edge
      const col = []; for (let k = 0; k <= 14; k++) { const v = k / 14, y = lerp(h + 10, top, v); col.push([L(y) + 4, y, 14 - v * 6 + Math.sin(k * 2.3 + t * 11) * 2.5]); }
      ctx.beginPath(); col.forEach(([x, y, r], i) => i ? ctx.lineTo(x + r * 2, y) : ctx.moveTo(x, y)); for (let k = col.length - 1; k >= 0; k--) ctx.lineTo(col[k][0] - 4, col[k][1]); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, L(top), 0, L(top) + 28, 0, ['rgba(140,214,232,.9)', 'rgba(255,255,255,.95)', 'rgba(200,240,250,.8)']); ctx.fill();
      for (const [x, y, r] of col) { ctx.fillStyle = K.rg2(ctx, x + r - 3, y - 3, 1, x + r, y, r, [[0, '#ffffff'], [0.65, '#effcff'], [1, 'rgba(150,220,236,0)']]); ctx.beginPath(); ctx.arc(x + r, y, r, 0, TAU); ctx.fill(); }
      for (let k = 0; k < 12; k++) { const a = -PI / 2 + (k - 6) * 0.22, d = 10 + 26 * smooth(3.15, 3.5, u); ctx.fillStyle = 'rgba(240,252,255,.9)'; ctx.beginPath(); ctx.arc(L(top) + 16 + Math.cos(a) * d * 1.3, top + Math.sin(a) * d, 2.2 - k % 2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    for (let i = 0; i < N; i++) {
      if (i >= 5 && i <= 7) continue;                                 // a breach the waves knocked out: always a way through
      const mid = Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);          // 0 in the middle, 1 at the walls
      const tFall = 2.0 + (1 - mid) * 0.0 + mid * 0.35, fall = u > tFall && u < 3.4 ? (u - tFall) : 0;
      let gone = fall > 0;
      // regrowth from the walls inward
      if (u > 3.2) { const need = mid; gone = reform < 1 - need * 0.92; }
      const cx = x0 + sw * (i + 0.5);
      if (gone && fall <= 0) continue;
      const fy = fall > 0 ? 0.5 * 900 * fall * fall : 0, rot = fall * (i % 2 ? 3 : -3.4), fa = fall > 0 ? 1 - smooth(0.25, 0.55, fall) : 1;
      if (fa <= 0) continue;
      const col = K.mix(WET.mid, SAND.hi, dry), colLo = K.mix(WET.lo, SAND.mid, dry), colHi = K.mix(WET.hi, SAND.lit, dry);
      ctx.save(); ctx.globalAlpha = fa; ctx.translate(cx, BR.y + fy); ctx.rotate(rot);
      // an arched underside: deeper in the middle segments
      const archDip = 4 + 6 * (1 - mid * mid);
      ctx.fillStyle = K.lg(ctx, 0, -th / 2, 0, th / 2 + 6, [colHi, col, colLo]);
      ctx.beginPath(); ctx.moveTo(-sw / 2 - 0.5, -th / 2); ctx.lineTo(sw / 2 + 0.5, -th / 2); ctx.lineTo(sw / 2 + 0.5, th / 2 + 6 - archDip * 0.4); ctx.quadraticCurveTo(0, th / 2 + 6 - archDip, -sw / 2 - 0.5, th / 2 + 6 - archDip * 0.4); ctx.closePath(); ctx.fill();
      // crenel blocks on top
      if (i % 2 === 0) { ctx.fillStyle = K.lg(ctx, 0, -th / 2 - 7, 0, -th / 2, [colHi, col]); ctx.fillRect(-sw * 0.3, -th / 2 - 6, sw * 0.6, 6.5); ctx.strokeStyle = rgb(colLo, 0.8); ctx.lineWidth = 0.8; ctx.strokeRect(-sw * 0.3, -th / 2 - 6, sw * 0.6, 6.5); }
      // brick stamp lines (furrow + ridge)
      K.pair(ctx, () => { ctx.moveTo(-sw / 2, 0); ctx.lineTo(sw / 2, 0); ctx.moveTo(i % 2 ? -sw * 0.1 : sw * 0.2, -th / 2); ctx.lineTo(i % 2 ? -sw * 0.1 : sw * 0.2, 0); }, rgb(colLo, 0.8), rgb(colHi, 0.8), 0.9, -1);
      // wet shine while wet
      if (dry < 0.6) { ctx.strokeStyle = `rgba(255,250,235,${0.55 * (1 - dry / 0.6)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-sw / 2 + 2, -th / 2 + 1.5); ctx.lineTo(sw / 2 - 3, -th / 2 + 1.5); ctx.stroke(); }
      // cracks as it dries
      if (crack > 0 && fall <= 0) {
        ctx.strokeStyle = rgb(SAND.deep, 0.8 * crack); ctx.lineWidth = 0.9; ctx.beginPath();
        const r = K.rand(i * 31 + 7);
        let px = (r() - 0.5) * sw * 0.6, py = -th / 2; ctx.moveTo(px, py);
        for (let s = 0; s < 4 * crack; s++) { px += (r() - 0.5) * 6; py += th / 4; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.strokeStyle = rgb(colLo); ctx.lineWidth = 0.8; ctx.strokeRect(-sw / 2, -th / 2, sw, 0.1);
      ctx.restore();
      // trickling sand under the breaking bridge
      if (crack > 0.2 && fall <= 0 && u < 2.3) { const r = K.rand(i * 5 + ((t * 20) | 0)); ctx.fillStyle = rgb(SAND.hi, 0.8); for (let g = 0; g < 3; g++) ctx.fillRect(cx - sw / 2 + r() * sw, BR.y + 10 + r() * 22 * crack, 1.4, 1.4); }
    }
    // dust puffs where the chunks fall away
    const pf = bump(u, 2.0, 2.15, 2.5, 2.9);
    if (pf > 0) for (let i = 0; i < 7; i++) { const x = lerp(x0 + 20, x1 - 20, i / 6), y = BR.y + 18 + (u - 2) * 40; const rr = 7 + (u - 2) * 14; ctx.fillStyle = K.rg2(ctx, x - rr * 0.3, y - rr * 0.3, 1, x, y, rr, [[0, SAND.lit, 0.7 * pf], [0.7, SAND.hi, 0.45 * pf], [1, SAND.hi, 0]]); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
  }

  // ---------- Bucket Drop: a ledge on the right wall, a shadow, a giant bucket plonks a turret on its tip ----------
  const BK = { y: 178, P: 4, o: 1.6 };
  function ledge(ctx, R, w) {
    const xe = R(BK.y), x0 = xe - 66;
    ctx.fillStyle = K.lg(ctx, 0, BK.y - 2, 0, BK.y + 22, [SAND.lit, SAND.hi, SAND.lo]);
    ctx.beginPath(); ctx.moveTo(xe + 6, BK.y); ctx.lineTo(x0 + 4, BK.y); ctx.quadraticCurveTo(x0, BK.y + 1, x0 + 1, BK.y + 6); ctx.lineTo(x0 + 6, BK.y + 16); ctx.quadraticCurveTo(xe - 20, BK.y + 30, xe + 6, BK.y + 34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(SAND.deep, 0.8); ctx.lineWidth = 1; ctx.stroke();
    K.pair(ctx, () => { ctx.moveTo(x0 + 8, BK.y + 8); ctx.lineTo(xe, BK.y + 8); }, rgb(SAND.deep, 0.4), rgb(SAND.lit, 0.7), 1, -1);
    ctx.strokeStyle = rgb(SAND.lit); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0 + 4, BK.y + 0.6); ctx.lineTo(xe, BK.y + 0.6); ctx.stroke();
    scallop(ctx, x0 + 26, BK.y + 15, 0.7, 0.3, [250, 196, 176]);
    return x0;
  }
  function turret(ctx, x, yb, hh, slump, col) {
    // a bucket-shaped turret (frustum) with rings and crenels; slump melts it into a mound
    const H = hh * (1 - slump * 0.85), wb = 23 + slump * 12, wt = 17 + slump * 16;
    ctx.fillStyle = K.lg(ctx, x - wb, 0, x + wb, 0, [K.lift(col, -40), K.lift(col, 20), col, K.lift(col, -50)]);
    ctx.beginPath(); ctx.moveTo(x - wb, yb); ctx.quadraticCurveTo(x - wt - slump * 6, yb - H * 0.6, x - wt, yb - H); ctx.lineTo(x + wt, yb - H); ctx.quadraticCurveTo(x + wt + slump * 6, yb - H * 0.6, x + wb, yb); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(col, -80)); ctx.lineWidth = 1; ctx.stroke();
    if (slump < 0.6) {
      for (const v of [0.3, 0.55, 0.8]) { const y = yb - H * v, ww = lerp(wb, wt, v); K.pair(ctx, () => { ctx.moveTo(x - ww + 2, y); ctx.lineTo(x + ww - 2, y); }, rgb(K.lift(col, -70), 0.5), rgb(K.lift(col, 50), 0.6), 1, -1.1); }
      for (let k = 0; k < 3; k++) { const cx = x - wt + 2 + k * (wt * 2 - 4) / 2.6; ctx.fillStyle = K.lg(ctx, 0, yb - H - 6, 0, yb - H, [K.lift(col, 40), col]); ctx.fillRect(cx, yb - H - 6, (wt * 2 - 4) / 5, 6.5); }
      ctx.strokeStyle = 'rgba(255,250,235,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - wt + 3, yb - H + 3); ctx.quadraticCurveTo(x - wt - 1, yb - H * 0.5, x - wb + 4, yb - 3); ctx.stroke();
    }
  }
  function bucketDrop(ctx, w, h, t, R) {
    const u = ph(t, BK.P, BK.o), x0 = ledge(ctx, R, w), bx = x0 + 22, yb = BK.y;
    const shadow = smooth(0.4, 1.5, u) * (1 - smooth(1.62, 1.7, u));
    const fallV = smooth(1.45, 1.72, u), land = u > 1.72, lift = smooth(1.95, 2.35, u), slump = smooth(3.15, 3.85, u);
    // the tell: a round shadow on the ledge and a dotted plumb line, growing darker
    if (shadow > 0) {
      ctx.save(); ctx.globalAlpha = shadow;
      K.shadow(ctx, bx, yb - 1, 14 + 12 * shadow, 4 + 3 * shadow, 0.5);
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(120,70,40,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, yb - 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // the turret it leaves (wet when fresh, drying, then slumping into a mound)
    if (land && u < 3.95) {
      K.danger(ctx, bx, yb - 18, 40, 0.18 * (1 - slump));
      const col = K.mix(WET.hi, SAND.hi, smooth(2.2, 3.2, u));
      turret(ctx, bx, yb, 46, slump, col);
      if (slump > 0) { ctx.fillStyle = rgb(SAND.hi, 0.7 * (1 - slump)); for (let g = 0; g < 6; g++) ctx.fillRect(bx - 20 + g * 7, yb + 4 + ((t * 40 + g * 11) % 26), 1.5, 1.5); }
    }
    // the bucket: a big red pail, upside down, slamming down then lifting away
    if (u > 1.4 && u < 2.4) {
      const yy = land ? yb - 50 - lift * 230 : lerp(-70, yb - 50, ease(fallV));
      ctx.save(); ctx.translate(bx, yy);
      // body (a frustum, rim at the bottom since it is upside down)
      ctx.fillStyle = K.lg(ctx, -28, 0, 28, 0, ['#a8241e', '#ff5a44', '#ff7a5e', '#c2301f', '#7a1612']);
      ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.lineTo(27, 48); ctx.lineTo(-27, 48); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a1612'; ctx.lineWidth = 1.2; ctx.stroke();
      // moulded rings and a rolled rim
      for (const v of [10, 22, 34]) { const ww = lerp(20, 27, (v + 6) / 54); K.pair(ctx, () => { ctx.moveTo(-ww + 1, v); ctx.lineTo(ww - 1, v); }, 'rgba(110,20,16,.6)', 'rgba(255,170,150,.7)', 1.2, -1.2); }
      ctx.fillStyle = K.lg(ctx, 0, 44, 0, 52, ['#ff8a70', '#c2301f']); ctx.beginPath(); ctx.roundRect(-29, 44, 58, 7, 3); ctx.fill(); ctx.strokeStyle = '#7a1612'; ctx.lineWidth = 1; ctx.stroke();
      // the handle hoop
      ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-24, 26); ctx.quadraticCurveTo(0, -30, 24, 26); ctx.stroke();
      ctx.strokeStyle = '#b88a10'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-23, 27); ctx.quadraticCurveTo(0, -27, 23, 27); ctx.stroke();
      // a printed starfish on the side
      ctx.fillStyle = '#ffe07a'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -PI / 2 + k * PI / 5, r = k % 2 ? 3.4 : 8; ctx.lineTo(Math.cos(a) * r, 22 + Math.sin(a) * r); } ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,230,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, 2); ctx.lineTo(-20, 40); ctx.stroke();
      ctx.restore();
      // the plonk: a burst of sand and drops
      const pk = bump(u, 1.7, 1.75, 1.85, 2.1);
      if (pk > 0) for (let k = 0; k < 10; k++) { const a = PI + k * PI / 9, d = 12 + (u - 1.7) * 120; ctx.fillStyle = rgb(WET.hi, pk); ctx.beginPath(); ctx.arc(bx + Math.cos(a) * d * 1.2, yb - 4 + Math.sin(a) * d * 0.45, 2.4, 0, TAU); ctx.fill(); }
    }
  }

  // ---------- Kite Tail: a diamond kite above, its ribbon tail rippling down the shaft and sweeping across ----------
  const KT = { P: 4, o: 0.9 };
  function kite(ctx, w, h, t) {
    const u = ph(t, KT.P, KT.o);
    const dip = bump(u, 0.6, 1.1, 2.6, 3.4), sweep = smooth(1.1, 2.4, u) * (1 - smooth(2.7, 3.8, u));
    const kx = w * 0.3 + Math.sin(t * 0.9) * 6 + sweep * w * 0.32, ky = 34 + dip * 22 + Math.sin(t * 1.3) * 4;
    // the tail: a ribbon of N points; a travelling wave runs down it and its centre line swings across the shaft
    const N = 34, L = 250, pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, amp = (8 + 30 * s) * (0.45 + 0.55 * (dip + sweep * 0.5)), wav = Math.sin(s * 9 - t * 7) * amp;
      const lag = Math.sin(s * 2.2 - t * 1.4) * 10;
      const cx = kx + (w * 0.18 - sweep * w * 0.05) * s * (1 - sweep * 2.2) + lag + wav;
      pts.push([cx, ky + 22 + s * L]);
    }
    // the shove: soft white streaks along the ribbon when it sweeps
    if (sweep > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,255,255,${0.25 * sweep})`; ctx.lineWidth = 16; K.smoothPath(ctx, pts); ctx.stroke(); ctx.restore(); }
    // the string to the kite from far off-screen (the giant child holds it)
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(kx, ky + 6); ctx.quadraticCurveTo(kx + 60, ky + 60, w + 10, ky + 40); ctx.stroke();
    // ribbon: two-tone (a wide band and a stripe) with bows every few points
    const ribbon = (lw, c) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; K.smoothPath(ctx, pts); ctx.stroke(); };
    ribbon(9, '#2b6fb8'); ribbon(6.5, '#4fa8ff'); ribbon(2, '#e8f6ff');
    ctx.save(); ctx.translate(-0.8, -1); ribbon(1, 'rgba(255,255,255,.5)'); ctx.restore();
    for (let i = 4; i <= N; i += 5) {
      const [x, y] = pts[i], a = Math.atan2(pts[Math.min(N, i + 1)][1] - pts[i - 1][1], pts[Math.min(N, i + 1)][0] - pts[i - 1][0]);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + PI / 2);
      const c = (i / 5) % 2 ? ['#ff5a6e', '#ff9aa6', '#b8263c'] : ['#ffcf3a', '#fff0a0', '#c08a10'];
      for (const d of [-1, 1]) { ctx.fillStyle = K.lg(ctx, 0, 0, d * 10, 0, [c[2], c[0], c[1]]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 6, -7, d * 10, -2); ctx.quadraticCurveTo(d * 8, 1, d * 10, 4); ctx.quadraticCurveTo(d * 5, 5, 0, 0); ctx.fill(); ctx.strokeStyle = c[2]; ctx.lineWidth = 0.7; ctx.stroke(); }
      ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // the kite: a diamond with a cross of sticks, two panels each, a grinning sun face
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.sin(t * 1.7) * 0.12 - sweep * 0.3);
    const P = [[0, -30], [20, -6], [0, 26], [-20, -6]];
    const tri = (a, b, c, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath(); ctx.fill(); };
    tri([0, -6], P[0], P[1], K.lg(ctx, 0, -30, 20, -6, ['#ffe27a', '#ffb42a']));
    tri([0, -6], P[1], P[2], K.lg(ctx, 20, -6, 0, 26, ['#ff7a3a', '#e0421e']));
    tri([0, -6], P[2], P[3], K.lg(ctx, 0, 26, -20, -6, ['#d63a1c', '#ff6a32']));
    tri([0, -6], P[3], P[0], K.lg(ctx, -20, -6, 0, -30, ['#fff2b0', '#ffd14a']));
    ctx.strokeStyle = '#a8461a'; ctx.lineWidth = 1.1; K.path(ctx, P, true); ctx.stroke();
    ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 26); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,240,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -26); ctx.lineTo(-16, -8); ctx.stroke();
    // the face on it
    ctx.fillStyle = '#7a2a10'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 5, -2, 1.6, 2.2, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#7a2a10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 3, 5, 0.3, PI - 0.3); ctx.stroke();
    ctx.restore();
  }

  // the tide at the foot of the castle: turquoise water with a foam line, sloshing up
  function tide(ctx, w, h, t, L, R) {
    const y = h - 26 + Math.sin(t * 1.6) * 4;
    ctx.fillStyle = K.lg(ctx, 0, y, 0, h, ['rgba(80,214,214,.95)', 'rgba(36,150,180,.98)']);
    ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.07 + t * 3) * 2.5); ctx.lineTo(w, h); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.2; ctx.beginPath(); for (let x = 0; x <= w; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.07 + t * 3) * 2.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= w; x += 10) { const yy = y + 9 + Math.sin(x * 0.11 - t * 2) * 2; ctx.moveTo(x, yy); ctx.lineTo(x + 5, yy); } ctx.stroke();
  }

  PV.sections['sandcastle'] = (ctx, w, h, t) => {
    sky(ctx, w, h, t);
    farKeep(ctx, w, h, t);
    // warm sun haze and a soft god-ray from the upper left
    K.ray(ctx, w * 0.15, -20, -0.25, 0.22, h * 1.1, [255, 250, 220], 0.16);
    const L = sandWall(ctx, -1, w, h, t), R = sandWall(ctx, 1, w, h, t);
    tide(ctx, w, h, t, L, R);
    // coins
    for (const [x, y, o] of [[0.38, 110, 0], [0.5, 236, 1], [0.5, 336, 2], [0.5, 362, 2.6]]) K.coin(ctx, w * x, y, 0.62, t, o);
    bridge(ctx, w, h, t, L, R);
    bucketDrop(ctx, w, h, t, R);
    kite(ctx, w, h, t);
    K.rocket(ctx, w * 0.5, h * 0.82, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 245, 220], 14, 41);
  };
})();

// ===================================================================================================
// CONCH SPIRAL: up the spiral inside a giant pink conch. Pearl Orbit, Echo Ring, Undertow.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump, ease } = K;
  // nacre: pink at the foot, lilac in the middle, mint high up (the iridescence shifts with height)
  const NAC = y => K.mix(K.mix([236, 120, 140], [248, 150, 140], smooth(80, 300, 480 - y)), [255, 196, 170], smooth(300, 470, 480 - y) * 0.7);

  const edgeOf = (side, w) => {
    const base = side < 0 ? 34 : w - 34, o = side < 0 ? 0 : 55;
    return y => {
      const v = ((y + o) % 110 + 110) % 110 / 110;                // one whorl of the spiral every 110 px, sides offset
      const rib = Math.exp(-((v - 0.5) ** 2) / 0.004) * 13;          // the suture ridge where two whorls meet
      return base - side * (Math.sin((y + o) * 0.057) * 5 + rib);
    };
  };

  // the chamber behind: a helix of whorls receding up into a soft glow, light coming through thin shell
  function chamber(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#f6ae9e', '#ee968e', '#d06a7a', '#a24668', '#7a3054']); ctx.fillRect(0, 0, w, h);
    K.glow(ctx, w * 0.5, 10, 120, [255, 236, 226], 0.4);
    // patches of light through the thin shell wall
    for (const [x, y, r, c] of [[0.25, 160, 60, [255, 210, 230]], [0.78, 300, 70, [220, 200, 255]], [0.4, 420, 55, [255, 200, 214]]]) K.glow(ctx, w * x, y, r, c, 0.28);
    // the whorls: ellipse bands that get closer and smaller toward the top (looking up the spiral)
    const turn = t * 0.12;                                           // the twist: the spiral slowly winds round
    for (let k = 0; k < 9; k++) {
      const y = h - 30 - (1 - Math.pow(0.82, k)) * h * 1.35, rx = w * (0.62 - k * 0.035), ry = 18 - k * 1.2;
      if (y < -30) continue;
      const fade = 0.02 + k * 0.05, col = K.mix(K.lift(NAC(y), -30), [246, 226, 244], fade);
      // shade under the roll, then the roll itself: back half darker, front half a glossy tube
      ctx.strokeStyle = rgb(K.lift(col, -70), 0.35); ctx.lineWidth = 16 - k; ctx.beginPath(); ctx.ellipse(w / 2, y + 6, rx, ry, 0, 0, PI); ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(col, -50), 0.7); ctx.lineWidth = 9 - k * 0.6; ctx.beginPath(); ctx.ellipse(w / 2, y, rx, ry, 0, PI, TAU); ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(col, -60), 0.95); ctx.lineWidth = 11 - k * 0.7; ctx.beginPath(); ctx.ellipse(w / 2, y + 1, rx, ry, 0, 0, PI); ctx.stroke();
      ctx.strokeStyle = rgb(col, 0.95); ctx.lineWidth = 7 - k * 0.5; ctx.beginPath(); ctx.ellipse(w / 2, y - 0.5, rx, ry, 0, 0, PI); ctx.stroke();
      ctx.strokeStyle = rgb([255, 244, 236], 0.8); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(w / 2, y - 3, rx, ry, 0, 0.3, PI - 0.3); ctx.stroke();
      // a sheen sliding round each whorl as the spiral turns
      const a = ((turn * 3 + k * 0.7) % 1) * PI;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(w / 2, y, rx, ry, 0, a, a + 0.35); ctx.stroke();
    }
    // the columella: the shell's central column, a pale twisted pillar far behind
    ctx.fillStyle = K.lg(ctx, w * 0.44, 0, w * 0.56, 0, ['rgba(190,90,110,.4)', 'rgba(255,200,190,.4)', 'rgba(170,80,100,.4)']);
    ctx.fillRect(w * 0.45, -10, w * 0.1, h * 0.55);
    ctx.strokeStyle = 'rgba(170,120,180,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let y = -10 + ((t * 8) % 18); y < h * 0.55; y += 18) { ctx.moveTo(w * 0.45, y); ctx.quadraticCurveTo(w * 0.5, y + 6, w * 0.55, y + 2); }
    ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(255,230,230,.14)', 'rgba(255,240,248,0)']); ctx.fillRect(0, 0, w, h);
  }

  // the near walls: smooth nacre in growth bands, an iridescent sheen, pearls in pockets, the rolled lip
  function shellWall(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.12,
      fill: () => { const g = ctx.createLinearGradient(0, 0, 0, h); for (let k = 0; k <= 4; k++) { const y = k * h / 4; g.addColorStop(k / 4, rgb(K.mix(NAC(y), [90, 24, 50], 0.5))); } return g; },
      deco: () => {
        // the inner face lit from the chamber: a gradient band along the edge
        ctx.save();
        ctx.beginPath(); for (let y = -4; y <= h + 4; y += 4) ctx.lineTo(ex(y) + side * 28, y); for (let y = h + 4; y >= -4; y -= 4) ctx.lineTo(ex(y), y); ctx.closePath();
        const g = ctx.createLinearGradient(X(0), 0, X(46), 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,220,240,.3)'); ctx.fillStyle = g; ctx.fill();
        ctx.restore();
        // growth bands: lines that follow the edge, each a furrow + lit ridge, tinted by height
        for (let k = 1; k < 7; k++) {
          const d = k * 4.6 + 2;
          ctx.save(); ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(110,30,60,${0.3 + (k % 2) * 0.1})`; ctx.lineWidth = 1.1; ctx.beginPath(); for (let y = -4; y <= h + 4; y += 6) ctx.lineTo(ex(y) - side * d, y); ctx.stroke();
          ctx.strokeStyle = `rgba(255,214,200,${0.18 + (k % 2) * 0.1})`; ctx.lineWidth = 0.8; ctx.beginPath(); for (let y = -4; y <= h + 4; y += 6) ctx.lineTo(ex(y) - side * (d - 1.3), y - 0.8); ctx.stroke();
          ctx.restore();
        }
        // the cut edge of the shell's outside: cream with brown flame zigzags (the conch's own markings)
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(10), 0, ['#c89a72', '#f0d6b4']); ctx.fillRect(side < 0 ? 0 : w - 10, 0, 10, h);
        ctx.strokeStyle = 'rgba(140,70,40,.75)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let y = -10; y < h + 10; y += 22) { ctx.moveTo(X(0), y); ctx.lineTo(X(6), y + 5); ctx.lineTo(X(2), y + 10); ctx.lineTo(X(8), y + 16); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(110,40,50,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let y = -4; y <= h + 4; y += 6) ctx.lineTo(X(10.5), y); ctx.stroke();
        // iridescent sheen: a pastel rainbow streak that slides up the wall
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) {
          const y0 = ((t * 22 + k * 170 + (side > 0 ? 80 : 0)) % (h + 160)) - 80;
          const g = ctx.createLinearGradient(0, y0 - 50, 0, y0 + 50);
          g.addColorStop(0, 'rgba(255,170,220,0)'); g.addColorStop(0.3, 'rgba(255,170,220,.16)'); g.addColorStop(0.5, 'rgba(170,220,255,.2)'); g.addColorStop(0.7, 'rgba(170,255,220,.16)'); g.addColorStop(1, 'rgba(170,255,220,0)');
          ctx.fillStyle = g; ctx.fillRect(side < 0 ? 0 : w - 46, y0 - 50, 46, 100);
        }
        ctx.restore();
        // suture ridges: the seam where the next whorl overlaps, a dark groove under a lit roll
        for (let k = -1; k < 6; k++) {
          const y = k * 110 + 55 - (side < 0 ? 0 : 55);
          const rollPath = () => { ctx.moveTo(X(-2), y + 16); ctx.quadraticCurveTo(X(18), y + 7, ex(y) - side * 2, y); };
          ctx.save(); ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(80,16,40,.45)'; ctx.lineWidth = 13; ctx.beginPath(); ctx.translate(0, 3); rollPath(); ctx.stroke(); ctx.translate(0, -3);
          ctx.strokeStyle = '#9a3a58'; ctx.lineWidth = 11; ctx.beginPath(); rollPath(); ctx.stroke();
          ctx.strokeStyle = '#f2967e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.translate(0, -1.2); rollPath(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,236,224,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.translate(0, -2); rollPath(); ctx.stroke();
          ctx.restore();
          // a pearl in a pocket under the ridge
          const px = X(12 + (k % 2) * 6), py = y + 32;
          ctx.fillStyle = 'rgba(120,60,110,.45)'; ctx.beginPath(); ctx.ellipse(px, py + 1, 7, 6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = K.rg2(ctx, px - 2, py - 2, 0.5, px, py, 5.5, [[0, '#ffffff'], [0.4, '#fbeff6'], [0.8, '#dcc6e4'], [1, '#a88ab8']]); ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(px - 1.8, py - 1.8, 1.3, 0, TAU); ctx.fill();
        }
      },
      lip: ['#8a2e50', '#ffb8a8', '#fff0e6'], lipW: 4.5,
    });
    return ex;
  }

  // ---------- Pearl Orbit: a pearl rolling round the spiral groove, harmless behind, deadly in front ----------
  const PO = { y: 118, P: 4, o: 0 };
  function grooveRing(ctx, w, L, R, front) {
    const cx = w / 2, rx = (R(PO.y) - L(PO.y)) / 2 + 6, ry = 22;
    if (!front) {
      // the back half of the groove: a channel in the far shell
      ctx.strokeStyle = 'rgba(130,40,70,.5)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(cx, PO.y, rx, ry, 0, PI, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,248,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(cx, PO.y + 4, rx, ry, 0, PI + 0.1, TAU - 0.1); ctx.stroke();
    } else {
      // the front lip of the groove: a glossy nacre rail curving under the near side
      ctx.strokeStyle = '#8a2e4c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(cx, PO.y + 3, rx, ry, 0, 0.05, PI - 0.05); ctx.stroke();
      ctx.strokeStyle = '#f49a88'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.ellipse(cx, PO.y + 2, rx, ry, 0, 0.05, PI - 0.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, PO.y + 0.5, rx, ry, 0, 0.4, PI - 0.6); ctx.stroke();
    }
    return [cx, rx, ry];
  }
  function pearlAt(t, w, L, R) {
    const cx = w / 2, rx = (R(PO.y) - L(PO.y)) / 2 + 6, ry = 22, a = TAU * ph(t, PO.P, PO.o) / PO.P - PI / 2;
    return { x: cx + Math.cos(a) * (rx - 12), y: PO.y + Math.sin(a) * (ry - 4), front: Math.sin(a), a, cx, rx };
  }
  function drawPearl(ctx, p, t) {
    const near = (p.front + 1) / 2, r = lerp(7, 18, near * near), dim = lerp(0.5, 1, near);
    if (p.front > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,230,240,${0.35 * p.front})`; ctx.lineWidth = r * 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(p.cx, PO.y, p.rx - 12, 18, 0, p.a - 0.7, p.a - 0.05); ctx.stroke(); ctx.restore(); }
    if (p.front > 0.05) K.danger(ctx, p.x, p.y + 4, 34, 0.3 * smooth(0.05, 0.5, p.front));
    // its motion trail along the groove
    ctx.save(); ctx.globalAlpha = dim;
    K.shadow(ctx, p.x, p.y + r * 0.85, r * 0.9, r * 0.3, 0.3);
    ctx.fillStyle = K.rg2(ctx, p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r, [[0, '#ffffff'], [0.35, '#fdf3f8'], [0.75, '#e4cce4'], [1, '#a37fb2']]);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6aa0'; ctx.lineWidth = 1; ctx.stroke();
    // orient (rainbow) lustre and the rolling glint
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(150,230,255,.35)'; ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.72, 0.2, 1.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,220,.35)'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.72, 1.3, 2.4); ctx.stroke();
    ctx.restore();
    K.sheen(ctx, p.x, p.y, r, 0.7);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(p.x - r * 0.38, p.y - r * 0.42, r * 0.2, r * 0.12, -0.7, 0, TAU); ctx.fill();
    ctx.restore();
    if (p.front > 0.3) K.glow(ctx, p.x - 2, p.y - 2, r * 2.2, [255, 240, 250], 0.25 * p.front);
  }

  // ---------- Echo Ring: the shell hums, then a ring of sound closes in from the walls and opens out ----------
  const ER = { y: 248, P: 4, o: 2.0 };
  function echoRing(ctx, w, h, t, L, R) {
    const u = ph(t, ER.P, ER.o), hum = bump(u, 0.3, 0.9, 1.4, 1.6);
    const close = smooth(1.3, 2.3, u), open = smooth(2.5, 3.4, u), k = close * (1 - open);   // 0 at the walls, 1 at the middle
    const xl = L(ER.y), xr = R(ER.y), half = (xr - xl) / 2, cx = (xl + xr) / 2;
    // the tell: hum lines shimmering on both walls (arcs breathing out of the nacre)
    if (hum > 0) for (const side of [-1, 1]) {
      const ex = side < 0 ? xl : xr;
      for (let i = 0; i < 3; i++) {
        const rr = 10 + i * 9 + Math.sin(t * 14 + i) * 2;
        ctx.strokeStyle = `rgba(214,190,255,${0.7 * hum * (1 - i * 0.25)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ER.y, rr, side < 0 ? -1.1 : PI - 1.1, side < 0 ? 1.1 : PI + 1.1); ctx.stroke();
      }
    }
    if (u < 1.25 || u > 3.6) return;
    const a = smooth(1.25, 1.45, u) * (1 - smooth(3.3, 3.6, u));
    // the ring: an ellipse of rippling sound that shrinks toward the middle and grows back out
    const rx = lerp(half + 4, 26, k), ry = lerp(30, 12, k);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const off = i * 6;
      ctx.strokeStyle = `rgba(200,170,255,${a * (0.55 - i * 0.15)})`; ctx.lineWidth = 7 - i * 2; ctx.beginPath();
      for (let s = 0; s <= 48; s++) { const q = s / 48 * TAU, wob = Math.sin(q * 8 + t * 20) * 2.4; const x = cx + Math.cos(q) * (rx + off + wob), y = ER.y + Math.sin(q) * (ry + off * 0.4 + wob * 0.4); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = `rgba(255,250,255,${a * 0.9})`; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let s = 0; s <= 48; s++) { const q = s / 48 * TAU, wob = Math.sin(q * 8 + t * 20) * 2.4; const x = cx + Math.cos(q) * (rx + wob), y = ER.y + Math.sin(q) * (ry + wob * 0.4); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // dizzy swirls and little stars riding the ring (the daze)
    for (let i = 0; i < 6; i++) {
      const q = i / 6 * TAU + t * 1.5, x = cx + Math.cos(q) * rx, y = ER.y + Math.sin(q) * ry;
      K.star4(ctx, x, y, 3.2, [255, 230, 140], a);
      ctx.strokeStyle = `rgba(190,150,255,${a * 0.8})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 6, y - 5, 3, q, q + 4); ctx.stroke();
    }
    // music-like hum glyphs at the walls
  }

  // ---------- Undertow: the shell breathes with the sea; bubbles show the current's way ----------
  const UT = { P: 4, o: 0.6 };
  function undertow(ctx, w, h, t, L, R) {
    const u = ph(t, UT.P, UT.o);
    // 0..1.2 calm (slow drifting bubbles), 1.2..2.0 bubbles stream DOWN (the tell), 2.0..2.8 the drag down, 2.8..3.8 lift up
    const tell = bump(u, 1.0, 1.4, 2.0, 2.1), down = bump(u, 1.9, 2.1, 2.7, 2.9), up = bump(u, 2.8, 3.0, 3.6, 3.95);
    const y0 = 300, y1 = h - 4, dir = up > 0.05 ? -1 : 1, strength = Math.max(tell * 0.5, down, up);
    // current streaks: long soft bands with chevrons pointing the way
    if (strength > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = lerp(L(400) + 20, R(400) - 20, i / 5) + Math.sin(i * 2.1 + t) * 4, sp = (down + up) * 180 + 30;
        const yy = ((dir > 0 ? t * sp : -t * sp) + i * 47) % (y1 - y0);
        const y = y0 + ((yy + (y1 - y0)) % (y1 - y0));
        ctx.fillStyle = K.lg(ctx, 0, y - 40 * dir, 0, y + 10 * dir, [`rgba(160,240,255,0)`, `rgba(190,245,255,${0.28 * strength})`]);
        ctx.fillRect(x - 3, Math.min(y - 40 * dir, y + 10 * dir), 6, 50);
        if (down + up > 0.4) {
          ctx.strokeStyle = `rgba(230,255,255,${0.55 * strength})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 5, y - 6 * dir); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - 6 * dir); ctx.stroke();
        }
      }
      ctx.restore();
    }
    // bubbles: rise when calm or lifting, stream down in the tell and the drag
    const r = K.rand(77);
    for (let i = 0; i < 22; i++) {
      const bx = lerp(L(380) + 10, R(380) - 10, r()), sz = 1.6 + r() * 2.6, off = r() * 400, sp = 22 + r() * 30;
      const v = dir > 0 && (tell + down) > 0.2 ? (t * (sp + 120 * down) + off) : -(t * (sp + 140 * up) + off);
      const by = y0 + (((v % (y1 - y0)) + (y1 - y0)) % (y1 - y0)), bxx = bx + Math.sin(t * 2 + i) * 3;
      ctx.strokeStyle = 'rgba(240,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bxx, by, sz, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(200,240,255,.18)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(bxx - sz * 0.35, by - sz * 0.35, sz * 0.3, 0, TAU); ctx.fill();
    }
    // the mouths of the shell's water vents on both walls, where the sea breathes in and out
    for (const side of [-1, 1]) {
      const y = side < 0 ? 330 : 400, ex = side < 0 ? L(y) : R(y);
      ctx.save(); ctx.translate(ex, y); ctx.scale(side, 1);
      ctx.fillStyle = K.rg2(ctx, -4, 0, 1, -6, 0, 13, [[0, '#4a2a5a'], [0.7, '#7a4a86'], [1, '#c890c8']]); ctx.beginPath(); ctx.ellipse(-6, 0, 7, 12, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#f6d4ec'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(-6, 0, 8, 13, 0, -1.4, 1.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(-6, -1, 8, 13, 0, -1.2, 0.2); ctx.stroke();
      ctx.restore();
    }
  }

  // a scuttling hermit crab peeking from a pocket (set dressing: the shell has a lodger)
  function lodger(ctx, x, y, t, side) {
    const peek = 0.5 + 0.5 * Math.sin(t * 1.3);
    ctx.save(); ctx.translate(x, y); ctx.scale(side, 1);
    ctx.fillStyle = K.rg2(ctx, -3, -3, 1, 0, 0, 10, [[0, '#ff9a7a'], [1, '#c24a3a']]); ctx.beginPath(); ctx.ellipse(4 * peek, 0, 6, 4.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a2a20'; ctx.lineWidth = 0.8; ctx.stroke();
    for (const d of [-1, 1]) { ctx.strokeStyle = '#c24a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4 * peek + 2, -2 + d); ctx.lineTo(6 * peek + 6, -8 + d * 2); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6 * peek + 6, -8 + d * 2, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a1020'; ctx.beginPath(); ctx.arc(6 * peek + 6.4, -8 + d * 2, 0.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  PV.sections['conch'] = (ctx, w, h, t) => {
    chamber(ctx, w, h, t);
    const L0 = edgeOf(-1, w), R0 = edgeOf(1, w);
    // the pearl behind the column is drawn with the chamber (back side of its groove)
    const p = pearlAt(t, w, L0, R0);
    grooveRing(ctx, w, L0, R0, false);
    if (p.front <= 0) drawPearl(ctx, p, t);
    const L = shellWall(ctx, -1, w, h, t), R = shellWall(ctx, 1, w, h, t);
    lodger(ctx, L(190) + 4, 192, t, 1);
    undertow(ctx, w, h, t, L, R);
    grooveRing(ctx, w, L, R, true);
    if (p.front > 0) drawPearl(ctx, p, t);
    for (const [x, y, o] of [[0.5, 180, 0], [0.36, 300, 1.2], [0.64, 300, 2], [0.5, 340, 2.6]]) K.coin(ctx, w * x, y, 0.62, t, o);
    echoRing(ctx, w, h, t, L, R);
    K.rocket(ctx, w * 0.5 + Math.sin(t * 1.1) * 6, h * 0.82, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 236, 250], 16, 23);
  };
})();

// ===================================================================================================
// CORAL KINGDOM: a sunlit reef wall. Puffer Bloat, Anemone Surge, Manta Lift; fish schools part around you.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump, ease } = K;
  const edgeOf = (side, w) => {
    const base = side < 0 ? 33 : w - 33, s = side < 0 ? 1.3 : 4.1;
    return y => base - side * (Math.sin(y * 0.031 + s) * 7 + Math.sin(y * 0.083 + s * 2) * 4 + Math.max(0, Math.sin(y * 0.017 + s)) * 6);
  };

  function water(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#7fe8e6', '#2fc0cc', '#1696b4', '#0e6a92']); ctx.fillRect(0, 0, w, h);
    // the surface far above: a bright rippling band of light
    K.glow(ctx, w * 0.55, -30, 200, [230, 255, 240], 0.5);
    // sun rays slanting down, slowly breathing
    for (const [x, a, ha, al] of [[0.3, 0.18, 0.06, 0.16], [0.55, 0.12, 0.05, 0.14], [0.78, 0.06, 0.07, 0.12], [0.1, 0.24, 0.04, 0.1]]) K.ray(ctx, w * x, -10, a, ha, h * 1.1, [220, 255, 240], al * (0.75 + 0.25 * Math.sin(t * 0.8 + x * 9)));
    // far reef: coral towers and fans as soft blue silhouettes in two layers
    for (const [layer, col, fy] of [[0, [70, 170, 196], 0.55], [1, [52, 140, 172], 0.7]]) {
      const r = K.rand(19 + layer * 7);
      ctx.fillStyle = rgb(col);
      for (let i = 0; i < 6; i++) {
        const x = r() * w, base = h, top = h * (fy - 0.25 * r()) + layer * 30, bw = 18 + r() * 26;
        // a stacked coral tower: lumpy column with plate tiers
        ctx.beginPath(); ctx.moveTo(x - bw, base); ctx.quadraticCurveTo(x - bw * 0.7, top + 40, x - bw * 0.4, top); ctx.quadraticCurveTo(x, top - 14, x + bw * 0.4, top); ctx.quadraticCurveTo(x + bw * 0.7, top + 40, x + bw, base); ctx.fill();
        for (let k = 0; k < 2; k++) { const py = top + 30 + k * 50; ctx.beginPath(); ctx.ellipse(x + (k ? 10 : -8), py, bw * 0.9, 5, 0, 0, TAU); ctx.fill(); }
        // a sea fan
        if (i % 2) { ctx.save(); ctx.strokeStyle = rgb(col); ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = -PI / 2 + (k - 3) * 0.28; ctx.moveTo(x + bw, top + 60); ctx.quadraticCurveTo(x + bw + Math.cos(a) * 14, top + 60 + Math.sin(a) * 14, x + bw + Math.cos(a) * 30, top + 60 + Math.sin(a) * 30); } ctx.stroke(); ctx.restore(); }
      }
      // a far school of fish, tiny dashes drifting
      if (layer === 0) { ctx.fillStyle = rgb(K.lift(col, 30)); for (let i = 0; i < 18; i++) { const fx = ((r() * w + t * 8) % (w + 40)) - 20, fy2 = 120 + r() * 60 + Math.sin(t + i) * 3; ctx.beginPath(); ctx.ellipse(fx, fy2, 3, 1.2, 0, 0, TAU); ctx.fill(); } }
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(127,232,230,.28)', 'rgba(22,150,180,.12)', 'rgba(14,106,146,.2)']); ctx.fillRect(0, 0, w, h);
    }
    // caustic light net dancing over everything in the back
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(220,255,250,.12)'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 7; k++) { ctx.beginPath(); for (let x = -10; x <= w + 10; x += 10) { const y = 30 + k * 62 + Math.sin(x * 0.05 + t * 1.6 + k) * 8 + Math.sin(x * 0.11 - t * 1.1) * 4; x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.restore();
  }

  // ---- reef wall pieces ----
  function brainCoral(ctx, x, y, r, c) {
    ctx.fillStyle = K.rg2(ctx, x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r, [[0, K.lift(c, 60)], [0.6, c], [1, K.lift(c, -60)]]);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.82, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c, -70)); ctx.lineWidth = 1; ctx.stroke();
    // meandering grooves as furrow + ridge pairs
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r - 1, r * 0.82 - 1, 0, 0, TAU); ctx.clip();
    const rr = K.rand((x * 13 + y) | 0);
    K.pair(ctx, () => {
      for (let k = -2; k <= 2; k++) { const yy = y + k * r * 0.32; ctx.moveTo(x - r, yy); for (let s = 1; s <= 6; s++) ctx.quadraticCurveTo(x - r + (s - 0.5) * r / 3, yy + (s % 2 ? -1 : 1) * (2 + rr() * 3), x - r + s * r / 3, yy); }
    }, rgb(K.lift(c, -80), 0.7), rgb(K.lift(c, 70), 0.8), 1.2, 1);
    ctx.restore();
    K.sheen(ctx, x - 1, y - 1, r, 0.35);
  }
  function tableCoral(ctx, x, y, len, side, c) {
    // a flat plate jutting from the wall on a short stem, lit top, shaded underside
    const tip = x + side * len;
    ctx.fillStyle = K.lg(ctx, 0, y - 4, 0, y + 6, [K.lift(c, 50), c, K.lift(c, -60)]);
    ctx.beginPath(); ctx.moveTo(x - side * 4, y - 2); ctx.quadraticCurveTo((x + tip) / 2, y - 7, tip, y - 2); ctx.quadraticCurveTo(tip + side * 3, y + 1, tip, y + 3); ctx.quadraticCurveTo((x + tip) / 2, y + 2, x - side * 4, y + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c, -70)); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = rgb(K.lift(c, 80), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.quadraticCurveTo((x + tip) / 2, y - 6.5, tip - side * 2, y - 2.5); ctx.stroke();
    ctx.fillStyle = rgb(K.lift(c, 90), 0.8); for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(lerp(x, tip, k / 6), y - 4 + Math.abs(k - 3) * 0.6, 0.8, 0, TAU); ctx.fill(); }
  }
  function staghorn(ctx, x, y, s, side, c, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(side * s, s); ctx.lineCap = 'round';
    const br = (x0, y0, a, L, d) => {
      if (d > 3) return;
      const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
      ctx.strokeStyle = rgb(K.lift(c, -60)); ctx.lineWidth = 6 - d * 1.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = rgb(c); ctx.lineWidth = 4 - d; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(c, 70), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 - 0.8, y0 - 0.8); ctx.lineTo(x1 - 0.8, y1 - 0.8); ctx.stroke();
      if (d === 3) { ctx.fillStyle = rgb(K.lift(c, 90)); ctx.beginPath(); ctx.arc(x1, y1, 1.6, 0, TAU); ctx.fill(); }
      br(x1, y1, a - 0.45, L * 0.72, d + 1); br(x1, y1, a + 0.4, L * 0.68, d + 1);
    };
    br(0, 0, -0.5, 13, 0);
    ctx.restore();
  }
  function seaFan(ctx, x, y, s, side, c, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(side * s, s); ctx.rotate(Math.sin(t * 1.1 + x) * 0.05);
    // a lacy fan: ribs out from the holdfast, cross-links between them
    const ribs = []; for (let k = 0; k < 9; k++) { const a = -PI * 0.92 + k * 0.18, pts = []; for (let q = 0; q <= 4; q++) pts.push([Math.cos(a) * q * 8, Math.sin(a) * q * 8 + q * q * 0.3]); ribs.push(pts); }
    ctx.strokeStyle = rgb(K.lift(c, -50)); ctx.lineWidth = 1.6; ctx.beginPath(); for (const p of ribs) { ctx.moveTo(0, 0); for (const [px, py] of p) ctx.lineTo(px, py); } ctx.stroke();
    ctx.strokeStyle = rgb(c); ctx.lineWidth = 1; ctx.beginPath(); for (let q = 1; q <= 4; q++) { ctx.moveTo(ribs[0][q][0], ribs[0][q][1]); for (const p of ribs) ctx.lineTo(p[q][0], p[q][1]); } for (const p of ribs) { ctx.moveTo(0, 0); for (const [px, py] of p) ctx.lineTo(px, py); } ctx.stroke();
    ctx.strokeStyle = rgb(K.lift(c, 70), 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); for (let q = 1; q <= 4; q++) { ctx.moveTo(ribs[0][q][0] - 0.6, ribs[0][q][1] - 0.8); for (const p of ribs) ctx.lineTo(p[q][0] - 0.6, p[q][1] - 0.8); } ctx.stroke();
    ctx.restore();
  }
  function reefWall(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.2,
      fill: () => K.lg(ctx, X(0), 0, X(44), 0, ['#1d4a5a', '#2e6a72', '#4a8a84']),
      deco: () => {
        // rock lumps with sandy tops (pairs), then corals packed on
        const r = K.rand(side < 0 ? 101 : 211);
        for (let y = -20; y < h + 30; y += 26) {
          const x = X(4 + r() * 22), rr = 12 + r() * 10, hue = [[120, 190, 170], [230, 150, 140], [170, 150, 210], [214, 190, 130]][(r() * 4) | 0];
          ctx.fillStyle = K.rg2(ctx, x - rr * 0.3, y - rr * 0.4, 1, x, y, rr, [[0, K.lift(hue, 30)], [0.6, K.lift(hue, -40)], [1, K.lift(hue, -100)]]);
          ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.7, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = rgb(K.lift(hue, 60), 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 1, rr * 0.9, rr * 0.6, 0, 3.5, 5.6); ctx.stroke();
          // polyp dots (bumpy coral texture) and pink coralline crust
          ctx.fillStyle = rgb(K.lift(hue, 50), 0.6); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + (k - 2) * rr * 0.3, y - rr * 0.2 + (k % 2) * 3, 1.1, 0, TAU); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,140,170,.4)'; ctx.beginPath(); ctx.ellipse(x + rr * 0.3, y + rr * 0.3, rr * 0.4, rr * 0.22, 0.3, 0, TAU); ctx.fill();
        }
        const corals = [[60, 'brain', [255, 170, 90]], [150, 'fan', [190, 110, 230]], [205, 'stag', [255, 130, 110]], [330, 'brain', [170, 220, 110]], [400, 'fan', [255, 120, 160]], [450, 'stag', [255, 210, 90]], [10, 'stag', [120, 200, 255]]];
        for (const [y0, kind, c] of corals) {
          const y = side < 0 ? y0 : (y0 + 70) % (h + 20), xx = ex(y) - side * 10;
          if (kind === 'brain') brainCoral(ctx, xx - side * 4, y, 14, c);
          else if (kind === 'fan') seaFan(ctx, xx - side * 6, y + 14, 0.9, side, c, t);
          else staghorn(ctx, xx - side * 8, y + 10, 1, side, c, t);
        }
        // the wall falls into blue shadow toward the screen edge
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(30), 0, ['rgba(8,40,70,.55)', 'rgba(8,40,70,0)']); ctx.fillRect(side < 0 ? 0 : w - 30, 0, 30, h);
      },
      lip: ['#1e4a58', '#58a090', '#bff0d8'], lipW: 3.5,
    });
    // corals that stand proud of the wall into the shaft (drawn unclipped)
    const tbl = side < 0 ? [118, 420] : [72, 240];
    for (const y of tbl) tableCoral(ctx, ex(y) - side * 2, y, 26, -side, side < 0 ? [120, 200, 170] : [230, 200, 140]);
    // swaying weed
    for (const y of side < 0 ? [250, 470] : [180, 380]) {
      const x0 = ex(y); ctx.save(); ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const sw = Math.sin(t * 1.4 + k + y) * 6;
        ctx.strokeStyle = k % 2 ? '#3fae6a' : '#5ccc7a'; ctx.lineWidth = 3 - k * 0.5;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 - side * (8 + k * 3) + sw, y - 18 - k * 4, x0 - side * (4 + k * 4) + sw * 1.6, y - 34 - k * 6); ctx.stroke();
      }
      ctx.restore();
    }
    return ex;
  }

  // ---------- Puffer Bloat ----------
  const PF = { y: 140, P: 4, o: 0.2 };
  function puffer(ctx, w, h, t, L, R) {
    const u = ph(t, PF.P, PF.o);
    const gulp = bump(u, 1.1, 1.5, 1.8, 1.9), big = smooth(1.7, 2.05, u) * (1 - smooth(2.9, 3.8, u));
    // patrol: drifts across between the wall corals, stops to blow up
    const pos = u < 1.7 ? u / 1.7 : u > 3.6 ? 1 - (u - 3.6) / 0.4 : 1;
    const x = lerp(w * 0.34, w * 0.56, ease(pos)), y = PF.y + Math.sin(t * 2.2) * 3, face = u < 1.7 ? 1 : -1;
    const r = 9 + gulp * 3 + big * 23;
    if (big > 0.05) K.danger(ctx, x, y + 4, r * 1.7, 0.35 * big);
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    // tail and fins (shrink in when blown up)
    const fin = 1 - big * 0.6;
    ctx.fillStyle = K.lg(ctx, -r - 10, 0, -r, 0, ['#ffd27a', '#f0a030']);
    ctx.beginPath(); ctx.moveTo(-r + 2, 0); ctx.lineTo(-r - 9 * fin, -6 * fin + Math.sin(t * 12) * 2); ctx.lineTo(-r - 7 * fin, 0); ctx.lineTo(-r - 9 * fin, 6 * fin + Math.sin(t * 12) * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a86010'; ctx.lineWidth = 0.8; ctx.stroke();
    // spines: tiny when deflated, long and sharp when puffed
    const sp = 1.5 + big * 7 + gulp * 1.2;
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * TAU + 0.07, bx = Math.cos(a) * r * 0.96, by = Math.sin(a) * r * 0.96, tx = Math.cos(a) * (r + sp), ty = Math.sin(a) * (r + sp);
      ctx.fillStyle = K.lg(ctx, bx, by, tx, ty, ['#c88a20', '#fff2c0']);
      ctx.beginPath(); ctx.moveTo(bx - Math.sin(a) * 1.8, by + Math.cos(a) * 1.8); ctx.lineTo(tx, ty); ctx.lineTo(bx + Math.sin(a) * 1.8, by - Math.cos(a) * 1.8); ctx.fill();
    }
    // body: lemon back, cream belly, dark spots
    ctx.fillStyle = K.rg2(ctx, -r * 0.35, -r * 0.45, r * 0.1, 0, 0, r, [[0, '#fff6c8'], [0.45, '#ffd84a'], [0.85, '#f0a020'], [1, '#b86a10']]);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * (0.86 + big * 0.14), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a05a0c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,236,.85)'; ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.75, r * 0.4, 0, 0, PI); ctx.fill();
    ctx.fillStyle = 'rgba(150,80,20,.55)'; const rr = K.rand(5); for (let k = 0; k < 9; k++) { const a = rr() * TAU, d = rr() * 0.6; ctx.beginPath(); ctx.arc(Math.cos(a) * r * d - r * 0.1, Math.sin(a) * r * d - r * 0.25, r * 0.07, 0, TAU); ctx.fill(); }
    // cheeks puffing in the gulp
    if (gulp > 0) { ctx.fillStyle = `rgba(255,150,120,${0.6 * gulp})`; ctx.beginPath(); ctx.ellipse(r * 0.45, r * 0.25, r * 0.28, r * 0.2, 0, 0, TAU); ctx.fill(); }
    // pectoral fin flutter
    ctx.fillStyle = 'rgba(255,220,140,.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.05, r * 0.15, 4 * fin, 6 * fin, 0.4 + Math.sin(t * 14) * 0.4, 0, TAU); ctx.fill();
    K.sheen(ctx, 0, 0, r, 0.6);
    // big cartoon eyes, angrier as it blows up; a little o mouth
    K.eyes(ctx, r * 0.42, -r * 0.18, r * 0.2 + 1.4, r * 0.17 + 2.2, '#3ac0ff', 0.6, big);
    ctx.fillStyle = '#7a2a10'; ctx.beginPath(); ctx.ellipse(r * 0.92, r * 0.18, 1.6 + gulp * 2 + big * 1.5, 1.6 + gulp * 2.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // water gulped in: little streaks into its mouth
    if (gulp > 0.1) { ctx.strokeStyle = `rgba(230,255,255,${0.7 * gulp})`; ctx.lineWidth = 1.2; for (let k = 0; k < 4; k++) { const a = (k - 1.5) * 0.35, d = 14 + ((t * 40 + k * 5) % 12); ctx.beginPath(); ctx.moveTo(x + face * (r + d) * Math.cos(a), y + d * Math.sin(a)); ctx.lineTo(x + face * (r + d - 6) * Math.cos(a), y + (d - 6) * Math.sin(a)); ctx.stroke(); } }
  }

  // ---------- Anemone Surge: anemones on both walls, the swell leans them all one way, then the other ----------
  const AN = { y: 268, P: 4, o: 1.2 };
  function anemone(ctx, x, y, side, lean, t, c) {
    // a squat column (the foot) with a crown of fat tentacles; lean: -1..1 (+ = toward the far wall)
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 10, [K.lift(c[1], 20), c[1], K.lift(c[1], -50)]);
    ctx.beginPath(); ctx.ellipse(0, 4, 10, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c[1], -70)); ctx.lineWidth = 0.9; ctx.stroke();
    const N = 11;
    for (let k = 0; k < N; k++) {
      const base = (k / (N - 1) - 0.5) * 2.4, wav = Math.sin(t * 3 + k * 0.9) * 0.12;
      const reach = 22 + lean * lean * 30 + (k % 3) * 4;
      const a = -PI / 2 + base * 0.7 + lean * 1.1 + wav;
      const x1 = Math.cos(a) * reach, y1 = Math.sin(a) * reach, mx = Math.cos(a - lean * 0.4) * reach * 0.55, my = Math.sin(a - lean * 0.4) * reach * 0.55;
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgb(K.lift(c[0], -60)); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(base * 5, -2); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
      ctx.strokeStyle = rgb(c[0]); ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(base * 5, -2); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(c[0], 70), 0.8); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(base * 5 - 1, -3); ctx.quadraticCurveTo(mx - 1, my - 1, x1 - 0.8, y1 - 0.8); ctx.stroke();
      // the glowing tip
      ctx.fillStyle = K.rg2(ctx, x1 - 1, y1 - 1, 0.3, x1, y1, 3.6, [[0, '#ffffff'], [0.5, K.lift(c[2], 40)], [1, c[2]]]); ctx.beginPath(); ctx.arc(x1, y1, 3.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function anemones(ctx, w, h, t, L, R) {
    const u = ph(t, AN.P, AN.o);
    // the swell: 0..0.9 rest, 0.9..1.5 sand ripples run (tell), 1.5..2.4 lean right, 2.4..3.4 lean left, back to rest
    const lean = smooth(1.4, 1.9, u) * (1 - smooth(2.3, 2.7, u)) - smooth(2.4, 2.9, u) * (1 - smooth(3.4, 3.9, u));
    const tell = bump(u, 0.8, 1.0, 1.4, 1.6);
    // the rock ledges they live on, and the sand ripple tell running along them
    for (const side of [-1, 1]) {
      const y = AN.y + (side > 0 ? 10 : 0), ex = side < 0 ? L(y) : R(y), tip = ex - side * 40;
      ctx.fillStyle = K.lg(ctx, 0, y - 2, 0, y + 14, ['#e8d6a8', '#b49870', '#6a5a4a']);
      ctx.beginPath(); ctx.moveTo(ex + side * 6, y - 2); ctx.lineTo(tip, y); ctx.quadraticCurveTo(tip - side * 4, y + 6, tip + side * 4, y + 12); ctx.quadraticCurveTo((ex + tip) / 2, y + 20, ex + side * 6, y + 22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,230,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, y - 1); ctx.lineTo(tip + side * 2, y + 0.5); ctx.stroke();
      if (tell > 0) { ctx.strokeStyle = `rgba(255,250,220,${0.8 * tell})`; ctx.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const v = ((t * 1.8 + k / 3) % 1), xx = lerp(ex - side * 4, tip, v); ctx.beginPath(); ctx.arc(xx, y + 3, 3, PI * 1.1, PI * 1.9); ctx.stroke(); } }
      // reaching lean: left anemones reach out when lean > 0, right ones when lean < 0
      const reachLean = side < 0 ? lean : -lean;
      if (Math.abs(lean) > 0.2 && reachLean > 0) K.danger(ctx, ex - side * 55, y - 20, 46, 0.32 * Math.abs(lean));
      const xs = side < 0 ? [ex + 10, ex + 28] : [ex - 10, ex - 28];
      xs.forEach((x, i) => anemone(ctx, x, y - 2, side, lean * (0.9 + i * 0.2) + (side < 0 ? 0.25 : -0.25) * (1 - Math.abs(lean)), t + i, i ? [[255, 120, 190], [140, 60, 120], [255, 230, 120]] : [[120, 230, 200], [60, 120, 120], [255, 160, 220]]));
    }
    // a clownfish darting in and out of the left anemone
    const cx = L(AN.y) + 22 + Math.sin(t * 2.4) * 6, cy = AN.y - 22 + Math.cos(t * 3.1) * 4;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.cos(t * 2.4) > 0 ? 1 : -1, 1);
    ctx.fillStyle = K.lg(ctx, 0, -4, 0, 4, ['#ffb060', '#ff7020']); ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; for (const bx of [-2.5, 2.2]) { ctx.beginPath(); ctx.ellipse(bx, 0, 1.2, 4, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ff7020'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-10, -3); ctx.lineTo(-10, 3); ctx.fill();
    ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(4.4, -1, 1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- Manta Lift: a manta glides across; touch its back and it carries you up ----------
  const MN = { P: 4, o: 2.6 };
  function manta(ctx, w, h, t) {
    const u = ph(t, MN.P, MN.o), v = u / MN.P;
    const x = lerp(-50, w + 50, v), y = 352 - Math.sin(v * PI) * 34, flap = Math.sin(t * 3.2), tilt = -0.18 + Math.cos(v * PI) * 0.2;
    // its gift: a gold up-current trail over its back
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 1; k < 7; k++) { const vv = v - k * 0.025, px = lerp(-50, w + 50, vv), py = 352 - Math.sin(vv * PI) * 34 - 10; ctx.fillStyle = K.rg(ctx, px, py, 14, [rgb([255, 230, 140], 0.25 * (1 - k / 7)), rgb([255, 210, 90], 0)]); ctx.beginPath(); ctx.arc(px, py, 14, 0, TAU); ctx.fill(); }
    ctx.restore();
    // seen from above, gliding right: wings spread up and down the screen, beating (their span breathes)
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt * 0.6);
    K.shadow(ctx, -4, 6, 36, 30, 0.12);
    const sp = 1 + flap * 0.16, wt = flap * 5;
    // tail
    ctx.strokeStyle = '#22385a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-36, Math.sin(t * 4) * 4, -54, Math.sin(t * 4 + 1) * 6); ctx.stroke();
    // the wing disc
    const wing = () => { ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(14, -16 * sp, -6 + wt, -40 * sp); ctx.quadraticCurveTo(-10, -20 * sp, -20, -4); ctx.lineTo(-20, 4); ctx.quadraticCurveTo(-10, 20 * sp, -6 + wt, 40 * sp); ctx.quadraticCurveTo(14, 16 * sp, 20, 0); ctx.closePath(); };
    wing(); ctx.fillStyle = K.rg2(ctx, 0, -14, 2, -2, 0, 42, [[0, '#8eb0ea'], [0.45, '#4f72b2'], [1, '#26406e']]); ctx.fill();
    ctx.strokeStyle = '#1c2c4a'; ctx.lineWidth = 1.1; ctx.stroke();
    // the body ridge down the middle and white shoulder patches
    ctx.fillStyle = K.lg(ctx, 0, -8, 0, 8, ['#9ab8ee', '#5a7cbc', '#34507e']); ctx.beginPath(); ctx.ellipse(2, 0, 18, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(236,244,255,.75)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-2, d * 14 * sp, 7, 3, d * 0.5, 0, TAU); ctx.fill(); }
    K.pair(ctx, () => { ctx.moveTo(14, -10); ctx.quadraticCurveTo(2, -24 * sp, -6 + wt, -38 * sp); ctx.moveTo(14, 10); ctx.quadraticCurveTo(2, 24 * sp, -6 + wt, 38 * sp); }, 'rgba(28,44,74,.5)', 'rgba(220,235,255,.6)', 1, 1);
    K.sheen(ctx, 2, 0, 14, 0.5);
    // cephalic fins curling forward and its friendly eyes
    ctx.fillStyle = '#34507e'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(22, d * 6, 6, 2.6, d * 0.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1c2c4a'; ctx.lineWidth = 0.8; ctx.stroke(); }
    K.eyes(ctx, 16, 0, 4.4, 2.8, '#7ad8ff', 0.7, 0);
    ctx.restore();
    // a sparkly ride arrow over its back while it passes the rocket's lane
    if (v > 0.3 && v < 0.75) { const a = bump(v, 0.3, 0.4, 0.65, 0.75); K.star4(ctx, x - 6, y - 26, 4, [255, 230, 140], a); K.star4(ctx, x + 10, y - 34, 3, [255, 230, 140], a * 0.8); }
  }

  // ---------- the twist: a school of fish parting around a coin ----------
  function school(ctx, w, h, t) {
    const cx = w * 0.5, cy = 214, part = 0.5 + 0.5 * Math.sin(t * 1.1);
    const r = K.rand(61);
    for (let i = 0; i < 26; i++) {
      const bx = cx + (r() - 0.5) * 150, by = cy + (r() - 0.5) * 50, dx = bx - cx, d = Math.max(8, Math.abs(dx));
      const x = bx + Math.sign(dx || 1) * part * 32 * Math.exp(-d / 60) + Math.sin(t * 2 + i) * 2, y = by + Math.sin(t * 3 + i * 1.3) * 2;
      ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1);
      ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#fff6a0', '#ffd23a', '#e09a20']); ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4ab0e0'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-8, -2.6); ctx.lineTo(-8, 2.6); ctx.fill();
      ctx.fillStyle = '#1a2030'; ctx.beginPath(); ctx.arc(2.8, -0.6, 0.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  PV.sections['reef'] = (ctx, w, h, t) => {
    water(ctx, w, h, t);
    const L = reefWall(ctx, -1, w, h, t), R = reefWall(ctx, 1, w, h, t);
    K.coin(ctx, w * 0.5, 214, 0.62, t, 0);
    school(ctx, w, h, t);
    for (const [x, y, o] of [[0.62, 72, 1], [0.5, 316, 2], [0.42, 440, 3]]) K.coin(ctx, w * x, y, 0.62, t, o);
    anemones(ctx, w, h, t, L, R);
    puffer(ctx, w, h, t, L, R);
    manta(ctx, w, h, t);
    K.rocket(ctx, w * 0.5, h * 0.82, 0.75, t);
    K.motes(ctx, w, h, t, 'bubble', [220, 255, 255], 16, 7);
    // light ripples over the foreground
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.lg(ctx, 0, 0, 0, 120, ['rgba(220,255,250,.14)', 'rgba(220,255,250,0)']); ctx.fillRect(0, 0, w, 120); ctx.restore();
  };
})();

// ===================================================================================================
// FLAMINGO SALT FLATS: white tufa chimneys over a pink sunset lake. Mirage Pillar, Salt Bloom, Rainbow Spray.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump, ease } = K;
  const TUFA = { lit: [255, 248, 238], hi: [240, 224, 210], mid: [206, 184, 186], lo: [156, 128, 156], deep: [98, 72, 112] };
  const HORIZON = 336;
  const edgeOf = (side, w) => {
    const base = side < 0 ? 34 : w - 34, s = side < 0 ? 0.6 : 2.9;
    return y => {
      // knobbly: big lobes plus small knobs
      const lobe = Math.abs(Math.sin(y * 0.03 + s)) * 9, knob = Math.abs(Math.sin(y * 0.2 + s * 3)) * 2.5 + Math.abs(Math.sin(y * 0.07 + s)) * 3;
      return base - side * (lobe + knob - 4);
    };
  };

  function skyLake(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, HORIZON, ['#8a76c2', '#c48ac4', '#f2a0b4', '#ffc49a', '#ffd9a6']); ctx.fillRect(0, 0, w, HORIZON);
    // the low sun, half-sunk behind the far flats
    const sx = w * 0.62, sy = HORIZON - 16;
    K.glow(ctx, sx, sy, 150, [255, 200, 150], 0.55); K.glow(ctx, sx, sy, 50, [255, 240, 200], 0.6);
    ctx.fillStyle = K.rg2(ctx, sx - 6, sy - 8, 2, sx, sy, 26, [[0, '#fffbe6'], [0.6, '#ffe2a0'], [1, '#ffb877']]); ctx.beginPath(); ctx.arc(sx, sy, 24, PI, TAU); ctx.fill();
    // long thin cloud streaks lit from below
    for (const [y, x0, x1, a] of [[80, -10, 160, 0.5], [118, 90, 290, 0.45], [196, -20, 120, 0.4], [236, 150, 290, 0.35]]) {
      ctx.fillStyle = K.lg(ctx, 0, y - 4, 0, y + 4, [`rgba(255,214,230,${a})`, `rgba(255,170,150,${a})`]);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y - 7, x1, y - 1); ctx.quadraticCurveTo((x0 + x1) / 2, y + 4, x0, y); ctx.fill();
    }
    // the far shore: flat pale salt flats and distant tufa towers (lilac silhouettes)
    const far = (col, y0, seed, n, tall) => {
      const r = K.rand(seed); ctx.fillStyle = rgb(col);
      for (let i = 0; i < n; i++) {
        const x = r() * w, bw = 8 + r() * 14, top = y0 - tall * (0.4 + r() * 0.6);
        ctx.beginPath(); ctx.moveTo(x - bw, y0); for (let k = 0; k <= 6; k++) { const v = k / 6; ctx.lineTo(x - bw + v * bw * 2 + (k % 2 ? 3 : -3) * (1 - v), lerp(y0, top, Math.sin(v * PI) * 0.9 + 0.1 * (k % 2))); } ctx.lineTo(x + bw, y0); ctx.fill();
        ctx.beginPath(); ctx.arc(x, top + 4, bw * 0.6, 0, TAU); ctx.fill();
      }
    };
    far([196, 150, 196], HORIZON, 5, 7, 60); far([176, 128, 180], HORIZON, 9, 5, 90);
    ctx.fillStyle = 'rgba(255,200,200,.25)'; ctx.fillRect(0, HORIZON - 60, w, 60);
    // the mirror lake: the sky flipped, darker and pinker, with ripple lines and the sun's path
    ctx.fillStyle = K.lg(ctx, 0, HORIZON, 0, h, ['#f0a0b2', '#d07aa6', '#9a66a6', '#6e4a8e']); ctx.fillRect(0, HORIZON, w, h - HORIZON);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) { const y = HORIZON + 6 + k * k * 1.6, wd = 30 - k * 2 + Math.sin(t * 2 + k) * 4; ctx.fillStyle = `rgba(255,220,170,${0.4 - k * 0.03})`; ctx.fillRect(sx - wd / 2, y, wd, 1.6); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,230,240,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 12; k++) { const y = HORIZON + 8 + k * 12, x = ((k * 53 + t * 6) % (w + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x + 26, y); } ctx.stroke();
    // flamingos wading far off: small pink silhouettes with their reflections
    for (const [fx, fs] of [[0.3, 0.5], [0.36, 0.45], [0.8, 0.55]]) { const x = w * fx + Math.sin(t * 0.3 + fx * 10) * 3; flamingo(ctx, x, HORIZON + 4, fs, t + fx * 7, 0, 0.75); ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(0, 2 * (HORIZON + 4)); ctx.scale(1, -1); flamingo(ctx, x, HORIZON + 4, fs, t + fx * 7, 0, 0.75); ctx.restore(); }
  }

  // a flamingo standing on one leg; s scale; stamp 0..1 lifts the other leg and slaps it down; far → simpler colours
  function flamingo(ctx, x, y, s, t, stamp = 0, far = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const pink = far < 1 ? ['#f08ab0', '#e070a0', '#c0588a'] : ['#ffb8cc', '#ff7aa2', '#d24a7c'];
    // legs: the standing leg straight, the other folded (or stamping)
    ctx.strokeStyle = pink[2]; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(1, -18); ctx.lineTo(0, 0); ctx.stroke();
    const kx = 8 - stamp * 4, ky = -24 + stamp * 8, fx = lerp(2, 6, stamp), fy = lerp(-30, -2, stamp);
    ctx.beginPath(); ctx.moveTo(-2, -36); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = pink[2]; ctx.beginPath(); ctx.ellipse(1, 0, 4, 1.4, 0, 0, TAU); ctx.fill();
    // body: a plump teardrop, wing feathers as pairs
    ctx.fillStyle = K.rg2(ctx, -4, -46, 2, 0, -40, 18, [[0, '#fff0f4'], [0.4, pink[0]], [1, pink[1]]]);
    ctx.beginPath(); ctx.moveTo(14, -44); ctx.quadraticCurveTo(10, -32, -4, -33); ctx.quadraticCurveTo(-16, -34, -18, -42); ctx.quadraticCurveTo(-10, -53, 6, -50); ctx.quadraticCurveTo(14, -49, 14, -44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pink[2]; ctx.lineWidth = 0.9; ctx.stroke();
    if (far === 1) K.pair(ctx, () => { ctx.moveTo(-14, -41); ctx.quadraticCurveTo(-6, -44, 6, -42); ctx.moveTo(-15, -38); ctx.quadraticCurveTo(-6, -38, 4, -37); }, 'rgba(180,50,100,.6)', 'rgba(255,230,240,.8)', 1, 0.8);
    // the S neck and the head with its bent beak
    const nod = Math.sin(t * 1.3) * 2 + stamp * 3;
    ctx.strokeStyle = pink[1]; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(10, -47); ctx.bezierCurveTo(22, -58, 4, -66, 10 + nod * 0.3, -76); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,240,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(9, -48); ctx.bezierCurveTo(20, -58, 2, -66, 9 + nod * 0.3, -75); ctx.stroke();
    const hx = 12 + nod * 0.3, hy = -78;
    ctx.fillStyle = K.rg2(ctx, hx - 2, hy - 2, 0.5, hx, hy, 5, [[0, '#fff0f4'], [1, pink[1]]]); ctx.beginPath(); ctx.arc(hx, hy, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2e0'; ctx.beginPath(); ctx.moveTo(hx + 3, hy - 2); ctx.quadraticCurveTo(hx + 11, hy - 1, hx + 10, hy + 6); ctx.lineTo(hx + 7, hy + 4); ctx.quadraticCurveTo(hx + 7, hy + 1, hx + 3, hy + 2); ctx.fill();
    ctx.fillStyle = '#4a2440'; ctx.beginPath(); ctx.moveTo(hx + 9.6, hy + 2); ctx.lineTo(hx + 10, hy + 6); ctx.lineTo(hx + 7, hy + 4); ctx.fill();
    if (far === 1) { K.eyes(ctx, hx + 0.5, hy - 1, 0, 2.3, '#ffcf3a', 0.6, 0); }
    ctx.restore();
  }

  // the near walls: knobbly tufa lumps stacked like cauliflower, salt crystal crusts, lilac shade
  function tufaWall(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.16,
      fill: () => K.lg(ctx, X(0), 0, X(46), 0, side < 0 ? [TUFA.deep, TUFA.lo, TUFA.mid] : [TUFA.lo, TUFA.mid, TUFA.hi]),
      deco: () => {
        const r = K.rand(side < 0 ? 17 : 29);
        // layered tufa: stacked bands (a lit top, a shaded underside) built of small knobs, with pores
        for (let y = -10; y < h + 20; y += 16) {
          const jag = r() * 6;
          ctx.fillStyle = 'rgba(90,60,110,.35)'; ctx.fillRect(side < 0 ? 0 : w - 50, y + 11, 50, 4);
          for (let d = 2 + jag; d < 46; d += 7 + r() * 3) {
            const x = X(d), yy = y + (r() - 0.5) * 4, rr = 4 + r() * 3.5;
            ctx.fillStyle = K.rg2(ctx, x - rr * 0.35, yy - rr * 0.5, 0.5, x, yy, rr, [[0, TUFA.lit], [0.45, TUFA.hi], [0.85, TUFA.mid], [1, TUFA.lo]]);
            ctx.beginPath(); ctx.ellipse(x, yy, rr * 1.15, rr, 0, 0, TAU); ctx.fill();
            if (r() < 0.35) { ctx.fillStyle = rgb(TUFA.deep, 0.75); ctx.beginPath(); ctx.ellipse(x + rr * 0.2, yy + rr * 0.25, 1.3, 1, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,250,240,.7)'; ctx.fillRect(x + rr * 0.2 - 1, yy + rr * 0.25 + 1, 2, 0.7); }
          }
          K.pair(ctx, () => { ctx.moveTo(X(0), y + 10); ctx.lineTo(X(44), y + 10.5); }, rgb(TUFA.deep, 0.5), rgb(TUFA.lit, 0.4), 1, -1);
        }
        // salt crystal crusts: clusters of tiny glinting cubes
        for (let i = 0; i < 9; i++) {
          const y = r() * h, x = X(6 + r() * 24);
          for (let k = 0; k < 5; k++) {
            const cx = x + (r() - 0.5) * 10, cy = y + (r() - 0.5) * 8, s = 1.6 + r() * 2;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
            ctx.fillStyle = 'rgba(220,180,230,.9)'; ctx.fillRect(cx - s, cy, s * 2, s);
            ctx.fillStyle = 'rgba(255,190,210,.9)'; ctx.fillRect(cx, cy - s, s, s * 2);
          }
          K.star4(ctx, x, y, 2.4 + Math.sin(t * 3 + i) * 1.2, [255, 240, 250], 0.8);
        }
        // warm sunset light on the right wall, cool lilac shade on the left
        ctx.fillStyle = side > 0 ? K.lg(ctx, w - 50, 0, w, 0, ['rgba(255,190,150,.2)', 'rgba(255,170,130,0)']) : K.lg(ctx, 0, 0, 46, 0, ['rgba(80,50,120,.4)', 'rgba(80,50,120,0)']);
        ctx.fillRect(side < 0 ? 0 : w - 50, 0, 50, h);
      },
      lip: [rgb(TUFA.deep), rgb(TUFA.hi), '#ffffff'], lipW: 3.5,
    });
    return ex;
  }

  // a pink brine pool on a tufa ledge
  function ledge(ctx, ex, y, side, len, t, pool = true) {
    const tip = ex - side * len;
    ctx.fillStyle = K.lg(ctx, 0, y - 6, 0, y + 18, [TUFA.lit, TUFA.hi, TUFA.lo]);
    ctx.beginPath(); ctx.moveTo(ex + side * 6, y - 6); ctx.lineTo(tip + side * 6, y - 6); ctx.quadraticCurveTo(tip - side * 4, y - 4, tip, y + 3);
    for (let k = 0; k <= 5; k++) { const v = k / 5; ctx.quadraticCurveTo(lerp(tip, ex, v - 0.1), y + 14 + (k % 2) * 4, lerp(tip, ex, v), y + 10 + v * 6); }
    ctx.lineTo(ex + side * 6, y + 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(TUFA.deep, 0.8); ctx.lineWidth = 0.9; ctx.stroke();
    if (pool) {
      ctx.fillStyle = K.lg(ctx, 0, y - 7, 0, y - 2, ['#ff8fb4', '#e05a92']); ctx.beginPath(); ctx.ellipse((ex + tip) / 2 + side * 4, y - 5, len * 0.4, 2.8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,240,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse((ex + tip) / 2 + side * 4, y - 5.5, len * 0.36, 1.8, 0, PI + 0.4, TAU - 0.4); ctx.stroke();
    }
    return tip;
  }

  // ---------- Mirage Pillar: two hanging salt pillars shimmer; only the one with a shadow is real ----------
  const MP = { P: 4, o: 0.4, y0: 6, y1: 136 };
  function pillar(ctx, x, a, wob, t, real) {
    ctx.save(); ctx.globalAlpha = a;
    const seg = 10;
    // a knobbly column hanging from the salt arch, tapering to a blunt tip
    ctx.beginPath();
    for (let k = 0; k <= seg; k++) { const v = k / seg, y = lerp(MP.y0, MP.y1, v), bw = lerp(17, 9, v) + Math.abs(Math.sin(v * 9)) * 3, sh = Math.sin(y * 0.12 + t * 9) * wob; k ? ctx.lineTo(x - bw + sh, y) : ctx.moveTo(x - bw + sh, y); }
    ctx.quadraticCurveTo(x, MP.y1 + 12, x + 9 + Math.sin(MP.y1 * 0.12 + t * 9) * wob, MP.y1);
    for (let k = seg; k >= 0; k--) { const v = k / seg, y = lerp(MP.y0, MP.y1, v), bw = lerp(17, 9, v) + Math.abs(Math.sin(v * 9 + 1)) * 3, sh = Math.sin(y * 0.12 + t * 9) * wob; ctx.lineTo(x + bw + sh, y); }
    ctx.closePath();
    ctx.fillStyle = K.lg(ctx, x - 18, 0, x + 18, 0, [TUFA.lit, TUFA.hi, TUFA.mid, TUFA.lo]); ctx.fill();
    ctx.strokeStyle = rgb(TUFA.deep, 0.9); ctx.lineWidth = 1; ctx.stroke();
    // knobs and crystal glints on it
    for (let k = 1; k < seg; k += 2) { const v = k / seg, y = lerp(MP.y0, MP.y1, v), sh = Math.sin(y * 0.12 + t * 9) * wob; ctx.fillStyle = K.rg2(ctx, x - 6 + sh, y - 3, 0.5, x - 4 + sh, y, 6, [[0, TUFA.lit], [1, TUFA.mid]]); ctx.beginPath(); ctx.arc(x - 4 + sh + (k % 3) * 3, y, 5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 10, MP.y0 + 10); ctx.lineTo(x - 7, MP.y1 - 10); ctx.stroke();
    ctx.restore();
  }
  function mirage(ctx, w, h, t, L, R) {
    const u = ph(t, MP.P, MP.o);
    // which image is real: A for the first half of the loop, B for the second; the haze thickens before the swap
    const xa = w * 0.36, xb = w * 0.63, toB = smooth(1.6, 2.2, u) * (1 - smooth(3.6, 4, u)), haze = bump(u, 1.0, 1.5, 2.1, 2.5) + bump(u, 3.0, 3.4, 3.8, 4.0);
    // the salt arch spanning the top of the shaft
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 16, [TUFA.hi, TUFA.mid, TUFA.lo]);
    ctx.beginPath(); ctx.moveTo(L(0) - 10, -4); ctx.lineTo(R(0) + 10, -4); ctx.lineTo(R(14) + 4, 10); for (let k = 0; k <= 8; k++) { const x = lerp(R(14), L(14), k / 8); ctx.quadraticCurveTo(x + 8, 18 + (k % 2) * 4, x, 12); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(TUFA.deep, 0.8); ctx.lineWidth = 0.9; ctx.stroke();
    // the real one's shadow on the far haze (a soft lilac slab offset away from the sun)
    const xr = lerp(xa, xb, toB);
    ctx.fillStyle = 'rgba(110,70,140,.28)'; ctx.beginPath(); ctx.moveTo(xr - 26, 12); ctx.lineTo(xr - 6, 12); ctx.lineTo(xr - 14, MP.y1 + 8); ctx.lineTo(xr - 30, MP.y1 + 2); ctx.closePath(); ctx.fill();
    // heat haze: wavy shimmer lines, thicker in the tell
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 7; k++) { const y = 26 + k * 17; ctx.strokeStyle = `rgba(255,240,230,${0.12 + 0.3 * haze})`; ctx.beginPath(); for (let x = w * 0.22; x <= w * 0.78; x += 6) { const yy = y + Math.sin(x * 0.12 + t * 7 + k) * (1.5 + haze * 2.5); x === w * 0.22 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
    ctx.restore();
    // both images: the real one solid, the fake one see-through and wobblier
    const aA = lerp(1, 0.38, toB), aB = lerp(0.38, 1, toB);
    pillar(ctx, xa, aA, lerp(0.6, 2.4, toB) + haze * 2, t, toB < 0.5);
    pillar(ctx, xb, aB, lerp(2.4, 0.6, toB) + haze * 2, t + 0.3, toB >= 0.5);
    K.danger(ctx, xr, MP.y1 - 30, 50, 0.22);
  }

  // ---------- Salt Bloom: crystals grow out of a brine pool across the shaft, then a splash dissolves them ----------
  const SB = { y: 262, P: 4, o: 2.4 };
  function cube(ctx, x, y, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = K.lg(ctx, -s, -s, s, s, ['#ffffff', '#ffd6ea', '#f08ab8']); ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.fillStyle = 'rgba(255,170,206,.85)'; ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(s, s); ctx.lineTo(s + s * 0.5, s - s * 0.5); ctx.lineTo(-s + s * 0.5, s - s * 0.5); ctx.fill();
    ctx.strokeStyle = '#a8467e'; ctx.lineWidth = 0.9; ctx.strokeRect(-s, -s, s * 2, s * 2);
    // hopper steps (the stepped face of a salt crystal)
    ctx.strokeStyle = 'rgba(200,140,190,.6)'; ctx.strokeRect(-s * 0.55, -s * 0.55, s * 1.1, s * 1.1);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(-s * 0.8, -s * 0.8, s * 0.5, s * 0.3);
    ctx.restore();
  }
  function bloom(ctx, w, h, t, L, R) {
    const u = ph(t, SB.P, SB.o), ex = R(SB.y), tip = ledge(ctx, ex, SB.y, 1, 46, t);
    const fizz = bump(u, 0.5, 0.9, 1.2, 1.3), grow = smooth(1.2, 2.1, u), melt = smooth(3.0, 3.7, u);
    const reach = grow * (1 - melt);
    // fizz: bubbles popping in the pool (the tell)
    if (fizz > 0) for (let k = 0; k < 6; k++) { const bx = lerp(tip, ex, (k + 0.5) / 6), by = SB.y - 8 - ((t * 30 + k * 7) % 10); ctx.strokeStyle = `rgba(255,240,250,${fizz})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 1.4 + (k % 2), 0, TAU); ctx.stroke(); }
    if (reach <= 0.01) return;
    // the main branch grows out level across the shaft, side branches spring off it up and down
    const len = 128 * reach, x0 = tip + 2, y0 = SB.y - 8;
    K.danger(ctx, x0 - len / 2, y0, len * 0.55 + 20, 0.25 * reach);
    const N = Math.floor(len / 10);
    for (let i = 0; i <= N; i++) {
      const x = x0 - i * 10, s = 6.4 - i * 0.18, a = Math.sin(i * 1.7) * 0.15;
      if ((i % 3) === 1) {
        // a side branch: a short diagonal run of cubes
        const dir = (i % 2) ? -1 : 1, nb = Math.min(4, Math.floor((N - i) / 2) + 1);
        for (let j = 1; j <= nb; j++) cube(ctx, x - j * 5, y0 + dir * j * 9, s * (1 - j * 0.14), a + 0.2 * dir);
      }
      cube(ctx, x, y0 + Math.sin(i * 2.3) * 1.5, s, a);
    }
    // the growing tip glints
    K.star4(ctx, x0 - len, y0, 5 + Math.sin(t * 10) * 1.5, [255, 230, 250], 1 - melt);
    // the splash that dissolves it: drops flying up from the lake and spray hitting the crystals
    const sp = bump(u, 2.7, 3.0, 3.4, 3.8);
    if (sp > 0) for (let k = 0; k < 14; k++) {
      const v = ((u - 2.7) / 1.1), dx = x0 - 20 - k * 9, dy = y0 + 40 - v * 50 + Math.sin(k * 2.2) * 8;
      ctx.fillStyle = `rgba(255,214,234,${0.85 * sp})`; ctx.beginPath(); ctx.ellipse(dx, dy, 2.4, 3.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${sp})`; ctx.beginPath(); ctx.arc(dx - 0.7, dy - 1.2, 0.8, 0, TAU); ctx.fill();
    }
  }

  // ---------- Rainbow Spray: a flamingo stamps, spray hangs in the sun, a rainbow arcs across: ride it up ----------
  const RS = { y: 352, P: 4, o: 1.0 };
  function rainbow(ctx, w, h, t, L, R) {
    const u = ph(t, RS.P, RS.o), ex = L(RS.y), tip = ledge(ctx, ex, RS.y, -1, 48, t);
    const stamp = bump(u, 0.2, 0.5, 0.65, 0.8), spray = bump(u, 0.6, 0.9, 2.9, 3.4), bow = smooth(0.9, 1.5, u) * (1 - smooth(2.9, 3.5, u));
    flamingo(ctx, ex + 22, RS.y - 6, 0.62, t, stamp);
    if (stamp > 0.6 || spray > 0) {
      // the spray: a fan of fine droplets hanging in the low sun
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.rg2(ctx, tip, RS.y - 20, 4, tip + 20, RS.y - 30, 50, [[0, [255, 240, 250], 0.45 * spray], [1, [255, 200, 230], 0]]);
      ctx.beginPath(); ctx.arc(tip + 20, RS.y - 30, 50, 0, TAU); ctx.fill();
      const r = K.rand(3);
      for (let k = 0; k < 22; k++) { const a = -PI / 2 + (r() - 0.3) * 1.6, d = 10 + r() * 46 * smooth(0.6, 1.2, u); ctx.fillStyle = `rgba(255,255,255,${0.8 * spray})`; ctx.beginPath(); ctx.arc(tip + 6 + Math.cos(a) * d, RS.y - 10 + Math.sin(a) * d + (u - 0.6) * 6, 1 + r(), 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    if (bow <= 0.01) return;
    // the rainbow: an arc of seven soft bands from the ledge up and over to the right wall, growing along its length
    const cx = (tip + R(RS.y - 90)) / 2 + 20, cy = RS.y + 20, rad = (R(RS.y - 90) - tip) / 2 + 30, a0 = PI * 1.08, a1 = lerp(a0, PI * 1.72, ease(bow));
    const bands = ['#ff6a7a', '#ff9d4a', '#ffe14a', '#7ee06a', '#4ac8ff', '#6a8aff', '#b07aff'];
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,240,230,${0.25 * bow})`; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(cx, cy, rad - 9, a0, a1); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    bands.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.78 * bow; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(cx, cy, rad - i * 3, a0, a1); ctx.stroke(); });
    ctx.globalAlpha = bow; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, rad + 1.6, a0 + 0.05, a1); ctx.stroke();
    ctx.restore();
    // the ride: sparkles sliding up the rail
    for (let k = 0; k < 3; k++) { const v = ph(t * 0.8 + k / 3, 1), a = lerp(a0, a1, v); K.star4(ctx, cx + Math.cos(a) * (rad - 9), cy + Math.sin(a) * (rad - 9), 4, [255, 250, 220], bow * Math.sin(v * PI)); }
  }

  PV.sections['saltlake'] = (ctx, w, h, t) => {
    skyLake(ctx, w, h, t);
    const L = tufaWall(ctx, -1, w, h, t), R = tufaWall(ctx, 1, w, h, t);
    for (const [x, y, o] of [[0.5, 188, 0], [0.5, 214, 0.6], [0.46, 312, 1.4]]) K.coin(ctx, w * x, y, 0.62, t, o);
    rainbow(ctx, w, h, t, L, R);
    bloom(ctx, w, h, t, L, R);
    mirage(ctx, w, h, t, L, R);
    // the twist: the lake mirrors the rocket (a pink reflection pool at the foot of the chimney)
    const ly = h - 22;
    ctx.fillStyle = K.lg(ctx, 0, ly, 0, h, ['rgba(240,150,180,.92)', 'rgba(150,90,160,.95)']); ctx.beginPath(); ctx.moveTo(L(ly) - 4, ly); for (let x = L(ly); x <= R(ly); x += 6) ctx.lineTo(x, ly + Math.sin(x * 0.1 + t * 2) * 1.2); ctx.lineTo(R(ly) + 4, ly); ctx.lineTo(R(h), h); ctx.lineTo(L(h), h); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(0, ly, w, h - ly); ctx.clip(); ctx.globalAlpha = 0.4; ctx.translate(0, 2 * ly); ctx.scale(1, -1); K.rocket(ctx, w * 0.5, h * 0.82 - 70, 0.75, t); ctx.restore();
    ctx.strokeStyle = 'rgba(255,230,240,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L(ly), ly); ctx.lineTo(R(ly), ly); ctx.stroke();
    K.rocket(ctx, w * 0.5, h * 0.82, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 240, 246], 16, 13);
  };
})();

// ===================================================================================================
// STILT VILLAGE: fishing shacks stacked up a sea stack at dusk. Lantern Moths, Net Haul, Pelican Pouch.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump, ease } = K;
  const PLANK = { lit: [176, 150, 160], hi: [138, 112, 128], mid: [104, 82, 104], lo: [72, 56, 80], deep: [44, 34, 56] };
  const WARM = [255, 170, 80];
  // shacks: each wall is a stack of shack fronts; a shack's front juts out, with a porch gap between them
  const SH = 92;
  const edgeOf = (side, w) => {
    const base = side < 0 ? 36 : w - 36, o = side < 0 ? 10 : 56;
    return y => {
      const k = Math.floor((y + o) / SH), v = (y + o) / SH - k, jut = (K.rand(k * 11 + (side < 0 ? 2 : 7))() - 0.5) * 14;
      const porch = v > 0.82 ? -6 : 0;          // under each shack, the porch is set back between the stilts
      return base - side * (jut + porch);
    };
  };

  function dusk(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#2e2a5e', '#4b3d78', '#7a5490', '#c47a96', '#f4a888', '#ffcf9a']); ctx.fillRect(0, 0, w, h * 0.82);
    // first stars
    const r = K.rand(8);
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h * 0.42, tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); ctx.fillStyle = `rgba(255,246,230,${0.35 + 0.5 * tw * (1 - y / (h * 0.42))})`; ctx.fillRect(x, y, 1.2, 1.2); }
    K.star4(ctx, w * 0.7, 40, 3.5, [255, 240, 220], 0.9);
    // a crescent moon
    const mx = w * 0.32, my = 70; K.glow(ctx, mx, my, 50, [255, 236, 210], 0.35);
    ctx.fillStyle = K.rg2(ctx, mx - 3, my - 3, 1, mx, my, 12, [[0, '#fffaf0'], [1, '#f2dcc0']]); ctx.beginPath(); ctx.arc(mx, my, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3c3268'; ctx.beginPath(); ctx.arc(mx + 5, my - 3, 9.5, 0, TAU); ctx.fill();
    // the sea far below with a long sunset glint, and far stilt houses on it
    const sea = h * 0.74;
    ctx.fillStyle = K.lg(ctx, 0, sea, 0, h, ['#e88a8a', '#7a5a96', '#3e3a74']); ctx.fillRect(0, sea, w, h - sea);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) { const y = sea + 4 + k * k * 1.4, wd = 50 - k * 4 + Math.sin(t * 2 + k) * 6; ctx.fillStyle = `rgba(255,200,150,${0.35 - k * 0.03})`; ctx.fillRect(w * 0.55 - wd / 2, y, wd, 1.5); }
    ctx.restore();
    const house = (x, y, s, col, lit) => {
      ctx.fillStyle = rgb(col);
      ctx.fillRect(x - 12 * s, y - 16 * s, 24 * s, 16 * s);
      ctx.beginPath(); ctx.moveTo(x - 15 * s, y - 15 * s); ctx.lineTo(x, y - 26 * s); ctx.lineTo(x + 15 * s, y - 15 * s); ctx.fill();
      ctx.fillRect(x - 10 * s, y, 1.6 * s, 14 * s); ctx.fillRect(x + 8 * s, y, 1.6 * s, 14 * s); ctx.fillRect(x - 1, y, 1.6 * s, 14 * s);
      if (lit) { ctx.fillStyle = `rgba(255,190,110,${0.7 + 0.2 * Math.sin(t * 3 + x)})`; ctx.fillRect(x - 5 * s, y - 11 * s, 5 * s, 5 * s); K.glow(ctx, x - 2.5 * s, y - 8.5 * s, 10 * s, WARM, 0.3); }
    };
    house(w * 0.22, sea - 4, 0.8, [96, 74, 120], 1); house(w * 0.5, sea - 2, 0.6, [110, 86, 130], 0); house(w * 0.82, sea - 6, 0.9, [90, 70, 116], 1);
    // a boardwalk far behind, stepping up the stack
    ctx.strokeStyle = 'rgba(70,56,100,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.55); ctx.lineTo(w * 0.45, h * 0.5); ctx.lineTo(w * 0.62, h * 0.38); ctx.lineTo(w * 0.9, h * 0.33); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 10; k++) { const x = lerp(w * 0.1, w * 0.45, k / 9); ctx.moveTo(x, lerp(h * 0.55, h * 0.5, k / 9)); ctx.lineTo(x, lerp(h * 0.55, h * 0.5, k / 9) + 30); } ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(60,50,110,.18)', 'rgba(244,168,136,.1)']); ctx.fillRect(0, 0, w, h);
  }

  // one wall of shacks: plank fronts (vertical boards with nail heads), tin roof lips, lit windows, stilts, nets, buoys
  function shackWall(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d, o = side < 0 ? 10 : 56;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.25,
      fill: () => K.lg(ctx, X(0), 0, X(50), 0, [PLANK.deep, PLANK.lo, PLANK.mid]),
      deco: () => {
        for (let k = -1; k < 7; k++) {
          const y0 = k * SH - o, y1 = y0 + SH * 0.82, xe = ex(y0 + 20), r = K.rand(k * 5 + (side < 0 ? 1 : 9));
          const tint = [[150, 110, 120], [110, 120, 150], [140, 120, 96], [120, 100, 140]][(r() * 4) | 0];
          // the boards: vertical planks with a lit edge and a dark seam (pairs), slightly different shades
          const x0 = side < 0 ? 0 : xe, x1 = side < 0 ? xe : w;
          for (let x = x0; x < x1; x += 7) {
            const c = K.lift(tint, (r() - 0.5) * 30 - 30);
            ctx.fillStyle = K.lg(ctx, 0, y0, 0, y1, [K.lift(c, 18), c, K.lift(c, -30)]); ctx.fillRect(x, y0, 7, y1 - y0);
            ctx.fillStyle = 'rgba(30,20,40,.55)'; ctx.fillRect(x + 6.2, y0, 0.9, y1 - y0);
            ctx.fillStyle = rgb(K.lift(c, 50), 0.5); ctx.fillRect(x + 0.4, y0, 0.7, y1 - y0);
            // wood grain flecks and two nail heads
            ctx.fillStyle = 'rgba(40,26,40,.5)'; ctx.fillRect(x + 2 + r() * 3, y0 + 6 + r() * 20, 0.8, 6 + r() * 10);
            ctx.fillStyle = '#c8b0a8'; ctx.fillRect(x + 3, y0 + 4, 1.2, 1.2); ctx.fillRect(x + 3, y1 - 6, 1.2, 1.2);
          }
          // the porch underneath: stilts and cross braces in shadow
          ctx.fillStyle = 'rgba(20,14,34,.85)'; ctx.fillRect(Math.min(X(0), xe) - 2, y1, Math.abs(xe - X(0)) + 8, SH - SH * 0.82);
          ctx.fillStyle = K.lg(ctx, 0, y1, 0, y0 + SH, ['#4a3a50', '#2a2036']);
          for (const d of [6, 22, 38]) { if (Math.abs(X(d) - X(0)) < Math.abs(xe - X(0))) ctx.fillRect(X(d) - 2, y1, 4, SH * 0.18 + 2); }
          ctx.strokeStyle = 'rgba(80,60,90,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(6), y1 + 2); ctx.lineTo(X(38), y0 + SH - 2); ctx.stroke();
          // a window: lit warm (most) or dark, with a sill and a shutter
          const wy = y0 + 22 + r() * 18, wx = X(16 + r() * 10), lit = smooth(0, 1, Math.sin(t * 0.6 + k * 2.1) * 2 + 1.2);
          ctx.fillStyle = '#2a2036'; ctx.fillRect(wx - 9, wy - 9, 18, 16);
          ctx.fillStyle = K.rg2(ctx, wx, wy - 2, 1, wx, wy, 14, [[0, '#fff2c0'], [0.5, '#ffb45a'], [1, '#c86a2a']]); ctx.globalAlpha = lit; ctx.fillRect(wx - 8, wy - 8, 16, 14); ctx.globalAlpha = 1;
          ctx.fillStyle = '#3a2a3e'; ctx.fillRect(wx - 0.6, wy - 8, 1.2, 14); ctx.fillRect(wx - 8, wy - 1.6, 16, 1.2);
          ctx.fillStyle = K.lg(ctx, 0, wy + 6, 0, wy + 9, ['#b8a0a8', '#6a5060']); ctx.fillRect(wx - 10, wy + 6, 20, 3);
          if (lit > 0.3) K.glow(ctx, wx, wy, 26, WARM, 0.32 * lit);
          // the tin roof's lip at the top of each shack: corrugated, rusty, lit edge
          ctx.fillStyle = K.lg(ctx, 0, y0 - 2, 0, y0 + 7, ['#c8c0cc', '#8a8496', '#5a5468']); ctx.fillRect(Math.min(X(0), xe + side * 6) - 2, y0 - 2, Math.abs(xe + side * 6 - X(0)) + 6, 8);
          ctx.fillStyle = 'rgba(60,50,70,.6)'; for (let x = Math.min(X(0), xe); x < Math.max(X(0), xe); x += 4) ctx.fillRect(x, y0 - 2, 1.2, 8);
          ctx.fillStyle = 'rgba(190,100,70,.45)'; ctx.fillRect(X(10), y0 + 2, side * 12, 4);
        }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(26), 0, ['rgba(16,10,30,.55)', 'rgba(16,10,30,0)']); ctx.fillRect(side < 0 ? 0 : w - 26, 0, 26, h);
      },
      lip: ['#2a2036', '#8a7890', '#e8d8d0'], lipW: 2.5,
    });
    // things hung on the walls, unclipped: buoys and a rope ladder
    for (const y of side < 0 ? [210, 444] : [130, 330]) {
      const x = ex(y) - side * 3;
      ctx.strokeStyle = '#c8b090'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x - side * 2, y - 4); ctx.stroke();
      ctx.fillStyle = K.rg2(ctx, x - side * 2 - 2, y - 2, 0.5, x - side * 2, y, 7, [[0, '#ffe6d0'], [0.5, '#ff6a4a'], [1, '#b02a20']]); ctx.beginPath(); ctx.ellipse(x - side * 2, y + 1, 5, 6.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff4e8'; ctx.fillRect(x - side * 2 - 5, y, 10, 2.2);
    }
    return ex;
  }

  // ---------- Lantern Moths: they circle the porch lantern; your bright flame draws them out after you ----------
  const LM = { y: 116, P: 4, o: 0.2 };
  function moths(ctx, w, h, t, L) {
    const u = ph(t, LM.P, LM.o), ex = L(LM.y - 30), lx = ex + 46, ly = LM.y;
    const tell = bump(u, 0.9, 1.2, 1.4, 1.5), chase = smooth(1.4, 2.2, u) * (1 - smooth(2.7, 3.7, u));
    // the bracket and the lantern
    ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 2, ly - 34); ctx.lineTo(lx, ly - 34); ctx.lineTo(lx, ly - 24); ctx.stroke();
    ctx.strokeStyle = '#7a6478'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, ly - 35); ctx.lineTo(lx, ly - 35); ctx.stroke();
    ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex + 4, ly - 20); ctx.lineTo(ex + 16, ly - 34); ctx.stroke();
    const fl = 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7);
    K.glow(ctx, lx, ly - 10, 60, WARM, 0.45 * fl);
    ctx.fillStyle = K.lg(ctx, lx - 8, 0, lx + 8, 0, ['#4a3a48', '#8a7488', '#3a2a3a']); ctx.beginPath(); ctx.moveTo(lx - 8, ly - 20); ctx.lineTo(lx, ly - 26); ctx.lineTo(lx + 8, ly - 20); ctx.fill();
    ctx.fillStyle = K.rg2(ctx, lx, ly - 10, 1, lx, ly - 10, 10, [[0, '#fffbe0'], [0.5, '#ffc864'], [1, '#e07a2a']]); ctx.beginPath(); ctx.roundRect(lx - 6, ly - 20, 12, 18, 2); ctx.fill();
    ctx.strokeStyle = '#3a2a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx - 6, ly - 20); ctx.lineTo(lx - 6, ly - 2); ctx.moveTo(lx + 6, ly - 20); ctx.lineTo(lx + 6, ly - 2); ctx.stroke();
    ctx.fillStyle = '#4a3a48'; ctx.fillRect(lx - 8, ly - 3, 16, 3);
    // the cloud's centre: home at the lantern, out after the rocket's warmth (down and across) when chasing
    const cx = lerp(lx, w * 0.56, chase) + Math.sin(t * 2.3) * 3 * (1 - chase), cy = lerp(ly - 10, ly + 76, chase);
    if (chase > 0.1) K.danger(ctx, cx, cy, 44, 0.3 * chase);
    const N = 8, rad = lerp(24, 34, chase) - tell * 8;
    for (let i = 0; i < N; i++) {
      const a = t * (3 + (i % 3)) * (i % 2 ? 1 : -1) + i * 2.1, rr = rad * (0.4 + 0.6 * ((i * 37) % 10) / 10);
      const mx = cx + Math.cos(a) * rr, my = cy + Math.sin(a) * rr * 0.7, flap = Math.abs(Math.sin(t * 22 + i)), s = 1.7 + (i % 3) * 0.25;
      // each moth: two pale dusty wings with eye-spots, a fuzzy body, catching the light
      ctx.save(); ctx.translate(mx, my); ctx.rotate(a + PI / 2); ctx.scale(s, s);
      for (const d of [-1, 1]) {
        ctx.fillStyle = K.lg(ctx, 0, -3, d * 6, 3, ['#f4ffe0', '#b8f0b0', i % 2 ? '#6ac0a0' : '#b890d8']);
        ctx.beginPath(); ctx.ellipse(d * 3.2 * (0.4 + flap * 0.6), -0.5, 3.4 * (0.4 + flap * 0.6), 2.6, d * 0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffcf6a'; ctx.beginPath(); ctx.arc(d * 3 * (0.4 + flap * 0.6), -0.6, 0.9, 0, TAU); ctx.fill(); ctx.fillStyle = '#7a4a8a'; ctx.beginPath(); ctx.arc(d * 3 * (0.4 + flap * 0.6), -0.6, 0.45, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#fff6e8'; ctx.beginPath(); ctx.ellipse(0, 0.5, 1.1, 2.6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-0.4, -2); ctx.lineTo(-1.6, -3.6); ctx.moveTo(0.4, -2); ctx.lineTo(1.6, -3.6); ctx.stroke();
      ctx.restore();
      if (chase > 0.3 && i % 3 === 0) { ctx.fillStyle = `rgba(255,120,120,${0.9 * chase})`; ctx.beginPath(); ctx.arc(mx + 1, my - 1, 0.9, 0, TAU); ctx.fill(); }
    }
    // glowing dust in the light
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 8; k++) { const a = t * 1.3 + k, rr = 10 + k * 3; ctx.fillStyle = 'rgba(255,220,150,.5)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a * 1.3) * rr * 0.6, 0.8, 0, TAU); ctx.fill(); } ctx.restore();
  }

  // ---------- Net Haul: a boom creaks round, then the fishing net is hauled across the shaft ----------
  const NH = { y: 238, P: 4, o: 1.3 };
  function netHaul(ctx, w, h, t, L, R) {
    const u = ph(t, NH.P, NH.o), ex = R(NH.y);
    const swing = smooth(0.6, 1.3, u) * (1 - smooth(3.3, 3.9, u)), haul = smooth(1.3, 2.4, u) * (1 - smooth(2.8, 3.5, u));
    const creak = bump(u, 0.6, 0.75, 1.15, 1.3) * Math.sin(t * 50) * 0.04;
    // the boom: a pole hinged on the wall, swinging from up the wall to straight out across the shaft
    const ang = lerp(-PI / 2 + 0.25, -PI + 0.12, swing) + creak, bl = 150;
    const bx = ex - 4, by = NH.y + 30, tipX = bx + Math.cos(ang) * bl, tipY = by + Math.sin(ang) * bl;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = '#a07a5a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,200,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 1, by - 1.6); ctx.lineTo(tipX - 1, tipY - 1.6); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = K.rg2(ctx, bx - 2, by - 2, 1, bx, by, 7, [[0, '#d0c0c8'], [1, '#4a3a48']]); ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
    // the pulley at the tip and the haul rope back to the wall
    ctx.fillStyle = '#5a4a58'; ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#c8b8c0'; ctx.beginPath(); ctx.arc(tipX, tipY, 1.4, 0, TAU); ctx.fill();
    // the net hangs under a point that is hauled along the boom from the wall toward its tip
    const along = lerp(0.18, 0.92, haul), hx = lerp(bx, tipX, along), hy = lerp(by, tipY, along);
    ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(hx, hy); ctx.lineTo(hx, hy + 10); ctx.moveTo(bx, by - 4); ctx.lineTo(hx, hy - 1); ctx.stroke();
    const sway = Math.sin(t * 2.4) * 4 * (1 - haul * 0.5), nw = 56, nh = 52, top = hy + 10;
    if (haul > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, hx, top + nh / 2, 50, ['rgba(200,170,255,.18)', 'rgba(200,170,255,0)']); ctx.beginPath(); ctx.arc(hx, top + nh / 2, 50, 0, TAU); ctx.fill(); ctx.restore(); }
    // mesh: a bag shape of crossing cords
    const P = (i, j) => { const v = i / 6, q = j / 6, bag = Math.sin(q * PI) * 8 * v; return [hx - nw / 2 * (1 - v * 0.35) + q * nw * (1 - v * 0.35) + sway * v * v, top + v * nh + bag]; };
    ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const [x, y] = P(i, j); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } for (let j = 0; j <= 6; j++) for (let i = 0; i <= 6; i++) { const [x, y] = P(i, j); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    ctx.strokeStyle = '#e8d6b0'; ctx.lineWidth = 0.9; ctx.stroke();
    // cork floats along the top and a catch in the bag: a fish and a starfish
    for (let j = 0; j <= 6; j += 2) { const [x, y] = P(0, j); ctx.fillStyle = K.rg2(ctx, x - 1, y - 1, 0.5, x, y, 4, [[0, '#ffd8a0'], [1, '#b0703a']]); ctx.beginPath(); ctx.ellipse(x, y, 3.6, 2.6, 0, 0, TAU); ctx.fill(); }
    const [fx, fy] = P(5, 3);
    ctx.fillStyle = K.lg(ctx, 0, fy - 4, 0, fy + 4, ['#bfe8ff', '#6aa8d8']); ctx.beginPath(); ctx.ellipse(fx - 4, fy - 4, 7, 3.4, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a2030'; ctx.beginPath(); ctx.arc(fx, fy - 3, 0.9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff8a5a'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * PI / 5, r = k % 2 ? 2 : 5; ctx.lineTo(fx + 6 + Math.cos(a) * r, fy - 10 + Math.sin(a) * r); } ctx.fill();
  }

  // ---------- Pelican Pouch: a pelican dozing on a post wakes as you come near, flaps its pouch open across the shaft ----------
  const PL = { y: 332, P: 4, o: 2.7 };
  function pelican(ctx, w, h, t, L) {
    const u = ph(t, PL.P, PL.o), ex = L(PL.y), px = ex + 30, py = PL.y;
    const wake = smooth(0.8, 1.2, u) * (1 - smooth(3.0, 3.4, u)), open = smooth(1.3, 1.6, u) * (1 - smooth(2.3, 2.6, u)), gulp = bump(u, 2.4, 2.55, 2.75, 2.95);
    // the post: a pier pile with rope wraps, bolted to the shack wall by a beam
    ctx.fillStyle = K.lg(ctx, px - 7, 0, px + 7, 0, ['#4a3a48', '#8a7280', '#3a2a38']); ctx.fillRect(px - 6, py, 12, h - py + 4);
    ctx.fillStyle = '#5a4a56'; ctx.fillRect(ex - 4, py + 18, px - ex, 6);
    for (const y of [py + 8, py + 36]) { ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 5, ['#e8d6b0', '#a8906a']); ctx.fillRect(px - 7, y, 14, 5); ctx.strokeStyle = 'rgba(90,70,40,.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(px - 7 + k * 4, y); ctx.lineTo(px - 4 + k * 4, y + 5); } ctx.stroke(); }
    ctx.fillStyle = K.lg(ctx, 0, py - 3, 0, py + 3, ['#b8a0a8', '#5a4a56']); ctx.beginPath(); ctx.ellipse(px, py, 7, 2.4, 0, 0, TAU); ctx.fill();
    if (open > 0.1) K.danger(ctx, px + 50, py - 22, 54, 0.32 * open);
    ctx.save(); ctx.translate(px, py);
    // body: a fat white bird with grey wings, sitting
    ctx.fillStyle = K.rg2(ctx, -6, -24, 2, 0, -16, 22, [[0, '#ffffff'], [0.6, '#e8e4ec'], [1, '#a8a0b8']]);
    ctx.beginPath(); ctx.ellipse(0, -15, 15, 14, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8a809a'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, -24, 0, -4, ['#b0a8c0', '#6a6280']); ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(-4, -26, 8, -16); ctx.quadraticCurveTo(0, -6, -16, -6); ctx.closePath(); ctx.fill();
    K.pair(ctx, () => { ctx.moveTo(-12, -14); ctx.lineTo(2, -15); ctx.moveTo(-13, -10); ctx.lineTo(-1, -11); }, 'rgba(60,50,80,.6)', 'rgba(230,226,240,.8)', 0.9, 0.8);
    // feet
    ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.ellipse(-4, -1, 4, 1.6, 0, 0, TAU); ctx.ellipse(5, -1, 4, 1.6, 0, 0, TAU); ctx.fill();
    // head and the long bill; the pouch under it swings open across the shaft when it strikes
    const hx = 9, hy = -32 + (1 - wake) * 8, ba = lerp(0.5, -0.1, wake) + open * 0.05;
    ctx.fillStyle = K.rg2(ctx, hx - 3, hy - 3, 1, hx, hy, 9, [[0, '#ffffff'], [1, '#c8c0d4']]); ctx.beginPath(); ctx.arc(hx, hy, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a809a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#f4f0f8'; ctx.beginPath(); ctx.moveTo(-2, -26); ctx.quadraticCurveTo(4, -30 + (1 - wake) * 6, hx - 4, hy + 4); ctx.lineTo(hx + 2, hy + 6); ctx.quadraticCurveTo(4, -20, -2, -18); ctx.fill();
    ctx.save(); ctx.translate(hx + 4, hy + 2); ctx.rotate(ba);
    const L2 = 34 + open * 40, sag = 6 + open * 34 + gulp * 6;
    // the pouch: a stretchy orange-pink skin under the bill
    ctx.fillStyle = K.rg2(ctx, L2 * 0.4, sag * 0.3, 2, L2 * 0.45, sag * 0.4, L2 * 0.7, [[0, '#ffd0a8'], [0.6, '#ff9a6a'], [1, '#d0604a']]);
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(L2 * 0.5, sag * 1.6, L2, 3); ctx.lineTo(L2 - 2, 1); ctx.lineTo(0, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a84a3a'; ctx.lineWidth = 1; ctx.stroke();
    K.pair(ctx, () => { ctx.moveTo(L2 * 0.2, 4 + sag * 0.3); ctx.quadraticCurveTo(L2 * 0.5, sag * 1.1, L2 * 0.8, 4 + sag * 0.3); }, 'rgba(160,60,50,.5)', 'rgba(255,230,210,.7)', 1, 0.8);
    // the upper bill
    ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#ffe6a0', '#f0b450']); ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(L2, -1); ctx.quadraticCurveTo(L2 + 4, 1, L2, 2); ctx.lineTo(-2, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a8742a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.arc(L2, 0.5, 2, 0, TAU); ctx.fill();
    ctx.restore();
    // its eye: a sleepy line, then wide open
    if (wake < 0.3) { ctx.strokeStyle = '#4a3a58'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx + 1, hy - 1, 2.6, 0.2, PI - 0.2); ctx.stroke(); }
    else K.eyes(ctx, hx + 1, hy - 2, 0, 3 * wake, '#ffcf3a', 1, open);
    // the zzz while it dozes
    if (wake < 0.2) { ctx.fillStyle = 'rgba(240,230,255,.75)'; ctx.font = '700 8px system-ui'; for (let k = 0; k < 3; k++) { const v = ph(t * 0.6 + k / 3, 1); ctx.globalAlpha = Math.sin(v * PI); ctx.fillText('z', hx + 6 + v * 10, hy - 10 - v * 18); } ctx.globalAlpha = 1; }
    ctx.restore();
  }

  PV.sections['stilts'] = (ctx, w, h, t) => {
    dusk(ctx, w, h, t);
    const L = shackWall(ctx, -1, w, h, t), R = shackWall(ctx, 1, w, h, t);
    // washing lines between the shacks (set dressing, behind the traps)
    for (const [y, sag] of [[178, 12], [420, 10]]) {
      const x0 = L(y), x1 = R(y + 6); ctx.strokeStyle = 'rgba(230,220,210,.8)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y + 6); ctx.stroke();
      [[0.25, '#ff8a7a'], [0.45, '#7ad0ff'], [0.7, '#ffe07a']].forEach(([v, c], i) => { const x = lerp(x0, x1, v), yy = y + sag * 2 * 2 * v * (1 - v) * 2 * 0.5 + v * 6 + 2, fl = Math.sin(t * 3 + i) * 2; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x + 6, yy); ctx.lineTo(x + 5 + fl, yy + 13); ctx.lineTo(x - 5 + fl, yy + 12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - 5, yy + 1, 2, 10); ctx.fillStyle = '#c8a070'; ctx.fillRect(x - 4, yy - 1.5, 2, 3); ctx.fillRect(x + 2, yy - 1.5, 2, 3); });
    }
    for (const [x, y, o] of [[0.5, 196, 0], [0.42, 300, 1.2], [0.58, 300, 2.1]]) K.coin(ctx, w * x, y, 0.62, t, o);
    netHaul(ctx, w, h, t, L, R);
    pelican(ctx, w, h, t, L);
    moths(ctx, w, h, t, L);
    K.rocket(ctx, w * 0.56, h * 0.82, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 200, 140], 12, 5);
  };
})();

