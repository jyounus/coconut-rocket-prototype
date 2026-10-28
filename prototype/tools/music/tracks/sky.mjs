// "Sky": cliffs, heights and stars (Gull Cliffs, Starfall Summit, Beanstalk Heights).
//
// The feel: the high cliff and cloud stages of the Donkey Kong Country Returns / Tropical Freeze scores (a feel, not
// their notes): E-flat major, wide and heroic. A long melody that climbs, horns calling and violins answering, then the
// two together in octaves; flute (and piccolo at the climax) runs like gusts of wind between the phrases; a galloping
// spiccato in the cellos and basses under an open, driving 4/4 of bass drum, snare, timpani, crash cymbals and tom fills;
// a lyrical lift that turns to D-flat, which becomes the dominant of G-flat: the climax is the theme in full brass a
// minor third up (G-flat major), trumpets and horns in unison, violins, piccolo on top. A half-time breather of harp
// and solo flute, then a snare-roll build home. (Tempo 122 rather than the plan's 120: a hair more lift, and apart from
// the classic jungle's 120.)
//
// Form (122 bpm, 36 bars; the loop is bars 5-36, 62.9 s):
//   intro  4  Ebsus2 / Ab/Eb: timpani and a horn fanfare, flute gusts, a tremolo shimmer, toms into the theme
//   A      8  the theme: horns call (bars 1-2), violins answer (3-4), together in octaves (5-8); the gallop and the drums
//   B      8  the lift (Ab Bb Gm Cm Fm Ab Bbsus4 Db): violins in octaves with the flute, horn countermelody, harp, a
//              bigger groove with the snare on the off-beat sixteenths; D-flat at the end
//   climax 8  the theme in G-flat: trumpets and horns in unison, violins above, trombones and tuba, piccolo and flute
//              gusts, glockenspiel, crash cymbals every four bars
//   break  4  half time: harp, solo flute, violin pad; the bass drum and a soft snare on three
//   build  4  Cm Ab Bbsus4 Bb: snare roll crescendo, horns and trumpets swelling, string runs, toms into the theme
//
// Stems: strings (pad, gallop, violin melody, harp, runs), brass (horn and trumpet theme, countermelody, low brass,
// swells), piano (the horn and trumpet lines on piano), perc (drums, timpani, cymbals), winds (flute, piccolo, glockenspiel).
import { ph, voicing, atOrAbove, nearestTone, pc, scaleNotes } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['Ebsus2', 'Ab/Eb', 'Ebsus2', 'Bbsus4'],
  A: ['Eb', 'Ab/Eb', 'Bb/D', 'Cm', 'Ab', 'Eb/G', 'Fm7', 'Bb'],
  B: ['Abadd9', 'Bb', 'Gm7', 'Cm', 'Fm7', 'Ab', 'Bbsus4', 'Db'],
  climax: ['Eb', 'Ab/Eb', 'Bb/D', 'Cm', 'Ab', 'Eb/G', 'Fm7', 'Bb'],
  break: ['Abadd9', 'Eb/G', 'Fm7', 'Ab/Bb'],
  build: ['Cm', 'Ab', 'Bbsus4', 'Bb'],
};
// the theme (in E-flat; the climax plays it a minor third up): a long line that climbs to C, then home
const THEME = ph(
  [[0, 70, 2], [2, 75, 6], [8, 77, 2], [10, 79, 6]],
  [[0, 80, 8], [8, 79, 2], [10, 77, 2], [12, 75, 4]],
  [[0, 77, 6], [6, 74, 2], [8, 70, 4], [12, 72, 4]],
  [[0, 75, 10], [10, 74, 2], [12, 72, 2], [14, 74, 2]],
  [[0, 75, 2], [2, 80, 6], [8, 82, 2], [10, 84, 6]],
  [[0, 82, 6], [6, 80, 2], [8, 79, 4], [12, 84, 4]],
  [[0, 84, 6], [6, 82, 2], [8, 80, 4], [12, 77, 4]],
  [[0, 82, 6], [6, 77, 2], [8, 79, 2], [10, 77, 2], [12, 74, 2], [14, 70, 2]]);
