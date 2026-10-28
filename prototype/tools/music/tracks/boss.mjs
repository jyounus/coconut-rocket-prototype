// "Boss": the boss fights (Gobblebloom, Geode King, Bellows Drake, and any boss level added later).
//
// The feel: the boss battles of the Donkey Kong Country Returns / Tropical Freeze scores (a feel, not their notes):
// urgent and epic, built from short phrases so it stays exciting on its fourth loop. A one-bar hammering brass motif
// (three repeated notes and a leap) answered bar by bar by spiccato violin runs; a timpani ostinato under everything,
// giant drums and snare driving a 4/4; a lift where the violins sing over hemiola stabs (brass chords every three
// eighths, 3 against 4) and a rising run; a short, tense break of tremolo, ticking and a heartbeat; then the last
// charge a whole step higher (G minor) with the organ, trumpets, gong and clash cymbals.
//
// Key: F minor (keyTr +3; harmonic minor on the dominant), the last charge up a whole step. 144 bpm, straight 16ths.
// Form (44 bars; the loop is bars 5-44, 66.7 s):
//   intro  4  a hit, the timpani ostinato, low tremolo, the motif's first stab in the horns
//   A      8  the motif: brass call (bars 1, 3, 5) and violin runs answer (2, 4, 6), together (7-8); Gb Neapolitan
//   B      12 Bbm Db Ab Eb Bbm Gb Db C, then Db Db C C: violins singing over hemiola stabs, then runs over the stabs
//   break  4  tense: tremolo, a ticking wood click, the heartbeat, the motif muted in the horns, D7 into the charge
//   climax 12 the motif a step up in horns, trumpets and trombones, violins and piccolo, the organ, gong and clashes
//   build  4  Db Bbm C C: a snare roll, horns swelling, the strings climbing, back to the motif
//
// Stems: strings (runs, ostinato, tremolo, the lift's tune), brass (motif, stabs, countermelody), piano (the brass
// lines), perc (timpani, giant drums, snare, cymbals, gong), winds (flute, piccolo, xylophone, bassoon, the organ).
import { ph, voicing, atOrAbove, nearestTone, pc, scaleNotes } from '../lib.mjs';

const CHORDS = {
  intro: ['Fm', 'Fm', 'Db', 'C'],
  A: ['Fm', 'Fm', 'Db', 'C', 'Fm', 'Fm', 'Gb', 'C'],
  B: ['Bbm', 'Db', 'Ab', 'Eb', 'Bbm', 'Gb', 'Db', 'C', 'Db', 'Db', 'C', 'C'],
  break: ['Fm', 'Db/F', 'Fm', 'D7'],
  climax: ['Fm', 'Fm', 'Db', 'C', 'Fm', 'Fm', 'Gb', 'C', 'Fm', 'Fm', 'Gb', 'C'],
  build: ['Db', 'Bbm', 'C', 'C'],
};
// the motif (call: the brass; answer: the violins' runs; both)
const THEME = ph(
  [[0, 65, 1], [1, 65, 1], [2, 65, 2], [4, 68, 4], [8, 67, 2], [10, 65, 2], [12, 72, 4]],
  [[0, 72, 1], [1, 70, 1], [2, 68, 1], [3, 67, 1], [4, 65, 1], [5, 67, 1], [6, 68, 1], [7, 70, 1], [8, 72, 2], [10, 77, 2], [12, 76, 2], [14, 77, 2]],
  [[0, 65, 1], [1, 65, 1], [2, 65, 2], [4, 68, 4], [8, 70, 2], [10, 68, 2], [12, 73, 4]],
  [[0, 72, 1], [1, 74, 1], [2, 76, 1], [3, 77, 1], [4, 79, 2], [6, 76, 2], [8, 72, 1], [9, 74, 1], [10, 76, 1], [11, 77, 1], [12, 79, 4]],
  [[0, 72, 1], [1, 72, 1], [2, 72, 2], [4, 75, 4], [8, 73, 2], [10, 72, 2], [12, 77, 4]],
  [[0, 80, 1], [1, 79, 1], [2, 77, 1], [3, 75, 1], [4, 77, 1], [5, 79, 1], [6, 80, 1], [7, 82, 1], [8, 84, 4], [12, 80, 4]],
  [[0, 78, 4], [4, 73, 2], [6, 70, 2], [8, 73, 2], [10, 78, 2], [12, 82, 4]],
  [[0, 79, 4], [4, 76, 2], [6, 72, 2], [8, 67, 4], [12, 72, 4]]);
