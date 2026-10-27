// Worker thread: rebuilds the terrain / renderer from shared buffers once, then runs rectangles of the passes.
import { parentPort, workerData } from 'node:worker_threads';
import { fieldAccess } from './fields.mjs';
import { REG, makeTerrain } from './terrain.mjs';
import { makeProf } from './roads.mjs';
import { makeRenderer } from './render.mjs';
import { makeProps } from './props/runtime.mjs';
import * as L from './layout.mjs';

const { F, D, B, opt, plugins: pluginPaths, P } = workerData;
const plugins = [];
for (const path of pluginPaths) plugins.push((await import(path)).default);
const A = fieldAccess(F), prof = makeProf(D, A), T = makeTerrain(F, A, plugins, prof);
const { S, GW, GH } = opt;
let R = null;
const renderer = () => R || (R = makeRenderer(B, { ...opt, props: P ? makeProps(P, B, opt, plugins) : null, cliffHooks: cliffHooks() }));
function cliffHooks() { const o = {}; for (const m of plugins) if (m.cliff) { const r = m.cliffRegion ?? m.key, i = typeof r === 'string' ? REG.indexOf(r) : r; if (i >= 0) o[i] = m.cliff; } return o; }

const p = {};
function surfaceRect({ i0, i1, j0, j1 }) {
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const x = (i + 0.5) / S, y = (j + 0.5) / S, t = j * GW + i;
    T.surface(x, y, p, 3);
    B.H[t] = p.h; B.WL[t] = p.wl; B.WT[t] = p.wt;
    B.ALB[t * 3] = Math.round(Math.min(1, Math.max(0, p.r)) * 255); B.ALB[t * 3 + 1] = Math.round(Math.min(1, Math.max(0, p.g)) * 255); B.ALB[t * 3 + 2] = Math.round(Math.min(1, Math.max(0, p.b)) * 255);
    B.EMI[t * 3] = Math.min(65535, Math.round(p.er * 2048)); B.EMI[t * 3 + 1] = Math.min(65535, Math.round(p.eg * 2048)); B.EMI[t * 3 + 2] = Math.min(65535, Math.round(p.eb * 2048));
    B.MAT[t] = p.mat; B.GLOSS[t] = Math.round(Math.min(1, p.gloss) * 255); B.REG[t] = p.reg; B.ROAD[t] = p.road || 0;
  }
}

// soft sun shadows from the heightfield: march toward the sun, keep the tightest penumbra ratio
function shadowRect({ i0, i1, j0, j1 }) {
  const [lx, ly, lz] = L.SUN, hl = Math.hypot(lx, ly), dx = lx / hl, dy = ly / hl, tanE = lz / hl, H = B.H, WL = B.WL;
  const bl = (u, v) => {
    if (u < 0) u = 0; else if (u > GW - 1.001) u = GW - 1.001; if (v < 0) v = 0; else if (v > GH - 1.001) v = GH - 1.001;
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, t = j * GW + i, a = H[t] + (H[t + 1] - H[t]) * fu, b = H[t + GW] + (H[t + GW + 1] - H[t + GW]) * fu; return a + (b - a) * fv;
  };
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const t = j * GW + i, x = (i + 0.5) / S, y = (j + 0.5) / S, z0 = Math.max(H[t], WL[t]) + 0.15;
    let vis = 1, s = 0.7;
    while (s < 320) {
      const px = x + dx * s, py = y + dy * s, hh = bl(px * S - 0.5, py * S - 0.5), rz = z0 + tanE * s;
      if (rz > 175) break;
      const k = (rz - hh) / (s * 0.028 + 0.18);
      if (k < vis) { vis = k; if (vis <= 0) { vis = 0; break; } }
      s += 0.5 + s * 0.045;
    }
    B.SHD[t] = Math.round(Math.min(1, Math.max(0, vis)) * 255);
  }
}

parentPort.on('message', task => {
  try {
    if (task.pass === 'surface') surfaceRect(task);
    else if (task.pass === 'shadow') shadowRect(task);
    else if (task.pass === 'render') renderer().renderRect(task.i0, task.i1, task.j0, task.j1);
    parentPort.postMessage(task.pass);
  } catch (e) { parentPort.postMessage({ error: e.stack || String(e) }); }
});
parentPort.postMessage('ready');
