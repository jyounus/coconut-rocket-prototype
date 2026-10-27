# Coconut Island bake

An offline renderer that draws the adventure world map so it looks like pre-rendered 3D. It is pure Node with no
dependencies: worker threads plus `sips` for the JPEG step. The output goes to `prototype/art/island/`:

- `base_{c}_{r}.jpg` tiles;
- optional `canopy_{c}_{r}.png` tiles;
- `map.json` (version 1). The schema is in `concepts/world-maps/BUILD.md`.

```
node prototype/tools/island/bake.mjs                      # full bake -> prototype/art/island/  (~8 s on 12 cores)
node prototype/tools/island/bake.mjs --region beach       # preview one region module's window  (~3-4 s)
node prototype/tools/island/bake.mjs --region temple      # any region key works (core regions use a window around their label)
node prototype/tools/island/bake.mjs --crop 600,2050,1000,2450 --preview /abs/out.png   # any window, map units
  --ss N          supersampling per axis (default 2)
  --no-props      skip the 3D props (fast terrain-only check)
  --quality Q     JPEG quality for the tiles (default 78, about 3.5 MB in total)
  --full-png F    also write the whole map as one PNG (handy for downscaled previews: sips -Z 1300 F)
  --out DIR       bake somewhere other than prototype/art/island/
```
Previews go to `$ISLAND_SCRATCH` (default `$TMPDIR/island-bake`) unless `--preview` is given.

## What it does

The camera is oblique and orthographic. Screen y = world y − 0.5 · height, and 1 map unit = 1.5 image px. Everything
lives on one heightfield grid: 2460 × 3720 texels, 1.5 texels per unit.

1. **Layout** (`layout.mjs`). This file holds:
   - the coastline, region blobs, landmarks (volcano, mine mountain, frost peak, storm mesa), the lagoon and streams;
   - the 20 nodes and their road waypoints;
   - the future road, the pier and the fogged islands.

   Edit positions here.
2. **Fields** (`fields.mjs`).
   - Exact distance transforms give signed distances to the coast and to each region blob.
   - A nearest-segment index gives roads and streams their distance, arc length and side.
3. **Profiles** (`roads.mjs`).
   - Streams are smoothed and forced downhill.
   - Node pads are levelled.
   - Roads are smoothed, clamped to the pads, bridged where water runs under them (deck = water + 2.4), and flagged as
     stairs on steep climbs. Their material follows the region: dirt, flagstones, hex pavers, rails, snow, slate,
     basalt, or planks on bridges.
4. **Surface** (`terrain.mjs`, in workers). A pure function `surface(x, y, p)` returns, for every texel:
   - height, water level and type, albedo, emissive, material, gloss and region.

   It is built up in this order:
   - beach and jungle;
   - each region's height shape and material, over a domain-warped noisy edge;
   - the jungle canopy (tree crowns are height bumps), including overgrowth that creeps onto region edges and a tint
     around each region;
   - stream beds;
   - **plug-in ground hooks**;
   - roads and pads last.
5. **Lighting**.
   - Multi-scale ambient occlusion.
   - Emissive light spill (lava, crystals, glowshrooms).
   - Soft terrain sun shadows from a horizon march. The sun comes from the upper left.
6. **Props** (`props/`).
   - Plug-ins build triangle meshes: palms, the hut, the pier, mushrooms.
   - A sun shadow map is rasterised over them.
   - They get contact AO on the ground.
7. **Render** (`render.mjs`, in workers).
   - Each sub-column is ray-marched south to north through the heightfield, with SS × SS supersampling.
   - Props are depth-tested against the terrain hit through a screen-space G-buffer.
   - Ground shading: sun with soft shadows (terrain and props), sky and bounce light, wrap lighting for foliage,
     specular, and procedural cliff faces per region.
   - Water shading: depth absorption, caustics, Fresnel sky, glints, shore foam, rapids, lily pads in the bog.
   - ACES tone map.
