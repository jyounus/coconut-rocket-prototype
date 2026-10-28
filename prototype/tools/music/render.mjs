// Coconut Rocket music renderer: plays the score on real recorded instruments (the VSCO 2 Community Edition library,
// CC0) and writes each track as a seamless loop plus its stems, ready to encode for the game.
//
//   node render.mjs [track ...]        (default: every track)
//
// Samples: ../../../music-samples (downloaded from github.com/sgossner/VSCO-2-CE, not committed). Output: out/<track>.wav,
// out/<track>-<stem>.wav and out/tracks.json (tempo, loop points, sections; a render only replaces its own tracks'
// entries). encode.sh turns them into .mp4 for the game.
//
// Where the music lives:
//   lib.mjs              the engine every track shares: the instruments, note(), the halls, the mixdown, and the
//                        composing helpers (chords, voicings, scales) and renderTrack(), which runs a track module
//   tracks/classic.mjs   the classic score: menu, jungle, caves, magma (unchanged; the game's baked studio edits use it)
//   tracks/<name>.mjs    one file per mood-group track (its score: form, chords, tunes, groove), rendered on its own
//                        with `node render.mjs <name>` (see COMPOSER_BRIEF.md)
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeWav } from './wav.mjs';
import { OUT, SR, note, setSeed, renderTrack, AUDIT, LOG } from './lib.mjs';
import * as classic from './tracks/classic.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRACK_DIR = join(HERE, 'tracks');
const groupNames = () => readdirSync(TRACK_DIR).filter(f => f.endsWith('.mjs') && f !== 'classic.mjs' && !f.startsWith('_')).map(f => f.replace(/\.mjs$/, ''));
// a mood-group track's module, loaded only when it is rendered (a half-written track never stops the others rendering)
async function groupTrack(name) {
  const f = join(TRACK_DIR, `${name}.mjs`);
  if (!existsSync(f)) throw new Error(`no track ${name} (tracks/${name}.mjs)`);
  const def = (await import(pathToFileURL(f).href)).default;
  if (def.name !== name) throw new Error(`tracks/${name}.mjs names itself ${def.name}`);
  return def;
}

