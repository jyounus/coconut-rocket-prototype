// Coconut Rocket music: the shared engine every track's score uses (tracks/*.mjs). The sample library and how a note is
// played on it, the mixer (stems, halls, the seamless loop, the limiter, the files and tracks.json entry), and the
// composing helpers new tracks share (chords and voicings, scales, grooves, fills, swells).
//
// A note: each event picks the nearest recorded note, the right loudness layer and a round-robin take, pitch-shifts it,
// shapes it (attack, release) and pans it into its stem. The stems each get an algorithmic hall; the master is levelled
// with fixed gains (so every track matches) and a soft limiter. The loop wraps its own tail (the reverb and any ringing
// notes past the loop end) back onto the loop start, so it repeats seamlessly.
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav, writeWav } from './wav.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LIB = join(HERE, '../../../music-samples');
export const OUT = join(HERE, 'out');
export const SR = 44100;

// ---------- the sample library ----------
export const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// VSCO names its notes an octave low (its 'A2' sounds A3, 220 Hz: checked with pitch.mjs), hence the +2; the upright
// piano is the exception (its C4 is middle C), so an instrument can say otherwise (oct).
export const nameToMidi = (n, oct, base = 2) => (oct + base) * 12 + NOTE[n];
export const DYN = { pppp: 0, ppp: 1, pp: 2, p: 3, mp: 4, mf: 5, f: 6, ff: 7, fff: 8 };
// instruments: a folder, how to read a file name (pitch, loudness layer), a level and how long a sample may play.
// (the first block is the classic score's: leave those as they are, the existing tracks are rendered from them)
export const INSTR = {
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
  piano: { dir: 'Keys/Upright Nr1', gain: 0.62, oct: 1 },   // (sampled on C and G at pp, mf and f)
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

  // ---- added for the mood-group tracks (2026-10-28; all VSCO 2 CE, CC0: see SOURCES.md) ----
  // pitched (a file's note is read from its name; `pitch` overrides the reader for libraries that name notes their own
  // way; gains are set so a mid-velocity note sits near the classic instruments)
  harp: { dir: 'Strings/Harp', gain: 0.75, oct: 1 },                           // KSHarp_A4_mf: every third note, one layer (named at pitch: A4 is 440 Hz)
  vlnPizz: { dir: 'Strings/Violin Section/Pizz', gain: 0.7 },
  vlaPizz: { dir: 'Strings/Viola Section/pizz', gain: 0.7 },
  vcPizz: { dir: 'Strings/Cello Section/pizzT', gain: 0.7 },
  cbPizz: { dir: 'Strings/Solo Contrabass/Pizz', gain: 0.85 },
  vlnTrem: { dir: 'Strings/Violin Section/Trem', gain: 0.45 },
  vcTrem: { dir: 'Strings/Cello Section/trem', gain: 0.45 },
  oboe: { dir: 'Woodwinds/Oboe/Vib', gain: 0.5 },
  oboeSus: { dir: 'Woodwinds/Oboe/Sus', gain: 0.5 },
  oboeStac: { dir: 'Woodwinds/Oboe/Stacc', gain: 0.5 },
  clar: { dir: 'Woodwinds/Clarinet/susLong', gain: 0.5 },
  clarStac: { dir: 'Woodwinds/Clarinet/stac', gain: 0.5 },
  bsn: { dir: 'Woodwinds/Bassoon/sus', gain: 0.5 },
  bsnStac: { dir: 'Woodwinds/Bassoon/stac', gain: 0.55 },
  fluteStac: { dir: 'Woodwinds/Flute/stac', gain: 0.45 },
  picc: { dir: 'Woodwinds/Piccolo/Sus', gain: 0.35 },
  piccStac: { dir: 'Woodwinds/Piccolo/Stac', gain: 0.35 },
  glock: { dir: 'Percussion/Glock', gain: 0.35 },
  xylo: { dir: 'Percussion/Xylo', gain: 0.45 },
  organ: { dir: 'Keys/Organ/Quiet', gain: 0.4, only: /Man3/, pitch: tag => +tag.match(/_(\d+)_rr/)[1] - 86 },      // (files numbered, not named: Man3 122 is C2)
  organPedal: { dir: 'Keys/Organ/Quiet', gain: 0.45, only: /Pedal/, pitch: tag => +tag.match(/_(\d+)_rr/)[1] - 28 },   // (Pedal 064 is C2)
  // unpitched
  bongo: { dir: 'VSCO 1 Percussion/drums/other/Bongos', unpitched: true, gain: 0.5 },          // HighBongo1/2, LowBongo1/2
  conga: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.55, only: /^(Conga|Quinto|Tumba)-/ },   // Conga/Quinto/Tumba -HitN, -Tap1
  ethDrum: { dir: 'VSCO 1 Percussion/drums/other/ethnic/congo/open', unpitched: true, gain: 0.6 },   // ethnicLowOpen / ethnicHighOpen
  ethMute: { dir: 'VSCO 1 Percussion/drums/other/ethnic/congo/muted', unpitched: true, gain: 0.6 },
  bigHand: { dir: 'VSCO 1 Percussion/drums/other/ethnic/giant/hand', unpitched: true, gain: 0.7 },   // a big frame drum played by hand
  bigMallet: { dir: 'VSCO 1 Percussion/drums/other/ethnic/giant/mallet', unpitched: true, gain: 0.7 },
  bigSticks: { dir: 'VSCO 1 Percussion/drums/other/ethnic/giant/sticks', unpitched: true, gain: 0.6 },
  frame: { dir: 'Miscellania Raw/Misc 2', unpitched: true, gain: 0.6, only: /^rtomtom/ },        // rototom frame drum (+ a roll)
  tamb: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.35, only: /^Tamb1-/ },
  tambMisc: { dir: 'Miscellania Raw/Misc 2', unpitched: true, gain: 0.3, only: /^tamb/ },
  fingerCym: { dir: 'VSCO 1 Percussion/varMetal/various', unpitched: true, gain: 0.3, only: /^Fing_Cymb/ },
  agogo: { dir: 'VSCO 1 Percussion/varMetal/various', unpitched: true, gain: 0.35, only: /^agogo/ },
  cabasa: { dir: 'VSCO 1 Percussion/varMetal/various', unpitched: true, gain: 0.3, only: /^cabasa_\d/ },
  chimes: { dir: 'VSCO 1 Percussion/varMetal/various', unpitched: true, gain: 0.3, only: /^windchimes/ },
  sleigh: { dir: 'VSCO 1 Percussion/varMetal/various', unpitched: true, gain: 0.3, only: /^sleighbell/ },
  cowbell: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.35, only: /^Cowbell1/ },
  claves: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.4, only: /^Claves1/ },
  logHi: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.45, only: /^LogDrumHi/ },
  logLo: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.45, only: /^LogDrumLo/ },
  anvil: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.35, only: /^Anvil/ },
  brake: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.35, only: /^BrakeDrum/ },
  belltree: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.35, only: /^BellTree/ },
  gong: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.5, only: /^gongHit/ },
  tri: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.3, only: /^Triangle6/ },
  crash: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.4, only: /^cymbal-crash1/ },
  clash: { dir: 'VSCO 1 Percussion/varMetal/Cymbals/clash', unpitched: true, gain: 0.4 },
  guiro: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.35, only: /^Guiro/ },
  snare2: { dir: 'Percussion/hand and metal', unpitched: true, gain: 0.4, only: /^Snare2-taps/ },
  nepBells: { dir: 'Miscellania Raw/Misc 2/NepaleseBells', unpitched: true, gain: 0.3 },
  wood: { dir: 'VSCO 1 Percussion/varWood/more', unpitched: true, gain: 0.35 },             // claves, guiro, maraca, tambourine, slapstick, wood clicks, vibraslap, ratchet
  misc: { dir: 'Miscellania Raw/Misc 1', unpitched: true, gain: 0.3 },                      // bubbles, chains, metal hits, glass, sirens, zaps
};
// LOGNOTES=from,to (seconds): list the pitched notes sounding in that window (to find a clash)
export const LOG = process.env.LOGNOTES ? Object.assign(process.env.LOGNOTES.split(',').map(Number), { out: [] }) : null;
// CLASH=1: after a render, list the moments where two pitched notes a semitone apart (or a minor ninth) sound together
export const AUDIT = process.env.CLASH ? [] : null;
const FILES = {};   // instrument -> [{ file, midi, layer, take, tag }]
export function index(id) {
  if (FILES[id]) return FILES[id];
  const I = INSTR[id]; if (!I) throw new Error(`no instrument ${id}`);
  const dir = join(LIB, I.dir), out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.wav')) continue;
    const tag = f.replace(/\.wav$/, '');
    if (I.only && !I.only.test(tag)) continue;
    if (I.unpitched) { const dyn = (tag.match(/_(pppp|ppp|pp|p|mp|mf|ff|fff|f)(?:_|$)/) || [])[1]; out.push({ file: join(dir, f), midi: null, layer: dyn != null ? DYN[dyn] : (tag.match(/_v(\d)/) || [])[1] * 1 || 4, tag }); continue; }
    if (I.pitch) { const midi = I.pitch(tag); if (midi != null) out.push({ file: join(dir, f), midi, layer: 1, tag }); continue; }
    const m = tag.match(/_([A-G]#?)(-?\d)(?:_|$)/); if (!m) continue;
    const v = tag.match(/_v(\d+)/) || tag.match(/_(loud|soft|med)/), dyn = (tag.match(/_(pppp|ppp|pp|p|mp|mf|ff|fff|f)(?:_|$)/i) || [])[1];
    const layer = v ? (v[1] === 'loud' ? 3 : v[1] === 'soft' ? 1 : v[1] === 'med' ? 2 : +v[1]) : dyn ? DYN[dyn.toLowerCase()] : 1;
    out.push({ file: join(dir, f), midi: nameToMidi(m[1], +m[2], I.oct ?? 2), layer, tag });
  }
  if (!out.length) throw new Error(`no samples for ${id} in ${dir}`);
  return (FILES[id] = out);
}
const CACHE = new Map();
export function load(s) {
  let d = CACHE.get(s.file);
  if (!d) { d = readWav(s.file); if (d.rate !== SR) throw new Error(`${s.file}: ${d.rate} Hz`); CACHE.set(s.file, d); }
  return d;
}
// deterministic randomness, so a render is repeatable (each track sets its own seed before it starts)
let seed = 1;
export const setSeed = n => { seed = n; };
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// pick a sample: nearest pitch (then the loudness layer nearest vel, 0..1, then any take at random)
export function pick(id, midi, vel, filter) {
  let list = index(id); if (filter) list = list.filter(s => filter.test(s.tag)); if (!list.length) throw new Error(`${id}: nothing matches ${filter}`);
  if (midi != null) { const best = Math.min(...list.map(s => Math.abs(s.midi - midi))); list = list.filter(s => Math.abs(s.midi - midi) === best); }
  const layers = [...new Set(list.map(s => s.layer))].sort((a, b) => a - b), want = layers[Math.round(Math.max(0, Math.min(1, vel)) * (layers.length - 1))];
  const takes = list.filter(s => s.layer === want);
  return takes[Math.floor(rnd() * takes.length)];
}

// ---------- the mixer: stems of stereo float buffers, each with its hall ----------
// the piano stem plays everything the brass plays (its alternative: a mix has one or the other)
export const STEMS = ['strings', 'brass', 'piano', 'perc', 'winds'];
export const SEND = { strings: 0.32, brass: 0.28, piano: 0.7, perc: 0.2, winds: 0.38 };
export const LEVEL = { strings: 1, brass: 0.95, piano: 0.8, perc: 0.9, winds: 0.9 };
export const MIXES = { brass: ['strings', 'brass', 'perc', 'winds'], piano: ['strings', 'piano', 'perc', 'winds'] };
export function stemBufs(n) { const o = {}; for (const k of STEMS) o[k] = { L: new Float32Array(n), R: new Float32Array(n) }; return o; }
// play one note into a stem. opts: dur (s), vel 0..1, pan -1..1, gain, att (s), rel (s), tune (cents), filter (a
// RegExp on the file name), maxLen (s)
export function note(bufs, stem, id, midi, t, o = {}) {
  if (AUDIT && midi != null && stem !== 'perc' && !o.wet) AUDIT.push({ t, end: t + (o.dur ?? 10) + (o.rel ?? 0.25) * 0.5, midi, who: `${stem}/${id}`, v: o.vel ?? 0.7 });
  if (LOG && midi != null && t < LOG[1] && t + (o.dur ?? 10) + (o.rel ?? 0.25) > LOG[0] && stem !== 'perc') LOG.out.push(`${t.toFixed(3)}–${(t + (o.dur ?? 10)).toFixed(3)} (+${(o.rel ?? 0.25).toFixed(2)} rel) ${stem}/${id} ${midi} ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi % 12]}${Math.floor(midi / 12) - 1} vel ${(o.vel ?? 0.7).toFixed(2)}${o.wet ? ' (shimmer)' : ''}`);
  const s = pick(id, midi, o.vel ?? 0.7, o.filter), d = load(s), I = INSTR[id], k0 = o.trim ? leadIn(s, d) : 0;
  const ratio = (midi != null ? Math.pow(2, (midi - s.midi) / 12) : 1) * Math.pow(2, (o.tune || 0) / 1200);
  const dur = o.dur ?? 10, rel = o.rel ?? 0.25, att = o.att ?? 0.004;
  const len = Math.min(Math.floor((d.L.length - 2 - k0) / ratio), Math.floor((dur + rel) * SR), Math.floor((o.maxLen ?? 30) * SR));
  const g = (I.gain ?? 0.5) * (o.gain ?? 1) * (0.35 + 0.65 * (o.vel ?? 0.7)), pan = o.pan ?? 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2 * g, gr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2 * g;
  const B = bufs[stem], i0 = Math.round(t * SR), relStart = dur * SR, relLen = rel * SR, attLen = Math.max(1, att * SR);
  for (let i = 0; i < len; i++) {
    const j = i0 + i; if (j < 0) continue; if (j >= B.L.length) break;
    const p = k0 + i * ratio, k = p | 0, f = p - k;
    let e = i < attLen ? i / attLen : 1;
    if (i > relStart) e *= Math.max(0, 1 - (i - relStart) / relLen);
    const l = d.L[k] + (d.L[k + 1] - d.L[k]) * f, r = d.R[k] + (d.R[k + 1] - d.R[k]) * f;
    B.L[j] += l * gl * e; B.R[j] += r * gr * e;
  }
}
// The piano's own effects (it sits in front, so it gets its own space): light compression to glue it and lengthen its
// sustain, and a cathedral: a long, wet hall with a 40 ms pre-delay, fed by the piano and its shimmer layer (which
// is heard only through it).
export function compress(L, R, thrDb = -14, ratio = 1.8, attMs = 12, relMs = 220, makeUpDb = 1.5) {
  const thr = Math.pow(10, thrDb / 20), aA = Math.exp(-1 / (SR * attMs / 1000)), aR = Math.exp(-1 / (SR * relMs / 1000)), mu = Math.pow(10, makeUpDb / 20);
  let env = 0;
  for (let i = 0; i < L.length; i++) {
    const x = Math.max(Math.abs(L[i]), Math.abs(R[i])); env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
    const g = env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1; L[i] *= g * mu; R[i] *= g * mu;
  }
}
// a reversed sample (a cymbal roll played backwards: the swell into a big downbeat), ending exactly at tEnd (o.trim: from
// the sample's first sound, not its silent lead-in)
export function reversed(bufs, stem, id, filter, tEnd, o = {}) {
  const s = pick(id, null, o.vel ?? 0.8, filter), d = load(s), g = (INSTR[id].gain ?? 0.5) * (o.gain ?? 1), k0 = o.trim ? leadIn(s, d) : 0;
  const len = Math.min(d.L.length - k0, Math.floor((o.len ?? 3) * SR)), B = bufs[stem], i0 = Math.round(tEnd * SR) - len;
  for (let i = 0; i < len; i++) { const j = i0 + i; if (j < 0 || j >= B.L.length) continue; const k = k0 + len - 1 - i, e = i < 2000 ? i / 2000 : 1; B.L[j] += d.L[k] * g * e; B.R[j] += d.R[k] * g * e; }
}
// where a sample's sound starts: many VSCO files open with up to a tenth of a second of silence (a drum hit would land
// that late). The first sample at 2% of the file's peak, less a millisecond. (The classic score plays files from their
// very start, so its renders stay as they were; the mood-group tracks trim.)
const LEAD = new Map();
export function leadIn(s, d) {
  if (LEAD.has(s.file)) return LEAD.get(s.file);
  let pk = 0; for (let i = 0; i < d.L.length; i++) pk = Math.max(pk, Math.abs(d.L[i]), Math.abs(d.R[i]));
  let i = 0; while (i < d.L.length - 1 && Math.abs(d.L[i]) < pk * 0.02 && Math.abs(d.R[i]) < pk * 0.02) i++;
  const k = Math.max(0, i - Math.round(SR * 0.001)); LEAD.set(s.file, k); return k;
}
// a 12 dB/octave Butterworth high-pass, in place
export function highpass(x, fc) {
  const w = 2 * Math.PI * fc / SR, cs = Math.cos(w), al = Math.sin(w) / Math.SQRT2, a0 = 1 + al;
  const b0 = (1 + cs) / 2 / a0, b1 = -(1 + cs) / a0, b2 = b0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
}
// Freeverb: eight damped combs and four all-passes per side (the right side spread), the classic algorithmic hall
export function freeverb(inL, inR, room = 0.86, damp = 0.32) {
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
// phrase tables: ph([[step, midi, length in 16ths], ...], ...) -> one { step: [midi, length] } per bar
export const ph = (...bars) => bars.map(b => Object.fromEntries(b.map(([s, m, l = 2]) => [s, [m, l]])));

// ---------- the mixdown: halls, the seamless loop, the limiter, the files and the tracks.json entry ----------
// o: name, bufs (stemBufs, plus bufs.pianoWet for the piano's shimmer), N (samples rendered), loopStart and loopEnd (s),
// bpm, bars, sections ([{ name, at }]), join (s), brass (false: the brass stem left silent), send / level (per stem,
// over SEND and LEVEL), room / damp (the stems' hall), extra (more fields for the tracks.json entry).
export function finish(o) {
  const { name, bufs, N, loopStart, loopEnd } = o, SENDS = { ...SEND, ...(o.send || {}) }, LEVELS = { ...LEVEL, ...(o.level || {}) };
  // a 40 Hz high-pass on every stem (the lowest note scored is 58 Hz): layered samples build up room rumble below that
  for (const k of STEMS) { highpass(bufs[k].L, o.hp ?? 40); highpass(bufs[k].R, o.hp ?? 40); }
  // each stem gets its own hall (so a mix can leave a stem out, its reverb with it), then the loop's tail is wrapped
  // onto its start; fixed levels (so tracks match)
  const L = Math.round(loopEnd * SR), LS = Math.round(loopStart * SR), wrap = (A) => { const out = A.slice(0, L); for (let i = L; i < A.length && LS + i - L < L; i++) out[LS + i - L] += A[i]; return out; };
  const MASTER = o.master ?? 0.55, stems = {};
  for (const k of STEMS) {
    const B = bufs[k], a = SENDS[k];
    if (k === 'piano') compress(B.L, B.R);
    const W = bufs.pianoWet || { piano: { L: new Float32Array(N), R: new Float32Array(N) } }, pre = k === 'piano' ? Math.round(0.04 * SR) : 0, wet = (A, S) => { const o2 = new Float32Array(N); for (let i = pre; i < N; i++) o2[i] = A[i - pre] * a + S[i - pre]; return o2; };
    const hall = k === 'piano' ? freeverb(wet(B.L, W.piano.L), wet(B.R, W.piano.R), 0.955, 0.2) : freeverb(B.L.map(v => v * a), B.R.map(v => v * a), o.room ?? 0.86, o.damp ?? 0.32), sL = new Float32Array(N), sR = new Float32Array(N);
    for (let i = 0; i < N; i++) { sL[i] = (B.L[i] * LEVELS[k] + hall.L[i] * 0.9) * MASTER; sR[i] = (B.R[i] * LEVELS[k] + hall.R[i] * 0.9) * MASTER; }
    stems[k] = { L: wrap(sL), R: wrap(sR) };
    if (k === 'brass' && o.brass === false) { stems[k].L.fill(0); stems[k].R.fill(0); }   // (a track can leave the brass out)
  }
  const mixOf = parts => { const mL = new Float32Array(L), mR = new Float32Array(L); for (const k of parts) for (let i = 0; i < L; i++) { mL[i] += stems[k].L[i]; mR[i] += stems[k].R[i]; } return { L: mL, R: mR }; };
  const mixes = { brass: mixOf(MIXES.brass), piano: mixOf(MIXES.piano) },   // (no brass part: the brass pick is the track without a lead, as the lab plays it)
    mixL = mixes.brass.L, mixR = mixes.brass.R;
  // a soft limiter: transparent below 0.7, rounding peaks off above it (applied the same way to the stems)
  const lim = x => { const a = Math.abs(x); return a < 0.7 ? x : Math.sign(x) * (0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28)); };
  let peak = 0, sum = 0, psum = 0;
  for (let i = 0; i < L; i++) { peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i])); mixL[i] = lim(mixL[i]); mixR[i] = lim(mixR[i]); sum += mixL[i] * mixL[i] + mixR[i] * mixR[i]; }
  { const P = mixes.piano; for (let i = 0; i < L; i++) { P.L[i] = lim(P.L[i]); P.R[i] = lim(P.R[i]); psum += P.L[i] * P.L[i] + P.R[i] * P.R[i]; } }
  for (const k of STEMS) { const S = stems[k]; for (let i = 0; i < L; i++) { S.L[i] = lim(S.L[i]); S.R[i] = lim(S.R[i]); } }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeWav(join(OUT, `${name}.wav`), mixL, mixR, SR);
  writeWav(join(OUT, `${name}-pianomix.wav`), mixes.piano.L, mixes.piano.R, SR);
  for (const k of STEMS) writeWav(join(OUT, `${name}-${k}.wav`), stems[k].L, stems[k].R, SR);
  // a version stamp from the audio itself (the game asks for <file>.mp4?v=<stamp>, so a changed track is never served
  // from an old cache, and an unchanged one stays cached)
  let h = 0; for (const A of [mixL, mixes.piano.L, ...STEMS.map(k => stems[k].L)]) for (let i = 0; i < A.length; i += 499) h = (Math.imul(h, 31) + Math.round(A[i] * 1e6)) | 0;
  const dg = o.digits ?? 4;   // (the classic tracks keep 4 decimals; a new track keeps 6, so its loop points land on the sample)
  const info = { v: (h >>> 0).toString(36), bpm: o.bpm, bars: o.bars, loopStart: +loopStart.toFixed(dg), loopEnd: +loopEnd.toFixed(dg), join: +o.join.toFixed(dg), sections: o.sections, stems: STEMS, mixes: { brass: name, piano: `${name}-pianomix` }, ...(o.extra || {}) };
  console.log(`${name}: ${loopEnd.toFixed(1)} s, loop from ${loopStart.toFixed(1)} s, pre-limit peak ${peak.toFixed(2)}, RMS ${(10 * Math.log10(sum / (2 * L))).toFixed(1)} dBFS (piano mix ${(10 * Math.log10(psum / (2 * L))).toFixed(1)})`);
  return info;
}

