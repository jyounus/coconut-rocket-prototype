# Region art brief (three agents in parallel)

Coconut Island is the adventure world map of Coconut Rocket (a phone game). It is pre-rendered offline by the pure-Node
bake in `prototype/tools/island/` (read `README.md` first: the region plug-in API, with `regions/beach.mjs` as the worked
example and `regions/grotto.mjs` as a second one). Background: `concepts/world-maps/BUILD.md` (the art bar and map.json
contract) and `concepts/world-maps/maps/levels.js` (the 20 levels, names, regions, bosses).

The foundation bake works (preview of the whole island: scratchpad `island/full_small.png`, phone-size crops `island/p_*.png`
in `/private/tmp/claude-501/-Users-jayy-Developer-Projects-SecondGame/f46fbb1e-0961-47ad-b71e-2a35cafa2d60/scratchpad/`).
Only the beach and the grotto have props. Your job: make your regions look like a premium shipped world map — think
Donkey Kong Country's pre-rendered overworld, Royal Match / Candy Crush Saga maps. The owner: "really detailed and
polished, so they look good. I don't want basic vector art."

## The bar
- Each region must read at a glance by its scenery and landmarks, and feel like a place: dense, layered, lit, with
  hero landmarks, mid-size dressing and small scatter. No large flat or empty areas; no "pasted disc" look.
- Landmarks are lit 3D meshes with shadows and contact AO, built with the MeshBuilder/prop library (extend the library
  in your own region file if you need new shapes; don't edit `props/` shared files — copy into your module instead).
- No black outlines: edges are shading or darker hues of the object's own colour. Never strip detail for speed.
- Keep every node pad and road readable and unobstructed (tokens are drawn live on the pads; tall props must not cover a
  pad or the road in the oblique view — remember screen y = y − 0.5·z, so tall things south of a pad cover it).
- Add map.json anchors via `api.anchor` where live effects belong (smoke, sparkle, lava, waterfall, torch, birds...).

## File ownership (strict: three agents run at once)
- You may create/edit ONLY `prototype/tools/island/regions/<your keys>.mjs` (and helper files named
  `regions/<your key>-*.mjs`). Region ground looks that live in the core today (`terrain.mjs`) can be overridden from
  your module's `ground(p, g)` hook. Do NOT edit `terrain.mjs`, `render.mjs`, `roads.mjs`, `layout.mjs`, `bake.mjs`,
  `props/`, `lib/`, README or any other agent's region files. If you truly need a core change, describe it precisely in
  your report (the main session will apply it) and work around it meanwhile.
- Never run the full bake into `prototype/art/island/` (it would overwrite shared output while others bake). Preview only:
  `node prototype/tools/island/bake.mjs --region <key> --preview <abs png>` or `--crop x0,y0,x1,y1 --preview <abs png>`,
  writing into `scratchpad/island-<your group>/`. Read your PNGs, compare with the beach crop, iterate until genuinely good.
- Don't touch `prototype/index.html`. Don't commit or push.

## Report back
What you built per region (landmarks, dressing, ground changes, anchors), the best preview PNG paths, bake-time impact of
your props, any core change you need, and what still looks weak.