// KIT=1: the browser's instrument kit for the sound studio: single dry notes from the same instruments (and the same
// note() and levels) the score uses, every few semitones across each one's useful range, so the game can play added
// parts live and pitch each note a little by playback rate. Writes out/kit/<id>_<midi>.wav and out/kit/kit.json.
const KIT = [
  // id, label, family, lowest, highest, step (semitones), how long a note is held (s)
  ['piano', 'Piano', 'keys', 36, 84, 4, 2.2], ['marimba', 'Marimba', 'percussion', 48, 96, 6, 1.2],
  ['vlnSus', 'Violins', 'strings', 55, 91, 6, 2.2], ['vlaSus', 'Violas', 'strings', 48, 79, 6, 2.2], ['vcSus', 'Cellos', 'strings', 36, 72, 6, 2.2], ['cbSus', 'Double bass', 'strings', 28, 55, 6, 2.2],
  ['vlnSpic', 'Violins, short', 'strings', 55, 91, 6, 0.5], ['vcSpic', 'Cellos, short', 'strings', 36, 72, 6, 0.5], ['cbSpic', 'Double bass, short', 'strings', 28, 55, 6, 0.5],
  ['flute', 'Flute', 'winds', 60, 96, 6, 2.2],
  ['hnSus', 'French horn', 'brass', 41, 77, 6, 2.2], ['hnStac', 'French horn, short', 'brass', 41, 77, 6, 0.5], ['tptSus', 'Trumpet', 'brass', 55, 82, 6, 2.2], ['tptStac', 'Trumpet, short', 'brass', 55, 82, 6, 0.5],
  ['tbnSus', 'Trombone', 'brass', 40, 72, 6, 2.2], ['tubaSus', 'Tuba', 'brass', 28, 55, 6, 2.2],
  ['timp', 'Timpani', 'drums', null], ['bdrum', 'Bass drum', 'drums', null], ['snare', 'Snare', 'drums', null], ['tenorHi', 'Tom, high', 'drums', null], ['tenorLo', 'Tom, low', 'drums', null],
  ['cym', 'Cymbal', 'drums', null], ['log', 'Log drum', 'drums', null], ['shaker', 'Shaker', 'drums', null],
  // (2026-10-28, the mood-group tracks' instruments; their last field: { src: the score's instrument when the kit's id
  // differs, filter: which of its samples, trim: start at the sample's first sound (these samples open with silence) })
  ['harp', 'Harp', 'strings', 36, 96, 6, 1.6, { trim: true }],
  ['vlnPizz', 'Violins, plucked', 'strings', 55, 85, 6, 0.5, { trim: true }], ['vcPizz', 'Cellos, plucked', 'strings', 36, 72, 6, 0.5, { trim: true }],
  ['cbPizz', 'Double bass, plucked', 'strings', 28, 52, 6, 0.5, { trim: true }], ['vlnTrem', 'Violins, tremolo', 'strings', 55, 85, 6, 2.2, { trim: true }],
  ['oboe', 'Oboe', 'winds', 58, 88, 6, 2.2, { trim: true }], ['clar', 'Clarinet', 'winds', 50, 86, 6, 2.2, { trim: true }],
  ['bsn', 'Bassoon', 'winds', 34, 70, 6, 2.2, { trim: true }], ['picc', 'Piccolo', 'winds', 79, 103, 6, 1.6, { trim: true }],
  ['organ', 'Organ', 'keys', 36, 90, 6, 2.2, { trim: true }],
  ['conga', 'Conga', 'drums', null, null, null, 0.6, { trim: true, filter: /^Conga-HitN/ }], ['tumba', 'Conga, low', 'drums', null, null, null, 0.7, { trim: true, src: 'conga', filter: /^Tumba-HitN/ }],
  ['bongo', 'Bongo', 'drums', null, null, null, 0.4, { trim: true, filter: /^HighBongo/ }], ['bigHand', 'Hand drum', 'drums', null, null, null, 0.9, { trim: true, filter: /_hit_f_/ }],
  ['tamb', 'Tambourine', 'drums', null, null, null, 0.5, { trim: true, filter: /^Tamb1-Hit/ }], ['fingerCym', 'Finger cymbals', 'drums', null, null, null, 1.6, { trim: true }],
  ['chimes', 'Wind chimes', 'drums', null, null, null, 2.6, { trim: true, filter: /slowAsc/ }], ['sleigh', 'Sleigh bells', 'drums', null, null, null, 0.8, { trim: true, filter: /^sleighbell1_hit_\d/ }],
  ['crash', 'Crash cymbal', 'drums', null, null, null, 2.4, { trim: true, filter: /_mf_/ }], ['gong', 'Gong', 'drums', null, null, null, 3.5, { trim: true, filter: /^gongHit_f$/ }],
];
if (process.env.KIT) {
  const dir = join(OUT, 'kit'); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const man = {};
  for (const [id, label, family, lo, hi, step, hold, o = {}] of KIT) {
    const notes = lo == null ? [null] : Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
    man[id] = { label, family, notes: lo == null ? [] : notes }; let h = 2166136261;
    for (const m of notes) {
      setSeed(11 + (m ?? 0)); const n = Math.round(((hold ?? 1.2) + 0.9) * SR), bufs = { k: { L: new Float32Array(n), R: new Float32Array(n) } };
      note(bufs, 'k', o.src || id, m, 0.002, { dur: hold ?? 1.2, rel: 0.35, vel: 0.75, ...(o.filter ? { filter: o.filter } : {}), ...(o.trim ? { trim: true } : {}) });
      const L = bufs.k.L, R = bufs.k.R; let end = n; while (end > SR * 0.1 && Math.abs(L[end - 1]) < 1e-4 && Math.abs(R[end - 1]) < 1e-4) end--;
      // even loudness across the kit (the samples' own layers differ by up to 20 dB): a held note to a set loudness over
      // its first 0.6 s, a drum to a set peak, never past a peak of 0.7
      let ss = 0, pk = 1e-6; const win = Math.min(end, Math.round(SR * 0.6));
      for (let i = 0; i < end; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > pk) pk = v; if (i < win) ss += (L[i] * L[i] + R[i] * R[i]) / 2; }
      const g = Math.min(0.7 / pk, lo == null ? 0.32 / pk : 0.07 / Math.sqrt(ss / win));
      for (let i = 0; i < end; i += 97) h = Math.imul(h ^ Math.round(L[i] * g * 1e5), 16777619);   // (a version stamp for the files' addresses)
      writeWav(join(dir, `${id}_${m ?? 'hit'}.wav`), L.slice(0, end).map(v => v * g), R.slice(0, end).map(v => v * g), SR);
    }
    man[id].v = (h >>> 0).toString(36);
  }
  writeFileSync(join(dir, 'kit.json'), JSON.stringify(man, null, 1));
  console.log(`kit: ${Object.keys(man).length} instruments, ${Object.values(man).reduce((a, i) => a + Math.max(1, i.notes.length), 0)} notes`);
  process.exit(0);
}
const names = process.argv.slice(2).length ? process.argv.slice(2) : [...Object.keys(classic.TRACKS), ...groupNames()];
const all = existsSync(join(OUT, 'tracks.json')) ? JSON.parse(readFileSync(join(OUT, 'tracks.json'), 'utf8')) : {};
for (const n of names) {
  const t0 = Date.now(), def = classic.TRACKS[n] ? null : await groupTrack(n);
  all[n] = def ? renderTrack(def) : classic.render(n);
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (LOG) { console.log(LOG.out.sort().join('\n')); LOG.out.length = 0; }
  if (AUDIT) { clashReport(def ? def.bpm : classic.TRACKS[n].bpm); AUDIT.length = 0; }
}
function clashReport(bpm) {
  const sp = 60 / bpm / 4, end = Math.max(...AUDIT.map(a => a.t)), bars = {}, nm = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let t = 0; t < end; t += sp) {
    const on = AUDIT.filter(a => a.t <= t + 0.001 && a.end > t + 0.1 && a.v > 0.2);   // (a fading tail under 0.1 s into the next chord is a crossfade, not a clash)
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
      const d = Math.abs(on[i].midi - on[j].midi);
      if ((d === 1 || d === 13) && on[i].who !== on[j].who) { const b = Math.floor(t / (sp * 16)); (bars[b] = bars[b] || new Set()).add(`${nm[on[i].midi % 12]}${Math.floor(on[i].midi / 12) - 1}(${on[i].who}) vs ${nm[on[j].midi % 12]}${Math.floor(on[j].midi / 12) - 1}(${on[j].who})`); }
    }
  }
  const keys = Object.keys(bars);
  console.log(`clashes (semitone / minor ninth, different parts) in ${keys.length} of ${Math.ceil(end / (sp * 16))} bars`);
  for (const b of keys) console.log(`  bar ${+b + 1}: ${[...bars[b]].slice(0, 4).join(' · ')}${bars[b].size > 4 ? ` (+${bars[b].size - 4})` : ''}`);
}
writeFileSync(join(OUT, 'tracks.json'), JSON.stringify(all, null, 1));
