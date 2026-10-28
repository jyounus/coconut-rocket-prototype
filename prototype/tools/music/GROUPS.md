# The mood groups: which adventure level plays which track

Ten new tracks, one per mood group, plus the classic `jungle` for the first three levels. The same mapping is in the
game as data (`index.html`: `MUS_TRACKS`, the registry with each track's label; `MUS_LEVEL`, level id -> track;
`MUS_REGION`, a fallback by the level's `region` for any level added later; a boss level not listed gets `boss`).
Endless mode always plays `jungle` with its zone sound, as before. Until a group's track is rendered and encoded
(`audio/music/<name>.json` exists), its levels play `jungle`, so groups can land one at a time.

The game has **41** levels in this copy (`{ id:` in index.html); the brief mentioned 48. Levels added later fall back
through `MUS_REGION` (or `boss`); add their ids to `MUS_LEVEL` and to the table below when they land.

`keyTr` is the key against the classic score's D minor, in semitones (the game's tonal sound effects follow it); keep
it within about ±6. Tempos and keys below are the plan; a composer may move a tempo by about ±6 bpm or the key by a
step if the score needs it (say so in the track file's header).

| Track | Levels | Mood | Tempo | Key (keyTr) | Signature instruments | Groove | The feel (DKC Returns / Tropical Freeze, in words) |
|---|---|---|---|---|---|---|---|
| `ruins` **(done)** | 4 Sunken Temple, 6 Idol's Climb, 21 Fossil Bonepit, 23 Cursed Treasure Vault, 38 Sandstorm Canyon, 40 Bamboo Pagoda | ancient ruins, desert, temples | 112 | E Phrygian dominant (+2); lift in A minor; climax up a step to F# | oboe (snake-charmer hook), horns answering, harp ripples, pizzicato strings, marimba ostinato, finger cymbals, chimes, gong | darbuka-style 3-3-2 on hand drums (big hand drum, conga/quinto/tumba, bongo ghosts), tambourine, shaker | the sun-baked temple stages: mysterious drone and an exotic call, then a heroic full-orchestra statement of the hook with the hand drums driving underneath |
| `reef` | 11 Hidden Lagoon, 12 Jelly Drift, 22 Shipwreck Hold, 24 Cascade Falls | sea and reef, under water | 92 | F major / Lydian (+3) | harp arpeggios, flute and clarinet in thirds, glockenspiel and marimba sparkle, string pad with slow swells, pizzicato bass, soft horn chorale | a gentle swung 12/8 lilt (or a slow bossa on soft congas and shaker), cymbal swells instead of crashes | the floating, dreamy water stages: a warm ambient pad and a long singing melody that drifts and breathes, lots of space and reverb, a tender key lift for the climax |
| `works` | 13 Old Gold Mine, 26 Clockwork Tower, 27 Kooky Lab, 28 Pipe Organ Cavern | machines, clockwork, mines, the lab | 126 | C minor (-2) | xylophone and staccato bassoon ostinatos, pizzicato, organ (the cavern), staccato brass, anvil, brake drum, claves, woodblocks, timpani | a ticking 16th-note clockwork ostinato in layers (each instrument a gear on its own cycle: 3 against 4), anvil on the backbeat | the factory and mine-cart stages: a tight, mechanical, slightly comic drive that keeps stacking parts until the whole machine is running, then a big brass hook on top |
| `carnival` | 29 Pinball Palace, 30 Candy Caverns, 31 Cheddar Caverns, 32 Toybox Tower, 33 Monkey Carnival | toys, sweets, carnival | 132 | G major (+5) | piccolo and clarinet leads, glockenspiel, xylophone, tuba and trombone oom-pah, staccato strings, cowbell, sleigh bells, snare | a bouncy circus two-step with a swung edge, oom-pah bass on 1 and 3, snare on 2 and 4, a samba break | the playful bonus-room and toy stages: cheeky, bouncy, a whistle-able hook passed round the band, a jaunty key change upward |
| `spooky` | 7 Murk Mire, 8 Snapjaw Swamp, 34 Haunted Lighthouse, 35 Wizard's Spire | bog, night, haunted, magic | 100 | A minor / harmonic minor (-5) | organ, tremolo strings, bassoon and bass clarinet-ish low clarinet, harp glissandi, glockenspiel as a music box, low pizzicato, log drums, Nepalese bells | a slinking swamp shuffle (swung 8ths) on log drums and muted congas, ghostly cymbal swells | the creepy swamp and haunted stages: a sneaky, slightly funny tiptoe theme in the low winds, eerie shimmer above, a dramatic minor climax with organ and brass |
| `sky` | 25 Gull Cliffs, 36 Starfall Summit, 37 Beanstalk Heights | sky, cliffs, heights, stars | 120 | E-flat major (+1) | soaring horns and violins in octaves, flute and piccolo runs, harp, glockenspiel, timpani, crash cymbals | an open, driving 4/4 with tom fills and big downbeats; half-time breathers | the high cliff and cloud stages: wide, heroic and airy, a long-lined melody that climbs, wind-like string runs, a triumphant brass key change at the climax |
| `burrows` | 5 Honeycomb Hive, 10 Glowshroom Grotto, 39 Anthill Underworks, 41 Hollow Palm | bugs, burrows, hives, underground | 118 | D Dorian (0) | staccato bassoon and clarinet, pizzicato strings, marimba, bongos, guiro, shaker, cabasa, xylophone | a busy syncopated funk of hand percussion and scratchy guiro, the bass in pizzicato cellos and basses | the busy underground and bug stages: scurrying, funky, a little mischievous, the groove carries it, with a warm, glowing B section |
| `frost` | 16 Amethyst Geode, 17 Frost Hollow, 18 Thunder Rift | ice, storm, crystal | 92 | B minor (-3) | glockenspiel, harp, celesta-like high marimba, triangle, sleigh bells, flute, tremolo strings, timpani thunder, chimes | sparse and crystalline, a slow 6/8 sway that turns into a storming double-time with timpani for the climax | the icy and stormy stages: glittering, cold and lonely at first, a beautiful melody over a shimmering bed, then a thunderous build |
| `forge` | 14 Basalt Deep, 19 Magma Core | volcano, forge, lava | 138 | C# minor (-1) | low brass (trombones, tuba), horns, tremolo cellos, organ pedal, timpani, giant drums (hand, mallet, sticks), anvil, gong | a pounding 3-3-2 on giant drums and timpani, anvil hits, relentless 8th-note string ostinato | the volcano and fire stages: hot, heavy, relentless, a dark brass riff over pounding drums, building to a furious climax |
| `boss` | 9 Gobblebloom, 15 Geode King, 20 Bellows Drake | boss fights | 144 | F minor (+3) | the full orchestra: horn and trumpet theme, trombones and tuba, spiccato strings, timpani ostinato, giant drums, gong, crash and clash cymbals, organ for weight | an urgent driving 4/4 with hemiola stabs (3 against 4) and a timpani ostinato; a short tense break before the last charge | the boss battles: urgent and epic, a short, hammering brass motif, stabs and string runs, a desperate minor key change upward for the final phase |
| `jungle` (classic) | 1 Root Run, 2 Vine Gully, 3 Thorn Hollow | jungle | 120 | D minor (0) | unchanged | unchanged | unchanged (the existing gameplay track) |

## The mapping by level (as in `MUS_LEVEL`)

1 jungle · 2 jungle · 3 jungle · 4 ruins · 5 burrows · 6 ruins · 7 spooky · 8 spooky · 9 boss · 10 burrows · 11 reef ·
12 reef · 13 works · 14 forge · 15 boss · 16 frost · 17 frost · 18 frost · 19 forge · 20 boss · 21 ruins · 22 reef ·
23 ruins · 24 reef · 25 sky · 26 works · 27 works · 28 works · 29 carnival · 30 carnival · 31 carnival · 32 carnival ·
33 carnival · 34 spooky · 35 spooky · 36 sky · 37 sky · 38 ruins · 39 burrows · 40 ruins · 41 burrows

## The region fallback (`MUS_REGION`, for levels added later)

jungle, beach -> jungle · temple, fossil, vault, sandstorm, pagoda -> ruins · lagoon, shipwreck, cascade -> reef ·
mine, clockwork, lab, organ -> works · pinball, candy, cheese, toybox, carnival -> carnival · bog, lighthouse, wizard ->
spooky · cliffs, starfall, beanstalk -> sky · hive, grotto, anthill, hollowpalm -> burrows · crystal, frost, storm ->
frost · caves, magma -> forge · any other boss level -> boss
