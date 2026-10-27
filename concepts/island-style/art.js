// Coconut Island map art: a prop library in the game's style (gradient-shaded, glossy, light from the top-left,
// edges in a darker shade of each object's own colour, never black outlines). Every prop is a function
// (ctx, x, y, s, seed, P) in map pixels, so the same calls can paint the sample screen or the whole 1640x2480 island
// (the art is baked into tiles once, so draw calls are spent freely). P is the variant's style (palette + knobs).
(() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1000003) / 1000003; }; };
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t);
  // cartoon shading: lighter goes toward warm sunlight, darker goes toward a cooler, deeper version of the same hue
  const LIGHT = [255, 250, 214];
  const shade = (c, k) => k >= 0 ? mix(c, LIGHT, k) : mix(c, [c[0] * 0.42, c[1] * 0.5, c[2] * 0.62 + 18], -k);
  const stops = (g, st) => { st.forEach((s, i) => { let o, c; if (Array.isArray(s) && s.length === 2 && typeof s[0] === 'number' && typeof s[1] !== 'number') [o, c] = s; else { o = i / Math.max(1, st.length - 1); c = s; } g.addColorStop(o, typeof c === 'string' ? c : rgb(c, c[3] ?? 1)); }); return g; };
  const lg = (ctx, x0, y0, x1, y1, st) => stops(ctx.createLinearGradient(x0, y0, x1, y1), st);
  const rg = (ctx, x, y, r, st, fx = x, fy = y, r0 = 0) => stops(ctx.createRadialGradient(fx, fy, r0, x, y, r), st);
  // soft shadow blob (a gradient, no blur filter); a: opacity at the centre
  function blob(ctx, x, y, rx, ry, a = 0.3, col = [26, 52, 30], rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(rx, ry);
    ctx.fillStyle = rg(ctx, 0, 0, 1, [[0, [...col, a]], [0.55, [...col, a * 0.7]], [1, [...col, 0]]]);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }
  function glow(ctx, x, y, r, c, a = 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg(ctx, x, y, r, [[0, [...c, a]], [0.4, [...c, a * 0.4]], [1, [...c, 0]]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  // smooth closed / open curves through points (midpoint quadratics)
  function smoothPath(ctx, pts, closed = false) {
    const n = pts.length; if (n < 2) return;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      const m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  // resample a polyline evenly (step px) after smoothing it through its midpoints
  function resample(pts, step = 3) {
    const dense = [];
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    dense.push(pts[0]);
    let prev = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const c = pts[i], e = i === pts.length - 2 ? pts[i + 1] : mid(pts[i], pts[i + 1]);
      for (let k = 1; k <= 16; k++) { const u = k / 16, v = 1 - u; dense.push([v * v * prev[0] + 2 * v * u * c[0] + u * u * e[0], v * v * prev[1] + 2 * v * u * c[1] + u * u * e[1]]); }
      prev = e;
    }
    if (pts.length === 2) dense.push(pts[1]);
    const out = [dense[0]]; let acc = 0;
    for (let i = 1; i < dense.length; i++) {
      const a = dense[i - 1], b = dense[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += d;
      while (acc >= step) { acc -= step; const t = 1 - acc / d; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    out.push(dense[dense.length - 1]);
    return out;
  }
  const bezPts = (p0, c1, c2, p1, step = 3) => {
    const raw = []; for (let k = 0; k <= 200; k++) { const u = k / 200, v = 1 - u; raw.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p1[1]]); }
    const out = [raw[0]]; let acc = 0;
    for (let i = 1; i < raw.length; i++) { const a = raw[i - 1], b = raw[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += d; while (acc >= step) { acc -= step; const t = 1 - acc / d; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    out.push(raw[raw.length - 1]); return out;
  };
  const polyline = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
  const normalAt = (pts, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const offsetLine = (pts, d) => pts.map((p, i) => { const n = normalAt(pts, i), dd = typeof d === 'function' ? d(i / (pts.length - 1), i) : d; return [p[0] + n[0] * dd, p[1] + n[1] * dd]; });
  // ribbon polygon around a centre line, width w(u)
  function ribbon(ctx, pts, w) {
    const L = offsetLine(pts, (u, i) => w(u, i) / 2), R = offsetLine(pts, (u, i) => -w(u, i) / 2);
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath();
  }
  // a scalloped (bumpy) closed outline around a circle: n bumps, bump height k
  function scallop(ctx, x, y, r, n, k = 0.16, rot = 0, sy = 1) {
    ctx.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r * sy);
    for (let i = 0; i < n; i++) {
      const a0 = rot + i / n * TAU, a1 = rot + (i + 1) / n * TAU, am = (a0 + a1) / 2;
      ctx.quadraticCurveTo(x + Math.cos(am) * r * (1 + k * 2), y + Math.sin(am) * r * (1 + k * 2) * sy, x + Math.cos(a1) * r, y + Math.sin(a1) * r * sy);
    }
    ctx.closePath();
  }
  // a gloss highlight: a white crescent on the lit (top-left) side of a round form
  function sheen(ctx, x, y, r, a = 0.45, from = 3.55, to = 4.75, w = 0.16) {
    ctx.save(); ctx.strokeStyle = `rgba(255,255,240,${a})`; ctx.lineWidth = Math.max(0.6, r * w); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, from, to); ctx.stroke(); ctx.restore();
  }
  function glint(ctx, x, y, r, a = 0.9) {
    ctx.save(); ctx.fillStyle = `rgba(255,255,250,${a})`; ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
  }

  // =============================== ground ===============================
  // Sea: deep water with soft light patches, wave crests and glints. `clipFn` adds the sea's area to the path.
  function sea(ctx, area, P, seed = 5) {
    const { x0, y0, x1, y1 } = area, r = rand(seed);
    ctx.fillStyle = lg(ctx, 0, y0, 0, y1, P.sea); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // large soft colour variation (deeper troughs / lighter shoals)
    for (let k = 0; k < 18; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), rr = 40 + r() * 90; blob(ctx, x, y, rr, rr * 0.5, r() < 0.5 ? 0.16 : 0.1, r() < 0.5 ? [16, 70, 130] : [120, 220, 236]); }
    // long gentle swell bands
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 40; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 14 + r() * 30;
      ctx.strokeStyle = `rgba(150,230,245,${0.12 + r() * 0.12})`; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w * 0.4, y - 4, x + w * 0.4, y + 3, x + w, y - 1); ctx.stroke();
    }
    // the concept's little wave crests, now with a shaded underside and a bright top
    for (let k = 0; k < 70; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 4 + r() * 6;
      ctx.strokeStyle = 'rgba(16,70,120,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w, y + 1.2); ctx.quadraticCurveTo(x, y - 2.4, x + w, y + 1.2); ctx.stroke();
      ctx.strokeStyle = `rgba(235,252,255,${0.5 + r() * 0.4})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - 3.4, x + w, y); ctx.stroke();
    }
    for (let k = 0; k < 26; k++) glint(ctx, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 1.4 + r() * 2.2, 0.55 + r() * 0.4);
    ctx.restore();
  }

  // The shallows along a coastline (pts run left to right with the sea below): a turquoise gradient band over
  // sand, underwater ripples and caustics, then the surf: a breaking wave line, layered lacy foam and the swash.
  function shallows(ctx, coast, P, depth = 70, seed = 11) {
    const r = rand(seed);
    const band = (d0, d1) => { const A = offsetLine(coast, -d0), B = offsetLine(coast, -d1); ctx.beginPath(); ctx.moveTo(...A[0]); for (const p of A) ctx.lineTo(...p); for (let i = B.length - 1; i >= 0; i--) ctx.lineTo(...B[i]); ctx.closePath(); };
    // the shallow water, in several bands so it eases from aqua at the sand to the deep blue
    const S = P.shallow;
    for (let k = 0; k < 14; k++) {
      const d0 = k / 14 * depth, d1 = (k + 1) / 14 * depth + 1, u = k / 13;
      band(d0 - 0.5, d1); ctx.fillStyle = rgb(u < 0.5 ? mix(S[0], S[1], u * 2) : mix(S[1], S[2], (u - 0.5) * 2), 1 - Math.pow(u, 3) * 0.75); ctx.fill();
    }
    // the drop-off: a soft darker lip where the shelf ends
    const lip = offsetLine(coast, -depth);
    ctx.save(); ctx.lineJoin = 'round';
    polyline(ctx, lip); ctx.strokeStyle = rgb(shade(S[2], -0.3), 0.35); ctx.lineWidth = 10; ctx.stroke();
    polyline(ctx, offsetLine(coast, -depth + 4)); ctx.strokeStyle = 'rgba(200,250,250,.18)'; ctx.lineWidth = 3; ctx.stroke();
    // clip to the shelf for details
    band(0, depth); ctx.clip();
    // underwater sand ripples (darker crescent + light edge), parallel-ish to the coast
    for (let k = 0; k < 120; k++) {
      const i = (r() * coast.length) | 0, d = 6 + r() * (depth - 10), n = normalAt(coast, i), p = coast[i], x = p[0] - n[0] * d, y = p[1] - n[1] * d, w = 5 + r() * 9;
      const ang = Math.atan2(n[1], n[0]) + Math.PI / 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.strokeStyle = 'rgba(20,110,130,.22)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, 2.5, w, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,255,240,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w, -1.3); ctx.quadraticCurveTo(0, 1.2, w, -1.3); ctx.stroke();
      ctx.restore();
    }
    // seafloor: a few darker patches of weed and rock under the water
    for (let k = 0; k < 9; k++) {
      const i = (r() * coast.length) | 0, d = depth * (0.45 + r() * 0.45), n = normalAt(coast, i), p = coast[i];
      blob(ctx, p[0] - n[0] * d, p[1] - n[1] * d, 10 + r() * 16, 4 + r() * 5, 0.28, [20, 100, 110]);
    }
    // caustics: a net of bright wobbly rings, stronger near the sand
    ctx.lineWidth = 0.9;
    for (let k = 0; k < 260; k++) {
      const i = (r() * coast.length) | 0, d = 3 + Math.pow(r(), 1.4) * depth, n = normalAt(coast, i), p = coast[i], x = p[0] - n[0] * d, y = p[1] - n[1] * d, rr = 3 + r() * 4;
      ctx.strokeStyle = `rgba(255,255,240,${0.28 * (1 - d / depth)})`;
      ctx.beginPath(); for (let j = 0; j <= 6; j++) { const a = j / 6 * TAU, q = rr * (0.75 + r() * 0.5); j ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.6) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.6); } ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
    // the breaking wave: a foam roll a little out from the beach, shaded blue underneath, bright on top
    const brk = offsetLine(coast, (u, i) => -(18 + Math.sin(i * 0.09 + seed) * 4 + Math.sin(i * 0.23) * 2));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    polyline(ctx, offsetLine(brk, -3)); ctx.strokeStyle = 'rgba(30,120,150,.25)'; ctx.lineWidth = 6; ctx.stroke();
    // broken foam: overlapping segments
    for (let i = 0; i < brk.length - 4; i += 2 + ((r() * 3) | 0)) {
      const len = 4 + ((r() * 9) | 0), seg = brk.slice(i, Math.min(brk.length, i + len)); if (seg.length < 2) continue;
      polyline(ctx, seg); ctx.strokeStyle = 'rgba(190,236,240,.75)'; ctx.lineWidth = 4.5; ctx.stroke();
      polyline(ctx, seg.map(p => [p[0], p[1] - 1])); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.2; ctx.stroke();
    }
    // foam lace trailing from it toward the beach
    for (let k = 0; k < 140; k++) {
      const i = (r() * brk.length) | 0, p = brk[i], n = normalAt(brk, i), d = r() * 12, x = p[0] + n[0] * d, y = p[1] + n[1] * d;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`; ctx.beginPath(); ctx.arc(x, y, 0.5 + r() * 1.3, 0, TAU); ctx.fill();
    }
    // the swash: a thin sheet running up the sand, ending in a lacy foam line with bubbles
    const sw = offsetLine(coast, (u, i) => 4 + Math.sin(i * 0.13 + 1) * 2.5 + Math.sin(i * 0.37) * 1.2);
    ctx.beginPath(); ctx.moveTo(...coast[0]); for (const p of coast) ctx.lineTo(...p); for (let i = sw.length - 1; i >= 0; i--) ctx.lineTo(...sw[i]); ctx.closePath();
    ctx.fillStyle = rgb(S[0], 0.55); ctx.fill();
    polyline(ctx, sw); ctx.strokeStyle = 'rgba(120,200,210,.45)'; ctx.lineWidth = 3.4; ctx.stroke();
    polyline(ctx, sw); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.stroke();
    // a second, fainter lace line just behind it and loops of foam between
    const sw2 = offsetLine(coast, (u, i) => -5 + Math.sin(i * 0.17 + 3) * 2);
    for (let i = 0; i < sw2.length - 3; i += 3 + ((r() * 4) | 0)) { const seg = sw2.slice(i, i + 3 + ((r() * 5) | 0)); if (seg.length < 2) continue; polyline(ctx, seg); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.1; ctx.stroke(); }
    for (let k = 0; k < 110; k++) {
      const i = (r() * sw.length) | 0, p = sw[i], n = normalAt(sw, i), d = -r() * 9;
      ctx.strokeStyle = `rgba(255,255,255,${0.4 + r() * 0.4})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(p[0] + n[0] * d, p[1] + n[1] * d, 0.6 + r() * 1.4, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // Sand: fill the region (already on the path), then grain, wind ripples, mounds and the wet band above the water.
  function sand(ctx, pathFn, bounds, coast, P, seed = 21) {
    const r = rand(seed), { x0, y0, x1, y1 } = bounds;
    ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, y0, 0, y1, P.sand); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // big soft dunes: light tops, shaded lee sides
    for (let k = 0; k < 16; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 30 + r() * 50; blob(ctx, x, y, w, w * 0.35, 0.35, [255, 246, 214]); blob(ctx, x + w * 0.35, y + w * 0.16, w * 0.7, w * 0.2, 0.12, [190, 140, 80]); }
    // wind ripples
    ctx.lineCap = 'round';
    for (let k = 0; k < 170; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 4 + r() * 8, tilt = -0.15 + r() * 0.1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      ctx.strokeStyle = rgb(shade(P.sand[1], -0.22), 0.45); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-w, 0.6); ctx.quadraticCurveTo(0, -2, w, 0.6); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,230,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-w, -0.7); ctx.quadraticCurveTo(0, -3.2, w, -0.7); ctx.stroke();
      ctx.restore();
    }
    // grain: light and dark specks, a few tiny pebbles with a lit side
    for (let k = 0; k < 2600; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), v = r();
      ctx.fillStyle = v < 0.45 ? 'rgba(255,252,236,.55)' : v < 0.9 ? 'rgba(170,120,64,.28)' : 'rgba(140,100,70,.4)';
      ctx.fillRect(x, y, 0.5 + r() * 0.7, 0.5 + r() * 0.7);
    }
    for (let k = 0; k < 40; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), rr = 0.8 + r() * 1.2, c = r() < 0.5 ? [196, 180, 160] : [220, 170, 130];
      ctx.fillStyle = rg(ctx, x, y, rr * 1.2, [shade(c, 0.4), c, shade(c, -0.35)], x - rr * 0.4, y - rr * 0.4); ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.75, 0, 0, TAU); ctx.fill();
    }
    // wet sand: darker, glossy band above the waterline, with a tide line of little debris
    if (coast) {
      const top = offsetLine(coast, (u, i) => 14 + Math.sin(i * 0.07 + 2) * 4);
      ctx.beginPath(); ctx.moveTo(...coast[0]); for (const p of coast) ctx.lineTo(...p); ctx.lineTo(coast[coast.length - 1][0], coast[coast.length - 1][1] + 40); ctx.lineTo(coast[0][0], coast[0][1] + 40); ctx.closePath();
      ctx.fillStyle = rgb(P.wetSand[1]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(...top[0]); for (const p of top) ctx.lineTo(...p); for (let i = coast.length - 1; i >= 0; i--) ctx.lineTo(...coast[i]); ctx.closePath();
      const yb = Math.max(...coast.map(p => p[1])), yt = Math.min(...top.map(p => p[1]));
      ctx.fillStyle = lg(ctx, 0, yt, 0, yb, [[0, [...P.wetSand[0], 0]], [0.35, P.wetSand[0]], [1, P.wetSand[1]]]); ctx.fill();
      // sky reflections on the wet sand
      for (let k = 0; k < 40; k++) { const i = (r() * coast.length) | 0, p = coast[i], n = normalAt(coast, i), d = 2 + r() * 9; ctx.strokeStyle = 'rgba(230,250,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0] + n[0] * d - 4, p[1] + n[1] * d); ctx.lineTo(p[0] + n[0] * d + 4 + r() * 6, p[1] + n[1] * d); ctx.stroke(); }
      // tide line debris
      for (let i = 0; i < top.length; i += 1) { if (r() < 0.55) continue; const p = top[i]; ctx.fillStyle = r() < 0.6 ? 'rgba(120,96,60,.45)' : 'rgba(70,110,60,.45)'; ctx.fillRect(p[0] + (r() - 0.5) * 3, p[1] + (r() - 0.5) * 3, 1 + r() * 1.6, 0.8); }
    }
    ctx.restore();
  }

  // Grass: base, big soft light/shade patches, then thousands of blade tufts, clover and tiny flowers.
  function grass(ctx, pathFn, bounds, P, seed = 31, ok = () => true) {
    const r = rand(seed), { x0, y0, x1, y1 } = bounds;
    ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, y0, 0, y1, P.grass); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let k = 0; k < 46; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 30 + r() * 60, lt = r() < 0.55; blob(ctx, x, y, w, w * 0.55, lt ? 0.3 : 0.2, lt ? P.grassLight : P.grassDark); }
    // mottling: small leafy dabs
    for (let k = 0; k < 900; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), v = r();
      ctx.fillStyle = v < 0.5 ? rgb(P.grassLight, 0.22) : rgb(P.grassDark, 0.18);
      ctx.beginPath(); ctx.ellipse(x, y, 2 + r() * 3, 1 + r() * 1.4, (r() - 0.5) * 0.6, 0, TAU); ctx.fill();
    }
    // tufts
    for (let k = 0; k < 1100; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (!ok(x, y)) continue;
      tuft(ctx, x, y, 0.55 + r() * 0.6, r() < 0.5 ? P.grass[1] : P.grassLight, (r() * 1e6) | 0);
    }
    // clover patches and little flowers
    for (let k = 0; k < 70; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (!ok(x, y)) continue;
      for (let j = 0; j < 3; j++) { const a = j / 3 * TAU - 1.6; ctx.fillStyle = rgb(shade(P.grassLight, 0.1)); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 1.3, y + Math.sin(a) * 1.1, 1.2, 0, TAU); ctx.fill(); }
    }
    for (let k = 0; k < 150; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (!ok(x, y)) continue;
      const c = P.flowers[(r() * P.flowers.length) | 0];
      tinyFlower(ctx, x, y, 1.1 + r() * 0.7, c);
    }
    ctx.restore();
  }
  function tuft(ctx, x, y, s, col, seed) {
    const r = rand(seed), n = 3 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.38 + (r() - 0.5) * 0.25, len = (4 + r() * 3.5) * s, bx = x + (i - (n - 1) / 2) * 0.9 * s;
      const tx = bx + Math.cos(a) * len, ty = y + Math.sin(a) * len;
      ctx.fillStyle = lg(ctx, bx, y, tx, ty, [shade(col, -0.35), col, shade(col, 0.35)]);
      ctx.beginPath(); ctx.moveTo(bx - 0.8 * s, y); ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5 - 0.5, y + Math.sin(a) * len * 0.5, tx, ty); ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5 + 0.6, y + Math.sin(a) * len * 0.5, bx + 0.8 * s, y); ctx.fill();
    }
  }
  function tinyFlower(ctx, x, y, r, c) {
    for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; ctx.fillStyle = rgb(j < 2 ? shade(c, 0.25) : c); ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.75, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
  }

  // The turf lip where the grass ends on the sand: an earth bank, a dark green edge, a lit rim and overhanging blades.
  function turfEdge(ctx, edge, P, seed = 41) {
    const r = rand(seed);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // soft shadow the bank throws onto the sand
    for (const [dy, w, a] of [[7, 16, 0.10], [5, 9, 0.14], [3.5, 5, 0.18]]) { polyline(ctx, edge.map(p => [p[0] + 1.5, p[1] + dy])); ctx.strokeStyle = `rgba(150,96,40,${a})`; ctx.lineWidth = w; ctx.stroke(); }
    // the earth face
    polyline(ctx, edge.map(p => [p[0], p[1] + 2.6])); ctx.strokeStyle = rgb(P.earth); ctx.lineWidth = 4.2; ctx.stroke();
    polyline(ctx, edge.map(p => [p[0], p[1] + 3.6])); ctx.strokeStyle = rgb(shade(P.earth, -0.3)); ctx.lineWidth = 1.4; ctx.stroke();
    // the grass edge and its lit rim
    polyline(ctx, edge); ctx.strokeStyle = rgb(shade(P.grass[1], -0.42)); ctx.lineWidth = 2.2; ctx.stroke();
    polyline(ctx, edge.map(p => [p[0], p[1] - 1.6])); ctx.strokeStyle = rgb(shade(P.grassLight, 0.25), 0.7); ctx.lineWidth = 1; ctx.stroke();
    // blades overhanging the lip
    for (let i = 0; i < edge.length; i++) { if (r() < 0.25) continue; const p = edge[i]; tuft(ctx, p[0] + (r() - 0.5) * 3, p[1] + 1.8, 0.55 + r() * 0.5, r() < 0.5 ? P.grass[1] : P.grassLight, (r() * 1e6) | 0); }
    ctx.restore();
  }

  // =============================== road ===============================
  // A dirt road along pts (resampled ~3px). lit: the walked road (warm, with golden studs); else unwalked (paler,
  // grass creeping in, faint dashes).
  function road(ctx, pts, P, o = {}) {
    const W = o.w || 16, lit = o.lit !== false, r = rand(o.seed || 7);
    const col = lit ? P.road : P.roadDark;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    polyline(ctx, pts.map(p => [p[0] + 1.5, p[1] + 3])); ctx.strokeStyle = 'rgba(20,50,20,.22)'; ctx.lineWidth = W + 7; ctx.stroke();
    polyline(ctx, pts); ctx.strokeStyle = rgb(shade(col, -0.42)); ctx.lineWidth = W + 3; ctx.stroke();
    polyline(ctx, pts); ctx.strokeStyle = rgb(shade(col, -0.12)); ctx.lineWidth = W; ctx.stroke();
    polyline(ctx, pts.map(p => [p[0] - 0.6, p[1] - 0.8])); ctx.strokeStyle = rgb(col); ctx.lineWidth = W - 3; ctx.stroke();
    polyline(ctx, pts.map(p => [p[0] - 0.8, p[1] - 1.2])); ctx.strokeStyle = rgb(shade(col, 0.28), 0.7); ctx.lineWidth = W * 0.42; ctx.stroke();
    // wheel ruts
    for (const d of [-W * 0.24, W * 0.24]) {
      const L = offsetLine(pts, d);
      polyline(ctx, L); ctx.strokeStyle = rgb(shade(col, -0.35), 0.45); ctx.lineWidth = 1.5; ctx.stroke();
      polyline(ctx, L.map(p => [p[0] - 0.4, p[1] + 1])); ctx.strokeStyle = rgb(shade(col, 0.45), 0.45); ctx.lineWidth = 0.8; ctx.stroke();
    }
    // grit and pebbles on the surface
    for (let i = 0; i < pts.length; i++) for (let j = 0; j < 2; j++) {
      const n = normalAt(pts, i), d = (r() - 0.5) * (W - 4), x = pts[i][0] + n[0] * d, y = pts[i][1] + n[1] * d;
      ctx.fillStyle = r() < 0.5 ? rgb(shade(col, -0.4), 0.4) : rgb(shade(col, 0.5), 0.55); ctx.fillRect(x, y, 0.8 + r(), 0.8 + r() * 0.6);
    }
    // edge stones (some missing), lit top-left
    for (const side of [-1, 1]) {
      const E = offsetLine(pts, side * (W / 2 + 0.5));
      for (let i = 1; i < E.length; i += 2 + ((r() * 2) | 0)) {
        if (r() < 0.3) continue;
        const [x, y] = E[i], rr = 1.6 + r() * 1.3, c = r() < 0.5 ? P.stone : shade(P.stone, -0.1);
        ctx.fillStyle = 'rgba(30,40,20,.3)'; ctx.beginPath(); ctx.ellipse(x + 0.8, y + 1, rr * 1.15, rr * 0.8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rg(ctx, x, y, rr * 1.3, [shade(c, 0.45), c, shade(c, -0.4)], x - rr * 0.5, y - rr * 0.5);
        ctx.beginPath(); ctx.ellipse(x, y, rr * 1.15, rr * 0.82, (r() - 0.5), 0, TAU); ctx.fill();
      }
    }
    if (lit) {
      // warm glow of the walked road and the golden studs that mark it
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      polyline(ctx, pts); ctx.strokeStyle = 'rgba(255,200,80,.10)'; ctx.lineWidth = W + 12; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,214,110,.12)'; ctx.lineWidth = W * 0.6; ctx.stroke();
      ctx.restore();
      const step = o.studStep || 13;
      for (let i = Math.round(step / 6); i < pts.length - 2; i += Math.round(step / 3)) {
        const [x, y] = pts[i];
        glow(ctx, x, y, 7, [255, 210, 90], 0.35);
        ctx.fillStyle = 'rgba(110,60,10,.35)'; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 1.3, 2.9, 2.1, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rg(ctx, x, y, 3, ['#fffbe0', '#ffd546', '#d88a12'], x - 1, y - 1.1); ctx.beginPath(); ctx.ellipse(x, y, 2.7, 2.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x - 0.9, y - 0.8, 0.7, 0, TAU); ctx.fill();
      }
    } else {
      ctx.setLineDash([4, 7]); polyline(ctx, pts); ctx.strokeStyle = rgb(shade(col, -0.45), 0.4); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < pts.length; i += 3) { if (r() < 0.5) continue; const n = normalAt(pts, i), d = (r() < 0.5 ? -1 : 1) * (W * 0.3 + r() * W * 0.25); tuft(ctx, pts[i][0] + n[0] * d, pts[i][1] + n[1] * d + 2, 0.5 + r() * 0.4, P.grass[1], (r() * 1e6) | 0); }
    }
    // grass tufts nibbling the edges
    for (let i = 0; i < pts.length; i += 2) { if (r() < 0.55) continue; const n = normalAt(pts, i), side = r() < 0.5 ? -1 : 1, d = side * (W / 2 + 1 + r() * 2); tuft(ctx, pts[i][0] + n[0] * d, pts[i][1] + n[1] * d + 2, 0.55 + r() * 0.45, r() < 0.5 ? P.grass[1] : P.grassLight, (r() * 1e6) | 0); }
    ctx.restore();
  }

  // a stream with sandy, pebbly banks; w(u) gives the water width along it
  function creek(ctx, pts, P, w, seed = 51) {
    const r = rand(seed);
    ctx.save();
    ribbon(ctx, pts, u => w(u) + 12); ctx.fillStyle = 'rgba(30,60,20,.25)'; ctx.fill();
    ribbon(ctx, pts, u => w(u) + 9); ctx.fillStyle = rgb(shade(P.earth, -0.1)); ctx.fill();
    ribbon(ctx, pts, u => w(u) + 6); ctx.fillStyle = rgb(P.bank); ctx.fill();
    ribbon(ctx, pts, u => w(u) + 2); ctx.fillStyle = rgb(shade(P.bank, -0.3)); ctx.fill();
    // water: deep middle, lighter shallows
    ribbon(ctx, pts, u => w(u)); ctx.fillStyle = rgb(P.creek[0]); ctx.fill();
    ribbon(ctx, pts, u => w(u) * 0.72); ctx.fillStyle = rgb(P.creek[1]); ctx.fill();
    ribbon(ctx, pts.map(p => [p[0] + 0.6, p[1] + 0.4]), u => w(u) * 0.36); ctx.fillStyle = rgb(P.creek[2]); ctx.fill();
    // the near bank's shadow on the water (light from top-left: the left/upper bank shades)
    ctx.save(); ribbon(ctx, pts, u => w(u)); ctx.clip();
    polyline(ctx, offsetLine(pts, u => w(u) / 2)); ctx.strokeStyle = 'rgba(10,50,70,.35)'; ctx.lineWidth = 3; ctx.stroke();
    polyline(ctx, offsetLine(pts, u => -w(u) / 2)); ctx.strokeStyle = 'rgba(230,255,250,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    // flow streaks
    ctx.lineCap = 'round';
    for (let k = 0; k < pts.length * 0.5; k++) {
      const i = (r() * (pts.length - 6)) | 0, d = (r() - 0.5) * 0.6, len = 3 + ((r() * 4) | 0), seg = offsetLine(pts.slice(i, i + len), u => d * w(i / pts.length));
      polyline(ctx, seg); ctx.strokeStyle = `rgba(240,255,255,${0.35 + r() * 0.35})`; ctx.lineWidth = 0.9; ctx.stroke();
    }
    for (let k = 0; k < 30; k++) glint(ctx, ...(() => { const i = (r() * pts.length) | 0, n = normalAt(pts, i), d = (r() - 0.5) * w(i / pts.length) * 0.6; return [pts[i][0] + n[0] * d, pts[i][1] + n[1] * d]; })(), 1 + r() * 1.3, 0.7);
    ctx.restore();
    // pebbles on the banks
    for (let k = 0; k < pts.length * 0.9; k++) {
      const i = (r() * pts.length) | 0, side = r() < 0.5 ? -1 : 1, n = normalAt(pts, i), d = side * (w(i / pts.length) / 2 + 1 + r() * 3.5), x = pts[i][0] + n[0] * d, y = pts[i][1] + n[1] * d, rr = 0.8 + r() * 1.4, c = r() < 0.5 ? P.stone : [200, 180, 150];
      ctx.fillStyle = rg(ctx, x, y, rr * 1.3, [shade(c, 0.45), c, shade(c, -0.45)], x - rr * 0.5, y - rr * 0.5); ctx.beginPath(); ctx.ellipse(x, y, rr * 1.1, rr * 0.8, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // =============================== plants ===============================
  const GREENS = [[92, 168, 66], [70, 150, 70], [112, 176, 58], [58, 136, 90], [84, 160, 52]];
  // one palm frond: a curved spine with pinnate leaflets; lit half / shade half, darker-hue edge, light midrib
  function frond(ctx, x, y, ang, L, W, col, drop, P, seed, depth = 0) {
    const r = rand(seed), m = 12;
    const dx = Math.cos(ang), dy = Math.sin(ang) * 0.62;
    const p0 = [x, y], p1 = [x + dx * L * 0.55, y + dy * L * 0.55 - L * 0.16], p2 = [x + dx * L, y + dy * L + L * drop];
    const sp = []; for (let i = 0; i <= m; i++) { const u = i / m, v = 1 - u; sp.push([v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]); }
    const c = shade(col, -depth * 0.35);
    const halves = [1, -1].map(side => {
      const pts = [sp[0]];
      for (let i = 1; i <= m; i++) {
        const u = i / m, n = normalAt(sp, i), t = [sp[Math.min(m, i + 1)][0] - sp[i - 1][0], sp[Math.min(m, i + 1)][1] - sp[i - 1][1]], tl = Math.hypot(...t) || 1;
        const wid = W * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7) * (0.85 + r() * 0.3);
        const tip = [sp[i][0] + n[0] * side * wid + t[0] / tl * L * 0.07, sp[i][1] + n[1] * side * wid + t[1] / tl * L * 0.07];
        const notch = [sp[i][0] + n[0] * side * wid * 0.42, sp[i][1] + n[1] * side * wid * 0.42];
        pts.push(notch, tip);
      }
      pts.push(sp[m]);
      // which half faces the light (up-left)?
      const n = normalAt(sp, m >> 1), lit = (n[0] * side * -0.6 + n[1] * side * -0.8) > 0;
      return { pts, lit, side };
    });
    for (const h of halves) {
      const base = h.lit ? shade(c, 0.04) : shade(c, -0.3);
      ctx.fillStyle = lg(ctx, x, y, p2[0], p2[1], [shade(base, -0.3), base, shade(base, h.lit ? 0.16 : 0.02)]);
      ctx.beginPath(); ctx.moveTo(...h.pts[0]); for (let i = 1; i < h.pts.length; i++) ctx.lineTo(...h.pts[i]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(shade(c, -0.55), 0.75); ctx.lineWidth = 0.55; ctx.lineJoin = 'round'; ctx.stroke();
      if (h.lit) { // rim light on the outer leaflet tips
        ctx.strokeStyle = rgb(shade(c, 0.6), 0.5); ctx.lineWidth = 0.6;
        ctx.beginPath(); for (let i = 2; i < h.pts.length - 1; i += 2) { const a = h.pts[i - 1], b = h.pts[i]; ctx.moveTo(lerp(a[0], b[0], 0.4), lerp(a[1], b[1], 0.4)); ctx.lineTo(b[0], b[1]); } ctx.stroke();
      }
    }
    ctx.lineCap = 'round';
    polyline(ctx, sp); ctx.strokeStyle = rgb(shade(c, -0.4), 0.8); ctx.lineWidth = 1.5; ctx.stroke();
    polyline(ctx, sp.map(p => [p[0] - 0.3, p[1] - 0.4])); ctx.strokeStyle = rgb(shade(c, 0.55), 0.85); ctx.lineWidth = 0.7; ctx.stroke();
  }
  function coconut(ctx, x, y, rr, col = [150, 96, 44]) {
    ctx.fillStyle = rg(ctx, x, y, rr * 1.15, [shade(col, 0.45), col, shade(col, -0.55)], x - rr * 0.4, y - rr * 0.45);
    ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(shade(col, -0.6), 0.6); ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.beginPath(); ctx.ellipse(x - rr * 0.35, y - rr * 0.4, rr * 0.28, rr * 0.18, -0.6, 0, TAU); ctx.fill();
  }
  function palmShadow(ctx, x, y, s, seed, P) {
    const r = rand(seed), h = (48 + r() * 14) * s, lean = (r() - 0.5) * 0.5 + (P.lean || 0);
    const tx = x + lean * h, sx = tx + h * 0.42, sy = y + h * 0.1;
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgb(P.shadow, 0.16); ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(sx, sy); ctx.stroke(); ctx.restore();
    // a star of soft frond shadows
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + r(); blob(ctx, sx + Math.cos(a) * 13 * s, sy + Math.sin(a) * 6 * s, 15 * s, 5 * s, 0.17, P.shadow, a); }
    blob(ctx, sx, sy, 12 * s, 6 * s, 0.22, P.shadow);
  }
  function palm(ctx, x, y, s, seed, P) {
    const r = rand(seed), h = (48 + r() * 14) * s, lean = (r() - 0.5) * 0.5 + (P.lean || 0);
    const tx = x + lean * h, ty = y - h, cx = x + lean * h * 0.12, cy = y - h * 0.55;
    const col = P.palmLeaf[(r() * P.palmLeaf.length) | 0];
    // base mound and roots
    ctx.fillStyle = rg(ctx, x, y, 8 * s, [[0, [130, 96, 52, 0.5]], [1, [130, 96, 52, 0]]]); ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 3.2 * s, 0, 0, TAU); ctx.fill();
    // trunk: a tapered ribbon with a lit-left gradient, then ring scales
    const tr = bezPts([x, y], [cx, cy], [cx + (tx - cx) * 0.4, cy + (ty - cy) * 0.6], [tx, ty], 1.5);
    const wAt = u => (7.4 - 2.8 * u) * s;
    ribbon(ctx, tr, u => wAt(u));
    const tb = P.trunk;
    ctx.fillStyle = lg(ctx, x - 6 * s, 0, x + 6 * s + lean * h * 0.5, 0, [shade(tb, 0.3), tb, shade(tb, -0.5)]); ctx.fill();
    ctx.strokeStyle = rgb(shade(tb, -0.6), 0.8); ctx.lineWidth = 0.7; ctx.stroke();
    const rings = Math.round(h / (4.2 * s));
    for (let k = 1; k < rings; k++) {
      const i = Math.round(k / rings * (tr.length - 1)), p = tr[i], n = normalAt(tr, i), w = wAt(i / (tr.length - 1)) / 2;
      ctx.strokeStyle = rgb(shade(tb, -0.45), 0.75); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p[0] + n[0] * w, p[1] + n[1] * w); ctx.quadraticCurveTo(p[0] + 1.6 * s, p[1] + 1.8 * s, p[0] - n[0] * w, p[1] - n[1] * w); ctx.stroke();
      ctx.strokeStyle = rgb(shade(tb, 0.5), 0.55); ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(p[0] + n[0] * w * 0.9, p[1] + n[1] * w * 0.9 - 1); ctx.quadraticCurveTo(p[0] + 1.4 * s, p[1] + 0.6 * s, p[0], p[1] - 0.8); ctx.stroke();
    }
    // fronds: back (pointing up) first and darker, then coconuts, then the front ones
    const n = 8 + ((r() * 2) | 0), a0 = r() * TAU, fr = [];
    for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU + (r() - 0.5) * 0.35; fr.push({ a, L: (29 + r() * 8) * s, W: (7.6 + r() * 1.6) * s, drop: 0.3 + r() * 0.22, seed: (r() * 1e6) | 0 }); }
    fr.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    const back = fr.filter(f => Math.sin(f.a) < 0.1), front = fr.filter(f => Math.sin(f.a) >= 0.1);
    if (r() < 0.6) frond(ctx, tx, ty + 1, Math.PI * (0.3 + r() * 0.4), 24 * s, 4.5 * s, [176, 138, 74], 0.9, P, seed + 9, 0.1);   // an old dry frond
    for (const f of back) frond(ctx, tx, ty, f.a, f.L, f.W, col, f.drop, P, f.seed, 0.35 - Math.sin(f.a) * -0.1);
    const nc = 2 + ((r() * 3) | 0);
    for (let k = 0; k < nc; k++) coconut(ctx, tx + (k - (nc - 1) / 2) * 3.8 * s, ty + 3 * s + (k % 2) * 1.6 * s, 3.1 * s, P.coconut);
    for (const f of front) frond(ctx, tx, ty, f.a, f.L, f.W, col, f.drop, P, f.seed, 0);
    // young shoots in the crown
    for (let k = 0; k < 2; k++) frond(ctx, tx, ty, -Math.PI / 2 + (k - 0.5) * 0.9, 13 * s, 3.4 * s, shade(col, 0.2), -0.25, P, seed + k * 31, 0);
    ctx.fillStyle = rg(ctx, tx - 1, ty - 1, 4 * s, [shade(col, 0.5), shade(col, -0.2)]); ctx.beginPath(); ctx.arc(tx, ty, 2.6 * s, 0, TAU); ctx.fill();
  }

  // a leafy cluster (one puff of a canopy): scalloped outline, radial shading, leaf marks, rim light, coloured edge
  function cluster(ctx, x, y, rr, col, seed, P, o = {}) {
    const r = rand(seed), n = 7 + ((r() * 4) | 0), rot = r() * TAU;
    // shadow side underneath (gives each puff volume against the one behind)
    ctx.fillStyle = rgb(shade(col, -0.62));
    ctx.beginPath(); scallop(ctx, x + rr * 0.1, y + rr * 0.16, rr, n, 0.14, rot); ctx.fill();
    ctx.fillStyle = rg(ctx, x, y, rr * 1.25, [[0, shade(col, 0.42)], [0.45, col], [0.85, shade(col, -0.35)], [1, shade(col, -0.5)]], x - rr * 0.45, y - rr * 0.5);
    ctx.beginPath(); scallop(ctx, x, y, rr, n, 0.14, rot); ctx.fill();
    ctx.strokeStyle = rgb(shade(col, -0.58), 0.8); ctx.lineWidth = 0.7; ctx.stroke();
    // leaf marks: lit crescents upper-left, dark ones lower-right
    ctx.save(); ctx.beginPath(); scallop(ctx, x, y, rr, n, 0.14, rot); ctx.clip();
    ctx.lineCap = 'round';
    for (let k = 0; k < 9 + rr * 0.4; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rr * 0.85, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d, lit = (Math.cos(a) * -0.6 + Math.sin(a) * -0.8) > -0.1;
      const lr = rr * (0.16 + r() * 0.12);
      ctx.strokeStyle = lit ? rgb(shade(col, 0.55), 0.55) : rgb(shade(col, -0.5), 0.45); ctx.lineWidth = Math.max(0.6, rr * 0.06);
      ctx.beginPath(); ctx.arc(lx, ly, lr, lit ? 3.4 : 0.3, lit ? 4.9 : 1.8); ctx.stroke();
    }
    ctx.restore();
    // rim light along the top-left
    ctx.strokeStyle = rgb(P.rim, 0.55); ctx.lineWidth = Math.max(0.8, rr * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, rr * 1.04, 3.5, 4.6); ctx.stroke();
    // a glossy dab
    ctx.fillStyle = 'rgba(255,255,220,.32)'; ctx.beginPath(); ctx.ellipse(x - rr * 0.38, y - rr * 0.45, rr * 0.26, rr * 0.15, -0.6, 0, TAU); ctx.fill();
  }
  function hibiscus(ctx, x, y, rr, c, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU;
      ctx.fillStyle = rg(ctx, Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, rr * 0.75, [shade(c, 0.35), c, shade(c, -0.35)], Math.cos(a) * rr * 0.3 - rr * 0.2, Math.sin(a) * rr * 0.3 - rr * 0.2);
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * rr * 0.52, Math.sin(a) * rr * 0.52, rr * 0.56, rr * 0.44, a, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = rgb(shade(c, -0.5)); ctx.beginPath(); ctx.arc(0, 0, rr * 0.28, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffe36a'; ctx.lineWidth = rr * 0.12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rr * 0.5, -rr * 0.55); ctx.stroke();
    ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(rr * 0.5, -rr * 0.55, rr * 0.13, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function fruit(ctx, x, y, rr, c) {
    ctx.fillStyle = rg(ctx, x, y, rr * 1.2, [shade(c, 0.5), c, shade(c, -0.5)], x - rr * 0.4, y - rr * 0.4); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,.8)'; ctx.beginPath(); ctx.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.25, 0, TAU); ctx.fill();
  }
  // a broadleaf jungle tree: short trunk, a canopy of overlapping clusters, with fruit or blossoms
  function treeLayout(x, y, s, seed) {
    const r = rand(seed), R = (24 + r() * 7) * s, cy = y - 10 * s - R * 0.85, cl = [];
    const n = 7 + ((r() * 4) | 0);
    for (let k = 0; k < n; k++) { const a = k / n * TAU + r() * 0.5, d = R * (0.42 + r() * 0.2); cl.push([x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.72, R * (0.46 + r() * 0.14)]); }
    cl.push([x - R * 0.05, cy - R * 0.12, R * 0.55]);
    cl.sort((p, q) => p[1] - q[1]);
    return { R, cy, cl, r };
  }
  function treeShadow(ctx, x, y, s, seed, P) { const { R } = treeLayout(x, y, s, seed); blob(ctx, x + R * 0.5, y + 1, R * 1.25, R * 0.48, 0.34, P.shadow); blob(ctx, x + 2, y, R * 0.5, R * 0.2, 0.3, P.shadow); }
  function tree(ctx, x, y, s, seed, P) {
    const { R, cy, cl, r } = treeLayout(x, y, s, seed);
    const col = P.treeLeaf[(r() * P.treeLeaf.length) | 0], tb = P.bark;
    // trunk with root flare and a fork into the canopy
    ctx.fillStyle = lg(ctx, x - 5 * s, 0, x + 5 * s, 0, [shade(tb, 0.3), tb, shade(tb, -0.55)]);
    ctx.beginPath(); ctx.moveTo(x - 7 * s, y + 1); ctx.quadraticCurveTo(x - 3 * s, y - 3 * s, x - 3 * s, y - 12 * s); ctx.lineTo(x - 7 * s, cy + R * 0.2); ctx.lineTo(x - 3 * s, cy + R * 0.2); ctx.lineTo(x, y - 16 * s); ctx.lineTo(x + 4 * s, cy + R * 0.1); ctx.lineTo(x + 7 * s, cy + R * 0.2); ctx.lineTo(x + 3 * s, y - 12 * s); ctx.quadraticCurveTo(x + 3 * s, y - 3 * s, x + 8 * s, y + 1); ctx.quadraticCurveTo(x, y + 2.5 * s, x - 7 * s, y + 1); ctx.fill();
    ctx.strokeStyle = rgb(shade(tb, -0.6), 0.7); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = rgb(shade(tb, 0.45), 0.5); ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 2 * s); ctx.lineTo(x - 2 * s, y - 10 * s); ctx.stroke();
    // canopy
    // dark mass behind to fill gaps
    ctx.fillStyle = rgb(shade(col, -0.66)); ctx.beginPath(); for (const [cx, cyy, cr] of cl) { ctx.moveTo(cx + cr, cyy + 2 * s); ctx.arc(cx, cyy + 2 * s, cr, 0, TAU); } ctx.fill();
    for (const [cx, cyy, cr] of cl) cluster(ctx, cx, cyy, cr, mix(col, shade(col, (cx - x) / R * -0.15 + (cy - cyy) / R * 0.2), 0.8), (r() * 1e6) | 0, P);
    const kind = r();
    if (kind < 0.3) for (let k = 0; k < 5; k++) { const [cx, cyy, cr] = cl[(r() * cl.length) | 0]; fruit(ctx, cx + (r() - 0.5) * cr, cyy + (r() - 0.2) * cr * 0.7, 2.4 * s, P.fruit[(r() * P.fruit.length) | 0]); }
    else if (kind < 0.55) for (let k = 0; k < 6; k++) { const [cx, cyy, cr] = cl[(r() * cl.length) | 0]; hibiscus(ctx, cx + (r() - 0.5) * cr, cyy + (r() - 0.5) * cr * 0.8, 2.6 * s, P.blossom[(r() * P.blossom.length) | 0], r() * 6); }
  }
  // a low bush: a few clusters, often with hibiscus or berries
  function bushLayout(x, y, s, seed) { const r = rand(seed), R = (11 + r() * 4) * s, cl = []; const n = 4 + ((r() * 3) | 0); for (let k = 0; k < n; k++) { const u = n === 1 ? 0.5 : k / (n - 1); cl.push([x + (u - 0.5) * R * 1.5 + (r() - 0.5) * 3 * s, y - R * 0.5 - Math.sin(u * Math.PI) * R * 0.45 + (r() - 0.5) * 3 * s, R * (0.5 + r() * 0.2)]); } cl.sort((p, q) => p[1] - q[1]); return { R, cl, r }; }
  function bushShadow(ctx, x, y, s, seed, P) { const { R } = bushLayout(x, y, s, seed); blob(ctx, x + R * 0.35, y + 1, R * 1.25, R * 0.42, 0.32, P.shadow); }
  function bush(ctx, x, y, s, seed, P) {
    const { R, cl, r } = bushLayout(x, y, s, seed), col = P.bushLeaf[(r() * P.bushLeaf.length) | 0];
    ctx.fillStyle = rgb(shade(col, -0.66)); ctx.beginPath(); for (const [cx, cy, cr] of cl) { ctx.moveTo(cx + cr, cy + 1.5); ctx.arc(cx, cy + 1.5, cr, 0, TAU); } ctx.fill();
    for (const [cx, cy, cr] of cl) cluster(ctx, cx, cy, cr, col, (r() * 1e6) | 0, P);
    const kind = r();
    if (kind < 0.45) for (let k = 0; k < 4; k++) { const [cx, cy, cr] = cl[(r() * cl.length) | 0]; hibiscus(ctx, cx + (r() - 0.5) * cr, cy + (r() - 0.6) * cr * 0.7, 2.4 * s, P.blossom[(r() * P.blossom.length) | 0], r() * 6); }
    else if (kind < 0.7) for (let k = 0; k < 6; k++) { const [cx, cy, cr] = cl[(r() * cl.length) | 0]; fruit(ctx, cx + (r() - 0.5) * cr, cy + (r() - 0.5) * cr * 0.6, 1.3 * s, [220, 60, 90]); }
  }
  // a broad tropical leaf (banana / elephant ear): gradient blade, midrib, side veins, lit and shaded halves
  function bigLeaf(ctx, x, y, ang, L, W, col, P, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const bend = o.bend ?? 0.15;
    const top = () => { ctx.moveTo(0, 0); ctx.bezierCurveTo(L * 0.25, -W * 1.05, L * 0.75, -W * 0.85 + L * bend * 0.5, L, L * bend); };
    const bot = () => { ctx.bezierCurveTo(L * 0.75, W * 0.85 + L * bend * 0.5, L * 0.25, W * 1.0, 0, 0); };
    // shaded lower half, lit upper half
    ctx.beginPath(); top(); bot(); ctx.closePath(); ctx.fillStyle = lg(ctx, 0, 0, L, 0, [shade(col, -0.45), shade(col, -0.2), shade(col, -0.05)]); ctx.fill();
    ctx.strokeStyle = rgb(shade(col, -0.6), 0.8); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.beginPath(); top(); ctx.quadraticCurveTo(L * 0.5, L * bend * 0.3, 0, 0); ctx.closePath(); ctx.fillStyle = lg(ctx, 0, -W, L * 0.6, 0, [shade(col, 0.3), col, shade(col, -0.1)]); ctx.fill();
    // veins
    ctx.lineCap = 'round';
    for (let k = 1; k < 7; k++) { const u = k / 7; for (const sd of [-1, 1]) { ctx.strokeStyle = sd < 0 ? rgb(shade(col, 0.45), 0.4) : rgb(shade(col, -0.5), 0.35); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(L * u, L * bend * u * u * 0.5); ctx.quadraticCurveTo(L * (u + 0.06), sd * W * 0.4, L * (u + 0.12), sd * W * 0.75 * Math.sin(Math.PI * Math.min(1, u + 0.1))); ctx.stroke(); } }
    ctx.strokeStyle = rgb(shade(col, 0.6), 0.85); ctx.lineWidth = Math.max(0.8, W * 0.12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, L * bend * 0.3, L * 0.96, L * bend * 0.95); ctx.stroke();
    // rim light on the upper edge
    ctx.strokeStyle = rgb(P.rim, 0.55); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(L * 0.1, -W * 0.5); ctx.bezierCurveTo(L * 0.3, -W * 1.0, L * 0.6, -W * 0.8, L * 0.85, -W * 0.3 + L * bend * 0.5); ctx.stroke();
    ctx.restore();
  }
  function plantShadow(ctx, x, y, s, seed, P) { blob(ctx, x + 6 * s, y + 1, 18 * s, 6 * s, 0.3, P.shadow); }
  function plant(ctx, x, y, s, seed, P) {   // a clump of big leaves (elephant ear / banana sucker)
    const r = rand(seed), n = 5 + ((r() * 3) | 0), col = P.plantLeaf[(r() * P.plantLeaf.length) | 0], lv = [];
    for (let k = 0; k < n; k++) lv.push({ a: -Math.PI / 2 + (k - (n - 1) / 2) * 0.5 + (r() - 0.5) * 0.2, L: (16 + r() * 7) * s, W: (5 + r() * 2) * s });
    lv.sort((p, q) => Math.abs(q.a + Math.PI / 2) - Math.abs(p.a + Math.PI / 2));
    for (const l of lv) {
      ctx.strokeStyle = rgb(shade(col, -0.3)); ctx.lineWidth = 1.1 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(l.a) * l.L * 0.3, y + Math.sin(l.a) * l.L * 0.3); ctx.stroke();
      bigLeaf(ctx, x + Math.cos(l.a) * l.L * 0.3, y + Math.sin(l.a) * l.L * 0.3, l.a, l.L, l.W, shade(col, (r() - 0.5) * 0.2), P, { bend: (Math.cos(l.a) > 0 ? 1 : -1) * 0.12 });
    }
  }
  function fern(ctx, x, y, s, seed, P) {
    const r = rand(seed), col = P.fern;
    for (let k = 0; k < 7; k++) frond(ctx, x, y, -Math.PI / 2 + (k - 3) * 0.42 + (r() - 0.5) * 0.15, (13 + r() * 5) * s, 3.4 * s, shade(col, (r() - 0.5) * 0.2), 0.05, P, (r() * 1e6) | 0, k % 2 ? 0.15 : 0);
  }
  function rockShape(x, y, rx, ry, seed) { const r = rand(seed), n = 9, pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.8 + r() * 0.35; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k * (Math.sin(a) < 0 ? 1.15 : 0.85)]); } return pts; }
  function rockShadow(ctx, x, y, s, seed, P) { blob(ctx, x + 5 * s, y + 3 * s, 14 * s, 5 * s, 0.35, P.shadow); }
  function rock(ctx, x, y, s, seed, P, o = {}) {
    const r = rand(seed), rx = (9 + r() * 4) * s, ry = (7 + r() * 3) * s, c = o.col || P.rock, pts = rockShape(x, y - ry * 0.55, rx, ry, seed);
    ctx.beginPath(); smoothPath(ctx, pts, true);
    ctx.fillStyle = rg(ctx, x, y - ry * 0.6, rx * 1.4, [shade(c, 0.4), c, shade(c, -0.5)], x - rx * 0.45, y - ry * 1.1); ctx.fill();
    ctx.strokeStyle = rgb(shade(c, -0.6), 0.85); ctx.lineWidth = 0.8; ctx.stroke();
    // a lit top facet and a crack
    ctx.save(); ctx.beginPath(); smoothPath(ctx, pts, true); ctx.clip();
    ctx.fillStyle = rgb(shade(c, 0.35), 0.55); ctx.beginPath(); ctx.ellipse(x - rx * 0.25, y - ry * 1.05, rx * 0.55, ry * 0.35, -0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(shade(c, -0.5), 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + rx * 0.1, y - ry * 1.3); ctx.lineTo(x + rx * 0.25, y - ry * 0.7); ctx.lineTo(x + rx * 0.1, y - ry * 0.3); ctx.stroke();
    if (o.moss) { ctx.fillStyle = rg(ctx, x - rx * 0.2, y - ry * 1.4, rx, [shade(P.grassLight, 0.2), [P.grassLight[0], P.grassLight[1], P.grassLight[2], 0]]); ctx.beginPath(); ctx.ellipse(x - rx * 0.2, y - ry * 1.25, rx * 0.8, ry * 0.45, 0, 0, TAU); ctx.fill(); }
    if (o.wet) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, y - ry * 1.1, rx * 0.2, ry * 0.12, -0.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // =============================== hut & launch pad ===============================
  function bamboo(ctx, x0, y0, x1, y1, w, c) {   // a bamboo pole (cylinder shading, node rings)
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
    ctx.fillStyle = lg(ctx, 0, -w / 2, 0, w / 2, [shade(c, 0.45), c, shade(c, -0.5)]); ctx.beginPath(); ctx.roundRect(0, -w / 2, L, w, w * 0.4); ctx.fill();
    ctx.strokeStyle = rgb(shade(c, -0.6), 0.7); ctx.lineWidth = 0.5; ctx.stroke();
    for (let u = 7 + (x0 % 5); u < L - 2; u += 9) { ctx.fillStyle = rgb(shade(c, -0.4)); ctx.fillRect(u, -w / 2, 1, w); ctx.fillStyle = rgb(shade(c, 0.5), 0.8); ctx.fillRect(u + 1, -w / 2, 0.6, w); }
    ctx.restore();
  }
  function thatchRows(ctx, outline, x0, x1, yTop, yBot, rows, P, seed, darkK = 0) {
    // fill a region (outline adds its path) with rows of straw: each row a scalloped band with strands
    const r = rand(seed), st = P.straw;
    ctx.save(); ctx.beginPath(); outline(ctx); ctx.clip();
    ctx.fillStyle = rgb(shade(st, -0.45 - darkK)); ctx.fillRect(x0 - 2, yTop - 2, x1 - x0 + 4, yBot - yTop + 6);
    const rh = (yBot - yTop) / rows;
    for (let k = 0; k < rows + 1; k++) {
      const yb = yTop + (k + 1) * rh + 2, ya = yb - rh * 1.5;
      const c = shade(st, -darkK + (k % 2 ? -0.04 : 0.04));
      // the row: a band with a scalloped bottom edge
      ctx.beginPath(); ctx.moveTo(x0 - 4, ya);
      ctx.lineTo(x1 + 4, ya); ctx.lineTo(x1 + 4, yb);
      for (let x = x1 + 4; x > x0 - 4; x -= 4) ctx.quadraticCurveTo(x - 2, yb + 1.6 + r() * 1.2, x - 4, yb);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, ya, 0, yb + 2, [shade(c, -0.35), c, shade(c, 0.2), shade(c, -0.1)]); ctx.fill();
      // strands
      ctx.lineCap = 'round';
      for (let x = x0 - 2; x < x1 + 2; x += 0.9 + r() * 0.8) {
        const v = r(); ctx.strokeStyle = v < 0.45 ? rgb(shade(c, 0.45), 0.6) : rgb(shade(c, -0.45), 0.45); ctx.lineWidth = 0.45;
        const yy = ya + rh * 0.4 + r() * rh * 0.3; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + (r() - 0.5) * 1.2, yb + r() * 1.6); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function hutShadow(ctx, x, y, s, P) { blob(ctx, x + 24 * s, y + 4 * s, 58 * s, 15 * s, 0.34, P.shadow); }
  function hut(ctx, x, y, s, seed, P) {
    // (x, y): ground point under the middle of the stilts. 3/4 view: a front face and a right-hand side face.
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const wood = P.wood, Fw = 46, Sd = 18, Sk = -9;   // front width, side depth, side skew (up)
    const deckY = -22, wallH = 30;
    const fx0 = -Fw / 2 - 4, fx1 = Fw / 2 - 4;    // front face x range
    // back stilts
    for (const [px, py] of [[fx0 + Sd, Sk], [fx1 + Sd, Sk]]) { bamboo(ctx, px, py + 1, px, py + deckY - 1, 3.6, shade(wood, -0.3)); }
    // deck: top (parallelogram) + front beam
    const deckTop = () => { ctx.moveTo(fx0 - 6, deckY); ctx.lineTo(fx1 + 6, deckY); ctx.lineTo(fx1 + 6 + Sd, deckY + Sk); ctx.lineTo(fx0 - 6 + Sd, deckY + Sk); ctx.closePath(); };
    ctx.beginPath(); deckTop(); ctx.fillStyle = lg(ctx, 0, deckY + Sk, 0, deckY, [shade(wood, 0.1), shade(wood, 0.3)]); ctx.fill();
    ctx.strokeStyle = rgb(shade(wood, -0.4), 0.6); ctx.lineWidth = 0.5; for (let k = 1; k < 10; k++) { const u = k / 10; ctx.beginPath(); ctx.moveTo(lerp(fx0 - 6, fx1 + 6, u), deckY); ctx.lineTo(lerp(fx0 - 6, fx1 + 6, u) + Sd, deckY + Sk); ctx.stroke(); }
    // side wall (darker) and front wall: bamboo poles
    const sideWall = () => { ctx.moveTo(fx1, deckY); ctx.lineTo(fx1 + Sd, deckY + Sk); ctx.lineTo(fx1 + Sd, deckY + Sk - wallH); ctx.lineTo(fx1, deckY - wallH); ctx.closePath(); };
    ctx.save(); ctx.beginPath(); sideWall(); ctx.clip();
    for (let k = 0; k < 7; k++) { const u = k / 6, px = fx1 + u * Sd, py = deckY + Sk * u; bamboo(ctx, px, py + 2, px, py - wallH - 4, 3.2, shade(P.cane, -0.3)); }
    ctx.fillStyle = 'rgba(40,30,60,.22)'; ctx.fillRect(fx1, deckY - wallH - 12, Sd + 2, wallH + 14);
    // side window with a warm glow
    ctx.fillStyle = '#3a2214'; ctx.beginPath(); ctx.moveTo(fx1 + 6, deckY - 10 + Sk * 0.33); ctx.lineTo(fx1 + 13, deckY - 10 + Sk * 0.72); ctx.lineTo(fx1 + 13, deckY - 20 + Sk * 0.72); ctx.lineTo(fx1 + 6, deckY - 20 + Sk * 0.33); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,90,.5)'; ctx.beginPath(); ctx.moveTo(fx1 + 7, deckY - 11 + Sk * 0.36); ctx.lineTo(fx1 + 12, deckY - 11 + Sk * 0.68); ctx.lineTo(fx1 + 12, deckY - 16 + Sk * 0.68); ctx.lineTo(fx1 + 7, deckY - 16 + Sk * 0.36); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(fx0, deckY - wallH, Fw, wallH); ctx.clip();
    for (let px = fx0 + 1.6; px < fx1 + 2; px += 3.3) bamboo(ctx, px, deckY + 2, px + 0.2, deckY - wallH - 3, 3.3, mix(P.cane, shade(P.cane, 0.15), (px * 7.3) % 1));
    // horizontal lashings
    for (const yy of [deckY - 6, deckY - wallH + 6]) { ctx.fillStyle = lg(ctx, 0, yy - 1.5, 0, yy + 1.5, [shade(wood, 0.3), shade(wood, -0.3)]); ctx.fillRect(fx0, yy - 1.4, Fw, 2.8); }
    // doorway with lamp-lit interior
    ctx.fillStyle = lg(ctx, 0, deckY - 22, 0, deckY, ['#2a1408', '#5a3010']); ctx.beginPath(); ctx.roundRect(-10, deckY - 22, 13, 22, [5, 5, 0, 0]); ctx.fill();
    ctx.fillStyle = rg(ctx, -3, deckY - 8, 12, [[0, [255, 200, 110, 0.85]], [1, [255, 140, 40, 0]]]); ctx.fillRect(-10, deckY - 22, 13, 22);
    ctx.strokeStyle = rgb(shade(wood, -0.2)); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-10.5, deckY); ctx.lineTo(-10.5, deckY - 17); ctx.quadraticCurveTo(-10.5, deckY - 23, -3.5, deckY - 23); ctx.quadraticCurveTo(3.5, deckY - 23, 3.5, deckY - 17); ctx.lineTo(3.5, deckY); ctx.stroke();
    // window with a propped shutter
    ctx.fillStyle = '#2a1408'; ctx.fillRect(9, deckY - 21, 9, 8); ctx.fillStyle = 'rgba(255,200,110,.55)'; ctx.fillRect(10, deckY - 20, 7, 6);
    ctx.restore();
    ctx.fillStyle = lg(ctx, 0, deckY - 27, 0, deckY - 21, [shade(P.straw, 0.1), shade(P.straw, -0.4)]); ctx.beginPath(); ctx.moveTo(8, deckY - 21); ctx.lineTo(19, deckY - 21); ctx.lineTo(21, deckY - 27); ctx.lineTo(6, deckY - 27); ctx.closePath(); ctx.fill();
    // the eave's shadow on the walls
    ctx.fillStyle = lg(ctx, 0, deckY - wallH, 0, deckY - wallH + 9, ['rgba(40,20,10,.5)', 'rgba(40,20,10,0)']); ctx.fillRect(fx0, deckY - wallH, Fw, 9);
    ctx.beginPath(); sideWall(); ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(40,20,10,.35)'; ctx.fillRect(fx1, deckY - wallH - 12, Sd + 2, 10); ctx.restore();
    // front deck beam + railing posts + front stilts with cross braces
    ctx.fillStyle = lg(ctx, 0, deckY, 0, deckY + 4, [shade(wood, 0.2), shade(wood, -0.35)]); ctx.fillRect(fx0 - 6, deckY, Fw + 12, 3.6);
    ctx.beginPath(); ctx.moveTo(fx1 + 6, deckY); ctx.lineTo(fx1 + 6 + Sd, deckY + Sk); ctx.lineTo(fx1 + 6 + Sd, deckY + Sk + 3.6); ctx.lineTo(fx1 + 6, deckY + 3.6); ctx.closePath(); ctx.fillStyle = rgb(shade(wood, -0.35)); ctx.fill();
    for (const px of [fx0 - 3, fx1 + 3]) bamboo(ctx, px, 1, px, deckY + 1, 4.2, wood);
    ctx.strokeStyle = rgb(shade(P.rope, -0.1), 0.9); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(fx0 - 3, deckY + 4); ctx.lineTo(fx1 + 3, -2); ctx.moveTo(fx1 + 3, deckY + 4); ctx.lineTo(fx0 - 3, -2); ctx.stroke();
    for (const px of [fx0 - 3, fx1 + 3]) { ctx.fillStyle = rgb(P.rope); ctx.fillRect(px - 2.4, deckY + 3, 4.8, 2); ctx.fillRect(px - 2.4, -4, 4.8, 1.6); }
    // sand mounded around the stilts
    for (const px of [fx0 - 3, fx1 + 3]) blob(ctx, px, 1.5, 5, 1.8, 0.5, [190, 150, 90]);
    // railing at the front of the deck (left part), with a fishing net draped on it
    bamboo(ctx, fx0 - 6, deckY - 9, -12, deckY - 9, 2, wood);
    for (const px of [fx0 - 6, -13]) bamboo(ctx, px, deckY, px, deckY - 10, 2, wood);
    ctx.strokeStyle = 'rgba(240,230,200,.6)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); for (let k = 0; k <= 5; k++) { const xx = fx0 - 6 + k * 3; ctx.moveTo(xx, deckY - 9); ctx.quadraticCurveTo(xx + 1.5, deckY - 3, xx + 3, deckY - 0.5); ctx.moveTo(xx + 3, deckY - 9); ctx.quadraticCurveTo(xx + 1.5, deckY - 3, xx, deckY - 0.5); } ctx.stroke();
    // floats on the net
    for (let k = 0; k < 3; k++) { fruit(ctx, fx0 - 4 + k * 5, deckY - 4 + (k % 2) * 2, 1.4, [255, 120, 60]); }
    // roof: big thatch pyramid in 3/4 (front triangle-ish face + side face), with overhang
    const ex0 = fx0 - 9, ex1 = fx1 + 9, eY = deckY - wallH + 4, apX = (fx0 + fx1) / 2 + Sd * 0.5, apY = eY - 40 + Sk * 0.5;
    const sx1 = ex1 + Sd + 3, sY = eY + Sk - 1;
    const sideRoof = c => { c.moveTo(ex1, eY); c.lineTo(sx1, sY); c.lineTo(apX, apY); c.closePath(); };
    const frontRoof = c => { c.moveTo(ex0, eY); c.quadraticCurveTo((ex0 + ex1) / 2, eY + 3, ex1, eY); c.lineTo(apX, apY); c.closePath(); };
    // roof shadow cast on the deck/side
    thatchRows(ctx, sideRoof, ex1 - 2, sx1 + 2, apY, eY + 4, 6, P, seed + 3, 0.28);
    thatchRows(ctx, frontRoof, ex0 - 2, ex1 + 2, apY, eY + 4, 7, P, seed + 5, 0);
    // lit rim on the front roof's left edge and a darker ridge between faces
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(shade(P.straw, 0.55), 0.8); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ex0 + 1, eY - 1); ctx.lineTo(apX - 0.6, apY + 1); ctx.stroke();
    ctx.strokeStyle = rgb(shade(P.straw, -0.55), 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex1, eY); ctx.lineTo(apX, apY); ctx.stroke();
    // a ragged fringe hanging from the eaves
    for (const [ax, ay, bx, by, dk] of [[ex0, eY, ex1, eY, 0], [ex1, eY, sx1, sY, 0.3]]) {
      for (let u = 0; u <= 1; u += 0.025) { const xx = lerp(ax, bx, u), yy = lerp(ay, by, u) + (dk ? 0 : Math.sin(u * Math.PI) * 3); ctx.strokeStyle = rgb(shade(P.straw, (u * 37 % 1 < 0.5 ? 0.2 : -0.3) - dk), 0.9); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(xx, yy - 1); ctx.lineTo(xx + 0.3, yy + 2 + (u * 53 % 1) * 2.5); ctx.stroke(); }
    }
    // topknot bundle with rope wraps
    ctx.fillStyle = lg(ctx, apX - 3, 0, apX + 3, 0, [shade(P.straw, 0.3), shade(P.straw, -0.4)]); ctx.beginPath(); ctx.moveTo(apX - 3, apY + 3); ctx.lineTo(apX - 1, apY - 7); ctx.lineTo(apX + 1.5, apY - 7); ctx.lineTo(apX + 3, apY + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(P.rope); ctx.fillRect(apX - 2.6, apY - 1, 5.2, 1.4); ctx.fillRect(apX - 2.2, apY - 4, 4.4, 1.2);
    // flag
    ctx.strokeStyle = rgb(shade(wood, -0.3)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(apX, apY - 6); ctx.lineTo(apX, apY - 22); ctx.stroke();
    ctx.fillStyle = lg(ctx, apX, 0, apX + 15, 0, ['#ff6a44', '#d8321e']); ctx.beginPath(); ctx.moveTo(apX, apY - 22); ctx.quadraticCurveTo(apX + 8, apY - 24, apX + 15, apY - 19); ctx.quadraticCurveTo(apX + 8, apY - 16, apX, apY - 15); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,200,.5)'; ctx.beginPath(); ctx.moveTo(apX, apY - 22); ctx.quadraticCurveTo(apX + 8, apY - 24, apX + 15, apY - 19); ctx.quadraticCurveTo(apX + 8, apY - 21, apX, apY - 20); ctx.fill();
    fruit(ctx, apX, apY - 22.5, 1.2, [255, 210, 80]);
    // hanging lantern under the eave
    ctx.strokeStyle = rgb(P.rope); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(fx1 - 3, eY + 1); ctx.lineTo(fx1 - 3, eY + 5); ctx.stroke();
    glow(ctx, fx1 - 3, eY + 8, 12, [255, 190, 90], 0.45);
    ctx.fillStyle = rg(ctx, fx1 - 3, eY + 8, 3.5, ['#fff6c0', '#ffb040', '#c86010']); ctx.beginPath(); ctx.ellipse(fx1 - 3, eY + 8, 2.6, 3.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(shade(wood, -0.3)); ctx.fillRect(fx1 - 5, eY + 4.2, 4, 1.2); ctx.fillRect(fx1 - 5, eY + 11, 4, 1.2);
    // ladder from the deck to the sand
    for (const lx of [fx0 + 1, fx0 + 8]) bamboo(ctx, lx, deckY + 2, lx - 6, 5, 1.8, wood);
    for (let k = 1; k < 5; k++) { const u = k / 5, yy = lerp(deckY + 2, 5, u), xa = lerp(fx0 + 1, fx0 - 5, u); bamboo(ctx, xa, yy, xa + 7, yy, 1.5, shade(wood, 0.1)); }
    ctx.restore();
  }

  function torch(ctx, x, y, s, P) {
    blob(ctx, x + 4 * s, y + 1, 6 * s, 2 * s, 0.3, P.shadow);
    bamboo(ctx, x, y, x, y - 22 * s, 2.6 * s, P.cane);
    ctx.fillStyle = lg(ctx, x - 3 * s, 0, x + 3 * s, 0, [shade(P.wood, 0.3), shade(P.wood, -0.4)]); ctx.beginPath(); ctx.moveTo(x - 3.4 * s, y - 26 * s); ctx.lineTo(x + 3.4 * s, y - 26 * s); ctx.lineTo(x + 2 * s, y - 20 * s); ctx.lineTo(x - 2 * s, y - 20 * s); ctx.closePath(); ctx.fill();
    glow(ctx, x, y - 30 * s, 22 * s, [255, 170, 60], 0.5);
    ctx.fillStyle = lg(ctx, 0, y - 37 * s, 0, y - 25 * s, ['rgba(255,240,170,.95)', 'rgba(255,170,50,.95)', 'rgba(230,80,20,.9)']);
    ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 26 * s); ctx.quadraticCurveTo(x - 3.6 * s, y - 31 * s, x - 0.4 * s, y - 37 * s); ctx.quadraticCurveTo(x + 0.6 * s, y - 32 * s, x + 2 * s, y - 34 * s); ctx.quadraticCurveTo(x + 3.8 * s, y - 29 * s, x + 3 * s, y - 26 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,.9)'; ctx.beginPath(); ctx.ellipse(x, y - 28.5 * s, 1.2 * s, 2 * s, 0, 0, TAU); ctx.fill();
  }
  // the level-1 launch pad: a round platform of planks set in a ring of stones, scorched in the middle
  function launchPad(ctx, x, y, R, P) {
    blob(ctx, x + 6, y + 6, R * 1.25, R * 0.6, 0.35, P.shadow);
    // stone ring (side + top)
    ctx.fillStyle = rgb(shade(P.stone, -0.5)); ctx.beginPath(); ctx.ellipse(x, y + 4, R + 4, (R + 4) * 0.62, 0, 0, TAU); ctx.fill();
    const r = rand(77);
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * TAU, sx = x + Math.cos(a) * (R + 1.5), sy = y + Math.sin(a) * (R + 1.5) * 0.62, c = shade(P.stone, (r() - 0.5) * 0.2);
      ctx.fillStyle = rg(ctx, sx, sy, 5, [shade(c, 0.45), c, shade(c, -0.45)], sx - 1.6, sy - 1.8); ctx.beginPath(); ctx.ellipse(sx, sy, 4.4, 3.3, a * 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(shade(c, -0.55), 0.6); ctx.lineWidth = 0.5; ctx.stroke();
    }
    // the plank deck
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, R - 1.5, (R - 1.5) * 0.62, 0, 0, TAU); ctx.clip();
    const w = P.wood;
    for (let k = -8; k <= 8; k++) { const px = x + k * 5.2, c = shade(w, ((k * 37) % 7) / 7 * 0.2 - 0.05); ctx.fillStyle = lg(ctx, px - 2.6, 0, px + 2.6, 0, [shade(c, 0.25), c, shade(c, -0.25)]); ctx.fillRect(px - 2.5, y - R, 5, R * 2); ctx.fillStyle = rgb(shade(c, -0.55), 0.7); ctx.fillRect(px + 2.3, y - R, 0.6, R * 2); ctx.fillStyle = rgb(shade(c, -0.6)); ctx.beginPath(); ctx.arc(px, y - R * 0.45, 0.6, 0, TAU); ctx.arc(px, y + R * 0.45, 0.6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rg(ctx, x, y, R * 0.8, [[0, [40, 20, 10, 0.55]], [0.6, [60, 30, 10, 0.25]], [1, [60, 30, 10, 0]]]); ctx.fillRect(x - R, y - R, R * 2, R * 2);
    // painted ring
    ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(x, y, R * 0.78, R * 0.78 * 0.62, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = lg(ctx, 0, y - R * 0.6, 0, y, ['rgba(40,20,0,.3)', 'rgba(40,20,0,0)']); ctx.fillRect(x - R, y - R, R * 2, R * 0.6);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,250,220,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, R - 1.5, (R - 1.5) * 0.62, 0, 3.3, 4.7); ctx.stroke();
  }

  // =============================== bridge ===============================
  function bridge(ctx, x, y, ang, len, wid, P) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    blob(ctx, 3, 7, len * 0.6, wid * 0.75, 0.38, [10, 40, 50]);
    const w = P.wood;
    // stringers
    for (const d of [-wid / 2, wid / 2]) { ctx.fillStyle = lg(ctx, 0, d - 1.5, 0, d + 1.5, [shade(w, 0.1), shade(w, -0.5)]); ctx.fillRect(-len / 2 - 2, d - 1.6, len + 4, 3.2); }
    // planks
    const r = rand(13);
    for (let px = -len / 2; px < len / 2 - 1; px += 4.4) {
      const c = shade(w, (r() - 0.5) * 0.18), j = (r() - 0.5) * 1.2;
      ctx.save(); ctx.translate(px + 2, j * 0.5); ctx.rotate((r() - 0.5) * 0.05);
      ctx.fillStyle = 'rgba(40,20,10,.4)'; ctx.fillRect(-1.6, -wid / 2 + 0.6, 4, wid);
      ctx.fillStyle = lg(ctx, -2, 0, 2, 0, [shade(c, 0.35), c, shade(c, -0.3)]); ctx.beginPath(); ctx.roundRect(-2, -wid / 2 - 1, 3.8, wid + 2, 0.8); ctx.fill();
      ctx.strokeStyle = rgb(shade(c, -0.5), 0.5); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-0.5, -wid / 2); ctx.lineTo(-0.2, wid / 2); ctx.stroke();
      ctx.fillStyle = rgb(shade(c, -0.65)); ctx.fillRect(-0.4, -wid / 2 + 0.2, 0.8, 0.8); ctx.fillRect(-0.4, wid / 2 - 1, 0.8, 0.8);
      ctx.restore();
    }
    // posts and ropes
    for (const d of [-1, 1]) {
      const yy = d * (wid / 2 + 1.5);
      for (const px of [-len / 2 - 1, 0, len / 2 + 1]) {
        ctx.fillStyle = 'rgba(20,30,20,.3)'; ctx.beginPath(); ctx.ellipse(px + 2, yy + 2, 2.4, 1.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rg(ctx, px, yy, 2.4, [shade(w, 0.45), w, shade(w, -0.5)], px - 0.8, yy - 0.8); ctx.beginPath(); ctx.arc(px, yy, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgb(shade(w, -0.6), 0.7); ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.strokeStyle = rgb(shade(P.rope, -0.3)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-len / 2 - 1, yy); ctx.quadraticCurveTo(-len / 4, yy + d * 1.4, 0, yy); ctx.quadraticCurveTo(len / 4, yy + d * 1.4, len / 2 + 1, yy); ctx.stroke();
      ctx.strokeStyle = rgb(shade(P.rope, 0.4)); ctx.lineWidth = 0.5; ctx.stroke();
    }
    ctx.restore();
  }

  // =============================== nodes ===============================
  function star(ctx, x, y, r, on) {
    const path = () => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); };
    ctx.save(); ctx.lineJoin = 'round';
    path(); ctx.fillStyle = 'rgba(60,30,0,.35)'; ctx.save(); ctx.translate(0.6, 1.2); ctx.fill(); ctx.restore();
    if (on) {
      path(); ctx.fillStyle = lg(ctx, x - r, y - r, x + r * 0.6, y + r, ['#fffbd0', '#ffd83a', '#f2a414', '#c06a06']); ctx.fill();
      ctx.strokeStyle = '#9a5206'; ctx.lineWidth = Math.max(0.7, r * 0.15); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,240,.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.22, y - r * 0.3, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill();
    } else { path(); ctx.fillStyle = 'rgba(70,40,30,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,236,200,.45)'; ctx.lineWidth = Math.max(0.7, r * 0.13); ctx.stroke(); }
    ctx.restore();
  }
  function node(ctx, x, y, r, label, state, nStars, P, font) {
    const pal = state === 'done' ? { rim: ['#fffbd0', '#ffd23a', '#e09412', '#9a5a08'], side: [138, 80, 8], face: ['#fffdf2', '#fbe8bc'], num: '#7a4210' }
      : state === 'open' ? { rim: ['#f2ffc0', '#9ae04a', '#4aa020', '#25600e'], side: [30, 84, 14], face: ['#ffffff', '#fff1c4'], num: '#2e6014' }
      : { rim: ['#d8d2c6', '#a29c90', '#6e6a62', '#4a4640'], side: [58, 54, 48], face: ['#aaa59a', '#7a766e'], num: '#3c3832' };
    blob(ctx, x + 3, y + r * 0.7, r * 1.45, r * 0.6, 0.45, [30, 30, 10]);
    if (state === 'open') { glow(ctx, x, y, r * 3, [255, 230, 120], 0.45); ctx.strokeStyle = 'rgba(255,246,170,.8)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(x, y + 4, r * 1.55, r * 1.55 * 0.78, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(255,246,170,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y + 4, r * 1.95, r * 1.95 * 0.78, 0, 0, TAU); ctx.stroke(); }
    const ry = r * 0.86;
    // thickness
    ctx.fillStyle = lg(ctx, x - r, 0, x + r, 0, [shade(pal.side, 0.3), pal.side, shade(pal.side, -0.4)]); ctx.beginPath(); ctx.ellipse(x, y + 4.5, r, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(shade(pal.side, -0.3)); for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI; ctx.fillRect(x + Math.cos(a) * r * 0.98 - 0.4, y + Math.sin(a) * ry + 1.5, 0.9, 4); }
    // rim
    ctx.fillStyle = rg(ctx, x, y, r * 1.2, pal.rim, x - r * 0.45, y - r * 0.55); ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, TAU); ctx.fill();
    // coin ridges round the rim
    for (let k = 0; k < 28; k++) { const a = k / 28 * TAU, lit = Math.cos(a) * -0.6 + Math.sin(a) * -0.8 > 0; ctx.fillStyle = lit ? 'rgba(255,255,220,.45)' : 'rgba(120,60,0,.28)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.88, y + Math.sin(a) * ry * 0.88, r * 0.045, 0, TAU); ctx.fill(); }
    // recessed face
    ctx.fillStyle = rgb(shade(pal.side, 0.1), 0.85); ctx.beginPath(); ctx.ellipse(x, y - 0.6, r * 0.75, ry * 0.75, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, x, y, r * 0.9, pal.face, x - r * 0.3, y - r * 0.4); ctx.beginPath(); ctx.ellipse(x, y + 0.5, r * 0.71, ry * 0.71, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 0.75, ry * 0.75, 0, 0.2, 1.9); ctx.stroke();
    // number
    ctx.font = `400 ${Math.round(r * 1.1)}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,240,.9)'; ctx.fillText(label, x + 0.5, y + 2.6);
    ctx.fillStyle = pal.num; ctx.fillText(label, x, y + 1.6);
    // gloss
    sheen(ctx, x, y - 1, r * 1.05, 0.55, 3.45, 4.7, 0.12);
    glint(ctx, x - r * 0.62, y - r * 0.52, r * 0.2, 0.95);
    // stars
    if (state !== 'locked') for (let j = 0; j < 3; j++) star(ctx, x + (j - 1) * r * 0.74, y + r * 1.02 - (j === 1 ? r * 0.16 : 0), j === 1 ? r * 0.36 : r * 0.3, j < nStars);
  }

  // =============================== small life ===============================
  function crab(ctx, x, y, s, ang, P) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    blob(ctx, 2, 3, 8, 3.5, 0.35, [90, 60, 30]);
    const c = P.crab;
    ctx.strokeStyle = rgb(shade(c, -0.35)); ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (const d of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(d * 3, 0.5 + k * 1.4); ctx.lineTo(d * 6.5, -0.5 + k * 2.2); ctx.lineTo(d * 7.8, 2 + k * 2.3); ctx.stroke(); }
    for (const d of [-1, 1]) { // claws
      ctx.strokeStyle = rgb(shade(c, -0.2)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(d * 3, -1); ctx.lineTo(d * 5.5, -4); ctx.stroke();
      ctx.fillStyle = rg(ctx, d * 6, -5.5, 3, [shade(c, 0.45), c, shade(c, -0.45)], d * 5.4, -6.4); ctx.beginPath(); ctx.ellipse(d * 6.2, -5.6, 2.4, 1.8, d * 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(shade(c, -0.5)); ctx.beginPath(); ctx.moveTo(d * 6.5, -6.6); ctx.lineTo(d * 8.6, -8); ctx.lineTo(d * 7.4, -6); ctx.fill();
    }
    ctx.fillStyle = rg(ctx, 0, 0, 5.4, [shade(c, 0.5), c, shade(c, -0.5)], -1.4, -1.6); ctx.beginPath(); ctx.ellipse(0, 0.4, 4.6, 3.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(shade(c, -0.55), 0.8); ctx.lineWidth = 0.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,220,.6)'; ctx.beginPath(); ctx.ellipse(-1.3, -1, 1.5, 0.8, -0.4, 0, TAU); ctx.fill();
    for (const d of [-1, 1]) { ctx.strokeStyle = rgb(shade(c, -0.3)); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(d * 1.2, -2.4); ctx.lineTo(d * 1.6, -4.4); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d * 1.6, -4.8, 0.95, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(d * 1.7, -4.7, 0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function starfish(ctx, x, y, s, rot, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const path = () => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 2.2 : 5.4; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
    ctx.lineJoin = 'round'; path(); ctx.fillStyle = 'rgba(120,70,30,.3)'; ctx.save(); ctx.translate(0.7, 1); ctx.fill(); ctx.restore();
    path(); ctx.fillStyle = rg(ctx, 0, 0, 6, [shade(c, 0.4), c, shade(c, -0.4)], -1.5, -1.5); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = rgb(c); ctx.stroke();
    ctx.lineWidth = 0.4; ctx.strokeStyle = rgb(shade(c, -0.5), 0.7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,220,.75)'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; for (const d of [1.6, 3]) { ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.35, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function shell(ctx, x, y, s, rot, c, kind = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    blob(ctx, 0.8, 1.2, 4, 2, 0.3, [120, 80, 40]);
    if (kind === 0) {   // scallop
      ctx.fillStyle = lg(ctx, 0, -4, 0, 2, [shade(c, 0.45), c, shade(c, -0.3)]); ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-3.8, -1.5); ctx.quadraticCurveTo(0, -5.6, 3.8, -1.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(shade(c, -0.45), 0.7); ctx.lineWidth = 0.35; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(k * 1.5, -3.6 + Math.abs(k) * 0.6); ctx.stroke(); }
      ctx.fillStyle = rgb(shade(c, -0.2)); ctx.fillRect(-1.2, 1.4, 2.4, 1);
    } else {   // spiral
      ctx.fillStyle = rg(ctx, 0, 0, 4, [shade(c, 0.5), c, shade(c, -0.4)], -1, -1); ctx.beginPath(); ctx.ellipse(0, 0, 3.8, 2.3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(shade(c, -0.5), 0.8); ctx.lineWidth = 0.45; ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.2) { const rr = 0.2 + a * 0.24; ctx.lineTo(-1.4 + Math.cos(a) * rr, Math.sin(a) * rr * 0.6); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-1.6, -0.9, 0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function butterfly(ctx, x, y, s, rot, c1, c2) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    blob(ctx, 4, 9, 3.5, 1.4, 0.2, [20, 50, 20]);
    for (const d of [-1, 1]) {
      ctx.fillStyle = rg(ctx, d * 3, -2, 4.4, [shade(c1, 0.5), c1, shade(c1, -0.5)], d * 2, -3); ctx.beginPath(); ctx.ellipse(d * 3.2, -1.6, 3.4, 2.6, d * -0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(shade(c1, -0.6)); ctx.lineWidth = 0.45; ctx.stroke();
      ctx.fillStyle = rg(ctx, d * 2.4, 2, 2.6, [shade(c2, 0.4), c2, shade(c2, -0.5)]); ctx.beginPath(); ctx.ellipse(d * 2.3, 1.8, 2, 1.6, d * 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(d * 4.4, -2.4, 0.55, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#4a2a20'; ctx.beginPath(); ctx.ellipse(0, 0, 0.7, 3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a2a20'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(-1.2, -4.6); ctx.moveTo(0, -2.6); ctx.lineTo(1.2, -4.6); ctx.stroke();
    ctx.restore();
  }
  function gull(ctx, x, y, s, rot, flap, shadowDy = 30) {
    // shadow on the water / ground below
    ctx.save(); ctx.translate(x + shadowDy * 0.5, y + shadowDy); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = 'rgba(10,40,70,.18)'; ctx.beginPath(); ctx.moveTo(-9, flap); ctx.quadraticCurveTo(-4, -3, 0, 0); ctx.quadraticCurveTo(4, -3, 9, flap); ctx.quadraticCurveTo(4, -1, 0, 2); ctx.quadraticCurveTo(-4, -1, -9, flap); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    for (const d of [-1, 1]) {
      ctx.fillStyle = lg(ctx, 0, -3, d * 10, flap, ['#ffffff', '#e8eef4', '#9aa6b8']);
      ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.quadraticCurveTo(d * 4, -4, d * 10, flap); ctx.quadraticCurveTo(d * 5, -1, 0, 1.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a6478'; ctx.beginPath(); ctx.moveTo(d * 8, flap - 1.4); ctx.lineTo(d * 10, flap); ctx.lineTo(d * 7.6, flap - 0.2); ctx.fill();
    }
    ctx.fillStyle = lg(ctx, 0, -2, 0, 3, ['#ffffff', '#c8d2de']); ctx.beginPath(); ctx.ellipse(0, 0.5, 1.4, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.moveTo(-0.5, -2.2); ctx.lineTo(0, -3.8); ctx.lineTo(0.5, -2.2); ctx.fill();
    ctx.restore();
  }
  function fishShadow(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = 'rgba(10,70,90,.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 1.6, 0, 0, TAU); ctx.moveTo(4, 0); ctx.lineTo(7, -1.8); ctx.lineTo(7, 1.8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function turtle(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(10,60,80,.25)'; ctx.beginPath(); ctx.ellipse(1.5, 2, 7, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,196,120,.92)'; for (const [px, py, a] of [[-5, -4, -0.8], [5, -4, 0.8], [-4.5, 4, 0.6], [4.5, 4, -0.6]]) { ctx.beginPath(); ctx.ellipse(px, py, 3.6, 1.4, a, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, -7, 1.8, 2.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rg(ctx, 0, 0, 6, ['rgba(200,180,96,.97)', 'rgba(116,128,62,.97)', 'rgba(66,86,42,.97)'], -1.5, -2); ctx.beginPath(); ctx.ellipse(0, 0, 5, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,30,.5)'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.moveTo(-4.6, -1.5); ctx.lineTo(4.6, -1.5); ctx.moveTo(-4.2, 2.5); ctx.lineTo(4.2, 2.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,220,.35)'; ctx.beginPath(); ctx.ellipse(-1.6, -2.4, 1.6, 1, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function lily(ctx, x, y, s, rot, flower) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(10,50,60,.3)'; ctx.beginPath(); ctx.ellipse(0.8, 1, 4.2, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, -4, -3, 4, 3, ['#b4ea7a', '#5aa83c', '#2e7a2a']); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.8, 0, 0.35, TAU - 0.1); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,90,30,.7)'; ctx.lineWidth = 0.35; ctx.stroke();
    if (flower) hibiscus(ctx, -0.5, -0.4, 1.6, [255, 150, 200], 0.3);
    ctx.restore();
  }
  function driftwood(ctx, x, y, s, rot, P) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    blob(ctx, 1.5, 2.5, 13, 3, 0.3, [130, 90, 40]);
    const c = [196, 176, 150];
    ctx.fillStyle = lg(ctx, 0, -2.4, 0, 2.4, [shade(c, 0.4), c, shade(c, -0.45)]); ctx.beginPath(); ctx.roundRect(-11, -2.2, 22, 4.4, 2.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(8, -5.5); ctx.lineTo(9, -4.6); ctx.lineTo(5, 0); ctx.fill();
    ctx.strokeStyle = rgb(shade(c, -0.45), 0.6); ctx.lineWidth = 0.4; for (let k = -9; k < 9; k += 3) { ctx.beginPath(); ctx.moveTo(k, -1.5); ctx.lineTo(k + 2.5, -1.2); ctx.stroke(); }
    ctx.restore();
  }
  function canoe(ctx, x, y, s, rot, P) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    blob(ctx, 2, 4, 22, 5, 0.32, [110, 80, 40]);
    const c = P.canoe;
    ctx.fillStyle = lg(ctx, 0, -5, 0, 5, [shade(c, 0.35), c, shade(c, -0.5)]); ctx.beginPath(); ctx.moveTo(-21, -1); ctx.quadraticCurveTo(0, -7, 21, -1); ctx.quadraticCurveTo(0, 7, -21, -1); ctx.fill();
    ctx.strokeStyle = rgb(shade(c, -0.6), 0.7); ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -3, 0, 3, ['#5a2e14', '#8a5428']); ctx.beginPath(); ctx.moveTo(-16, -1); ctx.quadraticCurveTo(0, -4.4, 16, -1); ctx.quadraticCurveTo(0, 2.4, -16, -1); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-19, -1.6); ctx.quadraticCurveTo(0, -6.4, 19, -1.6); ctx.stroke();
    // painted stripe + seats
    ctx.strokeStyle = '#e8402a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-18, 0.6); ctx.quadraticCurveTo(0, 4.8, 18, 0.6); ctx.stroke();
    for (const px of [-7, 6]) bamboo(ctx, px, -3.2, px, 1.4, 1.4, P.wood);
    // a paddle resting across
    ctx.strokeStyle = rgb(P.wood); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(12, 5); ctx.stroke();
    ctx.fillStyle = lg(ctx, 10, 3, 16, 8, [shade(P.wood, 0.3), shade(P.wood, -0.3)]); ctx.beginPath(); ctx.ellipse(13.5, 6, 3.4, 1.6, 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function cloud(ctx, x, y, s, P, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    const puffs = [[-26, 4, 15], [-10, -6, 19], [10, -9, 17], [27, 1, 14], [2, 6, 16], [-18, 8, 12], [18, 9, 12]];
    ctx.fillStyle = rgb(P.cloudShade); ctx.beginPath(); for (const [dx, dy, r] of puffs) { ctx.moveTo(x + (dx + r) * s, y + (dy + 3) * s); ctx.arc(x + dx * s, y + (dy + 3) * s, r * s, 0, TAU); } ctx.fill();
    for (const [dx, dy, r] of puffs) { const px = x + dx * s, py = y + dy * s; ctx.fillStyle = rg(ctx, px, py, r * s * 1.2, ['#ffffff', '#f6f8ff', rgb(mix(P.cloudShade, [255, 255, 255], 0.4))], px - r * s * 0.4, py - r * s * 0.6); ctx.beginPath(); ctx.arc(px, py, r * s * 0.95, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  window.ART = { TAU, clamp, lerp, rand, rgb, mix, shade, lg, rg, blob, glow, smoothPath, resample, bezPts, polyline, normalAt, offsetLine, ribbon, scallop, sheen, glint,
    sea, shallows, sand, grass, tuft, tinyFlower, turfEdge, road, creek, frond, coconut, palm, palmShadow, cluster, hibiscus, fruit, tree, treeShadow, bush, bushShadow,
    bigLeaf, plant, plantShadow, fern, rock, rockShadow, bamboo, hut, hutShadow, torch, launchPad, bridge, star, node, crab, starfish, shell, butterfly, gull, fishShadow,
    turtle, lily, driftwood, canoe, cloud, GREENS };
})();
