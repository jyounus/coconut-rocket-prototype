# Level concept previews, round 3 (15 new adventure levels)

Round 3 of the adventure-level picker for Coconut Rocket: 15 more level concepts, each shown as an animated preview
in the game's glossy cartoon style. Open `index.html`, pick the levels to build, then copy your picks into the chat.

## Brief
- Every theme is new. None is a reskin of a built or map level, a round-1 zone or a round-2 concept. No caves of X and
  no towers, temples, space or candy. The set covers a range of settings: day and night, tiny scale and huge scale,
  natural places and built ones, cosy and eerie.
- Every obstacle plays differently from every trap in the game. There are no wall lungers, no swingers and no plain
  across-the-shaft shots. Instead the obstacles:
  - change the shaft itself (Compactor, Gulp Wave, Cane Wave, Crumble Bridge);
  - set off chain reactions (Fridge Dominoes, Counterweight Lift);
  - react to the pilot (Lantern Moths, Pelican Pouch, Creeping Tendril, Puffer Bloat);
  - work with light and dark (Moon Bloom, Blinker School, Sun Lens, Angler Lure, Mirage Pillar);
  - move the safe space around (Shoji Doors, Anemone Surge, Crow Murmuration, Colour Gate).
- Fairness rules:
  - Every obstacle has a tell.
  - Nothing lethal rises from below.
  - A gap the widest pilot fits through always stays open. The bridge keeps a breach, the doors leave a gap at one end, the slosh and the tendril stop short of the far wall, and the jelly chain never spans the whole shaft.
  - A Colour Gate never changes while you are inside it.

## Files
- `levels.js`: `window.LEVELS`, 15 entries in the round-2 shape (key, group, name, tagline, mood, palette, walls,
  obstacles ×3 with kind hurt/push/slow/pick, twist, pilot).
- `previews/kit.js`: round 2's kit plus round-3 helpers: `ph`, `bump`, `ease`, `rg2`, `path`, `smoothPath`, `pair`, `star4`, `ray`, the game's gold coin `K.coin`, and `K.wall`, a hand-drawn wall with a material lip and a contact shadow.
- `previews/shore.js`, `village.js`, `wild.js`: one IIFE scene per level,
  `PV.sections[key] = (ctx, w, h, t) => {}`, drawn at 270×480.
  - All three obstacles run through idle, tell, action and reset on staggered loops of 4 s or less.
  - Each scene also shows its twist.
- `gallery.html`: a review page. `?only=a,b&t=0.5,2&z=2` freezes scenes at set times.
- `render.sh`: renders gallery frames to a PNG with headless Brave.
- `index.html`: the picker, with the same design as round 2.
  - It has the 3 groups and a chip list of every level on the map, with built levels ticked.
  - Picks are saved in localStorage under `levelPicks3`.
  - "Helper" obstacles now get their own `kind help` class, so the Pick-button code no longer overwrites their label (a bug carried over from round 2).
- `contact-sheet.png`: all 15 scenes frozen at a good moment, 5 × 3.

## Groups
| Group | Levels |
|---|---|
| **shore**: On the shore | Sandcastle Keep, Conch Spiral, Coral Kingdom, Flamingo Salt Flats, Stilt Village |
| **village**: Built by islanders | Junk Heap, Hot Spring Terraces, Wash House, Treehouse Town, Paint Loft |
| **wild**: Wild and strange | Dewdrop Meadow, Moonflower Garden, Harvest Cane Field, Whale's Belly, Midnight Trench |

## Performance
- Each scene is a pure function of `t`.
- No filter, shadowBlur or per-pixel work.
- Measured in headless Brave at 2×, with a fresh canvas per scene: every scene draws a frame in 0.5-2.2 ms, well under the 4 ms budget.