const WHO = ['horn', 'horn', 'vln', 'vln', 'both', 'both', 'both', 'both'];
// the lift's melody (violins in octaves)
const LIFT = ph(
  [[0, 84, 8], [8, 79, 4], [12, 80, 4]],
  [[0, 82, 6], [6, 77, 2], [8, 74, 8]],
  [[0, 77, 4], [4, 79, 4], [8, 82, 4], [12, 86, 4]],
  [[0, 84, 12], [12, 82, 2], [14, 79, 2]],
  [[0, 80, 6], [6, 79, 2], [8, 77, 4], [12, 72, 4]],
  [[0, 75, 4], [4, 80, 4], [8, 84, 8]],
  [[0, 87, 6], [6, 84, 2], [8, 82, 8]],
  [[0, 80, 6], [6, 77, 2], [8, 85, 8]]);
// the intro's fanfare (horns, an octave down) and the breather's flute solo
const FANFARE = ph([], [[4, 70, 2], [6, 75, 2], [8, 77, 8]], [[0, 75, 2], [2, 77, 2], [4, 79, 4], [8, 82, 8]], [[0, 82, 6], [6, 80, 2], [8, 77, 6]]);
const SOLO = ph(
  [[0, 84, 8], [8, 82, 4], [12, 80, 4]],
  [[0, 79, 8], [8, 75, 4], [12, 82, 4]],
  [[0, 80, 6], [6, 79, 2], [8, 77, 8]],
  [[0, 75, 4], [4, 77, 4], [8, 80, 4], [12, 82, 4]]);
// the gallop (dah-da-da) in the low strings: accent per sixteenth (0: rest)
const GALLOP = [1, 0, 0.6, 0.7, 0.85, 0, 0.55, 0.65, 0.95, 0, 0.6, 0.7, 0.85, 0, 0.55, 0.65];

