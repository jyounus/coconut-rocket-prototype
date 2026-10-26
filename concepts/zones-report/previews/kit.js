// Shared drawing kit for the zone & obstacle previews. Matches the game's look: mid-value hazy
// backgrounds with fogged parallax silhouettes, dark walls (~15% luminance) with a bright coloured
// rim light along the edge, saturated glossy hazards shaded with gradients and dark *coloured* edges
// (never black outlines), a soft red danger glow under anything lethal, and drifting ambient motes.
// Every preview is a function (ctx, w, h, t) registered in PV.sections / PV.obstacles; t is seconds.
window.PV = { sections: {}, obstacles: {} };

const K = window.K = {
  TAU: Math.PI * 2,
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  smooth: (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); },
  // seeded random: K.rand(seed)() → 0..1, the same every frame
  rand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; },
  rgb: (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`,
  mix: (a, b, t) => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t),
  lift: (c, d) => c.map(v => Math.max(0, Math.min(255, v + d))),
  // gradients: stops are colours (strings or [r,g,b]) spread evenly, or [offset, colour] pairs
  _stops(g, stops) { stops.forEach((s, i) => { const [o, c] = Array.isArray(s) && s.length === 2 && typeof s[0] === 'number' && typeof s[1] !== 'number' ? s : [i / Math.max(1, stops.length - 1), s]; g.addColorStop(o, typeof c === 'string' ? c : K.rgb(c)); }); return g; },
  lg(ctx, x0, y0, x1, y1, stops) { return K._stops(ctx.createLinearGradient(x0, y0, x1, y1), stops); },
  rg(ctx, x, y, r, stops, r0 = 0) { return K._stops(ctx.createRadialGradient(x, y, r0, x, y, r), stops); },

  // additive soft light
  glow(ctx, x, y, r, c, a = 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, x, y, r, [K.rgb(c, a), K.rgb(c, a * 0.35), K.rgb(c, 0)]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, K.TAU); ctx.fill(); ctx.restore();
  },
  // the game's red "this hurts" halo under lethal things
  danger(ctx, x, y, r, a = 0.3) { K.glow(ctx, x, y, r, [255, 60, 70], a); },
  // soft contact shadow on the background
  shadow(ctx, x, y, rx, ry, a = 0.35) {
    ctx.save(); ctx.fillStyle = K.rg(ctx, 0, 0, 1, [`rgba(0,0,0,${a})`, 'rgba(0,0,0,0)']);
    ctx.translate(x, y); ctx.scale(rx, ry); ctx.beginPath(); ctx.arc(0, 0, 1, 0, K.TAU); ctx.fill(); ctx.restore();
  },
  // glossy highlight arc (top-left light), as on every hazard in the game
  sheen(ctx, x, y, r, a = 0.45, from = 3.5, to = 4.9) {
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = Math.max(1, r * 0.16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * 0.68, from, to); ctx.stroke(); ctx.restore();
  },
  // a pair of the game's cartoon eyes (white, coloured iris, pupil, glint); look: -1..1 sideways
  eyes(ctx, x, y, gap, r, iris = '#ffcf3a', look = 0, angry = 0) {
    for (const d of [-1, 1]) {
      const ex = x + d * gap;
      ctx.fillStyle = K.rg(ctx, ex - r * 0.3, y - r * 0.3, r * 1.3, ['#ffffff', '#f2e6d8', '#c9b49e']);
      ctx.beginPath(); ctx.ellipse(ex, y, r, r * 1.08, 0, 0, K.TAU); ctx.fill();
      ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(ex + look * r * 0.3, y + r * 0.08, r * 0.62, 0, K.TAU); ctx.fill();
      ctx.fillStyle = '#1a0d14'; ctx.beginPath(); ctx.arc(ex + look * r * 0.36, y + r * 0.1, r * 0.32, 0, K.TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + look * r * 0.3 - r * 0.22, y - r * 0.22, r * 0.17, 0, K.TAU); ctx.fill();
      if (angry) { ctx.strokeStyle = 'rgba(40,10,10,.85)'; ctx.lineWidth = r * 0.32; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex + d * r * 1.05, y - r * (1.05 + 0.3 * angry)); ctx.lineTo(ex - d * r * 0.75, y - r * (0.95 - 0.35 * angry)); ctx.stroke(); }
    }
  },

  // ---------- the shaft scene ----------
  // P (palette/style): { bgTop, bgBot, far, far2, wall, wallIn, rim, mote: {kind, c}, farShape(ctx,w,h,t,layer) optional,
  //   wallDeco(ctx, side, edge, w, h, t) optional (side -1 left, 1 right; edge(y) gives the wall's inner x), wobble, inset }
  // Returns { L(y), R(y) }: the inner edge x of the left and right wall at height y, for attaching hazards.
  shaft(ctx, w, h, t, P, o = {}) {
    const inset = o.inset ?? P.inset ?? Math.round(w * 0.1), wob = o.wobble ?? P.wobble ?? 1, scroll = o.scroll ?? 0;
    // background
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [P.bgTop, P.bgBot]); ctx.fillRect(0, 0, w, h);
    // far parallax: two layers of fogged silhouettes (stalactite/column shapes unless the zone draws its own)
    for (const [layer, col, sp] of [[0, P.far, 0.25], [1, P.far2, 0.5]]) {
      ctx.save(); ctx.fillStyle = K.rgb(col);
      if (P.farShape) P.farShape(ctx, w, h, t, layer, col);
      else {
        const r = K.rand(layer * 77 + 13), n = 5 + layer * 2;
        for (let i = 0; i < n; i++) {
          const x = r() * w, cw = 18 + r() * 40 * (layer ? 1 : 1.6), top = r() < 0.5;
          const len = h * (0.25 + r() * 0.45), y0 = top ? -10 : h + 10, y1 = top ? len : h - len;
          ctx.beginPath(); ctx.moveTo(x - cw, y0); ctx.quadraticCurveTo(x - cw * 0.3, (y0 + y1) / 2, x, y1); ctx.quadraticCurveTo(x + cw * 0.3, (y0 + y1) / 2, x + cw, y0); ctx.fill();
        }
      }
      ctx.restore();
      // fog between layers
      ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [K.rgb(P.bgTop, 0.25), K.rgb(P.bgBot, 0.1), K.rgb(P.bgTop, 0.2)]); ctx.fillRect(0, 0, w, h);
    }
    // soft god-ray from above
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.lg(ctx, 0, 0, 0, h, [K.rgb(P.rim, 0.10), K.rgb(P.rim, 0)]);
    ctx.beginPath(); ctx.moveTo(w * 0.35, 0); ctx.lineTo(w * 0.62, 0); ctx.lineTo(w * 0.8, h); ctx.lineTo(w * 0.2, h); ctx.fill(); ctx.restore();
    // walls: wavy inner edge (scrolls with `scroll`), dark rock with an inner-shadow gradient and a rim light
    const seedL = P.seed || 5;
    const edge = (side, y) => {
      const yy = y + scroll, a = side < 0 ? 0 : 1.7;
      return (side < 0 ? inset : w - inset) + side * -1 * wob * (Math.sin(yy * 0.021 + a + seedL) * 7 + Math.sin(yy * 0.057 + a * 2) * 3.5);
    };
    for (const side of [-1, 1]) {
      const ex = y => edge(side, y), outer = side < 0 ? -2 : w + 2;
      ctx.beginPath(); ctx.moveTo(outer, -2);
      for (let y = -2; y <= h + 2; y += 6) ctx.lineTo(ex(y), y);
      ctx.lineTo(outer, h + 2); ctx.closePath();
      ctx.fillStyle = K.lg(ctx, side < 0 ? 0 : w, 0, side < 0 ? inset + 12 : w - inset - 12, 0, [P.wallIn, P.wall]); ctx.fill();
      ctx.save(); ctx.clip();
      if (P.wallDeco) P.wallDeco(ctx, side, ex, w, h, t, scroll);
      ctx.restore();
      // rim light: a bright line with a soft additive halo
      ctx.save(); ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'lighter';
      for (const [lw, a] of [[9, 0.12], [4, 0.35]]) {
        ctx.strokeStyle = K.rgb(P.rim, a); ctx.lineWidth = lw; ctx.beginPath();
        for (let y = -2; y <= h + 2; y += 6) y < 0 ? ctx.moveTo(ex(y), y) : ctx.lineTo(ex(y), y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = K.rgb(K.lift(P.rim, 30), 0.95); ctx.lineWidth = 1.6; ctx.beginPath();
      for (let y = -2; y <= h + 2; y += 6) y < 0 ? ctx.moveTo(ex(y), y) : ctx.lineTo(ex(y), y);
      ctx.stroke(); ctx.restore();
    }
    return { L: y => edge(-1, y), R: y => edge(1, y), inset };
  },

  // ambient motes drifting through the shaft (drawn after the hazards, like the game's foreground)
  // kinds: spore (glowing dots rising), drip (falling streaks), dust (slow specks), ember (rising sparks),
  // snow (drifting flakes), bubble (rising rings), spark (flickering crackles), pollen (lazy gold dots), rain
  motes(ctx, w, h, t, kind, c, n = 26, seed = 3) {
    const r = K.rand(seed);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x0 = r() * w, y0 = r() * h, sp = 0.5 + r(), ph = r() * K.TAU, sz = 0.6 + r() * 1.4;
      let x = x0, y = y0, a = 0.6;
      if (kind === 'drip' || kind === 'rain') { y = (y0 + t * 260 * sp) % (h + 40) - 20; ctx.strokeStyle = K.rgb(c, kind === 'rain' ? 0.35 : 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + (kind === 'rain' ? 14 : 7) * sp); ctx.stroke(); continue; }
      if (kind === 'ember' || kind === 'spore' || kind === 'bubble') y = h - ((h - y0 + t * (kind === 'ember' ? 46 : 18) * sp) % (h + 20)) + 10;
      if (kind === 'snow' || kind === 'dust') y = (y0 + t * (kind === 'snow' ? 30 : 6) * sp) % (h + 10) - 5;
      if (kind === 'pollen') y = y0 + Math.sin(t * 0.7 * sp + ph) * 12;
      x = x0 + Math.sin(t * 0.9 * sp + ph) * (kind === 'snow' ? 14 : 6);
      if (kind === 'bubble') { ctx.strokeStyle = K.rgb(c, 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, sz * 2.2, 0, K.TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x - sz * 0.8, y - sz * 0.8, sz * 0.5, 0, K.TAU); ctx.fill(); continue; }
      if (kind === 'spark') { a = Math.max(0, Math.sin(t * 9 * sp + ph)) ; if (a < 0.3) continue; ctx.strokeStyle = K.rgb(c, a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 4); ctx.lineTo(x - 1, y + 6); ctx.lineTo(x + 2, y + 10); ctx.stroke(); continue; }
      const glowy = kind === 'spore' || kind === 'ember' || kind === 'pollen';
      if (glowy) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = K.rg(ctx, x, y, sz * 5, [K.rgb(c, 0.5), K.rgb(c, 0)]); ctx.beginPath(); ctx.arc(x, y, sz * 5, 0, K.TAU); ctx.fill(); }
      ctx.globalCompositeOperation = glowy ? 'lighter' : 'source-over';
      ctx.fillStyle = K.rgb(c, kind === 'dust' ? 0.35 : 0.85); ctx.beginPath(); ctx.arc(x, y, sz * (kind === 'snow' ? 1.6 : 1), 0, K.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  // the coconut rocket (for scale): a coconut pod on a flame, about the game's size (~40 tall at s=1)
  rocket(ctx, x, y, s = 1, t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // flame
    const fl = 1 + Math.sin(t * 40) * 0.12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.lg(ctx, 0, 14, 0, 14 + 30 * fl, ['rgba(255,250,210,.95)', 'rgba(255,190,70,.75)', 'rgba(255,90,30,0)']);
    ctx.beginPath(); ctx.moveTo(-7, 14); ctx.quadraticCurveTo(-4, 26 * fl, 0, 40 * fl); ctx.quadraticCurveTo(4, 26 * fl, 7, 14); ctx.fill();
    K.glow(ctx, 0, 18, 26, [255, 180, 80], 0.35);
    ctx.restore();
    // fins
    for (const d of [-1, 1]) { ctx.fillStyle = K.lg(ctx, 0, 4, 0, 18, ['#f2e3c4', '#b5432c']); ctx.beginPath(); ctx.moveTo(d * 9, 2); ctx.quadraticCurveTo(d * 18, 12, d * 15, 19); ctx.lineTo(d * 6, 12); ctx.fill(); }
    // coconut pod
    ctx.fillStyle = K.rg(ctx, -5, -6, 18, ['#d9a066', '#8a5a2e', '#4e2f16']);
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 14, 0, 0, K.TAU); ctx.fill();
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e8c27a'; ctx.beginPath(); ctx.ellipse(0, 4, 12, 3.2, 0, 0, K.TAU); ctx.fill();
    K.sheen(ctx, 0, 0, 12, 0.35);
    // the pilot peeking out: a round furry head with goggles
    ctx.fillStyle = K.rg(ctx, -3, -16, 10, ['#f4f1ee', '#b9b4b8', '#6d6670']); ctx.beginPath(); ctx.arc(0, -13, 8, 0, K.TAU); ctx.fill();
    ctx.fillStyle = '#2d2a33'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 3.3, -13, 2.6, 2.2, 0, 0, K.TAU); ctx.fill(); }
    ctx.fillStyle = '#fff'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 3.3 - 0.7, -13.7, 0.8, 0, K.TAU); ctx.fill(); }
    ctx.fillStyle = '#d28a3a'; ctx.fillRect(-8, -19, 16, 2.4);
    ctx.restore();
  },

  // little arrow + label for showing motion/tells in obstacle previews (subtle, white)
  arrow(ctx, x0, y0, x1, y1, a = 0.55) {
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    const an = Math.atan2(y1 - y0, x1 - x0); ctx.translate(x1, y1); ctx.rotate(an);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -4); ctx.lineTo(-7, 4); ctx.fill(); ctx.restore();
  },
};

// Existing game palettes, for reference / reuse (jungle, basalt caves, magma core)
K.ZONES_NOW = {
  jungle: { bgTop: [92, 128, 102], bgBot: [44, 72, 58], far: [74, 104, 84], far2: [66, 94, 76], wall: [48, 38, 28], wallIn: [18, 13, 9], rim: [210, 250, 130] },
  caves:  { bgTop: [86, 90, 150], bgBot: [40, 42, 92], far: [70, 74, 128], far2: [62, 66, 118], wall: [36, 38, 62], wallIn: [11, 11, 24], rim: [160, 220, 255] },
  magma:  { bgTop: [112, 56, 40], bgBot: [54, 22, 16], far: [86, 42, 30], far2: [76, 36, 26], wall: [30, 20, 20], wallIn: [9, 5, 5], rim: [255, 140, 50] },
};
