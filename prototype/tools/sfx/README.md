# Sound effect tools

The game's sound effects are rendered offline from real recorded instruments (the VSCO 2 CE sample library, CC0, in
`music-samples/` at the repo root; see `../music/README.md`) plus a little synthesis, layered the way game effects
are made: a sharp attack, a pitched body, a sparkle on top and a short room tail.

1. `node render-sfx.mjs [name ...]` renders each effect to `out/<name>.wav` and `out/sfx.json` (length, whether it's
   tonal, a version stamp). The effects and their designs are described in the file.
2. `./encode.sh` encodes them to AAC (`.mp4`) in `prototype/audio/sfx/` with `sfx.json`.

Samples used beyond the music's: Percussion/Glock, Percussion/Xylo and these Percussion files from the VSCO-2-CE
repository: Triangle, BellTree, Sleighbells, TB_hit (tubular bells), Claves, Cowbell, Tamb1, Ratchet, gong,
cymbal-crash, susCymb1, zap, alien, vibraring, Anvil, BrakeDrum, Conga, Snare2 and LogDrum.

Tonal effects are in D minor pentatonic (the soundtrack's key); the game shifts them to each zone's key. In the debug
music lab, every effect can be auditioned and noted.
