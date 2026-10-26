// Glowshroom Grotto (mushroom) and Fossil Bonepit (fossil), with their obstacles:
// Spore Puffer, Bounce Cap (mushroom) and Skull Snapper, Ribcage Gate (fossil).
(() => {
  const TAU = Math.PI * 2, sm = K.smooth, lerp = K.lerp;
  const easeOut = x => 1 - Math.pow(1 - K.clamp(x, 0, 1), 3);
  const easeOutBack = x => { x = K.clamp(x, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  // ================= palettes =================
  const MUSH = {
    bgTop: [72, 84, 124], bgBot: [32, 40, 72], far: [60, 70, 110], far2: [50, 58, 98],
    wall: [44, 30, 52], wallIn: [14, 9, 18], rim: [110, 240, 228], seed: 3,
  };
  const FOSS = {
    bgTop: [146, 114, 86], bgBot: [76, 54, 40], far: [124, 96, 72], far2: [108, 82, 60],
    wall: [54, 39, 28], wallIn: [18, 12, 8], rim: [255, 196, 118], seed: 9,
  };
  const CYAN = [90, 245, 230], MAG = [246, 96, 222], LIME = [214, 255, 120];
  const BONE = { hi: '#fff4dc', mid: '#e6cc9e', lo: '#a9845a', deep: '#7a5836', edge: '#664629' };

  // ================= mushroom zone dressing =================
  function mushFar(ctx, w, h, t, layer, col) {
    const r = K.rand(101 + layer * 37), n = layer ? 4 : 6, k = layer ? 1.25 : 0.8;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.2 + r() * 0.6) / n * w, base = h + 10, ht = h * (0.22 + r() * 0.38) * k, sw = (4 + r() * 5) * k, cr = (20 + r() * 26) * k, bend = (r() - 0.5) * 30;
      const cx = x + bend, cy = base - ht;
      ctx.beginPath(); ctx.moveTo(x - sw * 1.6, base); ctx.quadraticCurveTo(x - sw, base - ht * 0.5, cx - sw * 0.7, cy + 2);
      ctx.lineTo(cx + sw * 0.7, cy + 2); ctx.quadraticCurveTo(x + sw, base - ht * 0.5, x + sw * 1.6, base); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.55, 0, Math.PI, 0); ctx.quadraticCurveTo(cx, cy + cr * 0.22, cx - cr, cy); ctx.fill();
      // a few faint glowing spots on the far caps
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gc = i % 2 ? CYAN : MAG;
      for (let j = 0; j < 4; j++) { const a = Math.PI + 0.4 + j * 0.62, rr = cr * (0.45 + 0.3 * ((j * 7) % 3) / 2); ctx.fillStyle = K.rgb(gc, layer ? 0.32 : 0.18); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5, (layer ? 2.2 : 1.6), 0, TAU); ctx.fill(); }
      ctx.fillStyle = K.rg(ctx, cx, cy + 4, cr * 1.2, [K.rgb(gc, layer ? 0.12 : 0.07), K.rgb(gc, 0)]); ctx.beginPath(); ctx.arc(cx, cy + 4, cr * 1.2, 0, TAU); ctx.fill();
      ctx.restore(); ctx.fillStyle = K.rgb(col);
    }
    // stalactites from the roof
    for (let i = 0; i < 3 + layer; i++) {
      const x = r() * w, cw = 10 + r() * 18, len = h * (0.1 + r() * 0.2) * k;
      ctx.beginPath(); ctx.moveTo(x - cw, -5); ctx.quadraticCurveTo(x - cw * 0.2, len * 0.6, x, len); ctx.quadraticCurveTo(x + cw * 0.2, len * 0.6, x + cw, -5); ctx.fill();
    }
  }
  function mushWall(ctx, side, edge, w, h, t) {
    const r = K.rand(side < 0 ? 211 : 223);
    // rock lumps: lit tops, dark undersides
    for (let i = 0; i < 16; i++) {
      const y = r() * h, d = 3 + r() * 26, x = edge(y) + side * d, rx = 5 + r() * 8, ry = 4 + r() * 6;
      ctx.fillStyle = 'rgba(8,4,12,.45)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 2, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = K.rg(ctx, x - rx * 0.3, y - ry * 0.4, rx * 1.2, ['rgba(110,74,118,.6)', 'rgba(62,40,72,.5)', 'rgba(40,26,48,0)']); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    }
    // mycelium threads: thin glowing filaments wandering down the rock, with side twigs
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const d0 = 5 + j * 8 + r() * 4, ph = r() * 9, a = 0.18 + 0.08 * Math.sin(t * 1.3 + j * 2);
      ctx.strokeStyle = K.rgb(CYAN, a); ctx.lineWidth = 0.8; ctx.beginPath();
      for (let y = -4; y <= h + 4; y += 8) { const x = edge(y) + side * (d0 + Math.sin(y * 0.05 + ph) * 3); y < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      for (let k = 0; k < 7; k++) {
        const y = r() * h, x = edge(y) + side * (d0 + Math.sin(y * 0.05 + ph) * 3);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - side * 4, y + 2, x - side * (5 + r() * 4), y + 6 + r() * 4); ctx.stroke();
      }
    }
    // glowing pinprick spores in the rock
    for (let i = 0; i < 12; i++) {
      const y = r() * h, x = edge(y) + side * (3 + r() * 24), c = i % 3 ? CYAN : MAG, p = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = K.rgb(c, 0.25 + 0.4 * p); ctx.beginPath(); ctx.arc(x, y, 0.9 + r() * 0.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // a little crust of glowing caps growing out of the wall edge (set dressing)
  function capCluster(ctx, x, y, side, sc, col, t, n = 3) {
    const lo = K.lift(col, -110), hi = K.lift(col, 70);
    K.glow(ctx, x + side * 6 * sc, y - 4 * sc, 26 * sc, col, 0.22 + 0.06 * Math.sin(t * 2 + x));
    for (let k = 0; k < n; k++) {
      const dy = (k - (n - 1) / 2) * 7 * sc, len = (5 + ((k * 5) % 3) * 3) * sc, ang = -0.55 - k * 0.12, cr = (3.4 + (k % 2) * 1.6) * sc;
      const bx = x, by = y + dy, tx = bx + side * Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
      ctx.strokeStyle = '#d8cde3'; ctx.lineWidth = 1.6 * sc; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx - side * 2, by); ctx.quadraticCurveTo(bx + side * len * 0.6, by, tx, ty); ctx.stroke();
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(side * 0.25);
      ctx.fillStyle = K.rg(ctx, -cr * 0.4, -cr * 0.6, cr * 1.4, [K.rgb(hi), K.rgb(col), K.rgb(lo)]);
      ctx.beginPath(); ctx.ellipse(0, 0, cr, cr * 0.75, 0, Math.PI, 0); ctx.quadraticCurveTo(0, cr * 0.3, -cr, 0); ctx.fill();
      ctx.strokeStyle = K.rgb(K.lift(col, -140), 0.9); ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-cr * 0.35, -cr * 0.45, cr * 0.3, cr * 0.15, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // ================= Spore Puffer =================
  const PUFF_T = 3.2;
  function puffPhase(t) {
    const u = ((t % PUFF_T) + PUFF_T) % PUFF_T;
    const tell = sm(1.0, 1.95, u) * (1 - sm(2.0, 2.06, u));
    const squash = u >= 2.0 ? Math.exp(-(u - 2.0) * 6) * Math.cos((u - 2.0) * 16) * (u < 2.03 ? (u - 2.0) / 0.03 : 1) : 0;
    const age = u >= 2.0 ? (u - 2.0) / 1.2 : -1;
    return { u, tell, squash, age };
  }
  // x,y: where the stem leaves the wall; side +1 grows rightwards (left wall), -1 leftwards
  function drawPuffer(ctx, x, y, side, sc, t) {
    const { u, tell, squash, age } = puffPhase(t);
    const breathe = Math.sin(t * 2.6) * 0.03;
    const sw = 1 + breathe + 0.24 * tell - 0.2 * Math.max(0, squash);
    const shake = tell * Math.sin(t * 75) * 1.4;
    const capX = 34, capY = -20, rx = 25 * sw, ry = 22 * sw;
    // cloud origin (the gill mouth), in world coords
    const ox = x + side * (capX + 22) * sc, oy = y + (capY + 10) * sc;
    K.danger(ctx, x + side * capX * sc, y + capY * sc, (52 + 14 * tell) * sc, 0.22 + 0.25 * tell);
    K.glow(ctx, x + side * capX * sc, y + capY * sc, 60 * sc, MAG, 0.18 + 0.2 * tell);
    ctx.save(); ctx.translate(x + shake * sc, y); ctx.scale(side * sc, sc); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // rocky foot where it grows out of the wall
    ctx.fillStyle = K.rg(ctx, -2, -4, 16, ['#5c4068', '#2c1c34']); ctx.beginPath(); ctx.ellipse(-4, 2, 10, 15, 0, 0, TAU); ctx.fill();
    // the stem: a fat pale stalk curving up out of the wall
    const stem = () => { ctx.beginPath(); ctx.moveTo(-6, 13); ctx.quadraticCurveTo(22, 14, capX + 6, capY + 12); ctx.lineTo(capX - 10, capY + 8); ctx.quadraticCurveTo(14, -1, -6, -7); ctx.closePath(); };
    stem(); ctx.fillStyle = K.lg(ctx, 0, -8, 0, 16, ['#f1e8f6', '#bba2cc', '#6c5080']); ctx.fill();
    ctx.strokeStyle = '#4a3058'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); stem(); ctx.clip();
    ctx.strokeStyle = 'rgba(90,60,110,.45)'; ctx.lineWidth = 0.8;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-4, -4 + k * 4); ctx.quadraticCurveTo(16, k * 3, capX, capY + 8 + k * 1.2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(14, 0, capX - 8, capY + 9); ctx.stroke();
    ctx.restore();
    // a skirt ring on the stalk
    ctx.fillStyle = K.lg(ctx, 0, capY + 6, 0, capY + 18, ['#f6eefa', '#a68ab8']); ctx.beginPath(); ctx.ellipse(capX - 6, capY + 13, 4, 7, -0.9, 0, TAU); ctx.fill();
    // the cap: a fat swollen puffball dome, tilted toward the shaft
    ctx.save(); ctx.translate(capX, capY); ctx.rotate(0.28); ctx.scale(1 + 0.12 * Math.max(0, squash), 1 - 0.1 * Math.max(0, squash));
    const cap = () => { ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0); ctx.bezierCurveTo(rx, ry * 0.32, rx * 0.6, ry * 0.5, 0, ry * 0.46); ctx.bezierCurveTo(-rx * 0.6, ry * 0.5, -rx, ry * 0.32, -rx, 0); ctx.closePath(); };
    cap(); const hot = tell * 0.6;
    ctx.fillStyle = K.rg(ctx, -rx * 0.35, -ry * 0.55, rx * 1.35, [K.rgb(K.mix([255, 178, 240], [255, 200, 200], hot)), K.rgb(K.mix([214, 74, 186], [236, 60, 120], hot)), K.rgb(K.mix([108, 30, 100], [120, 20, 50], hot))]);
    ctx.fill(); ctx.strokeStyle = '#5a1650'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save(); cap(); ctx.clip();
    // gills along the underside, glowing
    ctx.fillStyle = K.lg(ctx, 0, ry * 0.05, 0, ry * 0.5, ['rgba(70,10,70,0)', 'rgba(70,10,70,.75)']); ctx.fillRect(-rx, 0, rx * 2, ry);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = K.rgb(LIME, 0.25 + 0.45 * tell); ctx.lineWidth = 0.9;
    for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(k * rx * 0.13, ry * 0.08); ctx.lineTo(k * rx * 0.16, ry * 0.5); ctx.stroke(); }
    ctx.restore();
    // pore-texture freckles and glowing cyan spots
    ctx.fillStyle = 'rgba(110,24,100,.35)';
    for (let k = 0; k < 14; k++) { const a = Math.PI + 0.2 + (k * 0.97) % 2.8, rr = (0.3 + ((k * 13) % 7) / 10) * rx; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * ry / rx * 0.9, 0.9, 0, TAU); ctx.fill(); }
    for (const [sx, sy, sr] of [[-12, -13, 4.2], [4, -17, 3.4], [14, -8, 3.8], [-2, -6, 2.4], [-18, -3, 2.6], [10, -2, 2]]) {
      const p = 0.65 + 0.35 * Math.sin(t * 3 + sx) + tell * 0.4;
      ctx.fillStyle = K.rg(ctx, sx * sw - sr * 0.3, sy * sw - sr * 0.3, sr * sw * 1.2, ['#eafffb', K.rgb(CYAN), K.rgb([30, 150, 150])]);
      ctx.beginPath(); ctx.ellipse(sx * sw, sy * sw, sr * sw, sr * sw * 0.85, 0, 0, TAU); ctx.fill();
      K.glow(ctx, sx * sw, sy * sw, sr * 3.2, CYAN, 0.28 * p);
    }
    // swelling veins in the tell
    if (tell > 0.05) { ctx.strokeStyle = `rgba(255,70,110,${0.6 * tell})`; ctx.lineWidth = 1;
      for (const [a0, a1] of [[3.5, 3.9], [4.3, 4.7], [5.1, 5.6]]) { ctx.beginPath(); ctx.moveTo(Math.cos(a0) * rx * 0.3, Math.sin(a0) * ry * 0.3); ctx.quadraticCurveTo(Math.cos(a0) * rx * 0.7, Math.sin(a1) * ry * 0.7, Math.cos(a1) * rx * 0.92, Math.sin(a1) * ry * 0.92); ctx.stroke(); } }
    ctx.restore();
    K.sheen(ctx, -2, -ry * 0.1, rx * 1.05, 0.55, 3.55, 4.6);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-rx * 0.45, -ry * 0.62, 3.2, 1.8, -0.6, 0, TAU); ctx.fill();
    // face: sleepy eyes that pop open in the tell, a puckered mouth that blows
    const ey = -ry * 0.12;
    K.eyes(ctx, 4, ey, 6.5, 4.1, '#7ffcf0', 0.6, tell);
    const lid = 0.55 * (1 - sm(0.9, 1.3, u)) + 0.55 * sm(2.4, 2.9, u);
    if (lid > 0.02) {
      ctx.fillStyle = K.lg(ctx, 0, ey - 6, 0, ey + 2, ['#e070c8', '#b03c98']);
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.rect(4 + d * 6.5 - 5, ey - 5.2, 10, 10 * lid); ctx.fill(); ctx.strokeStyle = '#6a1a5c'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(4 + d * 6.5 - 4.4, ey - 5.2 + 10 * lid); ctx.lineTo(4 + d * 6.5 + 4.4, ey - 5.2 + 10 * lid); ctx.stroke(); }
    }
    const mo = 1.2 + 2.6 * tell + 3 * Math.max(0, squash);
    ctx.fillStyle = '#3a0834'; ctx.beginPath(); ctx.ellipse(16, ey + 8, mo * 0.75, mo, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff9ee6'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(16, ey + 8, mo * 0.75 + 0.8, mo + 0.8, 0, 3.6, 5.2); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // wisps leaking out through the tell
    if (tell > 0.1 && age < 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) { const q = (t * 1.6 + k / 4) % 1, wx = ox + side * q * 18 * sc, wy = oy - q * 14 * sc - k * 2; ctx.fillStyle = K.rg(ctx, wx, wy, 7 * sc, [K.rgb([200, 120, 230], 0.35 * tell * (1 - q)), K.rgb([200, 120, 230], 0)]); ctx.beginPath(); ctx.arc(wx, wy, 7 * sc, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    if (age >= 0) drawSporeCloud(ctx, ox, oy, side, sc, t, age);
  }
  function drawSporeCloud(ctx, ox, oy, side, sc, t, a) {
    const grow = easeOut(a * 2.2), fade = (a < 0.06 ? a / 0.06 : 1) * (1 - sm(0.62, 1, a)), reach = 120 * sc;
    if (fade <= 0) return;
    const r = K.rand(77), blobs = [];
    for (let i = 0; i < 11; i++) {
      const ang = (r() - 0.5) * 1.15 - 0.2, dist = reach * grow * (i < 3 ? 0.04 + i * 0.14 + 0 * r() : 0.28 + 0.72 * r()), rad = (12 + 14 * r()) * (0.35 + 0.85 * grow) * sc;
      blobs.push([ox + side * Math.cos(ang) * dist + Math.sin(t * 1.5 + i) * 3 * sc, oy + Math.sin(ang) * dist - a * 16 * sc + Math.cos(t * 1.3 + i) * 2 * sc, rad]);
    }
    const cx = ox + side * reach * grow * 0.55, cy = oy - a * 16 * sc;
    K.danger(ctx, cx, cy, reach * 0.75, 0.3 * fade);
    // body: deep violet underside, a lighter lilac top lit from above-left, glowing lime spores inside
    for (const [bx, by, br] of blobs) { ctx.fillStyle = K.rg(ctx, bx, by + br * 0.2, br, [K.rgb([124, 58, 150], 0.75 * fade), K.rgb([96, 40, 120], 0.55 * fade), K.rgb([96, 40, 120], 0)]); ctx.beginPath(); ctx.arc(bx, by + br * 0.2, br, 0, TAU); ctx.fill(); }
    for (const [bx, by, br] of blobs) { ctx.fillStyle = K.rg(ctx, bx - br * 0.25, by - br * 0.3, br * 0.8, [K.rgb([236, 170, 250], 0.7 * fade), K.rgb([190, 110, 220], 0.45 * fade), K.rgb([170, 90, 210], 0)]); ctx.beginPath(); ctx.arc(bx - br * 0.15, by - br * 0.2, br * 0.8, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const b = blobs[i % blobs.length], ang = r() * TAU, rr = r() * b[2] * 0.9, x = b[0] + Math.cos(ang + t) * rr, y = b[1] + Math.sin(ang + t) * rr - a * 8;
      ctx.fillStyle = K.rgb(LIME, 0.8 * fade); ctx.beginPath(); ctx.arc(x, y, 1.1, 0, TAU); ctx.fill();
      ctx.fillStyle = K.rg(ctx, x, y, 5, [K.rgb(LIME, 0.3 * fade), K.rgb(LIME, 0)]); ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // the initial "pfff" ring
    if (a < 0.25) { ctx.strokeStyle = `rgba(240,200,255,${(1 - a / 0.25) * 0.7})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, (8 + a * 160) * sc, side > 0 ? -0.9 : Math.PI - 0.9 + 1.8 - 1.8, side > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke(); }
  }

  // ================= Bounce Cap =================
  const BOUNCE_T = 3.0, HIT = 0.95;
  function capSquash(u) {
    if (u < HIT - 0.06) return 0.05 * Math.sin(u * 5);
    if (u < HIT) return (u - (HIT - 0.06)) / 0.06;
    const d = u - HIT; return Math.exp(-d * 4.5) * Math.cos(d * 26);
  }
  // x,y: wall attach point; side +1 = left wall. Returns the cap's outer rim point (where the rocket gets boinged).
  const CAP_BASE = [42, -16], CAP_TILT = 0.32, CAP_W = 38, CAP_H = 30;
  function drawBounceCap(ctx, x, y, side, sc, t, sq) {
    const pos = Math.max(0, sq), [bx, by] = CAP_BASE;
    K.glow(ctx, x + side * (bx + 8) * sc, y + (by - 10) * sc, 70 * sc, [110, 255, 220], 0.18 + 0.3 * pos);
    ctx.save(); ctx.translate(x, y); ctx.scale(side * sc, sc); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = K.rg(ctx, -2, -4, 16, ['#5c4068', '#2c1c34']); ctx.beginPath(); ctx.ellipse(-4, 2, 10, 15, 0, 0, TAU); ctx.fill();
    // springy stalk: out of the wall and up, banded like a coil, bending as the cap is hit
    const ben = sq * 5;
    const stem = () => { ctx.beginPath(); ctx.moveTo(-6, 12); ctx.quadraticCurveTo(bx - 4 - ben, 14, bx + 7 - ben, by + 2); ctx.lineTo(bx - 7 - ben, by - 1); ctx.quadraticCurveTo(bx - 18, 0, -6, -6); ctx.closePath(); };
    stem(); ctx.fillStyle = K.lg(ctx, 0, -6, 6, 14, ['#f1fbf4', '#a8d0bc', '#4e7a68']); ctx.fill(); ctx.strokeStyle = '#2f5a4a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); stem(); ctx.clip();
    for (let k = 1; k < 6; k++) { const u = k / 6, px = lerp(-4, bx - ben, u), py = lerp(3, by, u * u); ctx.strokeStyle = 'rgba(40,90,72,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(px, py, 9, 2.2, -0.9 * u, 0, Math.PI); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(px, py - 1.6, 9, 2.2, -0.9 * u, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(bx - 18, -1, bx - 8, by); ctx.stroke();
    ctx.restore();
    // the cap: a fat rubbery dome, jelly-squashed on impact
    ctx.save(); ctx.translate(bx - ben, by); ctx.rotate(CAP_TILT + sq * 0.12); ctx.scale(1 + 0.22 * sq, 1 - 0.34 * sq);
    const W = CAP_W, H = CAP_H;
    const dome = () => { ctx.beginPath(); ctx.moveTo(-W, 0); ctx.bezierCurveTo(-W * 1.02, -H * 1.3, W * 1.02, -H * 1.3, W, 0); ctx.bezierCurveTo(W * 0.75, 5, -W * 0.75, 5, -W, 0); ctx.closePath(); };
    // gill underside, seen a little from below
    ctx.fillStyle = '#9fe8d8'; ctx.beginPath(); ctx.ellipse(0, 2, W * 0.97, 7.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.rg(ctx, 0, 3, W, ['#164a46', '#23786e', '#3fb4a4']); ctx.beginPath(); ctx.ellipse(0, 2.6, W * 0.88, 6, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,255,230,.4)'; ctx.lineWidth = 0.7;
    for (let k = -10; k <= 10; k++) { const a = k / 10 * Math.PI * 0.5; ctx.beginPath(); ctx.moveTo(Math.sin(a) * 5, 2.6 + Math.cos(a) * 1); ctx.lineTo(Math.sin(a) * W * 0.85, 2.6 + Math.cos(a) * 5); ctx.stroke(); }
    ctx.restore();
    dome(); ctx.fillStyle = K.rg(ctx, -W * 0.35, -H * 0.85, W * 1.5, ['#e2fff8', '#5ee8d0', '#16a094', '#0a5856']); ctx.fill();
    ctx.strokeStyle = '#0c4c4a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); dome(); ctx.clip();
    // rubber bands and white polka spots
    ctx.strokeStyle = 'rgba(10,90,86,.32)'; ctx.lineWidth = 3.2;
    for (const k of [0.5, 0.78]) { ctx.beginPath(); ctx.ellipse(0, 1, W * k, H * k, 0, Math.PI, 0); ctx.stroke(); }
    for (const [sx2, sy2, sr] of [[-18, -14, 5], [3, -24, 4.6], [20, -12, 4.2], [-5, -9, 3], [-30, -4, 2.8], [31, -3, 2.6], [10, -4, 2.2]]) {
      ctx.fillStyle = K.rg(ctx, sx2 - 1.2, sy2 - 1.2, sr * 1.3, ['#ffffff', '#e2fff8', '#8edccf']); ctx.beginPath(); ctx.ellipse(sx2, sy2, sr, sr * 0.82, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 3, ['rgba(4,50,48,0)', 'rgba(4,50,48,.5)']); ctx.fillRect(-W, -6, W * 2, 10);
    ctx.restore();
    K.sheen(ctx, 0, -H * 0.15, W, 0.65, 3.55, 4.5);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-W * 0.48, -H * 0.66, 4.4, 2.2, -0.6, 0, TAU); ctx.fill();
    // a thick springy lip around the rim
    ctx.strokeStyle = 'rgba(200,255,240,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-W * 0.92, 1); ctx.bezierCurveTo(-W * 0.6, 4.4, W * 0.6, 4.4, W * 0.92, 1); ctx.stroke();
    ctx.restore();
    ctx.restore();
    return capRim(x, y, side, sc);
  }
  function capRim(x, y, side, sc) {
    const c = Math.cos(CAP_TILT), s2 = Math.sin(CAP_TILT);
    return [x + side * (CAP_BASE[0] + CAP_W * c - 2 * s2) * sc, y + (CAP_BASE[1] + CAP_W * s2 + 2 * c) * sc];
  }
  function boingLines(ctx, x, y, side, k) {
    if (k <= 0) return;
    ctx.save(); ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const r = 10 + j * 8 + (1 - k) * 14;
      ctx.strokeStyle = `rgba(200,255,240,${k * (0.8 - j * 0.2)})`; ctx.lineWidth = 2 - j * 0.4;
      ctx.beginPath(); ctx.arc(x, y, r, side > 0 ? -0.6 : Math.PI - 0.4, side > 0 ? 0.4 : Math.PI + 0.6); ctx.stroke();
    }
    ctx.restore();
  }

  // ================= Skull Snapper =================
  const SKULL_T = 3.0;
  function skullPhase(t) {
    const u = ((t % SKULL_T) + SKULL_T) % SKULL_T;
    const tell = sm(1.2, 1.9, u) * (1 - sm(1.98, 2.0, u));
    let jaw;   // radians open
    if (u < 2.0) jaw = 0.5 + 0.04 * Math.sin(u * 4) + 0.28 * tell;
    else if (u < 2.07) jaw = lerp(0.78, -0.03, (u - 2.0) / 0.07);
    else if (u < 2.55) jaw = -0.03 * Math.exp(-(u - 2.07) * 10) * Math.cos((u - 2.07) * 40);
    else jaw = 0.5 * easeOut((u - 2.55) / 0.45);
    return { u, tell, jaw, snap: u >= 2.05 && u < 2.6 ? 1 - (u - 2.05) / 0.55 : 0 };
  }
  function bonePaint(ctx, x0, y0, x1, y1) { return K.lg(ctx, x0, y0, x1, y1, [BONE.hi, BONE.mid, BONE.lo]); }
  function drawSkull(ctx, x, y, side, sc, t) {
    const { tell, jaw, snap } = skullPhase(t);
    const sh = tell * Math.sin(t * 80) * 1.3;
    K.shadow(ctx, x + side * 62 * sc, y + 8 * sc, 66 * sc, 28 * sc, 0.25);
    K.danger(ctx, x + side * 78 * sc, y + 6 * sc, (70 + 12 * tell) * sc, 0.22 + 0.25 * tell + 0.2 * snap);
    ctx.save(); ctx.translate(x, y + sh * sc); ctx.scale(side * sc, sc); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // ---- lower jaw (behind), hinged at the back
    ctx.save(); ctx.translate(16, -2); ctx.rotate(jaw);
    const mand = () => { ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(8, -4); ctx.quadraticCurveTo(60, -1, 100, -3); ctx.quadraticCurveTo(108, -2, 106, 5); ctx.quadraticCurveTo(80, 12, 46, 16); ctx.quadraticCurveTo(14, 22, -6, 16); ctx.quadraticCurveTo(-16, 8, -14, -6); ctx.closePath(); };
    // lower teeth (behind the bone so their roots hide)
    for (let k = 0; k < 8; k++) {
      const tx = 30 + k * 9.6, tl = 9 + (k % 3 === 1 ? 4 : 0) - k * 0.3;
      ctx.fillStyle = K.lg(ctx, tx - 3, -2, tx + 3, -2 - tl, ['#d9c49c', BONE.hi, '#fffaf0']);
      ctx.beginPath(); ctx.moveTo(tx - 3.6, 0); ctx.quadraticCurveTo(tx - 2, -tl * 0.6, tx + 0.6, -tl); ctx.quadraticCurveTo(tx + 1.6, -tl * 0.5, tx + 3.4, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = BONE.deep; ctx.lineWidth = 0.8; ctx.stroke();
    }
    mand(); ctx.fillStyle = bonePaint(ctx, 0, -6, 6, 20); ctx.fill(); ctx.strokeStyle = BONE.edge; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); mand(); ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, 6, 0, 20, ['rgba(110,74,40,0)', 'rgba(110,74,40,.5)']); ctx.fillRect(-20, 4, 140, 20);
    ctx.fillStyle = '#3a2414'; ctx.beginPath(); ctx.ellipse(38, 7, 10, 3.6, -0.05, 0, TAU); ctx.fill();      // mandibular fenestra
    ctx.strokeStyle = 'rgba(120,84,50,.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(56, 9); ctx.quadraticCurveTo(70, 6, 86, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,235,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.quadraticCurveTo(50, 1, 98, -1); ctx.stroke();
    ctx.restore(); ctx.restore();
    // ---- the skull itself: cranium, brow, long snout, holes
    const cran = () => { ctx.beginPath(); ctx.moveTo(-14, -40); ctx.quadraticCurveTo(14, -58, 42, -52); ctx.quadraticCurveTo(58, -48, 70, -40); ctx.quadraticCurveTo(96, -32, 112, -24); ctx.quadraticCurveTo(122, -18, 118, -8); ctx.quadraticCurveTo(116, -3, 110, -4); ctx.lineTo(34, -6); ctx.quadraticCurveTo(20, -2, 10, 4); ctx.quadraticCurveTo(-4, 8, -14, 6); ctx.closePath(); };
    // upper teeth
    for (let k = 0; k < 9; k++) {
      const tx = 38 + k * 8.6, tl = 10 + (k % 3 === 0 ? 4 : 0) - k * 0.35;
      ctx.fillStyle = K.lg(ctx, tx - 3, -6, tx + 3, -6 + tl, ['#d9c49c', BONE.hi, '#fffaf0']);
      ctx.beginPath(); ctx.moveTo(tx - 3.6, -7); ctx.quadraticCurveTo(tx - 2.2, -6 + tl * 0.6, tx + 0.4, -6 + tl); ctx.quadraticCurveTo(tx + 1.8, -6 + tl * 0.5, tx + 3.4, -7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = BONE.deep; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(tx - 1.8, -5); ctx.lineTo(tx - 0.2, -6 + tl * 0.7); ctx.stroke();
    }
    cran(); ctx.fillStyle = bonePaint(ctx, 10, -56, 30, 8); ctx.fill(); ctx.strokeStyle = BONE.edge; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); cran(); ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, -24, 0, 6, ['rgba(110,74,40,0)', 'rgba(110,74,40,.5)']); ctx.fillRect(-20, -24, 150, 32);
    // holes: antorbital window, nostril, temporal hole near the wall
    const hole = (fn) => { ctx.beginPath(); fn(); ctx.fillStyle = K.lg(ctx, 0, -40, 0, -10, ['#1e120a', '#3e2614']); ctx.fill(); ctx.strokeStyle = 'rgba(255,240,210,.45)'; ctx.lineWidth = 1; ctx.stroke(); };
    hole(() => { ctx.moveTo(60, -34); ctx.quadraticCurveTo(76, -34, 86, -24); ctx.quadraticCurveTo(76, -16, 62, -18); ctx.quadraticCurveTo(56, -26, 60, -34); });
    hole(() => { ctx.ellipse(106, -20, 4.6, 3, -0.4, 0, TAU); });
    hole(() => { ctx.ellipse(8, -26, 7, 9, 0.2, 0, TAU); });
    // bone sutures, cracks and pitting
    ctx.strokeStyle = 'rgba(120,84,50,.6)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(54, -50); ctx.lineTo(56, -44); ctx.lineTo(52, -38); ctx.lineTo(56, -32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(92, -30); ctx.quadraticCurveTo(96, -20, 92, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, -50); ctx.lineTo(24, -42); ctx.lineTo(21, -36); ctx.stroke();
    ctx.fillStyle = 'rgba(120,84,50,.4)';
    for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.arc(70 + (k * 17) % 40, -14 - (k * 7) % 10, 0.9, 0, TAU); ctx.fill(); }
    // sheen along the brow and snout ridge
    ctx.strokeStyle = 'rgba(255,252,240,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -44); ctx.quadraticCurveTo(16, -54, 40, -49); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(72, -37); ctx.quadraticCurveTo(96, -29, 110, -22); ctx.stroke();
    ctx.restore();
    // brow ridge over the socket
    ctx.fillStyle = bonePaint(ctx, 30, -54, 40, -36); ctx.beginPath(); ctx.moveTo(22, -46); ctx.quadraticCurveTo(38, -58, 56, -46); ctx.quadraticCurveTo(40, -48, 22, -42); ctx.closePath(); ctx.fill(); ctx.strokeStyle = BONE.edge; ctx.lineWidth = 1.1; ctx.stroke();
    // the eye socket with a big cartoon eye glowing inside
    ctx.fillStyle = K.rg(ctx, 38, -30, 15, ['#3e2616', '#1a0e08']); ctx.beginPath(); ctx.ellipse(38, -31, 14, 12.5, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,210,.5)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(38, -31, 14, 12.5, -0.1, 0.2, 2.6); ctx.stroke();
    const eyeC = K.mix([255, 190, 60], [255, 60, 50], tell);
    K.glow(ctx, 39, -30, 22, eyeC, 0.35 + 0.35 * tell);
    ctx.fillStyle = K.rg(ctx, 36, -34, 12, ['#ffffff', '#f2e6d8', '#c9b49e']); ctx.beginPath(); ctx.ellipse(39, -30, 8.6, 9.2, 0, 0, TAU); ctx.fill();
    const look = 0.5 + 0.3 * tell;
    ctx.fillStyle = K.rgb(eyeC); ctx.beginPath(); ctx.arc(39 + look * 2.6, -29.4, 5.4 - tell, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0d14'; ctx.beginPath(); ctx.ellipse(39 + look * 3.2, -29.2, 2.6 - tell * 0.8, 3.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(37, -32.4, 1.5, 0, TAU); ctx.fill();
    // angry lid: the socket's top edge drops over the eye
    ctx.fillStyle = bonePaint(ctx, 30, -44, 40, -30);
    ctx.beginPath(); ctx.moveTo(28, -42); ctx.quadraticCurveTo(40, -44, 50, -38 + 6 * tell); ctx.lineTo(50, -36 + 5 * tell); ctx.quadraticCurveTo(40, -37 + 4 * tell, 29, -38 + 2 * tell); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = BONE.edge; ctx.lineWidth = 0.9; ctx.stroke();
    // packed earth where it juts from the wall
    ctx.fillStyle = K.rg(ctx, -10, -18, 30, ['#6e5038', '#3a2818']); ctx.beginPath(); ctx.ellipse(-12, -16, 14, 34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,150,.25)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-6 + (k % 2) * 4, -40 + k * 9, 1.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    // snap: bone dust puffs and impact ticks at the snout
    if (snap > 0) {
      const sx2 = x + side * 108 * sc, sy2 = y - 4 * sc, k = snap;
      ctx.save();
      for (let j = 0; j < 6; j++) { const a = -Math.PI / 2 + (j - 2.5) * 0.5, d = (1 - k) * 26 * sc + 6; ctx.fillStyle = `rgba(236,210,170,${0.55 * k})`; ctx.beginPath(); ctx.arc(sx2 + side * Math.abs(Math.cos(a)) * d * 0.6 + Math.cos(a) * d * 0.5, sy2 + Math.sin(a) * d * 0.4 + (j % 2 ? 6 : -6) * sc, (4 + (1 - k) * 6) * sc, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = `rgba(255,240,210,${0.9 * k})`; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) { const a = -0.7 + j * 0.7; ctx.beginPath(); ctx.moveTo(sx2 + side * Math.cos(a) * 16 * sc, sy2 + Math.sin(a) * 16 * sc); ctx.lineTo(sx2 + side * Math.cos(a) * 26 * sc, sy2 + Math.sin(a) * 26 * sc); ctx.stroke(); }
      ctx.restore();
    }
  }

  // ================= Ribcage Gate =================
  const RIB_T = 3.6;
  function ribClosed(t) {
    const u = ((t % RIB_T) + RIB_T) % RIB_T;
    const tell = sm(1.45, 1.95, u) * (1 - sm(2.0, 2.05, u));
    const close = u < 2.0 ? 0 : u < 2.18 ? easeOutBack((u - 2.0) / 0.18) : u < 3.0 ? 1 : 1 - sm(3.0, 3.45, u);
    return { u, tell, close, slam: u >= 2.12 && u < 2.6 ? 1 - (u - 2.12) / 0.48 : 0 };
  }
  // one rib bone, root at (0,0) growing +x, length L, tip curling up by `bend`
  function ribBone(ctx, L, bend, r0, k) {
    const P = s => { const a = 1 - s; return [2 * a * s * L * 0.5 + s * s * L, 2 * a * s * (-bend * 0.55) + s * s * bend]; };
    const N = 12, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, [px, py] = P(s), [qx, qy] = P(Math.min(1, s + 0.01)), [ox, oy] = P(Math.max(0, s - 0.01));
      let nx = -(qy - oy), ny = qx - ox; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const r = r0 * (1 - 0.55 * s) * (1 + 0.15 * Math.sin(s * 9));
      top.push([px - nx * r, py - ny * r]); bot.push([px + nx * r, py + ny * r]);
    }
    const tip = P(1), path = () => {
      ctx.beginPath(); ctx.moveTo(...top[0]); for (let i = 1; i <= N; i++) ctx.lineTo(...top[i]);
      ctx.arc(tip[0], tip[1], r0 * 0.5, -Math.PI / 2 - 0.3, Math.PI / 2 + 0.3); for (let i = N; i >= 0; i--) ctx.lineTo(...bot[i]); ctx.closePath();
    };
    path(); ctx.fillStyle = K.lg(ctx, 0, bend - r0, 0, r0 + 6, [BONE.hi, BONE.mid, BONE.lo]); ctx.fill();
    ctx.strokeStyle = BONE.edge; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.save(); path(); ctx.clip();
    ctx.strokeStyle = 'rgba(110,74,40,.45)'; ctx.lineWidth = 2.2; ctx.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = bot[i]; i ? ctx.lineTo(x, y - 1.4) : ctx.moveTo(x, y - 1.4); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,252,238,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= N - 1; i++) { const [x, y] = top[i]; i ? ctx.lineTo(x, y + 1.6) : ctx.moveTo(x, y + 1.6); } ctx.stroke();
    ctx.strokeStyle = 'rgba(120,84,50,.5)'; ctx.lineWidth = 0.7;
    for (const s of [0.3, 0.5, 0.72]) { const [x, y] = P(s); ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 3, y + 1); ctx.stroke(); }
    ctx.restore();
    // a knobbly end, red-hot tip glow in the tell
    if (k > 0.02) K.glow(ctx, tip[0], tip[1], r0 * 2.4, [255, 90, 60], 0.45 * k);
    return tip;
  }
  // L,R: wall edge fns; gy: top rib y; n ribs per side
  function drawRibcage(ctx, w, h, L, R, gy, sc, t, n = 4) {
    const { tell, close, slam } = ribClosed(t), gap = 26 * sc;
    const ys = []; for (let i = 0; i < n; i++) { ys.push([-1, gy + i * gap]); ys.push([1, gy + i * gap + gap / 2]); }
    const yMid = gy + (n - 0.5) * gap / 2, cx = (L(yMid) + R(yMid)) / 2;
    K.danger(ctx, cx, yMid, (40 + 50 * close) * sc, 0.12 + 0.2 * close + 0.15 * tell);
    // clip to the open shaft so retracted ribs disappear into the walls
    ctx.save(); ctx.beginPath(); ctx.moveTo(L(-2) + 3, -2);
    for (let y = -2; y <= h + 2; y += 6) ctx.lineTo(L(y) + 3, y);
    for (let y = h + 2; y >= -2; y -= 6) ctx.lineTo(R(y) - 3, y);
    ctx.closePath(); ctx.clip();
    for (const [side, y] of ys) {
      const jit = tell * Math.sin(t * 70 + y) * 1.6;
      const edge = side < 0 ? L(y) : R(y);
      const tipOpen = edge - side * 66 * sc, tipClosed = cx + side * -1 * 22 * sc;
      const tipX = lerp(tipOpen, tipClosed, close) + side * -1 * jit, len = 175 * sc;
      const rootX = tipX + side * len;
      // the tip lifts up (ribs curve upward), mirrored per side
      ctx.save(); ctx.translate(rootX, y + 8 * sc); ctx.scale(-side, 1);
      ribBone(ctx, len, -24 * sc, 8 * sc, tell);
      ctx.restore();
    }
    ctx.restore();
    // vertebra sockets in the walls where each rib slides out
    for (const [side, y] of ys) {
      const ex = side < 0 ? L(y) : R(y), yy = y + 6 * sc;
      ctx.save(); ctx.translate(ex, yy); ctx.scale(-side, 1);
      ctx.fillStyle = K.rg(ctx, -3 * sc, -6 * sc, 12 * sc, [BONE.mid, BONE.lo, BONE.deep]);
      ctx.beginPath(); ctx.ellipse(-2 * sc, 0, 7 * sc, 11 * sc, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = BONE.edge; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = '#2a1a0e'; ctx.beginPath(); ctx.ellipse(1 * sc, 0, 3 * sc, 7 * sc, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,235,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(-2 * sc, 0, 5.5 * sc, 9.5 * sc, 0, 3.4, 4.6); ctx.stroke();
      ctx.restore();
      if (tell > 0.02) K.glow(ctx, ex, yy, 14 * sc, [255, 120, 60], 0.5 * tell);
    }
    if (slam > 0) {
      ctx.save();
      for (let j = 0; j < 7; j++) { const a = j / 7 * TAU, d = (1 - slam) * 34 * sc + 4; ctx.fillStyle = `rgba(236,210,170,${0.5 * slam})`; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, yMid + Math.sin(a) * d * 0.7, (4 + (1 - slam) * 5) * sc, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    return { cx, yMid, close };
  }

  // ================= fossil zone dressing =================
  function fossFar(ctx, w, h, t, layer, col) {
    const r = K.rand(331 + layer * 19), k = layer ? 1.2 : 0.85;
    // mesas and hoodoo spires rising from below
    for (let i = 0; i < (layer ? 3 : 5); i++) {
      const x = (i + r()) / (layer ? 3 : 5) * w, cw = (14 + r() * 22) * k, ht = h * (0.25 + r() * 0.35) * k;
      ctx.beginPath(); ctx.moveTo(x - cw * 1.4, h + 5); ctx.lineTo(x - cw, h - ht * 0.55); ctx.lineTo(x - cw * 0.7, h - ht * 0.6);
      ctx.lineTo(x - cw * 0.75, h - ht); ctx.quadraticCurveTo(x, h - ht - 10 * k, x + cw * 0.75, h - ht);
      ctx.lineTo(x + cw * 0.7, h - ht * 0.6); ctx.lineTo(x + cw, h - ht * 0.55); ctx.lineTo(x + cw * 1.4, h + 5); ctx.fill();
    }
    // overhangs from the roof
    for (let i = 0; i < 3; i++) { const x = r() * w, cw = 18 + r() * 24, len = h * (0.08 + r() * 0.16) * k; ctx.beginPath(); ctx.moveTo(x - cw, -5); ctx.lineTo(x - cw * 0.5, len * 0.7); ctx.lineTo(x, len); ctx.lineTo(x + cw * 0.6, len * 0.6); ctx.lineTo(x + cw, -5); ctx.fill(); }
    // a giant fossil skeleton embedded in the far rock (spine arc + ribs)
    if (!layer) {
      ctx.save(); ctx.strokeStyle = K.rgb(K.lift(col, 14)); ctx.lineCap = 'round';
      const sx = w * 0.62, sy = h * 0.42;
      ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx, sy + 120, 120, -2.3, -0.9); ctx.stroke();
      ctx.lineWidth = 3.4;
      for (let j = 0; j < 7; j++) { const a = -2.2 + j * 0.2, bx = sx + Math.cos(a) * 120, by = sy + 120 + Math.sin(a) * 120; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(a + 1.4) * 30, by + 24, bx + Math.cos(a + 1.8) * 26, by + 56 - j * 2); ctx.stroke(); }
      ctx.restore(); ctx.fillStyle = K.rgb(col);
    }
  }
  function smallBone(ctx, x, y, len, ang, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a;
    ctx.fillStyle = K.lg(ctx, 0, -3, 0, 3, ['#efdcb6', '#b8946a']);
    ctx.beginPath(); ctx.rect(-len / 2, -1.3, len, 2.6); ctx.fill();
    for (const d of [-1, 1]) for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(d * len / 2, e * 1.7, 2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function fossWall(ctx, side, edge, w, h, t) {
    const r = K.rand(side < 0 ? 401 : 433);
    // strata: wavy bands of warmer and darker earth
    const bands = [[86, 60, 40, 0.35], [34, 24, 16, 0.4], [110, 76, 48, 0.25], [70, 46, 30, 0.35]];
    let y = -10, i = 0;
    while (y < h + 10) {
      const bh = 10 + r() * 22, c = bands[i++ % 4], ph = r() * 6;
      ctx.fillStyle = K.rgb(c, c[3]); ctx.beginPath(); ctx.moveTo(side < 0 ? -2 : w + 2, y);
      for (let k = 0; k <= 5; k++) { const xx = side < 0 ? k * 8 : w - k * 8; ctx.lineTo(xx, y + Math.sin(k * 0.9 + ph) * 3 - k * side * 0.0); }
      for (let k = 5; k >= 0; k--) { const xx = side < 0 ? k * 8 : w - k * 8; ctx.lineTo(xx, y + bh + Math.sin(k * 0.9 + ph + 1) * 3); }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,160,.12)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k <= 5; k++) { const xx = side < 0 ? k * 8 : w - k * 8; k ? ctx.lineTo(xx, y + Math.sin(k * 0.9 + ph) * 3) : ctx.moveTo(xx, y + Math.sin(ph) * 3); } ctx.stroke();
      y += bh;
    }
    // pebbles
    for (let k = 0; k < 14; k++) { const yy = r() * h, x = edge(yy) + side * (3 + r() * 26); ctx.fillStyle = `rgba(${150 + r() * 40 | 0},${110 + r() * 30 | 0},80,.35)`; ctx.beginPath(); ctx.ellipse(x, yy, 1.5 + r() * 2, 1 + r() * 1.5, r() * 3, 0, TAU); ctx.fill(); }
    // embedded bones
    for (let k = 0; k < 5; k++) { const yy = 20 + r() * (h - 40), x = edge(yy) + side * (6 + r() * 16); smallBone(ctx, x, yy, 8 + r() * 8, r() * 3, 0.6); }
    // ammonites: little spiral shells
    for (let k = 0; k < 2; k++) {
      const yy = 40 + r() * (h - 80), x = edge(yy) + side * (10 + r() * 10), rr = 5 + r() * 2;
      ctx.fillStyle = K.rg(ctx, x - 2, yy - 2, rr * 1.4, ['#d8b07c', '#8a6038']); ctx.beginPath(); ctx.arc(x, yy, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let a = 0; a < 11; a += 0.3) { const q = rr * (1 - a / 12), px = x + Math.cos(a) * q, py = yy + Math.sin(a) * q; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,190,.5)'; ctx.beginPath(); ctx.arc(x, yy, rr - 0.6, 3.4, 4.6); ctx.stroke();
    }
    // glowing amber chunks
    for (let k = 0; k < 3; k++) {
      const yy = 30 + r() * (h - 60), x = edge(yy) + side * (5 + r() * 14), s = 3 + r() * 2.5, p = 0.8 + 0.2 * Math.sin(t * 2 + k * 2);
      K.glow(ctx, x, yy, s * 5, [255, 170, 60], 0.35 * p);
      ctx.fillStyle = K.lg(ctx, x - s, yy - s, x + s, yy + s, ['#ffe08a', '#f29a26', '#a24c0c']);
      ctx.beginPath(); ctx.moveTo(x, yy - s * 1.2); ctx.lineTo(x + s, yy - s * 0.2); ctx.lineTo(x + s * 0.6, yy + s); ctx.lineTo(x - s * 0.8, yy + s * 0.7); ctx.lineTo(x - s, yy - s * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,230,.8)'; ctx.beginPath(); ctx.arc(x - s * 0.3, yy - s * 0.4, s * 0.3, 0, TAU); ctx.fill();
    }
  }
  // a small rock ledge stuck on a wall with a half-buried bone and an amber lamp glow (fossil set dressing)
  function fossLedge(ctx, x, y, side, sc, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(side * sc, sc);
    ctx.fillStyle = K.lg(ctx, 0, -6, 0, 10, ['#8a6646', '#4a3220', '#2a1c10']);
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(26, -5); ctx.quadraticCurveTo(32, -3, 28, 2); ctx.lineTo(14, 10); ctx.lineTo(-6, 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,160,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(26, -5); ctx.stroke();
    smallBone(ctx, 14, -7, 14, -0.15, 1);
    ctx.restore();
  }

  // ================= registrations =================
  PV.sections.mushroom = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...MUSH, farShape: mushFar, wallDeco: mushWall });
    // glowing cap crusts along both walls
    const cl = [[-1, 60, MAG], [1, 110, CYAN], [-1, 250, CYAN], [1, 205, MAG], [-1, 335, MAG], [1, 400, CYAN], [-1, 440, CYAN], [1, 35, CYAN]];
    for (const [side, y, c] of cl) capCluster(ctx, side < 0 ? S.L(y) : S.R(y), y, -side, 1, c, t, 3);
    // hanging glowing mycelium strands from the roof
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [x, len, c] of [[w * 0.4, 46, CYAN], [w * 0.58, 30, MAG], [w * 0.7, 56, CYAN]]) {
      const sw = Math.sin(t * 1.2 + x) * 3;
      ctx.strokeStyle = K.rgb(c, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, -2); ctx.quadraticCurveTo(x + sw, len * 0.5, x + sw * 1.5, len); ctx.stroke();
      ctx.fillStyle = K.rgb(K.lift(c, 60), 0.9); ctx.beginPath(); ctx.arc(x + sw * 1.5, len + 2, 2, 0, TAU); ctx.fill();
      K.glow(ctx, x + sw * 1.5, len + 2, 12, c, 0.4);
    }
    ctx.restore();
    drawPuffer(ctx, S.L(150) - 2, 150, 1, 0.9, t);
    const sq = 0.5 + 0.5 * Math.sin(t * 2.4); // idle springy wobble
    drawBounceCap(ctx, S.R(285) + 2, 285, -1, 0.8, t, (capSquash((t * 0.9) % BOUNCE_T)) * 0.5 + 0.04 * sq);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    K.motes(ctx, w, h, t, 'spore', CYAN, 22, 5);
    K.motes(ctx, w, h, t, 'spore', MAG, 10, 9);
  };

  PV.obstacles.spore = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...MUSH, farShape: mushFar, wallDeco: mushWall });
    capCluster(ctx, S.R(70), 70, -1, 1, CYAN, t, 3);
    capCluster(ctx, S.L(270), 270, 1, 1, MAG, t, 2);
    capCluster(ctx, S.R(250), 250, -1, 1, MAG, t, 2);
    // the rocket holds to the far side, waiting out the cloud
    const { u } = puffPhase(t);
    const rx = lerp(w * 0.72, w * 0.76, sm(1.2, 1.8, u)), ry = h * 0.84 - 6 * Math.sin(t * 2);
    K.rocket(ctx, rx, ry, 0.8, t);
    drawPuffer(ctx, S.L(170) - 2, 170, 1, 1.25, t);
    K.motes(ctx, w, h, t, 'spore', CYAN, 16, 5);
  };

  PV.obstacles.bouncecap = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...MUSH, farShape: mushFar, wallDeco: mushWall });
    capCluster(ctx, S.L(60), 60, 1, 1, MAG, t, 2);
    capCluster(ctx, S.R(250), 250, -1, 1, CYAN, t, 3);
    const u = ((t % BOUNCE_T) + BOUNCE_T) % BOUNCE_T, sq = capSquash(u);
    const cy = 190, ax = S.L(cy) - 2, sc = 1.15;
    const rim = capRim(ax, cy, 1, sc);
    const contact = [rim[0] + 4, rim[1] + 14];
    let px, py, ang, vis = 1;
    if (u < HIT) { const k = u / HIT; px = lerp(ax + 76, contact[0], k); py = lerp(h + 30, contact[1], k); ang = 0.05; }
    else { const k = easeOut((u - HIT) / 0.9), q = 1 - k; px = q * q * contact[0] + 2 * q * k * (w * 0.75) + k * k * (w * 0.8); py = q * q * contact[1] + 2 * q * k * (contact[1] + 10) + k * k * 40; ang = sm(HIT, HIT + 0.12, u) * (1.0 - 0.65 * k); vis = 1 - sm(1.8, 2.1, u); }
    // a speed trail after the boing
    if (u > HIT && vis > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let j = 1; j <= 6; j++) {
        const uu = Math.max(HIT, u - j * 0.035), k = easeOut((uu - HIT) / 0.9), q = 1 - k;
        const tx = q * q * contact[0] + 2 * q * k * (w * 0.75) + k * k * (w * 0.8), ty = q * q * contact[1] + 2 * q * k * (contact[1] + 10) + k * k * 40;
        ctx.fillStyle = `rgba(160,255,230,${0.25 * vis * (1 - j / 7)})`; ctx.beginPath(); ctx.arc(tx, ty, 9 - j, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    drawBounceCap(ctx, ax, cy, 1, sc, t, sq);
    if (vis > 0.01) { ctx.save(); ctx.globalAlpha = vis; ctx.translate(px, py); ctx.rotate(ang); K.rocket(ctx, 0, 0, 0.8, t); ctx.restore(); }
    boingLines(ctx, contact[0] + 6, contact[1] - 6, 1, u > HIT ? 1 - sm(HIT, HIT + 0.45, u) : 0);
    K.motes(ctx, w, h, t, 'spore', CYAN, 16, 5);
  };

  PV.sections.fossil = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...FOSS, farShape: fossFar, wallDeco: fossWall });
    // warm lamp-amber light pools and ledges
    fossLedge(ctx, S.L(60), 60, 1, 1, t);
    fossLedge(ctx, S.R(345), 345, -1, 0.9, t);
    fossLedge(ctx, S.L(440), 440, 1, 0.9, t);
    K.glow(ctx, w * 0.5, 0, 140, [255, 200, 130], 0.14);
    drawSkull(ctx, S.R(140) + 4, 140, -1, 0.72, t);
    drawRibcage(ctx, w, h, S.L, S.R, 230, 0.8, t, 3);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 232, 196], 30, 7);
  };

  PV.obstacles.skull = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...FOSS, farShape: fossFar, wallDeco: fossWall });
    fossLedge(ctx, S.R(270), 270, -1, 1, t);
    drawSkull(ctx, S.L(170) - 4, 170, 1, 1.0, t);
    // the safe lane: the rocket climbs past along the far side
    const u = (t % SKULL_T) / SKULL_T;
    K.rocket(ctx, w * 0.77, h + 30 - u * (h + 80), 0.8, t);
    K.motes(ctx, w, h, t, 'dust', [255, 232, 196], 20, 7);
  };

  PV.obstacles.ribcage = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, { ...FOSS, farShape: fossFar, wallDeco: fossWall });
    const u = ((t % RIB_T) + RIB_T) % RIB_T;
    // rocket threads the open gap, then is gone before it closes
    const ry = h + 30 - u * 250;
    const g = { cx: (S.L(160) + S.R(160)) / 2 };
    if (ry > -50) K.rocket(ctx, g.cx, ry, 0.8, t);
    drawRibcage(ctx, w, h, S.L, S.R, 112, 1, t, 4);
    K.motes(ctx, w, h, t, 'dust', [255, 232, 196], 20, 7);
  };
})();
