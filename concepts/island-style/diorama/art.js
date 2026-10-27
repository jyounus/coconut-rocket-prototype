// Carved diorama: reusable painters for the Coconut Island map. Everything is drawn in CSS px on a context scaled to
// device px (DPR, 3 for the phone sample). Each painter is a plain function of (ctx, geometry, seed), so the same code
// can paint the full 1640x2480 island into tiles later. Texture comes from per-pixel fbm (ImageData), brush-stroke
// passes and layered translucent washes; edges are a darker hue of the surface, never black outlines.
(() => {
  const TAU = Math.PI * 2;
  let DPR = 3, CW = 1170, CH = 2532;
  function setup(w, h, dpr) { DPR = dpr; CW = Math.round(w * dpr); CH = Math.round(h * dpr); }

  // ---------------- random + noise ----------------
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const PERM = new Uint8Array(512); { const r = rng(7), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
  const hv = (i, j) => PERM[(PERM[i & 255] + j) & 255] / 255;
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hv(xi, yi), b = hv(xi + 1, yi), c = hv(xi, yi + 1), d = hv(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; }
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const shade = (c, k) => k >= 0 ? mix(c, [255, 248, 228], k) : mix(c, [22, 26, 22], -k);

  // ---------------- canvases + layers ----------------
  function canvas(w = CW, h = CH) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function scaled(c) { const g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); return g; }
  // per-pixel painter: fn(x, y) in CSS px -> [r,g,b,a(0..255)], only inside bbox [x0,y0,x1,y1] (CSS px)
  function pixels(bbox, fn) {
    const c = canvas(), g = c.getContext('2d');
    const x0 = Math.max(0, Math.floor(bbox[0] * DPR)), y0 = Math.max(0, Math.floor(bbox[1] * DPR));
    const x1 = Math.min(CW, Math.ceil(bbox[2] * DPR)), y1 = Math.min(CH, Math.ceil(bbox[3] * DPR));
    if (x1 <= x0 || y1 <= y0) return c;
    const w = x1 - x0, h = y1 - y0, id = g.createImageData(w, h), d = id.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c4 = fn((x0 + i + 0.5) / DPR, (y0 + j + 0.5) / DPR), k = (j * w + i) * 4;
      d[k] = c4[0]; d[k + 1] = c4[1]; d[k + 2] = c4[2]; d[k + 3] = c4.length > 3 ? c4[3] : 255;
    }
    g.putImageData(id, x0, y0); return c;
  }
  // paint(g) onto a fresh layer, keep it only where mask(g) fills, then composite onto ctx
  function layer(ctx, mask, paint, op) {
    const c = canvas(), g = scaled(c);
    paint(g);
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#fff'; g.beginPath(); mask(g);
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (op) ctx.globalCompositeOperation = op; ctx.drawImage(c, 0, 0); ctx.restore();
  }
  const blit = (g, c, a = 1, op) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; if (op) g.globalCompositeOperation = op; g.drawImage(c, 0, 0); g.restore(); };
  function blurred(ctx, px, draw) { ctx.save(); ctx.filter = `blur(${px * DPR}px)`; draw(ctx); ctx.restore(); }

  // ---------------- geometry ----------------
  function cr(pts, closed, steps = 6) {   // Catmull-Rom resample into a dense polyline
    const out = [], n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function trace(g, pts, closed, dx = 0, dy = 0) { g.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy); if (closed) g.closePath(); }
  function lengths(P) { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; }
  function at(P, L, d) {    // point + unit tangent at arc distance d
    d = clamp(d, 0, L[L.length - 1]); let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const t = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), a = P[i - 1], b = P[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), tx: dx / m, ty: dy / m };
  }
  function wobble(pts, amp, freq, seed) {   // jitter a dense outline with noise so carved edges are never smooth
    return pts.map(([x, y], i) => { const n = fbm(x * freq + seed, y * freq - seed, 3) - 0.5, m = fbm(x * freq * 4 + seed * 2, y * freq * 4, 2) - 0.5; return [x + (n * 1 + m * 0.35) * amp * 0.5, y + (n + m * 0.35) * amp]; });
  }
  function blobPts(cx, cy, rx, ry, seed, amp = 0.18, n = 40) {
    const r = rng(seed), ph = [r() * TAU, r() * TAU, r() * TAU], out = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + amp * (Math.sin(a * 2 + ph[0]) * 0.5 + Math.sin(a * 3 + ph[1]) * 0.35 + Math.sin(a * 5 + ph[2]) * 0.2); out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return out;
  }

  // ---------------- palette ----------------
  const PAL = {
    grass: [92, 124, 66], grassLt: [140, 160, 88], grassDk: [52, 80, 48], grassDry: [128, 132, 76], grassCool: [70, 104, 70],
    earth: [[122, 84, 54], [92, 62, 42], [150, 108, 68], [78, 54, 38], [168, 124, 80], [108, 74, 52], [134, 84, 58]],
    root: [70, 48, 32],
    sand: [196, 176, 134], sandLt: [218, 200, 158], sandDk: [164, 142, 104], wetSand: [138, 120, 92],
    sandFace: [[186, 162, 120], [168, 144, 106], [200, 176, 132], [156, 132, 96]],
    seaDeep: [24, 56, 70], sea: [36, 84, 98], seaShallow: [70, 130, 128], foam: [226, 236, 226],
    water: [44, 96, 104], waterLt: [104, 156, 146],
    wood: [128, 84, 52], woodLt: [176, 124, 76], woodDk: [78, 50, 32],
    stone: [126, 122, 112], stoneLt: [170, 164, 148], stoneDk: [74, 72, 66], moss: [96, 124, 62], mossLt: [140, 164, 88],
    road: [184, 160, 118], roadLt: [212, 190, 144], roadDk: [140, 118, 84],
    leaf: [44, 72, 46], leafMid: [66, 100, 60], leafLt: [118, 144, 82], leafRim: [196, 214, 140],
    palm: [62, 104, 58], palmLt: [128, 160, 84], palmDk: [34, 62, 40], trunk: [138, 104, 70], trunkDk: [86, 62, 42],
    straw: [190, 154, 92], strawLt: [226, 196, 132], strawDk: [120, 88, 50], cane: [176, 146, 92],
    gold: [255, 206, 84], goldLt: [255, 240, 170], goldDk: [176, 108, 30], glow: [255, 200, 110],
  };

  // ---------------- surfaces (per-pixel textures) ----------------
  function grassTex(bbox, tint = 0) {
    return pixels(bbox, (x, y) => {
      const big = fbm(x * 0.012, y * 0.012, 3), mid = fbm(x * 0.05, y * 0.05, 3), fine = vnoise(x * 0.9, y * 0.9), cl = fbm(x * 0.16, y * 0.22, 2);
      let c = mix(PAL.grassDk, PAL.grass, clamp((big - 0.5) * 2.6 + 0.62));
      c = mix(c, PAL.grassLt, clamp((mid - 0.48) * 1.6) * 0.55);
      c = mix(c, shade(PAL.grassLt, 0.1), clamp((fbm(x * 0.007 + 9, y * 0.007, 2) - 0.55) * 3) * 0.35);
      c = mix(c, PAL.grassDry, clamp((fbm(x * 0.02 + 40, y * 0.02, 2) - 0.6) * 2.5) * 0.6);
      c = mix(c, PAL.grassCool, tint);
      const k = (cl - 0.5) * 0.22 + (fine - 0.5) * 0.12;
      return shade(c, k);
    });
  }
  function sandTex(bbox) {
    return pixels(bbox, (x, y) => {
      const big = fbm(x * 0.015, y * 0.015, 3), rip = Math.sin(y * 0.9 + fbm(x * 0.03, y * 0.03, 2) * 9 + x * 0.05), grain = vnoise(x * 2.4, y * 2.4), speck = vnoise(x * 1.3 + 50, y * 1.3);
      let c = mix(PAL.sandDk, PAL.sand, clamp(0.3 + big));
      c = mix(c, PAL.sandLt, clamp(rip * 0.5 + 0.5) * 0.16);
      let k = (grain - 0.5) * 0.18;
      if (speck > 0.83) k -= 0.18; else if (speck < 0.1) k += 0.12;
      return shade(c, k);
    });
  }
  function seaTex(bbox) {
    return pixels(bbox, (x, y) => {
      const t = clamp((y - bbox[1]) / (bbox[3] - bbox[1])), n = fbm(x * 0.01, y * 0.025, 4), m = fbm(x * 0.04, y * 0.12, 3), f = vnoise(x * 0.6, y * 1.6);
      let c = mix(PAL.sea, PAL.seaDeep, clamp(t * 1.1 + (n - 0.5) * 0.8));
      c = shade(c, (m - 0.5) * 0.2 + (f - 0.5) * 0.06);
      return c;
    });
  }
  function earthTex(bbox) { return pixels(bbox, (x, y) => { const n = fbm(x * 0.08, y * 0.3, 3), f = vnoise(x * 1.5, y * 1.5); const v = 128 + (n - 0.5) * 70 + (f - 0.5) * 40; return [v, v, v]; }); }

  // ---------------- grass brush strokes ----------------
  function grassStrokes(g, poly, bbox, seed, dens = 1, tint = 0) {
    const r = rng(seed), path = new Path2D(); trace(path, poly, true);
    const area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]), n = Math.floor(area * 0.13 * dens);
    g.save(); g.clip(path); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = lerp(bbox[0], bbox[2], r()), y = lerp(bbox[1], bbox[3], r());
      const zone = fbm(x * 0.05, y * 0.05, 2), lit = r();
      const base = mix(mix(PAL.grassDk, PAL.grassLt, clamp(zone * 1.2 - 0.1)), PAL.grassCool, tint);
      const c = lit < 0.5 ? shade(base, -0.25 - r() * 0.2) : shade(base, 0.08 + r() * 0.25);
      const blades = 2 + (r() * 3 | 0), ang = -Math.PI / 2 + (r() - 0.5) * 0.9, len = 1.6 + r() * 2.6;
      g.strokeStyle = css(c, 0.32 + r() * 0.35); g.lineWidth = 0.35 + r() * 0.5;
      g.beginPath();
      for (let b = 0; b < blades; b++) { const a = ang + (b - blades / 2) * 0.35, l = len * (0.7 + r() * 0.5); g.moveTo(x + b * 0.5, y); g.quadraticCurveTo(x + b * 0.5 + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.6, x + b * 0.5 + Math.cos(a + 0.3) * l, y + Math.sin(a + 0.3) * l); }
      g.stroke();
    }
    // soft clump shading: little shadowed hollows under brighter tufts
    for (let i = 0; i < n * 0.03; i++) {
      const x = lerp(bbox[0], bbox[2], r()), y = lerp(bbox[1], bbox[3], r()), s = 3 + r() * 6;
      g.fillStyle = css(PAL.grassDk, 0.10); g.beginPath(); g.ellipse(x + 1, y + 1.5, s, s * 0.5, 0, 0, TAU); g.fill();
      g.fillStyle = css(PAL.grassLt, 0.10); g.beginPath(); g.ellipse(x - 0.5, y - 0.5, s * 0.7, s * 0.35, 0, 0, TAU); g.fill();
    }
    // tiny flowers: very few, pale, so colour stays restrained
    for (let i = 0; i < area * 0.0009 * dens; i++) {
      const x = lerp(bbox[0], bbox[2], r()), y = lerp(bbox[1], bbox[3], r());
      const c = [[236, 226, 196], [232, 196, 120], [214, 170, 190]][r() * 3 | 0];
      g.fillStyle = css(c, 0.75); g.beginPath(); g.arc(x, y, 0.55, 0, TAU); g.fill();
    }
    g.restore();
  }

  // ---------------- the carved slab ----------------
  // poly: dense closed outline of the slab's top. depth: height of the carved face (CSS px). kind: 'grass'|'sand'
  function bottomFacing(poly) {
    const path = new Path2D(); trace(path, poly, true);
    const cx = document.createElement('canvas').getContext('2d');
    return poly.map((p, i) => { const q = poly[(i + 1) % poly.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; return !cx.isPointInPath(path, mx, my + 1.2) && cx.isPointInPath(path, mx, my - 1.2); });
  }
  function slab(ctx, poly, o) {
    const { depth, kind, seed = 1, bbox } = o, r = rng(seed), down = bottomFacing(poly);
    const strata = kind === 'sand' ? PAL.sandFace : PAL.earth;
    const faceMask = g => { for (let k = 0; k <= depth; k += 0.5) trace(g, poly, true, 0, k); g.fill(); };
    // soft cast shadow onto whatever is below (light from the upper left)
    if (o.shadow !== false) blurred(ctx, depth * 0.45, g => { g.fillStyle = 'rgba(16,24,20,.42)'; g.beginPath(); trace(g, poly, true, depth * 0.25, depth + 3); g.fill(); });
    // the carved face
    layer(ctx, faceMask, g => {
      g.lineJoin = 'round';
      for (let k = -1; k <= depth + 1; k += 0.7) {
        const band = Math.floor((k / depth) * 4.5 + fbm(k * 0.25, seed, 2) * 2.2);
        g.strokeStyle = css(strata[((band % strata.length) + strata.length) % strata.length]); g.lineWidth = 1.6;
        g.beginPath(); trace(g, poly, true, 0, k); g.stroke();
      }
      // wavy strata seams, a darker hue with a lit lip just above
      for (let s = 0; s < 4; s++) {
        const k0 = depth * (0.22 + s * 0.2) + (r() - 0.5) * 2;
        const P = poly.map(([x, y]) => [x, y + k0 + (fbm(x * 0.04 + s * 13, s, 2) - 0.5) * depth * 0.28]);
        g.strokeStyle = css(shade(strata[1], -0.35), 0.55); g.lineWidth = 0.7; g.beginPath(); trace(g, P, true); g.stroke();
        g.strokeStyle = css(shade(strata[2], 0.3), 0.3); g.lineWidth = 0.5; g.beginPath(); trace(g, P, true, 0, -0.7); g.stroke();
      }
      // per-pixel earth grain multiplied over
      blit(g, earthTex(bbox ? [bbox[0], bbox[1], bbox[2], bbox[3] + depth + 4] : [0, 0, 9999, 9999]), 0.8, 'overlay');
      // vertical chisel marks / erosion streaks
      g.lineCap = 'round';
      for (let i = 0; i < poly.length; i++) if (down[i] && r() < 0.5) {
        const [x, y] = poly[i], l = depth * (0.3 + r() * 0.6);
        g.strokeStyle = css(shade(strata[3], -0.3), 0.22 + r() * 0.2); g.lineWidth = 0.4 + r() * 0.6;
        g.beginPath(); g.moveTo(x, y + depth * 0.15 + r() * 3); g.lineTo(x + (r() - 0.5) * 1.5, y + l); g.stroke();
      }
      // chiselled facets: the face is cut in flat planes, each a slightly different value, with a lit arris between
      { let acc = 0, len = 6 + r() * 12, k = (r() - 0.5) * 0.22;
        for (let i = 0; i < poly.length; i++) {
          const p = poly[i], q = poly[(i + 1) % poly.length]; acc += Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (acc > len) { acc = 0; len = 6 + r() * 14; k = (r() - 0.5) * 0.24; if (down[i]) { g.strokeStyle = 'rgba(255,236,200,.22)'; g.lineWidth = 0.45; g.beginPath(); g.moveTo(q[0], q[1] + 2); g.lineTo(q[0] + (r() - 0.5) * 2, q[1] + depth * (0.7 + r() * 0.3)); g.stroke(); g.strokeStyle = 'rgba(20,14,10,.25)'; g.beginPath(); g.moveTo(q[0] + 0.5, q[1] + 2); g.lineTo(q[0] + 0.5 + (r() - 0.5) * 2, q[1] + depth * 0.9); g.stroke(); } }
          g.fillStyle = k > 0 ? `rgba(255,236,200,${k * 0.6})` : `rgba(20,14,10,${-k})`;
          g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0] + 0.3, q[1]); g.lineTo(q[0] + 0.3, q[1] + depth + 1); g.lineTo(p[0], p[1] + depth + 1); g.fill();
        } }
      // facing: steep (sideways) faces darker, left-facing ones catch the light
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length], dx = q[0] - p[0], dy = q[1] - p[1], m = Math.hypot(dx, dy) || 1;
        const side = Math.abs(dy) / m, nx = dy / m;  // outward normal x for a clockwise outline
        const dark = side * 0.35 + (nx > 0 ? side * 0.15 : -side * 0.1);
        g.fillStyle = dark > 0 ? `rgba(20,16,12,${dark})` : `rgba(255,236,200,${-dark})`;
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0] + 0.3, q[1]); g.lineTo(q[0] + 0.3, q[1] + depth + 1); g.lineTo(p[0], p[1] + depth + 1); g.fill();
      }
      // occlusion at the foot and under the turf lip, a lit band where the face turns down from the lip
      const vg = (k0, k1, c0, c1, w) => { for (let k = k0; k <= k1; k += 0.5) { const t = (k - k0) / Math.max(0.5, k1 - k0); g.strokeStyle = `rgba(${c0},${lerp(c1[0], c1[1], t)})`; g.lineWidth = w; g.beginPath(); trace(g, poly, true, 0, k); g.stroke(); } };
      vg(depth * 0.6, depth + 0.5, '22,16,12', [0, 0.45], 1.2);
      vg(0, 2.4, '26,20,14', [0.55, 0], 1.2);
      vg(2.6, 4.0, '255,232,190', [0.12, 0], 1);
      // embedded pebbles and dangling roots on the visible face
      for (let i = 0; i < poly.length; i += 1) if (down[i]) {
        const [x, y] = poly[i];
        if (r() < 0.07) {
          const px = x + r() * 2, py = y + depth * (0.35 + r() * 0.55), s = 0.8 + r() * 1.6;
          const gr = g.createRadialGradient(px - s * 0.4, py - s * 0.4, 0, px, py, s * 1.2);
          gr.addColorStop(0, css(PAL.stoneLt)); gr.addColorStop(1, css(PAL.stoneDk)); g.fillStyle = gr;
          g.beginPath(); g.ellipse(px, py, s * 1.2, s * 0.85, r(), 0, TAU); g.fill();
          g.fillStyle = 'rgba(20,14,10,.3)'; g.beginPath(); g.ellipse(px + 0.4, py + s * 0.8, s, s * 0.3, 0, 0, TAU); g.fill();
        }
        if (kind !== 'sand' && r() < 0.05) {
          let px = x, py = y + 1.5; const l = depth * (0.35 + r() * 0.75), sw = (r() - 0.5) * 6;
          const pts = []; for (let t = 0; t <= 1.001; t += 0.1) pts.push([px + Math.sin(t * 5 + i) * 1.4 + sw * t * t, py + l * t]);
          g.strokeStyle = css(PAL.root, 0.9); g.lineWidth = 1.1; g.beginPath(); trace(g, pts, false); g.stroke();
          g.strokeStyle = css(shade(PAL.root, 0.45), 0.5); g.lineWidth = 0.4; g.beginPath(); trace(g, pts, false, -0.35, 0); g.stroke();
          if (r() < 0.6) { const b = pts[5]; g.strokeStyle = css(PAL.root, 0.8); g.lineWidth = 0.55; g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo(b[0] + 2, b[1] + 2, b[0] + 2.4 * (r() < 0.5 ? -1 : 1), b[1] + 4 + r() * 3); g.stroke(); }
        }
      }
    });
    // the top surface
    const tb = bbox || [0, 0, 390, 844];
    layer(ctx, g => { trace(g, poly, true); g.fill(); }, g => {
      if (kind === 'sand') {
        blit(g, sandTex(tb));
        sandRipples(g, poly, tb, seed);
      } else {
        blit(g, grassTex(tb, o.tint || 0));
        grassStrokes(g, poly, tb, seed + 3, o.dens || 1, o.tint || 0);
      }
      // the rim: a bevel of light along the top edge, darker turf just inside the lip
      g.save(); g.lineJoin = 'round';
      const top = kind === 'sand' ? PAL.sandLt : PAL.grassLt;
      g.strokeStyle = css(shade(top, 0.15), 0.45); g.lineWidth = 2.2; g.beginPath(); trace(g, poly, true, 0.6, 0.6); g.stroke();
      g.strokeStyle = css(kind === 'sand' ? PAL.sandDk : PAL.grassDk, 0.35); g.lineWidth = 6; g.beginPath(); trace(g, poly, true, 0, 3.2); g.stroke();
      g.restore();
    });
    // turf lip: an overhanging mat of turf, scalloped and uneven, with a few loose blades and a shadow under it
    if (kind !== 'sand') {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const hang = poly.map(([x, y], i) => down[i] ? 1.2 + fbm(x * 0.09, seed, 3) * 4 + Math.max(0, Math.sin(x * 0.7 + seed)) * 1.1 : 0);
      const runs = []; let cur = null;
      for (let i = 0; i < poly.length; i++) { if (down[i]) { if (!cur) runs.push(cur = []); cur.push(i); } else cur = null; }
      for (const run of runs) {
        if (run.length < 2) continue;
        const lo = run.map(i => [poly[i][0], poly[i][1] + hang[i]]);
        blurred(ctx, 1.2, g => { g.strokeStyle = 'rgba(20,14,8,.5)'; g.lineWidth = 2.4; g.beginPath(); trace(g, lo, false, 0.4, 1.4); g.stroke(); });
        const P = new Path2D(); run.forEach((i, k) => k ? P.lineTo(poly[i][0], poly[i][1] - 1) : P.moveTo(poly[i][0], poly[i][1] - 1)); for (let k = lo.length - 1; k >= 0; k--) P.lineTo(lo[k][0], lo[k][1]); P.closePath();
        const gr = ctx.createLinearGradient(0, poly[run[0]][1] - 2, 0, poly[run[0]][1] + 5); gr.addColorStop(0, css(PAL.grass)); gr.addColorStop(1, css(shade(PAL.grassDk, -0.25)));
        ctx.fillStyle = css(shade(PAL.grassDk, -0.1)); ctx.fill(P);
        ctx.strokeStyle = css(shade(PAL.grassDk, -0.35), 0.8); ctx.lineWidth = 0.6; ctx.beginPath(); trace(ctx, lo, false); ctx.stroke();
        for (const i of run) {
          if (r() < 0.55) continue;
          const [x, y] = poly[i], bx = x + r() * 2 - 1, l = hang[i] + 0.6 + r() * 1.8, lean = (r() - 0.5) * 2;
          ctx.strokeStyle = css(r() < 0.6 ? shade(PAL.grassDk, -0.1 - r() * 0.2) : shade(PAL.grass, r() * 0.2), 0.9); ctx.lineWidth = 0.4 + r() * 0.35;
          ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + lean * 0.5, y + l * 0.5, bx + lean, y + l); ctx.stroke();
        }
        // lit rim along the turf's top edge
        ctx.strokeStyle = css(PAL.grassLt, 0.55); ctx.lineWidth = 0.6; ctx.beginPath(); run.forEach((i, k) => k ? ctx.lineTo(poly[i][0], poly[i][1] - 0.6) : ctx.moveTo(poly[i][0], poly[i][1] - 0.6)); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function sandRipples(g, poly, bbox, seed) {
    const r = rng(seed + 9); g.lineCap = 'round';
    for (let i = 0; i < (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) * 0.012; i++) {
      const x = lerp(bbox[0], bbox[2], r()), y = lerp(bbox[1], bbox[3], r()), l = 6 + r() * 14, a = (fbm(x * 0.01, y * 0.01, 2) - 0.5) * 0.8;
      g.strokeStyle = css(PAL.sandDk, 0.18); g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x - l / 2, y); g.quadraticCurveTo(x, y - 1.5 + a * 3, x + l / 2, y + a * 4); g.stroke();
      g.strokeStyle = css(PAL.sandLt, 0.28); g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(x - l / 2, y - 0.8); g.quadraticCurveTo(x, y - 2.3 + a * 3, x + l / 2, y - 0.8 + a * 4); g.stroke();
    }
  }

  // ---------------- sea ----------------
  function sea(ctx, bbox, seed) {
    blit(ctx, seaTex(bbox));
    const r = rng(seed); ctx.save(); ctx.lineCap = 'round';
    // painted swell: long soft crescents, lighter on top, a darker trough under
    for (let i = 0; i < (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) * 0.012; i++) {
      const x = lerp(bbox[0] - 10, bbox[2] + 10, r()), y = lerp(bbox[1], bbox[3], r()), l = 5 + r() * 16, t = (y - bbox[1]) / (bbox[3] - bbox[1]);
      ctx.strokeStyle = `rgba(14,34,44,${0.12 + r() * 0.12})`; ctx.lineWidth = 0.8 + r() * 0.8;
      ctx.beginPath(); ctx.moveTo(x - l / 2, y + 1); ctx.quadraticCurveTo(x, y + 2.2, x + l / 2, y + 1); ctx.stroke();
      ctx.strokeStyle = css(mix(PAL.seaShallow, PAL.foam, 0.3 * (1 - t)), (0.1 + r() * 0.18) * (1 - t * 0.6)); ctx.lineWidth = 0.4 + r() * 0.5;
      ctx.beginPath(); ctx.moveTo(x - l / 2, y); ctx.quadraticCurveTo(x, y - 1.6, x + l / 2, y); ctx.stroke();
    }
    // glints
    for (let i = 0; i < 70; i++) { const x = lerp(bbox[0], bbox[2], r()), y = lerp(bbox[1], bbox[3], r()); ctx.fillStyle = `rgba(230,240,226,${0.15 + r() * 0.3})`; ctx.fillRect(x, y, 0.6 + r() * 2.2, 0.4); }
    ctx.restore();
  }
  // shallows + surf hugging a coastline (coast: dense open polyline along the slab foot, sea below it)
  function surf(ctx, coast, seed, depth) {
    const r = rng(seed); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    blurred(ctx, 7, g => { g.strokeStyle = css(PAL.seaShallow, 0.55); g.lineWidth = 34; g.beginPath(); trace(g, coast, false, 0, depth + 6); g.stroke(); });
    blurred(ctx, 3, g => { g.strokeStyle = css(mix(PAL.seaShallow, PAL.foam, 0.25), 0.5); g.lineWidth = 9; g.beginPath(); trace(g, coast, false, 0, depth + 3); g.stroke(); });
    // foam bands, broken into dabs, fading seaward
    for (let band = 0; band < 4; band++) {
      const off = depth + 1 + band * (4.5 + band * 1.6), a = [0.85, 0.5, 0.3, 0.16][band];
      for (let i = 0; i < coast.length - 1; i++) {
        if (fbm(i * 0.12 + band * 7, band, 2) < 0.38 + band * 0.04) continue;
        const p = coast[i], q = coast[i + 1], w = Math.sin(i * 0.3 + band) * 1.2;
        ctx.strokeStyle = css(PAL.foam, a * (0.6 + r() * 0.4)); ctx.lineWidth = band ? 0.7 + r() * 0.5 : 1.4 + r();
        ctx.beginPath(); ctx.moveTo(p[0], p[1] + off + w); ctx.lineTo(q[0], q[1] + off + Math.sin((i + 1) * 0.3 + band) * 1.2); ctx.stroke();
      }
    }
    // bubbles
    for (let i = 0; i < coast.length; i += 1) if (r() < 0.5) { const p = coast[i]; ctx.fillStyle = css(PAL.foam, 0.25 + r() * 0.4); ctx.beginPath(); ctx.arc(p[0] + r() * 3, p[1] + depth + 2 + r() * 10, 0.3 + r() * 0.7, 0, TAU); ctx.fill(); }
    // wet dark line where water meets the slab foot
    ctx.strokeStyle = 'rgba(20,34,36,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); trace(ctx, coast, false, 0, depth + 0.4); ctx.stroke();
    ctx.restore();
  }

  // ---------------- water (creek) ----------------
  function creekBed(ctx, P, w, seed) {
    const r = rng(seed); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // damp, darker grass either side of the cut
    blurred(ctx, 4, g => { g.strokeStyle = 'rgba(24,40,22,.32)'; g.lineWidth = w + 18; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); trace(g, P, false, 1, 1.5); g.stroke(); });
    // carved bank: a dark cut with a muddy lit edge
    ctx.strokeStyle = css(shade(PAL.earth[1], -0.3)); ctx.lineWidth = w + 7; ctx.beginPath(); trace(ctx, P, false); ctx.stroke();
    ctx.strokeStyle = css(PAL.earth[0]); ctx.lineWidth = w + 4.5; ctx.beginPath(); trace(ctx, P, false, -0.6, -0.8); ctx.stroke();
    ctx.strokeStyle = css(shade(PAL.earth[3], -0.2)); ctx.lineWidth = w + 2; ctx.beginPath(); trace(ctx, P, false, 0.3, 0.5); ctx.stroke();
    // water body: deep centre, lighter edges, a soft lit band toward the upper left
    const L = lengths(P);
    ctx.strokeStyle = css(PAL.water); ctx.lineWidth = w; ctx.beginPath(); trace(ctx, P, false); ctx.stroke();
    ctx.strokeStyle = css(shade(PAL.water, -0.25)); ctx.lineWidth = w * 0.5; ctx.beginPath(); trace(ctx, P, false, 0.6, 0.8); ctx.stroke();
    ctx.strokeStyle = css(PAL.waterLt, 0.45); ctx.lineWidth = w * 0.22; ctx.beginPath(); trace(ctx, P, false, -w * 0.28, -w * 0.18); ctx.stroke();
    // ripples: short chevrons pointing downstream, pale and broken
    for (let d = 2; d < L[L.length - 1]; d += 1.6) {
      const p = at(P, L, d), nx = -p.ty, ny = p.tx, off = (r() - 0.5) * w * 0.7, l = 1.5 + r() * 2.5;
      ctx.strokeStyle = css(PAL.waterLt, 0.18 + r() * 0.35); ctx.lineWidth = 0.35 + r() * 0.35;
      ctx.beginPath(); ctx.moveTo(p.x + nx * off - p.tx * l, p.y + ny * off - p.ty * l); ctx.quadraticCurveTo(p.x + nx * (off + 0.8), p.y + ny * (off + 0.8), p.x + nx * off + p.tx * l, p.y + ny * off + p.ty * l); ctx.stroke();
    }
    // bank stones
    for (let d = 3; d < L[L.length - 1]; d += 5 + r() * 6) {
      const p = at(P, L, d), side = r() < 0.5 ? -1 : 1, x = p.x - p.ty * side * (w / 2 + 1.2), y = p.y + p.tx * side * (w / 2 + 1.2);
      pebble(ctx, x, y, 1 + r() * 1.3, r);
    }
    ctx.restore();
  }
  function pebble(ctx, x, y, s, r) {
    const gr = ctx.createRadialGradient(x - s * 0.4, y - s * 0.5, 0, x, y, s * 1.3);
    gr.addColorStop(0, css(PAL.stoneLt)); gr.addColorStop(0.6, css(PAL.stone)); gr.addColorStop(1, css(PAL.stoneDk));
    ctx.fillStyle = 'rgba(20,18,14,.3)'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + s * 0.6, s * 1.2, s * 0.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, s * 1.2, s * 0.9, r() * 3, 0, TAU); ctx.fill();
  }
  // water tumbling down a carved face from (x,y), w wide, depth tall
  function cascade(ctx, x, y, w, depth, seed) {
    const r = rng(seed); ctx.save(); ctx.lineCap = 'round';
    const gr = ctx.createLinearGradient(0, y, 0, y + depth); gr.addColorStop(0, css(PAL.water)); gr.addColorStop(1, css(mix(PAL.waterLt, PAL.foam, 0.4)));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - w / 2, y - 1); ctx.quadraticCurveTo(x - w / 2 - 1, y + depth * 0.6, x - w / 2 - 2, y + depth); ctx.lineTo(x + w / 2 + 2, y + depth); ctx.quadraticCurveTo(x + w / 2 + 1, y + depth * 0.6, x + w / 2, y - 1); ctx.fill();
    for (let i = 0; i < w * 3; i++) { const sx = x - w / 2 + r() * w, l = depth * (0.3 + r() * 0.7), s0 = y + r() * depth * 0.3; ctx.strokeStyle = css(PAL.foam, 0.2 + r() * 0.5); ctx.lineWidth = 0.3 + r() * 0.5; ctx.beginPath(); ctx.moveTo(sx, s0); ctx.lineTo(sx + (sx - x) * 0.08, s0 + l); ctx.stroke(); }
    // lip glint and plunge foam
    ctx.strokeStyle = css(PAL.foam, 0.7); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y + 1.4, x + w / 2, y); ctx.stroke();
    for (let i = 0; i < w * 2.2; i++) { const a = r() * TAU, d = r() * w * 0.75; ctx.fillStyle = css(PAL.foam, 0.3 + r() * 0.5); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + depth + Math.sin(a) * d * 0.35, 0.5 + r() * 1.3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // shallow stream meandering across sand into the sea: wet halo, a shallow cut, clear water over sand, ripples
  function stream(ctx, P, w0, w1, seed) {
    const r = rng(seed), L = lengths(P), tot = L[L.length - 1]; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const W = d => lerp(w0, w1, Math.pow(d / tot, 1.6));
    const band = (wf, col, dx = 0, dy = 0) => { for (let d = 0; d < tot; d += 0.5) { const p = at(P, L, d), w = wf(W(d)); ctx.fillStyle = col(d / tot); ctx.beginPath(); ctx.arc(p.x + dx, p.y + dy, w / 2, 0, TAU); ctx.fill(); } };
    blurred(ctx, 3, () => band(w => w + 10, () => css(PAL.wetSand, 0.05)));
    band(w => w + 3, () => css(shade(PAL.sandDk, -0.2), 0.12));
    band(w => w, t => css(mix(PAL.water, PAL.seaShallow, t), 0.08));
    band(w => w * 0.55, t => css(shade(mix(PAL.water, PAL.seaShallow, t), -0.2), 0.05), 0.4, 0.4);
    for (let d = 0; d < tot; d += 1) { const p = at(P, L, d), w = W(d), off = (r() - 0.5) * w * 0.8, l = 1 + r() * 2; ctx.strokeStyle = css(PAL.foam, 0.15 + r() * 0.3); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(p.x - p.ty * off - p.tx * l, p.y + p.tx * off - p.ty * l); ctx.quadraticCurveTo(p.x - p.ty * (off + 0.6), p.y + p.tx * (off + 0.6), p.x - p.ty * off + p.tx * l, p.y + p.tx * off + p.ty * l); ctx.stroke(); }
    // lit wet rim on the left bank
    ctx.strokeStyle = css(PAL.sandLt, 0.35); ctx.lineWidth = 0.6; ctx.beginPath();
    for (let d = 0; d < tot; d += 1) { const p = at(P, L, d), w = W(d) / 2 + 1.5; d ? ctx.lineTo(p.x + p.ty * w, p.y - p.tx * w) : ctx.moveTo(p.x + p.ty * w, p.y - p.tx * w); } ctx.stroke();
    ctx.restore();
  }

  // ---------------- road ----------------
  // P: dense polyline; done: arc length up to which the road is completed (gold studs)
  function road(ctx, P, o = {}) {
    const r = rng(o.seed || 5), L = lengths(P), tot = L[L.length - 1], W = o.w || 13; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    blurred(ctx, 2.5, g => { g.strokeStyle = 'rgba(30,22,14,.5)'; g.lineWidth = W + 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); trace(g, P, false, 0.8, 1.6); g.stroke(); });
    // packed earth with grain
    const bb = P.reduce((b, p) => [Math.min(b[0], p[0] - W), Math.min(b[1], p[1] - W), Math.max(b[2], p[0] + W), Math.max(b[3], p[1] + W)], [1e9, 1e9, -1e9, -1e9]);
    layer(ctx, g => { g.lineWidth = W; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#fff'; trace(g, P, false); g.stroke(); }, g => {
      blit(g, pixels(bb, (x, y) => { const n = fbm(x * 0.06, y * 0.06, 3), f = vnoise(x * 1.8, y * 1.8), s = vnoise(x * 0.9 + 30, y * 0.9); let c = mix(PAL.roadDk, PAL.roadLt, clamp(n * 1.3 - 0.1)); let k = (f - 0.5) * 0.2; if (s > 0.86) k -= 0.2; return shade(c, k); }));
      // worn ruts: darker either side of a lit crown
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = css(PAL.roadDk, 0.35); g.lineWidth = W; g.beginPath(); trace(g, P, false, 0.8, 1.2); g.stroke();
      g.strokeStyle = css(PAL.roadLt, 0.5); g.lineWidth = W * 0.45; g.beginPath(); trace(g, P, false, -0.6, -0.8); g.stroke();
      for (let d = 0; d < tot; d += 0.9) { const p = at(P, L, d), off = (r() - 0.5) * W * 0.9; g.fillStyle = css(r() < 0.5 ? PAL.roadDk : PAL.roadLt, 0.35); g.fillRect(p.x - p.ty * off, p.y + p.tx * off, 0.5 + r() * 0.8, 0.5); }
      if (o.dim) { g.fillStyle = 'rgba(30,40,30,.18)'; g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
    });
    // edging stones both sides
    for (const side of [-1, 1]) for (let d = 0; d < tot; d += 2.6 + r() * 1.4) {
      const p = at(P, L, d), off = side * (W / 2 + 0.6 + r() * 0.6);
      pebble(ctx, p.x - p.ty * off, p.y + p.tx * off, 0.9 + r() * 0.8, r);
    }
    // completed road: inlaid gold studs, glowing softly
    if (o.done) for (let d = o.done[0]; d < Math.min(tot, o.done[1]); d += 9) {
      const p = at(P, L, d);
      const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 5); gl.addColorStop(0, 'rgba(255,214,120,.5)'); gl.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
      const gr = ctx.createRadialGradient(p.x - 0.6, p.y - 0.7, 0, p.x, p.y, 2); gr.addColorStop(0, css(PAL.goldLt)); gr.addColorStop(0.5, css(PAL.gold)); gr.addColorStop(1, css(PAL.goldDk));
      ctx.fillStyle = 'rgba(60,36,10,.45)'; ctx.beginPath(); ctx.arc(p.x + 0.3, p.y + 0.6, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // carved plank steps where a road climbs a slab face: centred on (x, y) = road at the lip, going down `depth`
  function steps(ctx, x, y, depth, w, ang, seed) {
    const r = rng(seed), n = Math.max(3, Math.round(depth / 5)); ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(24,16,10,.5)'; ctx.fillRect(-w / 2 - 1.5, -1, w + 3, depth + 2);
    for (let i = 0; i < n; i++) {
      const y0 = i * depth / n, h = depth / n;
      ctx.fillStyle = css(shade(PAL.earth[1], -0.3)); ctx.fillRect(-w / 2, y0, w, h);
      plank(ctx, -w / 2 - 0.5, y0, w + 1, h * 0.62, r);
    }
    ctx.restore();
  }
  function plank(ctx, x, y, w, h, r, base = PAL.wood) {
    const c = shade(base, (r() - 0.5) * 0.25), gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, css(shade(c, 0.3))); gr.addColorStop(0.35, css(c)); gr.addColorStop(1, css(shade(c, -0.35)));
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = css(shade(c, -0.4), 0.55); ctx.lineWidth = 0.3;
    for (let k = 0; k < 3; k++) { const gy = y + h * (0.25 + k * 0.25) + (r() - 0.5) * 0.4; ctx.beginPath(); ctx.moveTo(x, gy); for (let gx = x; gx <= x + w; gx += 2) ctx.lineTo(gx, gy + Math.sin(gx * 0.4 + k * 2 + r()) * 0.25); ctx.stroke(); }
    if (r() < 0.4) { ctx.fillStyle = css(shade(c, -0.45), 0.7); ctx.beginPath(); ctx.ellipse(x + w * (0.2 + r() * 0.6), y + h / 2, 0.8, 0.4, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = css(PAL.woodDk, 0.8); ctx.beginPath(); ctx.arc(x + 1.1, y + h / 2, 0.35, 0, TAU); ctx.arc(x + w - 1.1, y + h / 2, 0.35, 0, TAU); ctx.fill();
  }
  function bridge(ctx, x, y, ang, len, w, seed) {
    const r = rng(seed); ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    // shadow on the water
    blurred(ctx, 2, g => { g.fillStyle = 'rgba(10,20,22,.45)'; g.fillRect(-w / 2 + 2, -len / 2 + 3, w, len); });
    // stringers then planks across
    ctx.fillStyle = css(PAL.woodDk); ctx.fillRect(-w / 2 + 0.5, -len / 2, 2.2, len); ctx.fillRect(w / 2 - 2.7, -len / 2, 2.2, len);
    for (let yy = -len / 2; yy < len / 2 - 0.5; yy += 3.1) { ctx.save(); ctx.translate(0, 0); plank(ctx, -w / 2 - 0.8 + (r() - 0.5) * 0.8, yy, w + 1.6, 2.6, r); ctx.restore(); }
    // posts and rope rails
    for (const sx of [-w / 2 - 1.2, w / 2 + 1.2]) {
      for (const sy of [-len / 2 + 1, len / 2 - 1]) post(ctx, sx, sy, 1.4, 6);
      ctx.strokeStyle = css(PAL.strawDk); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(sx, -len / 2 - 4.5); ctx.quadraticCurveTo(sx + (sx > 0 ? 1 : -1) * 0.8, -2, sx, len / 2 - 4.5); ctx.stroke();
      ctx.strokeStyle = css(PAL.strawLt, 0.6); ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(sx - 0.3, -len / 2 - 4.9); ctx.quadraticCurveTo(sx - 0.3 + (sx > 0 ? 1 : -1) * 0.8, -2.4, sx - 0.3, len / 2 - 4.9); ctx.stroke();
    }
    ctx.restore();
  }
  function post(ctx, x, y, rad, h) {   // a stubby log standing up, seen from above-front: body then lit end grain
    const gr = ctx.createLinearGradient(x - rad, 0, x + rad, 0); gr.addColorStop(0, css(PAL.woodLt)); gr.addColorStop(1, css(PAL.woodDk));
    ctx.fillStyle = 'rgba(20,14,8,.35)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 0.8, rad * 1.4, rad * 0.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = gr; ctx.fillRect(x - rad, y - h, rad * 2, h);
    ctx.fillStyle = css(shade(PAL.woodLt, 0.15)); ctx.beginPath(); ctx.ellipse(x, y - h, rad, rad * 0.55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(PAL.wood, 0.8); ctx.lineWidth = 0.25; ctx.beginPath(); ctx.ellipse(x, y - h, rad * 0.55, rad * 0.3, 0, 0, TAU); ctx.stroke();
  }

  // ---------------- props ----------------
  function rock(ctx, x, y, s, seed, o = {}) {
    const r = rng(seed), pts = cr(blobPts(x, y, s * 1.15, s * 0.8, seed, 0.16, 10), true, 5);
    blurred(ctx, s * 0.25, g => { g.fillStyle = o.wet ? 'rgba(10,26,30,.4)' : 'rgba(20,22,16,.45)'; g.beginPath(); g.ellipse(x + s * 0.35, y + s * 0.55, s * 1.2, s * 0.55, 0, 0, TAU); g.fill(); });
    layer(ctx, g => { trace(g, pts, true); g.fill(); }, g => {
      const gr = g.createRadialGradient(x - s * 0.45, y - s * 0.5, 0, x, y, s * 1.5);
      gr.addColorStop(0, css(PAL.stoneLt)); gr.addColorStop(0.5, css(PAL.stone)); gr.addColorStop(1, css(shade(PAL.stoneDk, -0.2)));
      g.fillStyle = gr; g.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
      blit(g, pixels([x - s * 1.5, y - s * 1.2, x + s * 1.5, y + s * 1.2], (px, py) => { const n = vnoise(px * 1.4, py * 1.4), m = fbm(px * 0.3, py * 0.3, 2); const v = 128 + (n - 0.5) * 60 + (m - 0.5) * 50; return [v, v, v]; }), 0.6, 'overlay');
      // strata seams
      for (let k = 0; k < 3; k++) { const yy = y - s * 0.2 + k * s * 0.32; g.strokeStyle = css(PAL.stoneDk, 0.4); g.lineWidth = 0.4; g.beginPath(); g.moveTo(x - s * 1.4, yy); g.bezierCurveTo(x - s * 0.4, yy - s * 0.15, x + s * 0.3, yy + s * 0.2, x + s * 1.4, yy - s * 0.05); g.stroke(); }
      // cracks: dark jagged line with a lit lip
      for (let k = 0; k < 2 + s / 8; k++) {
        let cx = x + (r() - 0.5) * s, cy = y - s * 0.5 + r() * s * 0.4; const P = [[cx, cy]];
        for (let j = 0; j < 4; j++) { cx += (r() - 0.5) * s * 0.4; cy += s * 0.18 + r() * s * 0.12; P.push([cx, cy]); }
        g.strokeStyle = 'rgba(30,28,24,.75)'; g.lineWidth = 0.55; g.beginPath(); trace(g, P, false); g.stroke();
        g.strokeStyle = css(PAL.stoneLt, 0.5); g.lineWidth = 0.35; g.beginPath(); trace(g, P, false, -0.45, -0.2); g.stroke();
      }
      // moss on the lit top, stippled
      if (o.moss !== false) for (let i = 0; i < s * s * 2.2; i++) {
        const a = r() * TAU, d = Math.sqrt(r()) * s; const px = x - s * 0.2 + Math.cos(a) * d * 1.05, py = y - s * 0.55 + Math.sin(a) * d * 0.45;
        if (fbm(px * 0.3, py * 0.3, 2) < 0.45) continue;
        g.fillStyle = css(r() < 0.35 ? PAL.mossLt : shade(PAL.moss, -r() * 0.3), 0.75); g.beginPath(); g.arc(px, py, 0.35 + r() * 0.55, 0, TAU); g.fill();
      }
      // occlusion at the base
      const ao = g.createLinearGradient(0, y, 0, y + s); ao.addColorStop(0, 'rgba(20,18,14,0)'); ao.addColorStop(1, 'rgba(20,18,14,.45)'); g.fillStyle = ao; g.fillRect(x - s * 2, y, s * 4, s);
    });
    // a fine bright highlight stroke along the lit shoulder
    ctx.save(); ctx.strokeStyle = 'rgba(240,236,214,.5)'; ctx.lineWidth = 0.6; ctx.beginPath();
    const n = pts.length; for (let i = Math.floor(n * 0.5); i < Math.floor(n * 0.78); i++) i === Math.floor(n * 0.5) ? ctx.moveTo(pts[i][0] + 0.6, pts[i][1] + 0.6) : ctx.lineTo(pts[i][0] + 0.6, pts[i][1] + 0.6);
    ctx.stroke(); ctx.restore();
    if (o.wet) { ctx.save(); ctx.strokeStyle = css(PAL.foam, 0.55); ctx.lineWidth = 0.8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + 0.5, y + s * 0.45, s * (1.3 + k * 0.35), s * (0.42 + k * 0.14), 0, 0.1 + k * 0.3, Math.PI - 0.1 - k * 0.2); ctx.stroke(); } ctx.restore(); }
  }

  // a jungle mass: one big readable canopy shape, leaf-stroke texture, lit top-left, receding cool and muted
  function canopy(ctx, cx, cy, rx, ry, seed, o = {}) {
    const r = rng(seed), lobes = [];
    const n = o.lobes || 9; for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.62; lobes.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (0.24 + r() * 0.34) * Math.min(rx, ry) * 1.2]); }
    lobes.sort((a, b) => a[1] - b[1]);
    const cool = o.cool || 0, base = mix(PAL.leaf, [46, 66, 62], cool), mid = mix(PAL.leafMid, [74, 98, 86], cool), lt = mix(PAL.leafLt, [124, 142, 118], cool);
    blurred(ctx, Math.min(rx, ry) * 0.18, g => { g.fillStyle = 'rgba(14,22,16,.5)'; g.beginPath(); for (const [x, y, s] of lobes) { g.moveTo(x + s + rx * 0.12, y + ry * 0.2); g.arc(x + rx * 0.12, y + ry * 0.2, s, 0, TAU); } g.fill(); });
    const maskF = g => { for (const [x, y, s] of lobes) { g.moveTo(x + s, y); g.arc(x, y, s, 0, TAU); } g.fill(); };
    layer(ctx, maskF, g => {
      g.fillStyle = css(shade(base, -0.15)); g.fillRect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4);
      for (const [x, y, s] of lobes) {
        const gr = g.createRadialGradient(x - s * 0.4, y - s * 0.45, s * 0.1, x, y, s * 1.05);
        gr.addColorStop(0, css(mid)); gr.addColorStop(0.7, css(base)); gr.addColorStop(1, css(shade(base, -0.4)));
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
        // leaf strokes: small pointed leaves, brighter toward the lit side of each lobe
        for (let i = 0; i < s * s * 1.6; i++) {
          const a = r() * TAU, d = Math.sqrt(r()) * s, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d;
          const lit = clamp(0.5 - (Math.cos(a) * 0.6 + Math.sin(a) * 0.8) * d / s * 0.6 + (r() - 0.5) * 0.3);
          const c = lit > 0.62 ? mix(mid, lt, (lit - 0.62) * 2.5) : mix(shade(base, -0.3), mid, lit / 0.62);
          const ang = a + 1.2 + (r() - 0.5), L = 1.4 + r() * 1.8;
          g.fillStyle = css(c, 0.8); g.beginPath();
          g.moveTo(lx - Math.cos(ang) * L, ly - Math.sin(ang) * L);
          g.quadraticCurveTo(lx - Math.sin(ang) * L * 0.4, ly + Math.cos(ang) * L * 0.4, lx + Math.cos(ang) * L, ly + Math.sin(ang) * L);
          g.quadraticCurveTo(lx + Math.sin(ang) * L * 0.4, ly - Math.cos(ang) * L * 0.4, lx - Math.cos(ang) * L, ly - Math.sin(ang) * L); g.fill();
          if (lit > 0.85 && r() < 0.4) { g.strokeStyle = css(PAL.leafRim, 0.5); g.lineWidth = 0.3; g.beginPath(); g.moveTo(lx - Math.cos(ang) * L * 0.8, ly - Math.sin(ang) * L * 0.8); g.lineTo(lx + Math.cos(ang) * L * 0.6, ly + Math.sin(ang) * L * 0.6); g.stroke(); }
        }
        // lobe underside shadow on the lobes below it
        g.strokeStyle = css(shade(base, -0.5), 0.35); g.lineWidth = 1.6; g.beginPath(); g.arc(x + 0.5, y + 0.8, s, 0.2, Math.PI - 0.2); g.stroke();
      }
      if (o.haze) { g.fillStyle = `rgba(150,170,156,${o.haze})`; g.fillRect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4); }
    });
    // coloured rim on the lit edge of the top lobes
    ctx.save(); ctx.lineCap = 'round';
    for (const [x, y, s] of lobes) { ctx.strokeStyle = css(PAL.leafRim, 0.22); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y, s - 0.5, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke(); }
    ctx.restore();
  }

  function palm(ctx, x, y, h, lean, seed, o = {}) {
    const r = rng(seed), tx = x + lean * h, ty = y - h, cx = x + lean * h * 0.35, cy = y - h * 0.55, s = o.s || 1;
    const Q = t => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty];
    // ground shadow: trunk streak + frond crown splash (light upper left -> shadow lower right)
    blurred(ctx, 2.5 * s, g => {
      g.fillStyle = 'rgba(14,22,14,.38)'; g.beginPath(); g.ellipse(x + 3 * s, y + 1, 4 * s, 2 * s, 0, 0, TAU); g.fill();
      g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.moveTo(x + 14 * s, y + 7 * s); g.ellipse(x + 14 * s + Math.cos(a) * 9 * s, y + 7 * s + Math.sin(a) * 4 * s, 7 * s, 2.2 * s, a, 0, TAU); } g.fill();
    });
    // trunk: stacked ring segments, lit on the left, with ridge highlights
    for (let i = 0; i <= 28; i++) {
      const t = i / 28, [px, py] = Q(t), w = (3.4 - t * 1.4) * s;
      const gr = ctx.createLinearGradient(px - w, 0, px + w, 0);
      gr.addColorStop(0, css(shade(PAL.trunk, 0.25))); gr.addColorStop(0.45, css(PAL.trunk)); gr.addColorStop(1, css(PAL.trunkDk));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(px, py, w, w * 0.7, 0, 0, TAU); ctx.fill();
      if (i % 2 === 0) { ctx.strokeStyle = css(shade(PAL.trunkDk, -0.2), 0.7); ctx.lineWidth = 0.45 * s; ctx.beginPath(); ctx.ellipse(px, py + w * 0.15, w * 0.98, w * 0.55, 0, 0.15, Math.PI - 0.15); ctx.stroke(); ctx.strokeStyle = 'rgba(244,222,180,.35)'; ctx.lineWidth = 0.35 * s; ctx.beginPath(); ctx.ellipse(px, py - w * 0.2, w * 0.9, w * 0.5, 0, Math.PI + 0.5, Math.PI * 1.55); ctx.stroke(); }
    }
    // coconuts
    for (let i = 0; i < 3; i++) { const a = 0.6 + i * 0.9, px = tx + Math.cos(a) * 2.6 * s, py = ty + 1.5 * s + Math.sin(a) * 1.4 * s; const gr = ctx.createRadialGradient(px - 0.6 * s, py - 0.7 * s, 0, px, py, 2 * s); gr.addColorStop(0, '#a87a4a'); gr.addColorStop(1, '#4a3020'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, 1.9 * s, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,230,190,.5)'; ctx.beginPath(); ctx.arc(px - 0.7 * s, py - 0.7 * s, 0.45 * s, 0, TAU); ctx.fill(); }
    // fronds: far ones first (darker), near/lit ones last
    const fr = []; const N = o.fronds || 9;
    for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i / N) * TAU + (r() - 0.5) * 0.35; fr.push({ a, len: (17 + r() * 7) * s, droop: 0.35 + r() * 0.25 }); }
    fr.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    for (const f of fr) {
      const back = Math.sin(f.a) < -0.2, ex = tx + Math.cos(f.a) * f.len, ey = ty + Math.sin(f.a) * f.len * 0.62 + f.len * f.droop * 0.55;
      const mx = tx + Math.cos(f.a) * f.len * 0.55, my = ty + Math.sin(f.a) * f.len * 0.4 - f.len * 0.12;
      const lit = clamp(0.5 - Math.cos(f.a) * 0.35 - Math.sin(f.a) * 0.3), base = mix(PAL.palmDk, PAL.palm, back ? 0.35 : 0.8), hi = mix(PAL.palm, PAL.palmLt, lit);
      const S = []; for (let k = 0; k <= 16; k++) { const t = k / 16; S.push([(1 - t) * (1 - t) * tx + 2 * (1 - t) * t * mx + t * t * ex, (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * my + t * t * ey]); }
      ctx.lineCap = 'round';
      // leaflets both sides of the spine
      for (let k = 1; k < 16; k++) {
        const [px, py] = S[k], [qx, qy] = S[k + 1], dx = qx - px, dy = qy - py, m = Math.hypot(dx, dy) || 1, t = k / 16, ll = (1 - Math.abs(t - 0.45) * 1.3) * 6.5 * s;
        for (const sd of [-1, 1]) {
          const nx = -dy / m * sd, ny = dx / m * sd, lx = px + (nx * 0.75 + dx / m * 0.45) * ll, ly = py + (ny * 0.75 + dy / m * 0.45) * ll + ll * 0.35;
          const c = sd < 0 ? mix(base, hi, 0.75) : shade(base, -0.12);
          ctx.strokeStyle = css(c); ctx.lineWidth = 1.5 * s * (1 - t * 0.5);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + nx * ll * 0.5, py + ny * ll * 0.5 - 0.4, lx, ly); ctx.stroke();
          if (sd < 0 && k % 2) { ctx.strokeStyle = css(PAL.leafRim, 0.35 * lit + 0.1); ctx.lineWidth = 0.3 * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + nx * ll * 0.5, py + ny * ll * 0.5 - 0.6, lx, ly - 0.3); ctx.stroke(); }
        }
      }
      ctx.strokeStyle = css(shade(hi, 0.1)); ctx.lineWidth = 0.9 * s; ctx.beginPath(); trace(ctx, S, false); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,236,190,.35)'; ctx.lineWidth = 0.35 * s; ctx.beginPath(); trace(ctx, S.slice(0, 11), false, -0.3, -0.3); ctx.stroke();
    }
    // crown boss
    const gr = ctx.createRadialGradient(tx - 1, ty - 1, 0, tx, ty, 3.2 * s); gr.addColorStop(0, css(PAL.palmLt)); gr.addColorStop(1, css(PAL.palmDk)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(tx, ty, 2.6 * s, 0, TAU); ctx.fill();
  }

  // stilt hut on the sand; (x, y) = ground under the platform's front centre
  function hut(ctx, x, y, s, seed) {
    const r = rng(seed); ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    blurred(ctx, 4 * s, g => { g.fillStyle = 'rgba(30,26,18,.45)'; g.beginPath(); g.ellipse(14, 4, 46, 11, 0, 0, TAU); g.fill(); });
    const PY = -18;   // platform front edge height
    // stilts
    for (const sx of [-30, -12, 12, 30]) { post(ctx, sx, 2, 1.8, 20); ctx.fillStyle = 'rgba(20,14,8,.25)'; ctx.fillRect(sx - 1.8, -6, 3.6, 2); }
    for (const sx of [-21, 21]) { post(ctx, sx, -6, 1.5, 14); }
    // cross bracing
    ctx.strokeStyle = css(PAL.woodDk, 0.9); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-30, -2); ctx.lineTo(-12, PY + 2); ctx.moveTo(-12, -2); ctx.lineTo(-30, PY + 2); ctx.moveTo(12, -2); ctx.lineTo(30, PY + 2); ctx.moveTo(30, -2); ctx.lineTo(12, PY + 2); ctx.stroke();
    // platform deck (top face) + front beam
    ctx.save(); ctx.beginPath(); ctx.rect(-36, PY - 12, 72, 12); ctx.clip();
    for (let yy = PY - 12; yy < PY; yy += 2.4) plank(ctx, -36 + (r() - 0.5), yy, 72, 2.2, r);
    ctx.restore();
    const bm = ctx.createLinearGradient(0, PY, 0, PY + 3.5); bm.addColorStop(0, css(PAL.woodLt)); bm.addColorStop(1, css(PAL.woodDk)); ctx.fillStyle = bm; ctx.fillRect(-37, PY, 74, 3.5);
    ctx.strokeStyle = 'rgba(255,230,190,.4)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-37, PY + 0.4); ctx.lineTo(37, PY + 0.4); ctx.stroke();
    // ladder down to the sand
    ctx.save(); ctx.translate(-26, PY + 2);
    ctx.strokeStyle = css(PAL.wood); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-6, 21); ctx.moveTo(4, 0); ctx.lineTo(6, 21); ctx.stroke();
    for (let k = 3; k < 21; k += 4) { ctx.strokeStyle = css(PAL.woodLt); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4 - k * 0.1, k); ctx.lineTo(4 + k * 0.1, k); ctx.stroke(); }
    ctx.restore();
    // walls: vertical cane, darker toward the right, a warm doorway
    const WY = PY - 8, WH = 22;
    ctx.save(); ctx.beginPath(); ctx.rect(-25, WY - WH, 50, WH); ctx.clip();
    for (let cx = -25; cx < 25; cx += 2.1) { const c = shade(PAL.cane, (r() - 0.5) * 0.2 - (cx + 25) / 50 * 0.25), gr = ctx.createLinearGradient(cx, 0, cx + 2.1, 0); gr.addColorStop(0, css(shade(c, 0.25))); gr.addColorStop(1, css(shade(c, -0.3))); ctx.fillStyle = gr; ctx.fillRect(cx, WY - WH, 2.1, WH); ctx.fillStyle = css(shade(c, -0.4), 0.6); for (let ny = WY - WH + 3 + r() * 3; ny < WY; ny += 6 + r() * 3) ctx.fillRect(cx, ny, 2.1, 0.5); }
    ctx.fillStyle = css(PAL.strawDk); ctx.fillRect(-25, WY - WH * 0.55, 50, 1.6);   // lashing band
    const sh = ctx.createLinearGradient(0, WY - WH, 0, WY - WH + 8); sh.addColorStop(0, 'rgba(20,14,8,.6)'); sh.addColorStop(1, 'rgba(20,14,8,0)'); ctx.fillStyle = sh; ctx.fillRect(-25, WY - WH, 50, 8);
    ctx.restore();
    // door with lamplight spilling out
    const dg = ctx.createLinearGradient(0, WY - 15, 0, WY); dg.addColorStop(0, '#ffcf7a'); dg.addColorStop(1, '#d9852f');
    ctx.fillStyle = css(PAL.woodDk); ctx.beginPath(); ctx.roundRect(-6.5, WY - 16.5, 13, 16.5, [5, 5, 0, 0]); ctx.fill();
    ctx.fillStyle = dg; ctx.beginPath(); ctx.roundRect(-5, WY - 15, 10, 15, [4, 4, 0, 0]); ctx.fill();
    ctx.fillStyle = 'rgba(120,60,20,.5)'; ctx.fillRect(-1.5, WY - 10, 3, 10);
    const sp = ctx.createRadialGradient(0, WY + 1, 0, 0, WY + 1, 16); sp.addColorStop(0, 'rgba(255,190,100,.45)'); sp.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = sp; ctx.beginPath(); ctx.ellipse(0, WY + 1, 16, 6, 0, 0, TAU); ctx.fill();
    // window
    ctx.fillStyle = css(PAL.woodDk); ctx.fillRect(12, WY - 15, 8, 7); ctx.fillStyle = '#e8a650'; ctx.fillRect(13, WY - 14, 6, 5);
    // thatched roof: rows of straw strokes, lit on the left, deep overhang shadow
    const RY = WY - WH + 2, peak = RY - 30;
    blurred(ctx, 1.5, g => { g.fillStyle = 'rgba(20,12,6,.45)'; g.beginPath(); g.moveTo(-34, RY + 2); g.lineTo(34, RY + 2); g.lineTo(28, RY + 7); g.lineTo(-28, RY + 7); g.fill(); });
    const roof = new Path2D(); roof.moveTo(-36, RY + 1); roof.quadraticCurveTo(-24, peak + 10, 0, peak); roof.quadraticCurveTo(24, peak + 10, 36, RY + 1); roof.quadraticCurveTo(0, RY + 5, -36, RY + 1);
    ctx.save(); ctx.clip(roof);
    const rg = ctx.createLinearGradient(-36, 0, 36, 0); rg.addColorStop(0, css(PAL.strawLt)); rg.addColorStop(0.5, css(PAL.straw)); rg.addColorStop(1, css(PAL.strawDk)); ctx.fillStyle = rg; ctx.fillRect(-40, peak - 2, 80, 40);
    ctx.lineCap = 'round';
    for (let row = 0; row < 6; row++) {
      const ry = peak + 4 + row * 5.2;
      for (let i = 0; i < 160; i++) {
        const sx = -40 + r() * 80, t = (sx + 36) / 72, l = 4 + r() * 4, c = shade(mix(PAL.strawLt, PAL.strawDk, t), (r() - 0.5) * 0.35);
        ctx.strokeStyle = css(c, 0.7); ctx.lineWidth = 0.3 + r() * 0.4; ctx.beginPath(); ctx.moveTo(sx, ry - l * 0.6); ctx.lineTo(sx + (sx) * 0.06, ry + l * 0.4 + 1); ctx.stroke();
      }
      ctx.strokeStyle = css(PAL.strawDk, 0.55); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-40, ry + 2.4); ctx.quadraticCurveTo(0, ry + 3.6, 40, ry + 2.4); ctx.stroke();
      ctx.strokeStyle = css(PAL.strawLt, 0.35); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-40, ry + 1.4); ctx.quadraticCurveTo(0, ry + 2.6, 40, ry + 1.4); ctx.stroke();
    }
    const ao = ctx.createLinearGradient(0, RY - 6, 0, RY + 4); ao.addColorStop(0, 'rgba(30,18,8,0)'); ao.addColorStop(1, 'rgba(30,18,8,.35)'); ctx.fillStyle = ao; ctx.fillRect(-40, RY - 6, 80, 10);
    ctx.restore();
    // ragged eave fringe
    for (let ex = -35; ex < 35; ex += 0.8) { const ey = RY + 1 + (1 - (ex / 36) ** 2) * 3; ctx.strokeStyle = css(shade(PAL.straw, (r() - 0.6) * 0.5), 0.9); ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(ex, ey - 1.5); ctx.lineTo(ex + (r() - 0.5), ey + 1 + r() * 2.2); ctx.stroke(); }
    // ridge cap + a little flag
    ctx.fillStyle = css(PAL.strawDk); ctx.beginPath(); ctx.ellipse(0, peak + 1, 5, 2.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(PAL.woodDk); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, peak + 1); ctx.lineTo(0, peak - 12); ctx.stroke();
    ctx.fillStyle = '#c4553c'; ctx.beginPath(); ctx.moveTo(0, peak - 12); ctx.quadraticCurveTo(5, peak - 11.5, 9, peak - 10); ctx.quadraticCurveTo(5, peak - 9, 0, peak - 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,190,.35)'; ctx.beginPath(); ctx.moveTo(0, peak - 12); ctx.quadraticCurveTo(5, peak - 11.5, 9, peak - 10); ctx.lineTo(0, peak - 11); ctx.fill();
    // hanging lantern with a warm glow
    const lx = 30, ly = PY - 10;
    ctx.strokeStyle = css(PAL.woodDk); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(lx, RY + 3); ctx.lineTo(lx, ly - 2.5); ctx.stroke();
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14); lg.addColorStop(0, 'rgba(255,196,110,.6)'); lg.addColorStop(1, 'rgba(255,196,110,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd690'; ctx.beginPath(); ctx.ellipse(lx, ly, 1.8, 2.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(lx - 0.4, ly - 0.4, 0.7, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // a tiki torch: post with a lashed bowl and a small flame + glow
  function torch(ctx, x, y, seed) {
    post(ctx, x, y, 1.1, 13);
    ctx.fillStyle = css(PAL.strawDk); ctx.beginPath(); ctx.ellipse(x, y - 13, 2.4, 1.3, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x, y - 16, 0, x, y - 16, 12); g.addColorStop(0, 'rgba(255,170,70,.5)'); g.addColorStop(1, 'rgba(255,170,70,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 16, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(x - 2, y - 13.5); ctx.quadraticCurveTo(x - 2, y - 17, x + 0.3, y - 20.5); ctx.quadraticCurveTo(x + 2.4, y - 16, x + 2, y - 13.5); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.moveTo(x - 0.9, y - 13.8); ctx.quadraticCurveTo(x - 0.8, y - 16, x + 0.3, y - 17.6); ctx.quadraticCurveTo(x + 1.2, y - 15.6, x + 1, y - 13.8); ctx.fill();
  }

  // the carved wooden pedestal + glossy gold level token (state: 'done' | 'open' | 'locked')
  function node(ctx, x, y, num, state, o = {}) {
    const R = o.r || 14;
    // pedestal: a stubby log disc with end grain and a bark band
    const PR = R + 4, ph = 5;
    if (o.pedestal !== false) {
    blurred(ctx, 2.5, g => { g.fillStyle = 'rgba(16,12,8,.5)'; g.beginPath(); g.ellipse(x + 3, y + 7, R + 6, (R + 6) * 0.45, 0, 0, TAU); g.fill(); });
    const bark = ctx.createLinearGradient(x - PR, 0, x + PR, 0); bark.addColorStop(0, css(PAL.woodLt)); bark.addColorStop(0.5, css(PAL.wood)); bark.addColorStop(1, css(PAL.woodDk));
    ctx.fillStyle = bark; ctx.beginPath(); ctx.ellipse(x, y + ph, PR, PR * 0.5, 0, 0, Math.PI); ctx.lineTo(x - PR, y); ctx.ellipse(x, y, PR, PR * 0.5, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = css(PAL.woodDk, 0.6); ctx.lineWidth = 0.35; for (let k = -PR + 2; k < PR; k += 2.2) { ctx.beginPath(); const yy = y + Math.sqrt(Math.max(0, 1 - (k / PR) ** 2)) * PR * 0.5; ctx.moveTo(x + k, yy); ctx.lineTo(x + k, yy + ph); ctx.stroke(); }
    const top = ctx.createLinearGradient(x - PR, y - PR * 0.5, x + PR, y + PR * 0.5); top.addColorStop(0, css(shade(PAL.woodLt, 0.15))); top.addColorStop(1, css(PAL.wood));
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(x, y, PR, PR * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(PAL.woodDk, 0.35); ctx.lineWidth = 0.4; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + 0.6, y + 0.3, PR * k / 5, PR * 0.5 * k / 5, 0, 0, TAU); ctx.stroke(); }
    }
    // glow under the coin
    const glowA = state === 'open' ? 0.75 : 0.4;
    const gl = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, R * 2.6); gl.addColorStop(0, `rgba(255,206,110,${glowA})`); gl.addColorStop(1, 'rgba(255,206,110,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y - 4, R * 2.6, 0, TAU); ctx.fill();
    if (state === 'open') for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(255,226,150,${0.55 - k * 0.16})`; ctx.lineWidth = 1.1 - k * 0.25; ctx.beginPath(); ctx.ellipse(x, y + 1, PR + 5 + k * 5, (PR + 5 + k * 5) * 0.5, 0, 0, TAU); ctx.stroke(); }
    // the coin, standing up a little (slight ellipse) with a thick minted edge
    const cy = y - R * 0.55, ry = R * 0.94;
    ctx.fillStyle = css(PAL.goldDk); ctx.beginPath(); ctx.ellipse(x, cy + 2.2, R, ry, 0, 0, TAU); ctx.fill();
    for (let a = 0; a < Math.PI; a += 0.12) { ctx.strokeStyle = 'rgba(90,50,10,.4)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R, cy + Math.sin(a) * ry); ctx.lineTo(x + Math.cos(a) * R, cy + Math.sin(a) * ry + 2.2); ctx.stroke(); }
    const face = ctx.createRadialGradient(x - R * 0.35, cy - R * 0.4, R * 0.1, x, cy, R * 1.05);
    face.addColorStop(0, css(PAL.goldLt)); face.addColorStop(0.45, css(PAL.gold)); face.addColorStop(1, css([214, 140, 40]));
    ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(x, cy, R, ry, 0, 0, TAU); ctx.fill();
    // embossed rim
    ctx.strokeStyle = 'rgba(150,86,20,.75)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x + 0.3, cy + 0.4, R * 0.78, ry * 0.78, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,210,.75)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x - 0.3, cy - 0.4, R * 0.78, ry * 0.78, 0, 0, TAU); ctx.stroke();
    for (let a = 0; a < TAU; a += TAU / 28) { ctx.fillStyle = 'rgba(160,96,24,.5)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * 0.89, cy + Math.sin(a) * ry * 0.89, 0.35, 0, TAU); ctx.fill(); }
    // number: game font, cream with a deep gold drop
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${R * 1.15}px "Lilita One", sans-serif`;
    ctx.fillStyle = 'rgba(120,64,12,.85)'; ctx.fillText(num, x + 0.4, cy + 1.6);
    ctx.fillStyle = '#5a3208'; ctx.fillText(num, x, cy + 0.8);
    ctx.fillStyle = state === 'open' ? '#fffaf0' : '#fff2cc'; ctx.fillText(num, x, cy);
    // specular sweep
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, cy, R, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,240,.35)'; ctx.beginPath(); ctx.ellipse(x - R * 0.35, cy - ry * 0.55, R * 0.7, ry * 0.32, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,240,.9)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, cy, R - 0.6, ry - 0.6, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    // stars below
    const stars = o.stars ?? 0;
    for (let i = 0; i < 3; i++) { const sx = x + (i - 1) * 9, sy = y + 7 + (i === 1 ? 2 : 0); star(ctx, sx, sy, 4.2, i < stars); }
  }
  function star(ctx, x, y, R, on) {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    ctx.fillStyle = 'rgba(30,18,6,.5)'; ctx.beginPath(); trace(ctx, pts, true, 0.4, 1); ctx.fill();
    if (on) { const g = ctx.createLinearGradient(x, y - R, x, y + R); g.addColorStop(0, css(PAL.goldLt)); g.addColorStop(0.5, css(PAL.gold)); g.addColorStop(1, css(PAL.goldDk)); ctx.fillStyle = g; }
    else ctx.fillStyle = 'rgba(70,52,30,.85)';
    ctx.beginPath(); trace(ctx, pts, true); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(150,84,16,.8)' : 'rgba(40,28,14,.8)'; ctx.lineWidth = 0.45; ctx.stroke();
    if (on) { ctx.fillStyle = 'rgba(255,255,240,.7)'; ctx.beginPath(); ctx.ellipse(x - R * 0.2, y - R * 0.3, R * 0.22, R * 0.12, -0.6, 0, TAU); ctx.fill(); }
  }
  // launch pad for level 1: a ring of cut stones round a plank deck, scorched in the middle
  function launchPad(ctx, x, y, R, seed) {
    const r = rng(seed);
    blurred(ctx, 3, g => { g.fillStyle = 'rgba(30,24,14,.45)'; g.beginPath(); g.ellipse(x + 3, y + 3, R + 3, (R + 3) * 0.52, 0, 0, TAU); g.fill(); });
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, R - 3, (R - 3) * 0.5, 0, 0, TAU); ctx.clip();
    for (let yy = y - R; yy < y + R; yy += 3) plank(ctx, x - R, yy, R * 2, 2.7, r);
    const sc = ctx.createRadialGradient(x, y, 0, x, y, R * 0.8); sc.addColorStop(0, 'rgba(30,20,12,.65)'); sc.addColorStop(1, 'rgba(30,20,12,0)'); ctx.fillStyle = sc; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU + 0.04, a1 = (i + 1) / n * TAU - 0.04, ro = R, ri = R - 3.4, front = Math.sin((a0 + a1) / 2) > 0;
      const c = shade(PAL.stone, (r() - 0.5) * 0.3 + (front ? -0.05 : 0.1));
      const P = new Path2D(); P.ellipse(x, y, ro, ro * 0.5, 0, a0, a1); P.ellipse(x, y, ri, ri * 0.5, 0, a1, a0, true); P.closePath();
      if (front) { ctx.fillStyle = css(shade(c, -0.4)); ctx.save(); ctx.translate(0, 2.2); ctx.fill(P); ctx.restore(); }
      const g = ctx.createLinearGradient(x, y - ro * 0.5, x, y + ro * 0.5); g.addColorStop(0, css(shade(c, 0.2))); g.addColorStop(1, css(c)); ctx.fillStyle = g; ctx.fill(P);
      if (r() < 0.5) { ctx.fillStyle = css(PAL.moss, 0.6); const a = (a0 + a1) / 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (R - 1.7), y + Math.sin(a) * (R - 1.7) * 0.5, 0.8, 0, TAU); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(240,232,210,.4)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(x, y - 0.4, R - 0.3, (R - 0.3) * 0.5, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
  }
  function signpost(ctx, x, y, boards) {
    post(ctx, x, y, 1.3, 22);
    boards.forEach((b, i) => {
      const by = y - 19 + i * 7.5, dir = b.dir, w = b.text.length * 3.6 + 8;
      ctx.save(); ctx.translate(x, by); ctx.rotate(b.tilt || 0);
      const P = new Path2D(); const x0 = dir > 0 ? -1 : 1 - w, x1 = x0 + w;
      if (dir > 0) { P.moveTo(x0, -3); P.lineTo(x1 - 3, -3); P.lineTo(x1, 0); P.lineTo(x1 - 3, 3); P.lineTo(x0, 3); }
      else { P.moveTo(x1, -3); P.lineTo(x0 + 3, -3); P.lineTo(x0, 0); P.lineTo(x0 + 3, 3); P.lineTo(x1, 3); }
      P.closePath();
      ctx.fillStyle = 'rgba(20,12,6,.4)'; ctx.save(); ctx.translate(0.6, 1.2); ctx.fill(P); ctx.restore();
      const g = ctx.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, css(PAL.woodLt)); g.addColorStop(1, css(PAL.wood)); ctx.fillStyle = g; ctx.fill(P);
      ctx.strokeStyle = css(PAL.woodDk, 0.5); ctx.lineWidth = 0.25; for (let k = -1.5; k <= 1.5; k += 1.5) { ctx.beginPath(); ctx.moveTo(x0 + 1, k + 0.2); ctx.lineTo(x1 - 2, k - 0.2); ctx.stroke(); }
      ctx.font = '5px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,236,200,.35)'; ctx.fillText(b.text, (x0 + x1) / 2 + (dir > 0 ? -1 : 1), 0.8);
      ctx.fillStyle = '#4a2c14'; ctx.fillText(b.text, (x0 + x1) / 2 + (dir > 0 ? -1 : 1), 0.3);
      ctx.restore();
      post(ctx, x, by + 0.5, 0.5, 0.01);
    });
  }
  function canoe(ctx, x, y, ang, seed) {
    const r = rng(seed); ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    blurred(ctx, 1.5, g => { g.fillStyle = 'rgba(30,24,14,.45)'; g.beginPath(); g.ellipse(2, 3, 22, 4.5, 0, 0, TAU); g.fill(); });
    const hull = new Path2D(); hull.moveTo(-22, 0); hull.quadraticCurveTo(0, -7.5, 22, 0); hull.quadraticCurveTo(0, 7.5, -22, 0);
    const g = ctx.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, css(PAL.woodLt)); g.addColorStop(1, css(PAL.woodDk)); ctx.fillStyle = g; ctx.fill(hull);
    const inner = new Path2D(); inner.moveTo(-18, 0); inner.quadraticCurveTo(0, -4.6, 18, 0); inner.quadraticCurveTo(0, 4, -18, 0);
    ctx.fillStyle = css(shade(PAL.woodDk, -0.2)); ctx.fill(inner);
    ctx.save(); ctx.clip(hull); ctx.strokeStyle = css(PAL.woodDk, 0.4); ctx.lineWidth = 0.3; for (let k = -5; k < 6; k += 1.6) { ctx.beginPath(); ctx.moveTo(-22, k); ctx.quadraticCurveTo(0, k - 2 + r(), 22, k); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = css(PAL.wood); ctx.fillRect(-8, -3, 2.2, 6); ctx.fillRect(6, -3, 2.2, 6);
    ctx.strokeStyle = 'rgba(255,230,190,.45)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-19, -1.5); ctx.quadraticCurveTo(0, -7, 19, -1.5); ctx.stroke();
    // paddle
    ctx.strokeStyle = css(PAL.woodLt); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-6, 7); ctx.lineTo(14, 9); ctx.stroke(); ctx.fillStyle = css(PAL.wood); ctx.beginPath(); ctx.ellipse(16.5, 9.3, 3.4, 1.4, 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function fern(ctx, x, y, s, seed) {   // a low tuft so the grass edges are not bare
    const r = rng(seed); ctx.save(); ctx.lineCap = 'round';
    blurred(ctx, 1.5, g => { g.fillStyle = 'rgba(14,22,14,.35)'; g.beginPath(); g.ellipse(x + 2, y + 1.5, 7 * s, 2.5 * s, 0, 0, TAU); g.fill(); });
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + 0.2 + i / 6 * (Math.PI - 0.4) + (r() - 0.5) * 0.2, L = (6 + r() * 4) * s, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L * 0.6;
      const lit = clamp(0.6 - Math.cos(a) * 0.4), c = mix(PAL.palmDk, PAL.palmLt, lit * 0.8);
      for (let k = 1; k < 7; k++) { const t = k / 7, px = lerp(x, ex, t), py = lerp(y, ey, t) - Math.sin(t * Math.PI) * 1.5 * s, l = (1 - t) * 2.4 * s + 0.6; ctx.strokeStyle = css(shade(c, (r() - 0.5) * 0.2)); ctx.lineWidth = 0.7 * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(a) * l, py + Math.cos(a) * l * 0.6 - l * 0.3); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(a) * l, py - Math.cos(a) * l * 0.6 - l * 0.3); ctx.stroke(); }
      ctx.strokeStyle = css(shade(c, 0.2)); ctx.lineWidth = 0.5 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + ex) / 2, (y + ey) / 2 - 1.5 * s, ex, ey); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------- atmosphere ----------------
  function atmosphere(ctx, W, H, seed) {
    const r = rng(seed);
    // haze toward the top (the island climbs away into mist)
    const hz = ctx.createLinearGradient(0, 0, 0, H * 0.42); hz.addColorStop(0, 'rgba(176,192,178,.26)'); hz.addColorStop(0.5, 'rgba(176,192,178,.07)'); hz.addColorStop(1, 'rgba(176,192,178,0)');
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
    // soft light shafts from the upper left
    ctx.save(); ctx.globalCompositeOperation = 'soft-light';
    for (let i = 0; i < 3; i++) { const x0 = -40 + i * 130 + r() * 30, w = 30 + r() * 40; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,240,200,.22)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + w, -10); ctx.lineTo(x0 + w + H * 0.45, H); ctx.lineTo(x0 + H * 0.45, H); ctx.fill(); }
    ctx.restore();
    // restrained grade: lift the darks slightly toward teal, pull saturation down a touch
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,.14)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.3, W / 2, H * 0.52, H * 0.72); vg.addColorStop(0, 'rgba(10,20,22,0)'); vg.addColorStop(1, 'rgba(10,20,22,.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // motes
    for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H * 0.8, s = 0.3 + r() * 0.8; ctx.fillStyle = `rgba(255,244,210,${0.15 + r() * 0.35})`; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
  }
  function grain(ctx) {   // fine film grain over everything, device-pixel
    const c = pixels([0, 0, 1e4, 1e4], (x, y) => { const v = 128 + (Math.random() - 0.5) * 22; return [v, v, v, 255]; });
    blit(ctx, c, 0.18, 'overlay');
  }

  window.DIO = { TAU, PAL, setup, rng, fbm, vnoise, clamp, lerp, mix, css, shade, cr, trace, lengths, at, wobble, blobPts, layer, blurred, pixels, blit,
    slab, sea, surf, creekBed, cascade, stream, road, steps, bridge, rock, canopy, palm, hut, torch, node, star, launchPad, signpost, canoe, fern, pebble, atmosphere, grain };
})();
