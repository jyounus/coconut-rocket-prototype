// MeshBuilder: procedural triangle meshes in world map units (x east, y south, z up) for props.
// Every vertex carries a position, normal, uv, colour (sRGB 0..1) and an ambient-occlusion factor; every triangle
// a material (by name, see props/materials.mjs or a region module's `materials`) and a canopy flag.
//
//   const m = new MeshBuilder();
//   m.mat('bark').col(0.5, 0.35, 0.2);
//   m.tube([[x, y, 0], [x + 2, y, 30]], [1.6, 1.1], { seg: 10 });
//   m.mat('frond').ribbon(spine, widths, sides);

const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const V3 = { norm, cross, sub, add, scl, dot };

export class MeshBuilder {
  constructor() {
    this.P = []; this.N = []; this.UV = []; this.C = []; this.AO = [];
    this.T = []; this.TM = []; this.TF = []; this.TS = [];
    this._mat = 'default'; this._col = [0.7, 0.7, 0.7]; this._ao = 1; this._flags = 0; this._seed = 0;
  }
  mat(name) { this._mat = name; return this; }
  col(r, g, b) { this._col = Array.isArray(r) ? r.slice(0, 3) : [r, g, b]; return this; }
  ao(v) { this._ao = v; return this; }
  seed(n) { this._seed = n >>> 0; return this; }
  canopy(on = true) { this._flags = on ? this._flags | 1 : this._flags & ~1; return this; }
  vert(p, n, u = 0, v = 0, col = null, ao = null) {
    this.P.push(p[0], p[1], p[2]); const nn = norm(n); this.N.push(nn[0], nn[1], nn[2]); this.UV.push(u, v);
    const c = col || this._col; this.C.push(c[0], c[1], c[2]); this.AO.push(ao ?? this._ao);
    return this.P.length / 3 - 1;
  }
  tri(a, b, c) { this.T.push(a, b, c); this.TM.push(this._mat); this.TF.push(this._flags); this.TS.push(this._seed); return this; }
  quad(a, b, c, d) { return this.tri(a, b, c).tri(a, c, d); }
  get count() { return this.T.length / 3; }

