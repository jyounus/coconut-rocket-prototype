# World-map concepts for Coconut Rocket's adventure mode

Coconut Rocket is a vertical-shaft climber for phones: a pilot rides a home-made rocket up a shaft between rock walls,
dodging hazards while a monster chases from below. We're designing an **adventure mode** with a world map in the spirit
of Super Mario World / Donkey Kong Country: levels are nodes on a path, each must be finished with **3 stars** to unlock
the next, and the path **branches** so the player picks which level to do next. 20 levels now; the map must make it
obvious where future levels attach. The owner picks one of five map concepts from a report; you draw one of them as a
polished, animated canvas preview. This is the pitch art that wins or loses the concept, so make it look like a shipped
mobile game's world map: rich, characterful, crafted, with depth and life, not a diagram.

## Look
The game's style: read `/Users/jayy/Developer/Projects/SecondGame/concepts/zones-report/now-jungle.jpg` (and
now-caves/now-magma), and the existing in-game adventure map, `function drawAdvMap` in
`/Users/jayy/Developer/Projects/SecondGame/prototype/index.html` (~line 32300; grep, don't read the whole 32k-line file)
and `drawSeedPod` / `drawFinishDeck` near it. Also look at the zone/obstacle report previews for this game's look
(`/Users/jayy/Developer/Projects/SecondGame/concepts/zones-report/previews/*.js`); render a few with that folder's render.sh if useful.
- Gradient-shaded, glossy, cartoony, saturated but with a calm mid-value background; light from the top-left; lit sheens.
- **No black outlines** — edges are a darker shade of the object's own colour. **Never skimp on detail.**
- Regions (each node's `region`): jungle, temple (sunken stone + gold), bog (toxic olive/lime), grotto (glowing cyan/
  magenta mushrooms), lagoon (teal water), mine (timber, lanterns, gold), caves (blue-violet basalt), crystal (amethyst/
  pink), frost (pale ice), storm (indigo, lightning), magma (red-brown, lava). Each region must read at a glance by its
  scenery, so the map tells a journey from green jungle to the magma finale.

## The data (already loaded: `maps/levels.js` — read it)
`LEVELS` (20, with name, region, stars, state: done/tried/open/locked, pilot, perk, boss, current), `PATHS` (edges,
with forks after 3, 10 and 15 and merges at 9, 14, 19), `PATH_STATE` (lit/dark per path), `FUTURE` (where new levels attach).
Helpers in `maps/kit.js` (read it: `K.lg/rg/glow/shadow/sheen/eyes/motes/rocket/rand`...) and `levels.js`:
`K.badge(ctx, name, x, y, r, ring)` round portrait from the real game art (`'lemur'` etc. or `'boss-flytrap'`),
`K.star(ctx, x, y, r, on)`, `K.img(name)`.

Show all of these clearly:
- Every node, with its number; done nodes with 3 gold stars, tried with 1–2 (empty sockets for the rest), open glowing
  and inviting, locked dimmed with a padlock. Boss nodes (9, 15, 20) are special landmarks showing the boss portrait
  (`K.badge(ctx, 'boss-' + l.boss, ...)`) — a lair, gate or arena, not just a bigger dot.
- Paths: lit (walked, golden/bright) vs dark (unwalked, dashed or faded). Forks must read as a real choice.
- The player standing on the current node (9): use `K.rocket` or the pilot portrait `K.badge(ctx, 'lemur', ...)` with a
  bob, plus a "you are here" feel.
- The best-suited pilot: show its little portrait badge beside the current node and the open ones (an "advantage" hint),
  e.g. a small badge with a gold ring on the node's shoulder. Don't put badges on every node (too busy).
- Future: past level 20, how the map continues ("More levels coming": fog, a closed gate, a rolled-up parchment, an
  unbuilt bridge — whatever fits the concept).
- Ambient life: something moves (water, motes, clouds, swaying leaves, lava glow, the path's sparkle, a node pulse).

## What to write
One file `maps/<key>.js`, everything wrapped in an IIFE `(() => { ... })();` (shared page; duplicate top-level names
break other files). Register:
```js
PV.maps['<key>'] = {
  W: 360, H: <content height>,          // content size in CSS px; W is 360 (one phone width) unless your concept pans sideways
  camera(t) { return { x, y }; },        // top-left of the 360x720 phone viewport inside the content at time t:
                                         // a slow, eased tour of the whole map (pause on the current node), looping ~16-24 s
  draw(ctx, t, view) { ... }             // draw the content in content coordinates; view = {x,y,w,h} is the visible
                                         // rect (cull off-screen detail if you like). Also called once with the whole map
                                         // as the view, for the report's overview image, so it must draw everything.
};
```
Performance: the phone view is drawn every frame; keep a frame under ~6 ms (cull to the view). No `filter` /
`shadowBlur`. Only `t` — no state carried between frames.

## Check your work (required)
`./render.sh <key> "0.5,6,12" /abs/out.png` renders phone views at those times; `FULL=1 H=<map height + 60> W=420
./render.sh <key> "1" /abs/out.png` renders the whole map. Read the PNGs, compare with the game references, iterate until
it is genuinely good. Write PNGs only into
`/private/tmp/claude-501/-Users-jayy-Developer-Projects-SecondGame/f46fbb1e-0961-47ad-b71e-2a35cafa2d60/scratchpad/wm/<key>/`.
Touch no other file (not kit.js, levels.js, gallery.html, the other maps, the game).

Report back: what you drew, how the concept handles branches and new levels, anything you couldn't get right.

## The five concepts
1. `palm` — **The Great Palm.** The whole world is one colossal tree climbed from the roots to the crown, fitting a
   climbing game. Levels sit on platforms, knots and huts on the trunk; forks are literal branches that split off and
   rejoin; regions are stacked up the tree (jungle roots at the base, a temple carved into the trunk, a bog in a hollow,
   glowing mushrooms on the bark, a lagoon pooled in a fork, a mine dug into the wood, crystal/frost/storm up in the
   cold high branches, and a volcano-like ember crown or a lightning-struck smouldering top as the magma finale).
   Vertical scroll; future levels grow as new branches above, hidden in cloud. H around 2600.
2. `island` — **Coconut Island.** A Donkey Kong Country style overworld: one tropical island seen from above at an angle,
   with the beach start, jungle, temple ruins, a swamp, a mushroom forest, a lagoon, a mine mountain, crystal caves,
   a snowy peak, a storm cliff and the smoking volcano in the centre as the finale. Paths wind between areas with
   bridges and stairs. This one pans in both directions: content e.g. W 760 × H 1200, the camera tours it. Future levels:
   more islands out at sea beyond a dotted boat route, fogged.
3. `strata` — **Down the Shaft.** A side-on cut-away of the ground like an ant farm: the jungle surface on top, then
   tunnels and caverns burrowing down through earth layers (temple, bog, grotto, lagoon, mine, basalt caves, crystal,
   frost, storm pockets) to the glowing magma core at the bottom. Levels are chambers, paths are tunnels and shafts,
   forks are tunnels splitting. Vertical scroll; future levels: unexcavated rock with a drill and "dig here" sign
   at the side/bottom. H around 2600.
4. `parchment` — **Kiko's Treasure Map.** A hand-drawn explorer's map on aged parchment, drawn by Kiko the lemur: inked
   coastlines and doodled landmarks with watercolour washes per region, dotted trails, wax-seal stickers as nodes,
   skull-and-crossbones seals for bosses, little margin notes and a compass rose. Vertical scroll; new levels arrive as
   a folded-under panel/torn edge that "unfolds" (show the fold crease and a rolled edge at the top). H around 2400.
5. `pages` — **World Pages.** Super Mario Bros 3 style: the adventure is split into compact world screens that each fit
   one phone screen with no scrolling — World 1 Jungle (levels 1–9, temple and bog branches, boss 9), World 2 Depths
   (10–15), World 3 Core (16–20) — swiped sideways, with page dots and an arrow path leading off each page's edge to the
   next; World 4 is a locked "coming soon" page. Each page has a tiled, chunky, board-game-like terrain and its own
   palette. Content: W = 360 × 4 pages = 1440, H = 720; the camera swipes page to page with a pause on each.
