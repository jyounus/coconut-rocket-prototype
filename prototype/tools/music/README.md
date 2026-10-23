# Music tools

The soundtrack is composed as code (`render.mjs`: a form of sections, chords, tunes and the 3-3-2 drive) and played on
real recorded instruments from the **VSCO 2 Community Edition** sample library (CC0, public domain:
github.com/sgossner/VSCO-2-CE). Nothing here needs installing beyond Node and macOS's `afconvert`.

1. Samples: the instruments used live in `music-samples/` at the repo root (not committed; about 830 MB). They were
   downloaded file by file from the VSCO-2-CE repository (strings, brass, timpani, drums, cymbals, log drum, shaker,
   marimba and flute folders).
2. `node render.mjs [track ...]` renders each track (`menu`, `jungle`, `caves`, `magma`) to `out/<track>.wav` (a seamless
   loop: its reverb tail is wrapped onto the loop start) plus four stems (`-strings`, `-brass`, `-perc`, `-winds`) and
   `out/tracks.json` (tempo, loop points, join point, sections).
3. `./encode.sh` encodes them to AAC in `prototype/audio/music/` (mixes 160 kbps, stems 96 kbps) with `tracks.json`.
4. Checks: `node levels.mjs <track>` (loudness per section and stem, rumble below 40 Hz), `node spectrogram.mjs <wav>
   <png>` (an image of the render), `node pitch.mjs <wav>` (a sample's pitch: VSCO names notes an octave low).

The game plays the mixes (and the debug **Music lab** plays the stems, by section, with mute / solo and timestamped
notes). For the native port, the stems are ready for adaptive music (e.g. bringing the percussion in when the monster
is close).
