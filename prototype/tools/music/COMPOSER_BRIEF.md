# Composer brief: writing one mood-group track

You write **one** track of `GROUPS.md` (its name, levels, tempo, key, instruments, groove and feel are there), in
**one new file**, `tools/music/tracks/<name>.mjs`, and render, check and encode only that track. The model to copy
is `tracks/ruins.mjs`: read it top to bottom before you start.

The game is already wired up for your track: it is in the registry (`MUS_TRACKS`), its levels are mapped
(`MUS_LEVEL`), and the Music lab and Sound studio list it as soon as `audio/music/<name>.json` exists. Until then its
levels play `jungle`. So **you never edit** `lib.mjs`, `tracks/classic.mjs`, `render.mjs`, `index.html`,
`audio/music/tracks.json` or another composer's files. If you need something from the shared code (a new instrument,
a helper), write it locally in your track file, or note it in your report for the lead.

Inspiration: the Donkey Kong Country Returns and Tropical Freeze scores (David Wise, Kenji Yamamoto): lush layered
orchestration, an unforgettable hook, syncopated grooves of layered world percussion, warm ambient pads, bold key
changes and builds, a strong identity per world. Take the **feel**; never copy their melodies or progressions.
You cannot hear the result either: judge it by the score and the checks below, never claim it "sounds" good.

## The file

```js
import { ph, voicing, atOrAbove, nearestTone, pc, scaleNotes } from '../lib.mjs';
export default {
  name: 'reef', label: 'Reef', bpm: 92, keyTr: 3, seed: 1234,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]],
  loop: 4,                 // bars of intro played once; the loop is bar `loop` to the end
  join: 4,                 // bar where a crossfade from another run track joins (the start of A)
  chords: { intro: ['F', ...], A: [...], ... },   // chord names per bar, cycled; at concert pitch
  up: { climax: 2 },       // a key change: the section's chords (and your tunes, via B.up) go up 2 semitones
  key: { tonic: 5, scale: 'lydian' },             // or keyOf: B => ({ tonic, scale }) per bar (see ruins)
  mix: { send: {...}, level: {...} },             // optional, per stem: reverb send and level (defaults in lib.mjs)
  compose(S) { ... },
};
```

- **Chord names**: root `C`..`B` with `#`/`b`, quality `'' m 7 m7 maj7 sus2 sus4 dim aug add9 m9 madd9 5 6 m6`, an
  optional `/bass`. `chord(name)` gives `{ root, bass, tones }` as pitch classes.
- **`key`/`keyOf`** feed the studio's note editor (which notes are in key in each bar); it gets the chords from
  `chords`. `keyTr` is the key against the classic D minor (keep within about ±6).
- **`compose(S)`** writes every note. `S` has: `sp` (a 16th, s), `beat`, `bar`, `map` (one entry per bar:
  `{ b, sec, i, n, t0, up, ch, C, last, intoNew, next }`), `loopStart`, `loopEnd`, `note(stem, id, midi, t, o)`,
  `rev(stem, id, filter, tEnd, o)` (a reversed sample ending at `tEnd`: cymbal swells into a section) and `rnd`
  (seeded: the same seed renders the same file).
