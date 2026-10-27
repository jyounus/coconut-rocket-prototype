// Soft gouache paint kit: noise, wobbly shapes, per-pixel tonal fills, bristle brush strokes, dry-brush edges,
// paper grain and haze. Coordinates are CSS px of the phone screen (390x844); the canvas is drawn at K x device px.
// Everything is deterministic (seeded), so the same calls repaint the same picture; tiles can be baked from it later.
(() => {
  const TAU = Math.PI * 2;
  const rand = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s = 0, o = 4) { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; } return t / n; }

  // ---------- colour ----------
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const SHADOW = [44, 50, 78];   // gouache shadows lean blue-violet, never black
  const deep = (c, k) => mix(c, SHADOW, k);
  const lite = (c, k, warm = [255, 246, 222]) => mix(c, warm, k);
  const jit = (c, amt, r) => { const d = (r() - 0.5) * amt; return [c[0] + d + (r() - 0.5) * amt * 0.4, c[1] + d + (r() - 0.5) * amt * 0.4, c[2] + d + (r() - 0.5) * amt * 0.4]; };
  const pick = (arr, r) => arr[(r() * arr.length) | 0];
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const smooth = t => t * t * (3 - 2 * t);

  // ---------- geometry ----------
  // Catmull-Rom through pts, n samples per span
  function spline(pts, n = 8, closed = false) {
    const out = [], P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
    if (!closed) out.push(pts[pts.length - 1]);
    return out;
  }
  function resample(pts, step) {
    const out = [pts[0]]; let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let d = step - carry;
      while (d <= L) { const t = d / L; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); d += step; }
      carry = L - (d - step);
    }
    return out;
  }
  const lengthOf = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function normals(pts, closed) {
    return pts.map((p, i) => {
      const a = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L];
    });
  }
  // push each point along its normal by noise: hand-cut, slightly irregular painted edges
  function wobble(pts, amp, freq, seed, closed = true) {
    const N = normals(pts, closed); let s = 0;
    return pts.map((p, i) => { if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); const d = (fbm(s * freq, seed * 0.37, seed, 3) - 0.5) * 2 * amp; return [p[0] + N[i][0] * d, p[1] + N[i][1] * d]; });
  }
  // thick ribbon polygon around a centre line (width fn of u in 0..1)
  function ribbon(line, wfn) {
    const N = normals(line, false), L = line.length, a = [], b = [];
    line.forEach((p, i) => { const w = wfn(i / (L - 1)) / 2; a.push([p[0] + N[i][0] * w, p[1] + N[i][1] * w]); b.push([p[0] - N[i][0] * w, p[1] - N[i][1] * w]); });
    return a.concat(b.reverse());
  }
  function ellipsePts(cx, cy, rx, ry, n = 48, rot = 0) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; }
  function path(ctx, pts, closed = true) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); }
  function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; }
  function inside(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function distTo(line, x, y) { let d = 1e9, k = 0; for (let i = 0; i < line.length; i++) { const q = (line[i][0] - x) ** 2 + (line[i][1] - y) ** 2; if (q < d) { d = q; k = i; } } return [Math.sqrt(d), k]; }

  // ---------- painting ----------
  const P = { K: 3, W: 390, H: 844 };

  // Fill a shape with a per-pixel colour function (x,y in CSS px) -> [r,g,b]: soft tonal variation inside the mass.
  function pixelFill(ctx, pts, fn, alpha = 1) {
    const K = P.K, [bx0, by0, bx1, by1] = bbox(pts), x0 = Math.max(0, Math.floor(bx0 - 1)), y0 = Math.max(0, Math.floor(by0 - 1)), x1 = Math.min(P.W, Math.ceil(bx1 + 1)), y1 = Math.min(P.H, Math.ceil(by1 + 1));
    if (x1 <= x0 || y1 <= y0) return;
    const w = (x1 - x0) * K, h = (y1 - y0) * K, off = document.createElement('canvas'); off.width = w; off.height = h;
    const o = off.getContext('2d'); o.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); o.fillStyle = '#fff'; path(o, pts); o.fill();
    const img = o.getImageData(0, 0, w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const q = (j * w + i) * 4; if (!d[q + 3]) continue;
      const c = fn(x0 + (i + 0.5) / K, y0 + (j + 0.5) / K); d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = d[q + 3] * alpha * (c.length > 3 ? c[3] : 1);
    }
    o.putImageData(img, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, x0 * K, y0 * K); ctx.restore();
  }

  // One bristle brush stroke: several thin hairs side by side, each starting/ending at a slightly different point
  // (ragged, dry ends), tapered, gently bent, each hair a touch lighter or darker than the load.
  function brush(ctx, x, y, ang, len, w, col, alpha, r, o = {}) {
    const n = o.hairs || Math.max(3, Math.min(9, Math.round(w * 2.2))), bend = (r() - 0.5) * len * (o.bend ?? 0.35), dry = o.dry ?? 0.3;
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.35, w / n * 1.9);
    for (let i = 0; i < n; i++) {
      const off = ((i + 0.5) / n - 0.5) * w, t0 = r() * dry, t1 = 1 - r() * dry, c = jit(col, o.jit ?? 14, r);
      ctx.strokeStyle = css(c, alpha * (0.45 + r() * 0.55)); ctx.beginPath();
      for (let k = 0; k <= 5; k++) {
        const t = t0 + (t1 - t0) * k / 5, along = (t - 0.5) * len, taper = Math.pow(Math.sin(Math.PI * clamp(t, 0.02, 0.98)), 0.35), b = bend * 4 * t * (1 - t);
        const px = x + ca * along + nx * (off * taper + b), py = y + sa * along + ny * (off * taper + b);
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  }

  // Cover a shape with strokes. opt: count|density, palette [[r,g,b]..], colorAt(x,y,r)->col, flow(x,y)->angle,
  // len [a,b], w [a,b], alpha [a,b], clip (default true), seed
  function strokes(ctx, pts, opt) {
    const r = rand(opt.seed || 7), [x0, y0, x1, y1] = bbox(pts), area = (x1 - x0) * (y1 - y0);
    const n = opt.count || Math.round(area * (opt.density || 0.1));
    ctx.save(); if (opt.clip !== false) { path(ctx, pts); ctx.clip(); }
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      if (opt.inside && !inside(pts, x, y)) continue;
      if (opt.mask && !opt.mask(x, y)) continue;
      const col = opt.colorAt ? opt.colorAt(x, y, r) : pick(opt.palette, r);
      if (!col) continue;
      const a = opt.flow ? opt.flow(x, y, r) : r() * TAU, len = opt.len[0] + r() * (opt.len[1] - opt.len[0]), w = opt.w[0] + r() * (opt.w[1] - opt.w[0]);
      const al = opt.alpha[0] + r() * (opt.alpha[1] - opt.alpha[0]);
      brush(ctx, x, y, a, len, w, col, al, r, opt);
    }
    ctx.restore();
  }

  // Soft round blotches (wet wash) clipped to a shape, for broad tonal variation.
  function blotches(ctx, pts, n, palette, rad, alpha, seed) {
    const r = rand(seed), [x0, y0, x1, y1] = bbox(pts);
    ctx.save(); path(ctx, pts); ctx.clip();
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), R = rad[0] + r() * (rad[1] - rad[0]), c = pick(palette, r), g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, css(c, alpha)); g.addColorStop(0.6, css(c, alpha * 0.5)); g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R, R * (0.6 + r() * 0.5), r() * TAU, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // Dry-brush edge: short strokes along the outline, straddling it, so the mass ends in a broken painted edge.
  function dryEdge(ctx, pts, col, o = {}) {
    const r = rand(o.seed || 11), line = resample(o.closed === false ? pts : pts.concat([pts[0]]), o.step || 1.6), N = normals(line, o.closed !== false);
    for (let i = 0; i < line.length; i++) {
      const p = line[i], nx = N[i][0], ny = N[i][1], off = (r() - (o.bias ?? 0.5)) * (o.spread || 3), ang = Math.atan2(nx, -ny) + (r() - 0.5) * 0.5;
      const c = typeof col === 'function' ? col(p[0], p[1], r) : jit(col, 12, r);
      brush(ctx, p[0] + nx * off, p[1] + ny * off, ang, (o.len || [3, 7])[0] + r() * ((o.len || [3, 7])[1] - (o.len || [3, 7])[0]), (o.w || [0.8, 1.8])[0] + r() * ((o.w || [0.8, 1.8])[1] - (o.w || [0.8, 1.8])[0]), c, (o.alpha || 0.7), r, { dry: 0.45, bend: 0.2 });
    }
  }

  function softShadow(ctx, cx, cy, rx, ry, a = 0.35, rot = 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, css(SHADOW, a)); g.addColorStop(0.55, css(SHADOW, a * 0.6)); g.addColorStop(1, css(SHADOW, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function glow(ctx, x, y, R, col, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, css(col, a)); g.addColorStop(0.4, css(col, a * 0.45)); g.addColorStop(1, css(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }

  // Paper grain over the whole canvas (device px): fibre noise + fine tooth + a faint canvas weave; darker paint
  // granulates a little more, like gouache pigment settling into the paper.
  function paperGrain(ctx, amt = 1, region) {
    const W = ctx.canvas.width, H = ctx.canvas.height, [rx, ry, rw, rh] = region || [0, 0, W, H], img = ctx.getImageData(rx, ry, rw, rh), d = img.data;
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
      const x = rx + i, y = ry + j, q = (j * rw + i) * 4;
      const fib = vnoise(x * 0.09, y * 0.35, 5) * 0.55 + vnoise(x * 0.33, y * 0.11, 9) * 0.45;   // crossed fibres
      const tooth = hash(x, y, 3), blot = vnoise(x * 0.012, y * 0.012, 21);
      const weave = Math.sin(x * 1.05) * Math.sin(y * 1.05) * 0.5;
      const lum = (d[q] * 0.3 + d[q + 1] * 0.59 + d[q + 2] * 0.11) / 255;
      const k = (0.045 + (1 - lum) * 0.05) * amt;
      const v = 1 + ((fib - 0.5) * 1.1 + (tooth - 0.5) * 0.7 + weave * 0.25 + (blot - 0.5) * 0.6) * k;
      d[q] = Math.min(255, d[q] * v + 2 * amt); d[q + 1] = Math.min(255, d[q + 1] * v + 1.5 * amt); d[q + 2] = Math.min(255, d[q + 2] * v);
    }
    ctx.putImageData(img, rx, ry);
  }

  window.PAINT = { TAU, P, rand, hash, vnoise, fbm, css, mix, deep, lite, jit, pick, clamp, smooth, SHADOW, spline, resample, lengthOf, normals, wobble, ribbon, ellipsePts, path, bbox, inside, distTo, pixelFill, brush, strokes, blotches, dryEdge, softShadow, glow, paperGrain };
})();
