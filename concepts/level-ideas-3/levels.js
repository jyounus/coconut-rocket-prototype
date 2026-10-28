// The 15 new level concepts (round 3). None repeats a built level, a round-1 zone or a round-2 concept, in theme or in
// how its obstacles play: no lunging wall creatures, no swingers, no plain across-the-shaft shots. These traps change the
// shaft itself, run on visible chain reactions, react to the pilot, hide or fake things, or move the safe space around.
// Obstacle kinds: hurt = lethal, push = shoves you, slow = status effect, pick = pickup/helper.
window.LEVELS = [
  // ---------------------------------------------------------------- the shore
  { key: 'sandcastle', group: 'shore', name: 'Sandcastle Keep', tagline: 'Climb a castle of wet sand as tall as a palm, built by a giant child on Coconut Beach.',
    mood: 'Blazing midday: butter-gold sand, a cyan sky, shell mosaics and paper flags snapping in the sea breeze.',
    palette: ['#f2c46a', '#7fd3f0', '#e8734a', '#fff3d6'],
    walls: 'Bucket-moulded sand towers with stamped bricks, shell and sea-glass inlay, dribble spires and seaweed banners.',
    obstacles: [
      { name: 'Crumble Bridge', kind: 'hurt', how: 'A sand bridge spans most of the shaft (a narrow breach stays open), dark and solid while wet. It pales as it dries, cracks, then crumbles away to leave the shaft clear, until a wave of spray soaks the stubs and it re-forms.' },
      { name: 'Bucket Drop', kind: 'hurt', how: 'A round shadow grows on the shaft, then a giant bucket plonks a fresh turret there. The turret blocks that spot for a few seconds and slumps back into sand.' },
      { name: 'Kite Tail', kind: 'push', how: 'A kite dips into view and its long ribbon tail ripples down the shaft in an S that slides from wall to wall; touching the ribbon shoves you with it.' },
    ],
    twist: 'Wet sand holds, dry sand falls: every so often the tide sloshes up the castle and rebuilds every bridge it reaches.',
    pilot: 'Mole: burrows straight through slumped turrets.' },

  { key: 'conch', group: 'shore', name: 'Conch Spiral', tagline: 'Fly up the spiral inside a giant pink conch shell, as the sea hums through it.',
    mood: 'Pearly nacre glowing pink, lilac and mint, soft light filtering through the shell wall.',
    palette: ['#f6c6d6', '#b9a4e8', '#ffe9f0', '#6fd0c8'],
    walls: 'Smooth iridescent nacre in growth bands, the spiral ridge winding round, pearls set in pockets.',
    obstacles: [
      { name: 'Pearl Orbit', kind: 'hurt', how: 'A big pearl rolls round the spiral groove: behind the column it is small, dim and harmless; it swells and shines as it comes round the near side, where it hurts.' },
      { name: 'Echo Ring', kind: 'slow', how: 'The shell hums, the walls shimmer, then a ring of sound closes in from the walls to the middle and opens out again; caught in it you are dazed (wobbly steering) for a moment.' },
      { name: 'Undertow', kind: 'push', how: 'The shell breathes with the sea: bubbles stream down (the tell), then a current drags you down for a beat, then the bubbles turn and it lifts you.' },
    ],
    twist: 'The spiral turns as you climb, so the open side of the shaft winds round from one wall to the other.',
    pilot: 'Snail: home sweet home, the echoes never daze him.' },

  { key: 'reef', group: 'shore', name: 'Coral Kingdom', tagline: 'Rocket up a sunlit reef wall, through coral towers and fish schools.',
    mood: 'Bright turquoise water, rippling sun caustics, coral pink, lemon and violet.',
    palette: ['#1fb5c4', '#ff7a6a', '#ffd36a', '#0e5a7a'],
    walls: 'Coral heads, brain and table corals, sea fans and swaying weed on a sandy reef wall.',
    obstacles: [
      { name: 'Puffer Bloat', kind: 'hurt', how: 'A small pufferfish patrols a lane. When you come near it gulps water (cheeks fill, spines prickle up) and balloons into a huge spiky ball that closes the lane, then slowly deflates.' },
      { name: 'Anemone Surge', kind: 'hurt', how: 'Stinging anemones line both walls. The swell rolls through: sand ripples show its way, then every tentacle leans hard one way, closing that side and opening the other, and swings back.' },
      { name: 'Manta Lift', kind: 'pick', how: 'A manta ray glides lazily across the shaft. Touch its back as it passes and it carries you up in a swoop.' },
    ],
    twist: 'Fish schools part around you like curtains and close again, hiding the coins inside them.',
    pilot: 'Octopus: a puff of ink and the puffers can’t see him to bloat.' },

  { key: 'saltlake', group: 'shore', name: 'Flamingo Salt Flats', tagline: 'Up through the white salt chimneys of a pink sunset lake, where the flamingos roost.',
    mood: 'Pink and peach sunset over a mirror-still lake, chalk-white salt towers, lilac shadows.',
    palette: ['#ff9bb0', '#fff4f0', '#7c6bb0', '#ffb347'],
    walls: 'Knobbly white tufa towers crusted in salt crystals, pink brine pools on their ledges, flamingo nests.',
    obstacles: [
      { name: 'Mirage Pillar', kind: 'hurt', how: 'A salt pillar shimmers in two places at once; only the one with a shadow on the lake is real. The heat haze thickens, then the image slides across and swaps.' },
      { name: 'Salt Bloom', kind: 'hurt', how: 'A pink brine pool on a ledge fizzes, then salt crystals grow out of it across the shaft in branching spikes. A splash from the lake dissolves them back.' },
      { name: 'Rainbow Spray', kind: 'pick', how: 'A flamingo stamps and spray hangs in the low sun; a rainbow arcs across the shaft. Fly along the arc and you slide up it like a rail.' },
    ],
    twist: 'The lake mirrors everything: every coin and every hazard has a reflection, and only real things cast shadows.',
    pilot: 'Hamster: the turbo ball’s glass shows which pillar is real.' },

  { key: 'stilts', group: 'shore', name: 'Stilt Village', tagline: 'A fishing village of shacks on stilts, stacked up a sea stack at dusk.',
    mood: 'Violet dusk over the sea, warm orange windows, the first stars, lantern moths.',
    palette: ['#4b3d78', '#ff9f4a', '#2f6f8a', '#e8d0a8'],
    walls: 'Weathered plank shacks on stilts, tin roofs, rope ladders, nets drying, buoys and lanterns.',
    obstacles: [
      { name: 'Lantern Moths', kind: 'hurt', how: 'Moths circle a porch lantern. Fly near and your flame is brighter: the cloud peels off and chases you for a short way, then drifts home to the lantern.' },
      { name: 'Net Haul', kind: 'slow', how: 'A fishing net hangs from a boom; the boom creaks round (the tell), then the net is hauled across the shaft. Tangled in it you are slowed till you wriggle free.' },
      { name: 'Pelican Pouch', kind: 'hurt', how: 'A pelican dozes on a post. Come close and it wakes, its pouch flapping wide open into the shaft, gulps, and settles back to sleep.' },
    ],
    twist: 'Night falls as you climb: windows light up one by one and the lanterns become the only light.',
    pilot: 'Cat: the moths and the pelican mind their manners around her.' },

  // ---------------------------------------------------------------- the village
  { key: 'junkyard', group: 'village', name: 'Junk Heap', tagline: 'The island’s scrapyard: a tower of junk with a compactor that still works.',
    mood: 'Hazy orange late afternoon, rust and teal tin, sun glinting off old chrome.',
    palette: ['#c0602e', '#5fa8a0', '#f2c14e', '#4a3a40'],
    walls: 'Stacked fridges, tyres, washing machines, car doors and road signs, rusty and patched.',
    obstacles: [
      { name: 'Compactor', kind: 'hurt', how: 'The walls themselves squeeze: hazard lamps spin and pistons hiss, then two crusher plates slide in and narrow the shaft to a slot, then grind back out.' },
      { name: 'Fridge Dominoes', kind: 'hurt', how: 'A row of old fridges stands along a ledge. One wobbles and the row topples in a chain toward the shaft; the last, tallest one tips out over the shaft (a gap stays open beyond it), then a little junk robot stands them back up.' },
      { name: 'Oil Slick', kind: 'slow', how: 'A dented drum glugs, then a shiny oil slick spreads down a sheet of tin. Fly through it and you go slippery: your steering drifts for a moment.' },
    ],
    twist: 'The heap settles: every so often the junk shifts with a crash and the walls change shape.',
    pilot: 'Raccoon: rummages, every junk pile coughs out coins.' },

  { key: 'onsen', group: 'village', name: 'Hot Spring Terraces', tagline: 'Steaming hot-spring pools stepping up the volcano’s flank on a snowy night.',
    mood: 'Night teal and snow, warm cedar wood and paper screens glowing, rosy steam.',
    palette: ['#244a5a', '#d98a4e', '#e8f4f2', '#ff7a8a'],
    walls: 'Mossy stone terraces with steaming pools, cedar bath houses, paper screens and stone lanterns, snow on everything.',
    obstacles: [
      { name: 'Scald Steam', kind: 'hurt', how: 'A vent breathes white steam most of the way across the shaft; white steam is harmless. It blushes pink, then red when it is superheated and scalds, then fades back to white.' },
      { name: 'Shoji Doors', kind: 'hurt', how: 'A pair of paper doors runs on a rail across the shaft, leaving a gap at one side. A bather’s shadow walks up behind the paper (the tell), then the doors slide over and the gap jumps to the other side, then back.' },
      { name: 'Warm Updraft', kind: 'push', how: 'A hot pool sends up a column of shimmering air. Inside it you rise faster but drift with its sway; it swells and shrinks with the pool’s bubbling.' },
    ],
    twist: 'Snow monkeys bathe in the pools and throw coins they find to you.',
    pilot: 'Lobster: loves the heat, the steam never scalds him.' },

  { key: 'washhouse', group: 'village', name: 'Wash House', tagline: 'Up through the island’s great laundry: tubs, soap suds, mangles and washing lines.',
    mood: 'Clean morning light, soap-bubble blue and white, lemon soap, rainbow film on bubbles.',
    palette: ['#8fd0f4', '#ffffff', '#ffe36a', '#4a7ab8'],
    walls: 'Blue and white tiles, copper pipes, washboards, shelves of soap and bottles, laundry hanging.',
    obstacles: [
      { name: 'Mangle Rollers', kind: 'push', how: 'A pair of wringer rollers turns in a wall. They speed up with a rattle, then suck air in: get close and you are pulled toward them until they slow down again.' },
      { name: 'Steam Iron', kind: 'hurt', how: 'An iron puffs on a board that juts from a wall, then glides along it and back, leaving a glowing hot pressed stripe that cools from red to nothing.' },
      { name: 'Suds Swell', kind: 'slow', how: 'A tub of suds fizzes; a heap of foam swells out over the shaft and pops away bubble by bubble. In the foam you climb slowly.' },
    ],
    twist: 'Giant soap bubbles drift up the shaft: pop them for coins.',
    pilot: 'Duck: the rubber duck floats on the suds.' },

  { key: 'treehouse', group: 'village', name: 'Treehouse Town', tagline: 'A village in the crown of a giant banyan, joined by ladders, pulleys and rope lifts.',
    mood: 'Golden-hour light through green leaves, warm planks, paper lanterns, hazy canopy depths.',
    palette: ['#7a5232', '#8cc04a', '#ffc75a', '#3d6a4a'],
    walls: 'Banyan trunks and aerial roots, plank decks, round doors, pulleys, rope ladders and leafy roofs.',
    obstacles: [
      { name: 'Counterweight Lift', kind: 'pick', how: 'A basket and a sandbag hang on one rope over a pulley. The brake lever clacks, then the basket rises (ride it up) while the sandbag drops on the other side, and that hurts.' },
      { name: 'Bucket Wheel', kind: 'hurt', how: 'A loop of rope runs between two pulleys across the shaft with buckets on it, going round like a ferris belt: slip between the buckets as they pass.' },
      { name: 'Springy Branch', kind: 'push', how: 'A long leafy branch hangs over the shaft. Brush it and it bends, then whips back and flicks you away the other way.' },
    ],
    twist: 'Lanterns light up deck by deck as the sun goes down.',
    pilot: 'Lemur: tree-born, rides the lifts twice as high.' },

  { key: 'paint', group: 'village', name: 'Paint Loft', tagline: 'Up the island artist’s tall studio, through drips, stripes and colour.',
    mood: 'Warm cream skylight, splashes of magenta, teal and tangerine, wet paint shine.',
    palette: ['#f6eee2', '#e8508a', '#2ec4b6', '#ff9f1c'],
    walls: 'Canvases stacked against plaster, paint tubes, brush jars, ladders, rag-draped shelves and splattered planks.',
    obstacles: [
      { name: 'Colour Gate', kind: 'hurt', how: 'A wet stripe of paint spans the shaft. If your rocket is the same colour you pass right through it; any other colour and it is solid. The stripe ripples before it changes colour, and it never changes while you are inside it.' },
      { name: 'Paint Mist', kind: 'pick', how: 'An atomiser puffs a cloud of colour; fly through to change your rocket’s colour (to match the next gate).' },
      { name: 'Brush Stroke', kind: 'push', how: 'A giant brush dips, then sweeps a stroke across the shaft, shoving you with it and leaving a wet trail that dries.' },
    ],
    twist: 'Colour matters: the right colour opens the way, the wrong one blocks it.',
    pilot: 'Chameleon: changes colour to match any gate by himself.' },

  // ---------------------------------------------------------------- the wild
  { key: 'dewdrop', group: 'wild', name: 'Dewdrop Meadow', tagline: 'Shrunk to bug size at dawn, climbing through the grass of the island meadow.',
    mood: 'Soft mint and peach dawn, glittering dewdrops, giant blades of grass, low gold sun.',
    palette: ['#bde8c0', '#ffc8a8', '#5aa04a', '#e8fbff'],
    walls: 'Huge grass blades and clover, stems, ladybirds, snail shells, all beaded with dew.',
    obstacles: [
      { name: 'Sun Lens', kind: 'hurt', how: 'A big dewdrop hangs on a blade; as the blade sways, it focuses the sun into a bright dot that warms (tell) then burns, tracking slowly along its path.' },
      { name: 'Dew Web', kind: 'push', how: 'A spider web beaded with dew stretches across part of the shaft. It sags under the drops; touch it and it springs you back down.' },
      { name: 'Dandelion Puff', kind: 'pick', how: 'A dandelion clock sheds a seed; catch its parachute and float up gently.' },
    ],
    twist: 'The sun climbs: the dew evaporates as you go, so the meadow gets brighter and the webs drier.',
    pilot: 'Axolotl: loves the wet, slips through dew webs.' },

  { key: 'moonflower', group: 'wild', name: 'Moonflower Garden', tagline: 'An overgrown night garden where flowers open only in moonlight.',
    mood: 'Deep teal-green night, silver-white blooms, violet glow, drifting clouds over the moon.',
    palette: ['#123a3a', '#f0f6ff', '#b48cff', '#7af0c0'],
    walls: 'Tangled vines, trellis, huge pale blossoms, glowing buds and sleeping beetles.',
    obstacles: [
      { name: 'Moon Bloom', kind: 'hurt', how: 'A giant flower is closed while a cloud covers the moon. The moonlight edge creeps down the shaft (the tell), then its thorny petals unfold across the shaft, and close again under cloud.' },
      { name: 'Sleepy Pollen', kind: 'slow', how: 'A bud nods and sighs out a glittering cloud of pollen; fly through it and you are drowsy: your steering lags for a moment.' },
      { name: 'Creeping Tendril', kind: 'hurt', how: 'A vine tendril unfurls and slowly grows toward your rocket’s warmth, then withers back to the trellis.' },
    ],
    twist: 'Moon and cloud: the garden opens and closes as clouds pass over the moon.',
    pilot: 'Mushroom: a night creature, the pollen can’t make him sleepy.' },

  { key: 'canefield', group: 'wild', name: 'Harvest Cane Field', tagline: 'A sugar-cane field under the harvest moon, with a scarecrow who isn’t quite still.',
    mood: 'Big orange moon, plum dusk, golden cane, crows and pumpkin lanterns.',
    palette: ['#ff8a3a', '#5a2e5a', '#e8c46a', '#3a2a3a'],
    walls: 'Walls of tall sugar cane, stakes, twine and pumpkin lanterns, a scarecrow on a post.',
    obstacles: [
      { name: 'Crow Murmuration', kind: 'hurt', how: 'A flock of crows wheels across the shaft as one shape, morphing from a ribbon into a ring; the hole in the flock is the way through.' },
      { name: 'Dust Devil', kind: 'push', how: 'A whirl of chaff and leaves wanders across the shaft. It spins up (tell), then shoves you sideways as it passes, and fades.' },
      { name: 'Cane Wave', kind: 'hurt', how: 'A gust ripples through the field: the cane on one wall bends over into the shaft in a wave that rolls up the wall, then springs back.' },
    ],
    twist: 'The scarecrow turns its head to follow you, and crows land where it looks.',
    pilot: 'Goat: chews a path through the cane.' },

  { key: 'whale', group: 'wild', name: 'Whale’s Belly', tagline: 'Swallowed by a huge friendly whale: climb out through its insides.',
    mood: 'Warm rose and coral flesh, cosy lamplight from swallowed lanterns, a bit eerie.',
    palette: ['#d85a6a', '#ffb0a0', '#7a2a4a', '#ffd88a'],
    walls: 'Soft rippled pink walls, ridges like a ribbed roof, swallowed junk: boats, barrels, lanterns.',
    obstacles: [
      { name: 'Gulp Wave', kind: 'push', how: 'The whale swallows: a ring of squeezed walls travels down the throat, narrowing the shaft and pushing you down as it passes.' },
      { name: 'Slosh', kind: 'hurt', how: 'A pocket of water full of sea urchins sits on a fold. The whale rolls, the water tilts (tell), then the urchins slosh across the shaft and back.' },
      { name: 'Krill Cloud', kind: 'slow', how: 'A pink cloud of krill drifts through; fly into it and your engine coughs and sputters for a moment.' },
    ],
    twist: 'The whale hiccups every so often, blowing everything (you too) up the throat.',
    pilot: 'Puffer: puffs up so the gulp can’t squeeze him.' },

  { key: 'abyss', group: 'wild', name: 'Midnight Trench', tagline: 'Down where the sun never reaches: the deep trench below the island.',
    mood: 'Inky blue black, cold cyan and magenta bioluminescence, drifting marine snow.',
    palette: ['#0b1a3a', '#3af0ff', '#ff4fd8', '#2a4a8a'],
    walls: 'Dark volcanic trench walls with tube worms, glass sponges and glowing lichen.',
    obstacles: [
      { name: 'Angler Lure', kind: 'pick', how: 'A glowing lure looks like a coin dangling in the dark. Grab it while the angler sleeps for big coins; when the lure flickers, its jaws are about to snap shut around it.' },
      { name: 'Blinker School', kind: 'hurt', how: 'A school of lantern fish crosses the shaft, but they only show while they blink: dark, a pulse of light (the tell), then they flash and you see where they are.' },
      { name: 'Siphon Chain', kind: 'hurt', how: 'A long chain of glowing jelly bells drifts across: it bunches up into a tight coil, then stretches out like a spring, its length changing as you watch.' },
    ],
    twist: 'Darkness: only glowing things can be seen; your flame lights a small circle around you.',
    pilot: 'Firefly: her own light shows the blinkers between blinks.' },
];
