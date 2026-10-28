// "Burrows": bugs, burrows, hives and underground (Honeycomb Hive, Glowshroom Grotto, Anthill Underworks, Hollow Palm).
//
// The feel: the busy underground and bug stages in the spirit of the Donkey Kong Country Returns / Tropical Freeze
// scores (a feel, not their notes): a scurrying, slightly mischievous funk in D Dorian (the raised sixth: Dm7 to G).
// The groove carries it: a syncopated pizzicato bass (basses and cellos), bongos filling the 16ths, a scratchy guiro,
// shaker and cabasa, a kick and backbeat with ghost notes, marimba stabs on the offbeats. The hook scurries in 16ths:
// staccato bassoon and clarinet in octaves (the call), marimba, xylophone and pizzicato violins (the answer). The lift
// is warm and glowing (B-flat major: the mushroom glow and the honey): a horn and flute melody over a lush string pad,
// harp arpeggios and glockenspiel, the groove in half time. The climax is the hook a whole step up (E Dorian) on
// staccato trumpets and horns with the winds; the break is the bongos and a low clarinet; the build stacks bongo rolls,
// guiro scrapes and a xylophone scurry back into the hook.
//
// Form (118 bpm, 36 bars; the loop is bars 5-36, 65.1 s):
//   intro  4  a guiro scrape and the hand drums; the pizzicato bass; the bassoon peeks out with the hook's first bars
//   A      8  the hook: bassoon and clarinet call (1-2, 5-6), marimba, xylophone and pizzicato answer (3-4), all (7-8)
//   B      8  the glow (B-flat major): horn and flute in octaves, strings, harp, glockenspiel; half-time groove
//   climax 8  the hook up a step (E Dorian): staccato trumpets and horns, clarinet, bassoon, xylophone, flute
//   break  4  bongos, shaker, sparse bass; the low clarinet calls, the marimba answers
//   build  4  Gm7 B-flat C A7: bongo rolls, guiro scrapes, rising pizzicato, horns swelling, a xylophone scurry
//
// Stems: strings (pizzicato bass and violins, the lift's pad, harp), brass (the lift's horn tune, swells, the climax's
// hook), piano (the brass lines on piano), perc (every unpitched sound plus timpani), winds (bassoon, clarinet,
// flute, marimba, xylophone, glockenspiel).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['Dm7', 'G', 'Dm7', 'G'],
  A: ['Dm7', 'G', 'Dm7', 'G', 'Fmaj7', 'Em7', 'G', 'A7'],
  B: ['Bbmaj7', 'Am7', 'Gm7', 'C', 'Bbmaj7', 'Am7', 'C', 'B7'],
  climax: ['Dm7', 'G', 'Dm7', 'G', 'Fmaj7', 'Em7', 'G', 'A7'],   // (up a whole step: E Dorian)
  break: ['Dm7', 'G', 'Dm7', 'G'],
  build: ['Gm7', 'Bbmaj7', 'C', 'A7'],
};
// the hook (written in D Dorian at the clarinet's pitch): scurrying 16ths, syncopated
const HOOK = ph(
  [[0, 62, 1], [2, 65, 1], [3, 67, 1], [4, 69, 2], [7, 72, 1], [8, 69, 2], [10, 67, 1], [11, 65, 2], [14, 62, 2]],
  [[0, 71, 2], [3, 74, 1], [4, 71, 1], [6, 67, 2], [8, 69, 1], [9, 71, 2], [12, 74, 3], [15, 76, 1]],
  [[0, 74, 1], [2, 72, 1], [3, 69, 2], [6, 72, 1], [7, 74, 2], [10, 77, 2], [12, 76, 1], [13, 74, 1], [14, 72, 2]],
  [[0, 71, 3], [3, 67, 1], [4, 69, 2], [6, 71, 2], [8, 74, 4], [12, 72, 1], [13, 71, 1], [14, 69, 2]],
  [[0, 69, 2], [2, 72, 1], [3, 76, 2], [6, 77, 2], [8, 76, 1], [9, 72, 2], [12, 69, 2], [14, 72, 2]],
  [[0, 71, 2], [2, 74, 1], [3, 79, 2], [6, 76, 2], [8, 74, 1], [9, 71, 2], [12, 67, 2], [14, 69, 2]],
  [[0, 71, 1], [1, 72, 1], [2, 74, 2], [4, 77, 2], [6, 74, 2], [8, 79, 3], [11, 77, 1], [12, 74, 2], [14, 71, 2]],
  [[0, 73, 2], [2, 76, 1], [3, 79, 2], [6, 76, 2], [8, 73, 2], [10, 69, 2], [12, 67, 1], [13, 64, 1], [14, 61, 2]]);