// =====================================================================================================================
// ---------- composing helpers for the mood-group tracks (tracks/<name>.mjs) ----------
// =====================================================================================================================
export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const pc = m => ((m % 12) + 12) % 12;
export const noteName = m => `${NOTE_NAMES[pc(m)]}${Math.floor(m / 12) - 1}`;
// scales as semitone steps from the tonic
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], phrygDom: [0, 1, 4, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentaMaj: [0, 2, 4, 7, 9], pentaMin: [0, 3, 5, 7, 10], wholeTone: [0, 2, 4, 6, 8, 10],
};
// the notes of a scale from lo to hi (midi), tonic a pitch class
export const scaleNotes = (tonic, scale, lo, hi) => { const out = []; for (let m = lo; m <= hi; m++) if (SCALES[scale].includes(pc(m - tonic))) out.push(m); return out; };
// a chord from its name: root letter (+ # or b), then a quality: '' major, m minor, 7, m7, maj7, sus2, sus4, dim, aug,
// add9, m9, 5 (a bare fifth), and an optional /bass. -> { name, root (pc), bass (pc), tones (pcs, root first) }
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14], madd9: [0, 3, 7, 14], 5: [0, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9] };
export function chord(name) {
  const m = name.match(/^([A-G])([#b]?)([^/]*)(?:\/([A-G][#b]?))?$/); if (!m || !(m[3] in QUAL)) throw new Error(`chord? ${name}`);
  const r = pc(NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)), b = m[4] ? pc(NOTE[m[4][0]] + (m[4][1] === '#' ? 1 : m[4][1] === 'b' ? -1 : 0)) : r;
  return { name, root: r, bass: b, ivs: QUAL[m[3]], tones: QUAL[m[3]].map(i => pc(r + i)), minor: QUAL[m[3]][1] === 3 };
}
// a chord's name moved by n semitones (for a key change: the studio's chord hints read these names)
export function transName(name, n) {
  if (!n) return name;
  const m = name.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/), mv = x => NOTE_NAMES[pc((NOTE[x[0]] + (x[1] === '#' ? 1 : x[1] === 'b' ? -1 : 0)) + n)];
  return mv(m[1]) + m[2] + (m[3] ? '/' + mv(m[3]) : '');
}
// the chord tone nearest to midi m (at or below when `down`)
export const nearestTone = (C, m) => { for (let d = 0; d < 12; d++) for (const s of [-1, 1]) if (C.tones.includes(pc(m + s * d))) return m + s * d; return m; };
// a voicing: n notes of the chord, close-ish, from a low bound up (the bass not included), smooth if `prev` is given
export function voicing(C, lo, n = 4, prev = null) {
  const pool = []; for (let m = lo; m < lo + 24; m++) if (C.tones.includes(pc(m))) pool.push(m);
  if (!prev) return pool.slice(0, n);
  // voice leading: each previous voice to its nearest chord tone, no doubled notes where avoidable
  const out = [];
  for (const p of prev) { let best = null; for (const m of pool) if (!out.includes(m) && (best == null || Math.abs(m - p) < Math.abs(best - p))) best = m; out.push(best ?? p); }
  return out.sort((a, b) => a - b);
}
// the lowest note of a pitch class at or above lo
export const atOrAbove = (p, lo) => lo + pc(p - lo);
// humanise: a tiny timing and velocity wobble (deterministic: uses the track's seed)
export const human = (t, v, dt = 0.006, dv = 0.06) => [t + (rnd() - 0.5) * dt, Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * dv))];

