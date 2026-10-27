// Coconut Island map painted the way the gameplay is drawn (prototype/index.html): vector shapes filled with 2-3 stop
// gradients lit from the top left, a thin edge in a darker hue of the object's own colour (never black), detail as
// drawn lines (a dark furrow with a lit ridge beside it: bark grain, strata, thatch strands, planks, ripples), vines
// and moss like the thorn spike's, specular strokes on the lit side, an underside shadow gradient inside each mass,
// and soft glows on the key things. No noise or grain.
//
// One sun: the ground is seen from above, everything that stands on it (trees, palms, the hut, signs, torches,
// tokens) is seen side-on in the same 3/4 view, stands on its base point and throws the same soft shadow down and to
// the right (castShadow), at the same angle and length ratio. Light comes from the top left everywhere: lit faces,
// rim lights and specular strokes sit on the upper left.
// Every function draws in map units (the phone screen is 390 x 844), so the same code can paint the 1640 x 2480 island.
(() => {
  const TAU = Math.PI * 2;
  const col = x => !Array.isArray(x) ? x : `rgba(${x[0] | 0},${x[1] | 0},${x[2] | 0},${x[3] ?? 1})`;
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // the game's pkLG / pkRG (radial light sits up and to the left of the centre)
  function LG(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), col(s))); return g; }
  function RG(c, x, y, r, stops) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.15); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), col(s))); return g; }
  function rand(seed) { let a = seed >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); }
  // a smooth curve through control points, as dense points (Catmull-Rom)
  function spline(pts, per = 10) {
    const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n - 1)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[n - 1].slice()); return out;
  }
  // shift a polyline sideways (positive = to the right of its direction of travel, y down)
  function offset(pts, d) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const dd = typeof d === 'function' ? d(i / (pts.length - 1), i) : d;
      return [p[0] - dy / L * dd, p[1] + dx / L * dd];
    });
  }
  function closedSmooth(c, pts) {
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    c.beginPath(); const s = m(pts[n - 1], pts[0]); c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], mm = m(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], mm[0], mm[1]); }
    c.closePath();
  }
  const stroke = (c, style, w) => { c.strokeStyle = col(style); c.lineWidth = w; c.stroke(); };
  // the game's signature detail line: a dark furrow with a lit ridge just above-left of it
  function furrow(c, pts, dark, lit, w = 1.1, off = [-0.6, -1.1]) {
    poly(c, pts); stroke(c, dark, w);
    if (lit) { c.save(); c.translate(off[0], off[1]); poly(c, pts); stroke(c, lit, w * 0.75); c.restore(); }
  }
  const dist = (pts, x, y) => { let d = 1e9; for (const p of pts) d = Math.min(d, Math.hypot(p[0] - x, p[1] - y)); return d; };
  const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  // stroke weights shared by every prop, so nothing is drawn heavier than its neighbours
  const EW = 1.1, EW_S = 0.8, DET = 0.75;
  function softShadow(c, x, y, rx, ry, a, rot = 0, cl = [20, 30, 16]) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
    g.addColorStop(0, rgb(cl, a)); g.addColorStop(0.6, rgb(cl, a * 0.6)); g.addColorStop(1, rgb(cl, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
  }
  // THE sun: the shadow of anything standing at (x, y) that is h tall and w wide falls down and to the right, along
  // SUN (the same angle for every prop) with a length in proportion to its height, plus a tight contact shadow at its foot
  const SUN = 0.32;
  function castShadow(c, P, x, y, h, w) {
    const sun = P.sun ?? SUN, L = h * (P.shLen ?? 0.3), k = L / (h * 0.3);
    if (k < 1.5) softShadow(c, x + w * 0.05 + Math.cos(sun) * L, y + 1 + Math.sin(sun) * L, w * 0.42 + h * 0.26 * k, Math.max(2.2, w * 0.15 + h * 0.035), P.shadowA, sun, P.shadowC);
    else {   // a long low-sun shadow: it starts at the trunk's foot and runs out along the sun's line, widening into the
      // crown's shadow at its far end, so every band leads back to the tree that casts it
      const dx = Math.cos(sun), dy = Math.sin(sun), ry = Math.max(2.2, w * 0.15 + h * 0.035);
      softShadow(c, x + dx * L * 0.25, y + 1 + dy * L * 0.25, L * 0.3, ry * 0.45, P.shadowA * 0.9, sun, P.shadowC);
      softShadow(c, x + dx * L * 0.62, y + 1 + dy * L * 0.62, L * 0.32, ry * 0.75, P.shadowA * 0.8, sun, P.shadowC);
      softShadow(c, x + dx * L * 0.95, y + 1 + dy * L * 0.95, Math.max(L * 0.22, w * 0.45), ry * 1.1, P.shadowA * 0.75, sun, P.shadowC);
    }
    softShadow(c, x + w * 0.06 + 0.6, y + 0.8, w * 0.48 + 2, Math.max(1.6, w * 0.14), P.shadowA * 1.7, 0, P.shadowC);
    softShadow(c, x + w * 0.04, y + 0.4, w * 0.3 + 1, Math.max(0.9, w * 0.07), P.shadowA * 1.6, 0, P.shadowC);   // the tight dark contact right at its foot
  }
  function glow(c, x, y, r, rgbc, a) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(rgbc, a)); g.addColorStop(0.4, rgb(rgbc, a * 0.45)); g.addColorStop(1, rgb(rgbc, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  // a pool of warm light on the ground round a lamp or a fire: a flat ellipse that brightens and warms what it lands
  // on (screen), with a soft-light pass so the colour under it stays saturated
  function lightPool(c, x, y, rx, ry, rgbc, a) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    for (const [op, k] of [['screen', 1], ['soft-light', 0.8]]) { c.globalCompositeOperation = op; const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgb(rgbc, a * k)); g.addColorStop(0.5, rgb(rgbc, a * k * 0.45)); g.addColorStop(1, rgb(rgbc, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); }
    c.restore();
  }
  // slanting soft light shafts from the top left (the sun's direction), like the gameplay's jungle god rays
  function rays(c, W, H, rgbc, a, slant = 0.45) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [x0, w, k] of [[-40, 70, 1], [90, 40, 0.7], [170, 90, 0.8], [330, 50, 0.55]]) {
      const g = c.createLinearGradient(0, 0, 0, H * 0.85); g.addColorStop(0, rgb(rgbc, a * k)); g.addColorStop(1, rgb(rgbc, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, -10); c.lineTo(x0 + w, -10); c.lineTo(x0 + w * (1 + slant) + H * slant, H * 0.85); c.lineTo(x0 + H * slant - w * 0.2, H * 0.85); c.closePath(); c.fill();
    }
    c.restore();
  }

  // ---------------- palettes ----------------
  // day: the ground a warm yellow-green, the leaves a cooler blue-green, so trees separate from the lawn. dusk: a real
  // sunset, not a darkened day: blue-green grass, peach-lavender sand, teal-to-indigo sea, warm orange rims, violet shadows
  const COIN = { lit: [255, 250, 214], hi: [255, 222, 96], mid: [234, 170, 40], lo: [176, 108, 20], edge: [136, 80, 12], deep: [100, 58, 8] };
  const PAL = {
    day: {
      name: 'day',
      sea: { deep: [26, 82, 128], mid: [40, 124, 150], shal: [84, 178, 172], surf: [142, 214, 196], foam: [240, 246, 230], foamEdge: [100, 166, 162], dark: [18, 64, 104], lit: [200, 240, 226] },
      sand: { lit: [244, 224, 174], mid: [228, 200, 150], shade: [204, 170, 122], edge: [160, 122, 80], wet: [198, 166, 118], dark: [172, 134, 88], ridge: [255, 246, 216] },
      grass: { lit: [172, 200, 102], mid: [134, 170, 84], shade: [92, 132, 66], edge: [58, 96, 50], tuft: [78, 118, 58], tuftLit: [204, 228, 138], patch: [180, 206, 112] },
      earth: { lit: [178, 132, 86], mid: [134, 92, 58], shade: [92, 60, 36], edge: [70, 42, 24] },
      leaf: { lit: [150, 210, 104], mid: [62, 140, 80], shade: [30, 88, 64], deep: [14, 52, 48], edge: [20, 62, 46], rim: [214, 252, 156], vein: [22, 72, 50], sheen: [214, 252, 156] },
      bark: { lit: [196, 136, 86], mid: [146, 92, 54], shade: [100, 60, 32], edge: [72, 38, 18], ridge: [255, 214, 160] },
      road: { lit: [236, 208, 156], mid: [214, 180, 128], shade: [184, 146, 98], edge: [142, 102, 62] },
      water: { deep: [40, 112, 140], mid: [66, 150, 166], lit: [196, 238, 230], bank: [118, 84, 52] }, white: [255, 255, 250],
      delta: { deep: [44, 126, 152], mid: [70, 168, 176], shal: [118, 208, 196], pale: [178, 232, 216], lit: [226, 252, 240] },
      rock: { lit: [186, 178, 162], mid: [136, 128, 116], shade: [92, 86, 78], edge: [70, 62, 56] },
      straw: { lit: [244, 210, 134], mid: [214, 170, 96], shade: [162, 120, 62], edge: [118, 80, 38] },
      cane: { lit: [228, 202, 136], mid: [192, 156, 94], shade: [144, 110, 62], edge: [104, 72, 36] },
      wood: { lit: [206, 152, 98], mid: [162, 112, 68], shade: [116, 76, 44], edge: [84, 50, 26] },
      stone: { lit: [222, 206, 164], mid: [178, 160, 120], shade: [128, 112, 84], edge: [92, 76, 56], ridge: [252, 242, 206] },
      bog: { deep: [30, 58, 54], mid: [56, 90, 76], lit: [168, 204, 176], scum: [150, 176, 70] },
      mud: { lit: [140, 124, 82], mid: [104, 90, 60], shade: [72, 62, 42], edge: [50, 42, 28] },
      thorn: { base: [120, 70, 40], mid: [176, 96, 64], tip: [236, 70, 96], edge: [84, 36, 26], lit: [255, 210, 170] },
      trap: { dome: [[246, 255, 168], [212, 242, 90], [140, 207, 52], [74, 154, 34], [33, 86, 14]], deep: [22, 62, 8], lin: [[255, 176, 184], [255, 90, 110], [224, 32, 62], [138, 10, 42], [58, 4, 20]], margin: [[255, 251, 200], [238, 242, 122], [184, 204, 58]], cil: [[255, 253, 240], [255, 239, 192], [255, 194, 168], [255, 106, 120]], stem: [[170, 220, 90], [90, 160, 50], [46, 100, 30], [24, 58, 16]], spot: [200, 40, 50], nectar: [255, 196, 70] },
      lotus: [246, 130, 170], cattail: [[176, 112, 62], [132, 80, 42], [90, 52, 26]],
      shadowA: 0.26, shadowC: [24, 44, 30], glowK: 0.4, lamp: 0.25, window: [255, 200, 110], rimA: 0.55, sun: 0.32, shLen: 0.3, rimOff: [1.1, 1.3], rimDir: [-0.75, -0.66],
    },
    dusk: {
      name: 'dusk',
      sea: { deep: [36, 42, 102], mid: [52, 70, 130], shal: [92, 108, 156], surf: [164, 146, 172], foam: [250, 224, 210], foamEdge: [92, 92, 138], dark: [26, 26, 74], lit: [255, 184, 124] },
      sand: { lit: [244, 200, 156], mid: [214, 168, 146], shade: [158, 128, 142], edge: [104, 80, 102], wet: [160, 124, 134], dark: [122, 92, 112], ridge: [255, 224, 184] },
      grass: { lit: [134, 168, 100], mid: [84, 130, 90], shade: [48, 94, 84], edge: [28, 62, 60], tuft: [44, 88, 78], tuftLit: [240, 190, 124], patch: [160, 178, 108] },
      earth: { lit: [172, 112, 92], mid: [112, 74, 70], shade: [72, 48, 60], edge: [50, 30, 44] },
      leaf: { lit: [112, 160, 118], mid: [48, 100, 98], shade: [32, 72, 84], deep: [22, 50, 66], edge: [26, 58, 66], rim: [255, 168, 96], vein: [26, 60, 70], sheen: [210, 196, 150] },
      bark: { lit: [204, 124, 90], mid: [134, 78, 66], shade: [84, 50, 60], edge: [58, 30, 42], ridge: [255, 182, 130] },
      road: { lit: [236, 180, 144], mid: [196, 146, 132], shade: [146, 108, 118], edge: [98, 68, 84] },
      water: { deep: [40, 66, 118], mid: [70, 104, 152], lit: [240, 192, 172], bank: [82, 54, 60] }, white: [222, 204, 214],
      delta: { deep: [40, 58, 110], mid: [60, 86, 134], shal: [86, 110, 152], pale: [128, 134, 168], lit: [250, 190, 160] },
      rock: { lit: [196, 154, 142], mid: [120, 102, 114], shade: [74, 64, 86], edge: [52, 44, 64] },
      straw: { lit: [255, 184, 112], mid: [206, 140, 92], shade: [134, 88, 88], edge: [92, 56, 58] },
      cane: { lit: [240, 178, 120], mid: [180, 126, 94], shade: [118, 82, 84], edge: [82, 50, 54] },
      wood: { lit: [218, 140, 98], mid: [152, 94, 74], shade: [98, 62, 68], edge: [66, 36, 46] },
      stone: { lit: [222, 168, 140], mid: [156, 120, 116], shade: [100, 80, 96], edge: [68, 52, 72], ridge: [255, 204, 168] },
      bog: { deep: [26, 36, 62], mid: [46, 62, 86], lit: [236, 172, 150], scum: [104, 130, 92] },
      mud: { lit: [104, 84, 88], mid: [76, 60, 72], shade: [54, 42, 58], edge: [36, 28, 42] },
      thorn: { base: [100, 54, 50], mid: [156, 76, 70], tip: [240, 80, 96], edge: [64, 28, 36], lit: [255, 190, 150] },
      trap: { dome: [[240, 236, 160], [176, 214, 104], [110, 170, 84], [58, 116, 66], [28, 64, 44]], deep: [20, 46, 36], lin: [[255, 170, 170], [240, 86, 104], [200, 30, 64], [120, 12, 48], [50, 6, 26]], margin: [[255, 236, 190], [220, 214, 130], [160, 170, 80]], cil: [[255, 240, 226], [250, 220, 190], [250, 180, 160], [250, 100, 120]], stem: [[150, 190, 110], [76, 130, 80], [40, 84, 60], [22, 46, 40]], spot: [190, 40, 60], nectar: [255, 180, 80] },
      lotus: [240, 140, 180], cattail: [[180, 104, 82], [124, 70, 60], [80, 44, 46]],
      shadowA: 0.36, shadowC: [44, 30, 96], glowK: 1, lamp: 1, window: [255, 172, 72], rimA: 1, sun: 0.16, shLen: 0.6, rimOff: [1.8, 0.4], rimDir: [-0.97, -0.24],
    },
  };

  // ---------------- sea ----------------
  // colour bands from the beach out to deep water: light teal over the shelf, deep blue beyond; each band's seaward
  // edge a line-pair (a darker line in the band's own hue with a lit line just inside the shallower band)
  function sea(c, P, coast, W, H) {
    const S = P.sea, top = Math.min(...coast.map(p => p[1]));
    c.fillStyle = LG(c, 0, top + 30, 0, H, [S.mid, S.deep, mix(S.deep, S.dark, 0.4)]); c.fillRect(-20, top - 10, W + 40, H - top + 40);
    const bands = [[62, mix(S.shal, S.mid, 0.55), S.mid], [36, mix(S.surf, S.shal, 0.6), mix(S.shal, S.mid, 0.3)], [16, S.surf, mix(S.surf, S.shal, 0.5)]];
    // the outer shelf fades into the deep water over several soft steps (no hard band); the two inner bands keep a
    // drawn edge, lighter toward the deep
    bands.forEach(([d, ca, cb], bi) => {
      const soft = bi === 0, steps = soft ? 6 : 1;
      for (let k = steps - 1; k >= 0; k--) {
        const dd = d + (soft ? (k - 2) * 5 : 0), edge = offset(coast, (u, i) => dd + 3 * Math.sin(i * 0.23 + d) + 1.5 * Math.sin(i * 0.61));
        poly(c, [...offset(coast, -2), ...edge.slice().reverse()]); c.closePath();
        if (soft) { c.fillStyle = rgb(mix(ca, cb, 0.4), 0.28); c.fill(); continue; }
        c.fillStyle = LG(c, 0, top, 0, top + d + 14, [ca, cb]); c.fill();
        poly(c, edge); stroke(c, rgb(mix(cb, S.dark, 0.4), bi === 1 ? 0.35 : 0.6), bi === 1 ? EW_S : EW);
        c.save(); c.translate(0, -1.3); poly(c, edge); stroke(c, rgb(S.lit, bi === 1 ? 0.25 : 0.4), 0.8); c.restore();
      }
    });
  }
  // rows of wave crests running roughly parallel to the shore, never stamped: each crest's length, spacing, height and
  // tilt vary, some are long low swells drawn as a double curve, a few carry a broken foam streak trailing behind;
  // each a lit arc over a dark trough line. rows: [distance from the shore, mean spacing, mean half width, strength]
  function waveRows(c, P, coast, rows, seed) {
    const S = P.sea, R = rand(seed); c.lineCap = 'round';
    rows.forEach(([d, gap, w, aRow], k) => {
      const fs = clamp(1.15 - d / 150, 0.55, 1.1);   // farther out: thinner, flatter strokes
      const line = offset(coast, (u, i) => d + 3 * Math.sin(i * 0.05 + k * 1.7)); let acc = R() * gap, prev = line[0], next = gap * (0.5 + R());
      for (const p of line) {
        acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; if (acc < next) continue; acc = 0; next = gap * (0.55 + R() * 1.1);
        const a = aRow * (0.45 + 0.55 * R());   // each crest its own strength
        const x = p[0] + (R() - 0.5) * 6, y = p[1] + (R() - 0.5) * 4, long = R() < 0.25, ww = w * (long ? 1.6 + R() * 1.1 : 0.35 + R() * 1.25), hh = (long ? 0.18 : 0.32) * (0.7 + R() * 0.6) * fs, tilt = (R() - 0.5) * 0.12;
        c.save(); c.translate(x, y); c.rotate(tilt);
        const arc = (s2 = 1) => { c.beginPath(); c.moveTo(-ww, 1.4); if (long) { c.bezierCurveTo(-ww * 0.5, -ww * hh * s2, -ww * 0.1, -ww * hh * 0.2, ww * 0.25, -ww * hh * 0.5 * s2); c.quadraticCurveTo(ww * 0.6, -ww * hh * 0.7, ww, 0.9); } else c.quadraticCurveTo(-ww * 0.15, -ww * hh, ww, 0.8); };
        c.save(); c.translate(0.3, 1.7); arc(); stroke(c, rgb(S.dark, 0.36 * a), 1.2 * fs); c.restore();
        arc(); stroke(c, rgb(mix(S.lit, S.foam, P.name === 'dusk' ? 0.35 : 0.5), 0.8 * a), (long ? 1.2 : 1.05) * fs);
        c.beginPath(); c.moveTo(-ww * 0.7, 0.5); c.quadraticCurveTo(-ww * 0.35, -ww * hh * 0.7, 0, -ww * hh * 0.4); stroke(c, rgb(P.name === 'dusk' ? mix(S.foam, S.lit, 0.4) : [255, 255, 250], 0.7 * a), 0.7);
        if (long && R() < 0.6) for (let q = 0; q < 3; q++) { const fx = -ww * 0.6 + q * ww * 0.45 + R() * 2, fl = 2 + R() * 4; c.beginPath(); c.moveTo(fx, 3 + R()); c.lineTo(fx + fl, 3.2 + R()); stroke(c, rgb(S.foam, 0.45 * a), 0.8); }
        c.restore();
      }
    });
  }
  // a reef shelf just offshore: broken patches of paler water over the sand shallows, their edges soft (several
  // shrinking passes, no hard line), a few coral heads and rocks on them with lit tops
  function reefShelf(c, P, coast, d0, d1, seed) {
    const S = P.sea, R = rand(seed), n = coast.length;
    let i = R() * 6 | 0;
    while (i < n - 8) {
      const len = 10 + (R() * 22 | 0), seg = coast.slice(i, Math.min(n, i + len));
      if (seg.length > 4) {
        const k0 = 0.6 + 0.4 * R();
        for (const [shrink, a] of [[0, 0.07], [0.25, 0.08], [0.5, 0.1]]) {
          const mid = (d0 + d1) / 2, inner = offset(seg, (u) => lerp(d0, mid, shrink) + 2 * Math.sin(u * 7 + i)), outer = offset(seg, (u) => lerp(d0 + (d1 - d0) * Math.pow(Math.sin(Math.PI * u), 0.6) * k0, mid, shrink));
          closedSmooth(c, [...inner, ...outer.slice().reverse()]); c.fillStyle = rgb(mix(S.shal, S.surf, 0.55), a * 2); c.fill();
        }
        for (let q = 0; q < 3; q++) { const p = seg[1 + (R() * (seg.length - 2) | 0)], dd = lerp(d0, d1, 0.3 + R() * 0.4); const o = offset(seg, dd)[seg.indexOf(p)]; coralHead(c, P, o[0], o[1], 1.4 + R() * 1.6, R); }
      }
      i += len + 6 + (R() * 14 | 0);
    }
  }
  // a small coral head or rock under shallow water: a rounded muted shape, its own darker underside, a lit top
  function coralHead(c, P, x, y, r, R) {
    const S = P.sea, hue = R() < 0.5 ? [236, 156, 140] : (R() < 0.5 ? [226, 206, 150] : [150, 200, 186]), body = mix(hue, S.shal, 0.55);
    const pts = []; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; pts.push([x + Math.cos(a) * r * (0.8 + 0.4 * R()), y + Math.sin(a) * r * 0.6]); }
    closedSmooth(c, pts); c.fillStyle = LG(c, x - r, y - r * 0.6, x + r, y + r * 0.6, [rgb(mix(body, [255, 255, 240], 0.25), 0.7), rgb(body, 0.6), rgb(mix(body, S.mid, 0.5), 0.55)]); c.fill();
    c.beginPath(); c.ellipse(x - r * 0.15, y - r * 0.2, r * 0.55, r * 0.22, 0, 3.4, 5.9); stroke(c, rgb([255, 255, 245], 0.45), 0.55);
  }
  // a rock standing in the surf: a dark wet base at the waterline, the rock, foam wrapped round its foot and a
  // ripple ring spreading from it
  function seaRock(c, P, x, y, r, seed, moss) {
    const S = P.sea, K = P.rock;
    for (const [k, a0, a1] of [[2, 0.25, 1.15], [2, 1.5, 2.6], [2, 3.5, 4.3], [2.5, 0.6, 1.4], [2.5, 1.9, 2.5]]) { c.beginPath(); c.ellipse(x + 1, y + r * 0.5, r * k, r * k * 0.37, 0, a0, a1); stroke(c, rgb(S.lit, k > 2 ? 0.22 : 0.35), 0.7); }   // a loose ripple: broken arcs
    c.beginPath(); c.ellipse(x + 0.5, y + r * 0.4, r * 1.3, r * 0.5, 0, 0, TAU); c.fillStyle = rgb(mix(S.dark, K.edge, 0.4), 0.55); c.fill();
    rock(c, P, x, y, r, seed, moss, false, seed % 2 ? 'round' : 'tall');
    c.save(); c.beginPath(); c.ellipse(x, y + r * 0.1, r * 1.05, r * 0.7, 0, 0, TAU); c.clip();
    c.fillStyle = LG(c, 0, y + r * 0.1, 0, y + r * 0.7, [rgb(mix(K.shade, S.dark, 0.5), 0), rgb(mix(K.shade, S.dark, 0.5), 0.6)]); c.fillRect(x - r * 1.2, y, r * 2.4, r); c.restore();
    for (const [rx, ry, aa, w] of [[1.15, 0.45, 0.95, 1.2], [1.45, 0.58, 0.6, 0.8]]) { c.beginPath(); c.ellipse(x + 0.3, y + r * 0.42, r * rx, r * ry, 0, 0.1, Math.PI - 0.1); stroke(c, rgb(S.foam, aa), w); }
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x - r * 1.1 + k * r * 0.75, y + r * 0.42 + Math.sin(k * 2) * 0.6, 0.7, 0, TAU); c.fillStyle = rgb(S.foam, 0.8); c.fill(); }
  }
  // a reef under the water: a soft pale-teal patch (lighter than the water round it) with coral heads on it
  function reef(c, P, x, y, rx, ry, seed) {
    const S = P.sea, R = rand(seed);
    for (const [k, a] of [[1, 0.12], [0.75, 0.14], [0.5, 0.16]]) softShadow(c, x, y, rx * k, ry * k, a, -0.08, mix(S.shal, S.surf, 0.5));
    for (let i = 0; i < 7; i++) coralHead(c, P, x + (R() - 0.5) * rx * 1.1, y + (R() - 0.5) * ry * 0.8, 1.6 + R() * 2.2, R);
  }
  // long low swells far out: gentle broken line pairs running the width of the sea, a lit crest over a soft trough
  function swells(c, P, coast, list, seed) {
    const S = P.sea, R = rand(seed); c.lineCap = 'round';
    for (const [d, a] of list) {
      const line = offset(coast, (u, i) => d + 2.5 * Math.sin(i * 0.06 + d) + 1.2 * Math.sin(i * 0.17));
      let i = R() * 10 | 0;
      while (i < line.length - 8) {
        const L = 26 + (R() * 30 | 0), seg = line.slice(i, Math.min(line.length, i + L));
        c.save(); c.translate(0, 1.6); poly(c, seg); stroke(c, rgb(S.dark, 0.22 * a), 1.6); c.restore();
        poly(c, seg); stroke(c, rgb(mix(S.lit, S.foam, 0.4), 0.42 * a), 0.8);
        i += L + 10 + (R() * 22 | 0);
      }
    }
  }
  // evening sun glints on the water: short additive strokes
  function glints(c, P, x0, y0, x1, y1, n, seed) {
    const S = P.sea, R = rand(seed); c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, R()), y = lerp(y0, y1, R()), w = 2 + R() * 5; c.beginPath(); c.moveTo(x - w, y); c.lineTo(x + w, y); stroke(c, rgb(S.lit, 0.45 + R() * 0.4), 1 + R() * 0.8); }
    c.restore();
  }
  // a cartoon wave curl (kept for the open-sea edges of the island)
  function waveCurl(c, P, x, y, w, dir = 1) {
    const S = P.sea; c.lineCap = 'round';
    c.save(); c.translate(x, y); c.scale(dir, 1);
    c.beginPath(); c.moveTo(-w, 2); c.bezierCurveTo(-w * 0.5, 1.5, -w * 0.15, -w * 0.32, w * 0.25, -w * 0.3); c.bezierCurveTo(w * 0.55, -w * 0.28, w * 0.6, -w * 0.05, w * 0.36, -w * 0.02); c.bezierCurveTo(w * 0.2, 0, w * 0.18, -w * 0.12, w * 0.3, -w * 0.14); c.bezierCurveTo(w * 0.1, -w * 0.06, w * 0.1, 2, w * 0.6, 2); c.closePath();
    c.fillStyle = LG(c, 0, -w * 0.3, 0, 2, [mix(S.shal, S.lit, 0.4), S.shal]); c.fill(); stroke(c, rgb(mix(S.mid, S.dark, 0.4), 0.8), EW_S);
    c.beginPath(); c.moveTo(-w * 0.75, 0.6); c.bezierCurveTo(-w * 0.4, 0, -w * 0.12, -w * 0.28, w * 0.25, -w * 0.27); stroke(c, rgb(S.foam, 0.9), 1);
    c.restore();
  }
  // the band of wet sand the last waves left behind the surf, darkest at the water, with two faint tide lines
  function surfWet(c, P, coast, wid = 22) {
    const D = P.sand; c.lineCap = 'round';
    for (let k = 7; k >= 0; k--) { poly(c, offset(coast, -wid * (k + 0.5) / 8)); stroke(c, rgb(mix(D.wet, D.dark, 0.25 * (1 - k / 8)), 0.95 * Math.pow(1 - k / 8, 1.2)), wid / 8 + 0.8); }
    // two tide lines, each broken into uneven pieces that wander a little (the last waves' reach varies)
    const Rt = rand(41);
    for (const [d0, a0, ph] of [[0.62, 0.3, 0], [0.95, 0.2, 1]]) {
      const line = offset(coast, (u, i) => -wid * d0 + 2.2 * Math.sin(i * 0.17 + ph * 2) + 1.2 * Math.sin(i * 0.5 + ph)); let i = Rt() * 8 | 0;
      while (i < line.length - 3) { const L = 6 + (Rt() * 16 | 0), dy = (Rt() - 0.5) * 2.4; furrow(c, line.slice(i, i + L).map(p => [p[0], p[1] + dy]), rgb(D.dark, a0), rgb(D.ridge, a0 + 0.25), DET, [0, -1]); i += L + 3 + (Rt() * 9 | 0); }
    }
  }
  // the foam line: a run of round scallops bulging seaward with lit tops, then a broken outer surf line. bulge(x)
  // pushes the whole surf seaward (where a creek's plume shoves the breakers out, the foam bends round it)
  function surfFoam(c, P, coast, bulge = () => 0) {
    const S = P.sea, off = (d) => offset(coast, (u, i) => d + bulge(coast[i][0]));
    // scallops of uneven width and depth (a bigger, deeper churn where the creek's plume meets the breakers)
    const base = off(2.5), sc = [], dep = [], Rf = rand(73);
    for (let i = 0; i < base.length; i += 4 + (Rf() * 4 | 0)) { sc.push(base[i]); dep.push(5 + Rf() * 4.5 + bulge(coast[i][0]) * 0.28); }
    if (sc[sc.length - 1] !== base[base.length - 1]) { sc.push(base[base.length - 1]); dep.push(6); }
    const inner = off(-1.2);
    c.beginPath(); c.moveTo(...inner[0]);
    for (const p of inner) c.lineTo(p[0], p[1]);
    for (let i = sc.length - 1; i > 0; i--) { const a = sc[i], b = sc[i - 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; c.quadraticCurveTo(mx, my + dep[i], b[0], b[1]); }
    c.closePath(); c.fillStyle = LG(c, 0, coast[0][1] - 2, 0, coast[0][1] + 9, [S.foam, mix(S.foam, S.surf, 0.35)]); c.fill();
    c.beginPath(); c.moveTo(sc[0][0], sc[0][1]); for (let i = 1; i < sc.length; i++) { const a = sc[i - 1], b = sc[i]; c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + dep[i], b[0], b[1]); } stroke(c, rgb(S.foamEdge, 0.9), EW_S);
    for (let i = 1; i < sc.length; i++) { const a = sc[i - 1], b = sc[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; c.beginPath(); c.moveTo(lerp(a[0], mx, 0.3), lerp(a[1], my, 0.3) + 1); c.quadraticCurveTo(mx - 1, my + dep[i] * 0.47, lerp(mx, b[0], 0.2), my + dep[i] * 0.45); stroke(c, 'rgba(255,255,250,.85)', 0.8); }
    poly(c, off(-1)); stroke(c, rgb([255, 255, 250], 0.75), 1);
    const out2 = offset(coast, (u, i) => 21 + 2.5 * Math.sin(i * 0.37) + bulge(coast[i][0]) * 1.1); c.lineCap = 'round';
    for (let i = 4; i < out2.length - 6; i += 13) {
      const seg = out2.slice(i, i + 6);
      c.save(); c.translate(0.4, 1.4); poly(c, seg); stroke(c, rgb(S.dark, 0.35), 1.3); c.restore();
      poly(c, seg); stroke(c, rgb(S.foam, 0.85), 1.3);
    }
  }
  function surf(c, P, coast) { surfWet(c, P, coast); surfFoam(c, P, coast); }

  // ---------------- land ----------------
  function sand(c, P, edge, ripples, W) {
    const D = P.sand;
    poly(c, [[-20, edge[0][1]], ...edge, [W + 20, edge[edge.length - 1][1]], [W + 20, 900], [-20, 900]]); c.closePath();
    c.fillStyle = LG(c, 0, 520, 140, 820, [D.lit, D.mid, D.shade]); c.fill();
    c.lineCap = 'round';
    // ripples: broken into short, uneven pieces with small gaps and steps, never one long ruled curve
    const Rr = rand(55);
    for (const [x, y, w, bend] of ripples) {
      const line = spline([[x - w, y + bend * 0.4], [x, y - bend * 0.3], [x + w, y + bend * 0.2]], 8); let i = 0;
      // the ripple's form, shaded: a soft lit slope on its upper side, a soft shaded one below the crest
      c.save(); c.translate(0, -1.4); poly(c, line.slice(1, -1)); stroke(c, rgb(D.ridge, 0.28), 2.6); c.restore();
      c.save(); c.translate(0.3, 1.6); poly(c, line.slice(1, -1)); stroke(c, rgb(D.shade, 0.3), 3.2); c.restore();
      while (i < line.length - 2) { const L = 3 + (Rr() * 5 | 0), dy = (Rr() - 0.5) * 1.6; furrow(c, line.slice(i, i + L).map(p => [p[0], p[1] + dy]), rgb(D.dark, 0.22 + Rr() * 0.14), rgb(D.ridge, 0.6), 0.8, [-0.3, -1.1]); i += L + 1 + (Rr() * 2 | 0); }
    }
  }
  // the lawn: darker and cooler far away (top), lighter and warmer near the beach, soft lighter patches
  function grass(c, P, edge, W, patches) {
    const G = P.grass;
    poly(c, [[-20, -20], [W + 20, -20], [W + 20, edge[edge.length - 1][1]], ...edge.slice().reverse()]); c.closePath();
    c.fillStyle = LG(c, 0, 0, 120, 620, [mix(G.mid, G.shade, 0.75), mix(G.mid, G.shade, 0.25), mix(G.mid, G.lit, 0.65)]); c.fill();
    c.save(); c.clip();
    for (const [x, y, r] of patches) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb(G.patch, 0.35)); g.addColorStop(1, rgb(G.patch, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
    c.restore();
  }
  // drawn grass texture: short two-blade marks in a darker hue of the lawn, a lit blade on some; inside(x, y) keeps
  // them off roads, water and clearings
  function grassMarks(c, P, x0, y0, x1, y1, n, seed, inside) {
    const G = P.grass, R = rand(seed); c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, R()), y = lerp(y0, y1, R()), s = 0.75 + R() * 0.6, lean = (R() - 0.5) * 1.2, lit = R() < 0.45;
      if (!inside(x, y)) continue;
      c.beginPath(); c.moveTo(x - 1.1 * s, y); c.quadraticCurveTo(x - 1.4 * s + lean * 0.5, y - 2.4 * s, x - 2.3 * s + lean, y - 4 * s);
      c.moveTo(x + 0.7 * s, y); c.quadraticCurveTo(x + 0.9 * s + lean * 0.5, y - 2.7 * s, x + 1.9 * s + lean, y - 4.7 * s);
      stroke(c, rgb(G.shade, 0.55), 0.75);
      if (lit) { c.beginPath(); c.moveTo(x - 0.2 * s, y - 0.3); c.quadraticCurveTo(x - 0.3 * s + lean * 0.5, y - 2.3 * s, x - 0.6 * s + lean, y - 3.7 * s); stroke(c, rgb(G.tuftLit, 0.5), 0.6); }
    }
  }
  // a darker mass of longer grass on the open lawn, seen from above: a soft low-contrast patch whose upper rim is a
  // drawn fringe of blade tips (the taller grass catching light) and whose body holds a few darker blade marks
  function grassMass(c, P, x, y, rx, ry, seed) {
    const G = P.grass, R = rand(seed), pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, k = 0.8 + 0.3 * R(); pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    c.save(); c.translate(x, y); c.scale(1, ry / rx); const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgb(G.shade, 0.26)); g.addColorStop(0.6, rgb(G.shade, 0.16)); g.addColorStop(1, rgb(G.shade, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
    c.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (1.05 + 0.9 * i / 25) + (R() - 0.5) * 0.1, kk = 0.55 + R() * 0.35, bx = x + Math.cos(a) * rx * kk, by = y + Math.sin(a) * ry * kk, L = 2 + R() * 2.5, l = (R() - 0.5) * 1.4;
      c.beginPath(); c.moveTo(bx - 0.8, by + 1.6); c.quadraticCurveTo(bx - 0.4 + l * 0.3, by - L * 0.4, bx + l, by - L); stroke(c, rgb(G.edge, 0.35), 0.7);
      if (i % 2) { c.beginPath(); c.moveTo(bx - 0.4, by + 1.2); c.quadraticCurveTo(bx - 0.6 + l * 0.3, by - L * 0.4, bx - 0.4 + l, by - L * 0.85); stroke(c, rgb(G.tuftLit, 0.35), 0.5); }
    }
    for (let i = 0; i < 10; i++) { const bx = x + (R() - 0.5) * rx * 1.3, by = y + (R() - 0.3) * ry * 0.9; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 0.3, by - 1.6, bx - 1.2, by - 3); c.moveTo(bx + 1, by); c.quadraticCurveTo(bx + 1.2, by - 1.8, bx + 2, by - 3.3); stroke(c, rgb(G.edge, 0.28), 0.6); }
  }
  // a sunlit patch on the open lawn: an irregular soft-edged shape a step lighter and warmer than the grass round it,
  // its upper-left rim catching a little more light (shorter, sun-bleached grass)
  function sunPatch(c, P, x, y, rx, ry, seed) {
    const G = P.grass, R = rand(seed), pts = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, k = 0.72 + 0.4 * R(); pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    for (const [d, a] of [[1.25, 0.08], [1.1, 0.1], [1, 0.12]]) { c.save(); c.translate(x, y); c.scale(d, d); c.translate(-x, -y); closedSmooth(c, pts); c.fillStyle = rgb(mix(G.patch, G.tuftLit, 0.3), a); c.fill(); c.restore(); }
    // a few short sun-bleached blades inside it
    c.lineCap = 'round'; for (let i = 0; i < 7; i++) { const bx = x + (R() - 0.5) * rx * 1.3, by = y + (R() - 0.5) * ry * 1.1; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 0.3, by - 1.5, bx - 1, by - 2.8); stroke(c, rgb(G.tuftLit, 0.45), 0.55); }
  }
  // a low clump of clover on the lawn: trefoil leaves in two greens with a darker hue edge, a few white flower heads
  function clover(c, P, x, y, s, seed) {
    const G = P.grass, Lf = P.leaf, R = rand(seed), n = 4 + (R() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const lx = x + (R() - 0.5) * 9 * s, ly = y + (R() - 0.5) * 4 * s, r = (1.1 + R() * 0.5) * s, a0 = R() * TAU, tone = R();
      for (let k = 0; k < 3; k++) { const a = a0 + k * TAU / 3, px = lx + Math.cos(a) * r * 0.85, py = ly + Math.sin(a) * r * 0.6; c.beginPath(); c.ellipse(px, py, r * 0.75, r * 0.6, a, 0, TAU); c.fillStyle = LG(c, px - r, py - r, px + r, py + r, [mix(G.tuftLit, Lf.lit, tone * 0.5), mix(G.mid, Lf.mid, 0.3 + tone * 0.3)]); c.fill(); stroke(c, rgb(mix(G.edge, Lf.edge, 0.5), 0.55), 0.35); }
      c.beginPath(); c.moveTo(lx - r * 0.4, ly - r * 0.2); c.lineTo(lx + r * 0.3, ly + r * 0.15); stroke(c, rgb(G.tuftLit, 0.5), 0.3);
    }
    for (let i = 0; i < 2 + (R() * 2 | 0); i++) { const fx = x + (R() - 0.5) * 8 * s, fy = y - 1.5 * s + (R() - 0.5) * 3 * s; c.beginPath(); c.arc(fx, fy, 1.1 * s, 0, TAU); c.fillStyle = RG(c, fx, fy, 1.1 * s, [[255, 255, 250], [244, 236, 236], [214, 190, 206]]); c.fill(); stroke(c, rgb([170, 140, 160], 0.6), 0.3); c.beginPath(); c.arc(fx - 0.3 * s, fy - 0.3 * s, 0.35 * s, 0, TAU); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill(); }
  }
  // dappled canopy shade on the ground: soft violet-green pools with sun flecks between them
  function dapple(c, P, x, y, r, seed) {
    const R = rand(seed), G = P.grass;
    for (let i = 0; i < 6; i++) { const a = R() * TAU, d = R() * r * 0.75; softShadow(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, r * (0.28 + 0.22 * R()), r * (0.12 + 0.08 * R()), P.shadowA * 0.5, SUN, P.shadowC); }
    for (let i = 0; i < 4; i++) { const a = R() * TAU, d = R() * r * 0.6; c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 1.6 + R() * 2.2, 0.9 + R() * 0.8, SUN, 0, TAU); c.fillStyle = rgb(G.patch, 0.4); c.fill(); }
  }
  // ground shade pooled under a mass of trees, soft and edge-less, pushed down-right with the sun
  function underShade(c, P, x, y, rx, ry) { const sun = P.sun ?? SUN; softShadow(c, x + rx * 0.12 * (P.shLen ?? 0.3) / 0.3, y + ry * 0.2, rx * (0.7 + (P.shLen ?? 0.3)), ry, P.shadowA * 0.9, sun * 0.5, P.shadowC); }
  // a grass tuft: three blades, the left one catching the light
  function tuft(c, P, x, y, s) {
    const G = P.grass;
    for (const [a, L, lit] of [[-0.55, 1, 1], [0.05, 1.25, 0], [0.6, 0.9, 0]]) {
      const tx = x + Math.sin(a) * 6 * s * L, ty = y - Math.cos(a) * 6 * s * L;
      c.beginPath(); c.moveTo(x - 1.3 * s, y); c.quadraticCurveTo(x + (tx - x) * 0.3 - 0.8 * s, y + (ty - y) * 0.6, tx, ty); c.quadraticCurveTo(x + (tx - x) * 0.5 + 0.8 * s, y + (ty - y) * 0.5, x + 1.3 * s, y); c.closePath();
      c.fillStyle = LG(c, x, ty, x, y, [lit ? G.tuftLit : mix(G.tuft, G.lit, 0.35), G.tuft]); c.fill();
      if (lit) { c.beginPath(); c.moveTo(x - 0.6 * s, y - 0.5); c.quadraticCurveTo(x + (tx - x) * 0.3 - 0.6 * s, y + (ty - y) * 0.6, tx, ty); stroke(c, rgb(G.tuftLit, 0.7), 0.5); }
    }
  }
  function tuftCluster(c, P, x, y, s, seed) {
    const R = rand(seed); const pts = [[0, 0, 1], [-5, 2, 0.8], [5, 1.5, 0.85], [-1, 4, 0.7]];
    for (const [dx, dy, k] of pts) tuft(c, P, x + dx * s + (R() - 0.5) * 2, y + dy * s, s * k);
  }
  // tall jungle grass: a clump of long thin blades, arching, each lit along its left edge
  function tallGrass(c, P, x, y, s, seed) {
    const G = P.grass, L = P.leaf, R = rand(seed);
    castShadow(c, P, x, y, 14 * s, 12 * s);
    const n = 7 + (R() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, a = u * 1.5 + (R() - 0.5) * 0.3, len = (14 + 9 * R()) * s * (1 - Math.abs(u) * 0.5);
      const tx = x + Math.sin(a) * len + u * 4 * s, ty = y - Math.cos(a) * len, bx = x + u * 5 * s, w = 1.3 * s;
      const cx = bx + Math.sin(a) * len * 0.35, cy = y - len * 0.7;
      c.beginPath(); c.moveTo(bx - w, y); c.quadraticCurveTo(cx - w * 0.6, cy, tx, ty); c.quadraticCurveTo(cx + w * 0.6, cy, bx + w, y); c.closePath();
      const tone = Math.abs(u) * 0.6 + (i % 2) * 0.12;
      c.fillStyle = LG(c, x, ty, x, y, [mix(G.tuftLit, L.mid, tone), mix(L.mid, L.shade, tone), L.deep]); c.fill(); stroke(c, rgb(L.edge, 0.7), 0.45);
      c.beginPath(); c.moveTo(bx - w * 0.5, y - 1); c.quadraticCurveTo(cx - w * 0.5, cy, tx, ty); stroke(c, rgb(G.tuftLit, 0.45 - tone * 0.4), 0.45);
    }
  }
  function pebble(c, P, x, y, r) {
    const K = P.rock;
    softShadow(c, x + r * 0.6, y + r * 0.4, r * 1.2, r * 0.5, P.shadowA, SUN, P.shadowC);
    c.beginPath(); c.ellipse(x, y, r, r * 0.68, -0.2, 0, TAU); c.fillStyle = LG(c, x - r, y - r, x + r, y + r, [K.lit, K.mid, K.shade]); c.fill(); stroke(c, K.edge, EW_S * 0.8);
    c.beginPath(); c.ellipse(x - r * 0.1, y - r * 0.1, r * 0.55, r * 0.35, -0.2, 3.5, 5.0); stroke(c, 'rgba(255,255,240,.5)', 0.6);
  }
  // a small flower: five round petals with a gradient, a gold eye
  function flower(c, x, y, r, cl) {
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - 0.3, px = x + Math.cos(a) * r * 0.62, py = y + Math.sin(a) * r * 0.55; c.beginPath(); c.ellipse(px, py, r * 0.52, r * 0.42, a, 0, TAU); c.fillStyle = RG(c, px, py, r * 0.5, [mix(cl, [255, 255, 255], 0.45), cl, mix(cl, [60, 0, 20], 0.3)]); c.fill(); stroke(c, mix(cl, [60, 0, 20], 0.5), 0.45); }
    c.beginPath(); c.arc(x, y, r * 0.28, 0, TAU); c.fillStyle = RG(c, x, y, r * 0.28, [COIN.lit, COIN.hi, COIN.lo]); c.fill();
  }
  // a little patch of flowers among a few leaves
  function flowerPatch(c, P, x, y, cl, seed) {
    const R = rand(seed);
    for (let k = 0; k < 4; k++) { const a = k * 1.6 + R(); leaf(c, P, x + Math.cos(a) * 3, y + Math.sin(a) * 1.6, a, 5.5, 0.1); }
    for (const [dx, dy, r] of [[-3.5, -1, 2.6], [3, -2.2, 2.3], [0.5, 2, 2.4]]) flower(c, x + dx, y + dy, r, cl);
  }
  // mown contour lines on the open grass: long, faint, gently curved line-pairs
  function contours(c, P, list) {
    const G = P.grass;
    for (const [x, y, w, bend] of list) furrow(c, spline([[x - w / 2, y + bend], [x, y - bend * 0.3], [x + w / 2, y + bend * 0.6]], 10), rgb(G.shade, 0.35), rgb(G.lit, 0.45), 1, [-0.3, -1.2]);
  }
  // the grass's edge where it steps down to the beach: a low bluff whose height wanders (low here, a real step
  // there), its foot eroded into scallops with a spill of paler sand below; a turf lip rolling over the top that
  // overhangs in clumps, a shaded earth-and-sand face with strata line-pairs, erosion grooves and a few embedded
  // stones, tangles of exposed roots in places, and its shadow on the sand. cuts: [{x, hw}] where a road (its steps
  // are drawn by roadSteps) or the creek (a waterfall goes in afterwards) cuts through it
  function bank(c, P, edge, cuts = [], hAt = null) {
    const E = P.earth, G = P.grass, D = P.sand, K = P.rock, R = rand(91), n = edge.length;
    const cutK = x => { let k = 1; for (const q of cuts) { const d = Math.abs(x - q.x) - q.hw; k = Math.min(k, d <= 0 ? 0 : Math.min(1, d / 3)); } return k; };
    const inCut = (x, m = 0) => cuts.some(q => Math.abs(x - q.x) < q.hw + m);
    // the bluff's height: hAt(x) when given (taller in some places, a low step in others), with a small wobble
    const hA = edge.map((p, i) => Math.max(5, (hAt ? hAt(p[0]) : 13 + 4.5 * Math.sin(i * 0.071 + 1.3)) + 2 * Math.sin(i * 0.19 + 0.4) + 1 * Math.sin(i * 0.53)));
    const foot = offset(edge, (u, i) => hA[i] + 1.4 * Math.sin(i * 0.9) * Math.sin(i * 0.23));
    // the spill of loose sand at the foot, then the shadow on the sand
    for (let k = 0; k < 3; k++) { poly(c, offset(foot, 1.5 + k * 1.8)); stroke(c, rgb(mix(D.lit, D.ridge, 0.4), 0.22 - k * 0.06), 2.6); }
    for (let k = 0; k < 5; k++) { poly(c, offset(foot, 0.5 + k * 1.5)); stroke(c, rgb(P.shadowC, 0.14 * (1 - k / 5)), 2); }
    // the face, segment by segment so the cuts stay open
    const runs = []; let cur = [];
    edge.forEach((p, i) => { if (cutK(p[0]) > 0) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } }); if (cur.length) runs.push(cur);
    for (const run of runs) {
      const top = run.map(i => edge[i]), bot = run.map(i => foot[i]);
      const face = () => { poly(c, [...top, ...bot.slice().reverse()]); c.closePath(); };
      face(); c.fillStyle = LG(c, 0, edge[run[0]][1] - 6, 0, edge[run[0]][1] + 20, [mix(E.lit, D.shade, 0.3), mix(E.mid, D.shade, 0.35), mix(E.shade, D.dark, 0.3)]); c.fill();
      c.save(); face(); c.clip();
      poly(c, [...top, ...offset(top, 4).reverse()]); c.closePath(); c.fillStyle = rgb(mix(E.edge, P.shadowC, 0.3), 0.42); c.fill();   // shade under the lip
      for (const [f, a] of [[0.45, 0.5], [0.7, 0.42]]) furrow(c, run.map(i => { const p = edge[i], q = foot[i]; return [lerp(p[0], q[0], f), lerp(p[1], q[1], f) + 0.7 * Math.sin(i * 0.4)]; }), rgb(E.edge, a), rgb(mix(E.lit, D.ridge, 0.4), a + 0.25), 0.8, [0, -0.9]);
      // erosion grooves running down the face
      for (let j = 3; j < run.length - 3; j += 5 + (R() * 6 | 0)) { const i = run[j], p = edge[i], q = foot[i]; furrow(c, [[p[0], p[1] + 4], [p[0] + 0.4, lerp(p[1], q[1], 0.6)], [q[0] - 0.2, q[1]]], rgb(E.edge, 0.35), rgb(mix(E.lit, D.ridge, 0.3), 0.3), 0.6, [-0.7, 0]); }
      c.restore();
      poly(c, bot); stroke(c, rgb(mix(E.edge, D.dark, 0.3), 0.75), EW_S);
      // stones bedded in the face
      for (let j = 8; j < run.length - 8; j += 22 + (R() * 20 | 0)) { const i = run[j]; if (hA[i] < 10) continue; const p = edge[i], q = foot[i]; pebble(c, P, lerp(p[0], q[0], 0.6), lerp(p[1], q[1], 0.6), 1.4 + R() * 1.1); }
    }
    // sand slumps fanning out from the foot where the face has slid, and rock outcrops standing out of the taller
    // stretches of the face, so the terrace never reads as one even ribbon
    for (const run of runs) for (let j = 10 + (R() * 10 | 0); j < run.length - 10; j += 26 + (R() * 30 | 0)) {
      const i = run[j], p = edge[i], q = foot[i];
      if (R() < 0.55) {
        const w = 5 + R() * 6, L = 3 + R() * 3.5, sp = [[q[0] - w, q[1] - 0.5], [q[0] - w * 0.4, q[1] + L * 0.7], [q[0] + w * 0.2, q[1] + L], [q[0] + w * 0.8, q[1] + L * 0.5], [q[0] + w, q[1] - 0.5], [q[0], q[1] - hA[i] * 0.35]];
        closedSmooth(c, sp); c.fillStyle = LG(c, q[0] - w, q[1] - 3, q[0] + w, q[1] + L, [mix(D.lit, D.ridge, 0.3), D.mid, mix(D.mid, D.shade, 0.4)]); c.fill();
        c.beginPath(); c.moveTo(q[0] - w * 0.6, q[1] + L * 0.45); c.quadraticCurveTo(q[0], q[1] + L * 0.85, q[0] + w * 0.6, q[1] + L * 0.3); stroke(c, rgb(D.dark, 0.25), 0.5);
        for (let k = 0; k < 2; k++) pebble(c, P, q[0] + (R() - 0.5) * w * 1.2, q[1] + L * (0.4 + R() * 0.5), 0.7 + R() * 0.6);
      } else if (hA[i] > 11) {
        const rx = lerp(p[0], q[0], 0.55), ry = lerp(p[1], q[1], 0.58);
        rock(c, P, rx, ry, 3.6 + R() * 2.4, 800 + i, R() < 0.4, false, R() < 0.5 ? 'block' : 'round');
        if (R() < 0.7) rock(c, P, rx + 4 + R() * 2, ry + 2.5, 2 + R() * 1.4, 830 + i, false, false, 'flat');
      }
    }
    // exposed roots, never the same twice: a tangle here, a long root that forks there, a short hooked curl, bare
    // stretches between; each root a dark stroke with a lit core, thinning toward its tip
    c.lineCap = 'round';
    const lipB = offset(edge, 2.6);
    const root = (x, y, L, bend, wd, fork) => {
      const c1 = [x + bend, y + L * 0.3], c2 = [x - bend * 0.6, y + L * 0.7], e = [x + bend * 0.4, y + L];
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(...c1, ...c2, ...e); stroke(c, mix(E.edge, E.shade, 0.25), wd + 0.5);
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(...c1, ...c2, ...e); stroke(c, mix(E.mid, E.lit, 0.35), wd * 0.55);
      if (fork) { const fx = x + bend * 0.15, fy = y + L * 0.45, s2 = bend > 0 ? -1 : 1; c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx + s2 * 2.5, fy + L * 0.15, fx + s2 * 3.5, fy + L * 0.42); stroke(c, mix(E.edge, E.shade, 0.25), wd * 0.6 + 0.3); c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx + s2 * 2.5, fy + L * 0.15, fx + s2 * 3.5, fy + L * 0.42); stroke(c, mix(E.mid, E.lit, 0.35), wd * 0.3); }
    };
    const hook = (x, y, s2, wd) => { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + s2 * 1.5, y + 3, x + s2 * 4, y + 3.5, x + s2 * 3.2, y + 1.6); stroke(c, mix(E.edge, E.shade, 0.25), wd + 0.5); c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + s2 * 1.5, y + 3, x + s2 * 4, y + 3.5, x + s2 * 3.2, y + 1.6); stroke(c, mix(E.mid, E.lit, 0.35), wd * 0.5); };
    for (let i = 6; i < n - 6; i += 6 + (R() * 18 | 0)) {
      if (inCut(edge[i][0], 8)) continue;
      const [x, y] = lipB[i], kind = R();
      if (kind < 0.22) { const cnt = 3 + (R() * 3 | 0); for (let k = 0; k < cnt; k++) root(x + (k - cnt / 2) * (1.2 + R()), y, Math.min(hA[i] - 1, hA[i] * (0.45 + R() * 0.5)), (R() - 0.5) * 7, 0.5 + R() * 0.4, false); }
      else if (kind < 0.5) root(x, y, hA[i] * (0.7 + R() * 0.45), (R() - 0.5) * 8, 0.8 + R() * 0.4, R() < 0.7);
      else if (kind < 0.75) hook(x, y, R() < 0.5 ? -1 : 1, 0.6 + R() * 0.3);
    }
    // the turf lip: a rounded roll of grass along the top, then clumps of turf overhanging the face
    const lipT = offset(edge, -1.6);
    for (const run of runs) {
      poly(c, [...run.map(i => lipT[i]), ...run.map(i => lipB[i]).reverse()]); c.closePath(); c.fillStyle = LG(c, 0, edge[run[0]][1] - 3, 0, edge[run[0]][1] + 3, [G.mid, G.shade]); c.fill();
      poly(c, run.map(i => lipB[i])); stroke(c, G.edge, EW);
      c.save(); c.translate(0, -1); poly(c, run.map(i => offset(edge, -0.8)[i])); stroke(c, rgb(G.tuftLit, 0.55), DET); c.restore();
    }
    for (let i = 3; i < n - 3; i += 8 + (R() * 14 | 0)) {
      if (inCut(edge[i][0], 5)) continue;
      const [x, y] = lipB[i], w = 2.2 + R() * 6, hh = 1.2 + R() * 3.2, a = Math.atan2(edge[Math.min(n - 1, i + 1)][1] - edge[i][1], edge[Math.min(n - 1, i + 1)][0] - edge[i][0]);
      c.save(); c.translate(x, y - 0.6); c.rotate(a);
      c.beginPath(); c.moveTo(-w, -1.5); c.bezierCurveTo(-w, hh * 0.9, -w * 0.3, hh * 1.3, 0, hh * 1.2); c.bezierCurveTo(w * 0.4, hh * 1.3, w, hh * 0.8, w, -1.5); c.closePath();
      c.fillStyle = LG(c, 0, -1.5, 0, hh * 1.2, [mix(G.mid, G.shade, 0.35), mix(G.shade, G.edge, 0.45)]); c.fill(); stroke(c, rgb(G.edge, 0.85), 0.6);
      c.beginPath(); c.moveTo(-w * 0.75, 0); c.quadraticCurveTo(-w * 0.2, -0.6, w * 0.5, 0); stroke(c, rgb(G.tuftLit, 0.45), 0.5);
      for (let k = 0; k < 3; k++) { const bx = -w * 0.6 + k * w * 0.6, L = 2 + R() * 3; c.beginPath(); c.moveTo(bx - 0.7, hh); c.quadraticCurveTo(bx + 0.3, hh + L * 0.6, bx + (R() - 0.5) * 1.6, hh + L); c.quadraticCurveTo(bx + 0.4, hh + L * 0.4, bx + 0.7, hh); c.closePath(); c.fillStyle = rgb(G.shade); c.fill(); stroke(c, rgb(G.edge, 0.6), 0.4); }
      c.restore();
    }
  }
  // where a road runs down through a cut in the bluff: earth cheeks either side of the cut, and the road stepping
  // down it in log steps seen from the front (the bluff faces us): each step a log riser lying across the road (end
  // grain at both ends, lit along its top, shaded beneath) with a packed-earth tread behind it, the riser above
  // throwing a band of shade across the back of the tread below
  function roadSteps(c, P, pts, yTop, yBot, steps = 3) {
    const R = P.road, B = P.bark, E = P.earth, D = P.sand, Wd = P.wood, hw = 8.2;
    const xAt = yy => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[1] - yy) * (b[1] - yy) <= 0 && a[1] !== b[1]) return lerp(a[0], b[0], (yy - a[1]) / (b[1] - a[1])); } return pts[pts.length - 1][0]; };
    const yA = yTop - 2, yB = yBot + 5, H = yB - yA;   // the flight juts a little out onto the sand below the bluff
    // cheeks: the cut's earth walls, sloping from the bluff's height down to the beach
    for (const s of [-1, 1]) {
      const top = [xAt(yA) + s * hw, yA], bot = [xAt(yB) + s * hw, yB];
      poly(c, [[top[0], top[1] - 1], [top[0] + s * 4.5, top[1] + 1], [bot[0] + s * 7, bot[1] + 1], [bot[0], bot[1] + 1]]); c.closePath();
      c.fillStyle = LG(c, top[0], 0, top[0] + s * 7, 0, s < 0 ? [mix(E.mid, D.shade, 0.3), mix(E.lit, D.shade, 0.3)] : [mix(E.mid, D.shade, 0.3), mix(E.shade, D.dark, 0.3)]); c.fill(); stroke(c, rgb(mix(E.edge, D.dark, 0.3), 0.8), EW_S);
      for (const f of [0.35, 0.68]) furrow(c, [[lerp(top[0], bot[0], f) + s * 1, lerp(yA, yB, f)], [lerp(top[0], bot[0], f) + s * 4.5, lerp(yA, yB, f) + 0.8]], rgb(E.edge, 0.45), rgb(mix(E.lit, D.ridge, 0.3), 0.4), 0.6, [0, -0.8]);
    }
    const strip = (y0, y1) => { poly(c, [[xAt(y0) - hw, y0], [xAt(y0) + hw, y0], [xAt(y1) + hw, y1], [xAt(y1) - hw, y1]]); c.closePath(); };
    // the whole flight: earth under everything
    strip(yA, yB); c.fillStyle = LG(c, 0, yA, 0, yB, [mix(R.mid, E.mid, 0.3), mix(R.shade, E.shade, 0.3)]); c.fill();
    // the steps, cut into the bank and seen from the front like the bank face itself: each a lit packed-earth tread
    // (its top) and a plank riser facing us (shaded, a lit nosing along its top edge, a peg at each end); the riser
    // above throws a thin shade across the back of the tread
    const step = H / steps;
    for (let k = 0; k < steps; k++) {
      const y0 = yA + k * step, yT1 = y0 + step * 0.42, yR1 = y0 + step;
      strip(y0, yT1); c.fillStyle = LG(c, 0, y0, 0, yT1, [mix(R.mid, R.lit, 0.4), R.lit]); c.fill();
      if (k > 0) { strip(y0, y0 + (yT1 - y0) * 0.35); c.fillStyle = rgb(mix(E.shade, P.shadowC, 0.3), 0.35); c.fill(); }
      furrow(c, [[xAt(y0) - hw * 0.5, (y0 + yT1) / 2], [xAt(y0) + hw * 0.4, (y0 + yT1) / 2 + 0.3]], rgb(R.edge, 0.3), rgb(D.ridge, 0.4), 0.45, [0, -0.6]);
      strip(yT1, yR1); c.fillStyle = LG(c, 0, yT1, 0, yR1, [Wd.mid, Wd.shade, mix(Wd.shade, Wd.edge, 0.4)]); c.fill(); stroke(c, rgb(Wd.edge, 0.9), EW_S);
      c.beginPath(); c.moveTo(xAt(yT1) - hw + 0.8, yT1 + 0.5); c.lineTo(xAt(yT1) + hw - 0.8, yT1 + 0.5); stroke(c, rgb(B.ridge, 0.6), 0.6);
      furrow(c, [[xAt(yT1) - hw + 2, (yT1 + yR1) / 2 + 0.3], [xAt(yT1), (yT1 + yR1) / 2 - 0.2], [xAt(yT1) + hw - 2.5, (yT1 + yR1) / 2 + 0.2]], rgb(Wd.edge, 0.5), null, 0.45);
      for (const s2 of [-1, 1]) { c.beginPath(); c.arc(xAt(yT1) + s2 * (hw - 2), (yT1 + yR1) / 2, 0.6, 0, TAU); c.fillStyle = rgb(Wd.edge); c.fill(); }
    }
    // side stringers: a squared timber down each side of the flight, its top tucked under the turf, its foot sunk in
    // a little heap of sand
    for (const s2 of [-1, 1]) {
      const t0 = [xAt(yA) + s2 * (hw + 0.6), yA - 1.5], t1 = [xAt(yB) + s2 * (hw + 0.6), yB + 0.5], bw = 1.6;
      poly(c, [[t0[0] - bw, t0[1]], [t0[0] + bw, t0[1]], [t1[0] + bw, t1[1]], [t1[0] - bw, t1[1]]]); c.closePath(); c.fillStyle = LG(c, t0[0] - bw, 0, t0[0] + bw, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S);
      c.beginPath(); c.moveTo(t0[0] - bw * 0.4, t0[1] + 1); c.lineTo(t1[0] - bw * 0.4, t1[1] - 1); stroke(c, rgb(B.ridge, 0.45), 0.45);
      closedSmooth(c, [[t1[0] - 4, t1[1] + 0.8], [t1[0] - 1.5, t1[1] - 2], [t1[0] + 2, t1[1] - 1.8], [t1[0] + 4.5, t1[1] + 0.8], [t1[0], t1[1] + 2]]); c.fillStyle = LG(c, 0, t1[1] - 2, 0, t1[1] + 2, [mix(D.lit, D.ridge, 0.3), D.mid]); c.fill();
      c.beginPath(); c.moveTo(t1[0] - 3, t1[1] + 0.6); c.quadraticCurveTo(t1[0], t1[1] - 1.4, t1[0] + 3.5, t1[1] + 0.6); stroke(c, rgb(D.dark, 0.3), 0.45);
    }
    softShadow(c, xAt(yB) + 1.5, yB + 1.5, hw + 3, 2.2, P.shadowA, 0, P.shadowC);
  }
  // a road across open sand: packed, darker sand between soft raised verges with an edge line, so it still reads
  // against the beach; scuffed prints along it
  function sandPath(c, P, pts) {
    const R = P.road, D = P.sand, Rn = rand(83); c.lineCap = 'round'; c.lineJoin = 'round';
    // the same build as the dirt road (dark edge, shaded under-layer, lit surface), in packed sand tones
    poly(c, pts); stroke(c, mix(D.edge, R.edge, 0.5), 15.5);
    c.save(); c.translate(0.9, 1.2); poly(c, pts); stroke(c, mix(R.shade, D.shade, 0.4), 13); c.restore();
    c.save(); c.translate(-0.5, -0.6); poly(c, pts); stroke(c, mix(R.mid, D.mid, 0.35), 11.4); c.restore();
    for (const s of [-1, 1]) { const e = offset(pts, (u, i) => s * (4.9 + 0.6 * Math.sin(i * 0.41 + s))); poly(c, e); stroke(c, rgb(mix(R.shade, R.edge, 0.25), 0.45), 1.4); }
    for (const d of [-2.4, 2.4]) { const r = offset(pts, d); let i = 2; while (i < pts.length - 6) { const L = 8 + (Rn() * 14 | 0); furrow(c, r.slice(i, i + L), rgb(R.shade, 0.45), rgb(R.lit, 0.5), 0.75, [-0.3, -0.7]); i += L + 5 + (Rn() * 8 | 0); } }
    for (let i = 3; i < pts.length - 2; i += 2) { const p = offset(pts, (Rn() - 0.5) * 6)[i]; c.beginPath(); c.ellipse(p[0], p[1], 1 + Rn() * 0.6, 0.6, Rn() * 3, 0, TAU); c.fillStyle = rgb(D.dark, 0.22); c.fill(); }
  }

  // ---------------- water and paths ----------------
  // a creek seen from above that behaves like running water: its width set by wAt(u, p) (narrow at the source,
  // wider at the bends and in pools), and banks that differ side to side: on the outside of each bend the current
  // has undercut a steep earth cut bank (a wider, darker wall under an overhanging turf lip); on the inside it has
  // dropped a pale crescent of sand and gravel (a point bar) that slopes into shallow water. The deep thread of the
  // current swings to the outside of every bend; highlights follow it and break into ripples at the narrows. Turf
  // clumps, reeds and stones break the bank line here and there. stones: [u, side (-0.5..0.5)] stones in the stream
  // with a foam vee trailing downstream
  function creek(c, P, pts, wAt, stones = [], barK = null) {
    const Wt = P.water, E = P.earth, G = P.grass, D = P.sand, n = pts.length, R = rand(17);
    const tan = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; });
    // signed bend: > 0 when the bend's inside is on the right of the direction of travel
    const bendRaw = pts.map((p, i) => { const a = pts[Math.max(0, i - 6)], b = pts[Math.min(n - 1, i + 6)], mx = (a[0] + b[0]) / 2 - p[0], my = (a[1] + b[1]) / 2 - p[1]; return (mx * -tan[i][1] + my * tan[i][0]) / 6; });
    const smooth = (arr, r) => arr.map((_, i) => { let s = 0, k = 0; for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) { s += arr[j]; k++; } return s / k; });
    const bend = smooth(bendRaw, 4).map(v => clamp(v * 1.9, -1, 1));
    const raw = pts.map((p, i) => wAt(i / (n - 1), p) * (1 + 0.45 * Math.abs(bend[i])));
    const W = smooth(raw, 3);
    // o(s, i): how much side s (-1 left, +1 right) is the OUTSIDE of a bend (+) or the inside (-)
    const o = (s, i) => -s * bend[i];
    // the visible earth wall: wider on a cut bank, and wider where the wall faces us (on the water's upper side)
    const facing = (s, i) => clamp(-(s * tan[i][0]), 0, 1);   // the side's normal points up when s * tx < 0
    const wall = (s, i) => (0.9 + 1.6 * facing(s, i)) * (1 + 1.6 * Math.max(0, o(s, i))) + 0.4 * Math.sin(i * 0.37 + s);
    const bar = (s, i) => Math.max(0, -o(s, i) - 0.35) * 6 * (barK ? barK(pts[i]) : 1);   // a narrow gravel beach on the tightest insides only   // the point bar's width on a bend's inside (barK(p) can hold it back, e.g. beside a road)
    const off = (s, f) => offset(pts, (u, i) => s * f(i));
    const strip = (s, f0, f1) => { poly(c, [...off(s, f0), ...off(s, f1).reverse()]); c.closePath(); };
    const band = (fl, fr) => { poly(c, [...off(-1, fl), ...off(1, fr).reverse()]); c.closePath(); };
    const half = i => W[i] / 2;
    // the grass shaded round the whole bed, then each side's bank
    band(i => half(i) + wall(-1, i) + bar(-1, i) + 2.2, i => half(i) + wall(1, i) + bar(1, i) + 2.2); c.fillStyle = rgb(mix(G.shade, E.shade, 0.2), 0.32); c.fill();
    for (const s of [-1, 1]) {
      const outer = i => half(i) + wall(s, i) + bar(s, i);
      // turf lip rolling over the wall top
      strip(s, i => outer(i) - 0.4, i => outer(i) + 1.1); c.fillStyle = rgb(mix(G.mid, G.lit, 0.25)); c.fill();
      // the earth wall: a lit top, a shaded foot at the waterline; cut banks darker and redder
      strip(s, i => half(i) - 0.3, outer); c.fillStyle = LG(c, 0, Math.min(...pts.map(p => p[1])) - 10, 0, Math.max(...pts.map(p => p[1])) + 10, [mix(E.lit, E.mid, 0.35), E.mid]); c.fill();
      c.save(); strip(s, i => half(i) - 0.3, outer); c.clip();
      strip(s, i => half(i) - 0.3, i => half(i) + wall(s, i) * Math.max(0.35, o(s, i))); c.fillStyle = rgb(mix(E.shade, Wt.bank, 0.4), 0.85); c.fill();   // the undercut, deep in shade
      strip(s, i => outer(i) - 1.3, outer); c.fillStyle = rgb(mix(E.edge, P.shadowC, 0.3), 0.4); c.fill();   // shade under the lip
      // strata grooves along the cut banks
      { const f = off(s, i => half(i) + wall(s, i) * 0.55); let run = []; const out = () => { if (run.length > 3) furrow(c, run, rgb(E.edge, 0.45), rgb(mix(E.lit, D.ridge, 0.4), 0.5), 0.55, [-0.4, -0.7]); run = []; }; f.forEach((p, i) => { if (o(s, i) > 0.3) run.push(p); else out(); }); out(); }
      c.restore();
      // the point bar: pale sand and gravel sloping into the water, with a wet margin at the waterline
      if (pts.some((_, i) => bar(s, i) > 0.5)) {
        const b0 = i => half(i) - 0.6, b1 = i => half(i) + bar(s, i) * 0.95;
        strip(s, b0, b1); c.fillStyle = rgb(mix(mix(E.mid, D.mid, 0.45), G.shade, 0.15)); c.fill();   // damp earth and gravel, the same family as the banks
        strip(s, b0, i => half(i) + bar(s, i) * 0.4); c.fillStyle = rgb(mix(E.shade, Wt.mid, 0.25), 0.75); c.fill();
        { let run = []; const fl = () => { if (run.length > 2) furrow(c, run, rgb(D.dark, 0.25), rgb(D.ridge, 0.8), 0.55, [-0.4, -0.6]); run = []; }; off(s, i => half(i) + bar(s, i) * 0.62).forEach((p, i) => { if (bar(s, i) > 2) run.push(p); else fl(); }); fl(); }
        for (let i = 2; i < n - 2; i += 2) if (bar(s, i) > 2.2 && R() < 0.4) { const f = 0.3 + R() * 0.6, p = off(s, j => half(j) + bar(s, j) * f)[i]; pebble(c, P, p[0] + (R() - 0.5) * 2, p[1] + (R() - 0.5) * 2, 0.5 + R() * R() * 1.4 * Math.min(1, bar(s, i) / 5)); }
      }
      // the bank's outer edge line, in the grass's own dark green
      poly(c, off(s, i => outer(i) + 1.1)); stroke(c, rgb(mix(G.edge, E.edge, 0.3), 0.6), EW_S);
    }
    // a damp dark lip at the waterline along both banks
    for (const s of [-1, 1]) { strip(s, i => half(i) - 0.3, i => half(i) + 1.3); c.fillStyle = rgb(mix(E.shade, Wt.bank, 0.5), 0.75); c.fill(); }
    // the water: deep blue down the thread of the current (swinging to the outside of each bend), paler shallows
    // over the point bars
    const thal = i => -bend[i] * half(i) * 0.42;   // the deep thread's offset (right positive)
    band(half, half); c.fillStyle = rgb(Wt.mid); c.fill();
    c.save(); band(half, half); c.clip();
    for (const s of [-1, 1]) { strip(s, i => half(i) * Math.max(0.15, 0.55 - 0.9 * Math.max(0, -o(s, i))), i => half(i) + 1); c.fillStyle = rgb(mix(Wt.mid, Wt.lit, 0.35), 0.55 * 1); c.globalAlpha = 1; c.fill(); }
    const deep = (k) => { poly(c, [...offset(pts, (u, i) => thal(i) - half(i) * k), ...offset(pts, (u, i) => thal(i) + half(i) * k).reverse()]); c.closePath(); };
    deep(0.5); c.fillStyle = rgb(mix(Wt.deep, Wt.mid, 0.35), 0.85); c.fill();
    deep(0.24); c.fillStyle = rgb(Wt.deep, 0.75); c.fill();
    c.lineCap = 'round';
    // highlights riding the current: long arcs near the thread, short broken ones in the shallows, all following it
    for (let k = 0; k < Math.round(n / 2.6); k++) {
      const i = 2 + (R() * (n - 12) | 0), len = 4 + (R() * 9 | 0), f = (R() - 0.5) * 1.3;
      const seg = offset(pts.slice(i, i + len), (u, j) => { const ii = Math.min(n - 1, i + j); return thal(ii) + half(ii) * f * (1 - Math.abs(bend[ii]) * 0.3); });
      poly(c, seg); stroke(c, rgb(Wt.lit, 0.3 + R() * 0.45), 0.45 + R() * 0.45);
    }
    // ripple chevrons where it runs narrow and fast
    for (let i = 6; i < n - 6; i += 3) {
      if (W[i] > Math.min(W[i - 5], W[i + 5]) * 0.93 || R() < 0.35) continue;
      const p = offset(pts, (u, j) => thal(j))[i], [tx, ty] = tan[i], w = half(i) * 0.55;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(p[0] - ty * s * 0.6, p[1] + tx * s * 0.6); c.quadraticCurveTo(p[0] + tx * 1.5 - ty * s * w * 0.6, p[1] + ty * 1.5 + tx * s * w * 0.6, p[0] + tx * 3.2 - ty * s * w, p[1] + ty * 3.2 + tx * s * w); stroke(c, rgb(Wt.lit, 0.55), 0.5); }
    }
    c.save(); c.translate(0, 1.1); band(half, half); stroke(c, rgb(mix(Wt.deep, P.shadowC, 0.4), 0.5), 1.4); c.restore();
    c.restore();
    band(half, half); stroke(c, rgb(mix(Wt.deep, Wt.bank, 0.5), 0.55), 0.6);
    // things breaking the bank line: turf clumps leaning over the water, reeds on the cut banks, stones at the foot
    const clumps = [];
    for (let i = 4; i < n - 4; i += 4 + (R() * 7 | 0)) clumps.push([i, R() < 0.5 ? -1 : 1]);
    for (const [i, s] of clumps) {
      if (bar(s, i) > 1.5) continue;
      const p = off(s, j => half(j) + wall(s, j) * 0.6)[i], nx = -tan[i][1] * s, ny = tan[i][0] * s, a = Math.atan2(ny, nx) + Math.PI / 2, w = 1.6 + R() * 2.2;
      c.save(); c.translate(p[0], p[1]); c.rotate(a);
      c.beginPath(); c.moveTo(-w, -2.2); c.quadraticCurveTo(-w * 1.05, 0.6, -w * 0.3, 1.3); c.quadraticCurveTo(0, 2.1, w * 0.4, 1.2); c.quadraticCurveTo(w * 1.05, 0.5, w, -2.2); c.closePath();
      c.fillStyle = LG(c, 0, -2.2, 0, 2, [mix(G.mid, G.lit, 0.2), mix(G.shade, G.edge, 0.3)]); c.fill(); stroke(c, rgb(G.edge, 0.7), 0.5);
      c.beginPath(); c.moveTo(-w * 0.6, -0.8); c.quadraticCurveTo(0, -1.5, w * 0.5, -0.9); stroke(c, rgb(G.tuftLit, 0.5), 0.45);
      c.restore();
    }
    const reedAt = [];
    for (let i = 8; i < n - 8; i++) for (const s of [-1, 1]) if (o(s, i) > 0.45 && o(s, i) >= o(s, i - 1) && o(s, i) >= o(s, i + 1) && !reedAt.some(q => Math.abs(q[0] - i) < 14)) reedAt.push([i, s]);
    reedAt.forEach(([i, s], k) => { const p = off(s, j => half(j) + wall(s, j) + 1.5)[i]; tallGrass(c, P, p[0], p[1] + 1.5, 0.36 + R() * 0.12, 700 + k); const q = off(s, j => half(j) + wall(s, j) + 2)[clamp(i + 5, 0, n - 1)]; tallGrass(c, P, q[0], q[1] + 1.5, 0.26, 740 + k); });
    for (let i = 10; i < n - 6; i += 9 + (R() * 9 | 0)) { const s = R() < 0.5 ? -1 : 1; if (bar(s, i) > 1) continue; const p = off(s, j => half(j) - 0.4)[i]; rock(c, P, p[0], p[1], 1.4 + R() * 1.2, 900 + i, R() < 0.5, false); }
    // stones in the stream, a foam vee trailing downstream from each
    for (const [u, side] of stones) {
      const i = Math.round(u * (n - 1)), [tx, ty] = tan[i];
      const [x, y] = offset(pts, (uu, j) => W[j] * side)[i];
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + tx * 1.5 - ty * s * 1.5, y + ty * 1.5 + tx * s * 1.5); c.quadraticCurveTo(x + tx * 5 - ty * s * 3, y + ty * 5 + tx * s * 3, x + tx * 9 - ty * s * 3.6, y + ty * 9 + tx * s * 3.6); stroke(c, rgb(P.sea.foam, 0.8), 0.7); }
      rock(c, P, x, y, 2.2, (u * 999) | 0, false, false);
      c.beginPath(); c.ellipse(x, y + 0.8, 3.2, 1.4, 0, 0.2, Math.PI - 0.2); stroke(c, rgb(P.sea.foam, 0.75), 0.6);
    }
    return W;
  }
  // a small waterfall where the creek drops over the bluff, exactly as tall as the bluff there (h): the bluff is
  // rocky at the fall (a boulder step either side, seated in the bank face), the sheet bulges over a bright lip,
  // streaked unevenly, and lands in an irregular churn of foam that spreads downstream, with spray above it
  // fresh-water foam at dusk takes the evening's colour (no glowing day-white)
  const duskFoam = P => P.name === 'dusk' ? { ...P.sea, foam: mix(P.sea.foam, P.water.mid, 0.32), foamEdge: mix(P.sea.foamEdge, P.water.deep, 0.3) } : P.sea;
  function waterfall(c, P, x, yTop, w, h) {
    const Wt = P.water, S = duskFoam(P), R = rand(23), y1 = yTop + h;
    // the boulders the fall has cut between, standing in the bank face: big ones low, smaller ones up top
    for (const [dx, dy, r, sd, m] of [[-w / 2 - 4, h * 0.2, 5.5, 233, true], [w / 2 + 4.5, h * 0.16, 6, 234, true], [-w / 2 - 6.5, h * 0.66, 8, 231, false], [w / 2 + 7, h * 0.7, 8.5, 232, false], [-w / 2 - 13.5, h * 0.88, 4, 235, false]]) rock(c, P, x + dx, yTop + dy, r, sd, m, false, 'block');
    // the sheet: wider at the foot than the lip, its edges ragged
    const L = [], Rr = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8, yy = yTop + t * h, sp = w / 2 + t * 1.6; L.push([x - sp + Math.sin(k * 2.1) * 0.4, yy]); Rr.push([x + sp + Math.sin(k * 1.7 + 1) * 0.4, yy]); }
    poly(c, [...L, ...Rr.reverse()]); c.closePath();
    c.fillStyle = LG(c, 0, yTop, 0, y1, [Wt.mid, mix(Wt.mid, Wt.lit, 0.4), mix(Wt.lit, S.foam, 0.55)]); c.fill(); stroke(c, rgb(mix(Wt.deep, P.rock.edge, 0.4), 0.55), EW_S);
    c.lineCap = 'round';
    // uneven streaks: some long, some broken, darker gaps between
    for (let k = 0; k < 9; k++) { const fx = x - w / 2 + 1 + (k + R() * 0.6) * (w - 2) / 9, y0 = yTop + 1 + R() * 3, ye = y1 - 1 - R() * h * 0.35, dark = R() < 0.35;
      c.beginPath(); c.moveTo(fx, y0); c.quadraticCurveTo(fx + (fx - x) * 0.04, (y0 + ye) / 2, fx + (fx - x) * 0.1, ye); stroke(c, dark ? rgb(Wt.deep, 0.32) : rgb(P.white, 0.4 + R() * 0.4), dark ? 0.9 : 0.5 + R() * 0.4); }
    // the lip, curling over
    c.beginPath(); c.moveTo(x - w / 2 - 0.3, yTop + 0.8); c.bezierCurveTo(x - w / 4, yTop - 1.4, x + w / 4, yTop - 1, x + w / 2 + 0.3, yTop + 0.9); stroke(c, rgb(P.white, 0.9), 1.1);
    c.beginPath(); c.moveTo(x - w / 2 + 1, yTop + 2.6); c.quadraticCurveTo(x, yTop + 1.6, x + w / 2 - 1, yTop + 2.8); stroke(c, rgb(Wt.deep, 0.3), 0.7);
    // the churn where it lands: one irregular foam mass, lumpy on top, trailing off downstream, then loose puffs
    const blob = []; const rx = w * 0.78, ry = 4.4;
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, top = Math.sin(a) < 0, j = top ? 0.75 + R() * 0.55 : 0.85 + R() * 0.3; blob.push([x + Math.cos(a) * rx * j * (1 + (Math.cos(a) > 0 ? 0.12 : 0)), y1 + 1.5 + Math.sin(a) * ry * j * (top ? 1.1 : 1.3)]); }
    closedSmooth(c, blob); c.fillStyle = LG(c, 0, y1 - 3, 0, y1 + 7, [S.foam, mix(S.foam, S.surf, 0.35), mix(S.foam, Wt.mid, 0.45)]); c.fill(); stroke(c, rgb(S.foamEdge, 0.55), 0.6);
    for (const [dx, dy, r] of [[-w * 0.35, 0.2, 2.4], [-w * 0.05, -0.6, 3.1], [w * 0.28, 0.4, 2.2], [w * 0.5, 1.6, 1.5], [-w * 0.6, 1.8, 1.3]]) { c.beginPath(); c.arc(x + dx, y1 + dy, r, 3.3, 6.1); stroke(c, rgb(P.white, 0.9), 0.6); }
    for (let k = 0; k < 9; k++) { const a = R() * TAU, d = 0.8 + R() * 0.6; const px = x + Math.cos(a) * rx * d * 1.05, py = y1 + 2 + Math.sin(a) * ry * d * 1.3 + (Math.sin(a) > 0 ? 2 : 0); c.beginPath(); c.arc(px, py, 0.5 + R() * 1.1, 0, TAU); c.fillStyle = rgb(S.foam, 0.8); c.fill(); }
    // spray: a few droplets and a soft mist above the churn
    glow(c, x, y1 - 1, w * 0.7, P.white, P.name === 'dusk' ? 0.08 : 0.18);
    for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + (R() - 0.5) * w * 1.3, y1 - 1.5 - R() * 3.5, 0.4 + R() * 0.45, 0, TAU); c.fillStyle = rgb(S.foam, 0.8); c.fill(); }
  }
  // the spring the creek rises from: a round pool (bank ring, deep water, ripple rings, a foam ring where the
  // cascade lands at its back) ...
  function springPool(c, P, x, y, r) {
    const Wt = P.water, S = duskFoam(P);
    c.beginPath(); c.ellipse(x, y, r + 3.5, (r + 3.5) * 0.55, 0, 0, TAU); c.fillStyle = rgb(Wt.bank); c.fill();
    c.beginPath(); c.ellipse(x, y, r, r * 0.55, 0, 0, TAU); c.fillStyle = LG(c, x, y - r * 0.55, x, y + r * 0.55, [Wt.deep, Wt.mid]); c.fill();
    // rings spreading from where the cascade lands at the pool's back, broken where the light catches them
    for (const k of [0.32, 0.55, 0.8]) { const cy = y - r * 0.3 + k * r * 0.12; c.beginPath(); c.ellipse(x, cy, r * k, r * k * 0.42, 0, 0, TAU); stroke(c, rgb(Wt.deep, 0.5), 0.7); for (const [a0, a1] of [[0.2, 1.3], [1.7, 2.9], [3.4, 4.6], [5.0, 5.9]]) { c.beginPath(); c.ellipse(x - 0.4, cy - 0.7, r * k, r * k * 0.42, 0, a0, a1); stroke(c, rgb(Wt.lit, 0.7 - k * 0.4), 0.6); } }
  }
  // ... and its source, which stands: the ground rises behind the pool into a low grassy bank, and a mossy rock
  // ledge juts out of it (three blocks, strata line-pairs on their faces, moss caps with drips); the water spills from
  // the cleft between the front blocks in a little cascade, and a ring of stones edges the pool's front
  function springRocks(c, P, x, y, r) {
    const Wt = P.water, S = duskFoam(P), K = P.rock, G = P.grass, Lf = P.leaf, R = rand(305), yb = y - r * 0.5;
    // the outcrop's footing: shade pooled where the rocks meet the grass, and its cast shadow (no flat mound)
    castShadow(c, P, x + 2, yb, 34, 52);
    softShadow(c, x + 2, yb - 2, 34, 9, P.shadowA * 1.1, 0, P.shadowC);
    const block = (pts, seed, top) => {
      const Rb = rand(seed), sh = pts.map(([dx, dy]) => [x + dx, yb + dy]);
      const minY = Math.min(...sh.map(p => p[1])), maxY = Math.max(...sh.map(p => p[1])), minX = Math.min(...sh.map(p => p[0])), maxX = Math.max(...sh.map(p => p[0]));
      closedSmooth(c, sh); c.fillStyle = LG(c, minX, minY, maxX, maxY, [K.lit, K.mid, K.shade]); c.fill();
      c.save(); closedSmooth(c, sh); c.clip();
      c.fillStyle = LG(c, 0, lerp(minY, maxY, 0.4), 0, maxY, ['rgba(30,24,20,0)', 'rgba(30,24,20,.35)']); c.fillRect(minX - 2, minY, maxX - minX + 4, maxY - minY + 2);
      for (let k = 1; k <= 2; k++) { const yy = lerp(minY, maxY, 0.38 + k * 0.2); furrow(c, [[minX, yy + Rb() * 1.5], [lerp(minX, maxX, 0.45), yy - 0.8], [maxX, yy + 1]], rgb(K.edge, 0.5), rgb([255, 255, 240], 0.3), 0.7, [0, -1]); }
      furrow(c, [[lerp(minX, maxX, 0.6), lerp(minY, maxY, 0.3)], [lerp(minX, maxX, 0.55), lerp(minY, maxY, 0.6)], [lerp(minX, maxX, 0.62), maxY]], rgb(K.edge, 0.45), null, 0.6);
      if (top) {   // the moss cap: a cushion of small leafy tufts over the top, its lower edge a run of round lobes of
        // different sizes, leaf marks on it, a shade line on the rock under it and a few thin hanging strands
        const mY = minY + (maxY - minY) * 0.3, nS = 8, lob = []; for (let k = 0; k <= nS; k++) lob.push([lerp(minX - 1, maxX + 1, k / nS), mY + (k % 2 ? 1.2 : 0) + Rb() * 1.6, 1.4 + Rb() * 1.6]);
        const cap = () => { c.beginPath(); c.moveTo(minX - 2, minY - 2); c.lineTo(maxX + 2, minY - 2); c.lineTo(maxX + 2, lob[nS][1]); for (let k = nS; k > 0; k--) { const a2 = lob[k], b2 = lob[k - 1]; c.bezierCurveTo(a2[0], a2[1] + a2[2] * 1.3, b2[0], b2[1] + b2[2] * 1.3, b2[0], b2[1]); } c.lineTo(minX - 2, lob[0][1]); c.closePath(); };
        c.save(); c.translate(0.5, 1.6); cap(); c.fillStyle = rgb(mix(K.edge, P.shadowC, 0.4), 0.35); c.fill(); c.restore();
        cap(); c.fillStyle = LG(c, minX, minY, maxX, mY + 3, [mix(Lf.lit, G.patch, 0.3), Lf.mid, mix(Lf.mid, Lf.shade, 0.55)]); c.fill(); stroke(c, rgb(Lf.edge, 0.6), 0.6);
        c.save(); cap(); c.clip();
        for (let k = 0; k < 16; k++) { const lx2 = lerp(minX, maxX, Rb()), ly2 = lerp(minY, mY + 1, Rb()), sz = 0.9 + Rb() * 0.8; c.beginPath(); c.moveTo(lx2 - sz, ly2 - sz * 0.6); c.lineTo(lx2, ly2); c.lineTo(lx2 + sz, ly2 - sz * 0.6); stroke(c, rgb(Lf.vein, 0.55), 0.45); c.beginPath(); c.moveTo(lx2 - sz * 0.9, ly2 - sz * 1.2); c.lineTo(lx2, ly2 - sz * 0.6); stroke(c, rgb(Lf.sheen, 0.5), 0.35); }
        c.restore();
        for (let k = 0; k < 2; k++) { const lb = lob[1 + (Rb() * (nS - 2) | 0)], hx = lb[0], hy = lb[1] + lb[2] * 0.9, L = 3 + Rb() * 3; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + 0.8, hy + L * 0.5, hx + 0.3, hy + L); stroke(c, rgb(Lf.shade, 0.9), 0.5); for (let q = 1; q <= 2; q++) { c.beginPath(); c.ellipse(hx + 0.5 + (q % 2 ? 0.6 : -0.4), hy + L * q / 2.4, 0.7, 0.4, q % 2 ? 0.6 : -0.6, 0, TAU); c.fillStyle = rgb(Lf.mid); c.fill(); } }
        c.beginPath(); c.moveTo(minX + 2, minY + 1.5); c.quadraticCurveTo(lerp(minX, maxX, 0.4), minY - 0.5, lerp(minX, maxX, 0.75), minY + 1); stroke(c, rgb(Lf.sheen, 0.55), 0.8);
      }
      c.restore();
      closedSmooth(c, sh); stroke(c, K.edge, EW);
    };
    // a back tier of taller blocks makes it a real outcrop, then ferns and grass rooted in its cracks behind the front blocks
    block([[-34, -2], [-36, -14], [-28, -24], [-18, -22], [-14, -8], [-22, -1]], 314, true);
    block([[18, -6], [20, -22], [30, -27], [39, -18], [38, -5], [28, -1]], 315, true);
    block([[-17, -14], [-12, -34], [0, -40], [13, -37], [21, -24], [9, -14], [-5, -16]], 311, true);
    fern(c, P, x - 30, yb - 20, 0.55, 316); fern(c, P, x + 32, yb - 22, 0.5, 317); tallGrass(c, P, x + 12, yb - 36, 0.4, 318); fern(c, P, x - 9, yb - 37, 0.42, 319);
    // the crevice the water comes out of: a dark slot between the blocks, wet and mossy at its lip
    c.beginPath(); c.moveTo(x - 5, yb - 26); c.quadraticCurveTo(x, yb - 29, x + 5, yb - 26); c.lineTo(x + 6, yb + 1); c.lineTo(x - 6, yb + 1); c.closePath(); c.fillStyle = LG(c, 0, yb - 28, 0, yb, [mix(K.edge, [16, 22, 26], 0.5), mix(K.edge, [20, 30, 34], 0.3)]); c.fill();
    block([[-25, 1], [-27, -7], [-21, -16], [-11, -20], [-3, -18], [-2, -5], [-6, 1]], 312, true);
    block([[3, 1], [2, -17], [9, -22], [19, -20], [26, -11], [27, -2], [22, 2]], 313, true);
    // the cascade: a broad soft sheet spilling out of the crevice and widening as it falls, streaked, a bright lip,
    // then a ring of splash where it hits the pool, spreading ripples
    const top = yb - 25, base = yb + 2.5;
    c.beginPath(); c.moveTo(x - 4, top); c.bezierCurveTo(x - 5.5, top + 4, x - 6, (top + base) / 2, x - 7.5, base); c.lineTo(x + 7.5, base); c.bezierCurveTo(x + 6, (top + base) / 2, x + 5.5, top + 4, x + 4, top); c.closePath();
    c.fillStyle = LG(c, 0, top, 0, base, [rgb(Wt.mid, 0.95), rgb(mix(Wt.mid, Wt.lit, 0.45), 0.92), rgb(mix(Wt.lit, S.foam, 0.6), 0.9)]); c.fill(); stroke(c, rgb(Wt.deep, 0.4), 0.5);
    c.lineCap = 'round';
    for (const [fx, a, dark] of [[-3.2, 0.7, 0], [-1.6, 0.35, 1], [-0.2, 0.75, 0], [1.4, 0.3, 1], [2.8, 0.6, 0]]) { c.beginPath(); c.moveTo(x + fx, top + 2); c.quadraticCurveTo(x + fx * 1.2, (top + base) / 2, x + fx * 1.7, base - 1); stroke(c, dark ? rgb(Wt.deep, a) : rgb(P.white, a), dark ? 0.6 : 0.5); }
    c.beginPath(); c.moveTo(x - 4.2, top + 0.8); c.quadraticCurveTo(x, top - 1.2, x + 4.2, top + 0.8); stroke(c, rgb(P.white, 0.9), 1.1);
    glow(c, x, base, 12, P.white, P.name === 'dusk' ? 0.07 : 0.16);
    c.beginPath(); c.ellipse(x, base + 2, 11, 3.6, 0, 0, TAU); stroke(c, rgb(S.foam, 0.85), 1.3);
    c.beginPath(); c.ellipse(x, base + 2.4, 15, 5, 0, 0.15, Math.PI - 0.15); stroke(c, rgb(Wt.lit, 0.6), 0.6);
    for (const [dx, dy, rr] of [[-6, 1.4, 1.7], [-2.5, 2.4, 2.3], [1.5, 2.2, 2.6], [5.5, 1.2, 1.8], [8.5, 2, 1.1], [-8.6, 2.2, 1]]) { c.beginPath(); c.arc(x + dx, base + dy, rr, 0, TAU); c.fillStyle = rgb(S.foam, 0.92); c.fill(); c.beginPath(); c.arc(x + dx, base + dy, rr, 0.2, Math.PI - 0.2); stroke(c, rgb(S.foamEdge, 0.5), 0.45); }
    for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + (R() - 0.5) * 18, base - 1 - R() * 4, 0.4 + R() * 0.4, 0, TAU); c.fillStyle = rgb(S.foam, 0.85); c.fill(); }
    const rocks = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.4; if (Math.sin(a) < 0.15 || Math.abs(a - Math.PI) < 0.45) continue; rocks.push([x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2) * 0.55, a]); }
    rocks.sort((p, q) => p[1] - q[1]);
    for (const [rx, ry, a] of rocks) rock(c, P, rx, ry, 4 + 1.5 * Math.abs(Math.sin(a * 2)), (a * 77) | 0, false);
  }
  // the creek's run across the beach to the sea: it starts in a splash pool under the waterfall, leaves at the
  // creek's own width and colour, then fans out into a delta toward the shore, braided into channels round sand bars
  // (each a teardrop island along the flow with a wet rim and a lit ridge). A darker wet-sand margin runs along both
  // banks and widens downstream; the water pales from creek blue to the surf's turquoise at the mouth (the plume in
  // the sea is drawn by plume). bars: [u along, f across (-0.5..0.5 of the width), length (in u), width (of the
  // channel width)]; stones: [u, f, r]; pool: [x, y, rx, ry] or null
  function channel(c, P, pts, w0, w1, bars = [], stones = [], pool = null) {
    const Wt = P.water, S = P.sea, D = P.sand, n = pts.length, R = rand(29);
    const wid = u => w0 + (w1 - w0) * Math.pow(u, 2.1);
    const band = d => { const L = offset(pts, u => -(wid(u) / 2 + (typeof d === 'function' ? d(u) : d))), Rr = offset(pts, u => wid(u) / 2 + (typeof d === 'function' ? d(u) : d)); poly(c, [...L, ...Rr.reverse()]); c.closePath(); };
    const y0 = pts[0][1], y1 = pts[n - 1][1];
    const poolShape = d => { c.beginPath(); c.ellipse(pool[0], pool[1], pool[2] + d, pool[3] + d * 0.55, 0, 0, TAU); };
    // the wet sand margin: a soft outer fade, then a darker band 3-5 units wide hugging the water
    for (let k = 4; k >= 0; k--) { band(u => 5 + k * (1.2 + u * 1.4)); c.fillStyle = rgb(D.wet, 0.12); c.fill(); if (pool) { poolShape(5 + k * 1.2); c.fill(); } }
    band(u => 3.5 + u * 3); c.fillStyle = rgb(mix(D.wet, D.dark, 0.35), 0.75); c.fill(); if (pool) { poolShape(3.5); c.fill(); }
    band(1.1); c.fillStyle = rgb(mix(D.wet, D.dark, 0.5), 0.75); c.fill(); if (pool) { poolShape(1.2); c.fill(); }
    const water = LG(c, 0, y0 - 8, 0, y1, [mix(Wt.deep, Wt.mid, 0.3), Wt.mid, mix(Wt.mid, S.shal, 0.5), mix(S.shal, S.surf, 0.6)]);
    const inPool = p => pool && ((p[0] - pool[0]) / (pool[2] + 0.5)) ** 2 + ((p[1] - pool[1]) / (pool[3] + 0.5)) ** 2 < 1;
    // the banks' edge lines, left out where they run inside the pool
    const sides = (d, style, w, dx = 0, dy = 0) => { for (const s of [-1, 1]) { const e = offset(pts, u => s * (wid(u) / 2 + d)); let run = []; const flush = () => { if (run.length > 1) { c.save(); c.translate(dx, dy); poly(c, run); stroke(c, style, w); c.restore(); } run = []; }; for (const p of e) { if (inPool(p)) flush(); else run.push(p); } flush(); } };
    if (pool) { poolShape(0); c.fillStyle = water; c.fill(); poolShape(0); stroke(c, rgb(mix(Wt.deep, D.dark, 0.55), 0.45), EW_S); }
    band(0); c.fillStyle = water; c.fill();
    c.save(); band(0); c.clip(); c.lineCap = 'round';
    // a deeper thread winding down the middle, flow lines following the current and spreading with the fan
    poly(c, offset(pts, (u) => Math.sin(u * 7) * wid(u) * 0.08).slice(0, Math.round(n * 0.7))); stroke(c, rgb(Wt.deep, 0.3), 4);
    for (let k = 0; k < 26; k++) {
      const i = R() * (n - 6) | 0, len = 4 + (R() * 7 | 0), f = (R() - 0.5) * 0.8;
      poly(c, offset(pts.slice(i, i + len), (u, j) => wid((i + j) / (n - 1)) * f)); stroke(c, rgb(Wt.lit, 0.3 + R() * 0.35), 0.6 + R() * 0.3);
    }
    c.restore();
    if (pool) { c.save(); poolShape(0); c.clip(); for (const k of [0.45, 0.75]) { c.beginPath(); c.ellipse(pool[0], pool[1] + 1, pool[2] * k, pool[3] * k, 0, 0, TAU); stroke(c, rgb(Wt.lit, 0.55), 0.6); } c.restore(); }
    sides(0, rgb(mix(Wt.deep, P.shadowC, 0.3), 0.35), 1.4, 0, 1.2);
    sides(0, rgb(mix(Wt.deep, D.dark, 0.55), 0.4), EW_S);
    sides(-0.5, rgb(Wt.lit, 0.3), 0.6, -0.5, -0.8);
    // sand bars the creek has dropped where it slows and spreads: each an outline of [u, f] points (u along the
    // channel, f across its width), so bars can be any fan or lobe shape; pale shallows and a wet rim round each,
    // a lit crest along its back, small ripple marks, and a soft foam line where the flow parts round its head
    const at = (u, f) => { const i = clamp(Math.round(u * (n - 1)), 0, n - 1); return offset(pts, uu => wid(uu) * f)[i]; };
    c.save(); band(0); c.clip();
    // ripples on the water between and below the bars, spreading with the fan
    for (let k = 0; k < 16; k++) { const u = 0.55 + R() * 0.42, f = (R() - 0.5) * 0.9, p = at(u, f), w2 = 1.6 + wid(u) * 0.04 * (1 + R()); c.beginPath(); c.moveTo(p[0] - w2, p[1] - 0.6); c.quadraticCurveTo(p[0], p[1] + 0.9, p[0] + w2, p[1] - 0.6); stroke(c, rgb(Wt.lit, 0.4), 0.5); }
    for (const outline of bars) {
      const sp = outline.map(([u, f]) => at(u, f)), m = sp.length;
      const minX = Math.min(...sp.map(p => p[0])), maxX = Math.max(...sp.map(p => p[0])), minY = Math.min(...sp.map(p => p[1])), maxY = Math.max(...sp.map(p => p[1]));
      closedSmooth(c, sp); c.lineJoin = 'round'; stroke(c, rgb(mix(S.shal, S.surf, 0.6), 0.55), 6);   // shallows round the bar
      closedSmooth(c, sp); stroke(c, rgb(mix(D.wet, D.dark, 0.25), 0.95), 2.6);                      // its wet rim
      closedSmooth(c, sp); c.fillStyle = LG(c, minX, minY, maxX, maxY, [D.lit, D.mid, mix(D.mid, D.wet, 0.45)]); c.fill(); stroke(c, rgb(D.dark, 0.35), EW_S);
      c.save(); closedSmooth(c, sp); c.clip();
      // the crest: a lit ridge from the bar's head fanning down its length, and ripple marks across it
      const head = sp[0], tail = [lerp(minX, maxX, 0.5), maxY - 2];
      furrow(c, spline([head, [lerp(head[0], tail[0], 0.4) - 1.5, lerp(head[1], tail[1], 0.45)], tail], 6), rgb(D.dark, 0.2), rgb(D.ridge, 0.8), 0.7, [-0.6, -0.6]);
      for (let q = 0; q < 5; q++) { const t = 0.3 + q * 0.14, p = [lerp(head[0], tail[0], t) + (R() - 0.5) * 3, lerp(head[1], tail[1], t)], w2 = (maxX - minX) * (0.12 + t * 0.2); c.beginPath(); c.moveTo(p[0] - w2, p[1] + 0.6); c.quadraticCurveTo(p[0], p[1] - 0.8, p[0] + w2, p[1] + 0.5); stroke(c, rgb(D.dark, 0.18), 0.5); }
      c.restore();
      // the flow parting round the head
      c.beginPath(); c.arc(head[0], head[1] + 1.2, 3.2, 3.5, 5.9); stroke(c, rgb(S.foam, 0.7), 0.6);
    }
    c.restore();
    for (const [u, f, r] of stones) {
      const [x, y] = at(u, f);
      c.beginPath(); c.ellipse(x + 0.5, y + r * 0.45, r * 1.5, r * 0.62, 0, 0, TAU); stroke(c, rgb(Wt.lit, 0.45), 0.6);
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x + sd * r * 0.7, y + r * 0.4); c.quadraticCurveTo(x + sd * r * 1.2, y + r * 1.6, x + sd * r * 1.4, y + r * 2.8); stroke(c, rgb(S.foam, 0.75), 0.7); }
      c.beginPath(); c.ellipse(x, y + r * 0.35, r * 1.05, r * 0.45, 0, 0, TAU); c.fillStyle = rgb(mix(Wt.deep, P.rock.edge, 0.5), 0.6); c.fill();
      rock(c, P, x, y, r, (u * 997) | 0, false, false);
      c.beginPath(); c.ellipse(x, y + r * 0.4, r * 1.1, r * 0.42, 0, 0.15, Math.PI - 0.15); stroke(c, rgb(S.foam, 0.85), 0.7);
    }
  }
  // a creek fanning out across the beach to the surf: it leaves the splash pool at the fall's own width and widens
  // steadily down the sand, braiding round low sand bars, the water shoaling from creek blue to pale turquoise and
  // feathering out into the surf (the whole fan fades away over its last stretch, no hard end); a band of dark wet sand
  // runs along both banks. axis: the fan's centre line (dense points, top to bottom, reaching past the waterline);
  // wAt(u): its width; bars: [u head, u tail, f (-0.5..0.5 across the width), half width in map units, drift of the
  // tail in f]; threads: lists of [u, f] down each channel (the deeper water); pool: [x, y, rx, ry] under the fall or
  // null; fade: [y0, y1], the fan fades out between these heights
  function delta(c0, P, axis, wAt, bars = [], threads = [], pool = null, fade = null) {
    // drawn on its own layer so its end can be feathered without erasing the sand under it
    const cv = document.createElement('canvas'); cv.width = c0.canvas.width; cv.height = c0.canvas.height;
    const c = cv.getContext('2d'); c.setTransform(c0.getTransform()); c.lineCap = 'round'; c.lineJoin = 'round';
    const Dl = P.delta, D = P.sand, S = P.sea, n = axis.length, R = rand(47);
    const nrm = axis.map((p, i) => { const a = axis[Math.max(0, i - 1)], b = axis[Math.min(n - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; });
    const idx = u => clamp(Math.round(u * (n - 1)), 0, n - 1);
    const at = (u, f, d = 0) => { const i = idx(u), p = axis[i], w = wAt(i / (n - 1)); return [p[0] - nrm[i][0] * (f * w + d), p[1] - nrm[i][1] * (f * w + d)]; };
    // the banks wander a little (small spill lobes), growing with the width
    const wob = (s, u) => (1.2 * Math.sin(u * 11 + s * 2) + 0.9 * Math.sin(u * 27 + s * 3) + 0.5 * Math.sin(u * 59 + s)) * (0.4 + u) + (s > 0 ? 2.6 : 2.2) * Math.exp(-(((u - (s > 0 ? 0.66 : 0.54)) / 0.08) ** 2));
    const side = (s, d) => axis.map((_, i) => { const u = i / (n - 1); return at(u, s * 0.5, s * (wob(s, u) * Math.min(1, u * 5) + (typeof d === 'function' ? d(u) : d))); });
    const fan = d => { poly(c, [...side(-1, d), ...side(1, d).reverse()]); c.closePath(); };
    const poolE = d => { if (!pool) return false; c.beginPath(); c.ellipse(pool[0], pool[1], pool[2] + d, pool[3] + d * 0.6, 0, 0, TAU); return true; };
    const y0 = axis[0][1], y1 = axis[n - 1][1];
    // wet sand: a soft wide fade, then the dark damp band hugging both banks
    for (let k = 4; k >= 1; k--) { const d = u => 2 + k * (1.4 + u * 1.8); fan(d); c.fillStyle = rgb(D.wet, 0.14); c.fill(); if (poolE(2 + k * 1.4)) c.fill(); }
    fan(u => 2.4 + u * 2.6); c.fillStyle = rgb(mix(D.wet, D.dark, 0.35), 0.85); c.fill(); if (poolE(2.2)) c.fill();
    fan(0.9); c.fillStyle = rgb(mix(D.wet, D.dark, 0.55), 0.8); c.fill(); if (poolE(0.9)) c.fill();
    const water = LG(c, 0, y0 - 4, 0, y1, [Dl.deep, Dl.mid, Dl.shal, Dl.pale]);
    if (poolE(0)) { c.fillStyle = water; c.fill(); }
    fan(0); c.fillStyle = water; c.fill();
    c.save(); fan(0); if (pool) { c.moveTo(pool[0] + pool[2], pool[1]); c.ellipse(pool[0], pool[1], pool[2], pool[3], 0, 0, TAU); } c.clip('nonzero');
    for (const th of threads) {
      const sp = spline(th.map(([u, f]) => at(u, f)), 8);
      for (const [w, a] of [[6, 0.16], [3.4, 0.24], [1.6, 0.28]]) { poly(c, sp); c.strokeStyle = LG(c, 0, sp[0][1], 0, sp[sp.length - 1][1], [rgb(Dl.deep, a), rgb(Dl.deep, a * 0.8), rgb(Dl.mid, 0)]); c.lineWidth = w; c.stroke(); }
      for (let k = 0; k < 6; k++) { const t0 = R() * 0.85, L = 0.06 + R() * 0.1, s2 = (R() - 0.5) * 3; const seg = sp.filter((_, j) => j / (sp.length - 1) >= t0 && j / (sp.length - 1) <= t0 + L).map(p => [p[0] + s2, p[1]]); if (seg.length > 1) { poly(c, seg); stroke(c, rgb(Dl.lit, 0.3 + R() * 0.3), 0.5 + R() * 0.3); } }
    }
    for (let k = 0; k < 12; k++) { const u = 0.7 + R() * 0.28, f = (R() - 0.5) * 0.9, p = at(u, f), w2 = 1.4 + R() * 2.4; c.beginPath(); c.moveTo(p[0] - w2, p[1] - 0.5); c.quadraticCurveTo(p[0], p[1] + 0.8, p[0] + w2, p[1] - 0.5); stroke(c, rgb(Dl.lit, 0.4), 0.5); }
    c.restore();
    for (const s of [-1, 1]) { const e = side(s, 0); poly(c, e.filter(p => !(pool && ((p[0] - pool[0]) / pool[2]) ** 2 + ((p[1] - pool[1]) / pool[3]) ** 2 < 1))); stroke(c, rgb(mix(Dl.deep, D.dark, 0.5), 0.5), EW_S); c.save(); c.translate(s * -0.7, -0.4); poly(c, side(s, -0.8).slice(4)); stroke(c, rgb(Dl.lit, 0.35), 0.55); c.restore(); }
    // the bars: low, irregular islands of wet sand barely out of the water: a blunt, lumpy head upstream and a long
    // ragged tail; a band of shallows round each, a dark damp rim at the waterline, a slightly drier crown, a lit
    // line along the upstream head where the flow piles sand, and the water lapping over the tail
    for (const [u0, u1, f, hw, drift = 0] of bars) {
      const Rb = rand((u0 * 1000) | 0), i0 = idx(u0), T0 = [axis[Math.min(n - 1, i0 + 1)][0] - axis[i0][0], axis[Math.min(n - 1, i0 + 1)][1] - axis[i0][1]], tl0 = Math.hypot(...T0) || 1;
      const Tx = T0[0] / tl0, Ty = T0[1] / tl0, C = at(u0, f), tail = at(u1, f + drift), Lx = (tail[0] - C[0]) * Tx + (tail[1] - C[1]) * Ty, Ly = -(tail[0] - C[0]) * Ty + (tail[1] - C[1]) * Tx;
      const W2 = (x, y) => [C[0] + x * Tx - y * Ty, C[1] + x * Ty + y * Tx];
      const ph = [Rb() * 6, Rb() * 6, Rb() * 6], nz = (k, m) => 1 + 0.13 * Math.sin(k * 0.55 + ph[0]) + 0.07 * Math.sin(k * 1.3 + ph[1]) * m;
      const out = d => { const r = hw + d, pts = []; let q = 0;
        for (let k = 0; k <= 8; k++, q++) { const a = -Math.PI / 2 + k / 8 * Math.PI, rk = r * nz(q, 1); pts.push(W2(-rk * Math.cos(a) * 0.7, rk * Math.sin(a))); }
        for (let k = 1; k <= 12; k++, q++) { const sg = k / 12; pts.push(W2(sg * Lx, Ly * sg * sg + r * nz(q, 1.5) * (0.12 + 0.88 * Math.pow(1 - sg * sg, 0.8)))); }
        for (let k = 11; k >= 1; k--, q++) { const sg = k / 12; pts.push(W2(sg * Lx, Ly * sg * sg - r * nz(q, 1.5) * (0.12 + 0.88 * Math.pow(1 - sg * sg, 0.8)))); }
        return pts; };
      const shape = d => closedSmooth(c, out(d));
      const bb = out(0), minX = Math.min(...bb.map(p => p[0])), maxX = Math.max(...bb.map(p => p[0])), minY = Math.min(...bb.map(p => p[1])), maxY = Math.max(...bb.map(p => p[1]));
      shape(2.4); c.fillStyle = rgb(Dl.pale, 0.4); c.fill();
      shape(0.8); c.fillStyle = rgb(mix(D.wet, D.dark, 0.45), 0.9); c.fill();
      shape(0); c.fillStyle = LG(c, minX, minY, maxX, maxY, [mix(D.wet, D.mid, 0.55), mix(D.wet, D.mid, 0.25), D.wet]); c.fill();
      c.save(); shape(0); c.clip();
      // the drier crown, off-centre toward the head
      c.save(); c.translate(-Tx * hw * 0.25, -Ty * hw * 0.25); c.scale(1, 1); shape(-hw * 0.45); c.restore();
      c.fillStyle = rgb(mix(D.mid, D.lit, 0.3), 0.55); c.fill();
      // ripple marks across it
      { const p0 = W2(-hw * 0.2, -hw * 0.15), p1 = W2(Lx * 0.55, Ly * 0.3); c.beginPath(); c.moveTo(...p0); c.quadraticCurveTo(...W2(Lx * 0.25, -hw * 0.25), ...p1); stroke(c, rgb(D.dark, 0.2), 0.5); }
      // water lapping over the tail
      c.fillStyle = LG(c, ...W2(Lx * 0.5, 0), ...W2(Lx, 0), [rgb(Dl.pale, 0), rgb(Dl.pale, 0.55)]); c.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
      c.restore();
      shape(0.8); stroke(c, rgb(mix(D.dark, Dl.deep, 0.35), 0.45), EW_S);
      // the lit head
      c.beginPath(); for (let k = 1; k <= 7; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI, rk = (hw - 0.6) * nz(k, 1), p = W2(-rk * Math.cos(a) * 0.7, rk * Math.sin(a)); k === 1 ? c.moveTo(...p) : c.lineTo(...p); } stroke(c, rgb(D.ridge, 0.7), 0.8);
      const h = W2(-hw * 0.75, 0);
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(h[0] - Tx * 2, h[1] - Ty * 2); c.quadraticCurveTo(h[0] - Ty * s * hw * 0.8 - Tx * 0.4, h[1] + Tx * s * hw * 0.8 - Ty * 0.4, h[0] - Ty * s * (hw + 1.6) + Tx * hw * 0.6, h[1] + Tx * s * (hw + 1.6) + Ty * hw * 0.6); stroke(c, rgb(S.foam, 0.5), 0.55); }
    }
    // feather the fan's end into the surf
    if (fade) { c.save(); c.globalCompositeOperation = 'destination-out'; const g = c.createLinearGradient(0, fade[0], 0, fade[1]); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(-50, fade[0], 2000, fade[1] - fade[0] + 400); c.restore(); }
    c0.save(); c0.setTransform(1, 0, 0, 1, 0, 0); c0.drawImage(cv, 0, 0); c0.restore();
  }
  // where the creek's fresh water pushes out into the surf: a pale turquoise plume fanning from the mouth (drawn over
  // the sea, under the foam), with flow streaks spreading through it
  function plume(c, P, x, y, rx, ry, seed) {
    const S = P.sea, R = rand(seed), pale = P.name === 'dusk' ? mix(S.surf, P.delta.pale, 0.5) : mix(mix(S.surf, P.water.lit, 0.5), [200, 255, 240], 0.3);
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, -rx * 0.2, 0, 0, -rx * 0.2, rx); g.addColorStop(0, rgb(pale, 0.85)); g.addColorStop(0.55, rgb(pale, 0.5)); g.addColorStop(1, rgb(pale, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
    // a few broken arcs bowing seaward where the fresh water spreads over the salt (no radial streaks)
    c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const rr = rx * (0.35 + k * 0.2), a0 = 0.5 + R() * 0.3, a1 = Math.PI - 0.5 - R() * 0.3, m = (a0 + a1) / 2;
      for (const [s0, s1] of [[a0, m - 0.12 - R() * 0.1], [m + 0.08, a1]]) { c.beginPath(); c.ellipse(x, y - 3, rr, rr * ry / rx, 0, s0, s1); stroke(c, rgb(S.lit, 0.3 - k * 0.06), 0.6); } }
  }
  // where the plume meets the breakers: soft broken foam arcs and lit ripples bowing seaward round the mouth
  // (bulge(x) is the same push the foam line takes)
  function deltaFoam(c, P, coast, mid, bulge) {
    const S = P.sea, R = rand(61); c.lineCap = 'round';
    const near = coast.filter(p => Math.abs(p[0] - mid) < 46);
    for (const [f, a, w] of [[0.35, 0.55, 0.7], [0.7, 0.4, 0.6]]) {
      const line = offset(near, (u, i) => 1 + bulge(near[i][0]) * f); let i = R() * 3 | 0;
      while (i < line.length - 3) { const L = 4 + (R() * 7 | 0); poly(c, line.slice(i, i + L)); stroke(c, rgb(S.lit, a), w); i += L + 2 + (R() * 3 | 0); }
    }
  }
  // dirt roads, all drawn layer by layer together so junctions are one shape: a dark edge, the shaded and lit
  // surface, irregular darker edges, two broken wheel ruts, pebbles, and grass tufts creeping in from the verges.
  // junctions: [[x, y]] where roads meet: the arms are joined by a filled fillet in every layer (no kinks or seams),
  // the verge and rut lines stop short of it, and the grass round it is worn and trampled
  function roads(c, P, list, onGrass = () => true, junctions = []) {
    const R = P.road, G = P.grass; c.lineCap = 'round'; c.lineJoin = 'round';
    const nearJ = (x, y, m = 13) => junctions.some(j => Math.hypot(j[0] - x, j[1] - y) < m);
    const runs = (pts, m) => { const out = []; let cur = []; for (const p of pts) { if (nearJ(p[0], p[1], m)) { if (cur.length > 1) out.push(cur); cur = []; } else cur.push(p); } if (cur.length > 1) out.push(cur); return out; };
    // the fillet at each junction: the arms' first stretch joined pairwise into one filled shape
    const arms = j => { const A = []; for (const pts of list) { const i0 = pts.findIndex(p => Math.hypot(p[0] - j[0], p[1] - j[1]) < 0.5); if (i0 < 0) continue; for (const dir of [1, -1]) { let i = i0, d = 0; while (i + dir >= 0 && i + dir < pts.length && d < 11) { d += Math.hypot(pts[i + dir][0] - pts[i][0], pts[i + dir][1] - pts[i][1]); i += dir; } if (i !== i0) A.push(pts[i]); } } A.sort((p, q) => Math.atan2(p[1] - j[1], p[0] - j[0]) - Math.atan2(q[1] - j[1], q[0] - j[0])); return A; };
    const fillet = (w, cl, dx = 0, dy = 0) => { for (const j of junctions) { const A = arms(j); if (A.length < 2) continue; c.save(); c.translate(dx, dy); poly(c, A); c.closePath(); c.fillStyle = col(cl); c.fill(); stroke(c, cl, w); c.restore(); } };
    for (const j of junctions) { softShadow(c, j[0], j[1] + 2, 26, 15, 0.22, 0, R.shade); }
    for (const pts of list) { poly(c, pts); stroke(c, R.edge, 15.5); }
    fillet(15.5, R.edge);
    for (const pts of list) { c.save(); c.translate(0.9, 1.2); poly(c, pts); stroke(c, R.shade, 13); c.restore(); }
    fillet(13, R.shade, 0.9, 1.2);
    for (const pts of list) { c.save(); c.translate(-0.5, -0.6); poly(c, pts); stroke(c, R.mid, 11.4); c.restore(); }
    fillet(11.4, R.mid, -0.5, -0.6);
    for (const j of junctions) { c.save(); c.beginPath(); c.ellipse(j[0] - 1, j[1] - 1, 6, 4, 0, 0, TAU); c.fillStyle = rgb(R.lit, 0.18); c.fill(); c.restore(); }
    list.forEach((pts, k) => {
      const Rn = rand(131 + k * 17), n = pts.length;
      for (const s of [-1, 1]) {
        const ph = Rn() * 9, e = offset(pts, (u, i) => s * (4.9 + 0.7 * Math.sin(i * 0.37 + ph) + 0.4 * Math.sin(i * 1.13 + ph * 2)));
        for (const r of runs(e, 15)) { poly(c, r); stroke(c, rgb(mix(R.shade, R.edge, 0.25), 0.45), 1.5); }
        let i = 2; while (i < n - 4) { const L = 14 + (Rn() * 20 | 0); for (const r of runs(offset(e.slice(i, i + L), (u) => -s * 0.9 * Math.sin(u * Math.PI)), 15)) { poly(c, r); stroke(c, rgb(mix(R.shade, R.edge, 0.3), 0.3), 1.2); } i += L + 8 + (Rn() * 16 | 0); }
      }
      for (const d of [-2.4, 2.4]) {
        const r = offset(pts, d); let i = 2 + (Rn() * 6 | 0);
        while (i < n - 6) { const L = 12 + (Rn() * 22 | 0), seg = r.slice(i, Math.min(n - 2, i + L)); for (const q of runs(seg, 16)) furrow(c, q, rgb(R.shade, 0.5), rgb(R.lit, 0.55), 0.8, [-0.3, -0.7]); i += L + 5 + (Rn() * 12 | 0); }
      }
      for (let i = 1; i < n - 1; i += 2) {
        if (Rn() > 0.12) continue;
        const [x, y] = offset(pts, (Rn() - 0.5) * 5)[i], r = 0.4 + Rn() * 0.5;
        c.beginPath(); c.ellipse(x, y, r * 1.3, r, Rn() * 3, 0, TAU); c.fillStyle = rgb(R.shade, 0.7); c.fill();
      }
      for (let i = 3; i < n - 3; i += 5) {
        if (Rn() > 0.32) continue;
        const s = Rn() < 0.5 ? -1 : 1, [x, y] = offset(pts, s * 6.4)[i];
        if (onGrass(x, y) && !nearJ(x, y, 12)) tuft(c, P, x, y + 1, 0.42 + Rn() * 0.22);
      }
    });
    // trampled grass round each junction: flattened tufts in the angles between the arms
    for (const j of junctions) { const A = arms(j); for (let q = 0; q < A.length; q++) { const p = A[q], nx = A[(q + 1) % A.length], mx = (p[0] + nx[0]) / 2 - j[0], my = (p[1] + nx[1]) / 2 - j[1], L = Math.hypot(mx, my) || 1, tx = j[0] + mx / L * 14, ty = j[1] + my / L * 11; if (onGrass(tx, ty)) { tuft(c, P, tx, ty, 0.4); c.beginPath(); c.ellipse(tx + 3, ty + 1, 3, 1, 0.3, 0, TAU); c.fillStyle = rgb(G.shade, 0.35); c.fill(); } } }
  }
  function road(c, P, pts, onGrass) { roads(c, P, [pts], onGrass); }
  // where a road runs down through a cut in the berm: the slope shaded across the road, two log steps
  function roadRamp(c, P, pts, yTop, yBot) {
    const R = P.road, B = P.bark, band = [...offset(pts, -6.2), ...offset(pts, 6.2).reverse()];
    c.save(); poly(c, band); c.closePath(); c.clip();
    const g = c.createLinearGradient(0, yTop - 3, 0, yBot + 3); g.addColorStop(0, rgb(R.shade, 0)); g.addColorStop(0.35, rgb(mix(R.shade, P.shadowC, 0.3), 0.55)); g.addColorStop(1, rgb(R.shade, 0));
    c.fillStyle = g; c.fillRect(-50, yTop - 3, 600, yBot - yTop + 6);
    c.restore();
    for (const f of [0.3, 0.72]) {
      const yy = lerp(yTop, yBot, f); let i = 0, best = 1e9; pts.forEach((p, j) => { if (Math.abs(p[1] - yy) < best) { best = Math.abs(p[1] - yy); i = j; } });
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * 6.6, ny = dx / L * 6.6, [x, y] = pts[i];
      c.beginPath(); c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny); stroke(c, B.edge, 2.8);
      c.beginPath(); c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny); stroke(c, B.mid, 1.8);
      c.beginPath(); c.moveTo(x - nx, y - ny - 0.6); c.lineTo(x + nx, y + ny - 0.6); stroke(c, rgb(B.ridge, 0.55), 0.6);
      c.beginPath(); c.moveTo(x - nx * 0.9, y - ny + 1.6); c.lineTo(x + nx * 0.9, y + ny + 1.6); stroke(c, rgb(P.shadowC, 0.25), 1.2);
    }
  }
  // gold trail dots on the travelled roads, dim pebbles on roads not yet walked
  function trail(c, P, pts, done, skip, step = 13) {
    let acc = step * 0.6;
    for (let i = 1; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc < step) continue; acc = 0;
      const [x, y] = pts[i]; if (skip && skip(x, y)) continue;
      if (done) {
        c.beginPath(); c.ellipse(x + 0.8, y + 0.9, 2.5, 1.4, SUN, 0, TAU); c.fillStyle = rgb(COIN.deep, 0.35); c.fill();
        c.beginPath(); c.arc(x, y, 2.3, 0, TAU); c.fillStyle = RG(c, x, y, 2.3, [COIN.lit, COIN.hi, COIN.lo]); c.fill(); stroke(c, rgb(COIN.edge, 0.8), 0.5);
        c.fillStyle = 'rgba(255,255,248,.9)'; c.beginPath(); c.ellipse(x - 0.8, y - 0.9, 0.8, 0.45, -0.7, 0, TAU); c.fill();
      } else {
        // a soft worn dash along the road, the way still to go
        const a = pts[i - 1], tx = x - a[0], ty = y - a[1], L = Math.hypot(tx, ty) || 1, ux = tx / L * 2.4, uy = ty / L * 2.4;
        c.beginPath(); c.moveTo(x - ux, y - uy); c.lineTo(x + ux, y + uy); stroke(c, rgb(P.road.shade, 0.75), 1.6);
        c.beginPath(); c.moveTo(x - ux - 0.3, y - uy + 0.9); c.lineTo(x + ux - 0.3, y + uy + 0.9); stroke(c, rgb(P.road.lit, 0.6), 0.6);
      }
    }
  }
  // a plank bridge laid along the road's own axis: its shadow on the water, contact shadows where it rests on the
  // banks, grained planks with nail heads, log rails
  function bridge(c, P, x, y, ang, len, wid) {
    const Wd = P.wood, B = P.bark, K = P.rock, ca = Math.cos(ang), sa = Math.sin(ang);
    const W2S = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];   // bridge coords (u along, v across) to the map
    // its shadow on the water, down and to the right
    c.save(); c.translate(x + 3.6, y + 5); c.rotate(ang); c.fillStyle = rgb(mix(P.water.deep, P.shadowC, 0.55), 0.6); c.beginPath(); c.roundRect(-len / 2 + 6, -wid / 2 - 1, len - 12, wid + 2, 3); c.fill(); c.restore();
    // piles driven into the creek bed under the deck: each a short round post standing in the water with a ripple
    // ring round its foot and a little foam on its upstream side
    for (const u of [-0.2, 0.2]) for (const v of [-1, 1]) {
      const [px, py] = W2S(u * len, v * (wid / 2 - 0.5)), ph = 4.5;
      c.beginPath(); c.ellipse(px + 0.4, py + ph, 3, 1.1, 0, 0, TAU); stroke(c, rgb(P.water.lit, 0.6), 0.55);
      c.beginPath(); c.ellipse(px, py + ph - 0.2, 1.7, 0.7, 0, 0, TAU); c.fillStyle = rgb(mix(P.water.deep, P.shadowC, 0.4), 0.6); c.fill();
      c.beginPath(); c.roundRect(px - 1.3, py - 1, 2.6, ph + 0.8, 1); c.fillStyle = LG(c, px - 1.3, 0, px + 1.3, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S);
      c.beginPath(); c.moveTo(px - 1.3, py + ph - 0.6); c.quadraticCurveTo(px, py + ph + 0.4, px + 1.3, py + ph - 0.6); stroke(c, rgb(P.sea.foam, 0.8), 0.6);
    }
    // abutments: a footing of squared stones on dry land at each end, wider than the deck, the deck resting on them
    for (const e of [-1, 1]) {
      const stones = [];
      for (const [v, r, sd] of [[-wid / 2 - 1.5, 3.4, 1], [-wid / 6, 3.8, 2], [wid / 6, 3.6, 3], [wid / 2 + 1.5, 3.3, 4]]) stones.push([...W2S(e * (len / 2 - 1.5), v), r, sd]);
      const [fx, fy] = W2S(e * (len / 2 - 1.5), 0); softShadow(c, fx + 2, fy + 2.5, wid * 0.7, wid * 0.32, P.shadowA * 1.3, ang, P.shadowC);
      stones.sort((a, b) => a[1] - b[1]).forEach(([sx, sy, r, sd]) => rock(c, P, sx, sy, r, 600 + sd + (e > 0 ? 10 : 0), false, false, 'block'));
    }
    // the deck's thickness: the side beam facing us shows as a face under the deck edge (the deck stands on its
    // footings above the water, it doesn't lie on it)
    for (const sd of [-1, 1]) if (sd * ca > 0.05) {
      const a = W2S(-len / 2, sd * (wid / 2 + 0.6)), b = W2S(len / 2, sd * (wid / 2 + 0.6)), th = 2.8;
      poly(c, [a, b, [b[0], b[1] + th], [a[0], a[1] + th]]); c.closePath(); c.fillStyle = LG(c, 0, Math.min(a[1], b[1]), 0, Math.max(a[1], b[1]) + th, [Wd.mid, Wd.shade, mix(Wd.shade, Wd.edge, 0.5)]); c.fill(); stroke(c, Wd.edge, EW_S);
      c.beginPath(); c.moveTo(a[0], a[1] + th * 0.5); c.lineTo(b[0], b[1] + th * 0.5); stroke(c, rgb(Wd.edge, 0.4), 0.5);
    }
    c.save(); c.translate(x, y); c.rotate(ang);
    // the two stringers under the deck's edges
    for (const s of [-1, 1]) { const ry = s * (wid / 2 + 0.2); c.beginPath(); c.moveTo(-len / 2, ry); c.lineTo(len / 2, ry); stroke(c, B.edge, 3.4); c.beginPath(); c.moveTo(-len / 2, ry); c.lineTo(len / 2, ry); stroke(c, B.shade, 2.2); }
    const n = 9, pw = len / n;
    for (let k = 0; k < n; k++) {
      const px = -len / 2 + k * pw, j = Math.sin(k * 2.3) * 0.8;
      c.beginPath(); c.roundRect(px + 0.15, -wid / 2 + 0.6 + j * 0.4, pw - 0.3, wid - 1.2 - j * 0.2, 0.8);
      c.fillStyle = LG(c, px, -wid / 2, px + pw, wid / 2, [Wd.lit, Wd.mid, Wd.shade]); c.fill(); stroke(c, Wd.edge, EW_S);
      furrow(c, [[px + pw * 0.5, -wid / 2 + 3], [px + pw * 0.42, -1], [px + pw * 0.55, wid / 2 - 3]], rgb(Wd.edge, 0.45), rgb(B.ridge, 0.35), DET, [-0.9, 0]);
      for (const s of [-1, 1]) { const ny = s * (wid / 2 - 2.4); c.beginPath(); c.arc(px + pw * 0.5, ny, 0.65, 0, TAU); c.fillStyle = rgb(mix(Wd.edge, [40, 40, 50], 0.4)); c.fill(); c.beginPath(); c.arc(px + pw * 0.5 - 0.25, ny - 0.25, 0.25, 0, TAU); c.fillStyle = 'rgba(255,255,240,.7)'; c.fill(); }
    }
    c.restore();
    // hand rails: posts standing up at the ends and the middle of each side, a rope slung between their tops
    const ph = 7;
    const sides = [-1, 1].map(s => [-0.5, 0, 0.5].map(t => W2S(t * (len - 4), s * (wid / 2 + 0.6))));
    sides.sort((a, b) => a[1][1] - b[1][1]);   // the far rail first
    for (const posts of sides) {
      const rope = () => { c.beginPath(); c.moveTo(posts[0][0], posts[0][1] - ph + 1); for (let k = 1; k < posts.length; k++) { const a = posts[k - 1], b = posts[k]; c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - ph + 4, b[0], b[1] - ph + 1); } };
      for (const [px, py] of posts) {
        softShadow(c, px + 1.2, py + 0.6, 2.4, 1, P.shadowA * 1.3, 0, P.shadowC);
        c.beginPath(); c.roundRect(px - 1.2, py - ph, 2.4, ph + 0.5, 0.8); c.fillStyle = LG(c, px - 1.2, 0, px + 1.2, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S);
        c.beginPath(); c.ellipse(px, py - ph, 1.2, 0.5, 0, 0, TAU); c.fillStyle = rgb(mix(B.lit, B.ridge, 0.3)); c.fill();
      }
      rope(); stroke(c, mix(P.straw.edge, B.edge, 0.3), 1.5); rope(); stroke(c, P.straw.mid, 0.8);
      c.save(); c.translate(-0.3, -0.4); rope(); stroke(c, rgb(P.straw.lit, 0.6), 0.35); c.restore();
      for (const [px, py] of posts) { c.beginPath(); c.arc(px, py - ph + 1, 0.9, 0, TAU); c.fillStyle = rgb(P.straw.shade); c.fill(); }
    }
  }


  // ---------------- small props ----------------
  // a rock in one of several builds, so no two groups look stamped: 'round' (a weathered boulder), 'flat' (a low
  // slab with a lit top face), 'tall' (an upright stone split by a crack), 'block' (an angular chunk with strata);
  // kind defaults to one picked by the seed. moss: a cap of moss over its top with a scalloped edge and drips
  function rock(c, P, x, y, r, seed, moss, shadow = true, kind = null) {
    const K = P.rock, R = rand(seed), pts = [];
    kind = kind || ['round', 'flat', 'tall', 'round', 'flat', 'block'][seed % 6];
    const sx = kind === 'flat' ? 1.3 : kind === 'tall' ? 0.78 : 1, sy = kind === 'flat' ? 0.46 : kind === 'tall' ? 1.02 : kind === 'block' ? 0.8 : 0.72;
    const nP = kind === 'block' ? 7 : 9, jit = kind === 'block' ? 0.12 : 0.3;
    for (let i = 0; i < nP; i++) { const a = i / nP * TAU + R() * (kind === 'block' ? 0.4 : 1), k = 0.84 + jit * R(); pts.push([x + Math.cos(a) * r * k * sx, y + Math.sin(a) * r * sy * k - (kind === 'tall' ? r * 0.25 : 0)]); }
    const shape = () => { if (kind === 'block') { const m = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; c.beginPath(); for (let i = 0; i < nP; i++) { const a = pts[i], b = pts[(i + 1) % nP], p0 = m(a, b, 0.18), p1 = m(a, b, 0.82); i ? c.lineTo(...p0) : c.moveTo(...p0); c.lineTo(...p1); c.quadraticCurveTo(b[0], b[1], ...m(b, pts[(i + 2) % nP], 0.18)); } c.closePath(); } else closedSmooth(c, pts); };
    const top = Math.min(...pts.map(p => p[1])), bot = Math.max(...pts.map(p => p[1])), hh = bot - top, wd = r * sx;
    if (shadow) castShadow(c, P, x, bot - r * 0.12, hh * 1.4, wd * 1.7);
    shape(); c.fillStyle = LG(c, x - wd * 0.5, top, x + wd * 0.4, bot, [K.lit, K.mid, K.shade]); c.fill();
    c.save(); shape(); c.clip();
    c.fillStyle = LG(c, 0, lerp(top, bot, 0.45), 0, bot, ['rgba(30,24,20,0)', 'rgba(30,24,20,.35)']); c.fillRect(x - wd * 1.5, top, wd * 3, hh + 2);
    if (kind === 'flat' || kind === 'block') {   // the lit top face and the edge where it turns down
      const fy = lerp(top, bot, kind === 'flat' ? 0.45 : 0.38);
      c.beginPath(); c.ellipse(x - wd * 0.05, lerp(top, fy, 0.5), wd * 0.95, (fy - top) * 0.62, 0, 0, TAU); c.fillStyle = rgb(mix(K.lit, [255, 255, 240], 0.2), 0.55); c.fill();
      furrow(c, [[x - wd, fy + 0.4], [x - wd * 0.2, fy + 0.9], [x + wd, fy]], rgb(K.edge, 0.5), rgb([255, 255, 240], 0.35), Math.max(0.55, r * 0.08), [0, -0.8]);
    }
    if (kind === 'round' || kind === 'block') for (let k = 0; k < 2; k++) { const yy = lerp(top, bot, 0.48 + k * 0.2); furrow(c, [[x - wd, yy + r * 0.08], [x - wd * 0.2, yy - r * 0.06], [x + wd, yy + r * 0.12]], rgb(K.edge, 0.45), rgb([255, 255, 240], 0.26), Math.max(0.55, r * 0.08), [0, -0.9]); }
    if (kind === 'tall') furrow(c, [[x + wd * 0.1, top + hh * 0.08], [x - wd * 0.12, top + hh * 0.45], [x + wd * 0.08, top + hh * 0.7], [x - wd * 0.05, bot]], rgb(K.edge, 0.55), rgb([255, 255, 240], 0.3), Math.max(0.55, r * 0.08), [-0.8, 0]);
    if (moss) {   // a moss cap: scalloped lower edge, lit top, a few drips
      const mY = lerp(top, bot, kind === 'flat' ? 0.5 : 0.36), nS = 5;
      c.beginPath(); c.moveTo(x - wd * 1.3, top - 2); c.lineTo(x + wd * 1.3, top - 2); c.lineTo(x + wd * 1.3, mY - r * 0.1);
      for (let k = nS; k >= 0; k--) { const xx = lerp(x - wd * 1.2, x + wd * 1.2, k / nS); c.quadraticCurveTo(xx + wd * 1.2 / nS, mY + r * (0.12 + R() * 0.14), xx, mY - r * 0.05 + (k % 2) * r * 0.08); }
      c.closePath(); c.fillStyle = LG(c, x - wd, top, x + wd * 0.5, mY + 2, [mix(P.leaf.lit, P.grass.patch, 0.3), P.leaf.mid, mix(P.leaf.mid, P.leaf.shade, 0.5)]); c.fill(); stroke(c, rgb(P.leaf.edge, 0.5), 0.5);
      for (let k = 0; k < 2; k++) { const dx = x + (R() - 0.5) * wd * 1.2; c.beginPath(); c.moveTo(dx, mY); c.quadraticCurveTo(dx + 0.4, mY + r * 0.15, dx, mY + r * (0.2 + R() * 0.2)); stroke(c, P.leaf.mid, Math.max(0.6, r * 0.1)); }
    }
    c.restore();
    shape(); stroke(c, K.edge, r > 6 ? EW : EW_S);
    c.beginPath(); c.ellipse(x - wd * 0.12, top + hh * 0.3, wd * 0.55, hh * 0.22, 0, 3.6, 5.0); stroke(c, `rgba(255,255,240,${moss ? 0.25 : 0.42})`, Math.min(1.2, Math.max(0.6, r * 0.1)));
  }
  // beach finds, all kept low in contrast so the road still reads first
  // a shell: kind 0 a ribbed scallop fan, kind 1 a spiral cone
  function shell(c, P, x, y, r, rot, kind) {
    const D = P.sand, pk = mix([250, 214, 196], D.lit, 0.35), dk = mix([196, 126, 116], D.dark, 0.4);
    softShadow(c, x + r * 0.5, y + r * 0.35, r * 1.1, r * 0.45, P.shadowA * 0.8, SUN, P.shadowC);
    c.save(); c.translate(x, y); c.rotate(rot);
    if (kind === 0) {
      c.beginPath(); c.moveTo(0, r * 0.55); c.arc(0, r * 0.55, r, Math.PI * 1.17, Math.PI * 1.83); c.closePath();
      c.fillStyle = LG(c, 0, -r * 0.45, 0, r * 0.55, [[255, 246, 236], pk, dk]); c.fill(); stroke(c, rgb(dk, 0.9), 0.5);
      for (let k = 1; k < 5; k++) { const a = Math.PI * (1.17 + 0.66 * k / 5); c.beginPath(); c.moveTo(0, r * 0.5); c.lineTo(Math.cos(a) * r * 0.95, r * 0.55 + Math.sin(a) * r * 0.95); stroke(c, rgb(dk, 0.6), 0.4); }
    } else {
      c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); c.fillStyle = LG(c, -r, -r * 0.5, r, r * 0.5, [[255, 246, 236], pk, dk]); c.fill(); stroke(c, rgb(dk, 0.9), 0.5);
      c.beginPath(); for (let k = 0; k <= 20; k++) { const t = k / 20 * TAU * 1.5, rr = r * 0.7 * (1 - k / 24); c.lineTo(-r * 0.25 + Math.cos(t) * rr * 0.6, Math.sin(t) * rr * 0.35); } stroke(c, rgb(dk, 0.6), 0.4);
    }
    c.restore();
  }
  // a bleached driftwood log with a broken stub, grain along it
  function driftwood(c, P, x, y, len, ang, seed) {
    const Wd = P.wood, R = rand(seed), pale = mix(Wd.lit, P.sand.ridge, 0.55), mid = mix(Wd.mid, P.sand.shade, 0.5), edge = mix(Wd.edge, P.sand.edge, 0.5);
    softShadow(c, x + 3, y + 2, len * 0.55, 3, P.shadowA * 0.9, SUN * 0.4 + ang * 0.5, P.shadowC);
    c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = 'round';
    const body = () => { c.beginPath(); c.moveTo(-len / 2, 0.4); c.quadraticCurveTo(0, -1.2, len / 2, 0); };
    body(); stroke(c, edge, 4.4); body(); stroke(c, mid, 3.2);
    c.save(); c.translate(-0.3, -0.7); body(); stroke(c, pale, 1.6); c.restore();
    for (let k = 0; k < 3; k++) { const s = -len * 0.35 + k * len * 0.28 + R() * 3; c.beginPath(); c.moveTo(s, 0.2); c.lineTo(s + 5 + R() * 4, 0); stroke(c, rgb(edge, 0.55), 0.45); }
    c.beginPath(); c.moveTo(len * 0.15, -0.6); c.lineTo(len * 0.25, -4.5); stroke(c, edge, 2.2); c.beginPath(); c.moveTo(len * 0.15, -0.6); c.lineTo(len * 0.25, -4.5); stroke(c, pale, 1);
    c.beginPath(); c.ellipse(len / 2, 0, 1.2, 1.9, 0, 0, TAU); c.fillStyle = rgb(mix(pale, mid, 0.4)); c.fill(); stroke(c, edge, 0.5);
    c.restore();
  }
  // a fallen jungle log lying in the grass (a landmark for open lawn): a long bark cylinder seen from above and a
  // little in front, lit along its top, grain furrows, a broken branch stub, a sawn-looking end with growth rings at
  // the near end, moss cushions and a fungus shelf, grass tufts against its flanks and its shadow down-right
  function fallenLog(c, P, x, y, len, ang, r, seed) {
    const B = P.bark, Lf = P.leaf, G = P.grass, R = rand(seed), sun = P.sun ?? SUN;
    softShadow(c, x + 3 + Math.cos(sun) * 3, y + r * 0.9, len * 0.55, r * 0.9, P.shadowA * 1.2, ang + sun * 0.3, P.shadowC);
    c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = 'round'; c.lineJoin = 'round';
    const L2 = len / 2;
    const body = () => { c.beginPath(); c.moveTo(-L2, -r); c.bezierCurveTo(-L2 * 0.3, -r * 1.08, L2 * 0.4, -r * 0.92, L2, -r * 0.85); c.lineTo(L2, r * 0.85); c.bezierCurveTo(L2 * 0.4, r * 0.95, -L2 * 0.3, r * 1.05, -L2, r); c.closePath(); };
    body(); c.fillStyle = LG(c, 0, -r, 0, r, [B.lit, B.mid, B.shade, mix(B.shade, B.edge, 0.4)]); c.fill();
    c.save(); body(); c.clip();
    for (const [f, a] of [[-0.55, 0.5], [-0.15, 0.45], [0.3, 0.5], [0.65, 0.4]]) { const pts = []; for (let k = 0; k <= 12; k++) { const u = -L2 + k / 12 * len; pts.push([u, f * r + 0.5 * Math.sin(k * 1.3 + f * 7)]); } furrow(c, pts, rgb(B.edge, a), f < 0 ? rgb(B.ridge, 0.4) : null, 0.6, [0, -0.8]); }
    for (let k = 0; k < 3; k++) { const u = -L2 * 0.6 + k * L2 * 0.5 + R() * 4; c.beginPath(); c.moveTo(u, -r * 0.2); c.lineTo(u + 1.2, r * 0.3); stroke(c, rgb(B.edge, 0.5), 0.6); }
    // moss cushions along the top
    for (let k = 0; k < 4; k++) { const u = -L2 * 0.7 + k * L2 * 0.42 + R() * 3, w = 3 + R() * 3; c.beginPath(); c.ellipse(u, -r * 0.62, w, r * 0.38, 0, 0, TAU); c.fillStyle = LG(c, 0, -r, 0, -r * 0.3, [mix(Lf.lit, G.patch, 0.3), Lf.mid]); c.fill(); stroke(c, rgb(Lf.edge, 0.6), 0.5); c.beginPath(); c.ellipse(u - w * 0.2, -r * 0.8, w * 0.55, r * 0.12, 0, 0, TAU); c.fillStyle = rgb(Lf.sheen, 0.4); c.fill(); }
    c.restore();
    body(); stroke(c, B.edge, EW);
    // the near end: end grain with rings and a dark heart crack
    c.beginPath(); c.ellipse(-L2, 0, r * 0.55, r, 0, 0, TAU); c.fillStyle = RG(c, -L2, 0, r, [mix(B.lit, B.ridge, 0.4), B.lit, B.mid]); c.fill(); stroke(c, B.edge, EW_S);
    for (const k of [0.35, 0.65]) { c.beginPath(); c.ellipse(-L2 + 0.2, 0, r * 0.55 * k, r * k, 0, 0, TAU); stroke(c, rgb(B.edge, 0.45), 0.45); }
    c.beginPath(); c.moveTo(-L2, -r * 0.1); c.lineTo(-L2 + r * 0.25, -r * 0.6); stroke(c, rgb(B.edge, 0.6), 0.6);
    // a broken branch stub, and a fungus shelf on the flank
    c.beginPath(); c.moveTo(L2 * 0.25, -r * 0.6); c.lineTo(L2 * 0.38, -r * 1.9); stroke(c, B.edge, 3); c.beginPath(); c.moveTo(L2 * 0.25, -r * 0.6); c.lineTo(L2 * 0.38, -r * 1.9); stroke(c, B.mid, 1.8);
    c.beginPath(); c.ellipse(L2 * 0.38, -r * 1.9, 1.1, 0.6, 0.3, 0, TAU); c.fillStyle = rgb(mix(B.lit, B.ridge, 0.4)); c.fill();
    c.beginPath(); c.moveTo(-L2 * 0.2, r * 0.5); c.quadraticCurveTo(-L2 * 0.12, r * 1.25, -L2 * 0.02, r * 0.55); c.closePath(); c.fillStyle = LG(c, 0, r * 0.5, 0, r * 1.2, [[244, 214, 160], [196, 150, 96]]); c.fill(); stroke(c, mix(B.edge, [120, 80, 40], 0.4), 0.5);
    c.restore();
    for (const [u, sd] of [[-0.3, 1], [0.15, 2], [0.42, 3]]) tuft(c, P, x + Math.cos(ang) * u * len - Math.sin(ang) * r * 1.1, y + Math.sin(ang) * u * len + Math.cos(ang) * r * 1.1 + 0.8, 0.8 + sd * 0.1);
  }
  // a dugout canoe pulled up on the sand, a paddle laid beside it
  function canoe(c, P, x, y, len, ang) {
    const Wd = P.wood, B = P.bark;
    softShadow(c, x + 4, y + 3, len * 0.55, len * 0.12, P.shadowA * 1.1, SUN * 0.3 + ang, P.shadowC);
    c.save(); c.translate(x, y); c.rotate(ang);
    const w = len * 0.13, hull = () => { c.beginPath(); c.moveTo(-len / 2, 0); c.quadraticCurveTo(-len * 0.3, -w, 0, -w); c.quadraticCurveTo(len * 0.3, -w, len / 2, 0); c.quadraticCurveTo(len * 0.3, w * 1.1, 0, w * 1.1); c.quadraticCurveTo(-len * 0.3, w * 1.1, -len / 2, 0); c.closePath(); };
    hull(); c.fillStyle = LG(c, 0, -w, 0, w * 1.1, [Wd.lit, Wd.mid, Wd.shade]); c.fill(); stroke(c, Wd.edge, EW_S);
    c.beginPath(); c.ellipse(0, -w * 0.12, len * 0.4, w * 0.62, 0, 0, TAU); c.fillStyle = LG(c, 0, -w * 0.7, 0, w * 0.5, [mix(Wd.shade, Wd.edge, 0.5), Wd.shade, Wd.mid]); c.fill(); stroke(c, rgb(Wd.edge, 0.8), 0.6);
    c.beginPath(); c.ellipse(0, -w * 0.12, len * 0.4, w * 0.62, 0, 0.3, 2.8); stroke(c, rgb(B.ridge, 0.55), 0.6);
    for (const s of [-0.18, 0.2]) { c.beginPath(); c.moveTo(len * s, -w * 0.72); c.lineTo(len * s, w * 0.48); stroke(c, Wd.edge, 1.8); c.beginPath(); c.moveTo(len * s - 0.3, -w * 0.72); c.lineTo(len * s - 0.3, w * 0.48); stroke(c, Wd.lit, 0.7); }
    furrow(c, [[-len * 0.42, w * 0.55], [0, w * 0.82], [len * 0.42, w * 0.55]], rgb(Wd.edge, 0.4), rgb(B.ridge, 0.4), 0.6, [0, -0.8]);
    c.beginPath(); c.moveTo(-len * 0.45, -w * 0.2); c.quadraticCurveTo(-len * 0.3, -w * 0.85, 0, -w * 0.88); stroke(c, rgb([255, 245, 220], 0.55), 0.7);
    // paddle
    c.translate(-len * 0.02, -w * 0.15); c.rotate(-0.06);
    softShadow(c, 1, 1.4, len * 0.3, 1.4, 0.35, 0, P.shadowC);
    c.beginPath(); c.moveTo(-len * 0.3, 0); c.lineTo(len * 0.12, 0); stroke(c, Wd.edge, 1.8); c.beginPath(); c.moveTo(-len * 0.3, 0); c.lineTo(len * 0.12, 0); stroke(c, Wd.lit, 0.8);
    c.beginPath(); c.ellipse(len * 0.2, 0, len * 0.09, w * 0.4, 0, 0, TAU); c.fillStyle = LG(c, 0, -w * 0.4, 0, w * 0.4, [Wd.lit, Wd.mid]); c.fill(); stroke(c, Wd.edge, 0.6);
    c.restore();
  }
  // little prints pressed into the sand: footprints (alternating left/right) or a crab's dotted track
  function prints(c, P, pts, step, crab, seed, k2 = 1) {
    const D = P.sand, R = rand(seed); let acc = 0, k = 0;
    for (let i = 1; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc < step) continue; acc = 0; k++;
      const a = pts[i - 1], b = pts[i], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = k % 2 ? 1 : -1, nx = -Math.sin(ang), ny = Math.cos(ang);
      if (crab) { for (const d of [-1.6, 1.6]) { c.beginPath(); c.arc(b[0] + nx * d + (R() - 0.5), b[1] + ny * d, 0.45, 0, TAU); c.fillStyle = rgb(D.dark, 0.35); c.fill(); } continue; }
      const x = b[0] + nx * s * 1.8, y = b[1] + ny * s * 1.8;
      c.save(); c.translate(x, y); c.rotate(ang + Math.PI / 2);
      c.beginPath(); c.ellipse(0, 0.6, 1, 1.9, 0, 0, TAU); c.fillStyle = rgb(D.dark, 0.28 * k2); c.fill();
      c.beginPath(); c.ellipse(0, 0.6, 1, 1.9, 0, 0.2, 2.9); stroke(c, rgb(D.ridge, Math.min(0.9, 0.5 * k2)), 0.4);
      c.beginPath(); c.arc(0, -2.1, 0.55, 0, TAU); c.fillStyle = rgb(D.dark, 0.25 * k2); c.fill();
      c.restore();
    }
  }

  // ---------------- leaves, vines and trees (side-on 3/4 view) ----------------
  // a leaf like the thorn spike's root leaves: two curves, a gradient across it, a darker edge, a strong midrib with a
  // lit line beside it
  function leaf(c, P, x, y, a, sz, tone = 0) {
    const L = P.leaf;
    c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sz * 0.45, -sz * 0.46, sz, 0); c.quadraticCurveTo(sz * 0.45, sz * 0.46, 0, 0); c.closePath();
    c.fillStyle = LG(c, 0, -sz * 0.42, 0, sz * 0.42, [mix(L.lit, L.mid, tone), mix(L.mid, L.shade, 0.25 + tone)]); c.fill();
    stroke(c, L.edge, sz > 7 ? EW_S : 0.6);
    c.beginPath(); c.moveTo(sz * 0.06, 0); c.quadraticCurveTo(sz * 0.5, 0.25, sz * 0.88, 0); stroke(c, rgb(L.vein, 0.85), sz > 7 ? 0.75 : 0.55);
    c.beginPath(); c.moveTo(sz * 0.12, -0.55); c.quadraticCurveTo(sz * 0.5, -0.4, sz * 0.8, -0.5); stroke(c, rgb(L.sheen, Math.max(0, 0.6 - tone * 0.5)), 0.5);
    c.restore();
  }
  // a vine like the ones wound round the thorn spike: a twisting stem, a lit line on it, small leaves on alternate sides
  function vine(c, P, pts, every = 5, size = 4.5, seed = 1) {
    const L = P.leaf, R = rand(seed); c.lineCap = 'round';
    poly(c, pts); stroke(c, L.edge, 1.5); poly(c, pts); stroke(c, mix(L.mid, L.lit, 0.3), 0.8);
    for (let i = 2; i < pts.length - 1; i += every) { const a = pts[i - 1], b = pts[i + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (i / every % 2 ? 1 : -1) * (0.9 + R() * 0.5); leaf(c, P, pts[i][0], pts[i][1], ang, size * (0.8 + 0.4 * R()), 0.05 + R() * 0.15); }
  }
  // a liana hanging in a loop between two points of a crown
  function liana(c, P, x0, y0, x1, y1, sag, seed) {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([lerp(x0, x1, t), lerp(y0, y1, t) + Math.sin(t * Math.PI) * sag]); }
    vine(c, P, pts, 4, 4, seed);
  }
  // a leaf-cluster outline: pointed leaf tips (each an asymmetric leaf curve: a full back, a concave front, a sharp
  // tip) between notches, so the silhouette reads as many leaves, not a bumpy blob. Returns a path(dx, dy) replayer.
  function leafBlob(c, x, y, r, sy, n, R, jag = 0.15, a0 = 0) {
    const tips = [];
    for (let i = 0; i < n; i++) tips.push([a0 + (i + (R() - 0.5) * 0.4) / n * TAU, 1 + (R() - 0.5) * jag * 1.2]);
    const at = (a, k) => [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * sy];
    const segs = [];
    for (let i = 0; i < n; i++) {
      const [ta, tk] = tips[i], [pa] = tips[(i + n - 1) % n], [na] = tips[(i + 1) % n];
      const pA = i === 0 ? pa - TAU : pa, nA = i === n - 1 ? na + TAU : na, n0 = (pA + ta) / 2, n1 = (ta + nA) / 2, rn = 1 - jag;
      segs.push({ s: at(n0, rn), c1: at(lerp(n0, ta, 0.25), tk * 1.02), t: at(ta, tk * (1 + jag * 0.3)), c2: at(lerp(ta, n1, 0.6), lerp(rn, tk, 0.72)), e: at(n1, rn) });
    }
    return (dx = 0, dy = 0) => {
      c.beginPath(); c.moveTo(segs[0].s[0] + dx, segs[0].s[1] + dy);
      for (const g of segs) { c.lineTo(g.s[0] + dx, g.s[1] + dy); c.quadraticCurveTo(g.c1[0] + dx, g.c1[1] + dy, g.t[0] + dx, g.t[1] + dy); c.quadraticCurveTo(g.c2[0] + dx, g.c2[1] + dy, g.e[0] + dx, g.e[1] + dy); }
      c.closePath();
    };
  }
  // one drawn leaf of a canopy spray, from its base (bx, by) out to its tip: a pointed blade split crisply along the
  // midrib into a lit half (the half facing the sun) and a shaded half, an edge in the leaves' own dark green, a
  // vein-coloured midrib with a lit line beside it; rim: an orange/lime rim on its outer edge (outer silhouette only)
  function canopyLeaf(c, P, bx, by, tx, ty, wk, t, rim = 0) {
    const L = P.leaf, dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = len * wk;
    const T = clamp(t, -0.3, 0.9), lit = T < 0 ? mix(L.lit, L.rim, -T * 0.5) : mix(L.lit, L.shade, T * 0.85), mid = T < 0 ? mix(L.mid, L.lit, -T * 0.6) : mix(L.mid, L.shade, T * 0.8), dk = mix(mid, L.deep, 0.35 + Math.max(0, T) * 0.3);
    // which side of the midrib faces the light (up-left)
    const s = (nx * -0.6 + ny * -0.8) > 0 ? 1 : -1;
    const P1 = (f, o) => [bx + dx * f + nx * o, by + dy * f + ny * o];
    const half = (sd) => { const a = P1(0.42, sd * w * 1.05), b = P1(0.8, sd * w * 0.6); c.beginPath(); c.moveTo(bx, by); c.bezierCurveTo(...P1(0.12, sd * w * 0.7), a[0] - dx * 0.12, a[1] - dy * 0.12, ...a); c.quadraticCurveTo(b[0], b[1], tx, ty); c.lineTo(bx, by); c.closePath(); };
    half(s); c.fillStyle = rgb(lit); c.fill();
    half(-s); c.fillStyle = rgb(dk); c.fill();
    c.beginPath(); const a1 = P1(0.42, w * 1.05), b1 = P1(0.8, w * 0.6), a2 = P1(0.42, -w * 1.05), b2 = P1(0.8, -w * 0.6);
    c.moveTo(bx, by); c.bezierCurveTo(...P1(0.12, w * 0.7), a1[0] - dx * 0.12, a1[1] - dy * 0.12, ...a1); c.quadraticCurveTo(b1[0], b1[1], tx, ty); c.quadraticCurveTo(b2[0], b2[1], ...a2); c.bezierCurveTo(a2[0] - dx * 0.12, a2[1] - dy * 0.12, ...P1(0.12, -w * 0.7), bx, by);
    stroke(c, rgb(L.edge, 0.85), len > 7 ? 0.6 : 0.45);
    c.beginPath(); c.moveTo(...P1(0.08, 0)); c.quadraticCurveTo(...P1(0.5, -s * w * 0.08), ...P1(0.86, 0)); stroke(c, rgb(L.vein, 0.75), len > 7 ? 0.5 : 0.38);
    if (T < 0.45) { c.beginPath(); c.moveTo(...P1(0.18, s * w * 0.32)); c.quadraticCurveTo(...P1(0.45, s * w * 0.5), ...P1(0.7, s * w * 0.3)); stroke(c, rgb(L.sheen, (0.45 - T) * 0.9), 0.45); }
    if (rim > 0) { c.beginPath(); c.moveTo(...P1(0.35, s * w * 0.95)); c.quadraticCurveTo(...P1(0.75, s * w * 0.62), tx, ty); stroke(c, rgb(L.rim, rim), 0.8); }
  }
  // a canopy lobe drawn as real leaves, like the game's vine leaves: a dark under-mass (only seen in the gaps), then
  // sprays of pointed leaves radiating from cluster hearts, stacked from the shaded bottom-right to the lit top-left.
  // Each spray first lays its own shadow on what is under it (the same leaves, offset down-right, in deep green), and
  // every leaf takes a crisp lit/shaded split along its midrib; the tone steps per leaf (lower right of the lobe and
  // leaves pointing away from the sun darker), so the light/shadow split is drawn, not airbrushed. kind 'leafy' has
  // big leaves, 'clump' small ones; sy squashes it into a flat pad
  function lobe(c, P, x, y, r, k, R, kind = 'leafy', sy = 0.92) {
    const L = P.leaf, leafy = kind === 'leafy', B = P.bark, rd = P.rimDir || [-0.75, -0.66], rimOn = P.name === 'dusk';
    // the under-mass: a ragged dark shape a little inside the leaves' reach
    const sil = leafBlob(c, x, y + r * 0.04, r * 0.84, sy, Math.max(9, Math.round(r / 2)), R, 0.16, R());
    sil(); c.fillStyle = LG(c, x - r, y - r * sy, x + r, y + r * sy, [mix(L.shade, L.mid, 0.25), L.shade, L.deep]); c.fill();
    c.save(); sil(); c.clip();
    if (r > 11) {
      const gx = x + (R() - 0.3) * r * 0.7, gy = y + (0.25 + R() * 0.3) * r * sy, gr = r * 0.16, a = (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.4);
      leafBlob(c, gx, gy, gr, 0.8, 7, R, 0.2)(); c.fillStyle = rgb(mix(L.deep, [10, 24, 22], 0.4)); c.fill();
      c.lineCap = 'round'; c.beginPath(); c.moveTo(gx - Math.cos(a) * gr * 1.4, gy + gr * 0.9); c.quadraticCurveTo(gx, gy + 0.6, gx + Math.cos(a) * gr * 1.3, gy - gr * 0.7); stroke(c, B.edge, 1.9); c.stroke(); stroke(c, B.shade, 1);
    }
    c.restore();
    // cluster hearts: a ring round the edge (these make the silhouette) and a few inside, then a big one at the lit top-left
    const cl = [], ringN = Math.max(4, Math.round(r / (leafy ? 6.5 : 5.5))), a0 = R() * TAU;
    for (let j = 0; j < ringN; j++) { const a = a0 + (j + (R() - 0.5) * 0.5) / ringN * TAU, d = r * (0.52 + R() * 0.1); cl.push({ cx: x + Math.cos(a) * d, cy: y + Math.sin(a) * d * sy, cr: r * (0.4 + R() * 0.1) }); }
    for (let j = 0; j < 2 + (r > 16 ? 1 : 0); j++) { const a = R() * TAU, d = R() * r * 0.3; cl.push({ cx: x + Math.cos(a) * d, cy: y + Math.sin(a) * d * sy, cr: r * (0.42 + R() * 0.1) }); }
    cl.push({ cx: x - r * 0.2, cy: y - r * 0.28 * sy, cr: r * 0.44 });
    for (const o of cl) o.f = clamp(((o.cy - y) / (r * sy)) * 0.7 + ((o.cx - x) / r) * 0.35, -0.7, 0.7);
    cl.sort((p, q) => q.f - p.f);
    const size = leafy ? clamp(r * 0.5, 6.5, 13) : clamp(r * 0.42, 5, 8.5), wk = leafy ? 0.32 : 0.3;
    for (const o of cl) {
      const n = Math.max(5, Math.round(TAU * o.cr / (size * 0.85))), aa = R() * TAU, leaves = [];
      for (let i = 0; i < n; i++) { const a = aa + (i + (R() - 0.5) * 0.6) / n * TAU; leaves.push({ a, len: size * (0.85 + R() * 0.35), d: o.cr - size * (0.75 + R() * 0.2) }); }
      for (let i = 0; i < Math.round(n * 0.35); i++) { const a = R() * TAU; leaves.push({ a, len: size * (0.7 + R() * 0.25), d: o.cr * 0.15 + R() * o.cr * 0.2, inner: true }); }
      // the outer leaves pointing down go in first, the short heart leaves last
      leaves.sort((p, q) => (p.inner ? 1 : 0) - (q.inner ? 1 : 0) || Math.sin(q.a) - Math.sin(p.a));
      const pos = lf => { const ca = Math.cos(lf.a), sa = Math.sin(lf.a), d = Math.max(0, lf.d); return [o.cx + ca * d, o.cy + sa * d * sy, o.cx + ca * (d + lf.len), o.cy + sa * (d + lf.len) * sy * 0.92]; };
      // the spray's shadow on what is under it
      c.fillStyle = rgb(L.deep, 0.42);
      for (const lf of leaves) if (!lf.inner) { const [bx, by, tx, ty] = pos(lf), dx = tx - bx, dy = ty - by, ln = Math.hypot(dx, dy) || 1, w = ln * wk * 1.1; c.beginPath(); c.moveTo(bx + 0.9, by + 2); c.quadraticCurveTo(bx + dx * 0.45 - dy / ln * w + 0.9, by + dy * 0.45 + dx / ln * w + 2, tx + 0.9, ty + 2); c.quadraticCurveTo(bx + dx * 0.45 + dy / ln * w + 0.9, by + dy * 0.45 - dx / ln * w + 2, bx + 0.9, by + 2); c.fill(); }
      for (const lf of leaves) {
        const [bx, by, tx, ty] = pos(lf), ca = Math.cos(lf.a), sa = Math.sin(lf.a);
        const away = ca * 0.6 + sa * 0.8;   // > 0 when the leaf points away from the sun
        const t = k + o.f * 0.75 + away * 0.16 - 0.08 + (lf.inner ? -0.04 : 0) + (R() - 0.5) * 0.06;
        // rim on the outer silhouette's sun side only: the leaf must point toward the sun and reach the lobe's edge
        const reach = Math.hypot((tx - x) / r, (ty - y) / (r * sy)), facing = ca * rd[0] + sa * rd[1];
        const rim = rimOn && !lf.inner && reach > 0.9 && facing > 0.55 ? P.rimA * 0.75 * (1 - Math.min(1, k * 2.5)) * (facing - 0.55) / 0.45 : 0;
        canopyLeaf(c, P, bx, by, tx, ty, wk, t, rim);
      }
    }
  }
  // a trunk standing on the ground: tapered, with a flared root foot and roots gripping the ground (like the thorn
  // spike's buttress), bark gradient lit on the left, bark grain as wavy furrows with lit ridges, cracks, a knot; opt:
  // { vine, moss, pale, roots }
  function trunk(c, P, x, y, h, w0, w1, lean, seed, opt = {}) {
    const B0 = P.bark, R = rand(seed);
    const B = opt.pale ? { lit: mix(B0.lit, P.rock.lit, 0.5), mid: mix(B0.mid, P.rock.mid, 0.5), shade: mix(B0.shade, P.rock.shade, 0.5), edge: mix(B0.edge, P.rock.edge, 0.4), ridge: B0.ridge } : B0;
    const top = [x + lean, y - h];
    const at = t => [lerp(x, top[0], t) + Math.sin(t * Math.PI) * lean * 0.3, lerp(y, top[1], t)];
    const wAt = t => lerp(w0, w1, t) + Math.max(0, 0.18 - t) * w0 * 3.2;
    const L = [], Rr = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, [px, py] = at(t), w = wAt(t); L.push([px - w, py]); Rr.push([px + w, py]); }
    const roots = opt.roots || [[-1, 2.7], [1, 2.7]];
    for (const [d, sp] of roots) {
      c.beginPath(); c.moveTo(x + d * w0 * 0.5, y - w0 * 1.1); c.quadraticCurveTo(x + d * w0 * sp * 0.7, y - 0.5, x + d * w0 * sp, y + 1.4); c.quadraticCurveTo(x + d * w0 * sp * 0.5, y + 1.2, x + d * w0 * 0.1, y + 0.6); c.closePath();
      c.fillStyle = LG(c, x - w0 * 2, 0, x + w0 * 2, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S);
      c.beginPath(); c.moveTo(x + d * w0 * 0.5, y - w0 * 0.9); c.quadraticCurveTo(x + d * w0 * sp * 0.65, y - 0.6, x + d * w0 * sp * 0.92, y + 0.8); stroke(c, rgb(d < 0 ? B.ridge : B.edge, d < 0 ? 0.4 : 0.4), 0.5);
    }
    const path = () => { poly(c, [...L, ...Rr.slice().reverse()]); c.closePath(); };
    path(); c.fillStyle = LG(c, x - w0 * 1.2, 0, x + w0 * 1.2, 0, [B.lit, B.mid, B.shade]); c.fill();
    c.save(); path(); c.clip();
    c.fillStyle = LG(c, x - w0, 0, x + w0 * 1.3, 0, ['rgba(60,24,8,0)', 'rgba(60,24,8,0)', 'rgba(60,24,8,.38)']); c.fillRect(x - w0 * 4, y - h - 4, w0 * 8, h + 8);
    // grain: wavy furrows running up the trunk, lit ridges on the lit half
    const nf = Math.max(3, Math.min(6, Math.round(w0 / 1.2)));
    for (let k = 0; k < nf; k++) {
      const f = -0.7 + 1.4 * (k + 0.5) / nf + (R() - 0.5) * 0.12, ph = R() * 6, pts = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12 * 0.97, [px, py] = at(t); pts.push([px + f * wAt(t) + Math.sin(t * 11 + ph) * 0.55, py]); }
      furrow(c, pts, rgb(B.edge, 0.5), f < 0.2 ? rgb(B.ridge, 0.38) : null, 0.8, [-0.9, 0]);
    }
    // short cracks across the bark
    for (let k = 0; k < 3; k++) { const t = 0.15 + R() * 0.7, [px, py] = at(t), w = wAt(t), f = (R() - 0.5) * 0.8; c.beginPath(); c.moveTo(px + (f - 0.2) * w, py); c.lineTo(px + (f + 0.22) * w, py + 0.7); stroke(c, rgb(B.edge, 0.55), 0.6); }
    const [kx, ky] = at(0.38 + R() * 0.2), kr = lerp(w0, w1, 0.45) * 0.42;
    c.beginPath(); c.ellipse(kx + kr * 0.3, ky, kr, kr * 1.3, 0, 0, TAU); c.fillStyle = RG(c, kx, ky, kr, [B.lit, B.shade, B.edge]); c.fill();
    c.beginPath(); c.ellipse(kx + kr * 0.3, ky, kr * 0.6, kr * 0.8, 0, 3.2, 5.0); stroke(c, rgb(B.ridge, 0.4), 0.6);
    if (opt.moss) {
      const Lf = P.leaf;
      for (let j = 0; j < 9; j++) { const t = R() * 0.45, [px, py] = at(t), w = wAt(t), mx = px - w * (0.35 + R() * 0.6); c.beginPath(); c.ellipse(mx, py, 1.4 + R() * 1.2, 0.9 + R() * 0.6, 0, 0, TAU); c.fillStyle = rgb(j % 3 ? Lf.mid : Lf.lit, 0.85); c.fill(); }
    }
    c.restore();
    path(); stroke(c, B.edge, EW);
    c.beginPath(); poly(c, L.slice(1, 9).map(p => [p[0] + 0.9, p[1]])); stroke(c, rgb(B.ridge, 0.35), 0.6);   // rim light down the lit side
    if (opt.vine) {
      // a vine winding round the trunk; only the turns in front are drawn, leaves on them
      const ph = R() * 6, turns = 2.2 + R();
      let seg = [];
      const flush = () => { if (seg.length > 2) vine(c, P, seg, 3, 3.6, seed + seg.length); seg = []; };
      for (let i = 0; i <= 40; i++) { const t = 0.04 + i / 40 * 0.9, th = t * turns * TAU + ph, [px, py] = at(t); if (Math.cos(th) > -0.1) seg.push([px + Math.sin(th) * wAt(t) * 1.02, py]); else flush(); }
      flush();
    }
    return top;
  }
  function branch(c, P, x0, y0, x1, y1, w) {
    const B = P.bark;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 - 2, x1, y1); stroke(c, B.edge, w + 1.4);
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 - 2, x1, y1); stroke(c, B.mid, w);
    c.beginPath(); c.moveTo(x0 - 0.3, y0 - w * 0.3); c.quadraticCurveTo((x0 + x1) / 2 - 0.3, y0 - 2 - w * 0.3, x1 - 0.3, y1 - w * 0.3); stroke(c, rgb(B.ridge, 0.4), 0.6);
  }
  // a broadleaf jungle tree: a short stout trunk forking into a rounded canopy of leafy lobes; seed sets its
  // silhouette (lobe count, spread, lean), some carry a vine and moss and a hanging liana
  function broadTree(c, P, x, y, h, w, seed, k0 = 0) {
    const R = rand(seed), cy = y - h * (0.5 + R() * 0.08), rr = w / 2, lean = (R() - 0.5) * 6;
    castShadow(c, P, x, y, h, w * 0.75);
    const lobes = [{ x: x + lean, y: cy, r: rr * (0.6 + R() * 0.12), k: 0.08 }];
    const n = 4 + (R() * 4 | 0), spread = 1.0 + R() * 0.25;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.95 + 1.1 * i / (n - 1)) + (R() - 0.5) * 0.45, d = rr * (0.4 + 0.18 * R()) * spread;
      lobes.push({ x: x + lean + Math.cos(a) * d * 1.08, y: cy + Math.sin(a) * d * 0.78, r: rr * (0.38 + 0.2 * R()), k: Math.sin(a) < -0.5 ? 0 : 0.06 });
    }
    for (const a of [0.5, 2.65]) if (R() < 0.85) lobes.push({ x: x + lean + Math.cos(a) * rr * 0.55, y: cy + rr * 0.3, r: rr * (0.36 + R() * 0.1), k: 0.22 });
    const tw = Math.max(3.4, w * 0.07), top = trunk(c, P, x, y, h * 0.36, tw, tw * 0.72, lean * 0.6, seed + 1, { vine: R() < 0.5, moss: R() < 0.6 });
    branch(c, P, top[0], top[1] + 3, x + lean - rr * 0.38, cy + rr * 0.1, tw * 0.8); branch(c, P, top[0], top[1] + 3, x + lean + rr * 0.4, cy + rr * 0.05, tw * 0.75);
    lobes.sort((p, q) => (q.k - p.k) || (q.y - p.y));
    for (const o of lobes) lobe(c, P, o.x, o.y, o.r, o.k + k0, R, 'leafy');
    if (R() < 0.55) { const s = R() < 0.5 ? -1 : 1; liana(c, P, x + lean + s * rr * 0.15, cy + rr * 0.35, x + lean + s * rr * 0.75, cy + rr * 0.2, rr * 0.45, seed + 9); }
  }
  // a strangler fig: a fat trunk wrapped in climbing root strands, wide plank buttresses, aerial roots hanging from a
  // broad flat dome of small leaf clumps (darker than the broadleaves)
  function figTree(c, P, x, y, h, w, seed, k0 = 0) {
    const R = rand(seed), B = P.bark, cy = y - h * 0.62, rr = w / 2;
    castShadow(c, P, x, y, h, w * 0.85);
    // aerial roots: each hangs from the crown and, where it reaches the ground, thickens and splays into a small root
    // flare with its own contact shadow; the young ones still hanging taper to a frayed tip well above the ground
    const aerial = (ax, ay, len, wd, grounded) => {
      // a kinked root line: thin where it leaves the crown, thickening as it nears the ground, wandering a little at
      // each kink; grounded ones split into three root fingers that grip the soil, with a contact shadow
      const kinks = 5, pts = [[ax, ay]];
      for (let k = 1; k <= kinks; k++) { const t = k / kinks; pts.push([ax + (R() - 0.5) * 3.2 * Math.sin(t * Math.PI) + (k % 2 ? 0.8 : -0.8) * t, ay + len * t]); }
      const e = pts[pts.length - 1];
      if (grounded) softShadow(c, e[0] + 1.5, e[1] + 0.6, wd * 3.4 + 2, 1.5, P.shadowA * 1.2, 0, P.shadowC);
      const wAtK = k => grounded ? lerp(wd * 0.45, wd * 1.05, Math.pow(k / kinks, 1.6)) : lerp(wd * 0.6, wd * 0.2, k / kinks);
      c.lineCap = 'round'; c.lineJoin = 'round';
      const fingers = grounded ? [[-1, 3.6, 2.6], [0.15, 1.2, 3.2], [1, 3.2, 2.2]] : [];
      const fp = ([s, dx, dy]) => [[e[0], e[1] - 2.4], [e[0] + s * dx * 0.5, e[1] - 0.6 + dy * 0.2], [e[0] + s * dx + (s === 0.15 ? 0.6 : 0), e[1] + dy * 0.35]];
      for (const pass of [0, 1]) {
        for (let k = 1; k < pts.length; k++) { c.beginPath(); c.moveTo(...pts[k - 1]); c.lineTo(...pts[k]); stroke(c, pass ? B.mid : B.edge, (wAtK(k - 0.5) + (pass ? 0 : 1.1))); }
        for (const f of fingers) { const q = fp(f); c.beginPath(); c.moveTo(...q[0]); c.quadraticCurveTo(...q[1], ...q[2]); stroke(c, pass ? B.mid : B.edge, wd * (pass ? 0.75 : 0.75) + (pass ? 0 : 1)); }
      }
      // lit line down the left side
      c.save(); c.translate(-wd * 0.3, 0); poly(c, pts.slice(1)); stroke(c, rgb(B.ridge, 0.4), 0.45); c.restore();
      if (!grounded) { c.beginPath(); c.moveTo(e[0], e[1] - 1); c.lineTo(e[0] - 1, e[1] + 1.2); c.moveTo(e[0], e[1] - 1); c.lineTo(e[0] + 0.9, e[1] + 1); stroke(c, B.edge, 0.45); }
    };
    for (let i = 0; i < 3; i++) { const ax = x + (i - 1) * rr * 0.55 + (R() - 0.5) * 4; aerial(ax, cy + rr * 0.2, y - cy - rr * 0.2 - 1 + (i - 1) * 1.5, 1.5, true); }
    const tw = Math.max(4.5, w * 0.085), top = trunk(c, P, x, y, h * 0.48, tw, tw * 0.8, (R() - 0.5) * 3, seed + 2, { moss: true, roots: [[-1, 3.4], [1, 3.2], [-0.4, 2], [0.5, 2.2]] });
    // climbing root strands twisting up the trunk
    for (let s = 0; s < 3; s++) {
      const ph = s * 2.1 + R(), pts = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14, yy = lerp(y + 0.5, top[1] + 2, t), xx = lerp(x, top[0], t) + Math.sin(t * 5 + ph) * tw * 0.75; pts.push([xx, yy]); }
      poly(c, pts); stroke(c, B.edge, 2.4); poly(c, pts); stroke(c, mix(B.mid, B.lit, 0.3), 1.3);
      c.save(); c.translate(-0.5, -0.3); poly(c, pts); stroke(c, rgb(B.ridge, 0.4), 0.5); c.restore();
    }
    branch(c, P, top[0], top[1] + 4, x - rr * 0.55, cy + rr * 0.12, tw * 0.7); branch(c, P, top[0], top[1] + 4, x + rr * 0.5, cy + rr * 0.1, tw * 0.65);
    const lobes = [], n = 6 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) { const u = i / (n - 1) - 0.5; lobes.push({ x: x + u * rr * 1.7, y: cy + Math.abs(u) * rr * 0.32 + rr * 0.08, r: rr * (0.3 + R() * 0.08), k: 0.2 }); }
    for (let i = 0; i < 4; i++) { const u = i / 3 - 0.5; lobes.push({ x: x + u * rr * 1.1 + (R() - 0.5) * 4, y: cy - rr * 0.2, r: rr * (0.32 + R() * 0.08), k: 0.08 }); }
    lobes.push({ x: x + (R() - 0.5) * 6, y: cy - rr * 0.42, r: rr * 0.3, k: 0 });
    for (const o of lobes) lobe(c, P, o.x, o.y, o.r, o.k + k0 + 0.08, R, 'clump', 0.8);
    for (let i = 0; i < 3; i++) { const ax = x + (R() - 0.5) * rr * 1.5; aerial(ax, cy + rr * 0.28, (y - cy) * (0.18 + R() * 0.14), 1, false); }
  }
  // a tall emergent rainforest tree: a long pale buttressed trunk running right up into the crown; at each tier
  // limbs leave the trunk, rise and spread, and carry broad flat leaf masses on their ends (the limbs are drawn
  // first, and every mass sits on a limb's end, so nothing floats); a lower side limb carries a smaller mass
  function tallTree(c, P, x, y, h, w, seed, k0 = 0) {
    const R = rand(seed), rr = w / 2, lean = (R() - 0.5) * 5, tiers = 2 + (R() < 0.5 ? 1 : 0);
    castShadow(c, P, x, y, h, w * 0.55);
    const tw = Math.max(3.6, w * 0.062), top = trunk(c, P, x, y, h * 0.84, tw, tw * 0.55, lean, seed + 3, { pale: true, vine: R() < 0.4, roots: [[-1, 3.2], [1, 3], [-0.4, 2.1]] });
    const tAt = f => [lerp(x, top[0], f) + Math.sin(f * Math.PI) * lean * 0.3, lerp(y, top[1], f)];   // a point up the trunk
    const side = R() < 0.5 ? -1 : 1, sf = 0.5 + R() * 0.06, [sx, sy0] = tAt(sf), sEnd = [sx + side * rr * 0.5, sy0 - h * 0.1];
    branch(c, P, sx, sy0, sEnd[0], sEnd[1] + 2, tw * 0.5);
    branch(c, P, lerp(sx, sEnd[0], 0.55), lerp(sy0, sEnd[1], 0.55), lerp(sx, sEnd[0], 0.8), sEnd[1] - 4, tw * 0.3);
    lobe(c, P, sEnd[0], sEnd[1] - 1, rr * 0.3, 0.14 + k0, R, 'clump', 0.72);
    for (let t = 0; t < tiers; t++) {
      const f = t / tiers, cy = y - h * (0.66 + f * 0.27), span = rr * (1 - f * 0.38), ff = (y - cy) / (y - top[1]) - 0.08;
      const [bx, by] = tAt(Math.min(0.97, ff)), cxT = bx, m = t === tiers - 1 ? 2 : 3, ends = [], tilt = (R() - 0.5) * 10;
      // an uneven crown: the masses sit at different heights and spacings (not a stacked, symmetric tier)
      for (let i = 0; i < m; i++) { const u = i / (m - 1) - 0.5; ends.push([cxT + u * span * (1.25 + R() * 0.4) + (R() - 0.5) * 6, cy + Math.abs(u) * 4 + u * tilt + (R() - 0.5) * 7]); }
      // limbs: from a little below the tier on the trunk, up and out to each mass (the outer ones longest)
      for (const [ex, ey] of ends) if (Math.abs(ex - cxT) > 3) { const [ox, oy] = tAt(Math.min(0.97, ff - 0.05)); branch(c, P, ox, oy, ex, ey + 2, tw * (0.55 - f * 0.2)); }
      for (let i = 0; i < m; i++) { const u = i / (m - 1) - 0.5; lobe(c, P, ends[i][0], ends[i][1], span * (0.5 - Math.abs(u) * 0.1) + R() * 3, (t === tiers - 1 ? 0 : 0.14) + k0, R, 'clump', 0.7); }
    }
  }
  // a big-leaf understory tree: a short trunk under a crown of overlapping rosettes of large ribbed leaves
  function leafTree(c, P, x, y, h, w, seed, k0 = 0) {
    const R = rand(seed), rr = w / 2, cy = y - h * 0.62;
    castShadow(c, P, x, y, h, w * 0.6);
    const tw = Math.max(2.6, w * 0.06), top = trunk(c, P, x, y, h * 0.5, tw, tw * 0.7, (R() - 0.5) * 3, seed + 4, { moss: R() < 0.5 });
    const ros = [[-0.55, 0.15, 0.25], [0.55, 0.12, 0.25], [0, 0.25, 0.18], [-0.25, -0.2, 0.05], [0.3, -0.25, 0.02], [0, -0.45, 0]];
    for (const [dx, dy, tone] of ros) {
      const cx = top[0] + dx * rr, cyy = cy + dy * rr;
      if (dy > 0) branch(c, P, top[0], top[1] + 3, cx, cyy + 3, tw * 0.5);
      softShadow(c, cx + 2, cyy + 3, rr * 0.5, rr * 0.3, 0.35, 0, P.leaf.deep);   // shade where the rosette above overlaps it
      const m = 6, rot = R() * 0.6;
      for (let i = 0; i < m; i++) { const a = -Math.PI / 2 + (i / m - 0.5) * TAU * 0.92 + rot; bigLeaf(c, P, cx, cyy, a, rr * (0.42 + R() * 0.12), clamp(tone + k0 + (Math.sin(a) > 0 ? 0.15 : 0), 0, 0.7)); }
    }
  }
  // a banana plant: a slim, slightly bulging pseudostem of wrapped leaf sheaths (diagonal sheath seams as line pairs,
  // old brown sheaths at the foot), long paddle leaves on arching stalks, their blades torn into strips along the
  // veins, and the new leaf still rolled into a spindle at the heart
  function banana(c, P, x, y, h, seed) {
    const L = P.leaf, St = P.straw, B = P.bark, R = rand(seed);
    castShadow(c, P, x, y, h, h * 0.55);
    const hs = h * 0.5, lean = (R() - 0.5) * 3, sw = Math.max(2.2, h * 0.052), top = [x + lean, y - hs];
    const at = t => [lerp(x, top[0], t) + Math.sin(t * Math.PI) * lean * 0.25, lerp(y, top[1], t)];
    const wAt = t => sw * (1 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.5))) * lerp(1.05, 0.7, t);
    const leaves = [[-2.7, 0.92, 0.3, 1.0], [-0.45, 0.88, 0.28, 1.1], [-2.15, 1.0, 0.06, 0.75], [-0.95, 1.0, 0.03, 0.8], [-3.05, 0.78, 0.16, 1.5], [-0.08, 0.8, 0.18, 1.5], [-1.6, 0.72, 0.0, 0.3]];
    const LEN = h * 0.64;
    for (const [a, k, tone, dr] of leaves.slice(0, 2)) bananaLeaf(c, P, top[0], top[1] + 1, a + (R() - 0.5) * 0.12, LEN * k, tone, dr, seed * 7 + a * 10 | 0);
    // the stem
    const Lp = [], Rp = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, [px, py] = at(t), w = wAt(t); Lp.push([px - w, py]); Rp.push([px + w, py]); }
    const body = () => { poly(c, [...Lp, ...Rp.slice().reverse()]); c.closePath(); };
    const sLit = mix(L.lit, [222, 216, 132], 0.35), sMid = mix(L.mid, [150, 140, 72], 0.28), sSh = mix(L.shade, [70, 60, 30], 0.25);
    body(); c.fillStyle = LG(c, x - sw * 1.2, 0, x + sw * 1.2, 0, [sLit, sMid, sSh]); c.fill();
    c.save(); body(); c.clip();
    c.fillStyle = LG(c, 0, y, 0, y - hs * 0.35, [rgb(mix(B.mid, St.shade, 0.4), 0.75), rgb(mix(B.mid, St.shade, 0.4), 0)]); c.fillRect(x - sw * 3, y - hs, sw * 6, hs + 2);   // old brown sheaths at the foot
    for (let k = 0; k < 5; k++) {   // sheath seams: each wraps diagonally up round the stem
      const t0 = 0.08 + k * 0.18 + R() * 0.04, t1 = t0 + 0.13, a0 = at(t0), a1 = at(t1);
      furrow(c, [[a0[0] - wAt(t0) * 1.1, a0[1]], [lerp(a0[0], a1[0], 0.5), lerp(a0[1], a1[1], 0.4)], [a1[0] + wAt(t1) * 1.1, a1[1]]], rgb(mix(L.edge, B.edge, 0.3), 0.55), rgb(sLit, 0.7), 0.6, [0, -0.8]);
    }
    poly(c, Lp.slice(1, 11).map(p => [p[0] + 0.9, p[1]])); stroke(c, rgb([255, 250, 210], 0.35), 0.6);
    c.restore();
    body(); stroke(c, mix(L.edge, B.edge, 0.35), EW_S);
    for (const [a, k, tone, dr] of leaves.slice(2)) bananaLeaf(c, P, top[0], top[1] + 1, a + (R() - 0.5) * 0.12, LEN * k, tone, dr, seed * 7 + a * 10 | 0);
    // the rolled new leaf
    const sx = top[0] + 0.4, sy0 = top[1] + 1, sy1 = top[1] - h * 0.3;
    c.beginPath(); c.moveTo(sx - 1.5, sy0); c.quadraticCurveTo(sx - 1.4, (sy0 + sy1) / 2, sx + 0.7, sy1); c.quadraticCurveTo(sx + 1.7, (sy0 + sy1) / 2, sx + 1.5, sy0); c.closePath();
    c.fillStyle = LG(c, sx - 2, 0, sx + 2, 0, [mix(L.lit, [232, 242, 170], 0.35), L.mid]); c.fill(); stroke(c, L.edge, EW_S);
    c.beginPath(); c.moveTo(sx - 0.6, sy0 - 1); c.quadraticCurveTo(sx - 0.5, (sy0 + sy1) / 2, sx + 0.5, sy1 + 2); stroke(c, rgb(L.sheen, 0.6), 0.5);
  }
  // one banana leaf: a stalk arching out of the crown, then a long paddle blade (rounded at both ends) that droops
  // toward its tip; a pale midrib, fine parallel veins running out to the margin, and a few tears along the veins
  // that split the blade's edge into strips
  function bananaLeaf(c, P, x, y, a, len, tone, droop, seed) {
    const L = P.leaf, R = rand(seed), dx = Math.cos(a), dy = Math.sin(a), M = 30, pf = 0.2;
    const tip = [x + dx * len, y + dy * len * 0.5 + len * 0.34 * droop * Math.abs(dx) + len * 0.05], ctl = [x + dx * len * 0.45, y + dy * len * 0.55 - len * 0.3];
    const qb = t => [(1 - t) ** 2 * x + 2 * (1 - t) * t * ctl[0] + t * t * tip[0], (1 - t) ** 2 * y + 2 * (1 - t) * t * ctl[1] + t * t * tip[1]];
    const spine = []; for (let i = 0; i <= M; i++) spine.push(qb(pf + (1 - pf) * i / M));
    const hw = v => len * 0.14 * Math.pow(Math.sin(Math.PI * clamp(0.03 + v * 0.95, 0, 1)), 0.42);
    const tears = s => { const out = new Set(); const n = 2 + (R() * 2 | 0); for (let k = 0; k < n; k++) out.add(6 + (R() * (M - 10) | 0)); return out; };
    const edge = s => { const T = tears(s), e = offset(spine, (u, i) => s * hw(i / M)); return e.map((p, i) => { if (!T.has(i) || i >= M - 1) return p; const q = spine[Math.min(M, i + 1)]; return lerpPt(q, e[i + 1], 0.12); }); };
    const up = edge(-1), dn = edge(1);
    // the stalk
    const st = []; for (let i = 0; i <= 8; i++) st.push(qb(pf * i / 8));
    poly(c, st); stroke(c, L.edge, 2.4); poly(c, st); stroke(c, mix(L.mid, [170, 160, 80], 0.3), 1.4); c.save(); c.translate(-0.3, -0.4); poly(c, st); stroke(c, rgb(L.sheen, 0.45), 0.5); c.restore();
    const cUp = [mix(L.lit, L.mid, 0.1 + tone), mix(L.mid, L.shade, 0.15 + tone), mix(L.shade, L.deep, 0.15 + tone)], cDn = cUp.map(v => mix(v, L.deep, 0.3));
    for (const [e, cl] of [[up, cUp], [dn, cDn]]) {
      poly(c, [...spine, ...e.slice().reverse()]); c.closePath(); c.fillStyle = LG(c, spine[0][0], spine[0][1], tip[0], tip[1], cl); c.fill();
      for (let i = 2; i < M - 1; i += 2) { const p = spine[i], q = e[Math.min(M, i + 2)]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.5) continue; c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(lerp(p[0], q[0], 0.5), lerp(p[1], q[1], 0.5) - 0.3, lerp(p[0], q[0], 0.92), lerp(p[1], q[1], 0.92)); stroke(c, rgb(L.vein, 0.4), 0.45); }
      poly(c, [...spine, ...e.slice().reverse()]); c.closePath(); stroke(c, L.edge, EW_S);
    }
    // sheen along the upper half, the pale midrib with its shadow line
    c.save(); poly(c, [...spine, ...up.slice().reverse()]); c.clip(); poly(c, offset(spine, (u, i) => -hw(i / M) * 0.55).slice(3, M - 4)); stroke(c, rgb(L.sheen, Math.max(0, 0.45 - tone)), 1); c.restore();
    c.save(); c.translate(0.4, 0.7); poly(c, spine.slice(0, M - 2)); stroke(c, rgb(L.vein, 0.6), 0.7); c.restore();
    poly(c, spine.slice(0, M - 1)); stroke(c, rgb(mix(L.mid, L.lit, 0.55 - tone * 0.5), 0.85), 0.7);   // the midrib, no brighter or heavier than the other detail lines
  }
  // a fan palm: a ringed trunk topped with pleated round fans (each pleat a line-pair, pointed tips)
  function fanPalm(c, P, x, y, h, seed) {
    const R = rand(seed), B = P.bark;
    castShadow(c, P, x, y, h, h * 0.5);
    const tw = 3.2, top = trunk(c, P, x, y, h * 0.6, tw, tw * 0.85, (R() - 0.5) * 5, seed + 5);
    const rot = (R() - 0.5) * 0.4, fans = [[-2.6, 0.25], [-0.55, 0.22], [-1.6, 0], [-2.1, 0.05], [-1.05, 0.05], [0.4, 0.3], [-3.6, 0.3]];
    for (const [a, tone] of fans) fan(c, P, top[0], top[1] + 2, a + rot + (R() - 0.5) * 0.2, h * (0.32 + R() * 0.08), tone);
    c.beginPath(); c.arc(top[0], top[1] + 2, 2.4, 0, TAU); c.fillStyle = RG(c, top[0], top[1] + 2, 2.4, [B.lit, B.mid, B.shade]); c.fill();
  }
  function fan(c, P, x, y, a, r, tone) {
    const L = P.leaf, n = 9, spread = 1.5, cx = x + Math.cos(a) * r * 0.25, cy = y + Math.sin(a) * r * 0.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(cx, cy); stroke(c, L.edge, 2); c.beginPath(); c.moveTo(x, y); c.lineTo(cx, cy); stroke(c, mix(L.mid, [150, 120, 60], 0.3), 1);
    const pts = [];
    for (let i = 0; i <= n * 2; i++) { const t = a - spread / 2 + spread * i / (n * 2), rr = i % 2 ? r * 0.82 : r; pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.72]); }
    for (let i = 0; i < n; i++) {
      const p0 = pts[i * 2], p1 = pts[i * 2 + 1], p2 = pts[i * 2 + 2];
      for (const [q0, q1, lit] of [[p0, p1, 1], [p1, p2, 0]]) {
        poly(c, [[cx, cy], q0, q1]); c.closePath();
        const k = lit ? tone : tone + 0.22;
        c.fillStyle = LG(c, cx, cy, q0[0], q0[1], [mix(L.mid, L.shade, k), mix(L.lit, L.mid, k)]); c.fill();
      }
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p1[0], p1[1]); stroke(c, rgb(L.vein, 0.75), 0.6);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(lerp(cx, p0[0], 0.92), lerp(cy, p0[1], 0.92)); stroke(c, rgb(L.sheen, Math.max(0, 0.35 - tone * 0.4)), 0.5);
    }
    poly(c, [[cx, cy], ...pts]); c.closePath(); stroke(c, L.edge, EW_S);
  }
  // a low jungle bush; seed picks one of three builds: a mound of leafy lobes, a rosette of big leaves, or a
  // flowering shrub with hibiscus on its crown
  function bush(c, P, x, y, w, seed, k0 = 0) {
    const R = rand(seed), rr = w / 2, kind = seed % 3;
    castShadow(c, P, x, y, w * 0.5, w);
    if (kind === 1) { for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.48 + (R() - 0.5) * 0.2; bigLeaf(c, P, x, y, a, rr * (1.05 + R() * 0.3) * (1 - Math.abs(i - 3) * 0.08), clamp(Math.abs(i - 3) * 0.07 + k0, 0, 0.6)); } return; }
    const m = 3 + (R() * 3 | 0), lobes = [];
    for (let i = 0; i < m; i++) { const u = m === 1 ? 0 : i / (m - 1) - 0.5; lobes.push({ x: x + u * rr * 1.3 + (R() - 0.5) * 3, y: y - rr * (0.38 + (0.5 - Math.abs(u)) * 0.5), r: rr * (0.4 + R() * 0.15), k: Math.abs(u) * 0.2 }); }
    lobes.sort((p, q) => q.k - p.k);
    for (const o of lobes) lobe(c, P, o.x, o.y, o.r, o.k + k0, R, kind === 2 ? 'clump' : 'leafy');
    if (kind === 2) { const cl = [[236, 72, 96], [255, 140, 60], [250, 210, 80]][seed % 3 === 2 ? (seed >> 2) % 3 : 0]; for (let i = 0; i < 3; i++) flower(c, x + (i - 1) * rr * 0.6 + (R() - 0.5) * 3, y - rr * (0.7 + R() * 0.3), 2.6 + R() * 0.8, cl); }
  }
  // a fern: arching fronds fanned from one root (the palm's frond, small and low)
  function fern(c, P, x, y, s, seed) {
    const R = rand(seed);
    castShadow(c, P, x, y, 10 * s, 22 * s);
    const nf = 5 + (R() * 4 | 0), spread = 2.4 + R() * 0.9, mid = -Math.PI / 2 + (R() - 0.5) * 0.4, fr = [];
    for (let i = 0; i < nf; i++) { const u = i / (nf - 1) - 0.5; fr.push([mid + u * spread, Math.abs(u) > 0.3]); }
    fr.sort((p, q) => q[1] - p[1]);
    const fs = 0.8 + R() * 0.45;
    for (const [a, back] of fr) frond(c, P, x, y, a + (R() - 0.5) * 0.25, 16 * s * fs * (0.75 + 0.45 * R()), back, 0.8 + R() * 0.5);
  }
  // a broad-leaf understory plant: a few big leaves fanned from one root
  function plant(c, P, x, y, s, seed) {
    const R = rand(seed);
    castShadow(c, P, x, y, 12 * s, 18 * s);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55 + (R() - 0.5) * 0.15; bigLeaf(c, P, x, y, a, (14 + 4 * R()) * s, Math.abs(i - 2) < 1 ? 0 : 0.1); }
  }
  // a big ribbed leaf, drawn like the canopy clusters: it throws a soft shadow down-right onto whatever is under it,
  // droops a little under its own weight (the midrib bends toward the ground), carries a gradient across it, paired
  // side veins, a sheen on its sunny half and a lit line along the midrib
  function bigLeaf(c, P, x, y, a, sz, tone) {
    const L = P.leaf, b = sz * 0.13 * Math.cos(a);   // the droop, in the leaf's own frame (screen-down is (sin a, cos a))
    const shape = () => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(sz * 0.25, -sz * 0.42 + b * 0.3, sz * 0.8, -sz * 0.36 + b, sz, b * 1.3); c.bezierCurveTo(sz * 0.8, sz * 0.36 + b, sz * 0.25, sz * 0.42 + b * 0.3, 0, 0); c.closePath(); };
    const rib = t => [sz * t, b * 1.3 * t * t];
    c.save(); c.translate(x + 0.9, y + 1.8); c.rotate(a); shape(); c.fillStyle = rgb(L.deep, 0.32); c.fill(); c.restore();
    c.save(); c.translate(x, y); c.rotate(a);
    shape(); c.fillStyle = LG(c, 0, -sz * 0.4, 0, sz * 0.4 + b, [mix(L.lit, L.mid, 0.1 + tone), mix(L.mid, L.shade, 0.2 + tone), mix(L.shade, L.deep, 0.35 + tone)]); c.fill();
    c.save(); shape(); c.clip();
    // the far half (away from the light) in shade, a sheen on the near half
    c.beginPath(); c.moveTo(0, 0); for (let k = 1; k <= 8; k++) c.lineTo(...rib(k / 8)); c.lineTo(sz, sz); c.lineTo(0, sz); c.closePath(); c.fillStyle = rgb(L.deep, 0.18); c.fill();
    c.beginPath(); c.ellipse(sz * 0.45, -sz * 0.14 + b * 0.3, sz * 0.26, sz * 0.07, 0.05, 0, TAU); c.fillStyle = rgb(L.sheen, Math.max(0, 0.32 - tone * 0.6)); c.fill();
    for (let k = 1; k < 5; k++) { const t = k / 5 * 0.9, [px, py] = rib(t); for (const d of [-1, 1]) { furrow(c, [[px - sz * 0.04, py], [px + sz * 0.06, py + d * sz * 0.16], [px + sz * 0.16, py + d * sz * 0.33 + b * 0.2]], rgb(L.vein, 0.55), d < 0 ? rgb(L.sheen, Math.max(0, 0.3 - tone * 0.5)) : null, 0.55, [-0.5, -0.5]); } }
    c.restore();
    shape(); stroke(c, L.edge, EW_S);
    c.beginPath(); c.moveTo(0, 0); for (let k = 1; k <= 10; k++) c.lineTo(...rib(k / 10 * 0.92)); stroke(c, rgb(L.vein, 0.85), 0.8);
    c.beginPath(); c.moveTo(sz * 0.08, -0.6); for (let k = 1; k <= 8; k++) { const [px, py] = rib(0.08 + k / 8 * 0.72); c.lineTo(px, py - 0.6); } stroke(c, rgb(L.sheen, Math.max(0, 0.6 - tone)), 0.5);
    c.restore();
  }

  // a coconut palm: a trunk with a gentle S-curve (seeded), ring segments as furrow + lit ridge pairs with fibre
  // cross-hatching between them, an asymmetric crown of drooping fronds, one dead frond hanging, coconuts
  function palm(c, P, x, y, h, lean, seed) {
    const B = P.bark, R = rand(seed), bend = (R() - 0.5) * 0.3;
    const p1 = [x + lean * h * 0.05 + bend * h * 0.3, y - h * 0.35], p2 = [x + lean * h * 0.8 - bend * h * 0.2, y - h * 0.72], top = [x + lean * h, y - h];
    const at = t => { const s = 1 - t; return [s * s * s * x + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * top[0], s * s * s * y + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * top[1]]; };
    const spine = []; for (let i = 0; i <= 20; i++) spine.push(at(i / 20));
    const wAt = u => lerp(5.2, 3.0, u) + (u < 0.08 ? (0.08 - u) * 30 : 0);
    const left = offset(spine, u => -wAt(u)), right = offset(spine, u => wAt(u));
    castShadow(c, P, x, y, h, h * 0.45);
    // the crown: frond count, spread, lengths and droop all seeded, so no two palms share a silhouette
    // two crown habits: a full, stiff crown of many shorter fronds (even seeds) or an open, weeping crown of a few
    // long fronds that arch right over (odd seeds)
    const weep = seed % 2 === 1, fronds = [], nF = weep ? 7 + (R() * 2 | 0) : 11 + (R() * 3 | 0), rot = (R() - 0.5) * 0.8, fl = weep ? 0.42 + R() * 0.08 : 0.36 + R() * 0.06;
    for (let i = 0; i < nF; i++) { const a = -Math.PI / 2 + rot + (i / nF - 0.5) * TAU * 0.98 + (R() - 0.5) * 0.5; fronds.push({ a, L: h * (fl + (weep ? 0.22 : 0.18) * R()) * (Math.sin(a) < -0.6 ? 0.8 : 1), back: Math.sin(a) < -0.35, droop: weep ? 1.25 + R() * 0.7 : 0.6 + R() * 0.5 }); }
    // each palm its own green: a little yellower or bluer, so no two crowns match
    const tint = (R() - 0.5) * 2, Lp = P.leaf, tc = tint > 0 ? [196, 206, 92] : [40, 118, 112], PT = { ...P, leaf: Object.fromEntries(Object.entries(Lp).map(([k2, v]) => [k2, k2 === 'rim' ? v : mix(v, tc, Math.abs(tint) * 0.18)])) };
    // the dead frond hangs behind the trunk
    frond(c, P, top[0], top[1] + 1, Math.PI / 2 + (R() < 0.5 ? -0.5 : 0.5), h * 0.36, false, 1.6, true);
    const body = () => { poly(c, [...left, ...right.slice().reverse()]); c.closePath(); };
    body(); c.fillStyle = LG(c, x - 6, 0, x + 6, 0, [B.lit, B.mid, B.shade]); c.fill();
    c.save(); body(); c.clip();
    c.fillStyle = LG(c, x - 6, 0, x + 7, 0, ['rgba(60,24,8,0)', 'rgba(60,24,8,0)', 'rgba(60,24,8,.35)']); c.fillRect(x - 60, y - h - 10, 160, h + 20);
    let t = 0.05;
    while (t < 0.95) {
      const step = 0.062 + R() * 0.02, p = at(t), q = at(t + 0.01), dx = q[0] - p[0], dy = q[1] - p[1], Ln = Math.hypot(dx, dy), nx = -dy / Ln, ny = dx / Ln, w = wAt(t) + 1;
      const ring = [[p[0] - nx * w, p[1] - ny * w], [p[0] + dx / Ln * -1.8, p[1] + dy / Ln * -1.8 + 1.6], [p[0] + nx * w, p[1] + ny * w]];
      c.beginPath(); c.moveTo(...ring[0]); c.quadraticCurveTo(...ring[1], ...ring[2]); stroke(c, rgb(B.edge, 0.6), 1.1);
      c.beginPath(); c.moveTo(ring[0][0], ring[0][1] - 1.3); c.quadraticCurveTo(ring[1][0], ring[1][1] - 1.3, ring[2][0], ring[2][1] - 1.3); stroke(c, rgb(B.ridge, 0.38), 0.8);
      // fibre between this ring and the next: short diagonal hatching
      const m = at(t + step * 0.5);
      for (let k = -2; k <= 2; k++) { const fx = m[0] + nx * k * wAt(t) * 0.35, fy = m[1] + ny * k * wAt(t) * 0.35; c.beginPath(); c.moveTo(fx - 1, fy + 1.2); c.lineTo(fx + 1, fy - 1.2); stroke(c, rgb(k < 0 ? B.ridge : B.edge, k < 0 ? 0.3 : 0.35), 0.45); }
      t += step;
    }
    poly(c, offset(spine.slice(1, 19), u => -wAt(u) * 0.5)); stroke(c, rgb(B.ridge, 0.4), 1.1);
    c.restore();
    body(); stroke(c, B.edge, EW);
    fronds.sort((p, q) => (q.back - p.back) || (Math.sin(p.a) - Math.sin(q.a)));
    for (const f of fronds) frond(c, PT, top[0], top[1], f.a, f.L, f.back, f.droop);
    const nuts = R() < 0.5 ? [[-2.6, 2.6], [2.4, 2.8], [0, 4.4]] : [[-2.2, 3], [2.2, 3.2]];
    for (const [dx, dy] of nuts) {
      const cx = top[0] + dx, cy = top[1] + dy;
      c.beginPath(); c.arc(cx, cy, 3.1, 0, TAU); c.fillStyle = RG(c, cx, cy, 3.1, [mix([200, 144, 96], B.lit, 0.3), mix([138, 82, 48], B.mid, 0.3), mix([74, 38, 20], B.edge, 0.3)]); c.fill(); stroke(c, mix([74, 38, 20], B.edge, 0.3), 0.6);
      c.fillStyle = 'rgba(255,230,190,.55)'; c.beginPath(); c.ellipse(cx - 1, cy - 1.2, 1.1, 0.6, -0.5, 0, TAU); c.fill();
    }
  }
  function frond(c, P, x, y, a, L, back, droop = 1, dead = false) {
    const St = P.straw, Lf = dead ? { lit: St.lit, mid: St.mid, shade: St.shade, deep: St.edge, edge: St.edge, vein: St.edge, rim: St.lit, sheen: St.lit } : P.leaf, dx = Math.cos(a), dy = Math.sin(a) * 0.62;
    // the rachis rises, arches over and droops, its tip curling down: a cubic whose last stretch turns downward
    const hz = 0.45 + 0.55 * Math.abs(Math.cos(a)), tip = [x + dx * L * 0.94, y + dy * L + L * 0.46 * droop * hz], p1 = [x + dx * L * 0.38, y + dy * L * 0.38 - L * 0.26 / droop], p2 = [x + dx * L * 0.86, y + dy * L * 0.8 + L * 0.06 * droop * hz];
    const spine = []; for (let i = 0; i <= 24; i++) { const t = i / 24, s3 = 1 - t; spine.push([s3 ** 3 * x + 3 * s3 * s3 * t * p1[0] + 3 * s3 * t * t * p2[0] + t ** 3 * tip[0], s3 ** 3 * y + 3 * s3 * s3 * t * p1[1] + 3 * s3 * t * t * p2[1] + t ** 3 * tip[1]]); }
    // widest a third of the way out, then a long taper to a fine point
    const wid = u => L * (dead ? 0.13 : 0.21) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + 0.94 * Math.pow(u, 0.72))), 1.05);
    const side = s => offset(spine, (u, i) => s * wid(u) * (i % 3 === 0 ? 0.8 : 1));
    const up = side(-1), dn = side(1), tone = back ? 0.38 : 0;
    // its shadow on the fronds and trunk under it (the overlap reads darker)
    if (!dead) { c.save(); c.translate(1.1, 2.4); poly(c, [...up, ...dn.slice().reverse()]); c.closePath(); c.fillStyle = rgb(Lf.deep, back ? 0.18 : 0.3); c.fill(); c.restore(); }
    const half = (e, cols) => { poly(c, [...spine, ...e.slice().reverse()]); c.closePath(); c.fillStyle = LG(c, x, y, tip[0], tip[1], cols); c.fill(); };
    half(up, [mix(Lf.lit, Lf.mid, 0.05 + tone), mix(Lf.lit, Lf.mid, 0.45 + tone), mix(Lf.mid, Lf.shade, 0.3 + tone)]);
    half(dn, [mix(Lf.mid, Lf.shade, 0.15 + tone), mix(Lf.mid, Lf.shade, 0.5 + tone), mix(Lf.shade, Lf.deep, 0.3 + tone)]);
    poly(c, [...up, ...dn.slice().reverse()]); c.closePath(); stroke(c, Lf.edge, EW_S);
    for (let i = 3; i < spine.length - 1; i += 3) {
      for (const e of [up, dn]) { const p = spine[i - 2], q = e[i]; c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.4, q[0], q[1]); stroke(c, rgb(Lf.vein, back ? 0.5 : 0.7), 0.65); }
      const p = spine[i - 1], q = up[i + 1] || up[i];
      c.beginPath(); c.moveTo(p[0], p[1] - 0.2); c.lineTo(q[0] - 0.2, q[1] - 0.6); stroke(c, rgb(Lf.sheen, back ? 0.12 : 0.32), 0.5);
    }
    poly(c, spine.slice(0, 22)); stroke(c, rgb(Lf.vein, 0.85), 1.05);
    c.save(); c.translate(-0.45, -0.6); poly(c, spine.slice(0, 18)); stroke(c, rgb(Lf.sheen, back ? 0.25 : 0.65), 0.6); c.restore();
  }

  // ---------------- the stilt hut ----------------
  // one consistent 3/4 view (the same oblique depth axis DV for every part, receding up and to the right): bark posts
  // whose back row stands up-right of the front row, braces and lashings, a planked deck whose top plane shows in
  // front of the house (boards running back), a thick front and right fascia; the house set back on the deck: a
  // bamboo cane front wall with a glowing doorway and window, a planked side wall in shade; a hip thatch roof (front
  // plane, right hip, the ridge over the middle of the house's depth) of drawn straw strands with ragged row fringes;
  // a lantern, a ladder down the front and a flag
  function hut(c, P, x, y, t, S = 1.05) {
    const B = P.bark, Cn = P.cane, St = P.straw, Wd = P.wood;
    castShadow(c, P, x + 6 * S, y - 6 * S, 92 * S, 80 * S);
    c.save(); c.translate(x, y); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round';
    const ew = EW / S, es = EW_S / S, dt = DET / S, R = rand(77);
    const DV = [13, -19], dp = (p, f) => [p[0] + DV[0] * f, p[1] + DV[1] * f];
    const nail = (nx, ny) => { c.beginPath(); c.arc(nx, ny, 0.75, 0, TAU); c.fillStyle = rgb(mix(Wd.edge, [40, 40, 52], 0.35)); c.fill(); c.beginPath(); c.arc(nx - 0.25, ny - 0.25, 0.3, 0, TAU); c.fillStyle = 'rgba(255,255,240,.65)'; c.fill(); };
    const post = (px, py, ph, w, dim) => {
      softShadow(c, px + 1.5, py + 0.5, w * 1.2, 1.6, P.shadowA * 1.3, 0, P.shadowC);
      // the stilt's own shadow stretched across the sand away from the sun, like every other cast shadow
      { const sun = P.sun ?? SUN, L = ph * (P.shLen ?? 0.3) * 1.5; softShadow(c, px + Math.cos(sun) * L * 0.5 + 1, py + Math.sin(sun) * L * 0.3 + 0.6, L * 0.5 + w * 0.4, w * 0.42, P.shadowA * (dim ? 0.8 : 1.1), sun * 0.6, P.shadowC); }
      c.beginPath(); c.roundRect(px - w / 2, py - ph, w, ph, 1);
      c.fillStyle = LG(c, px - w / 2, 0, px + w / 2, 0, dim ? [B.mid, B.shade, B.edge] : [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, es);
      c.save(); c.beginPath(); c.roundRect(px - w / 2, py - ph, w, ph, 1); c.clip();
      for (const f of [-0.25, 0.1, 0.32]) { const pts = []; for (let i = 0; i <= 8; i++) pts.push([px + f * w + Math.sin(i * 1.3 + f * 9) * 0.25, py - ph * i / 8]); furrow(c, pts, rgb(B.edge, dim ? 0.3 : 0.45), f < 0 && !dim ? rgb(B.ridge, 0.4) : null, dt, [-0.6, 0]); }
      c.restore();
      for (const ry of [0.3, 0.68]) furrow(c, [[px - w / 2, py - ph * ry], [px, py - ph * ry + 0.8], [px + w / 2, py - ph * ry]], rgb(B.edge, 0.6), rgb(B.ridge, 0.3), dt, [0, -0.8]);
    };
    const brace = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); stroke(c, B.edge, 2.4); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); stroke(c, B.mid, 1.4); c.beginPath(); c.moveTo(x0 - 0.3, y0 - 0.5); c.lineTo(x1 - 0.3, y1 - 0.5); stroke(c, rgb(B.ridge, 0.35), 0.45); };
    const deckY = -24, X0 = -32, X1 = 29, th = 6.5, PH = -deckY - th, DD = 0.82;   // the deck tucked under the eaves, its front face as deep as the roof's 3/4 view
    // the back row of posts (feet up-right along DV), with their braces, then the front row
    for (const px of [X0 + 4, X1 - 4]) { const [bx, by] = dp([px, 0], DD - 0.08); post(bx, by, PH, 4, true); }
    { const [bx0, by0] = dp([X0 + 4, 0], DD - 0.08), [bx1, by1] = dp([X1 - 4, 0], DD - 0.08); brace(bx0, by0 - 3, bx1, by1 - PH + 2); brace(bx1, by1 - 3, bx0, by0 - PH + 2); }
    brace(X0 + 4, -3, 0, -PH + 2); brace(0, -3, X0 + 4, -PH + 2); brace(0, -3, X1 - 4, -PH + 2); brace(X1 - 4, -3, 0, -PH + 2);
    for (const px of [X0 + 4, 0, X1 - 4]) post(px, 0, PH, 4.6, false);
    for (const bx of [(X0 + 4) / 2, (X1 - 4) / 2]) { c.beginPath(); c.arc(bx, -PH / 2 - 0.5, 1.3, 0, TAU); c.fillStyle = rgb(St.mid); c.fill(); stroke(c, St.edge, dt); }
    // the deck: top plane (boards running back), then the right and front fascias
    const FLd = [X0, deckY], FRd = [X1, deckY], BRd = dp(FRd, DD), BLd = dp(FLd, DD);
    poly(c, [FLd, FRd, BRd, BLd]); c.closePath(); c.fillStyle = LG(c, 0, BLd[1], 0, deckY, [mix(Wd.mid, Wd.lit, 0.4), Wd.lit]); c.fill(); stroke(c, Wd.edge, es);
    for (let k = 1; k < 9; k++) { const p0 = lerpPt(FLd, FRd, k / 9); furrow(c, [p0, dp(p0, DD)], rgb(Wd.edge, 0.5), rgb(B.ridge, 0.3), dt, [-0.6, 0]); }
    poly(c, [FRd, BRd, [BRd[0], BRd[1] + th], [FRd[0], FRd[1] + th]]); c.closePath(); c.fillStyle = LG(c, FRd[0], 0, BRd[0], 0, [Wd.shade, mix(Wd.shade, Wd.edge, 0.4)]); c.fill(); stroke(c, Wd.edge, es);
    c.beginPath(); c.rect(X0, deckY, X1 - X0, th); c.fillStyle = LG(c, 0, deckY, 0, deckY + th, [Wd.lit, Wd.mid, Wd.shade]); c.fill(); stroke(c, Wd.edge, es);
    for (let k = X0 + 12; k < X1; k += 12) { c.beginPath(); c.moveTo(k, deckY + 0.6); c.lineTo(k, deckY + th - 0.6); stroke(c, rgb(Wd.edge, 0.55), dt); }
    for (let k = 0; k < 4; k++) { const gx = X0 + 3 + k * 17 + R() * 5; furrow(c, [[gx, deckY + 2.2], [gx + 6, deckY + 2.6], [gx + 10, deckY + 2.1]], rgb(Wd.edge, 0.4), null, dt * 0.8); }
    for (const px of [X0 + 4, 0, X1 - 4]) { nail(px - 1, deckY + 1.5); nail(px + 1, deckY + 3.4); }
    c.beginPath(); c.moveTo(X0 + 1, deckY + 0.7); c.lineTo(X1 - 1, deckY + 0.7); stroke(c, rgb(B.ridge, 0.4), dt);
    // the house, set back on the deck: front wall from hx0 to hx1 at depth 0.3, 0.55 deep
    const fb = dp([0, deckY], 0.14), hx0 = fb[0] - 25, hx1 = fb[0] + 25, baseY = fb[1], wT = baseY - 25, HD = 0.74;
    const sw = [[hx1, baseY], dp([hx1, baseY], HD), dp([hx1, wT], HD), [hx1, wT]];
    poly(c, sw); c.closePath(); c.fillStyle = LG(c, hx1, 0, sw[1][0], 0, [mix(Wd.mid, Wd.shade, 0.5), Wd.shade]); c.fill();
    for (let k = 1; k < 6; k++) { const f = k / 6, y0 = lerp(baseY, wT, f); furrow(c, [[hx1, y0], dp([hx1, y0], HD)], rgb(Wd.edge, 0.7), rgb(Wd.mid, 0.8), dt, [0, -0.7]); nail(hx1 + 1.4, y0 - 1); }
    poly(c, sw); c.closePath(); stroke(c, Wd.edge, es);
    softShadow(c, fb[0], baseY + 0.5, 28, 1.6, P.shadowA * 1.2, 0, P.shadowC);
    const cw = (hx1 - hx0) / 11;
    for (let cx = hx0; cx < hx1 - 0.1; cx += cw) {
      c.beginPath(); c.roundRect(cx + 0.15, wT, cw - 0.3, baseY - wT, 1.2);
      c.fillStyle = LG(c, cx, 0, cx + cw, 0, [Cn.lit, Cn.mid, Cn.shade]); c.fill(); stroke(c, rgb(Cn.edge, 0.85), dt);
      for (const ny of [0.32, 0.7]) { const yy = wT + (baseY - wT) * ny; furrow(c, [[cx + 0.4, yy], [cx + cw - 0.4, yy]], rgb(Cn.edge, 0.8), rgb([255, 245, 210], 0.5), dt, [0, -0.7]); }
      c.beginPath(); c.moveTo(cx + 1.1, wT + 1.5); c.lineTo(cx + 1.1, baseY - 1.5); stroke(c, rgb([255, 248, 220], 0.35), 0.45);
    }
    for (const ny of [0.32, 0.7]) { const yy = wT + (baseY - wT) * ny; c.beginPath(); c.moveTo(hx0, yy + 0.8); c.lineTo(hx1, yy + 0.8); stroke(c, rgb(St.shade, 0.7), 0.9); }
    const dX = fb[0] - 13, dW = 12, dTop = wT + 9;
    c.beginPath(); c.moveTo(dX, baseY); c.lineTo(dX, dTop + dW / 2); c.arc(dX + dW / 2, dTop + dW / 2, dW / 2, Math.PI, 0); c.lineTo(dX + dW, baseY); c.closePath();
    c.fillStyle = LG(c, 0, dTop, 0, baseY, [mix(P.window, [120, 60, 20], 0.35), mix(P.window, [70, 30, 10], 0.65)]); c.fill(); stroke(c, Wd.edge, ew);
    c.beginPath(); c.moveTo(dX + 1.5, baseY - 0.5); c.lineTo(dX + 1.5, dTop + dW / 2); c.arc(dX + dW / 2, dTop + dW / 2, dW / 2 - 1.5, Math.PI, Math.PI * 1.45); stroke(c, rgb(B.ridge, 0.5), dt);
    const wX = fb[0] + 6, wY = wT + 11;
    c.beginPath(); c.roundRect(wX, wY, 11, 8, 1.2); c.fillStyle = LG(c, 0, wY, 0, wY + 8, [mix(P.window, [110, 50, 20], 0.3), mix(P.window, [80, 36, 10], 0.6)]); c.fill(); stroke(c, Wd.edge, ew);
    c.beginPath(); c.moveTo(wX + 5.5, wY); c.lineTo(wX + 5.5, wY + 8); stroke(c, Wd.edge, es);
    // the hip roof: eaves overhang the walls all round; ridge over the middle of the house's depth
    // things on the open right of the deck: a lidded crate, a coiled net with a float, a hand of coconuts hung on the post
    { const cb = dp([X0 + 2.4, deckY], 0.12), cw2 = 5.4, chh = 5, cd = 0.2, ct = [cb[0], cb[1] - chh];   // well inside the deck's front-left corner
      // seated on the boards of the left porch: a soft shadow off to the right and a tight dark contact line at its foot
      softShadow(c, cb[0] + cw2 / 2 + 2.2, cb[1] + 0.2, cw2 * 0.85, 1.7, P.shadowA * 1.5, 0, P.shadowC);
      c.beginPath(); c.moveTo(cb[0] - 0.3, cb[1] + 0.4); c.lineTo(cb[0] + cw2 + 1.2, cb[1] + 0.4); stroke(c, rgb(mix(Wd.edge, P.shadowC, 0.4), 0.7), 1.1);
      poly(c, [[cb[0] + cw2, cb[1]], dp([cb[0] + cw2, cb[1]], cd), dp([cb[0] + cw2, ct[1]], cd), [cb[0] + cw2, ct[1]]]); c.closePath(); c.fillStyle = rgb(mix(Wd.shade, Wd.edge, 0.3)); c.fill(); stroke(c, Wd.edge, es);
      poly(c, [ct, [ct[0] + cw2, ct[1]], dp([ct[0] + cw2, ct[1]], cd), dp(ct, cd)]); c.closePath(); c.fillStyle = LG(c, 0, ct[1] - 5, 0, ct[1], [mix(Wd.lit, B.ridge, 0.3), Wd.lit]); c.fill(); stroke(c, Wd.edge, es);
      c.beginPath(); c.rect(cb[0], ct[1], cw2, chh); c.fillStyle = LG(c, cb[0], 0, cb[0] + cw2, 0, [Wd.lit, Wd.mid]); c.fill(); stroke(c, Wd.edge, es);
      for (const f of [0.5]) furrow(c, [[cb[0] + 0.4, ct[1] + chh * f], [cb[0] + cw2 - 0.4, ct[1] + chh * f]], rgb(Wd.edge, 0.7), rgb(B.ridge, 0.4), dt, [0, -0.7]);
      furrow(c, [[cb[0] + 0.8, cb[1] - 0.8], [cb[0] + cw2 - 0.8, ct[1] + 0.8]], rgb(Wd.edge, 0.55), null, dt);
      for (const [nx, ny] of [[cb[0] + 1, ct[1] + 1], [cb[0] + cw2 - 1, ct[1] + 1], [cb[0] + 1, cb[1] - 1], [cb[0] + cw2 - 1, cb[1] - 1]]) nail(nx, ny);
      // the net: a heap of mesh with a cork float, slumped over the deck's front edge
      const nx0 = X1 - 11, ny0 = deckY + 0.5;
      c.beginPath(); c.moveTo(nx0 - 6, ny0); c.quadraticCurveTo(nx0 - 5, ny0 - 5, nx0, ny0 - 5.5); c.quadraticCurveTo(nx0 + 6, ny0 - 5, nx0 + 7, ny0); c.quadraticCurveTo(nx0 + 6.5, ny0 + 4.5, nx0 + 4, ny0 + 7); c.quadraticCurveTo(nx0 + 1, ny0 + 4, nx0 - 2, ny0 + 3.5); c.quadraticCurveTo(nx0 - 5, ny0 + 2.5, nx0 - 6, ny0); c.closePath();
      c.fillStyle = LG(c, nx0 - 6, ny0 - 5, nx0 + 6, ny0 + 6, [mix(St.lit, Wd.lit, 0.3), mix(St.mid, Wd.mid, 0.4), mix(St.shade, Wd.shade, 0.4)]); c.fill(); stroke(c, mix(St.edge, [60, 70, 70], 0.4), es);
      c.save(); c.clip();
      for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(nx0 + k * 2.2 - 4, ny0 - 6); c.lineTo(nx0 + k * 2.2 + 4, ny0 + 8); c.moveTo(nx0 + k * 2.2 + 4, ny0 - 6); c.lineTo(nx0 + k * 2.2 - 4, ny0 + 8); stroke(c, rgb(mix(St.edge, [60, 70, 70], 0.4), 0.55), 0.35); }
      c.restore();
      c.beginPath(); c.ellipse(nx0 + 2.5, ny0 - 3.5, 2.1, 1.6, 0, 0, TAU); c.fillStyle = RG(c, nx0 + 2.5, ny0 - 3.5, 2, ['#ffb08a', '#e05a3a', '#a8322a']); c.fill(); stroke(c, '#8a2a22', 0.5);
      // coconuts tied at the front right post
      const kx = X1 - 4, ky = deckY + th + 2;
      c.beginPath(); c.moveTo(kx, deckY + th); c.lineTo(kx, ky); stroke(c, St.edge, 0.6);
      for (const [dx, dy] of [[-1.6, 1.4], [1.6, 1.6], [0, 3.6]]) { c.beginPath(); c.arc(kx + dx, ky + dy, 1.9, 0, TAU); c.fillStyle = RG(c, kx + dx, ky + dy, 1.9, [B.lit, B.mid, B.edge]); c.fill(); stroke(c, B.edge, 0.5); }
    }
    // the eaves overhang the walls by the same amount front and back (ov), so the ridge sits over the middle of the
    // house's depth: the house's own centre, skewed up-right along DV like the deck and the side wall
    const eY = wT + 4, ov = 0.16, rH = 22, rl = 16;
    const FL = dp([hx0 - 7, eY], -ov), FR = dp([hx1 + 5, eY], -ov), RD = HD + ov * 2, BR = dp(FR, RD);   // the same overhang at the side as at the front, so the hip, wall and deck share one view
    const mid = dp([(hx0 + hx1) / 2, eY], HD / 2), RL = [mid[0] - rl, mid[1] - rH], RR = [mid[0] + rl, mid[1] - rH];
    const thatch = (plane, a0, a1, b0, b1, cols, rows, dens) => {
      poly(c, plane); c.closePath(); c.fillStyle = LG(c, a0[0], b0[1], a1[0], a0[1], cols); c.fill();
      c.save(); poly(c, plane); c.closePath(); c.clip();
      const pt = (u, f) => lerpPt(lerpPt(a0, a1, u), lerpPt(b0, b1, u), f);
      for (let r = 0; r < rows; r++) {
        const f0 = r / rows, f1 = (r + 1) / rows;
        for (let s2 = 0; s2 < dens; s2++) {
          const u = (s2 + R() * 0.8) / dens, p0 = pt(u, f1 + 0.02), p1 = pt(u + (R() - 0.5) * 0.01, f0 - 0.015 - R() * 0.03);
          c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); stroke(c, s2 % 3 === 1 ? rgb([255, 244, 200], 0.4) : rgb(St.edge, 0.32 + R() * 0.2), s2 % 3 === 1 ? 0.45 : 0.5);
        }
        if (r > 0) {
          const fr = []; for (let k = 0; k <= dens; k++) { const u = k / dens; fr.push(pt(u, f0 + (k % 2 ? -0.012 : 0.01) - R() * 0.012)); }
          c.save(); c.translate(0, 1.4); poly(c, fr); stroke(c, rgb(mix(St.shade, P.shadowC, 0.3), 0.55), 2); c.restore();
          poly(c, fr); stroke(c, rgb(St.edge, 0.75), 0.75);
          c.save(); c.translate(0, -0.9); poly(c, fr); stroke(c, rgb([255, 242, 196], 0.55), 0.6); c.restore();
        }
      }
      c.restore();
      poly(c, plane); c.closePath(); stroke(c, St.edge, ew);
    };
    thatch([FR, BR, RR], FR, BR, RR, RR, [St.shade, mix(St.shade, St.edge, 0.55)], 4, 14);
    thatch([FL, FR, RR, RL], FL, FR, RL, RR, [St.lit, St.mid, St.shade], 4, 40);
    c.beginPath(); c.moveTo(RL[0] - 1, RL[1] + 5); c.quadraticCurveTo(lerp(RL[0], FL[0], 0.5) - 2, lerp(RL[1], eY, 0.5), FL[0] + 5, eY - 3); stroke(c, rgb([255, 246, 210], 0.4), 1.5);
    c.beginPath(); c.moveTo(RL[0] - 2, RL[1]); c.lineTo(RR[0] + 2, RR[1]); stroke(c, St.edge, 4.4); c.beginPath(); c.moveTo(RL[0] - 2, RL[1]); c.lineTo(RR[0] + 2, RR[1]); stroke(c, St.mid, 3); c.beginPath(); c.moveTo(RL[0] - 1, RL[1] - 0.8); c.lineTo(RR[0] + 1, RR[1] - 0.8); stroke(c, rgb(St.lit, 0.9), 0.9);
    for (let k = 0; k < 4; k++) { const bx = lerp(RL[0], RR[0], (k + 0.5) / 4); c.beginPath(); c.moveTo(bx, RL[1] - 2); c.lineTo(bx + 0.6, RL[1] + 2); stroke(c, St.edge, 0.7); }
    const fringe = (a, b, n) => { const pts = [a]; for (let k = 1; k < n; k++) { const p = lerpPt(a, b, k / n); pts.push([p[0], p[1] + (k % 2 ? 2.4 + R() * 1.6 : 0.6)]); } pts.push(b); poly(c, pts); c.closePath(); };
    fringe(FL, FR, 30); c.fillStyle = LG(c, 0, FL[1], 0, FL[1] + 4, [St.mid, St.shade]); c.fill(); stroke(c, St.edge, dt);
    fringe(FR, BR, 8); c.fillStyle = rgb(mix(St.shade, St.edge, 0.3)); c.fill(); stroke(c, St.edge, dt);
    const lx = hx0 + 3, ly = eY + 9;
    c.beginPath(); c.moveTo(lx, eY + 2); c.lineTo(lx, ly - 3); stroke(c, B.edge, 0.6);
    glow(c, lx, ly, 24, [255, 170, 70], 0.55 * P.lamp);
    c.beginPath(); c.roundRect(lx - 2.2, ly - 3, 4.4, 6, 1.4); c.fillStyle = LG(c, lx - 2, 0, lx + 2, 0, ['#fff2b0', '#ffb040', '#e07020']); c.fill(); stroke(c, B.edge, 0.6);
    c.beginPath(); c.moveTo(lx - 2.6, ly - 3); c.lineTo(lx + 2.6, ly - 3); c.moveTo(lx - 2.6, ly + 3); c.lineTo(lx + 2.6, ly + 3); stroke(c, B.edge, 0.9);
    const fx = mid[0], fy = mid[1] - rH;
    c.beginPath(); c.moveTo(fx, fy + 1); c.lineTo(fx, fy - 15); stroke(c, B.edge, 1.6); c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - 14); stroke(c, B.lit, 0.8);
    const fw = Math.sin((t || 0) * 3) * 1.2;
    c.beginPath(); c.moveTo(fx + 0.5, fy - 14.5); c.quadraticCurveTo(fx + 6, fy - 15.5 + fw, fx + 11, fy - 12.5); c.quadraticCurveTo(fx + 6, fy - 10.5 - fw, fx + 0.5, fy - 9.5); c.closePath();
    c.fillStyle = LG(c, fx, fy - 15, fx, fy - 9, ['#ff7a62', '#e2463a', '#a8262a']); c.fill(); stroke(c, '#8a1e22', es);
    // the ladder from the deck's front edge under the door, leaning out onto the sand
    const la = dX + 1, lb = dX + dW - 1, lt = deckY + th;
    softShadow(c, (la + lb) / 2 + 1, 5.5, 7, 1.6, P.shadowA * 1.2, 0, P.shadowC);
    for (const [x0, x1] of [[la, la - 2], [lb, lb - 0.5]]) { c.beginPath(); c.moveTo(x0, lt); c.lineTo(x1, 5); stroke(c, B.edge, 2.3); c.beginPath(); c.moveTo(x0, lt); c.lineTo(x1, 5); stroke(c, B.mid, 1.3); c.beginPath(); c.moveTo(x0 - 0.4, lt); c.lineTo(x1 - 0.4, 5); stroke(c, rgb(B.ridge, 0.4), 0.4); }
    for (let k = 1; k < 5; k++) { const f = k / 5, yy = lerp(lt, 5, f); c.beginPath(); c.moveTo(lerp(la, la - 2, f), yy); c.lineTo(lerp(lb, lb - 0.5, f), yy); stroke(c, B.edge, 1.9); c.beginPath(); c.moveTo(lerp(la, la - 2, f), yy - 0.3); c.lineTo(lerp(lb, lb - 0.5, f), yy - 0.3); stroke(c, B.lit, 0.8); }
    c.restore();
    return { lamp: [x + lx * S, y + ly * S], door: [x + (dX + dW / 2) * S, y + (dTop + 10) * S] };
  }

  // ---------------- clearings, the pad, tokens ----------------
  // the stone clearing every level sits on: packed earth round a disc of flagstones, each slab lit on its top-left and
  // edged in its own darker stone; the launch pad is the same build, bigger, with a painted target
  function clearing(c, P, x, y, rx, target) {
    const K = P.rock, R = P.road, ry = rx * 0.5;
    softShadow(c, x + rx * 0.15, y + ry * 0.35, rx * 1.15, ry * 1.1, P.shadowA * 0.8, 0, P.shadowC);
    // the ring's slabs stand a little proud of the ground: a short soft shadow off their lower right, like everything else's
    softShadow(c, x + rx * 0.12 + 2, y + ry * 0.22 + 2.2, rx + 5, ry + 3, P.shadowA * 1.5, 0, P.shadowC);
    c.beginPath(); c.ellipse(x, y, rx + 4, ry + 2.5, 0, 0, TAU); c.fillStyle = LG(c, x - rx, y - ry, x + rx, y + ry, [R.lit, R.mid, R.shade]); c.fill(); stroke(c, rgb(R.edge, 0.8), EW_S);
    const slab = (pts, k) => {
      closedSmooth(c, pts); c.fillStyle = LG(c, x - rx, y - ry, x + rx, y + ry, [mix(K.lit, K.mid, k), mix(K.mid, K.shade, k * 0.6), mix(K.shade, K.edge, 0.2)]); c.fill(); stroke(c, K.edge, EW_S);
      c.beginPath(); c.moveTo(...lerpPt(pts[pts.length - 1], pts[0], 0.5)); c.lineTo(...pts[0]); c.lineTo(...lerpPt(pts[0], pts[1], 0.6)); stroke(c, 'rgba(255,255,240,.45)', 0.6);
    };
    const n = rx > 30 ? 12 : 10, r0 = 0.5, r1 = 0.96;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU + 0.12, a1 = (i + 1) / n * TAU + 0.12 - 0.07, am = (a0 + a1) / 2, pts = [];
      for (const [a, rr] of [[a0, r0], [am, r0 - 0.02], [a1, r0], [a1, r1], [am, r1 + 0.02], [a0, r1]]) pts.push([x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr]);
      slab(pts, (Math.sin(am) > 0 ? 0.3 : 0) + (i % 3) * 0.06);
    }
    const cpts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; cpts.push([x + Math.cos(a) * rx * 0.43, y + Math.sin(a) * ry * 0.43]); }
    slab(cpts, 0.08);
    if (target) {
      for (const [k, cc] of [[0.4, [238, 228, 200]], [0.3, [204, 72, 56]], [0.2, [238, 228, 200]], [0.1, [204, 72, 56]]]) { c.beginPath(); c.ellipse(x, y, rx * k, ry * k, 0, 0, TAU); c.fillStyle = rgb(cc, 0.75); c.fill(); }
      c.beginPath(); c.ellipse(x, y, rx * 0.4, ry * 0.4, 0, 0, TAU); stroke(c, rgb(K.edge, 0.6), EW_S);
    }
  }
  function torch(c, P, x, y) {
    const B = P.bark;
    castShadow(c, P, x, y, 22, 4);
    c.beginPath(); c.roundRect(x - 1.4, y - 20, 2.8, 20, 1); c.fillStyle = LG(c, x - 1.4, 0, x + 1.4, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S);
    c.beginPath(); c.moveTo(x - 0.6, y - 19); c.lineTo(x - 0.6, y - 1); stroke(c, rgb(B.ridge, 0.4), 0.45);
    for (const yy of [y - 12, y - 6]) furrow(c, [[x - 1.4, yy], [x + 1.4, yy + 0.4]], rgb(B.edge, 0.6), rgb(B.ridge, 0.3), 0.5, [0, -0.6]);
    c.beginPath(); c.moveTo(x - 2.6, y - 20); c.lineTo(x + 2.6, y - 20); c.lineTo(x + 1.8, y - 16); c.lineTo(x - 1.8, y - 16); c.closePath(); c.fillStyle = LG(c, 0, y - 20, 0, y - 16, [P.straw.mid, P.straw.shade]); c.fill(); stroke(c, P.straw.edge, EW_S);
    glow(c, x, y - 24, 22, [255, 150, 50], 0.3 * P.glowK + 0.1);
    c.beginPath(); c.moveTo(x, y - 31); c.quadraticCurveTo(x + 4, y - 24, x + 2.6, y - 21); c.quadraticCurveTo(x, y - 19.6, x - 2.6, y - 21); c.quadraticCurveTo(x - 4, y - 24, x, y - 31); c.closePath();
    c.fillStyle = LG(c, 0, y - 31, 0, y - 20, ['#fff2a0', '#ffb030', '#ff6a1a']); c.fill();
    c.beginPath(); c.ellipse(x - 0.5, y - 23, 1.2, 2.2, 0, 0, TAU); c.fillStyle = 'rgba(255,255,230,.85)'; c.fill();
  }
  // a signpost: one post with arrow planks on it (centred, or shifted along themselves), each pointing along `ang` (radians, 0 = right; the plank
  // tilts toward its road but never so far that its text stops reading level). planks: [[text, ang], ...]
  function signpost(c, P, x, y, planks, maxTilt = 0.45) {
    const B = P.bark, ph = 20 + planks.length * 19, sun = P.sun ?? SUN, Ls = ph * (P.shLen ?? 0.3) * 1.4;
    castShadow(c, P, x, y, ph, 5);
    softShadow(c, x + Math.cos(sun) * Ls, y + 2 + Math.sin(sun) * Ls * 0.6, 20, 3.2, P.shadowA * 0.75, sun * 0.6, P.shadowC);
    // a stout squared post: a lit face and a shaded side face, grain furrows, a sawn top with end-grain rings, a
    // flared foot where it's set in the ground
    const pw = 3.2;
    c.beginPath(); c.moveTo(x - pw - 1.2, y + 0.6); c.quadraticCurveTo(x - pw, y - 1, x - pw, y - 3); c.lineTo(x + pw, y - 3); c.quadraticCurveTo(x + pw, y - 1, x + pw + 1.4, y + 0.6); c.closePath(); c.fillStyle = rgb(mix(P.earth.mid, B.shade, 0.4)); c.fill();
    c.beginPath(); c.roundRect(x - pw, y - ph, pw * 2, ph, 1); c.fillStyle = LG(c, x - pw, 0, x + pw, 0, [B.lit, B.lit, B.mid, B.shade]); c.fill();
    c.fillStyle = rgb(B.shade, 0.55); c.fillRect(x + pw * 0.35, y - ph + 1, pw * 0.65, ph - 1);
    for (const [fx, ph2] of [[-0.55, 0], [-0.1, 2], [0.6, 4]]) furrow(c, [[x + fx * pw, y - ph + 2], [x + fx * pw + Math.sin(ph2) * 0.4, y - ph * 0.55], [x + fx * pw - 0.3, y - 1]], rgb(B.edge, 0.45), fx < 0.3 ? rgb(B.ridge, 0.45) : null, 0.5, [-0.7, 0]);
    c.beginPath(); c.roundRect(x - pw, y - ph, pw * 2, ph, 1); stroke(c, B.edge, EW_S);
    c.beginPath(); c.ellipse(x, y - ph, pw, 1.3, 0, 0, TAU); c.fillStyle = rgb(mix(B.lit, B.ridge, 0.35)); c.fill(); stroke(c, B.edge, 0.55);
    for (const k of [0.35, 0.7]) { c.beginPath(); c.ellipse(x + 0.2, y - ph, pw * k, 1.3 * k, 0, 0, TAU); stroke(c, rgb(B.edge, 0.35), 0.4); }
    planks.forEach(([text, ang, shift], k) => plank(c, P, x, y - ph + 12 + k * 19, text, ang, maxTilt, shift));
  }
  // one board of a signpost, pointing along ang. ang 'up' (for a road that leaves straight ahead, up the screen) is a
  // square-ended board with an up arrow painted on it, reaching out to the left. shift moves the board along itself
  // toward its tip ('tail': nailed to the post by its tail end); the nails always sit over the post
  function plank(c, P, x, y, text, ang, maxTilt = 0.45, shift = 0) {
    const B = P.bark, Wd = P.wood, up = ang === 'up', left = up || Math.cos(ang) < 0;
    let rot = up ? 0 : left ? ang - Math.PI : ang; while (rot > Math.PI) rot -= TAU; while (rot < -Math.PI) rot += TAU; rot = clamp(rot, -maxTilt, maxTilt);
    c.save(); c.translate(x, y); c.rotate(rot); if (left) c.scale(-1, 1);
    c.font = '11.5px "Lilita One"'; const tw = c.measureText(text).width, w = tw + (up ? 24 : 19), h = 14, x0 = -w / 2, x1 = w / 2, by = -h / 2;
    const sh = shift === 'tail' ? w / 2 - 4 : shift || 0;
    c.translate(sh, 0);
    const shape = up ? [[x0, by + 1], [x1 - 1, by], [x1, by + 1.5], [x1, by + h - 1.5], [x1 - 1, by + h], [x0, by + h - 1]] : [[x0, by + 1], [x1 - 7, by], [x1, 0], [x1 - 7, by + h], [x0, by + h - 1], [x0 + 2.2, 0]];
    c.save(); c.translate(left ? -0.9 : 0.9, 1.4); poly(c, shape); c.closePath(); c.fillStyle = rgb(P.shadowC, 0.35); c.fill(); c.restore();
    poly(c, shape); c.closePath(); c.fillStyle = LG(c, 0, by, 0, by + h, [mix(Wd.lit, B.ridge, 0.25), Wd.lit, Wd.mid]); c.fill(); stroke(c, Wd.edge, EW);
    c.save(); poly(c, shape); c.closePath(); c.clip();
    // wood grain: long wavy line pairs along the board, one swirling round a knot
    for (const [gy, a, ph2] of [[by + 2.6, 0.5, 0], [by + 5.2, 0.28, 1.7], [by + h - 4.6, 0.28, 3.1], [by + h - 2.4, 0.45, 4.4]]) { const pts = []; for (let q = 0; q <= 10; q++) { const gx = lerp(x0, x1, q / 10); pts.push([gx, gy + 0.5 * Math.sin(q * 0.9 + ph2) + (Math.abs(gx - (x1 - 12)) < 4 && gy > 0 ? -1.2 * Math.cos((gx - (x1 - 12)) / 4 * Math.PI / 2) : 0)]); } furrow(c, pts, rgb(Wd.edge, a), rgb(B.ridge, 0.5), 0.55, [0, -0.7]); }
    c.beginPath(); c.ellipse(x1 - 12, by + h - 3.4, 1.8, 0.8, 0, 0, TAU); c.fillStyle = rgb(Wd.shade, 0.8); c.fill(); stroke(c, rgb(Wd.edge, 0.6), 0.45);
    // the sawn end: end-grain arcs and a darker end face
    { const ex = up ? x1 : x0; c.fillStyle = rgb(Wd.shade, 0.45); c.fillRect(up ? x1 - 1.6 : x0, by, 1.6, h); for (const k of [0.3, 0.6]) { c.beginPath(); c.ellipse(ex, 0, 2.2 * k + 0.4, h * 0.35 * k + 1, 0, up ? Math.PI / 2 : -Math.PI / 2, up ? Math.PI * 1.5 : Math.PI / 2); stroke(c, rgb(Wd.edge, 0.4), 0.4); } }
    c.restore();
    // two nails through the board into the post (the post runs behind every board)
    for (const ny of [by + 2.4, by + h - 2.4]) { c.beginPath(); c.arc(-sh, ny, 0.85, 0, TAU); c.fillStyle = rgb(mix(Wd.edge, [40, 40, 52], 0.35)); c.fill(); c.beginPath(); c.arc(-sh - 0.25, ny - 0.25, 0.32, 0, TAU); c.fillStyle = 'rgba(255,255,240,.75)'; c.fill(); }
    if (left) c.scale(-1, 1);
    const ink = rgb(mix(Wd.edge, Wd.shade, 0.2)), tx = up ? 4.5 : left ? 2.2 : -2.2;   // the carved wall, in the wood's own brown
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // letters cut into the board and painted: a lit lip on the groove's lower right, the dark carved wall showing at
    // its upper left, then the cream paint laid in the groove
    c.fillStyle = rgb(B.ridge, 0.8); c.fillText(text, tx + 0.6, 1.5);
    c.lineJoin = 'round'; c.strokeStyle = ink; c.lineWidth = 0.9; c.strokeText(text, tx, 0.7);
    c.fillStyle = ink; c.fillText(text, tx, 0.7);
    c.fillStyle = LG(c, 0, -5, 0, 6, [[255, 244, 212], [236, 210, 160]]); c.fillText(text, tx + 0.35, 1.05);
    if (up) {   // the painted arrow at the board's free end
      const ax = -w / 2 + 7;
      for (const [dx, dy, cl] of [[0.6, 0.8, rgb(B.ridge, 0.8)], [0, 0, ink], [0.3, 0.35, 'rgb(246,226,184)']]) { c.beginPath(); c.moveTo(ax + dx, -4.6 + dy); c.lineTo(ax + 3.4 + dx, -0.6 + dy); c.lineTo(ax + 1.2 + dx, -0.6 + dy); c.lineTo(ax + 1.2 + dx, 4.4 + dy); c.lineTo(ax - 1.2 + dx, 4.4 + dy); c.lineTo(ax - 1.2 + dx, -0.6 + dy); c.lineTo(ax - 3.4 + dx, -0.6 + dy); c.closePath(); c.fillStyle = cl; c.fill(); }
    }
    c.restore();
  }
  function sign(c, P, x, y, text, ang) { signpost(c, P, x, y, [[text, ang]]); }
  function star(c, x, y, r, filled) {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    c.save(); c.translate(0.6, 0.9); poly(c, pts); c.closePath(); c.fillStyle = 'rgba(60,30,6,.35)'; c.fill(); c.restore();
    poly(c, pts); c.closePath(); c.lineJoin = 'round';
    c.fillStyle = filled ? LG(c, x, y - r, x, y + r, [COIN.lit, COIN.hi, COIN.mid, COIN.lo]) : LG(c, x, y - r, x, y + r, [[176, 160, 140], [118, 104, 90]]); c.fill();
    stroke(c, filled ? COIN.edge : [80, 66, 56], EW_S);
    c.beginPath(); c.moveTo(x - r * 0.22, y - r * 0.55); c.lineTo(x - r * 0.42, y - r * 0.05); stroke(c, filled ? 'rgba(255,255,240,.85)' : 'rgba(230,220,200,.5)', 0.8);
  }
  // a level: the gold coin token standing on its clearing, its stars on a small plaque below it (clear of the coin
  // and the stones), and the glow; the open level adds a pulsing ring. The open level's light pool on the ground is
  // drawn by nodeGlow before the clearings, so it never washes out the stones
  const TOKEN_R = 17, TOKEN_LIFT = 14;
  // the open level's light on the ground: drawn over its stones and the grass round them (screen + soft-light, so the
  // stones and grass are lit, not covered): a wide warm falloff, a brighter core under the coin, and a faint ring
  function nodeGlow(c, x, y, t = 0) {
    const k = 1 + 0.08 * Math.sin(t * 2.4);
    lightPool(c, x, y + 1, 64 * k, 27 * k, [255, 214, 120], 0.42);
    lightPool(c, x, y + 1, 30, 12.5, [255, 236, 170], 0.55);
    c.save(); c.translate(x, y + 1); c.scale(1, 0.42); c.beginPath(); c.arc(0, 0, 44 * k, 0, TAU); c.strokeStyle = 'rgba(255,230,150,.22)'; c.lineWidth = 2.4; c.stroke(); c.restore();
  }
  // opt: { r (a bigger coin), img (a portrait set in the coin instead of the numeral: the boss), locked (a grey
  // stone coin with a padlock and no stars) }
  const STONECOIN = { lit: [236, 232, 222], hi: [200, 194, 182], mid: [154, 148, 138], lo: [110, 104, 98], edge: [84, 78, 74], deep: [62, 58, 56] };
  function node(c, P, x, y, num, stars, open, t, opt = {}) {
    const R = opt.r || TOKEN_R, ty = y - TOKEN_LIFT - (R - TOKEN_R), locked = !!opt.locked;
    if (open) {
      // the open level's marker lies on the ground: a warm gold light round the clearing, and a gold rim traced
      // along the clearing's own edge (the same ellipse, so it shares the ground's perspective)
      const pu = 0.5 + 0.5 * Math.sin((t || 0) * 3), ex = 32, ey = 16.5;
      lightPool(c, x, y + 1, ex + 16 + pu * 2, ey + 8 + pu, [255, 214, 120], 0.4);
      c.beginPath(); c.ellipse(x, y, ex + 1.4, ey + 0.9, 0, 0, TAU); stroke(c, 'rgba(255,214,110,.35)', 3.4);
      c.beginPath(); c.ellipse(x, y, ex + 1.4, ey + 0.9, 0, 0, TAU); stroke(c, 'rgba(255,238,170,.9)', 1);
      glow(c, x, ty, 30, [255, 214, 110], 0.32);
    } else if (!locked) glow(c, x, ty, 32, [255, 200, 90], 0.2 * P.glowK + 0.12);
    castShadow(c, P, x, y + 1, R * 1.9, R * 1.6);
    // the coin stands in a slotted stone socket on the centre slab: the socket's back half first, then the coin, then
    // the socket's front lip over the coin's foot, with a contact shadow where it all sits on the stones
    const K = P.rock, sY = y + 0.6, sRx = 9.5, sRy = 3.6;
    softShadow(c, x + 1.5, sY + 2.2, sRx + 3, sRy + 1.4, P.shadowA * 1.8, 0, P.shadowC);
    c.beginPath(); c.ellipse(x, sY, sRx, sRy, 0, 0, TAU); c.fillStyle = LG(c, x - sRx, sY - sRy, x + sRx, sY + sRy, [K.lit, K.mid]); c.fill(); stroke(c, K.edge, EW_S);
    c.beginPath(); c.ellipse(x, sY, sRx * 0.62, sRy * 0.45, 0, 0, TAU); c.fillStyle = rgb(mix(K.edge, [20, 20, 24], 0.4)); c.fill();
    const P2 = locked ? STONECOIN : COIN, F = R - 2.9;
    c.beginPath(); c.arc(x, ty, R, 0, TAU); c.fillStyle = (() => { const g = c.createRadialGradient(x - R * 0.35, ty - R * 0.38, 1, x - 1, ty - 1, R + 1); [[0, P2.lit], [0.35, P2.hi], [0.75, P2.mid], [1, P2.lo]].forEach(([o, cc]) => g.addColorStop(o, rgb(cc))); return g; })(); c.fill();
    c.beginPath(); c.arc(x, ty, R - 0.5, 0, TAU); stroke(c, rgb(P2.edge, 0.9), EW);
    c.beginPath(); c.arc(x, ty, R - 1.3, 3.5, 5.5); stroke(c, rgb(P2.lit, 0.85), 1.1);
    c.beginPath(); c.arc(x, ty, F, 0, TAU); c.fillStyle = (() => { const g = c.createRadialGradient(x + R * 0.2, ty + R * 0.25, 1, x + 1, ty + 1, F + 2); [[0, P2.hi], [0.55, P2.mid], [1, P2.lo]].forEach(([o, cc]) => g.addColorStop(o, rgb(cc))); return g; })(); c.fill();
    c.beginPath(); c.arc(x, ty, F - 0.4, 3.3, 5.7); stroke(c, rgb(P2.deep, 0.5), 1.1);
    c.beginPath(); c.arc(x, ty, F - 0.4, 0.2, 2.6); stroke(c, rgb(P2.lit, 0.6), 0.9);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, bx = x + Math.cos(a) * (R - 1.5), by = ty + Math.sin(a) * (R - 1.5); c.fillStyle = rgb(P2.deep, 0.3); c.beginPath(); c.arc(bx + 0.25, by + 0.3, 0.6, 0, TAU); c.fill(); c.fillStyle = rgb(P2.lit, 0.85); c.beginPath(); c.arc(bx - 0.1, by - 0.1, 0.5, 0, TAU); c.fill(); }
    if (opt.img && opt.img.naturalWidth) {   // the portrait set into the coin's face, a dark inner ring round it
      c.save(); c.beginPath(); c.arc(x, ty, F - 0.6, 0, TAU); c.clip();
      c.fillStyle = RG(c, x, ty, F, [[120, 96, 120], [52, 40, 60]]); c.fillRect(x - F, ty - F, F * 2, F * 2);
      const k = F * 2.5; c.drawImage(opt.img, x - k / 2, ty - k * 0.47, k, k);
      c.restore(); c.beginPath(); c.arc(x, ty, F - 0.4, 0, TAU); stroke(c, rgb(P2.deep, 0.7), 1);
      c.beginPath(); c.arc(x, ty, F - 0.9, 3.4, 5.6); stroke(c, 'rgba(255,255,240,.35)', 0.8);
    }
    c.font = '19px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const ny = ty + 1.2;
    // the numeral, pressed into the coin (a lit lower-right lip, a dark upper-left wall); a "1" is drawn by hand with
    // a short flag and no foot, so it can never be read as a "7"
    const one = num === '1' ? (() => { const g = new Path2D(), sx = x - 2.1, top = ny - 7.6, bot = ny + 7.4, rx2 = x + 2.1;
      g.moveTo(sx + 0.6, top); g.lineTo(rx2 - 0.9, top); g.quadraticCurveTo(rx2, top, rx2, top + 0.9); g.lineTo(rx2, bot - 2.4); g.lineTo(rx2 + 1.9, bot - 2.4); g.quadraticCurveTo(rx2 + 2.6, bot - 2.4, rx2 + 2.6, bot - 1.6); g.lineTo(rx2 + 2.6, bot - 0.7); g.quadraticCurveTo(rx2 + 2.6, bot, rx2 + 1.9, bot);
      g.lineTo(sx - 1.9, bot); g.quadraticCurveTo(sx - 2.6, bot, sx - 2.6, bot - 0.7); g.lineTo(sx - 2.6, bot - 1.6); g.quadraticCurveTo(sx - 2.6, bot - 2.4, sx - 1.9, bot - 2.4); g.lineTo(sx, bot - 2.4);
      g.lineTo(sx, top + 3.8); g.lineTo(sx - 1.6, top + 4.3); g.quadraticCurveTo(sx - 2.5, top + 4.5, sx - 2.5, top + 3.6); g.lineTo(sx - 2.5, top + 3.1); g.quadraticCurveTo(sx - 2.4, top + 2.4, sx - 1.7, top + 2.1); g.closePath(); return g; })() : null;
    const glyph = (dx, dy) => { if (opt.img) return; if (one) { c.save(); c.translate(dx, dy); c.fill(one); c.restore(); } else c.fillText(num, x + dx, ny + dy); };
    c.fillStyle = rgb(P2.lit, 0.9); glyph(0.8, 0.9);
    c.fillStyle = rgb(P2.deep, 0.8); glyph(-0.6, -0.6);
    c.fillStyle = LG(c, x, ty - 8, x, ty + 8, locked ? [[110, 104, 98], [80, 74, 70]] : [[160, 92, 14], [120, 66, 8]]); glyph(0, 0);
    c.fillStyle = 'rgba(255,255,248,.95)'; c.beginPath(); c.ellipse(x - R * 0.58, ty - R * 0.62, 2, 0.8, -0.8, 0, TAU); c.fill();
    // the socket's front: the lip of its top face in front of the slot (it hides the coin's foot), then its side band
    c.beginPath(); c.ellipse(x, sY, sRx, sRy, 0, 0, Math.PI); c.ellipse(x, sY, sRx * 0.62, sRy * 0.45, 0, Math.PI, 0, true); c.closePath(); c.fillStyle = LG(c, x - sRx, sY, x + sRx, sY + sRy, [K.lit, K.mid]); c.fill();
    c.beginPath(); c.ellipse(x, sY, sRx * 0.62, sRy * 0.45, 0, 0.1, Math.PI - 0.1); stroke(c, rgb(K.edge, 0.8), 0.6);
    c.beginPath(); c.ellipse(x, sY, sRx, sRy, 0, 0, Math.PI); c.lineTo(x - sRx, sY + 2.6); c.ellipse(x, sY + 2.6, sRx, sRy, 0, Math.PI, 0, true); c.closePath();
    c.fillStyle = LG(c, x - sRx, 0, x + sRx, 0, [K.lit, K.mid, K.shade]); c.fill(); stroke(c, K.edge, EW_S);
    c.beginPath(); c.ellipse(x, sY, sRx, sRy, 0, 0.25, Math.PI - 0.25); stroke(c, rgb([255, 255, 240], 0.45), 0.6);
    if (locked) { padlock(c, x + R * 0.62, ty + R * 0.55, 1); return; }
    // the stars' plaque: a small dark wooden pill below the socket
    const py = y + 12, pw = 40, phh = 12;
    c.beginPath(); c.roundRect(x - pw / 2 + 0.8, py - phh / 2 + 1.2, pw, phh, phh / 2); c.fillStyle = rgb(P.shadowC, 0.35); c.fill();
    c.beginPath(); c.roundRect(x - pw / 2, py - phh / 2, pw, phh, phh / 2); c.fillStyle = LG(c, 0, py - phh / 2, 0, py + phh / 2, [[110, 66, 34], [78, 44, 20]]); c.fill(); stroke(c, [56, 30, 12], EW_S);
    c.beginPath(); c.moveTo(x - pw / 2 + 5, py - phh / 2 + 1.6); c.lineTo(x + pw / 2 - 5, py - phh / 2 + 1.6); stroke(c, 'rgba(255,220,160,.35)', 0.7);
    for (let i = 0; i < 3; i++) star(c, x + (i - 1) * 12, py - (i === 1 ? 0.6 : 0), i === 1 ? 5.4 : 4.7, i < stars);
  }
  // a small iron padlock (locked levels): a shackle arc, a body lit at its top left, a keyhole
  function padlock(c, x, y, s = 1) {
    c.beginPath(); c.arc(x, y - 2.6 * s, 2.6 * s, Math.PI, 0); stroke(c, [70, 66, 70], 2.2 * s); c.beginPath(); c.arc(x, y - 2.6 * s, 2.6 * s, Math.PI, 0); stroke(c, [188, 186, 192], 1 * s);
    c.save(); c.translate(0.5, 1); c.beginPath(); c.roundRect(x - 4 * s, y - 2.6 * s, 8 * s, 6.6 * s, 1.4 * s); c.fillStyle = 'rgba(30,20,10,.35)'; c.fill(); c.restore();
    c.beginPath(); c.roundRect(x - 4 * s, y - 2.6 * s, 8 * s, 6.6 * s, 1.4 * s); c.fillStyle = LG(c, x - 4 * s, y - 2.6 * s, x + 4 * s, y + 4 * s, [[255, 226, 140], [214, 160, 50], [150, 98, 24]]); c.fill(); stroke(c, [110, 66, 14], 0.7);
    c.beginPath(); c.arc(x, y + 0.2 * s, 1 * s, 0, TAU); c.fillStyle = '#5a3208'; c.fill(); c.fillRect(x - 0.4 * s, y + 0.2 * s, 0.8 * s, 2 * s);
    c.beginPath(); c.moveTo(x - 3 * s, y - 1.6 * s); c.lineTo(x + 2.4 * s, y - 1.6 * s); stroke(c, 'rgba(255,255,240,.7)', 0.6);
  }
  function banner(c, x, y, text) {
    c.font = '10.5px "Lilita One"'; const w = c.measureText(text).width + 18, h = 16, x0 = x - w / 2;
    const shape = () => { c.beginPath(); c.moveTo(x0 + h / 2, y - h / 2); c.lineTo(x0 + w - h / 2, y - h / 2); c.arc(x0 + w - h / 2, y, h / 2, -Math.PI / 2, Math.PI / 2); c.lineTo(x + 6, y + h / 2); c.lineTo(x, y + h / 2 + 7); c.lineTo(x - 6, y + h / 2); c.lineTo(x0 + h / 2, y + h / 2); c.arc(x0 + h / 2, y, h / 2, Math.PI / 2, Math.PI * 1.5); c.closePath(); };
    c.save(); c.translate(0.8, 1.6); shape(); c.fillStyle = 'rgba(40,20,6,.35)'; c.fill(); c.restore();
    shape(); c.fillStyle = LG(c, 0, y - h / 2, 0, y + h / 2, [COIN.lit, COIN.hi, COIN.mid]); c.fill(); stroke(c, COIN.edge, EW);
    c.beginPath(); c.moveTo(x0 + 6, y - h / 2 + 2.6); c.lineTo(x0 + w - 6, y - h / 2 + 2.6); stroke(c, 'rgba(255,255,240,.7)', 1);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = rgb(COIN.lit, 0.8); c.fillText(text, x + 0.5, y + 1.6);
    c.fillStyle = '#7c4612'; c.fillText(text, x, y + 0.9);
  }
  // a rocket's thruster flame pointing down from (x, y): an orange outer flame, a yellow inner one, a white-hot core,
  // a soft glow round it and a hot spot where it licks the ground
  function thruster(c, x, y, len, w, t = 0) {
    const fl = len * (1 + 0.06 * Math.sin(t * 20));
    glow(c, x, y + fl * 0.55, fl * 1.1, [255, 170, 70], 0.5);
    glow(c, x, y + fl, fl * 0.6, [255, 220, 140], 0.55);
    const flame = (ww, ll, cols) => { c.beginPath(); c.moveTo(x - ww / 2, y); c.bezierCurveTo(x - ww * 0.62, y + ll * 0.35, x - ww * 0.2, y + ll * 0.75, x, y + ll); c.bezierCurveTo(x + ww * 0.2, y + ll * 0.75, x + ww * 0.62, y + ll * 0.35, x + ww / 2, y); c.closePath(); c.fillStyle = LG(c, 0, y, 0, y + ll, cols); c.fill(); };
    flame(w, fl, ['rgba(255,200,90,1)', 'rgba(255,120,40,.95)', 'rgba(230,60,30,0)']);
    flame(w * 0.62, fl * 0.75, ['#fffbe0', '#ffe070', 'rgba(255,170,60,0)']);
    flame(w * 0.3, fl * 0.45, ['#ffffff', 'rgba(255,255,230,.9)', 'rgba(255,240,180,0)']);
  }
  function firefly(c, x, y, a) { glow(c, x, y, 7, [220, 255, 140], a); c.fillStyle = `rgba(250,255,210,${a + 0.2})`; c.beginPath(); c.arc(x, y, 0.8, 0, TAU); c.fill(); }


  // ================= the temple, the bog and the boss lair (screen 2 on) =================
  // a closed outline (dense points) pushed out (d > 0) or in (d < 0) whichever way round it was drawn; d may be (p, i) => d
  function offsetClosed(pts, d) {
    const n = pts.length; let A = 0; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
    const sg = A > 0 ? -1 : 1;   // drawn clockwise on screen (A > 0): the right of travel is inward
    return pts.map((p, i) => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, dd = (typeof d === 'function' ? d(p, i) : d) * sg; return [p[0] - dy / L * dd, p[1] + dx / L * dd]; });
  }
  // a smooth closed curve through control points (Catmull-Rom, wrapping round)
  function closedSpline(pts, per = 8) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
    }
    return out;
  }
  // points every `step` along a polyline, each with its unit tangent: [x, y, tx, ty]
  function resample(pts, step) {
    const out = []; let need = step;
    for (let i = 1; i < pts.length; i++) {
      let ax = pts[i - 1][0], ay = pts[i - 1][1]; const bx = pts[i][0], by = pts[i][1]; let L = Math.hypot(bx - ax, by - ay); if (!L) continue;
      const tx = (bx - ax) / L, ty = (by - ay) / L;
      if (!out.length) out.push([ax, ay, tx, ty]);
      while (L >= need) { ax += tx * need; ay += ty * need; L -= need; out.push([ax, ay, tx, ty]); need = step; }
      need -= L;
    }
    return out;
  }
  // ---- carved temple stone ----
  // a glyph cut into a stone face (s = half its size): 0 a squared spiral, 1 a step fret, 2 a sun eye; each line a
  // carved groove: the dark wall at its upper left, a lit lip at its lower right
  function glyph(c, P, x, y, s, kind = 0, a = 1) {
    const K = P.stone, sets = [
      [[[-1, 1], [-1, -1], [1, -1], [1, 0.7], [-0.35, 0.7], [-0.35, -0.3], [0.4, -0.3]]],
      [[[-1, 1], [-1, 0.3], [-0.35, 0.3], [-0.35, -0.35], [0.3, -0.35], [0.3, -1], [1, -1]], [[-0.2, 1], [0.6, 1], [0.6, 0.3]]],
      [Array.from({ length: 15 }, (_, i) => [Math.cos(i / 14 * TAU) * 0.62, Math.sin(i / 14 * TAU) * 0.62]), [[-1, 0], [-0.78, 0]], [[1, 0], [0.78, 0]], [[0, -1], [0, -0.8]], [[0, 1], [0, 0.8]]],
    ][kind % 3];
    for (const l of sets) { const pts = l.map(([u, v]) => [x + u * s, y + v * s]); c.save(); c.translate(0.5, 0.6); poly(c, pts); stroke(c, rgb(K.ridge, 0.55 * a), Math.max(0.5, s * 0.16)); c.restore(); poly(c, pts); stroke(c, rgb(K.edge, 0.7 * a), Math.max(0.55, s * 0.2)); }
    if (kind % 3 === 2) { c.beginPath(); c.arc(x, y, s * 0.2, 0, TAU); c.fillStyle = rgb(K.edge, 0.6 * a); c.fill(); }
  }
  // dressed blocks on a wall face between its top line and its foot (equal-length point lists): courses of blocks with
  // staggered joints, each block its own tone, every joint a dark furrow with the lit edge of the next block beside it,
  // the odd crack and the odd carved glyph
  function ashlar(c, P, top, foot, seed, courses = 2, jw = [10, 17]) {
    const K = P.stone, R = rand(seed), n = top.length;
    const at = (i, f) => [lerp(top[i][0], foot[i][0], f), lerp(top[i][1], foot[i][1], f)];
    const len = [0]; for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(top[i][0] - top[i - 1][0], top[i][1] - top[i - 1][1]));
    const L = len[n - 1], idx = s => { let i = 0; while (i < n - 1 && len[i] < s) i++; return i; };
    for (let k = 0; k < courses; k++) {
      const f0 = k / courses, f1 = (k + 1) / courses, cuts = [0]; let s = (k % 2 ? jw[0] * 0.55 : 0) + R() * 3;
      for (;;) { s += jw[0] + R() * (jw[1] - jw[0]); if (s > L - jw[0] * 0.5) break; cuts.push(idx(s)); }
      cuts.push(n - 1);
      for (let b = 0; b < cuts.length - 1; b++) {
        const i0 = cuts[b], i1 = cuts[b + 1]; if (i1 - i0 < 1) continue;
        const bl = []; for (let i = i0; i <= i1; i++) bl.push(at(i, f0 + 0.01)); for (let i = i1; i >= i0; i--) bl.push(at(i, f1 - 0.01));
        poly(c, bl); c.closePath(); const tn = R(); c.fillStyle = tn < 0.5 ? rgb(K.lit, 0.08 + tn * 0.2) : rgb(K.shade, (tn - 0.5) * 0.36); c.fill();
        // the block's lit top edge and its shaded foot (each block is slightly pillowed)
        const tl = []; for (let i = i0; i <= i1; i++) { const p = at(i, f0); tl.push([p[0], p[1] + 0.9]); }
        if (tl.length > 1) { poly(c, tl.slice(0, Math.max(2, tl.length - 1))); stroke(c, rgb(K.ridge, 0.4), 0.6); }
        const fl = []; for (let i = i0; i <= i1; i++) { const p = at(i, f1); fl.push([p[0], p[1] - 0.8]); }
        if (fl.length > 1) { poly(c, fl); stroke(c, rgb(K.shade, 0.35), 1); }
        // the vertical joint at its right end
        if (b < cuts.length - 2) { const p = at(i1, f0), q = at(i1, f1); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); stroke(c, rgb(K.edge, 0.65), 0.75); c.beginPath(); c.moveTo(p[0] + 0.8, p[1] + 0.6); c.lineTo(q[0] + 0.8, q[1] - 0.4); stroke(c, rgb(K.ridge, 0.45), 0.5); }
        const bw = len[i1] - len[i0], m = at((i0 + i1) >> 1, (f0 + f1) / 2), bh = Math.abs(at(i0, f1)[1] - at(i0, f0)[1]);
        if (R() < 0.13 && bw > 9 && bh > 5) glyph(c, P, m[0], m[1], Math.min(bw * 0.24, bh * 0.32), (R() * 3) | 0, 0.85);
        else if (R() < 0.18) { const cx = m[0] + (R() - 0.5) * bw * 0.4; furrow(c, [[cx, m[1] - bh * 0.45], [cx + 1, m[1] - bh * 0.1], [cx - 0.4, m[1] + bh * 0.15], [cx + 0.6, m[1] + bh * 0.45]], rgb(K.edge, 0.55), rgb(K.ridge, 0.35), 0.55, [0.6, 0]); }
      }
      if (k < courses - 1) { const cl = []; for (let i = 0; i < n; i++) cl.push(at(i, f1)); poly(c, cl); stroke(c, rgb(K.edge, 0.7), 0.8); c.save(); c.translate(0, 0.9); poly(c, cl); stroke(c, rgb(K.ridge, 0.4), 0.55); c.restore(); }
    }
  }
  // a hanging drape of moss from a stone edge: a scalloped lower edge, a lit top, leaf marks, a couple of drips
  function mossDrape(c, P, x, y, w, h, seed) {
    const Lf = P.leaf, G = P.grass, R = rand(seed), nS = Math.max(3, Math.round(w / 2.6));
    const sh = () => { c.beginPath(); c.moveTo(x - w / 2, y - 1.2); c.quadraticCurveTo(x, y - 2.4, x + w / 2, y - 1.2); for (let k = nS; k > 0; k--) { const x1 = lerp(x - w / 2, x + w / 2, k / nS), x0 = lerp(x - w / 2, x + w / 2, (k - 1) / nS), d = h * (0.45 + 0.55 * Math.sin(k / nS * Math.PI)) * (0.7 + R() * 0.5); c.quadraticCurveTo((x0 + x1) / 2, y + d * 1.25, x0, y + (k === 1 ? 0 : d * 0.3)); } c.closePath(); };
    c.save(); c.translate(0.5, 1.3); sh(); c.fillStyle = rgb(P.shadowC, 0.3); c.fill(); c.restore();
    sh(); c.fillStyle = LG(c, x - w / 2, y - 2, x + w / 3, y + h, [mix(Lf.lit, G.patch, 0.3), Lf.mid, mix(Lf.mid, Lf.shade, 0.5)]); c.fill(); stroke(c, rgb(Lf.edge, 0.6), 0.5);
    c.beginPath(); c.moveTo(x - w * 0.35, y - 1.2); c.quadraticCurveTo(x - w * 0.05, y - 1.9, x + w * 0.25, y - 1.3); stroke(c, rgb(Lf.sheen, 0.55), 0.6);
    for (let k = 0; k < Math.round(w / 4); k++) { const lx = x + (R() - 0.5) * w * 0.7, ly = y + R() * h * 0.5, sz = 0.8 + R() * 0.6; c.beginPath(); c.moveTo(lx - sz, ly - sz * 0.6); c.lineTo(lx, ly); c.lineTo(lx + sz, ly - sz * 0.6); stroke(c, rgb(Lf.vein, 0.5), 0.4); }
    if (h > 3) for (let k = 0; k < 2; k++) { const dx = x + (R() - 0.5) * w * 0.6, L = h * (0.5 + R() * 0.6); c.beginPath(); c.moveTo(dx, y + h * 0.6); c.quadraticCurveTo(dx + 0.5, y + h * 0.6 + L * 0.5, dx + 0.2, y + h * 0.6 + L); stroke(c, rgb(Lf.shade, 0.85), 0.5); c.beginPath(); c.ellipse(dx + 0.3, y + h * 0.6 + L, 0.7, 0.45, 0.4, 0, TAU); c.fillStyle = rgb(Lf.mid); c.fill(); }
  }
  // a terrace of the old temple: a retaining wall of dressed stone seen from the front (the ground above it is the upper
  // level), coping stones along its top with a lit top face, two or three courses of blocks, shade pooled at its foot,
  // moss drapes, vines and grass tufts on the coping. edge: dense top line (left to right); cuts: [{x, hw}] where steps
  // go through; hAt(x): its height
  function stoneTerrace(c, P, edge, cuts = [], hAt = () => 15, seed = 1, ends = [true, true]) {
    const K = P.stone, G = P.grass, Lf = P.leaf, R = rand(seed);
    const inCut = x => cuts.some(q => Math.abs(x - q.x) < q.hw);
    const runs = []; let cur = []; for (const p of edge) { if (inCut(p[0])) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p); } if (cur.length > 1) runs.push(cur);
    for (const run of runs) {
      const foot = run.map(p => [p[0], p[1] + hAt(p[0])]);
      // the shadow it throws on the lower ground (down and to the right), a dark contact line at its foot
      for (let k = 0; k < 6; k++) { poly(c, foot.map(p => [p[0] + k * 0.7, p[1] + 0.6 + k * 1.3])); stroke(c, rgb(P.shadowC, 0.13 * (1 - k / 6)), 2.2); }
      const face = () => { poly(c, [...run, ...foot.slice().reverse()]); c.closePath(); };
      const yT = Math.min(...run.map(p => p[1])), yB = Math.max(...foot.map(p => p[1]));
      face(); c.fillStyle = LG(c, 0, yT, 0, yB, [mix(K.lit, K.mid, 0.35), K.mid, mix(K.mid, K.shade, 0.7)]); c.fill();
      c.save(); face(); c.clip();
      ashlar(c, P, run.map(p => [p[0], p[1] + 2.2]), foot, seed * 7 + run.length, hAt(run[0][0]) > 17 ? 3 : 2);
      // shade under the coping, and the damp darker foot
      poly(c, [...run, ...run.map(p => [p[0], p[1] + 4.5]).reverse()]); c.closePath(); c.fillStyle = rgb(mix(K.edge, P.shadowC, 0.3), 0.32); c.fill();
      c.fillStyle = LG(c, 0, yB - 7, 0, yB, [rgb(P.shadowC, 0), rgb(mix(K.edge, P.shadowC, 0.4), 0.38)]); c.fillRect(run[0][0] - 2, yB - 9, run[run.length - 1][0] - run[0][0] + 4, 10);
      c.restore();
      poly(c, foot); stroke(c, rgb(mix(K.edge, G.edge, 0.3), 0.85), EW_S);
      for (const [e, p, q] of [[0, run[0], foot[0]], [1, run[run.length - 1], foot[foot.length - 1]]]) if (ends[e] || runs.length > 1) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); stroke(c, K.edge, EW_S); }
      // the coping: a course of capstones on top, their top faces lit, the front edge catching the light
      const capT = run.map(p => [p[0], p[1] - 2.6]), capF = run.map(p => [p[0], p[1] + 2.2]);
      poly(c, [...capT, ...capF.slice().reverse()]); c.closePath(); c.fillStyle = LG(c, 0, yT - 3, 0, yT + 3, [mix(K.lit, K.ridge, 0.35), K.lit, mix(K.lit, K.mid, 0.6)]); c.fill(); stroke(c, K.edge, EW_S);
      poly(c, run.map(p => [p[0], p[1] - 0.2])); stroke(c, rgb(K.edge, 0.4), 0.55);
      poly(c, run.map(p => [p[0], p[1] + 0.6])); stroke(c, rgb(K.ridge, 0.6), 0.55);
      { let s = R() * 6, acc = 0; for (let i = 1; i < run.length; i++) { acc += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]); if (acc > 12 + s) { acc = 0; s = R() * 7; const p = run[i]; c.beginPath(); c.moveTo(p[0], p[1] - 2.5); c.lineTo(p[0] + 0.3, p[1] + 2.2); stroke(c, rgb(K.edge, 0.7), 0.7); c.beginPath(); c.moveTo(p[0] + 0.9, p[1] - 2); c.lineTo(p[0] + 1.1, p[1] + 1.8); stroke(c, rgb(K.ridge, 0.5), 0.45); } } }
      // moss drapes over the coping, vines hanging down the face, tufts in the joints of the coping
      for (let i = 4; i < run.length - 4; i += 10 + (R() * 16 | 0)) { const p = run[i]; if (R() < 0.55) mossDrape(c, P, p[0], p[1] + 2, 6 + R() * 8, 2.5 + R() * 3.5, seed + i); }
      for (let i = 8; i < run.length - 8; i += 30 + (R() * 30 | 0)) { const p = run[i], hh = hAt(p[0]), pts = []; for (let k = 0; k <= 8; k++) pts.push([p[0] + Math.sin(k * 0.9 + i) * 1.4, p[1] + 2 + k / 8 * hh * (0.55 + R() * 0.25)]); vine(c, P, pts, 2, 3.2, seed + i * 3); }
      for (let i = 3; i < run.length - 3; i += 9 + (R() * 14 | 0)) { const p = run[i]; if (R() < 0.5) tuft(c, P, p[0], p[1] - 2.2, 0.45 + R() * 0.2); }
    }
  }
  // stone stairs where a road climbs a terrace (the wall faces us): each step a lit stone tread worn hollow in the
  // middle and a riser of two slabs facing us, nosing lit; stone cheek walls down both sides capped by a block at
  // the foot; the flight juts a little out from the wall
  function stoneSteps(c, P, pts, yTop, yBot, steps = 4, hw = 8.6) {
    const K = P.stone, R = P.road, G = P.grass;
    const xAt = yy => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[1] - yy) * (b[1] - yy) <= 0 && a[1] !== b[1]) return lerp(a[0], b[0], (yy - a[1]) / (b[1] - a[1])); } return pts[pts.length - 1][0]; };
    const yA = yTop - 2.6, yB = yBot + 4, H = yB - yA;
    const strip = (y0, y1, w0 = hw, w1 = hw) => { poly(c, [[xAt(y0) - w0, y0], [xAt(y0) + w0, y0], [xAt(y1) + w1, y1], [xAt(y1) - w1, y1]]); c.closePath(); };
    softShadow(c, xAt(yB) + 2, yB + 2, hw + 5, 3, P.shadowA * 1.2, 0, P.shadowC);
    strip(yA, yB); c.fillStyle = LG(c, 0, yA, 0, yB, [K.mid, K.shade]); c.fill();
    const step = H / steps;
    for (let k = 0; k < steps; k++) {
      const y0 = yA + k * step, yT1 = y0 + step * 0.48, yR1 = y0 + step, x0 = xAt(y0);
      strip(y0, yT1); c.fillStyle = LG(c, x0 - hw, y0, x0 + hw, yT1, [mix(K.lit, K.ridge, 0.3), K.lit, mix(K.lit, K.mid, 0.4)]); c.fill(); stroke(c, rgb(K.edge, 0.6), 0.5);
      if (k > 0) { strip(y0, y0 + (yT1 - y0) * 0.4); c.fillStyle = rgb(mix(K.shade, P.shadowC, 0.4), 0.3); c.fill(); }
      c.beginPath(); c.ellipse(xAt((y0 + yT1) / 2) + 0.5, (y0 + yT1) / 2 + 0.2, hw * 0.45, (yT1 - y0) * 0.26, 0, 0, TAU); c.fillStyle = rgb(K.mid, 0.4); c.fill();   // worn hollow where feet tread
      strip(yT1, yR1); c.fillStyle = LG(c, 0, yT1, 0, yR1, [K.mid, mix(K.mid, K.shade, 0.6), K.shade]); c.fill(); stroke(c, K.edge, EW_S);
      c.beginPath(); c.moveTo(xAt(yT1) - hw + 0.8, yT1 + 0.6); c.lineTo(xAt(yT1) + hw - 0.8, yT1 + 0.6); stroke(c, rgb(K.ridge, 0.65), 0.6);
      const jx = xAt(yT1) + (k % 2 ? 2.4 : -3); c.beginPath(); c.moveTo(jx, yT1 + 0.4); c.lineTo(jx, yR1 - 0.3); stroke(c, rgb(K.edge, 0.7), 0.6); c.beginPath(); c.moveTo(jx + 0.7, yT1 + 0.8); c.lineTo(jx + 0.7, yR1 - 0.6); stroke(c, rgb(K.ridge, 0.4), 0.4);
    }
    // cheek walls: a sloping parapet of squared stone down each side, a block at the foot
    for (const s of [-1, 1]) {
      const t0 = [xAt(yA) + s * (hw + 1.8), yA - 2.5], t1 = [xAt(yB) + s * (hw + 1.8), yB - 2], bw = 2.4;
      poly(c, [[t0[0] - bw, t0[1]], [t0[0] + bw, t0[1]], [t1[0] + bw, t1[1] + 2.5], [t1[0] - bw, t1[1] + 2.5]]); c.closePath(); c.fillStyle = LG(c, t0[0] - bw, 0, t0[0] + bw, 0, [mix(K.lit, K.ridge, 0.2), K.mid, K.shade]); c.fill(); stroke(c, K.edge, EW_S);
      for (const f of [0.33, 0.66]) { const yy = lerp(t0[1], t1[1], f), xx = lerp(t0[0], t1[0], f); c.beginPath(); c.moveTo(xx - bw, yy); c.lineTo(xx + bw, yy + 0.4); stroke(c, rgb(K.edge, 0.7), 0.6); c.beginPath(); c.moveTo(xx - bw + 0.4, yy + 0.8); c.lineTo(xx + bw - 0.4, yy + 1.2); stroke(c, rgb(K.ridge, 0.4), 0.45); }
      c.beginPath(); c.moveTo(t0[0] - bw * 0.4, t0[1] + 1); c.lineTo(t1[0] - bw * 0.4, t1[1]); stroke(c, rgb(K.ridge, 0.45), 0.5);
      ruinBlock(c, P, t1[0], t1[1] + 4.5, 7.4, 5.2, 4.6, 40 + s * 3 + (yB | 0), { sk: 1.6, dd: 2.6 });
      if (s < 0) mossDrape(c, P, t1[0], t1[1] - 1, 6, 2.6, (yB | 0) + 5);
    }
  }
  // a dressed stone block standing on the ground at (x, y) (its front-bottom centre), in the map's 3/4 view: the front
  // face toward us, the top face above it and the right-hand side face in shade, a small oblique (sk across, dd up).
  // opt: { glyph: kind, moss, rot (sunk unevenly), chip, sk, dd, shadow }
  function ruinBlock(c, P, x, y, w, h, d, seed, opt = {}) {
    const K = P.stone, R = rand(seed), sk = opt.sk ?? d * 0.45, dd = opt.dd ?? d * 0.6;
    if (opt.shadow !== false) castShadow(c, P, x + sk * 0.5, y, h * 1.2 + dd, w + sk);
    c.save(); c.translate(x, y); c.rotate(opt.rot || 0);
    const x0 = -w / 2, x1 = w / 2, yt = -h, rc = Math.min(1.2, w * 0.1);
    const front = () => { c.beginPath(); c.roundRect(x0, yt, w, h, rc); };
    const top = () => { poly(c, [[x0 + 0.4, yt], [x1, yt], [x1 + sk, yt - dd], [x0 + sk + 0.4, yt - dd]]); c.closePath(); };
    const side = () => { poly(c, [[x1, yt], [x1 + sk, yt - dd], [x1 + sk, -dd], [x1, 0]]); c.closePath(); };
    side(); c.fillStyle = LG(c, x1, 0, x1 + sk, 0, [K.shade, mix(K.shade, K.edge, 0.4)]); c.fill(); stroke(c, K.edge, EW_S);
    top(); c.fillStyle = LG(c, x0, yt - dd, x1, yt, [mix(K.lit, K.ridge, 0.4), K.lit]); c.fill(); stroke(c, K.edge, EW_S);
    front(); c.fillStyle = LG(c, x0, yt, x1 * 0.6, 0, [mix(K.lit, K.mid, 0.25), K.mid, mix(K.mid, K.shade, 0.6)]); c.fill();
    c.save(); front(); c.clip();
    c.fillStyle = LG(c, 0, yt + h * 0.45, 0, 0, ['rgba(30,24,20,0)', 'rgba(30,24,20,.28)']); c.fillRect(x0, yt, w, h);
    if (opt.glyph != null) glyph(c, P, 0, yt + h * 0.52, Math.min(w, h) * 0.3, opt.glyph);
    else if (opt.band) { furrow(c, [[x0, yt + h * 0.3], [x1, yt + h * 0.3]], rgb(K.edge, 0.6), rgb(K.ridge, 0.4), 0.6, [0, 0.8]); furrow(c, [[x0, yt + h * 0.72], [x1, yt + h * 0.72]], rgb(K.edge, 0.6), rgb(K.ridge, 0.4), 0.6, [0, 0.8]); }
    if (R() < 0.6 && w > 8) { const cx = x0 + w * (0.25 + R() * 0.5); furrow(c, [[cx, yt], [cx + 1.2, yt + h * 0.35], [cx - 0.3, yt + h * 0.6], [cx + 0.8, yt + h * 0.9]], rgb(K.edge, 0.55), rgb(K.ridge, 0.35), 0.55, [0.6, 0]); }
    if (opt.moss) mossDrape(c, P, x0 + w * 0.42, yt + 0.4, w * 0.75, Math.min(h * 0.35, 4), seed + 3);
    c.restore();
    front(); stroke(c, K.edge, w > 10 ? EW : EW_S);
    c.beginPath(); c.moveTo(x0 + 1, yt + 0.8); c.lineTo(x1 - 1, yt + 0.8); stroke(c, rgb(K.ridge, 0.6), 0.6);
    c.beginPath(); c.moveTo(x0 + 0.8, yt + 1.2); c.lineTo(x0 + 0.8, -1); stroke(c, rgb(K.ridge, 0.35), 0.5);
    if (opt.chip) {   // a corner broken off: raw lighter stone in the break
      poly(c, [[x1 - w * 0.3, yt], [x1 + sk * 0.5, yt - dd * 0.5], [x1, yt + h * 0.35], [x1 - w * 0.12, yt + h * 0.18]]); c.closePath(); c.fillStyle = LG(c, x1 - w * 0.3, yt, x1, yt + h * 0.3, [mix(K.lit, K.ridge, 0.5), K.mid]); c.fill(); stroke(c, K.edge, EW_S);
    }
    if (opt.moss) { c.save(); top(); c.clip(); for (let k = 0; k < 3; k++) { const mx = lerp(x0, x1, 0.2 + R() * 0.6) + sk * 0.5, my = yt - dd * 0.5; c.beginPath(); c.ellipse(mx, my, 2 + R() * 2.4, dd * 0.4, 0, 0, TAU); c.fillStyle = rgb(mix(P.leaf.mid, P.leaf.lit, R() * 0.6), 0.9); c.fill(); } c.restore(); }
    c.restore();
    // grass tufts round its foot so it sits in the ground
    if (opt.tufts !== false) { tuft(c, P, x - w * 0.42, y + 0.6, 0.5); if (R() < 0.7) tuft(c, P, x + w * 0.38, y + 0.8, 0.42); }
  }
  // a broken column standing at (x, y): a square plinth, a fluted shaft of drums (each joint an arc furrow), its top
  // broken off in a jagged lit break, moss and a vine climbing it
  function pillar(c, P, x, y, h, r, seed, opt = {}) {
    const K = P.stone, R = rand(seed);
    castShadow(c, P, x, y, h + 6, r * 2.6);
    ruinBlock(c, P, x, y, r * 2.8, 4.2, 4, seed + 1, { sk: 1.6, dd: 2.4, shadow: false, tufts: false });
    const yb = y - 4.2, yt = yb - h, ex = r * 0.38;
    const brk = []; for (let k = 0; k <= 6; k++) brk.push([x - r + k / 6 * 2 * r, yt + (k % 2 ? -2.5 : 1) * (0.6 + R()) + (k === 0 ? 2.5 : 0)]);
    const body = () => { c.beginPath(); c.moveTo(x - r, yb); c.lineTo(x - r, brk[0][1]); brk.forEach(p => c.lineTo(p[0], p[1])); c.lineTo(x + r, yb); c.ellipse(x, yb, r, ex, 0, 0, Math.PI); c.closePath(); };
    body(); c.fillStyle = LG(c, x - r, 0, x + r, 0, [mix(K.lit, K.ridge, 0.2), K.lit, K.mid, K.shade]); c.fill();
    c.save(); body(); c.clip();
    for (const f of [-0.55, -0.2, 0.2, 0.55]) furrow(c, [[x + f * r, yt + 2], [x + f * r, yb + ex * Math.sqrt(1 - f * f)]], rgb(K.edge, 0.4 + Math.max(0, f) * 0.3), f < 0.3 ? rgb(K.ridge, 0.45) : null, 0.6, [-0.8, 0]);
    for (let yy = yb - h * 0.36; yy > yt + 3; yy -= h * 0.36) { c.beginPath(); c.ellipse(x, yy, r, ex, 0, 0.05, Math.PI - 0.05); stroke(c, rgb(K.edge, 0.7), 0.75); c.beginPath(); c.ellipse(x, yy + 0.9, r - 0.5, ex, 0, 0.3, Math.PI - 0.3); stroke(c, rgb(K.ridge, 0.4), 0.5); }
    c.fillStyle = LG(c, 0, yb - h * 0.3, 0, yb + ex, ['rgba(30,24,20,0)', 'rgba(30,24,20,.25)']); c.fillRect(x - r, yb - h, r * 2, h + ex + 1);
    c.restore();
    body(); stroke(c, K.edge, EW);
    // the break: a lit, uneven top face
    c.beginPath(); c.moveTo(brk[0][0], brk[0][1]); brk.forEach(p => c.lineTo(p[0], p[1])); for (let k = 6; k >= 0; k--) c.lineTo(brk[k][0] + 0.4, brk[k][1] - ex * 0.9 + (k % 3) * 0.4); c.closePath(); c.fillStyle = LG(c, x - r, yt - ex, x + r, yt, [mix(K.lit, K.ridge, 0.55), mix(K.lit, K.mid, 0.3)]); c.fill(); stroke(c, K.edge, EW_S);
    if (opt.moss !== false) { mossDrape(c, P, x - r * 0.2, yt + 1.2, r * 1.5, 3.4, seed + 5); }
    if (opt.vine) { const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14, th = t * 2.4 * TAU; if (Math.cos(th) > -0.2) pts.push([x + Math.sin(th) * r, yb - t * h * 0.85]); else if (pts.length > 2) { vine(c, P, pts.splice(0), 2, 3, seed + k); } else pts.length = 0; } if (pts.length > 2) vine(c, P, pts, 2, 3, seed + 99); }
  }
  // a fallen column drum lying on its side in the grass: a stone cylinder seen from above and a little in front, its
  // round end toward us with the flute grooves round its rim
  function drum(c, P, x, y, r, len, ang, seed) {
    const K = P.stone, R = rand(seed);
    softShadow(c, x + 3, y + r * 0.9, len * 0.6 + r, r * 0.8, P.shadowA * 1.2, ang * 0.5, P.shadowC);
    c.save(); c.translate(x, y); c.rotate(ang);
    const L2 = len / 2, body = () => { c.beginPath(); c.moveTo(-L2, -r); c.lineTo(L2, -r); c.ellipse(L2, 0, r * 0.45, r, 0, -Math.PI / 2, Math.PI / 2); c.lineTo(-L2, r); c.closePath(); };
    body(); c.fillStyle = LG(c, 0, -r, 0, r, [mix(K.lit, K.ridge, 0.3), K.lit, K.mid, K.shade]); c.fill();
    c.save(); body(); c.clip(); for (const f of [-0.6, -0.2, 0.25, 0.65]) furrow(c, [[-L2, f * r], [L2 + r * 0.4, f * r]], rgb(K.edge, 0.45), f < 0 ? rgb(K.ridge, 0.45) : null, 0.55, [0, -0.8]); c.restore();
    body(); stroke(c, K.edge, EW);
    c.beginPath(); c.ellipse(-L2, 0, r * 0.45, r, 0, 0, TAU); c.fillStyle = RG(c, -L2, 0, r, [mix(K.lit, K.ridge, 0.4), K.lit, K.mid]); c.fill(); stroke(c, K.edge, EW_S);
    c.beginPath(); c.ellipse(-L2, 0, r * 0.2, r * 0.42, 0, 0, TAU); stroke(c, rgb(K.edge, 0.5), 0.5);
    mossDrape(c, P, L2 * 0.2, -r * 0.7, len * 0.4, 2.4, seed + 2);
    c.restore();
    tuft(c, P, x - Math.sin(ang) * r - len * 0.2, y + r + 0.6, 0.55); tuft(c, P, x + len * 0.3, y + r * 0.9, 0.45);
  }
  // a great carved stone head sunk to its chin in the jungle floor, facing us: a flat-topped head under a headband of
  // carved blocks, a heavy brow ledge, deep eye sockets, a broad nose, a grim mouth with carved teeth, ear spools;
  // every form a lit plane above a dark groove; moss on its crown, a vine down one cheek, ferns at its chin
  function idolHead(c, P, x, y, s, seed, opt = {}) {
    const K = P.stone, Lf = P.leaf, R = rand(seed), w = 30 * s, h = 34 * s, x0 = x - w / 2, x1 = x + w / 2, yt = y - h;
    castShadow(c, P, x, y, h * 1.1, w);
    // ear spools behind the cheeks
    for (const e of [-1, 1]) { const ex = x + e * (w / 2 + 1.4 * s), ey = y - h * 0.5; c.beginPath(); c.ellipse(ex, ey, 4 * s, 6.4 * s, 0, 0, TAU); c.fillStyle = LG(c, ex - 4 * s, ey - 6 * s, ex + 4 * s, ey + 6 * s, e < 0 ? [K.lit, K.mid] : [K.mid, K.shade]); c.fill(); stroke(c, K.edge, EW_S); c.beginPath(); c.ellipse(ex, ey, 2 * s, 3.4 * s, 0, 0, TAU); c.fillStyle = rgb(mix(K.shade, K.edge, 0.5)); c.fill(); stroke(c, rgb(K.ridge, 0.4), 0.5); }
    const head = () => { c.beginPath(); c.moveTo(x0 + 2 * s, y); c.lineTo(x0, yt + h * 0.3); c.quadraticCurveTo(x0, yt, x0 + 5 * s, yt); c.lineTo(x1 - 5 * s, yt); c.quadraticCurveTo(x1, yt, x1, yt + h * 0.3); c.lineTo(x1 - 2 * s, y); c.closePath(); };
    head(); c.fillStyle = LG(c, x0, yt, x1, y, [mix(K.lit, K.ridge, 0.15), K.mid, mix(K.mid, K.shade, 0.8)]); c.fill();
    c.save(); head(); c.clip();
    // the headband of carved blocks
    const hb = yt + h * 0.24; c.fillStyle = rgb(mix(K.lit, K.ridge, 0.25), 0.55); c.fillRect(x0, yt, w, hb - yt);
    furrow(c, [[x0, hb], [x1, hb]], rgb(K.edge, 0.85), rgb(K.ridge, 0.5), 0.9, [0, 1]);
    for (let k = 1; k < 4; k++) { const bx = x0 + w * k / 4; c.beginPath(); c.moveTo(bx, yt); c.lineTo(bx, hb); stroke(c, rgb(K.edge, 0.7), 0.7); c.beginPath(); c.moveTo(bx + 0.7, yt + 0.6); c.lineTo(bx + 0.7, hb - 0.6); stroke(c, rgb(K.ridge, 0.4), 0.45); }
    for (let k = 0; k < 4; k++) glyph(c, P, x0 + w * (k + 0.5) / 4, (yt + hb) / 2 + 0.4, Math.min(w / 8, (hb - yt) / 2) * 0.62, k + (seed % 3), 0.85);
    // the brow ledge: a lit top plane over a deep shadow
    const by = yt + h * 0.38;
    c.beginPath(); c.moveTo(x0, by - 2.4 * s); c.quadraticCurveTo(x, by - 4.4 * s, x1, by - 2.4 * s); c.lineTo(x1, by + 0.6 * s); c.quadraticCurveTo(x, by - 1.2 * s, x0, by + 0.6 * s); c.closePath(); c.fillStyle = rgb(mix(K.lit, K.ridge, 0.4), 0.8); c.fill();
    c.beginPath(); c.moveTo(x0, by + 0.6 * s); c.quadraticCurveTo(x, by - 1.2 * s, x1, by + 0.6 * s); stroke(c, rgb(K.edge, 0.85), 1.1 * s);
    // eyes: deep sockets, a lit lower lid, a dark pupil stone
    for (const e of [-1, 1]) {
      const ex = x + e * w * 0.22, ey = by + h * 0.1;
      c.beginPath(); c.ellipse(ex, ey, w * 0.14, h * 0.065, 0, 0, TAU); c.fillStyle = LG(c, 0, ey - h * 0.07, 0, ey + h * 0.07, [mix(K.edge, P.shadowC, 0.5), mix(K.shade, K.edge, 0.5)]); c.fill();
      c.beginPath(); c.ellipse(ex, ey + 0.3, w * 0.14, h * 0.065, 0, 0.15, Math.PI - 0.15); stroke(c, rgb(K.ridge, 0.6), 0.7);
      c.beginPath(); c.ellipse(ex + e * 0.4, ey + 0.4, w * 0.05, h * 0.045, 0, 0, TAU); c.fillStyle = opt.glow ? RG(c, ex, ey, w * 0.05, [[255, 250, 200], [255, 200, 90], [200, 110, 30]]) : rgb(mix(K.edge, [20, 18, 16], 0.5)); c.fill();
    }
    // the nose: a broad wedge, lit on its left plane, nostrils
    const ny = by + h * 0.34;
    poly(c, [[x - w * 0.06, by + 1], [x - w * 0.17, ny], [x + w * 0.17, ny], [x + w * 0.06, by + 1]]); c.closePath(); c.fillStyle = LG(c, x - w * 0.17, 0, x + w * 0.17, 0, [mix(K.lit, K.ridge, 0.3), K.mid, K.shade]); c.fill(); stroke(c, rgb(K.edge, 0.8), 0.7);
    for (const e of [-1, 1]) { c.beginPath(); c.ellipse(x + e * w * 0.08, ny - 1.4 * s, 1.5 * s, 0.9 * s, 0, 0, TAU); c.fillStyle = rgb(mix(K.edge, P.shadowC, 0.4)); c.fill(); }
    c.beginPath(); c.moveTo(x - w * 0.18, ny + 0.6); c.lineTo(x + w * 0.18, ny + 0.6); stroke(c, rgb(P.shadowC, 0.35), 1.2 * s);
    // the mouth: a wide grim slab with carved teeth
    const my = ny + h * 0.14, mw = w * 0.3, mh = h * 0.1;
    c.beginPath(); c.roundRect(x - mw, my - mh / 2, mw * 2, mh, 1.5 * s); c.fillStyle = LG(c, 0, my - mh / 2, 0, my + mh / 2, [mix(K.edge, P.shadowC, 0.5), mix(K.shade, K.edge, 0.5)]); c.fill();
    for (let k = -2; k <= 2; k++) { const tx = x + k * mw * 0.38; c.beginPath(); c.roundRect(tx - mw * 0.15, my - mh / 2 + 0.3, mw * 0.3, mh * 0.42, 0.6); c.fillStyle = LG(c, 0, my - mh / 2, 0, my, [K.lit, K.mid]); c.fill(); stroke(c, rgb(K.edge, 0.7), 0.45); }
    c.beginPath(); c.moveTo(x - mw - 1, my + mh / 2 + 0.8); c.quadraticCurveTo(x, my + mh / 2 + 2, x + mw + 1, my + mh / 2 + 0.8); stroke(c, rgb(K.ridge, 0.55), 0.7);
    // cheek planes: a soft shade on the right half, cracks
    c.fillStyle = LG(c, x, 0, x1, 0, ['rgba(30,24,20,0)', 'rgba(30,24,20,.22)']); c.fillRect(x, yt, w / 2, h);
    furrow(c, [[x1 - w * 0.12, hb + 1], [x1 - w * 0.16, by + h * 0.12], [x1 - w * 0.1, by + h * 0.3]], rgb(K.edge, 0.6), rgb(K.ridge, 0.3), 0.6, [-0.7, 0]);
    c.fillStyle = LG(c, 0, y - h * 0.18, 0, y, ['rgba(30,24,20,0)', 'rgba(30,24,20,.3)']); c.fillRect(x0, y - h * 0.2, w, h * 0.2);
    c.restore();
    head(); stroke(c, K.edge, EW);
    c.beginPath(); c.moveTo(x0 + 0.9, yt + 5 * s); c.lineTo(x0 + 0.9, y - 3); stroke(c, rgb(K.ridge, 0.4), 0.6);
    // moss over the crown, a vine down one side, the ground mounded round its chin
    mossDrape(c, P, x - w * 0.12, yt + 0.6, w * 0.7, 4.2 * s, seed + 7);
    if (opt.vine !== false) { const pts = []; for (let k = 0; k <= 10; k++) pts.push([x1 - 2 * s + Math.sin(k * 0.8) * 1.6, yt + 2 + k / 10 * h * 0.62]); vine(c, P, pts, 2, 3.4, seed + 11); }
    const G = P.grass; c.beginPath(); c.moveTo(x0 - 3, y + 1.5); c.quadraticCurveTo(x0 + 3, y - 4 * s, x, y - 1.2 * s); c.quadraticCurveTo(x1 - 3, y - 4 * s, x1 + 3, y + 1.5); c.closePath(); c.fillStyle = LG(c, 0, y - 4 * s, 0, y + 1.5, [mix(G.mid, G.lit, 0.3), G.shade]); c.fill(); stroke(c, rgb(G.edge, 0.6), 0.5);
    for (const [dx, sc] of [[-0.42, 0.75], [-0.15, 0.6], [0.2, 0.7], [0.45, 0.6]]) tuft(c, P, x + dx * w, y + 1, sc * s);
  }
  // a stone fire bowl on a short pedestal (temple braziers), its flame and glow
  function brazier(c, P, x, y, s = 1, t = 0) {
    const K = P.stone;
    castShadow(c, P, x, y, 18 * s, 8 * s);
    ruinBlock(c, P, x, y, 6 * s, 9 * s, 3 * s, 77 + (x | 0), { sk: 1.2 * s, dd: 1.8 * s, shadow: false, band: true, tufts: false });
    const by = y - 9 * s - 1.8 * s, bw = 7 * s;
    c.beginPath(); c.moveTo(x - bw, by - 2.6 * s); c.quadraticCurveTo(x - bw * 0.85, by + 2.6 * s, x + 0.6 * s, by + 2.8 * s); c.quadraticCurveTo(x + bw * 0.95, by + 2.6 * s, x + bw + 0.6 * s, by - 2.6 * s); c.closePath();
    c.fillStyle = LG(c, x - bw, 0, x + bw, 0, [mix(K.lit, K.ridge, 0.2), K.mid, K.shade]); c.fill(); stroke(c, K.edge, EW_S);
    c.beginPath(); c.ellipse(x + 0.3 * s, by - 2.6 * s, bw + 0.3 * s, 1.6 * s, 0, 0, TAU); c.fillStyle = LG(c, 0, by - 4 * s, 0, by - 1, [mix(K.edge, [40, 20, 10], 0.4), [120, 50, 20]]); c.fill(); stroke(c, K.edge, EW_S);
    furrow(c, [[x - bw * 0.8, by - 0.4], [x + bw * 0.85, by - 0.4]], rgb(K.edge, 0.6), rgb(K.ridge, 0.4), 0.55, [0, 0.8]);
    const fy = by - 3 * s, fl = 10 * s * (1 + 0.06 * Math.sin(t * 9));
    glow(c, x, fy - fl * 0.4, 26 * s, [255, 150, 50], 0.3 * P.glowK + 0.12);
    c.beginPath(); c.moveTo(x - 4.5 * s, fy); c.quadraticCurveTo(x - 5 * s, fy - fl * 0.5, x - 0.5 * s, fy - fl); c.quadraticCurveTo(x + 0.8 * s, fy - fl * 0.6, x + 2 * s, fy - fl * 0.75); c.quadraticCurveTo(x + 5.5 * s, fy - fl * 0.4, x + 4.8 * s, fy); c.closePath();
    c.fillStyle = LG(c, 0, fy - fl, 0, fy, ['#fff2a0', '#ffb030', '#ff6a1a']); c.fill();
    c.beginPath(); c.ellipse(x - 0.2 * s, fy - fl * 0.3, 1.6 * s, fl * 0.24, 0, 0, TAU); c.fillStyle = 'rgba(255,255,230,.85)'; c.fill();
  }
  // a stone archway the road passes under: two square piers of stacked blocks and a carved lintel with a stepped
  // cornice across their tops, moss and vines hanging from it. (x, y) is the middle of the opening on the ground
  function archway(c, P, x, y, w, h, seed) {
    const K = P.stone, R = rand(seed), pw = 7.5, sk = 2.6, dd = 3.6;
    // its shadow across the ground (the opening's shadow is the gap between the piers' shadows)
    const sun = P.sun ?? SUN, L = h * (P.shLen ?? 0.3);
    softShadow(c, x + Math.cos(sun) * L * 1.1, y + 2 + Math.sin(sun) * L * 0.5, w * 0.62, 4, P.shadowA * 0.9, sun * 0.5, P.shadowC);
    for (const e of [-1, 1]) {
      const px = x + e * (w / 2 + pw / 2), n = 4, bh = (h - 6) / n;
      castShadow(c, P, px, y, h, pw);
      for (let k = 0; k < n; k++) ruinBlock(c, P, px + (R() - 0.5) * 0.6, y - k * bh, pw + (k === 0 ? 1.6 : 0) - (k % 2) * 0.6, bh, 4, seed + k * 5 + (e > 0 ? 50 : 0), { sk, dd: k === n - 1 ? dd : 0.01, shadow: false, tufts: k === 0, glyph: k === 1 ? (seed + e + 3) % 3 : null, chip: e > 0 && k === 2 });
    }
    // the lintel: a long carved block across both piers, a stepped cornice on top
    const ly = y - (h - 6), lw = w + pw * 2 + 3;
    ruinBlock(c, P, x, ly, lw, 6.5, 4, seed + 90, { sk, dd: 0.01, shadow: false, tufts: false, band: true });
    ruinBlock(c, P, x - 0.5, ly - 6.5, lw - 6, 3.2, 4, seed + 91, { sk, dd, shadow: false, tufts: false, moss: true });
    for (let k = -2; k <= 2; k++) glyph(c, P, x + k * lw / 6, ly - 3.2, 1.7, k + 4, 0.9);
    mossDrape(c, P, x + w * 0.15, ly + 0.3, w * 0.45, 4, seed + 92); mossDrape(c, P, x - w * 0.42, ly + 0.3, w * 0.22, 2.6, seed + 93);
    const vpts = []; for (let k = 0; k <= 9; k++) vpts.push([x - w * 0.3 + Math.sin(k * 0.9) * 1.2, ly + 1 + k * 1.8]); vine(c, P, vpts, 2, 3.2, seed + 94);
    const v2 = []; for (let k = 0; k <= 6; k++) v2.push([x + w / 2 + pw + 1 + Math.sin(k) * 1, ly + 1 + k * 2.4]); vine(c, P, v2, 2, 3, seed + 95);
  }
  // flagstones laid on a road: rows of two or three worn slabs across it, gaps of packed earth and grass between, the
  // odd slab missing or tipped; skip(x, y) keeps them off clearings
  function paving(c, P, pts, seed, skip = () => false, hw = 5.6) {
    const K = P.stone, G = P.grass, R = rand(seed);
    for (const [x, y, tx, ty] of resample(pts, 6.4)) {
      if (skip(x, y) || R() < 0.16) continue;
      const nx = -ty, ny = tx, nS = R() < 0.55 ? 1 : 2;
      for (let k = 0; k < nS; k++) {
        if (R() < 0.08) continue;
        const v0 = -hw + k * 2 * hw / nS + 0.45, v1 = -hw + (k + 1) * 2 * hw / nS - 0.45, u0 = -2.7 + (R() - 0.5) * 0.6, u1 = 2.7 + (R() - 0.5) * 0.6, j = () => (R() - 0.5) * 0.7;
        const q = [[u0 + j(), v0], [u1 + j(), v0 + j()], [u1 + j(), v1], [u0 + j(), v1 + j()]].map(([u, v]) => [x + tx * u + nx * v, y + ty * u + ny * v]);
        c.save(); c.translate(0.5, 0.7); closedSmooth(c, q); c.fillStyle = rgb(mix(K.edge, P.shadowC, 0.4), 0.3); c.fill(); c.restore();
        const tn = R(); closedSmooth(c, q); c.fillStyle = LG(c, x - hw, y - hw, x + hw, y + hw, [mix(K.lit, K.ridge, 0.2 + tn * 0.2), mix(K.lit, K.mid, 0.3 + tn * 0.3)]); c.fill(); stroke(c, rgb(K.edge, 0.75), 0.55);
        c.beginPath(); c.moveTo(...lerpPt(q[3], q[0], 0.5)); c.lineTo(...q[0]); c.lineTo(...lerpPt(q[0], q[1], 0.6)); stroke(c, rgb(K.ridge, 0.6), 0.45);
      }
      if (R() < 0.12) { const s = R() < 0.5 ? -1 : 1; tuft(c, P, x + nx * s * hw * 0.5, y + ny * s * hw * 0.5 + 1, 0.32); }
    }
  }
  // ---- the bog ----
  // a murky pool: damp darker ground round it, a muddy margin, a short earth bank showing on the far (upper) shore
  // where the water sits below the ground, the water dark at the far bank and paler toward us, the bank's shadow on it,
  // a sky sheen in broken streaks, duckweed rafts at the edges and a lit waterline on the near shore. ctrl: control
  // points of its outline. Returns the dense outline
  function bogPool(c, P, ctrl, seed) {
    const B = P.bog, Md = P.mud, G = P.grass, R = rand(seed), pts = closedSpline(ctrl, 10);
    const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]), top = Math.min(...ys), bot = Math.max(...ys), lft = Math.min(...xs), rgt = Math.max(...xs);
    poly(c, offsetClosed(pts, 10)); c.closePath(); c.fillStyle = rgb(mix(G.shade, Md.mid, 0.35), 0.2); c.fill();
    poly(c, offsetClosed(pts, 6)); c.closePath(); c.fillStyle = rgb(mix(G.shade, Md.mid, 0.4), 0.22); c.fill();
    const mud = offsetClosed(pts, (p, i) => 3.4 + 1.5 * Math.sin(i * 0.31 + seed) + 0.8 * Math.sin(i * 0.9));
    poly(c, mud); c.closePath(); c.fillStyle = LG(c, lft, top, lft + 40, bot, [mix(Md.lit, G.mid, 0.25), Md.mid]); c.fill(); stroke(c, rgb(mix(G.edge, Md.edge, 0.5), 0.55), EW_S);
    // the mud's texture: a few drawn cracks and footprint-like dimples, lit on their lower edge
    for (let i = 0; i < mud.length; i += 7 + (R() * 9 | 0)) { const p = mud[i], q = pts[i], m = lerpPt(p, q, 0.45); c.beginPath(); c.ellipse(m[0], m[1], 1.3, 0.6, 0, 0, TAU); c.fillStyle = rgb(Md.shade, 0.5); c.fill(); c.beginPath(); c.ellipse(m[0] + 0.2, m[1] + 0.4, 1.2, 0.5, 0, 0.2, Math.PI - 0.2); stroke(c, rgb(Md.lit, 0.6), 0.35); }
    // the bank and the water (offset down, so the bank shows only on the far shore)
    const dz = 2.8;
    poly(c, pts); c.closePath(); c.fillStyle = LG(c, 0, top, 0, top + 10, [Md.mid, mix(Md.shade, Md.edge, 0.3)]); c.fill();
    c.save(); poly(c, pts); c.clip();
    c.save(); c.translate(0, 1.3); poly(c, pts); stroke(c, rgb(Md.edge, 0.6), 0.6); c.restore();
    c.translate(0, dz);
    poly(c, pts); c.closePath(); c.fillStyle = LG(c, 0, top, 0, bot, [B.deep, mix(B.deep, B.mid, 0.6), mix(B.mid, B.lit, 0.12)]); c.fill();
    c.translate(0, -dz);
    // the far bank's shadow across the water, a soft deep core in the middle
    c.save(); c.translate(0.6, dz + 1.6); poly(c, pts); stroke(c, rgb(mix(B.deep, P.shadowC, 0.5), 0.5), 5); c.restore();
    softShadow(c, (lft + rgt) / 2 - (rgt - lft) * 0.05, top + (bot - top) * 0.42, (rgt - lft) * 0.3, (bot - top) * 0.22, 0.28, 0, B.deep);
    // sky sheen: long broken horizontal streaks, more toward the near shore
    c.lineCap = 'round';
    for (let k = 0; k < Math.round((rgt - lft) * (bot - top) / 260); k++) {
      const yy = lerp(top + (bot - top) * 0.3, bot - 2, Math.sqrt(R())), xx = lerp(lft + 4, rgt - 4, R()), L = 4 + R() * 10;
      c.beginPath(); c.moveTo(xx - L / 2, yy); c.lineTo(xx + L / 2, yy + (R() - 0.5) * 0.4); stroke(c, rgb(B.lit, 0.18 + R() * 0.3), 0.5 + R() * 0.5);
    }
    // duckweed rafts hugging the shore: a soft lime patch and a scatter of little round leaves
    for (let k = 0; k < 3; k++) {
      const i = (R() * pts.length) | 0, p = offsetClosed(pts, -4 - R() * 4)[i], rr = 4 + R() * 5;
      c.beginPath(); c.ellipse(p[0], p[1], rr, rr * 0.45, 0, 0, TAU); c.fillStyle = rgb(B.scum, 0.35); c.fill();
      for (let q = 0; q < 10; q++) { const a = R() * TAU, d = Math.sqrt(R()) * rr; c.beginPath(); c.ellipse(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d * 0.45, 0.8, 0.45, 0, 0, TAU); c.fillStyle = rgb(mix(B.scum, [230, 240, 160], R() * 0.4), 0.85); c.fill(); }
    }
    // the waterline on the near shore: a lit line where the water meets the mud
    c.save(); c.beginPath(); c.rect(lft - 5, top + (bot - top) * 0.45, rgt - lft + 10, bot); c.clip(); c.translate(0, -0.6); poly(c, pts); c.closePath(); stroke(c, rgb(B.lit, 0.55), 0.7); c.restore();
    c.restore();
    c.save(); poly(c, pts); c.clip(); c.translate(0, dz); poly(c, pts); c.closePath(); stroke(c, rgb(mix(B.deep, Md.edge, 0.5), 0.8), 0.8); c.restore();
    poly(c, pts); c.closePath(); stroke(c, rgb(Md.edge, 0.8), EW_S);
    return pts;
  }
  // a water lily pad floating at (x, y), seen from above at the map's tilt: a disc with a notch, veins from its heart,
  // its rim turned up and lit on the far side, its shadow on the water; flower: a pink lotus on it
  function lilyPad(c, P, x, y, r, rot, seed, flower = false) {
    const L = P.leaf, G = P.grass, R = rand(seed), sy = 0.56, gap = 0.28;
    const rim = []; for (let k = 0; k <= 20; k++) { const a = rot + gap + k / 20 * (TAU - gap * 2), rr = r * (1 + (R() - 0.5) * 0.06); rim.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * sy]); }
    const shape = () => { poly(c, [[x, y], ...rim]); c.closePath(); };
    c.save(); c.translate(0.8, 1.5); shape(); c.fillStyle = rgb(mix(P.bog.deep, P.shadowC, 0.5), 0.55); c.fill(); c.restore();
    shape(); c.fillStyle = LG(c, x - r, y - r * sy, x + r, y + r * sy, [mix(L.lit, G.patch, 0.35), mix(L.mid, L.lit, 0.3), L.shade]); c.fill(); stroke(c, rgb(L.edge, 0.85), r > 6 ? EW_S : 0.55);
    for (let k = 1; k < 7; k++) { const p = rim[Math.round(k / 7 * 20)]; c.beginPath(); c.moveTo(x, y); c.lineTo(lerp(x, p[0], 0.85), lerp(y, p[1], 0.85)); stroke(c, rgb(L.vein, 0.45), 0.45); c.beginPath(); c.moveTo(x - 0.3, y - 0.5); c.lineTo(lerp(x, p[0], 0.8) - 0.3, lerp(y, p[1], 0.8) - 0.5); stroke(c, rgb(L.sheen, 0.25), 0.35); }
    c.beginPath(); c.ellipse(x, y, r * 0.92, r * sy * 0.88, 0, Math.PI * 1.08, Math.PI * 1.75); stroke(c, rgb(L.sheen, 0.6), 0.6);
    if (flower) {
      const fx = x - r * 0.15, fy = y - r * 0.12, fr = r * 0.55, pk = P.lotus;
      for (const [ring, n, k0, lift] of [[1, 7, 0, 0], [0.62, 5, 0.4, 1.2]]) for (let k = 0; k < n; k++) {
        const a = (k + k0) / n * TAU - Math.PI / 2, bx = fx, by = fy - lift, tx = fx + Math.cos(a) * fr * ring, ty = fy - lift + Math.sin(a) * fr * ring * 0.5 - fr * 0.55 * ring;
        const nx = -(ty - by), ny = tx - bx, ln = Math.hypot(nx, ny) || 1, w = fr * 0.32 * ring;
        c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo((bx + tx) / 2 + nx / ln * w, (by + ty) / 2 + ny / ln * w, tx, ty); c.quadraticCurveTo((bx + tx) / 2 - nx / ln * w, (by + ty) / 2 - ny / ln * w, bx, by); c.closePath();
        c.fillStyle = LG(c, tx, ty, bx, by, [mix(pk, [255, 255, 255], 0.55), pk, mix(pk, [120, 30, 70], 0.3)]); c.fill(); stroke(c, rgb(mix(pk, [110, 20, 60], 0.5), 0.8), 0.45);
      }
      c.beginPath(); c.arc(fx, fy - 1.6, fr * 0.2, 0, TAU); c.fillStyle = RG(c, fx, fy - 1.6, fr * 0.2, [COIN.lit, COIN.hi, COIN.lo]); c.fill();
    }
  }
  // a clump of reeds and bulrushes: long straight blades and stems, each stem topped by a brown seed head lit on its
  // left, rooted in the water (a ripple ring) or on the bank
  function reeds(c, P, x, y, s, seed, inWater = true) {
    const L = P.leaf, G = P.grass, R = rand(seed), n = 6 + (R() * 4 | 0);
    if (inWater) { c.beginPath(); c.ellipse(x, y + 0.5, 7 * s, 2 * s, 0, 0, TAU); stroke(c, rgb(P.bog.lit, 0.45), 0.5); c.beginPath(); c.ellipse(x + 0.5, y + 0.5, 4.5 * s, 1.3 * s, 0, 0, TAU); c.fillStyle = rgb(P.bog.deep, 0.4); c.fill(); }
    else castShadow(c, P, x, y, 22 * s, 9 * s);
    const items = [];
    for (let i = 0; i < n; i++) { const u = i / (n - 1) - 0.5; items.push({ kind: 'blade', u, a: u * 0.7 + (R() - 0.5) * 0.25, len: (16 + R() * 10) * s }); }
    for (let i = 0; i < 2 + (R() * 2 | 0); i++) items.push({ kind: 'stem', u: (R() - 0.5) * 0.6, a: (R() - 0.5) * 0.3, len: (22 + R() * 8) * s });
    items.sort((p, q) => Math.abs(q.u) - Math.abs(p.u));
    for (const it of items) {
      const bx = x + it.u * 6 * s, tx = bx + Math.sin(it.a) * it.len, ty = y - Math.cos(it.a) * it.len;
      if (it.kind === 'blade') {
        const w = 1.1 * s, cx = bx + Math.sin(it.a) * it.len * 0.4, cy = y - it.len * 0.55, tone = Math.abs(it.u) * 0.7;
        c.beginPath(); c.moveTo(bx - w, y); c.quadraticCurveTo(cx - w * 0.5, cy, tx, ty); c.quadraticCurveTo(cx + w * 0.5, cy, bx + w, y); c.closePath();
        c.fillStyle = LG(c, x, ty, x, y, [mix(G.tuftLit, L.mid, 0.3 + tone * 0.5), mix(L.mid, L.shade, tone), L.deep]); c.fill(); stroke(c, rgb(L.edge, 0.7), 0.4);
        c.beginPath(); c.moveTo(bx - w * 0.4, y - 1); c.quadraticCurveTo(cx - w * 0.4, cy, tx, ty); stroke(c, rgb(G.tuftLit, 0.4 - tone * 0.3), 0.4);
      } else {
        c.beginPath(); c.moveTo(bx, y); c.lineTo(tx, ty); stroke(c, L.edge, 1.3 * s); c.beginPath(); c.moveTo(bx, y); c.lineTo(tx, ty); stroke(c, mix(L.mid, G.tuftLit, 0.2), 0.7 * s);
        const hy = ty + 3 * s, hx = tx - Math.sin(it.a) * 3 * s, hw = 1.6 * s, hh = 7 * s;
        c.save(); c.translate(hx, hy); c.rotate(it.a);
        c.beginPath(); c.moveTo(0, -hh / 2 - 3 * s); c.lineTo(0, -hh / 2); stroke(c, mix(L.mid, P.mud.lit, 0.4), 0.6 * s);
        c.beginPath(); c.roundRect(-hw, -hh / 2, hw * 2, hh, hw); c.fillStyle = LG(c, -hw, 0, hw, 0, P.cattail); c.fill(); stroke(c, rgb(mix(P.cattail[2], [30, 14, 6], 0.4)), 0.5);
        c.beginPath(); c.moveTo(-hw * 0.4, -hh / 2 + 1); c.lineTo(-hw * 0.4, hh / 2 - 1.2); stroke(c, rgb([255, 220, 170], 0.45), 0.5);
        c.restore();
      }
    }
  }
  // a mangrove standing on its arching stilt roots: roots springing from the trunk's foot and arching down into the
  // water (a ripple ring where each enters), the trunk lifted above them, a dense rounded crown of small leaves
  function mangrove(c, P, x, y, h, w, seed, inWater = true) {
    const B = P.bark, R = rand(seed), rootH = h * 0.2, lean = (R() - 0.5) * 5;
    castShadow(c, P, x, y, h, w * 0.7);
    const roots = [];
    for (let k = 0; k < 8; k++) { const u = (k + (R() - 0.5) * 0.6) / 7 - 0.5, fx = x + u * w * 0.62, fy = y + (Math.abs(u) < 0.3 ? 2.5 : -0.5) + (R() - 0.5) * 3; roots.push({ fx, fy, sx: x + u * 4, sy: y - rootH * (0.55 + R() * 0.4), up: rootH * (0.3 + R() * 0.4) }); }
    roots.sort((p, q) => p.fy - q.fy);
    const root = r => { c.beginPath(); c.moveTo(r.sx, r.sy); c.bezierCurveTo(r.sx + (r.fx - r.sx) * 0.4, r.sy - r.up, r.fx, r.sy - r.up * 0.5, r.fx, r.fy); };
    for (const r of roots) {
      if (inWater) { c.beginPath(); c.ellipse(r.fx + 0.5, r.fy + 0.5, 3, 1, 0, 0, TAU); stroke(c, rgb(P.bog.lit, 0.5), 0.45); }
      root(r); stroke(c, B.edge, 2.6); root(r); stroke(c, B.mid, 1.6);
      c.save(); c.translate(-0.4, -0.5); root(r); stroke(c, rgb(B.ridge, 0.45), 0.5); c.restore();
    }
    const tw = Math.max(3, w * 0.07), top = trunk(c, P, x, y - rootH, h * 0.3, tw, tw * 0.7, lean, seed + 1, { roots: [], moss: true, vine: R() < 0.4 });
    const cy = y - h * 0.62, rr = w / 2, lobes = [{ x: x + lean, y: cy, r: rr * 0.6, k: 0.1 }];
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.9 + 1.2 * i / 5) + (R() - 0.5) * 0.4, d = rr * (0.42 + 0.15 * R()); lobes.push({ x: x + lean + Math.cos(a) * d * 1.1, y: cy + Math.sin(a) * d * 0.75, r: rr * (0.38 + 0.15 * R()), k: Math.sin(a) < -0.5 ? 0.02 : 0.08 }); }
    for (const a of [0.45, 2.7]) lobes.push({ x: x + lean + Math.cos(a) * rr * 0.55, y: cy + rr * 0.32, r: rr * 0.38, k: 0.24 });
    branch(c, P, top[0], top[1] + 3, x + lean - rr * 0.35, cy + rr * 0.15, tw * 0.75); branch(c, P, top[0], top[1] + 3, x + lean + rr * 0.38, cy + rr * 0.1, tw * 0.7);
    lobes.sort((p, q) => (q.k - p.k) || (q.y - p.y));
    for (const o of lobes) lobe(c, P, o.x, o.y, o.r, o.k + 0.06, R, 'clump');
  }
  // a boardwalk of planks laid across the water along a road: its shadow on the water, posts standing in the water
  // under it (a ripple ring at each foot), planks across the walk (grain, nails, the odd one skewed or missing), the
  // deck's edge beam showing on the side that faces us, post tops standing up along both sides
  function boardwalk(c, P, pts, wid, seed, wetK = () => 1) {
    const Wd = P.wood, B = P.bark, Wt = P.bog, R = rand(seed), hw = wid / 2, S = resample(pts, 3.3);
    const band = (d0, d1, dx = 0, dy = 0) => { poly(c, [...S.map(([x, y, tx, ty]) => [x - ty * d0 + dx, y + tx * d0 + dy]), ...S.slice().reverse().map(([x, y, tx, ty]) => [x - ty * d1 + dx, y + tx * d1 + dy])]); c.closePath(); };
    band(-hw, hw, 3.2, 4.4); c.fillStyle = rgb(mix(Wt.deep, P.shadowC, 0.5), 0.5); c.fill();
    const posts = []; for (let i = 2; i < S.length - 1; i += 8) for (const s of [-1, 1]) { const [x, y, tx, ty] = S[i]; posts.push([x - ty * s * (hw + 0.4), y + tx * s * (hw + 0.4), s, wetK(x, y)]); }
    posts.sort((a, b) => a[1] - b[1]);
    for (const [px, py, s, wet] of posts) {
      const ph = 4.2;
      if (wet > 0.5) { c.beginPath(); c.ellipse(px + 0.4, py + ph, 3, 1.1, 0, 0, TAU); stroke(c, rgb(Wt.lit, 0.55), 0.5); }
      c.beginPath(); c.roundRect(px - 1.2, py, 2.4, ph + 0.6, 0.8); c.fillStyle = LG(c, px - 1.2, 0, px + 1.2, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S);
    }
    // the edge beams under the deck: the one facing us shows its face
    for (const s of [-1, 1]) {
      const face = S.map(([x, y, tx, ty]) => Math.max(0, tx * s) * 2.6);
      poly(c, [...S.map(([x, y, tx, ty]) => [x - ty * s * hw, y + tx * s * hw]), ...S.slice().reverse().map(([x, y, tx, ty], j) => [x - ty * s * hw, y + tx * s * hw + face[S.length - 1 - j]])]); c.closePath();
      c.fillStyle = LG(c, 0, 0, 0, 1, [Wd.shade, Wd.shade]); c.fillStyle = rgb(mix(Wd.shade, Wd.edge, 0.3)); c.fill(); stroke(c, rgb(Wd.edge, 0.9), EW_S);
    }
    for (let i = 0; i < S.length - 1; i++) {
      if (R() < 0.04) continue;   // a missing plank shows the water through the gap
      const [x, y, tx, ty] = S[i], nx = -ty, ny = tx, sk = (R() - 0.5) * 0.25, w0 = hw + (R() - 0.5) * 0.8, w1 = hw + (R() - 0.5) * 0.8, pw = 3.0;
      const q = [[0.15, -w0], [pw, -w0 + sk * 3], [pw, w1 + sk * 3], [0.15, w1]].map(([u, v]) => [x + tx * u + nx * v, y + ty * u + ny * v]);
      poly(c, q); c.closePath(); c.fillStyle = LG(c, q[0][0], q[0][1], q[2][0], q[2][1], [Wd.lit, Wd.mid, mix(Wd.mid, Wd.shade, 0.5)]); c.fill(); stroke(c, rgb(Wd.edge, 0.75), 0.6);
      const m0 = lerpPt(q[0], q[1], 0.5), m1 = lerpPt(q[3], q[2], 0.5); furrow(c, [lerpPt(m0, m1, 0.08), lerpPt(m0, m1, 0.5).map((v, j) => v + (j ? 0.3 : 0)), lerpPt(m0, m1, 0.92)], rgb(Wd.edge, 0.4), rgb(B.ridge, 0.3), 0.45, [-0.5, -0.5]);
      for (const f of [0.14, 0.86]) { const p = lerpPt(m0, m1, f); c.beginPath(); c.arc(p[0], p[1], 0.5, 0, TAU); c.fillStyle = rgb(mix(Wd.edge, [40, 40, 52], 0.4)); c.fill(); }
    }
    for (const [px, py] of posts) { c.beginPath(); c.roundRect(px - 1.2, py - 1.8, 2.4, 2.2, 0.8); c.fillStyle = LG(c, px - 1.2, 0, px + 1.2, 0, [B.lit, B.mid, B.shade]); c.fill(); stroke(c, B.edge, EW_S); c.beginPath(); c.ellipse(px, py - 1.8, 1.2, 0.5, 0, 0, TAU); c.fillStyle = rgb(mix(B.lit, B.ridge, 0.3)); c.fill(); }
  }
  // swamp gas bubbling up: a few domes on the water (a thin lit ring, a highlight, a faint fill) and a ripple ring;
  // a faint sickly glow over them at dusk
  function bubbles(c, P, x, y, s, seed) {
    const Wt = P.bog, R = rand(seed);
    c.beginPath(); c.ellipse(x, y + 1, 7 * s, 2.4 * s, 0, 0, TAU); stroke(c, rgb(Wt.lit, 0.45), 0.5);
    c.beginPath(); c.ellipse(x + 1, y + 1.2, 11 * s, 3.8 * s, 0, 0.3, 2.6); stroke(c, rgb(Wt.lit, 0.25), 0.45);
    if (P.name === 'dusk') glow(c, x, y - 1, 12 * s, [170, 230, 110], 0.18);
    for (const [dx, dy, r] of [[0, 0, 3], [4.4, 1, 1.8], [-3.8, 0.8, 1.4], [2, -3, 1]]) {
      const bx = x + dx * s, by = y + dy * s, rr = r * s;
      c.beginPath(); c.arc(bx, by, rr, Math.PI, 0); c.closePath(); c.fillStyle = rgb(mix(Wt.mid, Wt.lit, 0.4), 0.35); c.fill(); stroke(c, rgb(mix(Wt.lit, [255, 255, 240], 0.3), 0.7), 0.45);
      c.beginPath(); c.arc(bx - rr * 0.3, by - rr * 0.35, rr * 0.45, Math.PI * 1.1, Math.PI * 1.6); stroke(c, 'rgba(255,255,245,.85)', 0.5);
    }
  }
  // ---- the boss lair ----
  // a thorn of the game's spike look: a curved tapering cone, bark at the base, crimson at the tip, lit on its left
  function thornSpike(c, P, x, y, a, len, w) {
    const T = P.thorn, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, tx = x + ca * len, ty = y + sa * len;
    c.beginPath(); c.moveTo(x + nx * w / 2, y + ny * w / 2); c.quadraticCurveTo(x + ca * len * 0.5 + nx * w * 0.3, y + sa * len * 0.5 + ny * w * 0.3, tx, ty); c.quadraticCurveTo(x + ca * len * 0.5 - nx * w * 0.15, y + sa * len * 0.5 - ny * w * 0.15, x - nx * w / 2, y - ny * w / 2); c.closePath();
    c.fillStyle = LG(c, x, y, tx, ty, [T.base, T.mid, T.tip]); c.fill(); stroke(c, rgb(T.edge, 0.85), 0.45);
    c.beginPath(); c.moveTo(x + nx * w * 0.25 + ca * len * 0.1, y + ny * w * 0.25 + sa * len * 0.1); c.lineTo(x + ca * len * 0.7, y + sa * len * 0.7); stroke(c, rgb(T.lit, 0.55), 0.4);
  }
  // a thorn hedge along pts (dense polyline), h tall, seen in the map's 3/4 view: a dark solid body, a wall of small
  // leaf clumps over it stacked back to front, bramble canes arching out of it set with crimson thorns, the odd big
  // thorn standing out of its top, its shadow on the ground down and to the right
  function thornHedge(c, P, pts, h, seed, k0 = 0.12) {
    const L = P.leaf, B = P.bark, R = rand(seed), S = resample(pts, 7.5), sun = P.sun ?? SUN, sl = h * (P.shLen ?? 0.3);
    for (const [x, y] of S) softShadow(c, x + 2 + Math.cos(sun) * sl * 0.8, y + 2 + Math.sin(sun) * sl * 0.4, h * 0.62, h * 0.24, P.shadowA * 0.8, sun * 0.5, P.shadowC);
    poly(c, [...S.map(([x, y]) => [x, y + 1]), ...S.slice().reverse().map(([x, y]) => [x, y - h * 0.85])]); c.closePath(); c.fillStyle = LG(c, 0, Math.min(...S.map(p => p[1])) - h, 0, Math.max(...S.map(p => p[1])), [L.shade, L.deep]); c.fill();
    const items = S.map(([x, y], i) => ({ x: x + (R() - 0.5) * 2.5, y, i, r: h * (0.42 + R() * 0.14) }));
    // a back row (the hedge's far half) then the front row, each sorted back to front
    const back = items.map(o => ({ ...o, y0: o.y - h * 0.62, k: k0 + 0.12 })), front = items.map(o => ({ ...o, y0: o.y - h * 0.4, k: k0 }));
    for (const o of back.sort((p, q) => p.y - q.y)) lobe(c, P, o.x, o.y0, o.r * 0.9, o.k, R, 'clump', 0.8);
    const canes = [];
    for (const o of front.sort((p, q) => p.y - q.y)) {
      lobe(c, P, o.x, o.y0, o.r, o.k, R, 'clump', 0.82);
      if (o.i % 3 === 1) canes.push(o);
    }
    c.lineCap = 'round';
    for (const o of canes) {
      const s = R() < 0.5 ? -1 : 1, x0 = o.x, y0 = o.y0 + o.r * 0.2, L2 = h * (0.5 + R() * 0.35), x2 = x0 + s * L2 * 0.8, y2 = y0 - L2 * 0.35 + R() * L2 * 0.5;
      const cane = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x2) / 2, y0 - L2 * 0.55, x2, y2); };
      cane(); stroke(c, B.edge, 2); cane(); stroke(c, mix(B.mid, L.mid, 0.35), 1.1);
      for (let k = 1; k <= 4; k++) { const t = k / 5, px = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * (x0 + x2) / 2 + t * t * x2, py = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * (y0 - L2 * 0.55) + t * t * y2; thornSpike(c, P, px, py, (k % 2 ? -Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.6) + (s < 0 ? -0.3 : 0.3), 3.2, 1.7); }
    }
    for (let i = 2; i < S.length - 1; i += 4 + (R() * 3 | 0)) { const [x, y] = S[i]; thornSpike(c, P, x + (R() - 0.5) * 3, y - h * 0.82, -Math.PI / 2 + (R() - 0.5) * 0.9, 5 + R() * 3, 2.6); }
  }
  // a giant flytrap standing at (x, y), its head facing dir (1 right, -1 left): broad leaves lying round its foot, a
  // thick curving stalk, a trap of two jaws gaping open (the lime outer shell lit from the top left with crimson
  // spots, the pale margin, the crimson lining, long cream cilia teeth with coral tips), nectar glistening in its maw
  function flytrap(c, P, x, y, s, dir = 1, open = 0.7, seed = 1) {
    const T = P.trap, Lf = P.leaf, R = rand(seed);
    castShadow(c, P, x, y, 40 * s, 22 * s);
    for (const a of [Math.PI * 0.95, Math.PI * 0.08, Math.PI * 0.55]) canopyLeaf(c, P, x, y, x + Math.cos(a) * 15 * s, y + Math.sin(a) * 6 * s + 1.5, 0.36, 0.05);
    const hx = x + dir * 5 * s, hy = y - 30 * s;
    const stalk = () => { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - dir * 5 * s, y - 12 * s, hx - dir * 7 * s, hy + 12 * s, hx, hy); };
    stalk(); stroke(c, T.stem[3], 5.6 * s); stalk(); c.strokeStyle = LG(c, x - 3 * s, 0, x + 3 * s, 0, [T.stem[0], T.stem[1], T.stem[2]]); c.lineWidth = 4 * s; c.stroke();
    c.save(); c.translate(-1 * s, 0); stalk(); stroke(c, rgb(T.stem[0], 0.55), 0.9 * s); c.restore();
    canopyLeaf(c, P, x - dir * 3 * s, y - 14 * s, x - dir * 13 * s, y - 20 * s, 0.3, -0.05);
    c.save(); c.translate(hx, hy); c.scale(dir, 1);
    const Lj = 21 * s, Tj = 10 * s, au = -(0.5 + open * 0.5), ad = 0.22 + open * 0.42;
    const P2 = (a, u, v) => [Math.cos(a) * u - Math.sin(a) * v, Math.sin(a) * u + Math.cos(a) * v];
    const shell = (a, sg) => { const p = (u, v) => P2(a, u, v * sg); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(...p(Lj * 0.2, -Tj * 1.3), ...p(Lj * 0.85, -Tj * 1.15), ...p(Lj, -Tj * 0.1)); c.quadraticCurveTo(...p(Lj * 0.55, Tj * 0.22), 0, 0); c.closePath(); };
    const lining = (a, sg, dep) => { const p = (u, v) => P2(a, u, v * sg); c.beginPath(); c.moveTo(...p(Lj * 0.05, 0)); c.quadraticCurveTo(...p(Lj * 0.55, Tj * 0.22), ...p(Lj * 0.98, -Tj * 0.1)); c.quadraticCurveTo(...p(Lj * 0.6, -Tj * dep), ...p(Lj * 0.05, 0)); c.closePath(); };
    const rimPt = (a, sg, u) => { const v = Tj * 0.22 * 4 * u * (1 - u) - Tj * 0.1 * u * u; return P2(a, Lj * u, v * sg); };
    // the maw between the jaws, dark crimson, nectar glints
    { const a1 = rimPt(au, 1, 0.98), a2 = rimPt(ad, -1, 0.98); c.beginPath(); c.moveTo(0, 0); for (let k = 1; k <= 10; k++) c.lineTo(...rimPt(au, 1, k / 10)); c.quadraticCurveTo((a1[0] + a2[0]) / 2 + 2 * s, (a1[1] + a2[1]) / 2, ...a2); for (let k = 10; k >= 0; k--) c.lineTo(...rimPt(ad, -1, k / 10)); c.closePath(); c.fillStyle = RG(c, Lj * 0.4, 0, Lj * 0.6, [T.lin[2], T.lin[3], T.lin[4]]); c.fill(); }
    glow(c, Lj * 0.42, Lj * 0.05, 7 * s, T.nectar, 0.35);
    for (const [u, v, r] of [[0.4, 0.05, 1], [0.55, 0.12, 0.7], [0.3, 0.14, 0.6]]) { c.beginPath(); c.arc(Lj * u, Lj * v, r * s, 0, TAU); c.fillStyle = rgb([255, 236, 150], 0.9); c.fill(); }
    // the lower jaw: its shell (mostly hidden), then its lining facing up at us
    shell(ad, -1); c.fillStyle = LG(c, 0, 0, Lj * 0.4, Tj * 1.4, [T.dome[2], T.dome[3], T.dome[4]]); c.fill(); stroke(c, rgb(T.deep, 0.9), EW_S);
    lining(ad, -1, 0.55); c.fillStyle = LG(c, 0, 0, Lj, Tj * 0.5, [T.lin[0], T.lin[1], T.lin[2]]); c.fill();
    // the teeth: tapering cilia along the rim, pointing into the maw, cream with a coral tip, a dark edge
    const cilia = (a, sg) => { for (let k = 0; k < 6; k++) { const u = 0.26 + k / 5 * 0.7, p = rimPt(a, sg, u), q = rimPt(a, sg, Math.min(1, u + 0.03)), tg = Math.atan2(q[1] - p[1], q[0] - p[0]), ta = tg + sg * (Math.PI / 2 - 0.25), Lc = (3.6 + 2.6 * Math.sin(u * Math.PI)) * s, bw = 1.25 * s;
      const e = [p[0] + Math.cos(ta) * Lc, p[1] + Math.sin(ta) * Lc], b1 = [p[0] - Math.cos(tg) * bw, p[1] - Math.sin(tg) * bw], b2 = [p[0] + Math.cos(tg) * bw, p[1] + Math.sin(tg) * bw];
      poly(c, [b1, e, b2]); c.closePath(); c.fillStyle = LG(c, p[0], p[1], e[0], e[1], [T.cil[0], T.cil[1], T.cil[2]]); c.fill(); stroke(c, rgb(mix(T.cil[3], T.deep, 0.45), 0.8), 0.45); } };
    cilia(ad, -1);
    // the upper jaw's shell: the lime dome, crimson spots, a pale margin band along its rim, a rim light on its back
    shell(au, 1); c.fillStyle = LG(c, ...P2(au, Lj * 0.3, -Tj * 1.2), ...P2(au, Lj * 0.5, Tj * 0.2), [T.dome[0], T.dome[1], T.dome[2], T.dome[3]]); c.fill();
    c.save(); shell(au, 1); c.clip();
    for (const [u, v, r] of [[0.35, -0.55, 1.4], [0.6, -0.6, 1.1], [0.5, -0.25, 0.9], [0.78, -0.35, 0.8]]) { const p = P2(au, Lj * u, Tj * v); c.beginPath(); c.ellipse(p[0], p[1], r * s * 1.3, r * s * 0.8, au, 0, TAU); c.fillStyle = rgb(T.spot, 0.75); c.fill(); }
    c.beginPath(); c.moveTo(0, 0); for (let k = 1; k <= 10; k++) c.lineTo(...rimPt(au, 1, k / 10)); stroke(c, rgb(T.margin[1], 0.95), 3 * s);
    for (let k = 1; k < 6; k++) { const p = P2(au, Lj * k / 6, -Tj * 0.95), q = P2(au, Lj * (k / 6) * 0.95 + Lj * 0.05, Tj * 0.05); furrow(c, [p, q], rgb(T.deep, 0.35), rgb(T.dome[0], 0.4), 0.5, [-0.5, -0.5]); }
    c.restore();
    shell(au, 1); stroke(c, rgb(T.deep, 0.9), EW);
    { const p = (u, v) => P2(au, u, v); c.beginPath(); c.moveTo(...p(Lj * 0.15, -Tj * 0.75)); c.bezierCurveTo(...p(Lj * 0.3, -Tj * 1.05), ...p(Lj * 0.65, -Tj * 1.0), ...p(Lj * 0.8, -Tj * 0.7)); stroke(c, rgb(T.dome[0], 0.85), 1.1 * s); }
    cilia(au, 1);
    // the hinge knuckle
    c.beginPath(); c.arc(0, 0, 3.4 * s, 0, TAU); c.fillStyle = RG(c, 0, 0, 3.4 * s, [T.stem[0], T.stem[1], T.stem[2]]); c.fill(); stroke(c, T.stem[3], EW_S);
    c.restore();
  }

  window.MAP = { PAL, COIN, TOKEN_R, TOKEN_LIFT, SUN, LG, RG, rgb, mix, lerp, rand, spline, offset, poly, closedSmooth, furrow, dist, softShadow, castShadow, glow, lightPool, rays,
    sea, waveRows, reefShelf, coralHead, swells, plume, seaRock, reef, glints, waveCurl, surfWet, surfFoam, surf, sand, grass, grassMass, grassMarks, dapple, underShade, tuft, tuftCluster, tallGrass, pebble, flower, flowerPatch, contours, bank,
    creek, waterfall, sunPatch, clover, springPool, springRocks, channel, delta, deltaFoam, roads, road, roadRamp, roadSteps, sandPath, trail, bridge, rock, shell, driftwood, fallenLog, canoe, prints,
    leaf, vine, liana, leafBlob, canopyLeaf, lobe, trunk, branch, broadTree, figTree, tallTree, leafTree, banana, bananaLeaf, fanPalm, fan, bush, plant, fern, bigLeaf,
    palm, frond, hut, clearing, torch, signpost, plank, sign, star, nodeGlow, node, banner, thruster, firefly,
    offsetClosed, closedSpline, resample, glyph, ashlar, mossDrape, stoneTerrace, stoneSteps, ruinBlock, pillar, drum, idolHead, brazier, archway, paving,
    bogPool, lilyPad, reeds, mangrove, boardwalk, bubbles, thornSpike, thornHedge, flytrap, padlock };
})();
