# Sample sources and licences

Every recorded sound the music uses comes from one library:

**Versilian Studios Chamber Orchestra 2, Community Edition (VSCO 2 CE)** by Versilian Studios / Sam Gossner,
github.com/sgossner/VSCO-2-CE. Licence: **CC0 1.0** (public domain dedication; the repository's `LICENSE` file).
No attribution required.

The library lives at the repo root in `music-samples/` (not committed). Files keep their names and folders from the
repository, except two folders noted below.

## Original download (before 2026-10-28)
Strings (violin, viola, cello, bass: sustain and spiccato), brass (horns, trombones, trumpets, tuba), timpani, glockenspiel and xylophone (`Percussion/Glock`, `/Xylo`),
VSCO 1 percussion (drums, cymbals), log drum, shaker, marimba, flute, upright piano.

## Added 2026-10-28 for the mood-group tracks (1028 files, about 736 MB, all new subfolders)
Downloaded file by file from `https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/<path>`. No existing file
was changed or removed.

| Library folder | From the repo's | Used as (lib.mjs) |
|---|---|---|
| Strings/Harp | same | harp |
| Strings/Violin Section/Pizz, /Trem | same | vlnPizz, vlnTrem |
| Strings/Viola Section/pizz | same | vlaPizz |
| Strings/Cello Section/pizzT, /trem | same | vcPizz, vcTrem |
| Strings/Solo Contrabass/Pizz | same | cbPizz |
| Woodwinds/Oboe/Sus, /Vib, /Stacc | same | oboeSus, oboe, oboeStac |
| Woodwinds/Clarinet/susLong, /stac | same | clar, clarStac |
| Woodwinds/Bassoon/sus, /stac | same | bsn, bsnStac |
| Woodwinds/Flute/stac | same | fluteStac |
| Woodwinds/Piccolo/Sus, /Stac | same | picc, piccStac |
| Keys/Organ/Quiet | same | organ, organPedal |
| VSCO 1 Percussion/drums/other/Bongos | same | bongo |
| VSCO 1 Percussion/drums/other/ethnic/congo/{open,muted} | same | ethDrum, ethMute |
| VSCO 1 Percussion/drums/other/ethnic/giant/{hand,mallet,sticks} | same | bigHand, bigMallet, bigSticks |
| VSCO 1 Percussion/varMetal/various, /triangle/1, /Cymbals/clash | same | fingerCym, agogo, cabasa, chimes, sleigh, clash |
| **VSCO 1 Percussion/varWood/more** | `VSCO 1 Percussion/varWood` (its loose files; renamed so nothing lands beside existing ones) | wood |
| **Percussion/hand and metal** | `Percussion` (a selection: Conga/Quinto/Tumba, LogDrum, Claves, Cowbell, Anvil, BellTree, Tamb, Triangle, gong, BrakeDrum, Guiro, Snare2 taps, Sleighbells, crash, suspended-cymbal swells) | conga, logHi/Lo, claves, cowbell, anvil, belltree, tamb, tri, gong, brake, guiro, snare2, crash |
| Miscellania Raw/Misc 1, Misc 2, Misc 2/NepaleseBells | same | misc, frame, tambMisc, nepBells |

The download plan (what was fetched, where it went) was made from the repository's git tree listing.

Note: 72 of the 112 files in `Percussion/hand and metal` (about 62 MB: anvil, bell tree, brake drum, claves, cowbell,
crash, gong, log drum, triangle and some conga hits) are byte-identical copies of files that were already loose in
`Percussion/` (added there on 2026-10-24 for the studio kit). They were fetched into the new folder so the new
instruments read one self-contained folder; they can be deduplicated later by pointing those instruments at
`Percussion/` (lib.mjs `INSTR`) and deleting the copies.