8. **Post and outputs**.
   - Cloud banks are painted over the future islands.
   - 512-px JPEG tiles, plus sparse canopy PNG tiles (prop triangles flagged `canopy`).
   - `map.json`.

`map.json` gives every x/y **where it appears in the image** (screen map units), because the view is oblique: a node on
a 40-unit plateau sits 20 units higher up the image than its ground position. Nodes also carry `z` (ground height) and
`r` (pad radius). Anchors from plug-ins (`torch`, `flag`, `future_gate`, ...) are written next to the standard ones
(`water`, `lava`, `smoke`, `waterfall`, `sparkle`, `birds`).

## Region plug-ins (`regions/*.mjs`)

Every `.mjs` file in `regions/` is loaded, except files whose names start with `_`. A module default-exports an object.
Every field is optional except `key`:

```js
export default {
  key: 'beach',                 // a region key (see layout.mjs REGIONS) or any new name
  order: 10,                    // run order (lower first)
  bounds: [x0, y0, x1, y1],     // map units: where ground() runs; also the default preview window
  preview: [x0, y0, x1, y1],    // window used by --region <key>
  ground(p, g) { ... },         // per-texel hook (runs in the workers)
  props(api) { ... },           // 3D props (runs once on the main thread)
  materials: { name: { shade(s) {...}, alpha(s) {...} } },   // extra prop materials
  cliff(x, y, z, nx, ny, nz, out) { ... },   // optional: procedural cliff-face colour for this region (out = [r,g,b] sRGB)
  cliffRegion: 'temple',        // which region the cliff hook paints (defaults to key)
};
```

### `ground(p, g)`: the per-texel hook
It runs inside the bake for every texel inside `bounds`: after the core terrain and streams, before roads and pads. It
must be a **pure function of (x, y)**, because workers evaluate texels in any order. Never cache values that depend on
which texel ran first. For a level height, use `g.baseAt(x, y)`.

Fields on `p` (read/write):

| field | meaning |
|---|---|
| `x, y` | world position (map units) |
| `h` | height (units). Sea level is 0; the jungle lowland is about 5-12; plateaus are about 25-45; the crater floor is about 150 |
| `r, g, b` | albedo, sRGB 0..1 |
| `mat` | material class `g.M.*` (GRASS, SAND, FOLIAGE, ROCK, SNOW, CRYSTAL, WOOD, METAL, LAVA, MUD, STONE, GROUND). It drives shading: FOLIAGE/GRASS wrap lighting; steep faces become cliffs unless FOLIAGE/WOOD/STONE/LAVA |
| `gloss` | 0..1 specular |
| `er, eg, eb` | emissive (linear; also spills light onto the surroundings) |
| `wl, wt` | water level and type (`g.WT.SEA/LAGOON/STREAM/BOG`); water is drawn where `wl > h` |
| `reg` | region index (`g.RI.beach`, ...); used for cliff faces and `api.regionAt` |
| `h0, r0, g0, b0, mat0` | the ground under the canopy. `g.clear(p, t)` restores it with weight t, which clears trees |
| `coast` | signed distance to the coast (units, > 0 on land) |

Helpers on `g`:
- colour: `set(p, c)`, `mix(p, c, t)`, `mul(p, k)`, `mixC(a, b, t, out)`, the palette `COL`;
- surface painters, which write a full material into p: `grass(x, y, p)`, `sand(x, y, p, wet)`,
  `rockGround(x, y, p, cA, cB, cD, scale)`, `canopy(x, y, density, p)`;
- `edge(key, x, y, amp, freq)` (noisy region edge, > 0 inside), `vary`, `apron`, `baseAt(x, y)`;
- noise and maths: `noise2`, `fbm2`, `ridge2`, `worley2` (fills `g.W`: f1, f2, id, px, py), `cellEdge`, `hash2`,
  `ihash2`, `smooth`, `clamp`, `lerp`, `sat`;
- `A` (the field access: `A.nearest('road', x, y).d`) and `L` (the layout).

