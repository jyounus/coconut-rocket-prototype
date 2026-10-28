# Music tools

The soundtrack is composed as code (`tracks/*.mjs`: a form of sections, chords, tunes and the 3-3-2 drive) and played on
real recorded instruments from the **VSCO 2 Community Edition** sample library (CC0, public domain:
github.com/sgossner/VSCO-2-CE). Nothing here needs installing beyond Node and macOS's `afconvert`.

1. Samples: the instruments used live in `music-samples/` at the repo root (not committed; about 1.8 GB). They were
   downloaded file by file from the VSCO-2-CE repository (see `SOURCES.md`).
2. The scores: `tracks/classic.mjs` (the classic four: `menu`, `jungle`, `caves`, `magma`, the same score in other keys)
   and one file per mood-group track, `tracks/<name>.mjs` (see `GROUPS.md` for the groups and which levels play
   which, `COMPOSER_BRIEF.md` for how to write one). The shared engine is `lib.mjs` (instruments, sample loading,
   note rendering, harmony helpers, `renderTrack`, the mixdown and loop wrap).
3. `node render.mjs [track ...]` renders each track named (all classic ones when none is) to `out/<track>.wav` (a
   seamless loop: its reverb tail is wrapped onto the loop start), `out/<track>-pianomix.wav` and five stems
   (`-strings`, `-brass`, `-piano`, `-perc`, `-winds`), and merges its entry (tempo, loop points, join point,
   sections; for the mood-group tracks also the label, key and each bar's harmony) into `out/tracks.json`.
4. `./encode.sh [track ...]` encodes them to AAC (MPEG-4 container, `.mp4`) in `prototype/audio/music/` (mixes 160 kbps,
   stems 96 kbps): the classic tracks' details into `tracks.json`, each mood-group track's into its own `<name>.json`.
5. Checks: `node levels.mjs <track>` (loudness per section and stem, rumble below 40 Hz), `node spectrogram.mjs <wav>
   <png>` (an image of the render), `node loopcheck.mjs <track>` (the loop seam), `node range.mjs <track>` (each
   instrument's notes against its samples), `CLASH=1` / `LOGNOTES=from,to` on a render (clashing notes, a note list),
   `node pitch.mjs <wav>` (a sample's pitch: VSCO names notes an octave low).

Sample sources and licences: `SOURCES.md`.

The game plays the mixes (and the debug **Music lab** plays the stems, by section, with mute / solo and timestamped
notes). For the native port, the stems are ready for adaptive music (e.g. bringing the percussion in when the monster
is close).
