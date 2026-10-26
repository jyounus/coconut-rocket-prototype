# Preview drawings for the new endless sections and obstacles

Coconut Rocket is a vertical-shaft climber: a coconut rocket thrusts up a narrow shaft between two rock walls while a
monster chases from below. Zones today: Jungle roots → Basalt caves → Magma core. We are proposing 10 new sections and
20 new obstacles; the owner will pick from a report that shows an animated canvas preview of each. You draw some of them.

## Look (must match the game)
Reference screenshots of the real game: `now-jungle.jpg`, `now-caves.jpg`, `now-magma.jpg` in this folder. Look at them.
The real drawing code is `/Users/jayy/Developer/Projects/SecondGame/prototype/index.html` (32k lines; grep, don't read it
all) — e.g. `function drawBat` (~line 8350), `drawSpikeThorn` (~9010), `drawPend` (~8524), `drawGeyser` (~8063),
`drawCrusher` (~9529), `drawLavafall` (~9907), `drawSpider` (~9292), `drawFirebar` (~8811). Study 2–3 of them for style.

- Mid-value, low-saturation hazy background with fogged parallax silhouettes; dark walls (~15% luminance) with a bright
  coloured rim light on the inner edge. Hazards are saturated, glossy, cartoony and readable: gradient shading (light from
  top-left), a lit sheen, small detail (grain, rivets, veins, fur), a soft red danger glow beneath lethal things.
- **No black outlines.** Edges use a darker shade of the object's own colour (e.g. `#4a2410` on brown), thin (~1–1.6 px).
- **Never skimp on detail** — these are concept art for real game assets. Rich but clean.
- Creatures get the game's big cartoon eyes (`K.eyes`), are cute-menacing, not gory.
- Animate the mechanic so the owner understands how it plays: idle → tell (warning glow/shake/charge) → action → reset.
  Loop period ≤ 4 s. Use `t` (seconds) only — no state between frames (frames may be drawn at any t, in any order).

## The kit (`previews/kit.js`, already loaded — do not edit it)
Global `K` and `PV`. Read kit.js fully first; it is short. Key parts:
- `K.shaft(ctx, w, h, t, P, opts)` draws background, parallax, walls, rim light and returns `{L(y), R(y)}` (inner wall
  edge x at height y) so you can attach things to the walls. `P` = `{ bgTop, bgBot, far, far2, wall, wallIn, rim,
  seed, farShape(ctx,w,h,t,layer,col), wallDeco(ctx, side, edge, w, h, t, scroll) }` — `farShape` replaces the default
  stalactite silhouettes (fill with the given col, already set as fillStyle); `wallDeco` is drawn clipped to the wall
  (side -1 left / 1 right, `edge(y)` gives the inner x) — use it for the section's wall texture (crystals, timber
  beams, honeycomb, bones in earth...). Walls should look textured like the game's, not flat.
