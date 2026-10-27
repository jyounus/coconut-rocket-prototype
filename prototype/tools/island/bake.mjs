#!/usr/bin/env node
// Coconut Island bake: pre-renders the adventure world map like pre-rendered 3D.
//
//   node prototype/tools/island/bake.mjs                       full bake -> prototype/art/island/ (tiles + map.json)
//   node prototype/tools/island/bake.mjs --region beach        quick preview of one region (its bounds) -> scratch PNG
//   node prototype/tools/island/bake.mjs --crop 600,2050,1000,2450 --preview /abs/out.png   any window (map units)
//   options: --ss N (supersampling, default 2), --no-props, --preview <png>, --out <dir>, --full-png <png>, --quality Q (JPEG, default 78)
//
// Passes: distance fields (main) -> stream/road profiles (main) -> surface (workers: height, water, albedo,
// emissive, material) -> ambient occlusion (main) -> sun shadows (workers) -> props: meshes + sun shadow map
// (main) -> render (workers: oblique ray-march + shading, supersampled) -> tiles / layers / map.json.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readdirSync, writeFileSync, mkdirSync, existsSync, rmSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { cpus, tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { buildFields, fieldAccess, S, GW, GH } from './fields.mjs';
import { makeTerrain } from './terrain.mjs';
import { computeProfiles, makeProf } from './roads.mjs';
import { boxBlur } from './lib/geom.mjs';
import { encodePNG } from './lib/png.mjs';
import { Pool } from './lib/pool.mjs';
import { buildProps } from './props/build.mjs';
import { writeMapJson } from './mapjson.mjs';
import * as L from './layout.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const SCRATCH = process.env.ISLAND_SCRATCH || join(tmpdir(), 'island-bake');   // previews and intermediate PNG tiles