const WHO = ['call', 'answer', 'call', 'answer', 'call', 'answer', 'both', 'both'];
// the lift's tune (violins in octaves, bars 1-8 of B)
const LIFT = ph(
  [[0, 77, 6], [6, 73, 2], [8, 70, 8]],
  [[0, 72, 6], [6, 73, 2], [8, 77, 8]],
  [[0, 75, 6], [6, 72, 2], [8, 68, 8]],
  [[0, 70, 8], [8, 67, 4], [12, 70, 4]],
  [[0, 73, 4], [4, 77, 4], [8, 82, 8]],
  [[0, 82, 6], [6, 78, 2], [8, 73, 8]],
  [[0, 77, 6], [6, 75, 2], [8, 73, 8]],
  [[0, 72, 4], [4, 76, 4], [8, 79, 8]]);
// the timpani ostinato (accents; low drums on the strong ones)
const TIMP = { 0: 1, 3: 0.55, 4: 0.75, 6: 0.5, 8: 0.95, 11: 0.55, 12: 0.75, 14: 0.5, 15: 0.6 };

export default {
  name: 'boss', label: 'Boss', bpm: 144, keyTr: 3, seed: 7741,
  form: [['intro', 4], ['A', 8], ['B', 12], ['break', 4], ['climax', 12], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 2 },
  keyOf: B => (B.ch === 'D7' ? { tonic: 7, scale: 'harmonic' } : { tonic: pc(5 + B.up), scale: B.C.root === pc(0 + B.up) ? 'harmonic' : 'minor' }),   // (the break's D7 is G minor's dominant)
  mix: { send: { strings: 0.3, brass: 0.26, perc: 0.18, winds: 0.3 }, level: { strings: 1.1, perc: 1.3, winds: 1.05 } },
  compose(S) {
    const { sp, bar, map, note, rev, rnd } = S;
    let pad = null, horn = 60;
    map.forEach(B => {
      const { sec, i, t0, C, up, b } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const root = C.bass, lv = intro ? i : 0;
      const th0 = A ? THEME[i] : big ? THEME[i < 8 ? i : i - 4] : null, who = A ? WHO[i] : big ? (i < 8 ? WHO[i] : 'both') : null;
      const tune = th0 || (lift && i < 8 ? LIFT[i] : calm && i % 2 === 0 ? THEME[0] : {});
      const pass = Object.values(tune).filter(([, l]) => l >= 2).map(([m]) => pc(th0 ? X(m) : m)).filter(p => !C.tones.includes(p));
      const keep = C.tones.filter(p => !pass.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1)), PC = keep.length >= 1 ? { ...C, tones: keep } : C;
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      const at = s => t0 + s * sp + 0.002 + rnd() * 0.005;
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.12 : 0), held = barEnd - t0 - 0.06, hr = preLoop ? 0.08 : 0.2, tp = t0 + 0.004;
      const clip = (t, d) => Math.max(0.04, Math.min(d, barEnd - t - 0.03));
      const piano = (m, s, l, v) => { const t = at(s); note('piano', 'piano', m, t, { dur: clip(t, l * sp * 0.92), vel: vel(v * 0.75), pan: 0.1, rel: preLoop ? 0.06 : 0.16, att: 0.002 }); };
      const brass = (id, m, s, l, v, pan, o = {}) => { const t = at(s); note('brass', id, m, t, { dur: clip(t, l * sp * (l <= 1 ? 0.75 : 0.9)), vel: vel(v), pan, att: o.att ?? 0.03, rel: o.rel ?? 0.12 }); if (o.piano !== false) piano(m, s, l, v); };
      // the scale for runs: F minor (harmonic over C), a step up at the climax
      const sc = scaleNotes(pc(5 + up), C.root === pc(0 + up) ? 'harmonic' : 'minor', 55, 88);
      const hemi = (lift || (big && i >= 8)) ? s => ((b * 16 + s) % 6 === 0) : () => false;   // (the hemiola: a stab every three eighths, 3 against 4)

      // ---- strings: the pad (tremolo in the break and the B section; sustained at the climax), the low drive ----
      const sv = intro ? 0.45 + 0.05 * lv : A ? 0.5 : lift ? 0.6 : big ? 0.72 : calm ? 0.45 : 0.5 + 0.1 * i;
      if (lift || big || calm || build) {
        pad = voicing(PC, 56, 3, pad && pad.every(m => PC.tones.includes(pc(m))) ? pad : null);
        pad.forEach((m, k) => note('strings', calm || lift ? 'vlnTrem' : k < 2 ? 'vlaSus' : 'vlnSus', m, tp, { dur: held, vel: calm ? 0.6 : sv * 0.8, pan: -0.15 + k * 0.22, att: calm ? 0.4 : 0.08, rel: hr, gain: calm ? 0.55 : lift ? 1 : 0.9 }));
      }
      if (intro || calm) note('strings', 'vcTrem', atOrAbove(root, 41), tp, { dur: held, vel: 0.6, pan: -0.4, att: 0.2, rel: hr, gain: intro ? 0.8 + 0.15 * lv : 0.9 });
      if (intro && i >= 1) note('strings', 'vlnTrem', atOrAbove(PC.tones[PC.tones.length - 1], 64), tp, { dur: held, vel: 0.6, pan: 0.4, att: 0.3, rel: hr, gain: 0.4 + 0.1 * lv });
      if (intro || calm || big || build) note('strings', 'cbSus', atOrAbove(root, 29) < 33 ? atOrAbove(root, 29) + 12 : atOrAbove(root, 29), tp, { dur: held, vel: big ? 0.7 : intro ? 0.6 : 0.45, pan: -0.2, att: 0.1, rel: hr });
      if (calm && i === 3) note('strings', 'vlnTrem', 81, tp, { dur: held, vel: 0.45, pan: 0.5, att: bar * 0.7, rel: 0.06, gain: 0.9 });   // (a rising shriek of tension: A over D7)

      for (let s = 0; s < 16; s++) {
        const t = at(s);
        // ---- the low drive: cellos and basses in spiccato eighths (sixteenths at the climax's end) ----
        if ((A || lift || big || (build && i >= 1) || (intro && i >= 2 && !(preLoop && s >= 12))) && (s % 2 === 0 || (big && i >= 8))) {
          const m = atOrAbove(root, 41), v = (intro ? 0.45 : big ? 0.75 : lift ? 0.62 : build ? 0.5 + 0.08 * i : 0.62) * (s % 4 === 0 ? 1 : 0.78);
          note('strings', 'vcSpic', m + (s % 8 === 6 ? 12 : 0), t, { dur: sp * 0.9, vel: vel(v), pan: -0.3, rel: 0.06 });
          if (s % 4 === 0) note('strings', 'cbSpic', m - 12 < 30 ? m : m - 12, t, { dur: sp * 1.4, vel: vel(v), pan: -0.15, rel: 0.08 });
        }
        // ---- the motif and its answers ----
        const th = th0 ? th0[s] : null;
        if (th) {
          const [m0, l] = th, m = X(m0), d = l * sp;
          if (who === 'call' || who === 'both') {
            const v = (big ? 0.92 : 0.75) * (l === 1 && s % 4 !== 0 ? 0.85 : 1);
            brass('hnSus', m - 12, s, l, v, -0.25);
            brass('tptSus', m > 82 ? m - 12 : m, s, l, v * (big ? 0.95 : 0.8), 0.25, { piano: false });
            if (big && C.tones.includes(pc(m))) brass('tbnSus', atOrAbove(pc(m), 46), s, l, 0.75, 0.1, { piano: false });
            if (A && who === 'call') note('winds', 'bsnStac', m - 24 < 34 ? m - 12 : m - 24, t, { dur: clip(t, d * 0.6), vel: vel(0.6), pan: -0.2, rel: 0.08 });
            if (l <= 2) note('winds', 'xylo', m + 12, t, { dur: clip(t, sp * 1.2), vel: vel(0.55), pan: -0.4, rel: 0.1, gain: 0.9 });
          }
          if (who === 'answer' || who === 'both') {
            const long = l >= 2 && who === 'both';
            note('strings', long ? 'vlnSus' : 'vlnSpic', m, t, { dur: clip(t, d * (long ? 0.9 : 0.85)), vel: vel(big ? 0.85 : 0.75), pan: 0.3, att: long ? 0.03 : 0.004, rel: 0.08 });
            note('strings', long ? 'vlaSus' : 'vlaSpic', m - 12, t, { dur: clip(t, d * 0.85), vel: vel(0.6), pan: 0.15, att: long ? 0.03 : 0.004, rel: 0.08 });
            note('winds', l <= 1 ? 'fluteStac' : 'flute', m + 12, t, { dur: clip(t, d * 0.85), vel: vel(0.5), pan: -0.2, att: 0.01, rel: 0.08 });
            if (big) note('winds', l <= 1 ? 'piccStac' : 'picc', m + 12 >= 79 ? m + 12 : m + 24, t, { dur: clip(t, d * 0.85), vel: vel(0.45), pan: -0.35, att: 0.01, rel: 0.08, gain: 0.8 });
          }
          if (big && who === 'call' && s === 0) voicing(PC, 67, 3).forEach((mm, k) => note('strings', 'vlnTrem', mm, tp, { dur: held, vel: 0.6, pan: 0.2 + k * 0.1, att: 0.05, rel: hr }));
        }
        // ---- the lift's tune, violins in octaves; a horn countermelody; then runs over the hemiola ----
        const lf = lift && i < 8 ? LIFT[i][s] : null;
        if (lf) {
          const [m, l] = lf, d = l * sp;
          note('strings', 'vlnSus', m, t, { dur: clip(t, d * 0.94), vel: vel(0.82), pan: 0.25, att: 0.05, rel: 0.16 });
          note('strings', 'vlnSus', m - 12, t, { dur: clip(t, d * 0.94), vel: vel(0.68), pan: 0.4, att: 0.05, rel: 0.16, tune: 6 });
          note('strings', 'vcSus', m - 12, t, { dur: clip(t, d * 0.94), vel: vel(0.7), pan: -0.35, att: 0.05, rel: 0.16 });   // (the whole section in octaves)
          if (i >= 4) note('winds', 'flute', m + 12 <= 96 ? m + 12 : m, t, { dur: clip(t, d * 0.94), vel: vel(0.5), pan: -0.25, att: 0.04, rel: 0.16 });
          else note('winds', 'oboe', m, t, { dur: clip(t, d * 0.94), vel: vel(0.55), pan: -0.1, att: 0.04, rel: 0.16 });
        }
        if (lift && i < 8 && (s === 0 || s === 8)) {
          let m = nearestTone(PC, horn + (s === 8 ? (horn > 60 ? -2 : 2) : 0)); if (s === 8 && m === horn) m = nearestTone(PC, horn + (horn > 60 ? -3 : 3));
          horn = Math.max(53, Math.min(67, m));
          brass('hnSus', horn, s, 8, 0.66, -0.25, { att: 0.06 });
        }
        if ((lift && i >= 8) || (build && i >= 2 && !(B.intoNew && s === 15))) {   // (the build's run breathes before the downbeat)   // runs: up and down the scale in sixteenths, a little higher each bar
          const k = (lift ? i - 8 : i - 2), base = sc.findIndex(m => m >= atOrAbove(C.root, 60 + 2 * k)), j = s < 12 ? s : 22 - s;
          const m = sc[Math.min(sc.length - 1, base + j)];
          note('strings', 'vlnSpic', m, t, { dur: sp * 0.9, vel: vel(0.55 + 0.03 * j), pan: 0.3, rel: 0.06 });
          if (s % 2 === 0) note('strings', 'vlaSpic', m - 12, t, { dur: sp * 0.9, vel: vel(0.5), pan: 0.1, rel: 0.06 });
          if (lift) note('winds', 'fluteStac', m + 12 <= 96 ? m + 12 : m, t, { dur: sp * 0.8, vel: vel(0.45), pan: -0.25, rel: 0.05 });
        }
        // ---- brass: stabs (the hemiola in the lift and the climax's last four bars; on the 3-3-2 in A's answers) ----
        const stab = hemi(s) || (A && who === 'answer' && (s === 0 || s === 6 || s === 12)) || (intro && i >= 1 && (s === 0 || s === 6) && !preLoop);
        if (stab) {
          const v = big ? 0.85 : lift ? (i >= 8 ? 0.85 : 0.72) : intro ? 0.5 + 0.1 * lv : 0.62;
          voicing(PC, 53, 3).forEach((m, k) => note('brass', 'hnStac', m, t, { vel: vel(v), pan: -0.3 + k * 0.12, dur: 0.16, rel: 0.1 }));
          note('brass', 'tbnStac', atOrAbove(PC.tones.includes(root) ? root : PC.tones[0], 41), t, { vel: vel(v), pan: 0.15, dur: 0.2, rel: 0.1 });
          if (big || (lift && i >= 8)) note('brass', 'tptStac', voicing(PC, 65, 1)[0], t, { vel: vel(v * 0.9), pan: 0.3, dur: 0.16, rel: 0.1 });
          voicing(PC, 53, 3).forEach(m => piano(m, s, 1.5, v * 0.8));
          if (intro) { note('winds', 'bsnStac', atOrAbove(root, 41), t, { dur: 0.2, vel: vel(v), pan: -0.2, rel: 0.08 }); note('winds', 'clarStac', voicing(PC, 60, 1)[0], t, { dur: 0.18, vel: vel(v * 0.9), pan: 0.25, rel: 0.08 }); }
          if (hemi(s)) note('winds', 'xylo', atOrAbove(PC.tones[0], 72), t, { dur: clip(t, sp * 1.5), vel: vel(0.6), pan: -0.4, rel: 0.1 });
        }
        if (s === 0 && (lift || big)) note('brass', 'tubaSus', atOrAbove(root, 29) < 33 ? atOrAbove(root, 29) + 12 : atOrAbove(root, 29), tp, { dur: held, vel: big ? 0.7 : 0.55, pan: 0.05, att: 0.08, rel: hr });
        if (build && s === 0) voicing(C, 53, 3).forEach((m, k) => brass('hnSus', m, 0, 15, 0.35 + 0.13 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.1 }));
        // the break: the motif muted in the horns, far away; bassoon and clarinet pacing low
        if (calm && i % 2 === 0) { const mm = THEME[0][s]; if (mm) brass('hnSus', mm[0] - 12, s, mm[1], 0.35, -0.3); }
        if (calm && s % 4 === 0) { const m = atOrAbove(C.root, 41) + (s === 8 ? 7 : 0); note('winds', 'bsnStac', m, t, { dur: sp * 1.5, vel: vel(0.5), pan: -0.15, rel: 0.08 }); note('winds', 'clarStac', m + 12, t, { dur: sp * 1.5, vel: vel(0.42), pan: 0.2, rel: 0.08 }); }
        // ---- winds: the organ (pedal from the lift on; full chords at the climax), bassoon on the build ----
        if (s === 0 && (lift || big || build)) note('winds', 'organPedal', atOrAbove(root, 36), tp, { dur: held, vel: 0.8, pan: 0, att: 0.05, rel: hr, gain: big ? 1.2 : 0.9 });
        if (s === 0 && big) voicing(PC, 55, 4).forEach((m, k) => note('winds', 'organ', m, tp, { dur: held, vel: 0.8, pan: -0.2 + k * 0.13, att: 0.04, rel: hr, gain: 1.6 }));
        if (build && s % 4 === 0) note('winds', 'bsnStac', atOrAbove(C.root, 41) + (s === 8 ? 12 : 0), t, { dur: sp * 1.5, vel: vel(0.55 + 0.08 * i), pan: -0.2, rel: 0.08 });

        // ---- percussion ----
        const g = intro ? [0.6, 0.7, 0.8, 0.9][i] : calm ? 0.5 : build ? 0.7 + 0.08 * i : big ? 1 : lift ? 1 : 0.78;
        const pd = d => (preLoop ? clip(t, d) : d);
        // the timpani ostinato
        if (TIMP[s] != null && !calm && !(preLoop && s >= 12)) note('perc', 'timp', null, t, { vel: vel(g * TIMP[s] * 0.85), pan: -0.2, filter: TIMP[s] >= 0.9 ? /Timpani[12]_Hit/ : /Timpani[34]_Hit/, dur: pd(0.9), rel: 0.2, gain: intro ? 1 : 0.75 });
        // giant drums and bass drum on 1 and 3 (and the "and" of 3 once it lifts), the snare's backbeat
        if (!calm && !(intro && i < 1) && (s === 0 || s === 8 || ((lift || big) && s === 10))) {
          note('perc', 'bigSticks', null, t, { vel: vel(g * (s === 10 ? 0.6 : 0.85)), pan: 0, filter: /hit_(mp|mf|f|fff)_/, dur: pd(1), rel: 0.25, gain: big ? 1.2 : lift ? 1.05 : 0.9 });
          if (!intro) note('perc', 'bdrum', null, t, { vel: 0.6, filter: /^bdrum_(mp|f)_/, dur: 1, rel: 0.25, gain: 0.6 });
        }
        if ((A || lift || big) && (s === 4 || s === 12)) note('perc', 'snare', null, t, { vel: vel(big ? 0.78 : 0.65), pan: 0.1, filter: /^snare1_(mp|f|ff)_/, dur: 0.5, rel: 0.12 });
        if ((A || lift || big) && s % 2 === 1 && rnd() < 0.3) note('perc', 'snare', null, t, { vel: 0.2, pan: 0.1, filter: /^snare1_(pp|p)_/, dur: 0.2, rel: 0.05, gain: 0.8 });   // (ghost notes)
        // fills at the ends of four-bar phrases
        if ((A || big || lift) && i % 4 === 3 && s >= 12) note('perc', s % 2 ? 'tenorHi' : 'tenorLo', null, t, { vel: vel(0.6 + 0.05 * (s - 12)), pan: (s - 13.5) * 0.2, dur: 0.5, rel: 0.15, gain: 0.85 });
        // cymbals: crash on phrase starts, clash cymbals on the climax's tutti, the gong into the charge
        if (s === 0 && (A || lift || big) && i % 4 === 0) note('perc', 'crash', null, t, { vel: big ? 0.8 : 0.65, pan: 0.3, filter: /ff_|mf_/, dur: 3, rel: 0.8, gain: big ? 0.85 : 0.7 });
        if (s === 0 && big && (i === 6 || i === 8 || i === 10)) note('perc', 'clash', null, t, { vel: 0.8, pan: -0.3, filter: /ff_(loose|tight)$/, dur: 3, rel: 0.8, gain: 0.55 });
        if (s === 0 && big && i === 0) note('perc', 'gong', null, t, { vel: 0.95, pan: -0.1, dur: 6, rel: 1.5, gain: 0.9 });
        if (s === 0 && lift && i === 8) note('perc', 'gong', null, t, { vel: 0.6, pan: -0.1, dur: 4, rel: 1, gain: 0.6 });
        if (big && (s === 2 || s === 6 || s === 10 || s === 14)) note('perc', 'tamb', null, t, { vel: 0.5, pan: -0.5, filter: /^Tamb1-Hit/, dur: 0.4, rel: 0.08, gain: 0.8 });
        // the break: a ticking clock (wood clicks), the heartbeat on the hand drum
        if (calm && s % 2 === 0) note('perc', 'wood', null, t, { vel: s % 4 ? 0.35 : 0.5, pan: 0.4, filter: /^wood_click_(mp|pp_1|f)$/, dur: 0.25, rel: 0.05, gain: 1.1 });
        if (calm && (s === 0 || s === 3)) note('perc', 'bigHand', null, t, { vel: s === 0 ? 0.6 : 0.45, filter: /hit_(p|mp|f)_/, dur: 1.2, rel: 0.3, gain: 1.2 });
        // the joins: a reversed cymbal into each new section, a timpani roll into the charge and back into the motif
        if (s === 0 && B.intoNew && !big) rev('perc', 'cym', /hit_hardmall_f$/, t0 + bar - (preLoop ? 0.02 : 0.012), { len: bar * (calm || build ? 0.95 : 0.6), gain: calm ? 1.7 : 1.3 });
        if (s === 8 && B.intoNew && (intro || calm || build)) note('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: barEnd - t - (intro ? 0.1 : 0), rel: intro ? 0.1 : 0.05, gain: intro ? 0.5 : 0.7 });
        if (build && i === 0 && s === 0) for (let k = 0; k < 125; k++) note('perc', 'snare', null, t0 + 0.003 + k * sp / 2, { vel: 0.15 + 0.6 * (k / 128) ** 1.4, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.2, rel: 0.06 });
        if (build && i === 3 && s >= 8 && s % 2 === 0) note('perc', s % 4 ? 'tenorHi' : 'tenorLo', null, t, { vel: 0.5 + 0.03 * s, pan: (s - 11) * 0.12, dur: 0.5, rel: 0.15, gain: 0.8 });
        // (the first moment is a hit)
        if (intro && i === 0 && s === 0) { note('perc', 'bigSticks', null, 0, { vel: 0.8, filter: /hit_(f|fff)_/, dur: 2, rel: 0.5 }); note('perc', 'gong', null, 0.003, { vel: 0.6, dur: 4, rel: 1, gain: 0.6 }); }
      }
    });
  },
};
