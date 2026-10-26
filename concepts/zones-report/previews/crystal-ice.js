// Amethyst Geode (crystal) and Frost Hollow (frost) sections, with their obstacles:
// Prism Laser, Shard Burst, Icicle Row, Frost Breath.
(() => {
  const TAU = Math.PI * 2;
  const sm = K.smooth;

  // ---------- palettes ----------
  const AME = { hi: '#ffe2fb', mid: '#c06ae4', lo: '#5e2896', edge: '#3c1662', glow: [230, 140, 255] };
  const PNK = { hi: '#fff0f8', mid: '#ff74c4', lo: '#a42a7c', edge: '#5c1446', glow: [255, 130, 210] };
  const ICE = { hi: '#ffffff', mid: '#b4e4ff', lo: '#5a9ad4', edge: '#356c9e', glow: [190, 235, 255] };

  // a faceted gem pointing along +x from the origin (call after translate/rotate). lit 0..1 brightens it.
  function gem(ctx, len, wid, C, lit = 0) {
    const hw = wid / 2, sh = len * 0.68;
    const outline = () => { ctx.beginPath(); ctx.moveTo(0, -hw * 0.86); ctx.lineTo(sh, -hw); ctx.lineTo(len, 0); ctx.lineTo(sh, hw); ctx.lineTo(0, hw * 0.86); ctx.closePath(); };
    outline();
    ctx.fillStyle = K.lg(ctx, 0, -hw, 0, hw, [C.hi, C.mid, C.lo]); ctx.fill();
    // top facet (lit), bottom facet (shaded)
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    ctx.beginPath(); ctx.moveTo(0, -hw * 0.86); ctx.lineTo(sh, -hw); ctx.lineTo(len, 0); ctx.lineTo(sh, -hw * 0.24); ctx.lineTo(0, -hw * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,0,60,.22)';
    ctx.beginPath(); ctx.moveTo(0, hw * 0.86); ctx.lineTo(sh, hw); ctx.lineTo(len, 0); ctx.lineTo(sh, hw * 0.3); ctx.lineTo(0, hw * 0.3); ctx.closePath(); ctx.fill();
    if (lit > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; outline();
      ctx.fillStyle = K.lg(ctx, 0, 0, len, 0, [K.rgb(C.glow, lit * 0.2), K.rgb(C.glow, lit * 0.7)]); ctx.fill(); ctx.restore();
    }
    // facet seams
    ctx.strokeStyle = C.edge; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(sh, -hw); ctx.lineTo(sh, -hw * 0.24); ctx.lineTo(sh, hw * 0.3); ctx.lineTo(sh, hw); ctx.moveTo(0, -hw * 0.2); ctx.lineTo(sh, -hw * 0.24); ctx.lineTo(len, 0); ctx.stroke();
    ctx.globalAlpha = 1;
    outline(); ctx.strokeStyle = C.edge; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke();
    // sheen and a glint near the tip
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(0.9, wid * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(len * 0.1, -hw * 0.58); ctx.lineTo(sh * 0.92, -hw * 0.7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(len * 0.76, -hw * 0.35, Math.max(0.7, wid * 0.07), 0, TAU); ctx.fill();
  }
  function gemAt(ctx, x, y, ang, len, wid, C, lit) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); gem(ctx, len, wid, C, lit); ctx.restore(); }

  // a four-point twinkle star (additive)
  function twinkle(ctx, x, y, r, a, c = [255, 230, 255]) {
    if (a <= 0.06) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rgb(c, a);
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    ctx.fillStyle = K.rg(ctx, x, y, r * 0.8, [K.rgb([255, 255, 255], a), K.rgb(c, 0)]); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function sparkles(ctx, w, h, t, n, c, seed = 9) {
    const r = K.rand(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y0 = r() * h, sp = 0.6 + r(), ph = r() * TAU, sz = 2 + r() * 3.5;
      const y = (y0 - t * 8 * sp + h * 4) % h, a = Math.pow(Math.max(0, Math.sin(t * 2.6 * sp + ph)), 3);
      twinkle(ctx, x + Math.sin(t * 0.7 + ph) * 4, y, sz, a * 0.9, c);
    }
  }

  // a hanging icicle from (x, y) down
  function icicle(ctx, x, y, len, wid, lit = 0) {
    ctx.beginPath(); ctx.moveTo(x - wid / 2, y);
    ctx.quadraticCurveTo(x - wid * 0.32, y + len * 0.62, x + wid * 0.04, y + len);
    ctx.quadraticCurveTo(x + wid * 0.3, y + len * 0.55, x + wid / 2, y); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, x - wid / 2, 0, x + wid / 2, 0, ['#ffffff', '#c4ecff', '#7ab4e4', '#4f8cc4']); ctx.fill();
    if (lit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(200,240,255,${lit * 0.5})`; ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = ICE.edge; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
    // inner light streak and frozen growth rings
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(0.8, wid * 0.13); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - wid * 0.22, y + 2); ctx.quadraticCurveTo(x - wid * 0.16, y + len * 0.45, x - wid * 0.02, y + len * 0.72); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,110,170,.35)'; ctx.lineWidth = 0.8;
    for (const f of [0.22, 0.42]) { const yy = y + len * f, ww = wid * (1 - f) * 0.45; ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.quadraticCurveTo(x, yy + 2, x + ww, yy - 0.5); ctx.stroke(); }
  }

  // ======================= AMETHYST GEODE =======================
  const CP = {
    bgTop: [112, 86, 148], bgBot: [50, 32, 82], far: [96, 72, 132], far2: [84, 62, 118],
    wall: [48, 30, 68], wallIn: [16, 9, 28], rim: [255, 150, 232], seed: 11,
    farShape(ctx, w, h, t, layer, col) {
      const r = K.rand(layer * 31 + 5), n = 6 + layer * 3, lit = K.rgb(K.lift(col, 9));
      for (let i = 0; i < n; i++) {
        const x = r() * w, top = r() < 0.45, len = h * (0.16 + r() * 0.3) * (layer ? 0.8 : 1.1);
        const wid = (12 + r() * 18) * (layer ? 1 : 1.5), tilt = (r() - 0.5) * 0.5;
        ctx.save(); ctx.translate(x, top ? -8 : h + 8); ctx.rotate(tilt + (top ? Math.PI : 0));
        for (const [ox, k, a] of [[0, 1, 0], [wid * 0.75, 0.55, 0.35], [-wid * 0.7, 0.45, -0.3]]) {
          ctx.save(); ctx.translate(ox, 0); ctx.rotate(a);
          const L = len * k, W = wid * (0.4 + k * 0.6);
          ctx.fillStyle = K.rgb(col); ctx.beginPath(); ctx.moveTo(-W / 2, 6); ctx.lineTo(-W / 2, -L * 0.8); ctx.lineTo(0, -L); ctx.lineTo(W / 2, -L * 0.8); ctx.lineTo(W / 2, 6); ctx.fill();
          ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(-W / 2, 6); ctx.lineTo(-W / 2, -L * 0.8); ctx.lineTo(0, -L); ctx.lineTo(-W * 0.1, 6); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    },
    wallDeco(ctx, side, edge, w, h, t, scroll) {
      const r = K.rand(side < 0 ? 101 : 202), wrap = y => ((y - scroll) % (h + 60) + h + 60) % (h + 60) - 30;
      // faceted rock: angular plates, each with a lit upper-left edge and a shaded lower-right one
      const litE = new Path2D(), darkE = new Path2D();
      for (let i = 0; i < 18; i++) {
        const y = wrap(r() * (h + 60)), x = edge(y) + side * (16 + r() * 44), rr = 10 + r() * 13, ph = r() * TAU, nv = 4 + (r() * 2 | 0);
        const P = [];
        for (let k = 0; k < nv; k++) { const a = ph + k * TAU / nv, q = rr * (0.75 + 0.25 * Math.sin(k * 2.1 + ph)); P.push([x + Math.cos(a) * q, y + Math.sin(a) * q * 0.85]); }
        ctx.beginPath(); P.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
        ctx.fillStyle = r() < 0.5 ? 'rgba(140,90,190,.16)' : 'rgba(10,0,20,.28)'; ctx.fill();
        for (let k = 0; k < nv; k++) {
          const a = P[k], b = P[(k + 1) % nv], nx = (a[1] - b[1]), ny = (b[0] - a[0]), E = (-nx - ny) > 0 ? litE : darkE;
          E.moveTo(a[0], a[1]); E.lineTo(b[0], b[1]);
        }
      }
      ctx.strokeStyle = 'rgba(220,160,255,.28)'; ctx.lineWidth = 1; ctx.stroke(litE);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.3; ctx.stroke(darkE);
      // the geode's violet band and its druzy lining of tiny teeth pointing into the shaft
      ctx.beginPath();
      for (let y = -6; y <= h + 6; y += 6) ctx.lineTo(edge(y) + side * 3, y);
      for (let y = h + 6; y >= -6; y -= 6) ctx.lineTo(edge(y) + side * (11 + 2.5 * Math.sin((y + scroll) * 0.08)), y);
      ctx.closePath(); ctx.fillStyle = 'rgba(130,52,190,.4)'; ctx.fill();
      const rr = K.rand(side < 0 ? 7 : 8);
      ctx.beginPath();
      for (let y = -8; y <= h + 8;) {
        const sz = 3 + rr() * 5, d = 4 + sz * 0.8 + rr() * 2.5, tip = rr() * 2.5, lean = (rr() - 0.5) * sz * 0.8;
        ctx.moveTo(edge(y) + side * d, y); ctx.lineTo(edge(y + sz / 2) + side * tip, y + sz / 2 + lean); ctx.lineTo(edge(y + sz) + side * d, y + sz);
        y += sz * (0.55 + rr() * 0.4);
      }
      ctx.fillStyle = K.lg(ctx, edge(h / 2) + side * 12, 0, edge(h / 2), 0, ['rgba(200,120,255,.5)', 'rgba(255,210,250,.85)']); ctx.fill();
      // geode pockets: hollows lined with tiny crystals pointing inward, a pink glow at their heart
      for (let i = 0; i < 4; i++) {
        const y = wrap(r() * (h + 60)), x = edge(y) + side * (21 + r() * 8), R = 5.5 + r() * 3.5;
        ctx.fillStyle = K.rg(ctx, x + R * 0.3, y + R * 0.3, R * 1.2, ['#2a1040', '#12061e']);
        ctx.beginPath(); ctx.ellipse(x, y, R * 1.15, R, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(200,120,255,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath();
        for (let k = 0; k < 14; k++) {
          const a = k * TAU / 14, a2 = a + TAU / 14, am = a + TAU / 28, L = 0.45 + 0.25 * Math.sin(k * 3.3 + i);
          ctx.moveTo(x + Math.cos(a) * R * 1.1, y + Math.sin(a) * R * 0.95); ctx.lineTo(x + Math.cos(am) * R * (1 - L), y + Math.sin(am) * R * (1 - L) * 0.9); ctx.lineTo(x + Math.cos(a2) * R * 1.1, y + Math.sin(a2) * R * 0.95);
        }
        ctx.fillStyle = K.lg(ctx, x - R, y - R, x + R, y + R, ['#ffd8fa', '#c870f0', '#7a32b0']); ctx.fill();
        K.glow(ctx, x, y, R * 1.3, [255, 120, 230], 0.35 + 0.1 * Math.sin(t * 2 + i));
      }
      for (let i = 0; i < 6; i++) { const y = wrap(rr() * (h + 60)); twinkle(ctx, edge(y) + side * (4 + rr() * 30), y, 2.5 + rr() * 2, 0.5 * Math.pow(Math.max(0, Math.sin(t * 2 + i * 1.7)), 2)); }
    },
  };

  // a crystal cluster sticking out of a wall into the shaft (set dressing)
  function wallCluster(ctx, x, y, side, s, t, ph = 0) {
    const base = side < 0 ? 0 : Math.PI, d = -side;
    K.glow(ctx, x + d * 14 * s, y, 30 * s, [255, 130, 230], 0.18 + 0.06 * Math.sin(t * 2 + ph));
    ctx.fillStyle = K.rg(ctx, x - 2 * d, y - 3, 12 * s, ['#4e3270', '#22122f']);
    ctx.beginPath(); ctx.ellipse(x - 2 * d * s, y, 9 * s, 12 * s, 0, 0, TAU); ctx.fill();
    gemAt(ctx, x, y - 6 * s, base - d * 0.62, 16 * s, 7 * s, AME, 0.1);
    gemAt(ctx, x, y + 6 * s, base + d * 0.55, 14 * s, 6 * s, AME, 0.1);
    gemAt(ctx, x, y, base - d * 0.08, 24 * s, 10 * s, PNK, 0.15);
  }

  // ---- Prism Laser ----
  const PRISM_P = 3.2;
  function prismPhase(t) {
    const u = ((t % PRISM_P) + PRISM_P) % PRISM_P;
    return { u, charge: sm(0.9, 2.0, u) * (1 - sm(2.0, 2.06, u)), fire: sm(2.0, 2.07, u) * (1 - sm(2.55, 2.8, u)), after: sm(2.5, 2.7, u) * (1 - sm(2.8, 3.2, u)) };
  }
  // emitter on a wall at (x, y), facing into the shaft (dir +1 right, -1 left); returns the tip x
  function prismEmitter(ctx, x, y, dir, s, t, lit) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
    // a faceted rock mount half sunk into the wall
    const M = [[-10, -24], [6, -21], [13, -9], [14, 5], [8, 19], [-10, 24]];
    ctx.beginPath(); M.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = K.lg(ctx, -6, -24, 10, 24, ['#6e4c94', '#43285e', '#24123a']); ctx.fill();
    ctx.strokeStyle = '#2a1442'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(230,180,255,.22)'; ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(6, -21); ctx.lineTo(13, -9); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(10,0,20,.3)'; ctx.beginPath(); ctx.moveTo(14, 5); ctx.lineTo(8, 19); ctx.lineTo(-10, 24); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,250,.45)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-9, -23); ctx.lineTo(6, -20.5); ctx.lineTo(12.5, -9); ctx.stroke();
    // its druzy mouth glows with the charge
    ctx.fillStyle = 'rgba(255,200,250,.5)'; ctx.beginPath(); ctx.ellipse(9, 0, 4, 10, 0, 0, TAU); ctx.fill();
    gemAt(ctx, 2, -11, -0.6, 19, 8, AME, lit * 0.5);
    gemAt(ctx, 2, 12, 0.62, 17, 7.5, AME, lit * 0.5);
    gemAt(ctx, 6, -4, -0.25, 11, 5, PNK, lit * 0.4);
    gemAt(ctx, 3, 0, 0, 38, 15, PNK, lit);
    // energy vein inside the main crystal
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,250,${0.25 + lit * 0.7})`; ctx.lineWidth = 1.4 + lit * 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 0.5); ctx.lineTo(36, 0); ctx.stroke(); ctx.restore();
    ctx.restore();
    return x + dir * 41 * s;
  }
  function drawPrism(ctx, xL, xR, y, s, t) {
    const P = prismPhase(t), lit = Math.max(P.charge * (0.6 + 0.4 * Math.sin(t * 40)), P.fire, P.after * 0.5);
    const tipL = xL + 41 * s, tipR = xR - 41 * s, len = tipR - tipL;
    // shaft lit by the beam
    if (P.fire > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = K.lg(ctx, 0, y - 60 * s, 0, y + 60 * s, ['rgba(255,120,220,0)', `rgba(255,120,220,${0.22 * P.fire})`, 'rgba(255,120,220,0)']);
      ctx.fillRect(xL, y - 60 * s, xR - xL, 120 * s); ctx.restore();
      for (const f of [0.2, 0.5, 0.8]) K.danger(ctx, tipL + len * f, y, 34 * s, 0.22 * P.fire);
    }
    K.danger(ctx, xL + 14 * s, y, 26 * s, 0.14); K.danger(ctx, xR - 14 * s, y, 26 * s, 0.14);
    prismEmitter(ctx, xL, y, 1, s, t, lit);
    prismEmitter(ctx, xR, y, -1, s, t, lit);
    // charging: a thin flickering aim line, and motes drawn into both tips
    if (P.charge > 0.02) {
      const k = P.charge, fl = (0.4 + 0.6 * Math.abs(Math.sin(t * 37))) * (Math.sin(t * 23) > -0.7 ? 1 : 0.25);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.setLineDash([7 * s, 5 * s]); ctx.lineDashOffset = -t * 90;
      ctx.strokeStyle = `rgba(255,170,240,${0.75 * k * fl})`; ctx.lineWidth = 1 + k * 1.2;
      ctx.beginPath(); ctx.moveTo(tipL, y); ctx.lineTo(tipR, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * k * fl})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(tipL, y); ctx.lineTo(tipR, y); ctx.stroke();
      ctx.restore();
      for (const [tx, d] of [[tipL, 1], [tipR, -1]]) {
        K.glow(ctx, tx, y, (10 + 14 * k) * s, [255, 150, 240], 0.5 * k);
        for (let i = 0; i < 5; i++) {
          const p = (t * 1.8 + i / 5) % 1, a = i * 1.3 + 0.4, rr = (1 - p) * 26 * s;
          twinkle(ctx, tx + Math.cos(a) * rr * d, y + Math.sin(a) * rr, (1.5 + 2 * p) * s, k * p);
        }
      }
    }
    // firing: a fat glossy beam with chromatic edges and light pulses racing along
    if (P.fire > 0.01) {
      const a = P.fire, W = 13 * s * (0.55 + 0.45 * a) * (1 + 0.07 * Math.sin(t * 55));
      ctx.save(); ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,90,255,${0.3 * a})`; ctx.lineWidth = W * 2.6; ctx.beginPath(); ctx.moveTo(tipL, y); ctx.lineTo(tipR, y); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
      ctx.strokeStyle = K.lg(ctx, 0, y - W / 2, 0, y + W / 2, ['#ffc4f0', '#ff5cc8', '#c52ea8', '#8a1a8a']); ctx.lineWidth = W;
      ctx.beginPath(); ctx.moveTo(tipL, y); ctx.lineTo(tipR, y); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      // refraction: cyan above, gold below
      ctx.lineWidth = 1.4 * s;
      ctx.strokeStyle = 'rgba(120,230,255,.7)'; ctx.beginPath(); ctx.moveTo(tipL, y - W * 0.62); ctx.lineTo(tipR, y - W * 0.62); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,90,.55)'; ctx.beginPath(); ctx.moveTo(tipL, y + W * 0.62); ctx.lineTo(tipR, y + W * 0.62); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,255,.95)'; ctx.lineWidth = W * 0.36; ctx.beginPath(); ctx.moveTo(tipL, y - W * 0.06); ctx.lineTo(tipR, y - W * 0.06); ctx.stroke();
      // twisting filaments
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
      for (const ph of [0, Math.PI]) {
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const x = tipL + len * i / 24, yy = y + Math.sin(i * 0.9 - t * 30 + ph) * W * 0.32; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.restore();
      for (let i = 0; i < 4; i++) { const p = (t * 2.2 + i / 4) % 1; twinkle(ctx, tipL + len * p, y, 5 * s * a, 0.9 * a); }
      for (const tx of [tipL, tipR]) { K.glow(ctx, tx, y, 30 * s, [255, 170, 240], 0.7 * a); twinkle(ctx, tx, y, 15 * s * (0.8 + 0.2 * Math.sin(t * 40)), a); }
    }
    // after-glow: a fading haze of sparkle where the beam was
    if (P.after > 0.02) for (let i = 0; i < 7; i++) twinkle(ctx, tipL + len * ((i * 0.37 + 0.1) % 1), y + Math.sin(i * 3.1) * 6 * s, 3 * s, P.after * 0.7);
  }

  // ---- Shard Burst ----
  const SHARD_P = 3.6;
  const SHARD_A = [0, 1, 2, 3, 4, 5].map(i => -Math.PI / 2 + 0.28 + i * TAU / 6);
  function drawShard(ctx, x, y0, s, t, reach = 200) {
    const u = ((t % SHARD_P) + SHARD_P) % SHARD_P;
    const grow = sm(0.0, 0.8, u), tell = sm(1.3, 2.2, u), burst = u >= 2.2, bp = burst ? u - 2.2 : 0;
    const shake = burst ? 0 : tell * 2.2 * s, y = y0 + Math.sin(t * 2.1) * 3 * s;
    const jx = Math.sin(t * 71) * shake, jy = Math.cos(t * 63) * shake;
    const cx = x + jx, cy = y + jy;
    K.danger(ctx, x, y, (40 + tell * 16) * s, 0.16 + tell * 0.24 * (burst ? 0.3 : 1));
    K.glow(ctx, cx, cy, (34 + 20 * tell) * s, [230, 120, 255], 0.22 + 0.4 * tell * (burst ? 0.3 : 1));
    // flight: shards loose in a ring, with light trails
    if (burst) {
      const fl = sm(0, 0.3, bp) * (1 - sm(0.12, 0.4, bp));
      if (fl > 0) { K.glow(ctx, x, y, 70 * s, [255, 210, 250], 0.7 * fl); }
      const ring = 14 * s + bp * 300 * s, ra = 1 - sm(0, 0.45, bp);
      if (ra > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,180,240,${0.6 * ra})`; ctx.lineWidth = 3 * s * ra + 0.5; ctx.beginPath(); ctx.arc(x, y, ring, 0, TAU); ctx.stroke(); ctx.restore(); }
      SHARD_A.forEach((a, i) => {
        const d = 8 * s + bp * 230 * s, fade = 1 - sm(reach * 0.75, reach, d);
        if (fade <= 0) return;
        const sxp = x + Math.cos(a) * d, syp = y + Math.sin(a) * d;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = K.lg(ctx, sxp, syp, sxp - Math.cos(a) * 40 * s, syp - Math.sin(a) * 40 * s, ['rgba(255,170,240,.7)', 'rgba(255,170,240,0)']);
        ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(sxp, syp); ctx.lineTo(sxp - Math.cos(a) * 40 * s, syp - Math.sin(a) * 40 * s); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        K.danger(ctx, sxp + Math.cos(a) * 12 * s, syp + Math.sin(a) * 12 * s, 16 * s, 0.3 * fade);
        gemAt(ctx, sxp, syp, a, 24 * s, 9.5 * s, i % 2 ? AME : PNK, 0.35);
        ctx.restore();
      });
    }
    // the cluster's shards (attached) — stubs after the burst, regrowing at the start of the loop
    const sl = burst ? 0.18 : Math.max(0.18, grow);
    SHARD_A.forEach((a, i) => gemAt(ctx, cx + Math.cos(a) * 6 * s, cy + Math.sin(a) * 6 * s, a, 24 * s * sl, 9.5 * s * (0.6 + 0.4 * sl), i % 2 ? AME : PNK, burst ? 0 : tell * (0.6 + 0.4 * Math.sin(t * 30))));
    // the core: a faceted gem lit from the top-left
    const R = [13, 11, 14, 12, 13, 11];
    const V = R.map((q, k) => [cx + Math.cos(k * TAU / 6 + 0.25) * q * s, cy + Math.sin(k * TAU / 6 + 0.25) * q * s]);
    for (let k = 0; k < 6; k++) {
      const a = V[k], b = V[(k + 1) % 6], mid = (k + 0.5) * TAU / 6 + 0.25, light = 0.5 + 0.5 * Math.cos(mid + 2.36);
      ctx.fillStyle = K.rgb(K.mix([88, 34, 140], [246, 190, 255], light));
      ctx.beginPath(); ctx.moveTo(cx - 2 * s, cy - 2 * s); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); V.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.strokeStyle = AME.edge; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,90,.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); V.forEach(p => { ctx.moveTo(cx - 2 * s, cy - 2 * s); ctx.lineTo(p[0], p[1]); }); ctx.stroke();
    // inner energy, brightening through the tell
    const e = burst ? 0.25 * (1 - sm(0, 0.6, bp)) : 0.15 + tell * 0.85;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = K.rg(ctx, cx, cy, 11 * s, [`rgba(255,240,255,${e})`, `rgba(255,120,230,${e * 0.5})`, 'rgba(255,120,230,0)']);
    ctx.beginPath(); ctx.arc(cx, cy, 11 * s, 0, TAU); ctx.fill();
    // cracks spreading over the core as it charges
    if (tell > 0.25 && !burst) {
      const k = sm(0.25, 1, tell);
      ctx.strokeStyle = `rgba(255,235,255,${0.9 * k})`; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      for (let j = 0; j < 4; j++) {
        const a = j * 1.7 + 0.5; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 5 * s * k, cy + Math.sin(a) * 5 * s * k);
        ctx.lineTo(cx + Math.cos(a + 0.5) * 9 * s * k, cy + Math.sin(a + 0.5) * 9 * s * k);
        ctx.lineTo(cx + Math.cos(a + 0.2) * 12.5 * s * k, cy + Math.sin(a + 0.2) * 12.5 * s * k); ctx.stroke();
      }
    }
    ctx.restore();
    K.sheen(ctx, cx - 1 * s, cy - 1 * s, 12 * s, 0.55);
    // a few tiny orbiting chips
    for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * TAU / 3; twinkle(ctx, x + Math.cos(a) * 30 * s, y + Math.sin(a) * 12 * s, 2.5 * s, 0.6); }
  }

  PV.obstacles['prism'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, CP);
    const y = h * 0.42;
    wallCluster(ctx, S.L(h * 0.86), h * 0.86, -1, 0.8, t, 1);
    wallCluster(ctx, S.R(h * 0.12), h * 0.12, 1, 0.75, t, 2);
    drawPrism(ctx, S.L(y), S.R(y), y, 1, t);
    K.rocket(ctx, w * 0.5 + Math.sin(t * 1.3) * 6, h * 0.8, 0.8, t);
    sparkles(ctx, w, h, t, 12, [255, 210, 255]);
  };
  PV.obstacles['shard'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, CP);
    wallCluster(ctx, S.L(h * 0.2), h * 0.2, -1, 0.8, t, 1);
    wallCluster(ctx, S.R(h * 0.78), h * 0.78, 1, 0.8, t, 2);
    drawShard(ctx, w * 0.5, h * 0.46, 1.25, t, 150);
    sparkles(ctx, w, h, t, 12, [255, 210, 255]);
  };
  PV.sections['crystal'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, CP);
    // pink light pooling from glowing clusters
    for (const [side, y, s, ph] of [[-1, h * 0.12, 0.8, 0], [1, h * 0.46, 0.75, 1], [-1, h * 0.66, 0.7, 2], [1, h * 0.9, 0.85, 3], [1, h * 0.06, 0.6, 4]])
      wallCluster(ctx, side < 0 ? S.L(y) : S.R(y), y, side, s, t, ph);
    drawPrism(ctx, S.L(h * 0.27), S.R(h * 0.27), h * 0.27, 0.72, t);
    drawShard(ctx, w * 0.42, h * 0.53, 0.9, t + 0.9, 100);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    sparkles(ctx, w, h, t, 20, [255, 210, 255], 4);
  };

  // ======================= FROST HOLLOW =======================
  const FP = {
    bgTop: [132, 166, 200], bgBot: [58, 86, 128], far: [114, 148, 184], far2: [100, 134, 172],
    wall: [36, 50, 78], wallIn: [10, 15, 30], rim: [200, 238, 255], seed: 7,
    farShape(ctx, w, h, t, layer, col) {
      const r = K.rand(layer * 53 + 21), lit = K.rgb(K.lift(col, 10));
      // a frozen sheet across the top with long icicles hanging from it
      ctx.beginPath(); ctx.moveTo(-5, -5);
      for (let x = -5; x <= w + 5; x += 15) ctx.lineTo(x, 14 + layer * 8 + Math.sin(x * 0.07 + layer * 2) * 6);
      ctx.lineTo(w + 5, -5); ctx.fill();
      for (let i = 0; i < 9 + layer * 4; i++) {
        const x = r() * w, len = h * (0.08 + r() * (layer ? 0.18 : 0.3)), wid = (5 + r() * 10) * (layer ? 1 : 1.5), y0 = 10;
        ctx.beginPath(); ctx.moveTo(x - wid / 2, y0); ctx.quadraticCurveTo(x - wid * 0.25, y0 + len * 0.6, x, y0 + len); ctx.quadraticCurveTo(x + wid * 0.25, y0 + len * 0.6, x + wid / 2, y0); ctx.fill();
        ctx.save(); ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(x - wid / 2, y0); ctx.quadraticCurveTo(x - wid * 0.25, y0 + len * 0.6, x, y0 + len); ctx.lineTo(x - wid * 0.05, y0); ctx.fill(); ctx.restore();
      }
      // frozen columns and ice mounds rising from below
      for (let i = 0; i < 3 + layer; i++) {
        const x = r() * w, wid = (18 + r() * 26) * (layer ? 1 : 1.4), top = h * (0.45 + r() * 0.35);
        ctx.beginPath(); ctx.moveTo(x - wid, h + 5); ctx.quadraticCurveTo(x - wid * 0.4, top + 40, x - wid * 0.15, top); ctx.lineTo(x + wid * 0.1, top - 8); ctx.quadraticCurveTo(x + wid * 0.4, top + 40, x + wid, h + 5); ctx.fill();
        ctx.save(); ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(x - wid, h + 5); ctx.quadraticCurveTo(x - wid * 0.4, top + 40, x - wid * 0.15, top); ctx.lineTo(x - wid * 0.1, h + 5); ctx.fill(); ctx.restore();
      }
    },
    wallDeco(ctx, side, edge, w, h, t, scroll) {
      const r = K.rand(side < 0 ? 301 : 302), wrap = y => ((y - scroll) % (h + 60) + h + 60) % (h + 60) - 30;
      // cobbled dark rock under the ice
      const cob = new Path2D(), cobL = new Path2D();
      for (let i = 0; i < 18; i++) {
        const y = wrap(r() * (h + 60)), x = edge(y) + side * (20 + r() * 40), rx = 8 + r() * 10, ry = 6 + r() * 8;
        const ro = r(); cob.moveTo(x + Math.cos(ro) * rx, y + Math.sin(ro) * rx); cob.ellipse(x, y, rx, ry, ro, 0, TAU);
        const sx0 = x + Math.cos(3.4) * rx * 0.8, sy0 = y + Math.sin(3.4) * ry * 0.8; cobL.moveTo(sx0, sy0); cobL.ellipse(x, y, rx * 0.8, ry * 0.8, 0, 3.4, 4.8);
      }
      ctx.fillStyle = 'rgba(120,150,200,.08)'; ctx.fill(cob);
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.stroke(cob);
      ctx.strokeStyle = 'rgba(200,230,255,.12)'; ctx.lineWidth = 1; ctx.stroke(cobL);
      // a thick coat of glassy blue ice along the inner face
      const ex = edge(h / 2);
      ctx.beginPath();
      for (let y = -6; y <= h + 6; y += 6) ctx.lineTo(edge(y) + side * 1, y);
      for (let y = h + 6; y >= -6; y -= 6) ctx.lineTo(edge(y) + side * (11 + 4 * Math.sin((y + scroll) * 0.045)), y);
      ctx.closePath();
      ctx.fillStyle = K.lg(ctx, ex + side * 22, 0, ex, 0, ['rgba(90,150,215,.12)', 'rgba(120,185,240,.32)', 'rgba(180,225,255,.55)']); ctx.fill();
      // glassy highlight streaks, cracks and trapped bubbles in the ice
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const y = wrap(r() * (h + 60)), L = 20 + r() * 30; ctx.beginPath(); ctx.moveTo(edge(y) + side * 5, y); ctx.lineTo(edge(y + L) + side * 6, y + L); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(235,250,255,.45)'; ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const y = wrap(r() * (h + 60)); let x = edge(y) + side * (3 + r() * 6), yy = y;
        ctx.beginPath(); ctx.moveTo(x, yy);
        for (let k = 0; k < 3; k++) { x += side * (3 + r() * 4); yy += (r() - 0.3) * 8; ctx.lineTo(x, yy); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(230,248,255,.5)'; ctx.lineWidth = 0.8;
      for (let i = 0; i < 10; i++) { const y = wrap(r() * (h + 60)); ctx.beginPath(); ctx.arc(edge(y) + side * (5 + r() * 10), y, 1 + r() * 1.5, 0, TAU); ctx.stroke(); }
      // frost crystals frozen into the rock
      for (let i = 0; i < 3; i++) {
        const y = wrap(r() * (h + 60)), x = edge(y) + side * (28 + r() * 10), base = side < 0 ? 0 : Math.PI;
        gemAt(ctx, x, y, base - 0.4, 12, 5, ICE, 0); gemAt(ctx, x, y, base + 0.1, 17, 7, ICE, 0);
      }
    },
  };

  // a snowy ice lip on the wall with an icicle fringe hanging from it (set dressing)
  function fringe(ctx, x, y, side, s, n = 4) {
    const d = -side;
    ctx.fillStyle = K.lg(ctx, 0, y - 6 * s, 0, y + 6 * s, ['#e8f6ff', '#9ccaee', '#5e94c6']);
    ctx.beginPath(); ctx.moveTo(x - d * 4 * s, y - 6 * s); ctx.quadraticCurveTo(x + d * 14 * s, y - 7 * s, x + d * 17 * s, y); ctx.quadraticCurveTo(x + d * 10 * s, y + 6 * s, x - d * 4 * s, y + 5 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ICE.edge; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n; icicle(ctx, x + d * f * 15 * s, y + 3 * s, (7 + ((i * 7) % 5) * 3) * s * (1 - f * 0.4), 4.5 * s); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + d * 6 * s, y - 6 * s, 11 * s, 3.4 * s, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(150,190,225,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x + d * 6 * s, y - 6 * s, 11 * s, 3.4 * s, 0, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  // ---- Icicle Row ----
  const ICE_P = 4;
  function drawIcicles(ctx, xl, xr, y, s, t, n = 5) {
    const u = ((t % ICE_P) + ICE_P) % ICE_P, G = 1100 * s;
    // the frozen rock ledge spanning the shaft
    ctx.fillStyle = K.lg(ctx, 0, y - 10 * s, 0, y + 10 * s, ['#617896', '#3a4c6a', '#26344c']);
    ctx.beginPath(); ctx.moveTo(xl - 6, y - 8 * s);
    for (let i = 0; i <= 10; i++) { const x = K.lerp(xl, xr, i / 10); ctx.lineTo(x, y - 8 * s + Math.sin(i * 1.9) * 2 * s); }
    ctx.lineTo(xr + 6, y - 8 * s); ctx.lineTo(xr + 6, y + 7 * s);
    for (let i = 10; i >= 0; i--) { const x = K.lerp(xl, xr, i / 10); ctx.lineTo(x, y + 7 * s + Math.sin(i * 2.7 + 1) * 2.5 * s); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1e2a40'; ctx.lineWidth = 1.2; ctx.stroke();
    // ice coat on its underside
    ctx.fillStyle = K.lg(ctx, 0, y + 2 * s, 0, y + 12 * s, ['rgba(200,236,255,.9)', 'rgba(120,180,230,.85)']);
    ctx.beginPath(); ctx.moveTo(xl - 6, y + 3 * s);
    for (let i = 0; i <= 20; i++) { const x = K.lerp(xl, xr, i / 20); ctx.lineTo(x, y + 3 * s + Math.sin(i * 1.3) * 1.5 * s); }
    ctx.lineTo(xr + 6, y + 3 * s);
    for (let i = 20; i >= 0; i--) { const x = K.lerp(xl, xr, i / 20); ctx.lineTo(x, y + 9 * s + Math.abs(Math.sin(i * 1.7)) * 4 * s); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = ICE.edge; ctx.lineWidth = 1; ctx.stroke();
    // snow piled on top
    ctx.fillStyle = K.lg(ctx, 0, y - 18 * s, 0, y - 6 * s, ['#ffffff', '#dceefa']);
    ctx.beginPath(); ctx.moveTo(xl - 6, y - 6 * s);
    for (let i = 0; i <= 14; i++) { const x = K.lerp(xl, xr, i / 14); ctx.lineTo(x, y - 12 * s - Math.abs(Math.sin(i * 1.15 + 0.4)) * 5 * s); }
    ctx.lineTo(xr + 6, y - 6 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9cc0dc'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(xl + 10, y - 14 * s); ctx.quadraticCurveTo((xl + xr) / 2, y - 18 * s, xr - 20, y - 14 * s); ctx.stroke();
    // the icicles: shake one after another, then drop; regrow at the end of the loop
    const gap = (xr - xl) / n;
    for (let i = 0; i < n; i++) {
      const x = xl + gap * (i + 0.5), len = (40 + ((i * 5) % 3) * 7) * s, wid = 13.5 * s, top = y + 6 * s;
      const shakeAt = 0.7 + i * 0.36, dropAt = shakeAt + 0.42, sh = sm(shakeAt, shakeAt + 0.3, u) * (u < dropAt ? 1 : 0);
      const regrow = sm(3.3, 3.95, u);
      if (u < dropAt) {
        const L = len * (u < shakeAt && i >= 0 ? 1 : 1);
        K.danger(ctx, x, top + L * 0.7, 18 * s, 0.14 + sh * 0.18);
        ctx.save(); ctx.translate(x, top); ctx.rotate(Math.sin(t * 62 + i) * 0.09 * sh); ctx.translate(-x, -top);
        icicle(ctx, x, top, L, wid, sh * (0.5 + 0.5 * Math.sin(t * 40)));
        ctx.restore();
        if (sh > 0) for (let k = 0; k < 3; k++) { const p = (t * 3 + k / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - p) * sh})`; ctx.beginPath(); ctx.arc(x + (k - 1) * 4 * s + Math.sin(k * 3) * 2, top + p * 26 * s, 1.3 * s, 0, TAU); ctx.fill(); }
      } else {
        const dt = u - dropAt, fy = 0.5 * G * dt * dt;
        // broken stub, regrowing
        icicle(ctx, x, top, Math.max(5 * s, len * regrow), wid * (0.7 + 0.3 * regrow));
        if (dt < 0.25) { const p = dt / 0.25; ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (k - 1.5) * 5 * s * (1 + p), top + 4 * s + p * 8 * s, (2.5 - p * 1.5) * s, 0, TAU); ctx.fill(); } }
        if (top + fy < y + 600) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = K.lg(ctx, 0, top + fy - 30 * s, 0, top + fy + 4, ['rgba(200,235,255,0)', 'rgba(200,235,255,.35)']);
          ctx.fillRect(x - wid * 0.4, top + fy - 30 * s * Math.min(1, dt * 4), wid * 0.8, 30 * s * Math.min(1, dt * 4)); ctx.restore();
          K.danger(ctx, x, top + fy + len * 0.7, 20 * s, 0.3);
          icicle(ctx, x, top + fy, len, wid);
        }
      }
    }
  }

  // ---- Frost Breath ----
  const FB_P = 3.6;
  function frostPhase(t) {
    const u = ((t % FB_P) + FB_P) % FB_P;
    return { u, tell: sm(0.9, 1.7, u) * (1 - sm(1.75, 1.9, u)), blow: sm(1.8, 1.95, u) * (1 - sm(2.85, 3.1, u)), ext: sm(1.8, 2.15, u) };
  }
  // an icy face in the wall at (x, y) facing into the shaft (dir +1 right / -1 left); the cone reaches `reach` px
  function drawFrostFace(ctx, x, y, dir, s, t, reach) {
    const P = frostPhase(t), puff = P.tell, bl = P.blow;
    const shake = puff * 1.2 * Math.sin(t * 60);
    ctx.save(); ctx.translate(x + shake, y); ctx.scale(dir * s, s);
    const mx = 30, my = 14;
    // cold light washing the shaft in front of it
    K.glow(ctx, 40, 6, 60, [180, 230, 255], 0.18 + 0.3 * bl + 0.15 * puff);
    // the rock socket it sits in
    ctx.fillStyle = K.rg(ctx, 0, -6, 44, ['#3a5276', '#223250', '#141e32']);
    ctx.beginPath(); ctx.ellipse(-2, 2, 30, 44, 0, 0, TAU); ctx.fill();
    // crown of ice spikes
    for (const [a, L, W] of [[-2.25, 18, 7], [-1.9, 24, 8.5], [-1.5, 28, 9.5], [-1.12, 22, 8], [-0.8, 15, 6.5]]) gemAt(ctx, 12 + Math.cos(a) * 22, -2 + Math.sin(a) * 26, a, L, W, ICE, 0.1 * puff);
    // the ice head
    ctx.fillStyle = K.rg(ctx, 6, -16, 46, ['#f6fdff', '#b4e2fa', '#6aa6d8', '#3e78b0']);
    ctx.beginPath(); ctx.ellipse(14, 2, 26, 32, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2f6496'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save(); ctx.clip();
    // facets: lit planes top-left, shaded planes bottom-right
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(-12, -30); ctx.lineTo(18, -32); ctx.lineTo(6, -12); ctx.lineTo(-12, -6); ctx.fill();
    ctx.fillStyle = 'rgba(30,70,130,.22)'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(42, 36); ctx.lineTo(14, 36); ctx.lineTo(30, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-4, 18); ctx.lineTo(2, 10); ctx.lineTo(-1, 2); ctx.moveTo(34, -18); ctx.lineTo(29, -12); ctx.lineTo(33, -6); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(14, 2, 21, 27, 0, 3.6, 4.6); ctx.stroke();
    // puffed cheeks
    for (const [cx0, cy0] of [[3, 12], [27, 11]]) {
      const r = 5 + puff * 4.5 - bl * 1.5;
      ctx.fillStyle = K.rg(ctx, cx0 - r * 0.3, cy0 - r * 0.3, r * 1.2, ['#ffffff', '#cdeeff', 'rgba(160,215,250,.9)']);
      ctx.beginPath(); ctx.arc(cx0, cy0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,190,255,.45)'; ctx.beginPath(); ctx.arc(cx0, cy0 + r * 0.25, r * 0.55, 0, TAU); ctx.fill();
    }
    // eyes, squinting while it blows; a frosty brow over them
    K.eyes(ctx, 15, -6, 8, 5.6, '#46c6ff', 0.8, 0);
    const sq = bl * 0.65 + puff * 0.25;
    if (sq > 0) { ctx.fillStyle = '#9fd4f4'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(15 + d * 8, -6 - 6.2 + sq * 5, 6.6, 4, 0, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = K.lg(ctx, 0, -18, 0, -11, ['#ffffff', '#c8e8fa']);
    ctx.beginPath(); ctx.moveTo(3, -12 + bl * 2); ctx.quadraticCurveTo(15, -21 + bl * 3, 27, -13 - bl * 1); ctx.quadraticCurveTo(15, -15 + bl * 3, 3, -12 + bl * 2); ctx.fill();
    ctx.strokeStyle = '#7fb4dc'; ctx.lineWidth = 0.9; ctx.stroke();
    // mouth: a soft line, a pucker on the inhale, a round O when blowing
    if (bl > 0.05 || puff > 0.05) {
      const rx = 2.6 + puff * 1 + bl * 3.6, ry = 3 + puff * 1 + bl * 3.4;
      ctx.fillStyle = K.rg(ctx, mx - 15, my, ry * 1.4, ['#0e2c56', '#1f4f88']); ctx.beginPath(); ctx.ellipse(mx - 15, my + 1, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e4f8ff'; ctx.lineWidth = 2.2; ctx.stroke();
    } else {
      ctx.strokeStyle = '#2f6496'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, 16); ctx.quadraticCurveTo(15, 18.5, 20, 15.5); ctx.stroke();
    }
    // an icicle beard
    for (let i = 0; i < 6; i++) icicle(ctx, 2 + i * 4.6, 28 - Math.abs(i - 2.5) * 1.6, 9 + ((i * 3) % 4) * 3, 4.6);
    ctx.restore();

    // the breath, drawn in world space from the mouth
    const ox = x + shake + dir * 15 * s, oy = y + 15 * s, half = 0.32;
    if (puff > 0.02) {                        // inhale: flakes drawn into the mouth
      for (let i = 0; i < 8; i++) {
        const p = (t * 1.6 + i / 8) % 1, d = (1 - p) * 70 * s, a = (i / 8 - 0.5) * 1.1;
        ctx.fillStyle = `rgba(255,255,255,${0.8 * p * puff})`; ctx.beginPath(); ctx.arc(ox + dir * Math.cos(a) * d, oy + Math.sin(a) * d, 1.4 * s, 0, TAU); ctx.fill();
      }
    } else if (bl < 0.02) {                   // idle: a lazy wisp of vapour
      for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3) % 1; ctx.fillStyle = `rgba(240,250,255,${0.3 * Math.sin(p * Math.PI)})`; ctx.beginPath(); ctx.arc(ox + dir * (4 + p * 18) * s, oy - p * 10 * s, (2 + p * 4) * s, 0, TAU); ctx.fill(); }
    }
    if (bl > 0.01) {
      const L = reach * P.ext;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(dir, 1);
      const cone = (k, wv) => {
        ctx.beginPath(); ctx.moveTo(0, -3 * s);
        for (let i = 1; i <= 10; i++) { const f = i / 10; ctx.lineTo(L * f, -(3 * s + L * f * Math.tan(half) * k) + Math.sin(f * 9 - t * 14) * wv * f); }
        ctx.quadraticCurveTo(L * 1.08, 0, L, 3 * s + L * Math.tan(half) * k);
        for (let i = 9; i >= 1; i--) { const f = i / 10; ctx.lineTo(L * f, 3 * s + L * f * Math.tan(half) * k + Math.sin(f * 8 - t * 12 + 1) * wv * f); }
        ctx.lineTo(0, 3 * s); ctx.closePath();
      };
      cone(1, 5 * s);
      ctx.fillStyle = K.lg(ctx, 0, 0, L, 0, [`rgba(235,250,255,${0.7 * bl})`, `rgba(185,228,255,${0.42 * bl})`, 'rgba(170,220,255,0)']); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      cone(0.45, 3 * s);
      ctx.fillStyle = K.lg(ctx, 0, 0, L * 0.8, 0, [`rgba(255,255,255,${0.55 * bl})`, 'rgba(210,240,255,0)']); ctx.fill();
      // wind streaks and curls racing outward
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const p = (t * 1.9 + i / 12) % 1, xx = p * L, off = (((i * 37) % 11) / 11 - 0.5) * 1.6, yy = off * xx * Math.tan(half), al = Math.sin(p * Math.PI) * bl;
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * al})`; ctx.lineWidth = 1.4 * s;
        ctx.beginPath(); ctx.moveTo(xx - 16 * s, yy - off * 3 * s); ctx.lineTo(xx, yy); ctx.stroke();
        if (i % 3 === 0) { ctx.beginPath(); ctx.arc(xx + 4 * s, yy - 3 * s, 4 * s, Math.PI * 0.5, Math.PI * 1.9); ctx.stroke(); }
      }
      ctx.globalCompositeOperation = 'source-over';
      // snowflakes riding the wind
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * bl})`; ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const p = (t * 1.3 + i / 9) % 1, xx = p * L, yy = ((((i * 53) % 13) / 13) - 0.5) * 1.5 * xx * Math.tan(half), r = (2 + (i % 3)) * s, sp = t * 4 + i;
        ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = sp + k * Math.PI / 3; ctx.moveTo(xx - Math.cos(a) * r, yy - Math.sin(a) * r); ctx.lineTo(xx + Math.cos(a) * r, yy + Math.sin(a) * r); } ctx.stroke();
      }
      ctx.restore();
    }
    return { ox, oy, reach: reach * P.ext, half, blow: bl };
  }

  // the rocket with frost creeping over its pod (f 0..1)
  function frostyRocket(ctx, x, y, s, t, f) {
    K.rocket(ctx, x, y, s, t);
    if (f <= 0.01) return;
    K.glow(ctx, x, y, 28 * s, [190, 235, 255], 0.35 * f);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 2, 12, 14, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = `rgba(215,242,255,${0.55 * f})`; ctx.fillRect(-14, -12, 28, 30);
    ctx.fillStyle = `rgba(255,255,255,${0.75 * f})`;
    for (const [px, py, r] of [[-7, -4, 4], [-2, -9, 3.5], [5, -6, 3], [-9, 4, 3], [8, 3, 2.5], [2, 9, 3]]) { ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.7, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r * 0.7, py); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = `rgba(80,140,200,${0.7 * f})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 2, 12, 14, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) icicle(ctx, x + (i - 1) * 6 * s, y + 13 * s, (5 + i % 2 * 2) * s * f, 3 * s);
  }

  PV.obstacles['icicles'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, FP);
    const y = h * 0.16;
    fringe(ctx, S.L(h * 0.62), h * 0.62, -1, 0.9, 4);
    fringe(ctx, S.R(h * 0.8), h * 0.8, 1, 0.8, 3);
    drawIcicles(ctx, S.L(y), S.R(y), y, 1.05, t, 5);
    const gap = (S.R(y) - S.L(y)) / 5;
    K.rocket(ctx, S.L(y) + gap * 3 + Math.sin(t * 1.7) * 3, h * 0.84, 0.8, t);
    K.motes(ctx, w, h, t, 'snow', [255, 255, 255], 22);
  };
  PV.obstacles['frostbreath'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, FP);
    fringe(ctx, S.R(h * 0.15), h * 0.15, 1, 0.9, 4);
    fringe(ctx, S.L(h * 0.85), h * 0.85, -1, 0.8, 3);
    const fy = h * 0.42, fx = S.L(fy) - 2;
    const P = frostPhase(t), f = sm(1.95, 2.5, P.u) * (1 - sm(3.05, 3.55, P.u));
    drawFrostFace(ctx, fx, fy, 1, 1.1, t, 175);
    frostyRocket(ctx, w * 0.64 + Math.sin(t * 1.2) * 3, fy + 26 + f * 16, 0.8, t, f);
    K.motes(ctx, w, h, t, 'snow', [255, 255, 255], 22);
  };
  PV.sections['frost'] = (ctx, w, h, t) => {
    const S = K.shaft(ctx, w, h, t, FP);
    // cold light from the ice
    K.glow(ctx, w * 0.5, h * 0.05, 120, [220, 245, 255], 0.14);
    for (const [side, y, s, n] of [[-1, h * 0.34, 0.85, 4], [1, h * 0.29, 0.7, 3], [-1, h * 0.7, 0.9, 4], [1, h * 0.92, 0.85, 4], [-1, h * 0.95, 0.6, 3]])
      fringe(ctx, side < 0 ? S.L(y) : S.R(y), y, side, s, n);
    drawIcicles(ctx, S.L(h * 0.12), S.R(h * 0.12), h * 0.12, 0.72, t, 5);
    drawFrostFace(ctx, S.R(h * 0.5) + 2, h * 0.5, -1, 0.8, t + 0.6, 150);
    K.rocket(ctx, w * 0.5, h * 0.78, 0.75, t);
    K.motes(ctx, w, h, t, 'snow', [255, 255, 255], 34, 5);
  };
})();
