// Machine levels: Clockwork Tower, Kooky Lab, Pipe Organ Cavern, Pinball Palace (round-2 concept previews).
(() => {
  const { TAU, clamp, lerp, rgb } = K;
  const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const easeOut = x => { x = clamp(x, 0, 1); return 1 - (1 - x) ** 3; };
  const easeIn = x => { x = clamp(x, 0, 1); return x * x * x; };
  const backOut = x => { x = clamp(x, 0, 1); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const ph = (t, p, off = 0) => (((t - off) % p) + p) % p;
  const circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };
  const add = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };

  // material ramps: light, mid, dark, edge (edge = a darker hue of the material, never black)
  const BRASS = [[255, 232, 160], [222, 166, 74], [140, 90, 36], [96, 58, 22]];
  const COPPER = [[255, 196, 150], [206, 116, 66], [124, 58, 30], [86, 36, 20]];
  const STEEL = [[244, 248, 252], [168, 178, 194], [92, 100, 120], [62, 68, 88]];
  const CHROME = ['#ffffff', '#d8e0ee', '#8a94ac', '#e8eef8', '#646e88'];

  // ---------- shared bits ----------
  // a riveted dome head
  function rivet(ctx, x, y, r, C = BRASS) {
    ctx.fillStyle = rgb(C[3], 0.6); circ(ctx, x + r * 0.35, y + r * 0.4, r); ctx.fill();
    ctx.fillStyle = K.rg(ctx, x - r * 0.4, y - r * 0.4, r * 1.4, [C[0], C[1], C[2]]); circ(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,.85)'; circ(ctx, x - r * 0.35, y - r * 0.35, r * 0.32); ctx.fill();
  }
  // a cartoon puff of steam/smoke: three or four lobes shaded from the top-left, one path so it never darkens where it overlaps
  function puff(ctx, x, y, r, a, tint = [255, 255, 255]) {
    if (a <= 0.01 || r <= 0.5) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = K.rg(ctx, x - r * 0.5, y - r * 0.6, r * 1.9, [rgb(tint), rgb(K.mix(tint, [200, 190, 200], 0.35)), rgb(K.mix(tint, [140, 130, 150], 0.6))]);
    ctx.beginPath();
    for (const [dx, dy, s] of [[0, 0, 1], [-0.75, 0.25, 0.72], [0.78, 0.3, 0.76], [0.15, -0.55, 0.72]]) { ctx.moveTo(x + dx * r + s * r, y + dy * r); ctx.arc(x + dx * r, y + dy * r, s * r, 0, TAU); }
    ctx.fill(); ctx.restore();
  }
  // a toothed gear outline (n teeth)
  function gearPath(ctx, x, y, R, n, ang, d) {
    const rr = R - d, s = TAU / n; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = ang + i * s;
      const pts = [[rr, a - s * 0.5], [rr, a - s * 0.27], [R, a - s * 0.15], [R, a + s * 0.15], [rr, a + s * 0.27]];
      pts.forEach(([r, aa], k) => (i === 0 && k === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x + Math.cos(aa) * r, y + Math.sin(aa) * r));
    }
    ctx.closePath();
  }
  // a glossy metal gear: toothed rim, open spokes (so what's behind shows through), hub and bolt, lit from the top-left
  function gear(ctx, x, y, R, n, ang, C, o = {}) {
    const d = o.depth ?? R * 0.15, rin = o.rin ?? R * 0.66, sp = o.spokes ?? 5, hub = o.hub ?? R * 0.24;
    const grad = K.lg(ctx, x - R, y - R, x + R * 0.7, y + R, [C[0], C[1], C[2]]);
    ctx.save(); ctx.lineJoin = 'round';
    gearPath(ctx, x, y, R, n, ang, d);
    if (sp) { ctx.moveTo(x + rin, y); ctx.arc(x, y, rin, 0, TAU, true); }
    ctx.fillStyle = grad; ctx.fill('evenodd');
    ctx.strokeStyle = rgb(C[3]); ctx.lineWidth = o.lw ?? 1.2; ctx.stroke();
    // a lit bevel on the teeth that face the light, a shade on the ones that face away
    for (let i = 0; i < n; i++) {
      const a = ang + i * TAU / n, s = TAU / n, f = Math.cos(a - 3.93);
      if (Math.abs(f) < 0.25) continue;
      ctx.strokeStyle = f > 0 ? rgb(C[0], 0.75 * f) : rgb(C[3], -0.5 * f); ctx.lineWidth = Math.max(0.8, R * 0.022);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a - s * 0.13) * (R - 0.8), y + Math.sin(a - s * 0.13) * (R - 0.8)); ctx.lineTo(x + Math.cos(a + s * 0.13) * (R - 0.8), y + Math.sin(a + s * 0.13) * (R - 0.8)); ctx.stroke();
    }
    // furrow + ridge just inside the teeth
    ctx.strokeStyle = rgb(C[3], 0.6); ctx.lineWidth = Math.max(0.8, R * 0.025); circ(ctx, x, y, R - d - R * 0.05); ctx.stroke();
    ctx.strokeStyle = rgb(C[0], 0.55); ctx.lineWidth = Math.max(0.6, R * 0.018); ctx.beginPath(); ctx.arc(x, y, R - d - R * 0.05 + 1.2, 0.2, 2.9); ctx.stroke();
    if (sp) {
      // inner lip lit on its far (bottom-right) side
      ctx.strokeStyle = rgb(C[0], 0.6); ctx.lineWidth = Math.max(0.8, R * 0.025); ctx.beginPath(); ctx.arc(x, y, rin + 0.6, -0.2, 1.9); ctx.stroke();
      for (let i = 0; i < sp; i++) {
        const a = ang + (i + 0.5) * TAU / sp, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux, w1 = R * 0.13, w2 = R * 0.09;
        ctx.beginPath();
        ctx.moveTo(x + ux * hub * 0.8 + vx * w1, y + uy * hub * 0.8 + vy * w1);
        ctx.lineTo(x + ux * (rin + 2) + vx * w2, y + uy * (rin + 2) + vy * w2);
        ctx.lineTo(x + ux * (rin + 2) - vx * w2, y + uy * (rin + 2) - vy * w2);
        ctx.lineTo(x + ux * hub * 0.8 - vx * w1, y + uy * hub * 0.8 - vy * w1);
        ctx.closePath(); ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = rgb(C[3], 0.9); ctx.lineWidth = 0.9; ctx.stroke();
        // ridge down the spoke on its lit side
        ctx.strokeStyle = rgb(C[0], 0.5); ctx.lineWidth = 0.7; ctx.beginPath();
        const s2 = (vx * -0.7 + vy * -0.7) > 0 ? 1 : -1;
        ctx.moveTo(x + ux * hub + vx * w1 * 0.5 * s2, y + uy * hub + vy * w1 * 0.5 * s2); ctx.lineTo(x + ux * rin + vx * w2 * 0.5 * s2, y + uy * rin + vy * w2 * 0.5 * s2); ctx.stroke();
      }
    } else if (o.holes) {
      for (let i = 0; i < o.holes; i++) {
        const a = ang + i * TAU / o.holes, hx = x + Math.cos(a) * R * 0.45, hy = y + Math.sin(a) * R * 0.45;
        ctx.fillStyle = rgb(C[3], 0.85); circ(ctx, hx, hy, R * 0.12); ctx.fill();
        ctx.strokeStyle = rgb(C[0], 0.5); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(hx, hy, R * 0.12, 0.2, 2.4); ctx.stroke();
      }
    }
    // hub
    ctx.fillStyle = K.rg(ctx, x - hub * 0.4, y - hub * 0.5, hub * 1.4, o.hubC || [STEEL[0], STEEL[1], STEEL[2]]); circ(ctx, x, y, hub); ctx.fill();
    ctx.strokeStyle = rgb(o.hubE || STEEL[3]); ctx.lineWidth = 1; ctx.stroke();
    // hex bolt
    const br = hub * 0.5; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = ang + i * TAU / 6; i ? ctx.lineTo(x + Math.cos(a) * br, y + Math.sin(a) * br) : ctx.moveTo(x + Math.cos(a) * br, y + Math.sin(a) * br); }
    ctx.closePath(); ctx.fillStyle = K.lg(ctx, x - br, y - br, x + br, y + br, [STEEL[0], STEEL[2]]); ctx.fill(); ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 0.7; ctx.stroke();
    // gloss sheen on the rim
    ctx.strokeStyle = 'rgba(255,255,245,.5)'; ctx.lineWidth = Math.max(1, R * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, R - d * 1.6, 3.6, 4.6); ctx.stroke();
    ctx.restore();
  }

  // a coconut coin (the game's: gold, raised rim, a palm struck on its face), spinning in a warm halo
  const FRONDS = [[-8.8, -1.0], [-6.6, -7.2], [0.2, -9.6], [6.8, -7.0], [9.0, -0.6]];
  function coin(ctx, x, y, t, phz = 0, sc = 0.62) {
    const sq = Math.max(0.14, Math.abs(Math.cos(t * 2.1 + phz)));
    K.glow(ctx, x, y, 19 * sc * 1.4, [255, 206, 90], 0.32);
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2.4 + phz) * 1.2); ctx.scale(sc * sq, sc);
    // edge thickness when turned
    if (sq < 0.97) { ctx.fillStyle = '#a86a10'; ctx.beginPath(); ctx.ellipse(1.6 * (1 - sq) * 3, 0, 13, 13, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = K.rg(ctx, -4.5, -5, 14, [[0, '#fffad6'], [0.35, '#ffde60'], [0.75, '#eaaa28'], [1, '#b06c14']]); circ(ctx, 0, 0, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(136,80,12,.9)'; ctx.lineWidth = 0.8; circ(ctx, 0, 0, 12.6); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, 3, 3.5, 13, [[0, '#ffde60'], [0.55, '#eaaa28'], [1, '#b06c14']]); circ(ctx, 0, 0, 10.8); ctx.fill();
    ctx.strokeStyle = 'rgba(100,58,8,.5)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, 10.5, 3.3, 5.7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,214,.6)'; ctx.beginPath(); ctx.arc(0, 0, 10.5, 0.2, 2.6); ctx.stroke();
    const emb = (path, fill) => {
      ctx.save(); ctx.translate(0.55, 0.6); path(); ctx.fillStyle = 'rgba(100,58,8,.5)'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-0.45, -0.5); path(); ctx.fillStyle = 'rgba(255,250,214,.75)'; ctx.fill(); ctx.restore();
      path(); ctx.fillStyle = fill; ctx.fill();
    };
    emb(() => { ctx.beginPath(); ctx.moveTo(0.6, 9.8); ctx.quadraticCurveTo(3, 3.4, -0.4, -2.4); ctx.lineTo(1, -2.2); ctx.quadraticCurveTo(5, 3.4, 3.4, 9.6); ctx.closePath(); }, '#f0b636');
    emb(() => {
      ctx.beginPath(); const cx = 0.2, cy = -3;
      for (const [ex, ey] of FRONDS) { const mx = (cx + ex) / 2, my = (cy + ey) / 2; ctx.moveTo(cx, cy); ctx.quadraticCurveTo(mx, my - 2.6, ex, ey); ctx.quadraticCurveTo(mx + 0.3, my + 0.8, cx, cy); ctx.closePath(); }
    }, '#ffd650');
    emb(() => { ctx.beginPath(); for (const [nx, ny, r] of [[-1.6, -1.6, 1.9], [1.8, -1.4, 1.85], [0.1, 0.6, 1.8]]) { ctx.moveTo(nx + r, ny); ctx.arc(nx, ny, r, 0, TAU); } }, '#f2c040');
    ctx.fillStyle = 'rgba(255,255,248,.95)'; ctx.beginPath(); ctx.ellipse(-7.4, -8, 1.5, 0.6, -0.8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // a four-point twinkle
  function twinkle(ctx, x, y, s, a, c = [255, 250, 225]) {
    if (s < 0.3 || a < 0.05) return;
    add(ctx, () => {
      ctx.fillStyle = rgb(c, a); ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
      ctx.fillStyle = K.rg(ctx, x, y, s * 1.4, [rgb(c, a * 0.6), rgb(c, 0)]); circ(ctx, x, y, s * 1.4); ctx.fill();
    });
  }
  // horizontal/vertical tube shading (for rods, pipes, rails): light along the top/left
  function tubeGrad(ctx, x0, y0, x1, y1, C) { return K.lg(ctx, x0, y0, x1, y1, [[0, rgb(C[1])], [0.25, rgb(C[0])], [0.6, rgb(C[1])], [1, rgb(C[2])]]); }

  // ---------- a built shaft: thick walls whose inner edge steps in and out with machinery ----------
  // P: bgTop, bgBot, far, far2, farShape, wall, wallIn, rim, rimStops (optional colours down the height), base (wall depth),
  //    blocks: { L: [[y0, y1, depth, kind], ...], R: [...] } covering the height top to bottom, wallDeco(ctx, side, X, w, h, t, blocks)
  // X(d) maps a distance d from the screen edge to an x on that side. Returns { L(y), R(y) }: the wall's inner edge x.
  const CH = 6;   // chamfer where the edge steps
  function knotsOf(P, side) {
    const ks = [[-60, P.base]];
    for (const [y0, y1, d] of (side < 0 ? P.blocks.L : P.blocks.R)) { ks.push([y0, d]); ks.push([y1, P.base]); }
    const m = [];
    for (const k of ks) { if (m.length && Math.abs(m[m.length - 1][0] - k[0]) < 0.01) m[m.length - 1] = k; else m.push(k); }
    const out = [];
    for (const k of m) if (!out.length || out[out.length - 1][1] !== k[1]) out.push(k);
    return out;
  }
  function depthAt(ks, y) {
    let i = 0; while (i + 1 < ks.length && ks[i + 1][0] - CH / 2 <= y) i++;
    if (i === 0) return ks[0][1];
    const u = (y - (ks[i][0] - CH / 2)) / CH;
    return u >= 1 ? ks[i][1] : lerp(ks[i - 1][1], ks[i][1], clamp(u, 0, 1));
  }
  function machineShaft(ctx, w, h, t, P) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [P.bgTop, P.bgBot]); ctx.fillRect(0, 0, w, h);
    for (const [layer, col] of [[0, P.far], [1, P.far2]]) {
      ctx.save(); ctx.fillStyle = rgb(col); P.farShape(ctx, w, h, t, layer, col); ctx.restore();
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [rgb(P.bgTop, 0.25), rgb(P.bgBot, 0.1), rgb(P.bgTop, 0.2)]); ctx.fillRect(0, 0, w, h);
    }
    add(ctx, () => { ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [rgb(P.rim, 0.1), rgb(P.rim, 0)]); ctx.beginPath(); ctx.moveTo(w * 0.35, 0); ctx.lineTo(w * 0.62, 0); ctx.lineTo(w * 0.8, h); ctx.lineTo(w * 0.2, h); ctx.fill(); });
    const KS = { '-1': knotsOf(P, -1), '1': knotsOf(P, 1) };
    const edge = (side, y) => { const d = depthAt(KS[side], y); return side < 0 ? d : w - d; };
    for (const side of [-1, 1]) {
      const ks = KS[side], X = d => side < 0 ? d : w - d, outer = side < 0 ? -2 : w + 2;
      // contact shadow on the background along the wall, deeper under each overhang
      for (let k = 0; k < ks.length; k++) {
        const y0 = ks[k][0], y1 = k + 1 < ks.length ? ks[k + 1][0] : h + 60, x = X(ks[k][1]);
        ctx.fillStyle = K.lg(ctx, x, 0, x - side * 16, 0, ['rgba(0,0,0,.3)', 'rgba(0,0,0,0)']);
        ctx.fillRect(Math.min(x, x - side * 16), y0, 16, y1 - y0);
        if (k > 0 && ks[k][1] < ks[k - 1][1]) {
          const xo = X(ks[k - 1][1]) - side * 8;
          ctx.fillStyle = K.lg(ctx, 0, y0, 0, y0 + 20, ['rgba(0,0,0,.38)', 'rgba(0,0,0,0)']);
          ctx.fillRect(Math.min(x, xo), y0, Math.abs(xo - x), 20);
        }
      }
      const pts = [[X(ks[0][1]), -60]];
      for (let k = 1; k < ks.length; k++) { pts.push([X(ks[k - 1][1]), ks[k][0] - CH / 2]); pts.push([X(ks[k][1]), ks[k][0] + CH / 2]); }
      pts.push([X(ks[ks.length - 1][1]), h + 60]);
      const inner = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
      inner(); ctx.lineTo(outer, h + 60); ctx.lineTo(outer, -60); ctx.closePath();
      const maxD = Math.max(...ks.map(k => k[1]));
      ctx.fillStyle = K.lg(ctx, X(0), 0, X(maxD), 0, [P.wallIn, P.wall]); ctx.fill();
      ctx.save(); ctx.clip(); P.wallDeco(ctx, side, X, w, h, t, side < 0 ? P.blocks.L : P.blocks.R); ctx.restore();
      // rim light following every step of the edge, its colour shifting down the height
      const rs = (a, lift = 0) => P.rimStops ? K.lg(ctx, 0, 0, 0, h, P.rimStops.map(c => rgb(K.lift(c, lift), a))) : rgb(K.lift(P.rim, lift), a);
      ctx.save(); ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
      for (const [lw, a] of [[9, 0.12], [4, 0.32]]) { ctx.strokeStyle = rs(a); ctx.lineWidth = lw; inner(); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = rs(0.95, 30); ctx.lineWidth = 1.6; inner(); ctx.stroke();
      ctx.restore();
    }
    return { L: y => edge(-1, y), R: y => edge(1, y) };
  }
  const span = (X, d0, d1) => [Math.min(X(d0), X(d1)), Math.abs(d1 - d0)];

  // a hex bolt head
  function bolt(ctx, x, y, r, C = STEEL) {
    ctx.fillStyle = rgb(C[3], 0.55); circ(ctx, x + r * 0.4, y + r * 0.5, r * 1.15); ctx.fill();
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath();
    ctx.fillStyle = K.lg(ctx, x - r, y - r, x + r, y + r, [rgb(C[0]), rgb(C[1]), rgb(C[2])]); ctx.fill();
    ctx.strokeStyle = rgb(C[3]); ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,240,.8)'; circ(ctx, x - r * 0.32, y - r * 0.32, r * 0.28); ctx.fill();
  }
  // a heavy bevelled plate: lit top-left bevel, dark bottom-right, corner bolts, optionally a raised embossed panel
  function plate(ctx, x, y, pw, hh, C, o = {}) {
    if (pw < 3 || hh < 3) return;
    ctx.fillStyle = K.lg(ctx, x, y, x + pw * 0.7, y + hh, [rgb(C[0]), rgb(C[1]), rgb(C[2])]);
    ctx.beginPath(); ctx.roundRect(x, y, pw, hh, o.r ?? 2.5); ctx.fill();
    ctx.strokeStyle = rgb(C[3]); ctx.lineWidth = 1; ctx.stroke();
    ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(K.lift(C[0], 10), 0.85); ctx.beginPath(); ctx.moveTo(x + 1.6, y + hh - 2.5); ctx.lineTo(x + 1.6, y + 1.6); ctx.lineTo(x + pw - 2.5, y + 1.6); ctx.stroke();
    ctx.strokeStyle = rgb(C[3], 0.95); ctx.beginPath(); ctx.moveTo(x + pw - 1.6, y + 2.5); ctx.lineTo(x + pw - 1.6, y + hh - 1.6); ctx.lineTo(x + 2.5, y + hh - 1.6); ctx.stroke();
    const m = o.m ?? 6, ex = x + m, ey = y + m, ew = pw - 2 * m, eh = hh - 2 * m;
    if (o.emboss && ew > 5 && eh > 5) {
      ctx.fillStyle = rgb(C[3], 0.5); ctx.beginPath(); ctx.roundRect(ex + 1, ey + 1.5, ew, eh, 2); ctx.fill();
      ctx.fillStyle = K.lg(ctx, ex, ey, ex + ew, ey + eh, [rgb(K.lift(C[1], 26)), rgb(C[1]), rgb(K.lift(C[2], 14))]);
      ctx.beginPath(); ctx.roundRect(ex, ey, ew, eh, 2); ctx.fill();
      ctx.strokeStyle = rgb(K.lift(C[0], 10), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex + 0.8, ey + eh - 1); ctx.lineTo(ex + 0.8, ey + 0.8); ctx.lineTo(ex + ew - 1, ey + 0.8); ctx.stroke();
      const cx = ex + ew / 2, cy = ey + eh / 2, rr = Math.min(ew, eh) / 2 - 2;
      if (o.emboss === 'sun') {
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12, c = Math.cos(a), s = Math.sin(a);
          ctx.strokeStyle = rgb(C[3], 0.55); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx + c * rr * 0.4, cy + s * rr * 0.4); ctx.lineTo(cx + c * rr, cy + s * rr); ctx.stroke();
          ctx.strokeStyle = rgb(C[0], 0.5); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(cx + c * rr * 0.4 - 0.7, cy + s * rr * 0.4 - 0.7); ctx.lineTo(cx + c * rr - 0.7, cy + s * rr - 0.7); ctx.stroke();
        }
        ctx.fillStyle = K.rg(ctx, cx - 1.5, cy - 1.5, rr * 0.45, [rgb(C[0]), rgb(C[1]), rgb(C[2])]); circ(ctx, cx, cy, rr * 0.36); ctx.fill();
        ctx.strokeStyle = rgb(C[3], 0.7); ctx.lineWidth = 0.7; ctx.stroke();
      } else if (o.emboss === 'diamond') {
        const dx = ew / 2 - 3, dy = eh / 2 - 3;
        ctx.fillStyle = K.lg(ctx, cx - dx, cy - dy, cx + dx, cy + dy, [rgb(C[0]), rgb(C[1]), rgb(C[2])]);
        ctx.beginPath(); ctx.moveTo(cx, cy - dy); ctx.lineTo(cx + dx, cy); ctx.lineTo(cx, cy + dy); ctx.lineTo(cx - dx, cy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgb(C[3], 0.75); ctx.lineWidth = 0.8; ctx.stroke();
        ctx.strokeStyle = rgb(C[0], 0.7); ctx.beginPath(); ctx.moveTo(cx - dx + 1.5, cy); ctx.lineTo(cx, cy - dy + 1.5); ctx.stroke();
      }
    }
    if (o.bolts !== false) { const b = o.bi ?? 4.2; for (const [bx, by] of [[x + b, y + b], [x + pw - b, y + b], [x + b, y + hh - b], [x + pw - b, y + hh - b]]) bolt(ctx, bx, by, o.br ?? 1.9, o.boltC || C); }
  }
  // a dark recess cut into a wall face (inner shadow at its top-left)
  function recess(ctx, x, y, rw, rh, r = 3, c = 'rgba(16,8,4,.92)') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, rw, rh, r); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, rw, rh, r); ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 8, ['rgba(0,0,0,.6)', 'rgba(0,0,0,0)']); ctx.fillRect(x, y, rw, 8);
    ctx.fillStyle = K.lg(ctx, x, 0, x + 6, 0, ['rgba(0,0,0,.45)', 'rgba(0,0,0,0)']); ctx.fillRect(x, y, 6, rh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,240,210,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + rw - 0.5, y + 2); ctx.lineTo(x + rw - 0.5, y + rh - 0.5); ctx.lineTo(x + 2, y + rh - 0.5); ctx.stroke();
  }
  // a vertical pipe with bolted flanges
  function pipeV(ctx, x, y0, y1, r, C, every = 40, off = 0) {
    ctx.fillStyle = tubeGrad(ctx, x - r, 0, x + r, 0, C); ctx.fillRect(x - r, y0, r * 2, y1 - y0);
    ctx.strokeStyle = rgb(C[3] || C[2], 0.9); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - r, y0); ctx.lineTo(x - r, y1); ctx.moveTo(x + r, y0); ctx.lineTo(x + r, y1); ctx.stroke();
    for (let y = y0 + off + every / 2; y < y1 - 4; y += every) {
      ctx.fillStyle = tubeGrad(ctx, x - r - 2, 0, x + r + 2, 0, C); ctx.fillRect(x - r - 2, y - 3, r * 2 + 4, 6);
      ctx.strokeStyle = rgb(C[3] || C[2]); ctx.strokeRect(x - r - 2, y - 3, r * 2 + 4, 6);
      bolt(ctx, x - r, y, 1.1, STEEL); bolt(ctx, x + r, y, 1.1, STEEL);
    }
  }
  // a hand-wheel valve
  function valveWheel(ctx, x, y, r, ang, C = [[255, 150, 170], [214, 60, 90], [130, 30, 50], [90, 20, 36]]) {
    ctx.strokeStyle = rgb(C[3]); ctx.lineWidth = 3.2; circ(ctx, x, y, r); ctx.stroke();
    ctx.strokeStyle = rgb(C[1]); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = rgb(C[0], 0.9); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, y, r - 0.4, 3.4, 4.9); ctx.stroke();
    ctx.strokeStyle = rgb(C[2]); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = ang + i * TAU / 4; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.stroke();
    bolt(ctx, x, y, r * 0.32, STEEL);
  }
  // a band of hazard stripes (yellow and slate)
  function hazard(ctx, x, y, hw, hh, sw = 5) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, hw, hh); ctx.clip();
    ctx.fillStyle = '#ffcc3c'; ctx.fillRect(x, y, hw, hh);
    ctx.fillStyle = '#34404e';
    for (let k = -hh; k < hw + hh; k += sw * 2) { ctx.beginPath(); ctx.moveTo(x + k, y + hh); ctx.lineTo(x + k + hh, y); ctx.lineTo(x + k + hh + sw, y); ctx.lineTo(x + k + sw, y + hh); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y, hw, 1);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + hh - 1, hw, 1);
    ctx.restore();
  }

  // =====================================================================================================
  // CLOCKWORK TOWER: warm brass, turning gears, a huge backlit clock face; everything moves on one beat (1 s)
  // =====================================================================================================
  const CLOCK = {
    bgTop: [122, 84, 52], bgBot: [50, 31, 21], far: [104, 70, 42], far2: [88, 58, 36],
    wall: [86, 54, 26], wallIn: [34, 19, 9], rim: [255, 204, 120], inset: 30, wobble: 0, seed: 2,
  };
  const beatK = t => Math.exp(-ph(t, 1) * 7);     // 1 right on the beat, decaying
  const tickA = (t, step, snap = 0.16) => (Math.floor(t) + backOut(ph(t, 1) / snap)) * step;
  const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  function clockFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the tower's great clock face seen from inside: warm daylight through the glass, mirrored numerals, iron tracery
      const cx = w * 0.5, cy = h * 0.2, R = 112;
      K.glow(ctx, cx, cy, R * 1.6, [255, 214, 150], 0.32);
      ctx.fillStyle = K.rg(ctx, cx - 24, cy - 30, R, ['rgba(255,244,214,.82)', 'rgba(250,222,170,.66)', 'rgba(222,170,104,.55)']);
      circ(ctx, cx, cy, R); ctx.fill();
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 9; circ(ctx, cx, cy, R); ctx.stroke();
      ctx.lineWidth = 2.2; circ(ctx, cx, cy, R * 0.6); ctx.stroke(); circ(ctx, cx, cy, R * 0.94); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.moveTo(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6); ctx.lineTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94); } ctx.stroke();
      // minute ticks
      ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 60; i++) { const a = i * TAU / 60; ctx.moveTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94); ctx.lineTo(cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88); } ctx.stroke();
      // numerals, mirrored (we're behind the glass)
      ctx.fillStyle = rgb(col, 0.9); ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 - i * TAU / 12;   // runs anticlockwise from inside
        ctx.save(); ctx.translate(cx + Math.cos(a) * R * 0.77, cy + Math.sin(a) * R * 0.77); ctx.rotate(a + Math.PI / 2); ctx.scale(-1, 1); ctx.fillText(NUM[i], 0, 0); ctx.restore();
      }
      // the hands, in silhouette, the minute hand jumping on every beat
      const hand = (a, L, wd) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(-wd, 12); ctx.lineTo(-wd * 0.6, -L * 0.7); ctx.lineTo(-wd * 2.2, -L * 0.78); ctx.lineTo(0, -L); ctx.lineTo(wd * 2.2, -L * 0.78); ctx.lineTo(wd * 0.6, -L * 0.7); ctx.lineTo(wd, 12); ctx.closePath(); ctx.fill();
        circ(ctx, 0, -L * 0.45, wd * 2.2); ctx.fill(); ctx.restore();
      };
      ctx.fillStyle = rgb(col);
      hand(-tickA(t, TAU / 60) - 0.5, R * 0.86, 2.4); hand(-1.9 - t * 0.01, R * 0.56, 3.4);
      circ(ctx, cx, cy, 7); ctx.fill();
      // great slow gears lower down
      for (const [gx, gy, gr, gn, s] of [[w * 0.1, h * 0.63, 66, 18, 1], [w * 0.92, h * 0.8, 58, 16, -1.12]]) {
        gearPath(ctx, gx, gy, gr, gn, s * tickA(t, TAU / gn / 2), 9);
        for (let i = 0; i < 5; i++) { const a = s * tickA(t, TAU / gn / 2) + i * TAU / 5, hx = gx + Math.cos(a) * gr * 0.5, hy = gy + Math.sin(a) * gr * 0.5; ctx.moveTo(hx + gr * 0.2, hy); ctx.arc(hx, hy, gr * 0.2, 0, TAU, true); }
        ctx.fill('evenodd');
      }
    } else {
      // nearer: axles, mid gears, hanging weights and the great pendulum swinging on the beat
      ctx.fillStyle = rgb(col);
      for (const ax of [w * 0.27, w * 0.76]) ctx.fillRect(ax - 2.5, 0, 5, h);
      for (const [gx, gy, gr, gn, s] of [[w * 0.27, h * 0.47, 34, 12, 1], [w * 0.76, h * 0.38, 44, 15, -1], [w * 0.27, h * 0.88, 26, 10, -1]]) {
        const a = s * tickA(t + 0.5, TAU / gn);
        gearPath(ctx, gx, gy, gr, gn, a, 6);
        for (let i = 0; i < 4; i++) { const aa = a + i * TAU / 4 + 0.78; ctx.moveTo(gx + Math.cos(aa) * gr * 0.62, gy + Math.sin(aa) * gr * 0.62); ctx.arc(gx, gy, gr * 0.62, aa, aa + 1.15, false); ctx.arc(gx, gy, gr * 0.3, aa + 1.15, aa, true); ctx.closePath(); }
        ctx.fill('evenodd');
      }
      // chains and weights
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 1.6;
      for (const [cx2, len] of [[w * 0.42, h * 0.3], [w * 0.6, h * 0.52]]) {
        ctx.beginPath(); for (let y = 0; y < len; y += 5) { ctx.moveTo(cx2 - 1.5, y); ctx.lineTo(cx2 + 1.5, y + 4); } ctx.stroke();
        ctx.beginPath(); ctx.roundRect(cx2 - 7, len, 14, 30, 4); ctx.fill();
      }
      // pendulum: swings through the middle on every beat
      const px = w * 0.5, py = h * 0.2, L = h * 0.5, a = Math.sin(t * Math.PI) * 0.2;
      const bx = px + Math.sin(a) * L, by = py + Math.cos(a) * L;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 6, py + 30); ctx.lineTo(bx - 3, by - 20); ctx.moveTo(px + 6, py + 30); ctx.lineTo(bx + 3, by - 20); ctx.stroke();
      ctx.fillStyle = K.rg(ctx, bx - 8, by - 9, 28, [rgb(K.mix(col, [255, 210, 130], 0.45)), rgb(K.mix(col, [200, 140, 60], 0.3)), rgb(col)]);
      ctx.beginPath(); for (let i = 0; i < 24; i++) { const aa = i * TAU / 24, rr = i % 2 ? 22 : 26; ctx.lineTo(bx + Math.cos(aa) * rr, by + Math.sin(aa) * rr); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = K.rg(ctx, bx - 6, by - 7, 20, [rgb(K.mix(col, [255, 226, 160], 0.5)), rgb(K.mix(col, [190, 130, 60], 0.35))]); circ(ctx, bx, by, 18); ctx.fill();
      ctx.strokeStyle = rgb(K.lift(col, 70), 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 16, 3.6, 4.7); ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(col, -15)); ctx.lineWidth = 1.4; circ(ctx, bx, by, 13); ctx.stroke();
    }
  }

  const BRASSW = [[236, 198, 128], [176, 122, 54], [104, 64, 26], [58, 32, 12]];
  const WALNUT = [[178, 112, 66], [116, 64, 34], [66, 34, 16], [44, 20, 10]];
  CLOCK.base = 32;
  CLOCK.blocks = {
    L: [[-60, 18, 32, 'plates'], [18, 198, 38, 'gearhouse'], [198, 252, 32, 'plates'], [252, 394, 34, 'wood'], [394, 468, 50, 'escape'], [468, 540, 32, 'plates']],
    R: [[-60, 66, 46, 'dial'], [66, 172, 32, 'governor'], [172, 258, 36, 'pistonmount'], [258, 330, 32, 'emboss'], [330, 426, 48, 'train'], [426, 540, 34, 'pipes']],
  };
  CLOCK.rimStops = [[255, 214, 140], [255, 190, 110], [255, 222, 150], [255, 176, 96], [255, 206, 130]];
  function clockWall(ctx, side, X, w, h, t, blocks) {
    for (const [y0, y1, d, kind] of blocks) {
      const [x, ww] = span(X, -4, d), H = y1 - y0, r = K.rand((y0 + 99) * (side + 3));
      if (kind === 'plates' || kind === 'emboss') {
        let y = y0, k = 0;
        while (y < y1 - 4) {
          const hh = kind === 'emboss' ? H : Math.min(y1 - y, 40 + r() * 26);
          plate(ctx, x + 1, y + 1, ww - 2, hh - 2, BRASSW, { emboss: kind === 'emboss' || k % 2 ? 'sun' : 'diamond', m: 7, br: 2.2, bi: 5 });
          y += hh; k++;
        }
        // verdigris weeping from the top bolts
        for (const f of [0.3, 0.75]) { const vx = X(d * f), vy = y0 + 6, L = 14 + r() * 14; ctx.fillStyle = 'rgba(95,174,152,.5)'; ctx.beginPath(); ctx.moveTo(vx - 2.2, vy); ctx.quadraticCurveTo(vx - 2.6, vy + L * 0.6, vx, vy + L); ctx.quadraticCurveTo(vx + 2.6, vy + L * 0.6, vx + 2.2, vy); ctx.fill(); ctx.fillStyle = 'rgba(180,240,215,.4)'; ctx.fillRect(vx - 0.8, vy + 2, 1, L * 0.5); }
      } else if (kind === 'gearhouse') {
        // a massive bolted housing that the great cog turns out of: engraved arcs follow the cog
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { bolts: false });
        const cx = X(d - 22), cy = (y0 + y1) / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y0 + 4, ww, H - 8); ctx.clip();
        for (const [rr, a] of [[92, 0.7], [100, 0.5]]) { ctx.strokeStyle = rgb(BRASSW[3], a); ctx.lineWidth = 2; circ(ctx, cx, cy, rr); ctx.stroke(); ctx.strokeStyle = rgb(BRASSW[0], a * 0.7); ctx.lineWidth = 0.9; circ(ctx, cx, cy, rr + 1.6); ctx.stroke(); }
        ctx.restore();
        for (let y = y0 + 10; y < y1 - 6; y += 26) bolt(ctx, X(7), y, 2.6, BRASSW);
      } else if (kind === 'wood') {
        // a carved walnut panel behind the cuckoo clock, between brass rails
        ctx.fillStyle = K.lg(ctx, x, 0, x + ww, 0, [rgb(WALNUT[2]), rgb(WALNUT[1]), rgb(WALNUT[2])]); ctx.fillRect(x, y0, ww, H);
        ctx.strokeStyle = rgb(WALNUT[3], 0.6); ctx.lineWidth = 0.8; ctx.beginPath();
        for (let i = 0; i < 5; i++) { const gx = x + 4 + i * (ww - 8) / 4; ctx.moveTo(gx, y0); ctx.bezierCurveTo(gx + 3, y0 + H * 0.3, gx - 3, y0 + H * 0.7, gx + 1, y1); } ctx.stroke();
        const px = Math.min(X(5), X(d - 5)), pw = Math.abs(d - 10);
        ctx.fillStyle = rgb(WALNUT[3], 0.6); ctx.beginPath(); ctx.roundRect(px + 1, y0 + 13, pw, H - 24, 4); ctx.fill();
        ctx.fillStyle = K.lg(ctx, px, y0 + 12, px + pw, y1 - 12, [rgb(WALNUT[0]), rgb(WALNUT[1]), rgb(WALNUT[2])]); ctx.beginPath(); ctx.roundRect(px, y0 + 12, pw, H - 24, 4); ctx.fill();
        ctx.strokeStyle = rgb(K.lift(WALNUT[0], 20), 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 1, y1 - 14); ctx.lineTo(px + 1, y0 + 13); ctx.lineTo(px + pw - 2, y0 + 13); ctx.stroke();
        for (const yy of [y0 + 3, y1 - 6]) { ctx.fillStyle = K.lg(ctx, 0, yy, 0, yy + 4, [rgb(BRASSW[0]), rgb(BRASSW[2])]); ctx.fillRect(x, yy, ww, 4); }
      } else if (kind === 'escape') {
        // the escapement: a sawtooth wheel ticking round under a rocking anchor, behind a heavy brass frame
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { br: 2.4, bi: 5 });
        const rx = Math.min(X(7), X(d - 6)), rw = d - 13;
        recess(ctx, rx, y0 + 9, rw, H - 18, 5);
        const cx = X(d * 0.55), cy = y0 + H * 0.6, a = tickA(t, TAU / 15);
        ctx.save(); ctx.beginPath(); ctx.roundRect(rx, y0 + 9, rw, H - 18, 5); ctx.clip();
        ctx.beginPath(); for (let i = 0; i < 15; i++) { const aa = a * side + i * TAU / 15; ctx.lineTo(cx + Math.cos(aa) * 9, cy + Math.sin(aa) * 9); ctx.lineTo(cx + Math.cos(aa + 0.32) * 16, cy + Math.sin(aa + 0.32) * 16); ctx.lineTo(cx + Math.cos(aa + 0.42) * 9, cy + Math.sin(aa + 0.42) * 9); }
        ctx.closePath(); ctx.fillStyle = K.lg(ctx, cx - 16, cy - 16, cx + 16, cy + 16, [rgb(BRASS[0]), rgb(BRASS[1]), rgb(BRASS[2])]); ctx.fill(); ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = 'rgba(30,14,4,.9)'; for (let i = 0; i < 4; i++) { const aa = a * side + i * TAU / 4 + 0.4; circ(ctx, cx + Math.cos(aa) * 5, cy + Math.sin(aa) * 5, 1.8); ctx.fill(); }
        bolt(ctx, cx, cy, 2.2, STEEL);
        const an = Math.sin(t * Math.PI) * 0.22, ax = cx, ay = cy - 20;
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(an);
        ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-11, 9); ctx.lineTo(0, 0); ctx.lineTo(11, 9); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
        ctx.strokeStyle = rgb(STEEL[1]); ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = rgb(STEEL[0], 0.8); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-10.5, 8); ctx.lineTo(-0.5, -0.5); ctx.stroke();
        ctx.restore(); bolt(ctx, ax, ay, 2, STEEL);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx + 4, y0 + 30); ctx.lineTo(rx + rw * 0.6, y0 + 12); ctx.stroke();
      } else if (kind === 'dial') {
        // a big wall clock module with a carved bezel, its minute hand jumping on every beat
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { bi: 5, br: 2.2 });
        const cx = X(d - 19), cy = y0 + H * 0.62, R = 15.5;
        ctx.fillStyle = 'rgba(30,14,4,.45)'; circ(ctx, cx + 1.5, cy + 2, R + 3.5); ctx.fill();
        ctx.fillStyle = K.lg(ctx, cx - R, cy - R, cx + R, cy + R, [rgb(BRASS[0]), rgb(BRASS[1]), rgb(BRASS[3])]); circ(ctx, cx, cy, R + 3.5); ctx.fill();
        ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 0.9; ctx.stroke();
        for (let i = 0; i < 24; i++) { const aa = i * TAU / 24; ctx.fillStyle = rgb(i % 2 ? BRASS[2] : BRASS[0], 0.8); circ(ctx, cx + Math.cos(aa) * (R + 1.8), cy + Math.sin(aa) * (R + 1.8), 0.7); ctx.fill(); }
        ctx.fillStyle = K.rg(ctx, cx - 4, cy - 5, R * 1.2, ['#fffdf4', '#f4e6c4', '#cfb486']); circ(ctx, cx, cy, R); ctx.fill();
        ctx.strokeStyle = 'rgba(110,70,36,.85)'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let i = 0; i < 60; i++) { const aa = i * TAU / 60, r1 = i % 5 ? R - 1.6 : R - 3.6; ctx.moveTo(cx + Math.cos(aa) * (R - 0.6), cy + Math.sin(aa) * (R - 0.6)); ctx.lineTo(cx + Math.cos(aa) * r1, cy + Math.sin(aa) * r1); }
        ctx.stroke();
        ctx.lineCap = 'round'; ctx.strokeStyle = '#4a2a14';
        const ma = tickA(t, TAU / 60) - Math.PI / 2 + 0.4; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * (R - 3), cy + Math.sin(ma) * (R - 3)); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(2.4) * (R - 7), cy + Math.sin(2.4) * (R - 7)); ctx.stroke();
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 0.7; const sa = ph(t, 1) * TAU - Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx - Math.cos(sa) * 3, cy - Math.sin(sa) * 3); ctx.lineTo(cx + Math.cos(sa) * (R - 2), cy + Math.sin(sa) * (R - 2)); ctx.stroke();
        ctx.fillStyle = '#c0392b'; circ(ctx, cx, cy, 1.5); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, R - 3, 3.7, 4.6); ctx.stroke();
      } else if (kind === 'governor') {
        // a flyball governor spinning in a deep niche
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { bi: 5 });
        const rx = Math.min(X(6), X(d - 5)), rw = d - 11;
        recess(ctx, rx, y0 + 10, rw, H - 20, 5);
        const cx = rx + rw / 2, top = y0 + 22, a = t * 5;
        ctx.fillStyle = tubeGrad(ctx, cx - 1.5, 0, cx + 1.5, 0, STEEL); ctx.fillRect(cx - 1.5, top - 6, 3, H - 34);
        for (const ph2 of [0, Math.PI]) {
          const s = Math.sin(a + ph2), c = Math.cos(a + ph2), bx = cx + s * 9, by = top + 18, back = c < 0;
          if (back) { ctx.strokeStyle = rgb(STEEL[2]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(bx, by); ctx.stroke(); ctx.fillStyle = K.rg(ctx, bx - 1.5, by - 1.5, 6, [rgb(BRASS[1]), rgb(BRASS[2]), rgb(BRASS[3])]); circ(ctx, bx, by, 4.2); ctx.fill(); }
        }
        ctx.fillStyle = K.lg(ctx, cx - 5, 0, cx + 5, 0, [rgb(BRASS[0]), rgb(BRASS[2])]); ctx.fillRect(cx - 4.5, top + 26, 9, 4);
        for (const ph2 of [0, Math.PI]) {
          const s = Math.sin(a + ph2), c = Math.cos(a + ph2), bx = cx + s * 9, by = top + 18;
          if (c >= 0) { ctx.strokeStyle = rgb(STEEL[1]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(bx, by); ctx.lineTo(cx, top + 27); ctx.stroke(); ctx.fillStyle = K.rg(ctx, bx - 2, by - 2, 7, [rgb(BRASS[0]), rgb(BRASS[1]), rgb(BRASS[2])]); circ(ctx, bx, by, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,240,.85)'; circ(ctx, bx - 1.6, by - 1.6, 1.2); ctx.fill(); }
        }
        bolt(ctx, cx, top, 2.2, BRASS);
        // a drive belt down to a pulley
        const py = y1 - 22; ctx.fillStyle = K.rg(ctx, cx - 2, py - 2, 8, [rgb(COPPER[0]), rgb(COPPER[1]), rgb(COPPER[2])]); circ(ctx, cx, py, 6); ctx.fill(); bolt(ctx, cx, py, 1.6, STEEL);
      } else if (kind === 'pistonmount') {
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { bolts: false });
        for (let y = y0 + 9; y < y1 - 4; y += 15) { bolt(ctx, X(6), y, 2.4, BRASSW); bolt(ctx, X(d - 18), y + 7, 2, BRASSW); }
        ctx.strokeStyle = rgb(BRASSW[3], 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(12), y0 + 6); ctx.lineTo(X(12), y1 - 6); ctx.stroke();
        ctx.strokeStyle = rgb(BRASSW[0], 0.5); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(X(12) + 1.4, y0 + 6); ctx.lineTo(X(12) + 1.4, y1 - 6); ctx.stroke();
      } else if (kind === 'train') {
        // a glazed window onto a gear train turning on the beat
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { bi: 5, br: 2.3 });
        const rx = Math.min(X(6), X(d - 6)), rw = d - 12;
        recess(ctx, rx, y0 + 10, rw, H - 20, 6);
        ctx.save(); ctx.beginPath(); ctx.roundRect(rx, y0 + 10, rw, H - 20, 6); ctx.clip();
        const g1x = rx + rw * 0.42, g1y = y0 + H * 0.4;
        gear(ctx, g1x, g1y, 17, 14, side * tickA(t, TAU / 14), BRASS, { spokes: 4, rin: 11, hub: 4.5, lw: 1 });
        gear(ctx, g1x + 15, g1y + 21, 11, 9, -side * tickA(t, TAU / 9) * 14 / 9 + 0.2, COPPER, { spokes: 0, holes: 4, hub: 3.4, lw: 0.9 });
        gear(ctx, g1x - 6, g1y + 34, 9, 8, -side * tickA(t, TAU / 8) * 14 / 8, STEEL, { spokes: 0, holes: 3, hub: 3, lw: 0.9 });
        ctx.restore();
        add(ctx, () => { ctx.strokeStyle = 'rgba(255,240,210,.16)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(rx + 2, y0 + 50); ctx.lineTo(rx + rw - 2, y0 + 22); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx + 2, y0 + 60); ctx.lineTo(rx + rw - 2, y0 + 32); ctx.stroke(); });
      } else if (kind === 'pipes') {
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, BRASSW, { emboss: false, bi: 5 });
        for (const [yy, rr, C] of [[y0 + 16, 4, COPPER], [y0 + 34, 3, BRASS], [y0 + 50, 4.5, COPPER]]) {
          const ex = X(d - 4);
          ctx.fillStyle = tubeGrad(ctx, 0, yy - rr, 0, yy + rr, C); ctx.fillRect(Math.min(X(0), ex), yy - rr, Math.abs(ex - X(0)), rr * 2);
          ctx.fillStyle = K.rg(ctx, ex - 2, yy - 2, rr + 3, [rgb(C[0]), rgb(C[1]), rgb(C[2])]); circ(ctx, ex, yy, rr + 1.6); ctx.fill(); ctx.strokeStyle = rgb(C[3]); ctx.lineWidth = 0.8; ctx.stroke();
          const fx = X(d * 0.45); ctx.fillStyle = tubeGrad(ctx, 0, yy - rr - 2, 0, yy + rr + 2, C); ctx.fillRect(fx - 2.5, yy - rr - 2, 5, rr * 2 + 4);
        }
      }
    }
    // beat lamps: amber glasses near the rim that flash on every tick
    const bk = beatK(t);
    for (const [y, dd] of side < 0 ? [[230, 10], [470, 10]] : [[300, 10], [458, 12]]) {
      const lx = X(CLOCK.base - dd);
      K.glow(ctx, lx, y, 14 + bk * 10, [255, 180, 70], 0.2 + bk * 0.55);
      ctx.fillStyle = K.rg(ctx, lx - 1.2, y - 1.2, 5, [bk > 0.3 ? '#fffbe0' : '#ffdf9a', '#ffaa30', '#b05a10']); circ(ctx, lx, y, 3.8); ctx.fill();
      ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 1.4; circ(ctx, lx, y, 4.5); ctx.stroke();
    }
  }
  CLOCK.farShape = clockFar; CLOCK.wallDeco = clockWall;

  // Gear Grinder: a huge cog half-buried in the left wall; it ticks a tooth per beat, shudders, then whirls
  function gearGrinder(ctx, t, ex, y) {
    const p = ph(t, 4), n = 12, step = TAU / n, R = 80, cx = ex - 22;
    let a = 0;
    for (let k = 0; k < 3; k++) a += step * backOut((p - k) / 0.18);
    const spin = ease((p - 3.0) / 0.75); a += (TAU + step) * spin;
    const tell = p > 2.35 && p < 3 ? (p - 2.35) / 0.65 : 0, whirl = p > 3 && p < 3.75 ? Math.sin(Math.PI * (p - 3) / 0.75) : 0;
    const sh = tell ? Math.sin(t * 95) * 1.4 * tell : 0;
    const dyR = Math.sqrt(R * R - (ex - cx) ** 2);
    K.danger(ctx, ex + 30, y, 70, 0.22 + 0.3 * whirl + 0.15 * tell);
    // the slot in the wall it turns out of
    ctx.fillStyle = K.lg(ctx, ex - 9, 0, ex, 0, ['rgba(20,10,4,.95)', 'rgba(50,28,10,.9)']);
    ctx.beginPath(); ctx.roundRect(ex - 9, y - dyR - 8, 10, dyR * 2 + 16, 4); ctx.fill();
    // the gear (only the part outside the wall)
    ctx.save(); ctx.beginPath(); ctx.rect(ex - 7, y - R - 4, 200, 2 * R + 8); ctx.clip();
    gear(ctx, cx + sh, y, R, n, a, BRASS, { depth: 12, rin: 52, spokes: 6, hub: 18, lw: 1.4 });
    // steel tooth faces glinting
    ctx.restore();
    // motion streaks while it whirls
    if (whirl > 0.05) add(ctx, () => {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = rgb([255, 236, 180], 0.35 * whirl); ctx.lineWidth = 2.5 - i * 0.6;
        ctx.beginPath(); ctx.arc(cx, y, R - 4 - i * 9, -1.1 + i * 0.2 + a % 0.5, 0.9 - i * 0.15 + a % 0.5); ctx.stroke();
      }
    });
    // sparks where the teeth bite back into the wall at the bottom of the slot
    if (whirl > 0.1) {
      const sx = ex, sy = y + dyR - 2, rs = K.rand(Math.floor(t * 20));
      add(ctx, () => {
        K.glow(ctx, sx, sy, 22, [255, 190, 80], 0.6 * whirl);
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const ang = 0.15 + rs() * 1.2, L = 6 + rs() * 16;
          ctx.strokeStyle = rgb([255, 230 - i * 8, 140], 0.9 * whirl); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(sx + 2, sy); ctx.lineTo(sx + 2 + Math.cos(ang) * L, sy + Math.sin(ang) * L); ctx.stroke();
        }
      });
    }
    // brass cheek plates capping the slot, and a warning lamp that goes red in the tell
    for (const d of [-1, 1]) {
      const yy = y + d * (dyR + 6);
      ctx.fillStyle = K.lg(ctx, 0, yy - 7, 0, yy + 7, [BRASS[0], BRASS[1], BRASS[2]]);
      ctx.beginPath(); ctx.roundRect(ex - 14, yy - 7, 20, 14, 4); ctx.fill(); ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 1; ctx.stroke();
      rivet(ctx, ex - 9, yy, 1.6); rivet(ctx, ex + 1, yy, 1.6);
    }
    const lampOn = tell ? (Math.sin(t * 30) > 0 ? 1 : 0.25) : whirl ? 1 : 0.15, ly = y - dyR - 18;
    K.glow(ctx, ex - 2, ly, 18, [255, 70, 60], 0.65 * lampOn);
    ctx.fillStyle = K.rg(ctx, ex - 3.4, ly - 1.6, 6, lampOn > 0.5 ? ['#fff0e8', '#ff5a4a', '#a8201c'] : ['#e88a80', '#a8302a', '#5a1a16']); circ(ctx, ex - 2, ly, 4.4); ctx.fill();
    ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 1.4; circ(ctx, ex - 2, ly, 5); ctx.stroke();
    // a jet of steam from the slot in the tell
    if (tell) for (let i = 0; i < 3; i++) { const u = ph(t * 3 + i / 3, 1); puff(ctx, ex + 6 + u * 18, y - dyR - 4 - u * 14, 3 + u * 6, (1 - u) * 0.7 * tell); }
  }

  // Piston Slam: a steam ram in the right wall; the gauge climbs and it hisses, then it slams out across and draws back
  function pistonSlam(ctx, t, ex, y) {
    const p = ph(t, 4), MAX = 112;
    let e;
    if (p < 1) e = -4 * ease(p);
    else if (p < 1.1) e = lerp(-4, MAX, easeIn((p - 1) / 0.1));
    else if (p < 1.65) e = MAX - 6 * Math.exp(-(p - 1.1) * 9) * Math.abs(Math.sin((p - 1.1) * 30));
    else if (p < 2.25) e = MAX * (1 - ease((p - 1.65) / 0.6));
    else e = 0;
    const tell = p < 1 ? p : 0, sh = tell > 0.4 ? Math.sin(t * 90) * 1.2 * tell : 0;
    const fx = ex - 12, headW = 26, hx = fx - e - headW + sh, hh = 58;
    // danger glow under the ram head
    K.danger(ctx, hx + headW / 2, y, 46 + 10 * (e / MAX), 0.25 + 0.25 * (e / MAX));
    // rod: thick sleeve then a polished piston rod
    const rodL = fx - (hx + headW);
    if (rodL > 0) {
      ctx.fillStyle = tubeGrad(ctx, 0, y - 7, 0, y + 7, STEEL); ctx.fillRect(hx + headW - 2, y - 6, rodL + 4, 12);
      ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 0.9; ctx.strokeRect(hx + headW - 2, y - 6, rodL + 4, 12);
      const sl = Math.min(rodL, 46); ctx.fillStyle = tubeGrad(ctx, 0, y - 10, 0, y + 10, BRASS); ctx.fillRect(fx - sl, y - 9, sl, 18);
      ctx.strokeStyle = rgb(BRASS[3]); ctx.strokeRect(fx - sl, y - 9, sl, 18);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(hx + headW, y - 3.6, rodL, 1.2);
    }
    // the ram head: a riveted iron block with a brass face plate and hazard stripes
    ctx.save();
    ctx.fillStyle = K.lg(ctx, hx, y - hh / 2, hx + headW, y + hh / 2, ['#9aa4b8', '#5e6680', '#363c52']);
    ctx.beginPath(); ctx.roundRect(hx + 5, y - hh / 2 + 3, headW - 3, hh - 6, 4); ctx.fill(); ctx.strokeStyle = '#2c3044'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, hx, y - hh / 2, hx + 10, y + hh / 2, [BRASS[0], BRASS[1], BRASS[2]]);
    ctx.beginPath(); ctx.roundRect(hx, y - hh / 2, 10, hh, [6, 2, 2, 6]); ctx.fill(); ctx.strokeStyle = rgb(BRASS[3]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,220,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx + 2.5, y - hh / 2 + 5); ctx.lineTo(hx + 2.5, y + hh / 2 - 8); ctx.stroke();
    // stripes on the block
    ctx.save(); ctx.beginPath(); ctx.rect(hx + 11, y - hh / 2 + 6, headW - 12, hh - 12); ctx.clip();
    for (let k = -4; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffcc3c' : '#8a2a1e'; ctx.beginPath(); const yy = y - hh / 2 + k * 9; ctx.moveTo(hx + 10, yy); ctx.lineTo(hx + 10 + headW, yy - 10); ctx.lineTo(hx + 10 + headW, yy - 1); ctx.lineTo(hx + 10, yy + 9); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(hx + 11.5, y - hh / 2 + 6.5, headW - 13, hh - 13);
    for (const yy of [y - hh / 2 + 4, y + hh / 2 - 4]) for (const xx of [hx + 13, hx + headW - 1]) rivet(ctx, xx, yy, 1.4, STEEL);
    ctx.restore();
    // the cylinder housing: a flanged brass drum bolted to the wall
    ctx.fillStyle = K.lg(ctx, fx, y - 26, fx + 14, y + 26, [BRASS[0], BRASS[1], BRASS[2]]);
    ctx.beginPath(); ctx.roundRect(fx - 2, y - 26, 16, 52, 5); ctx.fill(); ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, fx - 6, 0, fx + 2, 0, [COPPER[0], COPPER[2]]); ctx.beginPath(); ctx.roundRect(fx - 6, y - 15, 8, 30, 3); ctx.fill(); ctx.strokeStyle = rgb(COPPER[3]); ctx.stroke();
    for (const yy of [y - 20, y - 7, y + 7, y + 20]) rivet(ctx, fx + 6, yy, 1.6);
    ctx.strokeStyle = 'rgba(255,250,220,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(fx + 1, y - 22); ctx.lineTo(fx + 1, y + 10); ctx.stroke();
    // steam pipe and pressure gauge above it
    const gx = fx + 2, gy = y - 42;
    ctx.fillStyle = tubeGrad(ctx, gx - 2.5, 0, gx + 2.5, 0, COPPER); ctx.fillRect(gx - 2.5, gy, 5, 18);
    ctx.fillStyle = K.rg(ctx, gx - 3, gy - 3, 11, ['#fffaf0', '#f0e2c4', '#c8ae84']); circ(ctx, gx, gy, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(200,40,30,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, 6.6, -0.5, 0.7); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,70,40,.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.55; ctx.moveTo(gx + Math.cos(a) * 7.6, gy + Math.sin(a) * 7.6); ctx.lineTo(gx + Math.cos(a) * 6, gy + Math.sin(a) * 6); } ctx.stroke();
    const na = p < 1 ? lerp(-2.5, 0.55, easeIn(p)) + Math.sin(t * 60) * 0.05 * p : p < 1.3 ? 0.55 : lerp(0.55, -2.5, ease((p - 1.3) / 1));
    ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * 6.5, gy + Math.sin(na) * 6.5); ctx.stroke();
    ctx.strokeStyle = K.lg(ctx, gx - 10, gy - 10, gx + 10, gy + 10, [BRASS[0], BRASS[2]]); ctx.lineWidth = 2.6; circ(ctx, gx, gy, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 7.5, 3.7, 4.7); ctx.stroke();
    // hissing steam in the tell, a big blast of it as it fires
    if (p < 1) for (let i = 0; i < 4; i++) { const u = ph(t * 2.4 + i / 4, 1); puff(ctx, fx - 4 - u * 16, y - 28 - u * 18 + i, 2.5 + u * 6, (1 - u) * 0.75 * clamp(p * 2, 0, 1)); }
    if (p > 1 && p < 2.4) {
      const u = (p - 1) / 1.4;
      for (const [dy, s] of [[-1, 1], [1, 0.85]]) for (let i = 0; i < 3; i++) puff(ctx, fx - 6 - u * (20 + i * 12), y + dy * (24 + u * 16 + i * 4), (5 + i * 2) * (0.6 + u) * s, (1 - u) * 0.85);
    }
  }

  // Cuckoo Punch: a carved wall clock; it chimes, the doors snap open and a cuckoo shoots out on a spring
  function cuckooPunch(ctx, t, ex, y) {
    const p = ph(t, 4), LM = 74;
    ctx.save(); ctx.translate(ex, y); ctx.scale(1.5, 1.5); ctx.translate(-ex, -y);
    const tell = p > 1.55 && p < 2 ? (p - 1.55) / 0.45 : 0;
    let L = 0;
    if (p >= 2 && p < 2.15) L = LM * easeOut((p - 2) / 0.15);
    else if (p >= 2.15 && p < 2.9) L = LM + 11 * Math.exp(-(p - 2.15) * 6) * Math.sin((p - 2.15) * 34);
    else if (p >= 2.9 && p < 3.2) L = LM * (1 - ease((p - 2.9) / 0.3));
    const open = p > 1.97 && p < 3.25 ? (p < 2.04 ? (p - 1.97) / 0.07 : p > 3.18 ? (3.25 - p) / 0.07 : 1) : 0;
    const sh = tell ? Math.sin(t * 80) * 1.1 * tell : 0;
    const cx = ex + 16 + sh, top = y - 24, bot = y + 26, hw = 17;
    const WD = [[214, 150, 96], [150, 92, 50], [92, 52, 26], [70, 36, 18]];
    // pine-cone weights and chains hanging below
    ctx.lineCap = 'round';
    for (const [dx, len] of [[-7, 16 + Math.sin(t * 0.5) * 2], [7, 8]]) {
      ctx.strokeStyle = 'rgba(120,90,50,.9)'; ctx.lineWidth = 1; ctx.beginPath(); for (let yy = bot; yy < bot + len; yy += 3) { ctx.moveTo(cx + dx - 1, yy); ctx.lineTo(cx + dx + 1, yy + 2.6); } ctx.stroke();
      const wy = bot + len + 8;
      ctx.fillStyle = K.lg(ctx, cx + dx - 4, wy - 8, cx + dx + 4, wy + 8, [BRASS[0], BRASS[1], BRASS[3]]);
      ctx.beginPath(); ctx.moveTo(cx + dx, wy - 9); ctx.quadraticCurveTo(cx + dx + 5.5, wy - 4, cx + dx + 3.2, wy + 7); ctx.quadraticCurveTo(cx + dx, wy + 10, cx + dx - 3.2, wy + 7); ctx.quadraticCurveTo(cx + dx - 5.5, wy - 4, cx + dx, wy - 9); ctx.fill();
      ctx.strokeStyle = rgb(BRASS[3], 0.8); ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 4; k++) { const yy = wy - 5 + k * 3.4; ctx.moveTo(cx + dx - 3.6, yy); ctx.quadraticCurveTo(cx + dx, yy + 2.2, cx + dx + 3.6, yy); } ctx.stroke();
    }
    // pendulum swinging on the beat
    const pa = Math.sin(t * Math.PI) * 0.35;
    ctx.save(); ctx.translate(cx, bot - 2); ctx.rotate(pa);
    ctx.strokeStyle = rgb(BRASS[2]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, -1.5, 22, 6, [BRASS[0], BRASS[1], BRASS[2]]); ctx.beginPath(); ctx.ellipse(0, 25, 4, 5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
    // body of the clock house
    ctx.fillStyle = K.lg(ctx, cx - hw, top, cx + hw, bot, [WD[0], WD[1], WD[2]]);
    ctx.beginPath(); ctx.roundRect(cx - hw, top, hw * 2, bot - top, 3); ctx.fill(); ctx.strokeStyle = rgb(WD[3]); ctx.lineWidth = 1.2; ctx.stroke();
    // carved trim: wood grain and a leafy border
    ctx.strokeStyle = rgb(WD[2], 0.6); ctx.lineWidth = 0.7; ctx.beginPath();
    for (const gx of [-12, -4, 6, 13]) { ctx.moveTo(cx + gx, top + 3); ctx.bezierCurveTo(cx + gx + 1.5, top + 18, cx + gx - 1.5, bot - 18, cx + gx, bot - 3); }
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      for (const d of [-1, 1]) {
        const lx = cx + d * (hw - 3), ly = top + 6 + i * 7.6;
        ctx.fillStyle = K.lg(ctx, lx - 2, ly - 2, lx + 2, ly + 2, ['#a8c870', '#5a7a34']); ctx.beginPath(); ctx.ellipse(lx, ly, 1.8, 3.4, d * 0.5, 0, TAU); ctx.fill();
      }
    }
    // the dial
    const dy = y + 9;
    ctx.fillStyle = K.rg(ctx, cx - 3, dy - 4, 13, ['#fffdf4', '#f4e6c4', '#cfb486']); circ(ctx, cx, dy, 10.5); ctx.fill();
    ctx.strokeStyle = K.lg(ctx, cx - 11, dy - 11, cx + 11, dy + 11, [BRASS[0], BRASS[2]]); ctx.lineWidth = 2.2; circ(ctx, cx, dy, 11.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,70,36,.85)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.moveTo(cx + Math.cos(a) * 9.6, dy + Math.sin(a) * 9.6); ctx.lineTo(cx + Math.cos(a) * (i % 3 ? 8.4 : 7.2), dy + Math.sin(a) * (i % 3 ? 8.4 : 7.2)); } ctx.stroke();
    const mA = -Math.PI / 2 + (p < 2 ? -(2 - p) * 0.25 : 0) - (Math.floor(t / 4)) * 0;
    ctx.strokeStyle = '#4a2a14'; ctx.lineCap = 'round'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx, dy); ctx.lineTo(cx + Math.cos(mA) * 8, dy + Math.sin(mA) * 8); ctx.stroke();
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, dy); ctx.lineTo(cx + Math.cos(-Math.PI / 2 - 0.02) * 5, dy + Math.sin(-Math.PI / 2) * 5); ctx.stroke();
    ctx.fillStyle = '#c0392b'; circ(ctx, cx, dy, 1.4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, dy, 8.2, 3.7, 4.6); ctx.stroke();
    // roof: a pitched gable of scalloped shingles with a carved eave
    const ry = top + 2, peak = top - 22;
    ctx.fillStyle = K.lg(ctx, cx - hw - 6, peak, cx + hw + 6, ry, ['#a8503a', '#7a3020', '#4e1c14']);
    ctx.beginPath(); ctx.moveTo(cx - hw - 7, ry + 2); ctx.lineTo(cx, peak); ctx.lineTo(cx + hw + 7, ry + 2); ctx.lineTo(cx + hw + 3, ry + 5); ctx.lineTo(cx, peak + 6); ctx.lineTo(cx - hw - 3, ry + 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3e140e'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,150,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - hw - 5, ry); ctx.lineTo(cx - 1, peak + 1.5); ctx.stroke();
    // gable front (cream plaster) with the little doors
    ctx.fillStyle = K.lg(ctx, cx, peak + 6, cx, ry + 5, ['#f4e4c4', '#d8bc90']);
    ctx.beginPath(); ctx.moveTo(cx - hw - 3, ry + 5); ctx.lineTo(cx, peak + 6); ctx.lineTo(cx + hw + 3, ry + 5); ctx.closePath(); ctx.fill();
    const dX = cx, dY = ry - 1, dw = 6, dh = 9;
    ctx.fillStyle = '#2a140a'; ctx.beginPath(); ctx.roundRect(dX - dw, dY - dh, dw * 2, dh + 2, [dw, dw, 0, 0]); ctx.fill();
    for (const d of [-1, 1]) {
      const lw = dw * (1 - open * 0.85), hx = dX + d * dw, x0 = hx - d * lw;
      ctx.fillStyle = K.lg(ctx, Math.min(hx, x0), dY - dh, Math.max(hx, x0), dY, open > 0.5 ? ['#7a3a20', '#4e2010'] : ['#c87a44', '#8a4a22']);
      ctx.beginPath(); ctx.moveTo(hx, dY + 2); ctx.lineTo(hx, dY - dh + (d < 0 ? 3 : 3)); ctx.quadraticCurveTo(hx, dY - dh, x0, dY - dh + 1); ctx.lineTo(x0, dY + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a200e'; ctx.lineWidth = 0.7; ctx.stroke();
      if (open < 0.5) { ctx.fillStyle = '#ffd860'; circ(ctx, dX + d * 1.6, dY - 3, 0.7); ctx.fill(); }
    }
    // a little bell on the peak that swings and rings in the tell
    const bA = tell ? Math.sin(t * 40) * 0.5 : 0;
    ctx.save(); ctx.translate(cx, peak - 1); ctx.rotate(bA);
    ctx.fillStyle = K.rg(ctx, -1.5, -5, 6, [BRASS[0], BRASS[1], BRASS[2]]); ctx.beginPath(); ctx.moveTo(-4.2, 0); ctx.quadraticCurveTo(-4, -6.5, 0, -6.8); ctx.quadraticCurveTo(4, -6.5, 4.2, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(BRASS[3]); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.restore();
    if (tell || (p > 2 && p < 2.4)) {
      const k = tell ? 1 : 1 - (p - 2) / 0.4;
      add(ctx, () => {
        for (let i = 0; i < 3; i++) {
          const u = ph(t * 3 + i / 3, 1), r = 6 + u * 16;
          ctx.strokeStyle = rgb([255, 230, 150], (1 - u) * 0.8 * k); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(cx, peak - 4, r, -2.6, -0.5); ctx.stroke();
        }
      });
    }
    // the cuckoo on its spring
    if (L > 1) {
      const ang = -0.14, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
      const sx0 = dX, sy0 = dY - 4, bx = sx0 + ux * L, by = sy0 + uy * L;
      K.danger(ctx, bx, by, 34, 0.42);
      // the coiled spring: back half darker, front half lit
      const coils = 9, N = 90;
      for (const pass of [0, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const u = i / N, th = u * coils * TAU, front = Math.cos(th) > 0;
          const px = sx0 + ux * u * (L - 8) + vx * Math.sin(th) * 4.2, py = sy0 + uy * u * (L - 8) + vy * Math.sin(th) * 4.2;
          if ((pass === 1) === front) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.strokeStyle = pass ? rgb(STEEL[0]) : rgb(STEEL[2]); ctx.lineWidth = pass ? 1.6 : 1.8; ctx.lineCap = 'round'; ctx.stroke();
      }
      // the bird: a chunky carved and painted cuckoo, beak wide, very cross
      ctx.save(); ctx.translate(bx, by); ctx.rotate(ang * 0.4);
      ctx.fillStyle = K.lg(ctx, -14, -2, -6, 6, ['#3fa58c', '#1f6a5a']);
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-20, -6); ctx.lineTo(-19, -1); ctx.lineTo(-21, 3); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#174a40'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = K.rg(ctx, -4, -7, 18, ['#ffb27a', '#e85a3a', '#9a2a22']); ctx.beginPath(); ctx.ellipse(0, 0, 13, 10.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a1e18'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, 10, ['#fff4dc', '#e8cc9a']); ctx.beginPath(); ctx.ellipse(3, 4.5, 7.5, 5.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(190,140,80,.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (const yy of [3, 5.5, 8]) { ctx.moveTo(-1, yy); ctx.quadraticCurveTo(3, yy + 1.4, 7, yy); } ctx.stroke();
      ctx.fillStyle = K.lg(ctx, -9, -6, -1, 6, ['#58c8a8', '#2a7e68']); ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-2, -7, 1, -1); ctx.quadraticCurveTo(-3, 5, -11, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-8, -2.4); ctx.quadraticCurveTo(-3, -4.5, -0.5, -1); ctx.stroke();
      // crest
      ctx.fillStyle = '#e85a3a'; ctx.beginPath(); ctx.moveTo(1, -9.5); ctx.quadraticCurveTo(-1, -16, -5, -14); ctx.quadraticCurveTo(-2, -12, -3, -9); ctx.closePath(); ctx.fill();
      // beak (open)
      const gape = 0.6 + 0.4 * Math.abs(Math.sin(t * 18));
      ctx.fillStyle = '#7a1e22'; ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(20, -3 - gape * 2); ctx.lineTo(20, 1 + gape * 2); ctx.lineTo(10, 1.5); ctx.fill();
      ctx.fillStyle = K.lg(ctx, 10, -6, 10, 0, ['#ffe680', '#f0a020']); ctx.beginPath(); ctx.moveTo(9.5, -5); ctx.quadraticCurveTo(16, -6 - gape * 2, 21, -3.5 - gape * 2.4); ctx.lineTo(10, -1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = K.lg(ctx, 10, 0, 10, 5, ['#f6c040', '#c87818']); ctx.beginPath(); ctx.moveTo(10, 0.4); ctx.lineTo(20, 1.6 + gape * 2.2); ctx.quadraticCurveTo(15, 4.4, 9.5, 3); ctx.closePath(); ctx.fill();
      K.eyes(ctx, 4.5, -4, 3.6, 3, '#3fb894', 1, 1);
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 3.5, 4.3); ctx.stroke();
      ctx.restore();
      // speed lines as it shoots out
      if (p > 2 && p < 2.25) add(ctx, () => { const k = 1 - (p - 2) / 0.25; ctx.strokeStyle = rgb([255, 240, 200], 0.6 * k); ctx.lineWidth = 1.2; for (const o of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(bx - ux * 18 + vx * o, by - uy * 18 + vy * o); ctx.lineTo(bx - ux * 40 + vx * o, by - uy * 40 + vy * o); ctx.stroke(); } });
    }
    ctx.restore();
  }

  PV.sections['clockwork'] = (ctx, w, h, t) => {
    const S = machineShaft(ctx, w, h, t, CLOCK);
    // warm light pools along the rims (from the clock window above and the beat lamps)
    add(ctx, () => {
      for (const [x, y, r, a] of [[S.L(0), 60, 90, 0.22], [S.R(0), 90, 80, 0.2], [S.L(0), 380, 60, 0.1], [S.R(0), 330, 70, 0.12]]) {
        ctx.fillStyle = K.rg(ctx, x, y, r, [K.rgb([255, 214, 140], a), K.rgb([255, 190, 110], 0)]); ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    coin(ctx, 176, 168, t, 0); coin(ctx, 150, 262, t, 1.3); coin(ctx, 176, 350, t, 2.1);
    gearGrinder(ctx, t, S.L(110), 108);
    pistonSlam(ctx, t, S.R(214), 214);
    cuckooPunch(ctx, t, S.L(306), 304);
    const p = ph(t, 4), dodge = p > 0.6 && p < 2.6 ? -Math.sin(Math.PI * (p - 0.6) / 2) * 10 : 0;
    K.rocket(ctx, w * 0.5 + dodge, h * 0.8, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 226, 170], 30, 7);
    K.motes(ctx, w, h, t, 'pollen', [255, 214, 120], 10, 9);
  };

  // =====================================================================================================
  // KOOKY LAB: cool tiles, glass tubes of bubbling green, pink warning lights, a professor's gadgets
  // =====================================================================================================
  const LAB = {
    bgTop: [86, 118, 130], bgBot: [30, 44, 58], far: [72, 100, 114], far2: [58, 84, 100],
    wall: [104, 132, 144], wallIn: [34, 48, 58], rim: [176, 246, 120], inset: 30, wobble: 0, seed: 4,
  };
  const SLIME = [[226, 255, 160], [167, 232, 106], [92, 170, 52], [52, 112, 30]];
  const PINK = [[255, 200, 226], [255, 111, 174], [196, 52, 120], [130, 28, 80]];
  const MINT = [[220, 248, 240], [126, 206, 196], [62, 132, 132], [38, 88, 92]];

  // a glass vessel outline helper: fill liquid, glass tint, rim and glints
  function bubbles(ctx, x0, x1, yTop, yBot, t, n, seed, c = [230, 255, 190], sp = 22) {
    const r = K.rand(seed);
    for (let i = 0; i < n; i++) {
      const bx = lerp(x0, x1, r()), ph0 = r(), s = 0.8 + r() * 1.6, v = sp * (0.6 + r() * 0.8);
      const y = yBot - ((ph0 * (yBot - yTop) + t * v) % (yBot - yTop));
      ctx.strokeStyle = rgb(c, 0.75); ctx.lineWidth = 0.7; circ(ctx, bx + Math.sin(t * 3 + i) * 1.2, y, s); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; circ(ctx, bx + Math.sin(t * 3 + i) * 1.2 - s * 0.35, y - s * 0.35, s * 0.35); ctx.fill();
    }
  }

  function labFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // a giant specimen tank: deep green at the glass edges, bright in the core, lit from its base, a sleepy blob afloat
      const tx = w * 0.5, y0 = h * 0.34, y1 = h * 0.76, tw = 50, ey = 8, sy = y0 + 12;
      add(ctx, () => { ctx.fillStyle = K.rg(ctx, tx, (y0 + y1) / 2, 150, ['rgba(150,240,110,.22)', 'rgba(120,220,100,.08)', 'rgba(120,220,100,0)']); ctx.fillRect(tx - 150, y0 - 110, 300, 360); });
      ctx.fillStyle = 'rgba(30,60,56,.55)'; ctx.fillRect(tx - tw, y0, tw * 2, sy - y0);
      ctx.fillStyle = K.lg(ctx, tx - tw, 0, tx + tw, 0, [[0, 'rgba(34,84,64,.85)'], [0.28, 'rgba(120,204,116,.7)'], [0.5, 'rgba(164,236,134,.66)'], [0.74, 'rgba(110,190,108,.7)'], [1, 'rgba(30,74,60,.88)']]);
      ctx.beginPath(); ctx.moveTo(tx - tw, sy); ctx.lineTo(tx - tw, y1); ctx.ellipse(tx, y1, tw, ey, 0, Math.PI, 0, true); ctx.lineTo(tx + tw, sy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = K.lg(ctx, 0, y1 - 60, 0, y1, ['rgba(200,255,160,0)', 'rgba(210,255,170,.35)']); ctx.fillRect(tx - tw, y1 - 60, tw * 2, 60);
      ctx.fillStyle = 'rgba(206,255,176,.6)'; ctx.beginPath(); ctx.ellipse(tx, sy, tw, ey * 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(240,255,220,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(tx, sy, tw - 1, ey * 0.7, 0, 0.1, Math.PI - 0.1); ctx.stroke();
      // the specimen
      const by = (y0 + y1) / 2 + Math.sin(t * 1.1) * 4;
      add(ctx, () => K.glow(ctx, tx, by, 40, [190, 255, 160], 0.18));
      ctx.fillStyle = K.rg(ctx, tx - 8, by - 9, 30, ['rgba(110,176,110,.9)', 'rgba(70,130,84,.85)', 'rgba(50,104,70,.85)']); ctx.beginPath(); ctx.ellipse(tx, by, 24, 21, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(66,124,82,.85)'; ctx.beginPath(); ctx.ellipse(tx - 25, by + 4, 9, 4, 0.6 + Math.sin(t * 1.3) * 0.2, 0, TAU); ctx.ellipse(tx + 25, by + 4, 9, 4, -0.6 - Math.sin(t * 1.3) * 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(36,84,56,.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(tx + d * 8, by - 4, 4, 0.3, Math.PI - 0.3); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(tx, by + 6, 3, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,255,200,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(tx, by, 17, 3.6, 4.6); ctx.stroke();
      bubbles(ctx, tx - tw + 6, tx + tw - 6, sy + 4, y1 - 4, t, 10, 77, [220, 255, 200], 16);
      bubbles(ctx, tx - 34, tx - 30, sy + 4, y1, t, 5, 78, [230, 255, 210], 34); bubbles(ctx, tx + 28, tx + 32, sy + 4, y1, t, 5, 79, [230, 255, 210], 30);
      // glass: rim highlights, a curved reflection down the left, a thin line on the right
      add(ctx, () => {
        ctx.fillStyle = K.lg(ctx, tx - tw + 4, 0, tx - tw + 16, 0, ['rgba(240,255,250,0)', 'rgba(240,255,250,.32)', 'rgba(240,255,250,0)']);
        ctx.beginPath(); ctx.moveTo(tx - tw + 5, y0 + 4); ctx.quadraticCurveTo(tx - tw + 9, (y0 + y1) / 2, tx - tw + 6, y1 + 2); ctx.lineTo(tx - tw + 16, y1 + 4); ctx.quadraticCurveTo(tx - tw + 20, (y0 + y1) / 2, tx - tw + 15, y0 + 4); ctx.fill();
        ctx.strokeStyle = 'rgba(240,255,250,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx - tw + 22, y0 + 6); ctx.quadraticCurveTo(tx - tw + 25, (y0 + y1) / 2, tx - tw + 22, y1); ctx.stroke();
        ctx.strokeStyle = 'rgba(240,255,250,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx + tw - 4, y0 + 6); ctx.lineTo(tx + tw - 4, y1); ctx.stroke();
        ctx.strokeStyle = 'rgba(240,255,250,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(tx, y1, tw - 1, ey, 0, 0.2, Math.PI - 0.2); ctx.stroke();
      });
      // caps: a bolted steel collar on top with pipes going up, a lit pedestal below with indicator lamps
      const cap = (cy, ch, cw) => {
        ctx.fillStyle = K.lg(ctx, tx - cw, 0, tx + cw, 0, [rgb(K.lift(col, 0)), rgb(K.lift(col, 40)), rgb(K.lift(col, 12)), rgb(K.lift(col, -16))]);
        ctx.fillRect(tx - cw, cy, cw * 2, ch); ctx.beginPath(); ctx.ellipse(tx, cy + ch, cw, ey * 0.8, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = rgb(K.lift(col, 54)); ctx.beginPath(); ctx.ellipse(tx, cy, cw, ey * 0.8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rgb(K.lift(col, 70), 0.8); for (let i = -4; i <= 4; i++) { circ(ctx, tx + i * cw / 5, cy + ch / 2 + 1, 1.5); ctx.fill(); }
      };
      ctx.fillStyle = rgb(col); ctx.fillRect(tx - 22, 0, 9, y0 - 14); ctx.fillRect(tx + 14, 0, 6, y0 - 14);
      cap(y0 - 14, 14, tw + 6);
      add(ctx, () => { ctx.fillStyle = K.rg(ctx, tx, y1 + 6, tw + 20, ['rgba(190,255,150,.5)', 'rgba(150,240,120,.15)', 'rgba(150,240,120,0)']); ctx.beginPath(); ctx.ellipse(tx, y1 + 6, tw + 20, 18, 0, 0, TAU); ctx.fill(); });
      cap(y1 + 2, 24, tw + 10);
      for (let i = -2; i <= 2; i++) { const on = (Math.floor(t * 2) + i + 9) % 3 === 0; const lx = tx + i * 18, ly = y1 + 20; if (on) K.glow(ctx, lx, ly, 8, [255, 110, 180], 0.5); ctx.fillStyle = on ? '#ff8cc4' : 'rgba(120,60,90,.9)'; circ(ctx, lx, ly, 2); ctx.fill(); }
      // tall bubbling columns either side and a tesla coil top right
      for (const [cx, cy0, cw] of [[w * 0.12, h * 0.12, 16], [w * 0.88, h * 0.5, 14]]) {
        ctx.fillStyle = rgb(col); ctx.fillRect(cx - cw - 3, cy0 - 8, (cw + 3) * 2, 8); ctx.fillRect(cx - cw - 3, cy0 + 150, (cw + 3) * 2, 10);
        ctx.fillStyle = 'rgba(130,200,130,.3)'; ctx.fillRect(cx - cw, cy0, cw * 2, 150);
        bubbles(ctx, cx - cw + 3, cx + cw - 3, cy0 + 3, cy0 + 148, t, 5, cx | 0, [210, 255, 190], 26);
      }
      const cx = w * 0.82, cy = h * 0.14;
      ctx.fillStyle = rgb(col); ctx.fillRect(cx - 4, cy, 8, 80);
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + 14 + i * 10, 11 - i * 0.6, 3, 0, 0, TAU); ctx.fill(); }
      circ(ctx, cx, cy - 4, 11); ctx.fill();
      const zz = Math.max(0, Math.sin(t * 5.3) * Math.sin(t * 2.1));
      if (zz > 0.35) add(ctx, () => {
        const r = K.rand(Math.floor(t * 12)); ctx.strokeStyle = rgb([255, 170, 220], 0.5 * zz); ctx.lineWidth = 1.2; ctx.beginPath();
        let x = cx, y = cy - 4; const a = r() * TAU; ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += Math.cos(a) * 6 + (r() - 0.5) * 8; y += Math.sin(a) * 6 + (r() - 0.5) * 8; ctx.lineTo(x, y); } ctx.stroke();
        K.glow(ctx, cx, cy - 4, 22, [255, 150, 210], 0.3 * zz);
      });
    } else {
      // nearer: shelves of flasks, a run of pipes with valves, a hanging lamp
      ctx.fillStyle = rgb(col);
      for (const [sx0, sy, sw] of [[w * 0.12, h * 0.42, 50], [w * 0.68, h * 0.27, 56], [w * 0.62, h * 0.86, 60]]) {
        ctx.fillRect(sx0, sy, sw, 4); ctx.fillRect(sx0 + 4, sy, 3, 10); ctx.fillRect(sx0 + sw - 7, sy, 3, 10);
        const r = K.rand(sy | 0);
        for (let x = sx0 + 6; x < sx0 + sw - 6; x += 9 + r() * 4) {
          const k = r(), hh = 8 + r() * 10;
          ctx.beginPath();
          if (k < 0.4) { ctx.moveTo(x - 1.5, sy - hh); ctx.lineTo(x + 1.5, sy - hh); ctx.lineTo(x + 5, sy); ctx.lineTo(x - 5, sy); }
          else if (k < 0.7) { ctx.arc(x, sy - 5, 5, 0, TAU); ctx.rect(x - 1.5, sy - hh - 4, 3, hh - 4); }
          else ctx.roundRect(x - 3, sy - hh, 6, hh, 2);
          ctx.fill();
        }
      }
      ctx.lineWidth = 6; ctx.strokeStyle = rgb(col); ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-5, h * 0.6); ctx.lineTo(w * 0.35, h * 0.6); ctx.lineTo(w * 0.35, h * 0.66); ctx.lineTo(w + 5, h * 0.66); ctx.stroke();
      for (const vx of [w * 0.2, w * 0.7]) { ctx.beginPath(); ctx.arc(vx, vx < w / 2 ? h * 0.6 - 7 : h * 0.66 - 7, 5, 0, TAU); ctx.lineWidth = 2; ctx.stroke(); }
      // the professor's chalkboard, scribbled with sums and a doodle of the rocket
      const cbx = w * 0.15, cby = h * 0.05, cbw = 92, cbh = 52;
      ctx.fillStyle = rgb(K.lift(col, -8)); ctx.beginPath(); ctx.roundRect(cbx - 3, cby - 3, cbw + 6, cbh + 6, 3); ctx.fill();
      ctx.fillStyle = 'rgba(44,70,66,.85)'; ctx.fillRect(cbx, cby, cbw, cbh);
      ctx.strokeStyle = 'rgba(230,240,235,.42)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.beginPath();
      const rr = K.rand(9);
      for (let row = 0; row < 4; row++) { let x = cbx + 5; const yy = cby + 9 + row * 11; while (x < cbx + cbw * 0.58) { const ww = 3 + rr() * 6; ctx.moveTo(x, yy + rr() * 2); ctx.quadraticCurveTo(x + ww / 2, yy - 3 + rr() * 3, x + ww, yy + rr() * 2); x += ww + 2.5; } }
      ctx.moveTo(cbx + 5, cby + 46); ctx.lineTo(cbx + 48, cby + 46);
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cbx + 74, cby + 26, 8, 10, 0, 0, TAU); ctx.moveTo(cbx + 70, cby + 36); ctx.lineTo(cbx + 74, cby + 46); ctx.lineTo(cbx + 78, cby + 36);
      ctx.moveTo(cbx + 62, cby + 20); ctx.lineTo(cbx + 58, cby + 12); ctx.moveTo(cbx + 86, cby + 20); ctx.lineTo(cbx + 90, cby + 12); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,150,200,.5)'; ctx.beginPath(); ctx.arc(cbx + 74, cby + 26, 14, 0, TAU); ctx.stroke();
      // a hanging lab lamp with a soft cone
      const lx = w * 0.6, ly = h * 0.04;
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx - 12, ly + 10); ctx.quadraticCurveTo(lx, ly - 4, lx + 12, ly + 10); ctx.fill();
      add(ctx, () => { ctx.fillStyle = K.lg(ctx, 0, ly + 10, 0, ly + 120, ['rgba(220,255,240,.14)', 'rgba(220,255,240,0)']); ctx.beginPath(); ctx.moveTo(lx - 10, ly + 10); ctx.lineTo(lx + 10, ly + 10); ctx.lineTo(lx + 45, ly + 120); ctx.lineTo(lx - 45, ly + 120); ctx.fill(); });
    }
  }

  // a pink rotating warning beacon (on the walls)
  function beacon(ctx, x, y, t, phz, sz = 1) {
    const a = t * 5 + phz, f = 0.5 + 0.5 * Math.cos(a);
    add(ctx, () => {
      K.glow(ctx, x, y, 26 * sz, [255, 90, 170], 0.18 + 0.4 * f);
      ctx.fillStyle = K.lg(ctx, x, y, x + Math.cos(a) * 60, y + Math.sin(a) * 18, ['rgba(255,120,190,.35)', 'rgba(255,120,190,0)']);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - 0.25) * 60, y + Math.sin(a - 0.25) * 18); ctx.lineTo(x + Math.cos(a + 0.25) * 60, y + Math.sin(a + 0.25) * 18); ctx.fill();
    });
    ctx.fillStyle = K.lg(ctx, x - 5 * sz, 0, x + 5 * sz, 0, [STEEL[0], STEEL[2]]); ctx.fillRect(x - 5 * sz, y + 3 * sz, 10 * sz, 3 * sz);
    ctx.fillStyle = K.rg(ctx, x - 1.5 * sz, y - 2 * sz, 6 * sz, ['#fff0f6', f > 0.6 ? '#ff6fae' : '#e2528f', '#9a2464']);
    ctx.beginPath(); ctx.moveTo(x - 4.2 * sz, y + 3 * sz); ctx.lineTo(x - 4.2 * sz, y - 1 * sz); ctx.arc(x, y - 1 * sz, 4.2 * sz, Math.PI, 0); ctx.lineTo(x + 4.2 * sz, y + 3 * sz); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, y - 1 * sz, 2.8 * sz, 3.6, 4.6); ctx.stroke();
  }

  const STEELW = [[226, 234, 240], [150, 166, 178], [84, 98, 112], [54, 64, 78]];
  const GROUT = [50, 72, 88];
  LAB.base = 32;
  LAB.blocks = {
    L: [[-60, 84, 32, 'tiles'], [84, 172, 44, 'pipes'], [172, 272, 38, 'mount'], [272, 398, 32, 'tilesdmg'], [398, 540, 42, 'cabinet']],
    R: [[-60, 58, 32, 'tilesvent'], [58, 162, 42, 'motor'], [162, 262, 32, 'tube'], [262, 372, 38, 'shelf'], [372, 540, 32, 'tilesbox']],
  };
  LAB.rimStops = [[176, 246, 120], [150, 240, 200], [255, 150, 200], [176, 246, 120], [140, 230, 220]];
  // glossy ceramic tiles: bevelled, a sheen glint on each, darker cool grout, the odd mint or pink tile and a crack or two
  function tiles(ctx, x, ww, y0, y1, seed, hole) {
    const T = 11, r = K.rand(seed);
    ctx.fillStyle = rgb(GROUT); ctx.fillRect(x, y0, ww, y1 - y0);
    for (let ty = Math.floor(y0 / T) * T; ty < y1; ty += T) for (let tx = Math.floor(x / T) * T; tx < x + ww; tx += T) {
      const k = r();
      if (hole && tx + T > hole[0] && tx < hole[0] + hole[2] && ty + T > hole[1] && ty < hole[1] + hole[3]) continue;
      ctx.fillStyle = k < 0.07 ? '#c6ecd8' : k < 0.11 ? '#ffd8e8' : rgb([230 - k * 16, 242 - k * 10, 246 - k * 6]);
      ctx.fillRect(tx + 0.9, ty + 0.9, T - 1.8, T - 1.8);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(tx + 1.2, ty + 1.2, T - 2.8, 0.9); ctx.fillRect(tx + 1.2, ty + 1.2, 0.9, T - 2.8);
      ctx.fillStyle = 'rgba(70,100,118,.55)'; ctx.fillRect(tx + 1.4, ty + T - 2.1, T - 2.5, 1); ctx.fillRect(tx + T - 2.1, ty + 1.4, 1, T - 2.5);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(tx + 2.4, ty + 5.4); ctx.lineTo(tx + 5.4, ty + 2.4); ctx.lineTo(tx + 6.8, ty + 2.4); ctx.lineTo(tx + 2.4, ty + 6.8); ctx.fill();
      if (k > 0.95) { ctx.strokeStyle = 'rgba(60,84,100,.8)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(tx + 1, ty + 3); ctx.lineTo(tx + 4.5, ty + 5); ctx.lineTo(tx + 5.5, ty + 9.5); ctx.moveTo(tx + 4.5, ty + 5); ctx.lineTo(tx + 9.5, ty + 4); ctx.stroke(); }
    }
    if (hole) {
      // missing tiles: a dark cavity with a conduit and tangled wiring, chipped tile edges round it
      const [hx, hy, hw, hh] = hole;
      recess(ctx, hx, hy, hw, hh, 1.5, 'rgba(14,20,28,.95)');
      ctx.save(); ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.clip();
      pipeV(ctx, hx + hw * 0.3, hy - 4, hy + hh + 4, 3, COPPER, 30, 6);
      ctx.lineCap = 'round';
      for (const [c, o, a] of [['#e8404c', 0, 1], ['#ffcc3c', 5, -1], ['#3aa8ff', 9, 1]]) {
        ctx.strokeStyle = c; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx + hw, hy + 4 + o); ctx.bezierCurveTo(hx + hw * 0.3, hy + hh * 0.3 + o * a, hx + hw * 0.9, hy + hh * 0.7 - o, hx + hw * 0.2, hy + hh + 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#eef6f8';
      for (let i = 0; i < 6; i++) { const ex = hx + (i % 3) * hw / 2.5, ey = i < 3 ? hy : hy + hh; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 3, ey + (i < 3 ? 3 : -3)); ctx.lineTo(ex + 5, ey); ctx.fill(); }
    }
  }
  function labWall(ctx, side, X, w, h, t, blocks) {
    for (const [y0, y1, d, kind] of blocks) {
      const [x, ww] = span(X, -4, d), H = y1 - y0, seed = (y0 + 61) * (side + 3);
      const tileUp = (hole) => { tiles(ctx, x, ww, y0, y1, seed, hole); ctx.fillStyle = K.lg(ctx, X(0), 0, X(d), 0, ['rgba(20,34,46,.45)', 'rgba(20,34,46,0)']); ctx.fillRect(x, y0, ww, H); };
      if (kind === 'tiles' || kind === 'tilesvent' || kind === 'tilesbox' || kind === 'tilesdmg' || kind === 'tube' || kind === 'shelf') {
        tileUp(kind === 'tilesdmg' ? [Math.min(X(4), X(26)), y0 + 34, 22, 33] : null);
        // a riveted steel edge-guard down the tiles' inner edge
        const gx = Math.min(X(d - 4), X(d)); ctx.fillStyle = tubeGrad(ctx, gx, 0, gx + 4, 0, STEELW); ctx.fillRect(gx, y0, 4, H);
        for (let y = y0 + 8; y < y1; y += 22) rivet(ctx, gx + 2, y, 1, STEEL);
      }
      if (kind === 'tilesvent') {
        const vx = Math.min(X(4), X(28)), vy = y0 + 70;
        plate(ctx, vx, vy, 24, 30, STEELW, { bi: 3, br: 1.2 });
        for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(14,20,28,.92)'; ctx.fillRect(vx + 4, vy + 5 + i * 3.6, 16, 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(vx + 4, vy + 7 + i * 3.6, 16, 0.7); }
        hazard(ctx, vx + 2, vy - 7, 20, 4, 3);
      } else if (kind === 'tilesbox') {
        // a fuse box with a big lever and a pink lamp, and a hazard band
        const bx = Math.min(X(4), X(28)), by = y0 + 26;
        plate(ctx, bx, by, 24, 40, STEELW, { bi: 3, br: 1.2 });
        hazard(ctx, bx + 3, by + 4, 18, 5, 3);
        recess(ctx, bx + 7, by + 13, 10, 20, 2, 'rgba(20,28,36,.95)');
        const la = 0.5 + 0.1 * Math.sin(t * 2); ctx.strokeStyle = rgb(STEEL[1]); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 12, by + 28); ctx.lineTo(bx + 12 + Math.sin(la) * 9 * side * -1, by + 28 - Math.cos(la) * 12); ctx.stroke();
        ctx.fillStyle = K.rg(ctx, bx + 11, by + 15, 4, ['#ff9aa8', '#e02a44', '#8a1428']); circ(ctx, bx + 12 + Math.sin(la) * 9 * side * -1, by + 28 - Math.cos(la) * 12, 2.6); ctx.fill();
        beacon(ctx, bx + 12, by + 50, t, 2, 0.8);
      } else if (kind === 'tilesdmg') {
        beacon(ctx, X(14), y0 + 100, t, 4.2, 0.9);
      } else if (kind === 'tube') {
        // a big glass tube of bubbling green in a bolted channel
        const tx = X(15), ty0 = y0 + 10, ty1 = y1 - 10;
        recess(ctx, tx - 9, ty0 - 4, 18, ty1 - ty0 + 8, 4, 'rgba(14,22,30,.92)');
        const lv = ty0 + 12 + Math.sin(t * 1.5) * 3;
        ctx.fillStyle = K.lg(ctx, tx - 6.5, 0, tx + 6.5, 0, [rgb(SLIME[3]), rgb(SLIME[1]), rgb(SLIME[0]), rgb(SLIME[2]), rgb(SLIME[3])]); ctx.fillRect(tx - 6.5, lv, 13, ty1 - lv);
        ctx.fillStyle = rgb(SLIME[0], 0.9); ctx.beginPath(); ctx.ellipse(tx, lv, 6.5, 1.6, 0, 0, TAU); ctx.fill();
        add(ctx, () => { ctx.fillStyle = rgb(SLIME[1], 0.1); ctx.fillRect(tx - 14, ty0, 28, ty1 - ty0); });
        bubbles(ctx, tx - 4.5, tx + 4.5, lv + 2, ty1 - 2, t, 9, y0 | 0, [240, 255, 210], 26);
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(tx - 4.6, ty0, 1.6, ty1 - ty0); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(tx + 3.6, ty0, 0.8, ty1 - ty0);
        for (const cy of [ty0 - 1, ty1 + 1]) plate(ctx, tx - 10, cy - 5, 20, 10, STEELW, { bi: 2.6, br: 1, r: 2 });
        for (let yy = ty0 + 26; yy < ty1 - 14; yy += 26) { ctx.fillStyle = tubeGrad(ctx, 0, yy - 2, 0, yy + 2, STEELW); ctx.fillRect(tx - 9, yy - 2, 18, 4); }
      } else if (kind === 'shelf') {
        // perforated steel uprights that hold the shelf and bench
        for (const dd of [6, 22]) { const ux = Math.min(X(dd), X(dd + 6)); ctx.fillStyle = tubeGrad(ctx, ux, 0, ux + 6, 0, STEELW); ctx.fillRect(ux, y0, 6, H); for (let y = y0 + 6; y < y1; y += 9) { ctx.fillStyle = 'rgba(20,28,36,.85)'; ctx.fillRect(ux + 2, y, 2, 4); } }
      } else if (kind === 'pipes') {
        tileUp();
        // a run of big pipes with bolted flanges, a hand-wheel valve and a gauge
        pipeV(ctx, X(d - 10), y0 - 2, y1 + 2, 6, STEELW, 34, 4);
        pipeV(ctx, X(d - 25), y0 - 2, y1 + 2, 4, COPPER, 30, 14);
        // an elbow off the copper pipe back into the wall
        const ey = y0 + 18; ctx.fillStyle = tubeGrad(ctx, 0, ey - 4, 0, ey + 4, COPPER); ctx.fillRect(Math.min(X(-4), X(d - 25)), ey - 4, Math.abs(d - 21), 8);
        valveWheel(ctx, X(d - 10), y0 + H * 0.55, 8, t * 0.3);
        const gx = X(d - 25), gy = y0 + H * 0.78; ctx.fillStyle = K.rg(ctx, gx - 2, gy - 2, 8, ['#ffffff', '#e4eef0', '#a8bcc4']); circ(ctx, gx, gy, 6.5); ctx.fill();
        ctx.strokeStyle = K.lg(ctx, gx - 7, gy - 7, gx + 7, gy + 7, [STEEL[0], STEEL[2]]); ctx.lineWidth = 2; circ(ctx, gx, gy, 7); ctx.stroke();
        const na = -2 + Math.sin(t * 3) * 0.6; ctx.strokeStyle = '#2a3a46'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * 5, gy + Math.sin(na) * 5); ctx.stroke();
      } else if (kind === 'mount') {
        // the ray gun's heavy mounting plate, hazard-striped top and bottom
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, STEELW, { bi: 6, br: 2.4 });
        hazard(ctx, x + 4, y0 + 12, ww - 8, 7, 4); hazard(ctx, x + 4, y1 - 19, ww - 8, 7, 4);
        recess(ctx, Math.min(X(8), X(d - 8)), y0 + 26, d - 16, H - 52, 4, 'rgba(30,40,52,.9)');
        for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(160,180,196,.4)'; ctx.fillRect(Math.min(X(11), X(d - 11)), y0 + 34 + i * 10, d - 22, 1.2); }
      } else if (kind === 'motor') {
        // the grabber's motor housing: louvres, a spinning fan, a cable loom and a little dial
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, STEELW, { bi: 5, br: 2 });
        hazard(ctx, x + 4, y0 + 8, ww - 8, 6, 4);
        const fx = X(d * 0.48), fy = y0 + 42;
        recess(ctx, fx - 13, fy - 13, 26, 26, 13, 'rgba(18,24,32,.95)');
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 9);
        for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.fillStyle = K.lg(ctx, 0, -2, 0, 9, [STEEL[0], STEEL[2]]); ctx.beginPath(); ctx.ellipse(0, -6, 3.2, 6, 0.4, 0, TAU); ctx.fill(); }
        ctx.restore(); bolt(ctx, fx, fy, 2.2, STEEL);
        ctx.strokeStyle = 'rgba(220,234,240,.75)'; ctx.lineWidth = 0.9; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(fx - 12, fy + i * 4.5); ctx.lineTo(fx + 12, fy + i * 4.5); ctx.stroke(); }
        ctx.strokeStyle = K.lg(ctx, fx - 13, fy - 13, fx + 13, fy + 13, [STEEL[0], STEEL[3]]); ctx.lineWidth = 2; circ(ctx, fx, fy, 13); ctx.stroke();
        ctx.lineCap = 'round';
        for (const [c, o] of [['#e8404c', 0], ['#3aa8ff', 3], ['#ffcc3c', 6]]) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-4), y0 + 68 + o); ctx.bezierCurveTo(X(d * 0.4), y0 + 90 + o, X(d * 0.6), y0 + 62 + o, X(d - 4), y0 + 80 + o); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.6; ctx.stroke(); }
      } else if (kind === 'cabinet') {
        // a steel lab cabinet: two drawers with handles and a hazard kick plate
        plate(ctx, x + 1, y0 + 1, ww - 2, H - 2, STEELW, { bi: 5, br: 1.8 });
        for (let i = 0; i < 2; i++) {
          const dy = y0 + 14 + i * 32; plate(ctx, Math.min(X(5), X(d - 6)), dy, d - 11, 26, STEELW, { bolts: false, r: 2 });
          const hx = X(d * 0.5); ctx.fillStyle = tubeGrad(ctx, 0, dy + 10, 0, dy + 15, STEEL); ctx.beginPath(); ctx.roundRect(hx - 7, dy + 10, 14, 4.5, 2); ctx.fill();
          ctx.fillStyle = '#f4f8fa'; ctx.fillRect(hx - 5, dy + 4, 10, 4); ctx.fillStyle = 'rgba(60,80,100,.7)'; ctx.fillRect(hx - 4, dy + 5.5, 8, 0.8);
        }
        hazard(ctx, x + 3, y0 + 84, ww - 6, 8, 4);
      }
    }
  }
  LAB.farShape = labFar; LAB.wallDeco = labWall;

  // Grabber Arm: a robot claw on a telescoping arm; it opens wide, shoots across, snaps shut and reels back
  function grabberArm(ctx, t, ex, y) {
    const p = ph(t, 4, 0.2);
    let e = 0, open = 0.25 + 0.08 * Math.sin(t * 6);
    if (p < 0.6) { e = 0; }
    else if (p < 1.2) { const u = (p - 0.6) / 0.6; e = -6 * ease(u); open = lerp(0.3, 1, ease(u * 1.5)); }
    else if (p < 1.45) { e = lerp(-6, 128, easeOut((p - 1.2) / 0.25)); open = 1; }
    else if (p < 1.58) { e = 128; open = 1 - easeIn((p - 1.45) / 0.13); }
    else if (p < 2.7) { e = 128 * (1 - ease((p - 1.58) / 1.12)); open = 0; }
    else { open = Math.min(0.3, (p - 2.7) * 0.6); }
    const tell = p > 0.6 && p < 1.2;
    const sx = ex - 4, hx = sx - 34 - e;            // shoulder at the wall, claw hub out in the shaft
    // danger glow at the claw
    K.danger(ctx, hx - 10, y, 40, 0.24 + (p > 1.2 && p < 1.7 ? 0.25 : 0));
    // telescoping arm: three nested mint-painted tubes with chrome collars
    const L = sx - hx, segs = [[11, 0, 0.45], [9, 0.35, 0.8], [7.2, 0.7, 1]];
    for (const [th, a0, a1] of segs) {
      const x0 = sx - L * a0, x1 = sx - L * a1;
      if (x0 - x1 < 1) continue;
      ctx.fillStyle = tubeGrad(ctx, 0, y - th, 0, y + th, MINT); ctx.fillRect(x1, y - th, x0 - x1, th * 2);
      ctx.strokeStyle = rgb(MINT[3]); ctx.lineWidth = 0.9; ctx.strokeRect(x1, y - th, x0 - x1, th * 2);
      ctx.fillStyle = tubeGrad(ctx, 0, y - th - 1.5, 0, y + th + 1.5, STEEL); ctx.fillRect(x1 - 1, y - th - 1.5, 4, th * 2 + 3);
    }
    // a striped hose spiralling along it
    ctx.lineCap = 'round';
    for (const pass of [0, 1]) {
      ctx.beginPath();
      for (let x = sx; x > hx + 12; x -= 2) { const th = (sx - x) * 0.18, yy = y + Math.sin(th) * 9, front = Math.cos(th) > 0; if ((pass === 1) === front) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
      ctx.strokeStyle = pass ? rgb(PINK[1]) : rgb(PINK[3]); ctx.lineWidth = 2.2; ctx.stroke();
    }
    // the claw: a round hub with two cartoon eyes and two hooked steel fingers
    ctx.save(); ctx.translate(hx, y); ctx.scale(1.4, 1.4); ctx.translate(-hx, -y);
    const ang = 0.15 + open * 0.75;
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(hx - 4, y + d * 5); ctx.rotate(d * ang);
      ctx.beginPath(); ctx.moveTo(0, -3.2 * d); ctx.quadraticCurveTo(-16, -6 * d, -24, 2 * d); ctx.quadraticCurveTo(-26, 6 * d, -21, 7 * d);
      ctx.quadraticCurveTo(-20, 3 * d, -16, 2.5 * d); ctx.quadraticCurveTo(-8, 2 * d, 0, 4 * d); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, 0, -6, 0, 7, d < 0 ? [STEEL[0], STEEL[1], STEEL[2]] : [STEEL[1], STEEL[2], STEEL[3]]); ctx.fill();
      ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -2.4 * d); ctx.quadraticCurveTo(-14, -4.6 * d, -21, 0); ctx.stroke();
      // red-tipped hook
      ctx.fillStyle = K.rg(ctx, -23, 4 * d, 5, ['#ffb0a8', '#ff4a4a', '#a81c24']); circ(ctx, -22.5, 4.6 * d, 2.6); ctx.fill();
      rivet(ctx, -1, 0, 1.6, STEEL);
      ctx.restore();
    }
    ctx.fillStyle = K.rg(ctx, hx - 3, y - 5, 14, [PINK[0], PINK[1], PINK[2]]); circ(ctx, hx + 2, y, 11); ctx.fill();
    ctx.strokeStyle = rgb(PINK[3]); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, y - 7, 0, y + 7, [STEEL[0], STEEL[2]]); ctx.beginPath(); ctx.roundRect(hx + 9, y - 7, 6, 14, 2); ctx.fill();
    K.eyes(ctx, hx + 1, y - 1, 4.2, 3.3, '#a7e86a', -0.8, tell || (p > 1.2 && p < 1.7) ? 1 : 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hx + 2, y, 8, 3.6, 4.4); ctx.stroke();
    ctx.restore();
    // snap! lines as it closes
    if (p > 1.45 && p < 1.75) add(ctx, () => {
      const k = 1 - (p - 1.45) / 0.3; ctx.strokeStyle = rgb([255, 255, 230], 0.85 * k); ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.45; ctx.beginPath(); ctx.moveTo(hx - 40 + Math.cos(a) * 9, y + Math.sin(a) * 9); ctx.lineTo(hx - 40 + Math.cos(a) * 17, y + Math.sin(a) * 17); ctx.stroke(); }
    });
    // shoulder housing on the wall, with a pink warning lamp that flashes in the tell
    ctx.fillStyle = K.rg(ctx, sx - 4, y - 8, 22, [STEEL[0], STEEL[1], STEEL[2]]); circ(ctx, sx + 2, y, 15); ctx.fill();
    ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx + 2, y, 11, 3.5, 4.6); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; rivet(ctx, sx + 2 + Math.cos(a) * 11.5, y + Math.sin(a) * 11.5, 1.1, STEEL); }
    ctx.fillStyle = K.rg(ctx, sx, y - 2, 8, [MINT[0], MINT[1], MINT[2]]); circ(ctx, sx + 2, y, 6.5); ctx.fill();
    const lampOn = tell ? (Math.sin(t * 28) > 0 ? 1 : 0.2) : 0.15;
    beacon(ctx, sx + 2, y - 21, t, 0, 0.9);
    if (lampOn > 0.5) K.glow(ctx, sx + 2, y - 22, 26, [255, 80, 160], 0.6);
  }

  // Shrink Ray: a retro ray gun on a wall bracket; its coils light up in turn, then a pink shrinking beam crosses the shaft
  function shrinkRay(ctx, t, ex, y, ex2) {
    const p = ph(t, 4, 1.0);
    ctx.save(); ctx.translate(ex, y); ctx.scale(1.25, 1.25); ctx.translate(-ex, -y); ex2 = ex + (ex2 - ex) / 1.25;
    const charge = p < 1.3 ? p / 1.3 : 0, fire = p >= 1.3 && p < 1.85 ? (p - 1.3) / 0.55 : -1, cool = p >= 1.85 && p < 2.6 ? 1 - (p - 1.85) / 0.75 : 0;
    const gx = ex + 6, tip = gx + 58, recoil = fire >= 0 && fire < 0.25 ? -3 * (1 - fire / 0.25) : 0;
    // beam
    if (fire >= 0) {
      const k = Math.sin(Math.PI * clamp(fire * 1.15, 0, 1)) ** 0.5, x1 = ex2 + 2;
      add(ctx, () => {
        ctx.fillStyle = K.lg(ctx, 0, y - 14, 0, y + 14, ['rgba(255,111,174,0)', rgb([255, 111, 174], 0.45 * k), 'rgba(255,111,174,0)']); ctx.fillRect(tip, y - 14, x1 - tip, 28);
        ctx.fillStyle = K.lg(ctx, 0, y - 5, 0, y + 5, ['rgba(255,200,230,0)', rgb([255, 210, 240], 0.9 * k), 'rgba(255,200,230,0)']); ctx.fillRect(tip, y - 5, x1 - tip, 10);
        ctx.fillStyle = rgb([255, 255, 255], 0.9 * k); ctx.fillRect(tip, y - 1.2, x1 - tip, 2.4);
        // shrinking rings travelling down the beam
        for (let i = 0; i < 5; i++) {
          const u = ph(fire * 2.2 + i / 5, 1), rx = tip + u * (x1 - tip), rr = 12 * (1 - u * 0.65);
          ctx.strokeStyle = rgb([255, 170, 220], 0.85 * k * (1 - u * 0.5)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(rx, y, rr * 0.35, rr, 0, 0, TAU); ctx.stroke();
        }
        K.glow(ctx, x1, y, 26, [255, 120, 190], 0.6 * k);
        K.glow(ctx, tip, y, 24, [255, 180, 230], 0.8 * k);
      });
      // little chevrons pointing inward: you get smaller
      ctx.strokeStyle = rgb([255, 240, 250], 0.8 * k); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (const cxv of [tip + 60, tip + 120]) { if (cxv > x1 - 8) continue; ctx.beginPath(); ctx.moveTo(cxv - 4, y - 11); ctx.lineTo(cxv, y - 7); ctx.lineTo(cxv + 4, y - 11); ctx.moveTo(cxv - 4, y + 11); ctx.lineTo(cxv, y + 7); ctx.lineTo(cxv + 4, y + 11); ctx.stroke(); }
    }
    ctx.save(); ctx.translate(recoil, 0);
    // power cable from the wall into the back of the gun
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 4, y - 16); ctx.bezierCurveTo(ex + 6, y - 26, gx - 4, y - 16, gx + 1, y - 4); ctx.stroke();
    ctx.strokeStyle = rgb(PINK[1], 0.8); ctx.lineWidth = 0.9; ctx.stroke();
    // wall bracket: a bolted plate, an arm out to a swivel joint under the gun
    plate(ctx, ex - 10, y + 2, 12, 28, STEELW, { bi: 3, br: 1.3 });
    ctx.fillStyle = tubeGrad(ctx, 0, y + 15, 0, y + 22, STEEL); ctx.fillRect(ex, y + 15, gx + 15 - ex, 7);
    ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 0.8; ctx.strokeRect(ex, y + 15, gx + 15 - ex, 7);
    ctx.fillStyle = tubeGrad(ctx, 0, y + 12, 0, y + 25, STEEL); ctx.fillRect(ex - 1, y + 12, 4, 13);
    // pistol grip with finger grooves, dropping to the swivel
    ctx.fillStyle = K.lg(ctx, gx + 8, 0, gx + 21, 0, ['#a87450', '#6a3e22', '#4a2814']);
    ctx.beginPath(); ctx.moveTo(gx + 8, y + 5); ctx.lineTo(gx + 19, y + 5); ctx.lineTo(gx + 21, y + 17); ctx.quadraticCurveTo(gx + 15, y + 21, gx + 10, y + 17); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a1e0e'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,8,.6)'; ctx.lineWidth = 0.8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(gx + 9 + k * 0.5, y + 8.5 + k * 3); ctx.lineTo(gx + 19.6 + k * 0.4, y + 8.5 + k * 3); ctx.stroke(); }
    ctx.fillStyle = K.rg(ctx, gx + 13, y + 16, 6, [STEEL[0], STEEL[1], STEEL[2]]); circ(ctx, gx + 15, y + 18.5, 4.6); ctx.fill(); ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 0.8; ctx.stroke();
    bolt(ctx, gx + 15, y + 18.5, 1.6, STEEL);
    // swept tail fins
    for (const d of [-1, 1]) {
      ctx.fillStyle = K.lg(ctx, 0, y + d * 6, 0, y + d * 16, [rgb(PINK[0]), rgb(PINK[1]), rgb(PINK[2])]);
      ctx.beginPath(); ctx.moveTo(gx + 6, y + d * 7); ctx.lineTo(gx - 5, y + d * 15); ctx.lineTo(gx + 1, y + d * 15.5); ctx.lineTo(gx + 14, y + d * 8.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(PINK[3]); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(gx + 5, y + d * 7.6); ctx.lineTo(gx - 3, y + d * 14); ctx.stroke();
    }
    // body: a stubby enamel cylinder with chrome bands and a domed chrome back cap
    ctx.fillStyle = tubeGrad(ctx, 0, y - 9, 0, y + 9, MINT); ctx.beginPath(); ctx.roundRect(gx + 1, y - 9, 28, 18, [7, 3, 3, 7]); ctx.fill();
    ctx.strokeStyle = rgb(MINT[3]); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.rg(ctx, gx, y - 3, 9, [CHROME[0], CHROME[1], CHROME[2]]); ctx.beginPath(); ctx.ellipse(gx + 2, y, 4.5, 8.6, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    for (const bx of [gx + 9, gx + 23]) { ctx.fillStyle = tubeGrad(ctx, 0, y - 10, 0, y + 10, STEEL); ctx.fillRect(bx - 1.8, y - 9.8, 3.6, 19.6); ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 0.6; ctx.strokeRect(bx - 1.8, y - 9.8, 3.6, 19.6); }
    for (const rx of [gx + 13, gx + 17.5]) { rivet(ctx, rx, y - 5.5, 0.9, STEEL); rivet(ctx, rx, y + 5.5, 0.9, STEEL); }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(gx + 5, y - 6.2); ctx.lineTo(gx + 27, y - 6.2); ctx.stroke();
    // a glass charge capsule on top showing the energy level
    const lvl = fire >= 0 ? 1 - fire : charge;
    ctx.fillStyle = 'rgba(40,24,50,.9)'; ctx.beginPath(); ctx.roundRect(gx + 11, y - 15, 11, 6, 3); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, y - 15, 0, y - 9, ['#ffd0ea', '#ff5aa8']); ctx.beginPath(); ctx.roundRect(gx + 11.5, y - 14.5, 10 * lvl + 0.01, 5, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,255,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.roundRect(gx + 11, y - 15, 11, 6, 3); ctx.stroke();
    ctx.fillStyle = tubeGrad(ctx, 0, y - 10, 0, y - 8, STEEL); ctx.fillRect(gx + 12, y - 9.5, 2, 1.5); ctx.fillRect(gx + 19, y - 9.5, 2, 1.5);
    // barrel: a chrome tube wound with a copper coil and stacked with cooling rings that glow as it charges
    ctx.fillStyle = tubeGrad(ctx, 0, y - 3.5, 0, y + 3.5, STEEL); ctx.fillRect(gx + 29, y - 3.5, 22, 7);
    ctx.strokeStyle = rgb(COPPER[1]); ctx.lineWidth = 1.1; ctx.beginPath(); for (let k = 0; k <= 10; k++) { const xx = gx + 29 + k * 2; ctx.moveTo(xx, y - 3.6); ctx.lineTo(xx + 1.2, y + 3.6); } ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const cx = gx + 31 + i * 5, rr = 8.5 - i * 0.9, lit = fire >= 0 ? 1 : clamp(charge * 4.2 - i, 0, 1);
      if (lit > 0.1) K.glow(ctx, cx, y, 12, [255, 110, 190], 0.5 * lit);
      ctx.fillStyle = K.lg(ctx, 0, y - rr, 0, y + rr, lit > 0.5 ? ['#fff0f8', '#ff8cc4', '#c03a84'] : [CHROME[0], CHROME[1], CHROME[2]]);
      ctx.beginPath(); ctx.ellipse(cx, y, 1.8, rr, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = lit > 0.5 ? rgb(PINK[3]) : CHROME[4]; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // the emitter dish facing the shaft, struts out to an antenna prong
    const dx = gx + 51;
    ctx.fillStyle = K.lg(ctx, 0, y - 12, 0, y + 12, [CHROME[0], CHROME[1], CHROME[2]]); ctx.beginPath(); ctx.ellipse(dx, y, 3.6, 12, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = CHROME[4]; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, dx, y - 10, dx + 3, y + 10, ['#5a6080', '#9aa4c0', '#e8eef8']); ctx.beginPath(); ctx.ellipse(dx + 1, y, 2.4, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,230,.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(dx + 1.2, y, 1.4, 6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgb(STEEL[1]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx + 1, y - 10); ctx.lineTo(tip - 2, y); ctx.lineTo(dx + 1, y + 10); ctx.moveTo(dx + 1, y); ctx.lineTo(tip - 2, y); ctx.stroke();
    const ballK = fire >= 0 ? 1 : charge;
    K.glow(ctx, tip + 1, y, 10 + 14 * ballK, [255, 140, 210], 0.25 + 0.6 * ballK);
    ctx.fillStyle = K.rg(ctx, tip, y - 1.5, 5, ['#ffffff', ballK > 0.5 ? '#ffb0dc' : '#e8a0c8', '#c0408a']); circ(ctx, tip + 1, y, 3.6); ctx.fill();
    ctx.restore();
    // charging: sparkles drawn into the tip
    if (charge > 0.15) for (let i = 0; i < 6; i++) {
      const u = ph(t * 1.6 + i / 6, 1), a = i * 1.05 + 0.4, rr = 24 * (1 - u);
      twinkle(ctx, tip + 1 + Math.cos(a) * rr, y + Math.sin(a) * rr, 2.4 * (0.4 + u), charge * (0.3 + u * 0.7), [255, 200, 235]);
    }
    if (cool > 0) for (let i = 0; i < 2; i++) { const u = ph(t * 1.5 + i / 2, 1); puff(ctx, tip + 2 + u * 6, y - 4 - u * 18, 2 + u * 5, cool * (1 - u) * 0.5, [235, 225, 240]); }
    ctx.restore();
  }

  // scenery: a bench on the left wall with a Bunsen burner boiling a pink flask over, and a rack of test tubes
  function labBench(ctx, t, ex, y) {
    const x0 = ex - 4, bw = 58;
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 8, ['#e8f0f4', '#a4b6c0', '#607482']); ctx.beginPath(); ctx.roundRect(x0, y, bw, 7, 2); ctx.fill(); ctx.strokeStyle = '#4a5c68'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, x0, 0, x0 + 14, 0, [STEEL[1], STEEL[3]]); ctx.beginPath(); ctx.moveTo(x0, y + 7); ctx.lineTo(x0 + 14, y + 7); ctx.lineTo(x0, y + 26); ctx.closePath(); ctx.fill();
    // test tube rack
    const rx = x0 + 6;
    ctx.fillStyle = K.lg(ctx, 0, y - 10, 0, y, ['#c08a5a', '#7a4a28']); ctx.fillRect(rx, y - 6, 20, 3); ctx.fillRect(rx + 1, y - 3, 2, 3); ctx.fillRect(rx + 17, y - 3, 2, 3);
    [[rx + 4, SLIME], [rx + 10, PINK], [rx + 16, [[180, 230, 255], [80, 170, 240], [40, 100, 180], [30, 70, 130]]]].forEach(([tx, C], i) => {
      ctx.fillStyle = K.lg(ctx, tx - 2, 0, tx + 2, 0, [rgb(C[1]), rgb(C[0]), rgb(C[2])]); ctx.beginPath(); ctx.roundRect(tx - 2, y - 13 + i, 4, 13 - i, [0, 0, 2, 2]); ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.roundRect(tx - 2.2, y - 20, 4.4, 20, [0, 0, 2.2, 2.2]); ctx.stroke();
    });
    // burner and boiling flask
    const bx = x0 + 42;
    ctx.fillStyle = K.lg(ctx, bx - 3, 0, bx + 3, 0, [STEEL[0], STEEL[2]]); ctx.fillRect(bx - 2, y - 9, 4, 9); ctx.fillRect(bx - 5, y - 2, 10, 2);
    const fl = 1 + Math.sin(t * 30) * 0.15;
    add(ctx, () => { ctx.fillStyle = K.lg(ctx, 0, y - 9, 0, y - 9 - 9 * fl, ['rgba(120,200,255,.95)', 'rgba(80,120,255,0)']); ctx.beginPath(); ctx.moveTo(bx - 2.5, y - 9); ctx.quadraticCurveTo(bx, y - 9 - 12 * fl, bx + 2.5, y - 9); ctx.fill(); K.glow(ctx, bx, y - 12, 12, [120, 180, 255], 0.4); });
    ctx.strokeStyle = rgb(STEEL[2]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 9, y - 19); ctx.lineTo(bx + 9, y - 19); ctx.moveTo(bx - 8, y - 19); ctx.lineTo(bx - 10, y); ctx.moveTo(bx + 8, y - 19); ctx.lineTo(bx + 10, y); ctx.stroke();
    const fy = y - 27;
    ctx.save(); ctx.beginPath(); ctx.arc(bx, fy, 8, 0, TAU); ctx.clip();
    ctx.fillStyle = K.rg(ctx, bx - 3, fy - 2, 11, [rgb(PINK[0]), rgb(PINK[1]), rgb(PINK[2])]); ctx.fillRect(bx - 9, fy - 3 + Math.sin(t * 8) * 0.8, 18, 12);
    ctx.restore();
    ctx.fillStyle = 'rgba(230,245,255,.2)'; circ(ctx, bx, fy, 8); ctx.fill(); ctx.strokeStyle = 'rgba(220,240,255,.9)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = 'rgba(230,245,255,.25)'; ctx.fillRect(bx - 2.2, fy - 17, 4.4, 10); ctx.strokeRect(bx - 2.2, fy - 17, 4.4, 10);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, fy, 5.5, 3.5, 4.5); ctx.stroke();
    // foam boiling over and pink bubbles drifting up
    ctx.fillStyle = K.rg(ctx, bx - 2, fy - 20, 7, ['#ffffff', '#ffd0e6', '#ff8cc0']);
    ctx.beginPath(); for (const [dx, dy, r] of [[0, -18, 3.6], [-3, -16.5, 2.6], [3.2, -17, 2.8], [4.6, -14, 1.8]]) { ctx.moveTo(bx + dx + r, fy + dy); ctx.arc(bx + dx, fy + dy, r, 0, TAU); } ctx.fill();
    for (let i = 0; i < 4; i++) { const u = ph(t * 0.6 + i / 4, 1); const xx = bx + Math.sin(u * 7 + i) * 6, yy = fy - 22 - u * 50; ctx.strokeStyle = rgb([255, 170, 210], 0.8 * (1 - u)); ctx.lineWidth = 0.9; circ(ctx, xx, yy, 1.5 + u * 2); ctx.stroke(); }
  }

  // Slime Flask: a flask on a shelf wobbles, topples, and smashes into a sticky green puddle on the bench below
  function slimeFlask(ctx, t, ex, y, yb) {
    const p = ph(t, 4, 2.4);
    // the shelf with its bottles
    const sx0 = ex - 48;
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 6, [STEEL[0], STEEL[1], STEEL[2]]); ctx.beginPath(); ctx.roundRect(sx0, y, 50, 5, 2); ctx.fill(); ctx.strokeStyle = rgb(STEEL[3]); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = rgb(STEEL[2]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, y + 18); ctx.lineTo(sx0 + 14, y + 5); ctx.stroke();
    // a static blue bottle and a pink cone flask
    const glass = (path, liquid, ly, c) => {
      ctx.save(); path(); ctx.clip();
      ctx.fillStyle = K.lg(ctx, 0, ly, 0, y, [rgb(c[0]), rgb(c[1]), rgb(c[2])]); ctx.fillRect(sx0 - 20, ly, 90, y - ly);
      ctx.restore();
      path(); ctx.fillStyle = 'rgba(220,240,255,.18)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,226,240,.85)'; ctx.lineWidth = 1; ctx.stroke();
    };
    glass(() => { ctx.beginPath(); ctx.moveTo(sx0 + 4, y); ctx.lineTo(sx0 + 4, y - 14); ctx.quadraticCurveTo(sx0 + 4, y - 17, sx0 + 7, y - 17); ctx.lineTo(sx0 + 7, y - 21); ctx.lineTo(sx0 + 11, y - 21); ctx.lineTo(sx0 + 11, y - 17); ctx.quadraticCurveTo(sx0 + 14, y - 17, sx0 + 14, y - 14); ctx.lineTo(sx0 + 14, y); ctx.closePath(); }, 0, y - 11, [[150, 220, 255], [70, 150, 230], [40, 90, 170]]);
    ctx.fillStyle = '#d06030'; ctx.fillRect(sx0 + 6.5, y - 24, 5, 3.5);
    glass(() => { ctx.beginPath(); ctx.moveTo(sx0 + 34, y); ctx.lineTo(sx0 + 39, y - 12); ctx.lineTo(sx0 + 39, y - 19); ctx.lineTo(sx0 + 43, y - 19); ctx.lineTo(sx0 + 43, y - 12); ctx.lineTo(sx0 + 48, y); ctx.closePath(); }, 0, y - 8, [PINK[0], PINK[1], PINK[2]]);
    // the slime flask: wobble (tell), fall, smash
    const fx = sx0 + 22;
    let fy = y, rot = 0, show = 1, alpha = 1;
    if (p < 0.9) rot = Math.sin(p * 26) * 0.22 * ease(p / 0.9) + (p > 0.7 ? (p - 0.7) * 2.5 : 0);
    else if (p < 1.25) { const u = (p - 0.9) / 0.35; fy = y + easeIn(u) * (yb - y - 2); rot = 0.5 + u * 2.4; }
    else if (p < 3.4) show = 0;
    else { alpha = ease((p - 3.4) / 0.5); }
    if (p < 0.9) K.glow(ctx, fx, y - 8, 22, [170, 240, 110], 0.25 + 0.2 * Math.sin(t * 20));
    if (show) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(fx, fy); ctx.rotate(rot); ctx.scale(1.3, 1.3);
      const fl = () => { ctx.beginPath(); ctx.moveTo(-2.6, -22); ctx.lineTo(-2.6, -13); ctx.arc(0, -6, 7.5, -Math.PI / 2 - 0.36, Math.PI * 1.5 + 0.36 - TAU, false); ctx.lineTo(2.6, -22); ctx.closePath(); };
      ctx.save(); fl(); ctx.clip();
      ctx.fillStyle = K.rg(ctx, -2.5, -8, 10, [rgb(SLIME[0]), rgb(SLIME[1]), rgb(SLIME[2])]); ctx.fillRect(-10, -10 + Math.sin(t * 9) * (p < 0.9 ? 1.5 : 0), 20, 14);
      bubbles(ctx, -5, 5, -10, 1, t, 3, 5, [240, 255, 210], 10);
      ctx.restore();
      fl(); ctx.fillStyle = 'rgba(220,255,230,.16)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,236,220,.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, -6, 5, 3.5, 4.5); ctx.stroke();
      ctx.fillStyle = '#c87a3a'; ctx.beginPath(); ctx.roundRect(-3.4, -26, 6.8, 4.5, 1.5); ctx.fill();
      ctx.restore();
    }
    // the bench ledge below
    const bx0 = ex - 56;
    ctx.fillStyle = K.lg(ctx, 0, yb, 0, yb + 8, ['#e4ecf0', '#9fb2bc', '#5e7280']); ctx.beginPath(); ctx.roundRect(bx0, yb, 58, 7, 2); ctx.fill(); ctx.strokeStyle = '#4a5c68'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, ex - 14, 0, ex, 0, [STEEL[1], STEEL[3]]); ctx.beginPath(); ctx.moveTo(ex - 14, yb + 7); ctx.lineTo(ex, yb + 7); ctx.lineTo(ex, yb + 26); ctx.closePath(); ctx.fill();
    // the splat: a glossy puddle spreading on the bench, goo drooping off its edge, shards and droplets
    if (p >= 1.25 && p < 3.6) {
      const u = (p - 1.25), grow = easeOut(u / 0.3), fade = p > 3.2 ? 1 - (p - 3.2) / 0.4 : 1, cx = fx - 4;
      K.glow(ctx, cx, yb - 2, 44 * grow, [160, 240, 100], 0.3 * fade);
      ctx.save(); ctx.globalAlpha = fade;
      // drips hanging off the bench
      for (const [dx, len, ph2] of [[-24, 18, 0], [-10, 26, 1.3], [6, 14, 2.4], [-34, 10, 0.7]]) {
        const L = len * grow * (0.8 + 0.2 * Math.sin(t * 2 + ph2)) + (u > 0.3 ? Math.min(14, (u - 0.3) * 8) : 0) * (len / 26);
        const dxp = cx + dx * grow;
        ctx.fillStyle = K.lg(ctx, dxp - 3, 0, dxp + 3, 0, [rgb(SLIME[1]), rgb(SLIME[0]), rgb(SLIME[2])]);
        ctx.beginPath(); ctx.moveTo(dxp - 3.2, yb + 4); ctx.quadraticCurveTo(dxp - 1.6, yb + 4 + L * 0.6, dxp - 2.4, yb + 4 + L); ctx.arc(dxp, yb + 4 + L, 2.4, Math.PI, 0, true); ctx.quadraticCurveTo(dxp + 1.6, yb + 4 + L * 0.6, dxp + 3.2, yb + 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,240,.8)'; circ(ctx, dxp - 0.8, yb + 3 + L, 0.8); ctx.fill();
      }
      // puddle
      ctx.fillStyle = K.rg(ctx, cx - 8, yb - 6, 34, [rgb(SLIME[0]), rgb(SLIME[1]), rgb(SLIME[2])]);
      const W2 = 30 * grow, wob = Math.sin(t * 3) * 0.6;
      ctx.beginPath();
      for (const [dx, dy, rx, ry] of [[-0.5, 0, 0.5, 5.5], [0.38, 0.5, 0.6, 5], [-0.05, -1.5, 0.46, 7.5 + wob], [-0.85, 1.5, 0.18, 3]]) { ctx.moveTo(cx + dx * W2 + rx * W2, yb + 2 + dy); ctx.ellipse(cx + dx * W2, yb + 2 + dy, rx * W2, ry * grow, 0, 0, TAU); }
      ctx.rect(cx - W2 * 0.98, yb + 1, W2 * 1.96, 3.5);
      ctx.fill();
      ctx.fillStyle = rgb(SLIME[3], 0.7); ctx.fillRect(cx - W2 * 0.98, yb + 3.4, W2 * 1.96, 1.2);
      ctx.strokeStyle = 'rgba(255,255,240,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx - 8 * grow, yb - 3 * grow, 9 * grow, 2 * grow, -0.1, 3.4, 5.4); ctx.stroke();
      // goo bubbles popping in it
      bubbles(ctx, cx - W2 * 0.7, cx + W2 * 0.7, yb - 6 * grow, yb + 2, t, 3, 9, [235, 255, 200], 6);
      // splash droplets and glass shards flying out
      if (u < 0.6) {
        const k = u / 0.6, r = K.rand(17);
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI * (0.1 + r() * 0.8), v = 30 + r() * 40, dx = Math.cos(a) * v * k, dy = Math.sin(a) * v * k + 90 * k * k;
          if (i % 3 === 0) { ctx.fillStyle = 'rgba(220,245,255,.85)'; ctx.save(); ctx.translate(cx + dx, yb - 4 + dy); ctx.rotate(k * 8 + i); ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(2.5, -0.5); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); ctx.restore(); }
          else { ctx.fillStyle = rgb(SLIME[1]); circ(ctx, cx + dx, yb - 4 + dy, 2.2 * (1 - k * 0.5)); ctx.fill(); ctx.fillStyle = 'rgba(255,255,240,.8)'; circ(ctx, cx + dx - 0.7, yb - 4.7 + dy, 0.7); ctx.fill(); }
        }
      }
      ctx.restore();
    }
  }

  PV.sections['lab'] = (ctx, w, h, t) => {
    const S = machineShaft(ctx, w, h, t, LAB);
    coin(ctx, 120, 168, t, 0.4); coin(ctx, 150, 268, t, 1.7); coin(ctx, 108, 330, t, 2.6);
    shrinkRay(ctx, t, S.L(222), 222, S.R(222));
    slimeFlask(ctx, t, S.R(290), 290, 350);
    labBench(ctx, t, S.L(436), 436);
    grabberArm(ctx, t, S.R(108), 108);
    const p = ph(t, 4, 1.0), dodge = p > 1.0 && p < 2.2 ? Math.sin(Math.PI * (p - 1.0) / 1.2) * -8 : 0;
    K.rocket(ctx, w * 0.5 + dodge, h * 0.8, 0.75, t);
    K.motes(ctx, w, h, t, 'bubble', [200, 255, 170], 16, 5);
    K.motes(ctx, w, h, t, 'spore', [190, 255, 140], 10, 12);
  };

  // =====================================================================================================
  // PIPE ORGAN CAVERN: a violet cathedral cave whose basalt columns turn into gold organ pipes; all on the beat (1 s)
  // =====================================================================================================
  const ORGAN = {
    bgTop: [100, 80, 156], bgBot: [34, 26, 72], far: [84, 68, 138], far2: [70, 56, 120],
    wall: [58, 48, 92], wallIn: [20, 15, 38], rim: [255, 216, 130], inset: 32, wobble: 0, seed: 6,
  };
  const GOLD = [[255, 240, 180], [232, 182, 76], [150, 98, 34], [104, 64, 22]];
  const GOLDW = [[236, 206, 150], [178, 134, 66], [102, 68, 34], [66, 42, 24]];   // the walls' older, duller gold
  const BASALT = [[124, 110, 170], [70, 60, 108], [38, 30, 66], [26, 20, 48]];
  const beat = t => Math.exp(-ph(t, 1) * 6);

  // a music note (♪ or ♫) drawn as glossy gold shapes
  function note(ctx, x, y, s, a, kind = 0, c = GOLD) {
    if (a < 0.03) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    K.glow(ctx, 0, 0, 16, [255, 220, 140], 0.35);
    const head = hx => { ctx.save(); ctx.translate(hx, 0); ctx.rotate(-0.4); ctx.fillStyle = K.rg(ctx, -1.5, -1.5, 5, [rgb(c[0]), rgb(c[1]), rgb(c[2])]); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.9, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(c[3]); ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore(); };
    ctx.fillStyle = rgb(c[1]); ctx.strokeStyle = rgb(c[3]); ctx.lineWidth = 0.5;
    if (kind === 0) {
      ctx.fillRect(2.6, -14, 1.5, 14); head(0);
      ctx.beginPath(); ctx.moveTo(4.1, -14); ctx.quadraticCurveTo(9, -10, 8, -5); ctx.quadraticCurveTo(7.5, -9, 4.1, -10); ctx.fill();
    } else {
      ctx.fillRect(2.6, -14, 1.5, 14); ctx.fillRect(11.6, -16, 1.5, 14); head(0); ctx.save(); ctx.translate(9, -2); head(0); ctx.restore();
      ctx.beginPath(); ctx.moveTo(2.6, -14); ctx.lineTo(13.1, -16); ctx.lineTo(13.1, -13); ctx.lineTo(2.6, -11); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,240,.85)'; ctx.beginPath(); ctx.ellipse(-1.2, -1, 1.2, 0.6, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // a vertical gold organ pipe: open top, body, the mouth (upper lip arch + dark slot), a conical foot
  function organPipe(ctx, x, yTop, yMouth, yFoot, pw, lit, GOLD = GOLDW) {
    const g = K.lg(ctx, x - pw / 2, 0, x + pw / 2, 0, [[0, rgb(GOLD[2])], [0.3, rgb(GOLD[0])], [0.55, rgb(GOLD[1])], [1, rgb(GOLD[3])]]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - pw / 2, yTop); ctx.lineTo(x - pw / 2, yMouth + pw * 0.4); ctx.lineTo(x - pw * 0.16, yFoot); ctx.lineTo(x + pw * 0.16, yFoot); ctx.lineTo(x + pw / 2, yMouth + pw * 0.4); ctx.lineTo(x + pw / 2, yTop); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 0.8; ctx.stroke();
    // open top rim
    ctx.fillStyle = 'rgba(40,22,12,.85)'; ctx.beginPath(); ctx.ellipse(x, yTop, pw / 2, pw * 0.18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(GOLD[0], 0.8); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(x, yTop, pw / 2, pw * 0.18, 0, 0.2, Math.PI - 0.2); ctx.stroke();
    // mouth
    const mw = pw * 0.62, mh = pw * 0.42;
    if (lit > 0.05) K.glow(ctx, x, yMouth, pw * 2.6, [255, 220, 140], 0.6 * lit);
    ctx.fillStyle = lit > 0.3 ? rgb(K.mix([60, 30, 40], [255, 236, 170], lit)) : 'rgba(36,18,24,.92)';
    ctx.beginPath(); ctx.moveTo(x - mw / 2, yMouth + mh); ctx.lineTo(x - mw / 2, yMouth); ctx.quadraticCurveTo(x, yMouth - mh * 0.9, x + mw / 2, yMouth); ctx.lineTo(x + mw / 2, yMouth + mh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(GOLD[0], 0.85); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - mw / 2 - 0.5, yMouth - 0.5); ctx.quadraticCurveTo(x, yMouth - mh * 1.4, x + mw / 2 + 0.5, yMouth - 0.5); ctx.stroke();
    ctx.strokeStyle = rgb(GOLD[3], 0.8); ctx.beginPath(); ctx.moveTo(x - mw / 2, yMouth + mh + 0.6); ctx.lineTo(x + mw / 2, yMouth + mh + 0.6); ctx.stroke();
    // a band and the sheen line
    ctx.fillStyle = rgb(GOLD[2], 0.7); ctx.fillRect(x - pw / 2, yTop + pw * 0.8, pw, 1);
    ctx.fillStyle = 'rgba(255,255,235,.55)'; ctx.fillRect(x - pw * 0.22, yTop + 2, Math.max(0.8, pw * 0.1), yMouth - yTop - 4);
  }

  function organFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the cathedral: a great pointed arch of rock and, far off, the towers of a grand organ façade
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(w + 5, -5); ctx.lineTo(w + 5, h * 0.55); ctx.quadraticCurveTo(w * 0.86, h * 0.08, w * 0.5, -2); ctx.quadraticCurveTo(w * 0.14, h * 0.08, -5, h * 0.55); ctx.closePath(); ctx.fill();
      // a rose window of light high in the arch
      const rx = w * 0.5, ry = h * 0.15;
      K.glow(ctx, rx, ry, 110, [220, 190, 255], 0.3);
      ctx.fillStyle = 'rgba(236,220,255,.55)'; circ(ctx, rx, ry, 30); ctx.fill();
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 2.6; circ(ctx, rx, ry, 30); ctx.stroke();
      ctx.lineWidth = 1.6; circ(ctx, rx, ry, 10); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.moveTo(rx + Math.cos(a) * 10, ry + Math.sin(a) * 10); ctx.lineTo(rx + Math.cos(a) * 30, ry + Math.sin(a) * 30); } ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; circ(ctx, rx + Math.cos(a) * 21, ry + Math.sin(a) * 21, 5); ctx.stroke(); }
      // light shafts from the window
      add(ctx, () => { for (const [dx, wd] of [[-30, 20], [6, 26], [40, 18]]) { ctx.fillStyle = K.lg(ctx, 0, ry, 0, h, ['rgba(220,200,255,.12)', 'rgba(220,200,255,0)']); ctx.beginPath(); ctx.moveTo(rx + dx * 0.3 - 4, ry + 20); ctx.lineTo(rx + dx * 0.3 + 4, ry + 20); ctx.lineTo(rx + dx * 2.4 + wd, h); ctx.lineTo(rx + dx * 2.4 - wd, h); ctx.fill(); } });
      // far organ towers: clusters of pipe silhouettes with tiny glowing mouths that light on the beat
      ctx.fillStyle = rgb(col);
      const towers = [[w * 0.17, h * 0.56, 5], [w * 0.5, h * 0.46, 7], [w * 0.83, h * 0.56, 5]];
      for (const [tx, ty, n] of towers) {
        const cw = n * 5.2 + 8;
        // the carved case: a pointed gothic hood over each tower, a broad base below
        ctx.beginPath(); ctx.moveTo(tx - cw, ty + 6); ctx.lineTo(tx - cw, ty - 10); ctx.quadraticCurveTo(tx - cw * 0.5, ty - 18, tx, ty - 44); ctx.quadraticCurveTo(tx + cw * 0.5, ty - 18, tx + cw, ty - 10); ctx.lineTo(tx + cw, ty + 6); ctx.closePath(); ctx.fill();
        ctx.fillRect(tx - 1.5, ty - 58, 3, 16);
        ctx.fillRect(tx - cw - 3, ty + 130, cw * 2 + 6, h);
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1) - 0.5, pw = 9, x = tx + u * (n - 1) * 10, top = ty + 8 + Math.abs(u) * 50;
          ctx.fillRect(x - pw / 2, top, pw, ty + 130 - top);
          ctx.beginPath(); ctx.moveTo(x - pw / 2, ty + 112); ctx.lineTo(x, ty + 130); ctx.lineTo(x + pw / 2, ty + 112); ctx.fill();
        }
        ctx.fillRect(tx - cw, ty + 2, cw * 2, 6);
      }
      add(ctx, () => {
        const b = beat(t);
        for (const [tx, ty, n] of towers) for (let i = 0; i < n; i++) {
          const u = i / (n - 1) - 0.5, x = tx + u * (n - 1) * 10, top = ty + 8 + Math.abs(u) * 50, on = (Math.floor(t) + i) % 3 === 0 ? b : 0.12;
          ctx.fillStyle = rgb([255, 220, 150], 0.25 + 0.6 * on); ctx.beginPath(); ctx.moveTo(x - 2.6, top + 92); ctx.lineTo(x - 2.6, top + 88); ctx.quadraticCurveTo(x, top + 84, x + 2.6, top + 88); ctx.lineTo(x + 2.6, top + 92); ctx.fill();
          if (on > 0.3) K.glow(ctx, x, top + 89, 10, [255, 220, 150], 0.3 * on);
        }
      });
    } else {
      // nearer: hanging basalt columns, hex-ended, and a ribbon of music staff drifting across
      const r = K.rand(19);
      for (let i = 0; i < 7; i++) {
        const x = r() * w, cw = 12 + r() * 14, top = i % 2 === 0, len = h * (0.1 + r() * 0.22);
        const y0 = top ? -5 : h + 5, y1 = top ? len : h - len;
        ctx.beginPath(); ctx.moveTo(x - cw / 2, y0); ctx.lineTo(x - cw / 2, y1); ctx.lineTo(x, y1 + (top ? 6 : -6)); ctx.lineTo(x + cw / 2, y1); ctx.lineTo(x + cw / 2, y0); ctx.fill();
      }
      // the staff ribbon
      ctx.save(); ctx.strokeStyle = 'rgba(255,226,160,.18)'; ctx.lineWidth = 0.8;
      const yc = x => h * 0.62 + Math.sin(x * 0.02 + t * 0.6) * 18;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); for (let x = -5; x <= w + 5; x += 8) { const y = yc(x) + k * 4; x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const x = ph(t * 18 + i * 52, w + 30) - 15; ctx.fillStyle = 'rgba(255,226,160,.28)'; ctx.beginPath(); ctx.ellipse(x, yc(x) + 4 + (i % 4) * 4, 2.6, 1.9, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(x + 1.7, yc(x) - 8 + (i % 4) * 4, 0.9, 12); }
      ctx.restore();
    }
  }

  const OAK = [[156, 84, 60], [104, 50, 36], [62, 28, 22], [42, 16, 16]];
  ORGAN.base = 32;
  ORGAN.blocks = {
    L: [[-60, 124, 38, 'case'], [124, 200, 32, 'basalt'], [200, 256, 42, 'pivot'], [256, 380, 32, 'rank'], [380, 540, 46, 'tower', 1]],
    R: [[-60, 104, 46, 'tower', 0], [104, 200, 32, 'basalt'], [200, 256, 42, 'pivot'], [256, 300, 32, 'basalt'], [300, 372, 38, 'ledge'], [372, 418, 32, 'stops'], [418, 540, 40, 'console']],
  };
  ORGAN.rimStops = [[255, 216, 130], [200, 170, 255], [255, 220, 150], [190, 160, 255], [255, 210, 130]];
  function basalt(ctx, X, y0, y1, d, seed) {
    const cw = (d + 4) / 3;
    for (let c = 0; c < 3; c++) {
      const r = K.rand(seed + c * 31), xL = Math.min(X(-4 + c * cw), X(-4 + (c + 1) * cw));
      for (let y = y0 - r() * 30; y < y1; ) {
        const len = 30 + r() * 34;
        ctx.fillStyle = K.lg(ctx, xL, 0, xL + cw, 0, [rgb(BASALT[0]), rgb(BASALT[1]), rgb(BASALT[2])]); ctx.fillRect(xL + 0.6, y, cw - 1.2, len);
        ctx.fillStyle = rgb(BASALT[3]); ctx.fillRect(xL + cw - 1.2, y, 1.2, len);
        ctx.fillStyle = rgb(K.lift(BASALT[0], 30), 0.7); ctx.fillRect(xL + 0.6, y, 1, len);
        ctx.fillStyle = rgb(BASALT[3], 0.9); ctx.fillRect(xL, y - 1, cw, 2);
        ctx.fillStyle = rgb(K.lift(BASALT[0], 20), 0.75); ctx.beginPath(); ctx.moveTo(xL + 0.6, y + 1); ctx.lineTo(xL + cw / 2, y + 4); ctx.lineTo(xL + cw - 1, y + 1); ctx.lineTo(xL + cw / 2, y + 2); ctx.closePath(); ctx.fill();
        if (r() < 0.4) { ctx.strokeStyle = rgb(BASALT[3], 0.8); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(xL + 2, y + len * 0.4); ctx.lineTo(xL + cw * 0.5, y + len * 0.5); ctx.lineTo(xL + cw * 0.4, y + len * 0.7); ctx.stroke(); }
        y += len;
      }
    }
  }
  function oak(ctx, x, ww, y0, y1) {
    ctx.fillStyle = K.lg(ctx, x, 0, x + ww, 0, [rgb(OAK[2]), rgb(OAK[1]), rgb(OAK[2])]); ctx.fillRect(x, y0, ww, y1 - y0);
    ctx.strokeStyle = rgb(OAK[3], 0.55); ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const gx = x + 3 + i * (ww - 6) / 5; ctx.moveTo(gx, y0); ctx.bezierCurveTo(gx + 2, y0 + (y1 - y0) * 0.3, gx - 2, y0 + (y1 - y0) * 0.7, gx + 1, y1); } ctx.stroke();
  }
  function goldTrim(ctx, x, y, w, h) { ctx.strokeStyle = rgb(GOLDW[3]); ctx.lineWidth = 2.2; ctx.strokeRect(x, y, w, h); ctx.strokeStyle = rgb(GOLDW[1]); ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h); ctx.strokeStyle = rgb(GOLDW[0], 0.8); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - 0.5, y + h); ctx.lineTo(x - 0.5, y - 0.5); ctx.lineTo(x + w, y - 0.5); ctx.stroke(); }
  // a gothic pointed arch outline in gold, with a trefoil in its head
  function gothic(ctx, cx, top, bot, hw) {
    const arch = () => { ctx.beginPath(); ctx.moveTo(cx - hw, bot); ctx.lineTo(cx - hw, top + hw * 1.4); ctx.quadraticCurveTo(cx - hw, top + hw * 0.3, cx, top); ctx.quadraticCurveTo(cx + hw, top + hw * 0.3, cx + hw, top + hw * 1.4); ctx.lineTo(cx + hw, bot); };
    arch(); ctx.fillStyle = 'rgba(24,10,30,.75)'; ctx.fill();
    ctx.save(); arch(); ctx.clip(); ctx.fillStyle = K.lg(ctx, 0, top, 0, bot, ['rgba(200,170,255,.35)', 'rgba(120,90,200,.1)']); ctx.fillRect(cx - hw, top, hw * 2, bot - top); ctx.restore();
    arch(); ctx.strokeStyle = rgb(GOLDW[3]); ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = rgb(GOLDW[1]); ctx.lineWidth = 1.4; ctx.stroke();
    const ty = top + hw * 1.25; ctx.strokeStyle = rgb(GOLDW[0], 0.9); ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; circ(ctx, cx + Math.cos(a) * hw * 0.32, ty + Math.sin(a) * hw * 0.32, hw * 0.3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx, ty + hw * 0.6); ctx.lineTo(cx, bot); ctx.stroke();
  }
  function organWall(ctx, side, X, w, h, t, blocks) {
    const b = beat(t);
    blocks.forEach(([y0, y1, d, kind, opt], bi) => {
      const [x, ww] = span(X, -4, d), H = y1 - y0, seed = (y0 + 77) * (side + 3);
      if (kind === 'basalt' || kind === 'pivot' || kind === 'rank' || kind === 'ledge') basalt(ctx, X, y0, y1, d, seed);
      if (kind === 'case' || kind === 'stops' || kind === 'console' || kind === 'tower') { oak(ctx, x, ww, y0, y1); goldTrim(ctx, Math.min(X(3), X(d - 3)), y0 + 3, d - 6, H - 6); }
      if (kind === 'case') {
        gothic(ctx, X(d / 2 + 1), Math.max(y0, 0) + 10, y1 - 14, (d - 14) / 2);
      } else if (kind === 'pivot') {
        // a carved gold boss behind the cymbal arm's pivot
        const cx = X(d - 10), cy = (y0 + y1) / 2;
        plate(ctx, Math.min(X(4), X(d - 1)), y0 + 6, d - 5, H - 12, GOLDW, { r: 6, bi: 4.5, br: 1.6 });
        ctx.fillStyle = rgb(GOLDW[3], 0.6); circ(ctx, cx + 1, cy + 1.5, 13); ctx.fill();
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.fillStyle = K.rg(ctx, cx + Math.cos(a) * 7 - 1, cy + Math.sin(a) * 7 - 1, 6, [rgb(GOLD[0]), rgb(GOLD[1]), rgb(GOLD[2])]); ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 5, 3, a, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(GOLD[3], 0.7); ctx.lineWidth = 0.6; ctx.stroke(); }
      } else if (kind === 'rank') {
        // a rank of three big pipes on a carved rail; each mouth sings on its beat
        const rail = y1 - 10;
        [[d - 8, 12, y0 + 8], [d - 21, 10, y0 + 26], [d - 32, 8, y0 + 42]].forEach(([dd, pw, top], i) => {
          const playing = (Math.floor(t) + i + (side > 0 ? 1 : 0)) % 3 === 0 ? b : 0;
          organPipe(ctx, X(dd), top, rail - 28, rail, pw, playing);
        });
        ctx.fillStyle = K.lg(ctx, 0, rail, 0, rail + 8, [rgb(GOLDW[0]), rgb(GOLDW[1]), rgb(GOLDW[2])]); ctx.fillRect(x, rail, ww, 7);
        ctx.fillStyle = rgb(GOLDW[3]); ctx.fillRect(x, rail + 7, ww, 1.2);
        for (let k = 0; k < 4; k++) { ctx.fillStyle = rgb(GOLDW[3], 0.7); ctx.beginPath(); ctx.arc(x + 5 + k * 10, rail + 8, 3, 0, Math.PI); ctx.fill(); }
      } else if (kind === 'tower') {
        // a pipe tower in a carved case: four pipes stepping in an arch under a pointed hood
        const hood = opt === 1, rail = hood ? y0 + 118 : y1 - 10, mouth = rail - 26;
        const pipes = [[d - 7, 9], [d - 17, 9], [d - 27, 8], [d - 36, 7]].filter(([dd]) => dd > 2);
        pipes.forEach(([dd, pw], i) => {
          const top = hood ? y0 + 30 + [0, 6, 14, 24][i] : y0 + [40, 30, 44, 56][i];
          const playing = (Math.floor(t) + i + (hood ? 2 : 0)) % 4 === 0 ? b : 0;
          organPipe(ctx, X(dd), top, mouth, rail, pw, playing);
        });
        if (hood) {
          const hx0 = X(-4), hx1 = X(d + 1), cy = y0 + 4;
          ctx.fillStyle = K.lg(ctx, 0, cy, 0, cy + 24, [rgb(OAK[0]), rgb(OAK[1]), rgb(OAK[2])]);
          ctx.beginPath(); ctx.moveTo(hx0, cy + 24); ctx.lineTo(hx0, cy + 8); ctx.quadraticCurveTo((hx0 + hx1) / 2, cy - 6, hx1, cy + 2); ctx.lineTo(hx1, cy + 24); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = rgb(GOLDW[1]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx0, cy + 8); ctx.quadraticCurveTo((hx0 + hx1) / 2, cy - 6, hx1, cy + 2); ctx.stroke();
          ctx.strokeStyle = rgb(GOLDW[0], 0.8); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx0, cy + 22); ctx.lineTo(hx1, cy + 22); ctx.stroke();
          for (let k = 0; k < 4; k++) { const fx = lerp(hx0, hx1, (k + 0.5) / 4); ctx.fillStyle = rgb(GOLDW[1]); ctx.beginPath(); ctx.moveTo(fx - 2.5, cy + 22); ctx.lineTo(fx, cy + 27); ctx.lineTo(fx + 2.5, cy + 22); ctx.fill(); }
        } else {
          ctx.fillStyle = K.lg(ctx, 0, rail, 0, rail + 8, [rgb(GOLDW[0]), rgb(GOLDW[1]), rgb(GOLDW[2])]); ctx.fillRect(x, rail, ww, 7);
          ctx.fillStyle = rgb(GOLDW[3]); ctx.fillRect(x, rail + 7, ww, 1.2);
        }
      } else if (kind === 'stops') {
        // the stop jamb: three big ivory-faced draw knobs, one drawn out on the beat
        for (let i = 0; i < 3; i++) {
          const kx = X(d / 2 + 1), ky = y0 + 10 + i * 13, out = i === Math.floor(t) % 3 ? 2.5 * (1 - ph(t, 1)) + 1.5 : 0;
          ctx.fillStyle = 'rgba(16,6,10,.55)'; circ(ctx, kx + 1.4, ky + 1.6, 6.2); ctx.fill();
          ctx.fillStyle = K.lg(ctx, kx - 6, ky - 6, kx + 6, ky + 6, [rgb(GOLDW[0]), rgb(GOLDW[2])]); circ(ctx, kx, ky, 6); ctx.fill();
          const fx = kx - side * out * -0.3, fy = ky - out * 0.5;
          ctx.fillStyle = K.rg(ctx, fx - 1.6, fy - 1.6, 6, ['#ffffff', '#f2e8d4', '#c6b494']); circ(ctx, fx, fy, 4.4); ctx.fill();
          ctx.strokeStyle = 'rgba(120,70,60,.75)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(fx - 2.4, fy - 0.6); ctx.lineTo(fx + 2.4, fy - 0.6); ctx.moveTo(fx - 1.6, fy + 1.2); ctx.lineTo(fx + 1.6, fy + 1.2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.9)'; circ(ctx, fx - 1.6, fy - 1.6, 1); ctx.fill();
        }
      } else if (kind === 'ledge') {
        // a carved gold scroll corbel under the drum's ledge
        const cx = X(d - 8), cy = y0 + 46;
        ctx.fillStyle = K.lg(ctx, cx - 8, cy - 14, cx + 8, cy + 14, [rgb(GOLDW[0]), rgb(GOLDW[1]), rgb(GOLDW[2])]);
        ctx.beginPath(); ctx.moveTo(cx - 6, cy - 16); ctx.lineTo(cx + 6, cy - 16); ctx.quadraticCurveTo(cx + 7, cy + 4, cx - 1, cy + 14); ctx.quadraticCurveTo(cx - 8, cy + 10, cx - 6, cy - 16); ctx.fill();
        ctx.strokeStyle = rgb(GOLDW[3]); ctx.lineWidth = 0.9; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 1, cy + 7, 3.4, 0, 5); ctx.stroke();
        ctx.strokeStyle = rgb(GOLDW[0], 0.8); ctx.beginPath(); ctx.moveTo(cx - 4, cy - 14); ctx.quadraticCurveTo(cx - 5, cy, cx - 2, cy + 6); ctx.stroke();
      } else if (kind === 'console') {
        // the console the little keyboard juts from: a carved music desk with a scroll of music on it
        const mx = Math.min(X(6), X(d - 6)), my = y0 + 4;
        ctx.fillStyle = K.lg(ctx, mx, my, mx + d - 12, my + 16, ['#fff8e6', '#e8dcc0']); ctx.fillRect(mx, my, d - 12, 15);
        ctx.strokeStyle = 'rgba(90,60,40,.7)'; ctx.lineWidth = 0.5; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(mx + 2, my + 3 + k * 2.2); ctx.lineTo(mx + d - 14, my + 3 + k * 2.2); ctx.stroke(); }
        ctx.fillStyle = 'rgba(70,40,30,.85)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(mx + 4 + k * 6, my + 5 + (k % 3) * 2.2, 1.3, 1, -0.4, 0, TAU); ctx.fill(); }
        gothic(ctx, X(d / 2 + 1), y0 + 34, y1 - 8, (d - 16) / 2);
      }
    });
  }
  ORGAN.farShape = organFar; ORGAN.wallDeco = organWall;

  // Pipe Blast: a stack of horizontal trumpet pipes on the left wall; they light in order, then blow a gust across
  function pipeBlast(ctx, t, ex, y, ex2) {
    const p = ph(t, 4, 0), N = 4;
    const blast = p >= 1 && p < 1.9 ? (p - 1) / 0.9 : -1;
    // the gust (drawn first, the pipes sit over it)
    if (blast >= 0) {
      const k = Math.sin(Math.PI * clamp(blast, 0, 1)), front = ex + 40 + easeOut(blast / 0.5) * (ex2 - ex - 40);
      add(ctx, () => {
        ctx.fillStyle = K.lg(ctx, ex + 40, 0, front, 0, ['rgba(210,190,255,.0)', rgb([220, 200, 255], 0.28 * k), rgb([240, 230, 255], 0.4 * k)]);
        ctx.beginPath(); ctx.moveTo(ex + 40, y - 34); ctx.quadraticCurveTo(front * 0.7 + ex * 0.3, y - 44, front, y - 40); ctx.lineTo(front, y + 40); ctx.quadraticCurveTo(front * 0.7 + ex * 0.3, y + 44, ex + 40, y + 34); ctx.closePath(); ctx.fill();
        // pressure rings
        for (let i = 0; i < 3; i++) { const u = clamp(blast * 1.6 - i * 0.22, 0, 1); if (u <= 0 || u >= 1) continue; const rx = lerp(ex + 44, ex2 - 6, u); ctx.strokeStyle = rgb([240, 225, 255], 0.7 * (1 - u)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(rx, y, 7 + u * 4, 30 + u * 10, 0, 0, TAU); ctx.stroke(); }
      });
      // wind streamers
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const yy = y - 30 + i * 10, u0 = clamp(blast * 1.5 - (i % 3) * 0.1, 0, 1), x1 = lerp(ex + 42, ex2 - 4, u0), x0 = Math.max(ex + 40, x1 - 60);
        if (x1 - x0 < 3) continue;
        ctx.strokeStyle = rgb([255, 250, 255], 0.7 * k); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.bezierCurveTo(x0 + (x1 - x0) * 0.4, yy - 5, x0 + (x1 - x0) * 0.7, yy + 5, x1, yy + Math.sin(i) * 2); ctx.stroke();
        if (i % 2 === 0) { ctx.beginPath(); ctx.arc(x1 - 4, yy - 4, 4, 0.2, 2.6); ctx.stroke(); }
      }
      ctx.restore();
      // notes swept along
      for (let i = 0; i < 3; i++) { const u = clamp(blast * 1.3 - i * 0.12, 0, 1); note(ctx, lerp(ex + 46, ex2 - 14, u), y - 20 + i * 18 + Math.sin(u * 9 + i) * 4, 0.9, k, i % 2); }
    }
    // the trumpet pipes (en chamade), bells into the shaft; each lights in turn on the build-up
    for (let i = 0; i < N; i++) {
      const yy = y - 27 + i * 18, L = 36 - Math.abs(i - 1.5) * 6, bx = ex + L, lit = p < 1 ? clamp((p - i * 0.22) * 5, 0, 1) * (0.6 + 0.4 * Math.sin(t * 30)) : blast >= 0 ? 1 - blast : 0;
      if (lit > 0.05) K.glow(ctx, bx + 4, yy, 20, [255, 220, 150], 0.55 * lit);
      // tube
      ctx.fillStyle = tubeGrad(ctx, 0, yy - 3.5, 0, yy + 3.5, GOLD); ctx.fillRect(ex - 6, yy - 3, L + 6, 6);
      ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 0.7; ctx.strokeRect(ex - 6, yy - 3, L + 6, 6);
      // a collar
      ctx.fillStyle = tubeGrad(ctx, 0, yy - 4.5, 0, yy + 4.5, GOLD); ctx.fillRect(ex + L * 0.45, yy - 4.2, 3, 8.4);
      // flared bell
      ctx.fillStyle = K.lg(ctx, 0, yy - 9, 0, yy + 9, [[0, rgb(GOLD[1])], [0.3, rgb(GOLD[0])], [0.7, rgb(GOLD[1])], [1, rgb(GOLD[2])]]);
      ctx.beginPath(); ctx.moveTo(bx - 1, yy - 3); ctx.quadraticCurveTo(bx + 5, yy - 3.5, bx + 8, yy - 8.5); ctx.lineTo(bx + 8, yy + 8.5); ctx.quadraticCurveTo(bx + 5, yy + 3.5, bx - 1, yy + 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(GOLD[3]); ctx.stroke();
      ctx.fillStyle = lit > 0.2 ? rgb(K.mix([80, 40, 40], [255, 240, 190], lit)) : 'rgba(50,26,24,.9)'; ctx.beginPath(); ctx.ellipse(bx + 8, yy, 2, 8.4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(GOLD[0]); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(bx + 8, yy, 2, 8.4, 0, -1.6, 1.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,235,.6)'; ctx.fillRect(ex - 4, yy - 1.8, L, 0.9);
    }
    // the windchest they come out of
    ctx.fillStyle = K.lg(ctx, ex - 12, 0, ex + 2, 0, [rgb(GOLD[1]), rgb(GOLD[2])]); ctx.beginPath(); ctx.roundRect(ex - 12, y - 40, 13, 80, 4); ctx.fill();
    ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = rgb(GOLD[0], 0.7); ctx.fillRect(ex - 10, y - 37, 1.2, 74);
    for (const yy of [y - 34, y + 34]) rivet(ctx, ex - 5, yy, 1.6, GOLD);
  }

  // Cymbal Clash: two giant cymbals on arms, one from each wall; they wind back, swing in and crash in the middle
  function cymbalClash(ctx, t, exL, exR, y) {
    const p = ph(t, 4, 1.3);
    // arm angle: 0 = horizontal (crashed), up to 1.25 rad (parked up against the wall)
    let a = 1.15 + Math.sin(t * 2) * 0.03, vib = 0;
    if (p < 0.5) a = 1.15 + 0.2 * ease(p / 0.5) + Math.sin(t * 60) * 0.03 * (p / 0.5);
    else if (p < 0.7) a = lerp(1.35, 0, easeIn((p - 0.5) / 0.2));
    else if (p < 1.1) { a = 0; vib = Math.exp(-(p - 0.7) * 8); }
    else if (p < 1.9) a = 1.15 * ease((p - 1.1) / 0.8);
    const close = 1 - a / 1.35, mid = (exL + exR) / 2, arm = (exR - exL) / 2 - 16;
    K.danger(ctx, mid, y, 40 + 30 * close, 0.12 + 0.4 * close);
    for (const side of [-1, 1]) {
      const px = side < 0 ? exL - 2 : exR + 2, py = y;
      const ang = side < 0 ? -a : Math.PI + a, ux = Math.cos(ang), uy = Math.sin(ang);
      const cx = px + ux * arm + (vib ? Math.sin(t * 90) * 1.5 * vib : 0), cy = py + uy * arm;
      // the arm: a gold-capped rod from a pivot hub
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx - ux * 4, cy - uy * 4); ctx.stroke();
      ctx.strokeStyle = rgb(GOLD[1]); ctx.lineWidth = 5.6; ctx.stroke();
      ctx.strokeStyle = rgb(GOLD[2], 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + uy * 1.6, py - ux * 1.6); ctx.lineTo(cx - ux * 4 + uy * 1.6, cy - uy * 4 - ux * 1.6); ctx.stroke();
      ctx.strokeStyle = rgb(GOLD[0], 0.95); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(px - uy * 1.4, py + ux * 1.4); ctx.lineTo(cx - ux * 4 - uy * 1.4, cy - uy * 4 + ux * 1.4); ctx.stroke();
      for (const f of [0.35, 0.7]) { const jx = lerp(px, cx, f), jy = lerp(py, cy, f); ctx.fillStyle = K.rg(ctx, jx - 1, jy - 1, 4.5, [rgb(GOLD[0]), rgb(GOLD[2])]); circ(ctx, jx, jy, 3.6); ctx.fill(); }
      ctx.fillStyle = K.rg(ctx, px - 2, py - 3, 9, [rgb(GOLD[0]), rgb(GOLD[1]), rgb(GOLD[2])]); circ(ctx, px, py, 7); ctx.fill(); ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 1; ctx.stroke();
      rivet(ctx, px, py, 2.2, STEEL);
      // the cymbal: seen at a slant, a disc perpendicular to the arm with lathe rings and a domed bell
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      const R = 26, th = 7 + 2 * vib * Math.sin(t * 70);
      ctx.fillStyle = K.lg(ctx, 0, -R, 0, R, [[0, rgb(GOLD[0])], [0.35, rgb(GOLD[1])], [0.65, rgb([214, 150, 54])], [1, rgb(GOLD[2])]]);
      ctx.beginPath(); ctx.ellipse(0, 0, th, R, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = rgb(GOLD[2], 0.55); ctx.lineWidth = 0.6;
      for (const f of [0.82, 0.66, 0.5]) { ctx.beginPath(); ctx.ellipse(-th * (1 - f) * 0.3, 0, th * f, R * f, 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = rgb(GOLD[0], 0.6); for (const f of [0.74, 0.58]) { ctx.beginPath(); ctx.ellipse(-th * (1 - f) * 0.3, 0, th * f, R * f, 0, -2.4, -0.8); ctx.stroke(); }
      ctx.fillStyle = K.rg(ctx, -3, -3, 8, [rgb(GOLD[0]), rgb(GOLD[1]), rgb(GOLD[2])]); ctx.beginPath(); ctx.ellipse(-2, 0, 5, 7.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,240,.8)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, 0, th * 0.8, R * 0.86, 0, 3.6, 4.4); ctx.stroke();
      ctx.restore();
    }
    // the crash: a star-burst flash, rings, sparkles and notes flung out
    if (p >= 0.7 && p < 1.3) {
      const u = (p - 0.7) / 0.6, k = 1 - u;
      add(ctx, () => {
        K.glow(ctx, mid, y, 50 + 30 * u, [255, 230, 150], 0.8 * k);
        ctx.fillStyle = rgb([255, 248, 210], 0.9 * k); ctx.beginPath();
        for (let i = 0; i < 16; i++) { const aa = i * TAU / 16 + 0.2, rr = i % 2 ? 9 + 8 * u : 22 + 26 * easeOut(u * 2); ctx.lineTo(mid + Math.cos(aa) * rr, y + Math.sin(aa) * rr); }
        ctx.closePath(); ctx.fill();
        for (let i = 0; i < 2; i++) { const uu = clamp(u * 1.4 - i * 0.2, 0, 1); ctx.strokeStyle = rgb([255, 230, 170], 0.7 * (1 - uu)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mid, y, 14 + uu * 50, 8 + uu * 34, 0, 0, TAU); ctx.stroke(); }
      });
      for (let i = 0; i < 4; i++) { const aa = -Math.PI / 2 + (i - 1.5) * 0.7; note(ctx, mid + Math.cos(aa) * (14 + 40 * u), y + Math.sin(aa) * (14 + 40 * u), 0.85, k, i % 2); }
    }
  }

  // Drum Bounce: a kettle drum on a basalt ledge throbs on every beat; touch its head and you boing up the shaft
  function drumBounce(ctx, t, ex, y) {
    const b = beat(t), big = ph(t, 4, 3) < 0.6 ? Math.exp(-ph(t, 4, 3) * 5) : 0, k = Math.max(b * 0.6, big);
    const cx = ex - 34, sq = 1 - 0.06 * k, R = 28;
    // ledge
    ctx.fillStyle = K.lg(ctx, 0, y + 22, 0, y + 34, [rgb(BASALT[0]), rgb(BASALT[1]), rgb(BASALT[2])]);
    ctx.beginPath(); ctx.moveTo(ex + 4, y + 22); ctx.lineTo(cx - R - 6, y + 22); ctx.lineTo(cx - R + 2, y + 32); ctx.lineTo(ex + 4, y + 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(BASALT[3]); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = rgb(ORGAN.rim, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - R - 5, y + 22.5); ctx.lineTo(ex, y + 22.5); ctx.stroke();
    // legs
    ctx.strokeStyle = rgb(GOLD[2]); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const d of [-0.7, 0, 0.7]) { ctx.beginPath(); ctx.moveTo(cx + d * R * 0.6, y + 8); ctx.lineTo(cx + d * R * 0.95, y + 22); ctx.stroke(); }
    ctx.save(); ctx.translate(cx, y); ctx.scale(1 + (1 - sq) * 0.8, sq);
    // the copper kettle
    ctx.fillStyle = K.lg(ctx, -R, 0, R, 0, [[0, rgb(COPPER[2])], [0.3, rgb(COPPER[0])], [0.55, rgb(COPPER[1])], [1, rgb(COPPER[3])]]);
    ctx.beginPath(); ctx.moveTo(-R, -6); ctx.bezierCurveTo(-R, 14, -R * 0.5, 20, 0, 20); ctx.bezierCurveTo(R * 0.5, 20, R, 14, R, -6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(COPPER[3]); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,200,.65)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-R * 0.62, -2); ctx.quadraticCurveTo(-R * 0.62, 10, -R * 0.3, 15); ctx.stroke();
    // tension rods with gold tuning handles
    for (const d of [-0.85, -0.42, 0, 0.42, 0.85]) {
      const x = d * R; ctx.strokeStyle = rgb(GOLD[2]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x * 0.9, 6); ctx.stroke();
      ctx.fillStyle = K.lg(ctx, x - 2, -9, x + 2, -5, [rgb(GOLD[0]), rgb(GOLD[2])]); ctx.fillRect(x - 1.8, -10, 3.6, 4);
    }
    // gold hoop and the head (a creamy calfskin ellipse) that ripples
    ctx.fillStyle = K.lg(ctx, 0, -12, 0, -3, [rgb(GOLD[0]), rgb(GOLD[1]), rgb(GOLD[2])]); ctx.beginPath(); ctx.ellipse(0, -7, R + 2, 7.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(GOLD[3]); ctx.lineWidth = 0.9; ctx.stroke();
    const hd = 2.5 * k;
    ctx.fillStyle = K.rg(ctx, -8, -10, R, k > 0.4 ? ['#ffffff', '#fff2d4', '#e8cca0'] : ['#fffaf0', '#f2e4c8', '#d4b88c']); ctx.beginPath(); ctx.ellipse(0, -7.5 + hd * 0.3, R - 1, 5.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb([200, 160, 110], 0.6); ctx.lineWidth = 0.7;
    for (let i = 0; i < 2; i++) { const u = ph(t * 1 + i * 0.5, 1); ctx.beginPath(); ctx.ellipse(0, -7.5, (R - 3) * u, 5 * u, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-9, -9, 6, 1.2, -0.05, 0, TAU); ctx.fill();
    ctx.restore();
    // the throb: rings rising off the head, the boing on the big beat, notes popping up
    add(ctx, () => {
      K.glow(ctx, cx, y - 8, 40 + 20 * k, [255, 220, 150], 0.18 + 0.5 * k);
      for (let i = 0; i < 3; i++) {
        const u = ph(t + i / 3, 1);
        ctx.strokeStyle = rgb([255, 236, 190], 0.55 * (1 - u)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, y - 10 - u * 26, R * (0.8 + u * 0.4), 5 + u * 3, 0, 0, TAU); ctx.stroke();
      }
    });
    if (big > 0.02) {
      const u = 1 - big;
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgb([255, 250, 230], 0.85 * big); ctx.lineWidth = 2.4;
      for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * 12, y - 18 - u * 10); ctx.quadraticCurveTo(cx + d * 16, y - 40 - u * 30, cx + d * 9, y - 60 - u * 40); ctx.stroke(); }
      ctx.restore();
      add(ctx, () => { ctx.fillStyle = rgb([255, 246, 210], 0.8 * big); ctx.beginPath(); for (let i = 0; i < 12; i++) { const aa = i * TAU / 12, rr = i % 2 ? 8 : 18 + 10 * u; ctx.lineTo(cx + Math.cos(aa) * rr * 1.4, y - 10 + Math.sin(aa) * rr * 0.6); } ctx.closePath(); ctx.fill(); });
    }
    for (let i = 0; i < 3; i++) { const u = ph(t * 0.5 + i / 3, 1); note(ctx, cx - 14 + i * 14 + Math.sin(u * 8 + i) * 5, y - 18 - u * 70, 0.75, Math.sin(Math.PI * u) * 0.9, (i + 1) % 2); }
  }

  // a little keyboard manual on a ledge (scenery): keys dip in turn to the tune
  function manual(ctx, t, ex, y) {
    const x0 = ex - 46, n = 9, kw = 46 / n;
    ctx.fillStyle = K.lg(ctx, 0, y - 4, 0, y + 12, ['#7a4a30', '#4a2a1a']); ctx.beginPath(); ctx.roundRect(x0 - 4, y - 5, 54, 16, 3); ctx.fill();
    const down = Math.floor(t * 4) % n;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * kw, d = i === down || i === (down + 4) % n ? 1.2 : 0;
      ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 8, ['#ffffff', '#efe6d4', '#c9b894']); ctx.fillRect(x + 0.4, y + d, kw - 0.8, 8);
      ctx.fillStyle = 'rgba(120,96,70,.6)'; ctx.fillRect(x + kw - 0.6, y + d, 0.5, 8);
    }
    for (const i of [0, 1, 3, 4, 5, 7]) { const x = x0 + (i + 1) * kw - 1.6; ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 5, ['#5a4a6a', '#1e1428']); ctx.fillRect(x, y - 0.5, 3.2, 5); }
    ctx.fillStyle = K.lg(ctx, 0, y - 6, 0, y - 2, [rgb(GOLD[0]), rgb(GOLD[2])]); ctx.fillRect(x0 - 4, y - 6, 54, 2.5);
  }

  PV.sections['organ'] = (ctx, w, h, t) => {
    const S = machineShaft(ctx, w, h, t, ORGAN);
    coin(ctx, 120, 150, t, 0.3); coin(ctx, 92, 296, t, 1.5); coin(ctx, 124, 322, t, 2.5);
    manual(ctx, t, S.R(440), 440);
    pipeBlast(ctx, t, S.L(76), 76, S.R(76));
    drumBounce(ctx, t, S.R(338), 338);
    cymbalClash(ctx, t, S.L(228), S.R(228), 228);
    K.rocket(ctx, w * 0.5, h * 0.8, 0.75, t);
    // floating notes drifting up the cave, pulsing with the beat
    const r = K.rand(41), b = beat(t);
    for (let i = 0; i < 7; i++) {
      const x0 = 45 + r() * 180, sp = 10 + r() * 10, y = h + 20 - ph(t * sp + r() * 600, h + 40), s = 0.55 + r() * 0.3;
      note(ctx, x0 + Math.sin(t * 0.8 + i) * 8, y, s * (1 + 0.12 * b), 0.45 + 0.3 * b, i % 2);
    }
    K.motes(ctx, w, h, t, 'pollen', [220, 200, 255], 18, 13);
  };

  // =====================================================================================================
  // PINBALL PALACE: a giant pinball table on end; dark painted playfield, neon, chrome rails, chasing bulbs
  // =====================================================================================================
  const NPINK = [255, 79, 163], NCYAN = [54, 214, 255], NGOLD = [255, 210, 58];
  const NEON = [NPINK, NCYAN, NGOLD];
  const PIN_IN = 30;
  // the bumpers and the steel ball's ricochet path (P0 plunger tip .. P5 off the bottom)
  const BUMP = [[84, 78], [190, 96], [136, 138]];
  const BALL_R = 9;
  const PATH = [[50, 206], [221, 170], [160, 154], [103, 103], [39, 160], [150, 520]];
  const SEGL = PATH.slice(1).map((q, i) => Math.hypot(q[0] - PATH[i][0], q[1] - PATH[i][1]));
  const BALL_T0 = 1.6, BALL_V = 420;
  const hitTime = k => BALL_T0 + SEGL.slice(0, k).reduce((a, b) => a + b, 0) / BALL_V;  // when the ball reaches PATH[k]
  function ballAt(p) {
    let d = (p - BALL_T0) * BALL_V;
    if (d < 0) return null;
    for (let i = 0; i < SEGL.length; i++) { if (d <= SEGL[i]) { const u = d / SEGL[i]; return [lerp(PATH[i][0], PATH[i + 1][0], u), lerp(PATH[i][1], PATH[i + 1][1], u)]; } d -= SEGL[i]; }
    return null;
  }
  // when each bumper last flashed: B1 and B3 by the ball, B2 on its own
  const bumpFlash = (i, p) => {
    const times = i === 0 ? [hitTime(3)] : i === 2 ? [hitTime(2)] : [0.55, 3.0];
    let best = 9; for (const tt of times) { const d = p - tt; if (d >= 0 && d < best) best = d; }
    return best < 9 ? Math.exp(-best * 7) : 0;
  };

  // a chrome steel ball reflecting the table's neon
  function steelBall(ctx, x, y, r) {
    ctx.fillStyle = K.rg(ctx, x - r * 0.35, y - r * 0.4, r * 1.25, [[0, '#ffffff'], [0.25, '#e4e8f4'], [0.6, '#8a90aa'], [0.85, '#3e4260'], [1, '#6a5a9a']]);
    circ(ctx, x, y, r); ctx.fill();
    ctx.save(); circ(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = rgb(NPINK, 0.55); ctx.beginPath(); ctx.ellipse(x + r * 0.1, y + r * 0.85, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(NCYAN, 0.45); ctx.beginPath(); ctx.ellipse(x + r * 0.75, y - r * 0.1, r * 0.25, r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.32, r * 0.2, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,100,.8)'; ctx.lineWidth = 0.8; circ(ctx, x, y, r); ctx.stroke();
  }
  // a playfield bulb: glass dome, filament, coloured glow when lit
  function bulb(ctx, x, y, r, c, on) {
    if (on > 0.05) K.glow(ctx, x, y, r * 5, c, 0.55 * on);
    ctx.fillStyle = K.rg(ctx, x - r * 0.3, y - r * 0.3, r * 1.3, on > 0.5 ? ['#ffffff', rgb(K.lift(c, 60)), rgb(c)] : [rgb(K.mix(c, [255, 255, 255], 0.3), 0.75), rgb(K.mix(c, [40, 30, 70], 0.55)), rgb(K.mix(c, [20, 14, 40], 0.75))]);
    circ(ctx, x, y, r); ctx.fill();
    ctx.strokeStyle = rgb(K.mix(c, [30, 20, 60], 0.6)); ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; circ(ctx, x - r * 0.35, y - r * 0.35, r * 0.3); ctx.fill();
  }

  function pinBackground(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#2e2468', '#1f1a4a', '#140f30']); ctx.fillRect(0, 0, w, h);
    // painted sunburst behind everything
    const cx = w / 2, cy = h * 0.46;
    for (let i = 0; i < 24; i++) {
      const a0 = i * TAU / 24 + t * 0.03, a1 = a0 + TAU / 48;
      ctx.fillStyle = i % 2 ? 'rgba(80,50,150,.22)' : 'rgba(40,30,100,.18)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * 400, cy + Math.sin(a0) * 400); ctx.lineTo(cx + Math.cos(a1) * 400, cy + Math.sin(a1) * 400); ctx.fill();
    }
    // painted art: a ringed planet and swooshes in the island's colours, soft
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.fillStyle = K.rg(ctx, cx - 18, cy - 20, 60, ['#a070e0', '#5a3aa8', '#2e2068']); circ(ctx, cx, cy, 44); ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,200,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, 76, 16, -0.25, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,230,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 86, 20, -0.25, 0.2, 2.8); ctx.stroke();
    ctx.restore();
    for (const [x, y, s] of [[60, 40, 6], [210, 250, 5], [70, 300, 4], [200, 30, 4], [120, 420, 5], [228, 410, 3]]) {
      ctx.fillStyle = 'rgba(255,220,120,.35)'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10, r = i % 2 ? s * 0.45 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    }
    // lane arrows up the middle, chasing upward
    const chase = Math.floor(t * 6);
    for (let i = 0; i < 5; i++) {
      const y = 360 - i * 26, on = (i - chase % 6 + 6) % 6 === 0 ? 1 : (i - chase % 6 + 6) % 6 === 1 ? 0.4 : 0;
      const c = NEON[i % 3];
      if (on > 0.05) K.glow(ctx, cx, y, 18, c, 0.4 * on);
      ctx.fillStyle = K.lg(ctx, 0, y - 8, 0, y + 6, on > 0.3 ? ['#ffffff', rgb(c)] : [rgb(K.mix(c, [20, 14, 50], 0.45)), rgb(K.mix(c, [20, 14, 50], 0.75))]);
      ctx.beginPath(); ctx.moveTo(cx, y - 9); ctx.lineTo(cx + 9, y + 2); ctx.lineTo(cx + 4, y + 2); ctx.lineTo(cx + 4, y + 6); ctx.lineTo(cx - 4, y + 6); ctx.lineTo(cx - 4, y + 2); ctx.lineTo(cx - 9, y + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(K.mix(c, [20, 14, 50], 0.5)); ctx.lineWidth = 0.7; ctx.stroke();
    }
    // round lamp inserts in two arcs, and the multiplier inserts (lit targets raise the multiplier)
    for (let i = 0; i < 7; i++) {
      for (const d of [-1, 1]) {
        const a = -Math.PI / 2 + d * (0.5 + i * 0.16), x = cx + Math.cos(a) * 92 * d * d, y = cy + 30 + Math.sin(a) * -92 * 0.4 + i * 22;
        const xx = cx + d * (52 + i * 4), yy = 190 + i * 20, c = NEON[(i + (d > 0 ? 1 : 0)) % 3], on = ((i + Math.floor(t * 3)) % 7 === 0) ? 1 : 0.1;
        bulb(ctx, xx, yy, 2.6, c, on * 0.8);
      }
    }
    const mult = Math.floor(ph(t, 4) / 1.33);
    ctx.font = 'bold 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ['2X', '3X', '5X'].forEach((txt, i) => {
      const x = cx - 26 + i * 26, y = 446, on = i <= mult ? 1 : 0, c = NEON[i];
      if (on) K.glow(ctx, x, y, 16, c, 0.45);
      ctx.fillStyle = on ? K.rg(ctx, x - 3, y - 3, 11, ['#ffffff', rgb(c), rgb(K.mix(c, [40, 20, 80], 0.4))]) : rgb(K.mix(c, [20, 14, 50], 0.7));
      ctx.beginPath(); ctx.ellipse(x, y, 10, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgb(K.mix(c, [20, 14, 50], 0.4)); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = on ? 'rgba(60,20,70,.85)' : 'rgba(255,255,255,.3)'; ctx.fillText(txt, x, y + 0.5);
    });
    // dark vignette at the edges so the middle reads as a lit table
    ctx.fillStyle = K.lg(ctx, 0, 0, w, 0, ['rgba(10,6,24,.55)', 'rgba(10,6,24,0)', 'rgba(10,6,24,0)', 'rgba(10,6,24,.55)']); ctx.fillRect(0, 0, w, h);
  }

  function pinWalls(ctx, w, h, t) {
    const ins = PIN_IN, chase = Math.floor(t * 8);
    for (const side of [-1, 1]) {
      const X = d => side < 0 ? d : w - d, xa = Math.min(X(0), X(ins)), sd = side < 0 ? 0 : 1;
      // cabinet side rail: deep violet lacquer with painted neon pinstripes
      ctx.fillStyle = K.lg(ctx, X(0), 0, X(ins), 0, ['#120a26', '#2a1a52', '#3a2668']); ctx.fillRect(xa, 0, ins, h);
      ctx.fillStyle = rgb(NPINK, 0.7); ctx.fillRect(Math.min(X(3), X(4.2)), 0, 1.2, h);
      ctx.fillStyle = rgb(NCYAN, 0.5); ctx.fillRect(Math.min(X(16), X(16.8)), 0, 0.8, h);
      // a lacquer sheen down the rail
      ctx.fillStyle = 'rgba(200,170,255,.12)'; ctx.fillRect(Math.min(X(6), X(8)), 0, 2, h);
      // chasing bulbs in chrome cups
      for (let i = 0, y = 12 + sd * 11; y < h; i++, y += 22) {
        const k = (i + chase * (side < 0 ? 1 : -1)) % 4, on = ((k + 4) % 4) === 0 ? 1 : ((k + 4) % 4) === 1 ? 0.35 : 0;
        const bx = X(10);
        ctx.fillStyle = K.rg(ctx, bx - 2, y - 2, 6, ['#ffffff', '#a8b0c8', '#4a5070']); circ(ctx, bx, y, 4.6); ctx.fill();
        bulb(ctx, bx, y, 3.2, NEON[i % 3], on);
      }
      // the chrome wire rails: two bright tubes along the inner edge, on posts
      for (const [d, wd] of [[ins - 7, 3], [ins - 2.5, 3.2]]) {
        const x0 = Math.min(X(d - wd / 2), X(d + wd / 2));
        ctx.fillStyle = K.lg(ctx, x0, 0, x0 + wd, 0, side < 0 ? [CHROME[2], CHROME[0], CHROME[1], CHROME[4]] : [CHROME[4], CHROME[1], CHROME[0], CHROME[2]]); ctx.fillRect(x0, 0, wd, h);
      }
      for (let y = 40 + sd * 30; y < h; y += 70) {
        const px = X(ins - 4.7);
        ctx.fillStyle = K.lg(ctx, px - 5, y - 4, px + 5, y + 4, [CHROME[0], CHROME[2], CHROME[4]]); ctx.beginPath(); ctx.roundRect(px - 5.5, y - 3, 11, 6, 2); ctx.fill();
        ctx.fillStyle = '#4a4a6a'; circ(ctx, px, y, 1.3); ctx.fill();
      }
      // rubber posts poking into the shaft: a chrome post with a red rubber ring
      for (let y = 230 + sd * 170; y < h - 20; y += 400) {
        const px = X(ins + 2);
        ctx.fillStyle = K.rg(ctx, px - 2, y - 2, 7, ['#ff9a9a', '#e83a4a', '#8a1828']); circ(ctx, px, y, 6); ctx.fill();
        ctx.fillStyle = K.rg(ctx, px - 1, y - 1, 4, ['#ffffff', '#c8d0e0', '#5a6080']); circ(ctx, px, y, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, y, 4.6, 3.6, 4.6); ctx.stroke();
      }
      // neon rim light along the inner edge, shifting colour down its length
      add(ctx, () => {
        const ex = X(ins) + side * -0.5;
        for (const [lw, a] of [[10, 0.12], [4, 0.35]]) {
          ctx.strokeStyle = K.lg(ctx, 0, 0, 0, h, [rgb(NCYAN, a), rgb(NPINK, a), rgb(NGOLD, a * 0.8), rgb(NCYAN, a)]); ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(ex, 0); ctx.lineTo(ex, h); ctx.stroke();
        }
      });
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#c8f4ff', '#ffd0ea', '#fff0b0', '#c8f4ff']); ctx.fillRect(Math.min(X(ins), X(ins - 1.2)), 0, 1.2, h);
    }
    // drop targets on the right rail: three coloured targets, lit ones add to the multiplier
    const mult = Math.floor(ph(t, 4) / 1.33);
    for (let i = 0; i < 3; i++) {
      const y = 152 + i * 17, x = w - ins, on = i <= mult, c = NEON[i], down = on ? 4 : 0;
      if (on) K.glow(ctx, x - 5, y, 14, c, 0.35);
      ctx.fillStyle = K.lg(ctx, x - 10 + down, y, x + down, y, on ? ['#ffffff', rgb(c)] : [rgb(K.mix(c, [255, 255, 255], 0.2)), rgb(K.mix(c, [30, 20, 60], 0.4))]);
      ctx.beginPath(); ctx.roundRect(x - 10 + down, y - 7, 10, 14, 2); ctx.fill(); ctx.strokeStyle = rgb(K.mix(c, [30, 20, 60], 0.6)); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(x - 8.6 + down, y - 5.5, 1.2, 11);
      ctx.fillStyle = rgb(K.mix(c, [30, 20, 60], 0.55), 0.8); circ(ctx, x - 5 + down, y, 2); ctx.fill();
      bulb(ctx, x - 16, y, 2.6, c, on ? 1 : 0.1);
    }
  }

  // Pop Bumper: a mushroom bumper; skirt, chrome ring and a lit star cap that flashes and kicks when struck
  function popBumper(ctx, x, y, t, i, f) {
    const c = NEON[i], R = 19, kick = f * 3;
    K.glow(ctx, x, y, R * 2.6, c, 0.18 + 0.6 * f);
    // base / skirt
    ctx.fillStyle = 'rgba(8,4,20,.5)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 4, R + 3, R + 1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.rg(ctx, x - 5, y - 5, R + 6, ['#6a5aa0', '#2a2050', '#140e30']); circ(ctx, x, y, R + 2); ctx.fill();
    // chrome ring (kicks down when hit)
    ctx.strokeStyle = K.lg(ctx, x - R, y - R, x + R, y + R, [CHROME[0], CHROME[2], CHROME[3], CHROME[4]]); ctx.lineWidth = 3.4 - kick * 0.5; circ(ctx, x, y + kick * 0.4, R - 1 - kick * 0.6); ctx.stroke();
    // translucent coloured body with the lamp inside
    ctx.fillStyle = K.rg(ctx, x - 4, y - 5, R, f > 0.3 ? ['#ffffff', rgb(K.lift(c, 50)), rgb(c)] : [rgb(K.lift(c, 40)), rgb(c), rgb(K.mix(c, [30, 10, 50], 0.5))]);
    circ(ctx, x, y, R - 4); ctx.fill();
    // white cap with a star
    ctx.fillStyle = K.rg(ctx, x - 3, y - 4, R * 0.8, ['#ffffff', '#f0ecff', '#b8b0dc']); circ(ctx, x, y - 1, R * 0.56); ctx.fill();
    ctx.fillStyle = f > 0.3 ? '#ffffff' : rgb(c); ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * TAU / 10, r = k % 2 ? 2.6 : 6.4; ctx.lineTo(x + Math.cos(a) * r, y - 1 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgb(K.mix(c, [30, 10, 50], 0.4)); ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, R - 6, 3.5, 4.5); ctx.stroke();
    // flash: rays and a score pop
    if (f > 0.05) {
      add(ctx, () => {
        ctx.strokeStyle = rgb(K.lift(c, 60), f); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.2, r0 = R + 3 + (1 - f) * 6, r1 = r0 + 7 * f; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
      });
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgb([255, 255, 255], f); ctx.strokeStyle = rgb(K.mix(c, [40, 10, 60], 0.5), f); ctx.lineWidth = 2;
      const ty = y - R - 6 - (1 - f) * 14; ctx.strokeText('500', x, ty); ctx.fillText('500', x, ty);
    }
  }

  // Flipper: a glossy white flipper with a red rubber edge, pivoting on a chrome post at the wall
  // the flipper's anchor: a dark well round the pivot, a moulded inlane guide from the rail down to it, a chrome bracket
  function flipperMount(ctx, w, side, py) {
    ctx.save(); if (side > 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const L = PIN_IN, px = L + 16, yTop = py - 76;
    ctx.fillStyle = 'rgba(8,4,20,.6)'; ctx.beginPath(); ctx.ellipse(px + 2, py + 3, 14, 12, 0, 0, TAU); ctx.fill();
    const path = () => { ctx.beginPath(); ctx.moveTo(L + 1, yTop); ctx.quadraticCurveTo(L + 4, py - 40, px - 5, py - 13); };
    ctx.lineCap = 'round';
    ctx.save(); ctx.translate(2, 3); path(); ctx.strokeStyle = 'rgba(8,4,20,.5)'; ctx.lineWidth = 10; ctx.stroke(); ctx.restore();
    path(); ctx.strokeStyle = '#3a2468'; ctx.lineWidth = 9; ctx.stroke();
    ctx.save(); ctx.translate(3.2, 0); path(); ctx.strokeStyle = rgb(NPINK, 0.95); ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
    path(); ctx.strokeStyle = CHROME[4]; ctx.lineWidth = 3.4; ctx.stroke(); path(); ctx.strokeStyle = CHROME[1]; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(-0.6, -0.6); path(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
    // a lit arrow insert pointing down the inlane
    const on = Math.floor(t2 * 4) % 2;
    ctx.fillStyle = on ? rgb(NCYAN) : rgb(K.mix(NCYAN, [20, 14, 50], 0.6)); ctx.beginPath(); ctx.moveTo(L + 12, py - 44); ctx.lineTo(L + 17, py - 36); ctx.lineTo(L + 7, py - 38); ctx.closePath(); ctx.fill();
    if (on) K.glow(ctx, L + 12, py - 40, 10, NCYAN, 0.4);
    // rubber post capping the guide
    ctx.fillStyle = K.rg(ctx, L + 2, yTop - 2, 7, ['#ff9a9a', '#e83a4a', '#8a1828']); circ(ctx, L + 3, yTop, 5.5); ctx.fill();
    ctx.fillStyle = K.rg(ctx, L + 2, yTop - 1, 4, [CHROME[0], CHROME[1], CHROME[4]]); circ(ctx, L + 3, yTop, 2.8); ctx.fill();
    // chrome bracket bolted to the rail, carrying the pivot
    ctx.fillStyle = K.lg(ctx, 0, py - 8, 0, py + 8, [CHROME[0], CHROME[2], CHROME[4]]); ctx.beginPath(); ctx.roundRect(L - 8, py - 7.5, px - L + 12, 15, 6); ctx.fill();
    ctx.strokeStyle = '#4a4a6a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(L - 5, py - 5.5, px - L + 4, 1);
    for (const sx of [L - 3, L + 4]) { ctx.fillStyle = '#5a5a7a'; circ(ctx, sx, py, 1.6); ctx.fill(); ctx.strokeStyle = '#d8e0ee'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(sx - 1, py); ctx.lineTo(sx + 1, py); ctx.stroke(); }
    ctx.restore();
  }
  let t2 = 0;
  function flipper(ctx, px, py, side, a, hot) {
    const L = 68, r0 = 9, r1 = 4.6;
    ctx.save(); ctx.translate(px, py); ctx.scale(side < 0 ? 1 : -1, 1); ctx.rotate(a);
    if (hot > 0.05) K.danger(ctx, L * 0.55, 0, 44, 0.35 * hot);
    const shape = (g = 0) => { ctx.beginPath(); ctx.arc(0, 0, r0 + g, Math.PI / 2, Math.PI * 1.5); ctx.lineTo(L, -r1 - g); ctx.arc(L, 0, r1 + g, -Math.PI / 2, Math.PI / 2); ctx.closePath(); };
    ctx.fillStyle = 'rgba(8,4,20,.45)'; ctx.save(); ctx.translate(2, 3); shape(1.6); ctx.fill(); ctx.restore();
    shape(1.6); ctx.fillStyle = K.lg(ctx, 0, -r0, 0, r0, ['#ff8a96', '#e02a44', '#8a1428']); ctx.fill();
    shape(0); ctx.fillStyle = K.lg(ctx, 0, -r0, 0, r0, ['#ffffff', '#f2eefa', '#b8b0d4']); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, -r0 + 2.6); ctx.lineTo(L - 4, -r1 + 1.6); ctx.stroke();
    ctx.fillStyle = rgb(NPINK, 0.9); ctx.beginPath(); ctx.moveTo(14, -1.6); ctx.lineTo(L - 10, -0.8); ctx.lineTo(L - 10, 0.8); ctx.lineTo(14, 1.6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(8,4,20,.4)'; circ(ctx, px + 1, py + 1.5, 7); ctx.fill();
    ctx.fillStyle = K.rg(ctx, px - 2, py - 2, 8, [CHROME[0], CHROME[1], CHROME[4]]); circ(ctx, px, py, 6.5); ctx.fill(); ctx.strokeStyle = '#4a4a6a'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = '#4a4a6a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(px - 2.4, py); ctx.lineTo(px + 2.4, py); ctx.stroke();
  }

  PV.sections['pinball'] = (ctx, w, h, t) => {
    pinBackground(ctx, w, h, t);
    const p = ph(t, 4), L = PIN_IN, R = w - PIN_IN;
    coin(ctx, 134, 200, t, 0.2); coin(ctx, 200, 236, t, 1.4); coin(ctx, 90, 250, t, 2.4);
    // the plunger lane in the left rail (drawn under the wall's edge)
    pinWalls(ctx, w, h, t);
    // plunger: a chrome rod and red knob on a spring; draws back (tell) then fires the ball
    const pull = p < 0.9 ? 0 : p < BALL_T0 ? ease((p - 0.9) / (BALL_T0 - 0.9 - 0.05)) : Math.max(0, 1 - (p - BALL_T0) * 12);
    const tipX = L + 10 - pull * 12, py = 206;
    ctx.fillStyle = K.lg(ctx, 0, py - 13, 0, py + 13, [CHROME[0], CHROME[2], CHROME[4]]); ctx.beginPath(); ctx.roundRect(L - 28, py - 13, 32, 26, 5); ctx.fill();
    ctx.strokeStyle = '#4a4a6a'; ctx.lineWidth = 0.8; ctx.stroke();
    for (const yy of [py - 10, py + 10]) { ctx.fillStyle = '#5a5a7a'; circ(ctx, L - 24, yy, 1.2); ctx.fill(); }
    ctx.fillStyle = 'rgba(8,4,20,.9)'; ctx.beginPath(); ctx.roundRect(L - 26, py - 8, 30, 16, 4); ctx.fill();
    for (let i = 0; i < 6; i++) { const x = L - 22 + i * (tipX - L + 20) / 6; ctx.strokeStyle = '#c8d0e0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, py, 1.6, 5.5, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = K.lg(ctx, 0, py - 2.5, 0, py + 2.5, [CHROME[0], CHROME[2]]); ctx.fillRect(L - 24, py - 2, tipX - L + 22, 4);
    ctx.fillStyle = K.lg(ctx, tipX - 4, py - 9, tipX + 4, py + 9, ['#ff9aa4', '#e02a44', '#8a1428']); ctx.beginPath(); ctx.roundRect(tipX - 4, py - 9, 8, 18, 3.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tipX - 2, py - 6); ctx.lineTo(tipX - 2, py + 4); ctx.stroke();
    if (p > 0.9 && p < BALL_T0) bulb(ctx, L - 14, py - 14, 2.6, NPINK, Math.sin(t * 30) > 0 ? 1 : 0.2);
    // bumpers
    BUMP.forEach(([bx, by], i) => popBumper(ctx, bx, by, t, i, bumpFlash(i, p)));
    // flippers: the left one flicks up, then the right; each loops in 4 s
    const flip = (q) => q < 0.35 ? 0 : q < 0.45 ? easeOut((q - 0.35) / 0.1) : q < 0.8 ? 1 : q < 1.05 ? 1 - ease((q - 0.8) / 0.25) : 0;
    const fl = flip(ph(t, 4, 0.3)), fr = flip(ph(t, 4, 2.3));
    const twL = ph(t, 4, 0.3) < 0.35 && ph(t, 4, 0.3) > 0.05 ? Math.sin(t * 50) * 0.03 : 0, twR = ph(t, 4, 2.3) < 0.35 && ph(t, 4, 2.3) > 0.05 ? Math.sin(t * 50) * 0.03 : 0;
    t2 = t; flipperMount(ctx, w, -1, 300); flipperMount(ctx, w, 1, 336);
    for (const [side, px, py2, f, tw, q] of [[-1, L + 16, 300, fl, twL, ph(t, 4, 0.3)], [1, R - 16, 336, fr, twR, ph(t, 4, 2.3)]]) {
      if (q > 0.36 && q < 0.62) add(ctx, () => {
        const k = 1 - (q - 0.36) / 0.26, a0 = side < 0 ? -0.5 : Math.PI + 0.5, a1 = side < 0 ? 0.55 : Math.PI - 0.55;
        ctx.fillStyle = K.rg(ctx, px, py2, 80, [rgb(NCYAN, 0), rgb(NCYAN, 0), rgb([200, 250, 255], 0.38 * k), rgb(NCYAN, 0)]);
        ctx.beginPath(); ctx.moveTo(px, py2); ctx.arc(px, py2, 80, Math.min(a0, a1), Math.max(a0, a1)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgb([230, 255, 255], 0.7 * k); ctx.lineWidth = 1.4; for (const rr of [60, 72]) { ctx.beginPath(); ctx.arc(px, py2, rr, Math.min(a0, a1) + 0.1, Math.max(a0, a1) - 0.1); ctx.stroke(); }
      });
      flipper(ctx, px, py2, side, lerp(0.55, -0.5, f) + tw, f);
      bulb(ctx, px + side * -2, py2 + 16, 2.4, NCYAN, q > 0.05 && q < 0.4 ? 1 : 0.1);
    }
    // the steel ball: waiting at the plunger, then ricocheting off the rails and bumpers with a trail
    let bp = null;
    if (p < BALL_T0) { if (p > 0.15) bp = [tipX + BALL_R + 1, py]; }
    else bp = ballAt(p);
    if (bp) {
      if (p >= BALL_T0) for (let k = 6; k >= 1; k--) { const q = ballAt(p - k * 0.022); if (q) { ctx.fillStyle = `rgba(200,210,255,${0.12 * (7 - k) / 6})`; circ(ctx, q[0], q[1], BALL_R * (1 - k * 0.07)); ctx.fill(); } }
      K.danger(ctx, bp[0], bp[1], 22, 0.4);
      ctx.save(); ctx.globalAlpha = p < 0.35 ? (p - 0.15) / 0.2 : 1; steelBall(ctx, bp[0], bp[1], BALL_R); ctx.restore();
    }
    // spark where the ball strikes the rail
    for (const k of [1, 4]) { const d = p - hitTime(k); if (d > 0 && d < 0.2) { const q = PATH[k], f = 1 - d / 0.2; twinkle(ctx, q[0] + (k === 1 ? 5 : -5), q[1], 7 * f, f); } }
    K.rocket(ctx, w * 0.5 + (p > 2.3 && p < 3.4 ? Math.sin(Math.PI * (p - 2.3) / 1.1) * 12 : 0), h * 0.8, 0.75, t);
    const rr = K.rand(23);
    for (let i = 0; i < 14; i++) { const x = 40 + rr() * 190, y = rr() * h, ph2 = rr() * TAU, tw = Math.max(0, Math.sin(t * 3 + ph2)); twinkle(ctx, x, y, 2.6 * tw, 0.8 * tw, K.mix(NEON[i % 3], [255, 255, 255], 0.5)); }
  };
})();
