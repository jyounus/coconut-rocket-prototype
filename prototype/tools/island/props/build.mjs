// Main-thread prop stage: runs every region module's props(api), packs all meshes into shared arrays, applies
// contact AO to the ground, and rasterises the sun shadow map (orthographic along the sun direction).
import { MeshBuilder, V3 } from './mesh.mjs';
import { MATERIALS } from './materials.mjs';
import * as LIB from './lib.mjs';
import * as NZ from '../lib/noise.mjs';
import * as L from '../layout.mjs';
import { coreProps } from './core.mjs';
import { REG } from '../terrain.mjs';

export const SHADOW_TEXEL = 0.4;   // map units per shadow-map texel

export function materialTable(plugins) {
  const table = { ...MATERIALS };
  for (const m of plugins) if (m.materials) Object.assign(table, m.materials);
  return table;
}

export async function buildProps(plugins, ctx) {
  const { B, opt, D, A } = ctx, { S, GW, GH } = opt;
  const meshes = [], blobs = [], anchors = [];
  const bl = (g, x, y) => { let u = x * S - 0.5, v = y * S - 0.5; u = Math.max(0, Math.min(GW - 1.001, u)); v = Math.max(0, Math.min(GH - 1.001, v)); const i = u | 0, j = v | 0, fu = u - i, fv = v - j, t = j * GW + i; const a = g[t] + (g[t + 1] - g[t]) * fu, b = g[t + GW] + (g[t + GW + 1] - g[t + GW]) * fu; return a + (b - a) * fv; };
  const api = {
    layout: L, noise: NZ, lib: LIB, V3,
    region: null,
    mesh: () => new MeshBuilder(),
    add(m) { if (m && m.count) meshes.push({ m, region: api.region }); return m; },
    // terrain height (after roads) and water level at a world point
    ground: (x, y) => bl(B.H, x, y),
    water: (x, y) => { const w = bl(B.WL, x, y); return w > bl(B.H, x, y) ? w : null; },
    node: id => { const n = L.NODE[id], i = L.NODES.indexOf(n); return { ...n, z: D.PADZ[i] }; },
    road: (x, y) => A.nearest('road', x, y).d,       // distance to the nearest road centre line
    regionAt: (x, y) => REG[B.REG[Math.min(GH - 1, Math.max(0, Math.floor(y * S))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(x * S)))]],   // 'grotto', 'jungle', ...
    isWater: (x, y) => bl(B.WL, x, y) > bl(B.H, x, y),
    rand: NZ.rand,
    aoBlob(x, y, r, k = 0.5) { blobs.push([x, y, r, k]); },
    anchor(kind, x, y, z = null, r = 20, extra = {}) { anchors.push({ kind, x, y, z: z ?? bl(B.H, x, y), r, ...extra }); },
    crop: ctx.crop,                                   // [x0,y0,x1,y1] world units when previewing a window, else null
    inCrop(x, y, pad = 80) { const c = ctx.crop; return !c || (x > c[0] - pad && x < c[2] + pad && y > c[1] - pad && y < c[3] + pad); },
  };
  for (const m of plugins) if (m.props) { api.region = m.key; await m.props(api); }
  api.region = 'core'; coreProps(api);
  if (!meshes.length) return null;

  // ---- pack ----
  const MT = materialTable(plugins), names = Object.keys(MT), mid = Object.fromEntries(names.map((n, i) => [n, i]));
  let nv = 0, nt = 0; for (const { m } of meshes) { nv += m.P.length / 3; nt += m.T.length / 3; }
  const sh = (C, n) => new C(new SharedArrayBuffer(Math.max(1, n) * C.BYTES_PER_ELEMENT));
  const P = { VP: sh(Float32Array, nv * 3), VN: sh(Float32Array, nv * 3), VUV: sh(Float32Array, nv * 2), VC: sh(Float32Array, nv * 3), VAO: sh(Float32Array, nv), TI: sh(Int32Array, nt * 3), TM: sh(Uint16Array, nt), TF: sh(Uint8Array, nt), TS: sh(Uint32Array, nt), matNames: names, nv, nt };
  let vo = 0, to = 0;
  for (const { m } of meshes) {
    const n = m.P.length / 3;
    P.VP.set(m.P, vo * 3); P.VN.set(m.N, vo * 3); P.VUV.set(m.UV, vo * 2); P.VC.set(m.C, vo * 3); P.VAO.set(m.AO, vo);
    for (let t = 0; t < m.T.length / 3; t++) {
      P.TI[(to + t) * 3] = m.T[t * 3] + vo; P.TI[(to + t) * 3 + 1] = m.T[t * 3 + 1] + vo; P.TI[(to + t) * 3 + 2] = m.T[t * 3 + 2] + vo;
      const name = m.TM[t]; if (!(name in mid)) throw new Error(`unknown prop material '${name}'`);
      P.TM[to + t] = mid[name]; P.TF[to + t] = m.TF[t]; P.TS[to + t] = m.TS[t];
    }
    vo += n; to += m.T.length / 3;
  }

  // ---- contact AO on the ground ----
  for (const [x, y, r, k] of blobs) {
    const i0 = Math.max(0, Math.floor((x - r) * S)), i1 = Math.min(GW - 1, Math.ceil((x + r) * S)), j0 = Math.max(0, Math.floor((y - r) * S)), j1 = Math.min(GH - 1, Math.ceil((y + r) * S));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot((i + 0.5) / S - x, (j + 0.5) / S - y) / r; if (d >= 1) continue;
      const t = j * GW + i, f = 1 - k * (1 - d * d) ** 2; B.AO[t] = Math.round(B.AO[t] * f);
    }
  }

  // ---- sun shadow map: max depth toward the sun per texel ----
  const w = L.SUN, ul = Math.hypot(w[0], w[1]), u = [-w[1] / ul, w[0] / ul, 0], v = V3.cross(w, u);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (let i = 0; i < nv; i++) { const p = [P.VP[i * 3], P.VP[i * 3 + 1], P.VP[i * 3 + 2]], a = V3.dot(p, u), b = V3.dot(p, v); if (a < u0) u0 = a; if (a > u1) u1 = a; if (b < v0) v0 = b; if (b > v1) v1 = b; }
  u0 -= 4; v0 -= 4; u1 += 4; v1 += 4;
  const sw = Math.ceil((u1 - u0) / SHADOW_TEXEL), shh = Math.ceil((v1 - v0) / SHADOW_TEXEL);
  const SM = sh(Float32Array, sw * shh); SM.fill(-1e9);
  const s = { u: 0, v: 0, seed: 0 };
  for (let t = 0; t < nt; t++) {
    const ia = P.TI[t * 3], ib = P.TI[t * 3 + 1], ic = P.TI[t * 3 + 2], mat = MT[names[P.TM[t]]];
    const pr = q => { const p = [P.VP[q * 3], P.VP[q * 3 + 1], P.VP[q * 3 + 2]]; return [(V3.dot(p, u) - u0) / SHADOW_TEXEL, (V3.dot(p, v) - v0) / SHADOW_TEXEL, V3.dot(p, w)]; };
    const A0 = pr(ia), B0 = pr(ib), C0 = pr(ic);
    const area = (B0[0] - A0[0]) * (C0[1] - A0[1]) - (B0[1] - A0[1]) * (C0[0] - A0[0]);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(A0[0], B0[0], C0[0]))), x1 = Math.min(sw - 1, Math.ceil(Math.max(A0[0], B0[0], C0[0])));
    const y0 = Math.max(0, Math.floor(Math.min(A0[1], B0[1], C0[1]))), y1 = Math.min(shh - 1, Math.ceil(Math.max(A0[1], B0[1], C0[1])));
    s.seed = P.TS[t];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const wa = ((B0[0] - px) * (C0[1] - py) - (B0[1] - py) * (C0[0] - px)) / area, wb = ((C0[0] - px) * (A0[1] - py) - (C0[1] - py) * (A0[0] - px)) / area, wc = 1 - wa - wb;
      if (wa < -1e-4 || wb < -1e-4 || wc < -1e-4) continue;
      const d = wa * A0[2] + wb * B0[2] + wc * C0[2], k = y * sw + x;
      if (d <= SM[k]) continue;
      if (mat.alpha) { s.u = wa * P.VUV[ia * 2] + wb * P.VUV[ib * 2] + wc * P.VUV[ic * 2]; s.v = wa * P.VUV[ia * 2 + 1] + wb * P.VUV[ib * 2 + 1] + wc * P.VUV[ic * 2 + 1]; if (!mat.alpha(s)) continue; }
      SM[k] = d;
    }
  }
  Object.assign(P, { SM, sm: { u0, v0, w: sw, h: shh, texel: SHADOW_TEXEL, U: u, V: v, W: w } });
  P.anchors = anchors;
  P.stats = `${meshes.length} meshes, ${nt} triangles, shadow map ${sw}x${shh}`;
  return P;
}
