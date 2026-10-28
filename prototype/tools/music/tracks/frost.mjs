// "Frost": ice, storm and crystal (Amethyst Geode, Frost Hollow, Thunder Rift).
//
// The feel: the icy and stormy stages of the Donkey Kong Country Returns / Tropical Freeze scores (a feel, not their
// notes): B minor, glittering, cold and lonely at first, then thunder. The verses sway in a slow 12/8 (each bar four
// dotted beats): a shimmering bed of tremolo violins, harp rolling in eighths, high marimba like a celesta on the
// lilt's last eighth, glockenspiel, triangle and sleigh bells, a soft mallet heartbeat. The melody is a lonely clarinet
// doubled two octaves up by the glockenspiel (a music box), answered by high violins and harp; the lift turns to D major
// with the violins singing. Then the storm: a G-major chord makes the dominant of C minor, the beat snaps from the 12/8
// sway into straight double-time sixteenths, and the climax is the melody a semitone up in trumpets and horns over
// storming spiccato strings, timpani thunder, bass drum, snare, gong and crashes (the sway's lilting eighths become
// snapped dotted rhythms). A frozen breather (clarinet and flute alone, distant thunder) and a timpani-led build home.
//
// Form (92 bpm, 36 bars; the loop is bars 5-36, 83.5 s):
//   intro  4  Bsus2 Gadd9 Bm F#sus4: tremolo shimmer, harp, a glockenspiel music box, chimes
//   A      8  12/8: the clarinet (and glockenspiel) calls (bars 1-2, 5-6), violins and harp answer (3-4), together (7-8)
//   B      8  12/8, D major: violins in octaves, clarinet and flute, horn pad, sleigh bells, timpani; the G chord at the
//              end turns to C minor
//   climax 8  straight double time in C minor: trumpets and horns, violins, spiccato sixteenths, timpani thunder, drums
//   break  4  12/8 again, B: clarinet then flute alone over tremolo and harp, distant thunder
//   build  4  Em G F#sus4 F#: timpani in eighths growing, tremolo cellos, horns swelling, a cymbal swell home
//
// Stems: strings (tremolo bed, pad, harp, pizzicato, the answers and the lift, the storm's spiccato), brass (horn pad,
// the climax theme, low brass, swells), piano (the brass lines on piano), perc (timpani, drums, triangle, sleigh bells,
// chimes, cymbals, gong), winds (clarinet, flute, glockenspiel, marimba).
import { ph, voicing, atOrAbove, nearestTone, pc } from '../lib.mjs';

// ---- the score ----
const CHORDS = {
  intro: ['Bsus2', 'Gadd9', 'Bm', 'F#sus4'],
  A: ['Bm', 'G', 'Em7', 'F#m', 'Bm/D', 'G', 'Em7', 'F#'],
  B: ['D', 'A/C#', 'Bm7', 'A', 'G', 'Em7', 'Asus4', 'G'],
  climax: ['Bm', 'G', 'Em7', 'F#m', 'Bm/D', 'G', 'Em7', 'F#'],
  break: ['Bsus2', 'Gadd9', 'Em7', 'F#sus4'],
  build: ['Em', 'G', 'F#sus4', 'F#'],
};
// the tunes are written in eighths of the 12/8 bar (0-11, four dotted beats of three): [eighth, midi, length]
// the melody (B minor; the climax plays it a semitone up, in straight sixteenths)
const THEME = ph(
  [[0, 71, 3], [3, 78, 6], [9, 76, 2], [11, 74, 1]],
  [[0, 74, 6], [6, 71, 3], [9, 79, 3]],
  [[0, 78, 5], [5, 79, 1], [6, 76, 6]],
  [[0, 81, 6], [6, 78, 3], [9, 73, 3]],
  [[0, 71, 3], [3, 78, 6], [9, 76, 2], [11, 78, 1]],
  [[0, 83, 6], [6, 81, 2], [8, 79, 1], [9, 74, 3]],
  [[0, 79, 3], [3, 78, 3], [6, 76, 3], [9, 74, 3]],
  [[0, 73, 6], [6, 70, 3], [9, 66, 3]]);
