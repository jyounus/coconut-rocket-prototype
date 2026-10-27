# Coconut Island map: style sample, round 3

Coconut Rocket is a phone game. We are making the adventure world map: one tropical island, 20 level nodes joined by
roads, a volcano in the middle (the owner picked the "Coconut Island" concept: `concepts/world-maps/maps/island.js`).
Before drawing the whole island we need ONE phone screen the owner likes. Every attempt so far missed. Learn from all of
them (scratchpad = `/private/tmp/claude-501/-Users-jayy-Developer-Projects-SecondGame/f46fbb1e-0961-47ad-b71e-2a35cafa2d60/scratchpad/`):

| attempt | image | owner's verdict |
|---|---|---|
| pre-rendered 3D bake | `island/p_beach.png` | "doesn't look good, nothing like the current art style" |
| bright cartoon vector packed with trees | `style/A.png`, `style/B.png` | "too busy, way too many trees; detailed means texture, not basic vector shapes" |
| painterly with noise/grain textures (dusk, diorama, gouache) | `style2/dusk.png`, `style2/diorama.png`, `style2/gouache.png` | "too realistic. Keep the cartoony look that's in the main gameplay" |

So the target is **the main gameplay's cartoon look**, exactly. Not painting, not noise or film grain, not photo
texture, not 3D. And still calm (few elements), and still "textured" in the way the gameplay art is textured.

## What "the gameplay look" is: read the code, don't guess
Screenshots: `concepts/zones-report/now-jungle.jpg`, `now-caves.jpg`, `now-magma.jpg`; art:
`concepts/world-maps/pilots/*.png`. Drawing code in `prototype/index.html` (32k lines: grep and read the functions,
never the whole file): `drawSpikeThorn` (~line 9070), `drawThornVine`, `drawSpike*`, `drawWalls` (~6915),
`drawBackground` (~6454), the helpers `pkLG` / `pkRG`, and a monster draw function or two (via `drawMonsterThumb`).
The gameplay's texture is **drawn**, with clean vector strokes:
- shapes filled with 2–3 stop linear/radial gradients (light from the top-left), a thin edge stroke in a darker hue of the
  object's own colour (`k.edge`; never black);
- detail as drawn lines: bark furrows each with a lit ridge line beside it, spiral grooves, knots, leaf midribs and veins,
  strata bands with a lit top line, carved ledges; specular sheen strokes along the lit side; an underside shadow
  gradient; soft glows on key things;
- backgrounds behind the action are simple layered muted silhouettes with soft gradients (calm, low contrast).
Copy those helpers and techniques into your sample so the map is drawn the same way the game is.

## The rules
- **Cartoon, crisp, clean**: vector shapes + gradients + drawn detail lines, exactly like the bark spike, vines, walls and
  monsters. No per-pixel noise, grain overlays, brush-stroke simulation or film grain.
- **Calm**: few elements, big readable shapes, breathing room. The road and nodes are the clearest things on screen.
  A handful of hero props (hut, a few palms, launch pad, bridge, rocks); jungle as a few large clumps (each clump drawn
  as a cartoon mass with drawn leaf detail), not dozens of trees.
- **Palette**: the gameplay's (muted greens and browns with gold/glow accents), readable on a phone.
- Write reusable functions (sea, sand, grass, clump, palm, hut, road, bridge, rock, pad, node) so the same code can paint
  the whole 1640×2480 island later.

## The scene
One phone screen, 390×844 CSS px drawn at 3× (1170×2532): the beach start. Level 1's launch pad by a stilt hut on the
beach, sea and surf at the bottom, the road winding up to level 2 and level 3 (3 = open level, with the lemur pilot
`concepts/world-maps/pilots/lemur.png` and a "you are here" marker; 1 and 2 done with 3 stars), the road forking off the
top toward the Temple and the Bog, a creek with a small bridge, jungle edges. Node tokens like the game's UI (glossy gold).
Make TWO lightings of the same drawing: `day` (bright but not candy-saturated) and `dusk` (the gameplay's moodier tones).

## Output
Work only in `concepts/island-style/cartoon/` (index.html + js + render.sh using headless Brave, see
`concepts/world-maps/render.sh`). Render `scratchpad/style3/day.png`, `scratchpad/style3/dusk.png` (1170×2532) and
`scratchpad/style3/compare.png`: at equal height, now-jungle.jpg, day, dusk, and a 2× crop of the hut/pad area.
Also render a 2× zoom of the game's own thorn spike next to your palm/hut at the same zoom (`scratchpad/style3/zoom.png`)
so the drawing technique can be compared directly. Iterate until a viewer could not tell the map was drawn by someone
else than the gameplay artist. Don't touch prototype/ or other folders. Don't commit. Report: paths, what you did,
honest weaknesses.
