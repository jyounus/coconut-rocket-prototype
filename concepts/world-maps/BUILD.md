# Building the Coconut Island adventure map

The owner picked **Coconut Island** (concept 2 in `concepts/world-maps/`, drawn in `maps/island.js`, data in
`maps/levels.js`): a Donkey Kong Country style overworld of one tropical island seen from above at an angle, with 20
level nodes, forks, three bosses and a smoking volcano in the middle. We now build it for real in the game
(`prototype/index.html`, a single-file canvas game; read `CLAUDE.md`-style rules from the repo if any, and the notes below).

## The art bar
The owner: "really detailed and polished, so they look good. I don't want basic vector art." The concept preview is
flat canvas vector art — that is exactly what NOT to ship. Target: a premium mobile world map (think Donkey Kong
Country's overworld — which was **pre-rendered 3D** — or Royal Match / Candy Crush Saga world maps): lush, dense,
textured, lit, with depth.

So the island is **pre-rendered offline** into raster images and the game only draws the images plus light live
effects. That frees the bake to be as expensive as it likes: per-pixel lighting from a heightfield (sun from the
upper left, sky light, soft cast shadows, ambient occlusion), rich procedural materials (grass with blade/clump
detail and colour variation, wet sand, cliff rock strata, snow, basalt hexes, crystal, lava crust with emissive cracks,
water with depth colour, caustics and foam), and props (palm trees, jungle canopy, temple, mine headframe, volcano,
huts, bridges, mushrooms, crystals, pines) rendered as lit 3D-looking objects with shadows on the terrain, then
atmospheric depth and a final grade. Precedent: `prototype/tools/coin/render-coin.mjs` ray-marches a 3D coin in pure
Node with worker threads and writes PNGs with zlib — the same approach scales to the island.
Rules that still hold: **no black outlines** (edges are shading or darker hues of the object's own colour), colours
readable at phone size, never strip detail.

## Pieces and owners
- **Art pipeline** — `prototype/tools/island/` (the bake) writes `prototype/art/island/` (images + `map.json`).
- **Runtime** — `prototype/index.html` (the map screen, nodes, unlocks, level sheet). Only one agent edits index.html at a time.

## `prototype/art/island/map.json` (the contract between them)
A v0 is already there (positions from the concept, ×2). Units are **map units**: 1 unit = 1 CSS px at zoom 1; the
island is `size: [1640, 2480]`, so a phone shows about a quarter of its width and pans around (it is meant to be explored).
```jsonc
{
  "version": 1,
  "size": [W, H],                                // map units
  "tiles": { "scale": 1.5,                       // image px per map unit
             "tile": 512,                        // tile size in image px
             "cols": C, "rows": R,
             "file": "base_{c}_{r}.jpg",         // in art/island/, c/r from 0
             "v": "<hash>" },                    // cache-buster for ?v=
  "layers": [ { "name": "canopy", "file": "...png", "x":0,"y":0,"w":W,"h":H, "tiles": {...same shape, optional} } ],
                                                 // optional extra layers drawn above the node tokens (tree canopies that
                                                 // nodes peek out from, clouds), same tiling scheme if large
  "nodes": [ { "id": 1, "x": 796, "y": 2236, "boss": false } ],      // the token's centre (its baked pad/clearing is under it)
  "paths": [ { "a": 1, "b": 2, "pts": [[x,y], ...] } ],              // the road's centre line, dense enough to stroke
  "future": { "pts": [[x,y], ...], "label": "More islands coming" },  // unbuilt road toward future islands
  "coast": [[x,y], ...],                                             // rough coastline (for camera bounds / effects)
  "regions": [ { "key": "temple", "label": "Sunken Temple", "x": 200, "y": 1640 } ],   // name label anchors
  "anchors": {                                                       // where the runtime adds live effects
    "water": [ {"x","y","r"} ], "lava": [ ... ], "smoke": [ ... ], "waterfall": [ ... ], "sparkle": [ ... ], "birds": [ ... ]
  }
}
```
The roads are baked into the art (dirt/stone/plank, region by region). The runtime overlays the *state*: lit roads get a
gold glow and marching sparkles along `pts`, unwalked roads stay plain. Node tokens, stars, padlocks, boss portraits,
the player, labels and effects are drawn live (they change with progress).

## Game data (runtime-owned, in index.html)
The 20 levels — names, regions, best pilots and perks — are in `concepts/world-maps/maps/levels.js` (`LEVELS`, `PATHS`):
copy them into the game as the adventure's level list. Bosses: 9 Gobblebloom (monster `flytrap`), 15 Geode King
(`golem`), 20 Bellows drake (`dragon`).
- Unlock: level 1 is open; any other level opens when **any** level with a path into it has **3 stars**.
- Stars (already tracked per stage as a bitmask): 1 finish, 2 coconut target, 4 no revive.
- Levels already built in the game's `ADVENTURE` (Root Run, Vine Gully, Thorn Hollow, the Gobblebloom boss) map to nodes
  1, 2, 3 and 9. Every other node is "being built": its sheet says so and Play is disabled (a debug option unlocks/plays
  everything for testing). Spider Drop has no node for now; keep its stage data but don't show it.
- Save: migrate the existing `cr-adventure` stars/best/clears per stage index to per-node ids, losing nothing.

## Checks (any change to index.html)
- `node prototype/tests/levelgen.test.mjs` prints 5 PASS lines.
- No duplicate function names (one script scope; a duplicate silently overrides):
  `grep -oE "^\s*function [A-Za-z0-9_]+" prototype/index.html | awk '{print $2}' | sort | uniq -d` prints nothing.
- Endless mode still plays: a 10 s autopiloted run with no console errors.
- Browser testing: `.claude/launch.json` config `prototype` serves the game on :8766; `?debug` exposes `window.CR`.
  Close every Browser pane tab and stop the server when done; save localStorage `cr-settings` to sessionStorage
  `crSavedSettings` before testing and restore it after.
- Don't commit or push; the main session reviews and commits.
