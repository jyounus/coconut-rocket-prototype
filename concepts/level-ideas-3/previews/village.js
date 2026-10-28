// Village group: Junk Heap, Hot Spring Terraces, Wash House, Treehouse Town, Paint Loft.
// ===================================================================================================
// JUNK HEAP: a climb up a mountain of island junk in hazy orange afternoon. Compactor, Fridge Dominoes, Oil Slick.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  // each wall is a stack of junk items: [kind, height, depth (how far it juts), colour]
  const KINDS = ['fridge', 'tyres', 'washer', 'door', 'sign', 'crate'];
  const COLS = { fridge: [[232, 220, 196], [120, 200, 190], [240, 180, 150]], washer: [[236, 236, 230], [200, 220, 230]], door: [[200, 70, 50], [70, 140, 170], [230, 170, 60]], sign: [[240, 196, 60], [60, 150, 110]], crate: [[176, 120, 70]], tyres: [[52, 46, 52]] };
  const stack = side => {
    const r = K.rand(side < 0 ? 31 : 77), out = []; let y = -60;
    while (y < 560) { const k = KINDS[(r() * KINDS.length) | 0], hgt = { fridge: 70, tyres: 44, washer: 52, door: 46, sign: 34, crate: 40 }[k] + r() * 10, c = COLS[k][(r() * COLS[k].length) | 0]; out.push({ k, y, hgt, d: 34 + r() * 22, c, r: r() }); y += hgt; }
    return out;
  };
  const ST = { [-1]: stack(-1), [1]: stack(1) };
  // the heap settles every few seconds: everything drops a few px with a crash
  const settle = t => { const u = ph(t, 4, 0.4); return smooth(3.55, 3.7, u) * 6 - Math.sin(clamp((u - 3.7) / 0.25, 0, 1) * PI) * 1.5; };
  const edgeOf = (side, w, t) => { const s = settle(t); return y => { const it = ST[side].find(i => y >= i.y + s && y < i.y + s + i.hgt) || ST[side][0]; return side < 0 ? it.d : w - it.d; }; };

  function sky(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#e08a4a', '#f2b062', '#f6cf86', '#e8a46a', '#a86a58']); ctx.fillRect(0, 0, w, h);
    // the low sun in the haze
    K.glow(ctx, w * 0.6, h * 0.3, 140, [255, 220, 150], 0.5);
    ctx.fillStyle = K.rg2(ctx, w * 0.6, h * 0.3, 2, w * 0.6, h * 0.3, 26, [[0, '#fff8e0'], [0.7, '#ffe0a0'], [1, '#ffc070', 0]]); ctx.beginPath(); ctx.arc(w * 0.6, h * 0.3, 26, 0, TAU); ctx.fill();
    // far junk mountains in two hazy layers, with a crane and its magnet
    const hills = (y0, amp, col, seed) => { const r = K.rand(seed); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 9) ctx.lineTo(x, y0 - Math.sin(x * 0.02 + seed) * amp - r() * 7); ctx.lineTo(w, h); ctx.fill(); };
    hills(h * 0.48, 26, 'rgba(176,104,96,.55)', 3);
    ctx.strokeStyle = 'rgba(140,80,80,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.44); ctx.lineTo(w * 0.3, h * 0.16); ctx.lineTo(w * 0.72, h * 0.12); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 8; k++) { const y = lerp(h * 0.44, h * 0.16, k / 8); ctx.moveTo(w * 0.3 - 4, y); ctx.lineTo(w * 0.3 + 4, y - 14); } ctx.moveTo(w * 0.66, h * 0.125); ctx.lineTo(w * 0.66 + Math.sin(t * 0.8) * 3, h * 0.22); ctx.stroke();
    ctx.fillStyle = 'rgba(130,70,76,.75)'; ctx.beginPath(); ctx.ellipse(w * 0.66 + Math.sin(t * 0.8) * 3, h * 0.23, 9, 4, 0, 0, TAU); ctx.fill();
    hills(h * 0.6, 20, 'rgba(150,84,84,.6)', 9);
    // dust in the air
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(255,200,140,.12)', 'rgba(255,170,110,.22)']); ctx.fillRect(0, 0, w, h);
  }

  // drawing one junk item, wall side, within [x0,x1] (x1 = the inner face), top y, height
  function item(ctx, it, side, w, y, t) {
    const inner = side < 0 ? it.d : w - it.d, x0 = side < 0 ? -2 : inner, x1 = side < 0 ? inner : w + 2, wd = x1 - x0, hh = it.hgt, c = it.c;
    const box = (r) => { ctx.beginPath(); ctx.roundRect(x0, y + 1, wd, hh - 2, r); };
    const shade = () => K.lg(ctx, side < 0 ? x0 : x1, 0, side < 0 ? x1 : x0, 0, [K.lift(c, -70), K.lift(c, -20), c, K.lift(c, 30)]);
    if (it.k === 'tyres') {
      // a pile of tyres seen side on: stacked rounded bands with tread
      const n = 3, th = hh / n;
      for (let i = 0; i < n; i++) {
        const ty = y + i * th, off = (i % 2) * side * -4;
        ctx.fillStyle = K.lg(ctx, 0, ty, 0, ty + th, ['#6a6070', '#3a3440', '#1e1a24']); ctx.beginPath(); ctx.roundRect(x0 + off, ty + 1, wd, th - 1, 6); ctx.fill();
        ctx.fillStyle = 'rgba(20,16,24,.6)'; for (let x = x0 + 3 + off; x < x1 + off - 2; x += 5) ctx.fillRect(x, ty + 3, 2, th - 5);
        ctx.strokeStyle = 'rgba(200,190,210,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 4 + off, ty + 2.5); ctx.lineTo(x1 - 4 + off, ty + 2.5); ctx.stroke();
      }
      return;
    }
    ctx.fillStyle = shade(); box(it.k === 'fridge' ? 9 : 4); ctx.fill();
    ctx.strokeStyle = rgb(K.lift(c, -90), 0.6); ctx.lineWidth = 1; ctx.stroke();
    // rust blooms
    const r = K.rand((it.y * 7) | 0);
    for (let k = 0; k < 3; k++) { const rx = lerp(x0, x1, r()), ry = y + r() * hh, rr = 3 + r() * 6; ctx.fillStyle = K.rg2(ctx, rx, ry, 0, rx, ry, rr, [[0, 'rgba(160,70,30,.75)'], [1, 'rgba(190,96,46,0)']]); ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2); }
    if (it.k === 'fridge') {
      ctx.fillStyle = rgb(K.lift(c, -60), 0.8); ctx.fillRect(x0, y + hh * 0.36, wd, 1.5);
      const hx = side < 0 ? x1 - 7 : x0 + 5;
      ctx.fillStyle = K.lg(ctx, hx, 0, hx + 2, 0, ['#f0f0f8', '#8a8aa0']); ctx.fillRect(hx, y + 8, 2.5, 14); ctx.fillRect(hx, y + hh * 0.42, 2.5, 18);
      // a magnet and a sticker
      ctx.fillStyle = '#ff5a6a'; ctx.beginPath(); ctx.arc(lerp(x0, x1, 0.45), y + hh * 0.6, 3, 0, TAU); ctx.fill();
    } else if (it.k === 'washer') {
      const cx = lerp(x0, x1, side < 0 ? 0.6 : 0.4), cy = y + hh * 0.56, rr = Math.min(hh * 0.3, 14);
      ctx.fillStyle = K.rg2(ctx, cx, cy, 1, cx, cy, rr + 3, [[0, '#d0d8e0'], [0.8, '#8a96a8'], [1, '#5a6070']]); ctx.beginPath(); ctx.arc(cx, cy, rr + 3, 0, TAU); ctx.fill();
      ctx.fillStyle = K.rg2(ctx, cx - 3, cy - 4, 1, cx, cy, rr, [[0, '#cfeaff'], [0.6, '#4a7ab0'], [1, '#2a3a5a']]); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, rr - 3, 3.6, 4.6); ctx.stroke();
      ctx.fillStyle = '#7a8090'; ctx.fillRect(x0 + 4, y + 5, wd - 8, 5); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(lerp(x0, x1, 0.3), y + 7.5, 1.6, 0, TAU); ctx.fill();
    } else if (it.k === 'door') {
      // a car door: a window in the top half, a handle
      ctx.fillStyle = K.lg(ctx, 0, y + 4, 0, y + hh * 0.45, ['#cfefff', '#5a9ac8', '#2a4a70']); ctx.beginPath(); ctx.roundRect(x0 + 5, y + 5, wd - 10, hh * 0.38, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 10, y + hh * 0.36); ctx.lineTo(x0 + 22, y + 8); ctx.stroke();
      ctx.fillStyle = '#d8d8e0'; ctx.fillRect(lerp(x0, x1, 0.5) - 5, y + hh * 0.6, 10, 2.5);
    } else if (it.k === 'sign') {
      // a road sign: a bold arrow
      ctx.fillStyle = 'rgba(255,255,240,.9)'; const ax = lerp(x0, x1, 0.5), ay = y + hh / 2; ctx.beginPath(); ctx.moveTo(ax - 12, ay - 3); ctx.lineTo(ax + 2, ay - 3); ctx.lineTo(ax + 2, ay - 8); ctx.lineTo(ax + 12, ay); ctx.lineTo(ax + 2, ay + 8); ctx.lineTo(ax + 2, ay + 3); ctx.lineTo(ax - 12, ay + 3); ctx.fill();
      ctx.fillStyle = '#c8c8d0'; ctx.beginPath(); ctx.arc(x0 + 5, y + 5, 1.3, 0, TAU); ctx.arc(x1 - 5, y + 5, 1.3, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(90,50,26,.7)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(x0, y + hh * k / 4); ctx.lineTo(x1, y + hh * k / 4); } ctx.moveTo(x0, y); ctx.lineTo(x1, y + hh); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,.4)'; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(x0, y + hh * k / 4 + 1); ctx.lineTo(x1, y + hh * k / 4 + 1); } ctx.stroke();
    }
    // the sun's glint on chrome trim
    ctx.strokeStyle = 'rgba(255,250,230,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(side < 0 ? x1 - 2 : x0 + 2, y + 5); ctx.lineTo(side < 0 ? x1 - 2 : x0 + 2, y + hh - 6); ctx.stroke();
  }

  function heap(ctx, side, w, h, t) {
    const ex = edgeOf(side, w, t), s = settle(t);
    K.wall(ctx, side, w, h, ex, {
      ao: 0.28, step: 2,
      fill: () => K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? 60 : w - 60, 0, ['#3a2a30', '#5a3e3a']),
      deco: () => { for (const it of ST[side]) item(ctx, it, side, w, it.y + s, t); ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? 30 : w - 30, 0, ['rgba(40,20,30,.5)', 'rgba(40,20,30,0)']); ctx.fillRect(side < 0 ? 0 : w - 30, 0, 30, h); },
    });
    // the settle crash: dust puffs off the item edges and a loose hubcap bounces down
    const u = ph(t, 4, 0.4), d = bump(u, 3.6, 3.7, 3.8, 4);
    if (d > 0.01) for (const it of ST[side]) { const x = side < 0 ? it.d : w - it.d, y = it.y + s; if (y < 0 || y > h) continue; for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(230,190,150,${0.4 * d})`; ctx.beginPath(); ctx.arc(x - side * (4 + k * 5 * d), y - k * 2, 3 + k * 2 * d, 0, TAU); ctx.fill(); } }
    return ex;
  }

  // ---------- Compactor: hazard lamps spin, pistons hiss, then two crusher plates squeeze the shaft to a slot ----------
  const CP = { y: 104, hh: 52, P: 4, o: 0 };
  function compactor(ctx, w, h, t) {
    const u = ph(t, CP.P, CP.o), warn = bump(u, 0.5, 0.6, 1.2, 1.3), close = smooth(1.2, 1.6, u) * (1 - smooth(2.6, 3.3, u));
    const y0 = CP.y, y1 = CP.y + CP.hh, slot = 64, reach = (w - slot) / 2;
    // the gantry at the walls: piston housings
    for (const side of [-1, 1]) {
      const base = side < 0 ? 0 : w, pos = lerp(side < 0 ? 26 : w - 26, side < 0 ? reach : w - reach, close);
      // piston rods
      for (const ry of [y0 + 12, y1 - 12]) {
        ctx.fillStyle = K.lg(ctx, 0, ry - 3, 0, ry + 3, ['#f4f4fa', '#9aa0b0', '#5a6070']); ctx.fillRect(Math.min(base, pos), ry - 3, Math.abs(pos - base), 6);
      }
      if (close > 0.1) K.danger(ctx, pos + side * -4, (y0 + y1) / 2, 40, 0.28 * close);
      // the plate: thick steel with yellow-black hazard chevrons on its face and a lit top edge
      const px = side < 0 ? pos - 20 : pos, pw = 20;
      ctx.fillStyle = K.lg(ctx, px, 0, px + pw, 0, side < 0 ? ['#4a4a58', '#8a8e9e', '#c8ccd8'] : ['#c8ccd8', '#8a8e9e', '#4a4a58']); ctx.beginPath(); ctx.roundRect(px, y0 - 4, pw, y1 - y0 + 8, 3); ctx.fill();
      const fx = side < 0 ? px + pw - 7 : px, fw = 7;
      ctx.save(); ctx.beginPath(); ctx.rect(fx, y0 - 4, fw, y1 - y0 + 8); ctx.clip();
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(fx, y0 - 4, fw, y1 - y0 + 8);
      ctx.fillStyle = '#3a3040'; for (let k = -2; k < 9; k++) { const yy = y0 - 4 + k * 10; ctx.beginPath(); ctx.moveTo(fx, yy); ctx.lineTo(fx + fw, yy + 5); ctx.lineTo(fx + fw, yy + 10); ctx.lineTo(fx, yy + 5); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px + 2, y0 - 3); ctx.lineTo(px + pw - 2, y0 - 3); ctx.stroke();
      ctx.fillStyle = '#5a5a68'; for (const ry of [y0 + 4, y1 - 4]) { ctx.beginPath(); ctx.arc(px + pw / 2, ry, 1.6, 0, TAU); ctx.fill(); }
      // the spinning amber lamp on top of the housing
      const lx = side < 0 ? 18 : w - 18, ly = y0 - 14, on = 0.35 + 0.65 * warn + 0.3 * close;
      ctx.fillStyle = '#4a4050'; ctx.fillRect(lx - 7, ly + 6, 14, 5);
      ctx.fillStyle = K.rg2(ctx, lx - 2, ly - 2, 1, lx, ly, 8, [[0, '#fff6c0'], [0.5, '#ffb030'], [1, '#c86010']]); ctx.beginPath(); ctx.arc(lx, ly + 5, 7, PI, 0); ctx.fill();
      if (on > 0.4) { const a = t * 9 * side; K.ray(ctx, lx, ly + 2, a, 0.28, 70, [255, 180, 60], 0.3 * on); K.glow(ctx, lx, ly + 2, 22, [255, 170, 50], 0.5 * on); }
      // hiss of steam from the housing when it starts
      const hs = bump(u, 1.0, 1.15, 1.5, 1.9);
      if (hs > 0.01) for (let k = 0; k < 5; k++) { const v = (u - 1) * 2 + k * 0.12; ctx.fillStyle = `rgba(255,248,240,${0.5 * hs * (1 - k / 5)})`; ctx.beginPath(); ctx.arc(lx - side * (6 + v * 20 + k * 3), y1 + 4 + k * 3, 3 + k * 1.6, 0, TAU); ctx.fill(); }
    }
    // when shut, the slot glints: the way through
    if (close > 0.9) { ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w / 2, y0 - 10); ctx.lineTo(w / 2, y1 + 10); ctx.stroke(); ctx.setLineDash([]); }
  }

  // ---------- Fridge Dominoes: a row of fridges on a ledge topples in a chain; the last one falls right across the shaft ----------
  const FD = { y: 300, P: 4, o: 1.0 };
  function dominoes(ctx, w, h, t, L) {
    const u = ph(t, FD.P, FD.o), ex = L(FD.y), ly = FD.y;
    // the ledge: a rusty girder sticking out of the heap
    const lx1 = ex + 62;
    ctx.fillStyle = K.lg(ctx, 0, ly, 0, ly + 9, ['#e08a5a', '#a0502a', '#5a2a1a']); ctx.fillRect(ex - 6, ly, lx1 - ex + 6, 9);
    ctx.fillStyle = 'rgba(60,20,10,.5)'; for (let x = ex; x < lx1; x += 10) ctx.fillRect(x, ly + 2, 1.5, 6);
    ctx.fillStyle = 'rgba(255,220,180,.6)'; ctx.fillRect(ex - 6, ly, lx1 - ex + 6, 1);
    // a wobble tell, then each fridge tips in turn (pivot on its right foot), the last one is tall and lands across the shaft
    const wob = bump(u, 0.3, 0.4, 0.9, 1.0) * Math.sin(t * 30) * 0.06;
    const F = [[ex + 6, 16, 34, '#7ac8be'], [ex + 26, 16, 36, '#f0e2c8'], [ex + 46, 16, 38, '#f0a890'], [lx1 - 12, 20, 62, '#e8e0cc']];
    const robot = smooth(2.8, 3.2, u) * (1 - smooth(3.7, 3.95, u));
    F.forEach(([x, fw, fh, col], i) => {
      const start = 1.0 + i * 0.16, fall = smooth(start, start + (i === 3 ? 0.35 : 0.18), u) * (1 - smooth(3.0 + i * 0.12, 3.5 + i * 0.1, u));
      const maxA = i === 3 ? PI / 2 : (i < 2 ? 0.55 : 0.45), a = fall * maxA + (i === 0 ? wob : 0);
      ctx.save(); ctx.translate(x + fw, ly); ctx.rotate(a);
      if (i === 3 && fall > 0.6) K.danger(ctx, -fw / 2, -fh / 2, 60, 0.25 * fall);
      ctx.fillStyle = K.lg(ctx, -fw, 0, 0, 0, ['#5a6070', col, col]); ctx.beginPath(); ctx.roundRect(-fw, -fh, fw, fh, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(70,60,70,.6)'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = 'rgba(70,60,70,.5)'; ctx.fillRect(-fw, -fh * 0.64, fw, 1.4);
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-4, -fh + 6, 2, 9); ctx.fillRect(-4, -fh * 0.58, 2, 10);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-fw + 3, -fh + 6); ctx.lineTo(-fw + 3, -6); ctx.stroke();
      ctx.fillStyle = K.rg2(ctx, 0, 0, 0, 0, 0, 6, [[0, 'rgba(160,70,30,.6)'], [1, 'rgba(160,70,30,0)']]); ctx.fillRect(-fw, -12, fw, 12);
      if (i === 3) { // fridge magnets: a smiley and a coconut
        ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.arc(-fw / 2, -fh * 0.3, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#6a4a20'; ctx.fillRect(-fw / 2 - 1.5, -fh * 0.3 - 1, 1, 1); ctx.fillRect(-fw / 2 + 0.6, -fh * 0.3 - 1, 1, 1);
        ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.arc(-fw / 2 - 2, -fh * 0.8, 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    });
    // the crash dust when the big one lands
    const dust = bump(u, 1.85, 1.95, 2.2, 2.7);
    if (dust > 0.01) for (let k = 0; k < 7; k++) { ctx.fillStyle = `rgba(250,220,180,${0.5 * dust})`; ctx.beginPath(); ctx.arc(lx1 + 10 + k * 13, ly - 4 - (k % 2) * 6 - (1 - dust) * 8, 4 + (1 - dust) * 6, 0, TAU); ctx.fill(); }
    // the little junk robot that trundles out and stands them back up
    if (robot > 0.01) {
      const rx = lerp(ex - 10, lx1 - 30, robot), ry = ly, bob = Math.abs(Math.sin(t * 14)) * 1.2;
      ctx.save(); ctx.translate(rx, ry - bob);
      ctx.fillStyle = '#3a3440'; ctx.beginPath(); ctx.arc(-5, -2, 3, 0, TAU); ctx.arc(5, -2, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = K.lg(ctx, -8, 0, 8, 0, ['#5fa8a0', '#9ae0d4', '#3a7a74']); ctx.beginPath(); ctx.roundRect(-8, -16, 16, 13, 3); ctx.fill();
      ctx.fillStyle = K.lg(ctx, 0, -26, 0, -16, ['#f2c14e', '#c08020']); ctx.beginPath(); ctx.roundRect(-6, -26, 12, 10, 4); ctx.fill();
      ctx.strokeStyle = '#8a8e9e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -31); ctx.stroke(); ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(0, -32, 1.6, 0, TAU); ctx.fill();
      K.eyes(ctx, 1, -21, 5, 2.4, '#7ad8ff', 1);
      ctx.strokeStyle = '#8a8e9e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(13, -14 - Math.sin(t * 12) * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- Oil Slick: a dented drum glugs, then a glossy slick spreads down a sheet of tin into the shaft ----------
  const OS = { y: 392, P: 4, o: 2.2 };
  function oilSlick(ctx, w, h, t, R) {
    const u = ph(t, OS.P, OS.o), ex = R(OS.y), glug = bump(u, 0.4, 0.5, 1.0, 1.1), spread = smooth(1.0, 1.9, u) * (1 - smooth(3.2, 3.9, u));
    // the tin sheet: a corrugated, rusty plank leaning out of the heap, down into the shaft
    const sx0 = ex + 4, sy0 = OS.y - 6, sx1 = ex - 92, sy1 = OS.y + 32;
    ctx.fillStyle = K.lg(ctx, 0, sy0, 0, sy1 + 10, ['#a8c8c4', '#6a9894', '#3e6662']);
    ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.lineTo(sx1, sy1 + 8); ctx.lineTo(sx0, sy0 + 8); ctx.fill();
    K.pair(ctx, () => { for (let k = 1; k < 8; k++) { const v = k / 8; ctx.moveTo(lerp(sx0, sx1, v), lerp(sy0, sy1, v)); ctx.lineTo(lerp(sx0, sx1, v), lerp(sy0, sy1, v) + 8); } }, 'rgba(30,60,60,.6)', 'rgba(220,250,245,.6)', 1, 1.2);
    ctx.fillStyle = 'rgba(190,96,46,.5)'; ctx.beginPath(); ctx.ellipse(lerp(sx0, sx1, 0.3), lerp(sy0, sy1, 0.3) + 5, 9, 3, 0.36, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,240,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke();
    // the drum on top, tipping and glugging
    const tilt = -0.2 - glug * 0.12 + Math.sin(t * 24) * 0.04 * glug;
    ctx.save(); ctx.translate(ex + 6, OS.y - 8); ctx.rotate(tilt);
    ctx.fillStyle = K.lg(ctx, -14, 0, 14, 0, ['#5a2a1a', '#c0602e', '#f0a060', '#a04a20']); ctx.beginPath(); ctx.roundRect(-14, -34, 28, 34, 3); ctx.fill();
    ctx.fillStyle = 'rgba(60,24,14,.6)'; ctx.fillRect(-14, -24, 28, 2); ctx.fillRect(-14, -11, 28, 2);
    ctx.fillStyle = K.lg(ctx, 0, -36, 0, -32, ['#e08a5a', '#7a3a1a']); ctx.beginPath(); ctx.ellipse(0, -34, 14, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2028'; ctx.beginPath(); ctx.ellipse(-8, -34, 3, 1.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.font = '700 8px system-ui'; ctx.fillText('OIL', -8, -14);
    // a dent with a highlight
    K.pair(ctx, () => { ctx.arc(5, -20, 4, 0.5, 2.6); }, 'rgba(60,20,10,.6)', 'rgba(255,220,180,.7)', 1, 1);
    ctx.restore();
    if (glug > 0.1) { const v = ph(t * 3, 1); ctx.fillStyle = K.rg2(ctx, ex - 4, OS.y - 40 - v * 6, 0, ex - 4, OS.y - 40 - v * 6, 4, [[0, '#4a3a5a'], [1, '#1a1424']]); ctx.beginPath(); ctx.arc(ex - 4, OS.y - 40 - v * 8, 3 * glug, 0, TAU); ctx.fill(); }
    // the slick: a glossy dark sheet running down the tin, then hanging in long drips into the shaft, with a rainbow film
    if (spread > 0.01) {
      const v = spread, tipX = lerp(sx0, sx1, v), tipY = lerp(sy0, sy1, v);
      ctx.fillStyle = K.lg(ctx, sx0, sy0, sx1, sy1, ['#2a2036', '#4a3466', '#1a1424']);
      ctx.beginPath(); ctx.moveTo(sx0 - 4, sy0 - 3); ctx.lineTo(tipX, tipY - 2); ctx.quadraticCurveTo(tipX - 5, tipY + 4, tipX, tipY + 9); ctx.lineTo(sx0 - 4, sy0 + 9); ctx.closePath();
      // the hanging curtain: rounded glossy drips under the sheet, longer the further the slick has run
      for (let k = 0; k < 5; k++) { const q = (k + 0.5) / 5, x = lerp(tipX + 4, sx0 - 8, q), y = lerp(tipY, sy0, q) + 7, L = (8 + ((k * 7) % 4) * 7) * smooth(0.3, 1, v) * (1 - q * 0.4) + Math.sin(t * 3 + k) * 2, r = 3 + (k % 2); ctx.moveTo(x - r - 1, y); ctx.quadraticCurveTo(x - r, y + L * 0.6, x - r, y + L); ctx.arc(x, y + L, r, PI, 0, true); ctx.quadraticCurveTo(x + r, y + L * 0.6, x + r + 1, y); ctx.closePath(); }
      ctx.fill();
      // the rainbow film: sliding bands of colour along the slick
      ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const sh = ph(t * 30, 60);
      ctx.fillStyle = K.lg(ctx, sx1 + sh, 0, sx1 + 80 + sh, 40, ['rgba(255,80,160,0)', 'rgba(255,80,160,.35)', 'rgba(80,220,255,.35)', 'rgba(140,255,120,.3)', 'rgba(255,220,80,.3)', 'rgba(255,220,80,0)']); ctx.fillRect(sx1 - 20, sy0 - 10, 160, 120);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx0 - 6, sy0 + 1); ctx.lineTo(lerp(sx0, tipX, 0.8), lerp(sy0, tipY, 0.8) + 1); ctx.stroke();
      // a falling drop
      const dv = ph(t * 1.4, 1), dx = lerp(tipX, sx0, 0.3), dy = lerp(tipY, sy0, 0.3) + 30 + dv * 60;
      ctx.fillStyle = 'rgba(40,30,60,.85)'; ctx.beginPath(); ctx.ellipse(dx, dy, 2.2, 3.2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,180,255,.7)'; ctx.fillRect(dx - 1, dy - 1.5, 0.9, 1.2);
    }
  }

  PV.sections['junkyard'] = (ctx, w, h, t) => {
    sky(ctx, w, h, t);
    const L = heap(ctx, -1, w, h, t), R = heap(ctx, 1, w, h, t);
    for (const [x, y, o] of [[0.5, 200, 0], [0.5, 236, 1.1], [0.62, 470, 2.2]]) K.coin(ctx, w * x, y, 0.62, t, o);
    oilSlick(ctx, w, h, t, R);
    dominoes(ctx, w, h, t, L);
    compactor(ctx, w, h, t);
    K.rocket(ctx, w * 0.34, h * 0.9, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 210, 160], 14, 6);
  };
})();

// ===================================================================================================
// HOT SPRING TERRACES: snowy stone terraces with steaming pools at night. Scald Steam, Shoji Doors, Warm Updraft.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const WARM = [255, 180, 110];
  // terraces: each wall is a run of stone terraces, each stepping out with a snowy lip; heights vary
  const TER = side => { const r = K.rand(side < 0 ? 5 : 15), out = []; let y = -40; while (y < 560) { const hh = 70 + r() * 40; out.push({ y, hh, d: 30 + r() * 20, r: r() }); y += hh; } return out; };
  const TS = { [-1]: TER(-1), [1]: TER(1) };
  const edgeOf = (side, w) => y => { const it = TS[side].find(i => y >= i.y && y < i.y + i.hh) || TS[side][0], v = (y - it.y) / it.hh, d = it.d + (v < 0.1 ? 4 * (1 - v / 0.1) : 0); return side < 0 ? d : w - d; };

  function night(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#0e2230', '#173848', '#244a5a', '#2e5866', '#3a5c64']); ctx.fillRect(0, 0, w, h);
    const r = K.rand(4);
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h * 0.5, a = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.3)); ctx.fillStyle = `rgba(230,248,255,${a})`; ctx.fillRect(x, y, 1.1, 1.1); }
    // a full moon over far snowy mountains and a pagoda bath house among cedars
    const mx = w * 0.62, my = 66; K.glow(ctx, mx, my, 70, [220, 240, 255], 0.35);
    ctx.fillStyle = K.rg2(ctx, mx - 4, my - 4, 2, mx, my, 15, [[0, '#ffffff'], [0.7, '#e8f4f2'], [1, '#bcd8dc']]); ctx.beginPath(); ctx.arc(mx, my, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(160,190,200,.35)'; ctx.beginPath(); ctx.arc(mx - 4, my + 3, 3, 0, TAU); ctx.arc(mx + 5, my - 4, 2, 0, TAU); ctx.fill();
    const mount = (y0, amp, c, snow, seed) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, h); const pts = []; for (let x = 0; x <= w; x += 6) { const y = y0 - Math.abs(Math.sin(x * 0.018 + seed)) * amp - Math.sin(x * 0.05 + seed * 3) * 6; pts.push([x, y]); ctx.lineTo(x, y); } ctx.lineTo(w, h); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= w; x += 6) ctx.lineTo(x, y0 - amp * 0.5 + Math.sin(x * 0.21 + seed) * 5 + Math.sin(x * 0.07) * 6); ctx.lineTo(w, 0); ctx.fill();
      ctx.fillStyle = 'rgba(120,160,180,.35)'; for (let x = 10; x < w; x += 23) { ctx.beginPath(); ctx.moveTo(x, y0 - amp); ctx.lineTo(x + 6, y0 - amp * 0.45); ctx.lineTo(x + 10, y0 - amp); ctx.fill(); } ctx.restore();
    };
    mount(h * 0.42, 70, 'rgba(70,110,130,.75)', 'rgba(220,240,246,.6)', 1);
    mount(h * 0.56, 40, 'rgba(46,82,96,.85)', 'rgba(220,240,246,.45)', 4);
    // cedars with snow on their tiers, and the bath house with glowing windows
    const cedar = (x, y, s) => { for (let k = 0; k < 4; k++) { const yy = y - k * 12 * s, ww = (16 - k * 3) * s; ctx.fillStyle = '#1e3e46'; ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x, yy - 16 * s); ctx.lineTo(x + ww, yy); ctx.fill(); ctx.fillStyle = 'rgba(230,246,250,.75)'; ctx.beginPath(); ctx.moveTo(x - ww * 0.6, yy - 6 * s); ctx.lineTo(x, yy - 16 * s); ctx.lineTo(x + ww * 0.5, yy - 7 * s); ctx.lineTo(x, yy - 12 * s); ctx.fill(); } };
    cedar(w * 0.18, h * 0.6, 1); cedar(w * 0.84, h * 0.58, 1.2); cedar(w * 0.7, h * 0.62, 0.8);
    const bx = w * 0.42, by = h * 0.6;
    ctx.fillStyle = '#3a2e30'; ctx.fillRect(bx - 22, by - 18, 44, 18);
    ctx.fillStyle = `rgba(255,190,120,${0.75 + 0.1 * Math.sin(t * 2)})`; for (let k = 0; k < 4; k++) ctx.fillRect(bx - 18 + k * 10, by - 14, 7, 9);
    K.glow(ctx, bx, by - 10, 40, WARM, 0.35);
    ctx.fillStyle = '#2a2228'; ctx.beginPath(); ctx.moveTo(bx - 30, by - 17); ctx.quadraticCurveTo(bx, by - 30, bx + 30, by - 17); ctx.lineTo(bx + 26, by - 20); ctx.quadraticCurveTo(bx, by - 34, bx - 26, by - 20); ctx.fill();
    ctx.fillStyle = 'rgba(236,248,250,.85)'; ctx.beginPath(); ctx.moveTo(bx - 27, by - 21); ctx.quadraticCurveTo(bx, by - 35, bx + 27, by - 21); ctx.quadraticCurveTo(bx, by - 31, bx - 27, by - 21); ctx.fill();
    // rosy steam drifting up from the valley
    for (let k = 0; k < 5; k++) { const v = ph(t * 0.15 + k * 0.2, 1), x = w * (0.2 + k * 0.15) + Math.sin(t * 0.5 + k) * 10, y = h * 0.66 - v * 140; ctx.fillStyle = K.rg2(ctx, x, y, 2, x, y, 30 + v * 20, [[0, 'rgba(255,200,210,.14)'], [1, 'rgba(255,200,210,0)']]); ctx.beginPath(); ctx.arc(x, y, 30 + v * 20, 0, TAU); ctx.fill(); }
  }

  function terraces(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.3,
      fill: () => K.lg(ctx, X(0), 0, X(54), 0, ['#24323a', '#3e5058', '#5a6c70']),
      deco: () => {
        for (const it of TS[side]) {
          const r = K.rand((it.y * 13) | 0 + 7), y0 = it.y, y1 = it.y + it.hh, xi = X(it.d);
          // dry-stone blocks: rounded stones with a lit top and dark seam, mossy in the cracks
          let y = y0 + 10;
          while (y < y1 - 4) {
            const bh = 12 + r() * 8; let x = side < 0 ? -10 + r() * 10 : w + 10 - r() * 10;
            while (side < 0 ? x < xi + 4 : x > xi - 4) {
              const bw = 16 + r() * 16, xa = side < 0 ? x : x - bw, c = K.lift([92, 110, 116], (r() - 0.5) * 30);
              ctx.fillStyle = K.lg(ctx, 0, y, 0, y + bh, [K.lift(c, 26), c, K.lift(c, -36)]); ctx.beginPath(); ctx.roundRect(xa + 0.8, y + 0.8, bw - 1.6, bh - 1.6, 5); ctx.fill();
              ctx.strokeStyle = 'rgba(210,230,234,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xa + 4, y + 2); ctx.lineTo(xa + bw - 4, y + 2); ctx.stroke();
              if (r() < 0.4) { ctx.fillStyle = 'rgba(110,150,80,.7)'; ctx.beginPath(); ctx.ellipse(xa + bw * r(), y + bh - 1, 5, 2, 0, 0, TAU); ctx.fill(); }
              x -= side * bw;
            }
            y += bh;
          }
          // the snowy top of each terrace: a pillowy cap with icicles
          ctx.fillStyle = K.lg(ctx, 0, y0 - 2, 0, y0 + 12, ['#ffffff', '#e2f0f4', '#a8c4cc']);
          ctx.beginPath(); ctx.moveTo(X(-4), y0 + 12); for (let d = -4; d <= it.d + 6; d += 6) ctx.quadraticCurveTo(X(d + 3), y0 - 3 - r() * 2, X(d + 6), y0 + 1); ctx.lineTo(X(it.d + 6), y0 + 12); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(200,226,236,.9)'; for (let k = 0; k < 3; k++) { const x = X(it.d - 4 - k * 9), L = 4 + r() * 6; ctx.beginPath(); ctx.moveTo(x - 1.6, y0 + 10); ctx.lineTo(x, y0 + 10 + L); ctx.lineTo(x + 1.6, y0 + 10); ctx.fill(); }
          // most terraces carry a niche: a little steaming pool (lit teal) or a stone lantern
          if (it.r < 0.55) {
            const py = y0 + it.hh * 0.55, px = X(it.d * 0.5);
            ctx.fillStyle = '#1a2a30'; ctx.beginPath(); ctx.ellipse(px, py, it.d * 0.42, 10, 0, PI, 0); ctx.lineTo(px + it.d * 0.42, py + 6); ctx.lineTo(px - it.d * 0.42, py + 6); ctx.fill();
            ctx.fillStyle = K.lg(ctx, 0, py, 0, py + 6, ['#9af0e8', '#3aa8b0', '#1a6a78']); ctx.fillRect(px - it.d * 0.4, py, it.d * 0.8, 5);
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(px - it.d * 0.3, py + 0.5, it.d * 0.4, 0.8);
            for (let k = 0; k < 2; k++) { const v = ph(t * 0.5 + k * 0.5 + it.r, 1); ctx.fillStyle = `rgba(255,230,236,${0.35 * Math.sin(v * PI)})`; ctx.beginPath(); ctx.arc(px + Math.sin(t + k * 3) * 4, py - v * 18, 4 + v * 5, 0, TAU); ctx.fill(); }
          } else {
            const px = X(it.d * 0.55), py = y0 + it.hh * 0.6;
            ctx.fillStyle = K.lg(ctx, px - 6, 0, px + 6, 0, ['#5a6a70', '#9aa8ac', '#4a585e']); ctx.fillRect(px - 2.5, py - 4, 5, 10); ctx.fillRect(px - 7, py + 5, 14, 3);
            ctx.fillStyle = `rgba(255,200,130,${0.8 + 0.15 * Math.sin(t * 5 + it.y)})`; ctx.fillRect(px - 5, py - 13, 10, 8);
            ctx.fillStyle = '#4a585e'; ctx.fillRect(px - 5, py - 13, 1.4, 8); ctx.fillRect(px + 3.6, py - 13, 1.4, 8);
            ctx.fillStyle = K.lg(ctx, 0, py - 18, 0, py - 13, ['#ffffff', '#7a8a90']); ctx.beginPath(); ctx.moveTo(px - 9, py - 13); ctx.lineTo(px, py - 19); ctx.lineTo(px + 9, py - 13); ctx.fill();
            K.glow(ctx, px, py - 9, 22, WARM, 0.4);
          }
        }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(24), 0, ['rgba(8,20,28,.55)', 'rgba(8,20,28,0)']); ctx.fillRect(side < 0 ? 0 : w - 24, 0, 24, h);
      },
      lip: ['#1a282e', '#6a7c80', '#e8f4f2'], lipW: 2,
    });
    return ex;
  }

  // ---------- Scald Steam: a vent breathes white steam across the shaft; it blushes pink, then red (scalding), then fades ----------
  const SS = { y: 118, P: 4, o: 0.2 };
  function steam(ctx, w, h, t, R) {
    const u = ph(t, SS.P, SS.o), ex = R(SS.y), vy = SS.y;
    const heat = smooth(1.0, 1.6, u) * (1 - smooth(2.9, 3.5, u)), scald = smooth(1.6, 2.0, u) * (1 - smooth(2.7, 3.0, u));
    // colour: white → pink (the tell) → red (scalds) → white
    const col = heat < 0.01 ? [244, 250, 252] : scald > 0 ? [lerp(255, 255, scald), lerp(170, 90, scald), lerp(190, 100, scald)] : [255, lerp(250, 170, heat), lerp(252, 190, heat)];
    // the vent: a bamboo pipe with a stone collar
    ctx.fillStyle = K.lg(ctx, 0, vy - 6, 0, vy + 6, ['#c8d890', '#7a9440', '#4a5e24']); ctx.fillRect(ex - 22, vy - 5, 26, 10);
    ctx.fillStyle = '#e4ecc0'; ctx.fillRect(ex - 12, vy - 5, 1.5, 10);
    ctx.fillStyle = K.rg2(ctx, ex - 22, vy, 0, ex - 22, vy, 6, [[0, '#2a3a20'], [1, '#6a8434']]); ctx.beginPath(); ctx.ellipse(ex - 22, vy, 3, 5, 0, 0, TAU); ctx.fill();
    // the steam plume: soft puffs travelling out across the shaft, swelling as they go
    const reach = w * 0.58, pulse = 0.85 + 0.15 * Math.sin(t * 5);
    if (scald > 0.05) K.danger(ctx, ex - reach * 0.5, vy, 80, 0.32 * scald);
    for (let k = 0; k < 11; k++) {
      const v = ph(t * 0.9 + k / 11, 1), x = ex - 24 - v * reach * pulse, y = vy + Math.sin(v * 6 + t * 2 + k) * 6 - v * 8, r = 6 + v * 18;
      const a = (0.55 - v * 0.35) * (1 - smooth(0.85, 1, v));
      ctx.fillStyle = K.rg2(ctx, x - r * 0.3, y - r * 0.3, 1, x, y, r, [[0, col, a], [0.6, col, a * 0.6], [1, col, 0]]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // when superheated, the air shimmers and the snow on the lip below drips
    if (heat > 0.3) { ctx.strokeStyle = `rgba(255,160,170,${0.3 * heat})`; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { const y = vy - 20 - k * 5; ctx.moveTo(ex - 40, y); for (let x = ex - 40; x > ex - reach; x -= 8) ctx.lineTo(x, y + Math.sin(x * 0.3 + t * 9 + k) * 2); } ctx.stroke(); }
  }

  // ---------- Shoji Doors: paper sliding doors on rails across the shaft; a bather's shadow walks up behind the paper, then they slide shut ----------
  const SD = { y: 230, hh: 64, P: 4, o: 1.2 };
  function shoji(ctx, w, h, t, L, R) {
    const u = ph(t, SD.P, SD.o), y0 = SD.y, y1 = SD.y + SD.hh, xl = L(y0 + 30), xr = R(y0 + 30), mid = (xl + xr) / 2;
    const shadow = bump(u, 0.3, 0.9, 1.6, 2.0), shut = smooth(1.3, 1.65, u) * (1 - smooth(2.6, 3.0, u));
    const pw = (xr - xl) * 0.32, slide = lerp(0, (xr - xl) * 0.36, shut);
    // the rails across the shaft: dark cedar beams with a lit top
    for (const ry of [y0 - 6, y1]) { ctx.fillStyle = K.lg(ctx, 0, ry, 0, ry + 6, ['#d0905a', '#8a4e2a', '#4a2a18']); ctx.fillRect(xl - 4, ry, xr - xl + 8, 6); ctx.fillStyle = 'rgba(255,236,200,.7)'; ctx.fillRect(xl - 4, ry, xr - xl + 8, 0.9); }
    // the light behind the paper
    K.danger(ctx, xl + slide + pw, (y0 + y1) / 2, 60, 0.18 + 0.1 * bump(u, 1.3, 1.4, 1.6, 1.8));
    for (const side of [-1, 1]) {
      const x0 = xl + slide + (side < 0 ? 0 : pw), x1 = x0 + pw;
      // the door slides into the wall: clip to the shaft
      ctx.save(); ctx.beginPath(); ctx.rect(xl, y0 - 2, xr - xl, SD.hh + 4); ctx.clip();
      // glowing paper with a cedar frame and lattice
      ctx.fillStyle = K.lg(ctx, 0, y0, 0, y1, ['#fff6e0', '#ffe6c0', '#f8cf98']); ctx.fillRect(x0, y0, pw, SD.hh);
      K.glow(ctx, (x0 + x1) / 2, (y0 + y1) / 2, 34, [255, 200, 130], 0.25);
      // the bather's shadow, walking up behind the right-hand panel: the tell
      if (side > 0 && shadow > 0.02) {
        const sx = lerp(x1 + 14, x0 + pw * 0.5, shadow), sy = y1 - 2;
        ctx.fillStyle = `rgba(120,70,60,${0.5 * shadow})`;
        ctx.beginPath(); ctx.arc(sx, sy - 44, 8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx, sy - 22, 10, 16, 0, 0, TAU); ctx.fill();
        // a towel on its head
        ctx.beginPath(); ctx.ellipse(sx, sy - 52, 7, 3, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx - 12, sy - 26, 3, 9, 0.3 + Math.sin(t * 6) * 0.2, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#6a3a22'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 1; k < 4; k++) { ctx.moveTo(x0 + pw * k / 4, y0); ctx.lineTo(x0 + pw * k / 4, y1); }
      for (let k = 1; k < 5; k++) { ctx.moveTo(x0, y0 + SD.hh * k / 5); ctx.lineTo(x1, y0 + SD.hh * k / 5); }
      ctx.stroke();
      ctx.fillStyle = K.lg(ctx, x0, 0, x1, 0, ['#5a2e1a', '#a8683a', '#5a2e1a']);
      ctx.fillRect(x0, y0, 4, SD.hh); ctx.fillRect(x1 - 4, y0, 4, SD.hh); ctx.fillRect(x0, y0, pw, 3.5); ctx.fillRect(x0, y1 - 3.5, pw, 3.5);
      ctx.strokeStyle = 'rgba(255,230,190,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + 1); ctx.lineTo(x0 + 1, y1 - 1); ctx.stroke();
      // a round finger-pull
      const hx = side < 0 ? x1 - 9 : x0 + 9; ctx.fillStyle = K.rg2(ctx, hx, y0 + 34, 0, hx, y0 + 34, 4, [[0, '#3a2014'], [1, '#c8904a']]); ctx.beginPath(); ctx.arc(hx, y0 + 34, 3.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // the bather sighs a puff when the doors shut
    const sigh = bump(u, 1.6, 1.7, 1.9, 2.3);
    if (sigh > 0.01) for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(255,240,240,${0.5 * sigh})`; ctx.beginPath(); ctx.arc(xl + slide + pw + 8 + k * 6, y0 - 14 - k * 6 - (1 - sigh) * 10, 4 + k * 2, 0, TAU); ctx.fill(); }
  }

  // ---------- Warm Updraft: a hot pool on a terrace sends up a shimmering column; it swells with the bubbling and sways ----------
  const WU = { y: 420, P: 4, o: 2.6 };
  function updraft(ctx, w, h, t, L) {
    const u = ph(t, WU.P, WU.o), ex = L(WU.y), px = ex + 50, py = WU.y;
    const boil = bump(u, 0.3, 0.8, 2.6, 3.4), cw = 18 + 22 * boil, sway = Math.sin(t * 1.6) * 10 * boil;
    // the pool: a stone basin jutting from the terrace, rosy-teal water
    ctx.fillStyle = K.lg(ctx, 0, py - 6, 0, py + 18, ['#a8b8bc', '#6a7c80', '#3a4a50']); ctx.beginPath(); ctx.moveTo(ex - 4, py - 4); ctx.lineTo(px + 34, py - 4); ctx.quadraticCurveTo(px + 38, py + 16, px + 20, py + 18); ctx.lineTo(ex - 4, py + 18); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, py - 6, 0, py + 2, ['#ffffff', '#cfe4ea']); ctx.beginPath(); ctx.ellipse(px + 10, py - 5, 36, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, py - 4, 0, py + 2, ['#ffd6de', '#7ad8d0', '#2a8a94']); ctx.beginPath(); ctx.ellipse(px + 10, py - 3, 30, 3, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 4; k++) { const v = ph(t * 2 + k * 0.25, 1); ctx.strokeStyle = `rgba(255,255,255,${0.7 * boil * (1 - v)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(px + 10 + (k - 1.5) * 12, py - 4, 1 + v * 3, PI, 0); ctx.stroke(); }
    // the column: soft warm air with rising heat wavers and floating snowflakes melting into it
    const cx = px + 10, top = py - 300;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.lg(ctx, cx - cw, 0, cx + cw, 0, ['rgba(255,170,150,0)', `rgba(255,180,150,${0.24 + 0.16 * boil})`, 'rgba(255,170,150,0)']);
    ctx.beginPath(); ctx.moveTo(cx - 20, py - 4); ctx.bezierCurveTo(cx - cw, py - 100, cx - cw + sway, py - 200, cx - cw * 1.2 + sway * 1.5, top); ctx.lineTo(cx + cw * 1.2 + sway * 1.5, top); ctx.bezierCurveTo(cx + cw + sway, py - 200, cx + cw, py - 100, cx + 20, py - 4); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255,214,200,${0.35 + 0.35 * boil})`; ctx.lineWidth = 1.4;
    for (let k = 0; k < 6; k++) { const v = ph(t * 0.6 + k / 6, 1), y = py - 10 - v * 260, s2 = sway * v * 1.5, ww = cw * (0.4 + v * 0.6); ctx.beginPath(); ctx.moveTo(cx - ww + s2, y); ctx.quadraticCurveTo(cx + s2 - ww / 2, y - 6, cx + s2, y); ctx.quadraticCurveTo(cx + s2 + ww / 2, y + 6, cx + ww + s2, y); ctx.stroke(); }
    // up arrows of sparkles rising faster in the middle
    for (let k = 0; k < 8; k++) { const v = ph(t * 0.8 + k / 8, 1), x = cx + Math.sin(k * 2.3) * cw * 0.6 + sway * v * 1.5, y = py - 6 - v * 280; K.star4(ctx, x, y, 1.8, [255, 240, 230], 0.8 * Math.sin(v * PI) * (0.4 + boil * 0.6)); }
  }

  // ---------- the twist: a snow monkey in a pool tosses you a coin it found ----------
  function monkey(ctx, w, h, t, R) {
    const y = 344, ex = R(y), x = ex - 24, u = ph(t, 4, 0.6), toss = bump(u, 1.0, 1.2, 1.3, 1.5);
    // its little tub
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 16, ['#a8b8bc', '#5a6c70']); ctx.beginPath(); ctx.roundRect(x - 22, y + 2, 44, 14, 6); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 4, ['#bff0ea', '#4ab8b8']); ctx.beginPath(); ctx.ellipse(x, y + 3, 20, 3, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 2; k++) { const v = ph(t * 0.4 + k * 0.5, 1); ctx.fillStyle = `rgba(255,236,240,${0.35 * Math.sin(v * PI)})`; ctx.beginPath(); ctx.arc(x + (k ? 12 : -12), y - v * 20, 4 + v * 6, 0, TAU); ctx.fill(); }
    // the monkey: grey fur, rosy face, snow on its head, eyes half shut with bliss, an arm flings up when it tosses
    ctx.fillStyle = K.rg2(ctx, x - 4, y - 14, 1, x, y - 8, 14, [[0, '#e8e4e0'], [0.6, '#b8b0aa'], [1, '#7a706a']]); ctx.beginPath(); ctx.ellipse(x, y - 4, 12, 10, 0, PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 15, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(x, y - 23, 6, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.rg2(ctx, x - 1, y - 15, 0.5, x, y - 14, 7, [[0, '#ffb0a8'], [1, '#e86a70']]); ctx.beginPath(); ctx.ellipse(x, y - 13.5, 6, 5, 0, 0, TAU); ctx.fill();
    K.eyes(ctx, x, y - 15, 5, 2, '#5a3020', 0, 0); ctx.fillStyle = '#e86a70'; ctx.fillRect(x - 6, y - 17, 12, 1.6 * (1 - toss));
    ctx.strokeStyle = '#a8a09a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 9, y - 6); ctx.lineTo(x - 15 - toss * 4, y - 12 - toss * 14); ctx.stroke(); ctx.lineCap = 'butt';
    // the coin arcs from its hand across into the shaft and hangs there to be collected
    const v = smooth(1.1, 1.9, u), cx = lerp(x - 18, w * 0.42, v), cy = lerp(y - 28, y - 70, v) - Math.sin(v * PI) * 40;
    if (u > 1.1 && u < 3.8) K.coin(ctx, cx, cy, 0.6, t, 0.4);
  }

  PV.sections['onsen'] = (ctx, w, h, t) => {
    night(ctx, w, h, t);
    const L = terraces(ctx, -1, w, h, t), R = terraces(ctx, 1, w, h, t);
    for (const [x, y, o] of [[0.5, 186, 0], [0.5, 330, 1.4]]) K.coin(ctx, w * x, y, 0.62, t, o);
    updraft(ctx, w, h, t, L);
    monkey(ctx, w, h, t, R);
    shoji(ctx, w, h, t, L, R);
    steam(ctx, w, h, t, R);
    K.rocket(ctx, w * 0.62, h * 0.9, 0.75, t);
    K.motes(ctx, w, h, t, 'snow', [240, 250, 255], 26, 9);
  };
})();