- `note` options: `dur` (s), `vel` (0..1, also picks the dynamic layer), `pan` (-1..1), `att`, `rel` (s), `gain`,
  `tune` (cents), `filter` (a regex on the sample's file name: articulation, round robin, a particular drum).
  Unpitched instruments take `midi = null`.
- **Stems** (exactly these five, each a file the lab and studio can solo, mute and rearrange per bar):
  `strings` (all strings, harp), `brass` (horns, trumpets, trombones, tuba), `piano` (**mirror the brass lines on the
  piano**: the piano mix plays them instead of the brass, see `piano()`/`brass()` in ruins), `perc` (every unpitched
  sound plus timpani), `winds` (woodwinds, mallets: marimba, xylophone, glockenspiel, and the organ).
- **Instruments** (`INSTR` in lib.mjs): strings `vlnSus vlaSus vcSus cbSus vlnSpic vlaSpic vcSpic cbSpic vlnPizz
  vlaPizz vcPizz cbPizz vlnTrem vcTrem harp`; brass `hnSus hnStac tptSus tptStac tbnSus tbnStac tubaSus`; winds
  `flute fluteStac picc piccStac oboe oboeSus oboeStac clar clarStac bsn bsnStac marimba xylo glock organ
  organPedal`; `piano`; perc `timp timpRoll bdrum snare snare2 tenorLo tenorHi cym crash clash gong tri fingerCym
  chimes belltree nepBells shaker cabasa tamb tambMisc sleigh guiro claves wood logHi logLo log cowbell agogo anvil brake
  bongo conga ethDrum ethMute bigHand bigMallet bigSticks frame misc`. Several have `filter` choices (look at the
  folder's file names; e.g. conga `/Quinto/`, `/Tumba/`; `hit_hardmall_f` for a hard cymbal hit).
  `node range.mjs <name>` lists the notes your score asks of each instrument against the notes it has samples for:
  keep every part within its samples (about 3 semitones beyond at most).

## Rules the seam and the game need (all done in ruins: copy the patterns)

1. **A hit at t = 0** (a drum or a low note): the game finds the start of the file by its first sound.
2. **Nothing from the intro rings over the loop start**: the loop plays bars `loop`..end again and again, so a note
   that started in the intro and rings into the first loop bar would be missing every time the loop comes round. Let
   the intro's last bar go before the bar line (`preLoop` / `hr` in ruins), end rolls at the bar end. Notes pushed a
   hair early onto the loop's first bar are snapped onto it for you.
3. The **end of the loop runs into its start**: the last bar (the build) leads into the loop's first bar (the A); its
   reverb tail is wrapped onto the loop start for you.
4. **Clamp plucked and struck notes to the bar end** when the next chord may be a semitone away (harp, pizzicato,
   mallets): `dur: Math.min(x, barEnd - t - 0.03)`.
5. **The tune's passing notes**: accompaniment leaves out any chord tone a semitone from a melody note that is not
   in the chord (`pass`/`keep`/`PC` in ruins), so nothing rubs under the tune.
6. A little human timing (`at(s)` with a few ms of `rnd`) and velocity variation; the seed makes it repeatable.

## Commands (in `tools/music/`)

| | |
|---|---|
| `node render.mjs <name>` | renders `out/<name>.wav`, `-pianomix`, the five stems, and adds `<name>` to `out/tracks.json` (prints length, loop, peak, RMS) |
| `CLASH=1 node render.mjs <name>` | also lists bars with semitone / minor-ninth clashes between different parts |
| `LOGNOTES=40,44 node render.mjs <name>` | lists every pitched note sounding between 40 and 44 s |
| `node levels.mjs <name>` | loudness per section and per stem, and the energy below 40 Hz |
| `node spectrogram.mjs out/<name>.wav <png>` | an image of the render (look at it: structure, density, the build) |
| `node loopcheck.mjs <name>` | the seam: the step and the kink at the loop point against the rest of the file, the level either side, the peak, the loop length |
| `node range.mjs <name>` | each instrument's notes against its samples |
| `./encode.sh <name>` | encodes only your track into `audio/music/` (`<name>.mp4`, `-pianomix.mp4`, five stem `.mp4`s) and writes `audio/music/<name>.json`; touches no shared file |

## The quality bar (ruins' numbers in brackets)

- Form: intro, A (the hook), B (a contrasting lift), climax (the hook again, bigger, with a key change or a big
  build), break (a breather), build (back into A). A memorable lead with **call and response** between two
  instrument families; a groove of **layered percussion**; pads; a bass line.
- **Loop 60-110 s** (68.6 s; 77.1 s with the intro).
- **Loudness**: mix RMS about -24.5 dBFS (-24.3; piano mix -23.6); pre-limit peak at most about 0.7 (0.69; the
  limiter catches the rest). Section profile like the classic tracks: intro about -28, A -27, B -24, climax -21,
  break -30, build -26 (ruins: -27.9 / -27.2 / -23.9 / -20.9 / -29.5 / -25.6).
- **Below 40 Hz** under about 5% of the energy (4.2%).
- **Loop seam**: `loopcheck` says "ordinary" for the step, the kink no bigger than at the other bar lines (ruins: step
  0.016 vs 99th percentile 0.026; kink 0.003 vs bar-line max 0.009).
- **Clash audit**: no clashes except deliberate ones (ruins: 1 of 36 bars, a scale run in the lift's last bar).
- Every instrument within its samples (`range.mjs`).
- All five stems carry music (`levels.mjs` per stem: the brass and piano may be silent in the intro).

## Testing in the game

Serve `prototype/` and open `index.html?debug`. On the adventure map pick one of your levels: it plays your track
(the map pre-decodes it). In the debug menu, the Music lab and Sound studio show a tab for it: check the sections, the
stems, the per-bar arrangement and that an edit plays in a run. The studio's export carries the edit per track name;
the owner bakes it into `AUDIO_BAKED`.

## Per group: the DKC feel to aim for (in words)

- **reef**: the dreamy underwater stages. A warm, breathing pad, a long legato melody (flute, then violins), harp
  arpeggios that never stop, the percussion soft and rounded, cymbal swells instead of crashes; the climax a tender
  key lift rather than a loud one.
- **works**: factory and mine-cart stages. Interlocking ostinatos like gears (xylophone, staccato bassoon, pizzicato,
  claves on different cycles), an anvil on the backbeat, organ in the cavern's colour; layers stack up until a bold
  brass hook rides over the machine.
- **carnival**: toy and bonus stages. A whistle-able, bouncy hook passed between piccolo, clarinet and glockenspiel,
  oom-pah tuba, snare and cowbell, a cheeky swing; a jaunty key change up for the climax.
- **spooky**: swamp and haunted stages. A sneaky, slightly comic tiptoe theme in bassoon and low clarinet over
  pizzicato, eerie tremolo strings and music-box glockenspiel above, organ for the climax; minor and chromatic, but
  still a hook.
- **sky**: cliffs and summit stages. Wide and heroic: horns and violins in octaves on a long climbing melody, flute and
  piccolo runs like wind, open drums with tom fills; a triumphant brass key change.
- **burrows**: busy bug and burrow stages. A funky, scurrying groove of bongos, guiro, shaker and cabasa, staccato
  winds, pizzicato bass; a warm glowing B section for the mushroom glow and honey.
- **frost**: ice and storm stages. Glittering and lonely: glockenspiel, harp and triangle over a shimmering string bed,
  a beautiful slow melody; then thunder: timpani and a storming double-time climax.
- **forge**: volcano stages. Hot and relentless: a dark low-brass riff, giant drums and timpani on a pounding 3-3-2,
  anvil hits, a driving string ostinato, organ pedal underneath; the climax furious.
- **boss**: the three boss fights. Urgent and epic: a short hammering brass motif, string runs, hemiola stabs, a
  timpani ostinato, gong and clash cymbals; a short tense break, then the last charge a step higher. Shorter phrases
  than the others; it must stay exciting on its fourth loop.
