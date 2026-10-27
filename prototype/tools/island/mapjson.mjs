// Writes prototype/art/island/map.json (version 1). Everything the runtime draws on top of the art is given in
// SCREEN map units: the bake is an oblique view (screen y = world y - K * height), so a node sitting on a raised
// plateau appears higher up the image than its ground position. All x/y below are where things appear in the image
// (image px / tiles.scale). The schema is the one in concepts/world-maps/BUILD.md.
import { writeFileSync } from 'node:fs';
import * as L from './layout.mjs';
import { resample } from './lib/geom.mjs';

const r1 = v => Math.round(v * 10) / 10, r0 = Math.round;

export function writeMapJson({ OUT, B, A, D, P, opt, tiles, canopyHave, LAVA, file }) {
  const { S, GW, GH } = opt, K = L.K;
  const bl = (g, x, y) => { let u = x * S - 0.5, v = y * S - 0.5; u = Math.max(0, Math.min(GW - 1.001, u)); v = Math.max(0, Math.min(GH - 1.001, v)); const i = u | 0, j = v | 0, fu = u - i, fv = v - j, t = j * GW + i; const a = g[t] + (g[t + 1] - g[t]) * fu, b = g[t + GW] + (g[t + GW + 1] - g[t + GW]) * fu; return a + (b - a) * fv; };
  const zAt = (x, y) => Math.max(bl(B.H, x, y), bl(B.WL, x, y));
  const scr = (x, y, z = zAt(x, y)) => [r1(x), r1(y - K * z)];
  const A_ = (x, y, r, z, extra = {}) => { const [sx, sy] = scr(x, y, z ?? zAt(x, y)); return { x: sx, y: sy, r, ...extra }; };

  const nodes = L.NODES.map((n, i) => { const [x, y] = scr(n.x, n.y, D.PADZ[i]); return { id: n.id, x, y, boss: n.boss, z: r1(D.PADZ[i]), r: n.boss ? L.BOSS_PAD_R : L.PAD_R }; });
  const lines = A.lines;
  const paths = L.PATHS.map((p, i) => {
    const li = lines.findIndex(l => l.road === i), o = D.off[li], pts = lines[li].pts;
    const out = []; for (let k = 0; k < pts.length; k += 2) out.push(scr(pts[k][0], pts[k][1], D.Z[o + k]));
    const last = pts.length - 1; if (last % 2) out.push(scr(pts[last][0], pts[last][1], D.Z[o + last]));
    return { a: p.a, b: p.b, pts: out };
  });
  const fli = lines.findIndex(l => l.future), fo = D.off[fli];
  const fpts = lines[fli].pts.filter((_, k) => k % 2 === 0).map((q, k) => scr(q[0], q[1], D.Z[fo + k * 2]));
  const pr = L.FUTURE.pier;
  const future = {
    pts: fpts, label: L.FUTURE.label,
    pier: { x0: pr.x0, y0: r1(pr.y0 - K * 3.2), x1: pr.x1, y1: r1(pr.y1 - K * 3.2), w: pr.w },
    sea: resample(L.FUTURE.sea, 12).map(([x, y]) => [r1(x), r1(y)]),
    islands: L.FUTURE.islands.map(is => ({ x: is.x, y: r1(is.y - K * 6), r: is.r })),
    labelAt: [L.FUTURE.islands[0].x, L.FUTURE.islands[0].y - L.FUTURE.islands[0].r - 30],
  };
  const coast = resample(L.COAST, 24).map(([x, y]) => [r0(x), r0(y)]);
  const regions = L.REGIONS.map(r => { const [x, y] = scr(r.label_at[0], r.label_at[1]); return { key: r.key, label: r.label, x: r0(x), y: r0(y) }; });

  // ---- live-effect anchors ----
  const V = L.VOLCANO, an = { water: [], lava: [], smoke: [], waterfall: [], sparkle: [], birds: [] };
  an.water.push(A_(L.LAGOON.reduce((s, p) => s + p[0], 0) / L.LAGOON.length, L.LAGOON.reduce((s, p) => s + p[1], 0) / L.LAGOON.length, 150, null, { kind: 'lagoon' }));
  for (const [x, y] of [[300, 2400], [1000, 2420], [1380, 2100], [1500, 1400], [1520, 600], [60, 1000], [120, 250], [700, 120]]) an.water.push({ x, y, r: 160, kind: 'sea' });
  const creek = L.CREEK; for (let k = 4; k < creek.length; k += 24) an.water.push(A_(creek[k][0], creek[k][1], 26, null, { kind: 'stream' }));
  an.lava.push(A_(V.lake.x, V.lake.y, V.lake.r, null, { kind: 'lake' }));
  for (const fl of LAVA || []) for (let k = 0; k < fl.pts.length; k += 2) an.lava.push(A_(fl.pts[k][0], fl.pts[k][1], 14, null, { kind: 'flow' }));
  an.smoke.push(A_(V.lake.x, V.lake.y - 8, 40, null, { kind: 'crater' }));
  an.smoke.push(A_(V.x + 30, V.y - 40, 24, V.floor + 6, { kind: 'vent' }));
  const F = L.FALLS; an.waterfall.push({ ...A_(F[0][0], F[0][1], 20), bottom: scr(F[F.length - 1][0], F[F.length - 1][1]), kind: 'falls' });
  const sp = (k, n, rad) => { const r = L.REGION[k]; if (!r) return; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.6, d = i ? rad : 0; an.sparkle.push(A_(r.label_at[0] + Math.cos(a) * d, r.label_at[1] + 40 + Math.sin(a) * d * 0.7, 30, null, { kind: k })); } };
  sp('crystal', 4, 90); sp('mine', 2, 60); sp('temple', 2, 70); sp('grotto', 3, 80); sp('frost', 2, 70);
  an.birds.push({ x: 420, y: 1500, r: 200, kind: 'jungle' }, { x: 1200, y: 300, r: 160, kind: 'peak' });
  for (const a of P?.anchors || []) { const [x, y] = scr(a.x, a.y, a.z); const { kind, r, z, x: _x, y: _y, ...rest } = a; (an[kind] ||= []).push({ x, y, r, ...rest }); }

  const layers = canopyHave.length ? [{ name: 'canopy', file: 'canopy_{c}_{r}.png', x: 0, y: 0, w: L.SIZE[0], h: L.SIZE[1], tiles: { ...tiles, file: 'canopy_{c}_{r}.png', have: canopyHave } }] : [];
  const json = {
    version: 1,
    note: 'Baked by prototype/tools/island/bake.mjs; do not hand-edit (re-bake instead). All x/y are where things appear in the image, in map units (image px / tiles.scale); z is the ground height under nodes.',
    size: L.SIZE, tiles, layers, nodes, paths, future, coast, regions, anchors: an,
  };
  // compact: one node / path / anchor per line
  const txt = JSON.stringify(json, (k, v) => v, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1,$2]');
  writeFileSync(file, txt);
  return json;
}