// ===================================================================================================
// WASH HOUSE: a tall tiled laundry in clean morning light. Mangle Rollers, Steam Iron, Suds Swell.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const edgeOf = (side, w) => y => { const k = Math.floor((y + 30) / 120), v = ((y + 30) / 120) - k, d = 34 + (k % 2) * 8 + (v > 0.92 ? 5 : 0); return side < 0 ? d : w - d; };

  function room(ctx, w, h, t) {
    // the back wall: soft blue plaster, a tall window with morning light pouring in
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#7ab4e0', '#6aa4d8', '#5a94cc', '#3e70a8']); ctx.fillRect(0, 0, w, h);
    const wx = w * 0.5, wy = 90;
    ctx.fillStyle = K.lg(ctx, 0, wy - 60, 0, wy + 60, ['#ffffff', '#fff8d8', '#e8f6ff']); ctx.beginPath(); ctx.roundRect(wx - 40, wy - 64, 80, 128, [40, 40, 4, 4]); ctx.fill();
    ctx.strokeStyle = '#6a9ac8'; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(wx, wy - 64); ctx.lineTo(wx, wy + 64); ctx.moveTo(wx - 40, wy); ctx.lineTo(wx + 40, wy); ctx.stroke();
    // a lemon tree and a blue sky through the glass
    ctx.save(); ctx.beginPath(); ctx.roundRect(wx - 38, wy - 62, 76, 124, [38, 38, 3, 3]); ctx.clip();
    ctx.fillStyle = K.lg(ctx, 0, wy - 62, 0, wy + 62, ['#bfe8ff', '#e8f8ff']); ctx.fillRect(wx - 40, wy - 64, 80, 130);
    ctx.fillStyle = '#7ac06a'; ctx.beginPath(); ctx.arc(wx + 24, wy + 30, 26, 0, TAU); ctx.arc(wx - 4, wy + 52, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe36a'; for (const [x, y] of [[18, 22], [32, 38], [2, 46], [26, 54]]) { ctx.beginPath(); ctx.ellipse(wx + x, wy + y, 3.6, 2.8, 0.4, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx - 34, wy - 40); ctx.lineTo(wx - 26, wy - 52); ctx.stroke();
    // the beam of sunlight slanting down the room, with dancing dust
    K.ray(ctx, wx, wy + 40, -0.25, 0.32, 380, [255, 248, 210], 0.18);
    // a far shelf line of laundry baskets and a hanging line of sheets far back
    ctx.fillStyle = 'rgba(120,160,200,.35)'; ctx.fillRect(0, h * 0.5, w, 3);
    for (let k = 0; k < 5; k++) { const x = w * (0.15 + k * 0.18); ctx.fillStyle = 'rgba(200,170,130,.4)'; ctx.beginPath(); ctx.roundRect(x - 12, h * 0.5 - 14, 24, 14, 3); ctx.fill(); ctx.fillStyle = ['rgba(255,140,160,.4)', 'rgba(255,255,255,.6)', 'rgba(255,220,120,.45)'][k % 3]; ctx.beginPath(); ctx.ellipse(x, h * 0.5 - 14, 10, 4, 0, PI, 0); ctx.fill(); }
    ctx.strokeStyle = 'rgba(140,170,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, h * 0.66); ctx.quadraticCurveTo(w / 2, h * 0.7, w, h * 0.66); ctx.stroke();
    for (let k = 0; k < 4; k++) { const x = w * (0.2 + k * 0.2), y = h * 0.66 + 4 * Math.sin((x / w) * PI) * 1.2, sw = Math.sin(t * 1.5 + k) * 2; ctx.fillStyle = ['rgba(255,255,255,.55)', 'rgba(170,220,255,.5)', 'rgba(255,240,200,.5)', 'rgba(255,200,220,.5)'][k]; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 13 + sw, y + 30); ctx.lineTo(x - 13 + sw, y + 28); ctx.fill(); }
    ctx.fillStyle = 'rgba(20,40,90,.06)'; ctx.fillRect(0, 0, w, h);
  }

  function tiles(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.18,
      fill: '#5a7898',
      deco: () => {
        // blue and white tiles with grout and a glossy highlight each; a band of patterned tiles
        const T = 12;
        for (let y = -4; y < h; y += T) for (let d = 0; d < 56; d += T) {
          const row = Math.floor(y / T), band = ((row + 40) % 10) < 2, x = side < 0 ? d : w - d - T;
          const blue = band || ((row + d / T) % 2 === 0 && ((row + 40) % 10) >= 4 && ((row + 40) % 10) <= 6);
          ctx.fillStyle = blue ? K.lg(ctx, x, y, x + T, y + T, ['#8ab4e8', '#4a7ab8', '#2e5a98']) : K.lg(ctx, x, y, x + T, y + T, ['#ffffff', '#e4eef8', '#b8cce0']);
          ctx.fillRect(x + 0.8, y + 0.8, T - 1.6, T - 1.6);
          if (band) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + T / 2, y + 2); ctx.lineTo(x + T - 2, y + T / 2); ctx.lineTo(x + T / 2, y + T - 2); ctx.lineTo(x + 2, y + T / 2); ctx.fill(); ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 1.4, 0, TAU); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x + 1.6, y + 1.6, 3, 1);
        }
        // grout shade toward the back
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(22), 0, ['rgba(30,50,90,.4)', 'rgba(30,50,90,0)']); ctx.fillRect(side < 0 ? 0 : w - 22, 0, 22, h);
        // a copper pipe running up each wall, with joints and a valve wheel
        const px = X(10);
        ctx.fillStyle = K.lg(ctx, px - 3, 0, px + 3, 0, ['#8a4a20', '#f0a868', '#ffd8b0', '#b0602a']); ctx.fillRect(px - 3, 0, 6, h);
        for (let y = 40; y < h; y += 90) { ctx.fillStyle = K.lg(ctx, px - 4, 0, px + 4, 0, ['#7a3a18', '#e09050', '#8a4a20']); ctx.fillRect(px - 4.5, y, 9, 6); }
      },
      lip: ['#2e5a98', '#ffffff', '#ffffff'], lipW: 2.5,
    });
    // shelves on the tiles: soap bars and bottles (unclipped, sitting on little shelves at each step)
    for (let k = 0; k < 5; k++) {
      const y = k * 120 + 82, e = ex(y - 4); if (y > h) break;
      if ((k + (side < 0 ? 0 : 1)) % 2) continue;
      ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 5, ['#ffffff', '#a8b8d0']); ctx.fillRect(e - (side < 0 ? 4 : 18), y, 22, 4);
      const b = (bx, c1, c2, bh) => { ctx.fillStyle = K.lg(ctx, bx - 4, 0, bx + 4, 0, [c2, c1, c2]); ctx.beginPath(); ctx.roundRect(bx - 4, y - bh, 8, bh, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(bx - 2.5, y - bh + 3, 1.2, bh - 6); ctx.fillStyle = c2; ctx.fillRect(bx - 1.6, y - bh - 3, 3.2, 3); };
      b(e + (side < 0 ? 4 : -6), '#ffe36a', '#c8a020', 14); b(e + (side < 0 ? 13 : -15), '#ff9ab8', '#c8507a', 11);
    }
    return ex;
  }

  // ---------- Mangle Rollers: wringer rollers in the wall speed up with a rattle, then suck you toward them ----------
  const MR = { y: 132, P: 4, o: 0.3 };
  function mangle(ctx, w, h, t, L) {
    const u = ph(t, MR.P, MR.o), ex = L(MR.y), y = MR.y;
    const rattle = bump(u, 0.6, 0.8, 1.1, 1.2), suck = bump(u, 1.1, 1.4, 2.8, 3.3), spin = t * (2 + 12 * Math.max(rattle, suck));
    const shake = Math.sin(t * 60) * 1.2 * rattle;
    // the iron frame bolted to the wall, two rollers stacked, a crank handle
    const fx = ex - 4 + shake;
    ctx.fillStyle = K.lg(ctx, fx, 0, fx + 46, 0, ['#2e4a78', '#5a7ab8', '#2e4a78']); ctx.beginPath(); ctx.roundRect(fx, y - 30, 8, 60, 3); ctx.roundRect(fx + 38, y - 30, 8, 60, 3); ctx.fill();
    ctx.fillStyle = '#ffe36a'; for (const yy of [y - 26, y + 26]) { ctx.beginPath(); ctx.arc(fx + 42, yy, 1.8, 0, TAU); ctx.fill(); }
    for (const [ry, dir] of [[y - 11, 1], [y + 11, -1]]) {
      ctx.fillStyle = K.lg(ctx, 0, ry - 11, 0, ry + 11, ['#ffffff', '#e8eef4', '#a8b8c8', '#6a7a90']); ctx.beginPath(); ctx.roundRect(fx + 6, ry - 10.5, 34, 21, 10); ctx.fill();
      // rubber grooves rolling
      ctx.save(); ctx.beginPath(); ctx.roundRect(fx + 6, ry - 10.5, 34, 21, 10); ctx.clip();
      ctx.strokeStyle = 'rgba(80,100,130,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 6; k++) { const yy = ry + (((k * 7 + spin * 8 * dir) % 42) + 42) % 42 - 21; ctx.moveTo(fx + 6, yy); ctx.lineTo(fx + 40, yy); } ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx + 12, ry - 8); ctx.lineTo(fx + 34, ry - 8); ctx.stroke();
    }
    // the crank
    const ca = spin * 0.6, cx = fx + 46, cy = y;
    ctx.strokeStyle = '#2e4a78'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ca) * 12, cy + Math.sin(ca) * 12); ctx.stroke();
    ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.arc(cx + Math.cos(ca) * 12, cy + Math.sin(ca) * 12, 3, 0, TAU); ctx.fill(); ctx.lineCap = 'butt';
    // a sock half-wrung, flapping in the nip
    ctx.fillStyle = '#ff9ab8'; ctx.beginPath(); ctx.moveTo(fx + 42, y - 3); ctx.quadraticCurveTo(fx + 56 + Math.sin(t * 9) * 3 * (1 + suck), y - 6, fx + 60 + Math.sin(t * 7) * 4, y + 4); ctx.lineTo(fx + 54, y + 7); ctx.quadraticCurveTo(fx + 50, y + 2, fx + 42, y + 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx + 44, y - 3, 3, 6);
    // the suction: air streaks rushing into the nip from across the shaft, curling in; a ring shows the pull zone
    if (suck > 0.02) {
      K.glow(ctx, fx + 44, y, 70, [150, 200, 255], 0.25 * suck);
      ctx.strokeStyle = `rgba(30,70,150,${0.85 * suck})`; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const v = ph(t * 1.6 + k / 9, 1), a = (k / 9 - 0.5) * 2.2, R = lerp(110, 14, v), x = fx + 44 + Math.cos(a) * R, yy = y + Math.sin(a) * R * 0.8;
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - Math.cos(a) * 12 * (1 - v * 0.5), yy - Math.sin(a) * 10 * (1 - v * 0.5)); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * suck})`; ctx.setLineDash([4, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx + 44, y, 100, -1.1, 1.1); ctx.stroke(); ctx.setLineDash([]);
    }
    if (rattle > 0.1) { ctx.fillStyle = `rgba(46,74,120,${rattle})`; ctx.font = '800 9px system-ui'; ctx.fillText('rattle', fx + 50, y - 26 - rattle * 4); }
  }

  // ---------- Steam Iron: puffs on a board jutting from the wall, then glides along it and back, leaving a hot stripe that cools ----------
  const SI = { y: 268, P: 4, o: 1.4 };
  function iron(ctx, w, h, t, R) {
    const u = ph(t, SI.P, SI.o), ex = R(SI.y), y = SI.y, bx0 = ex + 4, bx1 = ex - 128;
    const puff = bump(u, 0.3, 0.45, 0.8, 1.1), go = smooth(1.0, 1.7, u) * (1 - smooth(2.2, 2.9, u));
    const ix = lerp(bx0 - 32, bx1 + 28, go);
    // the board: a padded board on folding legs (the legs reach back to the wall), with a striped cover
    ctx.strokeStyle = '#6a7a90'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx0 - 30, y + 6); ctx.lineTo(bx0, y + 40); ctx.moveTo(bx0 - 70, y + 6); ctx.lineTo(bx0, y + 26); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, y - 3, 0, y + 7, ['#ffffff', '#cfe0ee', '#8aa8c8']); ctx.beginPath(); ctx.moveTo(bx0, y - 3); ctx.lineTo(bx1 + 14, y - 3); ctx.quadraticCurveTo(bx1, y + 2, bx1 + 14, y + 7); ctx.lineTo(bx0, y + 7); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(74,122,184,.35)'; for (let x = bx1; x < bx0; x += 10) ctx.fillRect(x, y - 3, 4, 10); ctx.restore();
    // the pressed hot stripe: wherever the iron has passed this cycle, glowing red, cooling to nothing from the far end
    const cool = smooth(2.9, 3.9, u), passed = Math.max(go, smooth(1.0, 1.7, u) * (1 - cool));
    if (passed > 0.02) {
      const sx0 = bx0 - 32, sx1 = lerp(bx0 - 32, bx1 + 28, Math.min(1, smooth(1.0, 1.7, u))), heat = 1 - cool;
      const g = K.lg(ctx, 0, y - 8, 0, y + 2, ['rgba(255,80,60,0)', `rgba(255,110,60,${0.75 * heat})`, `rgba(255,220,140,${0.9 * heat})`]);
      ctx.fillStyle = g; ctx.fillRect(Math.min(sx0, sx1) - 10, y - 9, Math.abs(sx1 - sx0) + 20, 7);
      if (heat > 0.2) { K.danger(ctx, (sx0 + sx1) / 2, y - 8, Math.abs(sx1 - sx0) * 0.5 + 20, 0.22 * heat); ctx.strokeStyle = `rgba(255,170,120,${0.4 * heat})`; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 3; k++) { const yy = y - 14 - k * 7; ctx.moveTo(sx1, yy); for (let x = sx1; x < sx0; x += 6) ctx.lineTo(x, yy + Math.sin(x * 0.4 + t * 8 + k) * 2); } ctx.stroke(); }
    }
    // the iron: a glossy lemon body with a chrome soleplate and a handle; steam puffs from its nose before it moves
    ctx.save(); ctx.translate(ix, y - 3);
    ctx.fillStyle = K.lg(ctx, 0, -2, 0, 2, ['#ffffff', '#9aa8b8']); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(18, 0); ctx.lineTo(18, -3); ctx.lineTo(-20, -3); ctx.fill();
    ctx.fillStyle = K.rg2(ctx, -6, -18, 2, -2, -10, 26, [[0, '#fffbe0'], [0.4, '#ffe36a'], [1, '#d8a020']]); ctx.beginPath(); ctx.moveTo(-26, -3); ctx.quadraticCurveTo(-18, -20, 6, -20); ctx.lineTo(18, -18); ctx.lineTo(18, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,110,20,.5)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = '#4a7ab8'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(0, -32, 14, -22); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-18, -9); ctx.quadraticCurveTo(-12, -17, 2, -17); ctx.stroke();
    ctx.fillStyle = go > 0.05 || puff > 0.2 ? '#ff5a4a' : '#8ad08a'; ctx.beginPath(); ctx.arc(6, -12, 2, 0, TAU); ctx.fill();
    K.eyes(ctx, -6, -11, 6, 2.6, '#4a7ab8', -1, go * 0.8 + puff * 0.4);
    ctx.restore();
    if (go > 0.05) K.danger(ctx, ix - 4, y - 12, 32, 0.3);
    if (puff > 0.02) for (let k = 0; k < 5; k++) { const v = (u - 0.3) * 1.6 + k * 0.08; ctx.fillStyle = `rgba(255,255,255,${0.75 * puff * (1 - k / 5)})`; ctx.beginPath(); ctx.arc(ix - 28 - v * 18 - k * 4, y - 6 - v * 16 - k * 3, 4 + k * 2, 0, TAU); ctx.fill(); }
  }

  // ---------- Suds Swell: a tub fizzes, a heap of foam swells out over the shaft, then pops away bubble by bubble ----------
  const SW = { y: 400, P: 4, o: 2.4 };
  function suds(ctx, w, h, t, L) {
    const u = ph(t, SW.P, SW.o), ex = L(SW.y), tx = ex + 22, ty = SW.y;
    const fizz = bump(u, 0.3, 0.5, 0.9, 1.1), swell = smooth(0.9, 1.6, u), pop = smooth(2.4, 3.6, u);
    // the tub: a zinc washtub on a bracket
    ctx.fillStyle = '#6a7a90'; ctx.fillRect(ex - 4, ty + 16, 30, 4);
    ctx.fillStyle = K.lg(ctx, tx - 20, 0, tx + 20, 0, ['#7a8aa0', '#e8eef4', '#a8b8c8', '#5a6a80']); ctx.beginPath(); ctx.moveTo(tx - 22, ty - 6); ctx.lineTo(tx + 22, ty - 6); ctx.lineTo(tx + 17, ty + 16); ctx.lineTo(tx - 17, ty + 16); ctx.fill();
    ctx.strokeStyle = 'rgba(90,100,120,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx - 20, ty + 2); ctx.lineTo(tx + 20, ty + 2); ctx.moveTo(tx - 18, ty + 10); ctx.lineTo(tx + 18, ty + 10); ctx.stroke();
    ctx.fillStyle = '#d0dae4'; ctx.beginPath(); ctx.ellipse(tx, ty - 6, 22, 3.5, 0, 0, TAU); ctx.fill();
    // the foam heap: many bubbles, a cauliflower that swells out across the shaft; bubbles pop away from the edge in
    const r = K.rand(51), N = 34;
    if (swell > 0.3 && pop < 0.6) K.glow(ctx, tx + 50 * swell, ty - 30 * swell, 80 * swell, [200, 230, 255], 0.25);
    for (let i = 0; i < N; i++) {
      const a = -PI + r() * PI * 1.15 - 0.1, dd = Math.sqrt(r()), R = 90 * swell * dd + 6, bx = tx + Math.cos(a) * R * 1.4 + 20 * swell * dd, by = ty - 6 + Math.sin(a) * R * 0.8;
      const popAt = 1 - dd, gone = pop > popAt + 0.05 ? 1 : 0, br = (5 + r() * 9) * (0.4 + swell * 0.6) * (1 + Math.sin(t * 4 + i) * 0.04);
      if (gone) continue;
      const bursting = pop > popAt - 0.05 && pop > 0;
      if (bursting && pop > popAt) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 6; k++) { const aa = k * PI / 3; ctx.moveTo(bx + Math.cos(aa) * br, by + Math.sin(aa) * br); ctx.lineTo(bx + Math.cos(aa) * br * 1.4, by + Math.sin(aa) * br * 1.4); } ctx.stroke(); continue; }
      ctx.fillStyle = K.rg2(ctx, bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br, [[0, '#ffffff'], [0.55, '#eef6ff'], [1, '#9cbce0']]); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
      ctx.strokeStyle = i % 3 ? 'rgba(255,170,220,.6)' : 'rgba(120,220,255,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(bx, by, br - 0.6, 0.2, 1.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(bx - br * 0.4, by - br * 0.45, br * 0.22, br * 0.12, -0.6, 0, TAU); ctx.fill();
    }
    // fizz: little bubbles jumping out of the tub as the tell
    if (fizz > 0.02) for (let k = 0; k < 8; k++) { const v = ph(t * 2.2 + k / 8, 1), x = tx - 16 + k * 4.5 + Math.sin(t * 6 + k) * 2, y = ty - 8 - v * 26; ctx.strokeStyle = `rgba(255,255,255,${0.9 * fizz * (1 - v)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, 1.5 + k % 2, 0, TAU); ctx.stroke(); }
  }

  // ---------- the twist: giant soap bubbles drifting up the shaft, each holding a coin ----------
  function bigBubbles(ctx, w, h, t) {
    for (const [o, x0, s] of [[0, 0.6, 1], [0.5, 0.35, 0.8]]) {
      const v = ph(t * 0.11 + o, 1), x = w * x0 + Math.sin(t * 1.1 + o * 6) * 14, y = h + 30 - v * (h + 60), R = 22 * s;
      K.coin(ctx, x, y, 0.55 * s, t, o * 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.rg2(ctx, x, y, R * 0.6, x, y, R, [[0, 'rgba(255,255,255,0)'], [0.85, 'rgba(180,220,255,.18)'], [1, 'rgba(255,200,240,.35)']]); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,150,210,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, R - 1, 0.3 + t, 1.6 + t); ctx.stroke();
      ctx.strokeStyle = 'rgba(110,220,255,.55)'; ctx.beginPath(); ctx.arc(x, y, R - 1, 2.2 + t, 3.4 + t); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,140,.5)'; ctx.beginPath(); ctx.arc(x, y, R - 1, 4.2 + t, 5.0 + t); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(x - R * 0.4, y - R * 0.45, R * 0.2, R * 0.1, -0.7, 0, TAU); ctx.fill();
    }
  }

  PV.sections['washhouse'] = (ctx, w, h, t) => {
    room(ctx, w, h, t);
    const L = tiles(ctx, -1, w, h, t), R = tiles(ctx, 1, w, h, t);
    bigBubbles(ctx, w, h, t);
    suds(ctx, w, h, t, L);
    iron(ctx, w, h, t, R);
    mangle(ctx, w, h, t, L);
    K.rocket(ctx, w * 0.62, h * 0.9, 0.75, t);
    K.motes(ctx, w, h, t, 'bubble', [255, 255, 255], 14, 4);
  };
})();

