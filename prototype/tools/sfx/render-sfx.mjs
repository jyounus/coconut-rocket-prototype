// Renders the game's sound effects offline: each one is layered from real recorded instruments (the VSCO 2 CE sample
// library, CC0, in music-samples/ at the repo root: glockenspiel, xylophone, marimba, bells, triangle, cymbals, drums,
// woods, brass and strings) and a little synthesis (whooshes, a growl, a slide whistle), the way game effects are made:
// a sharp attack, a pitched body, a sparkle on top and a short room tail. Writes out/<name>.wav and out/sfx.json; then
// encode.sh turns them into prototype/audio/sfx/*.mp4.
//
// Inspired by the classics: Mario's coin (a quick two-note ding, the second a fourth up), Donkey Kong Country's banana
// and coin chimes (bright mallet runs with a shimmer), Rayman's lums and Mario's chain stomps (each pickup in a chain a
// step higher), and the orchestral stings of modern platformers for the big moments.
//
//   node render-sfx.mjs [name ...]      (all of them when no name is given)
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav, writeWav } from '../music/wav.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = join(HERE, '../../../music-samples');
const OUT = join(HERE, 'out');
const SR = 44100;

// ---------- the samples ----------
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midiOf = s => { const m = s.match(/^([A-G]#?)(-?\d)$/); return (+m[2] + 1) * 12 + NOTE[m[1]]; };
// pitched instruments: a folder and how far off VSCO's note names are (checked with ../music/pitch.mjs)
const PITCHED = {
  glock: { dir: 'Percussion/Glock', oct: 1, gain: 0.5 },
  xylo: { dir: 'Percussion/Xylo', oct: 1, gain: 0.5, filter: /_ff_01/ },
  marimba: { dir: 'Percussion/Marimba', oct: 1, gain: 0.55, filter: /_loud_/ },
  tbell: { dir: 'Percussion', oct: 0, gain: 0.5, filter: /^TB_hit_/ },
  hnStac: { dir: 'Brass/F Horn/stac', oct: 1, gain: 0.55 },
  hnSus: { dir: 'Brass/F Horn/sus', oct: 1, gain: 0.55 },
  tptStac: { dir: 'Brass/Trumpet/stac', oct: 1, gain: 0.45 },
  tptSus: { dir: 'Brass/Trumpet/sus', oct: 1, gain: 0.4 },
  tbnSus: { dir: 'Brass/Tenor Trombone/sus', oct: 1, gain: 0.45 },
  vlnSus: { dir: 'Strings/Violin Section/susVib', oct: 1, gain: 0.5 },
  vlaSus: { dir: 'Strings/Viola Section/susvib', oct: 1, gain: 0.5 },
  vcSus: { dir: 'Strings/Cello Section/susvib', oct: 1, gain: 0.5 },
  vcSpic: { dir: 'Strings/Cello Section/spic', oct: 1, gain: 0.6 },
};
// unpitched: a folder and a file-name filter
const HITS = {
  claves: ['Percussion', /^Claves1_Hit/], cowbell: ['Percussion', /^Cowbell1_Hit/], logHi: ['Percussion', /^LogDrumHi/], logLo: ['Percussion', /^LogDrumLo/],
  tri: ['Percussion', /^Triangle6-Hit_/], triM: ['Percussion', /^Triangle6-HitM/], triRoll: ['Percussion', /^Triangle3-Roll/],
  belltree: ['Percussion', /^BellTree/], sleigh: ['Percussion', /^Sleighbells_Hit/], vibraring: ['Percussion', /^vibraring/],
  anvil: ['Percussion', /^Anvil/], brake: ['Percussion', /^BrakeDrum/], conga: ['Percussion', /^Conga-HitN/],
  ratchet: ['Percussion', /^Ratchet1-Fast/], ratchetSlow: ['Percussion', /^Ratchet1-Slow/],
  gong: ['Percussion', /^gongHit_(mf|p)/], gongBig: ['Percussion', /^gongHit_f/], gongScrape: ['Percussion', /^gongscrape/],
  crash: ['Percussion', /^cymbal-crash1_(mf|ff)/], crashSoft: ['Percussion', /^cymbal-crash1_(pp|mp)/], crashShort: ['Percussion', /^cymbal-crashshort/],
  swellShort: ['Percussion', /^susCymb1-cresc-Short/], swellMed: ['Percussion', /^susCymb1-cresc-Median/], bellCym: ['Percussion', /^susCymb1-hit-bell_mf/],
  snareRoll: ['Percussion', /^Snare2-rollSN/], zap: ['Percussion', /^zap/],
  bdrum: ['VSCO 1 Percussion/drums/bass', /^bdrum_(f|ff)_/], bdrumBig: ['VSCO 1 Percussion/drums/bass', /^bdrum_fff_/],
  timp: ['Percussion/Timpani', /Timpani[12]_Hit/], timpRoll: ['Percussion/Timpani/Rolls', /Roll/],
};
const FILES = {};
function list(id) {
  if (FILES[id]) return FILES[id];
  if (PITCHED[id]) {
    const I = PITCHED[id], dir = join(LIB, I.dir);
    const out = readdirSync(dir).filter(f => f.endsWith('.wav') && (!I.filter || I.filter.test(f))).map(f => {
      const m = f.replace(/\.wav$/, '').match(/_([A-G]#?)(-?\d)(?:_|$)/); if (!m) return null;
      const v = f.match(/_v(\d+)/) || f.match(/_(ff|f|mf|mp|p|pp)(?:_|\.|$)/);
      return { file: join(dir, f), midi: (+m[2] + 1 + I.oct) * 12 + NOTE[m[1]], layer: v ? (isNaN(+v[1]) ? { pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 }[v[1]] : +v[1]) : 1 };
    }).filter(Boolean);
    if (!out.length) throw new Error(`no samples for ${id}`);
    return (FILES[id] = out);
  }
  const [d, re] = HITS[id], dir = join(LIB, d);
  const out = readdirSync(dir).filter(f => f.endsWith('.wav') && re.test(f)).map(f => ({ file: join(dir, f), layer: +((f.match(/_v(\d)/) || [])[1] || 1) }));
  if (!out.length) throw new Error(`no samples for ${id}`);
  return (FILES[id] = out);
}
const CACHE = new Map();
const load = f => { let d = CACHE.get(f); if (!d) { d = readWav(f); if (d.rate !== SR) throw new Error(`${f}: ${d.rate} Hz`); CACHE.set(f, d); } return d; };
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function pickSample(id, midi, vel) {
  let l = list(id);
  if (midi != null) { const best = Math.min(...l.map(s => Math.abs(s.midi - midi))); l = l.filter(s => Math.abs(s.midi - midi) === best); }
  const layers = [...new Set(l.map(s => s.layer))].sort((a, b) => a - b), want = layers[Math.round((vel ?? 0.7) * (layers.length - 1))];
  const takes = l.filter(s => s.layer === want);
  return takes[Math.floor(rnd() * takes.length)];
}

// ---------- a sound: a stereo buffer and a reverb send ----------
function sound(len) { const n = Math.ceil(len * SR); return { L: new Float32Array(n), R: new Float32Array(n), vL: new Float32Array(n), vR: new Float32Array(n), n }; }
const panLR = p => [Math.cos((p + 1) * Math.PI / 4) * Math.SQRT2, Math.sin((p + 1) * Math.PI / 4) * Math.SQRT2];
// write a mono or stereo signal into the sound with pan, gain and a reverb send
function put(S, i0, l, r, g, pan, verb) {
  const [gl, gr] = panLR(pan);
  for (let i = 0; i < l.length; i++) { const j = i0 + i; if (j < 0) continue; if (j >= S.n) break; const a = l[i] * g * gl, b = r[i] * g * gr; S.L[j] += a; S.R[j] += b; S.vL[j] += a * verb; S.vR[j] += b * verb; }
}
// play a sample: pitched (midi) or a hit; o: vel, gain, pan, verb (send), dur/rel (a fade out), tune (cents), rate
// (unpitched speed), bend (semitones over the note: a slide), rev (played backwards, ending at t), lp (a gentle low-pass)
function samp(S, id, midi, t, o = {}) {
  const s = pickSample(id, midi, o.vel), d = load(s.file), base = PITCHED[id] ? PITCHED[id].gain : 0.5;
  const ratio0 = (midi != null ? Math.pow(2, (midi - s.midi) / 12) : 1) * Math.pow(2, (o.tune || 0) / 1200) * (o.rate || 1);
  const maxLen = Math.floor((o.dur != null ? o.dur + (o.rel ?? 0.08) : 20) * SR);
  const L = [], R = [];
  let p = 0, lpL = 0, lpR = 0; const a = o.lp ? 1 - Math.exp(-2 * Math.PI * o.lp / SR) : 1;
  for (let i = 0; i < maxLen; i++) {
    const k = p | 0; if (k + 1 >= d.L.length) break;
    const f = p - k; let l = d.L[k] + (d.L[k + 1] - d.L[k]) * f, r = d.R[k] + (d.R[k + 1] - d.R[k]) * f;
    if (o.lp) { lpL += (l - lpL) * a; lpR += (r - lpR) * a; l = lpL; r = lpR; }
    let e = 1; if (o.dur != null && i > o.dur * SR) e = Math.max(0, 1 - (i - o.dur * SR) / ((o.rel ?? 0.08) * SR));
    L.push(l * e); R.push(r * e);
    const bend = o.bend ? Math.pow(2, (o.bend * Math.min(1, i / ((o.bendT || o.dur || 0.5) * SR))) / 12) : 1;
    p += ratio0 * bend;
  }
  const g = base * (o.gain ?? 1) * (0.35 + 0.65 * (o.vel ?? 0.7));
  if (o.peakAt != null) {   // (placed so its loudest moment lands at peakAt, and cut there: a swell into a hit)
    let pi = 0, pv = 0; for (let i = 0; i < L.length; i++) { const v = Math.abs(L[i]); if (v > pv) { pv = v; pi = i; } }
    const fade = Math.round(0.03 * SR); for (let i = pi; i < L.length; i++) { const e = Math.max(0, 1 - (i - pi) / fade); L[i] *= e; R[i] *= e; }
    put(S, Math.round(o.peakAt * SR) - pi, L, R, g, o.pan ?? 0, o.verb ?? 0.2); return;
  }
  if (o.rev) { L.reverse(); R.reverse(); put(S, Math.round(t * SR) - L.length, L, R, g, o.pan ?? 0, o.verb ?? 0.2); }
  else put(S, Math.round(t * SR), L, R, g, o.pan ?? 0, o.verb ?? 0.2);
}
// synthesis: a tone with a pitch glide and an envelope (sine, triangle, square, saw)
function tone(S, t, f, o = {}) {
  const dur = o.dur ?? 0.2, a = o.a ?? 0.004, n = Math.floor((dur + (o.rel ?? 0.05)) * SR), out = new Float32Array(n), type = o.type || 'sine';
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / SR, k = Math.min(1, x / (o.glide ?? dur)), fr = (o.f2 ? f * Math.pow(o.f2 / f, k) : f) * (1 + (o.vib || 0) * Math.sin(2 * Math.PI * (o.vibF || 6) * x));
    ph += fr / SR; const q = ph % 1;
    const w = type === 'sine' ? Math.sin(2 * Math.PI * q) : type === 'triangle' ? 1 - 4 * Math.abs(q - 0.5) : type === 'square' ? (q < 0.5 ? 1 : -1) : 2 * q - 1;
    const env = x < a ? x / a : x < dur ? (o.curve === 'lin' ? 1 - 0.3 * (x - a) / dur : Math.exp(-(x - a) * (o.decay ?? 3) / dur)) : 0;
    const tail = x >= dur ? Math.exp(-(x - dur) / Math.max(0.005, (o.rel ?? 0.05) / 4)) * (o.curve === 'lin' ? 0.7 : Math.exp(-(dur - a) * (o.decay ?? 3) / dur)) : 0;
    out[i] = w * (x < dur ? env : tail);
  }
  if (o.lp) lowpass(out, o.lp);
  put(S, Math.round(t * SR), out, out, o.v ?? 0.2, o.pan ?? 0, o.verb ?? 0.15);
}
function lowpass(x, fc) { const a = 1 - Math.exp(-2 * Math.PI * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += (x[i] - y) * a; x[i] = y; } }
// filtered noise: a band-pass (or low/high-pass) swept from f to f2, with an envelope and a pan that can travel
function noise(S, t, o = {}) {
  const dur = o.dur ?? 0.3, a = o.a ?? 0.01, n = Math.floor((dur + 0.02) * SR), L = new Float32Array(n), R = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i / SR, k = Math.min(1, x / dur);
    if (i % 32 === 0) {   // (the filter re-tuned every 32 samples as it sweeps)
      const fc = Math.min(18000, o.f2 ? o.f * Math.pow(o.f2 / o.f, k) : o.f), w = 2 * Math.PI * fc / SR, q = o.q ?? 1, al = Math.sin(w) / (2 * q), cs = Math.cos(w), a0 = 1 + al;
      if (o.type === 'lowpass') { b0 = (1 - cs) / 2 / a0; b1 = (1 - cs) / a0; b2 = b0; }
      else if (o.type === 'highpass') { b0 = (1 + cs) / 2 / a0; b1 = -(1 + cs) / a0; b2 = b0; }
      else { b0 = al / a0; b1 = 0; b2 = -al / a0; }
      a1 = -2 * cs / a0; a2 = (1 - al) / a0;
    }
    const w0 = rnd() * 2 - 1, y = b0 * w0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = w0; y2 = y1; y1 = y;
    const env = (x < a ? x / a : Math.pow(Math.max(0, 1 - (x - a) / (dur - a)), o.shape ?? 1.6)) * (o.v ?? 0.2);
    const pan = o.pan2 != null ? (o.pan ?? 0) + (o.pan2 - (o.pan ?? 0)) * k : (o.pan ?? 0), [gl, gr] = panLR(pan);
    L[i] = y * env * gl; R[i] = y * env * gr;
  }
  put(S, Math.round(t * SR), L, R, 1, 0, o.verb ?? 0.15);
}
function freeverb(inL, inR, room = 0.8, damp = 0.4) {
  const n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n);
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225];
  const side = (input, out, off) => {
    const combs = combT.map(t => ({ b: new Float32Array(t + off), i: 0, f: 0 })), aps = apT.map(t => ({ b: new Float32Array(t + off), i: 0 }));
    for (let s = 0; s < n; s++) {
      const x = input[s] * 0.015; let y = 0;
      for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; if (++c.i >= c.b.length) c.i = 0; y += o; }
      for (const ap of aps) { const o = ap.b[ap.i]; ap.b[ap.i] = y + o * 0.5; if (++ap.i >= ap.b.length) ap.i = 0; y = o - y; }
      out[s] = y;
    }
  };
  side(inL, outL, 0); side(inR, outR, 23);
  return { L: outL, R: outR };
}
// finish: the room, a 30 Hz high-pass, scaled to the effect's peak, softly limited, the silent end trimmed and faded
function finish(S, peak, room = 0.75) {
  const v = freeverb(S.vL, S.vR, room), L = new Float32Array(S.n), R = new Float32Array(S.n);
  for (let i = 0; i < S.n; i++) { L[i] = S.L[i] + v.L[i] * 2.2; R[i] = S.R[i] + v.R[i] * 2.2; }
  const hp = x => { const a = Math.exp(-2 * Math.PI * 30 / SR); let px = 0, py = 0; for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; } };
  hp(L); hp(R);
  let pk = 0; for (let i = 0; i < S.n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak / (pk || 1), lim = x => { const a = Math.abs(x); return a < 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2)); };
  let end = S.n; const th = peak * 0.001; while (end > SR * 0.05 && Math.abs(L[end - 1] * g) < th && Math.abs(R[end - 1] * g) < th) end--;
  end = Math.min(S.n, end + Math.round(SR * 0.02));
  const fade = Math.round(SR * 0.03), oL = new Float32Array(end), oR = new Float32Array(end);
  for (let i = 0; i < end; i++) { const e = i > end - fade ? (end - i) / fade : 1; oL[i] = lim(L[i] * g) * e; oR[i] = lim(R[i] * g) * e; }
  return { L: oL, R: oR };
}

