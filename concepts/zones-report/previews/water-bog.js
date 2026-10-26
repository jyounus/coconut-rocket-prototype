// Hidden Lagoon + Toxic Bog: section scenes and their four obstacles
// (Leaping Piranha, Drifting Jellyfish, Gas Vent, Snapper Plant).
(() => {
  const { TAU, lerp, smooth, clamp, rgb, lift } = K;
  const mod = (a, n) => ((a % n) + n) % n;

  // ---------------------------------------------------------------- palettes
  const LAG = {
    bgTop: [80, 142, 150], bgBot: [22, 62, 78], far: [62, 118, 128], far2: [50, 102, 114],
    wall: [24, 46, 54], wallIn: [6, 15, 20], rim: [110, 242, 228], seed: 11,
  };
  const BOG = {
    bgTop: [106, 118, 66], bgBot: [38, 48, 24], far: [88, 100, 56], far2: [76, 88, 46],
    wall: [38, 40, 20], wallIn: [10, 12, 5], rim: [190, 255, 70], seed: 23,
  };

  // ---------------------------------------------------------------- lagoon backdrop
  LAG.farShape = (ctx, w, h, t, layer, col) => {
    const r = K.rand(layer * 31 + 7), n = 4 + layer * 2;
    // drowned stalactites and stalagmites
    for (let i = 0; i < n; i++) {
      const x = r() * w, cw = 16 + r() * 34 * (layer ? 1 : 1.5), top = r() < 0.55;
      const len = h * (0.2 + r() * 0.4), y0 = top ? -10 : h + 10, y1 = top ? len : h - len;
      ctx.beginPath(); ctx.moveTo(x - cw, y0); ctx.quadraticCurveTo(x - cw * 0.25, (y0 + y1) / 2, x, y1);
      ctx.quadraticCurveTo(x + cw * 0.25, (y0 + y1) / 2, x + cw, y0); ctx.fill();
    }
    // waterfalls pouring from far ledges: pale ribbons with streaks racing down and mist at the foot
    const falls = layer ? [[0.3, 0.2, 13], [0.74, 0.05, 9]] : [[0.55, 0.12, 22], [0.12, 0.3, 14]];
    for (const [fx, fy, fw] of falls) {
      const x = fx * w, y0 = fy * h, lc = lift(col, layer ? 46 : 34);
      ctx.fillStyle = rgb(lift(col, -10)); // ledge lip the water spills from
      ctx.beginPath(); ctx.ellipse(x, y0, fw * 1.6, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = K.lg(ctx, 0, y0, 0, h, [rgb(lc, 0.75), rgb(lc, 0.45), rgb(lc, 0.25)]);
      ctx.beginPath(); ctx.moveTo(x - fw, y0); ctx.quadraticCurveTo(x - fw * 1.05, y0 + 40, x - fw * 1.2, h); ctx.lineTo(x + fw * 1.2, h);
      ctx.quadraticCurveTo(x + fw * 1.05, y0 + 40, x + fw, y0); ctx.fill();
      ctx.save(); ctx.strokeStyle = rgb(lift(lc, 50), 0.55); ctx.lineWidth = 1.2; ctx.setLineDash([10, 16]);
      for (let k = -2; k <= 2; k++) {
        ctx.lineDashOffset = -t * (120 + k * 9) - k * 7;
        ctx.beginPath(); ctx.moveTo(x + k * fw * 0.38, y0 + 2); ctx.lineTo(x + k * fw * 0.46, h); ctx.stroke();
      }
      ctx.restore();
      const mx = x, my = h * 0.98;
      ctx.fillStyle = K.rg(ctx, mx, my, fw * 4, [rgb(lift(lc, 40), 0.45), rgb(lc, 0)]);
      ctx.beginPath(); ctx.arc(mx, my, fw * 4, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(col);
    }
  };
  LAG.wallDeco = (ctx, side, edge, w, h, t) => {
    const r = K.rand(side < 0 ? 41 : 53);
    // wet rounded boulders packed into the wall, each with a cool lit cap and a damp sheen
    for (let y = -20; y < h + 30; y += 26 + r() * 14) {
      const ex = edge(y), depth = 6 + r() * 26, x = ex + side * depth, rx = 11 + r() * 10, ry = 8 + r() * 6;
      ctx.fillStyle = K.lg(ctx, 0, y - ry, 0, y + ry, [rgb(lift(LAG.wall, 18)), rgb(LAG.wall), rgb(LAG.wallIn)]);
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r() - 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(lift(LAG.wallIn, 4)); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = rgb(LAG.rim, 0.22); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y, rx * 0.8, ry * 0.7, 0, side < 0 ? 4.2 : 3.6, side < 0 ? 5.6 : 5.0); ctx.stroke();
      ctx.fillStyle = 'rgba(220,255,250,.5)'; ctx.beginPath(); ctx.arc(x - rx * 0.3, y - ry * 0.45, 1.1, 0, TAU); ctx.fill();
    }
    // trickles running down the rock face
    ctx.save(); ctx.strokeStyle = rgb(LAG.rim, 0.25); ctx.lineWidth = 1; ctx.setLineDash([3, 9]);
    for (let k = 0; k < 4; k++) {
      const d = 8 + k * 7 + r() * 5, y0 = r() * h * 0.5; ctx.lineDashOffset = -t * (40 + k * 10);
      ctx.beginPath(); for (let y = y0; y < h; y += 12) { const x = edge(y) + side * d; y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    }
    ctx.restore();
  };

  // light caustics dancing over everything
  function caustics(ctx, w, h, t, a = 0.07) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const r = K.rand(91);
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = r() * h, s = 9 + r() * 14, ph = r() * TAU, pts = [];
      const cx = x + Math.sin(t * 0.8 + ph) * 6;
      for (let k = 0; k < 7; k++) {
        const an = k / 7 * TAU, rr = s * (1 + 0.3 * Math.sin(an * 2 + t * 1.6 + ph));
        pts.push([cx + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.65]);
      }
      // soft pool of light, then a wobbly bright net line round it (smooth, like real caustics)
      ctx.fillStyle = K.rg(ctx, cx, y, s * 1.2, [`rgba(150,255,240,${a * 0.5})`, 'rgba(150,255,240,0)']);
      ctx.beginPath(); ctx.arc(cx, y, s * 1.2, 0, TAU); ctx.fill();
      const m = j => [(pts[j][0] + pts[(j + 1) % 7][0]) / 2, (pts[j][1] + pts[(j + 1) % 7][1]) / 2];
      ctx.beginPath(); ctx.moveTo(...m(6));
      for (let j = 0; j < 7; j++) ctx.quadraticCurveTo(...pts[j], ...m(j));
      ctx.strokeStyle = `rgba(170,255,245,${a * (0.7 + 0.3 * Math.sin(t * 2 + ph))})`; ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.restore();
  }

  // dripping moss draped over the inner wall edge
  function moss(ctx, sh, side, ys, t, P, cols) {
    for (const [y, len] of ys) {
      const ex = side < 0 ? sh.L(y) : sh.R(y), d = -side;
      for (let k = 0; k < 5; k++) {
        const x = ex - d * 4 + d * k * 3.2, l = len * (0.5 + 0.5 * Math.sin(k * 2.7 + y) ** 2), sw = Math.sin(t * 1.3 + k + y) * 1.5;
        ctx.strokeStyle = cols[k % 2]; ctx.lineWidth = 2.6 - k * 0.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.quadraticCurveTo(x + d * 2, y + l * 0.5, x + sw, y + l); ctx.stroke();
        // a drop forming and falling from the longest strands
        if (k % 2 === 0) {
          const u = mod(t * 0.7 + k * 0.37 + y * 0.01, 1), dy = u < 0.6 ? 0 : (u - 0.6) * (u - 0.6) * 300, sz = u < 0.6 ? u / 0.6 * 1.6 : 1.6;
          ctx.fillStyle = rgb(lift(P.rim, 20), 0.8); ctx.beginPath(); ctx.arc(x + sw, y + l + 1.5 + dy, sz, 0, TAU); ctx.fill();
        }
      }
      // the clump: a lumpy cushion of moss hugging the edge, lit on top
      for (const [bx, by, br] of [[-2, -1, 5], [3, -4, 5.5], [8, -2, 4.5], [12, 0, 3.5], [5, 1, 4]]) {
        const x = ex + d * bx, yy = y + by;
        ctx.fillStyle = K.rg(ctx, x - br * 0.3, yy - br * 0.4, br * 1.2, [cols[1], cols[0], cols[2]]);
        ctx.beginPath(); ctx.arc(x, yy, br, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = rgb(P.rim, 0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ex + d * 3, y - 4, 4.5, 3.6, 5.2); ctx.stroke();
    }
  }

  // a rock ledge jutting from a wall; its top surface at y. Returns where things sit on it.
  function ledge(ctx, P, sh, side, y, len, th = 12) {
    const ex = side < 0 ? sh.L(y) : sh.R(y), d = -side, x0 = ex - d * 5, tip = ex + d * len;
    ctx.beginPath(); ctx.moveTo(x0, y - 3); ctx.lineTo(tip - d * 7, y - 2.5);
    ctx.quadraticCurveTo(tip + d * 2, y - 1, tip - d * 1, y + 4);
    ctx.quadraticCurveTo(ex + d * len * 0.5, y + th, ex + d * len * 0.1, y + th * 1.6);
    ctx.quadraticCurveTo(ex + d * 2, y + th * 2.1, x0, y + th * 2.6); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 3, 0, y + th * 2.2, [rgb(lift(P.wall, 30)), rgb(lift(P.wall, 6)), rgb(P.wallIn)]); ctx.fill();
    ctx.strokeStyle = rgb(lift(P.wallIn, 3)); ctx.lineWidth = 1.2; ctx.stroke();
    // strata cracks
    ctx.strokeStyle = rgb(P.wallIn, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex - d * 2, y + 5); ctx.quadraticCurveTo(ex + d * len * 0.4, y + 7, tip - d * 8, y + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + d * 6, y + th * 1.2); ctx.lineTo(ex + d * len * 0.35, y + th * 0.9); ctx.stroke();
    // lit top edge in the zone's rim colour
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgb(P.rim, 0.3); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ex - d * 2, y - 2.8); ctx.lineTo(tip - d * 7, y - 2.5); ctx.quadraticCurveTo(tip + d * 2, y - 1, tip - d, y + 4); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgb(lift(P.rim, 20), 0.85); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ex - d * 2, y - 2.8); ctx.lineTo(tip - d * 7, y - 2.5); ctx.quadraticCurveTo(tip + d * 2, y - 1, tip - d, y + 4); ctx.stroke();
    return { ex, tip, d, mid: (ex + tip) / 2 };
  }

  // a pool sunk into a ledge top (water or acid), with ripples
  function pool(ctx, P, cx, y, rx, t, water, churn = 0) {
    ctx.fillStyle = rgb(P.wallIn); ctx.beginPath(); ctx.ellipse(cx, y - 2, rx + 2, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, y - 5, 0, y + 2, water);
    ctx.beginPath(); ctx.ellipse(cx, y - 1.6, rx, 3.6, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, y - 1.6, rx, 3.6, 0, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let k = 0; k < 2 + churn * 2; k++) {
      const u = mod(t * (0.8 + churn * 1.6) + k / (2 + churn * 2), 1);
      ctx.globalAlpha = (1 - u) * (0.5 + churn * 0.5);
      ctx.beginPath(); ctx.ellipse(cx + Math.sin(k * 3.1) * rx * 0.3, y - 1.6, 2 + u * rx * 0.8, 0.8 + u * 2.6, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(cx, y - 1.6, rx * 0.75, 2.4, 0, 3.6, 4.4); ctx.stroke();
    // the near lip of the basin
    ctx.strokeStyle = rgb(lift(P.wall, 34)); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(cx, y - 1.8, rx + 1.5, 4.2, 0, 0.15, Math.PI - 0.15); ctx.stroke();
  }

  // a trickle spilling over a ledge lip
  function spill(ctx, x, y, len, t, c) {
    ctx.save(); ctx.strokeStyle = rgb(c, 0.5); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y + len * 0.3, x + 1.5, y + len); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1; ctx.setLineDash([4, 7]); ctx.lineDashOffset = -t * 90;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y + len * 0.3, x + 1.5, y + len); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- Leaping Piranha
  // drawn facing +x; dir flips it; ang tilts it along its arc; open 0..1 gapes the jaw
  function piranha(ctx, x, y, s, dir, ang, t, open) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.rotate(ang);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const fin = (c0, c1, edge) => { ctx.fillStyle = K.lg(ctx, 0, -6, 0, 6, [c0, c1]); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); };
    // tail, wagging
    ctx.save(); ctx.translate(-17, 0); ctx.rotate(Math.sin(t * 24) * 0.28);
    ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(-5, -5, -14, -14); ctx.quadraticCurveTo(-9, -4, -10, 0);
    ctx.quadraticCurveTo(-9, 4, -14, 14); ctx.quadraticCurveTo(-5, 5, 3, 0); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, -14, 0, 14, ['#ffb35a', '#e24a2a', '#ffb35a']); ctx.fill();
    ctx.strokeStyle = '#8a2414'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,170,.55)'; ctx.lineWidth = 0.7;
    for (const a of [-0.8, -0.35, 0.35, 0.8]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, a * 13); ctx.stroke(); }
    ctx.restore();
    // dorsal and belly fins
    ctx.beginPath(); ctx.moveTo(-11, -10); ctx.quadraticCurveTo(-7, -22, 4, -21); ctx.quadraticCurveTo(-1, -16, 3, -12); ctx.closePath();
    fin('#ff9d48', '#c4361e', '#7a2412');
    ctx.beginPath(); ctx.moveTo(-11, 9); ctx.quadraticCurveTo(-7, 18, 0, 17.5); ctx.quadraticCurveTo(-2, 13, 1, 11); ctx.closePath();
    fin('#e24a2a', '#ff9d48', '#7a2412');
    // body: deep and blunt, steel-blue back to a hot red belly
    const body = () => {
      ctx.beginPath(); ctx.moveTo(18, -2); ctx.bezierCurveTo(15, -15, -3, -18, -13, -9);
      ctx.quadraticCurveTo(-19, -4, -19, 0); ctx.quadraticCurveTo(-19, 4, -13, 9);
      ctx.bezierCurveTo(-3, 17, 9, 16, 15, 9); ctx.lineTo(10, 4); ctx.closePath();
    };
    body(); ctx.fillStyle = K.lg(ctx, 0, -16, 0, 15, [[0, '#a7d0e6'], [0.3, '#5d8aae'], [0.56, '#e06a40'], [1, '#a82a18']]); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // scales: rows of small lit arcs
    ctx.lineWidth = 0.7;
    for (let row = -2; row <= 2; row++) for (let c = 0; c < 5; c++) {
      const sx = -12 + c * 5 + (row & 1) * 2.5, sy = row * 4.6;
      ctx.strokeStyle = row < 0 ? 'rgba(220,245,255,.4)' : 'rgba(255,200,150,.4)';
      ctx.beginPath(); ctx.arc(sx, sy, 2.6, -1.2, 1.2); ctx.stroke();
    }
    // golden speckles on the flank, underside shadow, back shading
    ctx.fillStyle = 'rgba(255,230,140,.6)';
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(-10 + k * 3.6, 2 + Math.sin(k * 2.3) * 3, 0.8, 0, TAU); ctx.fill(); }
    ctx.fillStyle = K.lg(ctx, 0, 3, 0, 17, ['rgba(110,16,10,0)', 'rgba(110,16,10,.5)']); ctx.fillRect(-20, 3, 40, 15);
    ctx.strokeStyle = 'rgba(50,80,110,.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(-5, 0, 11, -0.9, 0.9); ctx.stroke(); // gill
    ctx.restore();
    K.sheen(ctx, -2, -2, 15, 0.5, 3.6, 4.7);
    body(); ctx.strokeStyle = K.lg(ctx, 0, -16, 0, 16, ['#2f4c6c', '#6e1a10']); ctx.lineWidth = 1.3; ctx.stroke();
    // the gape: dark mouth, a jutting underbite full of teeth
    const o = open;
    ctx.fillStyle = '#5a0e1c'; ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(9, 3); ctx.lineTo(19, 5 + o * 9); ctx.closePath(); ctx.fill();
    const tooth = (x0, y0, x1, y1, tx, ty) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(tx, ty); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    ctx.fillStyle = '#fffbee'; ctx.strokeStyle = '#b8a27e'; ctx.lineWidth = 0.6;
    for (let k = 0; k < 3; k++) { const x0 = 11 + k * 2.6; tooth(x0, 1 - k * 0.9, x0 + 2.6, 0.2 - k * 0.9, x0 + 1.4, 4 - k * 0.6); }
    ctx.save(); ctx.translate(9, 4); ctx.rotate(o * 0.55);
    ctx.beginPath(); ctx.moveTo(-3, 1); ctx.quadraticCurveTo(6, 0, 12, -2); ctx.quadraticCurveTo(11, 6, 3, 9); ctx.quadraticCurveTo(-3, 8, -3, 1); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, -2, 0, 9, ['#e8743e', '#a82a18']); ctx.fill(); ctx.strokeStyle = '#6e1a10'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#fffbee'; ctx.strokeStyle = '#b8a27e'; ctx.lineWidth = 0.6;
    for (let k = 0; k < 4; k++) { const x0 = -1 + k * 3, y0 = 0.6 - k * 0.7; tooth(x0, y0, x0 + 2.8, y0 - 0.6, x0 + 1.6, y0 - 4.2); }
    ctx.restore();
    // big cartoon eye, scowling
    K.eyes(ctx, 6, -6, 0, 4.4, '#ffd23a', 0.55);
    ctx.strokeStyle = '#24364e'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(1, -12.5); ctx.lineTo(11, -9.5); ctx.stroke();
    ctx.restore();
  }

  // splash: droplets thrown up and out, a ring spreading on the surface; k = 0..1 age
  function splash(ctx, x, y, k, c, big = 1) {
    if (k < 0 || k > 1) return;
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x, y, 4 + k * 22 * big, 1.5 + k * 4, 0, 0, TAU); ctx.stroke();
    // crown of water
    ctx.fillStyle = rgb(c, 0.7 * (1 - k));
    ctx.beginPath(); ctx.moveTo(x - 10 * big, y);
    for (let i = 0; i <= 6; i++) { const a = i / 6, px = x + (a - 0.5) * 20 * big * (1 + k), py = y - (i % 2 ? 14 : 6) * big * Math.sin(Math.min(1, k * 2.2) * Math.PI); ctx.lineTo(px, py); }
    ctx.lineTo(x + 10 * big, y); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.33, v = (40 + (i * 37) % 30) * big, px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k + 90 * k * k;
      ctx.fillStyle = i % 3 ? rgb(c, 0.9 * (1 - k)) : `rgba(255,255,255,${0.9 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(px, py, (1.8 - k) * big + 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // the full piranha hazard: two pools on facing ledges; the fish lurks, peeks, leaps across, splashes in, then leaps back
  const PIR_T = 3.6;
  function piranhaHazard(ctx, P, sh, y, len, t, s, ph = 0) {
    const A = ledge(ctx, P, sh, -1, y, len), B = ledge(ctx, P, sh, 1, y, len);
    const ax = A.mid + 4, bx = B.mid - 4, rx = len * 0.34;
    const p = mod(t + ph, PIR_T);
    // lurk/peek at A, leap A->B, lurk at B, leap B->A
    const legs = [[0.75, 1.55, ax, bx, 1], [2.55, 3.35, bx, ax, -1]];
    let fish = null, peek = null;
    for (const [t0, t1, x0, x1, dir] of legs) if (p >= t0 && p < t1) fish = { u: (p - t0) / (t1 - t0), x0, x1, dir };
    if (!fish) {
      const atA = p < 0.75 || p >= 3.35, pk = atA ? mod(p - 3.35, PIR_T) : p - 1.55; // time since landing
      const tell = smooth(0.25, 0.75 + (atA ? 0 : 0.25), pk + (atA ? 0 : -0.25 + 0.25));
      peek = { x: atA ? ax : bx, dir: atA ? 1 : -1, tell: smooth(0.15, 0.7, pk / (atA ? 1.15 : 1)) };
    }
    const water = [[0, '#b8fff4'], [0.5, '#3cc6c8'], [1, '#13707e']];
    for (const [cx, side] of [[ax, A], [bx, B]]) {
      const churn = peek && peek.x === cx ? peek.tell : 0;
      if (churn > 0.2) K.danger(ctx, cx, y - 8, 30 * s, 0.22 * churn);
      pool(ctx, P, cx, y, rx, t + cx * 0.01, water, churn);
    }
    spill(ctx, A.tip - 3, y + 3, 40, t, [150, 250, 240]); spill(ctx, B.tip + 3, y + 3, 30, t + 0.4, [150, 250, 240]);
    if (peek) {
      // the fish's back and eyes breaking the surface, churning bubbles, a red tell glow
      ctx.save(); ctx.beginPath(); ctx.rect(peek.x - 40, y - 80, 80, 78.4); ctx.clip();
      const bob = Math.sin(t * 9) * 1.2 * peek.tell;
      piranha(ctx, peek.x - peek.dir * 2, y + 10 * s - peek.tell * 7 * s + bob, s, peek.dir, -0.25, t, 0.2 * peek.tell);
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,255,250,.8)'; ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const u = mod(t * 1.8 + k / 4, 1);
        if (peek.tell < 0.1) continue;
        ctx.beginPath(); ctx.arc(peek.x + Math.sin(k * 2.2) * 9, y - 3 - u * 14 * peek.tell, 1.2 + k * 0.3, 0, TAU); ctx.stroke();
      }
    }
    if (fish) {
      const H = 120 * s, { u, x0, x1, dir } = fish;
      const fx = lerp(x0, x1, u), fy = y + 4 - 4 * H * u * (1 - u);
      const dx = Math.abs(x1 - x0), dy = -4 * H * (1 - 2 * u);
      K.danger(ctx, fx, fy, 30 * s, 0.32);
      // a spray trail of droplets shed along the arc
      for (let k = 1; k <= 5; k++) {
        const uu = u - k * 0.04; if (uu < 0) break;
        const tx = lerp(x0, x1, uu), ty = y + 4 - 4 * H * uu * (1 - uu) + k * k * 0.8;
        ctx.fillStyle = `rgba(200,255,250,${0.75 - k * 0.13})`; ctx.beginPath(); ctx.arc(tx + Math.sin(k * 5) * 3, ty + Math.cos(k * 3) * 4, 1.6 - k * 0.2, 0, TAU); ctx.fill();
      }
      ctx.save();
      if (u < 0.1 || u > 0.9) { ctx.beginPath(); ctx.rect(0, -1000, 4000, 1000 + y - 1.6); ctx.clip(); }
      piranha(ctx, fx, fy, s, dir, Math.atan2(dy, dx) * 0.85, t, 0.4 + 0.6 * Math.sin(u * Math.PI));
      ctx.restore();
    }
    // splashes: leaving A at 0.75, landing B at 1.55, leaving B 2.55, landing A 3.35
    const sp = [[0.75, ax, 0.7], [1.55, bx, 1], [2.55, bx, 0.7], [3.35, ax, 1]];
    for (const [e, x, big] of sp) splash(ctx, x, y - 2, mod(p - e, PIR_T) / 0.55, [170, 255, 245], big * s);
  }

  // ---------------------------------------------------------------- Drifting Jellyfish
  const JEL_T = 4;
  function jellyState(t, ph) {
    const p = mod(t + ph, JEL_T) / JEL_T;
    const pulse = p < 0.1 ? smooth(0, 0.1, p) : 1 - smooth(0.1, 0.3, p);
    const yoff = p < 0.32 ? -26 * smooth(0, 0.32, p) : -26 + 26 * smooth(0.32, 1, p);
    const sting = smooth(0.42, 0.6, p) * (1 - smooth(0.78, 0.9, p)); // builds (tell), crackles, fades
    return { p, pulse, yoff, sting };
  }
  function jelly(ctx, x, y, s, t, ph, hue = 0) {
    const { pulse, yoff, sting } = jellyState(t, ph);
    const C = hue ? { lo: [120, 70, 210], mid: [170, 120, 255], hi: [235, 220, 255], edge: '#4c2c8e', g: [150, 120, 255] }
                  : { lo: [160, 46, 160], mid: [240, 110, 210], hi: [255, 232, 248], edge: '#7c2380', g: [255, 110, 210] };
    ctx.save(); ctx.translate(x, y + yoff * s); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    K.glow(ctx, 0, 0, 58, C.g, 0.2 + 0.2 * sting);
    if (sting > 0.05) K.danger(ctx, 0, 52, 52, 0.3 * sting);
    // tentacles: long, trailing, swaying with a lag down their length; the stinging cells light in a wave
    const N = 7, sq = 1 - pulse * 0.16;
    for (let i = 0; i < N; i++) {
      const bx = (-17 + 34 * i / (N - 1)) * sq, len = 74 + ((i * 5) % 3) * 13, pts = [];
      for (let j = 0; j <= 10; j++) {
        const v = j / 10;
        pts.push([bx * (1 + v * 0.25) + Math.sin(t * 2.1 - v * 4.5 + i * 1.3) * v * 9 + pulse * bx * v * 0.35, 3 + v * len * (1 - pulse * 0.1)]);
      }
      const line = () => { ctx.beginPath(); pts.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); };
      line(); ctx.strokeStyle = rgb(C.lo, 0.45); ctx.lineWidth = 3; ctx.stroke();
      line(); ctx.strokeStyle = rgb(K.mix(C.mid, [200, 255, 255], sting), 0.85); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const wv = mod(t * 0.9 + ph * 0.3, 1);
      for (let j = 2; j <= 10; j += 2) {
        const v = j / 10, b = Math.exp(-((v - wv) ** 2) / 0.012) * 0.8 + sting * 0.9, [px, py] = pts[j];
        ctx.fillStyle = sting > 0.3 ? `rgba(200,255,255,${0.2 + b * 0.6})` : rgb(C.hi, 0.15 + b * 0.6);
        ctx.beginPath(); ctx.arc(px, py, 0.8 + b * 1.3, 0, TAU); ctx.fill();
      }
      // electric crackle along the tentacle at full sting
      if (sting > 0.5) {
        ctx.strokeStyle = `rgba(190,255,255,${(sting - 0.5) * 1.6})`; ctx.lineWidth = 1;
        const j0 = 2 + Math.floor(mod(t * 13 + i * 3, 7)), [px, py] = pts[j0];
        ctx.beginPath(); ctx.moveTo(px - 4, py - 3); ctx.lineTo(px + 2, py); ctx.lineTo(px - 2, py + 3); ctx.lineTo(px + 4, py + 6); ctx.stroke();
      }
      ctx.restore();
    }
    // oral arms: two frilly ribbons
    for (const d of [-1, 1]) {
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) { const v = j / 8, px = d * (4 + Math.sin(t * 2.4 + v * 6 + d) * 4 * v + v * 2), py = 2 + v * 40; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.strokeStyle = rgb(C.lo, 0.6); ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = rgb(C.mid, 0.8); ctx.lineWidth = 2.6; ctx.stroke();
      ctx.strokeStyle = rgb(C.hi, 0.6); ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
    // the bell: squeezes narrow and tall as it pulses
    const bw = 25 * (1 - 0.15 * pulse), bh = 22 * (1 + 0.15 * pulse);
    const bell = () => {
      ctx.beginPath(); ctx.moveTo(-bw, 3);
      ctx.bezierCurveTo(-bw * 1.02, -bh * 1.3, bw * 1.02, -bh * 1.3, bw, 3);
      for (let k = 7; k >= 0; k--) { const xa = -bw + (k / 8) * bw * 2; ctx.quadraticCurveTo(xa + bw / 8, 7 + (k % 2) * 1.5, xa, 3); }
      ctx.closePath();
    };
    bell(); ctx.fillStyle = K.rg(ctx, -bw * 0.35, -bh * 0.6, bw * 1.7, [rgb(C.hi, 0.97), rgb(C.mid, 0.92), rgb(C.lo, 0.9)]); ctx.fill();
    ctx.save(); bell(); ctx.clip();
    // glowing four-leaf gonads inside, translucent bands, a darker rim at the skirt
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + 0.4, gx = Math.cos(a) * 7, gy = -6 + Math.sin(a) * 4;
      ctx.fillStyle = K.rg(ctx, gx, gy, 7, [rgb(C.hi, 0.55), rgb(C.mid, 0)]); ctx.beginPath(); ctx.ellipse(gx, gy, 6, 4, a, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgb(C.hi, 0.35); ctx.lineWidth = 1;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * bw * 0.28, 4); ctx.quadraticCurveTo(k * bw * 0.32, -bh * 0.5, k * bw * 0.12, -bh * 0.95); ctx.stroke(); }
    ctx.fillStyle = K.lg(ctx, 0, -4, 0, 8, [rgb(C.lo, 0), rgb(C.lo, 0.6)]); ctx.fillRect(-bw, -4, bw * 2, 12);
    ctx.fillStyle = rgb(C.hi, 0.7);
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-bw * 0.6 + k * bw * 0.24, -bh * 0.75 + Math.sin(k * 1.9) * 3 + (k === 0 || k === 5 ? 8 : 0), 1, 0, TAU); ctx.fill(); }
    ctx.restore();
    bell(); ctx.strokeStyle = C.edge; ctx.lineWidth = 1.2; ctx.stroke();
    // face: big eyes, blush, a little mouth that gasps with the pulse
    K.eyes(ctx, 0, -bh * 0.32, 7.2, 4.4, sting > 0.4 ? '#36e8ff' : '#2a9ee0', Math.sin(t * 0.9 + ph) * 0.6);
    // mischievous brows that knit down as it charges
    ctx.strokeStyle = C.edge; ctx.lineWidth = 1.5;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 2.5, -bh * 0.32 - 4.6 + sting * 1.2); ctx.lineTo(d * 11, -bh * 0.32 - 6.4 - sting * 1.4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,90,150,.45)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 13, -bh * 0.12, 3.2, 1.8, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = C.edge; ctx.beginPath(); ctx.ellipse(0, -bh * 0.08, 2 + pulse, 1 + pulse * 1.5, 0, 0, TAU); ctx.fill();
    K.sheen(ctx, -1, -bh * 0.28, bw * 0.95, 0.55, 3.5, 4.5);
    ctx.restore();
  }

  // ---------------------------------------------------------------- bog backdrop
  BOG.farShape = (ctx, w, h, t, layer, col) => {
    const r = K.rand(layer * 59 + 3);
    ctx.strokeStyle = rgb(col); ctx.lineCap = 'round';
    // gnarled dead trees rising from the murk
    for (let i = 0; i < 2 + layer; i++) {
      const x = (i + 0.3 + r() * 0.4) / (2 + layer) * w, tw = (layer ? 9 : 14) + r() * 6, top = h * (0.15 + r() * 0.35);
      ctx.beginPath(); ctx.moveTo(x - tw * 1.8, h + 4); ctx.quadraticCurveTo(x - tw, h * 0.8, x - tw * 0.6, top + 30);
      ctx.quadraticCurveTo(x - tw * 0.2, top, x + tw * 0.3, top - 6); ctx.quadraticCurveTo(x + tw * 0.4, top + 30, x + tw * 0.7, h * 0.8);
      ctx.quadraticCurveTo(x + tw, h * 0.92, x + tw * 2, h + 4); ctx.fill();
      for (let b = 0; b < 3; b++) {
        const by = top + 20 + b * 40 + r() * 20, d = b % 2 ? 1 : -1, bl = 25 + r() * 30;
        ctx.lineWidth = tw * 0.45 - b; ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x + d * bl * 0.6, by - 6, x + d * bl, by - 22 - r() * 12); ctx.stroke();
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + d * bl, by - 22); ctx.lineTo(x + d * bl, by + 10 + r() * 20); ctx.stroke(); // dangling moss
      }
    }
    // hanging root curtains from above
    for (let i = 0; i < 6 + layer * 3; i++) {
      const x = r() * w, len = h * (0.1 + r() * 0.25), sw = Math.sin(t * 0.6 + i) * 3;
      ctx.lineWidth = 2 + r() * 3; ctx.beginPath(); ctx.moveTo(x, -4); ctx.quadraticCurveTo(x + 6, len * 0.5, x + sw, len); ctx.stroke();
    }
    // reeds at the bottom
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const x = r() * w, hh = 30 + r() * 50; ctx.beginPath(); ctx.moveTo(x, h + 2); ctx.quadraticCurveTo(x + 2, h - hh * 0.5, x + 6 * Math.sin(t + i), h - hh); ctx.stroke(); }
  };
  BOG.wallDeco = (ctx, side, edge, w, h, t) => {
    const r = K.rand(side < 0 ? 71 : 83);
    // mossy clods
    for (let y = -10; y < h + 20; y += 22 + r() * 16) {
      const x = edge(y) + side * (8 + r() * 26), rr = 9 + r() * 9;
      ctx.fillStyle = K.rg(ctx, x - rr * 0.3, y - rr * 0.4, rr * 1.3, [rgb(lift(BOG.wall, 22)), rgb(BOG.wall), rgb(BOG.wallIn)]);
      ctx.beginPath(); ctx.ellipse(x, y, rr * 1.2, rr * 0.8, r() - 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb([70, 96, 30], 0.55);
      ctx.beginPath(); ctx.ellipse(x - rr * 0.2, y - rr * 0.5, rr * 0.8, rr * 0.3, 0, 0, TAU); ctx.fill();
    }
    // slimy roots snaking down the wall, lit along their tops
    for (let k = 0; k < 3; k++) {
      const d0 = 6 + k * 11, ph = r() * 6, pts = [];
      for (let y = -10; y <= h + 10; y += 16) pts.push([edge(y) + side * (d0 + Math.sin(y * 0.03 + ph) * 8), y]);
      const line = () => { ctx.beginPath(); pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
      line(); ctx.strokeStyle = '#2a2410'; ctx.lineWidth = 6 - k; ctx.stroke();
      line(); ctx.strokeStyle = '#5c4a22'; ctx.lineWidth = 3.6 - k * 0.8; ctx.stroke();
      line(); ctx.strokeStyle = rgb(BOG.rim, 0.28); ctx.lineWidth = 1; ctx.stroke();
    }
    // glowing toxic warts
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) {
      const y = r() * h, x = edge(y) + side * (5 + r() * 30), a = 0.5 + 0.3 * Math.sin(t * 2 + k);
      ctx.fillStyle = K.rg(ctx, x, y, 7, [rgb([200, 255, 80], a), rgb([120, 200, 40], 0)]); ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb([230, 255, 150], a); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  // low green murk banks
  function murk(ctx, w, h, t, y0, a = 0.35) {
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const y = y0 + k * 18, off = Math.sin(t * 0.4 + k) * 20;
      ctx.fillStyle = K.lg(ctx, 0, y - 30, 0, y + 30, [`rgba(150,190,60,0)`, `rgba(140,180,60,${a * (0.6 - k * 0.15)})`, `rgba(150,190,60,0)`]);
      ctx.beginPath(); ctx.moveTo(0, y + 30);
      for (let x = 0; x <= w; x += w / 6) ctx.lineTo(x, y - 8 + Math.sin(x * 0.03 + t * 0.6 + k * 2) * 8 + off * 0.1);
      ctx.lineTo(w, y + 30); ctx.fill();
    }
    ctx.restore();
  }

  // glowing bracket fungus stuck to a wall
  function fungus(ctx, x, y, d, s, t) {
    K.glow(ctx, x + d * 8 * s, y, 22 * s, [190, 255, 70], 0.3 + 0.08 * Math.sin(t * 2 + y));
    for (const [oy, w2, h2] of [[0, 12, 5], [8, 9, 4], [-7, 7, 3.2]]) {
      const cx = x + d * w2 * 0.6 * s, cy = y + oy * s;
      ctx.fillStyle = K.lg(ctx, 0, cy - h2 * s, 0, cy + h2 * s, ['#efff9a', '#9ad83a', '#4a6a14']);
      ctx.beginPath(); ctx.ellipse(cx, cy, w2 * s, h2 * s, 0, Math.PI, 0); ctx.quadraticCurveTo(cx, cy + h2 * 0.9 * s, cx - w2 * s, cy); ctx.fill();
      ctx.strokeStyle = '#3c5a10'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,220,.6)'; ctx.beginPath(); ctx.ellipse(cx, cy, w2 * 0.7 * s, h2 * 0.6 * s, 0, 3.5, 4.6); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- Gas Vent
  const GAS_T = 3;
  function gasVent(ctx, x, y, s, t, ph = 0, rise = 1) {
    const p = mod(t + ph, GAS_T);
    const tell = smooth(1.0, 1.55, p) * (1 - smooth(1.6, 1.75, p));
    const belch = smooth(1.55, 1.7, p) * (1 - smooth(2.4, 2.75, p));
    const shake = tell * Math.sin(t * 60) * 1.4;
    // the column: puffs born through the belch, rising, swelling and fading
    const puffs = [];
    for (let k = 0; k < 18; k++) {
      const e = 1.58 + k * 0.055, age = mod(p - e, GAS_T);
      if (age > 1.35) continue;
      const v = age / 1.35, py = y - 16 * s - (age * 150 + age * age * 70) * s * rise;
      const sw = Math.sin(k * 2.1) * (3 + age * 34) + Math.sin(t * 2 + k) * 3 * age;
      puffs.push([x + sw * s, py, (9 + age * 30 + (k % 3) * 3) * s, Math.min(1, (1 - v) * 1.6) ** 1.1, k]);
    }
    // idle wisps
    for (let k = 0; k < 3; k++) {
      const age = mod(t * 0.7 + k / 3, 1);
      puffs.push([x + Math.sin(k * 3 + t) * 4 * s, y - 16 * s - age * 34 * s, (3 + age * 8) * s, 0.4 * (1 - age) * (1 - belch), 20 + k]);
    }
    if (belch > 0.05) {
      K.danger(ctx, x, y - 50 * s, 60 * s, 0.25 * belch);
    }
    K.glow(ctx, x, y - 16 * s, (30 + 30 * tell) * s, [190, 255, 70], 0.25 + 0.35 * tell + 0.2 * belch);
    // vent mound
    ctx.save(); ctx.translate(x + shake, y); ctx.scale(s * (1 + tell * 0.08), s * (1 + tell * 0.12)); ctx.lineJoin = 'round';
    const mound = () => { ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-20, -4, -13, -14); ctx.quadraticCurveTo(0, -19, 13, -14); ctx.quadraticCurveTo(20, -4, 26, 2); ctx.closePath(); };
    mound(); ctx.fillStyle = K.lg(ctx, -10, -18, 6, 4, ['#8a8236', '#5a5420', '#2c2a0e']); ctx.fill();
    ctx.save(); mound(); ctx.clip();
    // warts and cracked crust
    for (const [wx, wy, wr] of [[-15, -5, 3.2], [-6, -3, 2.2], [9, -6, 2.8], [17, -1, 2], [0, -9, 1.8]]) {
      ctx.fillStyle = K.rg(ctx, wx - wr * 0.4, wy - wr * 0.4, wr * 1.3, ['#b4ac54', '#6c6426', '#3c380f']); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40,38,10,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-11, -6); ctx.lineTo(-12, -11); ctx.moveTo(12, -12); ctx.lineTo(10, -5); ctx.lineTo(16, 0); ctx.stroke();
    // lime slime dribbling down from the lip
    ctx.fillStyle = K.lg(ctx, 0, -16, 0, 0, ['#d6ff6a', '#88c82a']);
    ctx.beginPath(); ctx.moveTo(-11, -15);
    for (const [dx, dl] of [[-8, 8 + tell * 3], [-3, 4], [3, 11 + tell * 4], [8, 5]]) { ctx.quadraticCurveTo(dx - 2, -14, dx - 1.5, -14 + dl); ctx.arc(dx, -14 + dl, 1.5, Math.PI, 0, true); ctx.quadraticCurveTo(dx + 2, -14, dx + 3, -15); }
    ctx.lineTo(11, -15); ctx.closePath(); ctx.fill();
    ctx.restore();
    mound(); ctx.strokeStyle = '#2c2a0c'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = 'rgba(230,255,170,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-22, -3); ctx.quadraticCurveTo(-18, -9, -13, -14); ctx.stroke();
    // the glowing throat, brighter as it charges
    ctx.fillStyle = K.rg(ctx, 0, -15, 11, ['#f8ffc0', '#b8ff3a', '#4a7a10']); ctx.beginPath(); ctx.ellipse(0, -15, 10, 3.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3c4410'; ctx.lineWidth = 1.2; ctx.stroke();
    // bubbles swelling and popping in the throat
    for (let k = 0; k < 3; k++) {
      const u = mod(t * (1.4 + tell * 3) + k / 3, 1), bx = -5 + k * 5, br = u * (2.5 + tell * 3);
      ctx.fillStyle = `rgba(210,255,110,${0.9 - u * 0.4})`; ctx.beginPath(); ctx.arc(bx, -16 - br * 0.5, br, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,220,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(bx, -16 - br * 0.5, br * 0.7, 3.6, 4.6); ctx.stroke();
    }
    ctx.restore();
    // gas puffs: a darker olive underside and a sickly lit top, glossy and toxic, drawn back to front
    puffs.sort((a, b) => a[1] - b[1]);
    for (const [px, py, r, a, k] of puffs) {
      if (a <= 0.02) continue;
      ctx.fillStyle = K.rg(ctx, px, py + r * 0.15, r, [[0, `rgba(104,150,30,${a * 0.85})`], [0.75, `rgba(84,126,22,${a * 0.7})`], [1, 'rgba(70,110,20,0)']]);
      ctx.beginPath(); ctx.arc(px, py + r * 0.15, r, 0, TAU); ctx.fill();
      ctx.fillStyle = K.rg(ctx, px - r * 0.25, py - r * 0.3, r * 0.8, [`rgba(230,255,150,${a * 0.9})`, `rgba(176,238,64,${a * 0.65})`, 'rgba(150,220,50,0)']);
      ctx.beginPath(); ctx.arc(px - r * 0.1, py - r * 0.12, r * 0.8, 0, TAU); ctx.fill();
      if (k < 20 && r > 12 * s) { ctx.strokeStyle = `rgba(250,255,210,${a * 0.55})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px - r * 0.1, py - r * 0.1, r * 0.55, 3.5, 4.6); ctx.stroke(); }
    }
    // toxic sparkles inside the column
    if (belch > 0.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 8; k++) {
        const u = mod(t * 0.9 + k / 8, 1), px = x + Math.sin(k * 2.7 + t) * (8 + u * 30) * s, py = y - (20 + u * 150) * s * rise;
        ctx.fillStyle = `rgba(230,255,140,${belch * (1 - u) * 0.8})`; ctx.beginPath(); ctx.arc(px, py, 1.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  // acid bubbles popping on a bog pool
  function acidBubbles(ctx, cx, y, rx, t) {
    for (let k = 0; k < 3; k++) {
      const u = mod(t * 0.9 + k * 0.37, 1), bx = cx + (k - 1) * rx * 0.5, r = 1 + u * 3;
      if (u < 0.85) { ctx.fillStyle = `rgba(210,255,110,.85)`; ctx.beginPath(); ctx.arc(bx, y - 2 - r * 0.6, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,230,.8)'; ctx.beginPath(); ctx.arc(bx - r * 0.35, y - 2 - r, 0.6, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(220,255,140,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, y - 4, 4, 3.6, 5.8); ctx.stroke(); }
    }
  }

  // ---------------------------------------------------------------- Snapper Plant
  const SNP_T = 3.2;
  function snapState(t, ph) {
    const p = mod(t + ph, SNP_T);
    const tell = smooth(1.1, 1.6, p) * (1 - smooth(1.65, 1.75, p));
    const lunge = smooth(1.65, 1.9, p) * (1 - smooth(2.35, 3.1, p));
    // jaws: lazily ajar, gape wide in the tell, still open as it flies, SNAP shut at full reach, then slowly part
    const gape = lerp(0.22 + 0.06 * Math.sin(t * 3), 1, tell) * (1 - smooth(1.86, 1.94, p)) + smooth(2.6, 3.1, p) * 0.22 * (p < 3.15 ? 1 : 0);
    return { p, tell, lunge, gape: clamp(gape, 0, 1) };
  }
  function snapperHead(ctx, s, t, gape, tell, lunging) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const a = 0.1 + gape * 0.62, shake = tell * Math.sin(t * 55) * 0.05;
    const lobe = (up) => {
      const k = up ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(-3, 0);
      ctx.bezierCurveTo(2, k * 20, 24, k * 22, 33, k * 2);
      ctx.lineTo(-3, k * 1); ctx.closePath();
    };
    // mouth interior between the lobes
    ctx.fillStyle = K.rg(ctx, 10, 0, 26 * (0.3 + gape), ['#ff8aa0', '#c8203e', '#5a0818']);
    ctx.beginPath(); ctx.moveTo(-2, 0);
    ctx.lineTo(Math.cos(-a) * 33, Math.sin(-a) * 33); ctx.quadraticCurveTo(40, 0, Math.cos(a) * 33, Math.sin(a) * 33); ctx.closePath(); ctx.fill();
    // a drip of drool
    ctx.fillStyle = 'rgba(210,255,120,.8)'; ctx.beginPath(); ctx.ellipse(22, Math.sin(a) * 18 + 4 + Math.sin(t * 3) * 1.5, 1.6, 3.2, 0, 0, TAU); ctx.fill();
    for (const up of [false, true]) {
      ctx.save(); ctx.rotate((up ? -a : a) + shake);
      const k = up ? -1 : 1;
      // teeth along the lip, pointing at the other jaw
      ctx.fillStyle = '#fbf5d0'; ctx.strokeStyle = '#9a8a40'; ctx.lineWidth = 0.6;
      for (let i = 0; i < 6; i++) {
        const tx = 4 + i * 4.8; ctx.beginPath(); ctx.moveTo(tx - 1.8, k * 1); ctx.lineTo(tx + 0.8, -k * (4.5 + (i % 2) * 1.6)); ctx.lineTo(tx + 2, k * 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      lobe(up);
      ctx.fillStyle = K.lg(ctx, 0, k * 22, 0, 0, up ? ['#c8f25a', '#6cb22c', '#3f7a1c'] : ['#3f7a1c', '#5aa024', '#8cd03c']); ctx.fill();
      ctx.save(); lobe(up); ctx.clip();
      // red inner lining showing along the lip, veins, and spots
      ctx.fillStyle = K.lg(ctx, 0, k * 6, 0, 0, ['rgba(232,64,90,0)', 'rgba(232,64,90,.95)']); ctx.fillRect(-4, Math.min(0, k * 6), 40, 6);
      ctx.strokeStyle = 'rgba(40,90,16,.55)'; ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8 + i * 6, k * (16 - i * 2), 14 + i * 5, k * 4); ctx.stroke(); }
      ctx.fillStyle = 'rgba(150,40,90,.55)';
      for (const [sx, sy, sr] of [[10, 12, 2.2], [19, 13, 1.8], [26, 8, 1.4], [6, 7, 1.3]]) { ctx.beginPath(); ctx.arc(sx, k * sy, sr, 0, TAU); ctx.fill(); }
      ctx.restore();
      lobe(up); ctx.strokeStyle = '#2a5612'; ctx.lineWidth = 1.3; ctx.stroke();
      // bristles along the outer edge
      ctx.strokeStyle = '#a8e050'; ctx.lineWidth = 1.1;
      for (let i = 0; i < 6; i++) {
        const u = 0.25 + i * 0.13, bx = lerp(4, 31, u), by = k * (17 * Math.sin(u * Math.PI) + 2 * (1 - u));
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 3, by + k * 5.5); ctx.stroke();
      }
      if (up) {
        K.sheen(ctx, 14, -6, 16, 0.45, 3.6, 4.7);
        K.eyes(ctx, 12, -15, 6, 3.9, tell > 0.3 || lunging ? '#ff4a4a' : '#ffd23a', 0.6, Math.max(tell, lunging ? 1 : 0.25));
      }
      ctx.restore();
    }
  }
  // the whole plant: anchored at the wall (ax, ay), reaching inward by up to `reach`
  function snapper(ctx, ax, ay, side, reach, s, t, ph = 0) {
    const { tell, lunge, gape } = snapState(t, ph), d = -side;
    const pull = tell * 10 * s, sway = Math.sin(t * 1.6 + ph) * 5 * s * (1 - lunge);
    const hx = ax + d * (40 * s - pull + lunge * (reach - 14 * s)), hy = ay + sway - 14 * s * (1 - lunge) + Math.sin(t * 50) * tell * 1.5;
    K.danger(ctx, hx + d * 16 * s, hy, (36 + 14 * lunge) * s, 0.2 + 0.25 * tell + 0.2 * lunge);
    // leaves fanning from the root
    for (const [an, ln] of [[-0.9, 26], [0.75, 24], [-0.25, 20]]) {
      ctx.save(); ctx.translate(ax, ay + 6 * s); ctx.scale(d * s, s); ctx.rotate(an + Math.sin(t * 1.3 + an) * 0.06);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ln * 0.5, -ln * 0.32, ln, 0); ctx.quadraticCurveTo(ln * 0.5, ln * 0.32, 0, 0); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, 0, -8, 0, 8, ['#9ad84a', '#3e7a1c']); ctx.fill(); ctx.strokeStyle = '#2a5612'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(ln * 0.85, 0); ctx.stroke();
      ctx.restore();
    }
    // the stalk: coiled like a spring at rest, pulled straight by the lunge
    // coiled: a loop and a half of spring hanging beside the root; lunging: pulled into a straight whip
    const N = 22, pts = [], cr = 12 * s, cx = ax + d * cr, cy = ay + 12 * s;
    for (let i = 0; i <= N; i++) {
      const v = i / N, th = Math.PI + v * TAU * 1.25, rr = cr * (1 - 0.25 * v) * (1 + tell * 0.15);
      let px = cx + d * Math.cos(th) * rr, py = cy + Math.sin(th) * rr;
      const tw = v ** 3; px = lerp(px, hx, tw); py = lerp(py, hy, tw);
      const sx2 = lerp(ax, hx, v), sy2 = lerp(ay, hy, v) + Math.sin(v * Math.PI) * 5 * s;
      pts.push([lerp(px, sx2, lunge), lerp(py, sy2, lunge)]);
    }
    for (const [lw, c] of [[7.4, '#244c10'], [5.2, '#4c8c22'], [2, '#9ad84a']]) {
      for (let i = 0; i < N; i++) {
        const v = i / N; ctx.strokeStyle = c; ctx.lineWidth = lw * s * (1.1 - v * 0.45); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1] - (c === '#9ad84a' ? 1.2 * s : 0)); ctx.lineTo(pts[i + 1][0], pts[i + 1][1] - (c === '#9ad84a' ? 1.2 * s : 0)); ctx.stroke();
      }
    }
    // thorns on the stalk
    ctx.fillStyle = '#d6e890';
    for (let i = 3; i < N; i += 4) { const [px, py] = pts[i]; ctx.beginPath(); ctx.moveTo(px - 2 * s, py - 2 * s); ctx.lineTo(px + d * 2 * s, py - 6 * s); ctx.lineTo(px + 2 * s, py - 1.5 * s); ctx.closePath(); ctx.fill(); }
    // head, facing inward
    ctx.save(); ctx.translate(hx, hy); ctx.scale(d * s * 1.05, s * 1.05);
    ctx.rotate(-0.08 * (1 - lunge) + Math.sin(t * 1.6 + ph) * 0.06 * (1 - lunge));
    snapperHead(ctx, s, t, gape, tell, lunge > 0.6);
    ctx.restore();
    // SNAP: a burst of speed lines at the moment the jaws slam
    const p = mod(t + ph, SNP_T), k = (p - 1.9) / 0.3;
    if (k > 0 && k < 1) {
      ctx.save(); ctx.strokeStyle = `rgba(255,255,220,${0.8 * (1 - k)})`; ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i++) { const an = -1 + i * 0.4, r0 = (34 + k * 10) * s, r1 = r0 + 8 * s; const cx = hx + d * 34 * s; ctx.beginPath(); ctx.moveTo(cx + d * Math.cos(an) * r0 * 0.5, hy + Math.sin(an) * r0 * 0.7); ctx.lineTo(cx + d * Math.cos(an) * r1 * 0.6, hy + Math.sin(an) * r1 * 0.85); ctx.stroke(); }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- registrations
  PV.obstacles.piranha = (ctx, w, h, t) => {
    const sh = K.shaft(ctx, w, h, t, LAG);
    caustics(ctx, w, h, t);
    moss(ctx, sh, -1, [[40, 22]], t, LAG, ['#2f7a5a', '#4aa070', '#1c4a3a']);
    moss(ctx, sh, 1, [[70, 18]], t, LAG, ['#2f7a5a', '#4aa070', '#1c4a3a']);
    K.rocket(ctx, w * 0.5, h * 0.86, 0.8, t);
    piranhaHazard(ctx, LAG, sh, h * 0.66, 82, t, 1);
    K.motes(ctx, w, h, t, 'bubble', [170, 255, 245], 14);
  };

  PV.obstacles.jelly = (ctx, w, h, t) => {
    const sh = K.shaft(ctx, w, h, t, LAG);
    caustics(ctx, w, h, t);
    moss(ctx, sh, -1, [[60, 26], [230, 18]], t, LAG, ['#2f7a5a', '#4aa070', '#1c4a3a']);
    moss(ctx, sh, 1, [[140, 22]], t, LAG, ['#2f7a5a', '#4aa070', '#1c4a3a']);
    jelly(ctx, w * 0.7, h * 0.2, 0.62, t, 1.7, 1);
    K.rocket(ctx, w * 0.74, h * 0.8, 0.8, t);
    jelly(ctx, w * 0.4, h * 0.36, 1, t, 0);
    K.motes(ctx, w, h, t, 'bubble', [170, 255, 245], 16);
  };

  PV.obstacles.gasvent = (ctx, w, h, t) => {
    const sh = K.shaft(ctx, w, h, t, BOG);
    murk(ctx, w, h, t, h * 0.85, 0.3);
    const y = h * 0.8, L = ledge(ctx, BOG, sh, -1, y, 104);
    K.rocket(ctx, w * 0.76, h * 0.55, 0.8, t);
    gasVent(ctx, L.ex + 54, y - 1, 1, t);
    moss(ctx, sh, 1, [[60, 24], [200, 18]], t, BOG, ['#5a7a22', '#8aac34', '#3a4a14']);
    K.motes(ctx, w, h, t, 'bubble', [200, 255, 110], 12);
  };

  PV.obstacles.snapper = (ctx, w, h, t) => {
    const sh = K.shaft(ctx, w, h, t, BOG);
    murk(ctx, w, h, t, h * 0.9, 0.3);
    moss(ctx, sh, 1, [[50, 26]], t, BOG, ['#5a7a22', '#8aac34', '#3a4a14']);
    const y = h * 0.48;
    K.rocket(ctx, w * 0.75, h * 0.6, 0.8, t);
    snapper(ctx, sh.L(y) - 4, y, -1, 112, 1, t);
    moss(ctx, sh, -1, [[y + 22, 20]], t, BOG, ['#5a7a22', '#8aac34', '#3a4a14']);
    K.motes(ctx, w, h, t, 'bubble', [200, 255, 110], 12);
  };

  PV.sections.lagoon = (ctx, w, h, t) => {
    const sh = K.shaft(ctx, w, h, t, LAG);
    caustics(ctx, w, h, t, 0.08);
    moss(ctx, sh, -1, [[30, 26], [190, 20], [400, 24]], t, LAG, ['#2f7a5a', '#4aa070', '#1c4a3a']);
    moss(ctx, sh, 1, [[110, 22], [250, 26], [440, 18]], t, LAG, ['#2f7a5a', '#4aa070', '#1c4a3a']);
    // glowing anemones on little shelves
    for (const [side, y] of [[-1, 120], [1, 340]]) {
      const ex = side < 0 ? sh.L(y) : sh.R(y);
      for (let k = 0; k < 3; k++) {
        const x = ex - side * (2 + k * 7), yy = y + k * 4 - 2, sz = 5 - k;
        K.glow(ctx, x, yy, 14, [255, 140, 200], 0.35);
        ctx.strokeStyle = '#ff8fd0'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        for (let j = 0; j < 7; j++) {
          const an = -Math.PI * (0.1 + 0.8 * j / 6) + Math.sin(t * 2 + j + k) * 0.12, l = sz * 1.6;
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + Math.cos(an) * l * 0.6, yy + Math.sin(an) * l * 0.4, x + Math.cos(an) * l, yy + Math.sin(an) * l); ctx.stroke();
          ctx.fillStyle = '#ffe0f4'; ctx.beginPath(); ctx.arc(x + Math.cos(an) * l, yy + Math.sin(an) * l, 0.9, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = K.rg(ctx, x - 1, yy - 1, sz, ['#ffd6ef', '#ff6ab8', '#9a2a72']); ctx.beginPath(); ctx.ellipse(x, yy + 1, sz * 0.7, sz * 0.55, 0, 0, TAU); ctx.fill();
      }
    }
    jelly(ctx, w * 0.62, h * 0.16, 0.72, t, 0.6);
    jelly(ctx, w * 0.3, h * 0.08, 0.42, t, 2.4, 1);
    piranhaHazard(ctx, LAG, sh, h * 0.56, 64, t, 0.8, 0.4);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    K.motes(ctx, w, h, t, 'bubble', [170, 255, 245], 22);
  };

  PV.sections.bog = (ctx, w, h, t) => {
    const sh = K.shaft(ctx, w, h, t, BOG);
    murk(ctx, w, h, t, h * 0.62, 0.25);
    // a bubbling acid pool on a ledge (set dressing), dribbling over the lip
    const A = ledge(ctx, BOG, sh, -1, h * 0.86, 58);
    pool(ctx, BOG, A.mid + 2, h * 0.86, 20, t, [[0, '#f0ffb0'], [0.5, '#a8e83a'], [1, '#4c7a14']], 0.3);
    acidBubbles(ctx, A.mid + 2, h * 0.86, 20, t);
    spill(ctx, A.tip - 3, h * 0.86 + 3, 40, t, [190, 255, 80]);
    // gas vent on a right-hand ledge
    const gy = h * 0.6, B = ledge(ctx, BOG, sh, 1, gy, 80);
    gasVent(ctx, B.ex - 40, gy - 1, 0.8, t, 0.5, 1.1);
    // snapper lurking on the left wall higher up
    const sy = h * 0.3;
    snapper(ctx, sh.L(sy) - 4, sy, -1, 96, 0.8, t, 1.1);
    moss(ctx, sh, -1, [[40, 24], [sy + 24, 20], [300, 26]], t, BOG, ['#5a7a22', '#8aac34', '#3a4a14']);
    moss(ctx, sh, 1, [[80, 22], [200, 26], [440, 20]], t, BOG, ['#5a7a22', '#8aac34', '#3a4a14']);
    fungus(ctx, sh.R(400) + 2, 400, -1, 0.9, t); fungus(ctx, sh.L(210) - 2, 210, 1, 0.8, t); fungus(ctx, sh.R(110) + 2, 110, -1, 0.7, t);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    murk(ctx, w, h, t, h * 0.95, 0.35);
    K.motes(ctx, w, h, t, 'bubble', [200, 255, 110], 20);
  };
})();