// ===================================================================================================
// TREEHOUSE TOWN: a village in a giant banyan at golden hour. Counterweight Lift, Bucket Wheel, Springy Branch.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const WARM = [255, 190, 100];
  const edgeOf = (side, w) => { const a = side < 0 ? 0 : 2.1; return y => { const d = 40 + Math.sin(y * 0.021 + a) * 7 + Math.sin(y * 0.063 + a * 2) * 3; return side < 0 ? d : w - d; }; };

  function canopy(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#ffe4a0', '#ffc75a', '#c8b060', '#6a9a5a', '#3d6a4a']); ctx.fillRect(0, 0, w, h);
    // sun low through the leaves, with god rays
    K.glow(ctx, w * 0.55, 60, 120, [255, 236, 170], 0.6);
    for (let k = 0; k < 5; k++) K.ray(ctx, w * 0.55, 60, -0.4 + k * 0.2 + Math.sin(t * 0.3 + k) * 0.02, 0.05, 420, [255, 230, 150], 0.16);
    // hazy far trunks and hanging aerial roots
    for (const [x, ww, a] of [[0.18, 26, 0.35], [0.5, 34, 0.28], [0.82, 22, 0.35]]) {
      ctx.fillStyle = `rgba(120,96,60,${a})`; ctx.fillRect(w * x - ww / 2, 0, ww, h);
      ctx.strokeStyle = `rgba(120,96,60,${a * 0.8})`; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k < 4; k++) { const rx = w * x - ww + k * ww * 0.6; ctx.moveTo(rx, 0); ctx.quadraticCurveTo(rx + Math.sin(t * 0.7 + k) * 4, h * 0.3, rx + 2, h * 0.5 + k * 20); } ctx.stroke();
    }
    // far leaf clusters: soft blobs in layers
    const leaves = (y0, c, n, seed, s) => { const r = K.rand(seed); ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < n; i++) { const x = r() * w, y = y0 + r() * 80, rr = (14 + r() * 18) * s; ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU); } ctx.fill(); };
    leaves(-30, 'rgba(110,150,60,.55)', 14, 2, 1.2); leaves(h * 0.5, 'rgba(70,120,70,.45)', 12, 5, 1);
    // a far deck with a lit round window, a rope bridge between far trunks
    ctx.strokeStyle = 'rgba(110,80,50,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(w * 0.18, h * 0.42); ctx.quadraticCurveTo(w * 0.34, h * 0.48, w * 0.5, h * 0.42); ctx.moveTo(w * 0.18, h * 0.4); ctx.quadraticCurveTo(w * 0.34, h * 0.46, w * 0.5, h * 0.4); ctx.stroke();
    for (let k = 1; k < 9; k++) { const v = k / 9, x = lerp(w * 0.18, w * 0.5, v), y = h * 0.42 + Math.sin(v * PI) * h * 0.03; ctx.fillStyle = 'rgba(140,100,60,.55)'; ctx.fillRect(x - 1.5, y - 1, 3, 3); }
    ctx.fillStyle = 'rgba(120,84,50,.6)'; ctx.fillRect(w * 0.72, h * 0.3, 40, 22); ctx.fillStyle = 'rgba(90,120,60,.6)'; ctx.beginPath(); ctx.moveTo(w * 0.72 - 6, h * 0.3); ctx.lineTo(w * 0.72 + 20, h * 0.3 - 16); ctx.lineTo(w * 0.72 + 46, h * 0.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,110,.85)'; ctx.beginPath(); ctx.arc(w * 0.72 + 20, h * 0.3 + 10, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(255,220,140,.1)', 'rgba(40,80,60,.15)']); ctx.fillRect(0, 0, w, h);
  }

  // a banyan trunk wall: bark fibres as long line pairs, knots, moss, with plank decks and round doors set into it
  function trunk(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.25, step: 3,
      fill: () => K.lg(ctx, X(0), 0, X(52), 0, ['#3a2614', '#6a4426', '#9a6a3e']),
      deco: () => {
        // long braided fibres running up the trunk
        for (let k = 0; k < 8; k++) {
          const d = 4 + k * 6.4;
          K.pair(ctx, () => { ctx.moveTo(X(d), -4); for (let y = 0; y <= h + 8; y += 12) ctx.lineTo(X(d + Math.sin(y * 0.03 + k * 1.3) * 3 + (ex(y) - X(40)) * side * -0.0), y); }, 'rgba(40,24,10,.55)', 'rgba(220,170,110,.35)', 1.6, 1.4);
        }
        // knots and moss
        const r = K.rand(side < 0 ? 12 : 34);
        for (let i = 0; i < 6; i++) { const y = r() * h, x = X(14 + r() * 20); ctx.fillStyle = K.rg2(ctx, x, y, 1, x, y, 7, [[0, '#2a1a0a'], [0.6, '#5a3a1e'], [1, 'rgba(120,80,40,0)']]); ctx.beginPath(); ctx.ellipse(x, y, 6, 8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(230,180,120,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 4, 6, 0, 3.6, 5); ctx.stroke(); }
        for (let i = 0; i < 9; i++) { const y = r() * h, x = X(30 + r() * 14); ctx.fillStyle = 'rgba(130,180,70,.7)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 3, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,230,120,.6)'; ctx.beginPath(); ctx.ellipse(x - 1, y - 1, 3, 1.4, 0.3, 0, TAU); ctx.fill(); }
        // a round door set into the trunk on each side
        const dy = side < 0 ? 200 : 380, dx = X(22);
        ctx.fillStyle = '#2a1a0c'; ctx.beginPath(); ctx.arc(dx, dy, 14, 0, TAU); ctx.fill();
        ctx.fillStyle = K.rg2(ctx, dx - 3, dy - 3, 1, dx, dy, 12, [[0, '#8ac0e0'], [0.2, '#5a9ac8'], [1, '#2a5a80']]); ctx.beginPath(); ctx.arc(dx, dy, 11.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(20,40,60,.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(dx + k * 4.5, dy - 11); ctx.lineTo(dx + k * 4.5, dy + 11); } ctx.stroke();
        ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.arc(dx + side * -6, dy, 1.6, 0, TAU); ctx.fill();
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(24), 0, ['rgba(20,10,4,.5)', 'rgba(20,10,4,0)']); ctx.fillRect(side < 0 ? 0 : w - 24, 0, 24, h);
      },
      lip: ['#2a1a0c', '#7a5232', '#ffd8a0'], lipW: 2.5,
    });
    return ex;
  }

  // plank decks jutting from the trunks with railings and a paper lantern each (the twist: they light up deck by deck)
  function decks(ctx, w, h, t, L, R) {
    const D = [[-1, 470, 0], [1, 236, 1], [-1, 108, 2], [1, 30, 3]];
    for (const [side, y, i] of D) {
      const ex = side < 0 ? L(y) : R(y), len = 34, x0 = ex - side * 6, x1 = ex + side * len;
      ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 7, ['#e0a868', '#a06a3a', '#5a3a1e']); ctx.fillRect(Math.min(x0, x1), y, len + 6, 7);
      ctx.fillStyle = 'rgba(60,36,16,.6)'; for (let x = Math.min(x0, x1) + 6; x < Math.max(x0, x1); x += 7) ctx.fillRect(x, y + 1, 1, 6);
      ctx.fillStyle = 'rgba(255,230,180,.7)'; ctx.fillRect(Math.min(x0, x1), y, len + 6, 0.9);
      ctx.strokeStyle = '#6a4426'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1, y - 14); ctx.lineTo(x0, y - 14); ctx.moveTo(lerp(x0, x1, 0.5), y); ctx.lineTo(lerp(x0, x1, 0.5), y - 14); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,36,16,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + side * 2, y + 7); ctx.lineTo(ex - side * 2, y + 26); ctx.stroke();
      // lantern: lights in order every few seconds as the sun sinks
      const on = smooth(0, 0.3, ph(t * 0.25 - i * 0.2, 1)) * (1 - smooth(0.85, 1, ph(t * 0.25 - i * 0.2, 1)));
      const lx = x1, ly = y - 26, sw = Math.sin(t * 1.4 + i) * 0.1;
      ctx.save(); ctx.translate(lx, ly - 8); ctx.rotate(sw); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 4); ctx.stroke();
      if (on > 0.1) K.glow(ctx, 0, 12, 28, WARM, 0.5 * on);
      ctx.fillStyle = K.rg2(ctx, -2, 9, 1, 0, 12, 9, [[0, on > 0.2 ? '#fff4c0' : '#ffd0a0'], [0.6, on > 0.2 ? '#ff9a3a' : '#e07a5a'], [1, '#b0402a']]);
      ctx.beginPath(); ctx.ellipse(0, 12, 7, 8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,60,30,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 12, 3.5, 8, 0, 0, TAU); ctx.moveTo(-7, 12); ctx.lineTo(7, 12); ctx.stroke();
      ctx.fillStyle = '#3a2614'; ctx.fillRect(-3, 3.5, 6, 1.6); ctx.fillRect(-3, 19.5, 6, 1.6);
      ctx.restore();
    }
  }

  // ---------- Counterweight Lift: a basket and a sandbag on one rope over a pulley; the brake clacks, the basket rises, the bag drops ----------
  const CL = { P: 4, o: 0.2 };
  function lift(ctx, w, h, t, L, R) {
    const u = ph(t, CL.P, CL.o), py = 64, px = w * 0.58, bxA = px - 26, bxB = px + 26;
    const clack = bump(u, 0.4, 0.5, 0.8, 0.9), go = smooth(0.9, 2.1, u) * (1 - smooth(2.9, 3.9, u));
    const basketY = lerp(250, 110, go), bagY = lerp
      (110, 250, go);
    // the beam the pulley hangs from, from trunk to trunk
    ctx.fillStyle = K.lg(ctx, 0, py - 22, 0, py - 12, ['#c89058', '#7a5232', '#4a2e18']); ctx.fillRect(L(py - 18) - 4, py - 22, R(py - 18) - L(py - 18) + 8, 9);
    ctx.fillStyle = 'rgba(255,230,180,.6)'; ctx.fillRect(L(py - 18), py - 22, R(py - 18) - L(py - 18), 1);
    // pulley wheel turning
    const ang = go * 9;
    ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = K.rg2(ctx, px - 6, py - 6, 2, px, py, 26, [[0, '#e0b078'], [0.7, '#9a6a3e'], [1, '#5a3a1e']]); ctx.beginPath(); ctx.arc(px, py, 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = ang + k * PI / 3; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 22, py + Math.sin(a) * 22); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, 24, 3.6, 5.2); ctx.stroke();
    ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
    // the rope over the top and down to both loads
    ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bxA, basketY - 20); ctx.lineTo(bxA, py); ctx.arc(px, py, 26, PI, 0); ctx.lineTo(bxB, bagY - 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,90,50,.6)'; ctx.lineWidth = 0.7; ctx.setLineDash([2, 2]); ctx.lineDashOffset = -go * 60; ctx.stroke(); ctx.setLineDash([]);
    // the basket: woven, with bands, a bunch of bananas aboard; rises when the brake goes (the ride up)
    const bx = bxA, by = basketY;
    ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by - 20); ctx.lineTo(bx - 18, by); ctx.moveTo(bx, by - 20); ctx.lineTo(bx + 18, by); ctx.stroke();
    if (go > 0.05 && go < 0.95) K.glow(ctx, bx, by + 8, 34, [150, 255, 150], 0.3);
    ctx.fillStyle = '#ffd84a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(bx - 6 + k * 5, by - 2, 2.4, 7, -0.4 + k * 0.4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = K.lg(ctx, bx - 18, 0, bx + 18, 0, ['#8a5a2a', '#e0b070', '#8a5a2a']); ctx.beginPath(); ctx.moveTo(bx - 18, by); ctx.lineTo(bx + 18, by); ctx.lineTo(bx + 14, by + 16); ctx.lineTo(bx - 14, by + 16); ctx.fill();
    K.pair(ctx, () => { for (let k = 1; k < 4; k++) { const yy = by + k * 4; ctx.moveTo(bx - 18 + k, yy); ctx.lineTo(bx + 18 - k, yy); } }, 'rgba(90,50,20,.6)', 'rgba(255,230,180,.6)', 1, 0.9);
    ctx.fillStyle = '#c89058'; ctx.fillRect(bx - 19, by - 1, 38, 2.5);
    // the sandbag: a heavy lumpy sack with a red tie, dropping
    const sx = bxB, sy = bagY;
    if (go > 0.05 && go < 0.95) K.danger(ctx, sx, sy + 10, 32, 0.3);
    ctx.fillStyle = K.rg2(ctx, sx - 5, sy + 2, 2, sx, sy + 10, 16, [[0, '#f0dca8'], [0.6, '#c8a870'], [1, '#8a6a3a']]); ctx.beginPath(); ctx.moveTo(sx - 4, sy - 6); ctx.quadraticCurveTo(sx - 16, sy + 4, sx - 13, sy + 18); ctx.quadraticCurveTo(sx, sy + 24, sx + 13, sy + 18); ctx.quadraticCurveTo(sx + 16, sy + 4, sx + 4, sy - 6); ctx.fill();
    ctx.fillStyle = '#d04a3a'; ctx.fillRect(sx - 5, sy - 6, 10, 3);
    ctx.fillStyle = 'rgba(90,60,30,.7)'; ctx.font = '800 8px system-ui'; ctx.fillText('SAND', sx - 10, sy + 13);
    // speed lines under the falling bag
    if (go > 0.1 && go < 0.9) { ctx.strokeStyle = 'rgba(255,240,200,.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(sx + k * 7, sy - 12); ctx.lineTo(sx + k * 7, sy - 26); } ctx.stroke(); }
    // the brake lever on the trunk, clacking over (the tell)
    const lx = R(py + 30) - 6, ly = py + 30, la = lerp(-0.6, 0.6, smooth(0.4, 0.8, u) * (1 - smooth(3.0, 3.6, u))) + Math.sin(t * 50) * 0.05 * clack;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(la); ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke(); ctx.fillStyle = '#d04a3a'; ctx.beginPath(); ctx.arc(0, -21, 3.4, 0, TAU); ctx.fill(); ctx.restore(); ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(232,208,160,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(lx, ly - 14); ctx.lineTo(px + 20, py + 16); ctx.stroke();
    if (clack > 0.1) { ctx.fillStyle = `rgba(80,40,10,${clack})`; ctx.font = '800 9px system-ui'; ctx.fillText('clack', lx - 34, ly - 22); }
  }

  // ---------- Bucket Wheel: a rope loop between two pulleys across the shaft, with buckets going round; slip between them ----------
  const BW = { y: 300 };
  function bucketWheel(ctx, w, h, t, L, R) {
    const y = BW.y, xa = L(y) + 16, xb = R(y) - 16, r = 14, len = xb - xa, per = 2 * len + 2 * PI * r, pos = t * 34;
    // the two pulleys, bolted to the trunks
    for (const x of [xa, xb]) {
      ctx.fillStyle = K.rg2(ctx, x - 4, y - 4, 1, x, y, r + 3, [[0, '#e0b078'], [0.7, '#9a6a3e'], [1, '#4a2e18']]); ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = pos / r + k * PI / 2; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.stroke();
      ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
    }
    // the rope loop
    ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa, y - r); ctx.lineTo(xb, y - r); ctx.arc(xb, y, r, -PI / 2, PI / 2); ctx.lineTo(xa, y + r); ctx.arc(xa, y, r, PI / 2, PI * 1.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,90,50,.7)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]); ctx.lineDashOffset = -pos; ctx.stroke(); ctx.setLineDash([]);
    // where along the loop is point s: top strand runs right, round the right pulley, bottom strand runs left
    const at = s => { s = ((s % per) + per) % per; if (s < len) return [xa + s, y - r, 0]; s -= len; if (s < PI * r) { const a = -PI / 2 + s / r; return [xb + Math.cos(a) * r, y + Math.sin(a) * r, a + PI / 2]; } s -= PI * r; if (s < len) return [xb - s, y + r, PI]; s -= len; const a = PI / 2 + s / r; return [xa + Math.cos(a) * r, y + Math.sin(a) * r, a + PI / 2]; };
    const N = 5;
    for (let i = 0; i < N; i++) {
      const [bx, by, a] = at(pos + i * per / N);
      // buckets hang from the rope (always upright below their hook), sloshing water
      const hang = by + 4;
      ctx.strokeStyle = '#6a4426'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 7, hang + 3); ctx.moveTo(bx, by); ctx.lineTo(bx + 7, hang + 3); ctx.stroke();
      K.danger(ctx, bx, hang + 10, 18, 0.18);
      ctx.fillStyle = K.lg(ctx, bx - 9, 0, bx + 9, 0, ['#4a2e18', '#b07a44', '#e0a868', '#6a4426']); ctx.beginPath(); ctx.moveTo(bx - 9, hang + 3); ctx.lineTo(bx + 9, hang + 3); ctx.lineTo(bx + 7, hang + 19); ctx.lineTo(bx - 7, hang + 19); ctx.fill();
      ctx.fillStyle = '#3a3440'; ctx.fillRect(bx - 9, hang + 6, 18, 1.6); ctx.fillRect(bx - 8, hang + 15, 16, 1.6);
      ctx.fillStyle = K.lg(ctx, 0, hang + 2, 0, hang + 5, ['#bfeaff', '#4a9ac8']); ctx.beginPath(); ctx.ellipse(bx, hang + 3.5, 8.5, 2, Math.sin(t * 4 + i) * 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(bx - 6, hang + 8, 1.2, 9);
      // drips
      const dv = ph(t * 1.5 + i * 0.3, 1); ctx.fillStyle = `rgba(160,220,255,${0.8 * (1 - dv)})`; ctx.beginPath(); ctx.arc(bx + 3, hang + 20 + dv * 16, 1.2, 0, TAU); ctx.fill();
    }
  }

  // ---------- Springy Branch: a long leafy branch over the shaft; brush it and it bends, then whips back the other way ----------
  const SB = { y: 412, P: 4, o: 2.8 };
  function branch(ctx, w, h, t, L) {
    const u = ph(t, SB.P, SB.o), ex = L(SB.y), y = SB.y;
    const load = smooth(0.6, 1.4, u) * (1 - smooth(1.4, 1.5, u)), whip = bump(u, 1.4, 1.5, 1.7, 2.6) * Math.cos((u - 1.4) * 14) * Math.exp(-(u - 1.4) * 2);
    const bend = load * 1.3 - whip * 1.7 + Math.sin(t * 1.3) * 0.03;
    const N = 8, seg = 19;
    const pts = [[ex - 4, y]]; let a = -0.12;
    for (let k = 1; k <= N; k++) { a += bend * (k / N) * 0.35; pts.push([pts[k - 1][0] + Math.cos(a) * seg, pts[k - 1][1] + Math.sin(a) * seg]); }
    if (Math.abs(whip) > 0.15) { K.glow(ctx, pts[N][0], pts[N][1], 50, [150, 220, 255], 0.3 * Math.abs(whip)); ctx.strokeStyle = `rgba(255,255,255,${0.6 * Math.abs(whip)})`; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(pts[N][0] + 6, pts[N][1] - 12 + k * 10); ctx.lineTo(pts[N][0] + 22, pts[N][1] - 16 + k * 10); } ctx.stroke(); }
    // the bough: thick at the trunk, thin at the tip
    for (let k = 1; k <= N; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], lw = lerp(9, 2.5, k / N);
      ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = lw + 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = '#9a6a3e'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 - lw * 0.3); ctx.lineTo(x1, y1 - lw * 0.3); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // leaf clusters along it, glossy green with a lit vein
    for (let k = 2; k <= N; k++) {
      const [x, yy] = pts[k];
      for (const [dx, dy, ra] of [[-2, -7, -0.6], [3, 6, 0.5], [6, -4, -0.2]]) {
        const lx = x + dx, ly = yy + dy, rr = 7 - k * 0.3;
        ctx.fillStyle = K.lg(ctx, lx - rr, ly - rr, lx + rr, ly + rr, ['#c8f080', '#8cc04a', '#3d7a3a']); ctx.beginPath(); ctx.ellipse(lx, ly, rr, rr * 0.5, ra + bend * 0.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(240,255,200,.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(lx - Math.cos(ra) * rr * 0.8, ly - Math.sin(ra) * rr * 0.8); ctx.lineTo(lx + Math.cos(ra) * rr * 0.8, ly + Math.sin(ra) * rr * 0.8); ctx.stroke();
      }
    }
    // a little gecko that rides it and holds on tight
    const [gx, gy] = pts[5];
    ctx.fillStyle = '#7ad8a0'; ctx.beginPath(); ctx.ellipse(gx, gy - 4, 6, 2.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(gx + 6, gy - 5, 2.6, 0, TAU); ctx.fill();
    K.eyes(ctx, gx + 6.5, gy - 6, 2.4, 1.3, '#ffcf3a', 1, 0);
  }

  PV.sections['treehouse'] = (ctx, w, h, t) => {
    canopy(ctx, w, h, t);
    const L = trunk(ctx, -1, w, h, t), R = trunk(ctx, 1, w, h, t);
    decks(ctx, w, h, t, L, R);
    for (const [x, y, o] of [[0.36, 160, 0], [0.5, 362, 1.4], [0.6, 190, 2.1]]) K.coin(ctx, w * x, y, 0.62, t, o);
    branch(ctx, w, h, t, L);
    bucketWheel(ctx, w, h, t, L, R);
    lift(ctx, w, h, t, L, R);
    K.rocket(ctx, w * 0.6, h * 0.9, 0.75, t);
    K.motes(ctx, w, h, t, 'pollen', [255, 230, 150], 16, 7);
  };
})();