// ---------- the effects ----------
// The tonal ones are in D minor pentatonic (the soundtrack's key: D F G A C); the game shifts them with each zone's key.
const PENT = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96];
const FX = {};
// a coconut: a wooden tok of the shell, a xylophone note and, a hair later, a glockenspiel a pentatonic fourth up (the
// Mario coin's two-note shape) with a high shimmer. Eight of them, each a step up the scale for a chain.
for (let c = 1; c <= 8; c++) FX[`coco${c}`] = { peak: 0.42, tonal: true, len: 1.2, make(S) {
  const i = c + 3, m = PENT[i], m2 = PENT[i + 2];
  samp(S, 'claves', null, 0, { vel: 0.4, gain: 0.35, rate: 1.15 + c * 0.02, pan: -0.1, verb: 0.05 });
  samp(S, 'xylo', m, 0, { vel: 0.8, gain: 0.8, pan: -0.15, dur: 0.12, rel: 0.1, verb: 0.15 });
  samp(S, 'marimba', m - 12, 0, { vel: 0.6, gain: 0.35, dur: 0.1, rel: 0.1, verb: 0.1 });
  samp(S, 'glock', m2, 0.06, { vel: 0.8, gain: 0.9, pan: 0.15, dur: 0.5, rel: 0.25, verb: 0.3 });
  samp(S, 'glock', m2 + 12, 0.065, { vel: 0.5, gain: 0.22, pan: 0.3, dur: 0.3, rel: 0.2, verb: 0.4 });
  samp(S, 'tri', null, 0.06, { vel: 0.3, gain: 0.08, pan: 0.4, dur: 0.4, rel: 0.2, verb: 0.3 });
} };
// a golden coconut: a fast glittering run up (Donkey Kong coins), a tubular bell under its top note, a bell tree's
// shimmer and sleigh bells, in a bigger room
FX.gold = { peak: 0.55, tonal: true, len: 2.4, make(S) {
  [74, 77, 81, 86, 89, 93].forEach((m, i) => { samp(S, 'glock', m, i * 0.035, { vel: 0.75 + i * 0.04, gain: 0.8, pan: -0.4 + i * 0.16, dur: i === 5 ? 1.2 : 0.3, rel: 0.4, verb: 0.35 }); if (i < 3) samp(S, 'xylo', m, i * 0.035, { vel: 0.7, gain: 0.45, pan: -0.3 + i * 0.1, dur: 0.1, rel: 0.1 }); });
  samp(S, 'tbell', 74, 0.17, { vel: 0.6, gain: 0.5, dur: 1.4, rel: 0.6, verb: 0.4 });
  samp(S, 'belltree', null, 0.02, { vel: 0.7, gain: 0.35, pan: 0.3, verb: 0.4 });
  samp(S, 'sleigh', null, 0.17, { vel: 0.5, gain: 0.25, pan: -0.3, dur: 0.6, rel: 0.3 });
  samp(S, 'tri', null, 0.2, { vel: 0.6, gain: 0.18, pan: 0.5, dur: 1.2, rel: 0.4, verb: 0.4 });
} };
// a close call: a whoosh past one ear and out of the other, then a bright "nice!" ding-ding
for (const [k, from, to] of [['close1', -0.9, 0.9], ['close2', 0.9, -0.9]]) FX[k] = { peak: 0.45, tonal: true, len: 1.4, make(S) {
  noise(S, 0, { f: 500, f2: 3200, q: 1.3, v: 0.5, dur: 0.32, a: 0.12, pan: from, pan2: to, verb: 0.1 });
  noise(S, 0.02, { f: 220, f2: 900, q: 0.8, v: 0.3, dur: 0.28, a: 0.1, pan: from * 0.6, pan2: to * 0.6, verb: 0.05 });
  samp(S, 'glock', 89, 0.16, { vel: 0.8, gain: 0.7, pan: to * 0.3, dur: 0.15, rel: 0.15, verb: 0.3 });
  samp(S, 'glock', 96, 0.24, { vel: 0.85, gain: 0.75, pan: to * 0.4, dur: 0.6, rel: 0.3, verb: 0.35 });
  samp(S, 'triM', null, 0.24, { vel: 0.5, gain: 0.12, pan: to * 0.5, dur: 0.5, rel: 0.2 });
} };
// a crash into a hazard: a heavy cartoon impact (a big drum, a short crash, a clank of metal), bits of wood flying
// off, rattling parts, a slide whistle spinning down, and little dizzy tweets circling
FX.crash = { peak: 0.8, len: 3.4, make(S) {
  samp(S, 'bdrumBig', null, 0, { dur: 1.1, rel: 0.6, vel: 1, gain: 1.1, verb: 0.1 });
  samp(S, 'timp', null, 0, { dur: 1.1, rel: 0.6, vel: 0.8, gain: 0.7, verb: 0.15 });
  samp(S, 'crashShort', null, 0.005, { vel: 0.8, gain: 0.55, pan: 0.2, verb: 0.15 });
  samp(S, 'anvil', null, 0, { vel: 0.5, gain: 0.3, rate: 0.8, pan: -0.2, verb: 0.15 });
  noise(S, 0, { type: 'lowpass', f: 3000, f2: 200, v: 0.5, dur: 0.35, a: 0.002, verb: 0.1 });
  for (let i = 0; i < 7; i++) samp(S, i % 2 ? 'claves' : 'logHi', null, 0.06 + i * 0.05 + rnd() * 0.03, { vel: 0.5 - i * 0.04, gain: 0.35, rate: 0.8 + rnd() * 0.7, pan: (rnd() - 0.5) * 1.6, verb: 0.2 });
  samp(S, 'ratchetSlow', null, 0.1, { vel: 0.5, gain: 0.25, dur: 0.45, rel: 0.2, pan: 0.3 });
  tone(S, 0.12, 1400, { f2: 260, glide: 0.75, dur: 0.75, type: 'sine', v: 0.09, decay: 1.2, vib: 0.03, vibF: 9, pan: -0.2, verb: 0.2 });
  [100, 96, 100, 96, 100].forEach((m, i) => samp(S, 'glock', m - 12, 0.85 + i * 0.13, { vel: 0.5, gain: 0.25, pan: Math.sin(i * 1.6) * 0.7, dur: 0.08, rel: 0.1, verb: 0.35 }));
} };
// caught by the monster: a deep timpani and gong, a dark swell
FX.caught = { peak: 0.75, len: 3.4, make(S) {
  samp(S, 'timp', null, 0, { dur: 1.1, rel: 0.6, vel: 1, gain: 0.9, verb: 0.2 });
  samp(S, 'bdrumBig', null, 0, { dur: 1.1, rel: 0.6, vel: 1, gain: 0.8 });
  samp(S, 'gong', null, 0.02, { vel: 0.7, gain: 0.6, rate: 0.75, verb: 0.3 });
  samp(S, 'tbnSus', 38, 0, { vel: 0.9, gain: 0.5, dur: 0.9, rel: 0.4, bend: -2, verb: 0.2 });
  noise(S, 0, { type: 'lowpass', f: 900, f2: 150, v: 0.35, dur: 0.8, a: 0.05 });
} };
// the bite: two crunching chomps of the jaws, then a short sad tag falling away (the run is over)
FX.bite = { peak: 0.8, len: 3.6, make(S) {
  for (const dt of [0, 0.12]) {
    samp(S, 'bdrumBig', null, dt, { dur: 1.1, rel: 0.6, vel: 0.9, gain: 0.8, verb: 0.05 });
    samp(S, 'conga', null, dt, { vel: 0.9, gain: 0.6, rate: 0.6, verb: 0.05 });
    samp(S, 'claves', null, dt + 0.005, { vel: 0.9, gain: 0.45, rate: 0.55 });
    noise(S, dt, { type: 'lowpass', f: 2500, f2: 300, q: 0.7, v: 0.5, dur: 0.12, a: 0.002, verb: 0.05 });
  }
  [74, 72, 69, 65].forEach((m, i) => samp(S, 'marimba', m, 0.45 + i * 0.18, { vel: 0.7, gain: 0.6, pan: 0.2 - i * 0.12, dur: 0.2, rel: 0.15, verb: 0.25 }));
  samp(S, 'hnSus', 62, 1.17, { vel: 0.55, gain: 0.55, dur: 0.6, rel: 0.4, bend: -1.5, bendT: 0.6, verb: 0.3 });
  samp(S, 'vcSpic', 50, 1.17, { vel: 0.6, gain: 0.5, verb: 0.2 });
} };
// the monster's roar as it lunges: a rough growl (a jittering, buzzing voice through vowel formants), a scraped gong
// pitched down and a timpani roll under it
FX.roar = { peak: 0.65, len: 2.0, make(S) {
  const n = Math.floor(1.3 * SR), out = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const x = i / SR, f = 70 + 25 * Math.sin(Math.PI * Math.min(1, x / 1.1)) + (rnd() - 0.5) * 18; ph += f / SR; const q = ph % 1; out[i] = (2 * q - 1) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 23 * x)) * Math.min(1, x / 0.12) * Math.max(0, 1 - Math.max(0, x - 0.8) / 0.5); }
  // two vowel formants (aah opening to ohh) by band-passing the buzz
  const band = (x, f, q) => { const y = new Float32Array(x.length); let a1, a2, b0, b2, x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { if (i % 64 === 0) { const fc = typeof f === 'function' ? f(i / SR) : f, w = 2 * Math.PI * fc / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; b0 = al / a0; b2 = -al / a0; a1 = -2 * Math.cos(w) / a0; a2 = (1 - al) / a0; } const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const f1 = band(out, x => 750 - 300 * Math.min(1, x / 1.2), 4), f2 = band(out, x => 1200 - 450 * Math.min(1, x / 1.2), 6), f0 = band(out, 160, 1);
  const v = new Float32Array(n); for (let i = 0; i < n; i++) v[i] = f1[i] * 2.2 + f2[i] * 1.2 + f0[i] * 1.4;
  put(S, 0, v, v, 0.5, -0.1, 0.25);
  samp(S, 'gongScrape', null, 0, { vel: 0.8, gain: 0.5, rate: 0.6, dur: 1.2, rel: 0.4, verb: 0.3 });
  samp(S, 'timpRoll', null, 0, { vel: 0.8, gain: 0.45, dur: 1.0, rel: 0.4 });
  noise(S, 0, { type: 'lowpass', f: 600, v: 0.25, dur: 1.2, a: 0.15 });
} };
// lift-off: a deep boom, the burn whooshing up as a whistle rises, and sparks crackling
FX.launch = { peak: 0.6, len: 2.4, make(S) {
  samp(S, 'bdrumBig', null, 0, { dur: 1.1, rel: 0.6, vel: 0.9, gain: 0.8, verb: 0.15 });
  samp(S, 'timp', null, 0, { dur: 1.1, rel: 0.6, vel: 0.6, gain: 0.4 });
  noise(S, 0, { f: 250, f2: 4500, q: 0.9, v: 0.45, dur: 0.9, a: 0.05, shape: 1.2, verb: 0.15 });
  noise(S, 0, { type: 'lowpass', f: 400, v: 0.35, dur: 0.8, a: 0.02 });
  tone(S, 0.05, 320, { f2: 1500, glide: 0.7, dur: 0.75, type: 'triangle', v: 0.06, curve: 'lin', verb: 0.2 });
  for (let i = 0; i < 14; i++) { const t = 0.05 + rnd() * 0.7; noise(S, t, { type: 'highpass', f: 5000, v: 0.12 * rnd(), dur: 0.012, a: 0.001, pan: (rnd() - 0.5) * 1.4, verb: 0.1 }); }
} };
// a new zone: a cymbal swells up into a hit of bells, glockenspiel and timpani under a crash
FX.zone = { peak: 0.65, tonal: true, len: 4.6, make(S) {
  const T = 0.9;
  samp(S, 'swellMed', null, 0, { vel: 0.7, gain: 0.5, peakAt: T, verb: 0.25 });
  samp(S, 'timpRoll', null, 0.2, { vel: 0.5, gain: 0.35, dur: T - 0.2, rel: 0.05 });
  samp(S, 'timp', null, T, { dur: 1.1, rel: 0.6, vel: 0.9, gain: 0.8 }); samp(S, 'bdrum', null, T, { dur: 1.1, rel: 0.6, vel: 0.8, gain: 0.6 });
  samp(S, 'crash', null, T, { vel: 0.7, gain: 0.45, verb: 0.3 });
  samp(S, 'tbell', 74, T, { vel: 0.8, gain: 0.6, dur: 2, rel: 0.6, verb: 0.4 });
  [74, 77, 81, 86].forEach((m, i) => samp(S, 'glock', m, T + i * 0.04, { vel: 0.8, gain: 0.6, pan: -0.3 + i * 0.2, dur: 1.2, rel: 0.5, verb: 0.35 }));
  for (const [m, id] of [[62, 'hnSus'], [65, 'hnSus'], [69, 'tptSus']]) samp(S, id, m, T, { vel: 0.7, gain: 0.45, dur: 0.9, rel: 0.5, verb: 0.3 });
} };
// every hundred metres: a bell and a two-note glockenspiel chime
FX.milestone = { peak: 0.42, tonal: true, len: 2.0, make(S) {
  samp(S, 'tbell', 74, 0, { vel: 0.5, gain: 0.45, dur: 1, rel: 0.5, verb: 0.35 });
  samp(S, 'glock', 86, 0, { vel: 0.7, gain: 0.6, dur: 0.2, rel: 0.2, pan: -0.2 });
  samp(S, 'glock', 93, 0.09, { vel: 0.75, gain: 0.65, dur: 0.7, rel: 0.3, pan: 0.2, verb: 0.35 });
} };
// a crusher slamming shut: a big drum, an anvil's clank and a brake drum, with dust
FX.slam = { peak: 0.65, len: 2.0, make(S) {
  samp(S, 'bdrumBig', null, 0, { dur: 1.1, rel: 0.6, vel: 1, gain: 0.9 }); samp(S, 'timp', null, 0, { dur: 1.1, rel: 0.6, vel: 0.7, gain: 0.5 });
  samp(S, 'anvil', null, 0, { vel: 0.7, gain: 0.45, rate: 0.7, pan: 0.15, verb: 0.2 });
  samp(S, 'brake', null, 0.005, { vel: 0.7, gain: 0.35, rate: 0.6, pan: -0.15 });
  noise(S, 0.01, { type: 'lowpass', f: 1800, f2: 200, v: 0.35, dur: 0.4, a: 0.003 });
} };
// a boulder working loose: a low rumble and a timpani roll
FX.rumble = { peak: 0.45, len: 1.8, make(S) {
  samp(S, 'timpRoll', null, 0, { vel: 0.6, gain: 0.6, dur: 1.1, rel: 0.4, rate: 0.8 });
  noise(S, 0, { type: 'lowpass', f: 220, v: 0.6, dur: 1.3, a: 0.3, shape: 1 });
  for (let i = 0; i < 5; i++) samp(S, 'logLo', null, 0.2 + i * 0.18 + rnd() * 0.05, { vel: 0.3, gain: 0.25, rate: 0.5 + rnd() * 0.3, pan: (rnd() - 0.5) });
} };
// the resume countdown: a woodblock tick, then a bright "go!"
FX.tick = { peak: 0.32, len: 0.5, make(S) { samp(S, 'logHi', null, 0, { vel: 0.7, gain: 0.8, rate: 1.2 }); samp(S, 'claves', null, 0, { vel: 0.4, gain: 0.25, rate: 1.4 }); } };
FX.go = { peak: 0.45, tonal: true, len: 1.4, make(S) {
  samp(S, 'glock', 86, 0, { vel: 0.85, gain: 0.7, dur: 0.6, rel: 0.3, verb: 0.3 }); samp(S, 'xylo', 74, 0, { vel: 0.8, gain: 0.5, dur: 0.1, rel: 0.1 });
  samp(S, 'glock', 93, 0, { vel: 0.6, gain: 0.35, dur: 0.6, rel: 0.3, verb: 0.3 }); samp(S, 'tri', null, 0, { vel: 0.6, gain: 0.15, dur: 0.6, rel: 0.3 });
} };
// buttons: a soft wooden click (three takes, so presses don't all sound the same)
for (let i = 1; i <= 3; i++) FX[`tap${i}`] = { peak: 0.2, len: 0.3, make(S) {
  samp(S, 'claves', null, 0, { vel: 0.35, gain: 0.6, rate: [1.5, 1.6, 1.42][i - 1], verb: 0.03 });
  samp(S, 'marimba', [86, 89, 84][i - 1], 0, { vel: 0.3, gain: 0.25, dur: 0.04, rel: 0.05, verb: 0.03 });
} };
// a sheet sliding open (an airy rise) and away (falling)
FX.swishOpen = { peak: 0.24, len: 0.5, make(S) { noise(S, 0, { f: 600, f2: 2600, q: 1.2, v: 0.5, dur: 0.24, a: 0.08, pan: -0.3, pan2: 0.3 }); } };
FX.swishClose = { peak: 0.22, len: 0.5, make(S) { noise(S, 0, { f: 2600, f2: 600, q: 1.2, v: 0.5, dur: 0.22, a: 0.05, pan: 0.3, pan2: -0.3 }); } };
// an unlock bought: coins tumbling (a quick fall of bright mallet notes and sleigh bells), then a ka-ching of two
// glockenspiel notes with a triangle
FX.buy = { peak: 0.55, tonal: true, len: 2.2, make(S) {
  for (let i = 0; i < 9; i++) samp(S, i % 2 ? 'xylo' : 'glock', PENT[13 - i] , i * 0.032 + rnd() * 0.01, { vel: 0.6, gain: 0.4, pan: (rnd() - 0.5) * 1.2, dur: 0.12, rel: 0.12, verb: 0.2 });
  samp(S, 'sleigh', null, 0, { vel: 0.6, gain: 0.3, dur: 0.4, rel: 0.2 });
  samp(S, 'cowbell', null, 0.33, { vel: 0.4, gain: 0.12, rate: 1.5 });
  samp(S, 'glock', 86, 0.33, { vel: 0.85, gain: 0.75, dur: 0.15, rel: 0.12, pan: -0.15 });
  samp(S, 'glock', 93, 0.42, { vel: 0.9, gain: 0.8, dur: 1, rel: 0.4, pan: 0.15, verb: 0.35 });
  samp(S, 'tri', null, 0.42, { vel: 0.7, gain: 0.2, dur: 1, rel: 0.4, verb: 0.3 });
} };
// a mission done: a quick brass fanfare (horns and a trumpet, D F A then a held D) with timpani, glockenspiel and a crash
FX.mission = { peak: 0.6, tonal: true, len: 3.4, make(S) {
  const sp = 0.09;
  [[62, 0], [65, 1], [69, 2]].forEach(([m, i]) => { samp(S, 'hnStac', m, i * sp, { vel: 0.75, gain: 0.7, pan: -0.2 }); samp(S, 'tptStac', m + 12, i * sp, { vel: 0.65, gain: 0.45, pan: 0.2 }); samp(S, 'xylo', m + 12, i * sp, { vel: 0.6, gain: 0.35, dur: 0.08, rel: 0.1 }); });
  const T = 3 * sp;
  for (const [m, id, g] of [[62, 'hnSus', 0.6], [66, 'hnSus', 0.5], [69, 'hnSus', 0.5], [74, 'tptSus', 0.5]]) samp(S, id, m, T, { vel: 0.8, gain: g, dur: 0.75, rel: 0.45, verb: 0.3 });
  samp(S, 'timp', null, T, { dur: 1.1, rel: 0.6, vel: 0.8, gain: 0.6 }); samp(S, 'crashSoft', null, T, { vel: 0.7, gain: 0.35, verb: 0.3 });
  [86, 90, 93, 98].forEach((m, i) => samp(S, 'glock', m, T + i * 0.035, { vel: 0.7, gain: 0.45, pan: -0.3 + i * 0.2, dur: 0.7, rel: 0.4, verb: 0.35 }));
} };
// a new best: a bigger fanfare: a timpani roll into trumpets and horns (a rising call, then a big held chord) over
// strings, a crash, a glockenspiel run and the bell
FX.best = { peak: 0.7, tonal: true, len: 4.8, make(S) {
  samp(S, 'timpRoll', null, 0, { vel: 0.6, gain: 0.45, dur: 0.42, rel: 0.05 }); samp(S, 'snareRoll', null, 0, { vel: 0.5, gain: 0.25, dur: 0.42, rel: 0.05 });
  const sp = 0.11;
  [[69, 0], [74, 1], [77, 2], [81, 3]].forEach(([m, i]) => { samp(S, 'tptStac', m, 0.1 + i * sp, { vel: 0.8, gain: 0.55, pan: 0.15 }); samp(S, 'hnStac', m - 12, 0.1 + i * sp, { vel: 0.7, gain: 0.55, pan: -0.2 }); });
  const T = 0.1 + 4 * sp + 0.02;
  for (const [m, id, g] of [[74, 'tptSus', 0.55], [78, 'tptSus', 0.4], [62, 'hnSus', 0.6], [66, 'hnSus', 0.5], [69, 'hnSus', 0.5], [50, 'tbnSus', 0.5]]) samp(S, id, m, T, { vel: 0.85, gain: g, dur: 1.4, rel: 0.6, verb: 0.3 });
  for (const [m, id] of [[50, 'vcSus'], [57, 'vlaSus'], [66, 'vlnSus'], [74, 'vlnSus']]) samp(S, id, m, T, { vel: 0.7, gain: 0.4, dur: 1.5, rel: 0.6, verb: 0.35 });
  samp(S, 'timp', null, T, { dur: 1.1, rel: 0.6, vel: 1, gain: 0.8 }); samp(S, 'bdrum', null, T, { dur: 1.1, rel: 0.6, vel: 0.9, gain: 0.6 }); samp(S, 'crash', null, T, { vel: 0.8, gain: 0.5, verb: 0.35 });
  samp(S, 'tbell', 74, T, { vel: 0.7, gain: 0.45, dur: 2, rel: 0.6, verb: 0.4 });
  [74, 78, 81, 86, 90, 93, 98].forEach((m, i) => samp(S, 'glock', m, T + 0.05 + i * 0.04, { vel: 0.7, gain: 0.4, pan: -0.45 + i * 0.15, dur: 0.8, rel: 0.4, verb: 0.35 }));
  samp(S, 'belltree', null, T + 0.05, { vel: 0.6, gain: 0.25, verb: 0.4 });
} };
// back in the run (a rewarded revive): a magical rising run of glockenspiel and xylophone, a bell tree, and a warm
// string chord swelling in, on a vibraphone ring
FX.revive = { peak: 0.6, tonal: true, len: 3.4, make(S) {
  PENT.slice(2, 14).forEach((m, i) => samp(S, i % 3 === 2 ? 'xylo' : 'glock', m, i * 0.04, { vel: 0.55 + i * 0.03, gain: 0.45, pan: -0.5 + i * 0.09, dur: 0.25, rel: 0.25, verb: 0.35 }));
  samp(S, 'belltree', null, 0.05, { vel: 0.6, gain: 0.3, pan: 0.3, verb: 0.4 });
  for (const [m, id] of [[50, 'vcSus'], [62, 'vlaSus'], [66, 'vlnSus'], [69, 'vlnSus']]) samp(S, id, m, 0.15, { vel: 0.6, gain: 0.4, dur: 1.4, rel: 0.6, verb: 0.4 });
  samp(S, 'vibraring', null, 0.48, { vel: 0.6, gain: 0.3, verb: 0.4 });
  samp(S, 'glock', 98, 0.5, { vel: 0.75, gain: 0.55, dur: 1.2, rel: 0.5, verb: 0.4 });
  noise(S, 0, { f: 400, f2: 5000, q: 0.8, v: 0.18, dur: 0.6, a: 0.25 });
} };

// ---------- render ----------
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FX);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const manPath = join(OUT, 'sfx.json'), man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
for (const n of names) {
  const E = FX[n]; if (!E) throw new Error(`no effect ${n}`);
  seed = 7 + [...n].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const S = sound(E.len); E.make(S);
  const { L, R } = finish(S, E.peak, E.room);
  writeWav(join(OUT, `${n}.wav`), L, R, SR);
  // a version stamp from the audio (so the game never plays an old cached file)
  let h = 0; for (let i = 0; i < L.length; i += 97) h = (Math.imul(h, 31) + Math.round(L[i] * 1e6)) | 0;
  man[n] = { dur: +(L.length / SR).toFixed(3), tonal: !!E.tonal, v: (h >>> 0).toString(36) };
  console.log(`${n.padEnd(11)} ${(L.length / SR).toFixed(2)} s`);
}
for (const k of Object.keys(man)) if (!FX[k]) delete man[k];
writeFileSync(manPath, JSON.stringify(man, null, 1));
