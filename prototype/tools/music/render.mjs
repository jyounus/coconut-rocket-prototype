// Coconut Rocket music renderer: plays the score on real recorded instruments (the VSCO 2 Community Edition library,
// CC0) and writes each track as a seamless loop plus its stems, ready to encode for the game.
//
//   node render.mjs [track ...]        (default: every track)
//
// Samples: ../../../music-samples (downloaded from github.com/sgossner/VSCO-2-CE, not committed). Output: out/<track>.wav,
// out/<track>-<stem>.wav and out/tracks.json (tempo, loop points, sections). encode.sh turns them into .m4a for the game.
//
// How a track is made: the score (a form of sections, one chord per bar, tunes as phrase tables, the 3-3-2 drive) is
// turned into note events for each instrument; each event picks the nearest recorded note, the right loudness layer
// and a round-robin take, pitch-shifts it, shapes it (attack, release) and pans it into its stem. The stems share an
// algorithmic hall; the master is levelled with fixed gains (so every track matches) and a soft limiter. The loop wraps
// its own tail (the reverb and any ringing notes past the loop end) back onto the loop start, so it repeats seamlessly.
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav, writeWav } from './wav.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = join(HERE, '../../../music-samples');
const OUT = join(HERE, 'out');
const SR = 44100;

// ---------- the sample library ----------
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// VSCO names its notes an octave low (its 'A2' sounds A3, 220 Hz: checked with pitch.mjs), hence the +2.
const nameToMidi = (n, oct) => (oct + 2) * 12 + NOTE[n];
const DYN = { pppp: 0, ppp: 1, pp: 2, p: 3, mp: 4, mf: 5, f: 6, ff: 7, fff: 8 };
// instruments: a folder, how to read a file name (pitch, loudness layer), a level and how long a sample may play
const INSTR = {
  vlnSus: { dir: 'Strings/Violin Section/susVib', gain: 0.55 },
  vlaSus: { dir: 'Strings/Viola Section/susvib', gain: 0.5 },
  vcSus: { dir: 'Strings/Cello Section/susvib', gain: 0.5 },
  cbSus: { dir: 'Strings/Solo Contrabass/SusVib', gain: 0.55 },
  vlnSpic: { dir: 'Strings/Violin Section/Spic', gain: 0.6 },
  vlaSpic: { dir: 'Strings/Viola Section/spic', gain: 0.6 },
  vcSpic: { dir: 'Strings/Cello Section/spic', gain: 0.6 },
  cbSpic: { dir: 'Strings/Solo Contrabass/Spic', gain: 0.7 },
  hnSus: { dir: 'Brass/F Horn/sus', gain: 0.55 },
  hnStac: { dir: 'Brass/F Horn/stac', gain: 0.55 },
  tbnSus: { dir: 'Brass/Tenor Trombone/sus', gain: 0.45 },
  tbnStac: { dir: 'Brass/Tenor Trombone/stac', gain: 0.5 },
  tptSus: { dir: 'Brass/Trumpet/sus', gain: 0.4 },
  tptStac: { dir: 'Brass/Trumpet/stac', gain: 0.45 },
  tubaSus: { dir: 'Brass/Tuba/sus', gain: 0.5 },
  flute: { dir: 'Woodwinds/Flute/susvib', gain: 0.45 },
  marimba: { dir: 'Percussion/Marimba', gain: 0.5 },
  // unpitched: a list of files per kind, chosen by loudness
  timp: { dir: 'Percussion/Timpani', unpitched: true, gain: 0.8 },
  timpRoll: { dir: 'Percussion/Timpani/Rolls', unpitched: true, gain: 0.7 },
  bdrum: { dir: 'VSCO 1 Percussion/drums/bass', unpitched: true, gain: 0.9 },
  snare: { dir: 'VSCO 1 Percussion/drums/snare/drum1', unpitched: true, gain: 0.45 },
  tenorLo: { dir: 'VSCO 1 Percussion/drums/tenor/tenor_lower', unpitched: true, gain: 0.6 },
  tenorHi: { dir: 'VSCO 1 Percussion/drums/tenor/tenor_higher', unpitched: true, gain: 0.55 },
  cym: { dir: 'VSCO 1 Percussion/varMetal/Cymbals/susp', unpitched: true, gain: 0.45 },
  log: { dir: 'VSCO 1 Percussion/varWood/log_drum', unpitched: true, gain: 0.45 },
  shaker: { dir: "VSCO 1 Percussion/varWood/Camo's Shaker", unpitched: true, gain: 0.3 },
};
const FILES = {};   // instrument -> [{ file, midi, layer, take, tag }]
function index(id) {
  if (FILES[id]) return FILES[id];
  const I = INSTR[id], dir = join(LIB, I.dir), out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.wav')) continue;
    const tag = f.replace(/\.wav$/, '');
    if (I.unpitched) { const dyn = (tag.match(/_(pppp|ppp|pp|p|mp|mf|ff|fff|f)(?:_|$)/) || [])[1]; out.push({ file: join(dir, f), midi: null, layer: dyn != null ? DYN[dyn] : (tag.match(/_v(\d)/) || [])[1] * 1 || 4, tag }); continue; }
    const m = tag.match(/_([A-G]#?)(-?\d)(?:_|$)/); if (!m) continue;
    const v = tag.match(/_v(\d+)/) || tag.match(/_(loud|soft|med)/);
    const layer = v ? (v[1] === 'loud' ? 3 : v[1] === 'soft' ? 1 : v[1] === 'med' ? 2 : +v[1]) : 1;
    out.push({ file: join(dir, f), midi: nameToMidi(m[1], +m[2]), layer, tag });
  }
  if (!out.length) throw new Error(`no samples for ${id} in ${dir}`);
  return (FILES[id] = out);
}
const CACHE = new Map();
function load(s) {
  let d = CACHE.get(s.file);
  if (!d) { d = readWav(s.file); if (d.rate !== SR) throw new Error(`${s.file}: ${d.rate} Hz`); CACHE.set(s.file, d); }
  return d;
}
// deterministic randomness, so a render is repeatable
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// pick a sample: nearest pitch (then the loudness layer nearest vel, 0..1, then any take at random)
function pick(id, midi, vel, filter) {
  let list = index(id); if (filter) list = list.filter(s => filter.test(s.tag)); if (!list.length) throw new Error(`${id}: nothing matches ${filter}`);
  if (midi != null) { const best = Math.min(...list.map(s => Math.abs(s.midi - midi))); list = list.filter(s => Math.abs(s.midi - midi) === best); }
  const layers = [...new Set(list.map(s => s.layer))].sort((a, b) => a - b), want = layers[Math.round(vel * (layers.length - 1))];
  const takes = list.filter(s => s.layer === want);
  return takes[Math.floor(rnd() * takes.length)];
}

// ---------- the mixer: stems of stereo float buffers, a shared hall ----------
const STEMS = ['strings', 'brass', 'perc', 'winds'];
const SEND = { strings: 0.32, brass: 0.28, perc: 0.2, winds: 0.38 };
const LEVEL = { strings: 1, brass: 0.95, perc: 0.9, winds: 0.9 };
function stemBufs(n) { const o = {}; for (const k of STEMS) o[k] = { L: new Float32Array(n), R: new Float32Array(n) }; return o; }
// play one note into a stem. opts: dur (s), vel 0..1, pan -1..1, gain, att (s), rel (s), tune (cents), filter (a
// RegExp on the file name), maxLen (s)
function note(bufs, stem, id, midi, t, o = {}) {
  const s = pick(id, midi, o.vel ?? 0.7, o.filter), d = load(s), I = INSTR[id];
  const ratio = (midi != null ? Math.pow(2, (midi - s.midi) / 12) : 1) * Math.pow(2, (o.tune || 0) / 1200);
  const dur = o.dur ?? 10, rel = o.rel ?? 0.25, att = o.att ?? 0.004;
  const len = Math.min(Math.floor((d.L.length - 2) / ratio), Math.floor((dur + rel) * SR), Math.floor((o.maxLen ?? 30) * SR));
  const g = (I.gain ?? 0.5) * (o.gain ?? 1) * (0.35 + 0.65 * (o.vel ?? 0.7)), pan = o.pan ?? 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2 * g, gr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2 * g;
  const B = bufs[stem], i0 = Math.round(t * SR), relStart = dur * SR, relLen = rel * SR, attLen = Math.max(1, att * SR);
  for (let i = 0; i < len; i++) {
    const j = i0 + i; if (j < 0) continue; if (j >= B.L.length) break;
    const p = i * ratio, k = p | 0, f = p - k;
    let e = i < attLen ? i / attLen : 1;
    if (i > relStart) e *= Math.max(0, 1 - (i - relStart) / relLen);
    const l = d.L[k] + (d.L[k + 1] - d.L[k]) * f, r = d.R[k] + (d.R[k + 1] - d.R[k]) * f;
    B.L[j] += l * gl * e; B.R[j] += r * gr * e;
  }
}
// a reversed sample (a cymbal roll played backwards: the swell into a big downbeat), ending exactly at tEnd
function reversed(bufs, stem, id, filter, tEnd, o = {}) {
  const s = pick(id, null, o.vel ?? 0.8, filter), d = load(s), g = (INSTR[id].gain ?? 0.5) * (o.gain ?? 1);
  const len = Math.min(d.L.length, Math.floor((o.len ?? 3) * SR)), B = bufs[stem], i0 = Math.round(tEnd * SR) - len;
  for (let i = 0; i < len; i++) { const j = i0 + i; if (j < 0 || j >= B.L.length) continue; const k = len - 1 - i, e = i < 2000 ? i / 2000 : 1; B.L[j] += d.L[k] * g * e; B.R[j] += d.R[k] * g * e; }
}
// a 12 dB/octave Butterworth high-pass, in place
function highpass(x, fc) {
  const w = 2 * Math.PI * fc / SR, cs = Math.cos(w), al = Math.sin(w) / Math.SQRT2, a0 = 1 + al;
  const b0 = (1 + cs) / 2 / a0, b1 = -(1 + cs) / a0, b2 = b0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
}
// Freeverb: eight damped combs and four all-passes per side (the right side spread), the classic algorithmic hall
function freeverb(inL, inR, room = 0.86, damp = 0.32) {
  const n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n), scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225], spread = 23;
  const side = (input, out, off) => {
    const combs = combT.map(t => ({ b: new Float32Array(Math.round((t + off) * scale)), i: 0, f: 0 })), aps = apT.map(t => ({ b: new Float32Array(Math.round((t + off) * scale)), i: 0 }));
    for (let s = 0; s < n; s++) {
      const x = input[s] * 0.015; let y = 0;
      for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; if (++c.i >= c.b.length) c.i = 0; y += o; }
      for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; if (++a.i >= a.b.length) a.i = 0; y = o - y; }
      out[s] = y;
    }
  };
  side(inL, outL, 0); side(inR, outR, spread);
  return { L: outL, R: outR };
}

