// Night group: Haunted Lighthouse, Wizard's Spire, Starfall Summit, Beanstalk Heights.
(() => {
  const { TAU, clamp, lerp, smooth, rgb } = K;
  const PI = Math.PI;
  const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ph = (t, p, o = 0) => (((t + o) % p) + p) % p;            // phase of t in a loop of p seconds
  const bump = (u, a, b, c, d) => smooth(a, b, u) * (1 - smooth(c, d, u)); // rise a→b, hold, fall c→d
  // radial gradient with distinct inner/outer centres; stops [offset, [r,g,b], alpha?]
  function rg2(ctx, x0, y0, r0, x1, y1, r1, stops) {
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (const [o, c, a = 1] of stops) g.addColorStop(o, typeof c === 'string' ? c : rgb(c, a));
    return g;
  }
  function path(ctx, pts, close) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); }
  // a smooth closed blob through points (quadratic curves through the midpoints)
  function blob(ctx, pts) {
    const n = pts.length, mid = i => [(pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2];
    ctx.beginPath(); ctx.moveTo(...mid(n - 1));
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], ...mid(i));
    ctx.closePath();
  }
  // a four-point twinkle
  function star4(ctx, x, y, s, c, a = 1) {
    if (s < 0.2 || a <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, x, y, s * 2.2, [rgb(c, 0.45 * a), rgb(c, 0)]); ctx.fillRect(x - s * 2.2, y - s * 2.2, s * 4.4, s * 4.4);
    ctx.fillStyle = rgb(K.lift(c, 60), 0.95 * a);
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    ctx.restore();
  }

  // ---------- the game's gold coin (struck palm on the face, spinning) ----------
  const CP = { lit: [255, 250, 214], hi: [255, 222, 96], mid: [234, 170, 40], lo: [176, 108, 20], edge: [136, 80, 12], deep: [100, 58, 8] };
  const FRONDS = [[-8.8, -1.0], [-6.6, -7.2], [0.2, -9.6], [6.8, -7.0], [9.0, -0.6]];
  function coinTrunk(c) { c.beginPath(); c.moveTo(0.6, 9.8); c.quadraticCurveTo(3.0, 3.4, -0.4, -2.4); c.lineTo(1.0, -2.2); c.quadraticCurveTo(5.0, 3.4, 3.4, 9.6); c.closePath(); }
  function coinFronds(c) {
    const cx = 0.2, cy = -3; c.beginPath();
    for (const [ex, ey] of FRONDS) {
      const mx = (cx + ex) / 2, my = (cy + ey) / 2, L = Math.hypot(ex - cx, ey - cy), nx = (ey - cy) / L, ny = -(ex - cx) / L, wd = L * 0.28 * (ny > 0 ? -1 : 1);
      c.moveTo(cx, cy); c.quadraticCurveTo(mx + nx * wd, my + ny * wd - 1.6, ex, ey); c.quadraticCurveTo(mx + nx * wd * 0.15, my + ny * wd * 0.15 + 0.6, cx, cy); c.closePath();
    }
  }
  function coinNuts(c) { c.beginPath(); for (const [x, y, r] of [[-1.6, -1.6, 1.9], [1.8, -1.4, 1.85], [0.1, 0.6, 1.8]]) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } }
  function emboss(c, p, fill) {
    c.save(); c.translate(0.55, 0.6); p(c); c.fillStyle = rgb(CP.deep, 0.5); c.fill(); c.restore();
    c.save(); c.translate(-0.45, -0.5); p(c); c.fillStyle = rgb(CP.lit, 0.75); c.fill(); c.restore();
    p(c); c.fillStyle = fill; c.fill();
  }
  function coin(ctx, x, y, s, t, o = 0) {
    const R = 13, sq = Math.cos(t * 2.1 + o), k = Math.max(0.14, Math.abs(sq)), bob = Math.sin(t * 2.6 + o) * 1.5;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, 0, 0, 22, [rgb([255, 230, 150], 0.42), rgb([255, 196, 80], 0.14), rgb([255, 170, 50], 0)]); ctx.fillRect(-22, -22, 44, 44);
    ctx.restore();
    // the reeded edge, showing as the coin turns
    const th = (1 - k) * 3.2 * Math.sign(sq || 1);
    ctx.fillStyle = K.lg(ctx, 0, -R, 0, R, [CP.mid, CP.lo, CP.edge]);
    ctx.beginPath(); ctx.ellipse(th, 0, R * k, R, 0, 0, TAU); ctx.fill();
    ctx.scale(k, 1);
    ctx.fillStyle = rg2(ctx, -4.5, -5, 1, -1, -1, R + 1, [[0, CP.lit], [0.35, CP.hi], [0.75, CP.mid], [1, CP.lo]]);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(CP.edge, 0.9); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, R - 0.4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgb(CP.lit, 0.85); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, R - 1, 3.5, 5.5); ctx.stroke();
    const F = R - 2.2;
    ctx.fillStyle = rg2(ctx, 3, 3.5, 1, 1, 1, F + 2, [[0, CP.hi], [0.55, CP.mid], [1, CP.lo]]);
    ctx.beginPath(); ctx.arc(0, 0, F, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(CP.deep, 0.45); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, F - 0.3, 3.3, 5.7); ctx.stroke();
    emboss(ctx, coinTrunk, K.lg(ctx, 0, -2, 4, 10, [CP.hi, CP.mid]));
    emboss(ctx, coinFronds, rg2(ctx, -2, -7, 0.5, 0, -3, 10, [[0, CP.lit], [0.35, CP.hi], [1, CP.mid]]));
    emboss(ctx, coinNuts, rg2(ctx, -2.4, -2.6, 0.2, 0, -0.8, 4.4, [[0, CP.lit], [0.4, CP.hi], [1, CP.mid]]));
    ctx.fillStyle = 'rgba(255,255,248,.95)'; ctx.beginPath(); ctx.ellipse(-7.4, -8, 1.5, 0.6, -0.8, 0, TAU); ctx.fill();
    // a sweep of shine now and then
    const u = ph(t * 0.4 + o * 0.13, 1), sx = -22 + u * 70;
    if (sx < 18) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.rotate(-0.6); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.lg(ctx, sx - 4, 0, sx + 4, 0, ['rgba(255,250,220,0)', 'rgba(255,250,220,.45)', 'rgba(255,250,220,0)']); ctx.fillRect(sx - 4, -20, 8, 40);
      ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================================
  // HAUNTED LIGHTHOUSE: moonlit whitewashed brick, the lamp's gold beam sweeping, ghost green
  // =====================================================================================
  const LH = {
    bgTop: [52, 70, 120], bgBot: [22, 30, 64], far: [44, 60, 106], far2: [36, 50, 92],
    wall: [92, 108, 150], wallIn: [30, 36, 66], rim: [40, 54, 92], seed: 2, wobble: 0.28, inset: 30,
  };
  const GHOST = [[214, 255, 240], [140, 236, 204], [64, 168, 150]], GHOST_EDGE = '#2f7f76';
  const BRASS = [[255, 226, 150], [214, 160, 70], [130, 84, 34], '#6a3e14'];
  const LAMP = { x: 0.5, y: 46, ha: 0.165, swing: 0.6 };
  const beamAngle = t => LAMP.swing * Math.sin(TAU * t / 4 + 0.5);

  function lhFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the far curve of the tower: brick courses bowing round, two tall arched windows full of moonlight
      ctx.strokeStyle = rgb(K.lift(col, 14), 0.55); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 6; y < h + 20; y += 11) { ctx.moveTo(0, y); ctx.quadraticCurveTo(w / 2, y - 9, w, y); }
      ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(col, -12), 0.5); ctx.beginPath();
      for (let y = 6, row = 0; y < h + 20; y += 11, row++) for (let x = (row % 2) * 12; x < w; x += 24) { const yy = y - 9 * (1 - ((x / w) * 2 - 1) ** 2) * 0.5; ctx.moveTo(x, yy); ctx.lineTo(x, yy + 11); }
      ctx.stroke();
      for (const [wx, wy, ww, wh] of [[w * 0.27, h * 0.34, 30, 66], [w * 0.72, h * 0.62, 26, 58]]) {
        // sky through the window: a gradient night, stars, the moon in the first one
        ctx.save(); ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh / 2); ctx.lineTo(wx - ww / 2, wy - wh / 2 + ww / 2); ctx.arc(wx, wy - wh / 2 + ww / 2, ww / 2, PI, 0); ctx.lineTo(wx + ww / 2, wy + wh / 2); ctx.closePath();
        ctx.fillStyle = K.lg(ctx, 0, wy - wh / 2, 0, wy + wh / 2, ['#5d78b8', '#3a4f8c', '#2a3a6e']); ctx.fill();
        ctx.clip();
        const r = K.rand(wx | 0);
        for (let i = 0; i < 9; i++) { const sx = wx - ww / 2 + r() * ww, sy = wy - wh / 2 + r() * wh * 0.7, tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2); ctx.fillStyle = `rgba(230,240,255,${0.4 + 0.5 * tw})`; ctx.fillRect(sx, sy, 1, 1); }
        if (wx < w / 2) { K.glow(ctx, wx + 3, wy - 12, 22, [200, 225, 255], 0.5); ctx.fillStyle = K.rg(ctx, wx, wy - 15, 9, ['#ffffff', '#dfe8ff', '#a8b8e6']); ctx.beginPath(); ctx.arc(wx + 3, wy - 12, 7, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(140,160,210,.5)'; ctx.beginPath(); ctx.arc(wx + 1, wy - 13, 1.6, 0, TAU); ctx.arc(wx + 5.5, wy - 10, 1.1, 0, TAU); ctx.fill(); }
        // the sea at the bottom with a moon path
        ctx.fillStyle = K.lg(ctx, 0, wy + wh * 0.18, 0, wy + wh / 2, ['#2c4a7c', '#1d3260']); ctx.fillRect(wx - ww, wy + wh * 0.18, ww * 2, wh);
        ctx.strokeStyle = 'rgba(210,230,255,.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let k = 0; k < 4; k++) { const yy = wy + wh * 0.24 + k * 4, s = Math.sin(t * 1.6 + k) * 2; ctx.moveTo(wx - 4 + s - k, yy); ctx.lineTo(wx + 5 + s + k, yy); }
        ctx.stroke();
        ctx.restore();
        // stone frame and mullion
        ctx.strokeStyle = rgb(K.lift(col, 30)); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh / 2); ctx.lineTo(wx - ww / 2, wy - wh / 2 + ww / 2); ctx.arc(wx, wy - wh / 2 + ww / 2, ww / 2, PI, 0); ctx.lineTo(wx + ww / 2, wy + wh / 2); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(wx, wy - wh / 2); ctx.lineTo(wx, wy + wh / 2); ctx.moveTo(wx - ww / 2, wy + 4); ctx.lineTo(wx + ww / 2, wy + 4); ctx.stroke();
        // a shaft of moonlight falling in from it
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = K.lg(ctx, wx, wy, wx + 60, wy + 150, ['rgba(170,200,255,.16)', 'rgba(170,200,255,0)']);
        ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy - wh / 2 + 8); ctx.lineTo(wx + ww / 2, wy - wh / 2); ctx.lineTo(wx + ww / 2 + 80, wy + 170); ctx.lineTo(wx - ww / 2 + 40, wy + 190); ctx.fill();
        ctx.restore();
      }
    } else {
      // the spiral stair winding up the far wall: chunky stone treads (lit top, shaded riser), an iron rail on balusters
      const flights = [[-14, h * 1.08, w + 14, h * 0.8], [-14, h * 0.63, w + 14, h * 0.31]];
      const top = rgb(K.lift(col, 26)), face = rgb(K.lift(col, 6)), under = rgb(K.lift(col, -10));
      for (const [x0, y0, x1, y1] of flights) {
        const n = 11, sw = (x1 - x0) / n, rise = (y0 - y1) / n;
        // the stringer underneath
        ctx.fillStyle = under; ctx.beginPath(); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x1, y1 + 10); ctx.lineTo(x1, y1 + 26); ctx.lineTo(x0, y0 + 26); ctx.fill();
        for (let i = 0; i < n; i++) {
          const x = x0 + i * sw, y = y0 - i * rise;
          ctx.fillStyle = face; ctx.fillRect(x, y - rise, sw + 0.5, rise + 12);
          ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x - 2, y - rise); ctx.lineTo(x + sw + 1, y - rise); ctx.lineTo(x + sw + 4, y - rise - 4); ctx.lineTo(x + 1, y - rise - 4); ctx.fill();
          ctx.strokeStyle = rgb(K.lift(col, 50), 0.55); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 1, y - rise + 0.4); ctx.lineTo(x + sw + 1, y - rise + 0.4); ctx.stroke();
          ctx.strokeStyle = rgb(K.lift(col, -18), 0.6); ctx.beginPath(); ctx.moveTo(x + sw, y - rise); ctx.lineTo(x + sw, y + 10); ctx.stroke();
        }
        // rail and balusters
        ctx.strokeStyle = rgb(K.lift(col, -4)); ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < n; i++) { const x = x0 + i * sw + sw / 2, y = y0 - i * rise - rise - 4; ctx.moveTo(x, y); ctx.lineTo(x, y - 18); }
        ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 - 22 - rise); ctx.lineTo(x1, y1 - 22 - rise); ctx.stroke();
        ctx.strokeStyle = rgb(K.lift(col, 40), 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0, y0 - 23 - rise); ctx.lineTo(x1, y1 - 23 - rise); ctx.stroke();
      }
      // cobweb sheets in the far corners
      ctx.strokeStyle = rgb(K.lift(col, 50), 0.35); ctx.lineWidth = 0.6;
      for (const [cx, cy, d] of [[w * 0.12, h * 0.02, 1], [w * 0.88, h * 0.5, -1]]) {
        ctx.beginPath();
        for (let k = 0; k < 5; k++) { const a = PI * 0.5 - d * k * 0.36; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 46 * d, cy + Math.sin(a) * 46); }
        for (let r = 12; r < 48; r += 10) { ctx.moveTo(cx, cy + r); for (let k = 1; k < 5; k++) { const a = PI * 0.5 - d * k * 0.36, ap = PI * 0.5 - d * (k - 0.5) * 0.36; ctx.quadraticCurveTo(cx + Math.cos(ap) * r * 0.85 * d, cy + Math.sin(ap) * r * 0.85, cx + Math.cos(a) * r * d, cy + Math.sin(a) * r); } }
        ctx.stroke();
      }
    }
  }

  // curved, hand-laid whitewashed brick: courses of varied height, bricks of varied length foreshortened toward the
  // screen edge like the inside of a drum, chipped whitewash with red brick showing in patches, moss and salt stains
  const WASH = [['#3a4472', '#7482b2', '#b4c2e8'], ['#384070', '#6e7aa8', '#a6b2dc'], ['#3e4878', '#7c8aba', '#c0ccf0']];
  function lhWall(ctx, side, edge, w, h, t) {
    const X = d => side < 0 ? d : w - d, ins = LH.inset + 10, r = K.rand(side < 0 ? 31 : 57);
    const D = u => ins * (1 - Math.cos(clamp(u, 0, 1) * PI / 2));      // unfolded position → distance from the screen edge
    // mortar: dark blue-grey
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(ins), 0, ['#1e2440', '#323a5e', '#46507a']); ctx.fillRect(side < 0 ? 0 : w - ins - 4, 0, ins + 4, h);
    // peeled patches where the whitewash has come away in a sheet
    const patches = []; for (let i = 0; i < 3; i++) patches.push([0.45 + r() * 0.5, r() * h, 14 + r() * 14]);
    const groups = [[], [], []], red = [], chips = [];
    for (let y = -6; y < h + 10;) {
      const rh = 7 + r() * 3; let u = -r() * 0.3;
      while (u < 1) {
        const len = 0.2 + r() * 0.22, d0 = D(u) + 0.6, d1 = D(u + len) - 0.6;
        if (d1 - d0 > 0.8) {
          const xa = X(d0), xb = X(d1), x0 = Math.min(xa, xb), bw = Math.abs(xb - xa), yy = y + 0.6 + (r() - 0.5) * 0.8, bh = rh - 1.3 - r() * 0.6;
          const inPatch = patches.some(([pu, py, pr]) => Math.hypot((u + len / 2 - pu) * 60, yy - py) < pr);
          const b = [x0, yy, bw, bh];
          if (inPatch) red.push(b); else { groups[(r() * 3) | 0].push(b); if (r() < 0.22 && bw > 3) chips.push([x0 + r() * bw * 0.6, yy + r() * bh * 0.5, 1.5 + r() * Math.min(4, bw * 0.4), 1.2 + r() * 2]); }
        }
        u += len;
      }
      y += rh;
    }
    groups.forEach((g, i) => { ctx.fillStyle = K.lg(ctx, X(0), 0, X(ins), 0, WASH[i]); ctx.beginPath(); for (const [x, y, bw, bh] of g) ctx.roundRect(x, y, bw, bh, 1.6); ctx.fill(); });
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(ins), 0, ['#4a2a32', '#8c4c40', '#c0705e']); ctx.beginPath(); for (const [x, y, bw, bh] of red) ctx.roundRect(x, y, bw, bh, 1.3); ctx.fill();
    // chips knocked out of the whitewash: brick showing, a lit lower lip
    ctx.fillStyle = '#9a5446'; ctx.beginPath(); for (const [x, y, cw, ch] of chips) { ctx.moveTo(x, y); ctx.lineTo(x + cw, y + 0.3); ctx.lineTo(x + cw * 0.8, y + ch); ctx.lineTo(x + cw * 0.15, y + ch * 0.8); ctx.closePath(); } ctx.fill();
    ctx.strokeStyle = 'rgba(230,236,255,.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); for (const [x, y, cw, ch] of chips) { ctx.moveTo(x + cw * 0.8, y + ch); ctx.lineTo(x + cw * 0.15, y + ch * 0.8); } ctx.stroke();
    // lit top lip, shaded underside on each brick (line pairs)
    const all = groups.flat();
    ctx.strokeStyle = 'rgba(236,242,255,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (const [x, y, bw] of all) { ctx.moveTo(x + 1, y + 0.5); ctx.lineTo(x + bw - 1, y + 0.5); } ctx.stroke();
    ctx.strokeStyle = 'rgba(26,30,64,.55)'; ctx.beginPath(); for (const [x, y, bw, bh] of all.concat(red)) { ctx.moveTo(x + 1, y + bh - 0.3); ctx.lineTo(x + bw - 1, y + bh - 0.3); } ctx.stroke();
    // the ragged edge of each peeled patch
    for (const [pu, py, pr] of patches) {
      const cx = X(D(pu)), R2 = K.rand((py | 0) + 3); ctx.strokeStyle = 'rgba(210,222,250,.32)'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, rr = pr * (0.75 + R2() * 0.35); const px = cx + Math.cos(a) * rr * 0.5, ppy = py + Math.sin(a) * rr; k ? ctx.lineTo(px, ppy) : ctx.moveTo(px, ppy); }
      ctx.stroke();
    }
    // salt streaks and green-teal moss gathered in the joints
    for (let i = 0; i < 6; i++) {
      const x = X(10 + r() * (ins - 12)), y = r() * h, len = 16 + r() * 34;
      ctx.fillStyle = K.lg(ctx, 0, y, 0, y + len, ['rgba(220,232,255,.28)', 'rgba(220,232,255,0)']); ctx.fillRect(x - 1.2, y, 2.4, len);
    }
    for (let i = 0; i < 5; i++) {
      const x = X(6 + r() * (ins - 8)), y = r() * h;
      ctx.fillStyle = K.rg(ctx, x, y, 9, ['rgba(90,170,140,.55)', 'rgba(70,140,120,0)']); ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,220,170,.7)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (k - 1.5) * 2.4, y - 1 + (k % 2), 0.9, 0, TAU); ctx.fill(); }
    }
    // the drum's shadow toward the screen edge
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(ins * 0.75), 0, ['rgba(10,14,36,.65)', 'rgba(10,14,36,0)']); ctx.fillRect(side < 0 ? 0 : w - ins, 0, ins, h);
    // cobwebs drooping into the corner
    ctx.strokeStyle = 'rgba(220,232,255,.32)'; ctx.lineWidth = 0.6;
    for (const yy of side < 0 ? [h * 0.08, h * 0.74] : [h * 0.3, h * 0.9]) {
      const ex = edge(yy); ctx.beginPath();
      for (let k = 0; k < 3; k++) { ctx.moveTo(ex - side * 22, yy - 8 + k * 4); ctx.quadraticCurveTo(ex - side * 6, yy + 10 + k * 6, ex + side * 2, yy + 18 + k * 9); }
      ctx.stroke();
    }
  }
  // the rim light, varying along its length: cool moonlight that swells and fades, warm gold where the beam lands
  function lhRim(ctx, S, h, t, lx, ly, a) {
    ctx.save(); ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ex = y => side < 0 ? S.L(y) : S.R(y);
      for (let y = -4; y < h + 4; y += 6) {
        const yc = y + 3, warm = litBy(ex(yc), yc, lx, ly, a), cool = 0.45 + 0.35 * Math.sin(yc * 0.031 + side * 2) + 0.2 * Math.sin(yc * 0.083 + 1);
        const c = K.mix([150, 196, 255], [255, 214, 130], warm), al = clamp(cool * 0.8 + warm, 0.15, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgb(c, 0.16 * al); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ex(y), y); ctx.lineTo(ex(y + 6), y + 6); ctx.stroke();
        ctx.strokeStyle = rgb(c, 0.4 * al); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(ex(y), y); ctx.lineTo(ex(y + 6), y + 6); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = rgb(K.lift(c, 30), 0.25 + 0.7 * al); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex(y), y); ctx.lineTo(ex(y + 6), y + 6); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // the great Fresnel lens hanging from its brass mount at the top: prism rings, a bullseye that turns with the beam
  function drawLens(ctx, x, y, a, t) {
    const glow = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
    K.glow(ctx, x, y, 90, [255, 214, 120], 0.35 * glow);
    // the mount: a fluted brass column to the top edge
    ctx.fillStyle = K.lg(ctx, x - 6, 0, x + 6, 0, [BRASS[0], BRASS[1], BRASS[2]]); ctx.fillRect(x - 5, -2, 10, y - 26);
    ctx.strokeStyle = BRASS[3]; ctx.lineWidth = 0.9; ctx.strokeRect(x - 5, -2, 10, y - 26);
    ctx.strokeStyle = 'rgba(255,240,200,.6)'; ctx.beginPath(); ctx.moveTo(x - 2.5, 0); ctx.lineTo(x - 2.5, y - 28); ctx.stroke();
    // cap
    ctx.fillStyle = K.lg(ctx, 0, y - 32, 0, y - 20, [BRASS[0], BRASS[1], BRASS[2]]);
    ctx.beginPath(); ctx.moveTo(x - 20, y - 20); ctx.quadraticCurveTo(x - 18, y - 32, x, y - 33); ctx.quadraticCurveTo(x + 18, y - 32, x + 20, y - 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = BRASS[3]; ctx.stroke();
    // the glass beehive: stacked prism rings
    const rings = [[-20, 15], [-14, 20], [-7, 23], [0, 24], [7, 23], [14, 20], [20, 15]];
    for (let i = 0; i < rings.length - 1; i++) {
      const [y0, r0] = rings[i], [y1, r1] = rings[i + 1];
      ctx.fillStyle = K.lg(ctx, x - r0, 0, x + r0, 0, [[0, 'rgba(150,110,50,.95)'], [0.3, 'rgba(255,236,170,.95)'], [0.5 + Math.sin(a) * 0.3, 'rgba(255,255,240,1)'], [0.85, 'rgba(230,170,70,.95)'], [1, 'rgba(140,90,40,.95)']]);
      ctx.beginPath(); ctx.moveTo(x - r0, y + y0); ctx.lineTo(x + r0, y + y0); ctx.lineTo(x + r1, y + y1); ctx.lineTo(x - r1, y + y1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,96,30,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - r1, y + y1); ctx.lineTo(x + r1, y + y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,230,.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - r0 + 1, y + y0 + 1); ctx.lineTo(x + r0 - 1, y + y0 + 1); ctx.stroke();
    }
    // brass ribs
    ctx.strokeStyle = 'rgba(140,90,34,.75)'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (const f of [-0.62, 0.62]) { ctx.moveTo(x + f * 15, y - 20); ctx.quadraticCurveTo(x + f * 25, y, x + f * 15, y + 20); }
    ctx.stroke();
    // the bullseye, facing the way the beam points
    const bx = x + Math.sin(a) * 12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, bx, y + 2, 14, ['rgba(255,255,240,1)', 'rgba(255,230,140,.7)', 'rgba(255,200,90,0)']); ctx.beginPath(); ctx.arc(bx, y + 2, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,220,.6)'; ctx.lineWidth = 0.7; for (const rr of [4, 7.5, 11]) { ctx.beginPath(); ctx.ellipse(bx, y + 2, rr * (0.6 + 0.4 * Math.cos(a)), rr, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    // base ring
    ctx.fillStyle = K.lg(ctx, 0, y + 20, 0, y + 27, [BRASS[0], BRASS[1], BRASS[2]]);
    ctx.beginPath(); ctx.ellipse(x, y + 22, 17, 4.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = BRASS[3]; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.rg(ctx, x - 1, y + 27, 5, [BRASS[0], BRASS[2]]); ctx.beginPath(); ctx.arc(x, y + 28, 3.4, 0, TAU); ctx.fill();
  }
  function beamPoly(ctx, x, y, a, ha, L) {
    ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * 6, y + 10);
    ctx.lineTo(x + Math.sin(a - ha) * L, y + Math.cos(a - ha) * L); ctx.lineTo(x + Math.sin(a + ha) * L, y + Math.cos(a + ha) * L); ctx.closePath();
  }
  function drawBeam(ctx, x, y, a, t, L) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ex = x + Math.sin(a) * L, ey = y + Math.cos(a) * L;
    for (const [k, al] of [[1.6, 0.07], [1, 0.16], [0.45, 0.2]]) {
      ctx.fillStyle = K.lg(ctx, x, y, ex, ey, [[0, `rgba(255,236,160,${al * 2})`], [0.45, `rgba(255,220,130,${al})`], [1, 'rgba(255,200,110,0)']]);
      beamPoly(ctx, x, y, a, LAMP.ha * k, L); ctx.fill();
    }
    // dust turning in the light
    const r = K.rand(91);
    for (let i = 0; i < 26; i++) {
      const d = 40 + r() * (L - 80), off = (r() - 0.5) * 2 * LAMP.ha * 0.9, px = x + Math.sin(a + off) * d + Math.sin(t * 0.8 + i) * 3, py = y + Math.cos(a + off) * d + Math.cos(t * 0.6 + i) * 3;
      ctx.fillStyle = `rgba(255,240,190,${0.35 + 0.35 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(px, py, 0.6 + r() * 0.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // how lit a point is by the beam (0..1)
  function litBy(x, y, lx, ly, a) { const ang = Math.atan2(x - lx, y - ly); return 1 - smooth(LAMP.ha * 0.5, LAMP.ha * 1.25, Math.abs(ang - a)); }

  // ghost-thorn brambles on the wall: only there in the light. Curling stems with hooked thorns.
  const BRAMBLE = [[-16, 50, -0.62, 0.6], [-5, 66, -0.08, -0.45], [6, 58, 0.28, 0.5], [16, 42, 0.72, -0.4]];
  function bramblePts(y0, len, ang, curl) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const v = i / 8, a = ang + curl * v * v; pts.push([Math.cos(a) * len * v, y0 + Math.sin(a) * len * v]); }
    return pts;
  }
  function thornCluster(ctx, ex, y, side, s, solid) {
    ctx.save(); ctx.translate(ex, y); ctx.scale(-side * s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [y0, len, ang, curl] of BRAMBLE) {
      const pts = bramblePts(y0, len, ang, curl);
      // hooked thorns along the stem, alternating sides
      for (let i = 1; i < 8; i++) {
        const [x, yy] = pts[i], [nx2, ny2] = pts[i + 1], dx = nx2 - x, dy = ny2 - yy, L = Math.hypot(dx, dy) || 1, sd = i % 2 ? 1 : -1, px = -dy / L * sd, py = dx / L * sd;
        const tl = 10 - i * 0.7, tx = x + px * tl + dx / L * 2.5, ty = yy + py * tl + dy / L * 2.5;
        ctx.beginPath(); ctx.moveTo(x - dx / L * 2.2, yy - dy / L * 2.2); ctx.quadraticCurveTo(x + px * tl * 0.4, yy + py * tl * 0.4, tx, ty); ctx.quadraticCurveTo(x + px * 1.5 + dx / L * 1.5, yy + py * 1.5 + dy / L * 1.5, x + dx / L * 2.2, yy + dy / L * 2.2); ctx.closePath();
        if (solid) { ctx.fillStyle = K.lg(ctx, x, yy, tx, ty, ['#a8306a', '#ff6fa8', '#ffe2ee']); ctx.fill(); ctx.strokeStyle = '#6a1a44'; ctx.lineWidth = 0.7; ctx.stroke(); }
        else { ctx.strokeStyle = 'rgba(170,240,220,.3)'; ctx.lineWidth = 0.7; ctx.stroke(); }
      }
      if (solid) {
        ctx.strokeStyle = '#4a1834'; ctx.lineWidth = 7; path(ctx, pts); ctx.stroke();
        ctx.strokeStyle = '#8a2c5e'; ctx.lineWidth = 5; path(ctx, pts); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,170,210,.75)'; ctx.lineWidth = 1.3; ctx.save(); ctx.translate(-0.6, -1); path(ctx, pts.slice(0, 7)); ctx.stroke(); ctx.restore();
        const [tx, ty] = pts[8], [qx, qy] = pts[7];
        ctx.fillStyle = K.lg(ctx, qx, qy, tx, ty, ['#c44a86', '#ffe0ee']); ctx.beginPath(); const dx = tx - qx, dy = ty - qy; ctx.moveTo(qx - dy * 0.5, qy + dx * 0.5); ctx.lineTo(tx + dx * 1.4, ty + dy * 1.4); ctx.lineTo(qx + dy * 0.5, qy - dx * 0.5); ctx.fill();
      } else { ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(170,240,220,.32)'; ctx.lineWidth = 1.2; path(ctx, pts); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (solid) {
      // the gnarled root knot the stems grow from
      ctx.fillStyle = K.rg(ctx, 0, -6, 18, ['#a8406e', '#5e1e42', '#3c1430']); ctx.beginPath(); ctx.ellipse(-1, 0, 9, 24, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2e0e24'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,160,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -18); ctx.quadraticCurveTo(5, -4, 2, 12); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,10,30,.6)'; ctx.beginPath(); ctx.moveTo(-3, -14); ctx.quadraticCurveTo(0, 0, -4, 16); ctx.stroke();
    }
    ctx.restore();
  }

  // the phantom: a sheet ghost with a tattered hem; drawn see-through, then solid wherever the beam touches it
  function ghostPath(ctx, t, lit) {
    const wv = k => Math.sin(t * 5 + k * 1.7) * 2.2;
    ctx.beginPath();
    ctx.moveTo(-16, 6);
    ctx.bezierCurveTo(-17, -14, -9, -23, 0, -23);
    ctx.bezierCurveTo(9, -23, 17, -14, 16, 6);
    // the right arm, raised when lit
    const ar = lit * 6;
    ctx.quadraticCurveTo(24, 2 - ar, 25, -4 - ar); ctx.quadraticCurveTo(26, 4, 17, 12);
    // hem: tails flowing back
    const tails = [[14, 26 + wv(0)], [5, 22 + wv(1)], [-5, 27 + wv(2)], [-15, 23 + wv(3)]];
    let px = 17, py = 12;
    for (const [tx, ty] of tails) { ctx.quadraticCurveTo(px - 1, (py + ty) / 2 + 4, tx + wv(tx) * 0.6, ty); const vx = tx - 4.5, vy = ty - 7; ctx.quadraticCurveTo(tx - 1, ty - 2, vx, vy); px = vx; py = vy; }
    ctx.quadraticCurveTo(-19, 14, -17, 12);
    ctx.quadraticCurveTo(-26, 4, -25, -4 - ar); ctx.quadraticCurveTo(-24, 2 - ar, -16, 6);
    ctx.closePath();
  }
  function drawGhost(ctx, x, y, s, t, lit, clipBeam) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // see-through version (always)
    ctx.save(); ctx.globalAlpha = 0.32;
    ghostPath(ctx, t, 0); ctx.fillStyle = K.lg(ctx, 0, -23, 0, 26, ['rgba(180,230,255,.55)', 'rgba(140,200,240,.25)', 'rgba(120,180,230,0)']); ctx.fill();
    ctx.restore();
    ghostPath(ctx, t, 0); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(190,240,255,.45)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(200,240,255,.35)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 5.5, -8, 3, 4, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, 2, 2.4, 3, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // solid version where the light falls on it
    if (lit < 0.01) return;
    ctx.save(); clipBeam(); ctx.clip();
    ctx.translate(x, y); ctx.scale(s, s);
    ghostPath(ctx, t, lit);
    ctx.fillStyle = rg2(ctx, -6, -14, 2, -2, -4, 34, [[0, GHOST[0]], [0.5, GHOST[1]], [1, GHOST[2]]]); ctx.fill();
    ctx.save(); ghostPath(ctx, t, lit); ctx.clip();
    // folds in the sheet (furrow + ridge pairs), gold light on the lamp side
    for (const fx of [-8, 3, 11]) {
      ctx.strokeStyle = 'rgba(40,130,120,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(fx, 6); ctx.quadraticCurveTo(fx + 2, 16, fx - 1, 26); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,255,250,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(fx + 1.6, 6); ctx.quadraticCurveTo(fx + 3.6, 16, fx + 0.6, 25); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,226,140,.8)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -2, 15, 20, 0, 3.6, 5.8); ctx.stroke();
    ctx.restore();
    ghostPath(ctx, t, lit); ctx.strokeStyle = GHOST_EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    K.sheen(ctx, -2, -10, 14, 0.55, 3.6, 4.7);
    // angry cartoon eyes, a wailing mouth
    K.eyes(ctx, 0, -8, 5.8, 4.4, '#2fd8a8', Math.sin(t * 1.3) * 0.6, lit);
    ctx.fillStyle = K.rg(ctx, 0, 3, 6, ['#1f4f5a', '#173840']); ctx.beginPath(); ctx.ellipse(0, 4, 4.4, 5.4 + Math.sin(t * 6) * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5ec8c0'; ctx.beginPath(); ctx.ellipse(0, 7.2, 2.6, 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4fffb'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 3.6, 0.4); ctx.lineTo(d * 1.6, 0); ctx.lineTo(d * 2.6, 2.6); ctx.fill(); }
    ctx.restore();
  }

  // the ghost lantern: an iron lantern on a chain, swinging by itself, green ghost-fire trailing behind
  const lanternAng = t => { const u = ph(t, 4, 0.9); const big = 1.05 * bump(u, 1.5, 1.9, 3.2, 3.9), shake = bump(u, 1.0, 1.2, 1.5, 1.7) * Math.sin(t * 60) * 0.05; return 0.13 * Math.sin(TAU * t / 2) * (1 - big) - big * (1 - Math.cos(TAU * (u - 1.5) / 2)) / 2 + shake; };
  function drawLantern(ctx, px, py, len, t) {
    const u = ph(t, 4, 0.9), flare = bump(u, 1.0, 1.3, 3.2, 3.9);
    const pos = tt => { const a = lanternAng(tt); return [px + Math.sin(a) * len, py + Math.cos(a) * len, a]; };
    const [lx, ly, a] = pos(t);
    // ghost-fire trail: wisps at the lantern's recent positions
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 10; k >= 1; k--) {
      const [qx, qy] = pos(t - k * 0.035), f = 1 - k / 11, rr = (5 + 7 * flare) * f + 2;
      ctx.fillStyle = K.rg(ctx, qx, qy + 4, rr * 1.8, [`rgba(150,255,210,${0.35 * f * (0.5 + flare)})`, 'rgba(80,220,170,0)']);
      ctx.beginPath(); ctx.arc(qx, qy + 4, rr * 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
    K.danger(ctx, lx, ly + 4, 30 + flare * 10, 0.18 + 0.15 * flare);
    K.glow(ctx, lx, ly + 4, 40 + flare * 22, [120, 255, 200], 0.4 + 0.3 * flare);
    // the chain: oval links
    const n = 9;
    for (let i = 0; i < n; i++) {
      const v = (i + 0.5) / n, cx = lerp(px, lx, v), cy = lerp(py, ly - 17, v), side = i % 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a);
      ctx.strokeStyle = '#4d4a5e'; ctx.lineWidth = 2; ctx.beginPath(); side ? ctx.moveTo(0, -3.4) : 0; side ? ctx.lineTo(0, 3.4) : ctx.ellipse(0, 0, 2.2, 3.8, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,205,230,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); side ? (ctx.moveTo(-0.5, -3), ctx.lineTo(-0.5, 1)) : ctx.ellipse(0, 0, 2.2, 3.8, 0, 3.4, 4.6); ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(-a * 0.8); ctx.scale(1.3, 1.3);
    const IR = ['#a9a8c2', '#6c6a86', '#3c3a52'];
    // handle ring and cap
    ctx.strokeStyle = IR[1]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -13, 3.2, PI, 0); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, -9, 0, 9, 0, IR); ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-4, -12); ctx.lineTo(4, -12); ctx.lineTo(9, -6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#34324a'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(230,230,255,.55)'; ctx.beginPath(); ctx.moveTo(-7, -6.8); ctx.lineTo(-3.4, -11); ctx.stroke();
    // glass with the ghost flame inside
    ctx.fillStyle = K.rg(ctx, 0, 3, 11, ['rgba(230,255,245,.95)', 'rgba(120,240,200,.75)', 'rgba(40,140,120,.85)']);
    ctx.beginPath(); ctx.roundRect(-7, -6, 14, 17, 2); ctx.fill();
    const fh = 9 + flare * 5 + Math.sin(t * 14) * 1.2;
    ctx.fillStyle = K.lg(ctx, 0, 9, 0, 9 - fh, ['#f6fff9', '#9effd8', 'rgba(60,220,170,.6)']);
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(-5, 2, -1 + Math.sin(t * 9) * 1.5, 9 - fh); ctx.quadraticCurveTo(2, 0, 3, -1); ctx.quadraticCurveTo(5, 4, 4, 8); ctx.closePath(); ctx.fill();
    // two tiny eyes in the flame
    ctx.fillStyle = '#1d5a50'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 1.7, 4.4, 0.9, 1.3 - flare * 0.4, 0, 0, TAU); ctx.fill(); }
    // cage bars and base
    ctx.strokeStyle = IR[2]; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-7, 11); ctx.moveTo(7, -6); ctx.lineTo(7, 11); ctx.moveTo(0, -6); ctx.lineTo(0, -2); ctx.moveTo(0, 9); ctx.lineTo(0, 11); ctx.moveTo(-7, 2.5); ctx.lineTo(-5, 2.5); ctx.moveTo(5, 2.5); ctx.lineTo(7, 2.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(-5, 0); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, 11, 0, 15, IR); ctx.beginPath(); ctx.roundRect(-9, 10.5, 18, 4, 1.5); ctx.fill(); ctx.strokeStyle = '#34324a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
    // wisps rising off the cap
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const v = ph(t * 0.9 + k / 3, 1), wx = lx + Math.sin(t * 3 + k * 2) * 4 - Math.sin(a) * 18 * v, wy = ly - 14 - v * 26;
      ctx.strokeStyle = `rgba(160,255,220,${0.5 * (1 - v)})`; ctx.lineWidth = 2.2 * (1 - v) + 0.5; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 4, wy - 5, wx, wy - 10); ctx.stroke();
    }
    ctx.restore();
  }

  PV.sections['lighthouse'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...LH, farShape: lhFar, wallDeco: lhWall, mote: null });
    const lx = w * LAMP.x, ly = LAMP.y, a = beamAngle(t), L = 470;
    lhRim(ctx, S, h, t, lx, ly, a);
    // where the beam hits a wall, warm the rim gold
    for (const side of [-1, 1]) {
      const wx = side < 0 ? S.L(200) : S.R(200), hitY = ly + (wx - lx) / Math.tan(a || 1e-4);
      if (Math.sign(Math.sin(a)) === side && hitY > 0 && hitY < h) { const ex = side < 0 ? S.L(hitY) : S.R(hitY); K.glow(ctx, ex, hitY, 70, [255, 210, 120], 0.45); }
    }
    // hidden thorns: faint dashed outlines in the dark, solid where the light falls
    const thorns = [[-1, h * 0.27, 1], [1, h * 0.43, 1.05], [-1, h * 0.64, 0.95]];
    for (const [side, y, s] of thorns) thornCluster(ctx, side < 0 ? S.L(y) - 4 : S.R(y) + 4, y, side, s, false);
    ctx.save(); beamPoly(ctx, lx, ly, a, LAMP.ha * 1.15, L); ctx.clip();
    for (const [side, y, s] of thorns) { const ex = side < 0 ? S.L(y) - 4 : S.R(y) + 4; K.danger(ctx, ex + side * -30, y, 50, 0.32); thornCluster(ctx, ex, y, side, s, true); }
    ctx.restore();
    // coins
    coin(ctx, w * 0.33, h * 0.18, 0.68, t, 0); coin(ctx, w * 0.6, h * 0.52, 0.68, t, 1.7); coin(ctx, w * 0.42, h * 0.68, 0.68, t, 3.1);
    drawBeam(ctx, lx, ly, a, t, L);
    // the phantom drifting in a lazy loop
    const gy = h * 0.4 + Math.sin(TAU * t / 2 + 1) * 10, wander = w * 0.5 + Math.sin(TAU * t / 4) * w * 0.17;
    // ...until the beam catches it: it is held in the light and dragged along for a second
    const caught = bump(ph(t, 4), 0.95, 1.2, 2.25, 2.5), beamX = lx + (gy - ly) * Math.tan(a);
    const gx = lerp(wander, beamX, caught * 0.92);
    const lit = litBy(gx, gy, lx, ly, a);
    if (lit > 0.05) { K.danger(ctx, gx, gy + 2, 44, 0.32 * lit); K.glow(ctx, gx, gy, 46, [140, 255, 210], 0.35 * lit); }
    else K.glow(ctx, gx, gy, 34, [150, 210, 255], 0.12);
    drawGhost(ctx, gx, gy, 0.95, t, lit, () => beamPoly(ctx, lx, ly, a, LAMP.ha * 1.05, L));
    drawLens(ctx, lx, ly, a, t);
    // the ghost lantern on an iron bracket from the right wall
    const by = h * 0.555, bx0 = S.R(by), bpx = w * 0.69;
    // a wrought-iron bracket: wall plate with rivets, an arm, a scrolled brace curling under it, a hook
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const iron = (lw, c) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(bx0 + 2, by); ctx.lineTo(bpx, by); ctx.quadraticCurveTo(bpx - 7, by, bpx - 6, by + 5);
      ctx.moveTo(bx0 + 1, by + 20); ctx.bezierCurveTo(bx0 - 22, by + 18, bpx + 8, by + 18, bpx + 12, by + 3);
      ctx.moveTo(bx0 - 14, by + 1); ctx.bezierCurveTo(bx0 - 22, by + 4, bx0 - 26, by + 12, bx0 - 19, by + 14); ctx.bezierCurveTo(bx0 - 14, by + 15, bx0 - 13, by + 9, bx0 - 17, by + 9);
      ctx.stroke(); };
    iron(3.6, '#3e3c52'); iron(2.4, '#6a6884');
    ctx.strokeStyle = 'rgba(210,214,240,.65)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx0 + 1, by - 1); ctx.lineTo(bpx, by - 1); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, bx0 - 3, 0, bx0 + 8, 0, ['#8a88a4', '#4d4a5e']); ctx.beginPath(); ctx.roundRect(bx0 - 2, by - 6, 8, 32, 2); ctx.fill();
    ctx.strokeStyle = '#34324a'; ctx.lineWidth = 0.8; ctx.stroke();
    for (const yy of [by - 2, by + 22]) { ctx.fillStyle = K.rg(ctx, bx0 + 1.4, yy - 0.6, 2.4, ['#d8d6f0', '#5a5872']); ctx.beginPath(); ctx.arc(bx0 + 2, yy, 1.8, 0, TAU); ctx.fill(); }
    drawLantern(ctx, bpx - 6, by + 5, 66, t);
    const ra = lanternAng(t), dodge = Math.max(0, -Math.sin(ra)) * 16;
    K.rocket(ctx, w * 0.5 + dodge, h * 0.82, 0.75, t);
    // sea mist curling up the bottom of the tower
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const mx = ph(i * 61 + t * (6 + i), w + 120) - 60, my = h - 18 - (i % 3) * 16, rr = 50 + (i % 3) * 14;
      ctx.fillStyle = K.rg(ctx, mx, my, rr, ['rgba(170,195,240,.16)', 'rgba(170,195,240,0)']); ctx.beginPath(); ctx.ellipse(mx, my, rr * 1.4, rr * 0.6, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    K.motes(ctx, w, h, t, 'dust', [210, 225, 255], 30, 11);
  };
  // =====================================================================================
  // WIZARD'S SPIRE: a cosy tower of books, candles and potions; midnight blue, candle gold, magic cyan
  // =====================================================================================
  const WZ = {
    bgTop: [50, 62, 122], bgBot: [22, 26, 64], far: [44, 54, 108], far2: [38, 46, 96],
    wall: [92, 56, 42], wallIn: [34, 20, 24], rim: [255, 196, 112], seed: 4, wobble: 0.3, inset: 36,
  };
  const SPINES = [[186, 54, 60], [48, 128, 96], [46, 100, 160], [126, 66, 150], [204, 146, 56], [158, 80, 42], [60, 140, 148], [210, 110, 130]];
  const WOOD = [[196, 132, 80], [128, 76, 44], [70, 38, 24], '#4a2414'];
  const BREW = [[230, 255, 160], [140, 236, 70], [52, 150, 40]];
  const CYAN = [94, 240, 255];
  let wzCandles = [];
  const SLOT_Y = 102;            // the spellbook's empty slot on the left wall (shelf top)

  function candle(ctx, x, y, s, t, o) {
    // wax with drips, a flickering flame
    ctx.fillStyle = K.lg(ctx, x - 2.5 * s, 0, x + 2.5 * s, 0, ['#fff6e0', '#f0d8b0', '#b89470']);
    ctx.beginPath(); ctx.roundRect(x - 2.4 * s, y - 9 * s, 4.8 * s, 9 * s, 1 * s); ctx.fill();
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.ellipse(x - 1.6 * s, y - 6 * s, 0.9 * s, 2.2 * s, 0, 0, TAU); ctx.ellipse(x + 1.4 * s, y - 7 * s, 0.8 * s, 1.5 * s, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a4a30'; ctx.lineWidth = 0.6 * s; ctx.beginPath(); ctx.moveTo(x, y - 9 * s); ctx.lineTo(x, y - 10.5 * s); ctx.stroke();
    const fl = 1 + Math.sin(t * 13 + o) * 0.12 + Math.sin(t * 7.3 + o * 2) * 0.08, sw = Math.sin(t * 5 + o) * 0.6 * s;
    ctx.fillStyle = K.lg(ctx, x, y - 10 * s, x, y - 16 * s * fl, ['#fffbe6', '#ffd65a', 'rgba(255,140,40,.85)']);
    ctx.beginPath(); ctx.moveTo(x - 1.7 * s, y - 10.6 * s); ctx.quadraticCurveTo(x - 1.8 * s, y - 13 * s, x + sw, y - 16.5 * s * fl); ctx.quadraticCurveTo(x + 1.9 * s, y - 13 * s, x + 1.7 * s, y - 10.6 * s); ctx.closePath(); ctx.fill();
  }
  function flask(ctx, x, y, s, c, t, o, tall) {
    const r = 4.6 * s, ny = y - r * 2 - (tall ? 6 : 3) * s;
    ctx.fillStyle = 'rgba(200,230,255,.28)';
    ctx.beginPath(); if (tall) { ctx.roundRect(x - r * 0.8, y - r * 2.2, r * 1.6, r * 2.2, r * 0.4); } else ctx.arc(x, y - r, r, 0, TAU); ctx.fill();
    ctx.fillRect(x - 1.3 * s, ny, 2.6 * s, y - r - ny);
    // the glowing brew
    const lv = y - r * (tall ? 1.4 : 1) + Math.sin(t * 2 + o) * 0.5;
    ctx.save(); ctx.beginPath(); if (tall) ctx.roundRect(x - r * 0.8, y - r * 2.2, r * 1.6, r * 2.2, r * 0.4); else ctx.arc(x, y - r, r, 0, TAU); ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, lv, 0, y, [K.lift(c, 70), c, K.lift(c, -60)]); ctx.fillRect(x - r, lv, r * 2, y - lv);
    ctx.restore();
    ctx.strokeStyle = rgb(K.lift(c, -40), 0.8); ctx.lineWidth = 0.6 * s; ctx.beginPath(); if (tall) ctx.roundRect(x - r * 0.8, y - r * 2.2, r * 1.6, r * 2.2, r * 0.4); else ctx.arc(x, y - r, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, x - 2 * s, 0, x + 2 * s, 0, ['#d8a870', '#8a5a30']); ctx.fillRect(x - 1.8 * s, ny - 2.6 * s, 3.6 * s, 3 * s);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.7 * s; ctx.beginPath(); ctx.arc(x, y - r * (tall ? 1.2 : 1), r * 0.62, 3.5, 4.4); ctx.stroke();
  }
  function wizFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // stone back wall courses
      ctx.strokeStyle = rgb(K.lift(col, -10), 0.6); ctx.lineWidth = 1;
      ctx.beginPath(); for (let y = 8, row = 0; y < h; y += 16, row++) { ctx.moveTo(0, y); ctx.lineTo(w, y); for (let x = (row % 2) * 18; x < w; x += 36) { ctx.moveTo(x, y); ctx.lineTo(x, y + 16); } } ctx.stroke();
      // a round observatory window at the top: stars and a crescent moon
      const wx = w * 0.5, wy = h * 0.1, wr = 46;
      ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.fillStyle = K.lg(ctx, 0, wy - wr, 0, wy + wr, ['#4a6ac0', '#2e3e88', '#22306c']); ctx.fill(); ctx.clip();
      const r = K.rand(8); for (let i = 0; i < 24; i++) { const sx = wx - wr + r() * wr * 2, sy = wy - wr + r() * wr * 2, tw = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 1.9); ctx.fillStyle = `rgba(235,240,255,${0.35 + 0.55 * tw})`; ctx.beginPath(); ctx.arc(sx, sy, 0.5 + r() * 0.7, 0, TAU); ctx.fill(); }
      K.glow(ctx, wx + 18, wy - 14, 28, [210, 230, 255], 0.4);
      ctx.fillStyle = K.rg(ctx, wx + 15, wy - 17, 10, ['#ffffff', '#e8eeff', '#b8c6ee']); ctx.beginPath(); ctx.arc(wx + 18, wy - 14, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#34488e'; ctx.beginPath(); ctx.arc(wx + 22, wy - 17, 8, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = rgb(K.lift(col, 34)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * PI / 4; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); } ctx.arc(wx + wr * 0.45, wy, 0, 0, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, wy, wr * 0.45, 0, TAU); ctx.stroke();
      // the star chart carved into the stone: a zodiac ring and glowing constellations
      const cx = w * 0.5, cy = h * 0.47, cr = 74;
      ctx.strokeStyle = rgb(K.lift(col, 22), 0.9); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.moveTo(cx + cr - 12, cy); ctx.arc(cx, cy, cr - 12, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 12; k++) { const a = k * TAU / 12 + 0.1; ctx.moveTo(cx + Math.cos(a) * (cr - 12), cy + Math.sin(a) * (cr - 12)); ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr); } ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cons = [[[-30, -30], [-14, -40], [4, -34], [16, -46]], [[20, 6], [34, -4], [44, 14], [30, 24], [20, 6]], [[-40, 18], [-26, 30], [-10, 22], [-2, 40]], [[-6, -8], [6, 4]]];
      for (const [ci, c] of cons.entries()) {
        const a = 0.35 + 0.25 * Math.sin(t * 1.5 + ci * 1.7);
        ctx.strokeStyle = rgb(CYAN, a * 0.6); ctx.lineWidth = 0.8; path(ctx, c.map(([x, y]) => [cx + x, cy + y])); ctx.stroke();
        for (const [x, y] of c) { ctx.fillStyle = rgb([200, 250, 255], a + 0.2); ctx.beginPath(); ctx.arc(cx + x, cy + y, 1.3, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    } else {
      // a library ladder leaning in the back, and hanging bundles of drying herbs
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.62, h + 4); ctx.lineTo(w * 0.72, h * 0.55); ctx.moveTo(w * 0.72, h + 4); ctx.lineTo(w * 0.82, h * 0.55); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); for (let v = 0.06; v < 1; v += 0.1) { const y = lerp(h, h * 0.55, v); ctx.moveTo(lerp(w * 0.62, w * 0.72, v), y); ctx.lineTo(lerp(w * 0.72, w * 0.82, v), y); } ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(col, 30), 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(w * 0.62 - 1, h); ctx.lineTo(w * 0.72 - 1, h * 0.55); ctx.stroke();
      // a far shelf of books, softened
      for (const [x0, y0] of [[w * 0.14, h * 0.78], [w * 0.2, h * 0.3]]) {
        ctx.fillStyle = rgb(K.lift(col, -8)); ctx.fillRect(x0 - 30, y0, 60, 4);
        const r = K.rand(x0 | 0); let x = x0 - 28;
        while (x < x0 + 26) { const bw = 3 + r() * 3, bh = 10 + r() * 8; ctx.fillStyle = rgb(K.mix(col, SPINES[(r() * SPINES.length) | 0], 0.22)); ctx.fillRect(x, y0 - bh, bw - 0.6, bh); x += bw; }
      }
      // herbs on strings from the top
      ctx.strokeStyle = rgb(K.lift(col, 10)); ctx.lineWidth = 0.8;
      for (const hx of [w * 0.3, w * 0.38, w * 0.66]) {
        const len = 30 + (hx % 17), sw = Math.sin(t * 0.8 + hx) * 1.5;
        ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx + sw, len); ctx.stroke();
        ctx.fillStyle = rgb(K.mix(col, [80, 140, 80], 0.3)); ctx.beginPath(); ctx.moveTo(hx + sw, len); ctx.lineTo(hx + sw - 6, len + 16); ctx.lineTo(hx + sw + 6, len + 16); ctx.fill();
      }
    }
  }
  // bookshelves: planks every 46 px, packed with spines (gold bands, leaners, gaps), candles and potions
  function wizWall(ctx, side, edge, w, h, t) {
    const X = d => side < 0 ? d : w - d, r = K.rand(side < 0 ? 71 : 83), ins = 46, gap = 46;
    // the dark back of the case
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(ins), 0, ['#24141a', '#3e2420']); ctx.fillRect(side < 0 ? 0 : w - ins, 0, ins, h);
    for (let y0 = side < 0 ? 10 : 32; y0 < h + 50; y0 += gap) {
      let d = 1;
      const isSlot = side < 0 && y0 === SLOT_Y;
      while (d < ins - 2) {
        const pick = r();
        if (isSlot && d > 12 && d < 30) { d += 1; continue; }
        if (pick < 0.07) { // a candle
          const cx = X(d + 4); candle(ctx, cx, y0, 1, t, d + y0); wzCandles.push([cx, y0 - 14]); d += 9; continue;
        }
        if (pick < 0.15) { // a potion
          const c = [[255, 110, 170], [110, 240, 140], [100, 220, 255], [255, 190, 80]][(r() * 4) | 0]; flask(ctx, X(d + 5), y0, 0.9, c, t, d, r() < 0.4); d += 11; continue;
        }
        const bw = 3.2 + r() * 3.6, bh = 20 + r() * 17, c = SPINES[(r() * SPINES.length) | 0], lean = r() < 0.12 ? (side < 0 ? 0.18 : -0.18) : 0;
        const x = side < 0 ? d : w - d - bw;
        ctx.save(); ctx.translate(x + bw / 2, y0); ctx.rotate(lean);
        ctx.fillStyle = K.lg(ctx, -bw / 2, 0, bw / 2, 0, [K.lift(c, 40), c, K.lift(c, -50)]); ctx.fillRect(-bw / 2, -bh, bw, bh);
        ctx.fillStyle = 'rgba(255,214,120,.75)'; ctx.fillRect(-bw / 2, -bh + 3, bw, 0.9); ctx.fillRect(-bw / 2, -5, bw, 0.9);
        if (bw > 5) { ctx.fillStyle = 'rgba(255,224,150,.55)'; ctx.fillRect(-0.6, -bh * 0.62, 1.2, bh * 0.25); }
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-bw / 2 + 0.4, -bh, 0.8, bh);
        ctx.restore();
        d += bw + (lean ? 2 : 0.2) + (r() < 0.08 ? 4 : 0);
      }
      // the shelf plank
      ctx.fillStyle = K.lg(ctx, 0, y0, 0, y0 + 6, [WOOD[0], WOOD[1], WOOD[2]]); ctx.fillRect(side < 0 ? 0 : w - ins, y0, ins, 6);
      ctx.fillStyle = 'rgba(255,220,170,.4)'; ctx.fillRect(side < 0 ? 0 : w - ins, y0, ins, 0.9);
      ctx.fillStyle = 'rgba(20,8,8,.35)'; ctx.fillRect(side < 0 ? 0 : w - ins, y0 + 6, ins, 3);
    }
    // the carved upright at the case's front edge
    ctx.lineJoin = 'round';
    for (const [lw, c, off] of [[7, WOOD[2], 0], [5, WOOD[1], 0], [1.2, 'rgba(255,214,160,.6)', -1.5]]) {
      ctx.strokeStyle = typeof c === 'string' ? c : rgb(c); ctx.lineWidth = lw; ctx.beginPath();
      for (let y = -2; y <= h + 2; y += 6) { const x = edge(y) - side * (3.5 + off * side * side); y < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }

  // the snapping spellbook, side view: two covers hinged at the spine like jaws, pages with teeth, a ribbon tongue
  function bookJaw(ctx, up, c) {
    const sg = up ? -1 : 1;
    // page block
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, sg * 6, ['#fff8e6', '#ecdcb8', '#cbb48a']);
    ctx.beginPath(); ctx.rect(0, sg * 0.4, 27, sg * 5.6); ctx.fill();
    ctx.strokeStyle = 'rgba(150,120,80,.55)'; ctx.lineWidth = 0.5; ctx.beginPath(); for (const yy of [2, 3.5, 5]) { ctx.moveTo(2, sg * yy); ctx.lineTo(26, sg * yy); } ctx.stroke();
    // teeth along the page edge
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath(); for (let x = 8; x <= 25; x += 4.4) { ctx.moveTo(x - 1.9, sg * 0.4); ctx.lineTo(x, -sg * 3.4); ctx.lineTo(x + 1.9, sg * 0.4); } ctx.fill();
    ctx.strokeStyle = 'rgba(160,130,100,.7)'; ctx.lineWidth = 0.5; ctx.stroke();
    // the cover
    ctx.fillStyle = K.lg(ctx, 0, sg * 6, 0, sg * 11, up ? [K.lift(c, 60), c, K.lift(c, -40)] : [c, K.lift(c, -30), K.lift(c, -70)]);
    ctx.beginPath(); ctx.roundRect(-2, up ? -11 : 6, 32, 5, 1.6); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c, -80)); ctx.lineWidth = 0.8; ctx.stroke();
    if (up) { ctx.strokeStyle = 'rgba(255,220,220,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -10.2); ctx.lineTo(27, -10.2); ctx.stroke(); }
    // gold corner cap
    ctx.fillStyle = K.lg(ctx, 26, 0, 31, 0, ['#ffe9a0', '#c88e2a']); ctx.beginPath(); ctx.moveTo(25, up ? -11 : 11); ctx.lineTo(30, up ? -11 : 11); ctx.lineTo(30, up ? -6 : 6); ctx.closePath(); ctx.fill();
  }
  function drawBook(ctx, x, y, s, t, open, rot, angry) {
    const c = [168, 44, 70];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-12, 0);
    const a = open * 0.6;
    // mouth interior and the ribbon tongue
    ctx.fillStyle = '#5a1a2e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-a) * 28, Math.sin(-a) * 28); ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff5a6e'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(2, 0); ctx.bezierCurveTo(14, 2 + open * 3, 22, -3 + Math.sin(t * 12) * 3, 32 + open * 4, 2 + Math.sin(t * 9) * 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,210,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4, -0.6); ctx.bezierCurveTo(14, 1 + open * 3, 22, -4 + Math.sin(t * 12) * 3, 30 + open * 4, 1 + Math.sin(t * 9) * 4); ctx.stroke();
    ctx.save(); ctx.rotate(a); bookJaw(ctx, false, c); ctx.restore();
    ctx.save(); ctx.rotate(-a); bookJaw(ctx, true, c);
    // the cover emblem and the eyes riding on top of the upper cover
    ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(19, -8.5, 1.4, 0, TAU); ctx.fill();
    K.eyes(ctx, 9, -15, 4.2, 3.4, '#ffcf3a', 0.6, angry);
    ctx.restore();
    // the spine: a rounded cap with gold bands
    ctx.fillStyle = K.lg(ctx, -6, 0, 2, 0, [K.lift(c, -40), c, K.lift(c, 30)]);
    ctx.beginPath(); ctx.ellipse(-1, 0, 4.5, 11.5 + open * 3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c, -80)); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 1; ctx.beginPath(); for (const yy of [-6, 6]) { ctx.moveTo(-5, yy); ctx.lineTo(3, yy); } ctx.stroke();
    ctx.restore();
  }
  // the spellbook's loop: rattles in its slot, slides out, flaps across chomping, flies home
  function spellbook(ctx, S, w, h, t) {
    const u = ph(t, 4, 0.2), sx = S.L(SLOT_Y - 14) - 22, sy = SLOT_Y - 14;
    if (u < 1.5 || u > 3.55) {
      const out = u < 1.5 ? ease((u - 0.95) / 0.5) * 12 : (1 - ease((u - 3.55) / 0.35)) * 12;
      const shake = u < 1.5 ? smooth(0.6, 1.0, u) * Math.sin(t * 50) * 0.8 : 0;
      // standing in the shelf: the spine, peeking eyes
      ctx.save(); ctx.translate(sx + out + shake, sy); ctx.rotate(out * 0.02);
      ctx.fillStyle = K.lg(ctx, -5, 0, 5, 0, ['#e06a8a', '#a82c46', '#5e1428']); ctx.beginPath(); ctx.roundRect(-5.5, -15, 11, 30, 2); ctx.fill();
      ctx.strokeStyle = '#4a0e20'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#ffd36a'; ctx.fillRect(-5.5, -11, 11, 1.2); ctx.fillRect(-5.5, 9, 11, 1.2);
      const peek = smooth(0.4, 0.9, u < 1.5 ? u : 0);
      if (peek > 0.05) { ctx.save(); ctx.scale(1, peek); K.eyes(ctx, 0, -3, 2.8, 2.2, '#ffcf3a', 0.8, 0.6); ctx.restore(); }
      ctx.restore();
      return [sx, sy, 0];
    }
    // flight: a loop out across the shaft and back
    const v = (u - 1.5) / 2.05, tx = w * 0.66, ty = sy + 22;
    const x = lerp(sx, tx, Math.sin(v * PI)) + Math.sin(v * TAU) * 14, y = sy + Math.sin(v * PI) * (ty - sy) - Math.sin(v * TAU * 2) * 10 + 8 * Math.sin(v * PI);
    const dir = Math.cos(v * PI) >= 0 ? 1 : -1, open = Math.abs(Math.sin(t * 11)) * (0.4 + 0.6 * Math.sin(v * PI));
    K.danger(ctx, x, y, 34, 0.3);
    // loose pages fluttering in its wake
    for (let k = 1; k <= 3; k++) {
      const vv = Math.max(0, v - k * 0.07), px = lerp(sx, tx, Math.sin(vv * PI)) + Math.sin(vv * TAU) * 14, py = sy + Math.sin(vv * PI) * (ty - sy) + k * 6;
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(t * 6 + k) * 0.8); ctx.globalAlpha = 0.85 - k * 0.2;
      ctx.fillStyle = K.lg(ctx, -4, 0, 4, 0, ['#fffaf0', '#e2d0aa']); ctx.fillRect(-3.5, -2.5, 7, 5);
      ctx.strokeStyle = 'rgba(140,110,70,.6)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-2.5, -1); ctx.lineTo(2.5, -1); ctx.moveTo(-2.5, 0.6); ctx.lineTo(2, 0.6); ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); drawBook(ctx, 0, 0, 1.45, t, open, 0.12 * Math.sin(t * 11), 1); ctx.restore();
    return [x, y, 1];
  }

  // the cauldron on its stone corbel, green brew, blue magic fire under it
  function drawCauldron(ctx, x, y, s, t, boil) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // fire
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    K.glow(ctx, 0, 16, 26, [110, 200, 255], 0.5 + boil * 0.2);
    for (let k = -2; k <= 2; k++) {
      const fh = 9 + Math.sin(t * 11 + k * 2) * 2.5 + boil * 4, fx = k * 4;
      ctx.fillStyle = K.lg(ctx, 0, 21, 0, 21 - fh, ['rgba(220,250,255,.95)', 'rgba(110,200,255,.8)', 'rgba(80,120,255,0)']);
      ctx.beginPath(); ctx.moveTo(fx - 3, 21); ctx.quadraticCurveTo(fx - 3, 17, fx + Math.sin(t * 8 + k) * 1.5, 21 - fh); ctx.quadraticCurveTo(fx + 3, 17, fx + 3, 21); ctx.fill();
    }
    ctx.restore();
    // logs
    for (const [a, c] of [[0.2, WOOD[1]], [-0.2, WOOD[2]]]) { ctx.save(); ctx.translate(0, 22); ctx.rotate(a); ctx.fillStyle = K.lg(ctx, 0, -2, 0, 2, [WOOD[0], c]); ctx.beginPath(); ctx.roundRect(-12, -2, 24, 4, 2); ctx.fill(); ctx.restore(); }
    // legs
    ctx.fillStyle = '#4c4a6e'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 10, 10); ctx.lineTo(d * 13, 19); ctx.lineTo(d * 9, 19); ctx.closePath(); ctx.fill(); }
    // the pot: plump iron with a glossy rim light
    const pot = () => { ctx.beginPath(); ctx.moveTo(-17, -7); ctx.bezierCurveTo(-22, 4, -16, 15, 0, 15); ctx.bezierCurveTo(16, 15, 22, 4, 17, -7); ctx.closePath(); };
    pot(); ctx.fillStyle = rg2(ctx, -7, -4, 2, 0, 2, 24, [[0, [140, 140, 190]], [0.45, [82, 80, 120]], [1, [44, 42, 72]]]); ctx.fill();
    ctx.strokeStyle = '#2e2c4c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); pot(); ctx.clip();
    ctx.strokeStyle = 'rgba(150,240,110,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 3, 17, 11, 0, 0.3, 2.8); ctx.stroke();
    ctx.restore();
    K.sheen(ctx, -4, 1, 15, 0.5, 3.3, 4.3);
    // a rune band round the belly
    ctx.strokeStyle = 'rgba(94,240,255,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let k = -3; k <= 3; k++) { const bx = k * 4.4; ctx.moveTo(bx - 1, 4); ctx.lineTo(bx + 1, 2); ctx.lineTo(bx + 1, 6); } ctx.stroke();
    // the brew surface, bulging with the boil, froth over the lip
    const bulge = boil * 4 + Math.sin(t * 7) * 0.8;
    ctx.fillStyle = K.rg(ctx, -4, -9, 18, [BREW[0], BREW[1], BREW[2]]);
    ctx.beginPath(); ctx.moveTo(-17, -7); ctx.quadraticCurveTo(0, -12 - bulge, 17, -7); ctx.quadraticCurveTo(0, -3, -17, -7); ctx.fill();
    for (let k = 0; k < 4 + boil * 4; k++) {
      const bx = Math.sin(k * 2.3) * 11, bp = ph(t * (1.2 + boil) + k * 0.37, 1), br = 1.2 + bp * (1.5 + boil * 1.5);
      ctx.fillStyle = rgb(BREW[0], 0.9 * (1 - bp)); ctx.beginPath(); ctx.arc(bx, -8 - bulge * 0.6 - bp * 2, br, 0, TAU); ctx.fill();
    }
    if (boil > 0.3) {
      ctx.fillStyle = rgb(BREW[1]); for (const [dx, len] of [[-13, 8], [9, 11]]) { const L = len * (boil - 0.3); ctx.beginPath(); ctx.ellipse(dx, -6 + L / 2, 2.2, L / 2 + 1.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(BREW[0]); ctx.beginPath(); ctx.arc(dx - 0.6, -6, 0.8, 0, TAU); ctx.fill(); ctx.fillStyle = rgb(BREW[1]); }
    }
    // the lip
    ctx.fillStyle = K.lg(ctx, 0, -10, 0, -4, ['#a8a8d8', '#5a5888']); ctx.beginPath(); ctx.ellipse(0, -7, 19, 3.6, 0, 0, PI); ctx.lineTo(-19, -7); ctx.ellipse(0, -7, 19, 3.6, 0, PI, PI * 2); ctx.closePath(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#6a68a0'; ctx.stroke();
    ctx.strokeStyle = 'rgba(230,230,255,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, -7.6, 19, 3.6, 0, PI * 1.1, PI * 1.6); ctx.stroke();
    ctx.restore();
  }
  // a brew bubble drifting up: glossy, then popping into star sparks
  function brewBubble(ctx, x, y, r, pop, t) {
    if (pop <= 0) {
      K.danger(ctx, x, y, r * 2.4, 0.22);
      ctx.fillStyle = rg2(ctx, x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r, [[0, [240, 255, 210], 0.55], [0.6, BREW[1], 0.45], [1, BREW[2], 0.85]]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(K.lift(BREW[2], -20), 0.9); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.14, -0.7, 0, TAU); ctx.fill();
      K.sheen(ctx, x, y, r, 0.5);
      ctx.strokeStyle = 'rgba(255,140,220,.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0.2, 1.3); ctx.stroke();
      return;
    }
    // pop: a ring and a burst of sparks
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgb(BREW[0], 0.8 * (1 - pop)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * (1 + pop * 1.4), 0, TAU); ctx.stroke();
    ctx.restore();
    for (let k = 0; k < 7; k++) { const a = k * TAU / 7 + 0.4, d = r * (0.8 + pop * 2.6); star4(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 3.2 * (1 - pop), k % 2 ? [255, 220, 120] : [170, 255, 140], 1 - pop); }
    K.danger(ctx, x, y, r * 3, 0.25 * (1 - pop));
  }

  // a rune portal on the wall: carved ring, rotating rune bands, a cyan whirlpool; k = flare 0..1
  function drawPortal(ctx, x, y, side, t, k) {
    const rx = 15, ry = 32, spin = t * (1 + k * 3) * side;
    K.glow(ctx, x, y, 56 + k * 18, CYAN, 0.32 + 0.3 * k);
    ctx.save(); ctx.translate(x, y);
    // the vortex
    ctx.fillStyle = K.rg(ctx, 0, 0, ry, [[0, '#f0ffff'], [0.25, rgb(CYAN)], [0.7, '#1f5fa8'], [1, '#18306a']]);
    ctx.save(); ctx.scale(rx / ry, 1); ctx.beginPath(); ctx.arc(0, 0, ry, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let j = 0; j < 4; j++) {
      ctx.strokeStyle = rgb([170, 250, 255], 0.5); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const v = i / 14, a = spin * 2 + j * PI / 2 + v * 3.2, rr = ry * (0.95 - v * 0.85); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.stroke();
    }
    ctx.restore();
    // carved stone frame
    ctx.lineWidth = 4.2; ctx.strokeStyle = '#5a5a86'; ctx.beginPath(); ctx.ellipse(0, 0, rx + 2.5, ry + 2.5, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(220,225,255,.6)'; ctx.beginPath(); ctx.ellipse(0, 0, rx + 3.6, ry + 3.6, 0, 3.3, 4.6); ctx.stroke();
    // rotating runes round the frame
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgb([190, 252, 255], 0.75 + 0.25 * k); ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const a = spin * 0.6 + i * TAU / 10, px = Math.cos(a) * (rx + 2.5), py = Math.sin(a) * (ry + 2.5), g = i % 4;
      ctx.beginPath();
      if (g === 0) { ctx.moveTo(px - 1.6, py - 1.6); ctx.lineTo(px + 1.6, py + 1.6); ctx.moveTo(px + 1.6, py - 1.6); ctx.lineTo(px - 1.6, py + 1.6); }
      else if (g === 1) { ctx.arc(px, py, 1.5, 0, TAU); }
      else if (g === 2) { ctx.moveTo(px, py - 2); ctx.lineTo(px + 1.7, py + 1.3); ctx.lineTo(px - 1.7, py + 1.3); ctx.closePath(); }
      else { ctx.moveTo(px, py - 2); ctx.lineTo(px, py + 2); ctx.moveTo(px - 1.5, py - 0.6); ctx.lineTo(px + 1.5, py - 0.6); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function owl(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const blink = ph(t, 4, 0.3) < 0.18 ? 0.15 : 1, bob = Math.sin(t * 1.4) * 0.5;
    ctx.translate(0, bob);
    // ear tufts
    ctx.fillStyle = '#7a5a8a'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 4, -15); ctx.quadraticCurveTo(d * 9, -22, d * 10, -21); ctx.quadraticCurveTo(d * 9, -15, d * 8, -12); ctx.fill(); }
    const body = () => { ctx.beginPath(); ctx.ellipse(0, -7, 9.5, 11, 0, 0, TAU); };
    body(); ctx.fillStyle = rg2(ctx, -3, -12, 1, 0, -7, 13, [[0, [196, 160, 200]], [0.5, [138, 104, 150]], [1, [80, 58, 96]]]); ctx.fill();
    ctx.strokeStyle = '#4c345c'; ctx.lineWidth = 0.9; ctx.stroke();
    // belly feathers
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 4, ['#f4e2d0', '#c8aa98']); ctx.beginPath(); ctx.ellipse(0, -2, 5.6, 6.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,100,90,.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); for (const [fx, fy] of [[-2.5, -4], [1.5, -4], [-0.5, -1], [-3, 1.5], [2, 1.5], [0, 3.6]]) { ctx.moveTo(fx - 1.4, fy); ctx.quadraticCurveTo(fx, fy + 1.4, fx + 1.4, fy); } ctx.stroke();
    // wings folded
    for (const d of [-1, 1]) { ctx.fillStyle = K.lg(ctx, d * 9, -10, d * 6, 2, ['#9a7aaa', '#5c4270']); ctx.beginPath(); ctx.moveTo(d * 8, -11); ctx.quadraticCurveTo(d * 12, -3, d * 6, 3); ctx.quadraticCurveTo(d * 7, -5, d * 8, -11); ctx.fill(); }
    // face disc and big eyes
    ctx.fillStyle = 'rgba(240,220,230,.5)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 3.6, -11, 4.2, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(0, -11); ctx.scale(1, blink); K.eyes(ctx, 0, 0, 3.6, 2.9, '#ffb42a', Math.sin(t * 0.6) * 0.8); ctx.restore();
    ctx.fillStyle = '#e8a040'; ctx.beginPath(); ctx.moveTo(-1.3, -8.4); ctx.lineTo(1.3, -8.4); ctx.lineTo(0, -5.6); ctx.fill();
    K.sheen(ctx, 0, -8, 10, 0.35, 3.6, 4.6);
    ctx.fillStyle = '#e8a040'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 3, 4, 2, 1.1, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  PV.sections['wizard'] = (ctx, w, h, t) => {
    wzCandles = [];
    const S = K.shaft(ctx, w, h, t, { ...WZ, farShape: wizFar, wallDeco: wizWall });
    // warm candle pools on the shelves
    for (const [cx, cy] of wzCandles) { K.glow(ctx, cx, cy, 30, [255, 180, 80], 0.32); K.glow(ctx, cx, cy, 6, [255, 230, 160], 0.6); }
    // warm candle spill off both bookcases (cosy pools on the stone)
    for (const [gx, gy] of [[0, h * 0.2], [w, h * 0.42], [0, h * 0.66], [w, h * 0.9]]) K.glow(ctx, gx, gy, 130, [255, 170, 80], 0.13);
    // floating candles in the middle distance
    const fc = [[0.3, 0.24], [0.72, 0.36], [0.24, 0.56], [0.62, 0.72], [0.4, 0.9]];
    for (const [i, [fx, fy]] of fc.entries()) {
      const x = w * fx + Math.sin(t * 0.7 + i) * 3, y = h * fy + Math.sin(t * 1.1 + i * 2) * 4;
      K.glow(ctx, x, y - 14, 34, [255, 190, 90], 0.34); candle(ctx, x, y, 1.25, t, i * 3); K.glow(ctx, x, y - 16, 7, [255, 236, 170], 0.7);
    }
    // the rune portals and the magic link between them
    const pu = ph(t, 4, 0.6), flare = bump(pu, 1.1, 1.6, 2.6, 3.3);
    const ay = h * 0.75, by = h * 0.35, ax = S.L(ay) + 4, bx = S.R(by) - 4;
    ctx.save(); ctx.setLineDash([2, 5]); ctx.strokeStyle = rgb(CYAN, 0.18 + flare * 0.25); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(w * 0.1, h * 0.5, w * 0.95, h * 0.55, bx, by); ctx.stroke(); ctx.restore();
    // a spark travels the link while the portals fire
    const tv = smooth(1.85, 2.35, pu);
    if (tv > 0 && tv < 1) { const q = 1 - tv, x = q * q * q * ax + 3 * q * q * tv * w * 0.1 + 3 * q * tv * tv * w * 0.95 + tv * tv * tv * bx, y = q * q * q * ay + 3 * q * q * tv * h * 0.5 + 3 * q * tv * tv * h * 0.55 + tv * tv * tv * by; star4(ctx, x, y, 5, CYAN, 1); K.glow(ctx, x, y, 22, CYAN, 0.5); }
    drawPortal(ctx, ax, ay, -1, t, flare); drawPortal(ctx, bx, by, 1, t, flare);
    // a wisp flies into the low portal and pops out of its twin
    if (pu < 1.9) { const v = smooth(0.6, 1.9, pu), x = lerp(w * 0.55, ax + 4, v), y = lerp(ay - 10, ay, v); star4(ctx, x, y, 4 * (1 - v * 0.6), [200, 255, 255], 1); K.glow(ctx, x, y, 16, CYAN, 0.4); }
    if (pu > 2.3 && pu < 3.4) { const v = smooth(2.3, 3.4, pu), x = lerp(bx - 4, w * 0.45, v), y = by - v * 18; star4(ctx, x, y, 4 * (0.6 + v * 0.4), [200, 255, 255], 1 - smooth(3.0, 3.4, pu)); K.glow(ctx, x, y, 16, CYAN, 0.4 * (1 - v)); }
    if (pu > 2.3 && pu < 2.8) { const v = (pu - 2.3) / 0.5; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgb(CYAN, 1 - v); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bx, by, 15 + v * 16, 32 + v * 16, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    // coins
    coin(ctx, w * 0.5, h * 0.2, 0.68, t, 0.4); coin(ctx, w * 0.44, h * 0.46, 0.68, t, 2.2); coin(ctx, w * 0.6, h * 0.62, 0.68, t, 3.9);
    // the cauldron on a corbel from the right wall
    const cy = h * 0.55, cxw = S.R(cy), cx = cxw - 26;
    ctx.fillStyle = K.lg(ctx, 0, cy + 18, 0, cy + 36, ['#8a8ab8', '#4a4a72']);
    ctx.beginPath(); ctx.moveTo(cxw + 6, cy + 20); ctx.lineTo(cx - 28, cy + 20); ctx.quadraticCurveTo(cx - 31, cy + 24, cx - 27, cy + 27); ctx.lineTo(cx + 6, cy + 27); ctx.bezierCurveTo(cx + 10, cy + 40, cxw - 4, cy + 34, cxw + 6, cy + 54); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#38385e'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(230,230,255,.55)'; ctx.beginPath(); ctx.moveTo(cxw, cy + 20.6); ctx.lineTo(cx - 27, cy + 20.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,40,80,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx + 14, cy + 36, 4, PI * 0.8, PI * 2.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,240,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(cx + 13.4, cy + 35.4, 4, PI * 1.0, PI * 1.6); ctx.stroke();
    const cu = ph(t, 4, 0), boil = bump(cu, 0.9, 1.5, 2.0, 2.6);
    drawCauldron(ctx, cx, cy - 4, 1.3, t, boil);
    // three bubbles launched each loop, drifting up and out over the shaft, then popping
    for (const [L, dx, o] of [[1.5, -46, 0], [1.75, -78, 1], [2.0, -20, 2]]) {
      const age = ph(t - L, 4), life = 2.3;
      if (age > life + 0.4) continue;
      const v = Math.min(1, age / life), bxp = cx + dx * ease(v) + Math.sin(age * 4 + o) * 4, byp = cy - 18 - v * (96 + o * 14), r = 5 + v * 7;
      brewBubble(ctx, bxp, byp, r, age > life ? (age - life) / 0.4 : 0, t);
    }
    // the wizard's owl, dozing on the low shelf
    owl(ctx, S.R(h * 0.9) - 6, h * 0.9 - 1, 1, t);
    // the spellbook
    spellbook(ctx, S, w, h, t);
    const rd = Math.sin(TAU * t / 4) * 4;
    K.rocket(ctx, w * 0.5 + rd, h * 0.82, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 214, 140], 14, 5);
    K.motes(ctx, w, h, t, 'spore', [140, 240, 255], 4, 9);
  };
  // =====================================================================================
  // STARFALL SUMMIT: open space past the volcano; asteroid walls, a ringed planet, bright stars
  // =====================================================================================
  const ROCK = [[160, 166, 206], [84, 88, 138], [36, 38, 80]], ROCK_EDGE = '#262858';
  const ROCK_TINTS = [[0, 0, 0], [14, -6, -18], [-10, 4, 14], [10, -4, 6]];
  const STARC = [124, 240, 255], GOLD = [255, 213, 106];
  function rockShape(seed, r) {
    const R = K.rand(seed), n = 10, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (0.78 + R() * 0.3); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86]); }
    return pts;
  }
  function crystal(ctx, x, y, ang, len, wd, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const tip = [len, 0], a = [0, -wd], b = [0, wd], m = [len * 0.72, -wd * 0.8], n = [len * 0.72, wd * 0.8];
    ctx.fillStyle = rgb(K.lift(c, -50)); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...m); ctx.lineTo(...tip); ctx.lineTo(...n); ctx.lineTo(...b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, -wd, 0, wd, [K.lift(c, 90), c, K.lift(c, -30)]); ctx.beginPath(); ctx.moveTo(0, -wd * 0.2); ctx.lineTo(m[0], m[1] * 0.4); ctx.lineTo(...tip); ctx.lineTo(n[0], n[1] * 0.3); ctx.lineTo(0, wd * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(len * 0.1, -wd * 0.55); ctx.lineTo(m[0], m[1] * 0.75); ctx.lineTo(len * 0.9, -wd * 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c, -90), 0.9); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...m); ctx.lineTo(...tip); ctx.lineTo(...n); ctx.lineTo(...b); ctx.stroke();
    ctx.restore();
  }
  // one asteroid: lit from the top-left, starlight rim on the shaft side, craters, dust, maybe crystals
  function asteroid(ctx, x, y, r, seed, rot, side, t, crys) {
    const pts = rockShape(seed, r), R = K.rand(seed * 7 + 1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const tn = ROCK_TINTS[seed % 4], tc = c => c.map((v, i) => clamp(v + tn[i], 0, 255));
    blob(ctx, pts); ctx.fillStyle = rg2(ctx, -r * 0.45, -r * 0.5, r * 0.05, -r * 0.1, -r * 0.1, r * 1.15, [[0, tc(ROCK[0])], [0.4, tc(ROCK[1])], [1, tc(ROCK[2])]]); ctx.fill();
    ctx.save(); blob(ctx, pts); ctx.clip();
    // craters: a shaded bowl with a lit far lip (line pair)
    for (let i = 0; i < 3 + (r > 24 ? 2 : 0); i++) {
      const a = R() * TAU, d = R() * r * 0.6, cx = Math.cos(a) * d, cy = Math.sin(a) * d * 0.8, cr = r * (0.1 + R() * 0.14);
      ctx.fillStyle = rgb(ROCK[2], 0.55); ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(ROCK[0], 0.7); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.8, 0, 0.1, 2.0); ctx.stroke();
      ctx.strokeStyle = rgb([30, 30, 70], 0.5); ctx.beginPath(); ctx.ellipse(cx, cy, cr * 0.95, cr * 0.75, 0, 3.4, 5.0); ctx.stroke();
    }
    // the starlight rim on the side facing the shaft (rock rotation undone)
    const fa = (side < 0 ? 0 : PI) - rot;
    ctx.strokeStyle = rgb(STARC, 0.85); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-Math.cos(fa) * 1.5, -Math.sin(fa) * 1.5, r * 0.98, fa - 0.9, fa + 0.9); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgb(STARC, 0.25); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, fa - 0.8, fa + 0.8); ctx.stroke(); ctx.restore();
    // warm planet light from below
    ctx.strokeStyle = rgb(GOLD, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -1.5, r * 0.98, 1.2 - rot, 2.2 - rot); ctx.stroke();
    // moon dust specks
    for (let i = 0; i < 6; i++) { const a = R() * TAU, d = R() * r * 0.7; ctx.fillStyle = `rgba(230,236,255,${0.3 + 0.4 * R()})`; ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d * 0.8, 1, 1); }
    ctx.restore();
    blob(ctx, pts); ctx.strokeStyle = ROCK_EDGE; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.strokeStyle = 'rgba(240,244,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 3.5, 4.6); ctx.stroke();
    ctx.restore();
    if (crys) {
      const c = crys === 1 ? STARC : [196, 140, 255], base = side < 0 ? 0 : PI;
      const cx = x + Math.cos(base - 0.5) * r * 0.75, cy = y + Math.sin(base - 0.5) * r * 0.75;
      K.glow(ctx, cx, cy, r * 1.1, c, 0.3 + 0.1 * Math.sin(t * 2 + seed));
      crystal(ctx, cx - side * 2, cy + 2, base - 0.95, r * 0.55, 3.4, c);
      crystal(ctx, cx, cy, base - 0.45, r * 0.8, 4.6, c);
      crystal(ctx, cx + side * 1, cy + 4, base + 0.1, r * 0.5, 3.2, c);
      const tw = Math.max(0, Math.sin(t * 2.2 + seed)); star4(ctx, cx + Math.cos(base - 0.45) * r * 0.7, cy + Math.sin(base - 0.45) * r * 0.7, 4 * tw, [220, 250, 255], tw);
    }
  }
  function starWall(ctx, side, w, h, t, inset) {
    const R = K.rand(side < 0 ? 401 : 509);
    let y = -24, i = 0;
    while (y < h + 40) {
      const r = 20 + R() * 15, jit = (R() - 0.5) * 8, bob = Math.sin(t * 0.9 + i * 1.7 + side) * 2.2;
      const x = side < 0 ? inset - r * 0.72 + jit : w - inset + r * 0.72 + jit;
      // a back rock behind, deeper in shade, to close the gaps
      asteroid(ctx, side < 0 ? x - r * 0.6 : x + r * 0.6, y + r * 0.7 + bob * 0.5, r * 0.9, i * 13 + (side < 0 ? 3 : 5), 0.4, side, t, 0);
      ctx.fillStyle = 'rgba(14,16,50,.35)'; ctx.beginPath(); ctx.arc(side < 0 ? x - r * 0.6 : x + r * 0.6, y + r * 0.7 + bob * 0.5, r * 0.85, 0, TAU); ctx.fill();
      const cr = R(), crys = cr < 0.22 ? 1 : cr < 0.36 ? 2 : 0;
      asteroid(ctx, x, y + bob, r, i * 31 + (side < 0 ? 7 : 11), Math.sin(t * 0.25 + i) * 0.08, side, t, crys);
      y += r * 1.25 + R() * 8; i++;
    }
  }
  function spaceBg(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#10164a', '#1b2268', '#2a2c86', '#3a2e86']); ctx.fillRect(0, 0, w, h);
    // nebula clouds: teal and rose
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, c, a] of [[w * 0.8, h * 0.22, 120, [60, 170, 220], 0.16], [w * 0.15, h * 0.12, 90, [220, 90, 190], 0.1], [w * 0.65, h * 0.5, 100, [200, 100, 220], 0.09], [w * 0.3, h * 0.84, 130, [70, 150, 230], 0.12]]) {
      ctx.fillStyle = K.rg(ctx, x, y, r, [rgb(c, a), rgb(c, a * 0.4), rgb(c, 0)]); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // the milky band
    ctx.save(); ctx.translate(w * 0.5, h * 0.4); ctx.rotate(-0.55);
    ctx.fillStyle = K.lg(ctx, 0, -40, 0, 40, ['rgba(150,170,255,0)', 'rgba(170,190,255,.12)', 'rgba(150,170,255,0)']); ctx.fillRect(-400, -40, 800, 80);
    ctx.restore();
    ctx.restore();
    const R = K.rand(77);
    for (let i = 0; i < 110; i++) {
      let x = R() * w, y = R() * h; const band = i < 40; if (band) { const u = R() * 2 - 1, off = (R() - 0.5) * 50; x = w * 0.5 + Math.cos(-0.55) * u * 300 - Math.sin(-0.55) * off; y = h * 0.4 + Math.sin(-0.55) * u * 300 + Math.cos(-0.55) * off; }
      const tw = 0.55 + 0.45 * Math.sin(t * (1 + R() * 3) + i), sz = R() < 0.1 ? 1.4 : 0.7;
      ctx.fillStyle = `rgba(${220 + R() * 35 | 0},${225 + R() * 30 | 0},255,${0.35 + 0.6 * tw})`; ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
    }
    for (const [x, y, o] of [[w * 0.42, h * 0.07, 0], [w * 0.88, h * 0.38, 2], [w * 0.12, h * 0.46, 4], [w * 0.6, h * 0.95, 1]]) { const tw = 0.5 + 0.5 * Math.sin(t * 1.7 + o); star4(ctx, x, y, 3 + tw * 2, [220, 235, 255], 0.5 + 0.5 * tw); }
  }
  function ringedPlanet(ctx, x, y, r, t) {
    const tilt = -0.32, RX = r * 1.95, RY = r * 0.44;
    K.glow(ctx, x, y, r * 2.3, [255, 180, 120], 0.18);
    // rings: several bands with a dark gap, lit on the sun side, fading into the planet's shadow
    const ring = (from, to, front) => {
      for (const [k, c, a, lw] of [[1.16, [214, 170, 120], 0.45, 2], [1.04, [255, 230, 160], 0.9, 4.5], [0.93, [240, 190, 110], 0.85, 3.5], [0.85, [120, 80, 90], 0.5, 1.4], [0.79, [255, 214, 150], 0.6, 2.6], [0.71, [255, 236, 200], 0.3, 1.6]]) {
        ctx.strokeStyle = K.lg(ctx, x - RX, y, x + RX, y, [rgb(K.lift(c, 20), a), rgb(c, a), rgb(K.lift(c, -70), a * (front ? 0.8 : 0.5))]);
        ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, RX * k, RY * k, tilt, from, to); ctx.stroke();
      }
    };
    ring(PI, TAU, false);   // behind
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.fillStyle = K.lg(ctx, x, y - r, x, y + r, ['#ffe6b0', '#f2a870']); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // wavy bands of gold, coral, cream and rust
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    const bands = [[-0.85, 0.16, [255, 244, 214]], [-0.6, 0.14, [232, 136, 96]], [-0.38, 0.1, [255, 214, 150]], [-0.18, 0.16, [196, 92, 78]], [0.06, 0.12, [255, 228, 180]], [0.26, 0.18, [222, 120, 88]], [0.5, 0.1, [255, 200, 140]], [0.7, 0.16, [176, 84, 84]]];
    for (const [i, [by, bh, c]] of bands.entries()) {
      ctx.fillStyle = rgb(c, 0.85); ctx.beginPath(); ctx.moveTo(-r * 1.2, by * r);
      for (let k = 0; k <= 12; k++) { const xx = -r * 1.2 + k * r * 0.2; ctx.lineTo(xx, by * r + Math.sin(k * 1.3 + i * 2 + t * 0.4) * r * 0.02); }
      for (let k = 12; k >= 0; k--) { const xx = -r * 1.2 + k * r * 0.2; ctx.lineTo(xx, (by + bh) * r + Math.sin(k * 1.1 + i * 3 + t * 0.4) * r * 0.025); }
      ctx.closePath(); ctx.fill();
    }
    // a big storm eye with a swirl
    ctx.fillStyle = K.rg(ctx, r * 0.28, r * 0.33, r * 0.2, ['#fff0d0', '#e07a5a', '#a84a4a']); ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.34, r * 0.2, r * 0.1, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,200,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.34, r * 0.12, r * 0.05, 0, 0.5, 4.5); ctx.stroke();
    ctx.restore();
    // the ring's shadow across the face
    ctx.strokeStyle = 'rgba(80,30,70,.35)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x + 3, y + 6, RX * 0.9, RY * 0.9, tilt, 0.15, PI - 0.15); ctx.stroke();
    // soft terminator: night side to the lower right, with a cool bounce rim
    ctx.fillStyle = rg2(ctx, x - r * 0.55, y - r * 0.6, r * 0.5, x - r * 0.2, y - r * 0.2, r * 1.65, [[0, 'rgba(30,20,80,0)'], [0.55, 'rgba(30,20,80,.15)'], [0.8, 'rgba(30,20,80,.6)'], [1, 'rgba(30,20,80,.85)']]); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.strokeStyle = 'rgba(140,200,255,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r - 1, 0.1, 1.4); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,244,220,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r - 1, 3.4, 4.8); ctx.stroke();
    ring(0, PI, true);     // in front
    // a little moon
    const mx = x + Math.cos(t * 0.3) * RX * 1.25, my = y + Math.sin(t * 0.3) * RY * 1.25 - 6;
    ctx.fillStyle = K.rg(ctx, mx - 2, my - 2, 6, ['#f4f0ff', '#a8a4cc', '#5a5888']); ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, TAU); ctx.fill();
  }
  // the volcano's summit far below, glowing, with a cloud sea
  function summitBelow(ctx, w, h, t) {
    // far below: the island volcano's cone poking through a sea of cloud, its crater glowing, a lazy smoke plume
    K.glow(ctx, w * 0.5, h - 30, 110, [255, 130, 70], 0.28);
    for (let i = 0; i < 5; i++) {
      const v = ph(t * 0.12 + i / 5, 1), px = w * 0.5 + Math.sin(v * 5 + i) * 8 + v * 30, py = h - 40 - v * 110, pr = 8 + v * 22;
      ctx.fillStyle = K.rg(ctx, px, py, pr, [`rgba(120,110,170,${0.35 * (1 - v)})`, 'rgba(100,90,160,0)']); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = K.lg(ctx, 0, h - 44, 0, h, ['#5a3a72', '#3a2a5e']);
    ctx.beginPath(); ctx.moveTo(w * 0.12, h + 2); ctx.quadraticCurveTo(w * 0.34, h - 30, w * 0.42, h - 42); ctx.lineTo(w * 0.58, h - 41); ctx.quadraticCurveTo(w * 0.68, h - 30, w * 0.9, h + 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,110,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(w * 0.2, h - 6); ctx.quadraticCurveTo(w * 0.35, h - 28, w * 0.42, h - 42); ctx.stroke();
    // lava runnels down the cone
    ctx.strokeStyle = 'rgba(255,140,70,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(w * 0.46, h - 40); ctx.quadraticCurveTo(w * 0.44, h - 26, w * 0.4, h - 10); ctx.moveTo(w * 0.55, h - 40); ctx.quadraticCurveTo(w * 0.58, h - 24, w * 0.6, h - 8); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, w * 0.5, h - 41, w * 0.09, ['rgba(255,240,170,1)', 'rgba(255,150,70,.8)', 'rgba(255,90,40,0)']); ctx.beginPath(); ctx.ellipse(w * 0.5, h - 41, w * 0.085, 3.6, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) { const cx = ph(i * 53 + t * 4, w + 80) - 40, cy = h - 4 + (i % 2) * 6; ctx.fillStyle = K.rg(ctx, cx, cy, 36, ['rgba(170,170,235,.55)', 'rgba(130,130,210,0)']); ctx.beginPath(); ctx.ellipse(cx, cy, 46, 15, 0, 0, TAU); ctx.fill(); }
  }

  // ---- meteors ----
  const MET = [[0.18, 26, 0], [0.0, 74, 1], [0.34, 122, 2]];   // delay, entry y, seed
  function meteorPos(w, k, v) { const [, y0] = MET[k]; return [lerp(w + 30, -40, v), lerp(y0, y0 + 150, v)]; }
  function drawMeteor(ctx, x, y, r, seed, t) {
    const dx = 0.857, dy = -0.514, L = 96, nx = -dy, ny = dx;   // the trail streams back up-right
    // smoke puffs left behind
    for (let i = 1; i <= 4; i++) { const d = i * 18 + ph(t * 2, 1) * 6, rr = 4 + i * 2.2; ctx.fillStyle = `rgba(120,100,160,${0.28 - i * 0.05})`; ctx.beginPath(); ctx.arc(x + dx * d + Math.sin(i * 2 + seed) * 3, y + dy * d + Math.cos(i * 3) * 3, rr, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [wd, a, c, len] of [[r * 2.6, 0.22, [255, 90, 50], L], [r * 1.7, 0.45, [255, 160, 70], L * 0.85], [r * 0.9, 0.75, [255, 230, 150], L * 0.6], [r * 0.4, 0.95, [255, 255, 235], L * 0.35]]) {
      ctx.fillStyle = K.lg(ctx, x, y, x + dx * len, y + dy * len, [rgb(c, a), rgb(c, 0)]);
      ctx.beginPath(); ctx.moveTo(x + nx * wd, y + ny * wd); ctx.lineTo(x + dx * len, y + dy * len); ctx.lineTo(x - nx * wd, y - ny * wd); ctx.arc(x, y, wd, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false); ctx.fill();
    }
    // flickering flame tongues licking back off the head
    for (let i = 0; i < 6; i++) {
      const o = (i / 5 - 0.5) * 2, fl = 0.7 + 0.3 * Math.sin(t * 30 + i * 2.1), len = r * (2.2 + (1 - Math.abs(o)) * 1.6) * fl, bx = x + nx * o * r * 0.9, by = y + ny * o * r * 0.9;
      ctx.fillStyle = K.lg(ctx, bx, by, bx + dx * len, by + dy * len, ['rgba(255,220,120,.8)', 'rgba(255,110,50,0)']);
      ctx.beginPath(); ctx.moveTo(bx - dx * 2 + nx * 2.2, by - dy * 2 + ny * 2.2); ctx.quadraticCurveTo(bx + dx * len * 0.5 + nx * 3 * Math.sin(t * 20 + i), by + dy * len * 0.5 + ny * 3 * Math.sin(t * 20 + i), bx + dx * len, by + dy * len); ctx.quadraticCurveTo(bx + dx * len * 0.4, by + dy * len * 0.4, bx - dx * 2 - nx * 2.2, by - dy * 2 - ny * 2.2); ctx.fill();
    }
    ctx.fillStyle = K.rg(ctx, x - dx * r * 0.6, y - dy * r * 0.6, r * 2.4, ['rgba(255,250,220,.9)', 'rgba(255,170,80,.4)', 'rgba(255,100,40,0)']); ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
    ctx.restore();
    K.danger(ctx, x, y, r * 4.5, 0.4);
    // the rock: dark where it trails, molten white-hot on its leading face, glowing cracks
    const pts = rockShape(seed + 3, r);
    ctx.save(); ctx.translate(x, y);
    blob(ctx, pts); ctx.fillStyle = rg2(ctx, -dx * r * 0.7, -dy * r * 0.7, 0, 0, 0, r * 1.2, [[0, [255, 250, 220]], [0.3, [255, 190, 90]], [0.65, [190, 80, 50]], [1, [110, 46, 50]]]); ctx.fill();
    ctx.strokeStyle = '#6a2a2a'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.save(); blob(ctx, pts); ctx.clip(); ctx.rotate(t * 3 + seed);
    ctx.strokeStyle = 'rgba(255,220,120,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.1); ctx.lineTo(-r * 0.1, r * 0.15); ctx.lineTo(r * 0.2, -r * 0.3); ctx.moveTo(-r * 0.1, r * 0.15); ctx.lineTo(r * 0.1, r * 0.6); ctx.stroke();
    ctx.fillStyle = 'rgba(100,40,40,.55)'; ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.25, r * 0.2, 0, TAU); ctx.arc(-r * 0.3, -r * 0.45, r * 0.14, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    // sparks shed behind
    for (let i = 0; i < 5; i++) { const v = ph(t * 3 + i * 0.2, 1); star4(ctx, x + dx * v * 40 + nx * Math.sin(i * 3) * 7, y + dy * v * 40 + ny * Math.sin(i * 3) * 7, 2.6 * (1 - v), [255, 200, 100], 1 - v); }
  }

  // ---- the satellite ----
  function satellite(ctx, x, y, s, rot, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    // arms and panels
    for (const d of [-1, 1]) {
      ctx.strokeStyle = '#8a8cac'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d * 8, 0); ctx.lineTo(d * 15, 0); ctx.stroke();
      ctx.save(); ctx.translate(d * 15 + (d < 0 ? -32 : 0), -7);
      ctx.fillStyle = K.lg(ctx, 0, 0, 32, 14, ['#6ab8ff', '#2a5ab8', '#1c3a8a']); ctx.fillRect(0, 0, 32, 14);
      ctx.strokeStyle = 'rgba(150,210,255,.55)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let gx = 4; gx < 32; gx += 4) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 14); } ctx.moveTo(0, 7); ctx.lineTo(32, 7); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sh = ph(t * 0.5 + d * 0.3, 1) * 60 - 14; ctx.fillStyle = K.lg(ctx, sh - 6, 0, sh + 6, 0, ['rgba(180,240,255,0)', 'rgba(180,240,255,.5)', 'rgba(180,240,255,0)']); ctx.beginPath(); ctx.rect(0, 0, 32, 14); ctx.clip(); ctx.fillRect(sh - 8, 0, 16, 14); ctx.restore();
      ctx.strokeStyle = '#c8cce4'; ctx.lineWidth = 1.2; ctx.strokeRect(0, 0, 32, 14);
      ctx.strokeStyle = '#4a4e7a'; ctx.lineWidth = 0.6; ctx.strokeRect(-0.6, -0.6, 33.2, 15.2);
      ctx.restore();
    }
    // the body: crinkled gold foil
    ctx.fillStyle = K.lg(ctx, -8, -10, 8, 10, ['#fff0a8', '#e0a830', '#8a5a14']); ctx.beginPath(); ctx.roundRect(-9, -10, 18, 20, 2.5); ctx.fill();
    ctx.strokeStyle = '#6a4210'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,210,.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-2, -3); ctx.lineTo(-5, 2); ctx.lineTo(-1, 7); ctx.moveTo(3, -8); ctx.lineTo(6, -2); ctx.lineTo(2, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,10,.6)'; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(-1, -2.4); ctx.lineTo(-4, 2.6); ctx.moveTo(4, -7); ctx.lineTo(7, -1); ctx.stroke();
    // dish on top, antenna with a blinking tip
    ctx.strokeStyle = '#9a9cc0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -14); ctx.moveTo(3, 10); ctx.lineTo(6, 22); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, -9, -20, 9, -14, ['#ffffff', '#c8cce6', '#7a7ea8']); ctx.beginPath(); ctx.ellipse(0, -16, 10, 4.5, 0, PI, TAU); ctx.quadraticCurveTo(0, -12, -10, -16); ctx.fill();
    ctx.strokeStyle = '#5a5e8a'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = '#d8dcf0'; ctx.beginPath(); ctx.arc(0, -19, 1.3, 0, TAU); ctx.fill();
    const bl = Math.sin(t * 6) > 0.3 ? 1 : 0.2; K.glow(ctx, 6, 22, 8, [255, 70, 80], 0.6 * bl); ctx.fillStyle = `rgba(255,${120 * bl + 60 | 0},${120 * bl + 60 | 0},1)`; ctx.beginPath(); ctx.arc(6, 22, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---- the UFO ----
  function ufo(ctx, x, y, s, t, tilt, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    // hatch glow under it
    K.glow(ctx, 0, 6, 22, [140, 255, 200], 0.25 + 0.5 * k);
    // the dome with a little alien
    ctx.fillStyle = 'rgba(170,240,255,.35)'; ctx.beginPath(); ctx.ellipse(0, -5, 11, 11, 0, PI, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -5, 11, 11, 0, PI, TAU); ctx.clip();
    ctx.fillStyle = K.rg(ctx, -2, -11, 9, ['#c8ff9a', '#6ad84a', '#2e8a3a']); ctx.beginPath(); ctx.ellipse(0, -6, 6.5, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6ad84a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(-5, -15); ctx.moveTo(3, -11); ctx.lineTo(5, -15); ctx.stroke();
    ctx.fillStyle = '#ff7ab8'; ctx.beginPath(); ctx.arc(-5, -15, 1.3, 0, TAU); ctx.arc(5, -15, 1.3, 0, TAU); ctx.fill();
    K.eyes(ctx, 0, -7, 2.7, 2.2, '#3a2a6a', Math.sin(t * 1.5) * 0.8, k * 0.6);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -5, 9, 3.5, 4.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,200,230,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, -5, 11, 11, 0, PI, TAU); ctx.stroke();
    // the saucer
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 8, ['#ffffff', '#c4c8e6', '#7a7eb0', '#4c4e86']); ctx.beginPath(); ctx.ellipse(0, 0, 24, 7.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3e4078'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -1, 22, 5.5, 0, PI * 1.1, PI * 1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,62,110,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 1, 22, 4.5, 0, 0.1, PI - 0.1); ctx.stroke();
    // chasing lights
    for (let i = 0; i < 7; i++) {
      const a = PI * (0.12 + i / 6 * 0.76), lx = Math.cos(a) * -20, ly = Math.sin(a) * 4.2 + 0.5, on = ph(t * (2 + k * 5) - i / 7, 1) < 0.35;
      const c = [[255, 220, 90], [120, 255, 200], [255, 120, 180]][i % 3];
      if (on) K.glow(ctx, lx, ly, 6, c, 0.7);
      ctx.fillStyle = rgb(on ? K.lift(c, 40) : K.lift(c, -90)); ctx.beginPath(); ctx.arc(lx, ly, 1.6, 0, TAU); ctx.fill();
    }
    // hatch
    ctx.fillStyle = K.lg(ctx, 0, 5, 0, 10, [rgb([200, 255, 220], 0.6 + 0.4 * k), '#3a8a7a']); ctx.beginPath(); ctx.ellipse(0, 6.5, 7, 2.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  PV.sections['starfall'] = (ctx, w, h, t) => {
    spaceBg(ctx, w, h, t);
    summitBelow(ctx, w, h, t);
    // far asteroids: small, hazed
    const FR = K.rand(12);
    for (let i = 0; i < 9; i++) {
      const x = FR() * w, y = FR() * h, r = 4 + FR() * 9; ctx.save(); ctx.globalAlpha = 0.5;
      asteroid(ctx, x + Math.sin(t * 0.3 + i) * 3, y, r, 600 + i, t * 0.1 + i, x < w / 2 ? -1 : 1, t, 0); ctx.restore();
    }
    ctx.fillStyle = 'rgba(30,36,110,.28)'; ctx.fillRect(0, 0, w, h);
    ringedPlanet(ctx, w * 0.24, h * 0.6, 50, t);
    ctx.fillStyle = 'rgba(34,38,120,.12)'; ctx.beginPath(); ctx.arc(w * 0.24, h * 0.6, 110, 0, TAU); ctx.fill();
    const inset = 30;
    starWall(ctx, -1, w, h, t, inset); starWall(ctx, 1, w, h, t, inset);

    // meteor shower: warning twinkles, then three streaks
    const mu = ph(t, 4, 0.0);
    const warn = smooth(0.0, 1.1, mu) * (1 - smooth(1.4, 1.7, mu));
    for (const [k, [d, y0]] of MET.entries()) {
      const sx = w - 26 - k * 14, sy = y0 - 6, tw = warn * (0.6 + 0.4 * Math.sin(t * 22 + k * 2));
      if (warn > 0.02) {
        star4(ctx, sx, sy, 3 + tw * 6, [255, 200, 120], tw); K.danger(ctx, sx, sy, 14 + 10 * tw, 0.3 * tw);
        ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = `rgba(255,140,110,${0.35 * warn})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(w + 10, y0 - 7); ctx.lineTo(-40, y0 + 143); ctx.stroke(); ctx.restore();
      }
      const v = (mu - 1.4 - d) / 1.0;
      if (v > 0 && v < 1) { const [x, y] = meteorPos(w, k, v); drawMeteor(ctx, x, y, 9.5 + k % 2 * 2, k, t); }
    }
    // coins
    coin(ctx, w * 0.3, h * 0.27, 0.68, t, 0.6); coin(ctx, w * 0.36, h * 0.58, 0.68, t, 2.1); coin(ctx, w * 0.62, h * 0.12, 0.68, t, 4);
    // the satellite tumbling across the middle
    const sx = w * 0.46 + Math.sin(TAU * t / 4) * 14, sy = h * 0.44 + Math.cos(TAU * t / 4) * 5, srot = TAU * t / 4;
    K.danger(ctx, sx, sy, 50, 0.24);
    satellite(ctx, sx, sy, 1, srot, t);
    // the UFO and its tractor beam
    const uu = ph(t, 4, 2.2), beam = bump(uu, 1.0, 1.5, 3.2, 3.7), flick = uu > 1.0 && uu < 1.5 ? 0.5 + 0.5 * Math.sin(t * 60) : 1;
    const ux = w * 0.72 + Math.sin(t * 1.3) * 3, uy = h * 0.66 + Math.sin(t * 2.1) * 2.5, tx = w * 0.46, ty = h * 0.86;
    if (beam > 0.02) {
      const bw = 26 * beam, ang = Math.atan2(ty - uy, tx - ux), nx = -Math.sin(ang), ny = Math.cos(ang), L = Math.hypot(tx - ux, ty - uy);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.lg(ctx, ux, uy, tx, ty, [`rgba(170,255,210,${0.5 * beam * flick})`, `rgba(120,240,220,${0.22 * beam * flick})`, 'rgba(100,220,255,0.02)']);
      ctx.beginPath(); ctx.moveTo(ux + nx * 6, uy + 6 + ny * 6); ctx.lineTo(tx + nx * bw, ty + ny * bw); ctx.lineTo(tx - nx * bw, ty - ny * bw); ctx.lineTo(ux - nx * 6, uy + 6 - ny * 6); ctx.closePath(); ctx.fill();
      // rings travelling up the beam toward the saucer
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const v = 1 - ph(t * 0.9 + i / 4, 1), cx = lerp(ux, tx, v), cy = lerp(uy + 6, ty, v), rr = lerp(6, bw, v);
        ctx.strokeStyle = `rgba(200,255,230,${0.6 * beam * (1 - Math.abs(v - 0.5) * 1.6)})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.3, ang + PI / 2, 0, TAU); ctx.stroke();
      }
      // dust drawn up the beam
      for (let i = 0; i < 8; i++) { const v = 1 - ph(t * 0.7 + i * 0.13, 1), off = Math.sin(i * 4.1) * 0.7; ctx.fillStyle = `rgba(220,255,240,${0.8 * beam})`; ctx.beginPath(); ctx.arc(lerp(ux, tx, v) + nx * off * lerp(6, bw, v), lerp(uy, ty, v) + ny * off * lerp(6, bw, v), 1, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ufo(ctx, ux, uy, 1, t, -0.18 * beam + Math.sin(t * 1.7) * 0.05, beam);
    // the rocket, pulled toward the saucer while the beam holds
    K.rocket(ctx, w * 0.5 + beam * 14, h * 0.83 - beam * 3, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [200, 220, 255], 18, 21);
  };
  // =====================================================================================
  // BEANSTALK HEIGHTS: a pastel sunrise above the clouds, a giant twisting stalk, cloud-bank walls
  // =====================================================================================
  const LEAF = [[190, 240, 130], [96, 184, 74], [44, 112, 46]], LEAF_EDGE = '#2f6a2a';
  const CLOUD = { lit: [255, 252, 246], mid: [246, 232, 240], shade: [196, 186, 234], deep: [150, 140, 206], edge: '#a99ccc', rim: [255, 196, 150] };
  function puff(ctx, x, y, r, dim) {
    const L = K.mix(CLOUD.lit, CLOUD.shade, dim * 0.6), M = K.mix(CLOUD.mid, CLOUD.deep, dim * 0.6), D = K.mix(CLOUD.shade, CLOUD.deep, dim);
    ctx.fillStyle = rg2(ctx, x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.02, [[0, L], [0.55, M], [1, D]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function puffRim(ctx, x, y, r, a) {
    ctx.strokeStyle = rgb(CLOUD.rim, a); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r - 1.2, 3.6, 5.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 3.7, 4.5); ctx.stroke();
  }
  // a cumulus clump on the wall: a big body near the screen edge, billows of every size down its inner edge, puffy lit
  // crown, flat lilac-blue underside; gaps between clumps let the sky through
  const CLUMPS = {
    '-1': [[-24, 128, 52, 1], [112, 118, 44, 2], [246, 128, 50, 3], [388, 132, 44, 4], [520, 120, 50, 5]],
    '1': [[30, 124, 46, 6], [168, 132, 52, 7], [300, 112, 42, 8], [432, 128, 50, 9]],
  };
  function cumulus(ctx, side, w, cy, hh, depth, seed, t) {
    const R = K.rand(seed * 97 + 13), X = d => side < 0 ? d : w - d, bob = Math.sin(t * 0.7 + seed) * 1.5;
    cy += bob;
    const body = [[X(depth * 0.18), cy + hh * 0.08, hh * 0.46], [X(depth * 0.3), cy - hh * 0.22, hh * 0.34]], edgeB = [];
    let y = cy - hh * 0.46;
    while (y < cy + hh * 0.4) {
      const v = (y - (cy - hh / 2)) / hh, r = (1.1 - v * 0.45) * (14 + R() * 17);
      edgeB.push([X(depth - r * 0.85 + (R() - 0.5) * 9), y + r * 0.3, r]); y += r * (0.95 + R() * 0.6);
    }
    const crown = [X(depth * 0.55), cy - hh * 0.4, hh * 0.19 + R() * 4];
    const all = body.concat([crown], edgeB);
    const flatY = cy + hh * 0.44;
    ctx.save(); ctx.beginPath(); ctx.rect(-20, cy - hh, w + 40, flatY - (cy - hh)); ctx.clip();
    ctx.strokeStyle = 'rgba(140,130,204,.95)'; ctx.lineWidth = 2; ctx.beginPath(); for (const [x, y2, r] of all) { ctx.moveTo(x + r + 0.6, y2); ctx.arc(x, y2, r + 0.6, 0, TAU); } ctx.stroke();
    for (const [x, y2, r] of all) {
      ctx.fillStyle = rg2(ctx, x - r * 0.4, y2 - r * 0.5, r * 0.05, x, y2, r * 1.02, [[0, [255, 250, 240]], [0.55, [246, 230, 238]], [1, [206, 196, 236]]]);
      ctx.beginPath(); ctx.arc(x, y2, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(176,164,224,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y2, r, PI * 1.02, PI * 1.98); ctx.stroke();
    }
    // one shading pass over the whole clump: warm sun on the crown, lilac-blue toward the flat underside
    ctx.beginPath(); for (const [x, y2, r] of all) { ctx.moveTo(x + r, y2); ctx.arc(x, y2, r, 0, TAU); } ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, cy - hh * 0.55, 0, flatY, [[0, 'rgba(255,214,170,.35)'], [0.35, 'rgba(255,230,220,0)'], [0.62, 'rgba(160,150,220,0)'], [1, 'rgba(120,116,206,.62)']]);
    ctx.fillRect(-20, cy - hh, w + 40, hh * 2);
    ctx.restore();
    // warm rims on the upper billows, white sheen
    for (const [x, y2, r] of all) {
      if (y2 > flatY - 6) continue;
      const up = clamp((flatY - y2) / hh, 0, 1);
      if (r > 26) continue;
      ctx.strokeStyle = rgb([255, 196, 150], 0.25 + 0.6 * up); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y2, r - 1.1, 3.7, 5.3); ctx.stroke();
      if (r > 8) { ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.45 * up})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y2, r * 0.7, 3.8, 4.5); ctx.stroke(); }
    }
    // the flat underside edge
    ctx.strokeStyle = 'rgba(130,120,200,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(side < 0 ? -2 : w + 2, flatY); ctx.lineTo(X(depth - 6), flatY); ctx.stroke();
  }
  function cloudWall(ctx, side, w, h, t) {
    // far, hazy cloud bank right at the screen edge: what shows through the gaps
    const X = d => side < 0 ? d : w - d;
    ctx.fillStyle = 'rgba(214,206,240,.75)'; ctx.beginPath();
    for (let y = -10; y < h + 30; y += 22) { const r = 16 + (y * 7 % 9); ctx.moveTo(X(4) + r, y); ctx.arc(X(4), y, r, 0, TAU); }
    ctx.fill();
    for (const [cy, hh, depth, seed] of CLUMPS[side]) cumulus(ctx, side, w, cy, hh, depth, seed, t);
  }
  function stalkX(w, y) { return w * 0.5 + Math.sin(y * 0.0105 + 1.25) * w * 0.44; }
  function leafShape(ctx, len, wd) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.2, -wd * 1.1, len * 0.75, -wd * 0.9, len, 0);
    ctx.bezierCurveTo(len * 0.75, wd * 0.8, len * 0.2, wd * 1.0, 0, 0); ctx.closePath();
  }
  function leaf(ctx, x, y, ang, len, wd, t, o = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.sin(t * 1.3 + o) * 0.04);
    leafShape(ctx, len, wd); ctx.fillStyle = K.lg(ctx, 0, -wd, len * 0.3, wd, [LEAF[0], LEAF[1], LEAF[2]]); ctx.fill();
    ctx.strokeStyle = LEAF_EDGE; ctx.lineWidth = 1; ctx.stroke();
    // midrib and veins as line pairs
    ctx.strokeStyle = 'rgba(40,100,40,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(1, 0.8); ctx.quadraticCurveTo(len * 0.5, -wd * 0.05, len * 0.96, 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,255,190,.8)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(1, -0.5); ctx.quadraticCurveTo(len * 0.5, -wd * 0.12, len * 0.94, -0.4); ctx.stroke();
    ctx.lineWidth = 0.7;
    for (let i = 1; i < 5; i++) {
      const u = i / 5.4, vx = len * u, vy = -wd * 0.04;
      for (const d of [-1, 1]) {
        ctx.strokeStyle = 'rgba(40,100,40,.45)'; ctx.beginPath(); ctx.moveTo(vx, vy); ctx.quadraticCurveTo(vx + len * 0.08, vy + d * wd * 0.35, vx + len * 0.16, vy + d * wd * 0.62 * Math.sin(u * PI + 0.3)); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,255,190,.5)'; ctx.beginPath(); ctx.moveTo(vx + 0.6, vy - 0.6); ctx.quadraticCurveTo(vx + len * 0.08 + 0.6, vy + d * wd * 0.35 - 0.6, vx + len * 0.16 + 0.6, vy + d * wd * 0.62 * Math.sin(u * PI + 0.3) - 0.6); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(len * 0.18, -wd * 0.62); ctx.quadraticCurveTo(len * 0.45, -wd * 0.85, len * 0.7, -wd * 0.55); ctx.stroke();
    ctx.restore();
  }
  // the giant stalk, twisting as it climbs: two braided strands, spiral grooves, curling tendrils and leaves
  function beanstalk(ctx, w, h, t, sh) {
    const W = 15;
    for (const strand of [0, 1]) {
      const off = y => Math.sin(y * 0.05 + strand * PI) * 9, N = 60, L = [], Rr = [];
      for (let i = 0; i <= N; i++) {
        const y = -20 + (h + 40) * i / N, x = stalkX(w, y) + off(y) + sh, dx = (stalkX(w, y + 2) - stalkX(w, y - 2)) / 4, nl = Math.hypot(1, dx), wd = W * (0.82 + 0.18 * Math.cos(y * 0.05 + strand * PI));
        L.push([x - wd / nl, y + dx * wd / nl]); Rr.push([x + wd / nl, y - dx * wd / nl]);
      }
      ctx.beginPath(); ctx.moveTo(...L[0]); for (const p of L) ctx.lineTo(...p); for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(...Rr[i]); ctx.closePath();
      ctx.fillStyle = strand ? rgb([70, 150, 60]) : rgb([92, 178, 72]); ctx.fill();
      ctx.strokeStyle = LEAF_EDGE; ctx.lineWidth = 1; ctx.stroke();
      // the lit ridge down the left of each strand, a shade on the right
      ctx.strokeStyle = 'rgba(200,250,150,.7)'; ctx.lineWidth = 2.6; ctx.beginPath(); L.forEach(([x, y], i) => { const xx = lerp(x, Rr[i][0], 0.28), yy = lerp(y, Rr[i][1], 0.28); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,90,40,.45)'; ctx.lineWidth = 3; ctx.beginPath(); L.forEach(([x, y], i) => { const xx = lerp(x, Rr[i][0], 0.84), yy = lerp(y, Rr[i][1], 0.84); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.stroke();
      // spiral grooves
      ctx.lineWidth = 1;
      for (let i = 2; i < N; i += 3) {
        const [ax, ay] = L[i], [bx, by] = Rr[i + 1];
        ctx.strokeStyle = 'rgba(30,90,40,.5)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 5, bx, by); ctx.stroke();
        ctx.strokeStyle = 'rgba(210,255,160,.45)'; ctx.beginPath(); ctx.moveTo(ax, ay - 1.2); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 3.8, bx, by - 1.2); ctx.stroke();
      }
    }
    // tendrils curling off
    ctx.lineCap = 'round';
    for (const [y, d] of [[h * 0.14, 1], [h * 0.42, -1], [h * 0.7, 1], [h * 0.93, -1]]) {
      const x = stalkX(w, y) + sh; ctx.strokeStyle = rgb(LEAF[1]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 1; i <= 16; i++) { const a = i * 0.45, r = 14 - i * 0.7; ctx.lineTo(x + d * (12 + Math.cos(a) * r), y - 10 + Math.sin(a) * r * 0.9 + Math.sin(t + y) * 0.6); }
      ctx.stroke();
    }
    for (const [y, d, len] of [[h * 0.27, 1, 30], [h * 0.55, -1, 34], [h * 0.82, 1, 28]]) { const x = stalkX(w, y) + sh; leaf(ctx, x, y, d > 0 ? -0.4 : PI + 0.4, len, len * 0.42, t, y); }
  }
  // a distant flat-bottomed cumulus as one path, shaded top to bottom
  function farCloud(ctx, x, y, s, top, bot, rim) {
    const P = [[-1.6, 0.1, 0.5], [-0.8, -0.35, 0.72], [0.15, -0.6, 0.9], [1.0, -0.25, 0.7], [1.8, 0.1, 0.45]];
    ctx.save(); ctx.beginPath(); ctx.rect(x - s * 3, y - s * 2, s * 6, s * 2.2); ctx.clip();
    ctx.beginPath(); for (const [px, py, r] of P) { ctx.moveTo(x + px * s + r * s, y + py * s); ctx.arc(x + px * s, y + py * s, r * s, 0, TAU); }
    ctx.fillStyle = K.lg(ctx, 0, y - s * 1.5, 0, y + s * 0.2, [top, bot]); ctx.fill();
    if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = 1.2; ctx.beginPath(); for (const [px, py, r] of P) { ctx.moveTo(x + px * s + Math.cos(3.7) * r * s, y + py * s + Math.sin(3.7) * r * s); ctx.arc(x + px * s, y + py * s, r * s, 3.7, 5.2); } ctx.stroke(); }
    ctx.restore();
  }
  function skyFar(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [[0, '#4f86d6'], [0.28, '#86b4f0'], [0.55, '#d6c2e6'], [0.78, '#ffb8a2'], [1, '#ff9c82']]); ctx.fillRect(-10, -10, w + 20, h + 20);
    // the rising sun behind the low clouds
    K.glow(ctx, w * 0.3, h * 0.94, 150, [255, 200, 150], 0.32);
    ctx.fillStyle = K.rg(ctx, w * 0.3, h * 0.94, 30, ['rgba(255,255,236,1)', 'rgba(255,230,180,.9)', 'rgba(255,200,150,0)']); ctx.beginPath(); ctx.arc(w * 0.3, h * 0.94, 30, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(w * 0.3, h * 0.94); ctx.rotate(t * 0.03);
    for (let i = 0; i < 9; i++) { ctx.rotate(TAU / 9); ctx.fillStyle = K.lg(ctx, 0, 0, 0, -h, ['rgba(255,236,200,.08)', 'rgba(255,236,200,0)']); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-30, -h); ctx.lineTo(30, -h); ctx.lineTo(6, 0); ctx.fill(); }
    ctx.restore();
    // the giant's castle far up on its cloud
    const cx = w * 0.68, cy = h * 0.15, c = 'rgba(120,140,206,.8)';
    ctx.fillStyle = c;
    ctx.fillRect(cx - 22, cy - 18, 44, 22); for (const [tx, tw, th] of [[-26, 10, 34], [16, 10, 38], [-6, 12, 46]]) { ctx.fillRect(cx + tx, cy - th + 4, tw, th); ctx.beginPath(); ctx.moveTo(cx + tx - 2, cy - th + 4); ctx.lineTo(cx + tx + tw / 2, cy - th - 9); ctx.lineTo(cx + tx + tw + 2, cy - th + 4); ctx.fill(); }
    ctx.strokeStyle = c; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx, cy - 55); ctx.lineTo(cx, cy - 64); ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,150,.85)'; ctx.beginPath(); ctx.moveTo(cx, cy - 64); ctx.lineTo(cx + 7 + Math.sin(t * 3) * 1.5, cy - 62); ctx.lineTo(cx, cy - 60); ctx.fill();
    ctx.fillStyle = 'rgba(255,226,160,.9)'; for (const [wx, wy] of [[-21, -16], [21, -18], [0, -26]]) ctx.fillRect(cx + wx - 1, cy + wy, 2, 3);
    farCloud(ctx, cx, cy + 12, 22, 'rgba(236,236,252,.95)', 'rgba(170,176,226,.95)', 'rgba(255,220,200,.7)');
    // distant cloud layers, stepping warmer and lighter toward us
    const layers = [[0.4, 13, 'rgba(176,186,236,.9)', 'rgba(146,156,218,.9)', null, 2],
                    [0.64, 17, 'rgba(240,214,232,.95)', 'rgba(196,170,214,.95)', 'rgba(255,214,190,.8)', 4],
                    [0.9, 22, 'rgba(255,240,234,1)', 'rgba(232,176,186,1)', 'rgba(255,206,170,.9)', 6]];
    for (const [row, sc, top, bot, rim, sp] of layers) {
      const R = K.rand(row * 100 | 0);
      for (let i = 0; i < 5; i++) { const x = ph(R() * (w + 140) + t * sp, w + 140) - 70, y = h * row + R() * 16; farCloud(ctx, x, y, sc * (0.8 + R() * 0.5), top, bot, rim); }
      ctx.fillStyle = bot; ctx.fillRect(-10, h * row + 16, w + 20, 3);
    }
    // birds
    ctx.strokeStyle = 'rgba(90,100,170,.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const bx = ph(w * 0.2 + i * 14 + t * 10, w + 40) - 20, by = h * 0.28 + i * 6, f = Math.sin(t * 8 + i) * 2; ctx.beginPath(); ctx.moveTo(bx - 4, by - f); ctx.quadraticCurveTo(bx - 2, by - 2, bx, by); ctx.quadraticCurveTo(bx + 2, by - 2, bx + 4, by - f); ctx.stroke(); }
  }

  // the goose on her cloud: plump, white, honks then lays a golden egg
  function goose(ctx, x, y, s, t, honk, lift, dir) {
    ctx.save(); ctx.translate(x, y - lift); ctx.scale(dir * s, s);
    const bob = Math.sin(t * 2.4) * 0.6, neck = honk * 5;
    // feet
    ctx.fillStyle = '#ff9a3a'; for (const d of [-3, 3]) { ctx.beginPath(); ctx.ellipse(d, 10 + lift / s * 0.0, 3.4, 1.4, 0, 0, TAU); ctx.fill(); }
    // body
    const body = () => { ctx.beginPath(); ctx.moveTo(-14, 2); ctx.bezierCurveTo(-16, -6, -6, -9, 2, -7); ctx.bezierCurveTo(10, -6, 14, 0, 12, 5); ctx.bezierCurveTo(10, 11, -6, 12, -12, 8); ctx.quadraticCurveTo(-19, 6, -20, 0); ctx.quadraticCurveTo(-16, 1, -14, 2); ctx.closePath(); };
    body(); ctx.fillStyle = rg2(ctx, -4, -6, 1, 0, 0, 18, [[0, [255, 255, 255]], [0.6, [238, 236, 250]], [1, [184, 180, 220]]]); ctx.fill();
    ctx.strokeStyle = '#9a94c4'; ctx.lineWidth = 0.9; ctx.stroke();
    // wing with feather scallops (ruffled through the honk)
    ctx.fillStyle = K.lg(ctx, 0, -4, 0, 8, ['#ffffff', '#d4d0ec']); ctx.beginPath(); ctx.moveTo(-10, -2); ctx.bezierCurveTo(-4, -6 - honk * 3, 6, -4, 6, 2); ctx.bezierCurveTo(2, 6, -6, 6, -12, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,134,190,.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (const fx of [-8, -4, 0]) { ctx.moveTo(fx - 2, 4); ctx.quadraticCurveTo(fx, 1, fx + 2, 4); } ctx.stroke();
    // neck and head
    const hx = 10, hy = -14 - neck + bob;
    ctx.strokeStyle = '#f4f2fc'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -4); ctx.quadraticCurveTo(12, -8, hx, hy); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,144,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -3); ctx.quadraticCurveTo(15, -8, hx + 3.4, hy + 1); ctx.stroke();
    ctx.fillStyle = rg2(ctx, hx - 2, hy - 3, 0.5, hx, hy, 7, [[0, [255, 255, 255]], [1, [214, 210, 238]]]); ctx.beginPath(); ctx.arc(hx, hy, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9a94c4'; ctx.lineWidth = 0.8; ctx.stroke();
    // beak: opens with the honk
    const op = honk * 0.5;
    ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(hx + 4, hy - 1); ctx.quadraticCurveTo(hx + 10, hy - 2 - op * 4, hx + 12, hy - op * 5); ctx.lineTo(hx + 4, hy + 0.5); ctx.fill();
    ctx.fillStyle = '#e8862a'; ctx.beginPath(); ctx.moveTo(hx + 4, hy + 1); ctx.quadraticCurveTo(hx + 9, hy + 2 + op * 3, hx + 11, hy + 1 + op * 6); ctx.lineTo(hx + 4, hy + 2.5); ctx.fill();
    if (honk > 0.1) { ctx.fillStyle = '#b8404a'; ctx.beginPath(); ctx.moveTo(hx + 5, hy + 0.5); ctx.lineTo(hx + 10, hy - op * 3); ctx.lineTo(hx + 10, hy + 1 + op * 4); ctx.fill(); }
    // a curl of crest feathers
    ctx.strokeStyle = '#f4f2fc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 2, hy - 5); ctx.bezierCurveTo(hx - 4, hy - 11 - honk * 2, hx + 3, hy - 12 - honk * 2, hx + 1, hy - 8); ctx.stroke();
    ctx.strokeStyle = '#9a94c4'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx - 3, hy - 6); ctx.bezierCurveTo(hx - 5, hy - 12 - honk * 2, hx + 3.6, hy - 13 - honk * 2, hx + 1.8, hy - 8); ctx.stroke();
    // eye (one, in profile): smug and half-lidded at rest, wide and cross through the honk
    ctx.save(); ctx.translate(hx + 0.5, hy - 1.5); K.eyes(ctx, 0, 0, 0, 2.5, '#5aa8ff', 0.7, honk);
    if (honk < 0.5) { const lid = 1 - honk * 2; ctx.fillStyle = '#e4e0f4'; ctx.beginPath(); ctx.ellipse(0, 0, 2.8, 2.9, 0, PI + 0.15, TAU - 0.15); ctx.closePath(); ctx.globalAlpha = lid; ctx.fill(); ctx.strokeStyle = '#7a72aa'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-2.8, -0.2); ctx.lineTo(2.8, -0.2); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,150,170,.55)'; ctx.beginPath(); ctx.ellipse(hx + 1, hy + 2.6, 2.2, 1.2, 0, 0, TAU); ctx.fill();
    // a blue ribbon bow at the neck
    ctx.fillStyle = '#5a9cff'; ctx.strokeStyle = '#3a6ac0'; ctx.lineWidth = 0.6;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(8 + d * 6, -10, 8 + d * 5, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(6, 1); ctx.lineTo(8, 0); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9ac4ff'; ctx.beginPath(); ctx.arc(8, -6, 1.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function goldenEgg(ctx, x, y, s, t, spin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.scale(s, s);
    ctx.fillStyle = rg2(ctx, -3, -5, 0.5, 0, 0, 11, [[0, CP.lit], [0.35, CP.hi], [0.75, CP.mid], [1, CP.lo]]);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(6, -10, 8, 1, 7.5, 3); ctx.bezierCurveTo(7, 8, 4, 10, 0, 10); ctx.bezierCurveTo(-4, 10, -7, 8, -7.5, 3); ctx.bezierCurveTo(-8, 1, -6, -10, 0, -10); ctx.fill();
    ctx.strokeStyle = rgb(CP.edge); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,240,.9)'; ctx.beginPath(); ctx.ellipse(-2.8, -4.5, 1.6, 3, 0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(CP.lo, 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 1, 6, 0.4, 2.6); ctx.stroke();
    ctx.restore();
  }
  // a bean pod on a vine: swells, splits, sprays beans
  function beanPod(ctx, x, y, s, t, swell, open, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s * (1 + swell * 0.16), s * (1 + swell * 0.1));
    ctx.rotate(0.3 + Math.sin(t * 1.6) * 0.05 + (swell > 0.3 && open < 0.05 ? Math.sin(t * 40) * 0.06 * swell : 0));
    const N = 18, L = 44, outer = (sg, i) => { const v = i / N, y = v * L, bm = Math.max(0, Math.sin(v * 3 * PI + 0.2)); return [sg * (Math.sin(Math.min(1, v * 1.08) * PI) * (9 + swell * 2) + bm * (3 + swell * 1.6)) + v * v * 6, y]; };
    const half = sg => { ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= N; i++) ctx.lineTo(...outer(sg, i)); ctx.quadraticCurveTo(sg * 1 + 4, L * 0.5, 0, 0); ctx.closePath(); };
    // beans inside, seen when it splits
    if (open > 0) for (const v of [0.24, 0.5, 0.76]) { const by = v * L, bx = v * v * 6 * 0.6; ctx.fillStyle = K.rg(ctx, bx - 1, by - 2, 6, ['#ffd0f0', '#e050a8', '#8a2470']); ctx.beginPath(); ctx.ellipse(bx, by, 4.6 * (1 - open * 0.7), 5, 0, 0, TAU); ctx.fill(); }
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.rotate(sg * open * 0.5);
      half(sg); ctx.fillStyle = K.lg(ctx, sg * -3, 0, sg * 12, 8, sg < 0 ? [[210, 250, 150], [130, 210, 90], [80, 166, 62]] : [[150, 220, 100], [90, 176, 70], [50, 120, 46]]); ctx.fill();
      ctx.strokeStyle = LEAF_EDGE; ctx.lineWidth = 1; ctx.stroke();
      if (open > 0.05) {
        // the open half shows its pale inside lining with empty bean cups
        ctx.save(); ctx.globalAlpha = smooth(0.05, 0.4, open);
        ctx.beginPath(); ctx.moveTo(0, 1); for (let i = 1; i < N; i++) { const [ox, oy] = outer(sg, i); ctx.lineTo(ox * 0.62 + (i / N) ** 2 * 6 * 0.38, oy); } ctx.lineTo(...outer(sg, N)); ctx.quadraticCurveTo(sg * 1 + 4, L * 0.5, 0, 1); ctx.closePath();
        ctx.fillStyle = K.lg(ctx, 0, 0, sg * 8, 0, ['#f4ffd8', '#c8eaa0']); ctx.fill(); ctx.strokeStyle = 'rgba(60,120,50,.6)'; ctx.lineWidth = 0.7; ctx.stroke();
        for (const v of [0.24, 0.5, 0.76]) { const [bx, by] = outer(sg, Math.round(v * N)); ctx.fillStyle = 'rgba(120,180,90,.6)'; ctx.beginPath(); ctx.ellipse(bx * 0.4 + v * v * 3, by, 3, 3.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(bx * 0.4 + v * v * 3 - 0.8, by - 1.2, 0.8, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      for (const v of [0.24, 0.5, 0.76]) {
        const [bx, by] = outer(sg, Math.round(v * N));
        ctx.strokeStyle = 'rgba(30,90,34,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx - sg * 4.5, by + 4.5, 4.5, -PI / 2 - 0.6, -PI / 2 + 0.6); ctx.stroke();
        if (swell > 0.05) K.glow(ctx, bx - sg * 4, by, 9, [255, 110, 200], 0.4 * swell);
      }
      if (sg < 0) { ctx.strokeStyle = 'rgba(235,255,200,.75)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let i = 2; i < N - 3; i++) { const [ox, oy] = outer(sg, i); i === 2 ? ctx.moveTo(ox * 0.6, oy) : ctx.lineTo(ox * 0.6 + 0.5, oy); } ctx.stroke(); }
      ctx.restore();
    }
    // the seam, pink-hot before it bursts
    if (open < 0.05) { ctx.strokeStyle = swell > 0.2 ? `rgba(255,120,200,${0.5 + 0.5 * swell})` : 'rgba(40,100,40,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 1); ctx.quadraticCurveTo(5, L * 0.5, 6, L - 1); ctx.stroke(); }
    // stem and calyx
    ctx.fillStyle = rgb(LEAF[2]); for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(d * 6, 0, d * 7, 5); ctx.quadraticCurveTo(d * 3, 3, 0, 2); ctx.fill(); }
    ctx.strokeStyle = rgb(LEAF[2]); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, -5, 1, -9); ctx.stroke();
    ctx.restore();
  }
  function bean(ctx, x, y, r, spin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    K.danger(ctx, 0, 0, r * 3, 0.3);
    ctx.fillStyle = rg2(ctx, -r * 0.3, -r * 0.4, 0.3, 0, 0, r * 1.3, [[0, [255, 210, 240]], [0.5, [232, 80, 170]], [1, [130, 30, 100]]]);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a1c5c'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,20,90,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, r * 0.9, r * 0.6, 3.6, 5.8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,250,.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.4, r * 0.35, r * 0.18, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,120,.9)'; ctx.beginPath(); ctx.arc(r * 0.4, r * 0.1, r * 0.13, 0, TAU); ctx.arc(-r * 0.1, r * 0.35, r * 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // a bouncy cloud with a sleepy happy face
  function bouncyCloud(ctx, x, y, s, sq, t, face = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + sq * 0.22), s * (1 - sq * 0.3));
    const P = [[-16, 2, 11], [-6, -5, 13], [7, -4, 12], [17, 3, 9], [0, 5, 12]];
    ctx.strokeStyle = CLOUD.edge; ctx.lineWidth = 1.2; for (const [px, py, r] of P) { ctx.beginPath(); ctx.arc(px, py, r + 0.6, 0, TAU); ctx.stroke(); }
    for (const [px, py, r] of P) puff(ctx, px, py, r, 0);
    for (const [px, py, r] of P.slice(0, 3)) puffRim(ctx, px, py, r, 0.8);
    // the bounce pad's pink underside
    ctx.fillStyle = 'rgba(255,170,200,.35)'; ctx.beginPath(); ctx.ellipse(0, 11, 18, 3.5, 0, 0, TAU); ctx.fill();
    if (face) {
      ctx.strokeStyle = '#7a6aa8'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-5, -1, 2.2, PI * 1.1, PI * 1.9); ctx.moveTo(7.2, -1); ctx.arc(5, -1, 2.2, PI * 1.1, PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 2, 2.6 + sq * 1.4, 0.2, PI - 0.2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,170,.5)'; ctx.beginPath(); ctx.ellipse(-9, 2.5, 2.6, 1.5, 0, 0, TAU); ctx.ellipse(9, 2.5, 2.6, 1.5, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function chevrons(ctx, x, y, ang, a) {
    if (a < 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) { const yy = -i * 7; ctx.globalAlpha = 1 - i * 0.28; ctx.beginPath(); ctx.moveTo(-5, yy + 3); ctx.lineTo(0, yy - 2); ctx.lineTo(5, yy + 3); ctx.stroke(); }
    ctx.restore();
  }

  PV.sections['beanstalk'] = (ctx, w, h, t) => {
    // the giant's footstep: every few seconds the whole stalk judders and leaves fall
    const fu = ph(t, 4, 0.5), stomp = bump(fu, 3.0, 3.05, 3.3, 3.6), sh = stomp * Math.sin(t * 70) * 2.2;
    ctx.save(); ctx.translate(0, sh * 0.6);
    skyFar(ctx, w, h, t);
    beanstalk(ctx, w, h, t, sh);
    // a pastel haze over the far layers
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(150,180,240,.16)', 'rgba(240,200,230,.08)', 'rgba(255,180,160,.14)']); ctx.fillRect(-10, -10, w + 20, h + 20);
    const inset = 32;
    cloudWall(ctx, -1, w, h, t); cloudWall(ctx, 1, w, h, t);
    // leaves pushing out of the clouds as ledges
    leaf(ctx, inset - 14, h * 0.47, -0.12, 44, 15, t, 1);
    leaf(ctx, w - inset + 14, h * 0.74, PI + 0.15, 40, 14, t, 2);
    // the goose's cloud ledge, top left
    const gy = h * 0.14, gx = inset + 20;
    bouncyCloud(ctx, gx - 2, gy + 22, 1.7, 0, t, 0);
    const gu = ph(t, 4, 0.0), honk = bump(gu, 0.9, 1.1, 1.5, 1.7), lay = bump(gu, 1.6, 1.75, 1.9, 2.1);
    if (honk > 0.05) {
      ctx.save(); ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const v = ph(t * 3 + k / 3, 1); ctx.strokeStyle = `rgba(255,110,110,${honk * (1 - v) * 0.9})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(gx + 38, gy - 30, 6 + v * 18, -0.9, 0.5); ctx.stroke(); }
      ctx.restore();
    }
    goose(ctx, gx, gy, 1.75, t, honk, lay * 6, 1);
    // the golden egg: appears under her, then drops down the shaft
    const ex0 = gx + 18, ey0 = gy + 24;
    if (gu > 1.7 && gu < 1.95) { const k = smooth(1.7, 1.9, gu); goldenEgg(ctx, ex0 - 6, ey0 - 2, 1.25 * k, t, 0); star4(ctx, ex0 - 2, ey0 - 10, 7 * k, [255, 240, 170], k); }
    if (gu >= 1.95 && gu < 3.6) {
      const ft = gu - 1.95, x = ex0 + ft * 22, y = ey0 + 40 * ft * ft * 1.0 + 60 * ft + ft * ft * 120;
      if (y < h + 30) {
        const sl = 30 + ft * 40;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.lg(ctx, x, y - sl, x, y, ['rgba(255,220,120,0)', 'rgba(255,226,140,.6)']); ctx.beginPath(); ctx.moveTo(x - 9, y - 4); ctx.lineTo(x - 2 - ft * 6, y - sl); ctx.lineTo(x + 2 - ft * 6, y - sl); ctx.lineTo(x + 9, y - 4); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,230,.7)'; ctx.lineWidth = 1.2; for (const d of [-6, 6]) { ctx.beginPath(); ctx.moveTo(x + d, y - 14); ctx.lineTo(x + d - ft * 4, y - 14 - sl * 0.5); ctx.stroke(); }
        ctx.restore();
        K.danger(ctx, x, y, 36, 0.42); K.glow(ctx, x, y, 28, [255, 220, 120], 0.4);
        goldenEgg(ctx, x, y, 1.35, t, Math.sin(ft * 6) * 0.35);
        const tw = 0.5 + 0.5 * Math.sin(t * 9); star4(ctx, x - 4, y - 7, 3 + tw * 4, [255, 250, 220], 0.6 + 0.4 * tw); star4(ctx, x + 9, y + 4, 2 + (1 - tw) * 3, [255, 240, 180], 0.8 - 0.4 * tw);
      }
    }
    // coins
    coin(ctx, w * 0.62, h * 0.12, 0.68, t, 1); coin(ctx, w * 0.5, h * 0.36, 0.68, t, 2.4); coin(ctx, w * 0.42, h * 0.62, 0.68, t, 3.6);
    // the bean pod on a vine from the right cloud bank
    const py = h * 0.37, px = w - inset - 22, pu = ph(t, 4, 2.3), swell = bump(pu, 0.8, 1.6, 1.6, 1.7), open = bump(pu, 1.6, 1.72, 2.8, 3.6);
    ctx.strokeStyle = rgb(LEAF[1]); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w - inset + 12, py - 30); ctx.bezierCurveTo(w - inset - 6, py - 34, px - 6, py - 22, px, py - 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,255,170,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w - inset + 12, py - 31.5); ctx.bezierCurveTo(w - inset - 6, py - 35.5, px - 7, py - 23.5, px - 1.4, py - 9); ctx.stroke();
    leaf(ctx, w - inset + 4, py - 30, PI + 0.6, 22, 8, t, 5);
    K.danger(ctx, px - 6, py + 14, 34 + swell * 8, 0.12 + 0.2 * swell);
    beanPod(ctx, px, py - 6, 1.35, t, swell, open, 1);
    // the spray: six beans fanning down and left across the shaft
    if (pu > 1.65 && pu < 3.4) {
      const ft = pu - 1.65;
      for (let k = 0; k < 6; k++) {
        const a = PI * (0.62 + k * 0.09), sp = 120 + (k % 3) * 18, x = px - 6 + Math.cos(a) * sp * ft, y = py + 8 - Math.sin(a) * sp * ft * -0.2 + Math.sin(a - PI * 0.5) * sp * ft + 60 * ft * ft;
        if (x > inset - 6) bean(ctx, x, y, 4.6, ft * 9 + k);
      }
    }
    // the sideways bumper: a cloud puffing out from the left bank
    const bu = ph(t, 2, 0.4), bpush = bump(bu, 0.6, 0.75, 0.9, 1.3);
    bouncyCloud(ctx, inset + 14 + bpush * 8, h * 0.6, 0.9, -bpush * 0.6, t, 1);
    chevrons(ctx, inset + 44 + bpush * 14, h * 0.6, PI / 2, bpush * 0.9);
    // the boost cloud under the rocket, and the rocket bouncing off it
    const cu = ph(t, 2, 0), land = cu < 0.5 ? ease(cu / 0.5) : 0, spring = cu >= 0.5 ? Math.max(0, 1 - (cu - 0.5) / 0.25) : land;
    const ry = h * 0.8 + (cu < 0.5 ? land * 10 : -Math.sin(Math.min(1, (cu - 0.5) / 1.5) * PI) * 26 + 10 * Math.max(0, 1 - (cu - 0.5) / 0.2));
    bouncyCloud(ctx, w * 0.5, h * 0.905, 1.25, spring * 0.9, t, 1);
    chevrons(ctx, w * 0.5, h * 0.72 - (cu - 0.5) * 30, 0, cu > 0.5 && cu < 1.2 ? 0.8 * (1 - (cu - 0.5) / 0.7) : 0);
    K.rocket(ctx, w * 0.5, ry, 0.75, t);
    // falling leaves after the stomp
    for (let k = 0; k < 3; k++) {
      const v = (fu - 3.05) / 0.95; if (v < 0 || v > 1) continue;
      const lx = [w * 0.3, w * 0.62, w * 0.78][k] + Math.sin(v * 9 + k) * 10, ly = h * (0.2 + k * 0.12) + v * 120;
      ctx.save(); ctx.globalAlpha = 1 - smooth(0.7, 1, v); leaf(ctx, lx, ly, Math.sin(v * 7 + k) * 1.2 + k, 14, 5.5, t, k); ctx.restore();
    }
    K.motes(ctx, w, h, t, 'pollen', [255, 214, 140], 10, 31);
    ctx.restore();
  };
})();