  // generalised cylinder along a polyline. radius: number | array | (t, angle) => r. colFn(t, angle) optional.
  tube(pts, radius, o = {}) {
    const seg = o.seg ?? 10, n = pts.length, base = this.P.length / 3;
    const R = (i, a) => typeof radius === 'function' ? radius(i / (n - 1), a) : Array.isArray(radius) ? radius[Math.min(radius.length - 1, Math.round(i / (n - 1) * (radius.length - 1)))] : radius;
    // parallel-transport frames
    let T0 = norm(sub(pts[Math.min(1, n - 1)], pts[0])), ref = Math.abs(T0[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let Nf = norm(cross(cross(T0, ref), T0));
    const frames = [];
    for (let i = 0; i < n; i++) {
      const T = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
      Nf = norm(sub(Nf, scl(T, dot(Nf, T))));
      frames.push([T, Nf, cross(T, Nf)]);
    }
    let len = 0; const L = [0]; for (let i = 1; i < n; i++) { len += Math.hypot(...sub(pts[i], pts[i - 1])); L.push(len); }
    for (let i = 0; i < n; i++) {
      const [T, Nn, B] = frames[i];
      for (let k = 0; k <= seg; k++) {
        const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), r = R(i, a);
        const nrm = add(scl(Nn, ca), scl(B, sa)), p = add(pts[i], scl(nrm, r));
        const c = o.colFn ? o.colFn(i / (n - 1), a) : null;
        this.vert(p, nrm, k / seg * (o.uScale ?? 1), (o.vByLength ? L[i] : i / (n - 1)) * (o.vScale ?? 1), c, o.aoFn ? o.aoFn(i / (n - 1), a) : null);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
      const a = base + i * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1;
      this.tri(a, c, d).tri(a, d, b);
    }
    if (o.cap) { const cp = pts[n - 1], ci = this.vert(cp, frames[n - 1][0], 0.5, 1); for (let k = 0; k < seg; k++) { const a = base + (n - 1) * (seg + 1) + k; this.tri(a, a + 1, ci); } }
    return this;
  }

  // surface of revolution around a vertical axis: profile [[r, z], ...] bottom to top
  lathe(cx, cy, cz, profile, o = {}) {
    const seg = o.seg ?? 16, base = this.P.length / 3, n = profile.length, rot = o.rot ?? 0;
    for (let i = 0; i < n; i++) {
      const [r, z] = profile[i], pr = profile[Math.max(0, i - 1)], nx = profile[Math.min(n - 1, i + 1)];
      const dr = nx[0] - pr[0], dz = nx[1] - pr[1];   // profile tangent -> normal (dz, -dr)
      for (let k = 0; k <= seg; k++) {
        const a = rot + k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const rr = o.rFn ? r * o.rFn(i / (n - 1), a) : r;
        this.vert([cx + ca * rr, cy + sa * rr, cz + z], [ca * dz, sa * dz, -dr], k / seg, i / (n - 1), o.colFn ? o.colFn(i / (n - 1), a) : null, o.aoFn ? o.aoFn(i / (n - 1), a) : null);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
      const a = base + i * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1;
      this.tri(a, b, d).tri(a, d, c);
    }
    return this;
  }

  // ellipsoid with optional radial displacement disp(nx, ny, nz) -> scale
  sphere(cx, cy, cz, rx, ry, rz, o = {}) {
    const seg = o.seg ?? 14, rings = o.rings ?? 9, base = this.P.length / 3;
    for (let i = 0; i <= rings; i++) {
      const th = i / rings * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (let k = 0; k <= seg; k++) {
        const ph = k / seg * Math.PI * 2, nx = st * Math.cos(ph), ny = st * Math.sin(ph), nz = ct;
        const d = o.disp ? o.disp(nx, ny, nz) : 1;
        this.vert([cx + nx * rx * d, cy + ny * ry * d, cz + nz * rz * d], [nx / rx, ny / ry, nz / rz], k / seg, i / rings, o.colFn ? o.colFn(nx, ny, nz) : null, o.aoFn ? o.aoFn(nx, ny, nz) : null);
      }
    }
    for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) {
      const a = base + i * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1;
      this.tri(a, c, d).tri(a, d, b);
    }
    if (o.smoothNormals !== false && o.disp) this._recomputeNormals(base, this.P.length / 3);
    return this;
  }

  // box centred at (cx, cy, cz) with size (sx, sy, sz), rotated rotZ about z; uv per face in units / uvScale
  box(cx, cy, cz, sx, sy, sz, o = {}) {
    const rz = o.rotZ ?? 0, c = Math.cos(rz), s = Math.sin(rz), us = o.uvScale ?? 1;
    const P = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, cz + z], Nr = (x, y, z) => [x * c - y * s, x * s + y * c, z];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const faces = [
      [[1, 0, 0], [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]], sy, sz],
      [[-1, 0, 0], [[-hx, hy, -hz], [-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz]], sy, sz],
      [[0, 1, 0], [[hx, hy, -hz], [-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz]], sx, sz],
      [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]], sx, sz],
      [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]], sx, sy],
      [[0, 0, -1], [[-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz], [-hx, -hy, -hz]], sx, sy],
    ];
    for (const [n, q, w, h] of faces) {
      if (o.noBottom && n[2] < 0) continue;
      const nn = Nr(...n), uvs = [[0, 0], [w / us, 0], [w / us, h / us], [0, h / us]];
      const ids = q.map((v, i) => this.vert(P(...v), nn, uvs[i][0], uvs[i][1]));
      this.quad(ids[0], ids[1], ids[2], ids[3]);
    }
    return this;
  }

  // a strip along a spine: pts [[x,y,z]...], half-widths w[i], side vectors side[i] (unit, across the strip).
  // uv: u along (0..1), v across (-1..1). Normal = cross(tangent, side), flipped up-facing if o.up.
  ribbon(pts, w, side, o = {}) {
    const n = pts.length, base = this.P.length / 3, cols = o.cols ?? 2;
    for (let i = 0; i < n; i++) {
      const T = norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])), sd = side[i];
      let nrm = norm(cross(T, sd)); if (o.up !== false && nrm[2] < 0) nrm = scl(nrm, -1);
      for (let k = 0; k <= cols; k++) {
        const v = -1 + 2 * k / cols, bend = o.bend ? o.bend(i / (n - 1), v) : 0;   // cup / keel: offset along the normal
        const p = add(add(pts[i], scl(sd, v * w[i])), scl(nrm, bend));
        this.vert(p, nrm, i / (n - 1), v, o.colFn ? o.colFn(i / (n - 1), v) : null, o.aoFn ? o.aoFn(i / (n - 1), v) : null);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < cols; k++) {
      const a = base + i * (cols + 1) + k, b = a + 1, c = a + cols + 1, d = c + 1;
      this.tri(a, c, d).tri(a, d, b);
    }
    if (o.bend) this._recomputeNormals(base, this.P.length / 3, true);
    return this;
  }

  // apply fn([x,y,z]) -> [x,y,z] to vertices added since index `from` (normals re-estimated)
  transform(from, fn) { for (let i = from; i < this.P.length / 3; i++) { const p = fn([this.P[i * 3], this.P[i * 3 + 1], this.P[i * 3 + 2]]); this.P[i * 3] = p[0]; this.P[i * 3 + 1] = p[1]; this.P[i * 3 + 2] = p[2]; } this._recomputeNormals(from, this.P.length / 3); return this; }
  mark() { return this.P.length / 3; }

  _recomputeNormals(v0, v1, keepUp = false) {
    const acc = new Float64Array((v1 - v0) * 3);
    for (let t = 0; t < this.T.length; t += 3) {
      const a = this.T[t], b = this.T[t + 1], c = this.T[t + 2];
      if (a < v0 || a >= v1) continue;
      const pa = [this.P[a * 3], this.P[a * 3 + 1], this.P[a * 3 + 2]], pb = [this.P[b * 3], this.P[b * 3 + 1], this.P[b * 3 + 2]], pc = [this.P[c * 3], this.P[c * 3 + 1], this.P[c * 3 + 2]];
      const fn = cross(sub(pb, pa), sub(pc, pa));
      for (const q of [a, b, c]) { const o = (q - v0) * 3; acc[o] += fn[0]; acc[o + 1] += fn[1]; acc[o + 2] += fn[2]; }
    }
    for (let i = v0; i < v1; i++) {
      const o = (i - v0) * 3; let n = norm([acc[o], acc[o + 1], acc[o + 2]]);
      if (!(acc[o] || acc[o + 1] || acc[o + 2])) continue;
      const old = [this.N[i * 3], this.N[i * 3 + 1], this.N[i * 3 + 2]];
      if (keepUp ? n[2] < 0 : dot(n, old) < 0) n = scl(n, -1);
      this.N[i * 3] = n[0]; this.N[i * 3 + 1] = n[1]; this.N[i * 3 + 2] = n[2];
    }
  }
}
