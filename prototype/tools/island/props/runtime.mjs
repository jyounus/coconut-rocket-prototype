// Worker-side props: rasterises the packed meshes into a per-rectangle G-buffer (depth = world z along the oblique
// ray, so it depth-tests directly against the terrain hit), shades prop samples (sun + soft shadow map + terrain
// shadow, sky with vertex AO, leaf translucency, specular, emissive, lava light spill) and answers shadow queries for
// the ground.
import { materialTable } from './build.mjs';
import { SUNC, SKY, BOUNCE, VIEW, HALF, SUN } from '../lib/light.mjs';
import * as L from '../layout.mjs';

const lin = c => c * c * (0.6 + 0.4 * c);

export function makeProps(P, B, opt, plugins) {
  const { S, GW, GH, SS } = opt, K = L.K, Ssub = S * SS;
  const MT = materialTable(plugins), mats = P.matNames.map(n => MT[n]);
  const { VP, VN, VUV, VC, VAO, TI, TM, TF, TS, nt } = P;
  // screen-space bounds per triangle (subsample units) + a coarse bin grid
  const BIN = 64, bw = Math.ceil(GW * SS / BIN), bh = Math.ceil(GH * SS / BIN) + 64;
  const bins = new Array(bw * bh);
  const sx = q => VP[q * 3] * Ssub, sy = q => (VP[q * 3 + 1] - K * VP[q * 3 + 2]) * Ssub;
  for (let t = 0; t < nt; t++) {
    const a = TI[t * 3], b = TI[t * 3 + 1], c = TI[t * 3 + 2];
    const x0 = Math.min(sx(a), sx(b), sx(c)), x1 = Math.max(sx(a), sx(b), sx(c)), y0 = Math.min(sy(a), sy(b), sy(c)), y1 = Math.max(sy(a), sy(b), sy(c));
    for (let by = Math.max(0, Math.floor(y0 / BIN)); by <= Math.min(bh - 1, Math.floor(y1 / BIN)); by++)
      for (let bx = Math.max(0, Math.floor(x0 / BIN)); bx <= Math.min(bw - 1, Math.floor(x1 / BIN)); bx++) (bins[by * bw + bx] ||= []).push(t);
  }
  const stamp = new Int32Array(nt).fill(-1); let stampId = 0;
  const s = { u: 0, v: 0, seed: 0, cr: 0, cg: 0, cb: 0, ao: 1, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1, ar: 0, ag: 0, ab: 0, spec: 0, shin: 20, trans: 0, er: 0, eg: 0, eb: 0 };

  // ---- G-buffer for columns [c0,c1) x rows [r0,r1) in subsample units; index (c - c0) * nRows + (r - r0) ----
  function raster(c0, c1, r0, r1) {
    const nR = r1 - r0, n = (c1 - c0) * nR;
    const depth = new Float32Array(n).fill(-1e9), tri = new Int32Array(n).fill(-1), b1 = new Float32Array(n), b2 = new Float32Array(n);
    stampId++;
    for (let by = Math.max(0, Math.floor((r0 - 1) / BIN)); by <= Math.min(bh - 1, Math.floor(r1 / BIN)); by++)
      for (let bx = Math.max(0, Math.floor((c0 - 1) / BIN)); bx <= Math.min(bw - 1, Math.floor(c1 / BIN)); bx++) {
        const list = bins[by * bw + bx]; if (!list) continue;
        for (const t of list) {
          if (stamp[t] === stampId) continue; stamp[t] = stampId;
          const ia = TI[t * 3], ib = TI[t * 3 + 1], ic = TI[t * 3 + 2];
          const ax = sx(ia), ay = sy(ia), bx_ = sx(ib), by_ = sy(ib), cx = sx(ic), cy = sy(ic);
          const area = (bx_ - ax) * (cy - ay) - (by_ - ay) * (cx - ax);
          if (Math.abs(area) < 1e-9) continue;
          const xa = Math.max(c0, Math.floor(Math.min(ax, bx_, cx))), xb = Math.min(c1 - 1, Math.ceil(Math.max(ax, bx_, cx)));
          const ya = Math.max(r0, Math.floor(Math.min(ay, by_, cy))), yb = Math.min(r1 - 1, Math.ceil(Math.max(ay, by_, cy)));
          if (xa > xb || ya > yb) continue;
          const za = VP[ia * 3 + 2], zb = VP[ib * 3 + 2], zc = VP[ic * 3 + 2], mat = mats[TM[t]];
          s.seed = TS[t];
          for (let x = xa; x <= xb; x++) for (let y = ya; y <= yb; y++) {
            const px = x + 0.5, py = y + 0.5;
            const wa = ((bx_ - px) * (cy - py) - (by_ - py) * (cx - px)) / area, wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area, wc = 1 - wa - wb;
            if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) continue;
            const z = wa * za + wb * zb + wc * zc, k = (x - c0) * nR + (y - r0);
            if (z <= depth[k]) continue;
            if (mat.alpha) { s.u = wa * VUV[ia * 2] + wb * VUV[ib * 2] + wc * VUV[ic * 2]; s.v = wa * VUV[ia * 2 + 1] + wb * VUV[ib * 2 + 1] + wc * VUV[ic * 2 + 1]; if (!mat.alpha(s)) continue; }
            depth[k] = z; tri[k] = t; b1[k] = wa; b2[k] = wb;
          }
        }
      }
    return { depth, tri, b1, b2 };
  }

  // ---- sun shadow map lookups ----
  const sm = P.sm, SM = P.SM;
  const tapX = [], tapY = [];
  for (let i = 0; i < 12; i++) { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 12); tapX.push(Math.cos(a) * r); tapY.push(Math.sin(a) * r); }
  function shadowAt(x, y, z) {
    if (!SM) return 1;
    const pu = x * sm.U[0] + y * sm.U[1] + z * sm.U[2], pv = x * sm.V[0] + y * sm.V[1] + z * sm.V[2], pd = x * sm.W[0] + y * sm.W[1] + z * sm.W[2];
    const fu = (pu - sm.u0) / sm.texel, fv = (pv - sm.v0) / sm.texel;
    if (fu < 1 || fv < 1 || fu > sm.w - 2 || fv > sm.h - 2) return 1;
    // blocker search (a small fixed window), then a penumbra sized by the blocker distance
    let bsum = 0, bn = 0;
    for (let i = 0; i < 12; i += 2) {
      const qu = Math.round(fu + tapX[i] * 6), qv = Math.round(fv + tapY[i] * 6);
      if (qu < 0 || qv < 0 || qu >= sm.w || qv >= sm.h) continue;
      const d = SM[qv * sm.w + qu]; if (d > pd + 0.25) { bsum += d; bn++; }
    }
    const c = SM[Math.round(fv) * sm.w + Math.round(fu)];
    if (!bn && c <= pd + 0.25) return 1;
    const occ = bn ? bsum / bn : c, pen = Math.min(4, 0.35 + (occ - pd) * 0.018) / sm.texel;
    let lit = 0;
    for (let i = 0; i < 12; i++) {
      const qu = Math.round(fu + tapX[i] * pen), qv = Math.round(fv + tapY[i] * pen);
      if (qu < 0 || qv < 0 || qu >= sm.w || qv >= sm.h) { lit++; continue; }
      if (SM[qv * sm.w + qu] <= pd + 0.25) lit++;
    }
    return lit / 12;
  }

  // ---- shade one prop sample ----
  const OUT = [0, 0, 0, 0], [lx, ly, lz] = SUN, [vx, vy, vz] = VIEW, [hx, hy, hz] = HALF;
  const blG = (u, v, c) => { u = Math.max(0, Math.min(GW - 1.001, u)); v = Math.max(0, Math.min(GH - 1.001, v)); const i = u | 0, j = v | 0, fu = u - i, fv = v - j, t = (j * GW + i) * 3 + c, r = GW * 3, G = B.GLOW; const a = G[t] + (G[t + 3] - G[t]) * fu, b = G[t + r] + (G[t + r + 3] - G[t + r]) * fu; return a + (b - a) * fv; };
  function shade(gb, gi, scx, scy, terrainShadow) {
    const t = gb.tri[gi], wa = gb.b1[gi], wb = gb.b2[gi], wc = 1 - wa - wb;
    const ia = TI[t * 3], ib = TI[t * 3 + 1], ic = TI[t * 3 + 2], mat = mats[TM[t]];
    const I3 = (A, k) => wa * A[ia * 3 + k] + wb * A[ib * 3 + k] + wc * A[ic * 3 + k];
    s.x = I3(VP, 0); s.y = I3(VP, 1); s.z = I3(VP, 2);
    let nx = I3(VN, 0), ny = I3(VN, 1), nz = I3(VN, 2), l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    // thin / two-sided surfaces: face the camera
    if (nx * vx + ny * vy + nz * vz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    s.nx = nx; s.ny = ny; s.nz = nz;
    s.u = wa * VUV[ia * 2] + wb * VUV[ib * 2] + wc * VUV[ic * 2]; s.v = wa * VUV[ia * 2 + 1] + wb * VUV[ib * 2 + 1] + wc * VUV[ic * 2 + 1];
    s.cr = I3(VC, 0); s.cg = I3(VC, 1); s.cb = I3(VC, 2); s.ao = wa * VAO[ia] + wb * VAO[ib] + wc * VAO[ic]; s.seed = TS[t];
    (mat.shade || mats[0].shade)(s);
    nx = s.nx; ny = s.ny; nz = s.nz;
    const ar = lin(Math.max(0, s.ar)), ag = lin(Math.max(0, s.ag)), ab = lin(Math.max(0, s.ab));
    const sun = Math.min(shadowAt(s.x, s.y, s.z + 0.15), terrainShadow(s.x, s.y, s.z + 0.3));
    const ndl = nx * lx + ny * ly + nz * lz, diff = Math.max(0, ndl) * sun;
    const ao = s.ao, skyT = (0.55 + 0.45 * nz) * ao, bounceT = (0.5 - 0.5 * nz) * 0.7 * ao;
    let r = ar * (SUNC[0] * diff + SKY[0] * skyT + BOUNCE[0] * bounceT);
    let g = ag * (SUNC[1] * diff + SKY[1] * skyT + BOUNCE[1] * bounceT);
    let b = ab * (SUNC[2] * diff + SKY[2] * skyT + BOUNCE[2] * bounceT);
    if (s.trans > 0 && ndl < 0) { const tr = s.trans * -ndl * sun * 0.9; r += ar * tr * SUNC[0] * 0.8; g += ag * tr * SUNC[1] * 1.05; b += ab * tr * SUNC[2] * 0.45; }
    if (s.spec > 0) { const sp = s.spec * Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), s.shin) * sun; r += sp * SUNC[0]; g += sp * SUNC[1]; b += sp * SUNC[2]; }
    const u = s.x * S - 0.5, v = s.y * S - 0.5, gr = blG(u, v, 0), gg = blG(u, v, 1), gbl = blG(u, v, 2);
    if (gr + gg + gbl > 0.002) { r += ar * gr * 2; g += ag * gg * 2; b += ab * gbl * 2; }
    OUT[0] = r + s.er; OUT[1] = g + s.eg; OUT[2] = b + s.eb; OUT[3] = TF[t] & 1;
    return OUT;
  }
  return { raster, shade, shadowAt };
}
