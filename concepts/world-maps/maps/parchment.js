// Concept 4: Kiko's Treasure Map. A hand-drawn explorer's map on aged parchment, drawn by Kiko the lemur:
// sepia-inked coastlines and doodled landmarks with watercolour washes per region, red dotted trails,
// wax-seal nodes, skull-and-crossbones seals for the bosses, margin notes and a compass rose.
// The top of the sheet is rolled up and folded under: new levels arrive when that panel unfolds.
// The parchment, washes and ink doodles never change, so they are painted once into an offscreen canvas
// (deterministic, per pixel scale); everything that moves is drawn on top each frame.
(() => {
  const W = 360, H = 2400, TAU = Math.PI * 2;
  const HAND = '"Bradley Hand", "Noteworthy", "Chalkboard SE", cursive';
  const NUMF = '"Chalkboard SE", "Marker Felt", sans-serif';
  const LABF = 'Georgia, "Times New Roman", serif';
  const INK = [92, 56, 26];
  const ink = (a = 0.85) => K.rgb(INK, a);

  // ---------- layout ----------
  const N = {
    1: [92, 2238], 2: [250, 2160], 3: [172, 2066],
    4: [76, 1972], 5: [62, 1862], 6: [104, 1754],
    7: [276, 1952], 8: [290, 1822],
    9: [184, 1640],
    10: [180, 1492],
    11: [78, 1392], 12: [88, 1268], 13: [282, 1318],
    14: [180, 1156],
    15: [180, 1000],
    16: [64, 838], 17: [180, 804], 18: [296, 838],
    19: [180, 664], 20: [180, 478],
  };
  const BEND = { '1-2': 22, '2-3': 20, '3-4': 10, '4-5': -16, '5-6': -14, '6-9': -26, '3-7': -12, '7-8': 14, '8-9': 30,
    '9-10': 14, '10-11': 12, '11-12': -16, '12-14': -22, '10-13': -12, '13-14': 22, '14-15': -12,
    '15-16': 22, '15-17': 8, '15-18': -22, '16-19': 24, '17-19': -10, '18-19': -24, '19-20': 16 };
  const radius = l => l.boss ? 27 : 17;
  const ctrlOf = (a, b, bend) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [mx - dy / L * bend, my + dx / L * bend];
  };
  const EDGES = PATHS.map(([a, b], i) => ({ a: N[a], b: N[b], c: ctrlOf(N[a], N[b], BEND[a + '-' + b] || 0), lit: PATH_STATE[i] === 'lit', ids: [a, b] }));
  const qpt = (e, u) => { const v = 1 - u; return [v * v * e.a[0] + 2 * v * u * e.c[0] + u * u * e.b[0], v * v * e.a[1] + 2 * v * u * e.c[1] + u * u * e.b[1]]; };

  // ---------- small helpers ----------
  function blobPath(ctx, cx, cy, rx, ry, seed, n = 14, j = 0.18) {
    const r = K.rand(seed), p = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (r() - 0.5) * 2 * j; p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    ctx.beginPath();
    const m = (i) => { const A = p[i % n], B = p[(i + 1) % n]; return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; };
    ctx.moveTo(...m(0));
    for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(...p[i % n], ...m(i));
    ctx.closePath();
  }
  // a watercolour wash: soft fill that pools darker at its rim, a second bleed, and granulation specks
  function wash(ctx, cx, cy, rx, ry, col, seed, a = 0.45) {
    ctx.save();
    blobPath(ctx, cx + 4, cy + 3, rx * 1.06, ry * 1.06, seed + 9, 16, 0.22);
    ctx.fillStyle = K.rgb(col, a * 0.28); ctx.fill();
    blobPath(ctx, cx, cy, rx, ry, seed, 16, 0.2);
    ctx.fillStyle = K.rg(ctx, cx - rx * 0.2, cy - ry * 0.25, Math.max(rx, ry) * 1.1, [K.rgb(K.lift(col, 30), a * 0.45), K.rgb(col, a * 0.7), K.rgb(K.lift(col, -20), a * 0.9)]);
    ctx.fill();
    ctx.strokeStyle = K.rgb(K.lift(col, -45), a * 0.55); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.clip();
    const r = K.rand(seed * 3 + 1);
    for (let i = 0; i < rx * ry / 90; i++) { ctx.fillStyle = K.rgb(K.lift(col, -50), 0.12 + r() * 0.12); ctx.fillRect(cx - rx + r() * rx * 2, cy - ry + r() * ry * 2, 1 + r() * 1.5, 1 + r() * 1.5); }
    ctx.restore();
  }
  function leaf(ctx, x, y, len, ang, col, wid = 0.28) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -len * wid, len, len * 0.08);
    ctx.quadraticCurveTo(len * 0.5, len * wid * 0.7, 0, 0);
    ctx.fillStyle = K.lg(ctx, 0, -len * wid, 0, len * wid, [K.lift(col, 45), col, K.lift(col, -40)]); ctx.fill();
    ctx.strokeStyle = K.rgb(K.lift(col, -70), 0.9); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.quadraticCurveTo(len * 0.5, -len * wid * 0.15, len * 0.95, len * 0.07); ctx.strokeStyle = K.rgb(K.lift(col, -60), 0.7); ctx.lineWidth = 0.7; ctx.stroke();
    ctx.restore();
  }
  function palm(ctx, x, y, h, lean, s = 1) {
    const tx = x + lean, ty = y - h;
    ctx.save(); ctx.lineCap = 'round';
    K.shadow(ctx, x + 3, y + 1, 12 * s, 3.5 * s, 0.22);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.1, y - h * 0.55, tx, ty);
    ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 6 * s; ctx.stroke();
    ctx.strokeStyle = '#b07a44'; ctx.lineWidth = 3 * s; ctx.stroke();
    for (let i = 1; i < 7; i++) {   // trunk rings
      const u = i / 7, v = 1 - u, px = v * v * x + 2 * v * u * (x + lean * 0.1) + u * u * tx, py = v * v * y + 2 * v * u * (y - h * 0.55) + u * u * ty;
      ctx.strokeStyle = 'rgba(80,46,20,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 3 * s, py + 0.5); ctx.lineTo(px + 3 * s, py - 0.5); ctx.stroke();
    }
    const fr = [-2.9, -2.3, -1.6, -0.95, -0.25, 0.3];
    fr.forEach((a, i) => leaf(ctx, tx, ty, (20 + (i % 2) * 5) * s, a, i % 2 ? [74, 150, 58] : [96, 172, 66], 0.24));
    for (const [dx, dy] of [[-2.5, 3], [2.5, 3.5], [0, 5]]) { ctx.fillStyle = K.rg(ctx, tx + dx * s - 1, ty + dy * s - 1, 3.5 * s, ['#c08850', '#6a4020']); ctx.beginPath(); ctx.arc(tx + dx * s, ty + dy * s, 2.6 * s, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function fern(ctx, x, y, s, col = [80, 150, 60]) {
    for (let i = 0; i < 5; i++) leaf(ctx, x, y, (12 + (i % 2) * 4) * s, -Math.PI / 2 + (i - 2) * 0.45, i % 2 ? col : K.lift(col, 18), 0.3);
  }
  function tinyTree(ctx, x, y, s, col = [86, 150, 64]) {   // the classic map symbol: a little lollipop tree
    ctx.strokeStyle = ink(0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5 * s); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, x - 2 * s, y - 9 * s, 6 * s, [K.lift(col, 40), col, K.lift(col, -35)]); ctx.beginPath(); ctx.arc(x, y - 8 * s, 4.5 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = K.rgb(K.lift(col, -60), 0.8); ctx.lineWidth = 0.8; ctx.stroke();
  }
  function pine(ctx, x, y, s, snow) {
    for (let i = 0; i < 3; i++) {
      const yy = y - i * 6 * s, w = (9 - i * 2.2) * s;
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 10 * s); ctx.lineTo(x + w, yy); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, x - w, yy - 10 * s, x + w, yy, ['#5e9a7a', '#2e6450']); ctx.fill();
      ctx.strokeStyle = 'rgba(30,70,56,.9)'; ctx.lineWidth = 0.8; ctx.stroke();
      if (snow) { ctx.fillStyle = 'rgba(250,253,255,.95)'; ctx.beginPath(); ctx.moveTo(x - w * 0.45, yy - 5 * s); ctx.lineTo(x, yy - 10 * s); ctx.lineTo(x + w * 0.5, yy - 5 * s); ctx.quadraticCurveTo(x, yy - 6.5 * s, x - w * 0.45, yy - 5 * s); ctx.fill(); }
    }
    ctx.fillStyle = '#6a4424'; ctx.fillRect(x - 1.2 * s, y, 2.4 * s, 3 * s);
  }
  function rock(ctx, x, y, r, col, seed) {
    blobPath(ctx, x, y, r, r * 0.7, seed, 7, 0.22);
    ctx.fillStyle = K.rg(ctx, x - r * 0.4, y - r * 0.4, r * 1.4, [K.lift(col, 40), col, K.lift(col, -40)]); ctx.fill();
    ctx.strokeStyle = K.rgb(K.lift(col, -60), 0.9); ctx.lineWidth = 0.9; ctx.stroke();
  }
  function label(ctx, txt, x, y, size = 11, a = 0.8, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = `italic 700 ${size}px ${LABF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = '1.5px'; } catch (e) { }
    ctx.fillStyle = 'rgba(255,246,220,.55)'; ctx.fillText(txt, 0.7, 0.9);
    ctx.fillStyle = ink(a); ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
  function note(ctx, txt, x, y, size = 12, rot = -0.06, col = INK, a = 0.9) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = `700 ${size}px ${HAND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = K.rgb(col, a); ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
  function inkArrow(ctx, x0, y0, cx, cy, x1, y1, col = INK, a = 0.8) {
    ctx.save(); ctx.strokeStyle = K.rgb(col, a); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
    const an = Math.atan2(y1 - cy, x1 - cx);
    ctx.beginPath(); ctx.moveTo(x1 - Math.cos(an - 0.5) * 6, y1 - Math.sin(an - 0.5) * 6); ctx.lineTo(x1, y1); ctx.lineTo(x1 - Math.cos(an + 0.5) * 6, y1 - Math.sin(an + 0.5) * 6); ctx.stroke();
    ctx.restore();
  }
  function bone(ctx, x0, y0, x1, y1, w) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), an = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(an);
    ctx.fillStyle = K.lg(ctx, 0, -w, 0, w, ['#fffaf0', '#eadcc0', '#b8a07a']);
    ctx.beginPath(); ctx.rect(0, -w * 0.45, L, w * 0.9); ctx.fill();
    for (const ex of [0, L]) for (const ey of [-1, 1]) { ctx.beginPath(); ctx.arc(ex, ey * w * 0.55, w * 0.62, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(140,110,70,.9)'; ctx.lineWidth = 0.9;
    for (const ex of [0, L]) for (const ey of [-1, 1]) { ctx.beginPath(); ctx.arc(ex, ey * w * 0.55, w * 0.62, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = K.lg(ctx, 0, -w, 0, w, ['#fffaf0', '#eadcc0', '#b8a07a']); ctx.fillRect(-0.5, -w * 0.45, L + 1, w * 0.9);
    ctx.restore();
  }
  function skull(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = K.rg(ctx, -3, -4, 11, ['#fffdf5', '#efe2c6', '#b49c74']);
    ctx.beginPath(); ctx.arc(0, -1, 7, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(130,100,64,.95)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#5a2a20';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 2.7, -1, 1.9, 2.2, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(0, 1.5); ctx.lineTo(-1, 3); ctx.lineTo(1, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,30,.8)'; ctx.lineWidth = 0.6; for (const d of [-1.6, 0, 1.6]) { ctx.beginPath(); ctx.moveTo(d, 3.8); ctx.lineTo(d, 5); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- region landmarks (static) ----------
  function jungleArt(ctx) {
    wash(ctx, 180, 2190, 190, 150, [104, 166, 72], 11, 0.5);
    wash(ctx, 60, 2300, 90, 70, [84, 150, 64], 12, 0.4);
    wash(ctx, 184, 1630, 150, 92, [96, 160, 70], 13, 0.45);
    // start camp: a little tent and campfire stones by node 1
    const tx = 40, ty = 2200;
    ctx.fillStyle = K.lg(ctx, tx - 16, ty - 22, tx + 16, ty, ['#f0c070', '#c8742c', '#8a4618']);
    ctx.beginPath(); ctx.moveTo(tx - 16, ty); ctx.lineTo(tx, ty - 24); ctx.lineTo(tx + 16, ty); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(110,52,18,.9)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#5a2c10'; ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx, ty - 12); ctx.lineTo(tx + 4, ty); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,170,.6)'; ctx.beginPath(); ctx.moveTo(tx - 13, ty - 2); ctx.lineTo(tx - 1, ty - 21); ctx.stroke();
    for (let i = 0; i < 6; i++) rock(ctx, 46 + Math.cos(i) * 7, 2222 + Math.sin(i) * 3, 2.4, [150, 140, 120], 40 + i);
    // palms and ferns along the edges
    palm(ctx, 22, 2120, 44, 10); palm(ctx, 336, 2246, 48, -12); palm(ctx, 330, 2070, 40, -8, 0.9); palm(ctx, 160, 2290, 30, 6, 0.75);
    palm(ctx, 20, 1660, 40, 10, 0.9); palm(ctx, 342, 1600, 44, -12); palm(ctx, 300, 1702, 34, -6, 0.8);
    fern(ctx, 128, 2200, 1); fern(ctx, 300, 2128, 0.9); fern(ctx, 216, 2264, 0.8); fern(ctx, 52, 2280, 1.1); fern(ctx, 110, 2118, 0.8);
    fern(ctx, 96, 1688, 0.9); fern(ctx, 262, 1600, 0.9); fern(ctx, 60, 1600, 0.8); fern(ctx, 318, 1660, 0.8);
    const r = K.rand(77);
    for (let i = 0; i < 18; i++) tinyTree(ctx, 20 + r() * 320, 2090 + r() * 220, 0.8 + r() * 0.4);
    label(ctx, 'ROOTWOOD JUNGLE', 260, 2228, 10, 0.75, -0.04);
  }
  function templeArt(ctx) {
    wash(ctx, 84, 1862, 86, 140, [196, 168, 108], 21, 0.5);
    // stepped pyramid with a gold idol shrine on top, node 5 sits on its face
    const px = 70, base = 1918;
    for (let i = 0; i < 5; i++) {
      const w = 116 - i * 22, y = base - i * 16, x = px - w / 2;
      ctx.fillStyle = K.lg(ctx, x, y - 16, x, y, ['#d8c69a', '#a8946a', '#7a6646']); ctx.fillRect(x, y - 16, w, 16);
      ctx.fillStyle = 'rgba(255,248,220,.5)'; ctx.fillRect(x, y - 16, w, 2.2);
      ctx.fillStyle = 'rgba(70,56,36,.35)'; ctx.fillRect(x + w - 8, y - 16, 8, 16);
      ctx.strokeStyle = 'rgba(96,78,50,.9)'; ctx.lineWidth = 0.9; ctx.strokeRect(x, y - 16, w, 16);
      ctx.strokeStyle = 'rgba(96,78,50,.45)';
      for (let b = x + 9 + (i % 2) * 5; b < x + w - 4; b += 11) { ctx.beginPath(); ctx.moveTo(b, y - 16); ctx.lineTo(b, y - 8); ctx.moveTo(b + 5, y - 8); ctx.lineTo(b + 5, y); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + w, y - 8); ctx.stroke();
    }
    // gold shrine
    const sx = px, sy = base - 80;
    ctx.fillStyle = K.lg(ctx, sx - 12, sy - 18, sx + 12, sy, ['#fff2a0', '#f0b628', '#a8680e']);
    ctx.beginPath(); ctx.moveTo(sx - 12, sy); ctx.lineTo(sx - 10, sy - 14); ctx.lineTo(sx, sy - 22); ctx.lineTo(sx + 10, sy - 14); ctx.lineTo(sx + 12, sy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,90,10,.95)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#6a3a10'; ctx.beginPath(); ctx.roundRect(sx - 4, sy - 10, 8, 10, [4, 4, 0, 0]); ctx.fill();
    // vines over the steps
    ctx.strokeStyle = 'rgba(60,120,40,.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(px - 50, base - 64); ctx.bezierCurveTo(px - 46, base - 40, px - 60, base - 30, px - 54, base - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 30, base - 50); ctx.bezierCurveTo(px + 38, base - 30, px + 28, base - 20, px + 40, base); ctx.stroke();
    for (let i = 0; i < 6; i++) { leaf(ctx, px - 52 + (i % 2) * 4, base - 58 + i * 10, 7, i % 2 ? 0.4 : 2.6, [86, 160, 60]); leaf(ctx, px + 32 + (i % 2) * 4, base - 46 + i * 8, 6, i % 2 ? 0.4 : 2.6, [96, 170, 64]); }
    // broken columns
    for (const [cx, cy, h] of [[138, 1820, 30], [24, 1760, 22], [140, 1960, 18], [28, 1990, 26]]) {
      ctx.fillStyle = K.lg(ctx, cx - 6, 0, cx + 6, 0, ['#e6d6aa', '#b49e72', '#7e6a48']); ctx.fillRect(cx - 5, cy - h, 10, h);
      ctx.strokeStyle = 'rgba(96,78,50,.5)'; ctx.lineWidth = 0.8; for (const fx of [-2, 1.5]) { ctx.beginPath(); ctx.moveTo(cx + fx, cy - h); ctx.lineTo(cx + fx, cy); ctx.stroke(); }
      ctx.fillStyle = '#cbb88c'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - h); ctx.lineTo(cx - 3, cy - h - 4); ctx.lineTo(cx + 2, cy - h - 1); ctx.lineTo(cx + 7, cy - h - 5); ctx.lineTo(cx + 7, cy - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a8946a'; ctx.fillRect(cx - 8, cy, 16, 3);
    }
    label(ctx, 'SUNKEN TEMPLE', 70, 2030, 10, 0.8, 0.03);
  }
  function bogArt(ctx) {
    wash(ctx, 284, 1880, 78, 120, [138, 150, 52], 31, 0.55);
    // murky pond
    blobPath(ctx, 296, 1888, 44, 22, 33, 12, 0.2);
    ctx.fillStyle = K.rg(ctx, 286, 1880, 50, ['#a8b850', '#6a7a24', '#46521a']); ctx.fill();
    ctx.strokeStyle = 'rgba(60,70,20,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(220,240,140,.45)'; ctx.lineWidth = 1; for (const [x, y, w] of [[290, 1882, 14], [306, 1894, 10], [280, 1896, 8]]) { ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.3, 0, 0, TAU); ctx.stroke(); }
    // lily pads
    for (const [x, y] of [[272, 1884], [318, 1880], [300, 1900]]) { ctx.fillStyle = K.rg(ctx, x - 2, y - 2, 6, ['#a8d860', '#4a8a28']); ctx.beginPath(); ctx.arc(x, y, 4.5, 0.4, TAU - 0.1); ctx.lineTo(x, y); ctx.fill(); }
    // dead tree
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#4e3e22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(338, 1990); ctx.quadraticCurveTo(334, 1960, 340, 1930); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(340, 1940); ctx.quadraticCurveTo(326, 1928, 318, 1932); ctx.moveTo(339, 1950); ctx.lineTo(352, 1938); ctx.moveTo(340, 1932); ctx.lineTo(336, 1916); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,190,90,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(326, 1930); ctx.quadraticCurveTo(325, 1940, 327, 1946); ctx.moveTo(320, 1932); ctx.quadraticCurveTo(318, 1940, 321, 1944); ctx.stroke();
    ctx.restore();
    // cattails
    const r = K.rand(35);
    for (let i = 0; i < 14; i++) {
      const x = 228 + r() * 120, y = 1770 + r() * 220, h = 10 + r() * 10;
      if (Math.hypot(x - N[7][0], y - N[7][1]) < 26 || Math.hypot(x - N[8][0], y - N[8][1]) < 26) continue;
      ctx.strokeStyle = '#5a7a28'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - h * 0.5, x + 1, y - h); ctx.stroke();
      ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.ellipse(x + 1, y - h + 2, 1.8, 4, 0, 0, TAU); ctx.fill();
    }
    // a snapper's eyes peeking out of the pond
    for (const d of [-1, 1]) { ctx.fillStyle = '#6a8a2a'; ctx.beginPath(); ctx.arc(250 + d * 4, 1855, 3.4, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(250 + d * 4, 1854.5, 2, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a2a10'; ctx.fillRect(250 + d * 4 - 0.5, 1853, 1, 3); }
    ctx.strokeStyle = 'rgba(70,90,30,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(250, 1857, 12, 3, 0, 0, TAU); ctx.stroke();
    label(ctx, 'MURK BOG', 300, 1760, 10, 0.8, -0.03);
    note(ctx, 'snappers!!', 238, 1876, 11, -0.18);
  }
  function grottoArt(ctx) {
    wash(ctx, 180, 1500, 160, 56, [70, 170, 190], 41, 0.4);
    wash(ctx, 290, 1520, 60, 40, [190, 90, 180], 42, 0.35);
    MUSH.forEach(([x, y, s, mag]) => {
      const cap = mag ? [226, 96, 200] : [70, 214, 226];
      ctx.fillStyle = K.lg(ctx, x - 3 * s, 0, x + 3 * s, 0, ['#fff6e8', '#d8c6b0']); ctx.beginPath(); ctx.roundRect(x - 2.5 * s, y - 10 * s, 5 * s, 10 * s, 2 * s); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y - 10 * s, 9 * s, 7 * s, 0, Math.PI, 0); ctx.quadraticCurveTo(x, y - 7 * s, x - 9 * s, y - 10 * s); ctx.closePath();
      ctx.fillStyle = K.rg(ctx, x - 3 * s, y - 15 * s, 11 * s, [K.lift(cap, 70), cap, K.lift(cap, -70)]); ctx.fill();
      ctx.strokeStyle = K.rgb(K.lift(cap, -100), 0.8); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; for (const [dx, dy, rr] of [[-4, -13, 1.6], [2, -15, 1.2], [5, -11.5, 1]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); ctx.fill(); }
    });
    label(ctx, 'GLOWSHROOM GROTTO', 180, 1550, 9.5, 0.8);
    note(ctx, "don't lick the", 300, 1440, 10.5, 0.08); note(ctx, 'glowy ones', 302, 1453, 10.5, 0.08);
  }
  const MUSH = [[96, 1508, 1.1, 0], [116, 1520, 0.8, 1], [36, 1500, 1.3, 1], [250, 1500, 1.2, 0], [272, 1514, 0.8, 1], [320, 1498, 1.4, 1], [140, 1470, 0.7, 0], [228, 1470, 0.7, 1], [60, 1528, 0.8, 0], [306, 1530, 0.9, 0]];
  function lagoonArt(ctx) {
    // water body with an inked coastline and the classic offset hatch lines
    const pts = [[-10, 1190], [70, 1196], [140, 1208], [168, 1250], [160, 1310], [150, 1360], [170, 1410], [130, 1446], [60, 1452], [-10, 1440]];
    const coast = (o) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] - o); for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; ctx.quadraticCurveTo(pts[i][0] + o, pts[i][1] + (i < 3 ? -o : i > 6 ? o : 0), m[0] + o, m[1]); } ctx.lineTo(-10, 1440 + o); ctx.closePath(); };
    coast(5); ctx.fillStyle = 'rgba(232,206,140,.7)'; ctx.fill();   // sand rim
    coast(0); ctx.fillStyle = K.lg(ctx, 0, 1190, 160, 1450, ['#7ad6cc', '#3aa6a8', '#24808a']); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(20,80,90,.25)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(70, 1320, 70 - i * 15, 100 - i * 22, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    coast(0); ctx.strokeStyle = 'rgba(30,90,96,.95)'; ctx.lineWidth = 1.6; ctx.stroke();
    for (const o of [5, 9, 13]) { coast(o); ctx.strokeStyle = `rgba(40,120,130,${0.4 - o * 0.022})`; ctx.lineWidth = 0.8; ctx.stroke(); }
    // little sand islands for the two nodes
    for (const [x, y, s] of [[N[11][0], N[11][1] + 6, 1], [N[12][0], N[12][1] + 6, 1]]) {
      blobPath(ctx, x, y, 28 * s, 13 * s, x + y, 10, 0.15); ctx.fillStyle = K.rg(ctx, x - 6, y - 6, 30, ['#fff0c0', '#e8c888', '#c09a5a']); ctx.fill();
      ctx.strokeStyle = 'rgba(150,110,60,.8)'; ctx.lineWidth = 1; ctx.stroke();
    }
    palm(ctx, 108, 1394, 26, 6, 0.7); palm(ctx, 58, 1270, 24, -6, 0.7);
    // sea serpent humps
    for (const [x, y, s] of [[124, 1326, 1], [140, 1328, 0.8]]) {
      ctx.beginPath(); ctx.arc(x, y, 6 * s, Math.PI, 0); ctx.fillStyle = K.lg(ctx, x, y - 6 * s, x, y, ['#a8e070', '#4a9a40']); ctx.fill();
      ctx.strokeStyle = 'rgba(40,90,40,.9)'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = '#f0c040'; for (const a of [-2.4, -1.6, -0.8]) { ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 1.2, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = K.lg(ctx, 108, 1318, 108, 1328, ['#b8ec80', '#4a9a40']); ctx.beginPath(); ctx.ellipse(110, 1322, 6, 4.5, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(108, 1320, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(107.6, 1320.2, 0.8, 0, TAU); ctx.fill();
    // jellyfish
    for (const [x, y] of [[36, 1340], [134, 1420], [20, 1216]]) {
      ctx.fillStyle = K.rg(ctx, x - 1, y - 2, 6, ['#ffd0f0', '#e070c0']); ctx.beginPath(); ctx.arc(x, y, 4.5, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(220,100,180,.8)'; ctx.lineWidth = 0.8; for (const d of [-2.5, 0, 2.5]) { ctx.beginPath(); ctx.moveTo(x + d, y); ctx.quadraticCurveTo(x + d + 1.5, y + 4, x + d, y + 7); ctx.stroke(); }
    }
    label(ctx, 'HIDDEN LAGOON', 70, 1226, 9.5, 0.8);
    note(ctx, 'jellies sting', 44, 1436, 10.5, -0.05);
  }
  function mineArt(ctx) {
    wash(ctx, 290, 1300, 74, 100, [176, 124, 72], 51, 0.45);
    // the mountain
    ctx.beginPath(); ctx.moveTo(206, 1352); ctx.lineTo(244, 1262); ctx.lineTo(262, 1276); ctx.lineTo(300, 1216); ctx.lineTo(332, 1262); ctx.lineTo(346, 1250); ctx.lineTo(370, 1300); ctx.lineTo(370, 1352); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 230, 1216, 340, 1352, ['#d8a870', '#a06a3a', '#6a4422']); ctx.fill();
    ctx.strokeStyle = 'rgba(100,60,28,.95)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,236,190,.35)'; ctx.beginPath(); ctx.moveTo(300, 1216); ctx.lineTo(282, 1260); ctx.lineTo(292, 1258); ctx.lineTo(276, 1300); ctx.lineTo(300, 1250); ctx.lineTo(290, 1252); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(100,60,28,.6)'; ctx.lineWidth = 0.9;
    for (const [x0, y0, x1, y1] of [[300, 1216, 312, 1250], [312, 1250, 306, 1280], [244, 1262, 250, 1290], [332, 1262, 340, 1288]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    // mine entrance with timber frame left of node 13
    const ex = 236, ey = 1344;
    ctx.fillStyle = K.rg(ctx, ex, ey - 6, 16, ['#2a1408', '#4a2a14']); ctx.beginPath(); ctx.moveTo(ex - 11, ey); ctx.lineTo(ex - 11, ey - 14); ctx.quadraticCurveTo(ex, ey - 22, ex + 11, ey - 14); ctx.lineTo(ex + 11, ey); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, ey - 24, 0, ey, ['#c88a48', '#7a4a22']);
    ctx.fillRect(ex - 13, ey - 20, 4, 20); ctx.fillRect(ex + 9, ey - 20, 4, 20); ctx.fillRect(ex - 15, ey - 23, 30, 4);
    ctx.strokeStyle = 'rgba(80,40,14,.9)'; ctx.lineWidth = 0.8; ctx.strokeRect(ex - 13, ey - 20, 4, 20); ctx.strokeRect(ex + 9, ey - 20, 4, 20); ctx.strokeRect(ex - 15, ey - 23, 30, 4);
    // rails out of the mine and a cart of gold
    ctx.strokeStyle = 'rgba(90,60,40,.9)'; ctx.lineWidth = 1;
    for (const o of [-3, 3]) { ctx.beginPath(); ctx.moveTo(ex + o, ey); ctx.quadraticCurveTo(ex + o - 10, ey + 20, ex + o - 28, ey + 30); ctx.stroke(); }
    for (let i = 1; i < 7; i++) { const u = i / 7, x = ex - u * 26 - u * u * 2, y = ey + u * 30 - u * u * 4; ctx.beginPath(); ctx.moveTo(x - 5, y - 1); ctx.lineTo(x + 5, y + 1); ctx.stroke(); }
    const cx = 218, cy = 1366;
    ctx.fillStyle = '#f2c23a'; for (const [dx, dy] of [[-4, -6], [0, -8], [4, -6], [-1, -5], [2, -4]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 2.6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = K.lg(ctx, 0, cy - 5, 0, cy + 4, ['#a07a5a', '#5a3e2a']); ctx.beginPath(); ctx.moveTo(cx - 8, cy - 5); ctx.lineTo(cx + 8, cy - 5); ctx.lineTo(cx + 6, cy + 3); ctx.lineTo(cx - 6, cy + 3); ctx.fill();
    ctx.fillStyle = '#3a2a20'; for (const d of [-4, 4]) { ctx.beginPath(); ctx.arc(cx + d, cy + 4, 2, 0, TAU); ctx.fill(); }
    // lantern post
    ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(320, 1366); ctx.lineTo(320, 1336); ctx.lineTo(328, 1336); ctx.stroke();
    // pickaxe doodle
    ctx.save(); ctx.translate(336, 1372); ctx.rotate(-0.6); ctx.fillStyle = '#9a6a3a'; ctx.fillRect(-1, -12, 2, 18); ctx.strokeStyle = '#8a9098'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -4, 9, -2.3, -0.84); ctx.stroke(); ctx.restore();
    label(ctx, 'OLD GOLD MINE', 300, 1384, 9.5, 0.8);
    note(ctx, 'gold!!', 320, 1204, 12, 0.15, [170, 110, 20]);
  }
  function cavesArt(ctx) {
    wash(ctx, 180, 1080, 170, 140, [104, 106, 186], 61, 0.42);
    // basalt hex columns flanking the trail
    const cols = [[20, 1172, 40], [36, 1178, 56], [52, 1182, 34], [312, 1214, 52], [328, 1208, 70], [344, 1216, 44], [104, 1196, 28], [258, 1196, 34], [120, 1130, 22], [246, 1120, 26]];
    for (const [x, y, h] of cols) {
      ctx.fillStyle = K.lg(ctx, x - 8, 0, x + 8, 0, ['#9a9ce0', '#5e60a8', '#34366a']); ctx.fillRect(x - 8, y - h, 16, h);
      ctx.fillStyle = 'rgba(30,30,70,.25)'; ctx.fillRect(x + 3, y - h, 5, h);
      ctx.beginPath(); ctx.moveTo(x - 8, y - h); ctx.lineTo(x - 4, y - h - 4); ctx.lineTo(x + 4, y - h - 4); ctx.lineTo(x + 8, y - h); ctx.lineTo(x + 4, y - h + 3); ctx.lineTo(x - 4, y - h + 3); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, x - 8, y - h - 4, x + 8, y - h + 3, ['#e0e4ff', '#a8acee']); ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,100,.9)'; ctx.lineWidth = 0.9; ctx.strokeRect(x - 8, y - h, 16, h); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,220,255,.6)'; ctx.beginPath(); ctx.moveTo(x - 7, y - h + 3); ctx.lineTo(x - 7, y - 2); ctx.stroke();
    }
    // stalagmites, cave rocks and a few glowing blue crystals in the deeps
    for (const [x, y, h] of [[96, 1150, 18], [108, 1156, 12], [262, 1160, 16], [274, 1152, 10], [140, 1070, 12], [230, 1066, 14], [300, 1040, 18], [314, 1046, 11]]) {
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x - 2, y - h * 0.6, x, y - h); ctx.quadraticCurveTo(x + 2, y - h * 0.6, x + 5, y); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, x - 5, y - h, x + 5, y, ['#b4b6ec', '#6a6cb4', '#3c3e7a']); ctx.fill(); ctx.strokeStyle = 'rgba(40,40,100,.8)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    for (let i = 0; i < 9; i++) { const r = K.rand(300 + i); rock(ctx, 70 + r() * 230, 1040 + r() * 160, 3 + r() * 3.5, [96, 98, 160], 320 + i); }
    // a bat doodle
    for (const [x, y, s] of [[110, 1104, 1], [126, 1094, 0.7]]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#4a3a6a';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -6, -13, -2); ctx.quadraticCurveTo(-9, 0, -8, 3); ctx.quadraticCurveTo(-4, 1, 0, 3); ctx.quadraticCurveTo(4, 1, 8, 3); ctx.quadraticCurveTo(9, 0, 13, -2); ctx.quadraticCurveTo(6, -6, 0, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0.5, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd040'; ctx.fillRect(-1.6, -0.2, 1, 1); ctx.fillRect(0.6, -0.2, 1, 1); ctx.restore();
    }
    note(ctx, 'bats. ugh.', 116, 1080, 10.5, -0.05);
    label(ctx, 'BASALT DEEPS', 180, 1210, 10, 0.8);
  }
  function crystalFrostStormArt(ctx) {
    wash(ctx, 64, 836, 70, 90, [176, 104, 206], 71, 0.45);
    wash(ctx, 180, 790, 64, 90, [176, 212, 236], 72, 0.55);
    wash(ctx, 296, 836, 70, 90, [96, 96, 170], 73, 0.5);
    // crystals
    for (const [x, y, h, a, c] of [[30, 890, 34, -0.25, 0], [44, 894, 24, 0.1, 1], [18, 900, 18, -0.6, 1], [100, 896, 26, 0.3, 0], [112, 900, 16, 0.6, 1], [26, 790, 22, -0.2, 1], [110, 780, 18, 0.25, 0]]) {
      const col = c ? [236, 120, 200] : [168, 96, 230];
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-5, -h * 0.7); ctx.lineTo(0, -h); ctx.lineTo(5, -h * 0.7); ctx.lineTo(5, 0); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, -5, 0, 5, 0, [K.lift(col, 70), col, K.lift(col, -60)]); ctx.fill();
      ctx.strokeStyle = K.rgb(K.lift(col, -90), 0.9); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(-3.5, -2); ctx.lineTo(-3.5, -h * 0.68); ctx.lineTo(0, -h * 0.92); ctx.lineTo(-1, -h * 0.66); ctx.lineTo(-1, -2); ctx.fill();
      ctx.restore();
    }
    // snowy peaks behind 17
    for (const [x, y, w, h] of [[150, 770, 50, 64], [214, 778, 44, 52], [180, 760, 40, 46]]) {
      ctx.beginPath(); ctx.moveTo(x - w, y + 30); ctx.lineTo(x, y + 30 - h); ctx.lineTo(x + w, y + 30); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, x - w, y - h, x + w, y + 30, ['#e8f4ff', '#a8c8e4', '#6c90b4']); ctx.fill();
      ctx.strokeStyle = 'rgba(70,110,150,.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - w * 0.36, y + 30 - h * 0.64); ctx.lineTo(x, y + 30 - h); ctx.lineTo(x + w * 0.38, y + 30 - h * 0.62);
      ctx.lineTo(x + w * 0.18, y + 30 - h * 0.7); ctx.lineTo(x + w * 0.04, y + 30 - h * 0.6); ctx.lineTo(x - w * 0.14, y + 30 - h * 0.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(70,110,150,.5)'; ctx.beginPath(); ctx.moveTo(x, y + 30 - h); ctx.lineTo(x + w * 0.2, y + 30); ctx.stroke();
    }
    pine(ctx, 132, 868, 0.9, true); pine(ctx, 228, 872, 1, true); pine(ctx, 214, 860, 0.7, true); pine(ctx, 146, 856, 0.7, true);
    // storm cliffs on the right
    ctx.beginPath(); ctx.moveTo(250, 900); ctx.lineTo(262, 870); ctx.lineTo(258, 850); ctx.lineTo(274, 830); ctx.lineTo(270, 812); ctx.lineTo(370, 800); ctx.lineTo(370, 900); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 250, 800, 370, 900, ['#8a8ac4', '#4e4e8a', '#2e2e5a']); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(46,46,100,.6)'; ctx.lineWidth = 1; ctx.stroke();
    for (const [cx, cy, s] of [[300, 756, 1.1], [328, 778, 0.8], [256, 776, 0.7]]) cloud(ctx, cx, cy, s, ['#c0c4ec', '#7a7cb8', '#4a4a86']);
    label(ctx, 'AMETHYST', 64, 920, 9, 0.8); label(ctx, 'GEODE', 64, 931, 9, 0.8);
    label(ctx, 'FROST HOLLOW', 180, 900, 9, 0.8);
    label(ctx, 'THUNDER', 298, 920, 9, 0.8); label(ctx, 'RIFT', 298, 931, 9, 0.8);
    note(ctx, 'brrr', 228, 744, 12, 0.1, [70, 110, 160]);
  }
  function cloud(ctx, x, y, s, cols) {
    ctx.beginPath();
    for (const [dx, dy, r] of [[-14, 2, 9], [-4, -5, 12], [9, -2, 10], [17, 4, 7], [0, 5, 10]]) { ctx.moveTo(x + (dx + r) * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
    ctx.fillStyle = K.lg(ctx, x, y - 17 * s, x, y + 15 * s, cols); ctx.fill();
  }
  function magmaArt(ctx) {
    wash(ctx, 180, 560, 175, 190, [206, 82, 48], 81, 0.45);
    wash(ctx, 180, 470, 120, 110, [190, 56, 36], 82, 0.4);
    // the volcano: the dragon's lair, node 20 sits in its mouth
    const vx = 180, top = 396, bot = 560;
    ctx.beginPath(); ctx.moveTo(52, bot); ctx.quadraticCurveTo(110, bot - 40, 148, top + 6); ctx.lineTo(160, top); ctx.lineTo(200, top); ctx.lineTo(212, top + 6); ctx.quadraticCurveTo(250, bot - 40, 308, bot); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 80, top, 300, bot, ['#b06a4a', '#7a3a26', '#4a2016']); ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,16,.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,170,.22)'; ctx.beginPath(); ctx.moveTo(150, top + 6); ctx.quadraticCurveTo(116, bot - 50, 70, bot - 4); ctx.lineTo(96, bot - 6); ctx.quadraticCurveTo(130, bot - 60, 160, top + 4); ctx.fill();
    // crater
    ctx.fillStyle = K.rg(ctx, vx, top + 2, 24, ['#fff0a0', '#ff9a30', '#c03a10']); ctx.beginPath(); ctx.ellipse(vx, top + 2, 21, 5, 0, 0, TAU); ctx.fill();
    // lava streams
    for (const s of LAVA) { lavaPath(ctx, s); ctx.strokeStyle = '#a02a0e'; ctx.lineWidth = 6; ctx.stroke(); lavaPath(ctx, s); ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 3.4; ctx.stroke(); lavaPath(ctx, s); ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 1.2; ctx.stroke(); }
    // ridges
    ctx.strokeStyle = 'rgba(80,26,14,.6)'; ctx.lineWidth = 0.9;
    for (const [x0, y0, x1, y1] of [[168, 404, 150, 470], [196, 404, 214, 480], [140, 470, 120, 530], [230, 480, 250, 540]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 4, (y0 + y1) / 2, x1, y1); ctx.stroke(); }
    // dragon bones and cooled rocks around the core
    bone(ctx, 30, 652, 52, 662, 2.4); bone(ctx, 290, 610, 312, 598, 2.4); skull(ctx, 300, 624, 0.8);
    for (let i = 0; i < 10; i++) { const r = K.rand(90 + i); rock(ctx, 30 + r() * 300, 600 + r() * 120, 3 + r() * 4, [110, 60, 46], 200 + i); }
    // lava pool around 19
    blobPath(ctx, 180, 680, 66, 22, 88, 12, 0.18); ctx.fillStyle = K.rg(ctx, 170, 674, 70, ['#ffe080', '#ff8a2a', '#b03010']); ctx.fill();
    ctx.strokeStyle = 'rgba(110,30,10,.95)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(80,30,20,.9)'; ctx.lineWidth = 1;
    for (const [x, y, r] of [[136, 686, 6], [226, 676, 5], [200, 694, 4], [150, 668, 3]]) { ctx.fillStyle = '#5a2a1e'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 0.7, 0, 0, TAU); ctx.fill(); }
    label(ctx, 'MAGMA CORE', 290, 690, 10, 0.85);
    note(ctx, 'HOT hot hot', 62, 596, 12, -0.12, [170, 50, 20]);
    note(ctx, 'bring fizz!', 64, 612, 11, -0.12, [170, 50, 20]);
    // X marks the spot: the treasure behind the drake
    ctx.save(); ctx.strokeStyle = 'rgba(190,40,24,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(258, 420); ctx.lineTo(276, 438); ctx.moveTo(276, 420); ctx.lineTo(258, 438); ctx.stroke(); ctx.restore();
    note(ctx, 'treasure?', 268, 452, 10.5, 0.1, [170, 40, 24]);
  }
  const LAVA = [[[172, 398], [160, 440], [136, 500]], [[192, 398], [210, 450], [232, 530]], [[180, 400], [182, 430], [172, 452]]];
  const lavaPath = (ctx, s) => { ctx.beginPath(); ctx.moveTo(...s[0]); ctx.quadraticCurveTo(...s[1], ...s[2]); };

  // boss lairs, drawn under the seals
  function flytrapLair(ctx, x, y) {
    // two huge jaw halves gaping around the seal, with vines
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(x + d * 36, y + 10); ctx.scale(d * 1.35, 1.35);
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.bezierCurveTo(-26, 6, -30, -30, -6, -44); ctx.quadraticCurveTo(4, -20, 0, 18);
      ctx.fillStyle = K.lg(ctx, -30, -40, 0, 18, ['#a8e070', '#58a038', '#2e6a1e']); ctx.fill();
      ctx.strokeStyle = 'rgba(36,90,24,.95)'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, 14); ctx.bezierCurveTo(-18, 4, -20, -24, -6, -38); ctx.quadraticCurveTo(0, -20, -1, 14);
      ctx.fillStyle = K.lg(ctx, -20, -30, 0, 10, ['#ff9ab0', '#d23a5a']); ctx.fill();
      ctx.fillStyle = '#fff6e0';
      for (let i = 0; i < 6; i++) { const u = i / 5, tx = -6 + Math.sin(u * 3) * -1 - u * 2, ty = -40 + u * 52; ctx.beginPath(); ctx.moveTo(tx - 1, ty - 2.5); ctx.lineTo(tx + 7, ty); ctx.lineTo(tx - 1, ty + 2.5); ctx.fill(); }
      ctx.restore();
    }
    ctx.strokeStyle = '#3e7a26'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 12, y + 28); ctx.quadraticCurveTo(x - 4, y + 40, x + 14, y + 30); ctx.stroke();
    for (let i = 0; i < 4; i++) leaf(ctx, x - 40 + i * 26, y + 32, 16, i % 2 ? -0.5 : -2.6, [86, 160, 56]);
  }
  function geodeLair(ctx, x, y) {
    // a dark cave arch studded with crystals
    ctx.beginPath(); ctx.moveTo(x - 58, y + 34); ctx.quadraticCurveTo(x - 62, y - 44, x, y - 50); ctx.quadraticCurveTo(x + 62, y - 44, x + 58, y + 34); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, x - 60, y - 50, x + 60, y + 34, ['#9a9ad8', '#5a5aa0', '#2e2e60']); ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,96,.95)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 38, y + 34); ctx.quadraticCurveTo(x - 40, y - 30, x, y - 34); ctx.quadraticCurveTo(x + 40, y - 30, x + 38, y + 34); ctx.closePath();
    ctx.fillStyle = K.rg(ctx, x, y + 4, 44, ['#5a3a8a', '#2e1e50', '#1e1236']); ctx.fill();
    for (const [a, h, c] of [[-2.6, 14, 0], [-2.1, 18, 1], [-1.57, 20, 0], [-1.05, 16, 1], [-0.55, 13, 0], [-2.9, 10, 1], [-0.25, 10, 1]]) {
      const cx = x + Math.cos(a) * 52, cy = y - 6 + Math.sin(a) * 44, col = c ? [240, 130, 210] : [150, 210, 255];
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -h); ctx.lineTo(4, 0); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, -4, 0, 4, 0, [K.lift(col, 60), col, K.lift(col, -70)]); ctx.fill();
      ctx.strokeStyle = K.rgb(K.lift(col, -100), 0.8); ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
    }
  }

  function compass(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = ink(0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, TAU); ctx.stroke();
    for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, l = i % 4 ? 2 : 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3)); ctx.lineTo(Math.cos(a) * (r - 3 - l), Math.sin(a) * (r - 3 - l)); ctx.stroke(); }
    const point = (a, len, w, c1, c2) => {
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.lineTo(Math.cos(a + s * Math.PI / 2) * w, Math.sin(a + s * Math.PI / 2) * w); ctx.closePath();
        ctx.fillStyle = s < 0 ? c1 : c2; ctx.fill(); ctx.strokeStyle = ink(0.7); ctx.lineWidth = 0.6; ctx.stroke();
      }
    };
    for (let i = 0; i < 4; i++) point(Math.PI / 4 + i * Math.PI / 2, r * 0.62, r * 0.13, '#e8d4a4', '#b08a54');
    for (let i = 0; i < 4; i++) point(-Math.PI / 2 + i * Math.PI / 2, r * 0.95, r * 0.18, i === 0 ? '#f05a3a' : '#f4e6c4', i === 0 ? '#a42a18' : '#9a7a4a');
    ctx.fillStyle = K.rg(ctx, -1, -1, 4, ['#fff2b0', '#c8902a']); ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    ctx.font = `700 11px ${LABF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink(0.9); ctx.fillText('N', 0, -r - 8);
    ctx.restore();
  }
  function cartouche(ctx, x, y) {
    ctx.save();
    const w = 236, h = 34;
    // ribbon tails
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + d * (w / 2 - 6), y - 6); ctx.lineTo(x + d * (w / 2 + 26), y - 2); ctx.lineTo(x + d * (w / 2 + 16), y + 10); ctx.lineTo(x + d * (w / 2 + 26), y + 22); ctx.lineTo(x + d * (w / 2 - 6), y + 20); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, 0, y - 6, 0, y + 22, ['#c8503a', '#8a2416']); ctx.fill(); ctx.strokeStyle = 'rgba(100,24,12,.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(60,10,6,.45)'; ctx.beginPath(); ctx.moveTo(x + d * (w / 2 - 6), y + 20); ctx.lineTo(x + d * (w / 2), y + 26); ctx.lineTo(x + d * (w / 2), y + 18); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.quadraticCurveTo(x, y - h / 2 - 8, x + w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.quadraticCurveTo(x, y + h / 2 - 8, x - w / 2, y + h / 2); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - h / 2 - 8, 0, y + h / 2, ['#ff8a6a', '#d83c26', '#962012']); ctx.fill();
    ctx.strokeStyle = 'rgba(110,24,12,.95)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,180,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y - h / 2 + 4); ctx.quadraticCurveTo(x, y - h / 2 - 3, x + w / 2 - 6, y - h / 2 + 4); ctx.stroke();
    ctx.font = `700 19px ${HAND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(100,16,8,.7)'; ctx.fillText("Kiko's Treasure Map", x + 1, y - 1);
    ctx.fillStyle = '#fff2d0'; ctx.fillText("Kiko's Treasure Map", x, y - 2.5);
    ctx.restore();
  }
  // a little ink doodle of Kiko the lemur: ringed tail curl and a face, for the signature
  function kikoDoodle(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) { const a0 = -0.6 + i * 0.42, a1 = a0 + 0.42; ctx.strokeStyle = i % 2 ? '#3a3036' : '#e8e2dc'; ctx.beginPath(); ctx.arc(12, -4, 10 - i * 0.5, a0, a1); ctx.stroke(); }
    ctx.fillStyle = K.rg(ctx, -2, -6, 10, ['#f4f0ec', '#b8b2b4', '#6e6670']); ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 4, -6); ctx.lineTo(d * 9, -12); ctx.lineTo(d * 7, -4); ctx.fill(); }
    ctx.fillStyle = '#3a3036'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 3, -0.5, 2.6, 2.3, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffb030'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 3, -0.5, 1.3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2a2026'; ctx.beginPath(); ctx.arc(0, 3.5, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- the static sheet ----------
  const EDGE_L = y => 7 + Math.sin(y * 0.031) * 2 + Math.sin(y * 0.11) * 1.4 + Math.sin(y * 0.47) * 0.7;
  const EDGE_R = y => W - 7 + Math.sin(y * 0.027 + 2) * 2 + Math.sin(y * 0.13) * 1.4 + Math.sin(y * 0.53) * 0.7;
  const FOLD_Y = 252, ROLL_Y = 58;
  function sheetPath(ctx, y0, y1) {
    ctx.beginPath(); ctx.moveTo(EDGE_L(y0), y0);
    for (let y = y0; y <= y1; y += 4) ctx.lineTo(EDGE_L(y), y);
    for (let y = y1; y >= y0; y -= 4) ctx.lineTo(EDGE_R(y), y);
    ctx.closePath();
  }
  function paintSheet(ctx) {
    // the wooden table behind
    ctx.fillStyle = K.lg(ctx, 0, 0, W, 0, ['#3a2214', '#5a3620', '#3a2214']); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(20,10,4,.35)'; ctx.lineWidth = 1; for (let x = 2; x < W; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    // shadow of the sheet on the table
    ctx.fillStyle = 'rgba(0,0,0,.35)'; sheetPath(ctx, FOLD_Y, H); ctx.save(); ctx.translate(2, 3); ctx.fill(); ctx.restore();
    // main parchment
    sheetPath(ctx, FOLD_Y, H);
    ctx.fillStyle = K.lg(ctx, 0, FOLD_Y, 0, H, ['#efdcae', '#ead2a0', '#e6cc96', '#ecd6a6', '#e2c48c']); ctx.fill();
    ctx.save(); ctx.clip();
    // aged edges: a warm brown vignette at the sides, darker burnt rim
    ctx.fillStyle = K.lg(ctx, 0, 0, W, 0, [[0, 'rgba(140,84,34,.5)'], [0.09, 'rgba(160,100,40,.12)'], [0.5, 'rgba(160,100,40,0)'], [0.91, 'rgba(160,100,40,.12)'], [1, 'rgba(140,84,34,.5)']]); ctx.fillRect(0, FOLD_Y, W, H - FOLD_Y);
    ctx.fillStyle = K.lg(ctx, 0, H - 60, 0, H, ['rgba(140,84,34,0)', 'rgba(130,76,30,.5)']); ctx.fillRect(0, H - 60, W, 60);
    // stains and blotches
    const r = K.rand(5);
    for (let i = 0; i < 26; i++) { const x = r() * W, y = FOLD_Y + r() * (H - FOLD_Y), rr = 20 + r() * 60; ctx.fillStyle = K.rg(ctx, x, y, rr, ['rgba(170,120,60,.10)', 'rgba(170,120,60,0)']); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
    // a coffee ring (Kiko's mug)
    ctx.strokeStyle = 'rgba(140,86,40,.2)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(318, 1590, 24, 0.3, 5.6); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(319, 1591, 21, 0.1, 4.9); ctx.stroke();
    // paper fibres
    for (let i = 0; i < 1400; i++) { const x = r() * W, y = FOLD_Y + r() * (H - FOLD_Y), l = 2 + r() * 6, a = (r() - 0.5) * 0.8; ctx.strokeStyle = r() < 0.5 ? 'rgba(120,80,36,.10)' : 'rgba(255,250,230,.22)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    ctx.restore();
    // burnt edge line
    ctx.save(); ctx.strokeStyle = 'rgba(110,60,22,.7)'; ctx.lineWidth = 1.2; sheetPath(ctx, FOLD_Y, H - 1); ctx.stroke(); ctx.restore();
  }
  function paintCreases(ctx) {
    // the folds of a map that has been folded into a pocket many times
    ctx.save(); sheetPath(ctx, FOLD_Y, H); ctx.clip();
    for (const y of [860, 1440, 2010]) {
      ctx.fillStyle = K.lg(ctx, 0, y - 10, 0, y + 10, ['rgba(120,80,40,0)', 'rgba(120,80,40,.10)', 'rgba(255,250,230,.18)', 'rgba(255,250,230,0)']); ctx.fillRect(0, y - 10, W, 20);
      ctx.strokeStyle = 'rgba(120,80,40,.22)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.fillStyle = K.lg(ctx, 170, 0, 190, 0, ['rgba(120,80,40,0)', 'rgba(120,80,40,.07)', 'rgba(255,250,230,.12)', 'rgba(255,250,230,0)']); ctx.fillRect(170, FOLD_Y, 20, H - FOLD_Y);
    ctx.restore();
  }
  // the top: a folded-under panel (back of the sheet showing) and the rolled edge
  function paintTop(ctx) {
    sheetPath(ctx, ROLL_Y, FOLD_Y + 2);
    ctx.fillStyle = K.lg(ctx, 0, ROLL_Y, 0, FOLD_Y, ['#cdb488', '#d8c094', '#c4a878']); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, 0, W, 0, [[0, 'rgba(110,70,30,.45)'], [0.1, 'rgba(110,70,30,.08)'], [0.9, 'rgba(110,70,30,.08)'], [1, 'rgba(110,70,30,.45)']]); ctx.fillRect(0, ROLL_Y, W, FOLD_Y - ROLL_Y);
    const r = K.rand(9);
    for (let i = 0; i < 260; i++) { const x = r() * W, y = ROLL_Y + r() * (FOLD_Y - ROLL_Y), l = 2 + r() * 5; ctx.strokeStyle = 'rgba(110,70,30,.12)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (r() - 0.5) * 2); ctx.stroke(); }
    // ink bleeding through from the folded-away land: mirrored ghost doodles, trails and seals
    ctx.globalAlpha = 0.22;
    for (const [x, y, s] of [[60, 120, 1], [300, 150, 1.2], [200, 96, 0.8]]) { ctx.beginPath(); ctx.moveTo(x - 30 * s, y + 20 * s); ctx.lineTo(x, y - 18 * s); ctx.lineTo(x + 30 * s, y + 20 * s); ctx.strokeStyle = ink(1); ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.strokeStyle = ink(1); ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(240 + i * 6, 210); ctx.quadraticCurveTo(270, 200 - i * 3, 340, 206); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // the crease where the panel folds under: a sharp highlight over a soft shadow
    ctx.fillStyle = K.lg(ctx, 0, FOLD_Y - 16, 0, FOLD_Y, ['rgba(80,48,20,0)', 'rgba(80,48,20,.35)']); sheetPath(ctx, FOLD_Y - 16, FOLD_Y); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, FOLD_Y, 0, FOLD_Y + 14, ['rgba(255,248,224,.75)', 'rgba(255,248,224,0)']); sheetPath(ctx, FOLD_Y, FOLD_Y + 14); ctx.fill();
    ctx.strokeStyle = 'rgba(110,64,26,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(EDGE_L(FOLD_Y), FOLD_Y); ctx.lineTo(EDGE_R(FOLD_Y), FOLD_Y); ctx.stroke();
    // little folded dog-ear corners at the crease
    for (const d of [-1, 1]) {
      const x = d < 0 ? EDGE_L(FOLD_Y) : EDGE_R(FOLD_Y);
      ctx.beginPath(); ctx.moveTo(x, FOLD_Y); ctx.lineTo(x - d * 22, FOLD_Y); ctx.lineTo(x, FOLD_Y + 22); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, x - d * 22, FOLD_Y, x, FOLD_Y + 22, ['#f6e6be', '#c8aa76']); ctx.fill(); ctx.strokeStyle = 'rgba(110,64,26,.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // shadow cast by the roll
    ctx.fillStyle = K.lg(ctx, 0, ROLL_Y, 0, ROLL_Y + 26, ['rgba(40,20,6,.55)', 'rgba(40,20,6,0)']); sheetPath(ctx, ROLL_Y, ROLL_Y + 26); ctx.fill();
    // the roll itself: a parchment cylinder with curled ends
    const ry0 = 8, ry1 = ROLL_Y + 4, rx0 = 2, rx1 = W - 2;
    ctx.beginPath(); ctx.roundRect(rx0 + 10, ry0, rx1 - rx0 - 20, ry1 - ry0, 6);
    ctx.fillStyle = K.lg(ctx, 0, ry0, 0, ry1, [[0, '#b89464'], [0.2, '#f6e6c0'], [0.38, '#fff4d8'], [0.6, '#e2c896'], [0.85, '#b08a58'], [1, '#8a663a']]); ctx.fill();
    ctx.strokeStyle = 'rgba(110,70,30,.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(110,70,30,.18)'; for (let x = 30; x < W - 30; x += 13) { ctx.beginPath(); ctx.moveTo(x, ry0 + 4); ctx.lineTo(x + 3, ry1 - 4); ctx.stroke(); }
    // the edge of the outer layer wrapping round
    ctx.strokeStyle = 'rgba(120,76,34,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(14, ry1 - 10); ctx.bezierCurveTo(120, ry1 - 4, 240, ry1 - 14, W - 14, ry1 - 8); ctx.stroke();
    // spiral end caps
    for (const d of [-1, 1]) {
      const cx = d < 0 ? 16 : W - 16, cy = (ry0 + ry1) / 2, rr = (ry1 - ry0) / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, 9, rr, 0, 0, TAU);
      ctx.fillStyle = K.rg(ctx, cx - d * 2, cy - 4, rr, ['#f2dfb4', '#c8a670', '#8a6438']); ctx.fill();
      ctx.strokeStyle = 'rgba(110,70,30,.8)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(110,70,30,.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (let a = 0; a < TAU * 3.2; a += 0.2) { const k = 1 - a / (TAU * 3.6); ctx.lineTo(cx + Math.cos(a) * 8 * k, cy + Math.sin(a) * rr * k); } ctx.stroke();
    }
    // wax-sealed ribbon tying the roll
    ctx.fillStyle = K.lg(ctx, 0, ry0, 0, ry1, ['#d24a32', '#8a1e12']); ctx.fillRect(W / 2 - 6, ry0 - 1, 12, ry1 - ry0 + 2);
    ctx.strokeStyle = 'rgba(90,16,8,.8)'; ctx.lineWidth = 0.8; ctx.strokeRect(W / 2 - 6, ry0 - 1, 12, ry1 - ry0 + 2);
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(W / 2 + d * 3, ry1); ctx.lineTo(W / 2 + d * 12, ry1 + 22); ctx.lineTo(W / 2 + d * 6, ry1 + 19); ctx.lineTo(W / 2 + d * 4, ry1 + 24); ctx.closePath(); ctx.fillStyle = K.lg(ctx, 0, ry1, 0, ry1 + 24, ['#c8402a', '#7a1a10']); ctx.fill(); }
    seal(ctx, W / 2, (ry0 + ry1) / 2 + 2, 13, WAX.red, 999);
    skull(ctx, W / 2, (ry0 + ry1) / 2 + 2, 0.9);
    // text on the back of the panel
    note(ctx, 'More levels coming', 180, 150, 18, -0.03, [96, 60, 26], 0.9);
    note(ctx, "(still exploring - unfold me later!)", 180, 172, 11.5, -0.03, [96, 60, 26], 0.75);
  }

  // ---------- wax seals ----------
  const WAX = {
    red: ['#ff8a70', '#d6362a', '#7e1410'],
    gold: ['#fff6b0', '#f4b62a', '#9a5c0a'],
    gray: ['#d4c8b0', '#a2967e', '#665c4c'],
    boss: ['#b06ad0', '#6a2a8a', '#2e0e44'],
    bossLock: ['#a69aa8', '#706476', '#3e3644'],
  };
  function sealPath(ctx, x, y, r, seed) {
    const rr = K.rand(seed), n = 13, p = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (rr() - 0.5) * 0.14 + (i % 2 ? 0.04 : -0.02); p.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
    ctx.beginPath(); const m = i => [(p[i % n][0] + p[(i + 1) % n][0]) / 2, (p[i % n][1] + p[(i + 1) % n][1]) / 2];
    ctx.moveTo(...m(0)); for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(...p[i % n], ...m(i)); ctx.closePath();
  }
  function seal(ctx, x, y, r, pal, seed) {
    K.shadow(ctx, x + 2, y + r * 0.62, r * 1.1, r * 0.48, 0.35);
    // drips of wax squeezed out
    const rr = K.rand(seed + 7);
    for (let i = 0; i < 3; i++) { const a = rr() * TAU, d = r * (0.95 + rr() * 0.1); ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.16 + rr() * 0.1), 0, TAU); ctx.fill(); }
    sealPath(ctx, x, y, r, seed);
    ctx.fillStyle = K.rg(ctx, x - r * 0.4, y - r * 0.45, r * 1.5, pal); ctx.fill();
    ctx.strokeStyle = pal[2]; ctx.lineWidth = 1.1; ctx.stroke();
    // pressed ring: shadow on the upper-left lip, light on the lower-right
    ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.strokeStyle = K.rgb([0, 0, 0], 0.22); ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,220,.35)'; ctx.beginPath(); ctx.arc(x + 0.8, y + 0.8, r * 0.72, -0.3, 1.9); ctx.stroke();
    K.sheen(ctx, x, y, r * 1.05, 0.4, 3.6, 4.7);
  }
  function embossed(ctx, txt, x, y, size, pal) {
    ctx.font = `700 ${size}px ${NUMF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,240,220,.55)'; ctx.fillText(txt, x + 0.9, y + 1.9);
    ctx.fillStyle = K.rgb(pal, 0.95); ctx.fillText(txt, x, y + 1);
  }
  function padlock(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#6e6a66'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -4, 4.2, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#c8c4bc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -4, 4.2, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, -6, -4, 6, 6, ['#f4dc90', '#c8962e', '#7a5414']); ctx.beginPath(); ctx.roundRect(-6, -4, 12, 10, 2.5); ctx.fill();
    ctx.strokeStyle = '#6a4610'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#4a3010'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill(); ctx.fillRect(-0.7, 0, 1.4, 3);
    ctx.restore();
  }

  // ---------- static build (cached per pixel scale) ----------
  const cache = {};
  function staticCanvas(s) {
    if (cache[s]) return cache[s];
    const c = document.createElement('canvas'); c.width = W * s; c.height = H * s;
    const ctx = c.getContext('2d'); ctx.scale(s, s); ctx.lineJoin = 'round';
    paintSheet(ctx);
    ctx.save(); sheetPath(ctx, FOLD_Y, H); ctx.clip();
    jungleArt(ctx); templeArt(ctx); bogArt(ctx); grottoArt(ctx); lagoonArt(ctx); mineArt(ctx); cavesArt(ctx); crystalFrostStormArt(ctx); magmaArt(ctx);
    flytrapLair(ctx, N[9][0], N[9][1]); geodeLair(ctx, N[15][0], N[15][1]);
    paintCreases(ctx);
    compass(ctx, 58, 1016, 22);
    // the cartouche and Kiko's signature at the start
    cartouche(ctx, 180, 2338);
    note(ctx, '~ drawn by Kiko, explorer ~', 170, 2372, 11.5, -0.02, INK, 0.8);
    kikoDoodle(ctx, 290, 2374);
    note(ctx, 'start here!', 44, 2176, 11, -0.1);
    // fork signposts
    signpost(ctx, 172, 2010, [['TEMPLE', -1], ['BOG', 1]]);
    signpost(ctx, 182, 1438, [['LAGOON', -1], ['MINE', 1]]);
    signpost(ctx, 284, 1012, [['CRYSTAL', -1], ['FROST', 0], ['STORM', 1]]);
    // the scale bar
    ctx.strokeStyle = ink(0.7); ctx.lineWidth = 1; ctx.fillStyle = ink(0.7);
    for (let i = 0; i < 4; i++) { if (i % 2 === 0) ctx.fillRect(250 + i * 16, 2286, 16, 3); ctx.strokeRect(250 + i * 16, 2286, 16, 3); }
    ctx.font = `700 9px ${HAND}`; ctx.textAlign = 'center'; ctx.fillText('1 banana-throw', 282, 2299);
    ctx.restore();
    paintTop(ctx);
    return (cache[s] = c);
  }
  function signpost(ctx, x, y, arms) {
    ctx.save();
    ctx.fillStyle = K.lg(ctx, x - 2, 0, x + 2, 0, ['#c08a50', '#6a4424']); ctx.fillRect(x - 1.6, y - 10 - arms.length * 11, 3.2, arms.length * 11 + 14);
    K.shadow(ctx, x, y + 4, 7, 2, 0.3);
    arms.forEach(([txt, d], i) => {
      const yy = y - 6 - (arms.length - i) * 11, w = txt.length * 5.6 + 10, dir = d || 1, x0 = d === 0 ? x - w / 2 : x;
      ctx.beginPath();
      if (d === 0) { ctx.moveTo(x0, yy - 4.5); ctx.lineTo(x0 + w, yy - 4.5); ctx.lineTo(x0 + w / 2 + 4, yy - 4.5); ctx.rect(x0, yy - 4.5, w, 9); }
      else { ctx.moveTo(x, yy - 4.5); ctx.lineTo(x + dir * w, yy - 4.5); ctx.lineTo(x + dir * (w + 5), yy); ctx.lineTo(x + dir * w, yy + 4.5); ctx.lineTo(x, yy + 4.5); ctx.closePath(); }
      ctx.fillStyle = K.lg(ctx, 0, yy - 5, 0, yy + 5, ['#f0c88a', '#c08a50', '#8a5a2e']); ctx.fill();
      ctx.strokeStyle = 'rgba(100,60,24,.95)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.font = `700 7.5px ${LABF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5a2e10';
      ctx.fillText(txt, d === 0 ? x : x + dir * (w / 2 + 1), yy + 0.5);
    });
    ctx.restore();
  }

  // ---------- per-frame layers ----------
  function trail(ctx, e, t) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...e.a); ctx.quadraticCurveTo(...e.c, ...e.b);
    if (e.lit) {
      ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 9;
      ctx.strokeStyle = 'rgba(110,20,8,.35)'; ctx.lineWidth = 5; ctx.save(); ctx.translate(0.8, 1.4); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#c8301c'; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.setLineDash([]);
      // gold glints walking the trail
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const u = (t * 0.28 + k * 0.5 + (e.ids[0] * 0.17)) % 1, [x, y] = qpt(e, u), a = Math.sin(u * Math.PI);
        ctx.fillStyle = K.rg(ctx, x, y, 9, [`rgba(255,220,120,${0.7 * a})`, 'rgba(255,200,80,0)']); ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
      }
    } else {
      ctx.setLineDash([2.5, 6]);
      ctx.strokeStyle = 'rgba(92,56,26,.45)'; ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.restore();
  }
  function futureTrail(ctx, t) {
    // from the drake's lair up under the fold, then two ghost trails on the panel's back
    ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([2.5, 6]); ctx.strokeStyle = 'rgba(92,56,26,.45)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(N[20][0], N[20][1] - 28); ctx.bezierCurveTo(190, 380, 150, 330, 166, FOLD_Y + 4); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(166, FOLD_Y - 2); ctx.quadraticCurveTo(140, 226, 96, 208); ctx.moveTo(166, FOLD_Y - 2); ctx.quadraticCurveTo(220, 224, 268, 206); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    for (const [x, y, n] of [[84, 200, 21], [282, 198, 22]]) {
      ctx.globalAlpha = 0.45 + 0.1 * Math.sin(t * 2 + x);
      sealPath(ctx, x, y, 13, n); ctx.setLineDash([3, 3]); ctx.strokeStyle = ink(0.8); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      note(ctx, '?', x, y + 1, 16, 0, INK, 0.9);
      ctx.globalAlpha = 1;
    }
    // the unfold hint: a curled arrow bobbing over the crease
    const b = Math.sin(t * 2.2) * 3;
    inkArrow(ctx, 318, FOLD_Y + 34 + b, 334, FOLD_Y + 10 + b, 318, FOLD_Y - 14 + b, [170, 40, 24], 0.85);
    note(ctx, 'unfold', 312, FOLD_Y + 46 + b, 11, -0.1, [170, 40, 24]);
    ctx.restore();
  }
  function node(ctx, l, t) {
    const [x, y] = N[l.id], r = radius(l), st = l.state;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);
    if (l.boss) {
      const lock = st === 'locked';
      if (!lock) K.glow(ctx, x, y, r * 2.2, [255, 200, 90], 0.3 + 0.2 * pulse);
      // crossed bones behind the seal
      bone(ctx, x - r - 8, y + r + 6, x + r + 8, y - r - 6, 3.2); bone(ctx, x - r - 8, y - r - 6, x + r + 8, y + r + 6, 3.2);
      seal(ctx, x, y, r, lock ? WAX.bossLock : WAX.boss, l.id * 13);
      K.badge(ctx, 'boss-' + l.boss, x, y, r * 0.7, lock ? '#8a7e8c' : '#ffcf3a');
      if (lock) { ctx.fillStyle = 'rgba(200,184,160,.5)'; ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, TAU); ctx.fill(); }
      // skull emblem on top and the number tab below
      seal(ctx, x, y - r - 2, 9, lock ? WAX.bossLock : WAX.red, l.id * 7);
      skull(ctx, x, y - r - 2, 0.85);
      ctx.fillStyle = K.lg(ctx, 0, y + r - 4, 0, y + r + 10, lock ? ['#c8bca8', '#8a7e6a'] : ['#ffe9a0', '#d89a2a']);
      ctx.beginPath(); ctx.roundRect(x - 26, y + r - 5, 52, 14, 7); ctx.fill(); ctx.strokeStyle = lock ? '#6a5e4c' : '#8a5410'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.font = `700 9.5px ${LABF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = lock ? '#4a4034' : '#6a2e08';
      ctx.fillText(l.id + ' · BOSS', x, y + r + 2.5);
      if (lock) padlock(ctx, x + r * 0.78, y + r * 0.45, 1);
      stars(ctx, x, y + r + 18, l, 6);
      return;
    }
    const pal = st === 'done' || st === 'tried' ? WAX.red : st === 'open' ? WAX.gold : WAX.gray;
    if (st === 'open') K.glow(ctx, x, y, r * 2.4, [255, 210, 90], 0.3 + 0.25 * pulse);
    if (st === 'locked') ctx.globalAlpha = 0.82;
    seal(ctx, x, y, r, pal, l.id * 13);
    embossed(ctx, String(l.id), x, y, 15, K.lift(st === 'locked' ? [102, 92, 76] : st === 'open' ? [154, 92, 10] : [126, 20, 16], -30));
    ctx.globalAlpha = 1;
    if (st === 'locked') padlock(ctx, x + r * 0.72, y + r * 0.55, 0.85);
    else stars(ctx, x, y + r + 6, l, 5.5);
  }
  function stars(ctx, x, y, l, s) {
    if (l.state === 'locked') return;
    for (let j = 0; j < 3; j++) K.star(ctx, x + (j - 1) * s * 2.3, y - (j === 1 ? 2.5 : 0), s, j < l.stars);
  }
  function ambient(ctx, t, v) {
    const vis = (y0, y1) => y1 > v.y - 20 && y0 < v.y + v.h + 20;
    ctx.save();
    // lagoon: drifting wave ticks
    if (vis(1190, 1450)) {
      ctx.save(); ctx.strokeStyle = 'rgba(220,255,250,.7)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      const r = K.rand(61);
      for (let i = 0; i < 14; i++) {
        const x0 = 10 + r() * 140, y = 1220 + r() * 210, ph = r() * TAU, x = x0 + Math.sin(t * 0.8 + ph) * 5, a = 0.35 + 0.35 * Math.sin(t * 1.3 + ph);
        if (x > 150 && y > 1250 && y < 1400) continue;
        ctx.globalAlpha = Math.max(0, a); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x - 3, y - 3, x, y); ctx.quadraticCurveTo(x + 3, y + 3, x + 6, y); ctx.stroke();
      }
      ctx.restore();
    }
    // bog bubbles
    if (vis(1760, 2000)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.5 + i * 0.37) % 1, x = 270 + (i * 37) % 50, y = 1890 - ph * 16, rr = 1.5 + ph * 2.5;
        ctx.strokeStyle = `rgba(220,240,140,${0.8 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke();
      }
    }
    // grotto glows
    if (vis(1430, 1560)) MUSH.forEach(([x, y, s, mag], i) => K.glow(ctx, x, y - 12 * s, 16 * s, mag ? [240, 110, 220] : [90, 230, 240], 0.25 + 0.18 * Math.sin(t * 2 + i)));
    // glow-worms twinkling in the deeps
    if (vis(1030, 1200)) { const r = K.rand(71); for (let i = 0; i < 14; i++) { const x = 70 + r() * 230, y = 1040 + r() * 150, a = Math.max(0, Math.sin(t * (1 + r()) + i * 2.1)); K.glow(ctx, x, y, 6, [120, 220, 255], 0.5 * a); ctx.fillStyle = `rgba(220,250,255,${a})`; ctx.beginPath(); ctx.arc(x, y, 1, 0, TAU); ctx.fill(); } }
    // mine lantern
    if (vis(1300, 1380)) { const f = 0.45 + 0.15 * Math.sin(t * 13) + 0.1 * Math.sin(t * 7.3); K.glow(ctx, 328, 1342, 22, [255, 190, 80], f); ctx.fillStyle = K.rg(ctx, 328, 1341, 4, ['#fff8c0', '#ffb030']); ctx.beginPath(); ctx.roundRect(325, 1337, 6, 8, 2); ctx.fill(); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 0.8; ctx.stroke(); }
    // crystal twinkles
    if (vis(760, 910)) for (let i = 0; i < 5; i++) { const a = Math.max(0, Math.sin(t * 2.6 + i * 1.9)); if (a < 0.2) continue; const x = [30, 100, 44, 26, 110][i], y = [860, 874, 874, 772, 766][i]; twinkle(ctx, x, y, 5 * a, a); }
    // frost: snow flurries over the peaks
    if (vis(700, 900)) {
      const r = K.rand(17);
      for (let i = 0; i < 16; i++) { const x0 = 120 + r() * 120, y0 = r() * 160, sp = 0.6 + r() * 0.6, y = 730 + (y0 + t * 16 * sp) % 160, x = x0 + Math.sin(t * sp + i) * 6; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 1 + r() * 0.8, 0, TAU); ctx.fill(); }
    }
    // storm: rain and lightning
    if (vis(730, 910)) {
      ctx.strokeStyle = 'rgba(90,90,170,.45)'; ctx.lineWidth = 1;
      const r = K.rand(19);
      for (let i = 0; i < 18; i++) { const x = 240 + r() * 120, y = 770 + (r() * 120 + t * 120 * (0.8 + r() * 0.4)) % 120; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 7); ctx.stroke(); }
      const cyc = t % 3.1, k = Math.floor(t / 3.1);
      if (cyc < 0.28 && cyc % 0.14 < 0.09) {
        const rr = K.rand(k * 31 + 5), x0 = 270 + rr() * 60;
        K.glow(ctx, x0, 790, 50, [180, 190, 255], 0.5);
        ctx.beginPath(); let x = x0, y = 768; ctx.moveTo(x, y);
        for (let i = 0; i < 5; i++) { x += (rr() - 0.5) * 16; y += 11; ctx.lineTo(x, y); }
        ctx.strokeStyle = 'rgba(200,210,255,.6)'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 1.6; ctx.stroke();
      }
      for (const [cx, cy, s] of [[300, 756, 1.1], [328, 778, 0.8]]) cloud(ctx, cx, cy, s, cyc < 0.28 ? ['#f0f2ff', '#b0b4ec', '#6a6ab0'] : ['#c0c4ec', '#7a7cb8', '#4a4a86']);
    }
    // the volcano: pulsing lava, smoke, embers
    if (vis(330, 720)) {
      const g = 0.35 + 0.15 * Math.sin(t * 2.1);
      K.glow(ctx, 180, 398, 44, [255, 140, 50], g);
      for (const s of LAVA) for (let k = 0; k < 2; k++) {
        const u = (t * 0.22 + k * 0.5 + s[2][0] * 0.01) % 1, v = 1 - u, x = v * v * s[0][0] + 2 * v * u * s[1][0] + u * u * s[2][0], y = v * v * s[0][1] + 2 * v * u * s[1][1] + u * u * s[2][1];
        ctx.fillStyle = `rgba(255,250,190,${0.9 * (1 - u)})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      }
      K.glow(ctx, 180, 680, 70, [255, 120, 40], 0.22 + 0.1 * Math.sin(t * 1.7));
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.12 + i / 5) % 1, x = 180 + Math.sin(ph * 5 + i) * 10 + ph * 24, y = 388 - ph * 70, rr = 7 + ph * 16;
        ctx.fillStyle = K.rg(ctx, x - rr * 0.3, y - rr * 0.3, rr, [`rgba(150,130,130,${0.5 * (1 - ph)})`, `rgba(110,90,96,${0.35 * (1 - ph)})`, 'rgba(110,90,96,0)']);
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      }
      ctx.save(); ctx.translate(100, 380); K.motes(ctx, 160, 320, t, 'ember', [255, 150, 60], 14, 7); ctx.restore();
    }
    // jungle pollen
    if (vis(1560, 2400)) { ctx.save(); ctx.translate(0, Math.max(1560, v.y)); K.motes(ctx, W, Math.min(v.h, 2400 - Math.max(1560, v.y)), t, 'pollen', [255, 236, 140], 14, 23); ctx.restore(); }
    // the start campfire
    if (vis(2200, 2240)) {
      const f = 1 + Math.sin(t * 14) * 0.15;
      K.glow(ctx, 46, 2218, 18, [255, 170, 60], 0.4);
      ctx.fillStyle = K.lg(ctx, 0, 2208, 0, 2222, ['#fff6b0', '#ff9a30', '#e04a10']); ctx.beginPath(); ctx.moveTo(42, 2222); ctx.quadraticCurveTo(40, 2214, 46, 2222 - 12 * f); ctx.quadraticCurveTo(52, 2214, 50, 2222); ctx.fill();
    }
    ctx.restore();
  }
  function twinkle(ctx, x, y, r, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,240,255,${a})`;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.2, y - r * 0.2); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.2, y + r * 0.2); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.2, y + r * 0.2); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.2, y - r * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function youAreHere(ctx, t) {
    const [x, y] = N[9], r = radius(LEVEL_BY[9]);
    // a hand-drawn red circle around the current seal, redrawn as if by pencil
    ctx.save(); ctx.strokeStyle = 'rgba(200,40,24,.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const sweep = Math.min(1, (t % 4) / 0.8) * TAU * 1.08;
    ctx.beginPath(); for (let a = 0; a <= sweep; a += 0.1) { const rr = r + 18 + Math.sin(a * 3) * 2 + a * 0.6; ctx.lineTo(x + Math.cos(a - 2.4) * rr * 1.08, y + Math.sin(a - 2.4) * rr * 0.92); } ctx.stroke();
    ctx.restore();
    // the player's rocket hovering beside it
    const bob = Math.sin(t * 2.4) * 4;
    K.shadow(ctx, x - 60, y + 30, 12, 3.5, 0.3);
    K.rocket(ctx, x - 64, y - 16 + bob, 1, t);
    note(ctx, 'YOU ARE', x - 104, y - 70, 13, -0.12, [190, 36, 20]);
    note(ctx, 'HERE!', x - 100, y - 56, 14, -0.12, [190, 36, 20]);
    inkArrow(ctx, x - 96, y - 46, x - 92, y - 34, x - 76, y - 34, [190, 36, 20], 0.85);
  }
  function advantage(ctx, id, t) {
    const l = LEVEL_BY[id], [x, y] = N[id], r = radius(l), side = id === 9 ? 1 : -1;
    const bx = x + side * (r + (id === 9 ? 30 : 14)), by = y - r * 0.55 + Math.sin(t * 2 + id) * 1.2;
    K.glow(ctx, bx, by, 18, [255, 210, 90], 0.25);
    K.badge(ctx, l.pilot, bx, by, 11, '#ffcf3a');
    ctx.save(); ctx.font = `700 9.5px ${HAND}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(150,80,10,.95)';
    ctx.fillText('best ride', bx + side * 2, by - 15); ctx.restore();
  }

  // ---------- camera: start at the camp, climb to the current boss, pause, climb to the fold, come back ----------
  const KEYS = [[0, H - 720], [2, H - 720], [6, 1640 - 380], [10, 1640 - 380], [17, 0], [19.5, 0], [22, H - 720]];
  PV.maps['parchment'] = {
    W, H,
    camera(t) {
      const tt = t % 22;
      for (let i = 0; i + 1 < KEYS.length; i++) {
        const [t0, y0] = KEYS[i], [t1, y1] = KEYS[i + 1];
        if (tt <= t1) return { x: 0, y: K.lerp(y0, y1, K.smooth(t0, t1, tt)) };
      }
      return { x: 0, y: H - 720 };
    },
    draw(ctx, t, view) {
      const m = ctx.getTransform(), s = Math.max(1, Math.min(3, Math.round(Math.hypot(m.a, m.b) || 1)));
      const sc = staticCanvas(s);
      const y0 = Math.max(0, Math.floor(view.y)), y1 = Math.min(H, Math.ceil(view.y + view.h));
      ctx.drawImage(sc, 0, y0 * s, W * s, (y1 - y0) * s, 0, y0, W, y1 - y0);
      ctx.save(); ctx.lineJoin = 'round';
      const vis = (y, pad = 60) => y > view.y - pad && y < view.y + view.h + pad;
      ambient(ctx, t, view);
      for (const e of EDGES) if (vis(Math.min(e.a[1], e.b[1]), 0) || vis(Math.max(e.a[1], e.b[1]), 0) || (e.a[1] > view.y && e.b[1] < view.y)) trail(ctx, e, t);
      if (vis(300, 80)) futureTrail(ctx, t);
      for (const l of LEVELS) if (vis(N[l.id][1])) node(ctx, l, t);
      if (vis(N[9][1], 120)) { youAreHere(ctx, t); advantage(ctx, 9, t); }
      if (vis(N[7][1])) advantage(ctx, 7, t);
      // dust drifting in the light over the sheet
      ctx.save(); ctx.translate(0, view.y); K.motes(ctx, W, view.h, t, 'dust', [255, 244, 210], 18, 41); ctx.restore();
      ctx.restore();
    },
  };
})();