### `props(api)`: lit 3D meshes
`api` provides:
- `mesh()` → a MeshBuilder. Pass it to `api.add(m)` when it is built.
- `ground(x, y)` gives the final terrain height. `water(x, y)` gives the water level or null; `isWater(x, y)` is a
  boolean.
- `node(id)` → `{x, y, z}`. `road(x, y)` → distance to the nearest road centre line. `regionAt(x, y)` → region key.
- `aoBlob(x, y, r, k)` adds contact shadow on the ground.
- `anchor(kind, x, y, z, r, extra)` adds a live-effect anchor to map.json (projected for you).
- `crop` and `inCrop(x, y, pad)`: skip work outside a preview window.
- `lib` provides `palm`, `bush`, `fern`, `rock`, `tree`, `frond`. Also `layout`, `noise`, `rand(seed)`, `V3`.

MeshBuilder (`props/mesh.mjs`) is chainable. Its state applies to the geometry that follows:
- `mat(name)`, `col(r, g, b)` (vertex colour, sRGB), `ao(v)`, `seed(n)`, `canopy(on)` (draw into the canopy layer);
- primitives: `tube(pts, radius | (t, a) => r, {seg, cap, vByLength})`,
  `lathe(cx, cy, cz, [[radius, height], ...], {seg, rot, rFn})`, `sphere(cx, cy, cz, rx, ry, rz, {seg, rings, disp})`,
  `box(cx, cy, cz, sx, sy, sz, {rotZ})`, `ribbon(pts, widths, sides, {cols, bend})`, `tri`, `quad`, `vert`;
- `mark()` + `transform(mark, ([x, y, z]) => [x', y', z'])` reshape what was just built: scale a pyramid roof, tilt a
  mushroom cap.

Materials (`props/materials.mjs`) are:
- `default`, `paint`, `glow`, `metal`, `stone`, `cloth`, `rope`, `coconut`, `wood`, `bamboo`, `bark`, `palmTrunk`;
- cut-outs: `frond`, `leaf`, `thatch`;
- `foliage`.

A material's `shade(s)` sets these from the vertex colour, uv and world position:
- `s.ar/ag/ab` (albedo), `s.spec/shin`, `s.trans` (leaf translucency), `s.er/eg/eb` (emissive);
- optionally the normal.

`alpha(s)` returns false to cut a hole.

Units: palms are about 38 tall, the hut is 40 × 30, a node pad has radius 34 (44 for bosses), and roads are 30 wide.

### Worked example: the beach (`regions/beach.mjs`)
- **ground**:
  - clears the jungle for the hut (`g.clear`) and paints trodden sand;
  - adds a sandy footpath from node 1 to the porch;
  - adds the launch pad: a raised stone disc at a level height from `g.baseAt`, with painted red/cream target rings and
    a chevron.
- **props**:
  - a stilt hut: bamboo pole walls, a doorway, a shutter, a 4-sided lathe roof scaled to the footprint with
    `transform`, steps, rope and floats;
  - two tiki torches with an emissive `flame` material (declared in `materials`);
  - the launch ramp (rails, sleepers, trestles) with the coconut rocket on it, a coconut pile, a crate and a pennant;
  - eleven hero palms (`lib.palm` with lean), bushes, ferns, rocks and a canoe;
  - anchors: `torch`, `flag`, `sparkle` (the pad), `birds` and `water`.
- Preview it with `node bake.mjs --region beach` (about 3 s).

`regions/grotto.mjs` is a second, props-only example: giant glowshrooms. They are placed with `api.regionAt` and kept
off roads and pads. The material `glowcap` has spots and glowing gills.

### Tips
- Keep everything a pure function of position: `rand(seed)` in props, and hashes or noise in ground hooks.
- Stay clear of roads and pads: `api.road(x, y) > L.ROAD_HW + margin`, and more than about 60 units from nodes. Roads
  and pads are applied after `ground()`, so they cut through anything there.
- Check at 1:1. A phone shows about 390 × 844 map units: crop `--full-png` output with `sips -c`.