const WHO = ['call', 'call', 'answer', 'answer', 'call', 'call', 'both', 'both'];
// the lift (D major), violins in octaves
const LIFT = ph(
  [[0, 81, 6], [6, 85, 3], [9, 83, 3]],
  [[0, 81, 6], [6, 76, 3], [9, 78, 3]],
  [[0, 74, 3], [3, 78, 3], [6, 83, 6]],
  [[0, 85, 6], [6, 81, 3], [9, 76, 3]],
  [[0, 78, 6], [6, 79, 2], [8, 83, 1], [9, 86, 3]],
  [[0, 83, 6], [6, 79, 3], [9, 76, 3]],
  [[0, 81, 6], [6, 76, 3], [9, 74, 3]],
  [[0, 74, 6], [6, 79, 3], [9, 71, 3]]);
// the intro's music box (glockenspiel and harp, high) and the breather's lonely clarinet (bars 1-2) and flute (3-4)
const BOX = ph([], [[0, 83, 3], [3, 90, 6], [9, 88, 2], [11, 86, 1]], [[0, 86, 6], [6, 83, 3], [9, 90, 3]], [[0, 85, 6], [6, 83, 3]]);
const ALONE = ph([[0, 71, 3], [3, 78, 6], [9, 76, 3]], [[0, 74, 6], [6, 71, 6]], [[0, 79, 5], [5, 78, 1], [6, 76, 6]], [[0, 73, 6], [6, 71, 3], [9, 73, 3]]);
// the sway's eighths to the storm's sixteenths: each dotted beat's three eighths land on its 1st, 3rd and 4th sixteenth
const E2S = e => 4 * Math.floor(e / 3) + [0, 2, 3][e % 3];

