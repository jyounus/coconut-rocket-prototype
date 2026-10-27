// "Dusk painted": a painting kit for Coconut Island. Ground (sea, surf, sand, grass, creek, road) is painted per pixel
// from soft masks + value noise (grain, ripples, brush-stroke grass, tonal washes, ragged noisy edges); props and
// canopy masses are painted on top with canvas brush passes (leaf dabs, straw strokes, wood grain, rim light).
// Everything works in "map px" (CSS px of the phone screen here) through a scale S, so the same functions could paint
// the whole 1640x2480 island in tiles later. No black outlines anywhere: edges are a darker hue of the object's colour.
(() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const rand = seed => { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1000003) / 1000003; }; };
  // ---- noise ----
  const hash = (x, y, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const vnoise = (x, y, s = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, s = 0, o = 4) => { let t = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { t += a * vnoise(x, y, s + i * 17); n += a; x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; a *= 0.5; } return t / n; };
  // ---- geometry ----
  function resample(pts, step = 2) { // smooth (midpoint quadratics) then resample evenly
    const dense = [pts[0]], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let prev = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const c = pts[i], e = i === pts.length - 2 ? pts[i + 1] : mid(pts[i], pts[i + 1]);
      for (let k = 1; k <= 20; k++) { const u = k / 20, v = 1 - u; dense.push([v * v * prev[0] + 2 * v * u * c[0] + u * u * e[0], v * v * prev[1] + 2 * v * u * c[1] + u * u * e[1]]); }
      prev = e;
    }
    if (pts.length === 2) dense.push(pts[1]);
    const out = [dense[0]]; let acc = 0;
    for (let i = 1; i < dense.length; i++) { const a = dense[i - 1], b = dense[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += d; while (acc >= step) { acc -= step; const t = 1 - acc / d; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    out.push(dense[dense.length - 1]); return out;
  }
  const normalAt = (p, i) => { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const tangentAt = (p, i) => { const n = normalAt(p, i); return [n[1], -n[0]]; };
  const pathOf = (ctx, pts, close) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); };
  function ribbonPath(ctx, pts, w) { // polygon around a centre line with width w(u)
    const L = [], R = [];
    pts.forEach((p, i) => { const n = normalAt(pts, i), ww = w(i / (pts.length - 1)) / 2; L.push([p[0] + n[0] * ww, p[1] + n[1] * ww]); R.push([p[0] - n[0] * ww, p[1] - n[1] * ww]); });
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath();
  }
  const lg = (ctx, x0, y0, x1, y1, st) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, typeof c === 'string' ? c : rgb(c, c[3] ?? 1))); return g; };
  const rg = (ctx, x, y, r, st, fx = x, fy = y) => { const g = ctx.createRadialGradient(fx, fy, 0, x, y, r); st.forEach(([o, c]) => g.addColorStop(o, typeof c === 'string' ? c : rgb(c, c[3] ?? 1))); return g; };
  function glow(ctx, x, y, r, c, a = 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg(ctx, x, y, r, [[0, [...c, a]], [0.25, [...c, a * 0.5]], [0.6, [...c, a * 0.14]], [1, [...c, 0]]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  function blob(ctx, x, y, rx, ry, a = 0.35, col = [10, 24, 24]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
    ctx.fillStyle = rg(ctx, 0, 0, 1, [[0, [...col, a]], [0.5, [...col, a * 0.6]], [1, [...col, 0]]]);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ---- palette: muted deep teal-green base, warm dusk light (the game's jungle bgTop/bgBot are 92,128,102 / 44,72,58) ----
  const PAL = {
    light: [255, 196, 128], lightDir: [-0.62, -0.68, 0.55], // warm low sun from the upper left
    ambient: [70, 110, 120],                                 // cool sky fill in the shade
    grass: [[22, 44, 42], [36, 64, 54], [58, 86, 62], [102, 110, 70]],
    sand: [[112, 92, 76], [156, 128, 98], [192, 160, 116]], wetSand: [96, 86, 76],
    sea: [[14, 34, 46], [24, 62, 72], [52, 104, 104], [92, 140, 124]], foam: [214, 214, 188],
    creek: [[20, 50, 56], [44, 92, 94], [96, 140, 126]],
    road: [[112, 82, 58], [156, 118, 80], [196, 156, 104]],
    leaf: [[12, 28, 32], [20, 44, 44], [34, 68, 56], [62, 96, 64], [112, 124, 74], [186, 160, 98]],
    rim: [255, 190, 116], fire: [255, 150, 60], gold: [255, 200, 90],
    wood: [[60, 38, 26], [104, 70, 44], [150, 106, 66], [196, 150, 96]],
    straw: [[86, 66, 40], [140, 108, 62], [196, 158, 92], [232, 196, 126]],
    stone: [[46, 52, 54], [82, 86, 82], [124, 122, 110], [170, 162, 140]],
  };
  const ramp = (cols, t) => { t = clamp(t) * (cols.length - 1); const i = Math.min(cols.length - 2, Math.floor(t)); return mix(cols[i], cols[i + 1], t - i); };

  // ---- masks (device-res alpha, optionally blurred) ----
  function makeMask(W, H, S, draw, blur = 0) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.setTransform(S, 0, 0, S, 0, 0); if (blur) x.filter = `blur(${blur * S}px)`;
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; draw(x);
    const d = x.getImageData(0, 0, W, H).data, out = new Float32Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255;
    return out;
  }

  // ---------------- CANOPY: one big textured jungle mass ----------------
  // domes: [[x, y, r], ...] in map px, only used to shape the mass. The union is blurred into a height field so the
  // whole mass is lit as ONE volume (top-left lit, bottom-right in deep teal shade), with the domes adding gentle
  // lumps. Over that base (painted per pixel) go leaf-cluster brush dabs coloured from the same lighting, warm rim
  // dabs on the silhouette that faces the light, and ragged leaf tips round the edge.
  function canopy(ctx, domes, seed, o = {}) {
    const S = ctx.getTransform().a, R = rand(seed), L = PAL.lightDir, Ln = Math.hypot(...L), lx = L[0] / Ln, ly = L[1] / Ln, lz = L[2] / Ln;
    const pad = 14, bx0 = Math.min(...domes.map(d => d[0] - d[2])) - pad, by0 = Math.min(...domes.map(d => d[1] - d[2])) - pad;
    const bx1 = Math.max(...domes.map(d => d[0] + d[2])) + pad, by1 = Math.max(...domes.map(d => d[1] + d[2])) + pad;
    const W = Math.ceil((bx1 - bx0) * S), H = Math.ceil((by1 - by0) * S);
    // lumpy union outline
    const shape = c => { for (const [x, y, r] of domes) { c.beginPath(); const n = 14 + (r / 3 | 0), ph = hash(x | 0, y | 0, seed) * TAU; for (let i = 0; i <= n; i++) { const a = ph + i / n * TAU, rr = r * (0.94 + 0.07 * Math.sin(a * 5 + ph) + 0.05 * Math.sin(a * 11 + ph * 2)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.fill(); } };
    const field = blur => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.setTransform(S, 0, 0, S, -bx0 * S, -by0 * S); if (blur) x.filter = `blur(${blur * S}px)`; x.fillStyle = '#fff'; shape(x); const d = x.getImageData(0, 0, W, H).data, out = new Float32Array(W * H); for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255; return out; };
    const A = field(0), B = field(9), B2 = field(22);
    const at = (arr, mx, my) => { const x = clamp(Math.round((mx - bx0) * S), 1, W - 2), y = clamp(Math.round((my - by0) * S), 1, H - 2); return [arr, x, y]; };
    // lighting at a device pixel of the field
    const shadeXY = (x, y, mx, my) => {
      const i = y * W + x;
      let nx = -(B[i + 1] - B[i - 1]) * S * 7 - (B2[i + 1] - B2[i - 1]) * S * 9, ny = -(B[i + W] - B[i - W]) * S * 7 - (B2[i + W] - B2[i - W]) * S * 9;
      // dome lumps
      let best = 0, dnx = 0, dny = 0;
      for (const [cx, cy, r] of domes) { const dx = (mx - cx) / r, dy = (my - cy) / r, q = 1 - dx * dx - dy * dy; if (q > best) { best = q; dnx = dx; dny = dy; } }
      nx += dnx * 0.3; ny += dny * 0.3;
      const nl = Math.hypot(nx, ny, 1); nx /= nl; ny /= nl; const nz = 1 / nl;
      const lam = clamp(nx * lx + ny * ly + nz * lz);
      const ao = 0.45 + 0.55 * smooth(0.1, 0.9, B2[i]);
      return { s: clamp(lam * 1.4 - 0.32) * ao + 0.04, nx, ny, nz, edge: A[i] * (1 - smooth(0.55, 0.95, B[i])) };
    };
    // base painted per pixel
    const lay = document.createElement('canvas'); lay.width = W; lay.height = H; const lc = lay.getContext('2d');
    const img = lc.createImageData(W, H), px = img.data;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (A[i] < 0.01) continue;
      const mx = bx0 + x / S, my = by0 + y / S, sh = shadeXY(x, y, mx, my);
      const cl = fbm(mx / 7, my / 7, seed + 3, 3);
      let c = ramp(PAL.leaf, clamp(sh.s * 0.9 + (cl - 0.5) * 0.35));
      const rim = sh.edge * clamp((sh.nx * lx + sh.ny * ly) * 2.2);
      c = mix(c, PAL.rim, rim * 0.5);
      const o = i * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = A[i] * 255;
    }
    lc.putImageData(img, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lay, Math.round(bx0 * S), Math.round(by0 * S)); ctx.restore();
    const sampleShade = (mx, my) => { const x = clamp(Math.round((mx - bx0) * S), 1, W - 2), y = clamp(Math.round((my - by0) * S), 1, H - 2); return A[y * W + x] > 0.5 ? shadeXY(x, y, mx, my) : null; };
    // leaf-cluster brush dabs, back to front
    const dabs = [], area = domes.reduce((t, d) => t + d[2] * d[2] * 3.1, 0) * 0.75;
    for (let k = 0; k < area / 13; k++) {
      const d = domes[(R() * domes.length) | 0], a = R() * TAU, rr = Math.sqrt(R()) * d[2], cx = d[0] + Math.cos(a) * rr, cy = d[1] + Math.sin(a) * rr;
      const n = 4 + (R() * 6 | 0), sz = 2.1 + R() * 2.2, ang0 = R() * TAU;
      for (let j = 0; j < n; j++) { const aa = ang0 + j / n * TAU + R() * 0.5, dd = sz * (0.4 + R() * 0.9); dabs.push([cx + Math.cos(aa) * dd, cy + Math.sin(aa) * dd * 0.85, aa, sz * (0.7 + R() * 0.6), R()]); }
    }
    dabs.sort((p, q) => p[1] - q[1]);
    for (const [x, y, a, sz, rn] of dabs) {
      const sh = sampleShade(x, y); if (!sh) continue;
      const t = clamp(sh.s * 0.95 + (rn - 0.5) * 0.22 + 0.04);
      // a leaf: dark lower half, lit upper edge
      ctx.fillStyle = rgb(ramp(PAL.leaf, t * 0.45), 0.8);
      ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.7, sz, sz * 0.5, a, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(ramp(PAL.leaf, Math.min(1, t * 1.1 + 0.04)), 0.92);
      ctx.beginPath(); ctx.ellipse(x, y, sz * 0.9, sz * 0.36, a, 0, TAU); ctx.fill();
      if (t > 0.62 && rn < 0.4) { ctx.strokeStyle = rgb(mix(ramp(PAL.leaf, t), PAL.rim, 0.55), 0.6); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * sz * 0.7, y - Math.sin(a) * sz * 0.7); ctx.lineTo(x + Math.cos(a) * sz * 0.7, y + Math.sin(a) * sz * 0.7); ctx.stroke(); }
    }
    // ragged leaf tips and rim light around the silhouette
    for (const [x, y, r] of domes) for (let k = 0; k < r * 2.2; k++) {
      const a = R() * TAU, px = x + Math.cos(a) * r * 0.86, py = y + Math.sin(a) * r * 0.86;
      if (domes.some(([X, Y, RR]) => (X !== x || Y !== y) && Math.hypot(px - X, py - Y) < RR * 0.8)) continue;
      const f = Math.cos(a) * lx + Math.sin(a) * ly, len = 1.8 + R() * 2.4, tx = px + Math.cos(a) * len * 0.6, ty = py + Math.sin(a) * len * 0.6;
      ctx.fillStyle = rgb(ramp(PAL.leaf, clamp(0.2 + 0.6 * f)), 0.95);
      ctx.beginPath(); ctx.ellipse(tx, ty, len, len * 0.4, a + (R() - 0.5) * 0.9, 0, TAU); ctx.fill();
      if (f > 0.2) { ctx.fillStyle = rgb(mix(PAL.leaf[4], PAL.rim, 0.4 + 0.5 * f), 0.35 + 0.5 * f); ctx.beginPath(); ctx.ellipse(tx - Math.cos(a) * 1.2, ty - Math.sin(a) * 1.2, len * 0.7, len * 0.24, a + (R() - 0.5) * 0.9, 0, TAU); ctx.fill(); }
    }
  }
  // canopy shadow onto the ground (for the shadow mask)
  const canopyShadow = (ctx, domes, dx = 12, dy = 16) => { for (const [x, y, r] of domes) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r * 1.04, 0, TAU); ctx.fill(); } };

  // ---------------- PALM ----------------
  // base (bx, by) on the ground, crown (cx, cy); painted trunk with ring ridges and fibre, fronds with leaflet strokes
  function palm(ctx, bx, by, cx, cy, s, seed) {
    const R = rand(seed), mx = (bx + cx) / 2 + (by - cy) * 0.12, my = (by + cy) / 2;
    const pts = resample([[bx, by], [mx, my], [cx, cy]], 1.5), n = pts.length;
    // trunk body
    ribbonPath(ctx, pts, u => (5.6 - 2.4 * u) * s);
    ctx.fillStyle = lg(ctx, bx - 6 * s, 0, bx + 6 * s, 0, [[0, PAL.wood[3]], [0.4, PAL.wood[2]], [1, PAL.wood[0]]]); ctx.fill();
    // rings
    for (let i = 2; i < n - 2; i += 3) {
      const p = pts[i], nn = normalAt(pts, i), u = i / n, w = (5.6 - 2.4 * u) * s / 2, t = tangentAt(pts, i);
      ctx.strokeStyle = rgb(PAL.wood[0], 0.75); ctx.lineWidth = 0.9 * s; ctx.beginPath();
      ctx.moveTo(p[0] + nn[0] * w, p[1] + nn[1] * w); ctx.quadraticCurveTo(p[0] + t[0] * 1.2 * s, p[1] + t[1] * 1.2 * s, p[0] - nn[0] * w, p[1] - nn[1] * w); ctx.stroke();
      ctx.strokeStyle = rgb(mix(PAL.wood[3], PAL.rim, 0.4), 0.55); ctx.lineWidth = 0.6 * s; ctx.beginPath();
      ctx.moveTo(p[0] + nn[0] * w * 0.95, p[1] + nn[1] * w * 0.95 - 0.8 * s); ctx.lineTo(p[0] + nn[0] * w * 0.15, p[1] + nn[1] * w * 0.15 - 0.6 * s); ctx.stroke();
    }
    // rim light along the lit (left) edge
    ctx.strokeStyle = rgb(PAL.rim, 0.55); ctx.lineWidth = 0.8 * s; ctx.beginPath();
    pts.forEach((p, i) => { const nn = normalAt(pts, i), w = (5.6 - 2.4 * i / n) * s / 2 - 0.5 * s; const q = [p[0] + nn[0] * w, p[1] + nn[1] * w]; i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.stroke();
    // coconuts
    for (let k = 0; k < 3; k++) {
      const a = 0.6 + k * 0.9, x = cx + Math.cos(a) * 3.2 * s, y = cy + 2 * s + Math.sin(a) * 1.6 * s, r = 2.6 * s;
      ctx.fillStyle = rg(ctx, x, y, r, [[0, [150, 104, 60]], [0.7, [92, 60, 36]], [1, [58, 36, 24]]], x - r * 0.4, y - r * 0.4); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(PAL.rim, 0.5); ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); ctx.fill();
    }
    // fronds: back (dark) first, then front (lit). Each frond arcs up then hangs down; its leaflets are tapered
    // blades that droop under the spine, each a slightly different tone, with a warm edge on the lit fronds.
    const fr = [];
    for (let k = 0; k < 12; k++) fr.push({ a: k / 12 * TAU + (R() - 0.5) * 0.4, L: (22 + R() * 12) * s, droop: 0.5 + R() * 0.7, lift: 0.1 + R() * 0.25 });
    fr.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    for (const f of fr) {
      const back = Math.sin(f.a) < -0.25, dx = Math.cos(f.a), dy = Math.sin(f.a) * 0.6;
      const end = [cx + dx * f.L * 0.92, cy + dy * f.L + f.L * f.droop * 0.6], ctl = [cx + dx * f.L * 0.6, cy + dy * f.L * 0.6 - f.L * f.lift];
      const sp = []; for (let i = 0; i <= 28; i++) { const u = i / 28, v = 1 - u; sp.push([v * v * cx + 2 * v * u * ctl[0] + u * u * end[0], v * v * cy + 2 * v * u * ctl[1] + u * u * end[1]]); }
      const lit = clamp(-dx * 0.6 - dy * 0.8 + 0.4);
      for (let i = 2; i < sp.length; i++) {
        const u = i / 28, p = sp[i], t = [sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]], tl = Math.hypot(...t) || 1, tx = t[0] / tl, ty = t[1] / tl;
        const ll = (8 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7) + 1) * s;
        for (const side of [-1, 1]) {
          const nx = -ty * side, ny = tx * side, hang = 0.55 + 0.45 * u;
          const ex = p[0] + (nx * 0.75 + tx * 0.55) * ll, ey = p[1] + (ny * 0.75 + ty * 0.55) * ll + ll * hang;
          const upper = (ny < 0) ? 1 : 0.7, tone = (back ? 0.14 + 0.18 * lit : (0.24 + 0.5 * lit) * upper + 0.04) + (R() - 0.5) * 0.1;
          const c = ramp(PAL.leaf, clamp(tone)), w = 1.1 * s;
          ctx.fillStyle = rgb(c, 0.96); ctx.beginPath(); ctx.moveTo(p[0] - tx * w, p[1] - ty * w);
          ctx.quadraticCurveTo(p[0] + nx * ll * 0.55 - tx * w, p[1] + ny * ll * 0.55 - ty * w + ll * 0.2, ex, ey);
          ctx.quadraticCurveTo(p[0] + nx * ll * 0.45 + tx * w, p[1] + ny * ll * 0.45 + ty * w + ll * 0.25, p[0] + tx * w, p[1] + ty * w); ctx.closePath(); ctx.fill();
          if (!back && lit > 0.35 && upper === 1) { ctx.strokeStyle = rgb(PAL.rim, 0.35 * lit); ctx.lineWidth = 0.4 * s; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + nx * ll * 0.55, p[1] + ny * ll * 0.55 + ll * 0.2, ex, ey); ctx.stroke(); }
        }
      }
      ctx.strokeStyle = rgb(mix(ramp(PAL.leaf, back ? 0.3 : 0.5 + 0.3 * lit), PAL.straw[2], 0.25)); ctx.lineWidth = 0.9 * s; pathOf(ctx, sp); ctx.stroke();
    }
  }

  // ---------------- WOOD helpers ----------------
  // a plank/board rect with painted grain
  function plank(ctx, x, y, w, h, base, seed, vertical = false, lit = 0.5) {
    const R = rand(seed);
    ctx.fillStyle = vertical ? lg(ctx, x, 0, x + w, 0, [[0, mix(base, PAL.rim, 0.2 * lit)], [0.5, base], [1, mix(base, [20, 14, 12], 0.4)]])
      : lg(ctx, 0, y, 0, y + h, [[0, mix(base, PAL.rim, 0.25 * lit)], [0.5, base], [1, mix(base, [20, 14, 12], 0.45)]]);
    ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const len = vertical ? h : w, th = vertical ? w : h;
    for (let k = 0; k < th * 2.2; k++) {
      const o = R() * th, c = R() < 0.5 ? mix(base, [30, 18, 12], 0.5) : mix(base, PAL.rim, 0.3);
      ctx.strokeStyle = rgb(c, 0.25 + R() * 0.3); ctx.lineWidth = 0.25 + R() * 0.35; ctx.beginPath();
      const ph = R() * 9, amp = 0.3 + R() * 0.5;
      for (let i = 0; i <= 12; i++) { const a = i / 12 * len, b = o + Math.sin(a * 0.3 + ph) * amp; vertical ? (i ? ctx.lineTo(x + b, y + a) : ctx.moveTo(x + b, y + a)) : (i ? ctx.lineTo(x + a, y + b) : ctx.moveTo(x + a, y + b)); }
      ctx.stroke();
    }
    if (R() < 0.5) { const kx = vertical ? x + w / 2 : x + R() * w, ky = vertical ? y + R() * h : y + h / 2; ctx.fillStyle = rgb(mix(base, [30, 18, 12], 0.6), 0.6); ctx.beginPath(); ctx.ellipse(kx, ky, vertical ? th * 0.18 : 1.1, vertical ? 1.1 : th * 0.18, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ---------------- STILT HUT ----------------
  function hut(ctx, x, y, s, seed) { // x, y: centre of the floor platform front edge
    const R = rand(seed), W = 64 * s, D = 30 * s;
    // stilts (back two then front)
    const legs = [[-W * 0.42, -D * 0.6], [W * 0.42, -D * 0.6], [-W * 0.46, 0], [W * 0.1, 0], [W * 0.46, 0]];
    legs.forEach(([lx, ly], i) => plank(ctx, x + lx - 2 * s, y + ly, 4 * s, 34 * s - ly * 0.2, PAL.wood[i < 2 ? 1 : 2], seed + i, true, 0.8));
    // cross braces
    ctx.strokeStyle = rgb(PAL.wood[1]); ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(x - W * 0.46, y + 4 * s); ctx.lineTo(x + W * 0.1, y + 28 * s); ctx.moveTo(x + W * 0.1, y + 4 * s); ctx.lineTo(x + W * 0.46, y + 28 * s); ctx.stroke();
    // deck (seen from above at a tilt)
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - W * 0.56, y); ctx.lineTo(x - W * 0.5, y - D); ctx.lineTo(x + W * 0.5, y - D); ctx.lineTo(x + W * 0.56, y); ctx.closePath(); ctx.clip();
    for (let i = 0; i < 9; i++) plank(ctx, x - W * 0.6, y - D + i * D / 8.5, W * 1.2, D / 8.5 - 0.3 * s, mix(PAL.wood[2], PAL.wood[1], R() * 0.4), seed + 20 + i, false, 0.9);
    ctx.restore();
    plank(ctx, x - W * 0.56, y, W * 1.12, 4 * s, PAL.wood[1], seed + 40, false, 0.4); // deck front beam
    // walls
    const wx0 = x - W * 0.4, wx1 = x + W * 0.4, wy1 = y - D * 0.35, wy0 = wy1 - 26 * s;
    for (let i = 0, bw = 4.2 * s; wx0 + i * bw < wx1; i++) plank(ctx, wx0 + i * bw, wy0, bw - 0.4 * s, wy1 - wy0, mix(PAL.straw[2], PAL.wood[2], 0.5 + 0.3 * R()), seed + 60 + i, true, 1 - i / 16);
    // bamboo cross rails
    for (const yy of [wy0 + 3 * s, wy1 - 3 * s]) { ctx.fillStyle = lg(ctx, 0, yy - 1.2 * s, 0, yy + 1.2 * s, [[0, PAL.straw[3]], [1, PAL.straw[1]]]); ctx.fillRect(wx0 - 1 * s, yy - 1.2 * s, wx1 - wx0 + 2 * s, 2.4 * s); }
    // doorway with warm interior glow
    const dx = x - W * 0.12, dw = 13 * s, dh = 19 * s;
    ctx.fillStyle = lg(ctx, 0, wy1 - dh, 0, wy1, [[0, [120, 48, 18]], [0.5, [214, 110, 40]], [1, [255, 176, 80]]]);
    ctx.beginPath(); ctx.moveTo(dx - dw / 2, wy1); ctx.lineTo(dx - dw / 2, wy1 - dh + 4 * s); ctx.quadraticCurveTo(dx, wy1 - dh - 2 * s, dx + dw / 2, wy1 - dh + 4 * s); ctx.lineTo(dx + dw / 2, wy1); ctx.fill();
    // window with lantern
    const winx = x + W * 0.22, winy = wy0 + 9 * s;
    ctx.fillStyle = rg(ctx, winx, winy, 7 * s, [[0, [255, 214, 130]], [0.6, [230, 130, 50]], [1, [140, 60, 22]]]); ctx.fillRect(winx - 5.5 * s, winy - 5 * s, 11 * s, 10 * s);
    ctx.strokeStyle = rgb(PAL.wood[1]); ctx.lineWidth = 1.2 * s; ctx.strokeRect(winx - 5.5 * s, winy - 5 * s, 11 * s, 10 * s); ctx.beginPath(); ctx.moveTo(winx, winy - 5 * s); ctx.lineTo(winx, winy + 5 * s); ctx.stroke();
    // thatched roof: a big hip roof painted with straw strokes
    const rx0 = x - W * 0.62, rx1 = x + W * 0.62, ry1 = wy0 + 4 * s, peakY = wy0 - 34 * s;
    const roof = c => { c.beginPath(); c.moveTo(rx0, ry1); c.quadraticCurveTo(x - W * 0.42, ry1 - 16 * s, x - W * 0.14, peakY); c.lineTo(x + W * 0.14, peakY); c.quadraticCurveTo(x + W * 0.42, ry1 - 16 * s, rx1, ry1); c.quadraticCurveTo(x, ry1 + 7 * s, rx0, ry1); c.closePath(); };
    roof(ctx); ctx.fillStyle = lg(ctx, rx0, peakY, rx1, ry1, [[0, PAL.straw[3]], [0.45, PAL.straw[2]], [1, PAL.straw[0]]]); ctx.fill();
    ctx.save(); roof(ctx); ctx.clip();
    for (let k = 0; k < 1500; k++) { // straw strokes radiating down from the ridge
      const u = R(), v = Math.pow(R(), 0.8), topX = x + (u - 0.5) * W * 0.3, botX = x + (u - 0.5) * W * 1.32;
      const px = lerp(topX, botX, v), py = lerp(peakY, ry1 + 4 * s, v), dxs = (botX - topX) / (ry1 - peakY), len = 3 + R() * 5;
      const lit = clamp(0.75 - u * 0.75 + (R() - 0.5) * 0.3 - v * 0.15);
      ctx.strokeStyle = rgb(ramp(PAL.straw, lit), 0.5 + R() * 0.4); ctx.lineWidth = 0.35 + R() * 0.5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dxs * len * s, py + len * s); ctx.stroke();
    }
    // layer lines (thatch courses) with a shadow under each
    for (let i = 1; i < 4; i++) {
      const v = i / 4, yy = lerp(peakY, ry1, v);
      ctx.strokeStyle = rgb(PAL.straw[0], 0.55); ctx.lineWidth = 1.4 * s; ctx.beginPath();
      for (let j = 0; j <= 30; j++) { const u = j / 30, xx = lerp(x - W * (0.14 + 0.48 * v), x + W * (0.14 + 0.48 * v), u); ctx.lineTo(xx, yy + Math.sin(u * 40 + i) * 0.5 * s + Math.sin(u * Math.PI) * 2 * s * v); }
      ctx.stroke();
    }
    ctx.restore();
    // ragged straw fringe at the eave
    for (let k = 0; k < 120; k++) { const u = k / 120, xx = lerp(rx0, rx1, u), yy = ry1 + Math.sin(u * Math.PI) * 3.5 * s; ctx.strokeStyle = rgb(ramp(PAL.straw, 0.15 + 0.6 * (1 - u) * R()), 0.85); ctx.lineWidth = 0.6 * s; ctx.beginPath(); ctx.moveTo(xx, yy - 1 * s); ctx.lineTo(xx + (R() - 0.5) * s, yy + (1.5 + R() * 2.5) * s); ctx.stroke(); }
    // rim light on the roof's lit slope
    ctx.strokeStyle = rgb(PAL.rim, 0.5); ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(rx0 + 2 * s, ry1 - 1 * s); ctx.quadraticCurveTo(x - W * 0.42, ry1 - 16 * s, x - W * 0.14, peakY + 0.6 * s); ctx.lineTo(x + W * 0.1, peakY + 0.6 * s); ctx.stroke();
    // ridge pole tuft + pennant
    ctx.strokeStyle = rgb(PAL.wood[1]); ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(x + W * 0.1, peakY); ctx.lineTo(x + W * 0.1, peakY - 16 * s); ctx.stroke();
    ctx.fillStyle = lg(ctx, x + W * 0.1, 0, x + W * 0.1 + 12 * s, 0, [[0, [196, 70, 50]], [1, [140, 40, 40]]]); ctx.beginPath(); ctx.moveTo(x + W * 0.1, peakY - 16 * s); ctx.quadraticCurveTo(x + W * 0.1 + 7 * s, peakY - 16 * s, x + W * 0.1 + 13 * s, peakY - 12 * s); ctx.quadraticCurveTo(x + W * 0.1 + 6 * s, peakY - 11 * s, x + W * 0.1, peakY - 9 * s); ctx.fill();
    // ladder down the front
    const lx = x - W * 0.3; ctx.strokeStyle = rgb(PAL.wood[2]); ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(lx - 4 * s, y + 2 * s); ctx.lineTo(lx - 7 * s, y + 38 * s); ctx.moveTo(lx + 4 * s, y + 2 * s); ctx.lineTo(lx + 1 * s, y + 38 * s); ctx.stroke();
    for (let i = 1; i < 6; i++) { const yy = y + 2 * s + i * 6 * s, o = i * 0.5 * s; ctx.strokeStyle = rgb(PAL.wood[3]); ctx.lineWidth = 1.1 * s; ctx.beginPath(); ctx.moveTo(lx - 4 * s - o, yy); ctx.lineTo(lx + 4 * s - o, yy); ctx.stroke(); }
    return { door: [dx, wy1 - dh * 0.4], window: [winx, winy] };
  }

  // ---------------- STONE helpers ----------------
  function stone(ctx, x, y, rx, ry, seed, base = PAL.stone) { // one irregular painted stone with strata + cracks
    const R = rand(seed), n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.78 + R() * 0.3; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    ctx.save(); ctx.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; i ? ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]) : ctx.moveTo(m[0], m[1]); }); ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2); ctx.closePath();
    ctx.fillStyle = rg(ctx, x, y, Math.max(rx, ry) * 1.1, [[0, base[3]], [0.5, base[2]], [1, base[0]]], x - rx * 0.45, y - ry * 0.55); ctx.fill(); ctx.clip();
    for (let k = 0; k < 5; k++) { const yy = y - ry + (k + R()) * ry * 0.45; ctx.strokeStyle = rgb(k % 2 ? base[3] : base[0], 0.35); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x - rx, yy); ctx.bezierCurveTo(x - rx * 0.3, yy + (R() - 0.5) * 2, x + rx * 0.3, yy + (R() - 0.5) * 2, x + rx, yy + (R() - 0.5) * 2); ctx.stroke(); }
    for (let k = 0; k < rx * ry * 0.8; k++) { ctx.fillStyle = rgb(R() < 0.5 ? base[0] : base[3], 0.3); ctx.fillRect(x + (R() - 0.5) * rx * 2, y + (R() - 0.5) * ry * 2, 0.5, 0.5); }
    ctx.strokeStyle = rgb(base[0], 0.7); ctx.lineWidth = 0.5; ctx.beginPath(); let cx = x + (R() - 0.5) * rx, cy = y - ry * 0.6; ctx.moveTo(cx, cy); for (let i = 0; i < 3; i++) { cx += (R() - 0.5) * rx * 0.6; cy += ry * 0.4; ctx.lineTo(cx, cy); } ctx.stroke();
    ctx.fillStyle = rgb(PAL.rim, 0.35); ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.18, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  const PAD_STONE = [[52, 44, 40], [96, 80, 66], [140, 118, 92], [186, 160, 120]];
  // ---------------- LAUNCH PAD ----------------
  function launchPad(ctx, x, y, s, seed) {
    const R = rand(seed), rx = 30 * s, ry = 17 * s;
    blob(ctx, x + 3 * s, y + 5 * s, rx * 1.25, ry * 1.25, 0.5);
    // ring of fitted stones
    const N = 16;
    const order = [...Array(N).keys()].sort((a, b) => Math.sin(a / N * TAU) - Math.sin(b / N * TAU));
    for (const i of order) { const a = i / N * TAU; stone(ctx, x + Math.cos(a) * rx * 0.86, y + Math.sin(a) * ry * 0.86 + 1.5 * s, 5.6 * s, 4.2 * s, seed + i, PAD_STONE); }
    // inner metal plate, riveted, with a warm glowing ring
    ctx.fillStyle = rg(ctx, x, y, rx * 0.72, [[0, [120, 104, 82]], [0.7, [78, 66, 54]], [1, [46, 38, 34]]], x - rx * 0.25, y - ry * 0.3);
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.66, ry * 0.62, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 200; k++) { const a = R() * TAU, d = Math.sqrt(R()); ctx.fillStyle = rgb(R() < 0.5 ? [40, 32, 28] : [170, 150, 120], 0.25); ctx.fillRect(x + Math.cos(a) * d * rx * 0.62, y + Math.sin(a) * d * ry * 0.58, 0.6, 0.4); }
    ctx.strokeStyle = 'rgba(255,170,70,.9)'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.ellipse(x, y, rx * 0.5, ry * 0.46, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,160,.8)'; ctx.lineWidth = 0.5 * s; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.fillStyle = 'rgba(200,180,140,.8)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx * 0.59, y + Math.sin(a) * ry * 0.55, 0.7 * s, 0, TAU); ctx.fill(); }
    glow(ctx, x, y, rx * 1.2, [255, 150, 60], 0.32);
  }

  // ---------------- TORCH ----------------
  function torch(ctx, x, y, s, seed) {
    plank(ctx, x - 1.3 * s, y - 16 * s, 2.6 * s, 16 * s, PAL.wood[1], seed, true, 0.9);
    ctx.fillStyle = lg(ctx, 0, y - 19 * s, 0, y - 14 * s, [[0, PAL.straw[2]], [1, PAL.straw[0]]]); ctx.beginPath(); ctx.moveTo(x - 2.8 * s, y - 19 * s); ctx.lineTo(x + 2.8 * s, y - 19 * s); ctx.lineTo(x + 1.6 * s, y - 14 * s); ctx.lineTo(x - 1.6 * s, y - 14 * s); ctx.fill();
    glow(ctx, x, y - 22 * s, 30 * s, [255, 140, 50], 0.38);
    ctx.fillStyle = rg(ctx, x, y - 21 * s, 5 * s, [[0, [255, 250, 210]], [0.4, [255, 190, 80]], [1, [230, 90, 30, 0]]]);
    ctx.beginPath(); ctx.moveTo(x - 2.6 * s, y - 19.5 * s); ctx.quadraticCurveTo(x - 3 * s, y - 24 * s, x + 0.4 * s, y - 28.5 * s); ctx.quadraticCurveTo(x + 0.6 * s, y - 25 * s, x + 2.6 * s, y - 23 * s); ctx.quadraticCurveTo(x + 3 * s, y - 20 * s, x + 2.6 * s, y - 19.5 * s); ctx.fill();
  }

  // ---------------- BRIDGE ----------------
  function bridge(ctx, a, b, w, s, seed) { // planks across from a to b
    const R = rand(seed), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang);
    blob(ctx, L / 2 + 3, 5, L * 0.6, w * 0.7, 0.5);
    // stringers
    for (const o of [-w / 2, w / 2 - 2 * s]) plank(ctx, -2 * s, o, L + 4 * s, 2 * s, PAL.wood[0], seed + o, false, 0.4);
    const n = Math.round(L / (3.4 * s));
    for (let i = 0; i < n; i++) { const xx = i * L / n; ctx.save(); ctx.translate(xx, 0); ctx.rotate((R() - 0.5) * 0.06); plank(ctx, 0.2 * s, -w / 2 - 0.6 * s, L / n - 0.6 * s, w + 1.2 * s, mix(PAL.wood[2], PAL.wood[3], R() * 0.4), seed + 10 + i, true, 0.8); ctx.restore(); }
    // rope rails with posts
    for (const o of [-w / 2 - 1 * s, w / 2 + 1 * s]) {
      ctx.strokeStyle = rgb(PAL.straw[1]); ctx.lineWidth = 0.9 * s; ctx.beginPath(); ctx.moveTo(0, o); ctx.quadraticCurveTo(L / 2, o + 2 * s * Math.sign(o), L, o); ctx.stroke();
      for (const xx of [0, L]) { ctx.fillStyle = rg(ctx, xx, o, 2.4 * s, [[0, PAL.wood[3]], [1, PAL.wood[0]]], xx - 1, o - 1); ctx.beginPath(); ctx.arc(xx, o, 2 * s, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  // ---------------- CANOE ----------------
  function canoe(ctx, x, y, s, ang, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    blob(ctx, 2 * s, 4 * s, 28 * s, 7 * s, 0.45);
    const hull = c => { c.beginPath(); c.moveTo(-26 * s, 0); c.quadraticCurveTo(-14 * s, -7 * s, 0, -7 * s); c.quadraticCurveTo(14 * s, -7 * s, 26 * s, 0); c.quadraticCurveTo(14 * s, 7 * s, 0, 7 * s); c.quadraticCurveTo(-14 * s, 7 * s, -26 * s, 0); c.closePath(); };
    hull(ctx); ctx.fillStyle = lg(ctx, 0, -7 * s, 0, 7 * s, [[0, PAL.wood[3]], [0.5, PAL.wood[2]], [1, PAL.wood[0]]]); ctx.fill();
    ctx.save(); hull(ctx); ctx.clip(); plank(ctx, -27 * s, -7 * s, 54 * s, 14 * s, PAL.wood[2], seed, false, 0.7); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 21 * s, 4.2 * s, 0, 0, TAU); ctx.fillStyle = lg(ctx, 0, -4 * s, 0, 4 * s, [[0, PAL.wood[0]], [1, PAL.wood[1]]]); ctx.fill();
    for (const xx of [-8, 8]) { ctx.fillStyle = rgb(PAL.wood[2]); ctx.fillRect(xx * s - 1.2 * s, -4 * s, 2.4 * s, 8 * s); }
    ctx.strokeStyle = rgb(PAL.rim, 0.5); ctx.lineWidth = 0.7 * s; ctx.beginPath(); ctx.moveTo(-24 * s, -1 * s); ctx.quadraticCurveTo(-12 * s, -6.6 * s, 4 * s, -6.6 * s); ctx.stroke();
    // paddle
    ctx.strokeStyle = rgb(PAL.wood[2]); ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(-6 * s, 10 * s); ctx.lineTo(18 * s, 6 * s); ctx.stroke();
    ctx.fillStyle = rgb(PAL.wood[2]); ctx.beginPath(); ctx.ellipse(21 * s, 5.5 * s, 4.5 * s, 2 * s, -0.17, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------- SIGNPOST ----------------
  function signpost(ctx, x, y, s, labels, seed) { // labels: [{text, dir: -1|1, dy}]
    blob(ctx, x + 2 * s, y + 1 * s, 8 * s, 3 * s, 0.5);
    plank(ctx, x - 1.6 * s, y - 34 * s, 3.2 * s, 34 * s, PAL.wood[1], seed, true, 0.9);
    labels.forEach((l, i) => {
      ctx.font = `${8 * s}px "Lilita One", system-ui`; const tw = ctx.measureText(l.text).width + 8 * s, h = 10 * s, yy = y - 31 * s + i * 12 * s + (l.dy || 0) * s;
      const x0 = l.dir < 0 ? x - tw + 2 * s : x - 2 * s;
      ctx.save(); ctx.beginPath();
      if (l.dir < 0) { ctx.moveTo(x0 + tw, yy); ctx.lineTo(x0 + 5 * s, yy); ctx.lineTo(x0, yy + h / 2); ctx.lineTo(x0 + 5 * s, yy + h); ctx.lineTo(x0 + tw, yy + h); }
      else { ctx.moveTo(x0, yy); ctx.lineTo(x0 + tw - 5 * s, yy); ctx.lineTo(x0 + tw, yy + h / 2); ctx.lineTo(x0 + tw - 5 * s, yy + h); ctx.lineTo(x0, yy + h); }
      ctx.closePath(); ctx.clip(); plank(ctx, x0 - 1, yy, tw + 2, h, PAL.wood[2], seed + 7 + i, false, 1); ctx.restore();
      ctx.fillStyle = rgb([60, 34, 20], 0.9); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const tx = x0 + tw / 2 + (l.dir < 0 ? 2 : -2) * s;
      ctx.fillStyle = rgb(PAL.rim, 0.4); ctx.fillText(l.text, tx, yy + h / 2 + 1.2 * s);
      ctx.fillStyle = 'rgba(52,28,16,.95)'; ctx.fillText(l.text, tx, yy + h / 2 + 0.6 * s);
    });
  }

  // ---------------- NODE TOKEN ----------------
  function star(ctx, x, y, r, fill) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function node(ctx, x, y, num, st, s) { // st: {stars: 0..3, open: bool}
    const r = (st.open ? 19 : 16) * s;
    blob(ctx, x + 2 * s, y + r * 0.75, r * 1.25, r * 0.5, 0.6, [8, 14, 12]);
    glow(ctx, x, y, r * (st.open ? 3.4 : 2.5), [255, 180, 80], st.open ? 0.5 : 0.32);
    if (st.open) { for (const k of [1.35, 1.65]) { ctx.strokeStyle = `rgba(255,220,140,${k < 1.5 ? 0.75 : 0.35})`; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * k, r * k * 0.5, 0, 0, TAU); ctx.stroke(); } }
    // coin edge (thickness) under the face
    ctx.fillStyle = lg(ctx, 0, y, 0, y + r + 4 * s, [[0, [170, 100, 26]], [1, [96, 52, 18]]]); ctx.beginPath(); ctx.arc(x, y + 3 * s, r, 0, TAU); ctx.fill();
    // rim
    ctx.fillStyle = lg(ctx, x - r, y - r, x + r, y + r, [[0, [255, 236, 160]], [0.45, [236, 170, 56]], [1, [150, 82, 20]]]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    // reeded edge ticks
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ctx.strokeStyle = `rgba(120,60,10,${0.35})`; ctx.lineWidth = 0.5 * s; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); ctx.lineTo(x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.98); ctx.stroke(); }
    // face (sunk) with brushed metal texture
    ctx.fillStyle = rg(ctx, x, y, r * 0.8, [[0, [255, 222, 120]], [0.6, [236, 168, 50]], [1, [190, 112, 26]]], x - r * 0.3, y - r * 0.35); ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.clip(); const R = rand(num * 31);
    for (let k = 0; k < 90; k++) { ctx.strokeStyle = R() < 0.5 ? 'rgba(255,250,210,.18)' : 'rgba(150,80,10,.14)'; ctx.lineWidth = 0.35; const rr = R() * r * 0.78, a0 = R() * TAU; ctx.beginPath(); ctx.arc(x, y, rr, a0, a0 + 0.6 + R()); ctx.stroke(); }
    ctx.restore();
    // bevel: dark top-left inner edge, light bottom-right (sunk face)
    ctx.lineWidth = 1.1 * s; ctx.strokeStyle = 'rgba(140,72,12,.75)'; ctx.beginPath(); ctx.arc(x, y, r * 0.78, Math.PI * 0.85, Math.PI * 1.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,180,.85)'; ctx.beginPath(); ctx.arc(x, y, r * 0.78, -0.2, Math.PI * 0.8); ctx.stroke();
    // number, embossed
    ctx.font = `${(st.open ? 21 : 18) * s}px "Lilita One", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,246,200,.9)'; ctx.fillText(num, x + 0.6 * s, y + 1.9 * s);
    ctx.fillStyle = lg(ctx, 0, y - r * 0.5, 0, y + r * 0.5, [[0, [130, 62, 14]], [1, [84, 36, 8]]]); ctx.fillText(num, x, y + 1 * s);
    // specular streak
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,230,.55)'; ctx.lineWidth = 1.3 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * 0.9, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,240,.8)'; ctx.beginPath(); ctx.arc(x - r * 0.52, y - r * 0.62, 1.2 * s, 0, TAU); ctx.fill(); ctx.restore();
    // stars
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i - 1) * 0.62, sx = x + Math.cos(a) * r * 1.05, sy = y + Math.sin(a) * r * 1.05 + 3 * s, sr = (i === 1 ? 6 : 5) * s, on = i < st.stars;
      star(ctx, sx, sy + 0.8 * s, sr * 1.18, on ? 'rgba(110,52,10,.9)' : 'rgba(20,26,26,.75)');
      if (on) { star(ctx, sx, sy, sr, lg(ctx, 0, sy - sr, 0, sy + sr, [[0, [255, 244, 170]], [0.5, [255, 196, 60]], [1, [210, 120, 20]]])); star(ctx, sx - sr * 0.15, sy - sr * 0.18, sr * 0.38, 'rgba(255,255,230,.7)'); }
      else star(ctx, sx, sy, sr, 'rgba(70,84,80,.85)');
    }
  }

  // a boulder with moss painted over its lit top
  function mossRock(ctx, x, y, rx, ry, seed) {
    const R = rand(seed); blob(ctx, x + rx * 0.3, y + ry * 0.6, rx * 1.4, ry * 0.9, 0.5);
    stone(ctx, x, y, rx, ry, seed);
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx * 0.95, ry * 0.95, 0, 0, TAU); ctx.clip();
    for (let k = 0; k < rx * ry * 1.4; k++) {
      const a = R() * TAU, d = Math.sqrt(R()), px = x + Math.cos(a) * d * rx, py = y + Math.sin(a) * d * ry; if (py > y + ry * 0.1 + (R() - 0.5) * ry * 0.5) continue;
      const lit = clamp(0.5 - (px - x) / rx * 0.35 - (py - y) / ry * 0.35 + (R() - 0.5) * 0.3);
      ctx.fillStyle = rgb(ramp(PAL.leaf, 0.2 + lit * 0.7), 0.85); ctx.beginPath(); ctx.ellipse(px, py, 0.9 + R(), 0.6 + R() * 0.5, R() * 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // a fallen log: bark ridges along its length, cut end with growth rings
  function log(ctx, x, y, len, r, ang, seed) {
    const R = rand(seed); ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    blob(ctx, len * 0.1, r * 0.9, len * 0.65, r * 1.1, 0.5);
    ctx.fillStyle = lg(ctx, 0, -r, 0, r, [[0, PAL.wood[3]], [0.35, PAL.wood[2]], [1, PAL.wood[0]]]); ctx.beginPath(); ctx.roundRect(-len / 2, -r, len, 2 * r, r * 0.6); ctx.fill();
    for (let k = 0; k < 26; k++) { const yy = -r + R() * 2 * r; ctx.strokeStyle = rgb(R() < 0.6 ? PAL.wood[0] : PAL.wood[3], 0.45); ctx.lineWidth = 0.4 + R() * 0.4; ctx.beginPath(); ctx.moveTo(-len / 2 + R() * 4, yy); ctx.bezierCurveTo(-len / 6, yy + (R() - 0.5) * 1.5, len / 6, yy + (R() - 0.5) * 1.5, len / 2 - R() * 4, yy); ctx.stroke(); }
    for (let k = 0; k < 40; k++) { const px = -len / 2 + R() * len, py = -r + R() * r * 0.9; ctx.fillStyle = rgb(ramp(PAL.leaf, 0.3 + R() * 0.5), 0.8); ctx.beginPath(); ctx.ellipse(px, py, 1 + R(), 0.6, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rg(ctx, len / 2, 0, r, [[0, PAL.wood[3]], [0.7, PAL.wood[2]], [1, PAL.wood[1]]]); ctx.beginPath(); ctx.ellipse(len / 2, 0, r * 0.45, r * 0.95, 0, 0, TAU); ctx.fill();
    for (let i = 1; i < 4; i++) { ctx.strokeStyle = rgb(PAL.wood[1], 0.6); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(len / 2, 0, r * 0.45 * i / 4, r * 0.95 * i / 4, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  window.DUSK = { mossRock, log, TAU, clamp, lerp, smooth, mix, rgb, rand, hash, vnoise, fbm, resample, normalAt, tangentAt, pathOf, ribbonPath, lg, rg, glow, blob, PAL, ramp, makeMask,
    canopy, canopyShadow, palm, plank, hut, stone, launchPad, torch, bridge, canoe, signpost, node, star };
})();