// ===================================================================================================
// PAINT LOFT: a painter's tall attic studio under a skylight. Colour Gate, Paint Mist, Brush Stroke.
// ===================================================================================================
(() => {
  const { TAU, PI, clamp, lerp, smooth, rgb, ph, bump } = K;
  const COL = { m: [232, 80, 138], te: [46, 196, 182], ta: [255, 159, 28] };
  const SEQ = ['m', 'te', 'ta'];
  const edgeOf = (side, w) => y => { const k = Math.floor((y + (side < 0 ? 0 : 50)) / 100), d = 36 + ((k * 5 + (side < 0 ? 1 : 3)) % 3) * 6; return side < 0 ? d : w - d; };

  function studio(ctx, w, h, t) {
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['#fffaf0', '#f6eee2', '#ecdcc6', '#d8c4a8']); ctx.fillRect(0, 0, w, h);
    // the skylight: a slanted glazed frame with cloud sky, its light falling in a soft slab
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, 70, ['#9ad8f4', '#d8f2ff']); ctx.beginPath(); ctx.moveTo(w * 0.24, 6); ctx.lineTo(w * 0.76, 6); ctx.lineTo(w * 0.7, 66); ctx.lineTo(w * 0.3, 66); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(w * 0.42, 34, 9, 0, TAU); ctx.arc(w * 0.48, 30, 12, 0, TAU); ctx.arc(w * 0.55, 35, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6a50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.24, 6); ctx.lineTo(w * 0.76, 6); ctx.lineTo(w * 0.7, 66); ctx.lineTo(w * 0.3, 66); ctx.closePath(); ctx.moveTo(w * 0.5, 6); ctx.lineTo(w * 0.5, 66); ctx.moveTo(w * 0.27, 36); ctx.lineTo(w * 0.73, 36); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, 66, 0, h * 0.8, ['rgba(255,255,240,.5)', 'rgba(255,255,240,0)']); ctx.beginPath(); ctx.moveTo(w * 0.3, 66); ctx.lineTo(w * 0.7, 66); ctx.lineTo(w * 0.9, h * 0.8); ctx.lineTo(w * 0.2, h * 0.8); ctx.fill();
    // far set dressing: an easel with a half-done coconut painting, a drop sheet, a shelf of jars
    const ex = w * 0.5, ey = h * 0.62;
    ctx.strokeStyle = 'rgba(150,110,80,.5)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - 22, ey + 60); ctx.lineTo(ex, ey - 50); ctx.lineTo(ex + 22, ey + 60); ctx.moveTo(ex, ey - 50); ctx.lineTo(ex, ey + 60); ctx.stroke();
    ctx.fillStyle = 'rgba(255,252,244,.8)'; ctx.fillRect(ex - 26, ey - 38, 52, 40);
    ctx.fillStyle = 'rgba(120,200,240,.5)'; ctx.fillRect(ex - 24, ey - 36, 48, 22);
    ctx.fillStyle = 'rgba(46,196,182,.6)'; ctx.beginPath(); ctx.arc(ex + 8, ey - 18, 9, PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(140,90,50,.6)'; ctx.beginPath(); ctx.arc(ex - 6, ey - 10, 5, 0, TAU); ctx.arc(ex + 2, ey - 9, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(232,80,138,.35)'; ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.92, 60, 14, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,159,28,.35)'; ctx.beginPath(); ctx.ellipse(w * 0.7, h * 0.95, 50, 12, 0, 0, TAU); ctx.fill();
    // floating dust in the sunbeam
    for (let k = 0; k < 14; k++) { const v = ph(t * 0.05 + k * 0.07, 1), x = w * (0.3 + ((k * 37) % 40) / 100) + Math.sin(t * 0.6 + k) * 8, y = 70 + v * h * 0.7; ctx.fillStyle = 'rgba(255,240,200,.7)'; ctx.fillRect(x, y, 1.2, 1.2); }
  }

  // plaster walls with paint splatter, canvases stacked against them, shelves of tubes and brush jars
  function walls(ctx, side, w, h, t) {
    const ex = edgeOf(side, w), X = d => side < 0 ? d : w - d;
    K.wall(ctx, side, w, h, ex, {
      ao: 0.2,
      fill: () => K.lg(ctx, X(0), 0, X(52), 0, ['#b8a088', '#e8dcc8', '#fff6e8']),
      deco: () => {
        // canvases leaning in stacks: back-of-canvas frames and painted fronts
        for (let k = -1; k < 6; k++) {
          const y0 = k * 100 - (side < 0 ? 0 : 50), r = K.rand(k * 9 + (side < 0 ? 4 : 8));
          for (let j = 0; j < 3; j++) {
            const cw = 26 + r() * 14, ch = 60 + r() * 26, x0 = side < 0 ? 2 + j * 6 : w - 2 - j * 6 - cw, yy = y0 + 92 - ch + j * 3, painted = j === 2;
            if (painted) {
              const c = COL[SEQ[(k + 3) % 3]], c2 = COL[SEQ[(k + 4) % 3]];
              ctx.fillStyle = K.lg(ctx, x0, yy, x0 + cw, yy + ch, [K.lift(c, 60), c, K.lift(c2, 10)]); ctx.fillRect(x0, yy, cw, ch);
              ctx.fillStyle = rgb(K.lift(c2, 30), 0.85); ctx.beginPath(); ctx.arc(x0 + cw * 0.5, yy + ch * 0.4, cw * 0.28, 0, TAU); ctx.fill();
              ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 4, yy + ch * 0.8); ctx.quadraticCurveTo(x0 + cw / 2, yy + ch * 0.6, x0 + cw - 4, yy + ch * 0.85); ctx.stroke();
              ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 2; ctx.strokeRect(x0, yy, cw, ch);
            } else {
              ctx.fillStyle = K.lg(ctx, x0, 0, x0 + cw, 0, ['#d8c4a0', '#f4e8d0']); ctx.fillRect(x0, yy, cw, ch);
              ctx.strokeStyle = '#a07a50'; ctx.lineWidth = 3; ctx.strokeRect(x0 + 1.5, yy + 1.5, cw - 3, ch - 3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yy + ch / 2); ctx.lineTo(x0 + cw, yy + ch / 2); ctx.stroke();
            }
          }
          // a shelf with paint tubes squeezed flat and a jar of brushes
          const sy = y0 + 96;
          ctx.fillStyle = K.lg(ctx, 0, sy, 0, sy + 5, ['#c89a6a', '#7a5432']); ctx.fillRect(Math.min(X(0), X(60)), sy, 60, 5);
          for (let j = 0; j < 3; j++) { const c = COL[SEQ[(j + k + 9) % 3]], tx = X(8 + j * 9); ctx.fillStyle = K.lg(ctx, tx - 3, 0, tx + 3, 0, ['#c8c8d0', '#ffffff', '#a8a8b0']); ctx.fillRect(tx - 3, sy - 12, 6, 12); ctx.fillStyle = rgb(c); ctx.fillRect(tx - 3, sy - 8, 6, 4); ctx.fillStyle = '#5a5a68'; ctx.fillRect(tx - 1.5, sy - 14, 3, 2); }
        }
        // splatter: drips and dots in the three colours
        const r = K.rand(side < 0 ? 66 : 99);
        for (let i = 0; i < 26; i++) { const c = COL[SEQ[i % 3]], x = X(4 + r() * 46), y = r() * h, rr = 1 + r() * 3; ctx.fillStyle = rgb(c, 0.9); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); if (i % 4 === 0) { ctx.fillRect(x - 0.8, y, 1.6, 6 + r() * 10); ctx.beginPath(); ctx.arc(x, y + 8 + r() * 6, 1.4, 0, TAU); ctx.fill(); } ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - rr * 0.4, y - rr * 0.5, 0.8, 0.8); }
        ctx.fillStyle = K.lg(ctx, X(0), 0, X(20), 0, ['rgba(90,60,40,.35)', 'rgba(90,60,40,0)']); ctx.fillRect(side < 0 ? 0 : w - 20, 0, 20, h);
      },
      lip: ['#8a6a50', '#e8d8c0', '#ffffff'], lipW: 2.5,
    });
    return ex;
  }

  // ---------- Colour Gate: a wet stripe of paint across the shaft; pass only when your rocket matches; it ripples before it changes ----------
  const CG = { y: 150, P: 4, S: 4 / 3 };
  const gateCol = t => { const u = ph(t, CG.P), i = Math.floor(u / CG.S) % 3; return [SEQ[i], SEQ[(i + 1) % 3], u - i * CG.S]; };
  function gate(ctx, w, h, t, L, R, mine) {
    const [cur, next, v] = gateCol(t), y = CG.y, xa = L(y) - 4, xb = R(y) + 4;
    const rip = smooth(0.75, 0.95, v), mix = smooth(1.12, 1.3, v), c = cur, cc = rip > 0 ? COL[cur].map((q, i) => lerp(q, COL[next][i], mix)) : COL[cur];
    const open = (mix < 0.5 ? cur : next) === mine;
    // the stripe: a thick band of wet paint hanging between two batten rails, with drips and a glossy sheen
    const th = 22, wob = k => Math.sin(k * 0.12 + t * 3) * 2 + Math.sin(k * 0.3 - t * 14) * 4 * rip;
    ctx.globalAlpha = open ? 0.38 : 1;
    if (!open) K.danger(ctx, w / 2, y, 110, 0.18);
    ctx.fillStyle = K.lg(ctx, 0, y - th / 2, 0, y + th / 2, [K.lift(cc, 70), K.lift(cc, 10), cc, K.lift(cc, -50)]);
    ctx.beginPath(); ctx.moveTo(xa, y - th / 2); for (let x = xa; x <= xb; x += 6) ctx.lineTo(x, y - th / 2 + wob(x) * 0.4);
    for (let x = xb; x >= xa; x -= 6) { const d = ((x * 13) % 7 < 2) ? 6 + Math.sin(t * 2 + x) * 2 : 0; ctx.lineTo(x, y + th / 2 + wob(x) * 0.5 + d); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = xa + 6; x <= xb - 6; x += 6) { const yy = y - th / 2 + 4 + wob(x) * 0.4; x === xa + 6 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
    ctx.strokeStyle = rgb(K.lift(cc, -70), 0.5); ctx.lineWidth = 1; ctx.beginPath(); for (let x = xa + 6; x <= xb - 6; x += 6) { const yy = y + 3 + wob(x) * 0.5; x === xa + 6 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
    ctx.globalAlpha = 1;
    // when it matches: sparkles show it is open
    if (open) for (let k = 0; k < 6; k++) { const x = lerp(xa, xb, (k + 0.5) / 6), yy = y + Math.sin(t * 4 + k) * 5; K.star4(ctx, x, yy, 3, [255, 255, 255], 0.8 * (0.5 + 0.5 * Math.sin(t * 6 + k))); }
    // the battens at the walls
    for (const x of [xa, xb]) { ctx.fillStyle = K.lg(ctx, 0, y - 16, 0, y + 16, ['#e0b078', '#8a5a30']); ctx.fillRect(x - 4, y - 16, 8, 32); }
  }

  // ---------- Paint Mist: an atomiser on the wall puffs a cloud of colour; fly through to recolour your rocket ----------
  const PM = { y: 296, P: 4, o: 0.6 };
  function mist(ctx, w, h, t, R) {
    const u = ph(t, PM.P, PM.o), ex = R(PM.y), y = PM.y, squeeze = bump(u, 0.2, 0.35, 0.5, 0.7), cloud = bump(u, 0.45, 0.9, 2.6, 3.6);
    const c = COL.te;
    // the atomiser: a glass bottle with a rubber bulb and a brass nozzle
    const bx = ex - 18;
    ctx.fillStyle = '#8a6a50'; ctx.fillRect(bx - 4, y + 16, 26, 4);
    ctx.fillStyle = K.lg(ctx, bx - 10, 0, bx + 10, 0, ['rgba(180,240,236,.7)', 'rgba(255,255,255,.9)', 'rgba(120,200,200,.7)']); ctx.beginPath(); ctx.roundRect(bx - 10, y - 6, 20, 22, 8); ctx.fill();
    ctx.fillStyle = rgb(c, 0.9); ctx.beginPath(); ctx.roundRect(bx - 9, y + 4, 18, 11, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bx - 6, y - 3, 2, 14);
    ctx.fillStyle = K.lg(ctx, 0, y - 12, 0, y - 6, ['#ffe0a0', '#b08030']); ctx.fillRect(bx - 4, y - 12, 8, 6); ctx.fillRect(bx - 18, y - 11, 16, 3);
    const bs = 1 - squeeze * 0.35;
    ctx.fillStyle = K.rg2(ctx, bx + 16, y - 14, 1, bx + 18, y - 10, 9, [[0, '#ff9ab8'], [0.6, '#e8508a'], [1, '#a02a5a']]); ctx.beginPath(); ctx.ellipse(bx + 16, y - 10, 8 * bs, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a02a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 8, y - 10); ctx.lineTo(bx + 4, y - 10); ctx.stroke();
    // the cloud of colour drifting out into the shaft, soft and sparkly (a helper, so a gentle glow rather than a red halo)
    if (cloud > 0.01) {
      const cx = bx - 30 - cloud * 50, cy = y - 10;
      for (let k = 0; k < 9; k++) { const a = k * 0.7 + t * 0.5, rr = 14 + 30 * cloud * (0.4 + ((k * 3) % 5) / 6), x = cx + Math.cos(a) * rr * 0.9, yy = cy + Math.sin(a) * rr * 0.6, br = 14 + cloud * 14; ctx.fillStyle = K.rg2(ctx, x, yy, 1, x, yy, br, [[0, c, 0.42 * cloud], [1, c, 0]]); ctx.beginPath(); ctx.arc(x, yy, br, 0, TAU); ctx.fill(); }
      for (let k = 0; k < 10; k++) { const a = k * 2.4 + t, rr = 40 * cloud * ((k % 4) + 1) / 4; K.star4(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6, 2.2, [255, 255, 255], 0.8 * cloud); }
    }
  }

  // ---------- Brush Stroke: a giant brush dips in its pot, then sweeps a stroke across the shaft, leaving a wet trail that dries ----------
  const BS = { y: 384, P: 4, o: 2.0 };
  function brush(ctx, w, h, t, L, R) {
    const u = ph(t, BS.P, BS.o), y = BS.y, xa = L(y), xb = R(y);
    const dip = bump(u, 0.2, 0.5, 0.7, 1.0), sweep = smooth(1.0, 1.7, u), back = smooth(3.2, 3.9, u), dry = smooth(1.9, 3.4, u);
    const c = COL.ta;
    // the paint pot on a ledge at the left wall
    const px = xa + 18;
    ctx.fillStyle = '#8a6a50'; ctx.fillRect(xa - 4, y + 22, 40, 4);
    ctx.fillStyle = K.lg(ctx, px - 12, 0, px + 12, 0, ['#8a8a98', '#e8e8f0', '#9a9aa8']); ctx.beginPath(); ctx.roundRect(px - 12, y + 2, 24, 20, 2); ctx.fill();
    ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.ellipse(px, y + 2, 12, 3, 0, 0, TAU); ctx.fill(); ctx.fillRect(px - 12, y + 2, 4, 9);
    // the wet trail across the shaft, drying from glossy to matt and fading
    if (sweep > 0.02 && back < 0.98) {
      const tx = lerp(xa + 30, xb - 6, sweep), al = 1 - back;
      ctx.fillStyle = rgb(K.lift(c, -20 * dry), 0.9 * al); ctx.beginPath(); ctx.moveTo(xa + 30, y - 16); for (let x = xa + 30; x <= tx; x += 5) ctx.lineTo(x, y - 18 + Math.sin(x * 0.2) * 2); ctx.lineTo(tx, y + 10); for (let x = tx; x >= xa + 30; x -= 5) ctx.lineTo(x, y + 12 + Math.sin(x * 0.3) * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - dry) * al})`; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(xa + 34, y - 12 + k * 8); ctx.lineTo(tx - 4, y - 12 + k * 8 + Math.sin(k) * 2); } ctx.stroke();
      ctx.strokeStyle = rgb(K.lift(c, -60), 0.35 * al); ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(xa + 34, y - 14 + k * 7 + 3); ctx.lineTo(tx - 4, y - 14 + k * 7 + 3); } ctx.stroke();
    }
    // the brush: a long wooden handle with a brass ferrule and a fat bristle head, held from above out of frame
    const bx = sweep < 1 || back < 0.01 ? lerp(px, xb - 10, sweep) : lerp(xb - 10, px, back), by = y - 4 + dip * 10 - (back > 0.01 && back < 0.99 ? Math.sin(back * PI) * 40 : 0);
    const tilt = sweep > 0 && sweep < 1 ? -0.5 : back > 0 && back < 1 ? 0.4 : 0;
    if (sweep > 0.02 && sweep < 0.98) K.glow(ctx, bx, by, 40, [255, 200, 120], 0.35);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
    ctx.fillStyle = K.lg(ctx, -5, 0, 5, 0, ['#8a5a30', '#e0a868', '#8a5a30']); ctx.beginPath(); ctx.roundRect(-4, -130, 8, 104, 4); ctx.fill();
    ctx.fillStyle = '#d04a3a'; ctx.beginPath(); ctx.roundRect(-4.5, -130, 9, 20, 4); ctx.fill();
    ctx.fillStyle = K.lg(ctx, -10, 0, 10, 0, ['#a07a30', '#ffe6a0', '#b08a3a']); ctx.fillRect(-10, -28, 20, 12);
    ctx.fillStyle = 'rgba(90,60,20,.5)'; ctx.fillRect(-10, -22, 20, 1.2);
    ctx.fillStyle = K.lg(ctx, -11, 0, 11, 0, ['#4a3a30', '#8a7060', '#4a3a30']); ctx.beginPath(); ctx.moveTo(-11, -16); ctx.lineTo(11, -16); ctx.quadraticCurveTo(12, 4, 0, 10); ctx.quadraticCurveTo(-12, 4, -11, -16); ctx.fill();
    ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.moveTo(-11, -4); ctx.quadraticCurveTo(0, -1, 11, -4); ctx.quadraticCurveTo(12, 4, 0, 10); ctx.quadraticCurveTo(-12, 4, -11, -4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-4, 1, 2, 4, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  PV.sections['paint'] = (ctx, w, h, t) => {
    studio(ctx, w, h, t);
    const L = walls(ctx, -1, w, h, t), R = walls(ctx, 1, w, h, t);
    // the rocket has flown through the teal mist: it carries a teal tint (a ring of wet paint)
    const mine = 'te';
    for (const [x, y, o] of [[0.5, 220, 0], [0.4, 360, 1.3]]) K.coin(ctx, w * x, y, 0.62, t, o);
    brush(ctx, w, h, t, L, R);
    mist(ctx, w, h, t, R);
    gate(ctx, w, h, t, L, R, mine);
    const rx = w * 0.56, ry = h * 0.91;
    K.glow(ctx, rx, ry - 4, 30, COL[mine], 0.45);
    K.rocket(ctx, rx, ry, 0.75, t);
    ctx.fillStyle = rgb(COL[mine], 0.85); for (let k = 0; k < 3; k++) { const v = ph(t * 1.2 + k / 3, 1); ctx.beginPath(); ctx.arc(rx - 6 + k * 6, ry + 14 + v * 22, 1.8 * (1 - v), 0, TAU); ctx.fill(); }
    K.motes(ctx, w, h, t, 'dust', [255, 236, 200], 10, 2);
  };
})();

