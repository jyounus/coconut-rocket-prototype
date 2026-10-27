// Glowshroom Grotto: giant glowing mushrooms in the sunken mossy hollow (props only; the ground - the hollow, moss,
// glowing specks and rock rim - comes from the core terrain). A second, smaller example of a region module.
const KINDS = [
  { cap: [0.12, 0.56, 0.62], glow: [0.10, 0.85, 1.00] },   // teal
  { cap: [0.44, 0.24, 0.72], glow: [0.62, 0.28, 1.10] },   // violet
  { cap: [0.82, 0.28, 0.56], glow: [1.10, 0.30, 0.70] },   // pink
];

function shroom(m, x, y, z, R, H, kind, seed, rnd) {
  const lean = [(rnd() - 0.5) * 0.35 * H, (rnd() - 0.5) * 0.35 * H];
  const top = [x + lean[0], y + lean[1], z + H];
  // stem: pale, slightly bent, flared foot
  m.mat('shroomStem').col(0.86, 0.84, 0.76).seed(seed);
  m.tube([[x, y, z - 0.5], [x + lean[0] * 0.3, y + lean[1] * 0.3, z + H * 0.45], top], t => R * (0.17 - t * 0.04) + Math.max(0, 1 - t * 6) * R * 0.1, { seg: 12, aoFn: t => 0.45 + t * 0.5 });
  // cap: gilled underside, rim, dome
  const K = KINDS[kind];
  m.mat('glowcap').col(K.cap).seed(seed * 7 + kind);
  const mk = m.mark();
  m.lathe(top[0], top[1], top[2] - R * 0.1, [[R * 0.16, 0.02 * R], [R * 0.7, -0.06 * R], [R, -0.1 * R], [R * 1.04, -0.02 * R], [R * 0.96, 0.1 * R], [R * 0.76, 0.24 * R], [R * 0.44, 0.34 * R], [0, 0.37 * R]], { seg: 24, aoFn: t => 0.6 + 0.4 * t });
  // tilt the cap (mostly toward the camera, so the glowing gills show) and wave its rim a little
  const tx = (rnd() - 0.5) * 0.4, ty = (rnd() - 0.5) * 0.3;
  m.transform(mk, ([px, py, pz]) => { const dx = px - top[0], dy = py - top[1], dz = pz - top[2]; return [px + dz * tx, py + dz * ty, pz - dx * tx - dy * ty]; });
  return top;
}

export default {
  key: 'grotto',
  order: 20,
  preview: [130, 900, 600, 1240],

  props(api) {
    const { layout: L, rand } = api, rnd = rand(4242), m = api.mesh();
    const x0 = 120, x1 = 590, y0 = 900, y1 = 1230;
    let n = 0;
    for (let gy = y0; gy < y1; gy += 24) for (let gx = x0; gx < x1; gx += 24) {
      const x = gx + (rnd() - 0.5) * 20, y = gy + (rnd() - 0.5) * 20, R = 5 + rnd() * 6, big = rnd() < 0.3;
      const RR = big ? R * 1.5 : R;
      if (rnd() < 0.35 || !api.inCrop(x, y)) continue;
      if (api.regionAt(x, y) !== 'grotto' || api.regionAt(x - RR, y) !== 'grotto' || api.regionAt(x + RR, y) !== 'grotto' || api.regionAt(x, y + RR) !== 'grotto' || api.regionAt(x, y - RR) !== 'grotto') continue;
      if (api.road(x, y) < L.ROAD_HW + RR + 7 || api.isWater(x, y)) continue;
      if (L.NODES.some(nd => Math.hypot(x - nd.x, y - nd.y) < 62 + RR)) continue;
      const kind = Math.floor(rnd() * 3), z = api.ground(x, y);
      shroom(m, x, y, z, RR, RR * (2.3 + rnd() * 0.9), kind, ++n, rnd);
      // a couple of small ones at its foot
      for (let k = 0, kn = 1 + Math.floor(rnd() * 3); k < kn; k++) {
        const a = rnd() * Math.PI * 2, d = RR * (0.9 + rnd() * 0.5), sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d, r = RR * (0.25 + rnd() * 0.2);
        if (api.road(sx, sy) < L.ROAD_HW + 4) continue;
        shroom(m, sx, sy, api.ground(sx, sy), r, r * (2.0 + rnd() * 0.8), (kind + 1 + (k & 1)) % 3, ++n, rnd);
      }
      api.aoBlob(x, y, RR * 1.3, 0.45);
      if (n % 5 === 1) api.anchor('sparkle', x, y, z + RR * 1.6, RR * 2, { note: 'glowshroom' });
    }
    api.add(m);
  },

  materials: {
    shroomStem: { shade(s) { s.ar = s.cr; s.ag = s.cg; s.ab = s.cb; s.spec = 0.05; s.shin = 10; s.trans = 0.2; s.er = 0.03; s.eg = 0.06; s.eb = 0.08; } },
    glowcap: {
      shade(s) {
        s.ar = s.cr; s.ag = s.cg; s.ab = s.cb; s.spec = 0.35; s.shin = 40; s.trans = 0.3;
        { const k = 0.7 + 0.45 * Math.max(0, s.nz); s.ar *= k; s.ag *= k; s.ab *= k; }   // the dome darkens toward the rim
        // pale spots on the dome
        const f = 0.2, cx = Math.floor(s.x * f), cy = Math.floor(s.y * f), cz = Math.floor(s.z * f);
        let dmin = 9; for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const h = Math.imul((cx + i) * 73856093 ^ (cy + j) * 19349663 ^ (cz + k) * 83492791, 2654435761) >>> 0;
          if ((h & 7) > 2) continue;
          const px = cx + i + (h >>> 8 & 255) / 255, py = cy + j + (h >>> 16 & 255) / 255, pz = cz + k + (h >>> 24) / 255;
          dmin = Math.min(dmin, Math.hypot(s.x * f - px, s.y * f - py, s.z * f - pz));
        }
        const spot = s.nz > 0.2 ? Math.max(0, 1 - dmin / 0.36) : 0;
        const spotE = spot > 0 ? Math.min(1, spot * 3) : 0;
        if (spot > 0) { const t = spotE; s.ar += (0.97 - s.ar) * t; s.ag += (0.95 - s.ag) * t; s.ab += (1 - s.ab) * t; }
        // glow: strongest on the gills underneath and the rim, faint on top; spots glow too
        const lin = c => c * c, under = Math.max(0, Math.min(1, (0.3 - s.nz) / 0.5)), g = 0.08 + under * 1.1 + spot * 0.6;
        s.er = lin(s.cr) * g * 1.6; s.eg = lin(s.cg) * g * 1.6; s.eb = lin(s.cb) * g * 1.6;
      },
    },
  },
};