const WHO = ['call', 'call', 'answer', 'answer', 'call', 'call', 'both', 'both'];
// the glow (B-flat major), the horn and the flute in octaves
const GLOW = ph(
  [[0, 74, 6], [6, 77, 2], [8, 81, 8]],
  [[0, 79, 6], [6, 76, 2], [8, 72, 8]],
  [[0, 74, 6], [6, 77, 2], [8, 82, 6], [14, 81, 2]],
  [[0, 79, 12], [12, 76, 4]],
  [[0, 77, 6], [6, 81, 2], [8, 86, 8]],
  [[0, 84, 6], [6, 81, 2], [8, 79, 8]],
  [[0, 79, 4], [4, 76, 4], [8, 72, 4], [12, 76, 4]],
  [[0, 75, 6], [6, 78, 2], [8, 81, 4], [12, 83, 4]]);
// the funk: the pizzicato bass (semitones over the root; 10 and 7 only where the chord has them), the bongos (h high,
// l low, with their weights), the marimba's offbeat stabs
const BASS = { 0: 0, 3: 0, 6: 12, 8: 7, 10: 0, 13: 10, 14: 12 };
const BONGO = { 1: ['h', 0.35], 2: ['h', 0.6], 3: ['h', 0.4], 5: ['l', 0.55], 7: ['h', 0.5], 9: ['h', 0.35], 10: ['h', 0.65], 11: ['l', 0.45], 13: ['l', 0.6], 15: ['h', 0.45] };
const STAB = [2, 7, 10, 13];
const LOOP_BAR = 4;
// burrows: a major-seventh chord without its root (the upper parts of the glow: the root stays in the bass, so the seventh
// never sits a semitone under it), and without its seventh (stabs, swells and the climax's pad: the triad)
const isMaj7 = C => C.tones.includes(pc(C.root + 11));
const burrowsUpper = C => isMaj7(C) ? { ...C, tones: C.tones.filter(p => p !== C.root) } : C;
const burrowsTriad = C => isMaj7(C) ? { ...C, tones: C.tones.filter(p => p !== pc(C.root + 11)) } : C;

// burrows: the chord with the tune's passing notes taken out while they sound (see works.mjs: the same idea)
function burrowsFilter(C, tune, X) {
  const act = Array.from({ length: 16 }, () => []);
  for (const [s, [m, len]] of Object.entries(tune)) { const p = pc(X(m)); if (C.tones.includes(p)) continue; for (let k = +s; k < Math.min(16, +s + len); k++) act[k].push(p); }
  return (s0 = 0, len = 16) => {
    const bad = []; for (let k = Math.max(0, s0); k < Math.min(16, s0 + len); k++) bad.push(...act[k]);
    const keep = C.tones.filter(p => !bad.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1));
    return keep.length ? { ...C, tones: keep } : C;
  };
}

