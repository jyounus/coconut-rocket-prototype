# Coconut Island map: style sample, round 2

Coconut Rocket is a phone game (a pilot rides a home-made rocket up a shaft, chased by a monster). We are making the
adventure world map: one tropical island, 20 level nodes joined by roads, a volcano in the middle (the owner picked the
"Coconut Island" concept: `concepts/world-maps/maps/island.js`, render
`/private/tmp/claude-501/-Users-jayy-Developer-Projects-SecondGame/f46fbb1e-0961-47ad-b71e-2a35cafa2d60/scratchpad/wm/island/full.png`).
Before drawing the whole island we need ONE phone screen the owner likes. Two attempts were rejected:

1. A ray-marched semi-realistic pre-rendered 3D island (`scratchpad/island/p_beach.png`): "doesn't look good, looks
   nothing like the current art style of the game".
2. Bright saturated cartoon vector scenes packed with trees (`scratchpad/style/A.png`, `B.png`): "none of these fit the
   existing art style. It also looks too busy. There's way too many trees. When I said it should be detailed, I meant
   making sure it has texture etc and not just using basic vector shapes."

(all scratchpad paths are under `/private/tmp/claude-501/-Users-jayy-Developer-Projects-SecondGame/f46fbb1e-0961-47ad-b71e-2a35cafa2d60/scratchpad/`)

## The game's actual look (study it before drawing anything)
Screenshots: `concepts/zones-report/now-jungle.jpg`, `now-caves.jpg`, `now-magma.jpg`; character/boss art:
`concepts/world-maps/pilots/*.png` (e.g. `boss-flytrap.png`, `lemur.png`). Drawing code: `prototype/index.html`
(32k lines, grep, never read whole): monster and pilot draw functions, the shaft walls/vines/background drawing.
What it does:
- Backgrounds are calm, muted and atmospheric: deep desaturated mid/dark values, haze, layered silhouettes receding
  into fog, light shafts, fine rain/mote streaks. They never compete with the gameplay objects.
- Only a few objects are drawn in full, and those are drawn richly: gradient volume, surface texture painted in
  (wood grain, veins, ridges, cracks, scales, speckles), fine bright highlight strokes and specular streaks, glowing
  coloured rims, warm glows against the dark. No black outlines (edges are a darker hue of the object's own colour).
- Colour comes from accents and light (gold coins, glowing lava, a pink/red spike, a bright character) on a restrained base.

## The rules for this round
- **Calm, not busy.** Far fewer elements: big readable masses of terrain, a handful of hero props, plenty of breathing
  room. The road and the level nodes must be the clearest things on screen.
- **Texture, not flat vector.** Every surface carries painted texture: grass with stroke/clump texture and tonal
  variation, sand with grain and ripples, rock with strata and cracks, wood with grain, water with painted ripples.
  Use per-pixel noise (ImageData), brush-stroke passes, grain overlays, layered translucent washes, hand-painted
  highlights. Not photoreal, not 3D-rendered: painted illustration that sits next to the game's art.
- Match the game's palette and lighting mood (see the screenshots), with glows on the key things.
- Drawn once and baked into image tiles later, so draw cost doesn't matter. Write the scene as reusable functions
  (terrain, sand, sea, road, node, palm, hut, rock...) so the same code could paint the whole 1640×2480 island later.

## The scene (same for every direction)
One phone screen, 390×844 CSS px drawn at 3× (1170×2532): the beach start of the island. Level 1's launch pad by a
stilt hut on the beach, the sea and surf at the bottom, the road winding up to level 2 and level 3 (3 is the open
level with the player's lemur pilot `concepts/world-maps/pilots/lemur.png` and a "you are here" marker; 1 and 2 done
with 3 stars), the road forking off the top toward the Temple and the Bog, a creek with a small bridge, jungle edges.
Node tokens should feel like the game's UI (gold, glossy, readable).

## Output
Work only in your folder `concepts/island-style/<your direction key>/` (an index.html + js + a render.sh using
headless Brave like `concepts/world-maps/render.sh`). Render into
`scratchpad/style2/<key>.png` (1170×2532) and `scratchpad/style2/<key>-compare.png` (side by side at equal height:
now-jungle.jpg, your screen, and a 2× crop of your screen's most detailed area so texture is visible). Look at your
renders critically next to the game screenshots and iterate several times. Ask yourself honestly: is it calm? is it
textured? would it sit in this game? Don't touch prototype/, other folders, or other directions. Don't commit.
Report: PNG paths, what you did, honest weaknesses.