// ---------- args ----------
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SS = +arg('ss', 2), NOPROPS = !!arg('no-props', false), OUT = resolve(arg('out', join(ROOT, 'prototype/art/island')));
const t0 = Date.now(), lap = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${m}`);

// ---------- plug-ins ----------
const regionDir = join(HERE, 'regions');
const pluginFiles = existsSync(regionDir) ? readdirSync(regionDir).filter(f => f.endsWith('.mjs') && !f.startsWith('_')).sort() : [];
const pluginPaths = pluginFiles.map(f => pathToFileURL(join(regionDir, f)).href);
const plugins = [];
for (const p of pluginPaths) { const m = (await import(p)).default; if (!m) throw new Error('region module without default export: ' + p); plugins.push(m); }
plugins.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
lap(`plug-ins: ${plugins.map(m => m.key).join(', ') || 'none'}`);

// ---------- crop (preview) ----------
let crop = null;
if (arg('crop')) crop = String(arg('crop')).split(',').map(Number);
if (arg('region')) {
  const key = arg('region'), m = plugins.find(q => q.key === key), r = L.REGION[key];
  if (m?.preview) crop = m.preview; else if (m?.bounds) crop = m.bounds; else if (r) crop = [r.label_at[0] - 260, r.label_at[1] - 300, r.label_at[0] + 260, r.label_at[1] + 300];
  else throw new Error('unknown region ' + key);
}
const outRect = crop ? [Math.max(0, Math.floor(crop[0] * S)), Math.max(0, Math.floor(crop[1] * S)), Math.min(GW, Math.ceil(crop[2] * S)), Math.min(GH, Math.ceil(crop[3] * S))] : [0, 0, GW, GH];
// the surface must cover what the shadows (toward the sun, north-west) and the oblique march (south) can see
const surfRect = crop ? [Math.max(0, outRect[0] - 330 * S), Math.max(0, outRect[1] - 300 * S), Math.min(GW, outRect[2] + 60 * S), Math.min(GH, outRect[3] + 110 * S)].map(Math.round) : [0, 0, GW, GH];

// ---------- fields, profiles ----------
const F = buildFields();
const A = fieldAccess(F);
const Tm = makeTerrain(F, A, plugins, null);
const D = computeProfiles(Tm, A);
lap('fields + profiles');

// ---------- shared surface buffers ----------
const N = GW * GH, sh = (C, n) => new C(new SharedArrayBuffer(n * C.BYTES_PER_ELEMENT));
const B = {
  H: sh(Float32Array, N), WL: sh(Float32Array, N), WT: sh(Uint8Array, N), ALB: sh(Uint8Array, N * 3), EMI: sh(Uint16Array, N * 3),
  MAT: sh(Uint8Array, N), GLOSS: sh(Uint8Array, N), REG: sh(Uint8Array, N), ROAD: sh(Uint8Array, N), AO: sh(Uint8Array, N), SHD: sh(Uint8Array, N),
  OUT: sh(Uint8Array, N * 3), CAN: sh(Uint8Array, N * 4), GLOW: sh(Float32Array, N * 3),
};
B.WL.fill(-1e4);
const opt = { S, GW, GH, SS, K: L.K };
const nW = Math.max(2, cpus().length - 2);
const tiles = (r, tw, th) => { const o = []; for (let j = r[1]; j < r[3]; j += th) for (let i = r[0]; i < r[2]; i += tw) o.push({ i0: i, i1: Math.min(r[2], i + tw), j0: j, j1: Math.min(r[3], j + th) }); return o; };

let pool = new Pool(nW, new URL('./worker.mjs', import.meta.url), { F, D, B, opt, plugins: pluginPaths, P: null });
await pool.run(tiles(surfRect, 256, 128).map(t => ({ pass: 'surface', ...t })));
lap('surface');

// ---------- ambient occlusion: multi-scale height cavities ----------
{
  const Z = new Float32Array(N); for (let t = 0; t < N; t++) Z[t] = Math.max(B.H[t], B.WL[t]);
  const ao = new Float32Array(N).fill(1);
  for (const [r, w] of [[2, 0.22], [6, 0.3], [16, 0.28], [42, 0.22]]) {
    const bz = boxBlur(Z, GW, GH, r, 2), R = r / S;
    for (let t = 0; t < N; t++) { const d = bz[t] - Z[t]; if (d > 0) ao[t] -= w * Math.min(1, d / (R * 0.45 + 0.3)); else ao[t] += w * 0.12 * Math.min(1, -d / (R * 0.6 + 0.3)); }
  }
  for (let t = 0; t < N; t++) B.AO[t] = Math.round(Math.min(1, Math.max(0.12, ao[t])) * 255);
}
lap('ambient occlusion');
// ---------- emissive light spill: lava, crystals and glowing moss light up their surroundings ----------
for (let c = 0; c < 3; c++) {
  const e = new Float32Array(N); let any = false; for (let t = 0; t < N; t++) { e[t] = B.EMI[t * 3 + c] / 2048; if (e[t]) any = true; }
  if (!any) continue;
  const near = boxBlur(e, GW, GH, Math.round(4 * S), 3), far = boxBlur(e, GW, GH, Math.round(18 * S), 3);
  for (let t = 0; t < N; t++) B.GLOW[t * 3 + c] = near[t] * 0.55 + far[t] * 0.9;
}
lap('glow');
await pool.run(tiles(surfRect, 256, 128).map(t => ({ pass: 'shadow', ...t })));
lap('sun shadows');

// ---------- props ----------
let P = null;
if (!NOPROPS) {
  P = await buildProps(plugins, { F, A, D, B, opt, crop: crop ? surfRect.map(v => v / S) : null });
  lap(`props: ${P ? P.stats : 'none'}`);
}
if (P) { pool.close(); pool = new Pool(nW, new URL('./worker.mjs', import.meta.url), { F, D, B, opt, plugins: pluginPaths, P }); }

// ---------- render ----------
await pool.run(tiles(outRect, 64, 384).map(t => ({ pass: 'render', ...t })), (d, n) => { if (d % 50 === 0 || d === n) process.stdout.write(`\r  render ${d}/${n}`); });
process.stdout.write('\n');
lap('render');
pool.close();

// ---------- cloud banks over the future islands (still to be explored): lit puffs, haze, shadows on the sea ----------
{
  const { fbm2, smooth } = await import('./lib/noise.mjs');
  for (const is of L.FUTURE.islands) {
    const R = is.r + 110;
    const dens = (x, y) => { const d = Math.hypot(x - is.x, (y - is.y + 14) * 1.25); return smooth(R, is.r * 0.55, d) * (fbm2(x * 0.016 + is.seed * 7, y * 0.022, 5) * 0.9 + 0.55) + fbm2(x * 0.06, y * 0.07 + is.seed, 3) * 0.08; };
    const i0 = Math.max(outRect[0], Math.floor((is.x - R - 20) * S)), i1 = Math.min(outRect[2], Math.ceil((is.x + R + 20) * S));
    const j0 = Math.max(outRect[1], Math.floor((is.y - R - 40) * S)), j1 = Math.min(outRect[3], Math.ceil((is.y + R + 20) * S));
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const x = (i + 0.5) / S, y = (j + 0.5) / S, D = dens(x, y);
      const a = smooth(0.42, 0.7, D), haze = 0.3 * smooth(R, is.r * 0.4, Math.hypot(x - is.x, (y - is.y) * 1.2));
      const shadow = 0.3 * smooth(0.42, 0.7, dens(x - 16, y - 11)) * (1 - a);
      const lit = Math.max(-1, Math.min(1, (D - dens(x - 4, y - 4)) * 5));
      const t = (j * GW + i) * 3;
      const cl = [236 + 18 * lit, 241 + 13 * lit, 248 + 6 * lit].map(v => Math.min(255, v - (1 - D) * 18));
      for (let c = 0; c < 3; c++) {
        let v = B.OUT[t + c] * (1 - shadow);
        v += ([226, 234, 242][c] - v) * haze;
        v += (cl[c] - v) * a * 0.92;
        B.OUT[t + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  }
}
lap('fog');

// ---------- outputs ----------
const cropPx = (buf, ch, r) => { const w = r[2] - r[0], h = r[3] - r[1], o = new Uint8Array(w * h * ch); for (let j = 0; j < h; j++) o.set(buf.subarray(((r[1] + j) * GW + r[0]) * ch, ((r[1] + j) * GW + r[2]) * ch), j * w * ch); return o; };
if (crop) {
  mkdirSync(SCRATCH, { recursive: true });
  const file = resolve(arg('preview', join(SCRATCH, `crop_${arg('region', 'x')}.png`)));
  writeFileSync(file, encodePNG(outRect[2] - outRect[0], outRect[3] - outRect[1], cropPx(B.OUT, 3, outRect), 3, 3));
  lap(`preview -> ${file}`);
} else {
  mkdirSync(OUT, { recursive: true });
  const TILE = 512, cols = Math.ceil(GW / TILE), rows = Math.ceil(GH / TILE), tmp = join(SCRATCH, 'tiles'); mkdirSync(tmp, { recursive: true });
  for (const f of readdirSync(OUT)) if (/^(base|canopy)_\d+_\d+\.(jpg|png)$/.test(f)) rmSync(join(OUT, f));
  const hash = createHash('sha1'), q = String(arg('quality', 78)), canopyHave = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const rect = [c * TILE, r * TILE, Math.min(GW, (c + 1) * TILE), Math.min(GH, (r + 1) * TILE)], w = rect[2] - rect[0], h = rect[3] - rect[1];
    const png = join(tmp, `base_${c}_${r}.png`), jpg = join(OUT, `base_${c}_${r}.jpg`);
    const px = cropPx(B.OUT, 3, rect); hash.update(px);
    writeFileSync(png, encodePNG(w, h, px, 3, 1));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', q, png, '--out', jpg], { stdio: 'ignore' });
    const cp = cropPx(B.CAN, 4, rect); let any = false; for (let k = 3; k < cp.length; k += 4) if (cp[k]) { any = true; break; }
    if (any) { writeFileSync(join(OUT, `canopy_${c}_${r}.png`), encodePNG(w, h, cp, 4, 9)); canopyHave.push([c, r]); }
  }
  const v = hash.digest('hex').slice(0, 10);
  let total = 0; for (const f of readdirSync(OUT)) if (/^(base|canopy)_/.test(f)) total += statSync(join(OUT, f)).size;
  lap(`tiles: ${cols}x${rows}, canopy tiles ${canopyHave.length}, ${(total / 1048576).toFixed(2)} MB`);
  writeMapJson({ OUT, B, A, D, P, plugins, opt, tiles: { scale: S, tile: TILE, cols, rows, file: 'base_{c}_{r}.jpg', v }, canopyHave, LAVA: Tm.LAVA, file: join(OUT, 'map.json') });
  lap('map.json');
  if (arg('full-png')) { writeFileSync(resolve(arg('full-png')), encodePNG(GW, GH, B.OUT, 3, 1)); lap('full png'); }
}
