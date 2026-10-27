// Copied verbatim (apart from the globals it needs) from prototype/index.html so zoom.png can put the game's own
// bark thorn spike next to the map's props at the same zoom. Uses a global `ctx` like the game.
let ctx = null;
const DANGER = '#ff2a6a';
const SPIKE_SKINS = {
  thorn: { body: ['#d08a52', '#9a5a30', '#6a3a1c', '#4a2410'], edge: '#4a2410', thorn: ['#fff6dc', '#f2d29a', '#c89458'], thornEdge: '#9a6430',
           socket: ['#8a6040', '#4e3018'], leaf: ['#a8e05a', '#5a9a2a', '#2e6a1a'] },
};
function pkRG(c, x, y, r, stops) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.15);
  stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col)); return g;
}
function pkLG(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col)); return g;
}
function spikeHalf(h, t) { return h.half * (1 - t) * 0.95 + 2; }
function spikeBodyHalf(h, t) { return Math.max(0, h.half * (1 - t) * 0.95 + 2 - 1.2 - 1.6 * t * t); }
function spikeAO(hf) {
  const ao = ctx.createRadialGradient(-4, 1, 4, -4, 1, hf + 14);
  ao.addColorStop(0, 'rgba(24,10,6,.45)'); ao.addColorStop(1, 'rgba(24,10,6,0)');
  ctx.fillStyle = ao; ctx.beginPath(); ctx.ellipse(-4, 1, 16, hf + 14, 0, 0, 6.283); ctx.fill();
}
function thornPath(h, len) {
  const N = 14, f = [[-14, 9], [-8, 4.5], [-3, 1.6]];
  ctx.beginPath();
  for (const [x, e] of f) ctx.lineTo(x, -(spikeBodyHalf(h, 0) + e));
  for (let i = 0; i <= N; i++) { const t = i / N; ctx.lineTo(len * t, -spikeBodyHalf(h, t)); }
  for (let i = N; i >= 0; i--) { const t = i / N; ctx.lineTo(len * t, spikeBodyHalf(h, t)); }
  for (let i = f.length - 1; i >= 0; i--) ctx.lineTo(f[i][0], spikeBodyHalf(h, 0) + f[i][1]);
  ctx.closePath();
}
function drawSpikeThorn(h, k, len, hf, T) {
  spikeAO(hf);
  for (const [y0, y1, w, bend] of [[-14, -36, 4.2, -9], [13, 34, 4, -10], [-6, -26, 2.8, -15], [6, 24, 2.6, -14]]) {
    const mx = bend, my = (y0 + y1) / 2, nx = -14 - w;
    ctx.beginPath(); ctx.moveTo(-4, y0 - w); ctx.quadraticCurveTo(mx, my - w * 0.6, nx, y1); ctx.quadraticCurveTo(mx + w * 0.6, my + w * 0.4, -2, y0 + w); ctx.closePath();
    ctx.fillStyle = pkLG(ctx, 0, Math.min(y0, y1), 0, Math.max(y0, y1), [k.body[1], k.body[2]]); ctx.fill();
    ctx.strokeStyle = k.edge; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,160,.3)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-4, y0 - w * 0.6); ctx.quadraticCurveTo(mx, my - w * 0.5, nx + 1, y1); ctx.stroke();
  }
  thornPath(h, len);
  ctx.fillStyle = pkLG(ctx, 0, -hf, 0, hf, k.body); ctx.fill();
  ctx.strokeStyle = k.edge; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.save(); thornPath(h, len); ctx.clip();
  const under = ctx.createLinearGradient(0, 0, 0, hf); under.addColorStop(0, 'rgba(60,24,8,0)'); under.addColorStop(1, 'rgba(60,24,8,.45)');
  ctx.fillStyle = under; ctx.fillRect(-16, 0, len + 18, hf + 10);
  for (let j = 0; j < 3; j++) {
    const xa = len * (0.1 + j * 0.24), xb = xa + len * 0.12, wa = spikeBodyHalf(h, xa / len), wb = spikeBodyHalf(h, xb / len);
    ctx.strokeStyle = 'rgba(74,36,16,.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xa, -wa); ctx.quadraticCurveTo((xa + xb) / 2 + 3, 0, xb, wb); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,160,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xa - 1.6, -wa); ctx.quadraticCurveTo((xa + xb) / 2 + 1.4, 0, xb - 1.6, wb); ctx.stroke();
  }
  for (const [f, lit] of [[-0.62, 1], [-0.25, 0], [0.12, 1], [0.48, 0], [0.78, 0]]) {
    ctx.strokeStyle = 'rgba(74,36,16,.55)'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const t = i / 10 * 0.9, y = f * spikeBodyHalf(h, t) + Math.sin(t * 17 + f * 9) * 0.9; i ? ctx.lineTo(len * t, y) : ctx.moveTo(-8, y); }
    ctx.stroke();
    if (lit) {
      ctx.strokeStyle = 'rgba(255,214,160,.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const t = i / 10 * 0.85, y = f * spikeBodyHalf(h, t) - 1.5 + Math.sin(t * 17 + f * 9) * 0.9; i ? ctx.lineTo(len * t, y) : ctx.moveTo(-8, y); }
      ctx.stroke();
    }
  }
  const kx = len * 0.3, kr = spikeBodyHalf(h, 0.3) * 0.42;
  ctx.fillStyle = pkRG(ctx, kx, 2, kr, ['#c88450', '#6a3a1c', '#4a2410']); ctx.beginPath(); ctx.ellipse(kx, 2, kr * 1.3, kr, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,150,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(kx, 2, kr * 0.8, kr * 0.55, 0, 3.4, 5.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,226,180,.45)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, -spikeBodyHalf(h, 0) * 0.78); ctx.quadraticCurveTo(len * 0.45, -spikeBodyHalf(h, 0.45) * 0.72, len * 0.86, -spikeBodyHalf(h, 0.86) * 0.5); ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 7; i++) {
    const t = 0.05 + i * 0.105, x = len * t, w = spikeBodyHalf(h, t), big = t < 0.55;
    const reach = big ? spikeHalf(h, Math.min(1, t + 0.1)) + 4.6 - w : 2.6;
    for (const d of [-1, 1]) {
      if (!big && (i + (d > 0 ? 1 : 0)) % 2) continue;
      const bw = big ? 4.2 : 2.8;
      ctx.beginPath(); ctx.moveTo(x - bw, d * (w - 1.2));
      ctx.quadraticCurveTo(x + bw * 0.1, d * (w + reach * 0.45), x + bw * 1.6, d * (w + reach));
      ctx.quadraticCurveTo(x + bw * 0.7, d * (w + reach * 0.3), x + bw, d * (w - 1.2)); ctx.closePath();
      ctx.fillStyle = pkLG(ctx, x, d * w, x + bw, d * (w + reach), k.thorn); ctx.fill();
      ctx.strokeStyle = k.thornEdge; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + bw * 0.55, d * (w + reach * 0.55)); ctx.lineTo(x + bw * 1.6, d * (w + reach)); ctx.lineTo(x + bw * 0.95, d * (w + reach * 0.42)); ctx.closePath();
      ctx.fillStyle = DANGER; ctx.fill();
    }
  }
  const sw = Math.sin(T * 1.6 + h.ph) * 0.12;
  for (const [x, y, a, sz] of [[3, -spikeBodyHalf(h, 0) + 1, -0.9 + sw, 8], [9, -spikeBodyHalf(h, 0.08) + 2, -0.45 + sw, 6.5], [4, spikeBodyHalf(h, 0) - 1, 0.95 - sw, 7]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sz * 0.5, -sz * 0.42, sz, 0); ctx.quadraticCurveTo(sz * 0.5, sz * 0.42, 0, 0); ctx.closePath();
    ctx.fillStyle = pkLG(ctx, 0, -sz * 0.4, 0, sz * 0.4, [k.leaf[0], k.leaf[1]]); ctx.fill();
    ctx.strokeStyle = k.leaf[2]; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(sz * 0.85, 0); ctx.stroke();
    ctx.restore();
  }
  const pt = len * 0.84;
  ctx.beginPath(); ctx.moveTo(pt, -spikeBodyHalf(h, 0.84)); ctx.quadraticCurveTo(len * 0.95, -spikeBodyHalf(h, 0.95), len + 0.6, 0); ctx.quadraticCurveTo(len * 0.95, spikeBodyHalf(h, 0.95), pt, spikeBodyHalf(h, 0.84));
  ctx.quadraticCurveTo(pt - 2, 0, pt, -spikeBodyHalf(h, 0.84)); ctx.closePath();
  ctx.fillStyle = pkLG(ctx, pt, -3, pt, 3, ['#ff7aa6', DANGER, '#b0103e']); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,240,.7)'; ctx.beginPath(); ctx.ellipse(len * 0.9, -1, 2.2, 0.7, -0.05, 0, 6.283); ctx.fill();
  const vEnd = len * 0.5, vy = x => Math.sin(x / vEnd * Math.PI * 2.5 + 0.6) * spikeBodyHalf(h, x / len) * 0.92;
  for (const front of [false, true]) {
    ctx.strokeStyle = front ? k.leaf[1] : 'rgba(46,106,26,.55)'; ctx.lineWidth = front ? 1.5 : 1.2;
    ctx.beginPath(); let on = false;
    for (let x = -6; x <= vEnd; x += 2) {
      const isFront = Math.cos(x / vEnd * Math.PI * 2.5 + 0.6) > 0;
      if (isFront === front) { on ? ctx.lineTo(x, vy(x)) : ctx.moveTo(x, vy(x)); on = true; } else on = false;
    }
    ctx.stroke();
  }
  for (const vx of [vEnd * 0.42, vEnd]) {
    ctx.save(); ctx.translate(vx, vy(vx)); ctx.rotate(-0.5 + sw);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2.5, -2.4, 5.5, 0); ctx.quadraticCurveTo(2.5, 2.4, 0, 0); ctx.closePath();
    ctx.fillStyle = pkLG(ctx, 0, -2, 0, 2, [k.leaf[0], k.leaf[1]]); ctx.fill(); ctx.strokeStyle = k.leaf[2]; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.restore();
  }
  for (let j = 0; j < 7; j++) {
    const x = -11 + j * 3.2, y = -(j < 3 ? spikeBodyHalf(h, 0) + [7, 3.6, 1.2][j] : spikeBodyHalf(h, x / len)) + 0.6;
    ctx.fillStyle = j % 2 ? k.leaf[1] : k.leaf[0];
    ctx.beginPath(); ctx.ellipse(x, y, 2.6 + (j % 3) * 0.5, 1.8, -0.15, 0, 6.283); ctx.fill();
  }
}
// draws the game's thorn spike as it appears on a 390-wide phone (s = playW / WORLD_W = 390 / 400) at (x, y)
function gameThorn(c, x, y, zoom) {
  ctx = c; const s = 390 / 400 * zoom, h = { half: 20, len: 150, ph: 0, alt: 1234 };
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  drawSpikeThorn(h, SPIKE_SKINS.thorn, h.len, h.half, 0);
  c.restore();
}