export default {
  name: 'frost', label: 'Frost', bpm: 92, keyTr: -3, seed: 3117,
  form: [['intro', 4], ['A', 8], ['B', 8], ['climax', 8], ['break', 4], ['build', 4]], loop: 4, join: 4,
  chords: CHORDS, up: { climax: 1 },
  keyOf: B => B.sec === 'B' ? { tonic: 2, scale: 'major' } : B.sec === 'climax' ? { tonic: 0, scale: 'harmonic' } : { tonic: 11, scale: B.C.tones.includes(10) ? 'harmonic' : 'minor' },
  mix: { send: { strings: 0.38, winds: 0.42, perc: 0.24, brass: 0.3 }, level: { strings: 1.1, perc: 1.2, winds: 1.1, brass: 1 }, room: 0.9, master: 0.66 },
  compose(S) {
    const { sp, bar, map, note, rev, rnd } = S, eb = bar / 12;
    let pad = null, hornPad = null;
    map.forEach(B => {
      const { sec, i, t0, C, up } = B, X = m => m + up;
      const intro = sec === 'intro', A = sec === 'A', lift = sec === 'B', big = sec === 'climax', calm = sec === 'break', build = sec === 'build';
      const sway = !big, root = C.bass, r2 = atOrAbove(root, 36);
      const tune = (A || big) ? THEME[i] : lift ? LIFT[i] : intro ? BOX[i] : calm ? ALONE[i] : {};
      const pass = Object.values(tune).map(([m]) => pc(X(m))).filter(p => !C.tones.includes(p));
      const keep = C.tones.filter(p => !pass.some(q => Math.abs(((p - q + 18) % 12) - 6) === 1)), PC = keep.length >= 2 ? { ...C, tones: keep } : C;
      const vel = v => Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.06));
      const ate = e => Math.max(0, t0 + e * eb + (e === 0 ? 0.001 + rnd() * 0.005 : (rnd() - 0.5) * 0.01));   // (an eighth of the sway; never early onto a bar line, so nothing struck is cut in two at the loop's seam)
      const at = s => Math.max(0, t0 + s * sp + (rnd() - 0.5) * 0.006);   // (a sixteenth of the storm)
      const piano = (m, t, d, v) => note('piano', 'piano', m, t, { dur: d, vel: vel(v * 0.85), pan: 0.1, rel: 0.15, att: 0.002 });
      const brass = (id, m, t, d, v, pan, o = {}) => { note('brass', id, m, t, { dur: d, vel: vel(v), pan, att: o.att ?? 0.05, rel: o.rel ?? 0.18 }); if (o.piano !== false) piano(m, t, d, v); };
      const preLoop = intro && B.last, barEnd = t0 + bar - (preLoop ? 0.15 : 0), held = barEnd - t0 - 0.05, hr = preLoop ? 0.1 : 0.2;

      // ---- strings: the shimmering bed (tremolo violins high), the pad, cellos and basses ----
      const pg = intro ? 1.5 : A ? 0.75 : build ? 1.2 : 1;   // (the pad's gain: its velocity also picks the samples' loudness layer)
      const sv = intro ? 0.5 + 0.04 * i : A ? 0.68 : lift ? 0.75 : big ? 0.6 : calm ? 0.42 : 0.6 + 0.06 * i;
      if (!big) voicing(PC, 74, 2).forEach((m, k) => note('strings', 'vlnTrem', m, t0, { dur: build && B.last ? held - 0.45 : held, vel: (intro ? 0.44 : calm ? 0.36 : build ? 0.4 + 0.06 * i : 0.42) + 0.03 * k, pan: 0.3 + 0.25 * k, att: 0.5, rel: hr, gain: intro ? 1.4 : 1 }));
      pad = voicing(PC, 54, 3, pad && pad.filter(m => PC.tones.includes(pc(m))).length === pad.length ? pad : null);
      pad.forEach((m, k) => note('strings', k === 0 ? 'vlaSus' : 'vlnSus', m, Math.max(0, t0 - 0.02), { dur: held + 0.01, vel: sv * (big ? 0.7 : 0.75), pan: -0.2 + k * 0.2, att: big ? 0.1 : 0.45, rel: hr, gain: pg }));
      note('strings', build ? 'vcTrem' : 'vcSus', atOrAbove(root, 38), t0, { dur: held, vel: build ? 0.4 + 0.12 * i : sv * 0.85, pan: -0.35, att: build ? bar * 0.5 : 0.3, rel: hr, gain: pg });
      if (lift || big || calm || intro) note('strings', 'cbSus', atOrAbove(root, 30) < 33 ? atOrAbove(root, 30) + 12 : atOrAbove(root, 30), t0, { dur: held, vel: sv * 0.8, pan: -0.15, att: 0.3, rel: hr });

      if (sway) for (let e = 0; e < 12; e++) {
        const t = t0 + e * eb, beat = e % 3 === 0;
        // ---- the harp: eighths rolling up and down two octaves of the chord ----
        if (!(intro && i === 0 && e < 1) && !(build && B.last && e >= 10)) {   // (the harp rests on the build's last two eighths: the timpani roll carries it home)
          const base = atOrAbove(C.root, 59), tones = []; for (let m = base; m < base + 24; m++) if (PC.tones.includes(pc(m))) tones.push(m);
          const idx = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1][e], m = tones[Math.round(idx * (tones.length - 1) / 6)];
          note('strings', 'harp', m, ate(e), { dur: Math.min(eb * 4, barEnd - t - 0.03), vel: vel((intro ? 0.65 : calm ? 0.55 : lift ? 0.6 : 0.55) + 0.12 * (e % 6 === 0)), pan: 0.4 - idx * 0.1, rel: 0.15, gain: intro ? 1.4 : A ? 1.25 : calm ? 0.8 : 1 });
        }
        // ---- pizzicato bass: the dotted beats (root, fifth), in the verses, the lift and the build ----
        if ((A || lift || build) && (e === 0 || e === 6 || (e === 9 && lift))) {
          const fifth = PC.tones.includes(pc(root + 7)) ? 7 : 12, m = r2 + (e === 6 ? fifth : e === 9 ? 12 : 0);
          note('strings', 'cbPizz', m, ate(e), { dur: Math.min(eb * 3, barEnd - t - 0.06), vel: vel(lift ? 0.62 : 0.55), pan: -0.1, rel: 0.25 });
          note('strings', 'vcPizz', m + 12, ate(e), { dur: Math.min(eb * 2.5, barEnd - t - 0.06), vel: vel(0.42), pan: -0.3, rel: 0.2 });
        }
        // ---- the tunes ----
        const tn = tune[e];
        if (tn && A) {
          const [m, len] = tn, w = WHO[i], d = len * eb * 0.94;
          if (w !== 'answer') {   // the clarinet, the glockenspiel two octaves up like a music box
            note('winds', 'clar', m, ate(e), { dur: d, vel: vel(0.75), pan: 0.1, att: 0.05, rel: 0.2, gain: 1.5 });
            note('winds', 'glock', m + 24, ate(e), { dur: Math.min(d, barEnd - t - 0.05), vel: vel(0.45), pan: 0.35, rel: 0.12, gain: 1.3 });
          }
          if (w !== 'call') {   // the answer: violins high (an octave up) and the harp
            note('strings', 'vlnSus', m + 12 > 88 ? m : m + 12, ate(e), { dur: d, vel: vel(w === 'both' ? 0.55 : 0.68), pan: 0.3, att: 0.08, rel: 0.2 });
            if (w === 'answer') note('strings', 'vlnSus', m, ate(e), { dur: d, vel: vel(0.5), pan: 0.45, att: 0.08, rel: 0.2, tune: 5 });
            note('strings', 'harp', m + 12, ate(e), { dur: Math.min(d, barEnd - t - 0.03), vel: vel(0.65), pan: -0.3, rel: 0.12 });
          }
        }
        if (tn && lift) {   // the lift: violins in octaves, clarinet under, flute on top in the second half
          const [m, len] = tn, d = len * eb * 0.94;
          note('strings', 'vlnSus', m, ate(e), { dur: d, vel: vel(0.74), pan: 0.25, att: 0.08, rel: 0.2 });
          note('strings', 'vlnSus', m - 12, ate(e), { dur: d, vel: vel(0.6), pan: 0.4, att: 0.08, rel: 0.2, tune: 6 });
          note('winds', 'clar', m - 12, ate(e), { dur: d, vel: vel(0.45), pan: -0.15, att: 0.06, rel: 0.2 });
          if (i >= 4) note('winds', 'flute', m, ate(e), { dur: d, vel: vel(0.5), pan: -0.25, att: 0.05, rel: 0.2 });
        }
        if (tn && intro) { const [m, len] = tn; note('winds', 'glock', m, ate(e), { dur: Math.min(len * eb * 0.9, barEnd - t - 0.2), vel: vel(0.6), pan: 0.3, rel: 0.12, gain: 1.8 }); note('strings', 'harp', m - 12, ate(e), { dur: Math.min(len * eb, barEnd - t - 0.2), vel: vel(0.5), pan: -0.3, rel: 0.15 }); }
        if (tn && calm) { const [m, len] = tn, fl = i >= 2; note('winds', fl ? 'flute' : 'clar', fl ? m + 12 : m, ate(e), { dur: len * eb * 0.94, vel: vel(0.66), pan: fl ? -0.15 : 0.1, att: 0.06, rel: 0.25, gain: 1.15 }); }
        // ---- winds: the celesta-like high marimba on the lilt's last eighth, glockenspiel sparkle ----
        if ((A || lift || (build && i >= 1)) && e % 3 === 2) { const v2 = voicing(PC, 79, 3); note('winds', 'marimba', v2[(e - 2) / 3 % 3], ate(e), { dur: Math.min(eb * 2, barEnd - t - 0.05), vel: vel(0.42), pan: -0.4, rel: 0.2, gain: 0.85 }); }
        if ((lift || calm) && (e === 0 || e === 6)) note('winds', 'glock', atOrAbove(PC.tones[(e / 6 + i) % PC.tones.length], 86), ate(e), { dur: Math.min(eb * 4, barEnd - t - 0.05), vel: vel(0.35), pan: 0.45, rel: 0.12, gain: 1.2 });

        // ---- percussion: sparse and crystalline ----
        if (intro && i === 0 && e === 0) {   // (the very first moment is a hit)
          note('perc', 'bigMallet', null, 0, { vel: 0.5, filter: /hit_(mf|f)_/, dur: 2, rel: 0.5, gain: 0.8 });
          note('strings', 'harp', 47, 0, { dur: bar * 0.9, vel: 0.7, pan: -0.1, rel: 0.4 });
          note('perc', 'chimes', null, 0, { vel: 0.45, pan: 0.4, filter: /windchimes_(slowDesc|desc)1/, dur: 4, rel: 1, gain: 0.8 });
        }
        if ((A || lift || build) && (e === 0 || e === 6 || (lift && e === 9))) note('perc', 'bigMallet', null, ate(e), { vel: vel(e ? 0.45 : 0.6), filter: /hit_(pp|mf)_/, dur: 1.5, rel: 0.4, gain: lift ? 1.6 : 1.4 });
        if ((lift || build) && (e === 0 || e === 6) && !(build && i === 3)) note('perc', 'bdrum', null, ate(e), { vel: vel(lift ? 0.5 : 0.4 + 0.1 * i), filter: /^bdrum3?_(p|mp)_/, dur: 1.5, rel: 0.4, gain: 0.8 });
        if ((A || lift || build || (intro && i >= 2)) && (e === 3 || e === 9)) note('perc', 'tri', null, ate(e), { vel: vel(0.4), pan: 0.55, filter: /HitM_/, dur: 2, rel: 0.6, gain: 1 });
        if (calm && e === 3) note('perc', 'tri', null, ate(e), { vel: 0.35, pan: 0.55, filter: /HitM_/, dur: 2.5, rel: 0.8, gain: 0.6 });
        if (lift || build) note('perc', 'sleigh', null, ate(e), { vel: beat ? 0.5 : 0.3, pan: -0.45, filter: beat ? /sleighbell1_hit_(1|2)/ : /sleighbell1_hit_quiet/, dur: 0.6, rel: 0.1, gain: beat ? 0.8 : 0.6 });
        if (lift && e === 0) note('perc', 'timp', null, t, { vel: 0.45, pan: -0.15, filter: /Timpani[12]_Hit_v[13]/, dur: 2.5, rel: 0.6, gain: 0.7 });
        if (e === 0 && i === 0 && (A || lift || calm)) note('perc', 'chimes', null, t, { vel: 0.4, pan: 0.4, filter: /windchimes_(slowAsc|asc)1/, dur: 4, rel: 1, gain: 0.6 });
        // distant thunder in the breather
        if (calm && i === 0 && e === 0) { note('perc', 'timpRoll', null, t, { vel: 0.5, filter: /Timpani[34]_Roll_v3/, dur: bar * 1.2, rel: 1, gain: 0.35 }); note('perc', 'gong', null, t, { vel: 0.3, filter: /gongHit_p/, dur: 6, rel: 2, gain: 0.5 }); }
        // the build: timpani eighths growing over its last two bars
        if (build && (i >= 1 || e % 3 === 0)) note('perc', 'timp', null, ate(e), { vel: vel(0.35 + 0.4 * (i * 12 + e) / 48), pan: -0.15 + 0.03 * e, filter: /Timpani[12]_Hit_v[134]/, dur: 1, rel: 0.3, gain: 0.6 + 0.35 * (i * 12 + e) / 48 });
      }

      if (big) for (let s = 0; s < 16; s++) {
        const t = t0 + s * sp;
        // ---- the storm: spiccato sixteenths in the violins and violas, cellos and basses in eighths ----
        const v2 = voicing(PC, 62, 3), acc = s % 4 === 0 ? 1 : s % 2 === 0 ? 0.8 : 0.65;
        note('strings', 'vlnSpic', v2[[0, 2, 1, 2][s % 4]] + 12, at(s), { dur: sp * 0.85, vel: vel(0.6 * acc), pan: 0.35, rel: 0.06 });
        note('strings', 'vlaSpic', v2[[1, 0][s % 2]], at(s), { dur: sp * 0.85, vel: vel(0.55 * acc), pan: 0.1, rel: 0.06 });
        if (s % 2 === 0) { note('strings', 'vcSpic', atOrAbove(root, 38), at(s), { dur: sp * 1.6, vel: vel(0.7 * acc), pan: -0.3, rel: 0.07 }); note('strings', 'cbSpic', atOrAbove(root, 30) < 33 ? atOrAbove(root, 30) + 12 : atOrAbove(root, 30), at(s), { dur: sp * 1.6, vel: vel(0.65 * acc), pan: -0.1, rel: 0.07 }); }
        // ---- the melody, snapped into sixteenths: trumpets and horns, violins (an octave of flute on top in the second half) ----
        const hit = Object.entries(THEME[i]).find(([e]) => E2S(+e) === s);
        if (hit) {
          const [e0, [m0, len]] = hit, m = X(m0), end = +e0 + len, s1 = end >= 12 ? 16 : E2S(end), d = (s1 - s) * sp * 0.92;
          note('brass', 'tptSus', m, at(s), { dur: d, vel: vel(0.75), pan: 0.15, att: 0.03, rel: 0.15 });
          brass('hnSus', m - 12, at(s), d, 0.85, -0.25, { att: 0.03 });
          note('strings', 'vlnSus', m, at(s), { dur: d, vel: vel(0.7), pan: 0.3, att: 0.04, rel: 0.15 });
          if (i >= 4) note('winds', 'flute', m + 12, at(s), { dur: d, vel: vel(0.55), pan: -0.25, att: 0.03, rel: 0.15 });
          if (s1 - s >= 6) note('winds', 'glock', m + 12, at(s), { dur: Math.min(sp * 6, t0 + bar - t - 0.05), vel: 0.45, pan: 0.4, rel: 0.2 });
        }
        if (s === 0) {   // low brass and the horns' off-beat stabs
          note('brass', 'tbnSus', atOrAbove(root, 41), t0, { dur: bar * 0.94, vel: 0.6, pan: 0.2, att: 0.06, rel: 0.15 });
          note('brass', 'tubaSus', atOrAbove(root, 30) < 33 ? atOrAbove(root, 30) + 12 : atOrAbove(root, 30), t0, { dur: bar * 0.94, vel: 0.6, pan: 0.1, att: 0.06, rel: 0.15 });
        }
        if (s === 6 || s === 14) voicing(PC, 55, 3).forEach((m, k) => { note('brass', 'hnStac', m, at(s), { dur: 0.16, vel: vel(0.55), pan: -0.35 + k * 0.12, rel: 0.1 }); piano(m, at(s), sp * 1.2, 0.45); });
        // ---- thunder: timpani on a 3-3-2 of eighths and sixteenths, bass drum, snare backbeat, toms, crashes, a gong ----
        if ([0, 3, 6, 8, 11, 14].includes(s)) note('perc', 'timp', null, at(s), { vel: vel(s === 0 || s === 8 ? 0.9 : 0.65), pan: -0.15, filter: /Timpani[12]_Hit_v[34]/, dur: 1.6, rel: 0.4, gain: 0.85 });
        if (s === 0 || s === 8 || s === 10) note('perc', 'bdrum', null, at(s), { vel: vel(0.85), filter: /^bdrum_(f|ff)_/, dur: 1.5, rel: 0.4, gain: 0.85 });
        if (s === 4 || s === 12) note('perc', 'snare', null, at(s), { vel: vel(0.8), pan: 0.1, filter: /^snare1_(f|ff)_/, dur: 0.8, rel: 0.2 });
        if (s % 2 === 1 && rnd() < 0.4) note('perc', 'snare', null, at(s), { vel: vel(0.25), pan: 0.1, filter: /^snare1_(p|mp)_/, dur: 0.3, rel: 0.08, gain: 0.8 });
        if (s % 2 === 0) note('perc', 'tamb', null, at(s), { vel: vel(s % 4 ? 0.5 : 0.35), pan: -0.5, filter: /^Tamb1-Hit/, dur: 0.4, rel: 0.08, gain: 0.55 });
        if ((i === 3 || i === 7) && s >= 12) note('perc', s % 2 ? 'tenorHi' : 'tenorLo', null, at(s), { vel: vel(0.6 + 0.05 * (s - 12)), pan: (s - 13.5) * 0.15, filter: /_(f|ff)_/, dur: 0.6, rel: 0.2 });
        if (s === 0 && (i === 0 || i === 4)) note('perc', 'crash', null, t, { vel: 0.85, pan: 0.35, filter: /_(f|ff)/, dur: 4, rel: 1.2, gain: 0.75 });
        if (s === 0 && i === 0) note('perc', 'gong', null, t, { vel: 0.85, pan: -0.1, filter: /gongHit_(f|fff)/, dur: 6, rel: 1.5, gain: 0.75 });
        if (s === 0 && (i === 2 || i === 6)) note('perc', 'clash', null, t, { vel: 0.6, pan: -0.35, filter: /ff_tight/, dur: 2, rel: 0.6, gain: 0.5 });
      }

      // ---- brass: the horn pad (very soft under the second half of the verse, warmer in the lift), the build's swell ----
      if (lift || (A && i >= 4)) {
        hornPad = voicing(PC, 53, 3, hornPad && hornPad.filter(m => PC.tones.includes(pc(m))).length === 3 ? hornPad : null);
        hornPad.forEach((m, k) => brass('hnSus', m, t0, bar * 0.93, A ? 0.3 : 0.5 + 0.02 * i, -0.3 + k * 0.15, { att: 0.4, rel: 0.2 }));
      }
      if (build) voicing(C, 53, 3).forEach((m, k) => brass('hnSus', m, t0, bar * 0.93, 0.45 + 0.12 * i, -0.2 + k * 0.2, { att: bar * 0.6, rel: 0.12 }));
      // ---- the joins: a cymbal swell into each new section, a timpani roll into the storm ----
      if (B.intoNew && sec !== 'climax') rev('perc', 'cym', lift || build ? /hit_hardmall_f$/ : /softmall_f$/, t0 + bar - (preLoop ? 0.15 : 0), { len: bar * (lift || build ? 0.85 : 0.6), gain: lift ? 1.7 : build ? 1.5 : 1.2 });
      if (B.intoNew && lift) note('perc', 'timpRoll', null, t0 + bar / 2, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: bar / 2, rel: 0.05, gain: 0.75 });
      if (build && i === 3) note('perc', 'timpRoll', null, t0, { vel: 1, filter: /Timpani[12]_Roll_v5/, dur: bar - 0.05, rel: 0.05, gain: 0.6 });   // (thunder rolling home)
      if (B.intoNew && intro) note('perc', 'timpRoll', null, t0 + bar / 2, { vel: 0.5, filter: /Timpani[12]_Roll_v3/, dur: barEnd - t0 - bar / 2, rel: 0.1, gain: 0.4 });
      if (i === 0 && (A || lift)) note('perc', 'cym', null, t0, { vel: 0.5, pan: 0.3, filter: /softmall_mp$/, dur: 4, rel: 1.2, gain: 0.5 });
    });
  },
};
