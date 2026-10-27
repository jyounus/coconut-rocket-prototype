// Nature group previews: Sandstorm Canyon, Anthill Underworks, Bamboo Pagoda, Hollow Palm.
(() => {
  const { TAU, clamp, lerp, smooth, rgb } = K;
  const cyc = (t, p, off = 0) => (((t + off) % p) + p) % p;          // seconds into a loop of p seconds
  const bump = (x, a, b, c, d) => smooth(a, b, x) * (1 - smooth(c, d, x));
  const circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };
  const ell = (ctx, x, y, rx, ry, a = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), a, 0, TAU); };

  // a game coin: glossy gold disc with a rim, an embossed palm, spinning a little
  function coin(ctx, x, y, r, t, ph = 0) {
    const sx = Math.max(0.2, Math.abs(Math.cos(t * 1.8 + ph)));
    K.glow(ctx, x, y, r * 2.6, [255, 205, 90], 0.22);
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
    ctx.fillStyle = K.lg(ctx, 0, -r, 0, r, ['#fff3b0', '#f6bf3c', '#b86c14']); circ(ctx, 0, 0, r); ctx.fill();
    ctx.strokeStyle = '#9a560e'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, -r, 0, r, ['#d8891c', '#f7c444', '#ffe68a']); circ(ctx, 0, 0, r * 0.76); ctx.fill();
    // embossed palm: dark furrow then lit ridge
    for (const [c, o] of [['rgba(150,80,10,.85)', 0.5], ['rgba(255,248,200,.9)', -0.3]]) {
      ctx.strokeStyle = c; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(-r * 0.12 + o, r * 0.55 + o); ctx.quadraticCurveTo(r * 0.12 + o, r * 0.1 + o, o, -r * 0.3 + o);
      for (const [dx, dy] of [[-0.45, -0.1], [-0.38, -0.5], [0.42, -0.45], [0.48, -0.05]]) { ctx.moveTo(o, -r * 0.3 + o); ctx.quadraticCurveTo(r * dx * 0.6 + o, r * (dy - 0.25) + o, r * dx + o, r * dy + o); }
      ctx.stroke();
    }
    K.sheen(ctx, 0, 0, r, 0.6);
    ctx.restore();
  }

  // a tapered tube along a list of points (for tails, worms, roots): fills circles with a gradient
  function polyAt(pts, u) {
    const n = pts.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
    return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
  }
  function bez(p0, p1, p2, u) { const a = 1 - u; return [a * a * p0[0] + 2 * a * u * p1[0] + u * u * p2[0], a * a * p0[1] + 2 * a * u * p1[1] + u * u * p2[1]]; }

  // ======================================================================================
  // SANDSTORM CANYON
  // ======================================================================================
  const SAND = {
    bgTop: [232, 196, 184], bgBot: [204, 158, 150], far: [220, 178, 170], far2: [206, 156, 144],
    wall: [100, 34, 22], wallIn: [34, 10, 8], rim: [150, 70, 40], seed: 2, inset: 31, wobble: 1.15,
  };
  // sandstone bands: [colour, min thickness, extra] (iron red, deep maroon, rust, ochre, cream)
  const STRATA = [[[132, 40, 24], 12, 12], [[176, 112, 52], 5, 4], [[100, 30, 20], 10, 14], [[222, 182, 132], 4, 3], [[156, 62, 34], 10, 10], [[118, 36, 24], 8, 10], [[188, 126, 62], 5, 5], [[90, 28, 20], 12, 10]];
  // a rim light that brightens and dims along the wall (additive), on top of the kit's dim rim
  function rimVary(ctx, edge, h, col, seed, k = 1) {
    // segments are bucketed into 6 brightness levels so each level is one path (cheap)
    const L = 6, paths = Array.from({ length: L }, () => []);
    for (let y = -4; y < h + 4; y += 6) {
      const a = clamp(0.25 + 0.75 * (0.5 + 0.5 * Math.sin(y * 0.027 + seed)) * (0.55 + 0.45 * Math.sin(y * 0.083 + seed * 2.3)), 0, 1);
      paths[Math.min(L - 1, Math.floor(a * L))].push(y);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [lw, al] of [[8, 0.12], [3.2, 0.4], [1.3, 0.9]]) for (let i = 0; i < L; i++) {
      if (!paths[i].length) continue;
      ctx.strokeStyle = rgb(col, al * k * (i + 0.5) / L); ctx.lineWidth = lw; ctx.beginPath();
      for (const y of paths[i]) { ctx.moveTo(edge(y), y); ctx.lineTo(edge(y + 6), y + 6); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // sandstorm gusts: blowing right, calm, blowing left, calm (4 s loop); returns -1..1
  const gust = t => { const c = cyc(t, 4); return bump(c, 0.1, 0.6, 1.2, 1.7) - bump(c, 2.1, 2.6, 3.2, 3.7); };

  function sandFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the slice of blue sky between the canyon rims, with puffy clouds
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, h * 0.42, [[0, '#4aa4e8'], [0.4, '#9ad0f0'], [0.75, 'rgba(240,210,200,.7)'], [1, 'rgba(232,196,184,0)']]);
      ctx.fillRect(0, 0, w, h * 0.42);
      K.glow(ctx, w * 0.7, h * 0.02, 70, [255, 250, 220], 0.35);
      for (const [cx, cy, s, sp] of [[0.3, 0.07, 1, 4], [0.78, 0.13, 0.7, 6]]) {
        const x = ((cx * w + t * sp) % (w + 80)) - 20, y = cy * h;
        ctx.fillStyle = K.lg(ctx, 0, y - 12 * s, 0, y + 8 * s, ['rgba(255,255,255,.95)', 'rgba(236,236,246,.85)', 'rgba(250,210,180,.7)']);
        ctx.beginPath(); for (const [ox, oy, r] of [[-14, 2, 8], [-4, -4, 11], [9, -1, 9], [18, 3, 6]]) { ctx.moveTo(x + ox * s + r * s, y + oy * s); ctx.arc(x + ox * s, y + oy * s, r * s, 0, TAU); } ctx.fill();
        ctx.fillRect(x - 20 * s, y + 1 * s, 42 * s, 7 * s);
      }
      // far canyon walls closing in from both sides, banded
      const rr = K.rand(7);
      for (const side of [-1, 1]) {
        const pts = [];
        for (let y = -5; y <= h + 5; y += 18) pts.push([(side < 0 ? w * 0.16 : w * 0.84) - side * (Math.sin(y * 0.013 + side) * 10 + (rr() - 0.5) * 8 + Math.max(0, 0.3 * h - y) * 0.32), y]);
        ctx.beginPath(); ctx.moveTo(side < 0 ? -2 : w + 2, -5); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(side < 0 ? -2 : w + 2, h + 5); ctx.closePath();
        ctx.fillStyle = rgb(col); ctx.fill();
        ctx.save(); ctx.clip();
        for (let y = 0; y < h; y += 13) { ctx.fillStyle = rgb(K.lift(col, (y / 13) % 3 === 0 ? 8 : (y / 13) % 3 === 1 ? -6 : 2), 0.6); ctx.fillRect(0, y + Math.sin(y) * 2, w, 6); }
        ctx.restore();
        // sunlit lip
        ctx.strokeStyle = 'rgba(255,226,170,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      }
    } else {
      // a natural arch and hoodoo stacks, nearer and deeper red
      const c = rgb(col), lit = rgb(K.lift(col, 26), 0.8), dk = rgb(K.lift(col, -18), 0.7);
      ctx.fillStyle = c;
      const ay = h * 0.4;
      ctx.beginPath(); ctx.moveTo(w * 0.05, ay + 60); ctx.lineTo(w * 0.08, ay - 6); ctx.quadraticCurveTo(w * 0.5, ay - 40, w * 0.95, ay - 2); ctx.lineTo(w * 0.93, ay + 70);
      ctx.lineTo(w * 0.82, ay + 70); ctx.quadraticCurveTo(w * 0.8, ay + 6, w * 0.5, ay - 8); ctx.quadraticCurveTo(w * 0.24, ay + 2, w * 0.2, ay + 64); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = lit; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(w * 0.08, ay - 6); ctx.quadraticCurveTo(w * 0.5, ay - 40, w * 0.95, ay - 2); ctx.stroke();
      ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.beginPath(); for (const k of [6, 13]) { ctx.moveTo(w * 0.1, ay - 6 + k); ctx.quadraticCurveTo(w * 0.5, ay - 38 + k, w * 0.92, ay - 2 + k); } ctx.stroke();
      // distant sandfalls spilling off the arch
      for (const [fx, fw] of [[0.36, 5], [0.63, 3.5]]) {
        const x = w * fx, y0 = ay - 22;
        const y1 = h * 0.78, sw = yy => fw * (0.6 + (yy - y0) / (y1 - y0) * 1.8) + Math.sin(yy * 0.05 + t * 3 + fx * 9) * 1.2;
        ctx.fillStyle = K.lg(ctx, 0, y0, 0, y1, ['rgba(255,236,210,.42)', 'rgba(255,220,190,.18)', 'rgba(255,220,190,0)']);
        ctx.beginPath(); for (let yy = y0; yy <= y1; yy += 12) ctx.lineTo(x - sw(yy), yy); for (let yy = y1; yy >= y0; yy -= 12) ctx.lineTo(x + sw(yy) * 0.8, yy); ctx.fill();
        ctx.fillStyle = 'rgba(255,246,230,.25)';
        for (let k = 0; k < 4; k++) { const yy = y0 + ((t * 40 + k * 50) % ((y1 - y0) * 0.7)); ctx.fillRect(x - 1, yy, 1.2, 12); }
      }
      ctx.fillStyle = c;
      for (const [hx, hw, hh] of [[0.3, 13, 0.3], [0.52, 9, 0.2], [0.72, 15, 0.36]]) {
        const x = w * hx, top = h - h * hh;
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - hw, h + 2);
        for (let k = 0; k <= 4; k++) { const yy = lerp(h, top + 10, k / 4), ww = hw * (k % 2 ? 0.75 : 1.05); ctx.lineTo(x - ww, yy); }
        ctx.lineTo(x - hw * 1.5, top + 8); ctx.quadraticCurveTo(x, top - 4, x + hw * 1.5, top + 8);
        for (let k = 4; k >= 0; k--) { const yy = lerp(h, top + 10, k / 4), ww = hw * (k % 2 ? 0.75 : 1.05); ctx.lineTo(x + ww, yy); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = lit; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - hw * 1.5, top + 8); ctx.quadraticCurveTo(x - hw * 0.5, top, x + hw * 0.3, top + 2); ctx.stroke();
      }
      // a lilac dust haze lying low in the canyon
      ctx.fillStyle = K.lg(ctx, 0, h * 0.35, 0, h, ['rgba(236,206,214,0)', 'rgba(226,190,200,.35)', 'rgba(240,206,190,.5)']); ctx.fillRect(0, h * 0.35, w, h * 0.65);
    }
  }

  function sandWall(ctx, side, edge, w, h, t) {
    const X = d => side < 0 ? d : w - d, depth = 48, r = K.rand(side < 0 ? 31 : 57);
    let y = -12, i = side < 0 ? 0 : 3;
    const bands = [];
    while (y < h + 12) {
      const [c, mn, ex] = STRATA[i % STRATA.length], th = mn + r() * ex, tilt = (r() - 0.5) * 0.3 + side * 0.06, ph = r() * 9;
      const top = d => y + d * tilt + Math.sin(d * 0.16 + ph) * 1.4, bot = d => y + th + d * tilt + Math.sin(d * 0.14 + ph + 1) * 1.5;
      ctx.beginPath();
      for (let d = 0; d <= depth; d += 4) ctx.lineTo(X(d), top(d));
      for (let d = depth; d >= 0; d -= 4) ctx.lineTo(X(d), bot(d) + 1);
      ctx.closePath(); ctx.fillStyle = K.lg(ctx, 0, y, 0, y + th, [K.lift(c, 16), c, K.lift(c, -18)]); ctx.fill();
      bands.push([top, c]);
      // cross-bedding swirls in the thick bands
      if (th > 17) {
        const cx = X(8 + r() * 26), cy = y + th * 0.5;
        ctx.lineWidth = 0.8;
        for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgb(K.lift(c, -32), 0.5); ctx.beginPath(); ctx.arc(cx, cy + 6, 4 + k * 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.strokeStyle = rgb(K.lift(c, 46), 0.4); ctx.beginPath(); ctx.arc(cx, cy + 7.2, 4 + k * 3.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      }
      y += th; i++;
    }
    // band boundaries as line pairs: a dark furrow with a lit ridge just under it
    ctx.lineWidth = 1;
    for (const [col, o] of [['rgba(44,10,6,.6)', 0], ['rgba(255,214,170,.32)', 1.1]]) {
      ctx.strokeStyle = col; ctx.beginPath();
      for (const [top] of bands) for (let d = 0; d <= depth; d += 6) d ? ctx.lineTo(X(d), top(d) + o) : ctx.moveTo(X(d), top(d) + o);
      ctx.stroke();
    }
    // desert varnish streaks running down
    for (let k = 0; k < 6; k++) {
      const vx = X(4 + r() * 34), vy = r() * h, vl = 30 + r() * 60;
      ctx.fillStyle = K.lg(ctx, 0, vy, 0, vy + vl, ['rgba(40,12,8,.4)', 'rgba(40,12,8,0)']);
      ctx.beginPath(); ctx.moveTo(vx - 2, vy); ctx.quadraticCurveTo(vx - 1, vy + vl * 0.6, vx, vy + vl); ctx.quadraticCurveTo(vx + 1.5, vy + vl * 0.5, vx + 2.5, vy); ctx.fill();
    }
    // cracks zig-zagging down through the bands, lit on their lower-right lip
    for (let k = 0; k < 4; k++) {
      const pts = []; let cx = 8 + r() * 28, cy = r() * h; const L = 40 + r() * 50;
      for (let q = 0; q <= 6; q++) { pts.push([X(cx), cy]); cx = clamp(cx + (r() - 0.5) * 9, 3, 44); cy += L / 6; }
      for (const [col, lw, o] of [['rgba(30,8,6,.85)', 1.5, 0], ['rgba(255,200,150,.55)', 0.8, 1]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], q) => q ? ctx.lineTo(px + o, py + o) : ctx.moveTo(px + o, py + o)); ctx.stroke(); }
      const [bx, by] = pts[3]; ctx.strokeStyle = 'rgba(30,8,6,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + side * -6, by + 8); ctx.stroke();
    }
    // inner-shadow toward the screen edge, warm bounce light near the rim
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(depth), 0, ['rgba(36,8,6,.62)', 'rgba(36,8,6,.2)', 'rgba(255,170,90,.08)']);
    ctx.fillRect(Math.min(X(0), X(depth)), 0, depth, h);
  }

  // a sandstone overhang jutting from the wall, banded face, with its shadow cast on the wall below
  function overhang(ctx, x0, y, side, len) {
    const x1 = x0 + side * len;
    ctx.fillStyle = K.lg(ctx, 0, y + 4, 0, y + 34, ['rgba(30,8,6,.55)', 'rgba(30,8,6,0)']);
    ctx.beginPath(); ctx.moveTo(x0 - side * 16, y + 4); ctx.lineTo(x0 + side * 3, y + 5); ctx.quadraticCurveTo(x0 + side * 1, y + 20, x0 - side * 2, y + 34); ctx.lineTo(x0 - side * 16, y + 34); ctx.closePath(); ctx.fill();
    K.shadow(ctx, x0 + side * len * 0.45, y + 10, len * 0.5, 4, 0.22);
    ctx.beginPath(); ctx.moveTo(x0 - side * 8, y - 8); ctx.quadraticCurveTo(x0 + side * len * 0.6, y - 10, x1, y - 4); ctx.quadraticCurveTo(x1 + side * 3, y + 1, x1 - side * 2, y + 5); ctx.quadraticCurveTo(x0 + side * len * 0.4, y + 8, x0 - side * 8, y + 9); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 10, 0, y + 9, ['#e8a874', '#a8482a', '#6a2216', '#3a100a']); ctx.fill();
    ctx.strokeStyle = '#3e120a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.clip();
    for (const [o, c] of [[-2, 'rgba(230,186,130,.55)'], [2.5, 'rgba(176,112,52,.6)']]) { ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0 - side * 8, y + o); ctx.quadraticCurveTo(x0 + side * len * 0.5, y + o - 2, x1, y + o + 1); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,224,180,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y - 8.5); ctx.quadraticCurveTo(x0 + side * len * 0.6, y - 10.5, x1 - side * 1, y - 4.5); ctx.stroke();
  }

  // a stubby cartoon cactus standing on a wall ledge; dir = which way it leans
  function cactus(ctx, x, y, s, dir, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    const body = (bx, by, bw, bh) => {
      ctx.fillStyle = K.lg(ctx, bx - bw, 0, bx + bw, 0, ['#9fd65a', '#4f9a34', '#2c6224']);
      ctx.beginPath(); ctx.roundRect(bx - bw, by - bh, bw * 2, bh, bw); ctx.fill();
      ctx.strokeStyle = '#24501c'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(30,70,24,.6)'; ctx.beginPath(); ctx.moveTo(bx, by - bh + 3); ctx.lineTo(bx, by - 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(210,250,150,.6)'; ctx.beginPath(); ctx.moveTo(bx - bw * 0.5, by - bh + 4); ctx.lineTo(bx - bw * 0.5, by - 2); ctx.stroke();
      ctx.fillStyle = '#fff2c8'; for (let k = 0; k < bh / 5; k++) { const sy = by - bh + 4 + k * 5; ctx.fillRect(bx - bw - 1.2, sy, 1.4, 0.7); ctx.fillRect(bx + bw - 0.2, sy + 2, 1.4, 0.7); }
    };
    body(-6, -6, 2.6, 11); body(5, -9, 2.4, 9);
    ctx.fillStyle = '#4f9a34'; ctx.fillRect(-4, -9, 7, 3); ctx.fillRect(1, -12, 4, 3);
    body(0, 0, 4, 22);
    // a pink bloom
    const pk = 0.5 + 0.5 * Math.sin(t * 2);
    ctx.fillStyle = K.rg(ctx, 0, -22, 4, ['#fff0f6', '#ff6fa8', '#c82a6a']);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.3; ell(ctx, Math.cos(a) * 2.2, -22 + Math.sin(a) * 1.4, 2, 1.3, a); ctx.fill(); }
    ctx.fillStyle = '#ffd84a'; circ(ctx, 0, -22, 1 + pk * 0.2); ctx.fill();
    ctx.restore();
  }

  // a rock ledge sticking out of the wall: x0 is the wall edge, len how far it reaches
  function rockLedge(ctx, x0, y, len, side, thick = 9) {
    const x1 = x0 + side * len;
    ctx.beginPath(); ctx.moveTo(x0 - side * 6, y - 1); ctx.lineTo(x1 - side * 3, y - 2); ctx.quadraticCurveTo(x1 + side * 2, y, x1 - side * 1, y + thick * 0.5);
    ctx.quadraticCurveTo(x1 - side * len * 0.4, y + thick * 1.4, x0 - side * 6, y + thick * 1.6); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 2, 0, y + thick * 1.6, ['#e8a070', '#a8482a', '#5a1c12']); ctx.fill();
    ctx.strokeStyle = '#3e120a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,.8)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x0, y - 0.6); ctx.lineTo(x1 - side * 3, y - 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,34,20,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0, y + thick * 0.6); ctx.lineTo(x1 - side * 5, y + thick * 0.55); ctx.stroke();
  }

  // a bleached ram horn poking out of the rock
  function horn(ctx, x, y, s, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.bezierCurveTo(10, -14, 22, -6, 18, 4); ctx.bezierCurveTo(15, 11, 6, 9, 8, 3); ctx.bezierCurveTo(10, -1, 13, 2, 12, 3);
    ctx.bezierCurveTo(15, -4, 6, -6, 1, 4); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, -12, 0, 10, ['#fffaf0', '#ead8b8', '#a88a68']); ctx.fill();
    ctx.strokeStyle = '#8a6a4c'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(140,110,80,.7)'; ctx.lineWidth = 0.7; ctx.beginPath();
    for (const a of [0.2, 0.35, 0.5, 0.65, 0.8]) { const px = lerp(2, 17, a), py = lerp(-6, -4, a) - Math.sin(a * Math.PI) * 6; ctx.moveTo(px, py); ctx.lineTo(px + 2, py + 7 - a * 3); }
    ctx.stroke();
    ctx.restore();
  }

  function sandfall(ctx, cx, cy, h, w, t) {
    const c = cyc(t, 3.4, 0.6);
    const pour = smooth(1.2, 1.6, c) * (1 - smooth(2.7, 3.3, c)), dribble = smooth(0.6, 1.0, c) * (1 - smooth(2.9, 3.4, c));
    const wd = 3 + pour * 17, len = h * 0.36 * (0.55 + 0.45 * Math.max(pour, dribble * 0.6)), wind = gust(t);
    const xAt = (yy, k) => cx + 4 + (1 - Math.exp(-yy / 14)) * 16 + wind * 14 * Math.pow(yy / len, 1.4) + k * wd * (0.6 + yy / len * 0.6);
    // the crack it pours from
    ctx.fillStyle = '#4a1610'; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 7); ctx.lineTo(cx + 3, cy - 2); ctx.lineTo(cx + 5, cy + 3); ctx.lineTo(cx - 6, cy + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,140,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 6); ctx.lineTo(cx + 5, cy + 3); ctx.stroke();
    // slow-zone haze behind the curtain
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.lg(ctx, 0, cy, 0, cy + len, ['rgba(255,190,90,.0)', `rgba(255,180,80,${0.18 * pour})`, 'rgba(255,170,80,0)']);
    ctx.beginPath(); ctx.moveTo(xAt(0, -0.6), cy); for (let yy = 0; yy <= len; yy += 10) ctx.lineTo(xAt(yy, -0.9) - 6, cy + yy); for (let yy = len; yy >= 0; yy -= 10) ctx.lineTo(xAt(yy, 0.9) + 6, cy + yy); ctx.fill();
    ctx.restore();
    // strands of falling sand
    const strands = 3 + Math.round(pour * 5);
    for (let s = 0; s < strands; s++) {
      const k = strands === 1 ? 0 : s / (strands - 1) - 0.5, lw = 1.6 + pour * 2.4 * (1 - Math.abs(k));
      ctx.strokeStyle = K.lg(ctx, 0, cy, 0, cy + len, ['rgba(255,226,150,.95)', 'rgba(242,176,96,.85)', 'rgba(230,150,80,0)']);
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
      for (let yy = 0; yy <= len; yy += 6) { const x = xAt(yy, k) + Math.sin(yy * 0.08 + t * 9 + s) * 0.8; yy ? ctx.lineTo(x, cy + yy) : ctx.moveTo(x, cy + yy); }
      ctx.stroke();
    }
    // lit edge strand
    ctx.strokeStyle = 'rgba(255,250,220,.7)'; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let yy = 0; yy <= len * 0.8; yy += 6) { const x = xAt(yy, -0.45); yy ? ctx.lineTo(x, cy + yy) : ctx.moveTo(x, cy + yy); } ctx.stroke();
    // grains streaming down
    const r = K.rand(91);
    for (let g = 0; g < 26; g++) {
      const k = r() - 0.5, sp = 0.7 + r() * 0.6, yy = ((r() * len + t * 120 * sp) % len);
      const a = (0.3 + 0.7 * Math.max(pour, 0.3)) * (1 - yy / len);
      ctx.fillStyle = `rgba(255,236,180,${a})`; ctx.fillRect(xAt(yy, k * 1.3), cy + yy, 1.3, 2.2);
    }
    // dust puff where it thins out
    for (let p = 0; p < 4; p++) {
      const u = cyc(t * 0.8 + p * 0.25, 1), px = xAt(len, (p - 1.5) * 0.4) + (u - 0.5) * 14, py = cy + len - 6 - u * 10;
      ctx.fillStyle = `rgba(255,214,160,${0.25 * pour * (1 - u)})`; circ(ctx, px, py, 5 + u * 9); ctx.fill();
    }
  }

  function sandworm(ctx, wx, y, w, t) {
    const c = cyc(t, 3.6, 0.0), side = -1;   // emerges from the right wall, lunges left
    const tell = smooth(0.05, 1.4, c) * (1 - smooth(1.55, 1.65, c));
    const out = smooth(1.6, 1.85, c) * (1 - smooth(3.0, 3.42, c));
    const hole = smooth(1.58, 1.65, c) * (1 - smooth(3.42, 3.6, c));
    const shake = tell * Math.sin(t * 70) * 1.2;
    // tell: sand trickles out of hairline cracks and the wall bulges
    if (tell > 0.01 && out < 0.05) {
      const b = tell * 11;
      K.danger(ctx, wx - 8, y, 30 + 10 * tell, 0.18 * tell);
      K.shadow(ctx, wx - 2 + shake, y + 6, b + 6, 16 + b * 0.5, 0.35);
      ctx.fillStyle = K.rg(ctx, wx - b * 0.7 + shake, y - 8, b * 1.6 + 16, [[0, '#ffc488'], [0.35, '#d86a3a'], [0.8, '#9a3a20'], [1, '#5a1a10']]);
      ell(ctx, wx + shake, y, b + 2, 14 + b * 0.5); ctx.fill();
      // strata lines carried over the bulge
      ctx.save(); ell(ctx, wx + shake, y, b + 2, 14 + b * 0.5); ctx.clip();
      ctx.strokeStyle = 'rgba(90,26,14,.55)'; ctx.lineWidth = 1; ctx.beginPath(); for (const o of [-8, -1, 6]) { ctx.moveTo(wx - b - 3 + shake, y + o); ctx.quadraticCurveTo(wx - b * 0.3 + shake, y + o - 3, wx + 3 + shake, y + o + 1); } ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#5a1c12'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = Math.PI * (0.55 + k * 0.22); ctx.moveTo(wx - b * 0.3 + shake, y); ctx.lineTo(wx + Math.cos(a) * (b + 4) + shake, y + Math.sin(a) * (12 + b * 0.5)); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,214,150,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(wx + shake, y, b + 1.5, Math.PI * 0.85, Math.PI * 1.35); ctx.stroke();
      // trickles
      for (let k = 0; k < 3; k++) {
        const sx = wx - 2 - k * 3, sl = 10 + tell * 26 + k * 4;
        ctx.strokeStyle = 'rgba(255,214,140,.8)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(sx, y + 8 + k * 3); ctx.quadraticCurveTo(sx - 3, y + 14 + k * 3, sx - 3, y + sl + k * 3); ctx.stroke();
      }
      for (let k = 0; k < 4; k++) { const py = y - 10 + k * 6 + Math.sin(t * 50 + k) * 1.2; ctx.fillStyle = '#c86a3a'; circ(ctx, wx - b - 1 + Math.sin(t * 40 + k * 2), py, 1.5); ctx.fill(); }
    }
    // the burst hole
    if (hole > 0.01) {
      ctx.fillStyle = K.rg(ctx, wx, y, 22, ['rgba(40,10,6,.95)', 'rgba(80,24,14,.9)', 'rgba(120,40,22,0)']);
      ell(ctx, wx + 2, y, 13 * hole, 19 * hole); ctx.fill();
      ctx.strokeStyle = `rgba(255,200,130,${0.7 * hole})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(wx + 2, y, 13 * hole, 19 * hole, 0, Math.PI * 0.6, Math.PI * 1.45); ctx.stroke();
    }
    // flying rubble during the burst
    if (c > 1.6 && c < 2.6) {
      const u = (c - 1.6) / 1.0, r = K.rand(17);
      for (let k = 0; k < 8; k++) {
        const vx = -(30 + r() * 70), vy = -40 - r() * 60, px = wx + vx * u, py = y + vy * u + 160 * u * u, s = 2 + r() * 2.5;
        ctx.fillStyle = K.lg(ctx, px, py - s, px, py + s, ['#f2a466', '#9a4024']); ctx.beginPath(); ctx.moveTo(px - s, py); ctx.lineTo(px - s * 0.2, py - s); ctx.lineTo(px + s, py - s * 0.2); ctx.lineTo(px + s * 0.4, py + s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(255,214,160,${0.35 * (1 - u)})`; circ(ctx, wx - 6 + vx * u * 0.4, y + vy * u * 0.3, 6 + u * 10); ctx.fill();
      }
    }
    if (out < 0.01) return;
    // the worm body: an S curve out of the wall, head leading
    const reach = w * 0.52 * out * (1 + 0.05 * Math.sin(c * 5)), hx = wx - reach, hy = y + Math.sin(c * 4) * 5 * out;
    const p0 = [wx + 14, y + 4], p1 = [wx - reach * 0.45, y + 26 * out], p2 = [hx, hy];
    K.danger(ctx, hx, hy, 46, 0.32);
    K.shadow(ctx, wx - reach * 0.5, y + 24, reach * 0.55 + 10, 8, 0.25);
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const u = i / N, [sx, sy] = bez(p0, p1, p2, u * 0.94), rr = lerp(10, 14, u) * (0.92 + 0.08 * Math.sin(u * 20 - t * 12));
      ctx.fillStyle = K.rg(ctx, sx - rr * 0.35, sy - rr * 0.5, rr * 1.35, ['#fff1b0', '#f2c062', '#c47a34', '#7e4420']);
      circ(ctx, sx, sy, rr); ctx.fill();
      ctx.strokeStyle = '#7a3e1c'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(sx, sy, rr, Math.PI * 0.15, Math.PI * 0.95); ctx.stroke();
      // ring groove pair
      ctx.strokeStyle = 'rgba(140,70,30,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx + rr * 0.55, sy, rr * 0.9, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,190,.55)'; ctx.beginPath(); ctx.arc(sx + rr * 0.68, sy, rr * 0.9, Math.PI * 0.65, Math.PI * 1.3); ctx.stroke();
      // dorsal plate
      if (i % 2 === 0) { ctx.fillStyle = K.lg(ctx, 0, sy - rr - 4, 0, sy - rr + 3, ['#ff9a6a', '#c8482c']); ctx.beginPath(); ctx.moveTo(sx - 3, sy - rr + 2); ctx.lineTo(sx + 0.5, sy - rr - 4); ctx.lineTo(sx + 3.5, sy - rr + 2); ctx.closePath(); ctx.fill(); }
    }
    // the head: a round maw ringed with teeth
    const hr = 19;
    ctx.fillStyle = K.rg(ctx, hx - 4, hy - 7, hr * 1.4, ['#fff4c0', '#f4c464', '#c27a34', '#7a421e']); circ(ctx, hx, hy, hr); ctx.fill();
    ctx.strokeStyle = '#7a3e1c'; ctx.lineWidth = 1; ctx.stroke();
    const open = 0.65 + 0.35 * Math.abs(Math.sin(c * 7)), mx = hx - 7, my = hy + 3;
    // a big round maw: pink lip, dark throat, two rings of fangs
    ctx.fillStyle = K.rg(ctx, mx - 2, my - 3, 14, ['#ffb0b8', '#e04a5a', '#9a1a2e']); ell(ctx, mx, my, 11, 13 * open); ctx.fill();
    ctx.strokeStyle = '#7a1424'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = K.rg(ctx, mx, my, 9, ['#1e0408', '#5a0e1e', '#a8203a']); ell(ctx, mx, my, 8, 10 * open); ctx.fill();
    for (const [rr, n, len, col] of [[8, 12, 4.2, '#fff6e0'], [5, 8, 2.8, '#ffe6c8']]) {
      ctx.fillStyle = col;
      for (let k = 0; k < n; k++) { const a = k / n * TAU + rr, tx = mx + Math.cos(a) * rr, ty = my + Math.sin(a) * rr * 1.25 * open; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a + 1.6) * 1.7, ty + Math.sin(a + 1.6) * 1.7); ctx.lineTo(tx - Math.cos(a) * len, ty - Math.sin(a) * len * open); ctx.lineTo(tx + Math.cos(a - 1.6) * 1.7, ty + Math.sin(a - 1.6) * 1.7); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(255,230,235,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(mx, my, 11, 13 * open, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    // brow plate + eyes
    ctx.fillStyle = K.lg(ctx, 0, hy - hr - 2, 0, hy - 6, ['#ff9c6a', '#c64a2c']); ctx.beginPath(); ctx.moveTo(hx - 8, hy - 11); ctx.quadraticCurveTo(hx + 4, hy - hr - 8, hx + 16, hy - 10); ctx.quadraticCurveTo(hx + 4, hy - 14, hx - 8, hy - 11); ctx.fill();
    K.eyes(ctx, hx + 5, hy - 12, 5.6, 4.6, '#ff5a3a', -0.7, 0.8);
    K.sheen(ctx, hx, hy, hr, 0.5);
  }

  // a segmented tail/body chain: overlapping plates oriented along the path, tapering from r0 to r1
  function plateChain(ctx, pts, r0, r1, cols, edge, n) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, [x, y] = polyAt(pts, u), [x2, y2] = polyAt(pts, Math.min(1, u + 0.5 / n)), [x0, y0] = polyAt(pts, Math.max(0, u - 0.5 / n));
      const ang = Math.atan2(y2 - y0, x2 - x0), len = Math.hypot(x2 - x0, y2 - y0), rr = lerp(r0, r1, u);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = K.lg(ctx, 0, -rr, 0, rr, cols); ell(ctx, 0, 0, Math.max(rr * 0.9, len * 0.62), rr); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(230,236,255,.55)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(rr * 0.9, len * 0.62) * 0.7, rr * 0.6, 0, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke();
      ctx.restore();
    }
  }
  const curvePts = (p0, p1, p2, n = 14) => { const a = []; for (let i = 0; i <= n; i++) a.push(bez(p0, p1, p2, i / n)); return a; };

  function scorpion(ctx, lx, y, w, t) {
    const c = cyc(t, 3.2, 1.5), s = 1.3;
    const tell = smooth(0.8, 1.5, c) * (1 - smooth(1.75, 1.85, c));
    const stab = smooth(1.75, 1.95, c) * (1 - smooth(2.35, 3.0, c));
    const quiver = tell * Math.sin(t * 60) * 1.2;
    const reach = (w * 0.4) / s, bx = lx + 24 + stab * 6, by = y - 8;
    const tip = [lerp(lerp(4, -2, tell), reach, stab) + quiver, lerp(lerp(-26, -34, tell), -2, stab)];
    const base = [-15, -1], ctrl = [lerp(-34, reach * 0.3, stab), lerp(-30 - tell * 6, -34, stab)];
    const hot = Math.max(tell, stab);
    if (hot > 0.1) K.danger(ctx, bx + tip[0] * s, by + tip[1] * s, 30 + 12 * stab, 0.32 * hot);
    K.shadow(ctx, bx, by + 10, 26, 4, 0.4);
    ctx.save(); ctx.translate(bx, by); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const SHELL = ['#c2ccff', '#5668ec', '#25318e'], EDGE = '#1a2472';
    // legs: four a side, jointed, splayed on the ledge
    for (let k = 0; k < 4; k++) for (const d of [1, -1]) {
      const x0 = -8 + k * 4.5, step = Math.sin(t * 16 + k * 1.3 + d) * stab * 1.6, kx = x0 + (k - 1.5) * 2.5 + step, fx = x0 + (k - 1.5) * 4.5 + step;
      ctx.strokeStyle = d > 0 ? '#2a3690' : '#1e2878'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, 1); ctx.lineTo(kx, -3 + (d < 0 ? 1 : 0)); ctx.lineTo(fx, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,170,255,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0, 0.4); ctx.lineTo(kx, -3.6); ctx.stroke();
    }
    // pincers reaching forward on jointed arms
    for (const d of [-1, 1]) {
      const px = 22 + stab * 3, py = d * 4 - 3, snap = 0.15 + Math.abs(Math.sin(t * 5 + d)) * 0.35 + tell * 0.35;
      ctx.strokeStyle = '#24308a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(13, py + d * 5); ctx.lineTo(px - 5, py); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,180,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(13, py + d * 5 - 1.2); ctx.lineTo(px - 5, py - 1.2); ctx.stroke();
      ctx.save(); ctx.translate(px, py);
      ctx.fillStyle = K.rg(ctx, -2, -3, 9, SHELL); ell(ctx, 0, 0, 6.5, 4.6); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.8; ctx.stroke();
      for (const sd of [-1, 1]) { ctx.save(); ctx.translate(4, 0); ctx.rotate(sd * snap); ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, sd < 0 ? ['#a0b0ff', '#4a5ee0'] : ['#5a6ef0', '#2a3a9e']); ctx.beginPath(); ctx.moveTo(0, sd * 1.8); ctx.quadraticCurveTo(7, sd * 3.6, 9, sd * 0.3); ctx.quadraticCurveTo(6, sd * 1.4, 0, -sd * 0.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore(); }
      K.sheen(ctx, 0, 0, 5.5, 0.6);
      ctx.restore();
    }
    // tail behind the body
    const pts = curvePts(base, ctrl, tip);
    plateChain(ctx, pts, 5.2, 3.4, SHELL, EDGE, 7);
    // body: one long glossy carapace with plate grooves
    ctx.fillStyle = K.rg(ctx, -4, -6, 18, ['#d4dcff', '#5c6ff0', '#26328e']); ell(ctx, -2, -1, 15, 7.5); ctx.fill();
    ctx.strokeStyle = EDGE; ctx.lineWidth = 0.9; ctx.stroke();
    for (const gx of [-10, -5, 0, 5]) {
      ctx.strokeStyle = 'rgba(26,36,114,.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(gx, -7.5 + Math.abs(gx) * 0.05); ctx.quadraticCurveTo(gx - 2, -1, gx, 6); ctx.stroke();
      ctx.strokeStyle = 'rgba(210,220,255,.55)'; ctx.beginPath(); ctx.moveTo(gx + 1.1, -7); ctx.quadraticCurveTo(gx - 0.8, -2, gx + 1, 1); ctx.stroke();
    }
    // head shield
    ctx.fillStyle = K.rg(ctx, 9, -5, 10, ['#d8e0ff', '#6074f2', '#2a3696']); ell(ctx, 11, -1, 7, 6); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.9; ctx.stroke();
    K.sheen(ctx, -4, -2, 12, 0.5);
    // stinger
    const [ax, ay] = polyAt(pts, 0.88), ang = Math.atan2(tip[1] - ay, tip[0] - ax);
    ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
    K.glow(ctx, 5, 0, 12, [255, 110, 60], 0.25 + 0.45 * hot);
    ctx.fillStyle = K.rg(ctx, 0, -2, 7, ['#fff0b0', '#ff9a3a', '#c8401a']); ell(ctx, 1.5, 0, 5, 4); ctx.fill(); ctx.strokeStyle = '#8a2a10'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 4, -2, 12, 4, ['#ffe6c0', '#ff7a40']); ctx.beginPath(); ctx.moveTo(4.5, -2.6); ctx.quadraticCurveTo(12, -1.5, 13, 4.5); ctx.quadraticCurveTo(9, 0.8, 4.5, 2.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (hot > 0.3) { ctx.fillStyle = `rgba(170,255,120,${hot})`; circ(ctx, 13, 5.5 + (t * 6 % 2.5), 1.2); ctx.fill(); }
    ctx.restore();
    K.eyes(ctx, 12.5, -5, 2.9, 2.4, '#ffcf3a', 0.9, 0.5 + tell * 0.5);
    ctx.restore();
  }

  // the gust overlay: sandy haze plus wind streaks that move with the wind
  function sandGust(ctx, w, h, t) {
    const g = gust(t), a = Math.abs(g);
    if (a < 0.01) return;
    const dir = Math.sign(g), r = K.rand(5);
    ctx.fillStyle = K.lg(ctx, dir > 0 ? 0 : w, 0, dir > 0 ? w : 0, 0, [`rgba(246,178,110,${0.2 * a})`, `rgba(246,178,110,${0.06 * a})`]); ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const y = r() * h, len = 30 + r() * 50, sp = 260 + r() * 160, x = dir > 0 ? ((r() * w + t * sp) % (w + 120)) - 60 : w - ((r() * w + t * sp) % (w + 120)) + 60;
      ctx.strokeStyle = `rgba(255,230,180,${0.45 * a})`; ctx.lineWidth = 1 + r() * 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - dir * len * 0.5, y - 3, x - dir * len, y + 1); ctx.stroke();
    }
    for (let k = 0; k < 30; k++) {
      const y = r() * h, sp = 300 + r() * 200, x = dir > 0 ? ((r() * w + t * sp) % w) : w - ((r() * w + t * sp) % w);
      ctx.fillStyle = `rgba(255,220,160,${0.7 * a})`; ctx.fillRect(x, y + Math.sin(t * 6 + k) * 3, 2, 1.2);
    }
  }

  PV.sections['sandstorm'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...SAND, farShape: sandFar, wallDeco: sandWall });
    rimVary(ctx, S.L, h, [255, 186, 110], 1.3); rimVary(ctx, S.R, h, [255, 186, 110], 4.1);
    // wall props: overhangs, ledges, cacti and horns
    overhang(ctx, S.R(h * 0.19), h * 0.19, -1, 18);
    overhang(ctx, S.L(h * 0.4), h * 0.4, 1, 16);
    overhang(ctx, S.R(h * 0.7), h * 0.7, -1, 20);
    const ly = h * 0.62, lx = S.L(ly);
    horn(ctx, S.R(h * 0.08) + 4, h * 0.08, 0.9, -1);
    horn(ctx, S.L(h * 0.86) - 4, h * 0.86, 0.8, 1);
    rockLedge(ctx, S.R(h * 0.5), h * 0.5, 22, -1, 8);
    cactus(ctx, S.R(h * 0.5) - 12, h * 0.5, 1.0, -1, t);
    rockLedge(ctx, S.L(h * 0.95), h * 0.95, 18, 1, 8);
    cactus(ctx, S.L(h * 0.95) + 9, h * 0.95, 0.85, 1, t);
    rockLedge(ctx, lx, ly, 54, 1, 12);
    // coins
    coin(ctx, w * 0.6, h * 0.13, 7.5, t, 0); coin(ctx, w * 0.5, h * 0.46, 7.5, t, 1); coin(ctx, w * 0.64, h * 0.72, 7.5, t, 2); coin(ctx, w * 0.4, h * 0.72, 7.5, t, 2.6);
    sandfall(ctx, S.L(h * 0.1), h * 0.1, h, w, t);
    sandworm(ctx, S.R(h * 0.3), h * 0.3, w, t);
    scorpion(ctx, lx, ly, w, t);
    K.rocket(ctx, w * 0.5 + gust(t) * 5, h * 0.84, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 226, 180], 30, 8);
    sandGust(ctx, w, h, t);
  };

  // ======================================================================================
  // ANTHILL UNDERWORKS
  // ======================================================================================
  const ANT = {
    bgTop: [92, 58, 50], bgBot: [36, 20, 20], far: [80, 50, 44], far2: [66, 40, 34],
    wall: [70, 42, 26], wallIn: [22, 12, 8], rim: [120, 66, 30], seed: 6, inset: 30, wobble: 1.3,
  };
  const SOLDIER = { body: ['#ff9a7a', '#d8382c', '#7a1418'], edge: '#5e0e14', leg: '#8a1a1c', legLit: 'rgba(255,150,130,.7)' };
  const WORKER = { body: ['#ffd090', '#d8803a', '#7a3a14'], edge: '#5a2a0e', leg: '#8a4a1a', legLit: 'rgba(255,210,150,.7)' };

  // a side-view cartoon ant standing on y=0, facing right (face = -1 flips); g = gait phase, jaw = 0..1 mandible open
  function ant(ctx, x, y, s, face, g, C, soldier, jaw = 0.3, look = 0.6) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const bob = Math.abs(Math.sin(g)) * 0.8;
    // far legs (darker), then body, then near legs
    const leg = (k, near) => {
      const hx = -1 + k * 2.6, ph = g + k * 2.1 + (near ? 0 : Math.PI), fx = hx + (k - 1) * 5 + Math.sin(ph) * 3, lift = Math.max(0, Math.cos(ph)) * 2;
      const kx = hx + (k - 1) * 3.2 + Math.sin(ph) * 1.2, ky = -10.5 - bob;
      ctx.strokeStyle = near ? C.leg : K.rgb([60, 20, 14]); ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(hx, -6.5 - bob); ctx.lineTo(kx, ky); ctx.lineTo(fx, -lift); ctx.stroke();
      if (near) { ctx.strokeStyle = C.legLit; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx, -7 - bob); ctx.lineTo(kx, ky - 0.4); ctx.stroke(); }
    };
    for (let k = 0; k < 3; k++) leg(k, false);
    ctx.translate(0, -bob);
    const part = (cx, cy, rx, ry, a) => { ctx.fillStyle = K.rg(ctx, cx - rx * 0.35, cy - ry * 0.5, Math.max(rx, ry) * 1.4, C.body); ell(ctx, cx, cy, rx, ry, a); ctx.fill(); ctx.strokeStyle = C.edge; ctx.lineWidth = 0.7; ctx.stroke(); K.sheen(ctx, cx, cy, Math.min(rx, ry) * 1.1, 0.5); };
    part(-9.5, -8, 7, 5.6, -0.25);
    ctx.strokeStyle = 'rgba(80,14,14,.5)'; ctx.lineWidth = 0.7; for (const k of [0, 1]) { ctx.beginPath(); ctx.arc(-9.5 + k * 2.5, -8, 5, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke(); }
    part(-3, -7.5, 1.8, 1.8, 0);
    part(1.6, -8.5, 4.4, 3, 0.25);
    const hx = soldier ? 9.2 : 8, hy = soldier ? -11 : -10.5, hr = soldier ? 5.6 : 4.1;
    // antennae
    ctx.strokeStyle = C.leg; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + 1, hy - hr + 1); ctx.lineTo(hx + 2, hy - hr - 5); ctx.lineTo(hx + 7, hy - hr - 4 + Math.sin(g * 0.5) * 1.2); ctx.stroke();
    ctx.fillStyle = C.body[1]; circ(ctx, hx + 7, hy - hr - 4 + Math.sin(g * 0.5) * 1.2, 1); ctx.fill();
    // mandibles
    const mx = hx + hr * 0.8, my = hy + hr * 0.45, ml = soldier ? 7 : 4;
    for (const d of [-1, 1]) {
      const a = d * (0.15 + jaw * 0.55);
      ctx.save(); ctx.translate(mx, my); ctx.rotate(a);
      ctx.fillStyle = K.lg(ctx, 0, -2, 0, 2, soldier ? ['#ffd2a0', '#c8642a'] : ['#ffe0b0', '#b8682a']);
      ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.quadraticCurveTo(ml * 0.8, -d * 0.6 - 1.6, ml, d * 1.6); ctx.quadraticCurveTo(ml * 0.5, d * 0.2, 0, 1.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.edge; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }
    part(hx, hy, hr, hr * 0.92, 0);
    if (soldier) { // helmet ridge
      ctx.strokeStyle = 'rgba(255,190,170,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(hx, hy + 1, hr * 0.8, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke();
    }
    for (let k = 0; k < 3; k++) leg(k, true);
    K.eyes(ctx, hx + hr * 0.25, hy - hr * 0.1, hr * 0.38, hr * 0.32, soldier ? '#ffd23a' : '#7ad0ff', look, soldier ? 0.7 : 0);
    ctx.restore();
  }

  function antFar(ctx, w, h, t, layer, col) {
    const c = rgb(col), dk = rgb(K.lift(col, -16)), lt = rgb(K.lift(col, 14), 0.8);
    if (layer === 0) {
      // the colony: chambers joined by winding tunnels, a few with egg-glow, tiny ants on the move
      const ch = [[0.3, 0.12, 30, 18], [0.72, 0.3, 36, 20], [0.36, 0.52, 28, 16], [0.7, 0.76, 34, 18], [0.28, 0.9, 26, 14]];
      ctx.strokeStyle = dk; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < ch.length - 1; i++) { const [ax, ay] = ch[i], [bx, by] = ch[i + 1]; ctx.moveTo(ax * w, ay * h); ctx.bezierCurveTo(ax * w + 40, ay * h + 40, bx * w - 40, by * h - 30, bx * w, by * h); }
      ctx.moveTo(0, h * 0.4); ctx.quadraticCurveTo(w * 0.2, h * 0.36, w * 0.36, h * 0.52); ctx.moveTo(w, h * 0.55); ctx.quadraticCurveTo(w * 0.85, h * 0.62, w * 0.7, h * 0.76);
      ctx.stroke();
      for (const [cx, cy, rx, ry] of ch) {
        ctx.fillStyle = dk; ell(ctx, cx * w, cy * h, rx, ry); ctx.fill();
        ctx.strokeStyle = lt; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(cx * w, cy * h, rx, ry, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        K.glow(ctx, cx * w, cy * h + ry * 0.4, rx * 1.3, [255, 140, 50], 0.14);
      }
      // far egg piles glowing in two chambers
      for (const [cx, cy] of [[0.72, 0.3], [0.28, 0.9]]) {
        K.glow(ctx, cx * w, cy * h + 6, 36, [255, 170, 60], 0.28);
        for (let k = 0; k < 5; k++) { ctx.fillStyle = 'rgba(255,196,110,.55)'; ell(ctx, cx * w - 10 + k * 5, cy * h + 10 - (k % 2) * 3, 2.6, 3.4); ctx.fill(); }
      }
      // silhouettes marching along the tunnels
      ctx.fillStyle = 'rgba(40,20,18,.75)';
      for (let i = 0; i < ch.length - 1; i++) for (let k = 0; k < 3; k++) {
        const [ax, ay] = ch[i], [bx, by] = ch[i + 1], u = cyc(t * 0.12 + k * 0.33 + i * 0.2, 1);
        const p0 = [ax * w, ay * h], p3 = [bx * w, by * h], p1 = [ax * w + 40, ay * h + 40], p2 = [bx * w - 40, by * h - 30], a = 1 - u;
        const px = a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0], py = a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1];
        ell(ctx, px - 2, py, 2.2, 1.6); ctx.fill(); ell(ctx, px + 1.5, py - 0.5, 1.5, 1.3); ctx.fill();
      }
    } else {
      // dangling root threads from the roof, and earth pillars
      ctx.fillStyle = c;
      for (const [px, pw] of [[0.18, 24], [0.86, 30]]) {
        ctx.beginPath(); ctx.moveTo(px * w - pw, -5); ctx.bezierCurveTo(px * w - pw * 0.4, h * 0.3, px * w - pw * 0.7, h * 0.6, px * w - pw, h + 5); ctx.lineTo(px * w + pw, h + 5); ctx.bezierCurveTo(px * w + pw * 0.6, h * 0.6, px * w + pw * 0.3, h * 0.3, px * w + pw, -5); ctx.fill();
      }
      const r = K.rand(66);
      ctx.strokeStyle = rgb(K.lift(col, 34), 0.55); ctx.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const x = w * (0.15 + r() * 0.7), len = h * (0.12 + r() * 0.3), sw = Math.sin(t * 0.8 + k) * 4;
        ctx.lineWidth = 1.6 + r() * 1.4; ctx.beginPath(); ctx.moveTo(x, -4); ctx.bezierCurveTo(x + 8, len * 0.3, x - 8 + sw, len * 0.7, x + sw, len); ctx.stroke();
        ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 2, len * 0.4); ctx.quadraticCurveTo(x + 10, len * 0.5, x + 9 + sw, len * 0.62); ctx.stroke();
      }
    }
  }

  function antWall(ctx, side, edge, w, h, t) {
    const X = d => side < 0 ? d : w - d, depth = 50, r = K.rand(side < 0 ? 71 : 83);
    // soil layers: wavy bands of packed earth
    const tops = [];
    for (let y = -10, i = 0; y < h + 10; i++) {
      const th = 14 + r() * 22, ph = r() * 9, c = [[84, 50, 30], [70, 40, 24], [96, 60, 36], [62, 36, 22]][i % 4], y0 = y;
      const top = d => y0 + Math.sin(d * 0.12 + ph) * 3 + d * 0.08;
      ctx.beginPath(); for (let d = 0; d <= depth; d += 5) ctx.lineTo(X(d), top(d)); ctx.lineTo(X(depth), y + th + 6); ctx.lineTo(X(0), y + th + 6); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, 0, y, 0, y + th, [K.lift(c, 10), c]); ctx.fill();
      tops.push(top); y += th;
    }
    ctx.lineWidth = 1;
    for (const [col, o] of [['rgba(200,150,100,.32)', 0.8], ['rgba(30,16,8,.55)', -0.6]]) { ctx.strokeStyle = col; ctx.beginPath(); for (const top of tops) for (let d = 0; d <= depth; d += 5) d ? ctx.lineTo(X(d), top(d) + o) : ctx.moveTo(X(d), top(d) + o); ctx.stroke(); }
    // embedded pebbles, glossy
    for (let k = 0; k < 16; k++) {
      const px = X(4 + r() * 38), py = r() * h, pr = 1.6 + r() * 3.2, pc = [[150, 140, 150], [176, 128, 90], [120, 104, 112], [196, 160, 110]][k % 4];
      ctx.fillStyle = K.rg(ctx, px - pr * 0.4, py - pr * 0.4, pr * 1.5, [K.lift(pc, 50), pc, K.lift(pc, -50)]); ell(ctx, px, py, pr * 1.2, pr, r()); ctx.fill();
      ctx.strokeStyle = rgb(K.lift(pc, -70), 0.7); ctx.lineWidth = 0.6; ctx.stroke();
    }
    // root cross-sections and creeping roots
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const y0 = r() * h, len = 40 + r() * 50;
      ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(X(0), y0); ctx.bezierCurveTo(X(20), y0 + len * 0.3, X(10), y0 + len * 0.7, X(28 + r() * 10), y0 + len); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,196,140,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(0), y0 - 1); ctx.bezierCurveTo(X(20) - side * 1, y0 + len * 0.3 - 1, X(10), y0 + len * 0.7 - 1, X(28), y0 + len - 1); ctx.stroke();
    }
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(depth), 0, ['rgba(20,8,6,.6)', 'rgba(20,8,6,.12)', 'rgba(255,170,70,.08)']);
    ctx.fillRect(Math.min(X(0), X(depth)), 0, depth, h);
  }

  // a glowing egg niche dug into the wall: a dark hollow with a heap of amber eggs
  function eggNiche(ctx, x, y, side, n, t, seed) {
    const r = K.rand(seed), pulse = 0.85 + 0.15 * Math.sin(t * 2.2 + seed);
    ctx.save(); ctx.translate(x, y); ctx.scale(1.25, 1.25); x = 0; y = 0;
    ctx.fillStyle = K.rg(ctx, x, y, 22, ['#1e0c08', '#2e160c', 'rgba(60,30,16,0)']); ell(ctx, x, y, 20, 14); ctx.fill();
    K.glow(ctx, x + side * 4, y + 2, 40, [255, 150, 40], 0.3 * pulse);
    ctx.strokeStyle = 'rgba(255,190,110,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, 19, 13, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    // a heap of eggs: a smaller, dimmer back row, a bigger glowing front row; each a little different
    const TINTS = [['#ffe9a0', '#ffbe3a', '#e0780e', '#7a3006'], ['#ffdc80', '#ffa82a', '#d0600c', '#6a2406'], ['#fff2b8', '#ffd060', '#e8a030', '#8a4a10'], ['#ffd890', '#ff9a2a', '#c8501a', '#6a1e08']];
    const eggs = [];
    for (let k = 0; k < n; k++) { const back = k >= Math.ceil(n * 0.55), i = back ? k - Math.ceil(n * 0.55) : k, cnt = back ? n - Math.ceil(n * 0.55) : Math.ceil(n * 0.55); eggs.push([x + (i - (cnt - 1) / 2) * (back ? 6.4 : 7.2) + (r() - 0.5) * 1.6, y + (back ? -1.5 : 6) + (r() - 0.5) * 1.4, (back ? 0.9 : 1.12) * (0.88 + r() * 0.26), (r() - 0.5) * 0.7, TINTS[(k * 3 + seed) % 4], back, r() * TAU]); }
    eggs.forEach(([ex, ey, sz, a, T, back, ph], k) => {
      const rx = 3.6 * sz, ry = 5 * sz, glowK = (0.8 + 0.2 * Math.sin(t * 2.4 + ph)) * (back ? 0.75 : 1);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      // translucent shell lit from inside
      ctx.fillStyle = K.rg(ctx, rx * 0.1, ry * 0.45, ry * 1.3, [[0, T[0]], [0.25, T[1]], [0.68, T[2]], [1, T[3]]]); ell(ctx, 0, 0, rx, ry); ctx.fill();
      if (back) { ctx.fillStyle = 'rgba(60,20,8,.25)'; ell(ctx, 0, 0, rx, ry); ctx.fill(); }
      // the hot core and a larva curled inside some of them
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, 0, ry * 0.2, rx * 1.1, [`rgba(255,220,130,${0.28 * glowK})`, 'rgba(255,200,90,0)']); ell(ctx, 0, ry * 0.3, rx * 0.7, ry * 0.6); ctx.fill(); ctx.restore();
      if ((k + seed) % 4 === 1) { ctx.strokeStyle = 'rgba(150,70,20,.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0.6, rx * 0.5, -0.6, Math.PI * 1.35); ctx.stroke(); }
      ctx.strokeStyle = rgb(K.lift([150, 70, 14], back ? -30 : 0), 0.8); ctx.lineWidth = 0.6; ell(ctx, 0, 0, rx, ry); ctx.stroke();
      // a warm rim along the bottom, a crisp specular and a second glint
      ctx.strokeStyle = 'rgba(255,230,150,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.85, ry * 0.88, 0, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${back ? 0.6 : 0.95})`; ell(ctx, -rx * 0.35, -ry * 0.45, rx * 0.24, ry * 0.3, -0.4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; circ(ctx, -rx * 0.05, -ry * 0.72, 0.5 * sz); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function twigBridge(ctx, x0, x1, y, bow) {
    const yAt = x => y + bow * (1 - Math.pow((x - (x0 + x1) / 2) / ((x1 - x0) / 2), 2));
    const pts = []; for (let x = x0 - 8; x <= x1 + 8; x += 8) pts.push([x, yAt(x)]);
    const strip = (o) => { ctx.beginPath(); pts.forEach(([x, yy], i) => i ? ctx.lineTo(x, yy + o) : ctx.moveTo(x, yy + o)); };
    K.shadow(ctx, (x0 + x1) / 2, y + bow + 12, (x1 - x0) * 0.45, 5, 0.3);
    ctx.lineCap = 'round';
    for (const [lw, col, o] of [[7.5, '#3e2412', 1], [6, '#7a4a26', 0.5], [3, '#a8703c', -0.8], [1, 'rgba(240,200,140,.8)', -2.2]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; strip(o); ctx.stroke(); }
    // bark furrows and knots
    ctx.lineWidth = 0.8;
    for (let x = x0 + 4; x < x1; x += 11) { const yy = yAt(x); ctx.strokeStyle = 'rgba(50,26,10,.7)'; ctx.beginPath(); ctx.moveTo(x, yy - 1.5); ctx.lineTo(x + 5, yy + 1.5); ctx.stroke(); ctx.strokeStyle = 'rgba(230,180,120,.5)'; ctx.beginPath(); ctx.moveTo(x + 1, yy - 2); ctx.lineTo(x + 5.5, yy + 0.6); ctx.stroke(); }
    const kx = lerp(x0, x1, 0.63), ky = yAt(kx);
    // a sprig with a leaf
    ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(kx, ky + 1); ctx.quadraticCurveTo(kx + 4, ky + 8, kx + 10, ky + 11); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, kx + 8, ky + 6, kx + 18, ky + 18, ['#b8f070', '#3c9a30']); ctx.beginPath(); ctx.moveTo(kx + 10, ky + 11); ctx.quadraticCurveTo(kx + 18, ky + 7, kx + 22, ky + 15); ctx.quadraticCurveTo(kx + 15, ky + 18, kx + 10, ky + 11); ctx.fill();
    ctx.strokeStyle = '#2a6a20'; ctx.lineWidth = 0.6; ctx.stroke();
    return yAt;
  }

  function soldierMarch(ctx, x0, x1, y, t) {
    const yAt = twigBridge(ctx, x0, x1, y, 5);
    const c = cyc(t, 4, 0.3), gap = 52, n = 3, span = (x1 - x0) - gap * (n - 1) - 40;
    const goR = smooth(0.25, 1.75, c), goL = smooth(2.25, 3.75, c), u = goR - goL;
    const face = c < 2 ? (c < 1.85 ? 1 : -1) : (c < 3.85 ? -1 : 1);
    const moving = (c > 0.25 && c < 1.75) || (c > 2.25 && c < 3.75);
    const tell = bump(c, 1.75, 1.85, 2.1, 2.25) + bump(c, 3.75, 3.85, 3.95, 4.0) + bump(c, 0, 0.01, 0.1, 0.25);
    const lead = x0 + 20 + span * u + gap * (n - 1) * 0.5;
    for (let i = 0; i < n; i++) {
      const ax = lead + (i - (n - 1) / 2) * gap, ay = yAt(ax) - 3;
      K.danger(ctx, ax, ay - 10, 24, 0.22 + 0.15 * tell);
    }
    for (let i = 0; i < n; i++) {
      const ax = lead + (i - (n - 1) / 2) * gap, ay = yAt(ax) - 3;
      const g = moving ? t * 13 + i * 1.1 : i;
      ant(ctx, ax, ay, 1.45, face, g, SOLDIER, true, 0.25 + tell * 0.7 + (moving ? Math.abs(Math.sin(t * 4 + i)) * 0.2 : 0), face * 0.2);
    }
  }

  function antlion(ctx, wx, y, w, t) {
    const c = cyc(t, 3.4, 0.9);
    const tell = smooth(0.7, 1.4, c) * (1 - smooth(1.8, 1.9, c));
    const out = smooth(1.8, 2.05, c) * (1 - smooth(2.6, 3.2, c));
    const snap = smooth(2.15, 2.3, c);
    // the sand pit: a raised lip of pale sand around a funnel dug into the wall, spilling sand below
    const mx = wx + 6, shake = tell * Math.sin(t * 50) * 0.8;
    ctx.fillStyle = K.lg(ctx, 0, y + 10, 0, y + 50, ['rgba(214,170,110,.9)', 'rgba(160,110,60,0)']);
    ctx.beginPath(); ctx.moveTo(mx - 14, y + 14); ctx.quadraticCurveTo(mx + 4, y + 30, mx - 2, y + 52); ctx.lineTo(mx - 22, y + 52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.rg(ctx, mx - 6, y - 16, 40, ['#fff0c0', '#e0b26a', '#9a6632']); ell(ctx, mx, y, 23, 23); ctx.fill();
    ctx.strokeStyle = '#6e4420'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = K.rg(ctx, mx - 2 + shake, y + 1, 18, [[0, '#120604'], [0.35, '#3a1e0e'], [0.75, '#8a5c30'], [1, '#c8945a']]); ell(ctx, mx - 1 + shake, y + 1, 17, 17); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,190,.8)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(mx, y, 22, 22, 0, Math.PI * 0.95, Math.PI * 1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,54,24,.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.moveTo(mx - 1 + Math.cos(a) * 16 + shake, y + 1 + Math.sin(a) * 16); ctx.lineTo(mx - 1 + Math.cos(a) * 6 + shake, y + 1 + Math.sin(a) * 6); }
    ctx.stroke();
    // pebbles sliding down the slope
    if (tell > 0.02) {
      const r = K.rand(44);
      for (let k = 0; k < 6; k++) {
        const a0 = r() * TAU, u = cyc(t * 1.3 + r(), 1), rr = (1 - u) * 20 + 2, a = a0 + u * 2.5;
        ctx.fillStyle = K.rg(ctx, 0, 0, 1, ['#d8c0a0', '#7a6050']);
        const px = mx - 1 + Math.cos(a) * rr * 0.8, py = y + 1 + Math.sin(a) * rr * 0.8;
        ctx.fillStyle = K.rg(ctx, px - 0.6, py - 0.6, 2.4, ['#f0e0c8', '#a08068', '#5a4030']); circ(ctx, px, py, 1.6 * (0.6 + 0.4 * (1 - u))); ctx.fill();
      }
      K.danger(ctx, mx, y, 30, 0.2 * tell);
    }
    if (out < 0.01) return;
    // the antlion: a plum head peeking from the funnel, two sickle jaws snapping across
    const reach = w * 0.42 * out, hx = mx + 2 + out * 8;
    K.danger(ctx, wx + reach * 0.6, y, 44, 0.35 * out);
    const open = (1 - snap) * 0.45 + 0.04;
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(hx + 5, y + d * 4); ctx.rotate(d * open);
      const L = reach;
      const jaw = () => { ctx.beginPath(); ctx.moveTo(0, d * 6); ctx.quadraticCurveTo(L * 0.55, d * 17, L, -d * 3); ctx.quadraticCurveTo(L * 0.92, d * 1.5, L * 0.7, d * 2.5); ctx.quadraticCurveTo(L * 0.35, d * 2.5, 0, -d * 3); ctx.closePath(); };
      jaw(); ctx.fillStyle = K.lg(ctx, 0, d * 16, 0, -d * 3, ['#8a3410', '#e0782a', '#ffcf7a']); ctx.fill();
      ctx.strokeStyle = '#6a2a0c'; ctx.lineWidth = 1; ctx.stroke();
      // segment groove and lit ridge
      ctx.strokeStyle = 'rgba(110,40,12,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(L * 0.22, d * 9); ctx.lineTo(L * 0.26, d * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,244,210,.8)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(L * 0.08, d * (d < 0 ? 6.5 : 1)); ctx.quadraticCurveTo(L * 0.55, d * (d < 0 ? 14 : 4), L * 0.9, -d * 1); ctx.stroke();
      // teeth on the inner edge, pointing at the other jaw
      ctx.fillStyle = '#fff4d8';
      for (let k = 1; k <= 5; k++) { const u = k / 6.5, tx = L * u * 0.95, ty = lerp(-d * 3, d * 2.5, Math.min(1, u * 1.6)); ctx.beginPath(); ctx.moveTo(tx - 2.2, ty); ctx.lineTo(tx + 0.4, ty - d * 4.5); ctx.lineTo(tx + 2.2, ty); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = K.rg(ctx, hx - 3, y - 6, 16, ['#e0a8e8', '#8a4aa0', '#3e1a4e']); ell(ctx, hx, y, 13, 14); ctx.fill();
    ctx.strokeStyle = '#2e1038'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,70,.6)'; ctx.beginPath(); ctx.arc(hx - 2, y, 8, -1, 1); ctx.stroke();
    K.sheen(ctx, hx, y, 13, 0.5);
    K.eyes(ctx, hx + 3, y - 5, 4.2, 3.5, '#ff6a3a', 0.8, 0.9);
    // sand spray as it lunges
    if (c < 2.5) { const u = (c - 1.8) / 0.7, r = K.rand(9); for (let k = 0; k < 8; k++) { const vx = 20 + r() * 50, vy = (r() - 0.5) * 70; ctx.fillStyle = `rgba(246,214,150,${0.8 * (1 - u)})`; circ(ctx, mx + vx * u, y + vy * u + 40 * u * u, 1.4); ctx.fill(); } }
  }

  // a leafcutter carrying a big leaf piece above its head
  function leafPiece(ctx, x, y, s, hue, bobA, seed) {
    const C = [['#d8ff8a', '#62c234', '#22701e'], ['#c8f070', '#3aa83a', '#145a22'], ['#fff0a0', '#e8b030', '#9a5a10']][hue];
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.12 + bobA);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-18, -6, -20, -30, -6, -40); ctx.quadraticCurveTo(4, -46, 12, -40);
    // the bitten, zig-zag cut edge on the right
    const r = K.rand(seed);
    for (let k = 0; k < 7; k++) { const u = k / 7, ex = lerp(12, 4, u) + (k % 2 ? 4 : 0) + r() * 2, ey = lerp(-40, -4, u); ctx.lineTo(ex, ey); }
    ctx.closePath();
    ctx.fillStyle = K.lg(ctx, -16, -40, 10, 0, C); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(hue === 2 ? [154, 90, 16] : [20, 90, 26], -10)); ctx.lineWidth = 0.9; ctx.stroke();
    // midrib and veins as line pairs
    ctx.strokeStyle = 'rgba(20,70,20,.55)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(-4, -20, -1, -38);
    for (let k = 1; k < 5; k++) { const yy = -k * 8; ctx.moveTo(-2.5, yy); ctx.quadraticCurveTo(-9, yy - 3, -14 + k * 1.5, yy - 7); ctx.moveTo(-2, yy - 1); ctx.lineTo(5, yy - 5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,220,.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.quadraticCurveTo(-5, -20, -2, -38); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.quadraticCurveTo(-15, -28, -6, -36); ctx.stroke();
    ctx.restore();
  }

  function leafParade(ctx, L, R, y, t) {
    // a root strand spanning the shaft, tunnel mouths at both ends
    const yAt = x => y + Math.sin(x * 0.05) * 2;
    ctx.lineCap = 'round';
    for (const [lw, col, o] of [[8, '#4a2c16', 1], [6.5, '#a07048', 0], [3, '#d8a878', -1], [1, 'rgba(255,230,190,.8)', -2.4]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); for (let x = L - 10; x <= R + 10; x += 8) x === L - 10 ? ctx.moveTo(x, yAt(x) + o) : ctx.lineTo(x, yAt(x) + o); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,160,110,.7)'; ctx.lineWidth = 0.8;
    for (let x = L + 12; x < R - 6; x += 23) { const sw = Math.sin(t * 1.5 + x) * 2; ctx.beginPath(); ctx.moveTo(x, yAt(x) + 3); ctx.quadraticCurveTo(x + 3, yAt(x) + 10, x + 1 + sw, yAt(x) + 16 + (x % 3) * 3); ctx.stroke(); }
    for (const [hx, d] of [[L, 1], [R, -1]]) {
      ctx.fillStyle = K.rg(ctx, hx, y - 14, 20, ['#120604', '#24100a', 'rgba(40,20,10,0)']); ell(ctx, hx - d * 2, y - 16, 12, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,110,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(hx - d * 2, y - 16, 11, 19, 0, d > 0 ? -Math.PI * 0.4 : Math.PI * 0.6, d > 0 ? Math.PI * 0.4 : Math.PI * 1.4); ctx.stroke();
    }
    // leaves on a 4-leaf conveyor that loops every 4 s
    const span = R - L + 30, n = 4, sp = span / n, v = span / 4;
    ctx.save(); ctx.beginPath(); ctx.rect(L - 2, y - 70, R - L + 4, 90); ctx.clip();
    for (let i = 0; i < n; i++) {
      const x = L - 15 + cyc(t * v + i * sp, span), ay = yAt(x) - 3, g = t * 14 + i * 2, bob = Math.sin(g) * 0.04;
      // push streaks behind each leaf
      ctx.strokeStyle = 'rgba(220,255,170,.3)'; ctx.lineWidth = 1.2;
      for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(x - 20 - k * 4, ay - 30 + k * 9); ctx.lineTo(x - 34 - k * 4, ay - 30 + k * 9); ctx.stroke(); }
      ant(ctx, x, ay, 1.0, 1, g, WORKER, false, 0.1, 0.5);
      ctx.strokeStyle = '#4a7a20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 10, ay - 9); ctx.lineTo(x + 4, ay - 16); ctx.stroke();
      leafPiece(ctx, x + 4, ay - 15, 0.92, i === 2 ? 2 : i % 2, bob, 30 + i);
    }
    ctx.restore();
  }

  PV.sections['anthill'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...ANT, farShape: antFar, wallDeco: antWall });
    rimVary(ctx, S.L, h, [255, 168, 70], 0.7, 0.85); rimVary(ctx, S.R, h, [255, 168, 70], 3.9, 0.85);
    // egg niches in the walls
    eggNiche(ctx, S.L(h * 0.1) - 4, h * 0.1, 1, 6, t, 3);
    eggNiche(ctx, S.R(h * 0.36) + 4, h * 0.36, -1, 7, t, 5);
    eggNiche(ctx, S.L(h * 0.8) - 4, h * 0.8, 1, 7, t, 8);
    eggNiche(ctx, S.R(h * 0.9) + 6, h * 0.9, -1, 5, t, 9);
    // roots dangling into the shaft
    for (const [x, len, ph] of [[S.L(0) + 8, 46, 0], [S.R(0) - 14, 60, 2], [w * 0.55, 30, 4]]) {
      const sw = Math.sin(t * 1.1 + ph) * 3;
      ctx.lineCap = 'round';
      for (const [lw, col, o] of [[3.2, '#5a3a20', 0], [1.2, 'rgba(240,206,150,.8)', -0.8]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x + o, -2); ctx.bezierCurveTo(x + 6 + o, len * 0.4, x - 5 + sw + o, len * 0.7, x + sw + o, len); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,160,110,.8)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 2, len * 0.5); ctx.quadraticCurveTo(x + 8, len * 0.6, x + 7 + sw, len * 0.75); ctx.moveTo(x + sw * 0.8, len * 0.8); ctx.lineTo(x - 4 + sw, len * 0.95); ctx.stroke();
    }
    coin(ctx, w * 0.5, h * 0.09, 7.5, t, 0); coin(ctx, w * 0.62, h * 0.45, 7.5, t, 1); coin(ctx, w * 0.38, h * 0.55, 7.5, t, 2); coin(ctx, w * 0.6, h * 0.75, 7.5, t, 3);
    soldierMarch(ctx, S.L(h * 0.22), S.R(h * 0.22), h * 0.22, t);
    antlion(ctx, S.L(h * 0.43), h * 0.43, w, t);
    leafParade(ctx, S.L(h * 0.66), S.R(h * 0.66), h * 0.66, t);
    K.rocket(ctx, w * 0.5, h * 0.85, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 186, 80], 11, 12);
    K.motes(ctx, w, h, t, 'dust', [230, 200, 170], 20, 14);
  };

  // ======================================================================================
  // BAMBOO PAGODA
  // ======================================================================================
  const PAG = {
    bgTop: [62, 44, 86], bgBot: [184, 112, 108], far: [104, 92, 130], far2: [82, 96, 104],
    wall: [74, 22, 28], wallIn: [30, 8, 16], rim: [255, 184, 96], seed: 4, inset: 34, wobble: 0.12,
  };
  const LACQ = ['#ff7a5a', '#d8322a', '#7a1218'];

  function bambooStalk(ctx, x, y0, y1, r, seed, light = 1) {
    const g = K.lg(ctx, x - r, 0, x + r, 0, [[0, '#2e6a28'], [0.25, '#b8ec78'], [0.5, '#6ab04a'], [1, '#24521e']]);
    ctx.fillStyle = g; ctx.fillRect(x - r, y0, r * 2, y1 - y0);
    const rr = K.rand(seed);
    for (let y = y0 + rr() * 40; y < y1; y += 34 + rr() * 10) {
      ctx.fillStyle = 'rgba(30,70,24,.75)'; ctx.fillRect(x - r - 0.5, y, r * 2 + 1, 1.6);
      ctx.fillStyle = 'rgba(220,255,170,.7)'; ctx.fillRect(x - r, y + 1.6, r * 2, 1);
      ctx.fillStyle = 'rgba(40,90,30,.35)'; ctx.fillRect(x - r, y - 4, r * 2, 4);
    }
    ctx.fillStyle = `rgba(255,255,230,${0.35 * light})`; ctx.fillRect(x - r * 0.55, y0, r * 0.25, y1 - y0);
  }
  function bambooLeaf(ctx, x, y, len, ang, c = ['#c8f080', '#4a9a38']) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = K.lg(ctx, 0, -2, 0, 2, c); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.4, -len * 0.16, len, 0); ctx.quadraticCurveTo(len * 0.4, len * 0.14, 0, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(30,80,30,.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
    ctx.restore();
  }

  function pagFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the dusk moon behind the mist, a distant pagoda with lit windows, rising sky lanterns
      K.glow(ctx, w * 0.68, h * 0.14, 90, [255, 214, 190], 0.35);
      ctx.fillStyle = K.rg(ctx, w * 0.66, h * 0.13, 30, ['#fff6e6', '#ffd8c0', '#f0b0a0']); circ(ctx, w * 0.68, h * 0.14, 26); ctx.fill();
      ctx.fillStyle = 'rgba(230,170,160,.4)'; circ(ctx, w * 0.62, h * 0.12, 5); ctx.fill(); circ(ctx, w * 0.72, h * 0.18, 3.5); ctx.fill();
      const c = rgb(col), px = w * 0.3;
      ctx.fillStyle = c;
      for (let k = 0; k < 5; k++) {
        const ty = h * 0.18 + k * 34, tw = 22 + k * 6;
        ctx.fillRect(px - tw * 0.55, ty, tw * 1.1, 30);
        ctx.beginPath(); ctx.moveTo(px - tw - 10, ty + 2); ctx.quadraticCurveTo(px - tw * 0.6, ty + 4, px - tw * 0.3, ty - 6); ctx.lineTo(px + tw * 0.3, ty - 6); ctx.quadraticCurveTo(px + tw * 0.6, ty + 4, px + tw + 10, ty + 2); ctx.lineTo(px + tw, ty + 6); ctx.lineTo(px - tw, ty + 6); ctx.fill();
      }
      ctx.fillRect(px - 1.5, h * 0.18 - 30, 3, 26);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) for (const d of [-1, 0, 1]) { const a = 0.5 + 0.3 * Math.sin(t * 2 + k * 3 + d); ctx.fillStyle = `rgba(255,190,110,${a * 0.7})`; ctx.fillRect(px + d * (6 + k * 2) - 1.5, h * 0.18 + k * 34 + 14, 3, 5); }
      for (let k = 0; k < 6; k++) {
        const u = cyc(t * 0.05 + k / 6, 1), x = w * (0.1 + (k * 0.37 % 0.85)) + Math.sin(t * 0.6 + k) * 5, y = h * (1 - u * 1.1);
        K.glow(ctx, x, y, 10, [255, 170, 80], 0.4 * Math.sin(u * Math.PI));
        ctx.fillStyle = `rgba(255,200,120,${0.8 * Math.sin(u * Math.PI)})`; ell(ctx, x, y, 1.8, 2.4); ctx.fill();
      }
      ctx.restore();
      // misty bamboo grove
      ctx.fillStyle = c; const r = K.rand(21);
      for (let k = 0; k < 9; k++) { const x = r() * w, rw = 2 + r() * 3; ctx.fillRect(x - rw, 0, rw * 2, h); for (let y = r() * 40; y < h; y += 40 + r() * 10) ctx.fillRect(x - rw - 1, y, rw * 2 + 2, 1.5); }
    } else {
      // nearer bamboo, slanting, with leaf sprays, in teal mist
      const r = K.rand(33), c = rgb(col);
      ctx.fillStyle = c; ctx.strokeStyle = c;
      for (let k = 0; k < 6; k++) {
        const x = w * (0.08 + k * 0.17) + r() * 10, rw = 3.5 + r() * 2, lean = (r() - 0.5) * 0.08, sway = Math.sin(t * 0.7 + k) * 2;
        ctx.save(); ctx.translate(x, h); ctx.rotate(lean + sway * 0.004);
        ctx.fillRect(-rw, -h - 20, rw * 2, h + 20);
        for (let y = -20 - r() * 30; y > -h; y -= 42) ctx.fillRect(-rw - 1, y, rw * 2 + 2, 2);
        for (let j = 0; j < 3; j++) { const ly = -h * (0.25 + r() * 0.6), d = r() < 0.5 ? -1 : 1; for (let q = 0; q < 4; q++) { ctx.save(); ctx.translate(0, ly); ctx.rotate(d * (0.3 + q * 0.3) + (d < 0 ? Math.PI : 0)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(9, -3, 20, 0); ctx.quadraticCurveTo(9, 3, 0, 0); ctx.fill(); ctx.restore(); } }
        ctx.restore();
      }
    }
    // drifting mist bands
    for (let k = 0; k < 3; k++) {
      const y = h * (0.3 + k * 0.27) + layer * 30, x = cyc(t * (6 + k * 2) + k * 90, w + 200) - 100;
      ctx.fillStyle = K.rg(ctx, 0, 0, 1, ['rgba(255,226,236,.22)', 'rgba(255,226,236,0)']);
      ctx.save(); ctx.translate(x, y); ctx.scale(150, 22); circ(ctx, 0, 0, 1); ctx.fill(); ctx.restore();
    }
  }

  function pagWall(ctx, side, edge, w, h, t) {
    const X = d => side < 0 ? d : w - d, inset = Math.abs(edge(0) - X(0)), span = (d0, d1) => [Math.min(X(d0), X(d1)), Math.abs(X(d1) - X(d0))];
    const beams = side < 0 ? [72, 196, 312, 428] : [18, 146, 268, 392, 500];
    // paper screens in wooden frames between the beams, each lit a little differently
    const [sl, sw] = span(7, inset - 7);
    for (let i = 0; i < beams.length; i++) {
      const y0 = (i ? beams[i - 1] : -60) + 7, y1 = beams[i] - 7, flick = 0.88 + 0.12 * Math.sin(t * 2.6 + i * 2 + side), warm = 0.75 + 0.25 * ((i * 7 + (side > 0 ? 3 : 0)) % 4) / 3;
      const open = (i === 2 && side < 0) || (i === 1 && side > 0);
      if (open) {
        // a slid-open screen: dark room with a little lamp glowing inside
        ctx.fillStyle = K.lg(ctx, 0, y0, 0, y1, ['#2a0e18', '#3e1620']); ctx.fillRect(sl, y0, sw, y1 - y0);
        const lx = sl + sw / 2, ly = (y0 + y1) / 2;
        K.glow(ctx, lx, ly, 26, [255, 160, 70], 0.5 * flick);
        ctx.fillStyle = K.rg(ctx, lx - 1, ly - 1, 4, ['#fff4c0', '#ffb040', '#c05010']); ell(ctx, lx, ly, 2.6, 3.4); ctx.fill();
      } else {
        ctx.fillStyle = K.lg(ctx, 0, y0, 0, y1, [[0, rgb(K.mix([232, 200, 160], [255, 226, 170], warm))], [0.5, rgb(K.mix([240, 214, 170], [255, 240, 196], flick * warm))], [1, rgb(K.mix([210, 160, 120], [240, 184, 120], warm))]]);
        ctx.fillRect(sl, y0, sw, y1 - y0);
        K.glow(ctx, sl + sw / 2, (y0 + y1) * 0.5, 30, [255, 180, 90], 0.18 * flick * warm);
        // a calm lattice: one upright, two cross bars at uneven heights
        ctx.strokeStyle = 'rgba(110,52,30,.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
        ctx.moveTo(sl + sw / 2, y0); ctx.lineTo(sl + sw / 2, y1);
        for (const f of [0.38, 0.62]) { const yy = lerp(y0, y1, f + (i % 2 ? 0.05 : -0.05)); ctx.moveTo(sl, yy); ctx.lineTo(sl + sw, yy); }
        ctx.stroke();
        if (i === 1 && side < 0) { const sxp = sl + sw / 2 + Math.sin(t * 0.8) * 3; ctx.fillStyle = 'rgba(120,50,40,.28)'; circ(ctx, sxp, y0 + 26, 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(sxp - 5, y0 + 50); ctx.quadraticCurveTo(sxp - 4, y0 + 31, sxp, y0 + 30); ctx.quadraticCurveTo(sxp + 4, y0 + 31, sxp + 5, y0 + 50); ctx.fill(); }
      }
      // wooden frame
      ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 2.4; ctx.strokeRect(sl + 1.2, y0 + 1.2, sw - 2.4, y1 - y0 - 2.4);
      ctx.strokeStyle = 'rgba(230,170,120,.45)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(sl + 0.5, y1 - 0.5); ctx.lineTo(sl + 0.5, y0 + 0.5); ctx.lineTo(sl + sw - 0.5, y0 + 0.5); ctx.stroke();
    }
    // thick bamboo stalks at the outer edge, nodes at uneven spacing, a few leaf sprays
    for (const [d, r, seed, y0] of [[4, 5.4, side < 0 ? 4 : 9, -2], [12.5, 3.4, side < 0 ? 6 : 13, side < 0 ? h * 0.52 : h * 0.3]]) {
      bambooStalk(ctx, X(d), y0, h + 2, r, seed, 0.9);
      if (y0 > 0) { // a diagonally cut top showing the pale hollow
        ctx.fillStyle = '#e8f0b0'; ell(ctx, X(d), y0, r, r * 0.45, side * 0.4); ctx.fill();
        ctx.fillStyle = '#5a7a30'; ell(ctx, X(d), y0 + 0.4, r * 0.55, r * 0.22, side * 0.4); ctx.fill();
      }
      const rr = K.rand(seed + 50);
      for (let k = 0; k < 3; k++) { const ly = lerp(Math.max(0, y0) + 10, h, rr()), sw2 = Math.sin(t * 1.2 + k + seed) * 0.08; for (let q = 0; q < 3; q++) bambooLeaf(ctx, X(d), ly, 13 + q * 2, (side < 0 ? -0.2 : Math.PI + 0.2) + side * -1 * (q * 0.35 - 0.3) + sw2, ['#b8e078', '#3e8a34']); }
    }
    // the lacquered pillar along the inner edge
    const [pl, pw] = span(inset - 8, inset + 12);
    ctx.fillStyle = K.lg(ctx, pl, 0, pl + pw, 0, side < 0 ? ['#5a0c14', '#c8382c', '#f07a5a', '#8a1618'] : ['#8a1618', '#f07a5a', '#c8382c', '#5a0c14']); ctx.fillRect(pl, -2, pw, h + 4);
    ctx.fillStyle = 'rgba(255,220,200,.35)'; ctx.fillRect(side < 0 ? pl + pw * 0.62 : pl + pw * 0.3, -2, 1.4, h + 4);
    // beams with gold caps where they meet the pillar
    for (const by of beams) {
      const [bl, bw] = span(0, inset + 2);
      ctx.fillStyle = K.lg(ctx, 0, by - 7, 0, by + 7, ['#f07a5a', '#b82a24', '#5a0c12']); ctx.fillRect(bl, by - 7, bw, 14);
      ctx.fillStyle = 'rgba(255,214,190,.55)'; ctx.fillRect(bl, by - 7, bw, 1.1);
      ctx.fillStyle = 'rgba(40,6,10,.4)'; ctx.fillRect(bl, by + 7, bw, 3);
      ctx.fillStyle = K.lg(ctx, 0, by - 9, 0, by + 9, ['#fff2b0', '#e8a830', '#8a5210']); ctx.beginPath(); ctx.roundRect(X(inset + 4) - (side < 0 ? 0 : 7), by - 9, 7, 18, 2); ctx.fill();
      ctx.strokeStyle = '#7a4a0e'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#fff6c8'; circ(ctx, X(inset + 0.5), by - 4.5, 1); ctx.fill(); circ(ctx, X(inset + 0.5), by + 4.5, 1); ctx.fill();
    }
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(inset + 10), 0, ['rgba(30,8,24,.55)', 'rgba(30,8,24,.1)']); ctx.fillRect(Math.min(X(0), X(inset + 10)), 0, inset + 10, h);
  }

  // a flared pagoda roof eave jutting out of the wall, glazed green tiles, gold curl tip and a hanging bell
  function eave(ctx, x0, y, side, len, t) {
    const tip = x0 + side * len;
    ctx.save();
    K.shadow(ctx, x0 + side * len * 0.5, y + 10, len * 0.6, 5, 0.35);
    // rafters
    for (let k = 0; k < 4; k++) { const rx = x0 + side * (4 + k * len * 0.2); ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 7, ['#e04a34', '#7a1218']); ctx.fillRect(rx - 2, y, 4, 6 - k); ctx.fillStyle = '#ffd060'; ctx.fillRect(rx - 2, y + 5 - k, 4, 1.2); }
    // roof body
    ctx.beginPath(); ctx.moveTo(x0 - side * 6, y - 13); ctx.quadraticCurveTo(x0 + side * len * 0.6, y - 6, tip + side * 4, y - 16);
    ctx.quadraticCurveTo(tip, y - 6, tip - side * 6, y + 1); ctx.quadraticCurveTo(x0 + side * len * 0.4, y + 1, x0 - side * 6, y + 1); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 16, 0, y + 2, ['#9ee8c0', '#2e9a7a', '#0e4a44']); ctx.fill();
    ctx.strokeStyle = '#0a3a34'; ctx.lineWidth = 1; ctx.stroke();
    // tile ridges
    ctx.save(); ctx.clip();
    for (let k = 0; k < 7; k++) { const tx = x0 + side * k * len / 6; ctx.strokeStyle = 'rgba(10,58,52,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, y - 16); ctx.lineTo(tx + side * 3, y + 2); ctx.stroke(); ctx.strokeStyle = 'rgba(210,255,230,.55)'; ctx.beginPath(); ctx.moveTo(tx + side * 1.5, y - 16); ctx.lineTo(tx + side * 4.4, y + 1); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(230,255,240,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y - 12.5); ctx.quadraticCurveTo(x0 + side * len * 0.6, y - 5.5, tip + side * 3, y - 15); ctx.stroke();
    // gold trim along the lower edge and the curl
    ctx.strokeStyle = '#e8b030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y + 1); ctx.quadraticCurveTo(x0 + side * len * 0.45, y + 1, tip - side * 6, y + 1); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, tip + side * 3, y - 19, 6, ['#fff4b0', '#e8a830', '#8a5210']); ctx.beginPath(); ctx.arc(tip + side * 4, y - 18, 3.4, 0, TAU); ctx.fill();
    // hanging bell
    const sw = Math.sin(t * 2.4 + x0) * 0.15, bx = tip - side * 6;
    ctx.translate(bx, y + 1); ctx.rotate(sw);
    ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, -4, 0, 4, 0, ['#8a5a10', '#ffe08a', '#b07a18']); ctx.beginPath(); ctx.moveTo(-1.5, 6); ctx.quadraticCurveTo(-4, 8, -4, 13); ctx.lineTo(4, 13); ctx.quadraticCurveTo(4, 8, 1.5, 6); ctx.fill();
    ctx.restore();
  }

  // a red paper lantern; glow 0..1; coinInside shows a coin's shadow through the paper
  function paperLantern(ctx, x, y, s, t, ph, coinInside) {
    const sw = Math.sin(t * 1.6 + ph) * 0.06, fl = 0.85 + 0.15 * Math.sin(t * 7 + ph) * Math.sin(t * 3.3 + ph);
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.scale(s, s);
    K.glow(ctx, 0, 12, 34, [255, 150, 70], 0.45 * fl);
    ctx.strokeStyle = '#5a2a10'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 1); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, -3, 9, 16, [[0, '#fff2c0'], [0.35, '#ff9a50'], [0.75, '#e0302a'], [1, '#8a1218']]); ell(ctx, 0, 12, 11, 10); ctx.fill();
    ctx.strokeStyle = '#7a1418'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(140,20,20,.55)'; ctx.lineWidth = 0.7;
    for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) { ctx.beginPath(); ctx.ellipse(0, 12, Math.abs(k) * 11 + 0.3, 10, 0, -Math.PI / 2, Math.PI / 2, k < 0); ctx.stroke(); }
    if (coinInside) { ctx.strokeStyle = 'rgba(150,50,10,.55)'; ctx.lineWidth = 1.4; circ(ctx, 0, 12, 4.4); ctx.stroke(); ctx.fillStyle = 'rgba(255,230,120,.5)'; circ(ctx, 0, 12, 3.4); ctx.fill(); }
    ctx.fillStyle = K.lg(ctx, -6, 0, 6, 0, ['#7a4a0e', '#ffd860', '#9a6010']); ctx.fillRect(-6, 1, 12, 2.6); ctx.fillRect(-6, 21.5, 12, 2.6);
    ctx.strokeStyle = '#e83a30'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const d of [-1.5, 0, 1.5]) { ctx.moveTo(d, 24); ctx.lineTo(d * 1.4 + Math.sin(t * 2 + ph) * 0.8, 31); } ctx.stroke();
    K.sheen(ctx, 0, 12, 10, 0.4);
    ctx.restore();
  }

  function bambooSpinner(ctx, wx, y, w, t) {
    const c = cyc(t, 3.6, 0.2);
    const unfold = smooth(0.7, 1.3, c) * (1 - smooth(3.0, 3.5, c));
    const ext = smooth(1.3, 1.7, c) * (1 - smooth(2.8, 3.3, c));
    const spin = c < 1.3 ? (c - 0.7) * (c > 0.7 ? 2 : 0) : c < 2.9 ? 1.2 + (c - 1.3) * 14 : 1.2 + 1.6 * 14 + (c - 2.9) * 6;
    const hx = wx + 10 + ext * w * 0.24, R = 6 + unfold * 26;
    // slot in the wall
    ctx.fillStyle = '#2a0a0c'; ctx.beginPath(); ctx.roundRect(wx - 6, y - 7, 12, 14, 3); ctx.fill();
    ctx.strokeStyle = '#e8b030'; ctx.lineWidth = 1.2; ctx.stroke();
    // arm
    ctx.fillStyle = K.lg(ctx, 0, y - 3.5, 0, y + 3.5, ['#d8f090', '#6aa040', '#2e5a20']); ctx.fillRect(wx - 2, y - 3, hx - wx + 2, 6);
    ctx.fillStyle = 'rgba(30,70,20,.6)'; ctx.fillRect(lerp(wx, hx, 0.5), y - 3, 1.4, 6);
    if (ext > 0.2 || unfold > 0.2) K.danger(ctx, hx, y, R + 16, 0.28 * Math.max(ext, unfold * 0.6));
    // speed blur disc while it whirls
    if (ext > 0.3) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.rg(ctx, hx, y, R + 4, [[0, 'rgba(160,230,120,0)'], [0.6, `rgba(170,240,130,${0.12 * ext})`], [0.95, `rgba(230,255,200,${0.28 * ext})`], [1, 'rgba(230,255,200,0)']]);
      circ(ctx, hx, y, R + 4); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,230,${0.5 * ext})`; ctx.lineWidth = 1.4;
      for (let k = 0; k < 2; k++) { const a = -spin * 1 + k * Math.PI; ctx.beginPath(); ctx.arc(hx, y, R + 1, a, a + 1.6); ctx.stroke(); }
      ctx.restore();
    }
    // four bamboo blades, sharpened at the tips
    for (let k = 0; k < 4; k++) {
      const a = spin + k * TAU / 4;
      ctx.save(); ctx.translate(hx, y); ctx.rotate(a);
      const L = R, bw = 3.6;
      ctx.fillStyle = K.lg(ctx, 0, -bw, 0, bw, ['#e0ff9a', '#7ac04a', '#2e6a24']);
      ctx.beginPath(); ctx.moveTo(4, -bw); ctx.lineTo(L - 6, -bw); ctx.lineTo(L + 2, bw * 0.2); ctx.lineTo(L - 4, bw); ctx.lineTo(4, bw); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#24501c'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.moveTo(L - 6, -bw); ctx.lineTo(L + 2, bw * 0.2); ctx.lineTo(L - 3, -bw * 0.1); ctx.closePath(); ctx.fill();
      for (const nx of [L * 0.4, L * 0.72]) { ctx.fillStyle = 'rgba(30,70,24,.8)'; ctx.fillRect(nx, -bw, 1.3, bw * 2); ctx.fillStyle = 'rgba(230,255,180,.8)'; ctx.fillRect(nx + 1.3, -bw, 0.8, bw * 2); }
      ctx.restore();
    }
    // lacquer hub with a gold rim and a swirl emblem
    ctx.fillStyle = K.rg(ctx, hx - 2, y - 2, 9, LACQ); circ(ctx, hx, y, 7.5); ctx.fill();
    ctx.strokeStyle = '#e8b030'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.save(); ctx.translate(hx, y); ctx.rotate(spin);
    ctx.fillStyle = '#ffd860'; for (let k = 0; k < 3; k++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.arc(2.5, 0, 2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(4.5, 0); ctx.quadraticCurveTo(4, 3.5, 0.5, 4); ctx.lineTo(1.5, 1.5); ctx.fill(); }
    ctx.restore();
    K.sheen(ctx, hx, y, 7.5, 0.6);
    // glint during the tell
    if (unfold > 0.2 && ext < 0.4) { const g = Math.max(0, Math.sin(c * 14)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,255,230,${g})`; ctx.lineWidth = 1.2; const gx = hx + R * 0.7, gy = y - R * 0.5; ctx.beginPath(); ctx.moveTo(gx - 5, gy); ctx.lineTo(gx + 5, gy); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx, gy + 5); ctx.stroke(); ctx.restore(); }
  }

  function gong(ctx, wx, y, w, t) {
    const c = cyc(t, 3.4, 0.4);
    const back = smooth(0.8, 1.55, c) * (1 - smooth(1.55, 1.68, c)), hit = c > 1.66 ? Math.exp(-(c - 1.66) * 3) : 0;
    const gx = wx - 22, gr = 19;
    // frame: two lacquer posts and a curved top beam bolted to the wall
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, 1, LACQ);
    for (const px of [gx - 24, gx + 18]) { ctx.fillStyle = K.lg(ctx, px - 2.5, 0, px + 2.5, 0, ['#ff8a64', '#c02a24', '#5e0c12']); ctx.fillRect(px - 2.5, y - 30, 5, 58); }
    ctx.fillStyle = K.lg(ctx, 0, y - 36, 0, y - 28, ['#ff8a64', '#c02a24', '#5e0c12']);
    ctx.beginPath(); ctx.moveTo(gx - 32, y - 38); ctx.quadraticCurveTo(gx - 3, y - 30, gx + 26, y - 38); ctx.lineTo(gx + 24, y - 30); ctx.quadraticCurveTo(gx - 3, y - 25, gx - 30, y - 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8b030'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(gx - 9, y - 28); ctx.lineTo(gx - 6, y - gr + 1); ctx.moveTo(gx + 3, y - 28); ctx.lineTo(gx + 2, y - gr + 1); ctx.stroke();
    // shockwave: soft gold-bronze ripple rings with a bright inner edge, fading as they cross the shaft
    if (hit > 0.02) {
      ctx.save(); ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const u = clamp((c - 1.66 - k * 0.14) / 1.0, 0, 1); if (u <= 0 || u >= 1) continue;
        const rr = gr + 4 + u * w * 0.6, a = Math.pow(1 - u, 1.4) * (1 - k * 0.2), a0 = Math.PI * 0.68, a1 = Math.PI * 1.32;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = rgb([200, 130, 50], 0.28 * a); ctx.lineWidth = 9 - u * 4; ctx.beginPath(); ctx.arc(gx - 2, y, rr, a0, a1); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgb([255, 196, 100], 0.4 * a); ctx.lineWidth = 3.5 - u * 1.5; ctx.beginPath(); ctx.arc(gx - 2, y, rr, a0, a1); ctx.stroke();
        ctx.strokeStyle = rgb([255, 244, 200], 0.75 * a); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(gx - 2, y, rr - 3, a0 + 0.04, a1 - 0.04); ctx.stroke();
      }
      ctx.restore();
    }
    // the gong: bronze disc, rings and a raised boss, shuddering after the hit
    const wob = 1 - hit * 0.12 * Math.abs(Math.sin(c * 40));
    ctx.save(); ctx.translate(gx - 2, y); ctx.scale(wob, 1);
    K.glow(ctx, 0, 0, gr * 2.4, [255, 190, 90], 0.15 + 0.4 * hit);
    ctx.fillStyle = K.rg(ctx, -6, -7, gr * 1.4, ['#fff0b0', '#e8a83a', '#a0601a', '#5a3008']); circ(ctx, 0, 0, gr); ctx.fill();
    ctx.strokeStyle = '#5a3008'; ctx.lineWidth = 1.2; ctx.stroke();
    for (const k of [0.82, 0.62]) { ctx.strokeStyle = 'rgba(110,60,12,.7)'; ctx.lineWidth = 1; circ(ctx, 0, 0, gr * k); ctx.stroke(); ctx.strokeStyle = 'rgba(255,240,180,.5)'; ctx.beginPath(); ctx.arc(0.6, 0.6, gr * k, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    ctx.fillStyle = K.rg(ctx, -2, -2, 7, ['#fff8d0', '#f0b84a', '#8a5010']); circ(ctx, 0, 0, 6); ctx.fill();
    ctx.strokeStyle = '#6a3a0a'; ctx.lineWidth = 0.8; ctx.stroke();
    // a red seal mark
    ctx.strokeStyle = 'rgba(190,40,30,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.moveTo(0, -14); ctx.lineTo(0, -9); ctx.stroke();
    K.sheen(ctx, 0, 0, gr, 0.55);
    ctx.restore();
    // the mallet on a pivot above, swinging back for the tell and slamming in
    const ang = 0.18 + back * 1.0 - (c > 1.55 && c < 1.8 ? 0.22 * Math.sin((c - 1.55) / 0.25 * Math.PI) : 0) - hit * 0.08 * Math.sin(c * 12);
    const pvx = gx - 27, pvy = y - 36;
    ctx.save(); ctx.translate(pvx, pvy); ctx.rotate(ang);
    ctx.fillStyle = K.lg(ctx, -2, 0, 2, 0, ['#e8b878', '#9a6a3a', '#5a3a1a']); ctx.fillRect(-1.6, 0, 3.2, 36);
    ctx.fillStyle = K.rg(ctx, -3, 36, 10, ['#ffb0a0', '#e0302a', '#7a1218']); ell(ctx, 0, 40, 6, 7); ctx.fill();
    ctx.strokeStyle = '#6a1014'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-5.6, 37); ctx.lineTo(5.6, 37); ctx.stroke();
    K.sheen(ctx, 0, 40, 6, 0.5);
    ctx.restore();
    ctx.fillStyle = '#ffd860'; circ(ctx, pvx, pvy, 2.2); ctx.fill();
    if (back > 0.3) { ctx.strokeStyle = `rgba(255,240,200,${back * 0.6})`; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(pvx, pvy, 46 + k * 4, Math.PI * 0.5 + back * 0.7, Math.PI * 0.5 + back * 1.1); ctx.stroke(); } }
  }

  function fireworks(ctx, wx, y, w, t) {
    const c = cyc(t, 3.8, 1.1);
    const fizz = smooth(0.4, 0.6, c) * (1 - smooth(1.55, 1.65, c));
    const shots = [[1.6, -1, [255, 110, 170], 0.48, -46], [1.85, 1, [110, 230, 255], 0.66, 4]];
    // the rack: bamboo tubes bound with red cord, angled up and out
    ctx.save(); ctx.translate(wx + 4, y); ctx.rotate(-0.5);
    for (let k = 0; k < 3; k++) {
      const ty = -8 + k * 8;
      ctx.fillStyle = K.lg(ctx, 0, ty - 3.5, 0, ty + 3.5, ['#d8f090', '#6aa040', '#2e5a20']); ctx.fillRect(-6, ty - 3.5, 26, 7);
      ctx.fillStyle = '#1a2a10'; ell(ctx, 20, ty, 1.6, 3.4); ctx.fill();
      ctx.fillStyle = 'rgba(30,70,20,.7)'; ctx.fillRect(9, ty - 3.5, 1.3, 7);
      // a rocket still in the tube (gone once launched)
      const launched = k < 2 ? c > shots[k][0] && c < 3.6 : false;
      if (!launched) { ctx.fillStyle = K.lg(ctx, 0, ty - 3, 0, ty + 3, ['#ff9a80', '#e0302a', '#7a1218']); ctx.fillRect(14, ty - 2.6, 9, 5.2); ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.moveTo(23, ty - 2.6); ctx.lineTo(27, ty); ctx.lineTo(23, ty + 2.6); ctx.fill(); }
    }
    ctx.strokeStyle = '#e83a30'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(2, 12); ctx.moveTo(14, -12); ctx.lineTo(14, 12); ctx.stroke();
    // fuses fizzing: a spark crawling up each curly fuse
    for (let k = 0; k < 2; k++) {
      const ty = -8 + k * 8;
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, ty); ctx.bezierCurveTo(-10, ty + 4, -12, ty - 4, -15, ty + 2); ctx.stroke();
      if (fizz > 0.05 && c < shots[k][0]) {
        const u = clamp((c - 0.5) / (shots[k][0] - 0.5), 0, 1), sx = lerp(-15, -6, u), sy = ty + 2 - u * 2 + Math.sin(u * 6) * 2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        K.glow(ctx, sx, sy, 9, [255, 200, 90], 0.8);
        for (let q = 0; q < 6; q++) { const a = q + t * 30, r2 = 2 + ((t * 40 + q * 3) % 5); ctx.strokeStyle = `rgba(255,236,150,${0.9 - r2 / 8})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2); ctx.stroke(); }
        ctx.restore();
      }
    }
    ctx.restore();
    // rockets in flight, zig-zagging across, then bursting
    for (const [t0, side, col, fx, bdy] of shots) {
      const u = clamp((c - t0) / 0.9, 0, 1), sx0 = wx + 18, sy0 = y - 12;
      const ex = wx + w * fx, ey = y + bdy;
      if (c > t0 && u < 1) {
        const px = lerp(sx0, ex, u), base = lerp(sy0, ey, u), zz = Math.sin(u * Math.PI * 3) * 12 * side, py = base + zz;
        const u2 = Math.max(0, u - 0.04), qx = lerp(sx0, ex, u2), qy = lerp(sy0, ey, u2) + Math.sin(u2 * Math.PI * 3) * 12 * side, ang = Math.atan2(py - qy, px - qx);
        // spark trail
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 1; k < 10; k++) { const uu = Math.max(0, u - k * 0.025), tx = lerp(sx0, ex, uu), ty = lerp(sy0, ey, uu) + Math.sin(uu * Math.PI * 3) * 12 * side; ctx.fillStyle = `rgba(255,${220 - k * 10},${140 - k * 8},${0.8 - k * 0.08})`; circ(ctx, tx + Math.sin(k * 7 + t * 30), ty + Math.cos(k * 5 + t * 30), 2.2 - k * 0.15); ctx.fill(); }
        ctx.restore();
        K.danger(ctx, px, py, 22, 0.3);
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
        ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-16, 0); ctx.stroke();
        ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#ff9a80', '#e0302a', '#7a1218']); ctx.fillRect(-6, -3, 10, 6);
        ctx.fillStyle = '#ffd860'; ctx.fillRect(-3, -3, 1.5, 6); ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(9, 0); ctx.lineTo(4, 3); ctx.fill();
        K.glow(ctx, -7, 0, 9, [255, 200, 90], 0.8);
        ctx.restore();
      }
      // burst
      const b = (c - t0 - 0.9) / 0.9;
      if (b > 0 && b < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        K.glow(ctx, ex, ey, 40 * (0.5 + b), col, 0.5 * (1 - b));
        const n = 14;
        for (let k = 0; k < n; k++) {
          const a = k / n * TAU + side * 0.2, r1 = 6 + b * 40, drop = b * b * 14, x = ex + Math.cos(a) * r1, yy = ey + Math.sin(a) * r1 + drop;
          const x0 = ex + Math.cos(a) * r1 * 0.55, y0 = ey + Math.sin(a) * r1 * 0.55 + drop * 0.6;
          ctx.strokeStyle = rgb(col, 0.7 * (1 - b)); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, yy); ctx.stroke();
          ctx.fillStyle = `rgba(255,255,240,${1 - b})`; circ(ctx, x, yy, 1.6 * (1 - b * 0.5)); ctx.fill();
          if (k % 2) { ctx.fillStyle = `rgba(255,220,120,${0.8 * (1 - b)})`; circ(ctx, ex + Math.cos(a + 0.2) * r1 * 0.75, ey + Math.sin(a + 0.2) * r1 * 0.75 + drop, 1.1); ctx.fill(); }
        }
        ctx.restore();
        if (b < 0.6) K.danger(ctx, ex, ey, 40, 0.25 * (1 - b));
      }
    }
  }

  PV.sections['pagoda'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...PAG, farShape: pagFar, wallDeco: pagWall });
    // eaves at the tier breaks
    eave(ctx, S.R(h * 0.3), h * 0.3, -1, 30, t);
    eave(ctx, S.L(h * 0.44), h * 0.44, 1, 30, t);
    eave(ctx, S.R(h * 0.76), h * 0.76, -1, 30, t);
    eave(ctx, S.L(h * 0.97), h * 0.97, 1, 30, t);
    // a string of paper lanterns across the top: shoot them for coins
    const ly = h * 0.04, l0 = S.L(ly), l1 = S.R(ly), sag = 18;
    ctx.strokeStyle = '#4a2a20'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l0, ly); ctx.quadraticCurveTo((l0 + l1) / 2, ly + sag * 2, l1, ly); ctx.stroke();
    for (const [u, ph, ci] of [[0.25, 0, false], [0.5, 1.3, true], [0.75, 2.6, false]]) {
      const x = lerp(l0, l1, u), yy = ly + sag * 2 * 2 * u * (1 - u) * 1;
      paperLantern(ctx, x, yy, 0.95, t, ph, ci);
    }
    // little pennants on the string
    for (let k = 1; k < 12; k++) { if (k % 3 === 0) continue; const u = k / 12, x = lerp(l0, l1, u), yy = ly + sag * 4 * u * (1 - u); ctx.fillStyle = ['#ffd860', '#ff6a5a', '#9ee8c0'][k % 3]; ctx.beginPath(); ctx.moveTo(x - 3, yy); ctx.lineTo(x + 3, yy); ctx.lineTo(x + Math.sin(t * 3 + k), yy + 7); ctx.fill(); }
    coin(ctx, w * 0.42, h * 0.3, 7.5, t, 0); coin(ctx, w * 0.62, h * 0.54, 7.5, t, 1); coin(ctx, w * 0.38, h * 0.76, 7.5, t, 2);
    bambooSpinner(ctx, S.L(h * 0.2), h * 0.2, w, t);
    gong(ctx, S.R(h * 0.5), h * 0.5, w, t);
    fireworks(ctx, S.L(h * 0.68), h * 0.68, w, t);
    K.rocket(ctx, w * 0.5, h * 0.86, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 200, 140], 12, 21);
    // falling bamboo leaves
    const r = K.rand(77);
    for (let k = 0; k < 5; k++) { const x0 = r() * w, sp = 14 + r() * 10, y = cyc(r() * h + t * sp, h + 20) - 10; bambooLeaf(ctx, x0 + Math.sin(t + k) * 10, y, 9, Math.sin(t * 1.5 + k) * 0.8 + 0.5, ['#d8f090', '#6ab04a']); }
  };

  // ======================================================================================
  // HOLLOW PALM
  // ======================================================================================
  const PALM = {
    bgTop: [84, 96, 90], bgBot: [28, 34, 36], far: [74, 84, 78], far2: [58, 64, 60],
    wall: [60, 50, 42], wallIn: [16, 16, 18], rim: [70, 110, 96], seed: 8, inset: 31, wobble: 1.0,
  };
  // knotholes the sun shines through: [side, y fraction]; beams angle down and across
  const KNOTS = [[1, 0.17], [-1, 0.47], [1, 0.7]];

  function palmFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the inside of the hollow trunk curving away: fibre strands bunching toward the sides of the tube
      const r = K.rand(14);
      const buckets = {};
      for (let k = 0; k < 30; k++) {
        const th = -1.35 + k * (2.7 / 29) + (r() - 0.5) * 0.04, x = w * 0.5 + Math.sin(th) * w * 0.62, sh = Math.cos(th);
        const key = (sh > 0.75 ? 2 : sh > 0.45 ? 1 : 0) + '_' + (k % 3);
        (buckets[key] = buckets[key] || []).push([x, sh, k]);
      }
      for (const key in buckets) {
        const [lv, tone] = key.split('_').map(Number), sh = [0.35, 0.62, 0.9][lv];
        ctx.strokeStyle = rgb(K.lift(col, (sh - 0.6) * 40 + [10, -8, 0][tone]), 0.9); ctx.lineWidth = 1.2 + sh * 3; ctx.beginPath();
        for (const [x, , k] of buckets[key]) { ctx.moveTo(x, h * 0.12); ctx.bezierCurveTo(x + 4 * sh, h * 0.4, x - 4 * sh, h * 0.7, x + Math.sin(k) * 3, h + 2); }
        ctx.stroke();
        if (tone === 1) { ctx.strokeStyle = rgb(K.lift(col, 30), 0.3 * sh); ctx.lineWidth = 0.7; ctx.beginPath(); for (const [x, , k] of buckets[key]) { ctx.moveTo(x - 1.2, h * 0.12); ctx.bezierCurveTo(x - 1.2 + 4 * sh, h * 0.4, x - 1.2 - 4 * sh, h * 0.7, x - 1.2 + Math.sin(k) * 3, h + 2); } ctx.stroke(); }
      }
      // ring scars on the far wall, bowed by the curve of the tube
      for (const [o, cc, lw] of [[0, rgb(K.lift(col, -26), 0.75), 2], [1.6, rgb(K.lift(col, 22), 0.45), 1]]) {
        ctx.strokeStyle = cc; ctx.lineWidth = lw; ctx.beginPath();
        for (let y = h * 0.24; y < h; y += 46 + (y % 17)) for (let k = 0; k <= 20; k++) { const th = -1.35 + k * 0.135, x = w * 0.5 + Math.sin(th) * w * 0.62, yy = y - Math.cos(th) * 10 + o; k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
        ctx.stroke();
      }
      // tube shading: darker where it curves away at the sides
      ctx.fillStyle = K.lg(ctx, 0, 0, w, 0, ['rgba(14,20,22,.55)', 'rgba(14,20,22,0)', 'rgba(14,20,22,0)', 'rgba(14,20,22,.55)']); ctx.fillRect(0, 0, w, h);
      // the open crown far above: cool sky, fronds and sun pouring in
      const cy = -10;
      ctx.fillStyle = K.rg(ctx, w * 0.5, cy, w * 0.62, [[0, '#f4fff0'], [0.25, '#bfe6ee'], [0.55, 'rgba(130,190,170,.55)'], [1, 'rgba(84,96,90,0)']]);
      ctx.fillRect(0, 0, w, h * 0.42);
      ctx.save(); ctx.translate(w * 0.5, cy);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.08 + k * 0.105) + Math.sin(t * 0.7 + k) * 0.03, L = 70 + (k % 3) * 18;
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = k % 2 ? 'rgba(54,112,70,.9)' : 'rgba(74,136,84,.85)';
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(L * 0.5, -10, L, 6); ctx.quadraticCurveTo(L * 0.5, 4, 0, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(30,70,40,.6)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let q = 1; q < 8; q++) { const u = q / 8, x = L * u, yy = lerp(-3, 4, u) - Math.sin(u * Math.PI) * 4; ctx.moveTo(x, yy); ctx.lineTo(x + 6, yy + 7); } ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    } else {
      // nearer fibrous layers peeling away from the inner wall on both sides, drooping in long tattered sheets
      const r = K.rand(52);
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
        const y0 = h * (0.16 + k * 0.28 + r() * 0.06), len = h * (0.22 + r() * 0.12), x0 = side < 0 ? -4 : w + 4, reach = w * (0.16 + r() * 0.1), sw = Math.sin(t * 0.6 + k + side) * 2;
        const c = K.lift(col, -4 + k * 4);
        ctx.fillStyle = K.lg(ctx, x0, 0, x0 - side * reach, 0, [rgb(K.lift(c, -12)), rgb(c), rgb(K.lift(c, 8))]);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 - side * reach * 1.1, y0 + len * 0.2, x0 - side * reach + sw, y0 + len);
        for (let q = 0; q < 5; q++) ctx.lineTo(x0 - side * reach * (1 - (q + 0.5) / 6) + sw, y0 + len - (q % 2 ? 8 : 0) - q * 3);
        ctx.quadraticCurveTo(x0 - side * reach * 0.3, y0 + len * 0.4, x0, y0 + len * 0.3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgb(K.lift(c, 22), 0.5); ctx.lineWidth = 0.8; ctx.beginPath();
        for (let q = 1; q < 5; q++) { const f = q / 5; ctx.moveTo(x0, y0 + len * 0.3 * f); ctx.quadraticCurveTo(x0 - side * reach * (0.3 + f * 0.8), y0 + len * 0.3, x0 - side * reach * f + sw, y0 + len - 6); }
        ctx.stroke();
      }
    }
  }

  function palmWall(ctx, side, edge, w, h, t) {
    const X = d => side < 0 ? d : w - d, depth = 48, r = K.rand(side < 0 ? 91 : 97);
    // long vertical fibre strands, swerving around the knots, as line pairs (batched by tone)
    const strand = (d0, ph, o) => { for (let y = -4; y <= h + 12; y += 12) { let d = d0 + Math.sin(y * 0.025 + ph) * 1.6; for (const [ks, ky] of KNOTS) if (ks === side) { const dy = (y - ky * h) / 22; d += Math.exp(-dy * dy) * (d0 > 22 ? 6 : -6); } y < 0 ? ctx.moveTo(X(d) + o, y) : ctx.lineTo(X(d) + o, y); } };
    const S0 = []; for (let k = 0; k < 15; k++) S0.push([1.5 + k * 3.1 + r() * 1.5, r() * 9]);
    [[92, 76, 60], [54, 44, 38], [74, 66, 54]].forEach((c, tone) => { ctx.strokeStyle = rgb(c, 0.85); ctx.lineWidth = 2.1; ctx.beginPath(); S0.forEach(([d0, ph], k) => { if (k % 3 === tone) strand(d0, ph, 0); }); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(190,200,176,.22)'; ctx.lineWidth = 0.7; ctx.beginPath(); S0.forEach(([d0, ph], k) => { if (k % 2) strand(d0, ph, side < 0 ? -1 : 1); }); ctx.stroke();
    // ring scars: grooves around the trunk with a lit lip, frayed fibre tufts and moss in the groove (batched)
    const scars = []; for (let y = 30 + r() * 30; y < h; y += 58 + r() * 34) scars.push(y);
    const yy = (y, d) => y + Math.sin(d * 0.15 + y) * 1.2 + d * 0.05;
    for (const [col, lw, o] of [['rgba(14,12,12,.75)', 2.6, 0], ['rgba(170,176,150,.45)', 1, 2.2]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); for (const y of scars) for (let d = 0; d <= depth; d += 8) d ? ctx.lineTo(X(d), yy(y, d) + o) : ctx.moveTo(X(d), yy(y, d) + o); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,110,90,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (const y of scars) for (let d = 4; d < depth; d += 7) { ctx.moveTo(X(d), yy(y, d) + 3); ctx.lineTo(X(d + 1.5), yy(y, d) + 8 + (d % 3)); } ctx.stroke();
    const moss = scars.map(y => [X(8 + r() * 26), yy(y, 10) - 2]);
    for (const [mx, my] of moss) { ctx.fillStyle = K.rg(ctx, mx, my, 12, ['rgba(110,170,120,.7)', 'rgba(70,130,100,.35)', 'rgba(60,120,90,0)']); ell(ctx, mx, my, 13, 5); ctx.fill(); }
    ctx.fillStyle = 'rgba(180,230,170,.6)'; ctx.beginPath(); for (const [mx, my] of moss) for (let z = 0; z < 6; z++) { ctx.moveTo(mx - 7 + z * 3 + 0.8, my - 1 + (z % 2)); ctx.arc(mx - 7 + z * 3, my - 1 + (z % 2), 0.8, 0, TAU); } ctx.fill();
    // teal moss patches creeping up from below
    for (let k = 0; k < 4; k++) { const mx = X(4 + r() * 24), my = r() * h; ctx.fillStyle = K.rg(ctx, mx, my, 14, ['rgba(90,150,120,.45)', 'rgba(60,120,100,0)']); ell(ctx, mx, my, 10, 18); ctx.fill(); }
    // cool shadow toward the screen edge
    ctx.fillStyle = K.lg(ctx, X(0), 0, X(depth), 0, ['rgba(8,14,18,.6)', 'rgba(8,14,18,.12)', 'rgba(120,180,160,.06)']);
    ctx.fillRect(Math.min(X(0), X(depth)), 0, depth, h);
  }

  // a knothole: ring grain around a hole with bright outside light; the sunbeam it throws across the shaft
  function knothole(ctx, x, y, side, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = K.rg(ctx, 0, 0, 20, ['rgba(40,32,26,.9)', 'rgba(70,60,48,.6)', 'rgba(70,60,48,0)']); ell(ctx, 0, 0, 16, 21); ctx.fill();
    for (let k = 3; k >= 1; k--) { ctx.strokeStyle = 'rgba(20,16,14,.6)'; ctx.lineWidth = 1; ell(ctx, 0, 0, 6 + k * 3, 9 + k * 3.6); ctx.stroke(); ctx.strokeStyle = 'rgba(170,170,140,.3)'; ctx.beginPath(); ctx.ellipse(0.8, 0.8, 6 + k * 3, 9 + k * 3.6, 0, 0.3, 2.2); ctx.stroke(); }
    ctx.fillStyle = K.lg(ctx, 0, -10, 0, 10, ['#241c18', '#4a3e32']); ell(ctx, 0, 0, 6, 9); ctx.fill();
    ctx.fillStyle = K.rg(ctx, 0, 0, 7, ['#fffbe0', '#ffe48a', '#f0b040']); ell(ctx, side * 0.8, 0.5, 4, 6.5); ctx.fill();
    ctx.restore();
    K.glow(ctx, x, y, 26, [255, 220, 130], 0.5);
  }
  function sunbeam(ctx, x, y, side, w, h, t, k) {
    const sh = 0.8 + 0.2 * Math.sin(t * 0.9 + k * 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ex = x + side * -1 * w * 0.95, ey = y + h * 0.28;
    const g = K.lg(ctx, x, y, ex, ey, [`rgba(255,200,96,${0.5 * sh})`, `rgba(255,180,80,${0.2 * sh})`, 'rgba(255,170,70,0)']);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 7); ctx.lineTo(ex, ey + 36); ctx.lineTo(ex, ey - 22); ctx.closePath(); ctx.fill();
    // dust glittering inside the beam
    const r = K.rand(200 + k);
    ctx.fillStyle = 'rgba(255,240,190,.8)'; ctx.beginPath();
    for (let q = 0; q < 12; q++) { const u = cyc(r() + t * 0.04 * (0.5 + r()), 1), px = lerp(x, ex, u), py = lerp(y, ey, u) + (r() - 0.5) * lerp(10, 50, u) + Math.sin(t + q) * 2, rr = (0.9 + r() * 0.8) * Math.max(0, Math.sin(t * 2 + q * 1.7)) * (1 - u); if (rr > 0.2) { ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); } }
    ctx.fill();
    ctx.restore();
  }

  function shelfFungus(ctx, x, y, side, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(side * s, s);
    for (const [ox, oy, rw] of [[0, 0, 14], [2, -7, 10]]) {
      ctx.fillStyle = K.lg(ctx, 0, oy - 5, 0, oy + 4, ['#f4f2e2', '#c4bc9c', '#6e6a56']);
      ctx.beginPath(); ctx.moveTo(ox - 2, oy - 4); ctx.quadraticCurveTo(ox + rw * 0.8, oy - 8, ox + rw, oy + 1); ctx.quadraticCurveTo(ox + rw * 0.5, oy + 4, ox - 2, oy + 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a483a'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(110,104,80,.6)'; ctx.beginPath(); ctx.moveTo(ox, oy - 2); ctx.quadraticCurveTo(ox + rw * 0.6, oy - 5, ox + rw * 0.85, oy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,230,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox + 1, oy - 4.5); ctx.quadraticCurveTo(ox + rw * 0.5, oy - 7, ox + rw * 0.75, oy - 4); ctx.stroke();
    }
    ctx.restore();
  }

  function nest(ctx, x, y, side, t) {
    ctx.save(); ctx.translate(x, y);
    K.shadow(ctx, side * 8, 6, 18, 3, 0.35);
    for (const [ex, c] of [[side * 4, 0], [side * 10, 1], [side * 15, 0]]) {
      ctx.fillStyle = K.rg(ctx, ex - 1.5, -6, 6, c ? ['#ffffff', '#cfe8f0', '#7aa8b8'] : ['#f0fbff', '#9ad4ea', '#4a8aa8']); ell(ctx, ex, -3, 3.6, 4.6); ctx.fill();
      ctx.fillStyle = 'rgba(60,90,110,.6)'; circ(ctx, ex + 1, -4, 0.6); ctx.fill(); circ(ctx, ex - 1, -1.5, 0.5); ctx.fill();
    }
    const r = K.rand(5); ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) { const a = r() * 0.6 - 0.3, x0 = side * (-4 + r() * 6), x1 = side * (16 + r() * 10); ctx.strokeStyle = k % 3 ? '#8a5a2a' : '#d8a868'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, 1 + r() * 4); ctx.quadraticCurveTo((x0 + x1) / 2, 7 + r() * 3, x1, -1 + r() * 4); ctx.stroke(); }
    ctx.restore();
  }

  function woodpecker(ctx, wx, y, w, t) {
    const c = cyc(t, 3.4, 0.3);
    const tapping = c > 0.2 && c < 1.2, tapPh = (c * 5) % 1, tap = tapping ? Math.exp(-tapPh * 8) : 0;
    const crack = smooth(0.2, 1.2, c) * (1 - smooth(3.05, 3.4, c));
    const jab = smooth(1.2, 1.32, c) * (1 - 0.45 * bump(c, 1.9, 1.97, 2.03, 2.1)) * (1 - smooth(2.8, 3.0, c));
    const hole = smooth(1.2, 1.26, c) * (1 - smooth(3.0, 3.35, c));
    const shake = tap * 1.5;
    // bark cracks spreading with every tap
    if (crack > 0.01) {
      K.danger(ctx, wx - 6, y, 28, 0.18 * crack + 0.15 * tap);
      ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI * (0.5 + k * 0.2), L = 6 + crack * 14; ctx.moveTo(wx + shake, y); ctx.lineTo(wx + Math.cos(a) * L * 0.5 + shake + 2, y + Math.sin(a) * L * 0.5); ctx.lineTo(wx + Math.cos(a + 0.2) * L + shake, y + Math.sin(a + 0.2) * L); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,160,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI * (0.5 + k * 0.2), L = 6 + crack * 14; ctx.moveTo(wx + 1 + shake, y + 1); ctx.lineTo(wx + Math.cos(a) * L * 0.5 + shake + 3, y + Math.sin(a) * L * 0.5 + 1); } ctx.stroke();
      // tap impact rings and hopping splinters
      if (tap > 0.05) {
        ctx.strokeStyle = `rgba(255,240,200,${tap})`; ctx.lineWidth = 1.2;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(wx, y, 6 + k * 5 + (1 - tap) * 6, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke(); }
        for (let k = 0; k < 3; k++) { const u = tapPh, sx = wx - 4 - u * (14 + k * 6), sy = y - 6 + k * 5 - 20 * u + 30 * u * u; ctx.fillStyle = '#e8b878'; ctx.save(); ctx.translate(sx, sy); ctx.rotate(u * 6 + k); ctx.fillRect(-2.5, -0.8, 5, 1.6); ctx.restore(); }
      }
    }
    if (hole > 0.01) {
      ctx.fillStyle = K.rg(ctx, wx, y, 14, ['#fff4c0', '#ffd070', 'rgba(255,200,90,0)']); ell(ctx, wx + 2, y, 9 * hole, 12 * hole); ctx.fill();
      // splintered rim
      ctx.fillStyle = '#c8945a';
      for (let k = 0; k < 7; k++) { const a = Math.PI * (0.55 + k * 0.15), r0 = 9 * hole; ctx.beginPath(); ctx.moveTo(wx + 2 + Math.cos(a - 0.12) * r0, y + Math.sin(a - 0.12) * r0 * 1.3); ctx.lineTo(wx + 2 + Math.cos(a) * (r0 - 5), y + Math.sin(a) * (r0 - 5) * 1.3); ctx.lineTo(wx + 2 + Math.cos(a + 0.12) * r0, y + Math.sin(a + 0.12) * r0 * 1.3); ctx.fill(); }
    }
    if (jab > 0.01) {
      // flying chips at the punch-through
      if (c < 1.5) { const u = (c - 1.2) / 0.3, r = K.rand(3); for (let k = 0; k < 9; k++) { const vx = -(20 + r() * 50), vy = (r() - 0.5) * 60; ctx.save(); ctx.translate(wx + vx * u, y + vy * u + 30 * u * u); ctx.rotate(u * 8 + k); ctx.fillStyle = k % 2 ? '#e8b878' : '#8a5a2a'; ctx.fillRect(-3, -1, 6, 2); ctx.restore(); } }
      const reach = w * 0.36 * jab + (jab > 0.9 ? Math.sin(t * 55) * 1.6 : 0), bx = wx - reach;
      K.danger(ctx, bx + 10, y, 32, 0.38 * jab);
      // head poking through: navy feathers, white cheek, red crest
      const hx = wx - 4 - jab * 12;
      ctx.fillStyle = K.rg(ctx, hx - 3, y - 6, 16, ['#ff8a7a', '#e02a2a', '#8a1018']);
      ctx.beginPath(); ctx.moveTo(hx + 4, y - 10); ctx.quadraticCurveTo(hx - 2, y - 26, hx + 12, y - 22); ctx.quadraticCurveTo(hx + 10, y - 17, hx + 20, y - 14); ctx.quadraticCurveTo(hx + 16, y - 8, hx + 12, y - 6); ctx.fill(); ctx.strokeStyle = '#8a1018'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = K.rg(ctx, hx - 2, y - 5, 17, ['#6a7ad8', '#2e3a8a', '#141c4a']); circ(ctx, hx + 5, y, 12.5); ctx.fill();
      ctx.strokeStyle = '#121a40'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = K.lg(ctx, 0, y - 2, 0, y + 8, ['#ffffff', '#d8e0f0']); ctx.beginPath(); ctx.moveTo(hx - 4, y + 1); ctx.quadraticCurveTo(hx + 2, y + 9, hx + 10, y + 6); ctx.quadraticCurveTo(hx + 4, y + 3, hx - 4, y + 1); ctx.fill();
      K.sheen(ctx, hx + 5, y, 12.5, 0.45);
      // the beak: long, pointed, glossy horn
      ctx.fillStyle = K.lg(ctx, 0, y - 4, 0, y + 4, ['#fff4b0', '#f2b830', '#a8640e']);
      ctx.beginPath(); ctx.moveTo(hx - 4, y - 6); ctx.quadraticCurveTo(lerp(hx, bx, 0.6), y - 3.5, bx, y + 0.5); ctx.quadraticCurveTo(lerp(hx, bx, 0.6), y + 4, hx - 4, y + 5.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a4e0a'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = 'rgba(138,78,10,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx - 3, y + 0.2); ctx.lineTo(bx + 4, y + 0.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,230,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx - 5, y - 4); ctx.lineTo(bx + 8, y - 0.6); ctx.stroke();
      K.eyes(ctx, hx + 5, y - 4, 3.8, 3.2, '#ffcf3a', -0.9, 0.9);
      // speed lines
      ctx.strokeStyle = 'rgba(255,240,210,.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (const o of [-9, 9]) { ctx.moveTo(bx + 18, y + o); ctx.lineTo(bx + 40, y + o); } ctx.stroke();
    }
  }

  function sapDrop(ctx, x0, y0, len, x, h, t, k) {
    // the branch stub it oozes from
    if (k === 0) {
      ctx.lineCap = 'round';
      for (const [lw, col, o] of [[9, '#2a2620', 1], [7.5, '#5e5444', 0], [3.5, '#8e8468', -1.4], [1, 'rgba(220,220,190,.7)', -3]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0 - 8, y0 + o); ctx.quadraticCurveTo(x0 + len * 0.5, y0 - 4 + o, x0 + len, y0 + 2 + o); ctx.stroke(); }
      ctx.fillStyle = K.rg(ctx, x0 + len - 1, y0 + 1, 5, ['#c8c0a0', '#5e5444']); ell(ctx, x0 + len, y0 + 2, 3.5, 4); ctx.fill();
      // a little leaf on the stub
      ctx.fillStyle = K.lg(ctx, x0 + len * 0.4, y0 - 12, x0 + len * 0.6, y0, ['#b8e070', '#4a8a2a']); ctx.beginPath(); ctx.moveTo(x0 + len * 0.45, y0 - 3); ctx.quadraticCurveTo(x0 + len * 0.4, y0 - 14, x0 + len * 0.62, y0 - 16); ctx.quadraticCurveTo(x0 + len * 0.62, y0 - 6, x0 + len * 0.45, y0 - 3); ctx.fill();
    }
    const c = cyc(t, 2.8, k * 1.4), grow = smooth(0, 1.3, c), fall = c > 1.3 ? c - 1.3 : -1;
    const sy = y0 + 4;
    // sap glaze running along the underside
    ctx.fillStyle = 'rgba(240,170,40,.9)'; ell(ctx, x, sy, 5, 2.2); ctx.fill();
    const drawBlob = (bx, by, r, stretch) => {
      ctx.fillStyle = K.rg(ctx, bx - r * 0.35, by - r * 0.3, r * 1.5, [[0, '#fffbe0'], [0.3, '#ffd45a'], [0.75, '#e0901e'], [1, '#8a4a08']]);
      ctx.beginPath(); ctx.moveTo(bx, by - r * stretch * 1.6); ctx.bezierCurveTo(bx + r * 0.4, by - r * stretch, bx + r, by - r * 0.4, bx + r, by); ctx.arc(bx, by, r, 0, Math.PI); ctx.bezierCurveTo(bx - r, by - r * 0.4, bx - r * 0.4, by - r * stretch, bx, by - r * stretch * 1.6); ctx.fill();
      ctx.strokeStyle = 'rgba(120,40,6,.8)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,240,.85)'; ell(ctx, bx - r * 0.4, by - r * 0.25, r * 0.22, r * 0.38, 0.4); ctx.fill();
      ctx.fillStyle = 'rgba(80,30,10,.5)'; circ(ctx, bx + r * 0.2, by + r * 0.15, r * 0.18); ctx.fill();   // a trapped gnat
      K.glow(ctx, bx, by, r * 2.4, [255, 200, 90], 0.18);
    };
    if (fall < 0) {
      const r = 2 + grow * 5.5, neck = grow * 7;
      drawBlob(x, sy + 2 + neck, r, 0.6 + grow * 0.6);
      if (grow > 0.6) { ctx.strokeStyle = `rgba(255,200,120,${(grow - 0.6) * 1.5})`; ctx.lineWidth = 1; circ(ctx, x, sy + 2 + neck, r + 4 + Math.sin(t * 8) * 1); ctx.stroke(); }
    } else {
      const fy = sy + 9 + 0.5 * 520 * fall * fall, r = 7.5;
      if (fy < h + 20) {
        drawBlob(x, fy, r, 0.7 + Math.min(0.5, fall * 1.2));
        // sticky slow-zone halo around the falling blob
        ctx.strokeStyle = 'rgba(255,190,90,.45)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); circ(ctx, x, fy, r + 6); ctx.stroke(); ctx.setLineDash([]);
      }
      // a thinning strand left behind for a moment
      if (fall < 0.3) { ctx.strokeStyle = `rgba(230,130,20,${0.8 * (1 - fall / 0.3)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, sy + 2); ctx.lineTo(x, fy - r * 1.8); ctx.stroke(); }
      const r2 = 2 + smooth(0.2, 1.4, fall) * 2; drawBlob(x, sy + 3, r2, 0.6);
    }
  }

  function coconutCrab(ctx, lx, y, w, t) {
    // the ledge: a big bracket fungus shelf sticking out of the wall
    const len = w * 0.46;
    ctx.save();
    K.shadow(ctx, lx + len * 0.5, y + 16, len * 0.5, 5, 0.4);
    const shelf = (k) => { const L = len * (1 - k * 0.06), dy = k * 4.5; ctx.beginPath(); ctx.moveTo(lx - 6, y - 3 + dy); ctx.quadraticCurveTo(lx + L * 0.7, y - 7 + dy, lx + L, y + 1 + dy); ctx.quadraticCurveTo(lx + L + 5, y + 8 + dy, lx + L - 6, y + 10 + dy); ctx.quadraticCurveTo(lx + L * 0.4, y + 12 + dy, lx - 6, y + 15 + dy); ctx.closePath(); };
    shelf(0); ctx.fillStyle = K.lg(ctx, 0, y - 8, 0, y + 16, ['#f6f2e0', '#cfc6a2', '#8a8064', '#3e3a2e']); ctx.fill();
    ctx.strokeStyle = '#3a3628'; ctx.lineWidth = 1; ctx.stroke();
    // growth bands following the rounded front edge
    ctx.save(); shelf(0); ctx.clip();
    for (const [k, col] of [[1, 'rgba(176,160,120,.55)'], [2, 'rgba(130,118,88,.55)'], [3, 'rgba(90,82,62,.6)']]) {
      const L = len * (1 - k * 0.07); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(lx - 6, y - 1 + k * 3); ctx.quadraticCurveTo(lx + L * 0.7, y - 5 + k * 3, lx + L - 2, y + 2 + k * 2.5); ctx.quadraticCurveTo(lx + L + 1, y + 7 + k, lx + L - 8, y + 9 + k * 0.5); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,235,.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx, y - 3.5); ctx.quadraticCurveTo(lx + len * 0.7, y - 7.5, lx + len - 1, y + 0.5); ctx.stroke();
    // velvety gills underneath
    ctx.strokeStyle = 'rgba(60,56,44,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let k = 1; k < 11; k++) { const gx = lx + len * k / 11.5; ctx.moveTo(gx, y + 11 + (k > 7 ? -1.5 : 0)); ctx.lineTo(gx - 2.5, y + 15 - (k > 7 ? 3 : 0)); } ctx.stroke();
    for (const [sx, sy, sr] of [[len * 0.12, -4, 5], [len * 0.3, -5, 3]]) { ctx.fillStyle = K.rg(ctx, lx + sx, y + sy, sr * 2, ['rgba(110,176,120,.85)', 'rgba(70,130,100,0)']); ell(ctx, lx + sx, y + sy, sr * 2, sr * 0.8); ctx.fill(); }
    ctx.restore();
    const c = cyc(t, 3.6, 2.1);
    const out = smooth(0.9, 1.6, c) * (1 - smooth(2.6, 3.4, c));
    const tell = smooth(0.4, 0.9, c) * (1 - smooth(1.6, 1.8, c));
    const snapping = c > 1.6 && c < 2.6;
    const moving = (c > 0.9 && c < 1.6) || (c > 2.6 && c < 3.4);
    const cx = lx + 20 + out * (len - 42), cy = y - 9;
    const sn = snapping ? Math.abs(Math.sin(c * 16)) : 0, raise = Math.max(tell, snapping ? 1 : 0);
    if (raise > 0.1 || out > 0.5) K.danger(ctx, cx + 14, cy - 6, 40, 0.3 * Math.max(raise, out));
    ctx.save(); ctx.translate(cx, cy); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // legs: orange, jointed, scuttling
    for (let k = 0; k < 4; k++) for (const d of [-1, 1]) {
      const ph = t * 18 + k * 1.6 + (d > 0 ? Math.PI : 0), st = moving ? Math.sin(ph) * 2.5 : 0, lift = moving ? Math.max(0, Math.cos(ph)) * 2 : 0;
      const hx = d * (6 + k * 2.2), kx = d * (12 + k * 3.2) + st, fx = d * (14 + k * 3.8) + st;
      ctx.strokeStyle = '#a03a10'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(hx, 2); ctx.lineTo(kx, -5 + k); ctx.lineTo(fx, 9 - lift); ctx.stroke();
      ctx.strokeStyle = '#ffa860'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, 1.4); ctx.lineTo(kx, -5.6 + k); ctx.stroke();
    }
    // claws: one huge, one smaller, raised for the tell and clacking
    for (const d of [1, -1]) {
      const big = d > 0, sc = big ? 1.3 : 0.9, ax = d * 9, ay = -2;
      const ex = ax + d * (8 + raise * 3) * sc, ey = ay - 6 - raise * 10 * sc;
      ctx.strokeStyle = '#6a2a8a'; ctx.lineWidth = 4 * sc; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,170,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay - 1.5); ctx.lineTo(ex, ey - 1.5); ctx.stroke();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(d * (-0.6 + raise * -0.3)); ctx.scale(d * sc, sc);
      ctx.fillStyle = K.rg(ctx, -1, -3, 9, ['#ffd0a0', '#ff6a3a', '#a02a10']); ell(ctx, 4, 0, 6.5, 4.6); ctx.fill(); ctx.strokeStyle = '#7a1e0a'; ctx.lineWidth = 0.8; ctx.stroke();
      const o = 0.15 + sn * 0.45 + tell * 0.25;
      ctx.save(); ctx.translate(9, -1); ctx.rotate(-o); ctx.fillStyle = K.lg(ctx, 0, -3, 0, 2, ['#ffe0c0', '#ff7a40']); ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(6, -4, 8, 0); ctx.quadraticCurveTo(5, -0.6, 0, 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7a1e0a'; ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(9, 1.5); ctx.rotate(o * 0.5); ctx.fillStyle = '#d8501e'; ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(5, 2, 7, 0.5); ctx.quadraticCurveTo(4, 2.6, 0, 1.6); ctx.closePath(); ctx.fill(); ctx.restore();
      K.sheen(ctx, 4, 0, 5, 0.55);
      ctx.restore();
      if (sn > 0.85) { ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 0; q < 3; q++) { const a = -1.2 + q * 0.5; ctx.moveTo(ex + d * 14 + Math.cos(a) * 4, ey - 2 + Math.sin(a) * 4); ctx.lineTo(ex + d * 14 + Math.cos(a) * 8, ey - 2 + Math.sin(a) * 8); } ctx.stroke(); }
    }
    // the shell: wide glossy violet-blue carapace with ridges
    ctx.fillStyle = K.rg(ctx, -4, -8, 18, ['#e8c8ff', '#8a4ad8', '#4a1e8a', '#2a0e50']); ctx.beginPath(); ctx.moveTo(-13, 2); ctx.quadraticCurveTo(-15, -10, 0, -11); ctx.quadraticCurveTo(15, -10, 13, 2); ctx.quadraticCurveTo(0, 6, -13, 2); ctx.fill();
    ctx.strokeStyle = '#2a0e50'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,110,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(0, -7, 8, -3); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -3, 10, 0); ctx.stroke();
    ctx.fillStyle = '#ff9a5a'; for (const [sx, sy] of [[-6, -6], [5, -7], [0, -4]]) { circ(ctx, sx, sy, 1); ctx.fill(); }
    K.sheen(ctx, -1, -4, 11, 0.55);
    // eye stalks
    for (const d of [-1, 1]) { ctx.strokeStyle = '#7a3ab8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(d * 3, -10); ctx.lineTo(d * 4.5, -15 - raise * 2); ctx.stroke(); }
    K.eyes(ctx, 0, -17 - raise * 2, 4.5, 3, '#ffcf3a', 0.6, 0.6 + raise * 0.4);
    ctx.restore();
  }

  PV.sections['hollowpalm'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...PALM, farShape: palmFar, wallDeco: palmWall });
    rimVary(ctx, S.L, h, [96, 170, 140], 2.2, 0.55); rimVary(ctx, S.R, h, [96, 170, 140], 5.3, 0.55);
    // knotholes and their sunbeams slanting across the shaft
    KNOTS.forEach(([side, fy], k) => { const y = h * fy, x = side < 0 ? S.L(y) - 10 : S.R(y) + 10; sunbeam(ctx, x, y, side, w, h, t, k); });
    KNOTS.forEach(([side, fy]) => { const y = h * fy; knothole(ctx, side < 0 ? S.L(y) - 10 : S.R(y) + 10, y, side, t); });
    // crown rim: frayed fibres hanging round the opening at the very top
    const r = K.rand(40);
    for (let k = 0; k < 18; k++) { const x = r() * w, L = 8 + r() * 18, sw = Math.sin(t + k) * 2; ctx.strokeStyle = k % 2 ? '#4a5a44' : '#7a8a64'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, -2); ctx.quadraticCurveTo(x + 2, L * 0.6, x + sw, L); ctx.stroke(); }
    shelfFungus(ctx, S.L(h * 0.3) - 2, h * 0.3, 1, 1);
    shelfFungus(ctx, S.R(h * 0.56) + 2, h * 0.56, -1, 0.9);
    shelfFungus(ctx, S.L(h * 0.9) - 2, h * 0.9, 1, 1.1);
    nest(ctx, S.R(h * 0.88) + 4, h * 0.88, -1, t);
    coin(ctx, w * 0.6, h * 0.14, 7.5, t, 0); coin(ctx, w * 0.42, h * 0.48, 7.5, t, 1); coin(ctx, w * 0.62, h * 0.48, 7.5, t, 1.6); coin(ctx, w * 0.6, h * 0.76, 7.5, t, 2.2);
    const bx0 = S.L(h * 0.12);
    sapDrop(ctx, bx0, h * 0.12, w * 0.28, bx0 + w * 0.24, h, t, 0);
    sapDrop(ctx, bx0, h * 0.12, w * 0.28, bx0 + w * 0.13, h, t, 1);
    woodpecker(ctx, S.R(h * 0.34), h * 0.34, w, t);
    coconutCrab(ctx, S.L(h * 0.64), h * 0.64, w, t);
    K.rocket(ctx, w * 0.5, h * 0.86, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [220, 230, 210], 30, 31);
  };
})();
