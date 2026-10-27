// The renderer: an oblique orthographic camera ray-marched over the heightfield one sub-column at a time
// (voxel-space style, exact hit interpolation), then per-sample shading: sun with soft cast shadows (terrain horizon
// field + the props' sun shadow map), sky light with ambient occlusion, bounce, specular, emissive; water with
// depth absorption, caustics, foam, waves and sun glints; props from a rasterised G-buffer, depth-tested against the
// terrain. Supersampled SS x SS per output pixel, tone mapped and graded to sRGB.
import { noise2, noise3, fbm2, fbm3, worley2, cellEdge, W, hash2, ihash2, clamp, lerp, smooth, sat } from './lib/noise.mjs';
import { M, RI, WT, NO_WATER } from './terrain.mjs';
import * as L from './layout.mjs';
import { SUNC, SKY, BOUNCE, VIEW, HALF } from './lib/light.mjs';

const lin = c => c * c * (0.6 + 0.4 * c);   // cheap sRGB -> linear (close to pow 2.2 for albedos)
const aces = x => { const v = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14); return v < 0 ? 0 : v > 1 ? 1 : v; };

export function makeRenderer(B, opt) {
  const { S, GW, GH, SS = 2, K = L.K } = opt;
  const { H, WL, WT: WTY, ALB, EMI, MAT, GLOSS, REG, AO, SHD, OUT, CAN, GLOW } = B;
  const props = opt.props || null;          // { raster(i0,i1,R0,R1) -> G-buffer, shade(...) }
  const cliffHooks = opt.cliffHooks || {};  // region index -> function(x,y,z,nx,ny,nz,out) from plug-ins
  const [lx, ly, lz] = L.SUN;
  // camera: from the point toward the viewer
  const [vx, vy, vz] = VIEW, [hx, hy, hz] = HALF;

  // ---- bilinear lookups in texel space ----
  function bl(g, u, v) {
    if (u < 0) u = 0; else if (u > GW - 1.001) u = GW - 1.001;
    if (v < 0) v = 0; else if (v > GH - 1.001) v = GH - 1.001;
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, t = j * GW + i;
    const a = g[t] + (g[t + 1] - g[t]) * fu, b = g[t + GW] + (g[t + GW + 1] - g[t + GW]) * fu;
    return a + (b - a) * fv;
  }
  function bl3(g, u, v, c, scale) {
    if (u < 0) u = 0; else if (u > GW - 1.001) u = GW - 1.001;
    if (v < 0) v = 0; else if (v > GH - 1.001) v = GH - 1.001;
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, t = (j * GW + i) * 3 + c, r = GW * 3;
    const a = g[t] + (g[t + 3] - g[t]) * fu, b = g[t + r] + (g[t + r + 3] - g[t + r]) * fu;
    return (a + (b - a) * fv) * scale;
  }
  const nearestT = (u, v) => { let i = Math.round(u), j = Math.round(v); i = i < 0 ? 0 : i >= GW ? GW - 1 : i; j = j < 0 ? 0 : j >= GH ? GH - 1 : j; return j * GW + i; };
  // the visible surface height (terrain or water) at world (x, y)
  function surfZ(x, y) {
    const u = x * S - 0.5, v = y * S - 0.5;
    if (u < 0 || v < 0 || u > GW - 1 || v > GH - 1) return 0;
    const h = bl(H, u, v), w = bl(WL, u, v);
    return w > h ? w : h;
  }

  // ---- procedural cliff faces per region ----
  const CL = [0, 0, 0];
  function cliff(reg, x, y, z, nx, ny, nz) {
    if (cliffHooks[reg]) { cliffHooks[reg](x, y, z, nx, ny, nz, CL); return CL; }
    const along = Math.abs(nx) > Math.abs(ny) ? y : x;   // horizontal coordinate across the face
    const n = fbm3(x * 0.08, y * 0.08, z * 0.12, 3), f = noise3(x * 0.5, y * 0.5, z * 0.7);
    let r, g, b;
    switch (reg) {
      case RI.temple: {   // masonry blocks
        const row = Math.floor(z / 2.3), fz = z / 2.3 - row, blk = (along + row * 2.1) / 4.6, fb = blk - Math.floor(blk);
        const mort = fz < 0.1 || fb < 0.06;
        const tone = hash2(Math.floor(blk), row, 5);
        r = 0.80 - tone * 0.16; g = 0.70 - tone * 0.14; b = 0.50 - tone * 0.12;
        if (mort) { r *= 0.55; g *= 0.52; b *= 0.48; }
        const moss = sat(fbm3(x * 0.05, y * 0.05, z * 0.15, 3) * 2.2 - 0.2 + (1 - z / 30) * 0.3);
        r = lerp(r, 0.30, moss * 0.6); g = lerp(g, 0.48, moss * 0.6); b = lerp(b, 0.20, moss * 0.6);
        break;
      }
      case RI.caves: {    // basalt column sides: vertical facets
        const col = along / 6.5, fc = col - Math.floor(col), tone = hash2(Math.floor(col), 0, 9);
        const facet = Math.abs(fc - 0.5) * 2;
        r = 0.26 + tone * 0.08 - facet * 0.06; g = r + 0.01; b = r + 0.07;
        if (fc < 0.07) { r *= 0.5; g *= 0.5; b *= 0.55; }
        break;
      }
      case RI.mine: {
        const st = Math.sin(z * 0.9 + n * 3) * 0.5 + 0.5;
        r = 0.62 + st * 0.12; g = 0.42 + st * 0.08; b = 0.25 + st * 0.05;
        break;
      }
      case RI.crystal: {
        const v = sat(1 - Math.abs(fbm3(x * 0.03, y * 0.03, z * 0.05, 3)) * 12);
        r = 0.46 + n * 0.08; g = 0.34 + n * 0.06; b = 0.56 + n * 0.08;
        r = lerp(r, 0.98, v * 0.6); g = lerp(g, 0.62, v * 0.6); b = lerp(b, 0.92, v * 0.6);
        break;
      }
      case RI.frost: {
        r = 0.42 + n * 0.1; g = 0.44 + n * 0.1; b = 0.52 + n * 0.1;
        const ledge = sat((nz - 0.42) * 6 + noise3(x * 0.2, y * 0.2, z * 0.2) * 0.8);
        r = lerp(r, 0.94, ledge); g = lerp(g, 0.96, ledge); b = lerp(b, 1.0, ledge);
        break;
      }
      case RI.storm: {
        const st = Math.sin(z * 1.4 + n * 2.5) * 0.5 + 0.5;
        r = 0.27 + st * 0.08; g = 0.28 + st * 0.08; b = 0.36 + st * 0.09;
        break;
      }
      case RI.magma: {
        const st = Math.sin(z * 0.7 + n * 4) * 0.5 + 0.5;
        r = 0.22 + st * 0.08; g = 0.16 + st * 0.05; b = 0.15 + st * 0.04;
        break;
      }
      case RI.grotto: { r = 0.18 + n * 0.06; g = 0.24 + n * 0.06; b = 0.32 + n * 0.08; break; }
      case RI.sea: case RI.lagoon: { r = 0.62 + n * 0.1; g = 0.58 + n * 0.1; b = 0.48 + n * 0.08; break; }
      default: {          // earthy jungle rock with a mossy top lip
        const st = Math.sin(z * 0.8 + n * 3) * 0.5 + 0.5;
        r = 0.50 + st * 0.12; g = 0.40 + st * 0.08; b = 0.30 + st * 0.05;
        const moss = sat(n * 2 + 0.2) * 0.4; r = lerp(r, 0.28, moss); g = lerp(g, 0.42, moss); b = lerp(b, 0.2, moss);
      }
    }
    const k = 0.9 + f * 0.12; CL[0] = r * k; CL[1] = g * k; CL[2] = b * k;
    return CL;
  }

  // ---- shading of one terrain/water sample; writes linear RGB into O ----
  const O = [0, 0, 0];
  function shadeGround(x, y, z, propShadow) {
    const u = x * S - 0.5, v = y * S - 0.5, e = 1 / S;
    const h = bl(H, u, v), wl = bl(WL, u, v);
    const t = nearestT(u, v), mat = MAT[t], reg = REG[t], gloss = GLOSS[t] / 255;
    let sh = bl(SHD, u, v) / 255 * propShadow, ao = bl(AO, u, v) / 255;
    let ar = lin(bl3(ALB, u, v, 0, 1 / 255)), ag = lin(bl3(ALB, u, v, 1, 1 / 255)), ab = lin(bl3(ALB, u, v, 2, 1 / 255));
    const er = bl3(EMI, u, v, 0, 1 / 2048), eg = bl3(EMI, u, v, 1, 1 / 2048), eb = bl3(EMI, u, v, 2, 1 / 2048);
    if (wl > h + 0.03) return shadeWater(x, y, wl, h, u, v, t, ar, ag, ab, sh, ao, er, eg, eb);
    // normal from the heightfield
    const dzdx = (bl(H, u + 1, v) - bl(H, u - 1, v)) * S * 0.5, dzdy = (bl(H, u, v + 1) - bl(H, u, v - 1)) * S * 0.5;
    let nx = -dzdx, ny = -dzdy, nz = 1; { const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; }
    // cliff faces: procedural rock with its own bump
    const st = smooth(0.78, 0.5, nz);
    if (st > 0 && mat !== M.LAVA && mat !== M.FOLIAGE && mat !== M.WOOD && mat !== M.STONE) {
      const c = cliff(reg, x, y, z, nx, ny, nz);
      ar = lerp(ar, lin(c[0]), st); ag = lerp(ag, lin(c[1]), st); ab = lerp(ab, lin(c[2]), st);
      const s = 0.45, b0 = fbm3(x * s, y * s, z * s * 1.4, 3), bx = fbm3((x + 0.3) * s, y * s, z * s * 1.4, 3), bzz = fbm3(x * s, y * s, (z + 0.3) * s * 1.4, 3);
      nx += (bx - b0) * 2.4 * st; nz += (bzz - b0) * 1.2 * st;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    }
    let ndl = nx * lx + ny * ly + nz * lz;
    let wrap = 0;
    if (mat === M.FOLIAGE || mat === M.GRASS) wrap = mat === M.FOLIAGE ? 0.35 : 0.15;
    if (mat === M.SNOW) wrap = 0.2;
    const diff = Math.max(0, (ndl + wrap) / (1 + wrap)) * sh;
    const skyT = (0.55 + 0.45 * nz) * ao, bounceT = (0.5 - 0.5 * nz) * 0.6 + 0.12 * (1 - ao);
    let skyR = SKY[0], skyG = SKY[1], skyB = SKY[2];
    if (mat === M.SNOW) { skyR *= 0.85; skyG *= 1.0; skyB *= 1.25; }
    let r = ar * (SUNC[0] * diff + skyR * skyT + BOUNCE[0] * bounceT);
    let g = ag * (SUNC[1] * diff + skyG * skyT + BOUNCE[1] * bounceT);
    let b = ab * (SUNC[2] * diff + skyB * skyT + BOUNCE[2] * bounceT);
    // foliage: light through leaves at grazing sun, darker cavities
    if (mat === M.FOLIAGE) { const tr = Math.max(0, 1 - Math.abs(ndl)) * sh * 0.25; r += ar * tr * 0.6; g += ag * tr * 1.0; b += ab * tr * 0.2; const cav = 0.75 + 0.25 * ao; r *= cav; g *= cav; b *= cav; }
    // specular
    const ndh = Math.max(0, nx * hx + ny * hy + nz * hz);
    let spec = 0;
    if (gloss > 0) spec += gloss * 0.9 * Math.pow(ndh, 18 + 120 * gloss) * sh;
    if (mat === M.SNOW) { spec += 0.06 * Math.pow(ndh, 12) * sh; if (ihash2(Math.floor(x * 7), Math.floor(y * 7), 3) % 97 === 0 && ndl > 0.2) spec += 1.6 * sh; }
    if (mat === M.CRYSTAL) spec += 0.9 * Math.pow(ndh, 60) * sh;
    if (mat === M.METAL) { const k = 1.6 * Math.pow(ndh, 30) * sh; r += ar * k * 2; g += ag * k * 2; b += ab * k * 2; }
    if (mat === M.LAVA) { r = ar * 0.15 * (1 + diff); g = ag * 0.1 * (1 + diff); b = ab * 0.08; }
    r += spec * SUNC[0] * 0.5 + er; g += spec * SUNC[1] * 0.5 + eg; b += spec * SUNC[2] * 0.5 + eb;
    // light spilled from nearby emitters (lava, crystals, glowing moss)
    const gr = bl3(GLOW, u, v, 0, 1), gg = bl3(GLOW, u, v, 1, 1), gb = bl3(GLOW, u, v, 2, 1);
    if (gr + gg + gb > 0.002) { r += ar * gr * 2.2 + gr * 0.05; g += ag * gg * 2.2 + gg * 0.05; b += ab * gb * 2.2 + gb * 0.05; }
    O[0] = r; O[1] = g; O[2] = b;
    return O;
  }

  // ---- water ----
  function shadeWater(x, y, wl, h, u, v, t, ar, ag, ab, sh, ao, er, eg, eb) {
    const type = WTY[t], depth = Math.max(0, wl - h);
    // wave normal (finite differences of two noise layers), calmer inland
    const amp = type === WT.SEA ? 1 : type === WT.BOG ? 0.15 : 0.45;
    const wn = (px, py) => noise2(px * 0.09, py * 0.16) * 1.0 + noise2(px * 0.23 + 7, py * 0.37) * 0.5 + noise2(px * 0.6, py * 0.8 + 3) * 0.25;
    const w0 = wn(x, y), dwx = (wn(x + 0.25, y) - w0) * 4, dwy = (wn(x, y + 0.25) - w0) * 4;
    // flow down steep water (rapids, waterfall)
    const wS = (a, b) => { const w = bl(WL, a, b); return w < wl - 3 ? wl : w; };   // ignore the dry side of the shore (WL there is 'no water')
    const gx = (wS(u + 1, v) - wS(u - 1, v)) * S * 0.5, gy = (wS(u, v + 1) - wS(u, v - 1)) * S * 0.5, slope = Math.hypot(gx, gy);
    let nx = -dwx * 0.09 * amp - gx * 0.6, ny = -dwy * 0.09 * amp - gy * 0.6, nz = 1; { const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; }
    // floor: lit bed with caustics, seen through the water
    let caus = 0;
    if (type === WT.SEA || type === WT.LAGOON || type === WT.STREAM) {
      const cx = x * 0.13 + fbm2(x * 0.05, y * 0.05, 2) * 1.6, cy = y * 0.13 + fbm2(x * 0.05 + 4, y * 0.05, 2) * 1.6;
      worley2(cx, cy, 1, 201); const e1 = W.f2 - W.f1;
      worley2(cx * 1.6 + 3, cy * 1.6, 1, 202); const e2 = W.f2 - W.f1;
      caus = (Math.exp(-e1 * 22) * 0.8 + Math.exp(-e2 * 22) * 0.5) * smooth(0.4, 2.2, depth) * (1 - smooth(3, 9, depth)) * 0.35;
    }
    const floorL = sh * (0.75 + caus * 1.5) * 0.62 + 0.18;
    let fr = ar * floorL * SUNC[0], fg = ag * floorL * SUNC[1], fb = ab * floorL * SUNC[2];
    // absorption and scattering
    let sr, sg, sb, kr, kg, kb;
    if (type === WT.BOG) { kr = 0.55; kg = 0.42; kb = 0.75; sr = 0.040; sg = 0.055; sb = 0.012; }
    else if (type === WT.SEA) { kr = 0.55; kg = 0.13; kb = 0.075; sr = 0.004; sg = 0.075; sb = 0.15; }
    else { kr = 0.5; kg = 0.12; kb = 0.1; sr = 0.006; sg = 0.11; sb = 0.12; }
    const d2 = depth * 1.6, Tr = Math.exp(-kr * d2), Tg = Math.exp(-kg * d2), Tb = Math.exp(-kb * d2);
    const scatL = 0.55 + 0.45 * sh;
    let r = fr * Tr + sr * (1 - Tr) * 3.2 * scatL, g = fg * Tg + sg * (1 - Tg) * 3.2 * scatL, b = fb * Tb + sb * (1 - Tb) * 3.2 * scatL;
    if (type === WT.BOG) {   // floating algae and duckweed
      const al = sat(fbm2(x * 0.09, y * 0.09, 3) * 2.2 - 0.1), dk = noise2(x * 0.8, y * 0.8);
      if (al > 0) { const k = al * (0.7 + 0.2 * dk); r = lerp(r, 0.10 * (0.5 + sh), k); g = lerp(g, 0.19 * (0.5 + sh), k); b = lerp(b, 0.03, k); }
      // lily pads (a notched disc, lit, with a darker rim) and the odd pink flower
      worley2(x / 9, y / 9, 0.8, 221);
      const pr = 0.17 + ((W.id >>> 8) & 255) / 255 * 0.14;
      if ((W.id & 255) < 120 && W.f1 < pr) {
        const a = Math.atan2(y / 9 - W.py, x / 9 - W.px), notch = Math.abs(((a - (W.id & 7)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) < 0.35 && W.f1 > pr * 0.15;
        if (!notch) {
          const rim = smooth(pr * 0.75, pr, W.f1), L0 = (0.25 + 0.5 * sh) * (1 - rim * 0.4), vv = ((W.id >>> 16) & 255) / 255;
          r = 0.12 * L0 * (0.8 + vv * 0.4); g = 0.32 * L0; b = 0.07 * L0;
          if (((W.id >>> 12) & 15) < 2 && W.f1 < pr * 0.35) { r = 0.95 * L0; g = 0.45 * L0; b = 0.62 * L0; }
          sh = sh * 0.3;   // no glints on the pads
        }
      }
    }
    // reflection of the sky (Fresnel) and sun glints
    const ndv = Math.max(0, nx * vx + ny * vy + nz * vz), F = 0.02 + 0.98 * Math.pow(1 - ndv, 5);
    r = lerp(r, 0.55, F); g = lerp(g, 0.72, F); b = lerp(b, 0.95, F);
    const ndh = Math.max(0, nx * hx + ny * hy + nz * hz);
    const glint = type === WT.BOG ? Math.pow(ndh, 30) * 0.06 * sh : (Math.pow(ndh, 300) * 9 + Math.pow(ndh, 40) * 0.12) * sh;
    if (type === WT.BOG) { r *= 0.85; g *= 0.9; b *= 0.8; }
    r += glint * SUNC[0]; g += glint * SUNC[1]; b += glint * SUNC[2];
    // foam: shore line, around rocks, white water on slopes
    let foam = 0;
    if (type !== WT.BOG) {
      const fn = noise2(x * 0.18, y * 0.18) * 0.5 + noise2(x * 0.5, y * 0.5) * 0.3;
      const shore = 1 - smooth(0.0, type === WT.SEA ? 0.45 : 0.3, depth + fn * 0.22);
      foam = Math.max(foam, shore * 0.9);
      if (type === WT.SEA) { const band = Math.exp(-((depth - 1.1 - fn * 0.5) ** 2) / 0.03) * 0.55 * sat(0.3 + fn * 2.5); foam = Math.max(foam, band); }
      foam = Math.max(foam, smooth(0.25, 1.1, slope) * (0.75 + fn * 0.4));
      worley2(x * 0.6, y * 0.6, 1, 211); const bub = smooth(0.3, 0.0, W.f1);
      foam = sat(foam * (0.55 + bub * 0.6));
    }
    if (foam > 0) { const fl = (0.7 + 0.3 * sh) * 1.25; r = lerp(r, 0.95 * fl, foam); g = lerp(g, 0.98 * fl, foam); b = lerp(b, 1.0 * fl, foam); }
    // shade the surface where it is in shadow a little (scatter less)
    const k = 0.8 + 0.2 * sh; r *= k; g *= k; b *= k;
    const gr = bl3(GLOW, u, v, 0, 1), gg = bl3(GLOW, u, v, 1, 1), gb = bl3(GLOW, u, v, 2, 1);
    O[0] = r + er + gr * 0.25; O[1] = g + eg + gg * 0.25; O[2] = b + eb + gb * 0.25;
    return O;
  }

  // ---- render a rectangle of output pixels [i0,i1) x [j0,j1) ----
  function renderRect(i0, i1, j0, j1) {
    const R0 = j0 * SS, R1 = j1 * SS, nRows = R1 - R0, Ssub = S * SS;
    const zMax = 170, yEnd = R0 / Ssub - 1;
    const acc = new Float32Array((i1 - i0) * (j1 - j0) * 3), cov = props ? new Float32Array((i1 - i0) * (j1 - j0) * 4) : null;
    const hitY = new Float32Array(nRows), hitZ = new Float32Array(nRows);
    const gb = props ? props.raster(i0 * SS, i1 * SS, R0, R1) : null;   // prop G-buffer for this rect
    const dy = 1 / (Ssub * 2);
    for (let ci = i0 * SS; ci < i1 * SS; ci++) {
      const x = (ci + 0.5) / Ssub;
      // march from south (front) to north (back)
      let y = R1 / Ssub + K * zMax + 1, z = surfZ(x, y), ry = (y - K * z) * Ssub - 0.5, next = R1 - 1;
      hitY.fill(NaN);
      while (next >= R0 && y > yEnd) {
        const yn = y - dy, zn = surfZ(x, yn), ryn = (yn - K * zn) * Ssub - 0.5;
        while (next >= R0 && ryn <= next) {
          const t = ry - ryn > 1e-6 ? (ry - next) / (ry - ryn) : 1;
          const yh = y + (yn - y) * clamp(t);
          hitY[next - R0] = yh; hitZ[next - R0] = z + (zn - z) * clamp(t);
          next--;
        }
        y = yn; z = zn; ry = ryn;
      }
      const pi = ((ci / SS) | 0) - i0;
      for (let r = 0; r < nRows; r++) {
        const yh = hitY[r]; let cr, cg, cb, isProp = false, isCan = false;
        const gi = gb ? (ci - i0 * SS) * nRows + r : -1;
        const tz = yh === yh ? hitZ[r] : -1e9;
        if (gb && gb.depth[gi] > tz + 0.05) {
          const c = props.shade(gb, gi, (ci + 0.5) / Ssub, (R0 + r + 0.5) / Ssub, shadowAtTerrain);
          cr = c[0]; cg = c[1]; cb = c[2]; isProp = true; isCan = c[3] > 0;
        } else if (yh === yh) {
          const ps = props ? props.shadowAt(x, yh, tz) : 1;
          const c = shadeGround(x, yh, tz, ps); cr = c[0]; cg = c[1]; cb = c[2];
        } else { cr = 0.02; cg = 0.1; cb = 0.18; }
        const pj = (((R0 + r) / SS) | 0) - j0, o = (pj * (i1 - i0) + pi);
        acc[o * 3] += cr; acc[o * 3 + 1] += cg; acc[o * 3 + 2] += cb;
        if (cov && isCan) { cov[o * 4] += cr; cov[o * 4 + 1] += cg; cov[o * 4 + 2] += cb; cov[o * 4 + 3] += 1; }
      }
    }
    // resolve: average, tone map, grade, write
    const n2 = SS * SS;
    for (let pj = 0; pj < j1 - j0; pj++) for (let pi = 0; pi < i1 - i0; pi++) {
      const o = pj * (i1 - i0) + pi, gidx = ((j0 + pj) * GW + (i0 + pi));
      const rgb = grade(acc[o * 3] / n2, acc[o * 3 + 1] / n2, acc[o * 3 + 2] / n2);
      OUT[gidx * 3] = rgb[0]; OUT[gidx * 3 + 1] = rgb[1]; OUT[gidx * 3 + 2] = rgb[2];
      if (cov && CAN) {
        const a = cov[o * 4 + 3] / n2;
        if (a > 0) { const c = grade(cov[o * 4] / cov[o * 4 + 3], cov[o * 4 + 1] / cov[o * 4 + 3], cov[o * 4 + 2] / cov[o * 4 + 3]); CAN[gidx * 4] = c[0]; CAN[gidx * 4 + 1] = c[1]; CAN[gidx * 4 + 2] = c[2]; CAN[gidx * 4 + 3] = Math.round(a * 255); }
      }
    }
  }

  // terrain shadow for any point (props use it): horizon march over the heightfield toward the sun
  function shadowAtTerrain(x, y, z) {
    const hl = Math.hypot(lx, ly), dx = lx / hl, dy = ly / hl, tanE = lz / hl;
    let vis = 1, s = 0.8;
    while (s < 300) {
      const px = x + dx * s, py = y + dy * s, hh = bl(H, px * S - 0.5, py * S - 0.5), rz = z + tanE * s;
      if (rz > 175) break;
      const k = (rz - hh) / (s * 0.06 + 0.4);
      if (k < vis) { vis = k; if (vis <= 0) return 0; }
      s += 0.6 + s * 0.05;
    }
    return clamp(vis);
  }

  // final grade: exposure, filmic tone curve, a touch of saturation and warmth
  const G3 = [0, 0, 0];
  function grade(r, g, b) {
    const ex = 1.0;
    r = aces(r * ex); g = aces(g * ex); b = aces(b * ex);
    const l = r * 0.3 + g * 0.55 + b * 0.15, sat = 1.04;
    r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
    G3[0] = Math.round(255 * Math.pow(clamp(r), 1 / 2.2)); G3[1] = Math.round(255 * Math.pow(clamp(g), 1 / 2.2)); G3[2] = Math.round(255 * Math.pow(clamp(b), 1 / 2.2));
    return G3;
  }

  return { renderRect, surfZ, shadowAtTerrain, shadeGround, grade };
}
