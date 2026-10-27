// Props the core owns (not tied to a region module): the pier at the end of the future road, survey stakes along
// the unbuilt road, rope rails on bridges, palms and huts on the fogged future islands.
import * as L from '../layout.mjs';
import { palm, rock } from './lib.mjs';
import { rand } from '../lib/noise.mjs';

export function coreProps(api) {
  const m = api.mesh();
  // ---- the pier: plank deck on posts out into the east bay, with a closed gate at its head ----
  const pr = L.FUTURE.pier, len = pr.x1 - pr.x0, w = pr.w;
  if (api.inCrop(pr.x0, pr.y0, 200)) {
    const deckZ = 3.2;
    m.mat('wood').col(0.66, 0.5, 0.32).seed(11);
    for (let x = pr.x0; x < pr.x1; x += 2.7) m.box(x + 1.2, pr.y0, deckZ, 2.4, w, 0.7, { uvScale: 1 });
    m.mat('wood').col(0.42, 0.3, 0.2).seed(12);
    for (let x = pr.x0 + 4; x <= pr.x1; x += 12) for (const s of [-1, 1]) m.box(x, pr.y0 + s * (w / 2 - 0.6), deckZ - 3, 1.5, 1.5, 9);
    // rails
    m.mat('wood').col(0.55, 0.4, 0.26).seed(13);
    for (const s of [-1, 1]) { m.box((pr.x0 + pr.x1) / 2, pr.y0 + s * (w / 2 - 0.5), deckZ + 3.2, len, 0.7, 0.7); for (let x = pr.x0; x <= pr.x1; x += 8) m.box(x, pr.y0 + s * (w / 2 - 0.5), deckZ + 1.6, 0.8, 0.8, 3.4); }
    // gate at the head: two posts, crossbar, closed panels
    const gx = pr.x0 + 6;
    m.mat('wood').col(0.45, 0.3, 0.18).seed(14);
    for (const s of [-1, 1]) m.box(gx, pr.y0 + s * (w / 2 + 0.6), deckZ + 4, 2, 2, 11);
    m.box(gx, pr.y0, deckZ + 9.4, 2, w + 4, 1.6);
    m.mat('wood').col(0.6, 0.42, 0.24).seed(15);
    m.box(gx, pr.y0, deckZ + 3.6, 1, w - 1, 6);
    m.mat('metal').col(0.75, 0.72, 0.62);
    m.box(gx - 0.8, pr.y0, deckZ + 4.2, 0.6, 2.6, 2.4);
    api.anchor('future_gate', gx, pr.y0, deckZ + 6, 10);
    api.add(m);
  }
  // ---- survey stakes with orange flags along the unbuilt road ----
  const fr = L.FUTURE.road, sm = api.mesh();
  for (let i = 8; i < fr.length - 4; i += 9) {
    const [x, y] = fr[i], a = fr[i + 1], tx = a[0] - x, ty = a[1] - y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    for (const s of [-1, 1]) {
      const px = x + nx * s * 11, py = y + ny * s * 11; if (!api.inCrop(px, py)) continue;
      const z = api.ground(px, py);
      sm.mat('wood').col(0.72, 0.56, 0.36).seed(i * 3 + s);
      sm.box(px, py, z + 2.5, 0.8, 0.8, 5.4);
      sm.mat('cloth').col(1.0, 0.42, 0.16);
      sm.box(px + 0.9, py, z + 4.6, 1.8, 0.2, 1.1);
    }
  }
  api.add(sm);
  // ---- the fogged future islands: a few palms ----
  for (const is of L.FUTURE.islands) {
    if (!api.inCrop(is.x, is.y, 150)) continue;
    const im = api.mesh(), r = rand(is.seed * 99);
    for (let k = 0; k < 5; k++) {
      const a = r() * Math.PI * 2, d = is.r * (0.45 + r() * 0.3), x = is.x + Math.cos(a) * d, y = is.y + Math.sin(a) * d * 0.8;
      if (api.water(x, y) !== null) continue;
      palm(im, { x, y, z: api.ground(x, y), h: 30 + r() * 10, seed: is.seed * 10 + k });
    }
    api.add(im);
  }
}