// ---------- the score ----------
const ph = (...bars) => bars.map(b => Object.fromEntries(b.map(([s, m, l = 2]) => [s, [m, l]])));
// chords: bass root, string voicing (cellos, violas, violins), the brass section's
const EC = {
  Dm: { r: 38, s: [50, 57, 62, 65, 69], br: [62, 65, 69] },
  Bb: { r: 34, s: [46, 53, 58, 62, 65], br: [58, 62, 65] },
  F:  { r: 41, s: [53, 57, 60, 65, 69], br: [60, 65, 69] },
  C:  { r: 36, s: [48, 55, 60, 64, 67], br: [60, 64, 67] },
  Gm: { r: 43, s: [43, 55, 58, 62, 67], br: [58, 62, 67] },
  Eb: { r: 39, s: [51, 55, 58, 63, 67], br: [58, 63, 67] },
  A:  { r: 45, s: [45, 57, 61, 64, 69], br: [57, 61, 64] },
};
const SEC = {
  intro:  { ch: ['Dm', 'Dm', 'Bb', 'A'] },
  A:      { ch: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'] },
  B:      { ch: ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'C', 'A'] },
  climax: { ch: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'], up: 2 },
  break:  { ch: ['Dm', 'Bb', 'Gm', 'A'] },
  build:  { ch: ['Gm', 'Bb', 'C', 'A'] },
};
const THEME_A = ph([[0, 74, 6], [6, 72, 2], [8, 74, 2], [10, 76, 2], [12, 77, 4]], [[0, 74, 8], [8, 70, 4], [12, 72, 4]], [[0, 72, 6], [6, 69, 2], [8, 72, 2], [10, 74, 2], [12, 76, 4]], [[0, 72, 8], [8, 67, 8]],
                   [[0, 74, 6], [6, 72, 2], [8, 74, 2], [10, 76, 2], [12, 77, 4]], [[0, 79, 6], [6, 77, 2], [8, 74, 4], [12, 77, 4]], [[0, 79, 4], [4, 77, 4], [8, 74, 4], [12, 72, 4]], [[0, 73, 8], [8, 76, 4], [12, 81, 4]]);
const THEME_B = ph([[0, 79, 8], [8, 82, 8]], [[0, 82, 4], [4, 79, 4], [8, 75, 8]], [[0, 77, 8], [8, 82, 8]], [[0, 81, 12], [12, 77, 4]],
                   [[0, 79, 8], [8, 82, 8]], [[0, 84, 6], [6, 82, 2], [8, 79, 8]], [[0, 79, 4], [4, 81, 4], [8, 84, 8]], [[0, 85, 16]]);
const CALL = ph([[0, 62, 6], [6, 69, 2], [8, 74, 8]], [[0, 72, 4], [4, 69, 4], [8, 74, 8]], [[0, 70, 6], [6, 74, 2], [8, 77, 8]], [[0, 76, 8], [8, 73, 8]]);
const ACC = [1, 0.45, 0.55, 0.9, 0.45, 0.55, 0.95, 0.5, 1, 0.45, 0.55, 0.9, 0.45, 0.55, 0.95, 0.6];
const OSTN = [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 7, 0, 12, 7];
const DMIN = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81, 82, 84];
// the tracks: form, tempo, transposition, which layers play (0 drops one), where the loop restarts and where a track
// joins when it follows another run track (both in bars)
const TRACKS = {
  menu:   { bpm: 104, tr: 0, form: [['intro', 4], ['A', 8], ['break', 4]], loop: 0, join: 0, k: { drums: 0.35, stabs: 0, lowBrass: 0, swell: 0, spic: 0.7 } },
  jungle: { bpm: 120, tr: 0, form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4, k: {} },
  caves:  { bpm: 112, tr: -2, form: [['intro', 4], ['A', 8], ['B', 8], ['break', 4], ['build', 4]], loop: 4, join: 4, k: { drums: 0.75, stabs: 0.6 } },
  magma:  { bpm: 132, tr: 1, form: [['B', 8], ['climax', 8], ['build', 4]], loop: 0, join: 0, k: { drums: 1.15 } },
};
function render(name) {
  const T = TRACKS[name], sp = 60 / T.bpm / 4, bar = sp * 16, map = [];
  for (const [sec, n] of T.form) for (let i = 0; i < n; i++) map.push({ sec, i, n, ch: SEC[sec].ch[i % SEC[sec].ch.length] });
  const loopStart = T.loop * bar, loopEnd = map.length * bar, tail = 5, total = loopEnd + tail, N = Math.ceil(total * SR);
  const bufs = stemBufs(N), K = { drums: 1, stabs: 1, lowBrass: 1, swell: 1, spic: 1, ...T.k };
  seed = 12345;
  map.forEach((B, b) => {
    const next = map[(b + 1) % map.length], sec = B.sec, up = (SEC[sec].up || 0) + T.tr, C = EC[B.ch], root = C.r + up, X = m => m + up;
    const t0 = b * bar, big = sec === 'climax', lift = sec === 'B' || big, calm = sec === 'break', last = B.i === B.n - 1, intoNew = last && next.sec !== sec;
    const D = K.drums;
    // the string section: a sustained chord across the bar, cellos / violas / violins, swelling in
    const sv = { intro: 0.35 + 0.08 * B.i, A: 0.45, B: 0.6, climax: 0.8, break: 0.35, build: 0.35 + 0.1 * B.i }[sec];
    const [c1, c2, c3, c4, c5] = C.s.map(X);
    note(bufs, 'strings', 'vcSus', c1, t0, { dur: bar + 0.05, vel: sv, pan: -0.45, att: 0.08, rel: 0.6 });
    note(bufs, 'strings', 'vlaSus', c2, t0, { dur: bar + 0.05, vel: sv, pan: -0.15, att: 0.08, rel: 0.6 });
    note(bufs, 'strings', 'vlaSus', c3, t0, { dur: bar + 0.05, vel: sv * 0.9, pan: 0.05, att: 0.08, rel: 0.6 });
    note(bufs, 'strings', 'vlnSus', c4, t0, { dur: bar + 0.05, vel: sv * 0.9, pan: 0.3, att: 0.08, rel: 0.6 });
    if (lift || calm) note(bufs, 'strings', 'vlnSus', c5, t0, { dur: bar + 0.05, vel: sv * 0.85, pan: 0.5, att: 0.1, rel: 0.6 });
    if (big) note(bufs, 'strings', 'vlnSus', c5 + 12, t0, { dur: bar + 0.05, vel: 0.65, pan: 0.6, att: 0.1, rel: 0.6 });
    // low strings and low brass under the lift and the climax (and the end of the build)
    if (lift || (sec === 'build' && B.i >= 2)) {
      note(bufs, 'strings', 'cbSus', root, t0, { dur: bar + 0.05, vel: big ? 0.8 : 0.65, pan: -0.2, att: 0.06, rel: 0.5 });
      if (K.lowBrass) { note(bufs, 'brass', 'tbnSus', root + 12, t0, { dur: bar * 0.94, vel: big ? 0.75 : 0.6, pan: 0.2, att: 0.1, rel: 0.4, gain: K.lowBrass });
        note(bufs, 'brass', 'tbnSus', root + 19, t0, { dur: bar * 0.94, vel: big ? 0.7 : 0.55, pan: 0.3, att: 0.1, rel: 0.4, gain: K.lowBrass });
        note(bufs, 'brass', 'tubaSus', root, t0, { dur: bar * 0.94, vel: big ? 0.75 : 0.6, pan: 0.1, att: 0.1, rel: 0.4, gain: K.lowBrass }); }
    }
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * sp, a = ACC[s];
      // the drive: spiccato strings on the 3-3-2 (violas and cellos; violins an octave up when it lifts)
      if (!calm && K.spic) {
        const lv = (sec === 'intro' ? 0.35 + 0.12 * B.i : sec === 'build' ? 0.4 + 0.12 * B.i : big ? 0.85 : lift ? 0.75 : 0.62) * a * K.spic;
        note(bufs, 'strings', 'vcSpic', X(C.r + 12 + OSTN[s]), t, { dur: sp * 0.9, vel: lv, pan: -0.35, rel: 0.08 });
        if (sec !== 'intro' || B.i >= 2) note(bufs, 'strings', 'vlaSpic', X(C.r + 24 + OSTN[s]), t, { dur: sp * 0.9, vel: lv * 0.85, pan: 0.15, rel: 0.08 });
        if (lift && s % 2 === 0) note(bufs, 'strings', 'vlnSpic', X(C.r + 36 + OSTN[s]), t, { dur: sp * 0.9, vel: lv * 0.7, pan: 0.45, rel: 0.08 });
      }
      // the bass: contrabass on the accents (pumping octaves at the climax)
      if (!calm && (big ? s % 2 === 0 : a > 0.85)) note(bufs, 'strings', 'cbSpic', big && s % 4 === 2 ? root + 12 : root, t, { dur: sp * 1.5, vel: (big ? 0.85 : 0.7) * a, pan: -0.1, rel: 0.12 });
      // brass stabs on the 3-3-2 (trumpets, horns, trombones) when it lifts
      if (K.stabs && lift && (s === 0 || s === 3 || s === 6 || (big && (s === 10 || s === 14)))) {
        const v = (big ? 0.85 : 0.7) * a * K.stabs;
        C.br.forEach((m, i) => { note(bufs, 'brass', 'tptStac', X(m) + 12, t, { vel: v, pan: 0.25 - i * 0.1, dur: 0.25, rel: 0.15 }); note(bufs, 'brass', 'hnStac', X(m), t, { vel: v, pan: -0.25 + i * 0.1, dur: 0.25, rel: 0.15 }); });
        note(bufs, 'brass', 'tbnStac', root + 12, t, { vel: v, pan: 0.1, dur: 0.25, rel: 0.15 });
      }
      // the tunes
      const tune = (sec === 'intro' || calm) ? CALL[B.i][s] : (sec === 'A' || big) ? THEME_A[B.i][s] : sec === 'B' ? THEME_B[B.i][s] : null;
      if (tune) {
        const [m, len] = tune, dur = len * sp * 0.98;
        if (sec === 'intro' || calm) {
          if (calm) note(bufs, 'winds', 'flute', X(m) + 12, t, { dur, vel: 0.55, pan: 0.2, att: 0.05, rel: 0.4 });
          note(bufs, 'brass', 'hnSus', X(m), t, { dur, vel: calm ? 0.45 : 0.65, pan: -0.2, att: 0.04, rel: 0.35 });
        } else if (sec === 'B') {
          note(bufs, 'strings', 'vlnSus', m + T.tr, t, { dur, vel: 0.8, pan: 0.2, att: 0.05, rel: 0.4 });
          note(bufs, 'strings', 'vlnSus', m + T.tr, t, { dur, vel: 0.7, pan: 0.35, att: 0.05, rel: 0.4, tune: 7 });
          note(bufs, 'brass', 'hnSus', m + T.tr - 12, t, { dur, vel: 0.75, pan: -0.25, att: 0.04, rel: 0.35 });
        } else {
          // the horn section (two players, a hair apart) with violins an octave up; trumpets join at the climax
          note(bufs, 'brass', 'hnSus', X(m), t, { dur, vel: big ? 0.85 : 0.72, pan: -0.25, att: 0.03, rel: 0.35 });
          note(bufs, 'brass', 'hnSus', X(m), t + 0.012, { dur, vel: big ? 0.8 : 0.66, pan: -0.05, att: 0.03, rel: 0.35, tune: -6 });
          note(bufs, 'strings', 'vlnSus', X(m) + 12, t, { dur, vel: big ? 0.8 : 0.6, pan: 0.3, att: 0.05, rel: 0.4 });
          if (big) { note(bufs, 'brass', 'tptSus', X(m), t, { dur, vel: 0.7, pan: 0.15, att: 0.03, rel: 0.3 }); note(bufs, 'brass', 'hnSus', X(m) - 12, t, { dur, vel: 0.7, pan: 0.1, att: 0.04, rel: 0.35 }); }
        }
      }
      // percussion
      if (D) {
        // taiko-like: the big bass drum and tenor drums on the 3-3-2
        const tk = (sec === 'intro' ? 0.45 + 0.1 * B.i : big ? 1 : sec === 'B' ? 0.85 : sec === 'build' ? 0.45 + 0.13 * B.i : 0.7) * D;
        if (!calm) {
          if (s === 0 || s === 6) note(bufs, 'perc', 'bdrum', null, t, { vel: Math.min(1, tk), pan: 0, filter: /^bdrum(3)?_(p|mp|f|ff|fff)_/, dur: 2.5, rel: 0.5, gain: 0.9 });
          if (s === 3 || s === 11 || (s === 8 && sec !== 'intro')) note(bufs, 'perc', 'tenorLo', null, t, { vel: Math.min(1, tk * 0.8), pan: s === 3 ? -0.3 : 0.3, dur: 1, rel: 0.3 });
          if (s === 0) note(bufs, 'perc', 'timp', null, t, { vel: big ? 0.9 : 0.6, pan: -0.15, filter: /Timpani[12]_Hit/, dur: 2.5, rel: 0.6, gain: 0.8 * D });
        } else if (s === 0 || s === 3) note(bufs, 'perc', 'bdrum', null, t, { vel: s ? 0.25 : 0.4, filter: /^bdrum_(ppp|pp|p)_/, dur: 2, rel: 0.4 });
        if (lift && (s === 4 || s === 12)) note(bufs, 'perc', 'snare', null, t, { vel: big ? 0.8 : 0.6, pan: 0.1, filter: /^snare1_(mp|f|ff|fff)_/, dur: 1, rel: 0.2, gain: D });
        if (big && B.i % 4 === 3 && s >= 12) note(bufs, 'perc', s % 2 ? 'tenorLo' : 'tenorHi', null, t, { vel: 0.8, pan: (s - 13.5) * 0.25, dur: 0.8, rel: 0.2, gain: D });
        // crashes on the big downbeats, a reversed cymbal roll swelling into them
        if (s === 0 && B.i === 0 && (lift || sec === 'A')) { note(bufs, 'perc', 'cym', null, t, { vel: 0.9, pan: 0.3, filter: /hit_(hardmall|metal_2)_(ff|fff)/, dur: 4, rel: 1, gain: big ? 1 : 0.7 }); if (lift) note(bufs, 'perc', 'bdrum', null, t, { vel: 1, filter: /^bdrum_fff_/, dur: 3, rel: 0.6, gain: 1.1 }); }
        if (s === 0 && intoNew && (sec === 'A' || sec === 'B' || sec === 'intro' || sec === 'build') && K.swell) reversed(bufs, 'perc', 'cym', /softmall_roll(2_cresc|3_ff)/, t0 + bar, { len: bar * (sec === 'build' ? 1 : 0.75), gain: 0.8 });
        // rolls into the next section: timpani out of the intro and the build, snare and a string run out of the theme
        if (s === 8 && intoNew && (sec === 'intro' || sec === 'build')) note(bufs, 'perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: sp * 8, rel: 0.05, gain: 0.8 });
        if (s === 8 && intoNew && (sec === 'A' || sec === 'B')) {
          for (let i = 0; i < 16; i++) note(bufs, 'perc', 'snare', null, t + i * sp / 2, { vel: 0.3 + 0.5 * i / 16, pan: 0.1, filter: /^snare1_(p|mp|f)_/, dur: 0.3, rel: 0.1 });
          DMIN.slice(sec === 'B' ? 4 : 0, (sec === 'B' ? 4 : 0) + 8).forEach((m, i) => note(bufs, 'strings', 'vlnSpic', X(m), t + i * sp, { vel: 0.55 + 0.04 * i, pan: 0.3, dur: sp, rel: 0.06 }));
        }
        if (sec === 'build' && B.i === 0 && s === 0) for (let i = 0; i < 64 * 2; i++) note(bufs, 'perc', 'snare', null, t + i * sp / 2, { vel: 0.15 + 0.7 * (i / 128) ** 1.4, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.25, rel: 0.08 });
        // the jungle under it: log drum and shaker
        if (!calm && (s === 6 || s === 14)) note(bufs, 'perc', 'log', null, t, { vel: 0.6, pan: -0.4, filter: s === 6 ? /slitdrum1_(mp|ff)/ : /slitdrum2_(mp|ff)/, dur: 0.6, rel: 0.1 });
        if (!calm && (sec !== 'intro' || B.i >= 1)) note(bufs, 'perc', 'shaker', null, t, { vel: s % 2 ? 0.7 : 0.4, pan: 0.5, dur: 0.3, rel: 0.05, gain: s % 2 ? 0.8 : 0.5 });
      }
    }
  });
  // a 40 Hz high-pass on every stem (the lowest note scored is 58 Hz): layered samples build up room rumble below that
  for (const k of STEMS) { highpass(bufs[k].L, 40); highpass(bufs[k].R, 40); }
  // the hall: every stem's send summed and reverberated, then the loop's tail wrapped onto its start
  const sendL = new Float32Array(N), sendR = new Float32Array(N);
  for (const k of STEMS) { const B = bufs[k], a = SEND[k]; for (let i = 0; i < N; i++) { sendL[i] += B.L[i] * a; sendR[i] += B.R[i] * a; } }
  const hall = freeverb(sendL, sendR);
  const L = Math.round(loopEnd * SR), LS = Math.round(loopStart * SR), wrap = (A) => { const out = A.slice(0, L); for (let i = L; i < A.length && LS + i - L < L; i++) out[LS + i - L] += A[i]; return out; };
  // the master: fixed levels (so tracks match), the hall shared out across the stems in proportion to their sends
  const MASTER = 0.55, stems = {}, mixL = new Float32Array(L), mixR = new Float32Array(L);
  const sendTot = STEMS.reduce((a, k) => a + SEND[k], 0);
  for (const k of STEMS) {
    const B = bufs[k], share = SEND[k] / sendTot, sL = new Float32Array(N), sR = new Float32Array(N);
    for (let i = 0; i < N; i++) { sL[i] = (B.L[i] * LEVEL[k] + hall.L[i] * 0.9 * share) * MASTER; sR[i] = (B.R[i] * LEVEL[k] + hall.R[i] * 0.9 * share) * MASTER; }
    const wl = wrap(sL), wr = wrap(sR); stems[k] = { L: wl, R: wr };
    for (let i = 0; i < L; i++) { mixL[i] += wl[i]; mixR[i] += wr[i]; }
  }
  // a soft limiter: transparent below 0.7, rounding peaks off above it (applied the same way to the stems)
  const lim = x => { const a = Math.abs(x); return a < 0.7 ? x : Math.sign(x) * (0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28)); };
  let peak = 0, sum = 0;
  for (let i = 0; i < L; i++) { peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i])); mixL[i] = lim(mixL[i]); mixR[i] = lim(mixR[i]); sum += mixL[i] * mixL[i] + mixR[i] * mixR[i]; }
  for (const k of STEMS) { const S = stems[k]; for (let i = 0; i < L; i++) { S.L[i] = lim(S.L[i]); S.R[i] = lim(S.R[i]); } }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeWav(join(OUT, `${name}.wav`), mixL, mixR, SR);
  for (const k of STEMS) writeWav(join(OUT, `${name}-${k}.wav`), stems[k].L, stems[k].R, SR);
  // sections for the music lab: name, start (s)
  const sections = []; map.forEach((B, b) => { if (B.i === 0) sections.push({ name: B.sec, at: +(b * bar).toFixed(4) }); });
  const info = { bpm: T.bpm, bars: map.length, loopStart: +loopStart.toFixed(4), loopEnd: +loopEnd.toFixed(4), join: +(T.join * bar).toFixed(4), sections, stems: STEMS };
  console.log(`${name}: ${loopEnd.toFixed(1)} s, loop from ${loopStart.toFixed(1)} s, pre-limit peak ${peak.toFixed(2)}, RMS ${(10 * Math.log10(sum / (2 * L))).toFixed(1)} dBFS`);
  return info;
}
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TRACKS);
const all = existsSync(join(OUT, 'tracks.json')) ? JSON.parse((await import('node:fs')).readFileSync(join(OUT, 'tracks.json'), 'utf8')) : {};
for (const n of names) { const t0 = Date.now(); all[n] = render(n); console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
writeFileSync(join(OUT, 'tracks.json'), JSON.stringify(all, null, 1));