- `K.lg / K.rg` gradients, `K.glow` additive light, `K.danger` red halo, `K.shadow`, `K.sheen`, `K.eyes`,
  `K.motes(ctx,w,h,t,kind,colour)` (spore, drip, dust, ember, snow, bubble, spark, pollen, rain), `K.rocket(ctx,x,y,s,t)`
  the player for scale, `K.arrow` a subtle dashed motion hint (use sparingly, only if the motion isn't obvious), `K.rand(seed)`.

## What to write
One file `previews/<your-file>.js`. **Wrap everything in an IIFE** `(() => { ... })();` — all files share one page, and
a duplicate top-level name would silently break another file. Register:
- `PV.sections['<key>'] = (ctx, w, h, t) => {...}` — drawn at 270×480 (CSS px; canvas is 2× for sharpness). A full scene
  of the section: its palette via `K.shaft` with custom `farShape` + `wallDeco`, its motes, a few signature set dressing
  touches (ledges, lights, plants), both of its signature obstacles placed in the shaft (reuse your obstacle drawing
  functions, scaled ~0.8), and `K.rocket(ctx, w*0.5, h*0.78, 0.75, t)` for scale. Scroll the walls slowly
  (`K.shaft(..., {scroll: t*30})`) if it helps it feel alive — optional.
- `PV.obstacles['<key>'] = (ctx, w, h, t) => {...}` — drawn at 320×320. A slice of shaft in the obstacle's home section
  palette (walls at the default inset), the obstacle animated through its cycle, optionally `K.rocket(..., 0.8, t)` for
  scale where it helps show the counterplay (e.g. the rocket dodging through the gap).
Scale: the game's screen is ~400 wide with ~320 of open shaft; in a 320 tile the shaft is ~256 wide (scale ≈ 0.8).
A game hazard is typically 30–80 px across at that scale; wall hazards reach 30–55% of the way across.

Performance: each preview frame must draw in < 3 ms (30 run on one page). Avoid per-pixel work, huge path counts,
`filter`/`shadowBlur`. Cache nothing across frames that depends on t.

## Check your work (required)
`./render.sh <keys,comma> "<t1,t2,t3>" /abs/out.png` renders those previews frozen at each time side by side
(headless Brave; e.g. `W=1400 H=1100 ./render.sh mushroom,spore "0.4,1.6,2.9" /private/tmp/.../x.png`), then Read the PNG.
Errors draw red text into the canvas. Render every preview at 3+ times across its loop, compare against the reference
screenshots, and iterate until it is genuinely good — readable at a glance, on-style, no outlines in black, mechanic clear.
Write PNGs only into the scratchpad dir `/private/tmp/claude-501/-Users-jayy-Developer-Projects-SecondGame/f46fbb1e-0961-47ad-b71e-2a35cafa2d60/scratchpad/hc/`.
Do not touch any other file (not kit.js, gallery.html, other previews, or the game).

Report back: keys registered, one line per preview on what it shows, anything you couldn't get right.

## The ideas (the full set, so yours fit with the rest)
Sections (key — name — mood/palette — walls — motes — signature obstacles):
1. `mushroom` — Glowshroom Grotto — dim teal-violet cave lit by bioluminescent cyan/magenta mushrooms — dark plum rock crusted with glowing caps and mycelium threads — glowing spores rising — Spore Puffer, Bounce Cap
2. `crystal` — Amethyst Geode — violet/pink crystal cavern, light refracting — faceted crystal walls with clusters jutting out, pink rim — sparkles — Prism Laser, Shard Burst
3. `temple` — Sunken Temple — mossy green-grey stone, warm gold light — carved stone blocks, glyphs, vines, gold inlay, torches — dust — Swinging Axe, Dart Totem
4. `lagoon` — Hidden Lagoon — flooded cave, teal water light caustics, waterfalls in the background — wet dark rock, cyan rim, dripping moss — bubbles — Leaping Piranha, Drifting Jellyfish
5. `frost` — Frost Hollow — pale blue ice cave, cold white light — glassy blue ice over rock, icicle fringes, white rim — snow — Icicle Row, Frost Breath
6. `hive` — Honeycomb Hive — amber/orange, sticky warm glow — hexagonal wax comb walls, honey oozing — pollen — Bee Swarm, Honey Drip
7. `fossil` — Fossil Bonepit — dusty sandstone browns, warm — packed earth strata with embedded bones, ammonites and glowing amber — dust — Skull Snapper, Ribcage Gate
8. `mine` — Old Gold Mine — warm lantern light in dark rock — timber shoring beams, rails, lanterns, gold veins — dust — Minecart Dash, TNT Barrel
9. `bog` — Toxic Bog — sickly olive-green murk — slimy roots and moss, lime acid rim, bubbling pools on ledges — bubbles — Gas Vent, Snapper Plant
10. `storm` — Thunder Rift — deep indigo, occasional lightning flash lights everything — dark slate with glowing electric veins, violet-white rim — static sparks — Tesla Pylons, Ball Lightning
(Magma core stays the final section.)

Obstacles (key — name — home — how it plays):
1. `spore` — Spore Puffer — mushroom — fat mushroom on a wall swells (tell), then puffs a lingering toxic cloud that covers part of the shaft for ~1 s
2. `bouncecap` — Bounce Cap — mushroom — springy mushroom cap sticking out of a wall; not lethal itself, touching it boings you hard toward the other side (into other hazards)
3. `prism` — Prism Laser — crystal — crystals on opposite walls; a thin flickering aim line charges, then a fat beam fires across for a beat
4. `shard` — Shard Burst — crystal — floating crystal cluster glows, cracks, and fires 6 shards outward in a ring, then regrows
5. `axe` — Swinging Axe — temple — big crescent blade on a chain/pole swinging pendulum-style across the centre
6. `dart` — Dart Totem — temple — carved stone face in a wall; eyes glow, then it spits a quick volley of darts across the shaft
7. `piranha` — Leaping Piranha — lagoon — fish leaps in an arc from a pool on one wall ledge to the other side, splash at each end
8. `jelly` — Drifting Jellyfish — lagoon — glowing jellyfish drifting slowly up and down with long dangling stinging tentacles that pulse
9. `icicles` — Icicle Row — frost — a row of icicles on a ledge across the top; they shake in sequence then drop one by one
10. `frostbreath` — Frost Breath — frost — icy face in the wall blows a cone of freezing wind; caught = sluggish thrust for a moment (frost on the pod)
11. `bees` — Bee Swarm — hive — a hive pod on the wall releases a buzzing swarm cloud that swoops toward the rocket then back home
12. `honey` — Honey Drip — hive — honey blobs drip from comb overhead; a hit makes you sticky and heavy for a moment (not lethal)
13. `skull` — Skull Snapper — fossil — giant dinosaur skull jutting from a wall; jaws snap shut periodically across half the shaft
14. `ribcage` — Ribcage Gate — fossil — huge ribs from both walls interlock and slide open/closed on a rhythm; thread the gap
15. `minecart` — Minecart Dash — mine — rail crosses the shaft; a lantern flashes, then a loaded minecart rattles across
16. `tnt` — TNT Barrel — mine — barrel on a ledge with a lit fuse; fuse burns down as you near, then a big blast radius
17. `gasvent` — Gas Vent — bog — bubbling vent on a ledge belches a rising, spreading column of green gas
18. `snapper` — Snapper Plant — bog — carnivorous plant on a long stalk coiled at the wall; lunges out to snap when you get close
19. `tesla` — Tesla Pylons — storm — copper coils on opposite walls; sparks build, then an electric arc crackles across for a beat
20. `balllightning` — Ball Lightning — storm — crackling orb drifts toward the rocket (slow homing) and fizzles out after a few seconds