// the track's render: the bar map, buffers, the score's compose(S) and the mixdown. def (a track module's default):
//   name, label, bpm, form [[section, bars]], loop (bars), join (bars), keyTr (semitones from D minor, for the game's
//   tonal sound effects), chords { section: [chord names per bar, cycled] }, up { section: semitones } (a key change),
//   seed, mix { send, level, room, damp, master }, compose(S)
// S: bufs, sp (a 16th, s), bar (s), beat (s), map [{ b, sec, i, n, t0, ch (name, at pitch), C (chord), last, intoNew,
//   next }], note(stem, id, midi, t, o), rev(stem, id, filter, tEnd, o), rnd, plus the helpers above.
export function renderTrack(def) {
  const sp = 60 / def.bpm / 4, bar = sp * 16, map = [];
  for (const [sec, n] of def.form) for (let i = 0; i < n; i++) {
    const list = def.chords[sec], up = (def.up && def.up[sec]) || 0, nm = transName(list[i % list.length], up);
    map.push({ b: map.length, sec, i, n, up, ch: nm, C: chord(nm), t0: map.length * bar });
  }
  map.forEach((B, b) => { B.next = map[(b + 1) % map.length]; B.last = B.i === B.n - 1; B.intoNew = B.last && B.next.sec !== B.sec; });
  const loopStart = def.loop * bar, loopEnd = map.length * bar, tail = def.tail ?? 5, N = Math.ceil((loopEnd + tail) * SR);
  const bufs = stemBufs(N); bufs.pianoWet = { piano: { L: new Float32Array(N), R: new Float32Array(N) } };
  setSeed(def.seed ?? 4242);
  const S = { def, bufs, sp, bar, beat: sp * 4, map, loopStart, loopEnd, N,
    // (a note pushed a hair early onto the loop's first bar would start in the intro, which the loop never plays again:
    // it starts on the bar line instead, so the seam has nothing cut in half)
    note: (stem, id, midi, t, o = {}) => note(bufs, stem, id, midi, t < loopStart && t > loopStart - 0.08 ? loopStart : t, { trim: true, ...o }),
    rev: (stem, id, filter, tEnd, o = {}) => reversed(bufs, stem, id, filter, tEnd, { trim: true, ...o }), rnd };
  def.compose(S);
  const sections = []; map.forEach((B, b) => { if (B.i === 0) sections.push({ name: B.sec, at: +(b * bar).toFixed(6) }); });
  // (for the studio's note editor: each bar's chord, its tones and the key's scale there, as pitch classes)
  const keyAt = B => (def.keyOf ? def.keyOf(B) : def.key ? { tonic: pc(def.key.tonic + B.up), scale: def.key.scale } : null);
  const harmony = map.map(B => { const k = keyAt(B); return { c: B.ch, t: B.C.tones.slice(0, 3), s: k ? SCALES[k.scale].map(x => pc(k.tonic + x)) : null }; });
  return finish({ name: def.name, bufs, N, loopStart, loopEnd, bpm: def.bpm, bars: map.length, sections, join: def.join * bar, digits: 6, ...(def.mix || {}),
    extra: { label: def.label, keyTr: def.keyTr ?? 0, harmony } });
}