export default {
  name: 'burrows', label: 'Burrows', bpm: 118, keyTr: 0, seed: 5150,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: LOOP_BAR, join: LOOP_BAR,
  chords: CHORDS, up: { climax: 2 },
  // the key per bar, for the studio's note editor: D Dorian, the glow in B-flat major (F major's notes), the climax in E Dorian
  keyOf: B => B.sec === 'B' ? { tonic: 10, scale: B.ch === 'B7' ? 'harmonic' : 'major' } : B.sec === 'build' ? { tonic: 2, scale: 'minor' } : { tonic: pc(2 + B.up), scale: 'dorian' },
  mix: { send: { strings: 0.3, winds: 0.28, perc: 0.14, brass: 0.26 }, level: { strings: 1.1, perc: 1.15, winds: 1.1, brass: 1 }, master: 0.62 },
  compose(S) {
    const { sp, bar, map, rev, rnd } = S;
    let pad = null;
    map.forEach(B => {
      const { sec, i, t0, C, up, b } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const hookOn = A || big, root = C.bass;
      const tune = hookOn ? HOOK[i] : lift ? GLOW[i] : (intro && i >= 2) ? HOOK[i - 2] : calm ? HOOK[i] : {};
      const F = burrowsFilter(C, tune, X), PC = F();
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.08));
      // (the loop's first bar line: every hit lands a few ms after it, so no attack starts on the very sample the loop jumps to)
      const late = s => (b === LOOP_BAR && s === 0 ? 0.004 : 0), at = s => t0 + s * sp + late(s) + (rnd() - 0.5) * 0.008;
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.25;
      const clip = (t, d) => Math.min(d, barEnd - t - 0.03);
      // (every note of the intro's last bar is let go before the loop's first bar line: whatever rang over it would be
      // missing when the loop comes round)
      const N = (stem, id, m, tt, o = {}) => { if (preLoop) { if (tt > barEnd - 0.03) return; o = { ...o, dur: Math.min(o.dur ?? 10, barEnd - tt - 0.02), rel: Math.min(o.rel ?? 0.25, 0.08) }; } S.note(stem, id, m, tt, o); };
      const funk = (intro && i >= 1) || A || big || (build && i >= 1);   // (the full-time groove)
      const piano = (m, s, d, v) => N('piano', 'piano', m, at(s), { dur: Math.max(0.1, d), vel: vel(v * 0.85), pan: 0.1, rel: 0.18, att: 0.002 });
      const brass = (id, m, s, d, v, pan, o = {}) => { N('brass', id, m, at(s), { dur: d, vel: vel(v), pan, att: o.att ?? 0.02, rel: o.rel ?? 0.12, gain: o.gain ?? 1 }); if (o.piano !== false) piano(m, s, d, v); };

      // ---- strings: the glow's pad (cellos and the bass on the root, violas and violins voiced smoothly), a thinner pad at the climax ----
      if (lift || big || calm || build) {
        const sv = lift ? 0.55 : big ? 0.5 : calm ? 0.5 : 0.4 + 0.05 * i;
        N('strings', 'vcSus', atOrAbove(root, 38), t0, { dur: held, vel: sv, pan: -0.4, att: 0.15, rel: hr, gain: calm ? 0.8 : 1 });
        if (lift) N('strings', 'cbSus', atOrAbove(root, 28) + (atOrAbove(root, 28) < 33 ? 12 : 0), t0, { dur: held, vel: 0.5, pan: -0.2, att: 0.15, rel: hr });
        const PU = lift ? burrowsUpper(PC) : big && isMaj7(PC) ? { ...PC, tones: PC.tones.filter(p => p !== PC.root && p !== pc(PC.root + 11)) } : burrowsTriad(PC);   // (the climax's tune sits on the seventh: its pad keeps the third and fifth)
        pad = voicing(PU, lift ? 60 : 57, lift ? 4 : 3, pad && pad.length === (lift ? 4 : 3) && pad.every(m => PU.tones.includes(pc(m))) ? pad : null);
        pad.forEach((m, k) => N('strings', k < 2 ? 'vlaSus' : 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: sv * (k < 2 ? 0.9 : 0.8), pan: -0.2 + k * 0.18, att: lift ? 0.25 : 0.12, rel: hr - 0.03, gain: big ? 1.5 : calm ? 0.7 : 1 }));
      }

      for (let s = 0; s < 16; s++) {
        const t = t0 + s * sp + late(s), down = s % 4 === 0;
        // ---- the pizzicato funk bass (basses, cellos an octave up on the accents) ----
        if (funk && BASS[s] != null) {
          const r = atOrAbove(root, 38), iv = BASS[s], m = r + (iv === 10 && !PC.tones.includes(pc(r + 10)) ? 7 : iv) + (iv === 7 && !PC.tones.includes(pc(r + 7)) ? 5 : 0);
          const v = (big ? 0.78 : 0.68) * (s === 0 ? 1 : s === 6 || s === 14 ? 0.85 : 0.7);
          N('strings', 'cbPizz', m, at(s), { dur: clip(t, sp * (s === 0 ? 2.5 : 1.6)), vel: vel(v), pan: -0.1, rel: 0.1 });
          if (s === 0 || s === 6 || s === 14) N('strings', 'vcPizz', m + 12, at(s), { dur: clip(t, sp * 1.5), vel: vel(v * 0.8), pan: -0.3, rel: 0.1 });
        }
        // the glow's bass: long pizzicato notes on 1 and the and of 2 (half time); the break's: sparse
        if ((lift && (s === 0 || s === 6)) || (calm && (s === 0 || s === 10))) N('strings', 'cbPizz', atOrAbove(root, 38), at(s), { dur: clip(t, sp * 5), vel: vel(lift ? 0.6 : 0.5), pan: -0.1, rel: 0.25 });
        // the build: rising pizzicato 8ths
        if (build && s % 2 === 0) { const r = atOrAbove(root, 38), m = r + [0, 7, 12, 7, 0, 7, 12, 19][s / 2]; N('strings', 'vcPizz', nearestTone(PC, m + 12), at(s), { dur: clip(t, sp * 1.6), vel: vel(0.45 + 0.08 * i), pan: -0.3, rel: 0.12 }); }
        // ---- the harp's glow: 8ths rippling up and down the chord over two octaves ----
        if ((lift || calm) && s % 2 === 0) {   // (and softly through the break)
          const HU = burrowsUpper(PC), base = atOrAbove(C.root, 55), tones = []; for (let m = base; m < base + 24; m++) if (HU.tones.includes(pc(m))) tones.push(m);
          const k = s / 2, idx = k < 4 ? k * 2 : (7 - k) * 2 + 1, m = tones[Math.min(tones.length - 1, Math.round(idx * (tones.length - 1) / 7))];
          N('strings', 'harp', m, at(s), { dur: clip(t, sp * 6), vel: vel((calm ? 0.42 : 0.5) + 0.12 * (s % 8 === 0)), pan: 0.35 - idx * 0.05, rel: 0.12, gain: calm ? 0.55 : 1 });
        }
        // ---- the tunes ----
        const tn = tune[s];
        if (tn && hookOn) {
          const [m0, len] = tn, m = X(m0), d = len * sp, w = WHO[i];
          if (A) {
            if (w === 'call' || w === 'both') {
              N('winds', 'clarStac', m, at(s), { dur: d * 0.6, vel: vel(0.72), pan: 0.15, rel: 0.08, gain: 0.85 });
              N('winds', 'bsnStac', m - 12, at(s), { dur: d * 0.6, vel: vel(0.7), pan: -0.2, rel: 0.08, gain: 0.85 });
            }
            if (w === 'answer' || w === 'both') {
              N('winds', 'marimba', m, at(s), { dur: clip(at(s), d * 0.9), vel: vel(0.65), pan: -0.3, rel: 0.1, gain: 0.7 });
              N('winds', 'xylo', m + 12, at(s), { dur: clip(at(s), d * 0.8), vel: vel(0.5), pan: 0.35, rel: 0.08, gain: 0.7 });
              N('strings', 'vlnPizz', m, at(s), { dur: clip(at(s), d), vel: vel(0.6), pan: 0.25, rel: 0.1 });
            }
            if (w === 'both') brass('hnStac', m - 12, s, d * 0.6, 0.5, -0.2, { att: 0.005 });   // (the horns join the last two bars: a taste of the climax)
          } else {   // the climax: staccato trumpets and horns, clarinet and bassoon, xylophone and staccato flute on top
            brass('tptStac', m, s, d * 0.6, 0.95, 0.15, { att: 0.005, gain: 1.6 });
            brass('hnStac', m - 12, s, d * 0.6, 0.8, -0.2, { att: 0.005, piano: false, gain: 1.4 });
            if (C.tones.includes(pc(m))) brass('tbnStac', m - (m - 12 > 65 ? 24 : 12), s, d * 0.6, 0.62, 0.3, { att: 0.005, piano: false });
            N('winds', 'clarStac', m, at(s), { dur: d * 0.6, vel: vel(0.6), pan: 0.2, rel: 0.08 });
            N('winds', 'bsnStac', m - 12, at(s), { dur: d * 0.6, vel: vel(0.6), pan: -0.25, rel: 0.08 });
            N('winds', 'xylo', m + 12, at(s), { dur: clip(at(s), d * 0.8), vel: vel(0.45), pan: 0.4, rel: 0.08, gain: 0.85 });
            N('winds', 'fluteStac', m + 12, at(s), { dur: d * 0.6, vel: vel(0.5), pan: -0.35, rel: 0.08 });
          }
        }
        if (tn && intro) { const [m, len] = tn; N('winds', 'bsnStac', m - 12, at(s), { dur: clip(at(s), len * sp * 0.6), vel: vel(0.62), pan: -0.15, rel: 0.08, gain: 1.4 }); }
        if (tn && calm) {   // the break: the low clarinet calls (bars 1-2), the marimba answers (3-4)
          const [m, len] = tn;
          if (i < 2) N('winds', 'clar', m - 12, at(s), { dur: Math.min(len * sp * 0.8, barEnd - at(s) - 0.05), vel: vel(0.55), pan: -0.15, att: 0.01, rel: 0.1, gain: 2.2 });
          else N('winds', 'marimba', m, at(s), { dur: clip(at(s), len * sp), vel: vel(0.6), pan: 0.25, rel: 0.12, gain: 2 });
        }
        if (tn && lift) {   // the glow: the horn sings, the flute an octave up (the violins join for the second half)
          const [m, len] = tn, d = len * sp;
          brass('hnSus', m - 12, s, d * 0.94, 0.8, -0.2, { att: 0.06, rel: 0.22 });
          N('winds', 'flute', m, at(s), { dur: d * 0.94, vel: vel(0.6), pan: 0.25, att: 0.05, rel: 0.22, gain: 1.4 });
          if (i >= 4) N('strings', 'vlnSus', m, at(s), { dur: d * 0.94, vel: vel(0.55), pan: 0.35, att: 0.08, rel: 0.22 });
        }
        // the climax's horn-section hits: chord stabs in the rests at the end of every other bar
        if ((big || A) && i % 2 === 1 && s === 14 && !tune[s]) voicing(burrowsTriad(F(s, 2)), 58, 3).forEach((m, k) => brass('hnStac', m, s, 0.15, 0.6, -0.3 + k * 0.15, { att: 0.005, rel: 0.08 }));
        if (build && s === 0) voicing(burrowsTriad(C), 53, 2).forEach((m, k) => brass('hnSus', m, 0, bar * 0.92, 0.4 + 0.12 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.12 }));

        // ---- winds: marimba stabs on the offbeats; the xylophone's scurries; the glow's glockenspiel ----
        if ((A || big || calm || (intro && i >= 2) || build) && STAB.includes(s)) {
          voicing(burrowsTriad(F(s, 2)), 62, 3).forEach((m, k) => N('winds', 'marimba', m, at(s), { dur: clip(t, sp * 1.2), vel: vel((s === 2 || s === 10 ? 0.55 : 0.42) * (A && WHO[i] !== 'call' ? 0.7 : 1)), pan: -0.4 + k * 0.1, rel: 0.08, gain: A ? 0.4 : calm ? 0.9 : 0.8 }));
        }
        // a scurry down the scale at the end of every fourth bar of the hook and in the build's last bar (up)
        if (((hookOn && i % 4 === 3) || (build && i === 3)) && s >= 12 - (build ? 4 : 0) && !(hookOn && tune[s])) {
          const sc = [0, 2, 3, 5, 7, 9, 10], r = atOrAbove(root, 74), k = build ? s - 8 : 15 - s;
          const ok = sc.map(x => pc(2 + up + x)).filter(p => PC.tones.includes(p) || !PC.tones.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1));   // (the scale's notes that do not rub on the chord)
          const m = nearestTone({ tones: ok }, r + k * 2);
          N('winds', 'xylo', m, at(s), { dur: clip(t, sp * 1.1), vel: vel(0.45), pan: 0.4, rel: 0.06 });
        }
        if (lift && (s === 0 || s === 10)) N('winds', 'glock', atOrAbove(burrowsUpper(PC).tones[s ? 1 : 0], 84), at(s), { dur: clip(t, sp * 6), vel: 0.45, pan: 0.45, rel: 0.25 });

        // ---- percussion ----
        // (the very first moment is a hit: the game finds where an encoded file truly starts by its first sound)
        if (intro && i === 0 && s === 0) {
          N('perc', 'bdrum', null, 0, { vel: 0.6, filter: /^bdrum_(mp|f)_/, dur: 1.2, rel: 0.3, gain: 0.8 });
          N('perc', 'ethDrum', null, 0, { vel: 0.6, filter: /ethnicLowOpen_hit_f/, dur: 1.2, rel: 0.3, pan: -0.2 });
          N('perc', 'guiro', null, 0.02, { vel: 0.6, filter: /^Guiro-Slow/, dur: 1.6, rel: 0.3, pan: 0.35 });
        }
        const gv = intro ? [0.6, 0.75, 0.85, 0.9][i] : calm ? 1.5 : build ? 0.7 + 0.08 * i : big ? 1 : lift ? 0.7 : 0.85;
        // the bongos: the 16ths between the beats (all through; lighter in the glow), a roll building in the build
        if (!(intro && i === 0 && s < 4)) {
          if (build) N('perc', 'bongo', null, at(s), { vel: vel(0.25 + 0.5 * ((i * 16 + s) / 64) + 0.1 * down), filter: s % 2 ? /^High/ : /^Low/, pan: s % 2 ? 0.45 : 0.25, dur: 0.3, rel: 0.08, gain: 0.6 + 0.4 * ((i * 16 + s) / 64) });
          else if (BONGO[s] && !(lift && s % 2)) { const [h, w] = BONGO[s]; N('perc', 'bongo', null, at(s), { vel: vel(w * gv), filter: h === 'h' ? /^High/ : /^Low/, pan: h === 'h' ? 0.45 : 0.25, dur: 0.35, rel: 0.08, gain: 0.85 }); }
        }
        // the guiro: short scrapes on the offbeats of 2 and 4, a fast one every other bar
        if ((funk || lift || calm) && (s === 6 || s === 14) && !(lift && s === 6)) N('perc', 'guiro', null, at(s), { vel: vel(0.55), filter: /^Guiro-Hit/, pan: 0.35, dur: 0.4, rel: 0.08, gain: 0.85 * gv });
        if (funk && s === 10 && i % 2 === 1) N('perc', 'guiro', null, at(s), { vel: 0.5, filter: /^Guiro-Fast/, pan: 0.35, dur: 0.5, rel: 0.1, gain: 0.7 * gv });
        // the shaker in 16ths (accents off the beat), the cabasa on the offbeat 8ths
        if (!(intro && i === 0 && s < 4)) N('perc', 'shaker', null, at(s), { vel: s % 2 ? 0.6 : 0.35, pan: 0.55, dur: 0.25, rel: 0.05, gain: (s % 4 === 2 ? 0.75 : 0.45) * gv });
        if ((funk || lift) && s % 4 === 2) N('perc', 'cabasa', null, at(s), { vel: vel(0.5), pan: -0.45, dur: 0.4, rel: 0.08, gain: 0.75 * gv });
        // the kick (1, the and of 2, the and of 3; half time in the glow) and the backbeat with ghost notes
        const kick = funk && !(intro && i < 2) ? (s === 0 || s === 6 || s === 10 || (s === 15 && i % 2 === 1 && !intro)) : (lift || calm) && (s === 0 || (lift && s === 10));
        if (kick) N('perc', 'bdrum', null, t, { vel: (big ? 0.72 : 0.62) * (s === 0 ? 1 : 0.85), filter: /^bdrum_(mp|f)_/, dur: 0.8, rel: 0.2, gain: calm ? 0.55 : 0.75 });
        if ((funk && !(intro && i < 2)) && (s === 4 || s === 12)) N('perc', 'snare', null, t, { vel: vel(big ? 0.66 : 0.56), pan: 0.1, filter: /^snare1_(mp|f)_/, dur: 0.5, rel: 0.12 });
        if ((funk && !intro) && (s === 7 || s === 9 || s === 15)) N('perc', 'snare', null, at(s), { vel: vel(0.15), pan: 0.1, filter: /^snare1_(pp|ppp)_/, dur: 0.25, rel: 0.06, gain: 0.8 });
        if (lift && s === 8) N('perc', 'snare', null, t, { vel: 0.4, pan: 0.1, filter: /^snare1_rim/, dur: 0.4, rel: 0.1, gain: 0.7 });
        // the muted hand drum on the low syncopations
        if ((funk || calm) && (s === 3 || s === 11)) N('perc', 'ethMute', null, at(s), { vel: vel(0.5), filter: /ethnicLow_hit_(mp|f)/, pan: -0.25, dur: 0.5, rel: 0.1, gain: 0.8 * gv });
        // ---- the joins ----
        if (s === 0 && i === 0 && (A || big)) { N('perc', 'crash', null, t, { vel: big ? 0.85 : 0.7, filter: big ? /crash1_ff/ : /crash1_mf/, pan: 0.3, dur: 4, rel: 1, gain: big ? 0.75 : 0.55 }); N('perc', 'timp', null, t, { vel: big ? 0.65 : 0.5, filter: /Timpani[12]_Hit/, dur: 2, rel: 0.5, gain: 0.7 }); }
        if (s === 0 && i === 0 && lift) { N('perc', 'cym', null, t, { vel: 0.5, pan: -0.3, filter: /hit_softmall_(mp|f)$/, dur: 4, rel: 1, gain: 0.6 }); N('perc', 'nepBells', null, t, { vel: 0.5, filter: /fx_long/, dur: 6, rel: 1.5, pan: 0.4, gain: 0.8 }); }
        if (s === 0 && B.intoNew && (intro || build || A || lift)) rev('perc', 'cym', /hit_hardmall_f$/, t0 + bar, { len: bar * (intro || build ? 0.8 : 0.5), gain: intro || build ? 1.4 : 1.2 });
        // tom fills out of A (16ths, high to low)
        if (B.intoNew && A && s >= 12) N('perc', s % 2 ? 'tenorLo' : 'tenorHi', null, at(s), { vel: vel(0.5 + 0.05 * (s - 12)), pan: (13.5 - s) * 0.2, dur: 0.5, rel: 0.15 });
        // the build: guiro scrapes every bar, a timpani roll and toms into A
        if (build && s === 8) N('perc', 'guiro', null, at(s), { vel: 0.6, filter: /^Guiro-(M|Slow)/, pan: 0.35, dur: sp * 7, rel: 0.1, gain: 0.8 });
        if (build && i === 3 && s === 8) N('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: sp * 8, rel: 0.05, gain: 0.6 });
        if (build && i === 3 && s >= 12) N('perc', s % 2 ? 'tenorLo' : 'tenorHi', null, at(s), { vel: 0.6 + 0.05 * (s - 12), pan: (13.5 - s) * 0.2, dur: 0.5, rel: 0.15 });
      }
    });
  },
};