export default {
  name: 'sky', label: 'Sky', bpm: 122, keyTr: 1, seed: 2207,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 3 },
  keyOf: B => ({ tonic: pc(3 + B.up), scale: B.sec === 'B' && B.i === 7 ? 'mixolydian' : 'major' }),
  mix: { send: { strings: 0.3, brass: 0.3, winds: 0.36, perc: 0.2 }, level: { strings: 1.05, perc: 1.15, winds: 1.0, brass: 1.0 }, room: 0.88, master: 0.65 },
  compose(S) {
    const { sp, bar, map, note, rev, rnd } = S;
    let pad = null, horn = 63;
    map.forEach(B => {
      const { sec, i, t0, C, up } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const root = C.bass, r2 = atOrAbove(root, 36);
      const tune = (A || big) ? THEME[i] : lift ? LIFT[i] : intro ? FANFARE[i] : calm ? SOLO[i] : {};
      const pass = Object.values(tune).map(([m]) => pc(X(m))).filter(p => !C.tones.includes(p));
      const keep = C.tones.filter(p => !pass.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1)), PC = keep.length >= 2 ? { ...C, tones: keep } : C;
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      const at = s => Math.max(0, t0 + s * sp + (rnd() - 0.5) * 0.006);
      const piano = (m, s, len, v) => note('piano', 'piano', m, at(s), { dur: len * sp * 0.95, vel: vel(v * 0.85), pan: 0.1, rel: 0.15, att: 0.002 });
      const brass = (id, m, s, len, v, pan, o = {}) => { note('brass', id, m, at(s), { dur: len * sp * 0.93, vel: vel(v), pan, att: o.att ?? 0.04, rel: o.rel ?? 0.15 }); if (o.piano !== false) piano(m, s, len, v); };
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.18;
      // the wind: notes of the key that never sit a semitone from the chord, for the flute and piccolo runs
      const key = pc(3 + up), runNotes = lo => scaleNotes(key, 'major', lo, lo + 20).filter(m => ![...C.tones, ...pass].some(p => Math.abs(((pc(m) - p + 18) % 12) - 6) === 1));

      // ---- strings: the pad (violas and violins; cellos and basses held under the lift and the climax) ----
      const sv = intro ? 0.4 + 0.06 * i : A ? 0.45 : lift ? 0.55 : big ? 0.62 : calm ? 0.52 : 0.5 + 0.08 * i;
      pad = voicing(PC, 55, 3, pad && pad.filter(m => PC.tones.includes(pc(m))).length === pad.length ? pad : null);
      pad.forEach((m, k) => note('strings', k === 0 ? 'vlaSus' : 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: sv * 0.8, pan: -0.2 + k * 0.2, att: 0.12, rel: hr }));
      if (intro) note('strings', 'vlnTrem', atOrAbove(C.root, 79), t0, { dur: held, vel: 0.3 + 0.08 * i, pan: 0.4, att: 0.3, rel: hr });
      if (intro || lift || big || calm) note('strings', 'vcSus', atOrAbove(root, 39), t0, { dur: held, vel: sv * 0.85, pan: -0.35, att: 0.1, rel: hr });
      if (intro || lift || big) note('strings', 'cbSus', atOrAbove(root, 31) < 33 ? atOrAbove(root, 31) + 12 : atOrAbove(root, 31), t0, { dur: held, vel: sv * 0.85, pan: -0.15, att: 0.1, rel: hr });

      for (let s = 0; s < 16; s++) {
        const t = t0 + s * sp;
        // ---- the gallop: cellos and basses spiccato on the bass note, violas on the fifth at the lift and the climax ----
        if ((A || lift || big || (build && i < 3)) && GALLOP[s]) {
          const v = (big ? 0.78 : lift ? 0.7 : build ? 0.55 + 0.08 * i : 0.64) * GALLOP[s];
          note('strings', 'vcSpic', atOrAbove(root, 39), at(s), { dur: sp * 0.9, vel: vel(v), pan: -0.3, rel: 0.07 });
          note('strings', 'cbSpic', atOrAbove(root, 31) < 33 ? atOrAbove(root, 31) + 12 : atOrAbove(root, 31), at(s), { dur: sp * 0.9, vel: vel(v * 0.9), pan: -0.1, rel: 0.07 });
          if ((lift || big) && s % 2 === 0) { const vv = voicing(PC, 60, 2); note('strings', 'vlaSpic', vv[(s / 2) % 2], at(s), { dur: sp * 0.9, vel: vel(v * 0.75), pan: 0.25, rel: 0.07 }); }
        }
        if (build && i < 3 && s % 2 === 0) { const vv = voicing(C, 60, 3); note('strings', 'vlnSpic', vv[(s / 2) % 3] + 12, at(s), { dur: sp * 0.9, vel: vel(0.45 + 0.1 * i), pan: 0.3, rel: 0.07 }); }
        if (build && i === 3 && s % 2 === 0) note('strings', 'vcSpic', atOrAbove(root, 39), at(s), { dur: sp * 0.9, vel: vel(0.7), pan: -0.3, rel: 0.07 });
        // ---- the harp: eighths up the chord in the lift and the breather, a glissando into the theme ----
        if ((lift || calm) && s % 2 === 0) {
          const base = atOrAbove(C.root, 55), tones = []; for (let m = base; m < base + 24; m++) if (PC.tones.includes(pc(m))) tones.push(m);
          const m = tones[(s / 2) % tones.length];
          note('strings', 'harp', m, at(s), { dur: Math.min(sp * 6, barEnd - t - 0.03), vel: vel(calm ? 0.62 : 0.45), pan: 0.35, rel: 0.15 });
        }
        if (B.intoNew && (intro || lift || build) && s === 12) {   // (a glissando up the next chord's notes, in the bar's last beat)
          const N = B.next.C, tones = []; for (let m = 55; m < 91; m++) if (N.tones.includes(pc(m)) && C.tones.includes(pc(m))) tones.push(m);
          const g = tones.length >= 5 ? tones : scaleNotes(key, 'major', 60, 88).filter(m => C.tones.includes(pc(m)));
          g.slice(-12).forEach((m, k, a) => note('strings', 'harp', m, t + k * (sp * 4 - 0.06) / a.length, { dur: Math.max(0.05, barEnd - t - k * (sp * 4 - 0.06) / a.length - 0.03), vel: 0.4 + 0.3 * k / a.length, pan: -0.2 + k * 0.05, rel: 0.1 }));
        }
        // the string run out of the build (violins, up the key into the theme)
        if (build && i === 3 && s >= 8) { const r = runNotes(70); note('strings', 'vlnSpic', r[Math.min(r.length - 1, s - 8 + 2)], at(s), { dur: sp, vel: 0.5 + 0.04 * (s - 8), pan: 0.35, rel: 0.06 }); }

        // ---- the tunes ----
        const tn = tune[s];
        if (tn && (A || big)) {
          const [m0, len] = tn, m = X(m0), w = WHO[i], d = len * sp * 0.93;
          if (A) {
            if (w !== 'vln') brass('hnSus', m - 12, s, len, w === 'horn' ? 0.78 : 0.7, -0.2);
            if (w !== 'horn') note('strings', 'vlnSus', m, at(s), { dur: d, vel: vel(w === 'vln' ? 0.78 : 0.7), pan: 0.3, att: 0.04, rel: 0.15 });
            if (w === 'vln') note('strings', 'vlnSus', m - 12, at(s), { dur: d, vel: vel(0.6), pan: 0.45, att: 0.04, rel: 0.15, tune: 5 });
          } else {   // the climax: trumpets and horns in unison, violins an octave up, the piccolo on top in the second half
            brass('hnSus', m - 12, s, len, 0.88, -0.25);
            note('brass', 'tptSus', m - 12, at(s), { dur: d, vel: vel(0.72), pan: 0.15, att: 0.03, rel: 0.15 });
            note('strings', 'vlnSus', m, at(s), { dur: d, vel: vel(0.78), pan: 0.3, att: 0.04, rel: 0.15 });
            note('strings', 'vlnSus', m - 12, at(s), { dur: d, vel: vel(0.6), pan: 0.45, att: 0.04, rel: 0.15, tune: 5 });
            if (i >= 4) note('winds', 'picc', m + 12, at(s), { dur: d, vel: vel(0.45), pan: -0.25, att: 0.04, rel: 0.15 });
            if (s === 0 || len >= 6) note('winds', 'glock', m + 12, at(s), { dur: Math.min(sp * 4, barEnd - t - 0.06), vel: 0.45, pan: 0.4, rel: 0.2 });
            if (C.tones.includes(pc(m))) note('brass', 'tbnSus', atOrAbove(pc(m), 46), at(s), { dur: d, vel: vel(0.6), pan: 0.2, att: 0.04, rel: 0.15 });
          }
        }
        if (tn && lift) {
          const [m, len] = tn, d = len * sp * 0.94;
          note('strings', 'vlnSus', m, at(s), { dur: d, vel: vel(0.76), pan: 0.25, att: 0.06, rel: 0.15 });
          note('strings', 'vlnSus', m - 12, at(s), { dur: d, vel: vel(0.62), pan: 0.4, att: 0.06, rel: 0.15, tune: 6 });
          note('winds', 'flute', m, at(s), { dur: d, vel: vel(i >= 4 ? 0.55 : 0.4), pan: -0.2, att: 0.05, rel: 0.15 });
        }
        if (tn && intro) { const [m, len] = tn; brass('hnSus', m - 12, s, len, 0.55 + 0.08 * i, -0.2, { att: 0.05 }); if (B.last) note('brass', 'tptSus', m - 12, at(s), { dur: Math.min(len * sp * 0.93, barEnd - t - 0.2), vel: 0.5, pan: 0.15, att: 0.04, rel: 0.1 }); }
        if (tn && calm) { const [m, len] = tn; note('winds', 'flute', m, at(s), { dur: len * sp * 0.94, vel: vel(0.7), pan: 0.1, att: 0.05, rel: 0.2, gain: 1.35 }); }
        // the lift's horn countermelody: two long chord notes a bar, by the nearest step
        if (lift && (s === 0 || s === 8)) {
          let m = nearestTone(PC, horn + (s === 8 ? (horn > 63 ? -2 : 2) : 0)); if (s === 8 && m === horn) m = nearestTone(PC, horn + (horn > 63 ? -3 : 3));
          horn = Math.max(56, Math.min(70, m));
          brass('hnSus', horn, s, 8, 0.6, -0.25, { att: 0.08 });
        }
        // ---- winds: the flute's gusts (runs up the key between phrases; the piccolo joins at the climax) ----
        const gust = ((A || big) && i % 2 === 1 && s >= 8) || (lift && (i === 3 || i === 7) && s >= 8) || (intro && (i === 0 || i === 2) && s >= 8) || (build && i % 2 === 1 && s >= 8);
        if (gust) {
          const r = runNotes(atOrAbove(C.root, 68)), m = r[Math.min(r.length - 1, s - 8)], v = 0.32 + 0.03 * (s - 8) + (build ? 0.1 : 0);
          note('winds', 'flute', m, at(s), { dur: sp * 1.1, vel: vel(v), pan: -0.3, att: 0.01, rel: 0.08, gain: 1.5 });
          if (big || (build && i === 3)) note('winds', 'piccStac', m >= 82 ? m : m + 12, at(s), { dur: sp, vel: vel(v), pan: -0.4, rel: 0.08 });
        }
        // ---- brass: low brass under the lift and the climax, stabs on the climax's off-beats, swells in the build ----
        if (s === 0 && (lift || big)) {
          note('brass', 'tbnSus', atOrAbove(root, 41), t0, { dur: bar * 0.94, vel: big ? 0.55 : 0.45, pan: 0.2, att: 0.08, rel: 0.15 });
          if (big) note('brass', 'tubaSus', atOrAbove(root, 31) < 33 ? atOrAbove(root, 31) + 12 : atOrAbove(root, 31), t0, { dur: bar * 0.94, vel: 0.6, pan: 0.1, att: 0.08, rel: 0.15 });
        }
        if (lift && (s === 6 || s === 14) && i % 2 === 1) voicing(PC, 55, 3).forEach((m, k) => { note('brass', 'hnStac', m, at(s), { dur: 0.18, vel: vel(0.5), pan: -0.3 + k * 0.15, rel: 0.1 }); piano(m, s, 2, 0.45); });
        if (build && s === 0) {
          voicing(C, 55, 3).forEach((m, k) => brass('hnSus', m, 0, 15, 0.38 + 0.12 * i, -0.25 + k * 0.2, { att: bar * 0.55, rel: 0.12 }));
          if (i >= 2) voicing(C, 62, 2).forEach((m, k) => note('brass', 'tptSus', m, t0, { dur: bar * 0.93, vel: 0.45 + 0.12 * (i - 2), pan: 0.2 + k * 0.1, att: bar * 0.6, rel: 0.12 }));
          note('brass', 'tbnSus', atOrAbove(root, 41), t0, { dur: bar * 0.93, vel: 0.4 + 0.08 * i, pan: 0.2, att: bar * 0.4, rel: 0.12 });
        }

        // ---- percussion: an open, driving 4/4; half time in the breather ----
        const drive = A || lift || big || (build && i >= 2);
        if (intro && i === 0 && s === 0) {   // (the very first moment is a hit)
          note('perc', 'timp', null, 0, { vel: 0.8, filter: /Timpani[12]_Hit_v4/, dur: 2.5, rel: 0.6, gain: 0.9 });
          note('perc', 'bdrum', null, 0, { vel: 0.7, filter: /^bdrum_(f|mp)_/, dur: 2, rel: 0.5, gain: 0.8 });
          note('perc', 'cym', null, 0, { vel: 0.6, pan: 0.3, filter: /softmall_f$/, dur: 4, rel: 1, gain: 0.6 });
        }
        if (intro && (i === 1 || i === 3) && s === 0) note('perc', 'timpRoll', null, t, { vel: 0.8, filter: /Timpani[34]_Roll_v3/, dur: barEnd - t, rel: 0.1, gain: 0.35 + 0.15 * (i === 3) });
        if (drive) {
          const kick = s === 0 || s === 8 || ((lift || big) && (s === 10 || (s === 3 && i % 2)));
          if (kick) note('perc', 'bdrum', null, at(s), { vel: vel(big ? 0.85 : lift ? 0.75 : 0.65), filter: /^bdrum_(f|mp|ff)_/, dur: 1.5, rel: 0.4, gain: 0.85 });
          if (s === 4 || s === 12) note('perc', 'snare', null, at(s), { vel: vel(big ? 0.8 : lift ? 0.7 : 0.6), pan: 0.1, filter: /^snare1_(mp|f|ff)_/, dur: 0.8, rel: 0.2 });
          if (lift && (s === 7 || s === 15) && rnd() < 0.5) note('perc', 'snare', null, at(s), { vel: vel(0.3), pan: 0.1, filter: /^snare1_(p|mp)_/, dur: 0.4, rel: 0.1 });
          if ((lift || big) && s % 2 === 0) note('perc', 'tamb', null, at(s), { vel: vel(s % 4 ? 0.5 : 0.3), pan: -0.5, filter: /^Tamb1-Hit/, dur: 0.4, rel: 0.08, gain: 0.7 });
          if (s === 0 || (s === 8 && big)) note('perc', 'timp', null, at(s), { vel: big ? 0.75 : 0.6, pan: -0.15, filter: /Timpani[12]_Hit_v[34]/, dur: 2, rel: 0.5, gain: 0.75 });
        }
        if (build && i < 2 && (s === 0 || s === 8)) note('perc', 'bdrum', null, at(s), { vel: vel(0.5 + 0.1 * i), filter: /^bdrum_(f|mp)_/, dur: 1.5, rel: 0.4, gain: 0.8 });
        if (calm) {   // half time: the bass drum on one, a soft snare on three, timpani on the first beat
          if (s === 0) note('perc', 'bdrum', null, at(s), { vel: 0.55, filter: /^bdrum_(mp|p)_/, dur: 1.5, rel: 0.4, gain: 0.8 });
          if (s === 8) note('perc', 'snare', null, at(s), { vel: 0.4, pan: 0.1, filter: /^snare1_(p|mp)_/, dur: 0.8, rel: 0.2 });
          if (s === 0 && i % 2 === 0) note('perc', 'timp', null, t, { vel: 0.45, filter: /Timpani[12]_Hit_v[13]/, dur: 2.5, rel: 0.6, gain: 0.6 });
        }
        // crash cymbals on the big downbeats; a swell into each new section
        if (s === 0 && ((i === 0 && (A || lift || big)) || ((A || big) && i === 4))) note('perc', 'crash', null, t, { vel: big ? 0.85 : 0.7, pan: 0.35, filter: /_(f|ff|mf)/, dur: 4, rel: 1.2, gain: big ? 0.8 : 0.65 });
        if (s === 0 && i === 0 && big) note('perc', 'cym', null, t, { vel: 0.8, pan: -0.35, filter: /hit_hardmall_(f|fff)$/, dur: 4, rel: 1, gain: 0.6 });
        if (s === 0 && B.intoNew && !big) rev('perc', 'cym', /hit_hardmall_f$/, t0 + bar - (preLoop ? 0.15 : 0), { len: bar * 0.7, gain: build ? 1.6 : 1.3 });
        // tom fills at the ends of the phrases (low to high), bigger into a new section
        const fill = (A || lift || big) && (i === 3 || i === 7) && s >= (B.intoNew ? 8 : 12);
        if (fill || (intro && i === 3 && s >= 8 && s < 14) || (build && i === 3 && s >= 8)) note('perc', s % 4 < 2 ? 'tenorLo' : 'tenorHi', null, at(s), { vel: vel(0.55 + 0.03 * (s - 8)), pan: (s - 12) * 0.12, filter: /_(mf|f|ff)_/, dur: 0.6, rel: 0.2 });
        // the build: a snare roll crescendo over its four bars, the timpani rolling in its last
        if (build && i === 0 && s === 0) for (let k = 0; k < 128; k++) note('perc', 'snare', null, t + k * sp / 2, { vel: 0.15 + 0.65 * (k / 128) ** 1.3, pan: 0.1, filter: /^snare1_(pp|p|mp|f|ff)_/, dur: 0.25, rel: 0.08, gain: 1.15 });
        if (build && i === 3 && s === 0) note('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: bar - 0.05, rel: 0.05, gain: 0.6 });
        if (B.intoNew && lift && s === 8) note('perc', 'timpRoll', null, t, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: sp * 8, rel: 0.05, gain: 0.55 });
      }
    });
  },
};
