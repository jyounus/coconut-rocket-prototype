# Level concept previews, round 2 (20 new adventure levels)

Coconut Rocket is a phone game: a pilot rides a coconut rocket up a vertical shaft between two walls while a monster
chases from below. The owner picks which new adventure levels get built from a report that shows one **animated
preview scene per level concept**. You draw four of them.

## Read first
- `levels.js` in this folder: all 20 concepts. Your four are listed in your brief. Draw what the entry says: its mood,
  palette, walls, and **all three obstacles**, each visibly going through its cycle (idle, tell, action, reset), plus
  the twist if it can be shown.
- `game-now.png`: six screenshots of the real game as it is now (Sunken Temple, Honeycomb Hive, Glowshroom Grotto,
  Frost Hollow, Thunder Rift, Old Gold Mine). **This is the quality bar and the style.** Look at it closely.
- `../zones-report/previews/*.js` and its render: the round-1 previews. Same kit, same format. They are the minimum;
  yours should be richer. The new levels must look clearly different from those (and from each other).
- The real game drawing code: `/Users/jayy/Developer/Projects/SecondGame/prototype/index.html` (~42k lines; grep,
  never read it whole). Study 2-3 hazards for style, e.g. `function drawBat`, `drawSpikeThorn`, `drawCrusher`,
  and the themed level art (grep `G.theme === 'temple'`, `'hive'`, `'mine'`).

## Look (must match the game)
- Cartoony, glossy, crisp. 2-3 stop gradients lit from the top-left (or from the scene's light source), a lit sheen
  stroke on rounded things, detail drawn as line pairs (dark furrow + lit ridge), soft additive glows.
- **No black or near-black outlines.** Edges are thin (~1-1.6 px) in a darker hue of the object's own colour.
- Calm, hazy, lower-contrast background with parallax depth (2-3 layers + fog). Walls are textured with the level's
  material (never flat), with a coloured rim light that varies along its length. Hazards and pickups read first:
  saturated, glossy, a soft red danger glow under lethal things.
- Creatures get the game's big cartoon eyes (`K.eyes`); cute-menacing, never gory.
- **Never skimp on detail.** These are concept art for real game assets. Rich but clean; no noise, no realism, no 3D.
- A few gold coins (`K`-style: glossy gold disc, embossed palm) in the shaft help it read as the game.

## Format
One file `previews/<group>.js` (your brief names it). **Wrap everything in an IIFE** `(() => { ... })();` (all files
share one page; a duplicate top-level name would break another file). Register one function per concept:
`PV.sections['<key>'] = (ctx, w, h, t) => { ... }`, drawn at **270×480** CSS px (2× canvas).
- Use `K.shaft(ctx, w, h, t, P, opts)` from `previews/kit.js` (read kit.js fully, it is short) with your own `farShape`
  and `wallDeco`, or draw your own walls entirely when the level needs it (outdoor cliffs, clouds, space, a pinball
  table). Whatever you do, the play space reads as a vertical shaft about 75-80% of the width.
- Place the three obstacles at game scale (a hazard is ~25-70 px across here; wall hazards reach 30-55% across),
  spread down the scene so each reads on its own. Stagger their timing so they don't all fire at once.
- `K.rocket(ctx, w*0.5, h*0.8, 0.75, t)` for scale; it may dodge a little if it helps show the counterplay.
- Animate with `t` (seconds) only, no state between frames (frames may be drawn at any t, in any order). Each
  obstacle loops in ≤ 4 s. Ambient motes via `K.motes` or your own.
- Performance: one frame must draw in < 4 ms (20 run on a page). No per-pixel work, `filter`, or `shadowBlur`.

## Check your work (required, repeatedly)
`W=1200 H=560 ./render.sh <key,key> "<t1,t2,t3,t4>" /abs/out.png` renders those previews frozen at each time, side
by side, with headless Brave; then Read the PNG. Errors draw red text. Add `&z=2` support by passing `Z=2` (renders at double size, e.g.
`Z=2 W=1200 H=1000 ./render.sh <key> "1.2,2.5" /abs/zoom.png`) to inspect detail close up.
Render every scene at 4+ times across the loop so you see every obstacle's tell and action.
Compare against `game-now.png` honestly: if something reads as a flat basic shape, clip art, or a UI element, redo it.
Iterate until each scene is genuinely good. Write PNGs only into your scratch folder (in your brief).
Do not touch any other file (not kit.js, levels.js, gallery.html, other previews, or the game).

Report back: keys registered, one line per scene on what it shows, frame time if you measured it, and anything you
couldn't get right.
