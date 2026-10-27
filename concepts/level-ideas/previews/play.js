// Playful levels: Candy Caverns, Cheddar Caverns, Toybox Tower, Monkey Carnival.
// Glossy cartoon finish on calm hazy backgrounds; every hazard runs idle -> tell -> action -> reset from t alone.
(() => {
  const TAU = K.TAU, PI = Math.PI, sm = K.smooth, clamp = K.clamp, lerp = K.lerp, rgb = K.rgb;
  const frac = x => x - Math.floor(x);
  // a little overshoot spring (0 -> 1 with a few wobbles)
  const spring = (x, k = 5, d = 4) => x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(k * TAU * x * 0.5);
  const bump = (x, a, b, c, d) => sm(a, b, x) * (1 - sm(c, d, x));

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  // a glossy sphere lit from the top-left: 3-stop body, coloured edge, sheen and a hard glint
  function ball(ctx, x, y, r, stops, edge, sheenA = 0.5) {
    ctx.fillStyle = K.rg(ctx, x - r * 0.35, y - r * 0.4, r * 1.35, stops);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.1; ctx.stroke();
    K.sheen(ctx, x, y, r, sheenA);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.5, r * 0.16, r * 0.09, -0.7, 0, TAU); ctx.fill();
  }
  // four-point sparkle
  function twinkle(ctx, x, y, s, a, c = [255, 252, 235]) {
    if (s < 0.2 || a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgb(c, a);
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- the game's coin (glossy gold, embossed palm)
  const CP = { lit: [255, 250, 214], hi: [255, 222, 96], mid: [234, 170, 40], lo: [176, 108, 20], edge: [136, 80, 12], deep: [100, 58, 8] };
  const CROWN = [0.2, -3.0], FRONDS = [[-8.8, -1.0], [-6.6, -7.2], [0.2, -9.6], [6.8, -7.0], [9.0, -0.6]];
  function cTrunk(c) { c.beginPath(); c.moveTo(0.6, 9.8); c.quadraticCurveTo(3.0, 3.4, -0.4, -2.4); c.lineTo(1.0, -2.2); c.quadraticCurveTo(5.0, 3.4, 3.4, 9.6); c.closePath(); }
  function cFronds(c) {
    const [cx, cy] = CROWN; c.beginPath();
    for (const [ex, ey] of FRONDS) {
      const mx = (cx + ex) / 2, my = (cy + ey) / 2, L = Math.hypot(ex - cx, ey - cy), nx = (ey - cy) / L, ny = -(ex - cx) / L, w = L * 0.28 * (ny > 0 ? -1 : 1);
      c.moveTo(cx, cy); c.quadraticCurveTo(mx + nx * w, my + ny * w - 1.6, ex, ey); c.quadraticCurveTo(mx + nx * w * 0.15, my + ny * w * 0.15 + 0.6, cx, cy); c.closePath();
    }
  }
  function cNuts(c) { c.beginPath(); for (const [x, y, r] of [[-1.6, -1.6, 1.9], [1.8, -1.4, 1.85], [0.1, 0.6, 1.8]]) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } }
  function emboss(c, path, fill) {
    c.save(); c.translate(0.55, 0.6); path(c); c.fillStyle = rgb(CP.deep, 0.5); c.fill(); c.restore();
    c.save(); c.translate(-0.45, -0.5); path(c); c.fillStyle = rgb(CP.lit, 0.75); c.fill(); c.restore();
    path(c); c.fillStyle = fill; c.fill();
  }
  // coin of radius ~r (game face is 13), spinning about its vertical axis
  function coin(ctx, x, y, t, ph = 0, r = 7.5) {
    const s = r / 13, spin = Math.cos(t * 2.6 + ph), sq = Math.max(0.12, Math.abs(spin));
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2.2 + ph) * 1.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, 0, 0, r * 2.1, ['rgba(255,226,140,.38)', 'rgba(255,190,70,.13)', 'rgba(255,170,50,0)']);
    ctx.fillRect(-r * 2.1, -r * 2.1, r * 4.2, r * 4.2); ctx.restore();
    ctx.scale(s, s);
    // the edge (thickness shows as the coin turns)
    const th = (1 - sq) * 3.2 * Math.sign(spin || 1);
    ctx.fillStyle = K.lg(ctx, 0, -13, 0, 13, [CP.hi, CP.lo, CP.deep]);
    ctx.beginPath(); ctx.ellipse(th, 0, 13 * sq, 13, 0, 0, TAU); ctx.fill();
    ctx.scale(sq, 1);
    ctx.fillStyle = K.rg(ctx, -4.5, -5, 14, [[0, CP.lit], [0.35, CP.hi], [0.75, CP.mid], [1, CP.lo]]);
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(CP.edge, 0.9); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, 12.6, 0, TAU); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, 3, 3.5, 13, [[0, CP.hi], [0.55, CP.mid], [1, CP.lo]]);
    ctx.beginPath(); ctx.arc(0, 0, 10.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(CP.deep, 0.45); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, 10.5, 3.3, 5.7); ctx.stroke();
    ctx.strokeStyle = rgb(CP.lit, 0.55); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, 0, 10.5, 0.2, 2.6); ctx.stroke();
    emboss(ctx, cTrunk, K.lg(ctx, 0, -2, 4, 10, [CP.hi, CP.mid]));
    emboss(ctx, cFronds, K.rg(ctx, -2, -7, 10, [[0, CP.lit], [0.35, CP.hi], [1, CP.mid]]));
    emboss(ctx, cNuts, K.rg(ctx, -2.4, -2.6, 4.4, [[0, CP.lit], [0.4, CP.hi], [1, CP.mid]]));
    ctx.fillStyle = 'rgba(255,255,248,.95)'; ctx.beginPath(); ctx.ellipse(-7.4, -8.0, 1.5, 0.6, -0.8, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // a soft caution glow for non-lethal hazards (slow / push)
  const soft = (ctx, x, y, r, c, a = 0.3) => K.glow(ctx, x, y, r, c, a);

  // =================================================================================================== CANDY CAVERNS
  const PINK = ['#ffe0ee', '#ff8fbf', '#c9437e'], PINK_E = '#9c2c60';
  const MINT = ['#e2fff6', '#7fe0c8', '#2f9580'], MINT_E = '#237062';
  const CHOC = ['#b0703f', '#6b3a24', '#36190c'], CHOC_E = '#2c1309';

  function candyFar(ctx, w, h, t, layer, col) {
    const R = K.rand(layer ? 919 : 515), c = col;
    if (layer === 0) {
      // a frosting ceiling with long icing stalactites, cotton-candy clouds, far lollipop trees and gumdrop hills
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(w + 5, -5);
      let x = w + 5;
      while (x > -10) {
        const dw = 14 + R() * 22, len = 18 + R() * (R() < 0.3 ? 90 : 34);
        ctx.lineTo(x, 12); ctx.quadraticCurveTo(x - dw * 0.1, 12 + len * 0.7, x - dw * 0.5, 12 + len);
        ctx.quadraticCurveTo(x - dw * 0.9, 12 + len * 0.7, x - dw, 12);
        x -= dw + R() * 8;
      }
      ctx.lineTo(-5, 12); ctx.closePath(); ctx.fill();
      for (const [cx, cy, s] of [[w * 0.22, h * 0.36, 1], [w * 0.8, h * 0.5, 0.8]]) {
        ctx.fillStyle = rgb(K.lift(c, 10), 0.8);
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx + (i - 2.5) * 11 * s, cy + Math.sin(i * 2.1) * 4 * s, (10 + (i % 3) * 3) * s, 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = rgb(c);
      for (const [lx, top, r] of [[w * 0.18, h * 0.62, 26], [w * 0.62, h * 0.7, 20], [w * 0.92, h * 0.58, 30]]) {
        ctx.fillRect(lx - 2.5, top, 5, h - top);
        ctx.beginPath(); ctx.arc(lx, top, r, 0, TAU); ctx.fill();
        ctx.save(); ctx.strokeStyle = rgb(K.lift(c, 14), 0.9); ctx.lineWidth = 3; ctx.beginPath();
        for (let a = 0; a < 5.5 * PI; a += 0.3) { const rr = 2 + a / (5.5 * PI) * (r - 4); ctx.lineTo(lx + Math.cos(a + t * 0.3) * rr, top + Math.sin(a + t * 0.3) * rr); }
        ctx.stroke(); ctx.restore();
      }
      for (let i = 0; i < 5; i++) { const hx = (i + 0.3) * w / 4.4, hr = 26 + R() * 16; ctx.beginPath(); ctx.ellipse(hx, h + 6, hr, hr * 1.2, 0, PI, TAU); ctx.fill(); }
    } else {
      // two candy-cane columns hooking over, faint stripes; a curtain of icing drips
      for (const [cx, top, cw, dir] of [[w * 0.27, h * 0.28, 16, 1], [w * 0.76, h * 0.42, 18, -1]]) {
        ctx.beginPath(); ctx.moveTo(cx - cw / 2, h + 4); ctx.lineTo(cx - cw / 2, top);
        ctx.arc(cx + dir * cw * 1.1, top, cw * 1.1 + cw / 2, PI, dir > 0 ? TAU : PI, dir < 0);
        ctx.lineTo(cx + dir * cw * 2.2 + cw / 2 * (dir > 0 ? 1 : -1) * 0, top);
        ctx.lineWidth = cw; ctx.strokeStyle = rgb(c); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, h + 4); ctx.lineTo(cx, top); ctx.arc(cx + dir * cw * 1.2, top, cw * 1.2, PI, dir > 0 ? 1.85 * PI : 1.15 * PI, dir < 0); ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(cx - cw / 2, top, cw, h - top + 4); ctx.clip();
        ctx.strokeStyle = rgb(K.lift(c, 16), 0.9); ctx.lineWidth = 5;
        for (let y = top - 10; y < h + 20; y += 14) { ctx.beginPath(); ctx.moveTo(cx - cw, y + cw * 0.6); ctx.lineTo(cx + cw, y - cw * 0.6); ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  // chocolate strata walls with a strawberry and mint layer, chips, sprinkles and pressed-in sweets
  const SPRINK = ['#ff6fa8', '#7fe0c8', '#ffd84a', '#8fb4ff', '#ffffff', '#ff9a4a'];
  function candyWall(ctx, side, edge, w, h, t) {
    const x0 = side < 0 ? -4 : w * 0.82, x1 = side < 0 ? w * 0.18 : w + 4, R = K.rand(side < 0 ? 31 : 37);
    const LAYERS = [
      [CHOC[1], '#9a5f36', 30], ['#4a2414', '#7a4426', 24], ['#c9709a', '#efa6c6', 6], ['#3e1d10', '#6b3a24', 26], ['#7a4628', '#a8693e', 28], ['#e6d6c4', '#fff4e6', 4], ['#43200f', '#6e3c22', 24], ['#4fa892', '#8edcc6', 6],
    ];
    let y = -6, k = side < 0 ? 0 : 3;
    while (y < h + 10) {
      const [c0, c1, hh0] = LAYERS[k % LAYERS.length], hh = hh0 + R() * 8, ph = R() * 6;
      const top = x => y + Math.sin(x * 0.11 + ph) * 2.2, bot = x => y + hh + Math.sin(x * 0.09 + ph + 2) * 2.2;
      ctx.beginPath(); ctx.moveTo(x0, top(x0));
      for (let x = x0; x <= x1; x += 7) ctx.lineTo(x, top(x));
      for (let x = x1; x >= x0; x -= 7) ctx.lineTo(x, bot(x));
      ctx.closePath();
      ctx.fillStyle = c0; ctx.fill();
      ctx.fillStyle = c1; ctx.globalAlpha = 0.55; ctx.fillRect(x0, y + 1, x1 - x0, Math.min(4, hh * 0.3)); ctx.globalAlpha = 1;
      // lit ridge on top, dark furrow under
      ctx.strokeStyle = 'rgba(255,240,230,.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = x0; x <= x1; x += 7) x === x0 ? ctx.moveTo(x, top(x) + 0.8) : ctx.lineTo(x, top(x) + 0.8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,8,4,.45)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let x = x0; x <= x1; x += 7) x === x0 ? ctx.moveTo(x, bot(x)) : ctx.lineTo(x, bot(x));
      ctx.stroke();
      if (hh0 > 20) {
        // chocolate chips (dark nubs with a lit cap) and sprinkles
        for (let i = 0; i < 4; i++) {
          const cx = lerp(x0, x1, R()), cy = y + 6 + R() * (hh - 10);
          if (R() < 0.5) {
            ctx.fillStyle = '#4a2412'; ctx.beginPath(); ctx.moveTo(cx - 3.2, cy + 2); ctx.quadraticCurveTo(cx - 1, cy - 3.6, cx, cy - 3.6); ctx.quadraticCurveTo(cx + 1, cy - 3.6, cx + 3.2, cy + 2); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,220,190,.35)'; ctx.fillRect(cx - 1.4, cy - 2.4, 1.2, 1.2);
          } else {
            const a = R() * PI, cc = SPRINK[(R() * SPRINK.length) | 0], dx = Math.cos(a) * 2.2, dy = Math.sin(a) * 2.2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(40,10,10,.35)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy + 0.6); ctx.lineTo(cx + dx, cy + dy + 0.6); ctx.stroke();
            ctx.strokeStyle = cc; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
          }
        }
      }
      y += hh; k++;
    }
    // pressed-in sweets: peppermint swirls and gumdrops half sunk in the chocolate
    for (let i = 0; i < 5; i++) {
      const yy = 30 + i * 100 + R() * 40, ex = edge(yy), cx = ex + side * (11 + R() * 8), r = 5 + R() * 2.5;
      if (i % 2 === 0) {
        ctx.fillStyle = K.rg(ctx, cx - r * 0.3, cy0(), r * 1.3, ['#ffffff', '#f3e6ee', '#d4bccb']);
        function cy0() { return yy - r * 0.3; }
        ctx.beginPath(); ctx.arc(cx, yy, r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8394e';
        for (let j = 0; j < 6; j++) { const a = j / 6 * TAU + i; ctx.beginPath(); ctx.moveTo(cx, yy); ctx.arc(cx, yy, r * 0.92, a, a + 0.42); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = '#a8505e'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx, yy, r, 0, TAU); ctx.stroke();
        K.sheen(ctx, cx, yy, r, 0.6);
      } else {
        const gc = i % 4 === 1 ? ['#fff0b0', '#ffc93a', '#c98a14'] : ['#e8d4ff', '#a98aff', '#6a4ac9'];
        ctx.fillStyle = K.rg(ctx, cx - r * 0.3, yy - r * 0.6, r * 1.5, gc);
        ctx.beginPath(); ctx.moveTo(cx - r, yy + r * 0.6); ctx.quadraticCurveTo(cx - r, yy - r, cx, yy - r); ctx.quadraticCurveTo(cx + r, yy - r, cx + r, yy + r * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let j = 0; j < 5; j++) ctx.fillRect(cx - r * 0.7 + j * r * 0.33, yy - r * 0.4 + ((j * 7) % 5) * 1.2, 0.9, 0.9);
        K.sheen(ctx, cx, yy, r * 0.9, 0.5);
      }
    }
  }

  // the inner edge: a twisted candy-cane rope with icing drips spilling over it into the shaft
  function candyEdge(ctx, side, ex, w, h, t) {
    const pts = []; for (let y = -6; y <= h + 6; y += 4) pts.push([ex(y) + side * 1.5, y]);
    const line = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    line(); ctx.strokeStyle = '#a3263c'; ctx.lineWidth = 8.4; ctx.stroke();
    line(); ctx.strokeStyle = '#fbf2f0'; ctx.lineWidth = 6.6; ctx.stroke();
    // the red twist stripes
    ctx.strokeStyle = '#e8394e'; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i < pts.length - 1; i += 2) { const [x, y] = pts[i]; ctx.moveTo(x - 3.2, y + 2.6); ctx.lineTo(x + 3.2, y - 2.6); }
    ctx.stroke();
    // cylinder shading: dark on the far side, a lit stripe toward the light
    ctx.save(); ctx.translate(side * 2, 0); line(); ctx.strokeStyle = 'rgba(120,20,40,.3)'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(-side * 1.6, 0); line(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.1; ctx.stroke(); ctx.restore();
    ctx.restore();
    // pink icing drips hanging over the rope into the shaft
    const R = K.rand(side < 0 ? 71 : 79);
    for (let y = 14; y < h; y += 30 + R() * 34) {
      const x = ex(y), len = 9 + R() * 13, dw = 3.2 + R() * 1.8, sway = Math.sin(t * 1.4 + y) * 0.5, ix = x - side * 2.5;
      const bx = ix - side * dw * 0.6 + sway, by = y + len;
      ctx.fillStyle = K.lg(ctx, ix, y - 4, ix, by + dw, ['#ffe4f0', '#ff9cc4', '#d95d93']);
      ctx.beginPath(); ctx.moveTo(ix + side * 4, y - 6);
      ctx.quadraticCurveTo(ix - side * dw * 1.6, y - 4, bx - side * dw * 0.9, by - dw * 0.4);
      ctx.arc(bx, by, dw, side < 0 ? 0 : PI, side < 0 ? PI : TAU, side > 0);
      ctx.quadraticCurveTo(bx + side * dw * 1.2, y + len * 0.4, ix + side * 4, y + 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(170,50,100,.75)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(bx - dw * 0.3, by - dw * 0.3, 0.9, 1.6, 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix - side * 1, y - 3); ctx.quadraticCurveTo(ix - side * dw, y, bx - side * dw * 0.5, by - dw); ctx.stroke();
      for (let j = 0; j < 2; j++) { ctx.fillStyle = SPRINK[(R() * 6) | 0]; ctx.save(); ctx.translate(ix - side * (1 + R() * 3), y - 2 + R() * 4); ctx.rotate(R() * PI); ctx.fillRect(-1.4, -0.55, 2.8, 1.1); ctx.restore(); }
    }
    // coloured light spilling off the edge, pink above shifting to mint below
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let y = 0; y < h; y += 60) {
      const c = K.mix([255, 150, 200], [130, 240, 210], (Math.sin(y * 0.012 + side) + 1) / 2);
      ctx.fillStyle = K.rg(ctx, ex(y + 30) - side * 4, y + 30, 34, [rgb(c, 0.2), rgb(c, 0)]);
      ctx.fillRect(ex(y + 30) - side * 4 - 34, y - 4, 68, 68);
    }
    ctx.restore();
  }

  // Jawbreaker: a striped candy ball with a scowl, spinning meridian stripes, bouncing wall to wall down the shaft
  const JAW = ['#ff6fa8', '#fff4f8', '#5fd3b8', '#fff4f8', '#ffc93a', '#fff4f8', '#9a7aff', '#fff4f8', '#ff6fa8', '#fff4f8', '#5fd3b8', '#fff4f8', '#ffc93a', '#fff4f8', '#9a7aff', '#fff4f8'];
  function jawbreaker(ctx, x, y, r, spin, sqx, look, t) {
    K.danger(ctx, x, y, r * 2.3, 0.34);
    ctx.save(); ctx.translate(x, y); ctx.scale(sqx, 1 / sqx);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.rotate(0.45);
    ctx.fillStyle = '#fff4f8'; ctx.fillRect(-r, -r, r * 2, r * 2);
    const N = JAW.length, step = PI / 7;
    for (let i = -N; i < N; i++) {
      if ((((i % 2) + 2) % 2) === 1) continue;
      let p1 = i * step + frac(spin) * step * 2, p2 = p1 + step;
      p1 = clamp(p1, -PI / 2, PI / 2); p2 = clamp(p2, -PI / 2, PI / 2); if (p2 - p1 < 0.01) continue;
      ctx.beginPath();
      for (let a = -PI / 2; a <= PI / 2 + 0.01; a += PI / 12) ctx.lineTo(r * Math.cos(a) * Math.sin(p1), r * Math.sin(a));
      for (let a = PI / 2; a >= -PI / 2 - 0.01; a -= PI / 12) ctx.lineTo(r * Math.cos(a) * Math.sin(p2), r * Math.sin(a));
      ctx.closePath(); ctx.fillStyle = JAW[(((i + Math.floor(spin) * 2) % N) + N) % N]; ctx.fill();
    }
    ctx.rotate(-0.45);
    // sphere shading over the stripes, bounce light from below
    ctx.fillStyle = K.rg(ctx, -r * 0.4, -r * 0.45, r * 1.6, ['rgba(255,255,255,.35)', 'rgba(255,255,255,0)', 'rgba(110,20,70,.5)']);
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = PINK_E; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,220,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, r - 1.6, 0.3, 1.6); ctx.stroke();
    K.sheen(ctx, 0, 0, r, 0.6);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.52, r * 0.18, r * 0.1, -0.7, 0, TAU); ctx.fill();
    ctx.restore();
    // a scowl that stays upright while the stripes spin under it
    K.eyes(ctx, x + look * 2, y - r * 0.12, r * 0.3, r * 0.22, '#e8394e', look, 0.8);
    ctx.strokeStyle = PINK_E; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.fillStyle = '#7a1838';
    ctx.beginPath(); ctx.moveTo(x - r * 0.3 + look * 2, y + r * 0.34); ctx.quadraticCurveTo(x + look * 2, y + r * 0.56, x + r * 0.3 + look * 2, y + r * 0.34); ctx.quadraticCurveTo(x + look * 2, y + r * 0.42, x - r * 0.3 + look * 2, y + r * 0.34); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.16 + look * 2, y + r * 0.36, r * 0.12, r * 0.09); ctx.fillRect(x + r * 0.05 + look * 2, y + r * 0.36, r * 0.12, r * 0.09);
  }
  // where the jawbreaker is at time t (loop 4 s): enters from the top at 0.8 s, zigzags down, gone by 3.1 s
  function jawPos(t, w, h, L, R, r) {
    const u = (t - 0.8) / 2.3;
    const y = -r - 6 + u * (h + 2 * r + 12);
    const xl = L + r + 6, xr = R - r - 6, tri = frac(u * 2.6 + 0.3), k = tri < 0.5 ? tri * 2 : 2 - tri * 2;
    return { x: lerp(xl, xr, k), y, u, k, tri };
  }

  // Gumdrop Bounce: a sugar-crusted gumdrop on the wall (local +x points into the shaft)
  function gumdrop(ctx, x, y, side, base, cols, edgeC, t, ph) {
    const c = frac((t + ph) / 3) * 3; // 0..3
    // idle wobble 0-1.3, tell squash 1.3-1.9, boing 1.9-2.4 overshoot then settle
    const tell = sm(1.25, 1.85, c) * (1 - sm(1.9, 1.96, c));
    const boing = c > 1.92 ? spring((c - 1.92) / 1.08, 5, 4.2) : 0;
    let p = base * (0.95 + 0.04 * Math.sin(t * 5 + ph));
    p *= 1 - 0.42 * tell;
    if (c > 1.92) p = base * lerp(0.55, 1, boing) + base * 1.15 * Math.max(0, Math.sin(clamp((c - 1.92) / 0.3, 0, 1) * PI)) ;
    const b = 18 * (1 + 0.22 * tell) * (c > 1.92 ? lerp(0.8, 1, boing) : 1) + Math.sin(t * 22) * 0.6 * tell;
    // push rings rolling out when it fires
    if (c > 1.92 && c < 2.6) {
      const u = (c - 1.92) / 0.68;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) {
        const uu = u - j * 0.14; if (uu <= 0 || uu > 1) continue;
        ctx.strokeStyle = rgb(K.lift([255, 255, 255], 0), (1 - uu) * 0.7); ctx.lineWidth = 2.2 - uu;
        ctx.beginPath(); ctx.arc(x - side * 6, y, 20 + uu * 52, side < 0 ? -0.6 : PI - 0.6, side < 0 ? 0.6 : PI + 0.6); ctx.stroke();
      }
      ctx.restore();
    }
    soft(ctx, x - side * p * 0.5, y, 34 + p * 0.6, cols[3] || [255, 200, 120], 0.22 + 0.2 * tell);
    ctx.save(); ctx.translate(x, y); ctx.scale(-side, 1);
    const dome = () => { ctx.beginPath(); ctx.moveTo(-3, -b); ctx.bezierCurveTo(p * 0.55, -b * 1.02, p * 1.02, -b * 0.55, p, 0); ctx.bezierCurveTo(p * 1.02, b * 0.55, p * 0.55, b * 1.02, -3, b); ctx.closePath(); };
    // contact shadow on the wall
    K.shadow(ctx, 2, 0, 6, b * 1.1, 0.4);
    dome(); ctx.fillStyle = K.rg(ctx, p * 0.3, -b * 0.42, Math.max(p, b) * 1.35, cols.slice(0, 3)); ctx.fill();
    ctx.save(); dome(); ctx.clip();
    // translucent core glow and sugar crystals
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, p * 0.5, b * 0.15, b * 0.8, ['rgba(255,255,230,.25)', 'rgba(255,255,230,0)']); ctx.fillRect(-4, -b, p + 6, b * 2);
    ctx.globalCompositeOperation = 'source-over';
    const R = K.rand(41 + (ph * 10 | 0));
    for (let i = 0; i < 26; i++) { const u = R(), v = R() * 2 - 1, px = u * p * 0.95, py = v * b * Math.sqrt(1 - u * u * 0.8); ctx.fillStyle = `rgba(255,255,255,${0.35 + R() * 0.5})`; ctx.fillRect(px, py, 1.1, 1.1); }
    ctx.fillStyle = 'rgba(40,10,30,.18)'; ctx.beginPath(); ctx.ellipse(p * 0.3, b * 0.9, p * 0.9, b * 0.35, 0, 0, TAU); ctx.fill();
    ctx.restore();
    dome(); ctx.strokeStyle = edgeC; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p * 0.15, -b * 0.78); ctx.quadraticCurveTo(p * 0.62, -b * 0.7, p * 0.82, -b * 0.3); ctx.stroke();
    ctx.restore();
    // eyes: shut tight through the squash, wide on the boing
    const ex = x - side * p * 0.55, ey = y - b * 0.12;
    if (tell > 0.4 && c < 1.92) {
      ctx.strokeStyle = edgeC; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex + d * 4.6 - 2, ey - 1.5); ctx.lineTo(ex + d * 4.6 + 2 * d * -1 + d * 2, ey); ctx.lineTo(ex + d * 4.6 - 2, ey + 1.5); ctx.stroke(); }
    } else K.eyes(ctx, ex, ey, 4.4, 2.9 + 0.6 * Math.max(0, boing > 0 && c < 2.4 ? 1 : 0), '#6a3a1a', -side * 0.5);
    // a little mouth
    ctx.strokeStyle = edgeC; ctx.lineWidth = 1.1; ctx.beginPath();
    if (c > 1.92 && c < 2.4) { ctx.fillStyle = '#7a2440'; ctx.ellipse(ex, ey + 6.5, 2.4, 2.8, 0, 0, TAU); ctx.fill(); }
    else { ctx.arc(ex, ey + 4.5, 2.2, 0.3, PI - 0.3); ctx.stroke(); }
  }

  // Chocolate fountain (loop 4 s): a wafer ledge pools melted chocolate; it bubbles and bulges, then pours in two
  // pulses into a cupcake-liner bowl below (splash, ripples), thinning to drips between and after
  function chocFountain(ctx, side, wallX, y, len, t, h) {
    const c = frac(t / 4) * 4, tipX = wallX - side * len;
    const PULSES = [[1.75, 2.4], [2.7, 3.25]];
    const tell = sm(1.0, 1.7, c) * (1 - sm(1.8, 1.9, c)), pourOn = c > 1.75 && c < 3.3;
    const lipX = tipX + side * 5, lipY = y + 4, drop = 104, bowlY = lipY + drop;
    const sx = dy => lipX - side * 11 * (1 - Math.exp(-dy / 18));
    const fall = tau => 150 * tau + 480 * tau * tau;
    const bx = sx(drop);
    let hitting = 0;
    soft(ctx, bx, bowlY - 40, 56, [210, 130, 70], 0.12 + 0.14 * (pourOn ? 1 : 0));
    for (const [ps, pe] of PULSES) {
      if (c < ps) continue;
      const head = Math.min(drop, fall(c - ps)), tail = c > pe ? fall(c - pe) : 0;
      if (tail >= drop) continue;
      if (head >= drop && tail < drop) hitting = Math.max(hitting, 1 - sm(pe - 0.1, pe + 0.2, c));
      const thin = lerp(1, 0.45, sm(pe - 0.3, pe, c)) * lerp(0.6, 1, sm(ps, ps + 0.15, c));
      const y0 = lipY + tail, y1 = lipY + head;
      const wid = dy => (6.5 + 5 * Math.exp(-dy / 22)) * thin * (1 - 0.22 * dy / drop) * (1 + 0.08 * Math.sin(dy * 0.2 - t * 13));
      const eL = yy => sx(yy - lipY) - wid(yy - lipY), eR = yy => sx(yy - lipY) + wid(yy - lipY);
      const path = (k0, k1) => { ctx.beginPath(); for (let yy = y0; yy <= y1; yy += 3) ctx.lineTo(lerp(eL(yy), eR(yy), k0), yy); ctx.lineTo(lerp(eL(y1), eR(y1), k0), y1); for (let yy = y1; yy >= y0; yy -= 3) ctx.lineTo(lerp(eL(yy), eR(yy), k1), yy); ctx.closePath(); };
      if (y1 - y0 > 1) {
        path(0, 1); ctx.fillStyle = K.lg(ctx, bx - 8, 0, bx + 8, 0, ['#6a3418', '#b06c40', '#86492a', '#4a220e']); ctx.fill();
        ctx.strokeStyle = '#2e1308'; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.save(); ctx.clip();
        path(0.14, 0.44); ctx.fillStyle = 'rgba(222,160,112,.55)'; ctx.fill();
        ctx.lineCap = 'round'; ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(255,238,218,.9)';
        ctx.beginPath(); for (let yy = y0 + 2; yy <= y1; yy += 3) ctx.lineTo(lerp(eL(yy), eR(yy), 0.27), yy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,150,200,.5)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); for (let yy = y0 + 2; yy <= y1; yy += 3) ctx.lineTo(lerp(eL(yy), eR(yy), 0.88), yy); ctx.stroke();
        for (let k = 0; k < 4; k++) { const yy = lipY + frac(t * 2.4 + k / 4) * drop; if (yy < y0 + 4 || yy > y1 - 4) continue; ctx.fillStyle = 'rgba(255,240,220,.75)'; ctx.beginPath(); ctx.ellipse(lerp(eL(yy), eR(yy), 0.3), yy, 1.1, 4, 0, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      // the leading gob and the trailing drop
      if (head < drop) ball(ctx, sx(head), y1 + 1, wid(head) * 1.25, ['#c8946a', '#7a4426', '#2e1408'], '#2a1208', 0.45);
      if (tail > 0) { const dy = tail; ctx.fillStyle = K.rg(ctx, sx(dy) - 1, y0 - 2, 5, ['#c8946a', '#5a2e16']); ctx.beginPath(); ctx.moveTo(sx(dy), y0 - 7); ctx.quadraticCurveTo(sx(dy) + 3.4, y0, sx(dy), y0 + 3); ctx.quadraticCurveTo(sx(dy) - 3.4, y0, sx(dy), y0 - 7); ctx.fill(); }
    }
    // drips from the lip before and between/after the pulses
    if (!pourOn || (c > 2.45 && c < 2.65)) for (let j = 0; j < 2; j++) {
      const u = frac(c * 1.1 + j * 0.5), dy = fall(u * 0.5) * 0.85; if (dy > drop) continue;
      ctx.fillStyle = K.rg(ctx, sx(dy) - 1, lipY + dy - 1, 4, ['#c08a5a', '#4a2412']);
      ctx.beginPath(); ctx.moveTo(sx(dy), lipY + dy - 4 - u * 3); ctx.quadraticCurveTo(sx(dy) + 2.6, lipY + dy, sx(dy), lipY + dy + 2.4); ctx.quadraticCurveTo(sx(dy) - 2.6, lipY + dy, sx(dy), lipY + dy - 4 - u * 3); ctx.fill();
    }
    // the catch bowl: a pleated cupcake liner on a candy-cane bracket
    const bw = 34, bh = 15, by = bowlY + 1;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#a3263c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(wallX + side * 4, by + 20); ctx.quadraticCurveTo(bx + side * 6, by + 18, bx, by + bh - 1); ctx.stroke();
    ctx.strokeStyle = '#fbf2f0'; ctx.lineWidth = 4.4; ctx.stroke();
    ctx.setLineDash([2.4, 3]); ctx.strokeStyle = '#e8394e'; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    K.shadow(ctx, bx, by + bh + 3, bw * 0.5, 4, 0.35);
    const cup = () => { ctx.beginPath(); ctx.moveTo(bx - bw / 2, by); ctx.lineTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2 - 5, by + bh); ctx.quadraticCurveTo(bx, by + bh + 2, bx - bw / 2 + 5, by + bh); ctx.closePath(); };
    cup(); ctx.fillStyle = K.lg(ctx, bx - bw / 2, 0, bx + bw / 2, 0, ['#ffd6e6', '#ff9cc4', '#e46d9f', '#b8467a']); ctx.fill();
    ctx.save(); cup(); ctx.clip();
    for (let k = -6; k <= 6; k++) { const x0 = bx + k * 2.8; ctx.strokeStyle = k % 2 ? 'rgba(150,40,90,.45)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x0 - k * 0.42, by + bh + 2); ctx.stroke(); }
    ctx.restore();
    cup(); ctx.strokeStyle = '#9c2c60'; ctx.lineWidth = 0.9; ctx.stroke();
    // the chocolate in it, rippling where the pour lands
    const lvl = 1.5 + 1.2 * sm(1.8, 3.3, c) * (1 - sm(3.5, 4, c));
    ctx.fillStyle = K.lg(ctx, 0, by - 4, 0, by + 3, ['#b07848', '#6b3a24', '#3a1a0c']);
    ctx.beginPath(); ctx.ellipse(bx, by - lvl + 1, bw / 2 + 0.5, 4.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1208'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,180,.5)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(bx - 3, by - lvl, bw / 2 - 6, 2.4, 0, PI * 1.1, PI * 1.7); ctx.stroke();
    // the rim of the liner over it
    ctx.strokeStyle = '#ffe4f0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(bx, by, bw / 2, 4.4, 0, 0.05, PI - 0.05); ctx.stroke();
    if (hitting > 0.05) {
      for (let k = 0; k < 2; k++) { const u = frac(t * 2.2 + k * 0.5); ctx.strokeStyle = `rgba(230,180,140,${0.7 * (1 - u) * hitting})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(bx, by - lvl + 1, 4 + u * 12, 1.2 + u * 2.6, 0, 0, TAU); ctx.stroke(); }
      // a crown of splashes
      for (let j = 0; j < 7; j++) {
        const u = frac(c * 2.6 + j / 7), dir = j % 2 ? 1 : -1, sp = 4 + (j % 3) * 4;
        const dx = dir * (3 + u * sp), dy = -Math.sin(u * PI) * (8 + (j % 3) * 4);
        ctx.fillStyle = K.rg(ctx, bx + dx - 0.6, by - lvl + dy - 0.6, 2.4, ['#c8946a', '#5a2e16']); ctx.beginPath(); ctx.arc(bx + dx, by - lvl + dy, 1.8 * (1 - u * 0.5) * hitting, 0, TAU); ctx.fill();
      }
    }
    // the wafer ledge: cream-and-biscuit layers with a waffle grid, chocolate pooled on top
    const lx = Math.min(wallX, tipX) - 2, lw = len + 4;
    K.shadow(ctx, (wallX + tipX) / 2, y + 16, len * 0.6, 6, 0.4);
    for (const [yy, hh, cc] of [[y + 2, 4, ['#f6d79a', '#d9a55a']], [y + 6, 2.2, ['#fff4e2', '#f0dcc0']], [y + 8.2, 4, ['#f2cc88', '#c88d44']], [y + 12.2, 2.2, ['#fff4e2', '#f0dcc0']], [y + 14.4, 4, ['#e8bd76', '#b67a36']]]) {
      ctx.fillStyle = K.lg(ctx, 0, yy, 0, yy + hh, cc); ctx.fillRect(lx, yy, lw, hh);
    }
    ctx.strokeStyle = 'rgba(150,90,40,.5)'; ctx.lineWidth = 0.6;
    for (let x = lx + 4; x < lx + lw; x += 5) { ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y + 6); ctx.moveTo(x + 2.5, y + 8.2); ctx.lineTo(x + 2.5, y + 12.2); ctx.moveTo(x, y + 14.4); ctx.lineTo(x, y + 18.4); ctx.stroke(); }
    ctx.strokeStyle = '#9a6228'; ctx.lineWidth = 1; ctx.strokeRect(lx, y + 2, lw, 16.4);
    // the chocolate pool and coating, bulging over the lip through the tell
    const bulge = tell * 6 + (pourOn ? 3 : 0);
    ctx.beginPath(); ctx.moveTo(wallX + side * 4, y + 4);
    ctx.lineTo(wallX + side * 4, y - 4 - bulge * 0.3);
    ctx.quadraticCurveTo((wallX + tipX) / 2, y - 7 - bulge * 0.5, tipX + side * 6, y - 4 - bulge * 0.4);
    ctx.quadraticCurveTo(tipX - side * (2 + bulge), y - 3, tipX - side * (1 + bulge * 0.6), y + 6 + bulge);
    ctx.quadraticCurveTo(tipX, y + 10 + bulge * 0.8, tipX + side * 4, y + 6);
    for (let k = 1; k <= 4; k++) { const xx = lerp(tipX, wallX, k / 5), dd = 3 + ((k * 7) % 5) * 1.4 + Math.sin(t * 2 + k) * 0.8; ctx.quadraticCurveTo(xx + side * 2, y + 4, xx + side * 3, y + 4 + dd); ctx.quadraticCurveTo(xx + side * 4.5, y + 4 + dd + 2, xx + side * 6, y + 4); }
    ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y - 8, 0, y + 12, ['#b07848', '#6b3a24', '#3a1a0c']); ctx.fill();
    ctx.strokeStyle = '#2a1208'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,180,.55)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(wallX - side * 6, y - 4.5 - bulge * 0.3); ctx.quadraticCurveTo((wallX + tipX) / 2, y - 6.5 - bulge * 0.5, tipX + side * 8, y - 4.6 - bulge * 0.4); ctx.stroke();
    // bubbles popping on the pool through the tell
    for (let j = 0; j < 3; j++) {
      const u = frac(t * 1.6 + j * 0.37), bx = lerp(wallX, tipX, 0.25 + j * 0.22), r = (1.2 + u * 2.4) * (0.3 + tell + (pourOn ? 0.4 : 0));
      if (r < 0.5) continue;
      ctx.strokeStyle = `rgba(230,180,130,${0.8 * (1 - u)})`; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(bx, y - 5 - bulge * 0.4 - r * 0.4, r, PI, TAU); ctx.stroke();
    }
    // the 'heavy' tag: a warm caramel glow (slows, does not hurt)
    soft(ctx, tipX, y, 26 + tell * 10, [255, 170, 90], 0.18 + tell * 0.22);
  }

  // Lollipop swirl (the twist): spins on its stick in the wall and flings coins out
  function lollipop(ctx, side, wallX, y, t) {
    const r = 17, cx = wallX - side * 30, spin = t * 3.2;
    // the stick into the wall
    ctx.fillStyle = K.lg(ctx, 0, y - 2.5, 0, y + 2.5, ['#ffffff', '#e8e0d8', '#b8aca0']); ctx.fillRect(Math.min(wallX + side * 4, cx), y - 2.5, Math.abs(cx - wallX) + 4, 5);
    ctx.strokeStyle = '#9a8e84'; ctx.lineWidth = 0.7; ctx.strokeRect(Math.min(wallX + side * 4, cx), y - 2.5, Math.abs(cx - wallX) + 4, 5);
    soft(ctx, cx, y, r * 2.2, [255, 200, 120], 0.25);
    ctx.save(); ctx.translate(cx, y);
    ctx.fillStyle = K.rg(ctx, -5, -6, r * 1.4, ['#fff8fb', '#ffe2ee', '#e9b6cc']); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, TAU); ctx.clip(); ctx.rotate(spin);
    for (const [col, off, lw] of [['#ff5a96', 0, 4.4], ['#5fd3b8', PI, 3.4], ['#ffd84a', PI / 2, 1.6]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
      for (let a = 0; a < 4.4 * PI; a += 0.25) { const rr = 1 + a / (4.4 * PI) * (r + 1); ctx.lineTo(Math.cos(a + off) * rr, Math.sin(a + off) * rr); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = K.rg(ctx, -r * 0.4, -r * 0.45, r * 1.5, ['rgba(255,255,255,.3)', 'rgba(255,255,255,0)', 'rgba(120,30,70,.4)']); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = PINK_E; ctx.lineWidth = 1.1; ctx.stroke();
    K.sheen(ctx, 0, 0, r, 0.65);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.5, 3, 1.6, -0.7, 0, TAU); ctx.fill();
    // a cellophane wrap twisted at the stick
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r + 2.2, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(cx + side * (r + 1), y); ctx.lineTo(cx + side * (r + 8), y - 6); ctx.lineTo(cx + side * (r + 9), y + 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff8fbf'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + side * (r + 3), y - 3); ctx.lineTo(cx + side * (r + 3), y + 3); ctx.stroke();
    // flung coins: every 2 s one leaves the rim and arcs across the shaft
    for (let k = 0; k < 2; k++) {
      const u = frac(t / 2 + k * 0.5);
      if (u > 0.75) continue;
      const tt = u * 1.6, x = cx - side * (r + tt * 95), yy = y - r * 0.6 - 70 * tt + 120 * tt * tt;
      if (u < 0.05) twinkle(ctx, cx - side * r, y - r * 0.6, 6, 1);
      coin(ctx, x, yy, t * 3, k * 2, 6.5);
    }
  }


  const CANDY = {
    bgTop: [158, 108, 146], bgBot: [76, 46, 86], far: [144, 98, 136], far2: [128, 86, 122],
    wall: [92, 52, 34], wallIn: [44, 22, 14], rim: [255, 170, 210], seed: 3, inset: 30, farShape: candyFar, wallDeco: candyWall,
  };

  PV.sections['candy'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, CANDY);
    candyEdge(ctx, -1, S.L, w, h, t); candyEdge(ctx, 1, S.R, w, h, t);
    // twist: a lollipop swirl high on the left flinging coins
    lollipop(ctx, -1, S.L(84), 84, t);
    // coins
    for (const [x, y, ph] of [[w * 0.58, 150, 0], [w * 0.58, 172, 0.7], [w * 0.42, 262, 1.4], [w * 0.42, 284, 2.1], [w * 0.42, 306, 2.8]]) coin(ctx, x, y, t, ph);
    // gumdrops: green high on the right, orange low on the left (staggered)
    gumdrop(ctx, S.R(122), 122, 1, 24, ['#eaffd0', '#7fd34a', '#3a8a1e', [150, 240, 110]], '#2c6a16', t, 0);
    gumdrop(ctx, S.L(340), 340, -1, 24, ['#ffe6c0', '#ff9a3a', '#c4500e', [255, 170, 90]], '#94400c', t, 1.5);
    // chocolate fountain off a wafer ledge on the right
    chocFountain(ctx, 1, S.R(212), 212, 66, t + 0.6, h);
    // jawbreaker bouncing down
    const r = 19, c = frac(t / 4) * 4, P = jawPos(c, w, h, S.L(200), S.R(200), r);
    // tell: a red pulse at the top where it will drop in
    if (c > 0.15 && c < 0.95) {
      const a = sm(0.15, 0.4, c) * (0.55 + 0.45 * Math.sin(c * 26));
      const p0 = jawPos(0.8, w, h, S.L(0), S.R(0), r);
      K.danger(ctx, p0.x, 0, 46, 0.4 * a);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ff4a5a'; ctx.strokeStyle = '#ffd0d4'; ctx.lineWidth = 1;
      for (const dy of [6, 14]) { ctx.beginPath(); ctx.moveTo(p0.x - 7, dy); ctx.lineTo(p0.x, dy + 6); ctx.lineTo(p0.x + 7, dy); ctx.lineTo(p0.x + 7, dy + 3); ctx.lineTo(p0.x, dy + 9); ctx.lineTo(p0.x - 7, dy + 3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    // the rocket dodges as it passes
    const ry = h * 0.8, tPass = 0.8 + 2.3 * ((ry + r + 6) / (h + 2 * r + 12));
    const pPass = jawPos(tPass, w, h, S.L(200), S.R(200), r), away = pPass.x > w / 2 ? -1 : 1;
    const dodge = away * 30 * bump(c, tPass - 0.7, tPass - 0.25, tPass + 0.25, tPass + 0.7);
    if (P.u > 0 && P.u < 1) {
      // speed streaks behind it
      const Pb = jawPos(c - 0.06, w, h, S.L(200), S.R(200), r);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,170,210,.35)'; ctx.lineCap = 'round';
      for (const o of [-0.6, 0, 0.6]) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Pb.x + o * r, Pb.y - 8); ctx.lineTo(P.x + o * r * 0.8, P.y - r * 0.9); ctx.stroke(); }
      ctx.restore();
      const nearWall = Math.min(P.k, 1 - P.k), sq = 1 - 0.12 * (1 - sm(0, 0.035, nearWall));
      // sugar shards where it smacks the wall
      if (nearWall < 0.1) {
        const wx = P.k < 0.5 ? S.L(P.y) : S.R(P.y), d = P.k < 0.5 ? 1 : -1;
        for (let j = 0; j < 5; j++) { const a = (j - 2) * 0.5; twinkle(ctx, wx + d * (6 + (0.1 - nearWall) * 120 * Math.cos(a)), P.y + (0.1 - nearWall) * 120 * Math.sin(a), 3, 1 - nearWall * 8, [255, 220, 240]); }
      }
      jawbreaker(ctx, P.x, P.y, r, c * 2.2, sq, P.tri < 0.5 ? 1 : -1, t);
    }
    K.rocket(ctx, w * 0.5 + dodge, ry, 0.75, t);
    // falling sprinkles
    const R = K.rand(9);
    for (let i = 0; i < 16; i++) {
      const x = R() * w, y = (R() * h + t * (14 + R() * 10)) % h, a = t * (1 + R()) + i;
      ctx.save(); ctx.translate(x + Math.sin(t + i) * 4, y); ctx.rotate(a); ctx.fillStyle = SPRINK[i % 6]; ctx.globalAlpha = 0.7; rrect(ctx, -2, -0.7, 4, 1.4, 0.7); ctx.fill(); ctx.restore();
    }
  };
  // ================================================================================================= CHEDDAR CAVERNS
  const CHED = ['#ffe9a0', '#f2b836', '#b8741a'], CHED_E = '#8a5212';
  const WOOD = ['#d9a066', '#a8641e', '#6b3a14'], WOOD_E = '#4e2a0e';

  // the far cave: soft, desaturated cheese cliffs stepping back in value through violet haze
  function cheeseFar(ctx, w, h, t, layer, col) {
    const R = K.rand(layer ? 733 : 377), dk = rgb(K.lift(col, -16)), lt = rgb(K.lift(col, 14)), lt2 = rgb(K.lift(col, 24));
    // a slab of cheese: front face, a lighter top facet, holes in the face
    const slab = (x0, x1, top, slope, holes) => {
      ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(x0, h + 5); ctx.lineTo(x0, top); ctx.lineTo(x1, top + slope); ctx.lineTo(x1, h + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lt; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + 12, top - 7); ctx.lineTo(x1 + 12, top + slope - 7); ctx.lineTo(x1, top + slope); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lt2; ctx.fillRect(x0, top - 0.5, x1 - x0, 1.2);
      for (let k = 0; k < holes; k++) {
        const hx = lerp(x0 + 8, x1 - 8, R()), hy = top + 16 + R() * (h - top - 30), r = 3 + R() * 7;
        ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = lt; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, r, 0.3, PI - 0.3); ctx.stroke();
      }
    };
    if (layer === 0) {
      // a holey cheese roof high above, three far slabs stepping down
      ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(w + 5, -5); ctx.lineTo(w + 5, h * 0.12);
      for (let x = w + 5; x > -10; x -= 30) ctx.quadraticCurveTo(x - 15, h * 0.12 + 16 + R() * 16, x - 30, h * 0.12 + R() * 8);
      ctx.closePath(); ctx.fill();
      for (let i = 0; i < 7; i++) { const x = R() * w, y = R() * h * 0.1, r = 4 + R() * 8; ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      slab(-10, w * 0.42, h * 0.52, -10, 4); slab(w * 0.55, w + 10, h * 0.44, 14, 4); slab(w * 0.25, w * 0.7, h * 0.74, 8, 3);
    } else {
      // nearer: two big cheese blocks at the sides with cut tops, and the candle chandelier
      slab(-10, w * 0.24, h * 0.3, 12, 5); slab(w * 0.78, w + 10, h * 0.62, -8, 4);
      ctx.fillStyle = rgb(col);
      const cx = w * 0.52, cy = h * 0.1 + Math.sin(t * 0.7) * 2;
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, -5); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 34, 7, 0, 0, PI); ctx.stroke();
      for (const d of [-34, -12, 12, 34]) ctx.fillRect(cx + d - 2.5, cy + 4 - 12 + Math.abs(d) * 0.05, 5, 12);
    }
  }

  // a round hole: cool shade under the top lip, the warm lit back wall below, a bright lip on the lower edge;
  // a through-hole shows the violet cave haze behind
  function cheeseHole(ctx, x, y, r, through, t) {
    ctx.fillStyle = through ? K.lg(ctx, 0, y - r, 0, y + r, ['#3e2c44', '#6a5470', '#9a7c8a']) : K.lg(ctx, 0, y - r, 0, y + r, ['#4a2418', '#8a4416', '#e0963a']);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (through) { ctx.fillStyle = 'rgba(255,200,140,.25)'; ctx.beginPath(); ctx.arc(x + r * 0.15, y + r * 0.25, r * 0.55, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(120,50,10,.85)'; ctx.lineWidth = Math.min(1.6, 0.6 + r * 0.12); ctx.beginPath(); ctx.arc(x, y, r, PI + 0.15, TAU - 0.15); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,200,.95)'; ctx.lineWidth = Math.min(1.8, 0.7 + r * 0.14); ctx.beginPath(); ctx.arc(x, y, r + 0.4, 0.3, PI - 0.3); ctx.stroke();
  }

  function cheeseWall(ctx, side, edge, w, h, t) {
    const R = K.rand(side < 0 ? 141 : 149), x0 = side < 0 ? 0 : w * 0.8, x1 = side < 0 ? w * 0.2 : w;
    // waxy mottling: soft lighter and darker patches
    for (let i = 0; i < 8; i++) {
      const x = lerp(x0, x1, R()), y = R() * h, r = 8 + R() * 16;
      ctx.fillStyle = K.rg(ctx, x, y, r, [i % 2 ? 'rgba(255,236,160,.22)' : 'rgba(150,80,10,.18)', 'rgba(0,0,0,0)']); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // holes, big and small, and half-holes cut into the edge
    for (let i = 0; i < 30; i++) {
      const y = R() * h, ex = edge(y), d = 5 + R() * 26, x = ex + side * d, r = 2 + R() * (d > 13 ? 8.5 : 4);
      if (Math.abs(x - ex) < r + 2) continue;
      cheeseHole(ctx, x, y, r, R() < 0.15, t);
    }
    for (let i = 0; i < 6; i++) {
      const y = 40 + i * 80 + R() * 30, r = 4 + R() * 4;
      cheeseHole(ctx, edge(y) + side * 1, y, r, false, t);
    }
    // crumbs on the edge
    for (let i = 0; i < 18; i++) { const y = R() * h, x = edge(y) + side * (2 + R() * 10); ctx.fillStyle = R() < 0.5 ? 'rgba(255,240,170,.8)' : 'rgba(160,90,20,.6)'; ctx.fillRect(x, y, 1.6, 1.4); }
  }

  // a little mouse door set in the wall: an arched plank door, brass knob, a lit window; a mouse peeks out now and then
  function mouseDoor(ctx, x, y, side, t) {
    const dw = 13, dh = 18, open = bump(frac(t / 4), 0.15, 0.25, 0.55, 0.65);
    ctx.save(); ctx.translate(x, y);
    const arch = () => { ctx.beginPath(); ctx.moveTo(-dw / 2, dh / 2); ctx.lineTo(-dw / 2, -dh / 2 + dw / 2); ctx.arc(0, -dh / 2 + dw / 2, dw / 2, PI, TAU); ctx.lineTo(dw / 2, dh / 2); ctx.closePath(); };
    arch(); ctx.fillStyle = '#3a1e08'; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, 0, 2, dw, ['rgba(255,200,110,.5)', 'rgba(255,170,70,0)']); arch(); ctx.fill(); ctx.restore();
    // the mouse peeking round the frame
    if (open > 0.05) {
      const mx = side * (dw * 0.1) * 0, my = dh * 0.2 - open * 4;
      ctx.fillStyle = K.rg(ctx, mx - 2, my - 2, 7, ['#e8dcdc', '#a8989a', '#6a5a5e']);
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(mx + d * 3.6, my - 4, 2.8, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(mx, my, 4.6, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff9cb0'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(mx + d * 3.6, my - 4, 1.4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#2a1418'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(mx + d * 1.7, my - 0.6, 0.9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ff7f9a'; ctx.beginPath(); ctx.arc(mx, my + 2, 1, 0, TAU); ctx.fill();
    }
    // the door, swung on its hinge
    ctx.save(); ctx.translate(-side * dw / 2, 0); ctx.scale(1 - open * 0.75, 1); ctx.translate(side * dw / 2, 0);
    arch(); ctx.fillStyle = K.lg(ctx, -dw / 2, 0, dw / 2, 0, ['#c4783a', '#9a5422', '#6e3a14']); ctx.fill();
    ctx.save(); arch(); ctx.clip();
    ctx.strokeStyle = 'rgba(60,24,6,.55)'; ctx.lineWidth = 0.8; for (const xx of [-2.2, 2.2]) { ctx.beginPath(); ctx.moveTo(xx, -dh); ctx.lineTo(xx, dh); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,210,150,.35)'; for (const xx of [-1.6, 2.8]) { ctx.beginPath(); ctx.moveTo(xx, -dh); ctx.lineTo(xx, dh); ctx.stroke(); }
    ctx.fillStyle = K.rg(ctx, 0, -4, 3, ['#fff2b0', '#ffc24a']); ctx.beginPath(); ctx.arc(0, -4, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6e3a14'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-2.2, -4); ctx.lineTo(2.2, -4); ctx.moveTo(0, -6.2); ctx.lineTo(0, -1.8); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = K.rg(ctx, -side * 3.5 - 0.5, 3.5, 2, ['#fff4c0', '#d9a020', '#8a5a10']); ctx.beginPath(); ctx.arc(side * 3.5, 3.5, 1.3, 0, TAU); ctx.fill();
    arch(); ctx.strokeStyle = WOOD_E; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    // the frame
    ctx.strokeStyle = '#8a5212'; ctx.lineWidth = 2.2; arch(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,170,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -dh / 2 + dw / 2, dw / 2 + 1.3, PI, PI * 1.6); ctx.stroke();
    ctx.restore();
  }

  // a candle on a brass sconce
  function candle(ctx, x, y, side, t, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    K.glow(ctx, -side * 8, -18, 70, [255, 180, 80], 0.28 + 0.04 * Math.sin(t * 11));
    const bx = -side * 9;
    ctx.strokeStyle = '#7a4c12'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(side * 2, 3); ctx.quadraticCurveTo(-side * 3, 6, bx, 2); ctx.stroke();
    ctx.strokeStyle = '#e8b04a'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, bx - 7, 0, bx + 7, 0, ['#fff0a0', '#e0a030', '#8a5a10']); ctx.beginPath(); ctx.ellipse(bx, 2, 7, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a420c'; ctx.lineWidth = 0.8; ctx.stroke();
    // wax with drips
    ctx.fillStyle = K.lg(ctx, bx - 4, 0, bx + 4, 0, ['#fffaf0', '#f4e6cc', '#c9b08a']);
    ctx.beginPath(); ctx.moveTo(bx - 4, 1); ctx.lineTo(bx - 4, -16); ctx.quadraticCurveTo(bx, -18, bx + 4, -16); ctx.lineTo(bx + 4, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(bx - 4.2, -16); ctx.quadraticCurveTo(bx - 4.6, -10, bx - 3, -9); ctx.quadraticCurveTo(bx - 2, -13, bx, -15); ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,70,.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(bx + 4, -16); ctx.lineTo(bx + 4, 1); ctx.stroke();
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx, -17); ctx.lineTo(bx, -19); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fl = Math.sin(t * 13) * 0.8;
    for (const [sc, c] of [[1, 'rgba(255,110,30,.7)'], [0.7, 'rgba(255,190,60,.85)'], [0.4, 'rgba(255,250,210,.95)']]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(bx - 3.2 * sc, -18.5); ctx.quadraticCurveTo(bx - 3.6 * sc, -22 - 4 * sc, bx + fl * sc, -19 - 11 * sc); ctx.quadraticCurveTo(bx + 3.6 * sc, -22 - 4 * sc, bx + 3.2 * sc, -18.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore(); ctx.restore();
  }

  // a wooden shelf on a bracket
  function shelf(ctx, wallX, tipX, y, th = 6) {
    const x0 = Math.min(wallX, tipX), ww = Math.abs(tipX - wallX), side = tipX < wallX ? 1 : -1;
    K.shadow(ctx, (wallX + tipX) / 2, y + th + 4, ww * 0.55, 5, 0.4);
    // bracket
    ctx.strokeStyle = '#4e2a0e'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(wallX - side * 1, y + th + 12); ctx.quadraticCurveTo(wallX - side * 3, y + th + 1, wallX - side * 15, y + th); ctx.stroke();
    ctx.strokeStyle = '#a8641e'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + th, WOOD); rrect(ctx, x0, y, ww, th, 1.5); ctx.fill();
    ctx.strokeStyle = WOOD_E; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,190,.45)'; ctx.fillRect(x0 + 1, y + 0.6, ww - 2, 1);
    ctx.strokeStyle = 'rgba(90,40,10,.45)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x0 + 4, y + th * 0.6); ctx.quadraticCurveTo(x0 + ww * 0.5, y + th * 0.4, x0 + ww - 4, y + th * 0.65); ctx.stroke();
    ctx.fillStyle = '#c9c4c0'; ctx.beginPath(); ctx.arc(wallX - side * 5, y + th / 2, 1.1, 0, TAU); ctx.fill();
  }

  // Mousetrap Snap (loop 3.5 s): bait on the trigger, a tremble, the bar snaps over, quivers, re-arms
  function mousetrap(ctx, side, wallX, y, t) {
    const SC = 1.75, c = frac(t / 3.5) * 3.5, len = 50, tipX = wallX - side * 80;
    shelf(ctx, wallX, wallX - side * 98, y);
    ctx.save(); ctx.translate(wallX, y); ctx.scale(SC, SC); ctx.translate(-wallX, -y);
    const bx = wallX - side * 8, bw = len, by = y - 6;           // trap base from bx toward the shaft
    const tell = sm(1.3, 1.9, c) * (1 - sm(1.98, 2.0, c));
    const shake = tell * Math.sin(t * 70) * 0.8;
    // bar angle: armed lying back toward the wall (PI), snaps through upright to the bait end (0)
    let ang;
    if (c < 1.95) ang = PI - tell * 0.18;
    else if (c < 2.07) ang = lerp(PI - 0.18, 0, ((c - 1.95) / 0.12) ** 2);
    else if (c < 2.7) ang = 0.06 * Math.exp(-(c - 2.07) * 6) * Math.sin((c - 2.07) * 40);
    else ang = PI * sm(2.75, 3.4, c);
    const ax = bx - side * bw * 0.5, ay = by - 2;                 // spring axis in the middle
    const hot = Math.max(tell, c > 1.95 && c < 2.3 ? 1 : 0);
    K.danger(ctx, ax - side * 6, by - 10, 46, 0.24 + 0.25 * hot);
    ctx.save(); ctx.translate(shake, 0);
    // wooden base with printed brand stripe and grain
    const bx0 = Math.min(bx, bx - side * bw);
    ctx.fillStyle = K.lg(ctx, 0, by - 5, 0, by + 1, ['#f6cf92', '#dfa25c']); rrect(ctx, bx0, by - 5, bw, 7, 1.5); ctx.fill();
    ctx.strokeStyle = 'rgba(130,70,24,.6)'; ctx.lineWidth = 0.5;
    for (const gy of [-3.6, -1.6]) { ctx.beginPath(); ctx.moveTo(bx0 + 3, by + gy); ctx.quadraticCurveTo(bx0 + bw * 0.5, by + gy - 0.8, bx0 + bw - 3, by + gy + 0.3); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(130,70,24,.5)'; ctx.beginPath(); ctx.ellipse(bx0 + bw * 0.3, by - 2.4, 3, 1, 0, 0, TAU); ctx.ellipse(bx0 + bw * 0.3, by - 2.4, 1.4, 0.45, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = K.lg(ctx, 0, by + 1, 0, by + 6, ['#c4803e', '#8a5020']); rrect(ctx, bx0, by + 0.8, bw, 5.2, 1.2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,36,10,.45)'; ctx.lineWidth = 0.5; for (const gy of [2, 4.2]) { ctx.beginPath(); ctx.moveTo(bx0 + 2, by + gy); ctx.quadraticCurveTo(bx0 + bw * 0.6, by + gy + 0.8, bx0 + bw - 2, by + gy - 0.3); ctx.stroke(); }
    ctx.strokeStyle = '#7a4416'; ctx.lineWidth = 0.9; rrect(ctx, bx0, by - 5, bw, 11, 1.5); ctx.stroke();
    ctx.fillStyle = 'rgba(200,50,40,.75)'; ctx.fillRect(bx0 + 4, by + 2.6, bw - 8, 1.3);
    ctx.fillStyle = 'rgba(255,240,210,.7)'; ctx.fillRect(bx0 + 2, by - 4.4, bw - 4, 0.8);
    // trigger plate and the bait wedge at the shaft end
    const px = bx - side * (bw - 10);
    ctx.fillStyle = K.lg(ctx, 0, by - 2, 0, by, ['#f0f2f6', '#9aa0aa']); ctx.fillRect(px - 7, by - 1.8, 14, 2);
    const bait = c > 2.0 && c < 2.75 ? 0.6 : 1;
    ctx.save(); ctx.translate(px, by - 2); ctx.scale(1, bait);
    ctx.fillStyle = K.lg(ctx, -6, -8, 6, 0, CHED); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(6, -5); ctx.lineTo(-6, -9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CHED_E; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#b8741a'; for (const [hx, hy, hr] of [[-2, -4.5, 1.3], [3, -2.5, 1]]) { ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (c < 1.95) twinkle(ctx, px - 3, by - 10, 3 * Math.max(0, Math.sin(t * 3)), 0.9);
    // the catch arm (thin wire) lying along the base toward the bait, lifting off in the tell
    ctx.strokeStyle = '#7d8590'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - side * 4, by - 1); ctx.lineTo(px + side * 6, by - 1.5 - tell * 3); ctx.stroke();
    // coiled springs
    for (let k = 0; k < 5; k++) { const kx = ax - side * (k - 2) * 1.9; ctx.strokeStyle = '#7a3412'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(kx, ay - 1.5, 1.7, 3.4, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = k % 2 ? '#ffc48a' : '#e0803a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(kx, ay - 1.5, 1.7, 3.4, 0, PI * 0.9, PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = '#c87a3a'; for (const d of [-1, 1]) ctx.fillRect(ax + d * 6 - 0.8, by - 3, 1.6, 2.4);
    // motion smear behind the snapping bar
    const L = 26;
    if (c > 1.95 && c < 2.2) {
      const a0 = lerp(PI - 0.18, 0, clamp((c - 1.95) / 0.12, 0, 1) ** 2), fade = 1 - sm(2.07, 2.2, c);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,236,210,${0.16 * fade})`;
      ctx.beginPath(); ctx.moveTo(ax, ay);
      const s0 = side < 0 ? -(PI - 0.18) : -PI + (PI - 0.18), s1 = side < 0 ? -a0 : -PI + a0;
      ctx.arc(ax, ay, L, Math.min(s0, s1), Math.max(s0, s1)); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // the kill bar: a U of steel wire seen from the side
    const dirA = side < 0 ? -ang : -PI + ang;
    const ex2 = ax + Math.cos(dirA) * L, ey2 = ay + Math.sin(dirA) * L;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const U = () => { ctx.beginPath(); ctx.moveTo(ax, ay - 4); ctx.lineTo(ex2, ey2 - 4); ctx.lineTo(ex2, ey2); ctx.lineTo(ax, ay); };
    U(); ctx.strokeStyle = '#4c5460'; ctx.lineWidth = 3.2; ctx.stroke();
    U(); ctx.strokeStyle = '#c8d0da'; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(ax, ay - 0.6); ctx.lineTo(ex2, ey2 - 0.6); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, ax - 1, ay - 1, 3, ['#ffffff', '#9aa2ae']); ctx.beginPath(); ctx.arc(ax, ay, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
    // SNAP: impact star and crumbs where it lands
    if (c > 2.05 && c < 2.4) {
      const u = (c - 2.05) / 0.35, ix = ax - side * L, iy = ay - 2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,236,190,${1 - u})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const a = -PI + k * PI / 6, r0 = 5 + u * 8, r1 = r0 + 6; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1); ctx.stroke(); }
      ctx.restore();
      for (let k = 0; k < 5; k++) { const a = -PI * 0.5 + (k - 2) * 0.5; ctx.fillStyle = CHED[1]; ctx.fillRect(ix + Math.cos(a) * u * 22, iy - 4 + Math.sin(a) * u * 18 + u * u * 30, 2, 2); }
    }
    ctx.restore();
  }

  // a whole cheese wheel face-on: red wax rind, pale paste with holes, a wedge cut away
  function cheeseWheel(ctx, x, y, r, rot, danger = true) {
    if (danger) K.danger(ctx, x, y, r * 2.1, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const cut = 0.62;                                   // the missing wedge
    // the wheel's thickness: the rind band and the cut paste behind the face
    ctx.save(); ctx.rotate(-rot); ctx.translate(r * 0.17, r * 0.12); ctx.rotate(rot);
    ctx.fillStyle = K.lg(ctx, -r, -r, r, r, ['#e8a848', '#b06a1e', '#7a420e']);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, cut * 0.5, TAU - cut * 0.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e3a0c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#c88a30'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(cut * 0.5) * r, Math.sin(cut * 0.5) * r);
    { const o = [r * 0.17, r * 0.12], ca = Math.cos(-rot), sa = Math.sin(-rot), ox = o[0] * ca - o[1] * sa, oy = o[0] * sa + o[1] * ca;
      ctx.lineTo(Math.cos(cut * 0.5) * r + ox, Math.sin(cut * 0.5) * r + oy); ctx.lineTo(ox, oy); ctx.lineTo(Math.cos(-cut * 0.5) * r + ox, Math.sin(-cut * 0.5) * r + oy); ctx.lineTo(Math.cos(-cut * 0.5) * r, Math.sin(-cut * 0.5) * r); ctx.closePath(); ctx.fill(); }
    // rind
    ctx.fillStyle = K.rg(ctx, -r * 0.3, -r * 0.4, r * 1.4, ['#ffd27a', '#d08a2a', '#8a4e12']);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, cut * 0.5, TAU - cut * 0.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e3a0c'; ctx.lineWidth = 1.1; ctx.stroke();
    // paste
    const ri = r - 2.8;
    ctx.fillStyle = K.rg(ctx, -ri * 0.3, -ri * 0.4, ri * 1.4, ['#fff8d0', '#ffe07a', '#f0b040']);
    ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.arc(0, 0, ri, cut * 0.5 + 0.06, TAU - cut * 0.5 - 0.06); ctx.closePath(); ctx.fill();
    for (const [hx, hy, hr] of [[-ri * 0.42, -ri * 0.3, 3.4], [-ri * 0.1, ri * 0.48, 2.6], [-ri * 0.62, ri * 0.3, 2], [ri * 0.12, -ri * 0.6, 2.2], [ri * 0.32, ri * 0.62, 1.5], [-ri * 0.05, -ri * 0.05, 1.4], [ri * 0.5, -ri * 0.45, 1.3]]) cheeseHole(ctx, hx, hy, hr, false, 0);
    // the cut faces of the wedge: the inside paste, a little shadowed
    ctx.fillStyle = 'rgba(160,90,20,.35)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(cut * 0.5) * r, Math.sin(cut * 0.5) * r); ctx.lineTo(Math.cos(cut * 0.5) * r * 0.86, Math.sin(cut * 0.5) * r * 0.86 - 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    // gloss on the wax (stays lit from the top-left as it rolls)
    K.sheen(ctx, x, y, r, 0.5);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x - r * 0.45, y - r * 0.55, 2.4, 1.2, -0.7, 0, TAU); ctx.fill();
  }

  // Cheese Wheel (loop 4 s): sits on a shelf, rocks, rolls off, bounces off the far wall and falls, a new one slides out
  function wheelState(c, wallX, side, y, L, R, r) {
    const rest = wallX - side * (r + 8), tip = wallX - side * 88;
    if (c < 1.2) return { x: rest, y: y - r, rot: Math.sin(c * 3) * 0.04, on: 1 };
    if (c < 1.8) { const k = sm(1.2, 1.8, c), wob = Math.sin(c * 30) * k; return { x: rest - side * 5 * k + wob * 1.2, y: y - r, rot: -side * 5 * k / r + wob * 0.05, on: 1 }; }
    if (c < 2.1) { const k = (c - 1.8) / 0.3, x = lerp(rest - side * 5, tip, k * k); return { x, y: y - r, rot: (x - rest) / r, on: 1, roll: k }; }
    if (c < 3.6) {
      const tau = c - 2.1, vx = -side * 190, xl = L + r, xr = R - r;
      let x = tip + vx * tau, hit = 99; if (x < xl) { hit = xl - x; x = 2 * xl - x; } if (x > xr) { hit = x - xr; x = 2 * xr - x; }
      return { x, y: y - r + 40 * tau + 0.5 * 560 * tau * tau, rot: (tip - rest) / r - side * tau * 190 / r, on: 0, tau, hit };
    }
    const k = sm(3.6, 4, c); return { x: lerp(wallX + side * 6, rest, k), y: y - r, rot: (1 - k) * 2.5, on: 1, fade: k };
  }

  // a cheese chunk jutting from the wall: a pale cut top, a holey front face, a rind along the bottom
  function cheeseChunk(ctx, side, ex, y, depth, hgt, seed) {
    const R = K.rand(seed), xt = ex - side * depth, y0 = y - hgt / 2, y1 = y + hgt / 2;
    K.shadow(ctx, ex - side * depth * 0.5, y1 + 4, depth * 0.6, 4, 0.35);
    const front = () => { ctx.beginPath(); ctx.moveTo(ex + side * 4, y0); ctx.lineTo(xt, y0 + 3); ctx.lineTo(xt + side * 2, y1); ctx.lineTo(ex + side * 4, y1 + 2); ctx.closePath(); };
    front(); ctx.fillStyle = K.lg(ctx, 0, y0, 0, y1, ['#ffd85a', '#f5b236', '#d98a22']); ctx.fill();
    ctx.save(); front(); ctx.clip();
    for (let k = 0; k < 3; k++) cheeseHole(ctx, lerp(ex, xt, 0.2 + R() * 0.7), lerp(y0 + 6, y1 - 4, R()), 1.8 + R() * 3, false, 0);
    cheeseHole(ctx, xt + side * 1, lerp(y0 + 5, y1 - 5, R()), 3, false, 0);
    ctx.fillStyle = K.lg(ctx, 0, y1 - 3, 0, y1 + 2, ['#e0782a', '#b04a14']); ctx.fillRect(Math.min(ex, xt) - 4, y1 - 2.4, depth + 10, 5);
    ctx.restore();
    front(); ctx.strokeStyle = '#a8561a'; ctx.lineWidth = 1; ctx.stroke();
    // the cut top facet, lit
    ctx.beginPath(); ctx.moveTo(ex + side * 4, y0); ctx.lineTo(ex + side * 8, y0 - 5); ctx.lineTo(xt + side * 6, y0 - 2); ctx.lineTo(xt, y0 + 3); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, 0, y0 - 5, 0, y0 + 3, ['#fff6cc', '#ffe48a']); ctx.fill(); ctx.strokeStyle = '#c8822a'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,240,.8)'; ctx.fillRect(Math.min(xt, ex) + 2, y0 + (side < 0 ? 0 : 0) - 0.5, depth - 2, 0.9);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = '#f2b836'; ctx.fillRect(lerp(ex, xt, 0.2 + R() * 0.6), y0 - 2 - R() * 2, 1.8, 1.5); }
  }

  // the wall's own thickness along its edge: a pale cut face band and a darker orange rind line
  function cheeseEdge(ctx, side, ex, h) {
    ctx.save(); ctx.lineJoin = 'round';
    const line = (o) => { ctx.beginPath(); for (let y = -4; y <= h + 4; y += 6) y < 0 ? ctx.moveTo(ex(y) + side * o, y) : ctx.lineTo(ex(y) + side * o, y); };
    line(4); ctx.strokeStyle = 'rgba(255,240,170,.75)'; ctx.lineWidth = 5; ctx.stroke();
    line(7); ctx.strokeStyle = 'rgba(190,100,20,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    line(0.6); ctx.strokeStyle = '#d0641e'; ctx.lineWidth = 2; ctx.stroke();
    line(-0.6); ctx.strokeStyle = 'rgba(255,190,110,.8)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  }

  // Cat Paw (loop 4 s): big eyes blink in a hole, widen and dilate, then a ginger paw swipes out across the shaft
  function catPaw(ctx, side, hx, hy, t, lookX) {
    const c = frac(t / 4) * 4, hr = 17;
    const tell = sm(1.5, 2.1, c) * (1 - sm(2.9, 3.4, c));
    const ext = c < 2.3 ? 0 : c < 2.45 ? sm(2.3, 2.45, c) : c < 2.95 ? 1 : 1 - sm(2.95, 3.45, c);
    const sweep = sm(2.4, 2.8, c);
    const reach = 104 * ext;
    // the hole: cut into the cheese at the wall edge
    ctx.save();
    ctx.fillStyle = K.rg(ctx, hx, hy + 3, hr * 1.1, ['#4a2a0e', '#2e1806', '#24140a']); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(110,56,10,.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(hx, hy, hr - 1, PI + 0.1, TAU - 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,180,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(hx, hy, hr + 0.5, 0.15, PI - 0.15); ctx.stroke();
    ctx.restore();
    if (tell > 0.02) K.danger(ctx, hx - side * 4, hy, 40, 0.35 * tell);
    // eyes in the dark (hidden while the paw is out)
    const eyeA = 1 - ext * 0.85;
    if (eyeA > 0.05) {
      const bl = frac(t / 1.7 + 0.3) < 0.06 && tell < 0.3 ? 0.1 : 1, open = bl * (0.7 + 0.45 * tell), dil = 0.25 + 0.7 * tell;
      ctx.save(); ctx.globalAlpha = eyeA;
      // faint face: ear tips and whiskers catching the light
      ctx.strokeStyle = 'rgba(255,190,110,.35)'; ctx.lineWidth = 0.8;
      for (const d of [-1, 1]) for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx - side * 2 + d * 4, hy + 5 + k); ctx.lineTo(hx - side * 2 + d * 12, hy + 4 + k * 3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,150,150,.6)'; ctx.beginPath(); ctx.moveTo(hx - side * 2 - 1.6, hy + 3); ctx.lineTo(hx - side * 2 + 1.6, hy + 3); ctx.lineTo(hx - side * 2, hy + 4.8); ctx.fill();
      for (const d of [-1, 1]) {
        const ex = hx - side * 2 + d * 6, ey = hy - 3, ew = 4.6, eh = 3.6 * open;
        K.glow(ctx, ex, ey, 10, [200, 255, 90], 0.25 + 0.2 * tell);
        ctx.fillStyle = K.rg(ctx, ex - 1, ey - 1, ew * 1.3, ['#f6ffb0', '#b8f04a', '#5a9a1a']);
        ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.quadraticCurveTo(ex, ey - eh * 1.5, ex + ew, ey); ctx.quadraticCurveTo(ex, ey + eh * 1.5, ex - ew, ey); ctx.fill();
        if (open > 0.3) {
          const lx = clamp((lookX - hx) / 60, -1, 1) * 1.6;
          ctx.fillStyle = '#1a1206'; ctx.beginPath(); ctx.ellipse(ex + lx, ey, 0.7 + dil * 2.2, Math.min(eh * 1.2, 3.6), 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lx - 1.2, ey - 1.2, 0.8, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(40,60,10,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.quadraticCurveTo(ex, ey - eh * 1.5, ex + ew, ey); ctx.stroke();
      }
      ctx.restore();
    }
    if (reach < 2) return;
    // the swipe: aims high, sweeps down across the shaft
    const a = lerp(-0.75, 0.12, sweep), dir = side < 0 ? a : PI - a;
    if (c > 2.4 && c < 3.0) {
      const fade = 1 - sm(2.8, 3.0, c), a0 = lerp(-0.75, 0.12, Math.max(0, sweep - 0.35));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,200,150,${0.12 * fade})`;
      ctx.beginPath(); ctx.moveTo(hx, hy);
      if (side < 0) ctx.arc(hx, hy, reach + 12, a0, a); else ctx.arc(hx, hy, reach + 12, PI - a, PI - a0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,240,220,${0.45 * fade})`; ctx.lineWidth = 1.2;
      for (const o of [0, 8]) { ctx.beginPath(); if (side < 0) ctx.arc(hx, hy, reach + 4 + o, a0, a); else ctx.arc(hx, hy, reach + 4 + o, PI - a, PI - a0); ctx.stroke(); }
      ctx.restore();
    }
    K.danger(ctx, hx + Math.cos(dir) * reach, hy + Math.sin(dir) * reach, 42, 0.42);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(dir);
    const flip = side < 0 ? 1 : -1; ctx.scale(1, flip);       // keep the pads facing us on both walls
    const arm = () => { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(reach * 0.5, -10.5, reach - 4, -9.5); ctx.lineTo(reach - 4, 9.5); ctx.quadraticCurveTo(reach * 0.5, 9, -4, 8); ctx.closePath(); };
    arm(); ctx.fillStyle = K.lg(ctx, 0, -10, 0, 10, ['#ffcf8a', '#ec8d34', '#b4561c']); ctx.fill();
    ctx.save(); arm(); ctx.clip();
    for (let x = 6; x < reach - 10; x += 11) {
      ctx.fillStyle = 'rgba(150,62,14,.55)'; ctx.beginPath(); ctx.moveTo(x, -11); ctx.quadraticCurveTo(x + 5, -2, x + 1, 11); ctx.lineTo(x + 4, 11); ctx.quadraticCurveTo(x + 8, -2, x + 4, -11); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,210,.5)'; ctx.fillRect(0, 4, reach, 6);
    ctx.restore();
    arm(); ctx.strokeStyle = '#8a3e12'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, -7.5); ctx.quadraticCurveTo(reach * 0.5, -9.5, reach - 6, -8.2); ctx.stroke();
    // the paw: a round mitt with pink beans and hooked claws
    const px = reach + 2;
    for (let k = 0; k < 4; k++) {
      const ta = -0.9 + k * 0.6, cx2 = px + Math.cos(ta) * 10, cy2 = Math.sin(ta) * 10;
      ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(ta);
      ctx.fillStyle = K.lg(ctx, 0, -2, 8, 2, ['#ffffff', '#efe6da', '#b8a898']);
      ctx.beginPath(); ctx.moveTo(0, -1.8); ctx.quadraticCurveTo(7, -2.6, 9, 2.4); ctx.quadraticCurveTo(6, 0.4, 0, 1.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a7a6a'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = K.rg(ctx, px - 3, -4, 14, ['#fff0dc', '#f2b070', '#c26a26']); ctx.beginPath(); ctx.arc(px, 0, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a3e12'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = K.rg(ctx, px - 1, 1, 6, ['#ffd0dc', '#f28aa4', '#c45a78']); ctx.beginPath(); ctx.ellipse(px - 0.5, 2.5, 4.6, 3.8, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 4; k++) { const ta = -1.05 + k * 0.7; ctx.beginPath(); ctx.ellipse(px + Math.cos(ta) * 7, Math.sin(ta) * 7 - 0.5, 1.9, 2.3, ta, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(px - 2, 1.2, 1.4, 0.8, -0.5, 0, TAU); ctx.fill();
    K.sheen(ctx, px, 0, 11, 0.35);
    ctx.restore();
  }

  // the twist: two through-holes joined by a tunnel glowing through the cheese
  function tunnel(ctx, edge, side, y0, y1, t) {
    const x0 = edge(y0) + side * 3, x1 = edge(y1) + side * 3, bow = side * 22;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [lw, a] of [[10, 0.07], [5, 0.1], [2, 0.16]]) {
      ctx.strokeStyle = `rgba(255,${200 + lw * 3},120,${a})`; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + bow, y0 + 30, x1 + bow, y1 - 30, x1, y1); ctx.stroke();
    }
    // sparks travelling up the tunnel
    for (let k = 0; k < 4; k++) {
      const u = 1 - frac(t * 0.6 + k / 4), m = 1 - u;
      const px = m * m * m * x0 + 3 * m * m * u * (x0 + bow) + 3 * m * u * u * (x1 + bow) + u * u * u * x1;
      const py = m * m * m * y0 + 3 * m * m * u * (y0 + 30) + 3 * m * u * u * (y1 - 30) + u * u * u * y1;
      K.glow(ctx, px, py, 7, [255, 230, 140], 0.6);
    }
    ctx.restore();
    for (const [x, y] of [[x0, y0], [x1, y1]]) {
      ctx.fillStyle = K.lg(ctx, x, y - 10, x, y + 10, ['#7a4210', '#d08a2a', '#ffe08a']); ctx.beginPath(); ctx.ellipse(x, y, 6, 10, 0, 0, TAU); ctx.fill();
      K.glow(ctx, x - side * 2, y, 22, [255, 210, 120], 0.35);
      ctx.strokeStyle = 'rgba(120,60,10,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, 6, 10, 0, PI * 0.9, PI * 2.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,246,200,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y, 6.4, 10.4, 0, -0.2, PI * 0.9); ctx.stroke();
    }
    // a coin pops out of the upper hole now and then
    const u = frac(t / 2.5);
    if (u < 0.5) { const k = u / 0.5; coin(ctx, x0 - side * (6 + k * 34), y0 - 6 - 40 * k + 46 * k * k, t * 2, 1, 6.5); if (k < 0.15) twinkle(ctx, x0 - side * 6, y0, 7, 1); }
  }

  const CHEESE = {
    bgTop: [92, 74, 98], bgBot: [36, 26, 44], far: [114, 90, 94], far2: [134, 106, 96],
    wall: [255, 194, 60], wallIn: [206, 122, 28], rim: [255, 150, 50], seed: 8, inset: 34, farShape: cheeseFar, wallDeco: cheeseWall,
  };

  PV.sections['cheese'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, CHEESE);
    cheeseEdge(ctx, -1, S.L, h); cheeseEdge(ctx, 1, S.R, h);
    // candle pools: the warm accents against the cool cave
    K.glow(ctx, w * 0.52, h * 0.1, 60, [255, 180, 90], 0.2);
    cheeseChunk(ctx, -1, S.L(330), 330, 18, 26, 5); cheeseChunk(ctx, -1, S.L(468), 468, 22, 30, 9);
    cheeseChunk(ctx, 1, S.R(128), 128, 16, 24, 13); cheeseChunk(ctx, 1, S.R(444), 444, 20, 28, 17);
    mouseDoor(ctx, S.L(46) - 13, 46, -1, t);
    candle(ctx, S.R(64), 64, 1, t);
    candle(ctx, S.L(206), 206, -1, t + 1.3, 0.9);
    tunnel(ctx, S.L, -1, 262, 404, t);
    for (const [x, y, ph] of [[w * 0.66, 92, 0], [w * 0.66, 114, 0.7], [w * 0.5, 262, 1.4], [w * 0.5, 284, 2.1]]) coin(ctx, x, y, t, ph);
    mousetrap(ctx, -1, S.L(140), 140, t);
    // the wheel: shelf on the right, rolls off, bounces off the left wall, falls past the rocket
    const shY = 222, r = 24, wc = frac((t + 0.4) / 4) * 4;
    shelf(ctx, S.R(shY), S.R(shY) - 98, shY, 7);
    const W0 = wheelState(wc, S.R(shY), 1, shY, S.L(300), S.R(300), r);
    const ry = h * 0.8; let dodge = 0;
    for (let k = 2.1; k < 3.6; k += 0.04) { const Wk = wheelState(k, S.R(shY), 1, shY, S.L(300), S.R(300), r); if (Wk.y > ry - 10) { dodge = (Wk.x < w / 2 ? 1 : -1) * 34 * bump(wc, k - 0.6, k - 0.2, k + 0.25, k + 0.6); break; } }
    catPaw(ctx, 1, S.R(334) + 5, 334, t + 0.2, w * 0.5 + dodge);
    if (W0.y < h + 40) {
      // rolling: curved speed lines trailing it and crumbs kicked off
      if (!W0.on || W0.roll) {
        const dir = W0.on ? -1 : (W0.hit < 99 || W0.x > S.L(300) + r + 40 ? 1 : 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,230,170,.4)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        const ang = W0.on ? 0 : Math.atan2(40 + 560 * (W0.tau || 0), -190);
        for (const o of [-0.5, 0.5]) { ctx.beginPath(); ctx.arc(W0.x, W0.y, r + 5, ang - 0.5 + o * 0.4 + PI * 0, ang + 0.3 + o * 0.4); ctx.stroke(); }
        ctx.restore();
        for (let j = 0; j < 4; j++) { const u = frac(wc * 3 + j / 4); ctx.fillStyle = CHED[1]; ctx.fillRect(W0.x + (j - 1.5) * 6, W0.y - r * 0.6 - u * 14 + u * u * 30, 2, 2); }
      }
      const sq = W0.hit !== undefined && W0.hit < 8 ? 1 - (8 - W0.hit) / 8 * 0.12 : 1;
      ctx.save(); ctx.globalAlpha = W0.fade ?? 1; ctx.translate(W0.x, W0.y); ctx.scale(sq, 1 / sq); cheeseWheel(ctx, 0, 0, r, W0.rot); ctx.restore();
    }
    if (wc > 1.2 && wc < 2.1) for (let j = 0; j < 3; j++) { const u = frac(wc * 2 + j / 3); ctx.fillStyle = CHED[1]; ctx.fillRect(S.R(shY) - 90 + j * 3, shY + 6 + u * 40, 1.8, 1.8); }
    K.rocket(ctx, w * 0.5 + dodge, ry, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 220, 170], 18, 11);
    K.motes(ctx, w, h, t, 'pollen', [255, 190, 110], 8, 4);
  };
  // =================================================================================================== TOYBOX TOWER
  const TOY = {
    red: ['#ff8a7a', '#e94b3c', '#a02a1e', '#7a1c12'], blue: ['#8ab8ff', '#3c7fe9', '#1f4fa8', '#163a7a'],
    yellow: ['#fff0a0', '#f5c542', '#c48a14', '#8a5e0c'], green: ['#a8f08a', '#4cbf4a', '#2a7e2a', '#1c5a1e'],
    wood: ['#f2d2a0', '#d9a66a', '#a8723a', '#6e4620'],
  };
  const TOYC = ['red', 'blue', 'yellow', 'green'];

  function star5(ctx, x, y, r, r2 = r * 0.45, rot = -PI / 2) {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * PI / 5, rr = i % 2 ? r2 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
  }

  function toyFar(ctx, w, h, t, layer, col) {
    const R = K.rand(layer ? 611 : 313), lt = rgb(K.lift(col, 10)), dk = rgb(K.lift(col, -10));
    if (layer === 0) {
      // wallpaper of faint stars and moons, a teddy, a rocking horse and a block tower far below
      ctx.fillStyle = lt;
      for (let i = 0; i < 16; i++) { const x = (i % 4 + 0.5 + (Math.floor(i / 4) % 2) * 0.5) * w / 4, y = (Math.floor(i / 4) + 0.4) * h * 0.16; if (i % 3) { star5(ctx, x, y, 4); ctx.fill(); } else { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.arc(x + 2, y - 1.5, 3.4, 0, TAU, true); ctx.fill('evenodd'); } }
      ctx.fillStyle = rgb(col);
      // teddy
      const tx = w * 0.3, ty = h - 40;
      for (const [x, y, r] of [[tx, ty, 24], [tx, ty - 30, 16], [tx - 13, ty - 42, 6], [tx + 13, ty - 42, 6], [tx - 22, ty - 4, 8], [tx + 22, ty - 4, 8], [tx - 12, ty + 22, 10], [tx + 12, ty + 22, 10]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      // rocking horse
      const hx = w * 0.72, hy = h - 30;
      ctx.beginPath(); ctx.ellipse(hx, hy - 22, 26, 11, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 16, hy - 28); ctx.lineTo(hx + 26, hy - 54); ctx.lineTo(hx + 40, hy - 50); ctx.lineTo(hx + 34, hy - 40); ctx.lineTo(hx + 26, hy - 22); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = rgb(col);
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + d * 16, hy - 16); ctx.lineTo(hx + d * 22, hy + 2); ctx.stroke(); }
      ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(hx, hy - 30, 46, 36, 0, 0.55, PI - 0.55); ctx.stroke();
    } else {
      // nearer: a hanging mobile turning slowly and a bookshelf edge
      const cx = w * 0.5, cy = h * 0.1, sw = Math.sin(t * 0.6) * 0.15;
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx, -5); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx - 52 * Math.cos(sw), cy - 52 * Math.sin(sw)); ctx.lineTo(cx + 52 * Math.cos(sw), cy + 52 * Math.sin(sw)); ctx.stroke();
      ctx.lineWidth = 1;
      for (const [d, len, kind] of [[-1, 40, 0], [0, 58, 1], [1, 34, 2]]) {
        const ax = cx + d * 50 * Math.cos(sw), ay = cy + d * 50 * Math.sin(sw), bx = ax + Math.sin(t * 0.9 + d) * 3, by = ay + len;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.save(); ctx.translate(bx, by + 8); ctx.scale(Math.cos(t * 0.8 + d * 2), 1);
        if (kind === 0) { star5(ctx, 0, 0, 10); ctx.fill(); }
        else if (kind === 1) { ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.arc(5, -3, 9, 0, TAU, true); ctx.fill('evenodd'); }
        else { for (const [x, y, r] of [[-6, 2, 6], [0, -2, 7], [6, 2, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
        ctx.restore();
      }
      // crayon scribbles on the far wall
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [x0, y0, cc] of [[w * 0.2, h * 0.42, [230, 110, 100]], [w * 0.66, h * 0.58, [110, 150, 230]], [w * 0.38, h * 0.74, [240, 200, 90]]]) {
        ctx.strokeStyle = rgb(K.mix(col, cc, 0.35), 0.8); ctx.lineWidth = 2.2; ctx.beginPath();
        for (let k = 0; k < 26; k++) { const a = k * 0.8; ctx.lineTo(x0 + k * 1.8 + Math.cos(a) * 9, y0 + Math.sin(a) * 6 + Math.sin(k * 0.3) * 4); }
        ctx.stroke();
      }
    }
  }

  // an alphabet block face: painted bevelled frame, a raised letter, wood showing at the worn corners
  function alphaBlock(ctx, x, y, s, colK, letter, letK, rim) {
    const C = TOY[colK], L = TOY[letK];
    ctx.fillStyle = K.lg(ctx, x, y, x + s, y + s, [TOY.wood[0], TOY.wood[1], TOY.wood[2]]); rrect(ctx, x, y, s, s, 3); ctx.fill();
    ctx.fillStyle = K.lg(ctx, x, y, x + s * 0.6, y + s, [C[0], C[1], C[2]]); rrect(ctx, x + 1.4, y + 1.4, s - 2.8, s - 2.8, 2.4); ctx.fill();
    // inner panel sunk a little: shade under its top-left lip, light on its bottom-right
    ctx.fillStyle = K.lg(ctx, x, y + 4, x, y + s - 4, [C[2], C[1], C[0]]); rrect(ctx, x + 4.2, y + 4.2, s - 8.4, s - 8.4, 1.6); ctx.fill();
    ctx.fillStyle = rgb(K.lift([0, 0, 0], 0), 0); 
    ctx.font = `900 ${Math.round(s * 0.56)}px "Arial Rounded MT Bold", "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(30,10,10,.35)'; ctx.fillText(letter, x + s / 2 + 0.8, y + s / 2 + 1.6);
    ctx.fillStyle = L[0]; ctx.fillText(letter, x + s / 2 - 0.4, y + s / 2 + 0.2);
    ctx.fillStyle = L[1]; ctx.fillText(letter, x + s / 2, y + s / 2 + 0.8);
    ctx.strokeStyle = C[3]; ctx.lineWidth = 1; rrect(ctx, x + 0.5, y + 0.5, s - 1, s - 1, 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 3, y + s - 4); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x + s - 4, y + 3); ctx.stroke();
    // wood worn through at a corner
    ctx.fillStyle = TOY.wood[1]; ctx.beginPath(); ctx.arc(x + s - 3, y + s - 3, 2.4, 0, TAU); ctx.fill();
  }

  // a stack of books lying flat, spines toward us
  function books(ctx, x0, x1, y, side, R) {
    let yy = y; const out = [];
    for (let k = 0; k < 3; k++) {
      const hh = 6 + R() * 3, c = TOY[TOYC[(R() * 4) | 0]], ext = 6 + R() * 10;
      const xa = side < 0 ? x0 : x1 - (x1 - x0) - ext, xb = side < 0 ? x1 + ext : x1;
      ctx.fillStyle = K.lg(ctx, 0, yy, 0, yy + hh, [c[0], c[1], c[2]]); rrect(ctx, Math.min(xa, xb), yy, Math.abs(xb - xa), hh, 1.6); ctx.fill();
      ctx.strokeStyle = c[3]; ctx.lineWidth = 0.8; ctx.stroke();
      // gold bands near the spine end and a page edge
      const se = side < 0 ? xb : xa;
      ctx.fillStyle = '#ffd86a'; for (const o of [4, 7]) ctx.fillRect(se + side * -o - 0.6, yy + 1, 1.2, hh - 2);
      ctx.fillStyle = '#fff6e0'; ctx.fillRect(Math.min(xa, xb) + 2, yy + hh - 1.6, Math.abs(xb - xa) - 4, 1);
      out.push([se, yy, hh]); yy += hh;
    }
    return yy;
  }

  // crayons lying in a bundle, flat ends toward the shaft
  function crayons(ctx, x0, x1, y, side, R) {
    let yy = y;
    for (let k = 0; k < 3; k++) {
      const c = TOY[TOYC[(R() * 4) | 0]], d = 6.5, ext = 4 + R() * 8, xa = side < 0 ? x0 : x1 - (x1 - x0) - ext, xb = side < 0 ? x1 + ext : x1;
      const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
      ctx.fillStyle = K.lg(ctx, 0, yy, 0, yy + d, [c[0], c[1], c[2]]); ctx.fillRect(lo, yy, hi - lo, d);
      // paper wrapper with zigzag bands
      ctx.fillStyle = 'rgba(255,250,235,.25)'; ctx.fillRect(lo + 6, yy, hi - lo - 12, d);
      ctx.strokeStyle = c[3]; ctx.lineWidth = 0.8;
      for (const xx of [lo + 8, hi - 8]) { ctx.beginPath(); for (let j = 0; j <= 4; j++) ctx.lineTo(xx + (j % 2) * 1.6, yy + j * d / 4); ctx.stroke(); }
      // the round flat end facing the shaft
      const ex = side < 0 ? hi : lo;
      ctx.fillStyle = K.rg(ctx, ex - 1, yy + d / 2 - 1, d * 0.6, [c[0], c[1], c[2]]); ctx.beginPath(); ctx.ellipse(ex, yy + d / 2, 1.8, d / 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = c[3]; ctx.lineWidth = 0.7; ctx.strokeRect(lo, yy, hi - lo, d);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(lo, yy + 1, hi - lo, 1);
      yy += d;
    }
    return yy;
  }

  // build one wall of toys (seeded, deterministic) and return its inner-edge profile
  function toyWall(ctx, side, w, h, t, base, seed, skip) {
    const R = K.rand(seed), prof = [];
    const X0 = side < 0 ? -6 : w - base, X1 = side < 0 ? base : w + 6;
    // the toy box's painted plywood behind the stack
    ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? base : w - base, 0, ['#3a2416', '#6e4628']); ctx.fillRect(Math.min(X0, X1), -2, Math.abs(X1 - X0), h + 4);
    let y = -12 + R() * 8, i = 0;
    const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123';
    while (y < h + 10) {
      const kind = R(), s = 26 + ((R() * 4) | 0);
      if (skip && y + s > skip[0] && y < skip[1]) { y = skip[1]; continue; }
      if (kind < 0.62) {
        const prot = R() * 7, x = side < 0 ? base + prot - s : w - base - prot;
        const ck = TOYC[(R() * 4) | 0]; let lk = TOYC[(R() * 4) | 0]; if (lk === ck) lk = TOYC[(TOYC.indexOf(ck) + 2) % 4];
        alphaBlock(ctx, x, y, s, ck, LET[(seed + i * 7) % LET.length], lk);
        prof.push([y, y + s, side < 0 ? x + s : x]);
        // a second block behind/outside it, for depth
        const x2 = side < 0 ? x - s + 2 : x + s - 2;
        if ((side < 0 && x2 + s > -2) || (side > 0 && x2 < w + 2)) { ctx.save(); ctx.globalAlpha = 1; alphaBlock(ctx, x2, y + 1, s - 2, TOYC[(R() * 4) | 0], LET[(seed + i * 3 + 5) % LET.length], 'yellow'); ctx.fillStyle = 'rgba(20,10,30,.35)'; ctx.fillRect(x2, y + 1, s - 2, s - 2); ctx.restore(); }
        y += s;
      } else if (kind < 0.82) {
        const y2 = books(ctx, X0, side < 0 ? base : w - base, y, side, R); prof.push([y, y2, side < 0 ? base + 10 : w - base - 10]); y = y2;
      } else {
        const y2 = crayons(ctx, X0, side < 0 ? base : w - base, y, side, R); prof.push([y, y2, side < 0 ? base + 8 : w - base - 8]); y = y2;
      }
      i++;
    }
    // sink the stack back into the gloom so the toys in the shaft read first (lit toward the lamp and the shaft)
    ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? base + 8 : w - base - 8, 0, ['rgba(26,18,48,.62)', 'rgba(26,18,48,.18)']);
    ctx.fillRect(side < 0 ? -6 : w - base - 12, -2, base + 18, h + 4);
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, ['rgba(26,18,48,0)', 'rgba(26,18,48,.25)']); ctx.fillRect(side < 0 ? -6 : w - base - 12, -2, base + 18, h + 4);
    // warm lamp light catching the shaft-facing edges, shifting from warm to cool down the tower
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [y0, y1, ex] of prof) {
      const c = K.mix([255, 210, 140], [150, 190, 255], clamp(y0 / h, 0, 1));
      ctx.fillStyle = K.lg(ctx, ex, 0, ex - side * 10, 0, [rgb(c, 0.3), rgb(c, 0)]); ctx.fillRect(Math.min(ex, ex - side * 10), y0, 10, y1 - y0);
    }
    ctx.restore();
    return y => { for (const [a, b, ex] of prof) if (y >= a && y < b) return ex; return side < 0 ? base : w - base; };
  }
  // a painted toy shelf plank with a bracket
  function toyShelf(ctx, wallX, tipX, y, colK = 'blue') {
    const C = TOY[colK], x0 = Math.min(wallX, tipX), ww = Math.abs(tipX - wallX), side = tipX < wallX ? 1 : -1;
    K.shadow(ctx, (wallX + tipX) / 2, y + 12, ww * 0.55, 5, 0.4);
    ctx.fillStyle = K.lg(ctx, 0, y + 7, 0, y + 16, [TOY.wood[1], TOY.wood[3]]);
    ctx.beginPath(); ctx.moveTo(wallX, y + 7); ctx.lineTo(wallX - side * 16, y + 7); ctx.lineTo(wallX, y + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 8, [C[0], C[1], C[2]]); rrect(ctx, x0, y, ww, 8, 2); ctx.fill();
    ctx.strokeStyle = C[3]; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = TOY.yellow[1]; ctx.fillRect(x0 + 2, y + 5, ww - 4, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0 + 2, y + 1, ww - 4, 1);
    for (let k = 0; k < Math.floor(ww / 18); k++) { ctx.fillStyle = TOY.yellow[0]; ctx.beginPath(); ctx.arc(x0 + 9 + k * 18, y + 3, 0.9, 0, TAU); ctx.fill(); }
  }

  // Jack-in-the-Box (loop 4 s): the crank turns a tune, the box shakes, the lid pops and a clown springs out
  function jackBox(ctx, side, wallX, y, t) {
    const c = frac(t / 4) * 4, bs = 30, bx = wallX - side * 22, by = y - bs;      // box centre x, top y
    toyShelf(ctx, wallX, wallX - side * 50, y, 'green');
    const tell = sm(1.3, 2.0, c) * (1 - sm(2.05, 2.1, c));
    const out = c < 2.05 ? 0 : c < 3.1 ? spring((c - 2.05) / 1.05, 3.2, 3.4) : 1 - sm(3.1, 3.6, c);
    const lid = c < 2.05 ? tell * 0.12 * (0.5 + 0.5 * Math.sin(t * 40)) : c < 3.6 ? clamp((c - 2.05) / 0.08, 0, 1) * 1.9 : 1.9 * (1 - sm(3.6, 3.75, c));
    const shake = tell * Math.sin(t * 60) * 1.2;
    // music notes drifting up (hot red through the tell)
    for (let k = 0; k < 3; k++) {
      const u = frac(t * (0.5 + tell * 0.6) + k / 3), nx = bx + side * 14 + Math.sin(u * 6 + k) * 6, ny = by - 4 - u * 34;
      ctx.save(); ctx.globalAlpha = (1 - u) * (0.6 + 0.4 * tell); ctx.fillStyle = tell > 0.3 ? '#ff6a6a' : '#fff2c0';
      ctx.beginPath(); ctx.ellipse(nx, ny, 2.4, 1.8, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(nx + 1.6, ny - 8, 1, 8); ctx.fillRect(nx + 1.6, ny - 8, 4, 1.4); ctx.restore();
    }
    K.danger(ctx, bx, by + bs * 0.5, 34, 0.18 + 0.25 * tell);
    ctx.save(); ctx.translate(shake, 0);
    // the crank on the wall side, turning
    const ca = t * (2 + tell * 10), hx = bx + side * (bs / 2 + 3), hy = by + bs * 0.5;
    ctx.strokeStyle = '#8a5e0c'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + side * 4, hy); ctx.lineTo(hx + side * 4 + Math.cos(ca) * 0.1, hy + Math.sin(ca) * 7); ctx.stroke();
    ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = 1; ctx.stroke();
    ball(ctx, hx + side * 4, hy + Math.sin(ca) * 7, 2.4, ['#ff9a8a', '#e94b3c', '#8a2018'], '#7a1c12', 0.3);
    // the box: red with a yellow diamond on each painted panel, a blue lid
    ctx.fillStyle = K.lg(ctx, bx - bs / 2, by, bx + bs / 2, by + bs, [TOY.red[0], TOY.red[1], TOY.red[2]]); rrect(ctx, bx - bs / 2, by, bs, bs, 2.5); ctx.fill();
    ctx.strokeStyle = TOY.red[3]; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = K.lg(ctx, bx, by + 6, bx, by + bs - 6, [TOY.yellow[0], TOY.yellow[1], TOY.yellow[2]]);
    ctx.beginPath(); ctx.moveTo(bx, by + 5); ctx.lineTo(bx + 10, by + bs / 2); ctx.lineTo(bx, by + bs - 5); ctx.lineTo(bx - 10, by + bs / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = TOY.yellow[3]; ctx.lineWidth = 0.8; ctx.stroke();
    star5(ctx, bx, by + bs / 2, 4.5); ctx.fillStyle = TOY.blue[1]; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(bx - bs / 2 + 2, by + 2, 1.2, bs - 4);
    for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.arc(bx + cx * (bs / 2 - 3), by + bs / 2 + cy * (bs / 2 - 3), 1.3, 0, TAU); ctx.fill(); }
    // light leaking from inside through the tell
    if (lid > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, bx, by, 22, ['rgba(255,230,150,.6)', 'rgba(255,200,100,0)']); ctx.fillRect(bx - 22, by - 22, 44, 30); ctx.restore(); }
    // spring + clown
    if (out > 0.01) {
      const ang = -PI / 2 - side * 1.22, L = 16 + 62 * out, ex = bx + Math.cos(ang) * L, ey = by + Math.sin(ang) * L + 2;
      ctx.save(); ctx.lineCap = 'round';
      const n = 16, px = Math.cos(ang + PI / 2), py = Math.sin(ang + PI / 2);
      const coil = (o) => { ctx.beginPath(); for (let k = 0; k <= n; k++) { const u = k / n, q = k === 0 || k === n ? 0 : (k % 2 ? 1 : -1); ctx.lineTo(lerp(bx, ex, u) + px * 6 * q + o, lerp(by + 2, ey, u) + py * 6 * q + o); } };
      ctx.lineJoin = 'round';
      coil(0.8); ctx.strokeStyle = 'rgba(20,20,40,.35)'; ctx.lineWidth = 2.6; ctx.stroke();
      coil(0); ctx.strokeStyle = '#5a626e'; ctx.lineWidth = 2.6; ctx.stroke();
      coil(-0.4); ctx.strokeStyle = '#e8eef6'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.restore();
      clown(ctx, ex, ey, side, t, c);
    }
    // the lid, hinged on the wall side
    ctx.save(); ctx.translate(bx + side * bs / 2, by); ctx.rotate(side * lid);
    ctx.fillStyle = K.lg(ctx, 0, -5, 0, 1, [TOY.blue[0], TOY.blue[1], TOY.blue[2]]); rrect(ctx, side < 0 ? 0 : -bs - 2, -5, bs + 2, 5, 1.5); ctx.fill();
    ctx.strokeStyle = TOY.blue[3]; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(side < 0 ? 2 : -bs, -4.2, bs - 2, 1);
    ctx.restore();
    ctx.restore();
  }

  function clown(ctx, x, y, side, t, c) {
    K.danger(ctx, x, y, 40, 0.4);
    const r = 12, bob = Math.sin(t * 9) * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(bob - side * 0.25);
    // ruff collar: scalloped frill
    for (let k = 0; k < 9; k++) { const a = PI * 0.15 + k * PI * 0.7 / 8; ctx.fillStyle = k % 2 ? '#ffffff' : '#ffb8d0'; ctx.beginPath(); ctx.arc(Math.cos(a) * 11, Math.sin(a) * 8 + 6, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c47a98'; ctx.lineWidth = 0.6; ctx.stroke(); }
    // jester hat: two floppy points with bells
    for (const d of [-1, 1]) {
      const tipx = d * 18, tipy = -14 + Math.sin(t * 7 + d) * 2;
      ctx.fillStyle = K.lg(ctx, 0, -r, tipx, tipy, d < 0 ? [TOY.blue[0], TOY.blue[1], TOY.blue[2]] : [TOY.red[0], TOY.red[1], TOY.red[2]]);
      ctx.beginPath(); ctx.moveTo(d * -2, -r + 2); ctx.quadraticCurveTo(d * 6, -r - 14, tipx, tipy); ctx.quadraticCurveTo(d * 10, -r - 2, d * r * 0.95, -r * 0.35); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = d < 0 ? TOY.blue[3] : TOY.red[3]; ctx.lineWidth = 0.9; ctx.stroke();
      ball(ctx, tipx, tipy + 2, 3, ['#fff6c0', '#f5c542', '#a8780e'], '#8a5e0c', 0.5);
    }
    // face
    ctx.fillStyle = K.rg(ctx, -4, -5, r * 1.4, ['#ffffff', '#f6eef0', '#d9c2cc']); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b08a9a'; ctx.lineWidth = 1; ctx.stroke();
    // blue diamond eye paint and rosy cheeks
    ctx.fillStyle = 'rgba(60,127,233,.6)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 4.5, -9.5); ctx.lineTo(d * 7, -4); ctx.lineTo(d * 4.5, 1); ctx.lineTo(d * 2, -4); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,110,130,.45)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 7.5, 3.5, 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    K.eyes(ctx, x - side * 0.5, y - 3.5, 4.4, 3, '#3c7fe9', -side * 0.7, 0.6);
    // grin with teeth and the red ball nose
    ctx.fillStyle = '#c42838'; ctx.beginPath(); ctx.moveTo(x - 7, y + 3.5); ctx.quadraticCurveTo(x, y + 13, x + 7, y + 3.5); ctx.quadraticCurveTo(x, y + 6.5, x - 7, y + 3.5); ctx.fill();
    ctx.strokeStyle = '#7a1c22'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = '#fff'; for (const d of [-3.4, -1.1, 1.2, 3.5]) ctx.fillRect(x + d - 0.9, y + 5, 1.8, 1.8);
    ball(ctx, x, y + 1, 3.6, ['#ffb0a0', '#ff3a3a', '#a01818'], '#7a1010', 0.6);
  }

  // a wind-up soldier, feet at (x, y), facing f (+1 right), stepping by phase ph
  function soldier(ctx, x, y, f, ph, t) {
    const step = Math.sin(ph), sw = step * 0.45;
    K.danger(ctx, x, y - 22, 36, 0.34);
    ctx.save(); ctx.translate(x, y + Math.abs(Math.cos(ph)) * -1); ctx.scale(f * 1.68, 1.68);
    ctx.lineCap = 'round';
    // legs (stiff toy swing) with dark brown boots
    for (const [d, a] of [[-1, sw], [1, -sw]]) {
      ctx.save(); ctx.translate(d * 1.6, -9); ctx.rotate(a);
      ctx.fillStyle = K.lg(ctx, -2, 0, 2, 0, [TOY.blue[0], TOY.blue[1], TOY.blue[2]]); ctx.fillRect(-1.8, 0, 3.6, 7);
      ctx.fillStyle = TOY.red[1]; ctx.fillRect(-0.4, 0, 0.9, 7);
      ctx.fillStyle = '#4a2a1a'; rrect(ctx, -2, 6.2, 5, 2.8, 1); ctx.fill();
      ctx.restore();
    }
    // body: red coat, white cross belts, gold buttons
    ctx.fillStyle = K.lg(ctx, -5, -20, 5, -8, [TOY.red[0], TOY.red[1], TOY.red[2]]); rrect(ctx, -4.8, -20, 9.6, 12, 2.4); ctx.fill();
    ctx.strokeStyle = TOY.red[3]; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = '#fff6ea'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-4, -19); ctx.lineTo(4, -9.5); ctx.moveTo(4, -19); ctx.lineTo(-4, -9.5); ctx.stroke();
    ctx.fillStyle = '#ffd86a'; for (const yy of [-17, -13.5]) { ctx.beginPath(); ctx.arc(2.2, yy, 0.8, 0, TAU); ctx.fill(); }
    ctx.fillStyle = TOY.blue[2]; ctx.fillRect(-4.8, -10.5, 9.6, 1.6);
    // the arm swinging, the rifle on the shoulder
    ctx.save(); ctx.translate(0, -18.5); ctx.rotate(-sw * 0.8);
    ctx.fillStyle = TOY.red[2]; rrect(ctx, -1.5, 0, 3, 7, 1.4); ctx.fill(); ctx.fillStyle = '#ffe6d0'; ctx.beginPath(); ctx.arc(0, 7.4, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3.5, -27); ctx.stroke();
    ctx.strokeStyle = '#c0c8d2'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(3.5, -27); ctx.lineTo(4.4, -30); ctx.stroke();
    // the head: peach face, rosy cheek, a tall glossy busby hat with a gold chinstrap
    ctx.fillStyle = K.rg(ctx, -1, -24, 5, ['#ffe9dc', '#f6c4a8', '#c88a6a']); ctx.beginPath(); ctx.arc(0, -23, 3.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,100,110,.55)'; ctx.beginPath(); ctx.arc(2.2, -22, 1.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a2a'; ctx.beginPath(); ctx.arc(2.2, -24, 0.8, 0, TAU); ctx.fill();
    ctx.fillStyle = K.lg(ctx, -4, -36, 4, -25, ['#5a6aa8', '#2a3466', '#1a2048']); rrect(ctx, -4.4, -36, 8.8, 11.5, 4); ctx.fill();
    ctx.strokeStyle = '#141a3a'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,215,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2.6, -27); ctx.quadraticCurveTo(-3, -33, -0.6, -34.6); ctx.stroke();
    ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -23, 4.2, 0.2, PI - 0.2); ctx.stroke();
    ctx.fillStyle = TOY.red[1]; ctx.beginPath(); ctx.ellipse(-3.8, -31, 1.2, 2.6, 0, 0, TAU); ctx.fill();
    // brass wind-up key on the back, turning
    const kw = Math.cos(t * 6 + ph * 0.3);
    ctx.save(); ctx.translate(-6.2, -15); ctx.fillStyle = '#c48a14'; ctx.fillRect(-1.6, -0.6, 2, 1.2);
    ctx.scale(1, 1); ctx.fillStyle = K.lg(ctx, -2, -5, 2, 5, ['#fff2a0', '#e8b030', '#8a5e0c']);
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-3, d * 3, 1.8 * Math.abs(kw) + 0.5, 2.8, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  }

  // the march: two soldiers in file along a shelf bridge, about-turn at each end (loop 4 s)
  function march(ctx, side, wallX, y, t, len) {
    toyShelf(ctx, wallX, wallX - side * len, y, 'blue');
    for (let k = 0; k < 2; k++) {
      const c = frac(t / 4) * 4, near = wallX - side * (14 + k * 0), far = wallX - side * (len - 10);
      // 0-1.6 march out, 1.6-2.0 about turn, 2.0-3.6 march back, 3.6-4 turn
      let u, f;
      if (c < 1.6) { u = c / 1.6; f = -side; } else if (c < 2) { u = 1; f = -side * Math.cos((c - 1.6) / 0.4 * PI); } else if (c < 3.6) { u = 1 - (c - 2) / 1.6; f = side; } else { u = 0; f = side * Math.cos((c - 3.6) / 0.4 * PI); }
      const off = k * 24 * (f * -side > 0 ? -1 : 1) * 0 + (k ? 24 : 0);
      const x = lerp(near, far, u) + side * (k ? 26 : 0) * (1 - u) - side * 0 + (k ? side * 26 * u : 0) * 0;
      const xx = k === 0 ? lerp(near - side * 36, far, u) : lerp(near, far + side * 36, u);
      const moving = (c < 1.6 || (c > 2 && c < 3.6)) ? 1 : 0;
      soldier(ctx, xx, y, Math.abs(f) < 0.15 ? 0.15 * Math.sign(f || 1) : f, moving ? t * 9 + k * PI : 0, t);
    }
  }

  // Spinning Top (loop 3.5 s): whirls by the wall, revs, zips out along its ledge and knocks you away, drifts back
  function spinTop(ctx, side, wallX, y, t) {
    const c = frac(t / 3.5) * 3.5, len = 84;
    toyShelf(ctx, wallX, wallX - side * len, y, 'yellow');
    const tell = sm(1.0, 1.6, c) * (1 - sm(1.7, 1.8, c));
    const go = c < 1.7 ? 0 : c < 2.0 ? sm(1.7, 2.0, c) : c < 2.6 ? 1 : 1 - sm(2.6, 3.4, c);
    const x = wallX - side * lerp(22, len - 8, go), spin = t * (14 + tell * 16 + go * 10);
    const tilt = Math.sin(t * 3.1) * 0.08 * (1 - tell) + (go > 0 && go < 1 ? -side * 0.08 : 0), ty = y - 1;
    // the push: rings at the tip
    if (c > 1.9 && c < 2.6) {
      const u = (c - 1.9) / 0.7;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 3; j++) { const uu = u - j * 0.15; if (uu <= 0 || uu > 1) continue; ctx.strokeStyle = `rgba(200,225,255,${(1 - uu) * 0.7})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, ty - 13, 18 + uu * 40, side < 0 ? -0.8 : PI - 0.8, side < 0 ? 0.8 : PI + 0.8); ctx.stroke(); }
      ctx.restore();
    }
    soft(ctx, x, ty - 12, 38, [150, 200, 255], 0.2 + 0.2 * tell + 0.15 * go);
    // dust and sparks under the tip as it revs
    for (let j = 0; j < 4; j++) { const u = frac(t * 3 + j / 4); if (tell + go < 0.2) break; twinkle(ctx, x + side * (4 + u * 12) * (j % 2 ? 1 : -1), ty - 1 - u * 5, 2.2 * (1 - u), (tell + go) * 0.9, [255, 230, 160]); }
    ctx.save(); ctx.translate(x, ty); ctx.rotate(tilt); ctx.scale(1.2, 1.2);
    // speed arcs round it
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.35 * tell})`; ctx.lineWidth = 1.2;
    for (const [ry, a0] of [[-11, 0], [-17, 1.6]]) { ctx.beginPath(); ctx.ellipse(0, ry, 19, 4, 0, a0 + spin * 0.3, a0 + spin * 0.3 + 1.6); ctx.stroke(); }
    ctx.restore();
    // body: a fat painted double cone
    const body = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(4, -2, 16, -8, 16, -13); ctx.bezierCurveTo(16, -18, 8, -22, 0, -22); ctx.bezierCurveTo(-8, -22, -16, -18, -16, -13); ctx.bezierCurveTo(-16, -8, -4, -2, 0, 0); ctx.closePath(); };
    body(); ctx.fillStyle = K.lg(ctx, -16, 0, 16, 0, [TOY.red[0], TOY.red[1], TOY.red[2]]); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // painted bands
    ctx.fillStyle = K.lg(ctx, -16, 0, 16, 0, [TOY.yellow[0], TOY.yellow[1], TOY.yellow[2]]); ctx.fillRect(-17, -15, 34, 4);
    ctx.fillStyle = K.lg(ctx, -16, 0, 16, 0, [TOY.blue[0], TOY.blue[1], TOY.blue[2]]); ctx.fillRect(-17, -7, 34, 3);
    // stars round the belly, swinging past as it spins
    for (let k = 0; k < 6; k++) {
      const a = spin + k * TAU / 6, cs = Math.cos(a); if (cs < 0) continue;
      const sx2 = Math.sin(a) * 14; ctx.save(); ctx.translate(sx2, -13); ctx.scale(Math.max(0.2, cs), 1); star5(ctx, 0, 0, 2.6); ctx.fillStyle = '#fff6e0'; ctx.fill(); ctx.restore();
    }
    // blur streaks once it is really going
    if (tell + go > 0.3) { ctx.fillStyle = `rgba(255,255,255,${0.12 * (tell + go)})`; for (let k = 0; k < 3; k++) { const yy = -19 + k * 6 + frac(spin) * 2; ctx.fillRect(-16, yy, 32, 1); } }
    ctx.fillStyle = K.lg(ctx, -16, 0, 16, 0, ['rgba(255,255,255,.25)', 'rgba(255,255,255,0)', 'rgba(60,10,10,.35)']); ctx.fillRect(-17, -23, 34, 24);
    ctx.restore();
    body(); ctx.strokeStyle = TOY.red[3]; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-12, -17); ctx.quadraticCurveTo(-8, -20.5, -2, -21); ctx.stroke();
    // wooden handle and steel tip
    ctx.fillStyle = K.lg(ctx, -2, 0, 2, 0, [TOY.wood[0], TOY.wood[1], TOY.wood[2]]); rrect(ctx, -2, -29, 4, 8, 1.6); ctx.fill();
    ctx.strokeStyle = TOY.wood[3]; ctx.lineWidth = 0.7; ctx.stroke();
    ball(ctx, 0, -29.5, 2.6, [TOY.wood[0], TOY.wood[1], TOY.wood[2]], TOY.wood[3], 0.4);
    ctx.fillStyle = '#c8d0da'; ctx.beginPath(); ctx.moveTo(-1.6, -1); ctx.lineTo(1.6, -1); ctx.lineTo(0, 1.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // the twist: a cracked block on the wall gets hit by a chili shot, pops out tumbling and reveals a coin nook
  function knockBlock(ctx, side, x, y, s, t) {
    const c = frac(t / 4) * 4;
    // the nook behind
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + s, ['#1e1222', '#3a2438']); ctx.fillRect(x, y, s, s);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, x + s / 2, y + s / 2, s * 0.7, ['rgba(255,210,110,.45)', 'rgba(255,190,80,0)']); ctx.fillRect(x, y, s, s); ctx.restore();
    if (c > 1.2 && c < 3.6) coin(ctx, x + s / 2, y + s / 2, t, 0.5, 6.5);
    // the chili shot streaking in, then a burst
    if (c > 0.6 && c < 1.0) {
      const u = (c - 0.6) / 0.4, sx2 = lerp(135, x + s / 2, u), sy2 = lerp(y + 120, y + s / 2, u);
      K.glow(ctx, sx2, sy2, 16, [255, 120, 40], 0.7);
      ctx.save(); ctx.translate(sx2, sy2); ctx.rotate(Math.atan2(y + s / 2 - y - 120, x + s / 2 - 135));
      ctx.fillStyle = K.lg(ctx, -8, 0, 6, 0, ['rgba(255,90,30,0)', '#ff5a2a', '#ffd06a']); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(4, -3); ctx.quadraticCurveTo(8, 0, 4, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8282a'; ctx.beginPath(); ctx.ellipse(2, 0, 4.4, 2.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#4cbf4a'; ctx.fillRect(5.6, -1, 2, 2);
      ctx.restore();
    }
    if (c > 1.0 && c < 1.4) { const u = (c - 1.0) / 0.4; K.glow(ctx, x + s / 2, y + s / 2, 26 * (0.5 + u), [255, 150, 60], 0.7 * (1 - u)); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; twinkle(ctx, x + s / 2 + Math.cos(a) * u * 22, y + s / 2 + Math.sin(a) * u * 22, 3, 1 - u, [255, 220, 140]); } }
    // the block: in place (cracked), tumbling out, or sliding back
    let bx = x, by = y, rot = 0, a = 1;
    if (c > 1.0 && c < 2.2) { const u = (c - 1.0); bx = x - side * u * 60; by = y - 30 * u + 160 * u * u; rot = -side * u * 5; a = 1 - sm(0.8, 1.2, u); }
    else if (c >= 2.2 && c < 3.4) a = 0;
    else if (c >= 3.4) { const u = sm(3.4, 3.9, c); bx = x + side * (1 - u) * s; a = u; }
    if (a > 0.01) {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(bx + s / 2, by + s / 2); ctx.rotate(rot);
      alphaBlock(ctx, -s / 2, -s / 2, s, 'yellow', '?', 'red');
      if (c < 1.0 || c >= 3.4) {
        const hot = c < 1.0 ? 0.4 + 0.4 * Math.sin(t * 8) : 0.3;
        ctx.strokeStyle = `rgba(255,170,80,${hot})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-s / 2 + 3, -4); ctx.lineTo(-2, 1); ctx.lineTo(3, -3); ctx.lineTo(s / 2 - 3, 4); ctx.moveTo(-2, 1); ctx.lineTo(0, s / 2 - 3); ctx.stroke();
        ctx.strokeStyle = 'rgba(60,20,10,.6)'; ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.restore();
    }
  }

  const TOYP = {
    bgTop: [106, 116, 156], bgBot: [44, 44, 80], far: [94, 104, 144], far2: [84, 92, 132],
    wall: [60, 40, 30], wallIn: [30, 20, 16], rim: [255, 214, 150], farShape: toyFar,
  };

  PV.sections['toybox'] = (ctx, w, h, t) => {
    K.shaft(ctx, w, h, t, TOYP, { inset: -14, wobble: 0 });
    // the warm lamp up top
    K.glow(ctx, w * 0.3, -10, 150, [255, 200, 130], 0.22);
    const base = 30, KB = [292, 320];
    const L = toyWall(ctx, -1, w, h, t, base, 17), R = toyWall(ctx, 1, w, h, t, base, 29, KB);
    knockBlock(ctx, 1, w - base - 2, KB[0], 28, t);
    for (const [x, y, ph] of [[w * 0.62, 70, 0], [w * 0.62, 92, 0.7], [w * 0.5, 168, 1.4], [w * 0.5, 190, 2.1], [w * 0.58, 290, 2.8]]) coin(ctx, x, y, t, ph);
    jackBox(ctx, -1, L(110), 110, t);
    march(ctx, 1, R(240), 240, t + 0.8, 126);
    spinTop(ctx, -1, L(330), 330, t + 1.6);
    K.rocket(ctx, w * 0.5, h * 0.8, 0.75, t);
    K.motes(ctx, w, h, t, 'dust', [255, 230, 190], 26, 21);
  };
  // ================================================================================================= MONKEY CARNIVAL
  const RED = ['#ff8a7e', '#d23a3a', '#8e1e22', '#6a1418'], CREAM = ['#fffaf0', '#f4e6cf', '#c9b494'], BLU = ['#8aa4ff', '#3a5ad2', '#22348a', '#18266a'];
  const GOLD = ['#fff2a8', '#ffcf3a', '#c48a14', '#8a5e0c'];
  // festoons of bulbs strung across the far tent (shared by the backdrop silhouette and the glow pass)
  function festoons(w, h) {
    const out = [];
    for (const [y, sag] of [[h * 0.2, 26], [h * 0.46, 20], [h * 0.7, 30]]) {
      for (let k = 0; k <= 12; k++) { const u = k / 12, x = -10 + u * (w + 20), yy = y + Math.sin(u * PI) * sag; out.push([x, yy, k]); }
    }
    return out;
  }
  function carnFar(ctx, w, h, t, layer, col) {
    if (layer === 0) {
      // the tent roof: stripes fanning from the king pole high above, bleachers far below
      const cx = w * 0.5, cy = -120;
      ctx.fillStyle = rgb(K.lift(col, 8));
      for (let k = -8; k <= 8; k += 2) { const a0 = PI / 2 + k * 0.09, a1 = a0 + 0.09; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * 900, cy + Math.sin(a0) * 900); ctx.lineTo(cx + Math.cos(a1) * 900, cy + Math.sin(a1) * 900); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = rgb(col);
      for (let k = 0; k < 5; k++) { const y = h - 18 - k * 14; ctx.beginPath(); ctx.ellipse(w * 0.5, y + 60, w * 0.9 - k * 8, 60, 0, PI, TAU); ctx.lineTo(w + 10, h + 10); ctx.lineTo(-10, h + 10); ctx.fill(); }
      // crowd heads along the top tier
      ctx.fillStyle = rgb(K.lift(col, -10));
      for (let x = 4; x < w; x += 9) { const y = h - 74 - Math.sin(x * 0.02) * 4 + Math.sin(t * 3 + x) * 0.8; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill(); }
    } else {
      // festoon wires, a trapeze swinging, the ring pole
      ctx.strokeStyle = rgb(col); ctx.lineWidth = 1;
      const F = festoons(w, h);
      ctx.beginPath(); F.forEach(([x, y, k], i) => k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
      const sw = Math.sin(t * 1.4) * 0.35, px = w * 0.62, py = -4, L = h * 0.3;
      ctx.lineWidth = 1.2;
      for (const d of [-9, 9]) { ctx.beginPath(); ctx.moveTo(px + d, py); ctx.lineTo(px + d + Math.sin(sw) * L, py + Math.cos(sw) * L); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 11 + Math.sin(sw) * L, py + Math.cos(sw) * L); ctx.lineTo(px + 11 + Math.sin(sw) * L, py + Math.cos(sw) * L); ctx.stroke();
      // a little acrobat silhouette hanging off it
      ctx.fillStyle = rgb(col); const ax = px + Math.sin(sw) * (L + 12), ay = py + Math.cos(sw) * (L + 12);
      ctx.beginPath(); ctx.arc(ax, ay + 6, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(ax, ay + 16, 4, 7, 0, 0, TAU); ctx.fill();
      ctx.fillRect(w * 0.18, h * 0.3, 5, h);
    }
  }

  // tent canvas walls: red-and-cream curtains swagged between tie-backs on a front pole, folds, a gold fringe,
  // rigging ropes and a chasing bulb string. Returns the curtain's inner edge e(y).
  function tentWall(ctx, side, w, h, t, base) {
    const P = 116, off = side < 0 ? 18 : 74, B = 10;
    const uOf = y => frac((y + off) / P), e = y => base + B * Math.sin(PI * uOf(y));
    const X = (y, f) => side < 0 ? -6 + (e(y) + 6) * f : w + 6 - (e(y) + 6) * f;
    const NS = 5, ys = []; for (let y = -6; y <= h + 6; y += 5) ys.push(y);
    // stripes following the gathers
    for (let k = 0; k < NS; k++) {
      ctx.beginPath();
      for (const y of ys) ctx.lineTo(X(y, k / NS), y);
      for (let i = ys.length - 1; i >= 0; i--) ctx.lineTo(X(ys[i], (k + 1) / NS), ys[i]);
      ctx.closePath(); ctx.fillStyle = k % 2 ? CREAM[1] : RED[1]; ctx.fill();
    }
    // folds: a shadow furrow and a lit ridge inside every stripe, bending with the gathers
    for (const [f0, col, lw] of [[0.72, 'rgba(90,14,30,.26)', 2.4], [0.3, 'rgba(255,248,236,.34)', 1.4], [0.04, 'rgba(70,10,24,.25)', 1]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let k = 0; k < NS; k++) { ys.forEach((y, i) => i ? ctx.lineTo(X(y, (k + f0) / NS), y) : ctx.moveTo(X(y, (k + f0) / NS), y)); }
      ctx.stroke();
    }
    // depth: darker toward the screen edge, gathered shade at each tie-back, sheen mid-swag
    ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? base + B : w - base - B, 0, ['rgba(40,8,24,.36)', 'rgba(40,8,24,.08)', 'rgba(40,8,24,0)']);
    ctx.fillRect(side < 0 ? -6 : w - base - B - 2, -2, base + B + 8, h + 4);
    for (let y0 = -off; y0 < h + P; y0 += P) {
      ctx.fillStyle = K.lg(ctx, 0, y0, 0, y0 + P, [[0, 'rgba(40,8,24,.38)'], [0.2, 'rgba(40,8,24,0)'], [0.5, 'rgba(255,230,210,.1)'], [0.8, 'rgba(40,8,24,0)'], [1, 'rgba(40,8,24,.38)']]);
      ctx.fillRect(side < 0 ? -6 : w - base - B - 2, y0, base + B + 8, P);
    }
    // rigging ropes slung across the canvas to the tie-backs
    ctx.save(); ctx.lineCap = 'round';
    for (let y0 = -off + P; y0 < h + P; y0 += P * 2) {
      const xa = side < 0 ? 0 : w, xb = side < 0 ? base : w - base;
      const rope = () => { ctx.beginPath(); ctx.moveTo(xa, y0 - 70); ctx.quadraticCurveTo((xa + xb) / 2, y0 - 20, xb, y0); };
      rope(); ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2.6; ctx.stroke();
      rope(); ctx.setLineDash([2, 2.4]); ctx.strokeStyle = '#d9b07a'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    // gold fringe along the hem
    ctx.strokeStyle = GOLD[2]; ctx.lineWidth = 2.2; ctx.beginPath(); ys.forEach((y, i) => i ? ctx.lineTo(X(y, 1) - side * 1, y) : ctx.moveTo(X(y, 1) - side * 1, y)); ctx.stroke();
    ctx.strokeStyle = GOLD[0]; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,207,58,.75)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let y = -4; y < h + 4; y += 3) { const x = X(y, 1); ctx.moveTo(x, y); ctx.lineTo(x - side * 3.5, y + 1.5); }
    ctx.stroke();
    // the pole at the tie-back line, brass bands
    const px = side < 0 ? base : w - base;
    ctx.fillStyle = K.lg(ctx, px - 4, 0, px + 4, 0, ['#6e3a14', '#d9a066', '#f2d2a0', '#a8641e']); ctx.fillRect(px - 3.5, -2, 7, h + 4);
    ctx.strokeStyle = '#4e2a0e'; ctx.lineWidth = 0.8; ctx.strokeRect(px - 3.5, -2, 7, h + 4);
    for (let y0 = -off; y0 < h + P; y0 += P) {
      // the tie-back: a gold cord wrapped round the pole with a tassel
      ctx.fillStyle = K.lg(ctx, px - 6, 0, px + 6, 0, [GOLD[2], GOLD[0], GOLD[1], GOLD[3]]); rrect(ctx, px - 6, y0 - 3, 12, 6, 2.5); ctx.fill();
      ctx.strokeStyle = GOLD[3]; ctx.lineWidth = 0.7; ctx.stroke();
      const sw = Math.sin(t * 1.6 + y0) * 1.2;
      ctx.strokeStyle = GOLD[1]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - side * 4, y0 + 2); ctx.lineTo(px - side * 6 + sw, y0 + 9); ctx.stroke();
      ctx.fillStyle = K.lg(ctx, 0, y0 + 8, 0, y0 + 17, [GOLD[0], GOLD[1], GOLD[2]]); ctx.beginPath(); ctx.moveTo(px - side * 6 + sw - 1.5, y0 + 9); ctx.lineTo(px - side * 6 + sw + 1.5, y0 + 9); ctx.lineTo(px - side * 6 + sw + 3, y0 + 17); ctx.lineTo(px - side * 6 + sw - 3, y0 + 17); ctx.closePath(); ctx.fill();
    }
    // the bulb string swagged down the curtain hem, chasing
    for (let k = 0; k < h / 26 + 1; k++) {
      const y = k * 26 + 12, bx = X(y, 1) - side * 1, on = 0.35 + 0.65 * Math.max(0, Math.cos((k * 0.9 - t * 6) % TAU));
      const c = k % 3 === 0 ? [255, 210, 90] : k % 3 === 1 ? [255, 120, 100] : [255, 240, 200];
      K.glow(ctx, bx, y, 11, c, 0.3 * on);
      ctx.fillStyle = K.rg(ctx, bx - 0.8, y - 0.8, 3.4, [rgb(K.lift(c, 40)), rgb(c), rgb(K.lift(c, -90))]); ctx.beginPath(); ctx.arc(bx, y, 2.4, 0, TAU); ctx.fill();
    }
    return e;
  }

  // set pieces jutting into the shaft
  function pennants(ctx, x0, y0, x1, y1, sag, t) {
    const n = 7, CC = [RED, BLU, GOLD, CREAM];
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + sag * 4 * u * (1 - u) * 2 * 0.5 * 2, fl = Math.sin(t * 4 + k) * 1.4, C = CC[k % 4];
      ctx.fillStyle = K.lg(ctx, x - 4, y, x + 4, y + 10, [C[0], C[1], C[2]]); ctx.beginPath(); ctx.moveTo(x - 4.2, y); ctx.lineTo(x + 4.2, y); ctx.lineTo(x + fl, y + 11); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C[3] || C[2]; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }
  function crates(ctx, side, wallX, y) {
    for (const [dx, dy, s, rot] of [[0, 0, 30, 0], [-4, -26, 24, -0.06]]) {
      const x = side < 0 ? wallX - 8 + dx : wallX + 8 - dx - s, yy = y + dy;
      ctx.save(); ctx.translate(x + s / 2, yy + s / 2); ctx.rotate(rot); ctx.translate(-s / 2, -s / 2);
      K.shadow(ctx, s / 2, s + 2, s * 0.6, 4, 0.4);
      ctx.fillStyle = K.lg(ctx, 0, 0, s, s, [TOY.wood[0], TOY.wood[1], TOY.wood[2]]); ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(90,50,20,.55)'; ctx.lineWidth = 0.6; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, k * s / 4); ctx.lineTo(s, k * s / 4); ctx.stroke(); }
      ctx.fillStyle = K.lg(ctx, 0, 0, s, s, [TOY.wood[1], TOY.wood[2]]); ctx.fillRect(0, 0, s, 3); ctx.fillRect(0, s - 3, s, 3); ctx.fillRect(0, 0, 3, s); ctx.fillRect(s - 3, 0, 3, s);
      star5(ctx, s / 2, s / 2, s * 0.22); ctx.fillStyle = 'rgba(210,58,58,.85)'; ctx.fill();
      ctx.strokeStyle = TOY.wood[3]; ctx.lineWidth = 0.9; ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
      ctx.fillStyle = 'rgba(255,240,210,.5)'; ctx.fillRect(3, 3, s - 6, 0.9);
      ctx.restore();
    }
  }
  function pedestal(ctx, x, y, wd) {
    K.shadow(ctx, x, y + 2, wd * 0.6, 5, 0.45);
    const hh = 22, x0 = x - wd / 2;
    ctx.fillStyle = K.lg(ctx, x0, 0, x0 + wd, 0, [RED[2], RED[0], RED[1], RED[3]]); ctx.fillRect(x0, y - hh, wd, hh);
    for (let k = 0; k < 3; k++) { star5(ctx, x0 + wd * (0.2 + k * 0.3), y - hh / 2, 3.6); ctx.fillStyle = GOLD[1]; ctx.fill(); }
    for (const yy of [y - hh, y - 3]) { ctx.fillStyle = K.lg(ctx, x0 - 1, 0, x0 + wd + 1, 0, [GOLD[2], GOLD[0], GOLD[3]]); ctx.fillRect(x0 - 1, yy - 1.5, wd + 2, 4); }
    ctx.fillStyle = K.lg(ctx, 0, y - hh - 5, 0, y - hh + 3, [CREAM[0], CREAM[1], CREAM[2]]); ctx.beginPath(); ctx.ellipse(x, y - hh - 1, wd / 2 + 1, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = CREAM[2]; ctx.lineWidth = 0.7; ctx.stroke();
    // a striped ball resting on it
    ball(ctx, x + 2, y - hh - 11, 9, [BLU[0], BLU[1], BLU[2]], BLU[3], 0.5);
    ctx.save(); ctx.beginPath(); ctx.arc(x + 2, y - hh - 11, 9, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(255,207,58,.9)'; ctx.fillRect(x - 8, y - hh - 13, 20, 4); ctx.restore();
  }
  function hoop(ctx, x, y, side, t) {
    const sw = Math.sin(t * 1.2) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.fillStyle = '#c0c8d2'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD[3]; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(-side * 13, 15, 13, 15, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = GOLD[1]; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = RED[1]; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(-side * 13, 15, 13, 15, 0, PI * 1.1, PI * 1.5); ctx.stroke();
    ctx.restore();
  }

  function poster(ctx, x, y, rot, kind, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    K.shadow(ctx, 1.5, 2, 14, 18, 0.35);
    ctx.fillStyle = K.lg(ctx, -10, -14, 10, 14, ['#fff8e6', '#f4e2c0', '#d9c29a']);
    ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(10, -14); ctx.lineTo(10, 10); ctx.lineTo(6, 14); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = RED[1]; ctx.lineWidth = 1.4; ctx.strokeRect(-8, -12, 16, 24);
    if (kind === 0) {
      // a monkey's face and a star
      ctx.fillStyle = '#8a5432'; ctx.beginPath(); ctx.arc(0, -3, 5.4, 0, TAU); ctx.arc(-5.6, -4, 2.2, 0, TAU); ctx.arc(5.6, -4, 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2c89a'; ctx.beginPath(); ctx.ellipse(0, -2, 3.8, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a1a1a'; ctx.fillRect(-1.8, -3.4, 1, 1.2); ctx.fillRect(0.8, -3.4, 1, 1.2);
      star5(ctx, 0, 7.5, 3.4); ctx.fillStyle = GOLD[1]; ctx.fill();
    } else {
      // a cannon and a flying monkey
      ctx.fillStyle = BLU[1]; ctx.save(); ctx.rotate(-0.6); ctx.fillRect(-7, 4, 10, 4); ctx.restore();
      ctx.fillStyle = '#8a5432'; ctx.beginPath(); ctx.arc(3, -5, 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = GOLD[1]; ctx.lineWidth = 0.8; ctx.setLineDash([1.5, 1.5]); ctx.beginPath(); ctx.moveTo(-3, 2); ctx.quadraticCurveTo(-2, -6, 1, -6); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(160,30,30,.8)'; ctx.fillRect(-7, 10, 14, 1.4);
    ctx.fillStyle = K.rg(ctx, -0.5, -13.5, 2, ['#ffb0a0', '#d23a3a']); ctx.beginPath(); ctx.arc(0, -13, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // an island monkey: brown fur, tan face, big ears, the game's eyes
  function monkeyHead(ctx, x, y, r, look, t, helmet, mood = 0) {
    for (const d of [-1, 1]) {
      ctx.fillStyle = K.rg(ctx, x + d * r - 1, y - 1, r * 0.5, ['#c08050', '#7a4422']); ctx.beginPath(); ctx.arc(x + d * r * 0.98, y, r * 0.42, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2b890'; ctx.beginPath(); ctx.arc(x + d * r * 0.98, y, r * 0.24, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = K.rg(ctx, x - r * 0.35, y - r * 0.4, r * 1.4, ['#c48a5a', '#8a5030', '#5a3018']); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a2410'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = K.rg(ctx, x - r * 0.2, y - r * 0.1, r, ['#fff0dc', '#f6cfa4', '#d9a070']);
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.05); ctx.bezierCurveTo(x - r * 0.25, y - r * 0.55, x - r * 0.85, y - r * 0.45, x - r * 0.75, y + r * 0.1);
    ctx.bezierCurveTo(x - r * 0.75, y + r * 0.85, x + r * 0.75, y + r * 0.85, x + r * 0.75, y + r * 0.1); ctx.bezierCurveTo(x + r * 0.85, y - r * 0.45, x + r * 0.25, y - r * 0.55, x, y - r * 0.05); ctx.fill();
    K.eyes(ctx, x + look * r * 0.1, y - r * 0.05, r * 0.33, r * 0.25, '#8a5a20', look, mood);
    ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x + look * r * 0.1, y + r * 0.35, r * 0.25, 0.2, PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#6a3018'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * r * 0.1 + look * r * 0.1, y + r * 0.2, r * 0.05, 0, TAU); ctx.fill(); }
    if (helmet) {
      ctx.fillStyle = K.rg(ctx, x - r * 0.4, y - r * 0.9, r * 1.3, [RED[0], RED[1], RED[2]]); ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 1.02, PI * 1.05, TAU - PI * 0.05); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = RED[3]; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = GOLD[1]; ctx.fillRect(x - r * 0.15, y - r * 1.15, r * 0.3, r * 0.9);
      star5(ctx, x, y - r * 0.62, r * 0.22); ctx.fillStyle = GOLD[0]; ctx.fill();
      K.sheen(ctx, x, y - r * 0.2, r, 0.5, 3.6, 4.6);
    }
    K.sheen(ctx, x, y, r, helmet ? 0 : 0.3);
  }

  // Monkey Cannon (loop 4 s): swivels, a monkey waves from the muzzle, ducks in, BOOM, flies across into a net
  function monkeyCannon(ctx, wallL, wallR, y, t) {
    const CS = 1.45, c = frac(t / 4) * 4, px = wallL + 14, py = y;
    const tell = sm(1.2, 1.8, c) * (1 - sm(1.9, 1.95, c));
    const aim = c < 1.2 ? -0.32 + Math.sin(c * 2.6) * 0.18 : c < 1.9 ? lerp(-0.32 + Math.sin(1.2 * 2.6) * 0.18, -0.22, sm(1.2, 1.5, c)) : c < 3 ? -0.22 : lerp(-0.22, -0.32, sm(3, 4, c));
    const recoil = c > 1.9 && c < 2.4 ? (1 - (c - 1.9) / 0.5) * 6 : 0;
    // the net on the far wall
    const nx = wallR - 2, ny = y - 56, land = sm(2.42, 2.5, c) * (1 - sm(2.6, 3.0, c));
    ctx.save(); ctx.translate(nx, ny); ctx.scale(1.45, 1.45);
    ctx.strokeStyle = 'rgba(255,240,220,.6)'; ctx.lineWidth = 0.7;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0, k * 5); ctx.quadraticCurveTo(-10 - land * 8, k * 5, -16 + Math.abs(k) * 1.5 - land * 6 * (1 - Math.abs(k) / 4), k * 5 + 2); ctx.stroke(); }
    for (let j = 1; j <= 3; j++) { ctx.beginPath(); for (let k = -3; k <= 3; k++) ctx.lineTo(-j * 5 - land * j * 2 * (1 - Math.abs(k) / 4), k * 5 + j * 0.6); ctx.stroke(); }
    ctx.strokeStyle = GOLD[2]; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(-8, 0, 9, 17, 0, PI * 0.5, PI * 1.5); ctx.stroke();
    ctx.strokeStyle = GOLD[0]; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
    const L = 40, mx = px + Math.cos(aim) * (L - recoil) * CS, my = py + Math.sin(aim) * (L - recoil) * CS;
    K.danger(ctx, mx, my, 46, 0.2 + 0.35 * tell);
    // the monkey in the muzzle (behind the barrel rim)
    const inside = c < 1.2 || c > 3.2;
    if (inside || (c < 1.9 && tell < 1)) {
      const pop = c > 3.2 ? sm(3.2, 3.5, c) : 1 - sm(1.2, 1.7, c) * 0.85;
      const d = (1 + 8 * pop) * CS, hx = mx + Math.cos(aim) * d, hy = my + Math.sin(aim) * d - 5 * pop;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(CS, CS); ctx.translate(-hx, -hy);
      if (pop > 0.6) { const wv = Math.sin(t * 10) * 0.5; ctx.save(); ctx.translate(hx + 5, hy + 2); ctx.rotate(-0.5 + wv); ctx.fillStyle = '#8a5030'; rrect(ctx, -1.6, -11, 3.2, 11, 1.6); ctx.fill(); ctx.fillStyle = '#f2b890'; ctx.beginPath(); ctx.arc(0, -11.5, 2.3, 0, TAU); ctx.fill(); ctx.restore(); }
      monkeyHead(ctx, hx, hy, 7.5, -0.3, t, true, tell);
      ctx.restore();
    }
    // barrel: blue with gold stars and red bands, flared muzzle
    ctx.save(); ctx.translate(px, py); ctx.rotate(aim); ctx.scale(CS, CS); ctx.translate(-recoil, 0);
    ctx.fillStyle = K.lg(ctx, 0, -11, 0, 11, [BLU[0], BLU[1], BLU[2]]);
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(L - 6, -10); ctx.quadraticCurveTo(L, -13, L + 1, -12); ctx.lineTo(L + 1, 12); ctx.quadraticCurveTo(L, 13, L - 6, 10); ctx.lineTo(-6, 9); ctx.quadraticCurveTo(-12, 0, -6, -9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = BLU[3]; ctx.lineWidth = 1; ctx.stroke();
    for (const bx2 of [6, L - 8]) { ctx.fillStyle = K.lg(ctx, 0, -11, 0, 11, [RED[0], RED[1], RED[2]]); ctx.fillRect(bx2, -10.5, 4, 21); ctx.strokeStyle = RED[3]; ctx.lineWidth = 0.7; ctx.strokeRect(bx2, -10.5, 4, 21); }
    for (const [sx2, sy2] of [[18, -3], [26, 4], [22, -6]]) { star5(ctx, sx2, sy2, 2.6); ctx.fillStyle = GOLD[1]; ctx.fill(); }
    ctx.fillStyle = K.lg(ctx, L - 2, -13, L - 2, 13, [GOLD[0], GOLD[1], GOLD[2]]); ctx.beginPath(); ctx.ellipse(L, 0, 3, 12.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1e1430'; ctx.beginPath(); ctx.ellipse(L + 0.6, 0, 1.8, 9.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, -6.5); ctx.lineTo(L - 10, -7.5); ctx.stroke();
    // the fuse, fizzing through the tell
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-13, -8, -11, -13); ctx.stroke();
    if (tell > 0.05) { const fx = -11, fy = -13 + tell * 6; K.glow(ctx, fx, fy, 10, [255, 180, 60], 0.8 * tell); for (let k = 0; k < 4; k++) { const a = t * 20 + k * 1.6; twinkle(ctx, fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 2, tell); } }
    ctx.restore();
    // the gold bracket on the wall
    ctx.fillStyle = K.lg(ctx, wallL - 8, 0, px, 0, [GOLD[3], GOLD[1]]); ctx.fillRect(wallL - 8, py - 3.5, px - wallL + 4, 7);
    ctx.strokeStyle = GOLD[3]; ctx.lineWidth = 0.8; ctx.strokeRect(wallL - 8, py - 3.5, px - wallL + 4, 7);
    ctx.fillStyle = K.rg(ctx, px - 3, py - 3, 11, [GOLD[0], GOLD[1], GOLD[3]]); ctx.beginPath(); ctx.arc(px, py, 8.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD[3]; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = GOLD[0]; ctx.beginPath(); ctx.arc(px - 2, py - 2, 2, 0, TAU); ctx.fill();
    // BOOM: flash and smoke puffs
    if (c > 1.9 && c < 2.7) {
      const u = (c - 1.9) / 0.8, fx = px + Math.cos(aim) * (L + 4) * CS, fy = py + Math.sin(aim) * (L + 4) * CS;
      if (u < 0.25) { K.glow(ctx, fx, fy, 50, [255, 220, 120], 0.9 * (1 - u * 4)); star5(ctx, fx + 5, fy, 17 * (1 - u * 2), 8 * (1 - u * 2), t); ctx.fillStyle = `rgba(255,240,180,${1 - u * 4})`; ctx.fill(); }
      for (let k = 0; k < 4; k++) { const a = aim + (k - 1.5) * 0.5, d = 8 + u * 24; ctx.fillStyle = `rgba(240,230,240,${0.6 * (1 - u)})`; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * d, fy + Math.sin(a) * d - u * 10, 5 + u * 8, 0, TAU); ctx.fill(); }
    }
    // the flying monkey: curled up, helmet on, spinning, a trail of stars
    if (c > 1.9 && c < 2.95) {
      const u = clamp((c - 1.9) / 0.55, 0, 1), sx0 = px + Math.cos(-0.22) * (L + 4) * CS, sy0 = py + Math.sin(-0.22) * (L + 4) * CS;
      const fxp = lerp(sx0, nx - 18, u), fyp = lerp(sy0, ny, u) - Math.sin(u * PI) * 16;
      const fade = 1 - sm(2.7, 2.95, c);
      for (let k = 1; k < 6; k++) { const uu = u - k * 0.06; if (uu < 0) break; twinkle(ctx, lerp(sx0, nx - 18, uu), lerp(sy0, ny, uu) - Math.sin(uu * PI) * 16 + (k % 2 ? 4 : -4), 4.6 - k * 0.6, fade * (1 - k * 0.15), k % 2 ? [255, 220, 120] : [255, 150, 160]); }
      K.danger(ctx, fxp, fyp, 44, 0.42 * fade);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(fxp, fyp); ctx.rotate(u < 1 ? c * 14 : 0.3); ctx.scale(1.8, 1.8);
      ctx.fillStyle = K.rg(ctx, -3, -3, 12, ['#c48a5a', '#8a5030', '#5a3018']); ctx.beginPath(); ctx.arc(0, 2, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a2410'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = '#8a5030'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 2, 12, 0.3, 1.8); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = fade; monkeyHead(ctx, fxp + 1, fyp - 10, 11.5, 1, t, true, 0); ctx.restore();
    }
  }

  // Target Wheel (loop 3.6 s): spins on the wall, revs with flashing bulbs, shoots out star-tipped spokes, pulls them in
  function targetWheel(ctx, side, wallX, y, t) {
    const c = frac(t / 3.6) * 3.6, r = 24, cx = wallX - side * 6;
    const tell = sm(1.0, 1.6, c) * (1 - sm(2.7, 3.2, c));
    const ext = c < 1.5 ? 0.08 + tell * 0.1 : c < 1.75 ? lerp(0.18, 1, sm(1.5, 1.75, c)) : c < 2.6 ? 1 : lerp(1, 0.08, sm(2.6, 3.3, c));
    const rot = t * (1.4 + 3.5 * tell);
    const reach = r + 60 * ext;
    K.danger(ctx, cx - side * 10, y, reach + 10, 0.16 + 0.22 * ext);
    // spokes (behind the face): striped poles with gold star tips
    for (let k = 0; k < 4; k++) {
      const a = rot + k * PI / 2, ex = cx + Math.cos(a) * reach, ey = y + Math.sin(a) * reach;
      ctx.save(); ctx.translate(cx, y); ctx.rotate(a);
      ctx.fillStyle = K.lg(ctx, 0, -2.6, 0, 2.6, [BLU[0], BLU[1], BLU[2]]); ctx.fillRect(r - 4, -2.4, reach - r, 4.8);
      ctx.fillStyle = GOLD[1]; for (let x = r; x < reach - 4; x += 8) ctx.fillRect(x, -2.4, 3, 4.8);
      ctx.strokeStyle = BLU[3]; ctx.lineWidth = 0.7; ctx.strokeRect(r - 4, -2.4, reach - r, 4.8);
      ctx.restore();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + PI / 2);
      star5(ctx, 0, 0, 6.5, 3); ctx.fillStyle = K.rg(ctx, -2, -2, 7, [GOLD[0], GOLD[1], GOLD[2]]); ctx.fill(); ctx.strokeStyle = GOLD[3]; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
    // the target face
    ctx.save(); ctx.translate(cx, y);
    const rings = [[r, RED], [r * 0.8, CREAM], [r * 0.6, RED], [r * 0.4, CREAM], [r * 0.22, BLU]];
    for (const [rr, C] of rings) { ctx.fillStyle = K.rg(ctx, -rr * 0.3, -rr * 0.4, rr * 1.4, [C[0], C[1], C[2]]); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = RED[3]; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    // a painted swirl on the rings so the spin reads
    ctx.save(); ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, k * PI / 2, k * PI / 2 + 0.6); ctx.stroke(); }
    ctx.fillStyle = GOLD[1]; star5(ctx, 0, 0, r * 0.18, r * 0.08); ctx.fill();
    ctx.restore();
    // bulbs round the rim: chasing, flashing red through the tell
    for (let k = 0; k < 12; k++) {
      const a = k * TAU / 12 + rot * 0.3, bx = Math.cos(a) * (r + 2.5), by = Math.sin(a) * (r + 2.5);
      const on = tell > 0.3 ? (Math.sin(t * 22) > 0 ? 1 : 0.4) : 0.4 + 0.6 * Math.max(0, Math.cos(k * 0.8 - t * 5));
      const col = tell > 0.3 ? [255, 90, 90] : [255, 230, 150];
      K.glow(ctx, bx, by, 8, col, 0.5 * on);
      ctx.fillStyle = K.rg(ctx, bx - 0.5, by - 0.5, 2.4, [rgb(K.lift(col, 30)), rgb(K.lift(col, -60))]); ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, TAU); ctx.fill();
    }
    K.sheen(ctx, 0, 0, r, 0.45);
    ctx.restore();
  }

  // a juggling pin
  function pin(ctx, x, y, a, s = 1, hot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    if (hot > 0) K.danger(ctx, 0, 0, 16, 0.4 * hot);
    const path = () => { ctx.beginPath(); ctx.moveTo(0, -9); ctx.bezierCurveTo(2.2, -9, 2, -5, 1.4, -3.5); ctx.bezierCurveTo(4.6, -1, 4.4, 6, 2.4, 8); ctx.lineTo(-2.4, 8); ctx.bezierCurveTo(-4.4, 6, -4.6, -1, -1.4, -3.5); ctx.bezierCurveTo(-2, -5, -2.2, -9, 0, -9); ctx.closePath(); };
    path(); ctx.fillStyle = K.lg(ctx, -4, 0, 4, 0, ['#ffffff', '#f4ecec', '#c9b8bc']); ctx.fill();
    ctx.save(); path(); ctx.clip(); ctx.fillStyle = RED[1]; ctx.fillRect(-5, -4.6, 10, 1.6); ctx.fillRect(-5, -2.4, 10, 1); ctx.fillStyle = BLU[1]; ctx.fillRect(-5, 3, 10, 1.4); ctx.restore();
    path(); ctx.strokeStyle = '#8a7478'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-2, 1); ctx.quadraticCurveTo(-2.6, 4, -1.6, 6); ctx.stroke();
    ctx.restore();
  }

  // Juggling Pins (loop 3.2 s): a monkey on a drum keeps three pins going, winds up and lobs one across the shaft
  function juggler(ctx, side, wallX, y, wallFar, t) {
    const JS = 1.35; ctx.save(); ctx.translate(wallX, y); ctx.scale(JS, JS); ctx.translate(-wallX, -y);
    wallFar = wallX + (wallFar - wallX) / JS;
    const c = frac(t / 3.2) * 3.2, dx = wallX - side * 22;
    // the drum stool on a bracket
    ctx.fillStyle = K.lg(ctx, 0, y, 0, y + 10, [TOY.wood[1], TOY.wood[3]]); ctx.beginPath(); ctx.moveTo(wallX, y + 8); ctx.lineTo(dx, y + 8); ctx.lineTo(wallX, y + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.lg(ctx, dx - 14, 0, dx + 14, 0, [RED[2], RED[0], RED[1], RED[3]]); ctx.fillRect(dx - 14, y - 6, 28, 14);
    ctx.strokeStyle = GOLD[1]; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(dx - 14 + k * 28 / 6, y - 5 + (k % 2) * 12); ctx.stroke();
    for (const yy of [y - 6, y + 8]) { ctx.fillStyle = K.lg(ctx, dx - 15, 0, dx + 15, 0, [GOLD[2], GOLD[0], GOLD[3]]); ctx.fillRect(dx - 15, yy - 1.5, 30, 3); }
    ctx.fillStyle = CREAM[1]; ctx.beginPath(); ctx.ellipse(dx, y - 7, 14, 3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = CREAM[2]; ctx.lineWidth = 0.7; ctx.stroke();
    const tell = sm(1.6, 2.2, c) * (1 - sm(2.25, 2.3, c));
    const throwU = c > 2.25 ? clamp((c - 2.25) / 0.85, 0, 1) : -1;
    // the monkey: body, tail curling, arms up juggling
    const mx = dx, my = y - 17;
    ctx.strokeStyle = '#7a4422'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx + side * 5, my + 6); ctx.bezierCurveTo(mx + side * 16, my + 8, mx + side * 16, my - 8, mx + side * 10, my - 8); ctx.stroke();
    ctx.fillStyle = K.rg(ctx, mx - 2, my - 2, 10, ['#c48a5a', '#8a5030', '#5a3018']); ctx.beginPath(); ctx.ellipse(mx, my + 3, 6.5, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c89a'; ctx.beginPath(); ctx.ellipse(mx, my + 5, 3.6, 5, 0, 0, TAU); ctx.fill();
    // a little red waistcoat
    ctx.fillStyle = RED[1]; ctx.beginPath(); ctx.moveTo(mx - 6, my - 1); ctx.lineTo(mx - 2.5, my - 1); ctx.lineTo(mx - 3.4, my + 8); ctx.lineTo(mx - 6.2, my + 6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(mx + 6, my - 1); ctx.lineTo(mx + 2.5, my - 1); ctx.lineTo(mx + 3.4, my + 8); ctx.lineTo(mx + 6.2, my + 6); ctx.closePath(); ctx.fill();
    const wind = tell, armA = (d) => (d === -side ? -2.2 - wind * 1.4 + (throwU >= 0 && throwU < 0.2 ? 2.6 : 0) : -2.3) + Math.sin(t * 9 + d) * 0.25 * (1 - wind);
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(mx + d * 5, my); ctx.rotate(d < 0 ? armA(d) : PI - armA(d) * -1 - PI);
      ctx.strokeStyle = '#8a5030'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.fillStyle = '#f2b890'; ctx.beginPath(); ctx.arc(10, 0, 1.9, 0, TAU); ctx.fill(); ctx.restore();
    }
    monkeyHead(ctx, mx, my - 10, 7, -side * 0.6 * tell, t, false, tell * 0.8);
    // a tiny fez
    ctx.fillStyle = K.lg(ctx, mx - 3, my - 22, mx + 3, my - 16, [RED[0], RED[1], RED[2]]); ctx.beginPath(); ctx.moveTo(mx - 3.2, my - 15.5); ctx.lineTo(mx - 2.4, my - 21); ctx.lineTo(mx + 2.4, my - 21); ctx.lineTo(mx + 3.2, my - 15.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD[1]; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(mx, my - 21); ctx.quadraticCurveTo(mx + 3, my - 22, mx + 3.5, my - 18); ctx.stroke();
    // the cascade over its head (two pins while one is in the air across the shaft)
    const n = throwU >= 0 && throwU < 1 ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const u = frac(t * 0.9 + k / n), px2 = mx + Math.cos(u * TAU) * 10, py2 = my - 26 - Math.abs(Math.sin(u * PI)) * 14;
      pin(ctx, px2, py2, u * TAU * 2, 0.9, 0.5);
    }
    // the lob: a high arc across the shaft, tumbling, then away down past the far wall
    if (throwU >= 0) {
      const sx0 = mx - side * 8, sy0 = my - 12, ex = wallFar + side * 14, ey = y + 50;
      const px2 = lerp(sx0, ex, throwU), py2 = lerp(sy0, ey, throwU) - Math.sin(throwU * PI) * 70;
      for (let k = 1; k < 5; k++) { const uu = throwU - k * 0.04; if (uu < 0) break; ctx.fillStyle = `rgba(255,220,220,${0.3 - k * 0.06})`; ctx.beginPath(); ctx.arc(lerp(sx0, ex, uu), lerp(sy0, ey, uu) - Math.sin(uu * PI) * 70, 3.5, 0, TAU); ctx.fill(); }
      pin(ctx, px2, py2, throwU * 14, 1.25, 1);
    } else if (tell > 0.05) {
      // the pin held back, glowing hot
      pin(ctx, mx + side * 14, my - 8, -side * 0.9, 1.1, tell);
    }
    ctx.restore();
  }

  // the twist: a balloon bunch drifting up; the red one pops into coins and confetti
  function balloons(ctx, x0, h, t) {
    const u = frac(t / 4), y = h + 50 - u * (h + 140), x = x0 + Math.sin(t * 1.3) * 8;
    const popped = u > 0.42, pu = (u - 0.42) / 0.08;
    const B = [[-7, -28, [255, 120, 110], [210, 50, 50], [140, 30, 30], 0], [7, -30, [140, 170, 255], [60, 90, 210], [30, 50, 140], 1], [0, -40, [255, 230, 130], [255, 200, 50], [190, 130, 20], 2]];
    for (const [bx, by, c0, c1, c2, k] of B) {
      if (k === 0 && popped) continue;
      const ex = x + bx + Math.sin(t * 2 + k) * 1.5, ey = y + by;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + bx * 0.3, y - 10, ex, ey + 10); ctx.stroke();
      ctx.fillStyle = K.rg(ctx, ex - 3, ey - 4, 13, [rgb(c0), rgb(c1), rgb(c2)]); ctx.beginPath(); ctx.ellipse(ex, ey, 8, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(K.lift(c2, -20)); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = rgb(c1); ctx.beginPath(); ctx.moveTo(ex - 1.6, ey + 11.5); ctx.lineTo(ex + 1.6, ey + 11.5); ctx.lineTo(ex, ey + 9.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(ex - 3, ey - 4, 1.6, 3, 0.4, 0, TAU); ctx.fill();
    }
    if (popped && pu < 1.4) {
      const px = x - 7, py = y - 28, k = Math.min(1, pu);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,240,200,${1 - k})`; ctx.lineWidth = 1.4;
      for (let j = 0; j < 8; j++) { const a = j * TAU / 8, r0 = 6 + k * 10; ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); ctx.lineTo(px + Math.cos(a) * (r0 + 5), py + Math.sin(a) * (r0 + 5)); ctx.stroke(); }
      ctx.restore();
    }
    if (popped) { const k = (u - 0.42) * 4.5; for (const [d, ph] of [[-1, 0], [1, 1.3]]) { if (k > 1.6) break; coin(ctx, x - 7 + d * k * 26, y - 28 - 30 * k + 40 * k * k + (u - 0.42) * (h + 140), t * 2, ph, 6.5); } }
  }

  const CARN = {
    bgTop: [118, 62, 84], bgBot: [46, 26, 56], far: [104, 54, 76], far2: [92, 46, 68],
    wall: [60, 20, 30], wallIn: [30, 10, 16], rim: [255, 190, 120], farShape: carnFar,
  };

  PV.sections['carnival'] = (ctx, w, h, t) => {
    K.shaft(ctx, w, h, t, CARN, { inset: -14, wobble: 0 });
    // festoon bulbs glowing in the haze, two spotlights sweeping
    for (const [x, y, k] of festoons(w, h)) { const on = 0.4 + 0.6 * Math.max(0, Math.cos(k * 1.3 - t * 3)); K.glow(ctx, x, y, 8, k % 2 ? [255, 210, 120] : [255, 150, 130], 0.28 * on); ctx.fillStyle = `rgba(255,236,190,${0.35 + 0.4 * on})`; ctx.beginPath(); ctx.arc(x, y + 2, 1.3, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [ox, ph] of [[w * 0.1, 0], [w * 0.9, 2]]) {
      const a = -PI / 2 + Math.sin(t * 0.5 + ph) * 0.45, L = h * 1.1, sp = 0.13;
      ctx.fillStyle = K.lg(ctx, ox, h, ox + Math.cos(a) * L, h + Math.sin(a) * L, ['rgba(255,240,200,.16)', 'rgba(255,240,200,0)']);
      ctx.beginPath(); ctx.moveTo(ox, h + 10); ctx.lineTo(ox + Math.cos(a - sp) * L, h + Math.sin(a - sp) * L); ctx.lineTo(ox + Math.cos(a + sp) * L, h + Math.sin(a + sp) * L); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const base = 34;
    const eL = tentWall(ctx, -1, w, h, t, base), eR = tentWall(ctx, 1, w, h, t, base);
    const L = () => base + 2, R = () => w - base - 2;
    poster(ctx, 13, 196, -0.08, 0, t); poster(ctx, w - 14, 400, 0.07, 1, t); poster(ctx, w - 14, 150, -0.05, 0, t);
    pennants(ctx, R(), 168, R() - 58, 186, 6, t);
    hoop(ctx, L() + 2, 224, -1, t);
    pedestal(ctx, L() + 6, h + 4, 46);
    crates(ctx, 1, R(), h - 30);
    balloons(ctx, w * 0.36, h, t);
    for (const [x, y, ph] of [[w * 0.5, 176, 0], [w * 0.5, 198, 0.7], [w * 0.62, 320, 1.4], [w * 0.62, 342, 2.1]]) coin(ctx, x, y, t, ph);
    monkeyCannon(ctx, L(), R(), 116, t);
    targetWheel(ctx, 1, R(), 262, t + 0.9);
    juggler(ctx, -1, L(), 352, R(), t + 1.7);
    K.rocket(ctx, w * 0.5, h * 0.8, 0.75, t);
    // confetti fluttering down
    const Rn = K.rand(77), CC = ['#ffcf3a', '#d23a3a', '#3a5ad2', '#fff4e0', '#5fd3b8', '#ff8fbf'];
    for (let i = 0; i < 22; i++) {
      const x = Rn() * w + Math.sin(t * 1.5 + i) * 8, y = (Rn() * h + t * (22 + Rn() * 16)) % (h + 10) - 5, a = t * (2 + Rn() * 3) + i;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, Math.cos(a * 1.7)); ctx.fillStyle = CC[i % 6]; ctx.globalAlpha = 0.8; ctx.fillRect(-2, -1.2, 4, 2.4); ctx.restore();
    }
  };
})();
